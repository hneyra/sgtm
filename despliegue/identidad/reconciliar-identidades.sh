#!/bin/bash
# Reconcilia los USUARIOS y GRUPOS de cada municipalidad contra Keycloak (ADR-0012).
#
# Es el equivalente de `reconciliar-realm.sh` para las personas: el realm fija la
# ESTRUCTURA, y este guion aplica lo que declara `municipalidades/<ubigeo>.json`
# —una fuente versionada, SIN una sola clave—.
#
# Lo que hace, en orden y todo idempotente:
#
#   1. Por cada municipalidad: crea el grupo de Keycloak si falta y le fija el
#      atributo `municipalidad_id` (documental; el claim sale del atributo por
#      usuario, no del grupo).
#   2. Por cada usuario: lo crea si falta —`enabled`, con nombre, apellido, correo
#      y `attributes.municipalidad_id`, y con UPDATE_PASSWORD pendiente— o, si ya
#      existe, le actualiza atributo, correo y nombre. NUNCA borra, y NUNCA toca la
#      clave ni las acciones pendientes de un usuario que ya existia.
#   3. Lo afilia a su grupo (PUT idempotente).
#   4. Solo a los usuarios RECIEN creados: les envia el correo de Keycloak con el
#      enlace de un solo uso para fijar la clave (`execute-actions-email` con
#      UPDATE_PASSWORD). No se genera ninguna clave en ningun sitio.
#   5. Comprobacion final: cada usuario declarado existe, esta `enabled`, tiene el
#      atributo con el valor del archivo y esta en su grupo. Si no -> exit 1, y el
#      despliegue queda rojo. Es lo que convierte este Job en una verificacion.
#
# ── Dos modos, un guion ────────────────────────────────────────────────────────
#
#   directo  Corre DENTRO de la imagen de Keycloak (el Job del cluster). `kcadm.sh`
#            es local y los datos llegan pre-derivados en `identidades.tsv`, que
#            escribe `infra/componentes/Identidad.ts` (la imagen de Keycloak no
#            trae python ni jq).
#   compose  Corre en la maquina o en el runner. `kcadm` se invoca por
#            `docker compose exec` y los `municipalidades/*.json` se leen con el
#            python3 del anfitrion.
#
# El modo se detecta solo; se puede forzar con KC_MODO=compose|directo.
#
# ── Variables ─────────────────────────────────────────────────────────────────
#   KC_REALM                  realm; por omision `sgtm`
#   KC_DIRECTORIO             (directo) carpeta con `identidades.tsv`; por omision /realm
#   MUNICIPALIDADES_DIR       (compose) carpeta con `*.json`; por omision ./municipalidades
#   UBIGEO                    (compose) si se fija, solo reconcilia ese `<ubigeo>.json`
#   KC_SERVIDOR               (directo) URL de Keycloak, p.ej. http://svc:8080/keycloak
#   KC_ADMIN / KC_CLAVE       (directo) usuario y clave de administracion
#   SGTM_KEYCLOAK_ADMIN       (compose) usuario admin; por omision `admin`
#   SGTM_CLAVE_KEYCLOAK       (compose) clave admin
#   SGTM_KEYCLOAK_SERVICIO    (compose) servicio del compose; por omision `identidad`
#   KC_SMTP_USUARIO/KC_SMTP_CLAVE  si el relay pide auth: se ponen en el realm con
#                             `kcadm`, nunca quedan en el `realm.json` versionado
#   SIN_CORREO=1              omite el envio del enlace (usuario sin clave; solo local)
set -euo pipefail

REALM="${KC_REALM:-sgtm}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

# --- Modo ---------------------------------------------------------------------
if [ "${KC_MODO:-auto}" = compose ]; then
    MODO=compose
elif [ "${KC_MODO:-auto}" = directo ] || [ -x /opt/keycloak/bin/kcadm.sh ]; then
    MODO=directo
else
    MODO=compose
fi

if [ "$MODO" = compose ]; then
    : "${SGTM_KEYCLOAK_SERVICIO:=identidad}"
fi

