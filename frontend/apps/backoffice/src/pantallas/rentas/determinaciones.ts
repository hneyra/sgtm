import { agruparMiles } from '@sgtm/dominio';
import type { Celda, DatosDePantalla, ValorDeCampo } from '@sgtm/api-client';
import { SIN_DATO, esObjeto, leerObjeto, texto } from '../seguridad/listado';
import { definirAdaptacion } from '../conexiones';
import type { Adaptacion } from '../conexiones';

/**
 * Las dos determinaciones prediales, leidas del recurso que las publica (#395).
 *
 * `PredialController` publica por fin las dos operaciones que #333b anoto como
 * «lo que la capa web de la determinacion tendra que publicar», y las dos
 * devuelven **un recurso del dominio**, no la forma que comparten las 134
 * pantallas: la memoria del calculo con sus predios, sus tramos y sus cuotas
 * (`DeterminacionPredialResource`), y las etapas de la corrida masiva
 * (`CorridaPredialResource`).
 *
 * Van por `Adaptacion` y no por `Conexion` porque su operacion es un `POST`:
 * abrir la pantalla no puede lanzar una determinacion, y una `Conexion` la
 * dispararia al abrir —`useDatosDeOperacion` mira los parametros que faltan,
 * no el verbo—. Quien decide cuando sale es quien atiende, pulsando la accion
 * que la pide; lo unico que hace falta declarar aqui es **como se lee lo que
 * vuelve**.
 *
 * ── Ni una cifra compuesta, y una sola cosa que si se hace (RNF-083) ────────
 *
 * El backend manda los importes **ya en escala de centimos y sin adornos**
 * —`"587.44"`, `"80250.00"`—, porque eso es lo que devuelve
 * `BigDecimal.toPlainString()`. Lo unico que pasa aqui es el separador de
 * millares de `agruparMiles`, que es presentacion y no aritmetica: no suma, no
 * redondea, no completa decimales y no antepone «S/» donde el rotulo del
 * catalogo ya lo dice. Lo que el recurso no manda sigue saliendo con «—».
 *
 * Las celdas de la tabla van **sin agrupar**: `TablaDePantalla` ya agrupa las
 * columnas que el catalogo declara `num` al dibujarlas, y lo que viaja en
 * `celda.texto` sigue siendo lo que mando el servidor (#342, nit 6).
 *
 * ── Los tramos se colocan por su `orden`, no por su posicion ────────────────
 *
 * El catalogo tiene **tres** claves fijas —«Tramo 1 — hasta 15 UIT (0.2 %)» y
 * sus dos hermanas— y el recurso publica **los tramos que aportaron**, que
 * pueden ser uno, dos o tres. Colocarlos por posicion pondria el tercer tramo
 * de un contribuyente que solo tributa en el tercero bajo el rotulo del
 * primero: una cifra correcta con la alicuota equivocada al lado, que es
 * exactamente la clase de error que nadie mira dos veces. El que no vino se
 * queda sin valor y sale «—», que no es cero.
 */

/**
 * El rotulo del catalogo al que le toca cada tramo, por el `orden` que el
 * recurso publica.
 *
 * No lleva ninguna cifra tributaria (regla 5): los limites y las alicuotas
 * viven en el conjunto sellado y llegan dentro del propio recurso. Lo unico
 * que hay aqui es a que casilla de la pantalla va cada uno.
 */
const CLAVE_DEL_TRAMO: Readonly<Record<number, string>> = {
  1: 'tramo1Hasta15Uit02',
  2: 'tramo2De15A60Uit06',
  3: 'tramo3MasDe60Uit10',
};

/** Y lo mismo para las cuatro cuotas, por su numero. */
const CLAVE_DE_LA_CUOTA: Readonly<Record<number, string>> = {
  1: 'cuota1Vence2802',
  2: 'cuota2Vence3105',
  3: 'cuota3Vence3108',
  4: 'cuota4Vence3011',
};

