import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { Aviso, Insignia, Paginador, filaPulsable, type Tono } from '../../ds/componentes';
import { dia, instante, zonaDelLector } from '../../ds/fechas';
import { usarPreferencias } from '../../shell/preferencias';
import { ErrorDeApi, claveDeIdempotencia, fijarToken } from '../../api/cliente';
import { cuentaActual, hayPuerta } from '../../api/sesion';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { ejercicioParametrizado } from '../../api/seguridad';
import { Descargas } from '../../api/descarga';
import {
  descargarDuplicadoDeRecibo,
  anularRecibo,
  avanceDeRecaudacion,
  cerrarConvenio,
  cerrarTurno,
  cobrarDeuda,
  contribuyentePorCodigo,
  deudaDelContribuyente,
  duplicadoDeRecibo,
  listarCajas,
  listarConvenios,
  listarRecibos,
  recaudacionPorArea,
  registrarPreconvenio,
  simularFraccionamiento,
  type AccionDeCierre,
  type ActaDeAnulacion,
  type ActaDeCierre,
  type Arqueo,
  type CajaDelCatalogo,
  type Convenio,
  type EstadoDeConvenio,
  type EstadoDeRecibo,
  type FaseDeCobranza,
  type FilaDeConvenio,
  type FilaDeRecibo,
  type ObligacionConDeuda,
  type PeticionDeFraccionamiento,
  type Recibo,
  type SeleccionDeObligacion,
  type SimulacionDeConvenio,
} from '../../api/tesoreria';
import {
  AUTORIZANTES,
  COBRANZAS_DEL_PROTOTIPO_SIN_BACKEND,
  ESTADOS_DE_CONVENIO,
  ESTADOS_DE_RECIBO,
  FORMAS_DE_PAGO,
  MOTIVOS_DE_ANULACION,
  OPCIONES,
  TIPOS_DE_COBRANZA,
  TIPOS_DE_CONVENIO,
  TIPOS_DE_GARANTIA,
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
const ETIQUETA: CSSProperties = { fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' };
const AYUDA: CSSProperties = { fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' };
const CAMPO: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 };
const REJILLA = (min: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
  gap: '14px 16px',
  padding: '15px 16px 17px',
});
const BOTON_LINEA: CSSProperties = {
  border: '1px solid var(--line-2)',
  borderRadius: 6,
  padding: '9px 16px',
  background: 'var(--bg-card)',
  fontSize: 13,
  cursor: 'pointer',
};
const BOTON_PRIMARIO = (habilitado: boolean): CSSProperties => ({
  border: 0,
  borderRadius: 6,
  padding: '11px 22px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: habilitado ? 'pointer' : 'not-allowed',
  opacity: habilitado ? 1 : 0.55,
});
/** El totalizador de celdas al pie de una tabla: los filetes se pisan con el
 *  margen negativo, igual que en el artboard. */
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

/** Lo que se escribe donde no hay dato. Una raya, nunca un cero ni un blanco. */
const SIN_DATO = '—';

const CARET = ['M6 9l6 6 6-6'];

type ColDef = [string, 0 | 1];
const cabeceras = (defs: readonly ColDef[]) =>
  defs.map((c) => (
    <th key={c[0]} style={c[1] ? THN : TH}>
      {c[0]}
    </th>
  ));
const estiloDeCelda = (j: number, defs: readonly ColDef[]): CSSProperties =>
  j === 0 ? TD1 : defs[j] && defs[j][1] ? TDN : TD;

/** El tono de un estado. */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/coactiva|quebrado|anulado|vencid/.test(t)) return 'bad';
  if (/valor|preconvenio|reformulado|convenio/.test(t)) return 'warn';
  return 'ok';
}

/**
 * Un importe del backend, dibujado tal como llega.
 *
 * **No pasa por `Number`.** Los importes viajan como texto a propósito
 * (RNF-055), y convertirlos para volver a formatearlos es exactamente como se
 * pierde un céntimo en el papel que firma el contribuyente. Lo único que se hace
 * es escribir los dos decimales cuando el backend manda un entero pelado —«0»—,
 * que es una decisión de dibujo y no toca la cifra.
 */
function moneda(texto: string | null | undefined): string {
  if (texto === null || texto === undefined || texto === '') return SIN_DATO;
  return 'S/ ' + (/^-?\d+$/.test(texto) ? texto + '.00' : texto);
}

/** La llave con la que se identifica una obligación marcada. Es la misma tupla
 *  con la que `ClaveDeSaldo` la busca: tributo, ejercicio y unidad. */
function llaveDe(o: ObligacionConDeuda): string {
  return `${o.tributo}|${o.ejercicio}|${o.predioId ?? ''}|${o.vehiculoId ?? ''}`;
}

/** La unidad de la obligación, dicha como se puede decir: el listado publica el
 *  identificador interno del predio o del vehículo, no su código catastral ni su
 *  placa —esos son de otro módulo—. */
function unidadDe(o: { predioId: number | null; vehiculoId: number | null }): string {
  if (o.predioId !== null) return 'Predio ' + o.predioId;
  if (o.vehiculoId !== null) return 'Vehículo ' + o.vehiculoId;
  return 'Sin unidad';
}

