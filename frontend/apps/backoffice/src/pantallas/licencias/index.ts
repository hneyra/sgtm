import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import { importeDe } from '@sgtm/lectura';
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
  tablaDeLista,
  texto,
} from '../seguridad/listado';

/**
 * Autorizaciones y licencias, conectado: **siete lecturas de once por el camino comun** (#79),
 * **dos padrones por la tercera puerta** y **una escritura** (#427). Sin conectar quedan las dos
 * hojas de resolucion, y eso ya esta decidido (FRO-06).
 *
 * `anuncios`, `licencia_funcionamiento`, `licencia_resumen_anual`, `fue_edificacion`,
 * `edificacion_reporte` y `ciiu` tienen `Controller` en `sgtm-licencias` y se conectan aqui, con
 * el patron de siempre: `leer` abre el sobre del contrato, `adaptar` traduce el recurso del
 * dominio a lo que dibuja el renderizador. La septima, `certificados`, tambien: su lectura vive
 * en `certificados_listado` (`GET /licencias/certificados`) —una operacion **distinta** de la que
 * el catalogo publica para esta opcion (`POST /licencias/certificados`, que consume un
 * correlativo y no puede servir la grilla al abrirse)—, exactamente el reparto que ya usan
 * `emitir_licencia` frente a `licencia_funcionamiento` y los cuatro actos de `anuncio` frente a
 * `anuncios`: `definirConexion` desacopla el id de la opcion del id de la operacion, y aqui se
 * usa para eso.
 *
 * **Ninguna cifra se compone** (RNF-083): lo que un recurso no publica por fila —una columna que
 * el prototipo dibuja y el `Resource` no trae— sale con {@link SIN_DATO}, nunca con un cero ni
 * con un valor calculado aqui.
 *
 * **Las cuatro escrituras se quedan sin conectar, y no por descuido.** Dos bloqueos distintos, y
 * ninguno de los dos es el que ya documentaron `coactiva/index.ts` (#76) o `rentas/index.ts`
 * (#73), aunque se les parecen:
 *
 * 1. **`licencia_resolucion_cancelacion` y `licencia_resolucion_duplicado` no tienen ninguna
 *    superficie que conectar, y eso ya esta decidido** (FRO-06, #427). El prototipo las capturo
 *    como la vista previa de una resolucion —un bloque `reporte` con columnas
 *    «Concepto»/«Detalle»—, y ninguna de las dos declara `secciones` ni `acciones`. Sin
 *    `acciones`, `Pantalla.tsx` ni siquiera dibuja `<BarraDeAcciones>`
 *    (`{estructura.acciones && <BarraDeAcciones .../>}`), asi que no hay caja de observacion, no
 *    hay boton primario y no hay franja donde contar un impedimento: el mecanismo que #74 uso
 *    para `anulacion_recibo` —abrir por el numero de la ruta, con su propia seccion de campos y
 *    su propio boton— no tiene equivalente aqui porque **el prototipo si dibujo el de
 *    `anulacion_recibo`** y no dibujo este. `LicenciaController.cancelacion`/`.duplicado` exigen
 *    ademas `motivo` (y `duplicado` tambien `nDeRecibo`, el del derecho de tramite **del
 *    duplicado**) sin que ninguna pantalla del manual tenga donde escribirlos.
 *
 *    **La decision, y lo que se hizo con ella.** Se cotejaron las dos salidas que #427 nombra
 *    contra el catalogo y contra el controlador, y ninguna esta disponible hoy: `licencia_funcionamiento`
 *    —la pantalla que conoce el `{id}` y que hasta trae una accion «Duplicar»— **no dibuja ningun
 *    motivo**, su «Observaciones» es la trazabilidad del tramite y su «Nº de recibo» es el del
 *    derecho de la licencia; y ademas el permiso del acto es el de **esta** opcion
 *    (`@RequiereAcceso(acceso = "licencia_resolucion_cancelacion")`), no el de aquella. El
 *    analisis completo, con las tres alternativas descartadas, esta en FRO-06.
 *
 *    Lo que si cambia: las dos entran en `ACTOS_SIN_CAMPO` —su causa era `sin-declaracion`, que
 *    pedia declarar campos que no existen— y **lo dicen en la pantalla** con su aviso permanente
 *    (`AVISOS` de `prosa-textos.ts`), que es el unico bloque que se dibuja sin acciones. Antes la
 *    hoja salia muda: la causa se calculaba, entraba en el censo y no la leia nadie (RNF-082).
 * 2. **`anuncios_reportes` y `licencia_padron` ya emiten, por la tercera puerta** (#427).
 *    Las dos declaran el mismo cuarteto de acciones —«Exportar», «Imprimir», «Pantalla»,
 *    «Cancelar»—, y FRO-03 §5 fija la primaria en **la ultima**: era «Cancelar», que en el
 *    dialogo de reporte del prototipo significa «cerrar sin generar nada», no «guardar». #421
 *    declaro cual de las que ya hay es el acto (`LA_QUE_ESCRIBE` = «Pantalla»: la operacion que el
 *    catalogo da a estas dos opciones es el `POST` **sin** `formato`, que devuelve el padron para
 *    dibujarlo, mientras que «Exportar» e «Imprimir» son el mismo `POST` con `?formato=`), y #427
 *    conecta lo que faltaba: son **lecturas por `POST`** (`lecturas-por-post.ts`, #424), no
 *    escrituras —`ConsultaDeAnuncios.padron` y `ConsultaDeLicencias.padron` no guardan nada, asi
 *    que pedir observacion seria mentir sobre lo que hacen (regla 10)—, y su respuesta publica sus
 *    filas bajo `filas`, no bajo `contenido`: leidas por el camino comun la tabla saldria vacia y
 *    en silencio (#363). Viven en `EmisorDePadron.tsx`, con la barra de una sola accion.
 *
 *    **Y ahi esta lo que este issue tuvo que decidir.** Los nombres de los ocho criterios de
 *    «Filtrado por» mapean 1:1 contra `PeticionDeReporteDeLicencias`, pero **los valores no**:
 *    `licencia_padron.estado` ofrece ACTIVA / CANCELADA / DUPLICADA / VENCIDA / TODAS y
 *    `EstadoDeLicencia` (V37) solo declara VIGENTE, VENCIDA y CANCELADA; `licencia_padron.tipoLic`
 *    ofrece (TODOS) / INDETERMINADA / TEMPORAL / CESIONARIO / MERCADO y `TipoDeLicencia` solo
 *    DEFINITIVA, TEMPORAL y CESIONARIA. Son **cinco de diez** que
 *    `LicenciaController.estadoOpcional`/`.tipoOpcional` rechazan con 422 despues de rellenar el
 *    formulario, y es el mismo cruce de vocabularios que dejo `infracciones_adm` sin conectar en
 *    #78 hasta que #397 lo resolvio en el backend.
 *
 *    **Aqui no se traduce ninguno**: «ACTIVA» se parece a VIGENTE e «INDETERMINADA» a DEFINITIVA,
 *    y parecerse no es serlo —una licencia «activa» podria querer decir «no cancelada», que
 *    incluye a las vencidas—; una equivalencia decidida en la interfaz cambiaria en silencio lo
 *    que se pregunta, que es peor que no poder preguntarlo. El desplegable ofrece **solo los
 *    valores que el enumerado tiene letra por letra**, la lista se computa del catalogo y la ayuda
 *    nombra los cinco que quedan fuera. Cerrar el hueco es de quien decida el vocabulario:
 *    o el backend admite los rotulos del manual, o el prototipo escribe los del dominio.
 *
 *    Lo mismo, en su otra forma, en `anuncios_reportes`: «Estado» y «Nº anuncio — serie/numero»
 *    **no tienen destino** —`PeticionDeReporteDeAnuncios` no publica ninguno de los tres, y el
 *    controlador pasa `null` por los dos huecos de `CriterioDeAnuncios`—, asi que se dibujan
 *    bloqueados con su motivo, como el «Estado» del emisor de transito. Y **los siete campos de
 *    agrupacion, subagrupacion y orden de `licencia_padron` no se dibujan**: el controlador
 *    construye `new ParametrosDePaginacion(pagina, tamano, null, null)` con `ORDEN_POR_OMISION`
 *    fijo, asi que no hay nada que elegir; el aviso de la pantalla lo dice.
 *
 *    Lo que queda pendiente, y es del backend: `claseAnuncio` (LETRERO, PANEL, TOLDO…) y
 *    `nombreDelContribuyente` **si** viajan en las dos peticiones y ninguna seccion del catalogo
 *    dibuja un campo para ellos —inventarlo seria inventar un desplegable (ADR-0010 §4)—; y
 *    «Exportar»/«Imprimir» necesitan una sexta forma que no existe: `LicenciaController` publica
 *    `padronComoDocumento` con `params="formato"`, `AnuncioController` no publica ninguna, el
 *    contrato no declara `formato` para ninguna de las dos, y `descargarOperacion` rechaza todo lo
 *    que no sea `GET` (`operaciones.ts`).
 * 3. **`certificados` emite desde #427**, y necesitaba las **tres** declaraciones de esta onda a
 *    la vez. `CertificadoController.emitir` exige `tipoDeCertificado`, `codigoPredial`,
 *    `solicitante`, `nDeRecibo` y la observacion (regla 10):
 *
 *    - `LA_QUE_ESCRIBE` (#421): la ultima accion del catalogo es «Imprimir certificado», que
 *      `DE_SALIDA` reconoce como salida **antes** de llegar a `ACTOS_SIN_CAMPO`; la que emite es
 *      «Emitir». Con la escritura declarada eso deja de ser cosmetico: sin la declaracion, quien
 *      dispararia el `POST` —consumiendo un correlativo y cobrando un derecho— seria un boton que
 *      dice «Imprimir certificado».
 *    - `ComposicionDeOpcion.controles` (#422): el `nDeRecibo` del derecho de tramite, que ninguna
 *      seccion dibuja. Con su propia etiqueta, nunca la de otro campo (RNF-080).
 *    - `ComposicionDeOpcion.resolutores` (#422): **`solicitante` es la misma clave para dos cosas
 *      distintas**. `CertificadoResource.solicitante` es el NOMBRE —lo que la grilla ya pinta— y
 *      `PeticionDeCertificado.solicitante` es el CODIGO, que `EmitirCertificado` resuelve con
 *      `contribuyentes.porCodigo(...)`; el prototipo teclea ahi un nombre. Declararlo tal cual
 *      compila, pasa la lista blanca y pasa el lint, y lo que llega a ventanilla es un **404 sobre
 *      una persona que si esta en el padron**. Lo cierra `ResolutorDelSolicitante`, contra
 *      `GET /rentas/contribuyentes`, que publica `codigo` y filtra por `nombreRazonSocial`.
 *
 *    **Y lo que se decidio no hacer**: los cinco parametros urbanisticos son `"ro"` en el catalogo
 *    y `Campo.tsx` los bloquea siempre, mientras el backend espera que los teclee quien atiende
 *    —«lo que el operador transcribio del plano de zonificacion ese dia»—. Abrirlos seria volver
 *    editable lo que el manual dibuja de solo lectura (RNF-080) sin que nadie lo haya decidido;
 *    emitir igual produciria un papel que dice «Este certificado no consigna parametros
 *    urbanisticos» con su correlativo gastado, su derecho cobrado y su SHA-256 sellado —y un
 *    certificado no se corrige: V51 no admite `UPDATE`—. Asi que la pantalla emite **numeracion y
 *    jurisdiccion**, que `ParametrosUrbanisticos` dice que no los llevan, y de los otros dos
 *    tipos **dice por que no**: ver `faltaEnElCertificado` en `escrituras.ts`.
 */

