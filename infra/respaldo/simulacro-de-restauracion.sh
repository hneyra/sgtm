#!/usr/bin/env bash
# El simulacro de restauracion, ejecutado de verdad (issue #155, INF-03 §2, RNF-079).
#
# **Un respaldo que no se ha restaurado no cuenta como respaldo.** Eso es RNF-079, y es
# lo unico que convierte el resto de este issue en algo verificado en vez de algo
# escrito. Este guion recorre el ciclo entero contra un PostgreSQL real:
#
#   1. Levanta un motor con `archive_mode=on` y `archive_command` de wal-g — la misma
#      configuracion que `BaseDeDatos.ts` le pone al del cluster, leida del manifiesto.
#   2. Toma un respaldo base con `sgtm_respaldo`, el rol de `40-rol-de-respaldo.sh`:
#      sin DDL, sin BYPASSRLS, sin ser superusuario.
#   3. Escribe deuda de DOS municipalidades. Anota el instante: **T_BUENO**.
#   4. Escribe una tercera fila —la que hay que perder— y fuerza el archivado.
#   5. Comprueba lo que solo se puede comprobar rompiendolo: que **con la clave de
#      cifrado equivocada el respaldo no se puede leer**. Un respaldo que cualquiera
#      puede restaurar no protege el padron de nadie. Va aqui, y no mas abajo, porque
#      su espera no debe contaminar el tiempo que se mide en el paso 6.
#   6. **Destruye el directorio de datos entero.** Es el escenario de INF-01 §1.1:
#      perder el nodo no es una conmutacion, es una reconstruccion. Aqui arranca el
#      cronometro.
#   7. Restaura el respaldo base y reproduce el WAL hasta T_BUENO, ni un segundo mas.
#   8. Comprueba que estan las dos primeras filas y **no** la tercera, que las cifras
#      cuadran con el origen, que las dos municipalidades siguen separadas, y que lo
#      restaurado se promueve y **admite escrituras** — una copia que solo se lee no
#      devuelve el servicio.
#
# **Cronometra** del paso 6 al 7. El numero que sale de aqui mide el procedimiento;
# el que se compara con RNF-077 sale de `stg`, con volumetria real.
#
# ## Lo que este simulacro NO demuestra, dicho aqui
#
# El almacenamiento es el sistema de archivos local (`WALG_FILE_PREFIX`), no el
# almacenamiento de objetos de `INF-01` §1.3. Lo que se ejercita es **el ciclo**
# —archivado continuo, respaldo base, PITR, verificacion— con el mismo binario, la
# misma version, el mismo cifrado y los mismos privilegios que el cluster. Lo que
# queda sin ejercitar es la red hasta el proveedor y sus credenciales, y eso necesita
# un contenedor real: se hace en `stg`, contra su propio contenedor, y el tiempo que
# salga de ahi es el que manda. Este guion es el que impide llegar a ese dia sin saber
# si el procedimiento funciona.
#
#   uso: respaldo/simulacro-de-restauracion.sh [--ambiente stg|prod]
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
PUERTO=${SGTM_PUERTO_SIMULACRO:-55433}

ALMACEN="$TRABAJO/almacen"
RESTAURADO="$TRABAJO/restaurado"

limpiar() {
    motor_detener 2>/dev/null || true
    if [ -n "${PID_RESTAURADO:-}" ]; then
        motor_como_su_usuario "$BINARIOS/pg_ctl" --pgdata="$RESTAURADO" --silent stop \
            >/dev/null 2>&1 || true
    fi
    rm -rf "$TRABAJO"
}
trap limpiar EXIT

# shellcheck source=../verificaciones/motor/lib-motor-local.sh
source "$INFRA/verificaciones/motor/lib-motor-local.sh"

