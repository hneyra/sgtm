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
  type Contribuyente,
  type PeticionDeMovimientoDeDeuda,
} from '../../api/rentas';
import { listarPredios } from '../../api/catastro';
/* Dos lecturas de `consultas` que este módulo necesita y no duplica: la deuda de
   un contribuyente —la que se da de baja, y la que arrastra el transferente— y el
   vehículo por placa, que es de donde sale su titular vigente. */
import {
  buscarVehiculos,
  deudaDelContribuyente,
  fichaUnificada,
  type ObligacionConDeuda,
} from '../../api/consultas';
import { ErrorDeApi, type RespuestaPaginada } from '../../api/cliente';
import { FalloDeLectura } from '../../api/Fallo';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Aviso, Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { soles, usarPreferencias } from '../../shell/preferencias';
import {
  CAMPOS_DEL_ALTA,
  CAMPOS_DE_LA_BAJA,
  COLS_DE_LA_BAJA,
  DEFECTOS,
  DETERMINACIONES,
  DJ_COLS,
  DJ_META,
  DJ_TOTALES,
  EXPEDIENTE,
  OPCIONES_DE_RENTAS,
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

/**
 * El valor por omisión que declara cada campo del catálogo, por clave.
 *
 * Existe porque `texto(k)` miraba sólo `vals` y `DEFECTOS`, y **no el `v` del
 * propio campo**, que es de donde salen los valores iniciales de los
 * desplegables y de las casillas. La consecuencia era que lo que la pantalla
 * enseñaba y lo que viajaba no eran lo mismo: «Genera alcabala» nace marcada
 * (`v: true`) y `texto('genAlcabala')` devolvía `''`, así que la comparación
 * `!== 'No'` daba cierto **siempre** —también con la casilla desmarcada, donde
 * devuelve `'false'`— y toda transferencia se registraba generando alcabala.
 * Con una sola fuente para los tres orígenes, lo que se ve es lo que se manda.
 */
const POR_OMISION_DEL_CAMPO: Record<string, string | boolean> = (() => {
  const mapa: Record<string, string | boolean> = {};
  const meter = (campos: CampoDef[]) => {
    for (const c of campos) if (c.v !== undefined) mapa[c.k] = c.v;
  };
  for (const seccion of EXPEDIENTE) for (const bloque of seccion.bloques) meter(bloque.campos);
  for (const det of Object.values(DETERMINACIONES)) for (const sec of det.secciones ?? []) meter(sec.campos);
  for (const tr of Object.values(TRANSFERENCIAS)) for (const paso of tr.pasos) meter(paso.campos);
  meter(CAMPOS_DEL_ALTA);
  meter(CAMPOS_DE_LA_BAJA);
  return mapa;
})();

/**
 * El importe tal como el backend lo lee, o `null` si lo tecleado no es uno.
 *
 * `new BigDecimal(texto.strip())` no admite separador de miles, y en el Perú los
 * importes se escriben con él: quien teclea «1,842.60» —que es como lo dice el
 * recibo que tiene delante— recibía un 422 que culpa al campo. Se quita el
 * separador y se comprueba la forma **antes** de mandar, para que el aviso hable
 * del campo que hay que corregir y no de una regla del servidor.
 */
function importeQueViaja(escrito: string): string | null {
  const limpio = escrito.trim().replace(/,/g, '');
  if (limpio === '') return '';
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? limpio : null;
}

/**
 * Hasta cuándo responde el transferente y desde cuándo el adquirente.
 *
 * Sale del **año de la fecha del acto**, que es lo que la propia pantalla dice
 * dos párrafos más arriba: «la obligación del vendedor corre hasta el 31 de
 * diciembre del año de la transferencia». Antes eran dos constantes de la
 * maqueta —31/12/2026 y 01/01/2027— que no se movían aunque el acto fuera de
 * 2024. Sin fecha del acto no hay año, y sale «—».
 */
function afectacionDelActo(fecha: string): { hasta: string; desde: string } {
  const anio = Number(fecha.slice(0, 4));
  if (!Number.isInteger(anio) || anio < 1900) return { hasta: '—', desde: '—' };
  return { hasta: `31/12/${anio}`, desde: `01/01/${anio + 1}` };
}

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
function TablaDeDatos({
  cols,
  filas,
  min,
  vacia,
}: {
  cols: ColDef[];
  filas: string[][];
  min: string;
  /** Qué decir cuando no hay filas. Sin esto, una tabla que perdió sus filas de
   *  muestra se dibuja con la cabecera y nada debajo, que se lee como «no hay». */
  vacia?: string;
}) {
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
          {filas.length === 0 && vacia !== undefined && (
            <tr style={{ borderTop: '1px solid var(--line)' }}>
              <td colSpan={cols.length} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {vacia}
              </td>
            </tr>
          )}
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
   * ocho dígitos, por `nombreRazonSocial` si no es todo dígitos, y por `rUC` **y**
   * `codigo` a la vez cuando son once —las dos formas caben en esa longitud y
   * nada las distingue—. Es lo que el buscador del artboard promete —«Nombre,
   * DNI, RUC, código»— y el backend no tiene un campo único que lo haga.
   */
  const criterio = useRebote(q.trim());
  useEffect(() => setPaginaPadron(0), [criterio]);
  const padron = useRecurso(
    (senal) => padronPorCriterio(criterio, { pagina: paginaPadron, tamano: 20 }, senal),
    [criterio, paginaPadron],
    dest === 'padron' && sujeto === null,
  );
  const filasDelPadron = padron.datos?.contenido ?? [];

  /**
   * El contribuyente del expediente, leído del backend.
   *
   * Sin esto, `sujeto` solo decidía SI se dibujaba el expediente y nunca DE
   * QUIÉN: el cuerpo entero salía del juego de datos, así que pulsar cualquier
   * fila del padrón real abría la ficha de otra persona —con su nombre, su
   * documento, sus predios y su deuda— y encima los botones de determinar,
   * transferir y dar de alta deuda.
   */
  const expediente = useRecurso(
    (senal) => buscarContribuyentes({ codigo: sujeto! }, { tamano: 2 }, senal),
    [sujeto],
    sujeto !== null && dest !== 'alta',
  );
  const contribuyenteAbierto =
    (expediente.datos?.contenido ?? []).find((c) => c.codigo === sujeto) ?? null;
  const cargando = padron.cargando;
  const vacio = !padron.cargando && padron.error === null && padron.datos !== null && filasDelPadron.length === 0;
  const [tipo, setTipo] = useState<ClaveDeDeterminacion>('predial');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [trTipo, setTrTipo] = useState<ClaveDeTransferencia>('predio');
  const [trPaso, setTrPaso] = useState(0);
  const [hoja, setHoja] = useState<'alta' | 'baja'>('alta');
  /* Una obligación por acto: `MovimientoDeDeuda` extingue UNA `ClaveDeSaldo`, así
     que la tabla elige una fila y no un conjunto. Antes eran cuatro casillas
     premarcadas sobre filas de la maqueta que además nadie leía al mandar. */
  const [obligacionMarcada, setObligacionMarcada] = useState<number | null>(null);
  const [dj, setDj] = useState<Record<string, boolean>>({ HR: true, PU: true, PR: false });

  /* El expediente se abre sobre el destino «Contribuyentes», como en el
     artboard. Al cambiar de destino se suelta el sujeto, salvo cuando es la
     propia navegación la que lo trae —la paleta abre el expediente—. */
  const sujetoAlLlegar = useRef<string | null>(null);
  const sujetoDeDeudaAlLlegar = useRef<Contribuyente | null>(null);
  useEffect(() => {
    if (sujetoAlLlegar.current) {
      setSujeto(sujetoAlLlegar.current);
      sujetoAlLlegar.current = null;
    } else {
      setSujeto(null);
    }
    if (sujetoDeDeudaAlLlegar.current) {
      setSujetoDeDeuda(sujetoDeDeudaAlLlegar.current);
      sujetoDeDeudaAlLlegar.current = null;
    }
  }, [dest]);

  const esNuevo = dest === 'alta';

  /**
   * La franja del expediente.
   *
   * Con un contribuyente abierto son sus datos y **nada más**: el código, el
   * documento, si es natural o jurídica y su condición especial, que es lo que
   * `ContribuyenteResource` publica. Predios, autovalúo, vehículos y deuda
   * salen «—»: viven en catastro, en el padrón vehicular y en cuenta corriente,
   * y ponerlos aquí desde el juego de datos era enseñar la ficha de otra
   * persona bajo el nombre de quien se acaba de buscar.
   */
  const resumenDelExpediente: { etiqueta: string; valor: string; color: string }[] = contribuyenteAbierto
    ? [
        { etiqueta: 'Código', valor: contribuyenteAbierto.codigo, color: 'var(--ink)' },
        {
          etiqueta: 'Documento',
          valor: `${contribuyenteAbierto.tipoDocumento} ${contribuyenteAbierto.numeroDocumento}`,
          color: 'var(--ink)',
        },
        {
          etiqueta: 'Persona',
          valor: contribuyenteAbierto.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural',
          color: 'var(--ink)',
        },
        { etiqueta: 'Condición especial', valor: contribuyenteAbierto.condicionEspecial ?? '—', color: 'var(--ink)' },
        { etiqueta: 'Estado', valor: contribuyenteAbierto.activo ? 'Activo' : 'Inactivo', color: contribuyenteAbierto.activo ? 'var(--ok-fg)' : 'var(--bad-fg)' },
        { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
      ]
    : esNuevo
      ? [
          { etiqueta: 'Código', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Documento', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Persona', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Condición especial', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Estado', valor: 'Sin registrar', color: 'var(--warn-fg)' },
          { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
        ]
      : /* Ni con la lectura caída ni con un código que no está en el padrón se
           dibuja nada: antes salían aquí las seis celdas del juego de datos
           —código 00000025673, DNI 03593174, dos predios, S/ 170,616.75 de
           autovalúo y S/ 1,842.60 de deuda— bajo el código real de quien se
           acababa de pulsar. Seis cifras de otra persona, indistinguibles de las
           suyas. El aviso de por qué no hay nada lo pone `FalloDeLectura`. */
        [
          { etiqueta: 'Código', valor: sujeto ?? '—', color: 'var(--ink)' },
          { etiqueta: 'Documento', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Persona', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Condición especial', valor: '—', color: 'var(--ink-4)' },
          { etiqueta: 'Estado', valor: expediente.cargando ? '…' : '—', color: 'var(--ink-4)' },
          { etiqueta: 'Deuda', valor: '—', color: 'var(--ink-4)' },
        ];
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
  /**
   * El valor de un campo, con la misma cadena para las tres funciones que lo
   * necesitan: lo tecleado, el valor por omisión del propio campo y el del
   * contribuyente. Antes `texto()` se saltaba el segundo eslabón y devolvía otra
   * cosa que la que la pantalla enseñaba.
   */
  const valorDeClave = (k: string): string | boolean => {
    const v = vals[k];
    if (v !== undefined) return v;
    const propio = POR_OMISION_DEL_CAMPO[k];
    if (propio !== undefined) return propio;
    const d = DEFECTOS[k];
    return d === undefined ? '' : d;
  };
  const valorDe = (f: CampoDef): string | boolean => valorDeClave(f.k);
  const texto = (k: string) => {
    const v = valorDeClave(k);
    return typeof v === 'boolean' ? '' : v;
  };
  /** Una casilla se lee como booleano, nunca comparando su texto. */
  const marcado = (k: string) => valorDeClave(k) === true;
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
  const esElUltimoPaso = paso >= trDef.pasos.length - 1;

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

  /* ── Las partes de la transferencia, resueltas contra el padrón ──────────
     Los cuatro «— nombre» eran `ro` con un nombre de la maqueta dentro, y el
     recuadro punteado es exactamente como se dibuja un dato traído: teclear un
     documento distinto no los movía. Y son el ÚNICO control que confirma a quién
     se transfiere la propiedad antes de pulsar «Registrar transferencia»: la
     pantalla confirmaba siempre, y confirmaba a otro. */
  const enTransferencia = dest === 'transferir';
  const esDeuda = dest === 'deuda';
  const esPredio = trTipo === 'predio';
  const docTransferente = useRebote(texto('trDoc').trim());
  const docAdquirente = useRebote(texto(esPredio ? 'adDoc' : 'vAdDoc').trim());
  const placaDelActo = useRebote(texto('vPlaca').trim());

  const transferenteDelPredio = useRecurso(
    (s2) => contribuyentePorDocumento(docTransferente, s2),
    [docTransferente],
    enTransferencia && esPredio && docTransferente !== '',
  );
  const adquirente = useRecurso(
    (s2) => contribuyentePorDocumento(docAdquirente, s2),
    [docAdquirente],
    enTransferencia && docAdquirente !== '',
  );
  /* En el vehículo el transferente NO se teclea: `PeticionDeTransferenciaVehiculo`
     no tiene `codTransferente` y el backend toma al titular vigente de la placa.
     Se lee de `GET /consultas/vehiculos`, que publica `titular` y su código. */
  const vehiculoDelActo = useRecurso(
    (s2) => buscarVehiculos({ placa: placaDelActo }, { tamano: 2 }, s2),
    [placaDelActo],
    enTransferencia && !esPredio && placaDelActo !== '',
  );
  const vehiculoEncontrado =
    (vehiculoDelActo.datos?.contenido ?? []).find(
      (v) => v.placa.replace(/-/g, '').toUpperCase() === placaDelActo.replace(/-/g, '').toUpperCase(),
    ) ?? null;

  /** Quién transfiere, venga del documento tecleado o del titular de la placa. */
  const codigoDelTransferente = esPredio
    ? (transferenteDelPredio.datos?.codigo ?? null)
    : (vehiculoEncontrado?.codigoContribuyente ?? null);
  const nombreDelTransferente = esPredio
    ? (transferenteDelPredio.datos?.nombreRazonSocial ?? null)
    : (vehiculoEncontrado?.titular ?? null);

  /**
   * La deuda del transferente, la de verdad. Antes eran tres conceptos de la
   * maqueta —S/ 2,640.36 en total— dibujados encima del botón que registra el
   * acto, y no eran de nadie.
   *
   * Se lee de la ficha unificada y no de `consulta_deuda` por el total: el pie
   * del artboard enseña una cifra sumada, y sumarla aquí sería componer dinero en
   * la pantalla (RNF-083). `resumenDeSaldos` la trae hecha por el servidor y con
   * su fecha, que es lo que la regla 9 exige de toda cifra que se muestra.
   */
  const deudaDelTransferente = useRecurso(
    (s2) => fichaUnificada({ contribuyente: codigoDelTransferente! }, { tamano: 20 }, s2),
    [codigoDelTransferente],
    enTransferencia && codigoDelTransferente !== null,
  );

  /* ── El contribuyente de las dos hojas de deuda ──────────────────────────
     No había ninguno: la franja enseñaba «00000006550 · DÍAZ MADRID, JULIO
     CÉSAR» de la maqueta, «Cambiar contribuyente» no tenía `onClick`, y el
     cuerpo se armaba con `texto('altaDoc')` —una clave que no es ningún campo de
     esta pantalla ni de ninguna otra—, así que salía `codContribuyente: ''` y el
     acto moría siempre en 422. */
  const [sujetoDeDeuda, setSujetoDeDeuda] = useState<Contribuyente | null>(null);
  const [qDeuda, setQDeuda] = useState('');
  const criterioDeDeuda = useRebote(qDeuda.trim());
  const busquedaDeDeuda = useRecurso(
    (s2) => padronPorCriterio(criterioDeDeuda, { tamano: 8 }, s2),
    [criterioDeDeuda],
    esDeuda && sujetoDeDeuda === null && criterioDeDeuda !== '',
  );

  /**
   * La deuda que se puede dar de baja, **a la fecha de la resolución**.
   *
   * No es una comodidad: `RegistrarMovimientoDeDeuda` compara parte por parte
   * contra `deudaActualizadaA(fechaValor)`, y `fechaValor` es esa fecha. Leerla a
   * hoy y darla de baja con una resolución de julio produciría
   * `BajaMayorQueLaDeuda` sobre unas cifras que la pantalla acababa de enseñar.
   */
  const fechaDeLaBaja = texto('fechaRes').trim();
  const deudaParaLaBaja = useRecurso(
    (s2) =>
      deudaDelContribuyente(
        { codContribuyente: sujetoDeDeuda!.codigo, fechaDeCorte: fechaDeLaBaja === '' ? undefined : fechaDeLaBaja },
        { tamano: 50 },
        s2,
      ),
    [sujetoDeDeuda?.codigo, fechaDeLaBaja],
    esDeuda && hoja === 'baja' && sujetoDeDeuda !== null,
  );
  const obligaciones = deudaParaLaBaja.datos?.contenido ?? [];
  /* Al cambiar de contribuyente o de fecha, lo marcado deja de significar nada. */
  useEffect(() => setObligacionMarcada(null), [sujetoDeDeuda?.codigo, fechaDeLaBaja, hoja]);
  const obligacionDeLaBaja: ObligacionConDeuda | null =
    obligacionMarcada === null ? null : (obligaciones[obligacionMarcada] ?? null);

  /**
   * Lo que impide registrar la transferencia, o `undefined` si nada lo impide.
   *
   * Se calcula antes de habilitar el botón y no dentro del envío: un acto que
   * promete lo que no puede es peor que uno apagado que dice por qué.
   */
  const impedimentoDeLaTransferencia = (): string | undefined => {
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    if (esPredio) {
      if (texto('codPredial').trim() === '') return 'Falta el código predial: es lo que se transfiere';
      if (texto('trDoc').trim() === '') return 'Falta el documento del transferente';
      if (codigoDelTransferente === null)
        return transferenteDelPredio.cargando
          ? 'Buscando al transferente en el padrón…'
          : 'Ese documento de transferente no está en el padrón de contribuyentes';
      if (texto('pctTransf').trim() === '') return 'Falta el % transferido';
    } else {
      if (placaDelActo === '') return 'Falta la placa: es lo que se transfiere';
      if (vehiculoEncontrado === null)
        return vehiculoDelActo.cargando ? 'Buscando el vehículo…' : 'Esa placa no está en el padrón vehicular';
    }
    if (texto(esPredio ? 'adDoc' : 'vAdDoc').trim() === '') return 'Falta el documento del adquirente';
    if (adquirente.datos === null)
      return adquirente.cargando
        ? 'Buscando al adquirente en el padrón…'
        : 'Ese documento de adquirente no está en el padrón de contribuyentes';
    if (texto(esPredio ? 'fechaActo' : 'vFecha').trim() === '') return 'Falta la fecha del acto';
    if (texto(esPredio ? 'minuta' : 'vNumDoc').trim() === '')
      return 'Falta el documento que sustenta el acto: sin él no se registra';
    if (importeQueViaja(texto(esPredio ? 'valorTransf' : 'vValor')) === null)
      return 'El valor de transferencia no es un importe: escríbelo sin separador de miles, como 95000.00';
    return undefined;
  };

  /**
   * Registra la transferencia contra el backend.
   *
   * El `predioId` **no se teclea**: la pantalla pide el código predial y aquí se
   * resuelve contra el padrón, que es lo que su propia ayuda promete. Los códigos
   * de las partes tampoco: vienen ya resueltos de la lectura que llena sus
   * nombres, así que lo que se registra es lo mismo que se confirmó en pantalla.
   */
  /**
   * Lo que va dentro de los seis `ro` derivados de la transferencia.
   *
   * Son los que el manual dibuja en recuadro punteado —que es como se dibuja un
   * dato traído— y traían dentro un nombre y dos fechas de la maqueta. Ninguno
   * se teclea: los nombres los pone el padrón (o el titular de la placa) y las
   * dos fechas de afectación salen del año del acto.
   */
  const resueltoDeLaTransferencia = (k: string): { valor: string; ayuda?: string } | undefined => {
    const afectacion = afectacionDelActo(texto(esPredio ? 'fechaActo' : 'vFecha'));
    const delPadron = (
      lectura: { cargando: boolean; error: ErrorDeApi | null },
      nombre: string | null,
      hayDocumento: boolean,
    ): { valor: string; ayuda?: string } => {
      if (!hayDocumento) return { valor: '—', ayuda: 'Teclea el documento y el padrón dirá quién es' };
      if (lectura.cargando) return { valor: '…', ayuda: 'Buscando en el padrón' };
      if (lectura.error !== null) return { valor: '—', ayuda: 'No se pudo consultar el padrón' };
      return nombre === null
        ? { valor: '—', ayuda: 'Ese documento no está en el padrón de contribuyentes' }
        : { valor: nombre };
    };

    switch (k) {
      case 'trNom':
        return delPadron(transferenteDelPredio, nombreDelTransferente, docTransferente !== '');
      case 'adNom':
      case 'vAdNom':
        return delPadron(adquirente, adquirente.datos?.nombreRazonSocial ?? null, docAdquirente !== '');
      case 'vTrNom':
        return delPadron(vehiculoDelActo, nombreDelTransferente, placaDelActo !== '');
      case 'vTrDoc':
        return {
          valor: codigoDelTransferente ?? '—',
          ayuda: 'Lo pone el padrón vehicular: es el titular vigente de la placa, y no viaja en la petición',
        };
      case 'trHasta':
      case 'vTrHasta':
        return { valor: afectacion.hasta, ayuda: 'Del año del acto: hasta el 31 de diciembre responde el vendedor' };
      case 'adDesde':
      case 'vAdDesde':
        return { valor: afectacion.desde, ayuda: 'Del año del acto: el comprador queda afecto el 1 de enero siguiente' };
      default:
        return undefined;
    }
  };

  const campoDeLaTransferencia = (f: CampoDef) => {
    const r = resueltoDeLaTransferencia(f.k);
    if (r === undefined) return campo(f);
    return (
      <CampoDeFormulario
        key={f.k}
        f={{ ...f, ayuda: r.ayuda ?? f.ayuda }}
        valor={r.valor}
        onCambio={() => {
          /* Es `ro`: no hay nada que cambiar. */
        }}
      />
    );
  };

  const registrarTransferencia = async () => {
    setRegistrando(true);
    try {
      const codigoDelAdquirente = adquirente.datos!.codigo;
      const valor = importeQueViaja(texto(esPredio ? 'valorTransf' : 'vValor'))!;

      if (esPredio) {
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
          codTransferente: codigoDelTransferente!,
          codAdquiriente: codigoDelAdquirente,
          tipoTransferencia: texto('tipoActo'),
          fechaTransferencia: texto('fechaActo'),
          valorTransferencia: valor,
          porcentajeTransferido: texto('pctTransf').trim(),
          /* La casilla se lee como booleano. Antes se comparaba su TEXTO con
             `'No'` —un valor que `texto()` no devuelve nunca: da `''`, `'true'` o
             `'false'`—, así que `afectaAlcabala` viajaba `true` siempre, también
             con la casilla desmarcada. */
          afectaAlcabala: marcado('genAlcabala'),
          documentoOrigen: texto('minuta').trim(),
        });
      } else {
        await transferirVehiculo({
          observacion: observacionDelActo.trim(),
          placa: placaDelActo,
          codAdquiriente: codigoDelAdquirente,
          tipoTransferencia: texto('vTipo'),
          fechaTransferencia: texto('vFecha'),
          valorTransferencia: valor,
          /* La alcabala grava la transferencia de INMUEBLES (art. 21 de la Ley de
             Tributación Municipal), y el formulario del manual no dibuja casilla
             en la hoja del vehículo. Aquí viajaba `true` literal, de modo que toda
             transferencia vehicular quedaba marcada como que genera alcabala. */
          afectaAlcabala: false,
          documentoOrigen: texto('vNumDoc').trim(),
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
   * La unidad del alta —predio o vehículo— resuelta a su identificador interno.
   *
   * `ClaveDeSaldo` compara `predioId`/`vehiculoId` por igualdad exacta, así que
   * una obligación con predio y una sin él son dos obligaciones distintas: mandar
   * el alta sin resolver la unidad la asienta sobre la que no tiene ninguna.
   * Devuelve `null` cuando lo tecleado no se encuentra, y entonces no se manda.
   */
  const unidadDelAlta = async (): Promise<{ predioId?: number; vehiculoId?: number } | null> => {
    const escrito = texto('altaUnidad').trim();
    if (escrito === '') return {};
    const predios = await listarPredios({ codRefCatastral: escrito }, { tamano: 2 });
    const predio = predios.contenido.find((x) => x.codRefCatastral === escrito);
    if (predio) return { predioId: predio.predioId };
    const sinGuion = escrito.replace(/-/g, '').toUpperCase();
    const vehiculos = await buscarVehiculos({ placa: escrito }, { tamano: 2 });
    const vehiculo = vehiculos.contenido.find((v) => v.placa.replace(/-/g, '').toUpperCase() === sinGuion);
    /* `VehiculoEncontradoResource` no publica el identificador interno del
       vehículo, sólo su placa; el cuerpo del movimiento pide `vehiculoId`. Así
       que una placa se reconoce y no se puede mandar: se dice, en vez de
       asentarla sobre la obligación sin unidad. */
    if (vehiculo) return null;
    return null;
  };

  /**
   * Lo que impide dar de alta, o `undefined`.
   *
   * Los seis campos que identifican la obligación van antes que el sustento: sin
   * ellos, la resolución mejor redactada incorpora deuda sobre otra cuota.
   */
  const impedimentoDelAlta = (): string | undefined => {
    if (sujetoDeDeuda === null) return 'Elige primero el contribuyente al que se le da de alta la deuda';
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    if (texto('altaConcepto').trim() === '') return 'Falta el concepto: es el tributo de la obligación';
    if (texto('altaAnio').trim() === '') return 'Falta el año de la obligación';
    if (!/^\d{1,2}$/.test(texto('altaCuotaD').trim())) return 'La cuota va de 0 (anual) a 12: escribe una sola';
    if (texto('altaNumDoc').trim() === '')
      return 'Falta el Nº del documento que sustenta: sin la resolución que lo aprueba, un alta no se registra';
    const partes = ['altaInsoluto', 'altaReajuste', 'altaInteres', 'altaGastos'].map((k) => importeQueViaja(texto(k)));
    if (partes.some((x) => x === null))
      return 'Alguno de los cuatro importes no es un número: escríbelos sin separador de miles, como 1842.60';
    if (partes.every((x) => x === '' || numero(x!) === 0))
      return 'Un alta sin ningún importe no mueve nada: al menos una de las cuatro partes tiene que traer cifra';
    return undefined;
  };

  /** Lo que impide dar de baja, o `undefined`. */
  const impedimentoDeLaBaja = (): string | undefined => {
    if (sujetoDeDeuda === null) return 'Elige primero el contribuyente cuya deuda se extingue';
    if (fechaDeLaBaja === '') return 'Falta la fecha de la resolución: es la fecha con efecto tributario de la baja';
    if (obligacionDeLaBaja === null)
      return 'Elige arriba la obligación que se extingue: la baja es sobre una obligación concreta, no sobre la cuenta entera';
    /* Lo destapó marcar la primera fila elegible de un contribuyente real: su
       obligación de 2027 está en cero, y `MovimientoDeDeuda` rechaza en su
       constructor un movimiento sin ninguna cifra. Sin esta guarda el acto sale y
       vuelve con un 422 que habla de las cuatro partes del desglose. */
    if (numero(obligacionDeLaBaja.deuda.total.importe) === 0)
      return `Esa obligación no debe nada al ${fechaDeLaBaja}: no hay nada que extinguir`;
    if (observacionDelActo.trim() === '') return 'Falta la observación: sin motivo no se guarda';
    if (texto('numRes').trim() === '')
      return 'Falta el Nº de resolución: sin la resolución que la aprueba, una baja no se puede defender ante nadie';
    return undefined;
  };

  /**
   * Da de alta una cuota, contra `POST /rentas/deuda/altas`.
   *
   * **Una cuota por acto.** El formulario del manual pide un rango y el `record`
   * del backend declara `cuota` en singular; `cuotaDesde`/`cuotaHasta` no están
   * en su lista blanca, así que Jackson los descartaría sin decir nada y el
   * asiento quedaría con `periodo: 0`. Se manda «Cuota desde» y se dice en
   * pantalla que el rango no viaja.
   */
  const darDeAltaLaDeuda = async () => {
    setRegistrando(true);
    try {
      const unidad = await unidadDelAlta();
      if (unidad === null) {
        toast(`«${texto('altaUnidad').trim()}» no es ningún predio del padrón, y una placa todavía no se puede mandar.`);
        return;
      }
      const cuerpo: PeticionDeMovimientoDeDeuda = {
        observacion: observacionDelActo.trim(),
        codContribuyente: sujetoDeDeuda!.codigo,
        tributo: texto('altaConcepto'),
        ano: texto('altaAnio'),
        cuota: Number(texto('altaCuotaD').trim()),
        ...unidad,
        insoluto: importeQueViaja(texto('altaInsoluto')) || undefined,
        reajuste: importeQueViaja(texto('altaReajuste')) || undefined,
        interes: importeQueViaja(texto('altaInteres')) || undefined,
        gasto: importeQueViaja(texto('altaGastos')) || undefined,
        documentoOrigen: texto('altaNumDoc').trim(),
      };
      await altaDeDeuda(cuerpo);
      setSucio(false);
      setObservacionDelActo('');
      toast('Alta registrada en la cuenta corriente.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar el alta.');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Da de baja la obligación marcada, contra `POST /rentas/deuda/bajas`.
   *
   * **El cuerpo es otro, y ese era el defecto.** Los dos actos compartían uno
   * solo que leía siempre las claves `alta*`, así que en la baja no viajaba nada
   * de lo tecleado —ni la causal, ni la resolución, ni su fecha— y sí los valores
   * por omisión del alta: el tributo, el año, la cuota y hasta
   * `documentoOrigen: 'RD-2026-000418'`, que es el sustento documental del acto.
   * Las cuatro filas marcadas de la tabla no se miraban.
   *
   * Lo que identifica la obligación sale de la fila elegida —tributo, ejercicio,
   * cuota, unidad, fase— y los importes son los que el servidor acaba de publicar
   * para ella a esa misma fecha: es contra esas cifras contra las que
   * `RegistrarMovimientoDeDeuda` comprueba que la baja no exceda la deuda.
   */
  const darDeBajaLaDeuda = async () => {
    setRegistrando(true);
    try {
      const o = obligacionDeLaBaja!;
      /* La causal no tiene campo propio en `PeticionDeMovimiento`, así que se
         antepone a la observación —que es donde queda auditada— en vez de
         perderse en un desplegable que no viaja. */
      const causal = texto('causal').trim();
      const cuerpo: PeticionDeMovimientoDeDeuda = {
        observacion: causal === '' ? observacionDelActo.trim() : `${causal}. ${observacionDelActo.trim()}`,
        codContribuyente: sujetoDeDeuda!.codigo,
        tributo: o.tributo,
        ano: String(o.ejercicio),
        cuota: o.periodoDesde,
        predioId: o.predioId ?? undefined,
        vehiculoId: o.vehiculoId ?? undefined,
        insoluto: o.deuda.insoluto.importe,
        reajuste: o.deuda.reajuste.importe,
        interes: o.deuda.interes.importe,
        gasto: o.deuda.gasto.importe,
        fase: o.fase,
        fechaValor: fechaDeLaBaja,
        documentoOrigen: texto('numRes').trim(),
      };
      await bajaDeDeuda(cuerpo);
      setSucio(false);
      setObservacionDelActo('');
      setObligacionMarcada(null);
      deudaParaLaBaja.reintentar();
      toast('Baja registrada.');
    } catch (error) {
      toast(error instanceof ErrorDeApi ? error.mensaje : 'No se pudo registrar la baja.');
    } finally {
      setRegistrando(false);
    }
  };

  /**
   * Los cuatro indicadores del panel.
   *
   * Los tres estados de una lectura se dicen **distinto**, y ese era el defecto:
   * «…» mientras se lee, «—» con el motivo cuando no se pudo, y «—» con otro
   * motivo cuando el dato sencillamente no existe. Con el mismo «—» para los
   * tres, un 403 sobre el panel de recaudación y una municipalidad que aún no ha
   * cobrado nada se leen igual —y sólo el primero se arregla pidiendo el acceso—.
   *
   * La fecha va en la nota: `IndicadoresResource.fechaCalculo` llega y no se
   * dibujaba, y una cifra sin su fecha no es una cifra (regla 9, RNF-075).
   */
  const avanceDeCobranza = kpisDeRecaudacion.datos?.kpis.find((k) => k.label === 'Avance de cobranza');
  const alDia = (fecha: string | undefined) => (fecha === undefined ? '' : ` Al ${fecha}.`);
  const kpisDelPanel = [
    {
      valor: censoDelPadron.cargando
        ? '…'
        : censoDelPadron.error !== null
          ? '—'
          : censoDelPadron.datos
            ? censoDelPadron.datos.totalElementos.toLocaleString('es-PE')
            : '—',
      etiqueta: 'Contribuyentes en el padrón',
      nota: censoDelPadron.cargando
        ? 'Contando el padrón…'
        : censoDelPadron.error !== null
          ? 'No se pudo leer el padrón: el aviso de arriba dice por qué.'
          : 'Los que hay hoy, activos y de baja.',
    },
    {
      /* «Predial determinado» no lo publica ningún KPI: el panel de recaudación
         da recaudado, cartera y avance, no lo determinado por tributo. */
      valor: '—',
      etiqueta: `Predial determinado ${pref.ejercicio}`,
      nota: 'Ninguna lectura publica lo determinado por tributo.',
    },
    {
      valor: corrida.cargando ? '…' : corrida.error !== null ? '—' : corrida.datos ? String(corrida.datos.observados) : '—',
      etiqueta: 'Observados sin emisión',
      nota: corrida.cargando
        ? 'Leyendo la última corrida…'
        : corrida.error !== null
          ? 'No se pudo leer la última corrida: el aviso de arriba dice por qué.'
          : corrida.datos
            ? 'De la última corrida masiva.'
            : 'No hay ninguna corrida masiva todavía.',
    },
    {
      valor: kpisDeRecaudacion.cargando ? '…' : (avanceDeCobranza?.value ?? '—'),
      etiqueta: 'Recaudado del emitido',
      nota: kpisDeRecaudacion.cargando
        ? 'Leyendo el panel de recaudación…'
        : kpisDeRecaudacion.error !== null
          ? 'No se pudo leer el panel de recaudación: el aviso de arriba dice por qué.'
          : /* La nota del propio KPI trae la cifra sobre la que se calcula —«de
               S/ 13,783.75 cargados»—, y esa cifra necesita su fecha como
               cualquier otra. La pone `fechaCalculo`, que llegaba y no se
               dibujaba. */
            (avanceDeCobranza?.note ?? 'Del panel de recaudación.') + alDia(kpisDeRecaudacion.datos?.fechaCalculo),
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
  const impedimentoDeLaHoja = hoja === 'alta' ? impedimentoDelAlta() : impedimentoDeLaBaja();

  /* Cifras derivadas: el total del alta sale de los mismos cuatro campos que se
     ven en pantalla, y es una previsualización de lo que se manda —no una cifra
     traída—. La suma de la baja ya NO se calcula aquí: la trae el servidor con
     la obligación, cada parte con su fecha. */
  const altaInsoluto = numero(texto('altaInsoluto'));
  const altaReajuste = numero(texto('altaReajuste'));
  const altaInteres = numero(texto('altaInteres'));
  const altaGastos = numero(texto('altaGastos'));
  const altaTotal = altaInsoluto + altaReajuste + altaInteres + altaGastos;
  /* La franja sólo enseña cifras cuando hay un acto del que hablar: un
     contribuyente elegido y al menos una de las cuatro partes escrita. */
  const PARTES_DEL_ALTA = ['altaInsoluto', 'altaReajuste', 'altaInteres', 'altaGastos'];
  const hayAlgoQueSumarEnElAlta = sujetoDeDeuda !== null && PARTES_DEL_ALTA.some((k) => texto(k).trim() !== '');
  const importeDelAlta = (clave: string, valor: number) =>
    hayAlgoQueSumarEnElAlta && texto(clave).trim() !== '' ? soles(valor) : '—';
  const obligacionesDelTransferente = deudaDelTransferente.datos?.deudasPendientes.contenido ?? [];

  const etiquetaDelDestino = modulo.destinos.find((x) => x.k === dest)?.label ?? 'Rentas';

  /* La miga y el título del expediente salen de quien está abierto. Eran dos
     constantes de la maqueta —«00000025673» y «Suc. Rufina Medina Medina»—, así
     que la cabecera de la página nombraba a una persona y la barra de contexto,
     tres líneas más abajo, a otra: la que se acababa de pulsar. */
  const miga = esNuevo
    ? ['Rentas', 'Contribuyentes', 'Nuevo']
    : esExpediente
      ? ['Rentas', 'Contribuyentes', contribuyenteAbierto?.codigo ?? sujeto ?? '—']
      : dest === 'reporte'
        ? ['Rentas', 'Documentos']
        : ['Rentas', etiquetaDelDestino];

  const titulo = esNuevo
    ? 'Nuevo contribuyente'
    : esExpediente
      ? (contribuyenteAbierto?.nombreRazonSocial ?? (expediente.cargando ? 'Leyendo el padrón…' : 'Contribuyente'))
      : dest === 'reporte'
        ? 'Declaración jurada'
        : dest === 'determinar'
          ? det.label
          : etiquetaDelDestino;

  const contexto: Contexto | undefined =
    esExpediente && !esNuevo
      ? {
          volver: { label: 'Padrón', onClick: () => setSujeto(null) },
          codigo: contribuyenteAbierto?.codigo ?? sujeto ?? '—',
          titular: expediente.cargando
            ? 'Leyendo el padrón…'
            : expediente.error
              ? 'No se pudo leer este contribuyente'
              : (contribuyenteAbierto?.nombreRazonSocial ?? 'Ese código no está en el padrón'),
          ubic: contribuyenteAbierto
            ? `${contribuyenteAbierto.tipoDocumento} ${contribuyenteAbierto.numeroDocumento} · ${contribuyenteAbierto.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}`
            : '',
          estado: sucio ? 'Cambios sin guardar' : contribuyenteAbierto ? 'Del padrón' : '',
          estadoColor: sucio ? 'var(--warn-fg)' : 'var(--ok-fg)',
        }
      : esDeuda
        ? /* La barra decía «00000006550 · DÍAZ MADRID, JULIO CÉSAR · S/ 9,412.15
             pendientes» pasara lo que pasara: un contribuyente, una deuda y una
             fecha de la maqueta encima del formulario que mueve deuda de verdad.
             Ahora dice a quién se eligió, o que no se ha elegido a nadie. */
          {
            volver: { label: 'Padrón', onClick: () => onDest('padron') },
            codigo: sujetoDeDeuda?.codigo ?? '—',
            titular: sujetoDeDeuda?.nombreRazonSocial ?? 'Sin contribuyente elegido',
            ubic: sujetoDeDeuda ? `${sujetoDeDeuda.tipoDocumento} ${sujetoDeDeuda.numeroDocumento}` : '',
            estado: hoja === 'alta' ? 'Alta de deuda' : 'Baja de deuda',
            estadoColor: 'var(--ink-3)',
          }
        : undefined;

  const paleta: EntradaDePaleta[] = OPCIONES_DE_RENTAS.map((o) => ({
    label: o[0],
    nota: 'Rentas',
    /* Las cuatro entradas del expediente llevan al padrón, no al código de la
       maqueta: `00000025673` no está en ningún padrón real, así que abrirlo daba
       un expediente que sólo puede decir que ese código no existe. Quién es se
       elige en la lista. */
    ir: () => onDest(o[1] === 'expediente' ? 'padron' : o[1]),
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
                <span style={META}>
                  {corrida.cargando
                    ? 'leyendo…'
                    : corrida.error !== null
                      ? 'no se pudo leer'
                      : corrida.datos
                        ? `${corrida.datos.etapas.length} etapas`
                        : 'sin corridas'}
                </span>
              </div>
              {corrida.error !== null && (
                <div style={{ padding: '14px 16px' }}>
                  <FalloDeLectura
                    error={corrida.error}
                    que="la última corrida de la emisión"
                    acceso="predial_masivo"
                    alReintentar={corrida.reintentar}
                  />
                </div>
              )}
              {corrida.error === null && etapasDeLaEmision.length === 0 && !corrida.cargando && (
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

            {/* Un indicador que sale «—» porque la lectura falló y otro que sale «—»
                porque ninguna operación lo publica se leen igual, y no son lo
                mismo: el primero se puede reintentar y el segundo no. */}
            {censoDelPadron.error !== null && (
              <FalloDeLectura
                error={censoDelPadron.error}
                que="el censo del padrón"
                acceso="consulta_contribuyentes"
                alReintentar={censoDelPadron.reintentar}
              />
            )}
            {kpisDeRecaudacion.error !== null && (
              <FalloDeLectura
                error={kpisDeRecaudacion.error}
                que="el panel de recaudación"
                acceso="panel_recaudacion"
                alReintentar={kpisDeRecaudacion.reintentar}
              />
            )}

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

            {/* Una lectura que falla NO es un padrón vacío. Antes se dibujaba la
                tarjeta de resultados con «0 de 0» y la tabla sin filas: se lee
                como «esa persona no existe», y lo que la pantalla ofrece a
                continuación es crear un contribuyente —así que el desenlace
                natural de un 403 era duplicar en el padrón a alguien que sí
                figura—. */}
            {!cargando && padron.error !== null && (
              <FalloDeLectura
                error={padron.error}
                que="el padrón"
                acceso="consulta_contribuyentes"
                alReintentar={padron.reintentar}
              />
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

            {!cargando && !vacio && padron.error === null && (
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
                {/* El pie del artboard decía «La deuda es a la fecha de hoy e
                    incluye reajuste, interés y gastos», tres líneas debajo de la
                    nota que explica que la deuda NO está en esta tabla porque
                    `ContribuyenteResource` no la publica. Se queda lo que sí es
                    verdad de esta lista, y dónde se ve la deuda. */}
                <p style={PIE}>
                  La deuda de cada uno se ve al abrir su expediente y en «Consulta de deuda»: se calcula a una fecha, no se guarda, y por
                  eso cambia cada día.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EXPEDIENTE DEL CONTRIBUYENTE ══════════ */}
        {esExpediente && (
          <div style={COLUMNA}>
            {expediente.error !== null && (
              <FalloDeLectura
                error={expediente.error}
                que="este contribuyente"
                acceso="consulta_contribuyentes"
                alReintentar={expediente.reintentar}
              />
            )}
            {!esNuevo && expediente.error === null && !expediente.cargando && contribuyenteAbierto === null && (
              <Aviso tono="warn" titulo={`El código ${sujeto ?? ''} no está en el padrón`}>
                La lista lo trajo y la ficha no lo encuentra: puede haberse dado de baja entre las dos lecturas, o la búsqueda haber
                devuelto otra municipalidad. No se dibuja nada suyo mientras no se sepa quién es.
              </Aviso>
            )}
            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {resumenDelExpediente.map((r) => (
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
                    /* Se lleva al contribuyente abierto: es lo que el propio
                       botón promete —«Actos sobre ESTE contribuyente»— y lo que
                       evita volver a buscarlo. */
                    ['Alta de deuda', () => { setHoja('alta'); sujetoDeDeudaAlLlegar.current = contribuyenteAbierto; onDest('deuda'); }],
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
                <TablaDeDatos
                  cols={det.tabla.cols}
                  filas={det.tabla.filas}
                  min={det.tabla.min}
                  vacia={VACIA_EN_LA_DETERMINACION[tipo]}
                />
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

            {/* Ninguna de las seis determinaciones manda nada todavía, y la
                primaria decía «Determinación asentada en la cuenta corriente»:
                un acto que afirma haber escrito deuda y no salió de la pantalla.
                Se apagan las seis con lo que le falta a cada una, que es lo que
                CONECTAR.md pide cuando algo no se puede conectar honestamente. */}
            <Aviso tono="warn" titulo="Aquí todavía no se determina nada">
              {IMPEDIMENTO_DE_LA_DETERMINACION[tipo]}
            </Aviso>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{det.aviso}</p>
              {det.acciones.map((a) => (
                <button
                  key={a[0]}
                  disabled
                  aria-disabled="true"
                  title={a[2] ?? IMPEDIMENTO_DE_LA_DETERMINACION[tipo]}
                  style={{ ...(a[1] ? BOTON_PRIMARIO : BOTON_SECUNDARIO), opacity: 0.55, cursor: 'not-allowed' }}
                >
                  {a[0]}
                </button>
              ))}
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
                    aria-current={i === paso ? 'step' : undefined}
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
                  /* `aria-current="step"` es lo que dice CUÁL es el paso
                     abierto. Sin él, el único que lo decía era el color —una
                     barrera para quien no lo distingue (RNF-082)— y además
                     `flujos.mjs` contaba el paso ya activo como un botón inerte:
                     pulsarlo no hace nada, y hace bien. */
                  <button
                    key={p.label}
                    onClick={() => setTrPaso(i)}
                    aria-current={i === paso ? 'step' : undefined}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: i === paso ? 'var(--accent-ink)' : 'var(--ink-4)',
                      fontWeight: i === paso ? 600 : 400,
                      textDecoration: i === paso ? 'underline' : 'none',
                      textUnderlineOffset: 3,
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
                <div style={REJILLA_DE_CAMPOS}>{pasoActual.campos.map(campoDeLaTransferencia)}</div>
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
                {codigoDelTransferente === null && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {esPredio
                      ? 'Aún no se sabe quién transfiere: teclea su documento en «Las partes» y el padrón dirá quién es.'
                      : 'Aún no se sabe quién transfiere: teclea la placa en «El acto» y el padrón vehicular dirá quién es su titular.'}
                  </p>
                )}
                {deudaDelTransferente.error !== null && (
                  <div style={{ padding: '14px 16px' }}>
                    <FalloDeLectura
                      error={deudaDelTransferente.error}
                      que="la deuda del transferente"
                      acceso="consulta_unificada"
                      alReintentar={deudaDelTransferente.reintentar}
                    />
                  </div>
                )}
                {deudaDelTransferente.cargando && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo su cuenta corriente…</p>
                )}
                {obligacionesDelTransferente.map((o) => (
                  <div
                    key={`${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
                  >
                    <span style={{ flex: '0 0 auto' }}>
                      <Insignia tono="warn">Pendiente</Insignia>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                        {o.tributo} {o.ejercicio}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                        Insoluto {o.insoluto.importe} · reajuste {o.reajuste.importe} · interés {o.interes.importe} · gasto {o.gasto.importe}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>
                      S/ {o.total.importe}
                    </span>
                  </div>
                ))}
                {deudaDelTransferente.datos !== null && obligacionesDelTransferente.length === 0 && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    {nombreDelTransferente} no tiene deuda pendiente al {deudaDelTransferente.datos.aLaFecha}.
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', background: 'var(--bg-elev)' }}>
                  <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    La transferencia se puede registrar con deuda pendiente; lo que no se puede es emitir constancia de no adeudo.
                  </span>
                  {/* El total lo compone el servidor y llega con su fecha: sumar
                      aquí las filas sería componer dinero en la pantalla (RNF-083),
                      y además el pie del artboard traía una cifra congelada de la
                      maqueta que se dibujaba igual para cualquier transferente. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ink)' }}>
                    {deudaDelTransferente.datos ? `S/ ${deudaDelTransferente.datos.resumenDeSaldos.total.importe}` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {deudaDelTransferente.datos ? `al ${deudaDelTransferente.datos.resumenDeSaldos.total.actualizadoA}` : 'sin fecha: no hay cifra'}
                  </span>
                </div>
              </section>
            )}

            {esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined && (
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 6, padding: '9px 12px', textWrap: 'pretty' }}
              >
                {impedimentoDeLaTransferencia()}
              </p>
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
              {/* El impedimento se calcula antes, no dentro del envío: el acto o
                  se puede hacer y el botón lo dice, o no se puede y dice qué
                  falta. Antes sólo miraba la observación, y con ella puesta
                  mandaba una transferencia sin transferente resuelto. */}
              <button
                onClick={() => {
                  if (paso >= trDef.pasos.length - 1) void registrarTransferencia();
                  else setTrPaso(paso + 1);
                }}
                disabled={registrando || (esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined)}
                title={esElUltimoPaso ? impedimentoDeLaTransferencia() : undefined}
                className="hov-acento-2"
                style={{
                  ...BOTON_PRIMARIO,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  opacity: registrando || (esElUltimoPaso && impedimentoDeLaTransferencia() !== undefined) ? 0.55 : 1,
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

            {/* La franja del contribuyente, de verdad. Enseñaba «00000006550 ·
                DÍAZ MADRID, JULIO CÉSAR · 3 predios · 1 vehículo» de la maqueta y
                «Cambiar contribuyente» no tenía `onClick`: no había forma de
                decirle a quién se le da de alta o de baja la deuda, y el cuerpo
                salía con `codContribuyente: ''`. */}
            <section style={TARJETA}>
              {sujetoDeDeuda !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '13px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 6, padding: '4px 10px' }}>
                    {sujetoDeDeuda.codigo}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{sujetoDeDeuda.nombreRazonSocial}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {sujetoDeDeuda.tipoDocumento} {sujetoDeDeuda.numeroDocumento} ·{' '}
                    {sujetoDeDeuda.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'}
                  </span>
                  <button
                    onClick={() => {
                      setSujetoDeDeuda(null);
                      setQDeuda('');
                      setObligacionMarcada(null);
                    }}
                    className="hov-linea"
                    style={{ ...BOTON_DE_TABLA, marginLeft: 'auto' }}
                  >
                    Cambiar contribuyente
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px' }}>
                    <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                    <input
                      value={qDeuda}
                      onChange={(e) => setQDeuda(e.target.value)}
                      aria-label="Buscar el contribuyente del movimiento"
                      placeholder="Nombre, DNI, RUC o código del contribuyente"
                      style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                    />
                  </div>
                  {busquedaDeDeuda.error !== null && (
                    <div style={{ padding: '0 16px 14px' }}>
                      <FalloDeLectura
                        error={busquedaDeDeuda.error}
                        que="el padrón"
                        acceso="consulta_contribuyentes"
                        alReintentar={busquedaDeDeuda.reintentar}
                      />
                    </div>
                  )}
                  {(busquedaDeDeuda.datos?.contenido ?? []).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSujetoDeDeuda(c)}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        border: 0,
                        borderTop: '1px solid var(--line)',
                        background: 'transparent',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{c.codigo}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{c.nombreRazonSocial}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                        {c.tipoDocumento} {c.numeroDocumento}
                      </span>
                    </button>
                  ))}
                  {busquedaDeDeuda.datos !== null &&
                    busquedaDeDeuda.error === null &&
                    (busquedaDeDeuda.datos.contenido ?? []).length === 0 && (
                      <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                        Ningún contribuyente con esos datos.
                      </p>
                    )}
                  <p style={PIE}>
                    Elige a quién se le aplica el movimiento: sin contribuyente no hay obligación que mover, y ni el alta ni la baja se
                    pueden mandar.
                  </p>
                </>
              )}
            </section>

            {hoja === 'baja' && sujetoDeDeuda !== null && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Deuda seleccionable para baja</h2>
                  <span style={META}>
                    {deudaParaLaBaja.datos ? `${obligaciones.length} obligaciones` : '—'}
                    {obligacionDeLaBaja !== null ? ' · 1 marcada' : ''}
                  </span>
                </div>
                {fechaDeLaBaja === '' && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Escribe abajo la fecha de la resolución: la deuda se lee a esa fecha, que es contra la que el servidor comprueba que la
                    baja no exceda lo que se debía.
                  </p>
                )}
                {deudaParaLaBaja.error !== null && (
                  <div style={{ padding: '14px 16px' }}>
                    <FalloDeLectura
                      error={deudaParaLaBaja.error}
                      que="la deuda de este contribuyente"
                      acceso="consulta_deuda"
                      alReintentar={deudaParaLaBaja.reintentar}
                    />
                  </div>
                )}
                {deudaParaLaBaja.cargando && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo su cuenta corriente…</p>
                )}
                {deudaParaLaBaja.error === null && !deudaParaLaBaja.cargando && obligaciones.length === 0 && fechaDeLaBaja !== '' && (
                  <p style={{ margin: 0, padding: '15px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    No tiene ninguna deuda pendiente al {fechaDeLaBaja}: no hay nada que extinguir.
                  </p>
                )}
                {obligaciones.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
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
                        {obligaciones.map((o, i) => {
                          /* Una obligación que agrupa varias cuotas NO se puede
                             dar de baja: `MovimientoDeDeuda` extingue una
                             `ClaveDeSaldo` con un `periodo` concreto, y esta
                             lectura publica un solo desglose para todo el grupo
                             (#551). Repartirlo entre las cuotas sería componer
                             dinero en la pantalla y produciría
                             `BajaMayorQueLaDeuda` en cuanto no cuadrara. */
                          const agrupada = o.periodoDesde !== o.periodoHasta;
                          const on = obligacionMarcada === i;
                          const motivo = agrupada
                            ? `Agrupa las cuotas ${o.periodoDesde} a ${o.periodoHasta} y la consulta no publica el desglose de cada una: hoy no se puede dar de baja (#551).`
                            : undefined;
                          return (
                            <tr
                              key={`${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}|${o.periodoDesde}`}
                              className="hov-elev"
                              title={motivo}
                              style={{
                                borderTop: '1px solid var(--line)',
                                background: on ? 'var(--accent-soft)' : 'transparent',
                                opacity: agrupada ? 0.55 : 1,
                              }}
                            >
                              <td style={{ padding: '11px 14px' }}>
                                <input
                                  type="radio"
                                  name="obligacion-de-la-baja"
                                  checked={on}
                                  disabled={agrupada}
                                  onChange={() => setObligacionMarcada(i)}
                                  aria-label={`Elegir ${o.tributo} ${o.ejercicio}, cuota ${o.periodoDesde}`}
                                  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                                />
                              </td>
                              <td style={TD1}>{o.ejercicio}</td>
                              {/* «Unidad»: `ObligacionConDeudaResource` publica el
                                  identificador interno del predio o del vehículo,
                                  no el código predial ni la placa, que es lo que
                                  aquí se leería. */}
                              <td style={TD}>—</td>
                              <td style={TD}>{agrupada ? `${o.periodoDesde} - ${o.periodoHasta}` : String(o.periodoDesde)}</td>
                              <td style={TD}>{o.tributo}</td>
                              <td style={TD}>{o.fase}</td>
                              <td style={TDN}>{o.deuda.insoluto.importe}</td>
                              <td style={TDN}>{o.deuda.reajuste.importe}</td>
                              <td style={TDN}>{o.deuda.interes.importe}</td>
                              <td style={TDN}>{o.deuda.gasto.importe}</td>
                              <td style={TDN}>{o.deuda.total.importe}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                    Una baja queda en la bitácora de auditoría con quién la hizo, cuándo y con qué resolución. Se extingue{' '}
                    <strong>una obligación por acto</strong>: para varias, se repite.
                  </span>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>A extinguir</span>
                  {/* El importe es el que el servidor publicó para esa obligación
                      a esa fecha, no una suma de columnas (RNF-083): es contra
                      esas cuatro cifras contra las que valida la baja. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--ink)' }}>
                    {obligacionDeLaBaja ? `S/ ${obligacionDeLaBaja.deuda.total.importe}` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {obligacionDeLaBaja ? `al ${obligacionDeLaBaja.deuda.total.actualizadoA}` : 'sin obligación marcada'}
                  </span>
                </div>
                {obligaciones.some((o) => o.periodoDesde !== o.periodoHasta) && (
                  <p style={PIE}>
                    Las filas atenuadas agrupan varias cuotas y hoy no se pueden dar de baja: el acto extingue una obligación con su cuota, y
                    esta consulta publica un solo desglose para todo el grupo (#551). La columna «Unidad» sale «—» porque el recurso publica
                    el identificador interno del predio, no su código.
                  </p>
                )}
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
                {/* Un total de nada no es cero: es nada. Sobre el formulario en
                    blanco la franja decía «S/ 0.00» cuatro veces —y debajo,
                    «Elige primero el contribuyente»—, que es una cifra afirmada
                    sobre un acto que ni siquiera tiene sujeto. Sale «—» hasta
                    que haya contribuyente y algo tecleado; y cada casilla dice
                    «—» por su cuenta mientras su campo esté vacío, para que el
                    total no parezca completo con tres partes sin escribir. */}
                {(
                  [
                    ['Insoluto', importeDelAlta('altaInsoluto', altaInsoluto), false],
                    ['Reajuste', importeDelAlta('altaReajuste', altaReajuste), false],
                    ['Interés', importeDelAlta('altaInteres', altaInteres), false],
                    ['Total del alta', hayAlgoQueSumarEnElAlta ? soles(altaTotal) : '—', true],
                  ] as [string, string, boolean][]
                ).map((t) => (
                  <div key={t[0]} style={celdaDeTotal(t[2])}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Cada hoja tiene su propio acto, su propio cuerpo y su propio
                impedimento. Antes las dos llamaban a una sola función que leía
                siempre las claves `alta*`, así que la baja mandaba el tributo, el
                año, la cuota y los importes del ALTA —y su `documentoOrigen`—, y
                nada de lo tecleado en su formulario. */}
            {impedimentoDeLaHoja !== undefined && (
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', background: 'var(--warn-bg)', borderRadius: 6, padding: '9px 12px', textWrap: 'pretty' }}
              >
                {impedimentoDeLaHoja}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {hoja === 'alta'
                  ? 'Un alta manual entra en la cuenta corriente y se cobra como cualquier otra deuda. Queda en la bitácora con tu usuario. Se registra UNA cuota por acto: el backend no admite rango todavía, así que «Cuota hasta» no viaja.'
                  : 'Elige arriba la obligación que se extingue: una por acto. El importe que se da de baja es el que el servidor publicó para ella a la fecha de la resolución; la causal se antepone a la observación, porque el cuerpo no tiene campo propio para ella.'}
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
                onClick={() => void (hoja === 'alta' ? darDeAltaLaDeuda() : darDeBajaLaDeuda())}
                disabled={registrando || impedimentoDeLaHoja !== undefined}
                title={impedimentoDeLaHoja}
                className="hov-acento-2"
                style={{ ...BOTON_PRIMARIO, opacity: registrando || impedimentoDeLaHoja !== undefined ? 0.55 : 1 }}
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
              {/* La hoja es un documento que se firma —«Declaro bajo
                  juramento»— y sus cifras no las produce nadie: eran las de la
                  maqueta. Imprimir queda apagado con su motivo hasta que haya de
                  dónde sacarlas (#563). */}
              <button
                disabled
                aria-disabled="true"
                title={NO_SE_PUEDE_EMITIR_LA_DJ}
                style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, opacity: 0.55, cursor: 'not-allowed' }}
              >
                Imprimir
              </button>
            </div>

            <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
              <Aviso tono="warn" titulo="Esta hoja no se puede emitir todavía">
                {NO_SE_PUEDE_EMITIR_LA_DJ}
              </Aviso>
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
                  <p style={{ margin: 0 }}>DJ — — HR</p>
                  <p style={{ margin: '3px 0 0' }}>—</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>
                  Declaración jurada — hoja resumen
                </h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                  Impuesto predial del ejercicio {pref.ejercicio}
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
                {/* La identidad y el domicilio salían de la maqueta: el nombre,
                    el código y el DNI de una persona que no es la de nadie, en
                    la cabecera de un documento que se firma. */}
                {[...DJ_META.map((m) => ({ k: m.k, v: '—' })), { k: 'Ejercicio', v: pref.ejercicio }].map((m) => (
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
                  {/* Los dos predios con su valuación eran de la maqueta.
                      `DeclaracionJuradaResource` publica el número, el ejercicio,
                      el tipo, las fechas y el estado: ni el predio con su
                      ubicación y su uso, ni el % de propiedad, ni el valúo. */}
                  <tr style={{ borderTop: '1px solid var(--line)' }}>
                    <td colSpan={DJ_COLS.length} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)' }}>
                      Ninguna lectura publica los predios de la declaración con su valúo afecto: la hoja se emitirá cuando los haya.
                    </td>
                  </tr>
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
                {/* Los cuatro totales —valúo afecto, insoluto, derecho de
                    emisión y total a pagar— son el resultado de la determinación
                    del predial, que hoy no se puede pedir (#540). */}
                {DJ_TOTALES.map((x) => ({ k: x.k, v: '—' })).map((t) => (
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
      {/* Sólo en el expediente. `set()` marca `sucio` con CUALQUIER campo del
          módulo, así que la barra salía también sobre el formulario de la
          transferencia y sobre las dos hojas de deuda —donde teclear es
          redactar el acto, no editar una ficha— diciendo «Cambios sin guardar»
          de algo que ese botón no guarda. */}
      {sucio && esExpediente && (
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
          <p role="status" style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
            {NO_SE_PUEDE_GUARDAR_EL_EXPEDIENTE}
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
          {/* «Guardar cambios» decía «Contribuyente guardado» y no mandaba nada.
              Conectarlo tal cual sería peor: `PUT /rentas/contribuyentes/{id}`
              sólo admite `nombreRazonSocial`, `condicionEspecial` y `activo`, y
              los campos del expediente no se leen del backend —son constantes de
              la maqueta—, así que guardar sobrescribiría el nombre de una persona
              real con el de la maqueta. Queda apagado con su motivo (#552). */}
          <button
            disabled
            aria-disabled="true"
            title={NO_SE_PUEDE_GUARDAR_EL_EXPEDIENTE}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '10px 22px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              opacity: 0.55,
              cursor: 'not-allowed',
            }}
          >
            Guardar cambios
          </button>
        </div>
      )}
    </Shell>
  );
}


/**
 * A que filtros va lo tecleado. Devuelve **una lista**, y por un motivo concreto.
 *
 * El backend acota por cuatro campos distintos y la pantalla tiene uno solo, asi
 * que hay que elegir por la forma: ocho digitos es un DNI y lo que no son solo
 * digitos es un nombre. Pero **once digitos son a la vez un RUC y un codigo del
 * padron** —los 10 603 codigos de Catacaos tienen once posiciones con ceros por
 * delante—, y no hay nada en la cadena que los distinga. Elegir uno dejaba el
 * otro inalcanzable: `codigo=00000000008` devuelve una fila y `rUC=00000000008`
 * ninguna, asi que teclear un codigo del padron acababa en «Ningun contribuyente
 * con esos datos» y con la oferta de crearlo —duplicar en el padron a quien si
 * figura—. Se preguntan los dos y se une lo que vuelva; son dos igualdades
 * exactas sobre columnas indexadas, no dos barridos.
 */
function filtrosDelPadron(criterio: string): {
  codigo?: string;
  nombreRazonSocial?: string;
  dNI?: string;
  rUC?: string;
}[] {
  if (criterio === '') return [{}];
  const soloDigitos = /^[0-9]+$/.test(criterio);
  if (soloDigitos && criterio.length === 8) return [{ dNI: criterio }];
  if (soloDigitos && criterio.length === 11) return [{ rUC: criterio }, { codigo: criterio }];
  if (soloDigitos) return [{ codigo: criterio }];
  return [{ nombreRazonSocial: criterio }];
}

/**
 * El padron acotado por lo tecleado, con las dos lecturas del caso ambiguo ya
 * unidas.
 *
 * La union conserva el sobre paginado de la **primera** consulta que devuelva
 * algo, y suma los totales: no hay forma de paginar de verdad sobre dos
 * consultas, pero el caso que las necesita —once digitos exactos— devuelve una
 * fila o ninguna.
 */
async function padronPorCriterio(
  criterio: string,
  paginacion: { pagina?: number; tamano?: number },
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Contribuyente>> {
  const filtros = filtrosDelPadron(criterio);
  const respuestas = await Promise.all(filtros.map((f) => buscarContribuyentes(f, paginacion, senal)));
  if (respuestas.length === 1) return respuestas[0]!;
  const vistos = new Set<number>();
  const contenido: Contribuyente[] = [];
  for (const r of respuestas)
    for (const c of r.contenido)
      if (!vistos.has(c.id)) {
        vistos.add(c.id);
        contenido.push(c);
      }
  const primera = respuestas[0]!;
  return {
    ...primera,
    contenido,
    totalElementos: contenido.length,
    totalPaginas: contenido.length === 0 ? 0 : 1,
    hayMas: false,
  };
}

/**
 * Por qué la declaración jurada no se puede emitir.
 *
 * Es el único documento del módulo que se imprime para que alguien lo firme, y
 * traía dentro el nombre, el DNI, el domicilio, los dos predios con su valúo y
 * los cuatro totales de la maqueta. Ninguno tiene origen: la lectura de la DJ
 * publica su número, su ejercicio, su tipo, sus fechas y su estado, y la cuenta
 * del predial es la determinación, que hoy contesta 500 (#540).
 */
const NO_SE_PUEDE_EMITIR_LA_DJ =
  'La hoja resumen lleva el contribuyente, sus predios con el valúo afecto de cada uno y el impuesto que resulta, y ninguna lectura ' +
  'publica eso: «GET /rentas/declaraciones/{n}» da el número, el ejercicio, el tipo, las fechas y el estado de la declaración, y la ' +
  'cuenta la haría la determinación del predial, que hoy no se puede pedir (#540). Se imprimía con las cifras de la maqueta, bajo un ' +
  '«Declaro bajo juramento» (#563).';

/**
 * Por qué el expediente no se puede guardar.
 *
 * Los cincuenta campos que dibuja no se leen del backend —`ContribuyenteResource`
 * publica ocho— y `PUT /rentas/contribuyentes/{id}` sólo admite tres. Mandarlos
 * escribiría el nombre de la maqueta sobre el de quien esté abierto.
 */
const NO_SE_PUEDE_GUARDAR_EL_EXPEDIENTE =
  'Aquí todavía no se guarda nada: los campos de este expediente no se leen del padrón —son los de la maqueta— y la operación que ' +
  'corrige un contribuyente sólo admite el nombre o razón social, la condición especial y la baja. Guardar escribiría datos de otra ' +
  'persona sobre esta ficha (#552).';

/**
 * Por qué ninguna de las seis determinaciones puede escribir todavía.
 *
 * La primaria de las seis avisaba «Determinación asentada en la cuenta
 * corriente» y no mandaba nada: un acto que afirma haber escrito deuda sobre un
 * contribuyente y se queda en la pantalla. Las seis se apagan con su motivo, que
 * no es el mismo para todas.
 */
/**
 * Qué dice cada tabla de la determinación mientras no tenga filas.
 *
 * Las cinco traían las de la maqueta —dos predios con su valúo, cinco etapas de
 * una corrida de 62 418 cuentas, cuatro servicios de arbitrios con su tasa
 * mensual, tres ejercicios vehiculares al 1.0 %, tres espectáculos con su 10 %—.
 * Una cabecera sola no basta: se lee como «este contribuyente no tiene ninguno».
 */
const VACIA_EN_LA_DETERMINACION: Record<ClaveDeDeterminacion, string> = {
  predial:
    'Los predios que integran la base salen del cálculo, y el cálculo no se puede pedir todavía. Los del contribuyente se ven mientras tanto en Catastro.',
  masivo: 'Se llena con el resultado de la última corrida. No hay ninguna del ejercicio, y por eso no hay etapas que enseñar.',
  arbitrios:
    'La determinación por servicio depende de las tasas de la ordenanza local con su ratificación provincial, que todavía no están cargadas (D-02b).',
  vehicular: 'Los tres ejercicios afectos salen del cálculo vehicular, que hoy no se puede pedir.',
  espectaculos: 'Ninguna lectura del contrato lista los espectáculos declarados: no hay de dónde traer estas filas.',
  alcabala: 'Sin filas.',
};

const IMPEDIMENTO_DE_LA_DETERMINACION: Record<ClaveDeDeterminacion, string> = {
  predial:
    'La operación existe (POST /rentas/predial/calculo-individual) y contesta 500 en esta instalación: ningún ejercicio tiene conjunto ' +
    'de parámetros sellado y el borde no traduce esa falta (#540). Además le falta el dato que pide: el autovalúo declarado de cada ' +
    'predio —el sistema todavía no sabe valorizar uno— y esta pantalla no dibuja ningún campo para escribirlo.',
  masivo:
    'La corrida existe y responde, pero sobre un padrón declarado vacío: hoy devuelve «Padrón leído: 0 registros» porque ningún predio ' +
    'tiene autovalúo declarado. Ejecutarla desde aquí emitiría una corrida de ceros que quedaría como la última del ejercicio.',
  arbitrios:
    'GET /rentas/arbitrios es una lectura, y la acción de esta hoja es emitir la cuponera: un documento, que es la capa que todavía no ' +
    'está. Las cifras de los arbitrios son de ordenanza local con su ratificación provincial (D-02b, #189).',
  vehicular:
    'POST /rentas/vehicular/calculo existe y contesta 500 por lo mismo que el predial (#540). Y la acción de esta hoja es emitir la ' +
    'cuponera, que es un documento y no un cálculo.',
  alcabala:
    'El backend registra el acto y no acepta una marca de «calcula y no asientes nada», así que «Liquidar» no tiene a dónde ir. El ' +
    'autovalúo ajustado que la cuenta necesita depende del % de actualización, que no tiene fuente identificada (D-11).',
  espectaculos:
    'PeticionDeEspectaculo no tiene campo para las entradas vendidas, que es uno de los dos operandos de la base imponible del art. 56; ' +
    'y la alícuota se pide por una llave que no coincide con ninguno de los rótulos del desplegable.',
};

/** El filtro con que se pregunta por un documento: DNI si son ocho, RUC si once. */
function filtroDelDocumento(documento: string): { dNI?: string; rUC?: string } {
  const limpio = documento.replace(/[^0-9]/g, '');
  return limpio.length === 11 ? { rUC: limpio } : { dNI: limpio };
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
async function contribuyentePorDocumento(documento: string, senal?: AbortSignal): Promise<Contribuyente | null> {
  const limpio = documento.replace(/[^0-9]/g, '');
  if (limpio === '') return null;
  const r = await buscarContribuyentes(filtroDelDocumento(limpio), { tamano: 2 }, senal);
  return r.contenido.find((c) => c.numeroDocumento === limpio) ?? null;
}
