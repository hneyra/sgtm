import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Aviso, Dato, Entradilla, Insignia, Nota, Seccion, type Tono } from '../../ds/componentes';
import { usarPreferencias } from '../../shell/preferencias';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { causasDelRechazo } from '../../api/Fallo';
import { cuentaActual, hayPuerta } from '../../api/sesion';
import { useRebote, useRecurso } from '../../api/useRecurso';
import {
  consultarValores,
  deudaDelContribuyente,
  SITUACIONES,
  TIPOS_DE_VALOR,
  type ObligacionConDeuda,
  type Situacion,
  type TipoDeValor,
  type ValorConsultado,
} from '../../api/consultas';
import {
  CAUSALES,
  MODALIDADES,
  RESULTADOS,
  declararPrescripcion,
  listarPrescripciones,
  emitirValor,
  generarValoresMasivos,
  listarValores,
  notificarValor,
  pasarACoactiva,
  type Causal,
  type ClaseDeHecho,
  type CorridaMasiva,
  type HechoDelComputo,
  type Modalidad,
  type MovimientoDelValor,
  type Notificacion,
  type Prescripcion,
  type ResultadoDeDiligencia,
  type Valor,
} from '../../api/valores';
import {
  CAUSALES_SUGERIDAS,
  COLS_COMPUTO,
  COLS_DEUDA_A_FORMALIZAR,
  COLS_LISTA,
  OPCIONES,
  PESTANIAS,
  SIN_DATO,
  SITUACIONES_EXPLICADAS,
  type ColDef,
  type Pestania,
} from '../../datos/valores';

/* ══════════ Estilos del artboard ══════════ */
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
const CONTROL: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '8px 10px',
  background: 'var(--bg-card)',
  fontSize: 13,
};
const BOTON_SEC: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 16px',
  background: 'var(--bg-elev)',
  fontSize: 13,
  color: 'var(--ink-2)',
  cursor: 'pointer',
};

/** «1 valor» y «2 valores»: la cifra manda sobre el rótulo. */
function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-PE')} ${n === 1 ? uno : varios}`;
}

/** El tono con que se lee cada situación. Sale de la tabla, no de un `if`. */
function tonoDeSituacion(situacion: string): Tono {
  return SITUACIONES_EXPLICADAS.find((s) => s.k === situacion)?.tono ?? 'neutro';
}

/** Cómo se lee cada situación, con su explicación. */
function rotuloDeSituacion(situacion: string): string {
  return SITUACIONES_EXPLICADAS.find((s) => s.k === situacion)?.label ?? situacion;
}

/* ══════════ Piezas comunes ══════════ */

type Lect<T> = { datos: T | null; cargando: boolean; error: ErrorDeApi | null; reintentar: () => void };

