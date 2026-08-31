import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  ALTAS_Y_BAJAS,
  COLS_DEUDA,
  COLS_EJERCICIOS,
  CONST_FILAS,
  CONST_META,
  DEUDA,
  EJEMPLOS,
  HALLAZGOS,
  KPIS,
  MOVIMIENTOS,
  OPCIONES,
  PAGOS,
  POR_EJERCICIO,
  PREDIOS,
  SUJETO,
  VALORES,
  VEHICULOS,
  type ColDef,
  type Grupo,
} from '../../datos/consultas';

/* ══════════ Los estilos de tabla del artboard ══════════ */
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

/** El tono de un estado sale de su propio texto: el vocabulario de la cuenta
 *  corriente y no hay más. */
function tono(txt: string): Tono {
  const t = String(txt).toLowerCase();
  if (/coactiva|vencid|pendiente|no conciliad|baja/.test(t)) return 'bad';
  if (/valor emitido|a cuenta|en riesgo|convenio/.test(t)) return 'warn';
  return 'ok';
}

const estiloDeCelda = (j: number, cols: ColDef[]): CSSProperties =>
  j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD;

/** Una tabla del estado de cuenta, con sus totales y su pie. */
type GrupoVista = Grupo & { totales?: [string, string, 0 | 1][]; onAccion?: () => void };

