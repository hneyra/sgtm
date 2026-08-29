import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import {
  LECTURAS_POR_POST_DECLARADAS,
  OPCIONES_QUE_LEEN_POR_POST,
  porQueNoEsLectura,
} from '../apps/backoffice/src/pantallas/lecturas-por-post';
import { OPCIONES_QUE_ESCRIBEN } from '../apps/backoffice/src/pantallas/escrituras';
import { opcionPorId } from '../apps/backoffice/src/catalogo';

/**
 * **La guarda de la tercera puerta** (#424).
 *
 * `useEscritura` esta protegido por la regla de ESLint que prohibe `useMutation`
 * y por el escaner que cuenta sus excepciones
 * (`mutacion-en-tres-caminos.test.ts`). `useSimulacion` lo esta por su marca
 * —`simulacion: true` en el cuerpo—. Y la lectura por `POST` no puede tener
 * ninguna de las dos: su cuerpo no lleva marca y su peticion no pide
 * observacion, asi que **lo unico que la separa de una escritura es la
 * declaracion**, y una declaracion sin comprobar no separa nada.
 *
 * Esto es esa comprobacion, y esta escrita con el orden del escaner del portal
 * (`portal-separado.test.ts`, #298): **el verbo por delante de la lista**. Con
 * la lista primero, declarar aqui una operacion de escritura fallaria por «falta
 * la que la estrena» —«la lista cambio»— y nunca por lo que esto existe para
 * decir; con el verbo delante, el mensaje nombra el metodo.
 *
 * Vive en `verificaciones/` y no junto a la pantalla porque es lo mismo que el
 * escaner del portal: mira el registro entero, no una pantalla, y tiene que
 * seguir mirandolo el dia que la lista crezca.
 */

/** Lo que el contrato dice de esa operacion. */
const descriptor = (operacion: IdDeOperacion) => OPERACIONES[operacion];

describe('lo declarado como lectura por POST es una lectura por POST', () => {
  it('el verbo primero, y despues la lista', () => {
    /* Sin esto, vaciar el registro dejaria el bucle recorriendo nada: verde, y
       sin haber comprobado una sola operacion. */
    expect(LECTURAS_POR_POST_DECLARADAS.length).toBeGreaterThan(0);

    for (const [opcion, declarada] of LECTURAS_POR_POST_DECLARADAS) {
      const suyo = descriptor(declarada.operacion);
      expect(suyo, `«${declarada.operacion}» no es una operacion del contrato`).toBeDefined();

      /* 1. **El verbo.** `GET` no entra —esa se pide por el camino comun— y
            `PATCH`/`PUT`/`DELETE` tampoco: esos verbos SON modificacion, y
            ninguna prosa los convierte en lectura. */
      expect(suyo.metodo, `«${declarada.operacion}» no viaja por esta puerta`).toBe('POST');

      /* 2. **Y que no escriba.** Un `POST` es ambiguo por definicion, asi que
            el verbo solo no basta: la unica evidencia mecanica de que ese `POST`
            guarda algo es que alguna opcion lo declare como su escritura. */
      expect(
        porQueNoEsLectura(declarada.operacion),
        `«${opcion}» declara una lectura por POST que no lo es`,
      ).toBeUndefined();

      /* 3. **La ruta, letra a letra**, que es la mitad que el tipo no sostiene:
            `operacion` esta atada al contrato por `IdDeOperacion`, y la ruta es
            un texto escrito a mano en `lecturas-por-post.ts`. */
      expect(suyo.ruta, `la ruta de «${declarada.operacion}» no es la del contrato`).toBe(
        declarada.ruta,
      );

      /* 4. **Y la opcion existe en el catalogo**: una entrada para una pantalla
            que no esta es una guarda que no protege ninguna pantalla. */
      expect(opcionPorId(opcion), `«${opcion}» no es una opcion del catalogo`).toBeDefined();
    }
  });

  it('y sigue estando la que la estrena', () => {
    /* Un registro vacio pasaria el bucle de arriba sin esfuerzo si alguien
       quitara su primera guarda; esto ata la lista a la pantalla que la usa. */
    expect(OPCIONES_QUE_LEEN_POR_POST).toContain('transito_reportes');
  });

  it('ninguna opcion lee por POST y escribe a la vez', () => {
    /* La otra direccion de la misma frontera: declarar las dos cosas para la
       misma opcion dejaria una pantalla con dos actos —uno que guarda pidiendo
       observacion y otro que no—, y quien atiende no tendria como distinguirlos.
       No es lo mismo que la guarda de arriba, que mira la OPERACION: esta mira
       la OPCION, y hay opciones que leen con la operacion de otra. */
    const dobles = OPCIONES_QUE_LEEN_POR_POST.filter((opcion) =>
      OPCIONES_QUE_ESCRIBEN.includes(opcion),
    );

    expect(dobles).toEqual([]);
  });
});

describe('la guarda rechaza lo que no es una lectura, y dice por que', () => {
  it('una operacion de escritura se rechaza nombrando el verbo', () => {
    /* `transito_valores` es `POST /transito/valores/generacion-masiva`, y la
       declara `transito_valores` en `escrituras.ts` con su observacion. Es la
       rotura exacta que #424 pide medir. */
    const motivo = porQueNoEsLectura('transito_valores');

    expect(motivo).toBeDefined();
    expect(motivo).toMatch(/escribe/);
    expect(motivo).toMatch(/escrituras\.ts/);
  });

  it('un PATCH se rechaza **nombrando el verbo**, y por serlo', () => {
    /* `transito_cambio_numero` es un `PATCH`: aqui el motivo no es que alguien
       lo declare en `escrituras.ts` —aunque lo haga— sino el verbo mismo, y el
       mensaje tiene que decirlo. Es la mitad que el orden de la comprobacion
       protege: con la lista por delante, este caso dice «no esta en la lista». */
    const motivo = porQueNoEsLectura('transito_cambio_numero');

    expect(motivo).toBeDefined();
    expect(motivo).toMatch(/PATCH/);
  });

  it('un GET se rechaza mandandolo al camino comun', () => {
    const motivo = porQueNoEsLectura('papeletas');

    expect(motivo).toBeDefined();
    expect(motivo).toMatch(/GET/);
    expect(motivo).toMatch(/camino comun/);
  });

  it('y la que si es una lectura por POST pasa', () => {
    /* El contraste que hace falta: sin el, una guarda que rechazara **todo**
       pasaria las tres pruebas de arriba. */
    expect(porQueNoEsLectura('transito_reportes')).toBeUndefined();
  });
});