function Cargando({ n = 4 }: { n?: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div data-esq="1" style={{ width: 118, height: 13 }} />
          <div data-esq="1" style={{ flex: 1, height: 13 }} />
          <div data-esq="1" style={{ width: 74, height: 13 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Lo que el backend contestó, dicho en castellano.
 *
 * El titular sale del **código** y no del texto: los códigos son estables por
 * contrato, y las causas no se parecen —un permiso que falta no se arregla
 * reintentando y una red caída sí—.
 */
function Fallo({
  error,
  ruta,
  acceso,
  llave,
  onReintentar,
}: {
  error: ErrorDeApi;
  ruta: string;
  acceso: string;
  /** La llave del conjunto sellado que ESTE acto necesita, si se sabe cuál (#562). */
  llave?: string;
  onReintentar: () => void;
}) {
  const { toast } = usarPreferencias();
  const [tokenPegado, setTokenPegado] = useState('');
  const cuenta = cuentaActual();
  const titulo =
    error.codigo === 'NO_AUTENTICADO'
      ? 'La sesión no vale'
      : error.codigo === 'SIN_PRIVILEGIO'
        ? cuenta === null
          ? 'Esta sesión no puede hacer esto'
          : `La cuenta «${cuenta}» no puede hacer esto`
        : error.codigo === 'SIN_MUNICIPALIDAD'
          ? 'La sesión no dice de qué municipalidad es'
          : error.codigo === 'NO_ENCONTRADO'
            ? 'Eso no está en esta municipalidad'
            : error.codigo === 'VALIDACION'
              ? /* No dice «no admite eso»: desde #562 la notificación de un
                   valor y la prescripción contestan 422 cuando falta publicar
                   el plazo al conjunto sellado, y ese titular pone a corregir
                   un formulario que está bien. */
                'El servidor rechazó la operación'
              : error.codigo === 'CONFLICTO'
                ? 'Eso ya estaba hecho'
                : error.codigo === 'SIN_RESPUESTA'
                  ? error.estado === 0
                    ? 'No se pudo contactar con el servidor'
                    : 'El servidor contestó otra cosa'
                  : 'Falló en el servidor';
  const explicacion =
    error.codigo === 'SIN_PRIVILEGIO'
      ? `Hace falta el acceso «${acceso}». Que la cuenta entre no basta: tiene que estar dada de alta en esta municipalidad, y el permiso lo concede Seguridad.`
      : error.codigo === 'NO_AUTENTICADO'
        ? 'Vuelve a entrar: el token caducó o no es de este emisor.'
        : error.mensaje;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '30px 24px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-card)',
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" style={{ color: 'var(--error-texto)' }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.2h.02" />
      </svg>
      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>{titulo}</p>
      <p style={{ margin: 0, maxWidth: '58ch', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>{explicacion}</p>
      {/* Las dos causas de un 422 —un campo mal puesto y una cifra normativa sin
          publicar— llegan con el MISMO código, así que la pantalla no las
          adivina: dice las dos y en qué se reconocen (#562). Sale sólo en el
          422; el helper devuelve `null` en los demás. */}
      {causasDelRechazo(error, llave) !== null && (
        <p style={{ margin: 0, maxWidth: '58ch', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-4)', textAlign: 'center', textWrap: 'pretty' }}>
          {causasDelRechazo(error, llave)}
        </p>
      )}
      {error.detalles && error.detalles.length > 0 && (
        <ul style={{ margin: '2px 0 0', paddingLeft: 18, maxWidth: '58ch', fontSize: 12, color: 'var(--ink-3)' }}>
          {error.detalles.slice(0, 8).map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
        <span>
          {ruta} · {error.estado || 'sin respuesta'}
        </span>
        {error.incidencia && (
          <>
            <span style={{ color: 'var(--line-2)' }}>|</span>
            <span>ref {error.incidencia}</span>
          </>
        )}
      </div>
      {error.codigo === 'NO_AUTENTICADO' && !hayPuerta() && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, width: 'min(560px, 100%)' }}>
          <input
            value={tokenPegado}
            onChange={(e) => setTokenPegado(e.target.value)}
            placeholder="Pega aquí un token del emisor: eyJhbGciOi…"
            spellCheck={false}
            style={{ ...CONTROL, flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button
            onClick={() => {
              fijarToken(tokenPegado.trim() || null);
              setTokenPegado('');
              onReintentar();
            }}
            disabled={tokenPegado.trim() === ''}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '8px 17px',
              background: 'var(--accent)',
              color: 'var(--accent-contraste)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: tokenPegado.trim() === '' ? 'not-allowed' : 'pointer',
              opacity: tokenPegado.trim() === '' ? 0.55 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            Usar este token
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
        {error.incidencia && (
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(error.incidencia!);
              toast(`Referencia ${error.incidencia} copiada.`);
            }}
            className="hov-linea"
            style={BOTON_SEC}
          >
            Copiar referencia
          </button>
        )}
        {error.reintentable && (
          <button onClick={onReintentar} className="hov-acento-2" style={{ ...BOTON_SEC, border: 0, background: 'var(--accent)', color: 'var(--accent-contraste)', fontWeight: 500 }}>
            Reintentar
          </button>
        )}
      </div>
    </section>
  );
}

function Lectura<T>({ lectura, ruta, acceso, children }: { lectura: Lect<T>; ruta: string; acceso: string; children: ReactNode }) {
  if (lectura.cargando) return <Cargando />;
  if (lectura.error) return <Fallo error={lectura.error} ruta={ruta} acceso={acceso} onReintentar={lectura.reintentar} />;
  return <>{children}</>;
}

function TablaDeTextos({
  cols,
  filas,
  min,
  insigniaEn = -1,
  vacio,
  onFila,
}: {
  cols: ColDef[];
  filas: ReactNode[][];
  min?: string;
  insigniaEn?: number;
  vacio: ReactNode;
  onFila?: (i: number) => void;
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
          {filas.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ padding: '26px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                {vacio}
              </td>
            </tr>
          )}
          {filas.map((f, i) => (
            <tr
              key={i}
              className={onFila ? 'hov-acento' : 'hov-elev'}
              onClick={onFila ? () => onFila(i) : undefined}
              style={{ borderTop: '1px solid var(--line)', cursor: onFila ? 'pointer' : undefined }}
            >
              {f.map((c, j) =>
                j === insigniaEn ? (
                  <td key={j} style={{ padding: '11px 14px' }}>
                    <Insignia tono={tonoDeSituacion(String(c))}>{rotuloDeSituacion(String(c))}</Insignia>
                  </td>
                ) : (
                  <td key={j} style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Un campo del formulario, con su rótulo y su ayuda. */
function Campo({ etiqueta, ayuda, ancho, children }: { etiqueta: string; ayuda?: ReactNode; ancho?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0, gridColumn: ancho ? '1 / -1' : undefined }}>
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 5 }}>
        {etiqueta}
      </span>
      {children}
      {ayuda && <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textWrap: 'pretty' }}>{ayuda}</span>}
    </label>
  );
}

function Rejilla({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 13, padding: '14px 16px' }}>{children}</div>;
}

/**
 * La barra de la acción que escribe.
 *
 * La primaria nace **apagada sin observación** (regla 10, RNF-052), y su
 * `title` dice por qué: sin motivo no se guarda, y el backend lo comprueba
 * también de su lado. Cuando falta algo más, lo nombra.
 */
function BarraDeAccion({
  observacion,
  onObservacion,
  impedimento,
  etiqueta,
  aviso,
  enviando,
  onEnviar,
}: {
  observacion: string;
  onObservacion: (v: string) => void;
  impedimento: string | null;
  etiqueta: string;
  aviso: ReactNode;
  enviando: boolean;
  onEnviar: () => void;
}) {
  const apagada = impedimento !== null || enviando;
  return (
    <>
      <Rejilla>
        <Campo
          etiqueta="Observación"
          ancho
          ayuda="Toda modificación de datos se guarda con el motivo de quien la hace. Sin ella el servidor rechaza la petición."
        >
          <textarea
            value={observacion}
            onChange={(e) => onObservacion(e.target.value)}
            rows={2}
            placeholder="Por qué se registra este acto"
            style={{ ...CONTROL, resize: 'vertical', minHeight: 60 }}
          />
        </Campo>
      </Rejilla>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
        <p style={{ margin: 0, flex: 1, minWidth: 200, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{aviso}</p>
        <button
          onClick={onEnviar}
          disabled={apagada}
          aria-disabled={apagada}
          title={impedimento ?? undefined}
          className={apagada ? undefined : 'hov-acento-2'}
          style={{
            border: 0,
            borderRadius: 6,
            padding: '9px 20px',
            background: 'var(--accent)',
            color: 'var(--accent-contraste)',
            fontSize: 13,
            fontWeight: 500,
            cursor: apagada ? 'not-allowed' : 'pointer',
            opacity: apagada ? 0.55 : 1,
          }}
        >
          {enviando ? 'Enviando…' : etiqueta}
        </button>
      </div>
      {impedimento !== null && (
        <p style={{ margin: 0, padding: '0 16px 12px', fontSize: 12, color: 'var(--warn-fg)', textWrap: 'pretty' }}>{impedimento}</p>
      )}
    </>
  );
}

/** Una fila de la bandeja del panel: cuenta cuántos valores hay en su situación. */
function FilaDeBandeja({
  situacion,
  onAbrir,
}: {
  situacion: (typeof SITUACIONES_EXPLICADAS)[number];
  onAbrir: (s: Situacion) => void;
}) {
  const censo = useRecurso((s) => consultarValores({ estado: situacion.k }, { tamano: 1 }, s), [situacion.k], true);
  return (
    <button
      onClick={() => onAbrir(situacion.k)}
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
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <Insignia tono={situacion.tono}>{situacion.label}</Insignia>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{situacion.que}</span>
      </span>
      <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--ink)' }}>
          {censo.cargando ? '…' : censo.error ? SIN_DATO : (censo.datos?.totalElementos ?? 0).toLocaleString('es-PE')}
        </span>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)' , marginTop: 2 }}>
          {censo.error?.codigo === 'SIN_PRIVILEGIO' ? 'sin permiso' : censo.datos?.totalElementos === 1 ? 'valor' : 'valores'}
        </span>
      </span>
      <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
    </button>
  );
}

/* ══════════ El módulo ══════════ */
export default function Valores({ dest, onDest }: PantallaProps) {
  const { toast } = usarPreferencias();

  /* ── Lista y expediente ── */
  const [q, setQ] = useState('');
  const criterio = useRebote(q.trim());
  const [fTipo, setFTipo] = useState<'' | TipoDeValor>('');
  const [fSituacion, setFSituacion] = useState<'' | Situacion>('');
  const [abierto, setAbierto] = useState<ValorConsultado | null>(null);
  const [pestania, setPestania] = useState<Pestania>('valor');

  /* ── Emisión ── */
  const [hoja, setHoja] = useState<'individual' | 'masiva'>('individual');
  const [eCod, setECod] = useState('');
  const codDeEmision = useRebote(eCod.trim());
  const [eTipo, setETipo] = useState<TipoDeValor>('OP');
  const [eMarcadas, setEMarcadas] = useState<Record<string, boolean>>({});
  const [eObs, setEObs] = useState('');
  const [emitido, setEmitido] = useState<Valor | null>(null);

  const [mTipo, setMTipo] = useState<TipoDeValor>('OP');
  const [mTributo, setMTributo] = useState('');
  const [mDesde, setMDesde] = useState('');
  const [mHasta, setMHasta] = useState('');
  const [mFecha, setMFecha] = useState('');
  const [mLista, setMLista] = useState('');
  const [mCsv, setMCsv] = useState<{ nombre: string; base64: string } | null>(null);
  const [mObs, setMObs] = useState('');
  const [corrida, setCorrida] = useState<CorridaMasiva | null>(null);

  /* ── Notificación y pase ── */
  const [nFecha, setNFecha] = useState('');
  const [nModalidad, setNModalidad] = useState<Modalidad>('PERSONAL');
  const [nResultado, setNResultado] = useState<ResultadoDeDiligencia>('NOTIFICADO');
  const [nNotificador, setNNotificador] = useState('');
  const [nDireccion, setNDireccion] = useState('');
  const [nRecibe, setNRecibe] = useState('');
  const [nDoc, setNDoc] = useState('');
  const [nVinculo, setNVinculo] = useState('');
  const [nAcuse, setNAcuse] = useState('');
  const [nObs, setNObs] = useState('');
  const [notificada, setNotificada] = useState<Notificacion | null>(null);

  const [pcoFecha, setPcoFecha] = useState('');
  const [pcoObs, setPcoObs] = useState('');
  const [movido, setMovido] = useState<MovimientoDelValor | null>(null);

  /* ── Prescripción ── */
  const [prCod, setPrCod] = useState('');
  const codDePrescripcion = useRebote(prCod.trim());
  const [prTributo, setPrTributo] = useState('');
  const [prDesde, setPrDesde] = useState('');
  const [prHasta, setPrHasta] = useState('');
  const [prPresentacion, setPrPresentacion] = useState('');
  const [prCausal, setPrCausal] = useState<Causal>('DECLARACION_PRESENTADA');
  const [prResolucion, setPrResolucion] = useState('');
  const [prHechos, setPrHechos] = useState<HechoDelComputo[]>([]);
  const [prObs, setPrObs] = useState('');
  const [declarada, setDeclarada] = useState<Prescripcion | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  /* ── El envío, común a los cinco actos ── */
  const [enviando, setEnviando] = useState(false);
  const [falloDeEscritura, setFalloDeEscritura] = useState<ErrorDeApi | null>(null);

  async function enviar<T>(accion: () => Promise<T>, tras: (r: T) => void, dicho: string) {
    setEnviando(true);
    setFalloDeEscritura(null);
    try {
      const r = await accion();
      tras(r);
      toast(dicho);
    } catch (fallo) {
      setFalloDeEscritura(fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0));
    } finally {
      setEnviando(false);
    }
  }

  /* Salir del módulo por el panel cierra el valor abierto: el expediente vive
     dentro de «Valores», no es un destino más. */
  useEffect(() => {
    setAbierto(null);
    setFalloDeEscritura(null);
  }, [dest]);

  const esValor = dest === 'lista' && abierto !== null;

  /* ── Las lecturas ───────────────────────────────────────────── */
  const lista = useRecurso(
    (s) =>
      consultarValores(
        { nroDeValor: criterio || undefined, tipo: fTipo || undefined, estado: fSituacion || undefined },
        { tamano: 50 },
        s,
      ),
    [criterio, fTipo, fSituacion],
    dest === 'lista' && abierto === null,
  );
  const censoTotal = useRecurso((s) => consultarValores({}, { tamano: 1 }, s), [], dest === 'panel');

  /* La cabecera completa del valor abierto: la base legal, la observación con
     que se emitió y el ejercicio solo los publica `valores_busqueda`. */
  const cabecera = useRecurso(
    (s) => listarValores({ nroDeValor: abierto!.numero }, { tamano: 1 }, s),
    [abierto?.numero],
    esValor,
  );

  /* La deuda que puede formalizar el valor individual. Es la única fuente de
     qué obligaciones existen y con qué desglose: el valor no crea deuda, la
     formaliza. */
  const deudaAEmitir = useRecurso(
    (s) => deudaDelContribuyente({ codContribuyente: codDeEmision }, { tamano: 50 }, s),
    [codDeEmision],
    dest === 'emision' && hoja === 'individual' && codDeEmision !== '',
  );
  /* Lo que el contribuyente debe, para elegir el tributo y el rango sobre el
     que se pide la prescripción. */
  const deudaAPrescribir = useRecurso(
    (s) => deudaDelContribuyente({ codContribuyente: codDePrescripcion }, { tamano: 50 }, s),
    [codDePrescripcion],
    dest === 'prescripcion' && codDePrescripcion !== '',
  );
  const yaPrescritos = useRecurso(
    (s) => consultarValores({ codContribuyente: codDePrescripcion, estado: 'PRESCRITO' }, { tamano: 20 }, s),
    [codDePrescripcion],
    dest === 'prescripcion' && codDePrescripcion !== '',
  );

  /* Las solicitudes ya declaradas (#674). Se pide SIN exigir contribuyente: la
     pregunta de quien audita es «qué hay declarado prescrito», no «qué le
     declaré a esta persona», y acotarla al código tecleado dejaría la lectura
     inalcanzable justo para esa pregunta. Con código puesto, acota. */
  const declaradas = useRecurso(
    (s) => listarPrescripciones(codDePrescripcion === '' ? {} : { codContribuyente: codDePrescripcion }, { tamano: 20 }, s),
    [codDePrescripcion],
    dest === 'prescripcion',
  );

  /* ── Emisión individual: qué se marcó ─────────────────────── */
  const llaveDe = (o: ObligacionConDeuda) => `${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}`;
  const obligaciones = deudaAEmitir.datos?.contenido ?? [];
  const marcadas = obligaciones.filter((o) => eMarcadas[llaveDe(o)] === true);

  const impedimentoIndividual =
    codDeEmision === ''
      ? 'Falta el contribuyente: un valor se emite a nombre de alguien.'
      : marcadas.length === 0
        ? 'Marca al menos una obligación: un valor formaliza deuda que ya existe, no la crea.'
        : eObs.trim() === ''
          ? 'Falta la observación: toda emisión se guarda con el motivo de quien la hace.'
          : null;

  const contribuyentesDelLote = mLista
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter((x) => x !== '');
  const impedimentoMasivo =
    mDesde.trim() === '' || mHasta.trim() === ''
      ? 'Falta el rango de ejercicios: la corrida acota qué deuda entra.'
      : contribuyentesDelLote.length === 0 && mCsv === null
        ? 'Falta la lista de candidatos: o se pegan los códigos, o se importa el archivo.'
        : contribuyentesDelLote.length > 0 && mCsv !== null
          ? 'Sobra una de las dos listas: el servidor admite la selección o el archivo, y solo uno de los dos.'
          : mObs.trim() === ''
            ? 'Falta la observación: toda corrida se guarda con el motivo de quien la hace.'
            : null;

  const impedimentoNotificacion =
    nFecha === ''
      ? 'Falta la fecha de la diligencia.'
      : nNotificador.trim() === ''
        ? 'Falta el notificador: la diligencia la lleva alguien con nombre.'
        : nObs.trim() === ''
          ? 'Falta la observación: sin motivo no se guarda.'
          : null;

  const impedimentoPase = pcoObs.trim() === '' ? 'Falta la observación: sin motivo no se guarda.' : null;

  /* Un hecho a medias no se manda. El servidor lo rechaza —«Falta el campo
     'hechos[].fechaDesde'»— y ese 422 de ida y vuelta es evitable: lo que falta
     se ve desde aquí. Una suspensión sin fin sí se manda: el servidor la
     admite, y el intervalo abierto es un estado legítimo. */
  const hechoIncompleto = prHechos.findIndex((h) => h.causal.trim() === '' || h.fechaDesde === '');
  const impedimentoPrescripcion =
    codDePrescripcion === ''
      ? 'Falta el contribuyente que la solicita.'
      : prTributo.trim() === ''
        ? 'Falta el tributo sobre el que se pide.'
        : prDesde.trim() === '' || prHasta.trim() === ''
          ? 'Falta el rango de ejercicios: el cómputo se resuelve ejercicio por ejercicio.'
          : hechoIncompleto >= 0
            ? `Al hecho ${hechoIncompleto + 1} le falta su causal o su fecha: un hecho sin las dos no dice nada del cómputo, y el servidor lo rechaza.`
            : prObs.trim() === ''
              ? 'Falta la observación: sin motivo no se declara.'
              : null;

  /* ── Cabecera ──────────────────────────────────────────────── */
  const titulos: Record<string, string> = {
    panel: 'Panel del módulo',
    lista: 'Valores',
    emision: 'Emisión',
    prescripcion: 'Prescripción',
  };
  const miga = esValor ? ['Valores', 'Valor ' + abierto.numero, PESTANIAS.find((p) => p.k === pestania)!.label] : ['Valores', titulos[dest] ?? 'Valores'];
  const titulo = esValor ? 'Valor ' + abierto.numero : (titulos[dest] ?? 'Valores');

  const paleta = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Valores',
    ir: () => {
      setAbierto(null);
      onDest(o[1]);
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
      notasDeDestino={{
        lista: lista.datos ? plural(lista.datos.totalElementos, 'valor emitido', 'valores emitidos') : 'Emitidos',
        panel: censoTotal.datos ? plural(censoTotal.datos.totalElementos, 'valor', 'valores') : 'Qué le falta a cada valor',
      }}
      tarjeta={
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-elev)' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
            El reloj de prescripción
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            No se dibuja aquí: el plazo es una cifra normativa del conjunto de parámetros sellado, y esta interfaz no lo tiene ni lo puede
            leer. Lo calcula el servidor al declarar la prescripción, ejercicio por ejercicio.
          </p>
        </div>
      }
      contexto={
        esValor
          ? {
              volver: { label: 'Valores', onClick: () => setAbierto(null) },
              codigo: abierto.numero,
              titular: abierto.contribuyente,
              ubic: `${abierto.tipo} · ${abierto.tributo ?? SIN_DATO} ${abierto.periodo ?? ''}`,
              derecha: (
                <>
                  <Insignia tono={tonoDeSituacion(abierto.situacion)}>{rotuloDeSituacion(abierto.situacion)}</Insignia>
                  <Insignia tono="neutro">situación al {abierto.situacionA}</Insignia>
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
            <Entradilla>
              Un valor es el documento con el que la municipalidad puede exigir el pago. Emitirlo no basta: hasta que se notifica no corre
              ningún plazo, y si el plazo pasa, la deuda prescribe aunque el valor exista.
            </Entradilla>

            <Seccion
              titulo="En qué punto de la cobranza está cada valor"
              meta={
                censoTotal.cargando
                  ? '…'
                  : censoTotal.error
                    ? SIN_DATO
                    : plural(censoTotal.datos?.totalElementos ?? 0, 'valor emitido', 'valores emitidos')
              }
              pie="Cada fila cuenta los valores que están en esa situación a día de hoy. La situación no es la columna que la cabecera guarda: es una función de ella y de la fecha, así que un valor notificado pasa a exigible sin que ninguna fila cambie."
            >
              {SITUACIONES_EXPLICADAS.map((s) => (
                <FilaDeBandeja
                  key={s.k}
                  situacion={s}
                  onAbrir={(k) => {
                    setFSituacion(k);
                    setQ('');
                    setFTipo('');
                    onDest('lista');
                  }}
                />
              ))}
            </Seccion>

            <Aviso tono="neutro" titulo="Lo que este panel no dice, y por qué">
              <strong>El importe de cada situación no sale.</strong> Ninguna lectura publica el total por situación, y sumarlo aquí sobre la
              página que se descargó daría una cifra que cambia al pasar de página: una cifra de dinero no se compone en la pantalla
              (RNF-083). <br />
              <strong>El reloj de prescripción tampoco.</strong> El artboard dibujaba una barra por ejercicio con «cuatro años desde el 1 de
              enero siguiente»; ese plazo es una cifra normativa que vive en el conjunto de parámetros sellado, y{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>GET /seguridad/parametros</code> publica los conjuntos, no sus
              valores. Compilarlo aquí sería escribirlo a mano. Quien lo calcula es el servidor, al declarar la prescripción.
            </Aviso>
          </div>
        )}

        {/* ══════════ LISTA ══════════ */}
        {dest === 'lista' && !esValor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Entradilla>
              Los valores emitidos, con lo que le falta a cada uno. El filtro que se usa es el de la situación: nadie busca «un valor», se
              busca «los que hay que notificar».
            </Entradilla>

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Número de valor"
                  placeholder="Número del valor, entero"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-3)' }}>
                  Tipo
                  <select value={fTipo} onChange={(e) => setFTipo(e.target.value as '' | TipoDeValor)} style={{ ...CONTROL, width: 'auto', padding: '6px 9px', fontSize: 12.5 }}>
                    <option value="">Todos</option>
                    {TIPOS_DE_VALOR.map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 6 }}>Situación</span>
                {(['', ...SITUACIONES] as ('' | Situacion)[]).map((s) => {
                  const on = fSituacion === s;
                  return (
                    <button
                      key={s || 'todas'}
                      onClick={() => setFSituacion(s)}
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
                      {s === '' ? 'Todas' : rotuloDeSituacion(s)}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: 0, padding: '9px 16px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                Las siete situaciones son las que el dominio declara. «RECLAMADO», que el prototipo ofrecía como octava, no está: no hay
                reclamación de valores todavía, y pedirla devuelve un rechazo con el motivo en vez del listado sin filtrar.
              </p>
            </section>

            <Seccion
              titulo="Valores emitidos"
              meta={lista.datos ? `${lista.datos.contenido.length} de ${lista.datos.totalElementos}` : ''}
              pie="El importe está congelado al día de la emisión, no al de hoy: reimprimir el valor dos años después devuelve el mismo desglose. La situación sí se mira a hoy, y la fecha desde la que se miró sale en cada fila."
            >
              <Lectura lectura={lista} ruta="GET /api/v1/consultas/valores" acceso="consulta_valores">
                <TablaDeTextos
                  cols={COLS_LISTA}
                  min="1060px"
                  insigniaEn={9}
                  vacio="Ningún valor con esos filtros. Si acabas de instalar, aún no se ha emitido ninguno: se emiten en «Emisión»."
                  onFila={(i) => {
                    const v = lista.datos?.contenido[i];
                    if (!v) return;
                    setAbierto(v);
                    setPestania(v.notificadoEl === null ? 'notificacion' : 'valor');
                    setNotificada(null);
                    setMovido(null);
                    setFalloDeEscritura(null);
                  }}
                  filas={(lista.datos?.contenido ?? []).map((v) => [
                    v.numero,
                    v.tipo,
                    v.contribuyente,
                    v.tributo ?? SIN_DATO,
                    v.periodo ?? SIN_DATO,
                    v.fechaEmision,
                    v.notificadoEl ?? SIN_DATO,
                    v.exigibleDesde ?? SIN_DATO,
                    v.monto.importe,
                    v.situacion,
                  ])}
                />
                {lista.datos && lista.datos.contenido.length > 0 && (
                  <p style={{ margin: 0, padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-4)' }}>
                    Importes proyectados al {lista.datos.contenido[0].monto.actualizadoA}; situación mirada al {lista.datos.contenido[0].situacionA}.
                  </p>
                )}
              </Lectura>
            </Seccion>
          </div>
        )}

        {/* ══════════ EL EXPEDIENTE DEL VALOR ══════════ */}
        {esValor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Seccion>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0 }}>
                {(
                  [
                    ['Nº de valor', abierto.numero, 'var(--ink)', ''],
                    ['Tipo', abierto.tipo, 'var(--ink)', ''],
                    ['Emitido', abierto.fechaEmision, 'var(--ink)', ''],
                    [
                      'Notificado',
                      abierto.notificadoEl ?? SIN_DATO,
                      abierto.notificadoEl === null ? 'var(--bad-fg)' : 'var(--ink)',
                      abierto.notificadoEl === null ? 'sin notificar no cobra' : '',
                    ],
                    ['Exigible desde', abierto.exigibleDesde ?? SIN_DATO, 'var(--ink)', 'lo deriva el servidor del plazo'],
                    ['Importe', 'S/ ' + abierto.monto.importe, 'var(--ink)', 'proyectado al ' + abierto.monto.actualizadoA],
                  ] as [string, string, string, string][]
                ).map((r) => (
                  <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r[2], textWrap: 'pretty' }}>{r[1]}</p>
                    {r[3] && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>{r[3]}</p>}
                  </div>
                ))}
              </div>
            </Seccion>

            {/* La guía: qué le toca a este valor ahora, deducido de su situación */}
            <Aviso
              tono={abierto.situacion === 'EMITIDO' ? 'bad' : abierto.situacion === 'EXIGIBLE' ? 'warn' : 'ok'}
              titulo={
                abierto.situacion === 'EMITIDO'
                  ? 'Este valor no está notificado'
                  : abierto.situacion === 'EXIGIBLE'
                    ? 'Exigible y sin pase a coactiva'
                    : `Situación al ${abierto.situacionA}: ${rotuloDeSituacion(abierto.situacion)}`
              }
            >
              {abierto.situacion === 'EMITIDO'
                ? 'Mientras no se notifique no se puede cobrar, no es firme y el cómputo de la prescripción sigue corriendo. Se registra en la pestaña «Notificación».'
                : abierto.situacion === 'EXIGIBLE'
                  ? 'El plazo venció y no consta reclamo: se puede remitir a la ejecutoría coactiva desde la pestaña «Movimientos».'
                  : 'La situación se calcula de lo que la cabecera guarda y de la fecha desde la que se mira; la fecha va escrita al lado para que la hoja impresa diga a qué día corresponde.'}
            </Aviso>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {PESTANIAS.map((p) => {
                const on = pestania === p.k;
                return (
                  <button
                    key={p.k}
                    onClick={() => setPestania(p.k)}
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
                    {p.label}
                  </button>
                );
              })}
            </div>

            {falloDeEscritura && (
              <Fallo error={falloDeEscritura} ruta="POST /api/v1/valores/…" acceso="notificacion_valores / pase_coactiva" llave="PLAZO:NOTIFICACION_VALOR-RD" onReintentar={() => setFalloDeEscritura(null)} />
            )}

            {/* ── El valor ── */}
            {pestania === 'valor' && (
              <>
                <Seccion titulo="Datos del valor" meta={'GET /api/v1/valores?nroDeValor=' + abierto.numero}>
                  <Lectura lectura={cabecera} ruta="GET /api/v1/valores" acceso="valores_busqueda">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '14px 20px', padding: '16px' }}>
                      <Dato rotulo="Contribuyente">{abierto.contribuyente}</Dato>
                      <Dato rotulo="Código" mono>
                        {abierto.codContribuyente}
                      </Dato>
                      <Dato rotulo="Ejercicio" mono>
                        {cabecera.datos?.contenido[0]?.ejercicio ?? SIN_DATO}
                      </Dato>
                      <Dato rotulo="Estado guardado" mono>
                        {abierto.estado}
                      </Dato>
                      <Dato rotulo="Base legal">{cabecera.datos?.contenido[0]?.baseLegal ?? SIN_DATO}</Dato>
                      <Dato rotulo="Observación con que se emitió">{cabecera.datos?.contenido[0]?.observacion ?? SIN_DATO}</Dato>
                    </div>
                  </Lectura>
                </Seccion>

                <Aviso tono="warn" titulo="El detalle congelado del valor no se puede leer">
                  El valor guarda su desglose recaudo a recaudo —qué obligación formaliza, con qué insoluto, reajuste, interés y gasto al día
                  de la emisión— y <strong>ninguna operación del contrato lo publica</strong>: ni{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>GET /valores</code> ni{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>GET /consultas/valores</code> devuelven las líneas. Lo que
                  sí sale es el total y el tributo y periodo que resume. La tabla de recaudos del prototipo se queda sin dibujar en vez de
                  rellenarse con la deuda de hoy, que es otra cifra.
                </Aviso>

                <Nota>
                  Un valor no se corrige: se anula y se emite otro (regla 4). Por eso este expediente no tiene ningún campo editable —el
                  contrato no publica ningún <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>PUT</code> ni{' '}
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>PATCH</code> sobre un valor—, y lo que le pasa después
                  llega como actos que se agregan: una notificación, un movimiento.
                </Nota>
              </>
            )}

            {/* ── Notificación ── */}
            {pestania === 'notificacion' && (
              <>
                <Seccion
                  titulo="Registrar la notificación"
                  meta={'POST /api/v1/valores/' + abierto.numero + '/notificacion'}
                  pie="Hasta que esto se registra, el valor no hace correr ningún plazo y no se puede cobrar. Es también el acto que interrumpe la prescripción."
                >
                  <Rejilla>
                    <Campo etiqueta="Fecha de la diligencia">
                      <input type="date" value={nFecha} onChange={(e) => setNFecha(e.target.value)} style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Modalidad (art. 104)">
                      <select value={nModalidad} onChange={(e) => setNModalidad(e.target.value as Modalidad)} style={CONTROL}>
                        {MODALIDADES.map((o) => (
                          <option key={o.k} value={o.k}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo etiqueta="Resultado" ayuda="NO_UBICADO no surte efecto: se reintenta y no empieza ningún plazo.">
                      <select value={nResultado} onChange={(e) => setNResultado(e.target.value as ResultadoDeDiligencia)} style={CONTROL}>
                        {RESULTADOS.map((o) => (
                          <option key={o.k} value={o.k}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo etiqueta="Notificador">
                      <input value={nNotificador} onChange={(e) => setNNotificador(e.target.value)} placeholder="Quién llevó la diligencia" style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Dirección" ayuda="Si se deja en blanco, el servidor usa el domicilio fiscal vigente a esa fecha.">
                      <input value={nDireccion} onChange={(e) => setNDireccion(e.target.value)} style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Persona que recibe">
                      <input value={nRecibe} onChange={(e) => setNRecibe(e.target.value)} style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Documento de quien recibe">
                      <input value={nDoc} onChange={(e) => setNDoc(e.target.value)} style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Vínculo con el titular">
                      <input value={nVinculo} onChange={(e) => setNVinculo(e.target.value)} style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Acuse" ancho ayuda="La constancia del cargo, tal como consta en la cédula.">
                      <input value={nAcuse} onChange={(e) => setNAcuse(e.target.value)} style={CONTROL} />
                    </Campo>
                  </Rejilla>
                  <BarraDeAccion
                    observacion={nObs}
                    onObservacion={setNObs}
                    impedimento={impedimentoNotificacion}
                    etiqueta="Registrar notificación"
                    enviando={enviando}
                    aviso="Al registrarla empieza a correr el plazo, y desde cuándo la deuda queda exigible lo deriva el servidor del plazo parametrizado: no viaja en el formulario, y no es un olvido."
                    onEnviar={() =>
                      void enviar(
                        () =>
                          notificarValor(abierto.numero, {
                            fechaDeNotificacion: nFecha,
                            tipoDeNotificacion: nModalidad,
                            resultado: nResultado,
                            notificador: nNotificador.trim(),
                            direccion: nDireccion.trim() || undefined,
                            personaQueRecibe: nRecibe.trim() || undefined,
                            documentoDeQuienRecibe: nDoc.trim() || undefined,
                            vinculo: nVinculo.trim() || undefined,
                            acuse: nAcuse.trim() || undefined,
                            observacion: nObs.trim(),
                          }),
                        (r) => {
                          setNotificada(r);
                          setNObs('');
                        },
                        'Diligencia registrada.',
                      )
                    }
                  />
                </Seccion>

                {notificada && (
                  <Seccion titulo="Diligencia registrada" meta={'intento ' + notificada.intento}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 20px', padding: '16px' }}>
                      <Dato rotulo="Fecha" mono>
                        {notificada.fechaDeNotificacion}
                      </Dato>
                      <Dato rotulo="Modalidad">{notificada.modalidad}</Dato>
                      <Dato rotulo="Resultado">{notificada.resultado}</Dato>
                      <Dato rotulo="¿Surtió efecto?">{notificada.surtioEfecto ? 'Sí' : 'No: se reintenta'}</Dato>
                      <Dato rotulo="Exigible desde" mono>
                        {notificada.exigibleDesde ?? SIN_DATO}
                      </Dato>
                      <Dato rotulo="Dirección">{notificada.direccion ?? SIN_DATO}</Dato>
                    </div>
                  </Seccion>
                )}

                <Aviso tono="neutro" titulo="Cinco campos del prototipo no se mandan">
                  «Nº de notificación», «Nº de visita», «Vence», la casilla de firma y las características de la vivienda no están en el
                  cuerpo que el servidor acepta: mandarlos los descartaría en silencio, y la pantalla parecería estar guardando algo que no
                  guarda. El número de intento lo cuenta el servidor, y el vencimiento sale de{' '}
                  <em>exigible desde</em>, que también lo deriva él. El historial de diligencias tampoco se dibuja:{' '}
                  <strong>ninguna operación del contrato lo lee</strong>; lo que se ve es la que se acaba de registrar.
                </Aviso>
              </>
            )}

            {/* ── Movimientos ── */}
            {pestania === 'movimientos' && (
              <>
                <Seccion
                  titulo="Pasar a cobranza coactiva"
                  meta={'POST /api/v1/valores/' + abierto.numero + '/movimientos'}
                  pie="Solo se puede pasar un valor exigible: notificado y con el plazo vencido. Es idempotente —pedirlo dos veces devuelve el mismo movimiento, no dos—, y eso lo garantiza la base, no una comprobación previa."
                >
                  <Rejilla>
                    <Campo etiqueta="Tipo de movimiento" ayuda="Es el único que esta ruta escribe; no es un desplegable porque no hay nada que elegir.">
                      <input value="PCO — Pase a coactivas" readOnly style={{ ...CONTROL, background: 'var(--bg-elev)', color: 'var(--ink-3)' }} />
                    </Campo>
                    <Campo etiqueta="Fecha del pase" ayuda="En blanco, hoy.">
                      <input type="date" value={pcoFecha} onChange={(e) => setPcoFecha(e.target.value)} style={CONTROL} />
                    </Campo>
                  </Rejilla>
                  <BarraDeAccion
                    observacion={pcoObs}
                    onObservacion={setPcoObs}
                    impedimento={impedimentoPase}
                    etiqueta="Registrar el pase"
                    enviando={enviando}
                    aviso="El pase hace exigible el expediente en la ejecutoría. Un valor sin notificar o con el plazo corriendo lo rechaza el servidor con el motivo."
                    onEnviar={() =>
                      void enviar(
                        () =>
                          pasarACoactiva(abierto.numero, {
                            tipoDeMovimiento: 'PCO',
                            fechaDelMovimiento: pcoFecha || undefined,
                            observacion: pcoObs.trim(),
                          }),
                        (r) => {
                          setMovido(r);
                          setPcoObs('');
                        },
                        'Pase a coactiva registrado.',
                      )
                    }
                  />
                </Seccion>

                {movido && (
                  <Seccion titulo="Movimiento registrado">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 20px', padding: '16px' }}>
                      <Dato rotulo="Tipo" mono>
                        {movido.tipoDeMovimiento}
                      </Dato>
                      <Dato rotulo="Descripción">{movido.descripcion}</Dato>
                      <Dato rotulo="Fecha" mono>
                        {movido.fechaDelMovimiento}
                      </Dato>
                      <Dato rotulo="Exigible desde" mono>
                        {movido.exigibleDesde ?? SIN_DATO}
                      </Dato>
                    </div>
                  </Seccion>
                )}

                <Aviso tono="neutro" titulo="Tres de las cuatro opciones del prototipo no van aquí">
                  El desplegable del artboard ofrecía PCO, ACO, RCO y ANU. <strong>ACO y RCO son la respuesta de la ejecutoría</strong> y los
                  escribe el módulo de Coactiva: pedirlos por esta ruta devuelve un rechazo que lo dice. Y <strong>ANU no existe</strong> en
                  el enumerado del dominio: anular un valor no es un movimiento del valor. Por eso el campo no es un desplegable con una sola
                  opción, sino un dato fijo. El historial de movimientos tampoco se dibuja: ninguna operación del contrato lo lee.
                </Aviso>
              </>
            )}
          </div>
        )}

        {/* ══════════ EMISIÓN ══════════ */}
        {dest === 'emision' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Entradilla>
              Emitir un valor no crea deuda: la formaliza. El desglose que el valor congela es exactamente el que la consulta de deuda
              devuelve, y por eso lo primero es elegir a quién y qué obligaciones suyas entran.
            </Entradilla>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['individual', 'Individual'],
                  ['masiva', 'Masiva por criterio'],
                ] as ['individual' | 'masiva', string][]
              ).map((h) => {
                const on = hoja === h[0];
                return (
                  <button
                    key={h[0]}
                    onClick={() => {
                      setHoja(h[0]);
                      setFalloDeEscritura(null);
                    }}
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
                      color: on ? 'var(--accent-contraste)' : 'var(--ink-2)',
                    }}
                  >
                    {h[1]}
                  </button>
                );
              })}
            </div>

            {falloDeEscritura && (
              <Fallo error={falloDeEscritura} ruta={hoja === 'individual' ? 'POST /api/v1/valores' : 'POST /api/v1/valores/masivo'} acceso={hoja === 'individual' ? 'valores_individual' : 'valores_masivo'} onReintentar={() => setFalloDeEscritura(null)} />
            )}

            {hoja === 'individual' && (
              <>
                <Seccion titulo="A quién se emite" meta="POST /api/v1/valores">
                  <Rejilla>
                    <Campo etiqueta="Código del contribuyente" ayuda="El código del padrón, exacto. Es lo que el servidor resuelve; un documento no le vale.">
                      <input value={eCod} onChange={(e) => setECod(e.target.value)} placeholder="C-000001" style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Tipo de valor" ayuda="Los tres que el dominio declara. La base legal la pone el servidor, no el formulario.">
                      <select value={eTipo} onChange={(e) => setETipo(e.target.value as TipoDeValor)} style={CONTROL}>
                        {TIPOS_DE_VALOR.map((t) => (
                          <option key={t.codigo} value={t.codigo}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  </Rejilla>
                </Seccion>

                <Seccion
                  titulo="Deuda que puede entrar en el valor"
                  meta={deudaAEmitir.datos ? `${marcadas.length} de ${deudaAEmitir.datos.totalElementos} marcadas` : ''}
                  pie="Son las obligaciones con deuda del contribuyente a hoy, tal como las devuelve la consulta de deuda. Los importes no viajan en la petición: el servidor congela los suyos."
                >
                  {codDeEmision === '' ? (
                    <p style={{ margin: 0, padding: '26px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                      Escribe el código del contribuyente para ver qué deuda tiene.
                    </p>
                  ) : (
                    <Lectura lectura={deudaAEmitir} ruta="GET /api/v1/consultas/deuda" acceso="consulta_deuda">
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                          <thead>
                            <tr>
                              {COLS_DEUDA_A_FORMALIZAR.map((c, i) => (
                                <th key={i} style={c[1] ? THN : TH}>
                                  {c[0]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {obligaciones.length === 0 && (
                              <tr>
                                <td colSpan={COLS_DEUDA_A_FORMALIZAR.length} style={{ padding: '26px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                                  Este contribuyente no tiene deuda pendiente: no hay nada que formalizar.
                                </td>
                              </tr>
                            )}
                            {obligaciones.map((o) => {
                              const k = llaveDe(o);
                              const on = eMarcadas[k] === true;
                              return (
                                <tr key={k} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}>
                                  <td style={{ padding: '11px 14px' }}>
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => setEMarcadas((x) => ({ ...x, [k]: !on }))}
                                      aria-label={`Formalizar ${o.tributo} del ejercicio ${o.ejercicio}`}
                                      style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                                    />
                                  </td>
                                  <td style={TD1}>{o.ejercicio}</td>
                                  <td style={TD}>{o.tributo}</td>
                                  <td style={TD}>{o.predioId !== null ? 'Predio ' + o.predioId : o.vehiculoId !== null ? 'Vehículo ' + o.vehiculoId : 'Sin unidad'}</td>
                                  <td style={TD}>{o.periodoDesde === o.periodoHasta ? o.periodoDesde : `${o.periodoDesde} – ${o.periodoHasta}`}</td>
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
                      {obligaciones.length > 0 && (
                        <p style={{ margin: 0, padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-4)' }}>
                          Deuda calculada al {obligaciones[0].deuda.total.actualizadoA}. Aquí no se suma ninguna columna: el importe del valor
                          lo compone el servidor con las obligaciones que se marquen.
                        </p>
                      )}
                    </Lectura>
                  )}
                  <BarraDeAccion
                    observacion={eObs}
                    onObservacion={setEObs}
                    impedimento={impedimentoIndividual}
                    etiqueta="Emitir el valor"
                    enviando={enviando}
                    aviso="Emitir es irreversible: el valor queda con su número correlativo, y lo que cambie después se anula, no se corrige. Además mueve la deuda a fase VALOR en el libro."
                    onEnviar={() =>
                      void enviar(
                        () =>
                          emitirValor({
                            tipo: eTipo,
                            codContribuyente: codDeEmision,
                            obligaciones: marcadas.map((o) => ({
                              tributo: o.tributo,
                              ejercicio: o.ejercicio,
                              predioId: o.predioId,
                              vehiculoId: o.vehiculoId,
                            })),
                            observacion: eObs.trim(),
                          }),
                        (r) => {
                          setEmitido(r);
                          setEObs('');
                          setEMarcadas({});
                          deudaAEmitir.reintentar();
                        },
                        'Valor emitido.',
                      )
                    }
                  />
                </Seccion>

                {emitido && (
                  <Seccion titulo="Valor emitido" meta={emitido.numero}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px 20px', padding: '16px' }}>
                      <Dato rotulo="Número" mono>
                        {emitido.numero}
                      </Dato>
                      <Dato rotulo="Tipo">{emitido.tipo}</Dato>
                      <Dato rotulo="Ejercicio" mono>
                        {emitido.ejercicio}
                      </Dato>
                      <Dato rotulo="Estado" mono>
                        {emitido.estado}
                      </Dato>
                      <Dato rotulo="Importe" mono>
                        S/ {emitido.total}
                      </Dato>
                      <Dato rotulo="Proyectado al" mono>
                        {emitido.proyectadoA}
                      </Dato>
                      <Dato rotulo="Base legal">{emitido.baseLegal}</Dato>
                    </div>
                    <div style={{ padding: '0 16px 16px' }}>
                      <button
                        onClick={() => {
                          setQ(emitido.numero);
                          setFSituacion('');
                          setFTipo('');
                          onDest('lista');
                        }}
                        className="hov-linea"
                        style={BOTON_SEC}
                      >
                        Abrirlo en la lista para notificarlo
                      </button>
                    </div>
                  </Seccion>
                )}

                <Aviso tono="neutro" titulo="Lo que el criterio del prototipo pedía y el servidor no acepta">
                  «Código de criterio», «Oficina emisora», «Vencimiento» y el par «Año desde / Año hasta» no están en el cuerpo de la emisión
                  individual: lo que el servidor recibe es el tipo, el contribuyente y la lista de obligaciones. El vencimiento se deriva del
                  plazo parametrizado cuando el valor se notifica, y la oficina emisora no la guarda ninguna columna todavía. Se dejan fuera
                  en vez de dibujarlos: un campo que se ve y no viaja es peor que uno que no existe.
                </Aviso>
              </>
            )}

            {hoja === 'masiva' && (
              <>
                <Seccion titulo="Criterio de la corrida" meta="POST /api/v1/valores/masivo">
                  <Rejilla>
                    <Campo etiqueta="Tipo de valor">
                      <select value={mTipo} onChange={(e) => setMTipo(e.target.value as TipoDeValor)} style={CONTROL}>
                        {TIPOS_DE_VALOR.map((t) => (
                          <option key={t.codigo} value={t.codigo}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo etiqueta="Tributo" ayuda="Opcional. En blanco, entra toda la deuda del rango; el nombre es el que el libro asienta, p. ej. PREDIAL.">
                      <input value={mTributo} onChange={(e) => setMTributo(e.target.value)} placeholder="PREDIAL" style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Ejercicio desde">
                      <input value={mDesde} onChange={(e) => setMDesde(e.target.value)} inputMode="numeric" placeholder="2024" style={CONTROL} />
                    </Campo>
                    <Campo etiqueta="Ejercicio hasta">
                      <input value={mHasta} onChange={(e) => setMHasta(e.target.value)} inputMode="numeric" placeholder="2026" style={CONTROL} />
                    </Campo>
                    <Campo
                      etiqueta="Fecha de criterio"
                      ayuda="A qué fecha se evalúa la deuda de cada candidato. Queda congelada en la corrida: reanudarla días después evalúa la misma deuda, no la de ese día."
                    >
                      <input type="date" value={mFecha} onChange={(e) => setMFecha(e.target.value)} style={CONTROL} />
                    </Campo>
                  </Rejilla>
                </Seccion>

                <Seccion
                  titulo="Los candidatos"
                  meta={mCsv ? mCsv.nombre : `${contribuyentesDelLote.length} códigos`}
                  pie="El servidor admite la selección o el archivo, y solo uno de los dos. El archivo lleva una columna, «codContribuyente», un candidato por fila."
                >
                  <Rejilla>
                    <Campo etiqueta="Selección" ancho ayuda="Un código del padrón por línea. También valen separados por comas.">
                      <textarea
                        value={mLista}
                        onChange={(e) => setMLista(e.target.value)}
                        rows={4}
                        disabled={mCsv !== null}
                        placeholder={'C-000001\nC-000002'}
                        style={{ ...CONTROL, resize: 'vertical', minHeight: 90, fontFamily: 'var(--font-mono)', fontSize: 12.5, opacity: mCsv !== null ? 0.5 : 1 }}
                      />
                    </Campo>
                    <Campo etiqueta="O un archivo CSV" ancho ayuda="Se manda en base64 dentro de la petición: este contrato no tiene adjuntos multiparte.">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          disabled={contribuyentesDelLote.length > 0}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const lector = new FileReader();
                            lector.onload = () => {
                              const url = String(lector.result);
                              setMCsv({ nombre: f.name, base64: url.slice(url.indexOf(',') + 1) });
                            };
                            lector.readAsDataURL(f);
                          }}
                          style={{ fontSize: 12.5 }}
                        />
                        {mCsv && (
                          <button onClick={() => setMCsv(null)} className="hov-linea" style={BOTON_SEC}>
                            Quitar «{mCsv.nombre}»
                          </button>
                        )}
                      </div>
                    </Campo>
                  </Rejilla>
                  <BarraDeAccion
                    observacion={mObs}
                    onObservacion={setMObs}
                    impedimento={impedimentoMasivo}
                    etiqueta="Registrar la corrida"
                    enviando={enviando}
                    aviso="Esto registra el criterio y valida los candidatos; no emite todavía ningún valor. La emisión corre aparte, en el proceso por lotes, para que una corrida de miles no compita con la caja."
                    onEnviar={() =>
                      void enviar(
                        () =>
                          generarValoresMasivos({
                            tipo: mTipo,
                            tributo: mTributo.trim() || undefined,
                            ejercicioDesde: Number(mDesde.trim()),
                            ejercicioHasta: Number(mHasta.trim()),
                            fechaCriterio: mFecha || undefined,
                            contribuyentes: mCsv === null ? contribuyentesDelLote : undefined,
                            archivoCsv: mCsv?.base64,
                            observacion: mObs.trim(),
                          }),
                        (r) => {
                          setCorrida(r);
                          setMObs('');
                        },
                        'Corrida registrada.',
                      )
                    }
                  />
                </Seccion>

                {corrida && (
                  <Seccion titulo="Corrida registrada" meta={'#' + corrida.id}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px 20px', padding: '16px' }}>
                      <Dato rotulo="Tipo">{corrida.tipo}</Dato>
                      <Dato rotulo="Tributo">{corrida.tributo ?? 'Toda la deuda'}</Dato>
                      <Dato rotulo="Ejercicios" mono>
                        {corrida.ejercicioDesde} — {corrida.ejercicioHasta}
                      </Dato>
                      <Dato rotulo="Fecha de criterio" mono>
                        {corrida.fechaCriterio ?? SIN_DATO}
                      </Dato>
                      <Dato rotulo="Origen">{corrida.origen}</Dato>
                      <Dato rotulo="Candidatos" mono>
                        {corrida.totalCandidatos}
                      </Dato>
                    </div>
                  </Seccion>
                )}

                <Aviso tono="neutro" titulo="La simulación del lote del prototipo no se puede dibujar">
                  El artboard enseñaba un embudo —«deuda vencida», «con deuda mínima o más», «sin convenio vigente», «sin valor previo»— con
                  sus cuentas y sus exclusiones. El servidor no publica ninguna de esas etapas: lo que devuelve al registrar la corrida es
                  cuántos candidatos aceptó, y los que rechaza los nombra uno a uno en el error. Y la «deuda mínima» del criterio sería una
                  cifra tributaria escrita en la pantalla: no se pide.
                </Aviso>
              </>
            )}
          </div>
        )}

        {/* ══════════ PRESCRIPCIÓN ══════════ */}
        {dest === 'prescripcion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Entradilla>
              La prescripción no se declara sola: la pide el contribuyente o la reconoce la municipalidad. Lo que decide es el plazo del art.
              43 y la fecha del último acto que interrumpió el cómputo. Las dos las resuelve el servidor: aquí se declaran los hechos.
            </Entradilla>

            {falloDeEscritura && (
              <Fallo error={falloDeEscritura} ruta="POST /api/v1/coactiva/prescripcion" acceso="prescripcion" llave="PLAZO:PRESCRIPCION-DECLARACION_PRESENTADA" onReintentar={() => setFalloDeEscritura(null)} />
            )}

            <Seccion titulo="La solicitud" meta="POST /api/v1/coactiva/prescripcion">
              <Rejilla>
                <Campo etiqueta="Código del contribuyente">
                  <input value={prCod} onChange={(e) => setPrCod(e.target.value)} placeholder="C-000001" style={CONTROL} />
                </Campo>
                <Campo etiqueta="Tributo" ayuda="El nombre con que el libro lo asienta. Abajo salen los que este contribuyente debe.">
                  <input value={prTributo} onChange={(e) => setPrTributo(e.target.value)} placeholder="PREDIAL" style={CONTROL} />
                </Campo>
                <Campo etiqueta="Ejercicio desde">
                  <input value={prDesde} onChange={(e) => setPrDesde(e.target.value)} inputMode="numeric" placeholder="2015" style={CONTROL} />
                </Campo>
                <Campo etiqueta="Ejercicio hasta">
                  <input value={prHasta} onChange={(e) => setPrHasta(e.target.value)} inputMode="numeric" placeholder="2020" style={CONTROL} />
                </Campo>
                <Campo etiqueta="Fecha de presentación" ayuda="En blanco, hoy.">
                  <input type="date" value={prPresentacion} onChange={(e) => setPrPresentacion(e.target.value)} style={CONTROL} />
                </Campo>
                <Campo
                  etiqueta="Causal del plazo (art. 43)"
                  ayuda="De ella depende el plazo, y la resolución tiene que decir por qué aplicó el que aplicó. El número de años no se elige aquí: lo resuelve el conjunto de parámetros sellado."
                >
                  <select value={prCausal} onChange={(e) => setPrCausal(e.target.value as Causal)} style={CONTROL}>
                    {CAUSALES.map((c) => (
                      <option key={c.k} value={c.k}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo etiqueta="Nº de resolución" ayuda="Si ya se emitió. Opcional.">
                  <input value={prResolucion} onChange={(e) => setPrResolucion(e.target.value)} style={CONTROL} />
                </Campo>
              </Rejilla>
            </Seccion>

            {codDePrescripcion !== '' && (
              <Seccion
                titulo="Qué debe este contribuyente"
                meta={deudaAPrescribir.datos ? `${deudaAPrescribir.datos.totalElementos} obligaciones` : ''}
                pie="Pulsa una fila para copiar su tributo y su ejercicio a la solicitud. La deuda con saldo es la que la declaración extinguiría."
              >
                <Lectura lectura={deudaAPrescribir} ruta="GET /api/v1/consultas/deuda" acceso="consulta_deuda">
                  <TablaDeTextos
                    cols={[
                      ['Año', 0],
                      ['Tributo', 0],
                      ['Unidad', 0],
                      ['Fase', 0],
                      ['Total S/', 1],
                    ]}
                    vacio="Este contribuyente no tiene deuda pendiente."
                    onFila={(i) => {
                      const o = deudaAPrescribir.datos?.contenido[i];
                      if (!o) return;
                      setPrTributo(o.tributo);
                      if (prDesde.trim() === '') setPrDesde(String(o.ejercicio));
                      setPrHasta(String(o.ejercicio));
                    }}
                    filas={(deudaAPrescribir.datos?.contenido ?? []).map((o) => [
                      String(o.ejercicio),
                      o.tributo,
                      o.predioId !== null ? 'Predio ' + o.predioId : o.vehiculoId !== null ? 'Vehículo ' + o.vehiculoId : 'Sin unidad',
                      o.fase,
                      o.deuda.total.importe,
                    ])}
                  />
                </Lectura>
              </Seccion>
            )}

            <Seccion
              titulo="Hechos que interrumpen o suspenden el cómputo"
              meta={`${prHechos.length} declarados`}
              acciones={
                <button
                  onClick={() => setPrHechos((h) => [...h, { clase: 'INTERRUPCION', causal: '', fechaDesde: '' }])}
                  className="hov-linea"
                  style={{ ...BOTON_SEC, padding: '6px 12px', fontSize: 12 }}
                >
                  Añadir un hecho
                </button>
              }
              pie="Una interrupción reinicia el plazo desde cero (art. 45) y una suspensión solo lo detiene mientras dura (art. 46). No es un matiz: tratarlas igual adelanta o atrasa la prescripción en años."
            >
              {prHechos.length === 0 && (
                <p style={{ margin: 0, padding: '20px 16px', fontSize: 13, color: 'var(--ink-3)' }}>
                  Ninguno declarado. Sin hechos, el cómputo corre entero desde su inicio.
                </p>
              )}
              {prHechos.map((h, i) => (
                <div key={i} style={{ borderTop: i === 0 ? undefined : '1px solid var(--line)' }}>
                  <Rejilla>
                    <Campo etiqueta="Clase">
                      <select
                        value={h.clase}
                        onChange={(e) =>
                          setPrHechos((xs) => xs.map((x, j) => (j === i ? { ...x, clase: e.target.value as ClaseDeHecho } : x)))
                        }
                        style={CONTROL}
                      >
                        <option value="INTERRUPCION">INTERRUPCION — reinicia el plazo</option>
                        <option value="SUSPENSION">SUSPENSION — lo detiene mientras dura</option>
                      </select>
                    </Campo>
                    <Campo
                      etiqueta="Causal"
                      ancho
                      ayuda="Es la cita que la resolución lleva; el servidor no la valida contra una lista, así que se puede escribir otra."
                    >
                      <input
                        value={h.causal}
                        list={'causales-' + i}
                        onChange={(e) => setPrHechos((xs) => xs.map((x, j) => (j === i ? { ...x, causal: e.target.value } : x)))}
                        style={CONTROL}
                      />
                      <datalist id={'causales-' + i}>
                        {CAUSALES_SUGERIDAS.filter((c) => c.clase === h.clase).map((c) => (
                          <option key={c.causal} value={c.causal} />
                        ))}
                      </datalist>
                    </Campo>
                    <Campo etiqueta="Desde">
                      <input
                        type="date"
                        value={h.fechaDesde}
                        onChange={(e) => setPrHechos((xs) => xs.map((x, j) => (j === i ? { ...x, fechaDesde: e.target.value } : x)))}
                        style={CONTROL}
                      />
                    </Campo>
                    <Campo etiqueta="Hasta" ayuda={h.clase === 'INTERRUPCION' ? 'Una interrupción es un día, no un intervalo: no lleva fin.' : 'El último día del intervalo suspendido.'}>
                      <input
                        type="date"
                        value={h.fechaHasta ?? ''}
                        disabled={h.clase === 'INTERRUPCION'}
                        onChange={(e) => setPrHechos((xs) => xs.map((x, j) => (j === i ? { ...x, fechaHasta: e.target.value } : x)))}
                        style={{ ...CONTROL, opacity: h.clase === 'INTERRUPCION' ? 0.5 : 1 }}
                      />
                    </Campo>
                  </Rejilla>
                  <div style={{ padding: '0 16px 12px' }}>
                    <button onClick={() => setPrHechos((xs) => xs.filter((_, j) => j !== i))} className="hov-linea" style={{ ...BOTON_SEC, padding: '6px 12px', fontSize: 12 }}>
                      Quitar este hecho
                    </button>
                  </div>
                </div>
              ))}
            </Seccion>

            <Seccion titulo="Declarar">
              <BarraDeAccion
                observacion={prObs}
                onObservacion={setPrObs}
                impedimento={impedimentoPrescripcion}
                etiqueta={confirmando ? 'Sí: declarar la prescripción' : 'Declarar la prescripción'}
                enviando={enviando}
                aviso={
                  confirmando
                    ? 'Se marcarán como prescritos los valores del rango y la acción de cobro se extingue. No hay vuelta atrás: vuelve a pulsar para confirmar.'
                    : 'Declarar la prescripción extingue la acción de cobro y marca los valores del rango. Es irreversible y queda en la bitácora con su resolución.'
                }
                onEnviar={() => {
                  if (!confirmando) {
                    setConfirmando(true);
                    return;
                  }
                  void enviar(
                    () =>
                      declararPrescripcion({
                        codContribuyente: codDePrescripcion,
                        tributo: prTributo.trim(),
                        ejercicioDesde: Number(prDesde.trim()),
                        ejercicioHasta: Number(prHasta.trim()),
                        fechaDePresentacion: prPresentacion || undefined,
                        plazoAplicable: prCausal,
                        hechos: prHechos.length === 0 ? undefined : prHechos.map((h) => ({ ...h, fechaHasta: h.clase === 'INTERRUPCION' ? undefined : h.fechaHasta || undefined })),
                        nDeResolucion: prResolucion.trim() || undefined,
                        observacion: prObs.trim(),
                      }),
                    (r) => {
                      setDeclarada(r);
                      setPrObs('');
                      setConfirmando(false);
                      yaPrescritos.reintentar();
                    },
                    'Prescripción declarada.',
                  );
                }}
              />
            </Seccion>

            {/* El reloj: lo que el servidor calculó, ejercicio por ejercicio. */}
            {declarada && (
              <Seccion
                titulo="El cómputo, tal como lo resolvió el servidor"
                meta={declarada.resultado}
                pie="El plazo, el inicio del cómputo y la fecha de prescripción no se escriben en esta pantalla: los deriva el servidor del conjunto de parámetros sellado y de los hechos declarados. La barra mide el tramo transcurrido entre esas dos fechas, que son suyas."
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px 20px', padding: '16px', borderBottom: '1px solid var(--line)' }}>
                  <Dato rotulo="Plazo aplicado" mono>
                    {declarada.plazo}
                  </Dato>
                  <Dato rotulo="Causal">{declarada.plazoAplicable}</Dato>
                  <Dato rotulo="Resultado">{declarada.resultado}</Dato>
                  <Dato rotulo="Presentada el" mono>
                    {declarada.fechaDePresentacion}
                  </Dato>
                  <Dato rotulo="Nº de resolución" mono>
                    {declarada.nDeResolucion ?? SIN_DATO}
                  </Dato>
                </div>
                <TablaDeTextos
                  cols={COLS_COMPUTO}
                  vacio="Sin ejercicios en el cómputo."
                  filas={declarada.ejercicios.map((e) => [
                    String(e.ejercicio),
                    e.inicioDelComputo,
                    e.nuevoInicioDelComputo === e.inicioDelComputo ? 'sin interrupciones' : e.nuevoInicioDelComputo,
                    e.fechaDePrescripcion,
                    e.prescrita ? 'Prescrita' : 'No prescrita',
                  ])}
                />
              </Seccion>
            )}

            {codDePrescripcion !== '' && (
              <Seccion
                titulo="Valores ya declarados prescritos"
                meta={yaPrescritos.datos ? `${yaPrescritos.datos.totalElementos}` : ''}
                pie="Se leen del padrón de valores con la situación PRESCRITO, no de una lista aparte."
              >
                <Lectura lectura={yaPrescritos} ruta="GET /api/v1/consultas/valores" acceso="consulta_valores">
                  <TablaDeTextos
                    cols={[
                      ['Nº valor', 0],
                      ['Tipo', 0],
                      ['Tributo', 0],
                      ['Periodo', 0],
                      ['Emitido', 0],
                      ['Importe S/', 1],
                    ]}
                    vacio="Ninguno: a este contribuyente no se le ha declarado prescrito ningún valor."
                    filas={(yaPrescritos.datos?.contenido ?? []).map((v) => [
                      v.numero,
                      v.tipo,
                      v.tributo ?? SIN_DATO,
                      v.periodo ?? SIN_DATO,
                      v.fechaEmision,
                      v.monto.importe,
                    ])}
                  />
                </Lectura>
              </Seccion>
            )}

            {/* Lo que #674 publicó, y es la contrapartida de su decisión: una deuda
                cuya acción de cobro prescribió SIGUE siendo cartera pendiente y
                emisión del ejercicio, y la declaración no escribe un solo asiento
                en el libro. Sin esta lista, la deuda inexigible no se vería en
                ninguna parte y esa decisión sería indistinguible de un descuido. */}
            <Seccion
              titulo="Solicitudes declaradas"
              meta={declaradas.datos ? `${declaradas.datos.totalElementos}` : ''}
              pie={
                'Sin código, las de toda la municipalidad; con código, las de ese contribuyente. «Ejercicios prescritos» es la lista y no ' +
                'un sí o un no: una solicitud pide un rango y el cómputo se resuelve año por año, así que lo corriente es que los ' +
                'primeros hayan prescrito y los últimos sigan siendo exigibles. Ninguna cifra de dinero: la prescripción no extingue un ' +
                'importe, deja sin acción su cobro (art. 43 del TUO).'
              }
            >
              <Lectura lectura={declaradas} ruta="GET /api/v1/coactiva/prescripcion" acceso="prescripcion">
                <TablaDeTextos
                  cols={[
                    ['Contribuyente', 0],
                    ['Tributo', 0],
                    ['Rango pedido', 0],
                    ['Presentada', 0],
                    ['Plazo', 0],
                    ['Resultado', 0],
                    ['Ejercicios prescritos', 0],
                    ['Resolución', 0],
                  ]}
                  /* Las dos ausencias son distintas y decir la del padrón entero
                     con un código puesto es afirmar que la municipalidad no tiene
                     ninguna, que aquí es falso en cuanto alguien filtra. */
                  vacio={
                    codDePrescripcion === ''
                      ? 'Ninguna: en esta municipalidad no se ha declarado ninguna prescripción.'
                      : 'Ninguna para «' + codDePrescripcion + '». Otras personas de esta municipalidad sí pueden tener alguna: borra el código para verlas todas.'
                  }
                  filas={(declaradas.datos?.contenido ?? []).map((p) => [
                    /* El código nulo es la solicitud cuyo identificador el padrón ya
                       no resuelve, y sale igual porque es la que hay que revisar. */
                    p.contribuyente ?? (p.codContribuyente ?? 'Fuera del padrón'),
                    p.tributo,
                    `${p.ejercicioDesde} – ${p.ejercicioHasta}`,
                    p.fechaDePresentacion,
                    p.plazo,
                    p.resultado,
                    p.ejerciciosPrescritos.length === 0 ? 'Ninguno' : p.ejerciciosPrescritos.join(', '),
                    p.nDeResolucion ?? SIN_DATO,
                  ])}
                />
              </Lectura>
            </Seccion>

            <Aviso tono="neutro" titulo="Lo que el prototipo daba por hecho y aquí no está">
              La lista de «deuda con prescripción cumplida» que traía el artboard llevaba <strong>un importe por contribuyente</strong>, y
              eso sigue sin existir y no por falta de lectura: la prescripción <strong>no extingue una cifra</strong>, deja sin acción su
              cobro, así que una columna de dinero ahí afirmaría que la obligación desapareció. Lo que sí hay desde #674 es la tabla de
              arriba, con los ejercicios que prescribieron de cada solicitud. Y «Origen de la declaración», «Nº de expediente» y «Fecha de
              resolución» siguen sin viajar: el cuerpo que el servidor acepta no los tiene.
            </Aviso>
          </div>
        )}
      </div>
    </Shell>
  );
}
