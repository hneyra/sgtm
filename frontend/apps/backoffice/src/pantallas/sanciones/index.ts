import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  datosDe,
  esObjeto,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Infracciones administrativas, conectado hasta donde llega el backend: **ocho opciones de
 * trece** (#78 y #397, sobre #363).
 *
 * `adm_estado_cuenta` (`GET /infracciones/administrativas/estado-cuenta`,
 * `EstadoDeCuentaAdministrativoController`, #47) es la que la ficha 360° compone (#297,
 * `pestanas.ts`), conectada desde #363. Este issue añade las seis lecturas de aquí abajo, todas
 * `GET` puros:
 *
 *   `codigos_cuis`                    `GET /infracciones/cuis`
 *   `adm_codigos_reporte`             `GET /infracciones/administrativas/codigos/reporte`
 *   `adm_padron_notificaciones`       `GET .../reportes/padron-notificaciones`
 *   `adm_notificaciones_vencidas`     `GET .../reportes/vencidas`
 *   `adm_notificaciones_contribuyente` `GET .../reportes/por-contribuyente`
 *   `adm_resumen_recaudacion`         `GET .../reportes/resumen-recaudacion` (objeto suelto)
 *
 * Y desde #397 se suma la octava, `infracciones_adm` (`GET /infracciones/actas`), que era la
 * única que tenía `Controller` y aun así no se podía conectar. Lo que le faltaba no era la
 * interfaz: **le faltaba un filtro y le sobraba un vocabulario**. El filtro «Estado» de esta
 * pantalla —`PREVENTIVA`, `CONSTATADA`, `SANCIONADA`, `PAGADA`, `COACTIVA`: el vocabulario del
 * *procedimiento sancionador*— no tenía parámetro que lo recibiera, y la única columna de estado
 * que el backend publicaba era el `enum EstadoDePapeleta` —`IMPUESTA`, `NOTIFICADA`, `RESUELTA`…:
 * el vocabulario de la *deuda*—. Conectarla así habría dejado un filtro que no filtra nada al
 * lado de una columna que habla otro idioma, y RNF-080 no deja renombrar ninguno de los dos.
 *
 * #397 los separó en el backend: `ProcedimientoSancionadorResource` publica `fase` —derivada de
 * los hechos, no guardada en ninguna columna— **y** `estadoDeLaDeuda`, cada uno con su nombre, y
 * `estado` pasa a ser el parámetro de la fase. Aquí se dibuja `fase` en la columna «Estado» de la
 * grilla, que es la que el filtro promete; `estadoDeLaDeuda` no se dibuja porque esta pantalla
 * del manual no tiene columna para él.
 *
 * **Las cinco que se quedan fuera, con su motivo** (ADR-0010 §4: lo que el backend no publique
 * se dice, no se finge):
 *
 *   `adm_notificacion`               `NotificacionAdministrativaController` exige `numero`,
 *                                    `fecha`, `direccion` y `motivo`, y el catálogo sí dibuja
 *                                    controles para los cuatro. Lo que faltaba era el botón: la
 *                                    última acción de esta opción es «Imprimir», no «Guardar»
 *                                    (`["Nuevo","Modificar","Guardar","Anular","Imprimir"]`), y el
 *                                    renderizador genérico trata siempre la **última** como la
 *                                    primaria (FRO-03 §5), así que con el camino común pulsar
 *                                    «Imprimir» habría registrado la notificación sin decirlo.
 *                                    **#421 lo cerró sin componente propio**: la opción declara
 *                                    «Guardar» en `LA_QUE_ESCRIBE` (`pantallas/actos.ts`) y esa
 *                                    pasa al final de la barra. Conectar la escritura —declarar
 *                                    sus cuatro campos— sigue siendo trabajo del issue de este
 *                                    módulo.
 *   `adm_valores`                    Su primaria ya está en su sitio por lo mismo —declara
 *                                    «Procesar», que es la que lanza la corrida—, pero además
 *                                    `PeticionDeCorridaDeValores` exige **uno** de `papeletas`
 *                                    (una lista) o `desde`/`hasta` (un rango), que el catálogo de
 *                                    esta opción no dibuja —sus campos son «Código de criterio»,
 *                                    «Tipo de recaudo», «Oficina»…, del todo ajenos al cuerpo
 *                                    real—.
 *   `adm_resolucion_gerencia`        `ResolucionesDeGerenciaController.administrativa` exige
 *                                    `papeleta`, `fecha` y `sustento` en el cuerpo, y el catálogo
 *                                    de esta opción **no dibuja ninguna sección, ningún campo y
 *                                    ninguna acción** —solo `desc` y el bloque `reporte`—. No es
 *                                    el hueco de #73 (un campo que falta y que se puede añadir
 *                                    junto a otro que ya está): aquí no hay ni un control al que
 *                                    sustituir. La hoja se sigue dibujando —`kind: "report"` la
 *                                    renderiza igual, con sus firmas— porque `Reporte.tsx` no
 *                                    necesita datos para eso; lo que no hay es a dónde escribir.
 *   `adm_notificacion_resolucion`    Mismo hueco: `NotificarResolucionDeGerencia` exige
 *                                    `fechaDeNotificacion`, `modalidad`, `resultado` y
 *                                    `notificador`, y el catálogo tampoco declara ni una sección.
 *   `adm_reportes`                   El emisor del manual ofrece diez tipos de reporte y
 *                                    `TipoDeReporteAdministrativo` solo implementa tres —
 *                                    `PADRON_NOTIFICACIONES`, `RESUMEN_PAPELETAS` y
 *                                    `RESUMEN_RECAUDACION`—, ninguno de los tres coincide en
 *                                    literal con las diez opciones del desplegable del prototipo, y
 *                                    la última acción del catálogo es «Cancelar», no «Pantalla».
 *                                    Conectar un emisor que promete diez reportes y sirve tres
 *                                    fingiría cobertura que no tiene; `adm_padron_notificaciones` y
 *                                    `adm_resumen_recaudacion`, que sí tienen `GET` propio, quedan
 *                                    conectadas arriba de todos modos. **Y su primaria sigue
 *                                    siendo «Cancelar»**, que es el mismo cuarteto de
 *                                    `anuncios_reportes` y `licencia_padron` (#421): no se declaró
 *                                    con ellas porque su bloqueo no es el botón sino los siete
 *                                    reportes que el desplegable ofrece y el backend no tiene, y
 *                                    mover el navy a «Pantalla» aquí sería decir que sólo falta
 *                                    conectar. Se declara cuando se decida qué hace esa pantalla.
 *
 * El controlador de `adm_estado_cuenta` sirve el **mismo** `PapeletaResource` que `papeletas`
 * (`../transito`), filtrado a `Familia.ADMINISTRATIVA` y a lo todavía pendiente
 * (`CriterioDePapeleta.soloPendientes`). Su propio javadoc lo dice: «el reajuste, el interés y
 * los gastos que describe el contrato no salen de aquí: dependen de tesorería, que todavía no
 * publica su cálculo de deuda actualizada». Por eso «Interés S/» y «Gastos S/» —y con ellos
 * «Total S/», que no se compone sumando cifras que faltan (RNF-083)— salen con {@link SIN_DATO}
 * y no con un cero, que se leería como «esta papeleta no debe intereses ni gastos», y eso no es
 * lo que dice el recurso.
 */

/**
 * Una papeleta administrativa, con solo lo que `PapeletaResource` publica.
 *
 * «Concepto», «Cuota» y «Vencimiento» son las tres columnas de una papeleta que el prototipo
 * dibujó pensando en un desglose de cuotas, y el recurso real es una fila por papeleta, sin
 * descripción propia —solo su número, que esta tabla no declara como columna— ni fecha de
 * vencimiento ni fraccionamiento en cuotas. Las tres salen vacías, y no con el número de la
 * papeleta puesto donde no le corresponde.
 */
const adm_estado_cuenta = definirConexion({
  operacion: 'adm_estado_cuenta',
  parametros: ({ busqueda }) => parametrosDeBusqueda('adm_estado_cuenta', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el estado de cuenta de la papeleta administrativa'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          // Insoluto: «lo que corresponde pagar, sin beneficio» (javadoc de
          // `Papeleta#importeAPagar`) es exactamente lo que «Insoluto» nombra.
          { texto: texto(papeleta['importeAPagar']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ],
        'papeletas administrativas',
      ),
    ),
});

/**
 * El mismo cuadro de infracciones que el desplegable «Código CUIS» de `infracciones_adm` cita,
 * expuesto como catálogo propio.
 *
 * «Materia» no la publica `CodigoInfraccionResource` —el recurso no clasifica por materia, solo
 * por familia (`ADMINISTRATIVA`/`TRÁNSITO`)— y sale con {@link SIN_DATO}. «Multa S/» tampoco:
 * calcularla multiplicando `porcentajeUit` por el valor de la UIT compilaría un literal
 * tributario en el frontend (regla 5, D-02a), y ese valor todavía no está publicado.
 *
 * **Se conecta aquí, no en `../transito`.** El manual dibuja el mismo catálogo con otro filtro en
 * «Tabla de códigos de infracción de tránsito» (`codigos_transito`), y el backend lo sirve con el
 * mismo `CodigoInfraccionRepository` filtrado a otra `Familia` —pero es la opción de otro módulo,
 * fuera del alcance de este issue: se deja como está, y su propia conexión —cuando le toque—
 * reutiliza este mismo adaptador de fila en vez de escribirlo dos veces.
 */
const codigos_cuis = definirConexion({
  operacion: 'codigos_cuis',
  parametros: ({ busqueda }) => parametrosDeBusqueda('codigos_cuis', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el cuadro único de infracciones y sanciones'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(tablaDe(paginado, filaDeCodigoInfraccionCorta, 'códigos tipificados')),
});

/**
 * La relación impresa del mismo catálogo (`adm_codigos_reporte`, `GET
 * /infracciones/administrativas/codigos/reporte`, #78): mismo `CodigoInfraccionResource`, con
 * `Privilegio.IMPRESION` en vez de `LECTURA` (javadoc de `ReporteCodigosAdministrativosController`).
 *
 * «Estado» tampoco lo publica el recurso —solo `vigenciaDesde`/`vigenciaHasta`, y el filtro
 * `estado` del prototipo (VIGENTES/DEROGADOS/TODOS) no tiene parámetro correspondiente en el
 * controlador—: inventar «Vigente» comparando `vigenciaHasta` contra hoy sería una regla de
 * negocio que este adaptador no tiene por qué decidir.
 */
const adm_codigos_reporte = definirConexion({
  operacion: 'adm_codigos_reporte',
  parametros: ({ busqueda }) => parametrosDeBusqueda('adm_codigos_reporte', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la relación de códigos de infracción administrativa'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (codigo): readonly Celda[] => [
          { texto: texto(codigo['codigo']) },
          { texto: texto(codigo['descripcion']) },
          { texto: texto(codigo['baseLegal']) },
          { texto: texto(codigo['porcentajeUit']) },
          { texto: SIN_DATO },
          { texto: texto(codigo['medida']) },
          { texto: SIN_DATO },
        ],
        'códigos del cuadro único',
      ),
    ),
});

