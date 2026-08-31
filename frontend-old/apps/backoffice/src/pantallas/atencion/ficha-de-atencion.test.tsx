import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { datosDe, desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPERACIONES, escribe } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import { clienteDePruebas, montarEnRuta } from '../../pruebas/montar';
import { configurarProveedor, entraCon, limpiarSesion } from '../../pruebas/sesion';
import { opcionPorId, todasLasPantallas } from '../../catalogo';
import { leerAtenciones, olvidarAtenciones } from '../inicio/atenciones';
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
 *    tabulacion itinerante y `aria-controls` **solo en la seleccionada**— con
 *    **activacion manual**: las flechas mueven el foco y Enter activa, para que
 *    recorrer la barra no dispare las cinco lecturas;
 * 6. las acciones llevan a otra de las 134 **con el contexto puesto**, ninguna
 *    escribe desde aqui, y la que se queda sin contexto **desaparece** en vez de
 *    abrir el padron entero;
 * 7. el foco entra en el nombre de quien se atiende, sin robarselo a nadie;
 * 8. cada rejilla dice **cuantas hay**, no cuantas caben, y donde estan las
 *    demas;
 * 9. cada panel anuncia en voz alta lo que hace: buscando, cuantas hay, o el
 *    titulo del aviso.
 */

/** La primera persona del padron del prototipo: la unificada se sirve con su codigo. */
const CODIGO = '00000025673';
const RUTA = `/atencion/${CODIGO}`;

