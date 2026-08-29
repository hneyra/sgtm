# DEV-02 — Ejecutar y depurar

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-08-20 |
| Requisito previo | [DEV-01 — Entorno local](entorno-local.md) |

## 1. Arrancar cada pieza

```bash
# La interfaz sola, con su proxy de datos
cd frontend && yarn dev                            # http://localhost:5173

# El backend, con la base ya migrada (DEV-01 §2 B)
cd backend && SPRING_PROFILES_ACTIVE=web … ./gradlew :sgtm-aplicacion:bootRun

# La instalación completa
cd despliegue && docker compose up --build --wait aplicacion interfaz

# Solo algunas piezas: el compose arrastra las que hagan falta
docker compose up --wait base                      # solo el motor
docker compose up migraciones                      # corre y termina
docker compose up --wait identidad                 # solo Keycloak
```

El perfil `batch` es la **misma imagen y el mismo jar**, sin servidor web (ADR-0003):

```bash
SPRING_PROFILES_ACTIVE=batch SGTM_DB_URL=… SGTM_DB_CLAVE=… ./gradlew :sgtm-aplicacion:bootRun
```

## 2. Depurar el backend

### Punto de ruptura en la aplicación

```bash
cd backend
SPRING_PROFILES_ACTIVE=web … ./gradlew :sgtm-aplicacion:bootRun --debug-jvm
```

`--debug-jvm` deja la JVM **esperando** en el puerto 5005. Desde IntelliJ: *Run → Edit
Configurations → Remote JVM Debug*, host `localhost`, puerto `5005`, y **Debug**. Hasta que te
conectes, la aplicación no arranca; eso es lo que quieres cuando el problema está en el arranque.

### Punto de ruptura en una prueba

```bash
./gradlew :sgtm-esquema:test --tests '*Aislamiento*' --debug-jvm
```

Mismo puerto, misma configuración remota. Vale para cualquier módulo.

### Ver lo que hace de verdad

```bash
./gradlew :sgtm-catastro:test --info          # salida de la prueba en la consola
./gradlew build --stacktrace                  # la traza entera cuando algo revienta
./gradlew build --no-configuration-cache      # si sospechas de la caché de configuración
```

Los informes quedan en `backend/<modulo>/build/reports/tests/test/index.html`, y los de Checkstyle
en `build/reports/checkstyle/`.

### Registros de los contenedores

```bash
cd despliegue
docker compose logs -f aplicacion             # sigue la aplicación
docker compose logs migraciones               # el proceso que corre y termina, entero
docker compose ps                             # quién está arriba y quién «unhealthy»
```

Los procesos de un solo uso —`migraciones`, `implantacion`— no dejan nada en `docker compose ps`
cuando terminan bien: su rastro está en los registros.

## 3. Depurar la interfaz

| Qué | Cómo |
|---|---|
| Recarga en caliente | `yarn dev` la trae; si un cambio no se ve, mira la consola de Vite antes que el navegador |
| Componentes y estado | React DevTools |
| Qué contesta el proxy de datos | Pestaña de red: las respuestas las genera `@sgtm/api-mock`, con latencia simulada |
| Contra el backend real | `SGTM_API=http://localhost:8080 yarn dev`, y la ruta declarada en `packages/api-mock/src/servidas.ts` |
| Sin proxy en absoluto | `VITE_SGTM_PROXY_DE_DATOS=false yarn dev` |

**Una ruta declarada en `servidas.ts` que el backend no sirve falla ruidosamente** —`502` con el
nombre del archivo que hay que corregir— en vez de caer al proxy en silencio. Es deliberado: un
respaldo callado esconde justo lo que se quiere ver.

Para depurar la aplicación **compilada** (que es lo que corre en producción y lo que usan las
pruebas de extremo a extremo):

```bash
yarn build && yarn preview --port 4173         # http://localhost:4173
```

## 4. Mirar la base de datos

