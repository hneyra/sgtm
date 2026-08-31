import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * **«Búsqueda avanzada»: lo que casi nunca hace falta, plegado** (#498 F7).
 *
 * El encargo lo dice así: «Empieza por encontrar el predio. Un código, un
 * nombre o una dirección bastan; los filtros de abajo solo hacen falta cuando
 * la búsqueda devuelve demasiado.»
 *
 * Va **por pantalla** y no para las noventa y siete: cuatro filtros es la norma
 * del catálogo —57 pantallas— y plegarlas todas de golpe cambia cómo se busca
 * en el sistema entero. Catastro marca el estándar.
 *
 * Lo que más importa de aquí es el último caso: **un filtro plegado que trae
 * valor abre el panel solo**. Si no, quien pega el enlace de una búsqueda con
 * «Contribuyente» puesto ve la caja del código vacía y no entiende por qué salen tres
 * filas — el filtro estaría actuando y escondido.
 */

const CONSULTA = '/catastro/consulta-fichas';

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});
afterEach(() => desinstalarProxyDeDatos());

const busqueda = () => screen.getByRole('region', { name: 'Búsqueda' });

describe('la consulta de fichas empieza por una sola caja', () => {
  it('al abrir sólo se ve el código; los otros cuatro están plegados', async () => {
    montarEnRuta(CONSULTA);
    await screen.findByRole('region', { name: 'Búsqueda' });

    /* El primero de esta pantalla no es una caja con un rótulo: es el código de
       referencia catastral, que se compone en sus tramos (#318). Se reconoce
       por «Depto.», que es el primero de ellos y no lo dibuja nada más. */
    expect(within(busqueda()).getByLabelText('Depto.')).toBeInTheDocument();
    // Y los otros cuatro no están: «Contribuyente» es uno de ellos.
    expect(within(busqueda()).queryByLabelText('Contribuyente')).not.toBeInTheDocument();

    const boton = screen.getByRole('button', { name: /Búsqueda avanzada/ });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveTextContent('4 criterios más');
  });

  it('al desplegarla aparecen los cuatro', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CONSULTA);
    await screen.findByRole('region', { name: 'Búsqueda' });

    await usuario.click(screen.getByRole('button', { name: /Búsqueda avanzada/ }));

    expect(screen.getByRole('button', { name: /Búsqueda avanzada/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(busqueda()).getByLabelText('Contribuyente')).toBeInTheDocument();
    expect(within(busqueda()).getByLabelText('Conciliada con rentas')).toBeInTheDocument();
  });

  /**
   * El caso que este pliegue existe para no romper: un filtro escondido que
   * está filtrando. La dirección se comparte, y con ella el filtro.
   */
  it('un filtro plegado con valor abre el panel solo, y no se puede volver a cerrar', async () => {
    montarEnRuta(`${CONSULTA}?contribuyente=VILLEGAS`);
    await screen.findByRole('region', { name: 'Búsqueda' });

    // Está a la vista sin que nadie lo despliegue.
    expect(within(busqueda()).getByLabelText('Contribuyente')).toBeInTheDocument();
    // Y el botón no se dibuja: cerrarlo escondería un filtro que está actuando.
    expect(screen.queryByRole('button', { name: /Búsqueda avanzada/ })).not.toBeInTheDocument();
  });

  it('una pantalla que no lo declara sigue enseñando sus filtros', async () => {
    // El catálogo vial no lo declara: sus cuatro filtros se ven como siempre.
    montarEnRuta('/catastro/calles');
    await screen.findByRole('region', { name: 'Búsqueda' });

    expect(screen.queryByRole('button', { name: /Búsqueda avanzada/ })).not.toBeInTheDocument();
    expect(within(busqueda()).getAllByRole('textbox').length).toBeGreaterThan(1);
  });
});
