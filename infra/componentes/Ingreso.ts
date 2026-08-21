import { commonLabels, resourceName, type Environment } from "../config";
import { RUTA_DE_IDENTIDAD } from "./Identidad";
import { servicioDeAplicacion, servicioDeIdentidad, servicioDeInterfaz } from "./convenciones";
import type { HelmChartConfig, IngressRoute, Manifiesto, Middleware, TLSOption } from "./tipos";

/**
 * Traefik, TLS y el fin de los puertos publicados en claro (issue #153).
 *
 * Mientras esto no exista, la clave de un funcionario municipal viaja en texto plano por
 * la red de la municipalidad. Es el issue que retira la ultima parte de la frase del
 * README del compose.
 *
 * ## Se reconfigura el Traefik de k3s; no se instala otro
 *
 * k3s trae Traefik desplegado por su propio `HelmChart`. Lo que hace `HelmChartConfig`
 * es pasarle valores a **ese**: dos ingresos peleandose por el 443 es un rato entretenido
 * que no hace falta pasar. Es lo mismo que hace `../iaac`.
 *
 * ## El grupo de la API, que es la trampa
 *
 * Traefik v3 sirve `traefik.io/v1alpha1`. Un manifiesto con el grupo viejo
 * —`traefik.containo.us/v1alpha1`— se aplica **sin error** contra un clúster que ya no lo
 * sirve: se queda ahi, sin efecto, y la ruta simplemente no existe. Los tipos de
 * `tipos.ts` fijan el grupo correcto y la auditoria lo comprueba.
 *
 * ## Lo que este componente NO puede hacer
 *
 * **El cortafuegos del VPS no es un objeto de Kubernetes.** Cerrar todo lo que no sean
 * 22, 80 y 443 es configuracion del anfitrion, y Pulumi aqui habla con el API de k3s, no
 * con el sistema operativo. Va en `vps/cortafuegos.sh`, que se ejecuta al aprovisionar el
 * nodo, y la comprobacion de que ningun otro puerto responde desde fuera se hace desde
 * fuera —`verificaciones/cluster/puertos-desde-fuera.sh`—, que es el unico sitio desde
 * donde esa afirmacion significa algo.
 */

export interface IngresoArgs {
  environment: Environment;
  namespace: string;
  /** Nombre publico del sistema. De el cuelga el certificado. */
  domain: string;
  /** Donde Let's Encrypt avisa si el certificado no renueva. */
  acmeEmail: string;
  /** Emitir contra el entorno de pruebas de Let's Encrypt. Nunca en `prod`. */
  acmeStaging: boolean;
}

/** El resolvedor de certificados. Un nombre, usado en tres sitios. */
export const RESOLVEDOR = "letsencrypt";

/**
 * El entorno de pruebas de Let's Encrypt.
 *
 * `stg` emite contra el porque el limite de emision del entorno de produccion es de
 * cincuenta certificados por dominio registrado y semana, y un `pulumi up` que se repite
 * mientras se ajusta el ingreso los gasta en una tarde. El certificado que emite **no lo
 * acepta ningun navegador**: por eso `config.ts` prohibe esta bandera en `prod`.
 */
export const ACME_DE_PRUEBAS = "https://acme-staging-v02.api.letsencrypt.org/directory";

