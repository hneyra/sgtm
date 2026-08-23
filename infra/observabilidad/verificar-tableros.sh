#!/usr/bin/env bash
# «Los tableros muestran datos de verdad, no "No data"» (issue #156), comprobado
# consultando Prometheus con la MISMA expresion que cada panel del tablero — no
# abriendo Grafana y mirando, que no se automatiza.
#
# Extrae `targets[].expr` de `observabilidad/dashboards/resumen-operativo.json` y
# ejecuta cada una contra un Prometheus real. Si alguna devuelve una lista vacia,
# falla nombrando el panel: es la regresion de "No data" que este guion existe para
# atrapar antes que un funcionario mirando el tablero.
#
# Postgres, el nodo y los pods los sirven exportadores reales, desplegados de
# verdad. La aplicacion no —no hay imagen publicable desde aqui—, asi que sus dos
# paneles (JVM, peticiones HTTP) se comprueban contra un exportador SINTETICO que
# sirve exactamente los mismos nombres de metrica que Micrometer publicaria en
# `/actuator/prometheus`. Se dice aqui para que nadie lo lea como "la aplicacion
# real ya se probo".
#
#   uso: observabilidad/verificar-tableros.sh
set -euo pipefail

AQUI=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INFRA=$(cd "$AQUI/.." && pwd)
NS=sgtm-stg
cd "$INFRA"

command -v kubectl >/dev/null 2>&1 || { echo "FALLO: falta kubectl." >&2; exit 1; }

echo "· Aplicando el manifiesto de stg contra el clúster"
yarn --silent manifiestos --ambiente stg \
    | node -e '
        const entrada = JSON.parse(require("fs").readFileSync(0, "utf8"));
        const deTraefik = ["IngressRoute", "Middleware", "TLSOption", "HelmChartConfig"];
        entrada.items = entrada.items.filter((i) => !deTraefik.includes(i.kind));

        // Interfaz, aplicacion, Keycloak (identidad + el Job de realm) y los Job de
        // migracion/implantacion no le hacen falta a esta comprobacion -los dos
        // paneles de la aplicacion los sirve el exportador sintetico de mas abajo, y
        // ningun panel del tablero lee nada de Keycloak-, y el nodo UNICO de `kind`
        // no tiene CPU para desplegarlos a la vez que postgres y los cinco
        // componentes de observabilidad. Encontrado en CI dos veces seguidas: con el
        // manifiesto completo, el scheduler reportaba "Insufficient cpu" para varios
        // Pods, y bajo esa saturacion hasta Prometheus -que SI llegaba a Ready- dejaba
        // de contestar peticiones HTTP durante minutos. No es que Prometheus se haya
        // roto: es que compartir un runner de 2 vCPU con dos Keycloak reintentando su
        // arranque, dos replicas de interfaz reintentando una imagen que este
        // repositorio no publica, y el resto del padron completo no deja margen para
        // que nada responda a tiempo.
        const pesados = [
          { kind: "Deployment", prefijo: "sgtm-stg-interfaz" },
          { kind: "Service", prefijo: "sgtm-stg-interfaz" },
          { kind: "Deployment", prefijo: "sgtm-stg-identidad" },
          { kind: "Job", prefijo: "sgtm-stg-realm-" },
          { kind: "Job", prefijo: "sgtm-stg-migracion-" },
          { kind: "Job", prefijo: "sgtm-stg-implantacion-" },
          { kind: "Deployment", prefijo: "sgtm-stg-aplicacion" },
          { kind: "CronJob", prefijo: "sgtm-stg-lote" },
        ];
        entrada.items = entrada.items.filter((i) => {
          const nombre = i.metadata?.name ?? "";
          return !pesados.some((p) => i.kind === p.kind && nombre.startsWith(p.prefijo));
        });

        // Solo aqui, nunca en Observabilidad.ts: `node_exporter` excluye "overlay" de
        // sus metricas de filesystem por omision, y con motivo -en un VPS real la raiz
        // es ext4/xfs, y lo que aparece como "overlay" ahi es la capa escribible de
        // CADA contenedor, que no es "el disco del nodo"-. Un nodo de `kind` es EL AL
        // REVES: su propia raiz esta montada como overlay -es un contenedor de Docker
        // haciendo de nodo-, asi que con la exclusion de fabrica el panel de disco
        // nunca ve una sola serie aqui. Se desactiva la exclusion SOLO para esta
        // comprobacion.
        const nodeExporter = entrada.items.find(
          (i) => i.kind === "Deployment" && i.metadata.name.includes("node-exporter"),
        );
        const contenedor = nodeExporter?.spec.template.spec.containers.find(
          (c) => c.name === "node-exporter",
        );
        if (!contenedor) throw new Error("No hay Deployment de node-exporter en el manifiesto");
        contenedor.args.push("--collector.filesystem.fs-types-exclude=^$");

        process.stdout.write(JSON.stringify(entrada));
      ' \
    | kubectl apply -f - >/dev/null

