import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **Dos bloques lejanos no pueden pelearse por la misma propiedad.**
 *
 * El defecto que esto cierra no daba ningun sintoma donde se cometio. La
 * cabecera-resumen de las fichas se dibuja con `.sgtm-resumen` —una columna con
 * tres bandas separadas por filetes— y el paso de cierre del alta guiada declaro
 * **otro** bloque con el mismo nombre, una rejilla de dos columnas, mil
 * setecientas lineas mas abajo. Como estaba despues, ganaba: los cuatro
 * resumenes del sistema —los tres de rentas y el de catastro— perdieron sus
 * bandas, y nadie lo vio: el responsable esta al otro extremo de la hoja y
 * ninguna prueba de dibujo mira el CSS calculado.
 *
 * Lo que **no** se prohibe, porque es como se escribe CSS:
 *
 *   - repetir un selector dentro de un `@media`, que es exactamente para lo que
 *     sirve (aqui solo se leen los bloques **sin indentar**);
 *   - afinar un selector justo debajo de su base —`.sgtm-lateral__nota,
 *     .sgtm-lateral__falta { color: var(--ink-3) }` y, pegado,
 *     `.sgtm-lateral__falta { color: var(--error-texto) }`—: los dos se leen de
 *     una vez y la intencion es evidente;
 *   - repetir un selector para anadir propiedades que el otro bloque no toca.
 *
 * Lo que se prohibe es la unica combinacion que nadie puede ver de un vistazo:
 * **dos bloques separados por otros que declaran la misma propiedad con valores
 * distintos**.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const HOJAS = [
  ['aplicacion.css', join(AQUI, '../apps/backoffice/src/estilos/aplicacion.css')],
  ['componentes.css', join(AQUI, '../packages/design-system/src/estilos/componentes.css')],
] as const;

interface Bloque {
  readonly selector: string;
  /** El orden en que aparece en la hoja: es lo que dice si dos son vecinos. */
  readonly posicion: number;
  readonly declaraciones: Readonly<Record<string, string>>;
}

/** Los bloques declarados **sin indentar**, que son los del nivel superior. */
function bloquesDeNivelSuperior(hoja: string): Bloque[] {
  const bloques: Bloque[] = [];
  for (const encontrado of hoja.matchAll(/^([.#][^{@\n]*?)\s*\{([^}]*)\}/gm)) {
    const selector = (encontrado[1] ?? '').trim();
    const declaraciones: Record<string, string> = {};
    for (const linea of (encontrado[2] ?? '').split(';')) {
      const [propiedad, ...resto] = linea.split(':');
      const nombre = (propiedad ?? '').trim();
      if (nombre === '' || resto.length === 0) continue;
      declaraciones[nombre] = resto.join(':').trim();
    }
    bloques.push({ selector, posicion: bloques.length, declaraciones });
  }
  return bloques;
}

/** Las propiedades en las que dos bloques dicen cosas distintas. */
function seContradicen(uno: Bloque, otro: Bloque): string[] {
  return Object.keys(uno.declaraciones).filter(
    (propiedad) =>
      otro.declaraciones[propiedad] !== undefined &&
      otro.declaraciones[propiedad] !== uno.declaraciones[propiedad],
  );
}

describe('ningun bloque lejano contradice a otro con su mismo selector', () => {
  it.each(HOJAS)('%s', (_nombre, ruta) => {
    const bloques = bloquesDeNivelSuperior(readFileSync(ruta, 'utf8'));
    expect(bloques.length).toBeGreaterThan(50);

    const porSelector = new Map<string, Bloque[]>();
    for (const bloque of bloques) {
      porSelector.set(bloque.selector, [...(porSelector.get(bloque.selector) ?? []), bloque]);
    }

    const colisiones: string[] = [];
    for (const [selector, repetidos] of porSelector) {
      for (let i = 1; i < repetidos.length; i += 1) {
        const previo = repetidos[i - 1];
        const actual = repetidos[i];
        if (previo === undefined || actual === undefined) continue;
        // Vecinos: afinar justo debajo de la base se lee de una vez.
        if (actual.posicion - previo.posicion <= 1) continue;
        const enfrentadas = seContradicen(previo, actual);
        if (enfrentadas.length > 0) {
          colisiones.push(`${selector} → ${enfrentadas.join(', ')}`);
        }
      }
    }

    expect(colisiones, `bloques lejanos que se contradicen: ${colisiones.join(' · ')}`).toEqual([]);
  });
});
