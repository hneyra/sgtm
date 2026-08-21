import {
  contenedoresDe,
  podsDe,
  sondasDe,
  type Contenedor,
  type Manifiesto,
} from "./componentes/tipos";

/**
 * Las convenciones de `INF-01` §4 y las no-negociables de la epica, verificadas sobre
 * los manifiestos.
 *
 * Es el equivalente en `infra/` de lo que el escaner de fuentes y ArchUnit son en el
 * backend: **una prohibicion que solo vive en un documento se incumple en seis meses.**
 * Cada regla de aqui viene de una frase escrita —`INF-01` §4, `ADR-0011` §3 y §5, o «lo
 * que no se negocia» de los issues #149 a #153— y cada una tiene en
 * `verificaciones/auditoria.test.ts` el manifiesto que la viola.
 *
 * Corre en dos sitios, a proposito:
 *
 * - En `yarn verificar`, sobre los manifiestos de los dos ambientes. Un PR que
 *   olvide un `timeoutSeconds` se pone rojo sin necesitar clúster.
 * - En `index.ts`, **antes** de crear ningun recurso. Si alguien llega a `pulumi up`
 *   con manifiestos que incumplen, el despliegue se detiene ahi: es preferible un
 *   `up` que falla al principio a uno que deja el ingreso a medias.
 *
 * Devuelve la lista de incumplimientos; vacia significa admisible. Pura, como
 * `checkInvariants`.
 */

/** Etiquetas que no fijan una version. La misma lista que vigila ESLint. */
const ETIQUETAS_MOVILES = ["latest", "main", "stable"];

/** Lo que el kubelet da por omision es 1 s, y ese es justo el valor que mata pods sanos. */
const ESPERA_MINIMA = 3;
const ESPERA_MAXIMA = 5;

/**
 * El unico pod que puede leer la clave de `sgtm_owner` sin ser un Job.
 *
 * Es el motor de datos, y la excepcion es estrecha a proposito: `sgtm_owner` **se crea
 * ahi**. El guion de inicializacion —el mismo que usa el compose— es quien le asigna la
 * clave, y para asignarla tiene que conocerla. Ese contenedor ya guarda ademas la del
 * superusuario, que puede mas que todas las demas juntas: darle tambien esta no amplia
 * nada.
 *
 * Lo que la regla persigue es otra cosa: que la clave de `sgtm_owner` no acabe en un
 * proceso **expuesto en HTTP**. La aplicacion, la interfaz y las tareas de lote no la
 * tienen ni con excusa (ARQ-03 §4, issue #150).
 */
const MOTOR = "postgres";

/** Objetos que no viven en un namespace. */
const SIN_NAMESPACE = ["Namespace", "PriorityClass"];

export interface ContextoDeAuditoria {
  /** El `Secret` con la clave de `sgtm_owner`. No puede aparecer fuera de los Jobs. */
  secretoDeOwner: string;
  /** El namespace del ambiente. Todo lo demas tiene que estar dentro. */
  namespace: string;
}

export function auditarManifiestos(
  manifiestos: Manifiesto[],
  contexto: ContextoDeAuditoria,
): string[] {
  const problemas: string[] = [];

  for (const m of manifiestos) {
    problemas.push(...auditarUbicacion(m, contexto));
    problemas.push(...auditarServicio(m));
    problemas.push(...auditarIngreso(m));

    for (const { contexto: donde, clase, pod, etiquetas } of podsDe(m)) {
      if (!pod.priorityClassName) {
        problemas.push(
          `${donde} no declara \`priorityClassName\`. INF-01 §4: bajo presion de memoria el ` +
            "kubelet desaloja por orden de prioridad, y sin prioridades declaradas puede " +
            "desalojar PostgreSQL para dejar sitio a la interfaz. Con un solo nodo no hay a " +
            "donde mover lo desalojado.",
        );
      }

      for (const c of contenedoresDe(pod)) {
        problemas.push(...auditarImagen(donde, c.name, c.image));
        problemas.push(...auditarRecursos(donde, c.name, c.resources));
        problemas.push(...auditarSondas(donde, c.name, c));
        problemas.push(...auditarKeycloak(donde, c.name, c.args ?? []));
        problemas.push(...auditarLaAplicacion(donde, c));
        if ((clase === "Deployment" || clase === "CronJob") && etiquetas["componente"] !== MOTOR) {
          problemas.push(...auditarSecretoDeOwner(donde, c, contexto));
        }
      }
    }

    problemas.push(...auditarEstrategia(m));
  }

  return problemas;
}

