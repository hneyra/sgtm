# syntax=docker/dockerfile:1
#
# La interfaz, compilada y servida como archivos estaticos.
#
# Dos cosas que conviene saber antes de tocarla:
#
#   1. Vite resuelve las variables VITE_* AL COMPILAR. No son configuracion de
#      ejecucion. Por eso las `VITE_SGTM_OIDC_*` que pasa `publicar-imagenes.yml`
#      son RUTAS del mismo origen -`/keycloak/realms/...`-, nunca URLs absolutas:
#      un dominio ahi queda horneado en el paquete estatico, y como la etiqueta
#      de la imagen vive fuera del estado de Pulumi (`ADR-0011` §5), cambiar
#      `sgtm:domain` actualizaria el ingreso y NO el paquete. Las dos mitades
#      acabarian apuntando a sitios distintos, en verde y sin un solo sintoma:
#      paso en `prod`, con el boton de acceso mandando el navegador a un nombre
#      sin registro A. `comprobar-compilaciones` lo vigila por los dos lados -lo
#      que el flujo pasa, y lo que acaba dentro del paquete-.
#      Keycloak se sirve en el mismo origen que la interfaz, asi que el navegador
#      resuelve la ruta solo. Un despliegue donde NO lo este -`despliegue/
#      compose.yaml`, con Keycloak en `localhost:8180`- sigue pudiendo pasar una
#      URL absoluta: `new URL(valor, origin)` la respeta.
#   2. `/api/v1` lo reenvia nginx al backend, en la misma red del compose. Por eso
#      la aplicacion pide a su propio origen y no hay CORS que configurar: el
#      navegador nunca habla con el backend directamente.

# ---------------------------------------------------------------------------
FROM node:22-alpine AS construccion

WORKDIR /origen
COPY . .
RUN yarn install --frozen-lockfile

# El juego de datos simulado NO llega a produccion. Va detras de esta bandera y
# se carga con import() dinamico; `comprobar-compilaciones` compara las dos
# compilaciones y exige que el chunk desaparezca. Ponerla en "true" aqui metaria
# el padron de ejemplo en la imagen de una municipalidad.
ARG VITE_SGTM_PROXY_DE_DATOS=false
ARG VITE_SGTM_API=/api/v1
ARG VITE_SGTM_OIDC_CLIENTE
ARG VITE_SGTM_OIDC_AUTORIZACION
ARG VITE_SGTM_OIDC_TOKEN
ARG VITE_SGTM_OIDC_FIN_DE_SESION
ARG VITE_SGTM_OIDC_ALCANCE="openid profile"

ENV VITE_SGTM_PROXY_DE_DATOS=$VITE_SGTM_PROXY_DE_DATOS \
    VITE_SGTM_API=$VITE_SGTM_API \
    VITE_SGTM_OIDC_CLIENTE=$VITE_SGTM_OIDC_CLIENTE \
    VITE_SGTM_OIDC_AUTORIZACION=$VITE_SGTM_OIDC_AUTORIZACION \
    VITE_SGTM_OIDC_TOKEN=$VITE_SGTM_OIDC_TOKEN \
    VITE_SGTM_OIDC_FIN_DE_SESION=$VITE_SGTM_OIDC_FIN_DE_SESION \
    VITE_SGTM_OIDC_ALCANCE=$VITE_SGTM_OIDC_ALCANCE

RUN yarn build

# ---------------------------------------------------------------------------
# 1.31.4, no 1.27 (issue #157): `escaneo-de-imagenes.yml` encontro CVE-2026-31789
# -CRITICAL, un desbordamiento de buffer en OpenSSL- en `libssl3`/`libcrypto3`
# 3.3.3-r0, la version de Alpine que trae la imagen `1.27-alpine` congelada en el
# momento en que este Dockerfile la fijo. La correccion real es la que el propio
# issue pide: actualizar la etiqueta de la imagen base, no ignorar el hallazgo.
FROM nginx:1.31.4-alpine AS interfaz

COPY --from=construccion /origen/apps/backoffice/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Sin root (issue #157). La imagen base ya trae el usuario "nginx" —lo usan sus
# procesos hijos, `user nginx;` en el `nginx.conf` principal— pero el master sigue
# arrancando como root por dos motivos que hay que resolver los dos: escribe su
# pid en /var/run, y el entrypoint de la propia imagen reescribe este
# `default.conf` al arrancar (el guion `10-listen-on-ipv6...` de
# `docker-entrypoint.d`) para anadir IPv6 si el nodo lo tiene. Se redirige el pid a
# /tmp —escribible por cualquiera— y se le da a "nginx" el mismo permiso que root
# sobre `/var/cache/nginx` y `/etc/nginx`, por grupo y no por usuario: asi sigue
# funcionando si Kubernetes decide correrlo con otro UID (`runAsNonRoot`, sin
# `runAsUser` fijo, en `Aplicacion.ts`).
RUN sed -i \
        -e '/^user  *nginx;/d' \
        -e 's#^pid .*#pid /tmp/nginx.pid;#' \
        /etc/nginx/nginx.conf \
    && chown -R nginx:0 /var/cache/nginx /etc/nginx \
    && chmod -R g=u /var/cache/nginx /etc/nginx

USER nginx
EXPOSE 8080
