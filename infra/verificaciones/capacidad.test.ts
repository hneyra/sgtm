import { describe, expect, it } from "vitest";
import {
  auditarCapacidad,
  cpuEnMili,
  demandaDelStack,
  memoriaEnMi,
  type CapacidadDelNodo,
} from "../capacidad";
import { construirManifiestos } from "../componentes";
import { ENVIRONMENTS, type Environment } from "../config";
import { invariantesDe } from "./stacks";

/**
 * Que el stack de cada ambiente quepa en el nodo que ese ambiente declara.
 *
 * **La regresion que esta prueba existe para atrapar ya ocurrio, dos veces.** La
 * segunda —2026-08-25— dejo `aplicar-prod` colgado en cuatro corridas seguidas sin un
 * solo mensaje de error: `pulumi up` esperaba a `Deployment` que nunca quedarian
 * `Ready` porque sus pods no cabian. La cabecera de `capacidad.ts` cuenta las dos.
 *
 * Corre sin Pulumi, sin tunel y sin VPS, como el resto de `verificaciones/`: la cifra
 * del nodo es un dato del stack y lo que el stack pide se lee de los manifiestos.
 */

const nodoDe = (ambiente: Environment): CapacidadDelNodo => {
  const invariantes = invariantesDe(ambiente);
  return {
    cpuAsignable: invariantes.node.allocatableCpu,
    memoriaAsignable: invariantes.node.allocatableMemory,
  };
};

const manifiestosDe = (ambiente: Environment) => construirManifiestos(invariantesDe(ambiente));

describe("las cantidades de Kubernetes se leen como las lee Kubernetes", () => {
  it("CPU: milicores, enteros y decimales", () => {
    expect(cpuEnMili("500m")).toBe(500);
    expect(cpuEnMili("2")).toBe(2000);
    expect(cpuEnMili("0.5")).toBe(500);
    expect(cpuEnMili(undefined)).toBe(0);
  });

  it("memoria: los sufijos binarios, y el `Ki` que devuelve el API server", () => {
    expect(memoriaEnMi("64Mi")).toBe(64);
    expect(memoriaEnMi("1Gi")).toBe(1024);
    // El valor real de `vmd120205`, el que hay que poder pegar sin convertir a mano.
    expect(Math.round(memoriaEnMi("6029348Ki"))).toBe(5888);
  });

  it("un sufijo que no existe no se interpreta como bytes: lanza", () => {
    // Tragarse una unidad desconocida como bytes convertiria «6029348Kb» en 5 Mi y el
    // nodo pareceria diminuto; peor todavia al reves, con una cifra que sobrevalore.
    expect(() => memoriaEnMi("10Xi")).toThrow(/Sufijo de memoria desconocido/);
  });
});

describe("lo que pide el stack", () => {
  it("un pod reserva el maximo entre sus contenedores y su initContainer, no la suma", () => {
    // La regla de Kubernetes de verdad: los `initContainer` corren antes y de uno en
    // uno. Sumarlos inflaria la demanda de `aplicacion` —que tiene un initContainer de
    // espera— y haria fallar ambientes que si caben.
    const demanda = demandaDelStack([
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: "ejemplo", namespace: "n", labels: {} },
        spec: {
          replicas: 1,
          strategy: { type: "RollingUpdate" },
          selector: { matchLabels: {} },
          template: {
            metadata: { labels: {} },
            spec: {
              priorityClassName: "p",
              initContainers: [
                {
                  name: "espera",
                  image: "i",
                  resources: {
                    requests: { cpu: "10m", memory: "32Mi" },
                    limits: { cpu: "1", memory: "1Gi" },
                  },
                },
              ],
              containers: [
                {
                  name: "principal",
                  image: "i",
                  resources: {
                    requests: { cpu: "500m", memory: "1Gi" },
                    limits: { cpu: "1", memory: "2Gi" },
                  },
                },
              ],
            },
          },
        },
      },
    ]);
    expect(demanda.permanente.cpuEnMili).toBe(500);
    expect(demanda.permanente.memoriaEnMi).toBe(1024);
  });

  it("el pico del arranque cuenta los Jobs; lo permanente, no", () => {
    const demanda = demandaDelStack(manifiestosDe("prod"));
    // Los Jobs de migracion e implantacion piden 1 CPU cada uno y se crean a la vez
    // que los Deployment: son la diferencia entre las dos cifras, y son justo lo que
    // hace que el nodo no de abasto en el momento del despliegue.
    expect(demanda.picoDeArranque.cpuEnMili).toBeGreaterThan(demanda.permanente.cpuEnMili);
  });

  it("un CronJob suspendido no ocupa nada: el de `lote` espera a D-02a", () => {
    const conSuspendido = demandaDelStack(manifiestosDe("prod"));
    const lote = conSuspendido.pods.find((p) => p.contexto.includes("lote"));
    expect(lote).toBeUndefined();
  });
});

