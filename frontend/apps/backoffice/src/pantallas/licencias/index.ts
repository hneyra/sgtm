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
 * Autorizaciones y licencias, conectado hasta donde llega el backend con seguridad: **siete
 * lecturas de once** (#79).
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
 *    superficie que conectar.** El prototipo las capturo como la vista previa de una resolucion
 *    —un bloque `reporte` con columnas «Concepto»/«Detalle»—, y ninguna de las dos declara
 *    `secciones` ni `acciones`. Sin `acciones`, `Pantalla.tsx` ni siquiera dibuja
 *    `<BarraDeAcciones>` (`{estructura.acciones && <BarraDeAcciones .../>}`), asi que no hay
 *    caja de observacion, no hay boton primario y no hay franja donde contar un impedimento: el
 *    mecanismo que #74 uso para `anulacion_recibo` —abrir por el numero de la ruta, con su propia
 *    seccion de campos y su propio boton— no tiene equivalente aqui porque el prototipo no dibujo
 *    ese equivalente. `LicenciaController.cancelacion`/`.duplicado` exigen ademas `motivo` (y
 *    `duplicado` tambien `nDeRecibo`) sin que ninguna pantalla del manual tenga donde escribirlos
 *    —el mismo hueco que cerro `ACTOS_SIN_CAMPO` en #73—, pero aqui no hay ni siquiera un control
 *    existente que sustituir (`ResolutorDeTransferencia` anadio su campo **junto** a uno que ya
 *    dibujaba la pestaña; aqui no hay pestaña). Conectar cualquiera de las dos exigiria inventar
 *    una pantalla entera que el prototipo nunca capturo, que es justo lo que «Ningun componente
 *    del design system antes de la pantalla que lo use» prohibe.
 * 2. **`anuncios_reportes` y `licencia_padron` tienen conductor pero apuntan al boton
 *    equivocado.** Las dos declaran el mismo cuarteto de acciones —«Exportar», «Imprimir»,
 *    «Pantalla», «Cancelar»—, y FRO-03 §5 fija la primaria en **la ultima**: aqui es «Cancelar»,
 *    que en el dialogo de reporte del prototipo significa «cerrar sin generar nada», no «guardar».
 *    Declarar la escritura tal cual dejaria un boton que dice «Cancelar» disparando de verdad el
 *    `POST` que emite el padron —la misma clase de defecto que #76 encontro en seis de los ocho
 *    actos de coactiva, con la diferencia de que alli la salida fue documentarlo y aqui, con solo
 *    filtros de busqueda detras (`PeticionDeReporteDeAnuncios`, `PeticionDeReporteDeLicencias`:
 *    contribuyente, direccion, fechas — nada que `ACTOS_SIN_CAMPO` tenga que nombrar), la unica
 *    forma honesta de arreglarlo es un componente propio que sustituya el rotulo de la primaria
 *    por uno que diga lo que hace, como ya hizo `GeneracionMasivaDeValores` con «Generar valores»
 *    (#75). Es trabajo de otro issue: **once opciones, siete conectadas** es lo que #79 pide, y
 *    forzar una quinta y sexta conexion inventando una pantalla no declarada es exactamente el
 *    atajo que ADR-0010 §4 cierra.
 *
 * **`certificados` conecta su lectura y se queda sin escritura**, y aqui el bloqueo tiene dos
 * capas en vez de una. `CertificadoController.emitir` exige `nDeRecibo` —el recibo que respalda
 * el derecho de tramite— y ninguna seccion de esta pantalla dibuja un campo para el: la unica,
 * «Datos del certificado», tiene `tipoDeCertificado`, `codigoPredial`, `solicitante` y
 * `nDeExpediente` de texto, y las cinco restantes (`zonificacion`, `alturaMaximaPermitida`,
 * `areaLibreMinima`, `retiroMunicipal`, `coeficienteDeEdificacion`) son `"ro"`, que `Campo.tsx`
 * bloquea siempre —el mismo hueco que cerro `ACTOS_SIN_CAMPO` para `caja_tributaria` en #74—.
 * Pero declararlo ahi no serviria: la primaria de esta pantalla es «Imprimir certificado»
 * (`acciones: ["Emitir", "Imprimir certificado"]`), y `DE_SALIDA` de `pantallas/actos.ts` la
 * reconoce como salida —empieza por «imprimir»— **antes** de llegar a `ACTOS_SIN_CAMPO`, asi que
 * `impedimentoDelActo` devuelve `undefined` sin mirar la lista. El resultado es seguro —sin
 * escritura declarada el boton se queda `disabled`, y un `disabled` no dispara nada— pero mudo:
 * no hay franja que explique por que. Es la misma clase de defecto que el punto 2, con una
 * variante: alli el boton equivocado se podia pulsar y mandaba un `POST`; aqui ni siquiera eso,
 * porque no hay escritura declarada. Corregirlo de verdad pide lo mismo que el punto 2: un
 * componente propio que sustituya la etiqueta de la primaria por una que diga lo que hace.
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
