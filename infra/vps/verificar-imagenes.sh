#!/usr/bin/env bash
# ¿Se pueden descargar de verdad las imagenes que este stack va a desplegar?
#
# Reproduce **la misma peticion que hace el kubelet**, con las mismas credenciales, y
# antes de `pulumi up`. Es la comprobacion que faltaba el 2026-08-26 (issue #252): el
# primer despliegue completo de `prod` se quedo con `sgtm-interfaz` en
# `ImagePullBackOff` y este error, que dice exactamente lo que pasa y aun asi es facil
# de leer por encima:
#
#   failed to authorize: failed to fetch anonymous token: unexpected status from GET
#   request to https://ghcr.io/token?scope=repository%3Ahneyra%2Fsgtm-interfaz%3Apull
#   ...: 401 Unauthorized
#
# «anonymous token» es la pista: el kubelet no tenia credencial que ofrecer. Los
# paquetes de GHCR son **privados por omision** y `publicar-imagenes.yml` no cambia su
# visibilidad, asi que sin `imagePullSecrets` ningun pod propio arranca. Y no se cura
# solo: no es una carrera ni una espera, es un no rotundo que se repite con backoff.
#
# Por que aqui y no solo en la auditoria: `auditoria.ts` comprueba que el manifiesto
# DECLARE la credencial, que es otra afirmacion. Un token caducado, un paquete que
# alguien volvio privado o un usuario mal escrito pasan la auditoria y fallan igual en
# el despliegue. Esto lo pregunta al registro.
#
# Credenciales: `SGTM_REGISTRO_USUARIO` y `SGTM_REGISTRO_TOKEN`. Sin ellas pregunta de
# forma anonima —que es justo lo que hace el kubelet sin `imagePullSecrets`—, asi que
# correrlo sin credenciales responde la pregunta «¿son publicos estos paquetes?».
#
#   uso:  ./verificar-imagenes.sh --ambiente prod
set -euo pipefail

AMBIENTE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --ambiente) AMBIENTE="${2:-}"; shift 2 ;;
        *) echo "Opcion desconocida: $1" >&2; exit 2 ;;
    esac
done

if [ "$AMBIENTE" != "stg" ] && [ "$AMBIENTE" != "prod" ]; then
    echo "uso: $0 --ambiente <stg|prod>" >&2
    exit 2
fi

command -v curl >/dev/null 2>&1 || { echo "Falta curl." >&2; exit 1; }

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA="${AQUI}/.."

USUARIO="${SGTM_REGISTRO_USUARIO:-}"
TOKEN="${SGTM_REGISTRO_TOKEN:-}"

if [ -n "$TOKEN" ]; then
    echo "Con credencial del registro (usuario «${USUARIO}»)."
else
    echo "⚠ SIN credencial: se pregunta igual que un kubelet sin \`imagePullSecrets\`."
fi

# Las imagenes que el stack desplegaria, sin repetir. Se leen del manifiesto y no de
# una lista escrita a mano: una imagen nueva entra en la comprobacion sola.
IMAGENES="$(cd "$INFRA" && yarn --silent manifiestos --ambiente "$AMBIENTE" | node -e '
    const entrada = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const pods = (o) =>
        o.kind === "CronJob"
            ? [o.spec.jobTemplate.spec.template.spec]
            : o.spec?.template?.spec
              ? [o.spec.template.spec]
              : [];
    const vistas = new Set();
    for (const o of entrada.items)
        for (const s of pods(o))
            for (const c of [...(s.initContainers ?? []), ...s.containers]) vistas.add(c.image);
    process.stdout.write([...vistas].sort().join("\n"));
')"

FALLOS=0
COMPROBADAS=0

for imagen in $IMAGENES; do
    # Solo el registro propio: las imagenes de Docker Hub, quay y registry.k8s.io son
    # publicas y comprobarlas seria pedirle a este guion que vigile a terceros.
    case "$imagen" in
        ghcr.io/*) ;;
        *) continue ;;
    esac

    sin_registro="${imagen#ghcr.io/}"
    repositorio="${sin_registro%%:*}"
    etiqueta="${sin_registro##*:}"
    COMPROBADAS=$(( COMPROBADAS + 1 ))

    # Paso 1: el token de descarga. Es literalmente la URL que aparece en el error del
    # kubelet, y el sitio donde el 401 se produce cuando no hay credencial.
    if [ -n "$TOKEN" ]; then
        respuesta="$(curl --silent --user "${USUARIO}:${TOKEN}" \
            "https://ghcr.io/token?scope=repository%3A${repositorio//\//%2F}%3Apull&service=ghcr.io" || true)"
    else
        respuesta="$(curl --silent \
            "https://ghcr.io/token?scope=repository%3A${repositorio//\//%2F}%3Apull&service=ghcr.io" || true)"
    fi

    portador="$(printf '%s' "$respuesta" | node -e '
        let e = ""; process.stdin.on("data", (d) => (e += d)).on("end", () => {
            try { process.stdout.write(JSON.parse(e).token ?? ""); } catch { process.stdout.write(""); }
        });
    ' || true)"

    if [ -z "$portador" ]; then
        echo "::error::«${imagen}»: el registro no emitio token de descarga. Es el mismo 401" \
             "que deja los pods en ImagePullBackOff. Si el paquete es privado, hace falta" \
             "\`registryToken\` en el stack (issue #252); si tenia que ser publico, revisar su" \
             "visibilidad en GitHub -> Packages."
        FALLOS=$(( FALLOS + 1 ))
        continue
    fi

    # Paso 2: que la etiqueta exista. Un token valido sobre una etiqueta que nadie
    # publico da 404, y en el despliegue se ve igual de mal.
    codigo="$(curl --silent --output /dev/null --write-out '%{http_code}' \
        --header "Authorization: Bearer ${portador}" \
        --header 'Accept: application/vnd.oci.image.index.v1+json' \
        --header 'Accept: application/vnd.docker.distribution.manifest.list.v2+json' \
        --header 'Accept: application/vnd.docker.distribution.manifest.v2+json' \
        "https://ghcr.io/v2/${repositorio}/manifests/${etiqueta}" || true)"

    case "$codigo" in
        200)
            echo "  ok    ${imagen}"
            ;;
        404)
            echo "::error::«${imagen}»: el registro responde 404. La etiqueta no existe —¿publico" \
                 "\`publicar-imagenes.yml\` este commit?—. Con esto, el pod no arranca."
            FALLOS=$(( FALLOS + 1 ))
            ;;
        *)
            echo "::error::«${imagen}»: el registro respondio ${codigo} al pedir el manifiesto."
            FALLOS=$(( FALLOS + 1 ))
            ;;
    esac
done

# Que se haya comprobado ALGO. Si un cambio de nombres dejara la lista vacia, este
# guion pasaria en verde sin haber preguntado nada -y eso es lo que no puede pasar.
if [ "$COMPROBADAS" = "0" ]; then
    echo "::error::No se comprobo ninguna imagen propia. El stack de «${AMBIENTE}» tendria que" \
         "desplegar al menos las tres de ghcr.io; revisar \`applicationImageRepository\`."
    exit 1
fi

[ "$FALLOS" = "0" ] || exit 1
echo "Correcto: las ${COMPROBADAS} imagenes propias se pueden descargar con lo que hay."
