import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';

/**
 * Transito (#77): el modulo mas grande del menu, y **trece reportes**.
 *
 * La tentacion de este modulo es escribir trece pantallas de reporte. Lo que
 * hay es **un** bloque de hoja parametrizado al que se le conectan trece
 * operaciones, y eso no es una preferencia de estilo: trece copias divergen a
 * la primera correccion, y la hoja que sale de la municipalidad con firma no
 * puede depender de cual de las trece se toco por ultima vez (RNF-081,
 * RNF-084).
 *
 * De sus veintitres endpoints solo `papeletas` existe (#46), conectada desde
 * #363 —ver `pantallas/transito/index.ts`—. Lo que se comprueba aqui es lo
 * que la interfaz ya tiene que garantizar en las demas: que las hojas son la
 * misma hoja y que la interfaz no se imprime; y para `papeletas`, ya
 * conectada, que lee `PapeletaResource` tal cual y no lo que el proxy
 * simulaba antes de #363.
 */

/** Las seis pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = [
  'transito-record-conductor',
  'transito-record-vehicular',
  'transito-constancia-libre',
  'transito-papeleta-reporte',
  'transito-rg-ordinaria',
  'transito-rg-sancionadora',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('las trece hojas son la misma hoja', () => {
  it.each(HOJAS)('%s se dibuja con el bloque de hoja compartido', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    const hoja = document.querySelector('[data-hoja="1"]');
    expect(hoja).not.toBeNull();

    // Las dos lineas de firma son lo que convierte la hoja en un documento, y
    // las trae el bloque: si una pantalla tuviera su propia copia, podria
    // perderlas sin que nadie se enterara.
    const firmas = hoja?.querySelector('.sgtm-hoja__firmas');
    expect(firmas?.textContent).toContain('Contribuyente');

    montada.unmount();
  });

  it.each(HOJAS)('%s no imprime la barra de acciones', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    // Lo que no es la hoja va marcado, y la regla de impresion lo esconde. Sin
    // la marca, el papel que sale de la municipalidad lleva botones dibujados.
    const botones = document.querySelector('.sgtm-hoja__botones');
    expect(botones).not.toBeNull();
    expect(botones?.getAttribute('data-no-imprimible')).toBe('1');

    montada.unmount();
  });
});

describe('papeletas lee PapeletaResource, conectada desde #363', () => {
  it('es la unica leida por una Conexion propia', () => {
    expect(OPCIONES_CONECTADAS).toContain('papeletas');
    // Las demas del modulo siguen sin conectar: ninguna tiene `Controller`
    // salvo `papeletas` (#46).
    expect(OPCIONES_CONECTADAS).not.toContain('transito_busqueda');
    expect(OPCIONES_CONECTADAS).not.toContain('codigos_transito');
  });

  it('cada fila es una papeleta, y lo que PapeletaResource no publica sale vacio', async () => {
    montarEnRuta('/transito/papeletas');
    // Se espera a una **fila con datos**, no a que exista la tabla: la tabla
    // existe desde el catalogo, con su esqueleto, y esperar a ella dejaria la
    // comprobacion mirando celdas vacias (#76).
    const fila = (await screen.findByText('MPS-2026-041182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'MPS-2026-041182',
      // La fecha de infraccion, tal como la publica el recurso (LocalDate ISO),
      // no el «02/08/2026» del catalogo del prototipo.
      '2026-08-02',
      'T2G-418',
      // Infractor, Codigo y Gravedad: PapeletaResource no los publica (ver
      // pantallas/transito/index.ts).
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      // El importe se determino el dia de la infraccion con los parametros de
      // ese dia (`importeAPagar`, «tal cual del acta fisica»): no se recalcula
      // ni se reformatea con separador de miles, que es como lo sirve el
      // backend de verdad.
      '535.00',
      // El estado es el nombre literal de EstadoDePapeleta, no la etiqueta del
      // prototipo: «Pendiente» no es ningun valor del enum (ver el mock).
      'IMPUESTA',
    ]);
  });

  it('el «Estado» nunca es una etiqueta que EstadoDePapeleta no reconoce', async () => {
    montarEnRuta('/transito/papeletas');

    const tabla = await screen.findByRole('table');
    const dentroDeLaTabla = within(tabla);

    // Las cuatro filas del mock, con su estado ya en el vocabulario del
    // backend: «Pendiente» y «Con descargo» —que no son valores del enum—
    // colapsan en `IMPUESTA`/`RESUELTA`.
    for (const invalido of ['Pendiente', 'Con descargo', 'Pagada', 'Coactiva']) {
      expect(dentroDeLaTabla.queryByText(invalido)).not.toBeInTheDocument();
    }
    expect(dentroDeLaTabla.getByText('IMPUESTA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('RESUELTA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('PAGADA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('COACTIVA')).toBeInTheDocument();
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no una tabla vacia', () => {
    // La forma que el proxy servia antes de #363 —`DatosDePantalla`, con
    // `tabla.filas` y sin `contenido`— es exactamente la que tiene que fallar
    // aqui, y no dibujarse como una tabla vacia en silencio (issue #363).
    expect(() =>
      leerPaginado(
        { fechaCalculo: '2026-08-13', tabla: { filas: [] } },
        'las papeletas de tránsito',
      ),
    ).toThrow(/no trae un listado paginado/);
    expect(
      leerPaginado({ contenido: [], totalElementos: 0 }, 'las papeletas de tránsito').contenido,
    ).toEqual([]);
  });
});

describe('el cambio de numero es la unica correccion permitida', () => {
  /**
   * Decia «exige observacion, como cualquier otra escritura», y con la
   * observacion escrita la primaria se habilitaba. Desde #332 no: la opcion no
   * declara su escritura en `escrituras.ts`, asi que lo unico que podia mandar
   * era la observacion sola —corregir el numero de una papeleta mandando un
   * texto y ningun numero—. Ahora la accion se queda apagada y dice por que.
   *
   * Que la observacion es la condicion de guardado de las que **si** escriben
   * sigue comprobandose, en `pantallas/escritura.test.tsx`.
   */
  it('no promete la correccion mientras no pueda mandarla', async () => {
    montarEnRuta('/transito/transito-cambio-numero');
    await dibujada('.sgtm-acciones');

    primariaApagada();

    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();
    expect(motivoDeLaPrimaria()).toMatch(/todavía no guarda/i);
  });
});