/** La fila corta de `codigos_cuis`: código, materia, descripción, % UIT, multa, medida. */
function filaDeCodigoInfraccionCorta(codigo: Readonly<Record<string, unknown>>): readonly Celda[] {
  return [
    { texto: texto(codigo['codigo']) },
    { texto: SIN_DATO },
    { texto: texto(codigo['descripcion']) },
    { texto: texto(codigo['porcentajeUit']) },
    { texto: SIN_DATO },
    { texto: texto(codigo['medida']) },
  ];
}

/**
 * Padrón de notificaciones (`adm_padron_notificaciones`, `GET
 * .../reportes/padron-notificaciones`, #78): pantalla de trabajo, se abre sin filtrar
 * (`parametrosDeBusqueda` no manda nada mientras nadie escriba un filtro) y en el orden que
 * publica el servidor (`ORDEN_POR_OMISION = "fecha"` del controlador) — no se reordena aquí.
 *
 * «Infractor» y «Fiscalizador» no los publica `NotificacionDelPadronResource` —solo `direccion` y
 * `motivo`, sin nombre del administrado ni del fiscalizador que registró la fila—; «Vence»
 * tampoco: el recurso no calcula el vencimiento en esta lista (a diferencia de
 * `NotificacionAdministrativaResource`, que sí lo publica). «Papeleta» y «Deuda S/» salen de
 * `tienePapeleta`: sin papeleta, los dos son {@link SIN_DATO} y no «—0.00», que se leería como
 * una deuda de cero.
 */
