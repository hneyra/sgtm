import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  COLS_ANUNCIOS,
  COLS_CERT,
  COLS_CIIU,
  COLS_DOCUMENTOS,
  COLS_DUPLICADOS,
  COLS_FUE,
  COLS_GIROS,
  COLS_HISTORIAL_FUE,
  COLS_HISTORIAL_LIC,
  COLS_LICENCIAS,
  COLS_MOV_ANUNCIO,
  COLS_PADRON_ANUNCIOS,
  COLS_PADRON_LIC,
  COLS_PROFESIONALES,
  COLS_REPORTE_EDIF,
  COLS_RESUMEN,
  COLS_VALORIZACION,
  COLS_VIGENCIAS,
  HOJAS,
  LO_QUE_NO_SE_CUENTA,
  OPCIONES,
  TRAMITES,
  type ColDef,
  type TipoDeTramite,
} from '../../datos/licencias';
import {
  CLASES_DE_ANUNCIO,
  ESTADOS_DEL_FUE,
  ESTADOS_DE_LICENCIA,
  MODALIDADES,
  RIESGOS_ITSE,
  SECCIONES_DEL_FUE,
  TIPOS_DE_LICENCIA,
  TRAMITES_DE_EDIFICACION,
  listarAnuncios,
  listarCertificados,
  listarCiiu,
  listarFue,
  listarLicencias,
  padronDeAnuncios,
  padronDeLicencias,
  presentarFue,
  registrarCiiu,
  reporteDeEdificacion,
  resumenAnualDeLicencias,
  type Anuncio,
  type Fue,
  type Licencia,
} from '../../api/licencias';
import { useRebote, useRecurso, type Estado } from '../../api/useRecurso';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { hayPuerta } from '../../api/sesion';

/* ══════════ Los estilos del artboard, tal cual ══════════ */
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
  flexWrap: 'wrap',
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
const ENTRADILLA: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.6,
  color: 'var(--ink-2)',
  maxWidth: '70ch',
  textWrap: 'pretty',
};
const BOTON_SEC: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '10px 18px',
  background: 'var(--bg-card)',
  fontSize: 13,
  cursor: 'pointer',
};
const BOTON_PRI: CSSProperties = {
  border: 0,
  borderRadius: 6,
  padding: '11px 22px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
};

/** Lo que se escribe donde el backend no publica el dato. Nunca un cero. */
const SIN_DATO = '—';

type Tono = 'ok' | 'warn' | 'bad';

const INS: Record<Tono, CSSProperties> = {
  ok: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--ok-bg)', color: 'var(--ok-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  warn: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--warn-bg)', color: 'var(--warn-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  bad: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bad-bg)', color: 'var(--bad-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
};

/** El tono del módulo: aquí «medio» y «alto» son niveles de riesgo del giro,
 *  no estados, y por eso no vale el `tonoDe` común. Los vocabularios son los
 *  del backend: VIGENTE, VENCIDA, CANCELADA, EN_TRAMITE, ANULADA, CESADO… */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/vencid|cancelad|anulad|retirad|alto|no/.test(t)) return 'bad';
  if (/en_tramite|en trámite|cesad|medio|sí/.test(t)) return 'warn';
  return 'ok';
}

function Cabecera({ cols }: { cols: ColDef[] }) {
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

/** El aviso con filete de color. Es la `Guia` del artboard, y aquí sirve además
 *  para decir lo que el backend no publica y por qué. */
function Franja({ tono: t = 'warn', children }: { tono?: Tono | 'neutro'; children: ReactNode }) {
  const color = t === 'neutro' ? 'var(--ink-2)' : `var(--${t}-fg)`;
  const fondo = t === 'neutro' ? 'var(--bg-elev)' : `var(--${t}-bg)`;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '13px 16px',
        border: '1px solid var(--line-2)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        background: fondo,
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        style={{ color, flex: '0 0 auto', marginTop: 1 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.4v.02M12 11.4v4.2" />
      </svg>
      <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color, textWrap: 'pretty' }}>{children}</p>
    </div>
  );
}

/** Los tres estados de una lectura sin filas: cargando, caída y vacía. */
function EstadoDeLectura({
  lectura,
  ruta,
  vacio,
}: {
  lectura: { cargando: boolean; error: ErrorDeApi | null; reintentar: () => void };
  ruta: string;
  vacio: ReactNode;
}) {
  const [pegado, setPegado] = useState('');
  if (lectura.cargando) {
    return (
      <section style={TARJETA}>
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
  if (lectura.error === null) {
    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '40px 24px',
          border: '1px solid var(--line)',
          borderRadius: 10,
          background: 'var(--bg-card)',
        }}
      >
        <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
        {vacio}
      </section>
    );
  }
  const e = lectura.error;
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '34px 24px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-card)',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" style={{ color: 'var(--error-texto)' }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.2h.02" />
      </svg>
      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>
        {e.codigo === 'SIN_PRIVILEGIO'
          ? 'Tu perfil no llega a esta consulta'
          : e.codigo === 'NO_AUTENTICADO'
            ? 'La sesión no vale'
            : e.codigo === 'VALIDACION'
              ? 'El servidor no admite esa consulta'
              : 'No se pudo leer'}
      </p>
      <p style={{ margin: 0, maxWidth: '58ch', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
        {e.mensaje}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
        {ruta} · {e.estado || 'sin respuesta'}
        {e.incidencia ? ` · ref ${e.incidencia}` : ''}
      </p>
      {e.codigo === 'NO_AUTENTICADO' && !hayPuerta() && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, width: 'min(560px,100%)' }}>
          <input
            value={pegado}
            onChange={(ev) => setPegado(ev.target.value)}
            placeholder="Pega un token del emisor: eyJhbGciOi…"
            spellCheck={false}
            style={{ ...IN, fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button
            onClick={() => {
              fijarToken(pegado.trim() || null);
              setPegado('');
              lectura.reintentar();
            }}
            style={{ ...BOTON_PRI, padding: '8px 17px', whiteSpace: 'nowrap' }}
          >
            Usar este token
          </button>
        </div>
      )}
      {e.reintentable && (
        <button onClick={lectura.reintentar} className="hov-acento-2" style={{ ...BOTON_PRI, marginTop: 6, padding: '8px 17px' }}>
          Reintentar
        </button>
      )}
    </section>
  );
}

type Total = [string, string, 0 | 1];

function Totales({ filas }: { filas: Total[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))',
        gap: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {filas.map((t) => (
        <div
          key={t[0]}
          style={{
            background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
            padding: '14px 16px',
            borderLeft: '1px solid var(--line)',
            borderTop: '1px solid var(--line)',
            margin: '-1px 0 0 -1px',
          }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
            {t[0]}
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
        </div>
      ))}
    </div>
  );
}

