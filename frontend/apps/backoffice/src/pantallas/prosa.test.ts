import { describe, expect, it } from 'vitest';
import { avisoDe, cargarProsa, notaDe } from './prosa';
import { AVISOS, NOTAS, OPCIONES_CON_AVISO, OPCIONES_CON_NOTA } from './prosa-textos';
import { OPCIONES_QUE_ESCRIBEN, escrituraDe } from './escrituras';

/**
 * La prosa fija de las pantallas, separada de quien la declara (#332).
 *
 * Cinco kilobytes de castellano —el aviso permanente de siete opciones y la nota
 * de cuatro escrituras— viajaban en el trozo de arranque, que es el que baja
 * quien entra a mirar un recibo y no va a abrir ninguna de las once. Ahora viaja
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

  it('ningun aviso permanente esta en blanco', () => {
    expect(OPCIONES_CON_AVISO.length).toBeGreaterThan(0);
    for (const opcion of OPCIONES_CON_AVISO) {
      expect(AVISOS[opcion]?.titulo.length, opcion).toBeGreaterThan(10);
      expect(AVISOS[opcion]?.detalle.length, opcion).toBeGreaterThan(40);
    }
  });
});

describe('la prosa se pide una vez y despues se lee sincrona', () => {
  it('cargada, el aviso y la nota se resuelven como antes', async () => {
    await cargarProsa();
    expect(avisoDe('fisc_predial')?.titulo).toMatch(/copia de trabajo/);
    expect(notaDe('baja_deuda')).toMatch(/una obligación por acto/);
    // Y una opcion sin prosa sigue devolviendo nada, que es lo que devuelven 127.
    expect(avisoDe('calles')).toBeUndefined();
    expect(notaDe('calles')).toBeUndefined();
  });
});