echo "· Generando los secretos que faltan"
./secretos/bootstrap-secretos.sh --ambiente stg >/dev/null

# Ver el comentario equivalente en verificar-alertas.sh: el UNICO Secret que
# `bootstrap-secretos.sh` no genera (ADR-0011 §3) es el de las credenciales de
# almacenamiento de objetos, que normalmente materializa `pulumi up`. Sin el, el
# motor se queda en `CreateContainerConfigError` y esta espera nunca termina.
kubectl -n "$NS" create secret generic sgtm-stg-postgres-respaldo-credenciales \
    --from-literal=access-key-id=verificacion \
    --from-literal=secret-access-key=verificacion \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "· Esperando a que el motor, node-exporter, kube-state-metrics y Prometheus esten listos"
# 300s, no 180s: ver el comentario equivalente en verificar-alertas.sh — un
# clúster `kind` recien creado descarga TODAS estas imagenes de red a la vez, y
# el propio `startupProbe` del motor ya da hasta cinco minutos.
for despliegue in postgres observabilidad-node-exporter observabilidad-kube-state-metrics observabilidad-prometheus; do
    if ! kubectl -n "$NS" rollout status "deployment/sgtm-stg-$despliegue" --timeout=300s; then
        echo "::group::Diagnostico de sgtm-stg-$despliegue"
        kubectl -n "$NS" get pods -o wide
        kubectl -n "$NS" describe "deployment/sgtm-stg-$despliegue"
        kubectl -n "$NS" describe pods -l "app=sgtm-stg-$despliegue"
        kubectl -n "$NS" logs "deployment/sgtm-stg-$despliegue" --all-containers --prefix --tail=200 || true
        kubectl -n "$NS" get events --sort-by=.lastTimestamp
        echo "::endgroup::"
        exit 1
    fi
done

