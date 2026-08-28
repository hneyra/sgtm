import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { datosDe, desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { configurarProveedor, entraCon, limpiarSesion } from '../../pruebas/sesion';
import { opcionPorId, todasLasPantallas } from '../../catalogo';
import {
  ESTADO_DE_LA_CONSULTA,
  PESTANAS,
  REJILLAS_DE_LA_UNIFICADA,
  RESUMEN_DE_SALDOS,
} from './pestanas';

/**
 * **La ficha 360° del contribuyente** (#297, ADR-0016 §2).
 *
 * Lo que estas pruebas defienden, en una linea cada cosa:
 *
 * 1. los rotulos son **los del catalogo**, columna a columna: la ficha los
 *    declara para no descargar cuatro modulos por abrirla, y esto compara las
 *    dos listas (RNF-080);
 * 2. una pestaña sin permiso **no se dibuja** —ni vacia, ni deshabilitada— y sin
 *    ninguna se dice cual falta, con el reparto de ADR-0016 §1;
 * 3. al abrir salen **dos** peticiones y no siete: las demas pestañas consultan
 *    al activarse;
 * 4. ninguna cifra sin su fecha: las del resumen salen **tal cual** las mando el
 *    servidor y con su fecha de corte, y una rejilla cuyas filas traen cada una
 *    la suya **no** lleva banda;
 * 5. la barra de pestañas es el patron completo —flechas, Inicio y Fin,
 *    `aria-controls`, tabulacion itinerante— y el foco sigue a la activa;
 * 6. las acciones llevan a otra de las 134 **con el contexto puesto**, y ninguna
 *    escribe desde aqui.
 */

/** La primera persona del padron del prototipo: la unificada se sirve con su codigo. */
const CODIGO = '00000025673';
const RUTA = `/atencion/${CODIGO}`;

/**
 * El perfil que ve la ficha entera: las seis opciones que compone **y** las que
 * sus acciones alcanzan. Los enlaces con contexto llevan a otras de las 134, y
 * cada una tiene su propio permiso.
 */
const VENTANILLA = {
  contribuyentes: ['lectura'],
  consulta_unificada: ['lectura'],
  consulta_predios: ['lectura'],
  consulta_vehiculos: ['lectura'],
  papeletas: ['lectura'],
  adm_estado_cuenta: ['lectura'],
  coactiva_expedientes: ['lectura'],
  cuenta_corriente: ['lectura'],
  consulta_deuda: ['lectura'],
  consulta_fichas: ['lectura'],
  constancia: ['lectura'],
  transito_estado_cuenta: ['lectura'],
  adm_notificaciones_contribuyente: ['lectura'],
};

/** Las peticiones que salieron, para poder afirmar que una **no** salio. */
let pedidas: string[] = [];
/** El cuerpo con que respondio cada camino: contra el se comparan las cifras. */
let cuerpos: Record<string, string> = {};

/**
 * Espia lo que sale y lo que vuelve, y opcionalmente contesta por una ruta.
 *
 * Se interpone **despues** de `entraCon`, asi que envuelve al `fetch` que ya
 * atiende al proveedor de identidad y a la matriz de permisos, y deja pasar al
 * proxy todo lo demas.
 */
function espiar(responder?: (camino: string) => Response | undefined): void {
  const debajo = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    const camino = url.replace(/^.*\/api\/v1/, '');
    if (!url.includes('/api/v1')) return debajo(entrada, opciones);
    pedidas.push(camino);
    const fingida = responder?.(camino);
    if (fingida !== undefined) return fingida.clone();
    const respuesta = await debajo(entrada, opciones);
    cuerpos[camino.split('?')[0] ?? camino] = await respuesta.clone().text();
    return respuesta;
  }) as typeof fetch;
}

/** Un problema del contrato, tal como lo devuelve el backend. */
const problema = (estado: number): Response =>
  new Response(
    JSON.stringify({ type: 'about:blank', title: 'No', status: estado, detail: 'No.' }),
    { status: estado, headers: { 'content-type': 'application/problem+json' } },
  );

const salieron = (prefijo: string): string[] =>
  pedidas.filter((camino) => camino.startsWith(prefijo));

