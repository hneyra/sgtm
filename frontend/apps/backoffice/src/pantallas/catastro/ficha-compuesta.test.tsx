import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { seccionesDe } from '../../catalogo';
import { todasLasPantallas } from '../../catalogo';
import { composicionDe } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La ficha catastral, compuesta: cabecera-resumen, indice y acto (#319).
 *
 * Una ficha son hasta once pestanas de campos, y hasta ahora se abrian a pelo:
 * quien la abria tenia que bajar hasta el bloque de versionado para saber de
 * cuando era lo que estaba leyendo, rodar la pagina para llegar a una seccion, y
 * volver al menu para corregir el predio que tenia delante.
 *
 * Lo que se comprueba, y lo que **no**:
 *
 * - la cabecera-resumen ensena la vigencia que trae la respuesta, no una
 *   inventada, y lo que el recurso no publica sale con «—»;
 * - el indice lista **exactamente** las secciones declaradas, y ninguna otra
 *   pantalla lo gana: la composicion es opt-in por opcion;
 * - el acto de la ficha —actualizar— es alcanzable y lleva el codigo en la ruta.
 *
 * Y no se comprueba que la pagina se desplace: `scrollIntoView` no existe en
 * jsdom y fingirlo no diria nada. Lo que importa es que cada entrada lleva a
 * **su** ancla, y eso si se puede mirar.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const URBANA = '/catastro/ficha-urbana/200601010150010101001';

const resumen = () => screen.getByRole('region', { name: 'Resumen de la ficha' });
const indice = () => screen.getByRole('navigation', { name: 'Secciones de la pantalla' });

describe('la cabecera-resumen dice de que ficha es y de cuando', () => {
  it('el codigo con guiones, la version vigente y desde cuando rige', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    // El codigo de la ruta, troquelado por tramos para leerlo de un vistazo.
    expect(cabecera.getByText('20-06-01-01-015-001-01-01-00-1')).toBeInTheDocument();
    // La vigencia es **la de la respuesta**: v3, vigente desde el 12/03/2026 y
    // salida de fiscalizacion. Si el recurso dijera otra cosa, esto diria otra.
    expect(cabecera.getByText('VIGENTE')).toBeInTheDocument();
    expect(cabecera.getByText(/v3 · desde 12\/03\/2026 · FISCALIZACION/)).toBeInTheDocument();
  });

  it('lo que el recurso no publica sale con «—», nunca compuesto aqui', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    // `FichaResource` no trae titular —lo tiene contribuyentes— y no trae el
    // area construida total, que es la **suma** de los pisos: la interfaz no
    // suma (RNF-083). Las dos salen vacias y el hueco dice a quien le toca.
    expect(cabecera.getByText('Titular').nextElementSibling).toHaveTextContent(SIN_DATO);
    expect(cabecera.getByText('Área construida').nextElementSibling).toHaveTextContent(SIN_DATO);
    // El uso si lo publica, y sale tal cual.
    expect(cabecera.getByText('Uso').nextElementSibling).toHaveTextContent('Casa habitación');
  });

  it('sin registro abierto no hay resumen: no hay ficha que resumir', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    expect(await screen.findByText(/Elige un registro/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen de la ficha' })).not.toBeInTheDocument();
  });
});

