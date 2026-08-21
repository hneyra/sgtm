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
# mismos y el orden tambien, pero la imagen no. CI usa siempre el camino de Docker.
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
CONTENEDOR=sgtm-motor-verificacion-$$
PUERTO=${SGTM_PUERTO_MOTOR:-55432}
MODO=""

# Todo lo que este guion consulta va por TCP contra el bucle local, levante el motor
# quien lo levante: asi los dos caminos —contenedor y motor local— se comprueban con las
# mismas ordenes.
export PGHOST=127.0.0.1
export PGPORT=$PUERTO

# Claves con comilla simple a proposito: `20-asignar-claves.sh` las pasa a psql como
# variables (`:'clave'`) justamente para que una comilla no rompa —ni cambie— la
# sentencia. Si alguien "simplificara" ese guion interpolando la clave en el texto del
# SQL, esta prueba se pondria roja aqui mismo.
CLAVE_SUPER="sup3r'usuario"
CLAVE_OWNER="o'wner-Cl4ve"
CLAVE_APP="a'pp-Cl4ve"
CLAVE_IDENTIDAD="k'eycloak-Cl4ve"

limpiar() {
    if [ "$MODO" = "docker" ]; then
        docker rm --force "$CONTENEDOR" >/dev/null 2>&1 || true
    elif [ "$MODO" = "local" ]; then
        comoElUsuarioDelMotor "$BINARIOS/pg_ctl" --pgdata="$TRABAJO/datos" --silent stop \
            >/dev/null 2>&1 || true
    fi
    rm -rf "$TRABAJO"
}
trap limpiar EXIT

fallo() {
    echo "FALLO: $*" >&2
    exit 1
}

# Las comprobaciones se hacen con el cliente de PostgreSQL desde fuera del motor, asi
# que el camino de Docker tambien lo necesita. Se dice aqui y no en la primera consulta,
# que fallaria con un «command not found» a mitad.
for herramienta in psql pg_isready node yarn; do
    command -v "$herramienta" >/dev/null 2>&1 \
        || { echo "FALLO: falta «$herramienta», que este guion necesita." >&2; exit 1; }
done

# ── 1. Los guiones, sacados del manifiesto ───────────────────────────────────
echo "· Extrayendo la inicializacion del manifiesto de «$AMBIENTE»"
cd "$INFRA"
yarn --silent manifiestos --ambiente "$AMBIENTE" --componente postgres > "$TRABAJO/postgres.json"

node --input-type=module -e "
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const lista = JSON.parse(readFileSync('$TRABAJO/postgres.json', 'utf8'));
const configuracion = lista.items.find((i) => i.kind === 'ConfigMap');
if (!configuracion) throw new Error('El manifiesto no trae el ConfigMap de inicializacion');
mkdirSync('$TRABAJO/inicializacion', { recursive: true });
for (const [nombre, contenido] of Object.entries(configuracion.data)) {
  writeFileSync('$TRABAJO/inicializacion/' + nombre, contenido);
}
const motor = lista.items.find((i) => i.kind === 'Deployment');
writeFileSync('$TRABAJO/imagen', motor.spec.template.spec.containers[0].image);
"