const adm_padron_notificaciones = definirConexion({
  operacion: 'adm_padron_notificaciones',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('adm_padron_notificaciones', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el padrón de notificaciones administrativas'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (fila): readonly Celda[] => {
          const tienePapeleta = fila['tienePapeleta'] === true;
          return [
            { texto: texto(fila['numero']) },
            { texto: texto(fila['fecha']) },
            { texto: SIN_DATO },
            { texto: texto(fila['motivo']) },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: tienePapeleta ? texto(fila['papeletaNumero']) : SIN_DATO },
            { texto: tienePapeleta ? texto(fila['importeDeLaPapeleta']) : SIN_DATO },
          ];
        },
        'notificaciones del padrón',
      ),
    ),
});

/**
 * Notificaciones vencidas (`adm_notificaciones_vencidas`, `GET .../reportes/vencidas`, #78):
 * **pantalla de trabajo**. Se abre sin filtrar y en el orden del servidor
 * (`NotificacionesVencidasController.ORDEN_POR_OMISION = "fecha"`, más antigua primero): no hay
 * un parámetro `orden` que el contrato declare para esta operación, así que no hay nada que pedir
 * en sentido inverso —y tampoco se reordena en el cliente (regla del issue #78).
 *
 * «Infractor» no lo publica `NotificacionAdministrativaResource` —solo `contribuyenteId`, sin
 * nombre—. «Días vencidos» tampoco: el recurso no lo cuenta, y componerlo aquí restando dos
 * fechas sería una cifra que el backend no firma (RNF-083); se deja con {@link SIN_DATO} en vez
 * de inventar una resta que después no cuadraría con la que use un reporte real.
 */
