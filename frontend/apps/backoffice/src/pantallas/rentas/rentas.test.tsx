import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeEscribir, puedeVer } from '../../app/sesion/permisos';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Rentas · Registro (#73): el modulo que mas escribe.
 *
 * Quince opciones, de las cuales **ocho tienen verbo de escritura**. Es donde la
 * observacion obligatoria (#64) deja de ser una regla escrita y se convierte en
 * ocho formularios que no guardan sin ella, asi que aqui se comprueba sobre las
 * ocho a la vez y no una por una.
 *
 * Conectada hay una: el padron de contribuyentes (#11). Las demas esperan a su
 * backend, y los tres calculos esperan ademas a D-02.
 */

/** Las ocho opciones del modulo cuya operacion escribe, por su ranura. */
const LAS_QUE_ESCRIBEN: readonly string[] = [
  'predial-individual',
  'predial-masivo',
  'transferencia-predio',
  'alcabala',
  'vehicular-calculo',
  'transferencia-vehiculo',
  'espectaculos',
  'alta-deuda',
  'baja-deuda',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('ninguna de las escrituras del modulo se envia sin observacion', () => {
  it.each(LAS_QUE_ESCRIBEN)('%s no habilita su accion primaria sin ella', async (ranura) => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta(`/rentas-registro/${ranura}`);

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    // **La ultima accion es la primaria**, como en el prototipo (FRO-03 §5).
    const acciones = document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton');
    const primaria = acciones[acciones.length - 1];
    expect(primaria).toBeDefined();
    if (!primaria) return;

    // Sin observacion, deshabilitada. No es un `placeholder` amable: es la
    // condicion de guardado (regla 10, RNF-052).
    expect(primaria.disabled).toBe(true);

    await usuario.type(within(caja).getByLabelText('Observación'), 'Motivo del acto.');
    await waitFor(() => expect(primaria.disabled).toBe(false));

    montada.unmount();
  });
});

describe('el padron de contribuyentes lee ContribuyenteResource', () => {
  it('el numero va a la columna de su tipo de documento, y lo que no publica sale vacio', async () => {
    montarEnRuta('/rentas-registro/contribuyentes');

    const fila = (await screen.findByText('00000025673')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'A',
      '00000025673',
      'SUC. RUFINA MEDINA MEDINA',
      '03593174',
      // Sin RUC: es una persona natural, no un dato que falte.
      SIN_DATO,
      // Domicilio (#15), predios (catastro) y **deuda** (#22). La deuda es la
      // que mas se mira y la que mas importa no inventar: es la respuesta a
      // «¿cuánto debo?», que es lo que trae a la gente a la ventanilla.
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
    ]);
  });

  it('las catorce restantes siguen sin conectar', () => {
    for (const opcion of [
      'predios_rentas',
      'predial_individual',
      'predial_masivo',
      'declaracion_jurada',
      'arbitrios',
      'transferencia_predio',
      'alcabala',
      'vehiculos',
      'vehicular_calculo',
      'transferencia_vehiculo',
      'espectaculos',
      'beneficios',
      'alta_deuda',
      'baja_deuda',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
    expect(OPCIONES_CONECTADAS).toContain('contribuyentes');
  });
});

/* ── SoD-2: quien cobra no da de baja lo que cobra ─────────────────────── */

describe('un cajero no ve el alta ni la baja de deuda', () => {
  /** Los permisos de un cajero, tal como los describe REQ-03 §3: caja, y nada mas. */
  const CAJERO = permisosDelClaim({
    caja_tributaria: ['ejecucion', 'lectura', 'registro'],
    caja_tasas: ['ejecucion', 'lectura', 'registro'],
    duplicado_recibo: ['ejecucion', 'lectura', 'impresion'],
    contribuyentes: ['lectura'],
  });

  it('no las ve, y tampoco las ve el que solo tiene lectura del padron', () => {
    // **SoD-2** (REQ-03 §4): quien cobra no puede dar de baja lo que cobra. La
    // interfaz lo refleja no dibujando la opcion; el servidor lo impide de
    // verdad, y las dos cosas hacen falta —esta solo es la comodidad—.
    expect(puedeVer(CAJERO, 'alta_deuda')).toBe(false);
    expect(puedeVer(CAJERO, 'baja_deuda')).toBe(false);
    // Lo que si atiende, lo atiende.
    expect(puedeVer(CAJERO, 'caja_tributaria')).toBe(true);
    // Y el padron lo consulta sin poder tocarlo.
    expect(puedeVer(CAJERO, 'contribuyentes')).toBe(true);
    expect(puedeEscribir(CAJERO, 'contribuyentes')).toBe(false);
  });
});
