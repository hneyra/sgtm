import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type Contexto, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import {
  altaDeDeuda,
  bajaDeDeuda,
  buscarContribuyentes,
  indicadores,
  ultimaCorridaPredial,
  transferirPredio,
  transferirVehiculo,
} from '../../api/rentas';
import { listarPredios } from '../../api/catastro';
import { ErrorDeApi } from '../../api/cliente';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  CAMPOS_DEL_ALTA,
  CAMPOS_DE_LA_BAJA,
  COLS_DE_LA_BAJA,
  DEFECTOS,
  DETERMINACIONES,
  DEUDA_DEL_TRANSFERENTE,
  DJ_COLS,
  DJ_FILAS,
  DJ_META,
  DJ_TOTALES,
  EXPEDIENTE,
  FILAS_DE_LA_BAJA,
  OPCIONES_DE_RENTAS,
  RESUMEN_DEL_EXPEDIENTE,
  TIPOS_DE_DETERMINACION,
  TRANSFERENCIAS,
  type CampoDef,
  type ClaveDeDeterminacion,
  type ClaveDeTransferencia,
  type ColDef,
  type TablaDef,
} from '../../datos/rentas';

/* ══════════ Los estilos que el artboard declara una vez y repite ══════════
   `IN`, `TH`, `THN`, `TD`, `TDN` y `TD1` son literalmente las constantes del
   script de `Rentas.dc.html`: el control de formulario y las seis formas de
   celda. No son las del design system —el módulo dibuja sus tablas más
   apretadas que la tabla común— así que van a mano, como manda PORTAR.md. */

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
const COLUMNA: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const REJILLA_DE_CAMPOS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))',
  gap: '15px 16px',
  padding: '15px 16px 17px',
};
const BOTON_SECUNDARIO: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '10px 18px',
  background: 'var(--bg-card)',
  fontSize: 13,
  cursor: 'pointer',
};
const BOTON_PRIMARIO: CSSProperties = {
  border: 0,
  borderRadius: 6,
  padding: '11px 22px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
};
const BOTON_DE_TABLA: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '6px 12px',
  background: 'var(--bg-elev)',
  fontSize: 12,
  color: 'var(--ink-2)',
  cursor: 'pointer',
};

/** La pastilla de conmutación: los seis tipos de determinación, los dos tipos
 *  de transferencia y las dos hojas de movimiento de deuda la comparten. */
const pastilla = (on: boolean): CSSProperties => ({
  border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
  borderRadius: 999,
  padding: '7px 15px',
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: on ? 600 : 400,
  background: on ? 'var(--accent)' : 'var(--bg-card)',
  color: on ? '#fff' : 'var(--ink-2)',
});

/** La celda de un cuadro de totales. El divisor va en la celda, no en el `gap`:
 *  con `auto-fit` la última fila puede quedar incompleta y un `gap` sobre fondo
 *  `--line` dejaría ver el fondo desnudo donde no hay celda. */
const celdaDeTotal = (destacado: boolean): CSSProperties => ({
  background: destacado ? 'var(--accent-soft)' : 'var(--bg-card)',
  padding: '14px 16px',
  borderLeft: '1px solid var(--line)',
  borderTop: '1px solid var(--line)',
  margin: '-1px 0 0 -1px',
});

const caret = (abierta: boolean): CSSProperties => ({
  display: 'grid',
  placeItems: 'center',
  width: 20,
  height: 20,
  color: 'var(--ink-4)',
  flex: '0 0 auto',
  transform: `rotate(${abierta ? '0' : '-90'}deg)`,
  transition: 'transform .15s ease',
});

const CARET: readonly string[] = ['M6 9l6 6 6-6'];

/** El importe con coma de miles vuelto número: las cifras del artboard llegan
 *  escritas, y los totales derivados se suman sobre ellas. */