# `kcadm`, en el modo que toque. `</dev/null` porque este guion invoca `kc` dentro
# de bucles `while read < archivo`: sin el, `docker compose exec` heredaria el
# archivo como stdin.
kc() {
    if [ "$MODO" = directo ]; then
        /opt/keycloak/bin/kcadm.sh "$@" </dev/null
    else
        docker compose exec -T "$SGTM_KEYCLOAK_SERVICIO" \
            /opt/keycloak/bin/kcadm.sh "$@" </dev/null
    fi
}

# --- Sesion de administracion ----------------------------------------------------
if [ "$MODO" = directo ]; then
    : "${KC_SERVIDOR:?falta KC_SERVIDOR}"
    : "${KC_ADMIN:?falta KC_ADMIN}"
    : "${KC_CLAVE:?falta KC_CLAVE}"
    SERVIDOR="$KC_SERVIDOR"; ADMIN="$KC_ADMIN"; CLAVE="$KC_CLAVE"
else
    : "${SGTM_CLAVE_KEYCLOAK:?falta SGTM_CLAVE_KEYCLOAK}"
    SERVIDOR="${KC_SERVIDOR:-http://localhost:8080}"
    ADMIN="${SGTM_KEYCLOAK_ADMIN:-admin}"; CLAVE="$SGTM_CLAVE_KEYCLOAK"
fi

echo "Reconciliando identidades del realm «$REALM» contra $SERVIDOR (modo $MODO)"

intento=0
until kc config credentials --server "$SERVIDOR" --realm master \
        --user "$ADMIN" --password "$CLAVE" >/dev/null 2>&1; do
    intento=$((intento + 1))
    if [ "$intento" -ge 100 ]; then
        echo "FALLO: Keycloak no acepto la sesion de administracion en $SERVIDOR." >&2
        exit 1
    fi
    sleep 3
done

# --- Credenciales del relay SMTP, si el realm las necesita ---------------------
# El `realm.json` versionado no lleva la clave del relay; la pone aqui `kcadm`.
if [ -n "${KC_SMTP_USUARIO:-}" ]; then
    kc update "realms/$REALM" \
        -s "smtpServer.auth=true" \
        -s "smtpServer.user=$KC_SMTP_USUARIO" \
        -s "smtpServer.password=${KC_SMTP_CLAVE:-}" >/dev/null
    echo "Relay SMTP: credenciales puestas en el realm (no versionadas)."
fi

# --- Fuente de datos: identidades.tsv (directo) o los *.json (compose) ----------
# Formato del TSV, una linea por fila, campos separados por tabulador:
#   GRUPO   <nombre del grupo>   <municipalidadId>
#   USUARIO <cuenta> <nombre> <apellido> <correo> <municipalidadId> <grupo>
DIRECTORIO="${KC_DIRECTORIO:-/realm}"
LIMPIAR_TSV=0
if [ -f "$DIRECTORIO/identidades.tsv" ]; then
    TSV="$DIRECTORIO/identidades.tsv"
    echo "Datos: $TSV (derivado por Identidad.ts)"
else
    MUNI_DIR="${MUNICIPALIDADES_DIR:-$AQUI/municipalidades}"
    if ! command -v python3 >/dev/null 2>&1; then
        echo "FALLO: no hay «$DIRECTORIO/identidades.tsv» ni python3 para leer $MUNI_DIR." >&2
        exit 1
    fi
    TSV="$(mktemp)"; LIMPIAR_TSV=1
    trap '[ "$LIMPIAR_TSV" = 1 ] && rm -f "$TSV"' EXIT
    python3 - "$MUNI_DIR" "${UBIGEO:-}" >"$TSV" <<'PY'
import glob, json, os, sys

carpeta = sys.argv[1]
solo = sys.argv[2] if len(sys.argv) > 2 else ""
archivos = sorted(glob.glob(os.path.join(carpeta, "*.json")))
if solo:
    archivos = [a for a in archivos if os.path.splitext(os.path.basename(a))[0] == solo]
if not archivos:
    sys.exit(f"No hay ningun municipalidades/*.json en {carpeta}" + (f" para el ubigeo {solo}" if solo else ""))

