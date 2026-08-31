import { Suspense, lazy, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Aviso, Boton, Esqueleto, FechaDeCalculo } from '@sgtm/design-system';
import { descriptorDe, escribe } from '@sgtm/api-client';
import type { ValorDeCampo } from '@sgtm/api-client';
import {
  esHojaDelCentro,
  opcionPorRuta,
  pantallasDelModulo,
  seccionesApiladas,
  seccionesDe,
} from '../catalogo';
import type { EstructuraDePantalla } from '../catalogo';
import { CentroDeReportes } from './CentroDeReportes';
import {
  NUEVO,
  PAGINA,
  conCambio,
  conOrden,
  leerBusqueda,
  operacionDe,
  parametrosDeBusqueda,
  registroQueFalta,
} from './busqueda';
import { NO_DISPONIBLE, SIN_PERMISO, estadoDePantalla, textoDeError } from './estados';
import { useCatalogoVisible } from '../app/sesion/useCatalogoVisible';
import { useEscritura } from './escritura';
import { useFocoEnLaAccion, useFocoTrasGuardar } from './foco';
import { avisoDe, cargarProsa, notaDe } from './prosa';
import { escrituraDe } from './escrituras';
import { accionesDeLaBarra, impedimentoDelActo } from './actos';
import { useEjercicio } from '../app/ejercicio';
import { conexionDe } from './conexiones';
import type { Conexion } from './conexiones';
import { cargarAporteDelModulo } from './aportes-de-modulo';
import { composicionDe, filtrosDe, hayQueResumir } from './composicion';
import { useSimulacion } from './useSimulacion';
import type { ComposicionDeOpcion } from './composicion';
import { PanelDeAlta } from './bloques/PanelDeAlta';
import type { AltaAbierta } from './bloques/PanelDeAlta';
import { useDatosDeOperacion } from './useDatosDeOperacion';
import { useDatosDePantalla } from './useDatosDePantalla';
import { BarraDeAcciones } from './bloques/BarraDeAcciones';
import { Filtros } from './bloques/Filtros';
import { HojasDeSuperficie } from './bloques/HojasDeSuperficie';
import { Formulario } from './bloques/Formulario';
import { useDescargaDeArchivo } from './useDescargaDeArchivo';
import type { DescargaDeArchivo } from './useDescargaDeArchivo';
import { TablaDePantalla } from './bloques/TablaDePantalla';
import { Totales } from './bloques/Totales';

/**
 * **El renderizador.** Una sola pantalla para las 134 del manual.
 *
 * FRO-03 §2 lo dice sin rodeos: no se escriben 134 pantallas a mano. El
 * prototipo las declara como datos y este componente compone, en el orden que
 * fija FRO-03 §5, los bloques que cada descriptor declare.
 *
 * La division del trabajo, que es lo unico que hay que entender de este
 * archivo:
 *
 * - **el catalogo** dice que bloques hay y como son (que campos, que columnas);
 * - **la API** dice que dicen (que valores, que filas, que totales).
 *
 * Por eso la pantalla se dibuja entera antes de que llegue la respuesta —el
 * esqueleto ocupa el sitio exacto de cada dato— y por eso conectar el backend
 * no es reescribir nada: es apagar el proxy.
 */
