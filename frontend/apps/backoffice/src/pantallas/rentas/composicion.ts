import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';

/**
 * Las cabeceras-resumen, **cargadas con el modulo y no en el arranque**.
 *
 * Este archivo lo importa `pantallas/composicion.ts`, y ese lo importa
 * `Pantalla`: importar aqui los tres componentes los metia en el trozo comun,
 * que es el que baja quien entra a mirar un recibo y no va a abrir ninguna ficha
 * de rentas. `lazy` los deja en un trozo aparte que solo pide quien abre la
 * ficha; `yarn comprobar-compilaciones` mide que el arranque no crezca por esto.
 */
const ResumenDeContribuyente = lazy(async () => ({
  default: (await import('./ResumenDeContribuyente')).ResumenDeContribuyente,
}));
const ResumenDeVehiculo = lazy(async () => ({
  default: (await import('./ResumenDeVehiculo')).ResumenDeVehiculo,
}));
const ResumenDeDeclaracion = lazy(async () => ({
  default: (await import('./ResumenDeDeclaracion')).ResumenDeDeclaracion,
}));
/** La banda de sujeto de las cinco pantallas de determinacion (#393). */
const ResumenDeDeterminacion = lazy(async () => ({
  default: (await import('./ResumenDeDeterminacion')).ResumenDeDeterminacion,
}));
/**
 * El campo que resuelve la unidad del alta de deuda (#331), tambien perezoso.
 *
 * Trae dentro dos busquedas contra el backend y su prosa; en el trozo comun
 * seria codigo que 133 de las 134 pantallas no usan nunca. `Formulario` lo
 * dibuja dentro de un `Suspense`, igual que `Pantalla` hace con las cabeceras.
 */
const ResolutorDeUnidad = lazy(async () => ({
  default: (await import('./ResolutorDeUnidad')).ResolutorDeUnidad,
}));
/**
 * El valor de la transferencia, y el predio de la de predio (#73), tambien
 * perezosos: los dos traen su propia busqueda o su propia prosa, y son codigo
 * que 132 de las 134 pantallas no usan nunca.
 */
const ResolutorDePredioDeTransferencia = lazy(async () => ({
  default: (await import('./ResolutorDeTransferencia')).ResolutorDePredioDeTransferencia,
}));
const ResolutorDeValorDeTransferencia = lazy(async () => ({
  default: (await import('./ResolutorDeTransferencia')).ResolutorDeValorDeTransferencia,
}));

/**
 * Lo que Rentas · Registro compone alrededor de los bloques comunes (#330, #332).
 *
 * Dos cosas, y las dos opt-in por opcion:
 *
 * 1. **Las tres fichas abren con cabecera-resumen**, y las dos que reparten sus
 *    campos en pestanas las cambian por un indice que desplaza. Es el mismo
 *    mecanismo de las fichas catastrales (#319) sobre otro objeto: nueve
 *    pestanas y 56 campos —de los que el backend llena siete— obligan a nueve
 *    clics para averiguar si un dato existe, y apiladas se ven de una pasada.
 *    **Ninguna seccion se renombra ni se reagrupa** (RNF-080): son las del
 *    manual, en su orden; lo unico que desaparece es la barra de pestanas, que
 *    era navegacion y no contenido.
 *
 * 2. **La baja de deuda elige su fila.** Su tabla dibuja una primera columna
 *    vacia desde el prototipo, y esa columna es la obligacion que se da de baja.
 *    Lo elegido viaja por la tabla `cuotas` que `escrituras.ts` declara, con su
 *    lista blanca por columna.
 *
 * 3. **El alta de deuda resuelve su unidad** (#331). «Unidad (predio / placa)»
 *    se tecleaba y no viajaba: el backend pide `predioId`/`vehiculoId`, que son
 *    identificadores internos. El resolutor busca en las dos lecturas que ya los
 *    publican —`consulta_fichas` y `vehiculos`— y fija el registro elegido.
 *
 * 4. **El calculo individual del predial se lee en el orden del calculo** (#333).
 *    Un indice, y ni una seccion renombrada ni reagrupada: ver abajo.
 *
 * 5. **Las cinco determinaciones tienen una sola forma** (#393): sujeto arriba,
 *    memoria del calculo en medio, acto abajo. Las cinco —predial individual y
 *    masivo, arbitrios, calculo vehicular y alcabala— hacen lo mismo (fijar un
 *    sujeto, ensenar como sale la cifra, escribir) y se dibujaban distinto.
 *    Ninguna etiqueta se reescribe (RNF-080) y ninguna seccion se reordena: lo
 *    que se uniforma es **como se lee** cada una de las tres partes.
 */