beforeEach(() => {
  pedidas = [];
  cuerpos = {};
  configurarProveedor();
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

/* ── 1. Los rotulos son los del catalogo ───────────────────────────────── */

describe('los rotulos salen del catalogo y no se reescriben (RNF-080)', () => {
  /*
     La ficha **declara** sus columnas en `pestanas.ts` en vez de leerlas del
     catalogo en tiempo de ejecucion: leerlas costaria descargar Consultas,
     Transito, Infracciones y Coactiva —cuatro trozos de estructura— por abrir
     una ficha. Lo que esa decision podria costar es que un rotulo se reescriba y
     nadie se entere; esto es lo que lo impide, y por eso compara **letra a
     letra** contra el catalogo portado.
  */
  it('cada pestaña con tabla declara exactamente la tabla de su opcion', async () => {
    const pantallas = await todasLasPantallas();
    for (const pestana of PESTANAS) {
      if (pestana.tabla === undefined) continue;
      const catalogo = pantallas[pestana.opcion]?.tabla;
      expect(catalogo, `«${pestana.opcion}» no declara tabla en el catalogo`).toBeDefined();
      expect({
        title: pestana.tabla.title,
        cols: [...pestana.tabla.cols],
        num: [...(pestana.tabla.num ?? [])],
      }).toEqual({
        title: catalogo?.title,
        cols: [...(catalogo?.cols ?? [])],
        num: [...(catalogo?.num ?? [])],
      });
    }
  });

  it('cada columna de cada rejilla esta, tal cual, en la tabla de la opcion que la nombra', async () => {
    const pantallas = await todasLasPantallas();
    for (const rejilla of REJILLAS_DE_LA_UNIFICADA) {
      const cols = pantallas[rejilla.rotulos]?.tabla?.cols ?? [];
      expect(cols.length, `«${rejilla.rotulos}» no declara tabla`).toBeGreaterThan(0);
      for (const columna of rejilla.cols) {
        expect(cols, `«${columna}» no es una columna de «${rejilla.rotulos}»`).toContain(columna);
      }
    }
  });

  it('cada rejilla se titula como el manual la titula', async () => {
    const pantallas = await todasLasPantallas();
    const pestanasDeLaUnificada = (pantallas['consulta_unificada']?.tabs ?? []).map(
      (pestana) => pestana.label,
    );
    for (const rejilla of REJILLAS_DE_LA_UNIFICADA) {
      const suyo = pantallas[rejilla.rotulos]?.tabla?.title;
      expect(
        pestanasDeLaUnificada.includes(rejilla.titulo) || suyo === rejilla.titulo,
        `«${rejilla.titulo}» no es un rotulo del catalogo`,
      ).toBe(true);
    }
  });

  it('los rotulos del resumen de saldos son los campos que declara la unificada', async () => {
    const pantallas = await todasLasPantallas();
    const seccion = (pantallas['consulta_unificada']?.tabs ?? [])
      .flatMap((pestana) => pestana.secciones)
      .find((seccion) => seccion.label === 'Resumen de saldos');
    expect(seccion, 'la unificada ya no declara «Resumen de saldos»').toBeDefined();
    for (const cifra of RESUMEN_DE_SALDOS) {
      const campo = seccion?.campos.find((campo) => campo.clave === cifra.clave);
      expect(campo?.label, `«${cifra.clave}» no se llama asi en el catalogo`).toBe(cifra.label);
    }
    expect(seccion?.campos.some((campo) => campo.clave === ESTADO_DE_LA_CONSULTA)).toBe(true);
  });

  it('toda opcion que la ficha nombra existe en el catalogo', () => {
    for (const pestana of PESTANAS) {
      expect(opcionPorId(pestana.opcion), pestana.opcion).toBeDefined();
      for (const otra of pestana.tambien ?? []) expect(opcionPorId(otra), otra).toBeDefined();
      for (const accion of pestana.acciones ?? []) {
        expect(opcionPorId(accion.opcion), accion.opcion).toBeDefined();
      }
    }
  });
});

/* ── 2. Los permisos ───────────────────────────────────────────────────── */

describe('lo que un permiso niega no se dibuja', () => {
  it('la ficha entera enseña una pestaña por opcion compuesta', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const barra = await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    expect(within(barra).getAllByRole('tab')).toHaveLength(PESTANAS.length);
  });

  it('sin el permiso de vehiculos, esa pestaña **no existe**: ni vacia ni apagada', async () => {
    entraCon({ contribuyentes: ['lectura'], consulta_predios: ['lectura'] });
    montarEnRuta(RUTA);

    const barra = await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    const rotulos = within(barra)
      .getAllByRole('tab')
      .map((tab) => tab.textContent);
    expect(rotulos).toEqual(['Predios']);
    expect(screen.queryByRole('tab', { name: 'Vehículos' })).not.toBeInTheDocument();
    // Ni deshabilitada: una pestaña apagada invita a pedir lo que el permiso niega.
    expect(screen.queryByRole('tab', { hidden: true, name: 'Vehículos' })).not.toBeInTheDocument();
  });

  it('sin ninguna de las lecturas, se dice que desde aqui no se compone nada', async () => {
    entraCon({ caja_tributaria: ['ejecucion', 'lectura'] });
    montarEnRuta(RUTA);

    expect(
      await screen.findByText(/no se puede componer nada de esta persona/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('cuando falta **la que acompaña**, se nombra con el rotulo del catalogo', async () => {
    // Las papeletas se componen por el documento de la persona, y el documento
    // lo publica el padron: con `papeletas` y sin `contribuyentes` no hay con
    // que preguntar, y decirle a esa persona que no tiene ninguna lectura seria
    // falso.
    entraCon({ papeletas: ['lectura'] });
    montarEnRuta(RUTA);

    const aviso = await screen.findByText(/Falta una lectura para poder componer la ficha/i);
    expect(aviso.parentElement).toHaveTextContent('«Contribuyentes»');
    expect(screen.queryByRole('tab', { name: 'Papeletas' })).not.toBeInTheDocument();
  });

  it('sin el padron, la cabecera dice que solo tiene el codigo', async () => {
    entraCon({ consulta_predios: ['lectura'] });
    montarEnRuta(RUTA);

    expect(await screen.findByText(/aquí solo se ve el código/i)).toBeInTheDocument();
    expect(salieron('/rentas/contribuyentes')).toHaveLength(0);
  });
});

/* ── 3. Las pestañas consultan al activarse ────────────────────────────── */

describe('que se pide al abrir, y que al activar', () => {
  it('al abrir salen **dos** lecturas: quien es, y su resumen consolidado', async () => {
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    await waitFor(() => expect(salieron('/consultas/unificada')).toHaveLength(1));

    expect(salieron('/rentas/contribuyentes')).toHaveLength(1);
    // Y ninguna de las otras cinco: siete abanicos al abrir es lo que ADR-0016
    // §2 prohibe, y aqui cada uno es un padron entero.
    expect(salieron('/consultas/predios')).toHaveLength(0);
    expect(salieron('/consultas/vehiculos')).toHaveLength(0);
    expect(salieron('/transito/papeletas')).toHaveLength(0);
    expect(salieron('/infracciones/administrativas/estado-cuenta')).toHaveLength(0);
    expect(salieron('/coactiva/expedientes')).toHaveLength(0);
  });

  it('activar «Predios» la pide, con el contribuyente puesto', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));

    await waitFor(() => expect(salieron('/consultas/predios')).toHaveLength(1));
    expect(salieron('/consultas/predios')[0]).toContain(`contribuyente=${CODIGO}`);
  });

  it('la pestaña financiera **no pide nada**: sus seis rejillas vinieron con el resumen', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await screen.findByRole('tab', { name: 'Predios' });
    await waitFor(() => expect(salieron('/consultas/unificada')).toHaveLength(1));
    await usuario.click(screen.getByRole('tab', { name: 'Predios' }));
    await usuario.click(screen.getByRole('tab', { name: 'Unificada predial-arbitrios' }));

    expect(await screen.findByText('Deudas Pendientes')).toBeInTheDocument();
    expect(salieron('/consultas/unificada')).toHaveLength(1);
  });

  it('las papeletas se piden por el **documento** de la persona, no por su codigo', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Papeletas' }));

    await waitFor(() => expect(salieron('/transito/papeletas')).toHaveLength(1));
    // «03593174» es el DNI de la primera fila del padron del prototipo.
    expect(salieron('/transito/papeletas')[0]).toContain('documentoDelInfractor=03593174');
    expect(salieron('/transito/papeletas')[0]).not.toContain(CODIGO);
  });
});

