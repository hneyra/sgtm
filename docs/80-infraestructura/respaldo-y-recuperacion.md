# INF-08 — Respaldo y recuperación

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-21 |
| Estado | Borrador |
| Decisión de origen | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md), issue #155 |
| RNF | RNF-076 (RPO), RNF-077 (RTO), RNF-079 (el respaldo se ensaya) |

Con un solo nodo, **la recuperación no es una conmutación: es una reconstrucción**
([`INF-01`](arquitectura-de-infraestructura.md) §1.1). No hay réplica que promover. Lo
único que separa una caída del VPS de la pérdida del padrón de una municipalidad es lo
que este documento describe.

[`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) eligió un
`Deployment` en vez de un operador como CloudNativePG, y escribió el costo antes de que
doliera: *«el archivado de WAL y el PITR de #155 son trabajo de este repositorio. Si
nadie los escribe, no existen, y el RPO de RNF-076 es una aspiración.»* Esto es esa
deuda pagada.

## 1. Las dos mitades

| | Qué es | Cada cuánto | Quién lo hace | Dónde vive el código |
|---|---|---|---|---|
| **Archivado continuo de WAL** | Cada segmento del registro de escritura, subido en cuanto se cierra | Al llenarse, y como mucho cada `archive_timeout` | El propio proceso `postgres`, por `archive_command` | [`componentes/BaseDeDatos.ts`](../../infra/componentes/BaseDeDatos.ts) |
| **Respaldo base** | Una copia completa del directorio de datos | Diario, 06:00 UTC (01:00 en Perú) | Un `CronJob` aparte | [`componentes/Respaldo.ts`](../../infra/componentes/Respaldo.ts) |

Las dos son necesarias y ninguna basta:

- **Solo respaldos base** = se pierde todo lo escrito desde el último. Con uno diario,
  hasta 24 horas de recaudación. RNF-076 fija el RPO en **5 minutos**.
- **Solo WAL** = restaurar significa reproducir el registro desde el principio de los
  tiempos. El RTO crecería sin límite.

`archive_timeout` **es el RPO escrito en configuración**: un segmento que no se llena se
cierra igualmente al vencer ese plazo, así que la pérdida máxima es ese plazo. `config.ts`
tiene una invariante que impide subirlo de 300 s, y su caso que la viola en
`config.test.ts` — subirlo no rompe nada visible y degrada el RPO en silencio, que es
exactamente el fallo que la invariante existe para impedir.

## 2. wal-g, y por qué su versión está fijada con su huella

[wal-g](https://github.com/wal-g/wal-g) hace las cuatro operaciones: `wal-push`,
`wal-fetch`, `backup-push` y `backup-fetch`. No viene en la imagen de PostgreSQL, y un
binario de ~64 MB no cabe en un `ConfigMap` —el límite práctico de `etcd` son ~1,5 MB por
objeto—, así que **no se puede montar como los guiones de inicialización**: lo descarga
un contenedor de inicialización que verifica su `sha256` contra el valor fijado en
`convenciones.ts` antes de dejarlo disponible.

El `sha256` se compara contra una constante del repositorio, **no solo contra el
`.sha256` que publica el proyecto**: los dos archivos salen del mismo release, así que un
release comprometido traería los dos comprometidos. Es la misma precaución que
`.github/actions/instalar-gitleaks/action.yml`.

Subir `WALG_VERSION` obliga a actualizar `WALG_SHA256` a la vez, y el simulacro de §5 lo
verifica: con una huella que no corresponde, se pone rojo antes de descargar nada más.

## 3. Quién respalda: `sgtm_respaldo`, y nadie más

Ni el superusuario ni `sgtm_owner`. Un rol propio, creado por
[`inicializacion/40-rol-de-respaldo.sh`](../../infra/componentes/inicializacion/40-rol-de-respaldo.sh),
con **exactamente** esto:

| Privilegio | Para qué | Qué pasa sin él |
|---|---|---|
| `pg_read_all_settings` | wal-g pregunta `data_directory` para encontrar `PGDATA` | `permission denied to examine "data_directory"` |
| `EXECUTE` sobre `pg_backup_start(text, boolean)` | Marcar el inicio del respaldo consistente | `permission denied for function pg_backup_start` |
| `EXECUTE` sobre `pg_backup_stop(boolean)` | Cerrarlo | Igual, al terminar |

Y nada más: `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`,
y **sin `CONNECT` sobre la base del padrón** —`pg_backup_start`/`stop` son operaciones del
clúster, no de una base—.

> **Ese conjunto se determinó ejecutando, no leyendo.** Se probó `wal-g backup-push`
> contra un PostgreSQL real quitando privilegios hasta dar con el mínimo que no falla.
> Dos hallazgos que la documentación no daba: **`REPLICATION` no hace falta** —wal-g lee
> los archivos del volumen, no usa el protocolo de replicación para esto—, y
> `pg_read_all_settings` **sí**, aunque no aparezca en ninguna guía de «privilegios para
> respaldar».

El motivo de que esto importe: el modo cómodo de arreglar un respaldo que falla es darle
superusuario al rol. Entonces el respaldo deja de ser un lector y pasa a ser una
credencial con poder total sobre el padrón de todas las municipalidades — y el síntoma no
aparece por ninguna parte, porque el respaldo funciona.
`verificaciones/motor/verificar-el-motor.sh` lo comprueba contra el motor en marcha.

El `CronJob` lleva **además** la credencial de `sgtm_owner`, y solo para una cosa:
escribir el resultado en la tabla `respaldo` (RF-126), que es lo que
[`V8__respaldo.sql`](../../backend/sgtm-esquema/src/main/resources/db/migration/V8__respaldo.sql)
declara que hace «el proceso de despliegue». Es la segunda excepción —estrecha y
nombrada— a «`sgtm_owner` solo en los dos Jobs», y `auditoria.ts` la lista explícitamente:
el `CronJob` de `lote`, que corre la misma imagen que la aplicación, sigue prohibido.

## 4. Cifrado, y dónde vive la clave

Todo —cada respaldo base y cada segmento de WAL— va cifrado con libsodium
(`WALG_LIBSODIUM_KEY`). La clave son 32 bytes en base64, la genera
`secretos/bootstrap-secretos.sh` como cualquier otro secreto de la aplicación, y **no está
en el estado de Pulumi** ([`INF-06`](gestion-de-secretos.md)).

**Rotarla no es rutina.** Un `ALTER ROLE` cambia una contraseña sin tocar nada del pasado;
cambiar esta clave deja ilegibles todos los respaldos escritos con la anterior. Por eso su
periodicidad en el inventario es `tras-incidente`, `rotar-clave.sh` la rechaza a propósito
—no es un rol de PostgreSQL—, y el procedimiento exige **conservar la clave vieja hasta
que caduque el último respaldo cifrado con ella**.

La única excepción a «Pulumi no crea secretos» son las credenciales del almacenamiento de
objetos (`backupAccessKeyId`/`backupSecretAccessKey`): `ADR-0011` §3 las clasifica como
secretos *de arranque de la infraestructura*, no de la aplicación —no abren el padrón de
ninguna municipalidad, solo dejan escribir en el contenedor de respaldo—, así que sí las
materializa `index.ts` en un `Secret` propio.

## 5. El simulacro, que es lo único que convierte esto en verificado

> **RNF-079: un respaldo que no se ha restaurado no cuenta como respaldo.**

[`respaldo/simulacro-de-restauracion.sh`](../../infra/respaldo/simulacro-de-restauracion.sh)
recorre el ciclo entero contra un PostgreSQL real, en cada PR que toque `infra/`:

1. Levanta el motor con la inicialización **del manifiesto** —los mismos guiones, incluido
   el que crea `sgtm_respaldo`—, con archivado continuo encendido.
2. Comprueba que `sgtm_respaldo` **no puede hacer DDL**, y toma el respaldo base con él.
3. Escribe deuda de **dos municipalidades**. Marca el instante: `T_BUENO`.
4. Escribe una fila más —la que hay que perder— y espera a que el WAL esté archivado,
   comprobando que `failed_count` sea 0.
5. Comprueba que **con la clave equivocada el respaldo no se puede leer**.
6. **Destruye el directorio de datos entero.** Arranca el cronómetro.
7. Restaura el respaldo base y reproduce el WAL **hasta `T_BUENO`, ni un segundo más**.
8. Comprueba que están las tres filas de `T_BUENO` y **no** la cuarta; que el total
   cuadra con el origen **al céntimo**; que las dos municipalidades siguen separadas con
   sus cifras; y que lo restaurado **se promueve y admite escrituras** — una copia que
   solo se lee no devuelve el servicio.

### 5.1 Cómo se demostró que puede fallar

Una verificación que no puede ponerse roja no protege nada. Estas seis se rompieron a
propósito y las seis lo pusieron rojo:

| Rotura | Qué pasó |
|---|---|
| Quitar `recovery_target_time` | Se restauraron **4 filas** y en `T_BUENO` había 3: la escritura mala sobrevivió |
| `archive_mode = off` | «el motor no tiene archive_mode=on», antes de respaldar nada |
| `sgtm_respaldo` como `SUPERUSER` | «puede crear tablas. El rol del respaldo lee, no escribe» |
| `WALG_SHA256` corrompido | «el sha256 de wal-g no coincide con el que fija convenciones.ts» |
| Quitar el `GRANT pg_read_all_settings` | «no puede leer data_directory; wal-g no encontraría PGDATA» |
| Dar `CONNECT` al padrón a `sgtm_respaldo` | «puede conectarse a la base del padrón, y no la necesita» |

La primera corre **en CI en cada PR**: el trabajo `simulacro` ejecuta el guion, luego le
quita `recovery_target_time` y **exige que falle**. Si pasara en verde, el simulacro no
estaría verificando el PITR.

### 5.2 Dos defectos que encontró el propio simulacro

Los dos habrían pasado una revisión de código sin que nadie los viera:

- **Un motor arrancado sin las variables de wal-g en su entorno falla el archivado en
  silencio.** `archive_command` es un proceso hijo del servidor y hereda su entorno; el
  primer intento reinició el motor sin ellas y los WAL se quedaron sin subir. El síntoma
  en producción sería un `failed_count` creciendo donde nadie mira, y un RPO que no
  existe.
- **La comprobación de cifrado dentro de la ventana cronometrada falseaba el tiempo
  medido**: 62 s frente a los 2 s reales, porque wal-g tarda en rendirse con una clave
  equivocada. Un RTO medido así es un RTO inventado.

## 6. Lo que sigue sin verificarse, y por qué

Decirlo es parte del trabajo: **el simulacro guarda en el sistema de archivos local
(`WALG_FILE_PREFIX`), no en el almacenamiento de objetos de `INF-01` §1.3.** Lo que queda
ejercitado es **el ciclo** —archivado, respaldo base, cifrado, PITR, verificación,
promoción— con el mismo binario, la misma versión y los mismos privilegios que el clúster.
Lo que queda **sin** ejercitar:

| Sin verificar | Qué haría falta |
|---|---|
| La red hasta el proveedor de objetos y sus credenciales | Un contenedor real. `stg`, contra el suyo |
| **El RTO de RNF-077** | Volumetría real. El número del simulacro (2 s con 4 filas) mide el **procedimiento**, no el tamaño, y el guion lo dice en su propia salida |
| El `CronJob` corriendo de verdad, con su `Secret` y su `PersistentVolumeClaim` | Un clúster con el volumen montado dos veces (motor en RW, `CronJob` en RO) |
| Que el aviso de fallo llegue a alguien | Issue #156: hoy el `POST` sale, pero no hay receptor |
| Que `stg` restaure desde los respaldos de `prod` con credencial de solo lectura | `INF-03` §2 y §4. Los dos VPS |

Ninguna de las cinco se puede resolver desde un PR: salen de un VPS real, que es
aprovisionamiento fuera de alcance. Lo que este issue deja hecho es que **el día que
exista el VPS, el procedimiento ya se sabe que funciona** — y no haya que averiguarlo el
día del incidente.

## 7. Documentos relacionados

[`INF-01`](arquitectura-de-infraestructura.md) §1.1 y §1.3 (un solo nodo; el respaldo,
fuera) · [`INF-03`](ambientes.md) §2 (dónde se ensaya la restauración) ·
[`INF-06`](gestion-de-secretos.md) (de dónde sale la clave de cifrado) ·
[`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) ·
[`infra/README.md`](../../infra/README.md)
