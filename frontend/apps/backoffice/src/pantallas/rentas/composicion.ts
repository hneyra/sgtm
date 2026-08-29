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
 * El marco de una pantalla de determinacion: la banda de sujeto arriba.
 *
 * Se reparte a las cinco desde una sola constante para que anadir la sexta el
 * dia que exista sea una linea, y para que no se pueda dar el caso de cuatro
 * con banda y una sin.
 */
const DETERMINACION = { resumen: ResumenDeDeterminacion, resumenSiempre: true } as const;

/** Cabecera-resumen mas indice que **sustituye** a las pestanas de la ficha. */
const FICHA_CON_PESTANAS = { indice: 'en-vez-de-pestanas' } as const;

export const COMPOSICION_DE_RENTAS: Readonly<Record<string, ComposicionDeOpcion>> = {
  contribuyentes: { ...FICHA_CON_PESTANAS, resumen: ResumenDeContribuyente },
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
    ...DETERMINACION,
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
  predial_masivo: DETERMINACION,
  arbitrios: DETERMINACION,
  vehicular_calculo: DETERMINACION,
  alcabala: {
    ...DETERMINACION,
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
    resolutores: {
      transferenteDocumento: {
        campos: ['valorTransferencia'],
        Control: ResolutorDeValorDeTransferencia,
      },
    },
  },
  baja_deuda: {
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
