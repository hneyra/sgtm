import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { elBloque } from '../../pruebas/nodos';
import { MemoriaDeCalculo } from '../bloques/MemoriaDeCalculo';
import { composicionDe, memoriaDeSeccion } from '../composicion';

/**
 * **Las cinco determinaciones tienen una sola forma** (#393).
 *
 * `predial_individual`, `predial_masivo`, `arbitrios`, `vehicular_calculo` y
 * `alcabala` hacen todas lo mismo —fijar un sujeto, ensenar como sale la cifra,
 * escribir— y se dibujaban distinto: una con tabla y tres secciones, otra con
 * parametros y una corrida, otra con solo una tabla. Lo que se uniforma es el
 * **sitio y el papel** de cada una de las tres partes; ninguna etiqueta se
 * reescribe y ninguna seccion se reordena (RNF-080).
 *
 * Lo que estas pruebas fijan:
 *
 *   1. la banda de sujeto se dibuja **en cuanto hay sujeto**, y no antes
 *   2. dice el conjunto sellado cuando la respuesta lo trae, y **dice que
 *      falta** cuando no: es la mitad que hace reproducible una cifra
 *      (`ARQ-09` §3), y callarla dejaria la banda afirmando de mas
 *   3. la memoria del calculo parte la operacion de su resultado sin componer
 *      ninguna cifra (RNF-083)
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const ARBITRIOS = '/rentas-registro/arbitrios';
const PREDIAL = '/rentas-registro/predial-individual';

describe('la banda de sujeto abre las cinco determinaciones', () => {
  it('sin sujeto no se dibuja: una banda de cuatro guiones no encabeza nada', async () => {
    montarEnRuta(PREDIAL);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    expect(
      screen.queryByLabelText('Sujeto y parámetros de la determinación'),
    ).not.toBeInTheDocument();
  });

  it('con el contribuyente tecleado, dice de quien es la determinacion y de que ano', async () => {
    montarEnRuta(`${PREDIAL}?codContribuyente=00000025673&ano=2026`);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    expect(within(banda).getByText('00000025673')).toBeInTheDocument();
    expect(banda.textContent).toContain('Contribuyente · ejercicio 2026');
  });

  /**
   * **La mitad que falta, dicha.** La otra cosa que hace reproducible una cifra
   * es el conjunto de parametros sellado con que se calculo, y **hoy ninguna
   * operacion del contrato lo publica**. La banda lo dice en vez de callarlo.
   *
   * Y no se arregla simulandolo en el proxy, que fue lo primero que se intento:
   * cuatro de las cinco pantallas tienen un `POST` por operacion y no piden nada
   * al abrir —abrir una pantalla no puede lanzar una determinacion—, asi que no
   * hay peticion que contestar; y la quinta, «Arbitrios», ya la sirve el proxy
   * con la forma del `Resource` que el backend publica de verdad, donde anadir
   * un campo inventado seria decir que el contrato lo tiene.
   */
  it('dice que el conjunto de parametros lo dira el servidor, en vez de callarlo', async () => {
    montarEnRuta(`${PREDIAL}?codContribuyente=00000025673&ano=2026`);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    expect(banda.textContent).toMatch(/conjunto de parámetros se determina lo dirá el servidor/);
  });

  /** Y la banda es la misma en las cinco: lo que cambia es por quien pregunta. */
  it('en arbitrios el sujeto es el predio, y en el vehicular la placa', async () => {
    montarEnRuta(`${ARBITRIOS}?codigoPredial=02-014-D-14-01&ejercicio=2026`);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    expect(within(banda).getByText('02-014-D-14-01')).toBeInTheDocument();
    expect(banda.textContent).toContain('Predio · ejercicio 2026');
  });

  it('las cinco la declaran, y ninguna otra opcion del sistema', () => {
    for (const opcion of [
      'predial_individual',
      'predial_masivo',
      'arbitrios',
      'vehicular_calculo',
      'alcabala',
    ]) {
      expect(composicionDe(opcion).resumenSiempre, opcion).toBe(true);
    }
    // Una ficha se encabeza con su registro abierto, no siempre: dibujarla sin
    // registro seria una cabecera vacia en el padron, que es su caso normal.
    expect(composicionDe('contribuyentes').resumenSiempre).toBeUndefined();
  });
});

