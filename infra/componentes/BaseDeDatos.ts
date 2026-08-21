import { commonLabels, resourceName, type Environment } from "../config";
import {
  BASE_DEL_PADRON,
  CLAVES,
  RECURSOS,
  nombreDePrioridad,
  secretos,
  servicioDeBaseDeDatos,
  sondaExec,
} from "./convenciones";
import { asignarClavesSh, baseDeKeycloakSh, crearRolesSql } from "./fuentes";
import type { ConfigMap, Deployment, Manifiesto, PersistentVolumeClaim, Service } from "./tipos";

/**
 * PostgreSQL en el clúster, con los cuatro roles y el aislamiento intactos (issue #149).
 *
 * No es «una base de datos en Kubernetes»: es la base sobre la que `verificarAislamiento`
 * tiene que seguir pasando, y la unica prueba de que sigue pasando es ejecutarla contra
 * ella.
 *
 * ## Deployment, y no un operador
 *
 * El issue pedia decidir entre **CloudNativePG** y un `Deployment` simple, con la
 * consecuencia escrita. Se elige el `Deployment`, y el costo se paga entero en el issue
 * de respaldos (#155):
 *
 * | | CloudNativePG | Deployment (lo elegido) |
 * |---|---|---|
 * | Archivado continuo de WAL y PITR | De fabrica | **Hay que escribirlo** (#155) |
 * | Roles del motor | Los gestiona el operador, con su propio modelo de `Secret`s | `crear-roles.sql`, el **mismo archivo** que ya usa el compose |
 * | Piezas que operar en el nodo | El operador, sus CRD y su webhook | Ninguna de mas |
 * | Recuperacion | `Cluster` restaurado por el operador | El procedimiento de #158, escrito a mano |
 *
 * Lo que inclina la decision no es la lista: es que **el aislamiento se verifica creando
 * los cuatro roles exactamente como los crea el compose** (`ADR-0011`, alternativas). Un
 * operador que gestiona roles con su propio modelo mete una segunda forma de crear
 * `sgtm_owner` y `sgtm_app`, y entonces lo que verifica `verificarAislamiento` en el
 * portatil deja de ser lo que corre en la municipalidad. Con un solo nodo, ademas, el
 * operador no da lo unico que justificaria su costo —conmutacion a una replica—, porque
 * no hay segundo nodo al que conmutar (`INF-01` §1.1).
 *
 * **La consecuencia, dicha antes de que duela:** el archivado de WAL y el PITR de #155
 * son trabajo de este repositorio. Si nadie los escribe, no existen, y el RPO de
 * RNF-076 es una aspiracion.
 *
 * ## Lo que no se reinventa
 *
 * Los dos guiones de inicializacion son **los archivos del repositorio**, no copias:
 * `crear-roles.sql` del modulo del esquema y `20-asignar-claves.sh` del compose. Corren
 * en orden alfabetico, una sola vez, cuando el volumen esta vacio — igual que en el
 * compose, porque una politica de `V6__rls.sql` los nombra y **un rol no puede crearse
 * a si mismo**.
 */

export interface BaseDeDatosArgs {
  environment: Environment;
  namespace: string;
  /** Imagen de PostgreSQL con su version fijada. Sale de `config.ts`. */
  image: string;
  /** Tamano del volumen. Es disco local del nodo: no crece solo (`INF-01` §5). */
  storageSize: string;
}

/** Dentro del volumen, y no en su raiz: `lost+found` de un ext4 impide el `initdb`. */
const DIRECTORIO_DE_DATOS = "/var/lib/postgresql/data/pgdata";

