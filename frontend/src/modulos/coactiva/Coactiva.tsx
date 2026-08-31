import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  actosDe,
  BANDEJA,
  COSTAS_DE_LA_CARTERA,
  DEUDA_COACTIVA,
  EXPEDIENTES,
  FLUJO,
  KPIS,
  OPCIONES,
  TASA_ACTOS,
  VALORES_DEL_EXPEDIENTE,
  VALORES_PENDIENTES,
  type Acto,
  type Expediente,
  type TipoDeActo,
} from '../../datos/coactiva';

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

/** El tono que el artboard de Coactiva le da a un estado. No es el de `ds`:
 *  aquí «REC notificada» es bueno y «con medida» es malo. */
function tono(txt: string): Tono {
  const t = String(txt).toLowerCase();
  if (/sin notificar|sin rec|con medida|retención|inscripción|coactiva/.test(t)) return 'bad';
  if (/notificada|fraccionado|en plazo|no firme/.test(t)) return 'warn';
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

/** El aviso con filete de color a la izquierda: la guía del expediente. */
function Guia({ color, fondo, texto, accion, onAccion }: { color: string; fondo: string; texto: string; accion: string; onAccion: () => void }) {
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

type ExpedienteConSaldo = Expediente & { actos: Acto[]; costas: number; saldo: number };

type Pestania = {
  id: string;
  label: string;
  titulo: string;
  nota: string;
  campos: CampoDef[];
  tabla: {
    titulo: string;
    conteo: string;
    min: string;
    cols: ColDef[];
    filas: string[][];
    totales?: Total[];
    nota: string;
  };
  costo?: { acto: TipoDeActo; texto: string };
  secundaria: string;
  primaria: string;
  aviso: string;
};

export default function Coactiva({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const [expediente, setExpediente] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('Todos');
  const [tab, setTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [impMarcadas, setImpMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false });
  const [conBeneficio, setConBeneficio] = useState(false);

  /* Salir del módulo por el panel de destinos cierra el expediente abierto:
     el expediente vive dentro de «Expedientes», no es un destino más. */
  useEffect(() => setExpediente(null), [dest]);

  const val = (k: string, d: string | boolean | undefined) => (vals[k] === undefined ? d : vals[k]);
  const set = (k: string, v: string | boolean) => setVals((x) => ({ ...x, [k]: v }));

  /* La cartera: cada expediente con sus actos, sus costas y su saldo. Las
     costas no se escriben, son la suma de lo que costó cada acto dictado. */
  const conSaldo = useMemo<ExpedienteConSaldo[]>(
    () =>
      EXPEDIENTES.map((e) => {
        const actos = actosDe(e);
        const costas = actos.reduce((a, x) => a + x.costo, 0);
        return { ...e, actos, costas, saldo: e.deuda + costas };
      }),
    [],
  );
  const totalSaldo = conSaldo.reduce((a, e) => a + e.deuda + e.costas, 0);

  const filtrados = chip === 'Todos' ? conSaldo : conSaldo.filter((e) => e.estado === chip);
  const exp = conSaldo.find((e) => e.numero === expediente) ?? conSaldo[1];
  const esExpediente = dest === 'lista' && expediente !== null;

  /* ── Importación ──────────────────────────────────────────── */
  let impSuma = 0;
  let impN = 0;
  let hayNoFirme = false;
  VALORES_PENDIENTES.forEach((v, i) => {
    if (impMarcadas[i]) {
      impSuma += v.monto;
      impN++;
      if (!v.firme) hayNoFirme = true;
    }
  });
  const costasImport = impN * TASA_ACTOS.rec.costo;
  const impBloqueado = impN === 0 || hayNoFirme;

  /* ── Las pestañas del expediente ──────────────────────────── */
  const TABS: Pestania[] = [
    {
      id: 'proceso',
      label: 'Expediente',
      titulo: 'Datos del expediente',
      nota: 'El expediente se abre al importar el valor. La dirección referencial es donde se notifica, y puede no ser el domicilio fiscal.',
      campos: [
        { k: 'eNum', l: 'Nº de expediente', t: 'ro', v: exp.numero },
        { k: 'eAnio', l: 'Año', t: 'ro', v: String(exp.anio) },
        { k: 'eAnterior', l: 'Expediente anterior', t: 'text', v: '701.08T1', ayuda: 'Del sistema migrado, cuando existe' },
        { k: 'eObligado', l: 'Obligado', t: 'ro', ancho: true, v: exp.obligado + ' · ' + exp.doc },
        { k: 'eAsunto', l: 'Asunto', t: 'text', ancho: true, v: 'Cobranza coactiva de ' + exp.tributo },
        {
          k: 'eDirRef',
          l: 'Dirección referencial',
          t: 'text',
          ancho: true,
          v: 'A.H. CUATRO DE NOVIEMBRE — CA. SANTO TORIBIO 17',
          ayuda: 'Cambiarla es un acto del expediente y queda en el historial',
        },
        {
          k: 'eAuxiliar',
          l: 'Auxiliar coactivo',
          t: 'sel',
          v: 'GARCÍA NAVARRO, MARTHA ELENA',
          o: ['GARCÍA NAVARRO, MARTHA ELENA', 'PANTA GONZALES, ALBERTO', 'NO ESPECIFICADO'],
        },
        {
          k: 'eEjecutor',
          l: 'Ejecutor coactivo',
          t: 'sel',
          v: 'CHECA FERNÁNDEZ, HILTON ARTURO',
          o: ['CHECA FERNÁNDEZ, HILTON ARTURO', 'NO ESPECIFICADO'],
        },
        { k: 'eObs', l: 'Observaciones', t: 'area', ancho: true, v: '' },
      ],
      tabla: {
        titulo: 'Valores del expediente',
        conteo: '3 valores',
        min: '780px',
        cols: [['Nº valor', 0], ['Tipo', 0], ['Ejercicio', 0], ['Insoluto S/', 1], ['Interés S/', 1], ['Gastos S/', 1], ['Total S/', 1]],
        filas: VALORES_DEL_EXPEDIENTE,
        totales: [
          ['Valores', '3', 0],
          ['Deuda importada', soles(exp.deuda), 0],
          ['Costas del procedimiento', soles(exp.costas), 0],
          ['Saldo del expediente', soles(exp.saldo), 1],
        ],
        nota: 'Los valores no se editan aquí: se rechazan y vuelven a Valores. Lo que el expediente añade son las costas.',
      },
      secundaria: 'Actualizar deuda',
      primaria: 'Guardar el expediente',
      aviso: 'La deuda se actualiza al día: interés y gastos siguen corriendo mientras el expediente está abierto.',
    },
    {
      id: 'rec',
      label: 'REC y notificación',
      titulo: 'Resolución de ejecución coactiva',
      nota: 'La REC es lo que abre el procedimiento. Notificarla da siete días hábiles al obligado antes de que se pueda trabar cualquier medida.',
      campos: [
        { k: 'rNum', l: 'Nº de REC', t: 'text', v: 'REC 01 — 0000001403' },
        { k: 'rFecha', l: 'Fecha de emisión', t: 'date', v: '2026-08-13' },
        { k: 'rProyecta', l: 'Proyectar interés al', t: 'date', v: '2026-08-13', ayuda: 'La deuda de la REC se congela a esta fecha' },
        { k: 'rNotifFecha', l: 'Fecha de notificación', t: 'date', v: '' },
        { k: 'rVisita', l: 'Nº de visita', t: 'text', v: '1' },
        {
          k: 'rRecibido',
          l: 'Recibido por',
          t: 'sel',
          v: 'OBLIGADO',
          o: ['OBLIGADO', 'FAMILIAR', 'DEPENDIENTE', 'NEGATIVA A RECIBIR', 'CEDULÓN', 'DOMICILIO NO UBICADO'],
        },
        { k: 'rNombre', l: 'Nombre del receptor', t: 'text', v: '' },
        { k: 'rDni', l: 'D.N.I. del receptor', t: 'text', v: '' },
        { k: 'rTestigo', l: 'Testigo', t: 'text', v: '', ayuda: 'Obligatorio en la negativa a recibir' },
        { k: 'rVence', l: 'Plazo para pagar vence', t: 'ro', v: '—', ayuda: 'Siete días hábiles desde la notificación' },
      ],
      tabla: {
        titulo: 'Notificaciones del expediente',
        conteo: 'Sin notificaciones',
        min: '660px',
        cols: [['Acto', 0], ['Visita', 0], ['Fecha', 0], ['Resultado', 0], ['Receptor', 0]],
        filas: [],
        nota: 'Dos visitas fallidas habilitan el cedulón. Sin las dos, la notificación es impugnable y el embargo que venga detrás también.',
      },
      costo: {
        acto: 'rec',
        texto: 'Emitir la REC y notificarla añade costas al obligado. No es interés: es el coste tasado de los dos actos.',
      },
      secundaria: 'Imprimir REC',
      primaria: 'Registrar notificación',
      aviso: 'Sin REC notificada no se puede trabar medida cautelar. Hacerlo antes anula el embargo.',
    },
    {
      id: 'medidas',
      label: 'Medidas cautelares',
      titulo: 'Medida cautelar',
      nota: 'Solo procede con la REC notificada y el plazo vencido. La medida se dicta contra un tercero —banco, registro— que responde ante el ejecutor.',
      campos: [
        {
          k: 'mForma',
          l: 'Forma de la medida',
          t: 'sel',
          ancho: true,
          v: 'RETENCIÓN BANCARIA',
          o: ['RETENCIÓN BANCARIA', 'INSCRIPCIÓN DE PREDIO', 'SECUESTRO CONSERVATIVO', 'INTERVENCIÓN EN RECAUDACIÓN', 'DEPÓSITO CON EXTRACCIÓN'],
        },
        { k: 'mNum', l: 'Nº de embargo', t: 'text', v: '500' },
        { k: 'mFecha', l: 'Fecha del embargo', t: 'date', v: '2026-08-13' },
        { k: 'mMonto', l: 'Monto del embargo (S/)', t: 'text', v: '500.00', ayuda: 'No puede exceder el saldo del expediente' },
        {
          k: 'mTercero',
          l: 'Tercero requerido',
          t: 'sel',
          ancho: true,
          v: 'BANCO DE CRÉDITO DEL PERÚ',
          o: ['BANCO DE CRÉDITO DEL PERÚ', 'BANCO DE LA NACIÓN', 'INTERBANK', 'SUNARP — ZONA REGISTRAL I', 'CAJA MUNICIPAL DE CATACAOS'],
        },
        { k: 'mBien', l: 'Bien embargado', t: 'text', ancho: true, v: '' },
        { k: 'mRetenido', l: 'Monto retenido (S/)', t: 'ro', v: '0.00', ayuda: 'Lo informa el tercero al responder' },
        { k: 'mGlosa', l: 'Glosa', t: 'area', ancho: true, v: '' },
      ],
      tabla: {
        titulo: 'Medidas trabadas en el expediente',
        conteo: '',
        min: '740px',
        cols: [['Nº', 0], ['Forma', 0], ['Fecha', 0], ['Tercero', 0], ['Monto S/', 1], ['Retenido S/', 1], ['Estado', 0]],
        filas:
          exp.medida === ''
            ? []
            : exp.actos
                .filter((a) => a.tipo === 'embargo' || a.tipo === 'levantamiento')
                .map((a, i) => [
                  String(500 + i),
                  exp.medida,
                  a.fecha,
                  exp.medida === 'Retención bancaria' ? 'BANCO DE CRÉDITO DEL PERÚ' : 'SUNARP — ZONA REGISTRAL I',
                  '500.00',
                  '0.00',
                  a.tipo === 'levantamiento' ? 'Levantada' : 'Sin respuesta',
                ]),
        nota:
          exp.medida === ''
            ? 'Este expediente no tiene medida trabada. Para dictar una hace falta la REC notificada y el plazo de siete días hábiles vencido.'
            : 'Un tercero que no responde en plazo asume responsabilidad solidaria. El seguimiento es del ejecutor, no del sistema.',
      },
      costo: {
        acto: 'embargo',
        texto: 'Cada resolución de medida cautelar se tasa y se carga al obligado, tanto si la medida da resultado como si no.',
      },
      secundaria: 'Levantar medida',
      primaria: 'Trabar la medida',
      aviso: 'Levantar la medida también tiene costas. Un embargo mal trabado se levanta y el obligado paga las dos resoluciones.',
    },
    {
      id: 'costas',
      label: 'Costas',
      titulo: 'Liquidación de costas procesales',
      nota: 'La liquidación es la cuenta de los actos dictados. Se notifica al obligado y se cobra junto con la deuda.',
      campos: [
        { k: 'cNum', l: 'Nº de liquidación', t: 'ro', v: '1000000004' },
        { k: 'cFecha', l: 'Fecha', t: 'date', v: '2026-08-13' },
        { k: 'cObs', l: 'Observación', t: 'area', ancho: true, v: 'REC (01) notificada el 21/05/2026.' },
      ],
      tabla: {
        titulo: 'Actos liquidados',
        conteo: '',
        min: '640px',
        cols: [['Tributo', 0], ['Acto', 0], ['Fecha', 0], ['Costo S/', 1]],
        filas: exp.actos.filter((a) => a.costo > 0).map((a) => [exp.tributo.split(',')[0], a.label, a.fecha, a.costo.toFixed(2)]),
        nota: 'La tabla de costas la fija el arancel de la ejecutoría. El ejecutor no la negocia: la aplica.',
      },
      secundaria: 'Anular liquidación',
      primaria: 'Liquidar y notificar',
      aviso: 'Una liquidación notificada entra en la cuenta corriente del obligado como gasto del procedimiento.',
    },
    {
      id: 'fraccionamiento',
      label: 'Fraccionamiento',
      titulo: 'Fraccionamiento coactivo',
      nota: 'Fraccionar suspende el procedimiento pero no lo cierra. Dos cuotas consecutivas impagas lo reactivan con las medidas que estuvieran trabadas.',
      campos: [
        { k: 'fSaldo', l: 'Saldo a fraccionar (S/)', t: 'ro', v: soles(exp.saldo).replace('S/ ', '') },
        { k: 'fCuotas', l: 'Nº de cuotas', t: 'text', v: '6' },
        { k: 'fInicial', l: 'Cuota inicial', t: 'sel', v: '30 %', o: ['20 %', '30 %', '50 %'], ayuda: 'En coactiva la inicial mínima es del 20 %' },
        { k: 'fInteres', l: 'Interés de fraccionamiento', t: 'ro', v: '0.80 % mensual' },
        { k: 'fPrimera', l: 'Primera cuota vence', t: 'date', v: '2026-09-30' },
        {
          k: 'fMedidas',
          l: 'Levantar medidas al firmar',
          t: 'chk',
          v: false,
          ph: 'Las medidas trabadas se mantienen si no se marca',
        },
      ],
      tabla: {
        titulo: 'Cronograma',
        conteo: '6 cuotas',
        min: '620px',
        cols: [['Nº', 0], ['Cuota S/', 1], ['Capital S/', 1], ['Interés S/', 1], ['Vencimiento', 0]],
        filas: cronogramaDe(exp.saldo),
        nota: 'El convenio coactivo lo aprueba el ejecutor, no tesorería: es un acto del procedimiento.',
      },
      secundaria: 'Imprimir convenio',
      primaria: 'Aprobar el convenio',
      aviso: 'Mientras el convenio esté vigente el expediente queda suspendido y no se dictan nuevos actos.',
    },
    {
      id: 'historial',
      label: 'Historial',
      titulo: 'Historial del expediente',
      nota: 'Todo acto dictado, con su fecha, su usuario y su coste. Es lo que se presenta si el obligado impugna el procedimiento.',
      campos: [],
      tabla: {
        titulo: 'Actos del expediente',
        conteo: '',
        min: '780px',
        cols: [['Nº', 0], ['Acto', 0], ['Fecha', 0], ['Documento', 0], ['Costas S/', 1], ['Usuario', 0], ['Estado', 0]],
        filas: exp.actos.map((a) => [
          a.n,
          a.label,
          a.fecha,
          a.doc,
          a.costo.toFixed(2),
          a.tipo === 'importacion' ? 'MRIOS' : 'HCHECA',
          a.tipo === 'importacion' ? 'Firme' : a.tipo === 'levantamiento' ? 'Levantada' : 'Dictado',
        ]),
        nota: 'Un acto no se borra: se anula con otro acto, y los dos quedan.',
      },
      secundaria: 'Exportar historial',
      primaria: 'Registrar acto',
      aviso: 'El historial es la defensa del procedimiento. Un acto sin constancia es un acto impugnable.',
    },
  ];
  const tabIdx = Math.min(tab, TABS.length - 1);
  const tabDef = TABS[tabIdx];
  const filasTab = tabDef.tabla.filas;
  const costasDelTab = tabDef.id === 'costas' ? filasTab.reduce((a, f) => a + parseFloat(f[3]), 0) : 0;
  const totalesTab: Total[] =
    tabDef.tabla.totales ??
    (tabDef.id === 'costas'
      ? [
          ['Actos liquidados', String(filasTab.length), 0],
          ['Costas del acto', soles(costasDelTab), 0],
          ['Costas acumuladas', soles(exp.costas), 0],
          ['Saldo con costas', soles(exp.saldo), 1],
        ]
      : []);
  const insigniaTab = tabDef.id === 'medidas' || tabDef.id === 'historial' || tabDef.id === 'rec';

  /* ── Deuda en coactiva ────────────────────────────────────── */
  let dIns = 0;
  let dInt = 0;
  let dGas = 0;
  let dCos = 0;
  DEUDA_COACTIVA.forEach((x) => {
    dIns += x.insoluto;
    dInt += x.interes;
    dGas += x.gastos;
    dCos += x.costas;
  });
  const dBruto = dIns + dInt + dGas + dCos;
  /* El beneficio alcanza al interés, nunca a las costas: son gastos del
     procedimiento y no se condonan por ordenanza. */
  const dConBeneficio = dBruto - dInt;
  const dPagar = conBeneficio ? dConBeneficio : dBruto;

  /* ── Cartera, guía y navegación ───────────────────────────── */
  const carteraSaldo = BANDEJA.reduce((a, b) => a + b[5], 0);
  const carteraN = BANDEJA.reduce((a, b) => a + b[4], 0);

  const guia = (() => {
    if (exp.estado === 'Importado sin REC')
      return {
        texto: 'El expediente está abierto y el procedimiento no ha empezado. Hasta que se emita y notifique la REC no se puede exigir nada ni trabar medida.',
        color: 'var(--bad-fg)',
        fondo: 'var(--bad-bg)',
        accion: 'Emitir REC',
        ir: 1,
      };
    if (exp.estado === 'REC sin notificar')
      return {
        texto: 'La REC está emitida y sin notificar: las costas ya se cargaron al obligado y el procedimiento no avanza. Notificarla es el siguiente acto.',
        color: 'var(--bad-fg)',
        fondo: 'var(--bad-bg)',
        accion: 'Notificar',
        ir: 1,
      };
    if (exp.estado === 'REC notificada')
      return {
        texto: 'REC notificada. Corren siete días hábiles para que el obligado pague; vencidos, se puede trabar medida cautelar.',
        color: 'var(--warn-fg)',
        fondo: 'var(--warn-bg)',
        accion: 'Ver medidas',
        ir: 2,
      };
    if (exp.estado === 'Con medida cautelar')
      return {
        texto: 'Medida trabada: ' + exp.medida.toLowerCase() + '. El tercero requerido tiene plazo para responder y el seguimiento es del ejecutor.',
        color: 'var(--warn-fg)',
        fondo: 'var(--warn-bg)',
        accion: 'Ver medidas',
        ir: 2,
      };
    if (exp.estado === 'Fraccionado')
      return {
        texto: 'Convenio coactivo vigente: el procedimiento está suspendido. Dos cuotas consecutivas impagas lo reactivan.',
        color: 'var(--warn-fg)',
        fondo: 'var(--warn-bg)',
        accion: 'Ver convenio',
        ir: 4,
      };
    return {
      texto: 'Expediente concluido. Solo se consulta; los actos quedan en el historial como constancia del procedimiento.',
      color: 'var(--ok-fg)',
      fondo: 'var(--ok-bg)',
      accion: 'Ver historial',
      ir: 5,
    };
  })();

  const abrir = (e: ExpedienteConSaldo) => {
    setExpediente(e.numero);
    setTab(e.estado === 'REC sin notificar' ? 1 : 0);
  };

  const titulos: Record<string, string> = {
    panel: 'Panel del módulo',
    importacion: 'Importación',
    lista: 'Expedientes',
    deuda: 'Deuda en coactiva',
  };
  const miga = esExpediente
    ? ['Coactiva', 'Expediente ' + exp.numero, tabDef.label]
    : ['Coactiva', titulos[dest] ?? 'Coactiva'];
  const titulo = esExpediente ? 'Expediente ' + exp.numero + ' — ' + exp.anio : (titulos[dest] ?? 'Coactiva');

  const paleta = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Coactiva',
    ir: () => {
      setExpediente(null);
      onDest(o[1] === 'expediente' ? 'lista' : o[1]);
    },
  }));

  return (
    <Shell
      modulo="coactiva"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      tarjeta={
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
            Cartera en cobranza
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>
            {'S/ ' + (carteraSaldo / 1000000).toFixed(2) + ' M'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>
            {carteraN.toLocaleString('es-PE') + ' expedientes · ejecutor H. Checa'}
          </p>
          <p style={{ margin: '7px 0 0', paddingTop: 7, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--warn-fg)' }}>
            {soles(COSTAS_DE_LA_CARTERA) + ' (' + ((COSTAS_DE_LA_CARTERA / carteraSaldo) * 100).toFixed(0) + ' %) son costas del procedimiento'}
          </p>
        </div>
      }
      contexto={
        esExpediente
          ? {
              volver: { label: 'Expedientes', onClick: () => setExpediente(null) },
              codigo: exp.numero,
              titular: exp.obligado,
              ubic: exp.doc + ' · ' + exp.tributo + ' · año ' + exp.anio,
              derecha: (
                <>
                  <Insignia tono={tono(exp.estado)}>{exp.estado}</Insignia>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--bad-fg)' }}>{soles(exp.saldo)}</span>
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
            <p style={ENTRADILLA}>
              La cobranza coactiva es un procedimiento con actos tasados: cada resolución, cada notificación y cada embargo
              añade costas que paga el obligado. Doce opciones de menú eran los actos de un solo expediente.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={H2}>Qué le falta a cada expediente</h2>
                <span style={META}>4,182 expedientes</span>
              </div>
              {BANDEJA.map((b) => (
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
                Un expediente con REC emitida y sin notificar no puede embargar nada: el procedimiento está detenido y las
                costas ya se cargaron.
              </p>
            </section>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>De dónde viene y a dónde va la deuda</h2>
                <span style={META}>Ejercicio {pref.ejercicio}</span>
              </div>
              {FLUJO.map((f) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      flex: '0 0 auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      background: f.tono === 'neutro' ? 'var(--bg-elev)' : `var(--${f.tono}-bg)`,
                      color: f.tono === 'neutro' ? 'var(--ink-3)' : `var(--${f.tono}-fg)`,
                    }}
                  >
                    {f.signo}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{f.label}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{f.detalle}</span>
                  </span>
                  <span
                    style={{
                      flex: '0 0 auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13.5,
                      color: f.tono === 'neutro' ? 'var(--ink)' : `var(--${f.tono}-fg)`,
                    }}
                  >
                    {soles(f.monto)}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--accent-soft)' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--accent-ink)' }}>
                  Variación de la cartera en el ejercicio {pref.ejercicio}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--accent-ink)' }}>
                  {'+ ' + soles(FLUJO.reduce((a, f) => a + (f.signo === '+' ? f.monto : -f.monto), 0))}
                </span>
              </div>
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {'Es el movimiento del ejercicio, no la cartera: la cartera acumulada —expedientes de todos los años— es ' +
                  (carteraSaldo / 1000000).toFixed(2) +
                  ' M y está desglosada por estado en la tarjeta de arriba.'}
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

        {/* ══════════ IMPORTACIÓN ══════════ */}
        {dest === 'importacion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              Los valores llegan firmes desde Valores. Importarlos abre expediente y desde ese momento el obligado paga
              costas. Lo que se rechaza vuelve a Valores con el motivo.
            </p>

            <section style={TARJETA}>
              <Formulario
                val={val}
                set={set}
                defs={[
                  { k: 'iObligado', l: 'Obligado', t: 'text', ancho: true, v: '00000031704 — GONZALES ÁVILA, PASCUAL' },
                  { k: 'iTipo', l: 'Tipo de deuda', t: 'sel', v: 'TRIBUTARIA', o: ['TRIBUTARIA', 'P. TRÁNSITO', 'P. ADMINISTRATIVA', 'CLAUSURA DE LOCAL'] },
                  { k: 'iExpNum', l: 'Nº de expediente', t: 'ro', v: 'Se asigna al importar' },
                  { k: 'iAnio', l: 'Año del expediente', t: 'sel', v: '2026', o: ['2026', '2025', '2024'] },
                  { k: 'iAsunto', l: 'Asunto', t: 'text', ancho: true, v: 'Cobranza coactiva de impuesto predial 2025' },
                  { k: 'iAuxiliar', l: 'Auxiliar coactivo', t: 'sel', v: 'GARCÍA NAVARRO, MARTHA ELENA', o: ['GARCÍA NAVARRO, MARTHA ELENA', 'PANTA GONZALES, ALBERTO'] },
                  { k: 'iEjecutor', l: 'Ejecutor coactivo', t: 'sel', v: 'CHECA FERNÁNDEZ, HILTON ARTURO', o: ['CHECA FERNÁNDEZ, HILTON ARTURO'] },
                  {
                    k: 'iDirRef',
                    l: 'Dirección referencial',
                    t: 'text',
                    ancho: true,
                    v: 'A.H. QUINCE DE MARZO — AV. SAN FELIPE E1 LT 02',
                    ayuda: 'Copiada del domicilio fiscal; se puede cambiar',
                  },
                ]}
              />
              <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <thead>
                    <Cabeceras
                      hueco
                      defs={[
                        ['Nº valor', 0],
                        ['Tipo', 0],
                        ['Ejercicio', 0],
                        ['Obligado', 0],
                        ['Importe S/', 1],
                        ['Costas al importar S/', 1],
                        ['Estado', 0],
                      ]}
                    />
                  </thead>
                  <tbody>
                    {VALORES_PENDIENTES.map((v, i) => {
                      const on = impMarcadas[i] === true;
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
                              onChange={() => setImpMarcadas((x) => ({ ...x, [i]: !on }))}
                              aria-label={'Importar el valor ' + v.numero}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          {celdas(
                            [v.numero, v.tipo, String(v.anio), v.obligado, v.monto.toFixed(2), TASA_ACTOS.rec.costo.toFixed(2), v.firme ? 'Firme' : 'No firme'],
                            [['Nº valor', 0], ['Tipo', 0], ['Ejercicio', 0], ['Obligado', 0], ['Importe S/', 1], ['Costas al importar S/', 1], ['Estado', 0]],
                            6,
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Totales
                filas={[
                  ['Valores marcados', String(impN), 0],
                  ['Deuda a importar', soles(impSuma), 0],
                  ['Costas de la REC', soles(costasImport), 0],
                  ['Saldo del expediente', soles(impSuma + costasImport), 1],
                ]}
              />
              <p style={PIE}>
                Solo entran valores firmes: notificados y con el plazo vencido sin reclamo. Un valor sin notificar que
                llegue aquí se rechaza y vuelve a Valores.
              </p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {impN === 0
                  ? 'Marca los valores que entran en el expediente. Sin selección no hay nada que importar.'
                  : hayNoFirme
                    ? 'Hay un valor no firme entre los marcados: no se puede importar y hay que rechazarlo para que vuelva a Valores.'
                    : impN +
                      (impN === 1 ? ' valor' : ' valores') +
                      ' por ' +
                      soles(impSuma) +
                      '. Al importar se abre expediente y se cargan ' +
                      soles(costasImport) +
                      ' de costas al obligado.'}
              </p>
              <button onClick={() => toast('Recaudo rechazado. Vuelve a Valores con el motivo.')} style={BOTON_SEC} className="hov-linea">
                Rechazar recaudo
              </button>
              <button
                onClick={() => {
                  if (impN === 0) {
                    toast('Marca al menos un valor.');
                    return;
                  }
                  if (hayNoFirme) {
                    toast('Un valor no firme no se puede importar: recházalo primero.');
                    return;
                  }
                  onDest('lista');
                  toast('Expediente abierto con ' + impN + ' valores por ' + soles(impSuma + costasImport) + '.');
                }}
                aria-disabled={impBloqueado}
                className="hov-acento-2"
                style={{ ...BOTON_PRI, opacity: impBloqueado ? 0.55 : 1 }}
              >
                {impN === 0 ? 'Importar valores' : 'Importar ' + impN + ' valores'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ LISTA DE EXPEDIENTES ══════════ */}
        {dest === 'lista' && !esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              La cartera del ejecutor. La columna que decide el trabajo del día no es el número: es el estado y lo que las
              costas han sumado sobre la deuda original.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nº de expediente, obligado o documento"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                <button
                  onClick={() => toast(filtrados.length + ' expedientes coinciden.')}
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
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Estado</span>
                {['Todos', 'Importado sin REC', 'REC sin notificar', 'REC notificada', 'Con medida cautelar', 'Fraccionado', 'Concluido'].map((c) => {
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
                <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  Ningún expediente en ese estado
                </p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Prueba con otro estado o quita el filtro para ver los 4,182 de la cartera.
                </p>
                <button onClick={() => setChip('Todos')} className="hov-linea" style={{ ...BOTON_SEC, marginTop: 6, padding: '9px 16px' }}>
                  Quitar el filtro
                </button>
              </section>
            )}

            {filtrados.length > 0 && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Expedientes coactivos</h2>
                  <span style={META}>{filtrados.length + ' de 4,182 · saldo ' + soles(totalSaldo)}</span>
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
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                    <thead>
                      <Cabeceras defs={COLS_LISTA} />
                    </thead>
                    <tbody>
                      {filtrados.map((e) => (
                        <tr key={e.numero} onClick={() => abrir(e)} className="hov-acento" style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                          {celdas(
                            [
                              e.numero,
                              String(e.anio),
                              e.obligado,
                              e.tributo,
                              e.deuda.toFixed(2),
                              e.costas.toFixed(2),
                              e.saldo.toFixed(2),
                              e.medida === '' ? '—' : e.medida,
                              e.estado,
                            ],
                            COLS_LISTA,
                            8,
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={PIE}>
                  «Costas» es lo que el procedimiento añadió a la deuda que llegó. No es interés: es el coste tasado de
                  cada acto dictado.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL EXPEDIENTE ══════════ */}
        {esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {(
                  [
                    ['Expediente', exp.numero + ' — ' + exp.anio, 'var(--ink)', ''],
                    ['Obligado', exp.obligado, 'var(--ink)', exp.doc],
                    ['Deuda importada', soles(exp.deuda), 'var(--ink)', 'lo que llegó de Valores'],
                    ['Costas acumuladas', soles(exp.costas), 'var(--warn-fg)', 'coste de los actos dictados'],
                    ['Saldo del expediente', soles(exp.saldo), 'var(--bad-fg)', 'al 13/08/' + pref.ejercicio],
                    ['Medida cautelar', exp.medida === '' ? 'Ninguna' : exp.medida, exp.medida === '' ? 'var(--ink-3)' : 'var(--bad-fg)', ''],
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
                  {tabDef.tabla.conteo !== ''
                    ? tabDef.tabla.conteo
                    : filasTab.length === 0
                      ? 'Ninguno'
                      : filasTab.length + (filasTab.length === 1 ? ' registro' : ' registros')}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: tabDef.tabla.min }}>
                  <thead>
                    <Cabeceras defs={tabDef.tabla.cols} />
                  </thead>
                  <tbody>
                    {filasTab.map((f, i) => (
                      <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {celdas(f, tabDef.tabla.cols, insigniaTab ? f.length - 1 : -1)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalesTab.length > 0 && <Totales filas={totalesTab} />}
              <p style={PIE}>{tabDef.tabla.nota}</p>
            </section>

            {/* El coste tasado del acto, antes de dictarlo. */}
            {tabDef.costo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: 'wrap',
                  padding: '13px 16px',
                  border: '1px solid var(--warn-fg)',
                  borderLeft: '3px solid var(--warn-fg)',
                  borderRadius: 8,
                  background: 'var(--warn-bg)',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  style={{ color: 'var(--warn-fg)', flex: '0 0 auto' }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 8v4l2.5 1.6" />
                </svg>
                <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 13, lineHeight: 1.55, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
                  {tabDef.costo.texto}
                </p>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--warn-fg)' }}>Costas del acto</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--warn-fg)' }}>
                    {soles(TASA_ACTOS[tabDef.costo.acto].costo)}
                  </span>
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{tabDef.aviso}</p>
              <button className="hov-linea" style={BOTON_SEC}>
                {tabDef.secundaria}
              </button>
              <button
                onClick={() =>
                  toast(
                    tabDef.costo
                      ? tabDef.primaria + ': ' + soles(TASA_ACTOS[tabDef.costo.acto].costo) + ' de costas cargadas al obligado.'
                      : tabDef.primaria + ': registrado en el expediente ' + exp.numero + '.',
                  )
                }
                className="hov-acento-2"
                style={BOTON_PRI}
              >
                {tabDef.primaria}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ DEUDA EN COACTIVA ══════════ */}
        {dest === 'deuda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...ENTRADILLA, textWrap: undefined }}>
              La deuda que está en cobranza coactiva, con sus costas. El beneficio no es otra pantalla: es un interruptor
              sobre estas mismas filas, y en coactiva casi nunca alcanza a las costas.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
                padding: '12px 16px',
                border: '1px solid var(--line-2)',
                borderRadius: 10,
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>
                  Ordenanza 012-2026-MDC · condona el 100 % del interés moratorio
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  En coactiva el beneficio alcanza al interés pero no a las costas: son gastos del procedimiento y no se
                  condonan por ordenanza.
                </p>
              </div>
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
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                  {conBeneficio ? 'A pagar con beneficio' : 'A pagar sin beneficio'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: conBeneficio ? 'var(--ok-fg)' : 'var(--ink)' }}>{soles(dPagar)}</span>
              </span>
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Deuda en cobranza coactiva</h2>
                <span style={META}>
                  {DEUDA_COACTIVA.length + ' obligaciones · ' + (conBeneficio ? 'con beneficio' : 'sin beneficio')}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                  <thead>
                    <Cabeceras defs={COLS_DEUDA} />
                  </thead>
                  <tbody>
                    {DEUDA_COACTIVA.map((x) => {
                      const bruto = x.insoluto + x.interes + x.gastos + x.costas;
                      const neto = conBeneficio ? bruto - x.interes : bruto;
                      return (
                        <tr key={x.anio + x.unidad + x.tributo} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          {celdas(
                            [
                              x.anio,
                              x.unidad,
                              x.cuota,
                              x.tributo,
                              x.insoluto.toFixed(2),
                              x.interes.toFixed(2),
                              x.gastos.toFixed(2),
                              x.costas.toFixed(2),
                              neto.toFixed(2),
                            ],
                            COLS_DEUDA,
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Totales
                filas={[
                  ['Insoluto', soles(dIns), 0],
                  ['Interés', soles(dInt), 0],
                  ['Gastos', soles(dGas), 0],
                  ['Costas', soles(dCos), 0],
                  [conBeneficio ? 'A pagar con beneficio' : 'A pagar sin beneficio', soles(dPagar), 1],
                ]}
              />
              <p style={PIE}>
                {conBeneficio
                  ? 'Con el beneficio se condonan ' + soles(dInt) + ' de interés. Las ' + soles(dCos) + ' de costas se pagan igual: la ordenanza no las alcanza.'
                  : 'De ' + soles(dBruto) + ', ' + soles(dCos) + ' son costas del procedimiento. Con la ordenanza vigente se pagarían ' + soles(dConBeneficio) + '.'}
              </p>
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}

const COLS_LISTA: ColDef[] = [
  ['Expediente', 0],
  ['Año', 0],
  ['Obligado', 0],
  ['Tributo', 0],
  ['Deuda S/', 1],
  ['Costas S/', 1],
  ['Saldo S/', 1],
  ['Medida', 0],
  ['Estado', 0],
];

const COLS_DEUDA: ColDef[] = [
  ['Año', 0],
  ['Unidad', 0],
  ['Cuota', 0],
  ['Tributo', 0],
  ['Insoluto', 1],
  ['Interés', 1],
  ['Gastos', 1],
  ['Costas', 1],
  ['A pagar', 1],
];

/** Las cuotas vencen el **último día del mes**: componer «30/» a mano producía
 *  30/02/2027, una fecha que no existe, en el cronograma que se firma. */
function ultimoDia(anioBase: number, mesBase: number, salto: number) {
  const d = new Date(anioBase, mesBase + salto + 1, 0);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function cronogramaDe(saldo: number): string[][] {
  const inicial = saldo * 0.3;
  const capital = saldo - inicial;
  const n = 6;
  const cuotaCap = capital / n;
  const out: string[][] = [];
  for (let i = 0; i < n; i++) {
    const interes = (capital - cuotaCap * i) * 0.008;
    out.push([String(i + 1).padStart(3, '0'), (cuotaCap + interes).toFixed(2), cuotaCap.toFixed(2), interes.toFixed(2), ultimoDia(2026, 8, i)]);
  }
  return out;
}
