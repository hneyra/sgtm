import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  esObjeto,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Fiscalizacion (#80): **cuatro de ocho**, y por que las otras cuatro se
 * quedan fuera con su motivo anotado.
 *
 * Las ocho tienen `Controller` en `sgtm-fiscalizacion` (#45, #49, #52), y las
 * cuatro que se conectan aqui —`fisc_omisos`, `fisc_estado_cuenta`,
 * `fisc_historico`, `resolucion_determinacion_fisc`— siguen el patron de
 * siempre: `leer` abre el sobre del contrato, `adaptar` traduce el recurso del
 * dominio a lo que dibuja el renderizador, y ninguna cifra se compone
 * (RNF-083) — lo que el recurso no publica sale con {@link SIN_DATO}.
 *
 * **`fisc_resultados` se queda sin conectar, y no por falta de `Controller`.**
 * `LiquidacionResource` nunca lleva `insolutoOmitido` ni `multaTributaria`
 * —son D-02a (#198), y `LiquidarFiscalizacion` los deja `null` sin excepcion,
 * segun su propio javadoc—, y la unica columna de la grilla que se le parece
 * a un predio o una diferencia vive **por linea**, no en la cabecera de la
 * liquidacion: una liquidacion con varios ejercicios fiscalizados no tiene un
 * «Predio» ni una «Deuda omitida S/» que aplanar en una sola fila sin
 * inventar cual linea representa a las demas. Conectarla de verdad hoy
 * dejaria la columna de dinero entera en `SIN_DATO`, que es un retroceso de
 * informacion frente a lo que ya se ve por el camino comun (#78) — y ese
 * camino sigue funcionando: la lectura llega igual, con la forma que
 * comparten las 134 pantallas mientras esta no declare su propia conexion.
 * Se queda como esta hasta que D-02a resuelva el importe o el catalogo
 * aprenda a mostrar mas de una linea por acta.
 *
 * **Las tres escrituras —`fisc_programa`, `fisc_predial`, `fisc_vehicular`—
 * siguen siendo `ACTOS_SIN_CAMPO`** (`pantallas/actos.ts`), no `ESCRITURAS`
 * sin declarar: a las tres les falta un dato para el que ninguna seccion del
 * catalogo dibuja un campo editable. Lo que #431 cambia no es eso, es de
 * donde puede salir ese dato.
 *
 *   `fisc_programa`   `ProgramasController.programar` exige `codigo` y
 *                     `descripcion`. La unica seccion de esta pantalla
 *                     («Datos del programa») dibuja `nDePrograma2` de solo
 *                     lectura y ningun campo de descripcion — el prototipo
 *                     capturo esta pantalla como el resultado de generar un
 *                     programa, no como el formulario que lo crea. **Su
 *                     LECTURA si esta conectada desde #431** (abajo).
 *   `fisc_predial`    `ActaPredialController` exige `programaId`,
 *                     `contribuyenteId` y `predioId`: tres identificadores
 *                     internos. Las tres columnas que se les parecen —
 *                     `programa`, `contribuyente`, `codigoPredial`— son `"ro"`
 *                     en el catalogo: el acta se abre desde la fila de un
 *                     programa ya generado. **`GET /fiscalizacion/programas`
 *                     ya existe (#431)**, asi que el `programaId` ya tiene de
 *                     donde salir; lo que falta es el mecanismo del resolutor
 *                     que lo fije en el cuerpo (#422), y los otros dos
 *                     identificadores, que ninguna lectura de este modulo
 *                     publica por fila.
 *   `fisc_vehicular`  `ActaVehicularController` exige los mismos tres
 *                     identificadores, y esta pantalla ni siquiera dibuja
 *                     una seccion de campos: su catalogo es un filtro y una
 *                     grilla de «Vehículos observados» — un panel de
 *                     resultados de un cruce, no el acta que el endpoint
 *                     registra. Espera a #422 por el resolutor y, ademas, a
 *                     que `hallazgo` viaje por la consulta (#425).
 *
 * Ninguna de las tres esta bloqueada por falta de UI generica: es el mismo
 * hueco que #73 encontro en las transferencias de rentas y que #76 encontro
 * en seis de las ocho escrituras de coactiva.
 */

/* ── Programas de fiscalizacion (`fisc_programa`, RF-050, #431) ────────── */

/**
 * Programacion de fiscalizacion (`ProgramaResource`, RF-050, #431).
 *
 * **La lectura llego despues que la escritura.** La opcion declara `POST
 * /fiscalizacion/programas` como su endpoint, y una operacion que escribe no
 * se pide al abrir la pantalla (`useDatosDePantalla`): hasta #431 esta
 * pantalla no pedia **nada**, ni una fila ni un campo. `GET
 * /fiscalizacion/programas` —operacion `fisc_programas_listado`— es el verbo
 * aparte que faltaba, el mismo reparto que `certificados_listado` (#79) y
 * `costas_procesales_listado` (#42).
 *
 * **Rellena los campos de «Datos del programa» y NO la grilla, y eso es una
 * decision.** `ProgramaResource` publica la cabecera de un programa —codigo,
 * descripcion, tipo, fechas y estado—, y las seis columnas que el catalogo
 * dibuja bajo «Predios seleccionados» son «Predio», «Contribuyente», «Uso
 * declarado», «Área decl. m²», «Riesgo» y «Estado»: ninguna de ellas describe
 * un programa. Poner ahi las filas del listado dejaria un codigo de programa
 * bajo una columna que dice «Predio» y cinco guiones detras, que es reescribir
 * el rotulo del catalogo con otro significado (RNF-080) — el mismo motivo por
 * el que #80 dejo `fisc_resultados` sin conectar. **Y la muestra tampoco esta
 * en el backend**: `programa_fiscalizacion` no tiene tabla de detalle, y un
 * `acta_fiscalizacion` nace el dia de la visita con su predio ya resuelto, no
 * cuando se sortea la muestra. La grilla se queda vacia —como estaba— hasta
 * que exista de donde llenarla.
 *
 * **Los campos solo se rellenan cuando la busqueda deja UN programa.** Con
 * varios no se elige el primero: «Datos del programa» es singular, y decidir
 * cual de los cuatro encontrados esta abierto seria inventarlo. Con el filtro
 * «Nº de programa» puesto siempre hay uno o ninguno — el codigo es unico por
 * municipalidad (`programa_codigo_uq`, V4).
 *
 * **Cuatro campos salen con `SIN_DATO`**: `sector`, `criterioDeRiesgo`,
 * `fiscalizadorAsignado` y `tamanoDeMuestra` no existen en
 * `programa_fiscalizacion` ni en `ProgramaResource` (RNF-083). Y los
 * desplegables «Tipo» y «Estado» del bloque de busqueda **no viajan**: el
 * contrato no los declara para esta operacion, porque hablan un vocabulario
 * que el dominio no tiene —seis clases donde `TipoDePrograma` tiene dos,
 * cuatro situaciones donde `EstadoDePrograma` tiene tres— y mandarlos seria un
 * filtro que no filtra, o uno que decide en silencio que «PREDIAL MASIVO» es
 * PREDIAL (ver `CriterioDeProgramas` en el backend).
 */
const fisc_programa = definirConexion({
  operacion: 'fisc_programas_listado',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fisc_programas_listado', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los programas de fiscalización'),
  adaptar: (paginado): DatosDePantalla => {
    // Un solo programa, o ninguno: ver el javadoc.
    const programas = paginado.contenido.filter(esObjeto);
    const unico = programas.length === 1 ? programas[0] : undefined;
    if (unico === undefined) return { fechaCalculo: hoy() };

    return {
      fechaCalculo: hoy(),
      campos: {
        nDePrograma2: texto(unico['codigo']),
        tipoDePrograma: texto(unico['tipo']),
        fechaDeInicio: texto(unico['fechaInicio']),
        fechaDeTermino: texto(unico['fechaFin']),
        estado2: texto(unico['estado']),
        // Los cuatro que `ProgramaResource` no publica (RNF-083). `ejercicio2`
        // tampoco: el programa tiene fechas, no ejercicio, y deducirlo del ano
        // de inicio diria otra cosa que el filtro de arriba (ver el backend).
        ejercicio2: SIN_DATO,
        sector: SIN_DATO,
        criterioDeRiesgo: SIN_DATO,
        fiscalizadorAsignado: SIN_DATO,
        tamanoDeMuestra: SIN_DATO,
      },
    };
  },
});

/* ── Omisos y subvaluadores (`fisc_omisos`, RF-055) ────────────────────── */

/**
 * `CondicionFiscalizada` (`condicion`), con el mismo criterio de tono que
 * `estados.ts`: el texto siempre es el nombre literal que publica el backend,
 * el color es un extra (FRO-02 §2.1).
 */
const TONO_DE_CONDICION_FISCALIZADA: Readonly<Record<string, TonoDeCelda>> = {
  CONFORME: 'ok',
  OMISO: 'bad',
  SUBVALUADOR: 'warn',
  USO_DISTINTO: 'warn',
  NO_UBICADO: 'bad',
};

/**
 * Omisos y subvaluadores (`OmisoResource`, RF-055, #49).
 *
 * **Las cuatro columnas de importe salen con `SIN_DATO`**: `valorCatastralS`,
 * `valorDeclaradoS`, `diferenciaS` e `impuestoOmitidoS` son D-02a (#198), y el
 * recurso las publica siempre `null` — ver su javadoc. No es esta pantalla la
 * que las omite: es lo que hay.
 */
const fisc_omisos = definirConexion({
  operacion: 'fisc_omisos',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fisc_omisos', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los omisos y subvaluadores'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (fila): readonly Celda[] => {
        const condicion = texto(fila['condicion']);
        return [
          { texto: texto(fila['codRefCatastral']) },
          { texto: texto(fila['titular']) },
          condicion === SIN_DATO
            ? { texto: SIN_DATO }
            : { texto: condicion, tono: TONO_DE_CONDICION_FISCALIZADA[condicion] },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ];
      },
      'contribuyentes detectados',
    ),
  }),
});

/* ── Estado de cuenta de fiscalizacion (`fisc_estado_cuenta`, RF-056) ──── */

/**
 * Estado de cuenta de fiscalizacion (`EstadoDeCuentaResource`, RF-056, #49).
 *
 * El contrato solo declara `contribuyente` como filtro de esta lectura —los
 * otros tres del catalogo (`tipoDePapeleta`, `papeleta`, `placa`) no los pide
 * `OmisosController.estadoDeCuenta`, y no viajan—, asi que la pantalla exige
 * el mismo dato que ya exige abrir «Caja tributaria» sobre `consulta_deuda`.
 *
 * De las trece columnas del catalogo, seis no tienen de donde salir:
 * «Cod. Contri.» (esta pantalla es de **un** contribuyente, no lista varios),
 * «Convenio», «Cuota», «Cod. Tri.», «Fase» y «Papeleta»/«UnidIden» —
 * `EstadoDeCuentaDeFiscalizacion.LineaDelEstadoDeCuenta` no las publica—.
 * `importe` sale `null` mientras nadie transfiera la liquidacion (#52): no hay
 * asiento en el libro que leer.
 */
const fisc_estado_cuenta = definirConexion({
  operacion: 'fisc_estado_cuenta',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fisc_estado_cuenta', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el estado de cuenta de fiscalización'),
  exige: [
    {
      parametro: 'contribuyente',
      titulo: 'Busca un contribuyente para ver su estado de cuenta',
      detalle:
        'Este estado de cuenta es de un contribuyente concreto: escribe su código y pulsa «Buscar». Hasta entonces no hay ninguna deuda que mostrar.',
    },
  ],
  adaptar: (estado): DatosDePantalla => {
    const fecha = texto(estado['fechaDeConsulta']);
    const lineas = Array.isArray(estado['lineas']) ? estado['lineas'].filter(esObjeto) : [];

    return {
      fechaCalculo: fecha === SIN_DATO ? hoy() : fecha,
      campos: { contribuyente2: texto(estado['codContribuyente']) },
      tabla: {
        filas: lineas.map(
          (linea): readonly Celda[] => [
            { texto: texto(linea['deuda']) },
            { texto: SIN_DATO },
            { texto: texto(linea['ano']) },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: texto(linea['nomTrib']) },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: texto(linea['estad']) },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
          ],
          'deudas de fiscalización',
        ),
        conteo: `${lineas.length} deudas de fiscalización`,
      },
    };
  },
});