function auditarUbicacion(m: Manifiesto, contexto: ContextoDeAuditoria): string[] {
  if (SIN_NAMESPACE.includes(m.kind)) return [];
  // El `HelmChartConfig` es la excepcion declarada: k3s solo mira el que esta junto a
  // su `HelmChart`, en `kube-system`. Ponerlo en el namespace del SGTM no da error; da
  // silencio, que es peor.
  if (m.kind === "HelmChartConfig") {
    return m.metadata.namespace === "kube-system"
      ? []
      : [
          `${m.kind}/${m.metadata.name} no esta en «kube-system». k3s solo lee el ` +
            "HelmChartConfig que acompana a su HelmChart; en otro namespace se aplica sin " +
            "error y sin efecto, y el ingreso se queda con la configuracion por omision.",
        ];
  }
  return m.metadata.namespace === contexto.namespace
    ? []
    : [
        `${m.kind}/${m.metadata.name} esta en «${m.metadata.namespace ?? "(ninguno)"}» y no en ` +
          `«${contexto.namespace}». Un ambiente entero por namespace es lo que permite que el ` +
          "mismo `index.ts` sirva para los dos (ADR-0011 §4).",
      ];
}

function auditarImagen(donde: string, contenedor: string, image: string): string[] {
  const etiqueta = image.includes(":") ? image.slice(image.lastIndexOf(":") + 1) : "";
  if (etiqueta === "" || ETIQUETAS_MOVILES.includes(etiqueta)) {
    return [
      `${donde}, contenedor «${contenedor}»: la imagen «${image}» no fija una version. Una ` +
        "etiqueta movil convierte cualquier reinicio de pod en una actualizacion no " +
        "planificada, y en un solo nodo eso ocurre cada vez que se reinicia el VPS (INF-01 §5).",
    ];
  }
  return [];
}

function auditarRecursos(
  donde: string,
  contenedor: string,
  recursos: { requests?: { cpu?: string; memory?: string }; limits?: { cpu?: string; memory?: string } },
): string[] {
  const faltan: string[] = [];
  if (!recursos?.requests?.cpu || !recursos.requests.memory) faltan.push("requests");
  if (!recursos?.limits?.cpu || !recursos.limits.memory) faltan.push("limits");
  if (faltan.length === 0) return [];
  return [
    `${donde}, contenedor «${contenedor}»: sin ${faltan.join(" ni ")} de recursos. INF-01 §4: ` +
      "toda carga los declara. Sin ellos el planificador no puede reservar nada y el kubelet " +
      "desaloja a ciegas, que en un nodo unico es la diferencia entre perder un Job y perder " +
      "la base de datos.",
  ];
}

function auditarSondas(
  donde: string,
  contenedor: string,
  c: Parameters<typeof sondasDe>[0],
): string[] {
  const problemas: string[] = [];
  for (const { nombre, sonda } of sondasDe(c)) {
    if (sonda.timeoutSeconds < ESPERA_MINIMA || sonda.timeoutSeconds > ESPERA_MAXIMA) {
      problemas.push(
        `${donde}, contenedor «${contenedor}»: la \`${nombre}\` tiene ` +
          `\`timeoutSeconds: ${sonda.timeoutSeconds}\`, fuera de ${ESPERA_MINIMA}–${ESPERA_MAXIMA}. ` +
          "El valor por omision del kubelet es 1 s: en un nodo ocupado un contenedor sano pero " +
          "atareado no contesta en 1 s, tres fallos de la sonda de vida lo matan, y el codigo " +
          "de salida es 143 —no OOM—, asi que la investigacion empieza en el sitio equivocado.",
      );
    }
  }
  return problemas;
}

