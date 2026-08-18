# Backend del SGTM

Spring Boot 4 sobre Java 25, multi-módulo, monolito modular con Spring Modulith
([ADR-0001](../docs/30-arquitectura/adr/ADR-0001-plataforma-backend.md),
[ADR-0003](../docs/30-arquitectura/adr/ADR-0003-monolito-modular.md)).

**Qué hay:** el esqueleto de Gradle, el esquema completo como migraciones Flyway, el camino del
contexto de tenant (token → `SET LOCAL` → RLS) y las verificaciones bloqueantes.
**Qué no hay:** ninguna funcionalidad de negocio, y es deliberado — primero las barreras.

## Comandos

```bash
./gradlew build                   # todo, incluidas Spotless, Checkstyle y NullAway
./gradlew verificarAislamiento    # aislamiento multi-tenant. Bloqueante
./gradlew verificarArquitectura   # ArchUnit, escaner de fuentes y Spring Modulith. Bloqueante
./gradlew spotlessApply           # arregla el formato en vez de solo reprocharlo
```

**Si el build se queja del formato, no lo pelees: `spotlessApply`.** Checkstyle no revisa formato
a propósito, para no discutir con el formateador. Lo que sí revisa, y es fácil de incumplir con el
teclado en español, son los **identificadores con tilde**: `alicuota`, nunca `alícuota`.

## Pruebas que necesitan PostgreSQL

Las de `sgtm-esquema` y `sgtm-plataforma` necesitan un **PostgreSQL real**: una base en memoria no
tiene Row Level Security y daría falsos verdes (CAL-01 §2).

Por omisión levantan un contenedor con Testcontainers, así que hacen falta Docker y la imagen
`postgres:16-alpine`.

**Sin Docker** hay una salida documentada —apuntar a un PostgreSQL existente—, y ninguna que omita
la prueba:

```bash
./gradlew verificarAislamiento \
  -Dsgtm.pruebas.postgres.url=jdbc:postgresql://localhost:5432/postgres \
  -Dsgtm.pruebas.postgres.usuario=postgres \
  -Dsgtm.pruebas.postgres.clave=…
```

El usuario debe ser superusuario: la prueba crea los cuatro roles, les asigna claves efímeras y
crea una base nueva por corrida. También sirven las variables de entorno equivalentes
(`SGTM_PRUEBAS_POSTGRES_URL`, …) y `-Dsgtm.pruebas.postgres.imagen` para cambiar la imagen.

**Sin motor, las pruebas fallan; no se saltan.** Una prueba bloqueante que se omite a sí misma
deja el build en verde sin haber verificado nada.

## Integración continua

Cada pull request que toca `backend/` corre
[`.github/workflows/backend.yml`](../.github/workflows/backend.yml), con **un job por barrera**
para que el nombre del check diga qué se rompió sin abrir el log:

| Job | Comando | Necesita Docker |
|---|---|---|
| `calidad` | `./gradlew build -x test` — Spotless, Checkstyle, NullAway | No |
| `arquitectura` | `./gradlew verificarArquitectura` | No |
| `aislamiento` | `./gradlew verificarAislamiento` | **Sí** |

El runner instala el **JDK 25** de ADR-0001; el job `calidad` falla si `gradle.properties`
declarara otra versión, porque construir en CI con una distinta de la del despliegue verifica
otra cosa que la que se despliega.

El job de aislamiento comprueba que hay Docker y descarga `postgres:16-alpine` **antes** de la
prueba: así un runner sin Docker no se confunde con un fallo de aislamiento de verdad. Lo que no
hace en ningún caso es omitir la prueba.

Cuando algo falla en rojo, los reportes de Checkstyle y de las pruebas quedan como artefactos de
la corrida.

## Módulos

```
sgtm-dominio-compartido   MunicipalidadId, Ejercicio, TenantContext. Sin Spring
sgtm-esquema              Migraciones Flyway + la prueba de aislamiento. Sin Spring
sgtm-plataforma           Filtro del token, SET LOCAL por transaccion, guardia del pool
sgtm-<contexto> × 12      Los contextos acotados de ARQ-01 §3. Hoy vacios
sgtm-aplicacion           Ensambla, y aloja ArchUnit, el escaner y Spring Modulith
```

Los doce contextos son `contribuyentes`, `catastro`, `rentas`, `parametros`, `fiscalizacion`,
`sanciones`, `cuentacorriente`, `tesoreria`, `valores`, `coactiva`, `licencias` y `seguridad`.
Están vacíos a propósito: la estructura fija los límites antes de que haya código que los cruce.

## Convenciones del build

Las convenciones viven en `buildSrc/` como plugins precompilados, **no** en un bloque
`subprojects {}`: un módulo debe declarar qué convenciones aplica.

| Plugin | Qué aporta |
|---|---|
| `sgtm.java-base` | Toolchain de Java 25, `-Xlint:all`, JUnit Platform |
| `sgtm.calidad` | Spotless (formato), Checkstyle (nombres y trampas), NullAway (nulidad) |
| `sgtm.pruebas` | JUnit y AssertJ. **No** trae Testcontainers, a propósito |
| `sgtm.pruebas-postgres` | Reenvía las propiedades del motor externo al proceso de prueba |
| `sgtm.modulo` | Convenciones de un contexto acotado: BOM de Spring y dominio compartido |

## Base de datos

La aplicación se conecta **siempre** como `sgtm_app`: sin DDL, sin `BYPASSRLS`, sin ser
propietaria de las tablas y **sin `DELETE`**. Las migraciones las ejecuta el proceso de despliegue
como `sgtm_owner`; la aplicación **no migra al arrancar** (`spring.flyway.enabled: false`).

Los roles se crean antes de la primera migración con
[`db/roles/crear-roles.sql`](sgtm-esquema/src/main/resources/db/roles/crear-roles.sql), que no es
una migración de Flyway. Las claves no están ahí: los roles se crean sin `LOGIN` y quien
provisiona el ambiente asigna la clave desde su gestor de secretos.

Detalle del esquema: [`sgtm-esquema/README.md`](sgtm-esquema/README.md) y
[DAT-01](../docs/40-datos/modelo-logico-fisico.md).

## Qué falta

- Toda la funcionalidad de negocio. Bloqueada por D-01 y D-02
  ([GOB-02](../docs/00-gobierno/decisiones-abiertas.md)).
- La configuración de Spring Security: el emisor OIDC y el JWKS. Hoy `TenantContextFilter` sabe
  leer el claim, pero nadie valida todavía el token.
- El mecanismo que escribe la auditoría (disparadores o aspecto). Se decide con el primer caso de
  uso de escritura; ver [DAT-02 §4](../docs/40-datos/auditoria-e-historico.md).
- Las particiones de los ejercicios siguientes a 2027, y su automatización.
- El camino del portal del contribuyente (D-07).