chmod +x "$TRABAJO"/inicializacion/*.sh
IMAGEN=$(cat "$TRABAJO/imagen")
echo "· Imagen declarada en el manifiesto: $IMAGEN"
ls "$TRABAJO/inicializacion"

# ── 2. El motor, con esos guiones ────────────────────────────────────────────
arrancarConDocker() {
    docker run --detach --name "$CONTENEDOR" \
        --env POSTGRES_DB=sgtm \
        --env POSTGRES_USER=postgres \
        --env POSTGRES_PASSWORD="$CLAVE_SUPER" \
        --env SGTM_CLAVE_OWNER="$CLAVE_OWNER" \
        --env SGTM_CLAVE_APP="$CLAVE_APP" \
        --env SGTM_CLAVE_IDENTIDAD="$CLAVE_IDENTIDAD" \
        --env PGDATA=/var/lib/postgresql/data/pgdata \
        --volume "$TRABAJO/inicializacion:/docker-entrypoint-initdb.d:ro" \
        --publish "127.0.0.1:$PUERTO:5432" \
        "$IMAGEN" >/dev/null
}

# Reproduce lo que hace el punto de entrada de la imagen: `initdb`, arrancar, crear
# `POSTGRES_DB` y ejecutar `/docker-entrypoint-initdb.d` **en orden alfabetico**. Ese
# orden es parte de lo que se verifica: `20-asignar-claves.sh` necesita los roles que
# crea el `10-`, y el `30-` necesita las dos cosas.
# PostgreSQL se niega a correr como root, y hace bien. Cuando esto corre como root
# —el caso de un contenedor de CI—, initdb y pg_ctl van como el usuario `postgres`
# del sistema; el resto del guion sigue siendo del usuario de siempre, porque se
# conecta por TCP.
comoElUsuarioDelMotor() {
    if [ "$(id -u)" = "0" ]; then
        runuser --user=postgres -- "$@"
    else
        "$@"
    fi
}

arrancarLocalmente() {
    if [ "$(id -u)" = "0" ]; then
        id postgres >/dev/null 2>&1 \
            || fallo "hay que correr como root sin usuario «postgres» en el sistema: PostgreSQL no arranca como root"
        chmod 711 "$TRABAJO"
        chown postgres "$TRABAJO"
    fi
    printf '%s' "$CLAVE_SUPER" > "$TRABAJO/clave"
    chmod 644 "$TRABAJO/clave"
    comoElUsuarioDelMotor "$BINARIOS/initdb" --pgdata="$TRABAJO/datos" --username=postgres \
        --auth-host=scram-sha-256 --auth-local=trust --pwfile="$TRABAJO/clave" >/dev/null
    comoElUsuarioDelMotor "$BINARIOS/pg_ctl" --pgdata="$TRABAJO/datos" --silent \
        --log="$TRABAJO/motor.log" \
        --options="-p $PUERTO -k $TRABAJO -c listen_addresses=127.0.0.1" start
    esperarAlMotor || fallo "el motor local no acepto conexiones"

    # Los guiones se conectan sin decir donde: en la imagen es el socket del contenedor
    # y aqui son estas variables. El guion NO se toca — es el mismo archivo que se
    # montaria en k3s, y esa es media prueba.
    export PGPASSWORD="$CLAVE_SUPER"
    psql --quiet --username=postgres --command 'CREATE DATABASE sgtm' postgres >/dev/null

    for guion in "$TRABAJO"/inicializacion/*; do
        echo "  · $(basename "$guion")"
        case "$guion" in
            *.sql) psql --quiet -v ON_ERROR_STOP=1 --username=postgres --file="$guion" sgtm \
                       >/dev/null ;;
            *.sh) POSTGRES_USER=postgres POSTGRES_DB=sgtm \
                  SGTM_CLAVE_OWNER="$CLAVE_OWNER" SGTM_CLAVE_APP="$CLAVE_APP" \
                  SGTM_CLAVE_IDENTIDAD="$CLAVE_IDENTIDAD" bash "$guion" >/dev/null ;;
        esac
    done
    unset PGPASSWORD
}

esperarAlMotor() {
    for _ in $(seq 1 60); do
        if pg_isready --host=127.0.0.1 --port="$PUERTO" --username=postgres >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

BINARIOS=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)

if docker pull --quiet "$IMAGEN" >/dev/null 2>&1; then
    MODO=docker
    echo "· Motor: contenedor con $IMAGEN"
    arrancarConDocker
    esperarAlMotor || { docker logs "$CONTENEDOR" | tail -40; fallo "el motor no acepto conexiones"; }
    if docker logs "$CONTENEDOR" 2>&1 | grep -qiE "^psql:.*ERROR|initdb: error"; then
        docker logs "$CONTENEDOR" | tail -40
        fallo "la inicializacion del motor registro errores"
    fi
elif [ -n "$BINARIOS" ] && [ -x "$BINARIOS/initdb" ]; then
    MODO=local
    echo "· Motor: instancia local temporal ($("$BINARIOS/postgres" --version))."
    echo "  ⚠ No es la imagen del manifiesto —Docker no esta disponible aqui—: los guiones"
    echo "    y su orden son los mismos, la imagen no. CI usa siempre el camino de Docker."
    arrancarLocalmente
else
    fallo "no hay ni Docker ni un PostgreSQL local con el que levantar el motor"
fi

comoSuperusuario() {
    PGPASSWORD="$CLAVE_SUPER" psql --username=postgres --dbname="${2:-sgtm}" \
        --tuples-only --no-align --command "$1"
}

# ── 3. Los cuatro roles, con sus atributos ───────────────────────────────────
echo "· Los cuatro roles"
for rol in sgtm_owner sgtm_app sgtm_readonly rol_carga_parametros; do
    atributos=$(comoSuperusuario \
        "SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = '$rol'")
    [ -n "$atributos" ] || fallo "el rol $rol no existe"
    case "$atributos" in
        f\|f\|*) ;;
        *) fallo "el rol $rol es superusuario o omite RLS: $atributos" ;;
    esac
    echo "  $rol → rolsuper|rolbypassrls|rolcanlogin = $atributos"
done

[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_owner'")" = "t" ] \
    || fallo "sgtm_owner no puede conectarse; el migrador no podria migrar"
[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_app'")" = "t" ] \
    || fallo "sgtm_app no puede conectarse; la aplicacion no arrancaria"
# Un rol que puede iniciar sesion sin que nadie lo use es una credencial mas que rotar y
# vigilar: sgtm_readonly y rol_carga_parametros se quedan NOLOGIN hasta que hagan falta.
[ "$(comoSuperusuario "SELECT rolcanlogin FROM pg_roles WHERE rolname='sgtm_readonly'")" = "f" ] \
    || fallo "sgtm_readonly puede conectarse, y todavia no lo usa nadie"

# ── 4. Con las credenciales de la aplicacion, no hay DDL ─────────────────────
echo "· La aplicacion no puede ejecutar DDL"
if PGPASSWORD="$CLAVE_APP" psql --username=sgtm_app --dbname=sgtm --quiet \
        --command 'CREATE TABLE intento_de_ddl (id int)' >/dev/null 2>&1; then
    fallo "las credenciales de la aplicacion pueden crear tablas. Un proceso expuesto en HTTP con DDL sobre el padron de todas las municipalidades es lo que ARQ-03 §4 excluye"
fi

# ── 5. Los cuatro conservan el CONNECT sobre la base del padron ──────────────
echo "· Los cuatro roles conservan el CONNECT sobre la base del padron"
for par in "sgtm_owner:$CLAVE_OWNER" "sgtm_app:$CLAVE_APP"; do
    rol=${par%%:*}
    clave=${par#*:}
    PGPASSWORD="$clave" psql --username="$rol" --dbname=sgtm --quiet --command 'SELECT 1' \
        >/dev/null 2>&1 \
        || fallo "$rol no puede conectarse a la base del padron: 30-base-de-keycloak.sh revoca el CONNECT de PUBLIC y tiene que volver a concederselo a los cuatro roles"
done
for rol in sgtm_readonly rol_carga_parametros; do
    # Estos dos no tienen LOGIN, asi que el privilegio se comprueba por el catalogo.
    [ "$(comoSuperusuario "SELECT has_database_privilege('$rol','sgtm','CONNECT')")" = "t" ] \
        || fallo "$rol perdio el CONNECT sobre la base del padron"
done

# ── 6. Keycloak: base propia, y lejos del padron ─────────────────────────────
echo "· La base de Keycloak"
[ "$(comoSuperusuario "SELECT 1 FROM pg_database WHERE datname='keycloak'" postgres)" = "1" ] \
    || fallo "la base de Keycloak no existe"
[ "$(comoSuperusuario "SELECT has_database_privilege('keycloak','sgtm','CONNECT')" postgres)" = "f" ] \
    || fallo "el rol de Keycloak puede conectarse a la base del padron. No la necesita, y una credencial de mas apuntando al padron es una credencial de mas"
PGPASSWORD="$CLAVE_IDENTIDAD" psql --username=keycloak --dbname=keycloak --quiet \
    --command 'SELECT 1' >/dev/null 2>&1 \
    || fallo "Keycloak no puede conectarse a su propia base"

# ── 7. Reiniciar deja los datos donde estaban ────────────────────────────────
echo "· Reiniciar el motor no pierde datos"
PGPASSWORD="$CLAVE_OWNER" psql --username=sgtm_owner --dbname=sgtm --quiet \
    --command 'CREATE TABLE si_sobrevive (dato text)' \
    --command "INSERT INTO si_sobrevive VALUES ('sobrevivio')" >/dev/null

if [ "$MODO" = "docker" ]; then
    docker restart "$CONTENEDOR" >/dev/null
else
    comoElUsuarioDelMotor "$BINARIOS/pg_ctl" --pgdata="$TRABAJO/datos" --silent \
        --log="$TRABAJO/motor.log" restart \
        --options="-p $PUERTO -k $TRABAJO -c listen_addresses=127.0.0.1" >/dev/null
fi
esperarAlMotor || fallo "el motor no volvio tras el reinicio"

[ "$(comoSuperusuario "SELECT dato FROM si_sobrevive")" = "sobrevivio" ] \
    || fallo "el dato no sobrevivio al reinicio"

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
    (
        cd "$INFRA/../backend"
        ./gradlew verificarAislamiento --no-daemon \
            -Dsgtm.pruebas.postgres.url="jdbc:postgresql://127.0.0.1:$PUERTO/postgres" \
            -Dsgtm.pruebas.postgres.usuario=postgres \
            -Dsgtm.pruebas.postgres.clave="$CLAVE_SUPER"
    ) || fallo "la prueba de aislamiento no paso contra la instancia del manifiesto"
fi

echo
echo "El motor del manifiesto de «$AMBIENTE» cumple lo que el issue #149 exige (modo: $MODO)."
