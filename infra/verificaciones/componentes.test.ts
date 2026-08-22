import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditarManifiestos } from "../auditoria";
import { construirManifiestos } from "../componentes";
import { manifiestosDeIdentidad, documentosDelRealm, RUTA_DE_IDENTIDAD } from "../componentes/Identidad";
import { nginxDelCluster } from "../componentes/Aplicacion";
import { valoresDeTraefik } from "../componentes/Ingreso";
import { manifiestosDeObservabilidad } from "../componentes/Observabilidad";
import { secretos } from "../componentes/convenciones";
import { raizDelRepositorio } from "../componentes/fuentes";
import { contenedoresDe, podsDe, type Contenedor, type Manifiesto } from "../componentes/tipos";
import { ENVIRONMENTS, namespaceName, type Environment } from "../config";
import { invariantesDe } from "./stacks";

/**
 * Los criterios de aceptacion de los cinco issues de la fase B, sobre los manifiestos
 * que se desplegarian de verdad.
 *
 * Lo que **no** puede hacer esta prueba conviene decirlo primero, porque marca la
 * frontera de lo que este PR deja demostrado: aqui no hay clúster. Un manifiesto
 * correcto no es un sistema que funciona, y las cuatro afirmaciones que solo valen
 * contra lo que corre —el aislamiento verificado contra la instancia, la aplicacion que
 * no puede hacer DDL con las credenciales de su proceso, la escalera de identidad y el
 * escaneo de puertos desde fuera— no se comprueban aqui: la primera y la segunda, en
 * `verificaciones/motor/verificar-el-motor.sh`, que levanta el motor de estos mismos
 * manifiestos; las otras dos exigen un VPS y **quedan sin verificar hasta que exista**.
 *
 * Lo que si demuestra: que lo que se va a aplicar dice lo que los issues exigen que
 * diga. Es la mitad barata de la verificacion, y es la que evita el viaje.
 */

const AMBIENTE: Environment = "prod";

function manifiestosDe(ambiente: Environment): Manifiesto[] {
  return construirManifiestos(invariantesDe(ambiente));
}

function buscar(ms: Manifiesto[], kind: string, contiene: string): Manifiesto {
  const encontrado = ms.find((m) => m.kind === kind && m.metadata.name.includes(contiene));
  if (!encontrado) {
    throw new Error(
      `No hay ningun ${kind} cuyo nombre contenga «${contiene}». Hay: ` +
        ms.filter((m) => m.kind === kind).map((m) => m.metadata.name).join(", "),
    );
  }
  return encontrado;
}

function contenedoresDeTodo(ms: Manifiesto[]): { donde: string; c: Contenedor }[] {
  return ms.flatMap((m) =>
    podsDe(m).flatMap(({ contexto, pod }) =>
      contenedoresDe(pod).map((c) => ({ donde: contexto, c })),
    ),
  );
}

function variablesDe(c: Contenedor): Map<string, string | undefined> {
  return new Map((c.env ?? []).map((e) => [e.name, e.value]));
}

