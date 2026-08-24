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
 * CLAUDE.md se ve o no se ve. Seis de las once ya tienen backend y estan
 * conectadas —`cuenta_corriente` (#21), `consulta_deuda` (#22, #175),
 * `constancia` (#25, #179), `consulta_vehiculos` (#25, #184),
 * `consulta_altas_bajas` (#24) y `consulta_pagos` (#25, #219)—; las otras
 * cinco esperan al resto de #25. Lo que **no** espera a nadie es la
 * propiedad que da sentido al modulo, y es lo que se verifica aqui sobre las
 * once a la vez.
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

  it('las cinco restantes siguen sin conectar: esperan el resto de #25', () => {
    for (const opcion of [
      'consulta_unificada',
      'consulta_resumen_predial',
      'consulta_deudas_beneficio',
      'consulta_predios',
      'consulta_valores',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
    for (const opcion of [
      'cuenta_corriente',
      'consulta_deuda',
      'constancia',
      'consulta_vehiculos',
      'consulta_altas_bajas',
      'consulta_pagos',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });
});

describe('consulta_deuda lee ObligacionConDeudaResource', () => {
  it('la fase del prototipo se traduce al enum del backend, y «Todas» no filtra', async () => {
    montarEnRuta('/consultas/consulta-deuda?fase=Valor%20emitido');

    // El mock no filtra de verdad (ADR-0010): lo que importa aqui es que la
    // peticion no truena por mandar «VALOR EMITIDO» donde el enum espera
    // «VALOR» (Fase.valueOf lanzaria). Si la pantalla se dibuja, no trono.
    // Con `findAllBy`: el tributo se repite en mas de una fila del mock.
    expect(await screen.findAllByText('IMPUESTO PREDIAL')).not.toHaveLength(0);
  });

  it('los cuatro totales no se componen: RNF-083', async () => {
    montarEnRuta('/consultas/consulta-deuda');

    await screen.findByText(/Cifras actualizadas al/);
    const total = screen.getByText('Deuda total');
    expect(total.closest('.sgtm-totales__celda')?.textContent).toContain(SIN_DATO);
  });
});

describe('constancia se niega o se emite, y lo dice antes que la tabla', () => {
  it('la hoja trae el resultado en su meta y las filas con su tributo', async () => {
    montarEnRuta('/consultas/constancia/00000025673');

    expect(await screen.findByText('Impuesto predial')).toBeInTheDocument();
    expect(screen.getByText(/SE EMITE|SE NIEGA/)).toBeInTheDocument();
  });
});

describe('consulta_vehiculos lee VehiculoEncontradoResource', () => {
  it('la deuda de la fila viene del recurso, no de sumar nada en la interfaz', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    expect(await screen.findByText('T2G-418')).toBeInTheDocument();
    await screen.findByText(/Cifras actualizadas al/);
  });

  it('«Base imponible» sale vacia: el recurso no manda ese campo (D-02)', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('T2G-418')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Placa, Clase, Marca y modelo, Año fab., Titular, Afectación, Base imponible, Deuda.
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });

  it('«Afectación» es el rango que manda el recurso, no una palabra inventada', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    // El mock lee «2019 — 2021» del prototipo y lo parte en afectoDesde/afectoHasta:
    // si la pantalla lo vuelve a juntar igual, el recurso real —dos enteros— tambien se lee bien.
    expect(await screen.findByText('2019 — 2021')).toBeInTheDocument();
  });
});

describe('consulta_altas_bajas lee AsientoResource, la misma forma que cuenta_corriente', () => {
  it('«A/B» sale del tipo del asiento: CARGO es alta, ABONO es baja', async () => {
    montarEnRuta('/consultas/consulta-altas-bajas');

    await screen.findByText(/Cifras actualizadas al/);
    expect(screen.getAllByText('ALTA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BAJA').length).toBeGreaterThan(0);
  });

  it('cuatro columnas de expediente salen vacias: el asiento no las trae', async () => {
    montarEnRuta('/consultas/consulta-altas-bajas');

    const tabla = await screen.findByRole('table');
    const filas = await within(tabla).findAllByRole('row');
    // La primera fila es la cabecera; la primera de datos alcanza para probarlo.
    const primeraDeDatos = filas[1];
    expect(primeraDeDatos).toBeDefined();
    if (!primeraDeDatos) return;
    const celdas = within(primeraDeDatos).getAllByRole('cell');
    // Num. Docum., A/B, A/M, Cod. Municipal, Doc. Aprob., Fec. Doc. Aprob., Fecha Reg., Est.
    expect(celdas[0]?.textContent).toBe(SIN_DATO);
    expect(celdas[2]?.textContent).toBe(SIN_DATO);
    expect(celdas[3]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
  });
});

describe('consulta_pagos lee AsientoResource, la misma forma que consulta_altas_bajas', () => {
  it('el recibo y el importe salen del asiento, con su fecha', async () => {
    montarEnRuta('/consultas/consulta-pagos');

    await screen.findByText(/Cifras actualizadas al/);
    expect(await screen.findByText('0003-0041182')).toBeInTheDocument();
  });

  it('«Medio» y «Caja» salen vacias: el asiento no las trae todavia', async () => {
    montarEnRuta('/consultas/consulta-pagos');

    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('0003-0041182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Fecha, Recibo, Concepto, Año, Medio, Caja, Importe S/.
    expect(celdas[4]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
  });
});
