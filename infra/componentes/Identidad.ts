import { createHash } from "node:crypto";
import { commonLabels, resourceName, type Environment, type SmtpSettings } from "../config";
import {
  BASE_DE_IDENTIDAD,
  CLAVES,
  IMAGEN_DE_MAILPIT,
  RECURSOS,
  ROL_DE_IDENTIDAD,
  nombreDePrioridad,
  secretos,
  seguridadSinRoot,
  servicioDeBaseDeDatos,
  servicioDeIdentidad,
  sondaHttp,
} from "./convenciones";
import {
  municipalidadesJson,
  realmCiudadanoJson,
  realmSgtmJson,
  reconciliarIdentidadesSh,
  reconciliarRealmSh,
} from "./fuentes";
import type {
  ConfigMap,
  Deployment,
  EspecificacionDePod,
  Job,
  Manifiesto,
  Service,
} from "./tipos";

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
  /**
   * Desplegar un buzon Mailpit del clúster como relay SMTP (`sgtm-<amb>-correo`).
   *
   * Solo `stg`: la escalera comprueba que Keycloak ENVIA el enlace de clave, no que
   * llegue a un correo real. En `prod` el relay es de verdad y externo (ADR-0012,
   * `INF-03` §4).
   */
  correoDePrueba: boolean;
  /**
   * El relay SMTP con el que Keycloak manda el enlace de clave (ADR-0012).
   *
   * `undefined` = el ambiente no tiene relay: el realm no lleva `smtpServer`, el Job
   * pasa `SIN_CORREO=1` y el usuario se crea sin clave (Opción B, marcha blanca de
   * `prod`).
   */
  smtp?: SmtpSettings;
  /** Ubigeo de la municipalidad implantada: se reconcilian sus usuarios y su grupo. */
  ubigeo: string;
  /** Cuenta del primer administrador. Tiene que ser la del archivo versionado. */
  administrador: string;
}

/** El cliente que existe solo para que CI consiga un token sin navegador. */
export const CLIENTE_DE_VERIFICACION = "sgtm-verificacion";

/** El cliente con el que entran las personas. */
export const CLIENTE_DEL_BACKOFFICE = "sgtm-backoffice";

/** Ruta bajo la que cuelga Keycloak. La comparte con `publicar-imagenes.yml`. */
export const RUTA_DE_IDENTIDAD = "/keycloak";

/**
 * Puerto local del tunel por el que se abre la consola de administracion.
 *
 * Vive aqui, y exportado, porque **tiene que coincidir** con el del
 * `port-forward`: la consola construye sus enlaces desde `KC_HOSTNAME_ADMIN`, asi
 * que con otro puerto carga y se rompe en cuanto se navega. Un numero suelto en un
 * runbook se desincroniza del codigo; una constante no.
 */
export const PUERTO_DE_LA_CONSOLA = 8180;

/**
 * Donde existe la consola de administracion: al otro lado de un tunel local, y en
 * ningun otro sitio. El runbook `abrir-la-consola-de-keycloak.md` lo explica.
 */
