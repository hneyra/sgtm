#!/usr/bin/env bash
# Que rotar la clave de sgtm_app no exige parar la base (issue #154, criterio de
# aceptacion).
#
# La mecanica que demuestra esto es la de PostgreSQL, no la de Kubernetes: `ALTER ROLE
# ... PASSWORD` no cierra las sesiones que ya estaban abiertas con la clave vieja. Lo que
# rompe es una conexion NUEVA con la clave vieja; una conexion NUEVA con la clave nueva
# funciona de inmediato. Eso es lo que hace cierta la frase «no exige parar la base»: la
# aplicacion no pierde ni una peticion que ya tenia en curso, y sus conexiones nuevas
# funcionan en cuanto el Secret se actualiza y el pod se reprograma.
#
# Levanta el motor con los mismos guiones que `verificar-el-motor.sh` (issue #149), via
# `lib-motor-local.sh`, y sobre el:
#
#   1. Abre una conexion como sgtm_app con la clave ACTUAL, y la deja abierta.
#   2. Rota la clave con el mismo `ALTER ROLE ... PASSWORD :'nueva'` que ejecuta
#      `secretos/rotar-clave.sh`, escrito aqui inline: este guion corre sin cluster,
#      asi que no hay Secret que actualizar ni paso de Kubernetes que dar.
#   3. Comprueba que la conexion ABIERTA en el paso 1 sigue respondiendo.
#   4. Comprueba que una conexion NUEVA con la clave VIEJA falla.
#   5. Comprueba que una conexion NUEVA con la clave NUEVA funciona.
#
#   uso: secretos/verificar-rotacion.sh [--ambiente stg]
set -euo pipefail

AMBIENTE=stg
while [ $# -gt 0 ]; do
    case "$1" in
        --ambiente) AMBIENTE=${2:?falta el valor de --ambiente}; shift 2 ;;
        *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
    esac
done

AQUI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INFRA=$(cd "$AQUI/.." && pwd)
TRABAJO=$(mktemp -d)
PUERTO=${SGTM_PUERTO_MOTOR:-55434}

trap 'motor_detener 2>/dev/null || true; rm -rf "$TRABAJO"' EXIT

# shellcheck source=../verificaciones/motor/lib-motor-local.sh
source "$INFRA/verificaciones/motor/lib-motor-local.sh"

echo
echo "· Abriendo una conexion como sgtm_app, con la clave actual"
# `psql` interactivo mantenido con un `coproc`: es la unica forma de decir "esta sesion
# ya esta abierta" y seguir emitiendo consultas por ella mas adelante, en vez de que
# cada `psql -c` abra una conexion NUEVA —que es exactamente lo que este guion no quiere
# medir en el paso 3—.
coproc SESION_ABIERTA (
    PGPASSWORD="$CLAVE_APP" psql --username=sgtm_app --dbname=sgtm --quiet --no-psqlrc \
        --set=ON_ERROR_STOP=1 --pset=pager=off --tuples-only --no-align
)
sesion_pid=$SESION_ABIERTA_PID

consultar_sesion_abierta() {
    echo "SELECT '$1';" >&"${SESION_ABIERTA[1]}"
    read -r -t 10 respuesta <&"${SESION_ABIERTA[0]}"
    printf '%s' "$respuesta"
}

[ "$(consultar_sesion_abierta antes-de-rotar)" = "antes-de-rotar" ] \
    || { echo "FALLO: la sesion no respondio antes de rotar. Algo en la conexion inicial esta mal, no en la rotacion." >&2; exit 1; }
echo "  la sesion responde con la clave actual"

CLAVE_NUEVA="n'ueva-Cl4ve-rotada"
echo "· Rotando la clave de sgtm_app (ALTER ROLE, como haria rotar-clave.sh)"
# Por la entrada estandar, no con `--command`: `psql -v x=... --command "...:'x'..."` NO
# interpola la variable —el sustituto de `:'var'` solo corre cuando psql lee un guion,
# no en una sola orden de `-c`—. Es el mismo patron que ya usa `20-asignar-claves.sh`, y
# la razon por la que la clave con comilla simple es parte de la prueba: si alguien
# "simplificara" esto a `--command`, se rompe aqui mismo, con este mismo error.
PGPASSWORD="$CLAVE_SUPER" psql --username=postgres --dbname=sgtm --quiet \
    -v nueva="$CLAVE_NUEVA" <<'SQL' >/dev/null
ALTER ROLE sgtm_app PASSWORD :'nueva';
SQL

echo "· La sesion que ya estaba abierta, sin volver a autenticar"
[ "$(consultar_sesion_abierta despues-de-rotar)" = "despues-de-rotar" ] \
    || { echo "FALLO: la sesion abierta antes de rotar dejo de responder. Rotar la clave estaria cortando conexiones en curso — eso ES parar la base para quien tenia una peticion a mitad." >&2; exit 1; }
echo "  sigue respondiendo: rotar la clave NO cerro la sesion que ya estaba abierta"

# Cerrar el extremo de escritura basta: psql recibe EOF en su entrada y termina solo,
# cerrando la sesion limpiamente en el servidor.
exec {SESION_ABIERTA[1]}>&- 2>/dev/null || true
wait "$sesion_pid" 2>/dev/null || true

echo "· Una conexion NUEVA con la clave vieja"
if PGPASSWORD="$CLAVE_APP" psql --username=sgtm_app --dbname=sgtm --quiet \
        --command 'SELECT 1' >/dev/null 2>&1; then
    echo "FALLO: una conexion nueva con la clave VIEJA todavia funciona despues de rotar. La rotacion no tuvo efecto." >&2
    exit 1
fi
echo "  falla, como tiene que fallar"

echo "· Una conexion NUEVA con la clave nueva"
PGPASSWORD="$CLAVE_NUEVA" psql --username=sgtm_app --dbname=sgtm --quiet --command 'SELECT 1' \
    >/dev/null 2>&1 \
    || { echo "FALLO: una conexion nueva con la clave NUEVA no funciona. La rotacion dejo el rol en un estado peor que antes." >&2; exit 1; }
echo "  funciona"

echo
echo "Rotar sgtm_app no exigio detener el motor ni cortar la sesion que ya estaba abierta."
echo "Lo que sigue sin demostrar aqui: hacerlo contra «stg» de verdad, con el Secret de"
echo "Kubernetes y el rollout restart del Deployment. Eso necesita el VPS."
