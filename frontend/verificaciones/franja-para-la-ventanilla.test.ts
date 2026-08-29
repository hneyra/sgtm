import { describe, expect, it } from 'vitest';
import { ACTOS_SIN_CAMPO } from '../apps/backoffice/src/pantallas/actos';

/**
 * **La franja habla para la ventanilla; el nombre del campo se queda en el
 * `data-`** (#432, y la promesa que `ActoSinCampo` ya hacia).
 *
 * `ActoSinCampo` reparte lo mismo entre dos lectores, y lo dice en su javadoc:
 * `dato` y `porque` son «el dato que falta, **dicho para quien atiende**: «el
 * valor de la transferencia», no `valorTransferencia`», y `campos` es «como lo
 * llama el backend. **No se pinta**». Las dos mitades se dibujan juntas
 * —`impedimentoDelActo` compone `dato` y `porque` en la franja—, asi que la
 * unica forma de que la promesa se rompa es que alguien escriba el nombre del
 * campo en la mitad que si se pinta. Nada lo impedia.
 *
 * Y el sintoma no seria un error: seria una pantalla que le dice a quien atiende
 * «falta `transferenciaId`», que es exactamente la frase por la que
 * `CausaDelImpedimento` separa a los dos lectores —«leyendo eso, lo unico que
 * puede concluir es que la pantalla esta rota y que la culpa es suya»—.
 *
 * **Como se reconoce el nombre de un campo sin una lista**: por su forma.
 * `camelCase` no es castellano —`transferenciaId`, `nDeRecibo`,
 * `ingresoDeclarado`, `formaDePago`—, y ninguna palabra del dominio se escribe
 * asi. Comparar contra `campos` no serviria: `motivo` es a la vez el nombre del
 * campo y la palabra que hay que usar para decirlo.
 */

/** Una palabra en `camelCase`: minuscula, mayuscula, y sigue. */
const CAMEL_CASE = /\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/g;

describe('el motivo de un acto sin campo esta escrito para quien atiende', () => {
  it('hay entradas que comprobar', () => {
    expect(Object.keys(ACTOS_SIN_CAMPO).length).toBeGreaterThan(0);
  });

  it.each(Object.keys(ACTOS_SIN_CAMPO))(
    '«%s» no pinta el nombre de ningun campo del backend',
    (opcion) => {
      const declarado = ACTOS_SIN_CAMPO[opcion];
      const pintado = `${declarado?.dato ?? ''} ${declarado?.porque ?? ''}`;
      const nombres = pintado.match(CAMEL_CASE) ?? [];
      expect(
        nombres,
        `«${opcion}» pinta ${nombres.join(', ')} en la franja: el nombre del campo se queda en «campos», que no se dibuja`,
      ).toEqual([]);
    },
  );

  it.each(Object.keys(ACTOS_SIN_CAMPO))(
    '«%s» dice el dato y por que, y nombra su campo aparte',
    (opcion) => {
      const declarado = ACTOS_SIN_CAMPO[opcion];
      // Las tres piezas hacen falta: sin `dato` la franja no dice que falta, sin
      // `porque` no dice por que hace falta, y sin `campos` quien mantiene tiene
      // que abrir el controlador para saber de que campo se habla.
      expect(declarado?.dato.length, opcion).toBeGreaterThan(10);
      expect(declarado?.porque.length, opcion).toBeGreaterThan(40);
      expect(declarado?.campos.length, opcion).toBeGreaterThan(0);
      // Y el texto termina en punto: la franja lo concatena con la salida —«…
      // Registra el acto por el procedimiento actual…»— y sin punto salen dos
      // frases pegadas.
      expect(declarado?.porque.trimEnd().endsWith('.'), opcion).toBe(true);
    },
  );
});
