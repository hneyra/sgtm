import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { elBloque } from '../../pruebas/nodos';
import { todasLasPantallas } from '../../catalogo';

/**
 * **La determinación se explica** (#333): «Cálculo individual del impuesto
 * predial» deja de ser un formulario de 19 campos —15 de solo lectura— y se lee
 * como lo que es, la memoria de cálculo de una liquidación.
 *
 * El orden que importa es el del cálculo, y es el que se comprueba aquí:
 *
 *   1. los predios del contribuyente, con su `%` de propiedad y su valúo
 *   2. la base imponible **del conjunto**
 *   3. la escala del ejercicio: tramos en UIT y alícuotas
 *   4. las cuotas, con sus vencimientos
 *
 * Y la afirmación de dominio que la pantalla no hacía y que decide todo lo
 * demás: **la base es por contribuyente, no por predio** (CLAUDE.md, NEG-05 §1,
 * `RT011BaseImponibleDelContribuyente`). Leída sin ella, la pantalla enseña una
 * tabla de predios encima de unos tramos, y la lectura natural —un impuesto por
 * predio, sumado después— es el error sistemático a la baja que NEG-05 nombra.
 *
 * **Esta pantalla no calcula nada** (D-02a): lo que el servidor no determine
 * sale con «—», y aquí se comprueba que sigue saliendo así.
 */

const PREDIAL = '/rentas-registro/predial-individual';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/**
 * Los bloques de la memoria, **en el orden en que están en la página**.
 *
 * Se leen del documento y no de una lista escrita aquí: lo que se comprueba es
 * el orden que ve quien lee la pantalla, y ese lo decide el renderizador.
 */
const laMemoria = (): readonly string[] => {
  const nodos = document.querySelectorAll<HTMLElement>(
    '.sgtm-aviso, .sgtm-tarjeta__titulo, .sgtm-totales, .sgtm-indice, .sgtm-formulario, .sgtm-acciones',
  );
  return [...nodos].map((nodo) => nodo.className.split(' ')[0] ?? '');
};