/* ── 4. Ninguna cifra sin su fecha ─────────────────────────────────────── */

describe('las cifras salen tal cual, y con su fecha (regla 9, RNF-083)', () => {
  it('las cinco del resumen estan en la respuesta, y la banda dice su fecha de corte', async () => {
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    const resumen = await screen.findByRole('region', { name: 'Resumen de saldos' });
    await waitFor(() => expect(cuerpos['/consultas/unificada']).toBeDefined());
    const servido = cuerpos['/consultas/unificada'] ?? '';

    const cifras = [...resumen.querySelectorAll('.sgtm-totales__valor')].map((nodo) =>
      (nodo.textContent ?? '').trim(),
    );
    expect(cifras).toHaveLength(RESUMEN_DE_SALDOS.length);
    for (const cifra of cifras) {
      // Tal cual: ni sumada, ni redondeada, ni recompuesta a partir de las partes.
      expect(servido, `«${cifra}» no esta en la respuesta`).toContain(`"${cifra}"`);
    }
    // Y la fecha es la de la respuesta, no la del reloj del navegador.
    const aLaFecha = datosDe('consulta_unificada')?.fechaCalculo ?? '';
    const [anio, mes, dia] = aLaFecha.split('-');
    expect(within(resumen).getByText(/Cifras actualizadas al/)).toHaveTextContent(
      `${dia}/${mes}/${anio}`,
    );
  });

  it('la explicacion del resumen la redacta el backend, no la interfaz', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const dicho = datosDe('consulta_unificada')?.campos?.[ESTADO_DE_LA_CONSULTA];
    expect(await screen.findByText(String(dicho))).toBeInTheDocument();
  });

  it('la rejilla de deudas lleva banda; la de pagos no, porque cada fila trae la suya', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const deudas = await screen.findByRole('region', { name: 'Deudas Pendientes' });
    const pagos = screen.getByRole('region', { name: 'Pagos Realizados' });

    // La banda de una rejilla es hermana de su tarjeta, dentro del mismo bloque.
    const bloqueDe = (marco: HTMLElement): HTMLElement =>
      marco.closest('.sgtm-ficha__rejilla') as HTMLElement;
    await waitFor(() => expect(bloqueDe(deudas)).toHaveTextContent(/Cifras actualizadas al/));
    expect(bloqueDe(pagos)).not.toHaveTextContent(/Cifras actualizadas al/);
    // Y la fecha de cada pago esta en su fila: es la fecha valor del asiento.
    expect(within(pagos).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('las cifras de las deudas estan tal cual en la respuesta', async () => {
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    const deudas = await screen.findByRole('region', { name: 'Deudas Pendientes' });
    await waitFor(() => expect(cuerpos['/consultas/unificada']).toBeDefined());
    const servido = cuerpos['/consultas/unificada'] ?? '';

    const celdas = [...deudas.querySelectorAll('td')]
      .map((nodo) => (nodo.textContent ?? '').trim())
      .filter((texto) => /^-?\d+\.\d{2}$/.test(texto));
    expect(celdas.length).toBeGreaterThan(0);
    for (const cifra of celdas) {
      expect(servido, `«${cifra}» no esta en la respuesta`).toContain(`"${cifra}"`);
    }
  });

  it('la deuda por predio se dibuja porque viene con su fecha, y la banda la dice', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));
    const panel = await screen.findByRole('tabpanel');

    // «Autovalúo S/» sale con guion —el recurso no lo publica— y «Deuda S/» con
    // su cifra, porque llega como `ImporteActualizado`. Las dos cosas a la vez
    // son la regla: la cifra solo si trae fecha.
    await waitFor(() => expect(within(panel).getAllByRole('row').length).toBeGreaterThan(1));
    expect(panel).toHaveTextContent(/Cifras actualizadas al/);
  });
});