/**
 * El perfil que ve la ficha entera: las siete opciones que compone **y** las que
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
  beneficios: ['lectura'],
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
function espiar(responder?: (camino: string) => Response | Promise<Response> | undefined): void {
  const debajo = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    const camino = url.replace(/^.*\/api\/v1/, '');
    if (!url.includes('/api/v1')) return debajo(entrada, opciones);
    pedidas.push(camino);
    // El responder puede tardar: es lo unico con lo que se puede mirar lo que
    // la pantalla dice **mientras** la lectura esta en curso.
    const fingida = await responder?.(camino);
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
    expect(rotulos).toEqual(['Consulta de predios']);
    expect(screen.queryByRole('tab', { name: 'Consulta de vehículos' })).not.toBeInTheDocument();
    // Ni deshabilitada: una pestaña apagada invita a pedir lo que el permiso niega.
    expect(
      screen.queryByRole('tab', { hidden: true, name: 'Consulta de vehículos' }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByRole('tab', { name: 'Papeletas de infracción de tránsito' }),
    ).not.toBeInTheDocument();
  });

  it('sin el padron, ni sale la peticion ni aparecen el nombre y el documento', async () => {
    /* **Esta prueba no llamaba a `espiar()`**, asi que `pedidas` quedaba vacio y
       la asercion de que la peticion no salio no podia fallar: con la guarda
       quitada seguia verde. Ahora se espia de verdad —y se mira ademas lo que
       se dibuja, que es el segundo camino: la cabecera consultaba el permiso
       solo para decidir si avisaba, y pintaba el nombre y el DNI **al lado del
       aviso de que no se pueden ver**—. */
    entraCon({ consulta_predios: ['lectura'] });
    espiar();
    montarEnRuta(RUTA);

    expect(await screen.findByText(/aquí solo se ve el código/i)).toBeInTheDocument();
    // Ni el nombre de la primera fila del padron del prototipo, ni su DNI: el
    // aviso de que no se pueden ver no puede salir **al lado** de los dos.
    expect(screen.queryByText(/MEDINA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/03593174/)).not.toBeInTheDocument();
    // Y la peticion no salio: el dato no se pide, no es que se pida y se tape.
    expect(salieron('/rentas/contribuyentes')).toHaveLength(0);
    // Y el codigo de la ruta si: es lo unico que la ficha sabe sin el padron
    // —encabeza la ficha, en lugar del nombre, y esta en su propio dato—.
    expect(screen.getAllByText(CODIGO).length).toBeGreaterThan(0);
  });

  it('ni siquiera una identidad ya en caché se pinta sin el permiso', async () => {
    /* El tercer camino, que las dos guardas de dibujo existen para cerrar y que
       ninguna prueba distinguía: una respuesta que YA está en la caché —de una
       sesión con permiso, antes de que el administrador lo quitara— y un
       `enabled` que ya no la pediría. Sin las guardas del dibujo, el nombre y
       el DNI cacheados se pintarían igual: la revisión final lo demostró
       quitándolas con las 54 en verde. */
    entraCon({ consulta_predios: ['lectura'] });
    const cliente = clienteDePruebas();
    cliente.setQueryData(['atencion', 'identidad', CODIGO], {
      codigo: CODIGO,
      nombre: 'MEDINA MEDINA, RUFINA (SUC.)',
      tipoDocumento: 'DNI',
      numeroDocumento: '03593174',
      activo: true,
    });
    montarEnRuta(RUTA, cliente);

    expect(await screen.findByText(/aquí solo se ve el código/i)).toBeInTheDocument();
    expect(screen.queryByText(/MEDINA/)).not.toBeInTheDocument();
    expect(screen.queryByText(/03593174/)).not.toBeInTheDocument();
  });

  it('sin la unificada, ni sale la peticion ni hay total, y se dice por que', async () => {
    /* La gemela de la de arriba. El total consolidado es la respuesta a la
       pregunta que trae a la gente a la ventanilla: sin la lectura que lo
       publica, la cabecera se quedaba **muda** —ni cifra ni motivo—, y una ficha
       sin deuda a la vista se lee como una persona que no debe nada. */
    entraCon({ contribuyentes: ['lectura'], consulta_predios: ['lectura'] });
    espiar();
    montarEnRuta(RUTA);

    await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    expect(salieron('/consultas/unificada')).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Resumen de saldos' })).not.toBeInTheDocument();
    expect(screen.getByText(/no se puede dar el total consolidado/i)).toHaveTextContent(
      '«Consulta unificada predial-arbitrios»',
    );
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

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));

    await waitFor(() => expect(salieron('/consultas/predios')).toHaveLength(1));
    expect(salieron('/consultas/predios')[0]).toContain(`contribuyente=${CODIGO}`);
  });

  it('la pestaña financiera **no pide nada**: sus seis rejillas vinieron con el resumen', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await screen.findByRole('tab', { name: 'Consulta de predios' });
    await waitFor(() => expect(salieron('/consultas/unificada')).toHaveLength(1));
    await usuario.click(screen.getByRole('tab', { name: 'Consulta de predios' }));
    await usuario.click(screen.getByRole('tab', { name: 'Consulta unificada predial-arbitrios' }));

    expect(await screen.findByText('Deudas Pendientes')).toBeInTheDocument();
    expect(salieron('/consultas/unificada')).toHaveLength(1);
  });

  it('las papeletas se piden por el **documento** de la persona, no por su codigo', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    await usuario.click(
      await screen.findByRole('tab', { name: 'Papeletas de infracción de tránsito' }),
    );

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

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    const panel = await screen.findByRole('tabpanel');

    // «Autovalúo S/» sale con guion —el recurso no lo publica— y «Deuda S/» con
    // su cifra, porque llega como `ImporteActualizado`. Las dos cosas a la vez
    // son la regla: la cifra solo si trae fecha.
    await waitFor(() => expect(within(panel).getAllByRole('row').length).toBeGreaterThan(1));
    expect(panel).toHaveTextContent(/Cifras actualizadas al/);
  });

  /**
   * **Los beneficios de la persona, sin salir de su ficha** (#393).
   *
   * La pregunta que decide lo que se le cobra —¿le corre la deduccion de 50
   * UIT?— exigia salir a otra pantalla y volver a teclear el codigo, que es una
   * de las ocho que lo volvian a pedir. Se compone por `contribuyente`, el
   * mismo filtro que el contrato declara para su operacion y el mismo con el que
   * preguntan la unificada, los predios y los vehiculos.
   */
  it('la pestaña de beneficios se compone por contribuyente y trae sus filas', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    // Sin el espia, `pedidas` se queda vacio y la asercion de abajo no puede
    // fallar: el mismo descuido que la revision de #297 encontro.
    espiar();
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Beneficios y exoneraciones' }));
    const panel = await screen.findByRole('tabpanel');

    await waitFor(() => expect(within(panel).getAllByRole('row').length).toBeGreaterThan(1));
    // Preguntada por esta persona, no por el padron entero: `{}` habria traido
    // los beneficios de cualquiera bajo la ficha de esta.
    // Preguntada por esta persona, no por el padron entero: `{}` habria traido
    // los beneficios de cualquiera bajo la ficha de esta.
    await waitFor(() =>
      expect(
        salieron('/rentas/beneficios').filter((url) => url.includes(`contribuyente=${CODIGO}`)),
      ).toHaveLength(1),
    );
  });

  /**
   * Y **ninguna de sus tres acciones escribe desde aqui**: registrar, aprobar y
   * denegar son escrituras con su observacion, y ninguna sale de esta ficha
   * (ADR-0016 §2). Lo que hay es la salida a su opcion, con el contexto puesto.
   */
  it('desde los beneficios se sale a su opcion con el contribuyente puesto, y no se aprueba nada', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Beneficios y exoneraciones' }));
    const enlace = await screen.findByRole('link', { name: 'Beneficios y exoneraciones' });
    expect(enlace).toHaveAttribute('href', `/rentas-registro/beneficios?contribuyente=${CODIGO}`);
    const panel = await screen.findByRole('tabpanel');
    for (const acto of ['Registrar', 'Aprobar', 'Denegar']) {
      expect(within(panel).queryByRole('button', { name: acto })).not.toBeInTheDocument();
    }
  });

  it('un importe del resumen sin su `actualizadoA` sale con guion, no con la cifra', async () => {
    /* El resumen leia el importe con una funcion propia que **no exigia la
       fecha** —una copia debilitada de `importeDe`, que es la que lee las seis
       rejillas—, asi que un `ImporteActualizado` a medias se dibujaba igual: la
       cifra de la cabecera, sin fecha y sin nada que lo dijera (regla 9,
       RNF-075). Con una sola lectura para todas, el resumen se comporta como el
       resto de la ficha. */
    entraCon(VENTANILLA);
    espiar((camino) =>
      camino.startsWith('/consultas/unificada') ? unificadaConTotalSinFecha() : undefined,
    );
    montarEnRuta(RUTA);

    const resumen = await screen.findByRole('region', { name: 'Resumen de saldos' });
    const celda = (rotulo: string): string =>
      (within(resumen).getByText(rotulo).parentElement?.textContent ?? '').replace(rotulo, '');
    // El insoluto llega entero y se dibuja; el total, sin fecha, no.
    await waitFor(() => expect(celda('Insoluto')).toBe('100.00'));
    expect(celda('Total')).toBe('—');
  });
});

