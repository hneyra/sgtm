import { useEffect, useRef } from 'react';

/**
 * Tras guardar, el foco vuelve al primer campo de la busqueda.
 *
 * **Es una funcionalidad de caja, no un detalle de accesibilidad.** En
 * ventanilla se cobra cientos de veces al dia y siempre igual: se identifica al
 * contribuyente, se elige que paga, se cobra, y **entra el siguiente**. Si tras
 * cobrar hay que ir a buscar el campo de identificacion —con el raton, o
 * tabulando desde donde quedara el foco—, ese gesto se paga en cada cobro y la
 * cola avanza mas despacio (RNF-082, FRO-03 §6).
 *
 * Devuelve la referencia que hay que colgar del bloque de busqueda. Cuando
 * `guardada` pasa de falso a cierto, se enfoca su primer control **escribible**:
 * un `select` de «Todos» no es donde se teclea un DNI.
 */
export function useFocoTrasGuardar(guardada: boolean) {
  const busqueda = useRef<HTMLDivElement>(null);
  const anterior = useRef(guardada);

  useEffect(() => {
    // Solo en el flanco: si se enfocara en cada render mientras `guardada` sigue
    // siendo cierto, el usuario no podria mover el foco a ningun otro sitio.
    const acabaDeGuardar = guardada && !anterior.current;
    anterior.current = guardada;
    if (!acabaDeGuardar) return;

    const primero = busqueda.current?.querySelector<HTMLElement>(
      'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])',
    );
    primero?.focus();
  }, [guardada]);

  return busqueda;
}

/**
 * Al cerrar un alta que ocupo la pantalla entera, el foco vuelve a la accion que
 * la abrio.
 *
 * Es la mitad que le faltaba al asistente de cuatro pasos. Un panel lateral
 * devuelve el foco solo —guarda `document.activeElement` al abrirse—, pero el
 * flujo guiado **sustituye a la pantalla**: el boton que lo abrio se
 * desmonta, y al volver el foco se ha quedado en el `body`. Desde ahi, el
 * siguiente tabulador empieza por la cabecera de la aplicacion.
 *
 * El boton se busca por su rotulo porque es lo que el catalogo dibuja y lo que
 * el usuario leyo al pulsarlo —el mismo criterio con el que la barra indexa sus
 * altas—; el `ref` no sirve, porque el elemento al que apuntaba ya no existe.
 */
export function useFocoEnLaAccion(accion: string | undefined, abierto: boolean): void {
  const estuvoAbierto = useRef(false);

  useEffect(() => {
    const acabaDeCerrarse = !abierto && estuvoAbierto.current;
    estuvoAbierto.current = abierto;
    if (!acabaDeCerrarse || accion === undefined) return;
    const boton = [...document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones button')].find(
      (candidato) => candidato.textContent?.trim() === accion,
    );
    boton?.focus();
  }, [abierto, accion]);
}
