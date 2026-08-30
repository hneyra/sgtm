import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { importeDe } from '@sgtm/lectura';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { fechaDeCorteDe, obligacionDeDeuda } from '../consultas';
import {
  SIN_DATO,
  datosDe,
  esObjeto,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Tesorería, conectado hasta donde llega el backend (#33, #34, #35, #36, #74, #423).
 *
 * Backend servido para **las diez** opciones (#33–#36), y de ahí no se sigue que las diez
 * lean o escriban ya de verdad: cuatro se conectan sin más —`consulta_convenios`,
 * `duplicado_recibo`, `avance_recaudacion`, `recaudacion_area`—, `caja_tributaria` conecta
 * su grilla de deuda aunque su acto siga sin poder guardarse, y `cierre_caja` lee el arqueo
 * en vivo de su turno **y ya lo firma** (#423). `anulacion_recibo` y `anulacion_convenio` se
 * declaran solo en `escrituras.ts`, porque no tienen ningún `GET` que leer: las dos se abren
 * por la URL, con el número impreso del recibo o del convenio. Las que se quedan fuera son
 * `caja_tasas` y `fraccionamiento`, con su motivo anotado.
 *
 * ── La caja **cobra** desde #430, y lo que hizo falta fueron cuatro cosas ────
 *
 * `CajaController.cobranza` exige `formaDePago` en el cuerpo —EFECTIVO, CHEQUE, DEPOSITO,
 * TARJETA o TRANSFERENCIA, el medio con que entra el dinero— y **ninguna sección de la
 * pantalla dibuja un campo para él**: lo que el prototipo llama «Forma de pago» es, en el
 * backend, `tipoDePago` —NORMAL TRIBUTARIO, A CUENTA, PRECONVENIO…—, un campo distinto y
 * opcional. Y exige además la `caja`, el `cajero` y al menos una obligación marcada, para los
 * que tampoco hay campo. **Eran cuatro huecos y la entrada de `ACTOS_SIN_CAMPO` nombraba uno**,
 * que es de menos: quien la leyera creería que falta un control cuando faltan tres y una grilla.
 *
 * Los tres primeros los declara `tesoreria/composicion.ts` con el mecanismo de #422 —el del
 * medio de pago con **su propia etiqueta**, «Medio de pago», porque dos cosas distintas no se
 * llaman igual en la misma pantalla (RNF-080)— y el cuarto sale de la grilla que esta pantalla
 * ya leía, con la selección de filas de #332: la misma lectura (`consulta_deuda`) y el mismo
 * patrón que `baja_deuda`.
 *
 * **Y lo que no se declara se dibuja bloqueado**, que es lo que `Formulario` hace con lo que no
 * está en la lista blanca. Dos campos merecen decirse porque parecen justo lo que no son:
 * «Forma de pago» —de sus nueve opciones sólo dos llegarían a cobrar; «A CUENTA» ni siquiera
 * existe con ese nombre en el enumerado (`A_CUENTA`)— y «Beneficio aplicable», cuyas cuatro
 * campañas son **ordenanzas que el prototipo inventó** y que se guardarían verbatim en
 * `recibo.campania_beneficio`, que es papel firmado (D-02b).
 *
 * ── `caja_tasas` y `fraccionamiento` se quedan, y ya no por el mismo motivo ──
 *
 * `caja_tasas` tiene el hueco de su gemela **más uno que la separa**: `PeticionDeCobroDeTasas`
 * exige al menos un concepto del TUPA marcado, y **ninguna consulta del sistema publica ese
 * catálogo** —`TasaRepository` tiene un solo método, `vigenteA(codigo, fecha)`, y el contrato no
 * declara ningún `GET /tesoreria/tasas`; `tesoreria.test.tsx` lo censa—. Sin la lista no hay de
 * dónde elegir, así que su entrada de `ACTOS_SIN_CAMPO` nombra los cuatro: los conceptos, el medio
 * de pago, la caja y el cajero.
 *
 * ── Y publicar esa lectura **no desbloquearía nada**, que es el hallazgo ────
 *
 * Se miró para hacerlo, y lo que falta no es la lectura: es el **cuadro**.
 *
 * 1. **La tarifa nunca la manda el cliente.** `PeticionDeConcepto` lleva el `conceptoTupa` y la
 *    cantidad, y el importe lo resuelve el servidor con `TasaRepository.vigenteA(codigo, fecha)`
 *    —a la fecha del cobro, no la última—, con `TasaSinTarifaVigente` y `TarifaEnCero` como sus
 *    dos negativas. Está bien así: es lo que impide que la ventanilla decida cuánto cuesta un
 *    trámite.
 * 2. **Nada en producción escribe la tabla `tasa`.** Los únicos `INSERT INTO tasa` del
 *    repositorio están en fixtures de prueba —es exactamente la situación que `area` y `caja`
 *    tenían antes de #460—, así que una lectura publicada hoy devolvería una lista vacía en toda
 *    instalación real, y conectar la pantalla sobre ella cambiaría una franja que **nombra lo que
 *    falta** por una grilla vacía que se lee como «esta municipalidad no cobra tasas».
 * 3. **Y sus cifras son D-02b, fila 29**: «derecho de trámite del TUPA», con su acuerdo de
 *    ratificación provincial. No es una tabla que se siembre a mano (regla 5). El corpus ya
 *    tiene **una** transcripción verificada a doble firma —
 *    `valores-normativos/derecho-tramite-licencia-edificacion-catacaos-2023.md`, la del piloto—,
 *    y ese archivo dice tres cosas que cierran la puerta: **«No se carga con este archivo»**, que
 *    va a `parametro_tributario` con el derivado de `publicacion/` **cuando #197 resuelva cómo
 *    modelar una tarifa por modalidad en vez de una alícuota simple**, y que la **ratificación
 *    provincial sigue sin confirmarse**. Además cubre sólo la licencia de edificación: el resto
 *    del TUPA de Catacaos —incluida su sección de tributación— está en páginas que no se han
 *    transcrito.
 * 4. **Y la tabla pide dos datos que el corpus no tiene**: `partida_presupuestal` y `area_id`, los
 *    dos `NOT NULL` (V3). Ni el uno ni el otro salen de una ordenanza: son de la contabilidad y de
 *    la organización de cada municipalidad.
 *
 * Así que la lectura no se publica todavía —publicarla sería ofrecer una puerta a una habitación
 * vacía— y **el catálogo del TUPA es un issue de gobierno**: D-02b, fila 29, #197. El día que
 * exista, esta pantalla se conecta como su gemela: tres controles declarados y una grilla con su
 * selección de filas.
 *
 * `fraccionamiento` tiene el mismo problema con otra forma: `PeticionDeFraccionamiento` exige
 * al menos una obligación marcada, y el catálogo de esta pantalla no declara ninguna tabla de
 * deuda que elegir —la única `tabla` que dibuja, «Detalle cuotas», es el cronograma de
 * **salida** de la simulación, no una grilla de entrada—. También va a `ACTOS_SIN_CAMPO`.
 *
 * **Y su primaria no se declara**, aunque el catálogo dibuje tres verbos —«Fraccionar»,
 * «Imprimir simulación», «Aceptar»—: lo único que el código atribuye a un botón concreto es la
 * simulación (`ConvenioController.fraccionar` dice «es el boton «Imprimir simulacion» de la
 * pantalla»), y **nada dice cuál de las otras dos registra**. «Fraccionar» = calcular el
 * cronograma con «Aceptar» = confirmar se lee igual de bien que al revés, y en ese caso la
 * última del catálogo ya es la correcta. Declarar el rótulo equivocado en `LA_QUE_ESCRIBE` es
 * exactamente el defecto que esa lista existe para impedir.
 *
 * ── Las dos formas de cuerpo que faltaban, y que ya no faltan (#423) ────────
 *
 * `cierre_caja` y `anulacion_convenio` nunca tuvieron el defecto de arriba —sus campos sí
 * están dibujados— sino uno de mecanismo, y #423 lo cerró en `pantallas/escritura.ts`:
 * `PeticionDeCierre.declarado` es un **mapa** por forma de pago (`{"EFECTIVO": "120.00", …}`,
 * `MapaDelCuerpo`) y `PeticionDeCierreDeConvenio` necesita un **discriminador** —`accion`, que
 * decide qué botón se pulsó (`EscrituraDeclarada.segunLaAccion`)—. Las dos formas se declaran
 * una vez y quedan disponibles: el mapa es la forma de todo arqueo y de toda distribución por
 * concepto, y el discriminador la de toda pantalla que el prototipo capturó con dos verbos.
 *
 * De las tres acciones del convenio se declaran **dos**: «Anular» y «Quebrar». «Reformar»
 * exige además el convenio nuevo que sustituye al anterior —`PeticionDeFraccionamiento`
 * entero, con al menos una obligación acogida—, y esta pantalla no dibuja ninguna grilla de
 * deuda: es el mismo hueco por el que `fraccionamiento` está en `ACTOS_SIN_CAMPO`.
 */

/**
 * El identificador interno como texto, o vacio si el recurso no lo trajo.
 *
 * Gemelo del de `rentas/index.ts`, y se duplica a proposito: son dos modulos que
 * llegan en dos trozos distintos (#433), y exportarlo de uno ataria el paquete
 * de Tesoreria al de Rentas por tres lineas.
 */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

/** El registro que abre un recibo o un convenio: su número impreso. Sin él no hay petición. */
const registro = ({ ruta }: ContextoDePantalla): string => ruta['codigo'] ?? '';

/**
 * Caja tributaria (RF-080, #33): **solo su grilla de deuda**, no su cobro.
 *
 * `caja_tributaria` es un `POST` —`/tesoreria/caja/cobranza`—, y una operación que escribe no
 * se pide al abrir la pantalla (#332): igual que `baja_deuda`, la tabla «Deudas del
 * contribuyente» se lee de `GET /consultas/deuda`, que es exactamente la misma deuda que la
 * caja cobraría. Cobrar sigue apagado —`ACTOS_SIN_CAMPO.caja_tributaria`—, pero quien atiende
 * ya ve la deuda real del contribuyente en vez de la fila fija del prototipo.
 *
 * La primera celda («Unidad») sale en blanco, igual que en `baja_deuda`: `ObligacionConDeudaResource`
 * publica el identificador interno del predio o del vehículo, no su código catastral ni su
 * placa, y enseñar un identificador interno bajo ese rótulo sería enseñar otra cosa.
 */
const caja_tributaria = definirConexion({
  operacion: 'consulta_deuda',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda del contribuyente'),
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Busca un contribuyente para ver su deuda',
      detalle:
        'La caja cobra sobre la cuenta corriente de un contribuyente: escribe su código arriba y pulsa «Buscar». Hasta entonces no hay ninguna deuda que elegir.',
    },
  ],
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Consulta de deuda»',
    detalle:
      'Para ver la deuda hace falta lectura de «Consulta de deuda»: la tabla de aquí es la deuda del contribuyente, y esa la publica esa otra opción. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeCorteDe(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (obligacion): readonly Celda[] => {
        const leida = obligacionDeDeuda(obligacion);
        return [
          { texto: '' },
          { texto: leida.ejercicio },
          { texto: SIN_DATO },
          { texto: leida.cuota },
          { texto: leida.tributo },
          { texto: leida.fase },
          { texto: leida.insoluto },
          { texto: leida.reajuste },
          { texto: leida.interes },
          { texto: leida.gasto },
          { texto: leida.total },
        ];
      },
      'deudas',
      /* Lo que identifica la obligacion, **leido del cuerpo y no de la celda**
         (#332, #430). Las claves son las de las columnas del catalogo, salvo
         `predioId` y `vehiculoId`, que ninguna columna dibuja: son el
         identificador interno con que `ClaveDeSaldo` compara, y ensenarlo bajo
         «Unidad» seria ensenar otra cosa con ese rotulo.

         Aqui **no viaja la fase**, y esa es la diferencia con la baja: cobrar no
         mueve ninguna obligacion de fase —`CobrarDeuda` abona sobre la que hay—,
         mientras que una baja sin fase la devolvia a ORDINARIA sin decirlo. */
      (obligacion) => {
        const leida = obligacionDeDeuda(obligacion);
        return {
          ano: leida.ejercicio,
          tributo: leida.tributo,
          predioId: identificador(obligacion['predioId']),
          vehiculoId: identificador(obligacion['vehiculoId']),
        };
      },
    ),
  }),
});

