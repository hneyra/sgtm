import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Contraste de los cuatro estados, calculado y no supuesto (FRO-04 §7).
 *
 * FRO-02 §5 deja pendiente la insignia de advertencia y no verifica el resto.
 * Aqui se lee el color de verdad de la hoja de estilos, se calcula la razon de
 * contraste de WCAG y se exige 4,5:1. La traza de un error es el caso que mas
 * duele si falla: se dicta por telefono, y se dicta leyendola.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const ESTILOS = join(AQUI, '../packages/design-system/src/estilos');

const colores = readFileSync(join(ESTILOS, 'tokens/colors.css'), 'utf8');
const componentes = readFileSync(join(ESTILOS, 'componentes.css'), 'utf8');

/** Los tokens de un bloque de la hoja: `:root` es el tema claro. */
function tokensDe(desde: string): Readonly<Record<string, string>> {
  const bloque = colores.slice(colores.indexOf(desde));
  const fin = bloque.indexOf('\n}');
  const tokens: Record<string, string> = {};
  for (const [, nombre, valor] of bloque
    .slice(0, fin)
    .matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    if (nombre !== undefined && valor !== undefined && tokens[nombre] === undefined) {
      tokens[nombre] = valor;
    }
  }
  return tokens;
}

const CLARO = tokensDe(':root {');
const OSCURO = { ...CLARO, ...tokensDe('[data-theme="dark"]') };

/* ── WCAG 2.1: luminancia relativa y razon de contraste ─────────────────── */

function luminancia(color: string): number {
  const canales = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16) / 255);
  const [r = 0, v = 0, a = 0] = canales.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * v + 0.0722 * a;
}

function contraste(frente: string, fondo: string): number {
  const [claro, oscuro] = [luminancia(frente), luminancia(fondo)].sort((x, y) => y - x);
  return ((claro ?? 0) + 0.05) / ((oscuro ?? 0) + 0.05);
}

/** El token de color que usa un selector de la hoja de estilos. */
function colorDe(selector: string): string {
  const bloque = componentes.slice(componentes.indexOf(`${selector} {`));
  const declaracion = bloque.slice(0, bloque.indexOf('}')).match(/\bcolor:\s*var\((--[\w-]+)\)/);
  const token = declaracion?.[1];
  if (token === undefined) throw new Error(`«${selector}» no declara un color con token`);
  return token;
}

const MINIMO = 4.5;

/** Los textos de los cuatro estados, sobre el fondo de la tarjeta en la que van. */
const TEXTOS: { estado: string; selector: string; sobre: string }[] = [
  { estado: 'vacio · titulo', selector: '.sgtm-aviso__detalle', sobre: '--bg-card' },
  { estado: 'error · detalle', selector: '.sgtm-aviso__detalle', sobre: '--bg-card' },
  {
    estado: 'error · titulo',
    selector: '.sgtm-aviso--error .sgtm-aviso__titulo',
    sobre: '--bg-card',
  },
  { estado: 'error · traza', selector: '.sgtm-aviso__traza', sobre: '--bg-card' },
  { estado: 'tabla · conteo', selector: '.sgtm-tarjeta__conteo', sobre: '--bg-card' },
];

describe('los cuatro estados se leen: 4,5:1 sobre su fondo', () => {
  it.each(TEXTOS)('$estado', ({ selector, sobre }) => {
    const token = colorDe(selector);
    for (const [tema, tokens] of [
      ['claro', CLARO],
      ['oscuro', OSCURO],
    ] as const) {
      const frente = tokens[token];
      const fondo = tokens[sobre];
      expect(frente, `${token} sin valor en el tema ${tema}`).toBeDefined();
      expect(fondo, `${sobre} sin valor en el tema ${tema}`).toBeDefined();
      const razon = contraste(frente ?? '#000000', fondo ?? '#ffffff');
      expect(
        razon,
        `${selector} (${token} sobre ${sobre}) en tema ${tema}: ${razon.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMO);
    }
  });
});

describe('las insignias de estado, texto sobre su propio fondo', () => {
  it.each([
    { insignia: 'ok', frente: '--ok-fg', fondo: '--ok-bg' },
    { insignia: 'atencion', frente: '--warn-fg', fondo: '--warn-bg' },
    { insignia: 'critico', frente: '--bad-fg', fondo: '--bad-bg' },
  ])('$insignia', ({ frente, fondo }) => {
    const color = CLARO[frente];
    const relleno = CLARO[fondo];
    // La de advertencia es la que FRO-02 §5 dejaba pendiente: sin sus tokens, el
    // tono «atencion» salia sin color, no es que saliera con poco contraste.
    expect(color, `${frente} no esta definido`).toBeDefined();
    expect(relleno, `${fondo} no esta definido`).toBeDefined();
    const razon = contraste(color ?? '#000000', relleno ?? '#ffffff');
    expect(razon, `${frente} sobre ${fondo}: ${razon.toFixed(2)}:1`).toBeGreaterThanOrEqual(MINIMO);
  });

  it('el texto sobre el relleno del acento se lee en los dos temas', () => {
    // `--accent-ink` sobre `--accent-soft` es el par del avatar de la cabecera y
    // del icono del lanzador abierto. El tema oscuro redefinia el relleno y no
    // la tinta: el icono quedaba a 1,2:1 sobre su propio fondo, que es
    // exactamente el sitio donde nadie mira hasta que un usuario lo dice.
    for (const [tema, tokens] of [
      ['claro', CLARO],
      ['oscuro', OSCURO],
    ] as const) {
      const tinta = tokens['--accent-ink'];
      const relleno = tokens['--accent-soft'];
      expect(tinta, `--accent-ink sin valor en el tema ${tema}`).toBeDefined();
      expect(relleno, `--accent-soft sin valor en el tema ${tema}`).toBeDefined();
      const razon = contraste(tinta ?? '#000000', relleno ?? '#ffffff');
      expect(
        razon,
        `--accent-ink sobre --accent-soft en tema ${tema}: ${razon.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMO);
    }
  });

  it('la de advertencia es la que FRO-02 §5 dejo escrita', () => {
    expect(CLARO['--warn-bg']).toBe('#f6ecd9');
    expect(CLARO['--warn-fg']).toBe('#8a6420');
  });
});
