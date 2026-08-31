import { Suspense, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Esqueleto, FechaDeCalculo } from '@sgtm/design-system';
import type { CampoDePantalla, EstructuraDePantalla, SeccionDePantalla } from '../../catalogo';
import { opcionPorId, pantallasDelModulo } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { conexionDe } from '../conexiones';
import type { Conexion } from '../conexiones';
import { composicionDe, filtrosDe } from '../composicion';
import { useDatosDeOperacion } from '../useDatosDeOperacion';
import { NO_DISPONIBLE, SIN_PERMISO, estadoDePantalla, textoDeError } from '../estados';
import { avisoDe } from '../prosa';
import { NUEVO, PAGINA, PESTANA, conCambio, leerBusqueda } from '../busqueda';
import { useEscritura } from '../escritura';
import { accionesDeLaBarra } from '../actos';
import { useFocoEnLaAccion } from '../foco';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { Filtros } from '../bloques/Filtros';
import { Formulario } from '../bloques/Formulario';
import { IndiceDeSecciones } from '../bloques/IndiceDeSecciones';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { Totales } from '../bloques/Totales';
import { Versionado } from '../bloques/Versionado';
import { ResumenDeFicha } from './ResumenDeFicha';
import { esCodigoDeReferenciaCatastral } from './codigo';
import { CONSTRUCCIONES, TablaDePisos, filaDeConstruccionLeida } from './TablaDePisos';

