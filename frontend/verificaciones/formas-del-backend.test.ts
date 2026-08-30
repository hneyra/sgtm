import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EN_LA_FORMA_DEL_BACKEND,
  escrituraDe,
  listaDe,
  paginadoDe,
  recursoDe,
} from '../packages/api-mock/src/recursos';

/**
 * **Lo que el proxy publica es lo que el backend publica** (#400).
 *
 * `packages/api-mock/src/recursos.ts` copia a mano la forma de cada `Resource`
 * del backend: el sobre, los nombres de campo, el anidamiento. Copiada a mano
 * quiere decir que **nada la comprueba**, y de ahi salio el defecto de #379 —el
 * proxy servia un `licenciaConducir` que ni `PapeletaResource` ni `Papeleta`
 * modelan—. La respuesta de entonces fue un guardia con los veinte campos de
 * **un** recurso, escrito a mano en `papeletas.test.ts`.
 *
 * Esto es ese guardia para todas, y sin lista que mantener: las formas las
 * **deriva el backend** de los `record` de sus controladores
 * (`FormasDeLaApiTest` → `docs/50-api/formas-de-la-api.json`), y aqui se
 * comparan contra lo que el proxy contesta de verdad.
 *
 * ── Por que importa para encender una ruta ────────────────────────────────
 *
 * Encender una ruta es dejar que conteste el backend en vez del proxy. Lo que
 * hace que eso sea seguro no es que el backend exista, sino que **la pantalla ya
 * este leyendo la forma que el backend manda**; y como la pantalla lee del
 * proxy, eso se reduce a que el proxy y el backend publiquen la misma forma. Sin
 * esta prueba, la unica garantia de que asi sea era que quien escribio
 * `recursos.ts` mirara bien el `Resource`.
 *
 * ── En las dos direcciones ────────────────────────────────────────────────
 *
 * Una clave que **sobra** en el proxy es una columna que la pantalla dibuja hoy
 * y se quedara vacia al encender la ruta. Una que **falta** es lo contrario: un
 * dato que el backend manda y que la pantalla no puede estar usando —si lo
 * usara, contra el proxy ya estaria roto—, asi que no rompe nada al encender,
 * pero dice que el proxy describe un recurso mas pobre que el real y que quien
 * lea `recursos.ts` para saber que hay se llevara una idea equivocada.
 *
 * Por eso lo que sobra **falla** y lo que falta se **cuenta**, con la cifra
 * fijada: son dos defectos distintos y se corrigen en momentos distintos.
 *
 * ── Lo que no se compara, y por que ───────────────────────────────────────
 *
 * Cuatro operaciones declaran su retorno como `Map<String, …>`, `ResponseEntity<?>`
 * o `ResponseEntity<Object>`, y de un tipo asi la reflexion no puede sacar
 * ningun campo: su forma sale como la hoja «objeto». Comparar contra eso diria
 * que **todas** las claves del proxy sobran, que es exactamente lo contrario de
 * lo que pasa. Se saltan nombrandolas, y son las que estan en `SIN_FORMA_QUE_COMPARAR`.
 */

interface Formas {
  readonly [operacion: string]: unknown;
}

const FORMAS = JSON.parse(
  readFileSync(resolve(process.cwd(), '../docs/50-api/formas-de-la-api.json'), 'utf8'),
) as Formas;

/**
 * Las operaciones cuyo tipo de retorno no dice que campos tiene.
 *
 * No es una excepcion que se conceda: es lo que el backend declara. Se listan
 * para que aparecer aqui cueste una linea y se vea en el diff — y para que la
 * prueba de mas abajo pueda exigir que **sigan siendo estas**: una quinta
 * operacion que pierda su forma es un `Resource` que alguien cambio por
 * `ResponseEntity<?>`, y eso deja de comprobarse sin que nadie lo note.
 */
const SIN_FORMA_QUE_COMPARAR: readonly string[] = [
  // `Map<String, List<String>>`: la matriz de permisos, indexada por acceso.
  'GET /seguridad/sesion/permisos',
  // `ResponseEntity<?>`: nueve hojas distintas tras una sola peticion (#396).
  'POST /transito/reportes',
  // `ResponseEntity<?>`: lo mismo, tres hojas (#428).
  'POST /infracciones/administrativas/reportes',
  // `ResponseEntity<Object>`: el preconvenio o el 422 con su motivo (#35).
  'POST /tesoreria/fraccionamientos',
];

/** `GET /catastro/fichas/urbana/{cod}` → un camino concreto que los resolutores casan. */
const caminoDe = (ruta: string): string => `/api/v1${ruta.replace(/\{\w+\}/g, 'X')}`;

/** Lo que el proxy contesta hoy para esa operacion, o nada si no la publica en forma real. */
function loQuePublicaElProxy(metodo: string, ruta: string): unknown {
  const camino = caminoDe(ruta);
  return (
    paginadoDe(metodo, camino) ??
    recursoDe(metodo, camino) ??
    listaDe(metodo, camino) ??
    // El cuerpo vacio basta: las escrituras que el proxy publica devuelven lo que
    // registraron, y aqui solo se miran los nombres de los campos.
    escrituraDe(metodo, camino, {})
  );
}

