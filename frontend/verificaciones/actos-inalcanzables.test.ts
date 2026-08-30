import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Las pantallas que escriben cuyo **acto no es la accion primaria**.
 *
 * El renderizador habilita solo la ultima accion —«la ultima es la primaria»,
 * FRO-03 §5— y solo la primaria escribe. Cuando el acto de la pantalla no es la
 * ultima que dibujo el prototipo, ese acto **no se puede ejecutar desde la
 * interfaz**: «Emitir · Imprimir certificado» deja el emitir apagado, y
 * «Calcular · Notificar · Resolver» deja el notificar y el resolver apagados.
 *
 * Esta prueba no lo arregla, y es deliberado: cual de las acciones del manual es
 * el acto de cada pantalla es una decision de diseno, no una que se pueda
 * deducir del catalogo. Lo que hace es **impedir que la lista crezca en
 * silencio**. Si baja, se actualiza y es una buena noticia; si sube, alguien
 * conecto una pantalla cuyo acto nadie puede pulsar.
 */

/** La misma lista que `esIrreversible`, leida del codigo para no separarse de el. */
const IRREVERSIBLES = leerPatron();

const CATALOGO = resolve(process.cwd(), 'apps/backoffice/src/catalogo');

interface Pantalla {
  readonly endpoint?: string;
  readonly acciones?: readonly string[];
}

function leerPatron(): RegExp {
  const fuente = readFileSync(
    resolve(process.cwd(), 'apps/backoffice/src/pantallas/escritura.ts'),
    'utf8',
  );
  const encontrado = fuente.match(/const IRREVERSIBLES =\s*([\s\S]*?);/);
  if (!encontrado?.[1]) throw new Error('No se encontro el patron de acciones irreversibles.');
  /* Se evalua el literal de expresion regular **tal como esta escrito en el
     codigo**: leerlo es lo que impide que esta prueba y la regla se separen.

     Y se colapsa el salto de linea con su sangria, no «todo el espacio en
     blanco», que es lo que hacia y lo separaba en silencio (#426): el patron
     lleva dentro seis alternativas de varias palabras —`dar de baja`, `baja de`,
     `cerrar caja`, `cambiar numero`, `generar valor` e `importar valor`— y
     quitarles el espacio las convertia en `dardebaja`, `cerrarcaja`… que no
     casan con nada. Esta prueba llevaba desde que existe calculando su lista con
     un patron **que no es el de la interfaz**, y el docblock de arriba afirmaba
     lo contrario. */
  const literal = encontrado[1].trim().replace(/\n\s*/g, '');
  const cuerpo = literal.match(/^\/(.*)\/([a-z]*)$/);
  if (!cuerpo?.[1]) throw new Error(`El patron no es un literal de regexp: ${literal}`);
  return new RegExp(cuerpo[1], cuerpo[2]);
}

function modulos(): readonly {
  readonly id: string;
  readonly opciones: readonly { readonly id: string; readonly ranura: string }[];
}[] {
  const fuente = readFileSync(resolve(CATALOGO, 'navegacion.generado.ts'), 'utf8');
  const json = fuente.slice(fuente.indexOf('= [') + 2, fuente.lastIndexOf('];') + 1);
  return JSON.parse(json) as never;
}

function pantallasDe(modulo: string): Readonly<Record<string, Pantalla>> {
  const fuente = readFileSync(resolve(CATALOGO, `pantallas/${modulo}.generado.ts`), 'utf8');
  const json = fuente.slice(fuente.indexOf('= {') + 2, fuente.lastIndexOf('};') + 1);
  return JSON.parse(json) as Readonly<Record<string, Pantalla>>;
}

function inalcanzables(): string[] {
  const fuera: string[] = [];
  for (const modulo of modulos()) {
    const pantallas = pantallasDe(modulo.id);
    for (const opcion of modulo.opciones) {
      const pantalla = pantallas[opcion.id];
      const [verbo] = (pantalla?.endpoint ?? '').split(/\s+/);
      if (verbo === 'GET' || verbo === undefined) continue;

      const acciones = pantalla?.acciones ?? [];
      // Sin acciones no hay nada que pulsar: la pantalla escribe y no ofrece como.
      if (acciones.length === 0) {
        fuera.push(`${modulo.id}/${opcion.ranura}`);
        continue;
      }
      const ultima = acciones[acciones.length - 1] ?? '';
      const hayActo = acciones.some((accion) => IRREVERSIBLES.test(accion));
      if (hayActo && !IRREVERSIBLES.test(ultima)) fuera.push(`${modulo.id}/${opcion.ranura}`);
    }
  }
  return fuera.sort();
}

