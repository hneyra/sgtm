import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * **Lo que el navegador del ciudadano guarda, y lo que vuelve a pedir** (#298).
 *
 * Desde que hay **dos** aplicaciones en el mismo origen —el back-office en `/` y
 * el portal en `/portal/` (ADR-0016 §3)— la politica de cache dejo de poder
 * escribirse con un prefijo y una coincidencia exacta: `location /assets/` no
 * cubre `/portal/assets/`, y `location = /index.html` no cubre
 * `/portal/index.html`. El paquete del ciudadano se servia **sin ninguna
 * cabecera de cache**, y eso no se ve en ninguna pantalla: unas veces el
 * navegador vuelve a descargar activos con huella que no cambian nunca —desde un
 * telefono, con la red que haya, que es el unico flujo del sistema que no usa
 * alguien de la municipalidad— y otras se queda con un `index.html` viejo que
 * apunta a activos que ya no existen.
 *
 * ── Por que se simula la precedencia y no se busca un texto ────────────────
 *
 * Comprobar que el archivo «contiene immutable» habria pasado en verde con la
 * configuracion anterior, que ya lo contenia. Lo que hay que comprobar es **que
 * regla gana** para cada ruta, y eso son las reglas de nginx: primero la
 * coincidencia exacta (`=`), despues el prefijo mas largo —que se queda con la
 * peticion si lleva `^~`—, despues las expresiones regulares **en el orden en
 * que estan escritas**, y si ninguna casa, el prefijo mas largo que se habia
 * apuntado. Las regex ganan a los prefijos, y de eso depende que `/portal/`
 * siga sirviendo su `try_files` para todo lo demas.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const NGINX = readFileSync(join(AQUI, '../nginx.conf'), 'utf8');

interface Bloque {
  readonly modificador: '' | '=' | '^~' | '~' | '~*';
  readonly patron: string;
  readonly cuerpo: string;
}

/** Los `location` del archivo, en el orden en que estan escritos. */
function locations(): readonly Bloque[] {
  const encontrados: Bloque[] = [];
  for (const [, modificador = '', patron, cuerpo] of NGINX.matchAll(
    /location\s+(=|\^~|~\*|~)?\s*([^\s{]+)\s*\{([^}]*)\}/g,
  )) {
    encontrados.push({
      modificador: modificador as Bloque['modificador'],
      patron: patron as string,
      cuerpo: cuerpo as string,
    });
  }
  return encontrados;
}

const BLOQUES = locations();

/**
 * Que bloque atiende una ruta, con las reglas de precedencia de nginx.
 *
 * Devuelve `undefined` cuando ninguno la atiende, que en este archivo seria un
 * defecto: `location /` cubre todo lo que no cubra otro.
 */
function bloqueQueSirve(ruta: string): Bloque | undefined {
  const exacto = BLOQUES.find((b) => b.modificador === '=' && b.patron === ruta);
  if (exacto !== undefined) return exacto;

  const prefijos = BLOQUES.filter(
    (b) => (b.modificador === '' || b.modificador === '^~') && ruta.startsWith(b.patron),
  );
  const masLargo = prefijos.reduce<Bloque | undefined>(
    (mejor, b) => (mejor === undefined || b.patron.length > mejor.patron.length ? b : mejor),
    undefined,
  );
  if (masLargo?.modificador === '^~') return masLargo;

  const regex = BLOQUES.find(
    (b) =>
      (b.modificador === '~' || b.modificador === '~*') &&
      new RegExp(b.patron, b.modificador === '~*' ? 'i' : '').test(ruta),
  );
  return regex ?? masLargo;
}

describe('la politica de cache cubre las dos aplicaciones', () => {
  it('encuentra los location que dice leer', () => {
    // Sin esto, un cambio de formato del archivo dejaria a `locations()`
    // devolviendo una lista vacia y a todo lo de abajo comprobando nada.
    expect(BLOQUES.length).toBeGreaterThanOrEqual(4);
  });

  it('y todos viven en el unico server del archivo', () => {
    // La simulacion aplana los `location` sin mirar en que `server` estan: con
    // un segundo `server { listen 8081; }` sirviendo `/portal/` sin ninguna
    // politica de cache, las pruebas de abajo seguirian en verde leyendo los
    // `location` del primero. Mientras el archivo tenga un solo `server`, el
    // aplanado es fiel; el dia que haga falta un segundo, esta linea obliga a
    // ensenarle a la simulacion a distinguirlos.
    expect(NGINX.match(/^\s*server\s*\{/gm)).toHaveLength(1);
  });

  it.each([
    ['el back-office', '/assets/index-C3fkxU7l.js'],
    ['el portal', '/portal/assets/index-C3fkxU7l.js'],
  ])('los activos con huella de %s se guardan un ano', (_que, ruta) => {
    const bloque = bloqueQueSirve(ruta);

    expect(bloque?.cuerpo).toMatch(/expires\s+1y;/);
    expect(bloque?.cuerpo).toMatch(/add_header\s+Cache-Control\s+"public,\s*immutable";/);
  });

  it.each([
    ['el back-office', '/index.html'],
    ['el portal', '/portal/index.html'],
  ])('el index.html de %s no se guarda', (_que, ruta) => {
    const bloque = bloqueQueSirve(ruta);

    expect(bloque?.cuerpo).toMatch(/add_header\s+Cache-Control\s+"no-cache";/);
    // Y no se guarda **un ano**: es el archivo que dice que activos pedir.
    expect(bloque?.cuerpo).not.toMatch(/expires\s+1y;/);
  });
});

describe('y no le quita nada a lo que ya funcionaba', () => {
  it('una ruta del portal la sigue resolviendo su propio index.html', () => {
    // Sin esto, el ciudadano que recarga en `/portal/loQueSea` recibe la
    // aplicacion de ventanilla (es lo que `location /portal/` existe para
    // impedir, y una regex que ganara aqui se lo llevaria por delante).
    expect(bloqueQueSirve('/portal/loQueSea')?.cuerpo).toContain('/portal/index.html');
  });

  it('una ruta del back-office la sigue resolviendo el suyo', () => {
    const bloque = bloqueQueSirve('/catastro/fichas');

    expect(bloque?.cuerpo).toContain('/index.html');
    expect(bloque?.cuerpo).not.toContain('/portal/index.html');
  });

  it('la API se sigue reenviando a la aplicacion', () => {
    expect(bloqueQueSirve('/api/v1/rentas/contribuyentes')?.cuerpo).toContain('proxy_pass');
  });
});
