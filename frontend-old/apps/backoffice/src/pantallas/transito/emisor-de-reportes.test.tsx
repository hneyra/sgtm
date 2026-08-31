import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaDeLaPantalla } from '../../pruebas/acciones';
import { OPCIONES_QUE_LEEN_POR_POST } from '../lecturas-por-post';
import { impedimentoDelActo } from '../actos';

/**
 * **El emisor de reportes de tránsito, la primera lectura por `POST`** (#424,
 * sobre `POST /transito/reportes` de #396).
 *
 * Lo que estas pruebas defienden son los cuatro criterios del issue, y ninguno
 * se puede ver mirando la pantalla:
 *
 *   1. **No pide nada al abrirse.** Una `Conexion` lo haría —`useDatosDeOperacion`
 *      mira los parámetros que faltan, no el verbo— y saldría un `POST` sin tipo
 *      de reporte elegido, que es el 422 que nadie pidió.
 *   2. **No pide observación, y su primaria no queda apagada por falta de ella.**
 *      La regla 10 (RNF-052) justifica lo que **modifica datos**, y esto no
 *      modifica ninguno: pedirla sería mentir sobre lo que hace y dejaría una
 *      fila de auditoría por cada hoja mirada.
 *   3. **Una operación de escritura declarada por esta puerta se rechaza.** Eso
 *      lo mide `verificaciones/lectura-por-post.test.ts`, que es donde vive la
 *      guarda; aquí se comprueba el otro extremo: que la opción que la estrena
 *      sigue declarada y sin impedimento.
 *   4. **El censo de `actos-honestos.test.tsx` se mueve.** También ahí.
 *
 * Y una quinta que es del emisor y no de la puerta: **el criterio que el reporte
 * no usa no se puede teclear**, porque `PeticionDeReporteDeTransito` lo rechaza
 * con 422 nombrándolo —mandarlo y no mirarlo daría una hoja correcta a una
 * pregunta que no es la que se hizo—.
 */

const RUTA = '/transito/transito-reportes';

/** Las peticiones que salieron, para poder afirmar que una **no** salió. */
let pedidas: { camino: string; metodo: string; cuerpo: string }[] = [];

const original = globalThis.fetch;

/** Espía lo que sale y deja pasar al proxy: lo que se mide es qué se pide y cuándo. */
function espiar(): void {
  const debajo = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/api/v1')) {
      pedidas.push({
        camino: url.replace(/^.*\/api\/v1/, ''),
        metodo: opciones?.method ?? 'GET',
        cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
      });
    }
    return debajo(entrada, opciones);
  }) as typeof fetch;
}

/** Las que salieron hacia el emisor, que son las que este archivo mide. */
const alEmisor = () => pedidas.filter(({ camino }) => camino.startsWith('/transito/reportes'));

beforeEach(() => {
  pedidas = [];
  instalarProxyDeDatos({ latencia: false });
  espiar();
});

afterEach(() => {
  globalThis.fetch = original;
  desinstalarProxyDeDatos();
});

/** Elige un tipo de reporte en el desplegable de la cabecera. */
async function elegir(tipo: string): Promise<void> {
  const usuario = userEvent.setup();
  await usuario.selectOptions(await screen.findByLabelText('Reporte'), tipo);
}

describe('la pantalla no pide nada al abrirse (#424, AC 1)', () => {
  it('se dibuja entera sin una sola petición al emisor', async () => {
    montarEnRuta(RUTA);
    await screen.findByLabelText('Reporte');

    /* La afirmación es sobre el emisor y no sobre el `fetch` entero: la sesión y
       los permisos sí piden al montar, y contarlos aquí haría fallar la prueba
       por algo que no es lo que mide. */
    expect(alEmisor()).toEqual([]);
  });

  it('y tampoco al elegir el reporte: se pide al pulsar', async () => {
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');

    expect(alEmisor()).toEqual([]);
  });
});

describe('no pide observación, y su primaria no se apaga por falta de ella (#424, AC 2)', () => {
  it('con el reporte elegido, la primaria está encendida y no hay caja de observación', async () => {
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');

    /* Ni la región de la escritura ni su campo: los dibuja `BarraDeAcciones`
       cuando la pantalla escribe, y esta no escribe. */
    expect(screen.queryByRole('region', { name: 'Observación del usuario' })).toBeNull();
    expect(screen.queryByLabelText('Observación')).toBeNull();

    const primaria = primariaDeLaPantalla();
    expect(primaria).not.toHaveAttribute('aria-disabled');
    expect(primaria).toBeEnabled();
  });

  it('y la franja nunca dice que falta la observación', async () => {
    montarEnRuta(RUTA);
    await screen.findByLabelText('Reporte');

    // Antes de elegir sí está apagada, pero por lo que de verdad falta.
    primariaApagada();
    const motivo = motivoDeLaPrimaria() ?? '';
    expect(motivo).toMatch(/Elige el tipo de reporte/);
    expect(motivo).not.toMatch(/observaci/i);
  });

  it('el acto de esta opción no tiene impedimento: funciona, y no guarda nada', () => {
    /* La otra mitad del AC 2, y la que mueve el censo: mientras la opción no
       declaraba su lectura, `impedimentoDelActo` decía `sin-declaracion` —«la
       pantalla aún no manda estos campos»—, que es justo lo que no le pasa. */
    expect(OPCIONES_QUE_LEEN_POR_POST).toContain('transito_reportes');
    expect(
      impedimentoDelActo('transito_reportes', ['Exportar', 'Imprimir', 'Pantalla', 'Cancelar']),
    ).toBeUndefined();
  });
});

