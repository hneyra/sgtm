import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { MODULOS, bloquesDe, opcionPorRuta, rutaDeOpcion } from '../catalogo';
import type { BloqueDeNavegacion, ModuloDelCatalogo } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { entraCon, limpiarSesion } from '../pruebas/sesion';

/**
 * **Plegar un grupo del menu, con carril o sin el** (#391 §5, ADR-0014 §5).
 *
 * El pliegue lo estreno Transito con sus trece hojas, y hasta hoy hacia dos
 * cosas a la vez: quitar las opciones del menu **y** meter cada pantalla en el
 * carril del centro de reportes. Las dos juntas, y una sola vez por modulo.
 *
 * Catastro solo necesita la primera. Sus tres superficies ya navegan entre sus
 * opciones —el conmutador de modalidad de la ficha, las pestanas del territorio
 * y las del cuadro de valuacion—, asi que un carril al lado seria una segunda
 * lista para navegar lo mismo. De ahi la regla que la tabla declara:
 *
 * > Un grupo se pliega en el menu cuando **su superficie ya sabe navegar entre
 * > sus opciones**. Si ademas sus opciones no tienen otra forma de alcanzarse
 * > entre si, el pliegue lleva carril (`centro`). Lo primero puede darse varias
 * > veces en un modulo; lo segundo, una sola.
 *
 * Lo que este archivo comprueba, y que no es «que se dibuje una entrada»:
 *
 * 1. que **ninguna opcion se pierda**: las doce de Catastro siguen alcanzables
 *    con el menu plegado, y se comprueba **recorriendolas**, no afirmandolo;
 * 2. que el pliegue sin carril **no dibuja carril** —ni en Catastro ni de
 *    rebote en los tres modulos que si lo tienen—;
 * 3. que la entrada plegada abre **la primera opcion que el usuario puede ver**
 *    y desaparece cuando no puede ver ninguna (REQ-03 §5);
 * 4. y que el limite de «un carril por modulo» sobrevive a la generalizacion:
 *    plegar puede darse varias veces, el carril no.
 *
 * El centro de reportes tiene su propio archivo —`centro-de-reportes.test.tsx`,
 * sobre Transito e Autorizaciones— y lo que se comprueba aqui es que **la
 * generalizacion no lo ha tocado**.
 */

const CATASTRO = MODULOS.find((m) => m.id === 'catastro') as ModuloDelCatalogo;

const bloqueDeCatastro = (label: string): BloqueDeNavegacion =>
  bloquesDe(CATASTRO).find((b) => b.label === label) as BloqueDeNavegacion;

const menuDeCatastro = () => screen.getByRole('navigation', { name: 'Opciones de Catastro' });

const FISCALIZACION = MODULOS.find((m) => m.id === 'fiscalizacion') as ModuloDelCatalogo;

const bloqueDeFiscalizacion = (label: string): BloqueDeNavegacion =>
  bloquesDe(FISCALIZACION).find((b) => b.label === label) as BloqueDeNavegacion;

const menuDeFiscalizacion = () =>
  screen.getByRole('navigation', { name: 'Opciones de Fiscalización' });

/**
 * El predio de muestra: el mismo codigo de referencia catastral con el que
 * `catastro.test.tsx` abre sus fichas.
 *
 * Hace falta para recorrer de verdad: el conmutador de modalidad **no se dibuja
 * sin predio abierto** —sin ficha que conmutar, las chips llevarian a la misma
 * pantalla vacia con otro nombre—, asi que un recorrido que montara las rutas
 * peladas no veria la navegacion que esta comprobando.
 */
const PREDIO = '200601010150010101001';

/** Con que registro se abre cada opcion, cuando su ruta pide uno. */
const REGISTRO_DE_MUESTRA: Readonly<Record<string, string>> = {
  ficha_urbana: PREDIO,
  ficha_economica: PREDIO,
  ficha_bienes: PREDIO,
  ficha_rural: PREDIO,
  actualizacion_catastro: PREDIO,
};

const rutaDeMuestra = (modulo: ModuloDelCatalogo, opcion: { readonly id: string }): string => {
  const situada = modulo.opciones.find((o) => o.id === opcion.id);
  if (situada === undefined) throw new Error(`«${opcion.id}» no es una opcion de ${modulo.id}`);
  const registro = REGISTRO_DE_MUESTRA[opcion.id];
  return registro === undefined
    ? rutaDeOpcion(modulo, situada)
    : `${rutaDeOpcion(modulo, situada)}/${registro}`;
};

