# syntax=docker/dockerfile:1
#
# Dos imagenes del mismo arbol de fuentes, y esa es la decision principal de este
# archivo:
#
#   `aplicacion`  el artefacto unico de ADR-0003, desplegado en los perfiles web y
#                 batch. Se conecta como sgtm_app: sin DDL, sin BYPASSRLS, sin ser
#                 propietaria de ninguna tabla y sin DELETE (ARQ-03 §4).
#   `migrador`    el proceso que aplica el esquema como sgtm_owner y termina.
#
# Estan separadas porque las credenciales son distintas y no deben convivir en el
# mismo contenedor: las de sgtm_owner existen durante la migracion y desaparecen
# con ella. Meterlas en la imagen de la aplicacion —aunque solo fuera «para el
# arranque»— le daria a un proceso de larga vida, expuesto en HTTP, la capacidad
# de hacer DDL sobre el padron de todas las municipalidades.
#
# La compilacion, en cambio, es una sola: las dos salen del mismo `construccion`,
# asi que el codigo que migra en produccion es exactamente el que CI verifico.

# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jdk AS construccion

WORKDIR /origen

# Primero lo que casi nunca cambia, para que la capa de dependencias se reutilice
# entre compilaciones. `--version` descarga la distribucion de Gradle y nada mas.
COPY gradlew gradle.properties settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN ./gradlew --version --no-daemon

COPY buildSrc/ buildSrc/
COPY config/ config/
COPY . .

# Sin pruebas: las bloqueantes necesitan Docker y ya corrieron en CI. Una imagen
# que las repitiera dentro del build las volveria a ejecutar en cada despliegue,
# con un motor distinto al verificado.
RUN ./gradlew --no-daemon :sgtm-aplicacion:bootJar :sgtm-esquema:installDist

# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jre AS aplicacion

# Usuario sin privilegios y sin shell. Un proceso que solo tiene que escuchar en
# un puerto no necesita ser root dentro del contenedor.
RUN useradd --system --uid 10001 --shell /usr/sbin/nologin sgtm

# curl entra por una sola razon: la sonda de vida del orquestador se ejecuta
# DENTRO del contenedor, y la imagen base no trae ningun cliente HTTP. La
# alternativa —comprobar solo que el puerto acepta conexiones— daria por sana una
# aplicacion que escucha y no llega a la base, que es justo el fallo que se quiere
# detectar antes de dar el despliegue por bueno.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=construccion /origen/sgtm-aplicacion/build/libs/sgtm.jar /opt/sgtm/sgtm.jar
USER 10001
EXPOSE 8080

# Sin CMD con argumentos: la configuracion entra por variables de entorno
# (SGTM_DB_URL, SGTM_DB_USUARIO, SGTM_DB_CLAVE) y por SPRING_PROFILES_ACTIVE,
# que es lo unico que distingue el perfil web del batch.
ENTRYPOINT ["java", "-jar", "/opt/sgtm/sgtm.jar"]

# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jre AS migrador

RUN useradd --system --uid 10002 --shell /usr/sbin/nologin migrador
COPY --from=construccion /origen/sgtm-esquema/build/install/migrar /opt/migrador
USER 10002

# Corre y termina. El orquestador espera a que salga con exito antes de arrancar
# la aplicacion: un esquema a medias con la aplicacion ya sirviendo peticiones es
# el estado que este orden existe para impedir.
ENTRYPOINT ["/opt/migrador/bin/migrar"]
