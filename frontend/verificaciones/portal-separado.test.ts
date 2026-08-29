import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import { LECTURAS } from '../apps/portal/src/lecturas';
import { MODULOS, OPCIONES, opcionPorId } from '../apps/backoffice/src/catalogo';

/**
 * **Lo que hace que `apps/portal` siga siendo el portal** (#298, ADR-0016 §3).
 *
 * Las pruebas de `apps/portal/src/portal.test.tsx` comprueban lo que la pantalla
 * dibuja. Estas comprueban lo que **no puede** hacer, y por eso son un escaneo
 * del codigo fuente y no un montaje: las tres cosas que la separacion promete se
 * pierden sin ningun sintoma en la pantalla.
 *
 *   1. **El ciudadano no descarga el catalogo de navegacion.** Basta un
 *      `import` desde el back-office —o del catalogo, o del shell— para que los
 *      ~11,5 KB de doce modulos vuelvan al paquete. El presupuesto de
 *      `comprobar-compilaciones` lo veria; esto lo dice antes, y nombra el
 *      archivo. **Y se vigila tambien en los dos paquetes que el portal
 *      consume** —`@sgtm/lectura` y `@sgtm/sesion`—: la puerta de atras es la
 *      misma y ahi no la ve nadie, porque el presupuesto solo mide el total.
 *   2. **De aqui no se escribe.** Ni `useMutation`, ni `useEscritura`, ni un
 *      envio: no hay sesion del ciudadano con que atribuir una escritura
 *      (ADR-0009 §1 y §2), y toda escritura del sistema exige ademas la
 *      observacion de quien la hace (regla 10, RNF-052). La regla de ESLint
 *      prohibe `useMutation` en todo el frontend; aqui la prohibicion es mas
 *      ancha, porque el portal no puede escribir **de ninguna manera**.
 *   3. **Solo pregunta las rutas que declara, y todas son lecturas del
 *      contrato.** El portal no usa `pedirOperacion`: eso arrastraria al paquete
 *      del ciudadano el mapa de las 176 operaciones —84 de escritura—, que es el
 *      inventario completo de la API en la aplicacion destinada a ser publica.
 *      Declara `LECTURAS` y llama con `solicitar()`, y la comprobacion contra el
 *      contrato se hace **aqui**: cada entrada tiene que cuadrar con
 *      `OPERACIONES[id].ruta` y su metodo tiene que ser `GET`.
 *   3.c **Y no manda NINGUN documento como parametro** (#57, ADR-0020). Es la
 *      vulnerabilidad original convertida en regla de codigo fuente: mientras el
 *      documento viajaba en la consulta —`?doc=`, `?dNI=`, `?rUC=`— el portal
 *      tenia delante un endpoint que contesta «quien es esta persona y cuanto
 *      debe» a quien teclee ocho digitos. Ahora sale de un claim firmado y no
 *      hay nada que mandar; volver a mandarlo se pone rojo, nombrando el
 *      archivo.
 *   3.b **Y los nombres de la lectura compartida se definen una sola vez.**
 *      `esObjeto`, `texto`, `leerPaginado` y compania viven en
 *      `@sgtm/lectura` porque dos copias del mismo lector acaban leyendo campos
 *      distintos —y una de las dos, el importe sin su fecha—. Una segunda
 *      definicion exportada, en cualquier sitio, se pone roja.
 *
 * Y una cuarta, que es la otra mitad de la decision: **la opcion `portal` de las
 * 134 sigue en el catalogo**. `apps/portal` no la sustituye ni la borra; es la
 * vista del funcionario, con su id, su ruta y su permiso (ADR-0016 §3), y
 * quitarla seria reescribir el catalogo del manual por un motivo de empaquetado.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const PORTAL = join(AQUI, '../apps/portal/src');

/**
 * Lo que el ciudadano descarga **no es solo `apps/portal`**: son sus fuentes y
 * las de los dos paquetes que consume.
 *
 * Se vigilan los tres con el mismo escaneo porque la puerta es la misma: un
 * `import` del catalogo metido en `@sgtm/lectura` devuelve los doce modulos al
 * paquete del portal exactamente igual que si se hubiera escrito aqui, y ahi no
 * lo mira nadie. Hoy solo lo cazaria el presupuesto, y por 11 KB de suerte: dice
 * que el total subio, no que un paquete compartido se trajo el back-office.
 */
