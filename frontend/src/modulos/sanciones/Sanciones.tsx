import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type Contexto, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { miles, usarPreferencias } from '../../shell/preferencias';
import {
  ACTOS,
  CAMPOS_DE_LA_CEDULA,
  CHIPS,
  COLS_CUIS,
  COLS_LISTA,
  CRITERIOS,
  FASES,
  HOJAS,
  MOTIVOS,
  OPCIONES,
  type CampoDeActo,
  type IdDeActo,
} from '../../datos/sanciones';
import { useRebote, useRecurso, type Estado } from '../../api/useRecurso';
import { Descargas, type FormatoDeDocumento } from '../../api/descarga';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { causasDelRechazo } from '../../api/Fallo';
import { cuentaActual, hayPuerta } from '../../api/sesion';
import {
  descargarPadronDeNotificaciones,
  descargarRecaudacionAdministrativa,
  descargarReporteAdministrativo,
  dictarResolucionAdministrativa,
  emitirReporteAdministrativo,
  estadoDeCuentaAdministrativo,
  generarValoresAdministrativos,
  listarActas,
  listarCuis,
  listarCuisComoReporte,
  notificacionesPorContribuyente,
  notificacionesVencidas,
  notificarResolucionAdministrativa,
  padronDeNotificaciones,
  recaudacionAdministrativa,
  registrarNotificacion,
  type EfectoSobreLaMulta,
  type EstadoDeNotificacion,
  type FaseDelProcedimiento,
  type ModalidadDeNotificacion,
  type ProcedimientoSancionador,
  type ResultadoDeNotificacion,
  type SentidoDelFallo,
  type AgrupacionDelResumen,
} from '../../api/sanciones';

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
const H2: CSSProperties = { margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 };
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

const SIN_DATO = '—';
const T_INFO = ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 8.2h.02', 'M11.2 11.4h1v5h-1z'];

function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiva|prescrita|vencida|constatada/.test(t)) return 'bad';
  if (/preventiva|emitida|sancionada|notificada/.test(t)) return 'warn';
  if (/pagada|subsanada|anulada/.test(t)) return 'ok';
  return 'neutro';
}

/** El rótulo de una fase. La misma palabra, con su acento. */
function rotuloDeFase(fase: string | null): string {
  if (fase === null) return SIN_DATO;
  const f = FASES.find((x) => x[0] === fase);
  return f ? f[1] : fase;
}

function Cabecera({ titulo, meta, acciones }: { titulo: string; meta?: ReactNode; acciones?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
      <h2 style={H2}>{titulo}</h2>
      {meta && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{meta}</span>}
      {acciones}
    </div>
  );
}

function Th({ defs }: { defs: [string, 0 | 1][] }) {
  return (
    <tr>
      {defs.map((c) => (
        <th key={c[0]} style={c[1] ? THN : TH}>
          {c[0]}
        </th>
      ))}
    </tr>
  );
}

/** Un campo del manual: el mismo control sirve a los actos y a los criterios. */
function Campo({
  f,
  valor,
  onCambio,
}: {
  f: CampoDeActo;
  valor: string | boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const t = f.t ?? 'text';
  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
        <span>{f.l}</span>
        {f.c && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '1px 4px' }}>{f.c}</span>
        )}
      </span>
      {t === 'text' && <input value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph ?? ''} style={IN} />}
      {t === 'date' && <input type="date" value={String(valor)} onChange={(e) => onCambio(e.target.value)} style={IN} />}
      {t === 'sel' && (
        <select value={String(valor)} onChange={(e) => onCambio(e.target.value)} style={IN}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o === '' ? '(sin declarar)' : o}
            </option>
          ))}
        </select>
      )}
      {t === 'area' && (
        <textarea
          value={String(valor)}
          onChange={(e) => onCambio(e.target.value)}
          rows={3}
          placeholder={f.ph ?? ''}
          style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
        />
      )}
      {t === 'chk' && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}>
          <input type="checkbox" checked={valor === true} onChange={(e) => onCambio(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
        </span>
      )}
      {t === 'ro' && (
        <span style={{ display: 'block', minHeight: 38, lineHeight: '19px', padding: '9px 10px', border: '1px dashed var(--line-2)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>
          {String(valor)}
        </span>
      )}
      {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
    </label>
  );
}

/* ══════════ Lo que el backend contesta, dicho en castellano ══════════ */

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
    case 'CONFLICTO':
      return 'El acto choca con algo que ya está registrado';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      /* No dice «no admite lo que se le mandó»: dictar una resolución de
         gerencia lee su plazo del conjunto sellado, y desde #562 eso contesta
         422 nombrando la llave en vez de un 500 opaco. Con aquel titular, quien
         atiende se pone a corregir un formulario que está bien. */
      return 'El servidor rechazó la operación';
    case 'SIN_RESPUESTA':
      return error.estado === 0 ? 'No se pudo contactar con el servidor' : 'El servidor contestó otra cosa';
    default:
      return `No se pudo consultar ${que}`;
  }
}

function explicacionDelFallo(error: ErrorDeApi | null, acceso: string): string {
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'Vuelve a entrar: el token caducó o no es de este emisor.';
    case 'SIN_PRIVILEGIO':
      return (
        `Hace falta el acceso «${acceso}». Que Keycloak la deje entrar no basta: la cuenta tiene que estar además dada de alta ` +
        'en esta municipalidad, y el permiso lo concede Seguridad.'
      );
    case 'SIN_MUNICIPALIDAD':
      return 'No hay valor por omisión: sin municipalidad en el token no hay padrón que consultar.';
    case 'NO_ENCONTRADO':
    case 'CONFLICTO':
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return error?.mensaje ?? 'Revisa los criterios.';
    case 'SIN_RESPUESTA':
      return error.estado === 0 ? 'El servidor no contestó. Puede estar apagado o no alcanzable desde aquí.' : error.mensaje;
    default:
      return 'La consulta falló en el servidor.';
  }
}

/** Los cuatro estados de una lectura, dibujados una sola vez. */
function Lectura<T>({
  estado,
  que,
  acceso,
  ruta,
  children,
}: {
  estado: Estado<T>;
  que: string;
  acceso: string;
  ruta: string;
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
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>{tituloDelFallo(e, que)}</p>
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
  if (estado.datos === null) return null;
  return <>{children(estado.datos)}</>;
}

function Vacio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" style={{ color: 'var(--ink-4)' }}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4.3-4.3" />
      </svg>
      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{titulo}</p>
      <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>{children}</p>
    </section>
  );
}

