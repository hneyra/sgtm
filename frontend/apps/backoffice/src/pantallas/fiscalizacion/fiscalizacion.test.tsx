import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { cifrasDeLaTabla, cifrasEnPantalla, cifrasServidas } from '../../pruebas/cifras';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Fiscalizacion (#80): **la frontera mas delicada del sistema**.
 *
 * Fiscalizacion trabaja sobre copias y solo escribe en el padron por
 * transferencia (ARQ-01 §3.5). La interfaz tiene que hacer visible esa
 * frontera: si no, el fiscalizador cierra el acta creyendo que ya cambio algo
 * que no ha cambiado, se va, y el contribuyente sigue con su declaracion
 * antigua y su recibo antiguo hasta que alguien se da cuenta meses despues.
 *
 * Ninguno de sus ocho endpoints existe todavia.
 */

const MODULO = '/fiscalizacion';

/** Las cuatro pantallas que ensenan datos del proceso, no del padron. */
const COPIAS: readonly string[] = [
  'fisc-predial',
  'fisc-vehicular',
  'fisc-resultados',
  'fisc-historico',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('mientras no se transfiera, el padron no ha cambiado, y se dice', () => {
  it.each(COPIAS)('%s lo advierte antes de que nadie teclee', async (ranura) => {
    const montada = montarEnRuta(`${MODULO}/${ranura}`);
    await dibujada('.sgtm-aviso');

    // La advertencia va arriba, con el resto de la pantalla debajo: no es un
    // mensaje que aparece al guardar, es lo que hay que saber **antes**.
    const aviso = document.querySelector('.sgtm-aviso');
    expect(aviso?.textContent).toMatch(/padrón|padron/i);
    expect(aviso?.textContent).toMatch(/no ha cambiado|todavía no|no los recoge|no del padrón/i);

    montada.unmount();
  });

  it('la lista de omisos **no** lo dice, porque no es una copia', async () => {
    montarEnRuta(`${MODULO}/fisc-omisos`);
    await dibujada('table');

    // Omisos es una consulta contra el padron de verdad —quien tiene predio y
    // no declaro—. Decirle lo mismo seria mentir en la direccion contraria.
    const avisos = [...document.querySelectorAll('.sgtm-aviso')];
    expect(avisos.some((a) => /no ha cambiado/i.test(a.textContent ?? ''))).toBe(false);
  });
});

describe('ninguna cifra de determinacion se compone en la interfaz', () => {
  it('los resultados ensenan lo que sirvio la API, tal cual', async () => {
    // Sobre los resultados y no sobre el estado de cuenta: es la pantalla donde
    // hay cifras de determinacion —la deuda omitida por ejercicio—, que es lo
    // que no se puede recomponer.
    montarEnRuta(`${MODULO}/fisc-resultados`);
    await dibujada('table');
    await waitFor(() => expect(cifrasEnPantalla().length).toBeGreaterThan(0));

    const servidas = cifrasServidas('fisc_resultados');
    // La diferencia de tributo la determina el proceso con los parametros del
    // ejercicio fiscalizado. Recomponerla al mostrar la separaria del valor que
    // se va a emitir (RNF-083).
    for (const cifra of cifrasEnPantalla()) expect(servidas).toContain(cifra);
    // Y en la otra direccion: cada cifra de la respuesta sigue estando en la
    // pantalla. Sin esto, una transformacion que cambie el formato se escapa
    // —deja de parecer dinero y se cae del filtro—.
    for (const cifra of cifrasDeLaTabla('fisc_resultados'))
      expect(cifrasEnPantalla()).toContain(cifra);
  });
});

describe('SoD-4: quien fiscaliza no transfiere su propio resultado', () => {
  /** El fiscalizador de campo: levanta actas, y no ve los resultados que transfieren. */
  const FISCALIZADOR = permisosDelClaim({
    fisc_programa: ['lectura'],
    fisc_predial: ['lectura', 'registro'],
    fisc_vehicular: ['lectura', 'registro'],
    fisc_omisos: ['lectura'],
  });

  it('no ve la pantalla desde la que se transfiere, y si las suyas', () => {
    // La accion de transferir **no se dibuja deshabilitada**: no se dibuja.
    expect(puedeVer(FISCALIZADOR, 'fisc_resultados')).toBe(false);
    expect(puedeVer(FISCALIZADOR, 'fisc_predial')).toBe(true);

    // Lo que la interfaz **no** puede es distinguir «este resultado lo levante
    // yo» de «lo levanto otro»: el permiso es por opcion, no por acta. Esa
    // mitad de SoD-4 la hace el servidor (#52), y la interfaz no la finge.
  });
});
