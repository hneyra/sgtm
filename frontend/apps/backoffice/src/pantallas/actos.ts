import { escribe } from '@sgtm/api-client';
import { operacionDe } from './busqueda';
import { escrituraDe } from './escrituras';

/**
 * **Ningun acto promete lo que no puede** (#332).
 *
 * Habia tres estados posibles y la interfaz solo sabia dibujar dos. El que
 * faltaba es el del medio, y es el mas frecuente de las 134 pantallas: la accion
 * que **todavia** no puede guardar. Hasta hoy se comportaba como si pudiera —se
 * habilitaba en cuanto habia observacion, porque una opcion sin declarar «manda
 * solo su observacion»—, asi que en «Transferencia de predio» o en «Predial —
 * masivo» el operador rellenaba catorce campos, pulsaba la primaria y recibia un
 * rechazo del backend; o ni eso, porque no hay backend que rechace.
 *
 * La negacion por omision de `escrituras.ts` **no cambia**: lo que no esta
 * declarado sigue sin viajar. Lo que cambia es que ahora **lo dice**, y dice
 * cual de las dos cosas le falta, porque no piden lo mismo a quien lo lee:
 *
 *   `sin-backend`      la operacion de la pantalla no escribe —es un `GET`, o
 *                      no esta en el contrato—: no hay ningun sitio a donde
 *                      guardar. Pide **paciencia**
 *   `sin-declaracion`  la operacion escribe, pero esta opcion no ha declarado
 *                      que campos suyos acepta el backend. Pide **trabajo**, y
 *                      de quien escribe el sistema, no de quien atiende
 *
 * La distincion se lee de lo que ya se sabe —el verbo del contrato y el registro
 * de escrituras—, sin ninguna lista aparte que alguien tenga que mantener al
 * dia. Una opcion que se declare deja de tener impedimento el mismo dia.
 */
export type CausaDelImpedimento = 'sin-backend' | 'sin-declaracion';

export interface ImpedimentoDelActo {
  /**
   * La causa **tecnica**, para quien mantiene el sistema. No se pinta: viaja en
   * un `data-causa` del elemento que lleva el texto.
   *
   * Las dos cosas viven separadas porque tienen dos lectores. Quien atiende en
   * ventanilla no sabe —ni tiene por que— que es «el backend», ni que hay campos
   * «declarados»: leyendo eso, lo unico que puede concluir es que la pantalla
   * esta rota y que la culpa es suya. Quien recibe el aviso en sistemas si
   * necesita saber cual de las dos cosas falta, y la lee del `data-`.
   */
  readonly causa: CausaDelImpedimento;
  /**
   * Lo que se **pinta** junto a la accion, nunca en un `title`: un `title` sobre
   * un boton `disabled` no existe ni para el teclado —no se puede enfocar— ni
   * para el lector de pantalla (FRO-04 §6).
   *
   * **Y dice por donde se sale.** Un mensaje que solo cuenta lo que no se puede
   * hacer deja al mostrador parado; el acto del manual existe fuera del sistema
   * —hay un procedimiento en papel— y lo que hay que decir es que se siga por
   * ahi y que alguien lo sepa.
   */
  readonly detalle: string;
}

const SALIDA =
  'Registra el acto por el procedimiento actual y avísale a sistemas: esta pantalla todavía no guarda.';

const SIN_BACKEND = `Aquí todavía no se puede guardar nada: lo que hay es de consulta. ${SALIDA}`;

const SIN_DECLARACION = `Lo que se escriba aquí todavía no se guarda: la pantalla aún no manda estos campos. ${SALIDA}`;

/**
 * Por que la accion primaria de esta opcion no puede guardar todavia, o nada si
 * puede.
 *
 * Devuelve `undefined` para las opciones que declaran su escritura: esas
 * funcionan igual que siempre —la observacion sigue siendo la condicion de
 * guardado, y `exigir` puede pedir mas—, y lo que las apaga lo dice
 * `Escritura.motivo`, no esto.
 */
export function impedimentoDelActo(opcion: string): ImpedimentoDelActo | undefined {
  if (escrituraDe(opcion) !== undefined) return undefined;
  const operacion = operacionDe(opcion);
  if (operacion === undefined || !escribe(operacion)) {
    return { causa: 'sin-backend', detalle: SIN_BACKEND };
  }
  return { causa: 'sin-declaracion', detalle: SIN_DECLARACION };
}
