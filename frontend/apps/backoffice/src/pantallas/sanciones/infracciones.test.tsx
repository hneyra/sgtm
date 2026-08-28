import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaDeLaPantalla } from '../../pruebas/acciones';

/**
 * Infracciones administrativas (#78).
 *
 * Comparte contexto con Transito y una diferencia que la interfaz tiene que
 * respetar: aqui **la notificacion previa es un paso obligatorio del
 * procedimiento**, no un documento que se emite despues. Una interfaz que
 * permita levantar el acta sin ella invita a un vicio de nulidad.
 *
 * De sus dieciocho endpoints solo `adm_estado_cuenta` existe (#47), conectada
 * desde #363 —ver `pantallas/sanciones/index.ts`—. Lo que se comprueba es lo
 * que ya se puede: que los reportes **reusan** el bloque de #77 en vez de
 * copiarlo, que `adm_estado_cuenta` lee `PapeletaResource` tal cual y no lo
 * que el proxy simulaba antes de #363, que toda escritura pide observacion, y
 * que quien no tiene el modulo no lo ve.
 */

/** Las dos pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = ['adm-resolucion-gerencia', 'adm-notificacion-resolucion'];

/**
 * Las que escriben **y cuya primaria es un acto**.
 *
 * `adm-notificacion` y `adm-valores` salieron de aqui en #337: escriben en el
 * contrato, pero la ultima accion de su catalogo —que es la primaria (FRO-03
 * §5)— es «Imprimir». Contarle a quien atiende que «registre el acto por el
 * procedimiento actual» debajo de un boton de imprimir es reganarle por algo que
 * no estaba haciendo. Su primaria sigue apagada, sin franja: ver abajo.
 */
const ESCRIBEN: readonly string[] = ['adm-reportes'];

/** Y las dos cuya primaria imprime: apagadas, y **sin** franja (#337). */
const DE_SALIDA: readonly string[] = ['adm-notificacion', 'adm-valores'];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('los reportes reusan el bloque de #77, no una copia', () => {
  it.each(HOJAS)(
    '%s se dibuja con la misma hoja, con sus firmas y sin imprimir la interfaz',
    async (ranura) => {
      const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
      await dibujada('[data-hoja="1"]');

      const hoja = document.querySelector('[data-hoja="1"]');
      expect(hoja?.querySelector('.sgtm-hoja__firmas')?.textContent).toContain('Contribuyente');
      expect(
        document.querySelector('.sgtm-hoja__botones')?.getAttribute('data-no-imprimible'),
      ).toBe('1');

      montada.unmount();
    },
  );
});

describe('adm_estado_cuenta lee PapeletaResource, conectada desde #363', () => {
  it('es la unica leida por una Conexion propia', () => {
    expect(OPCIONES_CONECTADAS).toContain('adm_estado_cuenta');
    // El resto del modulo sigue sin conectar: ningun otro endpoint tiene
    // `Controller` (#47).
    expect(OPCIONES_CONECTADAS).not.toContain('infracciones_adm');
    expect(OPCIONES_CONECTADAS).not.toContain('adm_valores');
  });

  it('la fila es la papeleta que publica el recurso, y lo que no publica sale vacio', async () => {
    montarEnRuta('/infracciones-administrativas/adm-estado-cuenta');
    await dibujada('table');

    // «Concepto», «Cuota» y «Vencimiento» dibujan un desglose de cuotas que
    // `PapeletaResource` no tiene —es una fila por papeleta, sin descripcion ni
    // fecha de vencimiento propias (ver `pantallas/sanciones/index.ts`)—, y
    // «Interés S/», «Gastos S/» y «Total S/» dependen de tesoreria, que
    // `EstadoDeCuentaAdministrativoController` documenta que todavia no publica
    // su calculo. Ninguno de los cinco se inventa.
    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(1);
    const celdas = within(filas[0] as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      // Insoluto: «lo que corresponde pagar, sin beneficio» (importeAPagar),
      // sin separador de miles — asi lo sirve el backend de verdad, y no como
      // lo escribia el catalogo del prototipo («2,675.00»).
      // La tabla agrupa los millares al dibujar (#342): el dato viaja intacto.
      '2 675.00',
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
    ]);
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no una tabla vacia', () => {
    // La forma que el proxy servia antes de #363 —`DatosDePantalla`, con
    // `tabla.filas` y sin `contenido`— es exactamente la que tiene que fallar
    // aqui, y no dibujarse como una tabla vacia en silencio (issue #363).
    expect(() =>
      leerPaginado(
        { fechaCalculo: '2026-08-13', tabla: { filas: [] } },
        'el estado de cuenta de la papeleta administrativa',
      ),
    ).toThrow(/no trae un listado paginado/);
    expect(
      leerPaginado(
        { contenido: [], totalElementos: 0 },
        'el estado de cuenta de la papeleta administrativa',
      ).contenido,
    ).toEqual([]);
  });
});

