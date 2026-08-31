import { describe, expect, it } from 'vitest';
import { avisoDe, cargarProsa, notaDe, pieDe } from './prosa';
import {
  AVISOS,
  FILTROS_CON_MOTIVO,
  NOTAS,
  OPCIONES_CON_AVISO,
  OPCIONES_CON_NOTA,
  OPCIONES_CON_PIE_PROPIO,
  PIES,
} from './prosa-textos';
import { OPCIONES_QUE_ESCRIBEN, escrituraDe } from './escrituras';
import { filtrosBloqueados } from './composicion';
import { censoDeAportes } from './aportes-de-modulo';
import { todasLasPantallas } from '../catalogo';

/* Los cinco modulos que componen algo llegan con su trozo desde #433: el censo se
   hace sobre lo que los doce aportan, leido sin registrarlo (`censoDeAportes`). */
const FILTROS_BLOQUEADOS = filtrosBloqueados((await censoDeAportes()).composiciones);

/**
 * La prosa fija de las pantallas, separada de quien la declara (#332).
 *
 * Cinco kilobytes de castellano —el aviso permanente de nueve opciones y la nota
 * de cuatro escrituras— viajaban en el trozo de arranque, que es el que baja
 * quien entra a mirar un recibo y no va a abrir ninguna de las trece. Ahora viaja
 * con el catalogo del modulo, que es una peticion que **ya bloquea el dibujo**:
 * la advertencia sigue estando cuando la pantalla aparece.
 *
 * Separar declaracion de redaccion abre un hueco nuevo, y es el que esto cierra:
 * una nota declarada sin texto es un aviso vacio, y un texto sin declarar es un
 * aviso que nadie dibuja. Ninguno de los dos da error; los dos son mudos.
 */

describe('la declaracion y la redaccion dicen lo mismo', () => {
  it('cada escritura que declara nota tiene su texto, y cada texto su escritura', () => {
    const declaradas = OPCIONES_QUE_ESCRIBEN.filter(
      (opcion) => escrituraDe(opcion)?.nota === true,
    ).sort();
    expect(declaradas).toEqual([...OPCIONES_CON_NOTA].sort());
    // Y ninguna en blanco: un aviso con el titulo puesto y el cuerpo vacio es
    // ruido con forma de advertencia.
    for (const opcion of OPCIONES_CON_NOTA) {
      expect((NOTAS[opcion] ?? '').length, opcion).toBeGreaterThan(40);
    }
  });

  /**
   * **Un filtro bloqueado sin motivo es una pantalla que parece rota** (revision
   * de #322).
   *
   * `composicion.ts` declara **que** filtro no se manda y `prosa-textos.ts`
   * redacta **por que** —el mismo reparto que la nota de la escritura, y por el
   * mismo motivo: la declaracion viaja en el arranque y su castellano no—. Los
   * dos huecos que abre separarlas son mudos: un filtro bloqueado sin texto se
   * lee como un control averiado, y un texto sin filtro no lo dibuja nadie.
   */
  it('cada filtro bloqueado tiene su motivo, y cada motivo su filtro', () => {
    const declarados = FILTROS_BLOQUEADOS.map(({ opcion, campo }) => `${opcion}.${campo}`).sort();
    expect(declarados.length).toBeGreaterThan(0);
    expect(declarados).toEqual([...FILTROS_CON_MOTIVO].sort());
  });

  it('ningun aviso permanente esta en blanco', () => {
    expect(OPCIONES_CON_AVISO.length).toBeGreaterThan(0);
    for (const opcion of OPCIONES_CON_AVISO) {
      expect(AVISOS[opcion]?.titulo.length, opcion).toBeGreaterThan(10);
      expect(AVISOS[opcion]?.detalle.length, opcion).toBeGreaterThan(40);
    }
  });
});

/**
 * **Un pie corregido corrige algo** (revision de #322).
 *
 * `PIES` existe para tapar o reescribir el pie que el catalogo portado trae bajo
 * una tabla, cuando lo que dice ha dejado de ser cierto. El hueco que abre es
 * silencioso en las dos direcciones: una opcion que no existe, o que existe y no
 * tiene pie, deja una entrada que **no corrige nada** y que nadie va a ver —no da
 * error, no rompe ninguna pantalla, y la siguiente persona la lee como si
 * estuviera haciendo algo—. Y si la regeneracion del catalogo se llevara por
 * delante el pie, la entrada seguiria aqui diciendo que lo suprime.
 */
describe('cada pie corregido corrige un pie que existe', () => {
  it('la opcion existe, tiene tabla, y su tabla trae el pie que se corrige', async () => {
    const pantallas = await todasLasPantallas();
    expect(OPCIONES_CON_PIE_PROPIO.length).toBeGreaterThan(0);
    for (const opcion of OPCIONES_CON_PIE_PROPIO) {
      const estructura = pantallas[opcion];
      expect(estructura, opcion).toBeDefined();
      expect(estructura?.tabla?.note, opcion).toBeDefined();
      // Y si es una reescritura, que diga algo: `null` suprime, y una cadena
      // vacia suprimiria tambien pero pareceria un texto.
      const pie = PIES[opcion];
      if (pie !== null) expect((pie ?? '').length, opcion).toBeGreaterThan(40);
    }
  });
});

describe('la prosa se pide una vez y despues se lee sincrona', () => {
  it('cargada, el aviso, la nota y el pie se resuelven como antes', async () => {
    await cargarProsa();
    expect(avisoDe('fisc_predial')?.titulo).toMatch(/copia de trabajo/);
    expect(notaDe('baja_deuda')).toMatch(/una obligación por acto/);
    // El pie tiene **tres** respuestas y no dos, y la diferencia es la que
    // importa: `null` es «suprimido» y `undefined` es «esta opcion no declara
    // nada», que es lo que devuelven 133 de las 134.
    expect(pieDe('consulta_fichas')).toBeNull();
    expect(pieDe('calles')).toBeUndefined();
    // Y una opcion sin prosa sigue devolviendo nada, que es lo que devuelven 127.
    expect(avisoDe('calles')).toBeUndefined();
    expect(notaDe('calles')).toBeUndefined();
  });
});