/**
 * Consulta de convenios (RF-084, #35): el seguimiento de los suscritos, paginado tal cual lo
 * publica `ConvenioController.listar`.
 *
 * `fechaCorte`, `saldoALaFecha`, `motivo`, `cronograma`, `deudaOriginal` y `movimientos` —el
 * detalle que el controlador solo carga cuando `nroDeConvenio` apunta a uno— no tienen columna
 * en esta grilla (`ConvenioResource.FilaResource`, comentado: «una página de veinte no puede
 * costar veinte lecturas de detalle»): el catálogo dibuja la fila corta, y aquí se lee la fila
 * corta.
 */
const consulta_convenios = definirConexion({
  operacion: 'consulta_convenios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_convenios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los convenios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (convenio): readonly Celda[] => [
          { texto: texto(convenio['nroConvenio']) },
          { texto: texto(convenio['contribuyente']) },
          { texto: texto(convenio['fecha']) },
          { texto: texto(convenio['deudaAcogidaS']) },
          { texto: texto(convenio['cuotas']) },
          { texto: texto(convenio['pagadas']) },
          { texto: texto(convenio['vencidas']) },
          { texto: texto(convenio['saldoS']) },
          { texto: texto(convenio['estado']) },
        ],
        'convenios',
      ),
    ),
});

