import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { cifrasEnPantalla, cifrasServidas } from '../../pruebas/cifras';
import { avisoDe } from '../avisos';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Rentas · Registro: la ficha del contribuyente y la del vehiculo (#330).
 *
 * Nueve pestanas y 56 campos en el padron; seis y 54 en la ficha de vehiculo. El
 * backend llena siete y ocho. Averiguar si un dato existe costaba nueve clics, y
 * el que mas se mira —cuanto debe— no existe en ningun sitio.
 *
 * Lo que se comprueba aqui es lo que #319 comprobo para las fichas catastrales,
 * sobre otro objeto: que la cabecera-resumen se compone **con lo que el
 * adaptador ya trae** —ni una peticion mas, ni una cifra recompuesta—, que el
 * indice sustituye a las pestanas **solo en las opciones declaradas**, y que el
 * hueco de la deuda sale como un guion **explicado** y nunca como un cero.
 */

const CONTRIBUYENTE = '00000025673';
const PADRON = `/rentas-registro/contribuyentes?codigo=${CONTRIBUYENTE}`;
const VEHICULO = '/rentas-registro/vehiculos/T2G-418';
const DECLARACION = '/rentas-registro/declaracion-jurada/000418?ano=2026';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('la cabecera-resumen dice a quien se tiene delante', () => {
  it('compone codigo, nombre, documento y estado con la fila que ya llego', async () => {
    montarEnRuta(PADRON);

    const resumen = await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    expect(within(resumen).getByText(CONTRIBUYENTE)).toBeInTheDocument();
    expect(within(resumen).getByText('SUC. RUFINA MEDINA MEDINA')).toBeInTheDocument();
    expect(within(resumen).getByText('03593174')).toBeInTheDocument();
    // «A» del manual, con su texto dentro de la insignia: el estado nunca se
    // comunica solo por color (FRO-02 §2.1).
    expect(within(resumen).getByText('A')).toBeInTheDocument();
  });

  it('sin registro abierto no hay cabecera: el padron es un padron', async () => {
    montarEnRuta('/rentas-registro/contribuyentes');
    await screen.findByRole('columnheader', { name: 'Código' });
    expect(
      screen.queryByRole('region', { name: 'Resumen del contribuyente' }),
    ).not.toBeInTheDocument();
  });

  it('la deuda sale como un guion explicado, y en ningun caso como un cero', async () => {
    montarEnRuta(PADRON);

    const resumen = await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    const linea = within(resumen)
      .getByText(/Deuda a hoy/)
      .closest('p') as HTMLElement;
    expect(linea.textContent).toContain(SIN_DATO);
    // **Es la cifra que mas se mira**: un cero se lee como «no debe», y no hay
    // nada que sostenga esa frase mientras `deudaActualizadaA(fecha)` no exista.
    expect(linea.textContent).not.toMatch(/0[.,]00|S\/\s*0/);
    // Y el guion va explicado, que es lo que lo distingue de un hueco.
    expect(linea.textContent).toMatch(/no la publica todavía/);
  });

  it('la ficha de vehiculo resume lo que `VehiculoResource` publica, y el resto con «—»', async () => {
    montarEnRuta(VEHICULO);

    const resumen = await screen.findByRole('region', { name: 'Resumen del vehículo' });
    expect(within(resumen).getByText('T2G-418')).toBeInTheDocument();
    expect(within(resumen).getByText(/TOYOTA YARIS GLI/)).toBeInTheDocument();
    // El titular llega como identificador interno: no se ensena, y no se cruza
    // con el padron para inventarlo.
    const titular = within(resumen).getByText('Titular').closest('div');
    expect(titular?.textContent).toContain(SIN_DATO);
  });

  it('la declaracion jurada dice cual es antes de la tabla de una fila', async () => {
    montarEnRuta(DECLARACION);

    const resumen = await screen.findByRole('region', { name: 'Resumen de la declaración' });
    expect(within(resumen).getByText('DJ 000418')).toBeInTheDocument();
    expect(within(resumen).getByText(/Ejercicio 2026/)).toBeInTheDocument();
  });

  it('ninguna cifra del resumen se recompone: sale tal cual la sirvio la API', async () => {
    montarEnRuta(PADRON);
    await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0));

    // La cabecera repite datos de la fila; ninguno puede llegar transformado
    // (RNF-083). Se mira con el mismo comprobador que usan Transito y #78.
    const servidas = cifrasServidas('contribuyentes');
    for (const cifra of cifrasEnPantalla()) expect(servidas).toContain(cifra);
  });
});

describe('el indice sustituye a las pestanas, y solo donde se declara', () => {
  it('el padron apila sus nueve pestanas en una pagina que el indice recorre', async () => {
    montarEnRuta(PADRON);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    // La barra de pestanas deja de dibujarse: era navegacion, y el indice hace
    // la misma navegacion desplazando en vez de recargar.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    // Y estan **todas** las secciones de las nueve pestanas, con el rotulo del
    // manual: el indice agrupa, no renombra (RNF-080).
    const entradas = within(indice)
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toContain('Identificación');
    // De la pestana 2, que antes exigia un clic para saber si existia.
    expect(entradas).toContain('Domicilio fiscal');
    // Y de la novena.
    expect(entradas).toContain('Unidades afectas del contribuyente');
    expect(entradas.length).toBe(12);
  });

  it('la ficha de vehiculo hace lo mismo con sus seis', async () => {
    montarEnRuta(VEHICULO);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    const entradas = within(indice)
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toEqual([
      'Identificación',
      'Características técnicas',
      'Titular del vehículo',
      'Conductor habitual',
      'Impuesto al patrimonio vehicular',
      'Inafectación y exoneración',
      'Notas',
    ]);
  });

  it('la entrada lleva a su ancla, que existe y es la seccion que dice', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULO);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    const tercera = within(indice).getByRole('button', { name: 'Titular del vehículo' });
    await usuario.click(tercera);

    const ancla = document.getElementById('sgtm-seccion-0-2');
    expect(ancla).not.toBeNull();
    expect(within(ancla as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Titular del vehículo',
    );
    expect(tercera).toHaveAttribute('data-activa', '1');
  });

  it('la declaracion jurada lleva resumen y **no** indice: declara una sola seccion', async () => {
    montarEnRuta(DECLARACION);
    await screen.findByRole('region', { name: 'Resumen de la declaración' });
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });
});

describe('el aviso de dominio explica los «—» antes de que alguien los lea mal', () => {
  it('el padron y la ficha de vehiculo lo declaran, y dice de quien depende el hueco', async () => {
    expect(avisoDe('contribuyentes')?.detalle).toMatch(/salen con «—»/);
    expect(avisoDe('vehiculos')?.detalle).toMatch(/tabla referencial del MEF/);

    montarEnRuta(PADRON);
    expect(await screen.findByText(/Lo que el padrón publica hoy/)).toBeInTheDocument();
  });
});