/** `EstadoDeLicencia` (V37): VIGENTE, VENCIDA, CANCELADA — el mismo tono que ya usan `estados.ts`. */
const TONO_DEL_ESTADO_DE_LICENCIA: Readonly<Record<string, TonoDeCelda>> = {
  VIGENTE: 'ok',
  VENCIDA: 'warn',
  CANCELADA: 'bad',
};

/** `EstadoDelAnuncio` (V45): VIGENTE, VENCIDO, CESADO, RETIRADO. */
const TONO_DEL_ESTADO_DE_ANUNCIO: Readonly<Record<string, TonoDeCelda>> = {
  VIGENTE: 'ok',
  VENCIDO: 'warn',
  CESADO: 'bad',
  RETIRADO: 'bad',
};

/** `EstadoDelFue` (V43): EN_TRAMITE, VIGENTE, VENCIDA, ANULADA. */
const TONO_DEL_ESTADO_DEL_FUE: Readonly<Record<string, TonoDeCelda>> = {
  EN_TRAMITE: 'warn',
  VIGENTE: 'ok',
  VENCIDA: 'warn',
  ANULADA: 'bad',
};

function celdaConTono(cruda: unknown, tonos: Readonly<Record<string, TonoDeCelda>>): Celda {
  const valor = texto(cruda);
  return valor === SIN_DATO ? { texto: valor } : { texto: valor, tono: tonos[valor] };
}