describe('la memoria de calculo se lee en el orden del calculo', () => {
  it('el aviso de dominio va primero, y dice de quien es la base', async () => {
    montarEnRuta(PREDIAL);

    const aviso = await screen.findByText('La base es del contribuyente, no de cada predio');
    const detalle = aviso.closest('.sgtm-aviso') as HTMLElement;

    // Los tramos se aplican **al conjunto**, ponderado por el `%` de propiedad.
    expect(detalle.textContent).toMatch(/al conjunto de los predios del contribuyente/);
    expect(detalle.textContent).toMatch(/porcentaje de propiedad/);
    // Y no se calcula predio por predio, que es lo que la pantalla parecía decir.
    expect(detalle.textContent).toMatch(/no se calcula predio por predio/);
    // La pantalla no calcula: lo determina el servidor con su conjunto sellado.
    expect(detalle.textContent).toMatch(/conjunto de parámetros sellado/);
    // Y un guion no es un cero.
    expect(detalle.textContent).toMatch(/«—», que no es cero/);
  });

  it('los predios van antes que la base y que la escala, y las cuotas al final', async () => {
    montarEnRuta(PREDIAL);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    /* 1. Los predios que integran la base. La tabla se dibuja **vacía** y eso
       es lo correcto: la operación de esta pantalla es un `POST`, no se pide al
       abrir, y nada se finge en el proxy (ADR-0010). Lo que sí está es su
       rótulo, que es lo que dice de qué es el primer paso. */
    expect(
      await screen.findByRole('heading', { name: 'Predios que integran la base imponible' }),
    ).toBeInTheDocument();
    // Y sus columnas las declara el catálogo, con el `%` de propiedad —lo que
    // pondera el aporte de cada predio— y el valúo afecto.
    const pantallas = await todasLasPantallas();
    const columnas = pantallas['predial_individual']?.tabla?.cols ?? [];
    expect(columnas).toContain('% prop.');
    expect(columnas).toContain('Valuo Afecto S/');

    /* 2, 3 y 4: las secciones del manual, **en su orden y sin renombrar**
       (RNF-080). La base del conjunto y la escala viven en la primera; las
       cuotas, en la última.

       Y **el paso 1 está en el índice**, el primero. Estaba fuera: la tabla se
       dibuja encima de las secciones y fuera de la rejilla del índice (FRO-03
       §5), así que el índice empezaba en la escala y al único paso desde el que
       se entiende el resto no llevaba nada. El rótulo es el del catálogo, no
       uno redactado aquí. */
    const indice = screen.getByRole('navigation', { name: 'Secciones de la pantalla' });
    const entradas = within(indice)
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toEqual([
      'Predios que integran la base imponible',
      'Escala progresiva acumulativa',
      'Beneficios aplicados',
      'Emisión y cuotas',
      'Ir a las acciones',
    ]);

    /* **El rótulo no cuenta la tabla como sección** (#342, nit 4): con las
       tres secciones del manual más la tabla son cuatro entradas, y decir «4
       secciones» acusaría a la tabla de serlo. Se dice «bloques» —la misma
       palabra que ya usa el docblock de `previa`— solo cuando hay tabla; sin
       ella (cualquier otra pantalla con índice) sigue diciendo «secciones». */
    expect(indice.querySelector('.sgtm-indice__eyebrow')?.textContent).toBe('4 bloques');

    // Y esa entrada lleva a la tarjeta de la tabla, no a ningún sitio: un
    // `id` que no existe deja la entrada muda y nada lo delata.
    const aLaTabla = within(indice).getByRole('button', {
      name: 'Ir a Predios que integran la base imponible',
    });
    const ancla = document.getElementById('sgtm-tabla-de-la-pantalla');
    expect(ancla).not.toBeNull();
    expect(ancla).toContainElement(
      screen.getByRole('heading', { name: 'Predios que integran la base imponible' }),
    );
    // Enfocable por el índice y **fuera del recorrido del tabulador**
    // (FRO-04 §7), igual que las secciones del formulario.
    expect(ancla).toHaveAttribute('tabindex', '-1');
    expect(aLaTabla).toBeInTheDocument();

    // Y el orden de los bloques en la página: aviso, predios, memoria, acciones.
    const memoria = laMemoria();
    expect(memoria.indexOf('sgtm-aviso')).toBeLessThan(memoria.indexOf('sgtm-tarjeta__titulo'));
    expect(memoria.indexOf('sgtm-tarjeta__titulo')).toBeLessThan(memoria.indexOf('sgtm-indice'));
    expect(memoria.indexOf('sgtm-indice')).toBeLessThan(memoria.indexOf('sgtm-formulario'));
    expect(memoria.indexOf('sgtm-formulario')).toBeLessThan(memoria.indexOf('sgtm-acciones'));
  });

  /**
   * **Ni una cifra tributaria compilada** (regla 5, D-02a).
   *
   * La escala del ejercicio —el valor de la UIT, los límites de cada tramo y sus
   * alícuotas— vive en datos versionados y sellados, no en la interfaz. Los
   * rótulos son los del manual y los trae el catálogo; los importes se quedan en
   * «—» hasta que el servidor los determine, que es exactamente lo que la
   * franja honesta de esta pantalla anuncia.
   */
  it('la escala se rotula con el manual y sus importes salen del servidor, no de aqui', async () => {
    montarEnRuta(PREDIAL);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    const formulario = within(elBloque('.sgtm-formulario', 'el formulario'));

    for (const rotulo of [
      'UIT vigente 2026 (S/)',
      'Tramo 1 — hasta 15 UIT (0.2 %)',
      'Tramo 3 — más de 60 UIT (1.0 %)',
      'Impuesto insoluto anual (S/)',
      'Cuota 1 — vence 28/02',
    ]) {
      // Un campo `ro` sin valor dibuja el guion: no llegó, no vale cero.
      expect(formulario.getByLabelText(rotulo).textContent).toBe('—');
    }
  });

  /**
   * Y el catálogo sigue siendo el del manual: la composición **no renombra ni
   * reagrupa** nada (RNF-080). Si alguien moviera una sección para «mejorar» el
   * orden, esto lo dice.
   */
  it('las secciones son las tres del catalogo, en el orden en que el manual las declara', async () => {
    const pantallas = await todasLasPantallas();
    expect((pantallas['predial_individual']?.secciones ?? []).map((s) => s.label)).toEqual([
      'Escala progresiva acumulativa',
      'Beneficios aplicados',
      'Emisión y cuotas',
    ]);
  });

  /**
   * **No se pide nada al abrir**, y ese es el otro motivo de que todo salga con
   * «—»: la operación de esta pantalla es un `POST`, y abrir una pantalla no
   * puede lanzar una determinación. Nada se finge en el proxy (ADR-0010): el
   * contrato que la capa web tendrá que publicar está anotado en `rentas/index.ts`.
   */
  it('abrir la pantalla no pide ninguna determinacion', async () => {
    const proxy = globalThis.fetch;
    const pedidas: string[] = [];
    globalThis.fetch = (entrada, opciones) => {
      pedidas.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };
    try {
      montarEnRuta(PREDIAL);
      await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
      await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());
      expect(pedidas.filter((url) => url.includes('/rentas/predial/'))).toEqual([]);
    } finally {
      globalThis.fetch = proxy;
    }
  });
});
