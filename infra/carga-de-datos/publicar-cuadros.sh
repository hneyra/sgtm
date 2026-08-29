#!/usr/bin/env bash
# Publica un CUADRO normativo nacional -miles de filas- contra un ambiente real, corriendo el
# proceso batch PublicarCuadros (backend/sgtm-parametros) como un Job de un solo uso (D-13,
# ADR-0017; #188).
#
# Es el hermano de publicar-parametros.sh para lo que no cabe en una fila. Aquel publica la UIT y
# los tramos, once filas con su cifra en el derivado; un cuadro tiene miles y su derivado es el
# archivo mecanico de la fuente, con su sha256 firmado en el corpus.
#
# QUE ES UNA EDICION. La resolucion entera -"la Tabla de Valores Referenciales del ejercicio 2026"-,
# representada como UNA fila de parametro_tributario. Las miles de filas del cuadro cuelgan de ella
# por publicacion_id. Por eso componerla en un conjunto sellado es la MISMA fila de
# conjunto_parametro_detalle con la que se compone la UIT: no hay mecanismo nuevo (D-13).
#
# La secuencia completa de un ejercicio, en cinco pasos y en este orden:
#
#   1. abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 --ejercicio 2026
#      -> anota el CONJUNTO_ID que imprime
#   2. publicar-parametros.sh --ambiente stg \
#      --archivo docs/10-negocio/valores-normativos/publicacion/parametros-2026.csv
#   3. publicar-cuadros.sh --ambiente stg \
#      --archivo docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv
#   4. cargar-arancel-vial.sh --ambiente stg --municipalidad-id 4 --conjunto-id N \
#      --archivo arancel_2026.csv
#   5. abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 --conjunto-id N \
#      --archivo docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv --sellar
#
# El paso 3 y el paso 5 llevan EL MISMO archivo, por lo mismo que el 2 y el 5 con parametros-2026:
# sus columnas `tipo,clave,vigencia_desde` son las que ImportarParametrosDelConjunto lee, y las
# demas las ignora. Con dos archivos, el dia que alguien cambia uno y se olvida del otro, el
# conjunto se sella nombrando una edicion que no es la que se publico.
#
# EL ARCHIVO NO SE ESCRIBE A MANO. Es el manifiesto del corpus, y
# docs/10-negocio/verificar-cuadros.mjs comprueba en cada PR que su archivo del corpus este
# VERIFICADO, que las dos firmas sean las de su cabecera, que el documento fuente aparezca en el, y
# que el sha256 del archivo de filas sea el que el corpus firmo. El proceso lo vuelve a calcular
# antes de publicar una sola fila: un byte distinto en un cuadro normativo se investiga.
#
# LA CREDENCIAL. Este Job es el UNICO que corre como rol_carga_parametros. No es una preferencia:
# parametro_tributario lleva FORCE ROW LEVEL SECURITY y la unica politica de escritura de V6 nombra
# a ese rol, asi que ni sgtm_app -que solo tiene SELECT (V7)- ni sgtm_owner pueden insertar en ella.
# Y ese rol no alcanza nada mas: ni el conjunto, ni su detalle, ni la auditoria. Es la separacion de
# funciones SoD-1 de REQ-03, escrita en los privilegios.
#
# rol_carga_parametros tiene LOGIN desde 20-asignar-claves.sh y su clave vive en el secreto
# sgtm-<ambiente>-postgres-carga, generado por secretos/bootstrap-secretos.sh y listado en el
# inventario de INF-06 (issue #387). El guion comprueba que el secreto exista en ESTE namespace y se
# para nombrandolo si no: montar el Job con la credencial de la aplicacion lo dejaria fallar dentro
# con un error de privilegio, y la salida comoda ante eso es darle a sgtm_app el INSERT que no debe
# tener.
#
#   uso: publicar-cuadros.sh --ambiente stg|prod --archivo cuadros-2026.csv \
#        [--namespace sgtm-stg] [--usuario nombre-del-proceso]
#
# Requiere: kubectl con el tunel al API del ambiente ya abierto.
set -euo pipefail

AMBIENTE=""
ARCHIVO=""
NAMESPACE=""
USUARIO="publicacion-cuadros"
while [ $# -gt 0 ]; do
    case "$1" in
        --ambiente) AMBIENTE=${2:?falta el valor de --ambiente}; shift 2 ;;
        --archivo) ARCHIVO=${2:?falta el valor de --archivo}; shift 2 ;;
        --namespace) NAMESPACE=${2:?falta el valor de --namespace}; shift 2 ;;
        --usuario) USUARIO=${2:?falta el valor de --usuario}; shift 2 ;;
        *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
    esac
done
[ -n "$AMBIENTE" ] || { echo "Falta --ambiente (stg o prod)." >&2; exit 2; }
[ -n "$ARCHIVO" ] || {
    echo "Falta --archivo: el manifiesto de docs/10-negocio/valores-normativos/publicacion/." >&2
    exit 2
}
[ -f "$ARCHIVO" ] || { echo "No existe el archivo: $ARCHIVO" >&2; exit 2; }
NAMESPACE=${NAMESPACE:-sgtm-$AMBIENTE}
SECRETO="sgtm-${AMBIENTE}-postgres-carga"

