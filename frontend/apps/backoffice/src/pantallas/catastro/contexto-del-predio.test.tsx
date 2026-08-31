import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * **La cabecera del predio no se va, y dice si queda algo sin mandar** (#498 F3).
 *
 * Responde a un dolor declarado del rediseño: «no sé si guardé». Una ficha son
 * hasta once pestañas del prototipo repartidas en cinco; quien corrige un campo
 * y sube a mirar otra cosa no tenía cómo saber ni qué predio estaba tocando ni
 * si lo suyo seguía en el borrador.
 *
 * Lo que se comprueba aquí, y lo que **no**: que la cabecera es `sticky` es una
 * regla de estilo y jsdom no resuelve `position`, así que eso lo mira
 * `contraste.test.ts` leyendo la hoja —el mismo trato que la marca del riel—.
 * Aquí se comprueba lo que sí es comportamiento: que el estado aparece, que
 * cambia al teclear, y que una superficie que no escribe no lo dice.
 */

const PREDIO = '200601010150010101001';

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});
afterEach(() => desinstalarProxyDeDatos());

const cabecera = () => screen.getByRole('region', { name: 'Resumen de la ficha' });

describe('el estado de guardado, donde no se pierde de vista', () => {
  it('sin tocar nada dice que no hay nada pendiente', async () => {
    montarEnRuta(`/catastro/actualizacion-catastro/${PREDIO}`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    expect(await within(cabecera()).findByRole('status')).toHaveTextContent(
      'Sin cambios pendientes',
    );
  });

  it('al teclear un campo pasa a decir que hay cambios sin guardar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(`/catastro/actualizacion-catastro/${PREDIO}`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });
    await within(cabecera()).findByRole('status');

    // El campo de observación es el que toda escritura exige (regla 10): está
    // en cualquier pantalla que pueda escribir, así que sirve de mando aquí.
    // El `<textarea>`, no la región que lo envuelve: las dos se llaman igual.
    const observacion = await screen.findByRole('textbox', { name: /Observación/i });
    await usuario.type(observacion, 'Se corrige el área verificada del piso 02');

    expect(within(cabecera()).getByRole('status')).toHaveTextContent('Cambios sin guardar');
  });

  it('lo dice con texto y no sólo con el color', async () => {
    /* FRO-02 §2.1: el punto acompaña, el rótulo informa. Un estado que sólo se
       distinguiera por color no lo distingue quien no distingue ese color, y
       aquí lo que se pierde es saber si el trabajo está mandado. */
    montarEnRuta(`/catastro/actualizacion-catastro/${PREDIO}`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    const estado = await within(cabecera()).findByRole('status');
    expect(estado.textContent?.trim()).not.toBe('');
  });

  it('una superficie que no escribe no habla de guardar', async () => {
    // El cuadro de valuación se consulta y se importa; no tiene borrador que
    // perder, así que su cabecera no dice ni que hay cambios ni que no los hay.
    const suya = montarEnRuta('/catastro/aranceles')
      ? await screen.findByRole('region', { name: 'Resumen del cuadro' })
      : null;
    expect(suya).not.toBeNull();
    expect(within(suya as HTMLElement).queryByRole('status')).not.toBeInTheDocument();
  });
});