/* ── 5. La barra de pestañas ───────────────────────────────────────────── */

describe('la barra de pestañas, con el patron completo (RNF-082)', () => {
  it('solo la seleccionada apunta a un panel, porque solo el suyo existe', async () => {
    /* `aria-controls` **unicamente en la activa**: se ponia en las seis y solo
       se monta el panel de una, asi que las otras cinco apuntaban a `id` que no
       estan en el documento. Un lector de pantalla que sigue esa referencia no
       encuentra nada que anunciar; es el mismo defecto que la tabla ya corrigio
       quitandoselo a la fila plegada. */
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const activa = await screen.findByRole('tab', { selected: true });
    const panel = screen.getByRole('tabpanel');
    expect(activa).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', activa.id);
    for (const tab of screen.getAllByRole('tab')) {
      // Tabulacion itinerante: la activa es la unica que el tabulador alcanza.
      expect(tab).toHaveAttribute('tabindex', tab === activa ? '0' : '-1');
      // Y las inactivas **no llevan el atributo**: no señalan a ningun sitio.
      if (tab !== activa) expect(tab).not.toHaveAttribute('aria-controls');
    }
  });

  /**
   * **Activacion manual, y por que cambio** (M6 de la revision de #297).
   *
   * Esta prueba fijaba lo contrario —«la flecha derecha activa la siguiente y se
   * lleva el foco»— y lo fijaba bien: era lo que el codigo hacia. Lo que no se
   * habia medido es lo que costaba, y medido en la aplicacion son **cinco
   * lecturas**: recorrer la barra con la flecha derecha monta uno tras otro los
   * cinco paneles y cada uno pide su padron. Eso es exactamente lo que ADR-0016
   * §2 evita al no consultar las seis al abrir, deshecho por un gesto de
   * teclado. El patron ARIA recomienda la activacion manual precisamente cuando
   * el panel viene del servidor, asi que la barra pasa a moverse con las flechas
   * y a activarse con Enter o Espacio.
   *
   * Lo que la prueba defiende ahora son las dos mitades: que la flecha **no**
   * activa —ni cambia `aria-selected`, ni pide nada— y que Enter si.
   */
  it('las flechas mueven el foco y no activan: no piden lo que se pasa de largo', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    const primera = await screen.findByRole('tab', {
      name: 'Consulta unificada predial-arbitrios',
    });
    primera.focus();
    await usuario.keyboard('{ArrowRight}');

    const segunda = screen.getByRole('tab', { name: 'Consulta de predios' });
    expect(segunda).toHaveFocus();
    // El foco esta en «Predios» y la activa sigue siendo la unificada.
    expect(segunda).toHaveAttribute('aria-selected', 'false');
    expect(primera).toHaveAttribute('aria-selected', 'true');
    // La tabulacion itinerante acompaña al foco, que es lo que pide el patron.
    expect(segunda).toHaveAttribute('tabindex', '0');
    expect(primera).toHaveAttribute('tabindex', '-1');
    // Y lo que importa: pasar por encima **no pidio el padron de predios**.
    expect(salieron('/consultas/predios')).toHaveLength(0);
  });

  it('Enter sobre la enfocada la activa, y entonces si se pide', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar();
    montarEnRuta(RUTA);

    (await screen.findByRole('tab', { name: 'Consulta unificada predial-arbitrios' })).focus();
    await usuario.keyboard('{ArrowRight}');
    await usuario.keyboard('{Enter}');

    const segunda = screen.getByRole('tab', { name: 'Consulta de predios' });
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(salieron('/consultas/predios')).toHaveLength(1));
  });

  /**
   * «La ultima» se lee de la tabla de composicion y no se escribe aqui: la barra
   * crece cuando una opcion mas se puede componer —#393 sumo «Beneficios y
   * exoneraciones»—, y un rotulo escrito a mano convierte ese crecimiento en dos
   * pruebas rojas que no dicen nada de lo que se probaba, que es Inicio y Fin.
   */
  const laUltima = () => {
    const opcion = PESTANAS[PESTANAS.length - 1]?.opcion ?? '';
    const titulo = opcionPorId(opcion)?.title ?? '';
    return screen.getByRole('tab', { name: titulo });
  };

  it('el Espacio tambien activa: es el otro gesto del patron', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    (await screen.findByRole('tab', { name: 'Consulta unificada predial-arbitrios' })).focus();
    await usuario.keyboard('{End}');
    await usuario.keyboard(' ');

    expect(laUltima()).toHaveAttribute('aria-selected', 'true');
  });

  it('la flecha izquierda da la vuelta, y Fin lleva a la ultima', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const primera = await screen.findByRole('tab', {
      name: 'Consulta unificada predial-arbitrios',
    });
    primera.focus();
    await usuario.keyboard('{ArrowLeft}');
    expect(laUltima()).toHaveFocus();

    await usuario.keyboard('{Home}');
    expect(primera).toHaveFocus();
    await usuario.keyboard('{End}');
    expect(laUltima()).toHaveFocus();
  });

  it('el panel **no** es una parada del tabulador: dentro ya hay donde caer', async () => {
    /* Lo llevaba, y el patron ARIA lo pide solo cuando el panel no tiene nada
       enfocable. Este tiene la region desplazable de su tabla y sus enlaces de
       salida, asi que la parada de mas no llevaba a ningun sitio: costaba dos
       mil cien pixeles de desplazamiento —la primera pulsacion del tabulador se
       llevaba la cabecera fuera de la pantalla— para caer en un contenedor mudo. */
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    expect(await screen.findByRole('tabpanel')).not.toHaveAttribute('tabindex');
  });
});

