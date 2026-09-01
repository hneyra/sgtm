import type { CSSProperties, ReactNode } from 'react';
import { Icono, type Trazos } from './Icono';
import { ICO } from './iconos';

/* ══════════ Insignias ══════════
   Los cuatro tonos que los artboards repiten. `flex:0 0 auto` va siempre:
   una insignia no cede ancho, el motivo largo va en el detalle de la fila. */
export type Tono = 'ok' | 'warn' | 'bad' | 'neutro';

const RELLENO: Record<Tono, CSSProperties> = {
  ok: { background: 'var(--ok-bg)', color: 'var(--ok-fg)' },
  warn: { background: 'var(--warn-bg)', color: 'var(--warn-fg)' },
  bad: { background: 'var(--bad-bg)', color: 'var(--bad-fg)' },
  neutro: { background: 'var(--bg-elev)', color: 'var(--ink-3)', border: '1px solid var(--line)' },
};

export function Insignia({
  tono = 'neutro',
  children,
  style,
}: {
  tono?: Tono;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 999,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
        ...RELLENO[tono],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** El tono que le toca a un estado, deducido de su texto. Los artboards lo
 *  resuelven así en vez de con un literal por fila. */
export function tonoDe(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiv|vencid|caducad|impag|anulad|rechazad|omiso|firme|deneg|infundad|riesgo|sin notificar/.test(t)) return 'bad';
  if (/por vencer|pendiente|silencio|observ|en plazo|por notificar|revisar|parcial|abiert/.test(t)) return 'warn';
  if (/pagad|cancelad|conform|vigente|notificad|al día|aprobad|fundad|conciliad|cerrad/.test(t)) return 'ok';
  return 'neutro';
}

/* ══════════ Sección con cabecera ══════════
   La tarjeta blanca con filete, cabecera y pie que estructura casi todas las
   pantallas del rediseño. */
export function Seccion({
  titulo,
  meta,
  acciones,
  pie,
  children,
  style,
  sinPadding = true,
}: {
  titulo?: ReactNode;
  meta?: ReactNode;
  acciones?: ReactNode;
  pie?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  sinPadding?: boolean;
}) {
  return (
    <section
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-1)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {(titulo || meta || acciones) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '13px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {titulo && (
            <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
              {titulo}
            </h2>
          )}
          {meta && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{meta}</span>
          )}
          {acciones}
        </div>
      )}
      <div style={sinPadding ? undefined : { padding: '14px 16px' }}>{children}</div>
      {pie && (
        <p
          style={{
            margin: 0,
            padding: '11px 16px',
            borderTop: '1px solid var(--line)',
            background: 'var(--bg-elev)',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--ink-3)',
            textWrap: 'pretty',
          }}
        >
          {pie}
        </p>
      )}
    </section>
  );
}

/* ══════════ Botones ══════════ */
export function Boton({
  variante = 'normal',
  icono,
  children,
  style,
  ...resto
}: {
  variante?: 'primario' | 'normal' | 'fantasma' | 'peligro';
  icono?: Trazos;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 7,
    padding: '9px 15px',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  const pinta: Record<string, CSSProperties> = {
    primario: { border: 0, background: 'var(--accent)', color: '#fff', fontWeight: 500 },
    normal: { border: '1px solid var(--line-2)', background: 'var(--bg-card)', color: 'var(--ink)' },
    fantasma: { border: '1px solid transparent', background: 'transparent', color: 'var(--ink-2)' },
    peligro: { border: '1px solid var(--bad-fg)', background: 'var(--bad-bg)', color: 'var(--bad-fg)' },
  };
  const clase =
    variante === 'primario' ? 'hov-acento-2' : variante === 'fantasma' ? 'hov-acento' : 'hov-linea';
  return (
    <button
      {...resto}
      className={[clase, resto.className].filter(Boolean).join(' ')}
      style={{ ...base, ...pinta[variante], ...(resto.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : null), ...style }}
    >
      {icono && <Icono d={icono} tam={14} grosor={1.8} />}
      {children}
    </button>
  );
}

/* ══════════ Campos ══════════ */
const CONTROL: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-2)',
  borderRadius: 7,
  padding: '9px 11px',
  fontSize: 13,
  background: 'var(--bg-card)',
  color: 'var(--ink)',
};