/**
 * Duplicado de recibo (RF-082, #34): **un** recibo, no un padrón de resultados.
 *
 * `GET /tesoreria/recibos/{nro}/duplicado` trae un solo `DuplicadoResource`, mientras que el
 * prototipo dibuja «Recibos localizados» como si fuera una búsqueda por contribuyente, fecha o
 * caja —el mismo desajuste que #175 ya encontró en `consulta_deuda`, y que `declaracion_jurada`
 * resuelve igual—: no hay ningún `GET /tesoreria/recibos` que liste, así que se dibuja como una
 * tabla de **una fila**.
 *
 * Los cuatro filtros del prototipo (`nroDeRecibo`, `codContribuyente`, `fecha`, `caja`) no
 * abren este recibo: `ReciboController.vistaPrevia` solo lee `{nro}` de la ruta —el contrato
 * declara los otros cuatro como parámetro de consulta porque el generador los deriva del
 * catálogo (#312), no porque el controlador los use—. El registro que abre esta pantalla es la
 * URL, `/tesoreria/duplicado-recibo/{nro}`, igual que una ficha catastral se abre por su código
 * y no por el filtro de texto libre que hay al lado.
 *
 * «Contribuyente» sale con `SIN_DATO`: `ReciboResource` no publica ni el código ni el nombre de
 * quien pagó —solo `cajero`—, y cruzarlo con `contribuyentes` no es cosa de este endpoint.
 * «Concepto» solo se enseña cuando el recibo tiene **una** línea: con varias, una sola celda no
 * puede decir de cuál se habla sin inventar un resumen (RNF-083).
 *
 * Solo `nro` viaja: los otros cuatro parámetros de consulta que declara el contrato no los lee
 * `ReciboController.vistaPrevia`, y mandarlos sería mandar un filtro que el backend ignora.
 */
