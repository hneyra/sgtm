import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import type { PantallaProps } from '../../App';
import {
  filtroDeViaPorCriterio,
  cifrasDelMarcoLleno,
  comoBbox,
  darDeBaja,
  inscribirPredio,
  listarPredios,
  type Arancel,
  type Depreciacion,
  type ValorUnitario,
  descargarFichaDelContribuyente,
  fichaDelContribuyente,
  listarAranceles,
  listarDepreciacion,
  listarManzanasDelSector,
  listarSectores,
  listarValoresUnitarios,
  listarVias,
  marcoDe,
  planoCatastral,
  reactivar,
  registrarTitular,
  resumenDeConciliacion,
  titularesDelPredio,
  buscarEnElPadron,
  actualizarFicha,
  fichaDelPredio,
  impedimentoDeActualizacion,
  leerFicha,
  MODALIDAD_DE_TIPO,
  ORIGENES_DE_FICHA,
  type OrigenDeFicha,
  CONDICIONES_DE_TITULARIDAD,
  CONDICION_POR_EL_TOTAL,
  type CondicionDeTitularidad,
  type Contribuyente,
  type EstadoDePredio,
  type GeometriaDelLote,
  type LoteDelPlano,
  type MarcoDelPlano,
  type PoligonoGeoJson,
  type PredioDelCatastro,
  type TipoDePredio,
  type Via,
} from '../../api/catastro';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { FalloDeLectura } from '../../api/Fallo';
import { Descargas } from '../../api/descarga';
import { hayPuerta } from '../../api/sesion';
import { Aviso, Paginador, PasoAtras } from '../../ds/componentes';
import {
  CAPAS,
  DEFECTOS_DE_FICHA_NUEVA,
  GRUPOS,
  MODALIDADES,
  MODOS,
  OPCIONES,
  PESTANIAS_DE_VALORES,
  TRAMOS,
  type BloqueDeFicha,
  type CampoDeFicha,
  type ColumnaDeTabla,
  type Modalidad,
  type SelectorDeLectura,
  type TotalDeBloque,
  type ValoresDeFicha,
  PROCEDENCIA,
} from '../../datos/catastro';

/* ══════════ Los estilos que el artboard declara como constantes ══════════ */
const IN: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-elev)',
  fontSize: 13.5,
};
const IN_ERR: CSSProperties = { ...IN, border: '1px solid var(--error-texto)' };
const TH: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'var(--ink-3)',
  whiteSpace: 'nowrap',
  background: 'var(--bg-elev)',
};
const THN: CSSProperties = { ...TH, textAlign: 'right' };
const TD: CSSProperties = { padding: '11px 14px', fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' };
const TDN: CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  color: 'var(--ink-2)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};
const TD1: CSSProperties = { padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' };

type Tono = 'ok' | 'warn' | 'bad';
const INS: Record<Tono, CSSProperties> = {
  ok: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--ok-bg)', color: 'var(--ok-fg)' },
  warn: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--warn-bg)', color: 'var(--warn-fg)' },
  bad: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bad-bg)', color: 'var(--bad-fg)' },
};

const TARJETA: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-1)',
  overflow: 'hidden',
};
const ENTRADILLA: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.6,
  color: 'var(--ink-2)',
  maxWidth: '70ch',
};
const CABECERA_SECCION: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '13px 16px',
  borderBottom: '1px solid var(--line)',
};
const H2: CSSProperties = { margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 };
const META: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' };
const PIE: CSSProperties = {
  margin: 0,
  padding: '11px 16px',
  borderTop: '1px solid var(--line)',
  background: 'var(--bg-elev)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink-3)',
  textWrap: 'pretty',
};
const BOTON_LINEA: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '6px 12px',
  background: 'var(--bg-elev)',
  fontSize: 12,
  color: 'var(--ink-2)',
  cursor: 'pointer',
};

const CARET = ['M6 9l6 6 6-6'];
const LUPA = ['M17.4 11a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0', 'M15.8 15.8 20.6 20.6'];

/** La tabla que el artboard arma con `columnas()` y `filas()`: la primera celda
 *  en tinta fuerte, las numéricas en mono a la derecha. */
