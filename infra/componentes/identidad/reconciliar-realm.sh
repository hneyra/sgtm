#!/bin/bash
# Aplica al Keycloak del cluster el realm versionado en el repositorio (issue #151).
#
# Existe porque `--import-realm` solo importa la PRIMERA vez. Con el import, un
# cambio del realm despues del primer arranque —un cliente nuevo, una redireccion
# corregida, el mapeador de `municipalidad_id` que alguien borro sin querer— no
# llega nunca al cluster, y nadie se entera hasta que un token sale sin el claim.
#
# Lo que hace, en orden, y todo idempotente:
#
#   1. Espera a que Keycloak acepte la sesion de administracion.
#   2. Crea el realm si no existe; si existe, actualiza sus ajustes.
#   3. Aplica el perfil de usuario, que es de donde sale el atributo
#      `municipalidad_id`. NO viaja en partialImport: es un componente del realm.
#   4. Importa los clientes con `partialImport` e `ifResourceExists=OVERWRITE`.
#      OVERWRITE reemplaza el CLIENTE, no el realm: los usuarios de la
#      municipalidad no se tocan. Un `kc.sh import --override` si los perderia,
#      y esa es la diferencia por la que este guion existe en vez de aquel.
#   5. **Comprueba que el mapeador de `municipalidad_id` quedo puesto.** Si no
#      esta, sale con error y el despliegue queda rojo.
#
# El paso 5 es el que convierte este Job en una verificacion: sin el, un realm sin
# mapeador se aplicaria en verde y el sintoma aparecceria como un 403
# SIN_MUNICIPALIDAD que no dice por que se rompio.
#
# Los tres archivos JSON no se escriben a mano: los deriva `Identidad.ts` del
# `realm-sgtm.json` que ya usa el compose, para que haya un solo realm versionado.
set -euo pipefail

: "${KC_SERVIDOR:?falta KC_SERVIDOR}"
: "${KC_REALM:?falta KC_REALM}"
: "${KC_ADMIN:?falta KC_ADMIN}"
: "${KC_CLAVE:?falta KC_CLAVE}"

KCADM=/opt/keycloak/bin/kcadm.sh
DIRECTORIO=${KC_DIRECTORIO:-/realm}

echo "Reconciliando el realm «${KC_REALM}» contra $KC_SERVIDOR"

# El Job puede arrancar antes que Keycloak termine de migrar su propia base. No es
# un fallo: es el orden normal de un despliegue. Se reintenta durante cinco
# minutos y se rinde con un mensaje que dice que se estaba esperando.
intento=0
until "$KCADM" config credentials \
        --server "$KC_SERVIDOR" --realm master \
        --user "$KC_ADMIN" --password "$KC_CLAVE" >/dev/null 2>&1; do
    intento=$((intento + 1))
    if [ "$intento" -ge 100 ]; then
        echo "FALLO: Keycloak no acepto la sesion de administracion en $KC_SERVIDOR." >&2
        exit 1
    fi
    sleep 3
done

if "$KCADM" get "realms/$KC_REALM" >/dev/null 2>&1; then
    echo "El realm ya existe: se actualizan sus ajustes."
    "$KCADM" update "realms/$KC_REALM" -f "$DIRECTORIO/realm.json"
else
    echo "El realm no existe: se crea."
    "$KCADM" create realms -f "$DIRECTORIO/realm.json"
fi

# El perfil de usuario declara `municipalidad_id` como atributo. Sin el, el
# mapeador leeria un atributo que el realm no admite y el claim saldria vacio.
"$KCADM" update "users/profile" -r "$KC_REALM" -f "$DIRECTORIO/perfil-de-usuario.json"

"$KCADM" create partialImport -r "$KC_REALM" -f "$DIRECTORIO/clientes.json"

# ---------------------------------------------------------------------------
# La comprobacion. Es lo que hace que este Job valga como verificacion.
# ---------------------------------------------------------------------------
for cliente in $KC_CLIENTES; do
    # Sin `--fields`: se probo `--fields 'protocolMappers(name,config)'` y kcadm
    # devuelve el `config` de cada mapeador siempre vacio (`{}`) para un campo
    # anidado dentro de un arreglo -confirmado contra un Keycloak real (issue
    # #158): `get clients/<id> --fields 'protocolMappers(name,config)'` y la misma
    # consulta por `clientId` sin filtrar dan resultados distintos, y solo la
    # segunda trae el `claim.name` que esta comprobacion necesita ver. Con el
    # filtro, esta comprobacion fallaba SIEMPRE, con el mapeador correctamente
    # puesto: un falso rojo permanente, no una carrera.
    mapeadores=$("$KCADM" get clients -r "$KC_REALM" -q "clientId=$cliente" 2>/dev/null || true)

    case "$mapeadores" in
        *municipalidad_id*) ;;
        *)
            echo "FALLO: el cliente «${cliente}» quedo SIN el mapeador de municipalidad_id." >&2
            echo "Es el claim del que sale el SET LOCAL, y con el la separacion entre" >&2
            echo "municipalidades (ADR-0005). Un realm sin ese mapeador emite tokens que el" >&2
            echo "backend rechaza con SIN_MUNICIPALIDAD, y el 403 no dice por que." >&2
            exit 1
            ;;
    esac
    echo "Cliente «${cliente}»: mapeador de municipalidad_id presente."
done

echo "Realm «${KC_REALM}» reconciliado."