export function Pantalla() {
  const { moduloId = '', ranura = '' } = useParams();
  const opcion = opcionPorRuta(moduloId, ranura);
  const catalogo = useCatalogoVisible();

  // Entrar por la URL a una opcion ajena no puede filtrar **ni el titulo ni los
  // campos** de lo que hay detras: no se dibuja la estructura, y punto. El
  // servidor responde 403 de todos modos —esto es comodidad, no seguridad—.
  if (opcion && !catalogo.puedeVer(opcion.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (!opcion) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  // La estructura de un modulo llega en su propio trozo: entrar en Catastro no
  // descarga Transito.
  const pantalla = <PantallaDelModulo key={opcion.id} moduloId={moduloId} opcion={opcion.id} />;

  // Una hoja de un modulo que pliega sus reportes se dibuja **igual**, dentro
  // del centro (ADR-0014 §5). El centro es navegacion compuesta alrededor: no
  // cambia como se dibuja la hoja ni de quien depende su permiso.
  const modulo = catalogo.modulos.find((m) => m.id === moduloId);
  if (modulo !== undefined && esHojaDelCentro(modulo, opcion)) {
    return (
      <CentroDeReportes modulo={modulo} activa={opcion.id}>
        {pantalla}
      </CentroDeReportes>
    );
  }

  return pantalla;
}

function PantallaDelModulo({
  moduloId,
  opcion,
}: {
  readonly moduloId: string;
  readonly opcion: string;
}) {
  /* El trozo del modulo se pide como cualquier otra cosa que tarda, y se queda:
     `staleTime` infinito porque el catalogo no cambia mientras la pestana este
     abierta —cambia cuando cambia la aplicacion, y entonces cambia su hash—. */
  const catalogo = useQuery({
    queryKey: ['catalogo', moduloId],
    /* Con el trozo del modulo viaja **la prosa fija de las pantallas** —el aviso
       permanente y la nota de la escritura—, que es prosa que 127 de las 134 no
       usan y estaba en el arranque. Aqui no cuesta nada: esta consulta ya
       bloquea el dibujo, asi que la advertencia sigue estando cuando la pantalla
       aparece. Diferirla a un `Suspense` propio la haria llegar tarde, y una
       advertencia que llega tarde es peor que no tenerla (`prosa.ts`).

       **Y con el, desde #433, lo que el modulo aporta al renderizador**: sus
       conexiones y su composicion. Van en el mismo `Promise.all` a proposito
       —tres descargas en paralelo, no una detras de otra— y antes de que este
       `queryFn` resuelva, que es lo que deja a `conexionDe` y a `composicionDe`
       respondiendo sincronos mas abajo. Si el trozo no llegara, esta consulta
       falla: nadie dibuja una pantalla conectada por el camino comun, que es
       como se ve una tabla vacia sin ningun error (#363). */
    queryFn: async () => {
      const [pantallas] = await Promise.all([
        pantallasDelModulo(moduloId),
        cargarAporteDelModulo(moduloId),
        cargarProsa(),
      ]);
      return pantallas;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const estructura = catalogo.data?.[opcion];

  // Mientras llega el trozo, el esqueleto: es lo que se veria de todos modos
  // hasta que respondiera la API.
  if (catalogo.isPending) return <Esqueleto alto={220} />;

  if (!estructura) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  return <Contenido estructura={estructura} />;
}

type Estructura = EstructuraDePantalla;

/**
 * El ancla de la tabla, para el indice de secciones.
 *
 * No lleva la pestana dentro, a diferencia de las secciones: la tabla es una
 * sola por pantalla y se dibuja fuera de las pestañas.
 */
const ANCLA_DE_LA_TABLA = 'sgtm-tabla-de-la-pantalla';

/**
 * Las pantallas propias, cargadas con quien las abre y no en el arranque
 * (#379; mismo patron que `rentas/composicion.ts`).
 *
 * Las de catastro —`FichaDelPredio` con `TablaDePisos` y `ResumenDeFicha`, que
 * sirve las cuatro fichas y su actualizacion, y `CuadroDeValuacion` con
 * `useTablaDeValuacion`, que sirve las tres hojas del cuadro—, las cuatro
 * de `Valores` (RF-093 a RF-096, #75): `GeneracionIndividualDeValores`,
 * `GeneracionMasivaDeValores`, `PrescripcionDeLaDeuda` y `PaseACoactiva`, las
 * dos de Transito (#77) y `Territorio`, que es la superficie unica de
 * `sectores` y `calles`. Ninguna de las demas pantallas las necesita nunca.
 * Medido: el arranque bajo de 150,2 a 148,0 KB comprimidos al sacarlas del
 * trozo comun (`yarn comprobar-compilaciones`).
 */
const FichaDelPredio = lazy(async () => ({
  default: (await import('./catastro/FichaDelPredio')).FichaDelPredio,
}));
const CuadroDeValuacion = lazy(async () => ({
  default: (await import('./catastro/CuadroDeValuacion')).CuadroDeValuacion,
}));
const Territorio = lazy(async () => ({
  default: (await import('./catastro/Territorio')).Territorio,
}));
const GeneracionIndividualDeValores = lazy(async () => ({
  default: (await import('./valores/GeneracionIndividualDeValores')).GeneracionIndividualDeValores,
}));
const GeneracionMasivaDeValores = lazy(async () => ({
  default: (await import('./valores/GeneracionMasivaDeValores')).GeneracionMasivaDeValores,
}));
const PrescripcionDeLaDeuda = lazy(async () => ({
  default: (await import('./valores/PrescripcionDeLaDeuda')).PrescripcionDeLaDeuda,
}));
const PaseACoactiva = lazy(async () => ({
  default: (await import('./valores/PaseACoactiva')).PaseACoactiva,
}));
/* **Y el indice de secciones, por lo mismo.** Lo declaran las opciones con
   `composicion.indice` —las fichas del predio y el predial individual—, que se
   dibujan en su propio trozo o son una de 134: el resto lo descargaba para no
   dibujarlo nunca. */
const IndiceDeSecciones = lazy(async () => ({
  default: (await import('./bloques/IndiceDeSecciones')).IndiceDeSecciones,
}));
/* **La hoja del reporte, perezosa desde #423.** La dibujan las trece pantallas
   `kind: 'report'` del manual y nadie mas —es una hoja A4 con sus firmas
   (RNF-084)—, asi que las otras 121 la descargaban para no usarla nunca. Es el
   mismo movimiento que #379 hizo con las cuatro de `pantallas/valores/` y #424
   con las tres de seguridad, y aqui paga las dos formas de cuerpo de este issue
   sin subir el presupuesto: la alternativa era el umbral, y habia esta. */
/* **Los indicadores y el portal, perezosos desde #423.** Los dibujan un `kind`
   cada uno —`dash` es el panel de recaudacion, `portal` la vista del
   funcionario— y las otras 132 pantallas los descargaban para no montarlos
   nunca. Mismo movimiento que la hoja del reporte y la memoria del calculo, y
   por el mismo motivo: `main` llego a 155,9 de 156 con #445 dentro, y el umbral
   lo sube quien no tiene otra salida. */
const Indicadores = lazy(async () => ({
  default: (await import('./bloques/Indicadores')).Indicadores,
}));
const Portal = lazy(async () => ({
  default: (await import('./bloques/Portal')).Portal,
}));
const Reporte = lazy(async () => ({
  default: (await import('./bloques/Reporte')).Reporte,
}));
const CambioDeNumeroDePapeleta = lazy(async () => ({
  default: (await import('./transito/CambioDeNumeroDePapeleta')).CambioDeNumeroDePapeleta,
}));
const GeneracionMasivaDeValoresDeTransito = lazy(async () => ({
  default: (await import('./transito/GeneracionMasivaDeValoresDeTransito'))
    .GeneracionMasivaDeValoresDeTransito,
}));
const EmisorDeReportes = lazy(async () => ({
  default: (await import('./transito/EmisorDeReportes')).EmisorDeReportes,
}));
const EmisorDeReportesAdministrativos = lazy(async () => ({
  default: (await import('./sanciones/EmisorDeReportesAdministrativos'))
    .EmisorDeReportesAdministrativos,
}));
const EmisorDelPadronDeAnuncios = lazy(async () => ({
  default: (await import('./licencias/EmisorDePadron')).EmisorDelPadronDeAnuncios,
}));
const EmisorDelPadronDeLicencias = lazy(async () => ({
  default: (await import('./licencias/EmisorDePadron')).EmisorDelPadronDeLicencias,
}));
/* Las tres de seguridad **tambien son perezosas desde #424**, y el motivo es el
   presupuesto: eran las unicas pantallas propias que seguian viajando en el
   arranque, y el arranque no tenia margen —156,2 KB de 156 al conectar el
   emisor de reportes—. Es el mismo movimiento que #379 hizo con las cuatro de
   `pantallas/valores/` y con las de catastro; sube el umbral quien no tiene otra
   salida, y aqui la habia. */
const PermisosMatrix = lazy(async () => ({
  default: (await import('./seguridad/PermisosMatrix')).PermisosMatrix,
}));
const MiembrosDeGrupo = lazy(async () => ({
  default: (await import('./seguridad/MiembrosDeGrupo')).MiembrosDeGrupo,
}));
const Respaldos = lazy(async () => ({
  default: (await import('./seguridad/Respaldos')).Respaldos,
}));

/*
 * Aqui vivia `VERSIONADAS`, la lista de las pantallas cuyo recurso trae version
 * y vigencia. Eran **las cuatro fichas catastrales y nadie mas**, y desde la
 * propuesta A las cuatro las dibuja `catastro/FichaDelPredio.tsx`, que trae su
 * propio bloque de versionado. Una lista vacia de hecho —y el bloque que la
 * consultaba— es exactamente lo que hay que quitar: dejarla diria que este
 * renderizador dibuja versiones, y ya no dibuja ninguna.
 */

/**
 * Los dos caminos, y por que hay dos.
 *
 * Una opcion **conectada** declara su operacion tipada y su adaptador
 * (`pantallas/conexiones.ts`); una opcion **sin conectar** pide por
 * `useDatosDePantalla` la forma que comparten las 134. Conviven a proposito:
 * conectar una no puede obligar a conectar las otras 133 el mismo dia.
 *
 * La eleccion se hace aqui, en dos componentes hermanos, y no dentro de uno con
 * un `if`: un hook no se llama a veces.
 */
/**
 * Opciones cuyo cuerpo no cabe en ninguno de los dos caminos comunes —campos
 * planos o tabla de solo lectura— y viven en su propio componente.
 *
 *   permisos                 (#70) su cuerpo es una lista de niveles, no
 *                            campos planos ni una tabla de solo lectura, y
 *                            necesita los dos verbos de su ruta a la vez
 *                            —leer para cargar la matriz, escribir para
 *                            guardarla—.
 *   miembros                 (#70) escribe un booleano (`activo`), y
 *                            `CampoDelCuerpo` solo sabe de texto y enteros.
 *   respaldo                 (#70) su verbo es `POST` pero el controlador
 *                            solo consulta: la aplicacion no puede ejecutar
 *                            copias de seguridad (ARQ-03 §4), asi que sus
 *                            botones se quedan deshabilitados en vez de
 *                            conectarse a una escritura que no hace lo que
 *                            dice.
 *   ficha_urbana,            las cinco caen en la **misma** superficie: «Una
 *   ficha_economica,         sola ficha del predio» (propuesta A de
 *   ficha_bienes,            `design/propuestas/catastro`). Cuatro fichas del
 *   ficha_rural,             mismo objeto con cuatro formas —once pestanas una,
 *   actualizacion_catastro   una seccion plana otra— y una quinta pantalla que
 *                            repetia dos pestanas de la primera **con otro
 *                            vocabulario**. Aqui son cinco pestanas
 *                            constantes, y la actualizacion es el modo de
 *                            edicion de una de ellas: con eso el vocabulario
 *                            divergente muere por construccion. Las cinco
 *                            rutas, su id, su permiso y su entrada de menu
 *                            siguen intactos; la ruta decide la modalidad que
 *                            llega abierta, y cambiar de modalidad **navega**.
 *                            Ver el docblock de `catastro/FichaDelPredio.tsx`,
 *                            que es donde vive la decision del identificador.
 *   aranceles,               las tres caen en la **misma** superficie: «El
 *   valores_unitarios,       cuadro de valuacion del ejercicio» (propuesta B
 *   depreciacion             de `design/propuestas/catastro`). Responden la
 *                            misma pregunta —que valores rigen este ano— y
 *                            sus tres controladores reciben un solo
 *                            parametro, `anio`: el ejercicio deja de ser
 *                            tres selectores y pasa a ser uno, el de la
 *                            sesion. De las dos nacionales, ademas, el
 *                            backend publica una fila por partida/estado y
 *                            tramo donde el prototipo dibuja una matriz, y
 *                            la cabecera se construye con lo que venga en la
 *                            respuesta —no con las siete partidas fijas del
 *                            prototipo, que ponian cifras bajo la cabecera
 *                            de otra partida—. Las tres rutas, su permiso y
 *                            su entrada de menu siguen intactos.
 *   valores_individual,      (#75) sus cuerpos llevan arreglos —una
 *   valores_masivo,          obligacion, una lista de contribuyentes, un
 *   prescripcion             hecho de interrupcion— que `CampoDelCuerpo`
 *                            no declara suelto, o piden partir un campo
 *                            del catalogo en dos (`prescripcion`). Ver el
 *                            docblock de `pantallas/valores/index.ts`.
 *   pase_coactiva            (#75) el catalogo dibuja sus acciones sin la
 *                            que escribe al final, y el renderizador
 *                            comun siempre trata la ultima como la
 *                            primaria: conectada tal cual, pasaria un
 *                            valor a coactiva sin confirmacion.
 *   transito_cambio_numero,  (#77) el mismo problema que `pase_coactiva`:
 *   transito_valores         la ultima accion del catalogo es «Salir» en
 *                            una y «Imprimir» en la otra, ninguna de las
 *                            dos escribe. Cada una trae su barra de una
 *                            sola accion.
 *   transito_reportes        (#424) la primera pantalla que **lee por
 *                            `POST`**: no escribe nada, asi que no pasa por
 *                            `useEscritura` ni pide observacion, y no se
 *                            puede pedir al abrir porque no hay tipo de
 *                            reporte elegido. Ademas su ultima accion del
 *                            catalogo es «Cancelar», y los criterios que
 *                            viajan dependen del reporte: el backend rechaza
 *                            con 422 el que esa hoja no usa.
 *   anuncios_reportes,       (#427) los dos padrones de licencias, por lo
 *   licencia_padron          mismo que los dos emisores de arriba: `POST` que
 *                            solo lee, ultima accion «Cancelar», y una
 *                            respuesta que publica sus filas bajo `filas` —no
 *                            bajo `contenido`—. Ademas dibujan bloqueado, con
 *                            su motivo, el criterio que el backend no admite.
 *   sectores, calles         las dos caen en la **misma** superficie: un
 *                            carril con el arbol territorial —sector →
 *                            manzana— y un panel con las dos hojas como
 *                            pestanas. No es que su cuerpo no quepa en los
 *                            bloques comunes: es que las dos describen **un
 *                            solo territorio** y separarlas obligaba a
 *                            volver al menu para pasar de la manzana a la
 *                            via que la limita. Las dos rutas, su permiso y
 *                            su entrada de menu siguen intactos: lo unico
 *                            que decide la ruta es que hoja llega abierta,
 *                            y cambiar de pestana **navega**.
 *
 * Viven en su propio componente en vez de forzar al renderizador comun a
 * saber de listas, de booleanos o de un verbo que miente.
 *
 * **Se exporta para una prueba, no para reusarla** (#421): el renderizador
 * comun compone su barra con `accionesDeLaBarra` **sin** los rotulos de las
 * altas, porque ese argumento solo lo lee la rama del vocabulario uniforme y
 * ninguna de las opciones que lo declaran llega hasta aqui. Esa afirmacion la
 * sostiene una prueba que cruza `VOCABULARIO_UNIFORME` con esta lista; sin ella
 * seria una suposicion que se rompe en silencio el dia que alguien declare el
 * vocabulario para una opcion sin componente propio.
 */
export const COMPONENTES_PROPIOS: Readonly<
  Record<string, ComponentType<{ readonly estructura: Estructura }>>
> = {
  permisos: PermisosMatrix,
  miembros: MiembrosDeGrupo,
  respaldo: Respaldos,
  ficha_urbana: FichaDelPredio,
  ficha_economica: FichaDelPredio,
  ficha_bienes: FichaDelPredio,
  ficha_rural: FichaDelPredio,
  actualizacion_catastro: FichaDelPredio,
  aranceles: CuadroDeValuacion,
  valores_unitarios: CuadroDeValuacion,
  depreciacion: CuadroDeValuacion,
  valores_individual: GeneracionIndividualDeValores,
  valores_masivo: GeneracionMasivaDeValores,
  prescripcion: PrescripcionDeLaDeuda,
  pase_coactiva: PaseACoactiva,
  transito_cambio_numero: CambioDeNumeroDePapeleta,
  transito_valores: GeneracionMasivaDeValoresDeTransito,
  transito_reportes: EmisorDeReportes,
  adm_reportes: EmisorDeReportesAdministrativos,
  anuncios_reportes: EmisorDelPadronDeAnuncios,
  licencia_padron: EmisorDelPadronDeLicencias,
  sectores: Territorio,
  calles: Territorio,
};

function Contenido({ estructura }: { readonly estructura: Estructura }) {
  const Propio = COMPONENTES_PROPIOS[estructura.id];
  if (Propio !== undefined) {
    // El `Suspense` cubre a todas: desde #424 tambien las tres de seguridad
    // son perezosas, asi que ninguna viaja ya en el trozo comun. Sin promesa
    // pendiente, `Suspense` no dibuja su `fallback`.
    return (
      <Suspense fallback={<Esqueleto alto={320} />}>
        <Propio estructura={estructura} />
      </Suspense>
    );
  }
  const conexion = conexionDe(estructura.id);
  return conexion === undefined ? (
    <ContenidoDelCatalogo estructura={estructura} />
  ) : (
    <ContenidoConectado estructura={estructura} conexion={conexion} />
  );
}

function ContenidoDelCatalogo({ estructura }: { readonly estructura: Estructura }) {
  const { codigo } = useParams();
  const operacion = operacionDe(estructura.id);
  const consulta = useDatosDePantalla(estructura);
  const falta = operacion === undefined ? undefined : registroQueFalta(operacion, codigo);

  return <Bloques estructura={estructura} consulta={consulta} faltaRegistro={falta} />;
}

function ContenidoConectado({
  estructura,
  conexion,
}: {
  readonly estructura: Estructura;
  readonly conexion: Conexion;
}) {
  /* **Lo que se esta escribiendo, un piso por encima de quien lo escribe.**
     El borrador vive en `useEscritura`, dentro de `Bloques`, y la lectura lo
     necesita **antes**: hay conexiones cuyos parametros dependen de un campo del
     formulario (`ContextoDePantalla.borrador`). Con la escritura donde esta, la
     unica forma de que la lectura lo vea es que el hijo lo suba; se sube por
     este estado, y no por un contexto, porque el consumidor es el padre.

     No es un bucle: `escritura.borrador` solo cambia de identidad cuando alguien
     escribe un campo, y fijar el mismo objeto no vuelve a dibujar. */
  const [borrador, fijarBorrador] = useState<Readonly<Record<string, string>>>({});
  // La ficha de un predio se abre por su codigo. Sin codigo no hay peticion, y
  // lo que toca decir es que falta elegir uno —no dibujar un esqueleto para
  // siempre—. Lo mismo con el filtro que la operacion exige.
  const { consulta, falta, faltaFiltro } = useDatosDeOperacion(conexion, borrador);
  return (
    <Bloques
      estructura={estructura}
      consulta={consulta}
      {...(falta === undefined ? {} : { faltaRegistro: falta })}
      {...(faltaFiltro === undefined ? {} : { faltaFiltro })}
      {...(conexion.sinPermiso === undefined ? {} : { sinPermiso: conexion.sinPermiso })}
      alCambiarBorrador={fijarBorrador}
    />
  );
}

function Bloques({
  estructura,
  consulta,
  faltaRegistro,
  faltaFiltro,
  sinPermiso,
  alCambiarBorrador,
}: {
  readonly estructura: Estructura;
  readonly consulta: ReturnType<typeof useDatosDePantalla>;
  /** Nombre del parametro que la pantalla necesita y todavia no tiene. */
  readonly faltaRegistro?: string;
  /**
   * El filtro obligatorio que la operacion pide y la busqueda no trae, con lo
   * que hay que decir mientras falte. Ver `Conexion.exige`.
   */
  readonly faltaFiltro?: {
    readonly parametro: string;
    readonly titulo: string;
    readonly detalle: string;
  };
  /**
   * Que decir si la **lectura** de esta pantalla responde 403, cuando esa
   * lectura no es la de esta opcion. Ver `Conexion.sinPermiso`.
   */
  readonly sinPermiso?: { readonly titulo: string; readonly detalle: string };
  /**
   * Sube el borrador a quien pide los datos, cuando la lectura depende de el
   * (`ContextoDePantalla.borrador`). Solo lo pasa el camino conectado.
   */
  readonly alCambiarBorrador?: (borrador: Readonly<Record<string, string>>) => void;
}) {
  const [pestana, fijarPestana] = useState(0);
  const [cerradas, fijarCerradas] = useState<Readonly<Record<string, boolean>>>({});
  // El alta abierta en panel, si hay alguna: cual, y de que fila cuelga. Una
  // sola a la vez —dos paneles encima del otro no se pueden operar—.
  const [altaAbierta, fijarAltaAbierta] = useState<AltaAbierta | null>(null);
  /* Que filas de la tabla estan elegidas, cuando la opcion declara seleccion
     (#332). Se guardan **las claves de las filas**, no sus indices.

     Un indice no identifica una fila: identifica un sitio. Con indices, volver
     atras con el navegador —que restaura la busqueda anterior sin pasar por
     «Buscar»— dejaba marcada «la 3», y la 3 de la pagina de vuelta es otra
     cuota, de otro contribuyente y por otro importe. La baja se mandaba con el
     `codContribuyente` de la busqueda anterior sin que nada lo dijera. */
  const [elegidas, fijarElegidas] = useState<ReadonlySet<string>>(new Set());
  const [busqueda, fijarBusqueda] = useSearchParams();
  /* El alta guiada abierta vive en la URL y no aqui (#498 F2). Con `useState`
     recargar la perdia, el enlace no la llevaba, y —lo que la hizo cambiar— el
     boton «Registrar predio» del panel lateral no tenia como abrirla: vive en
     el shell, fuera de esta pantalla. */
  const flujoAbierto = busqueda.get(NUEVO) === '1';
  const fijarFlujoAbierto = (abierto: boolean): void =>
    fijarBusqueda(conCambio(busqueda, { [NUEVO]: abierto ? '1' : undefined }), { replace: true });
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();
  const { moduloId = '', ranura = '', codigo } = useParams();

  const busquedaActiva = leerBusqueda(busqueda);
  // El bloque de busqueda: el del catalogo, o el que esta opcion compone
  // cuando el catalogo no trae ninguno (`filtrosPropios`, ver `composicion.ts`).
  const filtrosDeLaPantalla = filtrosDe(estructura.id, estructura.filtros);
  const operacion = operacionDe(estructura.id);
  // Una operacion que escribe no se pide al abrir la pantalla: abrir «Copias de
  // seguridad» no puede lanzar un respaldo. La pantalla se dibuja de su catalogo
  // y espera a que alguien pulse.
  const pide = operacion !== undefined && !escribe(operacion);
  /* Las dos formas de no tener peticion que la pantalla cuenta igual: falta el
     registro que la abre, o falta el filtro que su operacion exige. Las dos
     dejan la consulta apagada, asi que las dos tienen que salir del estado
     «cargando» —o el esqueleto se queda para siempre—. Lo que cambia es el
     texto, no el estado. */
  const sinPedir = faltaRegistro ?? faltaFiltro?.parametro;
  const estado = estadoDePantalla(consulta, sinPedir, pide);
  // Los niveles de accesibilidad apagan **acciones**, no solo opciones: ver una
  // ficha sin poder modificarla es un perfil de consulta, no un error.
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  // Dar de alta exige `registro`, no cualquier escritura: es lo que exigen los
  // `POST` del backend. **Sin el, el panel no existe** —no se dibuja apagado—.
  const puedeRegistrarAqui = catalogo.puedeRegistrar(estructura.id);
  /* Y la accion de la pantalla se mide **contra el verbo de su operacion**, no
     contra «escribir» a secas: un `POST` del catalogo es siempre un alta, y el
     backend le exige `REGISTRO` —lo hace `MovimientosDeDeudaController` en sus
     dos rutas, y lo hacen los `POST` de sector, via y ficha—. Con
     `puedeEscribir`, un perfil de `modificacion` sin `registro` veia la primaria
     de «Baja de deuda» habilitada, elegia su cuota, escribia la observacion,
     confirmaba un acto irreversible y recibia un 403. Es el mismo criterio que
     `puedeRegistrar` ya aplicaba a los paneles de alta, aplicado a la barra. */
  const exigeRegistro = operacion !== undefined && descriptorDe(operacion).metodo === 'POST';
  const puedeActuarAqui = exigeRegistro ? puedeRegistrarAqui : puedeEscribirAqui;
  // Que campos puede mandar esta opcion, y si lo que guarda es global a la
  // sesion. Sin declaracion, el formulario no se escribe y solo viaja la
  // observacion: negacion por omision, como la autorizacion del manual.
  const declarada = escrituraDe(estructura.id);
  const aviso = avisoDe(estructura.id);
  // Lo que esta pantalla **no** manda, si su escritura lo declara.
  const nota = declarada?.nota === true ? notaDe(estructura.id) : undefined;
  const trabajo = useEjercicio();
  // La unica pantalla que descarga un archivo en vez de dibujar JSON (#71). El
  // hook se llama siempre —no se puede llamar a un hook a veces— y se pasa al
  // bloque de reporte solo cuando esta es la pantalla, para que las otras doce
  // sigan con su boton deshabilitado de siempre.
  const descargaDeFicha = useDescargaDeArchivo('ficha_contribuyente_reporte', {
    codigo: codigo ?? '',
  });
  /* La segunda, y la que cierra RNF-081 de #72: la constancia de no adeudo.
     Es el papel que el contribuyente se lleva, asi que se exporta a los tres
     formatos por el mismo camino, y **con la misma fecha de corte** que la hoja
     que se esta mirando: descargar «la constancia» sin su fecha bajaria la de
     hoy, que puede decir otra cosa que la que hay en pantalla (regla 9). */
  const fechaDeCorte = busquedaActiva.filtros['fecha'];
  const descargaDeConstancia = useDescargaDeArchivo('constancia', {
    codContribuyente: codigo ?? '',
    ...(fechaDeCorte === undefined || fechaDeCorte === '' ? {} : { fecha: fechaDeCorte }),
  });
  // Lo que esta opcion compone **alrededor** de los bloques comunes: cabecera
  // -resumen, indice de secciones, control propio de un filtro y el acto que
  // vive en otra pantalla. Vacio para 130 de las 134, y entonces no cambia nada.
  const composicion = composicionDe(estructura.id);
  /* Una opcion que **compone su propio acto** no tiene impedimento que contar:
     el alta se abre en un panel, el flujo guiado sustituye la pantalla o la
     primaria es el enlace a la opcion que si escribe. En «Calles» y «Sectores»
     eso se veia sin disimulo: la franja decia «el backend no publica ninguna
     escritura» al lado de un «Nuevo» que abre un formulario y da de alta de
     verdad. Y ademas quedaba huerfana —sin primaria que la referencie, nadie la
     lee—, que es la definicion de ruido. */
  const componeSuActo =
    composicion.altas !== undefined ||
    composicion.altaDeFila !== undefined ||
    composicion.flujo !== undefined ||
    composicion.acto !== undefined;
  /* **La barra que se dibuja, no la lista cruda del catalogo** (#391 §2, #421).
     Para 117 de las 134 esto devuelve la lista intacta y no cambia nada; para
     las once que declaran cual accion escribe, mueve esa al final —que es donde
     `BarraDeAcciones` pone la primaria (FRO-03 §5)— y deja las demas como
     estaban. Sin esto, «Limpiar campos» seria el boton navy de la importacion a
     coactiva, y su motivo se leeria de un `title` sobre un boton apagado, que no
     llega ni al teclado ni al lector (RNF-082).

     **Sin los rotulos de las altas, y no por descuido**: ese argumento solo lo
     lee la rama del vocabulario uniforme, que recompone la barra entera, y
     ninguna de las opciones que la declaran se dibuja aqui —las seis tienen
     componente propio—. Pasarlo seria codigo que nunca se ejecuta; lo que
     sostiene la afirmacion es la prueba que exige que las seis esten en
     {@link COMPONENTES_PROPIOS}, y por eso esa lista se exporta. */
  const barra = accionesDeLaBarra(estructura.id, estructura.acciones ?? []);
  // Por que la primaria no puede guardar todavia, cuando no puede (#332). Se
  // pregunta **solo con el privilegio que el acto exige**: sin el, lo que apaga
  // la accion es el permiso, y contar que la pantalla no guarda seria contestar
  // otra cosa —y sugerir un aviso a sistemas por algo que arregla el
  // administrador de la municipalidad—.
  //
  // Y se pregunta por **la barra compuesta**: la funcion promete explicar «la
  // ultima accion, la misma que dibuja `BarraDeAcciones`», y con la lista cruda
  // explicaria un boton que ya no es la primaria.
  const impedimento =
    puedeActuarAqui && !componeSuActo
      ? impedimentoDelActo(estructura.id, barra.acciones)
      : undefined;
  /* ── Lo que devolvio la simulacion manda sobre lo que hay ────────────────
     Las cinco pantallas de determinacion (#393) tienen un `POST` por operacion,
     asi que `useDatosDePantalla` no pide nada al abrir —abrir una pantalla no
     puede lanzar una determinacion— y `consulta.data` es `undefined`. Cuando
     alguien pulsa «Simular», la respuesta llega por aqui y es la unica que hay:
     no se mezcla campo a campo con la anterior, porque no hay anterior, y
     mezclar dos determinaciones distintas seria enseñar una cuenta que nadie
     calculo. En las 129 restantes esto es `consulta.data` y nada mas. */
  const simulacion = useSimulacion(estructura.id, busqueda);
  const datos = simulacion.datos ?? consulta.data;

  /* ── La seleccion de filas, y por que no vive en un efecto ───────────────
     Lo elegido se traslada al cuerpo **en el mismo gesto que lo elige**, no en
     un `useEffect` que mire el estado: `fijarFilas` cambia el estado de la
     escritura, asi que un efecto que dependiera de ella volveria a dispararse
     con cada render y no pararia nunca. */
  const seleccionable = composicion.seleccion;
  const filasDeLaTabla = datos?.tabla?.filas ?? [];
  const valoresDeLaTabla = datos?.tabla?.valores;
  const clavesDeLaTabla = estructura.tabla?.claves ?? [];

  /**
   * Como se identifica una fila de la pagina que se esta viendo.
   *
   * Del **contenido**, no de la posicion: dos respuestas con las mismas filas
   * dan las mismas claves, y una fila que ya no esta deja de tener la suya. Es
   * lo que permite decir «lo que elegiste ya no esta aqui» en vez de mandar la
   * fila que ocupe ahora ese sitio.
   */
  const claveDeFila = (indice: number): string =>
    JSON.stringify(
      valoresDeLaTabla?.[indice] ?? (filasDeLaTabla[indice] ?? []).map((celda) => celda.texto),
    );
  const clavesDeLaPagina = filasDeLaTabla.map((_, indice) => claveDeFila(indice));
  /* Lo elegido que ya no esta en la pagina que se ve. Con la seleccion por
     clave no puede senalar a otra fila —eso ya no pasa—, pero si puede senalar
     a ninguna: la respuesta cambio debajo (otro ejercicio, un refresco tras
     guardar) y lo que se marco ya no existe. Entonces no se manda nada, y se
     dice; enviar «lo primero que haya» seria dar de baja lo que no era. */
  const eleccionPerdida =
    seleccionable !== undefined && [...elegidas].some((c) => !clavesDeLaPagina.includes(c))
      ? 'Lo que estaba elegido ya no está en esta página: la deuda se volvió a cargar. Vuelve a elegir la cuota.'
      : undefined;

  const escritura = useEscritura(
    // Una opcion **sin declarar** no escribe: mandaba solo su observacion, que
    // para un cobro o una transferencia no es guardar nada —y el backend lo
    // rechazaba despues de que alguien rellenara la pantalla entera—. Ahora la
    // accion se queda apagada y la franja de arriba dice por que (#332).
    operacion !== undefined && escribe(operacion) && puedeActuarAqui && declarada !== undefined
      ? operacion
      : undefined,
    operacion === undefined ? {} : parametrosDeBusqueda(operacion, codigo, busqueda),
    {
      campos: declarada?.campos ?? {},
      // Lo que la pantalla guarda y no manda nunca: no esta en `campos`, asi
      // que no hay traduccion que lo saque al cuerpo.
      ...(declarada?.presentacion === undefined ? {} : { presentacion: declarada.presentacion }),
      tablas: declarada?.tablas ?? {},
      mapas: declarada?.mapas ?? {},
      ...(declarada?.segunLaAccion === undefined ? {} : { segunLaAccion: declarada.segunLaAccion }),
      /* Lo que el cuerpo toma del filtro, y **lo que se pregunto**: los dos van
         juntos porque sin la declaracion no se lee ningun filtro. Es como llega
         al cuerpo la caja y el cajero del cierre de turno, que el catalogo
         dibuja de solo lectura (#423). */
      delFiltro: declarada?.delFiltro ?? {},
      filtros: busquedaActiva.filtros,
      // La mitad de la operacion que se invoca, cuando la operacion es dos.
      ...(declarada?.constantes === undefined ? {} : { constantes: declarada.constantes }),
      /* Lo que exige la opcion, **precedido de lo que exige la pagina**. La
         opcion mira el cuerpo —`escrituras.ts` no sabe que es una pagina—; que
         la fila capturada siga estando delante solo lo puede comprobar quien
         tiene la respuesta, y es aqui. */
      exigir: (borrador, filas, delFiltro) =>
        eleccionPerdida ?? declarada?.exigir?.(borrador, filas, delFiltro),
      ...(declarada?.cambiaElEjercicio === true ? { alGuardar: trabajo.adoptar } : {}),
    },
  );
  // El registro que abre esta pantalla, si abre alguno: `codRefCatastral`, `placa`…
  const registro =
    operacion === undefined ? undefined : descriptorDe(operacion).parametrosDeRuta[0];
  // Sin peticion no hay carga que esperar, y hay dos formas de no tener
  // peticion: que falte el registro que abre la pantalla, o que la operacion
  // escriba —esas no se piden al abrir—. Sin este `pide`, una pantalla que
  // escribe se quedaba con todos sus campos en esqueleto y deshabilitados para
  // siempre, porque su consulta nunca deja de estar pendiente.
  const cargando = pide && consulta.isPending && sinPedir === undefined;
  const valores: Readonly<Record<string, ValorDeCampo>> = datos?.campos ?? {};
  const Resumen = composicion.resumen;
  // Si hay algo que resumir, antes de pedir el trozo perezoso. Ver `hayQueResumir`.
  const hayAlgoQueResumir = hayQueResumir(
    codigo,
    busqueda,
    filasDeLaTabla.length,
    composicion.resumenSiempre === true,
  );
  // Cuando el indice **sustituye** a las pestanas (#330), las secciones de todas
  // ellas se apilan en una sola pagina y la barra de pestanas deja de dibujarse:
  // era navegacion, y el indice hace la misma navegacion desplazando. Las otras
  // pantallas con pestanas del sistema no se enteran —es opt-in por opcion—.
  const enVezDePestanas = composicion.indice === 'en-vez-de-pestanas';
  const secciones = enVezDePestanas
    ? seccionesApiladas(estructura)
    : seccionesDe(estructura, pestana);
  // El ancla de cada seccion lleva la pestana dentro: dos pestanas pueden
  // declarar secciones con el mismo rotulo, y dos anclas iguales en la misma
  // pagina llevan siempre a la primera.
  const anclaDe = (indice: number): string => `sgtm-seccion-${pestana}-${indice}`;
  /* La tabla, cuando la pantalla lleva indice: se dibuja **encima** de las
     secciones y fuera de su rejilla (FRO-03 §5), asi que sin entrada propia el
     indice empieza por la segunda cosa de la pagina. En «Cálculo individual del
     impuesto predial» eso dejaba fuera el paso 1 del calculo —los predios que
     integran la base—, que es de donde sale todo lo demas.

     **`composicion.indice !== undefined` si se alcanza hoy** (#342, nit 2): no
     es una condicion muerta a la espera de una segunda pantalla. `predial_individual`
     declara `{ indice: true, indiceConLaTabla: true }`
     (`rentas/composicion.ts`) y su catalogo si trae `tabla`, asi que las tres
     condiciones de `indexaLaTabla` son ciertas para ella, y
     `memoria-del-predial.test.tsx` («los predios van antes que la base…») ya
     lo ejercita: comprueba que «Predios que integran la base imponible» entra
     como **la primera** entrada del indice, con su propia ancla y su propio
     boton «Ir a…». No hace falta una prueba nueva; esta nota deja dicho por
     que no hacia falta que la buscara una revision. */
  const indexaLaTabla =
    composicion.indice !== undefined &&
    composicion.indiceConLaTabla === true &&
    estructura.tabla !== undefined;
  const conIndice = (formulario: React.JSX.Element): React.JSX.Element =>
    composicion.indice !== undefined ? (
      <div className="sgtm-conindice">
        <Suspense fallback={<Esqueleto alto={120} />}>
          <IndiceDeSecciones
            secciones={secciones}
            anclaDe={anclaDe}
            haciaLasAcciones={barra.acciones.length > 0}
            {...(indexaLaTabla && estructura.tabla !== undefined
              ? // El rotulo es el del catalogo, no uno redactado aqui (RNF-080).
                { previa: { rotulo: estructura.tabla.title, ancla: ANCLA_DE_LA_TABLA } }
              : {})}
          />
        </Suspense>
        <div className="sgtm-conindice__panel">{formulario}</div>
      </div>
    ) : (
      formulario
    );
  // Abrir un alta: el flujo guiado sustituye a la pantalla, el panel se pone al
  // lado. Las dos cosas se piden por el rotulo de la accion del catalogo.
  const abrirAlta = (accion: string): void => {
    if (composicion.flujo?.accion === accion) {
      fijarFlujoAbierto(true);
      return;
    }
    const indice = (composicion.altas ?? []).findIndex((alta) => alta.accion === accion);
    if (indice >= 0) fijarAltaAbierta({ indice });
  };
  const limpiarSeleccion = (): void => {
    fijarElegidas(new Set());
    if (seleccionable !== undefined) escritura.fijarFilas(seleccionable.tabla, []);
  };

  const alternarEleccion = (indice: number): void => {
    if (seleccionable === undefined) return;
    const clave = claveDeFila(indice);
    const siguientes = new Set(elegidas);
    if (siguientes.has(clave)) siguientes.delete(clave);
    else siguientes.add(clave);
    fijarElegidas(siguientes);
    /* La fila que viaja son **sus columnas del catalogo**, con su clave, mas lo
       que la seleccion aporte del contexto y —encima de todo— los valores
       crudos de la respuesta. De ahi en adelante manda la lista blanca por
       columna de `escrituras.ts`: lo que no este declarado no entra ni en el
       estado de React.

       El orden importa: **los crudos ganan**. La celda es texto de
       presentacion —«1,842.60», «—»— y lo que el backend acepta es lo que
       venia en el cuerpo; ademas, los crudos traen lo que ninguna columna
       dibuja, que es el identificador de la unidad (#332). */
    const contexto = seleccionable.contexto?.(busqueda) ?? {};
    const filas = clavesDeLaPagina.flatMap((claveDeLaPagina, fila) => {
      if (!siguientes.has(claveDeLaPagina)) return [];
      const celdas = filasDeLaTabla[fila] ?? [];
      const elegida: Record<string, string> = { ...contexto };
      clavesDeLaTabla.forEach((nombre, columna) => {
        const celda = celdas[columna];
        if (celda !== undefined) elegida[nombre] = celda.texto;
      });
      return [{ ...elegida, ...(valoresDeLaTabla?.[fila] ?? {}) }];
    });
    escritura.fijarFilas(seleccionable.tabla, filas);
  };

  /* El borrador sube a quien pide los datos, cuando la lectura depende de el.
     El efecto se dispara **solo cuando el borrador cambia de verdad**: es un
     estado de `useEscritura`, asi que su identidad no cambia entre dibujos. */
  useEffect(() => {
    alCambiarBorrador?.(escritura.borrador);
  }, [escritura.borrador, alCambiarBorrador]);

  // Guardado el acto, lo elegido deja de estarlo: la escritura ya vacio sus
  // filas, y dejar las casillas marcadas diria que aquello sigue por dar de baja.
  useEffect(() => {
    if (escritura.enviada) {
      fijarElegidas((previas) => (previas.size === 0 ? previas : new Set()));
    }
  }, [escritura.enviada]);

  /* **Cambiar lo que se esta mirando vacia lo elegido**, y «lo que se esta
     mirando» es la busqueda entera mas el ejercicio de trabajo.
     Los tres caminos que ya lo vaciaban —buscar, ordenar, paginar— pasan por
     sus manejadores; el que faltaba no pasa por ninguno: **el boton Atras del
     navegador**, que restaura la busqueda anterior sin pulsar nada. Con la
     seleccion viva de la busqueda de antes, lo que se mandaba era la cuota
     marcada con el `codContribuyente` del filtro restaurado. La dependencia es
     el texto de la busqueda y no el objeto: `useSearchParams` devuelve uno nuevo
     en cada dibujo.

     `escritura.fijarFilas` no entra en las dependencias a proposito: cambia de
     identidad en cada render, y con el dentro el efecto correria siempre y
     borraria lo que se acaba de marcar. */
  const busquedaMirada = busqueda.toString();
  useEffect(() => {
    fijarElegidas((previas) => (previas.size === 0 ? previas : new Set()));
    if (seleccionable !== undefined) escritura.fijarFilas(seleccionable.tabla, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaMirada, trabajo.ejercicio, seleccionable?.tabla]);

  // Tras cobrar, el foco vuelve al campo de identificacion: entra el siguiente
  // contribuyente y hay que poder teclear su documento sin buscar donde.
  const refDeBusqueda = useFocoTrasGuardar(escritura.enviada);
  // Al cerrar el alta guiada, el foco vuelve a la accion que la abrio: el flujo
  // sustituye a la pantalla entera, asi que el boton no esta ahi para
  // devolverselo el mismo (a diferencia del panel lateral).
  useFocoEnLaAccion(composicion.flujo?.accion, flujoAbierto);

  // El error y el sin permiso son de la pantalla entera, no de un bloque: hay
  // una peticion por pantalla, y no puede fallar la tabla y no el formulario.
  // **Ninguno de los dos dibuja la estructura**: entrar sin permiso no puede
  // filtrar ni el titulo ni los campos de lo que hay detras (REQ-03 §5).
  if (estado === 'sin-permiso') {
    // Y si la lectura de esta pantalla **no es la de esta opcion**, se dice cual
    // falta: «Baja de deuda» lee `consulta_deuda`, y quien tenga una y no la
    // otra recibia un «no tienes permiso» que le manda a pedir el que ya tiene.
    const texto = sinPermiso ?? SIN_PERMISO;
    return <Aviso tipo="sin-permiso" titulo={texto.titulo} detalle={texto.detalle} />;
  }

  // La operacion esta en el contrato pero el backend todavia no la sirve (404).
  // No es un error: ni traza que dictar ni «Reintentar» —daria el mismo 404
  // hasta que se publique el endpoint—. Tampoco dibuja la estructura, igual que
  // el sin permiso: no hay datos que ensenar.
  if (estado === 'no-disponible') {
    return <Aviso titulo={NO_DISPONIBLE.titulo} detalle={NO_DISPONIBLE.detalle} />;
  }

  // El alta guiada **sustituye a los bloques** mientras dura: son cuatro pasos
  // que validan contra el territorio, y no caben al lado de la pantalla que se
  // estaba mirando (#320). Solo con privilegio de registro, como el panel.
  if (flujoAbierto && composicion.flujo !== undefined && puedeRegistrarAqui) {
    const Asistente = composicion.flujo.Asistente;
    // El asistente llega en su propio trozo (`lazy`): mientras baja, el hueco de
    // siempre, no una pantalla en blanco.
    return (
      <Suspense fallback={<Esqueleto alto={320} />}>
        <Asistente titulo={composicion.flujo.titulo} onCerrar={() => fijarFlujoAbierto(false)} />
      </Suspense>
    );
  }

  if (estado === 'error') {
    // El backend redacta el mensaje en castellano y en lenguaje del dominio
    // (RNF-080); aqui no se reescribe ni se sustituye por uno generico.
    const texto = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza}>
        {/* Reintentar tiene sentido en una consulta y **nunca** en una
            escritura: repetir un cobro es cobrar dos veces (FRO-04 §5). */}
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  return (
    <>
      {/* La tira de hojas, cuando esta opcion es una de una superficie (#442).
          Va lo primero: es navegacion, y dice de que objeto se esta hablando
          antes que la descripcion de la hoja concreta. */}
      {composicion.superficie !== undefined && (
        <HojasDeSuperficie
          titulo={composicion.superficie.titulo}
          hojas={composicion.superficie.hojas}
          activa={estructura.id}
        />
      )}

      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      {/* A que fecha estan los datos que vienen debajo. Va aqui y no dentro de
          la banda de totales porque es de la respuesta: una pantalla que ensena
          cifras en una tabla y no tiene banda las ensenaba sin fecha (regla 9). */}
      <FechaDeCalculo {...(datos?.fechaCalculo ? { fecha: datos.fechaCalculo } : {})} />

      {/* Lo que esta pantalla **no** manda, dicho antes de que alguien lo
          teclee. Sale de la escritura declarada, no del catalogo: es una
          propiedad de la operacion, no del dibujo. */}
      {nota !== undefined && <Aviso titulo="Cómo funciona esta pantalla" detalle={nota} />}

      {/* Y lo que hay que saber **de lo que se esta mirando**: que es una copia
          de trabajo y el padron todavia no la recoge (#80). */}
      {aviso !== undefined && <Aviso titulo={aviso.titulo} detalle={aviso.detalle} />}

      {estructura.kind === 'dash' && (
        <Suspense fallback={<Esqueleto alto={240} />}>
          <Indicadores kpis={datos?.kpis} paneles={datos?.paneles} cargando={cargando} />
        </Suspense>
      )}

      {estructura.kind === 'portal' && (
        <Suspense fallback={<Esqueleto alto={240} />}>
          <Portal pasos={estructura.steps ?? []} />
        </Suspense>
      )}

      {/* La cabecera-resumen: cual ficha es, de quien, de que uso y de cuando.
          Compuesta con lo que el adaptador ya trajo: no pide nada nuevo (#319).
          **Que hay registro abierto lo decide ella**, no esto: en catastro el
          registro es el parametro de la ruta y en el padron de contribuyentes es
          el filtro de la busqueda (#330), y sin registro devuelve `null`.
          El `Suspense` es para las que llegan en el trozo de su modulo. */}
      {Resumen !== undefined && hayAlgoQueResumir && (
        <Suspense fallback={<Esqueleto alto={92} />}>
          <Resumen
            {...(codigo === undefined ? {} : { codigo })}
            {...(datos === undefined ? {} : { datos })}
            cargando={cargando}
            opcion={estructura.id}
            busqueda={busqueda}
          />
        </Suspense>
      )}

      {estado === 'sin-registro' && (
        <Aviso
          titulo={faltaFiltro?.titulo ?? 'Elige un registro para abrirlo'}
          detalle={
            faltaFiltro?.detalle ??
            `Esta pantalla abre un registro por su «${faltaRegistro}». Búscalo arriba, o pega el enlace de la ficha: el registro abierto va en la dirección, así que ese enlace se puede compartir.`
          }
        />
      )}

      {filtrosDeLaPantalla && (
        <div ref={refDeBusqueda}>
          <Filtros
            opcion={estructura.id}
            campos={filtrosDeLaPantalla}
            buscado={busquedaActiva.filtros}
            cargando={consulta.isFetching}
            {...(composicion.filtrosPlegables === true ? { plegables: true } : {})}
            // Buscar reescribe la URL: es donde vive lo buscado. Y devuelve a la
            // primera pagina, porque la pagina 7 de otra busqueda no es ninguna.
            onBuscar={(valores) => {
              // Otra busqueda son otras filas: lo elegido de la anterior deja de
              // señalar a nada.
              limpiarSeleccion();
              const siguiente = conCambio(new URLSearchParams(busqueda), {
                ...vaciar(busquedaActiva.filtros),
                ...valores,
                [PAGINA]: undefined,
              });

              // Buscar por el identificador del registro **abre** ese registro: se
              // va a la ruta de la ficha, no a la lista filtrada. El resto de la
              // busqueda se conserva, y el enlace que queda es compartible.
              const elegido = registro === undefined ? undefined : valores[registro];
              if (registro !== undefined && elegido !== undefined && elegido !== '') {
                siguiente.delete(registro);
                const consulta = siguiente.toString();
                navegar(
                  `/${moduloId}/${ranura}/${encodeURIComponent(elegido)}${consulta === '' ? '' : `?${consulta}`}`,
                );
                return;
              }
              fijarBusqueda(siguiente);
            }}
          />
        </div>
      )}

      {estructura.tabla && (
        <TablaDePantalla
          estructura={estructura.tabla}
          opcion={estructura.id}
          datos={datos?.tabla}
          cargando={cargando}
          {...(indexaLaTabla ? { ancla: ANCLA_DE_LA_TABLA } : {})}
          hayFiltros={Object.keys(busquedaActiva.filtros).length > 0}
          {...(busquedaActiva.orden === undefined ? {} : { orden: busquedaActiva.orden })}
          sentido={busquedaActiva.sentido}
          onOrdenar={(clave) => {
            limpiarSeleccion();
            fijarBusqueda(conOrden(new URLSearchParams(busqueda), clave));
          }}
          onPagina={(pagina) => {
            limpiarSeleccion();
            fijarBusqueda(
              conCambio(new URLSearchParams(busqueda), {
                [PAGINA]: pagina <= 1 ? undefined : String(pagina),
              }),
            );
          }}
          {...(seleccionable === undefined
            ? {}
            : {
                seleccion: {
                  elegidas,
                  claveDe: claveDeFila,
                  onAlternar: alternarEleccion,
                  una: seleccionable.una,
                  varias: seleccionable.varias,
                  genero: seleccionable.genero,
                  ...(seleccionable.columnaPropia === true ? { columnaPropia: true as const } : {}),
                },
              })}
          {...(composicion.altaDeFila !== undefined && puedeRegistrarAqui
            ? {
                altaDeFila: {
                  etiqueta: composicion.altaDeFila.accion,
                  onAbrir: (clave: string) => fijarAltaAbierta({ deFila: true, contexto: clave }),
                },
              }
            : {})}
        />
      )}

      {estructura.totales && (
        <Totales estructura={estructura.totales} datos={datos?.totales} cargando={cargando} />
      )}

      {estructura.tabs && estructura.tabs.length > 0 && !enVezDePestanas && (
        <div className="sgtm-pestanas" role="tablist" aria-label="Secciones de la pantalla">
          {estructura.tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={i === pestana}
              className="sgtm-pestanas__tab"
              data-activa={i === pestana ? '1' : '0'}
              onClick={() => {
                fijarPestana(i);
                // Cambiar de pestana resetea el colapso, como en el prototipo.
                fijarCerradas({});
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {secciones.length > 0 &&
        /* El indice **no bifurca el renderizador**: el formulario es el mismo
           componente con los mismos datos, y lo unico que cambia es que se
           dibuja dentro de una rejilla de dos columnas con su indice al lado
           (ADR-0014 lo hizo igual con el centro de reportes). */
        conIndice(
          <Formulario
            opcion={estructura.id}
            secciones={secciones}
            valores={valores}
            cargando={cargando}
            cerradas={cerradas}
            pestana={pestana}
            escribibles={escritura.campos}
            borrador={escritura.borrador}
            onCampo={escritura.fijarCampo}
            /* Los mapas del cuerpo (#423): el formulario dibuja una fila por
               entrada del vocabulario, en el sitio de los campos que sustituye. */
            entradasDe={escritura.entradasDe}
            onEntrada={escritura.fijarEntrada}
            /* El privilegio del acto, para lo que no basta con «esta clave esta
               declarada»: hoy, el control que busca contra el padron antes de
               escribir (`ResolutorProps.bloqueado`). */
            puedeActuar={puedeActuarAqui}
            errorPorCampo={escritura.errorPorCampo}
            onAlternar={(clave, cerrada) =>
              fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
            }
            {...(composicion.indice === undefined ? {} : { anclaDe })}
          />,
        )}

      {estructura.kind === 'report' && estructura.reporte && (
        <Suspense fallback={<Esqueleto alto={320} />}>
          <Reporte
            estructura={estructura.reporte}
            datos={datos?.reporte}
            cargando={cargando}
            {...descargasDelReporte(estructura.id, descargaDeFicha, descargaDeConstancia)}
          />
        </Suspense>
      )}

      {cargando && !estructura.kind && !estructura.tabla && secciones.length === 0 && (
        <Esqueleto alto={120} />
      )}

      {estructura.acciones && (
        <BarraDeAcciones
          acciones={barra.acciones}
          /* **Y si ninguna de las que quedan escribe, ninguna es la primaria**
             (#391 §2, #442). Hasta ahora esto solo lo pasaba
             `catastro/FichaDelPredio`, asi que el camino comun aplicaba media
             regla: usaba la lista depurada y seguia pintando de navy la ultima,
             que en una pantalla de consulta es «Imprimir». Es el defecto que la
             regla existe para cerrar —«quien atiende aprende que el navy es el
             acto de la pantalla, y en cuatro fichas de consulta el navy
             imprimia»—, y se colaba por aqui. */
          {...(barra.conPrimaria ? {} : { sinPrimaria: true as const })}
          escritura={escritura}
          /* Las acciones que el prototipo dibuja y que ahora abren un alta.
             **Solo con privilegio de registro**: sin el se quedan como estaban,
             dibujadas y apagadas, y no aparece un formulario que el servidor va
             a rechazar con 403. */
          {...(puedeRegistrarAqui ? { altas: altasDeLaBarra(composicion, abrirAlta) } : {})}
          // Sobre cuantos actua: lo cuenta el backend —«47 valores»— y aqui solo
          // se traslada. Contar las filas dibujadas diria «20», que es cuantas
          // caben en la pagina, no cuantas se van a emitir. La excepcion es una
          // pantalla que **elige** sus filas: ahi el alcance es lo elegido, y eso
          // sí lo sabe la interfaz porque lo eligio quien la usa.
          {...(seleccionable !== undefined
            ? {
                alcance: `${elegidas.size} ${elegidas.size === 1 ? seleccionable.una : seleccionable.varias}`,
                contadorDeLaPrimaria: elegidas.size,
              }
            : datos?.tabla?.conteo === undefined
              ? {}
              : { alcance: datos.tabla.conteo })}
          /* Y por que la primaria no puede guardar todavia, cuando no puede
             (#332): se pinta junto a ella en vez de dejarla apagada y muda. Van
             las dos mitades —lo que lee quien atiende y la causa tecnica, que
             solo viaja en un `data-`—. */
          {...(impedimento === undefined ? {} : { impedimento })}
          /* El acto de esta pantalla, cuando vive en otra opcion y hay un
             registro abierto que llevarse. Sin registro no hay a donde ir. */
          {...(composicion.acto !== undefined && codigo !== undefined && codigo !== ''
            ? {
                enlace: {
                  etiqueta: composicion.acto.etiqueta,
                  ruta: composicion.acto.rutaDe(codigo),
                },
              }
            : {})}
          /* La accion que enseña el resultado sin escribir nada (#393). Solo
             cuando la opcion la declara **y** se puede simular: con el backend
             de verdad contestando, `puedeSimular` es falso y la accion vuelve a
             quedarse como estaba —ver el docblock de `useSimulacion`, que es
             donde vive el motivo—. */
          {...(simulacion.accion !== undefined && simulacion.puedeSimular
            ? {
                simulacion: {
                  accion: simulacion.accion,
                  simulando: simulacion.simulando,
                  onSimular: simulacion.simular,
                },
              }
            : {})}
        />
      )}

      {altaAbierta !== null && puedeRegistrarAqui && (
        <PanelDeAlta
          composicion={composicion}
          abierta={altaAbierta}
          onCerrar={() => fijarAltaAbierta(null)}
        />
      )}
    </>
  );
}

/**
 * Cual de las dos descargas le toca a esta hoja de reporte, si le toca alguna.
 *
 * **Dos de trece, y las otras once siguen con su boton apagado.** Un reporte se
 * exporta desde aqui cuando su backend sirve los tres formatos (`?formato=`):
 * la ficha del contribuyente (#71) y la constancia de no adeudo (#72, RNF-081).
 * Los once restantes emitirian un documento numerado y firmado, y el regimen de
 * firma es la decision D-05, abierta: ofrecerles el boton seria prometer un
 * papel que nadie puede firmar.
 *
 * Se escribe como una tabla y no como dos `if` encadenados porque el tercero ya
 * no cabria en la linea de la que salio: el `estructura.id === '…' ? … : {}`
 * anidado es exactamente la forma que hace falta romper antes del tercer caso.
 */
function descargasDelReporte(
  opcion: string,
  ficha: DescargaDeArchivo,
  constancia: DescargaDeArchivo,
): { readonly descargas?: DescargaDeArchivo } {
  const descargas: Readonly<Record<string, DescargaDeArchivo>> = {
    ficha_contribuyente_reporte: ficha,
    constancia,
  };
  const elegida = descargas[opcion];
  return elegida === undefined ? {} : { descargas: elegida };
}

/**
 * Las acciones del catalogo que abren algo, con que abren.
 *
 * Se indexa por el rotulo de la accion porque es lo que el usuario lee y lo que
 * el catalogo dibuja —el mismo criterio que `esIrreversible`—, y porque asi el
 * alta **es** el boton que ya existia en vez de uno nuevo al lado.
 */
function altasDeLaBarra(
  composicion: ComposicionDeOpcion,
  abrir: (accion: string) => void,
): Readonly<Record<string, () => void>> {
  const acciones: Record<string, () => void> = {};
  if (composicion.flujo !== undefined) {
    acciones[composicion.flujo.accion] = () => abrir(composicion.flujo?.accion ?? '');
  }
  for (const alta of composicion.altas ?? []) acciones[alta.accion] = () => abrir(alta.accion);
  return acciones;
}

/**
 * Los filtros de antes, puestos a `undefined`, para que una busqueda nueva
 * **quite** los que ya no estan en vez de dejarlos pegados en la URL.
 */
function vaciar(filtros: Readonly<Record<string, string>>): Record<string, undefined> {
  return Object.fromEntries(Object.keys(filtros).map((nombre) => [nombre, undefined]));
}
