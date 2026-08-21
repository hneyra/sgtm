import { createHash } from "node:crypto";
import { commonLabels, resourceName, type Environment } from "../config";
import {
  BASE_DE_IDENTIDAD,
  CLAVES,
  RECURSOS,
  ROL_DE_IDENTIDAD,
  nombreDePrioridad,
  secretos,
  servicioDeBaseDeDatos,
  servicioDeIdentidad,
  sondaHttp,
} from "./convenciones";
import { realmSgtmJson, reconciliarRealmSh } from "./fuentes";
import type { ConfigMap, Deployment, Job, Manifiesto, Service } from "./tipos";

/**
 * Keycloak en modo produccion, con su base y su realm como codigo (issue #151).
 *
 * Hoy el compose corre `start-dev`, que **guarda su base dentro del contenedor**: el dia
 * que ese contenedor se reprograme se van con el los usuarios de la municipalidad. Aqui
 * corre `start`, contra la base `keycloak` del mismo motor —separada de la del padron,
 * con su propio rol— que crea la inicializacion del motor.
 *
 * ## El realm: `partialImport`, no `--import-realm`
 *
 * El issue pedia decidir entre seguir importando en el arranque o gestionar el realm
 * como codigo. Se elige **gestionarlo**, con un Job que reconcilia, y el motivo es que
 * la otra opcion no cumple el criterio de aceptacion:
 *
 * | | `--import-realm` | Proveedor de Pulumi | Job de reconciliacion (lo elegido) |
 * |---|---|---|---|
 * | Un cambio del realm llega al clúster | **No.** Solo la primera vez | Si | Si, cuando el contenido cambia |
 * | Necesita alcanzar Keycloak desde CI | No | **Si**, y en un clúster recien creado eso exige que ACME ya haya emitido | No: corre dentro |
 * | Usuarios de la municipalidad | Los conserva | Los conserva | Los conserva: `OVERWRITE` reemplaza el cliente, no el realm |
 * | Piezas nuevas que operar | Ninguna | El proveedor de Keycloak y sus credenciales de administracion en CI | Un Job |
 *
 * `../iaac` gestiona realms con `@pulumi/keycloak`, y es el precedente que el issue
 * cita. Se aparta aqui por la segunda fila: alli el proveedor de identidad ya existia
 * cuando se escribio el stack; aqui **Keycloak lo crea el mismo `pulumi up`** que
 * necesitaria hablar con el, y un clúster desde cero exigiria una segunda pasada. El
 * apartamiento tiene su costo: **la deteccion de deriva no ve el realm**. Si alguien
 * edita un cliente en la consola de administracion, el `preview` diario no lo nota; lo
 * nota el Job la proxima vez que corra, porque lo sobreescribe.
 *
 * ## El emisor es una identidad, no una direccion de red
 *
 * `KC_HOSTNAME` es el nombre **publico** —`https://<dominio>/keycloak`—, y de el sale el
 * `iss` de cada token. Ponerle el nombre interno del servicio deja la firma valida y el
 * `iss` sin cuadrar: todo el sistema devuelve 401 sin decir por que. Es la
 * demostracion que pide el issue, y la razon de que el nombre publico se calcule en
 * `convenciones.ts` a partir del `domain` del stack y no se escriba dos veces.
 */

export interface IdentidadArgs {
  environment: Environment;
  namespace: string;
  /** Imagen de Keycloak con su version fijada. */
  image: string;
  /** Realm que emite los tokens del SGTM. */
  realm: string;
  /** Nombre publico del sistema. De el sale el emisor. */
  domain: string;
  /**
   * Sembrar el cliente de verificacion, el que permite pedir un token sin navegador.
   *
   * Solo `stg`. Es lo que hace posible recorrer la escalera de identidad contra el
   * clúster; en `prod`, un cliente con concesion directa de credenciales es una puerta
   * que nadie necesita (`INF-03` §4).
   */
  clienteDeVerificacion: boolean;
}

/** El cliente que existe solo para que CI consiga un token sin navegador. */
export const CLIENTE_DE_VERIFICACION = "sgtm-verificacion";