echo "· Desplegando el exportador sintetico de la aplicacion (ver el docstring de este guion)"
cat <<'YAML' | kubectl apply -n "$NS" -f - >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aplicacion-sintetica
spec:
  replicas: 1
  selector: { matchLabels: { app: aplicacion-sintetica } }
  template:
    metadata: { labels: { app: aplicacion-sintetica } }
    spec:
      containers:
        - name: exportador
          image: python:3.12-alpine
          command:
            - python3
            - -c
            - |
              import http.server
              CUERPO = (
                  '# TYPE jvm_memory_used_bytes gauge\n'
                  'jvm_memory_used_bytes{application="sgtm",area="heap"} 123456789\n'
                  '# TYPE http_server_requests_seconds_count counter\n'
                  'http_server_requests_seconds_count{application="sgtm",uri="/api/v1/predios"} 42\n'
              )
              class H(http.server.BaseHTTPRequestHandler):
                  def do_GET(self):
                      self.send_response(200)
                      self.send_header('Content-Type', 'text/plain')
                      self.end_headers()
                      self.wfile.write(CUERPO.encode())
                  def log_message(self, *a): pass
              http.server.HTTPServer(('0.0.0.0', 8080), H).serve_forever()
          ports: [{ containerPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata:
  name: aplicacion-sintetica
spec:
  selector: { app: aplicacion-sintetica }
  ports: [{ port: 8080, targetPort: 8080 }]
YAML
kubectl -n "$NS" rollout status deployment/aplicacion-sintetica --timeout=60s

# Prometheus escuchaba a `sgtm-stg-aplicacion` -que no existe en este clúster de
# prueba, nunca contesta y su ausencia no se puede distinguir de un fallo real-. Se
# repunta el job `aplicacion` al exportador sintetico, solo para esta comprobacion.
echo "· Repuntando el scrape de «aplicacion» al exportador sintetico"
kubectl -n "$NS" get configmap sgtm-stg-observabilidad-prometheus -o json \
    | node -e '
        const cm = JSON.parse(require("fs").readFileSync(0, "utf8"));
        cm.data["prometheus.yml"] = cm.data["prometheus.yml"].replace(
          /targets: \["sgtm-stg-aplicacion:8080"\]/,
          "targets: [\"aplicacion-sintetica:8080\"]",
        );
        process.stdout.write(JSON.stringify(cm));
      ' \
    | kubectl apply -f - >/dev/null

# `POST /-/reload`, no `kubectl rollout restart`: releer la configuracion sin
# recrear el Pod. Encontrado en CI, en CUATRO corridas seguidas: justo despues
# de un `rollout restart`, la primera consulta a Prometheus fallaba conectando
# -con Prometheus ya sirviendo peticiones segun su propio log, y el Pod en
# Ready segun el API server-. No era Prometheus: era la recreacion misma, que
# cambia la direccion que el Service enruta. `/-/reload` es el MISMO proceso,
# el MISMO Pod, la MISMA entrada del Service -solo relee su archivo-.
echo "· Recargando la configuracion de Prometheus (POST /-/reload, sin recrear el Pod)"
# Reintenta la CONEXION, no el resultado -el mismo patron que las consultas de panel de
# mas abajo-, pero con una ventana bastante mas ancha: 3 intentos (~36s) NO bastaban,
# encontrado en CI -cada uno de los tres agotaba el `timeout=10` completo, nunca fallaba
# rapido-, y el sospechoso concreto es `kube-proxy` en modo iptables, cuyo periodo de
# sincronizacion por omision es ~30s: el Service de Prometheus se acaba de crear en este
# mismo guion, y hasta el proximo ciclo de sync las reglas DNAT para alcanzarlo desde
# OTRO pod -aplicacion-sintetica, el que hace el exec, tambien recien desplegado- pueden
# no estar programadas todavia. 8 intentos (~101s) le da margen a un ciclo de 30s con
# holgura de sobra, en vez de quedarse justo al borde como el intento anterior.
LOGRADO=no
for intento in $(seq 1 8); do
    if kubectl -n "$NS" exec deployment/aplicacion-sintetica -- python3 -c "
import urllib.request
urllib.request.urlopen(
    urllib.request.Request('http://sgtm-stg-observabilidad-prometheus:9090/-/reload', method='POST'),
    timeout=10,
)
" 2>/dev/null; then
        LOGRADO=si
        break
    fi
    [ "$intento" -lt 8 ] && sleep 3
done
if [ "$LOGRADO" != "si" ]; then
    echo "FALLO: /-/reload no respondio en 8 intentos (~101s)." >&2
    exit 1
fi

echo "· Desplegando el cliente de comprobacion"
cat <<'YAML' | kubectl apply -n "$NS" -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: verificador-de-tableros
spec:
  restartPolicy: Never
  containers:
    - name: verificador
      image: python:3.12-alpine
      command: ["sleep", "600"]
YAML
kubectl -n "$NS" wait --for=condition=Ready pod/verificador-de-tableros --timeout=60s

echo "· Esperando el primer scrape de todos los objetivos (dos ciclos de 30s)"
sleep 65

echo
echo "· Cada panel del tablero, consultado contra Prometheus"

# `targets[].expr` de cada panel que no es una fila (`type: row`).
consultas=$(node -e '
  const t = JSON.parse(require("fs").readFileSync("observabilidad/dashboards/resumen-operativo.json", "utf8"));
  for (const p of t.panels) {
    if (p.type === "row") continue;
    for (const objetivo of p.targets ?? []) {
      process.stdout.write(JSON.stringify({ panel: p.title, expr: objetivo.expr }) + "\n");
    }
  }
')

FALLARON=0
while IFS= read -r linea; do
    [ -n "$linea" ] || continue
    panel=$(echo "$linea" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).panel)')
    expr=$(echo "$linea" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).expr)')

    # Reintenta la CONSULTA, no el resultado: un "0 series" es un dato real -el
    # panel esta de verdad sin datos-, y no hay que reintentar eso. Lo que si se
    # reintenta es la conexion en si -sin `timeout=`, `urlopen` puede colgarse
    # hasta el reintento de SYN del kernel (~127s) antes de fallar, encontrado en
    # CI dos veces seguidas: un runner con el manifiesto entero desplegado (motor,
    # observabilidad, los pods sinteticos de este guion) tiene mas contienda de CPU
    # y red de la que este guion tenia cuando se escribio, y una sola consulta entre
    # catorce colgandose 2 minutos es mas plausible que nunca antes de #157.
    LOGRADO=no
    for intento in 1 2 3; do
        if resultado=$(kubectl -n "$NS" exec verificador-de-tableros -- python3 -c "
import json, urllib.parse, urllib.request
q = urllib.parse.quote('''$expr''')
r = urllib.request.urlopen(f'http://sgtm-stg-observabilidad-prometheus:9090/api/v1/query?query={q}', timeout=10)
d = json.load(r)
print(len(d['data']['result']))
" 2>/dev/null); then
            LOGRADO=si
            break
        fi
        [ "$intento" -lt 3 ] && sleep 3
    done
    if [ "$LOGRADO" != "si" ]; then
        echo "  ✗ «$panel»: la consulta a Prometheus no respondio en 3 intentos — $expr" >&2
        echo >&2
        echo "Esto no es un panel sin datos: es que Prometheus mismo dejo de contestar." >&2
        echo "Diagnostico ahora, en vez de gastar minutos repitiendo el mismo fallo en cada" >&2
        echo "panel que queda -encontrado en CI: los doce fallaban identicos, uno por uno-." >&2
        echo "::group::Diagnostico: sgtm-stg-observabilidad-prometheus" >&2
        kubectl -n "$NS" get pods -o wide >&2
        kubectl -n "$NS" describe deployment/sgtm-stg-observabilidad-prometheus >&2
        kubectl -n "$NS" describe pods -l app=sgtm-stg-observabilidad-prometheus >&2
        kubectl -n "$NS" logs deployment/sgtm-stg-observabilidad-prometheus --all-containers --prefix --tail=200 >&2 || true
        kubectl -n "$NS" logs deployment/sgtm-stg-observabilidad-prometheus --all-containers --prefix --tail=200 --previous >&2 || true
        kubectl -n "$NS" get events --sort-by=.lastTimestamp >&2
        echo "::endgroup::" >&2
        exit 1
    fi

    if [ "$resultado" = "0" ]; then
        echo "  ✗ «$panel»: SIN DATOS — $expr"
        FALLARON=$((FALLARON + 1))
    else
        echo "  ✓ «$panel»: $resultado serie(s)"
    fi
done <<< "$consultas"

if [ "$FALLARON" -gt 0 ]; then
    echo
    echo "FALLO: $FALLARON panel(es) sin datos. Es la regresion de \"No data\" que esta" >&2
    echo "comprobacion existe para atrapar." >&2
    exit 1
fi

echo
echo "Los paneles del tablero muestran datos de verdad."
