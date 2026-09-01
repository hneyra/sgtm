# syntax=docker/dockerfile:1
#
# La interfaz, compilada y servida como archivos estaticos.
#
# Dos cosas que conviene saber antes de tocarla:
#
#   1. Vite resuelve las variables VITE_* AL COMPILAR. No son configuracion de
#      ejecucion: cambiarlas exige reconstruir la imagen. Por eso `VITE_SGTM_API`
#      es una RUTA del mismo origen —`/api/v1`— y nunca una URL absoluta; un
#      dominio ahi queda horneado en el paquete estatico y las dos mitades del
#      despliegue acaban apuntando a sitios distintos, en verde y sin un solo
#      sintoma.
#   2. `/api/v1` lo reenvia nginx al backend, en la misma red del compose. Por eso
#      la aplicacion pide a su propio origen y no hay CORS que configurar: el
#      navegador nunca habla con el backend directamente.

# ---------------------------------------------------------------------------
FROM node:22-alpine AS construccion

WORKDIR /origen

# Primero el manifiesto: asi la capa de dependencias se reutiliza mientras no
# cambien, que es lo que hace que reconstruir tras tocar una pantalla sea rapido.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VITE_SGTM_API=/api/v1
# La puerta de sesion. Los tres valen por omision para el despliegue de compose,
# donde Keycloak se sirve bajo /kc del MISMO origen. Son RUTAS y no URLs a
# proposito: un dominio aqui queda horneado en el paquete estatico, y como la
# misma imagen se despliega en varios sitios, las dos mitades acabarian
# apuntando a servidores distintos, en verde y sin un solo sintoma.
ARG VITE_SGTM_OIDC_REALM=/kc/realms/sgtm
ARG VITE_SGTM_OIDC_CLIENTE=sgtm-backoffice
ARG VITE_SGTM_OIDC_ALCANCE="openid profile"

ENV VITE_SGTM_API=$VITE_SGTM_API \
    VITE_SGTM_OIDC_REALM=$VITE_SGTM_OIDC_REALM \
    VITE_SGTM_OIDC_CLIENTE=$VITE_SGTM_OIDC_CLIENTE \
    VITE_SGTM_OIDC_ALCANCE=$VITE_SGTM_OIDC_ALCANCE

# NINGUN token se hornea en la imagen. `VITE_SGTM_TOKEN` existe para desarrollo
# —una vista previa local contra el backend— y meterlo aqui dejaria una credencial
# dentro de un artefacto que se publica y se comparte. En el contenedor el token
# lo pone quien lo usa, en su propio navegador, hasta que exista la puerta de
# sesion.
RUN yarn build

# ---------------------------------------------------------------------------
# 1.31.4 y no una etiqueta movil: la version se fija a proposito para que un
# escaneo de imagenes pueda decir de que version habla. Actualizarla es la
# correccion cuando el escaneo encuentre algo, no ignorar el hallazgo.
FROM nginx:1.31.4-alpine AS interfaz

COPY --from=construccion /origen/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Sin root. La imagen base ya trae el usuario "nginx" —lo usan sus procesos
# hijos— pero el master arranca como root por dos motivos que hay que resolver
# los dos: escribe su pid en /var/run, y el entrypoint de la propia imagen
# reescribe este `default.conf` al arrancar (el guion `10-listen-on-ipv6…`) para
# anadir IPv6 si el nodo lo tiene. Se redirige el pid a /tmp —escribible por
# cualquiera— y se le da a "nginx" el mismo permiso que root sobre
# `/var/cache/nginx` y `/etc/nginx`, POR GRUPO y no por usuario: asi sigue
# funcionando si el orquestador decide correrlo con otro UID.
RUN sed -i \
        -e '/^user  *nginx;/d' \
        -e 's#^pid .*#pid /tmp/nginx.pid;#' \
        /etc/nginx/nginx.conf \
    && chown -R nginx:0 /var/cache/nginx /etc/nginx \
    && chmod -R g=u /var/cache/nginx /etc/nginx

USER nginx
EXPOSE 8080
