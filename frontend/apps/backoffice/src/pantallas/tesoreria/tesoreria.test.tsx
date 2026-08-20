import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeVer } from '../../app/sesion/permisos';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Tesoreria (#74): **donde el sistema se usa a diario y donde un clic de mas se
 * paga cien veces al dia** (FRO-03 §6).
 *
 * Ninguno de sus diez endpoints existe todavia, asi que no hay nada que
 * conectar. Lo que si se puede —y es lo que mas vale de este modulo— es
 * comprobar las propiedades de la caja que no dependen del servidor: que tras
 * cobrar se pueda seguir cobrando sin buscar donde, que pulsar dos veces cobre
 * una, y que un reintento no sea un segundo cobro.
 */

/**
 * La caja de tasas: `POST /tesoreria/caja/tasas`.
 *
 * Se usa esta y no la caja tributaria porque **es la que tiene bloque de
 * busqueda**: su campo de identificacion —`codContribuyente`— es un filtro, y
 * ahi es donde el foco tiene que volver. En la caja tributaria ese campo vive
 * dentro de una seccion del formulario y hoy no es escribible —la opcion no
 * declara ningun campo (#64)—, asi que no hay donde poner el foco hasta que
 * #33 diga que acepta su cuerpo. Las dos cobran igual y comparten renderizador.
 */
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

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

const cobrar = async (): Promise<HTMLElement> => {
  const acciones = document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton');
  const primaria = acciones[acciones.length - 1];
  expect(primaria).toBeDefined();
  return primaria as HTMLElement;
};

/**
 * Cobra: pulsa la accion primaria y, si lo que hace no se deshace, **confirma**.
 *
 * «Cobrar y emitir recibo» emite, y lo que emite no se deshace: la barra pide
 * confirmacion diciendo que va a pasar (regla 4, #64). Ese paso es parte del
 * camino real del cajero, asi que la prueba lo recorre en vez de saltarselo.
 */
async function cobrarDeVerdad(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  await usuario.click(await cobrar());
  const confirmar = screen.queryByRole('button', { name: /^Confirmar/ });
  if (confirmar) await usuario.click(confirmar);
}

describe('tras cobrar, entra el siguiente contribuyente', () => {
  it('el foco vuelve al primer campo de la busqueda, sin tocar el raton', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CAJA);

    await usuario.type(await observacion(), 'Cobro en ventanilla, caja 3.');
    await cobrarDeVerdad(usuario);
    await screen.findByText(/Guardado, con tu observación/);

    // El primer campo escribible de la busqueda es donde se teclea el documento
    // del siguiente. Si el foco se quedara en el boton, ese gesto se paga en
    // cada cobro, y en una caja son cientos al dia (RNF-082).
    const busqueda = screen.getByRole('region', { name: 'Búsqueda' });
    const primero = busqueda.querySelector('input:not([readonly]):not([disabled])');
    expect(primero).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(primero));
  });

  it('y no se lo lleva despues: el usuario puede mover el foco donde quiera', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CAJA);

    await usuario.type(await observacion(), 'Cobro en ventanilla, caja 3.');
    await cobrarDeVerdad(usuario);
    await screen.findByText(/Guardado, con tu observación/);
    await waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'));

    // Enfocar en cada render mientras «guardada» siga siendo cierto dejaria el
    // foco clavado: se enfoca en el flanco, una vez.
    const otro = screen.getAllByRole('button')[0];
    expect(otro).toBeDefined();
    otro?.focus();
    expect(document.activeElement).toBe(otro);

    // Y se provoca un render mas —escribir la observacion del siguiente cobro—
    // porque sin el, «una vez» y «en cada render» no se distinguen: si el foco
    // se recolocara en cada dibujo, este texto no llegaria a escribirse donde
    // el cajero lo esta escribiendo.
    await usuario.type(await observacion(), 'Siguiente cobro.');
    expect(document.activeElement).toBe(await observacion());
  });
});

describe('cobrar dos veces no es cobrar dos veces', () => {
  it('pulsar dos veces rapido produce **una** peticion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CAJA);

    await usuario.type(await observacion(), 'Cobro en ventanilla.');
    // Dos pulsaciones sobre la accion: la confirmacion aparece una vez, y al
    // confirmarla sale **una** peticion.
    await usuario.dblClick(await cobrar());
    const confirmar = screen.queryByRole('button', { name: /^Confirmar/ });
    if (confirmar) await usuario.dblClick(confirmar);

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones).toHaveLength(1);
  });

  it('un reintento tras un fallo reusa la clave; corregir la observacion empieza otro intento', async () => {
    const usuario = userEvent.setup();
    laCajaResponde(503);
    montarEnRuta(CAJA);

    await usuario.type(await observacion(), 'Cobro en ventanilla.');
    await cobrarDeVerdad(usuario);
    await waitFor(() => expect(peticiones).toHaveLength(1));

    // Mismo intento: para el servidor es **uno**. Regenerar la clave aqui
    // convertiria un reintento de red en un segundo cobro.
    await cobrarDeVerdad(usuario);
    await waitFor(() => expect(peticiones).toHaveLength(2));
    expect(peticiones[0]?.clave).toBe(peticiones[1]?.clave);
    expect(peticiones[0]?.clave).toBeTruthy();

    // Corregir lo que se manda es otro intento, y lleva otra clave: con la
    // anterior, el servidor devolveria el resultado del intento que se corrige.
    await usuario.type(await observacion(), ' Corregido.');
    await cobrarDeVerdad(usuario);
    await waitFor(() => expect(peticiones).toHaveLength(3));
    expect(peticiones[2]?.clave).not.toBe(peticiones[0]?.clave);
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