/**
 * **Las seis determinaciones, una superficie de seis hojas** (#503 F3).
 *
 * #393 les dio a las cinco de entonces **la misma anatomia** —sujeto, memoria
 * del calculo, acto— y `DETERMINACION` la reparte desde una sola constante. Lo
 * que no cambio es que siguen siendo seis pantallas: pasar del calculo
 * individual a la corrida masiva del mismo ejercicio es volver al menu, y la
 * franja de «la determinacion la hace el servidor» se lee **seis veces** como
 * si fueran seis averias distintas en vez de una causa.
 *
 * La tira las une sin que ninguna pierda nada: cada hoja **conserva su id, su
 * ruta y su permiso**, y la busqueda viaja con el enlace —que es lo que evita
 * volver a teclear el contribuyente al pasar del predial a los arbitrios—.
 *
 * **Son seis y no cuatro**, que es donde este reparto se aparta de #442 A.
 * Alcabala y espectaculos determinan un impuesto igual que las otras cuatro; lo
 * que las distingue es que su hecho imponible es un acto suelto y no la emision
 * anual, y eso no las hace otra cosa. La alcabala ademas sigue colgando del acto
 * de transferencia (#503, decision 3): vive en los dos sitios.
 *
 * Lo que la tira **no** arregla, y conviene tenerlo escrito: ninguna de las seis
 * escribe todavia. Tres simulan (`simula`), arbitrios es un `GET` y las dos de
 * acto tienen su primaria apagada por un dato que no se publica. La superficie
 * es un marco de lectura y de simulacion hasta que #445 cierre lo que le falta a
 * #393.
 */
const DETERMINACIONES_DEL_EJERCICIO = {
  titulo: 'Determinaciones',
  hojas: [
    'predial_individual',
    'predial_masivo',
    'arbitrios',
    'vehicular_calculo',
    'alcabala',
    'espectaculos',
  ],
} as const;

/**
 * El marco de una pantalla de determinacion: la banda de sujeto arriba.
 *
 * Se reparte a las cinco desde una sola constante para que anadir la sexta el
 * dia que exista sea una linea, y para que no se pueda dar el caso de cuatro
 * con banda y una sin.
 */
const DETERMINACION = {
  superficie: DETERMINACIONES_DEL_EJERCICIO,
  resumen: ResumenDeDeterminacion,
  resumenSiempre: true,
} as const;

/**
 * **La accion que enseña el resultado antes de escribir** (#393).
 *
 * La declaran las **cuatro** determinaciones cuya operacion es un `POST`, con la
 * etiqueta que el catalogo ya dibuja: ninguna se reescribe (RNF-080). Arbitrios
 * no esta, y no por olvido: su operacion es un `GET`, asi que trae sus cifras al
 * abrir y no tiene nada que simular.
 *
 * **`cuerpo` es ahora lo que decide si la accion existe** (#395). Hasta que
 * `PredialController` aparecio, la marca solo la declaraba el calculo vehicular
 * —`VehicularController.PeticionDeCalculoVehicular` la lleva entre sus campos— y
 * lo que hacia segura a las demas era una guarda de entorno: solo se simulaba
 * mientras contestara el proxy de datos. Esa guarda se retiro, y lo que la
 * sustituye es esta marca: `useSimulacion` **solo pide** la determinacion de la
 * opcion cuyo cuerpo declara `simulacion: true`, que es lo unico que el backend
 * entiende como «calcula y no asientes nada». Ver su docblock, que es donde vive
 * la justificacion entera.
 *
 * De las cuatro, tres la llevan. `alcabala` no, y no por olvido:
 * `AlcabalaController` no acepta ninguna marca —su `POST` **registra**—, asi que
 * su «Liquidar» queda declarado y apagado. Su pantalla ya dice por que no puede
 * liquidar (`ACTOS_SIN_CAMPO`, #385) y esta es la misma verdad dicha en el otro
 * boton.
 *
 * El vehicular arrastraba ademas su propio desajuste —su controlador leia
 * `placa`, `codContribuyente` y `ejercicio` del **cuerpo** y el contrato los
 * declara de **consulta** (#333c)— y **ya no**: #399 corrigio el controlador,
 * que es el lado que se movio, y desde entonces la pantalla puede llamar a su
 * operacion. Su `Adaptacion` esta en `determinaciones.ts`.
 */