/**
 * **Una sola ficha del predio**: las cuatro fichas catastrales y la
 * actualizacion, en una superficie con cinco pestanas constantes (propuesta A de
 * `design/propuestas/catastro`).
 *
 * Cuatro fichas del mismo objeto con cuatro formas, cinco barras de filtros para
 * buscar el mismo predio y una pantalla gemela que repetia dos de sus pestanas
 * con otro vocabulario. Aqui son **una** superficie: Identificacion · Ubicacion
 * · Titularidad · Valorizacion · Uso y servicios.
 *
 * **Lo que no cambia**: las cinco rutas siguen siendo cinco, cada una con su id,
 * su entrada de menu y **su permiso**. La modalidad que abre la decide la ruta y
 * cambiar de modalidad **navega**, igual que en `Territorio.tsx` (propuesta C) y
 * `CuadroDeValuacion.tsx` (propuesta B), y por los mismos dos motivos: el enlace
 * de lo que se esta mirando se puede compartir (FRO-04 §5) y el permiso lo sigue
 * decidiendo el guardia de `Pantalla`, que corre al entrar por la ruta. La chip
 * de una modalidad que este perfil no puede ver **no se dibuja**: seria un
 * enlace a un aviso de «no tienes permiso».
 *
 * **Las doce secciones del prototipo se conservan letra por letra** (RNF-080):
 * se reagrupan, no se reescriben. Ninguna sale de aqui —todas se leen del
 * catalogo portado, por la opcion que las declara y su rotulo—, asi que el dia
 * que el prototipo cambie una etiqueta, cambia aqui sola.
 *
 * **Lo unico que cambia con la modalidad** es Valorizacion —pisos, areas comunes
 * o grupos de tierra— y el bloque de actividad economica dentro de Uso y
 * servicios. Identificacion, Ubicacion y Titularidad son **del predio** y no se
 * repiten por modalidad: cuando la modalidad activa no es la urbana, esas tres
 * pestanas lo dicen.
 *
 * <h2>Con que identificador se abre, que es lo que hubo que comprobar</h2>
 *
 * **Las cuatro se abren con el mismo: el codigo de referencia catastral del
 * predio.** No es una decision de esta pantalla, es lo que hace el backend, y
 * conviene citarlo entero porque el catalogo dice otra cosa:
 *
 * > «Las rutas nombran el parametro de tres maneras —`codRefCatastral`,
 * > `codEdificacion`, `codUnidad`— y las tres reciben lo mismo: el codigo de
 * > referencia catastral. La edificacion en propiedad exclusiva y comun y la
 * > unidad catastral rural son predios del padron, con su propio codigo; no
 * > hacen falta dos numeraciones mas.» (`FichaController`, y lo repite
 * > `ActualizacionController`.)
 *
 * Y se ve en el codigo: los cuatro metodos llaman a `leer(codigo, tipo, …)`, que
 * empieza por `predioDe(codigo)`; el alta de los cuatro tipos recibe **un**
 * `PeticionDeAlta.codRefCatastral`. No hay tres numeraciones que derivar unas de
 * otras: hay una, con tres nombres de parametro heredados del prototipo.
 *
 * De ahi sale la regla de las chips, y **no se ofrece nada que lleve a un 404**:
 *
 * - si el identificador con el que se abrio **es** un codigo de referencia
 *   catastral —solo digitos, y no mas largo que la plantilla—, las cuatro
 *   modalidades se ofrecen con **ese mismo codigo**;
 * - si no lo es, se ofrece solo la que esta abierta y las otras tres se dibujan
 *   **apagadas con su motivo**. Ese caso es real y es el del prototipo: la
 *   pantalla rural se abre por su unidad catastral —`11024-0418`, con guion—,
 *   que no es un codigo de referencia catastral y con la que `predioDe` no
 *   encuentra ningun predio.
 *
 * Lo que **no** se puede saber antes de preguntar es si este predio tiene ficha
 * de esa modalidad: `FichaResource` no publica que tipos tiene, y el backend
 * contesta `NO_ENCONTRADO` cuando no la hay. Por eso la chip se ofrece y la
 * respuesta se ensena tal cual; adivinarlo aqui seria apagar una modalidad que
 * si existe, o prometer una que no.
 *
 * <h2>La actualizacion es el modo de edicion de Valorizacion</h2>
 *
 * `actualizacion_catastro` deja de ser una pantalla gemela. Con ello muere **el
 * vocabulario divergente por construccion**: el prototipo escribe `03 — ADOBE`
 * en la ficha y `03 — ADOBE / TAPIA` en la actualizacion, `01 — VIVIENDA` frente
 * a `01 — CASA HABITACION`, y los acabados son un desplegable A–G en una y texto
 * libre en la otra. Al haber una sola pestana Valorizacion, queda **un solo
 * vocabulario: el de la ficha**, que es el que valida.
 *
 * Lo que la edicion **no** pierde: `useEscritura` sigue siendo el camino, la
 * lista blanca por columna sigue viviendo en `pantallas/escrituras.ts`, y **la
 * observacion del usuario sigue siendo obligatoria** antes de habilitar la
 * primaria (regla 10, RNF-052).
 *
 * **Y se dice en la pantalla, no solo aqui** (#413). El artboard dibuja sobre la
 * tabla de pisos el bloque que explica esta fusion, y faltaba: quien abre la
 * ficha urbana no tenia forma de saber que Valorizacion es donde se edita ni por
 * que el vocabulario dejo de ser doble, porque eso vivia en este docblock —que
 * es justo donde no lo lee quien atiende—. Va **solo en la modalidad urbana**
 * —la que la actualizacion versiona— y **solo fuera del modo edicion**: dentro
 * ya esta el aviso de que guardar reemplaza la lista de pisos.
 *
 * **Ninguna cifra de valuacion se compone aqui** (D-02, RNF-083, regla 5):
 * arancel, valor del terreno, autovaluo y valor de obra salen «—», como ya
 * salian. Y `FichaResource` publica quince campos donde el prototipo dibuja
 * noventa: el resto sale «—», y que se vea el hueco dice que falta y a quien le
 * toca.
 *
 * <h2>Un solo vocabulario de accion (#391 §2)</h2>
 *
 * Cinco pantallas del mismo objeto y cinco vocabularios. La regla que las
 * uniforma vive en `pantallas/actos.ts` —{@link accionesDeLaBarra}— y es de
 * mecanismo, no de renombrado: **una primaria por pantalla, siempre la ultima y
 * siempre la que escribe; lo que no escribe es secundario y va a su izquierda;
 * y una pantalla sin ninguna accion que escriba no tiene primaria**. Los rotulos
 * se conservan letra por letra (RNF-080). Lo que sale de cada una:
 *
 *   ficha_urbana           «Nuevo» (el alta guiada de #320, que es el acto
 *                          mientras no haya predio abierto) y «Imprimir».
 *                          «Modificar» y «Deshacer» son modos y se van; su
 *                          «Guardar» tambien, porque `GET /catastro/fichas/…`
 *                          no puede guardar ni el dia que llegue el backend.
 *                          Con predio abierto la primaria es el enlace
 *                          «Actualizar catastro», como desde #319
 *   ficha_economica        «Imprimir», y la misma primaria de enlace. Su
 *                          «Nuevo» **se va**: el alta guiada la declara la
 *                          modalidad urbana —es la que se abre por el codigo de
 *                          referencia catastral (`catastro/composicion.ts`)—, y
 *                          aqui era un boton que no abria ningun formulario
 *   ficha_bienes           «Distribuir valor», secundaria: ensena un reparto
 *                          **antes** de escribir, y ese reparto es D-02a —el
 *                          total de bienes comunes sale «—»—. Ninguna primaria
 *   ficha_rural            «Calcular» y «Imprimir ficha rural», las dos
 *                          secundarias. Ninguna primaria: esta era la ficha
 *                          donde el boton navy imprimia
 *   actualizacion_catastro «Imprimir» y, al final, «Guardar»: la unica de las
 *                          cinco que escribe. «Nuevo» se va (su alta es la de la
 *                          urbana) y «Quitar» tambien —es un modo, y ademas ya
 *                          existe **por fila** en `TablaDePisos`, con su
 *                          `aria-label` propio: «Quitar el piso 02»—
 *
 * Y **lo que la barra no pierde**: la observacion sigue siendo la condicion de
 * guardado de la actualizacion (regla 10, RNF-052), con su franja y el
 * `aria-describedby` de la primaria. Reordenar no adelanta nada.
 *
 * <h2>Un solo buscador del predio (#391 §3)</h2>
 *
 * **Se busca en un sitio —«Consulta de fichas»—; una ficha se abre por su
 * ruta.** Las cinco dibujaban cada una su barra de filtros y encima estaba la de
 * la consulta: seis formas de buscar el mismo predio.
 *
 * Lo que queda no es «ninguna barra», porque eso obligaria a un rodeo por otra
 * pantalla para teclear un numero que ya se tiene en la mano:
 *
 * - **sin predio abierto**, el campo que **abre** la ficha y nada mas —el
 *   compositor de tramos (`CodigoCatastral`) donde la opcion lo declara, y el
 *   `Campo` del catalogo donde no (ver {@link CAMPO_QUE_ABRE})— con un enlace a
 *   «Consulta de fichas» para todo lo demas;
 * - **con predio abierto**, ninguna barra de busqueda: el predio esta en la
 *   ruta, y volver a preguntarlo encima de la ficha que se esta leyendo es la
 *   sexta forma de buscar lo mismo.
 *
 * **Los filtros que dejan de dibujarse siguen en el catalogo generado y no se
 * borran** (`catastro.generado.ts` no se edita a mano): `codContribuyenteRentas`,
 * `nroFicha` y `uso` en la urbana; `contribuyente` y `ciiu` en la economica;
 * `denominacion` en la de bienes; `contribuyente` y `valleSector` en la rural; y
 * `nDeFicha`, `sector` y `tipoDeActualizacion` en la actualizacion. Ninguno se
 * pierde por el camino, porque **ninguno viajaba**: la conexion de las cuatro
 * fichas manda `codRefCatastral`/`codEdificacion`/`codUnidad` —de la ruta—,
 * `historico` y `fecha`, y nada mas (`catastro/index.ts`). Lo que si busca por
 * ellos es «Consulta de fichas», que es a donde lleva el enlace.
 */

const URBANA = 'ficha_urbana';
const ECONOMICA = 'ficha_economica';
const BIENES = 'ficha_bienes';
const RURAL = 'ficha_rural';
const ACTUALIZACION = 'actualizacion_catastro';

/** Las cuatro modalidades de la ficha del predio, en el orden del artboard. */
export type Modalidad = 'urbana' | 'economica' | 'bienes' | 'rural';

/** Cada opcion del catalogo, en la modalidad que abre. La actualizacion edita la urbana. */
const MODALIDAD_DE: Readonly<Record<string, Modalidad>> = {
  [URBANA]: 'urbana',
  [ECONOMICA]: 'economica',
  [BIENES]: 'bienes',
  [RURAL]: 'rural',
  [ACTUALIZACION]: 'urbana',
};

/** La opcion del catalogo de cada modalidad: su ruta, su titulo y su permiso. */
const OPCION_DE: Readonly<Record<Modalidad, string>> = {
  urbana: URBANA,
  economica: ECONOMICA,
  bienes: BIENES,
  rural: RURAL,
};

const MODALIDADES: readonly Modalidad[] = ['urbana', 'economica', 'bienes', 'rural'];