/** La flecha con que el prototipo escribe «esta base, por su alicuota, da esto». */
const FLECHA = '→';

/**
 * Un importe del recurso, listo para leerse. `undefined` cuando no llego: la
 * clave no se pone, y quien la dibuja escribe «—».
 */
const cifra = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor.trim() !== '' ? agruparMiles(valor.trim()) : undefined;

/** El mismo importe con su moneda delante, para las lineas que no la llevan en el rotulo. */
const soles = (valor: unknown): string | undefined => {
  const agrupada = cifra(valor);
  return agrupada === undefined ? undefined : `S/ ${agrupada}`;
};

/** Una celda con lo que mando el servidor, **sin agrupar**: agrupa la tabla al dibujar. */
const celda = (valor: unknown): Celda => ({
  texto: typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : SIN_DATO,
});

/** Los campos que llegaron, sin las claves que no. */
function campos(
  pares: readonly (readonly [string, string | undefined])[],
): Readonly<Record<string, ValorDeCampo>> {
  const llenos: Record<string, ValorDeCampo> = {};
  for (const [clave, valor] of pares) if (valor !== undefined) llenos[clave] = valor;
  return llenos;
}

/**
 * Un instante ISO del recurso, como fecha tributaria (regla 9, RNF-075).
 *
 * `DeterminacionPredialResource.fechaCalculo` es el instante en que el servidor
 * determino; lo que la pantalla enseña —y lo que se dice en ventanilla— es el
 * dia. Sin fecha no se dibuja nada: una determinacion sin ella es una cuenta
 * que dentro de tres dias es otra y nadie puede decir de cuando era.
 */
function fechaDeCalculo(valor: unknown, que: string): string {
  if (typeof valor !== 'string' || valor.length < 10) {
    throw new Error(`${que} no vino con su fecha de calculo.`);
  }
  return valor.slice(0, 10);
}

/** Un arreglo del recurso, ya filtrado a los objetos que se pueden leer. */
const listaDe = (valor: unknown): readonly Readonly<Record<string, unknown>>[] =>
  Array.isArray(valor) ? valor.filter(esObjeto) : [];

/** Un entero del recurso —cuantos registros, cuantos observados— como texto. */
const entero = (valor: unknown): string =>
  typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : SIN_DATO;

/**
 * Con que conjunto sellado se determino, y sobre quien.
 *
 * Los dos salen del recurso y **ninguno se compone aqui**: el conjunto es lo
 * que hace reproducible la cifra (`ARQ-09` §3) y el sujeto viene ya redactado
 * por quien determino. Sin conjunto no hay banda que dibujar, y eso es correcto:
 * decir «se determino» sin decir con que dejaria la banda afirmando de mas.
 */
function determinacionDe(
  recurso: Readonly<Record<string, unknown>>,
): DatosDePantalla['determinacion'] {
  const conjunto = recurso['conjunto'];
  if (typeof conjunto !== 'string' || conjunto === '') return undefined;
  const sujeto = recurso['sujeto'];
  return {
    conjunto,
    ...(typeof sujeto === 'string' && sujeto !== '' ? { sujeto } : {}),
  };
}

/**
 * Calculo individual del impuesto predial (`RT-001`…`RT-016`, #395).
 *
 * La tabla es «Predios que integran la base imponible», con las siete columnas
 * que el catalogo declara y en su orden. `baseImponible` de cada predio —el
 * valuo afecto **ponderado por el `%` de propiedad**, `RT-011`— viaja en el
 * recurso y no se dibuja: ninguna columna la reserva, y ensenarla bajo «Valuo
 * Afecto S/» seria ensenar otra cosa con ese rotulo.
 *
 * La seccion «Beneficios aplicados» se queda entera sin llenar, y no por
 * descuido: el recurso no publica ni la deduccion elegida, ni la resolucion que
 * la sustenta, ni la inafectacion, ni el monto deducido. Tres de sus cuatro
 * campos se **eligen** —son la entrada de un beneficio, no su resultado— y el
 * cuarto, `montoDeducidoS`, es la cifra que el servidor tendria que devolver y
 * no devuelve: sale «—», que es lo que distingue «no llego» de «no se le
 * dedujo nada».
 */