/* ── Historico de fiscalizacion predial (`fisc_historico`, RF-056) ─────── */

/**
 * `EstadoDeLiquidacion` (V39) → el codigo de una letra que dibuja la columna
 * «Est.», con el mismo tono que ya usa `estados.ts` para un estado.
 */
const TONO_DE_ESTADO_DE_LIQUIDACION: Readonly<Record<string, TonoDeCelda>> = {
  ABIERTA: 'ok',
  EN_PROCESO: 'warn',
  LIQUIDADA: 'warn',
  NOTIFICADA: 'warn',
  ANULADA: 'bad',
};

const INICIAL_DEL_ESTADO: Readonly<Record<string, string>> = {
  ABIERTA: 'A',
  EN_PROCESO: 'P',
  LIQUIDADA: 'L',
  NOTIFICADA: 'N',
  ANULADA: 'X',
};

/**
 * Historico de fiscalizacion predial (`LiquidacionResource.VersionResource`,
 * RF-056, #49).
 *
 * Sin `nLiquidacion` en el filtro, `LiquidacionController.historico` devuelve
 * la grilla paginada de versiones sueltas — cada fila **es** una version, sin
 * la cadena completa de cambios de su acta (esa es la otra mitad del mismo
 * endpoint, la que se pide **con** `nLiquidacion`: abrir el proceso completo
 * de un acta no cabe en una fila de tabla, y queda para cuando esta pantalla
 * tenga su propia vista de detalle).
 *
 * **«Cód. Cont.» y «Contribuyente» salen con `SIN_DATO`**: `LiquidacionResource`
 * no publica quien es el fiscalizado — solo el `actaId`, un identificador
 * interno — y poner ahi un nombre seria inventar un cruce que este endpoint
 * no hace.
 */