export const URL_DE_LA_CONSOLA = `http://localhost:${PUERTO_DE_LA_CONSOLA}${RUTA_DE_IDENTIDAD}`;

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
  smtp?: SmtpSettings;
  /**
   * De que archivo versionado salen. Sin esto, el de funcionarios.
   *
   * El del ciudadano (ADR-0020) pasa el suyo: son dos realms con dos emisores, y
   * lo unico que comparten es este derivador —el mismo recorte de `smtpServer`,
   * la misma reescritura de redirecciones y la misma exigencia de perfil
   * declarativo—. Copiarlo habria duplicado las tres cosas, y la que mas duele
   * duplicada es la ultima: sin perfil, el mapeador lee un atributo que el realm
   * no admite y el claim sale vacio.
   */
  fuente?: string;
}): DocumentosDelRealm {
  const versionado = JSON.parse(args.fuente ?? realmSgtmJson()) as RealmVersionado;

  // El `smtpServer` del archivo versionado apunta al buzon `correo` del compose y NUNCA
  // llega asi al clúster: o lo decide el stack (ADR-0012), o el ambiente no tiene relay
  // y el realm va sin `smtpServer` —el Job pasa `SIN_CORREO=1` (Opción B)—.
  const { clients = [], components = {}, ...ajustes } = versionado;
  delete ajustes.smtpServer;

  const smtpServer: Record<string, string> | undefined =
    args.smtp === undefined
      ? undefined
      : {
          host: args.smtp.host,
          port: String(args.smtp.port),
          from: args.smtp.from,
          fromDisplayName: "SGTM",
          ssl: "false",
          starttls: String(args.smtp.startTls),
          auth: String(args.smtp.auth),
        };

  const clientes = clients
    // En `prod` no entra el cliente de verificacion. Lo decide la configuracion del
    // stack, no el nombre del ambiente.
    .filter((c) => args.clienteDeVerificacion || c.clientId !== CLIENTE_DE_VERIFICACION)
    .map((c) => ({
      ...c,
      // El realm versionado trae las redirecciones del compose —`localhost:5173`,
      // `localhost:8081`—, que en el clúster no valen y en `prod` serian ademas un
      // destino de redireccion que nadie controla. Se reescribe el ORIGEN con el
      // dominio del ambiente y **se conserva el camino**: el cliente del portal
      // declara `/portal/*` y tiene que seguir declarandolo, o su `redirect_uri`
      // pasaria a admitir cualquier ruta del origen (ADR-0020). Una redireccion a
      // localhost en `prod` la caza la prueba.
      ...(c.redirectUris && c.redirectUris.length > 0
        ? { redirectUris: [...new Set(c.redirectUris.map((u) => enElDominio(u, args.domain)))] }
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
      `El realm versionado «${args.realm}» no trae el perfil de usuario declarativo. De ` +
        "ahi salen los atributos de los que sale cada claim —`municipalidad_id` en el de " +
        "funcionarios, `numero_documento` en el del ciudadano—, y sin el el mapeador " +
        "leeria un atributo que el realm no admite: el claim saldria vacio y el backend " +
        "responderia 403 sin decir por que.",
    );
  }

  return {
    // `displayName` se reescribe: el del archivo versionado dice «marcha blanca», que es
    // lo que el compose levanta. Es lo primero que se lee en la pantalla de acceso, y en
    // la instalacion de una municipalidad seria mentira —o peor, una explicacion que
    // nadie pidio—. La marca de instalacion de demostracion es otra cosa, y va en los
    // documentos que el sistema emite (INF-03 §3.2), no en el formulario de entrada.
    realm: JSON.stringify(
      {
        ...ajustes,
        realm: args.realm,
        displayName: "SGTM",
        ...(smtpServer === undefined ? {} : { smtpServer }),
      },
      null,
      2,
    ),
    perfilDeUsuario: perfil,
    // `OVERWRITE` reemplaza el cliente, no el realm: los usuarios no se tocan.
    clientes: JSON.stringify({ ifResourceExists: "OVERWRITE", clients: clientes }, null, 2),
    clientesComprobados: clientes.map((c) => c.clientId),
  };
}

/**
 * Como se llama el realm del ciudadano, a partir del de funcionarios.
 *
 * Derivado y no configurable: son dos realms del mismo Keycloak y de la misma
 * instalacion, y dos nombres que se pudieran fijar por separado son dos que un
 * dia dejan de corresponderse —con el backend apuntando su segunda cadena a un
 * emisor que no existe, y el portal devolviendo 401 sin decir por que—.
 */
export function realmDelCiudadano(realm: string): string {
  return `${realm}-ciudadano`;
}

/**
 * El mismo camino de una redireccion, servido desde el dominio del ambiente.
 *
 * `http://localhost:5174/portal/*` → `https://<dominio>/portal/*`. Lo que se
 * reescribe es el origen; el camino es del cliente y no es decorativo: es lo que
 * acota a donde puede volver quien se autentica.
 */
function enElDominio(uri: string, domain: string): string {
  const camino = uri.replace(/^[a-z]+:\/\/[^/]+/i, "");
  return `https://${domain}${camino === "" ? "/*" : camino}`;
}

interface UsuarioVersionado {
  cuenta: string;
  nombre: string;
  apellido: string;
  correo: string;
  administrador?: boolean;
}
interface MunicipalidadVersionada {
  ubigeo: string;
  municipalidadId: number;
  grupo: string;
  usuarios: UsuarioVersionado[];
}

/** El TSV de identidades y lo que el Job comprueba, derivado del archivo versionado. */
export interface DocumentosDeIdentidades {
  /**
   * Una fila por linea, campos con tabulador. Lo lee `reconciliar-identidades.sh` en
   * el modo «directo» (la imagen de Keycloak no trae python ni jq).
   *
   *   GRUPO   <grupo>  <municipalidadId>
   *   USUARIO <cuenta> <nombre> <apellido> <correo> <municipalidadId> <grupo>
   */
  tsv: string;
  /** El grupo que el Job crea. */
  grupo: string;
  /** Las cuentas que el Job comprueba al terminar. */
  cuentas: string[];
}

/**
 * Deriva el TSV de usuarios y grupos para la municipalidad implantada (ADR-0012).
 *
 * Se deriva y se valida AQUI, en TypeScript, por lo mismo que los documentos del
 * realm: la imagen de Keycloak no trae con que parsear JSON, y hacerlo aqui lo deja
 * cubierto por `componentes.test.ts`. El cruce con `administrador` es la fuente unica
 * de ADR-0012: si la cuenta del archivo no es la que implanta el Job, el claim del
 * token no encontraria fila de `usuario` y la persona entraria sin ser nadie.
 */
export function documentosDeIdentidades(args: {
  municipalidades: { ubigeo: string; contenido: string }[];
  ubigeo: string;
  administrador: string;
}): DocumentosDeIdentidades {
  const fuente = args.municipalidades.find((m) => m.ubigeo === args.ubigeo);
  if (fuente === undefined) {
    throw new Error(
      `No hay «despliegue/identidad/municipalidades/${args.ubigeo}.json». Es la fuente ` +
        "versionada de los usuarios y el grupo de la municipalidad que se implanta " +
        "(ADR-0012); sin ella el alta de personas volveria a ser un paso manual.",
    );
  }

  const m = JSON.parse(fuente.contenido) as MunicipalidadVersionada;

  if (m.ubigeo !== args.ubigeo) {
    throw new Error(
      `El archivo ${args.ubigeo}.json declara ubigeo «${m.ubigeo}»: el nombre del archivo ` +
        "y el ubigeo de dentro tienen que coincidir.",
    );
  }
  if (!Number.isInteger(m.municipalidadId) || m.municipalidadId <= 0) {
    throw new Error(
      `${args.ubigeo}.json: «municipalidadId» es un entero positivo, y es ` +
        `${JSON.stringify(m.municipalidadId)}. Es el id que asigno la implantacion —sale de ` +
        "su log— y el que va al atributo del que sale el claim (`::bigint` en RLS).",
    );
  }
  if (!m.grupo || m.grupo.includes("\t")) {
    throw new Error(`${args.ubigeo}.json: «grupo» es obligatorio y sin tabuladores.`);
  }
  if (!Array.isArray(m.usuarios) || m.usuarios.length === 0) {
    throw new Error(`${args.ubigeo}.json: no declara ningun usuario.`);
  }

  const admins = m.usuarios.filter((u) => u.administrador === true);
  if (admins.length !== 1) {
    throw new Error(
      `${args.ubigeo}.json: tiene que haber exactamente un usuario con «administrador: true», ` +
        `y hay ${admins.length}.`,
    );
  }
  if (admins[0]?.cuenta !== args.administrador) {
    throw new Error(
      `${args.ubigeo}.json: el usuario «administrador: true» es «${admins[0]?.cuenta}», pero la ` +
        `implantacion da de alta a «${args.administrador}» (stack). Tienen que ser la misma ` +
        "cuenta: es lo unico que une la fila de `usuario` con la identidad del token (ADR-0005).",
    );
  }

  const filas: string[] = [["GRUPO", m.grupo, String(m.municipalidadId)].join("\t")];
  for (const u of m.usuarios) {
    for (const [campo, valor] of Object.entries({
      cuenta: u.cuenta,
      nombre: u.nombre,
      apellido: u.apellido,
      correo: u.correo,
    })) {
      if (!valor || String(valor).includes("\t")) {
        throw new Error(`${args.ubigeo}.json: usuario «${u.cuenta}» sin «${campo}» valido.`);
      }
    }
    filas.push(
      ["USUARIO", u.cuenta, u.nombre, u.apellido, u.correo, String(m.municipalidadId), m.grupo].join(
        "\t",
      ),
    );
  }

  return {
    tsv: `${filas.join("\n")}\n`,
    grupo: m.grupo,
    cuentas: m.usuarios.map((u) => u.cuenta),
  };
}

export function manifiestosDeIdentidad(args: IdentidadArgs): Manifiesto[] {
  const {
    environment,
    namespace,
    image,
    realm,
    domain,
    clienteDeVerificacion,
    correoDePrueba,
    smtp,
    ubigeo,
    administrador,
  } = args;
  const nombre = servicioDeIdentidad(environment);
  const nombreDelCorreo = resourceName(environment, "correo");
  const secretoSmtp = resourceName(environment, "smtp");
  const etiquetas = commonLabels(environment, "identidad");
  const secreto = secretos(environment);

  const documentos = documentosDelRealm({ domain, realm, clienteDeVerificacion, smtp });
  // El realm del CIUDADANO (ADR-0020). Emisor distinto, cliente distinto y
  // atributos distintos; el mismo derivador y el mismo Job, porque el
  // procedimiento de aplicarlo no cambia.
  const documentosDelCiudadano = documentosDelRealm({
    domain,
    realm: realmDelCiudadano(realm),
    // El cliente de verificacion es del realm de funcionarios: es el que CI usa
    // para conseguir un token sin navegador. Aqui no existe ninguno, asi que la
    // bandera no aplica y va en `false` para que el filtro no busque nada.
    clienteDeVerificacion: false,
    ...(smtp === undefined ? {} : { smtp }),
    fuente: realmCiudadanoJson(),
  });
  const identidades = documentosDeIdentidades({
    municipalidades: municipalidadesJson(),
    ubigeo,
    administrador,
  });

  const configuracionDelRealm: ConfigMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { name: resourceName(environment, "realm"), namespace, labels: etiquetas },
    data: {
      "realm.json": documentos.realm,
      "perfil-de-usuario.json": documentos.perfilDeUsuario,
      "clientes.json": documentos.clientes,
      // Los tres del ciudadano, en el mismo ConfigMap y con el mismo guion: el
      // realm es otro, el procedimiento de aplicarlo no (ADR-0020).
      "realm-ciudadano.json": documentosDelCiudadano.realm,
      "perfil-de-usuario-ciudadano.json": documentosDelCiudadano.perfilDeUsuario,
      "clientes-ciudadano.json": documentosDelCiudadano.clientes,
      "reconciliar-realm.sh": reconciliarRealmSh(),
      // El alta declarativa de usuarios (ADR-0012): el mismo guion que el compose y el
      // TSV que `documentosDeIdentidades` deriva del archivo versionado.
      "reconciliar-identidades.sh": reconciliarIdentidadesSh(),
      "identidades.tsv": identidades.tsv,
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
                // La consola de administracion NO se publica: la `IngressRoute` la
                // excluye con `!PathPrefix(/keycloak/admin)`, y eso no se toca. Pero
                // `KC_HOSTNAME_STRICT` hace que Keycloak construya TODAS sus URLs
                // absolutas contra `KC_HOSTNAME` sin mirar por donde llego la peticion,
                // asi que abrirla por un `port-forward` acababa en un 302 al dominio
                // publico -y ahi, excluida del enrutado, la peticion caia a la ruta de
                // la interfaz y aparecia el formulario de acceso del SGTM-. Las dos
                // protecciones encadenadas dejaban la consola inalcanzable tambien para
                // quien tiene derecho a entrar. Se vio contra el Keycloak de `prod`.
                //
                // `KC_HOSTNAME_ADMIN` le da a las URLs de administracion un anfitrion
                // propio sin tocar los publicos: el `iss` de los tokens sigue saliendo
                // de `KC_HOSTNAME`. No amplia la superficie de ataque, la reduce -esas
                // URLs dejan de nombrar el dominio publico, y `localhost` no es
                // enrutable desde fuera-.
                { name: "KC_HOSTNAME_ADMIN", value: URL_DE_LA_CONSOLA },
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
              // La imagen de quay.io ya corre como no-root de fabrica (issue #157).
              securityContext: seguridadSinRoot(),
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

  // El nombre del Job lleva la huella de lo que aplica: mientras nada cambie, `pulumi
  // up` no crea ningun Job nuevo; en cuanto cambie una linea —del realm o del archivo
  // versionado de una municipalidad— crea uno. Es lo que hace cierto el criterio «un
  // cambio versionado llega al clúster», ahora tambien para usuarios y grupos.
  /**
   * El pod que reconcilia, aparte del Job, porque entra en la huella de abajo.
   *
   * Es lo que hace que un cambio en COMO se aplica —el mandato, la imagen, el modo con
   * que se monta el `ConfigMap`— produzca un Job nuevo y no un intento de modificar el
   * que ya existe. `spec.template` de un Job es inmutable: sin esto, corregir el pod
   * deja un `pulumi up` que el API server rechaza con «field is immutable», y la
   * correccion no llega nunca al clúster.
   */
  const plantillaDeReconciliacion: EspecificacionDePod = {
    restartPolicy: "Never",
    priorityClassName: nombreDePrioridad(environment, "lote"),
    containers: [
      {
        name: "reconciliar-realm",
        // La imagen de Keycloak, por su `kcadm.sh`. No hace falta ninguna otra.
        image,
        // Primero el realm y el perfil, despues los usuarios y grupos: el alta
        // declarativa necesita que el atributo `municipalidad_id` ya lo admita el
        // perfil (ADR-0012).
        // Y el realm del ciudadano al final, cuando el de funcionarios ya esta:
        // si el portal fallara, la municipalidad sigue pudiendo trabajar, que es
        // el orden correcto de los dos fallos posibles (ADR-0020).
        command: [
          "/bin/bash",
          "-c",
          "/realm/reconciliar-realm.sh && /realm/reconciliar-identidades.sh" +
            " && /realm/reconciliar-realm.sh ciudadano",
        ],
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
          // El realm del ciudadano y su cliente, para la segunda pasada.
          { name: "KC_REALM_CIUDADANO", value: realmDelCiudadano(realm) },
          {
            name: "KC_CLIENTES_CIUDADANO",
            value: documentosDelCiudadano.clientesComprobados.join(" "),
          },
          // Lee `identidades.tsv` del propio ConfigMap (modo «directo»).
          { name: "KC_DIRECTORIO", value: "/realm" },
          // Sin relay (Opción B): el guion crea al usuario y OMITE el enlace de
          // clave, en vez de fallar. Un operador la fija con el runbook.
          ...(smtp === undefined ? [{ name: "SIN_CORREO", value: "1" }] : []),
          // Si el relay pide auth, el usuario y la clave salen del `Secret`
          // `sgtm-<amb>-smtp` —que NO genera `bootstrap-secretos.sh`: lo emite el
          // proveedor del relay (INF-06 §1.2)—. El guion los pone en el realm con
          // `kcadm`, nunca quedan en el `realm.json` versionado.
          ...(smtp?.auth
            ? [
                {
                  name: "KC_SMTP_USUARIO",
                  valueFrom: { secretKeyRef: { name: secretoSmtp, key: "usuario" } },
                },
                {
                  name: "KC_SMTP_CLAVE",
                  valueFrom: { secretKeyRef: { name: secretoSmtp, key: "clave" } },
                },
              ]
            : []),
        ],
        securityContext: seguridadSinRoot(),
        resources: RECURSOS.auxiliar,
        volumeMounts: [{ name: "realm", mountPath: "/realm", readOnly: true }],
      },
    ],
    // 0o755 en decimal, igual que la inicializacion del motor (`BaseDeDatos.ts`). Los
    // dos guiones de arriba se EJECUTAN —`bash -c "a.sh && b.sh"`, no `bash a.sh`—, y
    // el modo por omision de un `ConfigMap` (0644) los deja sin permiso de ejecucion:
    // el contenedor muere con «exit 126» antes de tocar Keycloak. Comprobado contra el
    // clúster: el Job agoto sus cuatro intentos y `pulumi up` espero 10 minutos.
    volumes: [
      {
        name: "realm",
        configMap: { name: configuracionDelRealm.metadata.name, defaultMode: 493 },
      },
    ],
  };

  const huella = createHash("sha256")
    .update(documentos.realm)
    .update(documentos.perfilDeUsuario)
    .update(documentos.clientes)
    // Y los del ciudadano: un cambio suyo tiene que crear un Job nuevo, o el
    // realm versionado no llegaria nunca al clúster (que es el defecto que este
    // Job existe para no repetir).
    .update(documentosDelCiudadano.realm)
    .update(documentosDelCiudadano.perfilDeUsuario)
    .update(documentosDelCiudadano.clientes)
    .update(identidades.tsv)
    .update(reconciliarIdentidadesSh())
    // Y el pod que los aplica, no solo lo que aplica. Ver el docstring de arriba.
    .update(JSON.stringify(plantillaDeReconciliacion))
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
        spec: plantillaDeReconciliacion,
      },
    },
  };

  // Solo `stg`: el buzon Mailpit que hace de relay SMTP para que la escalera pueda
  // comprobar que el enlace de clave SE ENVIA (ADR-0012). En `prod` el relay es
  // externo y `keycloakSmtpHost` no puede apuntar a un buzon (`config.ts`).
  const etiquetasCorreo = commonLabels(environment, "correo");
  const correo: Manifiesto[] = correoDePrueba
    ? [
        {
          apiVersion: "apps/v1",
          kind: "Deployment",
          metadata: { name: nombreDelCorreo, namespace, labels: etiquetasCorreo },
          spec: {
            replicas: 1,
            strategy: { type: "Recreate" },
            selector: { matchLabels: { app: nombreDelCorreo } },
            template: {
              metadata: { labels: { ...etiquetasCorreo, app: nombreDelCorreo } },
              spec: {
                priorityClassName: nombreDePrioridad(environment, "lote"),
                containers: [
                  {
                    name: "mailpit",
                    image: IMAGEN_DE_MAILPIT,
                    env: [
                      { name: "MP_SMTP_AUTH_ACCEPT_ANY", value: "true" },
                      { name: "MP_SMTP_AUTH_ALLOW_INSECURE", value: "true" },
                    ],
                    ports: [
                      { name: "smtp", containerPort: 1025 },
                      { name: "http", containerPort: 8025 },
                    ],
                    // `runAsUser` explicito, y no solo `runAsNonRoot`. El Dockerfile de
                    // Mailpit no declara `USER` —`ENTRYPOINT ["/mailpit"]` sobre alpine y
                    // nada mas—, asi que la imagen corre como root y el kubelet se niega
                    // a arrancarla: `CreateContainerConfigError`, «container has
                    // runAsNonRoot and image will run as root». `runAsNonRoot` a secas
                    // delega en la imagen la respuesta a si el pod arranca; con el UID
                    // puesto, la decide el manifiesto. 65534 vale aqui: los dos puertos
                    // estan por encima de 1024, y sin `MP_DATABASE` el buzon escribe su
                    // SQLite temporal en `/tmp`, que alpine trae en 1777.
                    securityContext: seguridadSinRoot({ runAsUser: 65534 }),
                    resources: RECURSOS.auxiliar,
                    readinessProbe: sondaHttp("/readyz", 8025, { failureThreshold: 3 }),
                    livenessProbe: sondaHttp("/", 8025, {
                      periodSeconds: 20,
                      failureThreshold: 5,
                    }),
                  },
                ],
              },
            },
          },
        },
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: { name: nombreDelCorreo, namespace, labels: etiquetasCorreo },
          spec: {
            type: "ClusterIP",
            selector: { app: nombreDelCorreo },
            ports: [
              { name: "smtp", port: 1025, targetPort: 1025 },
              { name: "http", port: 8025, targetPort: 8025 },
            ],
          },
        },
      ]
    : [];

  return [configuracionDelRealm, identidad, servicio, reconciliacion, ...correo];
}
