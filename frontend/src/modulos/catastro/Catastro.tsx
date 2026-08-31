import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import type { PantallaProps } from '../../App';
import { listarPredios, titularesDelPredio, type EstadoDePredio, type PredioDelCatastro } from '../../api/catastro';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { ErrorDeApi } from '../../api/cliente';
import {
  BASE,
  CAPAS,
  CODIGO_YA_USADO,
  COLS_REPORTE,
  COLS_VIAS,
  DEFECTOS_DE_FICHA_NUEVA,
  FILAS_REPORTE,
  GRUPOS,
  KPIS,
  LOTE_SELECCIONADO,
  MANZANAS_DEL_SECTOR,
  MODALIDADES,
  MODOS,
  OPCIONES,
  PENDIENTES,
  PESTANIAS_DE_VALORES,
  REPORTE_META,
  SECTORES,
  SECTORES_DEL_MAPA,
  TRAMOS,
  VIAS,
  tablasDeValores,
  type BloqueDeFicha,
  type CampoDeFicha,
  type ColumnaDeTabla,
  type Modalidad,
  type ValoresDeFicha,
} from '../../datos/catastro';

/* ══════════ Los estilos que el artboard declara como constantes ══════════ */
const IN: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-elev)',
  fontSize: 13.5,
};
const IN_ERR: CSSProperties = { ...IN, border: '1px solid var(--error-texto)' };
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

type Tono = 'ok' | 'warn' | 'bad';
const INS: Record<Tono, CSSProperties> = {
  ok: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--ok-bg)', color: 'var(--ok-fg)' },
  warn: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--warn-bg)', color: 'var(--warn-fg)' },
  bad: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bad-bg)', color: 'var(--bad-fg)' },
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
const CABECERA_SECCION: CSSProperties = {
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
  borderTop: '1px solid var(--line)',
  background: 'var(--bg-elev)',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--ink-3)',
  textWrap: 'pretty',
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

const CARET = ['M6 9l6 6 6-6'];
const LUPA = ['M17.4 11a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0', 'M15.8 15.8 20.6 20.6'];

/** La tabla que el artboard arma con `columnas()` y `filas()`: la primera celda
 *  en tinta fuerte, las numéricas en mono a la derecha. */
