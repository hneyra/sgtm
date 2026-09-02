import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type Contexto, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, Paginador, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { miles, usarPreferencias } from '../../shell/preferencias';
import {
  CAMPOS_LIBERACION,
  COLS_COD,
  COLS_PADRON,
  CRITERIOS,
  CRITERIOS_DE_BUSQUEDA,
  ESTADOS_DE_INTERNAMIENTO,
  ESTADOS_DE_PAPELETA,
  HOJAS,
  OPCIONES,
  PROCESOS,
  TIPOS_DE_RECURSO,
  type CampoDef,
  type Columna,
  type Fila,
} from '../../datos/transito';
import { useRebote, useRecurso, type Estado } from '../../api/useRecurso';
import { Descargas, FORMATOS_DE_DOCUMENTO, type FormatoDeDocumento } from '../../api/descarga';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { causasDelRechazo, explicacionDelFallo } from '../../api/Fallo';
import { cuentaActual, hayPuerta } from '../../api/sesion';
import {
  cambiarNumeroDePapeleta,
  emitirConstanciaLibre,
  estadoDeCuenta,
  expedienteDeLaPapeleta,
  generarValoresDeTransito,
  hojaInformativa,
  listarCodigos,
  listarInternamientos,
  liberarVehiculo,
  listarPapeletas,
  padronCoactiva,
  padronDeConstancias,
  padronDePapeletas,
  recordDeConductor,
  recordVehicular,
  registrarDescargo,
  resumenDePapeletas,
  REPORTES_DESCARGABLES,
  descargarHojaInformativa,
  descargarReporteDeTransito,
  resumenDeRecaudacion,
  resumenPorCodigo,
  resumenPorPlaca,
  type ConstanciaEmitida,
  type EstadoDeInternamiento,
  type EstadoDePapeleta,
  type Internamiento,
  type Papeleta,
  type TipoDeRecurso,
} from '../../api/transito';

/* ══════════ Los estilos que el artboard declara una vez y repite ══════════ */

const IN: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-elev)',
  fontSize: 13.5,
};
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
const TD1: CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  fontWeight: 500,
  color: 'var(--ink)',
  whiteSpace: 'nowrap',
};
/* Las cuatro de la hoja impresa: más pequeñas y con filete de tinta. */
const RTH: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 9.5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.09em',
  color: 'var(--ink-3)',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--ink)',
};
const RTHN: CSSProperties = { ...RTH, textAlign: 'right' };
const RTD: CSSProperties = { padding: '8px 10px', fontSize: 12, color: 'var(--ink-2)' };
const RTDN: CSSProperties = {
  padding: '8px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  color: 'var(--ink)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const TARJETA: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-1)',
  overflow: 'hidden',
};
const CABECERA: CSSProperties = {
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
  background: 'var(--bg-elev)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink-3)',
  textWrap: 'pretty',
};
const ENTRADILLA: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.6,
  color: 'var(--ink-2)',
  maxWidth: '70ch',
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

/** Lo que se escribe donde no hay dato. Una raya, nunca un cero ni un blanco. */
const SIN_DATO = '—';

/** El tono de un estado, con el vocabulario del dominio y no con el del artboard. */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiva|prescrita|abandono|impuesta/.test(t)) return 'bad';
  if (/notificada|internado|resuelta/.test(t)) return 'warn';
  if (/pagada|liberado|anulada/.test(t)) return 'ok';
  return 'neutro';
}

/** El rótulo con que se lee un estado. Es la misma palabra, con su acento. */
function rotuloDeEstado(estado: string): string {
  const fila = ESTADOS_DE_PAPELETA.find((e) => e[0] === estado);
  /* Un estado que el dominio gane mañana no se dibuja en blanco ni se traduce
     a ciegas: sale tal cual, que es feo y es cierto. */
  return fila ? fila[1] : estado;
}

function estiloDeCelda(j: number, cols: Columna[]): CSSProperties {
  return j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD;
}

function Cabecera({ cols }: { cols: Columna[] }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c[0]} style={c[1] ? THN : TH}>
            {c[0]}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Caret({ abierta, tam = 13, ancho = 20 }: { abierta: boolean; tam?: number; ancho?: number }) {
  return (
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: ancho,
        height: ancho,
        color: 'var(--ink-4)',
        flex: '0 0 auto',
        transform: `rotate(${abierta ? '0' : '-90'}deg)`,
        transition: 'transform .15s ease',
      }}
    >
      <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

