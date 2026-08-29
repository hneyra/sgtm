import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import {
  motivoDeLaPrimaria,
  primariaApagada,
  primariaEncendida,
} from '../../pruebas/acciones';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { todasLasPantallas } from '../../catalogo';
import { SIN_DATO } from '../seguridad/listado';
import { seccionesDeLaPestana } from './FichaDelPredio';

/**
 * La ficha del predio: las cuatro fichas y su actualizacion, **una superficie**.
 *
 * Antes eran cinco pantallas del mismo objeto con cinco formas: once pestanas
 * la urbana, una seccion plana la economica, una la de bienes comunes, dos la
 * rural, y una gemela divergente para actualizar. Lo que esta superficie tiene
 * que demostrar no es «que se dibuje»:
 *
 * 1. que **cada opcion abre donde esta lo suyo**, y que la ficha y su edicion no
 *    abren en el mismo sitio aunque sean la misma modalidad;
 * 2. que el conmutador **no ofrece lo que no puede abrir**: la rural se
 *    identifica por su unidad catastral y no se deriva del codigo del predio,
 *    asi que ofrecerla desde uno seria un enlace a un 404;
 * 3. que las tres pestanas del predio **no se repiten** por modalidad, que es la
 *    mitad de por que esta superficie existe;
 * 4. que el vocabulario de la construccion es **uno solo**, el de la ficha;
 * 5. y que nada de esto toca lo que mas protege el repositorio: la actualizacion
 *    sigue exigiendo su observacion antes de dejar guardar (regla 10, RNF-052).
 */

const URBANA = '/catastro/ficha-urbana/200601010150010101001';
const RURAL = '/catastro/ficha-rural/11024-0418';
const ACTUALIZACION = '/catastro/actualizacion-catastro/200601010150010101001';

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

