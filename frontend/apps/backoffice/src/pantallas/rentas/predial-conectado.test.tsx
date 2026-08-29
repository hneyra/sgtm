import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import type { DatosDePantalla } from '@sgtm/api-client';
import { montarEnRuta } from '../../pruebas/montar';
import { elBloque } from '../../pruebas/nodos';
import { adaptacionDe } from '../conexiones';
import { SIN_DATO } from '../seguridad/listado';

/**
 * **El predial, conectado a su backend** (#395): las tres opciones que #333b
 * anoto como pendientes de capa web.
 *
 *   `predios_rentas`      `GET /rentas/predios` — el padron predial de un
 *                         contribuyente, por su `Conexion` de siempre
 *   `predial_individual`  `POST /rentas/predial/calculo-individual`
 *   `predial_masivo`      `POST /rentas/predial/calculo-masivo`
 *
 * Las dos ultimas van por `Adaptacion` y no por `Conexion` porque su operacion
 * es un `POST`: abrir la pantalla no puede lanzar una determinacion.
 *
 * Lo que estas pruebas fijan, y por que cada una vale lo que cuesta:
 *
 *   1. **el padron sale con «—» donde el recurso no publica.**
 *      `PredioDeRentasResource` no lleva el autovaluo del predio ni su area
 *      construida —el sistema no sabe valorizar todavia, D-11 y GOB-03—, y esas
 *      son las dos columnas que mas se miran. Rellenarlas con lo que el
 *      prototipo capturo daria dos cifras con aspecto de determinacion
 *   2. **el cuerpo del `POST` lleva `simulacion: true`.** Es lo unico que separa
 *      mirar la cuenta de emitir deuda, y desde #395 es tambien la condicion que
 *      deja existir a la accion (`useSimulacion`)
 *   3. **los tramos se colocan por su `orden`, no por su posicion.** El catalogo
 *      tiene tres claves fijas y el recurso publica los que aportaron
 *   4. **la banda dice el sujeto y el conjunto de la respuesta**, no lo que la
 *      pantalla podria deducir del filtro
 */

const PREDIAL = '/rentas-registro/predial-individual?codContribuyente=00000025673&ano=2026';
const MASIVO = '/rentas-registro/predial-masivo';
const PREDIOS = '/rentas-registro/predios-rentas';

/** Lo que salio por la red, con su cuerpo: hay pruebas que miran lo que se manda. */
interface Peticion {
  readonly url: string;
  readonly cuerpo: unknown;
}

let pedidas: Peticion[] = [];

beforeEach(() => {
  pedidas = [];
  instalarProxyDeDatos({ latencia: false });
  const debajo = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/api/v1')) {
      pedidas.push({
        url: url.replace(/^.*\/api\/v1/, ''),
        cuerpo: typeof opciones?.body === 'string' ? JSON.parse(opciones.body) : undefined,
      });
    }
    return debajo(entrada, opciones);
  }) as typeof fetch;
});
afterEach(() => desinstalarProxyDeDatos());

const laMemoria = () => within(elBloque('.sgtm-memoria', 'la memoria del calculo'));

const importeDe = (rotulo: string): string | undefined => {
  const linea = laMemoria().getByText(rotulo).closest('.sgtm-memoria__linea') as HTMLElement;
  return linea.querySelector('.sgtm-memoria__importe')?.textContent ?? undefined;
};

describe('el padron predial de un contribuyente', () => {
  /**
   * **Lo que el recurso no publica sale con «—», y son las dos columnas que mas
   * se miran.**
   *
   * `PredioDeRentasResource` publica codigo, direccion, uso, area de terreno,
   * `%` de propiedad y condicion. No publica el area construida —vive en
   * `construccion`, de la ficha catastral— ni el autovaluo, que **es** la
   * determinacion y se pide con su conjunto sellado. Componer aqui cualquiera
   * de las dos daria una cifra parecida a la que se cobra y ninguna regla la
   * sostendria (RNF-083).
   */
  it('las columnas que el recurso publica se ven; el autovaluo y el area construida no', async () => {
    montarEnRuta(`${PREDIOS}?codContribuyente=00000025673`);

    const fila = (await screen.findByText('02-014-D-14-01')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '02-014-D-14-01',
      'CALLE SANTA ROSA 116',
      'Casa habitación',
      '210.00',
      // Área construida: no la publica este recurso.
      SIN_DATO,
      '100.00',
      // Autovalúo: **es** la determinación, y esta pantalla no determina.
      SIN_DATO,
      'Afecto',
    ]);
  });

  /**
   * **Sin contribuyente no se pide, y se dice por que.**
   *
   * `PrediosDeRentasController` contesta una **pagina vacia** cuando no le dan
   * ningun contribuyente, y una tabla vacia aqui se lee como «esta persona no
   * tiene predios»: exactamente lo contrario de lo que pasa. Es el mismo
   * `exige` que ya usa «Baja de deuda» con `consulta_deuda`.
   */
  it('sin contribuyente no sale ninguna peticion, y la pantalla pide que se busque', async () => {
    montarEnRuta(PREDIOS);

    expect(await screen.findByText('Busca un contribuyente para ver sus predios')).toBeVisible();
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());
    expect(pedidas.filter((p) => p.url.startsWith('/rentas/predios'))).toEqual([]);
  });
});