const predial_individual = definirAdaptacion({
  operacion: 'predial_individual',
  leer: (cuerpo) => leerObjeto(cuerpo, 'la determinacion del predial'),
  adaptar: (recurso): DatosDePantalla => {
    const predios = listaDe(recurso['predios']);
    const determinacion = determinacionDe(recurso);
    return {
      fechaCalculo: fechaDeCalculo(recurso['fechaCalculo'], 'La determinacion del predial'),
      ...(determinacion === undefined ? {} : { determinacion }),
      campos: campos([
        ['uitVigente2026S', cifra(recurso['uit'])],
        ['valuoTotalS', cifra(recurso['valuoTotal'])],
        ['valuoExoneradoS', cifra(recurso['valuoExonerado'])],
        ['valuoAfectoS', cifra(recurso['valuoAfecto'])],
        ...tramos(recurso['tramos']),
        ['impuestoInsolutoAnualS', cifra(recurso['impuestoInsoluto'])],
        ['minimoImponible06Uit', cifra(recurso['minimoImponible'])],
        // La modalidad la decidio quien determino, y el desplegable la ensena
        // aunque no este entre sus opciones: `Campo` antepone el valor que
        // sirvio la API a la lista del prototipo, para no ensenar una eleccion
        // que nadie hizo.
        ['modalidad', typeof recurso['modalidad'] === 'string' ? recurso['modalidad'] : undefined],
        ['derechoDeEmisionS', cifra(recurso['derechoDeEmision'])],
        ...cuotas(recurso['cuotas']),
      ]),
      tabla: {
        filas: predios.map((predio): readonly Celda[] => [
          celda(predio['codigoPredial']),
          celda(predio['ubicacion']),
          { texto: texto(predio['uso']) },
          celda(predio['porcentajePropiedad']),
          celda(predio['autovaluo']),
          celda(predio['valuoExonerado']),
          celda(predio['valuoAfecto']),
        ]),
        conteo: `${predios.length} predios`,
      },
      // Las cuatro etiquetas son las del catalogo, letra por letra: `Totales`
      // busca por etiqueta y una que no case deja la celda vacia.
      totales: [
        { label: 'Valuo afecto', value: soles(recurso['valuoAfecto']) ?? SIN_DATO },
        { label: 'Impuesto insoluto', value: soles(recurso['impuestoInsoluto']) ?? SIN_DATO },
        { label: 'Derecho de emisión', value: soles(recurso['derechoDeEmision']) ?? SIN_DATO },
        { label: 'Total a pagar', value: soles(recurso['totalAPagar']) ?? SIN_DATO },
      ],
    };
  },
});

/**
 * Cada tramo, en la casilla de **su orden** y con sus dos mitades separadas por
 * la flecha que `MemoriaDeCalculo` parte: la porcion gravada a un lado y lo que
 * ese tramo aporta al otro.
 *
 * La flecha la pone la interfaz y la cifra no: es el separador con el que el
 * prototipo escribe una operacion de dos partes, no una cuenta. Un tramo con un
 * `orden` que el catalogo no dibuja se descarta en vez de caer en la ultima
 * casilla libre.
 */
function tramos(valor: unknown): readonly (readonly [string, string | undefined])[] {
  return listaDe(valor).flatMap((tramo) => {
    const orden = tramo['orden'];
    if (typeof orden !== 'number' || !Object.hasOwn(CLAVE_DEL_TRAMO, orden)) return [];
    const clave = CLAVE_DEL_TRAMO[orden];
    const porcion = soles(tramo['porcionGravada']);
    const aporte = soles(tramo['aporte']);
    if (clave === undefined || porcion === undefined || aporte === undefined) return [];
    return [[clave, `${porcion} ${FLECHA} ${aporte}`] as const];
  });
}