describe('cada opcion abre en la pestana que lleva lo suyo', () => {
  it('la ficha urbana abre en Identificación: quien la abre viene a ver la ficha', async () => {
    montarEnRuta(URBANA);
    expect(await screen.findByRole('tab', { name: 'Identificación' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  /**
   * **Y la actualizacion no**, aunque sea la misma modalidad urbana.
   *
   * Es la diferencia que obliga a que la pestana inicial vaya por opcion y no
   * por modalidad: `actualizacion_catastro` **es** el modo de edicion versionada
   * de Valorizacion, y abrirla en Identificación seria abrir otra pantalla.
   */
  it('la actualización abre en Valorización, que es la pestaña que edita', async () => {
    montarEnRuta(ACTUALIZACION);
    expect(await screen.findByRole('tab', { name: 'Valorización' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('el conmutador no ofrece lo que no puede abrir', () => {
  /**
   * De un codigo de referencia catastral salen `codRefCatastral` —urbana y
   * economica— y `codEdificacion` —bienes, el mismo sin el tramo de unidad—.
   * **No sale `codUnidad`**, que es lo que pide la rural y que ni siquiera es un
   * codigo catastral: `11024-0418`, con guion.
   */
  it('desde un predio urbano, la rural sale apagada y dice por qué', async () => {
    montarEnRuta(URBANA);
    const region = await screen.findByRole('region', { name: 'Ficha del predio' });

    const rural = within(region).getByLabelText('Ficha catastral rural');
    expect(rural).toHaveAttribute('aria-disabled', 'true');
    expect(rural).not.toHaveAttribute('href');

    // Las otras dos si se ofrecen, y son enlaces de verdad.
    expect(within(region).getByLabelText('Ficha catastral económica')).toHaveAttribute('href');
    expect(within(region).getByLabelText('Ficha de bienes comunes')).toHaveAttribute('href');

    expect(within(region).getByRole('status')).toHaveTextContent(/unidad catastral/);
  });

  it('y desde una unidad rural, las otras tres salen apagadas', async () => {
    montarEnRuta(RURAL);
    const region = await screen.findByRole('region', { name: 'Ficha del predio' });

    for (const nombre of [
      'Ficha catastral urbana individual',
      'Ficha catastral económica',
      'Ficha de bienes comunes',
    ]) {
      expect(within(region).getByLabelText(nombre)).toHaveAttribute('aria-disabled', 'true');
    }
    expect(within(region).getByLabelText('Ficha catastral rural')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  /**
   * Y una modalidad que este perfil no puede ver **no se dibuja**, ni apagada:
   * una chip apagada dice «esto existe y aqui no se puede», que es informacion
   * que REQ-03 §5 no le debe a quien no tiene el permiso.
   */
  it('una modalidad sin permiso no se dibuja, ni siquiera apagada', async () => {
    entraCon({
      ficha_urbana: ['lectura'],
      ficha_economica: ['lectura'],
    });
    montarEnRuta(URBANA);
    const region = await screen.findByRole('region', { name: 'Ficha del predio' });

    expect(within(region).getByLabelText('Ficha catastral económica')).toBeInTheDocument();
    expect(within(region).queryByLabelText('Ficha de bienes comunes')).not.toBeInTheDocument();
    expect(within(region).queryByLabelText('Ficha catastral rural')).not.toBeInTheDocument();
  });
});

describe('las tres pestanas del predio no se repiten por modalidad', () => {
  it('en una modalidad que no es la urbana, lo dice con todas sus letras', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RURAL);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    await usuario.click(screen.getByRole('tab', { name: 'Titularidad' }));
    expect(screen.getByText('Sin repetir')).toBeInTheDocument();
  });

  it('en la urbana no hay nada que advertir: es donde viven', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    await usuario.click(screen.getByRole('tab', { name: 'Titularidad' }));
    expect(screen.queryByText('Sin repetir')).not.toBeInTheDocument();
  });
});

/* ── El aviso que explica donde vive la actualizacion (#413 A2) ─────────── */

/**
 * **La fusion, dicha donde se lee.**
 *
 * `PropuestaA.dc.html` dibuja sobre la tabla de pisos el bloque que explica que
 * ahi vive «Actualización del catastro» como modo de edicion versionada, y en el
 * codigo no estaba: la informacion vivia en el docblock de `FichaDelPredio`, que
 * es exactamente donde no la lee quien atiende en ventanilla.
 *
 * Las dos condiciones son la mitad del valor, y cada una tiene su prueba:
 *
 *   fuera del modo edicion  dentro ya hay un aviso —«Guardar reemplaza la lista
 *                           completa de pisos»— y dos seguidos son ruido: el
 *                           segundo deja de leerse, y el que importa ahi es el
 *                           que advierte de que se van a reemplazar los pisos
 *   solo en la urbana       es la modalidad que la actualizacion versiona
 *                           (`TipoFicha.UNICA`). En la economica, en bienes
 *                           comunes o en la rural mandaria a editar una ficha
 *                           que **no** es la que se esta mirando
 */
describe('la pestana de Valorizacion dice donde vive la actualizacion', () => {
  const AVISO = 'Aquí se actualiza la ficha';

  it('en la ficha urbana lo dice, y nombra el acto que lleva alli', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    // No esta en las otras pestanas: es de Valorizacion, que es la que se edita.
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    /* **Redactado para quien atiende**: dice que cada correccion guarda una
       version nueva y que la anterior queda en el historico, y nombra el acto
       con el rotulo con que se dibuja al pie —«Actualizar catastro»—, sin
       reescribirlo (RNF-080). Nada de «superficie», «componente» ni «catalogo». */
    const detalle = screen.getByText(/cada corrección guarda una versión nueva/);
    expect(detalle).toHaveTextContent('Actualizar catastro');
    expect(detalle).toHaveTextContent(/histórico/);
    expect(detalle.textContent ?? '').not.toMatch(/superficie|componente|catálogo|pestaña gemela/i);
    // Y por que el vocabulario dejo de ser doble, con el ejemplo del prototipo.
    expect(detalle).toHaveTextContent('03 — ADOBE');
  });

  /**
   * **En el modo edicion no se repite.** Con los dos avisos seguidos, el que hay
   * que leer —el que dice que la version nueva lleva exactamente los pisos de la
   * tabla— queda debajo de una explicacion que quien esta editando ya no
   * necesita: llego aqui por el acto.
   */
  it('en la actualización no se dibuja: ahí ya hay un aviso, y es otro', async () => {
    montarEnRuta(ACTUALIZACION);
    await screen.findByRole('tab', { name: 'Valorización' });

    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(
      screen.getByText('Guardar reemplaza la lista completa de pisos'),
    ).toBeInTheDocument();
  });

  /**
   * **Y solo en la urbana.** Las otras tres modalidades no se editan desde aqui
   * —`ficha_bienes` y `ficha_rural` ni siquiera ofrecen el acto
   * (`catastro/composicion.ts`)—, asi que el aviso mandaria a un sitio que
   * versiona otra ficha del mismo predio.
   */
  it.each([
    ['/catastro/ficha-economica/200601010150010101001', 'la económica'],
    ['/catastro/ficha-bienes/200601010150010101', 'la de bienes comunes'],
    [RURAL, 'la rural'],
  ])('%s no lo lleva: no es la modalidad que se versiona', async (ruta) => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta(ruta);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();

    montada.unmount();
  });
});

describe('solo se monta la pestana activa', () => {
  /**
   * Montar las cinco a la vez costaria dibujar noventa campos para ensenar
   * doce, y ademas dejaria en el documento secciones que nadie esta mirando: un
   * lector de pantalla las recorreria todas.
   */
  it('las secciones de otra pestaña no estan en el documento', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ficha catastral urbana individual' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Características de la titularidad' }),
    ).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('tab', { name: 'Titularidad' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Características de la titularidad' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Ficha catastral urbana individual' }),
    ).not.toBeInTheDocument();
  });
});

describe('un solo vocabulario para la construccion', () => {
  /**
   * Era el defecto que este issue existe para cerrar: `actualizacion_catastro`
   * repetia dos pestanas de `ficha_urbana` con **otro vocabulario** —`MEP 03` es
   * `ADOBE` en una y `ADOBE / TAPIA` en la otra, `UCA 01` es `VIVIENDA` frente a
   * `CASA HABITACIÓN`, y los acabados son un desplegable A–G en la ficha y texto
   * libre en la actualizacion—. Al quedar una sola pestana Valorizacion queda un
   * solo vocabulario, y esta prueba se pone roja si alguien reintroduce el otro.
   */
  it('Valorización de la urbana lleva las secciones de la ficha, no las gemelas', async () => {
    const pantallas = await todasLasPantallas();
    const secciones = seccionesDeLaPestana('urbana', 'valorizacion', pantallas);

    expect(secciones.map((seccion) => seccion.label)).toEqual([
      'Obras complementarias',
      'Áreas legal y física',
    ]);

    // Y ninguna de ellas es la seccion de construccion de la actualizacion, que
    // es la que traia el vocabulario divergente.
    const gemela = pantallas['actualizacion_catastro']?.tabs?.[0]?.secciones ?? [];
    const etiquetasGemelas = gemela.map((seccion) => seccion.label);
    for (const seccion of secciones) {
      expect(etiquetasGemelas).not.toContain(seccion.label);
    }
  });
});

describe('la actualizacion sigue exigiendo su observacion', () => {
  /**
   * Lo que mas protege este repositorio (regla 10, RNF-052): mudar la
   * actualizacion a la superficie no le quita la franja ni le adelanta la
   * primaria.
   */
  it('con el documento de origen puesto y sin observación, la primaria sigue apagada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ACTUALIZACION);
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    // Con los pisos ya sembrados y el documento de origen escrito, lo unico que
    // falta es la observacion. Si la primaria se encendiera aqui, la regla 10 se
    // habria perdido al mudar la pantalla.
    await usuario.type(screen.getByLabelText('Documento de origen'), 'Acta 2026-9');
    primariaApagada();

    await usuario.type(await observacion(), 'Ampliación verificada en campo.');
    primariaEncendida();
  });

  /**
   * Y la guarda propia de esta pantalla sigue en pie: mientras los pisos de la
   * version vigente no esten leidos, guardar mandaria `construcciones: []` y
   * **borraria** las construcciones del predio sin que nadie lo pidiera (#71).
   */
  it('el motivo de no poder guardar se pinta, no vive en un «title»', async () => {
    montarEnRuta(ACTUALIZACION);
    await screen.findByRole('tab', { name: 'Valorización' });

    expect(motivoDeLaPrimaria()).toBeDefined();
  });
});

describe('ninguna cifra que el recurso no publique', () => {
  /**
   * `FichaResource` publica quince campos donde el prototipo dibuja noventa. El
   * resto sale «—», y que se vea el hueco dice que falta y a quien le toca: una
   * cifra plausible en una pantalla de valuacion acaba en un valor mal emitido.
   */
  it('los campos que el backend no manda salen vacios, no con un cero', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Ficha del predio' });

    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));
    expect(screen.getByLabelText('Valor de la obra (S/)')).toHaveTextContent(SIN_DATO);
  });
});
