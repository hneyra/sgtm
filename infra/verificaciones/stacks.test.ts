import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkInvariants,
  ENVIRONMENTS,
  MissingConfigError,
  readInvariants,
  type ConfigReader,
} from "../config";

/**
 * Los `Pulumi.<ambiente>.yaml` versionados en este repositorio cumplen sus propias
 * invariantes.
 *
 * `config.test.ts` demuestra que las reglas muerden contra configuraciones construidas
 * a mano. Esta prueba las aplica a **los archivos reales**, que es donde el
 * incumplimiento ocurriria de verdad: alguien sube el plazo de archivado del WAL,
 * publica un puerto «un momento» o le pone etiqueta a la imagen, y nada se pone rojo
 * hasta que alguien mira.
 *
 * Y hace algo que `pulumi preview` no puede hacer aqui: **corre sin Pulumi**. El
 * `preview` de CI necesita el token de Pulumi Cloud y los dos stacks creados; esta
 * prueba solo necesita el archivo, asi que la demostracion del issue —quitar un valor
 * obligatorio de `Pulumi.prod.yaml` y ver que se pone rojo diciendo cual falta— se
 * puede correr en cualquier maquina, tambien en un PR de alguien de fuera.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

/**
 * Lector minimo de un `Pulumi.<ambiente>.yaml`.
 *
 * Solo entiende la forma que estos archivos tienen —`config:` y debajo una linea
 * `sgtm:clave: valor` por valor—, y es a proposito: reconoce exactamente lo que Pulumi
 * lee de ellos, sin traer un analizador de YAML entero para ocho lineas. Si algun dia
 * un stack necesita estructuras anidadas, aqui es donde se nota.
 */
function leerStack(ambiente: string): ConfigReader {
  const texto = readFileSync(join(RAIZ, `Pulumi.${ambiente}.yaml`), "utf8");
  const valores = new Map<string, string>();

  for (const linea of texto.split("\n")) {
    const limpia = linea.split("#")[0] ?? "";
    const casa = /^\s+sgtm:([A-Za-z0-9_]+):\s*(.+?)\s*$/.exec(limpia);
    if (casa && casa[1] !== undefined && casa[2] !== undefined) {
      valores.set(casa[1], casa[2].replace(/^["']|["']$/g, ""));
    }
  }

  // Las conversiones son las de Pulumi: en el archivo todo es texto, y `getNumber`,
  // `getBoolean` y `getObject` lo interpretan al leerlo.
  return {
    text: (clave) => valores.get(clave),
    number: (clave) => {
      const bruto = valores.get(clave);
      return bruto === undefined ? undefined : Number(bruto);
    },
    boolean: (clave) => {
      const bruto = valores.get(clave);
      return bruto === undefined ? undefined : bruto === "true";
    },
    object: <T>(clave: string) => {
      const bruto = valores.get(clave);
      return bruto === undefined ? undefined : (JSON.parse(bruto) as T);
    },
  };
}

describe("los stacks versionados cumplen sus invariantes", () => {
  it.each(ENVIRONMENTS)("Pulumi.%s.yaml", (ambiente) => {
    const invariantes = readInvariants(ambiente, leerStack(ambiente));
    expect(checkInvariants(invariantes)).toEqual([]);
  });

  it("prod no lleva ninguno de los atajos de stg", () => {
    const prod = readInvariants("prod", leerStack("prod"));
    expect(prod.ingress.acmeStaging).toBe(false);
    expect(prod.identity.seedTestUsers).toBe(false);
    expect(prod.backup.restoreSourceBucket).toBeUndefined();
  });

  it("stg va marcada como instalacion de demostracion", () => {
    const stg = readInvariants("stg", leerStack("stg"));
    expect(stg.application.isDemonstration).toBe(true);
  });

  it("los dos ambientes respaldan en contenedores distintos", () => {
    const stg = readInvariants("stg", leerStack("stg"));
    const prod = readInvariants("prod", leerStack("prod"));
    expect(stg.backup.bucket).not.toBe(prod.backup.bucket);
  });

  it("ningun stack versiona un secreto en claro", () => {
    for (const ambiente of ENVIRONMENTS) {
      const texto = readFileSync(join(RAIZ, `Pulumi.${ambiente}.yaml`), "utf8");
      const lineas = texto.split("\n").filter((l) => !l.trimStart().startsWith("#"));
      for (const clave of [
        "kubeconfig",
        "keycloakAdminPassword",
        "backupAccessKeyId",
        "backupSecretAccessKey",
      ]) {
        expect(
          lineas.some((l) => l.includes(`sgtm:${clave}:`)),
          `«${clave}» no puede estar en Pulumi.${ambiente}.yaml sin cifrar`,
        ).toBe(false);
      }
    }
  });
});

describe("la demostracion del issue: quitar un valor obligatorio pone rojo el stack", () => {
  it("sin `domain`, la lectura de prod falla diciendo cual falta", () => {
    const completo = leerStack("prod");
    const sinDominio: ConfigReader = {
      ...completo,
      text: (clave) => (clave === "domain" ? undefined : completo.text(clave)),
    };

    let error: unknown;
    try {
      readInvariants("prod", sinDominio);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(MissingConfigError);
    expect((error as MissingConfigError).key).toBe("domain");
    expect((error as Error).message).toContain("sgtm:domain");
  });
});