/* ── 5b. El foco al llegar a la ficha ──────────────────────────────────── */

describe('el foco entra en el nombre de quien se atiende (RNF-082)', () => {
  it('con el foco libre, lo toma el nombre: no hay 19 tabuladores hasta la barra', async () => {
    /* Se llega aqui navegando desde el inicio, y una navegacion de React Router
       deja el foco en `body`. Desde `body` hay **diecinueve** pulsaciones del
       tabulador hasta la barra de pestañas —la cabecera del shell, la barra
       lateral y el lanzador van antes—, o sea la ficha entera fuera del alcance
       de quien atiende con el teclado. */
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    const nombre = await screen.findByRole('heading', { level: 2 });
    await waitFor(() => expect(nombre).toHaveFocus());
    // Y sin entrar en el recorrido del tabulador: se le lleva el foco, no se le
    // añade una parada.
    expect(nombre).toHaveAttribute('tabindex', '-1');
  });

  it('si otro control ya tiene el foco cuando aterriza el trozo, no se lo roba', async () => {
    // La misma guarda que el inicio, y por lo mismo: la ficha llega en un trozo
    // diferido y su efecto corre cuando el trozo aterriza, que puede ser DESPUES
    // de que el operador abriera la paleta con Ctrl K.
    entraCon(VENTANILLA);
    const ajena = document.createElement('input');
    ajena.setAttribute('aria-label', 'control que llego primero');
    document.body.append(ajena);
    ajena.focus();

    montarEnRuta(RUTA);
    await screen.findByRole('tablist', { name: /se compone de esta persona/i });

    expect(ajena).toHaveFocus();
    ajena.remove();
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

    await usuario.click(screen.getByRole('tab', { name: 'Papeletas de infracción de tránsito' }));
    expect(
      await screen.findByText('Fuente: Tránsito · Papeletas de infracción de tránsito'),
    ).toBeInTheDocument();
  });

  it('la accion lleva a su opcion con el filtro del contrato puesto', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
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

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
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

    await usuario.click(
      await screen.findByRole('tab', { name: 'Papeletas de infracción de tránsito' }),
    );
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

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    const panel = await screen.findByRole('tabpanel');
    await waitFor(
      () => expect(panel).toHaveTextContent(/Tu perfil no puede consultar «Consulta de predios»/),

      // Con su reintento por delante: retry 1 + 1000 ms dejan el waitFor
      // por omision a un milisegundo del rojo con las 63 suites en paralelo.
      { timeout: 4000 },
    );
    expect(panel).toHaveTextContent(/reintentar dará lo mismo/i);
  });

  it('la red caida invita a reintentar, y no dice que no exista', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/predios') ? problema(500) : undefined));
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    const panel = await screen.findByRole('tabpanel');
    await waitFor(
      () => expect(panel).toHaveTextContent(/No se pudo consultar «Consulta de predios»/),

      // Con su reintento por delante: retry 1 + 1000 ms dejan el waitFor
      // por omision a un milisegundo del rojo con las 63 suites en paralelo.
      { timeout: 4000 },
    );
    expect(panel).toHaveTextContent(/no quiere decir que no exista/i);
  });

  it('un codigo que el padron no reconoce se dice, y no se inventa una persona', async () => {
    entraCon(VENTANILLA);
    montarEnRuta('/atencion/00000000000');

    expect(await screen.findByText(/Ese código no está en el padrón/i)).toBeInTheDocument();
  });

  it('el 404 no se dice como red caida: reintentarlo da 404', async () => {
    /* Iba por la rama del fallo de red —«vuelve a intentarlo»— para un codigo
       que el servidor dice no conocer, y ademas contradecia a la cabecera, que
       dos centimetros mas arriba ya lo decia bien. */
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/predios') ? problema(404) : undefined));
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    const panel = await screen.findByRole('tabpanel');
    await waitFor(
      () => expect(panel).toHaveTextContent(/«Consulta de predios» no tiene nada con ese código/),

      // Con su reintento por delante: retry 1 + 1000 ms dejan el waitFor
      // por omision a un milisegundo del rojo con las 63 suites en paralelo.
      { timeout: 4000 },
    );
    expect(panel).not.toHaveTextContent(/Vuelve a intentarlo/i);
    expect(panel).toHaveTextContent(/comprueba el código/i);
  });

  it('con la identidad resuelta a «no esta en el padron», debajo no se compone nada', async () => {
    /* El resto de la ficha se compone con el codigo de la ruta, y las lecturas
       que lo aceptan responden igual para un codigo que no existe: el proxy
       enseñaba un total de 279,03 y ofrecia la constancia de no adeudo **de
       nadie**. Una ficha compuesta bajo el aviso de que esa persona no existe se
       lee como la deuda de alguien. */
    entraCon(VENTANILLA);
    montarEnRuta('/atencion/00000000000');

    await screen.findByText(/Ese código no está en el padrón/i);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen de saldos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Constancia de no adeudo' })).not.toBeInTheDocument();
  });

  it('un 404 del propio padron se dice como lo que es, y tampoco compone nada', async () => {
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/rentas/contribuyentes') ? problema(404) : undefined));
    montarEnRuta(RUTA);

    // Con su reintento por delante: la consulta reintenta una vez.
    expect(
      await screen.findByText(/Ese código no está en el padrón/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    // Y **no** el aviso de la lectura fallida: son el mismo hecho dicho dos veces.
    expect(screen.queryByText(/No se pudo consultar «Contribuyentes»/)).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

/* ── 8. Cuantas hay, y donde estan las que no caben ────────────────────── */

/**
 * La respuesta de la unificada con **una seccion paginada de verdad**.
 *
 * Se interpone por encima del proxy —el patron de `territorio.test`— y el proxy
 * no se toca: el proxy sirve las filas del prototipo con `totalElementos =
 * contenido.length`, que es lo que tiene, y falsear ahi una paginacion haria que
 * la aplicacion en desarrollo y las demas pruebas vieran cifras que nadie
 * sirvio. El backend real pagina cada seccion a veinte.
 */
function unificadaConDeudasPaginadas(cuantas: number, total: number): Response {
  return new Response(unificadaCruda(cuantas, total), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** El cuerpo, en crudo: las dos respuestas fingidas parten de aqui. */
function unificadaCruda(cuantas: number, total: number): string {
  const importe = (cifra: string) => ({ importe: cifra, actualizadoA: '2026-08-13' });
  const vacia = {
    contenido: [],
    pagina: 0,
    tamano: 0,
    totalElementos: 0,
    totalPaginas: 1,
    hayMas: false,
  };
  return JSON.stringify({
    contribuyente: { codigo: CODIGO, nombre: 'MEDINA', documento: '03593174' },
    aLaFecha: '2026-08-13',
    resumenDeSaldos: {
      insoluto: importe('100.00'),
      reajuste: importe('0.00'),
      interes: importe('10.00'),
      gasto: importe('0.00'),
      total: importe('110.00'),
      estadoDeLaConsulta: 'Deuda al 13/08/2026.',
    },
    deudasPendientes: {
      contenido: Array.from({ length: cuantas }, (_, i) => ({
        tributo: 'IMPUESTO PREDIAL',
        ejercicio: 2000 + i,
        insoluto: importe('10.00'),
        reajuste: importe('0.00'),
        interes: importe('1.00'),
        gasto: importe('0.00'),
        total: importe('11.00'),
      })),
      pagina: 0,
      tamano: cuantas,
      totalElementos: total,
      totalPaginas: Math.ceil(total / Math.max(cuantas, 1)),
      hayMas: total > cuantas,
    },
    pagosRealizados: vacia,
    altasYBajas: vacia,
    fraccionamientos: vacia,
    valores: vacia,
    declaracionesJuradas: vacia,
  });
}

/** La misma respuesta, con el total **sin su `actualizadoA`**: un importe a medias. */
function unificadaConTotalSinFecha(): Response {
  const cuerpo = JSON.parse(unificadaCruda(0, 0)) as Record<string, unknown>;
  const resumen = cuerpo['resumenDeSaldos'] as Record<string, unknown>;
  resumen['total'] = { importe: '110.00' };
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('la rejilla dice cuantas hay, no cuantas caben', () => {
  const bloqueDe = (marco: HTMLElement): HTMLElement =>
    marco.closest('.sgtm-ficha__rejilla') as HTMLElement;

  it('«20 de 43 deudas», con el sustantivo del dominio y no «filas»', async () => {
    /* La rejilla contaba `contenido.length` y lo llamaba «20 filas», junto a un
       resumen que cubre las cuarenta y tres: la cifra no estaba mal calculada,
       estaba contando otra cosa y nada lo decia. `totalElementos` y `hayMas` los
       trae la propia seccion. */
    entraCon(VENTANILLA);
    espiar((camino) =>
      camino.startsWith('/consultas/unificada') ? unificadaConDeudasPaginadas(20, 43) : undefined,
    );
    montarEnRuta(RUTA);

    const deudas = await screen.findByRole('region', { name: 'Deudas Pendientes' });
    await waitFor(() => expect(bloqueDe(deudas)).toHaveTextContent('20 de 43 deudas'));
    expect(bloqueDe(deudas)).not.toHaveTextContent('20 filas');
  });

  it('y dice donde estan las otras veintitres: en la opcion que pagina', async () => {
    entraCon(VENTANILLA);
    espiar((camino) =>
      camino.startsWith('/consultas/unificada') ? unificadaConDeudasPaginadas(20, 43) : undefined,
    );
    montarEnRuta(RUTA);

    const deudas = await screen.findByRole('region', { name: 'Deudas Pendientes' });
    await waitFor(() =>
      expect(bloqueDe(deudas)).toHaveTextContent(
        /las demás, con su paginador y sus filtros, en «Consulta de deuda»/i,
      ),
    );
  });

  it('sin nada detras no se dice que lo haya: «3 deudas» y ninguna nota de mas', async () => {
    entraCon(VENTANILLA);
    espiar((camino) =>
      camino.startsWith('/consultas/unificada') ? unificadaConDeudasPaginadas(3, 3) : undefined,
    );
    montarEnRuta(RUTA);

    const deudas = await screen.findByRole('region', { name: 'Deudas Pendientes' });
    await waitFor(() => expect(bloqueDe(deudas)).toHaveTextContent('3 deudas'));
    expect(bloqueDe(deudas)).not.toHaveTextContent(/las demás, con su paginador/i);
    // Y la nota propia de la rejilla sigue donde estaba: la de arriba se suma,
    // no la sustituye.
    expect(bloqueDe(deudas)).toHaveTextContent(/La cuota y la fase de cada obligación/i);
  });

  it('las dos pestañas que no tenian salida ya la tienen', async () => {
    /* Vehiculos y Coactiva no declaraban ninguna accion: quien tuviera mas
       vehiculos o mas expedientes de los que trae la primera pagina se quedaba
       sin camino hasta los demas, porque la ficha no pagina. */
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de vehículos' }));
    expect(await screen.findByRole('link', { name: 'Consulta de vehículos' })).toHaveAttribute(
      'href',
      `${opcionPorId('consulta_vehiculos')?.ruta}?contribuyente=${CODIGO}`,
    );

    await usuario.click(screen.getByRole('tab', { name: 'Expedientes coactivos' }));
    expect(await screen.findByRole('link', { name: 'Expedientes coactivos' })).toHaveAttribute(
      'href',
      `${opcionPorId('coactiva_expedientes')?.ruta}?codContribuyente=${CODIGO}`,
    );
  });
});

/* ── 9. Una accion que no puede llevar su contexto no se ofrece ────────── */

describe('un filtro declarado y vacio no abre el padron entero', () => {
  it('sin documento, la accion de transito **desaparece** en vez de llevar a todos', async () => {
    /* `destinoDe` devolvia `opcion.ruta` pelada cuando el filtro se quedaba sin
       valor: con el documento vacio, «Estado de cuenta de infracciones» abria el
       estado de cuenta de **todos**, presentado bajo la ficha de esta persona
       como si fuera el suyo. Es lo que ya hacia bien el registro vacio. */
    const usuario = userEvent.setup();
    entraCon({ ...VENTANILLA, transito_descargos: ['lectura', 'registro'] });
    espiar((camino) =>
      camino.startsWith('/rentas/contribuyentes')
        ? new Response(
            JSON.stringify({
              contenido: [
                {
                  id: 1,
                  codigo: CODIGO,
                  nombreRazonSocial: 'MEDINA SIN DOCUMENTO',
                  tipoDocumento: null,
                  numeroDocumento: null,
                  activo: true,
                },
              ],
              pagina: 0,
              tamano: 1,
              totalElementos: 1,
              totalPaginas: 1,
              hayMas: false,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        : undefined,
    );
    montarEnRuta(RUTA);

    await usuario.click(
      await screen.findByRole('tab', { name: 'Papeletas de infracción de tránsito' }),
    );
    await screen.findByRole('tabpanel');
    expect(
      screen.queryByRole('link', { name: 'Estado de cuenta de infracciones' }),
    ).not.toBeInTheDocument();
    // Y el enlace sin filtro —el descargo, que no promete contexto— sigue.
    expect(
      screen.getByRole('link', { name: 'Descargos y reclamos de papeletas' }),
    ).toBeInTheDocument();
  });
});

/* ── 10. Lo que el panel esta haciendo, dicho en voz alta ──────────────── */

describe('cada panel anuncia lo que hace (RNF-082)', () => {
  const anuncios = (): string[] =>
    screen.getAllByRole('status').map((nodo) => (nodo.textContent ?? '').trim());

  it('al activarse dice «Buscando…», y al llegar dice cuantas hay', async () => {
    // Medido antes: `role="status"` = [] en los cuatro estados de un panel. Quien
    // navega con lector de pantalla activaba una pestaña y no oia nada.
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    // La lectura de predios tarda a proposito: sin eso no hay instante en el que
    // mirar lo que se dice **mientras** se busca.
    espiar((camino) =>
      camino.startsWith('/consultas/predios')
        ? new Promise<Response>((listo) => setTimeout(() => listo(problema(500)), 200))
        : undefined,
    );
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    expect(anuncios()).toContain('Buscando…');
  });

  it('al llegar, el anuncio dice cuantas hay', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    await waitFor(() => expect(anuncios().some((dicho) => /predios?$/i.test(dicho))).toBe(true));
  });

  it('cuando la lectura falla, lo que se anuncia es el titulo del aviso', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/predios') ? problema(403) : undefined));
    montarEnRuta(RUTA);

    await usuario.click(await screen.findByRole('tab', { name: 'Consulta de predios' }));
    // Con su reintento: la consulta reintenta una vez antes de darse por vencida.
    await waitFor(
      () => expect(anuncios()).toContain('Tu perfil no puede consultar «Consulta de predios»'),
      { timeout: 4000 },
    );
  });

  it('la pestaña financiera anuncia sus seis conteos', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await screen.findByRole('region', { name: 'Deudas Pendientes' });
    await waitFor(() =>
      expect(anuncios().some((dicho) => /deudas? · .*pagos? · /i.test(dicho))).toBe(true),
    );
  });
});

/* ── 11. Lo que la ficha pide es lectura, y lo que sabe de la persona ──── */

describe('ninguna pestaña pide una operacion que escriba', () => {
  it('las seis opciones que compone son `GET`', () => {
    /* Una operacion que escribe no se pide al abrir una pantalla, y aqui se
       pediria **sola**, al activar la pestaña: sin observacion, sin
       confirmacion y sin que nadie la pulse (regla 10, ADR-0016 §2). La tabla de
       composicion nombra opciones, asi que nada impide escribir en ella el id de
       una que sea `POST`; esto es lo que lo impide. */
    for (const pestana of PESTANAS) {
      const operacion = OPERACIONES[pestana.opcion as IdDeOperacion];
      expect(operacion, `«${pestana.opcion}» no es una operacion del contrato`).toBeDefined();
      expect(escribe(pestana.opcion as IdDeOperacion), `«${pestana.opcion}» escribe`).toBe(false);
    }
  });
});

describe('la condicion especial y la atencion anotada', () => {
  /** El padron respondiendo con una condicion especial, tal como la publica el recurso. */
  const conCondicion = (condicion: string) => (camino: string) =>
    camino.startsWith('/rentas/contribuyentes')
      ? new Response(
          JSON.stringify({
            contenido: [
              {
                id: 1,
                codigo: CODIGO,
                nombreRazonSocial: 'MEDINA ROJAS, ANA',
                tipoDocumento: 'DNI',
                numeroDocumento: '03593174',
                condicionEspecial: condicion,
                activo: true,
              },
            ],
            pagina: 0,
            tamano: 1,
            totalElementos: 1,
            totalPaginas: 1,
            hayMas: false,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      : undefined;

  it('«PENSIONISTA» se enseña en la cabecera, tal cual llega', async () => {
    /* Decide la deduccion del predial —las 50 UIT de NEG-05—, asi que quien
       atiende tiene que verlo **antes** de explicar una cifra. Sin rotulo
       inventado: el catalogo no publica uno, y traducirlo seria redactar en
       lenguaje del dominio por cuenta de la interfaz (RNF-080). */
    entraCon(VENTANILLA);
    espiar(conCondicion('PENSIONISTA'));
    montarEnRuta(RUTA);

    const cabecera = await screen.findByRole('heading', { level: 2 });
    const bloque = cabecera.closest('.sgtm-ficha__cabecera') as HTMLElement;
    await waitFor(() => expect(within(bloque).getByText('PENSIONISTA')).toBeInTheDocument());
    // Con su palabra dentro de la insignia: nunca solo por color (FRO-02 §2.1).
    expect(within(bloque).getByText('Condición')).toBeInTheDocument();
  });

  it('sin condicion especial no se dibuja el dato: no hay «—» que interpretar', async () => {
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    expect(screen.queryByText('Condición')).not.toBeInTheDocument();
  });

  it('entrar por un enlace directo tambien anota la atencion', async () => {
    /* La anotaba solo el inicio, al pulsar la fila: quien entra por el enlace
       compartido, por el historial del navegador o por la barra de direcciones
       no aparecia en «Atenciones recientes», y volver a esa persona exigia
       buscarla otra vez. */
    olvidarAtenciones();
    entraCon(VENTANILLA);
    montarEnRuta(RUTA);

    await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    await waitFor(() => expect(leerAtenciones()).toHaveLength(1));
    expect(leerAtenciones()[0]?.codigo).toBe(CODIGO);
    expect(leerAtenciones()[0]?.documento).toBe('DNI 03593174');
  });

  it('sin el permiso del padron no se anota nada: no hay a quien anotar', async () => {
    olvidarAtenciones();
    entraCon({ consulta_predios: ['lectura'] });
    montarEnRuta(RUTA);

    await screen.findByRole('tablist', { name: /se compone de esta persona/i });
    expect(leerAtenciones()).toHaveLength(0);
  });
});