filas = []
for ruta in archivos:
    with open(ruta, encoding="utf-8") as fh:
        m = json.load(fh)
    base = os.path.splitext(os.path.basename(ruta))[0]
    ubigeo = str(m.get("ubigeo", ""))
    if not ubigeo.isdigit() or len(ubigeo) != 6:
        sys.exit(f"{ruta}: «ubigeo» son seis digitos, y es {ubigeo!r}")
    if ubigeo != base:
        sys.exit(f"{ruta}: el nombre del archivo ({base}) no es el ubigeo ({ubigeo})")
    mid = m.get("municipalidadId")
    if not isinstance(mid, int) or isinstance(mid, bool) or mid <= 0:
        sys.exit(f"{ruta}: «municipalidadId» es un entero positivo, y es {mid!r}")
    grupo = m.get("grupo", "")
    if not grupo or "\t" in grupo:
        sys.exit(f"{ruta}: «grupo» es obligatorio y sin tabuladores")
    usuarios = m.get("usuarios", [])
    if not usuarios:
        sys.exit(f"{ruta}: no declara ningun usuario")
    admins = [u for u in usuarios if u.get("administrador") is True]
    if len(admins) != 1:
        sys.exit(f"{ruta}: tiene que haber exactamente un usuario con «administrador: true», hay {len(admins)}")
    filas.append(("GRUPO", grupo, str(mid)))
    for u in usuarios:
        for campo in ("cuenta", "nombre", "apellido", "correo"):
            if not u.get(campo) or "\t" in str(u[campo]):
                sys.exit(f"{ruta}: usuario {u.get('cuenta')!r} sin «{campo}» valido")
        filas.append(("USUARIO", u["cuenta"], u["nombre"], u["apellido"], u["correo"], str(mid), grupo))

for fila in filas:
    print("\t".join(fila))
PY
    echo "Datos: $MUNI_DIR/*.json (leidos con python3)"
fi

# --- 1 y 2: grupos y usuarios -------------------------------------------------
buscar_grupo() {
    local salida
    salida=$(kc get groups -r "$REALM" -q "search=$1" -q "exact=true" \
        --fields id --format csv --noquotes 2>/dev/null || true)
    printf '%s' "$salida" | tr -d '\r' | sed -n '1p'
}
buscar_usuario() {
    local salida
    salida=$(kc get users -r "$REALM" -q "username=$1" -q "exact=true" \
        --fields id --format csv --noquotes 2>/dev/null || true)
    printf '%s' "$salida" | tr -d '\r' | sed -n '1p'
}

NUEVOS=""
while IFS=$'\t' read -r tipo c1 c2 c3 c4 c5 c6; do
    [ -n "${tipo:-}" ] || continue
    case "$tipo" in
        GRUPO)
            grupo="$c1"; mid="$c2"
            gid=$(buscar_grupo "$grupo")
            if [ -z "$gid" ]; then
                kc create groups -r "$REALM" -s "name=$grupo" >/dev/null
                gid=$(buscar_grupo "$grupo")
                echo "Grupo «$grupo» creado."
            fi
            [ -n "$gid" ] || { echo "FALLO: no se pudo resolver el id del grupo «$grupo»." >&2; exit 1; }
            kc update "groups/$gid" -r "$REALM" \
                -s "attributes.municipalidad_id=[\"$mid\"]" >/dev/null
            ;;
        USUARIO)
            cuenta="$c1"; nombre="$c2"; apellido="$c3"; correo="$c4"; mid="$c5"; grupo="$c6"
            gid=$(buscar_grupo "$grupo")
            [ -n "$gid" ] || { echo "FALLO: el grupo «$grupo» no existe al afiliar a «$cuenta»." >&2; exit 1; }
            uid=$(buscar_usuario "$cuenta")
            if [ -z "$uid" ]; then
                kc create users -r "$REALM" \
                    -s "username=$cuenta" -s enabled=true -s emailVerified=true \
                    -s "email=$correo" -s "firstName=$nombre" -s "lastName=$apellido" \
                    -s "attributes.municipalidad_id=$mid" \
                    -s 'requiredActions=["UPDATE_PASSWORD"]' >/dev/null
                uid=$(buscar_usuario "$cuenta")
                [ -n "$uid" ] || { echo "FALLO: «$cuenta» no aparece despues de crearlo." >&2; exit 1; }
                NUEVOS="$NUEVOS $cuenta:$uid"
                echo "Usuario «$cuenta» creado (municipalidad $mid), con UPDATE_PASSWORD pendiente."
            else
                # Se actualiza lo DECLARADO. No se tocan credentials, requiredActions
                # ni enabled: una clave ya fijada y un primer acceso ya hecho se
                # respetan.
                kc update "users/$uid" -r "$REALM" \
                    -s "email=$correo" -s "firstName=$nombre" -s "lastName=$apellido" \
                    -s "attributes.municipalidad_id=$mid" >/dev/null
                echo "Usuario «$cuenta» ya existia; atributo, correo y nombre al dia. Clave intacta."
            fi
            kc update "users/$uid/groups/$gid" -r "$REALM" -n >/dev/null
            ;;
        *)
            echo "FALLO: linea de tipo desconocido «$tipo» en el TSV." >&2; exit 1
            ;;
    esac
