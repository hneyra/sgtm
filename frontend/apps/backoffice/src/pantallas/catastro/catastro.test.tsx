import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO as SIN_CIFRA } from '../seguridad/listado';

/**
 * Catastro, conectado **hasta donde llega el backend** (#71).
 *
 * Diez opciones de doce. Lo que se comprueba aqui es lo que distingue este
 * modulo de los demas:
 *
 * - que las fichas **ensenan su version y su historico**, que es la
 *   funcionalidad de #18 —un backend que no sobrescribe no sirve de nada si la
 *   pantalla no lo cuenta—;
 * - que lo que el recurso no publica sale vacio, y en particular **ninguna
 *   cifra de valuacion se compone aqui** (D-02);
 * - que los aranceles leen un arreglo suelto, sin sobre de paginacion;
 * - que valores unitarios y depreciacion siguen sin conectar, y por que ya no
 *   es solo D-02.
 */

let peticiones: string[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

describe('el catalogo vial lee ViaResource', () => {
  it('dibuja codigo, tipo, nombre y estado, y deja vacio lo que el recurso no trae', async () => {
    montarEnRuta('/catastro/calles');

    const fila = (await screen.findByText('00001182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '00001182',
      'AVENIDA',
      'JOSÉ DE LAMA',
      // Sector, zona de arancel y arancel por m²: el prototipo los dibuja y
      // `ViaResource` no los publica. El del arancel es el que mas importa
      // —es una cifra que alimenta la valuacion de un predio—, y una cifra
      // inventada aqui acaba en un valor mal emitido. Que falte se ve.
      '—',
      '—',
      '—',
      'ACTIVA',
    ]);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/vias'))).toHaveLength(1);
  });

  it('el conteo sale del sobre paginado, no de contar las filas dibujadas', async () => {
    montarEnRuta('/catastro/calles');
    expect(await screen.findByText(/vías$/)).toBeInTheDocument();
  });
});

describe('los aranceles leen ArancelResource, sin sobre de paginacion', () => {
  it('vía sale como el id que publica el recurso; zona y variación quedan vacías', async () => {
    montarEnRuta('/catastro/aranceles');

    // Segunda fila del prototipo: via "AV. JOSÉ DE LAMA" cuadra 7-14, zona 1,
    // arancel 386.40. El recurso no publica el nombre de la via ni la zona.
    const fila = (await screen.findByText('386.40')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '2', // el id de la via, no su nombre: ArancelResource no publica cual es
      '7', // el tramo: una subdivision libre, no un rango numerico
      SIN_CIFRA, // «cuadra hasta»: no hay donde separarla del tramo
      SIN_CIFRA, // zona: ArancelResource no la publica
      '386.40',
      SIN_CIFRA, // variación vs. el ano anterior: componerla seria D-02
    ]);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/tablas/aranceles'))).toHaveLength(
      1,
    );
    // `anio` es el unico parametro que el controlador real recibe.
    const [peticion] = peticiones.filter((u) => u.includes('/api/v1/catastro/tablas/aranceles'));
    expect(peticion).toContain(`anio=${new Date().getFullYear()}`);
  });

  it('el conteo sale del arreglo, y el paginador no se dibuja: el controlador no pagina', async () => {
    montarEnRuta('/catastro/aranceles');
    expect(await screen.findByText(/aranceles$/)).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Paginación de la tabla' }),
    ).not.toBeInTheDocument();
  });
});

