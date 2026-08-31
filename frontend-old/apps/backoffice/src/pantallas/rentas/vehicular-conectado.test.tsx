import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import type { DatosDePantalla } from '@sgtm/api-client';
import { montarEnRuta } from '../../pruebas/montar';
import { adaptacionDe } from '../conexiones';
import { SIN_DATO } from '../seguridad/listado';

/**
 * **El calculo vehicular, conectado a su backend** (#399).
 *
 * Su controlador existia desde #32 y **ninguna pantalla podia llamarlo**:
 * `VehicularController` leia `placa`, `codContribuyente` y `ejercicio` del
 * **cuerpo**, y `sgtm-v1.yaml` los declara de **consulta** —son los tres
 * filtros que la pantalla dibuja, y un filtro viaja por la URL en las 134
 * (`bloques/Filtros.tsx`)—. La operacion figuraba en `IMPLEMENTADAS`, el
 * recuento decia que existia, y la peticion que esta interfaz sabe construir
 * llegaba con los tres nulos.
 *
 * Lo que estas pruebas fijan, y por que cada una vale lo que cuesta:
 *
 *   1. **los tres filtros salen por la URL y el cuerpo lleva solo la marca.**
 *      Es el defecto que #399 cerro, medido desde el lado del cliente: si
 *      alguien vuelve a mover los tres al cuerpo, esto se pone rojo antes de
 *      integrar
 *   2. **cuatro columnas de seis, y las otras dos con «—».** «Cuotas» y
 *      «Estado» no las publica el recurso, y las dos tienen a mano una cifra
 *      plausible que seria mentira
 *   3. **la banda dice el conjunto sellado de la respuesta**, que es lo unico
 *      que hace reproducible la cifra (`ARQ-09` §3)
 *   4. **la banda de totales sigue entera en «—».** Sus cuatro etiquetas son de
 *      la proyeccion de tres ejercicios y esta operacion determina uno
 *   5. **una respuesta sin su fecha se rechaza en voz alta** (regla 9)
 */

const VEHICULAR = '/rentas-registro/vehicular-calculo?placa=V1H-882&ejercicio=2026';

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

const delCalculo = () => pedidas.filter((p) => p.url.startsWith('/rentas/vehicular/calculo'));

/** Las filas de la tabla, sin la de cabecera: la que tiene celdas es una fila de datos. */
async function filasDelCuerpo(): Promise<readonly HTMLElement[]> {
  await waitFor(() =>
    expect(
      screen.getAllByRole('row').filter((f) => within(f).queryAllByRole('cell').length > 0),
    ).not.toHaveLength(0),
  );
  return screen.getAllByRole('row').filter((f) => within(f).queryAllByRole('cell').length > 0);
}

describe('el calculo se pide con los filtros en la URL y la marca en el cuerpo', () => {
  /**
   * **El defecto de #399, medido desde el cliente.**
   *
   * Los tres filtros van por la consulta porque es donde el contrato los
   * declara y de donde `Filtros` los manda; el cuerpo lleva **solo**
   * `simulacion: true`, que es lo unico que separa mirar la cuenta de asentar
   * una determinacion. `minimoImponible` **no viaja**: es una cifra normativa y
   * sale del conjunto sellado del ejercicio (regla 5).
   */
  it('placa y ejercicio viajan por la URL; el cuerpo lleva la marca y nada mas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULAR);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() => expect(delCalculo()).toHaveLength(1));
    const [peticion] = delCalculo();
    expect(peticion?.cuerpo).toEqual({ simulacion: true });
    expect(peticion?.url).toContain('placa=V1H-882');
    expect(peticion?.url).toContain('ejercicio=2026');
    expect(JSON.stringify(peticion?.cuerpo)).not.toContain('minimoImponible');
  });

  /**
   * **Abrir la pantalla no lanza ninguna determinacion.** Su operacion es un
   * `POST` y va por `Adaptacion`, no por `Conexion`: quien decide cuando sale es
   * quien atiende, pulsando la accion.
   */
  it('al abrir no sale ninguna peticion de calculo', async () => {
    montarEnRuta(VEHICULAR);

    await screen.findByRole('button', { name: 'Simular' });
    expect(delCalculo()).toEqual([]);
  });
});