/** El importe de un `ImporteActualizado`, o `SIN_DATO` cuando el campo llega nulo. */
function importeS(cruda: unknown): string {
  return importeDe(cruda)?.importe ?? SIN_DATO;
}

/** La fecha de la primera fila (`estadoALaFecha`), o hoy si no hay ninguna. */
function fechaDeLaPrimera(contenido: readonly unknown[]): string {
  const [primera] = contenido;
  if (!esObjeto(primera)) return hoy();
  const fecha = texto(primera['estadoALaFecha']);
  return fecha === SIN_DATO ? hoy() : fecha;
}

/**
 * Anuncio y propaganda (`AnuncioResource`, #51, RF-114).
 *
 * **«D.N.I.» lleva el unico documento que publica el recurso** —`documentoDelTitular`, sin
 * distinguir si es DNI o RUC— **y «R.U.C.» sale con `SIN_DATO`**: partir un campo en dos por su
 * longitud seria una cifra compuesta que el backend no dijo (RNF-083).
 */
const anuncios = definirConexion({
  operacion: 'anuncios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('anuncios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las autorizaciones de anuncio y propaganda'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (anuncio): readonly Celda[] => [
        celdaConTono(anuncio['estado'], TONO_DEL_ESTADO_DE_ANUNCIO),
        { texto: texto(anuncio['nroAutorizacion']) },
        { texto: texto(anuncio['nroDeExpediente']) },
        { texto: texto(anuncio['contribuyente']) },
        { texto: texto(anuncio['documentoDelTitular']) },
        { texto: SIN_DATO },
        { texto: texto(anuncio['direccion']) },
        { texto: importeS(anuncio['tasaDevengada']) },
      ],
      'autorizaciones',
    ),
  }),
});

