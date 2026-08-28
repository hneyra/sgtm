import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { escrituraDe } from '../escrituras';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Coactiva, conectado (#76): las cuatro lecturas de doce, y por que las ocho
 * escrituras se quedan sin conectar. Ver el javadoc de `pantallas/coactiva/index.ts`.
 */

const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());
};

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('las cuatro lecturas de coactiva estan conectadas', () => {
  it('exactamente estas cuatro, ni una mas', () => {
    const deCoactiva = OPCIONES_CONECTADAS.filter((opcion) => opcion.startsWith('coactiva_'));
    expect(deCoactiva.sort()).toEqual(
      ['coactiva_consulta_deudas', 'coactiva_deudas_beneficio', 'coactiva_expedientes'].sort(),
    );
    // `proceso_coactivo` no lleva el prefijo `coactiva_` en su id de catalogo.
    expect(OPCIONES_CONECTADAS).toContain('proceso_coactivo');
  });

  it('coactiva-expedientes dibuja el codigo del contribuyente que publica ExpedienteResource, y el estado con su texto', async () => {
    montarEnRuta('/coactiva/coactiva-expedientes');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    // La columna «Contribuyente» es un codigo (`C-COACT-…`), no la razon
    // social: `ExpedienteResource` no publica el nombre (ver el javadoc de la
    // conexion). Que no aparezca ningun apellido en mayusculas del prototipo
    // demuestra que la tabla ya no lee el mock generico.
    expect(tabla.textContent).toMatch(/C-COACT-\d{4}/);
    // «Medida cautelar» sale con SIN_DATO en las cuatro filas: el recurso no
    // la publica en esta grilla.
    const insignias = within(tabla).getAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    expect(insignias.every((i) => (i.textContent ?? '').trim() !== '')).toBe(true);
  });

  it('proceso-coactivo dibuja los campos de ExpedienteResource, con su fecha de deuda', async () => {
    montarEnRuta('/coactiva/proceso-coactivo/EC-2026-00412');
    await dibujada();
    // `deudaAlDia` es la fecha a la que estan las cinco cifras de deuda
    // (regla 9): tiene que verse en algun sitio de la pantalla.
    await waitFor(() =>
      expect(screen.queryAllByText(/Cifras actualizadas al/).length).toBeGreaterThan(0),
    );
  });

  it('coactiva-consulta-deudas dibuja el nombre del contribuyente, que si publica DeudaCoactivaResource', async () => {
    montarEnRuta('/coactiva/coactiva-consulta-deudas');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    expect(tabla.textContent).toMatch(/[A-ZÁÉÍÓÚÑ]{3,}/);
  });

  it('coactiva-deudas-beneficio no inventa el desglose que DeudaCoactivaResource no publica', async () => {
    montarEnRuta('/coactiva/coactiva-deudas-beneficio');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // «Insoluto S/», «Interés S/» y «Con beneficio S/» —columnas 4, 5 y 8—
    // salen con SIN_DATO en cada fila: el recurso solo publica el total, y
    // «con beneficio» esta fuera de proposito (D-02b, #191).
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[3]).toBe(SIN_DATO);
      expect(celdas[4]).toBe(SIN_DATO);
      expect(celdas[7]).toBe(SIN_DATO);
    }
  });
});

/**
 * Ninguna de las ocho escrituras de coactiva esta declarada todavia (#76).
 *
 * Es la guarda que protege el hallazgo central de este issue: conectarlas
 * habilitaria, en seis de las ocho, el boton equivocado como primaria —«la
 * ultima accion es la primaria» (FRO-03 §5), y en esas seis la ultima no es
 * la que guarda—. Ver el javadoc de `pantallas/coactiva/index.ts` para las
 * ocho, una por una.
 */
it('ninguna de las ocho escrituras de coactiva esta declarada', () => {
  const LAS_OCHO = [
    'importacion_valores',
    'rec_impresion',
    'expediente_historial',
    'cambiar_direccion_ref',
    'costas_procesales',
    'fraccionamiento_coactivo',
    'actos_coactivos',
    'notificaciones_coactivas',
  ];
  for (const opcion of LAS_OCHO) {
    expect(escrituraDe(opcion)).toBeUndefined();
  }
});

async function esperarFilas(tabla: HTMLElement): Promise<void> {
  await waitFor(() => expect(within(tabla).queryAllByRole('row').length).toBeGreaterThan(1));
}