const ESCANEADOS = [
  { que: 'apps/portal', raiz: PORTAL },
  { que: 'packages/lectura', raiz: join(AQUI, '../packages/lectura/src') },
  { que: 'packages/sesion', raiz: join(AQUI, '../packages/sesion/src') },
];

/** Todos los `.ts`/`.tsx` de una carpeta, con su ruta relativa y su contenido. */
function fuentesDe(raiz: string, que: string) {
  const encontrados: { archivo: string; codigo: string }[] = [];
  const recorrer = (carpeta: string, prefijo: string): void => {
    for (const entrada of readdirSync(carpeta)) {
      const camino = join(carpeta, entrada);
      if (statSync(camino).isDirectory()) {
        recorrer(camino, `${prefijo}${entrada}/`);
      } else if (/\.tsx?$/.test(entrada)) {
        encontrados.push({
          archivo: `${que}/${prefijo}${entrada}`,
          codigo: readFileSync(camino, 'utf8'),
        });
      }
    }
  };
  recorrer(raiz, '');
  return encontrados;
}

const FUENTES = fuentesDe(PORTAL, 'apps/portal');
/** Las del portal **y las de los paquetes que descarga con el**. */
const TODO_LO_QUE_VIAJA = ESCANEADOS.flatMap(({ que, raiz }) => fuentesDe(raiz, que));

/**
 * El codigo **sin sus comentarios**.
 *
 * Hace falta, y lo demostro la primera version de esta prueba: `Portal.tsx`
 * explica en su docblock que aqui no hay ningun `useEscritura`, y el escaneo
 * encontro esa frase y acuso al archivo de lo contrario de lo que dice. Un
 * escaner que lee la documentacion no lee el codigo.
 *
 * Se quitan los bloques `/* … *\/` y las lineas que empiezan por `//` o por
 * `*`; no se toca lo que va entre comillas, asi que un texto de pantalla que
 * mencionara una prohibicion seguiria contando —y debe: lo que la pantalla dice
 * en voz alta no es un comentario—.
 */
const sinComentarios = (codigo: string): string =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((linea) => !/^\s*(\/\/|\*)/.test(linea))
    .join('\n');

/** Los `.test.tsx` montan la aplicacion: lo que se vigila es lo que se publica. */
const deProduccion = (fuentes: readonly { archivo: string; codigo: string }[]) =>
  fuentes
    .filter(({ archivo }) => !archivo.includes('.test.'))
    .map(({ archivo, codigo }) => ({ archivo, codigo: sinComentarios(codigo) }));

const DE_PRODUCCION = deProduccion(FUENTES);
const TODO_DE_PRODUCCION = deProduccion(TODO_LO_QUE_VIAJA);

describe('el portal no arrastra el back-office', () => {
  it('encuentra los archivos que dice escanear', () => {
    // Sin esto, un `PORTAL` mal apuntado dejaria las tres pruebas de abajo
    // recorriendo una lista vacia: en verde, y sin comprobar nada.
    expect(DE_PRODUCCION.length).toBeGreaterThan(3);
    // Y los paquetes que viajan con el: los tres, no solo el primero.
    for (const { que } of ESCANEADOS) {
      expect(
        TODO_DE_PRODUCCION.some(({ archivo }) => archivo.startsWith(`${que}/`)),
        `no se escaneo ningun archivo de ${que}`,
      ).toBe(true);
    }
  });

  it('no importa nada de apps/backoffice, ni el catalogo, ni el shell', () => {
    /* **Ni el portal, ni los paquetes que descarga con el.** Ningun archivo de
       `packages/` puede importar de `apps/`: eso es el back-office entrando por
       la puerta de atras, y hasta hoy solo lo habria dicho el presupuesto —«el
       total subio»— y por 11 KB de suerte. */
    const culpables = TODO_DE_PRODUCCION.filter(({ codigo }) =>
      /from\s+'[^']*(backoffice|\.\.\/apps\/|\/catalogo|\/app\/Shell|pantallas\/)/.test(codigo),
    ).map(({ archivo }) => archivo);

    expect(culpables).toEqual([]);
  });

  it('solo consume los paquetes compartidos', () => {
    const permitidos = new Set([
      '@sgtm/api-client',
      '@sgtm/api-mock',
      '@sgtm/design-system',
      '@sgtm/design-system/estilos.css',
      '@sgtm/dominio',
      '@sgtm/lectura',
      '@sgtm/sesion',
      '@tanstack/react-query',
      'react',
      'react-dom/client',
    ]);
    const externos = new Set<string>();
    for (const { codigo } of DE_PRODUCCION) {
      for (const [, modulo] of codigo.matchAll(/from\s+'([^'.][^']*)'/g)) {
        if (modulo !== undefined) externos.add(modulo);
      }
    }

    expect([...externos].filter((modulo) => !permitidos.has(modulo))).toEqual([]);
  });
});