/** Como se rotula cada modalidad en el conmutador. Del artboard, corto y sin repetir «Ficha». */
const ROTULO_DE: Readonly<Record<Modalidad, string>> = {
  urbana: 'Urbana',
  economica: 'Económica',
  bienes: 'Bienes comunes',
  rural: 'Rural',
};

export type Pestana = 'identificacion' | 'ubicacion' | 'titularidad' | 'valorizacion' | 'uso';

/** Las cinco, constantes para las cuatro modalidades. */
export const PESTANAS: readonly { readonly id: Pestana; readonly label: string }[] = [
  { id: 'identificacion', label: 'Identificación' },
  { id: 'ubicacion', label: 'Ubicación' },
  { id: 'titularidad', label: 'Titularidad' },
  { id: 'valorizacion', label: 'Valorización' },
  { id: 'uso', label: 'Uso y servicios' },
];

/** Las tres que son del predio y no se repiten por modalidad. */
const DEL_PREDIO: ReadonlySet<Pestana> = new Set<Pestana>([
  'identificacion',
  'ubicacion',
  'titularidad',
]);

/**
 * Una seccion del prototipo, **por la opcion que la declara y su rotulo**.
 *
 * Se referencian y no se copian: el texto de una seccion —su rotulo, sus campos,
 * las opciones de cada desplegable— vive en `catastro.generado.ts`, que se
 * regenera con `yarn portar-catalogo` y no se edita a mano. Copiarlas aqui las
 * dejaria congeladas en la version del dia que se copiaron, que es exactamente
 * lo que RNF-080 prohibe.
 */
interface Referencia {
  readonly opcion: string;
  readonly label: string;
}

const SERVICIOS: Referencia = { opcion: URBANA, label: 'Servicios básicos del predio' };
const ARBITRIOS: Referencia = { opcion: URBANA, label: 'Datos para el cálculo de arbitrios' };

/**
 * El reparto: que secciones del prototipo lleva cada pestana.
 *
 * Las tres primeras son **del predio** y salen de la ficha urbana en las cuatro
 * modalidades: es la unica que las declara, y son las mismas para un predio
 * urbano, uno rural o una edificacion en propiedad exclusiva y comun.
 */
const COMUNES: Readonly<
  Record<'identificacion' | 'ubicacion' | 'titularidad', readonly Referencia[]>
> = {
  identificacion: [
    { opcion: URBANA, label: 'Ficha catastral urbana individual' },
    { opcion: URBANA, label: 'Información complementaria' },
    { opcion: URBANA, label: 'Notas de la ficha' },
  ],
  ubicacion: [
    { opcion: URBANA, label: 'Ubicación del predio catastral' },
    { opcion: URBANA, label: 'Localización' },
  ],
  titularidad: [
    { opcion: URBANA, label: 'Características de la titularidad' },
    { opcion: URBANA, label: 'Titulares registrados' },
    { opcion: URBANA, label: 'Ocupantes no propietarios' },
  ],
};

/**
 * Valorizacion, la pestana que **si** cambia con la modalidad.
 *
 * La economica valoriza lo mismo que la urbana —es una actividad dentro de un
 * predio urbano, no otro predio—, y por eso comparten las dos secciones y la
 * tabla de pisos. Lo suyo esta en «Uso y servicios».
 *
 * **La seccion «Características de construcción — piso 01» no se dibuja como
 * tarjeta**: sus campos son las columnas de la tabla de pisos. El prototipo la
 * dibuja para **un** piso —lo dice su propio rotulo— y la tabla la generaliza a
 * todos, que es exactamente lo que hace la pantalla de actualizacion con la
 * misma informacion.
 */
const VALORIZACION: Readonly<Record<Modalidad, readonly Referencia[]>> = {
  urbana: [
    { opcion: URBANA, label: 'Obras complementarias' },
    { opcion: URBANA, label: 'Áreas legal y física' },
  ],
  economica: [
    { opcion: URBANA, label: 'Obras complementarias' },
    { opcion: URBANA, label: 'Áreas legal y física' },
  ],
  bienes: [{ opcion: BIENES, label: 'Bienes comunes de la edificación' }],
  rural: [
    { opcion: RURAL, label: 'Identificación del predio rústico' },
    { opcion: RURAL, label: 'Tierras y valuación' },
  ],
};

/**
 * Uso y servicios: las dos del predio, y **delante** el bloque de actividad
 * economica cuando esa es la modalidad.
 *
 * El artboard, en la modalidad economica, deja fuera «Datos para el cálculo de
 * arbitrios». No se sigue ahi, y el motivo es la frase que el propio README de
 * la propuesta escribe: «lo unico que cambia con la modalidad es Valorizacion y
 * **el bloque de actividad economica** dentro de Uso y servicios». Un bloque que
 * se anade no es una seccion del predio que desaparece: los datos de arbitrios
 * son del predio, y esconderlos en una modalidad los volveria inalcanzables
 * desde su propia ruta.
 */
const USO: Readonly<Record<Modalidad, readonly Referencia[]>> = {
  urbana: [SERVICIOS, ARBITRIOS],
  economica: [{ opcion: ECONOMICA, label: 'Actividad económica' }, SERVICIOS, ARBITRIOS],
  bienes: [SERVICIOS, ARBITRIOS],
  rural: [SERVICIOS, ARBITRIOS],
};

/**
 * La tabla de cada modalidad en Valorizacion, **por la opcion cuyo catalogo la
 * declara**.
 *
 * - urbana y economica: la de `actualizacion_catastro` —«Versiones registradas
 *   por piso»—, que es la tabla de pisos del prototipo con sus dieciseis
 *   columnas. **No la de `ficha_urbana`**, que es la de direcciones del predio:
 *   `FichaResource` no publica direcciones, asi que sus filas llevaban desde
 *   siempre las construcciones bajo las cabeceras «Nombre Calle», «Tipo Vía»…
 *   Una tabla con cabeceras de una cosa y datos de otra es peor que un hueco;
 * - bienes: la suya, «Unidades que participan»;
 * - rural: **ninguna**. El artboard dibuja «Grupos de tierra», y `ficha_rural`
 *   no declara tabla en el catalogo: inventarle columnas seria escribir texto
 *   de pantalla que el manual no tiene (RNF-080). Lo que se ve de las tierras es
 *   lo que ya se veia, en la seccion «Tierras y valuación».
 */
const TABLA_DE: Readonly<Record<Modalidad, string | undefined>> = {
  urbana: ACTUALIZACION,
  economica: ACTUALIZACION,
  bienes: BIENES,
  rural: undefined,
};