const fisc_historico = definirConexion({
  operacion: 'fisc_historico',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fisc_historico', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el histórico de fiscalización predial'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (fila): readonly Celda[] => {
        const version = esObjeto(fila['version']) ? fila['version'] : undefined;
        const estado = texto(version?.['estado']);
        const inicial = INICIAL_DEL_ESTADO[estado] ?? SIN_DATO;
        return [
          inicial === SIN_DATO
            ? { texto: SIN_DATO }
            : { texto: inicial, tono: TONO_DE_ESTADO_DE_LIQUIDACION[estado] },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(version?.['numero']) },
          { texto: texto(version?.['numeroNotificacion']) },
          { texto: texto(version?.['version']) },
        ];
      },
      'fiscalizaciones encontradas',
    ),
  }),
});

/* ── Resolucion de determinacion de fiscalizacion (RF-057, #52) ────────── */

/**
 * Resolucion de determinacion de fiscalizacion (`ResolucionResource`, RF-057,
 * #52): un recurso suelto, abierto por `{numero}` en la ruta — el mismo
 * mecanismo que `duplicado_recibo` (#74): el campo de texto libre del
 * prototipo no llega a `ResolucionController.resolucion`, que solo lee el
 * numero de la direccion.
 *
 * **Las cinco cifras del cuadro salen `SIN_DATO`**: `determinado`,
 * `declarado`, `diferencia` y `total` son D-02a, y `multa` — que existe en el
 * recurso — no tiene columna: la pantalla dibuja «Interés S/», y
 * `LineaDeterminadaResource` no distingue interes de multa. Mostrar la multa
 * bajo ese rotulo diria otra cosa (RNF-080).
 */
