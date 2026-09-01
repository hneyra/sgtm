/* Lo que queda del artboard `Coactiva.dc.html` **después de conectar el módulo**:
   sus rótulos, su prosa y sus columnas. Las cifras se fueron todas.

   Lo que había aquí y ya no está, con el motivo:

   - `TASA_ACTOS` —el coste tasado de cada acto, de 8,40 a 184,00— era el corazón
     del artboard y era inventado. El arancel de costas lo aprueba **cada
     municipalidad por ordenanza** (`ArancelDeCostasParametrizado`, D-02c, #193),
     vive en el conjunto sellado bajo la llave `ARANCEL_COSTA:<TIPO_DE_ACTO>` y
     **ninguna ruta del contrato lo publica**. Una cifra inventada ahí no cobra de
     más: cobra sin sustento normativo, y eso se descubre cuando el primer
     expediente se impugna.
   - `EXPEDIENTES`, `VALORES_PENDIENTES`, `DEUDA_COACTIVA`,
     `VALORES_DEL_EXPEDIENTE` y `actosDe()` — los sirve el backend.
   - Los conteos y los saldos de `BANDEJA`, `KPIS`, `FLUJO` y
     `COSTAS_DE_LA_CARTERA` — los conteos los cuenta el backend; los saldos no
     los suma nadie, y componerlos aquí es lo que RNF-083 prohíbe. */

/** [rótulo, 1 si la columna es numérica y va a la derecha]. */
export type ColDef = [string, 0 | 1];

/**
 * La cartera contada por estado del procedimiento.
 *
 * La clave es el **nombre** de `EstadoDelExpediente`, no la etiqueta del
 * prototipo: «Importado sin REC» es `INICIADO`, «Con medida cautelar» es
 * `MEDIDA_CAUTELAR`, y «Fraccionado» —que el prototipo listaba— no existe, así
 * que no está. El conteo lo pone el backend.
 *
 * [estado, tono, título, detalle]
 */
export const BANDEJA: [string, 'ok' | 'warn' | 'bad', string, string][] = [
  ['INICIADO', 'bad', 'Importados y sin resolución', 'El expediente existe y el procedimiento no ha empezado. Sin REC no se puede notificar nada.'],
  ['REC1_EMITIDA', 'bad', 'Con REC 01 emitida y sin notificar', 'Las costas ya se cargaron al obligado y el procedimiento está detenido.'],
  ['REC1_NOTIFICADA', 'ok', 'REC 01 notificada, en plazo', 'Corre el plazo para pagar antes de poder trabar medida cautelar.'],
  ['REC2_EMITIDA', 'warn', 'Con REC 02 emitida', 'La medida cautelar está ordenada y todavía no consta trabada.'],
  ['MEDIDA_CAUTELAR', 'warn', 'Con medida cautelar trabada', 'Retención, inscripción, depósito o intervención. Hay que dar seguimiento al tercero.'],
  ['SUSPENDIDO', 'warn', 'Suspendidos', 'Detenidos por alguna causal del art. 16 de la Ley 26979.'],
  ['CONCLUIDO', 'ok', 'Concluidos', 'Pagados, prescritos o dejados sin efecto. Solo se consultan.'],
];

/** Las columnas de la grilla de expedientes. */
export const COLS_LISTA: ColDef[] = [
  ['Expediente', 0],
  ['Año', 0],
  ['Cod. obligado', 0],
  ['Ejecutor', 0],
  ['Valores', 1],
  ['Deuda S/', 1],
  ['Costas S/', 1],
  ['Total exigible S/', 1],
  ['Estado', 0],
];

/** Las columnas de la consulta de deuda en coactiva. */
export const COLS_DEUDA: ColDef[] = [
  ['Expediente', 0],
  ['Año', 0],
  ['Obligado', 0],
  ['Tributos', 0],
  ['Deuda S/', 1],
  ['Costas S/', 1],
  ['Total S/', 1],
  ['Con beneficio S/', 1],
  ['Estado', 0],
];

/** Las columnas de la deuda del expediente, obligación por obligación. */
export const COLS_OBLIGACIONES: ColDef[] = [
  ['Tributo', 0],
  ['Ejercicio', 0],
  ['Unidad', 0],
  ['Insoluto S/', 1],
  ['Reajuste S/', 1],
  ['Interés S/', 1],
  ['Gastos S/', 1],
  ['Total S/', 1],
];

/** Las columnas de los valores que se pueden importar a un expediente. */
export const COLS_VALORES: ColDef[] = [
  ['Nº valor', 0],
  ['Tipo', 0],
  ['Ejercicio', 0],
  ['Obligado', 0],
  ['Estado', 0],
  ['Total S/', 1],
];