/**
 * La pestana que llega abierta: **la que lleva lo propio de la opcion**.
 *
 * Abrir «Ficha catastral rural» y caer en una rejilla de campos del predio
 * —todos «—», porque `FichaResource` publica quince de noventa— seria abrir otra
 * pantalla. Cada una abre donde esta lo suyo, que ademas es lo que cada una de
 * las cuatro fichas ensenaba al abrirse antes de esta superficie.
 *
 * **Va por opcion y no por modalidad**, y esa es la diferencia que importa:
 * `ficha_urbana` y `actualizacion_catastro` son las dos la modalidad urbana y
 * no abren en el mismo sitio. La ficha abre en su primera pestana —quien la
 * abre viene a ver la ficha—; la actualizacion abre en Valorizacion, porque
 * **es** el modo de edicion versionada de esa pestana y no otra cosa.
 */
const PESTANA_INICIAL: Readonly<Record<string, Pestana>> = {
  [URBANA]: 'identificacion',
  [ECONOMICA]: 'uso',
  [BIENES]: 'valorizacion',
  [RURAL]: 'valorizacion',
  [ACTUALIZACION]: 'valorizacion',
};

/**
 * El campo de busqueda que **abre un predio** en cada opcion.
 *
 * Los cinco catalogos lo dibujan con el nombre que su pantalla del manual le da
 * —«Código de Ref. Catastral», «Cod. Edificación», «Cod. Unidad Catastral (UC)»,
 * «Cod. Ref. Catastral»— y los cinco reciben lo mismo. Se declara por opcion en
 * vez de deducirse («el primer filtro») porque de eso depende a donde navega
 * «Buscar»: equivocarse abriria el predio de otro.
 */
const CAMPO_QUE_ABRE: Readonly<Record<string, string>> = {
  [URBANA]: 'codigoDeRefCatastral',
  [ECONOMICA]: 'codigoDeRefCatastral',
  [BIENES]: 'codEdificacion',
  [RURAL]: 'codUnidadCatastralUc',
  [ACTUALIZACION]: 'codRefCatastral',
};

/** El que el prototipo trae elegido: la mayoría de las actualizaciones vienen de una DJ. */
const ORIGEN_POR_OMISION = 'DECLARACION_JURADA';

const ORIGENES = ['DECLARACION_JURADA', 'FISCALIZACION', 'RESOLUCION', 'MIGRACION'];

/** Lo que se dice en las tres pestanas del predio cuando la modalidad no es la urbana. */
const SIN_REPETIR =
  'Identificación, ubicación y titularidad son las del predio: esta ficha no las repite ni admite una versión propia de ellas. Se editan una vez, en un solo sitio.';

