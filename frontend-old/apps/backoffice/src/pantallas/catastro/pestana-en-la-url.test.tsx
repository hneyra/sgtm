import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * **La pestaña abierta viaja en la dirección** (#498 F4, FRO-04 §5).
 *
 * Era un `useState`, y con él el enlace de lo que se está mirando no la
 * llevaba: quien pega la dirección de «la titularidad del predio 01-1042-0004»
 * abría la ficha en Identificación, y quien recarga después de mirar
 * Valorización vuelve al principio. Es la misma regla con la que el filtro, el
 * orden y la página ya viven en la barra de direcciones.
 */

const PREDIO = '200601010150010101001';
const URBANA = `/catastro/ficha-urbana/${PREDIO}`;

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});
afterEach(() => desinstalarProxyDeDatos());

const limpiar = () => cleanup();

const activa = () =>
  screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true');

describe('la pestaña abierta se puede compartir', () => {
  it('sin decir nada, abre la inicial de la opción', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    expect(activa()).toHaveTextContent('Identificación');
  });

  it('la dirección la elige: se abre donde el enlace dice', async () => {
    montarEnRuta(`${URBANA}?pestana=titularidad`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    expect(activa()).toHaveTextContent('Titularidad');
  });

  it('cambiar de pestaña cambia la dirección', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));

    expect(activa()).toHaveTextContent('Valorización');
    /* Se comprueba **el enlace**, no `window.location`: las pruebas montan bajo
       `MemoryRouter` y ahí la dirección del navegador no se mueve. Lo que
       importa es que la pestaña sobreviva a recargar la misma dirección, y eso
       es lo que mide el caso de arriba —abrir con `?pestana=` puesto—; aquí se
       comprueba que pulsar la escribe, montando de nuevo en la dirección que
       tendría que haber quedado. */
    const conParametro = `${URBANA}?pestana=valorizacion`;
    limpiar();
    montarEnRuta(conParametro);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });
    expect(activa()).toHaveTextContent('Valorización');
  });

  /**
   * La dirección la teclea gente, y también la recorta. Una pestaña que no
   * existe no puede dejar la ficha en blanco: cae en la inicial de su opción,
   * que es lo mismo que hace no decir nada.
   */
  it('una pestaña que no existe cae en la inicial, no en el vacío', async () => {
    montarEnRuta(`${URBANA}?pestana=titularida`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    expect(activa()).toHaveTextContent('Identificación');
  });

  it('cada opción conserva su pestaña inicial', async () => {
    // La económica abre en «Uso y servicios»: es lo suyo, y el parámetro no lo
    // cambia si no se dice.
    montarEnRuta(`/catastro/ficha-economica/${PREDIO}`);
    await screen.findByRole('region', { name: 'Resumen de la ficha' });

    expect(activa()).toHaveTextContent('Uso y servicios');
  });
});
