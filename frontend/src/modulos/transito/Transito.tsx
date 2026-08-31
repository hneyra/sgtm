import { useEffect, useState, type CSSProperties } from 'react';
import { Shell, type Contexto, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { miles, soles, usarPreferencias } from '../../shell/preferencias';
import {
  AHORA,
  AVISO_DESCARGO,
  CAMPOS_LIBERACION,
  CICLO,
  CICLO_BASE,
  CODIGOS,
  COLS_COD,
  COLS_PADRON,
  CRITERIOS,
  DEFECTOS,
  DEPOSITOS,
  EXPEDIENTE,
  FILTROS,
  GRAVEDADES,
  HITOS,
  HOJAS,
  INTERNADOS,
  KPIS,
  OPCIONES,
  PADRON,
  PLAZOS,
  PROCESOS,
  TOTALES_PLACA,
  type CampoDef,
  type Columna,
  type Fila,
} from '../../datos/transito';

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

/** El tono de un estado, con el mismo orden de comprobación del artboard:
 *  «muy grave» tiene que decidirse antes que «grave». */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiva|muy grave|pendiente|internado|anulad|abandono|infundado/.test(t)) return 'bad';
  if (/grave|a cuenta|con descargo|por notificar|activo|en evaluación/.test(t)) return 'warn';
  return 'ok';
}

/** La celda de una tabla: la primera columna en mono fuerte, las numéricas a
 *  la derecha, el resto en texto. */
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

/** El chevron que abre y cierra: gira 90° cuando está plegado. */
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

/** La lupa del artboard: círculo y mango, no el trazo de `ICO.lupa`. */
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
      {t === 'text' && (
        <input value={texto} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph ?? ''} style={IN} />
      )}
      {t === 'date' && <input type="date" value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN} />}
      {t === 'sel' && (
        <select value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
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
            onChange={(e) => set(f.k, e.target.checked)}
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
          {texto}
        </span>
      )}
      {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
    </label>
  );
}