const simula = (accion: string, cuerpo?: Readonly<Record<string, boolean>>) =>
  ({
    ...DETERMINACION,
    simulacion: { accion, ...(cuerpo === undefined ? {} : { cuerpo }) },
  }) as const;

/** Cabecera-resumen mas indice que **sustituye** a las pestanas de la ficha. */
const FICHA_CON_PESTANAS = { indice: 'en-vez-de-pestanas' } as const;

/**
 * **Los cinco apartados del expediente del contribuyente** (#503 F2).
 *
 * `'en-vez-de-pestanas'` (#330) apilo las secciones de las nueve pestanas en una
 * sola pagina, y eso dejo el indice en **doce** entradas: nueve pestanas que
 * declaran doce secciones. Doce entradas no son un indice, son la misma lista de
 * antes sin la barra. El rediseno pide cinco, y a cinco se llega **sin
 * reescribir un solo rotulo**, agrupando por la unidad que el manual ya tiene
 * encima de la seccion: la pestana.
 *
 * Cuatro de los cinco grupos llevan **el rotulo literal de su pestana**. Solo
 * dos pestanas se unen bajo un nombre nuevo, y son las dos que el prototipo une:
 *
 *   `Documentos y contacto`   une «Documentos», «Contactos», «Gestores» y
 *                             «Teléfonos - EMail»: cuatro pestanas para los
 *                             cuatro sitios donde se apunta como localizar a la
 *                             misma persona
 *   `Observaciones y fotos`   une «Observaciones» y «Fotos»
 *
 * **Y el segundo no se llama como en el prototipo, a proposito.** El canvas lo
 * rotula «Observaciones y bitácora» y lo describe como «quién tocó qué y
 * cuándo»; ahi debajo no hay ninguna bitacora —son «Observaciones del registro»
 * (3 campos) y «Foto álbum personal» (2)—, y prometer un registro de auditoria
 * que la pantalla no ensena es inventar una capacidad. La bitacora existe, pero
 * vive en Seguridad y se lee por otra opcion con otro permiso.
 *
 * Lo que **no** cambia: la pagina sigue dibujando las doce secciones con su
 * rotulo del manual y en su orden. Lo agrupado es la navegacion, igual que los
 * grupos por tarea agrupan las opciones del menu sin renombrar ninguna.
 */
const APARTADOS_DEL_EXPEDIENTE = [
  { titulo: 'Identificación del Contribuyente', pestanas: ['Identificación del Contribuyente'] },
  { titulo: 'Domicilio Fiscal', pestanas: ['Domicilio Fiscal'] },
  {
    titulo: 'Documentos y contacto',
    pestanas: ['Documentos', 'Contactos', 'Gestores', 'Teléfonos - EMail'],
  },
  { titulo: 'Predios y vehículos', pestanas: ['Predios y vehículos'] },
  { titulo: 'Observaciones y fotos', pestanas: ['Observaciones', 'Fotos'] },
] as const;

/**
 * **Los movimientos de deuda, una superficie de dos hojas** (#442 C).
 *
 * `alta_deuda` y `baja_deuda` tocan el mismo objeto —una obligacion de la cuenta
 * corriente— con dos actos opuestos, y hasta hoy pasar de uno a otro era volver
 * al menu. El prototipo lo enseña sin querer: el alta teclea
 * `02-014-D-14-01` en «Unidad (predio / placa)», y ese codigo es una de las
 * filas que la baja lista.
 *
 * Las dos **conservan su id, su ruta y su permiso**: lo que se anade es la tira
 * que lleva de una a otra con la busqueda a cuestas, para no volver a teclear el
 * contribuyente. La declaran las dos con la misma lista; ver
 * `ComposicionDeOpcion.superficie`.
 */
