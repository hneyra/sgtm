import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { agruparMiles } from '@sgtm/dominio';
import type { DatosDeTabla } from '@sgtm/api-client';
import type { EstructuraDeTabla } from '../../catalogo';
import { TablaDePantalla } from './TablaDePantalla';

/**
 * Separador de millares en las celdas numericas, al dibujar (#342, nit 6).
 *
 * #337 dejo visible el hueco al alinear el proxy con toPlainString: una celda
 * numerica de cinco cifras salia «1848.66», sin ningun separador, porque
 * TablaDePantalla dibuja celda.texto tal cual. El defecto no era del dato
 * -el backend nunca manda separadores (new BigDecimal("1,184.00") lanza,
 * documentado en DatosDeTabla.valores)- sino de que nada lo agrupaba al
 * dibujarlo.
 *
 * agruparMiles vive en @sgtm/dominio y no se prueba dos veces aqui: lo que
 * se comprueba en este archivo es que TablaDePantalla la aplica a las
 * columnas num, y solo a ellas. Los valores esperados se calculan con el
 * propio formateador -en vez de escribirlos a mano- para no depender de
 * teclear a mano el caracter exacto del separador.
 */

const ESTRUCTURA: EstructuraDeTabla = {
  title: 'Deuda seleccionable para baja',
  cols: ['Ano', 'Area m2', 'Insoluto S/'],
  claves: ['ano', 'area', 'insolutoS'],
  // Indice 2 (Insoluto): numerico. Los otros dos, no.
  num: [2],
};

describe('las celdas numericas llevan separador de millares al dibujarse', () => {
  it('agrupa la celda de una columna num, y no toca las demas', () => {
    const datos: DatosDeTabla = {
      filas: [[{ texto: '2026' }, { texto: 'AVENIDA' }, { texto: '1848.66' }]],
    };
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={datos} cargando={false} />);

    const fila = screen.getByText('2026').closest('tr') as HTMLElement;
    const celdas = within(fila).getAllByRole('cell');
    // Ni la columna del ano ni un texto libre se agrupan: no son num.
    expect(celdas[0]?.textContent).toBe('2026');
    expect(celdas[1]?.textContent).toBe('AVENIDA');
    expect(celdas[2]?.textContent).toBe(agruparMiles('1848.66'));
    expect(celdas[2]?.textContent).not.toBe('1848.66');
  });

  it('una cifra de tres digitos o menos, en columna num, sale igual: no hay millar', () => {
    const datos: DatosDeTabla = {
      filas: [[{ texto: '2025' }, { texto: 'JIRON' }, { texto: '84.78' }]],
    };
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={datos} cargando={false} />);

    const fila = screen.getByText('2025').closest('tr') as HTMLElement;
    expect(within(fila).getAllByRole('cell')[2]?.textContent).toBe('84.78');
  });

  /**
   * La columna num no siempre es dinero, y agrupar sus millares no le
   * antepone «S/» ni le inventa dos decimales: sigue siendo lo que el backend
   * mando, con sus separadores. Ver el docblock de agruparMiles.
   */
  it('agrupa tambien lo que no es dinero, sin fingir que lo es', () => {
    const datos: DatosDeTabla = {
      filas: [[{ texto: '2026' }, { texto: 'JIRON' }, { texto: '12500.5' }]],
    };
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={datos} cargando={false} />);

    const fila = screen.getByText('2026').closest('tr') as HTMLElement;
    const celda = within(fila).getAllByRole('cell')[2];
    expect(celda?.textContent).toBe(agruparMiles('12500.5'));
    // Sin «S/»: una columna num puede ser un area, y esto no lo sabe.
    expect(celda?.textContent).not.toContain('S/');
  });

  it('lo que no es un numero simple -un guion, un porcentaje- pasa sin tocar', () => {
    const datos: DatosDeTabla = {
      filas: [
        [{ texto: '2026' }, { texto: 'JIRON' }, { texto: '—' }],
        [{ texto: '2025' }, { texto: 'CALLE' }, { texto: '50.00%' }],
      ],
    };
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={datos} cargando={false} />);

    const filaUno = screen.getByText('2026').closest('tr') as HTMLElement;
    expect(within(filaUno).getAllByRole('cell')[2]?.textContent).toBe('—');
    const filaDos = screen.getByText('2025').closest('tr') as HTMLElement;
    expect(within(filaDos).getAllByRole('cell')[2]?.textContent).toBe('50.00%');
  });

  /**
   * Y con tono, sale como insignia y sin agrupar (#342, nit 6): una celda con
   * tono es un estado -«VIGENTE», «ANULADA»-, nunca una cantidad, aunque la
   * columna este marcada num.
   */
  it('una celda con tono se pinta como insignia, sin pasar por agruparMiles', () => {
    const datos: DatosDeTabla = {
      filas: [[{ texto: '2026' }, { texto: 'JIRON' }, { texto: '1200', tono: 'ok' }]],
    };
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={datos} cargando={false} />);

    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.queryByText(agruparMiles('1200'))).not.toBeInTheDocument();
  });
});