# El derivado se comprueba contra el corpus ANTES de montarlo. Cuesta un segundo y es la diferencia
# entre publicar la norma y publicar lo que alguien escribio en un CSV.
RAIZ=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
if command -v node >/dev/null 2>&1 && [ -f "$RAIZ/docs/10-negocio/verificar-cuadros.mjs" ]; then
    echo "Comprobando $ARCHIVO contra el corpus..."
    node "$RAIZ/docs/10-negocio/verificar-cuadros.mjs" --csv "$(cd "$(dirname "$ARCHIVO")" \
        && pwd)/$(basename "$ARCHIVO")"
else
    echo "AVISO: sin node, el derivado se monta sin comprobar contra el corpus." >&2
fi

kubectl -n "$NAMESPACE" get secret "$SECRETO" >/dev/null 2>&1 || {
    cat >&2 <<EOF
No existe el secreto $SECRETO en $NAMESPACE, y sin el este Job no tiene con que conectarse.

rol_carga_parametros tiene LOGIN desde la inicializacion del motor (issue #387); lo que falta en
este namespace es el secreto con su clave. Corre, contra este ambiente:

  secretos/bootstrap-secretos.sh --ambiente $AMBIENTE

Lo que NO hay que hacer es montar este Job con la credencial de la aplicacion: sgtm_app solo
tiene SELECT sobre parametro_tributario, y darle el INSERT que le falta pondria la publicacion
de valores normativos al alcance del proceso que atiende peticiones.
EOF
    exit 1
}

SUFIJO=$(date +%s)
RECURSO="sgtm-${AMBIENTE}-publicacion-cuadros-${SUFIJO}"

IMAGEN=$(kubectl -n "$NAMESPACE" get deployment "sgtm-${AMBIENTE}-aplicacion" \
    -o jsonpath='{.spec.template.spec.containers[0].image}')
[ -n "$IMAGEN" ] || {
    echo "No se pudo leer la imagen de sgtm-${AMBIENTE}-aplicacion en $NAMESPACE" >&2
    exit 1
}
echo "Imagen desplegada: $IMAGEN"

# EL ARCHIVO DE FILAS NO CABE EN UN ConfigMap, y hay que decirlo antes de intentarlo.
#
# publicar-parametros.sh monta su derivado en un ConfigMap porque son once filas. Un cuadro no:
# tvr-2026.csv pesa 1,5 MB y el limite de un ConfigMap -en realidad de un objeto de etcd- es 1 MiB.
# kubectl lo rechazaria con "request entity too large", y la salida comoda ante eso es partir el
# archivo, que es exactamente lo que no se puede hacer con un derivado cuyo sha256 esta firmado.
#
# Se comprueba aqui, con el numero, para que el fallo diga que hacer en vez de aparecer dentro del
# Job. Lo que falta es infraestructura, no codigo: montar el archivo de filas desde el bucket de
# fuentes normativas (s3://sgtm-fuentes-normativas) con un initContainer que compruebe su sha256, o
# desde un PVC de un solo uso. El proceso no cambia: lee la ruta que el manifiesto nombra.
LIMITE_CONFIGMAP=$((1024 * 1024))
DIRECTORIO_DEL_MANIFIESTO=$(cd "$(dirname "$ARCHIVO")" && pwd)
FALTAN=0
LISTA_DE_FILAS=$(grep -v '^#' "$ARCHIVO" | tail -n +2 | cut -d, -f7)
for RELATIVA in $LISTA_DE_FILAS; do
    FILAS="$DIRECTORIO_DEL_MANIFIESTO/$RELATIVA"
    [ -f "$FILAS" ] || {
        echo "El manifiesto nombra un archivo que no existe: $RELATIVA" >&2
        exit 1
    }
    TAMANIO=$(wc -c < "$FILAS")
    if [ "$TAMANIO" -gt "$LIMITE_CONFIGMAP" ]; then
        echo "$RELATIVA pesa $TAMANIO bytes y un ConfigMap admite $LIMITE_CONFIGMAP." >&2
        FALTAN=1
    fi
done
[ "$FALTAN" -eq 0 ] || {
    cat >&2 <<'EOF'

El archivo de filas no cabe en un ConfigMap (limite de 1 MiB por objeto de etcd), asi que este
Job no se puede montar todavia tal como esta escrito. Lo que falta es infraestructura:

  a) publicar el archivo de filas en s3://sgtm-fuentes-normativas junto al PDF que lo origina
     (scripts/valores-normativos/archivar_fuente_normativa.sh ya lo hace para los PDF), y
  b) un initContainer que lo descargue al volumen del Job y COMPRUEBE su sha256 antes de
     entregarselo: la misma huella que el manifiesto declara.

Lo que NO hay que hacer es partir el archivo en trozos que quepan: su sha256 esta firmado en el
corpus, y un cuadro normativo partido deja de poder demostrarse identico a la fuente.

