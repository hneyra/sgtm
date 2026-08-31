import { escribe } from '@sgtm/api-client';
import { operacionDe } from './busqueda';
import { escrituraDe } from './escrituras';
import { lecturaPorPostDe } from './lecturas-por-post';

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
 * Y hay una quinta situacion que **no es un impedimento**, aunque su operacion
 * sea un `POST` y la opcion no declare escritura: la **lectura por `POST`**
 * (#424, `lecturas-por-post.ts`). Ahi el acto de la pantalla funciona; lo que
 * pasa es que no guarda nada.
 *
 * Las tres primeras se leen de lo que ya se sabe —el verbo del contrato, el
 * rotulo de la primaria y el registro de escrituras—, sin ninguna lista aparte
 * que alguien tenga que mantener al dia. Una opcion que se declare deja de tener
 * impedimento el mismo dia. La cuarta **si** se declara, y tiene que declararse:
 * ver {@link ACTOS_SIN_CAMPO}.
 */
export type CausaDelImpedimento =
  | 'sin-backend'
  | 'sin-declaracion'
  | 'sin-determinacion'
  | 'sin-campo';

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

/**
 * Acciones que **cambian el modo de la pantalla en vez de registrar un acto**:
 * «Modificar», «Deshacer», «Quitar» (#391 §2).
 *
 * Es la primera de las dos gemelas que le faltaban a `DE_SALIDA`, y se lee por
 * lo que le pasa a quien la pulsa: `DE_SALIDA` **saca algo** de la pantalla
 * —una hoja, un archivo—, y esto no saca nada ni guarda nada; deja la misma
 * pantalla con otro modo. Un modo no es un acto: no tiene observacion (regla
 * 10 no le aplica, porque no modifica ningun dato), no tiene backend al que
 * llamar y no puede ser primaria de nada.
 *
 * En la barra, ademas, **no hay modo que cambiar**: la interfaz no tiene un
 * estado «solo lectura» del que «Modificar» saque —los campos se dibujan
 * editables o no segun el privilegio (ADR-0013)—, «Deshacer» no tiene ninguna
 * pila de cambios que deshacer, y «Quitar» ya existe **por fila** en
 * `TablaDePisos`, con su propio `aria-label` («Quitar el piso 02»): diez
 * «Quitar» iguales al pie no se distinguen, y uno solo no dice de que fila es.
 *
 * Deliberadamente estrecho, por lo mismo que `DE_CALCULO`: se aplica solo a las
 * opciones que declaran el vocabulario uniforme ({@link VOCABULARIO_UNIFORME}),
 * y ahi las cuatro palabras son las cuatro que el manual escribe.
 */
const DE_MODO = /^(modificar|editar|deshacer|quitar)\b/i;

/**
 * Acciones que **abren un alta** en vez de guardar lo que hay: «Nuevo», «Nuevo
 * sector».
 *
 * La segunda gemela. Un alta no es la accion de la pantalla que se esta
 * mirando: es otro formulario, y ya tiene su sitio —`composicion.flujo` para el
 * asistente guiado, `composicion.altas` para el panel lateral—. Se queda en la
 * barra **solo si esta pantalla declara el formulario que abre**; si no, es un
 * boton que promete un alta que nadie puede abrir, que es exactamente lo que
 * #321 cerro para «Nuevo» del catalogo vial.
 */
const DE_ALTA = /^nuevo\b/i;

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
 *
 * **Es tambien la familia de la simulacion** (#391 §2): «Calcular», «Distribuir
 * valor» ensenan un resultado **antes** de escribir, asi que son secundarias y
 * nunca primarias. Es la misma cosa dicha desde los dos lados —lo que pide una
 * determinacion no guarda campos—, y por eso no hay un patron aparte: dos
 * listas del mismo verbo se separan el dia que alguien anada uno a una sola.
 *
 * `distribuir` entra con #391: «Distribuir valor» de la ficha de bienes comunes
 * reparte el valor de la edificacion entre sus unidades, y ese valor es D-02a
 * —el total sale «—» hoy—. Con ella, esa ficha pasa de `sin-backend` («aquí
 * todavía no se puede guardar nada», que sugiere un guardado que nunca hubo) a
 * `sin-determinacion`, que es lo que de verdad le falta.
 */
const DE_CALCULO = /^(calcular|recalcular|simular|determinar|liquidar|distribuir)/i;

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
 * arriba, ninguna dice la verdad en una pantalla asi, y la que le tocaba
 * —`sin-declaracion`, «la pantalla aún no manda estos campos»— **invita a la
 * correccion equivocada**. Declarar los campos en `escrituras.ts` no arregla
 * nada por si solo: el cuerpo saldria igual sin el dato que falta, y lo que
 * llegaria a ventanilla es un 422 despues de rellenar el formulario entero y de
 * confirmar un acto irreversible.
 *
 * **Y de aqui se sale de tres maneras distintas, porque el hueco tiene tres
 * formas** (#422). No es una taxonomia inventada: sale de mirar las doce que
 * llego a haber y preguntarse quien puede poner cada dato.
 *
 *   1. **Lo teclea quien atiende, y solo falta el control.** El medio de pago de
 *      las dos cajas, el numero de expediente de un descargo, la placa de una
 *      constancia. Se sale **declarando** el control —`ComposicionDeOpcion.controles`,
 *      #422—, y `transito_descargos` es el precedente: un `Campo` con su propia
 *      etiqueta al final de la seccion que la opcion nombre, sin componente
 *      propio. Antes de #422 la unica salida probada era la de #73 —un componente
 *      que sustituye a un campo y anade el que falta— y esa no se puede copiar
 *      doce veces.
 *   2. **Es un identificador interno que hay que resolver contra una lista.**
 *      `fisc_predial` y `fisc_vehicular` piden `programaId`/`contribuyenteId`/
 *      `predioId`, y sin una grilla conectada de la que sacarlos —como
 *      `baja_deuda` los saca de `consulta_deuda`— no hay control que valga. La
 *      mitad de backend que faltaba ya esta: `GET /fiscalizacion/programas`
 *      existe desde #431, asi que el `programaId` tiene de donde salir. Los
 *      otros dos siguen sin publicarlos ninguna lectura de fiscalizacion, y por
 *      eso las dos actas se quedan aqui.
 *   3. **Lo determina el sistema, y hoy no lo determina nadie.** El autovaluo
 *      ajustado de `alcabala` (D-11, D-02a) y el ingreso declarado de
 *      `espectaculos`. Ahi **quedarse aqui es la respuesta correcta**: declararle
 *      un control seria darle a quien atiende una caja donde teclear una cifra
 *      que ninguna norma respalda, y de esa cifra sale el impuesto. Que
 *      generalizar el mecanismo no borre esta franja lo exige una prueba.
 *
 * Las dos transferencias que abrieron esta lista (#73) salieron por la primera
 * forma, antes de que fuera un mecanismo: `pantallas/rentas/composicion.ts`
 * declara un resolutor que **anade** el campo dentro del control que sustituye a
 * otro —«Código predial» en una, «Transferente — documento» en la otra—, sin
 * reescribir el rotulo de ninguno (RNF-080). No se resolvio editando el catalogo
 * —`rentas-registro.generado.ts` no se toca a mano— ni inventando el importe.
 * `transito_descargos` salio por la misma forma y ya sin componente (#422).
 *
 * `alcabala` y `espectaculos` estan aqui desde #385 y son las de la tercera
 * forma; hasta ese issue su primaria del catalogo —«Imprimir liquidación»— las
 * sacaba antes de llegar a esta lista, y el motivo real se leia de un `title`
 * sobre un boton apagado. Ver `rentas/index.ts` para el analisis campo a campo.
 */
export const ACTOS_SIN_CAMPO: Readonly<Record<string, ActoSinCampo>> = {
  /**
   * La caja tributaria y la de tasas, y el mismo dato que a las dos les falta (#33, #74).
   *
   * `CajaController.cobranza` y `.tasas` exigen `formaDePago` en el cuerpo —EFECTIVO, CHEQUE,
   * DEPOSITO, TARJETA o TRANSFERENCIA: con qué entra el dinero— y ninguna sección de ninguna de
   * las dos pantallas dibuja un campo para él. Lo que el prototipo llama «Forma de pago» en
   * `caja_tributaria` es, en el backend, `tipoDePago` —NORMAL TRIBUTARIO, A CUENTA,
   * PRECONVENIO…—: un campo distinto, y opcional. Declarar `formaDePago` en `escrituras.ts`
   * traduciendo esas opciones no arregla nada: el cuerpo saldría igual sin el medio de pago, y lo
   * que llegaría a ventanilla es un 422 después de rellenar la grilla y de confirmar un cobro.
   */
  /*
   * `caja_tributaria` **estaba aqui, y ya no** (#430).
   *
   * Era la primera de las tres formas del hueco —los datos los teclea quien
   * atiende y solo faltaban los controles—, con un agravante: eran **tres**, no
   * uno. La entrada nombraba solo el medio de pago, y `CajaController.cobranza`
   * pasa por `exigir` ademas la caja y el cajero, y exige al menos una
   * obligacion marcada. Desde #430 los tres controles los declara
   * `tesoreria/composicion.ts` —con la etiqueta «Medio de pago», nunca «Forma de
   * pago», que en esta pantalla es el tipo de cobranza (RNF-080)— y las
   * obligaciones salen de la grilla que ya lee `consulta_deuda`, con el patron
   * de seleccion de #332.
   *
   * Se deja anotado y no se borra en silencio: es el precedente de que un acto
   * puede necesitar **varios** datos que ninguna seccion dibuja, y de que
   * nombrarlos de menos deja a quien lo lea creyendo que falta uno.
   */
  caja_tasas: {
    dato: 'los conceptos del TUPA que se cobran, el medio de pago, la caja y el cajero',
    porque:
      'Sin ellos el cobro no se puede registrar: el backend exige al menos un concepto marcado y su tarifa la pone el sistema, no quien atiende — y el tarifario del TUPA de esta municipalidad no está cargado todavía, así que no hay de dónde elegir el concepto. El medio de pago, la caja y el cajero tampoco tienen campo en esta pantalla.',
    campos: ['conceptos', 'formaDePago', 'caja', 'cajero'],
  },

  /**
   * El fraccionamiento, y la grilla que le falta (#35, #74).
   *
   * `PeticionDeFraccionamiento` exige al menos una obligación marcada —«un convenio sin deuda
   * acogida no fracciona nada»—, y el catálogo de esta pantalla no declara ninguna tabla de
   * deuda para elegirla: la única `tabla` que dibuja, «Detalle cuotas», es el cronograma que
   * **sale** de la simulación, no una grilla de entrada. Es la misma frontera que separa a
   * `caja_tributaria` de `consulta_deuda`, pero aquí no hay ni siquiera una tabla vacía a la que
   * conectar una lectura: el prototipo no reservó el bloque.
   */
  fraccionamiento: {
    dato: 'las deudas que se acogen al convenio, elegidas en una grilla',
    porque:
      'Sin ellas el convenio no se puede registrar: el backend exige al menos una obligación marcada, y esta pantalla no dibuja ninguna tabla de deuda donde elegirla — la única que tiene, «Detalle cuotas», es el cronograma que sale de simular, no una grilla de entrada.',
    campos: ['obligaciones'],
  },

  /*
   * `transito_descargos` **estaba aqui, y ya no** (#422).
   *
   * Era el caso mas limpio de la primera de las tres formas del hueco —el dato
   * lo teclea quien atiende y solo faltaba el control—: `DescargosController`
   * exige `nDeExpediente`, «el numero con que entra por mesa de partes», y la
   * unica seccion editable de la pantalla lo dibuja `"ro"`, porque es el del
   * descargo que se esta consultando. Desde #422 lo declara
   * `transito/composicion.ts` como un control **anadido** al final de
   * «Solicitud», con su propia etiqueta (RNF-080), y la escritura entera esta en
   * `escrituras.ts`. Le hacia falta ademas la otra mitad, que puso #421: la
   * ultima accion del catalogo es «Notificar al administrado» y la que registra
   * es la primera de las tres, asi que `LA_QUE_ESCRIBE` la pasa al final.
   *
   * Se deja anotado y no se borra en silencio porque es el precedente: las que
   * quedan aqui de esa misma forma —el medio de pago de las dos cajas, la placa
   * de la constancia libre— se cierran por este camino, y las que no son de esa
   * forma no se cierran por ninguno.
   */

  /**
   * Constancia libre de infracciones, y la resolución de gerencia ordinaria y sancionadora:
   * tres pantallas «hoja de reporte» sin ni un campo editable (#53, #50, #77).
   *
   * Las tres son `POST` con `kind: 'report'` en el catálogo, y ninguna declara `secciones`
   * ni `acciones`: no hay dónde escribir la placa que exige `ConstanciasLibresController`,
   * ni la papeleta/fecha/sustento que exige `ResolucionesDeGerenciaController`. No es que
   * falte un campo entre varios — falta la pantalla entera del formulario.
   */
  transito_constancia_libre: {
    dato: 'la placa del vehículo que se va a acreditar sin papeletas pendientes',
    porque:
      'Sin ella no se puede emitir: el backend la exige, y esta pantalla no declara ninguna sección con campos, solo la hoja del documento que resultaría.',
    campos: ['placa'],
  },
  transito_rg_ordinaria: {
    dato: 'la papeleta que resuelve, la fecha y el sustento de la resolución',
    porque:
      'Sin ellos no se puede dictar: el backend los exige, y esta pantalla no declara ninguna sección con campos, solo la hoja de la resolución que resultaría.',
    campos: ['papeleta', 'fecha', 'sustento'],
  },
  transito_rg_sancionadora: {
    dato: 'la papeleta que resuelve, la fecha y el sustento de la resolución',
    porque:
      'Sin ellos no se puede dictar, por el mismo motivo que en la ordinaria: el backend los exige y esta pantalla tampoco declara ninguna sección con campos.',
    campos: ['papeleta', 'fecha', 'sustento'],
  },

  /**
   * Las dos resoluciones de licencia: la misma hoja sin superficie que las tres
   * de arriba, clasificada donde le toca (FRO-06, #427).
   *
   * Estaban en `sin-declaracion` —«la pantalla aún no manda estos campos»— y
   * esa es la causa que **invita a la correccion equivocada**: no hay campos
   * que declarar, porque no hay ni una seccion. `LicenciaController.cancelacion`
   * exige el `motivo` (`CancelarLicencia.SinMotivo`) y `.duplicado` exige ademas
   * el `nDeRecibo` del derecho de tramite **del duplicado** —no el de la
   * licencia, que es el que dibuja `licencia_funcionamiento`—.
   *
   * Como las tres de transito, su franja no se dibuja: sin `acciones` no hay
   * `<BarraDeAcciones>`. Lo que se lee esta en `AVISOS`; esto es lo que hace que
   * el censo diga la verdad, y lo que sostiene la franja el dia que la pantalla
   * del acto exista.
   */
  licencia_resolucion_cancelacion: {
    dato: 'el motivo por el que la licencia queda sin efecto',
    porque:
      'Sin él no se puede cancelar: el backend lo exige, y esta pantalla no declara ninguna sección con campos, solo la hoja de la resolución que resultaría.',
    campos: ['motivo'],
  },
  licencia_resolucion_duplicado: {
    dato: 'el motivo del duplicado —extravío, deterioro, robo— y el recibo de su derecho de trámite',
    porque:
      'Sin ellos no se puede autorizar: el backend los exige, y esta pantalla no declara ninguna sección con campos, solo la hoja de la resolución que resultaría.',
    campos: ['motivo', 'nDeRecibo'],
  },

  /**
   * Y las dos de infracciones administrativas: las ultimas dos hojas sin
   * superficie que quedaban descolocadas (FRO-06, #428).
   *
   * Son las gemelas exactas de `transito_rg_ordinaria` y de
   * `transito_rg_sancionadora` —**el mismo acto administrativo**, dice
   * `ResolverConResolucionDeGerencia`— y estaban en otra casilla:
   * `sin-declaracion` pedia declarar campos sobre una pantalla que no tiene ni
   * una seccion.
   *
   * Lo que las dos anaden al motivo, y no tienen las de transito, es **donde si
   * esta dibujado su formulario**: el de la resolucion, en «Descargos y
   * reclamos» (`transito_descargos`, que sirve a las dos familias); el de la
   * diligencia, en «Notificación» (`adm_notificacion`). En los dos casos cuelga
   * de otro acto, asi que no vale tal cual —ver FRO-06 §2—, pero decirlo evita
   * que se busque un formulario que nadie dibujo dos veces.
   */
  adm_resolucion_gerencia: {
    dato: 'la papeleta que resuelve, la fecha de la resolución y su sustento',
    porque:
      'Sin ellos no se puede dictar: esta pantalla no declara ninguna sección con campos, solo la hoja de la resolución que resultaría. El formulario sí está dibujado en «Descargos y reclamos», pero allí resuelve un recurso presentado, y una resolución también se dicta sin ninguno.',
    campos: ['papeleta', 'fecha', 'sustento'],
  },
  adm_notificacion_resolucion: {
    dato: 'la resolución que se notifica, y la diligencia: su fecha, la modalidad, el resultado y quién notificó',
    porque:
      'Sin ellos no se puede registrar la notificación: esta pantalla no declara ninguna sección con campos, solo la cédula que resultaría. La diligencia sí está dibujada en «Notificación», pero allí cuelga del acta preventiva, que es otro acto.',
    campos: ['fechaDeNotificacion', 'modalidad', 'resultado', 'notificador'],
  },

  /**
   * Alcabala y espectaculos publicos: el bloqueo doble que #73 documento, #385
   * dejo registrado como deuda y **#432 contesto por escrito**. Sus primarias
   * del catalogo son de salida («Imprimir liquidacion»), asi que sin esta
   * entrada la causa `DE_SALIDA` ganaba y el motivo real —la pantalla entera no
   * puede escribir— no llegaba ni al teclado ni al lector (RNF-082). Desde #385,
   * `ACTOS_SIN_CAMPO` gana a `DE_SALIDA` tambien aqui, y la franja se dibuja.
   *
   * **Lo que cambia con #432 es lo que la franja dice**, no la casilla: las dos
   * seguian nombrando dos datos con el mismo tono, y de los cuatro solo **uno**
   * es un campo que falta. Los otros tres son cosas distintas —una respuesta que
   * la pantalla ya recibe y no guarda, una cifra que determina el sistema y hoy
   * no determina nadie, y una multiplicacion que ni la pantalla puede hacer
   * (RNF-083) ni el servidor hace—, y decirlas igual manda a buscar un campo que
   * no existe. El analisis campo a campo, con las dos preguntas de #432
   * contestadas, vive en `pantallas/rentas/index.ts`.
   */
  alcabala: {
    dato: 'la transferencia ya registrada sobre la que se liquida',
    porque:
      'Ninguna consulta del sistema devuelve todavía las transferencias registradas, así que no hay de dónde elegir la que se liquida ni cómo teclearla. Y aunque la hubiera, la liquidación seguiría sin poder calcularse: el autovalúo ajustado que la ley manda comparar con el valor de la transferencia lo determina el sistema —esta pantalla lo enseña como el resultado de multiplicar el autovalúo del predio por el índice del año—, y hoy no lo determina nadie.',
    campos: ['transferenciaId', 'autoavaluoAjustado'],
  },
  espectaculos: {
    dato: 'el organizador, identificado contra el padrón, y la recaudación declarada',
    porque:
      'Aquí el organizador se escribe por su nombre y el registro lo necesita identificado, y no hay ningún control que lo busque en el padrón. La recaudación declarada tampoco se puede poner: esta pantalla la enseña como el resultado de multiplicar las entradas vendidas por el precio promedio, y esa multiplicación no la hace la pantalla —ninguna cifra de dinero se compone aquí— ni el servidor, que la pide ya hecha.',
    campos: ['organizadorId', 'ingresoDeclarado'],
  },

  /**
   * Las **cuatro** de fiscalizacion (#45, #49, #80, #431): a las cuatro les falta
   * un dato para el que ninguna seccion del catalogo dibuja un campo editable.
   * Ver el javadoc de `pantallas/fiscalizacion/index.ts` para el analisis
   * completo, opcion por opcion.
   *
   * **Las tres listas de `campos` estaban cortas hasta #431**, y esa clase de
   * error es la que este mecanismo existe para no cometer: `campos` es lo que
   * quien mantiene lee para saber que falta sin abrir el controlador, y las tres
   * omitian el `fiscalizador` —`ActaPredialController` y `ActaVehicularController`
   * lo pasan por `exigir`, y el catalogo de la predial lo dibuja `"ro"`—.
   */
  fisc_programa: {
    dato: 'el código y la descripción del programa',
    porque:
      'Sin ellos el programa no se puede registrar: el backend los exige, y la única sección de esta pantalla dibuja el número de programa de solo lectura y ningún campo de descripción — el catálogo capturó el resultado de generar un programa, no el formulario que lo crea. Y ninguno de los tres botones registra un programa: generar la muestra, asignar fiscalizador y aprobar son actos que el sistema todavía no hace.',
    campos: ['codigo', 'descripcion'],
  },
  fisc_predial: {
    dato: 'quién fiscaliza, y con qué palabra se anota lo que encontró',
    porque:
      'El programa, el contribuyente y el predio ya se pueden resolver —el programa desde su propio listado, y los otros dos desde el padrón y desde el catastro—, pero el nombre de quien suscribe el acta se dibuja de solo lectura, y de las seis opciones de «Hallazgo principal» ninguna es una de las cuatro que el sistema distingue: un acta registrada así entraría sin decir qué se encontró, y la liquidación posterior la compararía como si el predio se hubiera hallado.',
    campos: ['fiscalizador', 'hallazgo'],
  },
  fisc_vehicular: {
    dato: 'la visita entera: su fecha, quién fiscaliza y el vehículo inspeccionado',
    porque:
      'Esta pantalla no declara ninguna sección de campos — su catálogo es un filtro y una grilla de vehículos observados, no el acta que el endpoint registra. El prototipo capturó el resultado de un cruce, no la inspección: no hay dónde escribir la fecha, ni el fiscalizador, ni de qué fila sacar el vehículo, porque esa grilla tampoco tiene lectura que la llene.',
    campos: ['programaId', 'contribuyenteId', 'vehiculoId', 'fechaVisita', 'fiscalizador'],
  },

  /**
   * Y la cuarta, que hasta #431 se leia como una consulta y **no lo es**.
   *
   * `impedimentoDelActo` la clasificaba `sin-backend` —«aquí todavía no se puede
   * guardar nada: lo que hay es de consulta»— porque la operacion que el catalogo
   * le da es un `GET`. Las dos mitades de esa frase son falsas: su accion
   * primaria, «Emitir resoluciones de determinación», **tiene backend desde
   * #52** —`POST /fiscalizacion/transferencias`, que `ResolucionController`
   * declara con `@RequiereAcceso(acceso = "fisc_resultados")` y su javadoc llama
   * literalmente «la accion de `fisc_resultados`»—, y es ademas la frontera mas
   * delicada del sistema: es el unico camino por el que un dato de fiscalizacion
   * pasa a ser el dato oficial del padron.
   *
   * Lo que de verdad le falta son los cuatro datos que esa transferencia exige y
   * que su catalogo no dibuja en ninguna parte: no declara **ni una seccion**,
   * solo filtros, tabla y totales.
   */
  fisc_resultados: {
    dato: 'la liquidación que se transfiere, con su documento de sustento, el sustento y la base legal',
    porque:
      'Sin ellos no se puede emitir la resolución: el backend los exige, y esta pantalla no declara ninguna sección con campos — es la relación de actas con diferencia, no el formulario del acto que las lleva al padrón.',
    campos: ['nLiquidacion', 'documentoSustento', 'sustento', 'baseLegal'],
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
  /* Y tampoco lo tiene la que declara su **lectura por `POST`** (#424): su acto
     no guarda nada —compone una hoja—, asi que ni le falta la lista blanca de
     `escrituras.ts` ni le falta un campo. Va al mismo rango que la escritura
     declarada y por delante de todo lo demas, porque las tres causas de abajo
     dirian una cosa falsa: `sin-declaracion` pediria declarar campos que esa
     pantalla no manda, y `sin-backend` diria que no hay a donde guardar cuando
     lo que hay es que no hay nada que guardar. */
  if (lecturaPorPostDe(opcion) !== undefined) return undefined;
  const primaria = acciones[acciones.length - 1];
  /* Antes incluso que `DE_SALIDA` (#385): una pantalla declarada aqui tiene un
     motivo REAL que contar —no puede escribir lo que el backend exige—, y con
     el orden anterior una primaria de salida («Imprimir liquidacion» en
     alcabala y espectaculos) lo silenciaba: el boton salia `disabled` con un
     `title` que un boton sin foco no puede leer en voz alta (RNF-082). La
     entrada en `ACTOS_SIN_CAMPO` es deliberada y escasa; cuando existe, gana. */
  const sinCampo = actoSinCampo(opcion);
  if (sinCampo !== undefined) {
    return {
      causa: 'sin-campo',
      detalle: `Falta un dato que esta pantalla no tiene dónde escribir: ${sinCampo.dato}. ${sinCampo.porque} ${SALIDA}`,
    };
  }
  if (primaria !== undefined && DE_SALIDA.test(primaria.trim())) return undefined;
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

/* ── Un solo vocabulario de accion (#391 §2) ───────────────────────────── */

/**
 * Las opciones que componen su barra con **un solo vocabulario de accion**.
 *
 * Hoy las cinco del predio, y no es casualidad que sean las primeras: son cinco
 * pantallas del **mismo objeto** con cinco vocabularios —«Nuevo · Modificar ·
 * Deshacer · Imprimir · Guardar», «Nuevo · Guardar · Imprimir», «Distribuir
 * valor · Guardar», «Calcular · Guardar · Imprimir ficha rural», «Nuevo ·
 * Guardar · Imprimir · Quitar»—, y la primaria significaba cosas distintas en
 * cada una: guardar en dos, imprimir en dos. Quien atiende aprende el boton
 * navy de una pantalla y en la de al lado le imprime.
 *
 * **Es opt-in por opcion, y la negacion por omision no cambia**: las que no
 * estan aqui reciben su lista del catalogo tal cual —{@link accionesDeLaBarra}
 * la devuelve intacta, salvo la mudanza de {@link LA_QUE_ESCRIBE}— y se dibujan
 * exactamente como se dibujaban. Es deliberado: reordenar las 134 barras a la
 * vez cambiaria el boton navy de medio sistema en un solo diff, y lo que aquel
 * issue pidio es uniformar un modulo.
 *
 * **Y la sexta es `calles`** (#421). Su catalogo dibuja «Nuevo · Guardar ·
 * Inactivar», su operacion es `GET /catastro/vias` y la regla de FRO-03 §5
 * convertia «Inactivar» en el boton navy: una baja logica con el color del acto
 * principal, que es exactamente lo que esta regla vino a corregir. Se le habia
 * escapado a #391 §4 porque `Territorio` pasaba la lista **cruda** del catalogo
 * en vez de la compuesta, y —el hallazgo que mas dice— **ninguna de las 266
 * pruebas del modulo se puso roja** al cambiarlo: esa barra no la fijaba nada.
 *
 * Con la regla puesta, «Guardar» e «Inactivar» **se caen** y queda «Nuevo», que
 * es el unico acto que esta pantalla puede hacer hoy —el panel de alta de #321,
 * vivo—. No se quedan apagadas con su motivo (#332) por dos razones, y la
 * segunda es la que decide: los dos botones ya estaban apagados y mudos, asi
 * que no se pierde nada que se pudiera pulsar; y un motivo aqui **no lo leeria
 * nadie**, porque la primaria de `calles` es el alta, que no lo referencia con
 * `aria-describedby` —esa franja huerfana es justo el ruido que #332 le quito a
 * esta pantalla—. El precedente es `sectores`, que perdio su «Guardar» por lo
 * mismo, y las tres hojas de valuacion (ADR-0017). El dia que se conecte
 * `editar_via` —`PUT /catastro/vias/{codigo}`, que existe en el contrato y es
 * quien modifica y quien da de baja— la opcion declarara su escritura y los dos
 * volveran por la misma regla: esto no borra nada, pone una condicion.
 */
export const VOCABULARIO_UNIFORME: ReadonlySet<string> = new Set([
  'ficha_urbana',
  'ficha_economica',
  'ficha_bienes',
  'ficha_rural',
  'actualizacion_catastro',
  'calles',
  /* **Las tres lecturas del padron de Rentas · Registro** (#442).
     Son el mismo caso que las cuatro fichas catastrales y por el mismo motivo:
     su operacion es un `GET`, ninguna declara escritura, y entre las tres
     dibujan **ocho** botones que no son actos —tres «Guardar» que no podrian
     guardar ni el dia que se conectara el backend, tres «Nuevo» que no abren
     ningun alta y dos «Modificar», que es un modo—.
     Con `predios_rentas` se cierra ademas un defecto que no se veia: su primaria
     «Ver ficha catastral» cae en `DE_SALIDA`, asi que `impedimentoDelActo`
     devolvia `undefined` y la pantalla prometia un guardado **sin franja que lo
     desmintiera**. Es el mismo hueco que #385 cerro en `alcabala` y
     `espectaculos`, en otra pantalla del mismo modulo.
     **Las otras doce del modulo se quedan fuera, y no por descuido**: aplicar la
     regla a las quince borraria nueve actos reales del manual —«Ejecutar
     proceso», las dos «Emitir cuponera», «Vista previa», «Generar orden de
     pago», «Registrar»— y dejaria a `beneficios` con la barra vacia, porque sus
     tres acciones escriben y ninguna esta declarada. La regla se escribio para
     cuatro fichas de consulta; rentas es un modulo que escribe. Ver #442. */
  'contribuyentes',
  'predios_rentas',
  'vehiculos',
  /* **Las dos hojas de consulta de los resultados de Fiscalizacion** (#506 F1).
     Entre las dos dibujan **siete** botones y ninguno registra un acto: su
     operacion es un `GET` en las dos, ninguna declara escritura, y de los siete
     rotulos cuatro son de salida —«Buscar» dos veces, «Limpiar», «Imprimir» dos
     veces— y los otros dos, «Filtrar» y «Actualizar», no son ni salida ni acto:
     son la misma busqueda de la barra de filtros, con otro nombre y sin nada
     detras.
     Con la regla puesta se caen esos dos y quedan las de salida, **sin
     primaria**, que es lo correcto: aqui no se escribe nada. Y la franja no
     cambia —la ultima sigue siendo «Imprimir», que `DE_SALIDA` reconoce—, asi
     que el censo de `actos-honestos` no se mueve: las dos siguen contando como
     `salida`.
     **La tercera hoja, `fisc_resultados`, se queda fuera a proposito.** Su
     ultima accion —«Emitir resoluciones de determinación»— **si** es el acto, y
     el unico por el que un dato de fiscalizacion pasa a ser el dato oficial del
     padron (`POST /fiscalizacion/transferencias`, #52). No declara escritura
     todavia porque le faltan cuatro campos que su catalogo no dibuja (#431), asi
     que esta en {@link ACTOS_SIN_CAMPO} y su boton sale apagado **con la franja
     que los nombra**. Aplicarle esta regla lo borraria de la barra: sin boton no
     hay `aria-describedby`, y la franja que explica que le falta no la leeria
     nadie —RNF-082, el mismo defecto que #385 corrigio en `alcabala` y #429 en
     las tres hojas de Transito—. */
  'fisc_estado_cuenta',
  'fisc_historico',
]);

/**
 * **Cual accion escribe, cuando no es la ultima del catalogo** (#421).
 *
 * Hermana de {@link VOCABULARIO_UNIFORME} y su complemento exacto: aquella
 * recompone la barra entera por el papel de cada accion —quita modos, se queda
 * con las altas que abren algo, manda al fondo la que guarda—; esta solo dice
 * **cual de las que ya hay es el acto**, y deja las demas donde el catalogo las
 * dibuja. Son dos decisiones de distinto tamaño, y por eso son dos listas.
 *
 * Existe porque FRO-03 §5 —«la ultima accion es la primaria»— da por supuesto
 * que el prototipo dibuja la que guarda al final, y en once pantallas no lo
 * hace: las capturo como barras de herramientas de escritorio —Nuevo ·
 * Modificar · Guardar · Imprimir…—, donde el orden es el de la mano que teclea
 * y no el de la importancia. Declarar la escritura tal cual habilita el boton
 * equivocado, y el caso que mejor lo dice es `importacion_valores`: pulsar
 * «Limpiar campos» importaria valores a coactiva —irreversible, RF-100— cuando
 * quien atiende solo queria borrar el formulario.
 *
 * **Es un rotulo, no un indice**: es lo que el catalogo dibuja y lo que el
 * usuario lee, el mismo criterio que `esIrreversible`, {@link DE_SALIDA} y las
 * altas de la barra. Un indice se rompe en silencio el dia que el prototipo
 * reordene su barra; un rotulo que ya no existe lo caza la prueba que compara
 * cada declaracion contra el catalogo, letra por letra.
 *
 * **Y los rotulos no se reescriben** (RNF-080): se nombra el que el catalogo
 * dibuja, no el que uno querria leer. Por eso `notificaciones_coactivas`
 * declara «Grabar» y no «Guardar», y `adm_valores` declara «Procesar» y no
 * «Generar valores» —ese rotulo es el del componente propio de `transito_valores`
 * (#77), no el de esta pantalla—.
 *
 * **Gana a `DE_SALIDA`**, por lo mismo que {@link ACTOS_SIN_CAMPO} le gana desde
 * #385: la declaracion es deliberada y escasa, y el filtro de salida es una
 * heuristica sobre el rotulo. Aqui gana **por construccion** y no con un caso
 * mas en {@link impedimentoDelActo}: al pasar la accion declarada al final, la
 * de salida deja de ser la primaria y el filtro no llega a verla. Es lo que
 * saca a `certificados` del silencio —su ultima es «Imprimir certificado», asi
 * que su motivo se quedaba en un `title` sobre un boton `disabled`, que no
 * llega ni al teclado ni al lector (RNF-082)—.
 *
 * **De las doce, once no conectan ninguna escritura**: siguen sin declarar sus
 * campos en `escrituras.ts`, asi que su primaria sigue apagada; lo que cambia es
 * **cual** lo esta, y que la franja pasa a decir por que. Declararlas es de los
 * issues de su modulo.
 *
 * La doceava —`transito_descargos`, #422— si: es la primera pantalla en la que
 * esta declaracion y la de `ComposicionDeOpcion.controles` se necesitan a la
 * vez, y por eso se anadio aqui y no en el issue de su modulo. Lo que aporta
 * cada una se separa bien: esta dice **cual boton** escribe, y la otra **donde**
 * se teclea el dato que el backend exige y el manual no dibuja.
 */
export const LA_QUE_ESCRIBE: Readonly<Record<string, string>> = {
  /* ── Coactiva (#76) ────────────────────────────────────────────────────
     Las seis que el javadoc de `pantallas/coactiva/index.ts` censo una a una. */

  /** La primera de la barra, y la unica irreversible de las cuatro (RF-100). */
  importacion_valores: 'Importar valores',
  /**
   * «Generar» dicta la REC por primera vez; «Imprimir» es la reimpresion
   * (`PeticionDeRec.reimprimir`) y «REC 2» y «Carátula» son otros dos papeles
   * del mismo expediente. El catalogo **no dibuja ninguna «REC 1»**: la que
   * emite es esta.
   */
  rec_impresion: 'Generar',
  /** La penultima; la ultima es «Limpiar», que borra el formulario. */
  expediente_historial: 'Guardar cambios',
  /** La penultima; la ultima es «Imprimir» la liquidacion ya asentada. */
  costas_procesales: 'Guardar',
  /** La ultima es «Padrón», que es un reporte. */
  actos_coactivos: 'Guardar',
  /**
   * «Grabar», que es como lo escribe el catalogo (RNF-080). La ultima es
   * «Resol. consentida», otro acto del expediente.
   */
  notificaciones_coactivas: 'Grabar',

  /* ── Autorizaciones y licencias (#79) ──────────────────────────────────── */

  /**
   * Las dos hojas de reporte del prototipo, con el mismo cuarteto «Exportar ·
   * Imprimir · Pantalla · Cancelar» y la misma primaria equivocada: «Cancelar»
   * cierra el dialogo, y el navy decia que cerrar era el acto.
   *
   * De las tres que quedan se declara **«Pantalla»**, y no «Exportar» ni
   * «Imprimir» como sugeria el censo del issue: la operacion que el catalogo da
   * a estas dos opciones es el `POST` **sin** `formato`, que devuelve el padron
   * para dibujarlo —`LicenciaController.padron`—, mientras que exportar e
   * imprimir son el mismo `POST` con `?formato=`, que en esta interfaz es una
   * descarga (`useDescargaDeArchivo`) y no la primaria. Declarar «Imprimir»
   * dejaria el navy diciendo que imprime cuando lo que hace es traer la hoja a
   * la pantalla, que es la mentira que RNF-080 y #391 §2 cierran por los dos
   * lados.
   */
  anuncios_reportes: 'Pantalla',
  licencia_padron: 'Pantalla',
  /**
   * La que emite el certificado; la ultima es «Imprimir certificado», que
   * `DE_SALIDA` reconocia **antes** de llegar a `ACTOS_SIN_CAMPO` y dejaba el
   * motivo real —falta `nDeRecibo`— sin franja que lo contara.
   */
  certificados: 'Emitir',

  /* ── Tesorería (#423) ──────────────────────────────────────────────────── */

  /**
   * «Anulación de convenio» es la primera que declara esto **teniendo mas de una
   * accion que escribe**: «Anular» y «Quebrar» mandan las dos, con `accion`
   * distinta (`EscrituraDeclarada.segunLaAccion`). Lo que se declara aqui sigue
   * siendo una sola cosa —**cual es el acto de la pantalla**—, y es «Anular»:
   * le da nombre a la opcion, y con el orden del catalogo el navy le tocaba a
   * «Quebrar», que es el acto excepcional —el que se dicta cuando el
   * contribuyente incumple—. «Quebrar» se queda de secundaria, encendida y con
   * su propia confirmacion de irreversible.
   */
  anulacion_convenio: 'Anular',
  /* ── Transito (#77, #422) ──────────────────────────────────────────────── */

  /**
   * La que registra el escrito, y es **la primera** de las tres: las otras dos
   * —«Resolver», «Notificar al administrado»— son actos posteriores del mismo
   * expediente, y la ultima del catalogo es la de notificar.
   *
   * Es la primera opcion en la que las dos declaraciones de esta onda se
   * necesitan a la vez (#422): sin `LA_QUE_ESCRIBE` la primaria seria el boton
   * de notificar, y sin el control anadido de `transito/composicion.ts` no
   * habria donde teclear el numero de expediente que el backend exige. Ninguna
   * de las dos sobra, y se ve en que quitar cualquiera de ellas deja la pantalla
   * exactamente igual de rota, por motivos distintos.
   */
  transito_descargos: 'Registrar descargo',

  /* ── Infracciones administrativas (#78) ────────────────────────────────── */

  /** La ultima es «Imprimir» la notificacion ya registrada. */
  adm_notificacion: 'Guardar',
  /**
   * «Procesar» es la que lanza la corrida —`POST .../valores/generacion-masiva`,
   * `PeticionDeCorridaDeValores`—; «Guardar» graba el criterio, que ninguna
   * operacion del contrato publica todavia, y «Imprimir» es la ultima.
   */
  adm_valores: 'Procesar',
};

/** Lo que declara esa opcion, o nada. `Object.hasOwn`, como el resto del camino. */
const laQueEscribe = (opcion: string): string | undefined =>
  Object.hasOwn(LA_QUE_ESCRIBE, opcion) ? LA_QUE_ESCRIBE[opcion] : undefined;

/** La barra tal como se dibuja: que acciones, y si alguna de ellas es la primaria. */
export interface BarraDeLaPantalla {
  /**
   * Las acciones que se quedan, **en el orden de la regla**: primero las que no
   * escriben, y al final —si la hay— la que escribe.
   */
  readonly acciones: readonly string[];
  /**
   * La ultima de `acciones` **escribe**, asi que es la primaria (FRO-03 §5).
   *
   * `false` dice lo contrario y es una afirmacion, no una ausencia: esta
   * pantalla **no tiene ningun acto que escribir**, asi que ninguna de sus
   * acciones puede ser la primaria y ninguna se dibuja navy. Sin esto, la regla
   * «la ultima es la primaria» convierte a «Imprimir ficha rural» en el boton
   * navy de una ficha de consulta, que es el defecto que #391 §2 cierra.
   *
   * **No decide sobre el alta ni sobre el enlace**: los dos siguen siendo el
   * acto de la pantalla cuando no hay otro (`BarraDeAcciones`), y los dos
   * llevan a un sitio donde si se escribe.
   */
  readonly conPrimaria: boolean;
}

/**
 * **Una primaria por pantalla, siempre la ultima, y siempre la que escribe**
 * (#391 §2).
 *
 * Los rotulos **no se reescriben** (RNF-080): «Imprimir ficha rural» sigue
 * diciendo «Imprimir ficha rural». Lo que se uniforma es el **sitio y el papel**
 * de cada accion, y eso se decide por el papel que ya reconocen los patrones de
 * este archivo:
 *
 *   {@link DE_MODO}     no es un acto: fuera de la barra
 *   {@link DE_ALTA}     abre otro formulario: se queda **si** esta pantalla lo
 *                       declara (`composicion.flujo` / `composicion.altas`);
 *                       si no, es un alta que nadie puede abrir
 *   {@link DE_CALCULO}  ensena un resultado antes de escribir: secundaria
 *   {@link DE_SALIDA}   saca algo de la pantalla: secundaria
 *   lo demas            escribe: es la primaria, **y solo si hay a donde
 *                       escribir**; si no, se cae de la barra
 *
 * Esa ultima linea es la que quita los cuatro «Guardar» de las cuatro fichas:
 * su operacion es un `GET`, asi que ese boton no podia guardar nada ni el dia
 * que se conectara el backend. Es el precedente de `sectores` en
 * `Territorio.tsx` y el de las tres hojas de valuacion —ADR-0017 les quita el
 * «Guardar» por decreto—, aplicado aqui por el mismo motivo: ningun acto promete
 * lo que no puede (#332).
 *
 * **El censo de `actos-honestos.test.tsx` pregunta por aqui**, y tiene que
 * hacerlo: `impedimentoDelActo` dice que la primaria es «la ultima accion, la
 * misma que dibuja `BarraDeAcciones`», y desde este issue esa lista ya no es
 * siempre la del catalogo. Contar sobre la del catalogo dejaria a la funcion
 * explicando un boton que no existe.
 *
 * **Y desde #421 hay una segunda puerta, mas pequeña**: una opcion que declare
 * {@link LA_QUE_ESCRIBE} sin declarar el vocabulario uniforme recibe su lista
 * entera, con la accion declarada movida al final. Las dos son opt-in y
 * **ninguna opcion declara las dos**: serian dos reglas decidiendo la misma
 * cosa —cual es la primaria—, y hay una prueba que lo exige.
 */
export function accionesDeLaBarra(
  opcion: string,
  /** Las acciones del catalogo de esa pantalla, en su orden. */
  acciones: readonly string[],
  /** Los rotulos que **abren un alta de verdad** aqui, tal como los declara la composicion. */
  altas: readonly string[] = [],
): BarraDeLaPantalla {
  if (!VOCABULARIO_UNIFORME.has(opcion)) {
    const queEscribe = laQueEscribe(opcion);
    return queEscribe === undefined
      ? { acciones, conPrimaria: true }
      : conLaQueEscribeAlFinal(acciones, queEscribe);
  }
  // Si la opcion no declara su escritura, no hay a donde guardar: la accion que
  // escribiria se cae, en vez de quedarse apagada prometiendo un guardado.
  const puedeEscribir = escrituraDe(opcion) !== undefined;
  const secundarias: string[] = [];
  let primaria: string | undefined;
  for (const accion of acciones) {
    const texto = accion.trim();
    if (DE_MODO.test(texto)) continue;
    if (DE_ALTA.test(texto)) {
      if (altas.includes(accion)) secundarias.push(accion);
      continue;
    }
    if (DE_CALCULO.test(texto) || DE_SALIDA.test(texto)) {
      secundarias.push(accion);
      continue;
    }
    // La ultima que escriba, y no la primera: si el prototipo dibujara dos
    // verbos de guardado, la primaria es la de mas a la derecha.
    if (puedeEscribir) primaria = accion;
  }
  return primaria === undefined
    ? { acciones: secundarias, conPrimaria: false }
    : { acciones: [...secundarias, primaria], conPrimaria: true };
}

/**
 * La barra con la accion declarada al final, y las demas como estaban.
 *
 * **No quita ninguna y no reordena nada mas.** Mover la que escribe es todo lo
 * que hace falta para que la primaria sea la que escribe; quitar botones es lo
 * que hace el vocabulario uniforme, que es una decision mas grande —cambia lo
 * que la pantalla ofrece, no solo cual de sus ofertas es el acto— y tiene su
 * propia lista. Aqui las once pantallas siguen dibujando lo que el prototipo
 * capturo, apagado como estaba, y solo cambia cual lleva el color del acto.
 *
 * Si el rotulo declarado **no esta** en el catalogo, la lista vuelve intacta: es
 * una declaracion muerta, y lo que la caza es la prueba que compara cada rotulo
 * contra el catalogo letra por letra —no un fallo en ventanilla, que dejaria la
 * pantalla sin barra por una errata—.
 */
function conLaQueEscribeAlFinal(acciones: readonly string[], rotulo: string): BarraDeLaPantalla {
  const declarada = acciones.find((accion) => accion.trim() === rotulo);
  if (declarada === undefined) return { acciones, conPrimaria: true };
  return {
    acciones: [...acciones.filter((accion) => accion !== declarada), declarada],
    conPrimaria: true,
  };
}
