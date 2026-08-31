import { useEffect, useState, type CSSProperties } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  ACTOS,
  AHORA,
  BASE_DEL_EMBUDO,
  CAMPOS_DE_VALORES,
  CHIPS,
  COLS_CUIS,
  COLS_LISTA,
  COLS_VALORES,
  CRITERIOS,
  CUIS,
  DECIDIR,
  DEFECTOS,
  EMBUDO,
  EXPEDIENTES,
  EXPEDIENTE_ABIERTO,
  HOJAS,
  KPIS,
  MATERIAS,
  MOTIVOS,
  MULTAS,
  OPCIONES,
  RECIBO_DE_LA_NOTIFICACION,
  TARIFAS,
  UIT,
  type CampoDeActo,
  type IdDeActo,
} from '../../datos/sanciones';

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
/* La hoja impresa lleva su propia escala: más apretada y con el filete negro
   de la cabecera institucional. */
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

const BOTON_SEC: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 16px',
  background: 'var(--bg-card)',
  fontSize: 13,
  cursor: 'pointer',
};
const BOTON_PRI: CSSProperties = {
  border: 0,
  borderRadius: 6,
  padding: '10px 20px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
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

/* Los trazos que el artboard dibuja como `circle` y `rect`, escritos como
   trazos porque `Icono` solo lleva paths. */
const T_LUPA = ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'M20 20l-4.3-4.3'];
const T_INFO = ['M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0', 'M12 8.4v.02', 'M12 11.4v4.2'];
const T_CANDADO = ['M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'];
const T_CARET = ['M6 9l6 6 6-6'];
const T_RELOJ = ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7.5V12l3 2'];

/** El tono de un estado en este módulo. No es el del sistema: aquí «Obras» y
 *  «Comercialización» son materias, y su color dice cuánto pesa la multa. */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/vencida|con papeleta|coactiva|sancionada|pendiente|infundado|obras/.test(t)) return 'bad';
  if (/notificada|constatada|preventiva|en descargo|comercialización|activo/.test(t)) return 'warn';
  return 'ok';
}

const fmt = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const soles = (n: number) => 'S/ ' + fmt(n);

/** El cuadro CUIS es la fuente de la multa: el porcentaje lo fija la
 *  ordenanza y el importe sale de la UIT del ejercicio. Escribir la multa a
 *  mano en la cabecera del expediente la desalineaba del código declarado. */
function deCuis(codigo: string) {
  const f = TARIFAS[codigo] ?? TARIFAS['A-014'];
  const multa = (UIT * f[2]) / 100;
  return {
    materia: f[0],
    descripcion: f[1],
    pct: f[2] + ' %',
    medida: f[3],
    uit: fmt(UIT),
    multa: fmt(multa),
    mitad: fmt(multa / 2),
  };
}

type EstadoDeActo = 'hecho' | 'actual' | 'bloqueado' | 'espera';

const ETIQUETA: Record<EstadoDeActo, string> = {
  hecho: 'Cumplido',
  actual: 'Te toca',
  bloqueado: 'No disponible',
  espera: 'En espera',
};
const TONO_DEL_ACTO: Record<EstadoDeActo, Tono> = {
  hecho: 'ok',
  actual: 'warn',
  bloqueado: 'neutro',
  espera: 'neutro',
};

/* ══════════ Piezas ══════════ */