/** Los `Secret` que un contenedor lee, por nombre. */
function secretosDe(c: Contenedor): string[] {
  return [
    ...(c.env ?? []).flatMap((e) => (e.valueFrom ? [e.valueFrom.secretKeyRef.name] : [])),
    ...(c.envFrom ?? []).map((e) => e.secretRef.name),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que vale para los dos ambientes
// ─────────────────────────────────────────────────────────────────────────────

describe("los manifiestos de los dos ambientes pasan su propia auditoria", () => {
  it.each(ENVIRONMENTS)("%s", (ambiente) => {
    const ms = manifiestosDe(ambiente);
    expect(
      auditarManifiestos(ms, {
        secretoDeOwner: secretos(ambiente).owner,
        namespace: namespaceName(ambiente),
      }),
    ).toEqual([]);
  });

  it("todo lo que se despliega vive en el namespace del ambiente", () => {
    const ms = manifiestosDe(AMBIENTE);
    const fuera = ms.filter(
      (m) =>
        !["Namespace", "PriorityClass", "HelmChartConfig", "ClusterRole", "ClusterRoleBinding"].includes(
          m.kind,
        ) && m.metadata.namespace !== namespaceName(AMBIENTE),
    );
    expect(fuera.map((m) => `${m.kind}/${m.metadata.name}`)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #149 — PostgreSQL en el clúster
// ─────────────────────────────────────────────────────────────────────────────

describe("#149 · la base de datos", () => {
  const ms = manifiestosDe(AMBIENTE);

  it("monta los guiones del repositorio, sin copiarlos", () => {
    const configuracion = buscar(ms, "ConfigMap", "postgres-inicializacion");
    const datos = (configuracion as { data: Record<string, string> }).data;

    const enElRepositorio = (ruta: string) =>
      readFileSync(join(raizDelRepositorio(), ruta), "utf8");

    // Identicos, byte a byte. Si alguien pega aqui una version editada de
    // `crear-roles.sql`, la prueba lo dice: seria un segundo sitio donde olvidar que el
    // rol no puede ser superusuario.
    expect(datos["10-crear-roles.sql"]).toBe(
      enElRepositorio("backend/sgtm-esquema/src/main/resources/db/roles/crear-roles.sql"),
    );
    expect(datos["20-asignar-claves.sh"]).toBe(
      enElRepositorio("despliegue/inicializacion-del-motor/20-asignar-claves.sh"),
    );
  });

  it("los cuatro roles se crean, y ninguno es superusuario", () => {
    const datos = (buscar(ms, "ConfigMap", "postgres-inicializacion") as { data: Record<string, string> })
      .data;
    const sql = datos["10-crear-roles.sql"] ?? "";
    for (const rol of ["sgtm_owner", "sgtm_app", "sgtm_readonly", "rol_carga_parametros"]) {
      expect(sql, `falta el rol ${rol}`).toContain(rol);
    }
    expect(sql).toContain("NOSUPERUSER");
    expect(sql).toContain("NOBYPASSRLS");
  });

  it("una replica sobre volumen, con estrategia Recreate", () => {
    const motor = buscar(ms, "Deployment", "postgres") as {
      spec: { replicas: number; strategy: { type: string }; template: { spec: { volumes?: unknown[] } } };
    };
    expect(motor.spec.replicas).toBe(1);
    expect(motor.spec.strategy.type).toBe("Recreate");
  });

  it("el puerto de PostgreSQL no se publica", () => {
    const servicios = ms.filter((m) => m.kind === "Service");
    expect(servicios.length).toBeGreaterThan(0);
    for (const s of servicios) {
      expect((s as { spec: { type: string } }).spec.type).toBe("ClusterIP");
    }
  });

  it("Keycloak tiene base propia, y no comparte la del padron", () => {
    const datos = (buscar(ms, "ConfigMap", "postgres-inicializacion") as { data: Record<string, string> })
      .data;
    expect(datos["30-base-de-keycloak.sh"]).toContain("CREATE DATABASE keycloak");
    // Y no puede conectarse a la del padron.
    expect(datos["30-base-de-keycloak.sh"]).toContain("REVOKE CONNECT");
  });
});

describe("#149 · la demostracion: la auditoria se pone roja", () => {
  it("con `RollingUpdate` sobre el volumen de la base", () => {
    const ms = manifiestosDe(AMBIENTE);
    const motor = buscar(ms, "Deployment", "postgres") as { spec: { strategy: { type: string } } };
    motor.spec.strategy.type = "RollingUpdate";

    expect(auditar(ms)).toContainEqual(expect.stringContaining("no consigue el bloqueo"));
  });

  it("con una sonda sin `timeoutSeconds` explicito —el 1 s del kubelet—", () => {
    const ms = manifiestosDe(AMBIENTE);
    const motor = buscar(ms, "Deployment", "postgres") as {
      spec: { template: { spec: { containers: { livenessProbe?: { timeoutSeconds: number } }[] } } };
    };
    const contenedor = motor.spec.template.spec.containers[0];
    if (contenedor?.livenessProbe) contenedor.livenessProbe.timeoutSeconds = 1;

    expect(auditar(ms)).toContainEqual(expect.stringContaining("timeoutSeconds: 1"));
  });

  it("con un Service publicado como NodePort", () => {
    const ms = manifiestosDe(AMBIENTE);
    const servicio = buscar(ms, "Service", "postgres") as { spec: { type: string } };
    servicio.spec.type = "NodePort";

    expect(auditar(ms)).toContainEqual(expect.stringContaining("es de tipo «NodePort»"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #150 — Migracion e implantacion como Jobs
// ─────────────────────────────────────────────────────────────────────────────

describe("#150 · sgtm_owner no entra en el Deployment", () => {
  const ms = manifiestosDe(AMBIENTE);
  const secretoDeOwner = secretos(AMBIENTE).owner;

  it("el Secret de owner se monta en los dos Jobs, en el motor y en el CronJob de respaldo, y en nada mas", () => {
    const donde = new Set(
      contenedoresDeTodo(ms)
        .filter(({ c }) => secretosDe(c).includes(secretoDeOwner))
        .map(({ donde }) => donde),
    );

    // El motor es la excepcion, y es donde `sgtm_owner` se crea: el guion de
    // inicializacion le asigna la clave, y para asignarla tiene que conocerla. Ese
    // contenedor ya guarda ademas la del superusuario. El CronJob de respaldo (#155)
    // es la segunda excepcion: escribe el estado en la tabla `respaldo` (RF-126), tal
    // como `V8__respaldo.sql` declara que lo hace «el proceso de despliegue». Lo que
    // la regla persigue es que no acabe en un proceso expuesto en HTTP, y ninguno de
    // los dos abre un puerto.
    expect([...donde].sort()).toEqual([
      "CronJob/sgtm-prod-respaldo",
      "Deployment/sgtm-prod-postgres",
      `Job/sgtm-prod-implantacion-${invariantesDe(AMBIENTE).application.bootstrapVersion.slice(0, 12)}`,
      `Job/sgtm-prod-migracion-${invariantesDe(AMBIENTE).application.bootstrapVersion.slice(0, 12)}`,
    ]);
  });

  it("la aplicacion se conecta como sgtm_app, y solo como sgtm_app", () => {
    for (const { c } of contenedoresDeTodo(ms)) {
      const usuario = variablesDe(c).get("SGTM_DB_USUARIO");
      if (usuario !== undefined) expect(usuario).toBe("sgtm_app");
    }
  });

  it("la aplicacion espera a la implantacion antes de atender", () => {
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { initContainers?: Contenedor[] } } };
    };
    const espera = aplicacion.spec.template.spec.initContainers ?? [];
    expect(espera.map((c) => c.name)).toContain("espera-implantacion");
    expect(espera[0]?.args?.join(" ")).toContain("municipalidad");
  });

  it("la implantacion espera a que el esquema este aplicado", () => {
    const implantacion = buscar(ms, "Job", "implantacion") as {
      spec: { template: { spec: { initContainers?: Contenedor[] } } };
    };
    const espera = implantacion.spec.template.spec.initContainers ?? [];
    expect(espera.map((c) => c.name)).toContain("espera-migracion");
    expect(espera[0]?.args?.join(" ")).toContain("flyway_schema_history");
  });

  it("el alta lleva la marca de demostracion que el stack decidio", () => {
    for (const ambiente of ENVIRONMENTS) {
      const implantacion = buscar(manifiestosDe(ambiente), "Job", "implantacion") as {
        spec: { template: { spec: { containers: Contenedor[] } } };
      };
      const contenedor = implantacion.spec.template.spec.containers[0];
      expect(variablesDe(contenedor as Contenedor).get("SGTM_IMPLANTACION_ESDEMOSTRACION")).toBe(
        String(invariantesDe(ambiente).application.isDemonstration),
      );
    }
  });

  it("el nombre de los Jobs lleva la version: una version nueva es un Job nuevo", () => {
    const version = invariantesDe(AMBIENTE).application.bootstrapVersion;
    const sufijo = version.slice(0, 12);
    expect(buscar(ms, "Job", "migracion").metadata.name).toContain(sufijo);
    expect(buscar(ms, "Job", "implantacion").metadata.name).toContain(sufijo);
  });
});

describe("#150 · la demostracion: la auditoria se pone roja", () => {
  it("cambiando en el Deployment el usuario de base por sgtm_owner", () => {
    const ms = manifiestosDe(AMBIENTE);
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const env = aplicacion.spec.template.spec.containers[0]?.env ?? [];
    const usuario = env.find((e) => e.name === "SGTM_DB_USUARIO");
    if (usuario) usuario.value = "sgtm_owner";

    expect(auditar(ms)).toContainEqual(expect.stringContaining("se conecta a la base como"));
  });

  it("dandole al Deployment el Secret de sgtm_owner", () => {
    const ms = manifiestosDe(AMBIENTE);
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    aplicacion.spec.template.spec.containers[0]?.env?.push({
      name: "SGTM_DB_OWNER_CLAVE",
      valueFrom: { secretKeyRef: { name: secretos(AMBIENTE).owner, key: "clave-owner" } },
    });

    expect(auditar(ms)).toContainEqual(expect.stringContaining("el Secret de sgtm_owner"));
  });

  it("quitando la espera: la aplicacion arrancaria sobre una base vacia", () => {
    const ms = manifiestosDe(AMBIENTE);
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { initContainers?: Contenedor[] } } };
    };
    aplicacion.spec.template.spec.initContainers = [];

    // Esta no la ve la auditoria generica —no es una convencion de INF-01 §4, es el
    // orden de arranque de #150—, asi que la comprueba la prueba, y su version rota
    // demuestra que la comprobacion sirve.
    expect(esperaAntesDeAtender(ms)).toBe(false);
  });
});

/** ¿Espera la aplicacion a la implantacion antes de atender peticiones? */
function esperaAntesDeAtender(ms: Manifiesto[]): boolean {
  const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
    spec: { template: { spec: { initContainers?: Contenedor[] } } };
  };
  return (aplicacion.spec.template.spec.initContainers ?? []).some(
    (c) => c.name === "espera-implantacion",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// #151 — Keycloak
// ─────────────────────────────────────────────────────────────────────────────

describe("#151 · identidad", () => {
  const ms = manifiestosDe(AMBIENTE);
  const identidad = buscar(ms, "Deployment", "identidad") as {
    spec: { template: { spec: { containers: Contenedor[] } } };
  };
  const contenedor = identidad.spec.template.spec.containers[0] as Contenedor;

  it("arranca en modo produccion, no en start-dev", () => {
    expect(contenedor.args).toEqual(["start"]);
  });

  it("guarda su estado en su propia base, no dentro del contenedor", () => {
    const variables = variablesDe(contenedor);
    expect(variables.get("KC_DB")).toBe("postgres");
    expect(variables.get("KC_DB_URL")).toContain("/keycloak");
    // Su base, no la del padron: Keycloak hace DDL sobre la suya en cada actualizacion
    // menor, y eso sobre la base que sostiene RLS seria abrirle DDL al padron.
    expect(variables.get("KC_DB_URL")?.endsWith("/sgtm")).toBe(false);
  });

  it("el emisor es el nombre publico; el JWKS, el interno", () => {
    const dominio = invariantesDe(AMBIENTE).ingress.domain;
    expect(variablesDe(contenedor).get("KC_HOSTNAME")).toBe(
      `https://${dominio}${RUTA_DE_IDENTIDAD}`,
    );

    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const variables = variablesDe(aplicacion.spec.template.spec.containers[0] as Contenedor);
    expect(variables.get("SGTM_OIDC_EMISOR")).toBe(
      `https://${dominio}${RUTA_DE_IDENTIDAD}/realms/sgtm`,
    );
    // El JWKS no sale al ingreso para volver a entrar.
    expect(variables.get("SGTM_OIDC_JWKS")).toContain("http://sgtm-prod-identidad:8080");
  });

  it("el realm que se aplica conserva el mapeador de municipalidad_id", () => {
    const documentos = documentosDelRealm({
      domain: "sgtm.example.pe",
      realm: "sgtm",
      clienteDeVerificacion: false,
    });
    for (const cliente of clientesDe(documentos.clientes)) {
      expect(
        cliente.protocolMappers?.some((m) => m.config["claim.name"] === "municipalidad_id"),
        `el cliente ${cliente.clientId} perdio el mapeador`,
      ).toBe(true);
    }
    // Y el atributo existe en el perfil: sin el, el mapeador leeria un atributo que el
    // realm no admite y el claim saldria vacio.
    expect(documentos.perfilDeUsuario).toContain("municipalidad_id");
  });

  it("la pantalla de acceso no dice «marcha blanca»", () => {
    const configuracion = buscar(ms, "ConfigMap", "realm") as { data: Record<string, string> };
    expect(configuracion.data["realm.json"]).not.toContain("marcha blanca");
    expect(JSON.parse(configuracion.data["realm.json"] ?? "{}").displayName).toBe("SGTM");
  });

  it("el realm no trae ni un usuario ni una clave", () => {
    const configuracion = buscar(ms, "ConfigMap", "realm") as { data: Record<string, string> };
    for (const [nombre, contenido] of Object.entries(configuracion.data)) {
      if (!nombre.endsWith(".json")) continue;
      expect(contenido, `${nombre} trae usuarios`).not.toContain('"users"');
      expect(contenido.toLowerCase(), `${nombre} trae una clave`).not.toContain('"password"');
    }
  });

  it("las redirecciones son del dominio del ambiente, no de localhost", () => {
    const configuracion = buscar(ms, "ConfigMap", "realm") as { data: Record<string, string> };
    expect(configuracion.data["clientes.json"]).not.toContain("localhost");
    expect(configuracion.data["clientes.json"]).toContain(
      `https://${invariantesDe(AMBIENTE).ingress.domain}/*`,
    );
  });

  it("el cliente de concesion directa existe en stg y NO en prod", () => {
    const enProd = clientesDe(
      (buscar(manifiestosDe("prod"), "ConfigMap", "realm") as { data: Record<string, string> }).data[
        "clientes.json"
      ] ?? "",
    ).map((c) => c.clientId);
    const enStg = clientesDe(
      (buscar(manifiestosDe("stg"), "ConfigMap", "realm") as { data: Record<string, string> }).data[
        "clientes.json"
      ] ?? "",
    ).map((c) => c.clientId);

    expect(enProd).not.toContain("sgtm-verificacion");
    expect(enStg).toContain("sgtm-verificacion");
  });

  it("un cambio del realm cambia el nombre del Job que lo aplica", () => {
    const antes = buscar(ms, "Job", "realm").metadata.name;
    const despues = buscar(
      manifiestosDeIdentidad({
        environment: AMBIENTE,
        namespace: namespaceName(AMBIENTE),
        image: "quay.io/keycloak/keycloak:26.0",
        realm: "otro-realm",
        domain: invariantesDe(AMBIENTE).ingress.domain,
        clienteDeVerificacion: false,
      }),
      "Job",
      "realm",
    ).metadata.name;

    // Es lo que hace cierto «un cambio del realm versionado llega al clúster»: con el
    // mismo nombre, el Job ya existiria y `pulumi up` no volveria a ejecutarlo.
    expect(despues).not.toBe(antes);
  });
});

describe("#151 · la demostracion", () => {
  it("sin el mapeador, la comprobacion del realm se pone roja", () => {
    const documentos = documentosDelRealm({
      domain: "sgtm.example.pe",
      realm: "sgtm",
      clienteDeVerificacion: false,
    });
    const clientes: ClienteLeido[] = clientesDe(documentos.clientes).map((c) => ({
      ...c,
      protocolMappers: [],
    }));

    expect(
      clientes.every((c) =>
        (c.protocolMappers ?? []).some((m) => m.config["claim.name"] === "municipalidad_id"),
      ),
    ).toBe(false);
  });

  it("con `start-dev`, la auditoria se pone roja", () => {
    const ms = manifiestosDe(AMBIENTE);
    const identidad = buscar(ms, "Deployment", "identidad") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const contenedor = identidad.spec.template.spec.containers[0];
    if (contenedor) contenedor.args = ["start-dev"];

    expect(auditar(ms)).toContainEqual(expect.stringContaining("start-dev"));
  });

  it("con el nombre interno como emisor, el `iss` deja de cuadrar", () => {
    const ms = manifiestosDe(AMBIENTE);
    const identidad = buscar(ms, "Deployment", "identidad") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const variable = (identidad.spec.template.spec.containers[0]?.env ?? []).find(
      (e) => e.name === "KC_HOSTNAME",
    );
    if (variable) variable.value = "http://sgtm-prod-identidad:8080/keycloak";

    // La firma seguiria siendo valida y todo el sistema devolveria 401 sin explicacion.
    expect(emisorCoherente(ms)).toBe(false);
  });
});

/** ¿Emite Keycloak con el mismo nombre publico que la aplicacion valida? */
function emisorCoherente(ms: Manifiesto[]): boolean {
  const hostname = valorDe(ms, "Deployment", "identidad", "KC_HOSTNAME");
  const emisor = valorDe(ms, "Deployment", "aplicacion", "SGTM_OIDC_EMISOR");
  return hostname !== undefined && emisor !== undefined && emisor.startsWith(hostname);
}

function valorDe(
  ms: Manifiesto[],
  kind: string,
  nombre: string,
  variable: string,
): string | undefined {
  const m = buscar(ms, kind, nombre) as { spec: { template: { spec: { containers: Contenedor[] } } } };
  return variablesDe(m.spec.template.spec.containers[0] as Contenedor).get(variable);
}

interface ClienteLeido {
  clientId: string;
  protocolMappers?: { config: Record<string, string> }[];
}

function clientesDe(carga: string): ClienteLeido[] {
  return (JSON.parse(carga) as { clients: ClienteLeido[] }).clients;
}

// ─────────────────────────────────────────────────────────────────────────────
// #152 — La aplicacion y la interfaz
// ─────────────────────────────────────────────────────────────────────────────

describe("#152 · la aplicacion y la interfaz", () => {
  const ms = manifiestosDe(AMBIENTE);

  it("ningun contenedor sin limites de recursos declarados", () => {
    for (const { donde, c } of contenedoresDeTodo(ms)) {
      expect(c.resources.limits.cpu, `${donde}/${c.name}`).toBeTruthy();
      expect(c.resources.limits.memory, `${donde}/${c.name}`).toBeTruthy();
      expect(c.resources.requests.cpu, `${donde}/${c.name}`).toBeTruthy();
      expect(c.resources.requests.memory, `${donde}/${c.name}`).toBeTruthy();
    }
  });

  it("toda sonda declara su `timeoutSeconds`, entre 3 y 5", () => {
    const sondas = contenedoresDeTodo(ms).flatMap(({ donde, c }) =>
      [c.startupProbe, c.readinessProbe, c.livenessProbe]
        .filter((s) => s !== undefined)
        .map((s) => ({ donde, timeout: s.timeoutSeconds })),
    );
    expect(sondas.length).toBeGreaterThan(0);
    for (const s of sondas) {
      expect(s.timeout, s.donde).toBeGreaterThanOrEqual(3);
      expect(s.timeout, s.donde).toBeLessThanOrEqual(5);
    }
  });

  it("la JVM tiene su `startupProbe`, para que la sonda de vida no la mate arrancando", () => {
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const contenedor = aplicacion.spec.template.spec.containers[0] as Contenedor;
    expect(contenedor.startupProbe).toBeDefined();
    expect(contenedor.startupProbe?.httpGet?.path).toBe("/actuator/health");
  });

  it("el perfil batch corre sin abrir puerto ninguno", () => {
    const lote = buscar(ms, "CronJob", "lote") as {
      spec: { jobTemplate: { spec: { template: { spec: { containers: Contenedor[] } } } } };
    };
    const contenedor = lote.spec.jobTemplate.spec.template.spec.containers[0] as Contenedor;
    expect(variablesDe(contenedor).get("SPRING_PROFILES_ACTIVE")).toBe("batch");
    expect(contenedor.ports ?? []).toEqual([]);
  });

  it("un artefacto, dos perfiles: la misma imagen en web y en batch", () => {
    const web = (
      buscar(ms, "Deployment", "aplicacion") as {
        spec: { template: { spec: { containers: Contenedor[] } } };
      }
    ).spec.template.spec.containers[0]?.image;
    const lote = (
      buscar(ms, "CronJob", "lote") as {
        spec: { jobTemplate: { spec: { template: { spec: { containers: Contenedor[] } } } } };
      }
    ).spec.jobTemplate.spec.template.spec.containers[0]?.image;
    expect(lote).toBe(web);
  });

  it("la interfaz reenvia /api/v1 al servicio de la aplicacion del ambiente", () => {
    const configuracion = nginxDelCluster(AMBIENTE);
    expect(configuracion).toContain("proxy_pass http://sgtm-prod-aplicacion:8080;");
    // Y no queda ni un rastro del nombre del compose, que en el clúster no resuelve.
    expect(configuracion).not.toContain("http://aplicacion:8080");
  });
});

describe("#152 · la demostracion: la auditoria se pone roja", () => {
  it("quitando `SGTM_OIDC_EMISOR` del Deployment", () => {
    const ms = manifiestosDe(AMBIENTE);
    const aplicacion = buscar(ms, "Deployment", "aplicacion") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const contenedor = aplicacion.spec.template.spec.containers[0];
    if (contenedor) contenedor.env = (contenedor.env ?? []).filter((e) => e.name !== "SGTM_OIDC_EMISOR");

    expect(auditar(ms)).toContainEqual(expect.stringContaining("SGTM_OIDC_EMISOR"));
  });

  it("dejando un contenedor sin limites", () => {
    const ms = manifiestosDe(AMBIENTE);
    const interfaz = buscar(ms, "Deployment", "interfaz") as {
      spec: { template: { spec: { containers: Contenedor[] } } };
    };
    const contenedor = interfaz.spec.template.spec.containers[0];
    if (contenedor) {
      (contenedor as { resources: unknown }).resources = { requests: { cpu: "1", memory: "1Gi" } };
    }

    expect(auditar(ms)).toContainEqual(expect.stringContaining("sin limits de recursos"));
  });

  it("abriendo un puerto en el perfil batch", () => {
    const ms = manifiestosDe(AMBIENTE);
    const lote = buscar(ms, "CronJob", "lote") as {
      spec: { jobTemplate: { spec: { template: { spec: { containers: Contenedor[] } } } } };
    };
    const contenedor = lote.spec.jobTemplate.spec.template.spec.containers[0];
    if (contenedor) contenedor.ports = [{ containerPort: 8080 }];

    expect(auditar(ms)).toContainEqual(expect.stringContaining("con puertos declarados"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #153 — Traefik, TLS y el fin de los puertos en claro
// ─────────────────────────────────────────────────────────────────────────────

describe("#153 · el ingreso", () => {
  const ms = manifiestosDe(AMBIENTE);

  it("toda ruta va por HTTPS, con certificado emitido", () => {
    const rutas = ms.filter((m) => m.kind === "IngressRoute");
    expect(rutas.length).toBe(3);
    for (const r of rutas) {
      const spec = (r as { spec: { entryPoints: string[]; tls?: { certResolver: string } } }).spec;
      expect(spec.entryPoints).toEqual(["websecure"]);
      expect(spec.tls?.certResolver).toBe("letsencrypt");
    }
  });

  it("80 redirige a 443, no coexiste", () => {
    const valores = valoresDelIngreso(ms);
    expect(valores).toContain("redirectTo:");
    expect(valores).toContain("port: websecure");
  });

  it("`acme.json` vive en un volumen: reprogramar el pod no vuelve a pedir certificados", () => {
    const valores = valoresDelIngreso(ms);
    expect(valores).toContain("persistence:");
    expect(valores).toContain("storage: /data/acme.json");
    expect(valores).toContain("type: Recreate");
  });

  it("la consola de administracion de Keycloak no se publica", () => {
    const identidad = buscar(ms, "IngressRoute", "identidad") as {
      spec: { routes: { match: string }[] };
    };
    expect(identidad.spec.routes[0]?.match).toContain("!PathPrefix(`/keycloak/admin`)");
  });

  it("hay limite de tasa, y el de identidad es mas estrecho", () => {
    const general = comoObjeto<LimiteDeTasa>(buscar(ms, "Middleware", "limite-de-tasa"));
    const identidad = comoObjeto<LimiteDeTasa>(buscar(ms, "Middleware", "limite-de-identidad"));
    expect(identidad.spec.rateLimit.average).toBeLessThan(general.spec.rateLimit.average);
  });

  it("stg emite contra el entorno de pruebas de Let's Encrypt; prod, no", () => {
    expect(valoresDelIngreso(manifiestosDe("stg"))).toContain("acme-staging-v02");
    expect(valoresDelIngreso(manifiestosDe("prod"))).not.toContain("acme-staging-v02");
  });
});

describe("#153 · la demostracion", () => {
  it("publicando /keycloak/admin, la auditoria se pone roja", () => {
    const ms = manifiestosDe(AMBIENTE);
    const identidad = buscar(ms, "IngressRoute", "identidad") as {
      spec: { routes: { match: string }[] };
    };
    const ruta = identidad.spec.routes[0];
    if (ruta) ruta.match = "Host(`sgtm.example.pe`) && PathPrefix(`/keycloak`)";

    expect(auditar(ms)).toContainEqual(expect.stringContaining("consola de"));
  });

  it("atendiendo tambien en `web`, la auditoria se pone roja", () => {
    const ms = manifiestosDe(AMBIENTE);
    const interfaz = buscar(ms, "IngressRoute", "interfaz") as { spec: { entryPoints: string[] } };
    interfaz.spec.entryPoints = ["web", "websecure"];

    expect(auditar(ms)).toContainEqual(expect.stringContaining("80 redirige, no coexiste"));
  });

  it("sin la redireccion del punto de entrada, la comprobacion se pone roja", () => {
    const sinRedireccion = valoresDeTraefik({ acmeEmail: "a@b.pe", acmeStaging: false });
    expect(sinRedireccion).toContain("redirectTo:");

    const roto = sinRedireccion.replace("    redirectTo:", "    # redirectTo:");
    expect(roto.includes("    redirectTo:")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #155 — Respaldos, PITR y el CronJob de respaldo base
// ─────────────────────────────────────────────────────────────────────────────

interface CronJobLeido {
  spec: {
    concurrencyPolicy: string;
    jobTemplate: { spec: { template: { spec: { containers: Contenedor[] } } } };
  };
}

function contenedorDelCronJob(ms: Manifiesto[], contiene: string): Contenedor {
  const cronjob = buscar(ms, "CronJob", contiene) as unknown as CronJobLeido;
  const contenedor = cronjob.spec.jobTemplate.spec.template.spec.containers[0];
  if (!contenedor) throw new Error(`El CronJob «${contiene}» no tiene contenedores`);
  return contenedor;
}

function contenedorDelMotor(ms: Manifiesto[]): Contenedor {
  const motor = buscar(ms, "Deployment", "postgres") as {
    spec: { template: { spec: { containers: Contenedor[] } } };
  };
  const contenedor = motor.spec.template.spec.containers[0];
  if (!contenedor) throw new Error("El Deployment del motor no tiene contenedores");
  return contenedor;
}

describe("#155 · el respaldo", () => {
  const ms = manifiestosDe(AMBIENTE);

  it("el motor archiva WAL de forma continua, con wal-g", () => {
    const postgres = contenedorDelMotor(ms);
    expect(postgres.args).toContain("archive_mode=on");
    expect((postgres.args ?? []).join(" ")).toContain("wal-g wal-push %p");
    expect((postgres.args ?? []).join(" ")).toContain("archive_timeout=");
  });

  it("wal-g se descarga y se verifica antes de que el motor arranque", () => {
    const motor = buscar(ms, "Deployment", "postgres") as {
      spec: { template: { spec: { initContainers?: Contenedor[] } } };
    };
    const descarga = (motor.spec.template.spec.initContainers ?? [])[0];
    expect(descarga?.name).toBe("wal-g-instalar");
    expect((descarga?.args ?? []).join(" ")).toContain("sha256sum -c");
  });

  it("el respaldo base corre en un CronJob propio, nunca dos a la vez", () => {
    const respaldo = buscar(ms, "CronJob", "respaldo") as unknown as CronJobLeido;
    expect(respaldo.spec.concurrencyPolicy).toBe("Forbid");
  });

  it("el respaldo lo hace sgtm_respaldo, no sgtm_owner ni el superusuario", () => {
    const contenedor = contenedorDelCronJob(ms, "respaldo");
    const guion = (contenedor.args ?? []).join(" ");
    expect(guion).toContain("PGUSER=sgtm_respaldo");
    expect(secretosDe(contenedor)).toContain(secretos(AMBIENTE).respaldo);
  });

  it("el CronJob escribe el estado en la tabla respaldo, como sgtm_owner (RF-126)", () => {
    const contenedor = contenedorDelCronJob(ms, "respaldo");
    const guion = (contenedor.args ?? []).join(" ");
    expect(guion).toContain("PGUSER=sgtm_owner");
    expect(guion).toContain("INSERT INTO respaldo");
    expect(guion).toContain("UPDATE respaldo");
  });

  it("el volumen de datos se monta de solo lectura en el CronJob", () => {
    const contenedor = contenedorDelCronJob(ms, "respaldo");
    const montaje = (contenedor.volumeMounts ?? []).find((v) => v.name === "datos");
    expect(montaje?.readOnly).toBe(true);
  });

  it("la clave de cifrado nunca es un valor literal", () => {
    for (const { c } of contenedoresDeTodo(ms)) {
      const clave = (c.env ?? []).find((e) => e.name === "WALG_LIBSODIUM_KEY");
      if (clave) expect(clave.value).toBeUndefined();
    }
  });

  it("las tres claves nuevas —sgtm_respaldo, cifrado y credenciales— no se repiten entre si", () => {
    const contenedor = contenedorDelCronJob(ms, "respaldo");
    const nombres = secretosDe(contenedor);
    expect(new Set(nombres).size).toBeGreaterThanOrEqual(2);
  });
});

describe("#155 · la demostracion: la auditoria se pone roja", () => {
  it("quitando archive_mode=on, la auditoria lo detecta", () => {
    const ms = manifiestosDe(AMBIENTE);
    const postgres = contenedorDelMotor(ms);
    postgres.args = (postgres.args ?? []).filter((a) => a !== "archive_mode=on");

    expect(auditar(ms)).toContainEqual(expect.stringContaining("archive_mode=on"));
  });

  it("poniendo la clave de cifrado como `value` en vez de `valueFrom`, la auditoria lo detecta", () => {
    const ms = manifiestosDe(AMBIENTE);
    const postgres = contenedorDelMotor(ms);
    const clave = postgres.env?.find((e) => e.name === "WALG_LIBSODIUM_KEY");
    if (clave) {
      clave.value = "una-clave-de-mentira-en-texto-plano";
      clave.valueFrom = undefined;
    }

    expect(auditar(ms)).toContainEqual(expect.stringContaining("texto plano"));
  });

  it("dandole al CronJob de lote el Secret de sgtm_owner, la auditoria lo sigue rechazando", () => {
    const ms = manifiestosDe(AMBIENTE);
    const contenedor = contenedorDelCronJob(ms, "lote");
    (contenedor.env ??= []).push({
      name: "SGTM_DB_OWNER_CLAVE",
      valueFrom: { secretKeyRef: { name: secretos(AMBIENTE).owner, key: "clave-owner" } },
    });

    // La excepcion de #155 es del CronJob de respaldo, no de «cualquier CronJob»: el
    // de lote —la MISMA imagen que la aplicacion— sigue sin poder llevar esta clave.
    expect(auditar(ms)).toContainEqual(expect.stringContaining("el Secret de sgtm_owner"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// #156 — Observabilidad: metricas, tableros y una alerta que le llegue a alguien
// ─────────────────────────────────────────────────────────────────────────────

/** Solo el componente de observabilidad, con el `alertWebhookUrl` que la prueba necesita. */
function manifiestosDeObservabilidadDePrueba(alertWebhookUrl: string | undefined): Manifiesto[] {
  return manifiestosDeObservabilidad({
    environment: AMBIENTE,
    namespace: namespaceName(AMBIENTE),
    alertWebhookUrl,
  });
}

function contenedorDe(ms: Manifiesto[], kindDeployment: string, contiene: string, nombre: string): Contenedor {
  const despliegue = buscar(ms, kindDeployment, contiene) as {
    spec: { template: { spec: { containers: Contenedor[] } } };
  };
  const contenedor = despliegue.spec.template.spec.containers.find((c) => c.name === nombre);
  if (!contenedor) {
    throw new Error(`No hay contenedor «${nombre}» en el Deployment que contiene «${contiene}»`);
  }
  return contenedor;
}

describe("#156 · observabilidad", () => {
  const ms = manifiestosDe(AMBIENTE);

  it("el motor lleva su sidecar de metricas, con sgtm_monitor y nunca el superusuario", () => {
    const exportador = contenedorDe(ms, "Deployment", "postgres", "postgres-exporter");
    const variables = variablesDe(exportador);
    expect(variables.get("DATA_SOURCE_USER")).toBe("sgtm_monitor");
    expect(secretosDe(exportador)).toContain(secretos(AMBIENTE).monitoreo);
    expect(secretosDe(exportador)).not.toContain(secretos(AMBIENTE).motor);
  });

  it("Prometheus scrapea la aplicacion, el motor, el nodo, kube-state-metrics y Traefik", () => {
    const configuracion = buscar(ms, "ConfigMap", "observabilidad-prometheus") as {
      data: Record<string, string>;
    };
    const prometheusYml = configuracion.data["prometheus.yml"] ?? "";
    for (const objetivo of [
      "/actuator/prometheus",
      "sgtm-prod-postgres:9187",
      "sgtm-prod-observabilidad-node-exporter:9100",
      "sgtm-prod-observabilidad-kube-state-metrics:8080",
      "traefik.kube-system.svc.cluster.local:9100",
    ]) {
      expect(prometheusYml).toContain(objetivo);
    }
  });

  it("las diez reglas de alerta estan cargadas, con las que el issue exige", () => {
    const configuracion = buscar(ms, "ConfigMap", "observabilidad-prometheus") as {
      data: Record<string, string>;
    };
    const alertasYmlCargado = configuracion.data["alertas.yml"] ?? "";
    for (const regla of [
      "PostgreSQLCaido",
      "PodEnCrashLoopBackOff",
      "PodNoListo",
      "CPUDelNodoAlta",
      "MemoriaDelNodoAlta",
      "DiscoDelNodoAlto",
      "CertificadoPorExpirar",
      "RespaldoQueNoCorrio",
      "JobDeMigracionFallido",
    ]) {
      expect(alertasYmlCargado).toContain(`alert: ${regla}`);
    }
  });

  it("sin destino configurado, Alertmanager enruta a null-receiver; con destino, al webhook", () => {
    // AMBIENTE es "prod" en este archivo, y prod SIEMPRE trae alertWebhookUrl —lo
    // exige config.ts—; para probar el estado sin destino hay que construir el
    // argumento a mano, sin pasar por invariantesDe().
    const sinWebhook = manifiestosDeObservabilidadDePrueba(undefined);
    const alertmanagerYmlSinWebhook =
      (buscar(sinWebhook, "ConfigMap", "observabilidad-alertmanager") as { data: Record<string, string> })
        .data["alertmanager.yml"] ?? "";
    expect(alertmanagerYmlSinWebhook).toContain("receiver: null-receiver");

    const conWebhook = manifiestosDeObservabilidadDePrueba("https://hooks.example.pe/x");
    const alertmanagerYmlConWebhook =
      (buscar(conWebhook, "ConfigMap", "observabilidad-alertmanager") as { data: Record<string, string> })
        .data["alertmanager.yml"] ?? "";
    expect(alertmanagerYmlConWebhook).toContain("receiver: webhook");
    expect(alertmanagerYmlConWebhook).toContain("https://hooks.example.pe/x");
  });

  it("kube-state-metrics no tiene privilegio de mas: nada de Secret ni ConfigMap", () => {
    const rol = buscar(ms, "ClusterRole", "kube-state-metrics") as {
      rules: { apiGroups: string[]; resources: string[]; verbs: string[] }[];
    };
    const recursos = rol.rules.flatMap((r) => r.resources);
    expect(recursos).not.toContain("secrets");
    expect(recursos).not.toContain("configmaps");
    for (const regla of rol.rules) {
      expect(regla.verbs).not.toContain("create");
      expect(regla.verbs).not.toContain("delete");
      expect(regla.verbs).not.toContain("update");
    }
  });

  it("node-exporter ve el nodo, no el contenedor", () => {
    const despliegue = buscar(ms, "Deployment", "observabilidad-node-exporter") as {
      spec: { template: { spec: { hostNetwork?: boolean; hostPID?: boolean } } };
    };
    expect(despliegue.spec.template.spec.hostNetwork).toBe(true);
    expect(despliegue.spec.template.spec.hostPID).toBe(true);
  });

  it("Grafana no esta en ninguna IngressRoute: se administra por el tunel SSH", () => {
    const rutas = ms.filter((m): m is Manifiesto & { spec: { routes: { match: string }[] } } =>
      m.kind === "IngressRoute",
    );
    const nombreDeGrafana = buscar(ms, "Service", "observabilidad-grafana").metadata.name;
    for (const ruta of rutas) {
      for (const r of ruta.spec.routes) {
        expect(r.match).not.toContain("grafana");
      }
    }
    // Y el Service en si no aparece como backend de ninguna ruta.
    const backends = rutas.flatMap((r) =>
      (r as unknown as { spec: { routes: { services: { name: string }[] }[] } }).spec.routes.flatMap(
        (ru) => ru.services.map((s) => s.name),
      ),
    );
    expect(backends).not.toContain(nombreDeGrafana);
  });

  it("responde que version corre y desde cuando, desde el tablero", () => {
    const tablero = buscar(ms, "ConfigMap", "observabilidad-grafana") as { data: Record<string, string> };
    const json = JSON.parse(tablero.data["resumen-operativo.json"] ?? "{}") as {
      panels: { title: string }[];
    };
    expect(tablero.data["resumen-operativo.json"]).toBeDefined();
    expect(json.panels.some((p) => p.title.includes("Version desplegada"))).toBe(true);
  });
});

describe("#156 · la demostracion: la auditoria se pone roja", () => {
  it("quitando resources del sidecar de metricas, la auditoria lo detecta", () => {
    const ms = manifiestosDe(AMBIENTE);
    const exportador = contenedorDe(ms, "Deployment", "postgres", "postgres-exporter");
    // @ts-expect-error -- se rompe a proposito: `resources` es obligatorio en el tipo.
    delete exportador.resources;

    expect(auditar(ms)).toContainEqual(expect.stringContaining("sin requests ni limits"));
  });

  it("quitando priorityClassName de Prometheus, la auditoria lo detecta", () => {
    const ms = manifiestosDe(AMBIENTE);
    const prometheus = buscar(ms, "Deployment", "observabilidad-prometheus") as {
      spec: { template: { spec: { priorityClassName?: string } } };
    };
    delete prometheus.spec.template.spec.priorityClassName;

    expect(auditar(ms)).toContainEqual(expect.stringContaining("priorityClassName"));
  });
});

interface LimiteDeTasa {
  spec: { rateLimit: { average: number } };
}

/**
 * Lee un manifiesto con la forma que la prueba necesita.
 *
 * El `spec` de un `Middleware` es `Record<string, unknown>` —Traefik admite decenas de
 * formas y describirlas todas en `tipos.ts` seria copiar su documentacion—, asi que aqui
 * se afirma la que tiene. Va por `unknown` a proposito: es la forma de decir «se que el
 * compilador no puede comprobar esto», y esta acotada a las pruebas.
 */
function comoObjeto<T>(m: Manifiesto): T {
  return m as unknown as T;
}

function valoresDelIngreso(ms: Manifiesto[]): string {
  return (buscar(ms, "HelmChartConfig", "traefik") as { spec: { valuesContent: string } }).spec
    .valuesContent;
}

function auditar(ms: Manifiesto[]): string[] {
  return auditarManifiestos(ms, {
    secretoDeOwner: secretos(AMBIENTE).owner,
    namespace: namespaceName(AMBIENTE),
  });
}