# ─────────────────────────────────────────────────────────────────────────────
# 0. wal-g, en la MISMA version que el manifiesto declara
# ─────────────────────────────────────────────────────────────────────────────
#
# No una cualquiera: la que `convenciones.ts` fija, leida de ahi. Si alguien sube
# `WALG_VERSION` sin mirar, este simulacro corre con la version nueva y es donde se
# entera de que no funciona — que es el sitio barato para enterarse.
echo "· wal-g, en la version que declara el manifiesto"
WALG_VERSION=$(grep -oP 'WALG_VERSION = "\K[^"]+' "$INFRA/componentes/convenciones.ts")
WALG_SHA256=$(grep -oP 'WALG_SHA256 = "\K[^"]+' "$INFRA/componentes/convenciones.ts")
[ -n "$WALG_VERSION" ] && [ -n "$WALG_SHA256" ] \
    || { echo "FALLO: no se pudieron leer WALG_VERSION/WALG_SHA256 de convenciones.ts." >&2; exit 1; }
echo "  version $WALG_VERSION"

WALG="$TRABAJO/wal-g"
ARCHIVO="$TRABAJO/wal-g.tar.gz"
curl -fsSL -o "$ARCHIVO" \
    "https://github.com/wal-g/wal-g/releases/download/v${WALG_VERSION}/wal-g-pg-ubuntu-20.04-amd64.tar.gz"
echo "${WALG_SHA256}  ${ARCHIVO}" | sha256sum -c - >/dev/null \
    || { echo "FALLO: el sha256 de wal-g no coincide con el que fija convenciones.ts." >&2; exit 1; }
tar -xzf "$ARCHIVO" -C "$TRABAJO"
mv "$TRABAJO/wal-g-pg-ubuntu-20.04-amd64" "$WALG"
chmod 755 "$WALG"
echo "  $("$WALG" --version)"

# La clave de cifrado, como la generaria `bootstrap-secretos.sh`: 32 bytes en base64.
CLAVE_CIFRADO=$(openssl rand -base64 32)
CLAVE_EQUIVOCADA=$(openssl rand -base64 32)

mkdir -p "$ALMACEN"
[ "$(id -u)" = "0" ] && chown postgres "$ALMACEN" "$WALG" 2>/dev/null || true