```bash
cd despliegue

# Como superusuario: para inspeccionar el esquema, los roles y las políticas
docker compose exec base psql --username=postgres sgtm

# Como la aplicación: para ver lo que la aplicación ve DE VERDAD
docker compose exec base psql --username=sgtm_app sgtm

# Si pide clave, es la del .env
docker compose exec --env PGPASSWORD="$SGTM_CLAVE_APP" base psql --username=sgtm_app sgtm
```

La diferencia entre esas dos conexiones **es** el aislamiento del sistema, y conviene comprobarlo
al menos una vez con las manos:

```sql
-- Como sgtm_app, sin contexto: la consulta FALLA. No devuelve vacío ni devuelve todo.
SELECT count(*) FROM contribuyente;

-- Con contexto, dentro de una transacción, que es lo que hace la aplicación:
BEGIN;
SELECT set_config('app.municipalidad_id', '1', true);   -- SET LOCAL: muere con la transacción
SELECT count(*) FROM contribuyente;
COMMIT;
```

**El superusuario no sirve para comprobar aislamiento**: omite Row Level Security incluso con
`FORCE ROW LEVEL SECURITY`. Si una consulta tuya devuelve dos municipalidades, mira con qué rol
estás conectado antes de abrir una incidencia.

Consultas útiles cuando algo no cuadra:

```sql
\du                                              -- los cuatro roles y sus atributos
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
SELECT tablename, rowsecurity, forcerowsecurity FROM pg_tables WHERE schemaname='public';
```

## 5. Conseguir un token y llamar a la API

El realm trae un cliente pensado para esto —`sgtm-verificacion`, con concesión directa
habilitada—; `sgtm-backoffice` **no** la tiene, porque es el de la interfaz y usa PKCE.

```bash
cd despliegue
source .env

TOKEN=$(curl --silent --request POST \
  "http://localhost:8180/realms/sgtm/protocol/openid-connect/token" \
  --data "grant_type=password&client_id=sgtm-verificacion&username=jperez&password=una-clave" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl --silent --header "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/seguridad/usuarios | python3 -m json.tool
```

**Lo que responde dice hasta dónde llegó la petición**, y por eso el código del catálogo importa
más que el número:

| Respuesta | Significa |
|---|---|
| `401 NO_AUTENTICADO` | No hay token, no es un token, o lo emitió otro |
| `403 SIN_MUNICIPALIDAD` | El token vale, pero **no trae el claim**: el usuario de Keycloak no tiene el atributo |
| `403 SIN_PRIVILEGIO` | Token válido, claim leído, municipalidad implantada — y le falta el permiso |
| `200` | El camino entero: emisión, validación, claim, `SET LOCAL`, permisos |

Para mirar el contenido de un token sin adivinar:

```bash
printf '%s' "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Si `municipalidad_id` no está ahí, el problema es del usuario en Keycloak, no del backend:
`./identidad/crear-usuario.sh jperez 'una-clave' 1` es idempotente y le pone el atributo.

## 6. Depurar los caminos de extremo a extremo

```bash
cd frontend
yarn e2e                                   # los seis caminos, sin ventana
yarn e2e --headed                          # con ventana, para verlos
yarn e2e --ui                              # el modo interactivo de Playwright
yarn e2e e2e/caja-con-teclado.spec.ts      # solo uno
npx playwright show-trace test-results/…   # la traza que deja un fallo
```

Playwright levanta él mismo la aplicación compilada en el 4173 (`yarn build && yarn preview`), así
que **no hace falta tener `yarn dev` corriendo** — y si lo tienes en el 4173, lo reutiliza.

Si no quieres que descargue su navegador, `SGTM_CHROMIUM=/ruta/al/chromium yarn e2e` usa el que ya
tienes. La primera vez, si no lo tienes: `npx playwright install chromium`.

## 7. Documentos relacionados

[DEV-01 — Entorno local](entorno-local.md) ·
[DEV-03 — Pruebas](pruebas.md) ·
[DEV-05 — Cuando algo no arranca](solucion-de-problemas.md) ·
[ARQ-03 — Estrategia multi-tenant](../30-arquitectura/estrategia-multitenant.md)
