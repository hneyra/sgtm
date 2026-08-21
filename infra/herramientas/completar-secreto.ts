import { createHash, randomBytes } from "node:crypto";

/**
 * La logica de `bootstrap-secretos.sh`, como funcion pura (issue #154).
 *
 * Decide que claves le faltan a un `Secret` y genera solo esas — nunca toca una que ya
 * esta, y nunca junta dos claves con el mismo valor. Vive aparte del guion de bash a
 * proposito: es la parte que puede tener un defecto sutil —una condicion de carrera al
 * decidir "esto ya existe", una clave que se sobreescribe por error— y en TypeScript
 * tiene prueba unitaria sin tocar un cluster. El CLI de mas abajo es el unico que habla
 * con `kubectl`.
 */

/** Un `Secret` de Kubernetes, en la forma minima que este modulo necesita. */
export interface SecretoExistente {
  /** Los valores YA presentes, codificados en base64 —tal como los devuelve el API—. */
  data?: Record<string, string>;
}

export interface ResultadoDeCompletar {
  /** El `data` completo: lo que ya habia, mas lo generado. Todo en base64. */
  data: Record<string, string>;
  /** Las claves que este llamado genero. Vacio si no hizo falta nada. */
  generadas: string[];
}

/** Genera un valor aleatorio, ya en base64: 32 bytes de `crypto.randomBytes`. */
export function generadorPorOmision(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Completa un `Secret`: las claves de `requeridas` que no esten en `existente.data` se
 * generan con `generador`; las que ya esten, se preservan **sin decodificar** — el valor
 * base64 pasa tal cual, para no arriesgar una re-codificacion que lo cambie.
 *
 * Lanza si el `generador` produce el mismo valor dos veces en el mismo llamado: es la
 * comprobacion que pide el issue —"esa es la que hay que escribir: claves distintas,
 * comprobado"— hecha estructuralmente imposible de incumplir en silencio. Con
 * `crypto.randomBytes(32)` la probabilidad de colision es indistinguible de cero; la
 * prueba lo fuerza con un generador roto a proposito.
 */
export function completarSecreto(
  existente: SecretoExistente | undefined,
  requeridas: readonly string[],
  generador: () => string = generadorPorOmision,
): ResultadoDeCompletar {
  const data: Record<string, string> = { ...(existente?.data ?? {}) };
  const generadas: string[] = [];
  const vistos = new Set(Object.values(data));

  for (const clave of requeridas) {
    if (clave in data) continue;

    const valor = generador();
    if (vistos.has(valor)) {
      throw new Error(
        `El generador produjo un valor repetido para «${clave}». Dos claves con el ` +
          "mismo secreto anulan la separacion de privilegios entera (issue #154): si " +
          "esto ocurre con crypto.randomBytes, algo esta seriamente mal con la fuente " +
          "de aleatoriedad y no debe seguir.",
      );
    }
    vistos.add(valor);
    data[clave] = valor;
    generadas.push(clave);
  }

  return { data, generadas };
}

/** Un manifiesto de `Secret` listo para `kubectl apply -f -`. */
export function manifiestoDeSecreto(args: {
  nombre: string;
  namespace: string;
  data: Record<string, string>;
}): unknown {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: { name: args.nombre, namespace: args.namespace },
    type: "Opaque",
    data: args.data,
  };
}

/**
 * Una huella de un valor, para que un guion pueda registrar "la clave X cambio" **sin
 * imprimir la clave**. `sha256` corto: alcanza para distinguir un valor de otro en un
 * registro, y no alcanza para reconstruirlo.
 */
export function huella(valorBase64: string): string {
  return createHash("sha256").update(valorBase64, "base64").digest("hex").slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI: `secreto.json existente | vite-node completar-secreto.ts <nombre> <namespace> <clave...>`
// ─────────────────────────────────────────────────────────────────────────────

function leerEntradaEstandar(): Promise<string> {
  return new Promise((resolve, reject) => {
    let datos = "";
    process.stdin.on("data", (trozo) => (datos += trozo));
    process.stdin.on("end", () => resolve(datos));
    process.stdin.on("error", reject);
  });
}

async function principal(): Promise<void> {
  const [nombre, namespace, ...requeridas] = process.argv.slice(2);
  if (!nombre || !namespace || requeridas.length === 0) {
    throw new Error(
      "uso: completar-secreto.ts <nombre> <namespace> <clave...>, con el Secret " +
        "existente (o vacio) en la entrada estandar",
    );
  }

  const entrada = (await leerEntradaEstandar()).trim();
  const existente: SecretoExistente | undefined = entrada ? JSON.parse(entrada) : undefined;

  const resultado = completarSecreto(existente, requeridas);
  const manifiesto = manifiestoDeSecreto({ nombre, namespace, data: resultado.data });

  process.stdout.write(JSON.stringify(manifiesto) + "\n");
  for (const clave of resultado.generadas) {
    process.stderr.write(`  · ${nombre}/${clave}: generada (huella ${huella(resultado.data[clave]!)})\n`);
  }
}

if ((process.argv[1] ?? "").includes("completar-secreto")) {
  principal().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
