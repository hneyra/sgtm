import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { censoDeConectadas } from '../aportes-de-modulo';
import { impedimentoDelActo } from '../actos';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

/**
 * Autorizaciones y licencias, conectado (#79): siete lecturas de once, y por qué las cuatro
 * escrituras se quedan sin conectar. Ver el javadoc de `pantallas/licencias/index.ts`.
 */

const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
};

const esperarFilas = async (tabla: HTMLElement): Promise<void> => {
  await waitFor(() => expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(1));
};

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('las siete lecturas de licencias están conectadas', () => {
  it('exactamente estas siete, ni una más', () => {
    const deLicencias = [
      'anuncios',
      'licencia_funcionamiento',
      'licencia_resumen_anual',
      'fue_edificacion',
      'edificacion_reporte',
      'ciiu',
      'certificados',
    ];
    for (const id of deLicencias) expect(OPCIONES_CONECTADAS).toContain(id);
    // Las cuatro escrituras del issue no están: ni como conexión de lectura
    // (no tienen `GET` propio, o el que tienen consume un correlativo) ni,
    // para `anuncios_reportes`/`licencia_padron`, como escritura declarada.
    for (const id of [
      'anuncios_reportes',
      'licencia_padron',
      'licencia_resolucion_cancelacion',
      'licencia_resolucion_duplicado',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(id);
    }
  });

  it('anuncios dibuja el D.N.I. que publica AnuncioResource, y R.U.C. sale con SIN_DATO', async () => {
    montarEnRuta('/autorizaciones-y-licencias/anuncios');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    // `AnuncioResource` solo publica un documento por titular: la columna
    // «R.U.C.» (la sexta) sale siempre con SIN_DATO, nunca inventada.
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[5]).toBe(SIN_DATO);
    }
    expect(tabla.textContent).toMatch(/\d{8}/);
  });

  it('licencia-funcionamiento dibuja el estado derivado (VIGENTE/VENCIDA/CANCELADA), no el del prototipo', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-funcionamiento');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const insignias = within(tabla).getAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    expect(insignias.every((i) => (i.textContent ?? '').trim() !== '')).toBe(true);
  });

  it('licencia-resumen-anual lee su sobre sin paginación ({ aLaFecha, filas }), no RespuestaPaginada', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-resumen-anual');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // Los millares del prototipo («4,182») llegan sin la coma: el mock los
    // limpia como si vinieran de `count(*)` (#342).
    expect(tabla.textContent).not.toMatch(/\d,\d{3},\d{3}/);
  });

  it('fue-edificacion dibuja las seis columnas que declara FueResource, sin «Est.»', async () => {
    montarEnRuta('/autorizaciones-y-licencias/fue-edificacion');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((c) => (c.textContent ?? '').trim());
    expect(cabeceras).toHaveLength(6);
  });

  it('edificacion-reporte no inventa el valor de obra que ValorizacionDeObra no pudo calcular', async () => {
    montarEnRuta('/autorizaciones-y-licencias/edificacion-reporte');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // Ninguna celda de «Valor de obra S/» es un cero fabricado: o trae el
    // importe real del mock, o SIN_DATO.
    const filas = within(tabla).getAllByRole('row').slice(1);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[7]).not.toBe('0.00');
    }
  });

  it('ciiu es un buscador contra el servidor: el filtro «Descripción» es texto, no un desplegable', async () => {
    montarEnRuta('/autorizaciones-y-licencias/ciiu');
    await dibujada();
    const filtro = await screen.findByLabelText('Descripción');
    expect(filtro.tagName).toBe('INPUT');
    expect(filtro).not.toHaveAttribute('list');
  });

  it('certificados conecta certificados_listado (GET), no certificados (POST)', async () => {
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    expect(tabla.textContent).toMatch(/CN-|CZ-|CP-/);
  });

  it('certificados no declara escritura: «Imprimir certificado» es DE_SALIDA y nunca llega a nDeRecibo', async () => {
    // `impedimentoDelActo` reconoce «Imprimir certificado» como una accion de
    // salida (DE_SALIDA, `pantallas/actos.ts`) antes de mirar ACTOS_SIN_CAMPO,
    // así que no hay franja que explicar — pero tampoco hay escritura
    // declarada, así que el botón se queda disabled y no dispara el POST.
    const impedimento = impedimentoDelActo('certificados', ['Emitir', 'Imprimir certificado']);
    expect(impedimento).toBeUndefined();

    montarEnRuta('/autorizaciones-y-licencias/certificados');
    await dibujada();
    const primaria = await screen.findByRole('button', { name: 'Imprimir certificado' });
    expect(primaria).toBeDisabled();
    expect(primaria).not.toHaveAttribute('aria-disabled');
  });

  it('anuncios_reportes y licencia_padron no declaran escritura: su primaria («Cancelar») no dispara el POST', () => {
    const anuncios = impedimentoDelActo('anuncios_reportes', [
      'Exportar',
      'Imprimir',
      'Pantalla',
      'Cancelar',
    ]);
    const padron = impedimentoDelActo('licencia_padron', [
      'Exportar',
      'Imprimir',
      'Pantalla',
      'Cancelar',
    ]);
    expect(anuncios?.causa).toBe('sin-declaracion');
    expect(padron?.causa).toBe('sin-declaracion');
  });
});