const adm_notificaciones_vencidas = definirConexion({
  operacion: 'adm_notificaciones_vencidas',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('adm_notificaciones_vencidas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las notificaciones vencidas'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (notificacion): readonly Celda[] => [
          { texto: texto(notificacion['numero']) },
          { texto: texto(notificacion['fecha']) },
          { texto: SIN_DATO },
          { texto: texto(notificacion['direccion']) },
          { texto: texto(notificacion['motivo']) },
          { texto: texto(notificacion['vencimiento']) },
          { texto: SIN_DATO },
        ],
        'notificaciones vencidas',
      ),
    ),
});

/** `2026` (año) y `08` (mes de dos cifras) de una fecha ISO `2026-08-13`, o {@link SIN_DATO}. */
function anioYMesDe(fechaIso: unknown): readonly [string, string] {
  if (typeof fechaIso !== 'string') return [SIN_DATO, SIN_DATO];
  const [anio, mes] = fechaIso.split('-');
  return anio && mes ? [anio, mes] : [SIN_DATO, SIN_DATO];
}

/**
 * Papeletas administrativas por contribuyente (`adm_notificaciones_contribuyente`, `GET
 * .../reportes/por-contribuyente`, #78): el mismo `PapeletaResource` de `infracciones_adm`, con
 * `codContribuyente` como filtro principal (javadoc de
 * `NotificacionesPorContribuyenteController`: «Notificaciones —papeletas administrativas, pese
 * al nombre del contrato— por contribuyente»).
 *
 * «Año» y «Mes» se leen de `fechaInfraccion` —dos trozos de una sola fecha que el recurso ya
 * publica, no una cifra compuesta—. «Infracción», «Recibo» y «Fec. pago» no los tiene el recurso:
 * ni descripción de la infracción ni datos de pago —eso es de tesorería, que todavía no publica
 * su historial de recibos por esta vía—.
 */
