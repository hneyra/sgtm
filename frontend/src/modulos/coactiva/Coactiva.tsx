import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, Paginador, type Tono } from '../../ds/componentes';
import { usarPreferencias } from '../../shell/preferencias';
import { causasDelRechazo, tituloDelFallo } from '../../api/Fallo';
import {
  BANDEJA,
  COLS_ACTOS,
  COLS_COSTAS,
  COLS_DEUDA,
  COLS_DILIGENCIAS,
  COLS_IMPORTADOS,
  COLS_LISTA,
  COLS_OBLIGACIONES,
  COLS_VALORES,
  OPCIONES,
  POR_QUE_NO_HAY_COSTO_TASADO,
  POR_QUE_NO_SE_CASA_LA_COSTA,
  type ColDef,
} from '../../datos/coactiva';
import {
  ESTADOS_DEL_EXPEDIENTE,
  MEDIDAS_CAUTELARES,
  MODALIDADES_DE_NOTIFICACION,
  RESULTADOS_DE_NOTIFICACION,
  TIPOS_DE_ACTO,
  cambiarDireccionReferencial,
  cambiarEstado,
  deudaDelExpediente,
  importarValores,
  listarDeudas,
  listarDeudasEnBeneficio,
  listarExpedientes,
  listarLiquidaciones,
  listarValores,
  procesoDelExpediente,
  registrarActo,
  type Expediente,
  type TipoDeActo,
} from '../../api/coactiva';
import { useRebote, useRecurso, type Estado } from '../../api/useRecurso';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { hayPuerta } from '../../api/sesion';

/* Los estilos que el artboard declara una vez arriba y repite en cada tabla y
   en cada campo. Van literales: son los que hacen que la pantalla se vea
   igual que `Coactiva.dc.html`. */
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

/**
 * Si la observación llega a ser una observación.
 *
 * **No es «que no esté vacía».** `Observacion.de` exige al menos 5 caracteres
 * después de recortar —«La observacion debe explicar el cambio: al menos 5
 * caracteres, y no espacios en blanco (ADR-0008)»— y la tabla de auditoría lo
 * repite con un `CHECK (length(btrim(observacion)) >= 5)`, así que la barrera
 * está en los dos sitios y ninguno de los dos es la pantalla.
 *
 * Medido contra el backend en marcha: un cuerpo con `"observacion":"abcd"`
 * vuelve `422 VALIDACION` con ese mensaje. Con la guarda en `!== ''` la primaria
 * se encendía, la petición salía y el motivo lo tenía que leer quien atiende en
 * el error del servidor — que es justo lo que un botón que dice por qué está
 * apagado existe para ahorrar (RNF-082).
 */
const LARGO_MINIMO_DE_OBSERVACION = 5;

function observacionSuficiente(texto: string): boolean {
  return texto.trim().length >= LARGO_MINIMO_DE_OBSERVACION;
}

/** Lo que se le dice a quien todavía no puede guardar por la observación. */
function faltaLaObservacion(texto: string): string {
  return texto.trim() === ''
    ? 'Falta la observación: toda modificación de datos se guarda con el motivo de quien la hace (RNF-052).'
    : `La observación tiene que explicar el cambio: al menos ${LARGO_MINIMO_DE_OBSERVACION} caracteres (ADR-0008), y lleva ${texto.trim().length}.`;
}

/** El tono que le corresponde a un estado del procedimiento. */
function tono(txt: string): Tono {
  const t = String(txt).toLowerCase();
  /* «No» es la columna «Surtió efecto» de una diligencia: no es un error, pero
     es lo que deja el plazo sin empezar, y verlo en verde invita a darlo por
     notificado. */
  if (t === 'no') return 'warn';
  if (/iniciado|emitid|medida/.test(t)) return 'bad';
  if (/notificada|suspendido/.test(t)) return 'warn';
  return 'ok';
}

type Total = [string, string, 0 | 1];

function Cabeceras({ defs, hueco }: { defs: ColDef[]; hueco?: boolean }) {
  return (
    <tr>
      {hueco && <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />}
      {defs.map((c) => (
        <th key={c[0]} style={c[1] ? THN : TH}>
          {c[0]}
        </th>
      ))}
    </tr>
  );
}

/** La celda: la primera columna en mono fuerte, las numéricas a la derecha y
 *  la de estado como insignia. Es `celda()` del artboard. */
function celdas(vals: string[], defs: ColDef[], insigniaEn = -1, onClick?: () => void) {
  return vals.map((v, j) => (
    <td
      key={j}
      onClick={onClick}
      style={j === insigniaEn ? { padding: '11px 14px' } : j === 0 ? TD1 : defs[j] && defs[j][1] ? TDN : TD}
    >
      {j === insigniaEn ? <Insignia tono={tono(v)}>{v}</Insignia> : v}
    </td>
  ));
}

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

/** El aviso con filete de color a la izquierda. Es el `Guia` del artboard, y
 *  aquí sirve además para decir lo que el backend no publica. */
function Franja({
  tono: t = 'warn',
  children,
  derecha,
}: {
  tono?: 'ok' | 'warn' | 'bad' | 'neutro';
  children: ReactNode;
  derecha?: ReactNode;
}) {
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
        strokeWidth="1.8"
        strokeLinecap="round"
        style={{ color, flex: '0 0 auto', marginTop: 1 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.4v.02M12 11.4v4.2" />
      </svg>
      <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color, textWrap: 'pretty' }}>{children}</p>
      {derecha}
    </div>
  );
}

/**
 * Los tres estados de una lectura que no trae filas: cargando, caída y vacía.
 *
 * Están juntos porque la diferencia importa: una tabla vacía porque el servidor
 * no contestó y una vacía porque no hay expedientes se ven igual, y solo una de
 * las dos se arregla reintentando.
 */
