# DEV-01 — Entorno local

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-08-20 |
| Estado | Vigente |
| Verificado en | macOS, JDK 25 (Temurin 25.0.4), Node 26, yarn 1.22, **sin Docker** |

## 1. Prerrequisitos

| Herramienta | Versión | Por qué esa |
|---|---|---|
| JDK | **25** | `backend/gradle.properties` declara `sgtm.java.version=25`, y CI comprueba que coincida (ADR-0001) |
| Node | **22** | Es la que fija CI en los dos trabajos del frontend. **Con Node 26 fallan 22 pruebas** — ver [DEV-05 §2](solucion-de-problemas.md) |
| yarn | 1.22 (clásico) | Es el que hay en el repositorio; `frontend/` usa workspaces |
| Docker | Con Compose | Solo para las pruebas de persistencia y para levantar la instalación completa. Hay salida documentada sin él |
| Git | Cualquiera reciente | |

```bash
java -version     # openjdk 25...
node --version    # v22.x
yarn --version    # 1.22.x
docker --version  # opcional, pero entonces lee §5
```

**No hace falta instalar Gradle**: el repositorio trae el *wrapper* (`./gradlew`).

### 1.1 El repositorio hermano `../srtm`

No es opcional para trabajar en cálculo tributario o en el esquema:

```bash
cd ..
git clone https://github.com/hneyra/srtm     # queda como hermano de sgtm/
```

De ahí salen las reglas del predial (NEG-05), el motor de reglas (ARQ-09) y —lo que más se
consulta a diario— los tipos y longitudes de columna en
`../srtm/docs/40-datos/ddl/esquema-verificado.sql`. El motivo de que esto sea una regla y no una
sugerencia está en [`CLAUDE.md`](../../CLAUDE.md): el motor de reglas se escribió una vez sin poder
leer esos documentos y salieron dos defectos estructurales, los dos en verde.

## 2. Las tres formas de trabajar

No hay una sola: **elige la más barata que sirva para lo que vas a tocar.**

| # | Forma | Necesita | Sirve para |
|---|---|---|---|
| **A** | Solo la interfaz, contra el **proxy de datos** | Node | Las 134 pantallas, componentes, catálogo, estados, impresión |
| **B** | Interfaz + backend real, base en Docker | Node, JDK, Docker | Una operación de verdad de punta a punta |
| **C** | La **instalación completa** (marcha blanca) | Docker | Identidad, tokens, permisos, migración, implantación |

### A · Solo la interfaz

```bash
cd frontend
yarn install
yarn dev                 # http://localhost:5173
```

`@sgtm/api-mock` sustituye `fetch` e intercepta lo que cuelga de `/api/v1`, así que **no hace falta
ni backend ni base de datos**. Contesta las 134 operaciones del catálogo —una por pantalla— con los datos del
prototipo y con latencia simulada, para que los estados de carga se vean.

Lo que el proxy **no** hace, a propósito: no filtra, no ordena, no pagina, no valida y no persiste.
Fingir la semántica de `?uso=Comercio` sería inventar un comportamiento que el backend no ha
decidido, y la interfaz acabaría construida contra esa invención.

### B · Interfaz + backend real

```bash
# Terminal 1 — la base migrada y la municipalidad sembrada, sin la aplicación
cd despliegue
cp .env.ejemplo .env                                  # y poner claves de verdad, §4
docker compose up implantacion                        # arrastra base y migraciones; los tres terminan
docker compose up --wait identidad                    # Keycloak, para poder pedir un token

# Terminal 2 — el backend
cd backend
SPRING_PROFILES_ACTIVE=web \
SGTM_DB_URL=jdbc:postgresql://localhost:5432/sgtm \
SGTM_DB_USUARIO=sgtm_app \
SGTM_DB_CLAVE=<la del .env> \
SGTM_OIDC_EMISOR=http://localhost:8180/realms/sgtm \
  ./gradlew :sgtm-aplicacion:bootRun

# Terminal 3 — la interfaz, reenviando /api a Spring Boot
cd frontend
SGTM_API=http://localhost:8080 yarn dev
```