function auditarSecretoDeOwner(
  donde: string,
  c: Contenedor,
  contexto: ContextoDeAuditoria,
): string[] {
  const usa =
    (c.env ?? []).some((e) => e.valueFrom?.secretKeyRef.name === contexto.secretoDeOwner) ||
    (c.envFrom ?? []).some((e) => e.secretRef.name === contexto.secretoDeOwner);
  if (!usa) return [];
  return [
    `${donde} monta «${contexto.secretoDeOwner}», el Secret de sgtm_owner. Ese Secret entra ` +
      "SOLO en los dos Jobs, de migracion y de implantacion (issue #150). Ni «para migrar al " +
      "arrancar», ni «para una carga rapida»: darle DDL sobre el padron de todas las " +
      "municipalidades a un proceso expuesto en HTTP es lo que ARQ-03 §4 excluye.",
  ];
}

/**
 * Las tres cosas que el propio sistema exige de si mismo, leidas del manifiesto.
 *
 * Son las comprobaciones 7 y 8 de `despliegue.yml` dichas antes de desplegar. Contra el
 * clúster se comprueban de nuevo, y contra el proceso en marcha —que es donde valen de
 * verdad—, en `verificaciones/cluster/`.
 */
function auditarLaAplicacion(donde: string, c: Contenedor): string[] {
  const problemas: string[] = [];
  const variables = new Map((c.env ?? []).map((e) => [e.name, e.value]));

  const usuario = variables.get("SGTM_DB_USUARIO");
  if (usuario !== undefined && usuario !== "sgtm_app") {
    problemas.push(
      `${donde}, contenedor «${c.name}»: se conecta a la base como «${usuario}». La aplicacion ` +
        "se conecta SIEMPRE como `sgtm_app`: sin DDL, sin BYPASSRLS, sin ser propietaria de " +
        "las tablas (ARQ-03 §4). Las credenciales de sgtm_owner solo existen en los dos Jobs.",
    );
  }

  const perfil = variables.get("SPRING_PROFILES_ACTIVE");
  if (perfil === "web" && !variables.has("SGTM_OIDC_EMISOR")) {
    problemas.push(
      `${donde}, contenedor «${c.name}»: perfil \`web\` sin \`SGTM_OIDC_EMISOR\`. Sin esa ` +
        "variable " +
        "la aplicacion se niega a arrancar, y es deliberado: un backend que atiende peticiones " +
        "sin poder validar un token responde a la sonda, se declara sano y no atiende a nadie " +
        "(ADR-0005). No se «arregla» con un valor por omision en el manifiesto.",
    );
  }

  if (perfil === "batch" && (c.ports ?? []).length > 0) {
    problemas.push(
      `${donde}, contenedor «${c.name}»: perfil \`batch\` con puertos declarados. El perfil ` +
        "batch " +
        "no atiende HTTP —`web-application-type: none`—: un puerto ahi es una superficie que " +
        "nadie pidio.",
    );
  }

  return problemas;
}

function auditarKeycloak(donde: string, contenedor: string, args: string[]): string[] {
  if (!args.includes("start-dev")) return [];
  return [
    `${donde}, contenedor «${contenedor}»: arranca con \`start-dev\`. Ese modo guarda la base ` +
      "de Keycloak DENTRO del contenedor: el dia que el pod se reprograme se van con el los " +
      "usuarios de la municipalidad (issue #151). Es lo correcto en el compose y lo incorrecto " +
      "aqui.",
  ];
}