/**
 * Las columnas de los actos del procedimiento.
 *
 * «Costo tasado S/» va **antes** de la glosa a propósito: la glosa es texto
 * largo y sin envolver empuja la tabla hasta sacar de la pantalla la columna
 * que este módulo existe para enseñar.
 */
export const COLS_ACTOS: ColDef[] = [
  ['Nº del acto', 0],
  ['Acto', 0],
  ['Fecha', 0],
  ['Medida', 0],
  ['Diligencias', 1],
  ['Costo tasado S/', 1],
  ['Glosa', 0],
];

/** Las columnas de las diligencias de notificación. */
export const COLS_DILIGENCIAS: ColDef[] = [
  ['Acto', 0],
  ['Intento', 1],
  ['Fecha', 0],
  ['Modalidad', 0],
  ['Resultado', 0],
  ['Surtió efecto', 0],
  ['Exigible desde', 0],
  ['Receptor', 0],
];

/** Las columnas del detalle de una liquidación de costas. */
export const COLS_COSTAS: ColDef[] = [
  ['Nº liquidación', 0],
  ['Acto', 0],
  ['Concepto', 0],
  ['Monto S/', 1],
  ['Arancel (fuente)', 0],
];

/** Las columnas del historial del expediente. */
export const COLS_HISTORIAL: ColDef[] = [
  ['Movimiento', 0],
  ['Fecha', 0],
  ['Estado', 0],
  ['Motivo', 0],
  ['Documento', 0],
  ['Usuario', 0],
  ['Vigente', 0],
];

/** Las columnas de los valores ya importados al expediente. */
export const COLS_IMPORTADOS: ColDef[] = [
  ['Id del valor', 0],
  ['Fecha de importación', 0],
];

/** Las doce opciones del manual que el módulo resume, para la paleta.
 *  El segundo campo es el destino; `expediente` vuelve a la lista. */
export const OPCIONES: [string, string][] = [
  ['Expedientes coactivos', 'lista'],
  ['Importación de valores', 'importacion'],
  ['Proceso coactivo', 'lista'],
  ['Impresión de REC', 'lista'],
  ['Historial del expediente', 'lista'],
  ['Cambiar dirección referencial', 'lista'],
  ['Liquidación de costas', 'lista'],
  ['Fraccionamiento coactivo', 'lista'],
  ['Actos coactivos', 'lista'],
  ['Notificaciones coactivas', 'lista'],
  ['Consulta de deudas', 'deuda'],
  ['Deudas en beneficio', 'deuda'],
];

/**
 * Por qué la columna «Costo tasado» de cada acto sale «—», que era **lo
 * distintivo** del artboard: ver el coste antes de dictar.
 *
 * Son dos cosas y ninguna se arregla en la interfaz:
 *
 * 1. El arancel no se publica. `ArancelDeCostasParametrizado` lo lee del
 *    conjunto sellado por `ARANCEL_COSTA:<TIPO>`, y de las seis rutas de
 *    coactiva del contrato ninguna lo devuelve. `GET /seguridad/parametros`
 *    tampoco: publica los conjuntos y su estado, no sus cifras.
 * 2. Aunque se publicara, hoy no habría ninguna: el ejercicio no tiene conjunto
 *    sellado (D-02a) y el arancel de costas es de ordenanza local (D-02c, #193).
 *
 * Lo que sí se puede enseñar —y se enseña— es el coste **ya liquidado**: cada
 * línea de `LiquidacionResource.costas` trae su `montoS` y el `arancelFuente`
 * que lo justifica.
 */
export const POR_QUE_NO_HAY_COSTO_TASADO =
  'Ninguna ruta del contrato publica el arancel de costas: lo lee el backend del conjunto sellado por la llave ARANCEL_COSTA:<TIPO DE ACTO>, y hoy además no hay ninguna cifra que leer —el arancel es de ordenanza local (D-02c) y el ejercicio no tiene conjunto sellado—. Lo que sí se ve es lo ya liquidado, en «Costas».';

/**
 * Por qué la lista de actos no puede casar cada acto con su costa liquidada.
 *
 * `LiquidacionResource.CostaResource` identifica el acto que tarifa por
 * `actoId`, y `ActoResource` **no publica ningún identificador**: solo `tipo`,
 * `titulo`, `numero`, `fecha` y `descripcion`. Casar por tipo daría la costa
 * equivocada en cuanto un expediente tenga dos actos del mismo tipo, que es lo
 * corriente en las notificaciones.
 */
export const POR_QUE_NO_SE_CASA_LA_COSTA =
  'El detalle de la liquidación identifica el acto que tarifa por su identificador interno, y el acto que la consulta del proceso publica no lo lleva: casarlos por tipo daría la costa de otro acto en cuanto haya dos del mismo tipo.';