function TablaDeGrupo({ g }: { g: GrupoVista }) {
  return (
    <section style={TARJETA}>
      <div style={CABECERA}>
        <h2 style={H2}>{g.titulo}</h2>
        <span style={META}>{g.conteo}</span>
        {g.accion && (
          <button
            onClick={g.onAccion}
            className="hov-linea"
            style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            {g.accion}
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: g.min }}>
          <thead>
            <tr>
              {g.cols.map((c) => (
                <th key={c[0]} style={c[1] ? THN : TH}>
                  {c[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.filas.map((f, i) => (
              <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                {f.map((c, j) =>
                  j === g.insignia ? (
                    <td key={j} style={{ padding: '11px 14px' }}>
                      <Insignia tono={tono(c)}>{c}</Insignia>
                    </td>
                  ) : (
                    <td key={j} style={estiloDeCelda(j, g.cols)}>
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {g.totales && g.totales.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
          {g.totales.map((t) => (
            <div key={t[0]} style={{ background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
        {g.nota}
      </p>
    </section>
  );
}

/* ══════════ El módulo ══════════ */
export default function Consultas({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const m = moduloDe('consultas');

  const [sujeto, setSujeto] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busco, setBusco] = useState(false);
  const [tab, setTab] = useState(0);
  const [conBeneficio, setConBeneficio] = useState(true);

  const hoy = '13/08/' + pref.ejercicio;

  /* Entrar al estado de cuenta es entrar con alguien delante: el destino trae
     su sujeto, igual que en el artboard. */
  useEffect(() => {
    if (dest === 'cuenta' && sujeto === null) setSujeto(SUJETO.codigo);
  }, [dest, sujeto]);

  /* ── Deuda y el interruptor del beneficio ─────────────────── */
  const cuenta = useMemo(() => {
    let insoluto = 0;
    let reajuste = 0;
    let interes = 0;
    let gastos = 0;
    DEUDA.forEach((x) => {
      insoluto += x.insoluto;
      reajuste += x.reajuste;
      interes += x.interes;
      gastos += x.gastos;
    });
    const deudaTotal = insoluto + reajuste + interes + gastos;
    /* La ordenanza vigente condona el 100 % del interés moratorio. El
       beneficio no cambia la deuda: cambia lo que se pagaría hoy. */
    const conBen = deudaTotal - interes;
    /* El desglose sale de las mismas filas que el total: el documento firmado
       tiene que sumar lo suyo. */
    const bruto = (x: (typeof DEUDA)[number]) => x.insoluto + x.reajuste + x.interes + x.gastos;
    const esVehicular = (x: (typeof DEUDA)[number]) => x.tributo.indexOf('VEHICULAR') >= 0;
    const saldoVehicular = DEUDA.filter(esVehicular).reduce((a, x) => a + bruto(x), 0);
    const saldoPredialArb = DEUDA.filter((x) => !esVehicular(x)).reduce((a, x) => a + bruto(x), 0);
    const saldoPorAnio: Record<string, number> = {};
    DEUDA.filter((x) => !esVehicular(x)).forEach((x) => {
      saldoPorAnio[x.anio] = (saldoPorAnio[x.anio] || 0) + bruto(x);
    });
    return { insoluto, reajuste, interes, gastos, deudaTotal, conBen, saldoVehicular, saldoPredialArb, saldoPorAnio };
  }, []);

  const aPagar = conBeneficio ? cuenta.conBen : cuenta.deudaTotal;
  const saldoDe = (anio: string) => (cuenta.saldoPorAnio[anio] || 0).toFixed(2);

  /* ── Las seis vistas del sujeto ───────────────────────────── */
  const VISTAS: { label: string; conteo: string; interruptor?: boolean; grupos: GrupoVista[] }[] = [
    {
      label: 'Resumen',
      conteo: '',
      grupos: [
        {
          titulo: 'Impuesto predial y arbitrios por ejercicio',
          conteo: '5 ejercicios',
          min: '780px',
          cols: COLS_EJERCICIOS,
          filas: POR_EJERCICIO.map((f) => [...f, saldoDe(f[0])]),
          nota:
            'Esta tabla es solo predial y arbitrios. El impuesto vehicular va aparte —' +
            soles(cuenta.saldoVehicular) +
            ' en coactiva— y está en la vista Deuda. El saldo de 2019 lleva siete años acumulando interés.',
          totales: [
            ['Valúo afecto ' + pref.ejercicio, 'S/ 151,406.75', 0],
            ['Predial + arbitrios ' + pref.ejercicio, 'S/ 1,029.34', 0],
            ['Pagado ' + pref.ejercicio, 'S/ 301.80', 0],
            ['Saldo predial y arbitrios', soles(cuenta.saldoPredialArb), 1],
          ],
        },
        MOVIMIENTOS,
      ],
    },
    {
      label: 'Deuda',
      conteo: String(DEUDA.length),
      interruptor: true,
      grupos: [
        {
          titulo: 'Deuda pendiente al ' + hoy,
          conteo: DEUDA.length + ' cuotas · ' + (conBeneficio ? 'con beneficio' : 'sin beneficio'),
          min: '980px',
          cols: COLS_DEUDA,
          filas: DEUDA.map((x) => {
            const bruto = x.insoluto + x.reajuste + x.interes + x.gastos;
            const neto = conBeneficio ? bruto - x.interes : bruto;
            return [x.anio, x.unidad, x.cuota, x.tributo, x.fase, x.insoluto.toFixed(2), x.reajuste.toFixed(2), x.interes.toFixed(2), x.gastos.toFixed(2), neto.toFixed(2)];
          }),
          nota: 'La fase coactiva incluye costas y gastos del procedimiento; solo el ejecutor coactivo puede levantarlos.',
          insignia: 4,
          totales: [
            ['Insoluto', soles(cuenta.insoluto), 0],
            ['Reajuste', soles(cuenta.reajuste), 0],
            ['Interés', soles(cuenta.interes), 0],
            [conBeneficio ? 'A pagar con beneficio' : 'A pagar sin beneficio', soles(aPagar), 1],
          ],
        },
      ],
    },
    { label: 'Pagos', conteo: '4', grupos: [PAGOS] },
    {
      label: 'Unidades',
      conteo: '3',
      grupos: [{ ...PREDIOS, onAccion: () => toast('Se abriría la ficha en Catastro.') }, VEHICULOS],
    },
    { label: 'Valores', conteo: '3', grupos: [VALORES] },
    { label: 'Altas y bajas', conteo: '4', grupos: [ALTAS_Y_BAJAS] },
  ];

  const vistaIdx = Math.min(tab, VISTAS.length - 1);
  const vista = VISTAS[vistaIdx];

  /* ── Cabecera ─────────────────────────────────────────────── */
  const destino = m.destinos.find((x) => x.k === dest);
  const miga =
    dest === 'cuenta' ? ['Consultas', 'Estado de cuenta', vista.label] : ['Consultas', destino?.label ?? 'Consultas'];
  const titulo = dest === 'cuenta' ? SUJETO.nombreTitulo : (destino?.label ?? 'Consultas');

  /* La paleta lleva a las once opciones del manual, cada una a su vista. */
  const paleta = OPCIONES.map((o) => ({
    label: o[0],
    nota: o[1] < 0 ? 'Documento' : 'Vista del contribuyente',
    ir: () => {
      if (o[1] < 0) {
        onDest('constancia');
      } else {
        setSujeto(SUJETO.codigo);
        setTab(o[1]);
        onDest('cuenta');
      }
    },
  }));

  return (
    <Shell
      modulo="consultas"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      contexto={
        sujeto !== null
          ? {
              volver: {
                label: 'Buscar otro',
                onClick: () => {
                  setSujeto(null);
                  setBusco(false);
                  setQ('');
                  onDest('buscar');
                },
              },
              codigo: SUJETO.codigo,
              titular: SUJETO.nombre,
              ubic: SUJETO.meta,
              /* A la derecha de la barra van dos cosas, no el punto de estado:
                 lo que debe hoy y la puerta al documento. */
              derecha: (
                <>
                  <Insignia tono="bad">Debe {soles(aPagar)}</Insignia>
                  <button
                    onClick={() => onDest('constancia')}
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '5px 11px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Constancia
                  </button>
                </>
              ),
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ BUSCAR ══════════ */}
        {dest === 'buscar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch', textWrap: 'pretty' }}>
              En ventanilla nadie sabe si su pregunta es «cuenta corriente», «deuda» o «unificada predial-arbitrios». Sabe que trae un DNI,
              un recibo o una placa. Escribe eso.
            </p>

            <section style={{ ...TARJETA, boxShadow: 'var(--shadow-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 18px' }}>
                <Icono d={ICO.lupa} tam={21} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="DNI, RUC, nombre, código predial, placa, nº de recibo o de valor"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 17, padding: '3px 0', outline: 'none' }}
                />
                <button
                  onClick={() => {
                    setBusco(true);
                    toast(q.trim() === '' ? 'Escribe algo para buscar.' : '4 coincidencias en cinco padrones.');
                  }}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 7, padding: '11px 24px', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}
                >
                  Buscar
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Ejemplos</span>
                {EJEMPLOS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setQ(e);
                      setBusco(true);
                    }}
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 999, padding: '4px 11px', background: 'var(--bg-card)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-2)', cursor: 'pointer' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </section>

            {busco && q.trim() !== '' && (
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={H2}>Coincidencias</h2>
                  <span style={META}>4 en 5 padrones</span>
                </div>
                {HALLAZGOS.map((h) => (
                  <button
                    key={h.titulo}
                    onClick={() => {
                      setSujeto(SUJETO.codigo);
                      setTab(h.tab);
                      onDest('cuenta');
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
                    <span
                      style={{
                        flex: '0 0 88px',
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '.1em',
                        textAlign: 'center',
                        borderRadius: 999,
                        padding: '4px 0',
                        ...(h.tono === 'accent'
                          ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)' }
                          : { background: 'var(--bg-elev)', color: 'var(--ink-3)', border: '1px solid var(--line)' }),
                      }}
                    >
                      {h.tipo}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{h.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{h.detalle}</span>
                    </span>
                    <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 13, color: h.color }}>
                        {h.monto || soles(cuenta.deudaTotal)}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>{h.fecha || 'deuda al ' + hoy}</span>
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                ))}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Un predio, una placa o un recibo llevan al contribuyente al que pertenecen: la consulta es siempre sobre alguien.
                </p>
              </section>
            )}

            {busco && q.trim() === '' && (
              <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Sin coincidencias</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Busqué en contribuyentes, predios, vehículos, recibos y valores. Puede que el dato esté con el código antiguo del padrón
                  migrado, o con otro documento.
                </p>
              </section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>{k.valor}</p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ ESTADO DE CUENTA ══════════ */}
        {dest === 'cuenta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {(
                  [
                    ['Código', SUJETO.codigo, 'var(--ink)', ''],
                    ['Documento', SUJETO.documento, 'var(--ink)', ''],
                    ['Unidades afectas', SUJETO.unidades, 'var(--ink)', ''],
                    ['Autovalúo ' + pref.ejercicio, SUJETO.autovaluo, 'var(--ink)', 'valúo afecto del conjunto'],
                    ['Deuda al ' + hoy, soles(cuenta.deudaTotal), 'var(--bad-fg)', 'insoluto, reajuste, interés y gastos'],
                    ['A pagar hoy', soles(aPagar), conBeneficio ? 'var(--ok-fg)' : 'var(--bad-fg)', conBeneficio ? 'con la ordenanza vigente' : 'sin beneficio aplicado'],
                  ] as [string, string, string, string][]
                ).map((r) => (
                  <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2] }}>{r[1]}</p>
                    {r[3] && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>{r[3]}</p>}
                  </div>
                ))}
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {VISTAS.map((v, i) => {
                const on = vistaIdx === i;
                return (
                  <button
                    key={v.label}
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
                    {v.label}
                    {v.conteo && (
                      <span
                        style={{
                          marginLeft: 7,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10.5,
                          borderRadius: 999,
                          padding: '1px 6px',
                          background: on ? 'var(--accent-soft)' : 'var(--bg-elev)',
                          color: on ? 'var(--accent-ink)' : 'var(--ink-4)',
                        }}
                      >
                        {v.conteo}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* El interruptor del beneficio: solo donde hay importes de deuda. */}
            {vista.interruptor === true && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 16px', border: '1px solid var(--line-2)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>Ordenanza 012-2026-MDC · condona el 100 % del interés moratorio</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    La deuda no cambia: cambia lo que el contribuyente pagaría hoy. Vigente hasta el 31/12/{pref.ejercicio}.
                  </p>
                </div>
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-elev)' }}>
                  {([[true, 'Con beneficio'], [false, 'Sin beneficio']] as [boolean, string][]).map((mo) => {
                    const on = conBeneficio === mo[0];
                    return (
                      <button
                        key={mo[1]}
                        onClick={() => setConBeneficio(mo[0])}
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
                        {mo[1]}
                      </button>
                    );
                  })}
                </div>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                    {conBeneficio ? 'A pagar con beneficio' : 'A pagar sin beneficio'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: conBeneficio ? 'var(--ok-fg)' : 'var(--ink)' }}>{soles(aPagar)}</span>
                </span>
              </div>
            )}

            {vista.grupos.map((g) => (
              <TablaDeGrupo key={g.titulo} g={g} />
            ))}

            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
              Todos los importes están calculados al {hoy}. La deuda cambia cada día: no se guarda, se calcula.
            </p>
          </div>
        )}

        {/* ══════════ CONSTANCIA ══════════ */}
        {dest === 'constancia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* La hoja declara la deuda bruta —es el dato que se firma— y el
                  operador necesita además lo que se pagaría hoy. Las dos cifras
                  van nombradas: sin decir sobre qué está calculada cada una, la
                  diferencia se lee como un descuadre. */}
              <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Debe {soles(cuenta.deudaTotal)} al {hoy} ({soles(cuenta.conBen)} con la Ordenanza 012-2026-MDC vigente): la constancia sale
                como constancia de deuda, no de no adeudo.
              </p>
              <button
                className="hov-linea"
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
              >
                Descargar PDF
              </button>
              <button
                onClick={() => window.print()}
                aria-disabled="true"
                style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: 0.55 }}
              >
                Imprimir constancia
              </button>
            </div>
            <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Gerencia de Administración Tributaria — Unidad de Rentas</p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>CNA-2026-004182</p>
                  <p style={{ margin: '3px 0 0' }}>13/08/{pref.ejercicio}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>Constancia de no adeudo</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>Obligaciones tributarias municipales al {hoy}</p>
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
                {CONST_META.map((x) => (
                  <div key={x.k}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{x.k}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{x.v}</p>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {(['Concepto verificado', 'Fuente', 'Resultado'] as const).map((c, i) => (
                      <th
                        key={c}
                        style={{
                          padding: '8px 10px',
                          textAlign: i === 2 ? 'right' : 'left',
                          fontSize: 9.5,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '.09em',
                          color: 'var(--ink-3)',
                          borderBottom: '1px solid var(--ink)',
                        }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONST_FILAS.map((r) => (
                    <tr key={r.concepto} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--ink-2)' }}>{r.concepto}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--ink-3)' }}>{r.fuente}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: r.ok ? 'var(--ok-fg)' : 'var(--error-texto)', textAlign: 'right' }}>
                        {r.resultado ?? 'Debe ' + soles(r.deuda === 'vehicular' ? cuenta.saldoVehicular : cuenta.saldoPredialArb)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                De la verificación efectuada en los padrones tributarios de esta municipalidad se advierte que el solicitante mantiene
                obligaciones pendientes de pago por S/ {soles(cuenta.deudaTotal).replace('S/ ', '')} al {hoy}. En consecuencia, no procede
                expedir constancia de no adeudo. Regularizada la deuda, la constancia puede emitirse el mismo día.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Unidad de Rentas</div>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}