describe('la determinacion individual se pide con la marca que no asienta nada', () => {
  /**
   * **`simulacion: true` en el cuerpo.** El contrato tiene **una sola**
   * operacion por pantalla —la misma con la que se asentaria—, asi que lo unico
   * que separa mirar la cuenta de emitir deuda es esta marca. Y los filtros
   * viajan por la URL, como en cualquier lectura: el cuerpo no los lleva.
   */
  it('el cuerpo del POST lleva la marca, y los filtros van por la URL', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(pedidas.filter((p) => p.url.startsWith('/rentas/predial/calculo-individual'))).toHaveLength(
        1,
      ),
    );
    const [peticion] = pedidas.filter((p) =>
      p.url.startsWith('/rentas/predial/calculo-individual'),
    );
    expect(peticion?.cuerpo).toEqual({ simulacion: true });
    expect(peticion?.url).toContain('codContribuyente=00000025673');
    expect(peticion?.url).toContain('ano=2026');
  });

  /**
   * **La memoria se llena con el recurso del dominio, no con la forma comun.**
   *
   * `DeterminacionPredialResource` manda `"151406.75"` —lo que devuelve
   * `BigDecimal.toPlainString()`— y lo unico que hace la interfaz es agrupar
   * los millares. Ni suma, ni redondea, ni completa lo que falta.
   */
  it('las cifras salen del recurso, agrupadas y nada mas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() => expect(importeDe('Valuo Afecto (S/)')).toBe('151 406.75'));
    expect(importeDe('UIT vigente 2026 (S/)')).toBe('5 350.00');
    // El resultado, en su bloque aparte.
    expect(
      elBloque('.sgtm-memoria__resultado', 'el resultado').querySelector(
        '.sgtm-memoria__resultado-valor',
      )?.textContent,
    ).toBe('587.44');
  });

  /**
   * **El tramo que no aporto sale con «—», que no es cero.**
   *
   * El recurso publica los tramos que **aportaron**; este contribuyente no
   * llega al tercero. Un «S/ 0.00» ahi seria una cifra, y una cifra dice que se
   * calculo algo.
   */
  it('el tramo que el recurso no manda se queda con el guion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(importeDe('Tramo 2 — de 15 a 60 UIT (0.6 %)')).toBe('S/ 426.94'),
    );
    expect(importeDe('Tramo 3 — más de 60 UIT (1.0 %)')).toBe(SIN_DATO);
  });

  /**
   * **La banda dice lo que dijo el servidor**, no lo que la pantalla podria
   * deducir: el sujeto pasa de ser el codigo tecleado a ser el nombre que
   * redacto quien determino, y el conjunto **sellado** es lo que hace
   * reproducible la cifra (`ARQ-09` §3).
   */
  it('la banda toma el sujeto y el conjunto de la respuesta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    // Antes de pedir: el codigo del filtro, y ningun conjunto que ensenar.
    expect(within(banda).getByText('00000025673')).toBeInTheDocument();
    expect(banda.textContent).toMatch(/Todavía no hay determinación/);

    await usuario.click(screen.getByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(screen.getByText('Parámetros 2026 v1 · sellado')).toBeInTheDocument(),
    );
    const despues = screen.getByLabelText('Sujeto y parámetros de la determinación');
    expect(within(despues).getByText('SUC. RUFINA MEDINA MEDINA')).toBeInTheDocument();
    // Y la fecha es la del calculo que hizo el servidor, no la del reloj de
    // quien mira (regla 9, RNF-075).
    expect(despues.textContent).toContain('13/08/2026');
  });

  /**
   * **La tabla de predios sale del recurso, con las siete columnas del catalogo.**
   *
   * `baseImponible` de cada predio —el valuo afecto ya ponderado por el `%` de
   * propiedad, `RT-011`— viaja en el recurso y **no se dibuja**: ninguna columna
   * la reserva, y ensenarla bajo «Valuo Afecto S/» seria ensenar otra cosa con
   * ese rotulo.
   */
  it('los predios que integran la base salen con sus siete columnas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    const fila = (await screen.findByText('04-021-B-07-00')).closest('tr');
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '04-021-B-07-00',
      'MZ. B LT. 7 — BELLAVISTA',
      'Terreno sin construir',
      '50.00',
      '38 420.00',
      '0.00',
      '19 210.00',
    ]);
  });
});