/**
 * Las opciones del modulo a las que **enlaza** lo que hay dibujado ahora mismo,
 * fuera de la barra lateral.
 *
 * Se descuenta la barra porque la barra es justo lo que se esta plegando: si
 * contara, un bloque plegado «alcanzaria» sus opciones por el menu que las
 * acaba de esconder, y la comprobacion no diria nada.
 */
function opcionesEnlazadasDesdeLaPantalla(moduloId: string): readonly string[] {
  const barra = document.querySelector('.sgtm-nav');
  const enlaces = [...document.querySelectorAll('a[href]')].filter(
    (enlace) => barra === null || !barra.contains(enlace),
  );
  return enlaces.flatMap((enlace) => {
    const destino = enlace.getAttribute('href') ?? '';
    const [, modulo = '', ranura = ''] = destino.split('?')[0]?.split('/') ?? [];
    if (modulo !== moduloId) return [];
    const opcion = opcionPorRuta(modulo, ranura);
    return opcion === undefined ? [] : [opcion.id];
  });
}

/**
 * **Recorre** un bloque plegado desde su entrada y devuelve las opciones a las
 * que se llega, siguiendo enlaces hasta que no aparezca ninguna nueva.
 *
 * Es la unica forma honesta de comprobar la premisa del pliegue —«su superficie
 * ya sabe navegar entre sus opciones»—: afirmarlo con una lista escrita a mano
 * volveria a poner en un archivo lo que el pliegue existe para no tener
 * cableado en ninguno.
 */
async function alcanzablesDesdeLaSuperficie(
  modulo: ModuloDelCatalogo,
  bloque: BloqueDeNavegacion,
): Promise<ReadonlySet<string>> {
  const entrada = bloque.opciones[0];
  if (entrada === undefined) return new Set();

  const vistas = new Set<string>([entrada.id]);
  const porVisitar = [entrada.id];
  while (porVisitar.length > 0) {
    const id = porVisitar.shift() as string;
    const montada = montarEnRuta(rutaDeMuestra(modulo, { id }));
    /* Se espera a que aparezca **la navegacion de la superficie**, que es lo
       que se esta midiendo: el conmutador de modalidad y las pestanas de las
       hojas se dibujan las dos con `role="tablist"`. Y hay que esperarla de
       verdad: las tres superficies de Catastro llegan en su propio trozo
       (`lazy`), asi que contar enlaces en cuanto hay un `<h1>` —que lo dibuja
       la cabecera del shell, antes de que el trozo baje— contaria cero sin
       decir por que. */
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(document.querySelector('[role="tablist"]')).not.toBeNull());
    for (const alcanzada of opcionesEnlazadasDesdeLaPantalla(modulo.id)) {
      if (!bloque.opciones.some((o) => o.id === alcanzada)) continue;
      if (vistas.has(alcanzada)) continue;
      vistas.add(alcanzada);
      porVisitar.push(alcanzada);
    }
    montada.unmount();
  }
  return vistas;
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('la tabla decide que se pliega, y si lleva carril', () => {
  it('Catastro pliega dos bloques y ninguno lleva carril', () => {
    expect(CATASTRO.bloquesPlegados).toEqual(['Territorio', 'Valuación']);
    expect(CATASTRO.centroDeReportes).toBeUndefined();
    expect(bloquesDe(CATASTRO).map((b) => [b.label, b.plegado, b.carril])).toEqual([
      ['Predio', false, false],
      // «Documentos» es de #498 F2: el reporte del contribuyente sale del grupo
      // del predio porque no se abre con el codigo del predio, sino con el de
      // la persona. Un grupo de uno, y separa dos identificadores distintos.
      ['Documentos', false, false],
      ['Territorio', true, false],
      ['Valuación', true, false],
    ]);
  });

  it('el carril implica pliegue, y no al reves', () => {
    // Los tres modulos con centro lo declaran **tambien** como plegado: el
    // menu los dibuja por el mismo camino que los de Catastro, y lo unico que
    // el carril anade es la lista al lado de la pantalla.
    for (const modulo of MODULOS) {
      if (modulo.centroDeReportes === undefined) continue;
      expect(modulo.bloquesPlegados ?? [], `${modulo.id}`).toContain(modulo.centroDeReportes);
    }
    /* Y al reves no: los dos de Catastro y el de Fiscalizacion se pliegan sin
       ser el centro de nada. El de Fiscalizacion es de #506 F5, y solo se pudo
       porque F1 hizo de sus tres opciones una superficie: la tira de hojas es lo
       que lleva de cualquiera a las otras dos, que es la condicion de FRO-05 §5
       para plegar un grupo. */
    expect(MODULOS.filter((m) => (m.bloquesPlegados ?? []).length > 0).map((m) => m.id)).toEqual([
      'catastro',
      'fiscalizacion',
      'transito',
      'infracciones-administrativas',
      'autorizaciones-y-licencias',
    ]);
  });
});

