import { execFileSync } from "node:child_process";
import { raizDelRepositorio } from "../componentes/fuentes";
import type { Environment } from "../config";
import { invariantesDe } from "./stacks";

/**
 * La deriva entre lo que el ambiente DECLARA desplegar y lo que el repositorio declara
 * hoy (issue #675).
 *
 * ## El hueco que cierra, medido y no supuesto
 *
 * `verificaciones/ambiente/verificar-el-ambiente.sh` (#434) compara dos numeros: las
 * migraciones que la base tiene aplicadas y las que trae el `sha` que
 * `applicationBootstrapVersion` declara. Ese guion corrio contra `stg` el 2026-09-01 y
 * dijo, con toda la razon:
 *
 *     migraciones aplicadas: 48 - las que trae la version declarada: 48
 *     OK   el esquema esta al dia con la version declarada
 *
 * Y sin embargo `stg` corria **48 de las 61** que `main` declaraba ese mismo dia. Las
 * dos afirmaciones son ciertas a la vez porque son de dos cosas distintas: el ambiente
 * estaba al dia **con su version declarada**, y la version declarada llevaba desde el
 * 2026-08-29 sin moverse. El tercer numero no lo comparaba nadie.
 *
 * Y la deriva no se ve por ningun otro sitio, porque **el Job de migracion lleva la
 * version en el nombre** (`sufijoDeVersion()`, `componentes/Migracion.ts`): con la misma
 * version declarada, `pulumi up` no modifica ningun Job, no crea otro, y sale en verde
 * —«76 unchanged» en el ultimo `up` de prod—. Comprobado sin desplegar:
 *
 *     yarn --silent manifiestos --ambiente stg | grep migracion
 *     # "name": "sgtm-stg-migracion-5fc02f3a4493"   <- el que ya existe, Complete
 *
 * ## Por que la referencia es `origin/main` y no el arbol de trabajo
 *
 * Porque `applicationBootstrapVersion` tiene que ser un `sha` **con imagenes
 * publicadas**, y `publicar-imagenes.yml` las publica al integrar en `main`: un PR no
 * puede conocer su propio `sha` de integracion. Comparar contra el arbol de trabajo
 * dejaria en rojo, por construccion, a todo PR que anada una migracion —su autor no
 * tendria ninguna version a la que subir—, y una comprobacion que no se puede satisfacer
 * se acaba desactivando.
 *
 * Contra `origin/main` el reparto es el correcto:
 *
 *   - el PR que anade la migracion esta en **verde**: `origin/main` todavia no la tiene;
 *   - en cuanto ese PR se integra, `origin/main` la tiene y esto se pone **rojo**, que es
 *     el aviso que faltaba;
 *   - el PR que sube la version lo devuelve a verde en una linea.
 *
 * La deriva sigue pudiendo existir —hace falta un PR mas para cerrarla—, pero deja de
 * poder crecer **en silencio**, que es lo que el issue #675 pide.
 */

/** Donde viven las migraciones de Flyway, relativo a la raiz del repositorio. */
const MIGRACIONES = "backend/sgtm-esquema/src/main/resources/db/migration/";

/**
 * La revision de referencia: lo que el repositorio declara hoy.
 *
 * `origin/main` y no `HEAD`, por lo que dice el comentario de arriba. Es una constante
 * con nombre para que salga en el mensaje y para que cambiarla sea deliberado.
 */
export const REVISION_DE_REFERENCIA = "origin/main";

export interface DerivaDeMigraciones {
  ambiente: Environment;
  /** El `sha` que `applicationBootstrapVersion` declara. */
  version: string;
  /** Migraciones que trae ese `sha`. */
  traeLaVersion: number;
  /** Migraciones que declara la revision de referencia. */
  declaraLaReferencia: number;
  /** Las que la referencia tiene y la version declarada no. Ordenadas. */
  faltan: string[];
}

/**
 * Las migraciones que un `commit` trae, contadas en el arbol de git de ESE `commit`.
 *
 * Nunca sobre el arbol de trabajo: es la misma cautela que `verificar-el-ambiente.sh`
 * escribio primero. Contar los archivos que hay en el disco seria contar OTRA version, y
 * un numero plausible y equivocado es peor que ninguno.
 */
function migracionesDe(revision: string): string[] {
  const raiz = raizDelRepositorio();
  try {
    execFileSync("git", ["-C", raiz, "rev-parse", "--verify", "--quiet", `${revision}^{commit}`], {
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    throw new Error(
      `«${revision}» no esta en este clon, asi que no se puede saber cuantas migraciones ` +
        "trae. Esta comprobacion NO se salta: un numero inventado seria peor que ninguno.\n" +
        "  En CI, `actions/checkout` necesita `fetch-depth: 0`.\n" +
        "  En local, hay que traerse la revision (fetch de origin) antes de correr esto.",
    );
  }

  const salida = execFileSync("git", ["-C", raiz, "ls-tree", "--name-only", revision, MIGRACIONES], {
    encoding: "utf8",
  });

  return salida
    .split("\n")
    .filter((linea) => linea.endsWith(".sql"))
    .map((linea) => linea.slice(MIGRACIONES.length))
    .sort();
}

/** La deriva de un ambiente, medida contra la revision de referencia. */
export function derivaDeMigraciones(
  ambiente: Environment,
  referencia: string = REVISION_DE_REFERENCIA,
): DerivaDeMigraciones {
  const version = invariantesDe(ambiente).application.bootstrapVersion;
  const deLaVersion = migracionesDe(version);
  const deLaReferencia = migracionesDe(referencia);
  const trae = new Set(deLaVersion);

  return {
    ambiente,
    version,
    traeLaVersion: deLaVersion.length,
    declaraLaReferencia: deLaReferencia.length,
    faltan: deLaReferencia.filter((archivo) => !trae.has(archivo)),
  };
}

/**
 * El diagnostico, con **las dos cifras** y que hacer. Cadena vacia si no hay deriva.
 *
 * Se separa de la medicion para poder probar el texto con cifras inventadas: esa prueba
 * no depende de que los ambientes esten al dia, asi que sigue diciendo lo mismo el dia
 * en que lo esten.
 */
export function loQueFalta(deriva: DerivaDeMigraciones): string {
  if (deriva.faltan.length === 0) return "";

  const corta = deriva.version.slice(0, 12);
  return (
    `El ambiente «${deriva.ambiente}» declara la version ${corta}, que trae ` +
    `${deriva.traeLaVersion} migraciones, y ${REVISION_DE_REFERENCIA} declara ` +
    `${deriva.declaraLaReferencia}: le faltan ${deriva.faltan.length} ` +
    `(${deriva.faltan.join(", ")}).\n` +
    "  Nada lo delata solo: el Job lleva la version EN EL NOMBRE, asi que mientras esa " +
    `linea no se mueva «sgtm-${deriva.ambiente}-migracion-${corta}» ya existe, ` +
    "`pulumi up` no crea ninguno y sale en verde.\n" +
    "  Remedio: subir `sgtm:applicationBootstrapVersion` en " +
    `infra/Pulumi.${deriva.ambiente}.yaml al ultimo sha de main con las tres imagenes ` +
    "publicadas (publicar-imagenes.yml en verde para ese sha)."
  );
}