export default function Tesoreria({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  /* ── El turno: la caja y el cajero ──────────────────────────────
     La caja **se elige** desde #618: `GET /tesoreria/cajas` publica el catálogo
     que `cargar-cajas.sh` siembra en el paso 4, así que el desplegable sale de
     la base y no de las cuatro ventanillas que el artboard dibujaba. Hasta
     entonces se tecleaba, y quien atiende tenía que saberse de memoria un código
     que el sistema conocía; el comentario que lo justificaba se corrige aquí y en
     los cuatro sitios donde el campo se dibuja, porque una explicación que se
     quedó vieja es indistinguible de una que nunca fue cierta.

     El valor sigue siendo una cadena y no la fila entera **a propósito**: lo que
     viaja en el cuerpo del cobro y del cierre es el `codigo`, y guardar aquí el
     objeto invitaría a mandar el rótulo. Un rótulo por código manda el dinero del
     turno a otra ventanilla, y ninguna cifra parecería mal.

     El cajero sigue tecleándose: es la cuenta de quien atiende, no un catálogo, y
     arranca con la de la sesión, que es la que el backend compara para decidir si
     un recibo es ajeno. */
  const [caja, setCaja] = useState('');
  const [cajero, setCajero] = useState(cuentaActual() ?? '');
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* ── El ejercicio que decide con qué conjunto sellado se fracciona ──────
     `CondicionesParametrizadas.aLaFechaDe` resuelve `Ejercicio.de(fechaDelConvenio)`,
     y `fechaDelConvenio` es `peticion.fecha()`; cuando ese campo no viaja, el
     servidor lo resuelve con `LocalDate.now(reloj)`. Esta pantalla NO manda
     `fecha` —`cuerpoDelFraccionamiento` no la incluye—, así que el ejercicio lo
     pone el reloj del SERVIDOR el día del envío.

     Y se queda así a propósito (#605, AC 4). Mandar `fecha` haría que el aviso y
     el acto no pudieran discrepar nunca, que es tentador, pero le entrega al
     navegador tres cosas que hoy no decide: la fecha del acto —que es un hecho
     legal y la estampa el servidor—, el conjunto sellado que pone el interés que
     el contribuyente firma, y **la deuda misma**, porque `fechaDeCorte` cae por
     omisión en `fecha` (medido: con `fecha: 2025-06-15` el 422 pasa a decir
     «Ninguna de las obligaciones marcadas tenía deuda al 2025-06-15»). Un reloj
     mal puesto convertiría un rótulo equivocado en un convenio equivocado, que es
     el cambio malo. Y no es hipotético: en este ambiente el servidor selló la
     deuda con `actualizadoA: 2026-09-01` el día en que aquí era 2026-09-02.

     El precio de no mandarla es que este número es una CREENCIA de este
     navegador, y el aviso de abajo lo dice con todas las letras en vez de
     presentarlo como el del servidor. Si discrepan, lo que pasa es lo que pasaba
     antes de #605 —el 422 del final, que nombra el ejercicio bueno—, nunca un
     registro mal fechado. Quitar la creencia entera exigiría que el backend
     publique su fecha; hoy no lo hace por ninguna ruta: `GET /seguridad/sesion`
     publica `ejercicioDeTrabajo`, que es nulo hasta que alguien lo fija con su
     propio acto (#559) y a propósito NO es el año del reloj.

     Y NO es `fechaDeCorte`: ése es el día al que se relee la deuda que se acoge,
     no el del acto. Colgar el aviso de él nombraría un ejercicio que no es el que
     el servidor va a usar.

     El año sale de `getFullYear()` y NO de `hoy`, que es la fecha en UTC: el
     servidor resuelve con `LocalDate.now(reloj)`, o sea en SU zona, y en una
     instalación peruana esa es la misma que la del navegador. Derivarlo de `hoy`
     abriría cinco horas cada 31 de diciembre en las que los dos números
     discreparían con seguridad, que es justo la ventana que este aviso existe
     para no ensanchar. */
  const ejercicioDelActo = useMemo(() => new Date().getFullYear(), []);

  /* El sujeto de la ventanilla: el código, y el nombre que se resuelve de él. */
  const [codContribuyente, setCodContribuyente] = useState('');
  const codigoReposado = useRebote(codContribuyente.trim().toUpperCase());

  const [fechaDeCorte, setFechaDeCorte] = useState('');
  const [fase, setFase] = useState<'' | FaseDeCobranza>('');

  /* Cobro */
  const [hojaCobro, setHojaCobro] = useState<'tributaria' | 'tasas'>('tributaria');
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [formaDePago, setFormaDePago] = useState('EFECTIVO');
  const [tipoDePago, setTipoDePago] = useState('NORMAL');
  const [numeroDeConvenio, setNumeroDeConvenio] = useState('');
  const [beneficio, setBeneficio] = useState('');
  const [fechaDePago, setFechaDePago] = useState('');
  const [obsCobro, setObsCobro] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [emitido, setEmitido] = useState<Recibo | null>(null);
  const [falloDeCobro, setFalloDeCobro] = useState<ErrorDeApi | null>(null);

  /* Convenios */
  const [hojaConv, setHojaConv] = useState<'fraccionar' | 'seguimiento'>('fraccionar');
  const [marcadasFrac, setMarcadasFrac] = useState<Record<string, boolean>>({});
  const [nCuotas, setNCuotas] = useState('6');
  const [pctInicial, setPctInicial] = useState('20');
  const [tipoConvenio, setTipoConvenio] = useState('ORDINARIO');
  const [garantia, setGarantia] = useState('NO REQUIERE');
  const [detalleGarantia, setDetalleGarantia] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [primeraCuota, setPrimeraCuota] = useState('');
  const [obsConvenio, setObsConvenio] = useState('');
  const [simulacion, setSimulacion] = useState<SimulacionDeConvenio | null>(null);
  const [convenioNuevo, setConvenioNuevo] = useState<Convenio | null>(null);
  const [trabajandoConv, setTrabajandoConv] = useState(false);
  const [falloConv, setFalloConv] = useState<ErrorDeApi | null>(null);
  /* Cuál de los dos actos falló. Decide si «Reintentar» puede salir: repetir la
     simulación no escribe nada, y repetir el registro sí — y este endpoint no
     lee `Idempotency-Key`, así que dos envíos son dos convenios (#606). */
  const [actoConv, setActoConv] = useState<'simular' | 'registrar'>('simular');

  /* Seguimiento de convenios */
  const [fNumero, setFNumero] = useState('');
  const [fContribuyente, setFContribuyente] = useState('');
  const [fEstado, setFEstado] = useState<'' | EstadoDeConvenio>('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [paginaConv, setPaginaConv] = useState(0);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [accion, setAccion] = useState<AccionDeCierre>('ANULACION');
  const [motivoCierre, setMotivoCierre] = useState('');
  const [responsableCierre, setResponsableCierre] = useState('');
  const [memoCierre, setMemoCierre] = useState('');
  const [obsCierreConvenio, setObsCierreConvenio] = useState('');
  const [cerrandoConv, setCerrandoConv] = useState(false);
  const [falloCierre, setFalloCierre] = useState<ErrorDeApi | null>(null);

  /* Recibos */
  const [numeroDeRecibo, setNumeroDeRecibo] = useState('');
  const numeroReposado = useRebote(numeroDeRecibo.trim());
  /* Los filtros del listado (#548). Ninguno es el número: ese abre el recibo por
     su ruta, y el listado existe para quien NO lo tiene. */
  const [fRecContribuyente, setFRecContribuyente] = useState('');
  const [fRecCaja, setFRecCaja] = useState('');
  const [fRecCajero, setFRecCajero] = useState('');
  const [fRecDesde, setFRecDesde] = useState('');
  const [fRecHasta, setFRecHasta] = useState('');
  const [fRecEstado, setFRecEstado] = useState<'' | EstadoDeRecibo>('');
  const [paginaRec, setPaginaRec] = useState(0);
  const [actoRecibo, setActoRecibo] = useState<'duplicado' | 'anulacion'>('duplicado');
  /* Reimprimir un recibo es un ACTO: numera un duplicado y queda con quien lo
     generó, así que exige observación (regla 10) igual que la anulación. */
  const [obsDuplicado, setObsDuplicado] = useState('');
  const [motivoAnul, setMotivoAnul] = useState(MOTIVOS_DE_ANULACION[0] ?? '');
  const [autorizadoPor, setAutorizadoPor] = useState('');
  const [memoAnul, setMemoAnul] = useState('');
  const [obsAnul, setObsAnul] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [acta, setActa] = useState<ActaDeAnulacion | null>(null);

  /* Cierre */
  const [fechaDelTurno, setFechaDelTurno] = useState('');
  const [declarado, setDeclarado] = useState<Record<string, string>>({});
  const [obsCierre, setObsCierre] = useState('');
  const [motivoDeReversion, setMotivoDeReversion] = useState('');
  const [modoCierre, setModoCierre] = useState<'cerrar' | 'reversar'>('cerrar');
  const [cerrando, setCerrando] = useState(false);
  const [actaDeCierre, setActaDeCierre] = useState<ActaDeCierre | null>(null);

  /* Recaudación */
  const [recTab, setRecTab] = useState(0);
  const [rDesde, setRDesde] = useState('');
  const [rHasta, setRHasta] = useState('');
  const [rTributo, setRTributo] = useState('');
  const [rArea, setRArea] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  /* Provisional, y se dice en pantalla: mientras no haya puerta de sesión, esta
     es la única forma de dar un token a la interfaz desplegada. */
  const [tokenPegado, setTokenPegado] = useState('');

  const ejercicio = pref.ejercicio;
  const turnoCompleto = caja.trim() !== '' && cajero.trim() !== '';

  /* ══════════ Las lecturas ══════════ */

  /**
   * El catálogo de ventanillas (#618).
   *
   * Se pide en los **cuatro** destinos que dibujan el campo «Caja» y en ninguno
   * más: el panel —donde se elige el turno—, la cobranza, el cierre y el filtro
   * del listado de recibos. Convenios y Recaudación no lo piden porque no tienen
   * ese campo, y una lectura que ninguna pantalla dibuja es un viaje de más en
   * cada cambio de destino.
   *
   * No depende de nada tecleado, así que `llaves` va vacío: se pide una vez por
   * destino y se queda. Y **puede fallar sola** sin tumbar la pantalla: exige uno
   * de cinco accesos, así que un perfil que sólo cierra caja podría recibir un
   * 403 aquí y seguir necesitando cerrar su turno. Lo que se hace entonces está
   * abajo, en `campoDeCaja`: se vuelve a la caja de texto con el motivo escrito,
   * nunca a un desplegable vacío.
   */
  const necesitaElCatalogoDeCajas = dest === 'panel' || dest === 'cobrar' || dest === 'cierre' || dest === 'recibos';
  const cajas = useRecurso((s) => listarCajas(s), [], necesitaElCatalogoDeCajas);
  const catalogoDeCajas: CajaDelCatalogo[] = cajas.datos?.contenido ?? [];
  /** La ventanilla elegida, cuando el catálogo la conoce. Es lo que permite decir
   *  que está dada de baja **antes** del 422, y sale nula cuando se tecleó. */
  const cajaElegida = catalogoDeCajas.find((c) => c.codigo === caja.trim()) ?? null;

  /** El sujeto, resuelto del código. `CajaController` hace lo mismo con
   *  `DirectorioDeContribuyentes` y contesta 404 si no está: preguntarlo antes es
   *  lo que evita descubrirlo después de marcar seis deudas. */
  const persona = useRecurso(
    (s) => contribuyentePorCodigo(codigoReposado, s),
    [codigoReposado],
    (dest === 'cobrar' || dest === 'convenios') && codigoReposado !== '',
  );
  const contribuyente = (persona.datos?.contenido ?? []).find((c) => c.codigo === codigoReposado) ?? null;

  /** La deuda del sujeto. La publica cuenta corriente, no tesorería. */
  const deuda = useRecurso(
    (s) =>
      deudaDelContribuyente(
        {
          codContribuyente: codigoReposado,
          fechaDeCorte: fechaDeCorte || undefined,
          fase: fase || undefined,
        },
        { tamano: 50 },
        s,
      ),
    [codigoReposado, fechaDeCorte, fase],
    (dest === 'cobrar' || dest === 'convenios') && codigoReposado !== '' && contribuyente !== null,
  );
  const obligaciones = deuda.datos?.contenido ?? [];

  /** El arqueo en vivo del turno. Es la única lectura que dice qué lleva cobrado
   *  la ventanilla, y la usan el panel y el cierre. */
  const enPanel = dest === 'panel';
  const enCierre = dest === 'cierre';
  const diaDelTurno = fechaDelTurno || hoy;
  const turno = useRecurso(
    (s) =>
      avanceDeRecaudacion(
        {
          caja: caja.trim(),
          cajero: cajero.trim(),
          desde: enCierre ? diaDelTurno : hoy,
          hasta: enCierre ? diaDelTurno : hoy,
        },
        s,
      ),
    [caja, cajero, enCierre ? diaDelTurno : hoy, enCierre],
    /* Se pide en los seis destinos y no solo en dos: la tarjeta del turno está
       siempre en el panel del shell, y sin la lectura diría «nadie abrió turno»
       sin haberlo preguntado —que es afirmar algo que no se sabe—. */
    turnoCompleto,
  );
  const arqueo: Arqueo | null = turno.datos?.turno?.arqueo ?? null;

  /** El avance del ejercicio, por tributo. Sin caja ni cajero: es el reporte. */
  const avance = useRecurso(
    (s) =>
      avanceDeRecaudacion(
        {
          ejercicio,
          desde: rDesde || undefined,
          hasta: rHasta || undefined,
          tributo: rTributo || undefined,
        },
        s,
      ),
    [ejercicio, rDesde, rHasta, rTributo],
    enPanel || (dest === 'recaudacion' && recTab === 0),
  );

  const porArea = useRecurso(
    (s) =>
      recaudacionPorArea(
        { ejercicio, desde: rDesde || undefined, hasta: rHasta || undefined, area: rArea || undefined },
        s,
      ),
    [ejercicio, rDesde, rHasta, rArea],
    dest === 'recaudacion' && recTab === 1,
  );

  /** Los convenios. Con `nroDeConvenio` la fila trae además su detalle. */
  const convenios = useRecurso(
    (s) =>
      listarConvenios(
        {
          nroDeConvenio: fNumero.trim() || undefined,
          codContribuyente: fContribuyente.trim() || undefined,
          estado: fEstado || undefined,
          desde: fDesde || undefined,
          hasta: fHasta || undefined,
        },
        { pagina: paginaConv, tamano: 20 },
        s,
      ),
    [fNumero, fContribuyente, fEstado, fDesde, fHasta, paginaConv],
    dest === 'convenios' && hojaConv === 'seguimiento',
  );

  /** El convenio abierto, con su cronograma y sus actos: es la misma ruta, pedida
   *  por su número. */
  const fichaConvenio = useRecurso(
    (s) => listarConvenios({ nroDeConvenio: abierto ?? '' }, { tamano: 1 }, s),
    [abierto],
    dest === 'convenios' && hojaConv === 'seguimiento' && abierto !== null,
  );
  const detalle: FilaDeConvenio | null = fichaConvenio.datos?.contenido[0] ?? null;

  /** El recibo que se busca por su número impreso. */
  const recibo = useRecurso(
    (s) => duplicadoDeRecibo(numeroReposado, s),
    [numeroReposado],
    dest === 'recibos' && numeroReposado !== '',
  );

  /**
   * El listado de recibos (#548): la grilla «Recibos localizados» del manual.
   *
   * Se pide sin ningún filtro obligatorio —los recibos del día son la pregunta
   * corriente en ventanilla— porque el backend contesta una página vacía con
   * `totalElementos: 0` a quien no tiene ninguno, y eso es una respuesta, no un
   * error.
   *
   * `estado` sólo viaja cuando se eligió uno de los dos: «Todos» **no es un
   * valor** del enumerado y mandarlo da 422.
   */
  const recibos = useRecurso(
    (s) =>
      listarRecibos(
        {
          codContribuyente: fRecContribuyente.trim() || undefined,
          caja: fRecCaja.trim() || undefined,
          cajero: fRecCajero.trim() || undefined,
          desde: fRecDesde || undefined,
          hasta: fRecHasta || undefined,
          estado: fRecEstado || undefined,
        },
        /* De más nuevo a más viejo, y no es una preferencia: el backend ordena
           por `fecha` ASCENDENTE si no se le dice otra cosa, así que en una
           municipalidad con miles de recibos el de esta mañana —el único que
           alguien viene a reimprimir— caería en la última página. */
        { pagina: paginaRec, tamano: 20, direccion: 'DESCENDENTE' },
        s,
      ),
    [fRecContribuyente, fRecCaja, fRecCajero, fRecDesde, fRecHasta, fRecEstado, paginaRec],
    dest === 'recibos',
  );

  /**
   * Si el ejercicio del acto tiene conjunto sellado, para poder decirlo ANTES
   * de que se rellene el formulario (#605, AC 3).
   *
   * Hasta aquí, quien atiende tecleaba el contribuyente, marcaba las deudas,
   * ponía cuotas, garantía y vencimiento —y para registrar, además la
   * observación que la regla 10 obliga a redactar antes de habilitar el botón—
   * para recibir al final un 422. Con D-02a abierta ese 422 es lo que contestan
   * hoy todas las municipalidades, así que el formulario entero se rellenaba
   * para nada.
   *
   * Se pide sólo en la hoja que calcula. «Convenios suscritos» no calcula nada:
   * sus dos acciones son anular y quebrar, y ninguna lee el conjunto sellado
   * —«Reformular», que sí lo leería, no se ofrece ahí—.
   */
  const conjuntoDelEjercicio = useRecurso(
    (s) => ejercicioParametrizado(ejercicioDelActo, s),
    [ejercicioDelActo],
    dest === 'convenios' && hojaConv === 'fraccionar',
  );

  /** Cuántos convenios vigentes hay, para el panel. */
  const vigentes = useRecurso(
    (s) => listarConvenios({ estado: 'VIGENTE' }, { tamano: 1 }, s),
    [],
    enPanel,
  );

  /* Filtrar vuelve a la primera página, y desde que hay paginador (#620) esto
     tiene consecuencia: acotar estando en la 3 dejaría «Ningún convenio con esos
     criterios» sobre un filtro que sí tiene, porque la página 3 del conjunto
     recortado no existe. */
  useEffect(() => setPaginaConv(0), [fNumero, fContribuyente, fEstado, fDesde, fHasta]);
  useEffect(() => setPaginaRec(0), [fRecContribuyente, fRecCaja, fRecCajero, fRecDesde, fRecHasta, fRecEstado]);
  /* Cambiar de recibo deja el acta y las observaciones del anterior: sin esto,
     el acta de la anulación de A se lee bajo el recibo B —y peor, la observación
     escrita para A se reimprimiría con B, que es la limpieza tras guardar de
     #331 aplicada al sujeto—. */
  useEffect(() => {
    setActa(null);
    setObsDuplicado('');
    setObsAnul('');
    setMemoAnul('');
  }, [numeroReposado]);
  /* Cambiar de sujeto deja las marcas de otro: sin esto se cobraría lo marcado
     en la deuda de quien ya no está en pantalla. */
  useEffect(() => {
    setMarcadas({});
    setMarcadasFrac({});
    setEmitido(null);
    setSimulacion(null);
  }, [codigoReposado]);

  const seleccion: SeleccionDeObligacion[] = obligaciones
    .filter((o) => marcadas[llaveDe(o)])
    .map((o) => ({
      tributo: o.tributo,
      ejercicio: o.ejercicio,
      ...(o.predioId !== null ? { predioId: o.predioId } : {}),
      ...(o.vehiculoId !== null ? { vehiculoId: o.vehiculoId } : {}),
    }));
  const seleccionFrac: SeleccionDeObligacion[] = obligaciones
    .filter((o) => marcadasFrac[llaveDe(o)])
    .map((o) => ({
      tributo: o.tributo,
      ejercicio: o.ejercicio,
      ...(o.predioId !== null ? { predioId: o.predioId } : {}),
      ...(o.vehiculoId !== null ? { vehiculoId: o.vehiculoId } : {}),
    }));

  /* ══════════ Las escrituras ══════════ */

  /** Lo que impide cobrar, dicho antes de pulsar y no después del 422. */
  const impedimentoDelCobro =
    hojaCobro === 'tasas'
      ? 'La caja de tasas necesita el catálogo del TUPA, y ninguna lectura lo publica.'
      : contribuyente === null
        ? 'Falta el contribuyente: se teclea su código y tiene que estar en el padrón.'
        : caja.trim() === ''
          ? 'Falta la caja: el recibo se numera con su serie.'
          : /* La ventanilla puede venir elegida desde el cierre o desde el filtro
               de recibos, donde una dada de baja SÍ vale —el turno de ayer hay que
               poder cerrarlo—, y el estado es uno solo. Aquí no vale: `AbrirCaja`
               lanza `CajaDeBaja` y el cobro se caería con un 422 después de haber
               marcado la deuda. Se dice antes. */
            cajaElegida !== null && !cajaElegida.activa
            ? `La ventanilla «${cajaElegida.codigo}» está dada de baja: no se puede abrir turno en ella, así que no puede cobrar. Elige una abierta.`
            : cajero.trim() === ''
            ? 'Falta el cajero: el arqueo del turno es suyo.'
            : tipoDePago === 'PRECONVENIO' && numeroDeConvenio.trim() === ''
              ? 'Cobrar una cuota inicial exige el número del convenio que formaliza.'
              : tipoDePago !== 'PRECONVENIO' && seleccion.length === 0
                ? 'Marca al menos una deuda: la caja cobra lo marcado, no una cifra escrita.'
                : obsCobro.trim() === ''
                  ? 'Falta la observación: toda cobranza se guarda con el motivo de quien la hace.'
                  : '';

  /**
   * La clave del intento en curso, una por acto.
   *
   * **Se genera la primera vez que se pide y no cambia hasta que alguien la
   * olvida.** Regenerarla en cada envio convertiria un reintento en un segundo
   * cobro, que es exactamente lo que la clave existe para impedir: el servidor
   * la usa para devolver el recibo YA emitido en vez de emitir otro
   * (`recibo_idempotencia_uq`, V29).
   *
   * Se olvida en dos momentos, y los dos hacen falta. **Al terminar bien**,
   * porque el intento se acabo y el siguiente es otro acto. **Y al cambiar
   * aquello sobre lo que se actua**, porque una clave reusada con otro sujeto
   * no devuelve el acto ajeno —el servidor contesta 409 (#606)— pero deja a
   * quien atiende delante de un conflicto que no entiende.
   *
   * No se olvida al fallar: ese es el caso para el que existe.
   */
  const claveDelCobro = useRef<string | null>(null);
  const claveDelConvenio = useRef<string | null>(null);
  const claveDelCierre = useRef<string | null>(null);
  const clave = (donde: { current: string | null }): string =>
    (donde.current ??= claveDeIdempotencia());
  /* La otra mitad del olvido, y la que no se ve venir: al cambiar de sujeto.
     Una clave reusada con otro contribuyente NO devuelve el acto ajeno —el
     servidor contesta 409 (#606)— pero deja a quien atiende delante de un
     conflicto que no explica nada. El intento era del anterior. */
  useEffect(() => {
    claveDelCobro.current = null;
    claveDelConvenio.current = null;
  }, [codigoReposado]);
  useEffect(() => {
    claveDelCierre.current = null;
  }, [numeroReposado]);

  const cobrar = async () => {
    if (impedimentoDelCobro !== '' || cobrando) return;
    setCobrando(true);
    setFalloDeCobro(null);
    try {
      const r = await cobrarDeuda(
        {
        caja: caja.trim(),
        cajero: cajero.trim(),
        codContribuyente: codigoReposado,
        formaDePago,
        tipoDePago,
        ...(beneficio.trim() !== '' ? { beneficioAplicable: beneficio.trim() } : {}),
        ...(fechaDePago !== '' ? { fechaDePago } : {}),
        obligaciones: seleccion,
        ...(tipoDePago === 'PRECONVENIO' ? { numeroDeConvenio: numeroDeConvenio.trim() } : {}),
        observacion: obsCobro.trim(),
        },
        clave(claveDelCobro),
      );
      /* El intento se acabo: el siguiente cobro es otro acto y necesita otra
         clave. Si esto no estuviera, dos cobranzas seguidas del mismo cajero
         irian con la misma y la segunda devolveria el recibo de la primera. */
      claveDelCobro.current = null;
      setEmitido(r);
      setMarcadas({});
      setObsCobro('');
      deuda.reintentar();
      toast('Recibo ' + r.numero + ' emitido por ' + moneda(r.total.importe) + '.');
    } catch (error) {
      const e = comoErrorDeApi(error, 'No se pudo cobrar');
      setFalloDeCobro(e);
      toast(e.mensaje, 'mal');
    } finally {
      setCobrando(false);
    }
  };

  const cuerpoDelFraccionamiento = (): PeticionDeFraccionamiento => ({
    codContribuyente: codigoReposado,
    tipo: tipoConvenio,
    ...(fechaDeCorte !== '' ? { fechaDeCorte } : {}),
    nroDeCuotas: Number.parseInt(nCuotas, 10),
    cuotaInicial: pctInicial.trim(),
    ...(primeraCuota !== '' ? { primeraCuotaVence: primeraCuota } : {}),
    tipoDeGarantia: garantia,
    ...(detalleGarantia.trim() !== '' ? { detalleDelOfrecimiento: detalleGarantia.trim() } : {}),
    ...(resolucion.trim() !== '' ? { resolucion: resolucion.trim() } : {}),
    obligaciones: seleccionFrac,
  });

  const impedimentoDelConvenio =
    contribuyente === null
      ? 'Falta el contribuyente: se teclea su código y tiene que estar en el padrón.'
      : seleccionFrac.length === 0
        ? 'Marca al menos una deuda: un convenio sin deuda acogida no fracciona nada.'
        : !/^\d+$/.test(nCuotas.trim()) || Number.parseInt(nCuotas, 10) < 1
          ? 'El número de cuotas es un entero mayor que cero.'
          : '';

  const simular = async () => {
    if (impedimentoDelConvenio !== '' || trabajandoConv) return;
    setTrabajandoConv(true);
    setFalloConv(null);
    setActoConv('simular');
    setConvenioNuevo(null);
    try {
      setSimulacion(await simularFraccionamiento(cuerpoDelFraccionamiento()));
      toast('Simulación calculada por el backend. No se ha registrado nada.');
    } catch (error) {
      const e = comoErrorDeApi(error, 'No se pudo simular el fraccionamiento');
      setSimulacion(null);
      setFalloConv(e);
      toast(e.mensaje, 'mal');
    } finally {
      setTrabajandoConv(false);
    }
  };

  const registrar = async () => {
    if (impedimentoDelConvenio !== '' || obsConvenio.trim() === '' || trabajandoConv) return;
    setTrabajandoConv(true);
    setFalloConv(null);
    setActoConv('registrar');
    try {
      const c = await registrarPreconvenio(
        { ...cuerpoDelFraccionamiento(), observacion: obsConvenio.trim() },
        clave(claveDelConvenio),
      );
      claveDelConvenio.current = null;
      setConvenioNuevo(c);
      setObsConvenio('');
      toast('Preconvenio ' + c.numero + ' registrado. Todavía no acoge deuda.');
    } catch (error) {
      const e = comoErrorDeApi(error, 'No se pudo registrar el convenio');
      /* El panel del preconvenio anterior se va: dejarlo puesto encima del
         fallo dice «F-2026-000007 registrado» al lado de «no se registró». */
      setConvenioNuevo(null);
      setFalloConv(e);
      toast(e.mensaje, 'mal');
    } finally {
      setTrabajandoConv(false);
    }
  };

  const cerrarElConvenio = async () => {
    if (abierto === null || motivoCierre.trim() === '' || obsCierreConvenio.trim() === '' || cerrandoConv) return;
    setCerrandoConv(true);
    setFalloCierre(null);
    try {
      const c = await cerrarConvenio(
        abierto,
        {
          accion,
          motivo: motivoCierre.trim(),
          ...(responsableCierre.trim() !== '' ? { responsableAnul: responsableCierre.trim() } : {}),
          ...(memoCierre.trim() !== '' ? { nDeMemorando: memoCierre.trim() } : {}),
          observacion: obsCierreConvenio.trim(),
        },
        clave(claveDelCierre),
      );
      claveDelCierre.current = null;
      setMotivoCierre('');
      setObsCierreConvenio('');
      convenios.reintentar();
      fichaConvenio.reintentar();
      toast('Convenio ' + c.numero + ' ' + c.estado.toLowerCase() + '. La deuda volvió a su fase de origen.');
    } catch (error) {
      /* Y no sólo un aviso que se va en 3,2 s: anular es un acto con
         resolución, y su negativa es lo que hay que poder leer y dictar por
         teléfono. Antes de #547 esto era el único sitio donde salía el motivo,
         y salía en un aviso efímero con un visto al lado. */
      const e = comoErrorDeApi(error, 'No se pudo cerrar el convenio');
      setFalloCierre(e);
      /* Y se vuelve a leer el convenio. Un 500 puede haberlo cerrado ANTES de
         romperse, y sin releer la pantalla seguiría diciendo VIGENTE encima de
         un aviso de fallo: quien atiende repetiría un acto ya hecho. En un 422
         no se escribió nada y releer no cuesta más que una lectura. */
      convenios.reintentar();
      fichaConvenio.reintentar();
      toast(e.mensaje, 'mal');
    } finally {
      setCerrandoConv(false);
    }
  };

  const anular = async () => {
    if (recibo.datos === null || motivoAnul.trim() === '' || obsAnul.trim() === '' || anulando) return;
    setAnulando(true);
    try {
      const a = await anularRecibo(recibo.datos.recibo.numero, {
        motivo: motivoAnul.trim(),
        ...(autorizadoPor.trim() !== '' ? { autorizadoPor: autorizadoPor.trim() } : {}),
        ...(memoAnul.trim() !== '' ? { nDeMemorando: memoAnul.trim() } : {}),
        observacion: obsAnul.trim(),
      });
      setActa(a);
      setObsAnul('');
      recibo.reintentar();
      /* Y el listado también: desde #548 el estado del recibo se ve en DOS
         sitios de esta misma pantalla, y refrescar sólo la ficha deja la grilla
         diciendo «EMITIDO» tres centímetros encima del acta que acaba de
         anularlo. Dos vistas del mismo hecho, y la que se lee primero es la
         vieja. */
      recibos.reintentar();
      toast(
        'Recibo ' + a.numero + ' anulado. ' + a.asientosReversados + ' asientos reversados en el libro.',
      );
    } catch (error) {
      toast(comoErrorDeApi(error, 'No se pudo anular el recibo').mensaje, 'mal');
    } finally {
      setAnulando(false);
    }
  };

  const impedimentoDelCierre =
    !turnoCompleto
      ? 'Falta la caja o el cajero: el turno es de los dos.'
      : modoCierre === 'reversar' && motivoDeReversion.trim() === ''
        ? 'Reversar un cierre firmado exige su motivo, y además el privilegio de eliminación.'
        : obsCierre.trim() === ''
          ? 'Falta la observación: cerrar o reversar un turno se guarda con el motivo de quien lo hace.'
          : '';

  const cerrarLaCaja = async () => {
    if (impedimentoDelCierre !== '' || cerrando) return;
    setCerrando(true);
    try {
      const declaradoLimpio: Record<string, string> = {};
      Object.entries(declarado).forEach(([forma, valor]) => {
        if (valor.trim() !== '') declaradoLimpio[forma] = valor.trim();
      });
      const a = await cerrarTurno({
        caja: caja.trim(),
        cajero: cajero.trim(),
        fecha: diaDelTurno,
        ...(modoCierre === 'reversar'
          ? { motivoDeReversion: motivoDeReversion.trim() }
          : { declarado: declaradoLimpio }),
        observacion: obsCierre.trim(),
      });
      setActaDeCierre(a);
      setObsCierre('');
      turno.reintentar();
      toast(
        a.tipo === 'CIERRE'
          ? 'Turno cerrado. El arqueo quedó firmado.'
          : 'Cierre reversado: el turno vuelve a estar abierto.',
      );
    } catch (error) {
      toast(comoErrorDeApi(error, 'No se pudo cerrar el turno').mensaje, 'mal');
    } finally {
      setCerrando(false);
    }
  };

  /* ══════════ Piezas compartidas ══════════ */

  /**
   * El aviso de un fallo, con la ruta y la referencia: se dicta por teléfono.
   *
   * Separa las TRES cosas que hasta #547 se veían igual, y las separa por el
   * **código**, no por el texto:
   *
   * <ul>
   *   <li>el servidor se rompió de verdad —`ERROR_INTERNO`, con incidencia—:
   *       reintentar puede funcionar, y por eso el botón sale <b>aquí</b>;
   *   <li>no hubo respuesta —`SIN_RESPUESTA`—: igual, reintentar puede cambiar
   *       algo en cuanto vuelva la red;
   *   <li>el servidor contestó que no —`VALIDACION`, `CONFLICTO`,
   *       `NO_ENCONTRADO`, `SIN_PRIVILEGIO`—: reintentar tal cual no cambia
   *       nada, y ofrecer el botón manda a pulsarlo para siempre.
   * </ul>
   *
   * `alReintentar` es opcional a propósito: hay fallos que no tienen una acción
   * que repetir. Cuando la hay, el botón depende de `ErrorDeApi.reintentable`.
   */
  const fallo = (
    error: ErrorDeApi | null,
    operacion: string,
    ruta: string,
    alReintentar?: () => void,
  ): ReactNode =>
    error === null ? null : (
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
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          style={{ color: 'var(--error-texto)' }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16.2h.02" />
        </svg>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--error-texto)' }}>
          {tituloDelFallo(error, operacion)}
        </p>
        <p
          style={{
            margin: 0,
            maxWidth: '56ch',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--ink-3)',
            textAlign: 'center',
            textWrap: 'pretty',
          }}
        >
          {explicacionDelFallo(error)}
        </p>
        {/* Lo que se puede hacer a continuación, que es lo único que quien
            atiende necesita decidir. Sale del CÓDIGO, nunca del texto. */}
        <p
          style={{
            margin: 0,
            maxWidth: '62ch',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ink-3)',
            textAlign: 'center',
            textWrap: 'pretty',
          }}
        >
          {queSePuedeHacer(error)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, ...META }}>
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
        {/* «Reintentar» sólo donde reintentar puede cambiar algo: un 422 dice
            que la petición, tal cual, no se puede atender, y el botón encima de
            una cifra sin publicar manda a pulsarlo para siempre (#540, #547). */}
        {error.reintentable && alReintentar !== undefined && (
          <button onClick={alReintentar} className="hov-linea" style={{ ...BOTON_LINEA, marginTop: 4 }}>
            Reintentar
          </button>
        )}
        {/* Todavía no hay puerta de sesión: la interfaz no sabe pedir un token,
            así que se le da. Aparece SOLO ante un 401. */}
        {error.codigo === 'NO_AUTENTICADO' && !hayPuerta() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, width: 'min(560px, 100%)' }}>
            <label style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'left' }}>
              Aquí no hay puerta de sesión —es la vista previa local—, así que pega un token del emisor:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={tokenPegado}
                onChange={(e) => setTokenPegado(e.target.value)}
                placeholder="eyJhbGciOi…"
                spellCheck={false}
                style={{ ...IN, flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
              <button
                onClick={() => {
                  fijarToken(tokenPegado.trim() || null);
                  setTokenPegado('');
                }}
                className="hov-linea"
                style={BOTON_LINEA}
              >
                Usar
              </button>
            </div>
          </div>
        )}
      </section>
    );

  /** El buscador del sujeto: el código, y lo que el padrón contesta. */
  const buscadorDeContribuyente = (proposito: string) => (
    <section style={TARJETA}>
      <div style={REJILLA(200)}>
        <label style={CAMPO}>
          <span style={ETIQUETA}>Cód. contribuyente</span>
          <input
            value={codContribuyente}
            onChange={(e) => setCodContribuyente(e.target.value)}
            placeholder="C-000001"
            style={{ ...IN, fontFamily: 'var(--font-mono)' }}
          />
          <span style={AYUDA}>
            El código del padrón, que es lo que el backend resuelve. No el DNI ni el nombre.
          </span>
        </label>
        <label style={CAMPO}>
          <span style={ETIQUETA}>Deuda actualizada al</span>
          <input type="date" value={fechaDeCorte} onChange={(e) => setFechaDeCorte(e.target.value)} style={IN} />
          <span style={AYUDA}>Sin fecha, hoy. Toda cifra de abajo va referida a este día (regla 9).</span>
        </label>
        <label style={CAMPO}>
          <span style={ETIQUETA}>Fase de cobranza</span>
          <select value={fase} onChange={(e) => setFase(e.target.value as '' | FaseDeCobranza)} style={IN}>
            <option value="">Todas</option>
            <option value="ORDINARIA">Ordinaria</option>
            <option value="VALOR">Valor emitido</option>
            <option value="COACTIVA">Coactiva</option>
            <option value="CONVENIO">En convenio</option>
          </select>
        </label>
      </div>
      <div style={{ padding: '0 16px 15px' }}>
        {codigoReposado === '' ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Teclea el código del contribuyente {proposito}.
          </p>
        ) : persona.cargando ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>Buscando en el padrón…</p>
        ) : persona.error ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--error-texto)' }}>
            {tituloDelFallo(persona.error, 'el padrón')}. {explicacionDelFallo(persona.error)}
          </p>
        ) : contribuyente === null ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
            No hay ningún contribuyente con el código «{codigoReposado}». La caja lo rechazaría con un 404, así que
            aquí no se marca nada todavía.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', textWrap: 'pretty' }}>
            <strong style={{ fontWeight: 600 }}>{contribuyente.nombreRazonSocial}</strong>
            <span style={{ color: 'var(--ink-3)' }}>
              {' · '}
              {contribuyente.tipoDocumento} {contribuyente.numeroDocumento}
              {contribuyente.condicionEspecial ? ' · ' + contribuyente.condicionEspecial : ''}
              {contribuyente.activo ? '' : ' · DADO DE BAJA DEL PADRÓN'}
            </span>
          </p>
        )}
      </div>
    </section>
  );

  const COLS_DEUDA: readonly ColDef[] = [
    ['Año', 0],
    ['Tributo', 0],
    ['Unidad', 0],
    ['Cuotas', 0],
    ['Fase', 0],
    ['Insoluto', 1],
    ['Reajuste', 1],
    ['Interés', 1],
    ['Gastos', 1],
    ['Total', 1],
  ];

  /** La grilla de deuda. La comparten la caja y el fraccionamiento porque es la
   *  misma lectura: `GET /consultas/deuda`. */
  const tablaDeDeuda = (
    marcas: Record<string, boolean>,
    marcar: (m: Record<string, boolean>) => void,
    titulo: string,
  ) => {
    const marcadasAhora = obligaciones.filter((o) => marcas[llaveDe(o)]).length;
    return (
      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>{titulo}</h2>
          <span style={META}>
            {obligaciones.length} {obligaciones.length === 1 ? 'obligación' : 'obligaciones'} · {marcadasAhora} marcadas
          </span>
          <button
            onClick={() => {
              const todo = marcadasAhora !== obligaciones.length;
              const m: Record<string, boolean> = {};
              obligaciones.forEach((o) => {
                m[llaveDe(o)] = todo;
              });
              marcar(m);
            }}
            className="hov-linea"
            style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12, background: 'var(--bg-elev)' }}
          >
            {marcadasAhora === obligaciones.length && obligaciones.length > 0 ? 'Quitar selección' : 'Marcar todo'}
          </button>
        </div>

        {deuda.cargando && (
          <div style={{ padding: '16px' }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{ display: 'flex', gap: 16, padding: '10px 0' }}>
                <div data-esq="1" style={{ width: 118, height: 13 }} />
                <div data-esq="1" style={{ flex: 1, height: 13 }} />
                <div data-esq="1" style={{ width: 74, height: 13 }} />
              </div>
            ))}
          </div>
        )}

        {!deuda.cargando && deuda.error && (
          <p style={{ margin: 0, padding: '16px', fontSize: 12.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
            {tituloDelFallo(deuda.error, 'la deuda')}. {explicacionDelFallo(deuda.error)}
          </p>
        )}

        {!deuda.cargando && !deuda.error && obligaciones.length === 0 && (
          <p style={{ margin: 0, padding: '24px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {contribuyente === null
              ? 'Sin contribuyente no hay deuda que enseñar.'
              : 'Este contribuyente no tiene deuda a la fecha de corte. No es un fallo: es lo que dice el libro.'}
          </p>
        )}

        {obligaciones.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', width: 38, background: 'var(--bg-elev)' }} />
                  {cabeceras(COLS_DEUDA)}
                </tr>
              </thead>
              <tbody>
                {obligaciones.map((o) => {
                  const k = llaveDe(o);
                  const on = marcas[k] === true;
                  const celdas = [
                    String(o.ejercicio),
                    o.tributo,
                    unidadDe(o),
                    o.periodoDesde === o.periodoHasta ? String(o.periodoDesde) : `${o.periodoDesde} – ${o.periodoHasta}`,
                    o.fase,
                    o.deuda.insoluto.importe,
                    o.deuda.reajuste.importe,
                    o.deuda.interes.importe,
                    o.deuda.gasto.importe,
                    o.deuda.total.importe,
                  ];
                  return (
                    <tr
                      key={k}
                      className="hov-elev"
                      style={{ borderTop: '1px solid var(--line)', background: on ? 'var(--accent-soft)' : 'transparent' }}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => marcar({ ...marcas, [k]: !on })}
                          aria-label={`Marcar ${o.tributo} ${o.ejercicio}, ${unidadDe(o)}`}
                          style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                        />
                      </td>
                      {celdas.map((c, j) =>
                        j === 4 ? (
                          <td key={j} style={{ padding: '11px 14px' }}>
                            <Insignia tono={tono(c)}>{c}</Insignia>
                          </td>
                        ) : (
                          <td key={j} style={estiloDeCelda(j, COLS_DEUDA)}>
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
        )}

        <p style={NOTA_PIE}>
          Las cinco cifras vienen actualizadas al{' '}
          <strong style={{ fontWeight: 600 }}>{dia(obligaciones[0]?.deuda.total.actualizadoA ?? (fechaDeCorte || hoy))}</strong>, que es la
          fecha de corte de esta consulta. No hay ninguna suma dibujada aquí: el importe del recibo lo resuelve la caja
          releyendo el libro a la fecha de pago, y una suma de pantalla podría no ser la que acabe impresa.
          {deuda.datos !== null && deuda.datos.totalElementos > obligaciones.length && (
            <>
              {' '}
              <strong style={{ fontWeight: 600 }}>
                Hay {deuda.datos.totalElementos} obligaciones y aquí se ven {obligaciones.length}
              </strong>
              : se piden 50 por consulta y esta pantalla no pagina, así que lo que no se ve no se puede marcar.
            </>
          )}
        </p>
      </section>
    );
  };

  /** El recibo emitido, tal como el backend lo devolvió. */
  const comprobante = (r: Recibo) => (
    <section
      style={{
        background: '#fff',
        border: '1px solid var(--line)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-2)',
        padding: '26px 30px',
        maxWidth: 560,
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
          <p style={{ margin: 0 }}>{r.numero}</p>
          {/* La hora va con su zona, y es el unico sitio del producto donde hace
              falta decirla (#619). Es el dato con el que se distinguen dos cobros
              del mismo dia y del mismo importe, y el papel que el contribuyente
              trae lleva la del reloj de la caja: quien mire desde otra zona ve
              aqui el nombre de la suya y sabe que no van a coincidir. En una
              ventanilla de Piura las dos son la misma y la coletilla sobra, pero
              no cuesta nada y su ausencia si costaria. */}
          <p style={{ margin: '2px 0 0' }}>{instante(r.emitidoEn)}</p>
          <p style={{ margin: '1px 0 0', fontSize: 9.5 }}>hora de {zonaDelLector()}</p>
        </div>
      </div>
      <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
          Contribuyente
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)' }}>
          {contribuyente ? contribuyente.nombreRazonSocial + ' · ' + contribuyente.codigo : codigoReposado || SIN_DATO}
        </p>
      </div>
      {r.lineas.map((l, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>
            {l.tributo}
            {l.ejercicio !== null ? ' ' + l.ejercicio : ''} · {l.concepto}
            {l.cantidad !== null ? ` · ${l.cantidad} ×` : ''}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>{l.monto.importe}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '13px 0 0' }}>
        <span style={{ flex: 1, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
          Total cobrado
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>{moneda(r.total.importe)}</span>
      </div>
      <p style={{ margin: '16px 0 0', fontSize: 11, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
        Cajero {r.cajero} · serie {r.serie} · {r.formaDePago} · {r.tipoDePago}. Deuda releída al{' '}
        {dia(r.total.actualizadoA)}.
        {r.beneficioDeclarado
          ? ` Beneficio declarado: ${r.beneficioDeclarado} — queda como constancia y no descuenta nada mientras D-02b siga abierta.`
          : ''}
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }} data-noprint="1">
        <button onClick={() => window.print()} className="hov-acento-2" style={{ ...BOTON_PRIMARIO(true), flex: 1 }}>
          Imprimir recibo
        </button>
        <button
          onClick={() => {
            setEmitido(null);
            toast('Listo para el siguiente contribuyente.');
          }}
          className="hov-linea"
          style={BOTON_LINEA}
        >
          Nuevo cobro
        </button>
      </div>
    </section>
  );

  /* ══════════ PANEL: EL TURNO ══════════ */

  /**
   * El campo «Caja», y es **el mismo** en las cuatro pantallas que lo piden.
   *
   * <h2>Qué había antes, que no era lo mismo en las cuatro</h2>
   *
   * Ninguna dibujaba el desplegable «Todas · C-1 · C-2 · C-3 · C-4» del artboard
   * —esas cuatro ventanillas son de la maqueta—, pero las cuatro pedían el código
   * tecleado y cada una lo justificaba de una manera distinta: el panel decía que
   * «ninguna lectura del contrato publica el catálogo de cajas», el filtro de
   * recibos decía que «`GET /tesoreria/cajas` contesta 404» y nombraba este mismo
   * issue, y la cobranza y el cierre **no decían nada**: una caja de texto con
   * `C-01` de marcador, y quien atiende teniendo que saberse de memoria un código
   * que el sistema conocía. Las dos primeras explicaciones eran ciertas y hoy son
   * falsas; las otras dos nunca dijeron nada. Se cierran las cuatro aquí, en un
   * solo sitio, para que la próxima no pueda quedarse a medias.
   *
   * <h2>Lo que viaja es el código, nunca el rótulo</h2>
   *
   * `value` es `c.codigo`. Ésta es la única pantalla por la que entra dinero
   * (#430) y el cuerpo del cobro lleva `caja`, que `AbrirCaja` resuelve con
   * `CajaRepository.porCodigo`. Mandar el rótulo es **ruidoso** —medido poniendo
   * `value={c.nombre}` y cobrando: 404 «No hay ninguna caja con el codigo 'Caja
   * tributaria 1' en esta municipalidad»—; mandar el código de **otra ventanilla**
   * es silencioso, porque el cobro sale 201 y el dinero se abona al turno de una
   * caja que no es la que atendió, sin que ninguna cifra parezca mal. Por eso el
   * estado guarda la cadena y no la fila: guardar el objeto invita a mandar el
   * campo equivocado.
   *
   * <h2>Las dadas de baja salen, y no se pueden elegir en las cuatro</h2>
   *
   * El catálogo no admite filtro de estado y devuelve todas (#618), así que el
   * criterio lo pone la pantalla —y **no es el mismo**, medido contra el backend:
   * `AbrirCaja` lanza `CajaDeBaja` y la cobranza contesta 422, mientras
   * `CerrarTurno` sólo resuelve el código y no mira `activa`—. De modo que en el
   * cobro la opción se dibuja pero **apagada**, con «dada de baja» en el rótulo, y
   * en el turno, el cierre y el filtro se puede elegir: el turno de ayer de una
   * ventanilla cerrada hoy hay que poder arquearlo, y sus recibos siguen
   * existiendo (RNF-051). Apagada y no escondida porque una lista recortada en
   * silencio se lee como que esa ventanilla no existe, que es lo contrario de lo
   * que pasa.
   *
   * @param modo `cobro` exige una abierta; `turno` admite cualquiera; `filtro`
   *     admite además el vacío, que ahí significa «todas»
   */
  const campoDeCaja = (valor: string, fijar: (v: string) => void, modo: 'cobro' | 'turno' | 'filtro') => {
    /* Se vuelve a la caja de texto en dos casos, y los dos hay que distinguirlos
       porque se arreglan de forma distinta: que la lectura FALLE —403 de quien no
       tiene ninguno de los cinco accesos, o el servidor caído— y que conteste una
       página VACÍA, que no es un fallo sino una municipalidad recién implantada a
       la que todavía no se le han cargado ventanillas. Lo que no vale en ninguno
       de los dos es un desplegable vacío: se lee como «esta municipalidad no tiene
       cajas», que en el primer caso es sencillamente falso. */
    const catalogoVacio = cajas.datos !== null && catalogoDeCajas.length === 0;
    const seTeclea = cajas.error !== null || catalogoVacio;

    if (seTeclea) {
      return (
        <label style={CAMPO}>
          <span style={ETIQUETA}>Caja</span>
          <input
            value={valor}
            onChange={(e) => fijar(e.target.value.toUpperCase())}
            placeholder="C-01"
            style={{ ...IN, fontFamily: 'var(--font-mono)' }}
          />
          <span style={AYUDA}>
            {cajas.error !== null
              ? `${tituloDelFallo(cajas.error, 'el catálogo de ventanillas')}. ${explicacionDelFallo(cajas.error)} Mientras tanto el código se teclea, como antes de #618.`
              : 'Esta municipalidad no tiene ninguna ventanilla cargada: el catálogo contestó una página vacía, que es el estado normal de una instalación recién implantada. Las carga «cargar-cajas.sh», el paso 4 de la siembra; hasta entonces el cobro contesta 422 aunque se teclee un código.'}
          </span>
        </label>
      );
    }

    return (
      <label style={CAMPO}>
        <span style={ETIQUETA}>Caja</span>
        <select value={valor} onChange={(e) => fijar(e.target.value)} style={IN}>
          {/* Mientras se lee, la opción del valor que ya hay: sin ella el
              desplegable se vaciaría un instante y parecería que se ha perdido lo
              elegido. */}
          {cajas.cargando && (
            <option value={valor}>{valor === '' ? 'leyendo el catálogo…' : `${valor} · leyendo el catálogo…`}</option>
          )}
          {!cajas.cargando && (
            <option value="">{modo === 'filtro' ? 'Todas' : '(elige una ventanilla)'}</option>
          )}
          {catalogoDeCajas.map((c) => (
            <option key={c.codigo} value={c.codigo} disabled={modo === 'cobro' && !c.activa}>
              {rotuloDeCaja(c)}
            </option>
          ))}
        </select>
        <span style={AYUDA}>
          {modo === 'cobro'
            ? 'Lo que viaja en el cobro es el código, no el rótulo. Una ventanilla dada de baja sale en la lista y no se puede elegir: el backend rechaza abrir turno en ella.'
            : modo === 'turno'
              ? '(caja, cajero, día) es lo que hace único un turno desde V3. Las dadas de baja se pueden elegir aquí: el turno de ayer de una ventanilla cerrada hoy hay que poder arquearlo y cerrarlo.'
              : 'Salen también las dadas de baja: sus recibos siguen existiendo (RNF-051), y no listarlas dejaría sin encontrar los que emitieron.'}{' '}
          Junto al rótulo va el área a la que se imputa lo que recauda; las que no cuelgan de ninguna lo dicen, porque
          ahí no falta un dato: lo tributario no se imputa a ninguna partida.
          {cajas.datos?.hayMas === true &&
            ' El catálogo trae más ventanillas de las que caben en una lectura: aquí sólo están las primeras 200 por código.'}
        </span>
      </label>
    );
  };

  const campoDelTurno = (
    <section style={TARJETA}>
      <div style={CABECERA}>
        <h2 style={H2}>El turno</h2>
        <span style={META}>{dia(hoy)}</span>
      </div>
      <div style={REJILLA(200)}>
        {campoDeCaja(caja, setCaja, 'turno')}
        <label style={CAMPO}>
          <span style={ETIQUETA}>Cajero</span>
          <input value={cajero} onChange={(e) => setCajero(e.target.value)} placeholder="jperez" style={IN} />
          <span style={AYUDA}>
            Arranca con la cuenta de la sesión, que es la que el backend compara para saber si un recibo es ajeno.
          </span>
        </label>
      </div>
    </section>
  );

  const panel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ ...ENTRADILLA, textWrap: 'pretty' }}>
        Tesorería no es un conjunto de formularios: es un turno. Se abre la caja, se cobra, se corrigen los errores del
        día y se cierra con un arqueo que tiene que cuadrar. El módulo se ordena así.
      </p>

      {campoDelTurno}

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>Lo que llevas cobrado hoy</h2>
          <span style={META}>
            {arqueo
              ? `turno ${arqueo.turnoId} · ${turno.datos?.turno?.estadoDelTurno ?? ''}`
              : 'GET /tesoreria/recaudacion/avance'}
          </span>
        </div>

        {!turnoCompleto && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Falta la caja o el cajero, arriba. El arqueo en vivo es de un turno concreto —(caja, cajero, día) es lo
            que lo hace único desde V3—, así que sin los dos no hay nada que pedir.
          </p>
        )}
        {turnoCompleto && turno.cargando && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Leyendo el turno…</p>
        )}
        {turnoCompleto && !turno.cargando && turno.error?.codigo === 'NO_ENCONTRADO' && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            «{cajero}» no ha abierto turno en la caja «{caja}» hoy. El backend contesta 404 a propósito y no un arqueo
            en ceros: un cero se leería como que abrió y no cobró. El turno se abre solo, con la primera cobranza.
          </p>
        )}
        {turnoCompleto && !turno.cargando && turno.error && turno.error.codigo !== 'NO_ENCONTRADO' && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 12.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
            {tituloDelFallo(turno.error, 'el turno')}. {explicacionDelFallo(turno.error)}
          </p>
        )}

        {arqueo && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
              {arqueo.lineas.map((l) => (
                <div key={l.formaDePago} style={TOTAL_CELDA(false)}>
                  <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                    {rotuloDeForma(l.formaDePago)}
                  </p>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--ink)' }}>
                    {moneda(l.neto.importe)}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>
                    cobrado {l.cobrado.importe} · anulado {l.anulado.importe}
                  </p>
                </div>
              ))}
            </div>
            <p style={NOTA_PIE}>
              {arqueo.recibosEmitidos} {arqueo.recibosEmitidos === 1 ? 'recibo emitido' : 'recibos emitidos'} y{' '}
              {arqueo.recibosAnulados} {arqueo.recibosAnulados === 1 ? 'anulado' : 'anulados'}. Neto del turno{' '}
              {moneda(arqueo.neto.importe)} al {dia(arqueo.neto.actualizadoA)}. Ninguna de estas cifras se resta aquí:
              las calcula el arqueo del backend, que es el que se congela al cerrar.
            </p>
          </>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
        {[
          {
            valor: arqueo ? String(arqueo.recibosEmitidos) : SIN_DATO,
            etiqueta: 'Recibos emitidos en el turno',
            nota: arqueo
              ? 'De ellos, ' + arqueo.recibosAnulados + (arqueo.recibosAnulados === 1 ? ' anulado.' : ' anulados.')
              : 'Hace falta la caja y el cajero para contarlos.',
          },
          {
            valor: arqueo ? moneda(arqueo.neto.importe) : SIN_DATO,
            etiqueta: 'Neto del turno',
            nota: arqueo ? 'Lo cobrado menos lo anulado, al ' + dia(arqueo.neto.actualizadoA) + '.' : 'Sale del arqueo en vivo del turno.',
          },
          {
            valor: avance.datos ? moneda(avance.datos.neto.importe) : avance.cargando ? '…' : SIN_DATO,
            etiqueta: 'Recaudado en el ejercicio ' + ejercicio,
            nota: 'No hay porcentaje de avance: lo emitido son cargos del libro y este contexto no los lee.',
          },
          {
            valor: vigentes.datos ? String(vigentes.datos.totalElementos) : vigentes.cargando ? '…' : SIN_DATO,
            etiqueta: 'Convenios vigentes',
            nota: '«En riesgo» no se cuenta: no es un estado del convenio, y cuántas cuotas impagas lo quiebran es una cifra de ordenanza local (D-02b).',
          },
        ].map((k) => (
          <div key={k.etiqueta} style={{ ...TARJETA, padding: '16px 17px' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
              {k.valor}
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
            <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
          </div>
        ))}
      </div>

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>Recaudación del ejercicio {ejercicio}</h2>
          <span style={META}>{avance.datos ? `al ${dia(avance.datos.aLaFecha)}` : ''}</span>
          <button onClick={() => onDest('recaudacion')} className="hov-linea" style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12, background: 'var(--bg-elev)' }}>
            Ver detalle
          </button>
        </div>
        {avance.cargando && <p style={{ margin: 0, padding: '20px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Sumando…</p>}
        {!avance.cargando && (avance.datos?.filas ?? []).length === 0 && (
          <p style={{ margin: 0, padding: '20px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Todavía no hay ningún recibo cobrado en el ejercicio. La lista sale de los recibos del periodo, no de una
            meta: aquí no hay ninguna barra de avance porque no hay contra qué medirla.
          </p>
        )}
        {(avance.datos?.filas ?? []).map((f) => (
          <div key={f.tributo} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{f.tributo}</span>
            <span style={{ flex: '0 0 130px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)' }}>
              {moneda(f.neto.importe)}
            </span>
            <span data-sm-hide="1" style={{ flex: '0 0 150px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-4)' }}>
              anulado {f.anulado.importe}
            </span>
          </div>
        ))}
        <p style={NOTA_PIE}>
          Lo que el prototipo dibujaba aquí —emitido, saldo y porcentaje de avance— no existe como dato: la meta no
          tiene tabla y lo emitido son cargos del libro de cuenta corriente, que tesorería no lee (ARQ-01 §3.8).
        </p>
      </section>
    </div>
  );

  /* ══════════ COBRAR ══════════ */

  const cobrarPantalla = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['tributaria', 'Deuda tributaria'],
            ['tasas', 'Tasas y derechos'],
          ] as const
        ).map((h) => (
          <button
            key={h[0]}
            onClick={() => setHojaCobro(h[0])}
            aria-pressed={hojaCobro === h[0]}
            className="hov-linea"
            style={PILDORA(hojaCobro === h[0])}
          >
            {h[1]}
          </button>
        ))}
        <p data-sm-hide="1" style={{ margin: 0, flex: 1, minWidth: 180, alignSelf: 'center', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
          {hojaCobro === 'tributaria'
            ? 'Deuda de la cuenta corriente: predial, arbitrios, vehicular y multas.'
            : 'Conceptos del TUPA que no están en la cuenta corriente.'}
        </p>
      </div>

      {hojaCobro === 'tasas' ? (
        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>Caja de tasas y derechos</h2>
            <span style={META}>POST /tesoreria/caja/tasas</span>
          </div>
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '80ch' }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
              El endpoint existe y esta pantalla <strong style={{ fontWeight: 600 }}>no lo puede llamar</strong>. La
              petición lleva una lista de conceptos del TUPA por su código —el precio no viaja: lo resuelve el servidor
              con la tarifa vigente a la fecha del cobro—, y{' '}
              <strong style={{ fontWeight: 600 }}>ninguna lectura del contrato publica ese catálogo</strong>: no hay
              ningún <code style={{ fontFamily: 'var(--font-mono)' }}>GET /tesoreria/tasas</code>, así que quien atiende
              no tiene de dónde elegir.
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
              Los cuatro conceptos que el prototipo dibujaba —inspección ocular, constancia de no adeudo, copia
              certificada, derecho de anuncio— eran del artboard, con sus precios inventados. Se han quitado: una
              tarifa inventada no cobra de más ni de menos por casualidad, cobra lo que nadie firmó, y sus cifras son
              del TUPA con su ratificación provincial (D-02b).
            </p>
            <p style={{ margin: 0, ...AYUDA }}>
              Una grilla vacía tampoco valdría: se leería como «esta municipalidad no cobra tasas».
            </p>
          </div>
        </section>
      ) : (
        <>
          {buscadorDeContribuyente('al que se le va a cobrar')}
          {tablaDeDeuda(marcadas, setMarcadas, 'Deuda del contribuyente')}

          <section style={TARJETA}>
            <div style={CABECERA}>
              <h2 style={H2}>Cómo se cobra</h2>
              <span style={META}>POST /tesoreria/caja/cobranza</span>
            </div>
            <div style={REJILLA(200)}>
              {campoDeCaja(caja, setCaja, 'cobro')}
              <label style={CAMPO}>
                <span style={ETIQUETA}>Cajero</span>
                <input value={cajero} onChange={(e) => setCajero(e.target.value)} placeholder="jperez" style={IN} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Medio de pago</span>
                <select value={formaDePago} onChange={(e) => setFormaDePago(e.target.value)} style={IN}>
                  {FORMAS_DE_PAGO.map((f) => (
                    <option key={f[0]} value={f[0]}>
                      {f[1]}
                    </option>
                  ))}
                </select>
                <span style={AYUDA}>
                  El manual no dibuja este campo y el recibo no se puede emitir sin él: son las cinco formas que
                  admite la restricción del recibo en la base, y con ellas se arquea el turno.
                </span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Tipo de cobranza</span>
                <select value={tipoDePago} onChange={(e) => setTipoDePago(e.target.value)} style={IN}>
                  {TIPOS_DE_COBRANZA.map((t) => (
                    <option key={t[0]} value={t[0]}>
                      {t[1]}
                    </option>
                  ))}
                </select>
                <span style={AYUDA}>
                  Quedan fuera {COBRANZAS_DEL_PROTOTIPO_SIN_BACKEND}: las dos que el enumerado sí tiene son pagos
                  parciales, y qué parte de la deuda extingue un pago parcial es una regla del art. 31 del Código
                  Tributario que no está transcrita.
                </span>
              </label>
              {tipoDePago === 'PRECONVENIO' && (
                <label style={CAMPO}>
                  <span style={ETIQUETA}>Nº de convenio</span>
                  <input
                    value={numeroDeConvenio}
                    onChange={(e) => setNumeroDeConvenio(e.target.value.toUpperCase())}
                    placeholder="F-2026-000123"
                    style={{ ...IN, fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={AYUDA}>
                    Cobrar la inicial es lo que formaliza el convenio. No hay ninguna otra ruta para ponerlo en vigor:
                    la habría si se pudiera formalizar sin recibo.
                  </span>
                </label>
              )}
              <label style={CAMPO}>
                <span style={ETIQUETA}>Fecha de pago</span>
                <input type="date" value={fechaDePago} onChange={(e) => setFechaDePago(e.target.value)} style={IN} />
                <span style={AYUDA}>Sin ella, hoy. Es la fecha a la que se relee la deuda que se cobra.</span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Beneficio declarado</span>
                <input value={beneficio} onChange={(e) => setBeneficio(e.target.value)} placeholder="Ordenanza que lo ampara" style={IN} />
                <span style={AYUDA}>
                  Se guarda en el recibo como constancia y <strong style={{ fontWeight: 600 }}>no descuenta nada</strong>:
                  su efecto está bloqueado por D-02b. Por eso aquí no se dibuja ninguna línea de descuento.
                </span>
              </label>
              <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
                <span style={ETIQUETA}>Observación</span>
                <textarea
                  value={obsCobro}
                  onChange={(e) => setObsCobro(e.target.value)}
                  rows={2}
                  placeholder="Por qué se cobra. Sin ella el backend no guarda (regla 10, RNF-052)."
                  style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                />
              </label>
            </div>
          </section>

          {falloDeCobro && fallo(falloDeCobro, 'la cobranza', 'POST /api/v1/tesoreria/caja/cobranza')}
          {emitido && comprobante(emitido)}
        </>
      )}
    </div>
  );

  /** La barra de cobro. **No lleva total**: la caja no publica cuánto va a
   *  cobrar hasta que cobra, y sumar aquí las filas marcadas daría una cifra que
   *  puede no ser la que acabe impresa —el libro se relee a la fecha de pago—. */
  const barra = () => (
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
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '12px 20px' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>Marcadas</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
            {seleccion.length} de {obligaciones.length}
          </span>
        </span>
        <span data-sm-hide="1" style={{ flex: 1, minWidth: 200, fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
          {impedimentoDelCobro !== ''
            ? impedimentoDelCobro
            : 'El importe lo resuelve la caja releyendo el libro a la fecha de pago: sale en el recibo, no antes.'}
        </span>
        <button
          onClick={() => void cobrar()}
          disabled={impedimentoDelCobro !== '' || cobrando}
          aria-disabled={impedimentoDelCobro !== '' || cobrando}
          title={impedimentoDelCobro}
          style={{ ...BOTON_PRIMARIO(impedimentoDelCobro === '' && !cobrando), padding: '13px 26px', fontSize: 14.5 }}
        >
          {cobrando ? 'Cobrando…' : 'Cobrar y emitir recibo'}
        </button>
      </div>
    </div>
  );

  /* ══════════ CONVENIOS ══════════ */

  const COLS_CRONOGRAMA: readonly ColDef[] = [
    ['Nº', 0],
    ['Vencimiento', 0],
    ['Cuota S/', 1],
    ['Capital S/', 1],
    ['Interés S/', 1],
    ['Gasto S/', 1],
  ];
  const COLS_CONVENIOS: readonly ColDef[] = [
    ['Nº convenio', 0],
    ['Cód. contribuyente', 0],
    ['Fecha', 0],
    ['Deuda acogida S/', 1],
    ['Cuotas', 1],
    ['Pagadas', 1],
    ['Vencidas', 1],
    ['Saldo S/', 1],
    ['Estado', 0],
  ];

  /* La coletilla que los tres avisos comparten, y que es lo que los hace
     honestos: el número que nombran es una creencia de ESTE navegador, no un
     dato del servidor. Se dice una vez y se reutiliza para que no se pueda
     reescribir en un sitio y quedarse vieja en los otros dos. */
  const laCreencia = (
    <span style={{ color: 'var(--ink-4)' }}>
      El ejercicio sale del día en que se registre el convenio, y lo resuelve el servidor con su propio reloj: aquí se
      ha preguntado por {ejercicioDelActo} porque es el año de este navegador. Si el acto acaba con otra fecha, manda
      ésa.
    </span>
  );

  /**
   * Lo que se sabe del conjunto sellado antes de teclear nada (#605, AC 3 y AC 4).
   *
   * **Dice la primera mitad y no la segunda**, que es la instrucción entera de
   * la lectura: contesta si HAY conjunto sellado, no si el cálculo va a salir.
   * Medido contra este ambiente el mismo día: el ejercicio 2026 contesta
   * `sellado: true` y la simulación de un fraccionamiento contesta igualmente
   * 422 —«El conjunto sellado del ejercicio 2026 no tiene el parametro
   * CUOTAS_MAXIMAS_FRACCIONAMIENTO:ORDINARIO»—. Un aviso que dijera «ya se puede
   * fraccionar» sería falso hoy, en este ambiente, con este dato.
   *
   * **No apaga ningún botón.** El impedimento apaga lo que esta pantalla SABE
   * —falta el contribuyente, no hay deuda marcada, las cuotas no son un entero—,
   * y esto no lo sabe: el ejercicio que pregunta es el que este navegador cree
   * que es hoy (ver `ejercicioDelActo`), y una creencia del cliente no puede
   * vetar un acto que el servidor aceptaría. Si el aviso se equivoca, lo que
   * pasa es lo de siempre —el 422 del final, que nombra el ejercicio bueno—; si
   * apagara el botón, no pasaría nada y nadie sabría por qué.
   *
   * Que la comprobación falle tampoco se calla: callarlo se lee como que todo
   * está en orden, que es justo lo que no se puede afirmar.
   */
  const avisoDelConjunto = () => {
    const e = conjuntoDelEjercicio;
    if (e.cargando) return null;
    if (e.error !== null || e.datos === null)
      return (
        <Aviso tono="neutro" titulo={`No se pudo comprobar si el ejercicio ${ejercicioDelActo} está parametrizado`}>
          {e.error ? tituloDelFallo(e.error, 'esa comprobación') + '. ' : ''}
          Esta pantalla no dice ni que sí ni que no:{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            GET /seguridad/parametros/ejercicios/{ejercicioDelActo}
          </code>{' '}
          no dejó saberlo —ni contestando, ni contestando otra cosa—. Se puede simular igual, y lo dirá el 422 del
          final, como antes de #605.
        </Aviso>
      );
    if (!e.datos.sellado)
      return (
        <Aviso tono="warn" titulo={`El ejercicio ${ejercicioDelActo} no tiene conjunto de parámetros sellado`}>
          El interés de fraccionamiento, el máximo de cuotas y la política con la que se redondea cada cuota salen de
          ese conjunto (regla 5), así que simular y registrar van a contestar 422 mientras siga sin sellarse. No se
          sella desde aquí: se publica y se sella en Seguridad · Parámetros, y las cifras que faltan son de ordenanza
          local (D-02a, D-02b). {laCreencia}
        </Aviso>
      );
    return (
      <Aviso tono="neutro" titulo={`El ejercicio ${ejercicioDelActo} tiene conjunto sellado nº ${e.datos.conjuntoId} v${e.datos.version}`}>
        Es el juego de valores con el que se va a calcular este convenio, y el que quedará escrito en él.{' '}
        <strong style={{ fontWeight: 600 }}>Eso es todo lo que dice.</strong> No dice que el cálculo vaya a salir: al
        conjunto puede faltarle dentro alguna de las llaves que un convenio pide —
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>INTERES_FRACCIONAMIENTO:ORDINARIO</code>,{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>CUOTAS_MAXIMAS_FRACCIONAMIENTO:ORDINARIO</code>,{' '}
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>REDONDEO:CUOTA</code>— y eso sigue saliendo
        como 422 al simular, nombrando la llave. {laCreencia}
      </Aviso>
    );
  };

  const conveniosPantalla = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={ENTRADILLA}>
        Fraccionar es simular antes de firmar. El cronograma lo calcula el backend con el interés y el máximo de cuotas
        del conjunto sellado, y lo que sale de aquí es un preconvenio: no acoge deuda hasta que su cuota inicial se
        cobra en caja.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['fraccionar', 'Fraccionar deuda'],
            ['seguimiento', 'Convenios suscritos'],
          ] as const
        ).map((h) => (
          <button key={h[0]} onClick={() => setHojaConv(h[0])} aria-pressed={hojaConv === h[0]} className="hov-linea" style={PILDORA(hojaConv === h[0])}>
            {h[1]}
          </button>
        ))}
      </div>

      {hojaConv === 'fraccionar' && (
        <>
          {/* Delante del buscador, y no junto al botón: lo que #605 arregla es
              que esto se sepa ANTES de teclear el contribuyente, marcar la deuda
              y redactar la observación, no después de enviarlo todo. */}
          {avisoDelConjunto()}
          {buscadorDeContribuyente('cuya deuda se va a fraccionar')}
          {tablaDeDeuda(marcadasFrac, setMarcadasFrac, 'Deuda que se puede acoger')}

          <section style={TARJETA}>
            <div style={CABECERA}>
              <h2 style={H2}>Condiciones del convenio</h2>
              <span style={META}>POST /tesoreria/fraccionamientos</span>
            </div>
            <div style={REJILLA(192)}>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Nº de cuotas</span>
                <input value={nCuotas} onChange={(e) => setNCuotas(e.target.value)} inputMode="numeric" style={IN} />
                <span style={AYUDA}>Sin contar la inicial. El máximo lo pone el conjunto sellado, no esta pantalla.</span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Cuota inicial (%)</span>
                <input value={pctInicial} onChange={(e) => setPctInicial(e.target.value)} inputMode="decimal" style={IN} />
                <span style={AYUDA}>
                  Es un <strong style={{ fontWeight: 600 }}>porcentaje</strong> de 0 a 100, no un importe en soles. El 0 %
                  se admite: la ordenanza puede pactar un convenio sin entrada.
                </span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Tipo</span>
                <select value={tipoConvenio} onChange={(e) => setTipoConvenio(e.target.value)} style={IN}>
                  {TIPOS_DE_CONVENIO.map((t) => (
                    <option key={t[0]} value={t[0]}>
                      {t[1]}
                    </option>
                  ))}
                </select>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Primera cuota vence</span>
                <input type="date" value={primeraCuota} onChange={(e) => setPrimeraCuota(e.target.value)} style={IN} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Tipo de garantía</span>
                <select value={garantia} onChange={(e) => setGarantia(e.target.value)} style={IN}>
                  {TIPOS_DE_GARANTIA.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <span style={AYUDA}>Solo constancia mientras D-02b siga abierta.</span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Detalle del ofrecimiento</span>
                <input value={detalleGarantia} onChange={(e) => setDetalleGarantia(e.target.value)} style={IN} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Resolución que lo aprueba</span>
                <input value={resolucion} onChange={(e) => setResolucion(e.target.value)} style={IN} />
              </label>
              <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
                <span style={ETIQUETA}>Observación</span>
                <textarea
                  value={obsConvenio}
                  onChange={(e) => setObsConvenio(e.target.value)}
                  rows={2}
                  placeholder="Solo hace falta para registrar. La simulación no escribe nada, y por eso no la pide."
                  style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                />
              </label>
            </div>
            <p style={NOTA_PIE}>
              «Monto de cuota» e «Interés de fraccionamiento», que el manual dibuja como campos, son{' '}
              <strong style={{ fontWeight: 600 }}>de salida</strong>: los devuelve la simulación. No entran en la
              petición, y por eso el cliente no puede decidir a qué precio se fracciona.
            </p>
          </section>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              {impedimentoDelConvenio !== ''
                ? impedimentoDelConvenio
                : 'Simular no escribe nada: ni numera un convenio, ni toca el libro, ni deja auditoría.'}
            </p>
            <button
              onClick={() => void simular()}
              disabled={impedimentoDelConvenio !== '' || trabajandoConv}
              aria-disabled={impedimentoDelConvenio !== '' || trabajandoConv}
              title={impedimentoDelConvenio}
              className="hov-linea"
              style={{ ...BOTON_LINEA, opacity: impedimentoDelConvenio === '' ? 1 : 0.55 }}
            >
              {trabajandoConv ? 'Calculando…' : 'Simular cronograma'}
            </button>
            <button
              onClick={() => void registrar()}
              disabled={impedimentoDelConvenio !== '' || obsConvenio.trim() === '' || trabajandoConv}
              aria-disabled={impedimentoDelConvenio !== '' || obsConvenio.trim() === '' || trabajandoConv}
              title={impedimentoDelConvenio || (obsConvenio.trim() === '' ? 'Falta la observación (regla 10).' : '')}
              style={BOTON_PRIMARIO(impedimentoDelConvenio === '' && obsConvenio.trim() !== '' && !trabajandoConv)}
            >
              Registrar preconvenio
            </button>
          </div>

          {falloConv &&
            fallo(
              falloConv,
              'el fraccionamiento',
              'POST /api/v1/tesoreria/fraccionamientos',
              /* Sólo se ofrece repetir lo que NO escribe. Un 500 al registrar
                 pudo haber escrito el convenio antes de romperse, y la ruta no
                 lee `Idempotency-Key` —a diferencia de la cobranza—: el botón
                 ahí produciría dos preconvenios sobre la misma deuda (#606). */
              actoConv === 'simular' ? () => void simular() : undefined,
            )}

          {simulacion && (
            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Cronograma simulado</h2>
                <span style={META}>
                  {simulacion.nroDeCuotas} cuotas · deuda al {dia(simulacion.aLaFecha)}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead>
                    <tr>{cabeceras(COLS_CRONOGRAMA)}</tr>
                  </thead>
                  <tbody>
                    {simulacion.cuotas.map((c) => (
                      <tr key={c.nro} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {[String(c.nro).padStart(3, '0'), dia(c.vencimiento), c.cuota, c.capital, c.interes, c.gasto].map((v, j) => (
                          <td key={j} style={estiloDeCelda(j, COLS_CRONOGRAMA)}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
                {(
                  [
                    ['Deuda acogida', moneda(simulacion.montoTotal), false],
                    ['Cuota inicial', moneda(simulacion.cuotaInicial), false],
                    ['Interés mensual', simulacion.interesDeFraccionamientoMensual + ' %', false],
                    ['Total del cronograma', moneda(simulacion.totalDelCronograma), true],
                  ] as const
                ).map((t) => (
                  <div key={t[0]} style={TOTAL_CELDA(t[2])}>
                    <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{t[1]}</p>
                  </div>
                ))}
              </div>
              <p style={NOTA_PIE}>
                Las cuatro cifras son las que devolvió el backend. La simulación no lleva número de convenio a
                propósito: no consume correlativo, así que no se puede imprimir un papel con un número que no existe.
              </p>
            </section>
          )}

          {convenioNuevo && (
            <section style={{ ...TARJETA, borderLeft: '3px solid var(--ok-fg)' }}>
              <div style={CABECERA}>
                <h2 style={H2}>Preconvenio {convenioNuevo.numero}</h2>
                <Insignia tono={tono(convenioNuevo.estado)}>{convenioNuevo.estado}</Insignia>
              </div>
              <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                Registrado por {moneda(convenioNuevo.montoTotal)} en {convenioNuevo.nroDeCuotas} cuotas, con el conjunto
                de parámetros {convenioNuevo.conjuntoDeParametros}. Todavía{' '}
                <strong style={{ fontWeight: 600 }}>no acoge deuda</strong>: se pone en vigor cobrando su cuota inicial
                de {moneda(convenioNuevo.cuotaInicial)} en la caja, con tipo de cobranza «cuota inicial de un convenio».
              </p>
            </section>
          )}
        </>
      )}

      {hojaConv === 'seguimiento' && (
        <>
          <section style={TARJETA}>
            <div style={REJILLA(180)}>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Nº de convenio</span>
                <input value={fNumero} onChange={(e) => setFNumero(e.target.value.toUpperCase())} placeholder="F-2026-000123" style={{ ...IN, fontFamily: 'var(--font-mono)' }} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Cód. contribuyente</span>
                <input value={fContribuyente} onChange={(e) => setFContribuyente(e.target.value.toUpperCase())} placeholder="C-000001" style={{ ...IN, fontFamily: 'var(--font-mono)' }} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Estado</span>
                <select value={fEstado} onChange={(e) => setFEstado(e.target.value as '' | EstadoDeConvenio)} style={IN}>
                  <option value="">Todos</option>
                  {ESTADOS_DE_CONVENIO.map((e) => (
                    <option key={e[0]} value={e[0]}>
                      {e[1]}
                    </option>
                  ))}
                </select>
                <span style={AYUDA}>
                  «Cumplido» y «En riesgo» no están: no son estados del convenio sino situaciones de sus cuotas, y el
                  backend las rechaza en vez de traducirlas a algo parecido.
                </span>
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Desde</span>
                <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} style={IN} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Hasta</span>
                <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} style={IN} />
              </label>
            </div>
          </section>

          <section style={TARJETA}>
            <div style={CABECERA}>
              <h2 style={H2}>Convenios suscritos</h2>
              <span style={META}>
                {convenios.datos ? `${convenios.datos.totalElementos} en total` : 'GET /tesoreria/convenios'}
              </span>
            </div>
            {convenios.cargando && <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Buscando…</p>}
            {!convenios.cargando && convenios.error && (
              <div style={{ padding: '22px 16px' }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
                  {tituloDelFallo(convenios.error, 'los convenios')}. {explicacionDelFallo(convenios.error)}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {queSePuedeHacer(convenios.error)}
                </p>
                {/* Una lectura sí se puede repetir tal cual: no escribe nada. */}
                {convenios.error.reintentable && (
                  <button onClick={() => convenios.reintentar()} className="hov-linea" style={{ ...BOTON_LINEA, marginTop: 10 }}>
                    Reintentar
                  </button>
                )}
              </div>
            )}
            {!convenios.cargando && !convenios.error && (convenios.datos?.contenido ?? []).length === 0 && (
              <p style={{ margin: 0, padding: '24px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Ningún convenio con esos criterios. Los cuatro que el prototipo dibujaba eran del artboard y se han
                quitado: una lista de muestra al lado de un filtro que sí consulta se lee como el padrón de verdad.
              </p>
            )}
            {(convenios.datos?.contenido ?? []).length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                  <thead>
                    <tr>{cabeceras(COLS_CONVENIOS)}</tr>
                  </thead>
                  <tbody>
                    {(convenios.datos?.contenido ?? []).map((c) => {
                      const celdas = [
                        c.nroConvenio,
                        c.contribuyente,
                        dia(c.fecha),
                        c.deudaAcogidaS,
                        String(c.cuotas),
                        String(c.pagadas),
                        String(c.vencidas),
                        c.saldoS,
                        c.estado,
                      ];
                      return (
                        <tr
                          key={c.nroConvenio}
                          {...filaPulsable(`Abrir el convenio ${c.nroConvenio}`, () => {
                            setAbierto(c.nroConvenio);
                            setFalloCierre(null);
                          })}
                          className="hov-acento"
                          style={{
                            borderTop: '1px solid var(--line)',
                            cursor: 'pointer',
                            background: abierto === c.nroConvenio ? 'var(--accent-soft)' : 'transparent',
                          }}
                        >
                          {celdas.map((v, j) =>
                            j === 8 ? (
                              <td key={j} style={{ padding: '11px 14px' }}>
                                <Insignia tono={tono(v)}>{v}</Insignia>
                              </td>
                            ) : (
                              <td key={j} style={estiloDeCelda(j, COLS_CONVENIOS)}>
                                {v}
                              </td>
                            ),
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {convenios.datos !== null && (
              <Paginador
                pagina={convenios.datos.pagina}
                totalPaginas={convenios.datos.totalPaginas}
                hayMas={convenios.datos.hayMas}
                ir={setPaginaConv}
              />
            )}
            <p style={NOTA_PIE}>
              El saldo va referido a la fecha de la consulta y la deuda acogida a la del convenio: son dos fechas
              distintas y las dos viajan, porque bajo una sola un convenio de marzo parecería calculado hoy.
            </p>
          </section>

          {abierto !== null && (
            <section style={TARJETA}>
              <div style={CABECERA}>
                <h2 style={H2}>Convenio {abierto}</h2>
                <button onClick={() => { setAbierto(null); setFalloCierre(null); }} className="hov-linea" style={{ ...BOTON_LINEA, padding: '6px 12px', fontSize: 12 }}>
                  Cerrar
                </button>
              </div>
              {fichaConvenio.cargando && <p style={{ margin: 0, padding: '18px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Leyendo el detalle…</p>}
              {detalle && (
                <>
                  <div style={{ overflowX: 'auto', borderBottom: '1px solid var(--line)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                      <thead>
                        <tr>{cabeceras(COLS_CRONOGRAMA)}</tr>
                      </thead>
                      <tbody>
                        {(detalle.cronograma ?? []).map((c) => (
                          <tr key={c.nro} style={{ borderTop: '1px solid var(--line)' }}>
                            {[String(c.nro).padStart(3, '0'), dia(c.vencimiento), c.cuota, c.capital, c.interes, c.gasto].map((v, j) => (
                              <td key={j} style={estiloDeCelda(j, COLS_CRONOGRAMA)}>
                                {v}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(detalle.movimientos ?? []).length > 0 && (
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                      {(detalle.movimientos ?? []).map((mv, i) => (
                        <p key={i} style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                          <strong style={{ fontWeight: 600 }}>{mv.tipo}</strong> · {dia(mv.fecha)} · {moneda(mv.importe)} ·{' '}
                          {mv.asientos} asientos{mv.motivo ? ' · ' + mv.motivo : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  <div style={REJILLA(192)}>
                    <label style={CAMPO}>
                      <span style={ETIQUETA}>Acción</span>
                      <select value={accion} onChange={(e) => setAccion(e.target.value as AccionDeCierre)} style={IN}>
                        <option value="ANULACION">Anular — no debió existir</option>
                        <option value="QUIEBRE">Quebrar — se incumplió</option>
                      </select>
                      <span style={AYUDA}>
                        Las dos devuelven lo pendiente a la fase de la que salió. «Reformular» también existe y no se
                        ofrece aquí: exige el convenio nuevo que sustituye al viejo, y el manual no dibuja ese
                        formulario en esta pantalla — se registra desde «Fraccionar deuda».
                      </span>
                    </label>
                    <label style={CAMPO}>
                      <span style={ETIQUETA}>Motivo</span>
                      <input value={motivoCierre} onChange={(e) => setMotivoCierre(e.target.value)} style={IN} />
                    </label>
                    <label style={CAMPO}>
                      <span style={ETIQUETA}>Responsable</span>
                      <input value={responsableCierre} onChange={(e) => setResponsableCierre(e.target.value)} style={IN} />
                    </label>
                    <label style={CAMPO}>
                      <span style={ETIQUETA}>Nº de memorando</span>
                      <input value={memoCierre} onChange={(e) => setMemoCierre(e.target.value)} style={IN} />
                    </label>
                    <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
                      <span style={ETIQUETA}>Observación</span>
                      <textarea
                        value={obsCierreConvenio}
                        onChange={(e) => setObsCierreConvenio(e.target.value)}
                        rows={2}
                        style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                      />
                    </label>
                  </div>
                  {falloCierre && (
                    <div style={{ padding: '0 16px 12px' }}>
                      {/* Sin `alReintentar`: cerrar un convenio ESCRIBE —devuelve
                          lo pendiente a su fase de origen con asientos— y la ruta
                          no lee `Idempotency-Key` (#606). Dos cierres no llegan a
                          escribirse —`convenio_movimiento_cierre_uq` (V31) sólo
                          admite uno—, pero un botón que reenvía tras un 500 que
                          sí escribió contesta 409 y se lee como otro fallo. Lo
                          que hay que hacer es mirar el estado, no reintentar. */}
                      {fallo(falloCierre, 'el cierre del convenio', 'POST /api/v1/tesoreria/convenios/{numero}/anulacion')}
                      {falloCierre.reintentable && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                          Un fallo del servidor pudo haber cerrado el convenio antes de romperse. El detalle de arriba
                          se acaba de releer: mira su estado antes de repetir. Si ya dice cerrado, está hecho —volver a
                          pulsar no lo cierra dos veces, porque la base sólo admite un cierre por convenio, pero
                          contestaría un conflicto que se parece a un fallo nuevo—.
                        </p>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '0 16px 16px' }}>
                    <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Es un acto con resolución, no una corrección de caja: exige el privilegio de eliminación y no se
                      deshace.
                    </p>
                    <button
                      onClick={() => void cerrarElConvenio()}
                      disabled={motivoCierre.trim() === '' || obsCierreConvenio.trim() === '' || cerrandoConv}
                      aria-disabled={motivoCierre.trim() === '' || obsCierreConvenio.trim() === '' || cerrandoConv}
                      title={motivoCierre.trim() === '' ? 'Falta el motivo del acto.' : obsCierreConvenio.trim() === '' ? 'Falta la observación (regla 10).' : ''}
                      style={{
                        ...BOTON_PRIMARIO(motivoCierre.trim() !== '' && obsCierreConvenio.trim() !== '' && !cerrandoConv),
                        background: 'var(--error-texto)',
                      }}
                    >
                      {accion === 'ANULACION' ? 'Anular el convenio' : 'Quebrar el convenio'}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );

  /* ══════════ RECIBOS ══════════ */

  const COLS_LINEAS: readonly ColDef[] = [
    ['Tributo', 0],
    ['Concepto', 0],
    ['Año', 0],
    ['Unidad', 0],
    ['Insoluto', 1],
    ['Reajuste', 1],
    ['Interés', 1],
    ['Gastos', 1],
    ['Importe', 1],
  ];

  /**
   * Las ocho columnas de «Recibos localizados» (#548).
   *
   * Son las del prototipo menos «Caja», que esta fila no trae —es un filtro de la
   * búsqueda, no una columna—, y con una más: la **fecha del importe**, porque
   * toda cifra dice a qué fecha está y la de cada recibo es la que congeló al
   * emitirse, no la de hoy (regla 9, RNF-075). «Concepto» se queda y va en raya:
   * ver más abajo por qué.
   */
  const COLS_RECIBOS: readonly ColDef[] = [
    ['Nº recibo', 0],
    ['Emitido', 0],
    ['Contribuyente', 0],
    ['Concepto', 0],
    ['Importe S/', 1],
    ['Importe al', 0],
    ['Duplicados', 1],
    ['Estado', 0],
  ];

  const recibosPantalla = () => {
    const d = recibo.datos;
    const anulado = d?.estado === 'ANULADO';
    const filasRec: FilaDeRecibo[] = recibos.datos?.contenido ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={ENTRADILLA}>
          Dos actos sobre el mismo objeto: reimprimir un recibo o dejarlo sin efecto. Se busca en el listado, o por el
          número impreso en el papel que el contribuyente trae a la ventanilla.
        </p>

        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>Buscar recibos</h2>
            <span style={META}>GET /tesoreria/recibos</span>
          </div>
          <div style={REJILLA(180)}>
            <label style={CAMPO}>
              <span style={ETIQUETA}>Cód. contribuyente</span>
              <input
                value={fRecContribuyente}
                onChange={(e) => setFRecContribuyente(e.target.value.toUpperCase())}
                placeholder="C-000001"
                style={{ ...IN, fontFamily: 'var(--font-mono)' }}
              />
              <span style={AYUDA}>
                El código exacto del padrón. El prototipo escribe aquí «Nombre o código» y el backend sólo compara el
                código: buscar por nombre es otra pantalla, y probar el nombre aquí devolvería cero recibos de alguien
                que sí los tiene.
              </span>
            </label>
            {campoDeCaja(fRecCaja, setFRecCaja, 'filtro')}
            <label style={CAMPO}>
              <span style={ETIQUETA}>Cajero</span>
              <input value={fRecCajero} onChange={(e) => setFRecCajero(e.target.value)} placeholder="jperez" style={IN} />
              <span style={AYUDA}>
                La cuenta con la que se cobró, exacta y respetando mayúsculas y minúsculas. La pantalla del manual no
                dibuja este filtro; lo publica el backend, y sin él no se puede reconstruir lo que emitió un turno.
              </span>
            </label>
            <label style={CAMPO}>
              <span style={ETIQUETA}>Desde</span>
              <input type="date" value={fRecDesde} onChange={(e) => setFRecDesde(e.target.value)} style={IN} />
            </label>
            <label style={CAMPO}>
              <span style={ETIQUETA}>Hasta</span>
              <input type="date" value={fRecHasta} onChange={(e) => setFRecHasta(e.target.value)} style={IN} />
              <span style={AYUDA}>
                El manual dibuja una «Fecha» sola y aquí hay un rango, que es lo que el backend admite: quien perdió el
                recibo se acuerda de la semana y no del día.
              </span>
            </label>
            <label style={CAMPO}>
              <span style={ETIQUETA}>Estado</span>
              <select
                value={fRecEstado}
                onChange={(e) => setFRecEstado(e.target.value as '' | EstadoDeRecibo)}
                style={IN}
              >
                <option value="">Todos</option>
                {ESTADOS_DE_RECIBO.map((e) => (
                  <option key={e[0]} value={e[0]}>
                    {e[1]}
                  </option>
                ))}
              </select>
              <span style={AYUDA}>
                Son los dos que el enumerado tiene, y se derivan: un recibo no guarda su estado porque no se actualiza.
                «Todos» no viaja —no es un valor, es no mandar el filtro—.
              </span>
            </label>
          </div>
          <p style={NOTA_PIE}>
            <strong style={{ fontWeight: 600 }}>No hay filtro por número de recibo, y no es un olvido:</strong> el
            número exacto ya tiene su propia ruta, y se teclea abajo. Este listado existe justamente para quien{' '}
            <strong style={{ fontWeight: 600 }}>no</strong> lo tiene — que es exactamente quien viene a pedir un
            duplicado.
          </p>
        </section>

        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>Recibos localizados</h2>
            <span style={META}>
              {/* «de N recibos» y no «de N» a secas: justo debajo el paginador
                  escribe «1 de 1», y dos rótulos iguales al lado se leen como el
                  mismo dato. */}
              {recibos.datos
                ? `${filasRec.length} de ${recibos.datos.totalElementos} recibos`
                : 'GET /tesoreria/recibos'}
            </span>
          </div>
          {recibos.cargando && (
            <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Buscando…</p>
          )}
          {!recibos.cargando && recibos.error && (
            <div style={{ padding: '22px 16px' }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--error-texto)', textWrap: 'pretty' }}>
                {tituloDelFallo(recibos.error, 'los recibos')}. {explicacionDelFallo(recibos.error)}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {queSePuedeHacer(recibos.error)}
              </p>
              {recibos.error.reintentable && (
                <button onClick={() => recibos.reintentar()} className="hov-linea" style={{ ...BOTON_LINEA, marginTop: 10 }}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {!recibos.cargando && !recibos.error && filasRec.length === 0 && (
            <p style={{ margin: 0, padding: '24px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              Ningún recibo con esos criterios. Los tres que el prototipo dibujaba eran del artboard: una lista de
              muestra al lado de un filtro que sí consulta se lee como los recibos de verdad de esta caja.
            </p>
          )}
          {filasRec.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
                <thead>
                  <tr>{cabeceras(COLS_RECIBOS)}</tr>
                </thead>
                <tbody>
                  {filasRec.map((r) => {
                    const celdas = [
                      r.numero,
                      instante(r.emitidoEn),
                      r.contribuyente ?? SIN_DATO,
                      /* «Concepto» del prototipo sale del DESGLOSE, y esta fila no
                         lo trae a propósito: una página de veinte no puede costar
                         veinte lecturas del detalle. Raya, y el pie dice por qué —
                         un blanco aquí se leería como un recibo sin conceptos. */
                      SIN_DATO,
                      r.importe.importe,
                      dia(r.importe.actualizadoA),
                      String(r.duplicados),
                      r.estado,
                    ];
                    return (
                      <tr
                        key={r.numero}
                        {...filaPulsable(`Abrir el recibo ${r.numero}, de ${r.contribuyente ?? 'contribuyente sin resolver'}`, () =>
                          setNumeroDeRecibo(r.numero),
                        )}
                        className="hov-acento"
                        style={{
                          borderTop: '1px solid var(--line)',
                          cursor: 'pointer',
                          background: numeroReposado === r.numero ? 'var(--accent-soft)' : 'transparent',
                        }}
                      >
                        {celdas.map((v, j) =>
                          j === 7 ? (
                            <td key={j} style={{ padding: '11px 14px' }}>
                              <Insignia tono={tono(v)}>{v}</Insignia>
                            </td>
                          ) : (
                            <td key={j} style={estiloDeCelda(j, COLS_RECIBOS)}>
                              {v}
                            </td>
                          ),
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {recibos.datos !== null && (
            <Paginador
              pagina={recibos.datos.pagina}
              totalPaginas={recibos.datos.totalPaginas}
              hayMas={recibos.datos.hayMas}
              ir={setPaginaRec}
            />
          )}
          <p style={NOTA_PIE}>
            La columna «Concepto» va en raya en todas las filas: sale del desglose del recibo y esta lectura no lo trae
            —una página de veinte filas no puede costar veinte lecturas del detalle—. Se ve entero al abrir el recibo,
            que es lo que hace un clic en la fila. «Caja» y «Cajero» tampoco son columnas: son filtros de arriba, y
            publicarlos aquí sería inventarle una columna a la pantalla. La hora de «Emitido» es la del instante que
            manda el backend, en UTC, y no en la del reloj de la caja: cinco horas menos en el papel que el
            contribuyente trae (#619). El orden va del más nuevo al más viejo: el recibo que alguien viene a reimprimir
            es casi siempre el de hoy.
          </p>
        </section>

        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>Abrir un recibo por su número</h2>
            <span style={META}>GET …/recibos/{'{nro}'}/duplicado</span>
          </div>
          <div style={REJILLA(200)}>
            <label style={CAMPO}>
              <span style={ETIQUETA}>Nº de recibo</span>
              <input
                value={numeroDeRecibo}
                onChange={(e) => setNumeroDeRecibo(e.target.value)}
                placeholder="001-0000123"
                style={{ ...IN, fontFamily: 'var(--font-mono)' }}
              />
              <span style={AYUDA}>Serie y correlativo, tal como están impresos. Es lo único que identifica el recibo.</span>
            </label>
          </div>
          <p style={NOTA_PIE}>
            Se rellena solo al elegir una fila de arriba. Lo que se abre es el recibo entero, con su desglose: es otra
            lectura, y por eso no está en la grilla.
          </p>
        </section>

        {numeroReposado === '' && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Teclea el número del recibo para verlo.</p>
        )}
        {recibo.cargando && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Buscando el recibo…</p>}
        {!recibo.cargando && recibo.error && fallo(recibo.error, 'el recibo', `GET /api/v1/tesoreria/recibos/${numeroReposado}/duplicado`)}

        {d && (
          <>
            <section style={TARJETA}>
              <div style={CABECERA}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Recibo {d.recibo.numero}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {instante(d.recibo.emitidoEn)} · cajero {d.recibo.cajero}
                  </p>
                </div>
                <Insignia tono={tono(d.estado)}>{d.estado}</Insignia>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {(
                  [
                    ['Importe', moneda(d.recibo.total.importe) + ' al ' + dia(d.recibo.total.actualizadoA)],
                    ['Medio de pago', rotuloDeForma(d.recibo.formaDePago)],
                    ['Tipo de cobranza', d.recibo.tipoDePago],
                    ['Serie y correlativo', d.recibo.serie + ' — ' + d.recibo.correlativo],
                    ['Duplicados emitidos', String(d.duplicados)],
                    ['Beneficio declarado', d.recibo.beneficioDeclarado ?? SIN_DATO],
                  ] as const
                ).map((c) => (
                  <div key={c[0]} style={TOTAL_CELDA(false)}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                      {c[0]}
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', textWrap: 'pretty' }}>{c[1]}</p>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                  <thead>
                    <tr>{cabeceras(COLS_LINEAS)}</tr>
                  </thead>
                  <tbody>
                    {d.recibo.lineas.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                        {[
                          l.tributo,
                          l.concepto,
                          l.ejercicio === null ? SIN_DATO : String(l.ejercicio),
                          unidadDe(l),
                          l.insoluto.importe,
                          l.reajuste.importe,
                          l.interes.importe,
                          l.gasto.importe,
                          l.monto.importe,
                        ].map((v, j) => (
                          <td key={j} style={estiloDeCelda(j, COLS_LINEAS)}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {d.anulacion && (
                <p style={{ ...NOTA_PIE, color: 'var(--error-texto)' }}>
                  Anulado el {dia(d.anulacion.fecha)} por {d.anulacion.usuario ?? 'usuario desconocido'} · {d.anulacion.motivo}
                </p>
              )}
            </section>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['duplicado', 'Reimprimir duplicado'],
                  ['anulacion', 'Anular el recibo'],
                ] as const
              ).map((a) => (
                <button key={a[0]} onClick={() => setActoRecibo(a[0])} aria-pressed={actoRecibo === a[0]} className="hov-linea" style={PILDORA(actoRecibo === a[0])}>
                  {a[1]}
                </button>
              ))}
            </div>

            {actoRecibo === 'duplicado' && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Duplicado</h2>
                  <span style={META}>GET …/duplicado?formato=PDF|XLS|RTF</span>
                </div>
                <p style={{ margin: 0, padding: '16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '80ch', textWrap: 'pretty' }}>
                  Lo de arriba <strong style={{ fontWeight: 600 }}>es</strong> el duplicado: es lo que devuelve la misma
                  ruta sin <code style={{ fontFamily: 'var(--font-mono)' }}>formato</code>, y mirarlo no escribe nada.
                  Sacarlo por la impresora sí: con{' '}
                  <code style={{ fontFamily: 'var(--font-mono)' }}>?formato=PDF</code> devuelve el documento, exige el
                  privilegio de impresión, pide observación y queda registrado con quien lo generó — el recibo lleva{' '}
                  {d.duplicados} reimpresión{d.duplicados === 1 ? '' : 'es'} hasta ahora.
                </p>
                <div style={{ padding: '0 16px' }}>
                  <label style={{ display: 'block' }}>
                    <span style={ETIQUETA}>Observación</span>
                    <textarea
                      value={obsDuplicado}
                      onChange={(e) => setObsDuplicado(e.target.value)}
                      rows={2}
                      placeholder="Por qué se reimprime. Queda registrado con quien lo generó."
                      style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                    />
                    <span style={AYUDA}>
                      El servidor la exige: sin ella responde 422, porque reimprimir es una escritura y la regla 10 no
                      tiene excepciones para las pequeñas.
                    </span>
                  </label>
                </div>
                <div style={{ padding: '12px 16px 16px' }}>
                  {/* Antes esto decía que la descarga «todavía no está» porque la
                      puerta de la interfaz sólo devolvía JSON. Ya no es cierto:
                      `descargar()` firma la petición y entrega el binario, y
                      desde #535 los tres formatos contestan 200. Lo que queda es
                      lo del acto: sin observación no se pide. */}
                  <Descargas
                    /* Reimprimir SUMA un duplicado, y ese contador se dibuja en
                       la ficha y en la columna «Duplicados» del listado: las dos
                       se vuelven a pedir, porque un contador que no sube después
                       de sacar el papel invita a sacarlo otra vez. */
                    traer={(f) =>
                      descargarDuplicadoDeRecibo(numeroReposado, f, obsDuplicado.trim()).then(() => {
                        recibo.reintentar();
                        recibos.reintentar();
                      })
                    }
                    que="el duplicado del recibo"
                    acceso="duplicado_recibo"
                    privilegio="impresion"
                    impedimento={
                      obsDuplicado.trim() === ''
                        ? 'Falta la observación: reimprimir queda registrado y sin ella el servidor responde 422 (regla 10)'
                        : undefined
                    }
                  />
                </div>
              </section>
            )}

            {actoRecibo === 'anulacion' && (
              <section style={TARJETA}>
                <div style={CABECERA}>
                  <h2 style={H2}>Anulación</h2>
                  <span style={META}>POST …/anulacion</span>
                </div>
                <p style={{ margin: 0, padding: '14px 16px 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: '80ch', textWrap: 'pretty' }}>
                  Anular reversa los abonos y devuelve la deuda al libro. Solo procede el mismo día del pago y con el
                  turno abierto; si el recibo lo cobró otro cajero hace falta además el privilegio especial, porque toca
                  el arqueo de su turno. La casilla «devuelve la deuda» del prototipo no está:{' '}
                  <strong style={{ fontWeight: 600 }}>no es una opción</strong>, la reversión va siempre.
                </p>
                <div style={REJILLA(192)}>
                  <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
                    <span style={ETIQUETA}>Motivo</span>
                    <input
                      value={motivoAnul}
                      onChange={(e) => setMotivoAnul(e.target.value)}
                      list="motivos-de-anulacion"
                      style={IN}
                    />
                    <datalist id="motivos-de-anulacion">
                      {MOTIVOS_DE_ANULACION.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <span style={AYUDA}>
                      Es el sustento del acto: queda en el recibo y se imprime en su duplicado, para que quien tenga el
                      papel sepa por qué dejó de valer.
                    </span>
                  </label>
                  <label style={CAMPO}>
                    <span style={ETIQUETA}>Autorizado por</span>
                    <input value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)} list="autorizantes" style={IN} />
                    <datalist id="autorizantes">
                      {AUTORIZANTES.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </label>
                  <label style={CAMPO}>
                    <span style={ETIQUETA}>Nº de memorando</span>
                    <input value={memoAnul} onChange={(e) => setMemoAnul(e.target.value)} style={IN} />
                  </label>
                  <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
                    <span style={ETIQUETA}>Observación</span>
                    <textarea
                      value={obsAnul}
                      onChange={(e) => setObsAnul(e.target.value)}
                      rows={2}
                      placeholder="Explica la operación a quien lea la bitácora. No es lo mismo que el motivo."
                      style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '0 16px 16px' }}>
                  <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {anulado ? 'Este recibo ya está anulado: el backend contestaría 409.' : 'Es irreversible: no se deshace, y el recibo sigue existiendo con su acta.'}
                  </p>
                  <button
                    onClick={() => void anular()}
                    disabled={anulado || motivoAnul.trim() === '' || obsAnul.trim() === '' || anulando}
                    aria-disabled={anulado || motivoAnul.trim() === '' || obsAnul.trim() === '' || anulando}
                    title={anulado ? 'Ya está anulado.' : motivoAnul.trim() === '' ? 'Falta el motivo.' : obsAnul.trim() === '' ? 'Falta la observación (regla 10).' : ''}
                    style={{
                      ...BOTON_PRIMARIO(!anulado && motivoAnul.trim() !== '' && obsAnul.trim() !== '' && !anulando),
                      background: 'var(--error-texto)',
                    }}
                  >
                    {anulando ? 'Anulando…' : 'Anular el recibo'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {acta && (
          <section style={{ ...TARJETA, borderLeft: '3px solid var(--error-texto)' }}>
            <div style={CABECERA}>
              <h2 style={H2}>Acta de anulación del recibo {acta.numero}</h2>
              <span style={META}>{dia(acta.fecha)}</span>
            </div>
            <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
              {moneda(acta.importe.importe)} dejan de estar cobrados —la cifra va a la fecha del recibo,{' '}
              {dia(acta.importe.actualizadoA)}, y no a la de hoy: lo que se devuelve es exactamente lo que se cobró—.{' '}
              {acta.asientosReversados} asientos reversados en el libro. Motivo: {acta.motivo}.
              {acta.autorizadoPor ? ' Autorizó ' + acta.autorizadoPor + '.' : ''}
            </p>
          </section>
        )}
      </div>
    );
  };

  /* ══════════ CIERRE DE CAJA ══════════ */

  const cierrePantalla = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={ENTRADILLA}>
        El arqueo es lo único del módulo que no admite «lo veo mañana». Se declara lo que hay por medio de pago y el
        backend lo compara con lo que asentó: si no cuadra, no firma el cierre.
      </p>

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>El turno que se cierra</h2>
          <span style={META}>POST /tesoreria/caja/cierre</span>
        </div>
        <div style={REJILLA(200)}>
          {campoDeCaja(caja, setCaja, 'turno')}
          <label style={CAMPO}>
            <span style={ETIQUETA}>Cajero</span>
            <input value={cajero} onChange={(e) => setCajero(e.target.value)} placeholder="jperez" style={IN} />
          </label>
          <label style={CAMPO}>
            <span style={ETIQUETA}>Día del turno</span>
            <input type="date" value={fechaDelTurno} onChange={(e) => setFechaDelTurno(e.target.value)} style={IN} />
            <span style={AYUDA}>
              Sin fecha, hoy. Admitirla explícita es lo que permite cerrar el turno de ayer que se quedó sin sistema.
            </span>
          </label>
        </div>
        <p style={NOTA_PIE}>
          El prototipo pide además «Turno» (mañana / tarde / continuo) y las dos horas.{' '}
          <strong style={{ fontWeight: 600 }}>«Turno» no existe como dato</strong>: la unicidad que V3 declara es por
          caja, cajero y día, así que un cajero tiene uno al día por ventanilla y publicar «CONTINUO» fijo sería
          inventar un campo que después alguien filtraría. Las horas sí constan, en ISO, dentro del acta.
        </p>
      </section>

      <section style={TARJETA}>
        <div style={CABECERA}>
          <h2 style={H2}>Arqueo por medio de pago</h2>
          <span style={META}>{arqueo ? `turno ${arqueo.turnoId} · ${dia(arqueo.fecha)}` : ''}</span>
        </div>

        {!turnoCompleto && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)' }}>
            Falta la caja o el cajero: el arqueo es de un turno concreto.
          </p>
        )}
        {turnoCompleto && turno.cargando && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)' }}>Leyendo lo que el sistema asentó…</p>
        )}
        {turnoCompleto && !turno.cargando && turno.error?.codigo === 'NO_ENCONTRADO' && (
          <p style={{ margin: 0, padding: '22px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            No hay turno de «{cajero}» en la caja «{caja}» el {dia(diaDelTurno)}. Sin turno no hay nada que arquear, y
            el backend lo dice con un 404 en vez de devolver un arqueo en ceros.
          </p>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...TH, whiteSpace: undefined }}>Medio de pago</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Cobrado</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Anulado</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Neto del sistema</th>
                <th style={{ ...THN, whiteSpace: undefined }}>Declarado en el cajón</th>
              </tr>
            </thead>
            <tbody>
              {FORMAS_DE_PAGO.map((f) => {
                const linea = (arqueo?.lineas ?? []).find((l) => l.formaDePago === f[0]);
                return (
                  <tr key={f[0]} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{f[1]}</td>
                    <td style={TDN}>{linea ? linea.cobrado.importe : SIN_DATO}</td>
                    <td style={TDN}>{linea ? linea.anulado.importe : SIN_DATO}</td>
                    <td style={TDN}>{linea ? linea.neto.importe : SIN_DATO}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                      <input
                        value={declarado[f[0]] ?? ''}
                        onChange={(e) => setDeclarado((x) => ({ ...x, [f[0]]: e.target.value }))}
                        placeholder="0.00"
                        inputMode="decimal"
                        aria-label={`Declarado en ${f[1]}`}
                        style={{ ...IN, width: 130, textAlign: 'right', fontFamily: 'var(--font-mono)', background: 'var(--bg-card)' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={NOTA_PIE}>
          Aquí no se dibuja ninguna columna de diferencia, y no es un olvido:{' '}
          <strong style={{ fontWeight: 600 }}>la interfaz no resta nada</strong>. El arqueo lo calcula el backend al
          cerrar —de sus líneas salen el neto y la diferencia— y se niega a firmar si lo recaudado en deuda tributaria
          no coincide con lo que el libro asentó. Una cifra recompuesta en el cliente es una cifra que puede discrepar
          de la que se archivó. Las cinco filas son las cinco formas de pago del recibo, no las cuatro casillas del
          prototipo: declarar por las casillas dejaría un turno con un cheque descuadrado sin que el cajero pudiera
          decir nada.
        </p>
      </section>

      <section style={TARJETA}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '13px 16px' }}>
          {(
            [
              ['cerrar', 'Cerrar el turno'],
              ['reversar', 'Reversar el cierre'],
            ] as const
          ).map((m) => (
            <button key={m[0]} onClick={() => setModoCierre(m[0])} aria-pressed={modoCierre === m[0]} className="hov-linea" style={PILDORA(modoCierre === m[0])}>
              {m[1]}
            </button>
          ))}
        </div>
        <div style={REJILLA(192)}>
          {modoCierre === 'reversar' && (
            <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
              <span style={ETIQUETA}>Motivo de la reversión</span>
              <input
                value={motivoDeReversion}
                onChange={(e) => setMotivoDeReversion(e.target.value)}
                placeholder="Por qué se deja sin efecto el cierre"
                style={IN}
              />
              <span style={AYUDA}>
                Es la misma ruta y lo que decide cuál de los dos actos es: con motivo reversa, sin él cierra. Reversar
                no borra el cierre anterior —sigue donde estaba, con su arqueo—: escribe otra acta que lo deja sin
                efecto, y exige además el privilegio de eliminación.
              </span>
            </label>
          )}
          <label style={{ ...CAMPO, gridColumn: '1 / -1' }}>
            <span style={ETIQUETA}>Observación</span>
            <textarea
              value={obsCierre}
              onChange={(e) => setObsCierre(e.target.value)}
              rows={2}
              placeholder="Por qué se cierra o se reversa (regla 10, RNF-052)."
              style={{ ...IN, fontFamily: 'var(--font-sans)', resize: 'vertical' }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '0 16px 16px' }}>
          <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {impedimentoDelCierre !== ''
              ? impedimentoDelCierre
              : 'Al cerrar, la caja deja de aceptar cobros y anulaciones del turno.'}
          </p>
          <button
            onClick={() => void cerrarLaCaja()}
            disabled={impedimentoDelCierre !== '' || cerrando}
            aria-disabled={impedimentoDelCierre !== '' || cerrando}
            title={impedimentoDelCierre}
            style={BOTON_PRIMARIO(impedimentoDelCierre === '' && !cerrando)}
          >
            {cerrando ? 'Firmando…' : modoCierre === 'cerrar' ? 'Cerrar la caja' : 'Reversar el cierre'}
          </button>
        </div>
      </section>

      {actaDeCierre && (
        <section style={{ ...TARJETA, borderLeft: '3px solid var(--ok-fg)' }}>
          <div style={CABECERA}>
            <h2 style={H2}>
              Acta de {actaDeCierre.tipo.toLowerCase()} nº {actaDeCierre.id}
            </h2>
            <Insignia tono={actaDeCierre.estadoDelTurno === 'CERRADO' ? 'ok' : 'warn'}>
              Turno {actaDeCierre.estadoDelTurno}
            </Insignia>
          </div>
          <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
            Caja {actaDeCierre.caja} · cajero {actaDeCierre.cajero} · {dia(actaDeCierre.fecha)} ·{' '}
            {instante(actaDeCierre.registradoEn)}.
            {actaDeCierre.arqueo
              ? ` Declarado ${moneda(actaDeCierre.arqueo.declarado.importe)} contra un neto de ${moneda(actaDeCierre.arqueo.neto.importe)}; diferencia ${moneda(actaDeCierre.arqueo.diferencia.importe)}.`
              : ''}
            {actaDeCierre.recaudadoConAsiento
              ? ` El libro confirmó ${moneda(actaDeCierre.recaudadoConAsiento.importe)}, y ${moneda(actaDeCierre.recaudadoSinAsiento?.importe)} se cobraron sin tocarlo —tasas y cuotas iniciales—.`
              : ''}
            {actaDeCierre.motivo ? ` Motivo: ${actaDeCierre.motivo}.` : ''}
          </p>
        </section>
      )}
    </div>
  );

  /* ══════════ RECAUDACIÓN ══════════ */

  const COLS_AVANCE: readonly ColDef[] = [
    ['Tributo', 0],
    ['Cobrado S/', 1],
    ['Anulado S/', 1],
    ['Neto S/', 1],
  ];
  const COLS_AREA: readonly ColDef[] = [
    ['Partida', 0],
    ['Área generadora', 0],
    ['Tributo o tasa', 0],
    ['Cobrado S/', 1],
    ['Anulado S/', 1],
    ['Neto S/', 1],
  ];

  const recaudacionPantalla = () => {
    const esAvance = recTab === 0;
    const lectura = esAvance ? avance : porArea;
    /* Los dos desplegables se llenan de lo que la propia lectura devolvió: no hay
       catálogo de tributos ni de áreas en el contrato, y ofrecer los rótulos del
       prototipo —«LIMPIEZA PÚBLICA», «SERENAZGO»— sería ofrecer criterios que el
       libro no reconoce, porque ahí los tributos se llaman PREDIAL y ARBITRIOS. */
    const tributos = [...new Set((avance.datos?.filas ?? []).map((f) => f.tributo))];
    const areas = [
      ...new Map(
        (porArea.datos?.filas ?? [])
          .filter((f) => f.area !== null)
          .map((f) => [f.area as string, f.areaNombre ?? (f.area as string)]),
      ),
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={ENTRADILLA}>
          Dos lecturas del mismo dinero: por tributo, para saber qué se cobra; y por área generadora, para el reporte a
          la gerencia de administración. Las dos suman recibos, no cargos.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
          {['Avance por tributo', 'Por área generadora'].map((l, i) => (
            <button
              key={l}
              onClick={() => setRecTab(i)}
              aria-pressed={recTab === i}
              style={{
                border: 0,
                borderBottom: `2px solid ${recTab === i ? 'var(--accent)' : 'transparent'}`,
                background: 'transparent',
                padding: '11px 3px',
                marginBottom: -1,
                cursor: 'pointer',
                fontSize: 13.5,
                color: recTab === i ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: recTab === i ? 600 : 400,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <section style={TARJETA}>
          <button
            onClick={() => setFiltrosAbiertos((v) => !v)}
            aria-expanded={filtrosAbiertos}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', padding: '12px 16px', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'grid', placeItems: 'center', width: 16, height: 16, color: 'var(--ink-4)', transform: `rotate(${filtrosAbiertos ? 0 : -90}deg)`, transition: 'transform .15s ease' }}>
              <Icono d={CARET} tam={12} grosor={2} />
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>El periodo que se suma</span>
            <span style={{ marginLeft: 'auto', ...META }}>
              {lectura.datos ? `${dia(lectura.datos.desde)} – ${dia(lectura.datos.hasta)}` : ''}
            </span>
          </button>
          {filtrosAbiertos && (
            <div style={{ ...REJILLA(180), paddingTop: 0 }}>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Desde</span>
                <input type="date" value={rDesde} onChange={(e) => setRDesde(e.target.value)} style={IN} />
              </label>
              <label style={CAMPO}>
                <span style={ETIQUETA}>Hasta</span>
                <input type="date" value={rHasta} onChange={(e) => setRHasta(e.target.value)} style={IN} />
              </label>
              {esAvance ? (
                <label style={CAMPO}>
                  <span style={ETIQUETA}>Tributo</span>
                  <select value={rTributo} onChange={(e) => setRTributo(e.target.value)} style={IN} disabled={tributos.length === 0}>
                    <option value="">Todos</option>
                    {tributos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span style={AYUDA}>
                    Los tributos que se ofrecen son los que este mismo reporte ha devuelto: no hay catálogo de tributos
                    en el contrato, y los rótulos del prototipo no son los nombres con que el libro los guarda.
                  </span>
                </label>
              ) : (
                <label style={CAMPO}>
                  <span style={ETIQUETA}>Área generadora</span>
                  <select value={rArea} onChange={(e) => setRArea(e.target.value)} style={IN} disabled={areas.length === 0}>
                    <option value="">Todas</option>
                    {areas.map(([codigo, nombre]) => (
                      <option key={codigo} value={codigo}>
                        {codigo} — {nombre}
                      </option>
                    ))}
                  </select>
                  <span style={AYUDA}>
                    Solo alcanza a las líneas de caja de tasas: una línea tributaria no tiene área en ningún sitio del
                    esquema.
                  </span>
                </label>
              )}
              <p style={{ margin: 0, gridColumn: '1 / -1', ...AYUDA }}>
                Sin fechas se suma el ejercicio {ejercicio} entero. Cambiar el ejercicio se hace en la cabecera.
              </p>
            </div>
          )}
        </section>

        {lectura.cargando && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Sumando el periodo…</p>}
        {!lectura.cargando && lectura.error && fallo(lectura.error, 'la recaudación', esAvance ? 'GET /api/v1/tesoreria/recaudacion/avance' : 'GET /api/v1/tesoreria/recaudacion/por-area')}

        {esAvance && avance.datos && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {(
              [
                ['Cobrado', moneda(avance.datos.cobrado.importe), false],
                ['Anulado', moneda(avance.datos.anulado.importe), false],
                ['Neto', moneda(avance.datos.neto.importe), true],
                ['A la fecha', dia(avance.datos.aLaFecha), false],
              ] as const
            ).map((t) => (
              <div key={t[0]} style={TOTAL_CELDA(t[2])}>
                <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
              </div>
            ))}
          </div>
        )}
        {!esAvance && porArea.datos && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            {(
              [
                ['Neto del periodo', moneda(porArea.datos.neto.importe), true],
                ['Sin partida imputable', moneda(porArea.datos.netoSinPartida.importe), false],
                ['A la fecha', dia(porArea.datos.aLaFecha), false],
              ] as const
            ).map((t) => (
              <div key={t[0]} style={TOTAL_CELDA(t[2])}>
                <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ink)' }}>{t[1]}</p>
              </div>
            ))}
          </div>
        )}

        <section style={TARJETA}>
          <div style={CABECERA}>
            <h2 style={H2}>{esAvance ? 'Lo cobrado por tributo' : 'Lo cobrado por partida y área generadora'}</h2>
            <span style={META}>
              {esAvance
                ? (avance.datos?.filas.length ?? 0) + ((avance.datos?.filas.length ?? 0) === 1 ? ' tributo' : ' tributos')
                : (porArea.datos?.filas.length ?? 0) + ((porArea.datos?.filas.length ?? 0) === 1 ? ' fila' : ' filas')}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: esAvance ? 700 : 840 }}>
              <thead>
                <tr>{cabeceras(esAvance ? COLS_AVANCE : COLS_AREA)}</tr>
              </thead>
              <tbody>
                {esAvance
                  ? (avance.datos?.filas ?? []).map((f) => (
                      <tr key={f.tributo} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {[f.tributo, f.cobrado.importe, f.anulado.importe, f.neto.importe].map((v, j) => (
                          <td key={j} style={estiloDeCelda(j, COLS_AVANCE)}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))
                  : (porArea.datos?.filas ?? []).map((f, i) => (
                      <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {[
                          f.partida ?? SIN_DATO,
                          f.areaNombre ?? SIN_DATO,
                          f.tributo,
                          f.cobrado.importe,
                          f.anulado.importe,
                          f.neto.importe,
                        ].map((v, j) => (
                          <td key={j} style={estiloDeCelda(j, COLS_AREA)}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {((esAvance && (avance.datos?.filas.length ?? 0) === 0) || (!esAvance && (porArea.datos?.filas.length ?? 0) === 0)) && !lectura.cargando && !lectura.error && (
            <p style={{ margin: 0, padding: '24px 16px', fontSize: 13, color: 'var(--ink-3)', textWrap: 'pretty' }}>
              Ningún recibo en el periodo. La tabla suma recibos cobrados: si no hay ninguno, no hay nada que repartir.
            </p>
          )}
          <p style={NOTA_PIE}>
            {esAvance
              ? 'Sin columnas de emitido, saldo ni porcentaje de avance: lo emitido son cargos del libro de cuenta corriente, que este contexto no lee, y la meta no tiene tabla. Publicar «meta: 0» invitaría a mostrar un cumplimiento que nadie firmó.'
              : 'La raya en «Partida» y «Área» es todo lo tributario: no tiene área generadora ni partida presupuestal en ningún sitio del esquema, y por eso el total del periodo no es la suma de las partidas. La cifra que falta se publica arriba, como «sin partida imputable», en vez de esconderse.'}
          </p>
        </section>
      </div>
    );
  };

  /* ══════════ El shell ══════════ */

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

  const cuerpo: ReactNode =
    dest === 'panel'
      ? panel()
      : dest === 'cobrar'
        ? cobrarPantalla()
        : dest === 'convenios'
          ? conveniosPantalla()
          : dest === 'recibos'
            ? recibosPantalla()
            : dest === 'cierre'
              ? cierrePantalla()
              : recaudacionPantalla();

  return (
    <Shell
      modulo="tesoreria"
      dest={dest}
      onDest={onDest}
      miga={['Tesorería', titulo]}
      titulo={titulo}
      contexto={
        (dest === 'cobrar' || dest === 'convenios') && contribuyente !== null
          ? {
              codigo: contribuyente.codigo,
              titular: contribuyente.nombreRazonSocial,
              ubic:
                contribuyente.tipoDocumento +
                ' ' +
                contribuyente.numeroDocumento +
                ' · ' +
                obligaciones.length +
                ' obligaciones con deuda al ' +
                dia(obligaciones[0]?.deuda.total.actualizadoA ?? (fechaDeCorte || hoy)),
              estado: contribuyente.activo ? 'En el padrón' : 'Dado de baja del padrón',
              estadoColor: contribuyente.activo ? 'var(--ok-fg)' : 'var(--bad-fg)',
              derecha: (
                <button
                  onClick={() => setCodContribuyente('')}
                  className="hov-linea"
                  style={{ ...BOTON_LINEA, padding: '5px 11px', fontSize: 12, background: 'var(--bg-elev)' }}
                >
                  Cambiar
                </button>
              ),
            }
          : undefined
      }
      /* El turno de caja: todo lo que se hace en Tesorería ocurre dentro de uno
         abierto, así que el panel lo enseña siempre —y dice cuándo no lo hay, en
         vez de dibujar una caja abierta que nadie abrió—. */
      tarjeta={
        <div style={{ border: `1px solid ${arqueo ? 'var(--line-2)' : 'var(--warn-fg)'}`, borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: arqueo ? 'var(--ok-fg)' : 'var(--warn-fg)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: arqueo ? 'var(--ok-fg)' : 'var(--warn-fg)' }}>
              {arqueo ? 'Caja ' + caja : 'Sin turno'}
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>
            {arqueo ? moneda(arqueo.neto.importe) : SIN_DATO}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {arqueo
              ? `${arqueo.recibosEmitidos} ${arqueo.recibosEmitidos === 1 ? 'recibo' : 'recibos'} · ${arqueo.recibosAnulados} ${arqueo.recibosAnulados === 1 ? 'anulado' : 'anulados'} · al ${dia(arqueo.neto.actualizadoA)}`
              : turnoCompleto
                ? 'Nadie ha abierto turno hoy con esa caja y ese cajero.'
                : 'La caja y el cajero se indican en el panel del turno.'}
          </p>
        </div>
      }
      notasDeDestino={{
        ...(avance.datos ? { recaudacion: moneda(avance.datos.neto.importe) + ' netos' } : {}),
        ...(vigentes.datos ? { convenios: vigentes.datos.totalElementos + ' vigentes' } : {}),
        ...(arqueo ? { panel: arqueo.recibosEmitidos + (arqueo.recibosEmitidos === 1 ? ' recibo hoy' : ' recibos hoy') } : {}),
      }}
      paleta={paleta}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {cuerpo}
        </div>
        {dest === 'cobrar' && hojaCobro === 'tributaria' && emitido === null && barra()}
      </div>
    </Shell>
  );
}


/* ══════════ Lo que el backend contesta, dicho en castellano ══════════ */

function comoErrorDeApi(error: unknown, porOmision: string): ErrorDeApi {
  return error instanceof ErrorDeApi ? error : new ErrorDeApi('ERROR_INTERNO', porOmision, 0);
}

/** El rótulo de una forma de pago, sin traducir la clave que viaja. */
/**
 * Cómo se lee una ventanilla en el desplegable (#618).
 *
 * Tres cosas, y las tres están medidas contra el backend en vez de supuestas:
 *
 *   1. **El código delante**, porque es lo que viaja en el cuerpo del cobro, del
 *      cierre y del filtro de recibos. Lo que el contribuyente ve impreso NO es
 *      el código sino la **serie** de la ventanilla —medido: C-01 numera
 *      `001-0000007`—, y esa el catálogo no la publica: `CajaEnListaResource`
 *      trae código, rótulo, área y estado, y nada más. No se deriva de aquí ni se
 *      inventa; se dice en el informe de #618.
 *   2. **El área**, cuando la hay. Y cuando no la hay se dice, en vez de dejar el
 *      hueco: `areaCodigo` nulo no es «falta el área», es que esa ventanilla no
 *      cuelga de ninguna —las dos tributarias de esta instalación, medido— y lo
 *      que recauda no se imputa a ninguna partida. Un hueco se lee como un dato
 *      que falta; un «—» diría que el backend no lo publica, y sí lo publica:
 *      publica que no hay.
 *   3. **Si está dada de baja**, porque el catálogo las devuelve todas y quien
 *      elige tiene que poder distinguirlas antes de pulsar.
 */
function rotuloDeCaja(c: CajaDelCatalogo): string {
  const area = c.areaCodigo !== null ? `${c.areaCodigo} ${c.areaNombre ?? ''}`.trim() : 'no cuelga de ningún área';
  return `${c.codigo} · ${c.nombre} · ${area}${c.activa ? '' : ' · dada de baja'}`;
}

function rotuloDeForma(clave: string): string {
  const encontrada = FORMAS_DE_PAGO.find((f) => f[0] === clave);
  /* Una forma que el dominio gane mañana no se dibuja en blanco ni se traduce a
     ciegas: sale tal cual, que es feo y es cierto. */
  return encontrada ? encontrada[1] : clave;
}

/**
 * El titular del fallo sale del CÓDIGO, no del texto.
 *
 * Los códigos son estables por contrato y el mensaje se reescribe en cuanto
 * alguien lo lee en voz alta; y las causas no se parecen: un permiso que falta
 * no se arregla reintentando y una red caída sí.
 */
function tituloDelFallo(error: ErrorDeApi | null, que: string): string {
  const cuenta = cuentaActual();
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'La sesión no vale';
    case 'SIN_PRIVILEGIO':
      return cuenta === null ? `Esta sesión no puede con ${que}` : `La cuenta «${cuenta}» no puede con ${que}`;
    case 'SIN_MUNICIPALIDAD':
      return 'La sesión no dice de qué municipalidad es';
    case 'NO_ENCONTRADO':
      return `No hay ${que} con esos datos`;
    case 'CONFLICTO':
      return 'El estado actual no admite esta operación';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      /* «No admite esa petición» culpa a lo que se tecleó, y desde #547 la
         causa más corriente de un 422 aquí NO es la petición: es que el
         ejercicio no tiene conjunto sellado (D-02a). Con ese titular, quien
         atiende se pone a corregir un formulario que está bien. */
      return `El servidor rechazó ${que}`;
    case 'SIN_RESPUESTA':
      return error.estado === 0 ? 'No se pudo contactar con el servidor' : 'El servidor contestó otra cosa';
    default:
      return `No se pudo completar la operación sobre ${que}`;
  }
}

/**
 * Qué se puede hacer a continuación. Sale del CÓDIGO, nunca del texto.
 *
 * Las tres cosas que hasta #547 se veían igual son: que falte un dato de la
 * petición, que falte una cifra normativa que nadie ha publicado, y que el
 * servidor se haya roto de verdad. La tercera se distingue por contrato —es un
 * 500 `ERROR_INTERNO` y trae incidencia—; **las dos primeras no**, porque las
 * seis excepciones que #547 tradujo salen con el mismo `VALIDACION` que un
 * campo que falta y la respuesta no lleva ningún discriminador legible por
 * programa: `CondicionSinParametrizar` calcula su `llave()`
 * —`INTERES_FRACCIONAMIENTO:ORDINARIO`— y el cuerpo del 422 no la publica.
 *
 * Desde #605 hay **una** ruta que sí lo dice —`GET
 * /seguridad/parametros/ejercicios/{ejercicio}`, sin permiso del catálogo— y la
 * hoja «Fraccionar deuda» la consume: `avisoDelConjunto` lo avisa ANTES de que
 * se rellene el formulario. Pero eso **no sustituye a lo de abajo**, y conviene
 * tenerlo escrito: esa lectura adelanta sólo la primera mitad —si HAY conjunto
 * sellado—, y el 422 por una llave que falta dentro del conjunto sellado sigue
 * llegando igual, con el mismo `VALIDACION` de siempre. Medido: 2026 contesta
 * `sellado: true` y la simulación contesta 422 nombrando
 * `CUOTAS_MAXIMAS_FRACCIONAMIENTO:ORDINARIO`.
 *
 * Así que esta pantalla **no las adivina**. Adivinar sería leer el texto, y el
 * texto se reescribe en cuanto alguien lo lee en voz alta: una clasificación
 * por subcadena acabaría llamando «cifra sin publicar» a un campo que falta.
 * Lo que hace es decir las dos posibilidades y en qué se reconocen, y decir lo
 * único que sí se sabe por código: que reintentar no va a cambiarlo.
 */
function queSePuedeHacer(error: ErrorDeApi): string {
  switch (error.codigo) {
    case 'NO_AUTENTICADO':
      return 'Reintentar no cambia nada mientras el token siga sin valer.';
    case 'SIN_PRIVILEGIO':
      return 'Reintentar no cambia nada: el permiso lo da Seguridad, no este botón.';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
    case 'CONFLICTO':
    case 'NO_ENCONTRADO':
      /* UNA de las dos cosas, no las dos (#604). Hasta aquí esta frase
         enumeraba —«si nombra un dato de este formulario…; si nombra un
         ejercicio sin conjunto…»— y dejaba la clasificación a quien atiende,
         que es justo quien no puede hacerla: los dos casos salen con el mismo
         `codigo` y el mismo `estado`, y lo único que los separaba era el texto.
         Desde #688 el servidor lo dice como dato, y se pregunta por la
         PRESENCIA del miembro y nunca por el texto: clasificar por subcadena
         deja de funcionar en cuanto alguien reescribe la frase, y esa
         reescritura no rompe ninguna compilación. */
      return error.faltaUnaCifraNormativa
        ? 'Lo que falta es una cifra normativa, no un dato de este formulario: ' +
          (error.parametroQueFalta?.llave === undefined
            ? 'el ejercicio ' + String(error.parametroQueFalta?.ejercicio) + ' no tiene conjunto de parámetros sellado'
            : 'falta publicar «' +
              error.parametroQueFalta.llave +
              '» en el conjunto de ' +
              String(error.parametroQueFalta.ejercicio)) +
          '. Eso no se arregla desde esta pantalla y no es un fallo del servidor (D-02a, D-02b): lo resuelve quien publica los valores normativos.'
        : 'El texto de arriba es el del servidor, tal cual: es el único sitio donde se nombra lo que falta, ' +
          'y reintentar sin cambiar nada volvería a dar lo mismo. Lo que nombra es un dato de esta petición, ' +
          'así que se corrige aquí.';
    case 'SIN_RESPUESTA':
      return 'No llegó a haber respuesta, así que reintentar puede funcionar en cuanto el servidor conteste.';
    default:
      return (
        'Esto sí es un fallo del servidor, y por eso trae referencia: reintentar puede funcionar, y con ' +
        'esa referencia se busca en su registro qué pasó.'
      );
  }
}

function explicacionDelFallo(error: ErrorDeApi | null): string {
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'Vuelve a entrar: el token caducó o no es de este emisor.';
    case 'SIN_PRIVILEGIO':
      /* El mensaje del servidor va DELANTE porque es el único sitio donde se
         nombra el acceso que falta, y desde #548 pueden ser **dos**: con
         `oTambien` otra opción del catálogo autoriza la misma operación —la
         deuda que la caja marca la publica `consulta_deuda`, y `caja_tributaria`
         también vale—, así que una frase escrita aquí nombraría una y callaría
         la otra, mandando a pedir un permiso que no hacía falta. */
      return (
        (error.mensaje && error.mensaje !== 'No se pudo completar la operación'
          ? error.mensaje.replace(/\.?$/, '.') + ' '
          : '') +
        'La caja separa siete privilegios sobre diez opciones: cobrar es registro, mirar un recibo es lectura, ' +
        'reimprimirlo es impresión, anularlo es eliminación —y si lo cobró otro cajero, además especial—. ' +
        'El permiso lo concede Seguridad.'
      );
    case 'SIN_MUNICIPALIDAD':
      return 'No hay valor por omisión: sin municipalidad en el token no hay caja que abrir.';
    case 'NO_ENCONTRADO':
    case 'CONFLICTO':
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return error?.mensaje ?? 'Revisa lo que se manda.';
    case 'SIN_RESPUESTA':
      return error.estado === 0
        ? 'El servidor no contestó. Puede estar apagado o no alcanzable desde aquí.'
        : error.mensaje;
    default:
      return (
        (error?.mensaje ?? 'La operación falló en el servidor').replace(/\.?$/, '.') +
        ' Con la referencia de abajo se puede buscar la incidencia en el registro del servidor.'
      );
  }
}
