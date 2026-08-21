/**
 * Los manifiestos que `infra/` produce, como datos planos.
 *
 * **Nada de `pulumi.Input` aqui**, y es la decision que sostiene todo lo demas de esta
 * carpeta: cada componente es una funcion pura que devuelve objetos corrientes, y la
 * capa de Pulumi los toma y los aplica. De ahi salen tres cosas que no se consiguen si
 * los componentes crean recursos directamente:
 *
 * 1. **La auditoria de `auditoria.ts` puede leerlos.** Un `Input<number>` no se compara
 *    con 3; un `number` si. Las convenciones de `INF-01` §4 —toda sonda con
 *    `timeoutSeconds`, todo contenedor con limites, `Recreate` sobre volumen— se
 *    verifican leyendo el manifiesto, no confiando en que quien lo escribio se acordo.
 * 2. **Las pruebas corren sin Pulumi y sin clúster.** `yarn verificar` no necesita
 *    token, ni túnel, ni VPS: es lo que permite que un PR de cualquiera ponga rojo un
 *    despliegue mal formado.
 * 3. **El diff de un cambio de infraestructura es legible.** Lo que cambia es un objeto,
 *    no una llamada a un constructor con quince opciones.
 *
 * El costo es perder el tipado del esquema de Kubernetes, que era medio motivo de
 * elegir TypeScript (`ADR-0011` §1). Se recupera entero en
 * `verificaciones/conformidad-con-kubernetes.test.ts`: alli cada manifiesto se asigna
 * al tipo de `@pulumi/kubernetes` que le corresponde, y un nombre de propiedad mal
 * escrito **no compila**.
 */