/**
 * Las dieciocho de hoy. **Bajar de aqui es bueno; subir hay que mirarlo.**
 *
 * **Siete** de ellas —las cuatro hojas de resolucion, la de constancia y las dos
 * de gerencia de transito— no declaran ninguna accion: el prototipo las modela
 * como papel, no como acto. Son las «hojas sin superficie» de
 * [FRO-06](../../docs/60-frontend/hojas-sin-superficie.md), y
 * `hojas-sin-superficie.test.ts` computa esa misma lista del catalogo y exige de
 * cada una su clasificacion y su aviso.
 *
 * (Este parrafo decia «cuatro», y llevaba diciendolo desde que la lista existe:
 * el recuento salio del cotejo de #427, no de una revision.)
 *
 * Las once restantes ponen «Imprimir» —o «Limpiar», o «Aprobar programa»— de
 * ultima, que es lo que se hace **despues** del acto.
 *
 * **Y una se fue con #423, que es exactamente la buena noticia que este docblock
 * anuncia**: `tesoreria/anulacion-convenio` estaba aqui porque su ultima accion
 * es «Quebrar» y el patron de `esIrreversible` solo conocia «quiebre» —asi que
 * la pantalla tenia un acto irreversible («Anular») y la primaria no lo era—.
 * Al conectarla, «Quebrar» resulto ser **otro acto** de la misma pantalla, no un
 * rotulo distinto del mismo: el patron gana `quebrar`, los dos escriben con su
 * propio cuerpo (`EscrituraDeclarada.segunLaAccion`) y los dos se confirman.
 *
 * <h2>El movimiento de #426, que es de las cinco cosas del issue la que menos se
 * veia venir</h2>
 *
 * La lista subio de catorce a dieciocho, y **ninguna de las cuatro entradas
 * nuevas es una pantalla mal conectada**: lo que crecio fue el patron. Conectar
 * «Importacion de valores a coactiva» exigia que «Importar valores» fuera
 * irreversible (RF-100, AC 2 de #426), y midiendo el catalogo entero para saber
 * a quien mas tocaba salio que `generar` —que solo se cazaba con `valor`
 * detras— es el verbo de otros cinco actos que tampoco se deshacen: «Generar
 * orden de pago», «Generar muestra», «Generar determinacion», «Generar papeleta»
 * y «Generar convenio coactivo». Ensanchar el patron a `generar` a secas mueve
 * cinco filas de esta lista, y las cinco en la direccion correcta:
 *
 * - **entran** `rentas-registro/alcabala` (genera la orden de pago y termina en
 *   «Imprimir liquidacion»), `fiscalizacion/fisc-programa` (genera la muestra y
 *   termina en «Aprobar programa»), `valores/pase-coactiva` (genera el pase y
 *   termina en «Imprimir») y `coactiva/rec-impresion` (dicta la REC-1 y termina
 *   en «REC 2»)
 * - **sale** `fiscalizacion/fisc-vehicular`, que era un **falso positivo**: su
 *   ultima accion es «Generar determinacion», o sea que su acto si era el ultimo
 *   y el patron no lo veia. Estaba aqui por «Notificar requerimiento», que es el
 *   penultimo
 *
 * Mas `coactiva/importacion-valores`, que entra por el otro verbo.
 *
 * **Y conviene decir que esta lista se calcula del catalogo y solo del
 * catalogo**, que es lo que la hace barata y lo que la deja media generacion por
 * detras: desde #421 una opcion puede declarar en `LA_QUE_ESCRIBE` cual de sus
 * acciones guarda, y `BarraDeAcciones` la mueve al final. Seis de estas
 * dieciocho —las cuatro de coactiva, `adm-notificacion` y `adm-valores`— ya
 * tienen su acto alcanzable por ahi. Lo que la lista sigue midiendo bien, y por
 * eso no se toca, es **cuantas pantallas necesitan esa declaracion**: si sube
 * sin que nadie la declare, hay un acto que nadie puede pulsar.
 */
const CONOCIDAS: readonly string[] = [
  'autorizaciones-y-licencias/certificados',
  'autorizaciones-y-licencias/licencia-resolucion-cancelacion',
  'autorizaciones-y-licencias/licencia-resolucion-duplicado',
  'coactiva/costas-procesales',
  'coactiva/importacion-valores',
  'coactiva/rec-impresion',
  'fiscalizacion/fisc-programa',
  'infracciones-administrativas/adm-notificacion',
  'infracciones-administrativas/adm-notificacion-resolucion',
  'infracciones-administrativas/adm-resolucion-gerencia',
  'infracciones-administrativas/adm-valores',
  'rentas-registro/alcabala',
  'transito/transito-constancia-libre',
  'transito/transito-rg-ordinaria',
  'transito/transito-rg-sancionadora',
  'transito/transito-valores',
  'valores/pase-coactiva',
  'valores/prescripcion',
];

describe('ninguna pantalla nueva esconde su acto detras de una accion secundaria', () => {
  it('la lista de las que ya lo hacen no ha crecido', () => {
    expect(inalcanzables()).toEqual([...CONOCIDAS].sort());
  });

  it('y el patron que la calcula es el mismo que usa la interfaz', () => {
    // Si `esIrreversible` cambia, esta prueba cambia con el: se lee del codigo.
    expect(IRREVERSIBLES.test('Emitir valor')).toBe(true);
    expect(IRREVERSIBLES.test('Imprimir')).toBe(false);
    /* Y **las alternativas de varias palabras tambien**, que es lo que el
       lector del patron perdia (#426). Sin la correccion de `leerPatron`, estas
       cinco son `false` —el patron leido decia `dardebaja`, `cerrarcaja`,
       `importarvalor`…— y la lista de arriba se calculaba con una regla que no
       es la de la interfaz, diciendo en su docblock que si lo era. */
    expect(IRREVERSIBLES.test('Dar de baja')).toBe(true);
    expect(IRREVERSIBLES.test('Cerrar caja')).toBe(true);
    expect(IRREVERSIBLES.test('Importar valores')).toBe(true);
    expect(IRREVERSIBLES.test('Generar valores')).toBe(true);
    expect(IRREVERSIBLES.test('Cambiar número')).toBe(true);
  });
});
