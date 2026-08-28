import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
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
 *      archivo.
 *   2. **De aqui no se escribe.** Ni `useMutation`, ni `useEscritura`, ni un
 *      envio: no hay sesion del ciudadano con que atribuir una escritura
 *      (ADR-0009 §1 y §2), y toda escritura del sistema exige ademas la
 *      observacion de quien la hace (regla 10, RNF-052). La regla de ESLint
 *      prohibe `useMutation` en todo el frontend; aqui la prohibicion es mas
 *      ancha, porque el portal no puede escribir **de ninguna manera**.
 *   3. **Solo pregunta a operaciones de lectura**, y se comprueba contra el
 *      contrato: cada `pedirOperacion('x')` del portal tiene que ser un `GET` en
 *      `OPERACIONES`. Un dia alguien pedira aqui algo que el contrato declara
 *      `POST` y el unico aviso seria el 405 del servidor.
 *
 * Y una cuarta, que es la otra mitad de la decision: **la opcion `portal` de las
 * 134 sigue en el catalogo**. `apps/portal` no la sustituye ni la borra; es la
 * vista del funcionario, con su id, su ruta y su permiso (ADR-0016 §3), y
 * quitarla seria reescribir el catalogo del manual por un motivo de empaquetado.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const PORTAL = join(AQUI, '../apps/portal/src');

/** Todos los `.ts`/`.tsx` del portal, con su ruta relativa y su contenido. */
function fuentesDelPortal(): readonly { readonly archivo: string; readonly codigo: string }[] {
  const encontrados: { archivo: string; codigo: string }[] = [];
  const recorrer = (carpeta: string, prefijo: string): void => {
    for (const entrada of readdirSync(carpeta)) {
      const camino = join(carpeta, entrada);
      if (statSync(camino).isDirectory()) {
        recorrer(camino, `${prefijo}${entrada}/`);
      } else if (/\.tsx?$/.test(entrada)) {
        encontrados.push({ archivo: `${prefijo}${entrada}`, codigo: readFileSync(camino, 'utf8') });
      }
    }
  };
  recorrer(PORTAL, '');
  return encontrados;
}

const FUENTES = fuentesDelPortal();

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
const DE_PRODUCCION = FUENTES.filter(({ archivo }) => !archivo.includes('.test.')).map(
  ({ archivo, codigo }) => ({ archivo, codigo: sinComentarios(codigo) }),
);

describe('el portal no arrastra el back-office', () => {
  it('encuentra los archivos que dice escanear', () => {
    // Sin esto, un `PORTAL` mal apuntado dejaria las tres pruebas de abajo
    // recorriendo una lista vacia: en verde, y sin comprobar nada.
    expect(DE_PRODUCCION.length).toBeGreaterThan(3);
  });

  it('no importa nada de apps/backoffice, ni el catalogo, ni el shell', () => {
    const culpables = DE_PRODUCCION.filter(({ codigo }) =>
      /from\s+'[^']*(backoffice|\/catalogo|\/app\/Shell|pantallas\/)/.test(codigo),
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
    const pedidas = new Set<string>();
    for (const { codigo } of DE_PRODUCCION) {
      for (const [, operacion] of codigo.matchAll(/pedirOperacion\(\s*'([^']+)'/g)) {
        if (operacion !== undefined) pedidas.add(operacion);
      }
    }

    /* Que pregunte algo, para empezar —un portal que no consulta nada pasaria
       sin esfuerzo la comprobacion de abajo—, y **que siga preguntando las dos
       que compone**. Lo que no se fija es la lista exacta: con `toEqual` sobre
       el conjunto entero, cualquier operacion nueva se caia por «la lista
       cambio» y nunca por lo que esta prueba existe para decir —que la nueva
       escribe—. Se comprobo: cambiando una de las dos por un `POST` del
       contrato, la rigida fallaba sin nombrar el metodo. */
    expect(pedidas.size).toBeGreaterThan(0);
    expect([...pedidas]).toContain('contribuyentes');
    expect([...pedidas]).toContain('consulta_unificada');

    for (const operacion of pedidas) {
      const descriptor = OPERACIONES[operacion as keyof typeof OPERACIONES];
      expect(descriptor, `«${operacion}» no es una operacion del contrato`).toBeDefined();
      expect(descriptor.metodo, `«${operacion}» no es una lectura`).toBe('GET');
    }
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