describe('el menu de Catastro pasa de doce entradas a nueve', () => {
  /**
   * Nueve y no tres, y la razon **cambio con #498 F2**: el reporte se fue a su
   * propio grupo, asi que ya no es el que impide plegar «Predio». Lo que lo
   * impide ahora es `ficha_rural`, y se midio en vez de suponerse: montada la
   * ficha urbana con el predio de muestra, lo que enlaza son urbana, economica,
   * bienes y la actualizacion —cuatro de seis—, porque `Conmutador` dibuja la
   * rural apagada a proposito (`derivaDe = catastral && una !== 'rural'`): del
   * codigo de referencia no sale `codUnidad`, y ofrecerla seria un enlace a un
   * 404. La cuenta de entradas no se mueve —seis y una donde habia siete—, pero
   * lo que cada una agrupa si.
   */
  it('seis de «Predio» y una de «Documentos», mas «Territorio» y «Valuación» plegadas', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('heading', { level: 1 });

    const entradas = within(menuDeCatastro()).getAllByRole('link');
    expect(entradas).toHaveLength(9);
    expect(entradas.filter((e) => e.textContent?.startsWith('Territorio'))).toHaveLength(1);
    expect(entradas.filter((e) => e.textContent?.startsWith('Valuación'))).toHaveLength(1);
    // Y las cinco del territorio y del cuadro ya no se listan una a una.
    for (const rotulo of ['Vías y calles', 'Sectores y manzanas', 'Aranceles', 'Depreciación']) {
      expect(within(menuDeCatastro()).queryByText(rotulo)).not.toBeInTheDocument();
    }
  });

  it('cada entrada plegada dice cuantas hay dentro y abre la primera', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('heading', { level: 1 });

    const territorio = within(menuDeCatastro()).getByRole('link', { name: /^Territorio/ });
    expect(territorio).toHaveTextContent('Territorio2');
    expect(territorio).toHaveAttribute('href', '/catastro/calles');

    const valuacion = within(menuDeCatastro()).getByRole('link', { name: /^Valuación/ });
    expect(valuacion).toHaveTextContent('Valuación3');
    expect(valuacion).toHaveAttribute('href', '/catastro/aranceles');
  });

  it('la entrada abre la primera que el perfil puede ver, no la primera del catalogo', async () => {
    // Sin «Vías y calles», la entrada del territorio tiene que abrir
    // «Sectores y manzanas»: un enlace a la primera del catalogo llevaria a un
    // aviso de «no tienes permiso».
    entraCon({ consulta_fichas: ['lectura'], sectores: ['lectura'] });
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      const entrada = within(menuDeCatastro()).getByRole('link', { name: /^Territorio/ });
      expect(entrada).toHaveTextContent('Territorio1');
      expect(entrada).toHaveAttribute('href', '/catastro/sectores');
    });
  });

  it('sin ninguna opcion visible del bloque no hay entrada que abrir', async () => {
    entraCon({ consulta_fichas: ['lectura'] });
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      expect(within(menuDeCatastro()).getAllByRole('link')).toHaveLength(1);
    });
    expect(within(menuDeCatastro()).queryByText(/^Territorio/)).not.toBeInTheDocument();
    expect(within(menuDeCatastro()).queryByText(/^Valuación/)).not.toBeInTheDocument();
  });
});