describe('el cuerpo lleva el reporte y solo los criterios que ese reporte usa', () => {
  it('el padrón manda su tipo y sus dos fechas, y nada más', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');

    await usuario.type(screen.getByLabelText('Fecha desde'), '2026-01-01');
    await usuario.click(primariaDeLaPantalla());

    await waitFor(() => expect(alEmisor()).toHaveLength(1));
    const peticion = alEmisor()[0];
    expect(peticion?.metodo).toBe('POST');
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toEqual({
      reporte: 'PADRON',
      desde: '2026-01-01',
    });
  });

  it('el criterio que el reporte no usa **no se dibuja**, así que no se puede teclear', async () => {
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');

    // `PADRON` admite `desde`/`hasta`; `nDeConstancia` es de `PADRON_CONSTANCIAS`.
    expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nº constancia')).toBeNull();
  });

  it('y al cambiar de reporte los criterios del anterior se vacían', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('RELACIÓN CONSTANCIAS LIBRE DE INFRAC.');
    await usuario.type(screen.getByLabelText('Nº constancia'), '000123');

    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');
    await elegir('RELACIÓN CONSTANCIAS LIBRE DE INFRAC.');

    /* Un criterio que sobrevive al cambio de hoja es el 422 de
       `criteriosDeMas` esperando a que alguien pulse. */
    expect(screen.getByLabelText('Nº constancia')).toHaveValue('');
  });

  it('el «Estado» se dibuja bloqueado, con su motivo, y no viaja', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');

    const estado = screen.getByLabelText('Estado');
    expect(estado).toBeDisabled();
    expect(screen.getByText(/estados de la cobranza/)).toBeInTheDocument();

    await usuario.click(primariaDeLaPantalla());
    await waitFor(() => expect(alEmisor()).toHaveLength(1));
    expect(JSON.parse(alEmisor()[0]?.cuerpo ?? '{}')).not.toHaveProperty('estado');
  });

  it('«AÑO» del prototipo viaja como `ANO` del enumerado', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('RESUMEN PAPEL. PENDIENTES Y PAGADAS');

    await usuario.selectOptions(screen.getByLabelText('Agrupado por'), 'AÑO');
    await usuario.click(primariaDeLaPantalla());

    await waitFor(() => expect(alEmisor()).toHaveLength(1));
    expect(JSON.parse(alEmisor()[0]?.cuerpo ?? '{}')).toEqual({
      reporte: 'RESUMEN_PAPELETAS',
      agrupadoPor: 'ANO',
    });
  });
});

describe('lo que este emisor no puede pedir lo dice, y dice dónde está', () => {
  it('un reporte que es otra opción del catálogo apaga la primaria y nombra su pantalla', async () => {
    montarEnRuta(RUTA);
    await elegir('PAPELETA DE INFRACCIÓN');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Papeleta de infracción/);
    expect(alEmisor()).toEqual([]);
  });

  it('el record de conductor dice que le falta la licencia o el documento', async () => {
    montarEnRuta(RUTA);
    await elegir('RECORD DE CONDUCTOR');

    primariaApagada();
    /* El backend sí lo sirve; lo que esta pantalla no tiene es el criterio:
       «Conductor» es un nombre, y mandarlo como documento sería inventárselo. */
    expect(motivoDeLaPrimaria()).toMatch(/licencia de conducir o el documento/);
  });

  it('el record vehicular no se puede pedir sin placa', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('RECORD VEHICULAR');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta la placa/);

    await usuario.type(screen.getByLabelText('Placa'), 'NB-21169');
    expect(primariaDeLaPantalla()).toBeEnabled();
  });
});

describe('la hoja que vuelve se dibuja con las columnas de la sección que llegó', () => {
  it('el padrón vuelve como papeletas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('PADRÓN DE PAPELETAS DE INFRACCIÓN');
    await usuario.click(primariaDeLaPantalla());

    // La cabecera es la del padrón, no la de un resumen ni la de constancias.
    expect(await screen.findByRole('columnheader', { name: 'Nº papeleta' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Placa' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Grupo' })).toBeNull();
  });

  it('el resumen por código vuelve como resumen, con otras columnas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegir('RESUMEN POR CÓDIGO INFRACCIÓN');
    await usuario.click(primariaDeLaPantalla());

    expect(await screen.findByRole('columnheader', { name: 'Grupo' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Nº papeleta' })).toBeNull();
  });
});
