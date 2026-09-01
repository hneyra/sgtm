import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { Aviso, Dato, Entradilla, Insignia, Kpi, Nota, Seccion, tonoDe } from '../../ds/componentes';
import { moduloDe } from '../../shell/modulos';
import { usarPreferencias } from '../../shell/preferencias';
import { ErrorDeApi, fijarToken } from '../../api/cliente';
import { cuentaActual, hayPuerta } from '../../api/sesion';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { Descargas } from '../../api/descarga';
import {
  altasYBajas,
  buscarContribuyentes,
  buscarPredios,
  buscarVehiculos,
  constanciaDeNoAdeudo,
  descargarConstancia,
  consultarValores,
  deudaDelContribuyente,
  deudasConBeneficio,
  fichaUnificada,
  pagosDelContribuyente,
  prediosDelContribuyente,
  titularesDelPredio,
  verRecibo,
  FASES,
  type Asiento,
  type Fase,
  type Importe,
  type ObligacionConDeuda,
  type DeudasConBeneficio,
  type PredioDelCatastro,
} from '../../api/consultas';
import {
  COLS_CONSTANCIA,
  COLS_DEUDA,
  COLS_MOVIMIENTOS,
  COLS_PAGOS,
  COLS_PREDIOS,
  COLS_VALORES,
  COLS_VEHICULOS,
  FORMAS,
  NOTAS,
  OPCIONES,
  SIN_DATO,
  VISTAS,
  type ColDef,
  type Vista,
} from '../../datos/consultas';

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
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '8px 10px',
  background: 'var(--bg-card)',
  fontSize: 13,
};
const BOTON_LINEA: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '8px 15px',
  background: 'var(--bg-elev)',
  fontSize: 12.5,
  color: 'var(--ink-2)',
  cursor: 'pointer',
};

