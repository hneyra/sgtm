import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  BANDEJA,
  CONTEOS,
  DEUDA_DEL_VALOR,
  EJERCICIOS_DEL_RELOJ,
  KPIS,
  MONTOS,
  MOVIMIENTOS,
  OPCIONES,
  PRESCRITAS,
  RECAUDOS,
  SIMULACION_DEL_LOTE,
  VALORES,
  prescripcionDe,
  type Prescripcion,
  type Valor,
} from '../../datos/valores';

/* Los estilos que el artboard declara una vez arriba y repite en cada tabla y
   en cada campo. Van literales: son los que hacen que la pantalla se vea
   igual que `Valores.dc.html`. */
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

/** El tono que el artboard de Valores le da a una etapa. Prescrito manda sobre
 *  todo lo demás: un valor prescrito ya no se notifica, se declara. */
function tono(txt: string): Tono {
  const t = String(txt).toLowerCase();
  if (/sin notificar|prescrito|en coactiva|vencid/.test(t)) return 'bad';
  if (/firme sin pase|por notificar|en plazo/.test(t)) return 'warn';
  return 'ok';
}

type ColDef = [string, 0 | 1];

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
 *  la de etapa como insignia. Es `celda()` del artboard. */
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

type CampoDef = {
  k: string;
  l: string;
  t?: 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro';
  v?: string | boolean;
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
  val: (k: string, d: string | boolean | undefined) => string | boolean | undefined;
  set: (k: string, v: string | boolean) => void;
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
        const bruto = val(f.k, f.v);
        const valor = bruto === undefined ? '' : bruto;
        const t = f.t ?? 'text';
        return (
          <label
            key={f.k}
            data-ancho={f.ancho ? '1' : '0'}
            style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
            {(t === 'text' || t === 'date') && (
              <input
                type={t === 'date' ? 'date' : undefined}
                value={String(valor)}
                onChange={(e) => set(f.k, e.target.value)}
                placeholder={f.ph ?? ''}
                style={IN}
              />
            )}
            {t === 'sel' && (
              <select value={String(valor)} onChange={(e) => set(f.k, e.target.value)} style={IN}>
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
                {String(valor)}
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

/** El aviso con filete de color a la izquierda: la guía del valor. */
function Guia({
  color,
  fondo,
  texto,
  accion,
  onAccion,
}: {
  color: string;
  fondo: string;
  texto: string;
  accion: string;
  onAccion: () => void;
}) {
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
      <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color, textWrap: 'pretty' }}>{texto}</p>
      <button
        onClick={onAccion}
        className="hov-elev"
        style={{
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '6px 13px',
          background: 'transparent',
          color,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          flex: '0 0 auto',
        }}
      >
        {accion}
      </button>
    </div>
  );
}

/* ══════════ El módulo ══════════ */

type ValorConReloj = Valor & { presc: Prescripcion; etapa: string };

type Pestania = {
  id: string;
  label: string;
  titulo: string;
  nota: string;
  campos: CampoDef[];
  tabla: { titulo: string; conteo: string; min: string; cols: ColDef[]; filas: string[][]; totales?: Total[]; nota: string };
  secundaria: string;
  primaria: string;
  aviso: string;
};

export default function Valores({ dest, onDest }: PantallaProps) {
  const { toast } = usarPreferencias();
  const [valor, setValor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('Todas');
  const [tab, setTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [hojaEmision, setHojaEmision] = useState<'individual' | 'masiva'>('individual');
  const [presMarcadas, setPresMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false });

  /* Salir del módulo por el panel de destinos cierra el valor abierto: el
     expediente del valor vive dentro de «Valores», no es un destino más. */
  useEffect(() => setValor(null), [dest]);

  const val = (k: string, d: string | boolean | undefined) => (vals[k] === undefined ? d : vals[k]);
  const set = (k: string, v: string | boolean) => setVals((x) => ({ ...x, [k]: v }));

  /* La etapa se **deriva** del par (notificado, prescripción): escrita a mano
     al lado de un reloj calculado, una misma fila declaraba «sin notificar» y
     «prescrito» en columnas contiguas. */
  const conReloj = useMemo<ValorConReloj[]>(
    () =>
      VALORES.map((v) => {
        const presc = prescripcionDe(v);
        const etapa = presc.vencido
          ? 'Prescrito'
          : v.notificado === ''
            ? 'Emitido sin notificar'
            : v.enCoactiva
              ? 'En coactiva'
              : v.firme
                ? 'Firme sin pase'
                : 'Notificado en plazo';
        return { ...v, presc, etapa };
      }),
    [],
  );

  /* El reloj por ejercicio: la barra y el plazo salen del cómputo, no de una
     cifra escrita. La tarjeta y la tabla leen los mismos agregados. */
  const relojAnios = useMemo(
    () =>
      EJERCICIOS_DEL_RELOJ.map((anio) => {
        const p = prescripcionDe({ anioDeuda: anio, notificado: '' });
        return { anio, presc: p, n: CONTEOS[anio], importe: MONTOS[anio] };
      }),
    [],
  );
  const cerca = relojAnios.filter((r) => !r.presc.vencido && r.presc.meses <= 12);
  const relojN = cerca.reduce((a, r) => a + r.n, 0);
  const relojMonto = cerca.reduce((a, r) => a + r.importe, 0);

  const filtrados = chip === 'Todas' ? conReloj : conReloj.filter((v) => v.etapa === chip);
  const nMarcadas = filtrados.filter((v) => marcadas[v.numero]).length;

  const sel = conReloj.find((v) => v.numero === valor) ?? conReloj[3];
  const selPres = sel.presc;
  const esValor = dest === 'lista' && valor !== null;

  /* ── Las pestañas del valor ───────────────────────────────── */
  const TABS: Pestania[] = [
    {
      id: 'valor',
      label: 'El valor',
      titulo: 'Datos del valor',
      nota: 'El criterio y el tipo de recaudo deciden qué documento es y de qué oficina sale.',
      campos: [
        { k: 'vNum', l: 'Nº de valor', t: 'ro', v: sel.numero },
        { k: 'vCriterio', l: 'Código de criterio', t: 'ro', v: '00000007891' },
        {
          k: 'vTipo',
          l: 'Tipo de recaudo',
          t: 'sel',
          ancho: true,
          v: '005 — RD PREDIAL FISCALIZACIÓN',
          o: [
            '005 — RD PREDIAL FISCALIZACIÓN',
            '001 — ORDEN DE PAGO PREDIAL',
            '003 — RS PAPELETAS DE TRÁNSITO',
            '035 — RM PAPELETAS ADMINISTRATIVAS',
            '004 — RES. EJECUCIÓN COACTIVA',
          ],
        },
        { k: 'vContrib', l: 'Contribuyente', t: 'ro', ancho: true, v: sel.contribuyente },
        { k: 'vDesde', l: 'Año desde', t: 'text', v: '2021' },
        { k: 'vHasta', l: 'Año hasta', t: 'text', v: '2026' },
        { k: 'vFecha', l: 'Fecha de cálculo', t: 'date', v: '2026-08-13' },
        {
          k: 'vMotivo',
          l: 'Motivo · base legal',
          t: 'sel',
          ancho: true,
          v: 'ART. 76º — RESOLUCIÓN DE DETERMINACIÓN',
          o: ['ART. 76º — RESOLUCIÓN DE DETERMINACIÓN', 'ART. 78º — ORDEN DE PAGO', 'ART. 180º — RESOLUCIÓN DE MULTA'],
        },
        {
          k: 'vOficina',
          l: 'Oficina emisora',
          t: 'sel',
          ancho: true,
          v: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA',
          o: ['113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '113100 — UNIDAD DE RENTAS', '113200 — TESORERÍA'],
        },
      ],
      tabla: {
        titulo: 'Recaudos que componen el valor',
        conteo: RECAUDOS.length + ' recaudos',
        min: '760px',
        cols: [['Nº recaudo', 0], ['Ejercicio', 0], ['Criterio', 0], ['Concepto', 0], ['Insoluto S/', 1], ['Interés S/', 1], ['Total S/', 1]],
        filas: RECAUDOS,
        totales: [
          ['Recaudos', String(RECAUDOS.length), 0],
          ['Insoluto', 'S/ 6,670.00', 0],
          ['Interés', 'S/ 1,615.60', 0],
          ['Importe del valor', 'S/ 8,285.60', 1],
        ],
        nota: 'El valor no se edita recaudo a recaudo: se anula y se genera de nuevo con el criterio corregido.',
      },
      secundaria: 'Vista previa',
      primaria: 'Guardar el valor',
      aviso: 'Un valor guardado y no notificado se puede anular sin consecuencias. Notificado, ya no.',
    },
    {
      id: 'notificacion',
      label: 'Notificación',
      titulo: 'Notificación del valor',
      nota: 'Hasta que esto se registra, el valor no hace correr ningún plazo y no se puede cobrar. Es el acto que interrumpe la prescripción.',
      campos: [
        { k: 'nNum', l: 'Nº de notificación', t: 'text', v: '' },
        { k: 'nVisita', l: 'Nº de visita', t: 'text', v: '1' },
        { k: 'nFecha', l: 'Fecha de notificación', t: 'date', v: '2026-08-14' },
        { k: 'nVence', l: 'Vence', t: 'ro', v: '13/09/2026', ayuda: 'Veinte días hábiles para reclamar' },
        { k: 'nNotificador', l: 'Notificador', t: 'sel', v: 'M. RÍOS MENDOZA', o: ['M. RÍOS MENDOZA', 'V. RETO SANTOS', 'J. QUISPE PEÑA'] },
        { k: 'nDomicilio', l: 'Domicilio', t: 'ro', ancho: true, v: 'AV. JOSÉ DE LAMA 1180 — CATACAOS' },
        {
          k: 'nRecibido',
          l: 'Recibido por',
          t: 'sel',
          v: 'CONTRIBUYENTE',
          o: ['CONTRIBUYENTE', 'FAMILIAR', 'DEPENDIENTE', 'NEGATIVA A RECIBIR', 'CEDULÓN', 'NO SE UBICÓ EL DOMICILIO'],
        },
        { k: 'nNombre', l: 'Nombre del receptor', t: 'text', v: '' },
        { k: 'nDni', l: 'D.N.I. del receptor', t: 'text', v: '' },
        {
          k: 'nTipo',
          l: 'Tipo de notificación',
          t: 'sel',
          v: 'NOTIFICACIÓN CON ÉXITO',
          o: ['NOTIFICACIÓN CON ÉXITO', 'CEDULÓN EN DOMICILIO', 'NEGATIVA A RECIBIR', 'DOMICILIO NO UBICADO'],
        },
        { k: 'nFirma', l: 'Con firma', t: 'chk', v: false, ph: 'El receptor firmó el cargo' },
        { k: 'nVivienda', l: 'Características de la vivienda', t: 'area', ancho: true, v: '', ph: 'Obligatorio cuando se deja cedulón' },
      ],
      tabla: {
        titulo: 'Visitas registradas',
        conteo: 'Sin visitas',
        min: '620px',
        cols: [['Visita', 0], ['Fecha', 0], ['Resultado', 0], ['Receptor', 0], ['Notificador', 0]],
        filas: [],
        nota: 'Dos visitas fallidas habilitan la notificación por cedulón. Sin las dos, el cedulón es impugnable.',
      },
      secundaria: 'Imprimir cargo',
      primaria: 'Registrar notificación',
      aviso: 'Al registrar la notificación empieza el plazo de veinte días hábiles y se reinicia el conteo de prescripción.',
    },
    {
      id: 'movimientos',
      label: 'Movimientos',
      titulo: 'Movimientos del valor',
      nota: 'El pase a coactiva es un movimiento, no un botón: se registra con su tipo y su fecha, y el ejecutor lo acepta o lo rechaza.',
      campos: [
        {
          k: 'mTipo',
          l: 'Tipo de movimiento',
          t: 'sel',
          ancho: true,
          v: 'PCO — PASE A COACTIVAS',
          o: ['PCO — PASE A COACTIVAS', 'ACO — ACEPTADO EN COACTIVAS', 'RCO — RECHAZADO EN COACTIVAS', 'ANU — ANULACIÓN DEL VALOR'],
        },
        { k: 'mFecha', l: 'Fecha del movimiento', t: 'date', v: '2026-08-14' },
        { k: 'mExp', l: 'Expediente coactivo', t: 'text', v: '', ayuda: 'Lo asigna la ejecutoría al aceptar' },
        { k: 'mObs', l: 'Observación', t: 'area', ancho: true, v: '', ph: 'Motivo del pase o del rechazo' },
      ],
      tabla: {
        titulo: 'Historial de movimientos',
        conteo: '1 movimiento',
        min: '620px',
        cols: [['Nº', 0], ['Tipo', 0], ['Fecha', 0], ['Observación', 0], ['Usuario', 0]],
        filas: MOVIMIENTOS,
        nota: 'Un valor rechazado en coactiva vuelve a la etapa «firme sin pase» y hay que corregir lo que el ejecutor observó.',
      },
      secundaria: 'Ver expediente',
      primaria: 'Registrar movimiento',
      aviso: 'Solo se puede pasar a coactiva un valor firme: notificado y con el plazo vencido sin reclamo.',
    },
  ];
  const tabIdx = Math.min(tab, TABS.length - 1);
  const tabDef = TABS[tabIdx];

  const guia =
    sel.notificado === ''
      ? {
          texto:
            'Este valor no está notificado. Mientras no lo esté no se puede cobrar, no es firme y el conteo de prescripción sigue corriendo desde el 01/01/' +
            (sel.anioDeuda + 1) +
            '.',
          color: 'var(--bad-fg)',
          fondo: 'var(--bad-bg)',
          accion: 'Notificar',
          ir: 1,
        }
      : sel.etapa === 'Firme sin pase'
        ? {
            texto: 'Notificado, vencido y sin reclamo: es firme. Se puede remitir a cobranza coactiva y no se ha hecho.',
            color: 'var(--warn-fg)',
            fondo: 'var(--warn-bg)',
            accion: 'Pasar a coactiva',
            ir: 2,
          }
        : {
            texto: 'Notificado el ' + sel.notificado + '. El plazo de veinte días hábiles ya corrió y el valor sigue su curso.',
            color: 'var(--ok-fg)',
            fondo: 'var(--ok-bg)',
            accion: 'Ver movimientos',
            ir: 2,
          };

  /* ── Emisión ──────────────────────────────────────────────── */
  const esIndividual = hojaEmision === 'individual';
  const emision = esIndividual
    ? {
        endpoint: 'POST /api/v1/valores/individual',
        campos: [
          { k: 'eContrib', l: 'Contribuyente', t: 'text', ancho: true, v: '00000003542 — SANTIAGO MOSCOL, GASPAR' },
          { k: 'eCriterio', l: 'Código de criterio', t: 'ro', v: '00000007891' },
          {
            k: 'eTipo',
            l: 'Tipo de recaudo',
            t: 'sel',
            ancho: true,
            v: '005 — RD PREDIAL FISCALIZACIÓN',
            o: ['005 — RD PREDIAL FISCALIZACIÓN', '001 — ORDEN DE PAGO PREDIAL', '004 — RES. EJECUCIÓN COACTIVA'],
          },
          { k: 'eDesde', l: 'Año desde', t: 'text', v: '2021' },
          { k: 'eHasta', l: 'Año hasta', t: 'text', v: '2026' },
          { k: 'eVence', l: 'Vencimiento', t: 'date', v: '2026-09-13' },
          {
            k: 'eOficina',
            l: 'Oficina emisora',
            t: 'sel',
            ancho: true,
            v: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA',
            o: ['113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '113100 — UNIDAD DE RENTAS'],
          },
        ] as CampoDef[],
        tabla: {
          titulo: 'Deuda que entra en el valor',
          conteo: '3 ejercicios',
          min: '740px',
          cols: [['Ejercicio', 0], ['Concepto', 0], ['Unidad', 0], ['Insoluto S/', 1], ['Interés S/', 1], ['Total S/', 1]] as ColDef[],
          filas: DEUDA_DEL_VALOR,
          nota: 'Un valor por contribuyente y por tipo de recaudo. Ejercicios distintos entran como recaudos del mismo valor.',
        },
        totales: [
          ['Ejercicios', '3', 0],
          ['Insoluto', 'S/ 6,670.00', 0],
          ['Interés', 'S/ 1,615.60', 0],
          ['Importe del valor', 'S/ 8,285.60', 1],
        ] as Total[],
        primaria: 'Generar el valor',
        aviso: 'Genera un valor. El siguiente paso es notificarlo: sin eso no cobra ni interrumpe la prescripción.',
      }
    : {
        endpoint: 'POST /api/v1/valores/masiva',
        campos: [
          { k: 'mCriterio', l: 'Descripción del criterio', t: 'text', ancho: true, v: 'ÓRDENES DE PAGO PREDIAL 2026 — CUOTA 2' },
          {
            k: 'mTipoRec',
            l: 'Tipo de recaudo',
            t: 'sel',
            ancho: true,
            v: '001 — ORDEN DE PAGO PREDIAL',
            o: ['001 — ORDEN DE PAGO PREDIAL', '005 — RD PREDIAL FISCALIZACIÓN', '003 — RS PAPELETAS DE TRÁNSITO'],
          },
          { k: 'mAlcance', l: 'Alcance', t: 'sel', v: 'TODO EL PADRÓN', o: ['TODO EL PADRÓN', 'POR SECTOR', 'POR RANGO DE DEUDA', 'SOLO VENCIDOS'] },
          { k: 'mAnio', l: 'Ejercicio de la deuda', t: 'sel', v: '2026', o: ['2026', '2025', '2024', '2023', '2022'] },
          { k: 'mMinimo', l: 'Deuda mínima (S/)', t: 'text', v: '50.00', ayuda: 'Por debajo, el valor cuesta más que lo que cobra' },
          { k: 'mVence', l: 'Vencimiento', t: 'date', v: '2026-09-30' },
          {
            k: 'mOficina',
            l: 'Oficina emisora',
            t: 'sel',
            ancho: true,
            v: '113100 — UNIDAD DE RENTAS',
            o: ['113100 — UNIDAD DE RENTAS', '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA'],
          },
        ] as CampoDef[],
        tabla: {
          titulo: 'Simulación del lote',
          conteo: 'Sobre 62,418 cuentas',
          min: '700px',
          cols: [['Etapa', 0], ['Cuentas', 1], ['Importe S/', 1], ['Excluidas', 1], ['Motivo de exclusión', 0]] as ColDef[],
          filas: SIMULACION_DEL_LOTE,
          nota: 'Simular no emite nada. Las exclusiones son la parte que hay que leer: cada una es una decisión que el criterio tomó por ti.',
        },
        totales: [
          ['Valores a emitir', '12,884', 0],
          ['Importe', 'S/ 3.38 M', 0],
          ['Excluidas', '5,528', 0],
          ['Coste de emisión', 'S/ 57,978.00', 1],
        ] as Total[],
        primaria: 'Emitir el lote',
        aviso: 'Emitir 12,884 valores es irreversible: cada uno queda con su número correlativo y solo se anula uno a uno.',
      };

  /* ── Prescripción ─────────────────────────────────────────── */
  let presSuma = 0;
  let presN = 0;
  PRESCRITAS.forEach((p, i) => {
    if (presMarcadas[i]) {
      presSuma += p[6];
      presN++;
    }
  });

  const titulos: Record<string, string> = {
    panel: 'Panel del módulo',
    lista: 'Valores',
    emision: 'Emisión',
    prescripcion: 'Prescripción',
  };
  const miga = esValor ? ['Valores', 'Valor ' + sel.numero, tabDef.label] : ['Valores', titulos[dest] ?? 'Valores'];
  const titulo = esValor ? 'Valor ' + sel.numero : (titulos[dest] ?? 'Valores');

  const paleta = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Valores',
    ir: () => {
      setValor(null);
      onDest(o[1] === 'valor' ? 'lista' : o[1]);
    },
  }));

  return (
    <Shell
      modulo="valores"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      tarjeta={
        <div style={{ border: '1px solid var(--bad-fg)', borderRadius: 8, padding: '11px 12px', background: 'var(--bad-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ color: 'var(--bad-fg)', flex: '0 0 auto' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--bad-fg)' }}>
              Prescriben este año
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--bad-fg)' }}>{soles(relojMonto)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--bad-fg)' }}>
            {relojN === 0
              ? 'Ningún ejercicio prescribe en los próximos 12 meses'
              : relojN.toLocaleString('es-PE') +
                ' valores del ejercicio ' +
                cerca.map((r) => r.anio).join(', ') +
                ' pierden el cobro en ' +
                Math.min(...cerca.map((r) => r.presc.meses)) +
                ' meses'}
          </p>
        </div>
      }
      contexto={
        esValor
          ? {
              volver: { label: 'Valores', onClick: () => setValor(null) },
              codigo: sel.numero,
              titular: sel.contribuyente,
              ubic: sel.tipo,
              derecha: (
                <>
                  <Insignia tono={tono(sel.etapa)}>{sel.etapa}</Insignia>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      borderRadius: 999,
                      padding: '4px 11px',
                      whiteSpace: 'nowrap',
                      background: selPres.vencido ? 'var(--bad-bg)' : selPres.meses <= 12 ? 'var(--warn-bg)' : 'var(--bg-elev)',
                      color: selPres.vencido ? 'var(--bad-fg)' : selPres.meses <= 12 ? 'var(--warn-fg)' : 'var(--ink-3)',
                    }}
                  >
                    {selPres.texto + ' · ' + selPres.fin}
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
              Un valor es el documento con el que la municipalidad puede exigir el pago. Emitirlo no basta: hasta que se
              notifica no corre ningún plazo, y si el plazo de cuatro años pasa, la deuda prescribe aunque el valor exista.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={H2}>Qué le falta a cada valor</h2>
                <span style={META}>4,182 valores emitidos</span>
              </div>
              {BANDEJA.map((b) => (
                <button
                  key={b[0]}
                  onClick={() => {
                    setChip(b[6]);
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
                  <Insignia tono={b[1]}>{b[0]}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{b[2]}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{b[3]}</span>
                  </span>
                  <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {b[4].toLocaleString('es-PE')}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                      {soles(b[5])}
                    </span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Los 412 emitidos sin notificar son la fila más cara del módulo: existen, no cobran y el reloj de
                prescripción les corre igual.
              </p>
            </section>

            {/* El reloj de prescripción: la barra se calcula del ejercicio de
                la deuda, no se copia. */}
            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Reloj de prescripción</h2>
                <span style={META}>4 años desde el 1 de enero siguiente</span>
              </div>
              {relojAnios.map((r) => {
                const color = r.presc.vencido ? 'var(--bad-fg)' : r.presc.meses <= 12 ? 'var(--warn-fg)' : 'var(--ink-3)';
                const relleno = r.presc.vencido ? 'var(--bad-fg)' : r.presc.meses <= 12 ? 'var(--warn-fg)' : 'var(--accent)';
                return (
                  <div key={r.anio} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ flex: '0 0 86px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{r.anio}</span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 60,
                        height: 10,
                        borderRadius: 999,
                        background: 'var(--accent-soft)',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <span style={{ position: 'absolute', inset: '0 auto 0 0', width: r.presc.pct.toFixed(1) + '%', borderRadius: 999, background: relleno }} />
                    </span>
                    <span style={{ flex: '0 0 108px', textAlign: 'right', fontSize: 12, color }}>{r.presc.texto}</span>
                    <span data-sm-hide="1" style={{ flex: '0 0 60px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {r.n}
                    </span>
                    <span style={{ flex: '0 0 116px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color }}>{soles(r.importe)}</span>
                  </div>
                );
              })}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                La notificación interrumpe la prescripción y reinicia el conteo. Es la única acción que mueve estas barras
                hacia la izquierda.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ ...TARJETA, overflow: 'visible', padding: '16px 17px' }}>
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

        {/* ══════════ LISTA DE VALORES ══════════ */}
        {dest === 'lista' && !esValor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Los valores emitidos, con lo que le falta a cada uno. El filtro de etapa es el que se usa: nadie busca «un
              valor», se busca «los que hay que notificar».
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nº de valor, contribuyente o criterio"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                <button
                  onClick={() => toast(filtrados.length + ' valores coinciden.')}
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
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Etapa</span>
                {['Todas', 'Emitido sin notificar', 'Notificado en plazo', 'Firme sin pase', 'En coactiva', 'Prescrito'].map((c) => {
                  const on = chip === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setChip(c);
                        setMarcadas({});
                      }}
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
                <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún valor en esa etapa</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Buena noticia si la etapa era «emitido sin notificar». Prueba con otra o quita el filtro.
                </p>
                <button onClick={() => setChip('Todas')} className="hov-linea" style={{ ...BOTON_SEC, marginTop: 6, padding: '9px 16px' }}>
                  Quitar el filtro
                </button>
              </section>
            )}

            {filtrados.length > 0 && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Valores emitidos</h2>
                  <span style={META}>{filtrados.length + ' de 4,182'}</span>
                  <button
                    onClick={() => toast(nMarcadas === 0 ? 'Marca al menos un valor.' : nMarcadas + ' valores enviados a notificación.')}
                    aria-disabled={nMarcadas === 0}
                    className="hov-acento-2"
                    style={{
                      border: 0,
                      borderRadius: 6,
                      padding: '8px 16px',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                      opacity: nMarcadas === 0 ? 0.55 : 1,
                    }}
                  >
                    {nMarcadas === 0 ? 'Notificar seleccionados' : 'Notificar ' + nMarcadas + ' seleccionados'}
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
                    <thead>
                      <Cabeceras defs={COLS_LISTA} hueco />
                    </thead>
                    <tbody>
                      {filtrados.map((v) => {
                        const on = marcadas[v.numero] === true;
                        return (
                          <tr
                            key={v.numero}
                            className="hov-elev"
                            style={{ borderTop: '1px solid var(--line)', cursor: 'pointer', background: on ? 'var(--accent-soft)' : 'transparent' }}
                          >
                            <td style={{ padding: '11px 14px' }}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => setMarcadas((x) => ({ ...x, [v.numero]: !on }))}
                                aria-label={'Seleccionar el valor ' + v.numero}
                                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                              />
                            </td>
                            {celdas(
                              [
                                v.numero,
                                v.tipo,
                                v.contribuyente,
                                String(v.anioDeuda),
                                v.emitido,
                                v.notificado === '' ? '—' : v.notificado,
                                v.monto.toFixed(2),
                                v.presc.texto,
                                v.etapa,
                              ],
                              COLS_LISTA,
                              8,
                              () => {
                                setValor(v.numero);
                                setTab(v.notificado === '' ? 1 : 0);
                              },
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={PIE}>
                  La columna «Prescribe» cuenta desde el 1 de enero siguiente al de la deuda, no desde la emisión del
                  valor. Un valor nuevo sobre deuda vieja nace con poco tiempo.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL VALOR ══════════ */}
        {esValor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {(
                  [
                    ['Nº de valor', sel.numero, 'var(--ink)'],
                    ['Ejercicio de la deuda', String(sel.anioDeuda), 'var(--ink)'],
                    ['Emitido', sel.emitido, 'var(--ink)'],
                    ['Notificado', sel.notificado === '' ? '—' : sel.notificado, sel.notificado === '' ? 'var(--bad-fg)' : 'var(--ink)'],
                    ['Importe', soles(sel.monto), 'var(--ink)'],
                    ['Prescribe', selPres.fin, selPres.vencido ? 'var(--bad-fg)' : selPres.meses <= 12 ? 'var(--warn-fg)' : 'var(--ink)'],
                  ] as [string, string, string][]
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
                  </div>
                ))}
              </div>
            </section>

            <Guia color={guia.color} fondo={guia.fondo} texto={guia.texto} accion={guia.accion} onAccion={() => setTab(guia.ir)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {TABS.map((t, i) => {
                const on = tabIdx === i;
                return (
                  <button
                    key={t.id}
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
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tabDef.campos.length > 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{tabDef.titulo}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    {tabDef.nota}
                  </p>
                </div>
                <Formulario defs={tabDef.campos} val={val} set={set} />
              </section>
            )}

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>{tabDef.tabla.titulo}</h2>
                <span style={META}>
                  {tabDef.tabla.filas.length === 0 ? tabDef.tabla.conteo : tabDef.tabla.filas.length + ' registros'}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: tabDef.tabla.min }}>
                  <thead>
                    <Cabeceras defs={tabDef.tabla.cols} />
                  </thead>
                  <tbody>
                    {tabDef.tabla.filas.map((f, i) => (
                      <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {celdas(f, tabDef.tabla.cols)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tabDef.tabla.totales && <Totales filas={tabDef.tabla.totales} />}
              <p style={PIE}>{tabDef.tabla.nota}</p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{tabDef.aviso}</p>
              <button className="hov-linea" style={BOTON_SEC}>
                {tabDef.secundaria}
              </button>
              <button
                onClick={() => toast(tabDef.primaria + ': registrado en el valor ' + sel.numero + '.')}
                className="hov-acento-2"
                style={BOTON_PRI}
              >
                {tabDef.primaria}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ EMISIÓN ══════════ */}
        {dest === 'emision' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Emitir valores es siempre lo mismo: un criterio que dice qué tipo de valor, de qué oficina y con qué
              vencimiento, y una lista de deuda que entra. Cambia si la lista es de un contribuyente o de un lote.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([['individual', 'Individual'], ['masiva', 'Masiva por criterio']] as ['individual' | 'masiva', string][]).map((h) => {
                const on = hojaEmision === h[0];
                return (
                  <button
                    key={h[0]}
                    onClick={() => setHojaEmision(h[0])}
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
                    {h[1]}
                  </button>
                );
              })}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Criterio de emisión</h2>
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
                  {emision.endpoint}
                </code>
              </div>
              <Formulario defs={emision.campos} val={val} set={set} />
            </section>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>{emision.tabla.titulo}</h2>
                <span style={META}>{emision.tabla.conteo}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: emision.tabla.min }}>
                  <thead>
                    <Cabeceras defs={emision.tabla.cols} />
                  </thead>
                  <tbody>
                    {emision.tabla.filas.map((f, i) => (
                      <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {celdas(f, emision.tabla.cols)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Totales filas={emision.totales} />
              <p style={PIE}>{emision.tabla.nota}</p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{emision.aviso}</p>
              <button className="hov-linea" style={BOTON_SEC}>
                Vista previa
              </button>
              <button
                onClick={() =>
                  toast(
                    esIndividual
                      ? 'Valor generado por S/ 8,285.60. Toca notificarlo.'
                      : '12,884 valores emitidos. 5,528 cuentas quedaron excluidas.',
                  )
                }
                className="hov-acento-2"
                style={BOTON_PRI}
              >
                {emision.primaria}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ PRESCRIPCIÓN ══════════ */}
        {dest === 'prescripcion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              La prescripción no se declara sola: la pide el contribuyente o la reconoce la municipalidad. Lo que decide
              es la fecha del último acto que interrumpió el conteo, y esa fecha está en el expediente del valor.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Deuda con prescripción cumplida</h2>
                <span style={META}>{PRESCRITAS.length + ' de 88 · ' + presN + ' marcados'}</span>
                <button
                  onClick={() =>
                    toast(presN === 0 ? 'Marca al menos una deuda.' : presN + ' deudas extinguidas por prescripción: ' + soles(presSuma) + '.')
                  }
                  aria-disabled={presN === 0}
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '8px 16px',
                    background: 'var(--error-texto)',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: presN === 0 ? 0.55 : 1,
                  }}
                >
                  {presN === 0 ? 'Declarar prescripción' : 'Declarar prescripción (' + presN + ')'}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <thead>
                    <Cabeceras defs={COLS_PRES} hueco />
                  </thead>
                  <tbody>
                    {PRESCRITAS.map((p, i) => {
                      const on = presMarcadas[i] === true;
                      return (
                        <tr
                          key={p[0]}
                          className="hov-elev"
                          style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}
                        >
                          <td style={{ padding: '11px 14px' }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setPresMarcadas((x) => ({ ...x, [i]: !on }))}
                              aria-label={'Declarar prescripción de ' + p[1] + ' ejercicio ' + p[2]}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          {celdas([p[0], p[1], p[2], p[3], p[4], p[5], p[6].toFixed(2)], COLS_PRES)}
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
                  Declarar la prescripción extingue la deuda y la saca de la cuenta corriente. Es irreversible y queda en
                  la bitácora con la resolución.
                </span>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>A extinguir</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)' }}>{soles(presSuma)}</span>
              </div>
            </section>

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Sustento de la declaración</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  Artículo 43º del Código Tributario: cuatro años, o seis si no se presentó la declaración jurada. El
                  conteo empieza el 1 de enero siguiente al ejercicio de la deuda.
                </p>
              </div>
              <Formulario
                val={val}
                set={set}
                defs={[
                  {
                    k: 'pCausal',
                    l: 'Base legal',
                    t: 'sel',
                    ancho: true,
                    v: 'ART. 43º — CUATRO AÑOS',
                    o: ['ART. 43º — CUATRO AÑOS', 'ART. 43º — SEIS AÑOS SIN DECLARACIÓN', 'ART. 43º — DIEZ AÑOS POR RETENCIÓN'],
                  },
                  {
                    k: 'pOrigen',
                    l: 'Origen de la declaración',
                    t: 'sel',
                    v: 'SOLICITUD DEL CONTRIBUYENTE',
                    o: ['SOLICITUD DEL CONTRIBUYENTE', 'DE OFICIO', 'MANDATO JUDICIAL'],
                  },
                  { k: 'pExp', l: 'Nº de expediente', t: 'text', v: '2026-1188' },
                  { k: 'pRes', l: 'Nº de resolución', t: 'text', v: 'RGAT-0244-2026-MDC' },
                  { k: 'pFecha', l: 'Fecha de resolución', t: 'date', v: '2026-08-13' },
                  {
                    k: 'pUltimo',
                    l: 'Último acto interruptivo',
                    t: 'ro',
                    v: 'Ninguno registrado',
                    ayuda: 'Si hubiera notificación posterior, el conteo se reinicia y no procede',
                  },
                  {
                    k: 'pMotivo',
                    l: 'Motivo',
                    t: 'area',
                    ancho: true,
                    v: 'Transcurridos más de cuatro años desde el 1 de enero siguiente al ejercicio de la deuda sin acto que interrumpa el cómputo.',
                  },
                ]}
              />
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}

const COLS_LISTA: ColDef[] = [
  ['Nº valor', 0],
  ['Tipo', 0],
  ['Contribuyente', 0],
  ['Ejercicio', 0],
  ['Emitido', 0],
  ['Notificado', 0],
  ['Importe S/', 1],
  ['Prescribe', 0],
  ['Etapa', 0],
];

const COLS_PRES: ColDef[] = [
  ['Contribuyente', 0],
  ['Nombre', 0],
  ['Ejercicio', 0],
  ['Concepto', 0],
  ['Valor', 0],
  ['Conteo desde', 0],
  ['A extinguir S/', 1],
];
