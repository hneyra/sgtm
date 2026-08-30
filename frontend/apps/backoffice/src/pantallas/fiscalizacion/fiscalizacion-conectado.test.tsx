import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { censoDeConectadas } from '../aportes-de-modulo';
import { escrituraDe } from '../escrituras';
import { ACTOS_SIN_CAMPO, impedimentoDelActo } from '../actos';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';
import { SIN_DATO } from '../seguridad/listado';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

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

/**
 * **Los cinco filtros de Fiscalización que no filtran** (#431).
 *
 * Dos pantallas y dos motivos: los del programa **no llegan** —la lectura acota
 * por número de programa y por ejercicio, y `parametrosDeBusqueda` descarta lo
 * que el contrato no declara— y los de los resultados **llegan y se rechazan**,
 * porque sus tres desplegables hablan un vocabulario que el controlador no
 * conoce. Estaban vivos los cinco.
 */
describe('los cinco filtros de fiscalizacion se dibujan bloqueados, con su motivo (#431)', () => {
  const LOS_CINCO: readonly (readonly [string, string, RegExp])[] = [
    ['fisc-programa', 'Tipo', /no se acota por tipo/i],
    ['fisc-programa', 'Estado', /tampoco se acota por estado/i],
    ['fisc-resultados', 'Programa', /códigos de programa/i],
    ['fisc-resultados', 'Hallazgo', /no son ninguna de las condiciones/i],
    ['fisc-resultados', 'Estado', /ninguno de estos cuatro estados/i],
  ];

  it.each(LOS_CINCO)('%s · «%s» no se escribe, y dice por qué', async (ranura, etiqueta, motivo) => {
    const montada = montarEnRuta(`/fiscalizacion/${ranura}`);
    await screen.findByRole('heading', { level: 1 });

    const busqueda = within(await screen.findByRole('region', { name: 'Búsqueda' }));
    // Un `sel` bloqueado se dibuja `disabled`; los cinco lo son.
    expect(busqueda.getByLabelText(etiqueta)).toBeDisabled();
    expect(document.body.textContent, `«${etiqueta}» sin motivo`).toMatch(motivo);

    montada.unmount();
  });

  /**
   * **Y los dos que sí llegan siguen escribiéndose**, que es el contraste que
   * hace falta: sin él, una declaración que bloqueara los cuatro filtros del
   * programa pasaría las pruebas de arriba.
   */
  it('el número de programa y el ejercicio siguen siendo del operador', async () => {
    const montada = montarEnRuta('/fiscalizacion/fisc-programa');
    await screen.findByRole('heading', { level: 1 });

    const busqueda = within(await screen.findByRole('region', { name: 'Búsqueda' }));
    expect(busqueda.getByLabelText('Nº de programa')).not.toHaveAttribute('readonly');
    expect(busqueda.getByLabelText('Ejercicio')).not.toBeDisabled();

    montada.unmount();
  });
});

/**
 * **`fisc_resultados` deja de leerse como una consulta** (#431).
 *
 * Su franja decía «aquí todavía no se puede guardar nada: lo que hay es de
 * consulta», y las dos mitades eran falsas: su primaria, «Emitir resoluciones de
 * determinación», tiene backend desde #52 —`POST /fiscalizacion/transferencias`,
 * que `ResolucionController` declara con `@RequiereAcceso(acceso =
 * "fisc_resultados")` y su javadoc llama «la acción de `fisc_resultados`»—. Y es
 * la frontera más delicada del sistema: el único camino por el que un dato de
 * fiscalización pasa a ser el dato oficial del padrón.
 */
describe('fisc_resultados: su acto tiene backend, y la franja lo dice (#431)', () => {
  it('la causa es «sin-campo» y nombra los cuatro datos de la transferencia', () => {
    expect(ACTOS_SIN_CAMPO['fisc_resultados']?.campos).toEqual([
      'nLiquidacion',
      'documentoSustento',
      'sustento',
      'baseLegal',
    ]);
    const impedimento = impedimentoDelActo('fisc_resultados', [
      'Exportar Excel',
      'Emitir resoluciones de determinación',
    ]);
    expect(impedimento?.causa).toBe('sin-campo');
    // Y ya no dice que aquí sólo se consulta, que era lo falso.
    expect(impedimento?.detalle).not.toMatch(/lo que hay es de consulta/i);
    expect(impedimento?.detalle).toMatch(/base legal/i);
  });

  it('en la pantalla, la franja lo cuenta donde se lee', async () => {
    const montada = montarEnRuta('/fiscalizacion/fisc-resultados');
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/base legal/i);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-campo',
    );

    montada.unmount();
  });
});

/**
 * **Las tres actas siguen sin conectar, y sus listas ya no están cortas** (#431).
 *
 * `campos` es lo que quien mantiene lee para saber qué falta sin abrir el
 * controlador, y las tres omitían el `fiscalizador` —los dos controladores lo
 * pasan por `exigir`, y el catálogo de la predial lo dibuja `"ro"`—.
 */
describe('las tres actas nombran los datos que de verdad les faltan (#431)', () => {
  it('la predial ya no nombra los tres identificadores: nombra lo que sigue cerrado', () => {
    /* Los tres ids **ya tienen fuente publicada**: el programa desde su propio
       listado (`GET /fiscalizacion/programas`, la lectura que trajo #431), el
       predio desde `consulta_fichas` y el contribuyente desde el padrón. Lo que
       queda cerrado es otra cosa. */
    expect(ACTOS_SIN_CAMPO['fisc_predial']?.campos).toEqual(['fiscalizador', 'hallazgo']);
    expect(impedimentoDelActo('fisc_predial', ['Cerrar acta'])?.causa).toBe('sin-campo');
  });

  it('la vehicular nombra también la fecha y el fiscalizador, que su catálogo no dibuja', () => {
    expect(ACTOS_SIN_CAMPO['fisc_vehicular']?.campos).toContain('fechaVisita');
    expect(ACTOS_SIN_CAMPO['fisc_vehicular']?.campos).toContain('fiscalizador');
  });

  it('y el programa dice además que ninguno de sus tres botones lo registra', () => {
    expect(ACTOS_SIN_CAMPO['fisc_programa']?.porque).toMatch(/ninguno de los tres botones/i);
  });
});