describe('plegar sin carril no dibuja ningun carril', () => {
  it.each(['/catastro/calles', '/catastro/sectores', '/catastro/aranceles'])(
    '%s se dibuja sin lista de hojas al lado',
    async (ruta) => {
      const montada = montarEnRuta(ruta);
      await screen.findByRole('heading', { level: 1 });

      expect(document.querySelector('.sgtm-centro__carril')).toBeNull();
      expect(
        screen.queryByRole('navigation', { name: 'Reportes de Catastro' }),
      ).not.toBeInTheDocument();

      montada.unmount();
    },
  );

  it('el hub distingue las dos frases: carril y sin carril', async () => {
    montarEnRuta('/catastro');

    const tarjeta = (await screen.findByRole('heading', { level: 3, name: 'Valuación' })).closest(
      'section',
    ) as HTMLElement;
    const filas = within(tarjeta).getAllByRole('link');
    expect(filas).toHaveLength(1);
    expect(filas[0]).toHaveAttribute('href', '/catastro/aranceles');
    // La del centro de reportes dice «se elige la hoja a la izquierda»: aqui no
    // hay carril que elegir, y prometerlo seria prometer una lista que la
    // pantalla no dibuja.
    expect(tarjeta).toHaveTextContent('3 opciones en una sola pantalla');
    expect(tarjeta).not.toHaveTextContent('hojas en una pantalla');
  });
});

describe('las doce opciones de Catastro siguen alcanzables', () => {
  /**
   * **Recorridas, no afirmadas.** Lo que se compone es la union de dos cosas:
   * lo que el menu lista de su mano —las opciones de los bloques sin plegar,
   * mas la entrada de cada bloque plegado— y lo que se alcanza **desde la
   * superficie** de cada bloque plegado, siguiendo sus enlaces.
   *
   * Es la comprobacion que impide plegar un grupo cuya superficie no lleve a
   * todas sus opciones: marcar «Predio» en la tabla la pone roja nombrando las
   * que quedarian sin retorno.
   */
  it('el menu y las superficies, entre los dos, llegan a las doce', async () => {
    const alcanzables = new Set<string>();
    for (const bloque of bloquesDe(CATASTRO)) {
      if (!bloque.plegado) {
        // El menu las lista una a una: se alcanzan pulsando.
        for (const opcion of bloque.opciones) alcanzables.add(opcion.id);
        continue;
      }
      // Plegado: del menu sale **una**, y de su superficie las demas.
      for (const id of await alcanzablesDesdeLaSuperficie(CATASTRO, bloque)) alcanzables.add(id);
    }

    expect([...alcanzables].sort()).toEqual(CATASTRO.opciones.map((o) => o.id).sort());
  });

  it('la superficie del territorio lleva a sus dos hojas, y la del cuadro a sus tres', async () => {
    expect(
      [...(await alcanzablesDesdeLaSuperficie(CATASTRO, bloqueDeCatastro('Territorio')))].sort(),
    ).toEqual(['calles', 'sectores']);
    expect(
      [...(await alcanzablesDesdeLaSuperficie(CATASTRO, bloqueDeCatastro('Valuación')))].sort(),
    ).toEqual(['aranceles', 'depreciacion', 'valores_unitarios']);
  });
});

/* ── Fiscalizacion: los cinco destinos del embudo (#506 F5) ────────────── */

describe('el menu de Fiscalizacion pasa de ocho entradas a seis', () => {
  /**
   * **El pliegue de «Resultados» sólo se pudo desde #506 F1.**
   *
   * FRO-05 §5 pone la condición: un grupo se pliega cuando **su superficie ya
   * sabe navegar entre sus opciones**. Antes de que las tres fueran una
   * superficie de tres hojas, plegarlas habría escondido tres pantallas detrás
   * de una entrada que sólo llevaba a la primera — que es exactamente lo que
   * #391 se negó a hacer con «Predio» en Catastro.
   */
  it('cinco destinos, con «Resultados» plegado y las otras cuatro listadas', async () => {
    montarEnRuta('/fiscalizacion/fisc-omisos');
    await screen.findByRole('heading', { level: 1 });

    const entradas = within(menuDeFiscalizacion()).getAllByRole('link');
    // Ocho opciones, seis entradas: las tres de «Resultados» pasan a ser una.
    expect(FISCALIZACION.opciones).toHaveLength(8);
    expect(entradas).toHaveLength(6);
    expect(entradas.filter((e) => e.textContent?.startsWith('Resultados'))).toHaveLength(1);
    // Y las tres ya no se listan una a una.
    /* Las dos que dejan de listarse. **«Resultados» no entra en esta lista**: es
       el rotulo de la entrada plegada, y esa entrada es justo lo que se dibuja
       en lugar de las tres. */
    for (const rotulo of [
      'Estado de cuenta de fiscalización',
      'Histórico de fiscalización predial',
    ]) {
      expect(within(menuDeFiscalizacion()).queryByText(rotulo)).not.toBeInTheDocument();
    }
  });

  it('la entrada plegada dice cuantas hay dentro y abre la primera', async () => {
    montarEnRuta('/fiscalizacion/fisc-omisos');
    await screen.findByRole('heading', { level: 1 });

    const resultados = within(menuDeFiscalizacion()).getByRole('link', { name: /^Resultados/ });
    expect(resultados).toHaveTextContent('Resultados3');
    expect(resultados).toHaveAttribute('href', '/fiscalizacion/fisc-resultados');
  });

  /**
   * SoD-4 en el menú: el fiscalizador de campo no ve `fisc_resultados`, así que
   * su entrada plegada tiene que abrir la primera que **él** puede ver — un
   * enlace a la primera del catálogo lo llevaría a un aviso de «no tienes
   * permiso».
   */
  it('sin `fisc_resultados`, la entrada abre la siguiente que el perfil si ve', async () => {
    entraCon({ fisc_omisos: ['lectura'], fisc_estado_cuenta: ['lectura'] });
    montarEnRuta('/fiscalizacion/fisc-omisos');
    await screen.findByRole('heading', { level: 1 });

    const resultados = await within(menuDeFiscalizacion()).findByRole('link', {
      name: /^Resultados/,
    });
    expect(resultados).toHaveTextContent('Resultados1');
    expect(resultados).toHaveAttribute('href', '/fiscalizacion/fisc-estado-cuenta');
  });
});