/** El cliente con el que entran las personas. */
export const CLIENTE_DEL_BACKOFFICE = "sgtm-backoffice";

/** Ruta bajo la que cuelga Keycloak. La comparte con `publicar-imagenes.yml`. */
export const RUTA_DE_IDENTIDAD = "/keycloak";

interface MapeadorDeProtocolo {
  name: string;
  protocol: string;
  protocolMapper: string;
  config: Record<string, string>;
}

interface ClienteDelRealm {
  clientId: string;
  redirectUris?: string[];
  webOrigins?: string[];
  protocolMappers?: MapeadorDeProtocolo[];
  [clave: string]: unknown;
}

interface RealmVersionado {
  realm: string;
  clients?: ClienteDelRealm[];
  components?: Record<string, { config?: Record<string, string[]> }[]>;
  [clave: string]: unknown;
}

/**
 * Los tres documentos que el Job aplica, derivados del realm versionado.
 *
 * Se derivan aqui, en TypeScript, y no con `jq` dentro del contenedor: la imagen de
 * Keycloak no trae `jq` ni `curl`, y —lo que importa mas— derivarlos aqui los deja
 * cubiertos por `verificaciones/componentes.test.ts`. Quitar el mapeador de
 * `municipalidad_id` del archivo versionado pone rojas las pruebas antes de llegar a
 * ningun clúster.
 */
export interface DocumentosDelRealm {
  /** Los ajustes del realm: nombre, vigencias, si admite registro. Sin clientes. */
  realm: string;
  /** El perfil de usuario, de donde sale el atributo `municipalidad_id`. */
  perfilDeUsuario: string;
  /** Carga de `partialImport`: los clientes con sus mapeadores. */
  clientes: string;
  /** Los `clientId` que el Job comprueba al terminar. */
  clientesComprobados: string[];
}

export function documentosDelRealm(args: {
  domain: string;
  realm: string;
  clienteDeVerificacion: boolean;
}): DocumentosDelRealm {
  const versionado = JSON.parse(realmSgtmJson()) as RealmVersionado;

  const { clients = [], components = {}, ...ajustes } = versionado;

  const clientes = clients
    // En `prod` no entra el cliente de verificacion. Lo decide la configuracion del
    // stack, no el nombre del ambiente.
    .filter((c) => args.clienteDeVerificacion || c.clientId !== CLIENTE_DE_VERIFICACION)
    .map((c) => ({
      ...c,
      // El realm versionado trae las redirecciones del compose —`localhost:5173`,
      // `localhost:8081`—, que en el clúster no valen y en `prod` serian ademas un
      // destino de redireccion que nadie controla. Se reescriben con el dominio del
      // ambiente; una redireccion a localhost en `prod` la caza la prueba.
      ...(c.redirectUris && c.redirectUris.length > 0
        ? { redirectUris: [`https://${args.domain}/*`] }
        : {}),
      ...(c.webOrigins && c.webOrigins.length > 0
        ? { webOrigins: [`https://${args.domain}`] }
        : {}),
    }));

  const perfil =
    components["org.keycloak.userprofile.UserProfileProvider"]?.[0]?.config?.[
      "kc.user.profile.config"
    ]?.[0];
  if (perfil === undefined) {
    throw new Error(
      "El realm versionado no trae el perfil de usuario declarativo. De ahi sale el " +
        "atributo `municipalidad_id`, y sin el el mapeador leeria un atributo que el " +
        "realm no admite: el claim saldria vacio y el backend responderia 403 " +
        "SIN_MUNICIPALIDAD sin decir por que.",
    );
  }

  return {
    // `displayName` se reescribe: el del archivo versionado dice «marcha blanca», que es
    // lo que el compose levanta. Es lo primero que se lee en la pantalla de acceso, y en
    // la instalacion de una municipalidad seria mentira —o peor, una explicacion que
    // nadie pidio—. La marca de instalacion de demostracion es otra cosa, y va en los
    // documentos que el sistema emite (INF-03 §3.2), no en el formulario de entrada.
    realm: JSON.stringify(
      { ...ajustes, realm: args.realm, displayName: "SGTM" },
      null,
      2,
    ),
    perfilDeUsuario: perfil,
    // `OVERWRITE` reemplaza el cliente, no el realm: los usuarios no se tocan.
    clientes: JSON.stringify({ ifResourceExists: "OVERWRITE", clients: clientes }, null, 2),
    clientesComprobados: clientes.map((c) => c.clientId),
  };
}

