import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Los archivos del repositorio que estos manifiestos montan **sin copiarlos**.
 *
 * `crear-roles.sql` y `20-asignar-claves.sh` ya existen y ya se ejecutan: el compose
 * los monta en la inicializacion del motor. En el clúster hay que **reproducir eso, no
 * reinventarlo** (issue #149), asi que se leen de donde estan y entran a un `ConfigMap`
 * tal cual. Una copia en `infra/` seria un segundo sitio donde olvidar que el rol no
 * puede ser superusuario, y las dos copias se separarian el dia que alguien toque una.
 *
 * `verificaciones/componentes.test.ts` comprueba que lo que va al `ConfigMap` es
 * **identico** al archivo del repositorio: si alguien pega una version editada, se pone
 * rojo.
 */

/**
 * La raiz de `infra/`, buscada hacia arriba desde el directorio de trabajo.
 *
 * Ni `__dirname` ni `import.meta.url`: el mismo archivo lo carga Pulumi como CommonJS y
 * vitest como modulo ES, y cada uno tiene el suyo. Lo que ambos comparten es que corren
 * dentro del arbol de `infra/`, asi que se busca el `Pulumi.yaml` hacia arriba. Si no
 * aparece, el error lo dice con todas sus letras en vez de leer un archivo vacio.
 */
export function raizDeInfra(desde: string = process.cwd()): string {
  let actual = resolve(desde);
  for (;;) {
    if (existsSync(join(actual, "Pulumi.yaml"))) return actual;
    const padre = dirname(actual);
    if (padre === actual) {
      throw new Error(
        `No se encontro «Pulumi.yaml» subiendo desde «${desde}». Los manifiestos leen ` +
          "archivos del repositorio (crear-roles.sql, el guion de claves) y necesitan " +
          "saber donde esta la raiz de infra/.",
      );
    }
    actual = padre;
  }
}

/** La raiz del repositorio: el padre de `infra/`. */
export function raizDelRepositorio(): string {
  return dirname(raizDeInfra());
}

function leer(ruta: string): string {
  if (!existsSync(ruta)) {
    throw new Error(
      `Falta «${ruta}». Los manifiestos de la base montan los guiones del repositorio ` +
        "en vez de copiarlos (issue #149): si el archivo se movio, hay que actualizar " +
        "esta ruta, no pegar una copia.",
    );
  }
  return readFileSync(ruta, "utf8");
}

/**
 * `crear-roles.sql`, del modulo del esquema.
 *
 * Es el mismo archivo que monta el compose y el mismo que la prueba de aislamiento da
 * por hecho. Crea los cuatro roles `NOLOGIN`, `NOSUPERUSER` y `NOBYPASSRLS`, y las
 * extensiones que la migracion necesita.
 */
export function crearRolesSql(): string {
  return leer(
    join(
      raizDelRepositorio(),
      "backend/sgtm-esquema/src/main/resources/db/roles/crear-roles.sql",
    ),
  );
}

/**
 * `20-asignar-claves.sh`, de la inicializacion del motor del compose.
 *
 * Lee `SGTM_CLAVE_OWNER` y `SGTM_CLAVE_APP` del entorno; en el compose salen del `.env`
 * y aqui de un `Secret`. El guion no cambia, que es justo lo que se quiere.
 */
export function asignarClavesSh(): string {
  return leer(join(raizDelRepositorio(), "despliegue/inicializacion-del-motor/20-asignar-claves.sh"));
}

/**
 * `30-base-de-keycloak.sh`. Este si es de `infra/`, y tiene motivo.
 *
 * El compose no lo necesita: alli Keycloak corre `start-dev` y guarda su base dentro
 * del contenedor. En el clúster Keycloak tiene base propia (issue #151), y crearla es
 * parte de inicializar el motor.
 */
export function baseDeKeycloakSh(): string {
  return leer(join(raizDeInfra(), "componentes/inicializacion/30-base-de-keycloak.sh"));
}

/**
 * El realm versionado, tal cual lo usa el compose.
 *
 * En el clúster no se importa al arrancar: lo aplica un Job con `partialImport` cada
 * vez que el contenido cambia (ver `Identidad.ts`). El archivo es el mismo.
 */
export function realmSgtmJson(): string {
  return leer(join(raizDelRepositorio(), "despliegue/identidad/realm-sgtm.json"));
}

/** El guion que reconcilia el realm contra Keycloak. Vive en `infra/`. */
export function reconciliarRealmSh(): string {
  return leer(join(raizDeInfra(), "componentes/identidad/reconciliar-realm.sh"));
}

/**
 * `nginx.conf` de la interfaz, **el del repositorio**.
 *
 * La imagen ya lo trae dentro, pero apunta al `aplicacion:8080` de la red del compose y
 * en el clúster el servicio se llama de otra manera. `Aplicacion.ts` le cambia esa
 * linea y monta el resultado; lo que **no** se hace es escribir aqui una segunda
 * configuracion de nginx, porque entonces la del compose y la del clúster se separarian
 * el dia que alguien toque una —y es exactamente la trampa que `ADR-0011` anota entre
 * los costos de tener dos formas de levantar el sistema—.
 */
export function nginxConf(): string {
  return leer(join(raizDelRepositorio(), "frontend/nginx.conf"));
}