export function FichaDelPredio({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const navegar = useNavigate();
  const { moduloId = '', ranura = '', codigo } = useParams();
  const [busqueda, fijarBusqueda] = useSearchParams();

  const edicion = estructura.id === ACTUALIZACION;
  const modalidad = MODALIDAD_DE[estructura.id] ?? 'urbana';
  // La actualizacion **lee la ficha urbana**: es la que versiona
  // (`TipoFicha.UNICA`), y asi la superficie hace una peticion y no dos.
  const opcionQueLee = edicion ? URBANA : estructura.id;

  /* El catalogo del modulo, de la misma consulta que ya resolvio `Pantalla`:
     misma clave, `staleTime` infinito, cero peticiones de mas. Hace falta entero
     porque las tres pestanas del predio se leen de `ficha_urbana` **este cual
     sea la modalidad abierta**, y la tabla de pisos, de la actualizacion. */
  const pantallas = useQuery({
    queryKey: ['catalogo', 'catastro'],
    queryFn: () => pantallasDelModulo('catastro'),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { consulta, falta } = useDatosDeOperacion(conexionDeLaFicha(opcionQueLee));

  /* La pestana abierta vive en la URL (#498 F4). Con `useState`, el enlace de
     «la titularidad de este predio» abria la ficha en Identificacion y recargar
     la perdia. Una pestana que no existe cae en la inicial de la opcion: la
     direccion la teclea gente, y `?pestana=titularida` no puede dejar la ficha
     en blanco. */
  const pestanaPedida = busqueda.get(PESTANA);
  const pestana: Pestana = PESTANAS.some((una) => una.id === pestanaPedida)
    ? (pestanaPedida as Pestana)
    : (PESTANA_INICIAL[estructura.id] ?? 'identificacion');
  const fijarPestana = (una: Pestana): void =>
    fijarBusqueda(conCambio(busqueda, { [PESTANA]: una }), { replace: true });
  const [cerradas, fijarCerradas] = useState<Readonly<Record<string, boolean>>>({});
  /* El alta guiada abierta vive en la URL y no aqui (#498 F2), igual que en el
     renderizador comun. **Hay dos copias de este estado a proposito** —esta
     pantalla sustituye al renderizador para las cinco opciones del predio—, y
     esa es justo la razon por la que hubo que cambiar las dos: el boton
     «Registrar predio» del panel apunta a `ficha_urbana`, que se dibuja aqui.
     Cambiar solo la del renderizador dejaba el boton llevando a la pantalla con
     `?nuevo=1` en la barra de direcciones y el asistente sin abrir. */
  const flujoAbierto = busqueda.get(NUEVO) === '1';
  const fijarFlujoAbierto = (abierto: boolean): void =>
    fijarBusqueda(conCambio(busqueda, { [NUEVO]: abierto ? '1' : undefined }), { replace: true });
  const [sembrada, fijarSembrada] = useState(false);

  const composicion = composicionDe(estructura.id);

  // Al cerrar el alta guiada, el foco vuelve a la accion que la abrio: el flujo
  // **sustituye** la pantalla, asi que al volver no hay nada enfocado y quien
  // navega con teclado se queda en el principio del documento (FRO-04, RNF-082).
  // Es el mismo gancho que usa el renderizador comun; mudar el flujo aqui sin
  // el lo perdia, y hay una prueba de `alta-guiada-de-ficha.test.tsx` que lo dice.
  useFocoEnLaAccion(composicion.flujo?.accion, flujoAbierto);
  const declarada = escrituraDe(ACTUALIZACION);
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const puedeRegistrarAqui = catalogo.puedeRegistrar(estructura.id);

  const escritura = useEscritura(
    // Solo la actualizacion escribe. Las cuatro fichas son `GET`: sin operacion
    // no hay a donde escribir, y la barra se dibuja como se dibujaba.
    edicion && puedeEscribirAqui ? ACTUALIZACION : undefined,
    codigo === undefined ? {} : { codigo },
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      /* **Mientras no esten sembrados los pisos, no se guarda** (#71). La barra
         se dibuja desde el primer render —tambien durante la carga—, y en ese
         momento la tabla esta vacia: guardar ahi mandaba `construcciones: []`,
         que en este verbo no es «no lo se» sino «ningun piso», y borraba las
         construcciones del predio sin que nadie lo pidiera. */
      exigir: (borrador) =>
        !sembrada
          ? 'Todavía se están leyendo los pisos de la versión vigente: guardar ahora los borraría.'
          : (borrador['documentoOrigen'] ?? '').trim() === ''
            ? 'Falta el documento de origen (acta, resolución o declaración jurada).'
            : undefined,
    },
  );

  const datos = consulta.data;

  // Se siembra una sola vez, con los pisos de la version vigente. Los valores
  // **crudos** de la tabla, no sus celdas: una celda es texto de presentacion.
  if (edicion && !sembrada && datos !== undefined) {
    fijarSembrada(true);
    escritura.fijarFilas(
      CONSTRUCCIONES,
      (datos.tabla?.valores ?? []).map((fila) =>
        filaDeConstruccionLeida({
          piso: fila['piso'] ?? '',
          areaConstruida: fila['areaConstruida'] ?? '',
          categorias: fila['categorias'] ?? '',
        }),
      ),
    );
    escritura.fijarCampo('origen', ORIGEN_POR_OMISION);
  }

  /* **Lo que la pantalla siembra sola**, y que por tanto NO es un cambio del
     usuario (#498 F3). Sin esta lista, «Cambios sin guardar» sale encendido en
     cuanto se abre la ficha —se comprobo: `data-sin-guardar="1"` sin tocar
     nada—, y un aviso siempre encendido no dice nada. */
  const SEMBRADOS = ['origen'];

  const estado = estadoDePantalla(consulta, falta);

  /* El error, el sin permiso y el no disponible son de la superficie entera, y
     **ninguno dibuja la estructura** (FRO-01 §7, REQ-03 §5): ni las chips, ni
     las pestanas, ni las secciones que hay detras. */
  if (estado === 'sin-permiso') {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }
  if (estado === 'no-disponible') {
    return <Aviso titulo={NO_DISPONIBLE.titulo} detalle={NO_DISPONIBLE.detalle} />;
  }
  if (estado === 'error') {
    const texto = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza}>
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  // El alta guiada **sustituye a la superficie** mientras dura: son cuatro pasos
  // que validan contra el territorio (#320). Solo con privilegio de registro.
  if (flujoAbierto && composicion.flujo !== undefined && puedeRegistrarAqui) {
    const Asistente = composicion.flujo.Asistente;
    return (
      <Suspense fallback={<Esqueleto alto={320} />}>
        <Asistente titulo={composicion.flujo.titulo} onCerrar={() => fijarFlujoAbierto(false)} />
      </Suspense>
    );
  }

  const cargando = consulta.isPending && falta === undefined;
  const busquedaActiva = leerBusqueda(busqueda);
  // **Un solo campo de busqueda, y solo sin predio abierto** (#391 §3): el que
  // abre la ficha. Los demas que el catalogo declara no se dibujan aqui —viven
  // en «Consulta de fichas», y desde estas cinco pantallas no viajaban nunca—.
  const abre = CAMPO_QUE_ABRE[estructura.id];
  const campoQueAbre = (filtrosDe(estructura.id, estructura.filtros) ?? []).filter(
    (campo) => campo.clave === abre,
  );
  const sinPredio = codigo === undefined || codigo === '';
  const aviso = avisoDe(estructura.id);
  const enValorizacion = pestana === 'valorizacion';
  // La barra con un solo vocabulario (#391 §2). El alta se le pasa **solo si
  // esta pantalla la declara**: sin ella, «Nuevo» es un boton que no abre nada.
  const barra = accionesDeLaBarra(
    estructura.id,
    estructura.acciones ?? [],
    composicion.flujo === undefined ? [] : [composicion.flujo.accion],
  );

  const secciones = seccionesDeLaPestana(modalidad, pestana, pantallas.data ?? {});
  const tablaDeLaPestana = enValorizacion
    ? tablaDeLaModalidad(modalidad, pantallas.data ?? {})
    : undefined;
  const totales = enValorizacion && modalidad === 'bienes' ? estructura.totales : undefined;
  const anclaDe = (indice: number): string => `sgtm-seccion-${pestana}-${indice}`;

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <FechaDeCalculo {...(datos?.fechaCalculo ? { fecha: datos.fechaCalculo } : {})} />

      {/* La nota permanente de esta opcion: `tipo="nota"`, que es una franja
          compacta y no el bloque centrado del vacio. Con la forma del vacio,
          las veinte notas del sistema se dibujaban como si la pantalla no
          tuviera nada que ensenar, encima justo de lo que si tenia. */}
      {aviso !== undefined && <Aviso tipo="nota" titulo={aviso.titulo} detalle={aviso.detalle} />}

      <ResumenDeFicha
        {...(codigo === undefined ? {} : { codigo })}
        {...(datos === undefined ? {} : { datos })}
        cargando={cargando}
        /* Si hay algo tecleado y sin mandar (#498 F3). Se **deriva** del
           borrador de `useEscritura` en vez de guardarse aparte: con dos
           verdades sobre lo mismo, la que se lee acaba siendo la que nadie
           recalculo. Solo se declara cuando esta pantalla puede escribir; en
           modo lectura no hay borrador que perder y la cabecera no habla de
           guardar. */
        {...(puedeEscribirAqui
          ? {
              sinGuardar:
                Object.keys(escritura.borrador).some((campo) => !SEMBRADOS.includes(campo)) ||
                escritura.observacion.trim() !== '',
            }
          : {})}
        opcion={estructura.id}
        busqueda={busqueda}
      />

      {(datos?.versionado !== undefined || cargando) && (
        <Versionado
          {...(datos?.versionado ? { datos: datos.versionado } : {})}
          cargando={cargando}
        />
      )}

      {estado === 'sin-registro' && (
        <Aviso
          titulo="Elige un predio para abrir su ficha"
          detalle={`Esta superficie abre un predio por su «${falta}». Compónlo en la búsqueda de abajo, encuéntralo en «Consulta de fichas» o pega el enlace: el predio abierto va en la dirección, así que ese enlace se puede compartir.`}
        />
      )}

      {sinPredio && campoQueAbre.length > 0 && (
        <BuscadorDelPredio
          opcion={estructura.id}
          campos={campoQueAbre}
          buscado={busquedaActiva.filtros}
          cargando={consulta.isFetching}
          onBuscar={(valores) => {
            const siguiente = conCambio(new URLSearchParams(busqueda), {
              ...vaciar(busquedaActiva.filtros),
              ...valores,
              [PAGINA]: undefined,
            });
            /* Buscar por el codigo del predio **abre ese predio**: se va a su
               ruta, no a una lista filtrada. Es lo que el renderizador comun ya
               hace cuando se busca por el identificador del registro, y aqui
               hacia falta declararlo porque el filtro del prototipo se llama
               distinto que el parametro de la ruta —«codigoDeRefCatastral» y
               `codRefCatastral`—, asi que la coincidencia por nombre no casaba y
               «Buscar» no abria nada. */
            const elegido = abre === undefined ? undefined : valores[abre];
            if (abre !== undefined && elegido !== undefined && elegido !== '') {
              siguiente.delete(abre);
              const cola = siguiente.toString();
              navegar(
                `/${moduloId}/${ranura}/${encodeURIComponent(elegido)}${cola === '' ? '' : `?${cola}`}`,
              );
              return;
            }
            fijarBusqueda(siguiente);
          }}
        />
      )}

      <Conmutador
        modalidad={modalidad}
        codigo={codigo ?? ''}
        puedeVer={(opcion) => catalogo.puedeVer(opcion)}
      />

      <div className="sgtm-pestanas" role="tablist" aria-label="Pestañas de la ficha del predio">
        {PESTANAS.map((una) => (
          <button
            key={una.id}
            type="button"
            role="tab"
            aria-selected={una.id === pestana}
            className="sgtm-pestanas__tab"
            data-activa={una.id === pestana ? '1' : '0'}
            onClick={() => {
              fijarPestana(una.id);
              fijarCerradas({});
            }}
          >
            {una.label}
          </button>
        ))}
      </div>

      {/* «Sin repetir»: las tres pestanas del predio son las mismas en las
          cuatro modalidades, y decirlo es la mitad de por que esta superficie
          existe. */}
      {DEL_PREDIO.has(pestana) && modalidad !== 'urbana' && (
        <Aviso titulo="Sin repetir" detalle={SIN_REPETIR} />
      )}

      {/* **Donde vive la actualizacion, dicho donde se lee** (#413, propuesta A).
          El artboard lo dibuja encima de la tabla de pisos y en el codigo no
          estaba: la fusion que este refactor hizo se explicaba en el docblock,
          que es exactamente donde no la lee quien atiende.

          **Solo sin editar**: en el modo edicion ya hay un aviso —el de que
          guardar reemplaza la lista de pisos—, y dos seguidos son ruido; quien
          esta editando ademas ya sabe donde esta. **Y solo en la urbana**: es la
          modalidad que `actualizacion_catastro` versiona (`TipoFicha.UNICA`),
          asi que decirlo en la economica, en bienes comunes o en la rural
          mandaria a editar una ficha que no es la que se esta mirando. */}
      {!edicion && enValorizacion && modalidad === 'urbana' && (
        <Aviso
          titulo="Aquí se actualiza la ficha"
          detalle={`Esta pestaña es donde se corrige lo construido${
            composicion.acto === undefined ? '' : `, con «${composicion.acto.etiqueta}»`
          }: cada corrección guarda una versión nueva y la anterior queda en el histórico, con quién la hizo y por qué. Antes eso se hacía en otra pantalla, que nombraba de otra manera los materiales y los acabados —«03 — ADOBE» aquí y «03 — ADOBE / TAPIA» allí—; ahora se eligen de una sola lista, la que vale.`}
        />
      )}

      {edicion && enValorizacion && (
        <Aviso
          titulo="Guardar reemplaza la lista completa de pisos"
          detalle="La versión nueva lleva exactamente los pisos que estén en la tabla de abajo. Se cargaron los de la versión vigente: si quitas uno, la ficha nueva no lo tendrá."
        />
      )}

      {edicion && enValorizacion ? (
        <TablaDePisos escritura={escritura} cargando={cargando} />
      ) : (
        tablaDeLaPestana !== undefined && (
          <TablaDePantalla
            estructura={tablaDeLaPestana}
            opcion={estructura.id}
            {...(datos?.tabla === undefined ? {} : { datos: datos.tabla })}
            cargando={cargando}
            ancla={ANCLA_DE_LA_TABLA}
          />
        )
      )}

      {totales && <Totales estructura={totales} datos={datos?.totales} cargando={cargando} />}

      {secciones.length > 0 && (
        <div className="sgtm-conindice">
          <IndiceDeSecciones
            secciones={secciones}
            anclaDe={anclaDe}
            haciaLasAcciones={(estructura.acciones ?? []).length > 0}
            {...(tablaDeLaPestana !== undefined && !edicion
              ? // El rotulo es el del catalogo, no uno redactado aqui (RNF-080).
                { previa: { rotulo: tablaDeLaPestana.title, ancla: ANCLA_DE_LA_TABLA } }
              : {})}
          />
          <div className="sgtm-conindice__panel">
            <Formulario
              opcion={estructura.id}
              secciones={secciones}
              valores={datos?.campos ?? {}}
              cargando={cargando}
              cerradas={cerradas}
              pestana={PESTANAS.findIndex((una) => una.id === pestana)}
              onAlternar={(clave, cerrada) =>
                fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
              }
              anclaDe={anclaDe}
            />
          </div>
        </div>
      )}

      {edicion && enValorizacion && puedeEscribirAqui && (
        <section className="sgtm-tarjeta">
          <div className="sgtm-tarjeta__cabecera">
            <h2 className="sgtm-tarjeta__titulo">De dónde sale esta versión</h2>
          </div>
          <CampoDeclarado
            escritura={escritura}
            campo="origen"
            etiqueta="Origen"
            tipo="sel"
            opciones={ORIGENES}
          />
          <CampoDeclarado
            escritura={escritura}
            campo="documentoOrigen"
            etiqueta="Documento de origen"
            ph="Acta de inspección, resolución o declaración jurada"
          />
          <CampoDeclarado
            escritura={escritura}
            campo="vigenciaDesde"
            etiqueta="Vigente desde"
            tipo="date"
            // Un `input[type=date]` **no pinta el `placeholder`**: dibuja su
            // propia mascara. La indicacion va debajo del campo o no existe.
            ayuda="Sin fecha, rige desde hoy."
          />
        </section>
      )}

      {edicion
        ? /* La barra de la edicion sale del mismo mecanismo que las otras cuatro:
             el catalogo dibuja «Nuevo · Guardar · Imprimir · Quitar» y la ultima
             seria la primaria (FRO-03 §5), o sea «Quitar» —un modo—. Uniformada
             queda «Imprimir · Guardar», con la que escribe al final. Solo en
             Valorizacion, que es la pestana que edita. */
          enValorizacion &&
          barra.acciones.length > 0 && (
            <BarraDeAcciones acciones={barra.acciones} escritura={escritura} />
          )
        : barra.acciones.length > 0 && (
            <BarraDeAcciones
              acciones={barra.acciones}
              /* Ninguna de las suyas escribe: las cuatro fichas son `GET`. La
                 primaria, cuando la hay, es el alta o el enlace —los dos llevan
                 a un sitio donde si se escribe—, nunca un «Imprimir». */
              {...(barra.conPrimaria ? {} : { sinPrimaria: true as const })}
              {...(puedeRegistrarAqui && composicion.flujo !== undefined
                ? { altas: { [composicion.flujo.accion]: () => fijarFlujoAbierto(true) } }
                : {})}
              {...(composicion.acto !== undefined && codigo !== undefined && codigo !== ''
                ? {
                    enlace: {
                      etiqueta: composicion.acto.etiqueta,
                      ruta: composicion.acto.rutaDe(codigo),
                    },
                  }
                : {})}
            />
          )}
    </>
  );
}

/** El ancla de la tabla, para el indice de secciones. Una sola por pestana. */
const ANCLA_DE_LA_TABLA = 'sgtm-tabla-de-la-pantalla';

/**
 * **El unico buscador que le queda a la ficha** (#391 §3): el campo que la abre,
 * y un enlace a donde se busca de verdad.
 *
 * No es una barra de filtros recortada: es otra cosa con la misma forma. Los
 * cuatro o cinco campos del prototipo prometian acotar una ficha —«Uso»,
 * «Contribuyente», «Nº de ficha»— y ninguno viajaba: la conexion de las cuatro
 * fichas manda el codigo de la ruta, `historico` y `fecha`. Lo que si abre un
 * predio es **uno** de esos campos, y es el que se queda.
 *
 * Se dibuja con `Filtros` y no con un control propio a proposito: asi el rotulo
 * sigue siendo el del catalogo (RNF-080) —«Código de Ref. Catastral», «Cod.
 * Unidad Catastral (UC)»—, el compositor de tramos sigue saliendo de
 * `widgetsDeFiltro` donde la opcion lo declara, y un enlace compartido con el
 * codigo en la URL sigue llegando normalizado al campo. Las dos fichas que no
 * declaran compositor —bienes comunes y rural— dibujan su `Campo` de texto, que
 * es lo que ya hacian: su identificador no es un codigo de referencia catastral
 * y troquelarlo en los diez tramos del manual diria de el algo que su pantalla
 * no dice (`catastro/composicion.ts`).
 *
 * **Y el enlace no es un adorno.** Sin el, quien llega sin el codigo en la mano
 * —que es como se llega casi siempre: con un nombre, una manzana, un lote— se
 * queda delante de una caja que no puede rellenar. El sitio donde se busca por
 * eso existe, tiene su permiso y publica su paginacion: «Consulta de fichas».
 */
function BuscadorDelPredio({
  opcion,
  campos,
  buscado,
  cargando,
  onBuscar,
}: {
  readonly opcion: string;
  readonly campos: readonly CampoDePantalla[];
  readonly buscado: Readonly<Record<string, string>>;
  readonly cargando: boolean;
  readonly onBuscar: (valores: Readonly<Record<string, string>>) => void;
}) {
  const consulta = opcionPorId(CONSULTA_DE_FICHAS);
  return (
    <>
      <Filtros
        opcion={opcion}
        campos={campos}
        buscado={buscado}
        cargando={cargando}
        onBuscar={onBuscar}
      />
      {consulta !== undefined && (
        <p className="sgtm-buscador__otro">
          ¿No tienes el código? Se busca por contribuyente, manzana o lote en{' '}
          {/* El titulo del catalogo como texto del enlace, sin reescribirlo. */}
          <Link to={consulta.ruta}>{consulta.title}</Link>, que es donde esa búsqueda vive; desde
          ahí se abre la ficha del predio que elijas.
        </p>
      )}
    </>
  );
}

/** Donde se busca un predio cuando no se tiene su codigo. Una sola vez, aqui. */
const CONSULTA_DE_FICHAS = 'consulta_fichas';

/**
 * El conmutador de modalidad: las cuatro fichas del mismo predio.
 *
 * **Enlaces, no estado local**, por lo mismo que las pestanas de `Territorio` y
 * `CuadroDeValuacion`: el enlace de lo que se esta mirando se puede compartir, y
 * el permiso lo sigue decidiendo el guardia de `Pantalla` al entrar por la ruta.
 * Con un `useState`, quien no tiene «Ficha catastral rural» llegaria a ella sin
 * pasar por ningun guardia —el servidor contestaria 403, pero la pantalla ya
 * habria dibujado su estructura, que es lo que REQ-03 §5 prohibe—.
 *
 * Y la de una modalidad **que este perfil no puede ver no se dibuja**: ofrecerla
 * seria ofrecer un enlace a un aviso de «no tienes permiso».
 */
function Conmutador({
  modalidad,
  codigo,
  puedeVer,
}: {
  readonly modalidad: Modalidad;
  readonly codigo: string;
  readonly puedeVer: (opcion: string) => boolean;
}) {
  // Sin predio abierto no hay ficha que conmutar: las chips llevarian a la
  // misma pantalla vacia con otro nombre.
  if (codigo === '') return null;
  const catastral = esCodigoDeReferenciaCatastral(codigo);
  // **La derivabilidad es por modalidad, no una sola bandera.** Del codigo de
  // referencia catastral salen `codRefCatastral` (urbana y economica) y
  // `codEdificacion` (bienes, que es el mismo sin el tramo de unidad); de el
  // **no** sale `codUnidad`, que es lo que pide la rural y que ni siquiera es un
  // codigo catastral —`11024-0418`, con guion—. Ofrecer la rural desde un
  // predio urbano seria un enlace a un 404, que es peor que una chip apagada.
  const derivaDe = (una: Modalidad) => catastral && una !== 'rural';

  return (
    <section className="sgtm-modalidades" aria-label="Ficha del predio">
      <span className="sgtm-modalidades__rotulo">Ficha del predio</span>
      <div className="sgtm-modalidades__chips">
        {MODALIDADES.filter((una) => puedeVer(OPCION_DE[una])).map((una) => {
          const situada = opcionPorId(OPCION_DE[una]);
          if (situada === undefined) return null;
          const activa = una === modalidad;
          // Se ofrece si es la que esta abierta, o si el identificador con que
          // se abrio sirve para pedirla. Ver el docblock de la superficie.
          if (activa || derivaDe(una)) {
            return (
              <Link
                key={una}
                to={`${situada.ruta}/${encodeURIComponent(codigo)}`}
                className="sgtm-modalidades__chip"
                data-activa={activa ? '1' : '0'}
                {...(activa ? { 'aria-current': 'page' as const } : {})}
                // El rotulo corto, y el titulo del catalogo como nombre
                // accesible: «Urbana» a secas no dice a que lleva.
                aria-label={situada.title}
              >
                {ROTULO_DE[una]}
              </Link>
            );
          }
          /* **No se apaga: lleva a su propia busqueda** (#498 F2b).
             Apagada, la chip decia «búscala en Consulta de fichas» y dejaba a
             `ficha_rural` sin que **ninguna** superficie del modulo la
             alcanzara —que es lo que impedia plegar el grupo del predio como el
             diseno lo agrupa—. El enlace no lleva a un 404: lleva a la pantalla
             de esa modalidad **sin registro**, que es donde se teclea el
             identificador con el que si se abre. Sigue sin llevar el codigo,
             porque de el no se deriva; lo que cambia es que el camino existe en
             vez de estar contado en un parrafo. */
          return (
            <Link
              key={una}
              to={situada.ruta}
              className="sgtm-modalidades__chip"
              data-otro-codigo="1"
              aria-label={`${situada.title} — se abre con su propio identificador`}
            >
              {ROTULO_DE[una]}
            </Link>
          );
        })}
      </div>
      <p className="sgtm-modalidades__motivo" role="status">
        {catastral
          ? 'La ficha rural no se abre con el código de referencia catastral: se identifica por su unidad catastral, que es otro código. Búscala en «Consulta de fichas».'
          : `Esta ficha se abrió con «${codigo}», que no es un código de referencia catastral: las otras tres modalidades se piden con el código del predio, y con este no se encontraría ninguno. Búscalo en «Consulta de fichas» para abrirlas.`}
      </p>
    </section>
  );
}

/**
 * Las secciones que le tocan a una pestana en una modalidad, **leidas del
 * catalogo portado**.
 *
 * Se exporta para poder comprobarla sin montar nada: es donde vive el reparto, y
 * es lo que compara la prueba que exige un solo vocabulario —que la Valorizacion
 * de la modalidad urbana lleve **la seccion de la ficha** y no la gemela de la
 * actualizacion, con su `03 — ADOBE / TAPIA` y sus acabados de texto libre—.
 */
export function seccionesDeLaPestana(
  modalidad: Modalidad,
  pestana: Pestana,
  pantallas: Readonly<Record<string, EstructuraDePantalla>>,
): readonly SeccionDePantalla[] {
  const referencias =
    pestana === 'valorizacion'
      ? VALORIZACION[modalidad]
      : pestana === 'uso'
        ? USO[modalidad]
        : COMUNES[pestana];
  return referencias.flatMap((referencia) => {
    const seccion = seccionDelCatalogo(pantallas, referencia);
    return seccion === undefined ? [] : [seccion];
  });
}

/** La tabla que Valorizacion dibuja en esa modalidad, o nada si su opcion no declara ninguna. */
export function tablaDeLaModalidad(
  modalidad: Modalidad,
  pantallas: Readonly<Record<string, EstructuraDePantalla>>,
): EstructuraDePantalla['tabla'] {
  const opcion = TABLA_DE[modalidad];
  return opcion === undefined ? undefined : pantallas[opcion]?.tabla;
}

/**
 * Una seccion del catalogo, por su opcion y su rotulo.
 *
 * Recorre las pestanas del prototipo y sus secciones sueltas: una opcion las
 * declara de una forma o de la otra, y quien referencia una seccion no tiene por
 * que saber en cual de las once pestanas del prototipo cayo.
 */
function seccionDelCatalogo(
  pantallas: Readonly<Record<string, EstructuraDePantalla>>,
  { opcion, label }: Referencia,
): SeccionDePantalla | undefined {
  const pantalla = pantallas[opcion];
  if (pantalla === undefined) return undefined;
  const todas = [
    ...(pantalla.tabs ?? []).flatMap((tab) => tab.secciones),
    ...(pantalla.secciones ?? []),
  ];
  return todas.find((seccion) => seccion.label === label);
}

/**
 * La conexion de una de las cuatro fichas.
 *
 * Que el registro la devuelva `undefined` seria un error de programacion —una
 * opcion quitada de `CONEXIONES_DE_CATASTRO` sin quitarla de aqui—, y callarlo
 * dejaria la superficie en blanco sin decir por que.
 */
function conexionDeLaFicha(opcion: string): Conexion {
  const conexion = conexionDe(opcion);
  if (conexion === undefined) {
    throw new Error(`«${opcion}» no está conectada: la ficha del predio no se puede dibujar.`);
  }
  return conexion;
}

function CampoDeclarado({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  ph,
  ayuda,
  opciones,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel' | 'date';
  readonly ph?: string;
  readonly ayuda?: string;
  readonly opciones?: readonly string[];
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      tipo={tipo}
      valor={escritura.borrador[campo] ?? ''}
      bloqueado={!escritura.campos.has(campo)}
      // Los `sel` de esta pantalla escriben: sin la opcion vacia delante, uno
      // sin valor se dibujaria mostrando la primera y el borrador seguiria
      // vacio. Los desplegables de busqueda del catalogo no la llevan.
      {...(tipo === 'sel' ? { eleccionObligatoria: true } : {})}
      {...(ph === undefined ? {} : { ph })}
      {...(ayuda === undefined ? {} : { ayuda })}
      {...(opciones === undefined ? {} : { opciones })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

/**
 * Los filtros de antes puestos a `undefined`, para que una busqueda nueva
 * **quite** los que ya no estan en vez de dejarlos pegados en la direccion.
 */
function vaciar(filtros: Readonly<Record<string, string>>): Record<string, undefined> {
  return Object.fromEntries(Object.keys(filtros).map((nombre) => [nombre, undefined]));
}