export function Campo({
  etiqueta,
  ayuda,
  ancho,
  children,
}: {
  etiqueta: ReactNode;
  ayuda?: ReactNode;
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }} data-ancho={ancho ? '1' : undefined}>
      <span
        style={{
          display: 'block',
          fontSize: 10.5,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--ink-3)',
          marginBottom: 5,
        }}
      >
        {etiqueta}
      </span>
      {children}
      {ayuda && (
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textWrap: 'pretty' }}>
          {ayuda}
        </span>
      )}
    </label>
  );
}

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...CONTROL, ...props.style }} />;
}

export function Selector(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...CONTROL, cursor: 'pointer', ...props.style }} />;
}

export function AreaDeTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...CONTROL, resize: 'vertical', minHeight: 72, ...props.style }} />;
}

/** La rejilla de campos que los formularios del rediseño usan. */
export function Rejilla({
  min = 210,
  gap = 13,
  children,
  style,
}: {
  min?: number;
  gap?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ══════════ Tabla ══════════
   Cabecera en versalitas, filas con filete y celdas numéricas en mono a la
   derecha. Es la tabla que los doce módulos repiten. */
export type Columna<F> = {
  clave: string;
  titulo: ReactNode;
  ancho?: string;
  num?: boolean;
  mono?: boolean;
  celda: (f: F, i: number) => ReactNode;
};

export function Tabla<F>({
  columnas,
  filas,
  onFila,
  vacio = 'No hay filas que mostrar.',
  claveDe,
}: {
  columnas: Columna<F>[];
  filas: F[];
  onFila?: (f: F, i: number) => void;
  vacio?: ReactNode;
  claveDe?: (f: F, i: number) => string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                style={{
                  textAlign: c.num ? 'right' : 'left',
                  padding: '9px 16px',
                  fontSize: 10.5,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  color: 'var(--ink-3)',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  whiteSpace: 'nowrap',
                  width: c.ancho,
                }}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td
                colSpan={columnas.length}
                style={{ padding: '26px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}
              >
                {vacio}
              </td>
            </tr>
          )}
          {filas.map((f, i) => (
            <tr
              key={claveDe ? claveDe(f, i) : i}
              onClick={onFila ? () => onFila(f, i) : undefined}
              className={onFila ? 'hov-acento' : undefined}
              style={{ cursor: onFila ? 'pointer' : undefined }}
            >
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid var(--line)',
                    textAlign: c.num ? 'right' : 'left',
                    fontFamily: c.num || c.mono ? 'var(--font-mono)' : undefined,
                    fontSize: c.num || c.mono ? 12.5 : 13,
                    color: 'var(--ink)',
                    verticalAlign: 'middle',
                  }}
                >
                  {c.celda(f, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════ Piezas menores repetidas ══════════ */

/** El párrafo serif de apertura que abre casi todos los destinos. */
export function Entradilla({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: 1.6,
        color: 'var(--ink-2)',
        maxWidth: '70ch',
        textWrap: 'pretty',
      }}
    >
      {children}
    </p>
  );
}

/** La tarjeta de cifra: número en mono grande, etiqueta y nota. */
export function Kpi({
  valor,
  etiqueta,
  nota,
  color,
  onClick,
}: {
  valor: ReactNode;
  etiqueta: ReactNode;
  nota?: ReactNode;
  color?: string;
  onClick?: () => void;
}) {
  const Etiqueta = onClick ? 'button' : 'div';
  return (
    <Etiqueta
      onClick={onClick}
      className={onClick ? 'hov-acento' : undefined}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-1)',
        padding: '17px 18px',
        textAlign: 'left',
        width: '100%',
        cursor: onClick ? 'pointer' : undefined,
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 27,
          fontWeight: 500,
          letterSpacing: '-.015em',
          color: color || 'var(--accent-ink)',
        }}
      >
        {valor}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>{etiqueta}</p>
      {nota && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{nota}</p>
      )}
    </Etiqueta>
  );
}

/** La barra de avance de «emitido contra recaudado». */
export function Barra({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <span
      style={{
        flex: 1,
        minWidth: 60,
        height: 10,
        borderRadius: 999,
        background: 'var(--accent-soft)',
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
          borderRadius: 999,
        }}
      />
    </span>
  );
}

/** La fila pulsable con insignia, título, detalle y cifras a la derecha. */
export function FilaDeLista({
  insignia,
  tono = 'neutro',
  titulo,
  detalle,
  cifra,
  subcifra,
  onClick,
}: {
  insignia?: ReactNode;
  tono?: Tono;
  titulo: ReactNode;
  detalle?: ReactNode;
  cifra?: ReactNode;
  subcifra?: ReactNode;
  onClick?: () => void;
}) {
  const Etiqueta = onClick ? 'button' : 'div';
  return (
    <Etiqueta
      onClick={onClick}
      className={onClick ? 'hov-acento' : undefined}
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
        cursor: onClick ? 'pointer' : undefined,
        font: 'inherit',
        color: 'inherit',
      }}
    >
      {insignia !== undefined && <Insignia tono={tono}>{insignia}</Insignia>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{titulo}</span>
        {detalle && (
          <span
            style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}
          >
            {detalle}
          </span>
        )}
      </span>
      {(cifra || subcifra) && (
        <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
          {cifra && (
            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
              {cifra}
            </span>
          )}
          {subcifra && (
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-4)',
                marginTop: 2,
              }}
            >
              {subcifra}
            </span>
          )}
        </span>
      )}
      {onClick && <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />}
    </Etiqueta>
  );
}