describe('valores unitarios y depreciacion siguen sin conectar', () => {
  it('y ya no es solo D-02: el recurso es una fila por partida, y el prototipo una matriz', () => {
    // `ValorUnitarioController` y `DepreciacionController` existen (#17) y
    // publican una fila por partida —o por estado de conservacion—, nunca la
    // matriz categoria×partida o antiguedad×estado que dibuja el prototipo.
    // Volcar esas filas bajo columnas fijas las pondria bajo la cabecera de
    // otra partida, y valores unitarios tiene ademas una dimension —el ano de
    // construccion, NEG-05— que el prototipo ni declara como filtro.
    for (const opcion of ['valores_unitarios', 'depreciacion']) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });

  it('y se siguen dibujando por la forma que comparten las 134', async () => {
    montarEnRuta('/catastro/depreciacion');
    expect(await screen.findByText('Hasta 5 años')).toBeInTheDocument();
  });

  it('las diez que si conectan estan en el registro', () => {
    for (const opcion of [
      'calles',
      'sectores',
      'consulta_fichas',
      'ficha_urbana',
      'ficha_economica',
      'ficha_bienes',
      'ficha_rural',
      'aranceles',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
    // La actualizacion y el reporte tienen endpoint y no se conectan por aqui:
    // la primera escribe una tabla (#64 solo lleva campos planos) y el
    // segundo devuelve un PDF, no un recurso.
    expect(OPCIONES_CONECTADAS).not.toContain('actualizacion_catastro');
    expect(OPCIONES_CONECTADAS).not.toContain('ficha_contribuyente_reporte');
  });
});

/* ── El versionado, que es la funcionalidad de este modulo ─────────────── */

describe('la ficha ensena de cuando es lo que muestra', () => {
  it('la version que rige, su vigencia y de donde salio', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    const bloque = await screen.findByRole('region', { name: 'Versión de la ficha' });
    expect(within(bloque).getByText('Versión 3')).toBeInTheDocument();
    expect(within(bloque).getByText('VIGENTE')).toBeInTheDocument();
    // Sale dos veces: en la version que rige y en su fila del historico.
    expect(within(bloque).getAllByText('Desde 12/03/2026').length).toBeGreaterThan(0);
    // De donde salio: sin esto, «el área subió» no tiene explicación.
    expect(within(bloque).getByText(/Acta de inspección 0244-2026/)).toBeInTheDocument();
  });

  it('el historico dice quien, cuando y **por que** de cada version', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    const bloque = await screen.findByRole('region', { name: 'Versión de la ficha' });
    const versiones = within(bloque).getAllByRole('listitem');
    expect(versiones).toHaveLength(3);

    // La observacion es la mitad util, y va **entera**: es lo que se lee en voz
    // alta cuando el contribuyente pregunta por que le subio el recibo.
    expect(
      within(bloque).getByText(
        'Declaración jurada del contribuyente por ampliación del primer piso.',
      ),
    ).toBeInTheDocument();
    // Quien la escribio y cuando: la pista de auditoria, en la pantalla.
    expect(within(bloque).getByText(/jcardenas · 01\/06\/2021/)).toBeInTheDocument();
    // Y la que ya no rige dice hasta cuando rigio.
    expect(within(bloque).getByText('01/06/2021 — 11/03/2026')).toBeInTheDocument();
  });

  it('la fecha de la URL pide la ficha que regia entonces, no la de hoy', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001?fecha=2022-01-01');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const [peticion] = peticiones.filter((u) => u.includes('/catastro/fichas/urbana/'));
    expect(peticion).toContain('fecha=2022-01-01');
    // Y el historico se pide siempre: sin el, el bloque no puede dibujarse.
    expect(peticion).toContain('historico=true');
  });

  it('sin el codigo del predio no se pide ninguna ficha', async () => {
    montarEnRuta('/catastro/ficha-urbana');

    expect(await screen.findByText(/Elige un registro/)).toBeInTheDocument();
    // Ni una peticion: antes se pedia con un codigo de relleno y la pantalla
    // parecia funcionar mostrando un predio que no era de nadie.
    expect(peticiones.filter((u) => u.includes('/catastro/fichas/urbana/'))).toHaveLength(0);
  });
});

/* ── Ninguna cifra de valuacion se compone en la interfaz ──────────────── */

describe('las construcciones salen con sus categorias, nunca con importes', () => {
  it('la tabla de la ficha urbana lleva categorias y area, y ningun sol', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    const fila = (await screen.findByText('C B C C B C B')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '01',
      '1998',
      'NOBLE',
      'BUENO',
      'C B C C B C B',
      '118.50',
    ]);
    // Cuanto vale cada categoria es D-02a y vive en datos versionados (regla 5).
    expect(within(fila as HTMLElement).queryByText(/S\//)).not.toBeInTheDocument();
  });

  it('la ficha rural muestra hectareas **con su unidad** y ningun arancel', async () => {
    montarEnRuta('/catastro/ficha-rural/11024-0418');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // «12.5000 HA» y no «12.5»: el arancel rural es por hectarea, y leer metros
    // calcularia diez mil veces de menos.
    await waitFor(() => expect(screen.getByLabelText('Área total (ha)')).toHaveValue('12.5000 HA'));
    // Arancel, valor del terreno y autovaluo son D-02: salen vacios.
    expect(screen.getByLabelText('Arancel rural (S/ por ha)')).toHaveTextContent(SIN_CIFRA);
    expect(screen.getByLabelText('Autovalúo rural (S/)')).toHaveTextContent(SIN_CIFRA);

    // Y la clasificacion del backend se ve tal cual, aunque el desplegable del
    // prototipo la escriba de otra manera: un `select` que mostrara «A1 —
    // CULTIVO EN LIMPIO» ensenaria una eleccion que nadie hizo.
    expect(screen.getByLabelText('Tipo de tierra')).toHaveValue('CULTIVO EN LIMPIO');
  });

  it('la ficha de bienes comunes reparte participacion, no valor', async () => {
    montarEnRuta('/catastro/ficha-bienes/200601010150010101');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // El area comun la publica el recurso; el valor de los bienes comunes sale
    // de los valores unitarios, y componerlo aqui seria inventar la cifra que
    // reparte el gasto comun entre las unidades.
    expect(await screen.findByText('124.00')).toBeInTheDocument();
    const totales = screen.getByText('Valor bienes comunes').closest('div');
    expect(totales?.textContent).toContain(SIN_CIFRA);
  });
});

/* ── La consulta de fichas ─────────────────────────────────────────────── */

describe('la consulta de fichas pagina contra el servidor', () => {
  it('lee FichaEncontradaResource y deja vacio lo que no publica', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    const fila = (await screen.findByText('200601010150010101001')).closest('tr');
    expect(fila).not.toBeNull();
    expect(
      within(fila as HTMLElement).getByText('MEDINA MEDINA, RUFINA (SUC.)'),
    ).toBeInTheDocument();
    // Codigo predial de rentas, area construida y conciliada: no las publica el
    // recurso. El area construida habria que sumarla por piso, y la interfaz no
    // suma (RNF-083).
    expect(within(fila as HTMLElement).getAllByText(SIN_CIFRA)).toHaveLength(3);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/fichas?'))).toHaveLength(0);
    expect(peticiones.some((u) => u.endsWith('/api/v1/catastro/fichas'))).toBe(true);
  });
});