const duplicado_recibo = definirConexion({
  operacion: 'duplicado_recibo',
  parametros: (contexto) => ({ nro: registro(contexto) }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el duplicado del recibo'),
  adaptar: (duplicado): DatosDePantalla => {
    const recibo = esObjeto(duplicado['recibo']) ? duplicado['recibo'] : undefined;
    const total = importeDe(recibo?.['total']);
    const lineas = Array.isArray(recibo?.['lineas']) ? recibo['lineas'] : [];
    const unaLinea = lineas.length === 1 && esObjeto(lineas[0]) ? lineas[0] : undefined;
    const emitidoEn = typeof recibo?.['emitidoEn'] === 'string' ? recibo['emitidoEn'] : '';
    const [fechaEmision = '', horaConResto = ''] = emitidoEn.split('T');

    return {
      fechaCalculo: total?.actualizadoA ?? hoy(),
      tabla: {
        filas: [
          [
            { texto: texto(recibo?.['numero']) },
            { texto: fechaEmision === '' ? SIN_DATO : fechaEmision },
            { texto: horaConResto === '' ? SIN_DATO : horaConResto.slice(0, 5) },
            { texto: SIN_DATO },
            { texto: unaLinea === undefined ? SIN_DATO : texto(unaLinea['tributo']) },
            { texto: total?.importe ?? SIN_DATO },
            { texto: texto(duplicado['duplicados']) },
            { texto: texto(duplicado['estado']) },
          ],
        ],
        conteo: '1 recibo',
      },
    };
  },
});

/**
 * Avance de recaudación (RF-088, #36): un agregado, no un padrón.
 *
 * `GET /tesoreria/recaudacion/avance` no está paginado —`RecaudacionController` lo dice sin
 * rodeos: paginar un agregado dejaría al cliente con una página de sumas y sin el total, que es
 * la cifra que el reporte existe para dar—, así que se lee con `leerObjeto` y no con
 * `leerPaginado`: forzarlo por el paginado fallaría pensando que la forma está mal, cuando la
 * forma real es esta.
 *
 * Cuatro de las siete columnas del catálogo no tienen de dónde salir, y las cuatro por el mismo
 * motivo: «Emitido S/» son cargos del libro que este contexto no lee, «Meta S/» no tiene tabla
 * (D-02b), y «% avance»/«% de meta» son cocientes sobre las dos anteriores —componerlos aquí
 * sería inventar un porcentaje que nadie firmó (RNF-083)—. Salen con `SIN_DATO`.
 */
const avance_recaudacion = definirConexion({
  operacion: 'avance_recaudacion',
  parametros: ({ busqueda }) => parametrosDeBusqueda('avance_recaudacion', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el avance de recaudación'),
  adaptar: (avance): DatosDePantalla => {
    const filas = Array.isArray(avance['filas']) ? avance['filas'].filter(esObjeto) : [];
    const cobrado = importeDe(avance['cobrado']);
    const aLaFecha = texto(avance['aLaFecha']);

    return {
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as Fecha),
      tabla: {
        filas: filas.map((fila): readonly Celda[] => [
          { texto: texto(fila['tributo']) },
          { texto: SIN_DATO },
          { texto: importeDe(fila['cobrado'])?.importe ?? SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ]),
        conteo: `${filas.length} tributos`,
      },
      totales: [
        { label: 'Emitido', value: SIN_DATO },
        { label: 'Recaudado', value: cobrado?.importe ?? SIN_DATO },
        { label: 'Saldo por cobrar', value: SIN_DATO },
        { label: 'Avance', value: SIN_DATO },
      ],
    };
  },
});

/**
 * Recaudación por área (RF-089, #36): tampoco paginada, por el mismo motivo que el avance.
 *
 * «Descripción» se lee de `areaNombre`: `FilaDePartida` no publica ninguna descripción de la
 * partida presupuestal, y el nombre del área generadora es el único texto explicativo que el
 * recurso trae. En las filas de «lo tributario» —sin área ni partida, documentadas en
 * `RecaudacionResource.FilaDePartida` como el `netoSinPartida`— las tres columnas salen con
 * `SIN_DATO`: un «VARIOS» inventado se copiaría a un reporte presupuestal sin que nadie lo note.
 */
const recaudacion_area = definirConexion({
  operacion: 'recaudacion_area',
  parametros: ({ busqueda }) => parametrosDeBusqueda('recaudacion_area', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'la recaudación por área'),
  adaptar: (distribucion): DatosDePantalla => {
    const filas = Array.isArray(distribucion['filas'])
      ? distribucion['filas'].filter(esObjeto)
      : [];
    const aLaFecha = texto(distribucion['aLaFecha']);

    return {
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as Fecha),
      tabla: {
        filas: filas.map((fila): readonly Celda[] => [
          { texto: texto(fila['partida']) },
          { texto: texto(fila['areaNombre']) },
          { texto: importeDe(fila['neto'])?.importe ?? SIN_DATO },
        ]),
        conteo: `${filas.length} partidas`,
      },
    };
  },
});

/**
 * Cierre y arqueo de caja (RF-087, #36, #423): **el arqueo en vivo del turno**,
 * que es lo que la pantalla llama «Cuadrar».
 *
 * `cierre_caja` es un `POST` —`/tesoreria/caja/cierre`—, y una operación que
 * escribe no se pide al abrir la pantalla (#332): abrir el cierre no puede
 * cerrar nada. Lo que se lee es `GET /tesoreria/recaudacion/avance` con la caja
 * y el cajero, que el propio `RecaudacionController` publica para esto —«sin
 * ellos, la pantalla de cierre no podría cuadrar antes de firmar»— y responde el
 * mismo arqueo que el cierre va a congelar. Es el mismo reparto que ya usa
 * `caja_tributaria` leyendo `consulta_deuda`.
 *
 * **Ninguna cifra se compone aquí** (RNF-083): «Total sistema», «Total
 * declarado» y «Diferencia» salen de `ArqueoResource`, que las calcula de sus
 * líneas —`ArqueoDelTurno` es quien resta—, y no de sumar las filas del arqueo
 * que la pantalla dibuja. Sumar las cinco daría otra cifra en cuanto el arqueo
 * tuviera una línea que la pantalla no dibuja, y las dos parecerían correctas.
 *
 * El día del turno es el del formulario: `desde` y `hasta` van al mismo día,
 * porque el backend toma **el último del rango** como día del turno. Sale del
 * borrador (`ContextoDePantalla.borrador`) para que lo que se lee y lo que se
 * manda sean del mismo día (regla 9), igual que la fecha de la baja de deuda.
 *
 * `turno` (MAÑANA / TARDE / CONTINUO) y la hora de cierre salen con `SIN_DATO`:
 * el primero **no existe como dato** —`cierre_uq` hace único el turno por caja,
 * cajero y fecha— y la segunda es el instante del acta, que todavía no hay.
 */
const cierre_caja = definirConexion({
  operacion: 'avance_recaudacion',
  parametros: ({ busqueda, borrador }) => {
    const dia = (borrador['fecha'] ?? '').trim() === '' ? hoy() : (borrador['fecha'] as string);
    return {
      caja: busqueda.get('caja') ?? '',
      cajero: busqueda.get('cajero') ?? '',
      desde: dia,
      hasta: dia,
    };
  },
  leer: (cuerpo) => leerObjeto(cuerpo, 'el arqueo del turno'),
  exige: [
    {
      parametro: 'caja',
      titulo: 'Busca el turno que vas a cerrar',
      detalle:
        'El cierre es de una caja y un cajero: escríbelos arriba y pulsa «Buscar». Hasta entonces no hay ningún arqueo que cuadrar.',
    },
    {
      parametro: 'cajero',
      titulo: 'Falta el cajero del turno',
      detalle:
        'El turno se identifica por caja, cajero y fecha: sin el cajero no hay ningún arqueo que leer ni que firmar.',
    },
  ],
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Avance de recaudación»',
    detalle:
      'El arqueo en vivo del turno lo publica esa otra opción, y es la que hay que poder leer para cuadrar antes de firmar. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (avance): DatosDePantalla => {
    const turno = esObjeto(avance['turno']) ? avance['turno'] : undefined;
    const arqueo = esObjeto(turno?.['arqueo']) ? turno['arqueo'] : undefined;
    const declarado = importeDe(arqueo?.['declarado']);
    const neto = importeDe(arqueo?.['neto']);
    const diferencia = importeDe(arqueo?.['diferencia']);
    const aLaFecha = texto(avance['aLaFecha']);

    return {
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as Fecha),
      campos: {
        caja: texto(turno?.['caja']),
        cajero: texto(turno?.['cajero']),
        fecha: texto(turno?.['fecha']),
        turno: SIN_DATO,
        horaDeApertura: SIN_DATO,
        horaDeCierre: SIN_DATO,
        totalDeclaradoS: declarado?.importe ?? SIN_DATO,
        totalSistemaS: neto?.importe ?? SIN_DATO,
        diferenciaS: diferencia?.importe ?? SIN_DATO,
        recibosEmitidos: texto(arqueo?.['recibosEmitidos']),
        recibosAnulados: texto(arqueo?.['recibosAnulados']),
      },
    };
  },
});

/** Las opciones de Tesorería ya conectadas. Crece cuando crezca lo que la pantalla puede leer. */
export const CONEXIONES_DE_TESORERIA: Readonly<Record<string, Conexion>> = {
  caja_tributaria,
  cierre_caja,
  consulta_convenios,
  duplicado_recibo,
  avance_recaudacion,
  recaudacion_area,
};