/** El aviso de bloque: dice qué falta y por qué, sin prometer nada. */
export function Aviso({
  tono = 'warn',
  titulo,
  children,
}: {
  tono?: Tono;
  titulo?: ReactNode;
  children: ReactNode;
}) {
  const c = RELLENO[tono];
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: 11,
        padding: '12px 14px',
        borderRadius: 8,
        background: c.background,
        color: c.color,
        border: `1px solid color-mix(in srgb, ${String(c.color)} 22%, transparent)`,
      }}
    >
      <Icono d={ICO.aviso} tam={16} grosor={1.8} style={{ flex: '0 0 auto', marginTop: 1 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.55, textWrap: 'pretty' }}>
        {titulo && <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>{titulo}</strong>}
        {children}
      </span>
    </div>
  );
}

/** Las pestañas de un expediente. */
export function Pestanias<K extends string>({
  valor,
  opciones,
  onCambio,
}: {
  valor: K;
  opciones: { k: K; label: ReactNode; pastilla?: ReactNode }[];
  onCambio: (k: K) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--line)',
        padding: '0 16px',
        overflowX: 'auto',
      }}
    >
      {opciones.map((o) => {
        const on = o.k === valor;
        return (
          <button
            key={o.k}
            role="tab"
            aria-selected={on}
            onClick={() => onCambio(o.k)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 0,
              background: 'transparent',
              padding: '11px 12px',
              fontSize: 13,
              cursor: 'pointer',
              color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
              fontWeight: on ? 600 : 400,
              borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
            {o.pastilla !== undefined && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  borderRadius: 999,
                  padding: '1px 6px',
                  background: on ? 'var(--accent-soft)' : 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-3)',
                }}
              >
                {o.pastilla}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Dato de ficha: rótulo arriba, valor abajo. */
export function Dato({
  rotulo,
  children,
  mono,
}: {
  rotulo: ReactNode;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          margin: '0 0 3px',
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.11em',
          color: 'var(--ink-3)',
        }}
      >
        {rotulo}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--ink)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          textWrap: 'pretty',
        }}
      >
        {children}
      </p>
    </div>
  );
}

/** El código en pastilla mono sobre tinte de acento. */
export function Codigo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        color: 'var(--accent-ink)',
        background: 'var(--accent-soft)',
        borderRadius: 5,
        padding: '4px 9px',
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** El rótulo en versalitas que abre un bloque. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: 'var(--ink-3)',
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/** La franja de pie que explica de dónde sale lo que se ve. */
export function Nota({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12,
        lineHeight: 1.55,
        color: 'var(--ink-3)',
        textWrap: 'pretty',
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/** El esqueleto de carga. */
export function Esqueleto({ alto = 14, ancho = '100%' }: { alto?: number; ancho?: number | string }) {
  return <span data-esq="1" style={{ display: 'block', height: alto, width: ancho }} />;
}