/** Metadatos comunes. `namespace` falta solo en los objetos de alcance de clúster. */
export interface Metadatos {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/** Referencia a una clave de un `Secret`. Es la unica forma en que entra una clave. */
export interface ReferenciaASecreto {
  secretKeyRef: { name: string; key: string };
}

export interface VariableDeEntorno {
  name: string;
  value?: string;
  valueFrom?: ReferenciaASecreto;
}

/**
 * Sonda. `timeoutSeconds` es obligatorio en el tipo, no opcional.
 *
 * El valor por omision del kubelet es **1 s** y en un nodo ocupado un contenedor sano
 * pero atareado no contesta en 1 s: tres fallos de la sonda de vida y lo mata con
 * codigo 143, que se parece a un OOM sin serlo. La cicatriz esta en `../iaac` y en
 * `INF-01` §4; aqui el tipo la hace imposible de olvidar, y la auditoria comprueba
 * ademas que el valor este entre 3 y 5 segundos.
 */
export interface Sonda {
  timeoutSeconds: number;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  failureThreshold?: number;
  successThreshold?: number;
  httpGet?: { path: string; port: number | string; scheme?: string };
  exec?: { command: string[] };
  tcpSocket?: { port: number | string };
}

export interface Recursos {
  requests: { cpu: string; memory: string };
  limits: { cpu: string; memory: string };
}

export interface MontajeDeVolumen {
  name: string;
  mountPath: string;
  subPath?: string;
  readOnly?: boolean;
}

export interface Contenedor {
  name: string;
  image: string;
  imagePullPolicy?: string;
  command?: string[];
  args?: string[];
  env?: VariableDeEntorno[];
  envFrom?: { secretRef: { name: string } }[];
  ports?: { name?: string; containerPort: number }[];
  resources: Recursos;
  volumeMounts?: MontajeDeVolumen[];
  startupProbe?: Sonda;
  readinessProbe?: Sonda;
  livenessProbe?: Sonda;
}

export interface Volumen {
  name: string;
  configMap?: { name: string; defaultMode?: number };
  secret?: { secretName: string; defaultMode?: number };
  persistentVolumeClaim?: { claimName: string };
  emptyDir?: Record<string, never>;
}

export interface EspecificacionDePod {
  restartPolicy?: string;
  priorityClassName: string;
  initContainers?: Contenedor[];
  containers: Contenedor[];
  volumes?: Volumen[];
}

export interface PlantillaDePod {
  metadata: { labels: Record<string, string> };
  spec: EspecificacionDePod;
}

export interface Namespace {
  apiVersion: "v1";
  kind: "Namespace";
  metadata: Metadatos;
}

export interface PriorityClass {
  apiVersion: "scheduling.k8s.io/v1";
  kind: "PriorityClass";
  metadata: Metadatos;
  value: number;
  globalDefault: false;
  description: string;
}

export interface ConfigMap {
  apiVersion: "v1";
  kind: "ConfigMap";
  metadata: Metadatos;
  data: Record<string, string>;
}

export interface PersistentVolumeClaim {
  apiVersion: "v1";
  kind: "PersistentVolumeClaim";
  metadata: Metadatos;
  spec: {
    accessModes: string[];
    resources: { requests: { storage: string } };
  };
}

export interface Service {
  apiVersion: "v1";
  kind: "Service";
  metadata: Metadatos;
  spec: {
    type: "ClusterIP";
    selector: Record<string, string>;
    ports: { name: string; port: number; targetPort: number | string }[];
  };
}

export interface Deployment {
  apiVersion: "apps/v1";
  kind: "Deployment";
  metadata: Metadatos;
  spec: {
    replicas: number;
    strategy: { type: "Recreate" | "RollingUpdate" };
    selector: { matchLabels: Record<string, string> };
    template: PlantillaDePod;
  };
}

export interface Job {
  apiVersion: "batch/v1";
  kind: "Job";
  metadata: Metadatos;
  spec: {
    backoffLimit: number;
    ttlSecondsAfterFinished?: number;
    template: PlantillaDePod;
  };
}

export interface CronJob {
  apiVersion: "batch/v1";
  kind: "CronJob";
  metadata: Metadatos;
  spec: {
    schedule: string;
    suspend?: boolean;
    concurrencyPolicy: "Forbid";
    successfulJobsHistoryLimit?: number;
    failedJobsHistoryLimit?: number;
    jobTemplate: { spec: { backoffLimit: number; template: PlantillaDePod } };
  };
}

/**
 * Recursos de Traefik v3.
 *
 * `traefik.io/v1alpha1`, y no `traefik.containo.us/v1alpha1`: el grupo cambio en
 * Traefik v3 y el manifiesto con el grupo viejo se aplica sin error contra un clúster
 * que ya no lo sirve — se queda ahi, sin efecto, y la ruta no existe. Es una de las
 * trampas anotadas en `../iaac`.
 */
export interface IngressRoute {
  apiVersion: "traefik.io/v1alpha1";
  kind: "IngressRoute";
  metadata: Metadatos;
  spec: {
    entryPoints: string[];
    routes: {
      match: string;
      kind: "Rule";
      priority?: number;
      services: { name: string; port: number }[];
      middlewares?: { name: string }[];
    }[];
    tls?: {
      certResolver: string;
      /** Referencia a un `TLSOption`. Es donde vive la version minima de TLS. */
      options?: { name: string; namespace: string };
    };
  };
}

/** Version minima de TLS y cifrados. Traefik lo aplica por ruta. */
export interface TLSOption {
  apiVersion: "traefik.io/v1alpha1";
  kind: "TLSOption";
  metadata: Metadatos;
  spec: { minVersion: string; sniStrict?: boolean };
}

export interface Middleware {
  apiVersion: "traefik.io/v1alpha1";
  kind: "Middleware";
  metadata: Metadatos;
  spec: Record<string, unknown>;
}

/**
 * `HelmChartConfig` de k3s: reconfigura el Traefik que el nodo ya trae de fabrica.
 *
 * No se instala otro Traefik: se le pasan valores al que k3s despliega solo, que es lo
 * que hace `../iaac` y lo que evita dos ingresos peleandose por el puerto 443.
 */
export interface HelmChartConfig {
  apiVersion: "helm.cattle.io/v1";
  kind: "HelmChartConfig";
  metadata: Metadatos;
  spec: { valuesContent: string };
}

export type Manifiesto =
  | Namespace
  | PriorityClass
  | ConfigMap
  | PersistentVolumeClaim
  | Service
  | Deployment
  | Job
  | CronJob
  | IngressRoute
  | Middleware
  | TLSOption
  | HelmChartConfig;

/** Los manifiestos que llevan pods dentro. La auditoria los recorre todos. */
export interface PodAuditable {
  /** De donde salio, para que el mensaje de la auditoria diga que hay que arreglar. */
  contexto: string;
  clase: "Deployment" | "Job" | "CronJob";
  pod: EspecificacionDePod;
  /** Las etiquetas de la plantilla. De ahi sale `componente`, que la auditoria mira. */
  etiquetas: Record<string, string>;
}

/** Extrae los pods de un manifiesto. Devuelve vacio si el manifiesto no lleva ninguno. */
export function podsDe(m: Manifiesto): PodAuditable[] {
  const nombre = `${m.kind}/${m.metadata.name}`;
  switch (m.kind) {
    case "Deployment":
      return [
        {
          contexto: nombre,
          clase: "Deployment",
          pod: m.spec.template.spec,
          etiquetas: m.spec.template.metadata.labels,
        },
      ];
    case "Job":
      return [
        {
          contexto: nombre,
          clase: "Job",
          pod: m.spec.template.spec,
          etiquetas: m.spec.template.metadata.labels,
        },
      ];
    case "CronJob":
      return [
        {
          contexto: nombre,
          clase: "CronJob",
          pod: m.spec.jobTemplate.spec.template.spec,
          etiquetas: m.spec.jobTemplate.spec.template.metadata.labels,
        },
      ];
    default:
      return [];
  }
}

/** Todo contenedor de un pod, los de inicializacion incluidos. */
export function contenedoresDe(pod: EspecificacionDePod): Contenedor[] {
  return [...(pod.initContainers ?? []), ...pod.containers];
}

/** Las sondas de un contenedor, con el nombre con que la auditoria las nombra. */
export function sondasDe(c: Contenedor): { nombre: string; sonda: Sonda }[] {
  const sondas: { nombre: string; sonda: Sonda }[] = [];
  if (c.startupProbe) sondas.push({ nombre: "startupProbe", sonda: c.startupProbe });
  if (c.readinessProbe) sondas.push({ nombre: "readinessProbe", sonda: c.readinessProbe });
  if (c.livenessProbe) sondas.push({ nombre: "livenessProbe", sonda: c.livenessProbe });
  return sondas;
}