describe('el indice lista las secciones declaradas, y solo esas', () => {
  it('las de la pestana abierta, en su orden y sin ninguna de mas', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const pantallas = await todasLasPantallas();
    const estructura = pantallas['ficha_urbana'];
    expect(estructura).toBeDefined();
    if (!estructura) return;
    const declaradas = seccionesDe(estructura, 0).map((seccion) => seccion.label);

    const entradas = within(indice())
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toEqual(declaradas);
    expect(within(indice()).getByText('2 secciones')).toBeInTheDocument();
  });

  it('cada entrada lleva al ancla de su seccion, y la pulsada queda marcada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const segunda = within(indice()).getByRole('button', {
      name: 'Ubicación del predio catastral',
    });
    await usuario.click(segunda);

    // El ancla existe y es la seccion que dice: sin el `id`, la entrada seria un
    // enlace a ninguna parte y nadie lo notaria.
    const ancla = document.getElementById('sgtm-seccion-0-1');
    expect(ancla).not.toBeNull();
    expect(within(ancla as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Ubicación del predio catastral',
    );
    expect(segunda).toHaveAttribute('data-activa', '1');
  });

  it('cambiar de pestana cambia el indice con el formulario', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    await usuario.click(screen.getByRole('tab', { name: 'Construcción' }));
    const entradas = within(indice())
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toEqual(['Características de construcción — piso 01', 'Áreas legal y física']);
  });

  it('ninguna otra pantalla gana indice: la composicion es opt-in por opcion', async () => {
    // Una pantalla con secciones que no lo declara sigue dibujandose igual.
    expect(composicionDe('vehiculos').indice).toBeUndefined();
    montarEnRuta('/rentas-registro/vehiculos/ABC-123');
    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });

  it('las cuatro fichas lo declaran, y solo las cuatro', async () => {
    const pantallas = await todasLasPantallas();
    const conIndice = Object.keys(pantallas).filter(
      (opcion) => composicionDe(opcion).indice === true,
    );
    expect(conIndice.sort()).toEqual([
      'ficha_bienes',
      'ficha_economica',
      'ficha_rural',
      'ficha_urbana',
    ]);
  });
});

describe('el acto de la ficha es alcanzable', () => {
  it('«Actualizar catastro» es la primaria y lleva el codigo en la ruta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const acto = screen.getByRole('link', { name: 'Actualizar catastro' });
    expect(acto).toHaveClass('sgtm-boton--primario');
    expect(acto).toHaveAttribute('href', '/catastro/actualizacion-catastro/200601010150010101001');

    // Y las del prototipo que siguen sin acto se quedan como estaban: visibles y
    // apagadas. Dos primarias en la misma barra dirian que hay dos actos.
    for (const etiqueta of ['Modificar', 'Deshacer', 'Imprimir', 'Guardar']) {
      const boton = screen.getByRole('button', { name: etiqueta });
      expect(boton).toBeDisabled();
      expect(boton).not.toHaveClass('sgtm-boton--primario');
    }

    // «Nuevo» si tiene acto desde #320 —abre el alta guiada—, y aun asi **no es
    // la primaria**: la primaria con un predio abierto es actualizarlo.
    const nuevo = screen.getByRole('button', { name: 'Nuevo' });
    expect(nuevo).toBeEnabled();
    expect(nuevo).not.toHaveClass('sgtm-boton--primario');

    await usuario.click(acto);
    // La pantalla de destino abre el predio por su codigo, sin volver a buscarlo.
    expect(await screen.findByText('Pisos declarados en la nueva versión')).toBeInTheDocument();
  });

  it('sin registro abierto no hay acto: no hay predio que actualizar', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    expect(await screen.findByText(/Elige un registro/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Actualizar catastro' })).not.toBeInTheDocument();
  });

  it('las dos fichas que no abren por el codigo catastral no lo ofrecen', () => {
    // `codEdificacion` y `codUnidad` no son codigos de referencia catastral, y
    // «Actualización del catastro» abre su predio pidiendo `ficha_urbana` por
    // `codRefCatastral`: el boton llevaria a un 404.
    expect(composicionDe('ficha_bienes').acto).toBeUndefined();
    expect(composicionDe('ficha_rural').acto).toBeUndefined();
    expect(composicionDe('ficha_urbana').acto).toBeDefined();
  });

  it('y la pantalla de actualizacion se abre componiendo el codigo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/actualizacion-catastro');

    await screen.findByText(/Elige un predio/);
    await usuario.click(screen.getByLabelText('Cod. Ref. Catastral · Depto.'));
    await usuario.paste('200601010150010101001');
    await usuario.click(screen.getByRole('button', { name: 'Abrir predio' }));

    expect(await screen.findByText('Pisos declarados en la nueva versión')).toBeInTheDocument();
  });
});