function TablaDelArtboard({
  cols,
  filas,
  min,
}: {
  cols: readonly ColumnaDeTabla[];
  filas: readonly (readonly string[])[];
  min?: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} style={c[1] ? THN : TH}>
                {c[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
              {r.map((cl, j) => (
                <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                  {cl}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Una sección de la ficha, ya resuelta: sus bloques visibles y lo que falta. */
type SeccionResuelta = {
  id: string;
  label: string;
  hint: string;
  clave: string;
  bloques: BloqueDeFicha[];
  faltan: number;
  /** Cuántos de sus campos llegan al servidor. Solo cuenta en el alta. */
  viajan: number;
  abierta: boolean;
};

/**
 * Los campos del formulario de la ficha cuyo valor LLEGA a `POST /catastro/predios`.
 *
 * Es uno. El resto de los 81 que el asistente pedía describen la FICHA
 * catastral, que la levanta otra operación (`POST /catastro/fichas/…`) y que
 * esta pantalla no manda: contarlos como «datos obligatorios que faltan» hacía
 * que el asistente se negara a registrar por datos que nadie iba a guardar.
 *
 * La dirección y la vía no están aquí porque en el alta no salen de un campo del
 * artboard: las resuelve el buscador del catálogo vial, contra el catálogo de
 * verdad. El código de referencia catastral tampoco: son sus ocho tramos.
 */
const CAMPOS_QUE_VIAJAN_EN_EL_ALTA = new Set(['numMun']);

/* ══════════ El plano catastral: proyectar para dibujar ══════════ */

/**
 * El marco con que abre el plano: el Perú continental.
 *
 * **No sale de ninguna lectura, y eso es lo que hay que decir.** `bbox` es
 * obligatorio (ADR-0022 §2) y ninguna operación del contrato publica dónde está
 * la municipalidad —ni su extensión, ni la de un sector, ni la de una manzana—,
 * así que la pantalla no puede encuadrar sobre sus datos antes de tenerlos. Se
 * abre sobre el país entero, que es lo único cierto, y **el dibujo se encuadra
 * después sobre los polígonos que vuelven**. Su consecuencia el día que haya
 * geometría cargada está anotada en la pantalla y en #612: un marco tan ancho
 * contestará «hay N lotes, acércate», y desde aquí no se sabe hacia dónde.
 *
 * Los cuatro son negativos —el Perú está al sur y al oeste— salvo el norte, que
 * se escribe `-0.02` porque el país acaba justo antes del ecuador.
 */
const MARCO_INICIAL: MarcoDelPlano = { oeste: -81.4, sur: -18.4, este: -68.6, norte: -0.02 };

/** Cuántos lotes se piden. El servidor no sirve más de 2 000, y lo dice él. */
const LOTES_POR_MARCO = 2000;

/** El lienzo del plano, en unidades de su `viewBox`. */
const LIENZO = { ancho: 560, alto: 400, margen: 10 };

/** Grados a radianes, que es donde vive la fórmula de Mercator. */
const RADIANES = Math.PI / 180;

/**
 * La ordenada de Web Mercator.
 *
 * **Es una proyección de PANTALLA y no toca el dato** (ADR-0022 §1): el polígono
 * llega en 4326 y en 4326 se queda; lo único que pasa aquí es que una esfera se
 * dibuja en un rectángulo, que es lo que hace cualquier biblioteca de mapas al
 * pintar. Dibujar la latitud como si fuera lineal deformaría los lotes, y un
 * lote deformado se lee como un lote mal levantado.
 */
function mercator(latitud: number): number {
  const acotada = Math.min(Math.max(latitud, -85.05), 85.05);
  return Math.log(Math.tan(Math.PI / 4 + (acotada * RADIANES) / 2));
}

/** Los polígonos de un lote, venga como `Polygon` o como `MultiPolygon`. */
function poligonosDe(g: GeometriaDelLote): PoligonoGeoJson[] {
  if (g.type === 'MultiPolygon') return g.coordinates;
  if (g.type === 'Polygon') return [g.coordinates];
  return [];
}

/** Una pieza dibujable: su lote y el `path` ya proyectado. */
type PiezaDelPlano = { lote: LoteDelPlano; d: string };

/**
 * Encuadra los lotes que volvieron y los proyecta al lienzo.
 *
 * **Encuadra sobre lo devuelto y no sobre el marco pedido.** El marco pedido es
 * la consulta —hoy el Perú entero— y dibujar sobre él dejaría los lotes de un
 * distrito en un punto de un país en blanco. Lo que se ve es lo que hay.
 */
function encuadrar(lotes: readonly LoteDelPlano[]): {
  piezas: PiezaDelPlano[];
  /** Los grados de ancho de lo dibujado, para decir la escala en metros. */
  anchoEnGrados: number;
  latitudMedia: number;
} | null {
  let oeste = Infinity;
  let sur = Infinity;
  let este = -Infinity;
  let norte = -Infinity;
  for (const l of lotes) {
    for (const poligono of poligonosDe(l.geometria)) {
      for (const anillo of poligono) {
        for (const [lon, lat] of anillo) {
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
          if (lon < oeste) oeste = lon;
          if (lon > este) este = lon;
          if (lat < sur) sur = lat;
          if (lat > norte) norte = lat;
        }
      }
    }
  }
  if (!Number.isFinite(oeste) || !Number.isFinite(sur)) return null;

  /* Un solo lote —o varios sobre la misma línea— deja el encuadre sin ancho o
     sin alto, y dividir por cero pone el plano entero en NaN: un `path` con NaN
     no falla, no dibuja nada, que es el desenlace que esta pantalla existe para
     no tener. Se le da un margen mínimo de un metro escaso. */
  const MINIMO = 0.00001;
  if (este - oeste < MINIMO) {
    oeste -= MINIMO;
    este += MINIMO;
  }
  if (norte - sur < MINIMO) {
    sur -= MINIMO;
    norte += MINIMO;
  }

  /* Las DOS coordenadas en unidades de Mercator, y no una en grados y otra en
     Mercator: medido, mezclarlas achata el dibujo por el factor 180/pi —los
     lotes salian como una raya de un pixel de alto sobre un lienzo vacio, que
     es indistinguible de un plano roto—. La abscisa de Web Mercator es la
     longitud EN RADIANES, no en grados. */
  const x0 = oeste * RADIANES;
  const y0 = mercator(norte);
  const ancho = (este - oeste) * RADIANES;
  const alto = mercator(norte) - mercator(sur);
  const escala = Math.min((LIENZO.ancho - 2 * LIENZO.margen) / ancho, (LIENZO.alto - 2 * LIENZO.margen) / alto);
  /* Centrado: lo que sobra del lienzo se reparte, para que un distrito alargado
     no salga pegado a un borde. */
  const dx = (LIENZO.ancho - ancho * escala) / 2;
  const dy = (LIENZO.alto - alto * escala) / 2;
  const px = (lon: number) => (lon * RADIANES - x0) * escala + dx;
  const py = (lat: number) => (y0 - mercator(lat)) * escala + dy;

  const piezas: PiezaDelPlano[] = [];
  for (const lote of lotes) {
    const trozos: string[] = [];
    for (const poligono of poligonosDe(lote.geometria)) {
      for (const anillo of poligono) {
        if (anillo.length < 3) continue;
        trozos.push(
          anillo
            .map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(2)},${py(lat).toFixed(2)}`)
            .join(' ') + ' Z',
        );
      }
    }
    /* Un lote cuya geometría no se pudo leer no se dibuja **y no se cuenta**:
       aparecería como un hueco, y un hueco en un plano se lee como que ahí no
       hay predio. Sale en la lista de abajo, con su código. */
    if (trozos.length > 0) piezas.push({ lote, d: trozos.join(' ') });
  }
  return { piezas, anchoEnGrados: este - oeste, latitudMedia: (sur + norte) / 2 };
}

/**
 * El ancho de lo dibujado, en metros o kilómetros.
 *
 * Sustituye al «100 %» del artboard, que sobre geometría proyectada no dice
 * nada: lo que significa algo es la escala en el terreno. Sale del encuadre
 * —que es del cliente— y no de ninguna cifra del backend.
 */
function escalaDelPlano(anchoEnGrados: number, latitudMedia: number): string {
  const metros = anchoEnGrados * 111320 * Math.cos(latitudMedia * RADIANES);
  if (!Number.isFinite(metros) || metros <= 0) return SIN_DATO;
  return metros < 1000 ? `${Math.round(metros)} m de ancho` : `${(metros / 1000).toFixed(1)} km de ancho`;
}

/**
 * Los colores con que se agrupan los lotes por manzana o por sector.
 *
 * No significan nada por sí mismos —no son un rango de arancel ni un estado—:
 * sólo separan un grupo del de al lado, y la leyenda dice por cuál se agrupó.
 */
const COLORES_DE_GRUPO = ['#6f8cb0', '#9db3cd', '#c4d2e2', '#a8b89a', '#d4bfa0', '#b9a8c4', '#8fa8a0', '#cbb8a8'];


export default function Catastro({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const m = moduloDe('catastro');

  /* `alta` es la ficha nueva; dentro de `predios`, un código abierto es la
     ficha de un predio existente. Los dos son la misma pantalla. */
  const [predio, setPredio] = useState<string | null>(null);
  /* La fila que se abrió, guardada. No se busca en `filas`: al abrir un predio
     la consulta del padrón se apaga —no hay listado que enseñar— y con ella se
     iría la fila, de modo que la ficha volvería a los datos del prototipo sin
     que nada lo dijera. */
  const [abierto, setAbierto] = useState<PredioDelCatastro | null>(null);
  /* `modoInicial` es una prop del artboard —«Una página» por omisión—; aquí es
     estado del módulo y lo escribe el conmutador de la ficha. */
  const [modoElegido, setModo] = useState<'pagina' | 'pasos'>('pagina');
  const [pasoEstado, setPaso] = useState(0);
  const [cerradas, setCerradas] = useState<Record<string, boolean>>({});
  const [vals, setVals] = useState<ValoresDeFicha>({});
  const [sucio, setSucio] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [q, setQ] = useState('');
  /* Los cuatro filtros que `PredioController` admite, y ni uno más. */
  const [fSector, setFSector] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoDePredio>('');
  const [fFichado, setFFichado] = useState('');
  const [pagina, setPagina] = useState(0);
  /* El tamaño del padrón, recordado: al abrir un predio la consulta se apaga y
     sin esto la nota del panel volvería a la cifra del prototipo. */
  const [totalDelPadron, setTotalDelPadron] = useState<number | null>(null);
  /* El alta escribe, así que exige observación (RNF-052): sin ella el backend
     rechaza y, sobre todo, la modificación quedaría sin motivo en la bitácora. */
  const [observacion, setObservacion] = useState('');
  const [inscribiendo, setInscribiendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeApi | null>(null);
  /* La baja y la reactivación: su propia observación, porque no es la del alta
     y confundirlas dejaría en la bitácora el motivo de otro acto. */
  const [motivoDeEstado, setMotivoDeEstado] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  /* Provisional, y se dice en pantalla: mientras no haya puerta de sesion, esta
     es la unica forma de dar un token a la interfaz desplegada sin abrir las
     herramientas del navegador. */
  const [tokenPegado, setTokenPegado] = useState('');
  /* La via del alta: se ELIGE del catalogo real, no se teclea. Con `null` la
     direccion se escribe a mano y `codigoDeVia` no viaja, que es el caso del
     padron importado —«JIRON LA LIBERTAD MZ R LT 10 - A.A.H.H. NUEVO CATACAOS»
     no es ninguna via del catalogo—. */
  const [viaElegida, setViaElegida] = useState<Via | null>(null);
  const [busquedaDeVia, setBusquedaDeVia] = useState('');
  const [direccionLibre, setDireccionLibre] = useState('');
  /* `TipoPredio` tiene DOS valores y el backend supone `URBANO` cuando no viaja
     ninguno, asi que el tipo se elige aqui y viaja siempre: sin esto, un predio
     dado de alta con la modalidad Rural encendida entraba como urbano y nada lo
     decia. */
  const [tipoDelAlta, setTipoDelAlta] = useState<TipoDePredio>('URBANO');
  /* El titular del predio. Es un SEGUNDO acto —`POST
     /catastro/predios/{predioId}/titulares`, #490— y no un campo del alta: el
     cuerpo de la inscripcion no lleva ningun contribuyente, asi que esto no
     viaja con ella sino detras, con su propia observacion y su propio motivo en
     la bitacora. Declararlo es opcional; dejarlo a medias, no. */
  const [titularElegido, setTitularElegido] = useState<Contribuyente | null>(null);
  const [busquedaDeTitular, setBusquedaDeTitular] = useState('');
  const [condicionDelTitular, setCondicionDelTitular] = useState<CondicionDeTitularidad>(CONDICION_POR_EL_TOTAL);
  const [porcentajeDelTitular, setPorcentajeDelTitular] = useState('');
  const [documentoDelTitular, setDocumentoDelTitular] = useState('');
  const [observacionDelTitular, setObservacionDelTitular] = useState('');
  const [registrandoTitular, setRegistrandoTitular] = useState(false);
  /* Lo que quedo a medias: el predio SI se inscribio y su titular no.
     Son dos peticiones, y la segunda puede fallar con la primera ya escrita —un
     409 de porcentajes, un 404 de contribuyente, la red—. Sin esto la pantalla
     daria el alta entera por fallida y alguien volveria a inscribir el mismo
     codigo, que es lo unico irreparable de esta pantalla. */
  const [altaAMedias, setAltaAMedias] = useState<{ predioId: number; codigo: string; motivo: string } | null>(null);
  const [valTab, setValTab] = useState(0);
  const [sectorAbierto, setSectorAbierto] = useState('01');
  const [paginaDeManzanas, setPaginaDeManzanas] = useState(0);
  /* Las dos que no se pueden dibujar nacen apagadas y su conmutador esta
     bloqueado con su motivo: `via` no tiene columna de geometria y el arancel
     no se resuelve por lote (ADR-0022 §5). Encenderlas no dibujaria nada, y una
     capa encendida que no pinta se lee como «aqui no hay ninguna calle». */
  const [capas, setCapas] = useState<Record<string, boolean>>({
    predios: true,
    manzanas: true,
    sectores: false,
    vias: false,
    aranceles: false,
  });
  /* El lote elegido, por su `predioId`. Antes nacia en 'M-06-04', que es una
     casilla del artboard y no un predio de nadie. */
  const [loteElegido, setLoteElegido] = useState<number | null>(null);
  /* El marco con que se pide el plano, y lo que hay tecleado en su caja: son
     dos cosas porque un marco a medio escribir no se manda. */
  const [marco, setMarco] = useState<MarcoDelPlano>(MARCO_INICIAL);
  const [marcoTecleado, setMarcoTecleado] = useState(comoBbox(MARCO_INICIAL));
  /* Los dos filtros que el plano admite, y que NO son los del padron: van a
     `GET /catastro/predios/plano` y acotan tambien la cuenta de los que no
     tienen poligono. */
  const [mapaSector, setMapaSector] = useState('');
  const [mapaManzana, setMapaManzana] = useState('');
  const [modalidades, setModalidades] = useState<Record<Modalidad, boolean>>({
    urbana: true,
    economica: true,
    bienes: false,
    rural: false,
  });
  /* `mostrarSiglas` es una prop del artboard —sección «Interfaz»—; aquí es
     estado del módulo, con su conmutador en la fila de modalidades. */
  const [mostrarSiglas, setMostrarSiglas] = useState(true);
  const reloj = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(reloj.current), []);

  const esNuevo = dest === 'alta';
  const esPredio = esNuevo || (dest === 'predios' && predio !== null);
  /* Una ficha nueva se registra siempre por pasos: el artboard lo fija al
     abrirla y esconde el conmutador mientras dura. Derivarlo —en vez de
     dejarlo en el estado— es lo que hace que entrar por la URL a `/alta`
     dibuje el asistente y no la página entera. */
  const modo: 'pagina' | 'pasos' = esNuevo ? 'pasos' : modoElegido;

  /**
   * Con qué arranca cada casilla: en blanco, siempre.
   *
   * Sobre una ficha que ya existe esto devolvía `BASE`, los valores del predio
   * del artboard: «VILLEGAS PRADO, ROSA» de contribuyente, «198.40» de arancel,
   * la partida registral «11024-0418», el material del piso 02. Se dibujaban
   * sobre el predio que se acabara de abrir y eran indistinguibles de lo
   * declarado. Ahora lo que la ficha publica lo pone `leido`, campo por campo, y
   * lo que no publica nadie sale «—» con su motivo, así que aquí no queda
   * ningún valor de la maqueta: el blanco se compone de las claves que el
   * formulario dibuja y de los ocho tramos del código.
   */
  const d = useMemo<ValoresDeFicha>(() => {
    const vaciados: ValoresDeFicha = {};
    GRUPOS.forEach((g) => g.bloques.forEach((b) => b.campos.forEach((f) => (vaciados[f.k] = f.t === 'chk' ? false : ''))));
    TRAMOS.forEach((t) => (vaciados[t[1]] = ''));
    return { ...vaciados, ...DEFECTOS_DE_FICHA_NUEVA };
  }, []);

  const valor = (k: string): string | boolean => {
    const v = vals[k];
    return v === undefined ? d[k] ?? '' : v;
  };
  const txt = (k: string): string => {
    const v = valor(k);
    return typeof v === 'boolean' ? '' : v;
  };
  const fijarCampo = (k: string, v: string | boolean) => {
    setVals((x) => ({ ...x, [k]: v }));
    setSucio(true);
  };

  /* ── Navegación ─────────────────────────────────────────────── */

  const nuevaFicha = () => {
    setModo('pasos');
    setPaso(0);
    setVals({});
    setCerradas({});
    setSucio(false);
    setPredio(null);
    /* El titular de la ficha anterior no se arrastra a la siguiente: declararle
       a un predio nuevo el dueño del anterior es el error que ninguna pantalla
       desmiente después. Y con él se va el aviso de lo que quedó a medias, que
       hablaba de otro predio. */
    setTitularElegido(null);
    setBusquedaDeTitular('');
    setCondicionDelTitular(CONDICION_POR_EL_TOTAL);
    setPorcentajeDelTitular('');
    setDocumentoDelTitular('');
    setObservacionDelTitular('');
    setAltaAMedias(null);
    onDest('alta');
    toast('Ficha nueva: empieza por componer el código catastral.');
  };

  /** El panel de destinos y el botón de acción del shell pasan por aquí: salir
   *  de una ficha es volver al padrón, no quedarse dentro de ella. */
  const irA = (k: string) => {
    if (k === 'alta') {
      nuevaFicha();
      return;
    }
    setPredio(null);
    setAbierto(null);
    onDest(k);
  };

  const abrirPredio = (fila: PredioDelCatastro | null, codigo: string) => {
    setPredio(codigo);
    setAbierto(fila);
    setPaso(0);
    setSucio(false);
    /* Lo tecleado sobre el predio anterior no se arrastra al siguiente. Desde
       que el número municipal VIAJA, dejarlo puesto sería corregir el predio que
       se acaba de abrir con el número del que se estaba mirando —y esa
       corrección se guarda—. Los datos del acto se limpian con la ficha, en el
       efecto que la siembra. */
    setVals({});
    onDest('predios');
  };

  /* Las trece opciones del manual, tal cual las lista la paleta del artboard.
     No se memoiza: cada entrada cierra sobre `irA`, que cambia con el destino.

     Las cinco que son una FICHA —urbana, economica, bienes comunes, rural y la
     actualizacion— llevaban al predio `01-1042-0004`, que no existe en ningun
     padron: es el del artboard. Y lo abrian con `abierto = null`, que es justo la
     rama donde la franja de «esto es el ejemplo del prototipo» NO se dibuja, asi
     que las cinco ensenaban un titular, un uso y un autovaluo de S/ 240,347.50
     inventados con cara de dato. Una ficha se abre desde su predio: la paleta
     lleva al padron y lo dice. */
  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Catastro',
    ir: () =>
      o[1] === 'predio'
        ? (irA('predios'),
          toast('«' + o[0] + '» se abre desde su predio: búscalo en el padrón y ábrelo.'))
        : irA(o[1]),
  }));

  /* ── Las secciones de la ficha ───────────────────────────────── */

  /* Que seccion se esta mirando, para que el indice lo diga (#682).
     Las seis entradas salian identicas —mismo peso, mismo color, sin
     `aria-current`— arriba del todo y con la ultima seccion en pantalla, asi que
     el indice servia para ir y no para saber donde se estaba.

     Con `IntersectionObserver` y no mirando el scroll: el navegador ya sabe que
     hay en pantalla, y calcularlo a mano obliga a leer la posicion de las seis
     secciones en cada gesto de rueda. */
  const [seccionALaVista, setSeccionALaVista] = useState<string>('');

  const secciones = useMemo<SeccionResuelta[]>(() => {
    if (!esPredio) return [];
    const grupos = GRUPOS.map((g) => {
      const bloques = g.bloques
        .filter((b) => !b.modalidad || modalidades[b.modalidad])
        /* En una ficha nueva el código se compone en la tarjeta de cabecera,
           que está visible en los seis pasos: repetir el campo compuesto dentro
           de «Identificación» ponía dos controles para el mismo dato. */
        .map((b) => (esNuevo ? { ...b, campos: b.campos.filter((f) => f.k !== 'cod') } : b))
        /* Un bloque se cae solo si se queda sin nada que enseñar. El artboard
           mira únicamente `campos`, y eso se llevaba por delante «Valuación del
           ejercicio», que no tiene campos y sí las cuatro cifras del autovalúo. */
        .filter((b) => b.campos.length > 0 || b.tabla !== undefined || b.totales !== undefined);
      return { ...g, bloques };
    }).filter((g) => g.bloques.length > 0);

    return grupos.map((g) => {
      const clave = g.id + '|' + modo;
      let faltan = 0;
      let viajan = 0;
      g.bloques.forEach((b) =>
        b.campos.forEach((f) => {
          if (f.t === 'ro' || f.t === 'chk' || f.t === 'codigo') return;
          /* Solo cuentan los campos que el servidor acepta. Los demás se siguen
             viendo —son la ficha del manual— pero no bloquean nada: pedirlos
             para registrar el predio era exigir 81 datos para mandar 7, y
             contarlos «pendientes» sobre una ficha leída decía que faltaba
             rellenar ciento y pico casillas que no llegan a ninguna parte.

             En el alta manda `CAMPOS_QUE_VIAJAN_EN_EL_ALTA` —el cuerpo es el de
             `POST /catastro/predios`— y sobre una ficha que ya existe manda
             `PROCEDENCIA`, que es el cuerpo del `PUT` de la actualización. */
          if (esNuevo ? !CAMPOS_QUE_VIAJAN_EN_EL_ALTA.has(f.k) : PROCEDENCIA[f.k]?.escribe === undefined) return;
          viajan++;
          const v = vals[f.k] === undefined ? d[f.k] : vals[f.k];
          if (v === '' || v === undefined) faltan++;
        }),
      );
      return {
        id: g.id,
        label: g.label,
        hint: g.hint,
        clave,
        bloques: g.bloques,
        faltan,
        viajan,
        abierta: modo === 'pasos' ? true : cerradas[clave] !== true,
      };
    });
  }, [esPredio, esNuevo, modalidades, modo, cerradas, vals, d]);

  /* El indice marca la seccion a la vista. Se mira la que este mas arriba de las
     que cruzan la franja alta de la ventana: con «la mas visible» el marcador
     salta hacia atras al llegar al final, porque la ultima seccion suele ser mas
     corta que la ventana y nunca gana. */
  useEffect(() => {
    if (secciones.length === 0) return;
    const nodos = secciones
      .map((x) => document.getElementById(x.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodos.length === 0) return;
    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        /* Sin `if`: cuando ninguna cruza la franja —arriba del todo, sobre la
           cabecera— la respuesta honesta es ninguna. Conservar la ultima deja el
           indice marcando «Terreno y construccion» con el titulo del predio en
           pantalla, que es el mismo defecto de #682 con otra cara. */
        const primera = secciones.find((x) => visibles.has(x.id));
        setSeccionALaVista(primera?.id ?? '');
      },
      /* La franja alta: desde 120 px bajo el borde superior —lo que ocupa la
         cabecera pegajosa— hasta el 60 % de la ventana. */
      { rootMargin: '-120px 0px -40% 0px', threshold: 0 },
    );
    for (const n of nodos) observador.observe(n);
    return () => observador.disconnect();
  }, [secciones]);


  const paso = Math.min(pasoEstado, Math.max(secciones.length - 1, 0));

  /* ── El código de referencia catastral, compuesto ─────────────── */
  const tramosVal = TRAMOS.map((t) => String(valor(t[1]) || ''));
  const codigoCompleto = tramosVal.join('');
  const largoEsperado = TRAMOS.reduce((a, t) => a + t[2], 0);
  const tramosListos = TRAMOS.filter((t, i) => tramosVal[i].length === t[2]).length;
  const codigoListo = tramosListos === TRAMOS.length;

  /* ── El padrón, contra `GET /api/v1/catastro/predios` ───────── */

  /* El buscador acota por PREFIJO del código de referencia catastral, que es
     lo único que el endpoint sabe buscar. No busca por titular —el listado no
     lo publica a propósito (ADR-0015 §2.4)— ni por dirección. */
  const criterio = useRebote(q.trim());

  /* Volver a la primera página en cuanto cambia lo que se busca: sin esto,
     afinar un filtro desde la página 4 devuelve una página que ya no existe y
     la tabla sale vacía sin que nada lo explique. */
  useEffect(() => setPagina(0), [criterio, fSector, fEstado, fFichado]);

  const padron = useRecurso(
    (senal) =>
      listarPredios(
        {
          codRefCatastral: criterio || undefined,
          codigoDeSector: fSector || undefined,
          estado: fEstado || undefined,
          fichado: fFichado === '' ? undefined : fFichado === 'true',
        },
        { pagina, tamano: 20 },
        senal,
      ),
    [criterio, fSector, fEstado, fFichado, pagina],
    dest === 'predios' && predio === null,
  );

  /* Los sectores. Los usan el filtro del padrón y el árbol de Territorio, así
     que se piden en los dos destinos y no dependen de la búsqueda. */
  const sectores = useRecurso(
    (senal) => listarSectores(senal),
    [],
    dest === 'territorio' || (dest === 'predios' && predio === null),
  );

  /* Las manzanas del sector abierto (#537).
     Se piden al desplegar y no al entrar: un sector de una municipalidad grande
     pasa de mil manzanas, y traerlas todas por si acaso es descargar el catastro
     entero para dibujar una lista que casi siempre esta plegada. */
  /* Y solo si ese sector EXISTE en esta municipalidad: `sectorAbierto` nace en
     '01' venga de donde venga, y una municipalidad puede no tenerlo. Sin esta
     guarda se pide un 404 que ademas no lo dibuja nadie —ninguna fila esta
     desplegada, porque ninguna casa con ese codigo—, asi que seria una peticion
     perdida y un fallo invisible a la vez. */
  const sectorExiste = (sectores.datos?.contenido ?? []).some((x) => x.codigo === sectorAbierto);
  const manzanas = useRecurso(
    (senal) => listarManzanasDelSector(sectorAbierto, paginaDeManzanas, senal),
    [sectorAbierto, paginaDeManzanas],
    dest === 'territorio' && sectorExiste,
  );

  /* ── El alta, contra el padrón de verdad ─────────────────────
     Aquí no se afirma nada que no se haya preguntado. */

  /**
   * ¿Está libre ese código?
   *
   * Antes lo decidía una constante del artboard —`CODIGO_YA_USADO`, de veintiún
   * dígitos frente a los veintitrés que exigen los ocho tramos, así que no
   * coincidía nunca—: la pantalla escribía «Código libre» **sin haberlo
   * preguntado**, y el choque solo aparecía como un 409 después de pulsar. Se
   * pregunta al padrón, que sí lo sabe: un código completo buscado por prefijo
   * solo puede casar consigo mismo.
   */
  const codigoDelAlta = useRecurso(
    (senal) => listarPredios({ codRefCatastral: codigoCompleto }, { tamano: 1 }, senal),
    [codigoCompleto],
    esNuevo && codigoListo,
  );
  const codigoDuplicado = codigoDelAlta.datos !== null && codigoDelAlta.datos.totalElementos > 0;
  const codigoLibre = codigoDelAlta.datos !== null && codigoDelAlta.datos.totalElementos === 0;

  /**
   * El catálogo vial, para elegir la vía en vez de teclearla.
   *
   * Exige el acceso `calles`, que no es el del padrón: quien pueda inscribir un
   * predio puede no poder leerlo, y entonces la dirección se escribe a mano —que
   * es como está el padrón importado— en vez de perder el campo.
   */
  /* La via la busca el SERVIDOR desde #565.
     Antes esta pantalla se traia el catalogo entero al abrirse —tres peticiones
     de 500 para las 1 110 vias de Catacaos— porque la operacion no admitia
     ningun filtro y un buscador no lo podia resolver el servidor. Ahora es una
     peticion por pausa de tecleo, y ninguna al abrir.

     Y siempre `activa: true`: una via dada de baja no se puede elegir para un
     predio nuevo, y hasta ahora salia en la lista. */
  const viaBuscada = useRebote(busquedaDeVia.trim());
  const catalogo = useRecurso(
    (senal) => listarVias({ ...filtroDeViaPorCriterio(viaBuscada), activa: true }, { pagina: 0, tamano: 8 }, senal),
    [viaBuscada],
    esNuevo && viaBuscada !== '',
  );
  const viasQueCasan = catalogo.datos?.contenido ?? [];

  /**
   * El padron, para poder ELEGIR al titular en vez de teclearlo.
   *
   * El manual dibuja «Contribuyente» como campo de solo lectura y el alta no
   * traia ningun buscador, asi que no habia por donde decir de quien es el
   * predio. Y lo que la escritura pide no es lo que el manual teclea: pide el
   * **codigo** del padron, no el nombre —el mismo tropiezo que #427 documento
   * con «Solicitante»—, asi que se resuelve con una lectura antes de mandar.
   *
   * Se pide tambien cuando el alta quedo a medias: ahi la busqueda sigue viva
   * porque el titular todavia se puede declarar sobre el predio que si nacio.
   */
  const titularBuscado = useRebote(busquedaDeTitular.trim());
  const padronDelTitular = useRecurso(
    (senal) => buscarEnElPadron(titularBuscado, 8, senal),
    [titularBuscado],
    (esNuevo || altaAMedias !== null) && titularElegido === null && titularBuscado !== '',
  );
  const personasQueCasan = padronDelTitular.datos?.contenido ?? [];

  /**
   * La dirección que va a viajar, compuesta de lo que se eligió.
   *
   * Del catálogo salen el tipo y el nombre tal como están escritos ahí: no se
   * abrevia «AVENIDA» a «AV.» ni se traduce nada. El número municipal va en su
   * propio campo y no se mete aquí, para que no acabe escrito dos veces.
   */
  const direccionDelAlta = viaElegida ? viaElegida.tipo + ' ' + viaElegida.nombre : direccionLibre.trim();

  /**
   * El titular que se va a declarar, y lo que le falta para poder declararse.
   *
   * `PROPIETARIO_UNICO` es la unica condicion «por el total»: su porcentaje no se
   * declara —lo pone el dominio en 100— y las otras cinco lo exigen. Medido: una
   * cuota `COPROPIETARIO` sin porcentaje vuelve `422 «Un titular COPROPIETARIO
   * necesita su porcentaje: solo el propietario unico lo es por el total»`.
   *
   * Aqui **no se comprueba el rango** —mayor que 0 y hasta 100— ni la suma de
   * cuotas: eso lo dice el servidor, y repetirlo aqui es garantizar que las dos
   * comprobaciones se separen. Lo unico que se hace es no mandar una cadena que
   * no llega ni a ser un porcentaje.
   */
  const titularPorElTotal = condicionDelTitular === CONDICION_POR_EL_TOTAL;
  const porcentajeTecleado = porcentajeDelTitular.trim().replace(',', '.');
  const porcentajeConForma = /^\d{1,3}(\.\d{1,4})?$/.test(porcentajeTecleado);
  const faltaDelTitular: string[] = [];
  if (titularElegido !== null) {
    if (!titularPorElTotal && porcentajeTecleado === '') faltaDelTitular.push('el porcentaje de la cuota');
    else if (!titularPorElTotal && !porcentajeConForma) faltaDelTitular.push('un porcentaje que sea un número —«50», «33.3333»—');
    if (documentoDelTitular.trim() === '') faltaDelTitular.push('el documento que sustenta la titularidad');
    if (observacionDelTitular.trim() === '') faltaDelTitular.push('la observación del titular, que es la suya y no la del alta');
  }
  /* Se puede mandar el titular solo: el predio ya existe y lo unico que falta es
     su cuota. Es lo que sostiene el reintento del alta a medias. */
  const puedeRegistrarTitular = titularElegido !== null && faltaDelTitular.length === 0 && !registrandoTitular;

  /* Lo que de verdad impide registrar, NOMBRADO. Antes se contaban los 81 campos
     del formulario —«Quedan 81 datos obligatorios sin llenar»— cuando solo dos
     de ellos llegaban al servidor, y la cuenta no decía cuál faltaba. */
  const faltaDelAlta: string[] = [];
  if (!codigoListo) faltaDelAlta.push('los ocho tramos del código de referencia catastral');
  if (direccionDelAlta === '') faltaDelAlta.push('la dirección del predio');
  if (observacion.trim() === '') faltaDelAlta.push('la observación');
  faltaDelAlta.push(...faltaDelTitular);

  const puedeRegistrar =
    codigoListo &&
    !codigoDuplicado &&
    direccionDelAlta !== '' &&
    observacion.trim() !== '' &&
    faltaDelTitular.length === 0 &&
    !inscribiendo;
  const motivoBloqueo = codigoDuplicado
    ? 'Ese código ya está inscrito en este padrón: no se puede registrar dos veces.'
    : faltaDelAlta.length > 0
      ? 'Falta ' + faltaDelAlta.join(', ') + '.'
      : inscribiendo
        ? 'Se está registrando…'
        : '';

  /* ── El panel del módulo ──────────────────────────────────────
     Sus cifras salen de contar con los filtros que el backend ya admite: no
     hay endpoint de indicadores de catastro, y componer una cifra aquí a
     partir de varias sería inventarla. */
  const enPanel = dest === 'panel';

  /* ── El documento: la ficha del contribuyente ────────────────
     `GET /catastro/contribuyentes/{codigo}/ficha.pdf` SIN `formato` devuelve
     JSON, que es con lo que se dibuja la hoja. Con `?formato=PDF|XLS|RTF`
     devuelve el documento, y desde #535 los tres contestan 200. */
  const [codigoDeLaFicha, setCodigoDeLaFicha] = useState('');
  const codigoReposado = useRebote(codigoDeLaFicha.trim());
  const ficha = useRecurso(
    (s2) => fichaDelContribuyente(codigoReposado, undefined, s2),
    [codigoReposado],
    dest === 'reporte' && codigoReposado !== '',
  );
  /* El censo del padrón. Lo usan el panel y —desde este arreglo— el mapa: sin
     él, el plano decía «18,412 predios» del artboard mientras el carril de al
     lado, que sí había contado, decía 14 422. */
  const conCenso = enPanel || dest === 'mapa';
  const censoActivos = useRecurso((s2) => listarPredios({ estado: 'ACTIVO' }, { tamano: 1 }, s2), [], conCenso);
  const censoSinFicha = useRecurso((s2) => listarPredios({ fichado: false }, { tamano: 1 }, s2), [], enPanel);
  const censoDeBaja = useRecurso((s2) => listarPredios({ estado: 'DADO_DE_BAJA' }, { tamano: 1 }, s2), [], enPanel);
  const sectoresDelPanel = useRecurso((s2) => listarSectores(s2), [], conCenso);
  /* **«Sin conciliar» ya se cuenta**, desde que el backend publica
     `GET /catastro/fichas/conciliacion/resumen` (#564). El resumen lo resuelve
     en una consulta agregada, trae su ejercicio y su fecha de corte —y las dos
     se dibujan, porque no existe «sin conciliar», existe «sin conciliar a
     2026»—. El ejercicio que viaja es el de la barra; el que se dibuja es el
     que contesta el servidor.

     **Y se sigue contando con el resumen aunque la grilla ya cuente bien.**
     Hasta #631 el motivo era que no contaba: su filtro se aplicaba sobre la
     página ya devuelta y su `totalElementos` seguía siendo el del padrón SIN
     filtrar, así que `conciliadaConRentas=Si` decía «722 páginas, 14 422
     elementos» y devolvía cero filas en todas. Eso quedó arreglado —medido
     contra Catacaos: `Si` da 0 de 0 páginas y `No` da 14 422, las mismas cifras
     que `conciliados` y `noConciliados` del resumen—, y **el motivo ahora es
     otro**: cada consulta de la grilla con `No` deja una fila `ACCESO` en la
     bitácora (ADR-0015 §2.3) —medido: dos peticiones, dos filas, con
     `clave = conciliacion=NO;ejercicio=2026`—, así que pedirla solo para leer
     su total llenaría la auditoría con una entrada por cada pintada del panel,
     y de paso haría que una pantalla de solo lectura escribiera. Aquella
     además exige el permiso de fiscalización sobre `fisc_omisos`; ésta no.
     Aquella nombra —es la lista de a quién no le va a llegar recibo—, ésta
     cuenta. */
  const conciliacion = useRecurso(
    (s2) => resumenDeConciliacion({ ejercicio: pref.ejercicio }, s2),
    [pref.ejercicio],
    enPanel,
  );

  /* ── El plano, contra `GET /api/v1/catastro/predios/plano` (#536) ──────
     `bbox` es obligatorio y no tiene valor por omision en el servidor: sin el,
     422. El que viaja es el del estado, y su cadena es la llave —comparar el
     objeto haria una peticion por render—. */
  const bbox = comoBbox(marco);
  const plano = useRecurso(
    (s2) =>
      planoCatastral(
        {
          bbox,
          codigoDeSector: mapaSector || undefined,
          codigoDeManzana: mapaManzana || undefined,
          limite: LOTES_POR_MARCO,
        },
        s2,
      ),
    [bbox, mapaSector, mapaManzana],
    dest === 'mapa',
  );

  /* Las manzanas del sector elegido en el mapa. Se piden al elegirlo y no al
     entrar, por lo mismo que en Territorio: un sector de Catacaos pasa de mil
     manzanas y traerlas por si acaso es descargar el catastro para llenar un
     desplegable. */
  const manzanasDelMapa = useRecurso(
    (s2) => listarManzanasDelSector(mapaSector, 0, s2),
    [mapaSector],
    dest === 'mapa' && mapaSector !== '',
  );

  /* Cambiar de sector deja la manzana anterior colgando: seguiria viajando, y
     una manzana que no es de ese sector devuelve cero sin decir por que. */
  useEffect(() => setMapaManzana(''), [mapaSector]);
  /**
   * El lote elegido, buscado entre los que volvieron.
   *
   * **Se deriva, y por eso no hay ningun efecto que lo limpie al mover el
   * marco.** Lo habia, y medido resulto ser peor que no tenerlo: un lote que ya
   * no vuelve se resuelve a `null` el solo —el panel dice «pulsa un lote»—,
   * mientras que limpiarlo a mano tira tambien la eleccion que SIGUE en
   * pantalla, que es el caso corriente al acercarse sobre el lote elegido.
   */
  const elegido = useMemo(
    () => (plano.datos?.lotes ?? []).find((l) => l.predioId === loteElegido) ?? null,
    [plano.datos, loteElegido],
  );

  const cambiarMarco = (nuevoMarco: MarcoDelPlano) => {
    setMarco(nuevoMarco);
    setMarcoTecleado(comoBbox(nuevoMarco));
  };

  /**
   * Acerca o aleja el marco por su centro.
   *
   * Es lo que contesta al 422 de «hay N lotes, acercate»: la unica respuesta que
   * ese rechazo admite. Se acota a las coordenadas validas —el backend rechaza
   * fuera de rango, y un marco de 361 grados de ancho no es mas plano— y a un
   * ancho minimo, porque partirlo indefinidamente acaba en un marco degenerado
   * que el backend rechaza por estar del reves.
   */
  const escalarMarco = (factor: number) => {
    const ANCHO_MINIMO = 0.0001;
    const centroX = (marco.oeste + marco.este) / 2;
    const centroY = (marco.sur + marco.norte) / 2;
    const medioAncho = Math.max(((marco.este - marco.oeste) * factor) / 2, ANCHO_MINIMO);
    const medioAlto = Math.max(((marco.norte - marco.sur) * factor) / 2, ANCHO_MINIMO);
    const red = (v: number) => Number(v.toFixed(6));
    cambiarMarco({
      oeste: red(Math.max(centroX - medioAncho, -180)),
      sur: red(Math.max(centroY - medioAlto, -90)),
      este: red(Math.min(centroX + medioAncho, 180)),
      norte: red(Math.min(centroY + medioAlto, 90)),
    });
  };
  const acercarElMarco = () => escalarMarco(0.5);
  const alejarElMarco = () => escalarMarco(2);
  /* Con el marco ya en el inicial, «Restablecer» no restablece nada: ni pide,
     ni cambia el dibujo, ni dice por que. Un boton que se pulsa y no hace nada
     es peor que uno apagado, porque el apagado al menos dice que no se puede. */
  const marcoEsElInicial = bbox === comoBbox(MARCO_INICIAL);

  /* Las dos cifras del «acercate», leidas del propio rechazo (#611).
     Se leen SIEMPRE, tambien cuando el codigo es otro, y entonces salen las dos
     nulas: lo que dibuja el bloque de arriba es cada una si vino, y `SIN_DATO`
     si no. Ninguna se supone —el tope no es LOTES_POR_MARCO aunque sea lo que
     esta pantalla pidio: el servidor tiene el suyo y es el quien lo dice—, y la
     resta no se hace, que es la que convertiria dos cifras publicadas en una
     inventada. */
  const marcoLleno = cifrasDelMarcoLleno(plano.error?.detalles);

  /* La cabecera de la hoja: lo que el recurso publica y nada más. La
     calificación del contribuyente no viene, así que sale «—». */
  const metaDeLaFicha: [string, string][] = [
    ['Contribuyente', ficha.datos?.nombre ?? SIN_DATO],
    ['Código', ficha.datos?.codigo ?? SIN_DATO],
    ['Documento', ficha.datos?.documento ?? SIN_DATO],
    ['Domicilio fiscal', ficha.datos?.domicilioFiscal ?? SIN_DATO],
    ['Unidades', ficha.datos ? String(ficha.datos.unidades.length) : SIN_DATO],
    ['A la fecha', ficha.datos?.aLaFecha ?? SIN_DATO],
  ];

  /* Las unidades. **Ni una columna de deuda**: la hoja del artboard la lleva y
     `FichaDelContribuyenteResource` no la publica —la deuda es de cuenta
     corriente—, así que poner ahí una cifra sería componerla en la pantalla. */
  /* `uso` y `areaTerreno` llegan NULOS cuando el predio está registrado y todavía
     sin ficha, y el tipo los declaraba no-nulos: la celda salía vacía, que en una
     hoja oficial se lee como un dato que no se dibujó. Sale «—». */
  const filasDeLaFicha: string[][] = (ficha.datos?.unidades ?? []).map((u) => [
    u.codRefCatastral,
    u.direccion,
    u.uso ?? SIN_DATO,
    `${u.condicion} · ${u.porcentaje}`,
    u.areaTerreno ?? SIN_DATO,
  ]);

  /* Las tres tablas de valuación del ejercicio. Devuelven una lista suelta, no
     el sobre paginado, y contestan 404 cuando el ejercicio no tiene conjunto de
     parámetros sellado —que es el estado de hoy (D-02a)—. */
  const anio = Number(pref.ejercicio);
  const aranceles = useRecurso(
    (s2) => listarAranceles(anio, s2),
    [anio],
    enPanel || (dest === 'valores' && valTab === 0),
  );
  const unitarios = useRecurso((s2) => listarValoresUnitarios(anio, s2), [anio], dest === 'valores' && valTab === 1);
  const deprec = useRecurso((s2) => listarDepreciacion(anio, s2), [anio], dest === 'valores' && valTab === 2);

  /* El catálogo vial. `ViaController` no acota por sector —una vía es del
     ubigeo, no de un sector—, así que se trae entero y paginado. */
  const [paginaVias, setPaginaVias] = useState(0);
  const vias = useRecurso(
    (senal) => listarVias({}, { pagina: paginaVias, tamano: 20 }, senal),
    [paginaVias],
    dest === 'territorio',
  );

  const filas = padron.datos?.contenido ?? [];
  const cargando = padron.cargando;
  const caido = padron.error !== null;
  const sinResultados = !cargando && !caido && padron.datos !== null && filas.length === 0;
  const hayResultados = !cargando && !caido && filas.length > 0;
  const filtrosPuestos = [criterio, fSector, fEstado, fFichado].filter((x) => x !== '').length;

  useEffect(() => {
    if (padron.datos && filtrosPuestos === 0) setTotalDelPadron(padron.datos.totalElementos);
  }, [padron.datos, filtrosPuestos]);
  const reintentar = padron.reintentar;

  /* El titular no viene en la fila: se resuelve de uno en uno al abrir el
     predio, que es lo que el backend decide para que «quien puede listar
     predios» no sea «quien puede cosechar predio→persona de toda la
     municipalidad». */
  const titulares = useRecurso(
    (senal) => titularesDelPredio(abierto!.predioId, undefined, senal),
    [abierto?.predioId],
    abierto !== null,
  );

  /* ── La ficha catastral del predio abierto ───────────────────── */

  /**
   * De qué TIPO es la ficha, que es lo que decide cuál de las cuatro lecturas
   * pedir.
   *
   * `GET /catastro/predios` publica `fichado: true|false` y **no** el tipo, así
   * que sin esta pregunta habría que probar las cuatro rutas —tres de ellas
   * contestando 404 a propósito— o adivinar por el tipo del predio, que no
   * decide: un predio urbano puede tener ficha única, económica o de bienes
   * comunes.
   *
   * Cuesta un acceso distinto (`consulta_fichas`), así que un perfil que
   * actualice el catastro sin poder consultar fichas recibe 403 aquí y la
   * pantalla lo dice en vez de quedarse en blanco.
   */
  const tipoDeFicha = useRecurso(
    (senal) => fichaDelPredio(abierto!.codRefCatastral, senal),
    [abierto?.codRefCatastral],
    abierto !== null && abierto.fichado,
  );

  const modalidadDeLaFicha = tipoDeFicha.datos === null ? null : MODALIDAD_DE_TIPO[tipoDeFicha.datos.tipo];

  /* La ficha vigente, con su histórico: las versiones anteriores son la mitad
     de lo que hay que enseñar —quién cambió qué y por qué—, y pedirlas cuesta
     el mismo viaje. */
  const lecturaDeLaFicha = useRecurso(
    (senal) => leerFicha(modalidadDeLaFicha!, abierto!.codRefCatastral, { historico: true }, senal),
    [modalidadDeLaFicha, abierto?.codRefCatastral],
    abierto !== null && modalidadDeLaFicha !== null,
  );
  const leida = lecturaDeLaFicha.datos;

  /* ── El acto que versiona la ficha ───────────────────────────── */
  /* Los cuatro datos que `PeticionDeActualizacion` exige y que el manual NO
     dibuja en ninguna de sus casillas: se preguntan en la barra de guardado,
     que es donde se decide el acto. La observación es la de ESTE acto y no la
     de la versión que se lee (regla 10, RNF-052). */
  const [observacionDeLaFicha, setObservacionDeLaFicha] = useState('');
  const [documentoDeLaFicha, setDocumentoDeLaFicha] = useState('');
  const [origenDeLaFicha, setOrigenDeLaFicha] = useState<OrigenDeFicha>('DECLARACION_JURADA');
  const [vigenciaDeLaFicha, setVigenciaDeLaFicha] = useState('');
  const [versionando, setVersionando] = useState(false);

  /* Lo que hay que corregir del predio, tecleado. Es lo ÚNICO del formulario
     que llega al servidor, y va aparte de `vals` porque `vals` guarda las 123
     casillas del artboard y ninguna otra viaja. */
  const numeroMunicipal = vals['numMun'];
  const numeroTecleado = typeof numeroMunicipal === 'string' ? numeroMunicipal : null;

  /* El origen se siembra con el de la versión que rige en cuanto se lee: la
     versión siguiente suele venir del mismo sitio, y dejarlo en el primero de
     la lista afirmaría «lo declaró el contribuyente» sobre una corrección de
     oficio. Se siembra una vez por ficha, no en cada render, para no pisar lo
     que quien atiende acabe de elegir. */
  const fichaSembrada = useRef<number | null>(null);
  useEffect(() => {
    if (leida === null || fichaSembrada.current === leida.id) return;
    fichaSembrada.current = leida.id;
    const conocido = ORIGENES_DE_FICHA.find((o) => o === leida.origen);
    if (conocido !== undefined) setOrigenDeLaFicha(conocido);
    setObservacionDeLaFicha('');
    setDocumentoDeLaFicha('');
    setVigenciaDeLaFicha('');
    /* Y las modalidades pasan a ser las de la ficha que hay delante. Los tres
       conmutadores son del artboard —«qué bloques enseño»— y nacían en urbana y
       económica encendidas: abrir una ficha RURAL escondía su propio bloque, con
       sus grupos de tierra y sus colindantes, y quien atendía no tenía cómo
       saber que estaban ahí. Se siembra una vez por ficha y luego se puede
       tocar: sigue siendo un conmutador de vista. */
    setModalidades({
      urbana: leida.tipo !== 'RURAL',
      economica: leida.tipo === 'ECONOMICA',
      bienes: leida.tipo === 'BIENES_COMUNES',
      rural: leida.tipo === 'RURAL',
    });
  }, [leida]);

  /**
   * Lo que cada campo del formulario enseña, resuelto de lo que se leyó.
   *
   * El tipo lo obliga a estar completo: `SelectorDeLectura` es la unión de los
   * selectores que `PROCEDENCIA` puede nombrar, así que declarar uno nuevo allí
   * sin resolverlo aquí no compila. Es lo que impide que un campo diga leerse de
   * un sitio y salga vacío.
   */
  const leido = useMemo<Record<SelectorDeLectura, string | null>>(
    () => ({
      'predio.codRefCatastral': abierto?.codRefCatastral ?? null,
      'predio.via': abierto?.via ?? null,
      'predio.numeroMunicipal': abierto?.numeroMunicipal ?? null,
      'titulares.texto': abierto === null ? null : textoDeTitulares(titulares.cargando, titulares.error, titulares.datos),
      'ficha.uso': leida?.uso ?? null,
      'ficha.origen': leida?.origen ?? null,
      'ficha.observacion': leida?.observacion ?? null,
      'ficha.frontis': leida?.frontis ?? null,
      'ficha.denominacion': leida?.denominacion ?? null,
      'ficha.hectareasTotales': leida?.rural?.hectareasTotales ?? null,
      /* Cuántas actividades declaradas no tienen licencia. Lo cuenta el
         servidor y no se recompone aquí; con cero actividades no se dice «0
         sin licencia», que se leería como un hallazgo sobre un local que no
         existe. */
      'ficha.sinLicencia':
        leida?.economico == null
          ? null
          : leida.economico.actividades.length === 0
            ? 'Sin actividad declarada'
            : leida.economico.sinLicencia + ' de ' + leida.economico.actividades.length + ' sin licencia',
    }),
    [abierto, leida, titulares.cargando, titulares.error, titulares.datos],
  );

  /* Mientras la ficha viaja, un «—» se leería como «este predio no lo declara»,
     que es lo contrario de lo que pasa. Cubre los DOS viajes: el que resuelve el
     tipo y el que trae la ficha. */
  const esperandoLaFicha = tipoDeFicha.cargando || lecturaDeLaFicha.cargando;

  /* Lo que impide versionar, dicho entero. Vive en el cliente de la API y no
     aquí para que se pueda romper desde fuera: `verificaciones/ficha-catastral.mjs`
     le quita la observación y la ficha leída y exige que se niegue nombrándolas. */
  const impedimento = impedimentoDeActualizacion({
    ficha: leida,
    observacion: observacionDeLaFicha,
    documentoOrigen: documentoDeLaFicha,
    vigenciaDesde: vigenciaDeLaFicha,
  });

  const versionarLaFicha = async () => {
    if (impedimento !== null || leida === null || modalidadDeLaFicha === null || abierto === null) {
      toast(impedimento ?? 'No hay ninguna ficha leída que versionar.');
      return;
    }
    setVersionando(true);
    try {
      /* **Sólo viaja lo que se puede mandar sin perder nada.** Las listas van
         AUSENTES —no vacías—, que es como el backend dice «no las toques»:
         presentes aunque vacías reemplazarían lo declarado, y reenviarlas tal
         como se leyeron perdería el «% construido» de cada piso y la fecha de
         cada actividad, que la lectura publica y el cuerpo no lleva. */
      const nueva = await actualizarFicha(modalidadDeLaFicha, abierto.codRefCatastral, {
        observacion: observacionDeLaFicha.trim(),
        documentoOrigen: documentoDeLaFicha.trim(),
        origen: origenDeLaFicha,
        ...(vigenciaDeLaFicha === '' ? {} : { vigenciaDesde: vigenciaDeLaFicha }),
        /* El número municipal sólo viaja si se tecleó algo distinto de lo que
           el padrón publica: mandarlo igual sería una corrección del predio que
           nadie pidió, con su fila en la bitácora.

           Y si se deja EN BLANCO teniendo número, viaja la cadena vacía, que
           es como el backend dice «bórralo» —ausente sería «no lo toques»—.
           Esa distinción es suya y se respeta: pasar las dos por el mismo
           tamiz dejaría un número municipal equivocado sin manera de quitarlo. */
        ...(numeroTecleado === null || numeroTecleado === (abierto.numeroMunicipal ?? '')
          ? {}
          : { predio: { numeroMunicipal: numeroTecleado } }),
      });
      setVals({});
      setSucio(false);
      setObservacionDeLaFicha('');
      setDocumentoDeLaFicha('');
      setVigenciaDeLaFicha('');
      /* La versión que se enseña es la que DEVOLVIÓ el servidor, no una sumada
         aquí: el aviso decía «Versión 4 desde hoy» componiendo el número en el
         cliente, y con dos personas versionando la misma ficha ese número es el
         de otra. */
      toast('Ficha versionada: ahora rige la versión ' + nueva.version + ' desde el ' + nueva.vigenciaDesde + '.');
      lecturaDeLaFicha.reintentar();
      tipoDeFicha.reintentar();
      padron.reintentar();
    } catch (error) {
      const e = error instanceof ErrorDeApi ? error : new ErrorDeApi('ERROR_INTERNO', 'No se pudo versionar la ficha', 0);
      toast(e.mensaje);
    } finally {
      setVersionando(false);
    }
  };

  /* ── Lo que el plano dibuja, ya proyectado ──────────────────── */

  /**
   * El encuadre y los `path` de los lotes que volvieron.
   *
   * `null` cuando no hay ninguno, que hoy es SIEMPRE y en las dos
   * municipalidades: medido contra el backend, `GET /catastro/predios/plano`
   * contesta `{"lotes":[],"sinGeometria":24}` en la 1 y
   * `{"lotes":[],"sinGeometria":14422}` en la 9. Por eso el lienzo no se dibuja
   * vacio: un rectangulo en blanco sin explicacion se lee como un mapa roto.
   */
  const dibujo = useMemo(() => {
    const lotes = plano.datos?.lotes ?? [];
    return lotes.length === 0 ? null : encuadrar(lotes);
  }, [plano.datos]);

  /**
   * Por que se agrupan los colores, o por nada.
   *
   * Manzana gana a sector porque es la mas fina de las dos, y las dos a la vez
   * serian dos coloreados sobre la misma figura. La leyenda lo escribe: un
   * color que no dice de que es no informa, decora.
   */
  const agrupadoPor: 'manzanas' | 'sectores' | null = capas.manzanas
    ? 'manzanas'
    : capas.sectores
      ? 'sectores'
      : null;

  const claveDeGrupo = (l: LoteDelPlano): string =>
    (agrupadoPor === 'manzanas' ? l.codigoDeManzana : agrupadoPor === 'sectores' ? l.codigoDeSector : null) ?? '';

  /** Los grupos presentes entre lo dibujado, ordenados: el color es estable. */
  const gruposDibujados = useMemo(() => {
    if (dibujo === null || agrupadoPor === null) return [];
    return [...new Set(dibujo.piezas.map((p) => claveDeGrupo(p.lote)))].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dibujo, agrupadoPor]);

  /**
   * Lo que cada capa PONE en el plano.
   *
   * Los llevaba dentro `CAPAS` —«18,412», «2,184», «1,096», «5», «4 rangos»— y
   * eran los del artboard. Luego pasaron a ser los del padron, que ya era cierto
   * pero decia otra cosa: «1,110» al lado de «Vias y calles» promete 1 110 calles
   * dibujadas, y esa capa **no dibuja ninguna** porque `via` no tiene columna de
   * geometria. Lo que cuenta ahora es lo que la capa pinta sobre este marco.
   */
  const conteoDeLaCapa = (clave: string): string => {
    if (plano.cargando) return '…';
    if (plano.datos === null) return SIN_DATO;
    if (clave === 'predios') return (dibujo?.piezas.length ?? 0).toLocaleString('es-PE');
    if (clave === 'manzanas' || clave === 'sectores') {
      const lotes = plano.datos.lotes;
      const codigos = new Set(
        lotes.map((l) => (clave === 'manzanas' ? l.codigoDeManzana : l.codigoDeSector)).filter((c) => c !== null),
      );
      return codigos.size.toLocaleString('es-PE');
    }
    /* Vias y aranceles: no hay con que dibujarlas, asi que no cuentan nada. Una
       cifra ahi seria la promesa de un dibujo que no existe. */
    return SIN_DATO;
  };

  /* La pestaña activa, con su lectura. Del artboard ya no queda ni el rótulo:
     `tablasDeValores` describía OTRA tabla —seis tramos de arancel, siete
     categorías A–G, la depreciación pivotada de un solo material—, y las filas,
     las columnas, el título y el pie salen ahora de lo que el backend devuelve. */
  const lecturaDeValores = [aranceles, unitarios, deprec][valTab]!;
  /* «Sellada» no se afirma: se deduce de que el backend haya contestado. Un 404
     de estas tres rutas dice literalmente que el ejercicio NO tiene conjunto
     sellado, y el artboard lo daba por sellado siempre. */
  const conjuntoSinSellar =
    lecturaDeValores.error?.codigo === 'NO_ENCONTRADO' &&
    /conjunto de parametros sellado|conjunto de parámetros sellado/i.test(lecturaDeValores.error.mensaje);

  /**
   * Los cuatro indicadores. Solo los dos que el backend puede contar llevan
   * cifra; los otros dos salen «—» diciendo qué falta, porque un indicador
   * inventado en un panel es indistinguible de uno correcto.
   */
  const cifra = (r: { datos: { totalElementos: number } | null; cargando: boolean; error: unknown }) =>
    r.cargando ? '…' : r.datos ? r.datos.totalElementos.toLocaleString('es-PE') : SIN_DATO;

  /**
   * En qué estado están los aranceles del ejercicio. Son CINCO y no dos.
   *
   * Se decidía con `aranceles.error?.codigo === 'NO_ENCONTRADO'`, así que
   * cualquier otra cosa —un 403 sobre el acceso `aranceles`, la red caída, un
   * 500— caía en la rama del `else` y el panel lo pintaba **en verde**: «Tabla de
   * aranceles 2026 · OK · El ejercicio tiene su conjunto sellado», dicho de una
   * lectura que no se pudo hacer. Y faltaba la quinta, que es la de hoy en
   * Catacaos: el conjunto sí está sellado y **no lleva ni un arancel** —la ruta
   * contesta `200` con `[]`—, que no es «OK» de ninguna manera.
   */
  const estadoDeLosAranceles: 'cargando' | 'sin-sellar' | 'no-se-pudo' | 'sin-filas' | 'con-filas' =
    aranceles.cargando
      ? 'cargando'
      : aranceles.error?.codigo === 'NO_ENCONTRADO'
        ? 'sin-sellar'
        : aranceles.error !== null
          ? 'no-se-pudo'
          : (aranceles.datos ?? []).length === 0
            ? 'sin-filas'
            : 'con-filas';

  const kpisDelPanel = [
    {
      valor: cifra(censoActivos),
      etiqueta: 'Predios en el padrón',
      nota: `Activos. ${cifra(censoDeBaja)} dados de baja, que siguen en determinaciones ya emitidas.`,
    },
    {
      valor: sectoresDelPanel.cargando
        ? '…'
        : sectoresDelPanel.datos
          ? String((sectoresDelPanel.datos.contenido ?? []).reduce((a, x) => a + (x.manzanas ?? 0), 0))
          : SIN_DATO,
      /* «en 0 sectores» era lo que decía mientras cargaba o cuando la lectura
         fallaba: un cero es una cifra, y aquí no había ninguna. */
      etiqueta: `Manzanas en ${sectoresDelPanel.datos?.totalElementos ?? SIN_DATO} sectores`,
      nota: 'Un predio sin sector no cuenta en ninguno.',
    },
    {
      valor: cifra(censoSinFicha),
      etiqueta: 'Predios sin ficha catastral',
      nota: 'Están en el padrón y no tienen con qué valorizarse. Es la cola de saneamiento.',
    },
    {
      /* El arancel mediano lo componia el prototipo. No se calcula aqui: es una
         cifra de dinero, y componerla en la pantalla es lo que RNF-083 prohibe.
         Ademas hoy no hay ningun arancel publicado. */
      valor: SIN_DATO,
      etiqueta: 'Arancel mediano por m²',
      nota: 'Ninguna lectura publica esta cifra, y componerla aquí sería inventarla.',
    },
  ];

  /** Las tareas, con su conteo real y su destino. */
  const pendientesDelPanel = [
    {
      tipo: 'Saneamiento',
      titulo: 'Predios sin ficha catastral',
      detalle: 'Están en el padrón y no generan autovalúo hasta que se les levante la ficha.',
      conteo: cifra(censoSinFicha),
      tono: 'warn' as Tono,
      dest: 'predios',
    },
    {
      /* La cifra es `noConciliados` del resumen y **no una resta hecha aquí**: el
         servidor la lee y la resta en la misma consulta, y recomponerla contra el
         total de otra lectura es el defecto que #564 cerró. Va con su ejercicio y
         su fecha de corte porque sin ellos no significa nada: el padrón afecto se
         rehace cada año, y quien declaró 2024 no concilia 2026. */
      tipo: 'Rentas',
      titulo: 'Predios sin conciliar con el padrón de rentas',
      detalle: conciliacion.cargando
        ? 'Contando los predios con ficha vigente que no declararon el ejercicio…'
        : conciliacion.error !== null
          ? /* El mensaje del backend no siempre acaba en punto, y sin el las dos
               frases se leen como una sola: «…no trae un token valido Mientras
               no se lea…». */
            'No se pudo contar: ' +
            conciliacion.error.mensaje.replace(/\.?$/, '.') +
            (conciliacion.error.codigo === 'SIN_PRIVILEGIO'
              ? ' El recuento pide el mismo acceso que la consulta de fichas.'
              : '') +
            /* No se sustituye por la de la grilla, y desde #631 ya no porque
               aquélla cuente mal —cuenta bien—: porque leerla con
               `conciliadaConRentas=No` deja fila en la bitácora y pide un
               permiso que quien mira el panel no tiene por qué tener. */
            ' Mientras no se lea, la cifra no se dice: no se sustituye por la de la grilla, que queda registrada en la bitácora y pide el permiso de fiscalización.'
          : conciliacion.datos
            ? `${conciliacion.datos.noConciliados.toLocaleString('es-PE')} de ${conciliacion.datos.total.toLocaleString('es-PE')} predios con ficha vigente al ` +
              `${conciliacion.datos.aLaFecha} no declararon ${conciliacion.datos.ejercicio}. ` +
              `Tienen ficha catastral y no generan deuda predial; la lista se recorre desde Rentas.`
            : 'Tienen ficha catastral y no generan deuda predial. La lista se recorre desde Rentas.',
      conteo: conciliacion.cargando
        ? '…'
        : conciliacion.datos
          ? conciliacion.datos.noConciliados.toLocaleString('es-PE')
          : SIN_DATO,
      tono: (conciliacion.datos && conciliacion.datos.noConciliados === 0 ? 'ok' : 'warn') as Tono,
      dest: 'predios',
    },
    {
      tipo: 'Valores',
      titulo: `Tabla de aranceles ${pref.ejercicio}`,
      detalle: {
        cargando: 'Consultando el cuadro de aranceles del ejercicio…',
        'sin-sellar': 'El ejercicio no tiene conjunto de parámetros sellado: sin él no hay con qué valorizar.',
        'no-se-pudo':
          'No se pudo leer el cuadro de aranceles: ' +
          (aranceles.error?.mensaje ?? '') +
          ' Mientras no se lea, no se sabe si el ejercicio tiene con qué valorizar.',
        'sin-filas':
          'El conjunto del ejercicio está sellado y no lleva ningún arancel. Sin ellos no se puede ' +
          'valorizar el terreno de ningún predio.',
        'con-filas': 'El ejercicio tiene su conjunto sellado, con sus aranceles dentro.',
      }[estadoDeLosAranceles],
      conteo: {
        cargando: '…',
        'sin-sellar': 'Falta',
        'no-se-pudo': SIN_DATO,
        'sin-filas': 'Sin filas',
        'con-filas': 'OK',
      }[estadoDeLosAranceles],
      tono: ({
        cargando: 'warn',
        'sin-sellar': 'bad',
        'no-se-pudo': 'bad',
        'sin-filas': 'bad',
        'con-filas': 'ok',
      } as Record<string, Tono>)[estadoDeLosAranceles]!,
      dest: 'valores',
    },
  ];


  /* ── Ruta y contexto ────────────────────────────────────────── */
  const etiquetaDelDestino = m.destinos.find((x) => x.k === dest)?.label ?? 'Documentos';
  const codigoDelPredio = abierto?.codRefCatastral ?? String(d.predial);
  const miga = esPredio
    ? ['Catastro', 'Predios', esNuevo ? 'Ficha nueva' : codigoDelPredio]
    : dest === 'reporte'
      ? ['Catastro', 'Documentos']
      : ['Catastro', etiquetaDelDestino];
  const titulo = esPredio
    ? esNuevo
      ? 'Registrar predio'
      : 'Predio ' + codigoDelPredio
    : dest === 'reporte'
      ? 'Ficha del contribuyente'
      : etiquetaDelDestino;

  const contexto = esPredio
    ? esNuevo
      ? {
          volver: { label: 'Padrón', onClick: () => irA('predios') },
          codigo: codigoCompleto === '' ? 'Sin código' : codigoCompleto,
          /* `contrib` es el campo «Contribuyente» de la ficha del manual, que es
             de solo lectura y en una ficha nueva esta siempre vacio: la cabecera
             decia «Sin titular asignado» pasara lo que pasara. Ahora dice a
             quien se va a declarar, y sigue diciendo que la ficha es un borrador
             —esa es la pastilla de al lado—, que es lo que distingue lo elegido
             de lo escrito. */
          titular: titularElegido
            ? 'Titular a declarar: ' + titularElegido.nombreRazonSocial
            : txt('contrib') === ''
              ? 'Sin titular asignado'
              : txt('contrib'),
          ubic: txt('calle') === '' ? 'Sin dirección' : txt('calle') + ' ' + txt('numMun'),
          estado: 'Borrador · no registrada',
          estadoColor: 'var(--warn-fg)',
        }
      : {
          volver: { label: 'Padrón', onClick: () => irA('predios') },
          codigo: codigoDelPredio,
          /* El titular no venía en la fila: lo resuelve su propia petición, y
             mientras llega se dice que se está resolviendo en vez de dejar el
             hueco —un hueco se lee como «no tiene titular»—. */
          titular: textoDeTitulares(titulares.cargando, titulares.error, titulares.datos),
          ubic: abierto ? ubicacionDe(abierto) : 'Sin predio abierto',
          estado: sucio
            ? 'Cambios sin guardar'
            : abierto
              ? abierto.estado === 'ACTIVO'
                ? abierto.fichado
                  ? 'En el padrón · con ficha'
                  : 'En el padrón · sin ficha'
                : 'Dado de baja del padrón'
              : 'Sin leer del padrón',
          estadoColor: sucio
            ? 'var(--warn-fg)'
            : abierto && abierto.estado !== 'ACTIVO'
              ? 'var(--bad-fg)'
              : abierto && !abierto.fichado
                ? 'var(--warn-fg)'
                : 'var(--ok-fg)',
        }
    : undefined;

  /**
   * El cuerpo del alta de titular, con los nombres que viajan.
   *
   * `codContribuyente` es el **codigo** del padron —lo que la escritura pide— y
   * sale de la fila elegida en el buscador, no de lo tecleado. `porcentaje` solo
   * viaja cuando la condicion no es por el total: mandarlo con
   * `PROPIETARIO_UNICO` seria declarar como dato lo que el dominio ya sabe, y
   * mandarlo sin el en las otras cinco es el 422 que nombra la condicion.
   *
   * `vigenciaDesde` no se manda: ausente, el servidor pone hoy, y **hoy es lo
   * cierto** —la fecha desde la que este sistema sabe de esta titularidad—.
   * Poner aqui la fecha del documento que la sustenta afirmaria que el predio
   * fue de esa persona desde entonces, que es una reconstruccion historica y no
   * un dato de esta pantalla; el documento se guarda igual, en `documentoOrigen`.
   */
  const cuerpoDelTitular = () => ({
    observacion: observacionDelTitular.trim(),
    codContribuyente: titularElegido!.codigo,
    condicion: condicionDelTitular,
    porcentaje: titularPorElTotal ? undefined : porcentajeTecleado,
    documentoOrigen: documentoDelTitular.trim(),
  });

  const limpiarElTitular = () => {
    setTitularElegido(null);
    setBusquedaDeTitular('');
    setCondicionDelTitular(CONDICION_POR_EL_TOTAL);
    setPorcentajeDelTitular('');
    setDocumentoDelTitular('');
    setObservacionDelTitular('');
  };

  /**
   * Declara el titular de un predio que YA existe.
   *
   * Es el mismo acto que el alta manda detras de la inscripcion, aqui suelto:
   * lo usa el reintento de un alta que quedo a medias, que es el unico caso en
   * que la interfaz conoce un predio sin titular y tiene delante los datos con
   * que declararlo.
   */
  const declararTitular = async (predioId: number, codigo: string) => {
    if (!puedeRegistrarTitular) return;
    setRegistrandoTitular(true);
    try {
      await registrarTitular(predioId, cuerpoDelTitular());
      setAltaAMedias(null);
      limpiarElTitular();
      toast('Titular registrado sobre el predio ' + codigo + '.');
    } catch (error) {
      const e =
        error instanceof ErrorDeApi ? error : new ErrorDeApi('ERROR_INTERNO', 'No se pudo registrar el titular', 0);
      setAltaAMedias({ predioId, codigo, motivo: e.mensaje });
      toast(e.mensaje);
    } finally {
      setRegistrandoTitular(false);
    }
  };

  /**
   * Inscribe el predio contra `POST /api/v1/catastro/predios`.
   *
   * Manda **solo los campos que el endpoint declara**: el código, el tipo, la
   * dirección y la ubicación por código. Los demás datos de la ficha no viajan
   * —los sirve `/catastro/fichas/…`, que es otra operación—, y por eso el panel
   * de cierre lo dice antes de pulsar en vez de descubrirse después.
   *
   * Dos campos que ANTES no viajaban y ahora sí, porque su ausencia se escribía
   * en el padrón sin decirlo:
   *
   * <ul>
   *   <li>`tipoPredio`. Sin él, `PredioController.tipoDe(null)` devuelve
   *       `URBANO`, así que un predio dado de alta con la modalidad Rural
   *       encendida entraba como urbano y ninguna pantalla lo desmentía.
   *   <li>`codigoDeVia`, cuando la vía se eligió del catálogo. El backend lo
   *       resuelve contra `via` y contesta 404 nombrándola si no existe.
   * </ul>
   *
   * Y la dirección **ya no sale del desplegable del artboard**: eran cinco
   * literales —«CALLE BOLÍVAR», «AV. JOSÉ DE LAMA»…— que no están en el catálogo
   * vial de ninguna municipalidad, de modo que el alta escribía en el padrón real
   * la calle de una maqueta.
   */
  const inscribir = async () => {
    setInscribiendo(true);
    setFallo(null);
    setAltaAMedias(null);
    try {
      const creado = await inscribirPredio({
        observacion: observacion.trim(),
        codRefCatastral: codigoCompleto,
        tipoPredio: tipoDelAlta,
        direccion: direccionDelAlta,
        codigoDeVia: viaElegida?.codigo,
        numeroMunicipal: txt('numMun') || undefined,
        codigoDeSector: tramosVal[1] || undefined,
        codigoDeManzana: tramosVal[2] || undefined,
        lote: tramosVal[3] || undefined,
        ubigeo: tramosVal[0] || undefined,
      });
      setSucio(false);
      setModo('pagina');
      setObservacion('');

      /* ── El segundo acto ──────────────────────────────────────────
         El predio ya esta escrito. Lo que viene ahora es otra peticion, con su
         propia observacion, y **puede fallar sin deshacer la primera**: no hay
         transaccion que abarque las dos y no la puede haber, porque son dos
         actos distintos del catastro. Si falla, lo que no se puede hacer es dar el alta
         entera por fallida —quien lo lea volveria a inscribir el mismo codigo, y
         eso el padron no lo deshace—. */
      let titularAMedias: string | null = null;
      if (titularElegido !== null) {
        try {
          await registrarTitular(creado.predioId, cuerpoDelTitular());
        } catch (error) {
          titularAMedias =
            error instanceof ErrorDeApi ? error.mensaje : 'no hubo respuesta del servidor al declarar el titular';
        }
      }

      /* Se abre con lo que el servidor devolvió, no con lo tecleado: si el
         backend normalizó algo, lo que se ve es lo que quedó escrito. */
      abrirPredio(
        {
          predioId: creado.predioId,
          codRefCatastral: creado.codRefCatastral,
          tipo: creado.tipo,
          direccion: creado.direccion,
          numeroMunicipal: creado.numeroMunicipal,
          codigoDeVia: viaElegida?.codigo ?? null,
          via: viaElegida?.nombre ?? null,
          codigoDeSector: tramosVal[1] || null,
          codigoDeManzana: tramosVal[2] || null,
          lote: creado.lote,
          ubigeo: creado.ubigeo,
          estado: creado.estado,
          fichado: false,
        },
        creado.codRefCatastral,
      );
      setViaElegida(null);
      setBusquedaDeVia('');
      setDireccionLibre('');
      if (titularAMedias !== null) {
        setAltaAMedias({ predioId: creado.predioId, codigo: creado.codRefCatastral, motivo: titularAMedias });
        toast('Predio ' + creado.codRefCatastral + ' inscrito. El titular NO quedó registrado: ' + titularAMedias);
      } else if (titularElegido !== null) {
        /* Lo que quedó escrito son las dos cosas, y se dicen las dos: el titular
           declarado no exime de que la ficha siga sin levantarse. */
        limpiarElTitular();
        toast('Predio ' + creado.codRefCatastral + ' inscrito con su titular. Todavía sin ficha.');
      } else {
        toast('Predio ' + creado.codRefCatastral + ' inscrito. Todavía sin ficha y sin titular.');
      }
    } catch (error) {
      const e = error instanceof ErrorDeApi ? error : new ErrorDeApi('ERROR_INTERNO', 'No se pudo inscribir el predio', 0);
      setFallo(e);
      toast(e.mensaje);
    } finally {
      setInscribiendo(false);
    }
  };

  /**
   * Retira el predio del padrón, o lo devuelve.
   *
   * Son dos rutas y dos privilegios distintos —la baja exige `ELIMINACION` y la
   * reactivación `MODIFICACION`—, porque no son el mismo riesgo: retirar un
   * predio lo saca de toda emisión futura y devolverlo solo lo restituye.
   *
   * Ninguna de las dos borra nada (regla 4): la ficha, la titularidad y las
   * determinaciones que se apoyaron en el predio quedan como estaban.
   */
  const cambiarEstado = async () => {
    if (!abierto || motivoDeEstado.trim() === '') return;
    const daDeBaja = abierto.estado === 'ACTIVO';
    setCambiandoEstado(true);
    try {
      const r = daDeBaja
        ? await darDeBaja(abierto.predioId, motivoDeEstado.trim())
        : await reactivar(abierto.predioId, motivoDeEstado.trim());
      setAbierto({ ...abierto, estado: r.estado });
      setMotivoDeEstado('');
      toast(daDeBaja ? 'Predio retirado del padrón. No se ha borrado nada.' : 'Predio devuelto al padrón.');
    } catch (error) {
      const e = error instanceof ErrorDeApi ? error : new ErrorDeApi('ERROR_INTERNO', 'No se pudo cambiar el estado', 0);
      toast(e.mensaje);
    } finally {
      setCambiandoEstado(false);
    }
  };

  /* ── El paso siguiente del asistente ─────────────────────────── */
  const pasoAdelante = () => {
    const ultimo = paso >= secciones.length - 1;
    if (ultimo && esNuevo) {
      if (!puedeRegistrar) {
        toast(motivoBloqueo);
        return;
      }
      void inscribir();
      return;
    }
    /* Sobre una ficha que ya existe, el último paso versiona. Antes decía
       «Ficha guardada. Versión 4 desde hoy» sin que saliera una sola petición, y
       el número lo componía el cliente: con dos personas versionando la misma
       ficha, ése es el de otra. Ahora la versión la dice el servidor. */
    if (ultimo) {
      if (impedimento !== null) {
        toast(impedimento);
        return;
      }
      void versionarLaFicha();
    } else {
      setPaso(paso + 1);
    }
  };
  const pasoBloqueado = esNuevo
    ? paso >= secciones.length - 1 && !puedeRegistrar
    : paso >= secciones.length - 1 && impedimento !== null;

  /**
   * La vía del predio, elegida del catálogo vial de verdad.
   *
   * `GET /catastro/vias` no busca por nombre —solo pagina—, así que el catálogo
   * se trae entero una vez y se filtra aquí; con 1 110 vías son tres peticiones.
   * Cuando el perfil no tiene el acceso `calles` no se pierde el campo: la
   * dirección se escribe a mano, que es como está la mitad del padrón importado
   * («JIRON LA LIBERTAD MZ R LT 10 - A.A.H.H. NUEVO CATACAOS» no es ninguna vía
   * del catálogo).
   */
  const resolutorDeVia = (
    <div key="via-del-alta" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
        Vía del predio · del catálogo vial
      </span>

      {catalogo.error ? (
        <FalloDeLectura
          error={catalogo.error}
          que="el catálogo vial"
          acceso="calles"
          alReintentar={catalogo.reintentar}
        />
      ) : viaElegida ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', border: '1px solid var(--accent)', borderRadius: 7, padding: '9px 11px', background: 'var(--accent-soft)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)' }}>{viaElegida.codigo}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
            {viaElegida.tipo} {viaElegida.nombre}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            ubigeo {viaElegida.ubigeo ?? SIN_DATO}
          </span>
          <button
            onClick={() => {
              setViaElegida(null);
              setBusquedaDeVia('');
            }}
            className="hov-linea"
            style={BOTON_LINEA}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <input
            value={busquedaDeVia}
            onChange={(e) => setBusquedaDeVia(e.target.value)}
            placeholder="Escribe parte del nombre —cayetano, comercio— o su código"
            aria-label="Buscar una vía del catálogo"
            style={IN}
          />
          {/* Ya no hace falta avisar de que la búsqueda «no las mira todas»: las
              mira el servidor, y mira las 1 110. */}
          {catalogo.error !== null && (
            <FalloDeLectura
              error={catalogo.error}
              que="el catálogo vial"
              acceso="calles"
              alReintentar={catalogo.reintentar}
            />
          )}
          {catalogo.cargando && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Buscando…</span>}
          {viaBuscada !== '' && !catalogo.cargando && catalogo.error === null && viasQueCasan.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Ninguna vía activa del catálogo dice «{viaBuscada}». Si el predio no da a una vía del catálogo, escribe la
              dirección abajo.
            </span>
          )}
          {viasQueCasan.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setViaElegida(v);
                setDireccionLibre('');
                setSucio(true);
                /* El ubigeo del tramo «Distrito» sale de la vía elegida, que lo
                   trae: es el distrito de esa calle, no una constante. Solo se
                   rellena si estaba en blanco —lo tecleado manda—. */
                if (v.ubigeo && v.ubigeo.length === TRAMOS[0][2] && txt('distrito') === '') {
                  fijarCampo('distrito', v.ubigeo);
                }
              }}
              className="hov-acento"
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg-card)', padding: '8px 11px', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)' }}>{v.codigo}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {v.tipo} {v.nombre}
              </span>
              {!v.activa && <span style={INS.bad}>De baja</span>}
            </button>
          ))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
              O escribe la dirección, si el predio no da a una vía del catálogo
            </span>
            <input
              value={direccionLibre}
              onChange={(e) => {
                setDireccionLibre(e.target.value);
                setSucio(true);
              }}
              placeholder="JIRON LA LIBERTAD MZ R LT 10 — A.A.H.H. NUEVO CATACAOS"
              style={IN}
            />
          </label>
        </>
      )}

      {catalogo.error && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>Dirección del predio · obligatoria</span>
          <input
            value={direccionLibre}
            onChange={(e) => {
              setDireccionLibre(e.target.value);
              setSucio(true);
            }}
            placeholder="JIRON LA LIBERTAD MZ R LT 10 — A.A.H.H. NUEVO CATACAOS"
            style={IN}
          />
        </label>
      )}

      {/* Lo que se va a mandar, dicho antes de mandarlo. */}
      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
        Se guardará como dirección{' '}
        <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{direccionDelAlta || SIN_DATO}</code>
        {viaElegida && (
          <>
            , con el código de vía{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{viaElegida.codigo}</code>
          </>
        )}
        {!viaElegida && direccionDelAlta !== '' && ', sin código de vía: no se eligió ninguna del catálogo'}.
      </p>
      {viaElegida && viaElegida.ubigeo && txt('distrito') !== '' && txt('distrito') !== viaElegida.ubigeo && (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
          El tramo «Distrito» del código dice {txt('distrito')} y esta vía es del ubigeo {viaElegida.ubigeo}.
        </p>
      )}
    </div>
  );

  /**
   * El titular del predio, elegido del padron de verdad.
   *
   * Es la mitad del alta que hasta ahora no existia: `PeticionDeInscripcionDePredio`
   * no tiene campo de contribuyente, el campo «Contribuyente» del manual es de
   * solo lectura y esta pantalla no dibujaba ningun buscador, asi que un predio
   * nacia sin nadie a quien cobrarle y no habia por donde arreglarlo.
   *
   * Lo que se declara aqui **no viaja con el alta**: viaja detras, en su propia
   * peticion y con su propia observacion. Por eso lo dice antes de mandarlo.
   */
  const bloqueDeTitular = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px' }}>
      {titularElegido ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', border: '1px solid var(--accent)', borderRadius: 7, padding: '9px 11px', background: 'var(--accent-soft)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)' }}>{titularElegido.codigo}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{titularElegido.nombreRazonSocial}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            {titularElegido.tipoDocumento} {titularElegido.numeroDocumento}
          </span>
          {!titularElegido.activo && <span style={INS.warn}>De baja en el padrón</span>}
          <button onClick={limpiarElTitular} className="hov-linea" style={BOTON_LINEA}>
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
              Buscar en el padrón · por D.N.I., R.U.C., código o nombre
            </span>
            <input
              value={busquedaDeTitular}
              onChange={(e) => setBusquedaDeTitular(e.target.value)}
              placeholder="29614026, 00000000008, SULLON VILCHEZ…"
              aria-label="Buscar el contribuyente que será titular del predio"
              style={IN}
            />
          </label>
          {/* Lo que se busca según lo tecleado, dicho antes de buscarlo: los
              cuatro filtros comparan por igualdad salvo el nombre, y un código
              a medias no devuelve nada porque no es una búsqueda por prefijo. */}
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            Ocho dígitos se buscan como D.N.I.; once, como código y como R.U.C. a la vez, porque hay padrones donde el
            código son once dígitos; el resto de números, como código; algo sin espacios con algún dígito —«C-000001»—,
            como código y por nombre; y lo demás, por parecido en el nombre. El código, el D.N.I. y el R.U.C. se comparan
            enteros: a medias no encuentran nada.
          </p>
          {padronDelTitular.error && (
            <FalloDeLectura
              error={padronDelTitular.error}
              que="el padrón de contribuyentes"
              acceso="contribuyentes"
              alReintentar={padronDelTitular.reintentar}
            />
          )}
          {padronDelTitular.cargando && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Buscando en el padrón…</span>}
          {titularBuscado !== '' && !padronDelTitular.cargando && padronDelTitular.error === null && personasQueCasan.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Nadie del padrón responde a «{titularBuscado}». Si la persona no está registrada, hay que darla de alta en
              Rentas antes: la titularidad se declara con su código, y aquí no se puede crear.
            </span>
          )}
          {/* Cuando el padrón deja a alguien fuera se dice, en vez de enseñar
              ocho filas como si fueran todas: buscar por nombre compara por
              parecido —«SULLON» son 129 de 10 603 en Catacaos— y elegir de una
              lista recortada sin saberlo es elegir al homónimo. */}
          {padronDelTitular.datos?.hayMas === true && (
            <span style={{ fontSize: 12, color: 'var(--warn-fg)' }}>
              El padrón devuelve más de los que caben aquí: se enseñan los {personasQueCasan.length} primeros. Afina con el
              D.N.I., el R.U.C. o el código si el que buscas no está.
            </span>
          )}
          {personasQueCasan.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setTitularElegido(c);
                setBusquedaDeTitular('');
              }}
              className="hov-acento"
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg-card)', padding: '8px 11px', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)' }}>{c.codigo}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{c.nombreRazonSocial}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {c.tipoDocumento} {c.numeroDocumento}
              </span>
              {!c.activo && <span style={INS.warn}>De baja</span>}
            </button>
          ))}
        </>
      )}

      {titularElegido && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Condición · viaja como condicion</span>
              <select
                value={condicionDelTitular}
                onChange={(e) => setCondicionDelTitular(e.target.value as CondicionDeTitularidad)}
                style={{ ...IN, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
              >
                {CONDICIONES_DE_TITULARIDAD.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {!titularPorElTotal && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '0 1 180px', minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>% de la cuota · obligatorio</span>
                <input
                  value={porcentajeDelTitular}
                  onChange={(e) => setPorcentajeDelTitular(e.target.value)}
                  inputMode="decimal"
                  placeholder="50"
                  aria-label="Porcentaje de la cuota de titularidad"
                  style={porcentajeTecleado !== '' && !porcentajeConForma ? IN_ERR : IN}
                />
              </label>
            )}
          </div>
          {/* Los seis valores del enumerado, con su nombre exacto, y lo que el
              manual ofrece y no está aquí. Traducir por parecido es el error que
              #427 se negó a cometer: «ARRENDATARIO» y «OCUPANTE» ni siquiera son
              titularidad —son la ocupación, otro acto y otra tabla—. */}
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            Son las seis que el dominio declara, escritas como él las escribe. El manual ofrece además «ARRENDATARIO» y
            «OCUPANTE», que no son titularidad sino ocupación —otro acto, y esta pantalla no lo hace—, y escribe
            «PROPIETARIO ÚNICO» y «SUCESIÓN INDIVISA» donde el dominio dice{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>PROPIETARIO_UNICO</code> y{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>SUCESION</code>. No se traduce ninguno: se manda el del
            dominio.
          </p>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {titularPorElTotal
              ? 'PROPIETARIO_UNICO es por el total: su porcentaje no se declara, lo pone el dominio en 100. Una copropiedad se declara registrando una cuota por persona, y cada una con su acto.'
              : 'Las cuotas vigentes de un predio no pueden pasar del 100 %, y eso lo comprueba la base al confirmar: si se pasa, el servidor lo rechaza diciendo cuánto suman. Aquí no se adivina.'}
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
              Documento que la sustenta · obligatorio, viaja como documentoOrigen
            </span>
            <input
              value={documentoDelTitular}
              onChange={(e) => setDocumentoDelTitular(e.target.value)}
              placeholder="ESCRITURA PÚBLICA 001-2026 / PARTIDA 11002345"
              style={IN}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
              Observación del titular · obligatoria, y no es la del alta
            </span>
            <textarea
              value={observacionDelTitular}
              onChange={(e) => setObservacionDelTitular(e.target.value)}
              rows={2}
              placeholder="Por qué se le declara titular de este predio"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 11px', background: 'var(--bg-card)', fontSize: 13.5, resize: 'vertical' }}
            />
          </label>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            Son dos actos y dos motivos en la bitácora: el del alta explica por qué nace el predio y este por qué es de
            esta persona. Reutilizar uno para los dos dejaría el segundo sin explicación propia. La vigencia empieza hoy
            —es desde cuándo lo sabe este sistema—; la fecha del documento queda en el campo de arriba.
          </p>
        </>
      )}
    </div>
  );

  /* ── Un campo de la ficha ───────────────────────────────────── */
  const campoDeFicha = (f: CampoDeFicha, motivoYaDicho?: string) => {
    /* En el alta, «Vía o calle» y «Tipo de vía» no son campos del formulario:
       los resuelve el catálogo vial de verdad. El desplegable del artboard ofrecía
       cinco calles —«CALLE BOLÍVAR», «AV. JOSÉ DE LAMA», «CALLE SANTA ROSA»,
       «CALLE LAMA», «PASAJE EL ALTO»— y ninguna de las cinco está en el catálogo
       de esta municipalidad: lo elegido se mandaba como `direccion` y quedaba
       escrito en el padrón real. */
    if (esNuevo && f.k === 'calle') return resolutorDeVia;
    if (esNuevo && f.k === 'tipoVia') return null;

    /* «Fuente de la información» es el ORIGEN de la versión, y es uno de los dos
       campos del manual que llegan al servidor. Se ata al acto y no a `vals`
       porque es el mismo dato que viaja en el cuerpo: con dos estados, el
       desplegable diría una cosa y el `PUT` mandaría otra.

       Y los cuatro valores son los del dominio, letra por letra. El desplegable
       del manual ofrece «DECLARACIÓN DEL TITULAR», «INSPECCIÓN DE CAMPO»,
       «CONVENIO INTERINSTITUCIONAL» y «BARRIDO CATASTRAL», y ninguno de los
       cuatro es ninguno de éstos: dos se parecen y dos no tienen equivalente,
       mientras RESOLUCION y MIGRACION no están en el manual. No se traducen, por
       lo mismo que #427 no tradujo «ACTIVA» a VIGENTE. */
    if (!esNuevo && f.k === 'fuente') {
      return (
        <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
          <select
            value={origenDeLaFicha}
            disabled={leida === null}
            onChange={(e) => {
              setOrigenDeLaFicha(e.target.value as OrigenDeFicha);
              setSucio(true);
            }}
            style={IN}
          >
            {ORIGENES_DE_FICHA.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            {leida === null
              ? 'Sin ficha leída no hay versión que originar.'
              : 'Es de dónde sale la versión NUEVA, y decide cómo se defiende: una de FISCALIZACION se sustenta en un acta y una de DECLARACION_JURADA en el documento del contribuyente. La que rige hoy es ' +
                leida.origen +
                '. Se ofrecen los cuatro valores del dominio; las cuatro fuentes del manual no coinciden con ellos y no se traducen.'}
          </span>
        </label>
      );
    }

    /* ── Sobre una ficha que ya existe, manda la procedencia ──────
       Un campo se puede teclear sólo si hay una clave del cuerpo del `PUT` que
       lo lleve, y hay dos de ciento veintitrés. Los demás se dibujan de sólo
       lectura con lo que la ficha publica —o «—» si no lo publica nadie— y con
       su motivo debajo. Antes eran cajas de texto rellenas con el valor del
       artboard: «VILLEGAS PRADO, ROSA», «198.40» de arancel, la partida
       registral «11024-0418», todas sobre el predio que se acababa de abrir. */
    const p = esNuevo ? undefined : PROCEDENCIA[f.k];
    if (p !== undefined && p.escribe === undefined) {
      const texto = p.lee === undefined ? null : leido[p.lee];
      return (
        <label key={f.k} data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
            <span>{f.l}</span>
            {mostrarSiglas && f.c && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.02em', color: 'var(--ink-4)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '1px 4px' }}>
                {f.c}
              </span>
            )}
          </span>
          <span
            style={{
              display: 'block',
              minHeight: 38,
              lineHeight: '19px',
              padding: '9px 10px',
              border: '1px dashed var(--line-2)',
              borderRadius: 6,
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: texto === null ? 'var(--ink-4)' : 'var(--ink-2)',
              overflowWrap: 'anywhere',
            }}
          >
            {texto ?? (p.lee !== undefined && esperandoLaFicha ? 'Leyendo la ficha…' : SIN_DATO)}
          </span>
          {p.motivo && p.motivo !== motivoYaDicho && (
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{p.motivo}</span>
          )}
        </label>
      );
    }

    /* El campo que SÍ viaja arranca con lo que el padrón publica y lo tecleado
       manda. Aquí vivía además un error inventado —«El área verificada del piso
       02 es obligatoria para grabar la actualización»— sobre un campo que no
       llega al servidor por ningún camino: exigía rellenar un dato para
       desbloquear un cierre que no existe. */
    const v = p !== undefined && p.lee !== undefined ? (vals[f.k] ?? leido[p.lee] ?? '') : valor(f.k);
    const estilo = IN;
    const texto = typeof v === 'boolean' ? '' : v;
    return (
      <label
        key={f.k}
        data-ancho={f.ancho ? '1' : '0'}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
          <span>{f.l}</span>
          {mostrarSiglas && f.c && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '.02em',
                color: 'var(--ink-4)',
                border: '1px solid var(--line-2)',
                borderRadius: 3,
                padding: '1px 4px',
              }}
            >
              {f.c}
            </span>
          )}
        </span>

        {f.t === 'codigo' && (
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
            {TRAMOS.map((t) => (
              <span key={t[1]} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-4)', textAlign: 'center' }}>
                  {t[0]}
                </span>
                <input
                  value={txt(t[1])}
                  onChange={(e) => fijarCampo(t[1], e.target.value)}
                  aria-label={t[0]}
                  style={{
                    width: t[2] * 11 + 20,
                    boxSizing: 'border-box',
                    border: '1px solid var(--line-2)',
                    borderRadius: 5,
                    padding: '8px 6px',
                    background: 'var(--bg-elev)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                />
              </span>
            ))}
          </span>
        )}

        {f.t === 'text' && (
          <input value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} placeholder={f.ph} style={estilo} />
        )}
        {f.t === 'date' && (
          <input type="date" value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} style={estilo} />
        )}
        {f.t === 'sel' && (
          /* La opción vacía no sobra: sin ella un `value=''` no casa con ninguna
             y el navegador enseña la primera —«Casa habitación»—, de modo que el
             campo se veía relleno y a la vez contaba como pendiente. Quien
             atendía leía «7 campos pendientes» sobre siete campos que parecían
             llenos, y ninguno decía cuál era. */
          <select value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} style={estilo}>
            <option value="">— sin elegir —</option>
            {(f.o ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {f.t === 'area' && (
          <textarea
            value={texto}
            onChange={(e) => fijarCampo(f.k, e.target.value)}
            rows={3}
            placeholder={f.ph}
            style={{
              width: '100%',
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              padding: '9px 10px',
              background: 'var(--bg-elev)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13.5,
              resize: 'vertical',
            }}
          />
        )}
        {f.t === 'chk' && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '9px 10px',
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              background: 'var(--bg-elev)',
            }}
          >
            <input
              type="checkbox"
              checked={v === true}
              onChange={(e) => fijarCampo(f.k, e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
            />
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
          </span>
        )}
        {f.t === 'ro' && (
          <span
            style={{
              display: 'block',
              minHeight: 38,
              lineHeight: '19px',
              padding: '9px 10px',
              border: '1px dashed var(--line-2)',
              borderRadius: 6,
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--ink-2)',
            }}
          >
            {texto}
          </span>
        )}

        {f.ayuda && (
          <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>
        )}
      </label>
    );
  };

  /* ── Las tablas de la ficha, con las filas que se leyeron ─────

     Cinco tablas dibuja el artboard y las cinco traían filas inventadas sobre
     el predio que se acabara de abrir: dos copropietarios al 50 % con su
     D.N.I., dos direcciones de otro predio, cuatro pisos con sus categorías.
     Aquí cada una se resuelve por su título contra lo que la lectura publica,
     y **la rama por omisión devuelve la tabla vacía**: una tabla nueva del
     artboard no puede volver a colar sus filas por no estar en esta lista.

     Y las columnas son las del RECURSO, no las del manual, por lo mismo que en
     los omisos de fiscalización: una cabecera que promete «Estado civil» o
     «Valor asignado» sobre una celda que nadie publica se lee como un dato que
     falta, cuando lo que falta es la columna. Lo que el manual dibuja y el
     sistema no guarda se dice en el pie. */
  const tablaConectada = (titulo: string): { cols: readonly ColumnaDeTabla[]; filas: readonly (readonly string[])[]; nota: string } => {
    const raya = (x: string | null | undefined) => (x === null || x === undefined || x === '' ? SIN_DATO : x);
    if (titulo === 'Titulares registrados') {
      const t = titulares.datos;
      return {
        cols: [['Cód. contribuyente', 0], ['Nombre / razón social', 0], ['Condición', 0], ['% propiedad', 1]],
        filas: (t?.titulares ?? []).map((x) => [raya(x.codigo), x.nombre ?? 'Titular fuera del padrón', x.condicion, String(x.porcentaje)]),
        nota:
          t === null
            ? 'Los titulares no se han podido leer.'
            : 'Vigentes al ' + t.vigenteA + '. El manual dibuja además D.N.I., R.U.C., estado civil y fecha de inicio: la lectura de titulares publica el código, el nombre, la condición y la cuota, y nada más. Registrar una cuota es otro acto, con su propia observación.',
      };
    }
    if (titulo === 'Pisos declarados') {
      return {
        cols: [['Piso', 0], ['Área construida', 1], ['Año', 1], ['Material', 0], ['Estado', 0], ['Categorías', 0], ['% construido', 1]],
        filas: (leida?.construcciones ?? []).map((c) => [
          c.piso,
          c.areaConstruida,
          raya(c.anioConstruccion === null ? null : String(c.anioConstruccion)),
          raya(c.material),
          raya(c.estadoConservacion),
          c.categorias,
          raya(c.porcentajeConstruido),
        ]),
        nota:
          'Las siete letras de «Categorías» van en el orden del manual: muros y columnas, techos, pisos, puertas y ventanas, revestimientos, baños e instalaciones. El mes de construcción, el estado de la construcción y el uso de la unidad no están en el modelo, y el área construida es una sola: el manual la parte en declarada y verificada.',
      };
    }
    if (titulo === 'Instalaciones registradas') {
      return {
        cols: [['Descripción', 0], ['Cantidad', 1], ['Unidad', 0], ['Año', 1], ['Estado', 0]],
        filas: (leida?.instalaciones ?? []).map((o) => [
          o.descripcion,
          o.cantidad,
          o.unidad,
          raya(o.anioConstruccion === null ? null : String(o.anioConstruccion)),
          raya(o.estadoConservacion),
        ]),
        nota: 'Sin su valor: cuánto vale una obra complementaria sale de un valor unitario, del incremento del 5 %, de la depreciación y de un factor de oficialización que ni siquiera tiene fuente identificada (D-11). Nada de eso lo publica catastro.',
      };
    }
    if (titulo === 'Unidades que participan') {
      const bc = leida?.bienesComunes ?? null;
      return {
        cols: [['Unidad (predio)', 1], ['% participación', 1]],
        filas: (bc?.participaciones ?? []).map((x) => [String(x.predioId), x.porcentaje]),
        nota: 'La unidad se nombra por su identificador de predio, que es como la publica la lectura y como la pediría la escritura. El contribuyente de cada unidad, su área exclusiva y el valor que le toca no salen de aquí: los dos primeros son de otra ficha y el tercero es un importe.',
      };
    }
    if (titulo === 'Otras puertas del predio') {
      return {
        cols: [['Nombre de calle', 0], ['Tipo de vía', 0], ['Tipo de puerta', 0], ['Número', 1], ['Adicional', 1], ['Nomenclatura', 0]],
        filas: [],
        nota: 'Vacía porque el sistema no guarda más de una puerta: `predio` tiene una dirección, una vía y un número municipal. Las dos filas que el artboard dibujaba aquí eran de otro predio.',
      };
    }
    return { cols: [['—', 0]], filas: [], nota: 'Esta tabla no la publica ninguna lectura, así que no se dibuja con nada.' };
  };

  /* Las tablas que el manual NO dibuja y la ficha SÍ publica: las actividades,
     los bienes comunes, los grupos de tierra, los colindantes y el histórico de
     versiones. Sin ellas, media ficha leída se quedaría sin enseñar y sus
     campos dirían «es una lista» sin que la lista estuviera en ninguna parte. */
  const tablasDeMas = (b: BloqueDeFicha): { titulo: string; cols: readonly ColumnaDeTabla[]; filas: readonly (readonly string[])[]; nota: string }[] => {
    if (esNuevo || leida === null) return [];
    const raya = (x: string | null | undefined) => (x === null || x === undefined || x === '' ? SIN_DATO : x);
    if (b.titulo === 'Actividad económica' && leida.economico !== null) {
      return [
        {
          titulo: 'Actividades declaradas',
          cols: [['Conductor', 0], ['Nombre comercial', 0], ['CIIU', 0], ['Área ocupada', 1], ['Nº de licencia', 0], ['Nº de anuncio', 0], ['Declarada desde', 0]],
          filas: leida.economico.actividades.map((a) => [
            a.conductor,
            raya(a.nombreComercial),
            raya(a.ciiu),
            raya(a.areaOcupada),
            /* Que falte NO es un dato incompleto: es el hallazgo, y por eso se
               escribe con todas las letras en vez de con una raya. */
            a.licenciaNumero ?? 'SIN LICENCIA',
            raya(a.anuncioNumero),
            raya(a.vigenciaDesde),
          ]),
          nota: 'Catastro guarda el NÚMERO de la licencia, no su estado: si vale o no lo dice Autorizaciones y Licencias. «SIN LICENCIA» es lo que fiscalización cruza.',
        },
      ];
    }
    if (b.titulo === 'Bienes comunes de la edificación' && leida.bienesComunes !== null) {
      return [
        {
          titulo: 'Áreas comunes declaradas',
          cols: [['Descripción', 0], ['Área', 1], ['Material', 0], ['Estado', 0], ['Año', 1]],
          filas: leida.bienesComunes.bienes.map((x) => [
            x.descripcion,
            x.area,
            raya(x.material),
            raya(x.estadoConservacion),
            raya(x.anioConstruccion === null ? null : String(x.anioConstruccion)),
          ]),
          nota: 'Un bien común se valoriza como una construcción más, y de qué año es decide su depreciación. Su valor no sale de aquí.',
        },
      ];
    }
    if (b.titulo === 'Predio rústico' && leida.rural !== null) {
      return [
        {
          titulo: 'Grupos de tierra',
          cols: [['Clasificación', 0], ['Calidad agrológica', 0], ['Riego', 0], ['Hectáreas', 1], ['De áreas comunes', 1]],
          filas: leida.rural.tierras.map((t) => [t.clasificacion, raya(t.calidadAgrologica), t.riego, t.hectareas, raya(t.hectareasComunes)]),
          nota: 'Las superficies van en hectáreas y con su unidad dentro: el arancel rural es por hectárea, y leerlas como metros calcularía diez mil veces de menos.',
        },
        {
          titulo: 'Colindantes',
          cols: [['Orientación', 0], ['Descripción', 0]],
          filas: leida.rural.colindantes.map((c) => [c.orientacion, c.descripcion]),
          nota: 'Cuatro orientaciones declara el dominio: norte, sur, este y oeste.',
        },
      ];
    }
    if (b.titulo === 'Observaciones' && leida.historico !== null) {
      return [
        {
          titulo: 'Histórico de la ficha',
          cols: [['Versión', 1], ['Rige desde', 0], ['Hasta', 0], ['Área terreno', 1], ['Uso', 0], ['Origen', 0], ['Documento', 0], ['Usuario', 0], ['Observación', 0]],
          filas: leida.historico.map((v) => [
            String(v.version) + (v.vigente ? ' · vigente' : ''),
            v.vigenciaDesde,
            raya(v.vigenciaHasta),
            v.areaTerreno,
            v.uso,
            v.origen,
            v.documentoOrigen,
            v.usuario,
            v.observacion,
          ]),
          nota: 'Aquí no se corrige: se emite otra versión y la anterior se cierra el día antes. La observación es la mitad útil —un diff dice que el área pasó de 120 a 180; sólo ella dice que fue una fiscalización de campo y no un error de tecleo—.',
        },
      ];
    }
    return [];
  };

  /* Los pies de cifras de un bloque. Los del artboard traían **dinero
     inventado** —«Autovalúo S/ 240,347.50»— dibujado sobre el predio que se
     acababa de abrir, y la ficha no publica ni un importe (regla 5, D-02a). */
  const totalesConectados = (b: BloqueDeFicha): readonly TotalDeBloque[] => {
    if (esNuevo) return (b.totales ?? []).map((t) => [t[0], SIN_DATO, t[2]] as const);
    if (b.titulo === 'Valuación del ejercicio') {
      return [
        ['Valor del terreno', SIN_DATO, 0],
        ['Valor de la construcción', SIN_DATO, 0],
        ['Otras instalaciones', SIN_DATO, 0],
        ['Autovalúo ' + pref.ejercicio, SIN_DATO, 1],
      ];
    }
    if (b.tabla?.titulo === 'Unidades que participan') {
      const bc = leida?.bienesComunes ?? null;
      return [
        ['Área común total', bc === null ? SIN_DATO : bc.areaComunTotal + ' m²', 0],
        ['Valor bienes comunes', SIN_DATO, 0],
        ['Unidades que participan', bc === null ? SIN_DATO : String(bc.participaciones.length), 1],
      ];
    }
    return (b.totales ?? []).map((t) => [t[0], SIN_DATO, t[2]] as const);
  };

  /**
   * El motivo que comparten TODOS los campos mudos de un bloque, si es uno solo.
   *
   * Existe por legibilidad y no cambia lo que se dice: «Piso en edición» tiene
   * trece casillas que no viajan por la misma razón, y repetirla trece veces
   * convierte el bloque en un muro de texto que nadie lee — que es la forma en
   * que un motivo deja de proteger. Se dice una vez arriba y las casillas se
   * quedan con su «—».
   */
  const motivoComunDelBloque = (b: BloqueDeFicha): string | undefined => {
    if (esNuevo) return undefined;
    const motivos = b.campos.map((f) => PROCEDENCIA[f.k]?.motivo);
    if (motivos.length < 3) return undefined;
    const primero = motivos[0];
    return primero !== undefined && motivos.every((m) => m === primero) ? primero : undefined;
  };

  const bloqueDeFicha = (b: BloqueDeFicha, i: number) => (
    <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
      {b.titulo && (
        <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
          {b.titulo}
        </p>
      )}
      {b.nota && (
        <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
          {b.nota}
        </p>
      )}

      {motivoComunDelBloque(b) && (
        <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', maxWidth: '76ch', textWrap: 'pretty' }}>
          Ninguna casilla de este bloque llega al servidor. {motivoComunDelBloque(b)}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
        {b.campos.map((f) => campoDeFicha(f, motivoComunDelBloque(b)))}
      </div>

      {b.tabla &&
        (() => {
          /* En una ficha NUEVA las filas del artboard no son de nadie: la de
             «Titulares registrados» ponía dos copropietarios al 50 % con su
             D.N.I., y la de «Otras puertas del predio» dos direcciones de otro
             predio, sobre un formulario en blanco. Y sobre una ficha LEÍDA
             tampoco: ponía las mismas filas encima de un predio real. */
          const t = esNuevo ? null : tablaConectada(b.tabla!.titulo);
          const cols = t === null ? b.tabla!.cols : t.cols;
          const filas = t === null ? [] : t.filas;
          return (
            <div style={{ borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
                <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{b.tabla!.titulo}</p>
                {/* El conteo del artboard —«2 direcciones», «4 pisos»— hablaba de
                    otra ficha. Y el botón «+ Añadir puerta» sólo llamaba a
                    `setSucio(true)`: ofrecía añadir una fila que no se guarda en
                    ninguna parte. */}
                <span style={META}>
                  {esNuevo ? 'ninguna todavía' : esperandoLaFicha ? 'leyendo…' : filas.length === 0 ? 'ninguna' : filas.length}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--line)' }}>
                <TablaDelArtboard cols={cols} filas={filas} min={b.tabla!.min} />
              </div>
              {esNuevo ? (
                <p style={PIE}>
                  El manual dibuja esta tabla en la ficha, y la ficha se levanta con otra operación: el alta del predio no la manda, así
                  que aquí no hay nada declarado todavía.
                </p>
              ) : (
                t !== null && <p style={PIE}>{t.nota}</p>
              )}
            </div>
          );
        })()}

      {/* Lo que la ficha publica y el manual no dibuja: sin estas tablas, media
          ficha leída se quedaría sin enseñar y sus campos dirían «es una lista»
          sin que la lista estuviera en ninguna parte. */}
      {tablasDeMas(b).map((t) => (
        <div key={t.titulo} style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
            <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{t.titulo}</p>
            <span style={META}>{t.filas.length === 0 ? 'ninguna' : t.filas.length}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <TablaDelArtboard cols={t.cols} filas={t.filas} min="620px" />
          </div>
          <p style={PIE}>{t.nota}</p>
        </div>
      ))}

      {b.totales && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
          {totalesConectados(b).map((t) => (
            <div
              key={t[0]}
              /* El divisor va en la celda, no en el `gap`: con `auto-fit` la
                 última fila puede quedar incompleta y un `gap` sobre fondo
                 `--line` deja ver el fondo desnudo donde no hay celda. */
              style={{
                background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
                padding: '13px 16px',
                borderLeft: '1px solid var(--line)',
                borderTop: '1px solid var(--line)',
                margin: '-1px 0 0 -1px',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /**
   * La franja del predio.
   *
   * Con un predio abierto desde el padrón conectado, las tres primeras celdas
   * son del backend y las tres últimas salen «—»: el uso, las áreas y el
   * autovalúo son datos de la FICHA, que la sirve otra superficie
   * (`/catastro/fichas/…`) y no está conectada. Poner ahí la cifra del
   * prototipo sería inventarle a este predio un autovalúo que no tiene, y es
   * indistinguible de uno correcto en cuanto sale de la pantalla.
   */
  const resumen: { etiqueta: string; valor: ReactNode }[] = esNuevo
    ? []
    : abierto
      ? [
          { etiqueta: 'Código catastral', valor: abierto.codRefCatastral },
          { etiqueta: 'Titular', valor: textoDeTitulares(titulares.cargando, titulares.error, titulares.datos) },
          { etiqueta: 'Tipo', valor: rotuloDeTipo(abierto.tipo) },
          /* Los tres de la ficha ya salen de la ficha. El uso y el área son
             suyos; el autovalúo NO lo publica y sigue en «—», porque sale de
             cuadros normativos versionados que hoy no están sellados. */
          { etiqueta: 'Uso', valor: leida?.uso ?? (esperandoLaFicha ? 'Leyendo la ficha…' : SIN_DATO) },
          { etiqueta: 'Área de terreno', valor: leida === null ? SIN_DATO : leida.areaTerreno + ' m²' },
          {
            etiqueta: 'Ficha',
            valor: leida === null ? SIN_DATO : 'v' + leida.version + ' desde ' + leida.vigenciaDesde,
          },
          { etiqueta: 'Autovalúo ' + pref.ejercicio, valor: SIN_DATO },
        ]
      : /* Sin predio abierto no hay nada que resumir. Aquí decía «Villegas
           Prado, Rosa» y «S/ 240,347.50», que son del artboard, y era la rama a
           la que llevaban las cinco fichas de la paleta. */
        [
          { etiqueta: 'Código catastral', valor: SIN_DATO },
          { etiqueta: 'Titular', valor: SIN_DATO },
          { etiqueta: 'Uso', valor: SIN_DATO },
          { etiqueta: 'Área de terreno', valor: SIN_DATO },
          { etiqueta: 'Área construida', valor: SIN_DATO },
          { etiqueta: 'Autovalúo ' + pref.ejercicio, valor: SIN_DATO },
        ];


  return (
    <Shell
      modulo="catastro"
      dest={dest}
      onDest={irA}
      miga={miga}
      titulo={titulo}
      contexto={contexto}
      /* «Predios» ya no dice la cifra del prototipo: dice la que acaba de
         contar el backend, que es la que se ve a su lado en la tabla. */
      /* Solo con el padrón sin filtrar: con un filtro puesto, `totalElementos`
         es lo que devuelve la búsqueda, y «6 en el padrón» al lado de un filtro
         se lee como el tamaño del padrón entero. */
      /* Las notas del carril dejan de decir la cifra del prototipo en cuanto
         alguna lectura de este módulo la ha contado. Se alimentan de la del
         destino y, si no, de la del panel: si no, «18,412 en el padrón» convive
         con los 14,422 que la tabla enseña al lado. */
      notasDeDestino={{
        ...(totalDelPadron !== null
          ? { predios: totalDelPadron.toLocaleString('es-PE') + ' en el padrón' }
          : censoActivos.datos
            ? { predios: censoActivos.datos.totalElementos.toLocaleString('es-PE') + ' en el padrón' }
            : {}),
        ...(sectores.datos && vias.datos
          ? { territorio: `${sectores.datos.totalElementos} sectores · ${vias.datos.totalElementos.toLocaleString('es-PE')} vías` }
          : sectoresDelPanel.datos
            ? { territorio: `${sectoresDelPanel.datos.totalElementos} sectores` }
            : {}),
      }}
      paleta={paleta}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL DEL MÓDULO ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Catastro mantiene el padrón de predios de la municipalidad: quién es el titular, dónde está el predio, qué se ha construido
              y cuánto vale. Todo lo demás —el impuesto, los arbitrios, la fiscalización— se calcula a partir de aquí.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA_SECCION}>
                <h2 style={H2}>Tu trabajo de hoy</h2>
                <span style={META}>{pendientesDelPanel.length} tareas</span>
              </div>
              {pendientesDelPanel.map((p) => (
                <button
                  key={p.titulo}
                  onClick={() => irA(p.dest)}
                  className="hov-acento"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    borderBottom: '1px solid var(--line)',
                    background: 'transparent',
                    padding: '13px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={INS[p.tono]}>{p.tipo}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>
                      {p.titulo.replace('{ejercicio}', pref.ejercicio)}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{p.detalle}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{p.conteo}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {kpisDelPanel.map((k) => (
                <div key={k.etiqueta} style={{ ...TARJETA, padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
                    {k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ PADRÓN DE PREDIOS ══════════ */}
        {dest === 'predios' && predio === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Empieza por encontrar el predio. Se busca por su código de referencia catastral, entero o por el principio: el padrón no
              indexa por titular ni por dirección. Los filtros de abajo solo hacen falta cuando la búsqueda devuelve demasiado.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={LUPA} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="01-1042 — el código, o el principio del código"
                  aria-label="Código de referencia catastral"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                {q !== '' && (
                  <button
                    onClick={() => setQ('')}
                    aria-label="Limpiar la búsqueda"
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, width: 30, height: 30, display: 'grid', placeItems: 'center', background: 'var(--bg-card)', cursor: 'pointer', flex: '0 0 auto' }}
                  >
                    <Icono d={ICO.cerrar} tam={13} grosor={1.9} />
                  </button>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <button
                  onClick={() => setFiltrosAbiertos((v) => !v)}
                  aria-expanded={filtrosAbiertos}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 16,
                      height: 16,
                      color: 'var(--ink-4)',
                      transform: `rotate(${filtrosAbiertos ? 0 : -90}deg)`,
                      transition: 'transform .15s ease',
                    }}
                  >
                    <Icono d={CARET} tam={12} grosor={2} />
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Búsqueda avanzada</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {filtrosPuestos === 0 ? 'ninguno aplicado' : filtrosPuestos + (filtrosPuestos === 1 ? ' criterio' : ' criterios')}
                  </span>
                </button>
                {filtrosAbiertos && (
                  <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(184px,1fr))', gap: '14px 16px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Sector</span>
                        {/* El listado de sectores exige su propio acceso, así que
                            puede negarse a quien sí puede ver el padrón. Cuando eso
                            pasa no se pierde el filtro: se teclea el código. */}
                        {sectores.error ? (
                          <input
                            value={fSector}
                            onChange={(e) => setFSector(e.target.value)}
                            placeholder="01"
                            style={SELECT_FILTRO}
                          />
                        ) : (
                          <select
                            value={fSector}
                            onChange={(e) => setFSector(e.target.value)}
                            disabled={sectores.cargando}
                            style={SELECT_FILTRO}
                          >
                            <option value="">Todos</option>
                            {(sectores.datos?.contenido ?? []).map((x) => (
                              <option key={x.codigo} value={x.codigo}>
                                {x.codigo} — {x.nombre}
                                {x.predios !== null && ` (${x.predios})`}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Estado del predio</span>
                        <select value={fEstado} onChange={(e) => setFEstado(e.target.value as '' | EstadoDePredio)} style={SELECT_FILTRO}>
                          <option value="">Todos</option>
                          <option value="ACTIVO">En el padrón</option>
                          <option value="DADO_DE_BAJA">Dado de baja</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Ficha catastral</span>
                        <select value={fFichado} onChange={(e) => setFFichado(e.target.value)} style={SELECT_FILTRO}>
                          <option value="">Con y sin ficha</option>
                          <option value="true">Con ficha</option>
                          <option value="false">Sin ficha — cola de saneamiento</option>
                        </select>
                      </label>
                    </div>
                    {/* Los otros tres criterios del manual no se dibujan apagados: se
                        dice dónde se filtran, porque un desplegable que no filtra se
                        teclea igual y no lo delata nada. */}
                    <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Manzana y lote salen en la tabla pero el padrón no acota por ellos: para eso está el mapa, que busca por manzana y
                      lote. El uso y la conciliación con rentas no son datos del predio —viven en su ficha y en el padrón de rentas—, así
                      que tampoco se filtran aquí.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Cargando: el esqueleto tiene la forma de la tabla que va a llegar */}
            {cargando && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div data-esq="1" style={{ width: 180, height: 15 }} />
                </div>
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div data-esq="1" style={{ width: 118, height: 13 }} />
                    <div data-esq="1" style={{ flex: 1, height: 13 }} />
                    <div data-esq="1" style={{ width: 74, height: 13 }} />
                  </div>
                ))}
              </section>
            )}

            {/* Vacío: dice la causa probable y ofrece los dos caminos de salida */}
            {sinResultados && (
              <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <Icono d={LUPA} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún predio con esos datos</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Puede que el predio exista con el código antiguo del padrón migrado, o que aún no tenga ficha. Búscalo en el mapa por
                  manzana y lote, o regístralo.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => irA('mapa')} className="hov-linea" style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}>
                    Buscar en el mapa
                  </button>
                  <button onClick={nuevaFicha} className="hov-acento-2" style={{ border: 0, borderRadius: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Registrar predio
                  </button>
                </div>
              </section>
            )}

            {/* El fallo, con el componente compartido: la pantalla tenía su propio
                `tituloDelFallo`/`explicacionDelFallo` copiados a mano, de modo que
                la misma causa se decía de dos maneras según el módulo. Lo único
                propio que queda es la caja del token, que solo existe mientras no
                haya puerta de sesión. */}
            {caido && !cargando && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <FalloDeLectura
                  error={padron.error!}
                  que="el padrón de predios"
                  acceso="actualizacion_catastro"
                  alReintentar={reintentar}
                />
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                  GET /api/v1/catastro/predios · {padron.error?.estado || 'sin respuesta'}
                </p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Lo que hayas escrito en la ficha sigue aquí: no se ha perdido nada.
                </p>
                {/* Todavía no hay puerta de sesión: la interfaz no sabe pedir un
                    token, así que se le da. Aparece SOLO ante un 401 —quien tiene
                    sesión válida no lo ve nunca— y se va el día que exista la
                    puerta, junto con `token()` y `fijarToken()`. */}
                {padron.error?.codigo === 'NO_AUTENTICADO' && !hayPuerta() && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 'min(560px, 100%)' }}>
                    <label style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      Aquí no hay puerta de sesión —es la vista previa local—, así que pega un token del emisor:
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={tokenPegado}
                        onChange={(e) => setTokenPegado(e.target.value)}
                        placeholder="eyJhbGciOi…"
                        spellCheck={false}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: '1px solid var(--line-2)',
                          borderRadius: 6,
                          padding: '8px 11px',
                          background: 'var(--bg-card)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                        }}
                      />
                      <button
                        onClick={() => {
                          fijarToken(tokenPegado.trim() || null);
                          setTokenPegado('');
                          reintentar();
                        }}
                        disabled={tokenPegado.trim() === ''}
                        className={tokenPegado.trim() === '' ? undefined : 'hov-acento-2'}
                        style={{
                          border: 0,
                          borderRadius: 6,
                          padding: '8px 17px',
                          background: 'var(--accent)',
                          color: 'var(--accent-contraste)',
                          fontSize: 12.5,
                          fontWeight: 500,
                          cursor: tokenPegado.trim() === '' ? 'not-allowed' : 'pointer',
                          opacity: tokenPegado.trim() === '' ? 0.55 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Usar este token
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Queda en el almacenamiento de este navegador y caduca solo. No se guarda en ningún sitio más.
                    </p>
                  </div>
                )}
                {/* La referencia se dicta por teléfono a quien la investiga, así
                    que se copia. Sin incidencia no hay nada que copiar: el fallo
                    no llegó al servidor. */}
                {padron.error?.incidencia && (
                  <div>
                    <button
                      onClick={() => {
                        void navigator.clipboard?.writeText(padron.error!.incidencia!);
                        toast(`Referencia ${padron.error!.incidencia} copiada.`);
                      }}
                      className="hov-linea"
                      style={BOTON_LINEA}
                    >
                      Copiar referencia
                    </button>
                  </div>
                )}
              </section>
            )}

            {hayResultados && padron.datos && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Predios encontrados</h2>
                  <span style={META}>
                    {filas.length} de {padron.datos.totalElementos.toLocaleString('es-PE')}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Cod. ref. catastral</th>
                        <th style={TH}>Dirección</th>
                        <th style={TH}>Sector · Mz. · Lote</th>
                        <th style={TH}>Tipo</th>
                        <th style={TH}>Ficha</th>
                        <th style={TH}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((r) => (
                        <tr
                          key={r.predioId}
                          onClick={() => abrirPredio(r, r.codRefCatastral)}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {r.codRefCatastral}
                          </td>
                          <td style={TD}>
                            {direccionDe(r)}
                            {r.via && (
                              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)' }}>{r.via}</span>
                            )}
                          </td>
                          <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {[r.codigoDeSector, r.codigoDeManzana, r.lote].map((x) => x ?? '—').join(' · ')}
                          </td>
                          <td style={TD}>{rotuloDeTipo(r.tipo)}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={INS[r.fichado ? 'ok' : 'warn']}>{r.fichado ? 'Con ficha' : 'Sin ficha'}</span>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={INS[r.estado === 'ACTIVO' ? 'ok' : 'bad']}>
                              {r.estado === 'ACTIVO' ? 'En el padrón' : 'Dado de baja'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Paginador
                  pagina={padron.datos.pagina}
                  totalPaginas={padron.datos.totalPaginas}
                  hayMas={padron.datos.hayMas}
                  ir={setPagina}
                />

                {/* Por qué no hay columna de titular, dicho donde se echa en falta:
                    publicarlo en la fila convertiría «quien puede listar predios» en
                    «quien puede cosechar predio→persona de toda la municipalidad»
                    (ADR-0015 §2.4). Se resuelve al abrir el predio, uno a uno. */}
                <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El titular no sale en la lista: se resuelve al abrir el predio, de uno en uno y dejando su rastro. Un predio sin ficha
                  está en el padrón y no tiene con qué valorizarse.
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL PREDIO ══════════ */}
        {esPredio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* El alta que quedó a medias: el predio SÍ está inscrito y su
                titular no. Es un aviso permanente y no un `toast`, porque lo que
                dice hay que poder leerlo después de mirar a otro sitio: si se
                lee como «no se inscribió», alguien vuelve a inscribir el mismo
                código —y eso el padrón no lo deshace (regla 4)—.

                Y no se queda en decirlo: el predio ya existe, así que el titular
                se puede declarar aquí mismo sobre él. Es el mismo acto que el
                alta manda detrás, con los datos que siguen en pantalla. */}
            {altaAMedias !== null && (
              <section style={{ ...TARJETA, borderColor: 'var(--warn-fg)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <Aviso tono="warn" titulo={'El predio ' + altaAMedias.codigo + ' SÍ quedó inscrito. Su titular NO.'}>
                    Está en el padrón catastral con el identificador{' '}
                    <code style={{ fontFamily: 'var(--font-mono)' }}>{altaAMedias.predioId}</code>:{' '}
                    <strong>no lo vuelvas a inscribir</strong>, el mismo código de referencia catastral se rechaza y dos
                    fichas sobre el mismo lote generan dos deudas. Lo que falló fue la segunda petición, la del titular:{' '}
                    {altaAMedias.motivo}
                  </Aviso>
                </div>
                {bloqueDeTitular}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
                  <button
                    onClick={() => void declararTitular(altaAMedias.predioId, altaAMedias.codigo)}
                    disabled={!puedeRegistrarTitular}
                    title={
                      registrandoTitular
                        ? 'Se está registrando el titular…'
                        : titularElegido === null
                          ? 'Elige arriba al contribuyente que es titular de este predio.'
                          : faltaDelTitular.length > 0
                            ? 'Falta ' + faltaDelTitular.join(', ') + '.'
                            : undefined
                    }
                    className="hov-linea"
                    style={{
                      border: '1px solid var(--accent)',
                      borderRadius: 6,
                      padding: '9px 16px',
                      background: puedeRegistrarTitular ? 'var(--accent)' : 'var(--bg-card)',
                      color: puedeRegistrarTitular ? 'var(--accent-contraste)' : 'var(--ink-4)',
                      fontSize: 13,
                      cursor: puedeRegistrarTitular ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {registrandoTitular ? 'Registrando…' : 'Registrar el titular sobre este predio'}
                  </button>
                  <button
                    onClick={() => {
                      setAltaAMedias(null);
                      limpiarElTitular();
                    }}
                    className="hov-linea"
                    style={BOTON_LINEA}
                  >
                    Dejarlo sin titular por ahora
                  </button>
                  <span style={{ flex: 1, minWidth: 200, fontSize: 11.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Sin titular el predio está en el padrón catastral y fuera de toda emisión: la obligación predial se
                    determina por contribuyente.
                  </span>
                </div>
              </section>
            )}
            {esNuevo && (
              <>
                <section style={TARJETA}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: '15px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ flex: 1, minWidth: 210 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Código de referencia catastral</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '70ch', textWrap: 'pretty' }}>
                        No se teclea de corrido: se compone de ocho tramos y cada uno tiene su longitud. Es lo primero porque de él cuelga
                        todo lo demás.
                      </p>
                    </div>
                    <span style={INS[codigoDuplicado ? 'bad' : codigoListo ? 'ok' : 'warn']}>
                      {codigoDuplicado ? 'Código ya usado' : codigoListo ? 'Completo' : tramosListos + ' de ' + TRAMOS.length + ' tramos'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: '15px 16px 6px' }}>
                    {TRAMOS.map((t, i) => (
                      <label key={t[1]} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--ink-3)' }}>{t[0]}</span>
                        <input
                          value={tramosVal[i]}
                          onChange={(e) => fijarCampo(t[1], e.target.value.replace(/[^0-9]/g, '').slice(0, t[2]))}
                          maxLength={t[2]}
                          aria-label={t[0] + ', ' + t[2] + ' dígitos'}
                          style={{
                            width: t[2] * 13 + 22,
                            boxSizing: 'border-box',
                            border: `1px solid ${tramosVal[i].length === t[2] ? 'var(--line-2)' : 'var(--warn-fg)'}`,
                            borderRadius: 6,
                            padding: '9px 8px',
                            background: 'var(--bg-elev)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 14,
                            textAlign: 'center',
                            letterSpacing: '.04em',
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 16px 15px' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Queda</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '.06em', color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 6, padding: '6px 11px' }}>
                      {codigoCompleto === '' ? '—' : codigoCompleto}
                    </code>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                      {codigoCompleto.length + ' de ' + largoEsperado + ' dígitos'}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      padding: '11px 16px',
                      borderTop: '1px solid var(--line)',
                      background: codigoDuplicado ? 'var(--bad-bg)' : codigoLibre ? 'var(--ok-bg)' : 'var(--bg-elev)',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: codigoDuplicado ? 'var(--bad-fg)' : codigoLibre ? 'var(--ok-fg)' : 'var(--ink-3)',
                      textWrap: 'pretty',
                    }}
                  >
                    {/* «Código libre» se AFIRMABA en cuanto los ocho tramos estaban
                        llenos, sin preguntárselo a nadie: la comprobación del
                        artboard comparaba con una constante de veintiún dígitos que
                        nunca podía casar con los veintitrés del código. Ahora sale
                        de `GET /catastro/predios?codRefCatastral=<el código>`. */}
                    {!codigoListo
                      ? 'Cada tramo tiene su longitud fija y se rellena con ceros a la izquierda. El sector y la manzana salen del mapa: si no sabes el lote, búscalo allí primero.'
                      : codigoDelAlta.cargando
                        ? 'Preguntando al padrón si ese código ya está inscrito…'
                        : codigoDuplicado
                          ? 'Ese código ya está inscrito en este padrón: ' +
                            (codigoDelAlta.datos?.contenido[0]?.direccion ?? 'el predio ya existe') +
                            '. Dos fichas sobre el mismo lote generan dos deudas.'
                          : codigoLibre
                            ? 'Código libre en este padrón. Los tres primeros tramos —distrito, sector y manzana— tienen que existir en Territorio; si no, el alta se rechaza nombrando el que falta.'
                            : 'No se pudo comprobar si el código está libre: ' +
                              (codigoDelAlta.error?.mensaje ?? 'la consulta al padrón no contestó') +
                              ' Mientras no se sepa, no se dice que lo esté.'}
                  </p>
                </section>

                {/* El tipo del predio VIAJA, así que se elige aquí y se ve.
                    Sin él, `PredioController.tipoDe(null)` devuelve URBANO. */}
                <section style={TARJETA}>
                  <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                    <p style={{ ...H2, margin: 0 }}>Tipo de predio</p>
                    <span style={META}>viaja como tipoPredio</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '13px 16px' }}>
                    {(['URBANO', 'RUSTICO'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipoDelAlta(t)}
                        aria-pressed={tipoDelAlta === t}
                        className="hov-linea"
                        style={{
                          border: `1px solid ${tipoDelAlta === t ? 'var(--accent)' : 'var(--line-2)'}`,
                          borderRadius: 999,
                          padding: '5px 14px',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          background: tipoDelAlta === t ? 'var(--accent-soft)' : 'var(--bg-card)',
                          color: tipoDelAlta === t ? 'var(--accent-ink)' : 'var(--ink-4)',
                        }}
                      >
                        {t === 'URBANO' ? 'Urbano' : 'Rústico'}
                      </button>
                    ))}
                    <span style={{ fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Son los dos valores que el dominio declara, letra por letra.
                    </span>
                  </div>
                  {modalidades.rural && tipoDelAlta === 'URBANO' && (
                    <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--warn-bg)', color: 'var(--warn-fg)', fontSize: 12.5, lineHeight: 1.5, textWrap: 'pretty' }}>
                      Has encendido la modalidad Rural y el predio va a entrar como <strong>urbano</strong>. Elige el tipo que
                      corresponde: no se deduce de la modalidad.
                    </p>
                  )}
                </section>

                <section style={TARJETA}>
                  <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                    <p style={{ ...H2, margin: 0 }}>Qué falta para poder registrar</p>
                    <span style={META}>{puedeRegistrar ? 'Nada: se puede registrar' : faltaDelAlta.length + (faltaDelAlta.length === 1 ? ' cosa' : ' cosas')}</span>
                  </div>
                  {/* Decía «Quedan 81 datos obligatorios sin llenar» contando los 81
                      campos del formulario, de los que solo dos llegaban al
                      servidor: se negaba a registrar por datos que nadie iba a
                      guardar, y no decía cuál faltaba. Ahora nombra los tres que
                      el alta necesita de verdad. */}
                  {[
                    { que: 'El código de referencia catastral, sus ocho tramos', ok: codigoListo && !codigoDuplicado },
                    { que: 'La dirección del predio', ok: direccionDelAlta !== '' },
                    { que: 'La observación de quien inscribe', ok: observacion.trim() !== '' },
                  ].map((r) => (
                    <div key={r.que} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          flex: '0 0 auto',
                          background: r.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
                          color: r.ok ? 'var(--ok-fg)' : 'var(--warn-fg)',
                        }}
                      >
                        <Icono d={r.ok ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5V13M12 16.5h.02']} tam={12} grosor={2.4} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{r.que}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px 14px', borderTop: '1px solid var(--line)' }}>
                    {secciones.map((x, i) => (
                      <button
                        key={x.id}
                        onClick={() => setPaso(i)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 11.5,
                          color: i === paso ? 'var(--accent-ink)' : 'var(--ink-4)',
                          fontWeight: i === paso ? 600 : 400,
                        }}
                      >
                        {i + 1 + '. ' + x.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ ...PIE, fontSize: 12.5 }}>
                    Los seis pasos son la <strong>ficha</strong> del manual, y la ficha se levanta con otra operación: de todo lo que
                    se teclee ahí, al alta del predio solo llegan el código, el tipo, la dirección, la vía, el número municipal y el
                    sector, la manzana y el lote que salen del propio código.
                  </p>
                </section>
              </>
            )}

            {/* De dónde sale cada cosa, dicho donde se lee. Sin esta franja, los
                123 campos de abajo se leen como los de ESTE predio, y no lo son:
                el padrón está conectado y la ficha no.

                Se dibujaba solo con `abierto`, es decir solo cuando se había
                llegado desde una fila del padrón —y las cinco entradas de fichas
                de la paleta y el «Abrir el predio» del mapa entraban con `abierto
                = null`, que es justo la rama sin franja—. Ahora sale siempre que
                haya una ficha delante. */}
            {!esNuevo && (
              <div
                role="note"
                style={{
                  display: 'flex',
                  gap: 11,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--warn-bg)',
                  color: 'var(--warn-fg)',
                  border: '1px solid color-mix(in srgb, var(--warn-fg) 22%, transparent)',
                }}
              >
                <Icono d={ICO.aviso} tam={16} grosor={1.8} style={{ flex: '0 0 auto', marginTop: 1 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                  <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>
                    {abierto === null
                      ? 'Aquí no hay ningún predio abierto: lo de abajo no es de nadie.'
                      : !abierto.fichado
                        ? 'Este predio está en el padrón y NO tiene ficha catastral.'
                        : leida !== null
                          ? 'Ficha ' + rotuloDeModalidad(leida.tipo) + ', versión ' + leida.version + ', vigente desde el ' + leida.vigenciaDesde + '.'
                          : esperandoLaFicha
                            ? 'Leyendo la ficha de este predio…'
                            : 'La ficha de este predio no se ha podido leer.'}
                  </strong>
                  {abierto === null ? (
                    <>
                      Ni el código, ni el titular, ni las áreas: no se ha leído ningún predio. Vuelve al padrón y abre uno.
                    </>
                  ) : !abierto.fichado ? (
                    <>
                      Lo que falta es la <strong>primera versión</strong> de su ficha, y esa se levanta con{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>POST /catastro/fichas/&#123;tipo&#125;</span> —urbana, económica, de
                      bienes comunes o rural—, no con la actualización, que versiona una que ya existe. Esta pantalla todavía no lo hace:
                      ese alta pide el área del terreno, el uso y el detalle del tipo, y ninguno de esos campos llega hoy al servidor desde
                      aquí. Lo de abajo se dibuja vacío a propósito.
                    </>
                  ) : lecturaDeLaFicha.error !== null || tipoDeFicha.error !== null ? (
                    <>
                      {(lecturaDeLaFicha.error ?? tipoDeFicha.error)!.mensaje}. Las cuatro lecturas de ficha exigen cada una su propio
                      acceso —<span style={{ fontFamily: 'var(--font-mono)' }}>ficha_urbana</span>,{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ficha_economica</span>,{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ficha_bienes</span> y{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ficha_rural</span>—, y resolver de cuál de las cuatro es exige además{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>consulta_fichas</span>.
                    </>
                  ) : (
                    <>
                      Los campos de abajo salen de{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>GET /catastro/fichas/{modalidadDeLaFicha}/{abierto.codRefCatastral}</span>{' '}
                      y del padrón, y los que aparecen en <span style={{ fontFamily: 'var(--font-mono)' }}>—</span> es porque{' '}
                      <strong>nadie los publica</strong>: cada uno dice cuál. De las 123 casillas que el manual dibuja, el sistema sostiene
                      catorce y sólo dos llegan al servidor —el número municipal y la fuente—; las demás describen datos que no están en el
                      modelo, listas que se enseñan en sus tablas, o importes que la ficha no publica a propósito.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* El único acto que cambia si el predio está o no en el padrón. No lo
                dibuja el manual —es posterior—, así que lleva su propio rótulo y
                dice qué hace y qué no. */}
            {abierto && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Estado en el padrón</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    {abierto.estado === 'ACTIVO'
                      ? 'Dar de baja retira el predio del padrón: deja de entrar en toda emisión futura. No borra su ficha, ni su titularidad, ni las determinaciones que ya se apoyaron en él, y tiene vuelta.'
                      : 'Este predio está retirado del padrón. Devolverlo lo restituye a las emisiones futuras; lo emitido mientras estuvo de baja no cambia.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '14px 16px' }}>
                  <label style={{ flex: 1, minWidth: 260 }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                      Observación · obligatoria
                    </span>
                    <input
                      value={motivoDeEstado}
                      onChange={(e) => setMotivoDeEstado(e.target.value)}
                      placeholder={abierto.estado === 'ACTIVO' ? 'Por qué se retira, y con qué documento' : 'Por qué se devuelve al padrón'}
                      style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 11px', background: 'var(--bg-card)', fontSize: 13.5 }}
                    />
                  </label>
                  <button
                    onClick={() => void cambiarEstado()}
                    disabled={motivoDeEstado.trim() === '' || cambiandoEstado}
                    title={motivoDeEstado.trim() === '' ? 'Falta la observación: sin motivo no se guarda' : undefined}
                    className={motivoDeEstado.trim() === '' ? undefined : 'hov-linea'}
                    style={{
                      border: `1px solid ${abierto.estado === 'ACTIVO' ? 'var(--bad-fg)' : 'var(--line-2)'}`,
                      borderRadius: 6,
                      padding: '9px 18px',
                      background: abierto.estado === 'ACTIVO' ? 'var(--bad-bg)' : 'var(--bg-card)',
                      color: abierto.estado === 'ACTIVO' ? 'var(--bad-fg)' : 'var(--ink)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: motivoDeEstado.trim() === '' ? 'not-allowed' : 'pointer',
                      opacity: motivoDeEstado.trim() === '' || cambiandoEstado ? 0.55 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {abierto.estado === 'ACTIVO' ? 'Dar de baja del padrón' : 'Devolver al padrón'}
                  </button>
                </div>
              </section>
            )}

            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {resumen.map((r) => (
                  <div
                    key={r.etiqueta}
                    style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}
                  >
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r.etiqueta}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
                      {r.valor}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>Modalidades</span>
                {MODALIDADES.map((mo) => {
                  const on = modalidades[mo[0]];
                  return (
                    <button
                      key={mo[0]}
                      onClick={() => setModalidades((x) => ({ ...x, [mo[0]]: !on }))}
                      aria-pressed={on}
                      title={mo[2]}
                      className="hov-linea"
                      style={{
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                        borderRadius: 999,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-4)',
                      }}
                    >
                      {mo[1]}
                    </button>
                  );
                })}
                {/* El conmutador de siglas: la prop «mostrarSiglas» del artboard */}
                <button
                  onClick={() => setMostrarSiglas((v) => !v)}
                  aria-pressed={mostrarSiglas}
                  title="Muestra la sigla del manual —MEP, ECS, CUC— al lado del nombre en claro."
                  className="hov-linea"
                  style={{
                    border: `1px solid ${mostrarSiglas ? 'var(--accent)' : 'var(--line-2)'}`,
                    borderRadius: 999,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: mostrarSiglas ? 'var(--accent-soft)' : 'var(--bg-card)',
                    color: mostrarSiglas ? 'var(--accent-ink)' : 'var(--ink-4)',
                  }}
                >
                  Siglas
                </button>
                <span data-sm-hide="1" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                  Las que no aplican no piden datos
                </span>
              </div>
            </section>

            {/* Aquí iba «Falta el área construida verificada del piso 02. Es el
                único dato que impide cerrar la actualización de esta ficha»: no
                impide nada, porque el área construida verificada no llega al
                servidor por ningún camino —el cuerpo de la actualización lleva
                la lista de construcciones y ninguna de las dos áreas que el
                manual dibuja—, así que prometía un cierre que no existe y
                mandaba al paso 4 a llenar un campo que se pierde al salir. Lo
                que de verdad impide versionar lo dice `impedimento`, en la barra
                de guardado. */}

            {!esNuevo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-card)' }}>
                  {MODOS.map((mo) => {
                    const on = modo === mo[0];
                    return (
                      <button
                        key={mo[0]}
                        onClick={() => {
                          setModo(mo[0]);
                          setPaso(0);
                        }}
                        aria-pressed={on}
                        style={{
                          border: 0,
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: on ? 600 : 400,
                          background: on ? 'var(--accent)' : 'transparent',
                          color: on ? '#fff' : 'var(--ink-3)',
                        }}
                      >
                        {mo[1]}
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {modo === 'pagina'
                    ? 'Una página: todo a la vista, secciones colapsables e índice a la izquierda. Para revisar y corregir una ficha que ya existe.'
                    : 'Por pasos: una sección a la vez, con progreso visible y guardado al avanzar. Para registrar o levantar en campo.'}
                </p>
              </div>
            )}

            {modo === 'pasos' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '15px 17px 17px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                    {secciones.length > 0 ? secciones[paso].label : ''}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {'Paso ' + (paso + 1) + ' de ' + secciones.length}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {secciones.map((x, i) => (
                    <button
                      key={x.id}
                      onClick={() => setPaso(i)}
                      aria-label={'Ir al paso ' + (i + 1) + ': ' + x.label}
                      style={{ flex: 1, height: 6, border: 0, borderRadius: 999, cursor: 'pointer', background: i <= paso ? 'var(--accent)' : 'var(--accent-soft)' }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 11 }}>
                  {secciones.map((x, i) => (
                    <button
                      key={x.id}
                      onClick={() => setPaso(i)}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: 11.5,
                        color: i === paso ? 'var(--accent-ink)' : 'var(--ink-4)',
                        fontWeight: i === paso ? 600 : 400,
                      }}
                    >
                      {i + 1 + '. ' + x.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              {modo === 'pagina' && (
                <nav
                  aria-label="Secciones de la ficha"
                  data-sm-hide="1"
                  style={{ flex: '0 0 202px', width: 202, position: 'sticky', top: 112, display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  <p style={{ margin: '0 0 6px 10px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                    En esta ficha
                  </p>
                  {secciones.map((x) => (
                    /* El artboard enlaza con `href="#ident"`; aqui la ruta vive
                       en el hash, asi que un ancla la reescribe, el router no
                       reconoce `#ubic` y cae a Inicio: la ficha desaparece **y se
                       lleva lo tecleado sin preguntar** (#682). Desplaza con
                       `scrollIntoView`, que es lo que la pantalla gemela de
                       Rentas ya hacia y lo que el propio modo «Por pasos» hace.

                       Y es un `<button>` y no un `<a>` porque no navega a ningun
                       sitio: mueve la vista. */
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => document.getElementById(x.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      aria-current={seccionALaVista === x.id ? 'true' : undefined}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 0,
                        borderRadius: 7,
                        padding: '8px 10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: seccionALaVista === x.id ? 'var(--accent-soft)' : 'transparent',
                        color: 'var(--ink-2)',
                        borderBottom: '1px solid transparent',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: seccionALaVista === x.id ? 600 : 400 }}>{x.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, flex: '0 0 auto', color: x.viajan > 0 && x.faltan === 0 ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
                        {x.viajan > 0 && x.faltan === 0 ? '✓' : '·'}
                      </span>
                    </button>
                  ))}
                </nav>
              )}

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(modo === 'pasos' ? secciones.slice(paso, paso + 1) : secciones).map((s) => (
                  <section key={s.id} id={s.id} style={{ ...TARJETA, scrollMarginTop: 120 }}>
                    <button
                      onClick={() => setCerradas((x) => ({ ...x, [s.clave]: s.abierta }))}
                      aria-expanded={s.abierta}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 0, background: 'transparent', padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 20,
                          height: 20,
                          color: 'var(--ink-4)',
                          flex: '0 0 auto',
                          transform: `rotate(${s.abierta ? 0 : -90}deg)`,
                          transition: 'transform .15s ease',
                        }}
                      >
                        <Icono d={CARET} tam={13} grosor={2} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{s.hint}</span>
                      </span>
                      {/* En el alta, la insignia no cuenta campos: dice si de esta
                          sección viaja algo. Contaba los del artboard —«7 campos
                          pendientes»— sobre campos que el alta no manda, y con la
                          opción vacía puesta habrían seguido saliendo pendientes
                          para siempre. */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: 999,
                          padding: '3px 10px',
                          flex: '0 0 auto',
                          color: s.viajan === 0 ? 'var(--warn-fg)' : 'var(--ok-fg)',
                          background: s.viajan === 0 ? 'var(--warn-bg)' : 'var(--ok-bg)',
                        }}
                      >
                        {/* «Completa» decía de una sección con dieciocho casillas
                            en blanco que estaba completa, porque ninguna era
                            obligatoria. Lo que hay que saber de una sección es
                            cuántos de sus campos llegan al servidor. */}
                        {s.viajan === 0
                          ? 'De aquí no viaja nada'
                          : s.viajan + (s.viajan === 1 ? ' campo viaja' : ' campos viajan')}
                      </span>
                    </button>
                    {s.abierta && <div style={{ borderTop: '1px solid var(--line)' }}>{s.bloques.map(bloqueDeFicha)}</div>}
                  </section>
                ))}

                {/* El titular: el segundo acto, en el paso donde se cierra el alta.
                    Va antes del resumen porque el resumen lo cuenta. */}
                {esNuevo && paso >= secciones.length - 1 && (
                  <section style={TARJETA}>
                    <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                      <p style={{ ...H2, margin: 0 }}>Titular del predio</p>
                      <span style={META}>{titularElegido ? 'segunda petición' : 'opcional, pero el predio no se cobra sin él'}</span>
                    </div>
                    <p style={{ margin: 0, padding: '11px 16px', borderBottom: '1px solid var(--line)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                      El alta del predio no lleva contribuyente: la titularidad es otro acto,{' '}
                      <code style={{ fontFamily: 'var(--font-mono)' }}>POST /catastro/predios/&#123;predioId&#125;/titulares</code>, y se
                      manda <strong>después</strong> de que el predio exista, porque hasta entonces no hay identificador al
                      que colgarla. Se puede inscribir el predio sin titular —así estaba hasta ahora—, pero un predio sin
                      titular no tiene a quién cobrarse.
                    </p>
                    {bloqueDeTitular}
                  </section>
                )}

                {/* Lo que se va a registrar: el cierre del alta guiada */}
                {esNuevo && paso >= secciones.length - 1 && (
                  <section style={TARJETA}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que se va a registrar</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                        Al pulsar se inscribe <strong>el predio</strong>: su código, su dirección y su ubicación. Su ficha catastral se
                        levanta después, y hasta entonces el predio está en el padrón sin nada con qué valorizarse. Antes de crearlo, esto
                        es lo que va a quedar escrito.
                      </p>
                    </div>
                    {/* Este panel prometía DOS cosas que el alta no hace, y las dos
                        con la marca verde de «hecho»: que «el predio empieza a
                        generar obligación predial · Ejercicio 2026 ✓» —inscribir un
                        predio no asienta ninguna deuda: eso sale de su declaración
                        jurada y de la determinación— y que «se vincula al
                        contribuyente · Listo» —el cuerpo del POST no lleva ningún
                        contribuyente, y la titularidad la registra otra operación,
                        `POST /catastro/predios/{predioId}/titulares`—. */}
                    {[
                      {
                        titulo: 'Se inscribe el predio ' + (codigoListo ? codigoCompleto : 'sin código'),
                        detalle: codigoListo
                          ? 'Entra en el padrón catastral, activo, sin ficha y sin titular.'
                          : 'Falta completar los ocho tramos del código.',
                        valor: codigoListo ? 'Alta' : SIN_DATO,
                        ok: codigoListo,
                      },
                      {
                        titulo: 'Con la dirección ' + (direccionDelAlta === '' ? 'todavía sin poner' : '«' + direccionDelAlta + '»'),
                        detalle: viaElegida
                          ? 'Elegida del catálogo vial, y viaja además su código de vía ' + viaElegida.codigo + '.'
                          : direccionDelAlta === ''
                            ? 'Es obligatoria: sin ella el servidor rechaza el alta.'
                            : 'Escrita a mano: no se eligió ninguna vía del catálogo, así que el predio queda sin vía.',
                        valor: direccionDelAlta === '' ? 'Falta' : viaElegida ? 'Del catálogo' : 'A mano',
                        ok: direccionDelAlta !== '',
                      },
                      {
                        titulo: 'Entra como predio ' + (tipoDelAlta === 'URBANO' ? 'urbano' : 'rústico'),
                        detalle: 'El tipo viaja en la petición. Sin declararlo, el servidor lo daría por urbano.',
                        valor: tipoDelAlta,
                        ok: true,
                      },
                      /* Esta línea decía «NO se le vincula ningún titular» y era
                         cierta: no había por dónde elegirlo. Ahora lo hay, así que
                         dice lo que va a pasar de verdad —una cosa u otra— en vez
                         de una sola de las dos. Cuando no se declara ninguno,
                         sigue diciendo que no se vincula. */
                      titularElegido === null
                        ? {
                            titulo: 'NO se le vincula ningún titular',
                            detalle:
                              'El alta del predio no lleva contribuyente. Elige uno arriba, o el predio entra en el padrón ' +
                              'sin nadie a quien cobrarle: la obligación predial se determina por contribuyente.',
                            valor: 'Sin titular',
                            ok: false,
                          }
                        : {
                            titulo:
                              'Se le declara titular a ' + titularElegido.nombreRazonSocial + ' (' + titularElegido.codigo + ')',
                            detalle:
                              'Como ' +
                              condicionDelTitular +
                              (titularPorElTotal ? ', por el total' : ' con el ' + (porcentajeTecleado || SIN_DATO) + ' %') +
                              ', con «' +
                              (documentoDelTitular.trim() || SIN_DATO) +
                              '». Es una SEGUNDA petición, detrás del alta y con su propia observación: si el predio se ' +
                              'inscribe y ésta falla, el predio queda inscrito y se dice cuál es.',
                            valor: titularPorElTotal ? '100 %' : (porcentajeTecleado || SIN_DATO) + ' %',
                            ok: faltaDelTitular.length === 0,
                          },
                      {
                        titulo: 'NO empieza a generar obligación predial',
                        detalle:
                          'Inscribir un predio no asienta deuda de ningún ejercicio: la obligación nace de su declaración ' +
                          'jurada y de la determinación, que son de Rentas.',
                        valor: 'Después',
                        ok: false,
                      },
                      {
                        titulo: 'La ficha catastral no se crea aquí',
                        detalle:
                          'Lo tecleado en los pasos anteriores describe la ficha, y la ficha la levanta otra operación. De este formulario solo viajan el código, el tipo, la dirección, la vía, el número municipal y el sector, la manzana y el lote del propio código.',
                        valor: 'Después',
                        ok: false,
                      },
                    ].map((l) => (
                      <div key={l.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            background: l.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
                            color: l.ok ? 'var(--ok-fg)' : 'var(--warn-fg)',
                          }}
                        >
                          <Icono d={l.ok ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5V13M12 16.5h.02']} tam={13} grosor={2.4} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{l.titulo}</span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{l.detalle}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flex: '0 0 auto', whiteSpace: 'nowrap' }}>{l.valor}</span>
                      </div>
                    ))}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                          Observación · obligatoria
                        </span>
                        <textarea
                          value={observacion}
                          onChange={(e) => setObservacion(e.target.value)}
                          rows={2}
                          placeholder="Por qué se inscribe este predio y con qué documento"
                          style={{
                            width: '100%',
                            border: '1px solid var(--line-2)',
                            borderRadius: 6,
                            padding: '9px 11px',
                            background: 'var(--bg-card)',
                            fontSize: 13.5,
                            resize: 'vertical',
                          }}
                        />
                      </label>
                      <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                        Queda en la bitácora junto a quién lo hizo y cuándo. Sin ella no se guarda.
                      </p>
                    </div>

                    {/* El fallo del servidor, dicho donde se pulsó. Un 409 es lo
                        corriente aquí: alguien ya inscribió ese código. */}
                    {fallo && (
                      <p
                        style={{
                          margin: 0,
                          padding: '11px 16px',
                          borderBottom: '1px solid var(--line)',
                          background: 'var(--bad-bg)',
                          color: 'var(--bad-fg)',
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          textWrap: 'pretty',
                        }}
                      >
                        No se inscribió: {fallo.mensaje}
                      </p>
                    )}

                    <p
                      style={{
                        margin: 0,
                        padding: '11px 16px',
                        background: puedeRegistrar ? 'var(--ok-bg)' : codigoDuplicado || !codigoListo ? 'var(--bad-bg)' : 'var(--warn-bg)',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: puedeRegistrar ? 'var(--ok-fg)' : codigoDuplicado || !codigoListo ? 'var(--bad-fg)' : 'var(--warn-fg)',
                        textWrap: 'pretty',
                      }}
                    >
                      {puedeRegistrar
                        ? titularElegido
                          ? 'Todo listo. Son dos peticiones: primero el predio y después su titular, cada una con su observación. El predio entra en el padrón sin ficha y sin obligación.'
                          : 'Todo listo. Al registrar, el predio entra en el padrón catastral: sin ficha, sin titular y sin obligación.'
                        : 'No se puede registrar todavía. ' + motivoBloqueo}
                    </p>
                  </section>
                )}

                {modo === 'pasos' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <PasoAtras paso={paso} atras={() => setPaso(paso - 1)} />
                    <p style={{ margin: 0, flex: 1, minWidth: 160, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {/* «El borrador se guarda al avanzar: si se corta la sesión, lo
                          escrito no se pierde» — no se guarda en ninguna parte:
                          vive en la memoria de la pestaña y se pierde al recargar. */}
                      {paso >= secciones.length - 1
                        ? esNuevo
                          ? puedeRegistrar
                            ? titularElegido
                              ? 'Son dos peticiones: el predio y, detrás, su titular. Si la segunda falla, el predio queda inscrito y la pantalla dice cuál es.'
                              : 'Al registrar, el predio entra en el padrón catastral: sin ficha, sin titular y sin obligación.'
                            : motivoBloqueo
                          : (impedimento ??
                            'Se emite la versión siguiente de la ficha y la que rige se cierra el día antes: aquí no se corrige, se versiona.')
                        : esNuevo
                          ? 'Nada se guarda hasta el último paso: lo escrito vive en esta pestaña y se pierde al recargar.'
                          : MOTIVO_DE_LOS_CAMPOS_QUE_NO_VIAJAN}
                    </p>
                    <button
                      onClick={pasoAdelante}
                      aria-disabled={pasoBloqueado}
                      title={pasoBloqueado ? (esNuevo ? motivoBloqueo : (impedimento ?? undefined)) : undefined}
                      className="hov-acento-2"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        border: 0,
                        borderRadius: 6,
                        padding: '11px 22px',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: pasoBloqueado ? 0.55 : 1,
                      }}
                    >
                      {paso >= secciones.length - 1
                        ? esNuevo
                          ? 'Registrar el predio'
                          : versionando
                            ? 'Versionando…'
                            : 'Guardar como versión nueva'
                        : 'Continuar'}
                      <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ MAPA CATASTRAL ══════════ */}
        {dest === 'mapa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El plano catastral: los lotes de un marco, con su polígono, tal como están en el padrón. Al seleccionar uno se ven sus datos
              y el camino a su ficha.
            </p>

            {/* Aquí decía que «ninguna operación de esta API publica geometría»,
                y desde #536 no es cierto: `GET /catastro/predios/plano` la
                publica. Lo que sigue siendo cierto —y hay que decir— es lo otro:
                que no hay ni un polígono cargado, que el plano no lleva base
                cartográfica, y que el marco con que abre no sale de ninguna
                lectura. Las tres se dicen donde se notan, no aquí en bloque. */}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 318px', gap: 14, alignItems: 'start' }}>
              <section style={{ ...TARJETA, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  {/* Los tres controles de aquí estaban vivos y ninguno hacía
                      nada: el desplegable ofrecía S-01…S-05 —los del artboard—,
                      la caja no buscaba y «Ubicar» encuadraba lo ya encuadrado.
                      Ahora los dos primeros son los DOS filtros que
                      `PlanoCatastralController` admite, y acotan también la
                      cuenta de predios sin polígono (medido: sector «01» de
                      Catacaos deja `sinGeometria` en 1, de 14 422). */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                    Sector
                    <select
                      value={mapaSector}
                      onChange={(e) => setMapaSector(e.target.value)}
                      disabled={sectoresDelPanel.datos === null}
                      title={sectoresDelPanel.datos === null ? 'No se pudieron leer los sectores de esta municipalidad' : undefined}
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 9px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                    >
                      <option value="">Todos</option>
                      {(sectoresDelPanel.datos?.contenido ?? []).map((sec) => (
                        <option key={sec.codigo} value={sec.codigo}>
                          {sec.codigo} — {sec.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                    Manzana
                    <select
                      value={mapaManzana}
                      onChange={(e) => setMapaManzana(e.target.value)}
                      disabled={mapaSector === '' || manzanasDelMapa.datos === null}
                      title={mapaSector === '' ? 'Elige antes un sector: la manzana se numera dentro de él' : undefined}
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 9px', background: 'var(--bg-elev)', fontSize: 12.5, opacity: mapaSector === '' ? 0.55 : 1 }}
                    >
                      <option value="">Todas</option>
                      {(manzanasDelMapa.datos?.contenido ?? []).map((mz) => (
                        <option key={mz.id} value={mz.codigo}>
                          {mz.codigo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={() => irA('predios')} className="hov-linea" style={BOTON_LINEA}>
                    Buscar en el padrón
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {/* El «100 %» del artboard se fue con el esquema: sobre
                        geometría proyectada un porcentaje no dice nada, y lo que
                        significa algo es la escala en el terreno. Sale del
                        encuadre —que lo calcula esta pantalla— y no de ninguna
                        cifra del backend, así que sin lotes no hay escala. */}
                    <Icono d={ICO.mapa} tam={13} grosor={1.7} />
                    {dibujo === null ? 'Sin escala: no hay nada dibujado' : escalaDelPlano(dibujo.anchoEnGrados, dibujo.latitudMedia)}
                  </span>
                </div>

                {/* El marco. Se teclea porque no hay de dónde sacarlo: ninguna
                    operación del contrato publica dónde está la municipalidad
                    —ni su extensión, ni la de un sector—, y `bbox` es
                    obligatorio. Se dice aquí y no en una franja de arriba
                    porque es exactamente aquí donde se nota. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  <label htmlFor="marco-del-plano" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Marco
                  </label>
                  <input
                    id="marco-del-plano"
                    value={marcoTecleado}
                    onChange={(e) => setMarcoTecleado(e.target.value)}
                    onBlur={() => {
                      const leido = marcoDe(marcoTecleado);
                      if (leido !== null) setMarco(leido);
                      else setMarcoTecleado(comoBbox(marco));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    aria-describedby="marco-nota"
                    spellCheck={false}
                    style={{ flex: 1, minWidth: 230, border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 9px', background: 'var(--bg-card)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}
                  />
                  <button onClick={() => acercarElMarco()} className="hov-linea" style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12 }}>
                    Acercar
                  </button>
                  <button onClick={() => alejarElMarco()} className="hov-linea" style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12 }}>
                    Alejar
                  </button>
                  <button
                    onClick={() => cambiarMarco(MARCO_INICIAL)}
                    disabled={marcoEsElInicial}
                    title={marcoEsElInicial ? 'El marco ya es el inicial' : undefined}
                    className="hov-linea"
                    style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12, opacity: marcoEsElInicial ? 0.5 : 1 }}
                  >
                    Restablecer
                  </button>
                  <span id="marco-nota" style={{ width: '100%', fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.5, textWrap: 'pretty' }}>
                    <code style={{ fontFamily: 'var(--font-mono)' }}>oeste,sur,este,norte</code> en grados. Abre sobre el Perú entero
                    porque ninguna lectura publica dónde está esta municipalidad (#612): el dibujo se encuadra después, sobre los
                    polígonos que vuelvan.
                  </span>
                </div>

                {plano.cargando && (
                  <div style={{ padding: 14 }}>
                    <div data-esq="1" style={{ height: 220 }} />
                  </div>
                )}

                {/* Los 422 de esta operación son dos cosas opuestas, y desde
                    #611 el código las separa: `MARCO_CON_DEMASIADOS_LOTES` dice
                    «la petición está bien, hay demasiado dentro» —y lo resuelve
                    acercarse—, y `VALIDACION` dice «corrige lo que pediste».
                    Hasta aquí compartían código y lo único que las distinguía
                    era el texto en castellano, así que la pantalla ofrecía
                    acercar también ante un marco del revés y titulaba «el
                    servidor no sirve este marco» a una respuesta que sí sirve.
                    El orden importa: el caso propio va delante del genérico. */}
                {plano.error !== null &&
                  (plano.error.codigo === 'MARCO_CON_DEMASIADOS_LOTES' ? (
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Tono de aviso y no de error, como el «ese código no
                          está en el padrón» de Consultas (#622): la lectura se
                          hizo, el servidor contestó lo que sabía, y reintentar
                          devolvería exactamente esto. Por eso tampoco hay
                          «Reintentar» —`reintentable` es falso para este
                          código— y sí las dos acciones que sí lo resuelven. */}
                      <Aviso tono="warn" titulo="Hay más lotes en este marco de los que se dibujan">
                        Dentro de este marco hay{' '}
                        <strong>{marcoLleno.lotes === null ? SIN_DATO : marcoLleno.lotes.toLocaleString('es-PE')}</strong> lotes, y el
                        máximo que este servidor dibuja de una vez son{' '}
                        <strong>{marcoLleno.tope === null ? SIN_DATO : marcoLleno.tope.toLocaleString('es-PE')}</strong>. No es un fallo
                        ni un rechazo de lo que pediste: el marco está bien escrito y lo que no cabe es lo que tiene dentro. Y no se
                        dibujan «los primeros», porque un plano al que le faltan lotes no se ve recortado —se ve como un plano donde ahí
                        no hay lotes— (ADR-0022 §2). Acércalo, o acota por sector y manzana con los dos desplegables de arriba.
                        {(marcoLleno.lotes === null || marcoLleno.tope === null) && (
                          <span style={{ display: 'block', marginTop: 6, opacity: 0.85 }}>
                            Las cifras que salen con «{SIN_DATO}» no vinieron en esta respuesta. La línea de abajo es el texto del
                            servidor tal cual, y es lo único que queda para saberlas.
                          </span>
                        )}
                      </Aviso>
                      {/* El texto del servidor baja a la línea técnica, como en
                          #622: ahí vale de evidencia y no compite con el titular
                          —que lo escribe la pantalla, porque el mensaje se
                          reescribe y el código no—. */}
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                        GET /catastro/predios/plano · {plano.error.estado} · «{plano.error.mensaje}»
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => acercarElMarco()} className="hov-acento-2" style={{ border: 0, borderRadius: 6, padding: '9px 14px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                          Acercar el marco
                        </button>
                        <button
                          onClick={() => cambiarMarco(MARCO_INICIAL)}
                          disabled={marcoEsElInicial}
                          title={marcoEsElInicial ? 'El marco ya es el inicial: lo que hay que hacer es acercarlo' : undefined}
                          className="hov-linea"
                          style={{ ...BOTON_LINEA, opacity: marcoEsElInicial ? 0.5 : 1 }}
                        >
                          Restablecer
                        </button>
                      </div>
                    </div>
                  ) : plano.error.codigo === 'VALIDACION' ? (
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Aquí sí es un defecto de lo que se pidió, y en esta
                          pantalla sólo puede ser el marco: `limite` viaja fijo
                          en LOTES_POR_MARCO —que es el tope del propio
                          servidor—, así que sus tres rechazos no son
                          alcanzables desde aquí. El mensaje del servidor sale
                          entero y arriba porque es lo único que dice CUÁL de
                          los cuatro números está mal: medido, «el oeste (-80.67)
                          tiene que ser menor que el este (-80.69)» y «La latitud
                          norte tiene que estar entre -90 y 90 grados». */}
                      <Aviso tono="bad" titulo="El marco que se pidió no es un marco">
                        {plano.error.mensaje}
                        <span style={{ display: 'block', marginTop: 6, opacity: 0.85 }}>
                          Se corrige en la caja «Marco» de aquí arriba, que son esos cuatro números en grados, o restableciendo el
                          inicial. No se ofrece acercar: acercar parte de estos mismos cuatro y lo que hay que cambiar son ellos.
                        </span>
                      </Aviso>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => cambiarMarco(MARCO_INICIAL)}
                          disabled={marcoEsElInicial}
                          title={marcoEsElInicial ? 'El marco ya es el inicial: corrígelo en la caja de arriba' : undefined}
                          className="hov-acento-2"
                          style={{ border: 0, borderRadius: 6, padding: '9px 14px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: marcoEsElInicial ? 'default' : 'pointer', opacity: marcoEsElInicial ? 0.5 : 1 }}
                        >
                          Restablecer el marco
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 14 }}>
                      <FalloDeLectura error={plano.error} que="el plano catastral" acceso="consulta_fichas" alReintentar={plano.reintentar} />
                    </div>
                  ))}

                {/* **El estado de hoy, y el primero que esta pantalla tiene que
                    saber dibujar** (ADR-0022 §3): el plano contesta bien y no
                    trae ni un lote, porque no hay ni un polígono cargado. Un
                    lienzo vacío aquí se leería como un mapa roto, o peor: como
                    un distrito sin predios. */}
                {plano.error === null && !plano.cargando && dibujo === null && (
                  <div style={{ padding: '22px 18px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                    <Icono d={ICO.mapa} tam={30} grosor={1.3} style={{ color: 'var(--ink-4)' }} />
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      No hay ni un lote que dibujar en este marco
                    </p>
                    <p style={{ margin: 0, maxWidth: 520, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {plano.datos !== null && plano.datos.sinGeometria > 0 ? (
                        <>
                          <strong style={{ color: 'var(--ink-2)' }}>{plano.datos.sinGeometria.toLocaleString('es-PE')}</strong> predios
                          del padrón{mapaSector !== '' || mapaManzana !== '' ? ' que alcanzan estos filtros' : ''} no tienen ningún
                          polígono cargado. No es un fallo de la consulta ni de la sesión: el levantamiento cartográfico de esos predios
                          no se ha hecho, y hasta que se haga no hay plano que dibujar.
                        </>
                      ) : (
                        <>
                          Ningún predio del padrón{mapaSector !== '' || mapaManzana !== '' ? ' que alcance estos filtros' : ''} se queda
                          sin polígono, así que lo que no hay es ningún lote dentro de este marco: mueve el marco o quita los filtros.
                        </>
                      )}
                    </p>
                  </div>
                )}

                {dibujo !== null && (
                  <div style={{ overflow: 'auto', background: 'var(--bg-elev)', maxHeight: '66vh' }}>
                    <svg
                      viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
                      preserveAspectRatio="xMidYMid meet"
                      role="img"
                      aria-label={`Plano catastral: ${dibujo.piezas.length} lotes dibujados`}
                      style={{ display: 'block', width: '100%', height: 'auto' }}
                    >
                      {/* El fondo del plano, y NO una base cartográfica: no hay
                          teselas ni las va a haber sin salida a internet, que es
                          lo corriente en una municipalidad. El pie lo dice. */}
                      <rect x="0" y="0" width={LIENZO.ancho} height={LIENZO.alto} fill="#f1ece0" />
                      {capas.predios &&
                        dibujo.piezas.map(({ lote: l, d: trazo }) => {
                          const elegido = l.predioId === loteElegido;
                          const grupo = gruposDibujados.indexOf(claveDeGrupo(l));
                          return (
                            <path
                              key={l.predioId}
                              d={trazo}
                              fill={elegido ? 'var(--accent)' : agrupadoPor !== null && grupo >= 0 ? COLORES_DE_GRUPO[grupo % COLORES_DE_GRUPO.length] : '#fbfaf6'}
                              stroke={elegido ? 'var(--accent-ink)' : 'var(--line-2)'}
                              strokeWidth={elegido ? 1.6 : 0.6}
                              onClick={() => setLoteElegido(l.predioId)}
                              style={{ cursor: 'pointer' }}
                            >
                              <title>{`${l.codRefCatastral} — ${l.direccion}`}</title>
                            </path>
                          );
                        })}
                    </svg>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '9px 14px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  {/* Decía «0 — 50 — 100 m · UTM 17S · WGS 84» y «actualización
                      2026-I»: una escala, una proyección y una fecha de un dibujo
                      sin coordenadas ni procedencia. Ahora hay coordenadas —4326,
                      no UTM: el Perú abarca tres zonas (ADR-0021)— y sigue sin
                      haber fecha, porque ninguna lectura publica cuándo se
                      levantó nada. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>WGS 84 (EPSG:4326) · Mercator al dibujar</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Sin base cartográfica: sólo los polígonos del padrón</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 'auto' }}>Sin fecha de levantamiento: no se publica</span>
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                {/* **`sinGeometria` sale SIEMPRE, cero incluido**, y por eso no
                    vive dentro del estado vacío: con lotes dibujados es cuando
                    más engaña que falte —doscientos lotes en pantalla y
                    ochocientos predios sin levantar se leen como «este sector
                    tiene doscientos lotes»—. Y no es «los de este marco» aunque
                    el contrato lo diga así: `prediosSinGeometria` consulta sin el
                    marco a propósito. Medido: la misma cifra con el marco de
                    Piura y con el mundo entero. */}
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                    Predios sin polígono
                  </p>
                  <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: 22, color: plano.datos !== null && plano.datos.sinGeometria > 0 ? 'var(--warn-fg)' : 'var(--ink)' }}>
                    {plano.cargando ? '…' : plano.datos === null ? SIN_DATO : plano.datos.sinGeometria.toLocaleString('es-PE')}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    En el padrón entero{mapaSector !== '' ? ', dentro del sector elegido' : ''}, no en este marco: un predio sin polígono
                    no está en ningún sitio del plano.
                  </p>
                </section>

                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                    Capas
                  </p>
                  {CAPAS.map((c) => {
                    const on = capas[c.k] === true;
                    return (
                      <button
                        key={c.k}
                        onClick={() => setCapas((x) => ({ ...x, [c.k]: !on }))}
                        aria-pressed={on}
                        disabled={!c.dibujable}
                        title={c.nota}
                        className={c.dibujable ? 'hov-elev' : undefined}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '10px 14px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', cursor: c.dibujable ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: c.dibujable ? 1 : 0.6 }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 17,
                            height: 17,
                            borderRadius: 4,
                            flex: '0 0 auto',
                            marginTop: 1,
                            border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                            background: on ? 'var(--accent)' : 'var(--bg-card)',
                          }}
                        >
                          {on && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                          )}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)' }}>{c.label}</span>
                          {/* El motivo, escrito y no sólo en el `title`: un dato
                              que sólo se alcanza con el ratón no lo tiene quien
                              navega con teclado (RNF-082). */}
                          <span style={{ display: 'block', marginTop: 2, fontSize: 11, lineHeight: 1.45, color: 'var(--ink-4)', textWrap: 'pretty' }}>{c.nota}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{conteoDeLaCapa(c.k)}</span>
                      </button>
                    );
                  })}
                  {agrupadoPor !== null && dibujo !== null && (
                    <p style={{ margin: 0, padding: '9px 14px', fontSize: 11, lineHeight: 1.5, color: 'var(--ink-3)' }}>
                      Los lotes están coloreados por {agrupadoPor === 'manzanas' ? 'manzana' : 'sector'}. El color separa un grupo del de
                      al lado y no significa nada más: no es un rango de arancel ni un estado.
                    </p>
                  )}
                </section>

                {/* Aquí iba la ficha del lote: «Código predial 01-1042-0004»,
                    «Contribuyente Villegas Prado, Rosa», «Área de terreno 329.00
                    m²», «Arancel de la vía S/ 198.40 / m²» —nueve renglones del
                    artboard, los mismos para cualquier lote que se pulsara— y dos
                    botones, uno de los cuales abría ese predio inventado por la
                    puerta donde el aviso no se dibuja. De esos nueve, el recurso
                    publica cuatro; los otros cinco no se inventan y se dice de
                    dónde salen. */}
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>Lote seleccionado</span>
                    {elegido !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 999, padding: '3px 9px' }}>
                        {elegido.codRefCatastral}
                      </span>
                    )}
                  </div>
                  {elegido === null ? (
                    <p style={{ margin: 0, padding: '13px 14px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {dibujo === null
                        ? 'No hay ningún lote dibujado que seleccionar. Los datos de un predio salen de abrirlo en el padrón, que lo busca por su código de referencia catastral.'
                        : 'Pulsa un lote del plano para ver lo que el padrón publica de él.'}
                    </p>
                  ) : (
                    <>
                      <div style={{ padding: '4px 14px 10px' }}>
                        {(
                          [
                            ['Código de referencia catastral', elegido.codRefCatastral, 1],
                            ['Dirección', elegido.direccion, 0],
                            ['Sector', elegido.codigoDeSector ?? SIN_DATO, 1],
                            ['Manzana', elegido.codigoDeManzana ?? SIN_DATO, 1],
                            ['Lote', elegido.lote ?? SIN_DATO, 1],
                            ['Estado', elegido.estado, 0],
                          ] as [string, string, 0 | 1][]
                        ).map(([rot, val, mono]) => (
                          <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{rot}</span>
                            <span style={{ fontSize: 12, textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: 0, padding: '0 14px 12px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        El plano no publica titular, área ni arancel, y no es un olvido: quien puede listar predios no puede cosechar
                        predio→persona de toda la municipalidad. El titular se resuelve al abrir el predio, de uno en uno.
                      </p>
                      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
                        <button
                          onClick={() => {
                            setQ(elegido.codRefCatastral);
                            irA('predios');
                          }}
                          className="hov-acento-2"
                          style={{ flex: 1, border: 0, borderRadius: 6, padding: '9px 14px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                        >
                          Abrir en el padrón
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TERRITORIO ══════════ */}
        {dest === 'territorio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Sectores, manzanas y vías: la estructura sobre la que se arma el código de referencia catastral. Antes eran dos opciones de
              menú y aquí van juntas, aunque el catálogo vial es del ubigeo entero: una vía atraviesa sectores y no pertenece a ninguno.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Sectores</h2>
                  <span style={META}>
                    {sectores.cargando
                      ? '…'
                      : `${sectores.datos?.totalElementos ?? 0} · ${(sectores.datos?.contenido ?? []).reduce((a, x) => a + (x.manzanas ?? 0), 0)} manzanas`}
                  </span>
                </div>
                {sectores.error && (
                  <p style={{ margin: 0, padding: '14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
                    No se pudieron leer los sectores: {sectores.error.mensaje}
                  </p>
                )}
                {sectores.cargando &&
                  [1, 2, 3].map((i) => (
                    <div key={i} style={{ padding: '13px 14px', borderBottom: '1px solid var(--line)' }}>
                      <div data-esq="1" style={{ height: 13 }} />
                    </div>
                  ))}
                {(sectores.datos?.contenido ?? []).map((s) => {
                  const on = sectorAbierto === s.codigo;
                  return (
                    <div key={s.codigo} style={{ borderBottom: '1px solid var(--line)' }}>
                      <button
                        onClick={() => {
                          setSectorAbierto(on ? '' : s.codigo);
                          /* La pagina vuelve a 0 al cambiar de sector: si no, abrir
                             uno de tres manzanas estando en la pagina 4 del anterior
                             lo ensenia vacio, que se lee como «este no tiene». */
                          setPaginaDeManzanas(0);
                        }}
                        aria-expanded={on}
                        className="hov-acento"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          width: '100%',
                          textAlign: 'left',
                          border: 0,
                          background: on ? 'var(--accent-soft)' : 'transparent',
                          padding: '11px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 16,
                            height: 16,
                            color: 'var(--ink-4)',
                            flex: '0 0 auto',
                            transform: `rotate(${on ? 0 : -90}deg)`,
                            transition: 'transform .15s ease',
                          }}
                        >
                          <Icono d={CARET} tam={12} grosor={2} />
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 4, padding: '2px 6px', flex: '0 0 auto' }}>
                          {s.codigo}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.nombre}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>
                          {s.zona ?? SIN_DATO}
                        </span>
                      </button>
                      {on && (
                        <div style={{ padding: '4px 14px 12px 40px', background: 'var(--bg-elev)' }}>
                          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 9 }}>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                              Manzanas <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{s.manzanas ?? 0}</strong>
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                              Lotes <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{s.lotes ?? 0}</strong>
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                              Predios <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{s.predios ?? 0}</strong>
                            </span>
                          </div>

                          {/* Y CUALES son, desde #537.
                              Antes aquí sólo decía cuántas hay, porque el backend
                              no publicaba ninguna operación que las listara. */}
                          {manzanas.error !== null && (
                            <FalloDeLectura
                              error={manzanas.error}
                              que={`las manzanas del sector ${s.codigo}`}
                              acceso="sectores"
                              alReintentar={manzanas.reintentar}
                            />
                          )}
                          {manzanas.cargando && <div data-esq="1" style={{ height: 12, width: '70%' }} />}
                          {manzanas.error === null && !manzanas.cargando && (manzanas.datos?.contenido ?? []).length === 0 && (
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
                              Este sector todavía no tiene ninguna manzana registrada.
                            </p>
                          )}
                          {(manzanas.datos?.contenido ?? []).length > 0 && (
                            <>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(manzanas.datos?.contenido ?? []).map((mz) => (
                                  <span
                                    key={mz.id}
                                    /* El recuento va en el `title` y también escrito:
                                       un dato que sólo se alcanza con el ratón no lo
                                       tiene quien navega con teclado (RNF-082). */
                                    title={`Manzana ${mz.codigo}: ${mz.predios} predios en ${mz.lotes} lotes`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'baseline',
                                      gap: 6,
                                      border: '1px solid var(--line-2)',
                                      borderRadius: 6,
                                      padding: '4px 8px',
                                      background: 'var(--bg-card)',
                                      fontSize: 11.5,
                                    }}
                                  >
                                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-ink)' }}>{mz.codigo}</span>
                                    <span style={{ color: 'var(--ink-4)' }}>
                                      {mz.predios} pr · {mz.lotes} lt
                                    </span>
                                  </span>
                                ))}
                              </div>
                              {manzanas.datos != null && (
                                <Paginador
                                  pagina={manzanas.datos.pagina}
                                  totalPaginas={manzanas.datos.totalPaginas}
                                  hayMas={manzanas.datos.hayMas}
                                  ir={setPaginaDeManzanas}
                                  detalle={`${manzanas.datos.totalElementos.toLocaleString('es-PE')} manzanas`}
                                  style={{ padding: 0, borderTop: 'none', marginTop: 9 }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* El alta de sector, de manzana y de vía existen en el backend
                    (`POST /catastro/sectores`, `…/{codigo}/manzanas`, `POST
                    /catastro/vias`) y las tres exigen observación. No se dibujan
                    todavía porque el artboard no les dibuja formulario, y un
                    botón que abre lo que no hay es peor que no tenerlo. */}
                <p style={{ ...PIE, padding: '11px 14px' }}>
                  El alta de sectores, manzanas y vías la sirve el backend; su formulario todavía no está dibujado.
                </p>
              </section>

              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Catálogo vial</h2>
                  <span style={META}>
                    {vias.cargando ? '…' : `${(vias.datos?.contenido ?? []).length} de ${(vias.datos?.totalElementos ?? 0).toLocaleString('es-PE')}`}
                  </span>
                </div>
                {vias.error ? (
                  <p style={{ margin: 0, padding: '14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
                    No se pudo leer el catálogo vial: {vias.error.mensaje}
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                      <thead>
                        <tr>
                          <th style={TH}>Código</th>
                          <th style={TH}>Tipo</th>
                          <th style={TH}>Nombre</th>
                          <th style={TH}>Ubigeo</th>
                          <th style={TH}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(vias.datos?.contenido ?? []).map((v) => (
                          <tr key={v.id} style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{v.codigo}</td>
                            <td style={TD}>{v.tipo}</td>
                            <td style={TD}>{v.nombre}</td>
                            <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{v.ubigeo ?? SIN_DATO}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <span style={INS[v.activa ? 'ok' : 'bad']}>{v.activa ? 'Vigente' : 'De baja'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {vias.datos != null && (
                  <Paginador
                    pagina={vias.datos.pagina}
                    totalPaginas={vias.datos.totalPaginas}
                    hayMas={vias.datos.hayMas}
                    ir={setPaginaVias}
                    style={{ padding: '10px 14px' }}
                  />
                )}
                <p style={{ ...PIE, padding: '11px 14px' }}>
                  El catálogo es del ubigeo entero y no de un sector: una vía no pertenece a un sector en el modelo, así que esta tabla no
                  se acota con el árbol de la izquierda. El nombre de una vía viaja al domicilio fiscal de todos los contribuyentes que dan
                  a ella.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ══════════ VALORES DEL EJERCICIO ══════════ */}
        {dest === 'valores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...ENTRADILLA }}>
              Las tres tablas oficiales con las que se valoriza un predio del ejercicio {pref.ejercicio}. Se consultan e importan; no se
              editan fila a fila, porque las aprueba el Ministerio de Vivienda y cualquier cambio recalcula el autovalúo de todo el padrón.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {PESTANIAS_DE_VALORES.map((l, i) => {
                const on = valTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => setValTab(i)}
                    aria-pressed={on}
                    style={{
                      border: 0,
                      borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                      background: 'transparent',
                      padding: '11px 3px',
                      marginBottom: -1,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      color: on ? 'var(--ink)' : 'var(--ink-3)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {l}
                  </button>
                );
              })}
              {/* «Sellada para 2026» se ponía en verde con cualquier respuesta que
                  no fuera un 404, incluida la lista vacía: en Catacaos, que sí tiene
                  el conjunto sellado y CERO aranceles dentro, la insignia verde
                  coronaba una tabla de cero filas. Sellado y con qué valorizar no
                  son lo mismo. */}
              {lecturaDeValores.cargando ? (
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>Consultando…</span>
              ) : conjuntoSinSellar ? (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '4px 11px' }}>
                  <Icono d={ICO.aviso} tam={12} grosor={2.2} />
                  Sin sellar para {pref.ejercicio}
                </span>
              ) : lecturaDeValores.error ? (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--bad-fg)', background: 'var(--bad-bg)', borderRadius: 999, padding: '4px 11px' }}>
                  <Icono d={ICO.aviso} tam={12} grosor={2.2} />
                  No se pudo leer
                </span>
              ) : filasDeValores(valTab, aranceles.datos, unitarios.datos, deprec.datos).length === 0 ? (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--bad-fg)', background: 'var(--bad-bg)', borderRadius: 999, padding: '4px 11px' }}>
                  <Icono d={ICO.aviso} tam={12} grosor={2.2} />
                  Sellada y sin ninguna fila
                </span>
              ) : lecturaDeValores.datos ? (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ok-fg)', background: 'var(--ok-bg)', borderRadius: 999, padding: '4px 11px' }}>
                  <Icono d={['M5 12.5l4.5 4.5L19 7']} tam={12} grosor={2.4} />
                  Sellada para {pref.ejercicio}
                </span>
              ) : null}
            </div>

            <section style={TARJETA}>
              <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                {/* El título salía del artboard y describía otra tabla: «Aranceles
                    vigentes 2026» encima de cero filas, «Valores unitarios de
                    edificación — costa» sobre un cuadro que no dice de qué región
                    es, y «Depreciación … — ladrillo, casa habitación» sobre las 492
                    filas de TODOS los usos y materiales. La cabecera nombra la
                    tabla y el ejercicio, que es lo que se pidió. */}
                <h2 style={H2}>{PESTANIAS_DE_VALORES[valTab] + ' · ejercicio ' + pref.ejercicio}</h2>
                <span style={META}>
                  {lecturaDeValores.cargando ? '…' : `${filasDeValores(valTab, aranceles.datos, unitarios.datos, deprec.datos).length} filas`}
                </span>
              </div>
              {conjuntoSinSellar ? (
                /* Lo que el backend contesta, dicho entero: el cuadro no está
                   vacío, es que el ejercicio no tiene con qué valorizar. */
                <div style={{ display: 'flex', gap: 11, padding: '16px', background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
                  <Icono d={ICO.aviso} tam={17} grosor={1.8} style={{ flex: '0 0 auto', marginTop: 1 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                    <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>
                      El ejercicio {pref.ejercicio} no tiene un conjunto de parámetros sellado.
                    </strong>
                    {lecturaDeValores.error?.mensaje} Sin él estas tres tablas no existen para el ejercicio, y ningún autovalúo que se
                    calcule con ellas sería reproducible.
                  </span>
                </div>
              ) : lecturaDeValores.error ? (
                <div style={{ padding: 16 }}>
                  <FalloDeLectura
                    error={lecturaDeValores.error}
                    que={'la tabla de ' + PESTANIAS_DE_VALORES[valTab]!.toLocaleLowerCase('es-PE')}
                    acceso={ACCESOS_DE_VALORES[valTab]}
                    alReintentar={lecturaDeValores.reintentar}
                  />
                </div>
              ) : filasDeValores(valTab, aranceles.datos, unitarios.datos, deprec.datos).length === 0 ? (
                /* Salía la tabla vacía con su cabecera y su pie del artboard —«…
                   aprobados por el Ministerio de Vivienda para el ejercicio 2026»—,
                   que es una tabla que dice de sí misma que está aprobada y no
                   tiene ni una fila. */
                <div style={{ display: 'flex', gap: 11, padding: '16px', background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
                  <Icono d={ICO.aviso} tam={17} grosor={1.8} style={{ flex: '0 0 auto', marginTop: 1 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                    <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>
                      El conjunto sellado de {pref.ejercicio} no lleva ni una fila de este cuadro.
                    </strong>
                    El ejercicio sí tiene conjunto de parámetros sellado —por eso esto no es un 404—, pero el cuadro está vacío: no hay
                    con qué valorizar. Las cifras entran por la publicación a doble firma del corpus normativo, no por esta pantalla.
                  </span>
                </div>
              ) : (
                <TablaDelArtboard
                  cols={COLUMNAS_DE_VALORES[valTab]!}
                  filas={filasDeValores(valTab, aranceles.datos, unitarios.datos, deprec.datos)}
                  min="660px"
                />
              )}
              {filasDeValores(valTab, aranceles.datos, unitarios.datos, deprec.datos).length > 0 && (
                <p style={PIE}>{NOTAS_DE_VALORES[valTab]}</p>
              )}
            </section>
          </div>
        )}

        {/* ══════════ REPORTE — FICHA DEL CONTRIBUYENTE ══════════ */}
        {dest === 'reporte' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={codigoDeLaFicha}
                onChange={(e) => setCodigoDeLaFicha(e.target.value)}
                placeholder="Código del contribuyente"
                aria-label="Código del contribuyente"
                style={{ flex: 1, minWidth: 200, border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 11px', background: 'var(--bg-card)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
              />
              {/* Los tres formatos salen de la MISMA ruta con `?formato`, y se
                  piden con `descargar()` porque el token va en una cabecera: un
                  enlace bajaría un 401 con nombre de PDF. Apagados mientras no
                  haya ficha leída, por lo mismo que «Imprimir». */}
              <Descargas
                traer={(f) => descargarFichaDelContribuyente(codigoReposado, f)}
                que="la ficha del contribuyente"
                acceso="ficha_contribuyente_reporte"
                impedimento={
                  ficha.datos === null
                    ? 'No hay ninguna ficha leída: no hay qué descargar'
                    : undefined
                }
              />
              {/* Imprimir sin ficha leída sacaba por la impresora la hoja entera
                  —membrete, «Ficha del contribuyente», la fórmula de emisión y las
                  dos líneas de firma— con todos los datos en «—». Un papel oficial
                  en blanco es un papel oficial. */}
              <button
                onClick={() => window.print()}
                disabled={ficha.datos === null}
                title={ficha.datos === null ? 'No hay ninguna ficha leída: no hay qué imprimir' : undefined}
                className={ficha.datos === null ? undefined : 'hov-acento-2'}
                style={{
                  border: 0,
                  borderRadius: 6,
                  padding: '9px 20px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: ficha.datos === null ? 'not-allowed' : 'pointer',
                  opacity: ficha.datos === null ? 0.5 : 1,
                }}
              >
                Imprimir
              </button>
            </div>

            {/* Lo que se dibuja MIENTRAS no hay hoja. Antes se dibujaba la hoja. */}
            {ficha.datos === null && (
              <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
                {codigoReposado === '' ? (
                  <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                    <Icono d={LUPA} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Escribe el código del contribuyente</p>
                    <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                      La hoja se compone con lo que el sistema tenga de esa persona a la fecha de hoy. Sin código no hay ficha, y una
                      hoja oficial en blanco se firma y se archiva igual que una llena.
                    </p>
                  </section>
                ) : ficha.error ? (
                  <FalloDeLectura
                    error={ficha.error}
                    que={'la ficha del contribuyente ' + codigoReposado}
                    acceso="ficha_contribuyente_reporte"
                    alReintentar={ficha.reintentar}
                  />
                ) : (
                  /* Y no `ficha.cargando ? … : <FalloDeLectura error={ficha.error!}>`:
                     entre que el rebote suelta el código y el efecto marca la
                     lectura como en curso hay un render con las tres cosas en
                     falso, y ahí el `!` reventaba la pantalla entera. */
                  <section style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                    <div data-esq="1" style={{ width: 220, height: 15, marginBottom: 12 }} />
                    <div data-esq="1" style={{ height: 13, marginBottom: 8 }} />
                    <div data-esq="1" style={{ height: 13, width: '70%' }} />
                  </section>
                )}
              </div>
            )}
            {ficha.datos && (
            <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Gerencia de Administración Tributaria — Unidad de Rentas</p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>{ficha.datos ? ficha.datos.codigo : SIN_DATO}</p>
                  <p style={{ margin: '3px 0 0' }}>{ficha.datos ? ficha.datos.aLaFecha : SIN_DATO}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>Ficha del contribuyente</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>Registro único de contribuyentes — Gerencia de Rentas</p>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(186px,1fr))',
                  gap: '14px 20px',
                  margin: '24px 0',
                  padding: '16px 0',
                  borderTop: '1px solid var(--line)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {metaDeLaFicha.map((mt) => (
                  <div key={mt[0]}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{mt[0]}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{mt[1].replace('{ejercicio}', pref.ejercicio)}</p>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {COLUMNAS_DE_LA_FICHA.map((c, i) => (
                      <th key={i} style={c[1] ? THN : TH}>
                        {c[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasDeLaFicha.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      {r.map((cl, j) => (
                        <td key={j} style={j === 0 ? TD1 : COLUMNAS_DE_LA_FICHA[j] && COLUMNAS_DE_LA_FICHA[j]![1] ? TDN : TD}>
                          {cl}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                La presente ficha se emite a solicitud del interesado y refleja la información registrada a la fecha de impresión. No
                constituye título de propiedad ni certificación de deuda.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Cajero / Responsable</div>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Contribuyente</div>
              </div>
            </section>
            )}
          </div>
        )}
      </div>

      {/* ══════════ BARRA DE GUARDADO ══════════ */}
      {/* `sucio` es estado del módulo y la barra se dibujaba en los seis destinos:
          se quedaba pegada al pie del mapa, de los valores y de la hoja del
          contribuyente, hablando de una ficha que ahí no hay.

          Y ahora `sucio` significa lo que dice: de las 123 casillas sólo dos
          llegan al servidor —el número municipal y la fuente—, así que la barra
          aparece cuando hay algo que mandar y no cuando se tecleó en cualquier
          sitio. */}
      {sucio && esPredio && !esNuevo && (
        <div
          data-noprint="1"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 38,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            flexWrap: 'wrap',
            margin: '18px -20px 0',
            padding: '12px 20px',
            borderTop: '1px solid var(--line-2)',
            background: 'var(--bg-card)',
            boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center', fontSize: 12.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '5px 12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            Sin versionar
          </span>

          {/* Los tres datos que el acto exige y que el manual NO dibuja en
              ninguna de sus 123 casillas. Se preguntan aquí —controles añadidos,
              con su propio rótulo— porque sin ellos el `PUT` responde 422 y
              porque la observación es lo único que explicará este cambio cuando
              la versión pase al histórico (regla 10, RNF-052). */}
          <label style={{ flex: 2, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>Observación · obligatoria</span>
            <input
              value={observacionDeLaFicha}
              onChange={(e) => setObservacionDeLaFicha(e.target.value)}
              placeholder="Por qué cambia la ficha, y con qué se comprobó"
              style={IN}
            />
          </label>
          <label style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>Documento de origen · obligatorio</span>
            <input
              value={documentoDeLaFicha}
              onChange={(e) => setDocumentoDeLaFicha(e.target.value)}
              placeholder="DJ-2026-000418, acta, resolución…"
              style={IN}
            />
          </label>
          <label style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>Rige desde</span>
            <input
              type="date"
              value={vigenciaDeLaFicha}
              onChange={(e) => setVigenciaDeLaFicha(e.target.value)}
              style={IN}
            />
          </label>

          <p style={{ margin: 0, flexBasis: '100%', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {/* Prometía «se guardará como una versión nueva de la ficha; la
                anterior queda en el histórico CON SU OBSERVACIÓN» y no había
                campo de observación en ninguna parte, debajo de un botón que no
                mandaba nada. */}
            Se emite la <strong>versión siguiente</strong> y la que rige se cierra el día antes: aquí no se corrige, se versiona, y la
            anterior queda entera en el histórico. Dos versiones no pueden empezar el mismo día, así que si esta ficha ya se versionó hoy
            hay que fechar la nueva más adelante. <strong>Sólo viajan el número municipal y la fuente</strong>: los pisos, las obras, las
            actividades y los grupos de tierra no se mandan, y no van vacíos sino ausentes —el cuerpo los copia de la versión que rige—,
            porque reenviarlos perdería el «% construido» de cada piso y la fecha de cada actividad, que la lectura publica y el cuerpo no
            lleva.
          </p>

          <button
            onClick={() => {
              setVals({});
              setSucio(false);
              setObservacionDeLaFicha('');
              setDocumentoDeLaFicha('');
              setVigenciaDeLaFicha('');
              const conocido = ORIGENES_DE_FICHA.find((o) => o === leida?.origen);
              if (conocido !== undefined) setOrigenDeLaFicha(conocido);
              toast('Cambios descartados.');
            }}
            className="hov-linea"
            style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
          >
            Deshacer
          </button>
          <button
            onClick={() => void versionarLaFicha()}
            aria-disabled={impedimento !== null || versionando}
            aria-describedby={impedimento === null ? undefined : 'impedimento-de-la-ficha'}
            title={impedimento ?? undefined}
            className={impedimento === null ? 'hov-acento-2' : undefined}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '10px 22px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: impedimento === null && !versionando ? 'pointer' : 'not-allowed',
              opacity: impedimento === null && !versionando ? 1 : 0.5,
            }}
          >
            {versionando ? 'Versionando…' : 'Guardar como versión nueva'}
          </button>
          {/* El motivo se dice en texto y no sólo en el `title`: un dato al que
              sólo se llega pasando el ratón no está disponible para quien usa el
              teclado (RNF-082). */}
          {impedimento !== null && (
            <p id="impedimento-de-la-ficha" role="status" style={{ margin: 0, flexBasis: '100%', fontSize: 12, lineHeight: 1.5, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
              {impedimento}
            </p>
          )}
        </div>
      )}
    </Shell>
  );
}


/* ══════════ Lo que el backend contesta, dicho en castellano ══════════ */

/** Lo que se escribe donde no hay dato. Una raya, nunca un cero ni un blanco. */
const SIN_DATO = '—';

/**
 * Por qué la mayoría de estas casillas no se pueden teclear, dicho entero.
 *
 * La ficha catastral **ya se lee y ya se escribe** —`GET /catastro/fichas/{tipo}/{codigo}`
 * y `PUT /catastro/fichas/…/actualizacion`—, y lo que queda es que de las 123
 * casillas que el manual dibuja el sistema sostiene catorce y sólo dos llegan al
 * servidor. Las demás describen datos que no están en el modelo, listas que se
 * enseñan en sus tablas, o importes que la ficha no publica a propósito (regla
 * 5, D-02a): cada una lo dice debajo, y la tabla completa —campo a campo, con
 * su motivo— vive en `PROCEDENCIA`, en `datos/catastro.ts`.
 *
 * Lo que había antes era peor de leer: «Guardar cambios» decía «Ficha guardada.
 * Versión 4 desde hoy» sin que saliera una sola petición, con el número de
 * versión compuesto en el cliente.
 */
const MOTIVO_DE_LOS_CAMPOS_QUE_NO_VIAJAN =
  'De las casillas de esta ficha sólo el número municipal y la fuente llegan al servidor; cada una de las demás dice debajo por qué no.';

const SELECT_FILTRO: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-card)',
  fontSize: 13.5,
};

/**
 * Cómo se llama cada tipo de ficha en la pantalla.
 *
 * El dominio llama `UNICA` a lo que el manual llama «urbana individual», y la
 * ruta que la sirve es `/urbana/`. No se traduce ninguno de los otros tres: se
 * escribe el rótulo del manual y se conserva el nombre del dominio donde lo que
 * importa es el valor exacto —la modalidad de la ruta—.
 */
function rotuloDeModalidad(tipo: string): string {
  if (tipo === 'UNICA') return 'urbana individual';
  if (tipo === 'ECONOMICA') return 'económica';
  if (tipo === 'BIENES_COMUNES') return 'de bienes comunes';
  if (tipo === 'RURAL') return 'rural';
  return tipo;
}

function rotuloDeTipo(tipo: string): string {
  if (tipo === 'URBANO') return 'Urbano';
  if (tipo === 'RUSTICO') return 'Rústico';
  /* Un tipo que el dominio gane mañana no se dibuja en blanco ni se traduce a
     ciegas: sale tal cual, que es feo y es cierto. */
  return tipo;
}

/**
 * La dirección con su número municipal, sin repetirlo.
 *
 * `direccion` unas veces ya lo lleva dentro —«Calle Comercio 245»— y otras no,
 * según cómo se cargara el padrón; concatenar sin mirar produce «Calle Comercio
 * 245 245», que se lee como un dato mal escrito y no como uno mal dibujado.
 */
function direccionDe(p: PredioDelCatastro): string {
  const numero = p.numeroMunicipal?.trim();
  if (!numero) return p.direccion;
  return p.direccion.trim().endsWith(numero) ? p.direccion : p.direccion + ' ' + numero;
}

/** La ubicación tal como la publica el listado: dirección, sector, manzana y lote. */
function ubicacionDe(p: PredioDelCatastro): string {
  const partes = [
    direccionDe(p),
    p.codigoDeSector ? 'S-' + p.codigoDeSector : null,
    p.codigoDeManzana ? 'M-' + p.codigoDeManzana : null,
    p.lote ? 'Lote ' + p.lote : null,
  ];
  return partes.filter((x): x is string => x !== null && x !== '').join(' · ');
}

/**
 * Los titulares en una línea, con sus cuotas.
 *
 * Un predio puede tener varios —dos cónyuges al 50 %, una sucesión con tantos
 * como herederos—, así que no se dice «el titular». Y un titular sin nombre no
 * se esconde: es el predio que catastro tiene que revisar, porque su
 * propietario ya no está en el padrón.
 */
function textoDeTitulares(
  cargando: boolean,
  error: ErrorDeApi | null,
  datos: { titulares: { nombre: string | null; porcentaje: number }[] } | null,
): string {
  if (cargando) return 'Resolviendo el titular…';
  if (error) return error.codigo === 'SIN_PRIVILEGIO' ? 'Sin acceso al padrón de contribuyentes' : 'No se pudo resolver el titular';
  if (!datos || datos.titulares.length === 0) return 'Sin titular registrado';
  return datos.titulares
    .map((t) => (t.nombre ?? 'Titular fuera del padrón') + (datos.titulares.length > 1 ? ` (${t.porcentaje} %)` : ''))
    .join(' · ');
}

/**
 * Las columnas de cada cuadro, en la forma que el backend LO DEVUELVE.
 *
 * El artboard dibuja la depreciacion pivotada —una fila por antiguedad y una
 * columna por estado de conservacion, para un (uso, material) dado— y el
 * backend devuelve una fila por combinacion. Se usan las del backend: una
 * cabecera que promete «Muy bueno %» sobre una columna que trae el material es
 * peor que una cabecera sosa sobre el dato correcto. El pivote es trabajo de
 * interfaz y necesita ademas elegir uso y material; queda anotado.
 */
/** El acceso que exige cada uno de los tres cuadros. No es el mismo, y un 403
 *  sobre uno no dice nada de los otros dos. */
const ACCESOS_DE_VALORES = ['aranceles', 'valores_unitarios', 'depreciacion'];

/**
 * El pie de cada cuadro, dicho de lo que la tabla trae.
 *
 * El del artboard afirmaba de los aranceles que están «aprobados por el
 * Ministerio de Vivienda» —cada fila trae su propio `documentoFuente`, que es de
 * dónde salió de verdad— y de los valores unitarios que la ficha declara una
 * categoría **A–G**, cuando el dominio llega hasta la **J** desde #436: el cuadro
 * de la Selva tiene diez categorías y la décima es «caña guayaquil, pona o
 * pintoc».
 */
const NOTAS_DE_VALORES = [
  'Cada fila dice de qué documento salió, en su última columna: el arancel de una vía no vale más que la norma que lo publicó.',
  'La ficha declara una categoría por cada una de sus siete partidas, de la A a la J. El cuadro de valores unitarios tiene tres columnas —muros y columnas, techos, y el resto—, que no son las mismas siete.',
  'El porcentaje depende del uso, del material predominante (MEP) y del estado de conservación (ECS) declarados por piso.',
];

const COLUMNAS_DE_VALORES: readonly ColumnaDeTabla[][] = [
  [['Via', 0], ['Tramo', 0], ['Valor S/ m²', 1], ['Documento fuente', 0]],
  [['Partida', 0], ['Categoria', 0], ['Anio de construccion', 0], ['Valor S/ m²', 1], ['Documento fuente', 0]],
  [['Uso', 0], ['Material', 0], ['Estado', 0], ['Antiguedad', 0], ['Depreciacion %', 1], ['Documento fuente', 0]],
];

/**
 * Las filas de la tabla activa, en el orden de columnas que el artboard fija.
 *
 * El importe y el porcentaje llegan como TEXTO del backend y salen como texto:
 * convertirlos a `number` para volver a formatearlos es la forma de perder un
 * decimal en el camino (RNF-055).
 */
function filasDeValores(
  pestania: number,
  aranceles: Arancel[] | null,
  unitarios: ValorUnitario[] | null,
  deprec: Depreciacion[] | null,
): string[][] {
  if (pestania === 0) {
    return (aranceles ?? []).map((a) => [String(a.viaId), a.tramo ?? SIN_DATO, a.valorM2, a.documentoFuente]);
  }
  if (pestania === 1) {
    return (unitarios ?? []).map((v) => [
      v.partida,
      v.categoria,
      `${v.anioConstruccionDesde}${v.anioConstruccionHasta === null ? ' en adelante' : ' – ' + v.anioConstruccionHasta}`,
      v.valorM2,
      v.documentoFuente,
    ]);
  }
  return (deprec ?? []).map((d) => [
    d.uso,
    d.material,
    d.estadoConservacion,
    d.antiguedadHasta === null ? 'sin tope' : `hasta ${d.antiguedadHasta}`,
    d.porcentaje,
    d.documentoFuente,
  ]);
}

/** Las columnas de la hoja, en la forma que `FichaDelContribuyenteResource` da. */
const COLUMNAS_DE_LA_FICHA: readonly ColumnaDeTabla[] = [
  ['Cod. ref. catastral', 0],
  ['Direccion', 0],
  ['Uso', 0],
  ['Condicion', 0],
  // La unidad va en el rotulo desde #607: el dato viaja como cifra sola —«360.00»,
  // igual en catastro, rentas, fiscalizacion y licencias— y quien la lee tiene que
  // poder decir en que se mide sin abrir el contrato.
  ['Area de terreno (m2)', 1],
];
