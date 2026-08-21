import { commonLabels, resourceName, type Environment } from "../config";
import type { PriorityClass, Recursos, Sonda } from "./tipos";

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
  /** `sgtm_owner`: DDL. Solo los dos Jobs. Jamas el Deployment de la aplicacion. */
  owner: string;
  /** `sgtm_app`: la aplicacion. Sin DDL, sin `BYPASSRLS`, propietaria de nada. */
  aplicacion: string;
  /** Administrador de arranque de Keycloak, y la clave de su rol en el motor. */
  identidad: string;
}

export function secretos(environment: Environment): Secretos {
  return {
    motor: resourceName(environment, "postgres-superusuario"),
    owner: resourceName(environment, "postgres-owner"),
    aplicacion: resourceName(environment, "postgres-app"),
    identidad: resourceName(environment, "keycloak"),
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