function Cabecera({ titulo, meta, acciones }: { titulo: string; meta?: string; acciones?: React.ReactNode }) {
  return (
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
      <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{titulo}</h2>
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

function Celdas({ fila, defs, insignia }: { fila: string[]; defs: [string, 0 | 1][]; insignia: number }) {
  return (
    <>
      {fila.map((c, j) =>
        j === insignia ? (
          <td key={j} style={{ padding: '11px 14px' }}>
            <Insignia tono={tono(c)}>{c}</Insignia>
          </td>
        ) : (
          <td key={j} style={j === 0 ? TD1 : defs[j] && defs[j][1] ? TDN : TD}>
            {c}
          </td>
        ),
      )}
    </>
  );
}

/** Un campo del manual: el mismo control sirve a los tres actos, al criterio
 *  de generación de valores y a los criterios de un reporte. */
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
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
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
      {t === 'text' && (
        <input value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph ?? ''} style={IN} />
      )}
      {t === 'date' && <input type="date" value={String(valor)} onChange={(e) => onCambio(e.target.value)} style={IN} />}
      {t === 'sel' && (
        <select value={String(valor)} onChange={(e) => onCambio(e.target.value)} style={IN}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
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
      {t === 'chk' && (
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
            checked={valor === true}
            onChange={(e) => onCambio(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
        </span>
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
          {String(valor)}
        </span>
      )}
      {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
    </label>
  );
}

/* ══════════ La pantalla ══════════ */

export default function Sanciones({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('Todos');
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [hoja, setHoja] = useState(0);
  const [cuisQ, setCuisQ] = useState('');
  const [materia, setMateria] = useState('Todas');
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false, 3: false });

  /* «Nueva notificación» no es una pantalla aparte: es el primer acto del
     mismo expediente, con las tres tarjetas replegadas. */
  const esExpediente = dest === 'expediente' || dest === 'alta';
  useEffect(() => {
    if (dest !== 'alta') return;
    setAbiertos({});
    toast('Notificación nueva: es el primer acto del procedimiento.');
  }, [dest, toast]);

  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setSucio(true);
  };

  const cuisExp = String(vals.cuis ?? DEFECTOS.cuis);
  const tarifa = deCuis(cuisExp);

  /* Lo que el cuadro CUIS decide, puesto donde los campos lo leen. */
  const derivados: Record<string, string | boolean> = {
    ...DEFECTOS,
    descCuis: tarifa.descripcion,
    uit: tarifa.uit,
    pctUit: tarifa.pct,
    valorMulta: tarifa.multa,
    prontoPago: '− ' + tarifa.mitad,
    medida: tarifa.medida,
  };
  const valor = (k: string): string | boolean => vals[k] ?? derivados[k] ?? '';

  /* El estado de cada acto se deriva del anterior: es lo que decide si la
     tarjeta se puede abrir, en vez de una validación al final. */
  const notificado = String(valor('numeroN')) !== '';
  const plazoVencido = true;
  const actaHecha = String(valor('nroRis')) !== '';
  const hayDescargo = String(valor('expRg')) !== '';

  const estados: Record<IdDeActo, EstadoDeActo> = {
    notificacion: notificado ? 'hecho' : 'actual',
    sancion: !notificado ? 'bloqueado' : !plazoVencido ? 'bloqueado' : actaHecha ? 'hecho' : 'actual',
    resolucion: !actaHecha ? 'bloqueado' : hayDescargo ? 'actual' : 'espera',
  };
  const motivos: Record<IdDeActo, string> = {
    notificacion: '',
    sancion: MOTIVOS.sancion[notificado ? 1 : 0],
    resolucion: MOTIVOS.resolucion[actaHecha ? 1 : 0],
  };
  const recibos: Partial<Record<IdDeActo, [string, string][]>> = {
    notificacion: RECIBO_DE_LA_NOTIFICACION,
    sancion: [
      ['Resolución', String(valor('nroRis'))],
      ['Notificada', String(valor('fechaNotifRis'))],
      ['Multa', 'S/ ' + tarifa.multa + ' · CUIS ' + cuisExp],
      ['Medida complementaria', tarifa.medida],
    ],
  };
  const hayActual = (Object.keys(estados) as IdDeActo[]).some((k) => estados[k] === 'actual');
  const actoActual = ACTOS.map((a, i) => ({ a, i })).find((x) => estados[x.a.id] === 'actual');

  const filtrados = chip === 'Todos' ? EXPEDIENTES : EXPEDIENTES.filter((e) => e[4] === chip);

  const cq = cuisQ.toLowerCase();
  const cuisFiltrado = CUIS.filter((c) => {
    const porTexto = cq === '' || c[0].toLowerCase().indexOf(cq) >= 0 || c[2].toLowerCase().indexOf(cq) >= 0;
    const porMateria = materia === 'Todas' || c[1] === materia;
    return porTexto && porMateria;
  });

  let valSuma = 0;
  let valN = 0;
  MULTAS.forEach((m, i) => {
    if (marcadas[i]) {
      valSuma += m[4];
      valN++;
    }
  });

  const h = HOJAS[Math.min(hoja, HOJAS.length - 1)];

  const abrirExpediente = () => {
    setAbiertos({});
    onDest('expediente');
  };

  const destinos = moduloDe('sanciones').destinos;
  const etiquetaDeDestino = destinos.find((x) => x.k === dest)?.label ?? 'Infracciones administrativas';
  const miga = esExpediente
    ? ['Infracciones', 'Expedientes', EXPEDIENTE_ABIERTO.codigo]
    : ['Infracciones', etiquetaDeDestino];
  const titulo = esExpediente ? `Expediente ${EXPEDIENTE_ABIERTO.codigo}` : etiquetaDeDestino;

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Infracciones',
    ir: () => (o[1] === 'expediente' ? abrirExpediente() : onDest(o[1])),
  }));

  return (
    <Shell
      modulo="sanciones"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      contexto={
        esExpediente
          ? {
              volver: { label: 'Expedientes', onClick: () => onDest('lista') },
              codigo: EXPEDIENTE_ABIERTO.codigo,
              titular: EXPEDIENTE_ABIERTO.administrado,
              ubic: EXPEDIENTE_ABIERTO.meta,
              /* La barra lleva las dos cosas que el artboard pone a la derecha:
                 en qué estado está el plazo y qué acto toca ahora. */
              derecha: (
                <>
                  <Insignia tono="bad">{EXPEDIENTE_ABIERTO.estado}</Insignia>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'var(--accent-ink)',
                      background: 'var(--accent-soft)',
                      borderRadius: 999,
                      padding: '4px 11px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {actoActual ? `Te toca: ${actoActual.a.titulo.toLowerCase()}` : 'Sin acto pendiente'}
                  </span>
                </>
              ),
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Un procedimiento sancionador son tres actos en orden: se notifica, se da plazo para subsanar, y solo si no se subsana
              se sanciona. Trece opciones de menú escondían ese orden; aquí es la estructura.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  El procedimiento, de principio a fin
                </h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  812 notificaciones {pref.ejercicio}
                </span>
              </div>
              {EMBUDO.map((e, i) => {
                const pct = Math.min((e[2] / BASE_DEL_EMBUDO) * 100, 100);
                return (
                  <button
                    key={e[0]}
                    onClick={() => (e[3] === 'expediente' ? abrirExpediente() : onDest(e[3]))}
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
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flex: '0 0 auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-ink)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ flex: '0 0 186px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{e[0]}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        {e[1]}
                      </span>
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 50,
                        height: 22,
                        borderRadius: 5,
                        background: 'var(--accent-soft)',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: '0 auto 0 0',
                          width: `${pct.toFixed(1)}%`,
                          background: 'var(--accent)',
                          opacity: 0.42 + i * 0.12,
                        }}
                      />
                    </span>
                    <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {pct.toFixed(0)} %
                    </span>
                    <span style={{ flex: '0 0 58px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {e[2].toLocaleString('es-PE')}
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                );
              })}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '.13em',
                    color: 'var(--ink-3)',
                    flex: '0 0 auto',
                  }}
                >
                  Ahora mismo
                </span>
                {AHORA.map((a) => (
                  <button
                    key={a[1]}
                    onClick={() => onDest(a[2])}
                    className="hov-linea"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 7,
                      border: '1px solid var(--line-2)',
                      borderRadius: 999,
                      padding: '5px 13px',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{a[0]}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{a[1]}</span>
                  </button>
                ))}
                <span
                  data-sm-hide="1"
                  style={{ flex: 1, minWidth: 120, textAlign: 'right', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}
                >
                  Estados de hoy, no etapas del recorrido
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  padding: '11px 16px',
                  background: 'var(--bg-elev)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--ink-3)',
                  textWrap: 'pretty',
                }}
              >
                Que 214 notificaciones venzan sin que nadie las mire es el único punto donde el procedimiento se cae solo: pasado el
                plazo, o se sanciona o se archiva, y no hacer nada equivale a archivar.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ ...TARJETA, padding: '16px 17px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 25,
                      fontWeight: 500,
                      letterSpacing: '-.01em',
                      color: 'var(--accent-ink)',
                    }}
                  >
                    {k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Te toca decidir</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>4 expedientes</span>
              </div>
              {DECIDIR.map((p) => (
                <button
                  key={p.titulo}
                  onClick={() => (p.dest === 'expediente' ? abrirExpediente() : onDest(p.dest))}
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
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <Insignia tono={p.tono}>{p.dias}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{p.titulo}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                      {p.detalle}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: '0 0 auto' }}>{p.accion}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ LISTA DE EXPEDIENTES ══════════ */}
        {dest === 'lista' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Un expediente por administrado y por infracción. La columna que importa no es el número: es en qué acto está y cuánto
              plazo queda.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={T_LUPA} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Administrado, RUC, dirección o 001-004183"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                <button
                  onClick={() => toast(`Se encontraron ${filtrados.length} expedientes.`)}
                  className="hov-acento-2"
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '9px 20px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  }}
                >
                  Buscar
                </button>
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
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>En el acto</span>
                {CHIPS.map((c) => {
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
                      {c}
                    </button>
                  );
                })}
              </div>
            </section>

            {filtrados.length === 0 && (
              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '44px 24px',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  background: 'var(--bg-card)',
                }}
              >
                <Icono d={T_LUPA} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  Ningún expediente en ese acto
                </p>
                <p
                  style={{
                    margin: 0,
                    maxWidth: '52ch',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'var(--ink-3)',
                    textAlign: 'center',
                    textWrap: 'pretty',
                  }}
                >
                  Prueba con otro acto del procedimiento, o quita el filtro para ver los 812 del ejercicio.
                </p>
                <button onClick={() => setChip('Todos')} className="hov-linea" style={{ ...BOTON_SEC, marginTop: 6 }}>
                  Quitar el filtro
                </button>
              </section>
            )}

            {filtrados.length > 0 && (
              <section style={TARJETA}>
                <Cabecera
                  titulo="Expedientes sancionadores"
                  meta={`${filtrados.length} de 812`}
                  acciones={
                    <button
                      className="hov-linea"
                      style={{
                        border: '1px solid var(--line-2)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        background: 'var(--bg-elev)',
                        fontSize: 12,
                        color: 'var(--ink-2)',
                        cursor: 'pointer',
                      }}
                    >
                      Excel
                    </button>
                  }
                />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <Th defs={COLS_LISTA} />
                    </thead>
                    <tbody>
                      {filtrados.map((f) => (
                        <tr
                          key={f[0]}
                          onClick={abrirExpediente}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          <Celdas fila={f} defs={COLS_LISTA} insignia={7} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  Una notificación vencida sin sanción y sin archivo queda en el limbo: el plazo del administrado corrió, pero el de
                  la municipalidad para sancionar también corre.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL EXPEDIENTE: TRES ACTOS ══════════ */}
        {esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {(
                  [
                    ['Expediente', EXPEDIENTE_ABIERTO.codigo, 'var(--ink)'],
                    ['Administrado', EXPEDIENTE_ABIERTO.administrado, 'var(--ink)'],
                    ['Código CUIS', `${cuisExp} · ${tarifa.pct} UIT`, 'var(--ink)'],
                    ['Multa potencial', `S/ ${tarifa.multa}`, 'var(--ink)'],
                    ['Plazo', EXPEDIENTE_ABIERTO.plazo, 'var(--bad-fg)'],
                    ['Medida', tarifa.medida, 'var(--ink)'],
                  ] as const
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
                    <p
                      style={{
                        margin: '0 0 5px',
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '.11em',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {r[0]}
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2], textWrap: 'pretty' }}>{r[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '13px 16px',
                border: '1px solid var(--line-2)',
                borderLeft: `3px solid ${actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)'}`,
                borderRadius: 8,
                background: actoActual ? 'var(--accent-soft)' : 'var(--ok-bg)',
              }}
            >
              <Icono
                d={T_INFO}
                tam={17}
                grosor={1.8}
                style={{ color: actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)', flex: '0 0 auto', marginTop: 1 }}
              />
              <p
                style={{
                  margin: 0,
                  flex: 1,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: actoActual ? 'var(--accent-ink)' : 'var(--ok-fg)',
                  textWrap: 'pretty',
                }}
              >
                {actoActual
                  ? `Te toca el acto ${actoActual.i + 1}: ${actoActual.a.titulo.toLowerCase()}. Los actos anteriores quedan como constancia y los siguientes se abren cuando corresponda.`
                  : 'No hay ningún acto pendiente en este expediente. Lo que sigue depende del administrado.'}
              </p>
            </div>

            {ACTOS.map((a, i) => {
              const estado = estados[a.id];
              const bloqueado = estado === 'bloqueado' || estado === 'espera';
              const hecho = estado === 'hecho';
              const actual = estado === 'actual';
              const clave = 'acto|' + a.id;
              const guardado = abiertos[clave];
              /* Si ningún acto está «Te toca» —todos cumplidos y el siguiente
                 en espera—, abre el primero cumplido para que el expediente
                 nunca llegue con las tres tarjetas cerradas y sin un campo. */
              const porDefecto = actual || (!hayActual && i === 0);
              const abierto = bloqueado ? false : guardado === undefined ? porDefecto : guardado;
              const filas = recibos[a.id] ?? [];
              return (
                <section
                  key={a.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${actual ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: actual ? 'var(--shadow-2)' : 'var(--shadow-1)',
                  }}
                >
                  <button
                    onClick={() => {
                      if (bloqueado) {
                        toast(motivos[a.id]);
                        return;
                      }
                      setAbiertos((x) => ({ ...x, [clave]: !abierto }));
                    }}
                    aria-expanded={abierto}
                    aria-disabled={bloqueado}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: bloqueado ? 'default' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flex: '0 0 auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        ...(hecho
                          ? { background: 'var(--ok-bg)', color: 'var(--ok-fg)' }
                          : actual
                            ? { background: 'var(--accent)', color: '#fff' }
                            : { background: 'var(--bg-elev)', color: 'var(--ink-4)', border: '1px solid var(--line-2)' }),
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: bloqueado ? 'var(--ink-4)' : 'var(--ink)',
                        }}
                      >
                        {a.titulo}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        {a.hint}
                      </span>
                    </span>
                    <Insignia tono={TONO_DEL_ACTO[estado]}>{ETIQUETA[estado]}</Insignia>
                    {!bloqueado && (
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 20,
                          height: 20,
                          color: 'var(--ink-4)',
                          flex: '0 0 auto',
                          transform: `rotate(${abierto ? '0' : '-90'}deg)`,
                          transition: 'transform .15s ease',
                        }}
                      >
                        <Icono d={T_CARET} tam={13} grosor={2} />
                      </span>
                    )}
                    {bloqueado && (
                      <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, color: 'var(--ink-4)', flex: '0 0 auto' }}>
                        <Icono d={T_CANDADO} tam={13} grosor={1.8} />
                      </span>
                    )}
                  </button>

                  {bloqueado && (
                    <p
                      style={{
                        margin: 0,
                        padding: '0 16px 15px 58px',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: 'var(--ink-3)',
                        maxWidth: '80ch',
                        textWrap: 'pretty',
                      }}
                    >
                      {motivos[a.id]}
                    </p>
                  )}

                  {hecho && !abierto && filas.length > 0 && (
                    <div
                      style={{
                        borderTop: '1px solid var(--line)',
                        background: 'var(--bg-elev)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
                        gap: '12px 18px',
                        padding: '13px 16px 13px 58px',
                      }}
                    >
                      {filas.map((rf) => (
                        <div key={rf[0]}>
                          <p style={{ margin: '0 0 2px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                            {rf[0]}
                          </p>
                          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink)' }}>{rf[1]}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {abierto && (
                    <div style={{ borderTop: '1px solid var(--line)' }}>
                      {a.bloques.map((bl) => (
                        <div key={bl.titulo} style={{ borderBottom: '1px solid var(--line)' }}>
                          {bl.titulo && (
                            <p
                              style={{
                                margin: 0,
                                padding: '12px 16px 0',
                                fontSize: 10,
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '.13em',
                                color: 'var(--ink-3)',
                              }}
                            >
                              {bl.titulo}
                            </p>
                          )}
                          {bl.nota && (
                            <p
                              style={{
                                margin: 0,
                                padding: '8px 16px 0',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                color: 'var(--ink-3)',
                                maxWidth: '76ch',
                                textWrap: 'pretty',
                              }}
                            >
                              {bl.nota}
                            </p>
                          )}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
                              gap: '15px 16px',
                              padding: '15px 16px 17px',
                            }}
                          >
                            {bl.campos.map((f) => (
                              <Campo key={f.k} f={f} valor={valor(f.k)} onCambio={(v) => set(f.k, v)} />
                            ))}
                          </div>
                        </div>
                      ))}

                      {a.cuenta === true && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))',
                            gap: 0,
                            background: 'var(--bg-card)',
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          {(
                            [
                              ['Multa', `S/ ${tarifa.multa}`, 0],
                              ['Pronto pago', `− S/ ${tarifa.mitad}`, 0],
                              ['A pagar hoy', `S/ ${tarifa.mitad}`, 0],
                              ['Vence', '22/08/2026', 1],
                            ] as const
                          ).map((t) => (
                            <div
                              key={t[0]}
                              style={{
                                background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
                                padding: '13px 16px',
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
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          padding: '13px 16px',
                          background: 'var(--bg-elev)',
                        }}
                      >
                        <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                          {a.aviso}
                        </p>
                        <button className="hov-linea" style={BOTON_SEC}>
                          {a.secundaria}
                        </button>
                        <button
                          onClick={() => {
                            toast(`${a.primaria}: registrado en el expediente ${EXPEDIENTE_ABIERTO.codigo}.`);
                            setSucio(false);
                          }}
                          className="hov-acento-2"
                          style={BOTON_PRI}
                        >
                          {a.primaria}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* ══════════ CUADRO CUIS ══════════ */}
        {dest === 'cuis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El cuadro único de infracciones y sanciones, aprobado por ordenanza. El código elegido en el acta arrastra el
              porcentaje de UIT y la medida complementaria: ninguno de los dos se teclea.
            </p>

            <section style={TARJETA}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '13px 16px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <input
                  value={cuisQ}
                  onChange={(e) => setCuisQ(e.target.value)}
                  placeholder="Código o texto de la infracción"
                  style={{ ...IN, flex: 1, minWidth: 180, width: undefined }}
                />
                {MATERIAS.map((m) => {
                  const on = materia === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMateria(m)}
                      aria-pressed={on}
                      style={{
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                        borderRadius: 999,
                        padding: '6px 13px',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
                <button
                  onClick={() => window.print()}
                  className="hov-linea"
                  style={{
                    border: '1px solid var(--line-2)',
                    borderRadius: 6,
                    padding: '8px 14px',
                    background: 'var(--bg-card)',
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  Imprimir cuadro
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                  <thead>
                    <Th defs={COLS_CUIS} />
                  </thead>
                  <tbody>
                    {cuisFiltrado.map((f) => (
                      <tr key={f[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        <Celdas fila={f} defs={COLS_CUIS} insignia={1} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                {cuisFiltrado.length === CUIS.length
                  ? 'La multa sale del porcentaje de UIT: cambiar la UIT del ejercicio recalcula las 284 sin tocar el cuadro. Lo que la ordenanza fija es el porcentaje.'
                  : `${cuisFiltrado.length} de 284 infracciones coinciden con el filtro.`}
              </p>
            </section>
          </div>
        )}

        {/* ══════════ VALORES ══════════ */}
        {dest === 'valores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Las multas firmes se cobran a través de un valor. El criterio agrupa las que van juntas y define su vencimiento;
              pasada esa fecha, el valor puede ir a coactiva.
            </p>

            <section style={TARJETA}>
              <Cabecera
                titulo="Criterio de generación"
                acciones={
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                      color: 'var(--ink-3)',
                      background: 'var(--bg-elev)',
                      borderRadius: 999,
                      padding: '4px 10px',
                    }}
                  >
                    POST /api/v1/infracciones/administrativas/valores/generacion-masiva
                  </code>
                }
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
                  gap: '15px 16px',
                  padding: '15px 16px 17px',
                }}
              >
                {CAMPOS_DE_VALORES.map((f) => (
                  <Campo key={f.k} f={f} valor={vals[f.k] ?? DEFECTOS[f.k] ?? ''} onCambio={(v) => set(f.k, v)} />
                ))}
              </div>
              <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                      {COLS_VALORES.map((c) => (
                        <th key={c[0]} style={c[1] ? THN : TH}>
                          {c[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MULTAS.map((m, i) => {
                      const on = marcadas[i] === true;
                      return (
                        <tr
                          key={m[0]}
                          className="hov-elev"
                          style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}
                        >
                          <td style={{ padding: '11px 14px' }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setMarcadas((x) => ({ ...x, [i]: !on }))}
                              aria-label={`Incluir la multa ${m[0]} en el criterio`}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          <Celdas
                            fila={[m[0], m[1], m[2], m[3], fmt(m[4]), m[5]]}
                            defs={COLS_VALORES}
                            insignia={5}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                }}
              >
                <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Solo entran las multas firmes. Una en descargo no se puede cobrar todavía y no aparece aquí.
                </span>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>A emitir</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)' }}>{soles(valSuma)}</span>
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {valN === 0
                  ? 'Marca las multas que entran en el criterio. Sin selección no hay nada que emitir.'
                  : `${valN}${valN === 1 ? ' multa seleccionada' : ' multas seleccionadas'}. Procesar emite un valor por cada una y ya no se pueden quitar del criterio: se anulan.`}
              </p>
              <button className="hov-linea" style={{ ...BOTON_SEC, padding: '10px 18px' }}>
                Guardar criterio
              </button>
              <button
                onClick={() => toast(valN === 0 ? 'Marca al menos una multa.' : `${valN} valores emitidos por ${soles(valSuma)}.`)}
                aria-disabled={valN === 0}
                className="hov-acento-2"
                style={{ ...BOTON_PRI, padding: '11px 22px', opacity: valN === 0 ? 0.55 : 1 }}
              >
                {valN === 0 ? 'Procesar criterio' : `Procesar criterio (${valN})`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {dest === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p data-noprint="1" style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Seis entradas de menú eran seis reportes con el mismo formulario. Aquí son un carril, y cada uno pide solo los
              criterios que usa.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section data-noprint="1" style={TARJETA}>
                <p
                  style={{
                    margin: 0,
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  Reportes del módulo
                </p>
                {HOJAS.map((x, i) => {
                  const on = hoja === i;
                  const primero = i === 0 || HOJAS[i - 1].g !== x.g;
                  return (
                    <button
                      key={x.codigo}
                      onClick={() => setHoja(i)}
                      aria-current={on ? 'true' : undefined}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0 9px',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        borderBottom: '1px solid var(--line)',
                        padding: primero ? '12px 14px 11px' : '11px 14px',
                        cursor: 'pointer',
                        background: on ? 'var(--accent-soft)' : 'transparent',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {primero && (
                        <span
                          style={{
                            display: 'block',
                            width: '100%',
                            fontSize: 9.5,
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '.13em',
                            color: 'var(--ink-4)',
                            marginBottom: 5,
                          }}
                        >
                          {x.g}
                        </span>
                      )}
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, textWrap: 'pretty' }}>{x.label}</span>
                    </button>
                  );
                })}
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section data-noprint="1" style={TARJETA}>
                  <Cabecera titulo={h.label} meta={`${h.crit.length} de 13 criterios`} />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '14px 16px',
                      padding: '15px 16px',
                      alignItems: 'end',
                    }}
                  >
                    {h.crit.map((k) => {
                      const c = CRITERIOS[k];
                      return (
                        <Campo
                          key={k}
                          f={{ k: 'rep_' + k, l: c.l, t: c.t, o: c.o }}
                          valor={vals['rep_' + k] ?? c.v}
                          onCambio={(v) => set('rep_' + k, v)}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '12px 16px',
                      borderTop: '1px solid var(--line)',
                      background: 'var(--bg-elev)',
                    }}
                  >
                    <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Los criterios que este reporte no usa no se dibujan.
                    </p>
                    <button
                      className="hov-linea"
                      style={{
                        border: '1px solid var(--line-2)',
                        borderRadius: 6,
                        padding: '8px 15px',
                        background: 'var(--bg-card)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      Excel
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="hov-linea"
                      style={{
                        border: '1px solid var(--line-2)',
                        borderRadius: 6,
                        padding: '8px 15px',
                        background: 'var(--bg-card)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                      }}
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={() => toast(`${h.label} generado con ${h.crit.length} criterios.`)}
                      className="hov-acento-2"
                      style={{
                        border: 0,
                        borderRadius: 6,
                        padding: '9px 18px',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Generar
                    </button>
                  </div>
                </section>

                <section
                  style={{
                    background: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    boxShadow: 'var(--shadow-2)',
                    padding: '32px 34px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 11, borderBottom: '2px solid var(--ink)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600 }}>{pref.entidad}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-3)' }}>
                        Sub Gerencia de Fiscalización y Control Municipal
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                      <p style={{ margin: 0 }}>{h.codigo}</p>
                      <p style={{ margin: '3px 0 0' }}>13 de agosto de {pref.ejercicio}</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 22, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, letterSpacing: '-.01em' }}>
                      {h.label}
                    </h2>
                    <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{h.sub}</p>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
                      gap: '12px 18px',
                      margin: '20px 0',
                      padding: '14px 0',
                      borderTop: '1px solid var(--line)',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {h.meta.map((m) => (
                      <div key={m[0]}>
                        <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                          {m[0]}
                        </p>
                        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink)' }}>{m[1]}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {h.cols.map((c) => (
                            <th key={c[0]} style={c[1] ? RTHN : RTH}>
                              {c[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {h.filas.map((f) => (
                          <tr key={f[0]} style={{ borderTop: '1px solid var(--line)' }}>
                            {f.map((c, j) => (
                              <td key={j} style={h.cols[j] && h.cols[j][1] ? RTDN : RTD}>
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: '18px 0 0', fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                    {h.cierre}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginTop: 44 }}>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                      Sub Gerente de Fiscalización
                    </div>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                      Solicitante
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ EL BORRADOR SIN GUARDAR ══════════ */}
      {sucio && (
        <div
          data-noprint="1"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 20px',
            borderTop: '1px solid var(--line-2)',
            background: 'var(--bg-card)',
            boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
            margin: '18px -20px -96px',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--warn-fg)',
              background: 'var(--warn-bg)',
              borderRadius: 999,
              padding: '5px 12px',
            }}
          >
            <Icono d={T_RELOJ} tam={13} grosor={2} />
            Cambios sin guardar
          </span>
          <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Un acto administrativo notificado no se edita: se deja sin efecto por resolución. Guardar aquí solo afecta al acto en
            preparación.
          </p>
          <button
            onClick={() => {
              setVals({});
              setSucio(false);
              toast('Cambios descartados.');
            }}
            className="hov-linea"
            style={BOTON_SEC}
          >
            Deshacer
          </button>
          <button
            onClick={() => {
              setSucio(false);
              toast('Borrador guardado.');
            }}
            className="hov-acento-2"
            style={{ ...BOTON_PRI, padding: '10px 22px' }}
          >
            Guardar borrador
          </button>
        </div>
      )}
    </Shell>
  );
}
