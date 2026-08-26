#!/usr/bin/env bash
# El veredicto de `capacidad.ts`, contrastado con el planificador de Kubernetes.
#
# `capacidad.ts` afirma algo sobre Kubernetes: que si la suma de las peticiones cabe en
# lo asignable, el planificador ubica los pods; y que si no cabe, los deja `Pending`.
# Una aritmetica que se equivoque **hacia arriba** —decir «cabe» cuando no— devuelve
# exactamente el fallo que ese modulo existe para impedir (issue #252: `pulumi up`
# esperando pods que nunca se ubicaran), y lo devuelve en silencio, porque la guarda
# estaria en verde. Por eso esto no se razona: se ejecuta.
#
# Dos casos, sobre un clúster desechable de `kind`:
#
#   A. Con lo asignable REAL del nodo, `capacidad.ts` dice «cabe» → el planificador
#      tiene que ubicar TODOS los pods del stack. Es la direccion peligrosa, la que
#      reintroduciria el colgado, y por eso es la que se comprueba con el stack entero.
#   B. Un pod que pide mas CPU de la que el nodo tiene se queda `Pending` con
#      «Insufficient cpu». Es el mecanismo que el caso A da por supuesto: sin
#      comprobarlo, el caso A podria estar pasando por cualquier otro motivo.
#
# Los pods no llegan a arrancar —no hay Secrets, ni imagenes que descargar— y da igual:
# lo que se comprueba es que el planificador les ASIGNA nodo, que es lo unico que
# `capacidad.ts` predice. Que despues arranquen es otra afirmacion, y vive en `motor`.
#
#   uso:  ./verificar-contra-el-planificador.sh
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA="${AQUI}/../.."
AMBIENTE="${AMBIENTE:-prod}"
NAMESPACE="sgtm-${AMBIENTE}"

command -v kubectl >/dev/null 2>&1 || { echo "Falta kubectl." >&2; exit 1; }

echo "── Lo que el nodo de kind reparte"
CPU="$(kubectl get nodes -o jsonpath='{.items[0].status.allocatable.cpu}')"
MEM="$(kubectl get nodes -o jsonpath='{.items[0].status.allocatable.memory}')"
echo "   ${CPU} CPU / ${MEM}"

echo
echo "── Caso A: el veredicto de capacidad.ts contra ESE nodo"
VEREDICTO="$(cd "$INFRA" && yarn --silent capacidad --ambiente "$AMBIENTE" --cpu "$CPU" --memoria "$MEM")"
echo "   veredicto: ${VEREDICTO}"

if [ "$VEREDICTO" != "cabe" ]; then
    echo "::error::El nodo de kind es demasiado pequeño para «${AMBIENTE}», asi que el caso A" \
         "no puede comprobar nada. Este trabajo necesita un runner con mas CPU, o un" \
         "ambiente mas pequeño. No se da por bueno en silencio."
    exit 1
fi

echo
echo "── Aplicando el stack de «${AMBIENTE}» (sin los recursos de Traefik: sus CRD no estan en kind)"
(cd "$INFRA" && yarn --silent manifiestos --ambiente "$AMBIENTE") \
    | node -e '
        const entrada = JSON.parse(require("fs").readFileSync(0, "utf8"));
        const deTraefik = ["IngressRoute", "Middleware", "TLSOption", "HelmChartConfig"];
        entrada.items = entrada.items.filter((i) => !deTraefik.includes(i.kind));
        process.stdout.write(JSON.stringify(entrada));
      ' \
    | kubectl apply --filename - >/dev/null

# Al planificador le sobra con unos segundos: no espera a que la imagen baje ni a que el
# contenedor arranque, solo decide el nodo. Lo que tarda es que los controladores creen
# los pods a partir de los Deployment y los Job.
echo "   esperando a que se creen los pods..."
for _ in $(seq 1 30); do
    CREADOS="$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')"
    [ "$CREADOS" -ge 9 ] && break
    sleep 2
done
sleep 5

echo
echo "── ¿Ubico el planificador todos los pods?"
kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || true

# Un pod ubicado tiene `spec.nodeName`. Es la senal exacta de lo que `capacidad.ts`
# predice, y no depende de que la imagen exista ni de que el contenedor arranque.
SIN_UBICAR="$(kubectl get pods -n "$NAMESPACE" \
    -o jsonpath='{range .items[?(@.spec.nodeName=="")]}{.metadata.name}{"\n"}{end}' \
    2>/dev/null | grep -c . || true)"

if [ "$SIN_UBICAR" != "0" ]; then
    echo
    echo "::error::capacidad.ts dijo «cabe» y el planificador dejo ${SIN_UBICAR} pod(s) sin" \
         "ubicar. La aritmetica del modulo es OPTIMISTA, que es justo la direccion en que" \
         "el error reintroduce el colgado del issue #252."
    kubectl get events -n "$NAMESPACE" --sort-by=.lastTimestamp | tail -30 || true
    exit 1
fi
echo "   Correcto: todos ubicados, como capacidad.ts predijo."

echo
echo "── Caso B: y un pod que NO cabe se queda Pending (el mecanismo que A da por supuesto)"
# Todo en milicores, que es la unica unidad en que la suma es trivial. Un core entero
# por encima de lo asignable: sobra para que no quepa ni con el nodo entero vacio.
case "$CPU" in
    *m) CPU_MILI="${CPU%m}" ;;
    *)  CPU_MILI=$(( CPU * 1000 )) ;;
esac
PIDE="$(( CPU_MILI + 1000 ))m"

kubectl apply --filename - >/dev/null <<POD
apiVersion: v1
kind: Pod
metadata:
  name: no-cabe-a-proposito
  namespace: ${NAMESPACE}
spec:
  containers:
    - name: imposible
      image: registry.k8s.io/pause:3.9
      resources:
        requests: { cpu: "${PIDE}", memory: "64Mi" }
        limits: { cpu: "${PIDE}", memory: "128Mi" }
POD

sleep 10
FASE="$(kubectl get pod no-cabe-a-proposito -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
MOTIVO="$(kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name=no-cabe-a-proposito \
    -o jsonpath='{range .items[*]}{.message}{"\n"}{end}' 2>/dev/null | grep -i "insufficient" || true)"

echo "   fase: ${FASE:-<sin fase>}"
echo "   motivo: ${MOTIVO:-<ninguno>}"

if [ "$FASE" != "Pending" ] || [ -z "$MOTIVO" ]; then
    echo "::error::Un pod que pide ${PIDE} sobre un nodo de ${CPU} tenia que quedarse Pending" \
         "por «Insufficient cpu», y no fue asi. El mecanismo que capacidad.ts modela no es" \
         "el que este clúster aplica, asi que el caso A no demuestra lo que dice demostrar."
    exit 1
fi

kubectl delete pod no-cabe-a-proposito -n "$NAMESPACE" --wait=false >/dev/null 2>&1 || true
echo "   Correcto: Pending por «Insufficient cpu». El mecanismo es el que se modela."

echo
echo "Los dos casos pasan: capacidad.ts predice lo que el planificador hace."
