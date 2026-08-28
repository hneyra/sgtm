import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { todasLasPantallas } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { motivoDeLaPrimaria, primariaDeLaPantalla } from '../pruebas/acciones';
import { impedimentoDelActo } from './actos';
import { operacionDe } from './busqueda';
import { OPCIONES_QUE_ESCRIBEN } from './escrituras';

/**
 * **Ningun acto promete lo que no puede** (#332), en las 134.
 *
 * El defecto que esto cierra no era de una pantalla: `useEscritura` se activaba
 * para cualquier verbo de escritura, y una opcion sin declarar en
 * `escrituras.ts` «mandaba solo su observacion». En ventanilla eso significa
 * rellenar catorce campos, pulsar la primaria y recibir un rechazo —o ninguno,
 * porque no hay backend que rechace—. La negacion por omision de la lista blanca
 * no cambia; lo que cambia es que ahora **lo dice**, y dice cual de las dos
 * cosas falta.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('la causa se lee de lo que ya se sabe, sin ninguna lista aparte', () => {
  it('una opcion declarada no tiene impedimento; una sin declarar, si', () => {
    // Declarada: guarda de verdad, y lo que la apague sera su formulario.
    expect(impedimentoDelActo('alta_deuda')).toBeUndefined();
    expect(impedimentoDelActo('baja_deuda')).toBeUndefined();

    // Sin declarar y con verbo de escritura: falta trabajo del sistema.
    expect(impedimentoDelActo('transferencia_predio')?.causa).toBe('sin-declaracion');
    // Sin declarar y con verbo de lectura: no hay a donde guardar.
    expect(impedimentoDelActo('contribuyentes')?.causa).toBe('sin-backend');
  });

  it('las dos causas dicen cosas distintas: una pide paciencia y la otra, trabajo', () => {
    const sinBackend = impedimentoDelActo('contribuyentes')?.detalle ?? '';
    const sinDeclaracion = impedimentoDelActo('predial_masivo')?.detalle ?? '';

    expect(sinBackend).toMatch(/no publica ninguna escritura/);
    expect(sinDeclaracion).toMatch(/aún no están declarados para escribir/);
    // No son el mismo texto con otro nombre: si lo fueran, distinguir las causas
    // no serviria de nada.
    expect(sinBackend).not.toBe(sinDeclaracion);
  });

  it('cada una de las 134 cae en su casilla, y ninguna se queda sin clasificar', async () => {
    const pantallas = await todasLasPantallas();
    const declaradas = new Set(OPCIONES_QUE_ESCRIBEN);

    for (const opcion of Object.keys(pantallas)) {
      const impedimento = impedimentoDelActo(opcion);
      if (declaradas.has(opcion)) {
        expect(impedimento).toBeUndefined();
        continue;
      }
      const operacion = operacionDe(opcion);
      expect(impedimento?.causa).toBe(
        operacion !== undefined && escribe(operacion) ? 'sin-declaracion' : 'sin-backend',
      );
    }
  });
});

describe('la franja aparece en la pantalla, y la primaria la referencia', () => {
  it.each([
    {
      caso: 'operacion de lectura',
      ruta: '/rentas-registro/contribuyentes',
      dice: /no publica ninguna escritura/,
    },
    {
      caso: 'operacion que escribe y opcion sin declarar',
      ruta: '/rentas-registro/transferencia-predio',
      dice: /aún no están declarados para escribir/,
    },
  ])('$caso: la accion se queda apagada y la franja lo explica', async ({ ruta, dice }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    expect(primariaDeLaPantalla().disabled).toBe(true);
    // `motivoDeLaPrimaria` exige ademas que la franja exista de verdad y lleve
    // `role="status"`: un `aria-describedby` a un `id` que no esta no lo lee nadie.
    expect(motivoDeLaPrimaria()).toMatch(dice);

    montada.unmount();
  });

  it('una opcion declarada no lleva franja de impedimento: lleva la de su formulario', async () => {
    montarEnRuta('/rentas-registro/alta-deuda');
    await screen.findByRole('region', { name: 'Observación del usuario' });

    // Lo que la apaga es la observacion que falta (regla 10), no el sistema.
    expect(motivoDeLaPrimaria()).toMatch(/Falta la observación/);
    expect(motivoDeLaPrimaria()).not.toMatch(/todavía no puede guardar/);
  });
});