/* ── 5. La barra de pestañas ───────────────────────────────────────────── */

describe('la barra de pestañas, con el patron completo (RNF-082)', () => {
  it('cada pestaña apunta a su panel y el panel a su pestaña', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const activa = await screen.findByRole('tab', { selected: true });
    const panel = screen.getByRole('tabpanel');
    expect(activa).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', activa.id);
    // Tabulacion itinerante: la activa es la unica que el tabulador alcanza.
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('tabindex', tab === activa ? '0' : '-1');
    }
  });

  it('la flecha derecha activa la siguiente **y se lleva el foco**', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const primera = await screen.findByRole('tab', { name: 'Unificada predial-arbitrios' });
    primera.focus();
    await usuario.keyboard('{ArrowRight}');

    const segunda = screen.getByRole('tab', { name: 'Predios' });
    expect(segunda).toHaveFocus();
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    expect(primera).toHaveAttribute('aria-selected', 'false');
  });

  it('la flecha izquierda da la vuelta, y Fin lleva a la ultima', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const primera = await screen.findByRole('tab', { name: 'Unificada predial-arbitrios' });
    primera.focus();
    await usuario.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Expedientes coactivos' })).toHaveFocus();

    await usuario.keyboard('{Home}');
    expect(primera).toHaveFocus();
    await usuario.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Expedientes coactivos' })).toHaveFocus();
  });

  it('el panel entra en el tabulador: lo que hay dentro se alcanza sin raton', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    expect(await screen.findByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });
});

