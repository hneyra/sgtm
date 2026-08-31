import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { Insignia, type Tono } from '../../ds/componentes';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  ARQUEO_INICIAL,
  AVANCE,
  CONTRIBUYENTE,
  CONVENIOS,
  DEUDAS,
  ESTADOS_DE_CONVENIO,
  FRACCIONAMIENTO,
  KPIS,
  MEDIOS,
  OPCIONES,
  POR_AREA,
  RECIBOS,
  TASAS,
  type ClaveDeMedio,
} from '../../datos/tesoreria';

/* ══════════ Los estilos que el artboard repite ══════════
   Copiados de las constantes `IN`, `TH`, `THN`, `TD`, `TDN` y `TD1` de
   `Tesoreria.dc.html`, sin redondear un valor. */

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
const ENTRADILLA: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.6,
  color: 'var(--ink-2)',
  maxWidth: '70ch',
};
const NOTA_PIE: CSSProperties = {
  margin: 0,
  padding: '11px 16px',
  borderTop: '1px solid var(--line)',
  background: 'var(--bg-elev)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink-3)',
  textWrap: 'pretty',
};
/** El totalizador de cuatro celdas al pie de una tabla: los filetes se pisan
 *  con el margen negativo, igual que en el artboard. */
const TOTAL_CELDA = (fuerte: boolean): CSSProperties => ({
  background: fuerte ? 'var(--accent-soft)' : 'var(--bg-card)',
  padding: '14px 16px',
  borderLeft: '1px solid var(--line)',
  borderTop: '1px solid var(--line)',
  margin: '-1px 0 0 -1px',
});

/** La píldora de hoja: «Deuda tributaria / Tasas y derechos». */
const PILDORA = (on: boolean): CSSProperties => ({
  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
  borderRadius: 999,
  padding: '7px 15px',
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: on ? 600 : 400,
  background: on ? 'var(--accent)' : 'var(--bg-card)',
  color: on ? '#fff' : 'var(--ink-2)',
});

/** El tono de un estado tal como lo resuelve el artboard: por omisión `ok`,
 *  que no es lo que hace `tonoDe` del design system. */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiva|quebrado|anulado|vencid/.test(t)) return 'bad';
  if (/valor emitido|en riesgo|a cuenta/.test(t)) return 'warn';
  return 'ok';
}

type ColDef = [string, 0 | 1];
const cabeceras = (defs: ColDef[]) =>
  defs.map((c) => (
    <th key={c[0]} style={c[1] ? THN : TH}>
      {c[0]}
    </th>
  ));
const estiloDeCelda = (j: number, defs: ColDef[]): CSSProperties => (j === 0 ? TD1 : defs[j] && defs[j][1] ? TDN : TD);

/** Un campo declarado: los ocho del fraccionamiento, los cinco de la anulación
 *  y los seis del cierre se dibujan todos con esta forma. */
type DefCampo = {
  k: string;
  l: string;
  t?: 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro';
  v?: string | boolean;
  o?: string[];
  ph?: string;
  ayuda?: string;
  ancho?: boolean;
};