export function manifiestosDeBaseDeDatos(args: BaseDeDatosArgs): Manifiesto[] {
  const { environment, namespace, image, storageSize } = args;
  const nombre = servicioDeBaseDeDatos(environment);
  const etiquetas = commonLabels(environment, "postgres");
  const secreto = secretos(environment);

  const inicializacion: ConfigMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: resourceName(environment, "postgres-inicializacion"),
      namespace,
      labels: etiquetas,
    },
    data: {
      // El orden alfabetico es el orden de ejecucion. Es el mismo que en el compose.
      "10-crear-roles.sql": crearRolesSql(),
      "20-asignar-claves.sh": asignarClavesSh(),
      "30-base-de-keycloak.sh": baseDeKeycloakSh(),
    },
  };

  const volumen: PersistentVolumeClaim = {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    metadata: { name: resourceName(environment, "postgres-datos"), namespace, labels: etiquetas },
    spec: {
      // `ReadWriteOnce`, que es lo unico que da el almacenamiento local de un nodo, y
      // lo que obliga a `Recreate` mas abajo.
      accessModes: ["ReadWriteOnce"],
      resources: { requests: { storage: storageSize } },
    },
  };

  const motor: Deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: nombre, namespace, labels: etiquetas },
    spec: {
      replicas: 1,
      // `Recreate`, nunca `RollingUpdate`: el segundo pod montaria el mismo volumen
      // `ReadWriteOnce`, no conseguiria el bloqueo del directorio de datos y el
      // despliegue se quedaria colgado con la base parada. Cicatriz de `../iaac`,
      // anotada en `INF-01` §4.
      strategy: { type: "Recreate" },
      selector: { matchLabels: { app: nombre } },
      template: {
        metadata: { labels: { ...etiquetas, app: nombre } },
        spec: {
          priorityClassName: nombreDePrioridad(environment, "datos"),
          containers: [
            {
              name: "postgres",
              image,
              ports: [{ name: "postgres", containerPort: 5432 }],
              env: [
                { name: "POSTGRES_DB", value: BASE_DEL_PADRON },
                { name: "POSTGRES_USER", value: "postgres" },
                {
                  name: "POSTGRES_PASSWORD",
                  valueFrom: { secretKeyRef: { name: secreto.motor, key: CLAVES.superusuario } },
                },
                // Las lee `20-asignar-claves.sh`, que es el mismo guion del compose.
                {
                  name: "SGTM_CLAVE_OWNER",
                  valueFrom: { secretKeyRef: { name: secreto.owner, key: CLAVES.owner } },
                },
                {
                  name: "SGTM_CLAVE_APP",
                  valueFrom: { secretKeyRef: { name: secreto.aplicacion, key: CLAVES.aplicacion } },
                },
                {
                  name: "SGTM_CLAVE_IDENTIDAD",
                  valueFrom: {
                    secretKeyRef: { name: secreto.identidad, key: CLAVES.baseDeIdentidad },
                  },
                },
                { name: "PGDATA", value: DIRECTORIO_DE_DATOS },
              ],
              resources: RECURSOS.motor,
              volumeMounts: [
                { name: "datos", mountPath: "/var/lib/postgresql/data" },
                { name: "inicializacion", mountPath: "/docker-entrypoint-initdb.d", readOnly: true },
              ],
              // El arranque de un motor con un padron grande no es instantaneo, y
              // recuperarse de un corte lo es menos. `startupProbe` con 60 intentos da
              // hasta cinco minutos ANTES de que la sonda de vida empiece a contar.
              startupProbe: sondaExec(
                ["pg_isready", "--username=postgres", `--dbname=${BASE_DEL_PADRON}`],
                { periodSeconds: 5, failureThreshold: 60 },
              ),
              readinessProbe: sondaExec(
                ["pg_isready", "--username=postgres", `--dbname=${BASE_DEL_PADRON}`],
                { periodSeconds: 10, failureThreshold: 3 },
              ),
              livenessProbe: sondaExec(
                ["pg_isready", "--username=postgres", `--dbname=${BASE_DEL_PADRON}`],
                { periodSeconds: 20, failureThreshold: 5 },
              ),
            },
          ],
          volumes: [
            { name: "datos", persistentVolumeClaim: { claimName: volumen.metadata.name } },
            // 0o755 en decimal. Los guiones `.sh` de la inicializacion se ejecutan, y
            // el modo por omision de un `ConfigMap` (0644) los deja sin permiso de
            // ejecucion: el motor los ignoraria en silencio y la base arrancaria sin
            // claves asignadas.
            { name: "inicializacion", configMap: { name: inicializacion.metadata.name, defaultMode: 493 } },
          ],
        },
      },
    },
  };

  const servicio: Service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name: nombre, namespace, labels: etiquetas },
    spec: {
      // `ClusterIP`, y la auditoria lo exige: el puerto de PostgreSQL no se publica a
      // internet. Para administrar se usa el tunel SSH que ya usa CI (`INF-01` §1.4);
      // un `NodePort` «un momento, para depurar» es la frase que esta epica retira.
      type: "ClusterIP",
      selector: { app: nombre },
      ports: [{ name: "postgres", port: 5432, targetPort: 5432 }],
    },
  };

  return [inicializacion, volumen, motor, servicio];
}