/** La tabla de matriz de textos que los artboards repiten. */
function TablaDeTextos({
  cols,
  filas,
  min,
  insigniaEn = -1,
  vacio,
}: {
  cols: ColDef[];
  filas: ReactNode[][];
  min?: string;
  insigniaEn?: number;
  vacio: ReactNode;
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
            <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
              {f.map((c, j) =>
                j === insigniaEn ? (
                  <td key={j} style={{ padding: '11px 14px' }}>
                    <Insignia tono={tonoDe(String(c))}>{c}</Insignia>
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

/** El esqueleto de carga, con la forma de la tabla que va a llegar. */
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
 * El titular sale del **código**, no del texto: los códigos son estables por
 * contrato y el mensaje se reescribe en cuanto alguien lo lee en voz alta. Y
 * las causas no se parecen: un permiso que falta no se arregla reintentando.
 */
function Fallo({
  error,
  ruta,
  acceso,
  onReintentar,
}: {
  error: ErrorDeApi;
  ruta: string;
  acceso: string;
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
          ? 'Esta sesión no puede hacer esta consulta'
          : `La cuenta «${cuenta}» no puede hacer esta consulta`
        : error.codigo === 'SIN_MUNICIPALIDAD'
          ? 'La sesión no dice de qué municipalidad es'
          : error.codigo === 'NO_ENCONTRADO'
            ? 'Eso no está en esta municipalidad'
            : error.codigo === 'VALIDACION' || error.codigo === 'ORDEN_NO_ADMITIDO'
              ? 'El servidor no admite esa consulta'
              : error.codigo === 'SIN_RESPUESTA'
                ? error.estado === 0
                  ? 'No se pudo contactar con el servidor'
                  : 'El servidor contestó otra cosa'
                : 'La consulta falló en el servidor';
  const explicacion =
    error.codigo === 'NO_AUTENTICADO'
      ? 'Vuelve a entrar: el token caducó o no es de este emisor.'
      : error.codigo === 'SIN_PRIVILEGIO'
        ? `Hace falta el acceso «${acceso}» con privilegio de lectura. Que la cuenta entre no basta: tiene que estar dada de alta en esta municipalidad, y el permiso lo concede Seguridad.`
        : error.codigo === 'SIN_MUNICIPALIDAD'
          ? 'No hay valor por omisión: sin municipalidad en el token no hay padrón que consultar.'
          : error.mensaje;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '32px 24px',
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
      <p style={{ margin: 0, maxWidth: '56ch', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
        {explicacion}
      </p>
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
      {/* Todavía no hay puerta de sesión: la interfaz no sabe pedir un token,
          así que se le da. Solo ante un 401, y se va con `fijarToken`. */}
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
            style={BOTON_LINEA}
          >
            Copiar referencia
          </button>
        )}
        {/* Reintentar solo donde puede servir: un 403 sale igual las veces que
            se pulse, y ofrecerlo es prometer algo que no va a pasar. */}
        {error.reintentable && (
          <button onClick={onReintentar} className="hov-acento-2" style={{ ...BOTON_LINEA, border: 0, background: 'var(--accent)', color: 'var(--accent-contraste)', fontWeight: 500 }}>
            Reintentar
          </button>
        )}
      </div>
    </section>
  );
}

/* ══════════ Lo que se dibuja de cada dato ══════════ */

/** «1 predio» y «2 predios»: la cifra manda sobre el rótulo. */
function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-PE')} ${n === 1 ? uno : varios}`;
}

/** El importe, tal como llega: texto (RNF-055). Nunca pasa por `Number`. */
const soles = (i: Importe | null | undefined) => (i ? 'S/ ' + i.importe : SIN_DATO);

/** La unidad sobre la que pesa una obligación. Los dos nulos no son un error. */
function unidadDe(predioId: number | null, vehiculoId: number | null): string {
  if (predioId !== null && predioId !== undefined) return 'Predio ' + predioId;
  if (vehiculoId !== null && vehiculoId !== undefined) return 'Vehículo ' + vehiculoId;
  return 'Sin unidad';
}

/** El rango de cuotas, sin repetirlo cuando es una sola. */
const cuotasDe = (desde: number, hasta: number) => (desde === hasta ? String(desde) : `${desde} – ${hasta}`);

/** El tipo de asiento, en el vocabulario del manual: CARGO es alta, ABONO baja. */
const sentidoDe = (tipo: string) => (tipo === 'CARGO' ? 'Alta' : tipo === 'ABONO' ? 'Baja' : tipo);

type Sujeto = { codigo: string; nombre: string; documento: string };

/**
 * ¿Puede lo tecleado ser el número impreso de un recibo?
 *
 * La forma la fija el backend, no esta pantalla: `ReciboController.numeroDe`
 * exige un guion que no sea el primer ni el último carácter y un correlativo
 * que parsee como número, y su 422 lo dice con el ejemplo delante.
 */
function pareceNumeroDeRecibo(criterio: string): boolean {
  const guion = criterio.lastIndexOf('-');
  if (guion <= 0 || guion === criterio.length - 1) return false;
  return /^\d+$/.test(criterio.slice(guion + 1));
}

/** Qué filtro del padrón le toca a lo que se tecleó. */
function filtroDelCriterio(criterio: string): { clave: 'codigo' | 'dNI' | 'rUC' | 'nombreRazonSocial'; como: string } {
  if (/^\d{8}$/.test(criterio)) return { clave: 'dNI', como: 'DNI exacto' };
  if (/^\d{11}$/.test(criterio)) return { clave: 'rUC', como: 'RUC exacto' };
  /* Un código del padrón lleva letras y dígitos y no es un nombre: se
     distingue por no tener espacios y sí al menos un dígito. */
  if (/^[^\s]*\d[^\s]*$/.test(criterio)) return { clave: 'codigo', como: 'código exacto' };
  return { clave: 'nombreRazonSocial', como: 'nombre por parecido' };
}

/* ══════════ El módulo ══════════ */
export default function Consultas({ dest, onDest }: PantallaProps) {
  const { pref } = usarPreferencias();
  const m = moduloDe('consultas');

  const [sujeto, setSujeto] = useState<Sujeto | null>(null);
  const [q, setQ] = useState('');
  const criterio = useRebote(q.trim());
  const [vista, setVista] = useState<Vista>('resumen');
  /** La fecha de corte. En blanco es «hoy», que es lo que resuelve el servidor. */
  const [fecha, setFecha] = useState('');
  const [fase, setFase] = useState<'' | Fase>('');
  const [campania, setCampania] = useState('');
  const [predioAResolver, setPredioAResolver] = useState<PredioDelCatastro | null>(null);

  const cod = sujeto?.codigo ?? '';
  const enCuenta = dest === 'cuenta' && sujeto !== null;
  const enConstancia = dest === 'constancia' && sujeto !== null;
  const buscando = sujeto === null && criterio !== '';

  /* ── El buscador: cinco padrones, cinco lecturas ──────────────
     No hay ningún endpoint que busque en todos a la vez, y componer uno aquí
     sería inventarlo. Se pregunta a los cinco y se enseña lo que conteste cada
     uno, diciendo por qué campo buscó. */
  const delPadron = filtroDelCriterio(criterio);
  const personas = useRecurso(
    (s) => buscarContribuyentes({ [delPadron.clave]: criterio }, { tamano: 8 }, s),
    [criterio, delPadron.clave],
    buscando,
  );
  /* Por PREFIJO del código de referencia catastral, que es lo único que el
     padrón de catastro sabe buscar. Solo si lo tecleado puede serlo: son
     dígitos, y el código tiene 23. */
  const pareceCatastral = /^\d{4,23}$/.test(criterio);
  const predios = useRecurso(
    (s) => buscarPredios(criterio, { tamano: 6 }, s),
    [criterio],
    buscando && pareceCatastral,
  );
  /* La placa se compara por igualdad sin el guion, así que se pregunta tal cual
     y el servidor decide. No se inventa aquí un patrón de placa: el que parece
     obvio —tres letras y tres dígitos— deja fuera las que no lo son. */
  const vehiculos = useRecurso((s) => buscarVehiculos({ placa: criterio }, { tamano: 6 }, s), [criterio], buscando);
  const valores = useRecurso((s) => consultarValores({ nroDeValor: criterio }, { tamano: 6 }, s), [criterio], buscando);
  /* El recibo SÍ se acota, y no es inventarse un patrón: es el que el propio
     endpoint nombra al rechazar —«va como está impreso en el papel,
     serie-correlativo: '001-0000123'»—, o sea un guion que no está al principio
     ni al final y un correlativo que es un número. Sin esta guarda, teclear un
     apellido pedía el recibo llamado «SULLON» y se llevaba un 422 por cada
     pausa de tecleo. No hace daño —contesta 422, no 500, así que no escribe
     incidencia— pero es una pregunta que ya se sabe mal hecha. */
  const recibo = useRecurso((s) => verRecibo(criterio, s), [criterio], buscando && pareceNumeroDeRecibo(criterio));

  /* El titular no viene en la fila del predio, y es a propósito (ADR-0015
     §2.4): quien puede listar predios no puede cosechar predio→persona de toda
     la municipalidad. Se resuelve de uno en uno, al pulsar, y deja su fila en
     la bitácora. */
  const titulares = useRecurso(
    (s) => titularesDelPredio(predioAResolver!.predioId, s),
    [predioAResolver?.predioId],
    predioAResolver !== null,
  );
  useEffect(() => {
    const t = titulares.datos?.titulares.find((x) => x.codigo !== null);
    if (t && t.codigo) {
      setSujeto({ codigo: t.codigo, nombre: t.nombre ?? t.codigo, documento: '' });
      setPredioAResolver(null);
      onDest('cuenta');
    }
  }, [titulares.datos, onDest]);

  /* ── El estado de cuenta ────────────────────────────────────── */
  const ficha = useRecurso(
    (s) => fichaUnificada({ contribuyente: cod }, { tamano: 20 }, s),
    [cod],
    enCuenta && vista === 'resumen',
  );
  const deuda = useRecurso(
    (s) => deudaDelContribuyente({ codContribuyente: cod, fechaDeCorte: fecha || undefined, fase: fase || undefined }, { tamano: 50 }, s),
    [cod, fecha, fase],
    enCuenta && vista === 'deuda',
  );
  const beneficio = useRecurso(
    (s) => deudasConBeneficio({ contribuyente: cod, benefAplicable: campania || undefined }, { tamano: 1 }, s),
    [cod, campania],
    enCuenta && vista === 'deuda',
  );
  const pagos = useRecurso(
    (s) => pagosDelContribuyente({ codContribuyente: cod }, { tamano: 50 }, s),
    [cod],
    enCuenta && vista === 'pagos',
  );
  const misPredios = useRecurso(
    (s) => prediosDelContribuyente({ contribuyente: cod, fecha: fecha || undefined }, { tamano: 50 }, s),
    [cod, fecha],
    enCuenta && vista === 'unidades',
  );
  const misVehiculos = useRecurso(
    (s) => buscarVehiculos({ contribuyente: cod, fecha: fecha || undefined }, { tamano: 50 }, s),
    [cod, fecha],
    enCuenta && vista === 'unidades',
  );
  const misValores = useRecurso(
    (s) => consultarValores({ codContribuyente: cod }, { tamano: 50 }, s),
    [cod],
    enCuenta && vista === 'valores',
  );
  const movimientos = useRecurso(
    (s) => altasYBajas({ codigoCont: cod }, { tamano: 50 }, s),
    [cod],
    enCuenta && vista === 'movimientos',
  );
  const constancia = useRecurso(
    (s) => constanciaDeNoAdeudo({ codContribuyente: cod, fecha: fecha || undefined }, s),
    [cod, fecha],
    enConstancia,
  );

  /* La cifra que la barra de contexto enseña sale de una lectura que publique
     el TOTAL del contribuyente —el resumen de la ficha o la simulación—, nunca
     de una fila suelta: la constancia devuelve la lista de obligaciones y no su
     suma, así que tomar la primera daría una cifra plausible y equivocada. Si
     ninguna lectura activa lo trae, se dice cuántas obligaciones hay. */
  const totalVisible = ficha.datos?.resumenDeSaldos.total ?? beneficio.datos?.deudaTotal ?? null;
  const obligacionesEnConstancia = constancia.datos?.obligaciones.length ?? null;

  /* ── Cabecera ──────────────────────────────────────────────── */
  const destino = m.destinos.find((x) => x.k === dest);
  const vistaDef = VISTAS.find((v) => v.k === vista)!;
  const miga = enCuenta ? ['Consultas', 'Estado de cuenta', vistaDef.label] : ['Consultas', destino?.label ?? 'Consultas'];
  const titulo = sujeto !== null && dest !== 'buscar' ? sujeto.nombre : (destino?.label ?? 'Consultas');

  const paleta = OPCIONES.map((o) => ({
    label: o[0],
    nota: o[1] === 'constancia' ? 'Documento' : 'Vista del contribuyente',
    ir: () => {
      if (o[1] === 'constancia') {
        onDest('constancia');
        return;
      }
      setVista(o[1]);
      onDest(sujeto === null ? 'buscar' : 'cuenta');
    },
  }));

  const nuevaBusqueda = () => {
    setSujeto(null);
    setQ('');
    setPredioAResolver(null);
    onDest('buscar');
  };

  return (
    <Shell
      modulo="consultas"
      dest={dest}
      onDest={onDest}
      miga={miga}
      titulo={titulo}
      paleta={paleta}
      notasDeDestino={
        sujeto === null ? undefined : { cuenta: sujeto.codigo, constancia: 'De ' + sujeto.codigo }
      }
      contexto={
        sujeto !== null
          ? {
              volver: { label: 'Buscar otro', onClick: nuevaBusqueda },
              codigo: sujeto.codigo,
              titular: sujeto.nombre,
              ubic: sujeto.documento || 'Documento no leído en esta consulta',
              derecha: (
                <>
                  <Insignia tono={totalVisible || obligacionesEnConstancia ? 'bad' : 'neutro'}>
                    {totalVisible
                      ? `Debe ${soles(totalVisible)} al ${totalVisible.actualizadoA}`
                      : obligacionesEnConstancia !== null
                        ? plural(obligacionesEnConstancia, 'obligación pendiente', 'obligaciones pendientes')
                        : 'Deuda no leída en esta vista'}
                  </Insignia>
                  <button onClick={() => onDest(dest === 'constancia' ? 'cuenta' : 'constancia')} className="hov-linea" style={{ ...BOTON_LINEA, padding: '5px 11px', whiteSpace: 'nowrap' }}>
                    {dest === 'constancia' ? 'Estado de cuenta' : 'Constancia'}
                  </button>
                </>
              ),
            }
          : undefined
      }
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ BUSCAR ══════════
            También es lo que se ve al entrar por la URL a «cuenta» o a
            «constancia» sin nadie delante: la consulta es siempre sobre
            alguien, y sin sujeto no hay nada que enseñar. */}
        {sujeto === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Entradilla>
              En ventanilla nadie sabe si su pregunta es «cuenta corriente», «deuda» o «unificada predial-arbitrios». Sabe que trae un
              DNI, un código predial, una placa, un recibo o un valor. Escribe eso.
            </Entradilla>

            {dest !== 'buscar' && (
              <Aviso tono="warn" titulo={`«${destino?.label ?? dest}» se abre con alguien delante`}>
                Esta pantalla es la de un contribuyente concreto: sus obligaciones, sus pagos y sus unidades. Búscalo primero y se abre
                sola.
              </Aviso>
            )}

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px' }}>
                <Icono d={ICO.lupa} tam={21} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Buscar en los cinco padrones"
                  placeholder="DNI, RUC, nombre, código del padrón, código predial, placa, nº de recibo o de valor"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 17, padding: '3px 0', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Cómo se escribe</span>
                {FORMAS.map((f) => (
                  <span key={f.que} style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
                    <strong style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{f.que}</strong>: {f.como}
                  </span>
                ))}
              </div>
            </section>

            {buscando && (
              <Seccion
                titulo="Coincidencias"
                meta={`buscando en 5 padrones · contribuyentes por ${delPadron.como}`}
                pie="Un predio, una placa o un valor llevan al contribuyente al que pertenecen: la consulta es siempre sobre alguien. El recibo no, y se dice más abajo por qué."
              >
                {/* Contribuyentes */}
                <Grupo
                  titulo="Contribuyentes"
                  lectura={personas}
                  ruta="GET /api/v1/rentas/contribuyentes"
                  acceso="padron"
                  vacio={`Nadie con ese ${delPadron.como} en el padrón.`}
                >
                  {(personas.datos?.contenido ?? []).map((c) => (
                    <FilaClicable
                      key={c.codigo}
                      tipo="Contribuyente"
                      titulo={c.nombreRazonSocial}
                      detalle={`${c.codigo} · ${c.tipoDocumento} ${c.numeroDocumento} · ${c.tipoPersona}${c.condicionEspecial ? ' · ' + c.condicionEspecial : ''}${c.activo ? '' : ' · dado de baja'}`}
                      onClick={() => {
                        setSujeto({ codigo: c.codigo, nombre: c.nombreRazonSocial, documento: `${c.tipoDocumento} ${c.numeroDocumento}` });
                        setVista('resumen');
                        onDest('cuenta');
                      }}
                    />
                  ))}
                </Grupo>

                {/* Predios */}
                {pareceCatastral && (
                  <Grupo
                    titulo="Predios"
                    lectura={predios}
                    ruta="GET /api/v1/catastro/predios"
                    acceso="actualizacion_catastro"
                    vacio="Ningún predio empieza por ese código de referencia catastral."
                  >
                    {(predios.datos?.contenido ?? []).map((p) => (
                      <FilaClicable
                        key={p.predioId}
                        tipo="Predio"
                        titulo={`${p.codRefCatastral} · ${p.direccion}`}
                        detalle={
                          predioAResolver?.predioId === p.predioId
                            ? titulares.cargando
                              ? 'Resolviendo el titular…'
                              : titulares.error
                                ? 'No se pudo resolver el titular: ' + titulares.error.mensaje
                                : 'Este predio no tiene ningún titular en el padrón de contribuyentes.'
                            : `${p.tipo} · ${p.estado}${p.fichado ? ' · con ficha' : ' · sin ficha'} · pulsa para resolver su titular`
                        }
                        onClick={() => setPredioAResolver(p)}
                      />
                    ))}
                  </Grupo>
                )}

                {/* Vehículos */}
                <Grupo
                  titulo="Vehículos"
                  lectura={vehiculos}
                  ruta="GET /api/v1/consultas/vehiculos"
                  acceso="consulta_vehiculos"
                  vacio="Ninguna placa igual a lo escrito. La placa se compara entera, no por partes."
                >
                  {(vehiculos.datos?.contenido ?? []).map((v) => (
                    <FilaClicable
                      key={v.placa}
                      tipo="Vehículo"
                      titulo={`${v.placa} · ${v.marca} ${v.modelo}`}
                      detalle={`${v.clase} ${v.anioFabricacion} · ${v.estado} · titular ${v.titular}`}
                      cifra={soles(v.deuda)}
                      subcifra={'deuda al ' + v.deuda.actualizadoA}
                      onClick={() => {
                        setSujeto({ codigo: v.codigoContribuyente, nombre: v.titular, documento: '' });
                        setVista('unidades');
                        onDest('cuenta');
                      }}
                    />
                  ))}
                </Grupo>

                {/* Valores */}
                <Grupo
                  titulo="Valores emitidos"
                  lectura={valores}
                  ruta="GET /api/v1/consultas/valores"
                  acceso="consulta_valores"
                  vacio="Ningún valor con ese número."
                >
                  {(valores.datos?.contenido ?? []).map((v) => (
                    <FilaClicable
                      key={v.numero}
                      tipo="Valor"
                      titulo={`${v.numero} · ${v.tipo}`}
                      detalle={`${v.contribuyente} · emitido el ${v.fechaEmision} · ${v.situacion} al ${v.situacionA}`}
                      cifra={soles(v.monto)}
                      subcifra={'proyectado al ' + v.monto.actualizadoA}
                      onClick={() => {
                        setSujeto({ codigo: v.codContribuyente, nombre: v.contribuyente, documento: '' });
                        setVista('valores');
                        onDest('cuenta');
                      }}
                    />
                  ))}
                </Grupo>

                {/* Recibos */}
                <Grupo
                  titulo="Recibos"
                  lectura={recibo}
                  ruta="GET /api/v1/tesoreria/recibos/{nro}/duplicado"
                  acceso="duplicado_recibo"
                  vacio="Ningún recibo con ese número en esta municipalidad."
                  sinDatosNoEsFallo
                >
                  {recibo.datos && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                      <Insignia tono="neutro">Recibo</Insignia>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>
                          {recibo.datos.recibo.numero} · {recibo.datos.estado}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                          Cajero {recibo.datos.recibo.cajero} · {recibo.datos.recibo.formaDePago} · emitido el {recibo.datos.recibo.emitidoEn} ·{' '}
                          {recibo.datos.recibo.lineas.length} líneas. <strong>No lleva al contribuyente</strong>: la vista previa del recibo
                          no publica su código, así que desde aquí no se puede abrir su estado de cuenta.
                        </span>
                      </span>
                      <span style={{ textAlign: 'right', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                        {soles(recibo.datos.recibo.total)}
                      </span>
                    </div>
                  )}
                </Grupo>
              </Seccion>
            )}

            {!buscando && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
                <Kpi valor="11 → 1" etiqueta="Opciones reunidas" nota="Las once consultas del manual eran once vistas del mismo contribuyente." />
                <Kpi valor="5" etiqueta="Padrones que busca el campo" nota="Contribuyentes, predios, vehículos, recibos y valores. Cinco lecturas: no hay ninguna que busque en todos." />
                <Kpi valor="6" etiqueta="Vistas del estado de cuenta" nota="Resumen, deuda, pagos, unidades, valores y altas y bajas." />
                <Kpi valor="0" etiqueta="Cifras sin su fecha" nota="Ningún importe se dibuja sin decir a qué día está calculado." />
              </div>
            )}
          </div>
        )}

        {/* ══════════ ESTADO DE CUENTA ══════════ */}
        {enCuenta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* La fecha de corte manda sobre la deuda, las unidades y la
                constancia: en blanco es hoy, que es lo que resuelve el reloj
                del servidor. */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 10, background: 'var(--bg-card)' }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 5 }}>
                  Fecha de corte
                </span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={CONTROL} />
              </label>
              <Nota style={{ flex: 1, minWidth: 220 }}>
                En blanco es hoy, resuelto con el reloj del servidor. La deuda no se guarda: se calcula, y cambia cada día. Las cifras de
                cada tabla dicen a qué fecha están.
              </Nota>
              {fecha !== '' && (
                <button onClick={() => setFecha('')} className="hov-linea" style={BOTON_LINEA}>
                  Volver a hoy
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {VISTAS.map((v) => {
                const on = vista === v.k;
                return (
                  <button
                    key={v.k}
                    onClick={() => setVista(v.k)}
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
                  </button>
                );
              })}
            </div>

            {/* ── Resumen ── */}
            {vista === 'resumen' && (
              <Lectura lectura={ficha} ruta="GET /api/v1/consultas/unificada" acceso="consulta_unificada">
                {ficha.datos && (
                  <>
                    <Seccion titulo="Resumen de saldos" meta={'al ' + ficha.datos.aLaFecha} pie={NOTAS.resumen}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0 }}>
                        {(
                          [
                            ['Insoluto', ficha.datos.resumenDeSaldos.insoluto],
                            ['Reajuste', ficha.datos.resumenDeSaldos.reajuste],
                            ['Interés', ficha.datos.resumenDeSaldos.interes],
                            ['Gastos', ficha.datos.resumenDeSaldos.gasto],
                            ['Total', ficha.datos.resumenDeSaldos.total],
                          ] as [string, Importe][]
                        ).map(([k, v], i) => (
                          <div
                            key={k}
                            style={{
                              background: i === 4 ? 'var(--accent-soft)' : 'var(--bg-card)',
                              padding: '14px 16px',
                              borderLeft: '1px solid var(--line)',
                              borderTop: '1px solid var(--line)',
                              margin: '-1px 0 0 -1px',
                            }}
                          >
                            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{k}</p>
                            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 17, color: i === 4 ? 'var(--accent-ink)' : 'var(--ink)' }}>{soles(v)}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>al {v.actualizadoA}</p>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                        {ficha.datos.resumenDeSaldos.estadoDeLaConsulta}
                      </p>
                    </Seccion>

                    <Seccion
                      titulo="Qué tiene este contribuyente"
                      meta="las siete secciones de la ficha"
                      pie="Cada número es el total de esa sección, no lo que cupo en la página. Pulsa para abrir la vista que lo detalla."
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(178px,1fr))', gap: 0 }}>
                        {(
                          [
                            ['Obligaciones con saldo', ficha.datos.deudasPendientes.totalElementos, 'deuda'],
                            ['Pagos', ficha.datos.pagosRealizados.totalElementos, 'pagos'],
                            ['Altas y bajas', ficha.datos.altasYBajas.totalElementos, 'movimientos'],
                            ['Valores emitidos', ficha.datos.valores.totalElementos, 'valores'],
                            ['Fraccionamientos', ficha.datos.fraccionamientos.totalElementos, null],
                            ['Declaraciones juradas', ficha.datos.declaracionesJuradas.totalElementos, null],
                          ] as [string, number, Vista | null][]
                        ).map(([k, n, ir]) => (
                          <button
                            key={k}
                            onClick={ir ? () => setVista(ir) : undefined}
                            className={ir ? 'hov-acento' : undefined}
                            style={{
                              background: 'var(--bg-card)',
                              padding: '14px 16px',
                              border: 0,
                              borderLeft: '1px solid var(--line)',
                              borderTop: '1px solid var(--line)',
                              margin: '-1px 0 0 -1px',
                              textAlign: 'left',
                              font: 'inherit',
                              color: 'inherit',
                              cursor: ir ? 'pointer' : 'default',
                            }}
                          >
                            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>{n}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k}</p>
                            {!ir && <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>Se ve en su módulo</p>}
                          </button>
                        ))}
                      </div>
                    </Seccion>
                  </>
                )}
              </Lectura>
            )}

            {/* ── Deuda, con el beneficio al lado ── */}
            {vista === 'deuda' && (
              <>
                <BloqueDeBeneficio lectura={beneficio} campania={campania} onCampania={setCampania} />

                <Seccion
                  titulo="Deuda pendiente"
                  meta={deuda.datos ? `${deuda.datos.contenido.length} de ${plural(deuda.datos.totalElementos, 'obligación', 'obligaciones')}` : ''}
                  acciones={
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-3)' }}>
                      Fase
                      <select value={fase} onChange={(e) => setFase(e.target.value as '' | Fase)} style={{ ...CONTROL, padding: '6px 9px', fontSize: 12.5 }}>
                        <option value="">Todas</option>
                        {FASES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                  }
                  pie={NOTAS.deuda}
                >
                  <Lectura lectura={deuda} ruta="GET /api/v1/consultas/deuda" acceso="consulta_deuda" plana>
                    <TablaDeTextos
                      cols={COLS_DEUDA}
                      min="1000px"
                      insigniaEn={4}
                      vacio="Este contribuyente no tiene deuda pendiente con esos filtros."
                      filas={(deuda.datos?.contenido ?? []).map((o: ObligacionConDeuda) => [
                        String(o.ejercicio),
                        unidadDe(o.predioId, o.vehiculoId),
                        cuotasDe(o.periodoDesde, o.periodoHasta),
                        o.tributo,
                        o.fase,
                        o.deuda.insoluto.importe,
                        o.deuda.reajuste.importe,
                        o.deuda.interes.importe,
                        o.deuda.gasto.importe,
                        o.deuda.total.importe,
                      ])}
                    />
                    {deuda.datos && deuda.datos.contenido.length > 0 && (
                      <p style={{ margin: 0, padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-4)' }}>
                        Todas las cifras de esta tabla están calculadas al {deuda.datos.contenido[0].deuda.total.actualizadoA}. El total del
                        contribuyente lo suma el servidor y sale arriba; aquí no se suma ninguna columna.
                      </p>
                    )}
                  </Lectura>
                </Seccion>
              </>
            )}

            {/* ── Pagos ── */}
            {vista === 'pagos' && (
              <Seccion
                titulo="Pagos realizados"
                meta={pagos.datos ? `${pagos.datos.contenido.length} de ${pagos.datos.totalElementos}` : ''}
                pie={NOTAS.pagos}
              >
                <Lectura lectura={pagos} ruta="GET /api/v1/consultas/pagos" acceso="consulta_pagos" plana>
                  <TablaDeTextos
                    cols={COLS_PAGOS}
                    min="860px"
                    vacio="Ningún pago registrado en el libro para este contribuyente."
                    filas={(pagos.datos?.contenido ?? []).map((a: Asiento) => [
                      a.documentoOrigen,
                      a.monto.actualizadoA,
                      a.tributo,
                      a.concepto,
                      String(a.ejercicio),
                      a.periodo === null ? SIN_DATO : String(a.periodo),
                      a.monto.importe,
                    ])}
                  />
                </Lectura>
              </Seccion>
            )}

            {/* ── Unidades ── */}
            {vista === 'unidades' && (
              <>
                <Seccion
                  titulo="Predios"
                  meta={
                    misPredios.datos
                      ? `${plural(misPredios.datos.totalElementos, 'predio', 'predios')}${misPredios.datos.contenido[0] ? ' · deuda al ' + misPredios.datos.contenido[0].deuda.actualizadoA : ''}`
                      : ''
                  }
                  pie="El código predial es el mismo código de referencia catastral: no hay dos padrones de predios. El uso, el área y el autovalúo no vienen en esta lectura."
                >
                  <Lectura lectura={misPredios} ruta="GET /api/v1/consultas/predios" acceso="consulta_predios" plana>
                    <TablaDeTextos
                      cols={COLS_PREDIOS}
                      min="800px"
                      vacio="Ningún predio a nombre de este contribuyente a esta fecha."
                      filas={(misPredios.datos?.contenido ?? []).map((p) => [
                        p.codigoReferenciaCatastral,
                        p.direccion,
                        p.tipo,
                        p.porcentajeTitularidad,
                        p.deuda.importe,
                      ])}
                    />
                  </Lectura>
                </Seccion>

                <Seccion
                  titulo="Vehículos"
                  meta={
                    misVehiculos.datos
                      ? `${plural(misVehiculos.datos.totalElementos, 'registro', 'registros')}${misVehiculos.datos.contenido[0] ? ' · deuda al ' + misVehiculos.datos.contenido[0].deuda.actualizadoA : ''}`
                      : ''
                  }
                  pie="La afectación vehicular corre tres ejercicios desde el año siguiente a la primera inscripción registral; el rango que sale es el que el padrón guarda. La base imponible no viene en esta lectura: es del cálculo vehicular."
                >
                  <Lectura lectura={misVehiculos} ruta="GET /api/v1/consultas/vehiculos" acceso="consulta_vehiculos" plana>
                    <TablaDeTextos
                      cols={COLS_VEHICULOS}
                      min="820px"
                      insigniaEn={5}
                      vacio="Ningún vehículo a nombre de este contribuyente."
                      filas={(misVehiculos.datos?.contenido ?? []).map((v) => [
                        v.placa,
                        v.clase,
                        `${v.marca} ${v.modelo}`,
                        String(v.anioFabricacion),
                        v.afectoDesde === null || v.afectoHasta === null ? SIN_DATO : `${v.afectoDesde} — ${v.afectoHasta}`,
                        v.estado,
                        v.deuda.importe,
                      ])}
                    />
                  </Lectura>
                </Seccion>
                <Nota>{NOTAS.unidades}</Nota>
              </>
            )}

            {/* ── Valores ── */}
            {vista === 'valores' && (
              <Seccion
                titulo="Valores emitidos"
                meta={misValores.datos ? plural(misValores.datos.totalElementos, 'valor', 'valores') : ''}
                pie={NOTAS.valores}
              >
                <Lectura lectura={misValores} ruta="GET /api/v1/consultas/valores" acceso="consulta_valores" plana>
                  <TablaDeTextos
                    cols={COLS_VALORES}
                    min="920px"
                    insigniaEn={7}
                    vacio="Ningún valor emitido a nombre de este contribuyente."
                    filas={(misValores.datos?.contenido ?? []).map((v) => [
                      v.numero,
                      v.tipo,
                      v.fechaEmision,
                      v.tributo ?? SIN_DATO,
                      v.periodo ?? SIN_DATO,
                      v.exigibleDesde ?? SIN_DATO,
                      v.monto.importe,
                      v.situacion,
                    ])}
                  />
                  {misValores.datos && misValores.datos.contenido.length > 0 && (
                    <p style={{ margin: 0, padding: '10px 16px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-4)' }}>
                      Importes proyectados al {misValores.datos.contenido[0].monto.actualizadoA} —el día de la emisión, congelado—;
                      situación mirada al {misValores.datos.contenido[0].situacionA}. La columna «Vence» del prototipo no está: lo que el
                      recurso publica es desde cuándo la deuda es exigible, que no es lo mismo.
                    </p>
                  )}
                </Lectura>
              </Seccion>
            )}

            {/* ── Altas y bajas ── */}
            {vista === 'movimientos' && (
              <Seccion
                titulo="Movimientos de la cuenta corriente"
                meta={movimientos.datos ? `${movimientos.datos.contenido.length} de ${movimientos.datos.totalElementos}` : ''}
                pie={NOTAS.movimientos}
              >
                <Lectura lectura={movimientos} ruta="GET /api/v1/consultas/altas-bajas" acceso="consulta_altas_bajas" plana>
                  <TablaDeTextos
                    cols={COLS_MOVIMIENTOS}
                    min="980px"
                    insigniaEn={1}
                    vacio="Ningún movimiento de deuda para este contribuyente."
                    filas={(movimientos.datos?.contenido ?? []).map((a: Asiento) => [
                      a.documentoOrigen,
                      sentidoDe(a.tipo),
                      a.monto.actualizadoA,
                      a.tributo,
                      a.concepto,
                      String(a.ejercicio),
                      unidadDe(a.predioId, a.vehiculoId),
                      a.monto.importe,
                      a.motivo ?? SIN_DATO,
                    ])}
                  />
                </Lectura>
              </Seccion>
            )}
          </div>
        )}

        {/* ══════════ CONSTANCIA ══════════ */}
        {enConstancia && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div data-noprint="1" style={{ width: '100%', maxWidth: 860, display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', marginBottom: 5 }}>
                  Fecha de corte
                </span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={CONTROL} />
              </label>
              <Nota style={{ flex: 1, minWidth: 200 }}>
                La constancia se verifica a una fecha. En blanco, a hoy.
              </Nota>
              {/* Los tres formatos los emite el servidor desde esta misma ruta
                  con `?formato`. No pasan por `solicitar()` —parsea JSON— sino
                  por `descargar()`, que es la otra puerta del mismo `cliente.ts`
                  y la que le pone el `Authorization`. */}
              <Descargas
                traer={(f) => descargarConstancia({ codContribuyente: cod, fecha: fecha || undefined }, f)}
                que="la constancia"
                acceso="constancia"
                impedimento={constancia.datos === null ? 'No hay ninguna constancia leída: no hay qué descargar' : undefined}
              />
              {/* Y lo mismo con la impresora. Sin la guarda, un 404, un 403 o la
                  respuesta que aún no ha llegado sacaban por la impresora la hoja
                  entera —membrete, «Constancia de no adeudo», el párrafo que
                  afirma que NO mantiene obligaciones y las dos líneas de firma—
                  con la tabla vacía: un papel oficial en blanco sigue siendo un
                  papel oficial, y este además afirma algo. Es el mismo defecto
                  que la ficha del contribuyente ya tenía cerrado. */}
              <button
                onClick={() => window.print()}
                disabled={constancia.datos === null}
                title={constancia.datos === null ? 'No hay ninguna constancia leída: no hay qué imprimir' : undefined}
                className={constancia.datos === null ? undefined : 'hov-acento-2'}
                style={{
                  ...BOTON_LINEA,
                  border: 0,
                  background: 'var(--accent)',
                  color: 'var(--accent-contraste)',
                  fontWeight: 500,
                  ...(constancia.datos === null ? { cursor: 'not-allowed', opacity: 0.5 } : null),
                }}
              >
                Imprimir esta hoja
              </button>
            </div>

            <Lectura lectura={constancia} ruta="GET /api/v1/consultas/constancias/no-adeudo" acceso="constancia">
              {constancia.datos && (
                <section style={{ width: '100%', maxWidth: 860, background: '#fff', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '40px 44px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{pref.entidad}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>Gerencia de Administración Tributaria — Unidad de Rentas</p>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                      <p style={{ margin: 0 }}>Sin numerar</p>
                      <p style={{ margin: '3px 0 0' }}>{constancia.datos.fechaDeCorte}</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 26, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 23, fontWeight: 600, letterSpacing: '-.01em' }}>
                      {constancia.datos.seNiega ? 'Constancia de deuda' : 'Constancia de no adeudo'}
                    </h2>
                    <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                      Obligaciones tributarias municipales al {constancia.datos.fechaDeCorte}
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
                    <Dato rotulo="Solicitante">{sujeto.nombre}</Dato>
                    <Dato rotulo="Código" mono>
                      {constancia.datos.codigoContribuyente}
                    </Dato>
                    <Dato rotulo="Documento">{sujeto.documento || SIN_DATO}</Dato>
                    <Dato rotulo="Obligaciones verificadas" mono>
                      {constancia.datos.obligaciones.length}
                    </Dato>
                    <Dato rotulo="Nº de constancia" mono>
                      {SIN_DATO}
                    </Dato>
                    <Dato rotulo="Vigencia">{SIN_DATO}</Dato>
                  </div>

                  <TablaDeTextos
                    cols={COLS_CONSTANCIA}
                    vacio="Ninguna obligación pendiente en ninguna fase."
                    filas={constancia.datos.obligaciones.map((o) => [
                      o.tributo,
                      String(o.ejercicio),
                      cuotasDe(o.periodoDesde, o.periodoHasta),
                      unidadDe(o.predioId, o.vehiculoId),
                      o.fase,
                      o.deuda.total.importe,
                    ])}
                  />

                  <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                    {constancia.datos.seNiega
                      ? `De la verificación efectuada en los padrones tributarios de esta municipalidad se advierte que el solicitante mantiene ${constancia.datos.obligaciones.length} obligación(es) pendiente(s) de pago al ${constancia.datos.fechaDeCorte}, detalladas arriba. En consecuencia, NO procede expedir constancia de no adeudo. Regularizada la deuda, la constancia puede emitirse el mismo día.`
                      : `De la verificación efectuada en los padrones tributarios de esta municipalidad se advierte que el solicitante NO mantiene obligaciones tributarias pendientes de pago al ${constancia.datos.fechaDeCorte}.`}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 56 }}>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Unidad de Rentas</div>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 7, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
                  </div>
                </section>
              )}
            </Lectura>

            <div data-noprint="1" style={{ width: '100%', maxWidth: 860 }}>
              <Aviso tono="neutro" titulo="Lo que esta hoja no dice, y por qué">
                No lleva número ni vigencia: el servidor <strong>no la registra como documento emitido</strong> —es una consulta, se mira y
                se imprime, pero no se numera—, así que ni el correlativo ni el plazo de validez existen todavía. Y los cinco conceptos
                verificados del prototipo —papeletas, multas administrativas, expedientes coactivos— no van como filas propias: lo que el
                servidor comprueba son <strong>todas</strong> las obligaciones del contribuyente en cualquier fase, y las que hay salen
                arriba con su tributo. Poner «Papeletas: ninguna» sería afirmar que se consultó un padrón que esta lectura no consulta.
              </Aviso>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ══════════ Piezas del módulo ══════════ */

type Lect<T> = { datos: T | null; cargando: boolean; error: ErrorDeApi | null; reintentar: () => void };

/** Los tres estados de una lectura: cargando, caída y con datos. */
function Lectura<T>({
  lectura,
  ruta,
  acceso,
  plana,
  children,
}: {
  lectura: Lect<T>;
  ruta: string;
  acceso: string;
  /** Dentro de una `Seccion` ya hay tarjeta: el fallo no lleva otra encima. */
  plana?: boolean;
  children: ReactNode;
}) {
  if (lectura.cargando) return <Cargando />;
  if (lectura.error)
    return (
      <div style={plana ? { padding: 12 } : undefined}>
        <Fallo error={lectura.error} ruta={ruta} acceso={acceso} onReintentar={lectura.reintentar} />
      </div>
    );
  return <>{children}</>;
}

/** Un padrón dentro de las coincidencias: su cabecera, su estado y sus filas. */
function Grupo<T>({
  titulo,
  lectura,
  ruta,
  acceso,
  vacio,
  sinDatosNoEsFallo,
  children,
}: {
  titulo: string;
  lectura: Lect<T>;
  ruta: string;
  acceso: string;
  vacio: string;
  /**
   * Un 404 —o un 422 diciendo cómo se escribe— no es un fallo del padrón: es su
   * respuesta a un dato que no es suyo. Es el caso del recibo, al que se
   * pregunta con lo que sea que se haya tecleado.
   */
  sinDatosNoEsFallo?: boolean;
  children: ReactNode;
}) {
  const noEsSuyo = lectura.error?.codigo === 'NO_ENCONTRADO' || lectura.error?.codigo === 'VALIDACION';
  const cuenta = (lectura.datos as { contenido?: unknown[] } | null)?.contenido?.length;
  const nadaQueEnsenar = !lectura.cargando && (lectura.error !== null || cuenta === 0 || lectura.datos === null);
  return (
    <div>
      <p
        style={{
          margin: 0,
          padding: '9px 16px',
          background: 'var(--bg-elev)',
          borderBottom: '1px solid var(--line)',
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: 'var(--ink-3)',
        }}
      >
        {titulo}
      </p>
      {lectura.cargando && <Cargando n={1} />}
      {!lectura.cargando && lectura.error !== null && !(sinDatosNoEsFallo && noEsSuyo) && (
        <p style={{ margin: 0, padding: '13px 16px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--error-texto)' }}>
          {lectura.error.codigo === 'SIN_PRIVILEGIO'
            ? `Tu perfil no puede buscar aquí: falta el acceso «${acceso}».`
            : `No se pudo consultar este padrón (${lectura.error.mensaje}).`}{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{ruta}</span>
        </p>
      )}
      {nadaQueEnsenar && (lectura.error === null || (sinDatosNoEsFallo && noEsSuyo)) && (
        <p style={{ margin: 0, padding: '13px 16px', borderBottom: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-3)' }}>
          {lectura.error?.codigo === 'VALIDACION' ? lectura.error.mensaje : vacio}
        </p>
      )}
      {!lectura.cargando && children}
    </div>
  );
}

function FilaClicable({
  tipo,
  titulo,
  detalle,
  cifra,
  subcifra,
  onClick,
}: {
  tipo: string;
  titulo: string;
  detalle: string;
  cifra?: string;
  subcifra?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
      <span
        style={{
          flex: '0 0 92px',
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          textAlign: 'center',
          borderRadius: 999,
          padding: '4px 0',
          background: 'var(--bg-elev)',
          color: 'var(--ink-3)',
          border: '1px solid var(--line)',
        }}
      >
        {tipo}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{titulo}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{detalle}</span>
      </span>
      {cifra && (
        <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{cifra}</span>
          {subcifra && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>{subcifra}</span>}
        </span>
      )}
      <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
    </button>
  );
}

/**
 * El beneficio: un interruptor sobre la misma deuda, no otra pantalla.
 *
 * El prototipo escribía la ordenanza a mano —«012-2026-MDC, condona el 100 %
 * del interés»— y con ella el descuento. Aquí las campañas son las que **esta**
 * municipalidad publica en su conjunto sellado; si no publica ninguna, el
 * interruptor no se puede accionar y lo dice con la frase del servidor. Un
 * descuento inventado no cobra de más: **perdona** de más.
 */
function BloqueDeBeneficio({
  lectura,
  campania,
  onCampania,
}: {
  lectura: Lect<DeudasConBeneficio>;
  campania: string;
  onCampania: (c: string) => void;
}) {
  const d = lectura.datos;
  const campanias = d?.campaniasAplicables ?? [];
  const sinCampanias = d !== null && campanias.length === 0;

  if (lectura.error)
    return (
      <Aviso tono="warn" titulo="No se pudo simular el acogimiento">
        {lectura.error.mensaje}{' '}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>GET /api/v1/consultas/deudas-con-beneficio</span>
      </Aviso>
    );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 16px', border: '1px solid var(--line-2)', borderRadius: 10, background: 'var(--bg-card)' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>Acogimiento a campaña de beneficio</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
          {lectura.cargando ? 'Consultando las campañas publicadas…' : (d?.estadoDeLaSimulacion ?? '')}
        </p>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-3)' }}>
        Campaña
        <select
          value={campania}
          onChange={(e) => onCampania(e.target.value)}
          disabled={sinCampanias || lectura.cargando}
          title={sinCampanias ? 'Esta municipalidad no publica ninguna campaña para el ejercicio: no hay descuento que simular.' : undefined}
          style={{ ...CONTROL, padding: '7px 10px', fontSize: 12.5, opacity: sinCampanias ? 0.55 : 1 }}
        >
          <option value="">Sin acogimiento</option>
          {campanias.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre} — {c.alicuota} sobre {c.base}
            </option>
          ))}
        </select>
      </label>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
          {d?.simulacion ? 'A pagar con beneficio' : 'Deuda total'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: d?.simulacion ? 'var(--ok-fg)' : 'var(--ink)' }}>
          {d ? soles(d.simulacion ? d.simulacion.deudaConBeneficio : d.deudaTotal) : SIN_DATO}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{d ? 'al ' + d.aLaFecha : ''}</span>
      </span>
      {d?.simulacion && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right', paddingLeft: 14, borderLeft: '1px solid var(--line)' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>Ahorro</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ok-fg)' }}>{soles(d.simulacion.ahorro)}</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
            {d.simulacion.alicuotaAplicada} sobre {d.simulacion.baseDelBeneficio}
          </span>
        </span>
      )}
    </div>
  );
}