const MOVIMIENTOS_DE_DEUDA = {
  titulo: 'Movimientos de deuda',
  hojas: ['alta_deuda', 'baja_deuda'],
} as const;

/**
 * **Las dos modalidades del mismo acto** (#503 F5).
 *
 * Transferir un predio y transferir un vehiculo son el mismo tramite sobre dos
 * objetos: el mismo expediente, la misma fecha, las mismas dos partes y la misma
 * consecuencia —el transferente deja de estar afecto y el adquirente empieza—.
 * El manual las capturo como dos pantallas y el prototipo las dibuja como **una
 * modalidad**, que es lo que la tira hace aqui.
 *
 * Lo que la tira **no** puede arreglar, y por eso se anota: los dos catalogos
 * llaman de forma distinta al mismo dato —«Nº de expediente» / «Nro. de
 * expediente», «Fecha del acto» / «Fecha de transferencia», «Partes
 * intervinientes» / «Partes»— y el documento que sustenta el acto es texto libre
 * en una (notaria y minuta) y un desplegable de cuatro en la otra. Dibujar el
 * bloque **una sola vez** —que es lo que #442 B proponia— haria morir esa
 * divergencia por construccion, y exige antes decidir cual de las dos columnas
 * gana, porque los rotulos no se reescriben (RNF-080). La tira une las dos
 * pantallas sin tocar ninguna; unificar sus bloques es otra cosa y no se cuela
 * aqui.
 */
