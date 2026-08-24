import * as k8s from "@pulumi/kubernetes";
import { auditarManifiestos, describirAuditoria } from "./auditoria";
import { construirManifiestos } from "./componentes";
import {
  CLAVES_DE_CREDENCIALES_DE_RESPALDO,
  secretoDeCredencialesDeRespaldo,
  secretos,
} from "./componentes/convenciones";
import { commonLabels, loadSettings, namespaceName, resourceName } from "./config";

/**
 * Composición única para los dos ambientes (`ADR-0011` §4).
 *
 * **Un solo `index.ts`.** Las diferencias entre `stg` y `prod` viven en los
 * `Pulumi.<ambiente>.yaml`, no aquí: si hubiera una rama por ambiente, la diferencia
 * dejaría de ser auditable y nadie podría afirmar que lo ensayado en `stg` se comporta
 * igual en `prod`. Los únicos condicionales admisibles son los que responden a una
 * **capacidad** declarada en configuración, no al nombre del ambiente.
 *
 * ## Cómo está montado
 *
 * Tres pasos, y el orden importa:
 *
 * 1. `loadSettings()` lee y valida la configuración. Un valor que falta revienta aquí,
 *    con su nombre y con para qué sirve.
 * 2. `construirManifiestos()` arma los objetos de Kubernetes de los cinco componentes
 *    de la fase B. Es una función pura: no crea recursos, no habla con el clúster.
 * 3. `auditarManifiestos()` los revisa contra las convenciones de `INF-01` §4 —sondas
 *    con `timeoutSeconds`, límites de recursos, `Recreate` sobre volumen, el `Secret`
 *    de `sgtm_owner` fuera del Deployment— y **lanza antes de crear nada**. Un `up` que
 *    falla al principio es mejor que uno que deja el ingreso a medias.
 *
 * Las mismas dos funciones las llaman las pruebas de `verificaciones/`, sin Pulumi y sin
 * clúster. Es lo que permite que un PR de cualquiera ponga rojo un despliegue mal
 * formado.
 *
 * ## La frontera con el flujo de liberación
 *
 * **Pulumi define el despliegue; no la versión que corre** (`ADR-0011` §5). El campo
 * `image` de los contenedores lleva `ignoreChanges`: Pulumi lo escribe al crear el
 * recurso y no vuelve a mirarlo. El flujo de liberación mueve la etiqueta con
 * `kubectl set image` —el mecanismo que #148 dejó demostrado—, y ni la liberación ni la
 * reversión ejecutan `pulumi up`. Sin `ignoreChanges`, el `preview` diario vería la
 * versión liberada como deriva y el siguiente `up` la desharía en silencio.
 *
 * ## Lo que este archivo NO crea: los `Secret` de la aplicación
 *
 * Ninguno. Las claves de `sgtm_owner`, de `sgtm_app`, del superusuario del motor, del
 * administrador de Keycloak y las de `sgtm_respaldo`/cifrado de wal-g **no están en el
 * estado de Pulumi** (`ADR-0011` §3): los manifiestos los referencian por nombre y
 * `secretos/bootstrap-secretos.sh` los pone (issue #154).
 *
 * **La única excepción, y deliberada:** las credenciales del almacenamiento de
 * objetos (`backupAccessKeyId`/`backupSecretAccessKey`). `ADR-0011` §3 las clasifica
 * como secretos de *arranque de la infraestructura* —lo que Pulumi necesita para
 * *crear* el mecanismo—, no de la aplicación: no abren el padrón de ninguna
 * municipalidad, solo dejan escribir en el contenedor de respaldo. Por eso, y solo
 * para este `Secret`, SÍ lo crea Pulumi con un valor real (issue #155).
 */

const settings = loadSettings();
const env = settings.environment;
const namespace = namespaceName(env);

const manifiestos = construirManifiestos(settings);

const problemas = auditarManifiestos(manifiestos, {
  secretoDeOwner: secretos(env).owner,
  namespace,
});
if (problemas.length > 0) {
  throw new Error(describirAuditoria(env, problemas));
}

/**
 * El proveedor de Kubernetes, contra el kubeconfig del stack.
 *
 * `enableServerSideApply` deja que el API server resuelva las fusiones de campos, que es
 * lo que permite que el flujo de liberación cambie `image` sin que Pulumi lo reclame
 * como suyo en el siguiente `up`.
 */
