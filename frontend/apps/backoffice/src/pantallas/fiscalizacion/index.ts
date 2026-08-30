import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion, definirConexionEncadenada } from '../conexiones';
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
 * **Y #431 le encuentra dos cosas mas, las dos vivas.** La primera es lo que su
 * franja decia: `impedimentoDelActo` la clasificaba `sin-backend` —«aquí todavía
 * no se puede guardar nada: lo que hay es de consulta»— porque la operacion que
 * el catalogo le da es un `GET`. Las dos mitades eran falsas: su accion primaria,
 * «Emitir resoluciones de determinación», **tiene backend desde #52**
 * —`POST /fiscalizacion/transferencias`, que `ResolucionController` declara con
 * `@RequiereAcceso(acceso = "fisc_resultados")` y su javadoc llama literalmente
 * «la accion de `fisc_resultados`»—, y esta es la frontera mas delicada del
 * sistema: el unico camino por el que un dato de fiscalizacion pasa a ser el dato
 * oficial del padron. Lo que de verdad le falta son los cuatro datos que esa
 * transferencia exige —`nLiquidacion`, `documentoSustento`, `sustento`,
 * `baseLegal`— y que su catalogo no dibuja en ninguna parte: no declara **ni una
 * seccion**, solo filtros, tabla y totales. Desde #431 esta en `ACTOS_SIN_CAMPO`
 * y su franja los nombra.
 *
 * La segunda son **sus tres filtros, que contestan 422 en cuanto se tocan**:
 * «Programa» ofrece codigos —«PF-2026-014»— y `LiquidacionController` pide el
 * identificador interno, sin siquiera una opcion «Todos»; dos de las cuatro
 * opciones de «Hallazgo» no son `CondicionFiscalizada`; y las cuatro de «Estado»
 * tampoco son el estado que el backend guarda. Se bloquean con su motivo
 * (`fiscalizacion/composicion.ts`). De los tres, el unico que **cambio** con este
 * issue es «Programa»: su identificador ya tiene de donde salir
 * (`ProgramaResource.id`), asi que es el unico que un dia se podra resolver.
 *
 * **Y queda una advertencia de integracion que conviene no perder.**
 * `fisc_resultados` es la unica opcion del modulo con `Controller` publicado y
 * sin `Conexion` declarada. Hoy no se nota porque el proxy de datos no tiene ruta
 * `/fiscalizacion/resultados` y sirve el juego del prototipo; el dia que se
 * apague (ADR-0010: «conectar el backend es apagarlo»), esa misma peticion
 * devolvera `RespuestaPaginada<LiquidacionResource>`, el camino comun buscara
 * `tabla.filas`, no lo encontrara y **no fallara nada**: la tabla saldra con sus
 * siete cabeceras y cero filas, sin un mensaje. Es el defecto de #363, #397 y
 * #399, aqui **latente**, sobre la pantalla desde la que se transfiere al padron.
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
 *   `fisc_predial`    **Los tres identificadores ya tienen fuente publicada**,
 *                     y esa es la respuesta a la pregunta de #431: de la fila
 *                     del programa sale **uno** —`ProgramaResource` publica
 *                     `id`, `codigo`, `descripcion`, `tipo`, las dos fechas y
 *                     el estado, y nada mas—, y los otros dos salen de otros
 *                     modulos, que es legitimo (`ResolutorDeUnidad` de
 *                     `alta_deuda` ya cruza catastro y rentas): `predioId` de
 *                     `consulta_fichas` y `contribuyenteId` del padron. Lo que
 *                     **sigue cerrado** es otra cosa, y son dos: el
 *                     `fiscalizador`, que el controlador pasa por `exigir` y el
 *                     catalogo dibuja `"ro"`; y el **hallazgo**, del que se
 *                     habla abajo.
 *   `fisc_vehicular`  `ActaVehicularController` exige los mismos tres
 *                     identificadores **mas la fecha de la visita y el
 *                     fiscalizador**, y esta pantalla no dibuja ninguna
 *                     seccion de campos: su catalogo es un filtro y una grilla
 *                     de «Vehículos observados» — un panel de resultados de un
 *                     cruce, no el acta que el endpoint registra. `hallazgo` ya
 *                     viaja por la consulta (#425, cerrado), asi que esa espera
 *                     termino; lo que falta es la pantalla, y ademas la lectura
 *                     que llene esa grilla, que no existe.
 *
 * ── (#431) El hallazgo, que es lo que de verdad para al acta predial ───────
 *
 * `Hallazgo` declara **cuatro** valores —CONFORME, OMISO, SUBVALUADOR,
 * NO_UBICADO— y el desplegable «Hallazgo principal» del manual ofrece **seis**:
 * SIN OBSERVACIONES, AMPLIACIÓN NO DECLARADA, USO DISTINTO AL DECLARADO, OMISO A
 * LA DECLARACIÓN, PREDIO SUBVALUADO, PREDIO INEXISTENTE. **Ninguna de las seis es
 * ninguno de los cuatro, letra por letra**, y el campo es opcional: declararlo
 * tal cual dejaria el acta entrando con 201 y **sin hallazgo**.
 *
 * Lo que eso cuesta hay que decirlo con precision, porque no es lo mismo en las
 * dos actas. En la **vehicular**, `LiquidarFiscalizacion.condicionVehicular` lee
 * `hallazgo == null` como CONFORME: un acta de un vehiculo no declarado se
 * liquidaria como conforme. En la **predial** la condicion no sale del hallazgo
 * sino de comparar lo hallado con lo declarado, asi que lo que se pierde es
 * `NO_UBICADO`: un «PREDIO INEXISTENTE» se compararia por area como si el predio
 * se hubiera encontrado.
 *
 * Aqui **no se traduce ninguno**, por lo mismo que #427 no tradujo «ACTIVA» a
 * VIGENTE: parecerse no es serlo, y estas seis palabras deciden si una
 * fiscalizacion produce deuda. Ampliar el enumerado —o decidir por escrito el
 * mapeo de las seis— es del dominio de fiscalizacion, no de la interfaz.
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
 * **Y desde #481 rellena tambien la grilla, que es la MUESTRA del programa.**
 * Hasta entonces se quedaba vacia a proposito: `ProgramaResource` describe un
 * programa y las seis columnas de «Predios seleccionados» describen un predio,
 * asi que poner ahi las filas del listado dejaria un codigo de programa bajo
 * una columna que dice «Predio» (RNF-080) — el mismo motivo por el que #80 dejo
 * `fisc_resultados` sin conectar. Lo que faltaba no era interfaz: era que
 * `programa_fiscalizacion` no tenia tabla de detalle. `V60` le dio
 * `programa_muestra` y `GET /fiscalizacion/programas/{id}/muestra`, y con ella
 * **las dos mitades del AC 2 de #431 resultaron ser la misma pieza**: es la
 * grilla, y es tambien la fila de la que el acta predial resuelve sus tres
 * identificadores.
 *
 * **Son dos lecturas encadenadas**, y por eso usa `definirConexionEncadenada`:
 * la muestra se pide por el IDENTIFICADOR del programa, que solo se conoce
 * despues de encontrarlo por su codigo. Sin exactamente un programa no sale
 * ninguna segunda peticion — no es una lectura vacia, es una lectura que no se
 * hace.
 *
 * De las seis columnas, dos siguen sin origen y lo dicen: **«Uso declarado»**
 * sale `SIN_DATO` porque `DeteccionDeOmisos` deja el uso en nulo por los dos
 * lados de la comparacion, y el uso que si publica el padron es el que el
 * CATASTRO tiene inscrito —bajo una cabecera que dice «declarado» diria otra
 * cosa—; y **«Estado»** se DERIVA de si el predio ya tiene acta en el programa,
 * porque guardarlo en la fila dejaria dos verdades sobre lo mismo (V60 §2, la
 * leccion de #397).
 *
 * **Los campos solo se rellenan cuando la busqueda deja UN programa.** Con
 * varios no se elige el primero: «Datos del programa» es singular, y decidir
 * cual de los cuatro encontrados esta abierto seria inventarlo. Con el filtro
 * «Nº de programa» puesto siempre hay uno o ninguno — el codigo es unico por
 * municipalidad (`programa_codigo_uq`, V4).
 *
 * **Los cuatro campos que salian con `SIN_DATO` ya no**: `sector`,
 * `criterioDeRiesgo`, `fiscalizadorAsignado` y `tamanoDeMuestra` los gano
 * `programa_fiscalizacion` con `V60` —los tres primeros son los parametros con
 * los que el programa sortea, y el cuarto es CUANTAS filas tiene la muestra, no
 * un tope—. El «Criterio de riesgo» puede salir `SIN_DATO` igual, y eso es
 * honesto: de los cinco rotulos del desplegable, «SUBVALUACIÓN PROBABLE» y
 * «DEUDA ALTA» no son ninguna `CondicionFiscalizada` —el primero exige
 * valorizar (D-02a, H-14) y el segundo un umbral en soles que ninguna ordenanza
 * da—, y traducirlos al valor mas parecido diria que el programa busca otra
 * cosa. Y los
 * desplegables «Tipo» y «Estado» del bloque de busqueda **no viajan**: el
 * contrato no los declara para esta operacion, porque hablan un vocabulario
 * que el dominio no tiene —seis clases donde `TipoDePrograma` tiene dos,
 * cuatro situaciones donde `EstadoDePrograma` tiene tres— y mandarlos seria un
 * filtro que no filtra, o uno que decide en silencio que «PREDIAL MASIVO» es
 * PREDIAL (ver `CriterioDeProgramas` en el backend). **Desde #431 se dibujan
 * bloqueados con su motivo** (`fiscalizacion/composicion.ts`): hasta entonces se
 * tecleaban y se caian en silencio, porque `parametrosDeBusqueda` descarta lo que
 * el contrato no declara y nadie lo decia.
 *
 * **Y su escritura sigue sin conectar por algo que no es un campo**: `POST
 * /fiscalizacion/programas` **registra** un programa, y las tres acciones que el
 * catalogo dibuja nombran otros tres actos —«Generar muestra» promete una muestra
 * que el backend no produce, y «Asignar fiscalizador» y «Aprobar programa»
 * prometen transiciones que `EstadoDePrograma` no tiene—. Declarar cualquiera de
 * las tres en `LA_QUE_ESCRIBE` pintaria de navy un boton que dice una cosa y hace
 * otra, que es justo lo que #421 y RNF-080 existen para impedir.
 */
const fisc_programa = definirConexionEncadenada({
  operacion: 'fisc_programas_listado',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fisc_programas_listado', undefined, busqueda),
  segunda: 'fisc_programa_muestra',
  // La muestra se pide por el IDENTIFICADOR del programa, y el identificador
  // solo se conoce despues de encontrarlo por su codigo. Sin un unico programa
  // no hay a que encadenar y no sale ninguna peticion: ver `definirConexionEncadenada`.
  encadenar: (cuerpo) => {
    const programas = leerPaginado(cuerpo, 'los programas de fiscalización').contenido.filter(
      esObjeto,
    );
    const unico = programas.length === 1 ? programas[0] : undefined;
    if (unico === undefined) return undefined;
    const id = texto(unico['id']);
    return id === SIN_DATO ? undefined : { id, pagina: '0', tamano: '50' };
  },
  leer: (primera, segunda) => ({
    programas: leerPaginado(primera, 'los programas de fiscalización').contenido.filter(esObjeto),
    muestra:
      segunda === undefined
        ? undefined
        : leerPaginado(segunda, 'la muestra del programa').contenido.filter(esObjeto),
  }),
  adaptar: ({ programas, muestra }): DatosDePantalla => {
    // Un solo programa, o ninguno: ver el javadoc.
    const unico = programas.length === 1 ? programas[0] : undefined;
    if (unico === undefined) return { fechaCalculo: hoy() };

    const filas = muestra ?? [];
    return {
      fechaCalculo: hoy(),
      campos: {
        nDePrograma2: texto(unico['codigo']),
        tipoDePrograma: texto(unico['tipo']),
        fechaDeInicio: texto(unico['fechaInicio']),
        fechaDeTermino: texto(unico['fechaFin']),
        estado2: texto(unico['estado']),
        // Los cuatro que `programa_fiscalizacion` gano con `V60` (#481) y que
        // hasta entonces salian con `SIN_DATO`.
        ejercicio2: texto(unico['ejercicio']),
        sector: texto(unico['sector']),
        criterioDeRiesgo: texto(unico['criterio']),
        fiscalizadorAsignado: texto(unico['fiscalizador']),
        // El tamano de la muestra es CUANTAS filas tiene, no un tope: un tope
        // exigiria un orden por riesgo, y `CondicionFiscalizada` es una
        // etiqueta y no una escala (V60 §2).
        tamanoDeMuestra: muestra === undefined ? SIN_DATO : String(filas.length),
      },
      tabla: {
        filas: filas.map((fila): readonly Celda[] => {
          const condicion = texto(fila['condicion']);
          return [
            { texto: texto(fila['codRefCatastral']) },
            { texto: texto(fila['titular']) },
            // «Uso declarado»: `DeteccionDeOmisos` pasa el uso en nulo por los
            // dos lados, y el que si publica el padron es el que el CATASTRO
            // tiene inscrito. Bajo esta cabecera diria otra cosa (RNF-080).
            { texto: SIN_DATO },
            { texto: texto(fila['areaDeclarada']) },
            condicion === SIN_DATO
              ? { texto: SIN_DATO }
              : { texto: condicion, tono: TONO_DE_CONDICION_FISCALIZADA[condicion] },
            { texto: fila['visitado'] === true ? 'VISITADO' : 'PENDIENTE' },
          ];
        }),
        conteo: `${filas.length} predios seleccionados`,
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