const numero = (t: string) => {
  const n = Number(String(t).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/* ══════════ Piezas del artboard ══════════ */

function CampoDeFormulario({
  f,
  valor,
  onCambio,
}: {
  f: CampoDef;
  valor: string | boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const texto = typeof valor === 'boolean' ? '' : valor;
  return (
    <label data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>

      {(f.t === undefined || f.t === 'text') && (
        <input value={texto} onChange={(e) => onCambio(e.target.value)} placeholder={f.ph} style={IN} />
      )}
      {f.t === 'date' && <input type="date" value={texto} onChange={(e) => onCambio(e.target.value)} style={IN} />}
      {f.t === 'sel' && (
        <select value={texto} onChange={(e) => onCambio(e.target.value)} style={IN}>
          {(f.o ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {f.t === 'area' && (
        <textarea
          value={texto}
          onChange={(e) => onCambio(e.target.value)}
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
      {f.t === 'chk' && (
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

/** La tabla de datos del módulo: la primera columna destaca, las numéricas van
 *  en mono a la derecha. */
function TablaDeDatos({ cols, filas, min }: { cols: ColDef[]; filas: string[][]; min: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c[0]} style={c[1] ? THN : TH}>
                {c[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
              {r.map((celda, j) => (
                <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueDeTabla({ tabla, onAnadir }: { tabla: TablaDef; onAnadir: () => void }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
        <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{tabla.titulo}</p>
        <span style={META}>{tabla.conteo}</span>
        {tabla.accion && (
          <button onClick={onAnadir} className="hov-linea" style={BOTON_DE_TABLA}>
            {tabla.accion}
          </button>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <TablaDeDatos cols={tabla.cols} filas={tabla.filas} min={tabla.min} />
      </div>
      {tabla.nota && <p style={PIE}>{tabla.nota}</p>}
    </div>
  );
}

/** La cabecera pulsable de una sección plegable. */
function Cabecera({
  abierta,
  onToggle,
  label,
  hint,
  marca,
}: {
  abierta: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
  marca?: ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={abierta}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        width: '100%',
        border: 0,
        background: 'transparent',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={caret(abierta)}>
        <Icono d={CARET} tam={13} grosor={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{hint}</span>
      </span>
      {marca !== undefined && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{marca}</span>
      )}
    </button>
  );
}

/* ══════════ El módulo ══════════ */

export default function Rentas({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const modulo = moduloDe('rentas');

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [sucio, setSucio] = useState(false);
  const [cerradas, setCerradas] = useState<Record<string, boolean>>({});
  const [sujeto, setSujeto] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [paginaPadron, setPaginaPadron] = useState(0);

  /**
   * El padrón, contra `GET /api/v1/rentas/contribuyentes`.
   *
   * Un solo campo para cuatro filtros: lo tecleado se manda por `dNI` si son
   * ocho dígitos, por `rUC` si son once, por `codigo` si es todo dígitos, y por
   * `nombreRazonSocial` en cualquier otro caso. Es lo que el buscador del
   * artboard promete —«Nombre, DNI, RUC, código»— y el backend no tiene un
   * campo único que lo haga.
   */
  const criterio = useRebote(q.trim());
  useEffect(() => setPaginaPadron(0), [criterio]);
  const padron = useRecurso(
    (senal) => buscarContribuyentes(filtroDelPadron(criterio), { pagina: paginaPadron, tamano: 20 }, senal),
    [criterio, paginaPadron],
    dest === 'padron' && sujeto === null,
  );
  const filasDelPadron = padron.datos?.contenido ?? [];
  const cargando = padron.cargando;
  const vacio = !padron.cargando && padron.error === null && padron.datos !== null && filasDelPadron.length === 0;
  const [tipo, setTipo] = useState<ClaveDeDeterminacion>('predial');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [trTipo, setTrTipo] = useState<ClaveDeTransferencia>('predio');
  const [trPaso, setTrPaso] = useState(0);
  const [hoja, setHoja] = useState<'alta' | 'baja'>('alta');
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false, 3: false });
  const [dj, setDj] = useState<Record<string, boolean>>({ HR: true, PU: true, PR: false });

  /* El expediente se abre sobre el destino «Contribuyentes», como en el
     artboard. Al cambiar de destino se suelta el sujeto, salvo cuando es la
     propia navegación la que lo trae —la paleta abre el expediente—. */
  const sujetoAlLlegar = useRef<string | null>(null);
  useEffect(() => {
    if (sujetoAlLlegar.current) {
      setSujeto(sujetoAlLlegar.current);
      sujetoAlLlegar.current = null;
    } else {
      setSujeto(null);
    }
  }, [dest]);

  const esNuevo = dest === 'alta';
  useEffect(() => {
    if (esNuevo) {
      setCerradas({});
      toast('Expediente nuevo: seis secciones, la primera abierta.');
    }
  }, [esNuevo, toast]);

  const abrirExpediente = (codigo: string) => {
    setSucio(false);
    if (dest === 'padron') setSujeto(codigo);
    else {
      sujetoAlLlegar.current = codigo;
      onDest('padron');
    }
  };

  const set = (k: string, v: string | boolean) => {
    setVals((s) => ({ ...s, [k]: v }));
    setSucio(true);
  };
  const valorDe = (f: CampoDef): string | boolean => {
    const v = vals[f.k];
    if (v !== undefined) return v;
    if (f.v !== undefined) return f.v;
    const d = DEFECTOS[f.k];
    return d === undefined ? '' : d;
  };
  const texto = (k: string) => String(vals[k] ?? DEFECTOS[k] ?? '');
  const campo = (f: CampoDef) => <CampoDeFormulario key={f.k} f={f} valor={valorDe(f)} onCambio={(v) => set(f.k, v)} />;

  const plegable = (clave: string, abiertaPorDefecto: boolean) => {
    const cerrada = cerradas[clave];
    const abierta = cerrada === undefined ? abiertaPorDefecto : !cerrada;
    return { abierta, toggle: () => setCerradas((s) => ({ ...s, [clave]: abierta })) };
  };

  const det = DETERMINACIONES[tipo];
  const trDef = TRANSFERENCIAS[trTipo];
  const paso = Math.min(trPaso, trDef.pasos.length - 1);
  const pasoActual = trDef.pasos[paso];

  const [registrando, setRegistrando] = useState(false);

  /* ── El panel ─────────────────────────────────────────────────
     No hay «panel de Rentas» en el contrato: el unico panel es el de
     recaudacion, que es el de Inicio (ARQ-01 §3.13). De ahi sale el avance de
     cobranza; el censo del padron, de su propia lectura; y el embudo, de la
     ultima corrida masiva, que hoy no existe. */
  const enPanel = dest === 'panel';
  const censoDelPadron = useRecurso((s2) => buscarContribuyentes({}, { tamano: 1 }, s2), [], enPanel);
  const kpisDeRecaudacion = useRecurso((s2) => indicadores(pref.ejercicio, s2), [pref.ejercicio], enPanel);
  const corrida = useRecurso((s2) => ultimaCorridaPredial(s2), [], enPanel);
  /* La observación del acto. El manual no le dibuja campo y toda escritura la
     exige (regla 10), así que es un control añadido con su propio rótulo. */
  const [observacionDelActo, setObservacionDelActo] = useState('');

  /**
   * Registra la transferencia contra el backend.
   *
   * El `predioId` **no se teclea**: la pantalla pide el código predial y aquí se
   * resuelve contra el padrón, que es lo que su propia ayuda promete. Si el
   * código no existe, se dice —y no se manda una transferencia sobre ningún
   * predio—.
   */
  const registrarTransferencia = async () => {
    setRegistrando(true);
    try {
      const esPredio = trTipo === 'predio';
      /* El formulario del manual pide el DOCUMENTO de cada parte y el backend
         quiere su CODIGO de contribuyente. Resolverlo aquí es lo que evita el
         404 sobre una persona que sí está en el padrón —el mismo defecto que
         #427 encontró con «Solicitante»—. */
      const adquiriente = await codigoDelContribuyente(texto(esPredio ? 'adDoc' : 'vAdDoc'));
      if (adquiriente === null) {
        toast('Ese documento de adquirente no está en el padrón de contribuyentes.');
        return;
      }

      if (esPredio) {
        const transferente = await codigoDelContribuyente(texto('trDoc'));
        if (transferente === null) {
          toast('Ese documento de transferente no está en el padrón de contribuyentes.');
          return;
        }
        const codigo = texto('codPredial').trim();
        const encontrados = await listarPredios({ codRefCatastral: codigo }, { tamano: 2 });
        const exacto = encontrados.contenido.find((x) => x.codRefCatastral === codigo);
        if (!exacto) {
          toast(`No hay ningún predio con el código ${codigo} en el padrón.`);
          return;
        }
        await transferirPredio({
          observacion: observacionDelActo.trim(),
          predioId: exacto.predioId,
          codTransferente: transferente,
          codAdquiriente: adquiriente,
          tipoTransferencia: texto('tipoActo'),
          fechaTransferencia: texto('fechaActo'),
          valorTransferencia: texto('valorTransf'),
          porcentajeTransferido: texto('pctTransf'),
          afectaAlcabala: texto('genAlcabala') !== 'No',
          documentoOrigen: texto('minuta'),
        });
      } else {
        await transferirVehiculo({
          observacion: observacionDelActo.trim(),
          placa: texto('vPlaca').trim(),
          codAdquiriente: adquiriente,
          tipoTransferencia: texto('vTipo'),
          fechaTransferencia: texto('vFecha'),
          valorTransferencia: texto('vValor'),
          afectaAlcabala: true,
          documentoOrigen: texto('vNumDoc'),
        });
      }
      setTrPaso(0);
      setObservacionDelActo('');
      toast('Transferencia registrada.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar la transferencia.');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Da de alta o de baja una cuota, contra `POST /rentas/deuda/{altas,bajas}`.
   *
   * **Una cuota por acto.** El formulario del manual pide un rango y el `record`
   * del backend declara `cuota` en singular; `cuotaDesde`/`cuotaHasta` no están
   * en su lista blanca, así que Jackson los descartaría sin decir nada y el
   * asiento quedaría con `periodo: 0`. Se manda «Cuota desde» y se dice en
   * pantalla que el rango no viaja.
   */
  const moverDeuda = async () => {
    setRegistrando(true);
    try {
      const contribuyente = await codigoDelContribuyente(texto('altaDoc'));
      const cuerpo = {
        observacion: observacionDelActo.trim(),
        codContribuyente: contribuyente ?? texto('altaDoc').trim(),
        tributo: texto('altaConcepto'),
        ano: texto('altaAnio'),
        cuota: Number.parseInt(texto('altaCuotaD') || '1', 10) || 1,
        insoluto: texto('altaInsoluto') || undefined,
        reajuste: texto('altaReajuste') || undefined,
        interes: texto('altaInteres') || undefined,
        gasto: texto('altaGastos') || undefined,
        documentoOrigen: texto('altaNumDoc') || undefined,
      };
      if (hoja === 'alta') await altaDeDeuda(cuerpo);
      else await bajaDeDeuda(cuerpo);
      setSucio(false);
      setObservacionDelActo('');
      toast(hoja === 'alta' ? 'Alta registrada en la cuenta corriente.' : 'Baja registrada.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar el movimiento.');
    } finally {
      setRegistrando(false);
    }
  };

  /* Los cuatro indicadores del panel. Dos los sostiene una lectura; los otros
     dos salen «—» diciendo que falta, en vez de una cifra inventada. */
  const avanceDeCobranza = kpisDeRecaudacion.datos?.kpis.find((k) => k.label === 'Avance de cobranza');
  const kpisDelPanel = [
    {
      valor: censoDelPadron.cargando
        ? '…'
        : censoDelPadron.datos
          ? censoDelPadron.datos.totalElementos.toLocaleString('es-PE')
          : '—',
      etiqueta: 'Contribuyentes en el padrón',
      nota: 'Los que hay hoy, activos y de baja.',
    },
    {
      /* «Predial determinado» no lo publica ningún KPI: el panel de recaudación
         da recaudado, cartera y avance, no lo determinado por tributo. */
      valor: '—',
      etiqueta: `Predial determinado ${pref.ejercicio}`,
      nota: 'Ninguna lectura publica lo determinado por tributo.',
    },
    {
      valor: corrida.datos ? String(corrida.datos.observados) : '—',
      etiqueta: 'Observados sin emisión',
      nota: corrida.datos ? 'De la última corrida masiva.' : 'No hay ninguna corrida masiva todavía.',
    },
    {
      valor: avanceDeCobranza?.value ?? '—',
      etiqueta: 'Recaudado del emitido',
      nota: avanceDeCobranza?.note ?? 'Del panel de recaudación.',
    },
  ];

  /**
   * El embudo de la emisión.
   *
   * `CorridaPredialResource.Etapa` publica `(etapa, registros, monto,
   * observados, estado)` y **no `pct`**: la barra de avance del artboard no
   * tiene origen, así que se dibuja sobre los registros de la etapa mayor. Y
   * las etiquetas son las del backend —tres—, no las cinco del prototipo:
   * ninguna de las cinco coincide letra por letra con ninguna de las tres, y
   * traducirlas sería inventar el mapeo.
   */
  const etapasDeLaEmision = (() => {
    const etapas = corrida.datos?.etapas ?? [];
    if (etapas.length === 0) return [];
    const mayor = Math.max(...etapas.map((e) => e.registros), 1);
    return etapas.map((e) => ({
      etapa: e.etapa,
      pct: Math.round((e.registros / mayor) * 100),
      registros: e.registros.toLocaleString('es-PE'),
      estado: e.estado,
      tono: e.observados > 0 ? 'warn' : 'ok',
    }));
  })();

  const esExpediente = (dest === 'padron' && sujeto !== null) || esNuevo;
  const esDeuda = dest === 'deuda';

  /* Cifras derivadas: la suma de lo marcado para la baja y el total del alta
     salen de las mismas filas y de los mismos campos que se ven en pantalla. */
  const marcadasDeLaBaja = FILAS_DE_LA_BAJA.filter((_, i) => marcadas[i] === true);
  const bajaSuma = marcadasDeLaBaja.reduce((a, f) => a + numero(f[6]), 0);
  const altaInsoluto = numero(texto('altaInsoluto'));
  const altaReajuste = numero(texto('altaReajuste'));
  const altaInteres = numero(texto('altaInteres'));
  const altaGastos = numero(texto('altaGastos'));
  const altaTotal = altaInsoluto + altaReajuste + altaInteres + altaGastos;
  const deudaDelTransferente = DEUDA_DEL_TRANSFERENTE.reduce((a, x) => a + x.monto, 0);

  const etiquetaDelDestino = modulo.destinos.find((x) => x.k === dest)?.label ?? 'Rentas';

  const miga = esNuevo
    ? ['Rentas', 'Contribuyentes', 'Nuevo']
    : esExpediente
      ? ['Rentas', 'Contribuyentes', String(DEFECTOS.codigo)]
      : dest === 'reporte'
        ? ['Rentas', 'Documentos']
        : ['Rentas', etiquetaDelDestino];

  const titulo = esNuevo
    ? 'Nuevo contribuyente'
    : esExpediente
      ? 'Suc. Rufina Medina Medina'
      : dest === 'reporte'
        ? 'Declaración jurada'
        : dest === 'determinar'
          ? det.label
          : etiquetaDelDestino;

  const contexto: Contexto | undefined =
    esExpediente && !esNuevo
      ? {
          volver: { label: 'Padrón', onClick: () => setSujeto(null) },
          codigo: String(DEFECTOS.codigo),
          titular: 'SUC. RUFINA MEDINA MEDINA',
          ubic: 'DNI 03593174 · 2 predios · 003 pequeño contribuyente',
          estado: sucio ? 'Cambios sin guardar' : 'Guardado · última edición 12/08/2026',
          estadoColor: sucio ? 'var(--warn-fg)' : 'var(--ok-fg)',
        }
      : esDeuda
        ? {
            volver: { label: 'Padrón', onClick: () => onDest('padron') },
            codigo: '00000006550',
            titular: 'DÍAZ MADRID, JULIO CÉSAR',
            ubic: 'Deuda al 31/08/2026',
            estado: 'S/ 9,412.15 pendientes',
            estadoColor: 'var(--bad-fg)',
          }
        : undefined;

  const paleta: EntradaDePaleta[] = OPCIONES_DE_RENTAS.map((o) => ({
    label: o[0],
    nota: 'Rentas',
    ir: () => (o[1] === 'expediente' ? abrirExpediente(String(DEFECTOS.codigo)) : onDest(o[1])),
  }));

  return (
    <Shell modulo="rentas" dest={dest} onDest={onDest} miga={miga} titulo={titulo} contexto={contexto} paleta={paleta}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Rentas convierte lo que Catastro registró en una obligación de pago: quién debe, por qué unidad, cuánto y en qué cuotas. Todo
              cuelga del contribuyente; el resto son actos que se le aplican.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={H2}>Estado de la emisión {pref.ejercicio}</h2>
                <span style={META}>{corrida.datos ? `${corrida.datos.etapas.length} etapas` : 'sin corridas'}</span>
              </div>
              {etapasDeLaEmision.length === 0 && (
                <p style={{ margin: 0, padding: '16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  No hay ninguna corrida masiva del predial todavía, así que no hay emisión que seguir. El embudo aparece cuando se lance
                  la primera; dibujarlo ahora con ceros se leería como una corrida que salió vacía.
                </p>
              )}
              {etapasDeLaEmision.map((e) => (
                <div key={e.etapa} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: '0 0 210px', fontSize: 13, color: 'var(--ink)' }}>{e.etapa}</span>
                  <span style={{ flex: 1, minWidth: 60, height: 6, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${e.pct}%`, background: 'var(--accent)', borderRadius: 999 }} />
                  </span>
                  <span style={{ flex: '0 0 88px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                    {e.registros}
                  </span>
                  <span style={{ flex: '0 0 auto' }}>
                    <Insignia tono={e.tono as Tono}>{e.estado}</Insignia>
                  </span>
                </div>
              ))}
              <p style={{ ...PIE, borderTop: 0 }}>
                Los contribuyentes observados quedan sin emisión hasta que se corrija la inconsistencia: predio sin arancel, ficha no
                conciliada o titularidad incompleta.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {kpisDelPanel.map((k) => (
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

        {/* ══════════ PADRÓN DE CONTRIBUYENTES ══════════ */}
        {dest === 'padron' && !esExpediente && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Padrón único del contribuyente. Su código enlaza predios, vehículos, licencias, papeletas y la cuenta corriente: encontrarlo
              es el primer paso de casi todo lo que se hace aquí.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre, DNI, RUC, código o placa"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                {q !== '' && (
                  <button
                    onClick={() => setQ('')}
                    aria-label="Limpiar la búsqueda"
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, width: 30, height: 30, display: 'grid', placeItems: 'center', background: 'var(--bg-card)', cursor: 'pointer', flex: '0 0 auto' }}
                  >
                    <Icono d={ICO.cerrar} tam={13} grosor={1.9} />
                  </button>
                )}
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '9px 16px',
                }}
              >
                {/* Los cuatro filtros rápidos del artboard —con deuda vencida,
                    predio sin conciliar, con beneficio, persona jurídica— no
                    existen en `ContribuyenteController`, que acota por código,
                    nombre, DNI y RUC y por nada más. Un chip que se pulsa y no
                    filtra es peor que no tenerlo, así que se dice dónde vive
                    cada uno. */}
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El padrón acota por código, nombre, DNI y RUC. Quién tiene deuda vencida se pregunta en Consultas, quién no concilia en
                  Catastro, y el beneficio en su propia consulta: no son filtros de esta lista.
                </span>
              </div>
            </section>

            {cargando && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div data-esq="1" style={{ width: 180, height: 15 }} />
                </div>
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div data-esq="1" style={{ width: 112, height: 13 }} />
                    <div data-esq="1" style={{ flex: 1, height: 13 }} />
                    <div data-esq="1" style={{ width: 74, height: 13 }} />
                  </div>
                ))}
              </section>
            )}

            {!cargando && vacio && (
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
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún contribuyente con esos datos</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Puede estar registrado con el código antiguo, con otro documento, o no estar. Si viene a declarar por primera vez, créalo
                  aquí mismo.
                </p>
                <button
                  onClick={() => onDest('alta')}
                  className="hov-acento-2"
                  style={{
                    marginTop: 6,
                    border: 0,
                    borderRadius: 6,
                    padding: '9px 18px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Nuevo contribuyente
                </button>
              </section>
            )}

            {!cargando && !vacio && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Contribuyentes encontrados</h2>
                  <span style={META}>
                    {filasDelPadron.length} de {(padron.datos?.totalElementos ?? 0).toLocaleString('es-PE')}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr>
                        {COLUMNAS_DEL_PADRON.map((c) => (
                          <th key={c[0]} style={c[1] ? THN : TH}>
                            {c[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasDelPadron.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => abrirExpediente(r.codigo)}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={r.activo ? 'ok' : 'bad'}>{r.activo ? 'A' : 'I'}</Insignia>
                          </td>
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {r.codigo}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.nombreRazonSocial}</td>
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.tipoDocumento} {r.numeroDocumento}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {r.condicionEspecial ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(padron.datos?.totalPaginas ?? 0) > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                    <button
                      onClick={() => setPaginaPadron((n) => Math.max(0, n - 1))}
                      disabled={paginaPadron === 0}
                      className="hov-linea"
                      style={{ ...BOTON_DE_TABLA, opacity: paginaPadron === 0 ? 0.45 : 1, cursor: paginaPadron === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      Anterior
                    </button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {(padron.datos?.pagina ?? 0) + 1} de {padron.datos?.totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaPadron((n) => n + 1)}
                      disabled={!padron.datos?.hayMas}
                      className="hov-linea"
                      style={{ ...BOTON_DE_TABLA, opacity: padron.datos?.hayMas ? 1 : 0.45, cursor: padron.datos?.hayMas ? 'pointer' : 'not-allowed' }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
                {/* Por que faltan tres columnas del artboard, dicho donde se
                    echan en falta. */}
                <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El domicilio fiscal, las unidades y la deuda no salen en esta lista: `ContribuyenteResource` no los publica. Los tres se
                  ven al abrir el expediente, que es donde se piden de uno en uno.
                </p>
                <p style={PIE}>
                  La deuda es a la fecha de hoy e incluye reajuste, interés y gastos. Cambia cada día: no se guarda, se calcula.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EXPEDIENTE DEL CONTRIBUYENTE ══════════ */}
        {esExpediente && (
          <div style={COLUMNA}>
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {RESUMEN_DEL_EXPEDIENTE.map((r) => (
                  <div
                    key={r.etiqueta}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '14px 16px',
                      borderLeft: '1px solid var(--line)',
                      borderTop: '1px solid var(--line)',
                      margin: '-1px 0 0 -1px',
                    }}
                  >
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                      {r.etiqueta}
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r.color }}>{r.valor}</p>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '11px 16px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--bg-elev)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
                  Actos sobre este contribuyente
                </span>
                {(
                  [
                    ['Determinar predial', () => { setTipo('predial'); onDest('determinar'); }],
                    ['Transferir predio', () => { setTrTipo('predio'); setTrPaso(0); onDest('transferir'); }],
                    ['Alta de deuda', () => { setHoja('alta'); onDest('deuda'); }],
                    ['Declaración jurada', () => onDest('reporte')],
                  ] as [string, () => void][]
                ).map((a) => (
                  <button
                    key={a[0]}
                    onClick={a[1]}
                    className="hov-linea"
                    style={{
                      border: '1px solid var(--line-2)',
                      borderRadius: 999,
                      padding: '5px 13px',
                      background: 'var(--bg-card)',
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {a[0]}
                  </button>
                ))}
              </div>
            </section>

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <nav
                aria-label="Secciones del expediente"
                data-sm-hide="1"
                style={{ flex: '0 0 208px', width: 208, position: 'sticky', top: 112, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <p style={{ margin: '0 0 6px 10px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  En este expediente
                </p>
                {EXPEDIENTE.map((g) => (
                  /* El artboard enlaza con `href="#ident"`; aquí la ruta vive en
                     el hash, así que el índice desplaza con `scrollIntoView` en
                     vez de reescribir la URL y sacar al usuario del módulo. */
                  <button
                    key={g.id}
                    onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="hov-acento"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      border: 0,
                      borderRadius: 7,
                      padding: '8px 10px',
                      background: 'transparent',
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{g.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{g.conteo}</span>
                  </button>
                ))}
                <p style={{ margin: '9px 10px 0', fontSize: 11, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                  Nueve pestañas se volvieron seis secciones apiladas. El índice desplaza; no esconde.
                </p>
              </nav>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {EXPEDIENTE.map((g, gi) => {
                  const c = plegable('exp|' + g.id, gi < 2);
                  return (
                    <section key={g.id} id={g.id} style={{ ...TARJETA, scrollMarginTop: 120 }}>
                      <Cabecera abierta={c.abierta} onToggle={c.toggle} label={g.label} hint={g.hint} marca={g.conteo} />
                      {c.abierta && (
                        <div style={{ borderTop: '1px solid var(--line)' }}>
                          {g.bloques.map((bl, bi) => (
                            <div key={bi} style={{ borderBottom: '1px solid var(--line)' }}>
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
                                <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                                  {bl.nota}
                                </p>
                              )}
                              {bl.campos.length > 0 && <div style={REJILLA_DE_CAMPOS}>{bl.campos.map(campo)}</div>}
                              {bl.tabla && (
                                <BloqueDeTabla tabla={bl.tabla} onAnadir={() => toast('Se abriría el alta de una fila de esta lista.')} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ DETERMINACIONES ══════════ */}
        {dest === 'determinar' && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Seis determinaciones que antes eran seis pantallas distintas y hacían lo mismo: fijar el sujeto, enseñar de dónde sale la cifra
              y escribirla. Ahora tienen una sola forma y la cuenta se lee como cuenta.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIPOS_DE_DETERMINACION.map((k) => (
                <button key={k} onClick={() => setTipo(k)} aria-pressed={tipo === k} className="hov-linea" style={pastilla(tipo === k)}>
                  {DETERMINACIONES[k].label}
                </button>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>{det.titulo}</h2>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-elev)', borderRadius: 999, padding: '4px 10px' }}>
                  {det.endpoint}
                </code>
              </div>
              <p style={{ margin: 0, padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                {det.desc}
              </p>
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                  gap: '14px 16px',
                  padding: '15px 16px',
                  alignItems: 'end',
                }}
              >
                {det.filtros.map((f, i) => {
                  const clave = `${tipo}|${i}`;
                  const valor = filtros[clave] ?? f.v;
                  const cambiar = (v: string) => setFiltros((s) => ({ ...s, [clave]: v }));
                  return (
                    <label key={f.l} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.l}</span>
                      {f.t === 'sel' ? (
                        <select value={valor} onChange={(e) => cambiar(e.target.value)} style={IN}>
                          {(f.o ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input value={valor} onChange={(e) => cambiar(e.target.value)} placeholder={f.ph} style={IN} />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {det.tabla && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>{det.tabla.titulo}</h2>
                  <span style={META}>{det.tabla.conteo}</span>
                </div>
                <TablaDeDatos cols={det.tabla.cols} filas={det.tabla.filas} min={det.tabla.min} />
                {det.tabla.nota && <p style={PIE}>{det.tabla.nota}</p>}
              </section>
            )}

            {det.memoria && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>{det.memoria.titulo}</h2>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>De dónde sale la cifra</span>
                </div>
                <div style={{ padding: '6px 16px 14px' }}>
                  {det.memoria.lineas.map((l, i) => {
                    const fuerte = l[4] === 'total';
                    const sub = l[4] === 'sub';
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 12,
                          padding: fuerte ? '12px 16px' : '9px 0',
                          borderBottom: fuerte || sub ? '1px solid var(--ink-3)' : '1px solid var(--line)',
                          ...(fuerte ? { background: 'var(--accent-soft)', margin: '0 -16px', borderRadius: 6 } : null),
                        }}
                      >
                        <span style={{ flex: '0 0 22px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-4)', textAlign: 'center' }}>
                          {l[0]}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: fuerte ? 'var(--ink)' : 'var(--ink-2)' }}>{l[1]}</span>
                          {l[2] && (
                            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2, textWrap: 'pretty' }}>{l[2]}</span>
                          )}
                        </span>
                        <span
                          style={{
                            flex: '0 0 auto',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: fuerte ? 17 : sub ? 14.5 : 13.5,
                            fontWeight: fuerte || sub ? 500 : 400,
                            color: fuerte ? 'var(--accent-ink)' : 'var(--ink)',
                          }}
                        >
                          S/ {l[3]}
                        </span>
                      </div>
                    );
                  })}
                  <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>{det.memoria.nota}</p>
                </div>
              </section>
            )}

            {(det.secciones ?? []).map((sec, i) => {
              const c = plegable(`det|${tipo}|${i}`, i === 0);
              return (
                <section key={sec.label} style={TARJETA}>
                  <Cabecera abierta={c.abierta} onToggle={c.toggle} label={sec.label} hint={sec.hint} />
                  {c.abierta && <div style={{ borderTop: '1px solid var(--line)', ...REJILLA_DE_CAMPOS }}>{sec.campos.map(campo)}</div>}
                </section>
              );
            })}

            {det.totales && (
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
                {det.totales.map((t) => (
                  <div key={t[0]} style={celdaDeTotal(t[2] === 1)}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{det.aviso}</p>
              {det.acciones.map((a) => {
                const apagado = a[2] !== undefined;
                return (
                  <button
                    key={a[0]}
                    onClick={() =>
                      toast(a[2] ? a[2] : a[1] ? 'Determinación asentada en la cuenta corriente.' : 'Simulación: nada se ha escrito.')
                    }
                    aria-disabled={apagado}
                    title={a[2]}
                    className={a[1] ? 'hov-acento-2' : 'hov-linea'}
                    style={a[1] ? BOTON_PRIMARIO : { ...BOTON_SECUNDARIO, opacity: apagado ? 0.55 : 1 }}
                  >
                    {a[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ TRANSFERENCIAS ══════════ */}
        {dest === 'transferir' && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Una transferencia da de baja al transferente y de alta al adquirente. El orden importa y por eso va por pasos: sin validar la
              deuda del transferente no se registra nada.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['predio', 'vehiculo'] as ClaveDeTransferencia[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setTrTipo(k);
                    setTrPaso(0);
                  }}
                  aria-pressed={trTipo === k}
                  className="hov-linea"
                  style={pastilla(trTipo === k)}
                >
                  {TRANSFERENCIAS[k].label}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '15px 17px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Paso {paso + 1} de {trDef.pasos.length}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {trDef.pasos.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setTrPaso(i)}
                    aria-label={`Ir al paso ${i + 1}: ${p.label}`}
                    style={{
                      flex: 1,
                      height: 6,
                      border: 0,
                      borderRadius: 999,
                      cursor: 'pointer',
                      background: i <= paso ? 'var(--accent)' : 'var(--accent-soft)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
                {trDef.pasos.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setTrPaso(i)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: i === paso ? 'var(--accent-ink)' : 'var(--ink-4)',
                      fontWeight: i === paso ? 600 : 400,
                    }}
                  >
                    {i + 1}. {p.label}
                  </button>
                ))}
              </div>
            </div>

            {pasoActual.campos.length > 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{pasoActual.label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    {pasoActual.nota}
                  </p>
                </div>
                <div style={REJILLA_DE_CAMPOS}>{pasoActual.campos.map(campo)}</div>
              </section>
            )}

            {pasoActual.campos.length === 0 && (
              <section style={TARJETA}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Deuda del transferente</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                    La obligación del vendedor corre hasta el 31 de diciembre del año de la transferencia. Lo que quede pendiente se queda
                    con él, no viaja al comprador.
                  </p>
                </div>
                {DEUDA_DEL_TRANSFERENTE.map((d) => (
                  <div key={d.concepto} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ flex: '0 0 auto' }}>
                      <Insignia tono={d.tono as Tono}>{d.estado}</Insignia>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{d.concepto}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{d.detalle}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{soles(d.monto)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', background: 'var(--bg-elev)' }}>
                  <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    La transferencia se puede registrar con deuda pendiente; lo que no se puede es emitir constancia de no adeudo.
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ink)' }}>{soles(deudaDelTransferente)}</span>
                </div>
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setTrPaso(Math.max(paso - 1, 0))}
                aria-disabled={paso === 0}
                className="hov-linea"
                style={{ ...BOTON_SECUNDARIO, display: 'flex', alignItems: 'center', gap: 7, opacity: paso === 0 ? 0.5 : 1 }}
              >
                <Icono d={ICO.flechaIzq} tam={14} grosor={1.8} />
                Anterior
              </button>
              {paso >= trDef.pasos.length - 1 ? (
                <label style={{ flex: 1, minWidth: 220 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>
                    Observación · obligatoria
                  </span>
                  <input
                    value={observacionDelActo}
                    onChange={(e) => setObservacionDelActo(e.target.value)}
                    placeholder="Por qué se registra, y con qué documento"
                    style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-card)', fontSize: 13 }}
                  />
                </label>
              ) : (
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Nada se escribe hasta el último paso: los datos viajan en el borrador.
                </p>
              )}
              <button
                onClick={() => {
                  if (paso >= trDef.pasos.length - 1) void registrarTransferencia();
                  else setTrPaso(paso + 1);
                }}
                disabled={registrando || (paso >= trDef.pasos.length - 1 && observacionDelActo.trim() === '')}
                title={observacionDelActo.trim() === '' ? 'Falta la observación: sin motivo no se guarda' : undefined}
                className="hov-acento-2"
                style={{
                  ...BOTON_PRIMARIO,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  opacity: registrando || (paso >= trDef.pasos.length - 1 && observacionDelActo.trim() === '') ? 0.55 : 1,
                }}
              >
                {paso >= trDef.pasos.length - 1 ? 'Registrar transferencia' : 'Continuar'}
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════ MOVIMIENTOS DE DEUDA ══════════ */}
        {esDeuda && (
          <div style={COLUMNA}>
            <p style={ENTRADILLA}>
              Alta y baja son el mismo objeto con dos actos opuestos: una obligación de la cuenta corriente. Aquí conviven, con la búsqueda a
              cuestas, para no volver a teclear el contribuyente al pasar de una a otra.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['alta', 'Alta de deuda'],
                  ['baja', 'Baja de deuda'],
                ] as ['alta' | 'baja', string][]
              ).map((h) => (
                <button key={h[0]} onClick={() => setHoja(h[0])} aria-pressed={hoja === h[0]} className="hov-linea" style={pastilla(hoja === h[0])}>
                  {h[1]}
                </button>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '13px 16px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 6, padding: '4px 10px' }}>
                  00000006550
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}>DÍAZ MADRID, JULIO CÉSAR</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>3 predios · 1 vehículo</span>
                <button className="hov-linea" style={{ ...BOTON_DE_TABLA, marginLeft: 'auto' }}>
                  Cambiar contribuyente
                </button>
              </div>
            </section>

            {hoja === 'baja' && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Deuda seleccionable para baja</h2>
                  <span style={META}>
                    {FILAS_DE_LA_BAJA.length} registros · {marcadasDeLaBaja.length} marcados
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                        {COLS_DE_LA_BAJA.map((c) => (
                          <th key={c[0]} style={c[1] ? THN : TH}>
                            {c[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FILAS_DE_LA_BAJA.map((f, i) => {
                        const on = marcadas[i] === true;
                        return (
                          <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}>
                            <td style={{ padding: '11px 14px' }}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => setMarcadas((x) => ({ ...x, [i]: !on }))}
                                aria-label={`Marcar la cuota de ${f[0]} de ${f[3]}`}
                                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                              />
                            </td>
                            {f.map((celda, j) => (
                              <td key={j} style={j === 0 ? TD1 : COLS_DE_LA_BAJA[j] && COLS_DE_LA_BAJA[j][1] ? TDN : TD}>
                                {celda}
                              </td>
                            ))}
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
                    Una baja queda en la bitácora de auditoría con quién la hizo, cuándo y con qué resolución.
                  </span>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>A extinguir</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)' }}>{soles(bajaSuma)}</span>
                </div>
              </section>
            )}

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  {hoja === 'alta' ? 'Deuda a dar de alta' : 'Sustento de la baja'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  {hoja === 'alta'
                    ? 'Incorpora manualmente una obligación cuando no viene de la emisión masiva: determinaciones de fiscalización, multas o deuda migrada.'
                    : 'Extingue deuda por prescripción, resolución que la deja sin efecto, error material o compensación. Exige resolución.'}
                </p>
              </div>
              <div style={REJILLA_DE_CAMPOS}>{(hoja === 'alta' ? CAMPOS_DEL_ALTA : CAMPOS_DE_LA_BAJA).map(campo)}</div>
            </section>

            {hoja === 'alta' && (
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
                {(
                  [
                    ['Insoluto', soles(altaInsoluto), false],
                    ['Reajuste', soles(altaReajuste), false],
                    ['Interés', soles(altaInteres), false],
                    ['Total del alta', soles(altaTotal), true],
                  ] as [string, string, boolean][]
                ).map((t) => (
                  <div key={t[0]} style={celdaDeTotal(t[2])}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {hoja === 'alta'
                  ? 'Un alta manual entra en la cuenta corriente y se cobra como cualquier otra deuda. Queda en la bitácora con tu usuario. Se registra UNA cuota por acto: el backend no admite rango todavía, así que «Cuota hasta» no viaja.'
                  : 'Marca arriba las cuotas que se extinguen. Sin resolución no se puede dar de baja.'}
              </p>
              <label style={{ flex: 1, minWidth: 220 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>
                  Observación · obligatoria
                </span>
                <input
                  value={observacionDelActo}
                  onChange={(e) => setObservacionDelActo(e.target.value)}
                  placeholder={hoja === 'alta' ? 'Por qué se da de alta esta deuda' : 'Por qué se extingue'}
                  style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-card)', fontSize: 13 }}
                />
              </label>
              <button
                onClick={() => void moverDeuda()}
                disabled={registrando || observacionDelActo.trim() === ''}
                title={observacionDelActo.trim() === '' ? 'Falta la observación: sin motivo no se guarda' : undefined}
                className="hov-acento-2"
                style={{ ...BOTON_PRIMARIO, opacity: registrando || observacionDelActo.trim() === '' ? 0.55 : 1 }}
              >
                {hoja === 'alta' ? 'Dar de alta' : 'Dar de baja'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ DECLARACIÓN JURADA ══════════ */}
        {dest === 'reporte' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Hoja resumen (HR), predio urbano (PU) y predio rústico (PR). Se imprimen para la firma del contribuyente y quedan como
                sustento del cálculo.
              </p>
              {['HR', 'PU', 'PR'].map((k) => {
                const on = dj[k] === true;
                return (
                  <button
                    key={k}
                    onClick={() => setDj((x) => ({ ...x, [k]: !on }))}
                    aria-pressed={on}
                    style={{
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                      borderRadius: 6,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                      color: on ? 'var(--accent-ink)' : 'var(--ink-4)',
                    }}
                  >
                    {k}
                  </button>
                );
              })}
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
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
                    Gerencia de Administración Tributaria — Unidad de Rentas
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>DJ 000418 — HR</p>
                  <p style={{ margin: '3px 0 0' }}>27/02/{pref.ejercicio}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>
                  Declaración jurada — hoja resumen
                </h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                  Impuesto predial del ejercicio {pref.ejercicio} · rectificatoria
                </p>
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
                {[...DJ_META, { k: 'Ejercicio', v: pref.ejercicio }].map((m) => (
                  <div key={m.k}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{m.k}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{m.v}</p>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {DJ_COLS.map((c) => (
                      <th key={c[0]} style={c[1] ? THN : TH}>
                        {c[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DJ_FILAS.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      {r.map((celda, j) => (
                        <td key={j} style={j === 0 ? TD1 : DJ_COLS[j] && DJ_COLS[j][1] ? TDN : TD}>
                          {celda}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
                  gap: 14,
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: '1px solid var(--ink)',
                }}
              >
                {DJ_TOTALES.map((t) => (
                  <div key={t.k}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t.k}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)' }}>{t.v}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                Declaro bajo juramento que los datos consignados son verdaderos y que conozco que la omisión o falsedad genera las sanciones
                previstas en el Código Tributario.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
                  Funcionario receptor
                </div>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
                  Contribuyente o representante
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ══════════ LA BARRA DE CAMBIOS SIN GUARDAR ══════════
          En el artboard va fuera de `main`, pegada al fondo. Aquí vive dentro,
          y los márgenes negativos le devuelven el ancho completo que el
          `padding` de `main` le quitaría. */}
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
            margin: '18px -20px -96px',
            padding: '12px 20px',
            borderTop: '1px solid var(--line-2)',
            background: 'var(--bg-card)',
            boxShadow: '0 -6px 18px rgba(26,22,18,.06)',
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
            <Icono d={ICO.reloj} tam={13} grosor={2} />
            Cambios sin guardar
          </span>
          <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Los datos del contribuyente afectan la determinación del ejercicio en curso: al guardar se anota quién los cambió.
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
              toast('Contribuyente guardado.');
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


/**
 * A que filtro va lo tecleado.
 *
 * El backend acota por cuatro campos distintos y la pantalla tiene un solo
 * campo, asi que hay que elegir. La forma decide: ocho digitos es un DNI, once
 * un RUC, y todo digitos sin esas longitudes es el codigo del padron —que en
 * Catacaos son once posiciones con ceros por delante—. Lo demas es un nombre,
 * que ademas se busca por parecido.
 */
function filtroDelPadron(criterio: string): {
  codigo?: string;
  nombreRazonSocial?: string;
  dNI?: string;
  rUC?: string;
} {
  if (criterio === '') return {};
  const soloDigitos = /^[0-9]+$/.test(criterio);
  if (soloDigitos && criterio.length === 8) return { dNI: criterio };
  if (soloDigitos && criterio.length === 11) return { rUC: criterio };
  if (soloDigitos) return { codigo: criterio };
  return { nombreRazonSocial: criterio };
}

/**
 * Las columnas del padron, en la forma que `ContribuyenteResource` publica.
 *
 * El artboard dibuja ademas «Domicilio fiscal», «Unidades» y «Deuda hoy S/», y
 * el recurso no trae ninguna de las tres: el domicilio vive en la ficha, las
 * unidades hay que contarlas en catastro y en el padron vehicular, y la deuda
 * es de cuenta corriente —componerla aqui es lo que RNF-083 prohibe—. En su
 * sitio van «Persona» y «Condicion especial», que si vienen y decidian dos
 * cosas del calculo.
 */
const COLUMNAS_DEL_PADRON: ColDef[] = [
  ['Est.', 0],
  ['Codigo', 0],
  ['Nombre / razon social', 0],
  ['Documento', 0],
  ['Persona', 0],
  ['Condicion especial', 0],
];

/**
 * El codigo de contribuyente de un documento.
 *
 * El formulario del manual pide el documento —«Transferente — documento»— y las
 * peticiones del backend quieren el codigo del padron. Sin esta traduccion, lo
 * tecleado viaja como codigo y produce un 404 sobre una persona que SI esta
 * registrada, que es de los errores mas dificiles de leer en ventanilla.
 */
async function codigoDelContribuyente(documento: string): Promise<string | null> {
  const limpio = documento.replace(/[^0-9]/g, '');
  if (limpio === '') return null;
  const filtro = limpio.length === 11 ? { rUC: limpio } : { dNI: limpio };
  const r = await buscarContribuyentes(filtro, { tamano: 2 });
  const exacto = r.contenido.find((c) => c.numeroDocumento === limpio);
  return exacto ? exacto.codigo : null;
}
