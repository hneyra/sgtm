import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeVer } from '../../app/sesion/permisos';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaDeLaPantalla } from '../../pruebas/acciones';

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

    const primaria = primariaDeLaPantalla();
    expect(primaria.disabled).toBe(true);

    // Y lo dice: `POST /tesoreria/caja/tasas` esta en el contrato —escribe—, asi
    // que lo que falta es la declaracion de sus campos, no el backend.
    expect(motivoDeLaPrimaria()).toMatch(/aún no están declarados para escribir/);

    // Y no hay forma de mandar nada: no queda ningun control que lo consiga.
    await usuario.click(primaria);
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

  it('ninguna de las diez esta conectada: el backend de tesoreria no existe', () => {
    for (const opcion of [
      'caja_tributaria',
      'caja_tasas',
      'fraccionamiento',
      'consulta_convenios',
      'duplicado_recibo',
      'anulacion_recibo',
      'anulacion_convenio',
      'cierre_caja',
      'avance_recaudacion',
      'recaudacion_area',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });
});