interface Diferencias {
  readonly sobran: readonly string[];
  readonly faltan: readonly string[];
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/**
 * Compara las dos formas campo a campo, en paralelo.
 *
 * Se para donde el backend declara una hoja —`texto`, `entero`…—: comparar el
 * tipo del valor seria comparar dos sistemas de tipos, y `null` es legitimo en
 * cualquier campo que el `Resource` declare `@Nullable`.
 */
function comparar(delBackend: unknown, delProxy: unknown, camino = ''): Diferencias {
  if (Array.isArray(delBackend)) {
    if (!Array.isArray(delProxy) || delProxy.length === 0) return { sobran: [], faltan: [] };
    return comparar(delBackend[0], delProxy[0], `${camino}[]`);
  }
  if (!esObjeto(delBackend)) return { sobran: [], faltan: [] };
  if (!esObjeto(delProxy)) return { sobran: [], faltan: [] };

  const sobran: string[] = [];
  const faltan: string[] = [];
  for (const clave of Object.keys(delProxy)) {
    if (!Object.hasOwn(delBackend, clave)) sobran.push(`${camino}/${clave}`);
  }
  for (const clave of Object.keys(delBackend)) {
    if (!Object.hasOwn(delProxy, clave)) faltan.push(`${camino}/${clave}`);
  }
  for (const clave of Object.keys(delBackend)) {
    if (!Object.hasOwn(delProxy, clave)) continue;
    const hijas = comparar(delBackend[clave], delProxy[clave], `${camino}/${clave}`);
    sobran.push(...hijas.sobran);
    faltan.push(...hijas.faltan);
  }
  return { sobran, faltan };
}

/** Las que el proxy publica en forma real y el backend describe: las comparables. */
const COMPARABLES = EN_LA_FORMA_DEL_BACKEND.filter((entrada) => {
  const [metodo = '', ruta = ''] = entrada.split(' ');
  const declarada = Object.keys(FORMAS).find(
    (operacion) => operacion.replace(/\{\w+\}/g, '{}') === `${metodo} ${ruta}`,
  );
  return declarada !== undefined && !SIN_FORMA_QUE_COMPARAR.includes(declarada);
}).map((entrada) => {
  const [metodo = '', ruta = ''] = entrada.split(' ');
  const declarada = Object.keys(FORMAS).find(
    (operacion) => operacion.replace(/\{\w+\}/g, '{}') === `${metodo} ${ruta}`,
  ) as string;
  return { metodo, ruta: declarada.slice(metodo.length + 1), forma: FORMAS[declarada] };
});

describe('el proxy publica la forma que el backend publica (#400)', () => {
  it('hay formas que comparar', () => {
    // Sin esto, todo lo de abajo pasaria en verde con el archivo vacio.
    expect(Object.keys(FORMAS).length).toBeGreaterThan(150);
    expect(COMPARABLES.length).toBeGreaterThan(50);
  });

  it.each(COMPARABLES.map((c) => [`${c.metodo} ${c.ruta}`, c] as const))(
    '%s no publica ningun campo que su Resource no tenga',
    (_nombre, comparable) => {
      const delProxy = loQuePublicaElProxy(comparable.metodo, comparable.ruta);
      expect(delProxy, 'el proxy tiene que contestar algo en forma real').not.toBeNull();

      const { sobran } = comparar(comparable.forma, delProxy);
      expect(
        sobran,
        'campos que el proxy publica y el Resource no tiene: al encender la ruta, la pantalla que los dibuje se queda con la celda vacia',
      ).toEqual([]);
    },
  );

  it('lo que el backend manda y el proxy no publica esta contado', () => {
    const faltan = COMPARABLES.flatMap((comparable) => {
      const delProxy = loQuePublicaElProxy(comparable.metodo, comparable.ruta);
      return comparar(comparable.forma, delProxy).faltan.map(
        (campo) => `${comparable.metodo} ${comparable.ruta}${campo}`,
      );
    });

    // No rompe nada al encender —si la pantalla usara ese campo, contra el proxy
    // ya estaria roto—, pero dice que `recursos.ts` describe un recurso mas pobre
    // que el real. La cifra se fija para que bajarla se vea y subirla haya que
    // justificarla.
    //
    // Los 30 de hoy se agrupan en tres familias, y ninguna es un descuido:
    //
    //   las cuatro fichas       `frontis`, `condicionPropiedad`, `tipoEdificacion`,
    //                           `instalaciones` y el `porcentajeConstruido` de cada
    //                           piso. El prototipo no dibuja ninguno —son campos
    //                           que `FichaResource` publica y el manual no captura—
    //   los conteos del sector  `manzanas`, `predios` y `lotes`, que el backend
    //                           cuenta y el juego de datos del prototipo no trae
    //   los agregados           el `porMes` del resumen administrativo y el `ano`
    //                           de las dos lineas de transito
    //
    // Rellenarlos exigiria inventar el dato, que es lo que `recursos.ts` no hace.
    expect(faltan.length).toBe(30);
  });

  it('las cuatro operaciones sin forma comparable siguen siendo cuatro', () => {
    const sinForma = Object.entries(FORMAS)
      .filter(([operacion]) => operacion !== '_')
      .filter(([, forma]) => typeof forma === 'string')
      .map(([operacion]) => operacion);

    // Un `Resource` cambiado por `ResponseEntity<?>` deja de comprobarse aqui, y
    // el sintoma seria que esta lista crece sin que nadie lo mire.
    expect(sinForma.sort()).toEqual(
      [
        ...SIN_FORMA_QUE_COMPARAR,
        'POST /licencias/certificados/{numero}/impresion',
        'POST /transito/constancias-libres',
      ].sort(),
    );
  });
});