const adm_notificaciones_contribuyente = definirConexion({
  operacion: 'adm_notificaciones_contribuyente',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('adm_notificaciones_contribuyente', undefined, busqueda),
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Busca un contribuyente',
      detalle: 'Esta pantalla lista las papeletas administrativas de un contribuyente concreto.',
    },
  ],
  leer: (cuerpo) => leerPaginado(cuerpo, 'las papeletas administrativas del contribuyente'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => {
          const [anio, mes] = anioYMesDe(papeleta['fechaInfraccion']);
          return [
            { texto: anio },
            { texto: mes },
            { texto: texto(papeleta['numero']) },
            { texto: SIN_DATO },
            { texto: texto(papeleta['importeInfraccion']) },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: texto(papeleta['estado']) },
          ];
        },
        'papeletas del contribuyente',
      ),
    ),
});

/**
 * Resumen de recaudación por multas (`adm_resumen_recaudacion`, `GET
 * .../reportes/resumen-recaudacion`, #78).
 *
 * **No es un listado paginado**: `RecaudacionDeMultasResource` es un objeto suelto —desde, hasta,
 * total, abonos, fecha de corte y una lista de `Linea`— y se lee con `leerObjeto`, no con
 * `leerPaginado`.
 *
 * Cada `Linea` es (tributo, ejercicio, mes, fase, abonos, recaudado): una fila por fase, no una
 * fila por mes con las tres fases ya repartidas en columnas. Repartirlas aquí sería recomponer
 * una cifra que el backend no agrega así (RNF-083); en vez de eso, cada línea se dibuja en su
 * propia fila con **su** columna de fase rellena y las otras dos en {@link SIN_DATO} — «Total S/»
 * es el `recaudado` de esa línea, no una suma de las tres.
 */
