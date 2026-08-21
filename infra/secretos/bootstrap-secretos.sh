#!/usr/bin/env bash
# Genera los secretos de la aplicacion que falten, sin que nadie teclee una clave
# (issue #154).
#
# Por cada `Secret` del inventario (`yarn secretos`): lee lo que ya existe en el
# cluster, le pasa eso y la lista de claves requeridas a `completar-secreto.ts` —que
# decide que falta y genera SOLO eso, sin decodificar ni tocar lo que ya estaba—, y
# aplica el resultado. Ejecutarlo dos veces seguidas la segunda vez no cambia nada:
# todo lo que faltaba en la primera ya existe.
#
# **Esto NO es pulumi up.** No pasa por el proveedor de Kubernetes de Pulumi ni por su
# estado: habla con el API por `kubectl`, con el mismo kubeconfig que usa `pulumi up`
# —el del tunel SSH en CI (INF-01 §1.4)—. Es ADR-0011 §3 y INF-06 a la letra: un
# secreto generado por Pulumi vive en el estado de Pulumi, y esa clave abre el padron
# de todas las municipalidades. Este guion no tiene estado ninguno: lo unico que
# persiste es el propio Secret de Kubernetes, y lo que se imprime aqui son huellas, no
# valores.
#
# Corre ANTES de `pulumi up`: los Deployment y Job que Pulumi va a crear referencian
# estos Secret por nombre, y sin ellos los pods se quedan en `Pending`.
#
#   uso: secretos/bootstrap-secretos.sh --ambiente stg|prod [--namespace sgtm-stg]
set -euo pipefail

AMBIENTE=""
NAMESPACE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --ambiente) AMBIENTE=${2:?falta el valor de --ambiente}; shift 2 ;;
        --namespace) NAMESPACE=${2:?falta el valor de --namespace}; shift 2 ;;
        *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
    esac
done
[ -n "$AMBIENTE" ] || { echo "Falta --ambiente (stg o prod)." >&2; exit 2; }
NAMESPACE=${NAMESPACE:-sgtm-$AMBIENTE}

AQUI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INFRA=$(cd "$AQUI/.." && pwd)

command -v kubectl >/dev/null 2>&1 || { echo "Falta kubectl." >&2; exit 1; }

# El namespace es el que declara componentes/index.ts, pero este guion corre ANTES de
# `pulumi up`: si todavia no existe, `kubectl create secret` fallaria con un mensaje
# que no dice por que. Idempotente: `pulumi up` despues reclama el mismo objeto sin
# conflicto, porque los campos que declara ya coinciden.
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "Completando los secretos de «$NAMESPACE»..."
cd "$INFRA"

inventario=$(yarn --silent secretos --ambiente "$AMBIENTE")
nombres=$(echo "$inventario" | node -e '
  const datos = JSON.parse(require("fs").readFileSync(0, "utf8"));
  process.stdout.write([...new Set(datos.map((e) => e.secreto))].join("\n"));
')

while IFS= read -r nombre; do
    [ -n "$nombre" ] || continue

    claves=$(echo "$inventario" | SECRETO="$nombre" node -e '
      const datos = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const claves = datos.filter((e) => e.secreto === process.env.SECRETO).map((e) => e.clave);
      process.stdout.write(claves.join(" "));
    ')

    # Vacio si el Secret todavia no existe: es el caso normal del primer despliegue.
    existente=$(kubectl -n "$NAMESPACE" get secret "$nombre" -o json 2>/dev/null || echo "")

    salida=$(mktemp)
    # shellcheck disable=SC2086
    printf '%s' "$existente" \
        | yarn --silent vite-node herramientas/completar-secreto-cli.ts "$nombre" "$NAMESPACE" $claves \
        > "$salida"

    kubectl apply -f "$salida" >/dev/null
    rm -f "$salida"
done <<< "$nombres"

echo "Listo. Ningun valor se imprimio en esta salida — solo huellas de lo que se generó."