describe('la tabla se llena con lo que el recurso publica, y solo con eso', () => {
  /**
   * **Cuatro columnas de seis.**
   *
   * `Ejercicio`, `Base imponible S/` y `Impuesto S/` salen del recurso;
   * `Tasa` es la alicuota del ejercicio, que viaja en el sobre porque es del
   * ejercicio y no del vehiculo, con el `%` que la lee como lo que es.
   *
   * `Cuotas` y `Estado` se quedan en «—», y las dos tienen a mano una cifra
   * plausible: un «4» —el vehicular se paga en cuatro cuotas, art. 35— seria una
   * fraccionacion que esta operacion no calcula, y el estado de la
   * determinacion (`BORRADOR`) no es el estado de cobranza que el prototipo
   * escribe ahi («Cancelado», «Emitido»). Son dos vocabularios en una columna,
   * que es lo que #78 ya rechazo en `infracciones_adm`.
   */
  it('las cuatro que el recurso llena, y las dos que no', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULAR);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    const filas = await filasDelCuerpo();
    expect(
      filas.map((f) =>
        within(f)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ),
    ).toEqual([
      // Cuotas: esta operacion no arma cronograma.
      // Estado: el de cobranza no lo publica el recurso.
      ['2025', '112 800.00', '1.0 %', '1 128.00', SIN_DATO, SIN_DATO],
      ['2026', '112 800.00', '1.0 %', '1 128.00', SIN_DATO, SIN_DATO],
      ['2027', '112 800.00', '1.0 %', '1 128.00', SIN_DATO, SIN_DATO],
    ]);
  });

  /**
   * **La banda de totales sigue entera en «—».**
   *
   * Sus cuatro etiquetas —«Base imponible», «Impuesto anual», «Cuota
   * trimestral», «Total tres ejercicios»— son de la proyeccion de los tres
   * ejercicios afectos que el prototipo dibuja, y esta operacion determina
   * **un** ejercicio por peticion. Sumarlas aqui es lo que RNF-083 prohibe.
   */
  it('los cuatro totales se quedan sin cifra', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULAR);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));
    await filasDelCuerpo();

    for (const etiqueta of [
      'Base imponible',
      'Impuesto anual',
      'Cuota trimestral',
      'Total tres ejercicios',
    ]) {
      const celda = screen.getByText(etiqueta).closest('.sgtm-totales__celda');
      expect(celda?.querySelector('.sgtm-totales__valor')?.textContent).toBe(SIN_DATO);
    }
  });

  /**
   * **La banda toma el conjunto de la respuesta**, no lo que la pantalla podria
   * deducir: dos conjuntos del mismo ejercicio dan dos importes distintos y los
   * dos son correctos (`ARQ-09` §3).
   */
  it('la banda dice con que conjunto sellado se calculo, y desde cuando', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULAR);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    expect(within(banda).getByText('V1H-882')).toBeInTheDocument();
    expect(banda.textContent).toMatch(/Todavía no hay determinación/);

    await usuario.click(screen.getByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(screen.getByText('Parámetros 2026 v1 · sellado')).toBeInTheDocument(),
    );
    // Y la fecha es la del calculo que hizo el servidor, no la del reloj de
    // quien mira (regla 9, RNF-075).
    expect(screen.getByLabelText('Sujeto y parámetros de la determinación').textContent).toContain(
      '13/08/2026',
    );
  });
});

describe('lo que el adaptador rechaza', () => {
  const adaptar = (recurso: unknown): DatosDePantalla => {
    const adaptacion = adaptacionDe('vehicular_calculo');
    expect(adaptacion, 'vehicular_calculo no declara adaptacion').not.toBeUndefined();
    return (adaptacion as NonNullable<typeof adaptacion>).deLaRespuesta(recurso);
  };

  /**
   * **Una determinacion sin fecha no se dibuja a medias.** Es lo unico
   * obligatorio de `DatosDePantalla` y es lo que hace honesta cada cifra que
   * venga detras (regla 9, RNF-075).
   */
  it('una respuesta sin fecha de calculo falla en voz alta', () => {
    expect(() => adaptar({ conjunto: '2026 v1', determinaciones: [] })).toThrow(
      /no vino con su fecha de calculo/,
    );
  });

  /**
   * **La respuesta vacia es legitima y sigue siendo honesta.**
   *
   * Un contribuyente con vehiculos activos pero ninguno afecto en el ejercicio
   * —el plazo de tres anios vencio— recibe cero determinaciones. La fecha viaja
   * igual, y el conjunto va vacio: no se determino nada, asi que no hay
   * conjunto con el que se haya determinado y la banda lo dice en vez de
   * inventarlo.
   */
  it('sin determinaciones no hay conjunto que ensenar, y la fecha sigue estando', () => {
    const datos = adaptar({
      fechaCalculo: '2026-08-29T09:00:00Z',
      conjunto: '',
      alicuota: '',
      determinaciones: [],
    });

    expect(datos.fechaCalculo).toBe('2026-08-29');
    expect(datos.determinacion).toBeUndefined();
    expect(datos.tabla?.filas).toEqual([]);
    expect(datos.tabla?.conteo).toBe('0 ejercicios afectos');
  });

  /**
   * **La alicuota que no llega sale con «—», no con un cero.** Un «0 %» en la
   * columna «Tasa» diria que ese ejercicio no grava, que es una afirmacion.
   */
  it('sin alicuota en el sobre, la columna Tasa sale con el guion', () => {
    const datos = adaptar({
      fechaCalculo: '2026-08-29T09:00:00Z',
      conjunto: '2026 v1',
      determinaciones: [
        { ejercicio: '2026', valorReferencial: '100.00', montoDeterminado: '1.00' },
      ],
    });

    expect(datos.tabla?.filas[0]?.[2]).toEqual({ texto: SIN_DATO });
  });
});