/** Licencia de funcionamiento (`LicenciaResource`, #44, RF-110). */
const licencia_funcionamiento = definirConexion({
  operacion: 'licencia_funcionamiento',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('licencia_funcionamiento', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las licencias de funcionamiento'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (licencia): readonly Celda[] => [
        celdaConTono(licencia['estado'], TONO_DEL_ESTADO_DE_LICENCIA),
        { texto: texto(licencia['nroLicencia']) },
        { texto: texto(licencia['contribuyente']) },
        { texto: texto(licencia['nExpediente']) },
        { texto: texto(licencia['denominacionComercial']) },
        { texto: texto(licencia['direccion']) },
      ],
      'licencias',
    ),
  }),
});

/**
 * Resumen de licencias por año (`ResumenAnualResource`, #54, RF-115).
 *
 * No es un sobre paginado: `{ aLaFecha, filas }`, un año por fila. Se abre con `leerObjeto`, como
 * `proceso_coactivo`, y no con `leerPaginado`.
 */
const licencia_resumen_anual = definirConexion({
  operacion: 'licencia_resumen_anual',
  parametros: ({ busqueda }) => parametrosDeBusqueda('licencia_resumen_anual', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el resumen de licencias por año'),
  adaptar: (resumen): DatosDePantalla => {
    const filas = Array.isArray(resumen['filas']) ? resumen['filas'].filter(esObjeto) : [];
    return {
      fechaCalculo: texto(resumen['aLaFecha']) === SIN_DATO ? hoy() : texto(resumen['aLaFecha']),
      tabla: tablaDeLista(
        filas,
        (fila): readonly Celda[] => [
          { texto: texto(fila['ano']) },
          { texto: texto(fila['emitidas']) },
          { texto: texto(fila['canceladas']) },
          { texto: texto(fila['duplicados']) },
          { texto: texto(fila['vigentesAlCierre']) },
          { texto: importeS(fila['derechoDeTramiteS']) },
        ],
        'años',
      ),
    };
  },
});

/** El formulario único de edificación (`FueResource`, #48, RF-113): la grilla, sin su ficha. */
const fue_edificacion = definirConexion({
  operacion: 'fue_edificacion',
  parametros: ({ busqueda }) => parametrosDeBusqueda('fue_edificacion', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los expedientes del FUE'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (fue): readonly Celda[] => [
        { texto: texto(fue['nroExpediente']) },
        { texto: texto(fue['contribuyente']) },
        { texto: texto(fue['nombreContribuyente']) },
        { texto: texto(fue['tipoTramite']) },
        { texto: texto(fue['nroLicencia']) },
        { texto: texto(fue['modalidad']) },
      ],
      'expedientes',
    ),
  }),
});

