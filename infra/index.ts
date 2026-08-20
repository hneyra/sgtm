import { loadSettings, namespaceName, resourceName } from "./config";

/**
 * Composición única para los dos ambientes (`ADR-0011` §4).
 *
 * **Un solo `index.ts`.** Las diferencias entre `stg` y `prod` viven en los
 * `Pulumi.<ambiente>.yaml`, no aquí: si hubiera una rama por ambiente, la diferencia
 * dejaría de ser auditable y nadie podría afirmar que lo ensayado en `stg` se comporta
 * igual en `prod`. Los únicos condicionales admisibles son los que responden a una
 * **capacidad** declarada en configuración, no al nombre del ambiente.
 *
 * ## Este archivo todavía no crea ni un recurso, y es deliberado
 *
 * Es el andamio (issue #146): el árbol de Pulumi, la configuración leída y validada en
 * un solo sitio, y el `pulumi preview` que comenta en cada PR qué cambiaría. Mientras
 * `componentes/` esté vacía, `preview` **no necesita alcanzar el clúster**, que es lo
 * que permite correrlo en CI sin credenciales de escritura sobre el nodo.
 *
 * Lo que entra después, cada uno en su issue:
 *
 * | Componente | Issue |
 * |---|---|
 * | `BaseDeDatos.ts` — PostgreSQL con los cuatro roles, y `verificarAislamiento` contra esa instancia | #149 |
 * | `Migracion.ts` — migración e implantación como Jobs; `sgtm_owner` no entra en el Deployment | #150 |
 * | `Identidad.ts` — Keycloak en modo producción, con su base y su realm como código | #151 |
 * | `Aplicacion.ts` — perfiles `web` y `batch`, sondas y límites | #152 |
 * | `Ingreso.ts` — Traefik, TLS y el fin de los puertos publicados en claro | #153 |
 *
 * ## La frontera que hay que respetar cuando `Aplicacion.ts` exista
 *
 * **Pulumi define el despliegue; no la versión de la imagen** (`ADR-0011` §5). La
 * configuración declara `applicationImageRepository` **sin etiqueta**, y `config.ts`
 * se pone rojo si alguien le pone una. La etiqueta la pone el flujo de liberación
 * (issue #148), porque con la versión dentro del estado cada liberación es un
 * `pulumi up` y cada reversión también.
 */

const settings = loadSettings();
const env = settings.environment;

// Salidas del stack. Son lo único que `pulumi preview` tiene para enseñar mientras no
// haya componentes, y sirven de comprobante de que la configuración se leyó y se validó:
// si algo contradice la documentación, `loadSettings` ya lanzó y no se llega aquí.
export const environment = env;
export const namespace = namespaceName(env);
export const domain = settings.ingress.domain;
export const databaseResource = resourceName(env, "postgres");

/** El RPO, tal como quedó configurado. Se publica para poder comprobarlo desde fuera. */
export const walArchiveTimeoutSeconds = settings.backup.walArchiveTimeoutSeconds;

/** Si esta instalación marca todo documento que emite (`INF-03` §3.2). */
export const isDemonstration = settings.application.isDemonstration;