describe('una seccion mixta se parte por el tipo del catalogo, no por lo que se puede escribir', () => {
  /**
   * «Liquidación» de Alcabala tiene trece campos y **tres de ellos son
   * entradas**: el numero de expediente, la fecha de la transferencia y el valor
   * de transferencia. Los otros diez son la cuenta —el mayor entre el valor y el
   * autovaluo ajustado, menos las 10 UIT inafectas, por la tasa—.
   *
   * La linea de corte es el **tipo del catalogo** y no «lo que esta pantalla
   * puede mandar»: hoy alcabala no puede mandar nada (`ACTOS_SIN_CAMPO`), asi
   * que cortar por ahi habria dibujado los tres campos como texto de una cuenta,
   * diciendo que ya estan decididos.
   */
  it('los `ro` van a la memoria y los que se teclean siguen siendo campos', async () => {
    montarEnRuta('/rentas-registro/alcabala');
    await screen.findByRole('heading', { name: 'Liquidación' });
    const formulario = within(elBloque('.sgtm-formulario', 'el formulario'));

    const memoria = within(elBloque('.sgtm-memoria', 'la memoria del calculo'));
    expect(memoria.getByText('Base imponible (S/)')).toBeInTheDocument();
    expect(memoria.getByText('Tramo inafecto — 10 UIT (S/)')).toBeInTheDocument();

    // Y las tres entradas siguen dibujandose como campos, en su rejilla.
    for (const rotulo of ['Nº de expediente', 'Fecha de la transferencia']) {
      expect(formulario.getByLabelText(rotulo)).toBeInTheDocument();
    }
    // Ninguna de las tres se coló en la cuenta.
    expect(memoria.queryByText('Nº de expediente')).not.toBeInTheDocument();
  });
});

describe('la memoria del calculo se lee como una cuenta', () => {
  const CAMPOS = [
    { clave: 'valuoAfectoS', label: 'Valuo Afecto (S/)', t: 'ro' as const },
    { clave: 'tramo1', label: 'Tramo 1 — hasta 15 UIT (0.2 %)', t: 'ro' as const },
    { clave: 'insoluto', label: 'Impuesto insoluto anual (S/)', t: 'ro' as const },
    { clave: 'minimo', label: 'Mínimo imponible (0.6 % UIT)', t: 'ro' as const },
  ];

  const dibujar = (valores: Readonly<Record<string, string>>) =>
    render(
      <MemoriaDeCalculo
        campos={CAMPOS}
        valores={valores}
        cargando={false}
        memoria={{ total: 'insoluto' }}
      />,
    );

  /**
   * **Ni una cifra compuesta** (RNF-083). Lo unico que hace la interfaz es
   * partir por la flecha que el propio valor trae: la operacion a un lado y su
   * resultado al otro, las dos tal cual llegaron.
   */
  it('parte la operacion de su importe por la flecha del propio valor', () => {
    dibujar({ tramo1: 'S/ 80,250.00 → S/ 160.50' });

    const linea = screen
      .getByText('Tramo 1 — hasta 15 UIT (0.2 %)')
      .closest('.sgtm-memoria__linea') as HTMLElement;
    expect(linea.querySelector('.sgtm-memoria__operacion')?.textContent).toBe('S/ 80,250.00');
    expect(linea.querySelector('.sgtm-memoria__importe')?.textContent).toBe('S/ 160.50');
  });

  it('un valor sin flecha es solo importe, y uno que no llego es un guion', () => {
    dibujar({ valuoAfectoS: '151,406.75' });

    const conValor = screen
      .getByText('Valuo Afecto (S/)')
      .closest('.sgtm-memoria__linea') as HTMLElement;
    expect(conValor.querySelector('.sgtm-memoria__operacion')).toBeNull();
    expect(conValor.querySelector('.sgtm-memoria__importe')?.textContent).toBe('151,406.75');

    // «No llego» y «vale cero» se siguen distinguiendo.
    const sinValor = screen
      .getByText('Mínimo imponible (0.6 % UIT)')
      .closest('.sgtm-memoria__linea') as HTMLElement;
    expect(sinValor.querySelector('.sgtm-memoria__importe')?.textContent).toBe('—');
  });

  /**
   * El resultado va **aparte de los pasos que lo producen**, y se declara: en la
   * escala del predial no es el ultimo campo de la seccion —detras va el minimo
   * imponible, que es una comprobacion contra el 0.6 % de la UIT—.
   */
  it('el resultado sale del bloque de pasos, y detras suyo siguen quedando pasos', () => {
    dibujar({ insoluto: '587.44', minimo: '32.10' });

    const resultado = elBloque('.sgtm-memoria__resultado', 'el resultado de la memoria');
    expect(resultado.textContent).toContain('Impuesto insoluto anual (S/)');
    expect(resultado.querySelector('.sgtm-memoria__resultado-valor')?.textContent).toBe('587.44');
    // Y no se ha quedado tambien entre los pasos: una vez y en un solo sitio.
    expect(document.querySelectorAll('.sgtm-memoria__linea').length).toBe(CAMPOS.length - 1);
    expect(screen.getByText('Mínimo imponible (0.6 % UIT)')).toBeInTheDocument();
  });

  it('solo las secciones declaradas se leen asi; el resto sigue siendo campos', () => {
    expect(memoriaDeSeccion('predial_individual', 'Escala progresiva acumulativa')).toEqual({
      total: 'impuestoInsolutoAnualS',
    });
    // Las cuotas son un calendario, no una cuenta encadenada.
    expect(memoriaDeSeccion('predial_individual', 'Emisión y cuotas')).toBeUndefined();
    // Y una seccion titulada como una propiedad heredada no devuelve «memoria».
    expect(memoriaDeSeccion('predial_individual', 'toString')).toBeUndefined();
  });
});
