import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  DEFECTOS,
  DET_PREDIAL,
  DET_VEHICULAR,
  DIFF,
  EMBUDO,
  EMBUDO_BASE,
  ENTRADA,
  KPIS,
  MUESTRA,
  MUESTRA_COLS,
  OPCIONES,
  PASOS_ACTA,
  PROGRAMAS,
  PROG_RESUMEN,
  REP_COLS,
  REP_FILAS,
  REP_META,
  RES_POR_ACTA,
  RES_POR_CONTRIB,
  RES_TOTALES,
  RUTA,
  VERSIONES,
  type CampoDeActa,
  type ColDef,
} from '../../datos/fiscalizacion';

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
const TD1: CSSProperties = { padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' };

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
const FLECHA: CSSProperties = { color: 'var(--ink-4)', flex: '0 0 auto' };

/** El tono de un estado sale de su propio texto: son los cinco vocabularios
 *  del manual y no hay más. Así la celda de estado lleva insignia en las tres
 *  tablas, como en Catastro y Rentas. */
function tono(txt: string): Tono {
  const t = String(txt).toLowerCase();
  if (/omiso|no declarado|baja indebida|reclamado|anulada|^alto$/.test(t)) return 'bad';
  if (/subvalu|determinado|pendiente|programado|cerrado|por notificar|^medio$/.test(t)) return 'warn';
  return 'ok';
}

const estiloDeCelda = (j: number, cols: ColDef[]): CSSProperties =>
  j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD;

function Cabeceras({ cols }: { cols: ColDef[] }) {
  return (
    <>
      {cols.map((c) => (
        <th key={c[0]} style={c[1] ? THN : TH}>
          {c[0]}
        </th>
      ))}
    </>
  );
}

function Celdas({ fila, cols, insignia }: { fila: string[]; cols: ColDef[]; insignia?: number }) {
  return (
    <>
      {fila.map((c, j) =>
        j === insignia ? (
          <td key={j} style={{ padding: '11px 14px' }}>
            <Insignia tono={tono(c)}>{c}</Insignia>
          </td>
        ) : (
          <td key={j} style={estiloDeCelda(j, cols)}>
            {c}
          </td>
        ),
      )}
    </>
  );
}

/* ══════════ Un campo del acta ══════════ */
function CampoDelActa({
  f,
  valor,
  grande,
  onCambio,
}: {
  f: CampoDeActa;
  valor: string | boolean;
  grande: boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const base: CSSProperties = grande
    ? { width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 8, padding: '13px 12px', background: 'var(--bg-elev)', fontSize: 15, minHeight: 48 }
    : { width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 };
  const areaStyle: CSSProperties = { ...base, fontFamily: 'var(--font-sans)', resize: 'vertical' };
  const chkStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: grande ? '14px 12px' : '9px 10px',
    border: '1px solid var(--line-2)',
    borderRadius: grande ? 8 : 6,
    background: 'var(--bg-elev)',
    minHeight: grande ? 48 : 'auto',
  };
  const texto = typeof valor === 'string' ? valor : '';

  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
        <span>{f.l}</span>
      </span>
      {(f.t === undefined || f.t === 'text') && <input value={texto} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph} style={base} />}
      {f.t === 'date' && <input type="date" value={texto} onChange={(e) => onCambio(e.target.value)} style={base} />}
      {f.t === 'sel' && (
        <select value={texto} onChange={(e) => onCambio(e.target.value)} style={base}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {f.t === 'area' && <textarea value={texto} onChange={(e) => onCambio(e.target.value)} rows={3} placeholder={f.ph} style={areaStyle} />}
      {f.t === 'chk' && (
        <span style={chkStyle}>
          <input
            type="checkbox"
            checked={valor === true}
            onChange={(e) => onCambio(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 18, height: 18, flex: '0 0 auto' }}
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

/* ══════════ El módulo ══════════ */
export default function Fiscalizacion({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const m = moduloDe('fiscalizacion');

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  const [detTab, setDetTab] = useState(0);
  const [resTab, setResTab] = useState(0);
  const [paso, setPaso] = useState(0);
  const [modoCampo, setModoCampo] = useState(false);
  const [programa, setPrograma] = useState('PF-2026-014');
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: false, 2: false, 3: true });
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const grande = modoCampo;
  const esActa = dest === 'actas' || dest === 'acta';
  const esResolucion = dest === 'reporte';

  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setSucio(true);
  };
  const val = (k: string): string | boolean => (vals[k] === undefined ? DEFECTOS[k] : vals[k]);

  /* «Levantar acta» del panel es un acta nueva: cuatro pasos desde el primero
     y sin borrador previo. El shell la manda por su propio destino. */
  useEffect(() => {
    if (dest === 'acta') {
      setPaso(0);
      setSucio(false);
      toast('Acta nueva: cuatro pasos, cada uno se guarda al avanzar.');
    }
  }, [dest, toast]);

  /* ── Detección ─────────────────────────────────────────────── */
  const detAct = detTab === 0 ? DET_PREDIAL : DET_VEHICULAR;
  const marcadasN = detAct.filas.filter((_f, i) => marcadas[i]).length;

  /* ── Acta: la tabla de contraste ───────────────────────────── */
  const contraste = useMemo(() => {
    let hayDif = false;
    const filas = DIFF.map((r) => {
      const valor = String(vals[r.k] === undefined ? DEFECTOS[r.k] : vals[r.k]);
      let dif = '—';
      let cambio = false;
      if (r.n) {
        const a = parseFloat(String(r.decl).replace(/,/g, '')) || 0;
        const b = parseFloat(String(valor).replace(/,/g, '')) || 0;
        const delta = b - a;
        cambio = Math.abs(delta) > 0.001;
        dif = cambio ? (delta > 0 ? '+' : '') + delta.toFixed(2) + r.u : 'sin cambio';
      } else {
        cambio = String(valor) !== String(r.decl);
        dif = cambio ? 'distinto' : 'sin cambio';
      }
      if (cambio) hayDif = true;
      return { r, valor, dif, cambio };
    });
    return { filas, hayDif };
  }, [vals]);

  const pasoIdx = Math.min(paso, PASOS_ACTA.length - 1);
  const pasoActual = PASOS_ACTA[pasoIdx];

  /* Lo que va a pasar al cerrar el acta se deriva de lo que el fiscalizador
     acaba de decidir: el hallazgo del paso 3, la diferencia del paso 2 y las
     tres marcas del paso 4. Escrito a mano prometía un acto ya apagado. */
  const ICONO_OK: CSSProperties = { display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', background: 'var(--ok-bg)', color: 'var(--ok-fg)' };
  const ICONO_NEU: CSSProperties = { display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flex: '0 0 auto', background: 'var(--accent-soft)', color: 'var(--accent-ink)' };

  const consecuencias = useMemo(() => {
    const hallazgo = String(vals.hallazgo === undefined ? DEFECTOS.hallazgo : vals.hallazgo);
    const determina = (vals.determina === undefined ? DEFECTOS.determina : vals.determina) === true;
    const multa = String(vals.multa === undefined ? DEFECTOS.multa : vals.multa);
    const ejercicios = String(vals.ejercicios === undefined ? DEFECTOS.ejercicios : vals.ejercicios);
    const construida = String(vals.construidaV === undefined ? DEFECTOS.construidaV : vals.construidaV);
    const uso = String(vals.usoV === undefined ? DEFECTOS.usoV : vals.usoV);
    const conforme = hallazgo === 'SIN OBSERVACIONES' || !contraste.hayDif;
    const out: { titulo: string; detalle: string; valor: string; iconoStyle: CSSProperties }[] = [
      { titulo: 'Se cierra el acta ' + DEFECTOS.acta, detalle: 'Deja de ser editable. Para corregirla habría que anularla y levantar otra.', valor: '', iconoStyle: ICONO_OK },
    ];
    if (conforme) {
      out.push({
        titulo: 'El acta se cierra como conforme',
        detalle: 'No hay diferencia con lo declarado: no se genera determinación ni multa, y el predio sale de la muestra.',
        valor: '',
        iconoStyle: ICONO_NEU,
      });
    } else if (determina) {
      out.push({
        titulo: 'Se genera la resolución de determinación',
        detalle: 'Hallazgo: ' + hallazgo.toLowerCase() + '. Diferencia de impuesto predial y arbitrios de los ejercicios ' + ejercicios + '.',
        valor: 'S/ 1,842.60',
        iconoStyle: ICONO_OK,
      });
    } else {
      out.push({
        titulo: 'No se genera determinación',
        detalle: 'Hay diferencia, pero «Derivar a resolución de determinación» está desmarcado: la deuda omitida no entra en la cuenta corriente.',
        valor: '',
        iconoStyle: ICONO_NEU,
      });
    }
    if (!conforme && multa !== 'NO APLICA') {
      /* «Código Tributario» va con mayúsculas: es como se cita en la hoja de la
         resolución y en la baja de deuda de Rentas. Solo baja a minúsculas la
         descripción de la infracción, que es la parte variable. */
      const trozos = multa.split(' — ');
      const numero = (trozos[0] || '').replace(/^ART\.\s*/i, '');
      const descripcion = (trozos[1] || '').toLowerCase();
      out.push({
        titulo: 'Se liquida la multa tributaria',
        detalle: 'Artículo ' + numero + ' del Código Tributario: ' + descripcion + '.',
        valor: 'S/ 267.50',
        iconoStyle: ICONO_OK,
      });
    }
    if (!conforme) {
      out.push({
        titulo: 'Se actualiza la ficha catastral del predio',
        detalle: 'Área construida verificada ' + construida + ' m² y uso ' + uso + '. Queda como versión nueva.',
        valor: '',
        iconoStyle: ICONO_NEU,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals, contraste.hayDif]);

  /* ── Resultados ────────────────────────────────────────────── */
  const resAct = resTab === 0 ? RES_POR_ACTA : RES_POR_CONTRIB;

  /* ── Cabecera ──────────────────────────────────────────────── */
  const destino = m.destinos.find((x) => x.k === dest);
  const miga = esActa
    ? ['Fiscalización', 'Actas', String(DEFECTOS.acta)]
    : esResolucion
      ? ['Fiscalización', 'Documentos']
      : ['Fiscalización', destino?.label ?? 'Fiscalización'];
  const titulo = esActa
    ? 'Acta ' + DEFECTOS.acta
    : esResolucion
      ? 'Resolución de determinación'
      : (destino?.label ?? 'Fiscalización');

  const paleta = OPCIONES.map((o) => ({ label: o[0], nota: 'Fiscalización', ir: () => onDest(o[1]) }));

  const programarSeleccion = () => {
    if (marcadasN === 0) {
      toast('Marca al menos un registro.');
      return;
    }
    onDest('programas');
    toast(marcadasN + ' registros añadidos a la muestra del PF-2026-014.');
  };

  const adelante = () => {
    if (pasoIdx >= PASOS_ACTA.length - 1) {
      setSucio(false);
      onDest('resultados');
      toast('Acta cerrada. Determinación por S/ 1,842.60 lista para emitir.');
    } else {
      setPaso(pasoIdx + 1);
      setSucio(true);
    }
  };

  const filtroDe = (label: string, porOmision: string) => filtros[detTab + ':' + label] ?? porOmision;

  return (
    <Shell
      modulo="fiscalizacion"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      contexto={
        esActa
          ? {
              volver: { label: 'Muestra', onClick: () => onDest('programas') },
              codigo: String(DEFECTOS.predio),
              titular: 'MEDINA MEDINA, RUFINA (SUC.)',
              ubic: 'CALLE SANTA ROSA 116 · programa PF-2026-014 · riesgo alto',
              estado: sucio ? 'Borrador sin guardar' : 'Borrador guardado 10:52',
              estadoColor: sucio ? 'var(--warn-fg)' : 'var(--ok-fg)',
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Fiscalización no son ocho pantallas: es un embudo. Se detecta una diferencia probable, se programa la visita, se levanta el
              acta, se determina la deuda omitida y se notifica. El módulo se ordena por esas cinco etapas.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Programa PF-2026-014 · predial selectivo, sector 02</h2>
                <span style={META}>17/08 — 30/09</span>
              </div>
              <button
                onClick={() => onDest(ENTRADA.dest)}
                className="hov-acento"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)', flex: '0 0 auto' }}>
                  Entrada
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{ENTRADA.titulo}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{ENTRADA.detalle}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{ENTRADA.valor}</span>
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
              </button>
              {EMBUDO.map((e, i) => {
                const p = (e[2] / EMBUDO_BASE) * 100;
                return (
                  <button
                    key={e[0]}
                    onClick={() => onDest(e[3])}
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
                    <span style={{ flex: '0 0 190px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{e[0]}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{e[1]}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${p.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.42 + i * 0.15 }} />
                    </span>
                    <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {p.toFixed(0)} %
                    </span>
                    <span style={{ flex: '0 0 62px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{e[2]}</span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
                  </button>
                );
              })}
              <p style={PIE}>
                Una etapa que se estrecha mucho respecto de la anterior es donde se pierde el programa: 35 predios inspeccionados sin
                diferencia no son un fracaso, 12 predios cerrados sin volver a visitar sí.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>{k.valor}</p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Tu ruta de hoy</h2>
                <span style={META}>3 visitas · sector 02</span>
              </div>
              {RUTA.map((r) => (
                <button
                  key={r.predio}
                  onClick={() => {
                    setPaso(0);
                    onDest('actas');
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
                  <Insignia tono={r.tono}>{r.riesgo}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{r.predio}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r.detalle}</span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: '0 0 auto' }}>{r.hora}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
                </button>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ DETECCIÓN ══════════ */}
        {dest === 'deteccion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              De aquí salen los programas. Dos fuentes: el cruce de catastro contra rentas —predios con ficha y sin declaración, o declarados
              por debajo— y el cruce del padrón vehicular contra SUNARP, SUNAT y MTC.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {['Predial — omisos y subvaluadores', 'Vehicular — cruce registral'].map((l, i) => {
                const on = detTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setDetTab(i);
                      setMarcadas({});
                    }}
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
              <span data-sm-hide="1" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>
                {detAct.fuente}
              </span>
            </div>

            <section style={TARJETA}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                  gap: '14px 16px',
                  padding: '15px 16px',
                  alignItems: 'end',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {detAct.filtros.map((f) => (
                  <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                    <select
                      value={filtroDe(f.label, f.valor)}
                      onChange={(e) => setFiltros((s) => ({ ...s, [detTab + ':' + f.label]: e.target.value }))}
                      style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                    >
                      {f.opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: detAct.min }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                      <Cabeceras cols={detAct.cols} />
                    </tr>
                  </thead>
                  <tbody>
                    {detAct.filas.map((f, i) => {
                      const on = marcadas[i] === true;
                      return (
                        <tr key={f[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setMarcadas((x) => ({ ...x, [i]: !on }))}
                              aria-label={'Seleccionar ' + f[0]}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          <Celdas fila={f} cols={detAct.cols} insignia={detTab === 0 ? 2 : 5} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>{detAct.nota}</p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {marcadasN === 0
                  ? 'Marca los registros que van a la muestra. Sin selección no se puede programar nada.'
                  : marcadasN +
                    (marcadasN === 1 ? ' registro seleccionado' : ' registros seleccionados') +
                    '. Entran al programa con su criterio de riesgo puesto.'}
              </p>
              <button
                className="hov-linea"
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
              >
                Notificar esquela
              </button>
              <button
                onClick={programarSeleccion}
                aria-disabled={marcadasN === 0}
                className="hov-acento-2"
                style={{
                  border: 0,
                  borderRadius: 6,
                  padding: '11px 22px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: marcadasN === 0 ? 0.55 : 1,
                }}
              >
                {marcadasN === 0 ? 'Programar fiscalización' : `Programar fiscalización (${marcadasN})`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ PROGRAMAS ══════════ */}
        {dest === 'programas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Un programa es una muestra, un fiscalizador y un plazo. Mientras esté en ejecución, todo lo que se levanta en campo cuelga de
              él.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Programas</h2>
                  <span style={META}>3</span>
                </div>
                {PROGRAMAS.map((p) => {
                  const on = programa === p[0];
                  return (
                    <button
                      key={p[0]}
                      onClick={() => setPrograma(p[0])}
                      aria-current={on ? 'true' : undefined}
                      className="hov-acento"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        borderBottom: '1px solid var(--line)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        background: on ? 'var(--accent-soft)' : 'transparent',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 4, padding: '2px 6px' }}>
                          {p[0]}
                        </span>
                        <Insignia tono={p[2]}>{p[1]}</Insignia>
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, textWrap: 'pretty' }}>{p[3]}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{p[4]}</span>
                    </button>
                  );
                })}
                <div style={{ padding: '11px 14px' }}>
                  <button
                    style={{ width: '100%', border: '1px dashed var(--line-2)', borderRadius: 7, padding: 9, background: 'transparent', fontSize: 12.5, color: 'var(--ink-3)', cursor: 'pointer' }}
                  >
                    + Nuevo programa
                  </button>
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section style={TARJETA}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                    {([['Programa', programa], ...PROG_RESUMEN] as [string, string][]).map((r) => (
                      <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                        <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{r[1]}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1, minWidth: 150, textWrap: 'pretty' }}>
                      El criterio de riesgo decide la muestra. Cambiarlo con el programa en ejecución no reordena lo ya inspeccionado.
                    </span>
                    <button
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer' }}
                    >
                      Reasignar fiscalizador
                    </button>
                    <button
                      className="hov-acento-2"
                      style={{ border: 0, borderRadius: 6, padding: '7px 15px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Cerrar programa
                    </button>
                  </div>
                </section>

                <section style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>Muestra del programa</h2>
                    <span style={META}>96 predios · 4 visibles</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead>
                        <tr>
                          <Cabeceras cols={MUESTRA_COLS} />
                          <th style={{ padding: '10px 14px', background: 'var(--bg-elev)' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {MUESTRA.map((r) => (
                          <tr key={r[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                            {r.slice(0, 6).map((c, j) =>
                              j === 4 || j === 5 ? (
                                <td key={j} style={{ padding: '11px 14px' }}>
                                  <Insignia tono={tono(String(c))}>{c}</Insignia>
                                </td>
                              ) : (
                                <td key={j} style={estiloDeCelda(j, MUESTRA_COLS)}>
                                  {c}
                                </td>
                              ),
                            )}
                            <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  setPaso(0);
                                  onDest('actas');
                                }}
                                className={r[7] ? 'hov-acento-2' : 'hov-linea'}
                                style={
                                  r[7]
                                    ? { border: 0, borderRadius: 6, padding: '8px 14px', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }
                                    : { border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 13px', background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }
                                }
                              >
                                {r[6]}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ ACTA DE INSPECCIÓN ══════════ */}
        {esActa && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 220, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                El acta se levanta en el predio, con una tablet y a veces de pie. Cuatro pasos, uno por pantalla, y cada uno se guarda al
                avanzar.
              </p>
              <button
                onClick={() => setModoCampo(!grande)}
                aria-pressed={grande}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: `1px solid ${grande ? 'var(--accent)' : 'var(--line-2)'}`,
                  borderRadius: 999,
                  padding: '8px 15px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  background: grande ? 'var(--accent-soft)' : 'var(--bg-card)',
                  color: grande ? 'var(--accent-ink)' : 'var(--ink-3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="6" y="3" width="12" height="18" rx="2" />
                  <path d="M11 18h2" />
                </svg>
                Modo campo
              </button>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '15px 17px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Paso {pasoIdx + 1} de {PASOS_ACTA.length}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {PASOS_ACTA.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPaso(i)}
                    aria-label={`Ir al paso ${i + 1}: ${p.label}`}
                    style={{ flex: 1, height: grande ? 9 : 6, border: 0, borderRadius: 999, cursor: 'pointer', background: i <= pasoIdx ? 'var(--accent)' : 'var(--accent-soft)' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
                {PASOS_ACTA.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPaso(i)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: grande ? 13 : 11.5,
                      color: i === pasoIdx ? 'var(--accent-ink)' : 'var(--ink-4)',
                      fontWeight: i === pasoIdx ? 600 : 400,
                    }}
                  >
                    {i + 1}. {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Declarado contra verificado ── */}
            {pasoActual.diff === true && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Declarado contra verificado</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    Lo que se compara es el objeto de la fiscalización. Antes eran pares de campos suellos —«área verificada», «área
                    declarada», «diferencia»— y había que restar con la vista.
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Característica</th>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Declarado</th>
                        <th style={{ ...TH, whiteSpace: 'normal' }}>Verificado en campo</th>
                        <th style={{ ...TH, whiteSpace: 'normal', textAlign: 'right' }}>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contraste.filas.map(({ r, valor, dif, cambio }) => {
                        const control: CSSProperties = {
                          width: '100%',
                          boxSizing: 'border-box',
                          border: `1px solid ${cambio ? 'var(--warn-fg)' : 'var(--line-2)'}`,
                          borderRadius: 6,
                          padding: grande ? '12px 11px' : '8px 9px',
                          background: 'var(--bg-card)',
                          fontSize: grande ? 15 : 13,
                        };
                        return (
                          <tr key={r.k} style={{ borderTop: '1px solid var(--line)', background: cambio ? 'var(--warn-bg)' : 'transparent' }}>
                            <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{r.l}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{r.decl}</td>
                            <td style={{ padding: '9px 14px', minWidth: 190 }}>
                              {r.t === 'sel' ? (
                                <select value={valor} onChange={(e) => set(r.k, e.target.value)} style={control}>
                                  {(r.o ?? []).map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input value={valor} onChange={(e) => set(r.k, e.target.value)} style={control} />
                              )}
                            </td>
                            <td
                              style={{
                                padding: '11px 14px',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 12.5,
                                fontWeight: cambio ? 600 : 400,
                                color: cambio ? 'var(--warn-fg)' : 'var(--ink-4)',
                              }}
                            >
                              {dif}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  <span style={{ flex: 1, minWidth: 160, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {contraste.hayDif
                      ? 'Hay diferencia: el acta puede sostener una determinación. Los ejercicios y la multa se eligen en el paso 4.'
                      : 'Sin diferencia respecto de lo declarado. El acta se cierra como conforme y no genera determinación.'}
                  </span>
                  <Insignia tono={contraste.hayDif ? 'warn' : 'ok'}>{contraste.hayDif ? 'Con diferencia' : 'Conforme'}</Insignia>
                </div>
              </section>
            )}

            {/* ── Los campos del paso ── */}
            {pasoActual.campos.length > 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                  {pasoActual.nota && (
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>{pasoActual.nota}</p>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit,minmax(${grande ? 260 : 192}px,1fr))`,
                    gap: grande ? '18px 18px' : '15px 16px',
                    padding: grande ? '18px 16px 20px' : '15px 16px 17px',
                  }}
                >
                  {pasoActual.campos.map((f) => (
                    <CampoDelActa key={f.k} f={f} valor={val(f.k)} grande={grande} onCambio={(v) => set(f.k, v)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Lo que va a pasar al cerrar ── */}
            {pasoActual.cierre === true && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que va a pasar al cerrar el acta</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    Un acta cerrada no se edita: se anula y se levanta otra. Antes de cerrar, esto es la consecuencia.
                  </p>
                </div>
                {consecuencias.map((c) => (
                  <div key={c.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={c.iconoStyle}>
                      <Icono d={ICO.visto} tam={13} grosor={2.4} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{c.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{c.detalle}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', flex: '0 0 auto' }}>{c.valor}</span>
                  </div>
                ))}
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setPaso(Math.max(pasoIdx - 1, 0))}
                aria-disabled={pasoIdx === 0}
                className="hov-linea"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  border: '1px solid var(--line-2)',
                  borderRadius: 6,
                  padding: grande ? '13px 20px' : '10px 18px',
                  background: 'var(--bg-card)',
                  fontSize: 13,
                  cursor: 'pointer',
                  opacity: pasoIdx === 0 ? 0.5 : 1,
                }}
              >
                <Icono d={ICO.flechaIzq} tam={14} grosor={1.8} />
                Anterior
              </button>
              <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {pasoIdx >= PASOS_ACTA.length - 1
                  ? 'Cerrar el acta es el punto sin retorno del procedimiento.'
                  : 'Lo del paso se guarda al continuar, también sin señal.'}
              </p>
              <button
                className="hov-linea"
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: grande ? '13px 20px' : '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
              >
                Guardar borrador
              </button>
              <button
                onClick={adelante}
                className="hov-acento-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  border: 0,
                  borderRadius: 6,
                  padding: grande ? '14px 26px' : '11px 22px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: grande ? 15 : 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {pasoIdx >= PASOS_ACTA.length - 1 ? 'Cerrar acta' : 'Guardar y continuar'}
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════ RESULTADOS ══════════ */}
        {dest === 'resultados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Lo que salió de las actas: la diferencia por ejercicio, la deuda omitida y el estado del valor emitido. Mismo dato mirado por
              acta o por contribuyente.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {['Por acta', 'Por contribuyente', 'Histórico de versiones'].map((l, i) => {
                const on = resTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => setResTab(i)}
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
            </div>

            {resTab === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                {RES_TOTALES.map((t) => (
                  <div key={t[0]} style={{ background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* La tercera pestaña es el histórico y no tiene tabla propia. */}
            {resTab !== 2 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>{resAct.titulo}</h2>
                  <span style={META}>{resAct.conteo}</span>
                  <button
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}
                  >
                    Exportar Excel
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: resAct.min }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={resAct.cols} />
                      </tr>
                    </thead>
                    <tbody>
                      {resAct.filas.map((f, i) => (
                        <tr key={i} onClick={() => setResTab(2)} className="hov-acento" style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                          <Celdas fila={f} cols={resAct.cols} insignia={f.length - 1} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>{resAct.nota}</p>
              </section>
            )}

            {resTab === 2 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Versiones del proceso fiscalizador</h2>
                  <span style={META}>ACT-2026-00418 · 3 versiones</span>
                </div>
                {VERSIONES.map((v) => (
                  <div key={v.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
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
                        background: v.tono === 'acento' ? 'var(--accent)' : v.tono === 'suave' ? 'var(--accent-soft)' : 'var(--bg-elev)',
                        color: v.tono === 'acento' ? '#fff' : v.tono === 'suave' ? 'var(--accent-ink)' : 'var(--ink-3)',
                        border: v.tono === 'neutro' ? '1px solid var(--line-2)' : undefined,
                      }}
                    >
                      {v.n}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{v.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{v.detalle}</span>
                    </span>
                    <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{v.fecha}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{v.usuario}</span>
                    </span>
                  </div>
                ))}
                <p style={PIE}>
                  El versionado es lo que permite defender una determinación ante una reclamación: dice qué característica cambió, quién la
                  cambió y con qué acta.
                </p>
              </section>
            )}

            {resTab === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Emitir crea el valor y arranca el plazo para reclamar. La deuda omitida entra en la cuenta corriente ese mismo día.
                </p>
                <button
                  onClick={() => onDest('reporte')}
                  className="hov-linea"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
                >
                  Ver el documento
                </button>
                <button
                  onClick={() => toast('61 resoluciones de determinación emitidas. La deuda entra hoy en la cuenta corriente.')}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                >
                  Emitir resoluciones
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ RESOLUCIÓN ══════════ */}
        {esResolucion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="hov-linea"
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
              >
                Descargar PDF
              </button>
              <button
                onClick={() => window.print()}
                className="hov-acento-2"
                style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                Imprimir
              </button>
            </div>
            <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Sub Gerencia de Fiscalización Tributaria</p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>RD-2026-000418</p>
                  <p style={{ margin: '3px 0 0' }}>13 de agosto de 2026</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>Resolución de determinación</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>Procedimiento de fiscalización tributaria — impuesto predial y arbitrios</p>
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
                {REP_META.map((x) => (
                  <div key={x.k}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{x.k}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{x.v}</p>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <Cabeceras cols={REP_COLS} />
                  </tr>
                </thead>
                <tbody>
                  {REP_FILAS.map((f) => (
                    <tr key={f[0]} style={{ borderTop: '1px solid var(--line)' }}>
                      {f.map((c, j) => (
                        <td key={j} style={estiloDeCelda(j, REP_COLS)}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                Notifíquese al contribuyente el importe determinado. Contra la presente resolución procede recurso de reclamación dentro de
                los veinte días hábiles siguientes a su notificación, conforme al artículo 137º del Código Tributario.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Sub Gerente de Fiscalización Tributaria</div>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Notificado — contribuyente</div>
              </div>
            </section>
          </div>
        )}

        {/* ══════════ EL ACTA SIN CERRAR ══════════
            El artboard la ancla al pie de la ventana: es el aviso de que hay un
            borrador con cambios, y no depende del destino. */}
        {sucio && (
          <div
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
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 999, padding: '5px 12px' }}>
              <Icono d={ICO.reloj} tam={13} grosor={2} />
              Acta sin cerrar
            </span>
            <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              El borrador se guarda en el dispositivo: si se cae la señal en el predio, lo escrito no se pierde.
            </p>
            <button
              onClick={() => {
                setVals({});
                setSucio(false);
                toast('Borrador descartado.');
              }}
              className="hov-linea"
              style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
            >
              Descartar
            </button>
            <button
              onClick={() => {
                setSucio(false);
                toast('Borrador guardado en el dispositivo.');
              }}
              className="hov-acento-2"
              style={{ border: 0, borderRadius: 6, padding: '10px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
            >
              Guardar borrador
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