function Paginas({ pagina, totalPaginas, hayMas, ir }: { pagina: number; totalPaginas: number; hayMas: boolean; ir: (n: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
      <button onClick={() => ir(Math.max(0, pagina - 1))} disabled={pagina === 0} className="hov-linea" style={{ ...BOTON_LINEA, opacity: pagina === 0 ? 0.45 : 1, cursor: pagina === 0 ? 'not-allowed' : 'pointer' }}>
        Anterior
      </button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
        {pagina + 1} de {totalPaginas}
      </span>
      <button onClick={() => ir(pagina + 1)} disabled={!hayMas} className="hov-linea" style={{ ...BOTON_LINEA, opacity: hayMas ? 1 : 0.45, cursor: hayMas ? 'pointer' : 'not-allowed' }}>
        Siguiente
      </button>
    </div>
  );
}

function cifra(e: { datos: { totalElementos: number } | null; cargando: boolean; error: unknown }): string {
  if (e.cargando) return '…';
  if (e.error || !e.datos) return SIN_DATO;
  return miles(e.datos.totalElementos);
}

const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Infracciones administrativas: un procedimiento de tres actos en orden legal.
 *
 * El orden no lo impone una validación al pulsar «Guardar»: lo impone la fase
 * que el backend DERIVA de tres hechos ya escritos —el estado de la papeleta,
 * si hay resolución de gerencia y si la notificación previa sigue abierta—.
 * La pantalla la lee y no la recalcula.
 */
export default function Sanciones({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const anio = Number(pref.ejercicio);

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [abierto, setAbierto] = useState<ProcedimientoSancionador | null>(null);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('Todas');
  const [pagina, setPagina] = useState(0);
  const [cuisQ, setCuisQ] = useState('');
  const [paginaCuis, setPaginaCuis] = useState(0);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [falloDelActo, setFalloDelActo] = useState<ErrorDeApi | null>(null);
  const [hechoDelActo, setHechoDelActo] = useState('');
  const [contado, setContado] = useState<Record<string, string>>({});

  const val = (k: string, d: string | boolean = ''): string | boolean => (vals[k] !== undefined ? vals[k] : d);
  const texto = (k: string, d = '') => String(val(k, d));
  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setFalloDelActo(null);
    setHechoDelActo('');
  };

  /* «Nueva notificación» no es una pantalla aparte: es el primer acto del mismo
     procedimiento, y es el ÚNICO de los tres que hoy tiene puerta. */
  const esExpediente = dest === 'expediente' || dest === 'alta' || (dest === 'lista' && abierto !== null);
  const criterio = useRebote(q.trim());
  useEffect(() => setPagina(0), [criterio, chip]);
  const criterioCuis = useRebote(cuisQ.trim());
  useEffect(() => setPaginaCuis(0), [criterioCuis]);

  const irDest = (k: string) => {
    setAbierto(null);
    onDest(k);
  };

  /* ── El panel ────────────────────────────────────────────────
     Una cuenta por fase, con el filtro que el propio listado admite. Ninguna
     cifra se compone aquí. */
  const enPanel = dest === 'panel';
  const preventivas = useRecurso((s) => listarActas({ estado: 'PREVENTIVA' }, { tamano: 1 }, s), [], enPanel);
  const constatadas = useRecurso((s) => listarActas({ estado: 'CONSTATADA' }, { tamano: 1 }, s), [], enPanel);
  /* Los tres censos que corrigen las notas del panel de destinos van SIEMPRE, no
     solo en el panel: entrando por la URL a otro destino, la nota volvería a la
     cifra del prototipo —«812 del ejercicio»— al lado de la tabla que dice que
     no hay ninguna. Es una petición de una fila por censo. */
  const sancionadas = useRecurso((s) => listarActas({ estado: 'SANCIONADA' }, { tamano: 1 }, s), [], true);
  const pagadasFase = useRecurso((s) => listarActas({ estado: 'PAGADA' }, { tamano: 1 }, s), [], enPanel);
  const coactivas = useRecurso((s) => listarActas({ estado: 'COACTIVA' }, { tamano: 1 }, s), [], enPanel);
  const conteosPorFase = [preventivas, constatadas, sancionadas, pagadasFase, coactivas];
  const todasLasActas = useRecurso((s) => listarActas({}, { tamano: 1 }, s), [], true);
  const vencidas = useRecurso((s) => notificacionesVencidas({}, { tamano: 1 }, s), [], enPanel);
  const cuisCenso = useRecurso((s) => listarCuis({}, { tamano: 1 }, s), [], true);
  const recaudado = useRecurso((s) => recaudacionAdministrativa(anio, s), [anio], enPanel);

  /* ── La lista de procedimientos ──────────────────────────────
     El buscador va contra «administrado», que es lo que se teclea en
     ventanilla; el número de acta y el CUIS son otros dos filtros del mismo
     endpoint y se ofrecen aparte. */
  const filtro = useMemo(
    () => ({
      administrado: criterio || undefined,
      estado: chip === 'Todas' ? undefined : (chip as FaseDelProcedimiento),
    }),
    [criterio, chip],
  );
  const lista = useRecurso(
    (s) => listarActas(filtro, { pagina, tamano: 20 }, s),
    [filtro, pagina],
    dest === 'lista' && abierto === null,
  );

  /* ── El cuadro CUIS ─────────────────────────────────────────── */
  const cuis = useRecurso(
    (s) => listarCuis({ materia: criterioCuis || undefined }, { pagina: paginaCuis, tamano: 20 }, s),
    [criterioCuis, paginaCuis],
    dest === 'cuis',
  );

  /* ── Los candidatos de la generación de valores ──────────────
     Las multas sancionadas son las que un valor puede alcanzar. La corrida se
     registra por rango; la lista está aquí para saber sobre qué se va a
     trabajar, no para marcarla —el cuerpo admite marcar, pero marcar y el
     rango se excluyen y el rango es lo que el manual pide—. */
  const candidatos = useRecurso(
    (s) => listarActas({ estado: 'SANCIONADA' }, { tamano: 20 }, s),
    [],
    dest === 'valores',
  );

  /* ── El centro de reportes ───────────────────────────────────── */
  const h = HOJAS[Math.min(hojaIdx, HOJAS.length - 1)];
  const c = (k: string) => texto('rep_' + k, CRITERIOS[k]?.v ?? '');
  const llavesDelReporte = [h.k, c('desde'), c('hasta'), c('estadoNotificacion'), c('vencidasAl'), c('fiscalizador'), c('infraccion'), c('conPapeleta'), c('codContribuyente'), c('ano'), c('soloPendientes'), c('papeleta'), c('codigo'), c('descripcionContiene'), c('agrupadoPor')];
  const reporte = useRecurso((s) => pedirReporte(h.k, c, s), llavesDelReporte, dest === 'reportes');

  /* ── El mismo reporte, como documento ────────────────────────
     Tres de las siete hojas lo sirven; las otras cuatro no declaran `?formato`
     y devolverían el JSON de siempre. `descargarReporteAdministrativo` es un
     POST —el tipo de reporte y el formato van en el cuerpo— y los otros dos son
     GET con `?formato`. */
  const criteriosDelDocumento = criteriosDescargables(h.k, c);
  const traerDocumento =
    criteriosDelDocumento === null
      ? null
      : (f: FormatoDeDocumento) =>
          h.k === 'padron_notificaciones'
            ? descargarPadronDeNotificaciones(criteriosDelDocumento, f)
            : h.k === 'resumen_recaudacion'
              ? descargarRecaudacionAdministrativa(criteriosDelDocumento.ano, f)
              : descargarReporteAdministrativo(
                  { reporte: 'RESUMEN_PAPELETAS', ...criteriosDelDocumento, agrupadoPor: criteriosDelDocumento.agrupadoPor as AgrupacionDelResumen | undefined },
                  f,
                );

  /* ── El estado de los tres actos ─────────────────────────────
     Sale de la FASE que el backend derivó, no de si hay algo tecleado. Un
     procedimiento sin abrir —«Nueva notificación»— empieza en el primero. */
  const fase = abierto?.fase ?? null;
  const estados: Record<IdDeActo, 'hecho' | 'actual' | 'bloqueado' | 'espera'> =
    abierto === null
      ? { notificacion: 'actual', sancion: 'bloqueado', resolucion: 'bloqueado' }
      : {
          notificacion: fase === null || fase === 'PREVENTIVA' ? 'actual' : 'hecho',
          sancion: fase === 'PREVENTIVA' ? 'espera' : fase === 'CONSTATADA' ? 'actual' : fase === null ? 'bloqueado' : 'hecho',
          resolucion: fase === 'CONSTATADA' ? 'actual' : fase === 'SANCIONADA' || fase === 'PAGADA' || fase === 'COACTIVA' ? 'hecho' : 'bloqueado',
        };
  const actoActual = ACTOS.map((a, i) => ({ a, i })).find((x) => estados[x.a.id] === 'actual');

  /* ── Las dos escrituras que la pantalla puede componer ───────── */
  const obs = texto('obs').trim();
  const faltaObservacion = obs.length < 5;
  /* El número que se guarda es UNO: la serie y el número compuestos con el
     guion que el propio manual imprime en su columna «Serie-Nº». */
  const numeroCompuesto = texto('serie').trim() === '' ? texto('numeroN').trim() : texto('serie').trim() + '-' + texto('numeroN').trim();

  const faltanDeLaNotificacion = [
    texto('serie').trim() === '' || texto('numeroN').trim() === '' ? 'el número' : '',
    texto('fechaN') === '' ? 'la fecha' : '',
    texto('dirN').trim() === '' ? 'la dirección' : '',
    texto('motivoN').trim() === '' ? 'el motivo' : '',
  ].filter((x) => x !== '');
  const faltanDeLaResolucion = [
    texto('papR').trim() === '' ? 'el acta' : '',
    texto('fechaR') === '' ? 'la fecha' : '',
    texto('sustentoR').trim() === '' ? 'el sustento' : '',
  ].filter((x) => x !== '');
  const faltanDeLaCedula = [
    texto('cedResolucion').trim() === '' ? 'la resolución' : '',
    texto('cedFecha') === '' ? 'la fecha' : '',
    texto('cedNotificador').trim() === '' ? 'el notificador' : '',
  ].filter((x) => x !== '');

  const enteroOUndefined = (k: string): number | undefined => {
    const t = texto(k).trim();
    /* Un entero es entero entero: `parseInt` se queda con el prefijo y «12a»
       viajaría como 12 sin que nadie lo dijera. */
    if (t === '' || !/^\d+$/.test(t)) return undefined;
    return Number(t);
  };

  const registrarLaNotificacion = async () => {
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      const r = await registrarNotificacion({
        observacion: obs,
        numero: numeroCompuesto,
        fecha: texto('fechaN'),
        direccion: texto('dirN').trim(),
        motivo: texto('motivoN').trim(),
        contribuyenteId: enteroOUndefined('contribN'),
        predioId: enteroOUndefined('predioN'),
        plazoDias: enteroOUndefined('plazoN'),
      });
      setHechoDelActo(
        `Notificación ${r.numero} registrada el ${r.fecha}, en estado ${r.estado}. ` +
          (r.vencimiento ? `Vence el ${r.vencimiento}.` : 'Sin plazo declarado: no vence nunca, y eso es una decisión del acto.'),
      );
      toast('Notificación registrada.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

  const dictarLaResolucion = async () => {
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      const r = await dictarResolucionAdministrativa({
        observacion: obs,
        papeleta: texto('papR').trim(),
        fecha: texto('fechaR'),
        sustento: texto('sustentoR').trim(),
        nDeExpediente: texto('expR').trim() || undefined,
        sentidoDelFallo: (texto('sentidoR') || undefined) as SentidoDelFallo | undefined,
        efectoSobreLaMulta: (texto('efectoR') || undefined) as EfectoSobreLaMulta | undefined,
        sancionAccesoria: texto('accesoriaR').trim() || undefined,
        proyectarDeudaAl: texto('proyR') || undefined,
      });
      setHechoDelActo(
        `Resolución ${r.numero} dictada sobre ${r.papeleta}. ` +
          (r.deuda ? `Deuda proyectada S/ ${r.deuda.importe} al ${r.deuda.actualizadoA}. ` : '') +
          (r.asientosDeBaja > 0 ? `${r.asientosDeBaja} asientos de baja. ` : '') +
          `Documento ${r.nombreDeArchivo} (${r.formato}), resumen ${r.resumen.slice(0, 12)}…`,
      );
      toast('Resolución dictada.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

  const notificarLaResolucion = async () => {
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      const r = await notificarResolucionAdministrativa(texto('cedResolucion').trim(), {
        observacion: obs,
        fechaDeNotificacion: texto('cedFecha'),
        modalidad: texto('cedModalidad', 'PERSONAL') as ModalidadDeNotificacion,
        resultado: texto('cedResultado', 'NOTIFICADO') as ResultadoDeNotificacion,
        notificador: texto('cedNotificador').trim(),
        direccion: texto('cedDireccion').trim() || undefined,
        recibidoPor: texto('cedRecibio').trim() || undefined,
        documentoDelReceptor: texto('cedDocReceptor').trim() || undefined,
        vinculo: texto('cedVinculo').trim() || undefined,
        acuse: texto('cedAcuse').trim() || undefined,
      });
      setHechoDelActo(
        `Diligencia ${r.intento} de ${r.resolucion} el ${r.fechaDeNotificacion}: ${r.resultado}. ` +
          (r.exigibleDesde ? `La deuda es exigible desde el ${r.exigibleDesde}.` : 'No abre plazo: la diligencia no surtió efecto.'),
      );
      toast('Diligencia registrada.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

    /* El motivo del acto, en un solo sitio: lo lee el parrafo de al lado y lo
     lleva el `title` del boton. Con dos copias, arreglar una y no la otra deja
     al boton diciendo algo distinto de lo que se ve. */
  const motivoDeLaCorrida = faltaObservacion
    ? 'Falta la observación: sin ella el servidor no guarda nada.'
    : texto('valDesde') === '' || texto('valHasta') === ''
      ? 'Faltan las dos fechas del rango: el servidor exige exactamente uno de los dos caminos, y este es el del rango.'
      : 'Registrar la corrida no emite ningún valor todavía.';
  const registrarLaCorrida = async () => {
    setEnviando(true);
    setFalloDelActo(null);
    setHechoDelActo('');
    try {
      const r = await generarValoresAdministrativos({
        observacion: obs,
        desde: texto('valDesde'),
        hasta: texto('valHasta'),
        fechaCriterio: texto('valCriterio') || undefined,
      });
      setHechoDelActo(
        `Corrida ${r.id} registrada por ${r.origen.toLowerCase()}: ${r.totalCandidatos} candidatos entre ${r.desde} y ${r.hasta}. ` +
          'Todavía no se ha emitido ningún valor.',
      );
      toast('Corrida registrada.');
    } catch (fallo) {
      setFalloDelActo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  };

  /* ── Ruta y contexto ─────────────────────────────────────────── */
  useEffect(() => {
    /* La nota la fija el CENSO, no el listado filtrado: con un filtro puesto el
       listado cuenta otra cosa, y la nota diría menos actas de las que hay. */
    if (todasLasActas.datos) setContado((x) => ({ ...x, lista: miles(todasLasActas.datos!.totalElementos) + ' del ejercicio' }));
  }, [todasLasActas.datos]);
  useEffect(() => {
    if (cuisCenso.datos) setContado((x) => ({ ...x, cuis: miles(cuisCenso.datos!.totalElementos) + ' tipificadas' }));
  }, [cuisCenso.datos]);
  useEffect(() => {
    if (sancionadas.datos) setContado((x) => ({ ...x, valores: miles(sancionadas.datos!.totalElementos) + ' sancionadas por cobrar' }));
  }, [sancionadas.datos]);
  const notasDeDestino: Record<string, string> = {
    ...contado,
    reportes: HOJAS.length + ' reportes, todos con lectura',
  };

  const destinos = moduloDe('sanciones').destinos;
  const etiquetaDeDestino = destinos.find((x) => x.k === dest)?.label ?? 'Infracciones administrativas';
  const miga = esExpediente
    ? ['Infracciones', 'Expedientes', abierto ? abierto.numeroActa : 'Nuevo']
    : ['Infracciones', etiquetaDeDestino];
  const titulo = esExpediente ? (abierto ? `Expediente ${abierto.numeroActa}` : 'Notificación preventiva nueva') : etiquetaDeDestino;

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({ label: o[0], nota: 'Infracciones', ir: () => irDest(o[1]) }));

  const contexto: Contexto | undefined = esExpediente
    ? {
        volver: { label: 'Expedientes', onClick: () => irDest('lista') },
        codigo: abierto ? abierto.numeroActa : 'Sin número',
        titular: abierto ? (abierto.administrado ?? 'Sin administrado en el padrón') : 'Sin administrado todavía',
        ubic: abierto ? `${abierto.codigoCuis} · ${abierto.descripcionInfraccion}` : 'El primer acto abre el procedimiento',
        derecha: (
          <>
            {abierto && <Insignia tono={tono(abierto.fase ?? '')}>{rotuloDeFase(abierto.fase)}</Insignia>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 999, padding: '4px 11px', whiteSpace: 'nowrap' }}>
              {actoActual ? `Te toca: ${actoActual.a.titulo.toLowerCase()}` : 'Sin acto pendiente'}
            </span>
          </>
        ),
      }
    : undefined;

  return (
    <Shell modulo="sanciones" dest={dest} onDest={irDest} miga={miga} titulo={titulo} paleta={paleta} contexto={contexto} notasDeDestino={notasDeDestino}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              El procedimiento tiene tres actos en orden. La fase de cada expediente no la decide esta pantalla: la deriva el servidor de
              tres hechos ya escritos —el estado de la multa, si hay resolución de gerencia, y si la notificación previa sigue abierta a
              la fecha de corte—.
            </p>

            <section style={TARJETA}>
              <Cabecera
                titulo={`El procedimiento, fase por fase · ejercicio ${pref.ejercicio}`}
                meta={todasLasActas.datos ? miles(todasLasActas.datos.totalElementos) + ' actas' : '…'}
              />
              {FASES.map((f, i) => {
                const e = conteosPorFase[i];
                const total = todasLasActas.datos?.totalElementos ?? 0;
                const n = e.datos?.totalElementos ?? 0;
                const pct = total === 0 ? 0 : (n / total) * 100;
                return (
                  <button
                    key={f[0]}
                    onClick={() => {
                      setChip(f[0]);
                      irDest('lista');
                    }}
                    className="hov-acento"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', padding: '13px 16px', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: '0 0 190px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{f[1]}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{f[2]}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.45 + i * 0.1 }} />
                    </span>
                    <span style={{ flex: '0 0 66px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{cifra(e)}</span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                );
              })}
              <p style={PIE}>
                Un acta anulada o prescrita <strong>no tiene fase</strong>: el vocabulario del procedimiento no tiene palabra para eso y
                el servidor devuelve nulo en vez de elegir la más parecida. Por eso las cinco cuentas no tienen por qué sumar el total.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(216px,1fr))', gap: 13 }}>
              {[
                { valor: cifra(todasLasActas), etiqueta: 'Actas del ejercicio', nota: 'Cada una es una multa administrativa con su código CUIS.' },
                { valor: cifra(vencidas), etiqueta: 'Notificaciones vencidas', nota: 'Venció el plazo sin acreditarse el cumplimiento: habilitan la papeleta.' },
                {
                  valor: recaudado.datos ? 'S/ ' + recaudado.datos.total : recaudado.cargando ? '…' : SIN_DATO,
                  etiqueta: 'Recaudado por multas',
                  nota: recaudado.datos
                    ? `${miles(recaudado.datos.abonos)} abonos vivos del libro entre ${recaudado.datos.desde} y ${recaudado.datos.hasta}.`
                    : 'Sale del libro, no de sumar multas pagadas.',
                },
                {
                  valor: SIN_DATO,
                  etiqueta: 'Multa potencial parada',
                  nota: 'Exigiría multiplicar el porcentaje de cada código por la UIT y sumar. La UIT sale del conjunto sellado, que este ejercicio no tiene, y componer dinero en la pantalla es lo que RNF-083 prohíbe.',
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
              <Cabecera titulo="Lo que toca decidir" meta="contado, no estimado" />
              {[
                { conteo: cifra(vencidas), titulo: 'Notificaciones con el plazo vencido', detalle: 'O se levanta el acta de constatación y se sanciona, o se archiva. No hacer nada equivale a archivar sin dejar constancia.', dest: 'reportes' },
                { conteo: cifra(constatadas), titulo: 'Actas constatadas sin resolver', detalle: 'La multa existe y todavía no hay resolución de gerencia que la deje firme.', dest: 'lista' },
                { conteo: cifra(sancionadas), titulo: 'Multas firmes sin valor emitido', detalle: 'No se pueden cobrar hasta que se registre la corrida y se emitan los valores.', dest: 'valores' },
                { conteo: cifra(cuisCenso), titulo: 'Códigos CUIS cargados', detalle: 'Sin cuadro no hay con qué tipificar una infracción ni con qué calcular su multa.', dest: 'cuis' },
              ].map((t) => (
                <button
                  key={t.titulo}
                  onClick={() => irDest(t.dest)}
                  className="hov-acento"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', padding: '13px 16px', cursor: 'pointer' }}
                >
                  <Insignia tono={t.conteo === '0' ? 'ok' : 'bad'}>{t.conteo}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{t.titulo}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{t.detalle}</span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ LISTA DE EXPEDIENTES ══════════ */}
        {dest === 'lista' && abierto === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Un expediente es un acta con su código CUIS. La <strong>fase</strong> dice por dónde va el procedimiento y el{' '}
              <strong>estado de la deuda</strong> dice si se cobró: son dos vocabularios distintos y aquí van en dos columnas.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" style={{ color: 'var(--ink-3)', flex: '0 0 auto' }}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4.3-4.3" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Administrado"
                  aria-label="Administrado"
                  style={{ flex: 1, minWidth: 180, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px 14px' }}>
                {CHIPS.map((x) => {
                  const on = chip === x;
                  return (
                    <button
                      key={x}
                      onClick={() => setChip(x)}
                      aria-pressed={on}
                      style={{ border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`, borderRadius: 999, padding: '6px 13px', cursor: 'pointer', fontSize: 12, background: on ? 'var(--accent-soft)' : 'var(--bg-card)', color: on ? 'var(--accent-ink)' : 'var(--ink-3)' }}
                    >
                      {x === 'Todas' ? x : rotuloDeFase(x)}
                    </button>
                  );
                })}
              </div>
              <p style={PIE}>
                Las pastillas filtran por <strong>fase</strong>, que es lo que este listado admite. El «estado» del manual —notificada,
                vencida, subsanada, con papeleta— es el vocabulario de la notificación previa, y ese corte lo sirve el padrón de
                notificaciones del centro de reportes.
              </p>
            </section>

            <Lectura estado={lista} que="los expedientes" acceso="infracciones_adm" ruta="GET /api/v1/infracciones/actas">
              {(p) =>
                p.contenido.length === 0 ? (
                  <Vacio titulo="Ningún expediente con esos datos">
                    {criterio === '' && chip === 'Todas'
                      ? 'Esta municipalidad no tiene ninguna infracción administrativa registrada. La siembra de demostración no carga actas ni códigos CUIS, y el registro del acta todavía no se publica como operación.'
                      : 'Prueba con otro nombre o quita el filtro de fase.'}
                  </Vacio>
                ) : (
                  <section style={TARJETA}>
                    <Cabecera titulo="Expedientes" meta={`${p.contenido.length} de ${miles(p.totalElementos)}`} />
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
                        <thead>
                          <Th defs={COLS_LISTA} />
                        </thead>
                        <tbody>
                          {p.contenido.map((r) => (
                            <tr key={r.id} onClick={() => setAbierto(r)} className="hov-acento" style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                              <td style={TD1}>{r.numeroActa}</td>
                              <td style={TD}>{r.administrado ?? SIN_DATO}</td>
                              <td style={TD}>{r.codigoCuis}</td>
                              <td style={{ ...TD, whiteSpace: 'normal', maxWidth: 320 }}>{r.descripcionInfraccion}</td>
                              <td style={TDN}>{r.porcentajeInfraccion}</td>
                              <td style={TDN}>{r.importeAPagar}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <Insignia tono={tono(r.fase ?? '')}>{rotuloDeFase(r.fase)}</Insignia>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <Insignia tono={tono(r.estadoDeLaDeuda)}>{r.estadoDeLaDeuda}</Insignia>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Paginas pagina={p.pagina} totalPaginas={p.totalPaginas} hayMas={p.hayMas} ir={setPagina} />
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                      La multa es la del acta, al {p.contenido[0].actualizadoA}, y la fase se resolvió al {p.contenido[0].faseAlDia}. Las
                      dos fechas viajan con su cifra y no se dan por «hoy».
                    </p>
                  </section>
                )
              }
            </Lectura>
          </div>
        )}

        {/* ══════════ EL EXPEDIENTE: TRES ACTOS EN ORDEN LEGAL ══════════ */}
        {esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {abierto && (
              <section style={TARJETA}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0 }}>
                  {(
                    [
                      ['Nº de acta', abierto.numeroActa, 'var(--ink)'],
                      ['Administrado', abierto.administrado ?? SIN_DATO, 'var(--ink)'],
                      ['Código CUIS', `${abierto.codigoCuis} · ${abierto.porcentajeInfraccion} % UIT`, 'var(--ink)'],
                      ['Multa del acta', `S/ ${abierto.importeAPagar}`, 'var(--ink)'],
                      ['Fase al día', `${rotuloDeFase(abierto.fase)} · ${abierto.faseAlDia}`, 'var(--bad-fg)'],
                      ['Medida complementaria', abierto.medidaComplementaria ?? SIN_DATO, 'var(--ink)'],
                    ] as const
                  ).map((r) => (
                    <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                      <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2], textWrap: 'pretty' }}>{r[1]}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', border: '1px solid var(--line-2)', borderLeft: `3px solid ${actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)'}`, borderRadius: 8, background: actoActual ? 'var(--accent-soft)' : 'var(--ok-bg)' }}>
              <Icono d={T_INFO} tam={17} grosor={1.8} style={{ color: actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)', flex: '0 0 auto', marginTop: 1 }} />
              <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)', textWrap: 'pretty' }}>
                {abierto === null
                  ? 'Este es el primer acto del procedimiento: la notificación preventiva. Los otros dos se abren cuando corresponda, y el orden no lo decide esta pantalla.'
                  : actoActual
                    ? `Te toca el acto ${actoActual.i + 1}: ${actoActual.a.titulo.toLowerCase()}. El orden sale de la fase que el servidor derivó, no de lo que haya tecleado aquí.`
                    : 'No hay ningún acto pendiente en este expediente. Lo que sigue depende del administrado.'}
              </p>
            </div>

            {ACTOS.map((a, i) => {
              const est = estados[a.id];
              const bloqueado = est === 'bloqueado' || est === 'espera';
              const actual = est === 'actual';
              const hecho = est === 'hecho';
              const clave = 'acto|' + a.id;
              const guardado = abiertos[clave];
              const abiertaLaTarjeta = bloqueado ? false : guardado === undefined ? actual : guardado;
              return (
                <section
                  key={a.id}
                  style={{ background: 'var(--bg-card)', border: `1px solid ${actual ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 10, overflow: 'hidden', boxShadow: actual ? 'var(--shadow-2)' : 'var(--shadow-1)' }}
                >
                  <button
                    onClick={() => {
                      if (bloqueado) {
                        toast(a.id === 'notificacion' ? '' : MOTIVOS[a.id as 'sancion' | 'resolucion']);
                        return;
                      }
                      setAbiertos((x) => ({ ...x, [clave]: !abiertaLaTarjeta }));
                    }}
                    aria-expanded={abiertaLaTarjeta}
                    aria-disabled={bloqueado}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 0, background: 'transparent', padding: '14px 16px', textAlign: 'left', cursor: bloqueado ? 'default' : 'pointer', opacity: bloqueado ? 0.62 : 1 }}
                  >
                    <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, background: hecho ? 'var(--ok-bg)' : 'var(--accent-soft)', color: hecho ? 'var(--ok-fg)' : 'var(--accent-ink)' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 15.5, fontWeight: 600 }}>{a.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        {bloqueado ? MOTIVOS[a.id as 'sancion' | 'resolucion'] : a.hint}
                      </span>
                    </span>
                    <Insignia tono={hecho ? 'ok' : actual ? 'warn' : 'neutro'}>
                      {hecho ? 'Cumplido' : actual ? 'Te toca' : est === 'espera' ? 'En espera' : 'Bloqueado'}
                    </Insignia>
                  </button>

                  {abiertaLaTarjeta && a.sinPuerta && (
                    <div role="note" style={{ margin: '0 16px 16px', display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 8, background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
                      <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
                        <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>Este acto no tiene puerta todavía</strong>
                        {a.sinPuerta}
                      </span>
                    </div>
                  )}

                  {abiertaLaTarjeta &&
                    !a.sinPuerta &&
                    a.bloques.map((b, bi) => (
                      <div key={bi} style={{ borderTop: '1px solid var(--line)' }}>
                        {b.titulo && (
                          <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>{b.titulo}</p>
                        )}
                        {b.nota && (
                          <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{b.nota}</p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '13px 16px 16px' }}>
                          {b.campos.map((f) => (
                            <Campo key={f.k} f={f} valor={val(f.k)} onCambio={(v) => set(f.k, v)} />
                          ))}
                        </div>
                        {a.id === 'notificacion' && bi === 0 && (
                          <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 12, color: 'var(--accent-ink)', fontFamily: 'var(--font-mono)' }}>
                            Se guardará como «{numeroCompuesto === '' || numeroCompuesto === '-' ? SIN_DATO : numeroCompuesto}»
                          </p>
                        )}
                      </div>
                    ))}

                  {abiertaLaTarjeta && !a.sinPuerta && (
                    <>
                      <div style={{ borderTop: '1px solid var(--line)', padding: '13px 16px' }}>
                        <Campo
                          f={{ k: 'obs', l: 'Observación', t: 'area', ancho: true, ph: 'Por qué se registra', ayuda: 'Obligatoria: toda modificación se guarda con el motivo de quien la hace. De 5 a 500 caracteres.' }}
                          valor={val('obs')}
                          onCambio={(v) => set('obs', v)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                        <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                          {motivoDelActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) || a.aviso}
                        </p>
                        <button
                          onClick={a.id === 'notificacion' ? registrarLaNotificacion : dictarLaResolucion}
                          disabled={puedeElActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) === false || enviando}
                          title={motivoDelActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) || undefined}
                          className={puedeElActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) && !enviando ? 'hov-acento-2' : undefined}
                          style={{
                            border: 0,
                            borderRadius: 6,
                            padding: '11px 22px',
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 13.5,
                            fontWeight: 500,
                            cursor: puedeElActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) && !enviando ? 'pointer' : 'not-allowed',
                            opacity: puedeElActo(a.id, faltaObservacion, faltanDeLaNotificacion, faltanDeLaResolucion) && !enviando ? 1 : 0.5,
                          }}
                        >
                          {enviando ? 'Enviando…' : a.primaria}
                        </button>
                      </div>
                    </>
                  )}
                </section>
              );
            })}

            {/* La cédula con que se notifica la resolución ya dictada. */}
            <section style={TARJETA}>
              <Cabecera
                titulo="Notificación de la resolución"
                meta="POST /api/v1/infracciones/administrativas/resoluciones/{id}/notificacion"
              />
              <p style={{ margin: 0, padding: '13px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                Dictar la resolución no la notifica. De la diligencia sale la exigibilidad: el servidor devuelve desde qué día la deuda se
                puede cobrar, y no lo devuelve cuando la diligencia no surtió efecto.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '13px 16px 16px', borderTop: '1px solid var(--line)' }}>
                {CAMPOS_DE_LA_CEDULA.map((f) => (
                  <Campo key={f.k} f={f} valor={val(f.k, f.o ? f.o[0] : '')} onCambio={(v) => set(f.k, v)} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {faltaObservacion
                    ? 'Falta la observación del acto, arriba: sin ella el servidor no guarda nada.'
                    : faltanDeLaCedula.length > 0
                      ? 'Falta ' + faltanDeLaCedula.join(', ') + '.'
                      : 'La modalidad y el resultado son obligatorios: el servidor no los deduce.'}
                </p>
                <button
                  onClick={notificarLaResolucion}
                  disabled={faltaObservacion || faltanDeLaCedula.length > 0 || enviando}
                  title={faltaObservacion ? 'Falta la observación' : faltanDeLaCedula.length > 0 ? 'Falta ' + faltanDeLaCedula.join(', ') : undefined}
                  className={!faltaObservacion && faltanDeLaCedula.length === 0 && !enviando ? 'hov-acento-2' : undefined}
                  style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: !faltaObservacion && faltanDeLaCedula.length === 0 && !enviando ? 'pointer' : 'not-allowed', opacity: !faltaObservacion && faltanDeLaCedula.length === 0 && !enviando ? 1 : 0.5 }}
                >
                  {enviando ? 'Enviando…' : 'Registrar la diligencia'}
                </button>
              </div>
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
                {causasDelRechazo(falloDelActo, 'PLAZO:RG_ORDINARIA_CUMPLIMIENTO') !== null && (
                  <span style={{ fontSize: 12, lineHeight: 1.5, textWrap: 'pretty', opacity: 0.85 }}>
                    {causasDelRechazo(falloDelActo, 'PLAZO:RG_ORDINARIA_CUMPLIMIENTO')}
                  </span>
                )}
                {falloDelActo.detalles && falloDelActo.detalles.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{falloDelActo.detalles.join(' · ')}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════ CUADRO CUIS ══════════ */}
        {dest === 'cuis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El cuadro aprobado por ordenanza. Lo que fija es el <strong>porcentaje de la UIT</strong>, no el importe: cambiar la UIT del
              ejercicio recalcula todas las multas sin tocar el cuadro.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <input
                  value={cuisQ}
                  onChange={(e) => setCuisQ(e.target.value)}
                  placeholder="Texto de la infracción"
                  aria-label="Texto de la infracción"
                  style={{ ...IN, flex: 1, minWidth: 180, width: undefined }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty', flex: '1 1 280px' }}>
                  El filtro «Materia» del manual no acota por materia: el servidor lo aplica al texto de la infracción, porque el cuadro
                  no guarda esa columna. Se dice y se busca por lo que sí hace.
                </span>
              </div>
              <Lectura estado={cuis} que="el cuadro CUIS" acceso="codigos_cuis" ruta="GET /api/v1/infracciones/cuis">
                {(p) =>
                  p.contenido.length === 0 ? (
                    <p style={PIE}>
                      El cuadro CUIS está vacío en esta municipalidad. Nada lo carga todavía: la siembra de demostración no trae códigos y
                      no hay ninguna operación publicada que los dé de alta. Sin cuadro no se puede tipificar una infracción.
                    </p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                          <thead>
                            <Th defs={COLS_CUIS} />
                          </thead>
                          <tbody>
                            {p.contenido.map((x) => (
                              <tr key={x.id} style={{ borderTop: '1px solid var(--line)' }} className="hov-elev">
                                <td style={TD1}>{x.codigo}</td>
                                <td style={{ ...TD, whiteSpace: 'normal', maxWidth: 380 }}>{x.descripcion}</td>
                                <td style={TDN}>{x.porcentajeUit}</td>
                                <td style={TD}>{x.medida ?? SIN_DATO}</td>
                                <td style={TD}>{x.baseLegal}</td>
                                <td style={TD}>{x.vigenciaHasta ? `${x.vigenciaDesde} — ${x.vigenciaHasta}` : x.vigenciaDesde}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Paginas pagina={p.pagina} totalPaginas={p.totalPaginas} hayMas={p.hayMas} ir={setPaginaCuis} />
                      <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                        No hay columna de multa en soles: sería el porcentaje por la UIT del ejercicio, y la UIT sale del conjunto de
                        parámetros sellado. Multiplicarla aquí con una UIT escrita a mano es lo que la regla 5 prohíbe.
                      </p>
                    </>
                  )
                }
              </Lectura>
            </section>
          </div>
        )}

        {/* ══════════ GENERACIÓN DE VALORES ══════════ */}
        {dest === 'valores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Una multa firme no se puede cobrar hasta que exista su valor. Aquí se registra el criterio con el que se emitirán: la
              corrida se guarda y devuelve sus candidatos, pero <strong>no emite ningún valor</strong> —eso corre después, por lotes—.
            </p>

            <section style={TARJETA}>
              <Cabecera titulo="Criterio de la corrida" meta="POST /api/v1/infracciones/administrativas/valores/generacion-masiva" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px' }}>
                <Campo f={{ k: 'valDesde', l: 'Infracciones desde', t: 'date' }} valor={val('valDesde')} onCambio={(v) => set('valDesde', v)} />
                <Campo f={{ k: 'valHasta', l: 'Infracciones hasta', t: 'date' }} valor={val('valHasta')} onCambio={(v) => set('valHasta', v)} />
                <Campo f={{ k: 'valCriterio', l: 'Fecha de criterio', t: 'date', ayuda: 'A qué fecha se evalúan la deuda y el plazo. En blanco, hoy.' }} valor={val('valCriterio')} onCambio={(v) => set('valCriterio', v)} />
                <Campo
                  f={{ k: 'obs', l: 'Observación', t: 'area', ancho: true, ph: 'Por qué se registra', ayuda: 'Obligatoria: de 5 a 500 caracteres.' }}
                  valor={val('obs')}
                  onCambio={(v) => set('obs', v)}
                />
              </div>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                El tipo de recaudo, la oficina y el vencimiento que el manual dibuja no están en el cuerpo que el servidor acepta, y el
                número de cada resolución de multa lo pone el correlativo del servidor: no hay campo para él, y su ausencia es
                deliberada.
              </p>
            </section>

            {/* El motivo sale una vez y se usa dos: en el parrafo que se lee y en
                el `title` del boton. Con dos copias, arreglar una y no la otra
                deja al boton diciendo algo distinto de lo que hay al lado. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* El motivo se enlaza con `aria-describedby`, no se deja sólo al
                  lado: quien navega con teclado llega al botón y oye «Registrar
                  la corrida, atenuado» sin nada más, y este párrafo se queda a
                  la espalda del foco (RNF-082). El `title` cubre al que pasa el
                  ratón por encima. */}
              <p id="motivo-de-la-corrida" style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {motivoDeLaCorrida}
              </p>
              <button
                onClick={registrarLaCorrida}
                disabled={faltaObservacion || texto('valDesde') === '' || texto('valHasta') === '' || enviando}
                aria-describedby="motivo-de-la-corrida"
                title={faltaObservacion || texto('valDesde') === '' || texto('valHasta') === '' ? motivoDeLaCorrida : undefined}
                className={!faltaObservacion && texto('valDesde') !== '' && texto('valHasta') !== '' && !enviando ? 'hov-acento-2' : undefined}
                style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: !faltaObservacion && texto('valDesde') !== '' && texto('valHasta') !== '' && !enviando ? 'pointer' : 'not-allowed', opacity: !faltaObservacion && texto('valDesde') !== '' && texto('valHasta') !== '' && !enviando ? 1 : 0.5 }}
              >
                {enviando ? 'Enviando…' : 'Registrar la corrida'}
              </button>
            </div>

            {hechoDelActo !== '' && (
              <div role="status" style={{ display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{hechoDelActo}</span>
              </div>
            )}
            {falloDelActo && (
              <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
                <strong style={{ fontSize: 12.5 }}>{tituloDelFallo(falloDelActo, 'la corrida')}</strong>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>{falloDelActo.mensaje}</span>
                {falloDelActo.detalles && falloDelActo.detalles.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{falloDelActo.detalles.join(' · ')}</span>
                )}
              </div>
            )}

            <section style={TARJETA}>
              <Cabecera titulo="Multas sancionadas, que son las que un valor puede alcanzar" meta={cifra(sancionadas)} />
              <Lectura estado={candidatos} que="las multas sancionadas" acceso="infracciones_adm" ruta="GET /api/v1/infracciones/actas?estado=SANCIONADA">
                {(p) =>
                  p.contenido.length === 0 ? (
                    <p style={PIE}>
                      No hay ninguna multa en fase sancionada. Una multa llega a esa fase cuando su acta tiene resolución de gerencia
                      administrativa; sin actas registradas no hay ninguna.
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                        <thead>
                          <Th defs={[['Nº de acta', 0], ['Administrado', 0], ['CUIS', 0], ['Multa S/', 1], ['Al día', 0], ['Estado de la deuda', 0]]} />
                        </thead>
                        <tbody>
                          {p.contenido.map((r) => (
                            <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }} className="hov-elev">
                              <td style={TD1}>{r.numeroActa}</td>
                              <td style={TD}>{r.administrado ?? SIN_DATO}</td>
                              <td style={TD}>{r.codigoCuis}</td>
                              <td style={TDN}>{r.importeAPagar}</td>
                              <td style={TD}>{r.actualizadoA}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <Insignia tono={tono(r.estadoDeLaDeuda)}>{r.estadoDeLaDeuda}</Insignia>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </Lectura>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                Esta lista no se marca. El cuerpo admite marcar números <em>o</em> declarar un rango, y los dos a la vez se rechazan a
                propósito: la pantalla usa el rango, que es lo que el manual pide, y la lista está para saber sobre qué se trabaja.
              </p>
            </section>
          </div>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {dest === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p data-noprint="1" style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Siete hojas con el mismo formulario. Aquí son un carril: se elige la hoja y solo aparecen los criterios que esa hoja usa —y
              de los que el servidor lee, que no son todos los que el manual dibuja—.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,268px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section data-noprint="1" style={TARJETA}>
                <p style={{ margin: 0, padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  Reportes del módulo
                </p>
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
                    </button>
                  );
                })}
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section data-noprint="1" style={TARJETA}>
                  <Cabecera titulo={h.label} meta={`${h.crit.length} criterios`} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end' }}>
                    {h.crit.map((k) => (
                      <Campo
                        key={k}
                        f={{ k: 'rep_' + k, l: CRITERIOS[k].l, t: CRITERIOS[k].t, o: CRITERIOS[k].o }}
                        valor={val('rep_' + k, CRITERIOS[k].v)}
                        onCambio={(v) => set('rep_' + k, v)}
                      />
                    ))}
                  </div>
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    Los criterios que esta hoja no usa no se dibujan; los que el contrato declara y ningún controlador lee —agrupación del
                    padrón, fecha de cálculo del estado de cuenta, ordenación del reporte de códigos— tampoco.
                  </p>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
                    {traerDocumento !== null ? (
                      <Descargas
                        traer={traerDocumento}
                        que="este reporte"
                        acceso={ACCESO_DEL_REPORTE[h.k] ?? 'adm_reportes'}
                        privilegio="impresion"
                        impedimento={reporte.datos === null ? 'No hay hoja leída: no hay qué descargar' : undefined}
                      />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        <strong style={{ fontWeight: 600 }}>Esta hoja no se puede descargar.</strong> Su endpoint no declara{' '}
                        <code style={{ fontFamily: 'var(--font-mono)' }}>?formato</code>: pedírselo devuelve el mismo JSON que se está
                        viendo, así que el archivo se llamaría <code style={{ fontFamily: 'var(--font-mono)' }}>.pdf</code> y no lo sería.
                        La hoja se saca por la impresora con Ctrl+P.
                      </p>
                    )}
                  </div>
                </section>

                <Lectura estado={reporte} que="el reporte" acceso={ACCESO_DEL_REPORTE[h.k] ?? 'adm_reportes'} ruta={RUTA_DEL_REPORTE[h.k] ?? ''}>
                  {(r) => (
                    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '32px 34px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 11, borderBottom: '2px solid var(--ink)' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600 }}>{pref.entidad}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-3)' }}>Gerencia de Fiscalización y Control</p>
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
                        <p style={{ margin: '18px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>Sin filas en el periodo consultado.</p>
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
                        <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Gerente de Fiscalización</div>
                        <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
                      </div>
                    </section>
                  )}
                </Lectura>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ══════════ Lo que apaga cada acto, dicho una sola vez ══════════ */

function puedeElActo(id: IdDeActo, faltaObservacion: boolean, faltanN: string[], faltanR: string[]): boolean {
  if (faltaObservacion) return false;
  if (id === 'notificacion') return faltanN.length === 0;
  if (id === 'resolucion') return faltanR.length === 0;
  return false;
}

function motivoDelActo(id: IdDeActo, faltaObservacion: boolean, faltanN: string[], faltanR: string[]): string {
  if (faltaObservacion) return 'Falta la observación: toda modificación se guarda con el motivo de quien la hace, y va de 5 a 500 caracteres.';
  const faltan = id === 'notificacion' ? faltanN : id === 'resolucion' ? faltanR : [];
  return faltan.length === 0 ? '' : 'Falta ' + faltan.join(', ') + '.';
}

/* ══════════ El centro de reportes, contra las rutas de verdad ══════════ */

type HojaResuelta = { aLaFecha: string; meta: [string, string][]; cols: [string, 0 | 1][]; filas: string[][] };

const RUTA_DEL_REPORTE: Record<string, string> = {
  padron_notificaciones: 'GET /api/v1/infracciones/administrativas/reportes/padron-notificaciones',
  vencidas: 'GET /api/v1/infracciones/administrativas/reportes/vencidas',
  por_contribuyente: 'GET /api/v1/infracciones/administrativas/reportes/por-contribuyente',
  estado_cuenta: 'GET /api/v1/infracciones/administrativas/estado-cuenta',
  codigos: 'GET /api/v1/infracciones/administrativas/codigos/reporte',
  resumen_papeletas: 'POST /api/v1/infracciones/administrativas/reportes',
  resumen_recaudacion: 'GET /api/v1/infracciones/administrativas/reportes/resumen-recaudacion',
};

const ACCESO_DEL_REPORTE: Record<string, string> = {
  padron_notificaciones: 'adm_padron_notificaciones',
  vencidas: 'adm_notificaciones_vencidas',
  por_contribuyente: 'adm_notificaciones_contribuyente',
  estado_cuenta: 'adm_estado_cuenta',
  codigos: 'adm_codigos_reporte',
  resumen_papeletas: 'adm_reportes',
  resumen_recaudacion: 'adm_resumen_recaudacion',
};

/**
 * Pide la hoja elegida a la ruta que le toca y la devuelve ya en filas.
 *
 * Cada hoja tiene su propia forma de respuesta, y una de ellas —el resumen de
 * multas— **no tiene lectura propia**: se le pide al emisor de reportes, que
 * es un `POST` que no escribe nada (su cuerpo ni siquiera declara observación).
 */

/**
 * Los criterios de las tres hojas que ADEMÁS se descargan, en un solo sitio.
 *
 * La lectura y el archivo tienen que llevar los mismos: un PDF con otros
 * filtros que la hoja de al lado no falla en voz alta —sale, se ve bien y dice
 * otra cosa—, y quien lo detecta es el administrado con el papel en la mano.
 *
 * Las otras cuatro hojas del carril no están aquí porque su endpoint **no
 * declara `?formato`**: contesta el JSON de siempre e ignora el parámetro
 * (medido: `/infracciones/administrativas/reportes/vencidas?formato=PDF` →
 * `200 application/json`).
 */
function criteriosDescargables(k: string, c: (llave: string) => string): Record<string, string | undefined> | null {
  const v = (llave: string) => c(llave) || undefined;
  if (k === 'padron_notificaciones') return { desde: v('desde'), hasta: v('hasta'), estado: v('estadoNotificacion') };
  if (k === 'resumen_recaudacion') return { ano: v('ano') };
  if (k === 'resumen_papeletas') return { desde: v('desde'), hasta: v('hasta'), agrupadoPor: v('agrupadoPor') };
  return null;
}

async function pedirReporte(k: string, c: (llave: string) => string, senal: AbortSignal): Promise<HojaResuelta> {
  const pag = { tamano: 50 };

  if (k === 'padron_notificaciones') {
    const cr = criteriosDescargables(k, c)!;
    const p = await padronDeNotificaciones({ ...cr, estado: cr.estado as EstadoDeNotificacion | undefined }, pag, senal);
    return {
      aLaFecha: p.contenido[0]?.actualizadoA ?? '',
      meta: [['Notificaciones', miles(p.totalElementos)], ['En esta hoja', String(p.contenido.length)]],
      cols: [['Número', 0], ['Fecha', 0], ['Dirección', 0], ['Motivo', 0], ['Plazo', 1], ['Estado', 0], ['Papeleta', 0], ['Importe S/', 1]],
      filas: p.contenido.map((x) => [
        x.numero,
        x.fecha,
        x.direccion,
        x.motivo,
        x.plazoDias === null ? SIN_DATO : String(x.plazoDias),
        x.estado,
        x.papeletaNumero ?? SIN_DATO,
        /* Sin papeleta no hay importe: sale «—», no cero. Un cero ahí se lee
           como «la multa fue de nada». */
        x.importeDeLaPapeleta ?? SIN_DATO,
      ]),
    };
  }

  if (k === 'vencidas') {
    const p = await notificacionesVencidas(
      {
        vencidasAl: c('vencidasAl') || undefined,
        fiscalizador: c('fiscalizador') || undefined,
        infraccion: c('infraccion') || undefined,
        conPapeleta: c('conPapeleta') === '' ? undefined : c('conPapeleta') === 'true',
      },
      pag,
      senal,
    );
    return {
      aLaFecha: c('vencidasAl'),
      meta: [['Vencidas', miles(p.totalElementos)]],
      cols: [['Número', 0], ['Fecha', 0], ['Dirección', 0], ['Motivo', 0], ['Plazo', 1], ['Vence', 0], ['Estado', 0]],
      filas: p.contenido.map((x) => [
        x.numero,
        x.fecha,
        x.direccion,
        x.motivo,
        x.plazoDias === null ? SIN_DATO : String(x.plazoDias),
        x.vencimiento ?? SIN_DATO,
        x.estado,
      ]),
    };
  }

  if (k === 'por_contribuyente' || k === 'estado_cuenta') {
    const p =
      k === 'por_contribuyente'
        ? await notificacionesPorContribuyente(
            { codContribuyente: c('codContribuyente') || undefined, ano: c('ano') ? Number(c('ano')) : undefined, soloPendientes: c('soloPendientes') === 'true' },
            pag,
            senal,
          )
        : await estadoDeCuentaAdministrativo({ papeleta: c('papeleta') || undefined, codContribuyente: c('codContribuyente') || undefined }, pag, senal);
    return {
      aLaFecha: '',
      meta: [['Papeletas', miles(p.totalElementos)]],
      cols: [['Papeleta', 0], ['Fecha', 0], ['Lugar', 0], ['% infracción', 1], ['Multa S/', 1], ['A pagar S/', 1], ['Con beneficio S/', 1], ['Estado', 0]],
      filas: p.contenido.map((x) => [
        x.numero,
        x.fechaInfraccion,
        x.lugar,
        x.porcentajeInfraccion,
        x.importeInfraccion,
        x.importeAPagar,
        x.importeConBeneficio ?? SIN_DATO,
        x.estado,
      ]),
    };
  }

  if (k === 'codigos') {
    const p = await listarCuisComoReporte(
      { codigo: c('codigo') || undefined, descripcionContiene: c('descripcionContiene') || undefined },
      pag,
      senal,
    );
    return {
      aLaFecha: '',
      meta: [['Códigos tipificados', miles(p.totalElementos)]],
      cols: [['Código', 0], ['Descripción', 0], ['% UIT', 1], ['Medida', 0], ['Base legal', 0]],
      filas: p.contenido.map((x) => [x.codigo, x.descripcion, x.porcentajeUit, x.medida ?? SIN_DATO, x.baseLegal]),
    };
  }

  if (k === 'resumen_recaudacion') {
    const ano = criteriosDescargables(k, c)!.ano;
    const r = await recaudacionAdministrativa(ano === undefined ? undefined : Number(ano), senal);
    return {
      aLaFecha: r.actualizadoA,
      meta: [['Periodo', `${r.desde} — ${r.hasta}`], ['Recaudado', 'S/ ' + r.total], ['Abonos', miles(r.abonos)]],
      cols: [['Mes', 0], ['Fases', 0], ['Abonos', 1], ['Total del mes S/', 1]],
      /* El total del mes lo suma el SERVIDOR y viene en `porMes`. Recomponerlo
         aquí sumando las fases es lo que RNF-083 prohíbe. */
      filas: r.porMes.map((m) => [MESES[m.mes] ?? String(m.mes), m.porFase.map((f) => `${f.fase} ${f.recaudado}`).join(' · '), miles(m.abonos), m.total]),
    };
  }

  /* El resumen de multas es la única hoja del módulo sin lectura propia: se le
     pide al emisor, que devuelve JSON cuando no se le manda `formato`. */
  const cr = criteriosDescargables('resumen_papeletas', c)!;
  const e = await emitirReporteAdministrativo(
    { reporte: 'RESUMEN_PAPELETAS', ...cr, agrupadoPor: cr.agrupadoPor as AgrupacionDelResumen | undefined },
    senal,
  );
  const r = e.resumenDePapeletas;
  if (r === null) {
    return { aLaFecha: '', meta: [], cols: [['Reporte', 0]], filas: [[e.reporte]] };
  }
  return {
    aLaFecha: r.actualizadoA,
    meta: [
      ['Periodo', `${r.desde} — ${r.hasta}`],
      ['Agrupado por', r.agrupadoPor],
      ['Multas', miles(r.papeletas)],
      ['Importe de las actas', 'S/ ' + r.importeTotal],
    ],
    cols: [['Clave', 0], ['Descripción', 0], ['Año', 0], ['Multas', 1], ['Importe S/', 1], ['Pagadas', 1], ['Pendientes', 1], ['En coactiva', 1]],
    filas: r.lineas.map((l) => [
      l.clave,
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
