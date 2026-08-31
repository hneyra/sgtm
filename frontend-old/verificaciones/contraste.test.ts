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
/**
 * Las dos hojas donde vive el color de un texto.
 *
 * `componentes.css` es la del design system, y `aplicacion.css` la de la
 * aplicacion: ahi viven el riel del asistente, el panel lateral y el aviso de
 * duplicado, que son **los que estrenan color**. Leer solo la primera dejaba
 * fuera exactamente lo nuevo, y la comprobacion parecia mas amplia de lo que
 * era: el «PENDIENTE» del riel llevaba dias a 4,25:1 sin que nada lo dijera.
 */
const HOJAS = [
  readFileSync(join(ESTILOS, 'componentes.css'), 'utf8'),
  readFileSync(join(AQUI, '../apps/backoffice/src/estilos/aplicacion.css'), 'utf8'),
];

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

/**
 * El token de color que usa un selector, en cualquiera de las dos hojas.
 *
 * Resuelve tambien el `var()` anidado —`var(--a, var(--b))`—, que es como se
 * escribe un respaldo: se queda con **el primer token que exista de verdad**. Sin
 * esto, un respaldo cuyo primer token no estuviera definido se medía sobre un
 * token inexistente y la prueba fallaba diciendo «sin valor», que no es lo que
 * pasa: lo que pasa es que rige el segundo. (Hoy no queda ninguno en la hoja
 * —`var(--ink-2, var(--ink-3))` era un respaldo muerto, porque `--ink-2` esta
 * definido en los dos temas—, y por eso mismo conviene que la funcion sepa
 * resolverlo el dia que alguien escriba uno de verdad.)
 */