export function manifiestosDeIdentidad(args: IdentidadArgs): Manifiesto[] {
  const { environment, namespace, image, realm, domain, clienteDeVerificacion } = args;
  const nombre = servicioDeIdentidad(environment);
  const etiquetas = commonLabels(environment, "identidad");
  const secreto = secretos(environment);

  const documentos = documentosDelRealm({ domain, realm, clienteDeVerificacion });

  const configuracionDelRealm: ConfigMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { name: resourceName(environment, "realm"), namespace, labels: etiquetas },
    data: {
      "realm.json": documentos.realm,
      "perfil-de-usuario.json": documentos.perfilDeUsuario,
      "clientes.json": documentos.clientes,
      "reconciliar-realm.sh": reconciliarRealmSh(),
    },
  };

  const identidad: Deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: nombre, namespace, labels: etiquetas },
    spec: {
      // Una replica: la sesion y las claves de firma viven en su base, asi que el pod
      // se puede reprogramar sin perderlas —que es el criterio de aceptacion del
      // issue—, pero dos replicas exigirian agrupamiento y en un solo nodo eso es
      // complejidad sin disponibilidad.
      replicas: 1,
      strategy: { type: "Recreate" },
      selector: { matchLabels: { app: nombre } },
      template: {
        metadata: { labels: { ...etiquetas, app: nombre } },
        spec: {
          priorityClassName: nombreDePrioridad(environment, "servicio"),
          containers: [
            {
              name: "keycloak",
              image,
              // `start`, no `start-dev`. Y sin `--import-realm`: el realm lo aplica el
              // Job de abajo, que si llega despues del primer arranque.
              // Sin `--optimized`: esa bandera exige una imagen construida de antemano
              // con `kc.sh build --db=postgres`, y la de quay no lo esta. Con ella, el
              // contenedor no arranca; sin ella, Keycloak se construye al arrancar y
              // tarda mas, que es el precio de no mantener una imagen propia.
              args: ["start"],
              ports: [
                { name: "http", containerPort: 8080 },
                { name: "gestion", containerPort: 9000 },
              ],
              env: [
                // ── La base propia ──────────────────────────────────────────
                { name: "KC_DB", value: "postgres" },
                {
                  name: "KC_DB_URL",
                  value: `jdbc:postgresql://${servicioDeBaseDeDatos(environment)}:5432/${BASE_DE_IDENTIDAD}`,
                },
                { name: "KC_DB_USERNAME", value: ROL_DE_IDENTIDAD },
                {
                  name: "KC_DB_PASSWORD",
                  valueFrom: {
                    secretKeyRef: { name: secreto.identidad, key: CLAVES.baseDeIdentidad },
                  },
                },
                // ── Detras del proxy ────────────────────────────────────────
                // TLS termina en Traefik; aqui dentro se habla HTTP en la red del
                // clúster. `KC_PROXY_HEADERS` es lo que hace que Keycloak construya
                // sus URLs con el esquema y el anfitrion de fuera y no con los suyos.
                { name: "KC_HTTP_ENABLED", value: "true" },
                { name: "KC_PROXY_HEADERS", value: "xforwarded" },
                { name: "KC_HTTP_RELATIVE_PATH", value: RUTA_DE_IDENTIDAD },
                // El nombre PUBLICO. De aqui sale el `iss` de cada token.
                { name: "KC_HOSTNAME", value: `https://${domain}${RUTA_DE_IDENTIDAD}` },
                { name: "KC_HOSTNAME_STRICT", value: "true" },
                // ── Sonda y agrupamiento ────────────────────────────────────
                { name: "KC_HEALTH_ENABLED", value: "true" },
                // Desde Keycloak 25 la sonda vive en el puerto 9000. Su ruta se fija
                // explicitamente para que no la arrastre `KC_HTTP_RELATIVE_PATH`: con
                // la ruta movida, la sonda daria 404 y el pod no llegaria a Ready
                // nunca, con Keycloak funcionando perfectamente al lado.
                { name: "KC_HTTP_MANAGEMENT_RELATIVE_PATH", value: "/" },
                // Un solo nodo: cache local. El agrupamiento de Infinispan busca a sus
                // pares por descubrimiento y en un solo pod eso es un minuto de
                // arranque a cambio de nada.
                { name: "KC_CACHE", value: "local" },
                {
                  name: "KC_BOOTSTRAP_ADMIN_USERNAME",
                  value: "admin",
                },
                {
                  name: "KC_BOOTSTRAP_ADMIN_PASSWORD",
                  valueFrom: {
                    secretKeyRef: {
                      name: secreto.identidad,
                      key: CLAVES.administradorDeIdentidad,
                    },
                  },
                },
              ],
              resources: RECURSOS.identidad,
              // Keycloak migra su propia base al arrancar tras una actualizacion
              // menor, y eso tarda. `startupProbe` con 60 intentos da hasta cinco
              // minutos antes de que la sonda de vida empiece a contar.
              startupProbe: sondaHttp("/health/started", 9000, {
                periodSeconds: 5,
                failureThreshold: 60,
              }),
              readinessProbe: sondaHttp("/health/ready", 9000, { failureThreshold: 3 }),
              livenessProbe: sondaHttp("/health/live", 9000, {
                periodSeconds: 20,
                failureThreshold: 5,
              }),
            },
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
      type: "ClusterIP",
      selector: { app: nombre },
      ports: [
        { name: "http", port: 8080, targetPort: 8080 },
        // El puerto de gestion es un `Service` aparte de la ruta publica: la sonda es
        // lo unico que hay ahi, y no se publica.
        { name: "gestion", port: 9000, targetPort: 9000 },
      ],
    },
  };

  // El nombre del Job lleva la huella de lo que aplica: mientras el realm no cambie,
  // `pulumi up` no crea ningun Job nuevo; en cuanto cambie una linea, crea uno. Es lo
  // que hace cierto el criterio «un cambio del realm versionado llega al clúster».
  const huella = createHash("sha256")
    .update(documentos.realm)
    .update(documentos.perfilDeUsuario)
    .update(documentos.clientes)
    .digest("hex")
    .slice(0, 10);

  const reconciliacion: Job = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: `${resourceName(environment, "realm")}-${huella}`,
      namespace,
      labels: { ...etiquetas, huella },
    },
    spec: {
      backoffLimit: 3,
      template: {
        metadata: { labels: { ...etiquetas, app: "realm" } },
        spec: {
          restartPolicy: "Never",
          priorityClassName: nombreDePrioridad(environment, "lote"),
          containers: [
            {
              name: "reconciliar-realm",
              // La imagen de Keycloak, por su `kcadm.sh`. No hace falta ninguna otra.
              image,
              command: ["/bin/bash", "/realm/reconciliar-realm.sh"],
              env: [
                { name: "KC_SERVIDOR", value: `http://${nombre}:8080${RUTA_DE_IDENTIDAD}` },
                { name: "KC_REALM", value: realm },
                { name: "KC_ADMIN", value: "admin" },
                {
                  name: "KC_CLAVE",
                  valueFrom: {
                    secretKeyRef: {
                      name: secreto.identidad,
                      key: CLAVES.administradorDeIdentidad,
                    },
                  },
                },
                { name: "KC_CLIENTES", value: documentos.clientesComprobados.join(" ") },
              ],
              resources: RECURSOS.auxiliar,
              volumeMounts: [{ name: "realm", mountPath: "/realm", readOnly: true }],
            },
          ],
          volumes: [{ name: "realm", configMap: { name: configuracionDelRealm.metadata.name } }],
        },
      },
    },
  };

  return [configuracionDelRealm, identidad, servicio, reconciliacion];
}