done < "$TSV"

# --- 4: el enlace de clave, solo a los recien creados -------------------------
for par in $NUEVOS; do
    cuenta="${par%%:*}"; uid="${par#*:}"
    if [ "${SIN_CORREO:-0}" = 1 ]; then
        echo "SIN_CORREO=1: «$cuenta» queda SIN clave y SIN enlace. Fijarla a mano (ver README)."
        continue
    fi
    if kc update "users/$uid/execute-actions-email" -r "$REALM" \
            -b '["UPDATE_PASSWORD"]' >/dev/null 2>&1; then
        echo "Enlace para fijar la clave enviado a «$cuenta»."
    else
        {
            echo "FALLO: no se pudo enviar el enlace de UPDATE_PASSWORD a «$cuenta»."
            echo "Casi siempre es SMTP sin configurar en el realm. Salidas:"
            echo "  - configurar smtpServer (despliegue/identidad/README.md), o"
            echo "  - fijar una clave temporal a mano:"
            echo "      kcadm set-password -r $REALM --username $cuenta --new-password <clave> --temporary"
            echo "  - o re-lanzar con SIN_CORREO=1 (el usuario queda sin clave)."
        } >&2
        exit 1
    fi
done

# --- 5: comprobacion final ---------------------------------------------------
echo "--- Comprobacion final ---"
errores=0
usuarios=0
grupos=0
while IFS=$'\t' read -r tipo c1 c2 c3 c4 c5 c6; do
    case "${tipo:-}" in
        GRUPO) grupos=$((grupos + 1)); continue ;;
        USUARIO) : ;;
        *) continue ;;
    esac
    usuarios=$((usuarios + 1))
    cuenta="$c1"; mid="$c5"; grupo="$c6"
    uid=$(buscar_usuario "$cuenta")
    if [ -z "$uid" ]; then
        echo "FALLO: «$cuenta» no existe despues de reconciliar." >&2; errores=1; continue
    fi
    detalle=$(kc get "users/$uid" -r "$REALM" 2>/dev/null || true)
    case "$detalle" in
        *'"municipalidad_id" : [ "'"$mid"'" ]'*|*"\"municipalidad_id\":[\"$mid\"]"*) ;;
        *) echo "FALLO: «$cuenta» sin atributo municipalidad_id=$mid." >&2; errores=1 ;;
    esac
    case "$detalle" in
        *'"enabled" : true'*|*'"enabled":true'*) ;;
        *) echo "FALLO: «$cuenta» no esta enabled." >&2; errores=1 ;;
    esac
    membresia=$(kc get "users/$uid/groups" -r "$REALM" \
        --fields name --format csv --noquotes 2>/dev/null | tr -d '\r' || true)
    case "$membresia" in
        *"$grupo"*) ;;
        *) echo "FALLO: «$cuenta» no esta en el grupo «$grupo»." >&2; errores=1 ;;
    esac
done < "$TSV"

if [ "$errores" -ne 0 ]; then
    echo "Reconciliacion de identidades: CON FALLOS." >&2
    exit 1
fi
echo "Identidades reconciliadas: $usuarios usuario(s) en $grupos grupo(s)."