const proveedor = new k8s.Provider(resourceName(env, "kubernetes"), {
  kubeconfig: settings.kubeconfig,
  enableServerSideApply: true,
});

/**
 * El campo que el flujo de liberación mueve, y que Pulumi no vuelve a mirar.
 *
 * Se aplica a todo recurso con plantilla de pod. Un `Job` no lo necesita —su nombre
 * lleva la versión y uno nuevo se crea entero—, pero incluirlo no hace daño y evita
 * tener que acordarse de la excepción.
 */
const IGNORAR_LA_VERSION = ["spec.template.spec.containers[*].image"];

/**
 * Trae el `Namespace` entre sus 68 objetos (issue #158: encontrado reconstruyendo un
 * clúster de verdad desde cero, no en revisión).
 */
const recursos = new k8s.yaml.v2.ConfigGroup(
  resourceName(env, "sistema"),
  { objs: manifiestos },
  {
    provider: proveedor,
    transformations: [
      (args) => {
        if (args.type.startsWith("kubernetes:apps/v1:Deployment")) {
          return { props: args.props, opts: { ...args.opts, ignoreChanges: IGNORAR_LA_VERSION } };
        }
        return undefined;
      },
    ],
  },
);

/**
 * La única excepción de «Lo que este archivo NO crea» de arriba (issue #155).
 *
 * `stringData` en vez de `data`: Pulumi cifra el valor en su estado de todos modos —es
 * un `pulumi.Output` secreto—, y `stringData` evita tener que codificarlo a base64 a
 * mano. Kubernetes lo hace por su cuenta al aplicar el objeto.
 *
 * Sin `dependsOn` hacia `recursos` a propósito (issue #158): el `ConfigGroup` no se da
 * por creado hasta que **todos** sus Deployment quedan `Ready`, y `postgres` necesita
 * este mismo `Secret` para arrancar — depender de `recursos` es un círculo que nunca
 * se resuelve. Sin dependencia declarada, este `Secret` corre en paralelo al
 * `ConfigGroup`; si su primer intento llega antes que el `Namespace` (que el propio
 * `ConfigGroup` crea en sus primeros segundos), el proveedor reintenta la creación con
 * backoff — se observó tolerando bien más de un minuto — tiempo de sobra para que el
 * `Namespace` ya exista.
 */
new k8s.core.v1.Secret(
  resourceName(env, "postgres-respaldo-credenciales"),
  {
    metadata: {
      name: secretoDeCredencialesDeRespaldo(env),
      namespace,
      labels: commonLabels(env, "respaldo"),
    },
    type: "Opaque",
    stringData: {
      [CLAVES_DE_CREDENCIALES_DE_RESPALDO.accessKeyId]: settings.backupCredentials.accessKeyId,
      [CLAVES_DE_CREDENCIALES_DE_RESPALDO.secretAccessKey]: settings.backupCredentials.secretAccessKey,
    },
  },
  { provider: proveedor },
);

// Salidas del stack. Sirven de comprobante de que la configuración se leyó, se validó y
// los manifiestos pasaron la auditoría: si algo contradijera la documentación,
// `loadSettings` o `auditarManifiestos` ya habrían lanzado y no se llegaría aquí.
export const environment = env;
export const namespaceDelSistema = namespace;
export const domain = settings.ingress.domain;
export const databaseResource = resourceName(env, "postgres");

/** Cuántos objetos describe el stack. Cambia cuando cambia la forma del despliegue. */
export const objetosDelSistema = manifiestos.length;

/** El RPO, tal como quedó configurado. Se publica para poder comprobarlo desde fuera. */
export const walArchiveTimeoutSeconds = settings.backup.walArchiveTimeoutSeconds;

/** Si esta instalación marca todo documento que emite (`INF-03` §3.2). */
export const isDemonstration = settings.application.isDemonstration;

/**
 * La versión con la que se crearon los despliegues.
 *
 * **No es la que corre**: la que corre la pone el flujo de liberación y se lee del
 * clúster con `kubectl get deployment -o jsonpath='{...image}'`, que es lo que demuestra
 * el criterio 1 de #148. Se publica para poder comparar las dos.
 */
export const bootstrapVersion = settings.application.bootstrapVersion;

/** Los recursos aplicados, para que `pulumi stack` los enseñe agrupados. */
export const recursosDelSistema = recursos.urn;