/* ── 6. De donde sale lo que se ve, y a donde se sigue ─────────────────── */

describe('la fuente y las acciones con el contexto puesto', () => {
  it('cada pestaña dice de que opcion compone, con el rotulo del catalogo', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    expect(
      await screen.findByText('Fuente: Consultas · Consulta unificada predial-arbitrios'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('tab', { name: 'Papeletas' }));
    expect(
      await screen.findByText('Fuente: Tránsito · Papeletas de infracción de tránsito'),
    ).toBeInTheDocument();
  });

  it('la accion lleva a su opcion con el filtro del contrato puesto', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));
    const enlace = await screen.findByRole('link', { name: 'Consulta de fichas catastrales' });
    expect(enlace).toHaveAttribute(
      'href',
      `${opcionPorId('consulta_fichas')?.ruta}?contribuyente=${CODIGO}`,
    );
  });

  it('el registro va en la ruta cuando el contrato lo pide ahi', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const enlace = await screen.findByRole('link', { name: 'Estado de cuenta corriente' });
    expect(enlace).toHaveAttribute('href', `${opcionPorId('cuenta_corriente')?.ruta}/${CODIGO}`);
  });

  it('sin permiso del destino, el enlace no se dibuja: no se manda a nadie a un 403', async () => {
    const usuario = userEvent.setup();
    entraCon({ ...VENTANILLA, consulta_fichas: [] });
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));
    await screen.findByRole('tabpanel');
    expect(
      screen.queryByRole('link', { name: 'Consulta de fichas catastrales' }),
    ).not.toBeInTheDocument();
  });

  it('«Registrar descargo» es un enlace a su opcion, no un formulario de aqui', async () => {
    // El acto que escribe vive donde vive su observacion obligatoria (regla 10):
    // `POST /transito/descargos` no se lanza desde la ficha, y la ficha tampoco
    // dibuja su formulario. Lo que hace es llevar alli.
    const usuario = userEvent.setup();
    entraCon({ ...VENTANILLA, transito_descargos: ['lectura', 'registro'] });
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Papeletas' }));
    const enlace = await screen.findByRole('link', { name: 'Descargos y reclamos de papeletas' });
    expect(enlace).toHaveAttribute('href', opcionPorId('transito_descargos')?.ruta ?? '');
    expect(screen.queryByRole('button', { name: /Registrar descargo/i })).not.toBeInTheDocument();
  });
});

/* ── 7. Cuando la lectura no responde ──────────────────────────────────── */

describe('un 403 inesperado y una red caida no se dicen igual', () => {
  it('el 403 manda al administrador, y deja lo demas en pie', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/predios') ? problema(403) : undefined));
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));
    const panel = await screen.findByRole('tabpanel');
    await waitFor(() =>
      expect(panel).toHaveTextContent(/Tu perfil no puede consultar «Consulta de predios»/),
    );
    expect(panel).toHaveTextContent(/reintentar dará lo mismo/i);
  });

  it('la red caida invita a reintentar, y no dice que no exista', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/predios') ? problema(500) : undefined));
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Predios' }));
    const panel = await screen.findByRole('tabpanel');
    await waitFor(() =>
      expect(panel).toHaveTextContent(/No se pudo consultar «Consulta de predios»/),
    );
    expect(panel).toHaveTextContent(/no quiere decir que no exista/i);
  });

  it('un codigo que el padron no reconoce se dice, y no se inventa una persona', async () => {
    entraCon(VENTANILLA);
    montarEnRuta('/atencion/00000000000');

    expect(await screen.findByText(/Ese código no está en el padrón/i)).toBeInTheDocument();
  });
});
