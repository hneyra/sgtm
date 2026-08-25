#!/usr/bin/env bash
# Archiva en S3 un archivo fuente de un valor normativo (un gpkg de aranceles del MEF, un PDF
# de una resolucion, un plano), con el UBIGEO en la ruta para poder ubicarlo despues, y con
# historial: nunca sobrescribe una version anterior con el mismo nombre.
#
# Por que existe
# --------------
# docs/10-negocio/valores-normativos/aranceles-2026.md documenta la norma que aprueba un
# arancel, pero la norma en si -el gpkg, el PDF de El Peruano, el plano grafico- tambien tiene
# que sobrevivir mas alla del disco de quien la descargo. Archivarla es un acto separado de
# transcribirla o cargarla (ver importar_arancel_via_gpkg.py): este script solo se ocupa de
# que la fuente quede guardada, con su UBIGEO, para poder volver a ella.
#
# Convencion de la ruta
# ----------------------
#   s3://<bucket>/fuentes-normativas/<tipo>/<ubigeo>/<AAAA-MM-DDThh-mm-ssZ>__<archivo original>
#
# El sello de tiempo en el nombre -no versionado nativo de S3- es lo que da el historial: dos
# archivadas del mismo archivo (una correccion, una redescarga) quedan las dos, nunca una
# encima de la otra. Si el bucket tiene versionado de S3 activado, mejor: es una capa mas, no
# un reemplazo de esta convencion.
#
# No hace nada mas
# -----------------
# No inserta nada en la base, no genera CSV, no decide si el archivo esta verificado. Solo
# sube y verifica la subida. La URI que imprime al final es la que va en --s3-uri de
# importar_arancel_via_gpkg.py, para que documentoFuente apunte al original archivado y no a
# una ruta local que desaparece con la maquina de quien corrio el script.
#
# Uso
# ---
#   ./archivar_fuente_normativa.sh --bucket sgtm-fuentes-normativas --ubigeo 200105 \
#       --tipo aranceles FUENTE.gpkg
#
# El bucket tambien se puede fijar con SGTM_BUCKET_FUENTES_NORMATIVAS en vez de --bucket.
#
# Requiere: aws-cli configurado con credenciales que tengan s3:PutObject sobre ese bucket y
# prefijo (least-privilege: no hace falta nada mas amplio). No es este script el que decide
# ese permiso -eso es infraestructura, INF-06-, solo lo usa.

set -euo pipefail

uso() {
    cat <<'EOF'
Uso: archivar_fuente_normativa.sh --bucket BUCKET --ubigeo UBIGEO --tipo TIPO ARCHIVO

  --bucket BUCKET   Bucket S3 destino (o variable SGTM_BUCKET_FUENTES_NORMATIVAS)
  --ubigeo UBIGEO   Codigo UBIGEO de 6 digitos de la municipalidad
  --tipo TIPO       Categoria del documento: aranceles, valores-unitarios, depreciacion,
                     vehicular, u otra que agrupe documentos de la misma naturaleza
  ARCHIVO           Ruta local del archivo a archivar (gpkg, pdf, etc.)
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
clave="fuentes-normativas/${tipo}/${ubigeo}/${sello}__${nombre_original}"
uri="s3://${bucket}/${clave}"

sha256_local="$(sha256sum "$archivo" | cut -d' ' -f1)"

echo "Subiendo ${archivo} (sha256 ${sha256_local}) a ${uri} ..." >&2
aws s3 cp "$archivo" "$uri" \
    --metadata "sha256=${sha256_local},ubigeo=${ubigeo}" \
    --no-progress

# Verificar, no confiar: se vuelve a leer el objeto recien subido y se compara la huella.
# El mismo principio de "verificar antes de afirmar" que rige el resto del repositorio: un
# `aws s3 cp` que devuelve 0 confirma que el cliente termino de enviar, no que el objeto en
# S3 sea byte a byte el mismo archivo.
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
echo "Usar esta URI en --s3-uri de importar_arancel_via_gpkg.py para que documentoFuente" \
     "apunte a la fuente archivada."
