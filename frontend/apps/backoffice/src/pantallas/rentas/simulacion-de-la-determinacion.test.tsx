import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* El unico sitio de la aplicacion que sabe si el proxy contesta. Sustituirlo es
   la unica forma honesta de montar la pantalla «como si el backend estuviera al
   otro lado»: ver el docblock de `pantallas/entorno.ts`. */
const contestando = { valor: true };
vi.mock('../entorno', () => ({ proxyDeDatosContestando: () => contestando.valor }));
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { elBloque } from '../../pruebas/nodos';
import { composicionDe, simulacionDe } from '../composicion';

/**
 * **Enseñar el resultado antes de escribir** (#393, paso 2 del marco).
 *
 * Las cuatro determinaciones cuya operacion es un `POST` no piden nada al abrir
 * —abrir una pantalla no puede lanzar una determinacion— y hasta ahora se
 * quedaban con sus importes en «—» sin forma de ver la cuenta. Ahora la accion
 * que el catalogo ya dibujaba —«Simular», «Liquidar»— pide la determinacion, y
 * la memoria de calculo se llena con lo que devuelve el servidor.
 *
 * Lo que estas pruebas fijan:
 *
 *   1. **al abrir no sale ninguna peticion**: la determinacion la lanza quien
 *      atiende, no el hecho de mirar la pantalla;
 *   2. al pulsar, la memoria se llena con **lo que devolvio el servidor**, con
 *      su operacion y su importe separados por la flecha que el valor trae;
 *   3. la banda dice entonces **con que conjunto sellado** se calculo, que es lo
 *      que hace reproducible la cifra (`ARQ-09` §3), y antes decia que todavia
 *      no habia determinacion;
 *   4. la accion que simula es **secundaria y no pide observacion**: no escribe
 *      nada, asi que la regla 10 no le aplica y la primaria sigue apagada;
 *   5. «Arbitrios» no simula, y no por olvido: su operacion es un `GET` y ya
 *      trae sus cifras al abrir.
 */

const PREDIAL = '/rentas-registro/predial-individual?codContribuyente=00000025673&ano=2026';

let pedidas: string[] = [];

beforeEach(() => {
  pedidas = [];
  instalarProxyDeDatos({ latencia: false });
  const debajo = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/api/v1')) pedidas.push(url.replace(/^.*\/api\/v1/, ''));
    return debajo(entrada, opciones);
  }) as typeof fetch;
});
afterEach(() => desinstalarProxyDeDatos());

const laMemoria = () => within(elBloque('.sgtm-memoria', 'la memoria del calculo'));

const importeDe = (rotulo: string): string | undefined => {
  const linea = laMemoria().getByText(rotulo).closest('.sgtm-memoria__linea') as HTMLElement;
  return linea.querySelector('.sgtm-memoria__importe')?.textContent ?? undefined;
};

describe('la determinacion la pide quien atiende, no el hecho de abrir la pantalla', () => {
  it('al abrir no sale ninguna peticion de determinacion, y los importes salen con guion', async () => {
    montarEnRuta(PREDIAL);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    await waitFor(() => expect(document.querySelector('.sgtm-memoria')).not.toBeNull());

    expect(pedidas.filter((url) => url.startsWith('/rentas/predial/'))).toEqual([]);
    // Los pasos, con su guion: no llego, que no es lo mismo que valer cero.
    expect(importeDe('Valuo Afecto (S/)')).toBe('—');
    expect(importeDe('Tramo 1 — hasta 15 UIT (0.2 %)')).toBe('—');
    // Y el resultado va en su bloque aparte, tambien con guion.
    const resultado = elBloque('.sgtm-memoria__resultado', 'el resultado de la memoria');
    expect(resultado.querySelector('.sgtm-memoria__resultado-valor')?.textContent).toBe('—');
  });

  it('al pulsar «Simular», la memoria se llena con lo que devolvio el servidor', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    await usuario.click(await screen.findByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(
        pedidas.filter((url) => url.startsWith('/rentas/predial/calculo-individual')),
      ).toHaveLength(1),
    );
    // Y las cifras son las del servidor, no compuestas aqui (RNF-083): la
    // operacion a un lado y su resultado al otro, partidos por la flecha que el
    // propio valor trae.
    await waitFor(() =>
      expect(
        elBloque('.sgtm-memoria__resultado', 'el resultado').querySelector(
          '.sgtm-memoria__resultado-valor',
        )?.textContent,
      ).toBe('587.44'),
    );
    const tramo = laMemoria()
      .getByText('Tramo 1 — hasta 15 UIT (0.2 %)')
      .closest('.sgtm-memoria__linea') as HTMLElement;
    expect(tramo.querySelector('.sgtm-memoria__operacion')?.textContent).toBe('S/ 80,250.00');
    expect(tramo.querySelector('.sgtm-memoria__importe')?.textContent).toBe('S/ 160.50');
  });

  /**
   * **La mitad que hace reproducible la cifra.** Antes de determinar, la banda
   * dice que todavia no hay determinacion; despues, con que conjunto **sellado**
   * se calculo. Dos conjuntos del mismo ejercicio dan dos importes distintos y
   * los dos correctos, asi que una cifra sin su conjunto no se puede recalcular.
   */
  it('la banda pasa de «todavia no hay determinacion» a decir el conjunto sellado', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    const banda = await screen.findByLabelText('Sujeto y parámetros de la determinación');
    expect(banda.textContent).toMatch(/Todavía no hay determinación/);
    expect(within(banda).queryByText(/sellado/)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Simular' }));

    await waitFor(() =>
      expect(screen.getByText('Parámetros 2026 v1 · sellado')).toBeInTheDocument(),
    );
    const despues = screen.getByLabelText('Sujeto y parámetros de la determinación');
    expect(despues.textContent).not.toMatch(/Todavía no hay determinación/);
    // Y el sujeto pasa a ser el que redacto el servidor, no el codigo tecleado.
    expect(within(despues).getByText('SUC. RUFINA MEDINA MEDINA')).toBeInTheDocument();
  });

  /**
   * **Simular no es guardar.** No hay caja de observacion, la accion es
   * secundaria, y la primaria sigue apagada con su franja: lo que esta pantalla
   * no puede hacer todavia es **asentar** la determinacion, y eso no cambia
   * porque se pueda ver la cuenta.
   */
  it('simular no pide observacion, y la primaria sigue sin poder guardar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PREDIAL);

    const simular = await screen.findByRole('button', { name: 'Simular' });
    expect(simular.className).toContain('sgtm-boton--secundario');
    expect(screen.queryByLabelText('Observación del usuario')).not.toBeInTheDocument();

    await usuario.click(simular);
    await waitFor(() =>
      expect(screen.getByText('Parámetros 2026 v1 · sellado')).toBeInTheDocument(),
    );

    // Sigue sin haber donde escribir, y la franja lo sigue diciendo.
    expect(screen.queryByLabelText('Observación del usuario')).not.toBeInTheDocument();
    const franja = elBloque('.sgtm-acciones__motivo', 'la franja del motivo');
    expect(franja.getAttribute('data-causa')).toBe('sin-determinacion');
  });
});

