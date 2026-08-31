import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **Quien protege a la regla que protege a las 134 pantallas.**
 *
 * Toda modificacion de datos exige observacion del usuario (regla 10 de
 * CLAUDE.md, RNF-052), y en el frontend eso no lo sostiene la disciplina de cada
 * pantalla: lo sostiene que **solo haya un sitio desde el que se escriba**.
 * `eslint.config.js` prohibe `useMutation` en todo el frontend
 * (`no-restricted-syntax`), asi que una pantalla que quisiera guardar sin pedir
 * la observacion no puede: no hay otra forma de guardar que `useEscritura`.
 *
 * Esa regla tiene un agujero conocido y trivial de abrir: **un
 * `eslint-disable-next-line` copiado**. Basta una linea para que la pantalla
 * numero 135 escriba por su cuenta, sin observacion, con `yarn lint` en verde y
 * sin ningun sintoma en la pantalla. La regla de ESLint protege a las 134
 * pantallas; **este escaner protege a la regla de ESLint**, que es el mismo
 * reparto que ya hace el escaner de fuentes del backend con `SET SESSION` y con
 * los literales tributarios: la prohibicion la escribe una herramienta, y otra
 * cuenta las excepciones.
 *
 * Hoy las excepciones son **tres**, y son distintas a proposito:
 *
 *   1. `pantallas/escritura.ts` — el camino de escritura entero. Es el que
 *      exige la observacion, y por eso es legitimo.
 *   2. `pantallas/useSimulacion.ts` — una simulacion **no modifica datos**, asi
 *      que la regla 10 no le aplica; lo que la pone aqui es que la operacion del
 *      contrato es un `POST` (las cinco pantallas de determinacion tienen una
 *      sola operacion, la misma con la que se determinaria), de modo que la
 *      peticion sale por `enviarOperacion` y ESLint la ve como una mutacion
 *      suelta. Su guarda es la marca `simulacion: true` del cuerpo.
 *   3. `pantallas/useLecturaPorPost.ts` (#424) — una **lectura** cuyo criterio
 *      no cabe en una URL. Tampoco modifica datos, asi que tampoco pide
 *      observacion; lo que la pone aqui es lo mismo que a la simulacion, que su
 *      operacion del contrato es un `POST`. Su guarda vive en
 *      `pantallas/lecturas-por-post.ts` y la comprueba
 *      `lectura-por-post.test.ts`: verbo primero, y despues que ninguna opcion
 *      declare esa operacion como su escritura.
 *
 * Lo que se afirma, en orden:
 *
 *   1. `useMutation` se llama en **exactamente esos tres archivos**, y un cuarto
 *      se nombra por su ruta —un «expected 4 to be 3» no dice donde mirar—.
 *   2. Cada uno lleva su `eslint-disable-next-line no-restricted-syntax`
 *      **pegado** a su llamada. Que falte lo dice ya ESLint; lo que aqui se
 *      defiende es lo contrario: que el `disable` no viva suelto lejos de lo que
 *      exime, eximiendo de paso a lo que nadie reviso.
 *   3. Cada uno lleva su justificacion escrita al lado, y **dice lo que hace
 *      legitimo a ese** —la observacion en el primero, la simulacion que no
 *      escribe en el segundo, la lectura que no escribe en el tercero—: un
 *      `disable` sin motivo es el que se copia.
 *   4. Los dos que no escriben **no piden la observacion a nadie**. Es la
 *      afirmacion que separa los tres caminos: el dia que una simulacion o una
 *      lectura exigieran observacion serian escrituras, y una escritura no puede
 *      ser un camino aparte.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Los tres, por su ruta relativa a `frontend/`. Es lo que se nombra al fallar. */
const ESCRITURA = 'apps/backoffice/src/pantallas/escritura.ts';
const SIMULACION = 'apps/backoffice/src/pantallas/useSimulacion.ts';
const LECTURA_POR_POST = 'apps/backoffice/src/pantallas/useLecturaPorPost.ts';
const PERMITIDOS = [ESCRITURA, SIMULACION, LECTURA_POR_POST];

/** Los dos que **no** escriben: ninguno puede pedir la observacion (ver §4 de arriba). */
const SIN_OBSERVACION = [SIMULACION, LECTURA_POR_POST];

/** Un archivo de fuentes, con sus lineas: la posicion importa en este escaner. */
interface Fuente {
  readonly archivo: string;
  /** Tal cual esta escrito. Es de aqui de donde se leen los comentarios. */
  readonly lineas: readonly string[];
  /**
   * Lo mismo con los bloques `/* … *\/` en blanco, **conservando las lineas**.
   *
   * Hace falta por lo mismo que en `portal-separado.test.ts`: un escaner que lee
   * la documentacion no lee el codigo. El docblock de `useSimulacion.ts` explica
   * por que hay un `useMutation` aqui, y un escaneo ingenuo lo contaria como una
   * llamada mas. Se blanquea en vez de borrarse para que el indice de cada linea
   * siga siendo el mismo en las dos vistas.
   */
  readonly codigo: readonly string[];
}

/** Lo que no es codigo de produccion del frontend. */
const excluido = (entrada: string): boolean =>
  entrada === 'node_modules' || entrada === 'dist' || entrada === 'coverage';

const esFuente = (entrada: string): boolean =>
  /\.tsx?$/.test(entrada) && !entrada.includes('.test.') && !entrada.endsWith('.generado.ts');

const enBlanco = (codigo: string): string =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '));

function fuentesDe(raiz: string, que: string): Fuente[] {
  const encontradas: Fuente[] = [];
  const recorrer = (carpeta: string, prefijo: string): void => {
    for (const entrada of readdirSync(carpeta)) {
      if (excluido(entrada)) continue;
      const camino = join(carpeta, entrada);
      if (statSync(camino).isDirectory()) {
        recorrer(camino, `${prefijo}${entrada}/`);
      } else if (esFuente(entrada)) {
        const texto = readFileSync(camino, 'utf8');
        encontradas.push({
          archivo: `${que}/${prefijo}${entrada}`,
          lineas: texto.split('\n'),
          codigo: enBlanco(texto).split('\n'),
        });
      }
    }
  };
  recorrer(raiz, '');
  return encontradas;
}

/* `verificaciones/` queda fuera sin necesidad de excluirlo: no cuelga de
   ninguna de las dos raices. Y tiene que quedar fuera, porque
   `verificaciones/muestras/escritura-sin-observacion.tsx` es una violacion
   escrita a proposito —la que demuestra que la regla de ESLint muerde— y
   contarla aqui pondria en rojo para siempre la prueba de que la regla funciona. */
const FUENTES = ['apps', 'packages'].flatMap((carpeta) =>
  fuentesDe(join(AQUI, '..', carpeta), carpeta),
);

/** La llamada, no la mencion: `useMutation(` o `useMutation<…>(`. */
const LLAMADA = /\buseMutation\s*(?:<[^>]*>)?\s*\(/;
/** Una linea que es comentario de linea o parte de un bloque ya blanqueado. */
const COMENTARIO = /^\s*(?:\/\/|\*|\/\*)/;

/** En que lineas de cada archivo se **llama** a `useMutation`. */
function llamadasDe(fuente: Fuente): number[] {
  const lineas: number[] = [];
  fuente.codigo.forEach((linea, indice) => {
    if (LLAMADA.test(linea) && !/^\s*\/\//.test(linea)) lineas.push(indice);
  });
  return lineas;
}

const CON_MUTACION = FUENTES.filter((fuente) => llamadasDe(fuente).length > 0);

describe('el escaner mira donde dice mirar', () => {
  it('recorre las fuentes de las dos aplicaciones y de los paquetes', () => {
    /* Sin esto, una raiz mal apuntada dejaria las pruebas de abajo recorriendo
       una lista vacia: en verde, y sin haber leido un solo archivo. */
    expect(FUENTES.length).toBeGreaterThan(100);
    for (const carpeta of ['apps/backoffice', 'apps/portal', 'packages']) {
      expect(
        FUENTES.some(({ archivo }) => archivo.startsWith(carpeta)),
        `no se escaneo ningun archivo de ${carpeta}`,
      ).toBe(true);
    }
    // Y los tres que se van a examinar existen con la ruta que aqui se escribe:
    // renombrar uno dejaria sus tres comprobaciones sin sujeto.
    for (const camino of PERMITIDOS) {
      expect(
        FUENTES.some(({ archivo }) => archivo === camino),
        `«${camino}» no esta entre las fuentes escaneadas: ¿se movio de sitio?`,
      ).toBe(true);
    }
  });
});

describe('useMutation vive en tres caminos, y en ningun otro', () => {
  it('no hay un cuarto sitio que escriba por su cuenta', () => {
    /* **Se nombra el archivo, uno a uno, antes de contar.** Un `toHaveLength(2)`
       a secas dice «expected 3 to be 2» y deja a quien lo lee buscando cual de
       los cientos de archivos es; lo que hace falta saber es la ruta. */
    for (const { archivo } of CON_MUTACION) {
      expect(
        PERMITIDOS.includes(archivo),
        `«${archivo}» abre un cuarto camino de escritura: llama a useMutation fuera de ` +
          `«${ESCRITURA}», «${SIMULACION}» y «${LECTURA_POR_POST}». Toda modificacion de datos ` +
          `exige observacion (regla 10, RNF-052), y lo unico que lo garantiza es que se escriba ` +
          `por un solo sitio.`,
      ).toBe(true);
    }
  });

  it('y los tres que hay siguen siendo los tres que se esperan', () => {
    /* La otra direccion: borrar la llamada de uno de los tres —o dejar de
       llamarla y quedarse el `disable`— tambien tiene que decirse. */
    const archivos = CON_MUTACION.map(({ archivo }) => archivo);
    for (const camino of PERMITIDOS) {
      expect(archivos, `«${camino}» ya no llama a useMutation`).toContain(camino);
    }
    expect(archivos).toHaveLength(3);
  });
});

/** El archivo, ya localizado, para las comprobaciones que miran su interior. */
const fuenteDe = (camino: string): Fuente => {
  const encontrada = FUENTES.find(({ archivo }) => archivo === camino);
  if (encontrada === undefined) throw new Error(`no se encontro «${camino}»`);
  return encontrada;
};

/**
 * La primera linea con algo escrito por encima de otra.
 *
 * Se salta las lineas en blanco a proposito: lo que se exige es que el `disable`
 * este **pegado** a lo que exime, y una linea vacia en medio ya no lo eximiria
 * —ESLint lo diria antes que esta prueba—.
 */
function anteriorNoVacia(fuente: Fuente, desde: number): number {
  for (let i = desde - 1; i >= 0; i -= 1) {
    if ((fuente.lineas[i] ?? '').trim() !== '') return i;
  }
  return -1;
}

const ES_DISABLE = /eslint-disable-next-line\b.*\bno-restricted-syntax\b/;

describe('cada excepcion esta pegada a lo que exime', () => {
  for (const camino of PERMITIDOS) {
    it(`«${camino}» lleva su eslint-disable-next-line justo encima`, () => {
      const fuente = fuenteDe(camino);
      const llamadas = llamadasDe(fuente);
      expect(llamadas, `«${camino}» no llama a useMutation`).not.toHaveLength(0);

      for (const llamada of llamadas) {
        const previa = anteriorNoVacia(fuente, llamada);
        expect(
          ES_DISABLE.test(fuente.lineas[previa] ?? ''),
          `en «${camino}:${llamada + 1}» la llamada a useMutation no lleva su ` +
            `eslint-disable-next-line no-restricted-syntax inmediatamente encima; la linea ` +
            `anterior dice: ${(fuente.lineas[previa] ?? '(nada)').trim()}`,
        ).toBe(true);
      }
    });
  }

  it('y ningun disable de esa regla vive suelto en el frontend', () => {
    /* El reverso de la comprobacion de arriba, y el que cierra el agujero de
       verdad: un `eslint-disable-next-line no-restricted-syntax` puesto sobre
       cualquier otra cosa exime tambien a lo que nadie reviso —la regla prohibe
       mas de una construccion—, y desde ahi hasta un `useMutation` que ya no
       cuenta hay una linea de distancia. */
    const sueltos: string[] = [];
    for (const fuente of FUENTES) {
      fuente.codigo.forEach((linea, indice) => {
        if (!ES_DISABLE.test(linea)) return;
        if (!PERMITIDOS.includes(fuente.archivo)) {
          sueltos.push(`${fuente.archivo}:${indice + 1}`);
          return;
        }
        // En los dos permitidos, lo que sigue tiene que ser la llamada.
        if (!LLAMADA.test(fuente.codigo[indice + 1] ?? '')) {
          sueltos.push(`${fuente.archivo}:${indice + 1} (no exime a un useMutation)`);
        }
      });
    }

    expect(sueltos).toEqual([]);
  });
});

/**
 * Lo que cada justificacion tiene que decir.
 *
 * **No se compara un texto literal**, y no por comodidad: la justificacion es
 * prosa y se reescribe cada vez que alguien la explica mejor —el docblock de
 * `useSimulacion.ts` ya se reescribio una vez—, asi que una comparacion letra a
 * letra se romperia sin que nada haya empeorado, y quien la arreglara aprenderia
 * a actualizar la prueba en vez de a mirar el motivo. Lo que no puede cambiar es
 * **de que habla cada una**, porque es lo que las hace distintas: si la del
 * camino de escritura dejara de mencionar la observacion, o la de la simulacion
 * dejara de decir que no escribe, la excepcion habria cambiado de naturaleza
 * aunque el `disable` siga en su sitio. Por eso se busca el concepto, con sus
 * dos grafias —los comentarios de este repositorio se escriben sin tildes, pero
 * la prohibicion es de identificadores, no de prosa—.
 */
const JUSTIFICACIONES: readonly { camino: string; habla: RegExp; de: string }[] = [
  {
    camino: ESCRITURA,
    habla: /observaci[oó]n|RNF-052|regla 10/i,
    de: 'la observacion que exige la regla 10 (RNF-052)',
  },
  {
    camino: SIMULACION,
    habla: /simulaci[oó]n|no modifica|no escribe|no guarda/i,
    de: 'que simular no modifica datos',
  },
  {
    camino: LECTURA_POR_POST,
    habla: /lectura no modifica|no modifica datos|no escribe|no guarda/i,
    de: 'que una lectura no modifica datos',
  },
];

describe('cada excepcion dice por que es legitima', () => {
  for (const { camino, habla, de } of JUSTIFICACIONES) {
    it(`«${camino}» explica ${de} al lado del disable`, () => {
      const fuente = fuenteDe(camino);
      const disable = fuente.lineas.findIndex((linea) => ES_DISABLE.test(linea));
      expect(disable, `«${camino}» no tiene el eslint-disable`).toBeGreaterThan(-1);

      /* Los comentarios pegados por encima del `disable`, hacia arriba hasta la
         primera linea que ya no lo sea. Se leen de `lineas` y no de `codigo`
         porque aqui lo que se busca **es** el comentario. */
      const motivo: string[] = [];
      for (let i = disable - 1; i >= 0 && COMENTARIO.test(fuente.lineas[i] ?? ''); i -= 1) {
        motivo.unshift(fuente.lineas[i] ?? '');
      }

      expect(
        motivo.length,
        `el eslint-disable de «${camino}» no lleva ninguna linea de comentario encima: ` +
          `una excepcion sin motivo escrito es la que se copia`,
      ).toBeGreaterThan(0);
      expect(
        habla.test(motivo.join('\n')),
        `la justificacion de «${camino}» no habla de ${de}, que es lo unico que hace ` +
          `legitima esta excepcion. Dice: ${motivo.join(' ').trim()}`,
      ).toBe(true);
    });
  }
});

describe('los dos que no escriben no son el camino de escritura disfrazado', () => {
  for (const camino of SIN_OBSERVACION) {
    it(`«${camino}» no pide la observacion a nadie`, () => {
      /* Es lo que separa los tres caminos. `useSimulacion` y `useLecturaPorPost`
         existen **porque** la regla 10 no les aplica: no asientan nada, asi que
         no hay nada que justificar en la auditoria. El dia que uno exigiera
         observacion, lo que estaria haciendo es escribir, y entonces no puede
         ser un camino aparte: tiene que ser el de `useEscritura`, que es el que
         ya resuelve la idempotencia, la lista blanca de campos y el error por
         campo.

         Se mira el archivo entero —importes y menciones— y no solo los `import`:
         un `useEscritura` en un comentario del docblock significaria que alguien
         esta pensando en enlazarlos, y el momento de decirlo es ese. */
      const fuente = fuenteDe(camino);
      const linea = fuente.lineas.findIndex((texto) => /\buseEscritura\b/.test(texto));

      expect(
        linea,
        `«${camino}:${linea + 1}» menciona useEscritura: si esto necesita la ` +
          `observacion es que escribe, y una escritura no puede ser un camino aparte ` +
          `(regla 10, RNF-052). Dice: ${(fuente.lineas[linea] ?? '').trim()}`,
      ).toBe(-1);
    });
  }
});
