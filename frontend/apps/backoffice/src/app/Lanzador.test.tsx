import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';
import { CAJERO, entraCon, entraSinPoderLeerPermisos, limpiarSesion } from '../pruebas/sesion';

/**
 * El lanzador de nueve puntos (ADR-0014 §2).
 *
 * Lo que se comprueba no es que «se abra un menu»: es que ensena **el catalogo
 * visible y solo el** (REQ-03 §5) y que se opera entero con el teclado
 * (RNF-082) con el patron `menu` de APG —foco itinerante, Enter sobre la
 * entrada **enfocada**, Esc desde donde sea—.
 *
 * Las pruebas del menu de la persona viven en `MenuDeLaPersona.test.tsx`, junto
 * a su componente (FRO-04 §2).
 */

/** Las entradas del panel, en el orden en que se dibujan. */
const entradasDelPanel = () => screen.getAllByRole('menuitem');

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('el lanzador ensena el catalogo visible, no el entero', () => {
  it('sin permiso sobre coactiva, Coactiva no esta en el lanzador', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const boton = await screen.findByRole('button', { name: 'Abrir los módulos' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(boton);

    const menu = screen.getByRole('menu', { name: 'Lanzador de módulos' });
    // El mismo filtro que la barra, el hub y la paleta (REQ-03 §5): el modulo
    // del cajero esta, y el que sus permisos niegan no aparece ni vacio.
    expect(within(menu).getByText('Tesorería')).toBeInTheDocument();
    expect(within(menu).queryByText('Coactiva')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Catastro')).not.toBeInTheDocument();
    // Y el conteo es el de las opciones visibles, no el del catalogo.
    expect(within(menu).getByText('3 opciones')).toBeInTheDocument();
  });

  it('contra el proxy, sin proveedor de identidad, lista los doce y el inicio', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    // Doce modulos y, la primera, la vuelta al inicio: no es un modulo ni una
    // opcion, es la puerta del shell (#296).
    expect(entradasDelPanel()).toHaveLength(13);
    expect(entradasDelPanel()[0]).toHaveTextContent('¿A quién atiendes?');
  });

  it('sin ningun modulo visible el boton no existe: no hay nada que lanzar', async () => {
    // Con proveedor y la matriz ilegible (500) la autorizacion es negacion por
    // omision: cero modulos. Un lanzador que abriera un panel vacio prometeria
    // lo que los permisos niegan, asi que no se dibuja el boton siquiera.
    entraSinPoderLeerPermisos();
    montarEnRuta('/tesoreria');

    expect(await screen.findByText('Ese módulo no existe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir los módulos' })).not.toBeInTheDocument();
  });

  it('elegir un modulo con el raton navega a su hub y cierra el panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    await usuario.click(screen.getByRole('menuitem', { name: /Valores/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Valores' })).toBeInTheDocument();
  });

  it('al abrir con el raton ninguna entrada sale resaltada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    await usuario.click(boton);

    // El foco se queda en el boton: sin resalte fantasma sobre la primera
    // entrada, que con el raton nadie ha elegido.
    expect(boton).toHaveFocus();
    expect(entradasDelPanel().some((entrada) => entrada === document.activeElement)).toBe(false);
  });
});

/**
 * **La vuelta al inicio tiene una puerta en la cabecera** (#296, ADR-0016).
 *
 * `/` dejo de ser un desvio al panel de recaudacion y paso a ser la pregunta de
 * a quien se atiende. No es una opcion del catalogo —no publica lectura ni
 * permiso propios—, asi que ni el menu, ni la paleta, ni el lanzador llegaban a
 * ella: el unico camino era la marca de la barra lateral, que en movil se pliega
 * en cajon. Quien entraba por un enlace a media pantalla no tenia como volver a
 * preguntar por la persona siguiente sin editar la barra de direcciones.
 */
