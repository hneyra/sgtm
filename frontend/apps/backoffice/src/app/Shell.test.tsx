import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';

/**
 * El shell: navegacion de dos niveles, cabecera y paleta de comandos.
 *
 * Se consulta por rol y por texto accesible, no por clase (FRO-04 §8): una
 * prueba que se rompe al cambiar una clase no prueba comportamiento.
 */

beforeEach(() => {
  instalarProxyDeDatos();
  globalThis.localStorage?.clear();
});
afterEach(() => desinstalarProxyDeDatos());

describe('la cabecera dice donde esta uno', () => {
  it('muestra el modulo, el titulo de la pantalla y su operacion del contrato', async () => {
    montarEnRuta('/catastro/ficha-urbana');

    const cabecera = await screen.findByRole('banner');
    expect(within(cabecera).getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ficha catastral urbana individual',
    );
    expect(within(cabecera).getByText('Catastro')).toBeInTheDocument();
    expect(
      within(cabecera).getByText('GET /api/v1/catastro/fichas/urbana/{codRefCatastral}'),
    ).toBeInTheDocument();
  });
});

describe('la barra lateral de dos niveles', () => {
  it('la marca vuelve al inicio **sin borrar la municipalidad** del árbol accesible', async () => {
    /* La marca es la vuelta a la pregunta de #296 y lleva `aria-label`, que
       **sustituye** al contenido: con el se iba de ahi el nombre de la
       municipalidad, y el otro sitio donde se lee —el chip de la cabecera— esta
       dentro de un boton que tambien lo tapa con su `aria-label`. Quedaba en
       ninguna parte. `aria-describedby` lo devuelve: primero a donde lleva el
       enlace, y despues donde se esta. Desde el rediseño la marca vive en el
       riel y la municipalidad en la cabecera del panel; la descripcion cruza
       los dos, que es justo lo que `aria-describedby` sabe hacer. */
    montarEnRuta('/tesoreria/caja-tributaria');

    const marca = await screen.findByRole('link', { name: 'Inicio: a quién atiendes' });
    expect(marca).toHaveAttribute('href', '/');
    expect(marca).toHaveAccessibleDescription('Municipalidad Provincial de Sullana');
  });

  it('al abrir una opcion queda en el nivel de su modulo, con la opcion marcada', () => {
    montarEnRuta('/tesoreria/caja-tributaria');

    const navegacion = screen.getByRole('navigation', { name: 'Opciones de Tesorería' });
    expect(within(navegacion).getByRole('link', { current: 'page' })).toHaveTextContent(
      'Caja tributaria',
    );
    // Y la cabecera del panel dice de que modulo son.
    const panel = navegacion.closest('.sgtm-nav') as HTMLElement;
    expect(within(panel).getByText('Módulo')).toBeInTheDocument();
    expect(within(panel).getByText('Tesorería')).toBeInTheDocument();
  });

  /**
   * **Los dos niveles se dibujan a la vez**, que es el cambio del rediseño de
   * Catastro: el riel de los doce modulos junto al panel del abierto. Ya no hay
   * «Todos los modulos» porque no hay nada que conmutar, y cambiar de modulo
   * pasa de dos pulsaciones a una.
   */
  it('el riel enseña los doce módulos junto al panel, con el abierto marcado', () => {
    montarEnRuta('/tesoreria/caja-tributaria');

    const riel = screen.getByRole('navigation', { name: 'Módulos del sistema' });
    // Doce modulos, mas la marca que vuelve al inicio (#296).
    expect(within(riel).getAllByRole('link')).toHaveLength(13);
    // Un modulo cualquiera que no es el abierto: se llega en una pulsacion.
    expect(within(riel).getByRole('link', { name: 'Coactiva' })).toHaveAttribute(
      'href',
      '/coactiva',
    );
    // El abierto se senala con `aria-current="true"`, no con `"page"`: la
    // pagina es la opcion, y la marca el panel.
    const actual = within(riel).getByRole('link', { name: 'Tesorería' });
    expect(actual).toHaveAttribute('aria-current', 'true');
    expect(actual).toHaveAttribute('data-activo', '1');

    // Y el panel del modulo sigue ahi al mismo tiempo: los dos niveles a la vez
    // es justo lo que el rediseño cambia.
    expect(screen.getByRole('navigation', { name: 'Opciones de Tesorería' })).toBeInTheDocument();
  });

  it('los bloques del módulo son rótulos, no acordeones', () => {
    montarEnRuta('/tesoreria/caja-tributaria');

    /* Plegar servia para que las opciones cupieran junto a los doce modulos en
       la misma columna. Con los modulos en el riel, el panel es del modulo
       entero: un acordeon que nunca hace falta cerrar solo anade una pulsacion
       antes de cada opcion. Los bloques de Tesoreria son sus grupos por tarea
       (ADR-0014 §4). */
    const panel = screen.getByRole('navigation', { name: 'Opciones de Tesorería' });
    const rotulos = [...panel.querySelectorAll('.sgtm-nav__eyebrow')].map((r) => r.textContent);
    expect(rotulos).toContain('Cobro en caja');
    expect(rotulos).toContain('Convenios');
    // Ningun rotulo es pulsable: el acordeon se fue entero.
    expect(within(panel).queryAllByRole('button')).toHaveLength(0);

    // Y las opciones estan a la vista sin desplegar nada.
    expect(within(panel).getByRole('link', { name: /Caja tributaria/ })).toBeInTheDocument();
  });

  /**
   * **La accion primaria del modulo** (#498 F2): lo primero del panel, porque es
   * con lo que se empieza a trabajar. Sale del catalogo y no de la composicion
   * del modulo —que llega en su propio trozo (#433)— y lleva `?nuevo=1` porque
   * el alta guiada vive desde ahora en la URL: sin eso el boton solo podria
   * dejar al usuario en la pantalla y que la abriera el mismo.
   */
  it('el panel de Catastro ofrece «Registrar predio», y abre el alta guiada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('heading', { level: 1 });

    const boton = screen.getByRole('link', { name: 'Registrar predio' });
    expect(boton).toHaveAttribute('href', '/catastro/ficha-urbana?nuevo=1');

    // Y abre el asistente de verdad, no deja al usuario en la pantalla.
    await usuario.click(boton);
    expect(
      await screen.findByRole('region', { name: /Alta de ficha catastral/ }),
    ).toBeInTheDocument();
  });

  it('un módulo que no declara acción primaria no dibuja ningún botón', () => {
    montarEnRuta('/tesoreria/caja-tributaria');

    const panel = screen
      .getByRole('navigation', { name: 'Opciones de Tesorería' })
      .closest('.sgtm-nav') as HTMLElement;
    expect(panel.querySelector('.sgtm-nav__primaria')).toBeNull();
  });

  it('anota en «Recientes» la opcion visitada, y los enseña en la portada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    /* Sin nivel raiz que los albergara, los recientes viven en el panel cuando
       la ruta no esta en ningun modulo: la portada. */
    await usuario.click(screen.getByRole('link', { name: 'Inicio: a quién atiendes' }));

    const panel = screen.getByRole('navigation', { name: 'Lo último que abriste' });
    expect(within(panel).getByText('Recientes')).toBeInTheDocument();
    expect(within(panel).getByText('Caja tributaria')).toBeInTheDocument();
  });
});

describe('la paleta de comandos', () => {
  it('se abre con Ctrl+K y se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Buscar en el sistema' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('busca sobre las 134 opciones y navega a la elegida', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Buscar en el sistema' }));
    const paleta = screen.getByRole('dialog');
    expect(within(paleta).getByText('10 de 134 opciones')).toBeInTheDocument();

    await usuario.type(within(paleta).getByRole('textbox'), 'alcabala');
    await usuario.click(within(paleta).getByRole('button', { name: /Alcabala/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/alcabala/i);
  });
});

describe('el hub de modulo', () => {
  it('ensena las opciones del modulo repartidas en sus bloques', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/valores');

    expect(screen.getByRole('heading', { level: 2, name: 'Valores' })).toBeInTheDocument();
    expect(screen.getByText(/6 opciones en \d+ bloques?/)).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('link')[0] as HTMLElement);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Valores');
  });
});
