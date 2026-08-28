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
 *   `sin-determinacion` la primaria **no guarda lo que hay en pantalla: pide una
 *                      determinacion**. Ninguna de las dos frases de arriba es
 *                      cierta ahi (#333)
 *   `sin-campo`        el acto necesita **un dato que la pantalla no tiene donde
 *                      escribir**: no falta la lista blanca, falta el campo (#73)
 *
 * Las tres primeras se leen de lo que ya se sabe —el verbo del contrato, el
 * rotulo de la primaria y el registro de escrituras—, sin ninguna lista aparte
 * que alguien tenga que mantener al dia. Una opcion que se declare deja de tener
 * impedimento el mismo dia. La cuarta **si** se declara, y tiene que declararse:
 * ver {@link ACTOS_SIN_CAMPO}.
 */
export type CausaDelImpedimento =
  'sin-backend' | 'sin-declaracion' | 'sin-determinacion' | 'sin-campo';

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
 * Acciones que **sacan algo de la pantalla en vez de guardar algo en el
 * sistema**: imprimir, exportar, limpiar el formulario, abrir lo que ya existe.
 *
 * Se mira la etiqueta de la accion y no la opcion, por lo mismo que
 * `esIrreversible`: es lo que el usuario lee, y es lo que el catalogo dibuja. La
 * alternativa —una lista de pantallas de salida— seria una lista que alguien
 * tiene que mantener al dia contra 134 opciones, y que empieza a mentir el dia
 * que una de ellas cambie su primaria.
 */
const DE_SALIDA =
  /^(imprimir|impresi|exportar|excel|pdf|descargar|limpiar|ver\b|abrir|visualizar|previsualizar|consultar|buscar)/i;

const SIN_DETERMINACION =
  'Aquí no se calcula nada: la determinación la hace el servidor y esta pantalla la muestra. ' +
  `Mientras no llegue, los importes salen con «—» y ninguno se puede recomponer aquí. ${SALIDA}`;

/**
 * Acciones que **piden una determinacion en vez de guardar lo que hay en
 * pantalla**: calcular, simular, liquidar (#333).
 *
 * Existe porque de las dos causas de arriba **ninguna es cierta** en una
 * pantalla asi, y la que le tocaba era la mas equivocada de las dos. «Cálculo
 * individual del impuesto predial» declara un `POST` en el contrato y no declara
 * escritura, asi que la franja decia `sin-declaracion`: «lo que se escriba aquí
 * todavía no se guarda: la pantalla aún no manda estos campos». Las dos mitades
 * son falsas —15 de sus 19 campos son `"ro"`, ahi no se escribe nada, y lo que
 * falta no es una entrada en la lista blanca sino la **capa web entera** de la
 * determinacion: el dominio calcula (`RT-001`…`RT-016`,
 * `RegistrarDeterminacionPredial`) y ningun controlador lo publica—. Con la
 * franja equivocada, quien atiende busca un campo que rellenar y no lo hay.
 *
 * Se mira el rotulo de la primaria y no la opcion, por lo mismo que
 * `esIrreversible` y `DE_SALIDA`: es lo que el usuario lee, y una lista de
 * pantallas empieza a mentir el dia que una cambie su primaria. Y se deja
 * **deliberadamente estrecho** —`ejecutar` no entra— porque «Ejecutar proceso»
 * de «Predial — masivo» si manda sus parametros (ejercicio, alcance, derecho de
 * emision), y ahi `sin-declaracion` dice la verdad.
 */
const DE_CALCULO = /^(calcular|recalcular|simular|determinar|liquidar)/i;

/**
 * Un acto al que le falta **un dato que su pantalla no dibuja** (#73).
 *
 * @see ACTOS_SIN_CAMPO para por que esta es la unica causa que se declara.
 */
export interface ActoSinCampo {
  /**
   * El dato que falta, **dicho para quien atiende**: «el valor de la
   * transferencia», no `valorTransferencia`. Ver {@link ImpedimentoDelActo.causa}
   * para el reparto entre los dos lectores.
   */
  readonly dato: string;
  /** Y por que sin el no se puede registrar el acto. Una frase, del dominio. */
  readonly porque: string;
  /**
   * Como lo llama el backend. **No se pinta**: esta aqui para que quien
   * mantenga sepa que campo es sin abrir el controlador, y para que la prueba
   * pueda nombrarlo.
   */
  readonly campos: readonly string[];
}

/**
 * Las opciones cuyo acto **no se puede registrar porque a la pantalla le falta
 * un campo**, no una declaracion (#73).
 *
 * Es la unica de las cuatro causas que se declara en una lista, y esa asimetria
 * necesita defensa: las otras tres se deducen de lo que ya hay —el verbo del
 * contrato, el rotulo de la primaria, el registro de escrituras—, y esta no se
 * puede deducir de nada que el frontend tenga delante. Lo que la decide es la
 * comparacion entre **lo que el controlador exige** y **lo que el catalogo
 * dibuja**, y el catalogo no sabe nada del controlador.
 *
 * Existe por el mismo motivo que `sin-determinacion` (#333): de las causas de
 * arriba, ninguna dice la verdad en estas dos pantallas, y la que les tocaba
 * —`sin-declaracion`, «la pantalla aún no manda estos campos»— **invita a la
 * correccion equivocada**. Declarar los campos en `escrituras.ts` no arregla
 * nada aqui: el cuerpo saldria igual sin el valor de la transferencia, y lo que
 * llegaria a ventanilla es un 422 despues de rellenar catorce campos y de
 * confirmar un acto irreversible.
 *
 * **Las dos transferencias, y el dato es el mismo.**
 * `TransferenciaPredioController` y `TransferenciaVehiculoController` exigen
 * `valorTransferencia` —lo pasan por `dineroDe`, que llama a `exigir`— y
 * `Transferencia` lo declara obligatorio: «el valor declarado del acto». Ninguna
 * de las dos pantallas del manual tiene un campo para el; el prototipo lo dibuja
 * en **otra** pantalla, «Impuesto de alcabala» (`valorDeTransferenciaS`), que es
 * justamente la que el backend **no** lee —`RegistrarAlcabala` lo toma de
 * `transferencia.valorTransferencia()` para calcular la base, y de su peticion
 * solo lee `transferenciaId` y `autoavaluoAjustado`—. O sea: el mismo dato, en
 * dos sitios distintos segun a quien se le pregunte, y ninguno de los dos es
 * inventable desde aqui —es la base sobre la que se liquida la alcabala (art. 24
 * de la Ley de Tributacion Municipal, `docs/10-negocio/valores-normativos/alcabala.md`),
 * asi que un 0,00 de relleno no seria un campo vacio: seria una base imponible
 * falsa—.
 *
 * Se sale de aqui el dia que se decida **donde se captura**: o la pantalla gana
 * su campo, o el acto deja de exigirlo. Las dos son decisiones de diseño, y
 * ninguna cabe en la interfaz.
 */
export const ACTOS_SIN_CAMPO: Readonly<Record<string, ActoSinCampo>> = {
  transferencia_predio: {
    dato: 'el valor de la transferencia, el que figura en la minuta o en la escritura',
    porque:
      'Sin él la transferencia no se puede registrar, porque es la base sobre la que se liquida la alcabala.',
    campos: ['valorTransferencia'],
  },
  transferencia_vehiculo: {
    dato: 'el valor de la transferencia, el que figura en el acta o en el parte registral',
    porque:
      'Sin él la transferencia no se puede registrar: el valor con que el vehículo cambia de manos es parte del hecho que queda asentado.',
    campos: ['valorTransferencia'],
  },
};

/** Lo que declara esa opcion, o nada. `Object.hasOwn`, como el resto del camino. */
const actoSinCampo = (opcion: string): ActoSinCampo | undefined =>
  Object.hasOwn(ACTOS_SIN_CAMPO, opcion) ? ACTOS_SIN_CAMPO[opcion] : undefined;

/**
 * Por que la accion primaria de esta opcion no puede guardar todavia, o nada si
 * puede.
 *
 * Devuelve `undefined` para las opciones que declaran su escritura: esas
 * funcionan igual que siempre —la observacion sigue siendo la condicion de
 * guardado, y `exigir` puede pedir mas—, y lo que las apaga lo dice
 * `Escritura.motivo`, no esto.
 *
 * **Y tambien cuando la primaria es de salida**, que es lo que faltaba: en
 * «Consulta de deuda» la ultima accion es «Imprimir liquidación», y la franja
 * decia «registra el acto por el procedimiento actual y avísale a sistemas» al
 * lado de un boton que no registra ningun acto —no hay ninguno pendiente que
 * llevar a papel—. Eso pasaba en medio centenar de pantallas de consulta, y una
 * advertencia que aparece donde no hay nada que advertir es la forma mas rapida
 * de que dejen de leerse las que si dicen algo. No se sustituye por un texto
 * neutro: un texto neutro seguiria ocupando la franja de la primaria, que es el
 * sitio donde se lee **por que no se puede guardar**, y ahi no hay nada que
 * responder. La franja se queda vacia, que es como esta en las pantallas cuya
 * primaria funciona.
 *
 * La primaria es **la ultima accion** (FRO-03 §5), la misma que dibuja
 * `BarraDeAcciones`.
 */
export function impedimentoDelActo(
  opcion: string,
  /** Las acciones del catalogo de esa pantalla, en su orden. */
  acciones: readonly string[] = [],
): ImpedimentoDelActo | undefined {
  if (escrituraDe(opcion) !== undefined) return undefined;
  const primaria = acciones[acciones.length - 1];
  if (primaria !== undefined && DE_SALIDA.test(primaria.trim())) return undefined;
  /* Antes que ninguna de las otras: es la unica declarada, y las otras dos que
     podrian alcanzarla —`sin-declaracion` por el verbo del contrato— dirian algo
     falso sobre la misma pantalla. Ver `ACTOS_SIN_CAMPO`. */
  const sinCampo = actoSinCampo(opcion);
  if (sinCampo !== undefined) {
    return {
      causa: 'sin-campo',
      detalle: `Falta un dato que esta pantalla no tiene dónde escribir: ${sinCampo.dato}. ${sinCampo.porque} ${SALIDA}`,
    };
  }
  // Antes que el verbo del contrato: una primaria que pide una determinacion no
  // guarda campos, asi que ninguna de las otras dos causas la describe.
  if (primaria !== undefined && DE_CALCULO.test(primaria.trim())) {
    return { causa: 'sin-determinacion', detalle: SIN_DETERMINACION };
  }
  const operacion = operacionDe(opcion);
  if (operacion === undefined || !escribe(operacion)) {
    return { causa: 'sin-backend', detalle: SIN_BACKEND };
  }
  return { causa: 'sin-declaracion', detalle: SIN_DECLARACION };
}
