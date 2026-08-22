import { commonLabels, resourceName, type Environment } from "../config";
import type {
  Contenedor,
  MontajeDeVolumen,
  PriorityClass,
  Recursos,
  SecurityContext,
  Sonda,
  VariableDeEntorno,
  Volumen,
} from "./tipos";

/**
 * Lo que comparten los cinco componentes: nombres, prioridades, tamanos y sondas.
 *
 * Esta aqui por un motivo concreto y no por gusto de factorizar: **las convenciones de
 * `INF-01` §4 son las cuatro cosas que `../iaac` aprendio operando esta misma
 * combinacion**, y una convencion que cada componente escribe a su manera deja de ser
 * una convencion a la tercera vez que alguien la copia.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Secretos: se referencian por nombre, nunca por valor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los `Secret` que estos manifiestos **leen y no crean**.
 *
 * `ADR-0011` §3: las claves de `sgtm_owner`, de `sgtm_app` y del administrador de
 * Keycloak **no estan en el estado de Pulumi**. Estos manifiestos solo nombran el
 * `Secret` y la clave dentro de el; quien los pone es quien provisiona el ambiente, y
 * de donde salen de verdad lo decide el issue #154.
 *
 * La consecuencia hay que saberla: **`pulumi up` sobre un clúster donde estos secretos
 * no existan deja los pods esperando**, con el `Secret` ausente en el evento del pod.
 * Es preferible a la alternativa —generarlos aqui— porque una clave generada por
 * Pulumi vive en el estado de Pulumi, y esa clave abre el padron de todas las
 * municipalidades. Los pasos para crearlos estan en `infra/README.md`.
 */
export interface Secretos {
  /** Superusuario del motor. Solo lo usa el propio contenedor de PostgreSQL. */
  motor: string;
  /** `sgtm_owner`: DDL. Solo los dos Jobs y el CronJob de respaldo. Jamas el Deployment de la aplicacion. */
  owner: string;
  /** `sgtm_app`: la aplicacion. Sin DDL, sin `BYPASSRLS`, propietaria de nada. */
  aplicacion: string;
  /** Administrador de arranque de Keycloak, y la clave de su rol en el motor. */
  identidad: string;
  /**
   * `sgtm_respaldo` (issue #155) y la clave de cifrado de wal-g.
   *
   * Dos valores en el mismo `Secret`, igual que `identidad`. Ninguno de los dos es
   * DDL: `sgtm_respaldo` solo puede ejecutar `pg_backup_start`/`pg_backup_stop` —lo
   * minimo que wal-g necesita, comprobado contra un motor real, no `sgtm_owner` ni
   * el superusuario—, y la clave de cifrado nunca sale de este `Secret` y del propio
   * contenedor de PostgreSQL.
   */
  respaldo: string;
  /**
   * `sgtm_monitor` (issue #156): `pg_monitor`, el rol predefinido de PostgreSQL, y
   * nada de DDL. Lo usa el sidecar `postgres-exporter`, en el MISMO pod que el
   * motor —nunca un componente aparte—, asi que no necesita excepcion en
   * `auditoria.ts`.
   */
  monitoreo: string;
  /** Clave del administrador de Grafana (issue #156). Grafana nunca esta en una `IngressRoute`. */
  grafana: string;
}

export function secretos(environment: Environment): Secretos {
  return {
    motor: resourceName(environment, "postgres-superusuario"),
    owner: resourceName(environment, "postgres-owner"),
    aplicacion: resourceName(environment, "postgres-app"),
    identidad: resourceName(environment, "keycloak"),
    respaldo: resourceName(environment, "postgres-respaldo"),
    monitoreo: resourceName(environment, "postgres-monitoreo"),
    grafana: resourceName(environment, "grafana"),
  };
}

