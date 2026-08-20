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

## Arrancarlo

La instalación completa —motor, migración y aplicación— vive en
[`despliegue/`](../despliegue/README.md):

```bash
cd ../despliegue
cp .env.ejemplo .env          # y poner claves generadas, una distinta por rol
docker compose up --build --wait aplicacion
```

Lo que hay que entender antes de tocarlo: **la aplicación no migra**. Arranca con
`spring.flyway.enabled: false` y se conecta como `sgtm_app`, que no tiene DDL. Quien migra es
[`Migrador`](sgtm-esquema/src/main/java/pe/gob/sgtm/esquema/Migrador.java), en su propio
contenedor, como `sgtm_owner`, y termina antes de que la aplicación arranque. Es el **mismo**
código que provisiona la base de cada prueba de persistencia: si el despliegue migrara por su
cuenta, lo verificado en CI y lo desplegado en la municipalidad dejarían de ser lo mismo.

La identidad la emite **Keycloak**, con su realm versionado en
[`despliegue/identidad/`](../despliegue/identidad/README.md). La cadena está escrita —no heredada—
en [`SeguridadWeb`](sgtm-plataforma/src/main/java/pe/gob/sgtm/plataforma/SeguridadWeb.java):
`/actuator/health` es lo único público y todo lo demás exige un token que el emisor configurado
haya firmado.

**El emisor no tiene valor por omisión: sin `SGTM_OIDC_EMISOR` el proceso no arranca.** Es
deliberado. Un backend que arranca sin emisor responde a la sonda de vida, se declara sano y no
atiende a nadie, y eso no se parece a un fallo hasta que alguien intenta entrar.

**Si el build se queja del formato, no lo pelees: `spotlessApply`.** Checkstyle no revisa formato
a propósito, para no discutir con el formateador. Lo que sí revisa, y es fácil de incumplir con el
teclado en español, son los **identificadores con tilde**: `alicuota`, nunca `alícuota`.

## Pruebas que necesitan PostgreSQL

Las de `sgtm-esquema`, `sgtm-plataforma`, `sgtm-catastro` y `sgtm-seguridad` necesitan un
**PostgreSQL real**: una base en memoria no tiene Row Level Security y daría falsos verdes
(CAL-01 §2).

Por omisión levantan un contenedor con Testcontainers, así que hacen falta Docker y la imagen
`postgres:16-alpine`.

**Sin Docker** hay una salida documentada —apuntar a un PostgreSQL existente—, y ninguna que omita
la prueba:

```bash
./gradlew verificarAislamiento --max-workers=1 \
  -Dsgtm.pruebas.postgres.url=jdbc:postgresql://localhost:5432/postgres \
  -Dsgtm.pruebas.postgres.usuario=postgres \
  -Dsgtm.pruebas.postgres.clave=…
```

El usuario debe ser superusuario: la prueba crea los cuatro roles, les asigna claves efímeras y
crea una base nueva por corrida. También sirven las variables de entorno equivalentes
(`SGTM_PRUEBAS_POSTGRES_URL`, …) y `-Dsgtm.pruebas.postgres.imagen` para cambiar la imagen.

**`--max-workers=1` no es decorativo en este camino.** Cada módulo crea su propia base, pero los
**roles de PostgreSQL son del clúster, no de la base**: dos módulos de prueba en paralelo sobre el
mismo motor se pisan la clave efímera de `sgtm_owner`, y el fallo aparece como
`password authentication failed`, que no se parece en nada a su causa. Con Testcontainers el
problema no existe —cada módulo levanta su propio motor—, así que es un detalle exclusivo de esta
salida de emergencia.

**Sin motor, las pruebas fallan; no se saltan.** Una prueba bloqueante que se omite a sí misma
deja el build en verde sin haber verificado nada.

## Módulos

```
sgtm-dominio-compartido   Objetos de valor (pe.gob.sgtm.dominio) y TenantContext. Sin Spring
sgtm-esquema              Migraciones Flyway + la prueba de aislamiento. Sin Spring
sgtm-plataforma           Filtro del token, SET LOCAL por transaccion, guardia del pool,
                          el patron de repositorio (pe.gob.sgtm.persistencia), la
                          auditoria de ADR-0008 (pe.gob.sgtm.auditoria), la capa web
                          comun (pe.gob.sgtm.web) y el guardia de acceso
                          (pe.gob.sgtm.autorizacion)
sgtm-<contexto> × 12      Los contextos acotados de ARQ-01 §3. Solo catastro tiene codigo
sgtm-aplicacion           Ensambla, y aloja ArchUnit, el escaner y Spring Modulith
```

Los doce contextos son `contribuyentes`, `catastro`, `rentas`, `parametros`, `fiscalizacion`,
`sanciones`, `cuentacorriente`, `tesoreria`, `valores`, `coactiva`, `licencias` y `seguridad`.
Están vacíos a propósito —la estructura fija los límites antes de que haya código que los cruce—
salvo `catastro`, que aloja el catálogo vial: es el repositorio de ejemplo del patrón de
persistencia, elegido porque no arrastra ninguna regla de cálculo y sí tiene `municipalidad_id` y
política RLS, que es lo que hay que demostrar.

`sgtm-dominio-compartido` contiene **dos** paquetes, y la separación importa:

| Paquete | Qué hay | Por qué separado |
|---|---|---|
| `pe.gob.sgtm.dominio` | `Dinero`, `Periodo`, `Alicuota`, `Porcentaje`, `AreaM2`, `Ejercicio`, `MunicipalidadId`, `CodigoContribuyente`, `CodigoReferenciaCatastral`, `Placa`, `DocumentoIdentidad`, `Observacion` | Es dominio: le aplican las siete reglas de ArchUnit sin excepción |
| `pe.gob.sgtm.compartido` | `TenantContext` | Es una utilidad técnica con un `ThreadLocal` dentro; no es vocabulario tributario |

El paquete de dominio cuelga de `pe.gob.sgtm` y **no** de `pe.gob.sgtm.compartido` por una razón
concreta: para Spring Modulith un subpaquete es interno a su módulo, y un objeto de valor que
ningún contexto puede importar no sirve de vocabulario común. Como módulo propio queda expuesto
sin anotar el paquete, y así este módulo Gradle sigue sin depender de Spring —ni siquiera de una
anotación—, que es la regla 7 en su forma más literal.

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

- Toda regla de cálculo tributario. Bloqueada por D-02 —los valores normativos, hoy partida en
  D-02a/b/c— y por D-03c, los puntos de redondeo
  ([GOB-02](../docs/00-gobierno/decisiones-abiertas.md)).
- **Un usuario dentro.** El emisor ya firma tokens y el backend los acepta, pero no hay
  municipalidad, ni permisos, ni primer administrador: una petición autenticada se detiene hoy en
  la autorización, no en la identidad (#120).
- **La validación de audiencia.** Un token que el realm emita a cualquier cliente lo acepta el
  backend: la validación por omisión mira emisor y vencimiento, no `aud`. Con un solo cliente el
  efecto es nulo; con dos deja de serlo, y hacen falta las dos mitades a la vez —un mapeador en el
  realm y un validador en `SeguridadWeb`—, porque media audiencia rechaza todos los tokens.
- El mecanismo que escribe la auditoría (disparadores o aspecto). Se decide con el primer caso de
  uso de escritura; ver [DAT-02 §4](../docs/40-datos/auditoria-e-historico.md).
- Las particiones de los ejercicios siguientes a 2027, y su automatización.
- El camino del portal del contribuyente (D-07).