function Lupa({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" style={{ color: 'var(--ink-3)', flex: '0 0 auto' }}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  );
}

/** Un campo del formulario, en las seis formas que el artboard declara. */
function CampoForm({
  f,
  valor,
  set,
}: {
  f: CampoDef;
  valor: string | boolean;
  set: (k: string, v: string | boolean) => void;
}) {
  const t = f.t ?? 'text';
  const texto = typeof valor === 'boolean' ? '' : (valor ?? '');
  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
      {t === 'text' && <input value={texto} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph ?? ''} style={IN} />}
      {t === 'date' && <input type="date" value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN} />}
      {t === 'sel' && (
        <select value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o === '' ? '(todos)' : o}
            </option>
          ))}
        </select>
      )}
      {t === 'area' && (
        <textarea
          value={texto}
          onChange={(e) => set(f.k, e.target.value)}
          rows={3}
          placeholder={f.ph ?? ''}
          style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
        />
      )}
      {t === 'chk' && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}>
          <input
            type="checkbox"
            checked={valor === true}
            onChange={(e) => set(f.k, e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
        </span>
      )}
      {t === 'ro' && (
        <span style={{ display: 'block', minHeight: 38, lineHeight: '19px', padding: '9px 10px', border: '1px dashed var(--line-2)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>
          {texto}
        </span>
      )}
      {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
    </label>
  );
}

function RejillaDeCampos({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px', ...style }}>
      {children}
    </div>
  );
}

function CuerpoDeTabla({
  filas,
  cols,
  insigniaEn,
  onFila,
  hov = 'hov-elev',
}: {
  filas: Fila[];
  cols: Columna[];
  insigniaEn?: number;
  onFila?: (f: Fila, i: number) => void;
  hov?: string;
}) {
  return (
    <tbody>
      {filas.map((f, i) => (
        <tr
          key={f[0] + '|' + i}
          onClick={onFila ? () => onFila(f, i) : undefined}
          className={hov}
          style={{ borderTop: '1px solid var(--line)', cursor: onFila ? 'pointer' : undefined }}
        >
          {f.map((c, j) => (
            <td key={j} style={j === insigniaEn ? { padding: '11px 14px' } : estiloDeCelda(j, cols)}>
              {j === insigniaEn ? <Insignia tono={tono(c)}>{c}</Insignia> : c}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ══════════ Lo que el backend contesta, dicho en castellano ══════════ */

/**
 * El titular del fallo sale del CÓDIGO, no del texto: los códigos son estables
 * por contrato y el mensaje se reescribe en cuanto alguien lo lee en voz alta.
 */
function tituloDelFallo(error: ErrorDeApi | null, que: string): string {
  const cuenta = cuentaActual();
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'La sesión no vale';
    case 'SIN_PRIVILEGIO':
      return cuenta === null ? `Esta sesión no puede ver ${que}` : `La cuenta «${cuenta}» no puede ver ${que}`;
    case 'SIN_MUNICIPALIDAD':
      return 'La sesión no dice de qué municipalidad es';
    case 'NO_ENCONTRADO':
      return 'No existe';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      /* No dice «no admite lo que se le mandó»: registrar un descargo lee su
         plazo del conjunto sellado, y desde #562 eso contesta 422 nombrando la
         llave en vez de un 500 con incidencia. Con aquel titular, quien atiende
         se pone a corregir un formulario que está bien. */
      return 'El servidor rechazó la operación';
    case 'SIN_RESPUESTA':
      return error.estado === 0 ? 'No se pudo contactar con el servidor' : 'El servidor contestó otra cosa';
    default:
      return `No se pudo consultar ${que}`;
  }
}


/**
 * Los cuatro estados de una lectura, dibujados una sola vez.
 *
 * Es el bloque que el padrón de catastro escribe a mano; aquí lo comparten
 * ocho lecturas del módulo, así que vive en un componente y no copiado.
 */
function Lectura<T>({
  estado,
  que,
  acceso,
  ruta,
  vacio,
  children,
}: {
  estado: Estado<T>;
  /** Lo que se estaba consultando, para el titular del fallo. */
  que: string;
  /** El acceso que hace falta, dicho cuando el servidor niega. */
  acceso: string;
  ruta: string;
  vacio: ReactNode;
  children: (datos: T) => ReactNode;
}) {
  const [tokenPegado, setTokenPegado] = useState('');
  if (estado.cargando) {
    return (
      <section style={TARJETA}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
          <div data-esq="1" style={{ width: 180, height: 15 }} />
        </div>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div data-esq="1" style={{ width: 118, height: 13 }} />
            <div data-esq="1" style={{ flex: 1, height: 13 }} />
            <div data-esq="1" style={{ width: 74, height: 13 }} />
          </div>
        ))}
      </section>
    );
  }
  if (estado.error) {
    const e = estado.error;
    return (
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '36px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" style={{ color: 'var(--error-texto)' }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16.2h.02" />
        </svg>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>
          {tituloDelFallo(e, que)}
        </p>
        <p style={{ margin: 0, maxWidth: '54ch', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
          {explicacionDelFallo(e, acceso)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
          <span>
            {ruta} · {e.estado || 'sin respuesta'}
          </span>
          {e.incidencia && (
            <>
              <span style={{ color: 'var(--line-2)' }}>|</span>
              <span>ref {e.incidencia}</span>
            </>
          )}
        </div>
        {/* Todavía no hay puerta de sesión: la interfaz no sabe pedir un token,
            así que se le da. Aparece SOLO ante un 401. */}
        {e.codigo === 'NO_AUTENTICADO' && !hayPuerta() && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, width: 'min(560px, 100%)' }}>
            <input
              value={tokenPegado}
              onChange={(ev) => setTokenPegado(ev.target.value)}
              placeholder="eyJhbGciOi…"
              spellCheck={false}
              aria-label="Token del emisor"
              style={{ flex: 1, minWidth: 0, border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 11px', background: 'var(--bg-card)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            <button
              onClick={() => {
                fijarToken(tokenPegado.trim() || null);
                setTokenPegado('');
                estado.reintentar();
              }}
              disabled={tokenPegado.trim() === ''}
            /* Un boton apagado no recibe el foco, asi que su `title` no lo lee un
               lector de pantalla — pero SI se ve al pasar el raton, y sin el este
               es un callejon: quien lo pulsa no sabe que le falta pegar el token.
               Solo aparece sin sesion, que es como corre el arnes y como corre CI. */
            title={tokenPegado.trim() === '' ? 'Pega antes un token del emisor en la caja de al lado' : undefined}
              className={tokenPegado.trim() === '' ? undefined : 'hov-acento-2'}
              style={{ border: 0, borderRadius: 6, padding: '8px 17px', background: 'var(--accent)', color: 'var(--accent-contraste)', fontSize: 12.5, fontWeight: 500, cursor: tokenPegado.trim() === '' ? 'not-allowed' : 'pointer', opacity: tokenPegado.trim() === '' ? 0.55 : 1, whiteSpace: 'nowrap' }}
            >
              Usar este token
            </button>
          </div>
        )}
        {e.reintentable !== false && (
          <button onClick={estado.reintentar} className="hov-acento-2" style={{ marginTop: 5, border: 0, borderRadius: 6, padding: '8px 17px', background: 'var(--accent)', color: 'var(--accent-contraste)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
            Reintentar
          </button>
        )}
      </section>
    );
  }
  if (estado.datos === null) return <>{vacio}</>;
  return <>{children(estado.datos)}</>;
}

/** El bloque de «no hay nada», con su motivo. */
function Vacio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
      <Lupa tam={26} />
      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{titulo}</p>
      <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
        {children}
      </p>
    </section>
  );
}

/** La cifra de un contador, con «…» mientras llega y «—» si no se pudo. */
function cifra(e: { datos: { totalElementos: number } | null; cargando: boolean; error: unknown }): string {
  if (e.cargando) return '…';
  if (e.error || !e.datos) return SIN_DATO;
  return miles(e.datos.totalElementos);
}

const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Tránsito: veintitrés opciones de menú para un solo objeto, la papeleta.
 *
 * Todo lo que se ve sale de `sanciones`. Lo que el backend no publica —el
 * puntaje del conductor, la gravedad del código, la deuda de hoy de una placa—
 * sale «—» diciendo por qué, y no con la cifra que traía el prototipo.
 */
export default function Transito({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const anio = Number(pref.ejercicio);

  /* ── Estado de la pantalla ───────────────────────────────────── */
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [papeletaAbierta, setPapeletaAbierta] = useState<string | null>(null);
  const [campo, setCampo] = useState<string>('placa');
  const [q, setQ] = useState('');
  const [avanzada, setAvanzada] = useState(false);
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoDePapeleta>('');
  const [pagina, setPagina] = useState(0);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [proceso, setProceso] = useState('valores');
  const [deposito, setDeposito] = useState('');
  const [estadoInt, setEstadoInt] = useState('Todos');
  const [paginaInt, setPaginaInt] = useState(0);
  /* El vehículo elegido en la grilla. La liberación actúa sobre UNO, y sin uno
     elegido no hay acto que ofrecer: el formulario ni se dibuja. */
  const [vehiculo, setVehiculo] = useState<Internamiento | null>(null);
  const [codQ, setCodQ] = useState('');
  const [paginaCod, setPaginaCod] = useState(0);
  /* El acto en marcha: su marcha y su fallo, para que la pantalla lo diga en
     vez de dejar el botón pulsado sin más. */
  const [enviando, setEnviando] = useState(false);
  const [falloDelActo, setFalloDelActo] = useState<ErrorDeApi | null>(null);
  const [hechoDelActo, setHechoDelActo] = useState('');
  /* La constancia libre: el único acto del centro de reportes, y el único de
     todo el módulo que además NUMERA un papel. Su estado va aparte del de los
     tres procesos —que se dibujan en otro destino— porque compartirlo dejaría
     el fallo de uno colgando bajo el otro. */
  const [emitiendoConstancia, setEmitiendoConstancia] = useState(false);
  const [confirmandoConstancia, setConfirmandoConstancia] = useState(false);
  const [constanciaEmitida, setConstanciaEmitida] = useState<
    (ConstanciaEmitida & { placa: string; verificadaAl: string }) | null
  >(null);
  const [falloConstancia, setFalloConstancia] = useState<ErrorDeApi | null>(null);
  /* Lo contado, recordado entre destinos: ver `notasDeDestino` más abajo. */
  const [contado, setContado] = useState<Record<string, string>>({});

  const val = (k: string, d: string | boolean = ''): string | boolean => (vals[k] !== undefined ? vals[k] : d);
  const texto = (k: string, d = '') => String(val(k, d));
  const set = (k: string, v: string | boolean) => {
    setVals((x) => ({ ...x, [k]: v }));
    setFalloDelActo(null);
    setHechoDelActo('');
    /* Tocar un campo DESARMA la confirmación de la constancia: lo que se
       confirmó era otra placa u otra fecha, y aquí la segunda pulsación numera
       un documento oficial que no se anula (regla 4). Y se borra lo emitido,
       para que el número de la anterior no quede al lado del formulario de la
       siguiente leyéndose como suyo. */
    setConfirmandoConstancia(false);
    setFalloConstancia(null);
    setConstanciaEmitida(null);
  };

  const esPapeleta = dest === 'padron' && papeletaAbierta !== null;
  const irDest = (k: string) => {
    setPapeletaAbierta(null);
    onDest(k);
  };
  const abrirPapeleta = (numero: string) => {
    setPapeletaAbierta(numero);
    if (dest !== 'padron') onDest('padron');
  };

  const criterio = useRebote(q.trim());
  useEffect(() => setPagina(0), [criterio, campo, fDesde, fHasta, fEstado]);
  useEffect(() => setPaginaInt(0), [deposito, estadoInt]);
  const criterioCod = useRebote(codQ.trim());
  useEffect(() => setPaginaCod(0), [criterioCod]);

  /* ── El panel ────────────────────────────────────────────────
     Sus cifras salen de los dos resúmenes que el backend publica; ninguna se
     compone aquí. Lo que no se puede contar sale «—». */
  const enPanel = dest === 'panel';
  const porEstado = useRecurso(
    (s) => resumenDePapeletas({ desde: `${anio}-01-01`, hasta: `${anio}-12-31`, agrupadoPor: 'ESTADO' }, s),
    [anio],
    enPanel,
  );
  const recaudado = useRecurso((s) => resumenDeRecaudacion(anio, s), [anio], enPanel);
  /* Los tres censos van SIEMPRE, no solo en el panel: son los que corrigen las
     notas del panel de destinos, y entrando por la URL a un destino que no sea
     el panel la nota volvería a la cifra del prototipo —«12,844 en el
     ejercicio»— al lado de la tabla que dice que no hay ninguna. Es una
     petición de una fila por censo. */
  const censoDePapeletas = useRecurso((s) => listarPapeletas({}, { tamano: 1 }, s), [], true);
  const enDeposito = useRecurso((s) => listarInternamientos({ estado: 'INTERNADO' }, { tamano: 1 }, s), [], true);
  const catalogo = useRecurso((s) => listarCodigos({}, { tamano: 1 }, s), [], true);
  const enAbandono = useRecurso((s) => listarInternamientos({ estado: 'EN_ABANDONO' }, { tamano: 1 }, s), [], enPanel);
  const sinNotificar = useRecurso(
    (s) => listarPapeletas({ estado: 'IMPUESTA' }, { tamano: 1 }, s),
    [],
    enPanel,
  );

  /* ── El padrón ───────────────────────────────────────────────
     Los tres criterios que el endpoint admite, y el rango y el estado que
     también admite. Ni conductor ni propietario ni código de infracción: esos
     filtros del manual no existen en esta operación. */
  const filtro = useMemo(
    () => ({
      nroPapeleta: campo === 'nroPapeleta' ? criterio || undefined : undefined,
      placa: campo === 'placa' ? criterio || undefined : undefined,
      documentoDelInfractor: campo === 'documentoDelInfractor' ? criterio || undefined : undefined,
      desde: fDesde || undefined,
      hasta: fHasta || undefined,
      estado: fEstado || undefined,
    }),
    [campo, criterio, fDesde, fHasta, fEstado],
  );
  const padron = useRecurso(
    (s) => listarPapeletas(filtro, { pagina, tamano: 20 }, s),
    [filtro, pagina],
    dest === 'padron' && papeletaAbierta === null,
  );
  const enCoactiva = useRecurso(
    (s) => listarPapeletas({ ...filtro, estado: 'COACTIVA' }, { tamano: 1 }, s),
    [filtro],
    dest === 'padron' && papeletaAbierta === null,
  );
  const pagadas = useRecurso(
    (s) => listarPapeletas({ ...filtro, estado: 'PAGADA' }, { tamano: 1 }, s),
    [filtro],
    dest === 'padron' && papeletaAbierta === null,
  );

  /* ── La papeleta abierta ─────────────────────────────────────
     Dos lecturas: la hoja informativa —el acta con su desglose— y el
     expediente —los actos, sus acuses y los recursos presentados—. */
  const hoja = useRecurso((s) => hojaInformativa(papeletaAbierta!, s), [papeletaAbierta], esPapeleta);
  const expediente = useRecurso((s) => expedienteDeLaPapeleta(papeletaAbierta!, s), [papeletaAbierta], esPapeleta);

  /* ── Internamiento ───────────────────────────────────────────── */
  const internados = useRecurso(
    (s) =>
      listarInternamientos(
        {
          deposito: deposito || undefined,
          estado: estadoInt === 'Todos' ? undefined : (estadoInt as EstadoDeInternamiento),
        },
        { pagina: paginaInt, tamano: 20 },
        s,
      ),
    [deposito, estadoInt, paginaInt],
    dest === 'internamiento',
  );

  /* ── Códigos ─────────────────────────────────────────────────
     El buscador va contra `textoDeLaInfraccion` y `codigo` a la vez no se
     puede: son dos filtros distintos, así que se manda por texto y, si lo
     tecleado parece un código, también por código. */
  const codigos = useRecurso(
    (s) => listarCodigos({ textoDeLaInfraccion: criterioCod || undefined }, { pagina: paginaCod, tamano: 20 }, s),
    [criterioCod, paginaCod],
    dest === 'codigos',
  );

  /* ── El centro de reportes ───────────────────────────────────── */
  const h = HOJAS[Math.min(hojaIdx, HOJAS.length - 1)];
  const c = (k: string) => texto('rep_' + k, CRITERIOS[k]?.v ?? '');
  /* Un reporte que exige criterio no se pide en blanco: `record-conductor` sin
     licencia ni documento y `record-vehicular` sin placa contestan 422, y
     preguntar para que nieguen es ruido. */
  const faltaCriterio =
    (h.k === 'record_conductor' && c('licencia') === '' && c('documento') === '') ||
    (h.k === 'record_vehicular' && c('placa') === '') ||
    ((h.k === 'hoja_papeleta' || h.k === 'actos') && c('papeleta') === '');
  const reporteActivo = dest === 'reportes' && h.sinLectura === undefined && !faltaCriterio;
  const llavesDelReporte = [h.k, c('licencia'), c('documento'), c('placa'), c('conductor'), c('papeleta'), c('nDeConstancia'), c('usuarioQueEmitio'), c('codigoDeInfraccion'), c('iniciales2Letras'), c('desde'), c('hasta'), c('estado'), c('ano'), c('agrupadoPor')];
  const reporte = useRecurso((s) => pedirReporte(h.k, c, s), llavesDelReporte, reporteActivo);

  /* ── El mismo reporte, como documento ────────────────────────
     `?formato=PDF|XLS|RTF` lo sirve el propio endpoint desde #535 —antes
     contestaba 500—, y no todos: los que no declaran el parámetro devuelven el
     JSON de siempre sin decir nada, así que la lista es explícita. La descarga
     lleva EXACTAMENTE los criterios de la hoja, que salen del mismo
     `criteriosDelReporte`. */
  const rutaDelDocumento = REPORTES_DESCARGABLES[h.k];
  const sePuedeDescargar = rutaDelDocumento !== undefined || h.k === 'hoja_papeleta';
  const impedimentoDeLaDescarga = faltaCriterio
    ? 'Falta el criterio que este reporte exige'
    : reporte.datos === null
      ? 'No hay hoja leída: no hay qué descargar'
      : undefined;

  /* ── La constancia libre, el único acto del centro de reportes ──────
     Los cinco campos son EXACTAMENTE los cinco que `PeticionDeConstanciaLibre`
     lee y que esta pantalla puede resolver; el cuerpo se compone en
     `emitirConstanciaLibre`, que es donde está escrito por qué los otros dos
     del `record` no viajan. */
  const clPlaca = texto('cl_placa').trim().toUpperCase();
  const clVerificadaAl = texto('cl_verificadaAl');
  const clSolicitante = texto('cl_solicitante').trim();
  const clObs = texto('cl_obs').trim();
  const clFormato = texto('cl_formato', 'PDF') as FormatoDeDocumento;
  /* El motivo se calcula UNA vez y sirve para las tres cosas que hacen falta:
     apagar el botón, ponerle su `title` y dibujarlo al lado. Un botón apagado
     no recibe el foco, así que su `title` no lo lee quien va con el teclado
     (RNF-082) y el texto tiene que estar además en la página. */
  const faltaDeLaConstancia =
    clPlaca === ''
      ? 'Falta la placa: es sobre lo que se acredita, y el servidor la exige. No hace falta que el vehículo esté en el padrón.'
      : clVerificadaAl === ''
        ? 'Falta el día al que se acredita. «No registra papeletas pendientes» es cierto o falso según el día (regla 9, RNF-075), así que se teclea en vez de dejar que lo ponga un reloj.'
        : clObs.length < 5
          ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace, y va de 5 a 500 caracteres (regla 10, RNF-052).'
          : undefined;
  const puedeEmitirConstancia = faltaDeLaConstancia === undefined && !emitiendoConstancia;

  const emitirConstancia = async () => {
    /* Irreversible: emitir gasta el correlativo, asienta la constancia y la
       deja en la bitácora, y aquí no se borra ni se anula un documento emitido
       (regla 4). Se pulsa dos veces, con el rótulo y el aviso cambiados en
       medio: el mismo patrón que la prescripción de Valores. */
    if (!confirmandoConstancia) {
      setConfirmandoConstancia(true);
      return;
    }
    setEmitiendoConstancia(true);
    setFalloConstancia(null);
    try {
      const r = await emitirConstanciaLibre({
        placa: clPlaca,
        verificadaAl: clVerificadaAl,
        solicitante: clSolicitante === '' ? undefined : clSolicitante,
        observacion: clObs,
        formato: clFormato,
      });
      setConstanciaEmitida({ ...r, placa: clPlaca, verificadaAl: clVerificadaAl });
      /* Se vacía la observación, y con `setVals` en vez de con `set`: lo que
         rearma la guarda de la regla 10 es precisamente que esté vacía, y así
         una segunda pulsación no puede numerar otra constancia por inercia. Va
         por `setVals` porque `set` borraría el número recién emitido. La placa y
         la fecha se quedan a la vista: son lo que acredita el papel que se
         acaba de entregar. */
      setVals((x) => ({ ...x, cl_obs: '' }));
      toast('Constancia emitida.');
    } catch (fallo) {
      setFalloConstancia(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo emitir la constancia', 0),
      );
    } finally {
      setEmitiendoConstancia(false);
      setConfirmandoConstancia(false);
    }
  };

  /* ── Los tres actos que escriben ─────────────────────────────── */
  const proc = PROCESOS.find((p) => p.k === proceso) ?? PROCESOS[0];
  const obs = texto('obs').trim();
  const faltaObservacion = obs.length < 5;

  const camposDelActo: Record<string, string[]> = {
    valores: ['vDesde', 'vHasta'],
    numero: ['nNumero', 'nNuevo'],
    descargo: ['dPapeleta', 'dExpediente', 'dFecha', 'dTipo', 'dFundamento'],
  };
  const faltanCampos = (camposDelActo[proceso] ?? []).filter((k) => texto(k).trim() === '');
  const puedeGuardar = !faltaObservacion && faltanCampos.length === 0 && !enviando;
  const motivoApagado = faltaObservacion
    ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace, y va de 5 a 500 caracteres.'
    : faltanCampos.length > 0
      ? 'Faltan ' + faltanCampos.length + ' campos obligatorios de este acto.'
      : '';

  const ejecutarActo = async () => {
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      if (proceso === 'valores') {
        const r = await generarValoresDeTransito({
          observacion: obs,
          desde: texto('vDesde'),
          hasta: texto('vHasta'),
          fechaCriterio: texto('vCriterio') || undefined,
        });
        setHechoDelActo(`Corrida ${r.id} registrada por ${r.origen.toLowerCase()}: ${r.totalCandidatos} candidatos entre ${r.desde} y ${r.hasta}. Todavía no se ha emitido ningún valor.`);
      } else if (proceso === 'numero') {
        const r = await cambiarNumeroDePapeleta(texto('nNumero').trim(), { observacion: obs, numeroNuevo: texto('nNuevo').trim() });
        setHechoDelActo(`La papeleta se llama ahora ${r.numero}. Su estado sigue siendo ${rotuloDeEstado(r.estado).toLowerCase()}.`);
      } else {
        const r = await registrarDescargo({
          observacion: obs,
          papeleta: texto('dPapeleta').trim(),
          nDeExpediente: texto('dExpediente').trim(),
          fechaDePresentacion: texto('dFecha'),
          tipoDeRecurso: texto('dTipo', 'DESCARGO') as TipoDeRecurso,
          fundamento: texto('dFundamento'),
        });
        setHechoDelActo(`Expediente ${r.nDeExpediente} registrado contra ${r.papeleta}. Se podía presentar hasta el ${r.presentadoHasta} (${r.plazo}), y ${r.enPlazo ? 'llegó en plazo' : 'llegó FUERA de plazo'}.`);
      }
      toast('Acto registrado.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

  const faltanDeLaLiberacion = [
    texto('libFecha') === '' ? 'la fecha' : '',
    texto('libRecibo').trim() === '' ? 'el recibo de la custodia' : '',
    texto('libPersona').trim() === '' ? 'quién retira' : '',
    texto('libDoc').trim() === '' ? 'su documento' : '',
  ].filter((x) => x !== '');
  const puedeLiberar = vehiculo !== null && !faltaObservacion && faltanDeLaLiberacion.length === 0 && !enviando;

  const liberar = async () => {
    if (vehiculo === null) return;
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      const r = await liberarVehiculo(vehiculo.placa, {
        observacion: obs,
        fechaDeLiberacion: texto('libFecha'),
        reciboDeCustodia: texto('libRecibo').trim(),
        personaQueRetira: texto('libPersona').trim(),
        documentoDeQuienRetira: texto('libDoc').trim(),
        soatVigenteAcreditado: val('libSoat') === true,
      });
      setHechoDelActo(
        `${r.placa} liberado el ${r.fecha} tras ${r.dias} días. Custodia acreditada con el recibo ${r.custodiaPagada.recibo} ` +
          `por S/ ${r.custodiaPagada.importe.importe} al ${r.custodiaPagada.importe.actualizadoA}. Acta ${r.acta}.`,
      );
      internados.reintentar();
      toast('Vehículo liberado.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

  /* ── Ruta y contexto ─────────────────────────────────────────── */
  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({ label: o[0], nota: 'Tránsito', ir: () => irDest(o[1]) }));
  const etiquetaDeDestino = moduloDe('transito').destinos.find((x) => x.k === dest)?.label ?? 'Tránsito';
  const miga = esPapeleta ? ['Tránsito', 'Papeletas', papeletaAbierta!] : ['Tránsito', etiquetaDeDestino];
  const titulo = esPapeleta ? 'Papeleta ' + papeletaAbierta : etiquetaDeDestino;

  /* Las notas del panel de destinos las traía el artboard —«12,844 en el
     ejercicio»—, y en cuanto la pantalla lee del backend esa cifra queda
     contradicha por la que sale a su lado. Se sustituyen por lo contado, y lo
     contado se RECUERDA: las lecturas del panel se apagan al salir de él, y sin
     memoria la nota volvería a la cifra del prototipo en cuanto se cambia de
     destino —que es justo donde se lee al lado de la cifra de verdad—. */
  useEffect(() => {
    if (censoDePapeletas.datos)
      setContado((c) => ({ ...c, padron: miles(censoDePapeletas.datos!.totalElementos) + ' en el padrón' }));
  }, [censoDePapeletas.datos]);
  useEffect(() => {
    if (enDeposito.datos)
      setContado((c) => ({ ...c, internamiento: miles(enDeposito.datos!.totalElementos) + ' en depósito' }));
  }, [enDeposito.datos]);
  useEffect(() => {
    if (catalogo.datos) setContado((c) => ({ ...c, codigos: miles(catalogo.datos!.totalElementos) + ' del reglamento' }));
  }, [catalogo.datos]);
  const notasDeDestino: Record<string, string> = {
    ...contado,
    reportes: HOJAS.filter((x) => x.sinLectura === undefined).length + ' de ' + HOJAS.length + ' con lectura',
  };

  const contexto: Contexto | undefined = esPapeleta
    ? {
        volver: { label: 'Papeletas', onClick: () => setPapeletaAbierta(null) },
        codigo: papeletaAbierta!,
        titular: hoja.datos ? (hoja.datos.obligadoNombre ?? 'Sin obligado en el padrón') : hoja.cargando ? 'Resolviendo…' : SIN_DATO,
        ubic: hoja.datos ? hoja.datos.lugar : '',
        estado: hoja.datos ? rotuloDeEstado(hoja.datos.estado) : SIN_DATO,
        estadoColor: hoja.datos && hoja.datos.estado === 'PAGADA' ? 'var(--ok-fg)' : 'var(--warn-fg)',
      }
    : undefined;

  return (
    <Shell modulo="transito" dest={dest} onDest={irDest} miga={miga} titulo={titulo} contexto={contexto} paleta={paleta} notasDeDestino={notasDeDestino}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Veintitrés opciones de menú para un solo objeto: la papeleta. Lo que cambia de una a otra es en qué punto de su vida está y
              qué plazo corre. El módulo se ordena por eso.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>La vida de una papeleta · ejercicio {pref.ejercicio}</h2>
                <span style={META}>
                  {porEstado.datos ? miles(porEstado.datos.papeletas) + ' levantadas' : porEstado.cargando ? '…' : SIN_DATO}
                </span>
              </div>
              <Lectura
                estado={porEstado}
                que="el resumen de papeletas"
                acceso="transito_resumen_papeletas"
                ruta="GET /api/v1/transito/reportes/resumen-papeletas"
                vacio={<p style={PIE}>Sin resumen.</p>}
              >
                {(r) => {
                  const base = r.papeletas;
                  return (
                    <>
                      {ESTADOS_DE_PAPELETA.map((e, i) => {
                        const linea = r.lineas.find((l) => l.clave === e[0]);
                        const cantidad = linea ? linea.cantidad : 0;
                        const pct = base === 0 ? 0 : (cantidad / base) * 100;
                        return (
                          <button
                            key={e[0]}
                            onClick={() => {
                              setFEstado(e[0] as EstadoDePapeleta);
                              setQ('');
                              irDest('padron');
                            }}
                            className="hov-acento"
                            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', padding: '13px 16px', cursor: 'pointer' }}
                          >
                            <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                              {i + 1}
                            </span>
                            <span style={{ flex: '0 0 178px', minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{e[1]}</span>
                              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{e[2]}</span>
                            </span>
                            <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                              <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.45 + i * 0.07 }} />
                            </span>
                            <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                              {base === 0 ? SIN_DATO : pct.toFixed(0) + ' %'}
                            </span>
                            <span style={{ flex: '0 0 66px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                              {miles(cantidad)}
                            </span>
                            <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                          </button>
                        );
                      })}
                      <p style={PIE}>
                        Los siete estados son los que el dominio declara. El embudo del prototipo hablaba de «levantada», «firme» y
                        «cobrada», y ninguna de las tres es un estado del sistema. Las cifras están al {r.actualizadoA} y cuentan las
                        actas, no lo cobrado.
                      </p>
                    </>
                  );
                }}
              </Lectura>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(216px,1fr))', gap: 13 }}>
              {[
                {
                  valor: porEstado.datos ? miles(porEstado.datos.papeletas) : porEstado.cargando ? '…' : SIN_DATO,
                  etiqueta: 'Papeletas del ejercicio',
                  nota: porEstado.datos ? `Importe de las actas: S/ ${porEstado.datos.importeTotal}, al ${porEstado.datos.actualizadoA}.` : 'Lo cuenta el resumen del ejercicio.',
                },
                {
                  valor: recaudado.datos ? 'S/ ' + recaudado.datos.total : recaudado.cargando ? '…' : SIN_DATO,
                  etiqueta: 'Recaudado por papeletas',
                  nota: recaudado.datos
                    ? `${miles(recaudado.datos.abonos)} abonos vivos del libro entre ${recaudado.datos.desde} y ${recaudado.datos.hasta}.`
                    : 'Sale del libro de cuenta corriente, no de sumar papeletas pagadas.',
                },
                {
                  valor: SIN_DATO,
                  etiqueta: 'Cobrado de lo levantado',
                  nota: 'Ninguna lectura publica este porcentaje, y componerlo aquí con dos cifras de dinero de dos orígenes distintos sería inventarlo (RNF-083).',
                },
                {
                  valor: cifra(enDeposito),
                  etiqueta: 'Vehículos en depósito',
                  nota: `${cifra(enAbandono)} pasaron a abandono. La tasa de custodia corre por día y no se detiene.`,
                },
              ].map((k) => (
                <div key={k.etiqueta} style={{ ...TARJETA, padding: '17px 18px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.015em', color: 'var(--accent-ink)' }}>{k.valor}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que toca ahora</h2>
                <span style={META}>contado, no estimado</span>
              </div>
              {[
                {
                  conteo: cifra(sinNotificar),
                  titulo: 'Papeletas impuestas y sin notificar',
                  detalle: 'Mientras no se notifiquen no corre ningún plazo y no llegan a ser firmes: es la brecha entre lo levantado y lo cobrable.',
                  tono: 'bad' as Tono,
                  ir: () => {
                    setFEstado('IMPUESTA');
                    irDest('padron');
                  },
                },
                {
                  conteo: cifra(enAbandono),
                  titulo: 'Vehículos en abandono en el depósito',
                  detalle: 'Pasados los treinta días el procedimiento cambia: deja de ser una liberación y pasa a ser un remate.',
                  tono: 'bad' as Tono,
                  ir: () => {
                    setEstadoInt('EN_ABANDONO');
                    irDest('internamiento');
                  },
                },
                {
                  conteo: cifra(catalogo),
                  titulo: 'Códigos del reglamento cargados',
                  detalle: 'El código elegido al registrar una papeleta arrastra el porcentaje de UIT, los puntos y la medida preventiva.',
                  tono: (catalogo.datos && catalogo.datos.totalElementos === 0 ? 'bad' : 'ok') as Tono,
                  ir: () => irDest('codigos'),
                },
              ].map((t) => (
                <button
                  key={t.titulo}
                  onClick={t.ir}
                  className="hov-acento"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', padding: '13px 16px', cursor: 'pointer' }}
                >
                  <Insignia tono={t.tono}>{t.conteo}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{t.titulo}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{t.detalle}</span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <p style={PIE}>
                Los plazos que el prototipo listaba —«vence en 3 días»— no se pueden contar hoy: ninguna lectura publica el vencimiento
                del plazo de descargo de una papeleta. Lo que sí se cuenta está arriba.
              </p>
            </section>
          </div>
        )}

        {/* ══════════ REGISTRAR PAPELETA: EL ACTO QUE NO TIENE PUERTA ══════════ */}
        {dest === 'alta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El botón de acción del módulo lleva aquí, y aquí no se puede registrar nada todavía.
            </p>
            <div role="note" style={{ display: 'flex', gap: 11, padding: '14px 16px', borderRadius: 8, background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
              <span style={{ fontSize: 13, lineHeight: 1.6, textWrap: 'pretty' }}>
                <strong style={{ display: 'block', fontWeight: 600, marginBottom: 3 }}>El registro de papeletas no está publicado</strong>
                El caso de uso existe en el backend, pero <code style={{ fontFamily: 'var(--font-mono)' }}>PapeletasController</code> es de
                solo lectura y el contrato no declara ningún <code style={{ fontFamily: 'var(--font-mono)' }}>POST</code> sobre{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>/transito/papeletas</code>. Dibujar aquí el formulario del manual daría un
                botón que no manda nada: no se dibuja.
              </span>
            </div>
            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que sí se puede hacer con una papeleta ya registrada</h2>
              </div>
              {[
                ['Buscarla y abrir su hoja', 'padron', 'Por placa, por número o por documento del infractor.'],
                ['Corregir su número', 'procesos', 'Cuando el operador se equivocó al teclearlo.'],
                ['Anotar su descargo', 'procesos', 'El escrito que el administrado presenta dentro del plazo.'],
                ['Registrar la corrida de valores', 'procesos', 'El criterio con el que después se emiten los valores.'],
              ].map((x) => (
                <button
                  key={x[0]}
                  onClick={() => irDest(x[1])}
                  className="hov-acento"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', padding: '13px 16px', cursor: 'pointer' }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{x[0]}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{x[2]}</span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ PADRÓN DE PAPELETAS ══════════ */}
        {dest === 'padron' && !esPapeleta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              En ventanilla se busca por placa y casi nunca por número. El servidor acota por tres campos —placa, número y documento del
              infractor—, y por eso se elige por cuál antes de teclear.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
                <Lupa tam={18} />
                <select
                  value={campo}
                  onChange={(e) => setCampo(e.target.value)}
                  aria-label="Buscar por"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 10px', background: 'var(--bg-elev)', fontSize: 12.5, flex: '0 0 auto' }}
                >
                  {CRITERIOS_DE_BUSQUEDA.map((x) => (
                    <option key={x[0]} value={x[0]}>
                      {x[1]}
                    </option>
                  ))}
                </select>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={CRITERIOS_DE_BUSQUEDA.find((x) => x[0] === campo)?.[2] ?? ''}
                  style={{ flex: 1, minWidth: 180, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}
                />
              </div>
              <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <button
                  onClick={() => setAvanzada((v) => !v)}
                  aria-expanded={avanzada}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Caret abierta={avanzada} tam={12} ancho={16} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Acotar más</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>fechas · estado</span>
                </button>
                {avanzada && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(184px,1fr))', gap: '14px 16px', padding: '4px 16px 16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Infracción desde</span>
                      <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} style={{ ...IN, background: 'var(--bg-card)' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Infracción hasta</span>
                      <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} style={{ ...IN, background: 'var(--bg-card)' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Estado</span>
                      <select value={fEstado} onChange={(e) => setFEstado(e.target.value as '' | EstadoDePapeleta)} style={{ ...IN, background: 'var(--bg-card)' }}>
                        <option value="">(todos)</option>
                        {ESTADOS_DE_PAPELETA.map((e) => (
                          <option key={e[0]} value={e[0]}>
                            {e[1]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p style={{ gridColumn: '1/-1', margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Conductor, propietario, código de infracción y «ingresado por» no se filtran aquí: esta operación no los admite. La
                      búsqueda avanzada del manual es otra ruta, con su propio permiso, y solo acota por papeleta, placa, usuario y si
                      queda deuda.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                ['Papeletas', cifra(padron), 'var(--ink)'],
                ['Pagadas', cifra(pagadas), 'var(--ok-fg)'],
                ['En coactiva', cifra(enCoactiva), 'var(--bad-fg)'],
                ['Deuda de hoy', SIN_DATO, 'var(--ink-3)'],
              ].map((t, i) => (
                <div key={t[0]} style={{ background: i === 3 ? 'var(--bg-elev)' : 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: t[2] }}>{t[1]}</p>
                </div>
              ))}
            </div>

            <Lectura
              estado={padron}
              que="el padrón de papeletas"
              acceso="papeletas"
              ruta="GET /api/v1/transito/papeletas"
              vacio={<Vacio titulo="Todavía no se ha buscado">Elige por qué campo buscar y teclea.</Vacio>}
            >
              {(p) =>
                p.contenido.length === 0 ? (
                  <Vacio titulo="Ninguna papeleta con esos datos">
                    {criterio === '' && fDesde === '' && fHasta === '' && fEstado === ''
                      ? 'Esta municipalidad no tiene ninguna papeleta de tránsito registrada. La siembra de demostración no carga papeletas ni códigos de infracción, y el registro de papeletas todavía no se publica como operación.'
                      : 'Prueba con otro campo de búsqueda o quita el rango de fechas: el número se compara entero, no por prefijo.'}
                  </Vacio>
                ) : (
                  <section style={TARJETA}>
                    <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                      <h2 style={H2}>Papeletas encontradas</h2>
                      <span style={META}>
                        {p.contenido.length} de {miles(p.totalElementos)}
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                        <Cabecera cols={COLS_PADRON} />
                        <CuerpoDeTabla
                          cols={COLS_PADRON}
                          insigniaEn={6}
                          hov="hov-acento"
                          onFila={(f) => abrirPapeleta(f[0])}
                          filas={p.contenido.map((r: Papeleta) => [
                            r.numero,
                            r.fechaInfraccion,
                            r.lugar,
                            r.placa ?? SIN_DATO,
                            r.importeInfraccion,
                            r.importeAPagar,
                            rotuloDeEstado(r.estado),
                          ])}
                        />
                      </table>
                    </div>
                    <Paginador pagina={p.pagina} totalPaginas={p.totalPaginas} hayMas={p.hayMas} ir={setPagina} />
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                      Los dos importes son los del acta, congelados el día de la infracción. Lo que se cobra hoy lleva el interés del
                      libro y no sale en esta lectura. El código de la infracción y el nombre del conductor tampoco: esta operación no los
                      publica, y sí lo hace el padrón del centro de reportes.
                    </p>
                  </section>
                )
              }
            </Lectura>
          </div>
        )}

        {/* ══════════ LA PAPELETA ══════════ */}
        {esPapeleta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Lectura
              estado={hoja}
              que="la papeleta"
              acceso="transito_papeleta_reporte"
              ruta={`GET /api/v1/transito/papeletas/${papeletaAbierta}/hoja-informativa`}
              vacio={<Vacio titulo="Sin hoja">No hay hoja informativa de esta papeleta.</Vacio>}
            >
              {(x) => (
                <>
                  <section style={TARJETA}>
                    <div style={CABECERA}>
                      <h2 style={H2}>Hoja informativa</h2>
                      <span style={META}>emitida el {x.emitidaEl}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px 18px', padding: '15px 16px' }}>
                      {[
                        ['Infracción', `${x.fechaInfraccion}${x.horaInfraccion ? ' · ' + x.horaInfraccion : ''}`],
                        ['Lugar', x.lugar],
                        ['Placa', x.placa ?? SIN_DATO],
                        ['Licencia de conducir', x.licenciaConducir ?? SIN_DATO],
                        ['Código', x.codigoInfraccion ?? SIN_DATO],
                        ['Infracción tipificada', x.descripcionInfraccion ?? SIN_DATO],
                        ['Obligado', x.obligadoNombre ?? SIN_DATO],
                        ['Documento', x.obligadoDocumento ?? SIN_DATO],
                        ['Domicilio', x.obligadoDomicilio ?? SIN_DATO],
                        ['Estado', rotuloDeEstado(x.estado)],
                      ].map((d) => (
                        <div key={d[0]}>
                          <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{d[0]}</p>
                          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', textWrap: 'pretty' }}>{d[1]}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Cabecera cols={[['Concepto', 0], ['Base', 0], ['%', 1], ['Importe S/', 1]]} />
                        <tbody>
                          <tr style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={TD1}>Infracción</td>
                            <td style={TD}>{x.baseImponible}</td>
                            <td style={TDN}>{x.porcentajeInfraccion}</td>
                            <td style={TDN}>{x.importeInfraccion}</td>
                          </tr>
                          <tr style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={TD1}>A pagar</td>
                            <td style={TD}>sobre el importe de la infracción</td>
                            <td style={TDN}>{x.porcentajeACobrar}</td>
                            <td style={TDN}>{x.importeAPagar}</td>
                          </tr>
                          <tr style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={TD1}>Con beneficio</td>
                            <td style={TD}>beneficio vigente al registrar el acta</td>
                            <td style={TDN}>{SIN_DATO}</td>
                            <td style={TDN}>{x.importeConBeneficio ?? SIN_DATO}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                      Los importes son los del acta, congelados al {x.actualizadoA} —la fecha de la infracción—. Esta hoja no dice lo que
                      se debe hoy: esa cifra la lleva el libro y sale en el estado de cuenta.
                    </p>
                  </section>
                </>
              )}
            </Lectura>

            <Lectura
              estado={expediente}
              que="el expediente de la papeleta"
              acceso="transito_documentos"
              ruta={`GET /api/v1/transito/papeletas/${papeletaAbierta}/actos`}
              vacio={<></>}
            >
              {(e) => (
                <section style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>Actos y recursos</h2>
                    <span style={META}>
                      {e.actos.length} actos · {e.descargos.length} recursos
                    </span>
                  </div>
                  {e.actos.length === 0 && e.descargos.length === 0 && (
                    <p style={PIE}>
                      No se ha emitido ningún documento sobre esta papeleta ni se ha presentado ningún recurso. Sin notificación no corre
                      el plazo, y sin plazo vencido la papeleta no llega a ser firme.
                    </p>
                  )}
                  {e.actos.map((a) => (
                    <div key={a.clase + a.numero} style={{ borderBottom: '1px solid var(--line)', padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Insignia tono="neutro">{a.clase}</Insignia>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{a.numero}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1, minWidth: 120 }}>{a.tipo}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{a.fecha}</span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{a.observacion}</p>
                      {a.acuses.map((ac) => (
                        <div key={ac.intento} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--line-2)' }}>
                          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Intento {ac.intento}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{ac.fecha}</span>
                          <Insignia tono={ac.resultado === 'NOTIFICADO' ? 'ok' : 'bad'}>{ac.resultado}</Insignia>
                          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ac.modalidad}</span>
                          <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1, minWidth: 100 }}>
                            {ac.recibidoPor ? 'Recibió ' + ac.recibidoPor : 'Sin receptor'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: ac.exigibleDesde ? 'var(--ink)' : 'var(--ink-4)' }}>
                            {ac.exigibleDesde ? 'exigible desde ' + ac.exigibleDesde : 'no abre plazo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {e.descargos.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', padding: '13px 16px' }}>
                      <Insignia tono={d.enPlazo ? 'ok' : 'bad'}>{d.enPlazo ? 'En plazo' : 'Fuera de plazo'}</Insignia>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{d.nDeExpediente}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-2)', flex: 1, minWidth: 120 }}>{d.tipoDeRecurso}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                        {d.fecha} · se podía hasta el {d.presentadoHasta}
                      </span>
                    </div>
                  ))}
                </section>
              )}
            </Lectura>
          </div>
        )}

        {/* ══════════ INTERNAMIENTO ══════════ */}
        {dest === 'internamiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              La tasa de custodia corre por día y no se detiene. El servidor cuenta los días a una fecha y la dice: los días de un
              vehículo son los de ese corte, no los de hoy.
            </p>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>Vehículos en depósito</h2>
                <span style={META}>{internados.datos ? miles(internados.datos.totalElementos) : '…'}</span>
                <input
                  value={deposito}
                  onChange={(e) => setDeposito(e.target.value)}
                  placeholder="Depósito"
                  aria-label="Depósito"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 10px', background: 'var(--bg-elev)', fontSize: 12.5, width: 200 }}
                />
                <select
                  value={estadoInt}
                  onChange={(e) => setEstadoInt(e.target.value)}
                  aria-label="Estado"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 10px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                >
                  {ESTADOS_DE_INTERNAMIENTO.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <Lectura
                estado={internados}
                que="el depósito"
                acceso="internamiento"
                ruta="GET /api/v1/transito/internamientos"
                vacio={<p style={PIE}>Sin datos.</p>}
              >
                {(p) =>
                  p.contenido.length === 0 ? (
                    <p style={PIE}>
                      No hay ningún vehículo internado con esos criterios. Un internamiento nace del acta que lo registra, y esta
                      municipalidad todavía no tiene ninguna.
                    </p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                          <Cabecera cols={[['Placa', 0], ['Papeleta', 0], ['Depósito', 0], ['Ingreso', 0], ['Salida', 0], ['Días', 1], ['Tasa/día S/', 1], ['Estado', 0]]} />
                          <CuerpoDeTabla
                            cols={[['Placa', 0], ['Papeleta', 0], ['Depósito', 0], ['Ingreso', 0], ['Salida', 0], ['Días', 1], ['Tasa/día S/', 1], ['Estado', 0]]}
                            insigniaEn={7}
                            hov="hov-acento"
                            onFila={(_f, i) => setVehiculo(p.contenido[i] ?? null)}
                            filas={p.contenido.map((v) => [
                              v.placa,
                              v.papeleta ?? SIN_DATO,
                              v.deposito,
                              v.fechaDeIngreso,
                              v.fechaDeSalida ?? SIN_DATO,
                              String(v.dias),
                              v.tasaDeCustodia,
                              v.estado,
                            ])}
                          />
                        </table>
                      </div>
                      <Paginador pagina={p.pagina} totalPaginas={p.totalPaginas} hayMas={p.hayMas} ir={setPaginaInt} />
                      <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                        Los días están contados al {p.contenido[0].calculadoA}. La custodia acumulada no sale como columna: sería
                        multiplicar la tasa por los días en la pantalla, y una cifra de dinero no se compone aquí.
                      </p>
                    </>
                  )
                }
              </Lectura>
            </section>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>
                  {vehiculo === null ? 'Liberación del vehículo' : 'Liberación de ' + vehiculo.placa}
                </h2>
                {vehiculo && (
                  <button onClick={() => setVehiculo(null)} className="hov-linea" style={BOTON_LINEA}>
                    Elegir otro
                  </button>
                )}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>
                  POST /api/v1/transito/internamientos/&#123;placa&#125;/liberacion
                </code>
              </div>
              {vehiculo === null ? (
                <p style={PIE}>
                  Elige un vehículo de la grilla de arriba: la liberación actúa sobre uno, y ofrecer el formulario sin haberlo elegido
                  sería un botón que no sabe a qué placa mandar.
                </p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px 18px', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    {[
                      ['Depósito', vehiculo.deposito],
                      ['Ingresó', vehiculo.fechaDeIngreso],
                      ['Días al ' + vehiculo.calculadoA, String(vehiculo.dias)],
                      ['Tasa por día S/', vehiculo.tasaDeCustodia],
                      ['Acta de ingreso', vehiculo.acta],
                      ['Estado', vehiculo.estado],
                    ].map((d) => (
                      <div key={d[0]}>
                        <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{d[0]}</p>
                        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>{d[1]}</p>
                      </div>
                    ))}
                  </div>
                  <RejillaDeCampos>
                    {CAMPOS_LIBERACION.map((f) => (
                      <CampoForm key={f.k} f={f} valor={val(f.k)} set={set} />
                    ))}
                    <CampoForm
                      f={{ k: 'libSoat', l: 'SOAT', t: 'chk', ph: 'SOAT vigente acreditado' }}
                      valor={val('libSoat')}
                      set={set}
                    />
                    <CampoForm
                      f={{ k: 'obs', l: 'Observación', t: 'area', ancho: true, ph: 'Por qué se entrega', ayuda: 'Obligatoria: de 5 a 500 caracteres.' }}
                      valor={val('obs')}
                      set={set}
                    />
                  </RejillaDeCampos>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {faltaObservacion
                        ? 'Falta la observación: sin ella el servidor no guarda nada.'
                        : faltanDeLaLiberacion.length > 0
                          ? 'Falta ' + faltanDeLaLiberacion.join(', ') + '.'
                          : 'El servidor acredita el recibo contra tesorería y niega la salida si la custodia no está pagada. La casilla del prototipo no bastaba: la marca quien entrega el vehículo.'}
                    </p>
                    <button
                      onClick={liberar}
                      disabled={!puedeLiberar}
                      title={
                        faltaObservacion
                          ? 'Falta la observación'
                          : faltanDeLaLiberacion.length > 0
                            ? 'Falta ' + faltanDeLaLiberacion.join(', ')
                            : undefined
                      }
                      className={puedeLiberar ? 'hov-acento-2' : undefined}
                      style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: puedeLiberar ? 'pointer' : 'not-allowed', opacity: puedeLiberar ? 1 : 0.5 }}
                    >
                      {enviando ? 'Enviando…' : 'Liberar el vehículo'}
                    </button>
                  </div>
                </>
              )}
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                Los tres requisitos que el prototipo pedía marcar a mano —multa cancelada, custodia cancelada, SOAT— no los decide esta
                pantalla. El servidor acredita el recibo de la custodia contra tesorería, y la custodia acumulada tampoco se dibuja: sería
                multiplicar la tasa por los días aquí, y una cifra de dinero no se compone en la pantalla.
              </p>
            </section>

            {hechoDelActo !== '' && (
              <div role="status" style={{ display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{hechoDelActo}</span>
              </div>
            )}
            {falloDelActo && (
              <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
                <strong style={{ fontSize: 12.5 }}>{tituloDelFallo(falloDelActo, 'el acto')}</strong>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{falloDelActo.mensaje}</span>
              </div>
            )}
          </div>
        )}

        {/* ══════════ PROCESOS ══════════ */}
        {dest === 'procesos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Tres actos que no son la papeleta pero la mueven: registrar la corrida con que se cobrarán, corregir su número cuando el
              operador se equivocó, y anotar el descargo que el administrado presenta.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROCESOS.map((p) => {
                const on = proceso === p.k;
                return (
                  <button
                    key={p.k}
                    onClick={() => {
                      setProceso(p.k);
                      setFalloDelActo(null);
                      setHechoDelActo('');
                    }}
                    aria-pressed={on}
                    className="hov-linea"
                    style={{ border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`, borderRadius: 999, padding: '7px 15px', cursor: 'pointer', fontSize: 12.5, fontWeight: on ? 600 : 400, background: on ? 'var(--accent)' : 'var(--bg-card)', color: on ? '#fff' : 'var(--ink-2)' }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>{proc.titulo}</h2>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>{proc.endpoint}</code>
              </div>
              <p style={{ margin: 0, padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>{proc.desc}</p>
              <RejillaDeCampos style={{ borderTop: '1px solid var(--line)' }}>
                {proceso === 'valores' && (
                  <>
                    <CampoForm f={{ k: 'vDesde', l: 'Infracciones desde', t: 'date' }} valor={val('vDesde')} set={set} />
                    <CampoForm f={{ k: 'vHasta', l: 'Infracciones hasta', t: 'date' }} valor={val('vHasta')} set={set} />
                    <CampoForm f={{ k: 'vCriterio', l: 'Fecha de criterio', t: 'date', ayuda: 'A qué fecha se evalúan la deuda y el plazo. En blanco, hoy.' }} valor={val('vCriterio')} set={set} />
                  </>
                )}
                {proceso === 'numero' && (
                  <>
                    <CampoForm f={{ k: 'nNumero', l: 'Número actual de la papeleta', t: 'text', ph: 'MDC-2026-041182' }} valor={val('nNumero')} set={set} />
                    <CampoForm f={{ k: 'nNuevo', l: 'Número nuevo', t: 'text', ph: 'MDC-2026-041183' }} valor={val('nNuevo')} set={set} />
                  </>
                )}
                {proceso === 'descargo' && (
                  <>
                    <CampoForm f={{ k: 'dPapeleta', l: 'Papeleta', t: 'text', ph: 'MDC-2026-041182' }} valor={val('dPapeleta')} set={set} />
                    <CampoForm f={{ k: 'dExpediente', l: 'Nº de expediente de mesa de partes', t: 'text', ph: '2026-1188' }} valor={val('dExpediente')} set={set} />
                    <CampoForm f={{ k: 'dFecha', l: 'Fecha de presentación', t: 'date' }} valor={val('dFecha')} set={set} />
                    <CampoForm f={{ k: 'dTipo', l: 'Tipo de recurso', t: 'sel', o: TIPOS_DE_RECURSO }} valor={val('dTipo', 'DESCARGO')} set={set} />
                    <CampoForm f={{ k: 'dFundamento', l: 'Fundamento', t: 'area', ancho: true, ph: 'Lo que alega el administrado' }} valor={val('dFundamento')} set={set} />
                  </>
                )}
                <CampoForm
                  f={{ k: 'obs', l: 'Observación', t: 'area', ancho: true, ph: 'Por qué se registra', ayuda: 'Obligatoria: toda modificación se guarda con el motivo de quien la hace. De 5 a 500 caracteres.' }}
                  valor={val('obs')}
                  set={set}
                />
              </RejillaDeCampos>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>{proc.nota}</p>
            </section>

            {hechoDelActo !== '' && (
              <div role="status" style={{ display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{hechoDelActo}</span>
              </div>
            )}
            {falloDelActo && (
              <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
                <strong style={{ fontSize: 12.5 }}>{tituloDelFallo(falloDelActo, 'el acto')}</strong>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{falloDelActo.mensaje}</span>
                {/* Las dos causas de un 422 llegan con el mismo código y la
                    respuesta no trae ningún discriminador: se dicen las dos y en
                    qué se reconocen, en vez de clasificar por subcadena (#562). */}
                {causasDelRechazo(falloDelActo, 'PLAZO:DESCARGO_PAPELETA') !== null && (
                  <span style={{ fontSize: 12, lineHeight: 1.5, textWrap: 'pretty', opacity: 0.85 }}>
                    {causasDelRechazo(falloDelActo, 'PLAZO:DESCARGO_PAPELETA')}
                  </span>
                )}
                {falloDelActo.detalles && falloDelActo.detalles.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{falloDelActo.detalles.join(' · ')}</span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {puedeGuardar ? proc.aviso : motivoApagado}
              </p>
              <button
                onClick={ejecutarActo}
                disabled={!puedeGuardar}
                title={puedeGuardar ? undefined : motivoApagado}
                className={puedeGuardar ? 'hov-acento-2' : undefined}
                style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: puedeGuardar ? 'pointer' : 'not-allowed', opacity: puedeGuardar ? 1 : 0.5 }}
              >
                {enviando ? 'Enviando…' : proc.primaria}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ CÓDIGOS ══════════ */}
        {dest === 'codigos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El catálogo del Reglamento Nacional de Tránsito. El código elegido al registrar una papeleta arrastra el porcentaje de UIT,
              los puntos y la medida preventiva: no se teclean.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <input
                  value={codQ}
                  onChange={(e) => setCodQ(e.target.value)}
                  placeholder="Texto de la infracción"
                  aria-label="Texto de la infracción"
                  style={{ flex: 1, minWidth: 180, ...IN, width: undefined }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty', flex: '1 1 260px' }}>
                  El filtro por gravedad —muy grave, grave, leve— no está: el catálogo no guarda esa clasificación.
                </span>
              </div>
              <Lectura
                estado={codigos}
                que="el catálogo de infracciones"
                acceso="codigos_transito"
                ruta="GET /api/v1/transito/codigos"
                vacio={<p style={PIE}>Sin datos.</p>}
              >
                {(p) =>
                  p.contenido.length === 0 ? (
                    <p style={PIE}>
                      El catálogo del reglamento está vacío en esta municipalidad. Nada lo carga todavía: la siembra de demostración no
                      trae códigos de infracción y no hay ninguna operación publicada que los dé de alta. Sin catálogo no se puede
                      registrar una papeleta.
                    </p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                          <Cabecera cols={COLS_COD} />
                          <CuerpoDeTabla
                            cols={COLS_COD}
                            filas={p.contenido.map((x) => [
                              x.codigo,
                              x.descripcion,
                              x.porcentajeUit,
                              x.puntos === null ? SIN_DATO : String(x.puntos),
                              x.medida ?? SIN_DATO,
                              x.baseLegal,
                              x.vigenciaHasta ? `${x.vigenciaDesde} — ${x.vigenciaHasta}` : x.vigenciaDesde,
                            ])}
                          />
                        </table>
                      </div>
                      <Paginador pagina={p.pagina} totalPaginas={p.totalPaginas} hayMas={p.hayMas} ir={setPaginaCod} />
                      <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                        El «% UIT» es el porcentaje de la unidad impositiva, no la multa. La multa en soles es ese porcentaje por la UIT
                        del ejercicio, y la UIT sale del conjunto de parámetros sellado: por eso no hay columna de importe.
                      </p>
                    </>
                  )
                }
              </Lectura>
            </section>
          </div>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {dest === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p data-noprint="1" style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Quince entradas de menú eran quince reportes con el mismo formulario. Aquí son un carril: se elige el reporte y solo
              aparecen los criterios que ese reporte usa —y de los que el servidor lee, que no son todos los que el manual dibuja—.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,268px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section data-noprint="1" style={TARJETA}>
                <p style={{ margin: 0, padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  Reportes del módulo
                </p>
                <div style={{ maxHeight: '62vh', overflow: 'auto' }}>
                  {HOJAS.map((x, i) => {
                    const on = hojaIdx === i;
                    const primeroDelGrupo = i === 0 || HOJAS[i - 1].g !== x.g;
                    return (
                      <button
                        key={x.k}
                        onClick={() => setHojaIdx(i)}
                        aria-current={on ? 'true' : undefined}
                        className="hov-acento"
                        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 9px', width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', padding: primeroDelGrupo ? '12px 14px 11px' : '11px 14px', cursor: 'pointer', background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-ink)' : 'var(--ink-2)', fontWeight: on ? 600 : 400 }}
                      >
                        {primeroDelGrupo && (
                          <span style={{ display: 'block', width: '100%', fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-4)', marginBottom: 5 }}>{x.g}</span>
                        )}
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, textWrap: 'pretty' }}>{x.label}</span>
                        {/* «Sin lectura» y «se emite» son dos cosas distintas y
                            hasta #589 llevaban la misma insignia de aviso: la
                            constancia libre tampoco se lee, pero desde aquí se
                            HACE, y una insignia de aviso sobre algo que
                            funciona se lee como una avería. */}
                        {x.emision !== undefined ? (
                          <span style={{ fontSize: 10, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 999, padding: '1px 7px', flex: '0 0 auto' }}>se emite</span>
                        ) : (
                          x.sinLectura && (
                            <span style={{ fontSize: 10, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '1px 7px', flex: '0 0 auto' }}>sin lectura</span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section data-noprint="1" style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>{h.label}</h2>
                    <span style={META}>{h.crit.length} criterios</span>
                  </div>
                  {h.crit.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end' }}>
                      {h.crit.map((k) => (
                        <CampoForm key={k} f={{ k: 'rep_' + k, l: CRITERIOS[k].l, t: CRITERIOS[k].t, o: CRITERIOS[k].o }} valor={val('rep_' + k, CRITERIOS[k].v)} set={set} />
                      ))}
                    </div>
                  )}
                  {/* La prosa de los criterios habla de lo que un REPORTE
                      filtra, y la hoja que se emite no filtra nada: leerla
                      encima de un formulario de cinco campos hace pensar que
                      esos cinco son criterios de búsqueda. */}
                  {h.emision === undefined && (
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                      Los criterios que este reporte no usa no se dibujan; los que el contrato declara y ningún controlador lee
                      —ordenación, tipo de cobranza, gravedad— tampoco, porque tecleados no harían nada.
                    </p>
                  )}
                  {/* Las tres hojas sin lectura ya dicen arriba lo suyo, y lo
                      suyo NO es «su endpoint no declara ?formato»: la constancia
                      libre y las dos resoluciones de gerencia SÍ emiten el
                      documento —son POST cuya respuesta es el archivo—, lo que
                      no tienen es lectura ni formulario. Repetir aquí el motivo
                      equivocado sería contradecir el aviso de al lado. */}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
                    {h.emision !== undefined ? (
                      /* Aquí NO van los tres botones de `Descargas`: cada uno
                         sería una pulsación y cada pulsación numera una
                         constancia distinta. El archivo sale del acto de abajo,
                         una vez, y en el formato que se elija allí. */
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        El archivo lo entrega el acto de abajo, no un botón de descarga: cada emisión gasta un número de constancia, así
                        que se pide una vez y en el formato que se elija allí.
                      </p>
                    ) : h.sinLectura !== undefined ? (
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        Sin hoja no hay archivo: el motivo es el de arriba.
                      </p>
                    ) : sePuedeDescargar ? (
                      <Descargas
                        traer={(f) =>
                          h.k === 'hoja_papeleta'
                            ? descargarHojaInformativa(c('papeleta'), f)
                            : descargarReporteDeTransito(rutaDelDocumento!, criteriosDelReporte(h.k, c), f)
                        }
                        que="este reporte"
                        acceso={ACCESO_DEL_REPORTE[h.k] ?? 'transito_reportes'}
                        privilegio="impresion"
                        impedimento={impedimentoDeLaDescarga}
                      />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        <strong style={{ fontWeight: 600 }}>Este reporte no se puede descargar.</strong> Su endpoint no declara{' '}
                        <code style={{ fontFamily: 'var(--font-mono)' }}>?formato</code>: pedírselo devuelve el mismo JSON que se está
                        viendo, así que el archivo se llamaría <code style={{ fontFamily: 'var(--font-mono)' }}>.pdf</code> y no lo sería.
                        La hoja se saca por la impresora con Ctrl+P.
                      </p>
                    )}
                  </div>
                </section>

                {h.sinLectura && (
                  <div
                    role="note"
                    style={{
                      display: 'flex',
                      gap: 11,
                      padding: '12px 14px',
                      borderRadius: 8,
                      /* Neutro cuando además se emite: el amarillo de aviso al
                         lado de un formulario que funciona se lee como avería.
                         Las dos resoluciones de gerencia sí lo llevan, porque
                         ahí de verdad no hay nada que ofrecer. */
                      background: h.emision !== undefined ? 'var(--bg-elev)' : 'var(--warn-bg)',
                      color: h.emision !== undefined ? 'var(--ink-3)' : 'var(--warn-fg)',
                      border: h.emision !== undefined ? '1px solid var(--line)' : undefined,
                    }}
                  >
                    <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                      <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2, color: h.emision !== undefined ? 'var(--ink-2)' : undefined }}>
                        {h.emision !== undefined ? 'Esta hoja no se consulta: se emite' : 'Aquí no hay hoja que dibujar'}
                      </strong>
                      {h.sinLectura}
                    </span>
                  </div>
                )}

                {/* ── El acto: la constancia libre de infracciones ──────────
                    Es la única hoja del carril que se PIDE aquí, y numera. Los
                    cinco campos son los cinco de `PeticionDeConstanciaLibre`
                    que esta pantalla puede resolver; ninguno más, porque el
                    cuerpo es lista blanca del lado del servidor y un campo de
                    más aquí sería un campo que se teclea y no viaja (#331). */}
                {h.k === 'constancia_libre' && (
                  <>
                    <section style={TARJETA}>
                      <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                        <h2 style={H2}>Emitir la constancia</h2>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>
                          POST /api/v1/transito/constancias-libres
                        </code>
                      </div>
                      <p style={{ margin: 0, padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                        {h.emision}
                      </p>
                      <RejillaDeCampos style={{ borderTop: '1px solid var(--line)' }}>
                        <CampoForm
                          f={{ k: 'cl_placa', l: 'Placa', t: 'text', ph: 'NB-21169', ayuda: 'Obligatoria. Es sobre lo que se acredita, y el vehículo no tiene por qué estar en el padrón.' }}
                          valor={val('cl_placa')}
                          set={set}
                        />
                        {/* Sin valor por omisión, y a propósito: el día al que
                            se acredita es lo que el papel afirma, y el servidor
                            lo daría por hoy si llegara en blanco. Rellenarlo
                            con el reloj del navegador —o dejar que lo ponga el
                            del servidor— es que ese día no lo haya elegido
                            nadie, que es el defecto de #24 y #54. */}
                        <CampoForm
                          f={{ k: 'cl_verificadaAl', l: 'Verificada al', t: 'date', ayuda: 'Obligatoria, y NO es la fecha de emisión: es el día al que se acredita. El papel imprime las dos.' }}
                          valor={val('cl_verificadaAl')}
                          set={set}
                        />
                        <CampoForm
                          f={{ k: 'cl_solicitante', l: 'Solicitante', t: 'text', ph: 'Nombre de quien la pide', ayuda: 'Opcional: el servidor lo admite en blanco, y entonces el papel sale con ese renglón vacío.' }}
                          valor={val('cl_solicitante')}
                          set={set}
                        />
                        {/* Los tres de `FormatoDeDocumento`, leídos de donde se
                            declaran: escribirlos aquí a mano dejaría la lista
                            vieja en silencio el día que el backend cambie. */}
                        <CampoForm
                          f={{ k: 'cl_formato', l: 'Formato del papel', t: 'sel', o: [...FORMATOS_DE_DOCUMENTO], ayuda: 'Los tres que el servidor admite. Cualquier otro lo rechaza con 422.' }}
                          valor={val('cl_formato', 'PDF')}
                          set={set}
                        />
                        <CampoForm
                          f={{ k: 'cl_obs', l: 'Observación', t: 'area', ancho: true, ph: 'Por qué se emite', ayuda: 'Obligatoria: toda modificación se guarda con el motivo de quien la hace. De 5 a 500 caracteres.' }}
                          valor={val('cl_obs')}
                          set={set}
                        />
                      </RejillaDeCampos>
                      <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                        El cuerpo lleva exactamente estos cinco campos. Los otros dos que el servidor declara —el identificador del
                        vehículo y el de quien la pide— no viajan: son opcionales, no deciden nada (la comprobación va por la placa) y
                        aquí no hay con qué resolverlos; mandarlos adivinados ataría la constancia a otro vehículo o a otra persona en la
                        fila que queda guardada, y eso no se ve en el papel.
                      </p>
                    </section>

                    {constanciaEmitida !== null && (
                      <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}>
                        {/* El número se enseña porque el archivo se lo lleva:
                            el navegador renombra el fichero si ya existe y la
                            barra de descargas se va sola, y un papel numerado
                            del que no se sabe el número no se puede reclamar
                            después. Si el servidor no mandó la cabecera se dice
                            «—» y dónde buscarlo, en vez de inventar uno. */}
                        <strong style={{ fontSize: 12.5 }}>
                          Constancia {constanciaEmitida.numero ?? SIN_DATO} emitida para {constanciaEmitida.placa}
                        </strong>
                        <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                          Acredita que al {constanciaEmitida.verificadaAl} el vehículo no registra papeletas de tránsito pendientes de
                          pago, y sólo a ese día. El archivo se ha descargado
                          {constanciaEmitida.archivo === '' ? '.' : ` como «${constanciaEmitida.archivo}».`}
                          {constanciaEmitida.numero === null &&
                            ' El servidor no devolvió el número en la cabecera: el de esta constancia se busca en «Relación de constancias emitidas».'}
                        </span>
                      </div>
                    )}

                    {falloConstancia && (
                      <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 14px', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
                        <strong style={{ fontSize: 12.5 }}>
                          {falloConstancia.codigo === 'CONFLICTO'
                            ? `No se emite: ${clPlaca} registra papeletas pendientes`
                            : tituloDelFallo(falloConstancia, 'la constancia')}
                        </strong>
                        <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{falloConstancia.mensaje}</span>
                        {/* El 409 NO es un error opaco: trae en `detalles` los
                            números de hasta veinte papeletas, y eso es lo que
                            quien vino a por la constancia necesita saber —qué
                            tiene que pagar—. Dejarlo en el mensaje suelto lo
                            manda a otra ventanilla a preguntar lo que este
                            mismo servidor acaba de contestar. */}
                        {falloConstancia.detalles !== undefined && falloConstancia.detalles.length > 0 && (
                          <>
                            <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.8 }}>
                              Papeletas que lo impiden
                            </span>
                            <ul style={{ margin: 0, paddingLeft: 18, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {falloConstancia.detalles.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p id="cl-motivo" style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {faltaDeLaConstancia ??
                          (confirmandoConstancia
                            ? 'Se numerará la constancia, quedará asentada en la bitácora y se descargará el papel. Aquí no se anula un documento emitido: vuelve a pulsar para confirmar.'
                            : 'Emitir numera un documento oficial y es irreversible. Se confirma antes de mandar.')}
                      </p>
                      <button
                        onClick={() => void emitirConstancia()}
                        disabled={!puedeEmitirConstancia}
                        title={faltaDeLaConstancia}
                        aria-describedby="cl-motivo"
                        className={puedeEmitirConstancia ? 'hov-acento-2' : undefined}
                        style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: puedeEmitirConstancia ? 'pointer' : 'not-allowed', opacity: puedeEmitirConstancia ? 1 : 0.5 }}
                      >
                        {emitiendoConstancia ? 'Emitiendo…' : confirmandoConstancia ? 'Sí: emitir la constancia' : 'Emitir la constancia'}
                      </button>
                    </div>
                  </>
                )}

                {!h.sinLectura && faltaCriterio && (
                  <Vacio titulo="Falta el criterio que este reporte exige">
                    {h.k === 'record_conductor'
                      ? 'Teclea la licencia de conducir o el documento del infractor: sin uno de los dos esto sería el padrón entero con otro título, y el servidor lo rechaza.'
                      : h.k === 'record_vehicular'
                        ? 'Teclea la placa: sin ella el servidor rechaza la petición, por el mismo motivo.'
                        : 'Teclea el número de la papeleta.'}
                  </Vacio>
                )}

                {reporteActivo && (
                  <Lectura
                    estado={reporte}
                    que="el reporte"
                    acceso={ACCESO_DEL_REPORTE[h.k] ?? 'transito_reportes'}
                    ruta={RUTA_DEL_REPORTE[h.k] ?? ''}
                    vacio={<Vacio titulo="Sin datos">El servidor no devolvió nada.</Vacio>}
                  >
                    {(r) => (
                      <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '32px 34px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 11, borderBottom: '2px solid var(--ink)' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600 }}>{pref.entidad}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-3)' }}>Sub Gerencia de Tránsito y Seguridad Vial</p>
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                            <p style={{ margin: 0 }}>{RUTA_DEL_REPORTE[h.k]}</p>
                            <p style={{ margin: '3px 0 0' }}>{r.aLaFecha}</p>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 22, textAlign: 'center' }}>
                          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, letterSpacing: '-.01em' }}>{h.label}</h2>
                          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{h.sub}</p>
                        </div>
                        {r.meta.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px 18px', margin: '20px 0', padding: '14px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                            {r.meta.map((m) => (
                              <div key={m[0]}>
                                <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{m[0]}</p>
                                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink)' }}>{m[1]}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.filas.length === 0 ? (
                          <p style={{ margin: '18px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                            Sin filas en el periodo consultado.
                          </p>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {r.cols.map((cc) => (
                                    <th key={cc[0]} style={cc[1] ? RTHN : RTH}>
                                      {cc[0]}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {r.filas.map((f, i) => (
                                  <tr key={f[0] + '|' + i} style={{ borderTop: '1px solid var(--line)' }}>
                                    {f.map((cell, j) => (
                                      <td key={j} style={r.cols[j] && r.cols[j][1] ? RTDN : RTD}>
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <p style={{ margin: '18px 0 0', fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>{h.cierre}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginTop: 44 }}>
                          <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Responsable de tránsito</div>
                          <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
                        </div>
                      </section>
                    )}
                  </Lectura>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ══════════ El centro de reportes, contra las rutas de verdad ══════════ */

/** La hoja ya resuelta: su cabecera, sus columnas y sus filas. */
type HojaResuelta = { aLaFecha: string; meta: [string, string][]; cols: Columna[]; filas: Fila[] };

const RUTA_DEL_REPORTE: Record<string, string> = {
  record_conductor: 'GET /api/v1/transito/reportes/record-conductor',
  record_vehicular: 'GET /api/v1/transito/reportes/record-vehicular',
  padron_constancias: 'GET /api/v1/transito/reportes/padron-constancias',
  padron: 'GET /api/v1/transito/reportes/padron',
  padron_coactiva: 'GET /api/v1/transito/reportes/padron-coactiva',
  estado_cuenta: 'GET /api/v1/transito/estado-cuenta',
  hoja_papeleta: 'GET /api/v1/transito/papeletas/{numero}/hoja-informativa',
  actos: 'GET /api/v1/transito/papeletas/{numero}/actos',
  resumen_recaudacion: 'GET /api/v1/transito/reportes/resumen-recaudacion',
  resumen_papeletas: 'GET /api/v1/transito/reportes/resumen-papeletas',
  resumen_codigo: 'GET /api/v1/transito/reportes/resumen-por-codigo',
  resumen_placa: 'GET /api/v1/transito/reportes/resumen-por-placa',
};

const ACCESO_DEL_REPORTE: Record<string, string> = {
  record_conductor: 'transito_record_conductor',
  record_vehicular: 'transito_record_vehicular',
  padron_constancias: 'transito_padron_constancias',
  padron: 'transito_padron',
  padron_coactiva: 'transito_padron_coactiva',
  estado_cuenta: 'transito_estado_cuenta',
  hoja_papeleta: 'transito_papeleta_reporte',
  actos: 'transito_documentos',
  resumen_recaudacion: 'transito_resumen_recaudacion',
  resumen_papeletas: 'transito_resumen_papeletas',
  resumen_codigo: 'transito_resumen_codigo',
  resumen_placa: 'transito_resumen_placa',
};

const COLS_DEL_PADRON: Columna[] = [
  ['Papeleta', 0], ['Fecha', 0], ['Placa', 0], ['Código', 0], ['Obligado', 0], ['Importe S/', 1], ['Estado', 0], ['Valor', 0],
];

const COLS_DEL_RESUMEN: Columna[] = [
  ['Clave', 0], ['Descripción', 0], ['Año', 0], ['Papeletas', 1], ['Importe S/', 1],
  ['Pagadas', 1], ['Pendientes', 1], ['En coactiva', 1],
];

/** Los importes viajan como texto y salen como texto: no se reformatean. */
function filasDelPadron(filas: { numero: string; fechaInfraccion: string; placa: string | null; codigoInfraccion: string; obligadoNombre: string | null; importeAPagar: string; estado: string; valorNumero: string | null }[]): Fila[] {
  return filas.map((r) => [
    r.numero,
    r.fechaInfraccion,
    r.placa ?? SIN_DATO,
    r.codigoInfraccion,
    r.obligadoNombre ?? SIN_DATO,
    r.importeAPagar,
    rotuloDeEstado(r.estado),
    r.valorNumero ?? SIN_DATO,
  ]);
}

/**
 * Los criterios que ESTE reporte manda, en un solo sitio.
 *
 * Existe para que la hoja de la pantalla y el archivo que se descarga no puedan
 * llevar filtros distintos. Escrito dos veces —una en la lectura y otra en la
 * descarga— el defecto no falla en voz alta: el PDF sale, se ve bien, y dice
 * otra cosa que lo que está en pantalla; nadie compara un archivo que ya se
 * llevó el contribuyente. Aquí las dos leen el MISMO objeto.
 *
 * Los vacíos se van como `undefined`: `descargar()` y `solicitar()` no mandan un
 * parámetro vacío, y un `estado=` en blanco es 422 en el servidor.
 */
function criteriosDelReporte(k: string, c: (llave: string) => string): Record<string, string | undefined> {
  const v = (llave: string) => c(llave) || undefined;
  switch (k) {
    case 'record_conductor':
      return { licencia: v('licencia'), documento: v('documento') };
    case 'record_vehicular':
      return { placa: c('placa') };
    case 'padron':
      return { desde: v('desde'), hasta: v('hasta'), estado: v('estado') };
    /* Sin `ejecutor` ni `estadoDelExpediente`: el contrato los declara y el
       backend los rechaza con 422 —viven en el expediente coactivo—. */
    case 'padron_coactiva':
      return { desde: v('desde'), hasta: v('hasta') };
    case 'padron_constancias':
      return { desde: v('desde'), hasta: v('hasta'), nDeConstancia: v('nDeConstancia'), usuarioQueEmitio: v('usuarioQueEmitio') };
    case 'estado_cuenta':
      return { conductor: v('conductor'), placa: v('placa') };
    case 'resumen_recaudacion':
      return { ano: v('ano') };
    case 'resumen_papeletas':
      return { desde: v('desde'), hasta: v('hasta'), agrupadoPor: v('agrupadoPor') };
    case 'resumen_codigo':
      return { codigoDeInfraccion: v('codigoDeInfraccion'), desde: v('desde'), hasta: v('hasta'), estado: v('estado') };
    case 'resumen_placa':
      return { iniciales2Letras: v('iniciales2Letras'), desde: v('desde'), hasta: v('hasta'), estado: v('estado') };
    default:
      return {};
  }
}

/**
 * Pide la hoja elegida a la ruta que le toca y la devuelve ya en filas.
 *
 * Cada reporte tiene su propia forma de respuesta —un sobre paginado, un
 * resumen suelto, un expediente— y por eso el mapeo vive aquí y no en un
 * componente genérico que tendría que adivinarlo.
 */
async function pedirReporte(
  k: string,
  c: (llave: string) => string,
  senal: AbortSignal,
): Promise<HojaResuelta> {
  const cr = criteriosDelReporte(k, c);
  const estado = cr.estado as EstadoDePapeleta | undefined;
  const pag = { tamano: 50 };

  if (k === 'record_conductor' || k === 'record_vehicular' || k === 'padron' || k === 'padron_coactiva') {
    const p =
      k === 'record_conductor'
        ? await recordDeConductor(cr, pag, senal)
        : k === 'record_vehicular'
          ? await recordVehicular(cr.placa ?? '', pag, senal)
          : k === 'padron'
            ? await padronDePapeletas({ ...cr, estado }, pag, senal)
            : await padronCoactiva(cr, pag, senal);
    return {
      aLaFecha: p.contenido[0]?.actualizadoA ?? '',
      meta: [
        ['Papeletas', miles(p.totalElementos)],
        ['En esta hoja', String(p.contenido.length)],
      ],
      cols: COLS_DEL_PADRON,
      filas: filasDelPadron(p.contenido),
    };
  }

  if (k === 'padron_constancias') {
    const p = await padronDeConstancias(cr, pag, senal);
    return {
      aLaFecha: '',
      meta: [['Emitidas', miles(p.totalElementos)]],
      cols: [['Nº constancia', 0], ['Placa', 0], ['Verificada al', 0], ['Emitida el', 0], ['Usuario', 0]],
      filas: p.contenido.map((x) => [x.numero, x.placa, x.verificadaAl, x.fechaEmision, x.usuarioQueEmitio ?? SIN_DATO]),
    };
  }

  if (k === 'estado_cuenta') {
    const p = await estadoDeCuenta(cr, pag, senal);
    return {
      aLaFecha: '',
      meta: [['Papeletas pendientes', miles(p.totalElementos)]],
      cols: [['Papeleta', 0], ['Fecha', 0], ['Placa', 0], ['Importe S/', 1], ['A pagar S/', 1], ['Con beneficio S/', 1], ['Estado', 0]],
      filas: p.contenido.map((x) => [
        x.numero,
        x.fechaInfraccion,
        x.placa ?? SIN_DATO,
        x.importeInfraccion,
        x.importeAPagar,
        x.importeConBeneficio ?? SIN_DATO,
        rotuloDeEstado(x.estado),
      ]),
    };
  }

  if (k === 'hoja_papeleta') {
    const x = await hojaInformativa(c('papeleta'), senal);
    return {
      aLaFecha: x.emitidaEl,
      meta: [
        ['Papeleta', x.numero],
        ['Placa', x.placa ?? SIN_DATO],
        ['Obligado', x.obligadoNombre ?? SIN_DATO],
        ['Código', x.codigoInfraccion ?? SIN_DATO],
      ],
      cols: [['Concepto', 0], ['Detalle', 0], ['Importe S/', 1]],
      filas: [
        ['Base imponible', x.descripcionInfraccion ?? SIN_DATO, x.baseImponible],
        ['Infracción', x.porcentajeInfraccion + ' % de la base', x.importeInfraccion],
        ['A cobrar', x.porcentajeACobrar + ' % del importe', x.importeAPagar],
        ['Con beneficio', 'beneficio vigente al registrar el acta', x.importeConBeneficio ?? SIN_DATO],
      ],
    };
  }

  if (k === 'actos') {
    const e = await expedienteDeLaPapeleta(c('papeleta'), senal);
    const filas: Fila[] = [];
    for (const a of e.actos) {
      filas.push([a.numero, a.clase + ' · ' + a.tipo, a.fecha, 'emitido', SIN_DATO]);
      for (const ac of a.acuses) {
        filas.push([a.numero, 'Diligencia ' + ac.intento + ' · ' + ac.modalidad, ac.fecha, ac.resultado, ac.exigibleDesde ?? SIN_DATO]);
      }
    }
    for (const d of e.descargos) {
      filas.push([d.nDeExpediente, 'Recurso · ' + d.tipoDeRecurso, d.fecha, d.enPlazo ? 'EN PLAZO' : 'FUERA DE PLAZO', d.presentadoHasta]);
    }
    return {
      aLaFecha: '',
      meta: [
        ['Papeleta', e.papeleta],
        ['Estado', rotuloDeEstado(e.estado)],
        ['Actos', String(e.actos.length)],
        ['Recursos', String(e.descargos.length)],
      ],
      cols: [['Documento', 0], ['Acto', 0], ['Fecha', 0], ['Resultado', 0], ['Exigible desde', 0]],
      filas,
    };
  }

  if (k === 'resumen_recaudacion') {
    const r = await resumenDeRecaudacion(cr.ano === undefined ? undefined : Number(cr.ano), senal);
    return {
      aLaFecha: r.actualizadoA,
      meta: [
        ['Periodo', `${r.desde} — ${r.hasta}`],
        ['Recaudado', 'S/ ' + r.total],
        ['Abonos', miles(r.abonos)],
      ],
      cols: [['Mes', 0], ['Fases', 0], ['Abonos', 1], ['Total del mes S/', 1]],
      /* El total del mes lo suma el SERVIDOR y viene en `porMes`. Recomponerlo
         aquí sumando las fases es lo que RNF-083 prohíbe. */
      filas: r.porMes.map((m) => [
        MESES[m.mes] ?? String(m.mes),
        m.porFase.map((f) => `${f.fase} ${f.recaudado}`).join(' · '),
        miles(m.abonos),
        m.total,
      ]),
    };
  }

  const r =
    k === 'resumen_codigo'
      ? await resumenPorCodigo({ ...cr, estado }, senal)
      : k === 'resumen_placa'
        ? await resumenPorPlaca({ ...cr, estado }, senal)
        : await resumenDePapeletas(
            { ...cr, agrupadoPor: cr.agrupadoPor as 'ANO' | 'MES' | 'ESTADO' | 'CODIGO' | 'PLACA' | undefined },
            senal,
          );
  return {
    aLaFecha: r.actualizadoA,
    meta: [
      ['Periodo', `${r.desde} — ${r.hasta}`],
      ['Agrupado por', r.agrupadoPor],
      ['Papeletas', miles(r.papeletas)],
      ['Importe de las actas', 'S/ ' + r.importeTotal],
    ],
    cols: COLS_DEL_RESUMEN,
    /* La clave de una línea agrupada por estado es el nombre del enumerado, y
       se lee con su rótulo; con cualquier otro agrupador la clave ya es lo que
       hay que enseñar —un código, dos letras de placa, un año— y no se toca. */
    filas: r.lineas.map((l) => [
      r.agrupadoPor === 'ESTADO' ? rotuloDeEstado(l.clave) : l.clave,
      l.descripcion ?? SIN_DATO,
      l.ano === null ? SIN_DATO : String(l.ano),
      miles(l.cantidad),
      l.importe,
      `${miles(l.pagadas)} · ${l.importeDeLasPagadas}`,
      `${miles(l.pendientes)} · ${l.importeDeLasPendientes}`,
      `${miles(l.enCoactiva)} · ${l.importeEnCoactiva}`,
    ]),
  };
}
