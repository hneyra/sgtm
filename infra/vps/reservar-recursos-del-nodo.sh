#!/usr/bin/env bash
# La reserva de CPU y memoria del nodo para kubelet, containerd y el sistema
# operativo (`INF-01` §2 y §4, issue #157): ~1 CPU y ~1 GB, los mismos numeros que
# ya declara la tabla de dimensionamiento. Sin esta reserva, una rafaga de la
# aplicacion puede dejar sin CPU al kubelet, y las sondas de TODO el nodo empiezan
# a expirar a la vez -el incidente que `../iaac` ya tuvo sobre esta misma
# combinacion (k3s, un solo nodo, PostgreSQL en un volumen `ReadWriteOnce`)-.
#
# ⚠ ESTO REINICIA k3s. El API server queda inalcanzable unos segundos, y cualquier
# `pulumi up`/`pulumi preview` en marcha en ese instante falla a mitad de camino
# -no porque este guion haga algo mal, sino porque el proveedor de Pulumi habla
# contra ese mismo servidor de API-. Va en su PROPIA ventana de mantenimiento,
# nunca junto a otro cambio: `INF-01` §4 lo dice sin rodeos, y este guion lo repite
# antes de tocar nada porque es el tipo de aviso que se salta la segunda vez que
# se corre un guion, no la primera.
#
# Los pods existentes no se recrean: kubelet vuelve a arrancar con la MISMA
# configuracion de los pods que ya tenia asignados, y la reserva nueva solo
# afecta a lo que el planificador admite DESDE AHORA. «El clúster vuelve solo»
# (issue #157) es literal: este guion espera esa recuperacion y la comprueba,
# no la fuerza.
#
#   uso, en el VPS y como root:  ./reservar-recursos-del-nodo.sh
set -euo pipefail

if [ "$(id -u)" != "0" ]; then
    echo "Esto reinicia k3s: hay que correrlo como root." >&2
    exit 1
fi

command -v kubectl >/dev/null 2>&1 || { echo "Falta kubectl." >&2; exit 1; }
command -v systemctl >/dev/null 2>&1 || { echo "Falta systemctl -esto asume k3s como servicio de systemd." >&2; exit 1; }

CONFIG=/etc/rancher/k3s/config.yaml
CPU_RESERVADA=1
MEMORIA_RESERVADA=1Gi

cat <<AVISO
⚠  Esto va a reiniciar k3s. El API server queda inalcanzable unos segundos.

   Si hay un "pulumi up" o "pulumi preview" en marcha en cualquier terminal ahora
   mismo, DETENGALO antes de continuar -va a fallar a mitad de camino, y un
   fallo a mitad de un "pulumi up" es el tipo de estado a medias del que cuesta
   recuperarse-. Esta es su propia ventana de mantenimiento (INF-01 §4).

AVISO
read -r -p "Escriba «entiendo» para continuar: " respuesta
[ "$respuesta" = "entiendo" ] || { echo "Cancelado: no se toco nada." >&2; exit 1; }

if [ -f "$CONFIG" ] && grep -q '^kubelet-arg:' "$CONFIG"; then
    echo >&2
    echo "FALLO: $CONFIG ya define \`kubelet-arg\`. Este guion no fusiona listas YAML" >&2
    echo "-dos claves \`kubelet-arg:\` en el mismo archivo son un YAML invalido, y adivinar" >&2
    echo "como fusionarlas es exactamente el tipo de automatismo que corrompe una" >&2
    echo "configuracion de la que solo hay una copia. Añada a mano estas dos lineas a la" >&2
    echo "lista \`kubelet-arg\` que ya existe en $CONFIG:" >&2
    echo >&2
    echo "  - \"system-reserved=cpu=$CPU_RESERVADA,memory=$MEMORIA_RESERVADA\"" >&2
    echo "  - \"kube-reserved=cpu=$CPU_RESERVADA,memory=$MEMORIA_RESERVADA\"" >&2
    exit 1
fi

echo "· Escribiendo la reserva en $CONFIG"
mkdir -p "$(dirname "$CONFIG")"
cat >> "$CONFIG" <<YAML

# Reserva del nodo para kubelet, containerd y el sistema operativo (INF-01 §2 y
# §4, issue #157). Escrito por infra/vps/reservar-recursos-del-nodo.sh -no a
# mano-, para que quede claro de donde salio si alguien lo encuentra despues.
kubelet-arg:
  - "system-reserved=cpu=$CPU_RESERVADA,memory=$MEMORIA_RESERVADA"
  - "kube-reserved=cpu=$CPU_RESERVADA,memory=$MEMORIA_RESERVADA"
YAML

echo "· Reiniciando k3s"
systemctl restart k3s

echo "· Esperando a que el API server responda de nuevo"
LOGRADO=no
for _ in $(seq 1 30); do
    if kubectl get --raw='/readyz' >/dev/null 2>&1; then
        LOGRADO=si
        break
    fi
    sleep 2
done
if [ "$LOGRADO" != "si" ]; then
    echo "FALLO: el API server no volvio a responder en 60s tras el reinicio." >&2
    echo "systemctl status k3s / journalctl -u k3s -n 200 tienen la razon real." >&2
    exit 1
fi
echo "  El API server responde."

echo "· Esperando a que el nodo vuelva a Ready"
if ! kubectl wait --for=condition=Ready node --all --timeout=120s; then
    echo "FALLO: el nodo no volvio a Ready en 120s." >&2
    kubectl describe node
    exit 1
fi

echo "· Comprobando que kubelet aplico la reserva -lo asignable bajo, la capacidad no-"
kubectl get node -o custom-columns='NODO:.metadata.name,CPU_CAPACIDAD:.status.capacity.cpu,CPU_ASIGNABLE:.status.allocatable.cpu,MEM_CAPACIDAD:.status.capacity.memory,MEM_ASIGNABLE:.status.allocatable.memory'

echo "· Confirmando que los pods existentes siguen en pie -el clúster «vuelve solo»-"
if ! kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded --no-headers | grep -q .; then
    echo "  Ningun pod fuera de Running/Succeeded: el reinicio no se llevo nada por delante."
else
    echo "FALLO: hay pods que no volvieron a Running tras el reinicio de k3s:" >&2
    kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
    exit 1
fi

cat <<AVISO

Listo. Anote esta ejecucion en el runbook de mantenimiento
(docs/80-infraestructura/mantenimiento-del-nodo.md): fecha, quien la corrio, y
si el clúster volvio solo o hizo falta intervenir -es exactamente lo que el
criterio de aceptacion del issue #157 pide poder responder despues.
AVISO
