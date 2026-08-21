import { describe, expect, it } from "vitest";
import { completarSecreto, huella, manifiestoDeSecreto } from "../herramientas/completar-secreto";

/**
 * La logica de `bootstrap-secretos.sh`, sin tocar ningun cluster.
 *
 * Es la mitad que importa del issue #154: que un despliegue desde cero genere lo que
 * falta, que volver a correrlo no cambie nada, y que dos claves nunca terminen con el
 * mismo valor —la comprobacion que el issue pide explicitamente, no solo "roles
 * distintos" sino "claves distintas, comprobado"—.
 */

/** Un generador de mentira, para que las pruebas sean deterministas. */
function generadorDeSecuencia(...valores: string[]): () => string {
  let i = 0;
  return () => {
    const valor = valores[i];
    i += 1;
    if (valor === undefined) throw new Error("El generador de prueba se quedo sin valores");
    return valor;
  };
}

describe("completarSecreto", () => {
  it("sin Secret previo, genera las claves requeridas", () => {
    const resultado = completarSecreto(undefined, ["a", "b"], generadorDeSecuencia("v1", "v2"));
    expect(resultado.data).toEqual({ a: "v1", b: "v2" });
    expect(resultado.generadas).toEqual(["a", "b"]);
  });

  it("preserva lo que ya existe, sin decodificarlo ni tocarlo", () => {
    const resultado = completarSecreto(
      { data: { a: "yaEstabaEnBase64==" } },
      ["a", "b"],
      generadorDeSecuencia("nueva-para-b"),
    );
    expect(resultado.data.a).toBe("yaEstabaEnBase64==");
    expect(resultado.data.b).toBe("nueva-para-b");
    // Solo genero lo que faltaba: "a" no cuenta como generada.
    expect(resultado.generadas).toEqual(["b"]);
  });

  it("es idempotente: correrlo sobre su propio resultado no genera nada", () => {
    const primero = completarSecreto(undefined, ["a", "b"], generadorDeSecuencia("v1", "v2"));
    const segundo = completarSecreto(
      { data: primero.data },
      ["a", "b"],
      () => {
        throw new Error("no deberia llamarse: todo ya estaba");
      },
    );
    expect(segundo.data).toEqual(primero.data);
    expect(segundo.generadas).toEqual([]);
  });

  it("nunca produce dos claves con el mismo valor: lanza si el generador se repite", () => {
    // La demostracion del issue: "volviendo a poner la misma clave para sgtm_owner y
    // sgtm_app... esa es la que hay que escribir: claves distintas, comprobado". Aqui
    // se fuerza con un generador roto a proposito, porque con crypto.randomBytes(32)
    // de verdad esto no ocurre nunca.
    expect(() =>
      completarSecreto(undefined, ["sgtm-owner", "sgtm-app"], generadorDeSecuencia("misma", "misma")),
    ).toThrow(/valor repetido/);
  });

  it("un generador real (crypto.randomBytes) no colisiona en mil claves", () => {
    const resultado = completarSecreto(undefined, Array.from({ length: 1000 }, (_, i) => `k${i}`));
    const valores = new Set(Object.values(resultado.data));
    expect(valores.size).toBe(1000);
  });
});

describe("manifiestoDeSecreto", () => {
  it("arma un Secret de Kubernetes aplicable con kubectl apply", () => {
    const m = manifiestoDeSecreto({
      nombre: "sgtm-stg-postgres-app",
      namespace: "sgtm-stg",
      data: { "clave-app": "dmFsb3I=" },
    }) as { apiVersion: string; kind: string; metadata: { name: string; namespace: string } };

    expect(m.apiVersion).toBe("v1");
    expect(m.kind).toBe("Secret");
    expect(m.metadata).toEqual({ name: "sgtm-stg-postgres-app", namespace: "sgtm-stg" });
  });
});

describe("huella", () => {
  it("dos valores distintos dan huellas distintas, y nunca revela el valor", () => {
    const a = huella(Buffer.from("valor-uno").toString("base64"));
    const b = huella(Buffer.from("valor-dos").toString("base64"));
    expect(a).not.toBe(b);
    expect(a).not.toContain("valor-uno");
    expect(a).toHaveLength(12);
  });

  it("el mismo valor da siempre la misma huella", () => {
    const valor = Buffer.from("estable").toString("base64");
    expect(huella(valor)).toBe(huella(valor));
  });
});