/** Las claves dentro de cada `Secret`. Se nombran una vez y se citan desde todas partes. */
export const CLAVES = {
  /** Clave del superusuario del motor. */
  superusuario: "clave-superusuario",
  /** Clave de `sgtm_owner`. */
  owner: "clave-owner",
  /** Clave de `sgtm_app`. */
  aplicacion: "clave-app",
  /** Clave del administrador de arranque de Keycloak. */
  administradorDeIdentidad: "clave-administrador",
  /** Clave del rol de Keycloak en PostgreSQL. */
  baseDeIdentidad: "clave-base",
  /** Clave de `sgtm_respaldo`. */
  respaldo: "clave-respaldo",
  /** Clave simetrica (libsodium, 32 bytes en base64) con que wal-g cifra el respaldo. */
  cifradoDeRespaldo: "clave-cifrado",
  /** Clave de `sgtm_monitor`. */
  monitoreo: "clave-monitoreo",
  /** Clave del administrador de Grafana. */
  grafana: "clave-admin",
} as const;

/**
 * El `Secret` con las credenciales del almacenamiento de objetos (issue #155).
 *
 * **La unica excepcion real a «Pulumi no crea secretos».** `backupAccessKeyId` y
 * `backupSecretAccessKey` SI viven cifrados en la configuracion del stack —
 * `ADR-0011` §3 los clasifica como secretos de *arranque de la infraestructura*, no
 * de la aplicacion: no abren el padron de ninguna municipalidad, solo dejan escribir
 * en el contenedor de respaldo—. Por eso, y solo para este `Secret`, es `index.ts`
 * quien lo crea con `k8s.core.v1.Secret`, en vez de `bootstrap-secretos.sh`. Los
 * componentes de aqui solo necesitan el nombre.
 */
export function secretoDeCredencialesDeRespaldo(environment: Environment): string {
  return resourceName(environment, "postgres-respaldo-credenciales");
}