/**
 * **La guarda que hace seguro todo lo demas** (#393).
 *
 * El contrato no distingue simular de determinar: las cuatro pantallas tienen
 * **una sola** operacion, y es la misma con la que se asentaria. Hoy no hay
 * controlador, pero el dia que lo haya puede muy bien asentar la determinacion
 * —`RegistrarDeterminacionPredial` existe en el dominio—, y pulsar un boton que
 * dice «Simular» y emitir deuda es el defecto que esto no puede permitirse.
 *
 * Por eso la simulacion **solo existe mientras contesta el proxy de datos**: con
 * `VITE_SGTM_PROXY_DE_DATOS=false` —que es como se apunta al backend de verdad—
 * la accion desaparece y la pantalla vuelve exactamente a lo que enseñaba antes.
 * Quien conecte esa capa web decide entonces, con el controlador delante.
 */
describe('con el backend de verdad contestando, aqui no se simula nada', () => {
  afterEach(() => {
    contestando.valor = true;
  });

  it('sin proxy, la accion no simula y la pantalla vuelve a lo de antes', async () => {
    contestando.valor = false;
    montarEnRuta(PREDIAL);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    // «Simular» sigue siendo una accion del catalogo, asi que el boton esta —lo
    // dibuja la barra como cualquier otra—, pero **no simula**: no es la accion
    // viva de `useSimulacion`, y pulsarla no manda nada.
    const simular = screen.getByRole('button', { name: 'Simular' });
    await userEvent.setup().click(simular);
    await waitFor(() => expect(document.querySelector('.sgtm-memoria')).not.toBeNull());
    expect(pedidas.filter((url) => url.startsWith('/rentas/predial/'))).toEqual([]);
  });
});

describe('quien simula y quien no', () => {
  it('las cuatro pantallas de `POST` declaran su accion, con la etiqueta del catalogo', () => {
    expect(simulacionDe('predial_individual')?.accion).toBe('Simular');
    expect(simulacionDe('predial_masivo')?.accion).toBe('Simular');
    expect(simulacionDe('vehicular_calculo')?.accion).toBe('Simular');
    expect(simulacionDe('alcabala')?.accion).toBe('Liquidar');
  });

  /**
   * `arbitrios` no declara ninguna, y esa asimetria es del contrato: su
   * operacion es un `GET`, asi que sus cifras llegan al abrir y no hay nada que
   * simular. Declararsela acabaria en una excepcion al pulsar —`enviarOperacion`
   * lanza sobre una operacion de lectura— y por eso `useSimulacion` lo comprueba
   * ademas en tiempo de ejecucion.
   */
  it('arbitrios no simula: su operacion es de lectura y ya trae sus cifras', () => {
    expect(simulacionDe('arbitrios')).toBeUndefined();
    // Pero sigue siendo una de las cinco determinaciones: su banda si esta.
    expect(composicionDe('arbitrios').resumenSiempre).toBe(true);
  });

  it('solo la marca que el backend declara viaja en el cuerpo', () => {
    // `VehicularController.PeticionDeCalculoVehicular` declara `simulacion`.
    expect(simulacionDe('vehicular_calculo')?.cuerpo).toEqual({ simulacion: true });
    // Las otras tres no tienen controlador todavia: inventarles una marca seria
    // adivinar la forma de una peticion que nadie ha escrito.
    expect(simulacionDe('predial_individual')?.cuerpo).toBeUndefined();
    expect(simulacionDe('alcabala')?.cuerpo).toBeUndefined();
  });
});