/** Y cada cuota en la casilla de su numero, por lo mismo que los tramos. */
function cuotas(valor: unknown): readonly (readonly [string, string | undefined])[] {
  return listaDe(valor).flatMap((cuota) => {
    const numero = cuota['numero'];
    if (typeof numero !== 'number' || !Object.hasOwn(CLAVE_DE_LA_CUOTA, numero)) return [];
    const clave = CLAVE_DE_LA_CUOTA[numero];
    return clave === undefined ? [] : [[clave, cifra(cuota['importe'])] as const];
  });
}

/**
 * Calculo masivo del impuesto predial: la corrida y sus etapas (#395).
 *
 * **La banda de sujeto no se dibuja, y es lo correcto**: `CorridaPredialResource`
 * publica el conjunto con el que determino y **no publica ningun sujeto** —el de
 * una corrida masiva no es un registro, es un alcance—, y componerlo aqui a
 * partir de `alcance` y `ejercicio` seria redactarlo en la interfaz, que es
 * justo lo que `DatosDeDeterminacion.sujeto` existe para impedir. Es lo que
 * `ResumenDeDeterminacion` ya anticipaba para esta pantalla.
 *
 * De los ocho campos de «Parámetros del proceso» se llenan dos —el ejercicio y
 * el alcance, que son los que el recurso devuelve—; los otros seis no estan en
 * el recurso. `uitDelEjercicioS` es el que mas se echa de menos y es tambien el
 * que menos se puede componer: la UIT de un ejercicio es un valor del conjunto
 * sellado, y esta respuesta trae el nombre del conjunto pero no su contenido.
 */
const predial_masivo = definirAdaptacion({
  operacion: 'predial_masivo',
  leer: (cuerpo) => leerObjeto(cuerpo, 'la corrida masiva del predial'),
  adaptar: (recurso): DatosDePantalla => {
    const etapas = listaDe(recurso['etapas']);
    const determinacion = determinacionDe(recurso);
    return {
      fechaCalculo: fechaDeCalculo(recurso['fechaCalculo'], 'La corrida masiva del predial'),
      ...(determinacion === undefined ? {} : { determinacion }),
      campos: campos([
        [
          'ejercicioACalcular',
          typeof recurso['ejercicio'] === 'string' ? recurso['ejercicio'] : undefined,
        ],
        ['alcance', typeof recurso['alcance'] === 'string' ? recurso['alcance'] : undefined],
      ]),
      tabla: {
        filas: etapas.map((etapa): readonly Celda[] => [
          { texto: texto(etapa['etapa']) },
          { texto: entero(etapa['registros']) },
          // La etapa que no mueve dinero manda la cadena vacia, no un cero: no
          // hay importe que ensenar, y un «0.00» ahi seria una cifra.
          celda(etapa['monto']),
          { texto: entero(etapa['observados']) },
          estadoDeLaEtapa(etapa['estado']),
        ]),
        conteo: `${etapas.length} etapas`,
      },
    };
  },
});

/**
 * El estado de una etapa, con su texto dentro y no solo por color (FRO-02 §2.1).
 *
 * Los dos valores son los del recurso —`OK` y `CON OBSERVACIONES`— y no se
 * reescriben (RNF-080): lo unico que decide la interfaz es el tono, y lo decide
 * por el unico estado que el recurso llama bueno.
 */
function estadoDeLaEtapa(valor: unknown): Celda {
  const estado = texto(valor);
  return estado === SIN_DATO
    ? { texto: SIN_DATO }
    : { texto: estado, tono: estado === 'OK' ? 'ok' : 'warn' };
}

/** Las opciones de Rentas cuyo `POST` devuelve un recurso del dominio. Hoy, dos. */
export const ADAPTACIONES_DE_RENTAS: Readonly<Record<string, Adaptacion>> = {
  predial_individual,
  predial_masivo,
};