Mientras tanto la carga se puede correr desde una maquina con acceso a la base, con el mismo
proceso y la misma credencial:

  SPRING_PROFILES_ACTIVE=batch SGTM_DB_USUARIO=rol_carga_parametros \
  SGTM_PUBLICACIONCUADROS_ARCHIVO=<ruta al manifiesto> java -jar sgtm-aplicacion.jar
EOF
    exit 1
}

echo "Creando ConfigMap $RECURSO con $ARCHIVO..."
kubectl -n "$NAMESPACE" create configmap "$RECURSO" --from-file=cuadros.csv="$ARCHIVO"
cleanup() {
    kubectl -n "$NAMESPACE" delete configmap "$RECURSO" --ignore-not-found >/dev/null
}
trap cleanup EXIT

cat <<EOF | kubectl -n "$NAMESPACE" apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: $RECURSO
  labels:
    proyecto: sgtm
    ambiente: $AMBIENTE
    componente: publicacion-cuadros
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        proyecto: sgtm
        ambiente: $AMBIENTE
        componente: publicacion-cuadros
        # Ver el mismo comentario en cargar-arancel-vial.sh: "lote" es la etiqueta que
        # NetworkPolicy "permitir-ingreso-postgres" deja pasar al puerto 5432 para un
        # Job de un solo uso; con otra etiqueta el pod arranca y la conexion cae con
        # "Connection refused".
        app: lote
    spec:
      restartPolicy: Never
      priorityClassName: sgtm-${AMBIENTE}-prioridad-lote
      containers:
        - name: publicacion-cuadros
          image: $IMAGEN
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: batch
            - name: SGTM_DB_URL
              value: jdbc:postgresql://sgtm-${AMBIENTE}-postgres:5432/sgtm
            # rol_carga_parametros, y solo aqui. parametro_tributario lleva FORCE ROW LEVEL
            # SECURITY y la unica politica de escritura de V6 nombra a este rol: ni sgtm_app
            # ni sgtm_owner pueden insertar en ella. Y este rol no alcanza ninguna otra tabla
            # (V7), asi que este Job no puede componer ni sellar aunque quisiera.
            - name: SGTM_DB_USUARIO
              value: rol_carga_parametros
            - name: SGTM_DB_CLAVE
              valueFrom:
                secretKeyRef:
                  name: $SECRETO
                  key: clave-carga
            - name: SGTM_PUBLICACIONCUADROS_ARCHIVO
              value: /datos/cuadros.csv
            - name: SGTM_PUBLICACIONCUADROS_USUARIODELPROCESO
              value: "$USUARIO"
          volumeMounts:
            - name: datos
              mountPath: /datos
              readOnly: true
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            runAsNonRoot: true
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits: { cpu: "1", memory: "512Mi" }
      volumes:
        - name: datos
          configMap:
            name: $RECURSO
EOF

echo "Esperando a que $RECURSO termine..."
LIMITE=$((SECONDS + 1800))
while true; do
    completo=$(kubectl -n "$NAMESPACE" get job "$RECURSO" \
        -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}')
    fallido=$(kubectl -n "$NAMESPACE" get job "$RECURSO" \
        -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}')
    if [ "$completo" = "True" ]; then
        echo "Completado."
        break
    fi
    if [ "$fallido" = "True" ]; then
        echo "El Job fallo. Registro:" >&2
        kubectl -n "$NAMESPACE" logs "job/$RECURSO" --tail=500 >&2
        exit 1
    fi
    [ "$SECONDS" -lt "$LIMITE" ] || {
        echo "Se agoto el tiempo de espera (1800s)." >&2
        exit 1
    }
    sleep 3
done

REGISTRO=$(kubectl -n "$NAMESPACE" logs "job/$RECURSO" --tail=500)
echo "$REGISTRO"

# Las dos cifras que hay que mirar. Rechazadas > 0 no es un fallo del Job -cada fila es su propia
# transaccion, y volver a correr el archivo entero no duplica- pero SI significa que el conjunto no
# se puede componer entero todavia, y sellarlo asi congelaria un ejercicio incompleto.
RESUMEN=$(printf '%s\n' "$REGISTRO" | sed -n 's/.*\(PUBLICADAS=[0-9]\{1,\} RECHAZADAS=[0-9]\{1,\}\).*/\1/p' | tail -1)
[ -n "$RESUMEN" ] || {
    echo "El Job termino pero no dijo cuantas filas publico: revise el registro de arriba." >&2
    exit 1
}
echo
echo "$RESUMEN"
case "$RESUMEN" in
    *"RECHAZADAS=0") ;;
    *) echo "AVISO: hay filas sin publicar. Revise los motivos de arriba ANTES de sellar:" \
           "un conjunto sellado al que le falta un valor no se corrige, se sustituye." >&2 ;;
esac
echo
echo "Siguiente paso: abrir-conjunto-parametros.sh --ambiente $AMBIENTE --municipalidad-id <N>" \
    "--conjunto-id <CONJUNTO_ID> --archivo $ARCHIVO --sellar"