describe('del portal no se escribe', () => {
  it('ni una mutacion, ni un envio, ni el camino de escritura', () => {
    const prohibidos = /useMutation|useEscritura|enviarOperacion|method:\s*'POST'/;
    const culpables = DE_PRODUCCION.filter(({ codigo }) => prohibidos.test(codigo)).map(
      ({ archivo }) => archivo,
    );

    expect(culpables).toEqual([]);
  });

  it('todo lo que pide es un GET del contrato', () => {
    const pedidas = Object.keys(LECTURAS);

    /* **El metodo primero, y la lista despues.** El orden es la prueba: si una
       de las dos se cambiara por una operacion de escritura, con los `toContain`
       delante la prueba caeria en «falta contribuyentes» —«la lista cambio»— y
       nunca en lo que esta prueba existe para decir. Comprobado: la version
       anterior fallaba sin nombrar el metodo. Y la ruta se compara letra a
       letra, que es la mitad que el tipo no puede sostener: las claves son ids
       del contrato por `satisfies`, pero la ruta de cada una es un texto escrito
       a mano en `apps/portal/src/lecturas.ts`. */
    expect(pedidas.length).toBeGreaterThan(0);
    for (const operacion of pedidas) {
      const descriptor = OPERACIONES[operacion as IdDeOperacion];
      expect(descriptor, `«${operacion}» no es una operacion del contrato`).toBeDefined();
      expect(descriptor.metodo, `«${operacion}» no es una lectura`).toBe('GET');
      expect(descriptor.ruta, `la ruta de «${operacion}» no es la del contrato`).toBe(
        LECTURAS[operacion as keyof typeof LECTURAS],
      );
    }

    /* Y que siga preguntando la que compone: un portal que no consulta nada
       pasaria sin esfuerzo el bucle de arriba. */
    expect(pedidas).toContain('portal_mi_situacion');

    /* **Y ninguna de las dos que se fueron.** `GET /rentas/contribuyentes` y
       `GET /consultas/unificada` son endpoints de FUNCIONARIO: el token del
       ciudadano no autentica en ellos —la cadena general del backend valida
       contra el otro emisor (ADR-0020)—, asi que declararlos aqui seria pedir
       401 en cada carga. Y el primero es, ademas, el endpoint por documento que
       este issue retira. */
    expect(pedidas).not.toContain('contribuyentes');
    expect(pedidas).not.toContain('consulta_unificada');
  });

  it('**no manda ningun documento como parametro**', () => {
    /* La vulnerabilidad original, convertida en regla de codigo fuente (#57,
       ADR-0020). No se prohibe la palabra en un texto de pantalla —la pantalla
       habla del documento, y debe— sino su uso como **clave de consulta**: lo
       que viaja en la URL o en el objeto que `solicitar` convierte en consulta.
       Los comentarios ya se quitaron (`sinComentarios`), asi que lo que quede es
       codigo. */
    const COMO_PARAMETRO = [
      // En la ruta escrita a mano: `?doc=`, `&dNI=`, `?numeroDocumento=`…
      /[?&](doc|dni|dNI|ruc|rUC|documento|numeroDocumento|numero_documento|tipoDocumento)=/,
      // En el objeto de consulta: `{ dNI: … }`, `consulta: { doc: … }`.
      /\b(consulta|params|query)\s*:\s*\{[^}]*\b(doc|dNI|rUC|numeroDocumento)\b/,
      // Y la forma corta de lo mismo, sin envoltorio.
      /\{\s*\[?\s*(doc|dNI|rUC|numeroDocumento)\b\s*\]?\s*:/,
    ];

    const culpables: string[] = [];
    for (const { archivo, codigo } of TODO_DE_PRODUCCION) {
      for (const patron of COMO_PARAMETRO) {
        if (patron.test(codigo)) culpables.push(`${archivo}: ${patron.source}`);
      }
    }

    expect(culpables).toEqual([]);
  });

  it('y el contrato tampoco publica ya el parametro que lo llevaba', () => {
    /* La otra mitad, y la que de verdad cierra la puerta: mientras
       `GET /portal/deuda` declarara `doc`, el generador de tipos lo expondria y
       alguien lo mandaria. Se retiro por el generador (`SUPRIMIDOS`), no a mano,
       y `--comprobar` exige en CI que el YAML siga siendo lo que aquel produce. */
    expect(OPERACIONES['portal'].parametrosDeConsulta).not.toContain('doc');
    // Y la operacion del ciudadano no tiene ninguno: el sujeto va en el token.
    expect(OPERACIONES['portal_mi_situacion'].parametrosDeConsulta).toEqual([]);
  });

  it('y no lleva dentro el mapa de las 176 operaciones', () => {
    /* **Lista blanca, no lista negra.** La primera version prohibia cuatro
       nombres (`pedirOperacion`, `enviarOperacion`, `descargarOperacion`,
       `OPERACIONES`) y dejaba pasar los otros cinco exportados de
       `@sgtm/api-client` que leen el mismo mapa —`pedirDatosDePantalla`,
       `rutaDeOperacion`, `consultaDeOperacion`, `descriptorDe`, `escribe`—:
       una llamada viva a `pedirDatosDePantalla('portal', …)` subia el arranque
       de 80,9 a 85,3 KB, metia `/coactiva/prescripcion` en el paquete del
       ciudadano y sacaba una peticion a `/portal/deuda`, con las once pruebas
       de este archivo en verde. Lo unico que la cazaba era el presupuesto, por
       3,1 KB de margen y en otro comando. Por eso aqui se enumera lo que el
       portal y sus paquetes SI pueden importar de `@sgtm/api-client` —lo mismo
       que ya hace «solo consume los paquetes compartidos», un nivel mas
       abajo—. Los `import type` se permiten enteros: se borran al compilar y
       no pueden arrastrar el mapa. */
    const PERMITIDOS = new Set([
      // El portal: pedir por la tabla de `lecturas.ts`, y distinguir el 403.
      'solicitar',
      'ProblemaDeApi',
      // `@sgtm/sesion`: el ciclo de la sesion, que no toca `OPERACIONES`.
      'canjearSiVuelve',
      'cerrarSesion',
      'configuracionDeIdentidad',
      // El gemelo del anterior para el realm del ciudadano (ADR-0020): resuelve
      // tres variables de entorno y no toca `OPERACIONES`.
      'configuracionDelCiudadano',
      'configurarRenovacion',
      'irAAutenticar',
      'leerToken',
      'renovar',
    ]);

    const culpables: string[] = [];
    for (const { archivo, codigo } of TODO_DE_PRODUCCION) {
      // Una clausula por sentencia: llaves, `* as` o un default — nunca
      // `[\s\S]*?` suelto, que cruzaba sentencias y acusaba al import de React.
      for (const [, clausula] of codigo.matchAll(
        /import\s+((?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))\s+from\s+'@sgtm\/api-client'/g,
      )) {
        const importado = (clausula ?? '').trim();
        // `import type { … }` entero: borrado por el compilador.
        if (/^type\b/.test(importado)) continue;
        const nombres = /^\{([\s\S]*)\}$/.exec(importado)?.[1];
        if (nombres === undefined) {
          // `import * as api` o un default: darian acceso al mapa entero.
          culpables.push(`${archivo}: import no nominal de @sgtm/api-client`);
          continue;
        }
        for (const crudo of nombres.split(',')) {
          const nombre = crudo.trim();
          if (nombre === '' || nombre.startsWith('type ')) continue;
          const sinAlias = nombre.split(/\s+as\s+/)[0] ?? nombre;
          if (!PERMITIDOS.has(sinAlias)) culpables.push(`${archivo}: ${sinAlias}`);
        }
      }
    }

    expect(culpables).toEqual([]);
  });

  it('ninguna peticion sale por una ruta que la tabla no declare', () => {
    /* La otra mitad: sin esto, `solicitar('/coactiva/prescripcion', …)` escrito a
       mano en cualquier archivo del portal pasaria las dos pruebas de arriba
       —la tabla seguiria teniendo dos entradas de lectura— y saldria igual. */
    const fuera: string[] = [];
    for (const { archivo, codigo } of DE_PRODUCCION) {
      for (const [, argumento] of codigo.matchAll(/solicitar(?:<[^>]*>)?\(\s*([^,)\s]+)/g)) {
        if (!/^LECTURAS\.\w+$/.test(argumento ?? '')) fuera.push(`${archivo}: ${argumento}`);
      }
    }

    expect(fuera).toEqual([]);
  });
});

/**
 * **Los nombres de la lectura compartida se definen una sola vez.**
 *
 * Salieron de una pantalla del back-office al separarse el portal (#298) y viven
 * en `@sgtm/lectura` por un motivo que se paga cuando se olvida: `esObjeto` son
 * tres condiciones de las que la de `!Array.isArray` es justo la que se cae, y
 * `importeDe` es lo que impide que un importe se dibuje sin su fecha (regla 9).
 * Una segunda definicion no rompe nada el dia que se escribe: rompe el dia que
 * una de las dos se corrige.
 *
 * Se vigila **lo exportado**, no cualquier `const texto`: hay media docena de
 * ayudantes locales con ese nombre y otra semantica —de `Celda`, de
 * `ValorDeCampo`, de un error— que son de su pantalla y no viajan a ningun
 * sitio. Lo que no puede haber es un segundo `texto` **publicado**, que es el
 * que otro archivo importaria creyendo que es este.
 */
describe('la lectura del contrato se escribe una vez', () => {
  const RESERVADOS = [
    'esObjeto',
    'texto',
    'leerPaginado',
    'leerObjeto',
    'importeDe',
    'identidadPorCodigo',
    'seccionDeLaFicha',
  ];

  it('nadie fuera de packages/lectura exporta una definicion con esos nombres', () => {
    const patron = new RegExp(
      `export\\s+(?:async\\s+)?(?:const|function|let)\\s+(${RESERVADOS.join('|')})\\b`,
      'g',
    );
    const culpables: string[] = [];
    for (const carpeta of ['apps', 'packages']) {
      for (const { archivo, codigo } of deProduccion(
        fuentesDe(join(AQUI, '..', carpeta), carpeta),
      )) {
        if (archivo.startsWith('packages/lectura/')) continue;
        for (const [, nombre] of codigo.matchAll(patron)) culpables.push(`${archivo}: ${nombre}`);
      }
    }

    // Reexportar si —`export { texto } from '@sgtm/lectura'` es la misma
    // definicion, no otra—; definir de nuevo, no.
    expect(culpables).toEqual([]);
  });

  it('y los siete estan de verdad en packages/lectura', () => {
    // Sin esto, una lista de nombres que ya nadie define pasaria en verde para
    // siempre: la prohibicion se cumpliria por vacia.
    const publicado = readFileSync(join(AQUI, '../packages/lectura/src/index.ts'), 'utf8');
    for (const nombre of RESERVADOS) expect(publicado).toContain(nombre);
  });
});

describe('la opcion «portal» de las 134 sigue donde estaba', () => {
  it('sigue en el catalogo del back-office, con su ruta', () => {
    const portal = opcionPorId('portal');

    expect(portal).toBeDefined();
    expect(portal?.ruta).toBeDefined();
    // Y en su modulo: es la vista del funcionario, no una aplicacion aparte.
    expect(MODULOS.some((modulo) => modulo.opciones.some((opcion) => opcion.id === 'portal'))).toBe(
      true,
    );
  });

  it('y las 134 siguen siendo 134', () => {
    expect(OPCIONES).toHaveLength(134);
  });
});
