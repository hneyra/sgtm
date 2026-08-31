import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Autorizaciones y licencias (#79).
 *
 * El modulo que atiende al administrado en ventanilla, y el que trae **el
 * formulario mas largo del sistema**: el FUE de edificacion, siete pestanas y
 * nueve secciones. Ninguno de sus once endpoints existe todavia.
 *
 * Lo que se comprueba es lo que hace que ese formulario se pueda usar: que lo
 * opcional no estorbe, que el giro se busque por nombre y no por codigo, y que
 * las dos hojas de resolucion sean la misma hoja de siempre.
 */

const MODULO = '/autorizaciones-y-licencias';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('lo opcional no estorba en el formulario mas largo del sistema', () => {
  it('el FUE abre su primera pestana con las secciones obligatorias desplegadas', async () => {
    montarEnRuta(`${MODULO}/fue-edificacion`);
    await dibujada('.sgtm-formulario');

    // «Expediente» no es opcional: se ve nada mas abrir.
    const expediente = await screen.findByRole('button', { name: /Expediente/ });
    expect(expediente).toHaveAttribute('aria-expanded', 'true');
  });

  it('las secciones marcadas «Opcional» arrancan cerradas (FRO-02 §4)', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(`${MODULO}/anuncios`);
    await dibujada('.sgtm-formulario');

    // El anuncio tiene tres secciones opcionales —tramite interno, cese y
    // notas—. En un formulario de ventanilla, lo que casi nunca se rellena
    // ocupando sitio es lo que hace que no se vea lo que si.
    const opcional = await screen.findByRole('button', { name: /Trámite interno/ });
    expect(opcional).toHaveAttribute('aria-expanded', 'false');

    // Y se abre cuando hace falta: cerrada no es escondida.
    await usuario.click(opcional);
    expect(opcional).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('el giro se busca por nombre, no solo por codigo', () => {
  it('escribir la descripcion la manda al servidor como filtro', async () => {
    const usuario = userEvent.setup();
    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };

    montarEnRuta(`${MODULO}/ciiu`);
    await dibujada('table');

    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
    // El catalogo CIIU tiene cientos de entradas y el operador conoce el nombre
    // del giro, no su codigo: buscar solo por codigo obliga a consultar una
    // tabla impresa antes de poder atender.
    await usuario.type(within(busqueda).getByLabelText('Descripción'), 'ABARROTES');
    await usuario.click(within(busqueda).getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(peticiones.some((u) => u.includes('descripcion=ABARROTES'))).toBe(true),
    );

    globalThis.fetch = proxy;
  });
});

describe('las resoluciones son la misma hoja de siempre', () => {
  it.each(['licencia-resolucion-cancelacion', 'licencia-resolucion-duplicado'])(
    '%s se dibuja con el bloque compartido, con sus firmas y sin imprimir la interfaz',
    async (ranura) => {
      const montada = montarEnRuta(`${MODULO}/${ranura}`);
      await dibujada('[data-hoja="1"]');

      const hoja = document.querySelector('[data-hoja="1"]');
      expect(hoja?.querySelector('.sgtm-hoja__firmas')?.textContent).toContain('Contribuyente');
      expect(
        document.querySelector('.sgtm-hoja__botones')?.getAttribute('data-no-imprimible'),
      ).toBe('1');

      montada.unmount();
    },
  );

  it('y no ofrecen ningun acto: el prototipo las modela como papel', async () => {
    montarEnRuta(`${MODULO}/licencia-resolucion-cancelacion`);
    await dibujada('[data-hoja="1"]');

    // No declaran acciones, asi que **cancelar una licencia no se puede hacer
    // desde aqui**. Es una de las quince que `actos-inalcanzables.test.ts`
    // vigila: el criterio de #79 que pide que la cancelacion pida observacion y
    // confirme su efecto no se puede cumplir mientras la pantalla no tenga que
    // pulsar.
    expect(document.querySelector('.sgtm-acciones')).toBeNull();
  });
});

/**
 * **La hoja sin superficie deja de ser muda** (FRO-06, #427).
 *
 * Sin `acciones` no hay `<BarraDeAcciones>` —`Pantalla.tsx` la dibuja solo
 * `{estructura.acciones && …}`—, y sin barra **no hay franja**: la causa que
 * `impedimentoDelActo` calcula para estas dos entraba en el censo y no la leia
 * nadie. Lo que se lee esta ahora en el aviso permanente, que se dibuja arriba
 * y no depende de que la pantalla tenga nada que pulsar.
 *
 * Se comprueba lo que FRO-06 §1.3 pide que diga, y **no la frase literal**: que
 * es la hoja, que dato falta y por donde se sale. Comparar el parrafo entero
 * dejaria la prueba pegada a la redaccion en vez de a lo que la redaccion tiene
 * que contener.
 */
describe('las dos hojas de resolucion dicen lo que son y lo que les falta', () => {
  const HOJAS = [
    { ranura: 'licencia-resolucion-cancelacion', dato: /motivo/i },
    { ranura: 'licencia-resolucion-duplicado', dato: /recibo/i },
  ];

  it.each(HOJAS)('$ranura lo advierte antes de la hoja', async ({ ranura, dato }) => {
    const montada = montarEnRuta(`${MODULO}/${ranura}`);
    await dibujada('.sgtm-aviso');

    const aviso = document.querySelector('.sgtm-aviso');
    // Que es lo que se esta mirando: el papel, no el formulario.
    expect(aviso?.textContent).toMatch(/hoja de la resolución/i);
    // El dato que el backend exige y ninguna pantalla del manual dibuja.
    expect(aviso?.textContent).toMatch(dato);
    // Y por donde se sale: el procedimiento actual, y avisar a sistemas. Un
    // aviso que solo cuenta lo que no se puede hacer deja el mostrador parado.
    expect(aviso?.textContent).toMatch(/procedimiento actual/i);
    expect(aviso?.textContent).toMatch(/sistemas/i);

    // Y sigue sin haber donde pulsar: el aviso no promete ningun acto.
    expect(document.querySelector('.sgtm-acciones')).toBeNull();

    montada.unmount();
  });

  it('el duplicado nombra su propio recibo, no el de la licencia (RNF-080)', async () => {
    montarEnRuta(`${MODULO}/licencia-resolucion-duplicado`);
    await dibujada('.sgtm-aviso');

    // `PeticionDeDuplicado.nDeRecibo` es «el recibo del derecho de tramite del
    // duplicado». El «Nº de recibo» que si dibuja `licencia_funcionamiento` es
    // el del derecho de la licencia: usarlo seria mentir sobre lo que se pide.
    expect(document.querySelector('.sgtm-aviso')?.textContent).toMatch(
      /derecho de trámite del duplicado/i,
    );
  });
});