/** La rejilla de campos que envuelve a los formularios del módulo. */
function RejillaDeCampos({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
        gap: '15px 16px',
        padding: '15px 16px 17px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** El cuerpo de una tabla del módulo: la columna marcada sale como insignia. */
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
          key={f[0] + i}
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

/**
 * Tránsito: veintitrés opciones de menú para un solo objeto, la papeleta. Lo
 * que cambia de una a otra es en qué punto de su vida está y qué plazo corre,
 * y por eso el módulo se ordena por eso y no por el menú del manual.
 */
export default function Transito({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  const [verPapeleta, setVerPapeleta] = useState(false);
  const [q, setQ] = useState('NB-21169');
  const [avanzada, setAvanzada] = useState(false);
  const [cerradas, setCerradas] = useState<Record<string, boolean>>({});
  const [hojaIdx, setHojaIdx] = useState(0);
  const [proceso, setProceso] = useState('valores');
  const [deposito, setDeposito] = useState('Todos');
  const [vehiculo, setVehiculo] = useState('T2G-418');
  const [codQ, setCodQ] = useState('');
  const [gravedad, setGravedad] = useState('Todas');
  const [req, setReq] = useState<Record<string, Record<string, boolean>>>({ 'T2G-418': { soat: true } });
  /* Los filtros de la búsqueda avanzada no son datos de la papeleta: se
     tecleran y no dejan la pantalla con cambios sin guardar. */
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const val = (k: string, d: string | boolean | undefined): string | boolean =>
    vals[k] !== undefined ? vals[k] : d !== undefined ? d : '';
  const valorDe = (f: CampoDef) => val(f.k, f.v !== undefined ? f.v : DEFECTOS[f.k]);
  const set = (k: string, v: string | boolean) => {
    setVals((x) => ({ ...x, [k]: v }));
    setSucio(true);
  };
  const texto = (k: string) => String(val(k, DEFECTOS[k]));

  /* La papeleta abierta no es un destino del panel: es el detalle del padrón,
     y «Registrar papeleta» entra por la misma pantalla en blanco. */
  const esPapeleta = dest === 'alta' || (dest === 'padron' && verPapeleta);
  const irDest = (k: string) => {
    setVerPapeleta(false);
    onDest(k);
  };
  const abrirPapeleta = () => {
    setVerPapeleta(true);
    if (dest !== 'padron') onDest('padron');
  };
  const irA = (k: string) => (k === 'papeleta' ? abrirPapeleta() : irDest(k));

  useEffect(() => {
    if (dest !== 'alta') return;
    setCerradas({});
    toast('Papeleta nueva: el código de infracción trae la multa y la medida.');
  }, [dest, toast]);

  const numero = texto('numero');

  const colapsable = (clave: string, porDefecto: boolean) => {
    const cerrada = cerradas[clave];
    const abierta = cerrada === undefined ? porDefecto : !cerrada;
    return { abierta, toggle: () => setCerradas((c) => ({ ...c, [clave]: abierta })) };
  };

  /* Las cuatro secciones del expediente, con la marca que dice si hay algo
     dentro: sin descargo y pagada son las dos que se leen en verde. */
  const secciones = EXPEDIENTE.map((g, gi) => {
    const c = colapsable('pap|' + g.id, gi < 2);
    let marca = '';
    let tonoMarca: Tono = 'ok';
    if (g.id === 'descargo') {
      const hay = val('expDescargo', DEFECTOS.expDescargo) !== '';
      marca = hay ? 'Con descargo' : 'Sin descargo';
      tonoMarca = hay ? 'warn' : 'ok';
    } else if (g.id === 'cancelacion') {
      const pago = val('cancelo', DEFECTOS.cancelo) === true;
      marca = pago ? 'Pagada' : 'Pendiente';
      tonoMarca = pago ? 'ok' : 'bad';
    }
    return { ...g, abierta: c.abierta, toggle: c.toggle, marca, tonoMarca };
  });

  /* Internamiento: la tarjeta de liberación se compone del vehículo elegido y
     los requisitos van por placa, para que un expediente marcado no abra la
     puerta de otro vehículo. */
  const veh = INTERNADOS.find((v) => v.placa === vehiculo) ?? INTERNADOS[0];
  const vehReq = req[veh.placa] ?? {};
  const custodia = veh.dias * veh.tasa;
  const REQS = [
    { k: 'multa', label: 'Multa de la papeleta cancelada', detalle: 'Recibo de caja por la papeleta ' + veh.papeleta + ' — infracción ' + veh.codigo + '.', monto: soles(veh.multa) },
    { k: 'custodia', label: 'Tasa de custodia cancelada', detalle: veh.dias + ' días a ' + soles(veh.tasa) + ' por día. Sigue corriendo hasta el retiro.', monto: soles(custodia) },
    { k: 'soat', label: 'SOAT vigente acreditado', detalle: 'Copia del certificado con vigencia a la fecha de retiro.', monto: '—' },
  ];
  const listos = REQS.filter((r) => vehReq[r.k] === true).length;
  const yaLiberado = veh.estado === 'Liberado';
  const puedeLiberar = !yaLiberado && listos === REQS.length;

  const proc = PROCESOS.find((p) => p.k === proceso) ?? PROCESOS[0];

  const codFiltrados = CODIGOS.filter((c) => {
    const cq = codQ.toLowerCase();
    const porTexto = cq === '' || c[0].toLowerCase().indexOf(cq) >= 0 || c[1].toLowerCase().indexOf(cq) >= 0;
    const porGrav = gravedad === 'Todas' || c[2] === gravedad;
    return porTexto && porGrav;
  });

  const hoja = HOJAS[Math.min(hojaIdx, HOJAS.length - 1)];

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({ label: o[0], nota: 'Tránsito', ir: () => irA(o[1]) }));

  const etiquetaDeDestino =
    moduloDe('transito').destinos.find((x) => x.k === dest)?.label ?? 'Tránsito';
  const miga = esPapeleta ? ['Tránsito', 'Papeletas', numero] : ['Tránsito', etiquetaDeDestino];
  const titulo = esPapeleta ? 'Papeleta ' + numero : etiquetaDeDestino;

  const pagada = val('cancelo', DEFECTOS.cancelo) === true;
  const contexto: Contexto | undefined = esPapeleta
    ? {
        volver: {
          label: 'Papeletas',
          onClick: () => {
            setVerPapeleta(false);
            if (dest === 'alta') onDest('padron');
          },
        },
        codigo: numero,
        titular: texto('placa'),
        ubic: texto('infractor'),
        estado: pagada ? 'Pagada' : 'Pendiente · Descargo vence en 3 días',
        estadoColor: pagada ? 'var(--ok-fg)' : 'var(--warn-fg)',
      }
    : undefined;

  return (
    <Shell modulo="transito" dest={dest} onDest={irDest} miga={miga} titulo={titulo} contexto={contexto} paleta={paleta}>
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
                <span style={META}>12,844 levantadas</span>
              </div>
              {CICLO.map((c, i) => {
                const pct = (c[2] / CICLO_BASE) * 100;
                return (
                  <button
                    key={c[0]}
                    onClick={() => irA(c[3])}
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
                    <span style={{ flex: '0 0 178px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{c[0]}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{c[1]}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.42 + i * 0.15 }} />
                    </span>
                    <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {pct.toFixed(0)} %
                    </span>
                    <span style={{ flex: '0 0 66px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {miles(c[2])}
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
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)', flex: '0 0 auto' }}>
                  Ahora mismo
                </span>
                {AHORA.map((a) => (
                  <button
                    key={a[1]}
                    onClick={() => irA(a[2])}
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
                <span data-sm-hide="1" style={{ flex: 1, minWidth: 120, textAlign: 'right', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                  Estados de hoy, no etapas del recorrido
                </span>
              </div>
              <p style={PIE}>
                Una papeleta que no se notifica no llega a ser firme y no se puede cobrar: 1,842 sin notificar son S/ 788,976 que no entran.
                Es la fuga más grande del módulo.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
                    {k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Plazos que vencen esta semana</h2>
                <span style={META}>4 vencimientos</span>
              </div>
              {PLAZOS.map((p) => (
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
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <Insignia tono={p.tono}>{p.dias}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{p.titulo}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{p.detalle}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flex: '0 0 auto' }}>{p.monto}</span>
                </button>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ PADRÓN DE PAPELETAS ══════════ */}
        {dest === 'padron' && !esPapeleta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              En ventanilla se busca por placa y casi nunca por número. Una placa trae todas sus papeletas, su deuda de hoy y lo que se
              pagaría con el beneficio vigente.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Lupa tam={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="NB-21169 · MDC-2026-041182 · DNI del conductor"
                  style={{
                    flex: 1,
                    border: 0,
                    background: 'transparent',
                    fontSize: 15,
                    padding: '3px 0',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '.04em',
                  }}
                />
                <button
                  onClick={() => toast('Se encontraron 6 papeletas de la placa ' + q + '.')}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}
                >
                  Buscar
                </button>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <button
                  onClick={() => setAvanzada((v) => !v)}
                  aria-expanded={avanzada}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <Caret abierta={avanzada} tam={12} ancho={16} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Búsqueda avanzada</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    conductor · propietario · fechas · estado
                  </span>
                </button>
                {avanzada && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(184px,1fr))', gap: '14px 16px', padding: '4px 16px 16px' }}>
                    {FILTROS.map((f) => (
                      <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                        {f.tipo === 'sel' && (
                          <select
                            value={filtros[f.label] ?? f.valor}
                            onChange={(e) => setFiltros((v) => ({ ...v, [f.label]: e.target.value }))}
                            style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-card)', fontSize: 13.5 }}
                          >
                            {(f.opts ?? []).map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        )}
                        {f.tipo === 'texto' && (
                          <input
                            value={filtros[f.label] ?? f.valor}
                            onChange={(e) => setFiltros((v) => ({ ...v, [f.label]: e.target.value }))}
                            placeholder={f.ph}
                            style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-card)', fontSize: 13.5 }}
                          />
                        )}
                        {f.tipo === 'fecha' && (
                          <input
                            type="date"
                            value={filtros[f.label] ?? f.valor}
                            onChange={(e) => setFiltros((v) => ({ ...v, [f.label]: e.target.value }))}
                            style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-card)', fontSize: 13.5 }}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                gap: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {TOTALES_PLACA.map((t) => (
                <div
                  key={t[0]}
                  style={{
                    background: t[3] ? 'var(--accent-soft)' : 'var(--bg-card)',
                    padding: '14px 16px',
                    borderLeft: '1px solid var(--line)',
                    borderTop: '1px solid var(--line)',
                    margin: '-1px 0 0 -1px',
                  }}
                >
                  <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: t[2] }}>{t[1]}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>Papeletas de la placa NB-21169</h2>
                <span style={META}>6 registros</span>
                <button className="hov-linea" style={BOTON_LINEA}>
                  Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <Cabecera cols={COLS_PADRON} />
                  <CuerpoDeTabla filas={PADRON} cols={COLS_PADRON} insigniaEn={6} hov="hov-acento" onFila={() => abrirPapeleta()} />
                </table>
              </div>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                «A pagar» ya lleva aplicado el beneficio vigente. El importe es el de la papeleta; lo que se cobra en caja es la otra
                columna.
              </p>
            </section>
          </div>
        )}

        {/* ══════════ EXPEDIENTE DE LA PAPELETA ══════════ */}
        {esPapeleta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={TARJETA}>
              <div style={{ padding: '15px 16px 4px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
                  Línea de vida
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  {HITOS.map((h, i) => {
                    const activo = h[2] === 1;
                    const actual = h[2] === 2;
                    const relleno = activo ? 'var(--accent)' : actual ? 'var(--warn-fg)' : 'var(--bg-card)';
                    const borde = activo ? 'var(--accent)' : actual ? 'var(--warn-fg)' : 'var(--line-2)';
                    const rieAntes = i === 0 ? 'transparent' : h[2] > 0 ? 'var(--accent)' : 'var(--line-2)';
                    const rieDesp = i === HITOS.length - 1 ? 'transparent' : HITOS[i + 1][2] > 0 ? 'var(--accent)' : 'var(--line-2)';
                    return (
                      <span key={h[0]} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <span style={{ flex: 1, height: 2, background: rieAntes }} />
                          <span
                            style={{
                              width: actual ? 13 : 11,
                              height: actual ? 13 : 11,
                              borderRadius: '50%',
                              flex: '0 0 auto',
                              background: relleno,
                              border: `2px solid ${borde}`,
                            }}
                          />
                          <span style={{ flex: 1, height: 2, background: rieDesp }} />
                        </span>
                        <span style={{ display: 'block', padding: '0 6px' }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 11.5,
                              fontWeight: actual ? 600 : 400,
                              color: activo ? 'var(--ink)' : actual ? 'var(--warn-fg)' : 'var(--ink-4)',
                              textWrap: 'pretty',
                            }}
                          >
                            {h[0]}
                          </span>
                          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>{h[1]}</span>
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)', marginTop: 12 }}>
                {(
                  [
                    ['Código', texto('codigo'), 'var(--ink)'],
                    ['Gravedad', texto('gravedad'), 'var(--bad-fg)'],
                    ['Multa', 'S/ ' + texto('multa'), 'var(--ink)'],
                    ['Pronto pago', 'S/ ' + texto('prontoPago'), 'var(--ok-fg)'],
                    ['Puntos', texto('puntos'), 'var(--ink)'],
                    ['Medida', 'Retención', 'var(--ink)'],
                  ] as const
                ).map((r) => (
                  <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2] }}>{r[1]}</p>
                  </div>
                ))}
              </div>
            </section>

            {val('expDescargo', DEFECTOS.expDescargo) === '' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '13px 16px',
                  border: '1px solid var(--line-2)',
                  borderLeft: '3px solid var(--warn-fg)',
                  borderRadius: 8,
                  background: 'var(--warn-bg)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" style={{ color: 'var(--warn-fg)', flex: '0 0 auto', marginTop: 1 }}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 8v4l2.5 1.6" />
                </svg>
                <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: 'var(--warn-fg)', textWrap: 'pretty' }}>{AVISO_DESCARGO}</p>
                <button
                  onClick={() => {
                    setCerradas((c) => ({ ...c, 'pap|descargo': false }));
                    toast('Sección de descargo abierta.');
                  }}
                  className="hov-elev"
                  style={{ border: '1px solid var(--warn-fg)', borderRadius: 6, padding: '6px 13px', background: 'transparent', color: 'var(--warn-fg)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}
                >
                  Registrar descargo
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <nav
                aria-label="Secciones de la papeleta"
                data-sm-hide="1"
                style={{ flex: '0 0 200px', width: 200, position: 'sticky', top: 112, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <p style={{ margin: '0 0 6px 10px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  En esta papeleta
                </p>
                {secciones.map((s) => (
                  <a
                    key={s.id}
                    href={'#' + s.id}
                    /* La ruta de la aplicación vive en el hash, así que un ancla
                       suelta sacaría de Tránsito: se desplaza a mano. */
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="hov-acento"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 7, padding: '8px 10px', textDecoration: 'none', color: 'var(--ink-2)', borderBottom: '1px solid transparent' }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{s.label}</span>
                    {s.marca && (
                      <span
                        style={{
                          fontSize: 10,
                          borderRadius: 999,
                          padding: '2px 7px',
                          flex: '0 0 auto',
                          background: s.marca === 'Pagada' || s.marca === 'Sin descargo' ? 'var(--ok-bg)' : 'var(--warn-bg)',
                          color: s.marca === 'Pagada' || s.marca === 'Sin descargo' ? 'var(--ok-fg)' : 'var(--warn-fg)',
                        }}
                      >
                        {s.marca}
                      </span>
                    )}
                  </a>
                ))}
              </nav>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {secciones.map((s) => (
                  <section key={s.id} id={s.id} style={{ ...TARJETA, scrollMarginTop: 120 }}>
                    <button
                      onClick={s.toggle}
                      aria-expanded={s.abierta}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 0, background: 'transparent', padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <Caret abierta={s.abierta} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{s.hint}</span>
                      </span>
                      {s.marca && <Insignia tono={s.tonoMarca}>{s.marca}</Insignia>}
                    </button>
                    {s.abierta && (
                      <RejillaDeCampos style={{ borderTop: '1px solid var(--line)' }}>
                        {s.campos.map((f) => (
                          <CampoForm key={f.k} f={f} valor={valorDe(f)} set={set} />
                        ))}
                      </RejillaDeCampos>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ INTERNAMIENTO ══════════ */}
        {dest === 'internamiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              La tasa de custodia corre por día y no se detiene. Lo que decide si el vehículo sale son tres requisitos, y por eso están como
              lista y no como campos.
            </p>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>Vehículos en depósito</h2>
                <span style={META}>3 de 118</span>
                <select
                  value={deposito}
                  onChange={(e) => setDeposito(e.target.value)}
                  aria-label="Depósito"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 10px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                >
                  {DEPOSITOS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              {INTERNADOS.map((v) => {
                const on = veh.placa === v.placa;
                const critico = v.dias >= 15;
                return (
                  <button
                    key={v.placa}
                    onClick={() => setVehiculo(v.placa)}
                    aria-current={on ? 'true' : undefined}
                    className="hov-acento"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      width: '100%',
                      textAlign: 'left',
                      border: 0,
                      borderBottom: '1px solid var(--line)',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', letterSpacing: '.06em', flex: '0 0 auto' }}>{v.placa}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)' }}>{v.papeleta}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                        {'Ingresó ' + v.ingreso + ' · ' + v.medida + ' por ' + v.codigo + (v.salida ? ' · liberado el ' + v.salida : '')}
                      </span>
                    </span>
                    <span
                      style={{
                        flex: '0 0 auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        borderRadius: 999,
                        padding: '3px 9px',
                        background: critico ? 'var(--bad-bg)' : 'var(--bg-elev)',
                        color: critico ? 'var(--bad-fg)' : 'var(--ink-3)',
                      }}
                    >
                      {v.dias} días
                    </span>
                    <span style={{ flex: '0 0 84px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>
                      {soles(v.dias * v.tasa)}
                    </span>
                    <Insignia tono={tono(v.estado)}>{v.estado}</Insignia>
                  </button>
                );
              })}
              <p style={PIE}>
                Pasados 30 días sin reclamo el vehículo entra en abandono y el procedimiento cambia: deja de ser una liberación y pasa a ser
                un remate.
              </p>
            </section>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Liberación de {veh.placa}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    {yaLiberado
                      ? 'Liberado el ' + veh.salida + ' · custodia cerrada en ' + soles(custodia)
                      : listos + ' de ' + REQS.length + ' requisitos cumplidos · custodia ' + soles(custodia) + ' y contando'}
                  </p>
                </div>
                <Insignia tono={yaLiberado ? 'ok' : puedeLiberar ? 'ok' : 'bad'}>
                  {yaLiberado ? 'Liberado' : puedeLiberar ? 'Puede salir' : 'Retenido'}
                </Insignia>
              </div>
              {REQS.map((r) => (
                <label
                  key={r.k}
                  className="hov-elev"
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={vehReq[r.k] === true}
                    onChange={(e) =>
                      setReq((x) => ({ ...x, [veh.placa]: { ...(x[veh.placa] ?? {}), [r.k]: e.target.checked } }))
                    }
                    style={{ accentColor: 'var(--accent)', width: 18, height: 18, flex: '0 0 auto' }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{r.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r.detalle}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', flex: '0 0 auto' }}>{r.monto}</span>
                </label>
              ))}
              <RejillaDeCampos>
                {CAMPOS_LIBERACION.map((f) => (
                  <CampoForm key={f.k} f={f} valor={valorDe(f)} set={set} />
                ))}
              </RejillaDeCampos>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {yaLiberado
                    ? 'Este vehículo ya salió del depósito. El expediente queda cerrado y solo se consulta.'
                    : puedeLiberar
                      ? 'Los tres requisitos están cumplidos. Al liberar se cierra el internamiento y deja de correr la tasa.'
                      : 'Faltan requisitos. El vehículo no puede salir del depósito y la tasa sigue corriendo.'}
                </p>
                <button
                  onClick={() =>
                    toast(
                      yaLiberado
                        ? 'El vehículo ' + veh.placa + ' ya fue liberado el ' + veh.salida + '.'
                        : puedeLiberar
                          ? 'Vehículo ' + veh.placa + ' liberado. Internamiento cerrado en ' + soles(custodia) + '.'
                          : 'Faltan ' + (REQS.length - listos) + ' requisitos por cumplir para ' + veh.placa + '.',
                    )
                  }
                  aria-disabled={!puedeLiberar}
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '11px 22px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: puedeLiberar ? 1 : 0.55,
                  }}
                >
                  Liberar vehículo
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ══════════ PROCESOS ══════════ */}
        {dest === 'procesos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Tres actos que no son la papeleta pero la mueven: generar los valores para cobrarla, corregir su número cuando el operador se
              equivocó, y emitir la resolución que le toca.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROCESOS.map((h) => {
                const on = proceso === h.k;
                return (
                  <button
                    key={h.k}
                    onClick={() => setProceso(h.k)}
                    aria-pressed={on}
                    className="hov-linea"
                    style={{
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                      borderRadius: 999,
                      padding: '7px 15px',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: on ? 600 : 400,
                      background: on ? 'var(--accent)' : 'var(--bg-card)',
                      color: on ? '#fff' : 'var(--ink-2)',
                    }}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>

            <section style={TARJETA}>
              <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                <h2 style={H2}>{proc.titulo}</h2>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>
                  {proc.endpoint}
                </code>
              </div>
              <p style={{ margin: 0, padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                {proc.desc}
              </p>
              <RejillaDeCampos style={{ borderTop: '1px solid var(--line)' }}>
                {proc.campos.map((f) => (
                  <CampoForm key={f.k} f={f} valor={valorDe(f)} set={set} />
                ))}
              </RejillaDeCampos>
              {proc.tabla && (
                <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: proc.tabla.min }}>
                    <Cabecera cols={proc.tabla.cols} />
                    <CuerpoDeTabla filas={proc.tabla.filas} cols={proc.tabla.cols} insigniaEn={proc.tabla.cols.length - 1} />
                  </table>
                </div>
              )}
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>{proc.nota}</p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{proc.aviso}</p>
              <button className="hov-linea" style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}>
                {proc.secundaria}
              </button>
              <button
                onClick={() => {
                  toast(proc.hecho);
                  setSucio(false);
                }}
                className="hov-acento-2"
                style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
              >
                {proc.primaria}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ CÓDIGOS ══════════ */}
        {dest === 'codigos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El catálogo del Reglamento Nacional de Tránsito. El código elegido al registrar una papeleta arrastra la multa, los puntos y
              la medida preventiva: no se teclean.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <input
                  value={codQ}
                  onChange={(e) => setCodQ(e.target.value)}
                  placeholder="Código o texto de la infracción"
                  style={{ flex: 1, minWidth: 180, border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                />
                {GRAVEDADES.map((g) => {
                  const on = gravedad === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setGravedad(g)}
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
                      {g}
                    </button>
                  );
                })}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                  <Cabecera cols={COLS_COD} />
                  <CuerpoDeTabla filas={codFiltrados} cols={COLS_COD} insigniaEn={2} />
                </table>
              </div>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                {codFiltrados.length === CODIGOS.length
                  ? 'La multa sale del porcentaje de UIT del ejercicio: cambiar la UIT recalcula las 342 multas sin tocar el catálogo.'
                  : codFiltrados.length + ' de 342 códigos coinciden con el filtro.'}
              </p>
            </section>
          </div>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {dest === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p data-noprint="1" style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Catorce entradas de menú eran catorce reportes con el mismo formulario. Aquí son un carril: se elige el reporte y solo
              aparecen los criterios que ese reporte usa.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,268px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section data-noprint="1" style={TARJETA}>
                <p style={{ margin: 0, padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  Reportes del módulo
                </p>
                <div style={{ maxHeight: '62vh', overflow: 'auto' }}>
                  {HOJAS.map((h, i) => {
                    const on = hojaIdx === i;
                    const primeroDelGrupo = i === 0 || HOJAS[i - 1].g !== h.g;
                    return (
                      <button
                        key={h.codigo + h.label}
                        onClick={() => setHojaIdx(i)}
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
                          padding: primeroDelGrupo ? '12px 14px 11px' : '11px 14px',
                          cursor: 'pointer',
                          background: on ? 'var(--accent-soft)' : 'transparent',
                          color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {primeroDelGrupo && (
                          <span style={{ display: 'block', width: '100%', fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-4)', marginBottom: 5 }}>
                            {h.g}
                          </span>
                        )}
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, textWrap: 'pretty' }}>{h.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section data-noprint="1" style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>{hoja.label}</h2>
                    <span style={META}>{hoja.crit.length} de 15 criterios</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end' }}>
                    {hoja.crit.map((k) => {
                      const c = CRITERIOS[k];
                      const valor = String(val('rep_' + k, c.v));
                      return (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{c.l}</span>
                          {c.t === 'sel' && (
                            <select
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            >
                              {(c.o ?? []).map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.t === 'text' && (
                            <input
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            />
                          )}
                          {c.t === 'date' && (
                            <input
                              type="date"
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Los criterios que este reporte no usa no se dibujan. Antes se veían los diecinueve, apagados.
                    </p>
                    <button className="hov-linea" style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 15px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}>
                      Excel
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 15px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={() => toast(hoja.label + ' generado con ' + hoja.crit.length + ' criterios.')}
                      className="hov-acento-2"
                      style={{ border: 0, borderRadius: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Generar
                    </button>
                  </div>
                </section>

                {/* La hoja, tal como sale por la impresora. */}
                <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '32px 34px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 11, borderBottom: '2px solid var(--ink)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600 }}>{pref.entidad}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-3)' }}>Sub Gerencia de Tránsito y Seguridad Vial</p>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                      <p style={{ margin: 0 }}>{hoja.codigo}</p>
                      <p style={{ margin: '3px 0 0' }}>13 de agosto de {pref.ejercicio}</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 22, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, letterSpacing: '-.01em' }}>{hoja.label}</h2>
                    <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{hoja.sub}</p>
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
                    {hoja.meta.map((m) => (
                      <div key={m[0]}>
                        <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{m[0]}</p>
                        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink)' }}>{m[1]}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {hoja.cols.map((c) => (
                            <th key={c[0]} style={c[1] ? RTHN : RTH}>
                              {c[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hoja.filas.map((f, i) => (
                          <tr key={f[0] + i} style={{ borderTop: '1px solid var(--line)' }}>
                            {f.map((c, j) => (
                              <td key={j} style={hoja.cols[j] && hoja.cols[j][1] ? RTDN : RTD}>
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: '18px 0 0', fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>{hoja.cierre}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginTop: 44 }}>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Responsable de tránsito</div>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ LO QUE FALTA POR GUARDAR ══════════ */}
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
            margin: '18px -20px -96px',
            borderTop: '1px solid var(--line-2)',
            background: 'var(--bg-card)',
            boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '5px 12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            Cambios sin guardar
          </span>
          <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Una papeleta notificada solo se corrige por resolución: al guardar se anota el motivo y el usuario.
          </p>
          <button
            onClick={() => {
              setVals({});
              setSucio(false);
              toast('Cambios descartados.');
            }}
            className="hov-linea"
            style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
          >
            Deshacer
          </button>
          <button
            onClick={() => {
              setSucio(false);
              toast('Cambios guardados en la bitácora de la papeleta.');
            }}
            className="hov-acento-2"
            style={{ border: 0, borderRadius: 6, padding: '10px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
          >
            Guardar cambios
          </button>
        </div>
      )}
    </Shell>
  );
}