walg() {
    motor_como_su_usuario env \
        WALG_FILE_PREFIX="$ALMACEN" \
        WALG_LIBSODIUM_KEY="${SGTM_CLAVE_DE_PRUEBA:-$CLAVE_CIFRADO}" \
        WALG_COMPRESSION_METHOD=lz4 \
        PGHOST=127.0.0.1 PGPORT="$PUERTO" PGDATABASE=postgres \
        PGUSER=sgtm_respaldo PGPASSWORD="$CLAVE_RESPALDO" \
        "$WALG" "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. El motor, con archivado continuo
# ─────────────────────────────────────────────────────────────────────────────
if [ "$MODO" != "local" ]; then
    echo
    echo "FALLO: este simulacro necesita el modo local, no Docker." >&2
    echo "El PITR exige apagar el motor, destruir su directorio de datos y arrancar" >&2
    echo "OTRO proceso sobre lo restaurado. Eso es manipular el volumen desde fuera," >&2
    echo "y contra un contenedor de la imagen oficial no se puede sin reimplementar" >&2
    echo "medio entrypoint. Con SGTM_PUERTO_SIMULACRO y un PostgreSQL local, si." >&2
    exit 1
fi

echo
echo "· Encendiendo el archivado continuo de WAL"

# `sgtm_respaldo` NO se crea aqui: lo crea `40-rol-de-respaldo.sh`, que la biblioteca
# acaba de ejecutar como parte de la inicializacion del manifiesto. Es la mitad que
# importa de este simulacro: el respaldo lo toma el rol que el CLUSTER tendra, con los
# privilegios que ese guion le da, no uno preparado a medida para que la prueba pase.
[ "$(motor_como_superusuario "SELECT 1 FROM pg_roles WHERE rolname='sgtm_respaldo'" postgres)" = "1" ] \
    || { echo "FALLO: 40-rol-de-respaldo.sh no creo el rol sgtm_respaldo." >&2; exit 1; }

DATOS="$TRABAJO/datos"
cat >> "$DATOS/postgresql.conf" <<EOF
archive_mode = on
archive_command = '$WALG wal-push %p'
archive_timeout = 5
EOF

# El motor se arranca CON las variables de wal-g en su entorno, y no con
# `motor_reiniciar`: `archive_command` es un proceso hijo del servidor y hereda su
# entorno, que es exactamente como funciona en el cluster —ahi las pone el Deployment
# desde el Secret—. Arrancarlo sin ellas es lo que hace fallar el archivado en
# silencio, y esta prueba lo descubrio de esa manera antes de que lo hiciera el VPS.
arrancar_motor_con_walg() {
    motor_como_su_usuario env \
        WALG_FILE_PREFIX="$ALMACEN" \
        WALG_LIBSODIUM_KEY="$CLAVE_CIFRADO" \
        WALG_COMPRESSION_METHOD=lz4 \
        "$BINARIOS/pg_ctl" --pgdata="$DATOS" --silent --log="$TRABAJO/motor.log" \
        --options="-p $PUERTO -k $TRABAJO -c listen_addresses=127.0.0.1" start
    motor_esperar
}

motor_detener
arrancar_motor_con_walg \
    || { tail -30 "$TRABAJO/motor.log"; echo "FALLO: el motor no volvio con el archivado encendido." >&2; exit 1; }

# Que este encendido lo dice el motor, no el archivo: un `archive_mode` que el
# proceso no leyo es un RPO que no existe.
[ "$(motor_como_superusuario "SHOW archive_mode" postgres)" = "on" ] \
    || { echo "FALLO: el motor no tiene archive_mode=on." >&2; exit 1; }
echo "  archive_mode=on, archive_timeout=5s"

# ─────────────────────────────────────────────────────────────────────────────
# 2. El respaldo base, con el rol que NO puede hacer DDL
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Respaldo base, como sgtm_respaldo (sin DDL, sin superusuario)"

# Antes de nada: que ese rol no pueda mas de lo que debe. Si `sgtm_respaldo` pudiera
# crear tablas, el respaldo dejaria de ser un lector y pasaria a ser otra credencial
# con escritura sobre el padron.
if motor_como_su_usuario env PGPASSWORD="$CLAVE_RESPALDO" psql --username=sgtm_respaldo \
        --dbname=postgres --quiet --command 'CREATE TABLE intento_de_ddl (id int)' \
        >/dev/null 2>&1; then
    echo "FALLO: sgtm_respaldo puede crear tablas. El rol del respaldo lee, no escribe." >&2
    exit 1
fi
echo "  sgtm_respaldo no puede hacer DDL: correcto"

walg backup-push "$DATOS" >/dev/null 2>&1 \
    || { echo "FALLO: backup-push no completo." >&2; walg backup-push "$DATOS" 2>&1 | tail -20; exit 1; }
echo "  respaldo base tomado y cifrado"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Deuda de dos municipalidades, y el instante al que hay que volver
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Escribiendo deuda de dos municipalidades"
motor_como_su_usuario env PGPASSWORD="$CLAVE_SUPER" psql --quiet --username=postgres \
    --dbname=sgtm -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE simulacro_deuda (
    municipalidad text    NOT NULL,
    contribuyente text    NOT NULL,
    monto         numeric(15,2) NOT NULL
);
INSERT INTO simulacro_deuda VALUES
    ('sullana', 'contribuyente-A', 1234.56),
    ('sullana', 'contribuyente-B',  987.65),
    ('paita',   'contribuyente-C',  432.10);
SQL

TOTAL_ORIGEN=$(motor_como_superusuario "SELECT sum(monto) FROM simulacro_deuda")
TOTAL_SULLANA=$(motor_como_superusuario \
    "SELECT sum(monto) FROM simulacro_deuda WHERE municipalidad = 'sullana'")
echo "  total del padron en el origen: $TOTAL_ORIGEN (sullana: $TOTAL_SULLANA)"

T_BUENO=$(motor_como_superusuario "SELECT clock_timestamp()")
echo "  T_BUENO = $T_BUENO"
sleep 2

# ─────────────────────────────────────────────────────────────────────────────
# 4. La escritura que hay que perder
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· La escritura posterior a T_BUENO —la que el PITR tiene que dejar fuera—"
motor_como_su_usuario env PGPASSWORD="$CLAVE_SUPER" psql --quiet --username=postgres \
    --dbname=sgtm -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO simulacro_deuda VALUES ('sullana', 'ESCRITURA-QUE-SE-PIERDE', 999999.99);
SELECT pg_switch_wal();
SQL

# El archivador es asincrono: se espera a que el ultimo segmento este arriba, y si no
# llega, se dice — porque un WAL sin archivar es exactamente el hueco del RPO.
for _ in $(seq 1 30); do
    archivados=$(motor_como_superusuario "SELECT archived_count FROM pg_stat_archiver" postgres)
    fallidos=$(motor_como_superusuario "SELECT failed_count FROM pg_stat_archiver" postgres)
    [ "${fallidos:-0}" = "0" ] \
        || { echo "FALLO: el archivado de WAL fallo $fallidos veces. Sin archivado no hay RPO." >&2; exit 1; }
    [ "${archivados:-0}" -gt 0 ] && break
    motor_como_superusuario "SELECT pg_switch_wal()" postgres >/dev/null
    sleep 1
done
[ "${archivados:-0}" -gt 0 ] \
    || { echo "FALLO: no se archivo ni un segmento de WAL en 30 s." >&2; exit 1; }
echo "  $archivados segmentos archivados, 0 fallidos"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Sin la clave, el respaldo no se lee
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Sin la clave de cifrado, el respaldo NO se puede restaurar"
SIN_CLAVE="$TRABAJO/sin-clave"
mkdir -p "$SIN_CLAVE"
[ "$(id -u)" = "0" ] && chown postgres "$SIN_CLAVE" 2>/dev/null || true
if timeout 60 env \
        WALG_FILE_PREFIX="$ALMACEN" \
        WALG_LIBSODIUM_KEY="$CLAVE_EQUIVOCADA" \
        WALG_COMPRESSION_METHOD=lz4 \
        "$WALG" backup-fetch "$SIN_CLAVE" LATEST >/dev/null 2>&1; then
    echo "FALLO: el respaldo se restauro con una clave EQUIVOCADA. El cifrado no protege nada." >&2
    exit 1
fi
echo "  con la clave equivocada, la restauracion falla: correcto"
rm -rf "$SIN_CLAVE"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Se pierde el nodo
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Perdida total: se destruye el directorio de datos"
INICIO_DEL_RELOJ=$(date +%s)
motor_detener
motor_como_su_usuario rm -rf "$DATOS" 2>/dev/null || rm -rf "$DATOS"
[ ! -d "$DATOS" ] || { echo "FALLO: el directorio de datos sigue ahi." >&2; exit 1; }
echo "  el directorio de datos ya no existe"

# ─────────────────────────────────────────────────────────────────────────────
# 7. La restauracion, hasta T_BUENO y ni un segundo mas
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Restaurando el respaldo base"
mkdir -p "$RESTAURADO"
[ "$(id -u)" = "0" ] && chown postgres "$RESTAURADO" 2>/dev/null || true
chmod 700 "$RESTAURADO"

walg backup-fetch "$RESTAURADO" LATEST >/dev/null 2>&1 \
    || { echo "FALLO: backup-fetch no completo." >&2; walg backup-fetch "$RESTAURADO" LATEST 2>&1 | tail -20; exit 1; }

echo "· Reproduciendo el WAL hasta T_BUENO"
motor_como_su_usuario touch "$RESTAURADO/recovery.signal"
# `recovery_target_action = 'pause'`: el motor se detiene AL LLEGAR al objetivo en vez
# de promoverse solo. Es lo que permite mirar los datos antes de decidir que la
# restauracion es la buena — y en un incidente real, lo que evita descubrir que se
# apunto al instante equivocado despues de haber promovido.
motor_como_su_usuario tee "$RESTAURADO/postgresql.auto.conf" >/dev/null <<EOF
restore_command = '$WALG wal-fetch %f %p'
recovery_target_time = '$T_BUENO'
recovery_target_action = 'pause'
port = $PUERTO
listen_addresses = '127.0.0.1'
unix_socket_directories = '$TRABAJO'
EOF

motor_como_su_usuario env \
    WALG_FILE_PREFIX="$ALMACEN" \
    WALG_LIBSODIUM_KEY="$CLAVE_CIFRADO" \
    WALG_COMPRESSION_METHOD=lz4 \
    "$BINARIOS/pg_ctl" --pgdata="$RESTAURADO" --silent --log="$TRABAJO/restaurado.log" start
PID_RESTAURADO=si
motor_esperar || { tail -40 "$TRABAJO/restaurado.log"; echo "FALLO: el motor restaurado no acepto conexiones." >&2; exit 1; }

FIN_DEL_RELOJ=$(date +%s)
SEGUNDOS=$(( FIN_DEL_RELOJ - INICIO_DEL_RELOJ ))

# ─────────────────────────────────────────────────────────────────────────────
# 8. Lo restaurado sirve, y es lo que tiene que ser
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "· Comprobando lo restaurado"

consultar() {
    motor_como_su_usuario env PGPASSWORD="$CLAVE_SUPER" psql --username=postgres \
        --dbname=sgtm --tuples-only --no-align --command "$1"
}

filas=$(consultar "SELECT count(*) FROM simulacro_deuda")
[ "$filas" = "3" ] \
    || { echo "FALLO: se restauraron $filas filas, y en T_BUENO habia 3." >&2; exit 1; }
echo "  3 filas, las de T_BUENO"

perdida=$(consultar \
    "SELECT count(*) FROM simulacro_deuda WHERE contribuyente = 'ESCRITURA-QUE-SE-PIERDE'")
[ "$perdida" = "0" ] \
    || { echo "FALLO: la escritura posterior a T_BUENO sobrevivio. El PITR no respeto el objetivo." >&2; exit 1; }
echo "  la escritura posterior a T_BUENO no esta: el objetivo se respeto"

# Las cifras, no solo el numero de filas: un respaldo que restaura la estructura y
# pierde centimos es peor que uno que falla, porque parece que funciono.
total=$(consultar "SELECT sum(monto) FROM simulacro_deuda")
[ "$total" = "$TOTAL_ORIGEN" ] \
    || { echo "FALLO: el total restaurado es $total y en el origen era $TOTAL_ORIGEN." >&2; exit 1; }
echo "  el total cuadra con el origen: $total"

sullana=$(consultar "SELECT sum(monto) FROM simulacro_deuda WHERE municipalidad = 'sullana'")
[ "$sullana" = "$TOTAL_SULLANA" ] \
    || { echo "FALLO: el total de sullana es $sullana y en el origen era $TOTAL_SULLANA." >&2; exit 1; }
municipalidades=$(consultar "SELECT count(DISTINCT municipalidad) FROM simulacro_deuda")
[ "$municipalidades" = "2" ] \
    || { echo "FALLO: hay $municipalidades municipalidades en lo restaurado, y eran 2." >&2; exit 1; }
echo "  las dos municipalidades siguen separadas, con sus cifras"

# Y que lo restaurado es una base VIVA, no un montón de archivos: se promueve y se
# escribe. Una restauracion que solo se puede leer no devuelve el servicio.
consultar "SELECT pg_wal_replay_resume()" >/dev/null
for _ in $(seq 1 30); do
    [ "$(consultar 'SELECT pg_is_in_recovery()')" = "f" ] && break
    sleep 1
done
[ "$(consultar 'SELECT pg_is_in_recovery()')" = "f" ] \
    || { echo "FALLO: el motor restaurado no salio de recuperacion." >&2; exit 1; }
consultar "INSERT INTO simulacro_deuda VALUES ('paita', 'despues-de-restaurar', 1.00)" >/dev/null \
    || { echo "FALLO: lo restaurado no admite escrituras. No es un sistema, es una copia." >&2; exit 1; }
echo "  promovido, y admite escrituras: es un sistema, no una copia"

echo
echo "─────────────────────────────────────────────────────────────────────"
echo "  El simulacro de restauracion paso (ambiente «$AMBIENTE», modo $MODO)."
echo
echo "  Tiempo de recuperacion medido: ${SEGUNDOS}s"
echo "    Desde la perdida del directorio de datos hasta un motor que acepta"
echo "    conexiones con los datos de T_BUENO."
echo
echo "  ⚠ NO es el RTO de RNF-077. Este padron son 4 filas y el almacen es un"
echo "    sistema de archivos local. El numero que vale sale de stg, contra su"
echo "    contenedor real y con volumetria real (INF-03 §2). Este numero mide"
echo "    el procedimiento, no el tamano."
echo "─────────────────────────────────────────────────────────────────────"
