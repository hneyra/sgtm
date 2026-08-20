#!/bin/bash
# Crea un usuario en el realm sgtm, con su municipalidad.
#
# Vive aqui y no dentro del realm versionado por una razon que conviene no
# discutir cada vez: un realm que trae usuarios con contrasena es la forma mas
# comoda de que esa contrasena acabe en produccion. El realm fija la estructura
# —clientes, PKCE, el mapeador del claim— y las personas las crea quien
# provisiona, con las claves de su gestor de secretos.
#
#   ./crear-usuario.sh <usuario> <clave> [municipalidad_id]
#
# El tercer argumento es el atributo del que sale el claim `municipalidad_id`
# (ADR-0005). Omitirlo crea un usuario SIN municipalidad, que es util para una
# sola cosa: comprobar que un token sin el claim recibe 403 y no llega a ningun
# controlador. No sirve para trabajar.
#
# Idempotente: si el usuario existe, le actualiza clave y atributo.
set -euo pipefail

usuario="${1:?uso: crear-usuario.sh <usuario> <clave> [municipalidad_id]}"
clave="${2:?falta la clave}"
municipalidad="${3:-}"

: "${SGTM_KEYCLOAK_ADMIN:=admin}"
: "${SGTM_CLAVE_KEYCLOAK:?falta SGTM_CLAVE_KEYCLOAK}"
: "${SGTM_KEYCLOAK_URL:=http://localhost:8180}"
: "${SGTM_KEYCLOAK_SERVICIO:=identidad}"

# kcadm corre DENTRO del contenedor de Keycloak: es donde esta la herramienta, y
# asi la clave de administracion no sale a la linea de comandos del anfitrion.
kc() {
  docker compose exec -T "$SGTM_KEYCLOAK_SERVICIO" /opt/keycloak/bin/kcadm.sh "$@"
}

kc config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user "$SGTM_KEYCLOAK_ADMIN" \
  --password "$SGTM_CLAVE_KEYCLOAK" >/dev/null

existente=$(kc get users -r sgtm -q "username=$usuario" --fields id --format csv --noquotes | tr -d '\r' | head -1)

if [ -z "$existente" ]; then
  if [ -n "$municipalidad" ]; then
    kc create users -r sgtm \
      -s "username=$usuario" -s enabled=true \
      -s "attributes.municipalidad_id=$municipalidad" >/dev/null
  else
    kc create users -r sgtm -s "username=$usuario" -s enabled=true >/dev/null
  fi
  existente=$(kc get users -r sgtm -q "username=$usuario" --fields id --format csv --noquotes | tr -d '\r' | head -1)
  echo "Usuario $usuario creado."
else
  if [ -n "$municipalidad" ]; then
    kc update "users/$existente" -r sgtm -s "attributes.municipalidad_id=$municipalidad" >/dev/null
  fi
  echo "Usuario $usuario ya existia; actualizado."
fi

kc set-password -r sgtm --username "$usuario" --new-password "$clave" >/dev/null
echo "Clave asignada. Municipalidad: ${municipalidad:-«ninguna, solo para verificar el 403»}"