/** Reporte general de licencias de edificación (`ReporteDeEdificacionResource`, #48, RF-115). */
const edificacion_reporte = definirConexion({
  operacion: 'edificacion_reporte',
  parametros: ({ busqueda }) => parametrosDeBusqueda('edificacion_reporte', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el reporte general de edificación'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (fila): readonly Celda[] => [
        { texto: texto(fila['nLicencia']) },
        { texto: texto(fila['expediente']) },
        { texto: texto(fila['fecha']) },
        { texto: texto(fila['administrado']) },
        { texto: texto(fila['predio']) },
        { texto: texto(fila['modalidad']) },
        { texto: texto(fila['areaAConstruirM']) },
        { texto: importeS(fila['valorDeObraS']) },
        celdaConTono(fila['estado'], TONO_DEL_ESTADO_DEL_FUE),
      ],
      'licencias de edificación',
    ),
  }),
});

/**
 * Catálogo CIIU de giros (`CiiuResource`, #44, RF-112).
 *
 * **Es un buscador, no un desplegable** (#79): el catálogo tiene cientos de giros —el prototipo
 * lo dice él mismo, «6 de 1,842»— y `CiiuController.listar` publica `descripcion` como filtro de
 * texto libre contra el servidor (`filtros` del catálogo ya lo declara: «Descripción», `t: "text"`).
 * No hay ningún desplegable que precargar aquí: la búsqueda por nombre de giro ya es la que el
 * catálogo dibuja, y este archivo no le añade ninguna lista propia.
 */
const ciiu = definirConexion({
  operacion: 'ciiu',
  parametros: ({ busqueda }) => parametrosDeBusqueda('ciiu', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el catálogo CIIU'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (giro): readonly Celda[] => [
        { texto: texto(giro['codigo']) },
        { texto: texto(giro['descripcion']) },
        { texto: texto(giro['seccion']) },
        { texto: texto(giro['riesgoItse']) },
        { texto: texto(giro['zonificacionCompatible']) },
        { texto: giro['requiereSectorial'] === true ? 'Sí' : 'No' },
      ],
      'giros',
    ),
  }),
});

/**
 * Certificados de numeración y zonificación (`CertificadoResource`, #54, RF-115).
 *
 * Lee `certificados_listado` (`GET /licencias/certificados`), no `certificados`
 * (`POST /licencias/certificados`, que emite y consume un correlativo): ver el javadoc de arriba.
 */
const certificados = definirConexion({
  operacion: 'certificados_listado',
  parametros: ({ busqueda }) => parametrosDeBusqueda('certificados_listado', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los certificados emitidos'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (certificado): readonly Celda[] => [
        { texto: texto(certificado['nCertificado']) },
        { texto: texto(certificado['tipoEtiqueta']) },
        { texto: texto(certificado['predio']) },
        { texto: texto(certificado['solicitante']) },
        { texto: texto(certificado['fecha']) },
        { texto: importeS(certificado['derechoS']) },
        { texto: texto(certificado['estado']) },
      ],
      'certificados',
    ),
  }),
});

export const CONEXIONES_DE_LICENCIAS: Readonly<Record<string, Conexion>> = {
  anuncios,
  licencia_funcionamiento,
  licencia_resumen_anual,
  fue_edificacion,
  edificacion_reporte,
  ciiu,
  certificados,
};