function colorDe(selector: string): string {
  for (const hoja of HOJAS) {
    const desde = hoja.indexOf(`${selector} {`);
    if (desde < 0) continue;
    const bloque = hoja.slice(desde);
    const declaracion = bloque
      .slice(0, bloque.indexOf('}'))
      .match(/\bcolor:\s*var\((--[\w-]+)(?:\s*,\s*var\((--[\w-]+)\))?\)/);
    const primero = declaracion?.[1];
    const respaldo = declaracion?.[2];
    if (primero !== undefined) {
      return CLARO[primero] !== undefined || respaldo === undefined ? primero : respaldo;
    }
  }
  throw new Error(`«${selector}» no declara un color con token en ninguna hoja`);
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
  { estado: 'campo · ayuda', selector: '.sgtm-campo__ayuda', sobre: '--bg-card' },
  // Los del asistente y el panel lateral (#320, #321), que viven en la hoja de
  // la aplicacion. El del riel es el que importa: el estado del paso es lo que
  // **sustituye al color** para decir cual va (FRO-02 §2.1), asi que un texto
  // que no se lee deja el paso comunicado solo por color.
  { estado: 'riel · estado del paso', selector: '.sgtm-riel__estado', sobre: '--bg-card' },
  {
    estado: 'asistente · qué se da de alta',
    selector: '.sgtm-asistente__flujo',
    sobre: '--bg-card',
  },
  { estado: 'asistente · nota', selector: '.sgtm-asistente__nota', sobre: '--bg-card' },
  { estado: 'asistente · lo que falta', selector: '.sgtm-asistente__falta', sobre: '--bg-card' },
  { estado: 'panel lateral · lo que falta', selector: '.sgtm-lateral__falta', sobre: '--bg-card' },
  // El aviso de duplicado lleva su propio relleno: se mide sobre el, no sobre
  // la tarjeta.
  { estado: 'duplicado · aviso', selector: '.sgtm-duplicado', sobre: '--warn-bg' },
  /* Los tres que estrena #332, y los tres cuentan algo que no se puede
     comunicar de otra forma:

       el motivo    por que la accion primaria no puede guardar. Es **lo unico**
                    que hay junto a un boton apagado; ilegible, la pantalla
                    vuelve a estar muda
       la banda     cuantas filas hay elegidas en un acto irreversible
       el pendiente «Deuda a hoy: —», que es la respuesta a la pregunta que trae
                    a la gente a la ventanilla

     La banda se mide sobre `--bg-elev`, que es su relleno: llevaba
     `var(--bg-suave, ...)`, y `--bg-suave` **no existe en ninguna hoja** —el
     respaldo tapaba el token inventado, asi que nadie lo noto—. */
  { estado: 'acciones · motivo', selector: '.sgtm-acciones__motivo', sobre: '--bg-card' },
  { estado: 'tabla · banda de selección', selector: '.sgtm-seleccion', sobre: '--bg-elev' },
  { estado: 'resumen · lo pendiente', selector: '.sgtm-resumen__pendiente', sobre: '--bg-card' },
  // Y el rotulo de cada dato de la cabecera-resumen, que estaba en `--ink-4`:
  // 3,13:1. Sin el rotulo, el valor de al lado no se sabe de que es.
  { estado: 'resumen · rótulo del dato', selector: '.sgtm-resumen__dato dt', sobre: '--bg-card' },
  /* Los del campo que resuelve la unidad del alta de deuda (#331). Los cuatro
     primeros van sobre `--bg-elev`, que es el relleno de la tarjeta de la
     unidad resuelta; la nota de la busqueda, sobre la tarjeta de la seccion.
     Lo que cuentan no se puede comunicar de otra forma:

       el codigo    **cual** unidad quedo resuelta, que es lo que decide sobre
                    que obligacion se asienta el alta
       el detalle   de quien es y donde esta, que es como se comprueba
       la nota      si se busco, si no habia, o cuantas hay y que estan
                    recortadas
       el cruce     que la unidad resuelta es de otro titular */
  { estado: 'resolutor · rótulo', selector: '.sgtm-resolutor__eyebrow', sobre: '--bg-elev' },
  {
    estado: 'resolutor · código resuelto',
    selector: '.sgtm-resolutor__codigo',
    sobre: '--bg-elev',
  },
  { estado: 'resolutor · detalle', selector: '.sgtm-resolutor__detalle', sobre: '--bg-elev' },
  {
    estado: 'resolutor · nota de la búsqueda',
    selector: '.sgtm-resolutor__nota',
    sobre: '--bg-card',
  },
  {
    estado: 'resolutor · cruce de titular',
    selector: '.sgtm-resolutor__cruce',
    sobre: '--warn-bg',
  },
  {
    estado: 'resolutor · cruce de titular, título',
    selector: '.sgtm-resolutor__cruce-titulo',
    sobre: '--warn-bg',
  },
  /* Los del inicio que pregunta a quien se atiende (#296). Los dos primeros van
     sobre la pagina —la pregunta no esta dentro de ninguna tarjeta—; los cuatro
     de las franjas, sobre la tarjeta que las contiene. Lo que cuentan no se
     puede comunicar de otra forma:

       la ayuda     si se busco, cuantos hay y si Intro basta. Es la unica
                    region viva de la pantalla
       la fuente    **de que padron** salio cada franja, que es lo que explica
                    por que dos personas ven distinto numero de franjas
       el detalle   el documento, o de que vehiculo se trata: lo que distingue a
                    un homonimo del otro
       el codigo    con que identificador se abre lo elegido */
  { estado: 'inicio · rótulo', selector: '.sgtm-atencion__eyebrow', sobre: '--bg' },
  { estado: 'inicio · ayuda de la búsqueda', selector: '.sgtm-atencion__ayuda', sobre: '--bg' },
  { estado: 'inicio · camino de vuelta', selector: '.sgtm-atencion__vuelta', sobre: '--bg' },
  /* El texto de sugerencia de la caja, que va **sobre la tarjeta** porque la
     caja lleva su propio relleno. Sin regla propia lo pintaba el navegador —una
     opacidad sobre el color del texto—: 3,8:1 en tema oscuro, y ahi va la lista
     de lo que se puede teclear, que es lo unico que dice como se busca antes de
     escribir nada. El selector lleva pseudoelemento, y `colorDe` lo encuentra
     igual: lo que busca es el bloque literal y su declaracion de `color`. */
  {
    estado: 'inicio · sugerencia de la caja',
    selector: '.sgtm-atencion__caja input::placeholder',
    sobre: '--bg-card',
  },
  {
    estado: 'inicio · fuente de la franja',
    selector: '.sgtm-atencion__fuente-opcion',
    sobre: '--bg-card',
  },
  {
    estado: 'inicio · módulo de la franja',
    selector: '.sgtm-atencion__fuente-modulo',
    sobre: '--bg-card',
  },
  {
    estado: 'inicio · detalle de la fila',
    selector: '.sgtm-atencion__detalle',
    sobre: '--bg-card',
  },
  { estado: 'inicio · código de la fila', selector: '.sgtm-atencion__codigo', sobre: '--bg-card' },
  /* Los seis de la ficha 360° (#297). Los tres primeros van sobre la tarjeta de
     la cabecera; los tres del panel, sobre la pagina —la linea de fuente y los
     enlaces de salida no estan dentro de ninguna tarjeta—. Lo que cuentan no se
     puede comunicar de otra forma:

       el rotulo    de que es cada dato de la identidad: sin el, el codigo y el
                    documento son dos numeros seguidos
       la nota      **por que** falta algo —el nombre, el total consolidado— y a
                    quien pedirselo. Es lo unico que separa «no tienes permiso»
                    de «esta persona no debe nada»
       la fuente    de que opcion salio lo que se esta viendo (ADR-0014 §1)
       la accion    a donde se sigue con el contexto puesto, y su nota

     El enlace de la accion **ademas no se distingue solo por color**: lleva
     subrayado en reposo, porque el acento contra el texto vecino da 1,92:1 y eso
     es un enlace invisible para quien no distingue ese color (WCAG 1.4.1). */
  { estado: 'ficha · rótulo', selector: '.sgtm-ficha__eyebrow', sobre: '--bg-card' },
  { estado: 'ficha · rótulo del dato', selector: '.sgtm-ficha__dato dt', sobre: '--bg-card' },
  // La nota sale en la cabecera y bajo el resumen de saldos, que no lleva
  // relleno propio: se mide sobre la pagina, que es el fondo mas exigente.
  { estado: 'ficha · nota', selector: '.sgtm-ficha__nota', sobre: '--bg' },
  { estado: 'ficha · fuente del panel', selector: '.sgtm-ficha__fuente', sobre: '--bg' },
  { estado: 'ficha · acción de salida', selector: '.sgtm-ficha__accion', sobre: '--bg' },
  { estado: 'ficha · nota de la acción', selector: '.sgtm-ficha__accion-nota', sobre: '--bg' },
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

/**
 * **Lo que es un enlace tiene que verse que lo es.**
 *
 * La marca de la barra lateral paso a ser la vuelta al inicio (#296) y siguio
 * pintada como un bloque de identidad: sin `:hover` y sin foco visible propio,
 * un enlace que no reacciona a nada es un enlace que nadie pulsa —y hasta que
 * gano su entrada en el lanzador era el **unico** camino de vuelta—.
 *
 * Se comprueba leyendo la hoja y no el DOM porque es una regla de estilo: jsdom
 * no resuelve pseudoclases, asi que una prueba de componente no podria verlo.
 */
describe('la vuelta al inicio se ve que se puede pulsar', () => {
  const APLICACION = HOJAS[1] ?? '';

  it.each([
    ['el puntero encima', '.sgtm-modulos__marca:hover'],
    ['el foco del teclado', '.sgtm-modulos__marca:focus-visible'],
  ])('la marca responde a %s', (_que, selector) => {
    const desde = APLICACION.indexOf(`${selector} {`);
    expect(desde, `«${selector}» no existe en la hoja de la aplicacion`).toBeGreaterThanOrEqual(0);
    // Y con algo que se vea: un bloque vacio cumpliria la letra y nada mas.
    const bloque = APLICACION.slice(desde, APLICACION.indexOf('}', desde));
    expect(bloque).toMatch(/(background|outline):/);
  });
});

/**
 * **Un enlace no se distingue solo por color** (WCAG 1.4.1, FRO-02 §2.1).
 *
 * Las acciones de la ficha 360° iban sin subrayar y con el acento como unica
 * diferencia frente al texto que tienen al lado: 1,92:1 entre los dos colores,
 * o sea nada para quien no distingue ese color. El subrayado en reposo es la
 * marca que no depende de la vista del color, y se comprueba leyendo la hoja
 * porque es una regla de estilo —jsdom no resuelve el `:hover`, asi que una
 * prueba de componente no podria verlo—.
 */
/**
 * **La cabecera del registro no se va al desplazarse** (#498 F3).
 *
 * Es la respuesta a «no sé si guardé»: una ficha son hasta once pestañas del
 * prototipo, y quien baja a corregir un campo perdía de vista qué predio estaba
 * tocando y si lo suyo seguía sin mandar. Se comprueba leyendo la hoja porque
 * jsdom no resuelve `position`, así que ninguna prueba de componente lo vería
 * —el mismo trato que la marca del riel—.
 */
describe('la cabecera del registro se queda a la vista', () => {
  const APLICACION = HOJAS[1] ?? '';

  it('.sgtm-resumen es sticky, y por debajo de la cabecera de la aplicación', () => {
    const desde = APLICACION.indexOf('.sgtm-resumen {');
    expect(desde, '«.sgtm-resumen» no existe en la hoja').toBeGreaterThanOrEqual(0);
    const bloque = APLICACION.slice(desde, APLICACION.indexOf('}', desde));
    expect(bloque).toMatch(/position:\s*sticky/);
    // Con `top: 0` se metería debajo de la cabecera de la aplicación, que
    // también es sticky: se solaparían las dos y el código quedaría tapado.
    expect(bloque).toMatch(/top:\s*[1-9]/);
  });
});

describe('lo que es un enlace se ve que lo es sin mirar el color', () => {
  const APLICACION = HOJAS[1] ?? '';

  it('la acción de la ficha lleva subrayado en reposo', () => {
    const desde = APLICACION.indexOf('.sgtm-ficha__accion {');
    expect(desde, '«.sgtm-ficha__accion» no existe en la hoja').toBeGreaterThanOrEqual(0);
    const bloque = APLICACION.slice(desde, APLICACION.indexOf('}', desde));
    expect(bloque).toMatch(/text-decoration:\s*underline/);
  });
});

describe('las insignias de estado, texto sobre su propio fondo', () => {
  it.each([
    { insignia: 'ok', frente: '--ok-fg', fondo: '--ok-bg' },
    { insignia: 'atencion', frente: '--warn-fg', fondo: '--warn-bg' },
    { insignia: 'critico', frente: '--bad-fg', fondo: '--bad-bg' },
  ])('$insignia', ({ frente, fondo }) => {
    // **En los dos temas.** La insignia lleva su propio relleno, asi que hoy los
    // dos dan lo mismo —el tema oscuro no redefine ninguno de los seis tokens—,
    // y eso es justo lo que hay que fijar: redefinir la mitad de un par es el
    // defecto que ya se pago una vez con `--accent-ink`, que quedo a 1,15:1
    // porque el oscuro cambio el relleno y no la tinta.
    for (const [tema, tokens] of [
      ['claro', CLARO],
      ['oscuro', OSCURO],
    ] as const) {
      const color = tokens[frente];
      const relleno = tokens[fondo];
      // La de advertencia es la que FRO-02 §5 dejaba pendiente: sin sus tokens,
      // el tono «atencion» salia sin color, no es que saliera con poco contraste.
      expect(color, `${frente} no esta definido en el tema ${tema}`).toBeDefined();
      expect(relleno, `${fondo} no esta definido en el tema ${tema}`).toBeDefined();
      const razon = contraste(color ?? '#000000', relleno ?? '#ffffff');
      expect(
        razon,
        `${frente} sobre ${fondo} en tema ${tema}: ${razon.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MINIMO);
    }
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

/**
 * El acento **no lleva texto**, y por eso se mide contra otro minimo.
 *
 * WCAG 1.4.11 pide 3:1 para lo que comunica sin texto, y por `--accent` pasan
 * las dos cosas de esa clase que la caja necesita: el `outline` del foco visible
 * (`base.css`, RNF-082 — se atiende con teclado) y el `accent-color` de las
 * casillas con que se elige una cuota. En tema oscuro daba **1,53:1**: el foco
 * no se veia, y con el foco invisible el teclado deja de poder operarse.
 *
 * Y el par completo, porque los dos lados se mueven juntos: si el acento se
 * aclara para verse sobre el papel oscuro, lo que va **encima** de el —el rotulo
 * del boton primario, las iniciales de la marca, el texto del portal— tiene que
 * oscurecerse. Era `#fff` escrito a mano en cuatro sitios; con el acento claro
 * daba 1,98:1. Redefinir la mitad de un par es el defecto que ya se pago una vez
 * con `--accent-ink`.
 */
describe('el acento se ve en los dos temas, y lo que va encima tambien', () => {
  const NO_TEXTUAL = 3;

  it.each([
    ['claro', CLARO],
    ['oscuro', OSCURO],
  ] as const)('%s', (tema, tokens) => {
    const acento = tokens['--accent'];
    const fondo = tokens['--bg-card'];
    const encima = tokens['--accent-contraste'];
    expect(acento, `--accent sin valor en el tema ${tema}`).toBeDefined();
    expect(encima, `--accent-contraste sin valor en el tema ${tema}`).toBeDefined();

    // El foco y la casilla, sobre la superficie donde se dibujan.
    const foco = contraste(acento ?? '#000000', fondo ?? '#ffffff');
    expect(
      foco,
      `--accent sobre --bg-card en tema ${tema}: ${foco.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(NO_TEXTUAL);

    // Y el rotulo que va encima del acento, que si es texto: 4,5:1.
    const rotulo = contraste(encima ?? '#ffffff', acento ?? '#000000');
    expect(
      rotulo,
      `--accent-contraste sobre --accent en tema ${tema}: ${rotulo.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  /**
   * Y el tema se le dice **al navegador**, no solo a la hoja.
   *
   * Sin `color-scheme`, el cromo nativo —casillas, desplegables, barras de
   * desplazamiento— se pinta claro sobre el papel casi negro del tema oscuro: la
   * casilla con que se elige una cuota salia blanca en un fondo #1c1914.
   */
  it('cada tema declara su `color-scheme`', () => {
    expect(colores).toMatch(/:root\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(colores).toMatch(/\[data-theme="dark"\]\s*\{[\s\S]*?color-scheme:\s*dark/);
  });
});
