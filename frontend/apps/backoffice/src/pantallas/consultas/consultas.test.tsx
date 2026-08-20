import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import * as dominio from '@sgtm/dominio';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Consultas (#72): **ninguna cifra sin su fecha**.
 *
 * Es el modulo que mas usa quien atiende en ventanilla, y donde la regla 9 de
 * CLAUDE.md se ve o no se ve. Las otras diez opciones esperan a #22, #24 y #25;
 * lo que **no** espera a nadie es la propiedad que da sentido al modulo, y es lo
 * que se verifica aqui sobre las once a la vez.
 */

/** Las once opciones del modulo, por su ranura. Si el catalogo cambia, cambia esto. */
const LAS_ONCE: readonly string[] = [
  'cuenta-corriente/00000025673',
  'consulta-deuda',
  'consulta-unificada/00000025673',
  'consulta-resumen-predial',
  'consulta-altas-bajas',
  'consulta-deudas-beneficio',
  'consulta-pagos',
  'consulta-predios',
  'consulta-vehiculos',
  'consulta-valores',
  'constancia',
];

/**
 * Una cifra de dinero, como se ve en pantalla.
 *
 * `1,842.60`, `S/ 18.42 M`, `-26.40`. No pretende ser exhaustiva: pretende
 * reconocer lo que quien atiende lee como un importe.
 */
const DINERO = /^(S\/\s*)?-?\d{1,3}(,\d{3})*\.\d{2}$/;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const cifrasEnPantalla = (): string[] =>
  [...document.querySelectorAll('td, .sgtm-totales__valor, .sgtm-campo__control')]
    .map((nodo) => (nodo.textContent ?? '').trim())
    .filter((texto) => DINERO.test(texto));

describe('ninguna de las once pantallas muestra un importe sin su fecha', () => {
  it.each(LAS_ONCE)('%s dice a que fecha estan sus cifras', async (ranura) => {
    const montada = montarEnRuta(`/consultas/${ranura}`);
    await screen.findByRole('heading', { level: 1 });

    // Se espera a que la pantalla tenga datos: antes de la respuesta no hay
    // cifras que fechar, y la prueba pasaria sin comprobar nada.
    await waitFor(() => expect(cifrasEnPantalla().length + fechas().length).toBeGreaterThan(0));

    if (cifrasEnPantalla().length > 0) {
      // La fecha es de la respuesta, no del bloque de totales: siete de estas
      // once ensenan cifras en una tabla y no tienen banda de totales.
      expect(fechas().length).toBeGreaterThan(0);
    }
    montada.unmount();
  });
});

const fechas = (): HTMLElement[] => screen.queryAllByText(/Cifras actualizadas al/);

describe('la interfaz no suma nada', () => {
  it('`@sgtm/dominio` no exporta ninguna funcion de sumar, y es intencional', () => {
    // Los totales llegan calculados (RNF-083). La ausencia de una funcion de
    // sumar **es** la medida: mientras no exista, no hay forma comoda de
    // componer una cifra que el backend no pueda sustentar.
    const suma = /sum|total|acumul|agrega/i;
    const culpables = Object.keys(dominio).filter((nombre) => suma.test(nombre));
    expect(culpables).toEqual([]);
  });

  it('el saldo del estado de cuenta sale vacio, no restado', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    // El asiento publica un monto y un tipo; «emitido» y «pagado» son la misma
    // cifra en la columna que le toca, y el saldo es el proyectado (#23).
    // Restarlo aqui produciria una cifra que el backend no puede sustentar.
    // Dentro de la tabla: «IMPUESTO PREDIAL» tambien es una opcion del filtro.
    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findAllByText('IMPUESTO PREDIAL'))[0]?.closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });

  it('y los cuatro totales tambien, mientras el saldo proyectado no exista', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    // La banda existe desde el principio con su esqueleto: hay que esperar a que
    // llegue la respuesta, o la prueba mediria el hueco en vez de la cifra.
    await screen.findByText(/Cifras actualizadas al/);
    const saldo = screen.getByText('Saldo total');
    expect(saldo.closest('.sgtm-totales__celda')?.textContent).toContain(SIN_DATO);
  });
});

describe('el estado de cuenta es el libro, y se ve como tal', () => {
  it('lee los asientos del backend, con su monto y su fecha', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    expect(await screen.findByText(/Cifras actualizadas al/)).toBeInTheDocument();
    // Un asiento por movimiento: el cargo y el abono de una cuota son dos.
    expect(await screen.findAllByText('147.98')).toHaveLength(2);
  });

  it('ninguna accion de la pantalla modifica un asiento', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');
    await screen.findByRole('heading', { level: 1 });

    // El catalogo declara «Excel» e «Imprimir estado de cuenta», y ninguna
    // escribe. Si un dia apareciera una que si, esta prueba lo dice: el libro no
    // se edita, se reversa (regla 4).
    const acciones = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(acciones.some((texto) => /modificar|editar|anular|corregir/i.test(texto))).toBe(false);
  });

  it('las diez restantes siguen sin conectar: su backend es #22, #24 y #25', () => {
    for (const opcion of [
      'consulta_deuda',
      'consulta_unificada',
      'consulta_resumen_predial',
      'consulta_altas_bajas',
      'consulta_deudas_beneficio',
      'consulta_pagos',
      'consulta_predios',
      'consulta_vehiculos',
      'consulta_valores',
      'constancia',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
    expect(OPCIONES_CONECTADAS).toContain('cuenta_corriente');
  });
});