function auditarEstrategia(m: Manifiesto): string[] {
  if (m.kind !== "Deployment") return [];
  const montaVolumen = (m.spec.template.spec.volumes ?? []).some(
    (v) => v.persistentVolumeClaim !== undefined,
  );
  if (!montaVolumen || m.spec.strategy.type === "Recreate") return [];
  return [
    `Deployment/${m.metadata.name} monta un volumen persistente y usa ` +
      `\`${m.spec.strategy.type}\`. INF-01 §4: con \`ReadWriteOnce\` el pod nuevo monta el mismo ` +
      "volumen que el viejo todavia tiene, no consigue el bloqueo del directorio de datos y el " +
      "despliegue se queda colgado con la base parada. Va `Recreate`.",
  ];
}

function auditarServicio(m: Manifiesto): string[] {
  if (m.kind !== "Service") return [];
  if (m.spec.type === "ClusterIP") return [];
  return [
    `Service/${m.metadata.name} es de tipo «${m.spec.type}». INF-01 §1.4: desde internet ` +
      "responden 80 —que solo redirige— y 443, y nada mas. El acceso administrativo es por " +
      "tunel SSH; publicar el puerto de PostgreSQL o el de Keycloak «un momento, para depurar» " +
      "es la frase del README del compose que esta epica existe para retirar.",
  ];
}

function auditarIngreso(m: Manifiesto): string[] {
  const problemas: string[] = [];

  if (m.kind === "IngressRoute") {
    if (!m.spec.entryPoints.includes("websecure") || m.spec.entryPoints.includes("web")) {
      problemas.push(
        `IngressRoute/${m.metadata.name} atiende en ${m.spec.entryPoints.join(", ")}. Toda ruta ` +
          "va por `websecure`: 80 redirige, no coexiste. Un formulario de acceso servido por " +
          "HTTP es una credencial regalada (issue #153).",
      );
    }
    if (m.spec.tls === undefined) {
      problemas.push(
        `IngressRoute/${m.metadata.name} no declara TLS. Sin resolvedor de certificado, la ruta ` +
          "se sirve con el certificado por omision de Traefik —uno propio— y el navegador lo " +
          "rechaza (RNF-074).",
      );
    }
    for (const ruta of m.spec.routes) {
      if (ruta.match.includes("/keycloak") && !ruta.match.includes("!PathPrefix(`/keycloak/admin`)")) {
        problemas.push(
          `IngressRoute/${m.metadata.name} publica «${ruta.match}», que incluye la consola de ` +
            "administracion de Keycloak. No se publica (issue #153): quien administre entra por " +
            "el tunel SSH. Expuesta, la unica defensa es la clave del administrador.",
        );
      }
    }
  }

  // Leido a traves de una vista ensanchada, y no del tipo estrecho: en `tipos.ts` el
  // `apiVersion` de los recursos de Traefik es un literal, asi que TypeScript sabe que
  // no puede ser otro y estrecha la comparacion a `never`. Eso es exactamente lo que se
  // quiere del tipo —el grupo correcto no se puede escribir mal— y, a la vez, deja la
  // regla sin nada que comprobar. Sigue aqui porque un manifiesto puede llegar de
  // fuera del constructor, y porque una regla que solo vive en el tipo no protege al
  // que arma un objeto con un `as`.
  const generico = m as { kind: string; apiVersion: string; metadata: { name: string } };
  if (
    ["IngressRoute", "Middleware", "TLSOption"].includes(generico.kind) &&
    generico.apiVersion !== "traefik.io/v1alpha1"
  ) {
    problemas.push(
      `${generico.kind}/${generico.metadata.name} usa «${generico.apiVersion}». Traefik v3 ` +
        "sirve `traefik.io/v1alpha1`; con el grupo viejo el manifiesto se aplica SIN ERROR " +
        "contra un clúster que ya no lo sirve, se queda ahi sin efecto, y la ruta simplemente " +
        "no existe.",
    );
  }

  return problemas;
}

/** Compone el mensaje de un despliegue que contradice sus propias convenciones. */
export function describirAuditoria(environment: string, problemas: string[]): string {
  return (
    `Los manifiestos de «${environment}» incumplen las convenciones de INF-01 §4:\n` +
    problemas.map((p) => `  · ${p}`).join("\n")
  );
}