const TRANSFERENCIAS = {
  titulo: 'Transferencias',
  hojas: ['transferencia_predio', 'transferencia_vehiculo'],
} as const;
export const COMPOSICION_DE_RENTAS: Readonly<Record<string, ComposicionDeOpcion>> = {
  contribuyentes: {
    ...FICHA_CON_PESTANAS,
    gruposDelIndice: APARTADOS_DEL_EXPEDIENTE,
    resumen: ResumenDeContribuyente,
  },
  vehiculos: { ...FICHA_CON_PESTANAS, resumen: ResumenDeVehiculo },
  /**
   * La declaracion jurada lleva resumen y **no** indice, y esa asimetria es
   * deliberada: su catalogo declara **una** seccion. Un indice de una entrada no
   * es un indice, es un titulo repetido con un clic de por medio.
   */
  declaracion_jurada: { resumen: ResumenDeDeclaracion },
  /**
   * El alta de deuda, con su campo que resuelve (#331).
   *
   * `campos` declara **lo que este resolutor llena**, y son los dos que
   * `escrituras.ts` acaba de declarar: sin ellos, `fijarCampo` los descartaria
   * en silencio y la busqueda seria un adorno. `Formulario` lo comprueba antes
   * de dibujarlo y lo bloquea si faltan.
   *
   * Y las otras dos declaraciones son las que dicen **que mas toca y que
   * mira**, sin abrir el componente (revision de #331):
   *
   *   `memoria`   el rotulo de la unidad elegida. Se guarda en el borrador
   *               —`escrituras.ts` lo declara en `presentacion`— para que
   *               plegar la seccion no lo pierda, y **no viaja**
   *   `contexto`  lo que lee del formulario para poder decir si la unidad
   *               resuelta es de otro titular. Es de solo lectura: `onCampo`
   *               solo acepta lo que este resolutor declara llenar
   */
  alta_deuda: {
    superficie: MOVIMIENTOS_DE_DEUDA,
    resolutores: {
      unidadPredioPlaca: {
        campos: ['predioId', 'vehiculoId'],
        memoria: ['unidadResuelta'],
        contexto: ['codContribuyente', 'nombre'],
        Control: ResolutorDeUnidad,
      },
    },
  },
  /**
   * El calculo individual del predial, leido **en el orden del calculo** (#333).
   *
   * El mecanismo es el mas pequeno que lo logra, y se eligio despues de mirar
   * los otros dos: el orden que el issue pide —los predios del contribuyente,
   * la base del conjunto, la escala del ejercicio y las cuotas— **ya es el
   * orden en que el renderizador dibuja esta pantalla**, porque la tabla va
   * antes que las secciones (FRO-03 §5) y las tres secciones del manual estan
   * en ese orden. Lo que faltaba no era mover nada: era que el orden se viera y
   * se pudiera recorrer, y que la pantalla dijera de quien es la base.
   *
   *   `indice: true`  lista las secciones y lleva a cada una desplazando, con
   *                   su salida hacia las acciones
   *   `indiceConLaTabla`  y **la tabla de predios entra tambien**, la primera,
   *                   porque es el paso 1 del calculo. Sin ella el indice
   *                   empezaba en la escala: la tabla se dibuja encima de las
   *                   secciones y fuera de la rejilla del indice (FRO-03 §5),
   *                   asi que el unico paso desde el que se entiende el resto
   *                   era el unico al que el indice no llevaba
   *   el aviso        dice que la base es **por contribuyente** y que la escala
   *                   y su conjunto sellado los pone el servidor
   *                   (`prosa-textos.ts`, fuera del trozo de arranque)
   *
   * Lo que **no** se hizo, y por que: una cabecera-resumen propia habria pedido
   * ademas ensanchar `hayQueResumir` —esta pantalla no abre ningun registro por
   * la ruta, y su contribuyente es un filtro que no se llama `codigo`— para
   * dibujar un bloque en el que **todas** las cifras serian «—», porque
   * `predial_individual` es un `POST` y no se pide al abrir. Un bloque nuevo que
   * no dice nada que el aviso no diga, a cambio de tocar una funcion que usan
   * las cuatro fichas catastrales y las tres de rentas.
   *
   * `'en-vez-de-pestanas'` tampoco: esta pantalla no tiene pestanas que
   * sustituir. Con `true`, `seccionesDe` devuelve sus tres secciones tal cual.
   */
  predial_individual: {
    ...simula('Simular', { simulacion: true }),
    indice: true,
    indiceConLaTabla: true,
    /**
     * La escala progresiva, leida como la cuenta que es (#393).
     *
     * Sus nueve campos son `"ro"` y describen un calculo —valuo total, menos el
     * exonerado, da el afecto; el afecto repartido en tres tramos, cada uno con
     * su alicuota, da el insoluto—, y dibujados como nueve cajas con borde
     * discontinuo esa relacion no se ve en ninguna parte. El resultado es el
     * impuesto insoluto anual, y **no es el ultimo campo**: detras va el minimo
     * imponible, que es una comprobacion contra el 0.6 % de la UIT, no lo que
     * se cobra. Por eso el total se declara y no se deduce.
     *
     * Las otras dos secciones —beneficios aplicados, emision y cuotas— se
     * quedan como estan: la primera tiene campos que se eligen y la segunda es
     * un calendario, y ninguna de las dos es una cuenta encadenada.
     */
    memoria: { 'Escala progresiva acumulativa': { total: 'impuestoInsolutoAnualS' } },
  },
  /**
   * Las otras cuatro determinaciones, con la misma banda (#393).
   *
   * Solo `alcabala` declara ademas memoria de calculo, y esa asimetria es del
   * catalogo, no una decision: es la unica de las cuatro cuya seccion es una
   * cuenta encadenada —el mayor entre valor de transferencia y autovaluo
   * ajustado, menos las 10 UIT inafectas, por la tasa—. «Predial — masivo» y
   * «Cálculo vehicular» no tienen ninguna seccion de solo lectura que encadene
   * —la del masivo son los **parametros** que se eligen antes de correr el
   * proceso— y «Arbitrios» no tiene secciones en absoluto: su determinacion es
   * la tabla por servicio, que ya se lee como tal.
   */
  predial_masivo: simula('Simular', { simulacion: true }),
  arbitrios: DETERMINACION,
  vehicular_calculo: simula('Simular', { simulacion: true }),
  alcabala: {
    ...simula('Liquidar'),
    /* La clave va **computada** y no como `Liquidación:` a secas: prettier
       quita las comillas de una clave que es un identificador valido, y un
       identificador con tilde es exactamente lo que ESLint prohibe (FRO-04 §2).
       Entre corchetes es una cadena, que es lo que la etiqueta de una seccion
       del manual es. */
    memoria: { ['Liquidación']: { total: 'impuestoDeAlcabalaS' } },
  },
  /**
   * Transferencia de predio, con su valor y su predio resueltos (#73).
   *
   * `codigoPredial` sustituye por el mismo motivo que `unidadPredioPlaca` en
   * `alta_deuda`: `predioId` es el identificador interno que
   * `TransferenciaPredioController` pide, y el codigo catastral no viaja. El
   * mismo control ademas anade `valorTransferencia` —un dato que ninguna
   * seccion del catalogo dibuja—, porque los dos son el mismo gesto: fijar el
   * objeto del acto y su valor.
   */
  transferencia_predio: {
    superficie: TRANSFERENCIAS,
    resolutores: {
      codigoPredial: {
        campos: ['predioId', 'valorTransferencia'],
        Control: ResolutorDePredioDeTransferencia,
      },
    },
  },
  /**
   * Transferencia de vehiculo: solo el valor (#73). Sin identificador que
   * resolver —`placa` viaja tal cual—, el resolutor se cuelga de «Transferente
   * — documento», un campo que hoy no llega a ningun sitio porque
   * `TransferenciaVehiculoController` no acepta `codTransferente` para un
   * vehiculo: lo resuelve del titular vigente. El control lo sigue dibujando
   * tal cual lo dibujaba antes de declararse aqui.
   */
  transferencia_vehiculo: {
    superficie: TRANSFERENCIAS,
    resolutores: {
      transferenteDocumento: {
        campos: ['valorTransferencia'],
        Control: ResolutorDeValorDeTransferencia,
      },
    },
  },
  /**
   * Espectaculos publicos no deportivos: **los cuatro filtros que no filtran**
   * (#432).
   *
   * La unica operacion de esta opcion es el `POST` que registra el evento;
   * `EspectaculoController` no lee ninguno de los cuatro —ni del cuerpo ni de
   * la consulta— y **ninguna lectura del contrato lista los espectaculos
   * declarados**, asi que la tabla que el prototipo dibuja debajo no se llena
   * con nada. Elegir cualquiera de los cuatro cambiaba la URL y no cambiaba
   * nada mas, que es la forma mas silenciosa de este defecto.
   *
   * Se bloquean y no se quitan, como los de `consulta_fichas` (#322) y los de
   * los dos resumenes de transito (#398): el rotulo del prototipo se conserva
   * (RNF-080), y un filtro que desaparece deja a quien lo buscaba pensando que
   * algo se ha roto. La redaccion del motivo vive en `prosa-textos.ts`, y
   * `prosa.test.ts` exige que las dos listas digan lo mismo.
   *
   * **El acto sigue sin poder registrarse**, y eso no lo cambia este issue: ver
   * `pantallas/rentas/index.ts` para las dos preguntas de #432 contestadas.
   */
  espectaculos: {
    /* Entra en la superficie de las seis (#503 F3) y **no** en la anatomia de
       las cinco: `DETERMINACION` le da a las otras la cabecera-resumen que #393
       diseño para la emision del ejercicio, y espectaculos no la tuvo nunca. La
       tira une pantallas; no les cambia lo que dibujan. */
    superficie: DETERMINACIONES_DEL_EJERCICIO,
    filtrosBloqueados: ['nDeExpediente', 'organizador', 'desde', 'hasta'],
  },
  baja_deuda: {
    superficie: MOVIMIENTOS_DE_DEUDA,
    seleccion: {
      tabla: 'cuotas',
      una: 'cuota',
      varias: 'cuotas',
      genero: 'femenino',
      // El contribuyente no es una columna de la tabla —la pantalla entera es de
      // uno solo, y su codigo esta en el filtro—, pero el backend lo necesita:
      // la baja se registra contra su cuenta corriente. Entra en la fila como
      // una columna mas, y pasa por la misma lista blanca que las demas.
      contexto: (busqueda) => ({ codContribuyente: busqueda.get('codContribuyente') ?? '' }),
    },
  },
};