describe('las ocho opciones de Fiscalizacion siguen alcanzables', () => {
  it('el menu y la superficie de resultados, entre los dos, llegan a las ocho', async () => {
    const alcanzables = new Set<string>();
    for (const bloque of bloquesDe(FISCALIZACION)) {
      if (!bloque.plegado) {
        for (const opcion of bloque.opciones) alcanzables.add(opcion.id);
        continue;
      }
      for (const id of await alcanzablesDesdeLaSuperficie(FISCALIZACION, bloque)) {
        alcanzables.add(id);
      }
    }

    expect([...alcanzables].sort()).toEqual(FISCALIZACION.opciones.map((o) => o.id).sort());
  });

  it('la superficie de resultados lleva a sus tres hojas', async () => {
    expect(
      [
        ...(await alcanzablesDesdeLaSuperficie(FISCALIZACION, bloqueDeFiscalizacion('Resultados'))),
      ].sort(),
    ).toEqual(['fisc_estado_cuenta', 'fisc_historico', 'fisc_resultados']);
  });
});

describe('el acto con el que se empieza en Fiscalizacion', () => {
  /**
   * **Fiscalización no declara acción primaria, y eso se midió.**
   *
   * El prototipo pone «Levantar acta» encima de sus destinos. La tabla compone
   * el destino como `${ruta}?nuevo=1`, así que el botón abriría el acta **sin
   * fila de la muestra detrás** — y esa acta dice de sí misma que hay que entrar
   * desde el programa para que traiga su predio y su contribuyente. Un acto del
   * shell que lleva a una pantalla que contesta «aquí no» no es un comienzo.
   *
   * El camino de verdad al acta es el enlace de la fila de la muestra (#506 F3),
   * que llega con los dos identificadores puestos.
   */
  it('no dibuja boton de acto, porque el suyo necesita una fila detras', async () => {
    entraCon({ fisc_omisos: ['lectura'], fisc_predial: ['lectura', 'registro'] });
    montarEnRuta('/fiscalizacion/fisc-omisos');
    await waitFor(() =>
      expect(within(menuDeFiscalizacion()).getAllByRole('link').length).toBeGreaterThan(0),
    );

    expect(FISCALIZACION.accionPrimaria).toBeUndefined();
    expect(screen.queryByRole('link', { name: 'Levantar acta' })).toBeNull();
  });

  /* El contraste: Catastro **sí** la declara, así que la ausencia de arriba no
     puede ser que el mecanismo no funcione. */
  it('y Catastro si lo dibuja, que es lo que hace util la comprobacion de arriba', async () => {
    entraCon({ consulta_fichas: ['lectura'], ficha_urbana: ['lectura', 'registro'] });
    montarEnRuta('/catastro/consulta-fichas');
    await waitFor(() =>
      expect(within(menuDeCatastro()).getAllByRole('link').length).toBeGreaterThan(0),
    );

    expect(screen.getByRole('link', { name: 'Registrar predio' })).toBeInTheDocument();
  });
});