function CampoDeclarado({
  f,
  texto,
  marcado,
  onTexto,
  onMarca,
}: {
  f: DefCampo;
  texto: string;
  marcado: boolean;
  onTexto: (v: string) => void;
  onMarca: (v: boolean) => void;
}) {
  const t = f.t ?? 'text';
  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
      {t === 'text' && <input value={texto} onChange={(e) => onTexto(e.target.value)} placeholder={f.ph} style={IN} />}
      {t === 'date' && <input type="date" value={texto} onChange={(e) => onTexto(e.target.value)} style={IN} />}
      {t === 'sel' && (
        <select value={texto} onChange={(e) => onTexto(e.target.value)} style={IN}>
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
          onChange={(e) => onTexto(e.target.value)}
          rows={3}
          placeholder={f.ph}
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
            checked={marcado}
            onChange={(e) => onMarca(e.target.checked)}
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
      {f.ayuda && (
        <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>
      )}
    </label>
  );
}

/* ══════════ El módulo ══════════ */

export default function Tesoreria({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  /* Los valores tecleados. El artboard los guarda en un solo `vals`, con el
     valor declarado del campo como valor por omisión. */
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const fijarVal = (k: string, v: string | boolean) => setVals((s) => ({ ...s, [k]: v }));
  const txt = (k: string, d: string) => {
    const v = vals[k];
    return typeof v === 'string' ? v : d;
  };
  const marca = (k: string, d: boolean) => {
    const v = vals[k];
    return typeof v === 'boolean' ? v : d;
  };

  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [hojaCobro, setHojaCobro] = useState<'tributaria' | 'tasas'>('tributaria');
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false, 4: false });
  const [marcadasTasas, setMarcadasTasas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false });
  const [reciboEmitido, setReciboEmitido] = useState(false);
  const [hojaConv, setHojaConv] = useState<'fraccionar' | 'seguimiento'>('fraccionar');
  const [estadoConv, setEstadoConv] = useState('Todos');
  const [numeroDeRecibo, setNumeroDeRecibo] = useState('0003-0041184');
  const [actoRecibo, setActoRecibo] = useState<'duplicado' | 'anulacion'>('duplicado');
  const [arqueo, setArqueo] = useState<Record<ClaveDeMedio, string>>({ ...ARQUEO_INICIAL });
  const [recTab, setRecTab] = useState(0);

  const ejercicio = pref.ejercicio;
  const S = soles;

  /* ── Cobro tributario ─────────────────────────────────────── */
  const beneficio = txt('beneficio', 'ORD. 012-2026-MDC — 100 % INTERESES');
  const aplicaBeneficio = beneficio !== 'NINGUNO';
  let acogida = 0;
  let interesAcogido = 0;
  let nAcogidas = 0;
  DEUDAS.forEach((x, i) => {
    if (marcadas[i]) {
      acogida += x.insoluto + x.reajuste + x.interes + x.gastos;
      interesAcogido += x.interes;
      nAcogidas++;
    }
  });
  const deudaTotal = DEUDAS.reduce((a, x) => a + x.insoluto + x.reajuste + x.interes + x.gastos, 0);
  const descuento = aplicaBeneficio ? interesAcogido : 0;
  const totalTrib = acogida - descuento;

  let totalTasas = 0;
  let nTasas = 0;
  TASAS.forEach((t, i) => {
    if (marcadasTasas[i]) {
      totalTasas += t.cant * t.precio;
      nTasas++;
    }
  });

  const esTributaria = hojaCobro === 'tributaria';
  const totalCobro = esTributaria ? totalTrib : totalTasas;
  const nSel = esTributaria ? nAcogidas : nTasas;

  const colsDeuda: ColDef[] = [
    ['Año', 0],
    ['Unidad', 0],
    ['Cuota', 0],
    ['Tributo', 0],
    ['Fase', 0],
    ['Insoluto', 1],
    ['Reajuste', 1],
    ['Interés', 1],
    ['Gastos', 1],
    ['Total', 1],
  ];
  const colsTasas: ColDef[] = [
    ['Partida', 0],
    ['Concepto TUPA', 0],
    ['Área', 0],
    ['Cantidad', 1],
    ['Precio S/', 1],
    ['Importe S/', 1],
  ];

  /* ── Fraccionamiento ──────────────────────────────────────── */
  const totalDeudaFrac = FRACCIONAMIENTO.deuda;
  const nCuotas = Math.max(parseInt(txt('cuotas', '6'), 10) || 6, 1);
  const pctInicial = parseFloat(String(txt('inicial', '20 %')).replace(' %', '')) || 0;
  const inicial = (totalDeudaFrac * pctInicial) / 100;
  const capitalFrac = totalDeudaFrac - inicial;
  const tasaMes = FRACCIONAMIENTO.tasaMes;
  const cuotaCapital = capitalFrac / nCuotas;

  const cronograma = useMemo(() => {
    const filas: string[][] = [];
    let sumaCuota = 0;
    let sumaInteres = 0;
    for (let i = 0; i < nCuotas; i++) {
      const saldo = capitalFrac - cuotaCapital * i;
      const interes = saldo * tasaMes;
      const gasto = FRACCIONAMIENTO.gastoPorCuota;
      const cuota = cuotaCapital + interes + gasto;
      sumaCuota += cuota;
      sumaInteres += interes;
      /* Último día real del mes: componer «30/» a mano producía 30/02/2027 en
         el cronograma que el contribuyente firma. */
      const d = new Date(2026, 11 + i, 0);
      filas.push([
        String(i + 1).padStart(3, '0'),
        cuota.toFixed(2),
        cuotaCapital.toFixed(2),
        interes.toFixed(2),
        '0.00',
        gasto.toFixed(2),
        String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(),
      ]);
    }
    return { filas, sumaCuota, sumaInteres };
  }, [nCuotas, capitalFrac, cuotaCapital, tasaMes]);

  const colsFrac: ColDef[] = [
    ['Nº', 0],
    ['Cuota S/', 1],
    ['Capital S/', 1],
    ['Interés S/', 1],
    ['Gasto conv. S/', 1],
    ['Gasto cuota S/', 1],
    ['Vencimiento', 0],
  ];

  const colsConv: ColDef[] = [
    ['Nº convenio', 0],
    ['Contribuyente', 0],
    ['Fecha', 0],
    ['Deuda acogida S/', 1],
    ['Cuotas', 1],
    ['Pagadas', 1],
    ['Vencidas', 1],
    ['Saldo S/', 1],
    ['Estado', 0],
  ];
  const convFiltrados = estadoConv === 'Todos' ? CONVENIOS : CONVENIOS.filter((c) => c[8] === estadoConv);

  /* ── Recibos ──────────────────────────────────────────────── */
  const colsRec: ColDef[] = [
    ['Nº recibo', 0],
    ['Fecha', 0],
    ['Hora', 0],
    ['Contribuyente', 0],
    ['Concepto', 0],
    ['Importe S/', 1],
    ['Duplicados', 1],
    ['Estado', 0],
  ];
  const rec = RECIBOS.find((r) => r.numero === numeroDeRecibo) ?? RECIBOS[0];
  const esAnulacion = actoRecibo === 'anulacion';
  const yaAnulado = rec.estado === 'Anulado';

  /* ── Arqueo ───────────────────────────────────────────────── */
  let sistemaTotal = 0;
  let declaradoTotal = 0;
  const arqueoFilas = MEDIOS.map((m) => {
    const declarado = parseFloat(String(arqueo[m.k]).replace(/,/g, '')) || 0;
    const dif = declarado - m.sistema;
    const cuadraFila = Math.abs(dif) < 0.005;
    sistemaTotal += m.sistema;
    declaradoTotal += declarado;
    return { m, declarado, dif, cuadra: cuadraFila };
  });
  const difTotal = declaradoTotal - sistemaTotal;
  const cuadra = Math.abs(difTotal) < 0.005;

  /* ── Recaudación ──────────────────────────────────────────── */
  const colsAvance: ColDef[] = [
    ['Tributo', 0],
    ['Emitido S/', 1],
    ['Recaudado S/', 1],
    ['Saldo S/', 1],
    ['% avance', 1],
  ];
  const colsArea: ColDef[] = [
    ['Partida', 0],
    ['Concepto', 0],
    ['Área generadora', 0],
    ['Recaudado S/', 1],
  ];

  /* ── El shell ─────────────────────────────────────────────── */
  const DESTINOS: Record<string, string> = {
    panel: 'Panel del turno',
    cobrar: 'Cobrar',
    convenios: 'Convenios',
    recibos: 'Recibos',
    cierre: 'Cierre de caja',
    recaudacion: 'Recaudación',
  };
  const titulo = DESTINOS[dest] ?? 'Tesorería';

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Tesorería',
    ir: () => onDest(o[1]),
  }));

  const hayContexto = dest === 'cobrar' || dest === 'convenios';

  /* ══════════ PANEL: EL TURNO ══════════ */
  const panel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
        Tesorería no es un conjunto de formularios: es un turno. Se abre la caja, se cobra, se corrigen los errores del
        día y se cierra con un arqueo que tiene que cuadrar. El módulo se ordena así.
      </p>

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>Turno de hoy · caja C-3, mañana</h2>
          <span style={META}>Abierta 08:00 · 5 h 32 min</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))',
            gap: 0,
            background: 'var(--bg-card)',
          }}
        >
          {MEDIOS.map((m) => (
            <div
              key={m.k}
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
                {m.label}
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ink)' }}>
                {S(m.sistema)}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>
                {((m.sistema / sistemaTotal) * 100).toFixed(1)} % del turno
              </p>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '13px 16px',
            borderTop: '1px solid var(--line)',
            background: 'var(--bg-elev)',
          }}
        >
          <span style={{ flex: 1, minWidth: 170, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            148 recibos emitidos y 3 anulados. La anulación solo se puede hacer mientras la caja siga abierta.
          </span>
          <button
            onClick={() => onDest('recibos')}
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
            Ver recibos
          </button>
          <button
            onClick={() => onDest('cierre')}
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
            Cerrar caja
          </button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
        {KPIS.map((k) => (
          <div
            key={k.etiqueta}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-1)',
              padding: '16px 17px',
            }}
          >
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
          <h2 style={H2}>Avance del ejercicio {ejercicio}</h2>
          <button
            onClick={() => onDest('recaudacion')}
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
            Ver detalle
          </button>
        </div>
        {AVANCE.map((a) => (
          <div
            key={a[0]}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
          >
            <span style={{ flex: '0 0 196px', minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{a[0]}</span>
            <span
              style={{
                flex: 1,
                minWidth: 60,
                height: 8,
                borderRadius: 999,
                background: 'var(--accent-soft)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${a[4].toFixed(1)}%`,
                  borderRadius: 999,
                  background: a[4] < 50 ? 'var(--bad-fg)' : a[4] < 80 ? 'var(--warn-fg)' : 'var(--accent)',
                }}
              />
            </span>
            <span
              style={{
                flex: '0 0 52px',
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                color: a[4] < 50 ? 'var(--bad-fg)' : a[4] < 80 ? 'var(--warn-fg)' : 'var(--ok-fg)',
              }}
            >
              {a[4].toFixed(1)} %
            </span>
            <span
              data-sm-hide="1"
              style={{ flex: '0 0 116px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}
            >
              S/ {a[3]}
            </span>
          </div>
        ))}
        <p style={{ ...NOTA_PIE, borderTop: undefined }}>
          El avance compara lo recaudado contra lo emitido, no contra la meta. Multas al 38.6 % no es un problema de
          caja: es lo que Tránsito no llegó a notificar.
        </p>
      </section>
    </div>
  );

  /* ══════════ COBRAR ══════════ */
  const marcarTodo = () => {
    if (esTributaria) {
      const todo = nAcogidas !== DEUDAS.length;
      const m: Record<number, boolean> = {};
      DEUDAS.forEach((_x, i) => {
        m[i] = todo;
      });
      setMarcadas(m);
      setReciboEmitido(false);
    } else {
      const todo = nTasas !== TASAS.length;
      const m: Record<number, boolean> = {};
      TASAS.forEach((_x, i) => {
        m[i] = todo;
      });
      setMarcadasTasas(m);
      setReciboEmitido(false);
    }
  };

  const formaPago: DefCampo[] = [
    {
      k: 'forma',
      l: 'Forma de pago',
      t: 'sel',
      v: 'NORMAL TRIBUTARIO',
      o: [
        'NORMAL TRIBUTARIO',
        'A CUENTA',
        'SÓLO GASTOS',
        'BENEFICIO TOTAL AÑO',
        'BENEFICIO PARCIAL AÑO',
        'ADELANTO DE CONVENIO',
        'PRECONVENIO',
        'CONTADO TOTAL',
        'PRESCRIPCIÓN',
      ],
    },
    {
      k: 'beneficio',
      l: 'Beneficio aplicable',
      t: 'sel',
      v: 'ORD. 012-2026-MDC — 100 % INTERESES',
      o: ['NINGUNO', 'ORD. 012-2026-MDC — 100 % INTERESES', 'AMNISTÍA PREDIAL 2026', 'DESCUENTO PRONTO PAGO'],
      ayuda: 'El descuento se aplica sobre el interés de lo marcado y se ve abajo en la barra',
    },
  ];

  const filtrosDeuda: {
    label: string;
    k: string;
    tipo: 'sel' | 'texto';
    valor: string;
    opts?: string[];
    ph?: string;
  }[] = [
    { label: 'Año desde', k: 'fAnioDesde', tipo: 'sel', valor: '2022', opts: ['2022', '2023', '2024', '2025', '2026'] },
    { label: 'Año hasta', k: 'fAnioHasta', tipo: 'sel', valor: '2026', opts: ['2022', '2023', '2024', '2025', '2026'] },
    { label: 'Cuota desde', k: 'fCuotaDesde', tipo: 'texto', valor: '1', ph: '1' },
    { label: 'Cuota hasta', k: 'fCuotaHasta', tipo: 'texto', valor: '12', ph: '12' },
    {
      label: 'Tributo',
      k: 'fTributo',
      tipo: 'sel',
      valor: 'TODOS',
      opts: ['TODOS', 'IMPUESTO PREDIAL', 'LIMPIEZA PÚBLICA', 'PARQUES Y JARDINES', 'SERENAZGO', 'PATRIMONIO VEHICULAR', 'MULTAS'],
    },
    { label: 'Fase', k: 'fFase', tipo: 'sel', valor: 'TODAS', opts: ['TODAS', 'ORDINARIA', 'VALOR EMITIDO', 'COACTIVA'] },
    { label: 'Unidad', k: 'fUnidad', tipo: 'texto', valor: '02-014-D-14-01', ph: 'Código predial o placa' },
    { label: 'Convenio', k: 'fConvenio', tipo: 'texto', valor: '', ph: 'Nº de convenio' },
  ];

  const cobrar = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['tributaria', 'Deuda tributaria'],
            ['tasas', 'Tasas y derechos'],
          ] as const
        ).map((h) => {
          const on = hojaCobro === h[0];
          return (
            <button
              key={h[0]}
              onClick={() => {
                setHojaCobro(h[0]);
                setReciboEmitido(false);
              }}
              aria-pressed={on}
              className="hov-linea"
              style={PILDORA(on)}
            >
              {h[1]}
            </button>
          );
        })}
        <p
          data-sm-hide="1"
          style={{ margin: 0, flex: 1, minWidth: 180, alignSelf: 'center', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}
        >
          {esTributaria
            ? 'Deuda de la cuenta corriente: predial, arbitrios, vehicular y multas.'
            : 'Conceptos del TUPA que no están en la cuenta corriente: constancias, copias y derechos de trámite.'}
        </p>
      </div>

      {esTributaria && (
        <section style={TARJETA}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: '14px 16px',
              padding: '15px 16px',
            }}
          >
            {formaPago.map((f) => (
              <CampoDeclarado
                key={f.k}
                f={f}
                texto={txt(f.k, String(f.v ?? ''))}
                marcado={false}
                onTexto={(v) => fijarVal(f.k, v)}
                onMarca={(v) => fijarVal(f.k, v)}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
            <button
              onClick={() => setFiltrosAbiertos((v) => !v)}
              aria-expanded={filtrosAbiertos}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                border: 0,
                background: 'transparent',
                padding: '10px 16px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 16,
                  height: 16,
                  color: 'var(--ink-4)',
                  transform: `rotate(${filtrosAbiertos ? '0' : '-90'}deg)`,
                  transition: 'transform .15s ease',
                }}
              >
                <Icono d={['M6 9l6 6 6-6']} tam={12} grosor={2} />
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Filtrar la deuda</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                año · cuota · tributo · fase · unidad
              </span>
            </button>
            {filtrosAbiertos && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
                  gap: '14px 16px',
                  padding: '4px 16px 16px',
                }}
              >
                {filtrosDeuda.map((f) => (
                  <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                    {f.tipo === 'sel' ? (
                      <select
                        value={txt(f.k, f.valor)}
                        onChange={(e) => fijarVal(f.k, e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid var(--line-2)',
                          borderRadius: 6,
                          padding: '9px 10px',
                          background: 'var(--bg-card)',
                          fontSize: 13.5,
                        }}
                      >
                        {(f.opts ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={txt(f.k, f.valor)}
                        onChange={(e) => fijarVal(f.k, e.target.value)}
                        placeholder={f.ph}
                        style={{
                          width: '100%',
                          border: '1px solid var(--line-2)',
                          borderRadius: 6,
                          padding: '9px 10px',
                          background: 'var(--bg-card)',
                          fontSize: 13.5,
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>{esTributaria ? 'Deuda del contribuyente' : 'Conceptos del TUPA'}</h2>
          <span style={META}>
            {esTributaria
              ? `${DEUDAS.length} registros · ${nAcogidas} marcados`
              : `${TASAS.length} conceptos · ${nTasas} marcados`}
          </span>
          <button
            onClick={marcarTodo}
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
            {esTributaria
              ? nAcogidas === DEUDAS.length
                ? 'Quitar selección'
                : 'Marcar todo'
              : nTasas === TASAS.length
                ? 'Quitar selección'
                : 'Marcar todo'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: esTributaria ? 900 : 740 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                {cabeceras(esTributaria ? colsDeuda : colsTasas)}
              </tr>
            </thead>
            <tbody>
              {esTributaria
                ? DEUDAS.map((x, i) => {
                    const on = marcadas[i] === true;
                    const total = x.insoluto + x.reajuste + x.interes + x.gastos;
                    const celdas = [
                      x.anio,
                      x.unidad,
                      x.cuota,
                      x.tributo,
                      x.fase,
                      x.insoluto.toFixed(2),
                      x.reajuste.toFixed(2),
                      x.interes.toFixed(2),
                      x.gastos.toFixed(2),
                      total.toFixed(2),
                    ];
                    return (
                      <tr
                        key={`${x.anio}-${x.tributo}-${x.cuota}-${x.unidad}`}
                        className="hov-elev"
                        style={{
                          borderTop: '1px solid var(--line)',
                          background: on ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '11px 14px' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              setMarcadas((y) => ({ ...y, [i]: !on }));
                              setReciboEmitido(false);
                            }}
                            aria-label={`Cobrar ${x.tributo} ${x.anio} cuota ${x.cuota}`}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                          />
                        </td>
                        {celdas.map((c, j) =>
                          j === 4 ? (
                            <td key={j} style={{ padding: '11px 14px' }}>
                              <Insignia tono={tono(c)}>{c}</Insignia>
                            </td>
                          ) : (
                            <td key={j} style={estiloDeCelda(j, colsDeuda)}>
                              {c}
                            </td>
                          ),
                        )}
                      </tr>
                    );
                  })
                : TASAS.map((t, i) => {
                    const on = marcadasTasas[i] === true;
                    const celdas = [
                      t.partida,
                      t.concepto,
                      t.area,
                      String(t.cant),
                      t.precio.toFixed(2),
                      (t.cant * t.precio).toFixed(2),
                    ];
                    return (
                      <tr
                        key={t.concepto}
                        className="hov-elev"
                        style={{
                          borderTop: '1px solid var(--line)',
                          background: on ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '11px 14px' }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              setMarcadasTasas((y) => ({ ...y, [i]: !on }));
                              setReciboEmitido(false);
                            }}
                            aria-label={`Cobrar ${t.concepto}`}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                          />
                        </td>
                        {celdas.map((c, j) => (
                          <td key={j} style={estiloDeCelda(j, colsTasas)}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        <p style={NOTA_PIE}>
          {esTributaria
            ? 'La fase coactiva incluye costas y gastos del procedimiento; solo el ejecutor puede levantarlos.'
            : 'Las tasas del TUPA no generan deuda: se cobran en el acto y el recibo es el comprobante del trámite.'}
        </p>
      </section>

      {reciboEmitido && comprobante()}
    </div>
  );

  /* El recibo es el cierre del cobro: sale con lo marcado, no con una cifra
     escrita, y el beneficio va como una línea más que resta. */
  const comprobante = () => {
    const lineas = esTributaria
      ? DEUDAS.filter((_x, i) => marcadas[i])
          .map((x) => ({
            concepto: `${x.tributo} ${x.anio} · cuota ${x.cuota}`,
            importe: (x.insoluto + x.reajuste + x.interes + x.gastos).toFixed(2),
          }))
          .concat(
            aplicaBeneficio && descuento > 0
              ? [{ concepto: 'Beneficio ORD. 012-2026-MDC · 100 % intereses', importe: '− ' + descuento.toFixed(2) }]
              : [],
          )
      : TASAS.filter((_t, i) => marcadasTasas[i]).map((t) => ({
          concepto: `${t.concepto} · ${t.cant} × ${t.precio.toFixed(2)}`,
          importe: (t.cant * t.precio).toFixed(2),
        }));
    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 6,
          boxShadow: 'var(--shadow-2)',
          padding: '26px 30px',
          maxWidth: 520,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 10, borderBottom: '2px solid var(--ink)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 13.5, fontWeight: 600 }}>{pref.entidad}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--ink-3)' }}>Tesorería — recibo de caja</p>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
            <p style={{ margin: 0 }}>0003-0041185</p>
            <p style={{ margin: '2px 0 0' }}>12/08/{ejercicio} 13:48</p>
          </div>
        </div>
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
          <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
            Contribuyente
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>
            {CONTRIBUYENTE.nombre} · {CONTRIBUYENTE.codigo}
          </p>
        </div>
        {lineas.map((l, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>
              {l.concepto}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{l.importe}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '13px 0 0' }}>
          <span style={{ flex: 1, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
            Total cobrado
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>{S(totalCobro)}</span>
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 11, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
          Cajero J. Cárdenas Vega · caja C-3. Conserve este comprobante: es el único documento que acredita el pago.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }} data-noprint="1">
          <button
            onClick={() => window.print()}
            className="hov-acento-2"
            style={{
              flex: 1,
              border: 0,
              borderRadius: 6,
              padding: '9px 14px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Imprimir recibo
          </button>
          <button
            onClick={() => {
              setReciboEmitido(false);
              toast('Listo para el siguiente contribuyente.');
            }}
            className="hov-linea"
            style={{
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              padding: '9px 14px',
              background: 'var(--bg-card)',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            Nuevo cobro
          </button>
        </div>
      </section>
    );
  };

  /* ══════════ CONVENIOS ══════════ */
  const fracCampos: DefCampo[] = [
    { k: 'fracTotal', l: 'Deuda a fraccionar', t: 'ro', v: S(totalDeudaFrac) },
    { k: 'cuotas', l: 'Nº de cuotas', t: 'text', v: '6', ayuda: 'Cambia el cronograma al escribir' },
    { k: 'inicial', l: 'Cuota inicial', t: 'sel', v: '20 %', o: ['0 %', '10 %', '20 %', '30 %', '50 %'] },
    { k: 'fracInicial', l: 'Importe de la inicial', t: 'ro', v: S(inicial) },
    { k: 'fracTasa', l: 'Interés mensual', t: 'ro', v: '0.80 %' },
    { k: 'fracPrimera', l: 'Primera cuota vence', t: 'date', v: '2026-11-30' },
    { k: 'garantia', l: 'Tipo de garantía', t: 'sel', v: 'NO REQUIERE', o: ['NO REQUIERE', 'CARTA FIANZA', 'HIPOTECA', 'AVAL', 'PRENDA'] },
    { k: 'convenio', l: 'Nº de convenio', t: 'ro', v: FRACCIONAMIENTO.convenio },
  ];

  const convenios = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={ENTRADILLA}>
        Fraccionar es simular antes de firmar. El cronograma se ve completo, con capital e interés cuota por cuota, y
        solo entonces se genera el convenio.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['fraccionar', 'Fraccionar deuda'],
            ['seguimiento', 'Convenios suscritos'],
          ] as const
        ).map((h) => {
          const on = hojaConv === h[0];
          return (
            <button key={h[0]} onClick={() => setHojaConv(h[0])} aria-pressed={on} className="hov-linea" style={PILDORA(on)}>
              {h[1]}
            </button>
          );
        })}
      </div>

      {hojaConv === 'fraccionar' && (
        <>
          <section style={TARJETA}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
                gap: '15px 16px',
                padding: '15px 16px 17px',
              }}
            >
              {fracCampos.map((f) => (
                <CampoDeclarado
                  key={f.k}
                  f={f}
                  texto={f.t === 'ro' ? String(f.v ?? '') : txt(f.k, String(f.v ?? ''))}
                  marcado={false}
                  onTexto={(v) => fijarVal(f.k, v)}
                  onMarca={(v) => fijarVal(f.k, v)}
                />
              ))}
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
              <span style={{ flex: 1, minWidth: 170, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Dos cuotas consecutivas impagas quiebran el convenio y devuelven la deuda a su fase original.
              </span>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                Cuota mensual
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>
                {S(cronograma.sumaCuota / nCuotas)}
              </span>
            </div>
          </section>

          <section style={TARJETA}>
            <div style={CABECERA}>
              <h2 style={H2}>Cronograma simulado</h2>
              <span style={META}>
                {nCuotas} {nCuotas === 1 ? 'cuota' : 'cuotas'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead>
                  <tr>{cabeceras(colsFrac)}</tr>
                </thead>
                <tbody>
                  {cronograma.filas.map((f) => (
                    <tr key={f[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                      {f.map((c, j) => (
                        <td key={j} style={estiloDeCelda(j, colsFrac)}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))',
                gap: 0,
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--line)',
              }}
            >
              {(
                [
                  ['Inicial', S(inicial), false],
                  ['Capital fraccionado', S(capitalFrac), false],
                  ['Interés total', S(cronograma.sumaInteres), false],
                  ['Total a pagar', S(inicial + cronograma.sumaCuota), true],
                ] as const
              ).map((t) => (
                <div key={t[0]} style={TOTAL_CELDA(t[2])}>
                  <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                    {t[0]}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              Simular no compromete nada. El convenio se crea al aceptar, y desde ahí la deuda queda acogida.
            </p>
            <button
              className="hov-linea"
              style={{
                border: '1px solid var(--line-2)',
                borderRadius: 6,
                padding: '10px 18px',
                background: 'var(--bg-card)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Imprimir simulación
            </button>
            <button
              onClick={() => {
                toast(`Convenio ${FRACCIONAMIENTO.convenio} generado en ${nCuotas} cuotas.`);
                setHojaConv('seguimiento');
              }}
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
              }}
            >
              Generar convenio
            </button>
          </div>
        </>
      )}

      {hojaConv === 'seguimiento' && (
        <section style={TARJETA}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={H2}>Convenios suscritos</h2>
            {ESTADOS_DE_CONVENIO.map((e) => {
              const on = estadoConv === e;
              return (
                <button
                  key={e}
                  onClick={() => setEstadoConv(e)}
                  aria-pressed={on}
                  style={{
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                    borderRadius: 999,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                    color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                  }}
                >
                  {e}
                </button>
              );
            })}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  {cabeceras(colsConv)}
                  <th style={{ padding: '10px 14px', background: 'var(--bg-elev)' }} />
                </tr>
              </thead>
              <tbody>
                {convFiltrados.map((f) => (
                  <tr key={f[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                    {f.map((c, j) =>
                      j === 8 ? (
                        <td key={j} style={{ padding: '11px 14px' }}>
                          <Insignia tono={tono(c)}>{c}</Insignia>
                        </td>
                      ) : (
                        <td key={j} style={estiloDeCelda(j, colsConv)}>
                          {c}
                        </td>
                      ),
                    )}
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() =>
                          toast(`Anular ${f[0]} devuelve S/ ${f[7]} a su fase original. Requiere resolución.`)
                        }
                        className="hov-linea"
                        style={{
                          border: '1px solid var(--line-2)',
                          borderRadius: 6,
                          padding: '6px 12px',
                          background: 'var(--bg-card)',
                          fontSize: 12,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Anular
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))',
              gap: 0,
              background: 'var(--bg-card)',
              borderTop: '1px solid var(--line)',
            }}
          >
            {(
              [
                ['Vigentes', '1,842', false],
                ['En riesgo', '141', false],
                [`Quebrados ${ejercicio}`, '88', false],
                ['Saldo por cobrar', 'S/ 4.21 M', true],
              ] as const
            ).map((t) => (
              <div key={t[0]} style={TOTAL_CELDA(t[2])}>
                <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                  {t[0]}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
              </div>
            ))}
          </div>
          <p style={NOTA_PIE}>
            Anular un convenio devuelve la deuda a su fase original y habilita la cobranza coactiva por el saldo. Es un
            acto con resolución, no una corrección de caja.
          </p>
        </section>
      )}
    </div>
  );

  /* ══════════ RECIBOS ══════════ */
  const anulCampos: DefCampo[] = [
    {
      k: 'motivoAnul',
      l: 'Motivo',
      t: 'sel',
      ancho: true,
      v: 'ERROR EN EL CONCEPTO COBRADO',
      o: [
        'ERROR EN EL CONCEPTO COBRADO',
        'ERROR EN EL IMPORTE',
        'ERROR EN EL CONTRIBUYENTE',
        'PAGO DUPLICADO',
        'DESISTIMIENTO DEL ADMINISTRADO',
        'FALLA DE IMPRESIÓN',
      ],
    },
    {
      k: 'autorizado',
      l: 'Autorizado por',
      t: 'sel',
      v: 'RESPONSABLE DE TESORERÍA',
      o: ['RESPONSABLE DE TESORERÍA', 'GERENTE DE ADMINISTRACIÓN TRIBUTARIA'],
    },
    { k: 'memo', l: 'Nº de memorando', t: 'text', v: 'MEM-0418-2026-MDC-T' },
    { k: 'devuelve', l: 'Devuelve la deuda', t: 'chk', v: true, ph: 'Restablece las obligaciones canceladas' },
    {
      k: 'detalleAnul',
      l: 'Detalle',
      t: 'area',
      ancho: true,
      v: 'Se cobró alcabala sobre el 100 % del predio cuando la transferencia fue del 50 %.',
    },
  ];

  const recibos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={ENTRADILLA}>
        Dos correcciones sobre el mismo objeto: reimprimir un recibo o dejarlo sin efecto. Se busca una vez y desde el
        recibo encontrado se hace lo que toque.
      </p>

      <section style={TARJETA}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: '14px 16px',
            padding: '15px 16px',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Nº de recibo</span>
            <input
              value={numeroDeRecibo}
              onChange={(e) => setNumeroDeRecibo(e.target.value)}
              placeholder="0003-0041182"
              style={IN}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Contribuyente</span>
            <input
              value={txt('recContrib', '')}
              onChange={(e) => fijarVal('recContrib', e.target.value)}
              placeholder="Nombre o código"
              style={IN}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Fecha</span>
            <input
              type="date"
              value={txt('recFecha', '2026-08-12')}
              onChange={(e) => fijarVal('recFecha', e.target.value)}
              style={IN}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Caja</span>
            <select value={txt('recCaja', 'C-3')} onChange={(e) => fijarVal('recCaja', e.target.value)} style={IN}>
              {['Todas', 'C-1', 'C-2', 'C-3', 'C-4'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>{cabeceras(colsRec)}</tr>
            </thead>
            <tbody>
              {RECIBOS.map((r) => {
                const celdas = [r.numero, r.fecha, r.hora, r.contribuyente, r.concepto, r.importe, r.dup, r.estado];
                return (
                  <tr
                    key={r.numero}
                    onClick={() => setNumeroDeRecibo(r.numero)}
                    className="hov-acento"
                    style={{
                      borderTop: '1px solid var(--line)',
                      cursor: 'pointer',
                      background: r.numero === rec.numero ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    {celdas.map((c, j) =>
                      j === 7 ? (
                        <td key={j} style={{ padding: '11px 14px' }}>
                          <Insignia tono={tono(c)}>{c}</Insignia>
                        </td>
                      ) : (
                        <td key={j} style={estiloDeCelda(j, colsRec)}>
                          {c}
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={TARJETA}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Recibo {rec.numero}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              {rec.contribuyente} · {rec.concepto}
            </p>
          </div>
          <Insignia tono={tono(rec.estado)}>{rec.estado}</Insignia>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
          {(
            [
              ['Emitido', `${rec.fecha} ${rec.hora}`],
              ['Caja y cajero', 'C-3 — J. CÁRDENAS VEGA'],
              ['Importe', `S/ ${rec.importe}`],
              ['Medio de pago', rec.medio],
              ['Duplicados emitidos', rec.dup],
              ['Estado', rec.estado],
            ] as const
          ).map((d) => (
            <div
              key={d[0]}
              style={{
                background: 'var(--bg-card)',
                padding: '13px 16px',
                borderLeft: '1px solid var(--line)',
                borderTop: '1px solid var(--line)',
                margin: '-1px 0 0 -1px',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                {d[0]}
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', textWrap: 'pretty' }}>
                {d[1]}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
          {(
            [
              ['duplicado', 'Reimprimir duplicado'],
              ['anulacion', 'Anular el recibo'],
            ] as const
          ).map((a) => {
            const on = actoRecibo === a[0];
            return (
              <button
                key={a[0]}
                onClick={() => setActoRecibo(a[0])}
                aria-pressed={on}
                style={{
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                  borderRadius: 999,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: on ? 600 : 400,
                  background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                  color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                }}
              >
                {a[1]}
              </button>
            );
          })}
        </div>

        {esAnulacion && (
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <p style={{ margin: 0, padding: '13px 16px 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: '80ch', textWrap: 'pretty' }}>
              Anular devuelve la deuda a la cuenta corriente y solo procede mientras la caja del turno siga abierta.
              Requiere autorización del responsable de tesorería.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
                gap: '15px 16px',
                padding: '14px 16px 17px',
              }}
            >
              {anulCampos.map((f) => (
                <CampoDeclarado
                  key={f.k}
                  f={f}
                  texto={txt(f.k, typeof f.v === 'string' ? f.v : '')}
                  marcado={marca(f.k, f.v === true)}
                  onTexto={(v) => fijarVal(f.k, v)}
                  onMarca={(v) => fijarVal(f.k, v)}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)' }}>
          <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {esAnulacion
              ? yaAnulado
                ? 'Este recibo ya está anulado. La deuda volvió a la cuenta corriente el 12/08/2026.'
                : 'Al anular, el recibo queda sin efecto y la deuda vuelve a estar pendiente.'
              : 'El duplicado sale marcado como tal y queda registrado en la bitácora con tu usuario.'}
          </p>
          <button
            onClick={() => {
              if (esAnulacion && yaAnulado) {
                toast(`El recibo ${rec.numero} ya estaba anulado.`);
                return;
              }
              toast(
                esAnulacion
                  ? `Recibo ${rec.numero} anulado. Deuda devuelta a la cuenta corriente.`
                  : `Duplicado del recibo ${rec.numero} enviado a la impresora.`,
              );
            }}
            aria-disabled={esAnulacion && yaAnulado}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '11px 22px',
              background: esAnulacion ? 'var(--error-texto)' : 'var(--accent)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
              opacity: esAnulacion && yaAnulado ? 0.55 : 1,
            }}
          >
            {esAnulacion ? 'Anular recibo' : 'Imprimir duplicado'}
          </button>
        </div>
      </section>
    </div>
  );

  /* ══════════ CIERRE DE CAJA ══════════ */
  const cierreCampos: DefCampo[] = [
    { k: 'caja', l: 'Caja', t: 'ro', v: 'C-3' },
    { k: 'cajero', l: 'Cajero', t: 'ro', v: 'J. CÁRDENAS VEGA' },
    { k: 'turno', l: 'Turno', t: 'sel', v: 'MAÑANA', o: ['MAÑANA', 'TARDE', 'CONTINUO'] },
    { k: 'apertura', l: 'Hora de apertura', t: 'ro', v: '08:00' },
    { k: 'cierreHora', l: 'Hora de cierre', t: 'text', v: '13:30' },
    { k: 'obsArqueo', l: 'Observaciones del arqueo', t: 'area', ancho: true, ph: 'Obligatorio si la diferencia no es cero' },
  ];

  const cierre = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={ENTRADILLA}>
        El arqueo es lo único del módulo que no admite «lo veo mañana». Se declara lo que hay por medio de pago, el
        sistema pone lo que registró, y la diferencia se calcula sola.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '15px 17px',
          border: `1px solid ${cuadra ? 'var(--line-2)' : 'var(--warn-fg)'}`,
          borderLeft: `3px solid ${cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)'}`,
          borderRadius: 10,
          background: cuadra ? 'var(--ok-bg)' : 'var(--warn-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              flex: '0 0 auto',
              background: 'var(--bg-card)',
              color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)',
            }}
          >
            <Icono d={cuadra ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5v6M12 17h.02']} tam={18} grosor={2.2} />
          </span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
              {cuadra ? 'El arqueo cuadra' : 'El arqueo no cuadra'}
            </p>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)',
                textWrap: 'pretty',
              }}
            >
              {cuadra
                ? 'Lo declarado coincide con lo que registró el sistema. Se puede cerrar la caja.'
                : `Hay ${difTotal > 0 ? 'un sobrante' : 'un faltante'} de ${S(Math.abs(difTotal))}. Revisa el medio de pago marcado antes de cerrar; un cierre descuadrado necesita acta y visto del responsable.`}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.11em', color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
              Diferencia
            </p>
            <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-mono)', fontSize: 24, color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
              {(difTotal > 0 ? '+' : difTotal < 0 ? '−' : '') + S(Math.abs(difTotal))}
            </p>
          </div>
        </div>
      </div>

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>Arqueo por medio de pago</h2>
          <span style={META}>Caja C-3 · turno mañana · 12/08/{ejercicio}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ ...TH, whiteSpace: undefined }}>Medio de pago</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Registrado por el sistema</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Declarado en el arqueo</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {arqueoFilas.map((r) => (
                <tr
                  key={r.m.k}
                  style={{ borderTop: '1px solid var(--line)', background: r.cuadra ? 'transparent' : 'var(--warn-bg)' }}
                >
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    {r.m.label}
                  </td>
                  <td
                    style={{
                      padding: '11px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      color: 'var(--ink-3)',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {S(r.m.sistema)}
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                    <input
                      value={arqueo[r.m.k]}
                      onChange={(e) => setArqueo((x) => ({ ...x, [r.m.k]: e.target.value }))}
                      aria-label={`Declarado en ${r.m.label}`}
                      style={{
                        width: 130,
                        boxSizing: 'border-box',
                        border: `1px solid ${r.cuadra ? 'var(--line-2)' : 'var(--warn-fg)'}`,
                        borderRadius: 6,
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        textAlign: 'right',
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: '11px 14px',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      fontWeight: r.cuadra ? 400 : 600,
                      color: r.cuadra ? 'var(--ink-4)' : 'var(--warn-fg)',
                    }}
                  >
                    {r.cuadra ? '0.00' : (r.dif > 0 ? '+' : '') + r.dif.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--ink-3)', background: 'var(--bg-elev)' }}>
                <td style={{ padding: '13px 14px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Total del turno</td>
                <td style={{ padding: '13px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>
                  {S(sistemaTotal)}
                </td>
                <td style={{ padding: '13px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', textAlign: 'right' }}>
                  {S(declaradoTotal)}
                </td>
                <td
                  style={{
                    padding: '13px 14px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: cuadra ? 'var(--ok-fg)' : 'var(--warn-fg)',
                  }}
                >
                  {(difTotal > 0 ? '+' : '') + difTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
            gap: '15px 16px',
            padding: '15px 16px 17px',
            borderTop: '1px solid var(--line)',
          }}
        >
          {cierreCampos.map((f) => (
            <CampoDeclarado
              key={f.k}
              f={f}
              texto={f.t === 'ro' ? String(f.v ?? '') : txt(f.k, typeof f.v === 'string' ? f.v : '')}
              marcado={false}
              onTexto={(v) => fijarVal(f.k, v)}
              onMarca={(v) => fijarVal(f.k, v)}
            />
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
          {cuadra
            ? 'Al cerrar, la caja deja de aceptar cobros y anulaciones del turno. 148 recibos quedan en el arqueo.'
            : 'No se puede cerrar con diferencia. Corrige lo declarado o registra el faltante con acta y autorización.'}
        </p>
        <button
          onClick={() => {
            const a = { ...arqueo };
            MEDIOS.forEach((m) => {
              a[m.k] = m.sistema.toFixed(2);
            });
            setArqueo(a);
            toast('Declarado igualado a lo registrado por el sistema.');
          }}
          className="hov-linea"
          style={{
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            padding: '10px 18px',
            background: 'var(--bg-card)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Copiar del sistema
        </button>
        <button
          className="hov-linea"
          style={{
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            padding: '10px 18px',
            background: 'var(--bg-card)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Imprimir arqueo
        </button>
        <button
          onClick={() =>
            toast(cuadra ? `Caja C-3 cerrada. Arqueo por ${S(declaradoTotal)}.` : `El arqueo no cuadra: falta ${S(Math.abs(difTotal))}.`)
          }
          aria-disabled={!cuadra}
          style={{
            border: 0,
            borderRadius: 6,
            padding: '11px 22px',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: cuadra ? 1 : 0.55,
          }}
        >
          Cerrar caja
        </button>
      </div>
    </div>
  );

  /* ══════════ RECAUDACIÓN ══════════ */
  const recaudacion = () => {
    const esAvance = recTab === 0;
    const cols = esAvance ? colsAvance : colsArea;
    const filas: string[][] = esAvance
      ? AVANCE.map((f) => [f[0], f[1], f[2], f[3], `${f[4].toFixed(1)} %`])
      : POR_AREA.map((f) => [f[0], f[1], f[2], f[3]]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={ENTRADILLA}>
          Dos lecturas del mismo dinero: por tributo, para saber qué se cobra y qué no; y por área, para el reporte
          mensual a la gerencia.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
          {['Avance por tributo', 'Por área generadora'].map((l, i) => {
            const on = recTab === i;
            return (
              <button
                key={l}
                onClick={() => setRecTab(i)}
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
          {(esAvance
            ? ([
                ['Emitido', 'S/ 23.73 M', false],
                ['Recaudado', 'S/ 18.42 M', false],
                ['Saldo por cobrar', 'S/ 5.30 M', false],
                ['Avance', '77.6 %', true],
              ] as const)
            : ([
                ['Partidas', '6', false],
                ['Áreas generadoras', '2', false],
                ['Recaudado', 'S/ 14.03 M', false],
                ['Mayor partida', 'Predial', true],
              ] as const)
          ).map((t) => (
            <div key={t[0]} style={TOTAL_CELDA(t[2])}>
              <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                {t[0]}
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
            </div>
          ))}
        </div>

        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>{esAvance ? 'Emitido contra recaudado' : 'Recaudación por partida y área generadora'}</h2>
            <span style={META}>{esAvance ? `Ejercicio ${ejercicio} al 13/08` : '6 partidas'}</span>
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: esAvance ? 760 : 740 }}>
              <thead>
                <tr>{cabeceras(cols)}</tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f[0] + f[1]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                    {f.map((c, j) => (
                      <td key={j} style={estiloDeCelda(j, cols)}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={NOTA_PIE}>
            {esAvance
              ? 'El saldo por cobrar de multas y papeletas es casi la mitad del total pendiente del ejercicio.'
              : 'El área generadora es la que produjo el ingreso, no la que lo cobró: todo se cobra en tesorería.'}
          </p>
        </section>
      </div>
    );
  };

  /* ══════════ LA BARRA DE COBRO ══════════
     Vive pegada al fondo mientras hay algo que cobrar. Los márgenes negativos
     la sacan del acolchado de `main` para que ocupe el ancho entero, que es
     donde el artboard la dibuja: fuera de la columna de 1240 px. */
  const barra = () => {
    const cifras = esTributaria
      ? ([
          ['Deuda total', S(deudaTotal), 'var(--ink-3)', '1'],
          ['Deuda acogida', S(acogida), 'var(--ink)', '0'],
          ['Beneficio', descuento > 0 ? '− ' + S(descuento) : 'S/ 0.00', descuento > 0 ? 'var(--ok-fg)' : 'var(--ink-4)', '0'],
        ] as const)
      : ([
          ['Conceptos', String(nTasas), 'var(--ink)', '0'],
          ['Subtotal', S(totalTasas), 'var(--ink)', '0'],
          ['Descuentos', 'S/ 0.00', 'var(--ink-4)', '1'],
        ] as const);
    return (
      <div
        data-noprint="1"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 38,
          marginTop: 'auto',
          marginLeft: -20,
          marginRight: -20,
          marginBottom: -96,
          borderTop: '1px solid var(--line-2)',
          background: 'var(--bg-card)',
          boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            padding: '12px 20px',
          }}
        >
          {cifras.map((c) => (
            <span key={c[0]} data-sm-hide={c[3]} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
                {c[0]}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: c[2] }}>{c[1]}</span>
            </span>
          ))}
          <span style={{ flex: 1, minWidth: 20 }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
              Total a cobrar
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--ink)' }}>{S(totalCobro)}</span>
          </span>
          <button
            onClick={() => {
              if (nSel === 0) {
                toast('Marca al menos una línea para cobrar.');
                return;
              }
              setReciboEmitido(true);
              toast(`Cobrado ${S(totalCobro)}. Recibo 0003-0041185 emitido.`);
            }}
            aria-disabled={nSel === 0}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '13px 26px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 500,
              cursor: 'pointer',
              flex: '0 0 auto',
              opacity: nSel === 0 ? 0.55 : 1,
            }}
          >
            {nSel === 0 ? 'Cobrar' : `Cobrar ${S(totalCobro)}`}
          </button>
        </div>
      </div>
    );
  };

  const cuerpo: ReactNode =
    dest === 'panel'
      ? panel()
      : dest === 'cobrar'
        ? cobrar()
        : dest === 'convenios'
          ? convenios()
          : dest === 'recibos'
            ? recibos()
            : dest === 'cierre'
              ? cierre()
              : recaudacion();

  return (
    <Shell
      modulo="tesoreria"
      dest={dest}
      onDest={onDest}
      miga={['Tesorería', titulo]}
      titulo={titulo}
      contexto={
        hayContexto
          ? {
              codigo: CONTRIBUYENTE.codigo,
              titular: CONTRIBUYENTE.nombre,
              ubic: `${CONTRIBUYENTE.documento} · ${CONTRIBUYENTE.direccion} · deuda total ${S(deudaTotal)}`,
              /* «Cambiar» no es volver: es salir de este sujeto y buscar otro,
                 y el artboard lo pone pegado a la derecha de la barra. */
              derecha: (
                <button
                  onClick={() => toast('Se abriría la búsqueda de contribuyente.')}
                  className="hov-linea"
                  style={{
                    border: '1px solid var(--line-2)',
                    borderRadius: 6,
                    background: 'var(--bg-elev)',
                    padding: '5px 11px',
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    cursor: 'pointer',
                  }}
                >
                  Cambiar
                </button>
              ),
            }
          : undefined
      }
      /* El turno de caja: todo lo que se hace en Tesorería ocurre dentro de uno
         abierto, así que el panel lo enseña siempre. El filete se pone de aviso
         cuando el arqueo declarado no cuadra con lo que dice el sistema. */
      tarjeta={
        <div
          style={{
            border: `1px solid ${cuadra ? 'var(--line-2)' : 'var(--warn-fg)'}`,
            borderRadius: 8,
            padding: '11px 12px',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok-fg)' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--ok-fg)',
              }}
            >
              Caja abierta
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{S(sistemaTotal)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>148 recibos · 3 anulados · desde las 08:00</p>
        </div>
      }
      paleta={paleta}
    >
      {/* La columna ocupa el alto de `main` para que la barra de cobro caiga al
          fondo de la pantalla —donde el artboard la dibuja, fuera de `main`— y
          no justo debajo de la tabla cuando la pantalla es corta. */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {cuerpo}
        </div>
        {dest === 'cobrar' && !reciboEmitido && barra()}
      </div>
    </Shell>
  );
}
