import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';

/**
 * Tesoreria (#74): **donde el sistema se usa a diario y donde un clic de mas se
 * paga cien veces al dia** (FRO-03 §6).
 *
 * Ninguna de sus diez opciones esta conectada, y ninguna declara todavia su
 * escritura: lo que la interfaz tiene que hacer bien aqui es **decirlo**, en vez
 * de ofrecer un cobro que no cobra (#332).
 */

/** La caja de tasas: `POST /tesoreria/caja/tasas`. */
const CAJA = '/tesoreria/caja-tasas';

interface Peticion {
  readonly clave: string | null;
}

const original = globalThis.fetch;
let peticiones: Peticion[] = [];

function laCajaResponde(estado: number): void {
  peticiones = [];
  globalThis.fetch = (_entrada, opciones) => {
    peticiones.push({ clave: new Headers(opciones?.headers).get('idempotency-key') });
    return Promise.resolve(
      new Response(JSON.stringify({ fechaCalculo: '2026-08-20' }), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

beforeEach(() => laCajaResponde(201));
afterEach(() => {
  globalThis.fetch = original;
});

/**
 * **Lo que cambio en #332, y por que estas cuatro pruebas ya no viven aqui.**
 *
 * Hasta #332 esta caja «cobraba»: `caja_tasas` no declara nada en
 * `escrituras.ts`, y una opcion sin declarar mandaba **solo su observacion**. Un
 * cobro cuyo cuerpo no lleva ni el concepto ni la cantidad no es un cobro: es
 * una peticion que el backend rechaza —y que hasta que existio `CajaController`
 * no rechazaba nadie—. Sobre eso se probaban el foco, la doble pulsacion y la
 * idempotencia, que son propiedades del camino de escritura y no de la caja.
 *
 * Ahora la primaria de la caja se queda apagada **diciendo por que** (abajo), y
 * esas cuatro propiedades se comprueban donde vive el camino de escritura, sobre
 * una pantalla que si puede recorrerlo entero: `pantallas/escritura.test.tsx`
 * —foco tras guardar, doble pulsacion, clave por intento— y
 * `pantallas/actos-honestos.test.tsx`. Ninguna comprobacion se pierde; cambia de
 * sitio, que es donde tenia que estar.
 *
 * Se recupera aqui el dia que `caja_tasas` declare su cuerpo contra
 * `PeticionDeCobroDeTasas` —que ya existe (#33)—: sus `conceptos` son una tabla
 * de las que `escrituras.ts` ya sabe declarar, y su seleccion de filas es el
 * mismo opt-in que estrena «Baja de deuda».
 */
describe('la caja dice lo que todavia no puede hacer', () => {
  it('la primaria no se habilita, y la franja explica que falta declarar su cuerpo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CAJA);
    // El titulo llega con la navegacion; los bloques, con el trozo del modulo.
    await screen.findByRole('button', { name: /Cobrar/ });

    // Sin escritura declarada no hay ni caja de observacion: no hay a donde
    // escribir, y pedir una observacion para nada seria pedirla para nada.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();

    // Apagada con `aria-disabled` y enfocable, para que su franja se lea.
    primariaApagada();

    // Y lo dice **en la lengua del mostrador**, con la salida puesta: el acto se
    // registra por el procedimiento de siempre. Que lo que falta es la
    // declaracion de sus campos —y no el backend— lo lleva el `data-causa`, que
    // no se pinta: es para quien recibe el aviso, no para quien atiende.
    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-declaracion',
    );

    // Y no hay forma de mandar nada: enfocable no es pulsable —el `onClick` se
    // guarda solo cuando la primaria esta apagada con `aria-disabled`—.
    await usuario.click(screen.getByRole('button', { name: /Cobrar/ }));
    expect(peticiones).toEqual([]);
  });
});

describe('SoD-3 y lo que este modulo todavia no puede', () => {
  it('un cajero ve su caja y no ve el cierre ni la recaudacion por area', () => {
    const CAJERO = permisosDelClaim({
      caja_tributaria: ['ejecucion', 'lectura', 'registro'],
      caja_tasas: ['ejecucion', 'lectura', 'registro'],
      anulacion_recibo: ['ejecucion', 'lectura'],
    });

    expect(puedeVer(CAJERO, 'caja_tributaria')).toBe(true);
    expect(puedeVer(CAJERO, 'anulacion_recibo')).toBe(true);
    // Lo que la interfaz **no** puede es distinguir «recibos de mi caja y de
    // hoy» de los demas: el permiso es por opcion, no por caja ni por dia. Esa
    // mitad de SoD-3 la hace el servidor, y la interfaz no puede fingirla.
    expect(puedeVer(CAJERO, 'cierre_caja')).toBe(false);
    expect(puedeVer(CAJERO, 'recaudacion_area')).toBe(false);
  });

  /**
   * Cinco de las diez siguen sin conectar (#74, esta pasada): las cinco son
   * `POST` —abrir la pantalla no puede lanzar el acto— y ninguna tiene todavia
   * una lectura propia que alimentarla. Las otras cinco se conectaron aqui —
   * `caja_tributaria` leyendo `consulta_deuda`, igual que `baja_deuda`—: ver
   * `pantallas/tesoreria/index.ts` y el resto de este archivo.
   */
  it('cinco de las diez siguen sin conectar: son escrituras sin lectura propia', () => {
    for (const opcion of [
      'caja_tasas',
      'fraccionamiento',
      'anulacion_recibo',
      'anulacion_convenio',
      'cierre_caja',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });
});

describe('las cinco lecturas conectadas hablan la forma del Resource real (#74)', () => {
  beforeEach(() => instalarProxyDeDatos({ latencia: false }));
  afterEach(() => desinstalarProxyDeDatos());

  it('las cinco estan en el registro de conexiones', () => {
    for (const opcion of [
      'consulta_convenios',
      'duplicado_recibo',
      'avance_recaudacion',
      'recaudacion_area',
      'caja_tributaria',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });

  it('consulta_convenios dibuja filas de verdad contra el proxy, sin interceptar', async () => {
    montarEnRuta('/tesoreria/consulta-convenios');
    // Espera a la fila de verdad, no al esqueleto: `findAllByRole('cell')` se
    // resuelve ya con las celdas vacias del esqueleto, antes de que llegue el
    // dato.
    await screen.findByText('CASTILLO PASCUALA, MARÍA E.');
    // El estado, en mayusculas, es el vocabulario de `EstadoDeConvenio` (V31) y
    // no el del prototipo: «vigente», «cumplido»… El proxy ya lo publica asi.
    // `role: 'cell'` y no `findByText` a secas: «VIGENTE» tambien es una opcion
    // del filtro «Estado», y el texto suelto encuentra las dos.
    await screen.findByRole('cell', { name: 'VIGENTE' });
    await screen.findByText('CONV-2026-00412');
  });

  it('duplicado_recibo pide su numero y dibuja el recibo encontrado', async () => {
    montarEnRuta('/tesoreria/duplicado-recibo?nroDeRecibo=001-0000123');
    const filas = await screen.findAllByRole('row');
    expect(filas.length).toBeGreaterThan(1);
  });

  it('avance_recaudacion y recaudacion_area dibujan sus filas y sus totales', async () => {
    montarEnRuta('/tesoreria/avance-recaudacion');
    const filasAvance = await screen.findAllByRole('row');
    expect(filasAvance.length).toBeGreaterThan(1);

    montarEnRuta('/tesoreria/recaudacion-area');
    const filasArea = await screen.findAllByRole('row');
    expect(filasArea.length).toBeGreaterThan(1);
  });

  /**
   * El bloqueante #2 de esta pasada: `caja_tributaria` no declara `filtros` en
   * su catalogo, y sin el bloque `Filtros` no se dibuja nunca. La franja de
   * busqueda sale de `filtrosPropios` (`pantallas/tesoreria/composicion.ts`).
   */
  it('caja_tributaria dibuja su bloque de busqueda, teclea y carga la deuda', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    // El bloque de busqueda existe y tiene un campo de texto para el codigo.
    const campo = await screen.findByRole('textbox', { name: 'Cód. Contribuyente' });
    expect(campo).not.toHaveAttribute('readonly');

    await usuario.type(campo, '03593174');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    // Con el codigo en la URL, la grilla carga de verdad contra el proxy: la
    // fila deja de ser el esqueleto y trae el tributo de la deuda. Dos filas
    // la dibujan, y «IMPUESTO PREDIAL» ademas es una opcion del desplegable
    // «Forma de pago» — por eso se cuentan las celdas de la tabla, no el texto
    // suelto.
    await waitFor(() => {
      const celdas = screen
        .getAllByRole('cell')
        .filter((celda) => celda.textContent === 'IMPUESTO PREDIAL');
      expect(celdas.length).toBeGreaterThan(0);
    });
  });
});