function EstadoDeLectura({
  lectura,
  ruta,
  vacio,
  onToken,
}: {
  lectura: { cargando: boolean; error: ErrorDeApi | null; reintentar: () => void };
  ruta: string;
  vacio: ReactNode;
  onToken?: () => void;
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
        {/* El rótulo sale del sitio COMPARTIDO y no de una cadena de ternarios
            propia (#678). Las de módulo no tenían rama para
            `METODO_NO_ADMITIDO`, así que un 405 caía en su `else` y ocho
            pantallas decían del mismo hecho ocho cosas distintas —una de ellas
            prometiendo una referencia que no llegó—. Y `tsc` no podía ayudar:
            un ternario encadenado no es un `switch` exhaustivo, así que añadir
            un código al enumerado no rompe ninguna compilación. */}
        {tituloDelFallo(e, 'esta consulta')}
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
              onToken?.();
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

/**
 * Una opción de un desplegable: el valor a secas cuando lo que se manda y lo
 * que se lee coinciden, o `[valor, etiqueta]` cuando no. Lo segundo hace falta
 * en «Nuevo estado», donde lo que viaja es el nombre del enumerado
 * (`REC1_EMITIDA`) y lo que el manual imprime es «011 — REC 01 EMITIDO»:
 * enseñar el nombre interno sería enseñarle al operador una palabra que no
 * está en ninguna de sus pantallas.
 */
type OpcionDeCampo = string | readonly [valor: string, etiqueta: string];

type CampoDef = {
  k: string;
  l: string;
  t?: 'text' | 'sel' | 'date' | 'area' | 'ro';
  o?: readonly OpcionDeCampo[];
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
                {(f.o ?? []).map((o) => {
                  const valor = typeof o === 'string' ? o : o[0];
                  const etiqueta = typeof o === 'string' ? o : o[1];
                  return (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  );
                })}
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

/** Una tabla ya resuelta, con su cabecera y su pie. */
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
  accion,
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
  accion?: ReactNode;
}) {
  return (
    <section style={TARJETA}>
      <div style={CABECERA}>
        <h2 style={H2}>{titulo}</h2>
        {meta && <span style={META}>{meta}</span>}
        {accion}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
          <thead>
            <Cabeceras defs={cols} />
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr
                key={i}
                onClick={onFila ? () => onFila(i) : undefined}
                className={onFila ? 'hov-acento' : 'hov-elev'}
                style={{ borderTop: '1px solid var(--line)', cursor: onFila ? 'pointer' : undefined }}
              >
                {celdas(f, cols, insignia ?? -1)}
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

/** Cuánto cuenta una lectura de conteo, sin inventar un cero si falló. */
function cifraDe(r: Estado<{ totalElementos: number }>): string {
  if (r.cargando) return '…';
  if (r.error || !r.datos) return SIN_DATO;
  return r.datos.totalElementos.toLocaleString('es-PE');
}

/** La etiqueta del estado tal como el backend la escribe. */
function etiquetaDelEstado(nombre: string): string {
  return ESTADOS_DEL_EXPEDIENTE.find((e) => e.nombre === nombre)?.etiqueta ?? nombre;
}

/**
 * Los estados que el desplegable «Nuevo estado» ofrece: **seis de los siete**.
 *
 * `INICIADO` (`000`) queda fuera, y no es una traducción ni un recorte: es con
 * lo que nace el expediente al importar sus valores, y el invariante de
 * `MovimientoDelExpediente` lo dice con todas las letras —«Un expediente nace
 * INICIADO: el estado de su apertura no se elige»—. Ofrecerlo sería dejar
 * elegir un estado que sólo puede poner la apertura.
 *
 * Los otros seis **coinciden letra por letra** con lo que el prototipo de
 * `expediente_historial` dibuja —«011 — REC 01 EMITIDO», «012 — REC 01
 * NOTIFICADA», «021 — REC 02 EMITIDA», «031 — MEDIDA CAUTELAR», «041 —
 * SUSPENDIDO», «051 — CONCLUIDO»—, así que aquí **no hay ningún vocabulario que
 * traducir**: es el caso contrario al de #427 con «ACTIVA», medido cuadro
 * contra enumerado. Por eso la lista se **computa** del enumerado en vez de
 * escribirse a mano: un estado nuevo en el backend aparece solo, y uno que se
 * retire desaparece, sin que nadie tenga que acordarse.
 */
const ESTADOS_QUE_SE_ELIGEN = ESTADOS_DEL_EXPEDIENTE.filter((e) => e.nombre !== 'INICIADO');

/**
 * Las columnas del historial del expediente.
 *
 * Son las de `COLS_HISTORIAL` más las **dos que `MovimientoResource` publica y
 * la tabla no dibujaba**. Sin ellas un movimiento de tipo DIRECCION salía con
 * «—» en «Estado» —correcto: cambiar dónde se notifica no mueve el estado— y
 * **sin decir a qué dirección se cambió**, que es su único dato propio: la fila
 * se leía como un movimiento vacío. Y la observación con que se firmó cada uno
 * (regla 10, RNF-052) no se leía en ninguna parte de la interfaz.
 *
 * Viven aquí y no en `datos/coactiva.ts` por el aislamiento de esta rama, que
 * no alcanza a ese fichero; a la constante de allí le corresponde absorberlas.
 */
const COLS_DEL_HISTORIAL: ColDef[] = [
  ['Movimiento', 0],
  ['Fecha', 0],
  ['Estado', 0],
  ['Dirección referencial', 0],
  ['Motivo', 0],
  ['Documento', 0],
  ['Usuario', 0],
  ['Vigente', 0],
  ['Observaciones', 0],
];

/* ══════════ El módulo ══════════ */

export default function Coactiva({ dest, onDest }: PantallaProps) {
  const { toast } = usarPreferencias();

  const [expediente, setExpediente] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(0);
  const [q, setQ] = useState('');
  const [fContribuyente, setFContribuyente] = useState('');
  const [fEjecutor, setFEjecutor] = useState('');
  const [chip, setChip] = useState('Todos');
  const [conBeneficio, setConBeneficio] = useState(false);
  const [dPagina, setDPagina] = useState(0);
  const [dContribuyente, setDContribuyente] = useState('');
  const [dExpediente, setDExpediente] = useState('');
  const [dEstado, setDEstado] = useState('Todos');
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [importando, setImportando] = useState(false);
  /* El informe de la importación, con su tono: «no entró ningún valor» no es un
     éxito aunque la petición estuviera bien formada. */
  const [informe, setInforme] = useState<{ texto: string; abrio: boolean } | null>(null);
  const [falloDeEscritura, setFallo] = useState<ErrorDeApi | null>(null);
  const [dictando, setDictando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [cambiandoDireccion, setCambiandoDireccion] = useState(false);

  const val = (k: string) => vals[k] ?? '';
  const set = (k: string, v: string) => setVals((x) => ({ ...x, [k]: v }));

  /* Salir del módulo por el panel de destinos cierra el expediente abierto:
     el expediente vive dentro de «Expedientes», no es un destino más. */
  useEffect(() => setExpediente(null), [dest]);

  const enPanel = dest === 'panel';
  const enLista = dest === 'lista';
  const esExpediente = enLista && expediente !== null;

  /* ── El panel: contar, que es lo único que el backend sabe hacer aquí ── */

  /* Se cuenta en los cuatro destinos, no solo en el panel: `notasDeDestino`
     sustituye la nota del riel, y si la lectura no estuviera activa la nota
     volveria a «4,182 en cartera» —la cifra del artboard— en cuanto se saliera
     del panel, contradiciendo lo que la propia pantalla enseña al lado. */
  const cartera = useRecurso((s) => listarExpedientes({}, { tamano: 1 }, s), []);
  /* Un conteo por estado. Son siete peticiones de una fila cada una porque no
     hay ningún endpoint de indicadores de coactiva: contar con el filtro que el
     backend ya admite es la única cifra que no se inventa. */
  const porEstado = ESTADOS_DEL_EXPEDIENTE.map((e) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRecurso((s) => listarExpedientes({ estado: e.nombre }, { tamano: 1 }, s), [e.nombre], enPanel),
  );

  /* ── La cartera ─────────────────────────────────────────────── */

  const criterio = useRebote(q.trim());
  const contribuyenteReposado = useRebote(fContribuyente.trim());
  const ejecutorReposado = useRebote(fEjecutor.trim());

  useEffect(() => setPagina(0), [criterio, contribuyenteReposado, ejecutorReposado, chip]);

  const lista = useRecurso(
    (s) =>
      listarExpedientes(
        {
          nroDeExpediente: criterio || undefined,
          codContribuyente: contribuyenteReposado || undefined,
          ejecutor: ejecutorReposado || undefined,
          estado: chip === 'Todos' ? undefined : chip,
        },
        { pagina, tamano: 20 },
        s,
      ),
    [criterio, contribuyenteReposado, ejecutorReposado, chip, pagina],
    enLista && expediente === null,
  );

  /* ── El expediente abierto ───────────────────────────────────
     Cuatro lecturas, una por pestaña que las necesita. `nroDeExpediente` hace
     que la ficha traiga además sus valores y su historial completo. */

  const ficha = useRecurso(
    (s) => listarExpedientes({ nroDeExpediente: expediente! }, { tamano: 1 }, s),
    [expediente],
    esExpediente,
  );
  const exp: Expediente | null = ficha.datos?.contenido[0] ?? null;

  const proceso = useRecurso(
    (s) => procesoDelExpediente(expediente!, val('proyectarAl') || undefined, s),
    [expediente, val('proyectarAl')],
    esExpediente && (tab === 2 || tab === 3),
  );
  const deuda = useRecurso(
    (s) => deudaDelExpediente(expediente!, val('fechaDeCalculo') || undefined, s),
    [expediente, val('fechaDeCalculo')],
    esExpediente && tab === 1,
  );
  const costas = useRecurso(
    (s) => listarLiquidaciones({ nroExpedCoact: expediente! }, { tamano: 50 }, s),
    [expediente],
    esExpediente && tab === 4,
  );

  /* ── La importación ─────────────────────────────────────────── */

  const obligado = useRebote(val('iObligado').trim());
  const valores = useRecurso(
    (s) => listarValores({ codContribuyente: obligado }, { tamano: 50 }, s),
    [obligado],
    dest === 'importacion' && obligado !== '',
  );
  const filasDeValores = valores.datos?.contenido ?? [];
  const marcadosAhora = filasDeValores.filter((v) => marcados[v.numero]);

  /* ── La consulta de deuda ───────────────────────────────────── */

  const dContribReposado = useRebote(dContribuyente.trim());
  const dExpReposado = useRebote(dExpediente.trim());
  useEffect(() => setDPagina(0), [dContribReposado, dExpReposado, dEstado, conBeneficio]);

  const deudas = useRecurso(
    (s) =>
      conBeneficio
        ? listarDeudasEnBeneficio(
            { contribuyente: dContribReposado || undefined, fechaDeCalculo: val('dFecha') || undefined },
            { pagina: dPagina, tamano: 20 },
            s,
          )
        : listarDeudas(
            {
              contribuyente: dContribReposado || undefined,
              nExpediente: dExpReposado || undefined,
              estado: dEstado === 'Todos' ? undefined : dEstado,
            },
            { pagina: dPagina, tamano: 20 },
            s,
          ),
    [conBeneficio, dContribReposado, dExpReposado, dEstado, dPagina, val('dFecha')],
    dest === 'deuda',
  );

  /* ── Las escrituras ─────────────────────────────────────────── */

  const puedeImportar =
    val('iObligado').trim() !== '' && val('iEjecutor').trim() !== '' && observacionSuficiente(val('iObs')) && !importando;
  const motivoDeImportar =
    val('iObligado').trim() === ''
      ? 'Falta el código del obligado: el expediente se abre a su nombre.'
      : val('iEjecutor').trim() === ''
        ? 'Falta el ejecutor coactivo, que es quien se hace cargo del procedimiento.'
        : !observacionSuficiente(val('iObs'))
          ? faltaLaObservacion(val('iObs'))
          : '';

  const importar = async () => {
    setImportando(true);
    setFallo(null);
    setInforme(null);
    try {
      const r = await importarValores({
        codContribuyente: val('iObligado').trim(),
        valores: marcadosAhora.map((v) => v.numero),
        ejecutor: val('iEjecutor').trim(),
        auxiliar: val('iAuxiliar').trim() || undefined,
        asunto: val('iAsunto').trim() || undefined,
        direccionReferencialDelContribuyente: val('iDirRef').trim() || undefined,
        fecha: val('iFecha') || undefined,
        observacion: val('iObs').trim(),
      });
      const rechazos = r.rechazados.map((x) => `${x.numero}: ${x.detalle}`).join(' · ');
      if (r.expediente) {
        setInforme({
          abrio: true,
          texto:
            `Expediente ${r.expediente.numero} abierto con ${r.importados} ${r.importados === 1 ? 'valor' : 'valores'}.` +
            (rechazos ? ` Rechazados: ${rechazos}` : ''),
        });
        toast(`Expediente ${r.expediente.numero} abierto.`);
      } else {
        setInforme({
          abrio: false,
          texto: `No entró ningún valor, y la petición estaba bien formada. ${rechazos || 'El informe no trae rechazos.'}`,
        });
      }
      valores.reintentar();
    } catch (fallo) {
      setFallo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo importar', 0));
    } finally {
      setImportando(false);
    }
  };

  const tipoElegido = (val('aTipo') || 'REC1') as TipoDeActo;
  const defDelActo = TIPOS_DE_ACTO.find((t) => t.nombre === tipoElegido) ?? TIPOS_DE_ACTO[0];
  const puedeDictar =
    val('aGlosa').trim() !== '' &&
    observacionSuficiente(val('aObs')) &&
    (!defDelActo.llevaMedida || val('aMedida') !== '') &&
    !dictando;
  const motivoDeDictar =
    val('aGlosa').trim() === ''
      ? 'Falta la glosa: es la descripción que se imprime en el documento.'
      : defDelActo.llevaMedida && val('aMedida') === ''
        ? 'La REC 02 ordena una medida cautelar y hay que decir en qué forma se traba (art. 33).'
        : !observacionSuficiente(val('aObs'))
          ? faltaLaObservacion(val('aObs'))
          : '';

  const dictar = async () => {
    setDictando(true);
    setFallo(null);
    try {
      const r = await registrarActo(expediente!, {
        tipo: tipoElegido,
        fecha: val('aFecha') || undefined,
        glosa: val('aGlosa').trim(),
        medida: defDelActo.llevaMedida ? val('aMedida') : undefined,
        observacion: val('aObs').trim(),
      });
      toast(`${r.acto.titulo} ${r.acto.numero} dictada. El expediente queda en ${r.estadoDelExpediente}.`);
      setVals((x) => ({ ...x, aGlosa: '', aObs: '' }));
      proceso.reintentar();
      ficha.reintentar();
    } catch (fallo) {
      setFallo(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo dictar', 0));
    } finally {
      setDictando(false);
    }
  };

  /* ── Los dos cambios del expediente ──────────────────────────
     Ninguno de los dos edita nada: **agregan un movimiento** al historial, que
     es lo que la pestaña «Expediente» venía diciendo sin que hubiera con qué
     hacerlo. Calcan el patrón de `dictar`: la primaria nace apagada, dice qué
     falta (RNF-082) y no manda nada sin observación (regla 10, RNF-052). */

  const estadoElegido = ESTADOS_QUE_SE_ELIGEN.find((e) => e.nombre === val('eEstado')) ?? null;

  /* `estadoCodigo` y no `estado`: `ExpedienteResource` publica en `estado` la
     **etiqueta** —«REC 01 EMITIDO»—, y el código del manual es la única llave
     que no depende de cómo se escriba la etiqueta. */
  const concluido = exp?.estadoCodigo === '051';

  /* El documento de respaldo va entero o no va. No es una preferencia: lo exige
     el compacto de `MovimientoDelExpediente` —«El documento de respaldo va
     entero o no va: fecha y numero juntos»—, así que sin esta guarda la
     petición sale, se rechaza con 422 y el motivo lo tiene que leer el usuario
     en el mensaje del servidor. */
  const documentoAMedias = (val('eDocFecha') !== '') !== (val('eDocNumero').trim() !== '');

  const puedeCambiarEstado =
    !concluido &&
    estadoElegido !== null &&
    estadoElegido.codigo !== exp?.estadoCodigo &&
    val('eMotivo').trim() !== '' &&
    !documentoAMedias &&
    observacionSuficiente(val('eObs')) &&
    !cambiandoEstado;

  /* Las dos primeras causas son las que el backend rechaza con 409
     —`ExpedienteConcluido` y `SinCambio`—: se dicen antes de mandar porque son
     comprobables con lo que la ficha ya trajo, no porque se adivinen. */
  const motivoDeCambiarEstado = concluido
    ? 'El expediente está concluido: sobre un procedimiento terminado no se registra ningún movimiento más.'
    : estadoElegido === null
      ? 'Falta elegir el estado al que pasa el expediente.'
      : estadoElegido.codigo === exp?.estadoCodigo
        ? `El expediente ya está en «${estadoElegido.etiqueta}»: un movimiento que no cambia el estado no se registra.`
        : val('eMotivo').trim() === ''
          ? 'Falta el motivo: es la causal del cambio, y queda escrita en el historial junto al movimiento.'
          : documentoAMedias
            ? 'El documento de respaldo va entero o no va: hay que poner su fecha y su número, o dejar los dos en blanco.'
            : !observacionSuficiente(val('eObs'))
              ? faltaLaObservacion(val('eObs'))
              : '';

  const cambiarElEstado = async () => {
    setCambiandoEstado(true);
    setFallo(null);
    try {
      const r = await cambiarEstado(expediente!, {
        nuevoEstado: estadoElegido!.nombre,
        fecha: val('eFecha') || undefined,
        motivo: val('eMotivo').trim(),
        documentoDeRespaldoFecha: val('eDocFecha') || undefined,
        documentoDeRespaldoNumero: val('eDocNumero').trim() || undefined,
        observacion: val('eObs').trim(),
      });
      toast(`El expediente ${r.numero} queda en «${r.estado}».`);
      setVals((x) => ({ ...x, eEstado: '', eFecha: '', eMotivo: '', eDocFecha: '', eDocNumero: '', eObs: '' }));
      ficha.reintentar();
    } catch (fallo) {
      setFallo(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo cambiar el estado', 0),
      );
    } finally {
      setCambiandoEstado(false);
    }
  };

  const direccionNueva = val('rDir').trim();

  /* La misma comparación que hace `CambiarDireccionReferencial` antes de
     rechazar con 409: `equalsIgnoreCase` contra la vigente. Y la vigente es
     exactamente la que la ficha publica —`ExpedienteResource` la documenta como
     «la vigente: la del ultimo cambio, o la de apertura»—, así que aquí no se
     recompone nada: se compara contra el mismo dato. */
  const mismaDireccion =
    direccionNueva !== '' && direccionNueva.toLowerCase() === (exp?.direccionReferencial ?? '').toLowerCase();

  const puedeCambiarDireccion =
    direccionNueva !== '' &&
    !mismaDireccion &&
    val('rMotivo').trim() !== '' &&
    observacionSuficiente(val('rObs')) &&
    !cambiandoDireccion;

  const motivoDeCambiarDireccion =
    direccionNueva === ''
      ? 'Falta la dirección nueva: dejar al expediente sin a dónde notificar no es un cambio, es una baja.'
      : mismaDireccion
        ? 'Es la misma dirección que ya está vigente en el expediente: no hay nada que cambiar.'
        : val('rMotivo').trim() === ''
          ? 'Falta el motivo: es por qué se cambia, y queda escrito en el historial junto al movimiento.'
          : !observacionSuficiente(val('rObs'))
            ? faltaLaObservacion(val('rObs'))
            : '';

  const cambiarLaDireccion = async () => {
    setCambiandoDireccion(true);
    setFallo(null);
    try {
      const r = await cambiarDireccionReferencial(expediente!, {
        nuevaDireccionReferencial: direccionNueva,
        fecha: val('rFecha') || undefined,
        motivo: val('rMotivo').trim(),
        observacion: val('rObs').trim(),
      });
      toast(`El expediente ${r.numero} se notifica ahora en la dirección nueva.`);
      setVals((x) => ({ ...x, rDir: '', rFecha: '', rMotivo: '', rObs: '' }));
      ficha.reintentar();
    } catch (fallo) {
      setFallo(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo cambiar la dirección', 0),
      );
    } finally {
      setCambiandoDireccion(false);
    }
  };

  /* ── Ruta y contexto ────────────────────────────────────────── */

  const titulos: Record<string, string> = {
    panel: 'Panel del módulo',
    importacion: 'Importación de valores',
    lista: 'Expedientes coactivos',
    deuda: 'Deuda en coactiva',
  };
  const miga = esExpediente
    ? ['Coactiva', 'Expedientes', expediente ?? '']
    : ['Coactiva', titulos[dest] ?? 'Coactiva'];
  const titulo = esExpediente ? 'Expediente ' + expediente : (titulos[dest] ?? 'Coactiva');

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Coactiva',
    ir: () => {
      setExpediente(null);
      onDest(o[1]);
    },
  }));

  const notasDeDestino: Record<string, string> = {};
  if (cartera.datos) notasDeDestino.lista = `${cartera.datos.totalElementos.toLocaleString('es-PE')} en cartera`;
  if (lista.datos && !cartera.datos)
    notasDeDestino.lista = `${lista.datos.totalElementos.toLocaleString('es-PE')} en cartera`;

  const TABS = ['Expediente', 'Deuda', 'Actos', 'Notificaciones', 'Costas', 'Historial'];

  return (
    <Shell
      modulo="coactiva"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      notasDeDestino={notasDeDestino}
      tarjeta={
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
            Expedientes en cartera
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{cifraDe(cartera)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>
            Contados con <code style={{ fontFamily: 'var(--font-mono)' }}>GET /coactiva/expedientes</code>
          </p>
          <p style={{ margin: '7px 0 0', paddingTop: 7, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-4)', textWrap: 'pretty' }}>
            El saldo de la cartera sale «{SIN_DATO}»: ninguna lectura lo suma, y sumar aquí las páginas daría un total que
            no lo es.
          </p>
        </div>
      }
      contexto={
        esExpediente
          ? {
              volver: { label: 'Expedientes', onClick: () => setExpediente(null) },
              codigo: expediente ?? '',
              titular: exp ? exp.codContribuyente : 'Cargando…',
              ubic: exp ? `Ejercicio ${exp.ejercicio} · ${exp.valores} ${exp.valores === 1 ? 'valor' : 'valores'} · ejecutor ${exp.ejecutor}` : '',
              derecha: exp ? (
                <>
                  <Insignia tono={tono(exp.estado)}>{exp.estado}</Insignia>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--bad-fg)' }}>
                    S/ {exp.totalExigible}
                  </span>
                </>
              ) : undefined,
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {enPanel && (
          <>
            <p style={ENTRADILLA}>
              La cobranza coactiva es un procedimiento con actos tasados: cada resolución, cada notificación y cada
              embargo añade costas que paga el obligado. Doce opciones de menú eran los actos de un solo expediente.
            </p>

            <Franja tono="warn">
              El coste tasado de cada acto —lo que el módulo existía para enseñar antes de dictar— sale «{SIN_DATO}» en
              todas las pantallas. {POR_QUE_NO_HAY_COSTO_TASADO}
            </Franja>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Qué le falta a cada expediente</h2>
                <span style={META}>{cifraDe(cartera)} expedientes</span>
              </div>
              {BANDEJA.map((b, i) => (
                <button
                  key={b[0]}
                  onClick={() => {
                    setChip(b[0]);
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
                  <Insignia tono={b[1]}>{etiquetaDelEstado(b[0])}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{b[2]}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{b[3]}</span>
                  </span>
                  <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {cifraDe(porEstado[i]!)}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                      {SIN_DATO}
                    </span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <p style={PIE}>
                Los conteos los cuenta el backend, uno por estado, con el filtro que <code>GET /coactiva/expedientes</code>{' '}
                admite. El saldo de cada fila sale «{SIN_DATO}»: no hay agregado que lo devuelva, y sumar la página no es
                sumar la cartera.
              </p>
            </section>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Lo que el panel del artboard decía y aquí no se dice</h2>
              </div>
              {(
                [
                  ['Saldo de la cartera', 'Ninguna lectura de coactiva devuelve una suma. GET /coactiva/deudas pagina fila a fila, y sumar una página es sumar veinte expedientes de cuatro mil.'],
                  ['Costas cargadas', 'El arancel no se publica y las costas liquidadas solo se leen por expediente, con GET /coactiva/liquidaciones-costas?nroExpedCoact=.'],
                  ['Variación de la cartera en el ejercicio', 'Las cuatro líneas —valores importados, costas del procedimiento, cobrado en caja y dejado sin efecto— son cuatro agregados que ningún endpoint del contrato calcula.'],
                  ['«Fraccionado» como estado del expediente', 'No es un estado: el backend lo rechaza con 422. Suscribir un convenio mueve la deuda a fase CONVENIO en el libro; el expediente no se entera.'],
                ] as [string, string][]
              ).map((r) => (
                <div key={r[0]} style={{ display: 'flex', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 220 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{r[0]}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, textWrap: 'pretty' }}>{r[1]}</span>
                  </span>
                  {/* La cifra del artboard NO se cita, ni tachada.
                      Estaba aquí con `line-through` al lado del «—», y el propio
                      pie explicaba por qué no debía estar: una cifra así es
                      indistinguible de una correcta en cuanto sale de la
                      pantalla — y de una captura, de una impresión o de una
                      mirada rápida, el tachado es lo primero que se cae. Lo que
                      vale de esta sección es el nombre de lo que falta y el
                      motivo; la magnitud que el prototipo se inventó, no. */}
                  <span style={{ flex: '0 0 auto', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink-2)' }}>
                    {SIN_DATO}
                  </span>
                </div>
              ))}
              <p style={PIE}>
                Cuatro cosas que el prototipo dibujaba y aquí no se dan. Sus cifras tampoco se citan: una cifra así es
                indistinguible de una correcta en cuanto sale de la pantalla, y este panel se lee para decidir el
                trabajo de la semana.
              </p>
            </section>
          </>
        )}

        {/* ══════════ IMPORTACIÓN ══════════ */}
        {dest === 'importacion' && (
          <>
            <p style={ENTRADILLA}>
              Los valores llegan firmes desde Valores. Importarlos abre expediente, y desde ese momento el obligado paga
              costas. Lo que se rechaza vuelve con su motivo, valor por valor.
            </p>

            <section style={TARJETA}>
              <Formulario
                val={val}
                set={set}
                defs={[
                  {
                    k: 'iObligado',
                    l: 'Cód. del obligado',
                    ancho: true,
                    ph: 'C-000001',
                    ayuda: 'El código del padrón, no el documento: es lo que PeticionDeImportacion.codContribuyente espera.',
                  },
                  {
                    k: 'iEjecutor',
                    l: 'Ejecutor coactivo',
                    ayuda: 'Se teclea: ninguna lectura del contrato publica la lista de ejecutores de la municipalidad.',
                  },
                  { k: 'iAuxiliar', l: 'Auxiliar coactivo', ayuda: 'Opcional, y también tecleado.' },
                  { k: 'iFecha', l: 'Fecha de la importación', t: 'date', ayuda: 'Si se deja en blanco, hoy.' },
                  { k: 'iExpNum', l: 'Nº de expediente', t: 'ro', ayuda: 'Lo compone la plantilla vigente sobre el correlativo de la base (D-09).' },
                  { k: 'iAsunto', l: 'Asunto de la carátula', ancho: true },
                  {
                    k: 'iDirRef',
                    l: 'Dirección referencial',
                    ancho: true,
                    ayuda: 'Dónde notificar, si difiere del domicilio fiscal.',
                  },
                  {
                    k: 'iObs',
                    l: 'Observación',
                    t: 'area',
                    ancho: true,
                    ph: 'Por qué se importa',
                    ayuda: 'Obligatoria (regla 10, RNF-052). Sin ella el backend rechaza.',
                  },
                ]}
              />
            </section>

            {obligado === '' && (
              <Franja tono="neutro">
                Teclea el código del obligado para ver sus valores. La lista sale de{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>GET /valores?codContribuyente=</code>.
              </Franja>
            )}

            {obligado !== '' && (valores.cargando || valores.error || filasDeValores.length === 0) && (
              <EstadoDeLectura
                lectura={valores}
                ruta="GET /api/v1/valores"
                vacio={
                  <>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      Ese obligado no tiene valores emitidos
                    </p>
                    <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                      A coactiva se importan valores, no deuda: sin una orden de pago o una resolución emitida y con el
                      plazo vencido no hay nada que importar. Se emiten en Valores.
                    </p>
                  </>
                }
              />
            )}

            {filasDeValores.length > 0 && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Valores del obligado</h2>
                  <span style={META}>
                    {filasDeValores.length} de {(valores.datos?.totalElementos ?? 0).toLocaleString('es-PE')}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                    <thead>
                      <Cabeceras hueco defs={COLS_VALORES} />
                    </thead>
                    <tbody>
                      {filasDeValores.map((v) => {
                        const on = marcados[v.numero] === true;
                        return (
                          <tr
                            key={v.numero}
                            className="hov-elev"
                            style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}
                          >
                            <td style={{ padding: '11px 14px' }}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => setMarcados((x) => ({ ...x, [v.numero]: !on }))}
                                aria-label={'Importar el valor ' + v.numero}
                                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                              />
                            </td>
                            {celdas(
                              [v.numero, v.tipo, String(v.ejercicio), v.nombreContribuyente, v.estado, v.total],
                              COLS_VALORES,
                              4,
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={PIE}>
                  Sin ninguno marcado se importan «todos los que se puedan», que es lo que el backend entiende por una
                  lista vacía. No hay columna de costas: el arancel no se publica. Y el estado que se ve es el del valor,
                  no una promesa de que entre: quién puede pasar a coactiva lo decide el backend, y lo que no entre
                  vuelve aquí con su motivo.
                </p>
              </section>
            )}

            {informe && <Franja tono={informe.abrio ? 'ok' : 'warn'}>{informe.texto}</Franja>}
            {falloDeEscritura && (
              <Franja tono="bad">
                {falloDeEscritura.mensaje}
                {falloDeEscritura.incidencia ? ` · ref ${falloDeEscritura.incidencia}` : ''}
              </Franja>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {motivoDeImportar ||
                  (marcadosAhora.length === 0
                    ? 'Sin marcar ninguno se intentarán todos los valores exigibles del obligado.'
                    : `${marcadosAhora.length} ${marcadosAhora.length === 1 ? 'valor marcado' : 'valores marcados'}.`)}
              </p>
              <button
                onClick={puedeImportar ? importar : () => toast(motivoDeImportar)}
                aria-disabled={!puedeImportar}
                title={motivoDeImportar || undefined}
                className="hov-acento-2"
                style={{ ...BOTON_PRI, opacity: puedeImportar ? 1 : 0.55 }}
              >
                {importando ? 'Importando…' : 'Importar y abrir expediente'}
              </button>
            </div>
          </>
        )}

        {/* ══════════ LISTA DE EXPEDIENTES ══════════ */}
        {enLista && !esExpediente && (
          <>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              La cartera del ejecutor. La columna que decide el trabajo del día no es el número: es el estado y lo que
              las costas han sumado sobre la deuda que llegó.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nº de expediente"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                <input
                  value={fContribuyente}
                  onChange={(e) => setFContribuyente(e.target.value)}
                  placeholder="Cód. obligado"
                  style={{ ...IN, width: 150, flex: '0 0 auto' }}
                />
                <input
                  value={fEjecutor}
                  onChange={(e) => setFEjecutor(e.target.value)}
                  placeholder="Ejecutor"
                  style={{ ...IN, width: 160, flex: '0 0 auto' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '9px 16px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                }}
              >
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Estado</span>
                {['Todos', ...ESTADOS_DEL_EXPEDIENTE.map((e) => e.nombre)].map((c) => {
                  const on = chip === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setChip(c)}
                      aria-pressed={on}
                      style={{
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                        borderRadius: 999,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                      }}
                    >
                      {c === 'Todos' ? c : etiquetaDelEstado(c)}
                    </button>
                  );
                })}
              </div>
              <p style={PIE}>
                Los siete estados son los de <code>EstadoDelExpediente</code>, con su código del manual. «Fraccionado»,
                que el prototipo ofrecía, no se ofrece: el backend lo rechaza con 422 porque suscribir un convenio no
                mueve el expediente —mueve su deuda a fase CONVENIO en el libro—.
              </p>
            </section>

            {(lista.cargando || lista.error || (lista.datos?.contenido.length ?? 0) === 0) && (
              <EstadoDeLectura
                lectura={lista}
                ruta="GET /api/v1/coactiva/expedientes"
                vacio={
                  <>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      Ningún expediente con esos datos
                    </p>
                    <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                      Un expediente coactivo nace importando valores exigibles del obligado. Si la municipalidad no ha
                      emitido ninguno todavía, esta lista está vacía y lo está con razón.
                    </p>
                    <button onClick={() => onDest('importacion')} className="hov-acento-2" style={{ ...BOTON_PRI, marginTop: 6, padding: '9px 18px' }}>
                      Importar valores
                    </button>
                  </>
                }
              />
            )}

            {lista.datos && lista.datos.contenido.length > 0 && (
              <>
                <Tabla
                  titulo="Expedientes coactivos"
                  meta={`${lista.datos.contenido.length} de ${lista.datos.totalElementos.toLocaleString('es-PE')}`}
                  cols={COLS_LISTA}
                  min={1040}
                  insignia={8}
                  onFila={(i) => {
                    setExpediente(lista.datos!.contenido[i]!.numero);
                    setTab(0);
                  }}
                  filas={lista.datos.contenido.map((e) => [
                    e.numero,
                    String(e.ejercicio),
                    e.codContribuyente,
                    e.ejecutor,
                    String(e.valores),
                    e.deudaMateriaDeCobranza,
                    e.costas,
                    e.totalExigible,
                    e.estado,
                  ])}
                  nota={`Las cifras están actualizadas al ${lista.datos.contenido[0]?.deudaAlDia ?? SIN_DATO} (regla 9). «Cód. obligado» es el código del padrón y no su nombre: ExpedienteResource no publica el nombre —sí lo hace la consulta de deudas—.`}
                />
                <Paginador
                  pagina={lista.datos.pagina}
                  totalPaginas={lista.datos.totalPaginas}
                  hayMas={lista.datos.hayMas}
                  ir={setPagina}
                  style={{ padding: 0, borderTop: 'none' }}
                />
              </>
            )}
          </>
        )}

        {/* ══════════ EL EXPEDIENTE ══════════ */}
        {esExpediente && (
          <>
            {(ficha.cargando || ficha.error || !exp) && (
              <EstadoDeLectura
                lectura={ficha}
                ruta="GET /api/v1/coactiva/expedientes?nroDeExpediente="
                vacio={
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
                    No hay ningún expediente con el número {expediente}.
                  </p>
                }
              />
            )}

            {exp && (
              <>
                <section style={TARJETA}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                    {(
                      [
                        ['Expediente', `${exp.numero} — ${exp.ejercicio}`, 'var(--ink)', `correlativo ${exp.correlativo}`],
                        ['Obligado', exp.codContribuyente, 'var(--ink)', 'el nombre no lo publica esta lectura'],
                        ['Deuda materia de cobranza', `S/ ${exp.deudaMateriaDeCobranza}`, 'var(--ink)', `insoluto ${exp.insoluto} · interés ${exp.interes}`],
                        ['Costas del procedimiento', `S/ ${exp.costas}`, 'var(--warn-fg)', 'lo ya liquidado, no lo tasado'],
                        ['Total exigible', `S/ ${exp.totalExigible}`, 'var(--bad-fg)', `al ${exp.deudaAlDia}`],
                        ['Estado', exp.estado, 'var(--ink)', `código ${exp.estadoCodigo}`],
                      ] as [string, string, string, string][]
                    ).map((r) => (
                      <div
                        key={r[0]}
                        style={{
                          background: 'var(--bg-card)',
                          padding: '14px 16px',
                          borderLeft: '1px solid var(--line)',
                          borderTop: '1px solid var(--line)',
                          margin: '-1px 0 0 -1px',
                        }}
                      >
                        <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                          {r[0]}
                        </p>
                        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2], textWrap: 'pretty' }}>{r[1]}</p>
                        {r[3] && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>{r[3]}</p>}
                      </div>
                    ))}
                  </div>
                </section>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
                  {TABS.map((t, i) => {
                    const on = tab === i;
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

                {/* — Expediente — */}
                {tab === 0 && (
                  <>
                    <section style={TARJETA}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Datos del expediente</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                          Todo de solo lectura. Los dos datos que se pueden cambiar —el estado y la dirección
                          referencial— no se editan: se agregan como movimiento del historial, con su motivo y su
                          observación, y eso se hace en la pestaña «Historial», debajo de la tabla.
                        </p>
                        <button
                          onClick={() => setTab(5)}
                          className="hov-elev"
                          style={{
                            marginTop: 9,
                            border: '1px solid var(--line-2)',
                            borderRadius: 7,
                            background: 'var(--bg-elev)',
                            padding: '7px 13px',
                            cursor: 'pointer',
                            fontSize: 12.5,
                            color: 'var(--ink-2)',
                          }}
                        >
                          Ir al historial y cambiarlos
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px 16px', padding: '15px 16px 17px' }}>
                        {(
                          [
                            ['Nº de expediente', exp.numero],
                            ['Ejercicio', String(exp.ejercicio)],
                            ['Correlativo', String(exp.correlativo)],
                            ['Cód. del obligado', exp.codContribuyente],
                            ['Ejecutor coactivo', exp.ejecutor],
                            ['Auxiliar coactivo', exp.auxiliar ?? SIN_DATO],
                            ['Fecha de apertura', exp.fechaDeApertura],
                            ['Asunto', exp.asunto ?? SIN_DATO],
                            ['Dirección referencial vigente', exp.direccionReferencial ?? SIN_DATO],
                          ] as [string, string][]
                        ).map((c) => (
                          <div key={c[0]}>
                            <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{c[0]}</p>
                            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', textWrap: 'pretty' }}>{c[1]}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <Tabla
                      titulo="Valores importados"
                      meta={`${exp.valoresImportados.length} de ${exp.valores}`}
                      cols={COLS_IMPORTADOS}
                      min={420}
                      filas={exp.valoresImportados.map((v) => [String(v.valorId), v.fechaDeImportacion])}
                      totales={[
                        ['Insoluto', exp.insoluto, 0],
                        ['Reajuste', exp.reajuste, 0],
                        ['Interés', exp.interes, 0],
                        ['Gastos', exp.gastos, 0],
                        ['Costas', exp.costas, 0],
                        [`Total exigible al ${exp.deudaAlDia}`, exp.totalExigible, 1],
                      ]}
                      nota={`El expediente publica el identificador del valor y el día en que entró, no su número impreso ni su importe: lo que suma está arriba, ya calculado por el backend y con su fecha.`}
                    />
                  </>
                )}

                {/* — Deuda obligación por obligación — */}
                {tab === 1 && (
                  <>
                    <section style={TARJETA}>
                      <Formulario
                        val={val}
                        set={set}
                        defs={[
                          {
                            k: 'fechaDeCalculo',
                            l: 'Actualizar la deuda al',
                            t: 'date',
                            ancho: true,
                            ayuda: 'Decide a qué día se actualizan todas las cifras de la tabla, y viaja de vuelta en la respuesta. Es el mismo parámetro con el que se acoge a fraccionamiento.',
                          },
                        ]}
                      />
                    </section>
                    {(deuda.cargando || deuda.error || !deuda.datos) && (
                      <EstadoDeLectura
                        lectura={deuda}
                        ruta={`GET /api/v1/coactiva/expedientes/${expediente}/deuda`}
                        vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Sin deuda que enseñar.</p>}
                      />
                    )}
                    {deuda.datos && (
                      <Tabla
                        titulo="Deuda del expediente, obligación por obligación"
                        meta={`${deuda.datos.obligaciones.length} obligaciones · al ${deuda.datos.aLaFecha}`}
                        cols={COLS_OBLIGACIONES}
                        min={880}
                        filas={deuda.datos.obligaciones.map((o) => [
                          o.tributo + (o.esCosta ? ' (costa)' : ''),
                          String(o.ejercicio),
                          o.predioId !== null ? `predio ${o.predioId}` : o.vehiculoId !== null ? `vehículo ${o.vehiculoId}` : SIN_DATO,
                          o.insolutoS,
                          o.reajusteS,
                          o.interesS,
                          o.gastosS,
                          o.totalS,
                        ])}
                        totales={[
                          ['Deuda materia de cobranza', deuda.datos.deudaMateriaDeCobranzaS, 0],
                          ['Costas', deuda.datos.costasS, 0],
                          [`Total al ${deuda.datos.aLaFecha}`, deuda.datos.totalS, 1],
                        ]}
                        nota="Los tres totales vienen calculados del servidor, no de sumar las filas aquí: dos sitios que suman acaban sumando distinto (RNF-083). Las cuatro primeras columnas son exactamente lo que el fraccionamiento coactivo necesita para acoger una obligación."
                      />
                    )}
                  </>
                )}

                {/* — Actos — */}
                {tab === 2 && (
                  <>
                    <Franja tono="warn">{POR_QUE_NO_HAY_COSTO_TASADO}</Franja>
                    {(proceso.cargando || proceso.error || !proceso.datos) && (
                      <EstadoDeLectura
                        lectura={proceso}
                        ruta={`GET /api/v1/coactiva/expedientes/${expediente}/proceso`}
                        vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Sin actuaciones.</p>}
                      />
                    )}
                    {proceso.datos && (
                      <Tabla
                        titulo="Actos del procedimiento"
                        meta={`${proceso.datos.actuaciones.length} ${proceso.datos.actuaciones.length === 1 ? 'acto' : 'actos'}`}
                        cols={COLS_ACTOS}
                        min={960}
                        filas={proceso.datos.actuaciones.map((a) => [
                          a.numero,
                          a.titulo,
                          a.fecha,
                          a.medida ?? SIN_DATO,
                          String(a.diligencias.length),
                          SIN_DATO,
                          a.descripcion,
                        ])}
                        nota={POR_QUE_NO_SE_CASA_LA_COSTA}
                      />
                    )}

                    <section style={TARJETA}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Dictar un acto</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                          Dictar <b>emite un documento que se notifica al obligado</b> y mueve el estado del expediente.
                          No se corrige: se deja sin efecto con otro acto.
                        </p>
                      </div>
                      <Formulario
                        val={val}
                        set={set}
                        defs={[
                          { k: 'aTipo', l: 'Acto', t: 'sel', o: TIPOS_DE_ACTO.map((t) => t.nombre) },
                          { k: 'aFecha', l: 'Fecha del acto', t: 'date', ayuda: 'Si se deja en blanco, hoy.' },
                          ...(defDelActo.llevaMedida
                            ? [
                                {
                                  k: 'aMedida',
                                  l: 'Forma de la medida cautelar',
                                  t: 'sel' as const,
                                  o: ['', ...MEDIDAS_CAUTELARES.map((m) => m.nombre)],
                                  ayuda: 'Las cuatro del art. 33 de la Ley 26979. Obligatoria en la REC 02 y prohibida en los demás actos.',
                                },
                              ]
                            : []),
                          { k: 'aGlosa', l: 'Glosa', ancho: true, ayuda: 'La descripción que se imprime en el documento.' },
                          {
                            k: 'aObs',
                            l: 'Observación',
                            t: 'area',
                            ancho: true,
                            ayuda: 'Obligatoria (regla 10, RNF-052).',
                          },
                        ]}
                      />
                      <div style={{ display: 'flex', gap: 14, padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 240, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                          <b>{defDelActo.titulo}.</b>{' '}
                          {defDelActo.mueveA
                            ? `Deja el expediente en «${defDelActo.mueveA}».`
                            : 'No mueve el estado del expediente: ocurre dentro de la medida ya trabada.'}{' '}
                          {defDelActo.exigeDeudaViva
                            ? 'Exige que quede deuda que cobrar.'
                            : 'Se puede dictar sin deuda viva: es de los que se dictan porque la cobranza terminó o se detuvo.'}
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right', flex: '0 0 auto' }}>
                          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                            Costas del acto
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink-3)' }}>{SIN_DATO}</span>
                        </span>
                      </div>
                    </section>

                    {falloDeEscritura && (
                      <Franja tono="bad">
                        {falloDeEscritura.mensaje}
                        {falloDeEscritura.incidencia ? ` · ref ${falloDeEscritura.incidencia}` : ''}
                        {/* Dictar la REC-1 lee su plazo del conjunto sellado, y
                            desde #562 eso contesta 422 nombrando la llave en vez
                            de un 500 con incidencia. El 422 llega con el mismo
                            código que un campo mal puesto, así que la pantalla
                            no lo adivina: dice las dos causas y en qué se
                            reconocen. Va sólo aquí —importar valores no lee
                            ningún parámetro sellado— y sólo en el 422. */}
                        {causasDelRechazo(falloDeEscritura, 'PLAZO:REC1_CUMPLIMIENTO') !== null && (
                          <span style={{ display: 'block', marginTop: 6, opacity: 0.85 }}>
                            {causasDelRechazo(falloDeEscritura, 'PLAZO:REC1_CUMPLIMIENTO')}
                          </span>
                        )}
                      </Franja>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {motivoDeDictar || 'El documento sale en PDF y se notifica en otra pantalla; dictar no lo notifica.'}
                      </p>
                      <button
                        onClick={puedeDictar ? dictar : () => toast(motivoDeDictar)}
                        aria-disabled={!puedeDictar}
                        title={motivoDeDictar || undefined}
                        className="hov-acento-2"
                        style={{ ...BOTON_PRI, opacity: puedeDictar ? 1 : 0.55 }}
                      >
                        {dictando ? 'Dictando…' : 'Dictar el acto y emitir su documento'}
                      </button>
                    </div>
                  </>
                )}

                {/* — Notificaciones — */}
                {tab === 3 && (
                  <>
                    {(proceso.cargando || proceso.error || !proceso.datos) && (
                      <EstadoDeLectura
                        lectura={proceso}
                        ruta={`GET /api/v1/coactiva/expedientes/${expediente}/proceso`}
                        vacio={<p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Sin diligencias.</p>}
                      />
                    )}
                    {proceso.datos && (
                      <Tabla
                        titulo="Diligencias de notificación"
                        meta={`${proceso.datos.actuaciones.reduce((a, x) => a + x.diligencias.length, 0)} diligencias`}
                        cols={COLS_DILIGENCIAS}
                        min={1000}
                        insignia={5}
                        filas={proceso.datos.actuaciones.flatMap((a) =>
                          a.diligencias.map((d) => [
                            a.numero,
                            String(d.intento),
                            d.fecha,
                            d.modalidad,
                            d.resultado,
                            d.surtioEfecto ? 'Sí' : 'No',
                            d.exigibleDesde ?? SIN_DATO,
                            d.receptor ?? SIN_DATO,
                          ]),
                        )}
                        nota={`«Surtió efecto» se deriva del resultado, no se guarda: es lo que abre el plazo del art. 14.1, y de ahí sale «Exigible desde». Las modalidades que el backend admite son ${MODALIDADES_DE_NOTIFICACION.join(', ')}; los resultados, ${RESULTADOS_DE_NOTIFICACION.join(', ')}.`}
                      />
                    )}
                    <Franja tono="neutro">
                      Registrar una diligencia es <code>POST /coactiva/notificaciones</code> y se hace sobre el número del
                      acto, no sobre el expediente. El número de intento no viaja: lo pone el sistema, y dejarlo entrar
                      permitiría repetir «el intento 2» y pisar la traza del anterior.
                    </Franja>
                  </>
                )}

                {/* — Costas — */}
                {tab === 4 && (
                  <>
                    {(costas.cargando || costas.error || (costas.datos?.contenido.length ?? 0) === 0) && (
                      <EstadoDeLectura
                        lectura={costas}
                        ruta="GET /api/v1/coactiva/liquidaciones-costas"
                        vacio={
                          <>
                            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                              Ninguna liquidación de costas
                            </p>
                            <p style={{ margin: 0, maxWidth: '58ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                              Liquidar exige el arancel de costas del conjunto sellado. Con la ordenanza sin cargar
                              (D-02c) el backend contesta 422 nombrando la llave que falta, que es exactamente lo que
                              tiene que pasar: no hay cifra con la que liquidar.
                            </p>
                          </>
                        }
                      />
                    )}
                    {costas.datos && costas.datos.contenido.length > 0 && (
                      <Tabla
                        titulo="Costas liquidadas del expediente"
                        meta={`${costas.datos.totalElementos} liquidaciones`}
                        cols={COLS_COSTAS}
                        min={900}
                        filas={costas.datos.contenido.flatMap((l) =>
                          l.costas.map((c) => [l.nroLiquidacion, c.acto, c.descripcion, c.montoS, c.arancelFuente]),
                        )}
                        nota="«Arancel (fuente)» es lo que explica la cifra: la llave del parámetro sellado y su documento. Sin él la pantalla mostraría un importe que nadie puede justificar."
                      />
                    )}
                  </>
                )}

                {/* — Historial — */}
                {tab === 5 && (
                  <>
                    <Tabla
                      titulo="Historial del expediente"
                      meta={`${exp.historial.length} movimientos`}
                      cols={COLS_DEL_HISTORIAL}
                      min={1180}
                      filas={exp.historial.map((h) => [
                        h.tipo,
                        h.fecha,
                        h.estado ?? SIN_DATO,
                        h.direccionReferencial ?? SIN_DATO,
                        h.motivo,
                        h.numDoc ? `${h.numDoc}${h.fecDoc ? ' · ' + h.fecDoc : ''}` : SIN_DATO,
                        h.usuario ?? SIN_DATO,
                        h.activo ? 'Sí' : 'No',
                        h.observaciones,
                      ])}
                      nota="Un movimiento de estado deja «Dirección referencial» en «—» y uno de dirección deja «Estado» en «—», y las dos cosas son correctas: cambiar dónde se notifica no mueve el punto del procedimiento. «Vigente» se deriva del historial —es el último movimiento que llevó estado— y no se guarda: una casilla que dejara marcar como vigente un movimiento anterior permitiría dos estados a la vez. Un movimiento no se borra ni se corrige: se agrega otro."
                    />

                    {/* Los dos actos que agregan movimiento. Están aquí, debajo
                        de la tabla, porque es donde se ve su efecto: la fila
                        nueva aparece en la misma pestaña en la que se registró.
                        Es además la pantalla del manual que los dibuja
                        —`expediente_historial`, «Gestionar historial del
                        expediente»—. */}
                    <section style={TARJETA}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                          Cambiar el estado del expediente
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                          Hoy está en «{exp.estado}» ({exp.estadoCodigo}). El desplegable ofrece los seis estados que se
                          eligen; «000 — INICIADO» no está porque no se elige: es con lo que nace el expediente al
                          importar sus valores. «Activo», que el prototipo dibuja como casilla, tampoco: el movimiento
                          que rige es el último y eso se deriva, así que marcar uno anterior permitiría dos estados a la
                          vez.
                        </p>
                      </div>
                      <Formulario
                        val={val}
                        set={set}
                        defs={[
                          {
                            k: 'eEstado',
                            l: 'Nuevo estado',
                            t: 'sel',
                            o: [
                              ['', 'Elegir el estado nuevo…'],
                              ...ESTADOS_QUE_SE_ELIGEN.map(
                                (e) => [e.nombre, `${e.codigo} — ${e.etiqueta}`] as const,
                              ),
                            ],
                            ayuda: 'Los seis del desplegable del manual, con su código.',
                          },
                          { k: 'eFecha', l: 'Fecha del movimiento', t: 'date', ayuda: 'Si se deja en blanco, el día de hoy.' },
                          { k: 'eDocFecha', l: 'Documento de respaldo — fecha', t: 'date' },
                          {
                            k: 'eDocNumero',
                            l: 'Documento de respaldo — número',
                            ayuda: 'Va entero o no va: con su fecha, o los dos en blanco.',
                          },
                          { k: 'eMotivo', l: 'Motivo', t: 'area', ancho: true, ayuda: 'La causal del cambio. Obligatoria.' },
                          { k: 'eObs', l: 'Observación', t: 'area', ancho: true, ayuda: 'Obligatoria (regla 10, RNF-052).' },
                        ]}
                      />
                    </section>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {motivoDeCambiarEstado ||
                          `El expediente pasará a «${estadoElegido?.etiqueta ?? ''}». No se corrige nada: se agrega un movimiento al historial.`}
                      </p>
                      <button
                        onClick={puedeCambiarEstado ? cambiarElEstado : () => toast(motivoDeCambiarEstado)}
                        aria-disabled={!puedeCambiarEstado}
                        title={motivoDeCambiarEstado || undefined}
                        className="hov-acento-2"
                        style={{ ...BOTON_PRI, opacity: puedeCambiarEstado ? 1 : 0.55 }}
                      >
                        {cambiandoEstado ? 'Registrando…' : 'Registrar el cambio de estado'}
                      </button>
                    </div>

                    <section style={TARJETA}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                          Cambiar la dirección referencial
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                          Es la dirección en la que se notifica al obligado cuando difiere de su domicilio fiscal. La
                          vigente es «{exp.direccionReferencial ?? SIN_DATO}», y no se sobrescribe: la de apertura se
                          conserva porque es la que explica a dónde fueron las primeras notificaciones. «Motivo» y
                          «Observación» los pide el backend y el prototipo de esta pantalla no los dibuja; van aquí
                          porque sin ellos no se guarda (RNF-052). «Hab. urbana» y «Vía», que el prototipo sí dibuja, no
                          están: la petición no los admite, y un campo que se teclea y no viaja es peor que no tenerlo.
                        </p>
                      </div>
                      <Formulario
                        val={val}
                        set={set}
                        defs={[
                          { k: 'rDir', l: 'Nueva dirección referencial', ancho: true },
                          { k: 'rFecha', l: 'Fecha del movimiento', t: 'date', ayuda: 'Si se deja en blanco, el día de hoy.' },
                          { k: 'rMotivo', l: 'Motivo', t: 'area', ancho: true, ayuda: 'Por qué se cambia. Obligatorio.' },
                          { k: 'rObs', l: 'Observación', t: 'area', ancho: true, ayuda: 'Obligatoria (regla 10, RNF-052).' },
                        ]}
                      />
                    </section>

                    {falloDeEscritura && (
                      <Franja tono="bad">
                        {falloDeEscritura.mensaje}
                        {falloDeEscritura.incidencia ? ` · ref ${falloDeEscritura.incidencia}` : ''}
                      </Franja>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {motivoDeCambiarDireccion ||
                          'Se agrega un movimiento de dirección al historial. El estado del procedimiento no se mueve.'}
                      </p>
                      <button
                        onClick={puedeCambiarDireccion ? cambiarLaDireccion : () => toast(motivoDeCambiarDireccion)}
                        aria-disabled={!puedeCambiarDireccion}
                        title={motivoDeCambiarDireccion || undefined}
                        className="hov-acento-2"
                        style={{ ...BOTON_PRI, opacity: puedeCambiarDireccion ? 1 : 0.55 }}
                      >
                        {cambiandoDireccion ? 'Registrando…' : 'Registrar la dirección nueva'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ══════════ DEUDA EN COACTIVA ══════════ */}
        {dest === 'deuda' && (
          <>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              La deuda que está en cobranza coactiva, con sus costas. El beneficio no es otra pantalla: es un interruptor
              sobre estas mismas filas.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
                <input
                  value={dContribuyente}
                  onChange={(e) => setDContribuyente(e.target.value)}
                  placeholder="Cód. del obligado"
                  style={{ ...IN, width: 190, flex: '0 0 auto' }}
                />
                {!conBeneficio && (
                  <input
                    value={dExpediente}
                    onChange={(e) => setDExpediente(e.target.value)}
                    placeholder="Nº de expediente"
                    style={{ ...IN, width: 190, flex: '0 0 auto' }}
                  />
                )}
                {!conBeneficio && (
                  <select value={dEstado} onChange={(e) => setDEstado(e.target.value)} style={{ ...IN, width: 220, flex: '0 0 auto' }}>
                    <option value="Todos">Estado: todos</option>
                    {ESTADOS_DEL_EXPEDIENTE.map((e) => (
                      <option key={e.nombre} value={e.nombre}>
                        {e.codigo} — {e.etiqueta}
                      </option>
                    ))}
                  </select>
                )}
                {conBeneficio && (
                  <input
                    type="date"
                    value={val('dFecha')}
                    onChange={(e) => set('dFecha', e.target.value)}
                    aria-label="Fecha de cálculo"
                    style={{ ...IN, width: 190, flex: '0 0 auto' }}
                  />
                )}
                <span style={{ flex: 1 }} />
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  {([[false, 'Sin beneficio'], [true, 'Con beneficio']] as [boolean, string][]).map((m) => {
                    const on = conBeneficio === m[0];
                    return (
                      <button
                        key={m[1]}
                        onClick={() => setConBeneficio(m[0])}
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
                        {m[1]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p style={PIE}>
                Dos filtros del prototipo no están, y no por descuido. «Tipo de deuda» solo admitiría TRIBUTARIA —el
                backend rechaza los otros tres con 422, porque a un expediente se importan valores y hoy no distingue
                más—, y «Beneficio aplicable» solo admite TODOS: saber qué deuda alcanza cada campaña es D-02b.
              </p>
            </section>

            {conBeneficio && (
              <Franja tono="warn">
                Esta consulta lista la deuda de los obligados con un beneficio <b>registrado y vigente</b>, y no trae
                ninguna cifra rebajada. La columna «Con beneficio S/» sale «{SIN_DATO}»:{' '}
                {deudas.datos?.contenido[0]?.beneficios?.[0]?.efectoSobreElImporte ??
                  'sobre qué parte de la deuda se aplica el beneficio, en qué orden y con qué redondeo es D-02b (#191). El importe que se cobra es el que se debe.'}
              </Franja>
            )}

            {(deudas.cargando || deudas.error || (deudas.datos?.contenido.length ?? 0) === 0) && (
              <EstadoDeLectura
                lectura={deudas}
                ruta={conBeneficio ? 'GET /api/v1/coactiva/deudas-en-beneficio' : 'GET /api/v1/coactiva/deudas'}
                vacio={
                  <>
                    <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      {conBeneficio ? 'Ningún obligado con beneficio vigente' : 'Ninguna deuda en cobranza coactiva'}
                    </p>
                    <p style={{ margin: 0, maxWidth: '56ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                      La deuda coactiva es la de los expedientes abiertos. Sin expedientes no hay deuda coactiva que
                      consultar, aunque el padrón tenga deuda ordinaria.
                    </p>
                  </>
                }
              />
            )}

            {deudas.datos && deudas.datos.contenido.length > 0 && (
              <>
                <Tabla
                  titulo={conBeneficio ? 'Deuda coactiva de obligados con beneficio' : 'Deuda en cobranza coactiva'}
                  meta={`${deudas.datos.contenido.length} de ${deudas.datos.totalElementos.toLocaleString('es-PE')} · al ${deudas.datos.contenido[0]!.aLaFecha}`}
                  cols={COLS_DEUDA}
                  min={1060}
                  insignia={8}
                  filas={deudas.datos.contenido.map((d) => [
                    d.expediente,
                    String(d.ano),
                    `${d.codContribuyente}${d.contribuyente ? ' — ' + d.contribuyente : ''}`,
                    d.tributos.join(', ') || SIN_DATO,
                    d.deudaS,
                    d.costasS,
                    d.totalS,
                    SIN_DATO,
                    d.estado,
                  ])}
                  nota={`«Total S/» viaja calculado —deuda más costas— y no se suma aquí. La última actuación de cada expediente ${
                    deudas.datos.contenido.some((d) => d.ultimaActuacion) ? 'se lista debajo' : 'todavía no existe en ninguno'
                  }.`}
                />

                {conBeneficio && (
                  <section style={TARJETA}>
                    <div style={CABECERA}>
                      <h2 style={H2}>Beneficios registrados</h2>
                      <span style={META}>lo que la ordenanza declara, sin aplicar</span>
                    </div>
                    {deudas.datos.contenido.flatMap((d) =>
                      (d.beneficios ?? []).map((b, i) => (
                        <div key={d.expediente + i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>
                            {d.expediente} · {b.tipo} — {b.clase} · {b.tributo}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                            Declara {b.porcentajeDeclarado ? b.porcentajeDeclarado + ' %' : ''}
                            {b.montoDeclarado ? ' S/ ' + b.montoDeclarado : ''} · {b.baseLegal} · vigente desde{' '}
                            {b.vigenciaDesde}
                            {b.vigenciaHasta ? ' hasta ' + b.vigenciaHasta : ''}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
                            {b.efectoSobreElImporte}
                          </p>
                        </div>
                      )),
                    )}
                  </section>
                )}

                <Paginador
                  pagina={deudas.datos.pagina}
                  totalPaginas={deudas.datos.totalPaginas}
                  hayMas={deudas.datos.hayMas}
                  ir={setDPagina}
                  style={{ padding: 0, borderTop: 'none' }}
                />
              </>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