export function manifiestosDeIngreso(args: IngresoArgs): Manifiesto[] {
  const { environment, namespace, domain, acmeEmail, acmeStaging } = args;
  const etiquetas = commonLabels(environment, "ingreso");

  const configuracionDeTraefik: HelmChartConfig = {
    apiVersion: "helm.cattle.io/v1",
    kind: "HelmChartConfig",
    metadata: {
      name: "traefik",
      // El `HelmChart` que k3s gestiona vive en `kube-system`, y el
      // `HelmChartConfig` tiene que estar en el mismo namespace y con el mismo
      // nombre; en otro sitio, k3s no lo mira y el cambio no ocurre en silencio.
      namespace: "kube-system",
      labels: etiquetas,
    },
    spec: {
      valuesContent: valoresDeTraefik({ acmeEmail, acmeStaging }),
    },
  };

  const versionMinima: TLSOption = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "TLSOption",
    metadata: { name: resourceName(environment, "tls"), namespace, labels: etiquetas },
    spec: {
      // TLS 1.3, que es lo que el issue no negocia. Es mas estricto que el «1.2 como
      // minimo» de `INF-01` §3, y la consecuencia hay que saberla: un navegador
      // anterior a 2018 no entra. En una ventanilla municipal eso puede ser una
      // maquina real; si aparece, la decision se revisa **por escrito**, no aflojando
      // esta linea en un despliegue de urgencia.
      minVersion: "VersionTLS13",
      sniStrict: true,
    },
  };

  const limiteDeTasa: Middleware = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "Middleware",
    metadata: { name: resourceName(environment, "limite-de-tasa"), namespace, labels: etiquetas },
    spec: {
      rateLimit: {
        // Por direccion IP. Los numeros son generosos para una ventanilla y estrechos
        // para un raspado del padron: cien peticiones por minuto de media, con rafagas
        // de cincuenta para que cargar una pantalla con varias consultas no se penalice.
        average: 100,
        period: "1m",
        burst: 50,
        sourceCriterion: { ipStrategy: { depth: 1 } },
      },
    },
  };

  const limiteDeIdentidad: Middleware = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "Middleware",
    metadata: {
      name: resourceName(environment, "limite-de-identidad"),
      namespace,
      labels: etiquetas,
    },
    spec: {
      rateLimit: {
        // Mucho mas estrecho: lo que cuelga de `/keycloak` incluye el formulario de
        // acceso, y ahi el trafico legitimo es un puñado de peticiones por persona y
        // dia. Diez por minuto es holgado para entrar y estrecho para probar claves.
        average: 10,
        period: "1m",
        burst: 20,
        sourceCriterion: { ipStrategy: { depth: 1 } },
      },
    },
  };

  const tls = {
    certResolver: RESOLVEDOR,
    options: { name: versionMinima.metadata.name, namespace },
  };

  const interfaz: IngressRoute = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "IngressRoute",
    metadata: { name: resourceName(environment, "interfaz"), namespace, labels: etiquetas },
    spec: {
      entryPoints: ["websecure"],
      routes: [
        {
          match: `Host(\`${domain}\`)`,
          kind: "Rule",
          // La menor prioridad de las tres: es la ruta que recoge todo lo que no
          // cayo en las otras dos. Traefik ordena por longitud de la regla, y
          // declararlo evita depender de ese detalle.
          priority: 1,
          services: [{ name: servicioDeInterfaz(environment), port: 8080 }],
          middlewares: [{ name: limiteDeTasa.metadata.name }],
        },
      ],
      tls,
    },
  };

  const api: IngressRoute = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "IngressRoute",
    metadata: { name: resourceName(environment, "api"), namespace, labels: etiquetas },
    spec: {
      entryPoints: ["websecure"],
      routes: [
        {
          match: `Host(\`${domain}\`) && PathPrefix(\`/api/v1\`)`,
          kind: "Rule",
          priority: 20,
          services: [{ name: servicioDeAplicacion(environment), port: 8080 }],
          middlewares: [{ name: limiteDeTasa.metadata.name }],
        },
      ],
      tls,
    },
  };

  const identidad: IngressRoute = {
    apiVersion: "traefik.io/v1alpha1",
    kind: "IngressRoute",
    metadata: { name: resourceName(environment, "identidad"), namespace, labels: etiquetas },
    spec: {
      entryPoints: ["websecure"],
      routes: [
        {
          // La consola de administracion **no se publica**. La negacion es la parte
          // que importa de esta regla: sin ella, `/keycloak/admin` queda accesible
          // desde internet y la unica defensa seria la clave del administrador.
          // Quien administre entra por el tunel SSH, como para todo lo demas
          // (`INF-01` §1.4).
          match:
            `Host(\`${domain}\`) && PathPrefix(\`${RUTA_DE_IDENTIDAD}\`) ` +
            `&& !PathPrefix(\`${RUTA_DE_IDENTIDAD}/admin\`)`,
          kind: "Rule",
          priority: 20,
          services: [{ name: servicioDeIdentidad(environment), port: 8080 }],
          middlewares: [{ name: limiteDeIdentidad.metadata.name }],
        },
      ],
      tls,
    },
  };

  return [configuracionDeTraefik, versionMinima, limiteDeTasa, limiteDeIdentidad, interfaz, api, identidad];
}

/**
 * Los valores del `HelmChart` de Traefik.
 *
 * Se escriben como texto porque eso es lo que `HelmChartConfig` recibe: k3s los funde
 * con los valores por omision del chart. Las cuatro cosas que hay aqui son las cuatro
 * del criterio de aceptacion del issue.
 */
export function valoresDeTraefik(args: { acmeEmail: string; acmeStaging: boolean }): string {
  return [
    "# Generado por infra/componentes/Ingreso.ts. No editar en el nodo:",
    "# un cambio a mano lo deshace el siguiente `pulumi up` en silencio (ADR-0011 §6).",
    "ports:",
    "  web:",
    "    # 80 no coexiste con 443: redirige. Un formulario de acceso servido por HTTP",
    "    # es una credencial regalada. El desafio HTTP-01 sigue funcionando: Traefik",
    "    # atiende `/.well-known/acme-challenge/` antes de aplicar la redireccion.",
    "    redirectTo:",
    "      port: websecure",
    "      priority: 10",
    "  websecure:",
    "    tls:",
    "      enabled: true",
    `      certResolver: ${RESOLVEDOR}`,
    "persistence:",
    "  # `acme.json` en un volumen. Sin esto, reprogramar el pod hace que Traefik pida",
    "  # los certificados otra vez, y unas cuantas reprogramaciones chocan contra el",
    "  # limite de emision de Let's Encrypt: el sistema se queda sin certificado.",
    "  enabled: true",
    "  size: 128Mi",
    "  path: /data",
    "updateStrategy:",
    "  # Volumen `ReadWriteOnce` y una replica: `Recreate`, por lo mismo que la base de",
    "  # datos. Con `RollingUpdate` el pod nuevo espera un volumen que el viejo no",
    "  # suelta, y el despliegue se cuelga con el ingreso caido (INF-01 §4).",
    "  type: Recreate",
    "podSecurityContext:",
    "  # El volumen tiene que ser escribible por el usuario del contenedor de Traefik.",
    "  fsGroup: 65532",
    "certResolvers:",
    `  ${RESOLVEDOR}:`,
    `    email: ${args.acmeEmail}`,
    "    storage: /data/acme.json",
    "    httpChallenge:",
    "      entryPoint: web",
    ...(args.acmeStaging ? [`    caServer: ${ACME_DE_PRUEBAS}`] : []),
    "",
  ].join("\n");
}