> El compose **no publica el puerto de la base**, así que `bootRun` desde el anfitrión no la
> alcanza. Se resuelve con un archivo de superposición propio —Compose lo carga solo, y
> `.gitignore` ya lo excluye—:
>
> ```yaml
> # despliegue/compose.override.yaml — solo para desarrollo, no se versiona
> services:
>   base:
>     ports: ["5432:5432"]
> ```
>
> Publicar la base es cómodo y no es gratis: cualquier proceso de tu máquina llega a ella. En una
> instalación de verdad ese puerto no se publica ([#153](https://github.com/hneyra/sgtm/issues/153)).
> Para solo mirar datos no hace falta: está `docker compose exec` ([DEV-02 §4](ejecutar-y-depurar.md)).

Sin el paso de `implantacion` el backend arranca igual, pero el sistema **no tiene nada dentro**:
sin fila en `municipalidad` no hay `municipalidad_id` que poner en ningún token, y toda petición
autenticada acaba en `403`. Y para pedir tokens hace falta un usuario:
`./identidad/crear-usuario.sh jperez 'una-clave' 1`.

`yarn dev` reenvía `/api` a `SGTM_API` y **el proxy de datos sigue instalado**: contesta todo lo que
no esté en `packages/api-mock/src/servidas.ts`, que es la lista de rutas que el backend ya sirve.
Para trabajar **solo** contra el backend, `VITE_SGTM_PROXY_DE_DATOS=false`.

**Sin `SGTM_OIDC_EMISOR` el backend no arranca**, y no es un descuido que arreglar: un proceso que
atiende peticiones sin poder validar un token es la situación que ADR-0005 excluye. Si no quieres
levantar Keycloak, usa la forma A.

### C · La instalación completa

```bash
cd despliegue
cp .env.ejemplo .env

# Una clave DISTINTA por marcador. Con `sed` y `$(openssl …)` saldrían las seis
# iguales: la sustitución de comandos se evalúa una sola vez, antes que el sed.
python3 - <<'PY'
import re, secrets, pathlib
env = pathlib.Path('.env')
env.write_text(re.sub(r'CAMBIAR_\S+', lambda _: secrets.token_hex(24), env.read_text()))
PY

./identidad/datos-de-implantacion.sh 200101 >> .env   # el administrador, del archivo versionado
docker compose up --build --wait aplicacion interfaz correo
./identidad/reconciliar-identidades.sh                # crea los usuarios de municipalidades/*.json
```

| Pieza | Queda en |
|---|---|
| Interfaz | <http://localhost:8081> |
| API | <http://localhost:8080> — solo `/actuator/health` sin token |
| Keycloak | <http://localhost:8180> |
| Buzón de correo (Mailpit) | <http://localhost:8025> — ahí llega el enlace de primera clave |

El orden de arranque —base → migraciones → implantación → aplicación → interfaz— **no es una
preferencia**: un esquema a medias con la aplicación ya sirviendo peticiones es el estado que
`depends_on: service_completed_successfully` existe para impedir. El detalle de cada pieza está en
[`despliegue/README.md`](../../despliegue/README.md).

El administrador no se inventa a mano: `datos-de-implantacion.sh` lo vuelca al `.env` desde el
archivo versionado de su municipalidad, y `reconciliar-identidades.sh` crea los usuarios declarados
—**sin clave**— en `identidad/municipalidades/*.json`; cada uno recibe en el buzón Mailpit el enlace
de un solo uso con que fija la suya (ADR-0012). Sin el servicio `correo` levantado, la
reconciliación falla al enviar ese correo. `crear-usuario.sh` sigue existiendo para los usuarios
`verificacion` de CI, que necesitan una clave conocida. Y el realm ya trae
`http://localhost:5173/*` entre sus redirecciones, así que la interfaz en modo desarrollo puede
autenticarse contra este Keycloak sin tocar nada.

## 3. Puertos

| Puerto | Quién | Cuándo |
|---|---|---|
| 5173 | Vite, interfaz en desarrollo | `yarn dev` |
| 4173 | Vista previa de la compilación | `yarn e2e`, `yarn preview` |
| 8080 | API | `bootRun` o el compose |
| 8081 | Interfaz servida por nginx | Compose |
| 8180 | Keycloak | Compose |
| 8025 | Mailpit, el buzón de correo | Compose |
| 5432 | PostgreSQL | Dentro de la red del compose; no se publica |

## 4. Variables de entorno

### Backend

| Variable | Obligatoria | Qué es |
|---|---|---|
| `SGTM_DB_URL` | Sí | JDBC de la base |
| `SGTM_DB_USUARIO` | No (`sgtm_app`) | **Siempre `sgtm_app`.** Poner `sgtm_owner` aquí le da DDL a un proceso expuesto en HTTP |
| `SGTM_DB_CLAVE` | Sí | |
| `SGTM_OIDC_EMISOR` | Sí en perfil `web` | El emisor **público**, el que va en el `iss` del token |
| `SGTM_OIDC_JWKS` | No | De dónde se traen las claves; dentro del compose es el nombre interno |
| `SPRING_PROFILES_ACTIVE` | Sí | `web` (atiende HTTP) o `batch` (sin servidor web) |

### Interfaz

| Variable | Qué hace |
|---|---|
| `SGTM_API` | A dónde reenvía Vite lo que empieza por `/api`. Por omisión `http://localhost:8080` |
| `VITE_SGTM_PROXY_DE_DATOS=false` | Apaga el proxy de datos entero; con la bandera apagada, el juego de datos ni siquiera se compila |
| `VITE_SGTM_OIDC_CLIENTE`, `..._AUTORIZACION`, `..._TOKEN`, `..._FIN_DE_SESION` | El proveedor de identidad. Sin ellas la aplicación arranca igual, que es como se trabaja contra el proxy |
| `SGTM_CHROMIUM` | Ruta a un Chromium ya instalado, para no descargar el de Playwright |

**Las `VITE_*` se resuelven al compilar.** Cambiar una y no reconstruir es la causa número uno de
«toqué la configuración y no se nota».

### El `.env` del despliegue

`despliegue/.env` **no se versiona**, y si alguna vez aparece en un diff, la clave que lleve deja de
ser una clave: hay que rotarla, no borrarla del commit. Una clave **distinta por rol**: si el
superusuario, `sgtm_owner` y `sgtm_app` comparten clave, la separación de privilegios entera es
decorativa.

## 5. Sin Docker

Las pruebas de `sgtm-esquema`, `sgtm-plataforma`, `sgtm-catastro` y `sgtm-seguridad` necesitan un
**PostgreSQL real**: una base en memoria no tiene Row Level Security y daría falsos verdes
(CAL-01 §2). Por omisión levantan un contenedor con Testcontainers.

Sin Docker hay una salida documentada —apuntar a un PostgreSQL existente— y **ninguna que omita la
prueba**:

```bash
cd backend
./gradlew verificarAislamiento \
  -Dsgtm.pruebas.postgres.url=jdbc:postgresql://localhost:5432/postgres \
  -Dsgtm.pruebas.postgres.usuario=postgres \
  -Dsgtm.pruebas.postgres.clave=…
```

El usuario tiene que ser superusuario: la prueba crea los cuatro roles, les asigna su clave y crea
una base nueva por corrida. Los **roles son del clúster y no de la base**, así que las comparten
todas las corridas que apunten a ese motor; desde #698 la clave **se deriva** del clúster —dos
tareas en paralelo escriben lo mismo— y el provisionamiento se serializa con un candado del propio
motor, de modo que `--max-workers=1` ya no hace falta. Lo que sigue sin poder convivir es una
corrida con **otro código** o **otra credencial de superusuario**: eso pisa la clave igual, pero
ahora el fallo lo dice en vez de salir como `password authentication failed`. Qué garantiza y qué
no, en [`backend/README.md`](../../backend/README.md).

Lo que **sí** funciona sin Docker ni base, y conviene tener a mano:

```bash
cd backend
./gradlew verificarArquitectura     # ArchUnit, escaner de fuentes y Spring Modulith
```

## 6. Editor

| Editor | Notas |
|---|---|
| IntelliJ IDEA | Importar `backend/` como proyecto Gradle; el JDK del proyecto es el 25. La carpeta `frontend/` funciona sola |
| VS Code | Extensiones de ESLint y Prettier; el formato del backend lo hace Spotless desde Gradle, no el editor |

**Que el editor formatee a su gusto no ayuda**: Checkstyle no revisa formato a propósito, para no
discutir con el formateador. Lo que sí revisa —y es fácil de incumplir con el teclado en español—
son los **identificadores con tilde**: `alicuota`, nunca `alícuota`.

## 7. Documentos relacionados

[DEV-02 — Ejecutar y depurar](ejecutar-y-depurar.md) ·
[DEV-03 — Pruebas](pruebas.md) ·
[DEV-05 — Cuando algo no arranca](solucion-de-problemas.md) ·
[`despliegue/README.md`](../../despliegue/README.md) ·
[`backend/README.md`](../../backend/README.md) ·
[`frontend/README.md`](../../frontend/README.md)
