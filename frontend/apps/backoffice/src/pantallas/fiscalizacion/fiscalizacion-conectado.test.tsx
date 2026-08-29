import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { escrituraDe } from '../escrituras';
import { impedimentoDelActo } from '../actos';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Fiscalizacion, conectado (#80 y #431): cinco lecturas de ocho, y por que las
 * otras tres se quedan sin conectar. Ver el javadoc de
 * `pantallas/fiscalizacion/index.ts`.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
};

async function esperarFilas(tabla: HTMLElement): Promise<void> {
  await waitFor(() => expect(within(tabla).queryAllByRole('row').length).toBeGreaterThan(1));
}

describe('las cinco lecturas de fiscalizacion estan conectadas', () => {
  it('exactamente estas cinco, ni una mas', () => {
    const deFiscalizacion = OPCIONES_CONECTADAS.filter((opcion) => opcion.startsWith('fisc_'));
    expect(deFiscalizacion.sort()).toEqual(
      ['fisc_programa', 'fisc_omisos', 'fisc_estado_cuenta', 'fisc_historico'].sort(),
    );
    // `resolucion_determinacion_fisc` no lleva el prefijo `fisc_`.
    expect(OPCIONES_CONECTADAS).toContain('resolucion_determinacion_fisc');
    // `fisc_resultados` se queda sin conectar (ver el javadoc de la conexion).
    expect(OPCIONES_CONECTADAS).not.toContain('fisc_resultados');
  });

  /* ── #431: la lectura del programa, que faltaba ───────────────────── */

  it('fisc-programa rellena «Datos del programa» con lo que publica ProgramaResource', async () => {
    montarEnRuta('/fiscalizacion/fisc-programa?nDePrograma=PF-2026-014');
    await dibujada();

    // El vocabulario es el del dominio, no el del desplegable del prototipo:
    // «PREDIAL SELECTIVO» no existe en `TipoDePrograma`.
    await waitFor(() =>
      expect((screen.getByLabelText('Tipo de programa') as HTMLSelectElement).value).toBe(
        'PREDIAL',
      ),
    );
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2026-08-17');
    expect((screen.getByLabelText('Fecha de término') as HTMLInputElement).value).toBe(
      '2026-09-30',
    );
  });

  it('fisc-programa no inventa los cinco atributos que ProgramaResource no publica', async () => {
    montarEnRuta('/fiscalizacion/fisc-programa?nDePrograma=PF-2026-014');
    await dibujada();

    // Sector, criterio de riesgo, fiscalizador y tamano de muestra no existen
    // en `programa_fiscalizacion` (RNF-083); el ejercicio tampoco —un programa
    // guarda fechas, no ejercicio— y por eso «Ejercicio» de la seccion sale
    // igual. Las cuatro primeras tienen rotulo unico en la pantalla.
    await waitFor(() =>
      expect((screen.getByLabelText('Sector') as HTMLSelectElement).value).toBe(SIN_DATO),
    );
    expect((screen.getByLabelText('Criterio de riesgo') as HTMLSelectElement).value).toBe(SIN_DATO);
    expect((screen.getByLabelText('Fiscalizador asignado') as HTMLSelectElement).value).toBe(
      SIN_DATO,
    );
    expect((screen.getByLabelText('Tamaño de muestra') as HTMLInputElement).value).toBe(SIN_DATO);
  });

  /**
   * La grilla «Predios seleccionados» se queda **vacia a proposito**, y esta
   * prueba lo fija: sus seis columnas describen un predio, y
   * `ProgramaResource` describe un programa. Ver el javadoc de la conexion.
   */
  it('fisc-programa no pinta programas bajo columnas que dicen «Predio»', async () => {
    montarEnRuta('/fiscalizacion/fisc-programa?nDePrograma=PF-2026-014');
    await dibujada();
    // Se espera a que la respuesta llegue —el formulario ya la ensena— antes
    // de mirar la tabla: si no, estaria vacia por no haber respondido todavia.
    await waitFor(() =>
      expect((screen.getByLabelText('Tipo de programa') as HTMLSelectElement).value).toBe(
        'PREDIAL',
      ),
    );

    // Ni una fila: `TablaDePantalla` dibuja su aviso de vacio en lugar de la
    // tabla, que es exactamente lo que se quiere — un programa no es un predio.
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryAllByText(/ningún resultado para esta búsqueda/i).length).toBeGreaterThan(0);
  });

  it('fisc-omisos no inventa las cuatro cifras que OmisoResource nunca publica', async () => {
    montarEnRuta('/fiscalizacion/fisc-omisos');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      // Valor catastral, valor declarado, diferencia e impuesto omitido: las
      // cuatro últimas columnas, siempre D-02a.
      expect(celdas.slice(3)).toEqual([SIN_DATO, SIN_DATO, SIN_DATO, SIN_DATO]);
    }
  });

  it('fisc-estado-cuenta exige un contribuyente antes de pedir nada', async () => {
    montarEnRuta('/fiscalizacion/fisc-estado-cuenta');
    await dibujada();
    await waitFor(() =>
      expect(screen.queryAllByText(/busca un contribuyente/i).length).toBeGreaterThan(0),
    );
  });

  it('fisc-estado-cuenta dibuja las lineas de EstadoDeCuentaDeFiscalizacion, sin inventar un total', async () => {
    montarEnRuta('/fiscalizacion/fisc-estado-cuenta?contribuyente=00000093199');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // Ninguna linea tiene importe todavia (no se transfirio, #52): el total
    // sale con SIN_DATO y no con una suma que ninguna linea sustenta.
    await waitFor(() => expect(screen.queryAllByText(SIN_DATO).length).toBeGreaterThan(0));
  });

  it('fisc-historico no inventa quien es el fiscalizado, que ExpedienteResource no publica', async () => {
    montarEnRuta('/fiscalizacion/fisc-historico');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      // «Cód. Cont.» y «Contribuyente»: columnas 2 y 3.
      expect(celdas[1]).toBe(SIN_DATO);
      expect(celdas[2]).toBe(SIN_DATO);
      // «Nº Liquidación» si viaja: LiquidacionResource.numero.
      expect(celdas[3]).not.toBe(SIN_DATO);
    }
  });

  it('resolucion-determinacion-fisc se abre por su numero, con el cuadro sin cifras compuestas', async () => {
    montarEnRuta('/fiscalizacion/resolucion-determinacion-fisc/RD-2026-000418');
    await dibujada();
    await waitFor(() => expect(document.querySelector('.sgtm-hoja')).not.toBeNull());
    const hoja = document.querySelector('.sgtm-hoja') as HTMLElement;
    // «Interés S/» no tiene de donde salir (LineaDeterminadaResource no lo
    // publica): la columna entera sale con SIN_DATO.
    const filas = within(hoja).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[4]).toBe(SIN_DATO);
    }
  });
});

/**
 * Las tres escrituras de fiscalizacion son `ACTOS_SIN_CAMPO`, no
 * `ESCRITURAS` sin declarar: la franja tiene que decir **que falta**, no
 * solo que no se puede guardar todavia.
 */
it('las tres escrituras de fiscalizacion son sin-campo, no sin-declaracion', () => {
  for (const opcion of ['fisc_programa', 'fisc_predial', 'fisc_vehicular']) {
    expect(escrituraDe(opcion)).toBeUndefined();
    const impedimento = impedimentoDelActo(opcion, ['Guardar borrador', 'Guardar']);
    expect(impedimento?.causa).toBe('sin-campo');
  }
});