describe('el inicio es la primera entrada del lanzador', () => {
  it('lleva a la pregunta de a quien se atiende', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(await screen.findByRole('button', { name: 'Abrir los módulos' }));
    await usuario.click(screen.getByRole('menuitem', { name: /¿A quién atiendes\?/ }));

    expect(await screen.findByRole('heading', { name: '¿A quién atiendes?' })).toBeInTheDocument();
  });

  it('esta aunque el perfil no tenga **ninguna** consulta del padron', async () => {
    /* La entrada no se filtra por permiso, y es deliberado: el filtro de
       REQ-03 §5 es sobre opciones con permiso, y esta no tiene ninguno que
       comprobar. Atarla a los padrones dejaria sin camino de vuelta justo a
       quien mas lo necesita —el que entro por un enlace—, y la pregunta ya dice
       ella misma, y con el rotulo del catalogo, que consultas le faltan. */
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(await screen.findByRole('button', { name: 'Abrir los módulos' }));
    const menu = screen.getByRole('menu', { name: 'Lanzador de módulos' });
    expect(within(menu).getByText('¿A quién atiendes?')).toBeInTheDocument();
  });
});

describe('el lanzador se opera entero con el teclado (RNF-082)', () => {
  it('Enter abre y el foco entra a la primera entrada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    boton.focus();
    await usuario.keyboard('{Enter}');

    expect(boton).toHaveAttribute('aria-expanded', 'true');
    // `aria-controls` apunta al panel que el boton acaba de abrir.
    const menu = screen.getByRole('menu', { name: 'Lanzador de módulos' });
    expect(boton).toHaveAttribute('aria-controls', menu.id);
    expect(entradasDelPanel()[0]).toHaveFocus();
  });

  it('las flechas mueven el foco de verdad, y Enter abre la entrada enfocada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    boton.focus();
    await usuario.keyboard('{Enter}');

    // Tres flechas abajo: de la primera (el inicio) a Rentas · Registro.
    await usuario.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(entradasDelPanel()[3]).toHaveFocus();
    expect(document.activeElement).toHaveTextContent('Rentas · Registro');
    // Una arriba: el recorrido va en las dos direcciones.
    await usuario.keyboard('{ArrowUp}');
    expect(document.activeElement).toHaveTextContent('Catastro');

    await usuario.keyboard('{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Catastro' })).toBeInTheDocument();
  });

  it('Enter abre la entrada que tiene el foco, no la primera', async () => {
    // Este es el defecto que el patron APG corrige: el panel interceptaba Enter
    // y abria la entrada que llevaba marcada, que con el foco en otra —llegando
    // con Tab, o tras mover el foco— no era la que el usuario estaba mirando.
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    const sexta = entradasDelPanel()[5];
    expect(sexta).toBeDefined();
    sexta?.focus();
    await usuario.keyboard('{Enter}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Tránsito' })).toBeInTheDocument();
  });

  it('las entradas no son tabulables: el recorrido es con flechas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    for (const entrada of entradasDelPanel()) expect(entrada).toHaveAttribute('tabindex', '-1');
  });

  it('la flecha abajo abre y entra sin pasar por Enter, y Fin lleva a la ultima', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    screen.getByRole('button', { name: 'Abrir los módulos' }).focus();
    await usuario.keyboard('{ArrowDown}');
    expect(entradasDelPanel()[0]).toHaveFocus();

    await usuario.keyboard('{End}');
    expect(entradasDelPanel().at(-1)).toHaveFocus();
    expect(document.activeElement).toHaveTextContent('Seguridad');
  });

  it('Esc cierra sin navegar y el foco vuelve al boton', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    boton.focus();
    await usuario.keyboard('{Enter}{ArrowDown}{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
    // Y no se ha movido de pantalla: Esc no elige nada.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/recaudación/i);
  });

  it('Esc cierra aunque el foco haya salido del panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    await usuario.click(boton);
    // El foco se va a otro control de la cabecera —con Tab, o con un clic que
    // no cierre—: el oyente del panel ya no lo ve pasar.
    screen.getByRole('button', { name: 'Abrir la navegación' }).focus();
    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });

  it('el clic fuera cierra el panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await usuario.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navegar desde otra puerta cierra el panel abierto', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    // Abierto con el raton, el foco se queda en el boton: ni Tab ni Esc van a
    // intervenir aqui. La otra puerta es la paleta: buscar y abrir una opcion
    // cambia la ruta con el panel todavia abierto, y sin la guarda de navegar
    // el lanzador se queda flotando sobre la pantalla nueva.
    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    await usuario.click(boton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await usuario.keyboard('{Control>}k{/Control}');
    await usuario.keyboard('caja de tasas');
    await usuario.keyboard('{Enter}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });
});