function TablaDelArtboard({
  cols,
  filas,
  min,
}: {
  cols: readonly ColumnaDeTabla[];
  filas: readonly (readonly string[])[];
  min?: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: min }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} style={c[1] ? THN : TH}>
                {c[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => (
            <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
              {r.map((cl, j) => (
                <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                  {cl}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Una sección de la ficha, ya resuelta: sus bloques visibles y lo que falta. */
type SeccionResuelta = {
  id: string;
  label: string;
  hint: string;
  clave: string;
  bloques: BloqueDeFicha[];
  faltan: number;
  abierta: boolean;
};

export default function Catastro({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();
  const m = moduloDe('catastro');

  /* `alta` es la ficha nueva; dentro de `predios`, un código abierto es la
     ficha de un predio existente. Los dos son la misma pantalla. */
  const [predio, setPredio] = useState<string | null>(null);
  /* `modoInicial` es una prop del artboard —«Una página» por omisión—; aquí es
     estado del módulo y lo escribe el conmutador de la ficha. */
  const [modoElegido, setModo] = useState<'pagina' | 'pasos'>('pagina');
  const [pasoEstado, setPaso] = useState(0);
  const [cerradas, setCerradas] = useState<Record<string, boolean>>({});
  const [vals, setVals] = useState<ValoresDeFicha>({});
  const [sucio, setSucio] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [q, setQ] = useState('');
  /* Los cuatro filtros que `PredioController` admite, y ni uno más. */
  const [fSector, setFSector] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoDePredio>('');
  const [fFichado, setFFichado] = useState('');
  const [pagina, setPagina] = useState(0);
  const [valTab, setValTab] = useState(0);
  const [sectorAbierto, setSectorAbierto] = useState('01');
  const [capas, setCapas] = useState<Record<string, boolean>>({
    predios: true,
    vias: true,
    manzanas: true,
    sectores: true,
    aranceles: false,
  });
  const [lote, setLote] = useState('M-06-04');
  const [zoom, setZoom] = useState(100);
  const [modalidades, setModalidades] = useState<Record<Modalidad, boolean>>({
    urbana: true,
    economica: true,
    bienes: false,
    rural: false,
  });
  /* `mostrarSiglas` es una prop del artboard —sección «Interfaz»—; aquí es
     estado del módulo, con su conmutador en la fila de modalidades. */
  const [mostrarSiglas, setMostrarSiglas] = useState(true);
  const reloj = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(reloj.current), []);

  const esNuevo = dest === 'alta';
  const esPredio = esNuevo || (dest === 'predios' && predio !== null);
  /* Una ficha nueva se registra siempre por pasos: el artboard lo fija al
     abrirla y esconde el conmutador mientras dura. Derivarlo —en vez de
     dejarlo en el estado— es lo que hace que entrar por la URL a `/alta`
     dibuje el asistente y no la página entera. */
  const modo: 'pagina' | 'pasos' = esNuevo ? 'pasos' : modoElegido;

  /* En una ficha nueva no hay datos: todo queda en blanco salvo lo que la
     municipalidad ya sabe y las marcas que arrancan apagadas. Así la cuenta de
     pendientes cuenta de verdad lo que falta. */
  const d = useMemo<ValoresDeFicha>(() => {
    if (!esNuevo) return BASE;
    const vaciados: ValoresDeFicha = {};
    Object.keys(BASE).forEach((k) => {
      vaciados[k] = BASE[k] === true || BASE[k] === false ? false : '';
    });
    return { ...vaciados, ...DEFECTOS_DE_FICHA_NUEVA };
  }, [esNuevo]);

  const valor = (k: string): string | boolean => {
    const v = vals[k];
    return v === undefined ? d[k] ?? '' : v;
  };
  const txt = (k: string): string => {
    const v = valor(k);
    return typeof v === 'boolean' ? '' : v;
  };
  const fijarCampo = (k: string, v: string | boolean) => {
    setVals((x) => ({ ...x, [k]: v }));
    setSucio(true);
  };

  /* ── Navegación ─────────────────────────────────────────────── */

  const nuevaFicha = () => {
    setModo('pasos');
    setPaso(0);
    setVals({});
    setCerradas({});
    setSucio(false);
    setPredio(null);
    onDest('alta');
    toast('Ficha nueva: empieza por componer el código catastral.');
  };

  /** El panel de destinos y el botón de acción del shell pasan por aquí: salir
   *  de una ficha es volver al padrón, no quedarse dentro de ella. */
  const irA = (k: string) => {
    if (k === 'alta') {
      nuevaFicha();
      return;
    }
    setPredio(null);
    onDest(k);
  };

  const abrirPredio = (codigo: string) => {
    setPredio(codigo);
    setPaso(0);
    setSucio(false);
    onDest('predios');
  };

  /* Las trece opciones del manual, tal cual las lista la paleta del artboard.
     No se memoiza: cada entrada cierra sobre `irA`, que cambia con el destino. */
  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Catastro',
    ir: () => (o[1] === 'predio' ? abrirPredio('01-1042-0004') : irA(o[1])),
  }));

  /* ── Las secciones de la ficha ───────────────────────────────── */

  const secciones = useMemo<SeccionResuelta[]>(() => {
    if (!esPredio) return [];
    const grupos = GRUPOS.map((g) => {
      const bloques = g.bloques
        .filter((b) => !b.modalidad || modalidades[b.modalidad])
        /* En una ficha nueva el código se compone en la tarjeta de cabecera,
           que está visible en los seis pasos: repetir el campo compuesto dentro
           de «Identificación» ponía dos controles para el mismo dato. */
        .map((b) => (esNuevo ? { ...b, campos: b.campos.filter((f) => f.k !== 'cod') } : b))
        /* Un bloque se cae solo si se queda sin nada que enseñar. El artboard
           mira únicamente `campos`, y eso se llevaba por delante «Valuación del
           ejercicio», que no tiene campos y sí las cuatro cifras del autovalúo. */
        .filter((b) => b.campos.length > 0 || b.tabla !== undefined || b.totales !== undefined);
      return { ...g, bloques };
    }).filter((g) => g.bloques.length > 0);

    return grupos.map((g) => {
      const clave = g.id + '|' + modo;
      let faltan = 0;
      g.bloques.forEach((b) =>
        b.campos.forEach((f) => {
          if (f.t === 'ro' || f.t === 'chk' || f.t === 'codigo') return;
          const v = vals[f.k] === undefined ? d[f.k] : vals[f.k];
          if (v === '' || v === undefined) faltan++;
        }),
      );
      return {
        id: g.id,
        label: g.label,
        hint: g.hint,
        clave,
        bloques: g.bloques,
        faltan,
        abierta: modo === 'pasos' ? true : cerradas[clave] !== true,
      };
    });
  }, [esPredio, esNuevo, modalidades, modo, cerradas, vals, d]);

  const paso = Math.min(pasoEstado, Math.max(secciones.length - 1, 0));

  /* ── El código de referencia catastral, compuesto ─────────────── */
  const tramosVal = TRAMOS.map((t) => String(valor(t[1]) || ''));
  const codigoCompleto = tramosVal.join('');
  const largoEsperado = TRAMOS.reduce((a, t) => a + t[2], 0);
  const tramosListos = TRAMOS.filter((t, i) => tramosVal[i].length === t[2]).length;
  const codigoListo = tramosListos === TRAMOS.length;
  /* Un código ya usado es el error más caro del módulo: dos fichas sobre el
     mismo lote acaban en dos deudas para el mismo predio. */
  const codigoDuplicado = codigoListo && codigoCompleto === CODIGO_YA_USADO;

  /* Una sola verdad para «se puede registrar»: la usan el panel de cierre, la
     nota del pie y el botón primario. */
  const pendientesTotal = secciones.reduce((a, x) => a + x.faltan, 0);
  const puedeRegistrar = codigoListo && !codigoDuplicado && pendientesTotal === 0;
  const motivoBloqueo = codigoDuplicado
    ? 'El código ya está en uso: no se puede registrar.'
    : !codigoListo
      ? 'Falta completar los ocho tramos del código: es la identidad de la ficha.'
      : pendientesTotal > 0
        ? 'Quedan ' + pendientesTotal + ' datos obligatorios sin llenar.'
        : '';

  /* ── El padrón, contra `GET /api/v1/catastro/predios` ───────── */

  /* El buscador acota por PREFIJO del código de referencia catastral, que es
     lo único que el endpoint sabe buscar. No busca por titular —el listado no
     lo publica a propósito (ADR-0015 §2.4)— ni por dirección. */
  const criterio = useRebote(q.trim());

  /* Volver a la primera página en cuanto cambia lo que se busca: sin esto,
     afinar un filtro desde la página 4 devuelve una página que ya no existe y
     la tabla sale vacía sin que nada lo explique. */
  useEffect(() => setPagina(0), [criterio, fSector, fEstado, fFichado]);

  const padron = useRecurso(
    (senal) =>
      listarPredios(
        {
          codRefCatastral: criterio || undefined,
          codigoDeSector: fSector || undefined,
          estado: fEstado || undefined,
          fichado: fFichado === '' ? undefined : fFichado === 'true',
        },
        { pagina, tamano: 20 },
        senal,
      ),
    [criterio, fSector, fEstado, fFichado, pagina],
    dest === 'predios' && predio === null,
  );

  const filas = padron.datos?.contenido ?? [];
  const cargando = padron.cargando;
  const caido = padron.error !== null;
  const sinResultados = !cargando && !caido && padron.datos !== null && filas.length === 0;
  const hayResultados = !cargando && !caido && filas.length > 0;
  const filtrosPuestos = [criterio, fSector, fEstado, fFichado].filter((x) => x !== '').length;
  const reintentar = padron.reintentar;

  /* El titular no viene en la fila: se resuelve de uno en uno al abrir el
     predio, que es lo que el backend decide para que «quien puede listar
     predios» no sea «quien puede cosechar predio→persona de toda la
     municipalidad». */
  const abierto = filas.find((f) => f.codRefCatastral === predio) ?? null;
  const titulares = useRecurso(
    (senal) => titularesDelPredio(abierto!.predioId, undefined, senal),
    [abierto?.predioId],
    abierto !== null,
  );

  /* ── El plano esquemático: 4×3 manzanas con sus lotes ────────── */
  const plano = useMemo(() => {
    const manzanas: { x: number; y: number; w: number; h: number }[] = [];
    const lotes: { id: string; x: number; y: number; w: number; h: number; fila: number }[] = [];
    const etiquetas: { x: number; y: number; txt: string }[] = [];
    const vias: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const x = 30 + c * 132;
        const y = 26 + r * 124;
        const w = 108;
        const h = 96;
        const cod = 'M-' + String(r * 4 + c + 1).padStart(2, '0');
        manzanas.push({ x, y, w, h });
        etiquetas.push({ x: x + w / 2, y: y + h + 13, txt: cod });
        for (let i = 0; i < 10; i++) {
          const lx = x + (i % 5) * (w / 5);
          const ly = y + Math.floor(i / 5) * (h / 2);
          lotes.push({ id: cod + '-' + String(i + 1).padStart(2, '0'), x: lx + 1, y: ly + 1, w: w / 5 - 2, h: h / 2 - 2, fila: r });
        }
      }
    }
    for (let c = 0; c <= 4; c++) vias.push({ x1: 22 + c * 132, y1: 10, x2: 22 + c * 132, y2: 390 });
    for (let r = 0; r <= 3; r++) vias.push({ x1: 14, y1: 18 + r * 124, x2: 546, y2: 18 + r * 124 });
    return { manzanas, lotes, etiquetas, vias };
  }, []);

  const tablas = tablasDeValores(pref.ejercicio);
  const vAct = tablas[valTab];

  /* ── Ruta y contexto ────────────────────────────────────────── */
  const etiquetaDelDestino = m.destinos.find((x) => x.k === dest)?.label ?? 'Documentos';
  const miga = esPredio
    ? ['Catastro', 'Predios', esNuevo ? 'Ficha nueva' : String(d.predial)]
    : dest === 'reporte'
      ? ['Catastro', 'Documentos']
      : ['Catastro', etiquetaDelDestino];
  const titulo = esPredio
    ? esNuevo
      ? 'Registrar predio'
      : 'Predio ' + String(d.predial)
    : dest === 'reporte'
      ? 'Ficha del contribuyente'
      : etiquetaDelDestino;

  const contexto = esPredio
    ? esNuevo
      ? {
          volver: { label: 'Padrón', onClick: () => irA('predios') },
          codigo: codigoCompleto === '' ? 'Sin código' : codigoCompleto,
          titular: txt('contrib') === '' ? 'Sin titular asignado' : txt('contrib'),
          ubic: txt('calle') === '' ? 'Sin dirección' : txt('calle') + ' ' + txt('numMun'),
          estado: 'Borrador · no registrada',
          estadoColor: 'var(--warn-fg)',
        }
      : {
          volver: { label: 'Padrón', onClick: () => irA('predios') },
          codigo: abierto?.codRefCatastral ?? String(d.predial),
          /* El titular no venía en la fila: lo resuelve su propia petición, y
             mientras llega se dice que se está resolviendo en vez de dejar el
             hueco —un hueco se lee como «no tiene titular»—. */
          titular: textoDeTitulares(titulares.cargando, titulares.error, titulares.datos),
          ubic: abierto ? ubicacionDe(abierto) : 'CALLE BOLÍVAR 539 · S-01 · M-06 · Lote 04',
          estado: sucio
            ? 'Cambios sin guardar'
            : abierto
              ? abierto.estado === 'ACTIVO'
                ? abierto.fichado
                  ? 'En el padrón · con ficha'
                  : 'En el padrón · sin ficha'
                : 'Dado de baja del padrón'
              : 'Guardado · v3 desde 12/03/2026',
          estadoColor: sucio
            ? 'var(--warn-fg)'
            : abierto && abierto.estado !== 'ACTIVO'
              ? 'var(--bad-fg)'
              : abierto && !abierto.fichado
                ? 'var(--warn-fg)'
                : 'var(--ok-fg)',
        }
    : undefined;

  /* ── El paso siguiente del asistente ─────────────────────────── */
  const pasoAdelante = () => {
    const ultimo = paso >= secciones.length - 1;
    if (ultimo && esNuevo) {
      if (!puedeRegistrar) {
        toast(motivoBloqueo);
        return;
      }
      setSucio(false);
      setModo('pagina');
      setPredio(codigoCompleto);
      onDest('predios');
      toast('Ficha ' + codigoCompleto + ' registrada. Versión 1 desde hoy.');
      return;
    }
    if (ultimo) {
      setSucio(false);
      setModo('pagina');
      toast('Ficha guardada. Versión 4 desde hoy.');
    } else {
      setPaso(paso + 1);
      toast('Paso guardado.');
    }
  };
  const pasoBloqueado = esNuevo && paso >= secciones.length - 1 && !puedeRegistrar;

  const guardar = () => {
    if (txt('areaVer') === '') {
      toast('Falta el área verificada del piso 02.');
      return;
    }
    setSucio(false);
    toast('Ficha guardada. Versión 4 desde hoy.');
  };

  /* ── Un campo de la ficha ───────────────────────────────────── */
  const campoDeFicha = (f: CampoDeFicha) => {
    const v = valor(f.k);
    const error =
      f.k === 'areaVer' && sucio && (v === '' || v === undefined)
        ? 'El área verificada del piso 02 es obligatoria para grabar la actualización.'
        : '';
    const estilo = error ? IN_ERR : IN;
    const texto = typeof v === 'boolean' ? '' : v;
    return (
      <label
        key={f.k}
        data-ancho={f.ancho ? '1' : '0'}
        style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
          <span>{f.l}</span>
          {mostrarSiglas && f.c && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '.02em',
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

        {f.t === 'codigo' && (
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
            {TRAMOS.map((t) => (
              <span key={t[1]} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-4)', textAlign: 'center' }}>
                  {t[0]}
                </span>
                <input
                  value={txt(t[1])}
                  onChange={(e) => fijarCampo(t[1], e.target.value)}
                  aria-label={t[0]}
                  style={{
                    width: t[2] * 11 + 20,
                    boxSizing: 'border-box',
                    border: '1px solid var(--line-2)',
                    borderRadius: 5,
                    padding: '8px 6px',
                    background: 'var(--bg-elev)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                />
              </span>
            ))}
          </span>
        )}

        {f.t === 'text' && (
          <input value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} placeholder={f.ph} style={estilo} />
        )}
        {f.t === 'date' && (
          <input type="date" value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} style={estilo} />
        )}
        {f.t === 'sel' && (
          <select value={texto} onChange={(e) => fijarCampo(f.k, e.target.value)} style={estilo}>
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
            onChange={(e) => fijarCampo(f.k, e.target.value)}
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
              checked={v === true}
              onChange={(e) => fijarCampo(f.k, e.target.checked)}
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
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--ink-2)',
            }}
          >
            {texto}
          </span>
        )}

        {error && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, lineHeight: 1.4, color: 'var(--error-texto)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ flex: '0 0 auto' }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4.5M12 16h.02" />
            </svg>
            {error}
          </span>
        )}
        {!error && f.ayuda && (
          <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>
        )}
      </label>
    );
  };

  const bloqueDeFicha = (b: BloqueDeFicha, i: number) => (
    <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
      {b.titulo && (
        <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
          {b.titulo}
        </p>
      )}
      {b.nota && (
        <p style={{ margin: 0, padding: '8px 16px 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
          {b.nota}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
        {b.campos.map(campoDeFicha)}
      </div>

      {b.tabla && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px' }}>
            <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 500 }}>{b.tabla.titulo}</p>
            <span style={META}>{b.tabla.conteo}</span>
            <button onClick={() => setSucio(true)} className="hov-linea" style={BOTON_LINEA}>
              {b.tabla.accion}
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <TablaDelArtboard cols={b.tabla.cols} filas={b.tabla.filas} min={b.tabla.min} />
          </div>
          {b.tabla.nota && <p style={PIE}>{b.tabla.nota}</p>}
        </div>
      )}

      {b.totales && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
          {b.totales.map((t) => (
            <div
              key={t[0]}
              /* El divisor va en la celda, no en el `gap`: con `auto-fit` la
                 última fila puede quedar incompleta y un `gap` sobre fondo
                 `--line` deja ver el fondo desnudo donde no hay celda. */
              style={{
                background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
                padding: '13px 16px',
                borderLeft: '1px solid var(--line)',
                borderTop: '1px solid var(--line)',
                margin: '-1px 0 0 -1px',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const resumen: { etiqueta: string; valor: ReactNode }[] = esNuevo
    ? []
    : [
        { etiqueta: 'Código catastral', valor: String(d.predial) },
        { etiqueta: 'Titular', valor: 'Villegas Prado, Rosa' },
        { etiqueta: 'Uso', valor: txt('uso') },
        { etiqueta: 'Área de terreno', valor: txt('terFis') + ' m²' },
        { etiqueta: 'Área construida', valor: txt('consFis') + ' m²' },
        { etiqueta: 'Autovalúo ' + pref.ejercicio, valor: 'S/ 240,347.50' },
      ];

  const haySiguiente = esPredio && !esNuevo && txt('areaVer') === '';

  return (
    <Shell modulo="catastro" dest={dest} onDest={irA} miga={miga} titulo={titulo} contexto={contexto} paleta={paleta}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL DEL MÓDULO ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
              Catastro mantiene el padrón de predios de la municipalidad: quién es el titular, dónde está el predio, qué se ha construido
              y cuánto vale. Todo lo demás —el impuesto, los arbitrios, la fiscalización— se calcula a partir de aquí.
            </p>

            <section style={TARJETA}>
              <div style={CABECERA_SECCION}>
                <h2 style={H2}>Tu trabajo de hoy</h2>
                <span style={META}>3 tareas</span>
              </div>
              {PENDIENTES.map((p) => (
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
                    padding: '13px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={INS[p.tono]}>{p.tipo}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>
                      {p.titulo.replace('{ejercicio}', pref.ejercicio)}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{p.detalle}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{p.conteo}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {KPIS.map((k) => (
                <div key={k.etiqueta} style={{ ...TARJETA, padding: '16px 17px' }}>
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

        {/* ══════════ PADRÓN DE PREDIOS ══════════ */}
        {dest === 'predios' && predio === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Empieza por encontrar el predio. Se busca por su código de referencia catastral, entero o por el principio: el padrón no
              indexa por titular ni por dirección. Los filtros de abajo solo hacen falta cuando la búsqueda devuelve demasiado.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={LUPA} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="01-1042 — el código, o el principio del código"
                  aria-label="Código de referencia catastral"
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
              <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <button
                  onClick={() => setFiltrosAbiertos((v) => !v)}
                  aria-expanded={filtrosAbiertos}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', padding: '10px 16px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 16,
                      height: 16,
                      color: 'var(--ink-4)',
                      transform: `rotate(${filtrosAbiertos ? 0 : -90}deg)`,
                      transition: 'transform .15s ease',
                    }}
                  >
                    <Icono d={CARET} tam={12} grosor={2} />
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Búsqueda avanzada</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {filtrosPuestos === 0 ? 'ninguno aplicado' : filtrosPuestos + (filtrosPuestos === 1 ? ' criterio' : ' criterios')}
                  </span>
                </button>
                {filtrosAbiertos && (
                  <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(184px,1fr))', gap: '14px 16px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Sector</span>
                        <select value={fSector} onChange={(e) => setFSector(e.target.value)} style={SELECT_FILTRO}>
                          <option value="">Todos</option>
                          {SECTORES.map((x) => (
                            <option key={x[0]} value={x[0]}>
                              {x[0]} — {x[1]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Estado del predio</span>
                        <select value={fEstado} onChange={(e) => setFEstado(e.target.value as '' | EstadoDePredio)} style={SELECT_FILTRO}>
                          <option value="">Todos</option>
                          <option value="ACTIVO">En el padrón</option>
                          <option value="DADO_DE_BAJA">Dado de baja</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Ficha catastral</span>
                        <select value={fFichado} onChange={(e) => setFFichado(e.target.value)} style={SELECT_FILTRO}>
                          <option value="">Con y sin ficha</option>
                          <option value="true">Con ficha</option>
                          <option value="false">Sin ficha — cola de saneamiento</option>
                        </select>
                      </label>
                    </div>
                    {/* Los otros tres criterios del manual no se dibujan apagados: se
                        dice dónde se filtran, porque un desplegable que no filtra se
                        teclea igual y no lo delata nada. */}
                    <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Manzana y lote salen en la tabla pero el padrón no acota por ellos: para eso está el mapa, que busca por manzana y
                      lote. El uso y la conciliación con rentas no son datos del predio —viven en su ficha y en el padrón de rentas—, así
                      que tampoco se filtran aquí.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Cargando: el esqueleto tiene la forma de la tabla que va a llegar */}
            {cargando && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div data-esq="1" style={{ width: 180, height: 15 }} />
                </div>
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div data-esq="1" style={{ width: 118, height: 13 }} />
                    <div data-esq="1" style={{ flex: 1, height: 13 }} />
                    <div data-esq="1" style={{ width: 74, height: 13 }} />
                  </div>
                ))}
              </section>
            )}

            {/* Vacío: dice la causa probable y ofrece los dos caminos de salida */}
            {sinResultados && (
              <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <Icono d={LUPA} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ningún predio con esos datos</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Puede que el predio exista con el código antiguo del padrón migrado, o que aún no tenga ficha. Búscalo en el mapa por
                  manzana y lote, o regístralo.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => irA('mapa')} className="hov-linea" style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}>
                    Buscar en el mapa
                  </button>
                  <button onClick={nuevaFicha} className="hov-acento-2" style={{ border: 0, borderRadius: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Registrar predio
                  </button>
                </div>
              </section>
            )}

            {/* Error: la referencia se dicta por teléfono, así que se lee y se copia */}
            {caido && !cargando && (
              <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '36px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" style={{ color: 'var(--error-texto)' }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5M12 16.2h.02" />
                </svg>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>
                  {tituloDelFallo(padron.error)}
                </p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  {explicacionDelFallo(padron.error)} Lo que hayas escrito en la ficha sigue aquí: no se ha perdido nada.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                  <span>
                    GET /api/v1/catastro/predios · {padron.error?.estado || 'sin respuesta'}
                  </span>
                  {padron.error?.incidencia && (
                    <>
                      <span style={{ color: 'var(--line-2)' }}>|</span>
                      <span>ref {padron.error.incidencia}</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                  {/* La referencia se dicta por teléfono a quien la investiga, así
                      que se copia. Sin incidencia no hay nada que copiar: el fallo
                      no llegó al servidor. */}
                  {padron.error?.incidencia && (
                    <button
                      onClick={() => {
                        void navigator.clipboard?.writeText(padron.error!.incidencia!);
                        toast(`Referencia ${padron.error!.incidencia} copiada.`);
                      }}
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 15px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}
                    >
                      Copiar referencia
                    </button>
                  )}
                  {/* Reintentar solo donde reintentar puede servir: un 403 sale
                      igual las veces que se pulse, y ofrecerlo es prometer algo
                      que no va a pasar. */}
                  {padron.error?.reintentable !== false && (
                    <button onClick={reintentar} className="hov-acento-2" style={{ border: 0, borderRadius: 6, padding: '8px 17px', background: 'var(--accent)', color: 'var(--accent-contraste)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
                      Reintentar
                    </button>
                  )}
                </div>
              </section>
            )}

            {hayResultados && padron.datos && (
              <section style={TARJETA}>
                <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                  <h2 style={H2}>Predios encontrados</h2>
                  <span style={META}>
                    {filas.length} de {padron.datos.totalElementos.toLocaleString('es-PE')}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Cod. ref. catastral</th>
                        <th style={TH}>Dirección</th>
                        <th style={TH}>Sector · Mz. · Lote</th>
                        <th style={TH}>Tipo</th>
                        <th style={TH}>Ficha</th>
                        <th style={TH}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((r) => (
                        <tr
                          key={r.predioId}
                          onClick={() => abrirPredio(r.codRefCatastral)}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                            {r.codRefCatastral}
                          </td>
                          <td style={TD}>
                            {direccionDe(r)}
                            {r.via && (
                              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)' }}>{r.via}</span>
                            )}
                          </td>
                          <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {[r.codigoDeSector, r.codigoDeManzana, r.lote].map((x) => x ?? '—').join(' · ')}
                          </td>
                          <td style={TD}>{rotuloDeTipo(r.tipo)}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={INS[r.fichado ? 'ok' : 'warn']}>{r.fichado ? 'Con ficha' : 'Sin ficha'}</span>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={INS[r.estado === 'ACTIVO' ? 'ok' : 'bad']}>
                              {r.estado === 'ACTIVO' ? 'En el padrón' : 'Dado de baja'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {padron.datos.totalPaginas > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                    <button
                      onClick={() => setPagina((n) => Math.max(0, n - 1))}
                      disabled={pagina === 0}
                      className="hov-linea"
                      style={{ ...BOTON_LINEA, opacity: pagina === 0 ? 0.45 : 1, cursor: pagina === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      Anterior
                    </button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {padron.datos.pagina + 1} de {padron.datos.totalPaginas}
                    </span>
                    <button
                      onClick={() => setPagina((n) => n + 1)}
                      disabled={!padron.datos.hayMas}
                      className="hov-linea"
                      style={{ ...BOTON_LINEA, opacity: padron.datos.hayMas ? 1 : 0.45, cursor: padron.datos.hayMas ? 'pointer' : 'not-allowed' }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}

                {/* Por qué no hay columna de titular, dicho donde se echa en falta:
                    publicarlo en la fila convertiría «quien puede listar predios» en
                    «quien puede cosechar predio→persona de toda la municipalidad»
                    (ADR-0015 §2.4). Se resuelve al abrir el predio, uno a uno. */}
                <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El titular no sale en la lista: se resuelve al abrir el predio, de uno en uno y dejando su rastro. Un predio sin ficha
                  está en el padrón y no tiene con qué valorizarse.
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL PREDIO ══════════ */}
        {esPredio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {esNuevo && (
              <>
                <section style={TARJETA}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', padding: '15px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ flex: 1, minWidth: 210 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Código de referencia catastral</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '70ch', textWrap: 'pretty' }}>
                        No se teclea de corrido: se compone de ocho tramos y cada uno tiene su longitud. Es lo primero porque de él cuelga
                        todo lo demás.
                      </p>
                    </div>
                    <span style={INS[codigoDuplicado ? 'bad' : codigoListo ? 'ok' : 'warn']}>
                      {codigoDuplicado ? 'Código ya usado' : codigoListo ? 'Completo' : tramosListos + ' de ' + TRAMOS.length + ' tramos'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: '15px 16px 6px' }}>
                    {TRAMOS.map((t, i) => (
                      <label key={t[1]} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--ink-3)' }}>{t[0]}</span>
                        <input
                          value={tramosVal[i]}
                          onChange={(e) => fijarCampo(t[1], e.target.value.replace(/[^0-9]/g, '').slice(0, t[2]))}
                          maxLength={t[2]}
                          aria-label={t[0] + ', ' + t[2] + ' dígitos'}
                          style={{
                            width: t[2] * 13 + 22,
                            boxSizing: 'border-box',
                            border: `1px solid ${tramosVal[i].length === t[2] ? 'var(--line-2)' : 'var(--warn-fg)'}`,
                            borderRadius: 6,
                            padding: '9px 8px',
                            background: 'var(--bg-elev)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 14,
                            textAlign: 'center',
                            letterSpacing: '.04em',
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 16px 15px' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Queda</span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '.06em', color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 6, padding: '6px 11px' }}>
                      {codigoCompleto === '' ? '—' : codigoCompleto}
                    </code>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                      {codigoCompleto.length + ' de ' + largoEsperado + ' dígitos'}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      padding: '11px 16px',
                      borderTop: '1px solid var(--line)',
                      background: codigoDuplicado ? 'var(--bad-bg)' : codigoListo ? 'var(--ok-bg)' : 'var(--bg-elev)',
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: codigoDuplicado ? 'var(--bad-fg)' : codigoListo ? 'var(--ok-fg)' : 'var(--ink-3)',
                      textWrap: 'pretty',
                    }}
                  >
                    {codigoDuplicado
                      ? 'Ese código ya está asignado al predio de Villegas Prado, Rosa. Dos fichas sobre el mismo lote generan dos deudas: comprueba el lote en el mapa antes de seguir.'
                      : codigoListo
                        ? 'Código libre. Los tres primeros tramos —distrito, sector y manzana— tienen que existir en Territorio; si no, hay que crearlos antes.'
                        : 'Cada tramo tiene su longitud fija y se rellena con ceros a la izquierda. El sector y la manzana salen del mapa: si no sabes el lote, búscalo allí primero.'}
                  </p>
                </section>

                <section style={TARJETA}>
                  <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                    <p style={{ ...H2, margin: 0 }}>Qué falta para poder registrar</p>
                    <span style={META}>
                      {pendientesTotal === 0 ? 'Sin datos pendientes' : pendientesTotal + (pendientesTotal === 1 ? ' dato pendiente' : ' datos pendientes')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, padding: '14px 16px 6px' }}>
                    {secciones.map((x, i) => {
                      const aria = x.label + ': ' + (x.faltan === 0 ? 'completo' : x.faltan + ' pendientes');
                      return (
                        <button
                          key={x.id}
                          onClick={() => setPaso(i)}
                          aria-label={aria}
                          title={aria}
                          style={{
                            flex: 1,
                            height: 8,
                            border: 0,
                            borderRadius: 999,
                            cursor: 'pointer',
                            background: x.faltan === 0 ? 'var(--ok-fg)' : i === paso ? 'var(--warn-fg)' : 'var(--accent-soft)',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '8px 16px 15px' }}>
                    {secciones.map((x, i) => (
                      <button
                        key={x.id}
                        onClick={() => setPaso(i)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 11.5,
                          color: i === paso ? 'var(--accent-ink)' : x.faltan === 0 ? 'var(--ok-fg)' : 'var(--ink-4)',
                          fontWeight: i === paso ? 600 : 400,
                        }}
                      >
                        {i + 1 + '. ' + x.label + (x.faltan === 0 ? '' : ' · ' + x.faltan)}
                      </button>
                    ))}
                  </div>
                  <p style={{ ...PIE, fontSize: 12.5 }}>
                    La fila de modalidades, justo debajo, decide cuántos pasos hay: una ficha urbana individual son seis, y añadir bienes
                    comunes o la parte rural añade los suyos. Lo que no aplica no pide datos ni cuenta como pendiente.
                  </p>
                </section>
              </>
            )}

            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {resumen.map((r) => (
                  <div
                    key={r.etiqueta}
                    style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}
                  >
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r.etiqueta}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)' }}>{r.valor}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>Modalidades</span>
                {MODALIDADES.map((mo) => {
                  const on = modalidades[mo[0]];
                  return (
                    <button
                      key={mo[0]}
                      onClick={() => setModalidades((x) => ({ ...x, [mo[0]]: !on }))}
                      aria-pressed={on}
                      title={mo[2]}
                      className="hov-linea"
                      style={{
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                        borderRadius: 999,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-4)',
                      }}
                    >
                      {mo[1]}
                    </button>
                  );
                })}
                {/* El conmutador de siglas: la prop «mostrarSiglas» del artboard */}
                <button
                  onClick={() => setMostrarSiglas((v) => !v)}
                  aria-pressed={mostrarSiglas}
                  title="Muestra la sigla del manual —MEP, ECS, CUC— al lado del nombre en claro."
                  className="hov-linea"
                  style={{
                    border: `1px solid ${mostrarSiglas ? 'var(--accent)' : 'var(--line-2)'}`,
                    borderRadius: 999,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: mostrarSiglas ? 'var(--accent-soft)' : 'var(--bg-card)',
                    color: mostrarSiglas ? 'var(--accent-ink)' : 'var(--ink-4)',
                  }}
                >
                  Siglas
                </button>
                <span data-sm-hide="1" style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                  Las que no aplican no piden datos
                </span>
              </div>
            </section>

            {haySiguiente && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--accent)', borderRadius: 8, background: 'var(--accent-soft)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" style={{ color: 'var(--accent-ink)', flex: '0 0 auto', marginTop: 1 }}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 8.4v.02M12 11.4v4.2" />
                </svg>
                <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: 'var(--accent-ink)', textWrap: 'pretty' }}>
                  Falta el área construida verificada del piso 02. Es el único dato que impide cerrar la actualización de esta ficha.
                </p>
                <button
                  onClick={() => {
                    setModo('pasos');
                    setPaso(3);
                  }}
                  className="hov-linea"
                  style={{ border: '1px solid var(--accent)', borderRadius: 6, padding: '6px 13px', background: 'transparent', color: 'var(--accent-ink)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}
                >
                  Ir
                </button>
              </div>
            )}

            {!esNuevo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden', background: 'var(--bg-card)' }}>
                  {MODOS.map((mo) => {
                    const on = modo === mo[0];
                    return (
                      <button
                        key={mo[0]}
                        onClick={() => {
                          setModo(mo[0]);
                          setPaso(0);
                        }}
                        aria-pressed={on}
                        style={{
                          border: 0,
                          padding: '8px 16px',
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
                <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {modo === 'pagina'
                    ? 'Una página: todo a la vista, secciones colapsables e índice a la izquierda. Para revisar y corregir una ficha que ya existe.'
                    : 'Por pasos: una sección a la vez, con progreso visible y guardado al avanzar. Para registrar o levantar en campo.'}
                </p>
              </div>
            )}

            {modo === 'pasos' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '15px 17px 17px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                    {secciones.length > 0 ? secciones[paso].label : ''}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {'Paso ' + (paso + 1) + ' de ' + secciones.length}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {secciones.map((x, i) => (
                    <button
                      key={x.id}
                      onClick={() => setPaso(i)}
                      aria-label={'Ir al paso ' + (i + 1) + ': ' + x.label}
                      style={{ flex: 1, height: 6, border: 0, borderRadius: 999, cursor: 'pointer', background: i <= paso ? 'var(--accent)' : 'var(--accent-soft)' }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 11 }}>
                  {secciones.map((x, i) => (
                    <button
                      key={x.id}
                      onClick={() => setPaso(i)}
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
                      {i + 1 + '. ' + x.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              {modo === 'pagina' && (
                <nav
                  aria-label="Secciones de la ficha"
                  data-sm-hide="1"
                  style={{ flex: '0 0 202px', width: 202, position: 'sticky', top: 112, display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                  <p style={{ margin: '0 0 6px 10px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                    En esta ficha
                  </p>
                  {secciones.map((x) => (
                    <a
                      key={x.id}
                      href={'#' + x.id}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 0,
                        borderRadius: 7,
                        padding: '8px 10px',
                        textDecoration: 'none',
                        color: 'var(--ink-2)',
                        borderBottom: '1px solid transparent',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{x.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, flex: '0 0 auto', color: x.faltan === 0 ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
                        {x.faltan === 0 ? '✓' : '·'}
                      </span>
                    </a>
                  ))}
                </nav>
              )}

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(modo === 'pasos' ? secciones.slice(paso, paso + 1) : secciones).map((s) => (
                  <section key={s.id} id={s.id} style={{ ...TARJETA, scrollMarginTop: 120 }}>
                    <button
                      onClick={() => setCerradas((x) => ({ ...x, [s.clave]: s.abierta }))}
                      aria-expanded={s.abierta}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 0, background: 'transparent', padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 20,
                          height: 20,
                          color: 'var(--ink-4)',
                          flex: '0 0 auto',
                          transform: `rotate(${s.abierta ? 0 : -90}deg)`,
                          transition: 'transform .15s ease',
                        }}
                      >
                        <Icono d={CARET} tam={13} grosor={2} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{s.hint}</span>
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: 999,
                          padding: '3px 10px',
                          flex: '0 0 auto',
                          color: s.faltan === 0 ? 'var(--ok-fg)' : 'var(--warn-fg)',
                          background: s.faltan === 0 ? 'var(--ok-bg)' : 'var(--warn-bg)',
                        }}
                      >
                        {s.faltan === 0 ? 'Completa' : s.faltan + (s.faltan === 1 ? ' campo pendiente' : ' campos pendientes')}
                      </span>
                    </button>
                    {s.abierta && <div style={{ borderTop: '1px solid var(--line)' }}>{s.bloques.map(bloqueDeFicha)}</div>}
                  </section>
                ))}

                {/* Lo que se va a registrar: el cierre del alta guiada */}
                {esNuevo && paso >= secciones.length - 1 && (
                  <section style={TARJETA}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que se va a registrar</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                        Una ficha registrada entra en el padrón y desde ese momento genera obligación predial. Antes de crearla, esto es lo
                        que va a quedar escrito.
                      </p>
                    </div>
                    {[
                      {
                        titulo: 'Se crea la ficha ' + (codigoListo ? codigoCompleto : 'sin código'),
                        detalle: codigoListo ? 'Queda como versión 1 y entra en el padrón catastral.' : 'Falta completar los ocho tramos del código.',
                        valor: codigoListo ? 'v1' : '—',
                        ok: codigoListo,
                      },
                      {
                        titulo: 'El predio empieza a generar obligación predial',
                        detalle: 'Desde el ejercicio en curso, con el autovalúo que sale del arancel y de los valores unitarios.',
                        valor: 'Ejercicio ' + pref.ejercicio,
                        ok: true,
                      },
                      {
                        titulo: 'Se vincula al contribuyente',
                        detalle: txt('contrib') === '' ? 'Sin titular no se puede emitir: la deuda no tendría a quién cobrarse.' : txt('contrib'),
                        valor: txt('contrib') === '' ? 'Falta' : 'Listo',
                        ok: txt('contrib') !== '',
                      },
                      {
                        titulo: 'Queda pendiente de conciliar con Rentas',
                        detalle: 'La ficha existe en catastro; que genere deuda depende de la conciliación, que se hace desde Rentas.',
                        valor: 'Después',
                        ok: false,
                      },
                      {
                        titulo: pendientesTotal === 0 ? 'Sin datos pendientes' : pendientesTotal + ' datos pendientes',
                        detalle:
                          pendientesTotal === 0
                            ? 'Todos los campos obligatorios de los pasos activos están llenos.'
                            : 'Hay que llenarlos antes de registrar: sobre ellos se calcula el autovalúo.',
                        valor: pendientesTotal === 0 ? 'Completo' : String(pendientesTotal),
                        ok: pendientesTotal === 0,
                      },
                    ].map((l) => (
                      <div key={l.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            background: l.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
                            color: l.ok ? 'var(--ok-fg)' : 'var(--warn-fg)',
                          }}
                        >
                          <Icono d={l.ok ? ['M5 12.5l4.5 4.5L19 7'] : ['M12 7.5V13M12 16.5h.02']} tam={13} grosor={2.4} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>{l.titulo}</span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{l.detalle}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flex: '0 0 auto', whiteSpace: 'nowrap' }}>{l.valor}</span>
                      </div>
                    ))}
                    <p
                      style={{
                        margin: 0,
                        padding: '11px 16px',
                        background: puedeRegistrar ? 'var(--ok-bg)' : codigoDuplicado || !codigoListo ? 'var(--bad-bg)' : 'var(--warn-bg)',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: puedeRegistrar ? 'var(--ok-fg)' : codigoDuplicado || !codigoListo ? 'var(--bad-fg)' : 'var(--warn-fg)',
                        textWrap: 'pretty',
                      }}
                    >
                      {puedeRegistrar
                        ? 'Todo listo. Al registrar, la ficha entra en el padrón y el predio queda afecto desde este ejercicio.'
                        : 'No se puede registrar todavía. ' + motivoBloqueo}
                    </p>
                  </section>
                )}

                {modo === 'pasos' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setPaso(Math.max(paso - 1, 0))}
                      aria-disabled={paso === 0}
                      className="hov-linea"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        border: '1px solid var(--line-2)',
                        borderRadius: 6,
                        padding: '10px 18px',
                        background: 'var(--bg-card)',
                        fontSize: 13,
                        cursor: 'pointer',
                        opacity: paso === 0 ? 0.5 : 1,
                      }}
                    >
                      <Icono d={ICO.flechaIzq} tam={14} grosor={1.8} />
                      Anterior
                    </button>
                    <p style={{ margin: 0, flex: 1, minWidth: 160, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {paso >= secciones.length - 1
                        ? esNuevo
                          ? puedeRegistrar
                            ? 'Al registrar, la ficha entra en el padrón y el predio queda afecto desde este ejercicio.'
                            : motivoBloqueo
                          : 'Al guardar se crea una versión nueva de la ficha. La anterior queda en el histórico.'
                        : esNuevo
                          ? 'El borrador se guarda al avanzar: si se corta la sesión, lo escrito no se pierde.'
                          : 'Lo que llenes en este paso se guarda al pulsar «Guardar y continuar».'}
                    </p>
                    <button
                      onClick={pasoAdelante}
                      aria-disabled={pasoBloqueado}
                      title={pasoBloqueado ? motivoBloqueo : undefined}
                      className="hov-acento-2"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        border: 0,
                        borderRadius: 6,
                        padding: '11px 22px',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: pasoBloqueado ? 0.55 : 1,
                      }}
                    >
                      {paso >= secciones.length - 1 ? (esNuevo ? 'Registrar la ficha' : 'Guardar la ficha') : 'Guardar y continuar'}
                      <Icono d={ICO.flechaDer} tam={14} grosor={1.8} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ MAPA CATASTRAL ══════════ */}
        {dest === 'mapa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              El plano catastral con las capas de predios, vías, manzanas, sectores y aranceles sobre la misma base. Al seleccionar un lote
              se ven sus datos y el camino a su ficha.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 318px', gap: 14, alignItems: 'start' }}>
              <section style={{ ...TARJETA, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  <select
                    defaultValue="S-01"
                    aria-label="Sector"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 9px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                  >
                    {SECTORES_DEL_MAPA.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Código predial o lote"
                    style={{ flex: 1, minWidth: 150, border: '1px solid var(--line-2)', borderRadius: 6, padding: '7px 10px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                  />
                  <button
                    onClick={() => toast('Encuadrado el lote ' + lote + '.')}
                    className="hov-acento-2"
                    style={{ border: 0, borderRadius: 6, padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                  >
                    Ubicar
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <button
                      onClick={() => setZoom((z) => Math.max(z - 25, 75))}
                      aria-label="Alejar"
                      style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)', cursor: 'pointer' }}
                    >
                      <Icono d={['M5 12h14']} tam={14} grosor={1.8} />
                    </button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', minWidth: 46, textAlign: 'center' }}>{zoom} %</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(z + 25, 175))}
                      aria-label="Acercar"
                      style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)', cursor: 'pointer' }}
                    >
                      <Icono d={ICO.mas} tam={14} grosor={1.8} />
                    </button>
                  </span>
                </div>
                <div style={{ overflow: 'auto', background: 'var(--bg-elev)', maxHeight: '66vh' }}>
                  <div style={{ position: 'relative', width: `${zoom}%`, minWidth: 520 }}>
                    <svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto' }}>
                      <rect x="0" y="0" width="560" height="400" fill="#f1ece0" />
                      {capas.vias && (
                        <g>
                          {plano.vias.map((v, i) => (
                            <line key={i} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} stroke="#fbfaf6" strokeWidth={15} />
                          ))}
                        </g>
                      )}
                      {capas.manzanas && (
                        <g>
                          {plano.manzanas.map((mz, i) => (
                            <rect key={i} x={mz.x} y={mz.y} width={mz.w} height={mz.h} fill="none" stroke="var(--ink-3)" strokeWidth={1} />
                          ))}
                        </g>
                      )}
                      {capas.predios && (
                        <g>
                          {plano.lotes.map((l) => {
                            const sel = l.id === lote;
                            const aran = capas.aranceles;
                            return (
                              <rect
                                key={l.id}
                                x={l.x}
                                y={l.y}
                                width={l.w}
                                height={l.h}
                                fill={sel ? 'var(--accent)' : aran ? (l.fila === 0 ? '#6f8cb0' : l.fila === 1 ? '#9db3cd' : '#c4d2e2') : '#fbfaf6'}
                                stroke={sel ? 'var(--accent-ink)' : 'var(--line-2)'}
                                strokeWidth={sel ? 1.6 : 0.8}
                                onClick={() => setLote(l.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            );
                          })}
                        </g>
                      )}
                      {capas.sectores && (
                        <g>
                          {[
                            { x: 18, y: 14, w: 528, h: 252 },
                            { x: 18, y: 266, w: 528, h: 128 },
                          ].map((s, i) => (
                            <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="var(--accent)" strokeWidth={1.4} strokeDasharray="7 5" opacity=".6" />
                          ))}
                        </g>
                      )}
                      <g>
                        {plano.etiquetas.map((e) => (
                          <text key={e.txt} x={e.x} y={e.y} fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#6b6258" textAnchor="middle">
                            {e.txt}
                          </text>
                        ))}
                      </g>
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '9px 14px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>0 — 50 — 100 m · UTM 17S · WGS 84</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 'auto' }}>Base catastral municipal — actualización 2026-I</span>
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '11px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                    Capas
                  </p>
                  {CAPAS.map((c) => {
                    const on = capas[c[0]] === true;
                    return (
                      <button
                        key={c[0]}
                        onClick={() => setCapas((x) => ({ ...x, [c[0]]: !on }))}
                        aria-pressed={on}
                        className="hov-elev"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 17,
                            height: 17,
                            borderRadius: 4,
                            flex: '0 0 auto',
                            border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                            background: on ? 'var(--accent)' : 'var(--bg-card)',
                          }}
                        >
                          {on && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                          )}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>{c[1]}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>{c[2]}</span>
                      </button>
                    );
                  })}
                </section>

                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>Lote seleccionado</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 999, padding: '3px 9px' }}>{lote}</span>
                  </div>
                  <div style={{ padding: '10px 14px 4px' }}>
                    {LOTE_SELECCIONADO.map((r) => (
                      <div key={r[0]} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ flex: '0 0 112px', fontSize: 11.5, color: 'var(--ink-3)' }}>{r[0]}</span>
                        <span
                          style={{
                            flex: 1,
                            textAlign: 'right',
                            fontSize: 12.5,
                            color: 'var(--ink)',
                            fontFamily: r[2] ? 'var(--font-mono)' : undefined,
                            fontVariantNumeric: r[2] ? 'tabular-nums' : undefined,
                          }}
                        >
                          {r[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, padding: '12px 14px 14px' }}>
                    <button
                      onClick={() => abrirPredio(String(BASE.predial))}
                      className="hov-acento-2"
                      style={{ flex: 1, border: 0, borderRadius: 6, padding: '9px 14px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Abrir el predio
                    </button>
                    <button
                      onClick={() => toast('Abriría la deuda del predio ' + BASE.predial + '.')}
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 14px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}
                    >
                      Ver deuda
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TERRITORIO ══════════ */}
        {dest === 'territorio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={ENTRADILLA}>
              Sectores, manzanas y vías: la estructura sobre la que se arma el código de referencia catastral. Antes eran dos opciones de
              menú; aquí son un solo árbol, porque una vía se define dentro de un sector.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Sectores</h2>
                  <span style={META}>5 · 418 manzanas</span>
                </div>
                {SECTORES.map((s) => {
                  const on = sectorAbierto === s[0];
                  return (
                    <div key={s[0]} style={{ borderBottom: '1px solid var(--line)' }}>
                      <button
                        onClick={() => setSectorAbierto(on ? '' : s[0])}
                        aria-expanded={on}
                        className="hov-acento"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          width: '100%',
                          textAlign: 'left',
                          border: 0,
                          background: on ? 'var(--accent-soft)' : 'transparent',
                          padding: '11px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 16,
                            height: 16,
                            color: 'var(--ink-4)',
                            flex: '0 0 auto',
                            transform: `rotate(${on ? 0 : -90}deg)`,
                            transition: 'transform .15s ease',
                          }}
                        >
                          <Icono d={CARET} tam={12} grosor={2} />
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 4, padding: '2px 6px', flex: '0 0 auto' }}>
                          {s[0]}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s[1]}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', flex: '0 0 auto' }}>{s[2]}</span>
                      </button>
                      {on && (
                        <div style={{ padding: '4px 14px 12px 40px', background: 'var(--bg-elev)' }}>
                          <p style={{ margin: '0 0 8px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                            {'El sistema todavía no publica la lista de manzanas de un sector, solo su alta. Se ven cuántas hay (' + s[3] + ') y desde aquí se puede añadir una.'}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {MANZANAS_DEL_SECTOR.map((mz) => (
                              <span key={mz} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', border: '1px solid var(--line-2)', borderRadius: 4, padding: '3px 7px', background: 'var(--bg-card)' }}>
                                {mz}
                              </span>
                            ))}
                            <button
                              onClick={() => toast('Añadiría una manzana al sector ' + s[0] + '.')}
                              style={{ fontSize: 11, color: 'var(--accent-ink)', border: '1px dashed var(--accent)', borderRadius: 4, padding: '3px 9px', background: 'transparent', cursor: 'pointer' }}
                            >
                              + Añadir manzana
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ padding: '11px 14px' }}>
                  <button
                    onClick={() => toast('Abriría el alta de un sector.')}
                    className="hov-linea"
                    style={{ width: '100%', border: '1px dashed var(--line-2)', borderRadius: 7, padding: 9, background: 'transparent', fontSize: 12.5, color: 'var(--ink-3)', cursor: 'pointer' }}
                  >
                    + Nuevo sector
                  </button>
                </div>
              </section>

              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>Vías del sector {sectorAbierto}</h2>
                  <span style={META}>5 de 2,184</span>
                  <button onClick={() => toast('Abriría el alta de una vía.')} className="hov-linea" style={BOTON_LINEA}>
                    Nueva vía
                  </button>
                </div>
                <TablaDelArtboard cols={COLS_VIAS} filas={VIAS} min="600px" />
                <p style={{ ...PIE, padding: '11px 14px' }}>
                  El nombre de una vía viaja al domicilio fiscal de todos los contribuyentes que dan a ella. Cambiarlo aquí los cambia a
                  todos.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ══════════ VALORES DEL EJERCICIO ══════════ */}
        {dest === 'valores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ ...ENTRADILLA }}>
              Las tres tablas oficiales con las que se valoriza un predio del ejercicio {pref.ejercicio}. Se consultan e importan; no se
              editan fila a fila, porque las aprueba el Ministerio de Vivienda y cualquier cambio recalcula el autovalúo de todo el padrón.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {PESTANIAS_DE_VALORES.map((l, i) => {
                const on = valTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => setValTab(i)}
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
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ok-fg)', background: 'var(--ok-bg)', borderRadius: 999, padding: '4px 11px' }}>
                <Icono d={['M5 12.5l4.5 4.5L19 7']} tam={12} grosor={2.4} />
                Sellada para {pref.ejercicio}
              </span>
            </div>

            <section style={TARJETA}>
              <div style={{ ...CABECERA_SECCION, flexWrap: 'wrap' }}>
                <h2 style={H2}>{vAct.titulo}</h2>
                <span style={META}>{vAct.conteo}</span>
                <button onClick={() => toast('Importaría la tabla del año ' + pref.ejercicio + '.')} className="hov-linea" style={BOTON_LINEA}>
                  Importar tabla del año
                </button>
              </div>
              <TablaDelArtboard cols={vAct.cols} filas={vAct.filas} min="660px" />
              <p style={PIE}>{vAct.nota}</p>
            </section>
          </div>
        )}

        {/* ══════════ REPORTE — FICHA DEL CONTRIBUYENTE ══════════ */}
        {dest === 'reporte' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 820, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => toast('Descargaría la ficha FC-2026-004182 en PDF.')}
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
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Gerencia de Administración Tributaria — Unidad de Rentas</p>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  <p style={{ margin: 0 }}>FC-2026-004182</p>
                  <p style={{ margin: '3px 0 0' }}>31/08/2026</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>Ficha del contribuyente</h2>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>Registro único de contribuyentes — Gerencia de Rentas</p>
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
                {REPORTE_META.map((mt) => (
                  <div key={mt[0]}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{mt[0]}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>{mt[1].replace('{ejercicio}', pref.ejercicio)}</p>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {COLS_REPORTE.map((c, i) => (
                      <th key={i} style={c[1] ? THN : TH}>
                        {c[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FILAS_REPORTE.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      {r.map((cl, j) => (
                        <td key={j} style={j === 0 ? TD1 : COLS_REPORTE[j] && COLS_REPORTE[j][1] ? TDN : TD}>
                          {cl}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                La presente ficha se emite a solicitud del interesado y refleja la información registrada a la fecha de impresión. No
                constituye título de propiedad ni certificación de deuda.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Cajero / Responsable</div>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Contribuyente</div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ══════════ BARRA DE GUARDADO ══════════ */}
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
            margin: '18px -20px 0',
            padding: '12px 20px',
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
            Se guardará como una versión nueva de la ficha; la anterior queda en el histórico con su observación.
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
            onClick={guardar}
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


/* ══════════ Lo que el backend contesta, dicho en castellano ══════════ */

const SELECT_FILTRO: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 10px',
  background: 'var(--bg-card)',
  fontSize: 13.5,
};

function rotuloDeTipo(tipo: string): string {
  if (tipo === 'URBANO') return 'Urbano';
  if (tipo === 'RUSTICO') return 'Rústico';
  /* Un tipo que el dominio gane mañana no se dibuja en blanco ni se traduce a
     ciegas: sale tal cual, que es feo y es cierto. */
  return tipo;
}

/**
 * El titular del fallo sale del CÓDIGO, no del texto.
 *
 * Los códigos son estables por contrato y el mensaje se reescribe en cuanto
 * alguien lo lee en voz alta; y las causas no se parecen: un permiso que falta
 * no se arregla reintentando y una red caída sí.
 */
function tituloDelFallo(error: ErrorDeApi | null): string {
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'La sesión no vale';
    case 'SIN_PRIVILEGIO':
      return 'Tu perfil no puede ver el padrón';
    case 'SIN_MUNICIPALIDAD':
      return 'La sesión no dice de qué municipalidad es';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return 'El servidor no admite esa búsqueda';
    case 'SIN_RESPUESTA':
      return 'No se pudo contactar con el servidor';
    default:
      return 'No se pudo consultar el padrón';
  }
}

function explicacionDelFallo(error: ErrorDeApi | null): string {
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'Vuelve a entrar: el token caducó o no es de este emisor.';
    case 'SIN_PRIVILEGIO':
      return 'Hace falta el acceso «actualizacion_catastro» con privilegio de lectura. Lo concede Seguridad.';
    case 'SIN_MUNICIPALIDAD':
      return 'No hay valor por omisión: sin municipalidad en el token no hay padrón que consultar.';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return error?.mensaje ?? 'Revisa los filtros.';
    case 'SIN_RESPUESTA':
      return 'El servidor no contestó. Puede estar apagado o no alcanzable desde aquí.';
    default:
      return 'La consulta falló en el servidor.';
  }
}

/**
 * La dirección con su número municipal, sin repetirlo.
 *
 * `direccion` unas veces ya lo lleva dentro —«Calle Comercio 245»— y otras no,
 * según cómo se cargara el padrón; concatenar sin mirar produce «Calle Comercio
 * 245 245», que se lee como un dato mal escrito y no como uno mal dibujado.
 */
function direccionDe(p: PredioDelCatastro): string {
  const numero = p.numeroMunicipal?.trim();
  if (!numero) return p.direccion;
  return p.direccion.trim().endsWith(numero) ? p.direccion : p.direccion + ' ' + numero;
}

/** La ubicación tal como la publica el listado: dirección, sector, manzana y lote. */
function ubicacionDe(p: PredioDelCatastro): string {
  const partes = [
    direccionDe(p),
    p.codigoDeSector ? 'S-' + p.codigoDeSector : null,
    p.codigoDeManzana ? 'M-' + p.codigoDeManzana : null,
    p.lote ? 'Lote ' + p.lote : null,
  ];
  return partes.filter((x): x is string => x !== null && x !== '').join(' · ');
}

/**
 * Los titulares en una línea, con sus cuotas.
 *
 * Un predio puede tener varios —dos cónyuges al 50 %, una sucesión con tantos
 * como herederos—, así que no se dice «el titular». Y un titular sin nombre no
 * se esconde: es el predio que catastro tiene que revisar, porque su
 * propietario ya no está en el padrón.
 */
function textoDeTitulares(
  cargando: boolean,
  error: ErrorDeApi | null,
  datos: { titulares: { nombre: string | null; porcentaje: number }[] } | null,
): string {
  if (cargando) return 'Resolviendo el titular…';
  if (error) return error.codigo === 'SIN_PRIVILEGIO' ? 'Sin acceso al padrón de contribuyentes' : 'No se pudo resolver el titular';
  if (!datos || datos.titulares.length === 0) return 'Sin titular registrado';
  return datos.titulares
    .map((t) => (t.nombre ?? 'Titular fuera del padrón') + (datos.titulares.length > 1 ? ` (${t.porcentaje} %)` : ''))
    .join(' · ');
}