function Tabla({
  titulo,
  meta,
  cols,
  filas,
  insignia,
  min,
  totales,
  nota,
  onFila,
}: {
  titulo: string;
  meta?: string;
  cols: ColDef[];
  filas: string[][];
  insignia?: number;
  min?: number;
  totales?: Total[];
  nota?: string;
  onFila?: (i: number) => void;
}) {
  return (
    <section style={TARJETA}>
      <div style={CABECERA}>
        <h2 style={H2}>{titulo}</h2>
        {meta && <span style={META}>{meta}</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
          <Cabecera cols={cols} />
          <tbody>
            {filas.map((f, i) => (
              <tr
                key={i}
                onClick={onFila ? () => onFila(i) : undefined}
                className={onFila ? 'hov-acento' : 'hov-elev'}
                style={{ borderTop: '1px solid var(--line)', cursor: onFila ? 'pointer' : undefined }}
              >
                {f.map((c, j) =>
                  j === insignia ? (
                    <td key={j} style={{ padding: '11px 14px' }}>
                      <span style={INS[tono(c)]}>{c}</span>
                    </td>
                  ) : (
                    <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr style={{ borderTop: '1px solid var(--line)' }}>
                <td colSpan={cols.length} style={{ ...TD, padding: '22px 14px', color: 'var(--ink-3)', whiteSpace: 'normal' }}>
                  Sin filas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totales && totales.length > 0 && <Totales filas={totales} />}
      {nota && <p style={PIE}>{nota}</p>}
    </section>
  );
}

type CampoDef = {
  k: string;
  l: string;
  t?: 'text' | 'sel' | 'date' | 'area' | 'ro';
  o?: string[];
  ph?: string;
  ayuda?: string;
  ancho?: boolean;
};

function Formulario({
  defs,
  val,
  set,
}: {
  defs: CampoDef[];
  val: (k: string) => string;
  set: (k: string, v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
        gap: '15px 16px',
        padding: '15px 16px 17px',
      }}
    >
      {defs.map((f) => {
        const t = f.t ?? 'text';
        return (
          <label
            key={f.k}
            style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: f.ancho ? '1 / -1' : undefined }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
            {(t === 'text' || t === 'date') && (
              <input
                type={t === 'date' ? 'date' : undefined}
                value={val(f.k)}
                onChange={(e) => set(f.k, e.target.value)}
                placeholder={f.ph ?? ''}
                style={IN}
              />
            )}
            {t === 'sel' && (
              <select value={val(f.k)} onChange={(e) => set(f.k, e.target.value)} style={IN}>
                {(f.o ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o === '' ? '(sin elegir)' : o}
                  </option>
                ))}
              </select>
            )}
            {t === 'area' && (
              <textarea
                value={val(f.k)}
                onChange={(e) => set(f.k, e.target.value)}
                rows={3}
                placeholder={f.ph ?? ''}
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
            {t === 'ro' && (
              <span
                style={{
                  display: 'block',
                  minHeight: 38,
                  lineHeight: '19px',
                  padding: '9px 10px',
                  border: '1px dashed var(--line-2)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--ink-2)',
                }}
              >
                {val(f.k) || SIN_DATO}
              </span>
            )}
            {f.ayuda && (
              <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{etiqueta}</p>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', textWrap: 'pretty' }}>{valor}</p>
    </div>
  );
}

function Datos({ titulo, nota, filas }: { titulo: string; nota?: string; filas: [string, string][] }) {
  return (
    <section style={TARJETA}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{titulo}</p>
        {nota && (
          <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '78ch', textWrap: 'pretty' }}>
            {nota}
          </p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px 16px', padding: '15px 16px 17px' }}>
        {filas.map((c) => (
          <Dato key={c[0]} etiqueta={c[0]} valor={c[1]} />
        ))}
      </div>
    </section>
  );
}

function cifraDe(r: Estado<{ totalElementos: number }>): string {
  if (r.cargando) return '…';
  if (r.error || !r.datos) return SIN_DATO;
  return r.datos.totalElementos.toLocaleString('es-PE');
}

/** Cierra con punto el mensaje que el backend redacta sin él, para que no se
 *  pegue a la frase siguiente. */
function puntoFinal(texto: string): string {
  const t = texto.trim();
  return t === '' || /[.:!?]$/.test(t) ? t : t + '.';
}

/** Un importe con su fecha, o «—» con el motivo cuando el backend no lo resuelve. */
function importe(v: { importe: string; actualizadoA: string } | null): string {
  return v === null ? SIN_DATO : v.importe;
}

/* ══════════ El módulo ══════════ */

export default function Licencias({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  const [vals, setVals] = useState<Record<string, string>>({});
  const [tipo, setTipo] = useState<TipoDeTramite>('funcionamiento');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const [catTab, setCatTab] = useState(0);
  const [catQ, setCatQ] = useState('');
  const [hojaIdx, setHojaIdx] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  /* El recuento del padrón, recordado. La lectura solo está activa en el panel y
     en su hoja del centro de reportes —es un POST, y no se dispara en cada
     pantalla—, así que sin recordarlo la tarjeta del riel volvería a «—» al
     cambiar de destino y su rótulo quedaría en «al —». */
  const [padronRecordado, setPadronRecordado] = useState<{ vigentes: number; aLaFecha: string } | null>(null);

  const val = (k: string) => vals[k] ?? '';
  const set = (k: string, v: string) => setVals((x) => ({ ...x, [k]: v }));

  /* Salir a otro destino cierra el expediente abierto: vive dentro de
     «Solicitudes», no es un destino más. */
  useEffect(() => {
    setAbierto(null);
    setFallo(null);
    setHecho(null);
  }, [dest, tipo]);

  const enPanel = dest === 'panel';
  const enLista = dest === 'lista';
  const esAlta = dest === 'alta';
  const enFicha = enLista && abierto !== null;

  const criterio = useRebote(q.trim());
  useEffect(() => setPagina(0), [criterio, tipo]);

  /* ── Los tres padrones ──────────────────────────────────────── */

  const licencias = useRecurso(
    (s) => listarLicencias({ denominacionComercial: criterio || undefined }, { pagina, tamano: 20 }, s),
    [criterio, pagina],
    enPanel || (enLista && tipo === 'funcionamiento'),
  );
  const fues = useRecurso(
    (s) => listarFue({ nombreContribuyente: criterio || undefined }, { pagina, tamano: 20 }, s),
    [criterio, pagina],
    enPanel || (enLista && tipo === 'edificacion'),
  );
  const anuncios = useRecurso(
    (s) => listarAnuncios({ direccion: criterio || undefined }, { pagina, tamano: 20 }, s),
    [criterio, pagina],
    enPanel || (enLista && tipo === 'anuncio'),
  );

  /* La ficha: el mismo endpoint con el número, que es lo que hace que la fila
     traiga además su historial, sus duplicados y sus cinco secciones. */
  const fichaLicencia = useRecurso(
    (s) => listarLicencias({ nroLicencia: abierto! }, { tamano: 1 }, s),
    [abierto],
    enFicha && tipo === 'funcionamiento',
  );
  const fichaFue = useRecurso(
    (s) => listarFue({ nroExpediente: abierto! }, { tamano: 1 }, s),
    [abierto],
    enFicha && tipo === 'edificacion',
  );
  const fichaAnuncio = useRecurso(
    (s) => listarAnuncios({ nroAutorizacion: abierto! }, { tamano: 1 }, s),
    [abierto],
    enFicha && tipo === 'anuncio',
  );

  const lic: Licencia | null = fichaLicencia.datos?.contenido[0] ?? null;
  const fue: Fue | null = fichaFue.datos?.contenido[0] ?? null;
  const anu: Anuncio | null = fichaAnuncio.datos?.contenido[0] ?? null;

  /* ── Los catálogos ──────────────────────────────────────────── */

  const catCriterio = useRebote(catQ.trim());
  const ciiu = useRecurso(
    (s) => listarCiiu({ descripcion: catCriterio || undefined }, { tamano: 50 }, s),
    [catCriterio],
    enPanel || (dest === 'catalogos' && catTab === 0),
  );
  const certificados = useRecurso(
    (s) => listarCertificados({ predio: catCriterio || undefined }, { tamano: 50 }, s),
    [catCriterio],
    enPanel || (dest === 'catalogos' && catTab === 1),
  );

  /* ── El centro de reportes ──────────────────────────────────── */

  const hoja = HOJAS[Math.min(hojaIdx, HOJAS.length - 1)]!;
  const enReportes = dest === 'reportes';

  const padronLic = useRecurso(
    (s) =>
      padronDeLicencias(
        {
          estado: val('rEstado') || undefined,
          tipoLic: val('rTipoLic') || undefined,
          ciiu: val('rCiiu') || undefined,
          aLaFecha: val('rALaFecha') || undefined,
          tamano: 20,
        },
        s,
      ),
    [val('rEstado'), val('rTipoLic'), val('rCiiu'), val('rALaFecha')],
    (enPanel || enReportes) && (enPanel || hojaIdx === 0),
  );
  const resumen = useRecurso(
    (s) => resumenAnualDeLicencias({ desdeElAno: val('rDesdeAno') || undefined, hastaElAno: val('rHastaAno') || undefined, tipoDeLicencia: val('rTipoLic2') || undefined }, s),
    [val('rDesdeAno'), val('rHastaAno'), val('rTipoLic2')],
    enReportes && hojaIdx === 1,
  );
  const repEdif = useRecurso(
    (s) =>
      reporteDeEdificacion(
        { desde: val('rDesde') || undefined, hasta: val('rHasta') || undefined, modalidad: val('rModalidad') || undefined, estado: val('rEstadoFue') || undefined },
        { tamano: 20 },
        s,
      ),
    [val('rDesde'), val('rHasta'), val('rModalidad'), val('rEstadoFue')],
    enReportes && hojaIdx === 2,
  );
  const padronAnu = useRecurso(
    (s) =>
      padronDeAnuncios(
        {
          claseAnuncio: val('rClase') || undefined,
          direccion: val('rDireccion') || undefined,
          aLaFecha: val('rALaFecha2') || undefined,
          tamano: 20,
        },
        s,
      ),
    [val('rClase'), val('rDireccion'), val('rALaFecha2')],
    enReportes && hojaIdx === 3,
  );

  useEffect(() => {
    if (padronLic.datos) setPadronRecordado({ vigentes: padronLic.datos.vigentes, aLaFecha: padronLic.datos.aLaFecha });
  }, [padronLic.datos]);

  /* ── Las dos escrituras que esta interfaz sirve ──────────────── */

  const puedeCiiu = val('cCodigo').trim() !== '' && val('cDesc').trim() !== '' && val('cObs').trim() !== '' && !guardando;
  const motivoCiiu =
    val('cCodigo').trim() === ''
      ? 'Falta el código CIIU: es la clave del catálogo.'
      : val('cDesc').trim() === ''
        ? 'Falta la descripción de la actividad.'
        : val('cObs').trim() === ''
          ? 'Falta la observación: toda modificación de datos se guarda con el motivo de quien la hace (RNF-052).'
          : '';

  const altaDeCiiu = async () => {
    setGuardando(true);
    setFallo(null);
    try {
      const r = await registrarCiiu({
        codigo: val('cCodigo').trim(),
        descripcion: val('cDesc').trim(),
        seccion: val('cSeccion').trim() || undefined,
        riesgoItse: val('cRiesgo') || undefined,
        zonificacionCompatible: val('cZonificacion').trim() || undefined,
        requiereSectorial: val('cSectorial') === 'Sí',
        observacion: val('cObs').trim(),
      });
      setHecho(`Giro ${r.codigo} agregado al catálogo. Nace activo y marcado como extendido por la municipalidad.`);
      setVals((x) => ({ ...x, cCodigo: '', cDesc: '', cObs: '' }));
      ciiu.reintentar();
      toast(`Giro ${r.codigo} agregado.`);
    } catch (f) {
      setFallo(f instanceof ErrorDeApi ? f : new ErrorDeApi('ERROR_INTERNO', 'No se pudo guardar', 0));
    } finally {
      setGuardando(false);
    }
  };

  /* El trámite elegido decide si la petición tiene que nombrar una licencia
     anterior. Sale del enumerado, no de una lista escrita aquí. */
  const tramiteElegido = TRAMITES_DE_EDIFICACION.find((t) => t.nombre === val('fTramite'));

  const puedeFue =
    val('fExp').trim() !== '' &&
    val('fContrib').trim() !== '' &&
    val('fTramite') !== '' &&
    val('fObra') !== '' &&
    val('fModalidad') !== '' &&
    (!tramiteElegido?.exigeOriginal || val('fLicenciaAnterior').trim() !== '') &&
    val('fObs').trim() !== '' &&
    !guardando;
  const motivoFue =
    val('fExp').trim() === ''
      ? 'Falta el número de expediente de mesa de partes: es lo que identifica el formulario.'
      : val('fContrib').trim() === ''
        ? 'Falta el código del administrado. Es el del padrón, no su documento: el backend lo resuelve con él y contesta 404 si no está.'
        : val('fTramite') === ''
          ? 'Falta el tipo de trámite: decide si el formulario puede llegar a licencia y si nombra una anterior.'
          : val('fObra') === ''
            ? 'Falta el tipo de obra. El backend lo exige aunque su petición lo declare anulable: contesta «Falta el campo obligatorio ‹obra›».'
            : val('fModalidad') === ''
              ? 'Falta la modalidad de aprobación, que el backend exige igual que la obra.'
              : tramiteElegido?.exigeOriginal && val('fLicenciaAnterior').trim() === ''
                ? `Una ${tramiteElegido.etiqueta.toLowerCase()} nombra la licencia que amplía o prorroga, y no la sustituye. Sin ese número el backend contesta 404.`
                : val('fObs').trim() === ''
                  ? 'Falta la observación: toda modificación de datos se guarda con el motivo de quien la hace (RNF-052).'
                  : '';

  const altaDeFue = async () => {
    setGuardando(true);
    setFallo(null);
    try {
      const r = await presentarFue({
        nroExpediente: val('fExp').trim(),
        fechaDeclaracion: val('fFecha') || undefined,
        codContribuyente: val('fContrib').trim(),
        tipoTramite: val('fTramite'),
        obra: val('fObra'),
        modalidadAprobacion: val('fModalidad'),
        nroLicenciaAnterior: tramiteElegido?.exigeOriginal ? val('fLicenciaAnterior').trim() : undefined,
        solicitanteEsPropietario: val('fPropietario') === 'Sí',
        observacion: val('fObs').trim(),
      });
      setHecho(
        `Expediente ${r.nroExpediente} presentado. Le faltan ${r.seccionesFaltantes.length} de las cinco secciones del FUE: ${
          r.seccionesFaltantes.join(', ') || 'ninguna'
        }.`,
      );
      setVals((x) => ({ ...x, fExp: '', fObs: '' }));
      fues.reintentar();
      toast(`Expediente ${r.nroExpediente} presentado.`);
    } catch (f) {
      setFallo(f instanceof ErrorDeApi ? f : new ErrorDeApi('ERROR_INTERNO', 'No se pudo presentar', 0));
    } finally {
      setGuardando(false);
    }
  };

  /* ── Ruta, contexto y paleta ────────────────────────────────── */

  const rotulo: Record<string, string> = {
    panel: 'Panel del módulo',
    lista: 'Solicitudes',
    catalogos: 'Catálogos',
    reportes: 'Centro de reportes',
    alta: 'Nueva solicitud',
  };
  const miga = enFicha ? ['Autorizaciones', TRAMITES[tipo].label, abierto ?? ''] : ['Autorizaciones', rotulo[dest] ?? 'Autorizaciones'];
  const titulo = enFicha ? `${TRAMITES[tipo].label} ${abierto}` : (rotulo[dest] ?? 'Autorizaciones y licencias');

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Autorizaciones',
    ir: () => {
      setAbierto(null);
      onDest(o[1]);
    },
  }));

  const notasDeDestino: Record<string, string> = {};
  if (licencias.datos)
    notasDeDestino.lista = `${licencias.datos.totalElementos.toLocaleString('es-PE')} licencias de funcionamiento`;
  if (ciiu.datos) notasDeDestino.catalogos = `${ciiu.datos.totalElementos.toLocaleString('es-PE')} giros CIIU`;

  const contexto = enFicha
    ? {
        volver: { label: 'Solicitudes', onClick: () => setAbierto(null) },
        codigo: abierto ?? '',
        titular: lic?.contribuyente ?? fue?.nombreContribuyente ?? anu?.contribuyente ?? 'Cargando…',
        ubic: lic?.direccion ?? fue?.terreno?.direccion ?? anu?.direccion ?? '',
        derecha: (
          <span style={INS[tono(lic?.estado ?? fue?.estado ?? anu?.estado ?? '')]}>
            {lic?.estado ?? fue?.estado ?? anu?.estado ?? SIN_DATO}
          </span>
        ),
      }
    : undefined;

  /* Las pestañas de la ficha, distintas en cada trámite. */
  const TABS: string[] =
    tipo === 'funcionamiento'
      ? ['Licencia', 'Giros', 'Historial', 'Duplicados']
      : tipo === 'edificacion'
        ? ['Expediente', 'Requisitos', 'Valorización', 'Profesionales', 'Historial']
        : ['Autorización', 'Movimientos'];
  const tabIdx = Math.min(tab, TABS.length - 1);

  return (
    <Shell
      modulo="licencias"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      notasDeDestino={notasDeDestino}
      contexto={contexto}
      tarjeta={
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
            Autorizaciones vigentes
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>
            {padronLic.cargando && padronRecordado === null
              ? '…'
              : padronRecordado
                ? padronRecordado.vigentes.toLocaleString('es-PE')
                : SIN_DATO}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>
            {padronRecordado
              ? `Licencias de funcionamiento al ${padronRecordado.aLaFecha}`
              : 'Licencias de funcionamiento. El padrón se pide en el panel.'}
          </p>
          <p style={{ margin: '7px 0 0', paddingTop: 7, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            El recuento lo hace el padrón con un agregado, no sumando la página.
          </p>
        </div>
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {enPanel && (
          <>
            <p style={ENTRADILLA}>
              Los tres trámites —funcionamiento, edificación y anuncio— tienen la misma forma: requisitos, una
              autorización con vigencia y un estado que depende del día en que se pregunte.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que la municipalidad tiene autorizado</h2>
                <span style={META}>Ejercicio {pref.ejercicio}</span>
              </div>
              {(
                [
                  ['funcionamiento', 'Licencias de funcionamiento', cifraDe(licencias), TRAMITES.funcionamiento.ruta],
                  ['edificacion', 'Expedientes de edificación (FUE)', cifraDe(fues), TRAMITES.edificacion.ruta],
                  ['anuncio', 'Autorizaciones de anuncio', cifraDe(anuncios), TRAMITES.anuncio.ruta],
                ] as [TipoDeTramite, string, string, string][]
              ).map((r) => (
                <button
                  key={r[0]}
                  onClick={() => {
                    setTipo(r[0]);
                    onDest('lista');
                  }}
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
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{r[1]}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{r[3]}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ink)', flex: '0 0 auto' }}>{r[2]}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0 }}>
                {(
                  [
                    ['Vigentes', padronLic.datos ? String(padronLic.datos.vigentes) : SIN_DATO],
                    ['Vencidas', padronLic.datos ? String(padronLic.datos.vencidas) : SIN_DATO],
                    ['Canceladas', padronLic.datos ? String(padronLic.datos.canceladas) : SIN_DATO],
                    ['Giros CIIU', cifraDe(ciiu)],
                    ['Certificados', cifraDe(certificados)],
                  ] as [string, string][]
                ).map((c) => (
                  <div
                    key={c[0]}
                    style={{
                      padding: '14px 16px',
                      borderLeft: '1px solid var(--line)',
                      borderTop: '1px solid var(--line)',
                      margin: '-1px 0 0 -1px',
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{c[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{c[1]}</p>
                  </div>
                ))}
              </div>
              <p style={PIE}>
                Los tres primeros recuentos salen del padrón de licencias, que los calcula sobre todas las del criterio
                —no sobre la página— y con su fecha de corte. Los otros dos son el total de cada catálogo.
              </p>
            </section>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que el panel del artboard contaba y aquí no se cuenta</h2>
              </div>
              {LO_QUE_NO_SE_CUENTA.map((r) => (
                <div key={r[0]} style={{ display: 'flex', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 240 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{r[0]}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, textWrap: 'pretty' }}>{r[2]}</span>
                  </span>
                  <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)', textDecoration: 'line-through' }}>
                      {r[1]}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink-2)' }}>{SIN_DATO}</span>
                  </span>
                </div>
              ))}
              <p style={PIE}>
                Tachado, lo que el prototipo dibujaba. El módulo del manual no tiene una bandeja de solicitudes en
                evaluación: tiene tres padrones de autorizaciones ya otorgadas y un formulario que se completa por partes.
              </p>
            </section>
          </>
        )}

        {/* ══════════ SOLICITUDES ══════════ */}
        {enLista && !enFicha && (
          <>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              Tres padrones con la misma anatomía. Lo que los separa no es la pantalla: es qué le pide el TUPA a cada uno
              y cuál de los tres lleva el sistema.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  {(Object.keys(TRAMITES) as TipoDeTramite[]).map((t) => {
                    const on = tipo === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTipo(t)}
                        aria-pressed={on}
                        style={{
                          border: 0,
                          padding: '8px 15px',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: on ? 600 : 400,
                          background: on ? 'var(--accent)' : 'transparent',
                          color: on ? '#fff' : 'var(--ink-3)',
                        }}
                      >
                        {TRAMITES[t].label}
                      </button>
                    );
                  })}
                </div>
                <span style={{ flex: 1, minWidth: 12 }} />
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    tipo === 'funcionamiento'
                      ? 'Denominación comercial'
                      : tipo === 'edificacion'
                        ? 'Nombre del administrado'
                        : 'Dirección del anuncio'
                  }
                  style={{ ...IN, width: 260, flex: '0 0 auto' }}
                />
              </div>
              <p style={PIE}>
                Cada padrón admite los filtros que su controlador lee y ni uno más. En licencias son{' '}
                <code>nroLicencia</code>, <code>nExpediente</code>, <code>nombreDelContribuyente</code>,{' '}
                <code>denominacionComercial</code> y <code>direccion</code>: no hay filtro de estado ni de tipo, y los dos
                que faltan viven en el padrón del centro de reportes.
              </p>
            </section>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que el TUPA le pide a este trámite</h2>
                <span style={META}>{TRAMITES[tipo].modalidad}</span>
              </div>
              {TRAMITES[tipo].requisitos.map((r) => (
                <div key={r[0]} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{r[0]}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r[1]}</span>
                  </span>
                  <span style={INS[r[2] === 'Administrado' ? 'warn' : 'ok']}>{r[2]}</span>
                </div>
              ))}
              <p style={PIE}>
                {tipo === 'edificacion'
                  ? 'De los tres trámites este es el único cuyo cumplimiento lleva el sistema: el expediente publica sus documentos adjuntos con sus folios y las secciones que le faltan, y eso es la compuerta de verdad. Se ve al abrirlo, en «Requisitos».'
                  : 'Esta lista es de referencia y no es estado del sistema: el backend no lleva una tabla de requisitos de este trámite, así que marcar una casilla aquí no guardaría nada. La compuerta real que sí existe es la del FUE de edificación.'}
              </p>
            </section>

            {tipo === 'funcionamiento' &&
              (licencias.cargando || licencias.error || (licencias.datos?.contenido.length ?? 0) === 0 ? (
                <EstadoDeLectura
                  lectura={licencias}
                  ruta="GET /api/v1/licencias/funcionamiento"
                  vacio={
                    <>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        Ninguna licencia de funcionamiento
                      </p>
                      <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                        Emitir una exige el número del recibo del derecho de trámite ya pagado: el backend se lo pregunta
                        a tesorería y rechaza el que no lo respalde.
                      </p>
                    </>
                  }
                />
              ) : (
                <Tabla
                  titulo="Licencias de funcionamiento"
                  meta={`${licencias.datos!.contenido.length} de ${licencias.datos!.totalElementos.toLocaleString('es-PE')} · estado al ${licencias.datos!.contenido[0]!.estadoALaFecha}`}
                  cols={COLS_LICENCIAS}
                  min={1080}
                  insignia={8}
                  onFila={(i) => {
                    setAbierto(licencias.datos!.contenido[i]!.nroLicencia);
                    setTab(0);
                  }}
                  filas={licencias.datos!.contenido.map((l) => [
                    l.nroLicencia,
                    l.contribuyente,
                    l.denominacionComercial,
                    l.direccion,
                    l.tipoDeLicencia,
                    l.areaDelEstablecimiento,
                    l.fechaDeEmision,
                    l.fechaDeVencimiento ?? SIN_DATO,
                    l.estado,
                  ])}
                  nota="«Vence» sale «—» en las definitivas, que no caducan: es lo que el recurso publica, no una falta de dato. Ninguna columna de dinero: una licencia no lleva importes, y lo que se pagó por ella está en su recibo."
                />
              ))}

            {tipo === 'edificacion' &&
              (fues.cargando || fues.error || (fues.datos?.contenido.length ?? 0) === 0 ? (
                <EstadoDeLectura
                  lectura={fues}
                  ruta="GET /api/v1/licencias/edificacion"
                  vacio={
                    <>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        Ningún expediente de edificación
                      </p>
                      <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                        Presentar un FUE no otorga nada ni consume correlativo: da de alta el expediente con su cabecera,
                        y las cinco secciones se completan después.
                      </p>
                      <button onClick={() => onDest('alta')} className="hov-acento-2" style={{ ...BOTON_PRI, marginTop: 6, padding: '9px 18px' }}>
                        Presentar un FUE
                      </button>
                    </>
                  }
                />
              ) : (
                <Tabla
                  titulo="Expedientes de edificación"
                  meta={`${fues.datos!.contenido.length} de ${fues.datos!.totalElementos.toLocaleString('es-PE')} · estado al ${fues.datos!.contenido[0]!.estadoALaFecha}`}
                  cols={COLS_FUE}
                  min={1080}
                  insignia={7}
                  onFila={(i) => {
                    setAbierto(fues.datos!.contenido[i]!.nroExpediente);
                    setTab(0);
                  }}
                  filas={fues.datos!.contenido.map((f) => [
                    f.nroExpediente,
                    f.fechaDeclaracion,
                    f.nombreContribuyente,
                    f.tipoTramite,
                    f.obra ?? SIN_DATO,
                    f.modalidad ?? SIN_DATO,
                    f.nroLicencia ?? SIN_DATO,
                    f.estado,
                  ])}
                  nota="Aquí no hay columna de «Completo»: la fila de la grilla trae ese campo y la lista de secciones que faltan escritos fijos —«incompleto» y «no falta ninguna»— porque son detalle de la ficha. La compuerta se lee al abrir el expediente, que es donde el backend la calcula."
                />
              ))}

            {tipo === 'anuncio' &&
              (anuncios.cargando || anuncios.error || (anuncios.datos?.contenido.length ?? 0) === 0 ? (
                <EstadoDeLectura
                  lectura={anuncios}
                  ruta="GET /api/v1/autorizaciones/anuncios"
                  vacio={
                    <>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        Ninguna autorización de anuncio
                      </p>
                      <p style={{ margin: 0, maxWidth: '58ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                        Autorizar un anuncio genera de una vez la deuda por su tasa, y la tasa sale del conjunto sellado.
                        Con la ordenanza sin cargar el backend contesta 422 nombrando la llave que falta —
                        <code>TASA_ANUNCIO:&lt;CLASE&gt;</code>—, que es lo que tiene que pasar: un importe por omisión
                        autorizaría un panel por un sol.
                      </p>
                    </>
                  }
                />
              ) : (
                <Tabla
                  titulo="Autorizaciones de anuncio y propaganda"
                  meta={`${anuncios.datos!.contenido.length} de ${anuncios.datos!.totalElementos.toLocaleString('es-PE')} · estado al ${anuncios.datos!.contenido[0]!.estadoALaFecha}`}
                  cols={COLS_ANUNCIOS}
                  min={1100}
                  insignia={8}
                  onFila={(i) => {
                    setAbierto(anuncios.datos!.contenido[i]!.nroAutorizacion);
                    setTab(0);
                  }}
                  filas={anuncios.datos!.contenido.map((a) => [
                    a.nroAutorizacion,
                    a.contribuyente,
                    a.claseAnuncio,
                    a.tipoAnuncio,
                    a.direccion,
                    a.area,
                    a.fecVenc ?? SIN_DATO,
                    importe(a.tasaDevengada),
                    a.estado,
                  ])}
                  nota="La tasa devengada viaja con la fecha a la que está: es una cifra que crece con los ejercicios que el anuncio lleva vigente, y sin su fecha diría otra cosa el año que viene."
                />
              ))}

            {/* La paginación solo cuando hay algo que paginar: con la tabla vacía
                el «Siguiente» prometía una segunda página de nada. */}
            {((tipo === 'funcionamiento' && (licencias.datos?.contenido.length ?? 0) > 0) ||
              (tipo === 'edificacion' && (fues.datos?.contenido.length ?? 0) > 0) ||
              (tipo === 'anuncio' && (anuncios.datos?.contenido.length ?? 0) > 0)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0} style={{ ...BOTON_SEC, opacity: pagina === 0 ? 0.5 : 1 }}>
                  Anterior
                </button>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Página {pagina + 1}</span>
                <button onClick={() => setPagina((p) => p + 1)} style={BOTON_SEC}>
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════ LA FICHA ══════════ */}
        {enFicha && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {TABS.map((t, i) => {
                const on = tabIdx === i;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(i)}
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
                    {t}
                  </button>
                );
              })}
            </div>

            {/* — Licencia de funcionamiento — */}
            {tipo === 'funcionamiento' && !lic && (
              <EstadoDeLectura
                lectura={fichaLicencia}
                ruta="GET /api/v1/licencias/funcionamiento?nroLicencia="
                vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No hay ninguna licencia con el número {abierto}.</p>}
              />
            )}
            {tipo === 'funcionamiento' && lic && (
              <>
                {tabIdx === 0 && (
                  <Datos
                    titulo="Datos de la licencia"
                    nota={`El estado está derivado al ${lic.estadoALaFecha}: el de una temporal depende del día, así que «${lic.estado}» sin su fecha significaría otra cosa mañana.`}
                    filas={[
                      ['Nº de licencia', lic.nroLicencia],
                      ['Estado', `${lic.estado} (${lic.est})`],
                      ['Titular', `${lic.codContribuyente} — ${lic.contribuyente}`],
                      ['Denominación comercial', lic.denominacionComercial],
                      ['Dirección', lic.direccion],
                      ['Tipo de licencia', lic.tipoDeLicencia],
                      ['Área del establecimiento', `${lic.areaDelEstablecimiento} m²`],
                      ['Zonificación', lic.zonificacion ?? SIN_DATO],
                      ['Aforo', lic.aforo === null ? SIN_DATO : String(lic.aforo)],
                      ['Fecha de emisión', lic.fechaDeEmision],
                      ['Vigencia hasta', lic.fechaDeVencimiento ?? `${SIN_DATO} (indeterminada)`],
                      ['Nº de expediente', lic.nExpediente ?? SIN_DATO],
                      ['Fecha del expediente', lic.fechaDeExpediente ?? SIN_DATO],
                      ['Ficha económica', lic.fichaEconomica === null ? SIN_DATO : String(lic.fichaEconomica)],
                    ]}
                  />
                )}
                {tabIdx === 1 && (
                  <Tabla
                    titulo="Giros autorizados"
                    meta={`${lic.giros.length} giros`}
                    cols={COLS_GIROS}
                    min={640}
                    filas={lic.giros.map((g) => [g.codigo, g.descripcion ?? SIN_DATO, g.principal ? 'Sí' : 'No', g.activo ? 'Sí' : 'No'])}
                    nota="La descripción del giro sale del catálogo CIIU. Un giro cuyo código no esté en el catálogo llega con la descripción vacía, y sale «—»."
                  />
                )}
                {tabIdx === 2 && (
                  <Tabla
                    titulo="Historial de la licencia"
                    meta={`${lic.historial.length} movimientos`}
                    cols={COLS_HISTORIAL_LIC}
                    min={860}
                    filas={lic.historial.map((h) => [h.tipo, h.fecha, h.motivo ?? SIN_DATO, h.resolucion, h.observacion])}
                    nota="Una licencia no se corrige: se cancela con resolución y se emite otra. `licencia_funcionamiento` no admite UPDATE desde V37."
                  />
                )}
                {tabIdx === 3 && (
                  <Tabla
                    titulo="Duplicados autorizados"
                    meta={`${lic.duplicados.length} duplicados`}
                    cols={COLS_DUPLICADOS}
                    min={600}
                    filas={lic.duplicados.map((d) => [String(d.numero), d.fecha, d.motivo, String(d.reimpresion)])}
                    nota="El duplicado conserva el número de la licencia original y lleva su propio ordinal, que es lo que permite distinguir dos papeles que dicen lo mismo."
                  />
                )}
              </>
            )}

            {/* — FUE de edificación — */}
            {tipo === 'edificacion' && !fue && (
              <EstadoDeLectura
                lectura={fichaFue}
                ruta="GET /api/v1/licencias/edificacion?nroExpediente="
                vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No hay ningún expediente con el número {abierto}.</p>}
              />
            )}
            {tipo === 'edificacion' && fue && (
              <>
                {!fue.completo && (
                  <Franja tono="warn">
                    Al expediente le faltan {fue.seccionesFaltantes.length} de las cinco secciones del FUE:{' '}
                    {fue.seccionesFaltantes
                      .map((s) => SECCIONES_DEL_FUE.find((x) => x.nombre === s)?.etiqueta ?? s)
                      .join(', ')}
                    . Es la compuerta: sin ellas no se puede emitir la licencia.
                  </Franja>
                )}
                {tabIdx === 0 && (
                  <>
                    <Datos
                      titulo="Datos del expediente"
                      nota={`Presentar un FUE no otorga nada: no numera ninguna licencia ni comprueba ningún derecho de trámite. Las dos cosas pasan al emitir. Estado derivado al ${fue.estadoALaFecha}.`}
                      filas={[
                        ['Nº de expediente', fue.nroExpediente],
                        ['Fecha de declaración', fue.fechaDeclaracion],
                        ['Estado', `${fue.estado} (${fue.est})`],
                        ['Administrado', `${fue.contribuyente} — ${fue.nombreContribuyente}`],
                        ['Tipo de trámite', fue.tipoTramite],
                        ['Obra', fue.obra ?? SIN_DATO],
                        ['Modalidad', fue.modalidad ?? SIN_DATO],
                        ['Revisión del proyecto', fue.revision ?? SIN_DATO],
                        ['Nº de licencia', fue.nroLicencia ?? SIN_DATO],
                        ['Expediente anterior', fue.nroExpedienteAnterior ?? SIN_DATO],
                        ['Solicitante es propietario', fue.solicitanteEsPropietario ? 'Sí' : 'No'],
                        ['Representante legal', fue.representanteLegal?.nombre ?? SIN_DATO],
                      ]}
                    />
                    {fue.terreno && (
                      <Datos
                        titulo={`Datos del terreno (versión ${fue.terreno.version})`}
                        filas={[
                          ['Código catastral', fue.terreno.codCatastral ?? SIN_DATO],
                          ['Dirección', fue.terreno.direccion ?? SIN_DATO],
                          ['Manzana / lote', `${fue.terreno.mz ?? SIN_DATO} / ${fue.terreno.lt ?? SIN_DATO}`],
                          ['Área del terreno', fue.terreno.areaDelTerrenoM ? `${fue.terreno.areaDelTerrenoM} m²` : SIN_DATO],
                          ['Zonificación', fue.terreno.zonificacion ?? SIN_DATO],
                          ['Partida registral', fue.terreno.partidaRegistral ?? SIN_DATO],
                          ['Frente / fondo', `${fue.terreno.frenteM ?? SIN_DATO} / ${fue.terreno.fondoM ?? SIN_DATO}`],
                        ]}
                      />
                    )}
                    {fue.proyecto && (
                      <Datos
                        titulo={`Características del proyecto (versión ${fue.proyecto.version})`}
                        filas={[
                          ['Uso de la edificación', fue.proyecto.usoDeLaEdificacion ?? SIN_DATO],
                          ['Nº de pisos', fue.proyecto.nDePisos === null ? SIN_DATO : String(fue.proyecto.nDePisos)],
                          ['Área techada total', fue.proyecto.areaTechadaTotalM ? `${fue.proyecto.areaTechadaTotalM} m²` : SIN_DATO],
                          ['Área libre', fue.proyecto.areaLibreM ? `${fue.proyecto.areaLibreM} m²` : SIN_DATO],
                          ['Estacionamientos', fue.proyecto.nDeEstacionamientos === null ? SIN_DATO : String(fue.proyecto.nDeEstacionamientos)],
                          ['Plazo de ejecución', fue.proyecto.plazoDeEjecucionMeses === null ? SIN_DATO : `${fue.proyecto.plazoDeEjecucionMeses} meses`],
                        ]}
                      />
                    )}
                  </>
                )}
                {tabIdx === 1 && (
                  <>
                    <Tabla
                      titulo="Documentos adjuntos declarados"
                      meta={`${fue.documentos.filter((d) => d.presentado).length} de ${fue.documentos.length} presentados`}
                      cols={COLS_DOCUMENTOS}
                      min={640}
                      insignia={1}
                      filas={fue.documentos.map((d) => [d.requisito, d.presentado ? 'Sí' : 'No', d.folios === null ? SIN_DATO : String(d.folios)])}
                      nota="Esta es la única lista de requisitos que el sistema lleva de verdad, y viene del expediente: el requisito con el nombre que el TUPA le da, si se presentó y con cuántos folios."
                    />
                    <Tabla
                      titulo="Secciones del FUE"
                      cols={[['Sección', 0], ['Estado', 0]]}
                      min={420}
                      insignia={1}
                      filas={SECCIONES_DEL_FUE.map((s) => [s.etiqueta, fue.seccionesFaltantes.includes(s.nombre) ? 'No' : 'Sí'])}
                      nota="Las cinco se completan por partes, cada una cuando el administrado la trae. Exigirlas al presentar haría imposible el trámite tal como el manual lo dibuja."
                    />
                  </>
                )}
                {tabIdx === 2 && (
                  <>
                    {fue.valorDeObra === null && (
                      <Franja tono="warn">
                        El valor de obra sale «{SIN_DATO}» y no cero: {puntoFinal(fue.valorDeObraNoDisponible ?? 'no se pudo resolver')}
                        {fue.llaveQueFalta ? ` Falta la llave ${fue.llaveQueFalta}.` : ''} Un «valor de obra 0,00» es
                        indistinguible de uno correcto cuando llega al papel que se exhibe en la obra, y es la base sobre
                        la que se liquida el derecho de trámite.
                      </Franja>
                    )}
                    <Tabla
                      titulo="Valorización por pisos y estructuras"
                      meta={`${fue.valorizacion.length} líneas`}
                      cols={COLS_VALORIZACION}
                      min={560}
                      filas={fue.valorizacion.map((v) => [String(v.piso), v.partida, v.categoria, v.areaM])}
                      totales={[
                        [
                          fue.valorDeObra ? `Valor de obra al ${fue.valorDeObra.actualizadoA}` : 'Valor de obra',
                          fue.valorDeObra ? fue.valorDeObra.importe : SIN_DATO,
                          1,
                        ],
                      ]}
                      nota="Las líneas no llevan importe, y no se admite ninguno: el valor por metro cuadrado sale del cuadro de valores unitarios, y aceptarlo del cliente dejaría que quien teclea eligiera cuánto vale la obra."
                    />
                    <Tabla
                      titulo="Vigencias de la licencia"
                      cols={COLS_VIGENCIAS}
                      min={420}
                      filas={fue.vigencias.map((v) => [String(v.tramo), v.desde, v.hasta])}
                      nota="Una revalidación no reemplaza el tramo anterior: abre el siguiente, que empieza el día después del que terminaba."
                    />
                  </>
                )}
                {tabIdx === 3 && (
                  <Tabla
                    titulo="Proyectistas y responsable de obra"
                    meta={`${fue.profesionales.length} profesionales`}
                    cols={COLS_PROFESIONALES}
                    min={700}
                    filas={fue.profesionales.map((p) => [p.tipo, p.nombre, p.colegio ?? SIN_DATO, p.colegiatura ?? SIN_DATO])}
                  />
                )}
                {tabIdx === 4 && (
                  <Tabla
                    titulo="Historial del expediente"
                    meta={`${fue.historial.length} movimientos`}
                    cols={COLS_HISTORIAL_FUE}
                    min={860}
                    filas={fue.historial.map((h) => [h.tipo, h.fecha, h.nroLicencia ?? SIN_DATO, h.motivo ?? SIN_DATO, h.resolucion ?? SIN_DATO])}
                  />
                )}
              </>
            )}

            {/* — Anuncio — */}
            {tipo === 'anuncio' && !anu && (
              <EstadoDeLectura
                lectura={fichaAnuncio}
                ruta="GET /api/v1/autorizaciones/anuncios?nroAutorizacion="
                vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No hay ninguna autorización con el número {abierto}.</p>}
              />
            )}
            {tipo === 'anuncio' && anu && (
              <>
                {tabIdx === 0 && (
                  <Datos
                    titulo="Datos de la autorización"
                    nota={`Estado derivado al ${anu.estadoALaFecha}. La tasa devengada crece con los ejercicios que el anuncio lleva vigente, y por eso viaja con su fecha.`}
                    filas={[
                      ['Nº de autorización', anu.nroAutorizacion],
                      ['Estado', `${anu.estado} (${anu.est})`],
                      ['Titular', `${anu.codContribuyente} — ${anu.contribuyente}`],
                      ['Documento del titular', anu.documentoDelTitular],
                      ['Nº de licencia asociada', anu.nroLicencia ?? SIN_DATO],
                      ['Clase', anu.claseAnuncio],
                      ['Tipo', anu.tipoAnuncio],
                      ['Ubicación', anu.ubicacion ?? SIN_DATO],
                      ['Forma', anu.forma ?? SIN_DATO],
                      ['Denominación', anu.denominacion ?? SIN_DATO],
                      ['Dirección', anu.direccion],
                      ['Área', `${anu.area} m²`],
                      ['Nº de lados', anu.nroLados === null ? SIN_DATO : String(anu.nroLados)],
                      ['Cantidad', anu.cantidad === null ? SIN_DATO : String(anu.cantidad)],
                      ['Vigente desde', anu.fecInicio],
                      ['Vence', anu.fecVenc ?? SIN_DATO],
                      [
                        anu.tasaDevengada ? `Tasa devengada al ${anu.tasaDevengada.actualizadoA}` : 'Tasa devengada',
                        importe(anu.tasaDevengada),
                      ],
                    ]}
                  />
                )}
                {tabIdx === 1 && (
                  <Tabla
                    titulo="Movimientos de la autorización"
                    meta={`${anu.historial.length} movimientos`}
                    cols={COLS_MOV_ANUNCIO}
                    min={960}
                    filas={anu.historial.map((m) => [
                      m.tipo,
                      m.fecha,
                      String(m.ejercicio),
                      m.referenciaDelCargo ?? SIN_DATO,
                      importe(m.tasa),
                      m.fecVenc ?? SIN_DATO,
                      m.motivo ?? SIN_DATO,
                    ])}
                    nota="Cada renovación asienta su propio cargo por la tasa del ejercicio, y la referencia del cargo es la que permite encontrarlo en el libro. Dos renovaciones son dos peticiones legítimamente distintas: lo que impide cobrar dos veces la misma es la unicidad del cargo, no un botón."
                  />
                )}
              </>
            )}
          </>
        )}

        {/* ══════════ NUEVA SOLICITUD ══════════ */}
        {esAlta && (
          <>
            <p style={ENTRADILLA}>
              De los tres trámites, el único que se puede empezar aquí es el FUE de edificación: presentarlo{' '}
              <b>no otorga nada</b>, no numera ninguna licencia y no comprueba ningún derecho de trámite.
            </p>

            <Franja tono="neutro">
              Los otros dos no empiezan con una solicitud sino con el acto que autoriza, y los dos exigen algo que
              todavía no hay. La licencia de funcionamiento pide el número del recibo del derecho ya pagado —el backend
              se lo pregunta a tesorería y rechaza el que no lo respalde—, y el anuncio genera de una vez la deuda por su
              tasa, que sale del conjunto sellado y hoy no está cargado (D-02b).
            </Franja>

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  Presentar un Formulario Único de Edificaciones
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '78ch', textWrap: 'pretty' }}>
                  Se registra la cabecera —el expediente, el administrado y el representante legal— y nada más. El
                  terreno, el proyecto, la valorización, los profesionales y los documentos se completan después, cada
                  uno cuando el administrado lo trae.
                </p>
              </div>
              <Formulario
                val={val}
                set={set}
                defs={[
                  { k: 'fExp', l: 'Nº de expediente', ph: '2026-0007', ayuda: 'El de mesa de partes. Es la clave del formulario y no se puede repetir.' },
                  { k: 'fFecha', l: 'Fecha de declaración', t: 'date', ayuda: 'Si se deja en blanco, hoy.' },
                  {
                    k: 'fContrib',
                    l: 'Cód. del administrado',
                    ph: 'C-000001',
                    ayuda: 'El código del padrón, no el documento: el backend lo resuelve con él y contesta 404 si no está.',
                  },
                  {
                    k: 'fTramite',
                    l: 'Tipo de trámite',
                    t: 'sel',
                    o: ['', ...TRAMITES_DE_EDIFICACION.map((t) => t.nombre)],
                    ayuda: tramiteElegido
                      ? `${tramiteElegido.etiqueta}. ${tramiteElegido.emiteLicencia ? 'De este trámite sale una licencia con su número.' : 'De este trámite NO sale licencia: se resuelve con una conformidad.'}`
                      : 'Los cinco de TipoDeTramiteDeEdificacion.',
                  },
                  {
                    k: 'fObra',
                    l: 'Tipo de obra',
                    t: 'sel',
                    o: ['', 'EDIFICACION_NUEVA', 'AMPLIACION', 'REMODELACION', 'DEMOLICION', 'CERCO', 'PUESTA_EN_VALOR'],
                    ayuda: 'Obligatorio. Los seis de TipoDeObra: el prototipo ofrecía «DEMOLICIÓN TOTAL», que el enumerado no tiene.',
                  },
                  {
                    k: 'fModalidad',
                    l: 'Modalidad de aprobación',
                    t: 'sel',
                    o: ['', ...MODALIDADES.map((m) => m.nombre)],
                    ayuda: 'Obligatoria. ' + MODALIDADES.map((m) => `${m.nombre}: ${m.etiqueta}`).join(' · '),
                  },
                  ...(tramiteElegido?.exigeOriginal
                    ? [
                        {
                          k: 'fLicenciaAnterior',
                          l: 'Nº de la licencia que amplía o prorroga',
                          ayuda: 'Obligatorio en la ampliación y en la revalidación: el expediente nombra la original y no la sustituye. Una licencia que no exista da 404.',
                        },
                      ]
                    : []),
                  { k: 'fPropietario', l: 'El solicitante es el propietario', t: 'sel', o: ['No', 'Sí'] },
                  {
                    k: 'fObs',
                    l: 'Observación',
                    t: 'area',
                    ancho: true,
                    ph: 'Por qué se registra',
                    ayuda: 'Obligatoria (regla 10, RNF-052). Sin ella el backend rechaza.',
                  },
                ]}
              />
            </section>

            {hecho && <Franja tono="ok">{hecho}</Franja>}
            {fallo && (
              <Franja tono="bad">
                {fallo.mensaje}
                {fallo.incidencia ? ` · ref ${fallo.incidencia}` : ''}
              </Franja>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {motivoFue || 'Se dará de alta el expediente con su cabecera; las cinco secciones se completan después.'}
              </p>
              <button
                onClick={puedeFue ? altaDeFue : () => toast(motivoFue)}
                aria-disabled={!puedeFue}
                title={motivoFue || undefined}
                className="hov-acento-2"
                style={{ ...BOTON_PRI, opacity: puedeFue ? 1 : 0.55 }}
              >
                {guardando ? 'Presentando…' : 'Presentar el formulario'}
              </button>
            </div>
          </>
        )}

        {/* ══════════ CATÁLOGOS ══════════ */}
        {dest === 'catalogos' && (
          <>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              Dos catálogos que sostienen a los tres trámites: el de giros, que decide el riesgo y la modalidad de una
              licencia, y el de certificados, que es lo que el administrado se lleva.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  {['Catálogo CIIU', 'Certificados'].map((t, i) => {
                    const on = catTab === i;
                    return (
                      <button
                        key={t}
                        onClick={() => setCatTab(i)}
                        aria-pressed={on}
                        style={{
                          border: 0,
                          padding: '8px 15px',
                          cursor: 'pointer',
                          fontSize: 12.5,
                          fontWeight: on ? 600 : 400,
                          background: on ? 'var(--accent)' : 'transparent',
                          color: on ? '#fff' : 'var(--ink-3)',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <span style={{ flex: 1, minWidth: 12 }} />
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={catQ}
                  onChange={(e) => setCatQ(e.target.value)}
                  placeholder={catTab === 0 ? 'Descripción de la actividad' : 'Código predial'}
                  style={{ ...IN, width: 260, flex: '0 0 auto' }}
                />
              </div>
            </section>

            {catTab === 0 && (
              <>
                {ciiu.cargando || ciiu.error || (ciiu.datos?.contenido.length ?? 0) === 0 ? (
                  <EstadoDeLectura
                    lectura={ciiu}
                    ruta="GET /api/v1/licencias/ciiu"
                    vacio={
                      <>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>El catálogo está vacío</p>
                        <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                          Nada carga el catálogo nacional de giros en una instalación nueva: se extiende giro a giro
                          desde aquí, y cada uno nace marcado como extendido por la municipalidad.
                        </p>
                      </>
                    }
                  />
                ) : (
                  <Tabla
                    titulo="Catálogo CIIU de giros"
                    meta={`${ciiu.datos!.contenido.length} de ${ciiu.datos!.totalElementos.toLocaleString('es-PE')}`}
                    cols={COLS_CIIU}
                    min={1040}
                    insignia={3}
                    filas={ciiu.datos!.contenido.map((c) => [
                      c.codigo,
                      c.descripcion,
                      c.seccion ?? SIN_DATO,
                      c.riesgoItse ?? SIN_DATO,
                      c.zonificacionCompatible ?? SIN_DATO,
                      c.requiereSectorial ? 'Sí' : 'No',
                      c.extendido ? 'Municipal' : 'Nacional',
                    ])}
                    nota="No hay forma de corregir un giro: el catálogo se extiende, no se edita. Editar uno ya citado por licencias emitidas cambiaría lo que dice el papel de esas licencias sin dejar traza."
                  />
                )}

                <section style={TARJETA}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Agregar un giro</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '78ch', textWrap: 'pretty' }}>
                      Nace activo y marcado como extendido por la municipalidad. Ni «activo» ni «extendido» se pueden
                      elegir: aceptarlos del cliente permitiría dar de alta un giro ya retirado, que sería un alta y una
                      baja en un solo acto con la auditoría diciendo solo ALTA.
                    </p>
                  </div>
                  <Formulario
                    val={val}
                    set={set}
                    defs={[
                      { k: 'cCodigo', l: 'Código CIIU', ph: 'G-5211-01' },
                      { k: 'cSeccion', l: 'Sección', ph: 'G', ayuda: 'Una letra. El desplegable del manual dice «G — COMERCIO»; el backend se queda con la letra.' },
                      { k: 'cRiesgo', l: 'Riesgo ITSE', t: 'sel', o: ['', ...RIESGOS_ITSE], ayuda: 'Los cuatro de RiesgoItse. Decide si la licencia es de aprobación automática.' },
                      { k: 'cSectorial', l: 'Requiere autorización sectorial', t: 'sel', o: ['No', 'Sí'] },
                      { k: 'cDesc', l: 'Descripción de la actividad', ancho: true, ph: 'VENTA AL POR MENOR EN ALMACENES NO ESPECIALIZADOS' },
                      { k: 'cZonificacion', l: 'Zonificación compatible', ancho: true },
                      { k: 'cObs', l: 'Observación', t: 'area', ancho: true, ayuda: 'Obligatoria (regla 10, RNF-052).' },
                    ]}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {motivoCiiu || 'El código no se puede repetir: un código ya usado da 409.'}
                    </p>
                    <button
                      onClick={puedeCiiu ? altaDeCiiu : () => toast(motivoCiiu)}
                      aria-disabled={!puedeCiiu}
                      title={motivoCiiu || undefined}
                      className="hov-acento-2"
                      style={{ ...BOTON_PRI, opacity: puedeCiiu ? 1 : 0.55 }}
                    >
                      {guardando ? 'Guardando…' : 'Agregar el giro'}
                    </button>
                  </div>
                </section>

                {hecho && <Franja tono="ok">{hecho}</Franja>}
                {fallo && (
                  <Franja tono="bad">
                    {fallo.mensaje}
                    {fallo.incidencia ? ` · ref ${fallo.incidencia}` : ''}
                  </Franja>
                )}
              </>
            )}

            {catTab === 1 && (
              <>
                {certificados.cargando || certificados.error || (certificados.datos?.contenido.length ?? 0) === 0 ? (
                  <EstadoDeLectura
                    lectura={certificados}
                    ruta="GET /api/v1/licencias/certificados"
                    vacio={
                      <>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún certificado emitido</p>
                        <p style={{ margin: 0, maxWidth: '58ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                          Emitir uno exige el número del recibo del derecho ya pagado, y su vigencia sale del conjunto
                          sellado del ejercicio. Ni el importe ni la vigencia se teclean: aceptarlos del cliente
                          convertiría dos datos que el sistema sabe en dos que se pueden teclear mal, y el segundo
                          acabaría impreso en el papel.
                        </p>
                      </>
                    }
                  />
                ) : (
                  <Tabla
                    titulo="Certificados emitidos"
                    meta={`${certificados.datos!.contenido.length} de ${certificados.datos!.totalElementos.toLocaleString('es-PE')}`}
                    cols={COLS_CERT}
                    min={1180}
                    insignia={8}
                    filas={certificados.datos!.contenido.map((c) => [
                      c.nCertificado,
                      c.tipoEtiqueta,
                      c.predio,
                      c.direccion,
                      c.solicitante,
                      c.fecha,
                      c.vigenciaHasta,
                      c.derechoS.importe,
                      c.estado,
                    ])}
                    nota="El derecho viaja con la fecha del cobro que lo acredita: sin ella, «S/ 35,00» no se puede defender el día que el TUPA suba la tarifa. Un certificado no se corrige —se sustituye emitiendo otro—."
                  />
                )}
                <Franja tono="neutro">
                  De los cuatro tipos que el backend emite —numeración, zonificación y vías, parámetros urbanísticos y
                  jurisdicción—, los dos primeros y el último se emiten con lo que la pantalla puede pedir. El de
                  parámetros urbanísticos consigna cinco valores que el manual dibuja de solo lectura y el backend espera
                  que alguien teclee, y emitirlo sin ellos gastaría el correlativo en un papel que dice que no los
                  consigna.
                </Franja>
              </>
            )}
          </>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {enReportes && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {HOJAS.map((h, i) => {
                const on = hojaIdx === i;
                return (
                  <button
                    key={h.label}
                    onClick={() => setHojaIdx(i)}
                    aria-pressed={on}
                    style={{
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                      borderRadius: 8,
                      padding: '9px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                      color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{h.g}</span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: on ? 600 : 400, marginTop: 2 }}>{h.label}</span>
                  </button>
                );
              })}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>{hoja.label}</h2>
                <span style={META}>{hoja.ruta}</span>
              </div>
              <p style={{ margin: 0, padding: '11px 16px', fontSize: 13, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>{hoja.sub}</p>
              {hojaIdx === 0 && (
                <Formulario
                  val={val}
                  set={set}
                  defs={[
                    { k: 'rEstado', l: 'Estado', t: 'sel', o: ['', ...ESTADOS_DE_LICENCIA], ayuda: 'Los tres de EstadoDeLicencia. El desplegable del manual ofrecía además ACTIVA y DUPLICADA, que el enumerado no tiene: «ACTIVA» se parece a VIGENTE y parecerse no es serlo.' },
                    { k: 'rTipoLic', l: 'Tipo de licencia', t: 'sel', o: ['', ...TIPOS_DE_LICENCIA], ayuda: 'Los tres de TipoDeLicencia. Quedan fuera INDETERMINADA, CESIONARIO y MERCADO, que el manual ofrecía.' },
                    { k: 'rCiiu', l: 'Giro (CIIU)' },
                    { k: 'rALaFecha', l: 'Fecha de corte', t: 'date', ayuda: 'No es un filtro: es el día al que se deriva el estado de cada fila. Reimprimir el padrón de marzo con su misma fecha da el mismo papel.' },
                  ]}
                />
              )}
              {hojaIdx === 1 && (
                <Formulario
                  val={val}
                  set={set}
                  defs={[
                    { k: 'rDesdeAno', l: 'Desde el año', ph: '2024' },
                    { k: 'rHastaAno', l: 'Hasta el año', ph: pref.ejercicio },
                    { k: 'rTipoLic2', l: 'Tipo de licencia', t: 'sel', o: ['', ...TIPOS_DE_LICENCIA] },
                  ]}
                />
              )}
              {hojaIdx === 2 && (
                <Formulario
                  val={val}
                  set={set}
                  defs={[
                    { k: 'rDesde', l: 'Desde', t: 'date' },
                    { k: 'rHasta', l: 'Hasta', t: 'date', ayuda: 'El extremo del rango es además la fecha de corte: un reporte «hasta el 31 de marzo» deriva el estado de cada licencia a ese día.' },
                    { k: 'rModalidad', l: 'Modalidad', t: 'sel', o: ['', ...MODALIDADES.map((m) => m.nombre)] },
                    { k: 'rEstadoFue', l: 'Estado', t: 'sel', o: ['', ...ESTADOS_DEL_FUE] },
                  ]}
                />
              )}
              {hojaIdx === 3 && (
                <Formulario
                  val={val}
                  set={set}
                  defs={[
                    { k: 'rClase', l: 'Clase de anuncio', t: 'sel', o: ['', ...CLASES_DE_ANUNCIO], ayuda: 'Las seis de ClaseDeAnuncio. «AVISO LUMINOSO», que el manual ofrecía aquí, no es una clase sino un tipo.' },
                    { k: 'rDireccion', l: 'Dirección' },
                    { k: 'rALaFecha2', l: 'Fecha de corte', t: 'date' },
                  ]}
                />
              )}
            </section>

            {hojaIdx === 0 &&
              (padronLic.cargando || padronLic.error || !padronLic.datos ? (
                <EstadoDeLectura
                  lectura={padronLic}
                  ruta="POST /api/v1/licencias/funcionamiento/reportes/padron"
                  vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>El padrón no devolvió nada.</p>}
                />
              ) : (
                <Tabla
                  titulo={`Padrón al ${padronLic.datos.aLaFecha}`}
                  meta={`${padronLic.datos.filas.length} de ${padronLic.datos.licencias}`}
                  cols={COLS_PADRON_LIC}
                  min={980}
                  insignia={5}
                  filas={padronLic.datos.filas.map((l) => [
                    l.nroLicencia,
                    l.contribuyente,
                    l.denominacionComercial,
                    l.giros.find((g) => g.principal)?.codigo ?? SIN_DATO,
                    l.direccion,
                    l.estado,
                  ])}
                  totales={[
                    ['Licencias', String(padronLic.datos.licencias), 0],
                    ['Vigentes', String(padronLic.datos.vigentes), 0],
                    ['Vencidas', String(padronLic.datos.vencidas), 0],
                    ['Canceladas', String(padronLic.datos.canceladas), 1],
                  ]}
                  nota={hoja.cierre}
                />
              ))}

            {hojaIdx === 1 &&
              (resumen.cargando || resumen.error || !resumen.datos ? (
                <EstadoDeLectura
                  lectura={resumen}
                  ruta="GET /api/v1/licencias/funcionamiento/reportes/resumen-anual"
                  vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>El resumen no devolvió ningún año.</p>}
                />
              ) : (
                <>
                  <Tabla
                    titulo={`Resumen al ${resumen.datos.aLaFecha}`}
                    meta={`${resumen.datos.filas.length} ejercicios`}
                    cols={COLS_RESUMEN}
                    min={860}
                    filas={resumen.datos.filas.map((f) => [
                      String(f.ano),
                      String(f.emitidas),
                      String(f.canceladas),
                      String(f.duplicados),
                      String(f.vigentesAlCierre),
                      f.derechoDeTramiteS ? f.derechoDeTramiteS.importe : SIN_DATO,
                    ])}
                    nota={hoja.cierre}
                  />
                  {resumen.datos.filas.some((f) => f.derechoNoDisponible) && (
                    <Franja tono="warn">
                      El derecho de trámite sale «{SIN_DATO}» en{' '}
                      {resumen.datos.filas.filter((f) => f.derechoNoDisponible).length} de los{' '}
                      {resumen.datos.filas.length} ejercicios, y el motivo lo dice el propio backend:{' '}
                      {puntoFinal(resumen.datos.filas.find((f) => f.derechoNoDisponible)!.derechoNoDisponible!)}
                    </Franja>
                  )}
                </>
              ))}

            {hojaIdx === 2 &&
              (repEdif.cargando || repEdif.error || (repEdif.datos?.contenido.length ?? 0) === 0 ? (
                <EstadoDeLectura
                  lectura={repEdif}
                  ruta="GET /api/v1/licencias/edificacion/reportes/general"
                  vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Ninguna licencia de edificación en ese criterio.</p>}
                />
              ) : (
                <Tabla
                  titulo="Licencias de edificación"
                  meta={`${repEdif.datos!.contenido.length} de ${repEdif.datos!.totalElementos.toLocaleString('es-PE')}`}
                  cols={COLS_REPORTE_EDIF}
                  min={1180}
                  insignia={8}
                  filas={repEdif.datos!.contenido.map((f) => [
                    f.nLicencia ?? SIN_DATO,
                    f.expediente,
                    f.fecha,
                    f.administrado,
                    f.predio ?? SIN_DATO,
                    f.modalidad ?? SIN_DATO,
                    f.areaAConstruirM ?? SIN_DATO,
                    f.valorDeObraS ? f.valorDeObraS.importe : SIN_DATO,
                    f.estado,
                  ])}
                  nota={hoja.cierre}
                />
              ))}

            {hojaIdx === 3 &&
              (padronAnu.cargando || padronAnu.error || !padronAnu.datos ? (
                <EstadoDeLectura
                  lectura={padronAnu}
                  ruta="POST /api/v1/autorizaciones/anuncios/reportes"
                  vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>El padrón no devolvió nada.</p>}
                />
              ) : (
                <Tabla
                  titulo={`Padrón de anuncios al ${padronAnu.datos.aLaFecha}`}
                  meta={`${padronAnu.datos.filas.length} de ${padronAnu.datos.autorizaciones}`}
                  cols={COLS_PADRON_ANUNCIOS}
                  min={980}
                  insignia={6}
                  filas={padronAnu.datos.filas.map((a) => [
                    a.nroAutorizacion,
                    a.contribuyente,
                    a.claseAnuncio,
                    a.direccion,
                    a.area,
                    a.fecVenc ?? SIN_DATO,
                    a.estado,
                  ])}
                  totales={[
                    ['Autorizaciones', String(padronAnu.datos.autorizaciones), 0],
                    [
                      padronAnu.datos.devengado ? `Devengado al ${padronAnu.datos.devengado.actualizadoA}` : 'Devengado',
                      importe(padronAnu.datos.devengado),
                      1,
                    ],
                  ]}
                  nota={hoja.cierre}
                />
              ))}
          </>
        )}
      </div>
    </Shell>
  );
}
