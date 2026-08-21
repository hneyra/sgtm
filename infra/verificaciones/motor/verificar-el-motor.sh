#!/usr/bin/env bash
# El motor del cluster, levantado de verdad y comprobado (issue #149).
#
# Toma **los mismos guiones de inicializacion que se montarian en k3s** —sacados del
# propio manifiesto, no de una copia—, levanta un PostgreSQL con ellos y comprueba
# contra el proceso en marcha lo que el issue #149 exige:
#
#   1. Los cuatro roles existen, y ninguno es superusuario ni omite RLS.
#   2. sgtm_owner y sgtm_app pueden conectarse; sgtm_readonly no.
#   3. Con las credenciales de la aplicacion, `CREATE TABLE` **falla**.
#   4. Los cuatro roles del SGTM conservan el CONNECT sobre la base del padron.
#   5. Keycloak tiene base propia, y NO puede conectarse a la del padron.
#   6. Reiniciar el motor deja los datos donde estaban.
#
# Lo que esto verifica es el CONTENIDO de la inicializacion —los roles, sus atributos,
# quien puede conectarse a que—, que es donde esta el riesgo y no cambia porque el
# proceso corra en un pod. Lo que Kubernetes anade encima —volumen, sondas, estrategia—
# lo cubren la auditoria y `componentes.test.ts`. Decirlo asi es mas honesto que llamar a
# esto «probado en el cluster».
#
# La comprobacion 4 no es decorativa: `30-base-de-keycloak.sh` revoca el CONNECT que
# PUBLIC tiene por omision sobre la base del padron. Si no volviera a concederselo a los
# cuatro roles, la aplicacion entera se quedaria sin poder conectarse — y el sintoma
# aparece en el arranque del primer despliegue, no aqui. Esta prueba es lo que impide
# que ese cambio pase en verde.
#
#   uso: verificaciones/motor/verificar-el-motor.sh [--ambiente stg|prod]
#
# Levanta el motor con Docker, que es lo fiel —la misma imagen que declara el
# manifiesto—. Si no hay Docker utilizable pero si un PostgreSQL de la misma version
# mayor instalado, usa una instancia local temporal y **lo dice**: los guiones son los
# mismos y el orden tambien, pero la imagen no. CI usa siempre el camino de Docker. La
# mecanica de levantar el motor vive en `lib-motor-local.sh`, compartida con
# `secretos/verificar-rotacion.sh` (issue #154).
set -euo pipefail

AMBIENTE=stg
CON_AISLAMIENTO=no
while [ $# -gt 0 ]; do
    case "$1" in
        --ambiente) AMBIENTE=${2:?falta el valor de --ambiente}; shift 2 ;;
        # Ejecuta ademas `verificarAislamiento` CONTRA ESTA INSTANCIA, que es el primer
        # criterio de aceptacion del issue #149. Necesita el JDK del backend.
        --con-aislamiento) CON_AISLAMIENTO=si; shift ;;
        *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
    esac
done

AQUI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INFRA=$(cd "$AQUI/../.." && pwd)
TRABAJO=$(mktemp -d)
PUERTO=${SGTM_PUERTO_MOTOR:-55432}

trap 'motor_detener 2>/dev/null || true; rm -rf "$TRABAJO"' EXIT

# shellcheck source=lib-motor-local.sh
source "$AQUI/lib-motor-local.sh"

comoSuperusuario() { motor_como_superusuario "$@"; }

# ── 3. Los cuatro roles, con sus atributos ───────────────────────────────────
echo "· Los cuatro roles"
for rol in sgtm_owner sgtm_app sgtm_readonly rol_carga_parametros; do
    atributos=$(comoSuperusuario \
        "SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = '$rol'")
    [ -n "$atributos" ] || { echo "FALLO: el rol $rol no existe" >&2; exit 1; }
    case "$atributos" in
        f\|f\|*) ;;
        *) echo "FALLO: el rol $rol es superusuario o omite RLS: $atributos" >&2; exit 1 ;;
    esac
    echo "  $rol → rolsuper|rolbypassrls|rolcanlogin = $atributos"
done