const adm_resumen_recaudacion = definirConexion({
  operacion: 'adm_resumen_recaudacion',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('adm_resumen_recaudacion', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el resumen de recaudación por multas administrativas'),
  adaptar: (resumen): DatosDePantalla => {
    const lineas = Array.isArray(resumen['lineas']) ? resumen['lineas'].filter(esObjeto) : [];
    const actualizadoA = resumen['actualizadoA'];
    const fechaCalculo: Fecha =
      typeof actualizadoA === 'string' && actualizadoA !== ''
        ? (actualizadoA as Fecha)
        : (new Date().toISOString().slice(0, 10) as Fecha);
    return {
      fechaCalculo,
      tabla: {
        filas: lineas.map((linea): readonly Celda[] => {
          const fase = texto(linea['fase']);
          return [
            { texto: texto(linea['mes']) },
            { texto: texto(linea['abonos']) },
            { texto: fase === 'ORDINARIA' ? texto(linea['recaudado']) : SIN_DATO },
            { texto: fase === 'COACTIVA' ? texto(linea['recaudado']) : SIN_DATO },
            { texto: fase === 'CONVENIO' ? texto(linea['recaudado']) : SIN_DATO },
            { texto: texto(linea['recaudado']) },
          ];
        }),
        conteo: `${lineas.length} línea(s) de recaudación`,
      },
    };
  },
});

/**
 * «Todos» del desplegable **no viaja** (#397).
 *
 * Es la primera opción del filtro «Estado» y significa «sin filtrar por fase»; mandarla tal cual
 * sería un 422 del backend, que solo admite las cinco palabras del manual —y con razón: un
 * `estado=Todos` que el servidor tolerase sería un filtro que a veces filtra y a veces no—.
 * Mismo mecanismo, y mismo motivo, que `faseDe` en `../consultas/index.ts`: lo que no se
 * reconoce no se manda, y no mandarlo trae todas las fases, que es lo que «Todos» significa.
 *
 * No se traduce ninguna palabra, a diferencia de aquella: aquí el desplegable del prototipo y el
 * `enum FaseDelProcedimiento` dicen exactamente lo mismo, porque el enum se escribió desde el
 * manual (RNF-080).
 */
const TODOS = 'Todos';

/**
 * Infracción administrativa: la grilla «Procedimientos sancionadores» (#397, RF-071).
 *
 * **Las ocho columnas se llenan las ocho**, que es el motivo por el que esta opción no lee
 * `PapeletaResource` sino `ProcedimientoSancionadorResource`: cuatro de ellas —«Administrado»,
 * «CUIS», «Infracción» y «Medida complementaria»— salen de cruzar `contribuyente` y
 * `codigo_infraccion`, y ninguna es columna de `papeleta`.
 *
 * «Estado» dibuja `fase`, **no** `estadoDeLaDeuda`: la fase es lo que el filtro de arriba promete
 * y lo que el subtítulo de la pantalla describe —«notificación preventiva, acta de constatación y
 * resolución de infracción y sanción»—. El recurso publica los dos con nombres distintos
 * precisamente para que esta línea sea una elección visible y no un descuido.
 *
 * Una fila sin fase sale con {@link SIN_DATO}: un acta anulada o prescrita es un procedimiento que
 * terminó sin que ninguna de las cinco palabras del manual lo nombre, y el backend manda `null`
 * antes que la más parecida.
 *
 * **Lo que sigue abierto, y no lo abre este issue**: el filtro «Administrado» del manual es un
 * campo de texto libre y el backend lo lee como el **documento** del administrado —DNI o RUC—,
 * igual que las otras lecturas de papeletas administrativas desde #47. Quien teclee un nombre no
 * encuentra nada. No se cambia aquí porque cambiarlo es cambiar el criterio del controlador para
 * las tres lecturas que lo comparten, y eso es otro issue; queda dicho para que no se descubra
 * en ventanilla.
 */
const infracciones_adm = definirConexion({
  operacion: 'infracciones_adm',
  parametros: ({ busqueda }) => {
    const parametros = parametrosDeBusqueda('infracciones_adm', undefined, busqueda);
    if (parametros['estado'] !== TODOS) return parametros;
    const { estado: _todos, ...resto } = parametros;
    return resto;
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'los procedimientos sancionadores'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (fila): readonly Celda[] => [
          { texto: texto(fila['numeroActa']) },
          { texto: texto(fila['administrado']) },
          { texto: texto(fila['codigoCuis']) },
          { texto: texto(fila['descripcionInfraccion']) },
          { texto: texto(fila['porcentajeInfraccion']) },
          { texto: texto(fila['importeAPagar']) },
          { texto: texto(fila['medidaComplementaria']) },
          { texto: texto(fila['fase']) },
        ],
        'procedimientos sancionadores',
      ),
    ),
});

/** Las opciones de Infracciones administrativas conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_SANCIONES: Readonly<Record<string, Conexion>> = {
  adm_estado_cuenta,
  infracciones_adm,
  codigos_cuis,
  adm_codigos_reporte,
  adm_padron_notificaciones,
  adm_notificaciones_vencidas,
  adm_notificaciones_contribuyente,
  adm_resumen_recaudacion,
};