const resolucion_determinacion_fisc = definirConexion({
  operacion: 'resolucion_determinacion_fisc',
  parametros: ({ ruta }) => ({ numero: ruta['codigo'] ?? '' }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'la resolución de determinación'),
  adaptar: (resolucion): DatosDePantalla => {
    const lineas = Array.isArray(resolucion['lineas']) ? resolucion['lineas'].filter(esObjeto) : [];
    const desde = texto(resolucion['periodoDesde']);
    const hasta = texto(resolucion['periodoHasta']);
    const fecha = texto(resolucion['fecha']);
    const predioId = texto(resolucion['predioId']);
    const vehiculoId = texto(resolucion['vehiculoId']);

    return {
      fechaCalculo: fecha === SIN_DATO ? hoy() : fecha,
      reporte: {
        code: texto(resolucion['numero']),
        date: fecha,
        meta: [
          { k: 'Nº de resolución', v: texto(resolucion['numero']) },
          { k: 'Contribuyente', v: texto(resolucion['contribuyente']) },
          { k: 'Cód. contribuyente', v: texto(resolucion['codContribuyente']) },
          {
            k: 'Unidad',
            v:
              predioId !== SIN_DATO
                ? `Predio ${predioId}`
                : vehiculoId !== SIN_DATO
                  ? `Vehículo ${vehiculoId}`
                  : SIN_DATO,
          },
          { k: 'Periodo fiscalizado', v: `${desde} — ${hasta}` },
          { k: 'Documento sustento', v: texto(resolucion['documentoSustento']) },
          { k: 'Sustento', v: texto(resolucion['sustento']) },
          { k: 'Base legal', v: texto(resolucion['baseLegal']) },
        ],
        filas: lineas.map((linea): readonly string[] => [
          texto(linea['ejercicio']),
          texto(linea['determinado']),
          texto(linea['declarado']),
          texto(linea['diferencia']),
          SIN_DATO,
          texto(linea['total']),
        ]),
        footer:
          'Documento emitido por el Sistema de Gestión Tributaria Municipal a partir del resultado transferido del procedimiento de fiscalización.',
      },
    };
  },
});

export const CONEXIONES_DE_FISCALIZACION: Readonly<Record<string, Conexion>> = {
  fisc_programa,
  fisc_omisos,
  fisc_estado_cuenta,
  fisc_historico,
  resolucion_determinacion_fisc,
};