[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_owner'")" = "t" ] \
    || { echo "FALLO: sgtm_owner no puede conectarse; el migrador no podria migrar" >&2; exit 1; }
[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_app'")" = "t" ] \
    || { echo "FALLO: sgtm_app no puede conectarse; la aplicacion no arrancaria" >&2; exit 1; }
# Un rol que puede iniciar sesion sin que nadie lo use es una credencial mas que rotar y
# vigilar: sgtm_readonly y rol_carga_parametros se quedan NOLOGIN hasta que hagan falta.
[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_readonly'")" = "f" ] \
    || { echo "FALLO: sgtm_readonly puede conectarse, y todavia no lo usa nadie" >&2; exit 1; }

# ── 4. Con las credenciales de la aplicacion, no hay DDL ─────────────────────
echo "· La aplicacion no puede ejecutar DDL"
if PGPASSWORD="$CLAVE_APP" psql --username=sgtm_app --dbname=sgtm --quiet \
        --command 'CREATE TABLE intento_de_ddl (id int)' >/dev/null 2>&1; then
    echo "FALLO: las credenciales de la aplicacion pueden crear tablas. Un proceso expuesto en HTTP con DDL sobre el padron de todas las municipalidades es lo que ARQ-03 §4 excluye" >&2
    exit 1
fi

# ── 5. Los cuatro conservan el CONNECT sobre la base del padron ──────────────
echo "· Los cuatro roles conservan el CONNECT sobre la base del padron"
for par in "sgtm_owner:$CLAVE_OWNER" "sgtm_app:$CLAVE_APP"; do
    rol=${par%%:*}
    clave=${par#*:}
    PGPASSWORD="$clave" psql --username="$rol" --dbname=sgtm --quiet --command 'SELECT 1' \
        >/dev/null 2>&1 \
        || { echo "FALLO: $rol no puede conectarse a la base del padron: 30-base-de-keycloak.sh revoca el CONNECT de PUBLIC y tiene que volver a concederselo a los cuatro roles" >&2; exit 1; }
done
for rol in sgtm_readonly rol_carga_parametros; do
    # Estos dos no tienen LOGIN, asi que el privilegio se comprueba por el catalogo.
    [ "$(comoSuperusuario "SELECT has_database_privilege('$rol','sgtm','CONNECT')")" = "t" ] \
        || { echo "FALLO: $rol perdio el CONNECT sobre la base del padron" >&2; exit 1; }
done

# ── 6. Keycloak: base propia, y lejos del padron ─────────────────────────────
echo "· La base de Keycloak"
[ "$(comoSuperusuario "SELECT 1 FROM pg_database WHERE datname='keycloak'" postgres)" = "1" ] \
    || { echo "FALLO: la base de Keycloak no existe" >&2; exit 1; }
[ "$(comoSuperusuario "SELECT has_database_privilege('keycloak','sgtm','CONNECT')" postgres)" = "f" ] \
    || { echo "FALLO: el rol de Keycloak puede conectarse a la base del padron. No la necesita, y una credencial de mas apuntando al padron es una credencial de mas" >&2; exit 1; }
PGPASSWORD="$CLAVE_IDENTIDAD" psql --username=keycloak --dbname=keycloak --quiet \
    --command 'SELECT 1' >/dev/null 2>&1 \
    || { echo "FALLO: Keycloak no puede conectarse a su propia base" >&2; exit 1; }

# ── 7. Reiniciar deja los datos donde estaban ────────────────────────────────
echo "· Reiniciar el motor no pierde datos"
PGPASSWORD="$CLAVE_OWNER" psql --username=sgtm_owner --dbname=sgtm --quiet \
    --command 'CREATE TABLE si_sobrevive (dato text)' \
    --command "INSERT INTO si_sobrevive VALUES ('sobrevivio')" >/dev/null

motor_reiniciar || { echo "FALLO: el motor no volvio tras el reinicio" >&2; exit 1; }

[ "$(comoSuperusuario "SELECT dato FROM si_sobrevive")" = "sobrevivio" ] \
    || { echo "FALLO: el dato no sobrevivio al reinicio" >&2; exit 1; }

# ── 8. El aislamiento, contra ESTA instancia ─────────────────────────────────
#
# Es el primer criterio de aceptacion del issue #149, y lo unico que demuestra que el
# aislamiento sigue en pie es ejecutarlo aqui.
#
# ⚠ **Nunca contra el motor de una municipalidad en marcha.** La prueba provisiona: crea
# una base para la corrida y le asigna a los cuatro roles claves efimeras con `ALTER
# ROLE` (`BaseDeDatosDePrueba.crearRoles`). Los roles son objetos del clúster de
# PostgreSQL, no de la base, asi que esas claves nuevas valen para TODAS sus bases: la
# aplicacion que estuviera corriendo contra ese motor se quedaria fuera hasta que
# alguien volviera a aplicar el Secret. Por eso esto corre contra la instancia
# desechable que acaba de levantar este guion, y no contra `prod`.
if [ "$CON_AISLAMIENTO" = "si" ]; then
    echo
    echo "· verificarAislamiento contra esta instancia"
    # `--no-parallel --max-workers=1`, y esto se descubrio por las malas en la primera
    # corrida de este trabajo: `verificarAislamiento` son DOS tareas —el esquema y la
    # plataforma— y `org.gradle.parallel=true` las lanza a la vez.
    #
    # Con Testcontainers eso da igual: cada una levanta su contenedor. Contra un motor
    # externo comparten instancia, y **los roles son objetos del clúster de PostgreSQL,
    # no de una base**: las dos ejecutan `ALTER ROLE sgtm_owner ... PASSWORD` sobre los
    # mismos roles. El resultado fue un `tuple concurrently updated` en una y un
    # `password authentication failed for user "sgtm_owner"` en la otra —la clave que
    # acababa de poner se la habia cambiado la vecina—.
    #
    # En serie no hay carrera: cada clase provisiona, usa lo suyo y termina. Cuesta unos
    # segundos mas y es lo que hace que este camino signifique algo.
    (
        cd "$INFRA/../backend"
        ./gradlew verificarAislamiento --no-daemon --no-parallel --max-workers=1 \
            -Dsgtm.pruebas.postgres.url="jdbc:postgresql://127.0.0.1:$PUERTO/postgres" \
            -Dsgtm.pruebas.postgres.usuario=postgres \
            -Dsgtm.pruebas.postgres.clave="$CLAVE_SUPER"
    ) || { echo "FALLO: la prueba de aislamiento no paso contra la instancia del manifiesto" >&2; exit 1; }
fi

echo
echo "El motor del manifiesto de «$AMBIENTE» cumple lo que el issue #149 exige (modo: $MODO)."