describe("cada ambiente cabe en el nodo que declara", () => {
  for (const ambiente of ENVIRONMENTS) {
    it(`«${ambiente}»`, () => {
      expect(auditarCapacidad(manifiestosDe(ambiente), nodoDe(ambiente))).toEqual([]);
    });
  }
});

describe("y se demuestra que puede fallar", () => {
  /**
   * El nodo de `prod` tal como estaba el 2026-08-25, con la reserva del issue #157
   * aplicada y `webReplicas: 2`: 2 CPU asignables. Es la configuracion exacta que
   * colgo `aplicar-prod` cuatro veces, y aqui tiene que ponerse roja.
   */
  /**
   * El defecto del issue #252, encerrado en una prueba.
   *
   * `reservar-recursos-del-nodo.sh` ponia 1 CPU y 1 Gi en `system-reserved` **y otro
   * tanto** en `kube-reserved`, y el kubelet resta los dos: 2 CPU y 2 Gi, el DOBLE de
   * lo que la tabla de INF-01 §2 —y la propia cabecera del guion— dicen reservar. En el
   * nodo de 8 CPU que la tabla dimensiona eso pasa desapercibido; en el de 4 que tiene
   * `prod` es la mitad de la maquina.
   *
   * Las dos mitades de esta prueba son las dos cifras medidas del mismo nodo, con la
   * reserva mal y bien. Si alguien devuelve el guion a poner el total en cada bucket, la
   * primera sigue en verde —describe el pasado— y la de arriba, «cada ambiente cabe en
   * el nodo que declara», se pone roja en cuanto se actualicen los valores del stack.
   */
  it("con la reserva DUPLICADA (2 CPU asignables), prod no cabia", () => {
    const problemas = auditarCapacidad(manifiestosDe("prod"), {
      cpuAsignable: "2",
      memoriaAsignable: "6029348Ki",
    });
    expect(problemas.join("\n")).toMatch(/no cabe en el nodo por CPU/);
    // El mensaje tiene que decir CUANTO falta: «no cabe» sin la cifra no dice si el
    // arreglo es una replica menos o un nodo entero mas.
    expect(problemas.join("\n")).toMatch(/Faltan \d+m/);
  });

  it("y con la reserva corregida (3 CPU asignables), el MISMO nodo si da", () => {
    // Mismo VPS, mismo stack: lo unico que cambia es que la reserva deja de llevarse el
    // doble de lo previsto. Es lo que demuestra que el problema nunca fue el tamano del
    // nodo -8 GB bastan- sino cuanto se le estaba quitando.
    expect(
      auditarCapacidad(manifiestosDe("prod"), { cpuAsignable: "3", memoriaAsignable: "6912Mi" }),
    ).toEqual([]);
  });

  it("con 4 GB —el nodo que el issue #158 ya probo insuficiente—, NO cabe por memoria", () => {
    const problemas = auditarCapacidad(manifiestosDe("prod"), {
      cpuAsignable: "16",
      memoriaAsignable: "4Gi",
    });
    expect(problemas.join("\n")).toMatch(/no cabe en el nodo por memoria/);
  });

  it("subir `webReplicas` por encima de lo que el nodo aguanta se pone rojo", () => {
    // La comprobacion no vive solo para el nodo que hay hoy: tiene que morder tambien
    // cuando alguien sube la demanda contra un nodo que antes bastaba.
    const invariantes = invariantesDe("prod");
    const manifiestos = construirManifiestos({
      ...invariantes,
      application: { ...invariantes.application, webReplicas: 40 },
    });
    expect(auditarCapacidad(manifiestos, { cpuAsignable: "16", memoriaAsignable: "64Gi" })).not
      .toEqual([]);
  });

  it("un nodo holgado no inventa problemas", () => {
    // El otro lado de la demostracion: si esto tambien saliera rojo, la comprobacion
    // no estaria midiendo nada, solo diciendo que no a todo.
    expect(
      auditarCapacidad(manifiestosDe("prod"), { cpuAsignable: "8", memoriaAsignable: "16Gi" }),
    ).toEqual([]);
  });
});