/**
 * **La semantica que cambio en #332.** Estas tres decian «no habilita su accion
 * primaria sin observacion, y con ella si»: era cierto y era el defecto. Ninguna
 * de las tres declara su escritura en `escrituras.ts`, asi que lo que la
 * observacion habilitaba era mandar **solo la observacion** —un acto que el
 * backend rechaza, o que no rechaza nadie porque no existe—.
 *
 * Ahora la primaria se queda apagada y **dice por que**. La observacion sigue
 * siendo la condicion de guardado de toda opcion que si escribe (regla 10,
 * RNF-052): eso se comprueba en `pantallas/escritura.test.tsx`, sobre las que
 * pueden recorrer el camino entero.
 */
describe('ningun acto de este modulo promete lo que no puede', () => {
  it.each(ESCRIBEN)('%s deja su primaria apagada, y la franja dice por que', async (ranura) => {
    const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
    await dibujada('.sgtm-acciones');

    primariaApagada();

    // Sin declaracion no hay a donde escribir, asi que tampoco hay caja de
    // observacion: pedirla seria pedirla para nada.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();

    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute('data-causa');

    montada.unmount();
  });

  it.each(DE_SALIDA)('%s imprime: la primaria esta apagada y **sin** franja', async (ranura) => {
    const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
    await dibujada('.sgtm-acciones');

    // Apagada con `disabled` y no con `aria-disabled`: no hay motivo que leer al
    // lado, asi que tampoco hace falta que reciba el foco.
    expect(primariaDeLaPantalla()).toBeDisabled();
    expect(motivoDeLaPrimaria()).toBeUndefined();
    expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');

    montada.unmount();
  });
});

describe('las notificaciones vencidas son una pantalla de trabajo', () => {
  it('se abren sin filtrar: es la lista de lo que hay que atender hoy', async () => {
    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };

    montarEnRuta('/infracciones-administrativas/adm-notificaciones-vencidas');
    await dibujada('table');

    const suya = peticiones.filter((u) => u.includes('/reportes/vencidas'));
    expect(suya).toHaveLength(1);
    // Sin un solo filtro: quien la abre quiere ver **todo** lo vencido, no un
    // subconjunto que alguien eligio por el.
    expect(suya[0]).not.toContain('?');

    globalThis.fetch = proxy;
  });
});

describe('el operador de licencias no ve este modulo', () => {
  it('no ve ninguna de sus opciones, y si las suyas', () => {
    const LICENCIAS = permisosDelClaim({
      licencia_funcionamiento: ['lectura', 'registro'],
      ciiu: ['lectura'],
      certificados: ['lectura', 'impresion'],
    });

    for (const opcion of ['infracciones_adm', 'adm_notificacion', 'adm_resolucion_gerencia']) {
      expect(puedeVer(LICENCIAS, opcion)).toBe(false);
    }
    expect(puedeVer(LICENCIAS, 'licencia_funcionamiento')).toBe(true);
  });
});
