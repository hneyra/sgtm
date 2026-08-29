#!/usr/bin/env bash
# Archiva en S3 un ARCHIVO DE FILAS derivado -un CSV mecanico, no el PDF de la norma- que no cabe
# en un ConfigMap de Kubernetes (issue #388), con historial: nunca sobrescribe una version anterior
# con el mismo nombre.
#
# Por que existe
# --------------
# infra/carga-de-datos/publicar-cuadros.sh monta el manifiesto de un cuadro normativo y, con el, el
# archivo de filas que declara (docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv,
# columna `archivo_de_filas`). Un ConfigMap admite hasta ~1 MiB por objeto de etcd, y el anexo
# vehicular del ejercicio 2026 pesa 1,5 MB: no cabe. Este guion sube ESE archivo de filas -no el
# PDF que lo origina, que ya archiva scripts/valores-normativos/archivar_fuente_normativa.sh- a S3,
# para que un initContainer lo descargue y verifique su sha256 antes de que el Job publique una
# sola fila.
#
# Es el hermano de archivar_fuente_normativa.sh, con la MISMA disciplina de subir-y-releer para
# verificar, la misma convencion de sello de tiempo en el nombre, y un prefijo distinto:
#
#   fuentes           archivar_fuente_normativa.sh   El PDF/gpkg original de la norma
#   derivados-normativos  archivar_derivado.sh           El CSV mecanico extraido de ese original
#
# Convencion de la ruta
# ----------------------
#   s3://<bucket>/derivados-normativos/<tipo>/<ubigeo>/<AAAA-MM-DDThh-mm-ssZ>__<archivo original>
#
# No hace nada mas
# -----------------
# No toca el manifiesto en git, no decide que fila lo referencia. La URI que imprime al final es
# la que hay que agregar, junto al MISMO sha256 que el manifiesto ya declara para ese archivo, a
# docs/10-negocio/valores-normativos/fuentes/derivados-en-s3.csv -el registro que
# publicar-cuadros.sh consulta-. El manifiesto no se reescribe: su columna `archivo_de_filas` sigue
# siendo la ruta relativa de siempre, y el sha256 es la clave que une las dos filas.
#
# Uso
# ---
#   ./archivar_derivado.sh --bucket sgtm-fuentes-normativas --ubigeo 200105 \
#       --tipo vehicular fuentes/tvr-2026/tvr-2026.csv
#
# El bucket tambien se puede fijar con SGTM_BUCKET_FUENTES_NORMATIVAS en vez de --bucket.
#
# Requiere: aws-cli configurado con credenciales que tengan s3:PutObject sobre ese bucket y
# prefijo (least-privilege: no hace falta nada mas amplio). No es este script el que decide
# ese permiso -eso es infraestructura, INF-06-, solo lo usa.

set -euo pipefail

uso() {
    cat <<'EOF'
Uso: archivar_derivado.sh --bucket BUCKET --ubigeo UBIGEO --tipo TIPO ARCHIVO

  --bucket BUCKET   Bucket S3 destino (o variable SGTM_BUCKET_FUENTES_NORMATIVAS)
  --ubigeo UBIGEO   Codigo UBIGEO de 6 digitos de la municipalidad
  --tipo TIPO       Categoria del cuadro: vehicular, aranceles, valores-unitarios,
                     depreciacion, u otra que agrupe archivos de filas de la misma naturaleza
  ARCHIVO           Ruta local del archivo de filas a archivar (el CSV, no el PDF de origen)
EOF
}

bucket="${SGTM_BUCKET_FUENTES_NORMATIVAS:-}"
ubigeo=""
tipo=""
archivo=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bucket) bucket="$2"; shift 2 ;;
        --ubigeo) ubigeo="$2"; shift 2 ;;
        --tipo) tipo="$2"; shift 2 ;;
        -h|--help) uso; exit 0 ;;
        -*) echo "Opcion desconocida: $1" >&2; uso >&2; exit 2 ;;
        *) archivo="$1"; shift ;;
    esac
done

if [[ -z "$bucket" || -z "$ubigeo" || -z "$tipo" || -z "$archivo" ]]; then
    echo "Faltan argumentos obligatorios." >&2
    uso >&2
    exit 2
fi
if [[ ! "$ubigeo" =~ ^[0-9]{6}$ ]]; then
    echo "UBIGEO invalido: '$ubigeo' (van 6 digitos)" >&2
    exit 2
fi
if [[ ! -f "$archivo" ]]; then
    echo "No existe el archivo: $archivo" >&2
    exit 2
fi
if ! command -v aws >/dev/null 2>&1; then
    echo "aws-cli no esta instalado en esta maquina." >&2
    exit 2
fi

sello="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
nombre_original="$(basename "$archivo")"
clave="derivados-normativos/${tipo}/${ubigeo}/${sello}__${nombre_original}"
uri="s3://${bucket}/${clave}"

sha256_local="$(sha256sum "$archivo" | cut -d' ' -f1)"

echo "Subiendo ${archivo} (sha256 ${sha256_local}) a ${uri} ..." >&2
aws s3 cp "$archivo" "$uri" \
    --metadata "sha256=${sha256_local},ubigeo=${ubigeo}" \
    --no-progress

# Verificar, no confiar: se vuelve a leer el objeto recien subido y se compara la huella. El mismo
# principio que archivar_fuente_normativa.sh: un `aws s3 cp` que devuelve 0 confirma que el
# cliente termino de enviar, no que el objeto en S3 sea byte a byte el mismo archivo -y esta huella
# es exactamente la que publicar-cuadros.sh va a exigirle al initContainer que descargue esto.
verificacion="$(mktemp)"
trap 'rm -f "$verificacion"' EXIT
aws s3 cp "$uri" "$verificacion" --no-progress >/dev/null
sha256_remoto="$(sha256sum "$verificacion" | cut -d' ' -f1)"

if [[ "$sha256_local" != "$sha256_remoto" ]]; then
    echo "ERROR: la huella del objeto subido (${sha256_remoto}) no coincide con la del" \
         "archivo local (${sha256_local}). No confiar en ${uri}." >&2
    exit 1
fi

echo "Archivado y verificado: ${uri}"
echo "sha256: ${sha256_local}"
echo
echo "Agregar, en docs/10-negocio/valores-normativos/fuentes/derivados-en-s3.csv, la fila:"
echo "  ${sha256_local},${uri}"
echo
echo "El sha256 tiene que ser EL MISMO que ya declara, para este archivo, la fila del manifiesto" \
     "(docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv, columna sha256): es la" \
     "clave que une las dos filas. El manifiesto no se toca."
