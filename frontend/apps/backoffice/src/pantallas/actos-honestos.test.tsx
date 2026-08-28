import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { todasLasPantallas } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../pruebas/acciones';
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

  it('las dos causas hablan de la ventanilla, y la tecnica se queda en el `data-`', () => {
    const sinBackend = impedimentoDelActo('contribuyentes')?.detalle ?? '';
    const sinDeclaracion = impedimentoDelActo('predial_masivo')?.detalle ?? '';

    // Los dos dicen **por donde se sale**: el acto existe fuera del sistema, y
    // quedarse en «no se puede» deja el mostrador parado.
    for (const texto of [sinBackend, sinDeclaracion]) {
      expect(texto).toMatch(/Registra el acto por el procedimiento actual/);
      expect(texto).toMatch(/avísale a sistemas/);
      // Y **ninguno habla de desarrollador**: quien atiende no sabe qué es «el
      // backend» ni qué son campos «declarados», y leyéndolo sólo puede
      // concluir que la pantalla está rota y que la culpa es suya.
      expect(texto).not.toMatch(/backend|endpoint|declarad|contrato|API/i);
    }
    // No son el mismo texto con otro nombre: si lo fueran, distinguir las causas
    // no serviria de nada.
    expect(sinBackend).not.toBe(sinDeclaracion);
  });

  it('cada una de las 134 cae en su casilla, y las cuentas son las que son', async () => {
    const pantallas = await todasLasPantallas();
    const declaradas = new Set(OPCIONES_QUE_ESCRIBEN);
    const porCausa = { declarada: 0, 'sin-backend': 0, 'sin-declaracion': 0 };

    for (const opcion of Object.keys(pantallas)) {
      const impedimento = impedimentoDelActo(opcion);
      if (impedimento === undefined) {
        // Sin impedimento **solo** si la opcion declaro su escritura: es la
        // unica salida honesta de la funcion.
        expect(declaradas.has(opcion), `«${opcion}» sin impedimento y sin declarar`).toBe(true);
        porCausa.declarada += 1;
        continue;
      }
      porCausa[impedimento.causa] += 1;
    }

    /* Recuentos fijos, y no la formula que decide la funcion.
       La version anterior recalculaba aqui el cuerpo de `impedimentoDelActo`
       —«si escribe, `sin-declaracion`; si no, `sin-backend`»— y comparaba el
       resultado consigo mismo: pasaba con cualquier implementacion, incluida una
       que devolviera siempre la misma causa. Estos numeros no salen de la
       funcion: salen de contar el catalogo, y cambian cuando cambia el catalogo
       o cuando una opcion declara su escritura, que son exactamente los dos
       cambios sobre los que hay que llamar la atencion. */
    expect(porCausa).toEqual({ declarada: 6, 'sin-backend': 80, 'sin-declaracion': 48 });
    const total = Object.values(porCausa).reduce((a, b) => a + b, 0);
    expect(total).toBe(Object.keys(pantallas).length);
  });

  it('una opcion testigo por causa, nombrada: los recuentos solos no dicen cual', () => {
    // Lectura pura: no hay a donde guardar.
    expect(impedimentoDelActo('consulta_deuda')?.causa).toBe('sin-backend');
    // Escribe en el contrato y no ha declarado su cuerpo.
    expect(impedimentoDelActo('caja_tributaria')?.causa).toBe('sin-declaracion');
    // Y declarada: sin impedimento ninguno.
    expect(impedimentoDelActo('notificacion_valores')).toBeUndefined();
    // La misma pareja, comprobada por el otro lado: la causa es la del verbo.
    expect(escribe(operacionDe('caja_tributaria') ?? 'inicio')).toBe(true);
    expect(escribe(operacionDe('consulta_deuda') ?? 'inicio')).toBe(false);
  });
});

describe('la franja aparece en la pantalla, y la primaria la referencia', () => {
  it.each([
    {
      caso: 'operacion de lectura',
      ruta: '/rentas-registro/contribuyentes',
      causa: 'sin-backend',
    },
    {
      caso: 'operacion que escribe y opcion sin declarar',
      ruta: '/rentas-registro/transferencia-predio',
      causa: 'sin-declaracion',
    },
  ])('$caso: la accion se queda apagada y la franja lo explica', async ({ ruta, causa }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    // `motivoDeLaPrimaria` exige ademas que la franja exista de verdad y lleve
    // `role="status"`: un `aria-describedby` a un `id` que no esta no lo lee nadie.
    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    // La causa tecnica **no se pinta**: viaja en el `data-` para quien mantiene.
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      causa,
    );

    montada.unmount();
  });

  it('una opcion declarada no lleva franja de impedimento: lleva la de su formulario', async () => {
    montarEnRuta('/rentas-registro/alta-deuda');
    await screen.findByRole('region', { name: 'Observación del usuario' });

    // Lo que la apaga es la observacion que falta (regla 10), no el sistema.
    expect(motivoDeLaPrimaria()).toMatch(/Falta la observación/);
    expect(motivoDeLaPrimaria()).not.toMatch(/avísale a sistemas/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).not.toHaveAttribute('data-causa');
  });

  /**
   * **La franja no aparece donde la composicion ya da un acto** (#332).
   *
   * `calles` y `sectores` son de lectura —su operacion es un `GET`—, asi que la
   * causa salia `sin-backend` y la pantalla decia «aquí todavía no se puede
   * guardar nada» **al lado de un «Nuevo» que abre un formulario y da de alta de
   * verdad** desde #321. Y la franja quedaba ademas huerfana: la primaria es el
   * boton del alta, que no la referencia, asi que nadie la leia nunca.
   */
  it.each([
    { caso: 'un alta en panel', ruta: '/catastro/calles', accion: 'Nuevo' },
    { caso: 'un alta en panel', ruta: '/catastro/sectores', accion: 'Nuevo sector' },
    { caso: 'un flujo guiado', ruta: '/catastro/ficha-urbana', accion: 'Nuevo' },
  ])('$ruta compone $caso: ni franja, ni causa, ni promesa rota', async ({ ruta, accion }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    // El acto existe y esta vivo: es el que el prototipo ya dibujaba.
    expect(await screen.findByRole('button', { name: accion })).toBeEnabled();
    // Y la franja se queda vacia: no hay nada que explicar.
    expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');
    expect(motivoDeLaPrimaria()).toBeUndefined();

    montada.unmount();
  });
});
