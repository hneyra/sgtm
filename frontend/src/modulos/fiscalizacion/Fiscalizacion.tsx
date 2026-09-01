import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import {
  listarOmisos,
  listarProgramas,
  listarMuestra,
  listarResultados,
  listarHistorico,
  leerEstadoDeCuenta,
  type ProgramaDeFiscalizacion,
  type FilaDeMuestra,
} from '../../api/fiscalizacion';
import { useRecurso, useRebote } from '../../api/useRecurso';
import { FalloDeLectura } from '../../api/Fallo';
import type { RespuestaPaginada } from '../../api/cliente';
import { ICO } from '../../ds/iconos';
import { Aviso, Insignia, type Tono } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  DEFECTOS,
  DET_PREDIAL,
  DET_VEHICULAR,
  DIFF,
  OPCIONES,
  PASOS_ACTA,
  REP_COLS,
  REP_FILAS,
  REP_META,
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

function Celdas({
  fila,
  cols,
  insignia,
  tonoInsignia,
}: {
  fila: string[];
  cols: ColDef[];
  insignia?: number;
  /* Cuando el tono lo decide el VALOR del enumerado y no el texto del rotulo.
     `tono()` clasifica por expresion regular sobre lo que se lee, y hay
     vocabularios —«Uso distinto», «No ubicado»— que no casan con ninguna y
     acaban en verde, que es el color de «conforme». */
  tonoInsignia?: Tono;
}) {
  return (
    <>
      {fila.map((c, j) =>
        j === insignia ? (
          <td key={j} style={{ padding: '11px 14px' }}>
            <Insignia tono={tonoInsignia ?? tono(c)}>{c}</Insignia>
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

/** Lo que se dibuja en un boton apagado: se ve, no se pulsa, y dice por que. */
const BOTON_APAGADO: CSSProperties = {
  borderRadius: 6,
  opacity: 0.5,
  cursor: 'not-allowed',
};

/** La paginacion de la tabla de deteccion. */
function Paginas({
  pagina,
  totalPaginas,
  hayMas,
  ir,
}: {
  pagina: number;
  totalPaginas: number;
  hayMas: boolean;
  ir: (n: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const linea: CSSProperties = { border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 14px', background: 'var(--bg-card)', fontSize: 12.5 };
  /* No hace falta apagarlos mientras la siguiente viaja —y en Catacaos viaja
     8,5 s (#561)—: `useRecurso` vacia `datos` en cuanto la pregunta cambia, asi
     que durante la espera no hay paginador que pulsar ni filas viejas debajo
     del numero nuevo. Medido: a 0,5 / 1,5 / 3 / 5 s de pulsar «Siguiente» la
     tabla tiene 0 filas y el pie dice «Consultando el padron…». */
  const atras = pagina === 0;
  const alante = hayMas;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
      <button
        onClick={() => ir(Math.max(0, pagina - 1))}
        disabled={atras}
        className="hov-linea"
        style={{ ...linea, opacity: atras ? 0.45 : 1, cursor: atras ? 'not-allowed' : 'pointer' }}
      >
        Anterior
      </button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
        Página {pagina + 1} de {totalPaginas}
      </span>
      <button
        onClick={() => ir(pagina + 1)}
        disabled={!alante}
        className="hov-linea"
        style={{ ...linea, opacity: alante ? 1 : 0.45, cursor: alante ? 'pointer' : 'not-allowed' }}
      >
        Siguiente
      </button>
    </div>
  );
}

/**
 * Lo que la tabla de deteccion dice de si misma: cuantas filas hay, de cuantas,
 * y —cuando no se puede decir— por que no.
 *
 * <h2>El total NO es el numero de coincidencias, y hay que decirlo</h2>
 *
 * `DeteccionDeOmisos` aplica `condicion` **despues de paginar**, y su propio
 * comentario lo explica: el total del sobre es el del padron —filtrado por
 * sector, eso si— y no el de las filas que sobreviven al filtro de condicion.
 * Medido: `?condicion=SUBVALUADOR` devuelve `contenido: []` con
 * `totalElementos: 25` en la muni 1 y `9445` en Catacaos.
 *
 * Asi que con condicion puesta no se puede escribir «0 de 25»: 25 no es «de».
 * Se dice lo unico cierto —cuantas trae ESTA pagina, sobre cuantos predios se
 * examinaron— y se avisa de que una pagina vacia no significa que no haya
 * ninguno. Es el issue #545, dicho donde se lee.
 */
function EstadoDeLaDeteccion({
  cargando,
  filas,
  pagina,
  conCondicion,
}: {
  cargando: boolean;
  filas: number;
  pagina: RespuestaPaginada<unknown> | null;
  conCondicion: boolean;
}) {
  if (cargando) {
    return <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando el padrón…</p>;
  }
  if (pagina === null) return null;

  const examinados = pagina.totalElementos;
  /* Con el padron vacio la salvedad sobra: no hay nada que el filtro pudiera
     estar escondiendo en otra pagina, porque no hay otra pagina. Repetirla ahi
     convertiria el aviso en ruido, y un aviso que sale siempre deja de leerse. */
  const acotaLaPagina = conCondicion && examinados > 0;
  const cuenta = acotaLaPagina
    ? `${filas} ${filas === 1 ? 'predio' : 'predios'} en esta página · ${examinados} examinados en total`
    : `${filas} de ${examinados} ${examinados === 1 ? 'predio' : 'predios'}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>{cuenta}</span>
      {acotaLaPagina && (
        <Aviso tono="warn" titulo="El total no cuenta las coincidencias">
          El backend aplica «Condición» sobre los {pagina.tamano} predios de cada página, no sobre el padrón entero, y el total que devuelve
          —{examinados}— es el de predios examinados. Una página sin filas <strong>no significa que no haya ninguno</strong>: hay que
          recorrerlas. Issue #545.
        </Aviso>
      )}
      {filas === 0 && !acotaLaPagina && (
        <Aviso tono="neutro" titulo="Sin resultados">
          {examinados === 0
            ? 'El padrón no devolvió ningún predio con estos filtros.'
            : 'Ningún predio de esta página entró en la detección.'}
        </Aviso>
      )}
    </div>
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
  /* El programa elegido es el ID de uno REAL, no el codigo de la maqueta.
     `PF-2026-014` no existe en ninguna de las dos municipalidades: la tabla
     `programa_fiscalizacion` tiene cero filas (#546). */
  const [programa, setPrograma] = useState<number | null>(null);
  /* Nace VACIA. Con `{0: true, 3: true}` la pantalla abria con dos predios
     REALES ya marcados —en la muni 1, C-000001 y C-000003— que nadie eligio, y
     programar una fiscalizacion abre un procedimiento sobre una persona
     concreta. La llave es la identidad de la fila, no su posicion. */
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
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
  /* ── Deteccion predial, contra `GET /fiscalizacion/omisos` ──── */
  const [sectorDet, setSectorDet] = useState('');
  const [condicionDet, setCondicionDet] = useState('');
  const [paginaDet, setPaginaDet] = useState(0);
  useEffect(() => setPaginaDet(0), [sectorDet, condicionDet, pref.ejercicio]);

  /* La seleccion pertenece a la consulta que la produjo. Cambiar de sector, de
     condicion, de ejercicio, de pagina o de pestaña la vacia: si sobreviviera,
     seguiria contando predios que ya no estan en pantalla, y quien atiende
     leeria «3 seleccionados» sin ver una sola casilla marcada. */
  useEffect(() => setMarcadas({}), [sectorDet, condicionDet, pref.ejercicio, paginaDet, detTab]);

  const omisos = useRecurso(
    (senal) =>
      listarOmisos(
        {
          ejercicio: pref.ejercicio,
          sector: sectorDet || undefined,
          condicion: condicionDet || undefined,
        },
        { pagina: paginaDet, tamano: TAMANO_DE_PAGINA },
        senal,
      ),
    [pref.ejercicio, sectorDet, condicionDet, paginaDet],
    dest === 'deteccion' && detTab === 0,
  );

  /**
   * Las filas de la deteccion predial, en la forma que el recurso publica.
   *
   * Las cuatro columnas de dinero llegan `null` y **seguiran llegando `null`**:
   * valorar un predio exige el cuadro de valores unitarios, la depreciacion y
   * el arancel, y ninguno esta firmado (D-02a). Salen «—», no cero: un cero se
   * lee como «no debe nada».
   *
   * Y se añaden las tres que el backend SI publica con cifra y el artboard no
   * dibuja: el area catastral, la declarada y su diferencia. Son lo unico
   * cuantificado que hoy distingue a un subvaluador.
   *
   * `llave` es la IDENTIDAD de la fila, no su posicion: el padron de omisos
   * multiplica por copropietario —25 filas para 22 predios en la muni 1— asi
   * que el codigo predial solo no basta, y el par (predio, titular) si es
   * unico. Con el indice, marcar la fila 3 y cambiar de pagina dejaba marcada
   * a OTRA persona.
   */
  /* `declaroFueraDePlazo` llega con valor y NO se dibuja: es el AC 3 de #49
     —quien declaro tarde no es omiso, le toca la multa del art. 176 y no la
     determinacion de oficio— y la pantalla todavia no distingue las dos cosas.
     No se anade por cuenta propia porque cambia la forma de la tabla del
     manual; queda en el issue #570 con lo que tendria que ensenar. */
  const filasDeOmisos: FilaDeDeteccion[] = (omisos.datos?.contenido ?? []).map((o) => ({
    llave: o.codRefCatastral + '·' + o.titular,
    /* El rotulo se dibuja desde el enumerado, no desde su texto: asi renombrar
       la etiqueta no puede cambiar el color, y un valor que no conozcamos sale
       tal cual en vez de disfrazado del que mas se le parezca. */
    condicion: o.condicion,
    celdas: [
      o.codRefCatastral,
      o.titular,
      etiquetaDeCondicion(o.condicion),
      o.areaCatastral ?? SIN_DATO,
      o.areaDeclarada ?? SIN_DATO,
      o.diferenciaDeArea ?? SIN_DATO,
      o.impuestoOmitidoS ?? SIN_DATO,
    ],
  }));

  const detAct = detTab === 0 ? DET_PREDIAL : DET_VEHICULAR;

  /* Las filas que la tabla dibuja de verdad, con su llave. Las del cruce
     vehicular siguen siendo las del prototipo —ese cruce no tiene backend— y
     se llavean por la placa, que ahi si es unica. */
  /**
   * Las filas del cruce VEHICULAR no se dibujan, y no es un olvido.
   *
   * `DET_VEHICULAR` son cuatro vehiculos del artboard —`V1H-882`, `C2P-704`…—
   * con su hallazgo y su deuda omitida: «S/ 3,384.00», «S/ 1,446.00». Ninguna
   * de esas cifras existe, y no hay **ninguna** operacion del cruce registral
   * en el contrato (#546, #504): la pestaña no pedia nada al backend y
   * enseñaba cuatro personas con nombre y una deuda inventada al lado. Un
   * fiscalizador que abre un procedimiento por «baja indebida · 1 446,00»
   * lo abre sobre un numero que nadie calculo.
   */
  const filasVisibles: FilaDeDeteccion[] = detTab === 0 ? filasDeOmisos : [];

  /* El contador se calcula sobre lo que hay EN PANTALLA, no sobre otro arreglo:
     asi el pie y las casillas no pueden discrepar ni aunque la seleccion
     sobreviva a algo. Antes contaba sobre `DET_PREDIAL`, del prototipo, que
     tiene cuatro filas: marcar las veinte de la pagina decia «(4)». */
  const marcadasN = filasVisibles.filter((f) => marcadas[f.llave] === true).length;

  const paginaDeOmisos = omisos.datos;

  /* ── Programas, contra `GET /fiscalizacion/programas` (#431) ── */
  const [buscaPrograma, setBuscaPrograma] = useState('');
  const programas = useRecurso(
    (senal) => listarProgramas({ nDePrograma: buscaPrograma || undefined }, { pagina: 0, tamano: TAMANO_DE_PAGINA }, senal),
    [buscaPrograma],
    dest === 'programas' || dest === 'panel',
  );
  const listaDeProgramas: ProgramaDeFiscalizacion[] = programas.datos?.contenido ?? [];

  /* El primero de la lista, mientras nadie elija otro. Sin programas no hay
     ninguno elegido y todo lo que cuelga de el se queda sin pedir. */
  const programaActivo: ProgramaDeFiscalizacion | null =
    listaDeProgramas.find((x) => x.id === programa) ?? listaDeProgramas[0] ?? null;

  /* ── La muestra del programa elegido (#481) ─────────────────── */
  const [paginaMuestra, setPaginaMuestra] = useState(0);
  useEffect(() => setPaginaMuestra(0), [programaActivo?.id]);
  const muestra = useRecurso(
    (senal) => listarMuestra(programaActivo?.id ?? 0, { pagina: paginaMuestra, tamano: TAMANO_DE_PAGINA }, senal),
    [programaActivo?.id, paginaMuestra],
    (dest === 'programas' || dest === 'panel') && programaActivo !== null,
  );

  /* ── Resultados, contra `GET /fiscalizacion/resultados` (#49) ── */
  const [paginaRes, setPaginaRes] = useState(0);
  useEffect(() => setPaginaRes(0), [resTab]);
  const resultados = useRecurso(
    (senal) => listarResultados({}, { pagina: paginaRes, tamano: TAMANO_DE_PAGINA }, senal),
    [paginaRes],
    dest === 'resultados' && resTab === 0,
  );

  /* Las dos cifras del embudo que SI se pueden leer, acotadas al programa: son
     la misma consulta de resultados con su filtro, y de ellas solo se lee el
     total del sobre. No se componen aqui: se preguntan. */
  const liquidadas = useRecurso(
    (senal) => listarResultados({ programa: String(programaActivo?.id ?? 0) }, { pagina: 0, tamano: 1 }, senal),
    [programaActivo?.id],
    dest === 'panel' && programaActivo !== null,
  );
  const notificadas = useRecurso(
    (senal) =>
      listarResultados({ programa: String(programaActivo?.id ?? 0), estado: 'NOTIFICADA' }, { pagina: 0, tamano: 1 }, senal),
    [programaActivo?.id],
    dest === 'panel' && programaActivo !== null,
  );

  /* ── El estado de cuenta de un contribuyente (RF-056) ────────── */
  const [contribuyenteRes, setContribuyenteRes] = useState('');
  const contribuyenteReposado = useRebote(contribuyenteRes);
  const estadoDeCuenta = useRecurso(
    (senal) => leerEstadoDeCuenta(contribuyenteReposado.trim(), senal),
    [contribuyenteReposado],
    dest === 'resultados' && resTab === 1 && contribuyenteReposado.trim() !== '',
  );

  /* ── El historico del proceso (AC 5 de #49) ─────────────────── */
  const [paginaHist, setPaginaHist] = useState(0);
  const historico = useRecurso(
    (senal) => listarHistorico({}, { pagina: paginaHist, tamano: TAMANO_DE_PAGINA }, senal),
    [paginaHist],
    dest === 'resultados' && resTab === 2,
  );

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

            {programas.error !== null && (
              <FalloDeLectura error={programas.error} que="los programas de fiscalización" acceso="fisc_programa" alReintentar={programas.reintentar} />
            )}

            <section style={TARJETA}>
              <div style={CABECERA}>
                {/* La cabecera nombraba «Programa PF-2026-014 · predial
                    selectivo, sector 02» y su plazo «17/08 — 30/09». Ese
                    programa no existe: `programa_fiscalizacion` tiene cero filas
                    en las dos municipalidades (#546). */}
                <h2 style={H2}>
                  {programaActivo === null
                    ? 'El embudo de un programa'
                    : `Programa ${programaActivo.codigo} · ${programaActivo.descripcion}`}
                </h2>
                <span style={META}>
                  {programaActivo === null ? SIN_DATO : programaActivo.fechaInicio + ' — ' + (programaActivo.fechaFin ?? SIN_DATO)}
                </span>
              </div>

              <button
                onClick={() => onDest('deteccion')}
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
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>Detectados por el cruce de catastro contra rentas</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                    Otro conjunto: de aquí se elige la muestra de cada programa. No es una etapa del embudo.
                  </span>
                </span>
                {/* «3,418» era del artboard. El universo del cruce lo cuenta la
                    deteccion, y su total NO se puede traer aqui sin repetir una
                    consulta que en el padron real tarda 8,5 s (#561). */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-3)' }}>{SIN_DATO}</span>
                <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
              </button>

              {etapasDelEmbudo(muestra.datos?.totalElementos ?? null, liquidadas.datos?.totalElementos ?? null, notificadas.datos?.totalElementos ?? null).map(
                (e, i) => (
                  <button
                    key={e.etapa}
                    onClick={() => onDest(e.dest)}
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
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{e.etapa}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{e.detalle}</span>
                    </span>
                    {/* La barra solo se dibuja cuando su cifra Y su base son
                        dos lecturas. Sin las dos no hay proporcion que pintar, y
                        una barra a medias se lee como un avance. */}
                    <span style={{ flex: 1, minWidth: 50, height: 22, borderRadius: 5, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      {e.parte !== null && (
                        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${e.parte.toFixed(1)}%`, background: 'var(--accent)', opacity: 0.42 + i * 0.15 }} />
                      )}
                    </span>
                    <span style={{ flex: '0 0 46px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {e.parte === null ? SIN_DATO : `${e.parte.toFixed(0)} %`}
                    </span>
                    <span style={{ flex: '0 0 62px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                      {e.valor === null ? SIN_DATO : e.valor}
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={FLECHA} />
                  </button>
                ),
              )}

              <div style={{ padding: '11px 16px' }}>
                <Aviso tono="warn" titulo="El embudo se lee a trozos, y hay que decir cuáles">
                  {/* #505: «el embudo pide nueve cifras y el contrato publica
                      dos». Aqui se leen tres —el tamaño de la muestra y los dos
                      totales de resultados— y las demas se dicen «—». */}
                  «Inspeccionados» no lo cuenta ninguna operación: la muestra publica <code>visitado</code> fila a fila y nadie publica su
                  recuento. «Detectados» tampoco se trae: sería repetir una consulta que en el padrón real tarda 8,5 s (#561). Lo que sí se
                  lee es el tamaño de la muestra y los dos totales de resultados, cada uno de su propia consulta. Issues #505 y #546.
                </Aviso>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {/* Las cuatro tarjetas del artboard eran «84 de 96», «63.5 %»,
                  «S/ 214,882» y «3 reclamadas», y ninguna de las cuatro se puede
                  leer: no hay recuento de actas, la efectividad es un cociente
                  que nadie publica ni define, el importe es D-02a (#198) y
                  `EstadoDeLiquidacion` no tiene ningun estado «reclamada». Las
                  cuatro se sustituyen por cuatro totales que SI son lecturas. */}
              {[
                { valor: programas.datos?.totalElementos ?? null, etiqueta: 'Programas registrados', nota: 'Los que devuelve la consulta de programas.' },
                { valor: muestra.datos?.totalElementos ?? null, etiqueta: 'Predios en la muestra', nota: 'Del programa que está seleccionado arriba.' },
                { valor: liquidadas.datos?.totalElementos ?? null, etiqueta: 'Liquidaciones', nota: 'Actas de ese programa que llegaron a liquidarse.' },
                { valor: notificadas.datos?.totalElementos ?? null, etiqueta: 'Notificadas', nota: 'Las mismas, con el filtro de estado NOTIFICADA.' },
              ].map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
                    {k.valor === null ? SIN_DATO : k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={CABECERA}>
                {/* «Tu ruta de hoy» eran tres predios con direccion, riesgo y
                    hora —10:00, 11:30, 15:00— y no hay ninguna operacion de
                    ruta: ni de hoy, ni de nadie. Lo que si se puede leer es que
                    de la muestra de este programa estas filas siguen sin acta. */}
                <h2 style={H2}>Pendientes de visita</h2>
                <span style={META}>
                  {muestra.datos === null ? SIN_DATO : `${pendientesDeVisita(muestra.datos.contenido).length} en esta página de la muestra`}
                </span>
              </div>

              {muestra.error !== null && (
                <div style={{ padding: '12px 16px' }}>
                  <FalloDeLectura error={muestra.error} que="la muestra del programa" acceso="fisc_programa" alReintentar={muestra.reintentar} />
                </div>
              )}

              {pendientesDeVisita(muestra.datos?.contenido ?? []).map((f) => (
                <div
                  key={String(f.predioId) + '·' + String(f.contribuyenteId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)', padding: '13px 16px' }}
                >
                  <Insignia tono={tonoDeCondicion(f.condicion)}>{etiquetaDeCondicion(f.condicion)}</Insignia>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{f.codRefCatastral}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                      {f.titular} · sector {f.sector ?? SIN_DATO}
                    </span>
                  </span>
                  {/* Ni hora ni riesgo: la muestra no publica ninguno de los
                      dos, y la hora del artboard era la de una visita inventada. */}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: '0 0 auto' }}>sorteado {f.fechaSorteo}</span>
                </div>
              ))}

              {programaActivo === null ? (
                <div style={{ padding: '11px 16px' }}>
                  <Aviso tono="neutro" titulo="No hay ningún programa">
                    Sin programa no hay muestra, y sin muestra no hay a quién visitar. Un programa se registra con{' '}
                    <code>POST /fiscalizacion/programas</code>, y esta interfaz todavía no dibuja ese formulario. Issue #550.
                  </Aviso>
                </div>
              ) : muestra.cargando ? (
                <p style={PIE}>Consultando la muestra…</p>
              ) : muestra.error === null && pendientesDeVisita(muestra.datos?.contenido ?? []).length === 0 ? (
                <div style={{ padding: '11px 16px' }}>
                  <Aviso tono="neutro" titulo="Nada pendiente en esta página">
                    Ninguna fila de esta página de la muestra está sin visitar. No hay operación que cuente las pendientes del programa
                    entero: <code>visitado</code> viaja fila a fila. Issue #546.
                  </Aviso>
                </div>
              ) : null}
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
              {/* El cruce predial NO es un lote nocturno: `DeteccionDeOmisos`
                  resuelve el padron contra las declaraciones del ejercicio en
                  la propia peticion, a la fecha de hoy. «Actualizacion diaria»
                  —lo que decia el prototipo— prometia una foto reciente que
                  nadie toma, y con ella la excusa de que un predio que falta
                  «entrara mañana». */}
              <span data-sm-hide="1" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>
                {detTab === 0
                  ? 'Cruce de catastro contra las declaraciones del ejercicio, resuelto al consultar'
                  : /* «última importación 11/08/2026» es una fecha del artboard: no
                       hay importacion ninguna, porque no hay cruce. */
                    'Cruce del padrón vehicular contra SUNARP, SUNAT y MTC — sin operación todavía'}
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
                {detTab === 0 ? (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Sector</span>
                      <input
                        value={sectorDet}
                        onChange={(e) => setSectorDet(e.target.value)}
                        placeholder="01"
                        style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Condición</span>
                      <select
                        value={condicionDet}
                        onChange={(e) => setCondicionDet(e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                      >
                        <option value="">Todas</option>
                        {/* Los CINCO del enumerado, no dos. El desplegable
                            ofrecia OMISO y SUBVALUADOR, y la consulta acepta
                            los cinco: quien buscara un predio no ubicado no
                            tenia como pedirlo. */}
                        {CONDICIONES.map((c) => (
                          <option key={c.valor} value={c.valor}>
                            {c.valor}
                          </option>
                        ))}
                      </select>
                    </label>
                    {/* «Ordenar por» del artboard ofrece tres campos y los tres
                        dan 422 ORDEN_NO_ADMITIDO. No se dibuja. */}
                    <p style={{ margin: 0, gridColumn: '1 / -1', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      «Ordenar por» no se ofrece: los tres campos que el manual propone —impuesto omitido, diferencia de valor, sector— los
                      rechaza el backend con «orden no admitido».
                    </p>
                  </>
                ) : (
                  <>
                    {/* Los tres filtros del cruce registral se dibujan y NO se
                        pueden usar: no hay ninguna operacion que los reciba, asi
                        que un desplegable vivo prometeria una busqueda que no se
                        hace. Mismo trato que los filtros bloqueados de #322. */}
                    {detAct.filtros.map((f) => (
                      <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                        <select
                          disabled
                          value={filtroDe(f.label, f.valor)}
                          onChange={(e) => setFiltros((s) => ({ ...s, [detTab + ':' + f.label]: e.target.value }))}
                          title="El cruce registral no tiene ninguna operación en el backend: no hay nada que filtrar."
                          style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5, opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          {f.opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <p style={{ margin: 0, gridColumn: '1 / -1', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Los tres filtros están bloqueados: no hay ninguna operación del cruce registral en el contrato, así que no hay nada
                      que filtrar.
                    </p>
                  </>
                )}
              </div>
              {/* Una lectura que falla NO es una tabla vacia: sin esto, un 403
                  sobre `fisc_omisos` y una red caida se dibujan los dos como
                  «este ejercicio no tiene omisos», que es la lectura contraria
                  a la verdadera. */}
              {detTab === 0 && omisos.error !== null && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  <FalloDeLectura error={omisos.error} que="la detección de omisos" acceso="fisc_omisos" alReintentar={omisos.reintentar} />
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: detAct.min }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                      <Cabeceras cols={detTab === 0 ? COLUMNAS_DE_OMISOS : detAct.cols} />
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisibles.map((f) => {
                      const on = marcadas[f.llave] === true;
                      return (
                        /* La clave es la IDENTIDAD de la fila. El codigo predial
                           solo no vale: el padron de omisos multiplica por
                           copropietario —25 filas para 22 predios en la muni 1—
                           y el par (predio, titular) si es unico (comprobado:
                           25 de 25). El indice tampoco valia, y ese era el
                           defecto: marcar la fila 3 y pasar de pagina dejaba
                           marcada a otra persona. */
                        <tr key={f.llave} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setMarcadas((x) => ({ ...x, [f.llave]: !on }))}
                              /* Nombra las DOS partes: con solo el codigo, las
                                 filas de un predio en copropiedad tenian dos
                                 casillas con el mismo nombre accesible. */
                              aria-label={'Seleccionar ' + f.celdas[0] + ' de ' + f.celdas[1]}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                          </td>
                          <Celdas
                            fila={f.celdas}
                            cols={detTab === 0 ? COLUMNAS_DE_OMISOS : detAct.cols}
                            insignia={detTab === 0 ? 2 : 5}
                            tonoInsignia={detTab === 0 ? tonoDeCondicion(f.condicion) : undefined}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Ni una tabla vacia en silencio ni un total que no es el que
                  parece. Los dos casos se dicen por separado. */}
              {detTab === 0 && omisos.error === null && (
                <EstadoDeLaDeteccion cargando={omisos.cargando} filas={filasDeOmisos.length} pagina={paginaDeOmisos} conCondicion={condicionDet !== ''} />
              )}
              {detTab === 0 && paginaDeOmisos !== null && (
                <Paginas pagina={paginaDeOmisos.pagina} totalPaginas={paginaDeOmisos.totalPaginas} hayMas={paginaDeOmisos.hayMas} ir={setPaginaDet} />
              )}
              {detTab === 1 && (
                <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                  <Aviso tono="neutro" titulo="El cruce registral todavía no se puede consultar">
                    No hay ninguna operación del cruce del padrón vehicular contra SUNARP, SUNAT y MTC: ni lectura ni filtros. Las cuatro
                    filas que el diseño dibuja aquí —cuatro placas, cuatro contribuyentes con nombre, un hallazgo y una deuda omitida cada
                    una— son la muestra del artboard, y no se enseñan: un importe puesto al lado de una placa es indistinguible de una deuda
                    de verdad en cuanto sale de la pantalla. Issues #546 y #504.
                  </Aviso>
                </div>
              )}

              <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                {detAct.nota}
                {detTab === 0 && (
                  <>
                    {' '}
                    La consulta publica además si el contribuyente declaró fuera de plazo, y esta tabla todavía no lo dibuja: declarar tarde
                    no convierte a nadie en omiso —es la multa del art. 176, no una determinación de oficio—. Issue #570.
                  </>
                )}
              </p>
            </section>

            {/* Las dos acciones estan APAGADAS, y el motivo se lee en pantalla
                —no en un `title` que nadie abre (RNF-082)—.

                «Programar fiscalizacion»: el backend NO tiene ninguna operacion
                que reciba una seleccion de predios. Lo que hay es `POST
                /fiscalizacion/programas`, que registra un programa con su
                codigo, su descripcion, su tipo y su fecha de inicio —cuatro
                campos que esta pantalla no dibuja—, y `POST
                /fiscalizacion/programas/{id}/muestra`, que SORTEA la muestra a
                partir de los parametros del programa y cuyo cuerpo lleva solo
                la observacion: su javadoc dice, con todas las letras, que a
                quien se fiscaliza lo deciden los parametros del programa y no
                la peticion. Asi que la seleccion no tiene a donde ir, y el
                toast anterior —«N registros añadidos a la muestra del
                PF-2026-014»— afirmaba un acto que nunca salio de la pantalla,
                sobre un programa que es del prototipo.

                «Notificar esquela»: no tenia ni `onClick`, y no hay ninguna
                ruta de esquela en el contrato. */}
            <Aviso tono="warn" titulo="Desde aquí todavía no se programa nada">
              La selección se queda en esta pantalla. Para que salga de ella el backend tendría que aceptar una lista de predios, y hoy no
              hay ninguna operación que la reciba: un programa se registra con su código, su descripción, su tipo y su fecha de inicio
              —cuatro datos que esta pantalla no pide— y su muestra se <em>sortea</em> a partir del sector, la condición y el ejercicio que
              el propio programa declara. Mientras tanto, la muestra se genera desde «Programas». Issue #550.
            </Aviso>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {marcadasN === 0
                  ? 'Marca los registros que quieras anotar. La marca no sale de esta pantalla.'
                  : marcadasN + (marcadasN === 1 ? ' registro marcado' : ' registros marcados') + ' en esta página.'}
              </p>
              <button
                disabled
                title="No hay ninguna operación de esquela en el contrato de la API."
                style={{ ...BOTON_APAGADO, border: '1px solid var(--line-2)', background: 'var(--bg-card)', padding: '10px 18px', fontSize: 13 }}
              >
                Notificar esquela
              </button>
              <button
                disabled
                title="Ninguna operación del backend recibe una selección de predios."
                style={{ ...BOTON_APAGADO, border: 0, background: 'var(--accent)', color: '#fff', padding: '11px 22px', fontSize: 13.5, fontWeight: 500 }}
              >
                Programar fiscalización
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
                  {/* El recuento sale del sobre, no de la longitud de la lista:
                      «3» era el numero de programas del artboard. */}
                  <span style={META}>{programas.datos === null ? SIN_DATO : programas.datos.totalElementos}</span>
                </div>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  <input
                    value={buscaPrograma}
                    onChange={(e) => setBuscaPrograma(e.target.value)}
                    placeholder="Nº de programa"
                    aria-label="Buscar por número de programa"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-elev)', fontSize: 13 }}
                  />
                </div>

                {programas.error !== null && (
                  <div style={{ padding: '12px 14px' }}>
                    <FalloDeLectura error={programas.error} que="los programas de fiscalización" acceso="fisc_programa" alReintentar={programas.reintentar} />
                  </div>
                )}

                {programas.error === null && programas.cargando && (
                  <p style={{ ...PIE, borderBottom: '1px solid var(--line)' }}>Consultando los programas…</p>
                )}

                {programas.error === null && !programas.cargando && listaDeProgramas.length === 0 && (
                  <div style={{ padding: '12px 14px' }}>
                    <Aviso tono="neutro" titulo="Todavía no hay ningún programa">
                      {/* Los tres del artboard —PF-2026-014, PF-2026-011,
                          PF-2025-032, con sus «96 predios», «618 vehiculos» y
                          «1,412 predios»— no existen: `programa_fiscalizacion`
                          tiene cero filas en las dos municipalidades (#546). */}
                      La consulta contestó sin ninguno. Un programa se registra con <code>POST /fiscalizacion/programas</code> —código,
                      descripción, tipo y fecha de inicio— y esta pantalla todavía no dibuja ese formulario. Issue #550.
                    </Aviso>
                  </div>
                )}

                {listaDeProgramas.map((prog) => {
                  const on = programaActivo?.id === prog.id;
                  return (
                    <button
                      key={prog.id}
                      onClick={() => setPrograma(prog.id)}
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
                          {prog.codigo}
                        </span>
                        <Insignia tono={tonoDelEstadoDelPrograma(prog.estado)}>{etiquetaDelEstadoDelPrograma(prog.estado)}</Insignia>
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, textWrap: 'pretty' }}>{prog.descripcion}</span>
                      {/* Solo lo que el recurso publica. El pie del artboard
                          decia «96 predios · R. Mendoza Cruz · 17/08 — 30/09»,
                          y el tamaño de la muestra no viene en esta fila: hay
                          que preguntarselo a `/muestra`, que es otra consulta. */}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                        {[prog.fiscalizador ?? SIN_DATO, prog.fechaInicio + ' — ' + (prog.fechaFin ?? SIN_DATO)].join(' · ')}
                      </span>
                    </button>
                  );
                })}

                <div style={{ padding: '11px 14px' }}>
                  {/* `POST /fiscalizacion/programas` existe, pero pide codigo,
                      descripcion, tipo y fecha de inicio, y aqui no hay ningun
                      campo donde teclearlos —ni el de observacion que toda
                      escritura exige (regla 10)—. Apagado, con el motivo. */}
                  <button
                    disabled
                    title="El alta pide código, descripción, tipo y fecha de inicio, y esta pantalla no dibuja ningún campo."
                    style={{ ...BOTON_APAGADO, width: '100%', border: '1px dashed var(--line-2)', borderRadius: 7, padding: 9, background: 'transparent', fontSize: 12.5, color: 'var(--ink-3)' }}
                  >
                    + Nuevo programa
                  </button>
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section style={TARJETA}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                    {resumenDelPrograma(programaActivo, muestra.datos?.totalElementos ?? null).map((r) => (
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
                    {/* Las dos son ediciones de un programa, y no hay ruta de
                        edicion: «reprogramar es registrar otro programa», dice
                        `ProgramasController`. Apagadas con su motivo. */}
                    <button
                      disabled
                      title="No hay ruta de edición de un programa: reprogramar es registrar otro."
                      style={{ ...BOTON_APAGADO, border: '1px solid var(--line-2)', padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12 }}
                    >
                      Reasignar fiscalizador
                    </button>
                    <button
                      disabled
                      title="No hay ruta de edición de un programa: reprogramar es registrar otro."
                      style={{ ...BOTON_APAGADO, border: 0, padding: '7px 15px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500 }}
                    >
                      Cerrar programa
                    </button>
                  </div>
                </section>

                <section style={TARJETA}>
                  <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                    <h2 style={H2}>Muestra del programa</h2>
                    <span style={META}>
                      {muestra.datos === null
                        ? SIN_DATO
                        : `${muestra.datos.totalElementos} ${muestra.datos.totalElementos === 1 ? 'predio' : 'predios'} · ${muestra.datos.contenido.length} visibles`}
                    </span>
                  </div>

                  {muestra.error !== null && (
                    <div style={{ padding: '12px 16px' }}>
                      <FalloDeLectura error={muestra.error} que="la muestra del programa" acceso="fisc_programa" alReintentar={muestra.reintentar} />
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead>
                        <tr>
                          <Cabeceras cols={COLUMNAS_DE_MUESTRA} />
                        </tr>
                      </thead>
                      <tbody>
                        {(muestra.datos?.contenido ?? []).map((f) => (
                          <tr key={String(f.predioId) + '·' + String(f.contribuyenteId)} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                            <td style={TD1}>{f.codRefCatastral}</td>
                            <td style={TD}>{f.titular}</td>
                            {/* «Uso declarado» y «Riesgo» no los publica
                                `MuestraResource`. El riesgo, ademas, no es un
                                concepto del backend: lo que hay es la CONDICION
                                del cruce, que es otra pregunta. */}
                            <td style={TD}>{SIN_DATO}</td>
                            <td style={TD}>{f.areaDeclarada ?? SIN_DATO}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <Insignia tono={tonoDeCondicion(f.condicion)}>{etiquetaDeCondicion(f.condicion)}</Insignia>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <Insignia tono={f.visitado ? 'ok' : 'neutro'}>{f.visitado ? 'Inspeccionado' : 'Programado'}</Insignia>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {programaActivo === null ? (
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Sin ningún programa elegido no hay muestra que consultar.</p>
                  ) : muestra.cargando ? (
                    <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando la muestra…</p>
                  ) : muestra.error === null && (muestra.datos?.contenido.length ?? 0) === 0 ? (
                    <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                      <Aviso tono="neutro" titulo="Este programa no ha sorteado su muestra">
                        La muestra se sortea con <code>POST /fiscalizacion/programas/{'{id}'}/muestra</code> a partir del sector, la
                        condición y el ejercicio que el programa declara, y esta pantalla no dibuja esa acción ni su campo de observación.
                        Issue #550.
                      </Aviso>
                    </div>
                  ) : null}

                  {muestra.datos !== null && (
                    <Paginas pagina={muestra.datos.pagina} totalPaginas={muestra.datos.totalPaginas} hayMas={muestra.datos.hayMas} ir={setPaginaMuestra} />
                  )}

                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    «Uso declarado» y «Riesgo» salen «—»: la muestra publica el predio, su titular, las áreas y si ya se visitó, y ninguna
                    de esas dos. La columna de condición es la del cruce que sorteó la muestra, no un criterio de riesgo. Issue #546.
                  </p>
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
                    /* El paso abierto se DECLARA. Se distinguia solo por el
                       color, que es una barrera para quien no lo percibe y
                       ademas deja al arnes contando el paso activo como un
                       boton inerte: pulsarlo no hace nada, y tiene razon en no
                       hacerlo. */
                    aria-current={i === pasoIdx ? 'step' : undefined}
                    style={{ flex: 1, height: grande ? 9 : 6, border: 0, borderRadius: 999, cursor: 'pointer', background: i <= pasoIdx ? 'var(--accent)' : 'var(--accent-soft)' }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
                {PASOS_ACTA.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => setPaso(i)}
                    aria-current={i === pasoIdx ? 'step' : undefined}
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
              {/* Decia «Borrador guardado en el dispositivo» y no guardaba en
                  ninguna parte, que es el acto deshonesto de esta revision en
                  su forma mas barata: un aviso de exito sin nada detras. Y aqui
                  no basta con implementarlo, porque el acta entera no se puede
                  mandar todavia (#546): un borrador de algo que no tiene a
                  donde ir es papel guardado que nadie va a recoger. */}
              <button
                disabled
                title="El acta todavía no se puede enviar, así que no hay borrador que guardar: la operación de registro pide nueve campos y esta pantalla dibuja veintitrés (#546)."
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: grande ? '13px 20px' : '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'not-allowed', opacity: 0.5 }}
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
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* De las cuatro cifras del artboard —96 actas cerradas, 61
                      con diferencia, S/ 214,882.40 y 63.5 % de efectividad—
                      solo UNA se puede leer: cuantas liquidaciones devuelve la
                      consulta. Las actas no las cuenta ningun endpoint (#546),
                      el importe es D-02a —`LiquidacionResource` no lleva ni un
                      `Dinero` (#198)— y la efectividad es un cociente que nadie
                      publica ni define. Las tres salen «—» con su motivo. */}
                  {[
                    ['Liquidaciones', resultados.datos === null ? SIN_DATO : String(resultados.datos.totalElementos), 0],
                    ['Actas cerradas', SIN_DATO, 0],
                    ['Deuda determinada', SIN_DATO, 0],
                    ['Efectividad', SIN_DATO, 1],
                  ].map((t) => (
                    <div key={String(t[0])} style={{ background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
                    </div>
                  ))}
                </div>
                <Aviso tono="warn" titulo="Tres de las cuatro cifras no se pueden dar">
                  «Actas cerradas» no la cuenta ninguna operación: no hay lectura de actas (#546). «Deuda determinada» y «Efectividad»
                  esperan a <strong>D-02a</strong>: la liquidación viaja sin un solo importe —insoluto omitido y multa llegan en blanco a
                  propósito—, y un cero ahí se lee como «no debe nada» (#198).
                </Aviso>
              </>
            )}

            {resTab === 0 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Actas con diferencia determinada</h2>
                  <span style={META}>
                    {resultados.datos === null
                      ? SIN_DATO
                      : `${resultados.datos.contenido.length} de ${resultados.datos.totalElementos}`}
                  </span>
                  <button
                    disabled
                    title="No hay ninguna operación de exportación en el contrato."
                    style={{ ...BOTON_APAGADO, border: '1px solid var(--line-2)', padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)' }}
                  >
                    Exportar Excel
                  </button>
                </div>

                {resultados.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={resultados.error} que="los resultados de fiscalización" acceso="fisc_resultados" alReintentar={resultados.reintentar} />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={COLUMNAS_DE_RESULTADOS} />
                      </tr>
                    </thead>
                    <tbody>
                      {(resultados.datos?.contenido ?? []).map((l) => (
                        <tr key={l.numero} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TD1}>{l.numero}</td>
                          <td style={TD}>{'v' + String(l.version)}</td>
                          <td style={TD}>{String(l.periodoDesde) + ' — ' + String(l.periodoHasta)}</td>
                          <td style={TD}>{l.tipoDeFiscalizacion}</td>
                          <td style={TD}>{l.motivoDeterminante}</td>
                          <td style={TD}>{l.numeroNotificacion ?? SIN_DATO}</td>
                          {/* Nunca una cifra: `esperaSusCifras` dice que las
                              lineas siguen sin importes, y `insolutoOmitido` es
                              `null` por contrato hasta D-02a. */}
                          <td style={TD}>{SIN_DATO}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={tonoDelEstadoDeLiquidacion(l.estado)}>{etiquetaDelEstadoDeLiquidacion(l.estado)}</Insignia>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {resultados.cargando ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando los resultados…</p>
                ) : resultados.error === null && (resultados.datos?.contenido.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="neutro" titulo="Sin resultados">
                      Ninguna acta ha llegado a liquidarse. <code>liquidacion_fiscalizacion</code> no tiene una sola fila en ninguna de las
                      dos municipalidades (#546).
                    </Aviso>
                  </div>
                ) : null}

                {resultados.datos !== null && (
                  <Paginas pagina={resultados.datos.pagina} totalPaginas={resultados.datos.totalPaginas} hayMas={resultados.datos.hayMas} ir={setPaginaRes} />
                )}

                <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                  «Deuda omitida» sale «—» en todas las filas: la liquidación no publica ni un importe hasta D-02a (#198). Las columnas son
                  las que <code>LiquidacionResource</code> publica; «Acta» era un número del artboard y lo que hay es el de la liquidación.
                </p>
              </section>
            )}

            {resTab === 1 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Deuda de fiscalización por contribuyente</h2>
                  <span style={META}>
                    {estadoDeCuenta.datos === null ? SIN_DATO : `al ${estadoDeCuenta.datos.fechaDeConsulta}`}
                  </span>
                </div>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                  {/* Esta vista es de UN contribuyente: `GET
                      /fiscalizacion/estado-cuenta` exige su codigo y contesta
                      404 si no esta en el padron. El artboard dibujaba cuatro
                      filas de ALBURQUEQUE INFANTE GENARO con «145.41» cada una
                      y un total de «S/ 581.65» sin haber preguntado por nadie. */}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 320 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Código de contribuyente</span>
                    <input
                      value={contribuyenteRes}
                      onChange={(e) => setContribuyenteRes(e.target.value)}
                      placeholder="C-000001"
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                    />
                  </label>
                </div>

                {estadoDeCuenta.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={estadoDeCuenta.error} que="el estado de cuenta de fiscalización" acceso="fisc_estado_cuenta" alReintentar={estadoDeCuenta.reintentar} />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr>
                        <Cabeceras cols={COLUMNAS_DE_ESTADO_DE_CUENTA} />
                      </tr>
                    </thead>
                    <tbody>
                      {(estadoDeCuenta.datos?.lineas ?? []).map((l, i) => (
                        <tr key={l.deuda + '·' + String(l.ano) + '·' + String(i)} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TD1}>{l.deuda}</td>
                          <td style={TD}>{String(l.ano)}</td>
                          <td style={TD}>{l.nomTrib}</td>
                          <td style={TD}>{l.unidad === null ? SIN_DATO : String(l.unidad)}</td>
                          {/* El importe SIEMPRE con su fecha: es un
                              `ImporteActualizado`, y la regla 9 dice que no hay
                              «la deuda» sino la deuda a una fecha. */}
                          <td style={TDN}>{l.importe === null ? SIN_DATO : 'S/ ' + l.importe.importe}</td>
                          <td style={TD}>{l.importe === null ? SIN_DATO : l.importe.actualizadoA}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Insignia tono={tonoDeCondicion(l.estad)}>{etiquetaDeCondicion(l.estad)}</Insignia>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {contribuyenteReposado.trim() === '' ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    Teclea un código de contribuyente: esta vista es de una persona, no del padrón entero.
                  </p>
                ) : estadoDeCuenta.cargando ? (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>Consultando el estado de cuenta…</p>
                ) : estadoDeCuenta.error === null && (estadoDeCuenta.datos?.lineas.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)' }}>
                    <Aviso tono="neutro" titulo="Sin deuda de fiscalización">
                      Este contribuyente no tiene ninguna obligación originada en una fiscalización a la fecha de consulta.
                    </Aviso>
                  </div>
                ) : (
                  <p style={{ ...PIE, borderTop: '1px solid var(--line)' }}>
                    Total{' '}
                    {estadoDeCuenta.datos?.total == null
                      ? SIN_DATO
                      : `S/ ${estadoDeCuenta.datos.total.importe} al ${estadoDeCuenta.datos.total.actualizadoA}`}
                    . La deuda de fiscalización lleva su propia fase para distinguirla de la emitida en el registro ordinario.
                  </p>
                )}
              </section>
            )}

            {resTab === 2 && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Versiones del proceso fiscalizador</h2>
                  <span style={META}>
                    {historico.datos === null ? SIN_DATO : `${historico.datos.totalElementos} versiones`}
                  </span>
                </div>

                {historico.error !== null && (
                  <div style={{ padding: '12px 16px' }}>
                    <FalloDeLectura error={historico.error} que="el histórico de fiscalización" acceso="fisc_historico" alReintentar={historico.reintentar} />
                  </div>
                )}

                {(historico.datos?.contenido ?? []).map((v) => (
                  <div key={v.version.numero} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
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
                      {v.version.version}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                        {v.version.numero} · {etiquetaDelEstadoDeLiquidacion(v.version.estado)}
                      </span>
                      {/* Lo que cambio respecto de la anterior lo dice el
                          backend, concepto a concepto. El artboard lo escribia
                          a mano —«Se corrigió el ECS de MALO a BUENO»—. */}
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        {v.cambios.length === 0
                          ? 'Sin cambios declarados respecto de la anterior.'
                          : v.cambios.map((c) => `${c.concepto}: ${c.antes ?? SIN_DATO} → ${c.despues ?? SIN_DATO}`).join(' · ')}
                      </span>
                      {v.importesSinCifra.length > 0 && (
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3, textWrap: 'pretty' }}>
                          Sin cifra todavía (D-02a): {v.importesSinCifra.join(', ')}.
                        </span>
                      )}
                    </span>
                    <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{v.version.fecha}</span>
                    </span>
                  </div>
                ))}

                {historico.cargando ? (
                  <p style={PIE}>Consultando el histórico…</p>
                ) : historico.error === null && (historico.datos?.contenido.length ?? 0) === 0 ? (
                  <div style={{ padding: '11px 16px' }}>
                    <Aviso tono="neutro" titulo="Sin versiones">
                      No hay ninguna liquidación, así que no hay proceso del que enseñar versiones (#546).
                    </Aviso>
                  </div>
                ) : null}

                {historico.datos !== null && (
                  <Paginas pagina={historico.datos.pagina} totalPaginas={historico.datos.totalPaginas} hayMas={historico.datos.hayMas} ir={setPaginaHist} />
                )}

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
                {/* El aviso anterior decia «61 resoluciones de determinacion
                    emitidas. La deuda entra hoy en la cuenta corriente.» sin
                    mandar nada: 61 es del artboard, y emitir es
                    `POST /fiscalizacion/transferencias`, que exige nLiquidacion,
                    documento de sustento, sustento y base legal —cuatro campos
                    que esta pantalla no dibuja— mas la observacion (regla 10). */}
                <button
                  disabled
                  title="Emitir exige el nº de liquidación, el documento de sustento, el sustento y la base legal, y esta pantalla no los pide."
                  style={{ ...BOTON_APAGADO, border: 0, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500 }}
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
            {/* Los dos botones nacen apagados, y no por precaución: no hay
                resolución que emitir. «Descargar PDF» estaba encendido y era
                INERTE —ni petición, ni navegación, ni aviso: se pulsaba y no
                pasaba nada—, y «Imprimir» sí funcionaba, que era peor: sacaba
                por la impresora una resolución de determinación entera con las
                cifras del artboard. */}
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                disabled
                aria-disabled="true"
                title="El contrato no publica ningún formato para esta resolución: GET /fiscalizacion/resoluciones/{numero} devuelve JSON y no admite ?formato."
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'not-allowed', opacity: 0.5 }}
              >
                Descargar PDF
              </button>
              <button
                disabled
                aria-disabled="true"
                title="No hay ninguna resolución leída: no hay qué imprimir."
                style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }}
              >
                Imprimir
              </button>
            </div>

            <div data-noprint="1" style={{ width: '100%', maxWidth: 820 }}>
              <Aviso tono="warn" titulo="Esta hoja está vacía a propósito">
                Traía la resolución completa del prototipo —número, contribuyente, R.U.C. y seis ejercicios con sus importes al céntimo— y
                se imprimía igual con la red cortada: ninguna de esas cifras venía del servidor. La resolución de verdad la sirve{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>GET /fiscalizacion/resoluciones/{'{numero}'}</code>, que exige un número
                que esta pantalla no tiene dónde teclear, y ese endpoint <strong style={{ fontWeight: 600 }}>no emite documento</strong>:
                no declara <code style={{ fontFamily: 'var(--font-mono)' }}>?formato</code>, al revés que la ficha del contribuyente o los
                padrones de tránsito. Lo que falta es de las dos partes, y está en el issue #593.
              </Aviso>
            </div>
            <section style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Sub Gerencia de Fiscalización Tributaria</p>
                </div>
                {/* El número y la fecha eran del artboard, y son lo que
                    identifica un acto administrativo: un número de resolución
                    inventado sobre un membrete es peor que ninguno. */}
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>{SIN_DATO}</p>
                  <p style={{ margin: '3px 0 0' }}>{SIN_DATO}</p>
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
              disabled
              title="El acta todavía no se puede enviar, así que no hay borrador que guardar (#546)."
              style={{ border: 0, borderRadius: 6, padding: '10px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }}
            >
              Guardar borrador
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/**
 * Las columnas de la deteccion predial, en la forma del recurso.
 *
 * «Valor catastral», «Valor declarado» y «Diferencia S/» del artboard se
 * sustituyen por las areas, que es lo unico que el backend cuantifica hoy. El
 * impuesto omitido se queda —es la cifra que da sentido a la pantalla— y sale
 * «—» mientras D-02a impida calcularlo.
 */
/**
 * Las columnas de «Omisos y subvaluadores», con lo que cada una es de verdad.
 *
 * Las tres de area **no son numeros**: `AreaM2.toString()` del backend devuelve
 * `valor.toPlainString() + " m2"`, o sea «180.50 m2», la cifra con su unidad
 * dentro. Se dibujan tal cual —partirlas para volver a formatearlas es como se
 * pierde un decimal (RNF-055)— y por eso van declaradas como texto: en una
 * columna numerica la unidad quedaba pegada detras de un numero alineado a la
 * derecha, prometiendo una cifra que no lo es. La unidad la lleva el dato, no
 * la cabecera, porque el dia que llegue en hectareas la cabecera mentiria.
 */
const COLUMNAS_DE_OMISOS: ColDef[] = [
  ['Cód. ref. catastral', 0],
  ['Titular', 0],
  ['Condición', 0],
  ['Área catastral', 0],
  ['Área declarada', 0],
  ['Diferencia de área', 0],
  ['Impuesto omitido S/', 1],
];

/** Las seis columnas de la muestra, con lo que el recurso publica de cada una. */
const COLUMNAS_DE_MUESTRA: ColDef[] = [
  ['Predio', 0],
  ['Contribuyente', 0],
  ['Uso declarado', 0],
  ['Área declarada', 0],
  ['Condición del cruce', 0],
  ['Estado', 0],
];

/**
 * El estado de un programa: `EstadoDePrograma` tiene TRES y el artboard dibujaba
 * dos rotulos —«En ejecución» y «Cerrado»— que no son ninguno de ellos letra por
 * letra. Se rotulan los tres que existen, y uno que no conozcamos sale tal cual.
 */
const ESTADOS_DE_PROGRAMA: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'ABIERTO', etiqueta: 'Abierto', tono: 'neutro' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', tono: 'warn' },
  { valor: 'CERRADO', etiqueta: 'Cerrado', tono: 'ok' },
];

function etiquetaDelEstadoDelPrograma(valor: string): string {
  return ESTADOS_DE_PROGRAMA.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

function tonoDelEstadoDelPrograma(valor: string): Tono {
  return ESTADOS_DE_PROGRAMA.find((e) => e.valor === valor)?.tono ?? 'neutro';
}

/**
 * Las seis celdas del resumen del programa.
 *
 * Cada una sale de un campo que `ProgramaResource` publica; la que no lo tiene
 * sale «—». «Muestra» es la unica que no esta en ese recurso: es el total del
 * sobre de `/muestra`, que es una lectura y no una cuenta compuesta aqui.
 */
function resumenDelPrograma(prog: ProgramaDeFiscalizacion | null, predios: number | null): [string, string][] {
  if (prog === null) {
    return [
      ['Programa', SIN_DATO],
      ['Tipo', SIN_DATO],
      ['Criterio de riesgo', SIN_DATO],
      ['Fiscalizador', SIN_DATO],
      ['Muestra', SIN_DATO],
      ['Plazo', SIN_DATO],
    ];
  }
  return [
    ['Programa', prog.codigo],
    ['Tipo', prog.tipo],
    /* El criterio es un `CondicionFiscalizada`, no la «SUBVALUACIÓN» del
       artboard: ese rotulo no es ninguno de los cinco del enumerado (#546). */
    ['Criterio de riesgo', prog.criterio === null ? SIN_DATO : etiquetaDeCondicion(prog.criterio)],
    ['Fiscalizador', prog.fiscalizador ?? SIN_DATO],
    ['Muestra', predios === null ? SIN_DATO : `${predios} ${predios === 1 ? 'predio' : 'predios'}`],
    ['Plazo', prog.fechaInicio + ' — ' + (prog.fechaFin ?? SIN_DATO)],
  ];
}

/** Las ocho columnas de resultados: lo que `LiquidacionResource` publica. */
const COLUMNAS_DE_RESULTADOS: ColDef[] = [
  ['Nº liquidación', 0],
  ['Versión', 0],
  ['Periodo', 0],
  ['Tipo', 0],
  ['Motivo determinante', 0],
  ['Nº notificación', 0],
  ['Deuda omitida S/', 0],
  ['Estado', 0],
];

/** Las siete del estado de cuenta. El importe va con su fecha al lado (regla 9). */
const COLUMNAS_DE_ESTADO_DE_CUENTA: ColDef[] = [
  ['Nº liquidación', 0],
  ['Año', 0],
  ['Tributo', 0],
  ['Unidad', 0],
  ['Importe S/', 1],
  ['Actualizado a', 0],
  ['Condición', 0],
];

/**
 * Los CINCO estados de `EstadoDeLiquidacion`. El artboard dibujaba
 * «Determinado», «Notificado», «Reclamado» y «Conforme», y de los cuatro
 * **ninguno** es un valor del enumerado letra por letra —«Reclamado» ni
 * siquiera existe— (#546). No se traducen: se ofrecen los que hay.
 */
const ESTADOS_DE_LIQUIDACION: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'ABIERTA', etiqueta: 'Abierta', tono: 'neutro' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso', tono: 'warn' },
  { valor: 'LIQUIDADA', etiqueta: 'Liquidada', tono: 'warn' },
  { valor: 'NOTIFICADA', etiqueta: 'Notificada', tono: 'ok' },
  { valor: 'ANULADA', etiqueta: 'Anulada', tono: 'bad' },
];

function etiquetaDelEstadoDeLiquidacion(valor: string): string {
  return ESTADOS_DE_LIQUIDACION.find((e) => e.valor === valor)?.etiqueta ?? valor;
}

function tonoDelEstadoDeLiquidacion(valor: string): Tono {
  return ESTADOS_DE_LIQUIDACION.find((e) => e.valor === valor)?.tono ?? 'neutro';
}

/**
 * Las cuatro etapas del embudo, con la cifra que cada una PUEDE leer.
 *
 * El artboard traia 96 / 84 / 61 / 38 sobre una base de 96, y ninguna de las
 * cuatro sale de ningun sitio: #505 lo dice —«el embudo pide nueve cifras y el
 * contrato publica dos»—. Aqui cada etapa es exactamente el total del sobre de
 * una consulta, y la que no tiene consulta vale `null` y se dibuja «—».
 *
 * La proporcion se calcula sobre la muestra, y solo cuando la cifra Y la base
 * son las dos lecturas: una barra pintada con una base supuesta se lee como un
 * avance, que es justo lo que un panel no puede inventarse.
 */
function etapasDelEmbudo(
  muestra: number | null,
  liquidadas: number | null,
  notificadas: number | null,
): { etapa: string; detalle: string; valor: number | null; parte: number | null; dest: string }[] {
  const proporcion = (valor: number | null): number | null =>
    valor === null || muestra === null || muestra === 0 ? null : (valor / muestra) * 100;
  return [
    { etapa: 'Programados', detalle: 'Predios sorteados en la muestra', valor: muestra, parte: proporcion(muestra), dest: 'programas' },
    {
      etapa: 'Inspeccionados',
      detalle: 'Nadie publica su recuento: «visitado» viaja fila a fila',
      valor: null,
      parte: null,
      dest: 'programas',
    },
    { etapa: 'Con liquidación', detalle: 'Actas del programa que llegaron a liquidarse', valor: liquidadas, parte: proporcion(liquidadas), dest: 'resultados' },
    { etapa: 'Notificadas', detalle: 'Las mismas, con estado NOTIFICADA', valor: notificadas, parte: proporcion(notificadas), dest: 'resultados' },
  ];
}

/** Lo que sigue sin acta en la pagina de muestra que se trajo. */
function pendientesDeVisita(filas: FilaDeMuestra[]): FilaDeMuestra[] {
  return filas.filter((f) => !f.visitado);
}

/** Lo que se dibuja donde el backend no publica cifra. */
const SIN_DATO = '—';

/** Cuantas filas se piden por pagina. */
const TAMANO_DE_PAGINA = 20;

/** Una fila de la tabla de deteccion, con la identidad que la selecciona. */
type FilaDeDeteccion = {
  /** Identifica la fila. Para el predial, `codRefCatastral·titular`. */
  llave: string;
  /** El valor del enumerado tal como viaja, no su rotulo. */
  condicion: string;
  celdas: string[];
};

/**
 * Las CINCO condiciones de `CondicionFiscalizada`, letra por letra.
 *
 * El enumerado del backend tiene cinco valores y el desplegable ofrecia dos.
 * Peor: el rotulo se resolvia con `condicion === 'OMISO' ? 'Omiso' :
 * 'Subvaluador'`, asi que en cuanto exista una declaracion jurada un predio
 * CONFORME —o uno NO_UBICADO, que es «no se pudo verificar»— saldria rotulado
 * «Subvaluador» y teñido de ambar. Los cinco los acepta la consulta
 * (comprobado: `?condicion=CONFORME` da 200; `?condicion=BASURA`, 422).
 *
 * El tono sale del VALOR y no del texto: `tono()` clasifica por expresion
 * regular sobre el rotulo, y ahi «Uso distinto» y «No ubicado» caian en verde
 * —el color de «conforme»— porque no casan con ningun patron.
 */
const CONDICIONES: { valor: string; etiqueta: string; tono: Tono }[] = [
  { valor: 'CONFORME', etiqueta: 'Conforme', tono: 'ok' },
  { valor: 'OMISO', etiqueta: 'Omiso', tono: 'bad' },
  { valor: 'SUBVALUADOR', etiqueta: 'Subvaluador', tono: 'warn' },
  { valor: 'USO_DISTINTO', etiqueta: 'Uso distinto', tono: 'warn' },
  { valor: 'NO_UBICADO', etiqueta: 'No ubicado', tono: 'neutro' },
];

/** El rotulo de una condicion. Una que no conozcamos sale TAL CUAL. */
function etiquetaDeCondicion(valor: string): string {
  return CONDICIONES.find((c) => c.valor === valor)?.etiqueta ?? valor;
}

/** El tono de una condicion. Una que no conozcamos no se colorea. */
function tonoDeCondicion(valor: string): Tono {
  return CONDICIONES.find((c) => c.valor === valor)?.tono ?? 'neutro';
}