describe('los tramos se colocan por su orden, no por su posicion', () => {
  const adaptar = (recurso: unknown): DatosDePantalla => {
    const adaptacion = adaptacionDe('predial_individual');
    expect(adaptacion, 'predial_individual no declara adaptacion').not.toBeUndefined();
    return (adaptacion as NonNullable<typeof adaptacion>).deLaRespuesta(recurso);
  };

  const recursoCon = (tramos: readonly unknown[]) => ({
    fechaCalculo: '2026-08-13T09:00:00Z',
    conjunto: '2026 v1',
    predios: [],
    tramos,
    cuotas: [],
  });

  /**
   * **El caso que separa las dos implementaciones.** Un contribuyente cuya base
   * cae entera en el tercer tramo recibe **un solo** tramo, con `orden: 3`.
   * Colocado por posicion iria a la casilla del primero: la cifra correcta bajo
   * el rotulo «hasta 15 UIT (0.2 %)», que es una alicuota que no se le aplico y
   * un limite que no es el suyo. Nadie mira dos veces una cifra que cuadra.
   */
  it('un solo tramo con orden 3 va a la casilla del tercero, no a la del primero', () => {
    const datos = adaptar(
      recursoCon([{ orden: 3, porcionGravada: '412000.00', aporte: '4120.00' }]),
    );

    expect(datos.campos?.['tramo3MasDe60Uit10']).toBe('S/ 412 000.00 → S/ 4 120.00');
    expect(datos.campos?.['tramo1Hasta15Uit02']).toBeUndefined();
    expect(datos.campos?.['tramo2De15A60Uit06']).toBeUndefined();
  });

  /** Y el orden en que llegan tampoco decide: manda el `orden` de cada uno. */
  it('llegan desordenados y cada uno cae en su casilla', () => {
    const datos = adaptar(
      recursoCon([
        { orden: 2, porcionGravada: '71156.75', aporte: '426.94' },
        { orden: 1, porcionGravada: '80250.00', aporte: '160.50' },
      ]),
    );

    expect(datos.campos?.['tramo1Hasta15Uit02']).toBe('S/ 80 250.00 → S/ 160.50');
    expect(datos.campos?.['tramo2De15A60Uit06']).toBe('S/ 71 156.75 → S/ 426.94');
  });

  /** Un tramo con un orden que ninguna casilla dibuja se descarta, no se cuela en la ultima. */
  it('un cuarto tramo no cae en la casilla del tercero', () => {
    const datos = adaptar(recursoCon([{ orden: 4, porcionGravada: '10.00', aporte: '1.00' }]));

    expect(datos.campos?.['tramo3MasDe60Uit10']).toBeUndefined();
  });

  /**
   * **Sin fecha no se dibuja nada.** Una determinacion sin su fecha de calculo
   * es una cuenta que dentro de tres dias es otra y nadie puede decir de cuando
   * era (regla 9, RNF-075): se rechaza en voz alta en vez de dibujarse a medias.
   */
  it('una respuesta sin fecha de calculo se rechaza en voz alta', () => {
    expect(() => adaptar({ conjunto: '2026 v1', predios: [], tramos: [], cuotas: [] })).toThrow(
      /fecha de calculo/,
    );
  });
});

describe('la corrida masiva del predial', () => {
  /**
   * **Las etapas salen del recurso, y la que no mueve dinero sale con «—».**
   *
   * `CorridaPredialResource` manda la cadena vacia en el importe de una etapa
   * que no mueve dinero —leer el padron, generar cuponeras—: un «0.00» ahi seria
   * una cifra, y una cifra dice que se movio algo.
   */
  it('la etapa sin importe sale con guion, y el estado lleva su texto dentro', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(MASIVO);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    const fila = (await screen.findByText('Lectura del padrón')).closest('tr');
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'Lectura del padrón',
      '62 418',
      SIN_DATO,
      '0',
      // El estado del recurso, con su texto dentro y no solo por color.
      'OK',
    ]);

    const cuponeras = (await screen.findByText('Generación de cuponeras')).closest('tr');
    expect(within(cuponeras as HTMLElement).getByText('CON OBSERVACIONES')).toBeInTheDocument();
  });

  /**
   * **La corrida no dibuja banda de sujeto, y es lo correcto.**
   *
   * `CorridaPredialResource` publica el conjunto con el que determino y **no
   * publica ningun sujeto**: el de una corrida masiva no es un registro sino un
   * alcance. Componerlo aqui a partir de `alcance` y `ejercicio` es exactamente
   * lo que `DatosDeDeterminacion.sujeto` existe para impedir —el servidor lo
   * redacta, la interfaz no—, y una banda que dijera «TODOS» encima del padron
   * entero seria vocabulario de enum leido como el nombre de alguien.
   */
  it('sin sujeto en el recurso no hay banda que encabezar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(MASIVO);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));
    await screen.findByText('Lectura del padrón');

    expect(
      screen.queryByLabelText('Sujeto y parámetros de la determinación'),
    ).not.toBeInTheDocument();
  });

  /** Y su cuerpo lleva la misma marca: esta corrida no emite ninguna cuponera. */
  it('el cuerpo de la corrida lleva la marca que no emite nada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(MASIVO);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(pedidas.filter((p) => p.url.startsWith('/rentas/predial/calculo-masivo'))).toHaveLength(
        1,
      ),
    );
    const [peticion] = pedidas.filter((p) => p.url.startsWith('/rentas/predial/calculo-masivo'));
    expect(peticion?.cuerpo).toEqual({ simulacion: true });
  });
});
