# syntax=docker/dockerfile:1
#
# La interfaz, compilada y servida como archivos estaticos.
#
# Dos cosas que conviene saber antes de tocarla:
#
#   1. Vite resuelve las variables VITE_* AL COMPILAR. No son configuracion de
#      ejecucion: cambiar el emisor de identidad exige reconstruir la imagen. Es
#      la consecuencia de servir archivos estaticos, y es preferible a inyectar
#      configuracion en el HTML, que obligaria a que cada pantalla la leyera.
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
FROM nginx:1.27-alpine AS interfaz

COPY --from=construccion /origen/apps/backoffice/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