/** Las claves del `Secret` de `secretoDeCredencialesDeRespaldo`. */
export const CLAVES_DE_CREDENCIALES_DE_RESPALDO = {
  accessKeyId: "access-key-id",
  secretAccessKey: "secret-access-key",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Prioridades: quien se queda cuando el nodo se queda sin memoria
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tres clases de prioridad, y el orden importa.
 *
 * `INF-01` §4: bajo presion de memoria el kubelet desaloja por orden de prioridad, y
 * **sin prioridades declaradas puede desalojar PostgreSQL para dejar sitio a la
 * interfaz**. Con un solo nodo no hay a donde mover la carga desalojada: lo unico que
 * decide quien sobrevive es este numero.
 */
export const PRIORIDADES = {
  /** El motor de datos. Lo ultimo que se desaloja. */
  datos: 1000,
  /** Lo que atiende a personas: la aplicacion, la interfaz y Keycloak. */
  servicio: 500,
  /**
   * Los Jobs. Lo primero que se desaloja, y a proposito: una emision masiva que
   * compite por memoria con la ventanilla tiene que perder ella.
   */
  lote: 100,
} as const;

export type Prioridad = keyof typeof PRIORIDADES;

export function nombreDePrioridad(environment: Environment, prioridad: Prioridad): string {
  return resourceName(environment, `prioridad-${prioridad}`);
}

export function clasesDePrioridad(environment: Environment): PriorityClass[] {
  const descripciones: Record<Prioridad, string> = {
    datos: "El motor de datos. Lo ultimo que se desaloja en un nodo bajo presion.",
    servicio: "Lo que atiende peticiones de personas: aplicacion, interfaz e identidad.",
    lote: "Trabajos de un solo uso. Lo primero que se desaloja.",
  };

  return (Object.keys(PRIORIDADES) as Prioridad[]).map((prioridad) => ({
    apiVersion: "scheduling.k8s.io/v1",
    kind: "PriorityClass",
    metadata: {
      name: nombreDePrioridad(environment, prioridad),
      labels: commonLabels(environment, "prioridades"),
    },
    value: PRIORIDADES[prioridad],
    globalDefault: false,
    description: descripciones[prioridad],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tamanos: los de INF-01 §2, en un solo sitio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ Estimaciones, no mediciones (`INF-01` §2). Se recalibran con la volumetria de la
 * municipalidad piloto, que hoy no existe porque D-01 esta abierta.
 */
export const RECURSOS = {
  motor: {
    requests: { cpu: "500m", memory: "2Gi" },
    limits: { cpu: "4", memory: "8Gi" },
  },
  aplicacionWeb: {
    requests: { cpu: "500m", memory: "1Gi" },
    limits: { cpu: "1", memory: "2Gi" },
  },
  aplicacionLote: {
    requests: { cpu: "1", memory: "1Gi" },
    limits: { cpu: "2", memory: "2Gi" },
  },
  interfaz: {
    requests: { cpu: "50m", memory: "64Mi" },
    limits: { cpu: "200m", memory: "128Mi" },
  },
  identidad: {
    requests: { cpu: "250m", memory: "512Mi" },
    limits: { cpu: "1", memory: "1Gi" },
  },
  /** Los contenedores de espera y los guiones de `psql`: minusculos, pero declarados. */
  auxiliar: {
    requests: { cpu: "10m", memory: "32Mi" },
    limits: { cpu: "200m", memory: "128Mi" },
  },
  /** `postgres-exporter`, `node-exporter`: solo leen y traducen, casi no piden nada. */
  exportador: {
    requests: { cpu: "10m", memory: "32Mi" },
    limits: { cpu: "100m", memory: "64Mi" },
  },
  /** Prometheus: guarda series en memoria antes de volcarlas a disco (issue #156). */
  prometheus: {
    requests: { cpu: "100m", memory: "256Mi" },
    limits: { cpu: "500m", memory: "1Gi" },
  },
  alertmanager: {
    requests: { cpu: "10m", memory: "32Mi" },
    limits: { cpu: "200m", memory: "128Mi" },
  },
  kubeStateMetrics: {
    requests: { cpu: "10m", memory: "64Mi" },
    limits: { cpu: "200m", memory: "256Mi" },
  },
  grafana: {
    requests: { cpu: "50m", memory: "128Mi" },
    limits: { cpu: "500m", memory: "512Mi" },
  },
  // `satisfies` y no una anotacion de tipo: asi `RECURSOS.motor` es un `Recursos` y no
  // un `Recursos | undefined`, y a la vez cada entrada se comprueba contra el tipo.
} satisfies Record<string, Recursos>;

// ─────────────────────────────────────────────────────────────────────────────
// Sondas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El `timeoutSeconds` de toda sonda de este repositorio.
 *
 * Tres segundos, no uno. El uno es el valor por omision del kubelet y es el que mata
 * contenedores sanos en un nodo ocupado (`INF-01` §4). La auditoria exige que este
 * entre 3 y 5: por debajo vuelve el problema, y por encima la sonda tarda tanto en
 * declarar un fallo real que deja de servir.
 */
export const ESPERA_DE_SONDA = 3;

export function sondaHttp(path: string, port: number, extra: Partial<Sonda> = {}): Sonda {
  return {
    httpGet: { path, port },
    timeoutSeconds: ESPERA_DE_SONDA,
    periodSeconds: 10,
    ...extra,
  };
}

export function sondaExec(command: string[], extra: Partial<Sonda> = {}): Sonda {
  return {
    exec: { command },
    timeoutSeconds: ESPERA_DE_SONDA,
    periodSeconds: 10,
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Endurecimiento de contenedores (issue #157)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lo que va en TODO contenedor, sin excepcion: nada de escalada de privilegios y
 * ninguna capacidad Linux de mas. A diferencia de `runAsNonRoot` —que algunas
 * imagenes no soportan sin ayuda, ver `seguridadSinRoot`—, estas dos no tienen
 * ningun motivo legitimo para faltar: ni siquiera el `entrypoint` de PostgreSQL,
 * que arranca como root, necesita escalar privilegios o una capacidad con nombre
 * para hacer su `chown` inicial.
 */
export function seguridadBase(extra: Partial<SecurityContext> = {}): SecurityContext {
  return {
    allowPrivilegeEscalation: false,
    capabilities: { drop: ["ALL"] },
    ...extra,
  };
}

/**
 * La misma base, mas `runAsNonRoot: true`: lo que usa casi todo contenedor de este
 * repositorio. Los que NO la usan lo dicen en su propio sitio, con el motivo —hoy,
 * solo el `entrypoint` del motor de PostgreSQL (`BaseDeDatos.ts`), que necesita
 * arrancar como root para tomar posesion del volumen antes de bajar privilegios.
 */
export function seguridadSinRoot(extra: Partial<SecurityContext> = {}): SecurityContext {
  return seguridadBase({ runAsNonRoot: true, ...extra });
}

// ─────────────────────────────────────────────────────────────────────────────
// Nombres de servicio y de base
// ─────────────────────────────────────────────────────────────────────────────

/** La base del padron. El nombre es el mismo que en el compose. */
export const BASE_DEL_PADRON = "sgtm";

/**
 * La base de Keycloak. **Separada**, no un esquema mas de la del padron.
 *
 * Keycloak hace DDL sobre su propia base en cada actualizacion menor; darle eso sobre
 * la base que sostiene RLS seria abrirle DDL al padron. Con base y rol propios, la
 * unica frontera que hay que vigilar es la del motor.
 */
export const BASE_DE_IDENTIDAD = "keycloak";

/** El rol con que Keycloak se conecta a su base. No es ninguno de los cuatro del SGTM. */
export const ROL_DE_IDENTIDAD = "keycloak";

export function servicioDeBaseDeDatos(environment: Environment): string {
  return resourceName(environment, "postgres");
}

/**
 * El volumen de datos del motor. Un solo sitio: lo monta `BaseDeDatos.ts` en
 * lectura-escritura y `Respaldo.ts` en **solo lectura** (issue #155) — wal-g lee
 * `PGDATA` directamente, y montarlo dos veces con el mismo nombre calculado por
 * separado es la clase de duplicacion que se desincroniza la primera vez que
 * alguien cambia uno de los dos sitios.
 */
export function volumenDeDatos(environment: Environment): string {
  return resourceName(environment, "postgres-datos");
}

export function servicioDeIdentidad(environment: Environment): string {
  return resourceName(environment, "identidad");
}

export function servicioDeAplicacion(environment: Environment): string {
  return resourceName(environment, "aplicacion");
}

export function servicioDeInterfaz(environment: Environment): string {
  return resourceName(environment, "interfaz");
}

/** URL JDBC de la base del padron, dentro del clúster. */
export function urlDelPadron(environment: Environment): string {
  return `jdbc:postgresql://${servicioDeBaseDeDatos(environment)}:5432/${BASE_DEL_PADRON}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Observabilidad: nombres de servicio (issue #156)
// ─────────────────────────────────────────────────────────────────────────────

export function servicioDePrometheus(environment: Environment): string {
  return resourceName(environment, "observabilidad-prometheus");
}

export function servicioDeAlertmanager(environment: Environment): string {
  return resourceName(environment, "observabilidad-alertmanager");
}

export function servicioDeNodeExporter(environment: Environment): string {
  return resourceName(environment, "observabilidad-node-exporter");
}

export function servicioDeKubeStateMetrics(environment: Environment): string {
  return resourceName(environment, "observabilidad-kube-state-metrics");
}

export function servicioDeGrafana(environment: Environment): string {
  return resourceName(environment, "observabilidad-grafana");
}

// ─────────────────────────────────────────────────────────────────────────────
// Identidad: el emisor es publico, el JWKS es interno
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keycloak cuelga de `/keycloak` del mismo dominio.
 *
 * No es una decision nueva: es la convencion que `publicar-imagenes.yml` ya usa para
 * compilar la interfaz de cada ambiente (`https://<dominio>/keycloak`), y la misma que
 * `../iaac`. Cambiarla aqui obligaria a reconstruir la imagen de la interfaz.
 */
export function emisorPublico(domain: string, realm: string): string {
  return `https://${domain}/keycloak/realms/${realm}`;
}

/**
 * De donde se traen las claves de firma. **Interno, y a proposito.**
 *
 * `issuer-uri` es una identidad: se compara con el `iss` del token y tiene que ser el
 * nombre publico. `jwk-set-uri` es una direccion de red: el backend va a buscar las
 * claves y le conviene no salir al ingreso para volver a entrar. Confundirlos cuesta
 * una tarde y produce un 401 mudo (issue #151).
 */
export function jwksInterno(environment: Environment, realm: string): string {
  const servicio = servicioDeIdentidad(environment);
  return `http://${servicio}:8080/keycloak/realms/${realm}/protocol/openid-connect/certs`;
}

// ─────────────────────────────────────────────────────────────────────────────
// wal-g: version fijada, y el binario que la descarga (issue #155)
// ─────────────────────────────────────────────────────────────────────────────

/** La version de wal-g. Subirla es un cambio deliberado, nunca una etiqueta movil. */
export const WALG_VERSION = "3.0.5";

/**
 * El sha256 del binario de esa version, verificado a mano al fijarla —descargado y
 * comprobado contra el `.sha256` que publica el propio proyecto en el mismo release,
 * la misma vez que se elige `WALG_VERSION`—. Se compara contra este valor y no solo
 * contra el `.sha256` publicado: es la misma precaucion que
 * `.github/actions/instalar-gitleaks/action.yml`, porque un release comprometido
 * traeria los dos archivos comprometidos a la vez.
 */
export const WALG_SHA256 = "b412489168a4ab74aaeb91c06e297573e3950599e839116177f196005e915d0f";

/** Imagen minima con `curl`, `tar` y `sha256sum` para el contenedor que lo descarga. */
export const IMAGEN_DE_DESCARGA = "curlimages/curl:8.11.0";

/** Donde queda el binario dentro del pod, en el volumen compartido `wal-g-bin`. */
export const WALG_DIRECTORIO = "/opt/wal-g";
export const WALG_BINARIO = `${WALG_DIRECTORIO}/wal-g`;

/**
 * El contenedor de inicializacion que descarga wal-g y verifica su checksum, antes de
 * que el contenedor principal —el motor, o el CronJob de respaldo— pueda usarlo.
 *
 * Un binario de unos 64 MB no cabe en un `ConfigMap` —el limite practico de `etcd`
 * son unos 1,5 MB por objeto—, asi que no se puede montar como los guiones de
 * `fuentes.ts`: hay que descargarlo al arrancar el pod, verificarlo, y dejarlo listo
 * en un volumen `emptyDir` que el contenedor principal monta de solo lectura.
 *
 * Comparten esto `BaseDeDatos.ts` y `Respaldo.ts`: el motor lo necesita para
 * `archive_command`/`restore_command`, y el CronJob de respaldo para `backup-push`.
 * Definirlo una vez es lo que evita que las dos copias de la logica de descarga se
 * separen la primera vez que alguien actualice `WALG_VERSION` en un solo sitio.
 */
export function contenedorDeDescargaDeWalg(): Contenedor {
  const url =
    `https://github.com/wal-g/wal-g/releases/download/v${WALG_VERSION}/` +
    "wal-g-pg-ubuntu-20.04-amd64.tar.gz";
  return {
    name: "wal-g-instalar",
    image: IMAGEN_DE_DESCARGA,
    command: ["/bin/sh", "-c"],
    args: [
      [
        "set -eu",
        `curl -fsSL -o /tmp/wal-g.tar.gz "${url}"`,
        // Verifica contra el sha256 fijado arriba, no contra un archivo descargado
        // en el mismo momento: eso solo comprobaria que la descarga no se corrompio
        // en transito, no que el release sea el que se audito al fijar la version.
        `echo "${WALG_SHA256}  /tmp/wal-g.tar.gz" | sha256sum -c -`,
        "tar -xzf /tmp/wal-g.tar.gz -C /tmp",
        `mv /tmp/wal-g-pg-ubuntu-20.04-amd64 ${WALG_BINARIO}`,
        `chmod +x ${WALG_BINARIO}`,
        "rm -f /tmp/wal-g.tar.gz",
      ].join(" && "),
    ],
    // `curlimages/curl` ya trae su propio usuario sin privilegios -`curl_user`-,
    // pero `runAsUser` SI hace falta nombrarlo (issue #157): la imagen fija ese
    // usuario por NOMBRE, no por numero, y el kubelet rechaza el contenedor sin
    // poder verificar que es no-root -"container has runAsNonRoot and image has
    // non-numeric user (curl_user), cannot verify user is non-root", encontrado en
    // CI-. 65534 no es necesariamente el UID real de `curl_user`, y no hace falta
    // que lo sea: el volumen que monta es un `emptyDir` -escribible por cualquier
    // UID por convencion del kubelet- y el resto de la tarea (`curl`, `sha256sum`,
    // `tar`, `chmod`, `mv`) no depende de poseer ningun archivo de la imagen.
    securityContext: seguridadSinRoot({ runAsUser: 65534 }),
    resources: RECURSOS.auxiliar,
    volumeMounts: [{ name: "wal-g-bin", mountPath: WALG_DIRECTORIO }],
  };
}

/** El volumen `emptyDir` que comparte el binario entre el contenedor de descarga y el que lo usa. */
export function volumenDeWalg(): Volumen {
  return { name: "wal-g-bin", emptyDir: {} };
}

/** Donde monta el binario el contenedor que YA no lo descarga: siempre de solo lectura. */
export function montajeDeWalg(): MontajeDeVolumen {
  return { name: "wal-g-bin", mountPath: WALG_DIRECTORIO, readOnly: true };
}

/**
 * Las variables de entorno de wal-g, en un solo sitio.
 *
 * Las usan tres procesos distintos: `archive_command`/`restore_command` del motor
 * (`BaseDeDatos.ts`) y `backup-push`/`delete` del CronJob de respaldo
 * (`Respaldo.ts`). Definirlas una vez es lo que impide que un cambio de proveedor de
 * almacenamiento se aplique en un sitio y se olvide en el otro.
 *
 * `WALG_S3_FORCE_PATH_STYLE=true` porque el proveedor del almacenamiento de objetos
 * todavia no esta decidido (`INF-01` §7): el estilo de ruta funciona contra
 * practicamente cualquier S3 compatible, y el virtual-hosted-style que asume AWS por
 * omision no funciona contra la mayoria de los que no son AWS.
 */
export function variablesWalg(args: {
  backup: { endpoint: string; bucket: string };
  credenciales: string;
  secretoDeRespaldo: string;
}): VariableDeEntorno[] {
  return [
    { name: "WALG_S3_PREFIX", value: `s3://${args.backup.bucket}` },
    { name: "AWS_ENDPOINT", value: args.backup.endpoint },
    { name: "WALG_S3_FORCE_PATH_STYLE", value: "true" },
    { name: "WALG_COMPRESSION_METHOD", value: "lz4" },
    {
      name: "AWS_ACCESS_KEY_ID",
      valueFrom: {
        secretKeyRef: { name: args.credenciales, key: CLAVES_DE_CREDENCIALES_DE_RESPALDO.accessKeyId },
      },
    },
    {
      name: "AWS_SECRET_ACCESS_KEY",
      valueFrom: {
        secretKeyRef: {
          name: args.credenciales,
          key: CLAVES_DE_CREDENCIALES_DE_RESPALDO.secretAccessKey,
        },
      },
    },
    // Cifra cada backup base y cada segmento de WAL. Nunca un valor literal: sale
    // del mismo `Secret` que genera `bootstrap-secretos.sh`, jamas de Pulumi.
    {
      name: "WALG_LIBSODIUM_KEY",
      valueFrom: { secretKeyRef: { name: args.secretoDeRespaldo, key: CLAVES.cifradoDeRespaldo } },
    },
  ];
}
