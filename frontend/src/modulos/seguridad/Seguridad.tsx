import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Icono } from '../../ds/Icono';
import {
  darDeBajaGrupo,
  darDeBajaUsuario,
  fijarPermisosDelGrupo,
  fijarPermisosDelUsuario,
  fijarVigenciaDeGrupo,
  fijarVigenciaDeUsuario,
  gruposDelUsuario,
  identidadDeLaSesion,
  iniciarCambioDeClave,
  listarAccesos,
  listarAuditoria,
  listarConjuntosDeParametros,
  listarGrupos,
  listarModulos,
  listarRespaldos,
  listarUsuarios,
  permisosConfiguradosDelUsuario,
  titularesDelPrivilegio,
  miembrosDelGrupo,
  permisosDelGrupo,
  permisosEfectivosDelUsuario,
  reactivarGrupo,
  reactivarUsuario,
  registrarUsuario,
  OPERACIONES,
  PRIVILEGIOS,
  ROTULO_DEL_PRIVILEGIO,
  type Acceso,
  type CambioDeClaveIniciado,
  type CambioDeVigencia,
  type PermisoEfectivo,
  type Privilegio,
} from '../../api/seguridad';
import { FalloDeLectura } from '../../api/Fallo';
import { Aviso, Paginador } from '../../ds/componentes';
import { instante } from '../../ds/fechas';
import { ErrorDeApi } from '../../api/cliente';
import { enElProveedorDeIdentidad } from '../../api/sesion';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { ICO } from '../../ds/iconos';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import { usarPreferencias } from '../../shell/preferencias';
import type { PantallaProps } from '../../App';
import { OPCIONES_DE_PALETA, panelesDeSistema, type CampoDeSistema } from '../../datos/seguridad';

/* ══════════ Los estilos que el artboard declara una vez y repite ══════════ */

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
};
const TD1: CSSProperties = {
  padding: '11px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12.5,
  fontWeight: 500,
  color: 'var(--ink)',
  whiteSpace: 'nowrap',
};

type TonoDeSeguridad = 'ok' | 'warn' | 'bad' | 'neutro';

const INS: Record<TonoDeSeguridad, CSSProperties> = {
  ok: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--ok-bg)', color: 'var(--ok-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  warn: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--warn-bg)', color: 'var(--warn-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  bad: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bad-bg)', color: 'var(--bad-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  neutro: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bg-elev)', color: 'var(--ink-3)', border: '1px solid var(--line)', whiteSpace: 'nowrap', flex: '0 0 auto' },
};

const TARJETA: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-1)',
  overflow: 'hidden',
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

/* Los dos iconos del árbol de accesos. El de usuario no es `ICO.persona`: el
   artboard lo dibuja sin las dos líneas de la derecha. */
const ICO_USUARIO = ['M12 7.4a3 3 0 1 1-6 0 3 3 0 0 1 6 0', 'M3.6 20c0-3 2.4-4.6 5.4-4.6s5.4 1.6 5.4 4.6'];
const ICO_GRUPO = [
  'M9.5 8a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0',
  'M19.7 8a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0',
  'M2.6 19c0-2.6 2-4 4.3-4s4.3 1.4 4.3 4',
  'M12.8 19c0-2.6 2-4 4.3-4s4.3 1.4 4.3 4',
];

const DESTINOS: [string, string][] = [
  ['panel', 'Panel del módulo'],
  ['accesos', 'Accesos'],
  ['auditoria', 'Auditoría'],
  ['sistema', 'Sistema'],
  ['alta', 'Nuevo usuario'],
];

/** Lo que se dibuja donde el backend no publica el dato. Nunca un cero. */
const SIN_DATO = '—';

/**
 * «N miembros», escrito en un solo sitio (#582).
 *
 * Lo dicen dos: el nodo del arbol y la cabecera del grupo elegido. Salen de la
 * MISMA cifra, asi que escribirlo dos veces es dejar que uno diga «0 miembros»
 * donde el otro dice «sin miembros» por la misma respuesta del servidor —y el
 * cero es justo el que hay que decir con palabras, porque «0» al lado de un
 * grupo se lee igual que un dato que no llego—.
 */
function cuantosMiembros(n: number): string {
  if (n === 0) return 'Sin miembros';
  return n === 1 ? '1 miembro' : n + ' miembros';
}

/**
 * Lo que la cabecera dice de un grupo elegido (#582).
 *
 * Va aparte del JSX porque son **cinco** estados y ninguno se puede confundir
 * con otro: todavia leyendo, caido, sin nadie, leido entero y leido a medias.
 * Los dos ultimos son los que importan, y su diferencia no se ve en la cifra:
 * `total` lo cuenta el servidor sobre el grupo entero —viaja en el sobre
 * paginado— y `sinPoderEntrar` lo cuenta la pantalla sobre las filas que
 * llegaron. Con mas de una pagina esa segunda cuenta seria la de la pagina
 * presentada como la del grupo: un numero mas pequeno que el real, y ninguna
 * pantalla lo distinguiria del bueno. Por eso ahi entra `null` y se dice «—»
 * con el motivo, en vez de un cero que se leeria como «todos pueden entrar».
 *
 * Y «no se pudo leer» no se dice callando ni con un cero: quien administra
 * necesita distinguir un grupo sin miembros de un grupo cuyos miembros no se
 * han podido consultar, que es lo que separa «nadie hereda esto» de «no lo
 * sabemos». El detalle —403 sin permiso, 404 grupo inexistente— lo dice el
 * aviso de debajo, que sale de la misma lectura.
 */
function loQueSeSabeDelGrupo(
  cargando: boolean,
  fallo: boolean,
  total: number | null,
  sinPoderEntrar: number | null,
): string {
  if (fallo) return 'Grupo · no se pudo leer quién está dentro';
  if (total === null) return cargando ? 'Grupo · leyendo quién está dentro…' : 'Grupo';
  /* Cero miembros es una respuesta del backend, no una falta de dato: el grupo
     existe —si no existiera seria 404— y no lo tiene nadie. Lo que se dice es
     la consecuencia, que es lo que hace falta saber al mirar su matriz: sus
     permisos no se los hereda nadie. Y ahi no cabe la segunda cifra, porque
     «ninguno deshabilitado» sobre cero personas es cierto y no dice nada. */
  if (total === 0) return cuantosMiembros(0) + ' · nadie hereda lo que concede';
  const cuantos = cuantosMiembros(total);
  if (sinPoderEntrar === null) {
    return cuantos + ' · cuántos deshabilitados: ' + SIN_DATO + ' (no caben en una página)';
  }
  if (sinPoderEntrar === 0) return cuantos + ' · ninguno deshabilitado';
  return cuantos + ' · ' + sinPoderEntrar + (sinPoderEntrar === 1 ? ' deshabilitado' : ' deshabilitados');
}

type Seleccion = { tipo: 'usuario' | 'grupo'; id: number };

type CeldaDeMatriz = { privilegio: Privilegio; on: boolean };
type FilaDeMatriz = {
  acceso: Acceso;
  /** Los privilegios que quedarían al guardar. */
  vigentes: Privilegio[];
  celdas: CeldaDeMatriz[];
  /** Se tocó en esta sesión y todavía no se ha guardado. */
  tocada: boolean;
  modulo: string;
  sensible: boolean;
};

export default function Seguridad({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [modFiltro, setModFiltro] = useState('Sensibles');
  /* Lo tocado en esta sesión, por sujeto y por código de acceso. La clave lleva
     el TIPO delante del id del BACKEND —«grupo:1», «usuario:1»—, y eso no es
     adorno: hasta #585 sólo se editaba la matriz de un grupo y la clave era el
     id a secas; con la excepción de una cuenta editable, el grupo 1 y el
     usuario 1 son dos sujetos distintos con el mismo número, y lo tocado en uno
     aparecería marcado en el otro —y se mandaría con él—. El nombre tampoco
     sirve de clave: dos municipalidades tienen grupos que se llaman igual, y el
     nombre no identifica nada del otro lado. */
  const [edicion, setEdicion] = useState<Record<string, Record<string, Privilegio[]>>>({});
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<ErrorDeApi | null>(null);
  const [sisTab, setSisTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  /* El cambio de contraseña, que es la otra escritura de esta pantalla (#559).
     `cambioIniciado` no es un rótulo de éxito: es lo que el servidor contestó
     —quién gestiona la credencial y a qué ruta suya hay que ir—, y se guarda
     porque ese destino no se puede inventar. */
  /* ── El alta de usuario (#572) ─────────────────────────────────
     Escribe LA FILA del padron. La cuenta del proveedor de identidad se
     declara aparte, en `despliegue/identidad/` (ADR-0012 §5), y esta pantalla
     no la crea ni puede crearla: la aplicacion no habla con Keycloak. Por eso
     lo que se dice al terminar nombra la mitad que falta, en vez de anunciar
     «usuario creado» —que seria la unica forma de que quien da de alta no
     supiera que le queda un paso—. */
  const [altaCuenta, setAltaCuenta] = useState('');
  const [altaNombre, setAltaNombre] = useState('');
  const [altaCorreo, setAltaCorreo] = useState('');
  const [altaVigencia, setAltaVigencia] = useState('');
  const [altaObservacion, setAltaObservacion] = useState('');
  const [dandoDeAlta, setDandoDeAlta] = useState(false);
  const [errorDelAlta, setErrorDelAlta] = useState<ErrorDeApi | null>(null);
  const [altaHecha, setAltaHecha] = useState<string | null>(null);

  /* ── El estado del sujeto elegido: baja, reactivación y vigencia (#572) ──
     Tres actos con **dos** observaciones, no una: la que se teclea para dar de
     baja no es el motivo de un cambio de vigencia, y una caja compartida haría
     que el motivo del acto A viajara con el acto B —justo lo que la regla 10
     existe para que no pase—. Baja y reactivación comparten caja porque nunca
     están las dos a la vez: el estado de la fila decide cuál de las dos se
     dibuja. */
  const [obsDelEstado, setObsDelEstado] = useState('');
  const [obsDeLaVigencia, setObsDeLaVigencia] = useState('');
  const [vigDesde, setVigDesde] = useState('');
  const [vigHasta, setVigHasta] = useState('');
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorDelEstado, setErrorDelEstado] = useState<ErrorDeApi | null>(null);
  /* La confirmación de lo que corta el acceso, con el patrón de la casa: la
     primaria se pulsa dos veces y el pie dice QUÉ se va a hacer, nunca «¿estás
     seguro?». Guarda cuál acto se armó, porque en este bloque hay dos. */
  const [confirmando, setConfirmando] = useState<'baja' | 'vigencia' | null>(null);

  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [errorAlCambiar, setErrorAlCambiar] = useState<ErrorDeApi | null>(null);
  const [cambioIniciado, setCambioIniciado] = useState<CambioDeClaveIniciado | null>(null);

  const val = (k: string, d: string | boolean) => (vals[k] === undefined ? d : vals[k]);
  const set = (k: string, v: string | boolean) => setVals((s) => ({ ...s, [k]: v }));

  const enAccesos = dest === 'accesos';
  const enPanel = dest === 'panel';

  /* ── Todo lo que se dibuja sale de estas seis lecturas ──────────
     Y **no hay respaldo**: si una falla, la pantalla lo dice y no dibuja nada
     en su lugar. El juego de datos del artboard se borró del módulo para que
     ese respaldo no pueda volver por descuido. */
  const gruposReales = useRecurso((s) => listarGrupos({ tamano: 100 }, s), [], enAccesos || enPanel || dest === 'alta');
  const usuariosReales = useRecurso((s) => listarUsuarios({ tamano: 200 }, s), [], enAccesos || enPanel || dest === 'alta');
  const accesosReales = useRecurso((s) => listarAccesos({ tamano: 200 }, s), [], enAccesos || enPanel);
  /* El nombre del módulo NO viaja en el catálogo de accesos —sólo su `moduloId`—
     y sin esta lectura la columna decía el número interno («124»), que no es un
     módulo: es un id. Va aparte porque su permiso también es aparte. */
  const modulosReales = useRecurso((s) => listarModulos({ tamano: 50 }, s), [], enAccesos);

  const grupos = gruposReales.datos?.contenido ?? [];
  const usuarios = usuariosReales.datos?.contenido ?? [];
  const catalogo = useMemo(() => accesosReales.datos?.contenido ?? [], [accesosReales.datos]);

  const esGrupo = sel?.tipo === 'grupo';
  const esUsuario = sel?.tipo === 'usuario';
  /* Ver el comentario de `edicion`: el tipo va delante para que el grupo 1 y el
     usuario 1 no compartan lo tocado. */
  const claveDeEdicion = sel === null ? '' : sel.tipo + ':' + sel.id;

  /* El día de hoy en el formato en que el backend publica sus fechas, que es el
     que se puede comparar como texto. Sube aquí desde el panel porque desde
     #572 también lo necesita el bloque de estado: una vigencia que ya no
     incluye hoy corta el acceso en el acto. */
  const hoy = new Date().toISOString().slice(0, 10);
  const grupoElegido = esGrupo ? grupos.find((g) => g.id === sel?.id) : undefined;
  const usuarioElegido = sel?.tipo === 'usuario' ? usuarios.find((u) => u.id === sel.id) : undefined;

  /* La primera vez que llegan los grupos se elige el primero. Antes el estado
     inicial era un usuario del artboard —`jcardenas`—, que no existe. */
  useEffect(() => {
    if (sel !== null || grupos.length === 0) return;
    setSel({ tipo: 'grupo', id: grupos[0].id });
  }, [grupos, sel]);

  const permisosReales = useRecurso(
    (s) => permisosDelGrupo(sel!.id, s),
    [sel?.id],
    enAccesos && esGrupo,
  );

  /* ── Quienes estan DENTRO del grupo elegido (#582) ──────────────
     Se pide **solo del grupo seleccionado**, no de cada nodo del arbol. Un
     recuento al lado de cada grupo cuesta una peticion por grupo al abrir la
     pantalla, que es exactamente lo que #583 esta abierto para evitar en el
     panel, y `listarGrupos` de aqui arriba pide hasta 100: la cuenta no la
     acota el dato sino la paginacion. Asi son cero peticiones de mas —esta es
     la que la cabecera necesita igual— y todo numero que se dibuja es uno que
     se pidio.

     `tamano: 200` es el mismo que el padron de cuentas, y no es holgura: los
     deshabilitados solo se pueden contar sobre las filas que llegaron, asi que
     hace falta que quepan todas. Cuando no quepan, `hayMas` lo dice y esa
     segunda cifra no se da. */
  const miembrosDelGrupoElegido = useRecurso(
    (s) => miembrosDelGrupo(sel!.id, { tamano: 200 }, s),
    [sel?.id],
    enAccesos && esGrupo,
  );

  /* Las dos cifras salen de la MISMA lectura y **no de la misma forma**, y esa
     diferencia es la que hay que respetar: `totalElementos` lo cuenta el
     servidor sobre el grupo entero, y los deshabilitados los cuenta esta
     pantalla sobre la pagina. Con mas de una pagina, contar la primera y
     presentarlo como del grupo daria un numero mas pequeno que el real —el que
     nadie sabria distinguir del bueno—, asi que ahi vale `null` y la cabecera
     dice «—» con su motivo. Es la misma guarda que `usuariosCompletos` del
     panel, sobre otra lectura. */
  const nMiembros = miembrosDelGrupoElegido.datos?.totalElementos ?? null;
  const nMiembrosSinPoderEntrar =
    miembrosDelGrupoElegido.datos !== null && !miembrosDelGrupoElegido.datos.hayMas
      ? miembrosDelGrupoElegido.datos.contenido.filter((u) => !u.habilitado).length
      : null;

  /* ── Y las dos de un USUARIO, que antes no existian (#543) ──────
     `permisosEfectivosDelUsuario` trae la matriz YA resuelta —una fila por
     acceso configurado, con su origen—, y `gruposDelUsuario` a que grupos
     pertenece. Son dos preguntas distintas y las dos hacen falta: la segunda no
     compone la primera —para eso esta `origen`—, pero es lo unico que explica
     un permiso heredado de mas de un grupo, donde `grupoId` viene nulo a
     proposito. */
  const efectivosReales = useRecurso(
    (s) => permisosEfectivosDelUsuario(sel!.id, s),
    [sel?.id],
    enAccesos && esUsuario,
  );
  const gruposDeLaCuenta = useRecurso(
    (s) => gruposDelUsuario(sel!.id, { tamano: 100 }, s),
    [sel?.id],
    enAccesos && esUsuario,
  );

  /* La observacion es de UN cambio, no de la sesion: al cambiar de grupo se
     vacia. Sin esto, el motivo tecleado para el grupo A viaja con el cambio del
     grupo B —la fila de auditoria diria por que se toco otro grupo—, que es
     justo lo que la regla 10 existe para que no pase. */
  useEffect(() => {
    setObservacion('');
    setErrorAlGuardar(null);
    /* Y lo mismo con el bloque de estado: una confirmación armada sobre la
       cuenta anterior, leída tras cambiar de sujeto, daría de baja a otra
       persona con una sola pulsación. */
    setObsDelEstado('');
    setObsDeLaVigencia('');
    setErrorDelEstado(null);
    setConfirmando(null);
  }, [sel?.tipo, sel?.id]);

  /* Las dos cajas de fecha arrancan con lo que el sujeto tiene hoy: el `PUT`
     reemplaza las DOS de una vez, así que dejarlas en blanco y mandar sería
     quitar la que no se quería tocar. Se rellenan al cambiar de sujeto y al
     llegar la lectura que lo trae. */
  const vigenciaDelSujeto = (grupoElegido ?? usuarioElegido) ?? null;
  const vigenciaDesdeDelSujeto = vigenciaDelSujeto?.vigenciaDesde ?? null;
  const vigenciaHastaDelSujeto = vigenciaDelSujeto?.vigenciaHasta ?? null;
  useEffect(() => {
    setVigDesde(vigenciaDesdeDelSujeto ?? '');
    setVigHasta(vigenciaHastaDelSujeto ?? '');
  }, [sel?.tipo, sel?.id, vigenciaDesdeDelSujeto, vigenciaHastaDelSujeto]);

  /* ── Lo CONFIGURADO de un grupo, que es lo que se edita ─────────
     Ojo con no confundirlo con lo EFECTIVO de una cuenta, que es otra pregunta
     y otra lectura (#543): esto es lo que el grupo concede y lo que el `PUT` de
     la misma ruta guarda; aquello, lo que una persona puede, con la precedencia
     ya resuelta por el servidor. Componer lo segundo con lo primero es lo que
     el arreglo vino a impedir: la excepción propia SUSTITUYE al grupo, y unirlas
     convierte una excepción que restringe en una que amplía. */
  const propios = useMemo(() => {
    const m: Record<string, Privilegio[]> = {};
    (permisosReales.datos ?? []).forEach((p) => {
      m[p.acceso] = p.privilegios.slice();
    });
    return m;
  }, [permisosReales.datos]);

  /* Lo EFECTIVO de la cuenta, indexado. Sube aquí desde donde estaba —junto a
     la matriz que lo dibuja— porque desde #585 no sólo se dibuja: es la línea
     base contra la que se decide qué se tocó y qué viaja. */
  const efectivosPorAcceso = useMemo(() => {
    const m = new Map<string, PermisoEfectivo>();
    (efectivosReales.datos ?? []).forEach((e) => m.set(e.acceso, e));
    return m;
  }, [efectivosReales.datos]);

  /**
   * Contra qué se compara lo tocado, que no es lo mismo en los dos sujetos.
   *
   * En un GRUPO es lo configurado, que es lo que ese mismo `PUT` guarda. En una
   * CUENTA es lo EFECTIVO: lo que hoy puede, venga de donde venga. Y esa es la
   * decisión: una excepción **sustituye** a lo que el grupo le da (#543), así
   * que el punto de partida honesto de la casilla es lo que la persona puede
   * hoy —si el grupo le da los siete, las siete casillas empiezan marcadas y
   * desmarcar una escribe una excepción con las seis restantes—. Partir de la
   * excepción existente dejaría las siete apagadas en una cuenta que puede
   * todo, y el primer clic escribiría una negación de lo demás sin que nadie lo
   * pidiera.
   *
   * Un acceso **sin fila** vale `[]`, igual que uno negado. Son distintos al
   * leerlos —lo dice `origen`— y aquí valen lo mismo a propósito: la
   * consecuencia es que marcar y desmarcar sobre un acceso sin configurar
   * vuelve a `[]` y **no manda nada**, o sea que no se puede escribir por
   * descuido la negación de algo que esa cuenta nunca tuvo.
   */
  const base = useMemo(() => {
    if (esGrupo) return propios;
    const m: Record<string, Privilegio[]> = {};
    efectivosPorAcceso.forEach((e, acceso) => {
      m[acceso] = e.privilegios.slice();
    });
    return m;
  }, [esGrupo, propios, efectivosPorAcceso]);

  const editados = edicion[claveDeEdicion] ?? {};

  const nombreDelModulo = useMemo(() => {
    const m = new Map<number, string>();
    modulosReales.datos?.contenido.forEach((x) => m.set(x.id, x.nombre));
    return m;
  }, [modulosReales.datos]);

  const modulosOfrecidos = useMemo(() => {
    const vistos = new Set<number>();
    catalogo.forEach((a) => vistos.add(a.moduloId));
    return (modulosReales.datos?.contenido ?? []).filter((m) => vistos.has(m.id));
  }, [catalogo, modulosReales.datos]);

  const accesosVisibles = useMemo(() => {
    if (modFiltro === 'Todos') return catalogo;
    if (modFiltro === 'Sensibles') return catalogo.filter((a) => MUEVEN_DINERO.has(a.codigo));
    return catalogo.filter((a) => String(a.moduloId) === modFiltro);
  }, [modFiltro, catalogo]);

  const matriz = useMemo(() => {
    const filas: FilaDeMatriz[] = accesosVisibles.map((a) => {
      const vigentes = editados[a.codigo] ?? base[a.codigo] ?? [];
      const celdas = PRIVILEGIOS.map((p) => ({ privilegio: p, on: vigentes.indexOf(p) >= 0 }));
      return {
        acceso: a,
        vigentes,
        celdas,
        tocada: editados[a.codigo] !== undefined && !mismoConjunto(editados[a.codigo], base[a.codigo] ?? []),
        modulo: nombreDelModulo.get(a.moduloId) ?? SIN_DATO,
        sensible: MUEVEN_DINERO.has(a.codigo),
      };
    });
    return { filas };
  }, [accesosVisibles, editados, base, nombreDelModulo]);

  /* Lo que se va a mandar: **sólo los accesos que se tocaron**, mirando la
     edición entera y no las filas en pantalla. Cuáles están en pantalla depende
     del filtro, y un cambio hecho con otro filtro puesto no se puede perder por
     eso. */
  const aGuardar = useMemo(
    () =>
      Object.keys(editados)
        .filter((codigo) => !mismoConjunto(editados[codigo], base[codigo] ?? []))
        .map((codigo) => ({ acceso: codigo, privilegios: editados[codigo] })),
    [editados, base],
  );

  /* La matriz de una cuenta ya se escribe (#585), así que el impedimento deja
     de ser «no hay ruta» y pasa a ser el mismo de siempre en los dos sujetos:
     que la lectura haya llegado, que se haya tocado algo y que haya motivo.
     Lo único propio de la cuenta es de qué lectura depende. */
  const leidoLoQueSeEdita = esGrupo ? permisosReales.datos !== null : efectivosReales.datos !== null;
  const impedimentoAlGuardar = !leidoLoQueSeEdita
    ? esGrupo
      ? 'Todavía no se han leído los permisos de este grupo.'
      : 'Todavía no se han leído los permisos de esta cuenta.'
    : aGuardar.length === 0
      ? 'No has cambiado ninguna casilla: no hay nada que guardar.'
      : observacion.trim() === ''
        ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace (RNF-052).'
        : '';
  const puedeGuardar = impedimentoAlGuardar === '' && !guardando;

  const alternar = (fila: FilaDeMatriz, c: CeldaDeMatriz) => {
    if (sel === null) return;
    const actual = fila.vigentes.slice();
    const i = actual.indexOf(c.privilegio);
    if (i >= 0) actual.splice(i, 1);
    else actual.push(c.privilegio);
    setEdicion((x) => ({
      ...x,
      [claveDeEdicion]: { ...(x[claveDeEdicion] ?? {}), [fila.acceso.codigo]: actual },
    }));
  };

  /* Las dos matrices se guardan por aquí, y el sujeto decide a cuál de los dos
     `PUT` va. No son el mismo acto aunque compartan cuerpo: el del grupo fija lo
     que ese grupo concede, y el de la cuenta escribe su EXCEPCIÓN, que sustituye
     a lo del grupo para los accesos que viajan. Por eso lo que se dice al
     terminar tampoco es lo mismo. */
  const guardar = async () => {
    if (!puedeGuardar || sel === null) return;
    setGuardando(true);
    setErrorAlGuardar(null);
    try {
      if (esGrupo) await fijarPermisosDelGrupo(sel.id, aGuardar, observacion.trim());
      else await fijarPermisosDelUsuario(sel.id, aGuardar, observacion.trim());
      setEdicion((x) => ({ ...x, [claveDeEdicion]: {} }));
      setObservacion('');
      if (esGrupo) permisosReales.reintentar();
      else efectivosReales.reintentar();
      toast(
        esGrupo
          ? aGuardar.length === 1
            ? 'Guardado 1 acceso del grupo. Queda en la auditoría con tu usuario.'
            : `Guardados ${aGuardar.length} accesos del grupo. Quedan en la auditoría con tu usuario.`
          : aGuardar.length === 1
            ? 'Escrita la excepción de 1 acceso. Ese acceso deja de heredar del grupo.'
            : `Escritas las excepciones de ${aGuardar.length} accesos. Esos accesos dejan de heredar del grupo.`,
      );
    } catch (fallo) {
      setErrorAlGuardar(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo guardar', 0),
      );
    } finally {
      setGuardando(false);
    }
  };


  /* ══════════ El estado del sujeto elegido (#572) ══════════
     Tres actos que el backend publica desde #572 y que ninguna pantalla
     llamaba: baja, reactivación y vigencia, para una cuenta y para un grupo.
     Van en la cabecera de lo elegido —donde ya se dibujan `habilitado` y las
     dos fechas— y no en una pantalla propia: el sujeto ya está elegido ahí, y
     una pantalla aparte obligaría a elegirlo dos veces. */

  /* ── Quién puede administrar permisos HOY, preguntado y no deducido ────────
     El backend **no** guarda la baja con la regla del último administrador: la
     comprobación `usuariosQuePuedenAdministrarPermisos` se consulta en un solo
     sitio de todo el backend —`AdministrarPermisos.guardarYComprobar`—, o sea
     en los dos `PUT` de permisos y en ninguna otra escritura. Dar de baja a la
     única cuenta capaz de administrarlos, o al grupo del que le venía, deja la
     municipalidad en el mismo callejón del que el 409 de los permisos protege,
     y de ahí no se sale por el sistema.

     Aquí NO se bloquea, y esa es la decisión: bloquear exigiría afirmar, desde
     una lectura de hace unos segundos, que ésta es la última — y una lectura
     vieja rechazaría un acto legítimo mientras el guardia de verdad, que es
     transaccional, no lo rechazaría. Lo que se hace es **decirlo** con la única
     respuesta que resuelve la precedencia sin reimplementarla: la lista de
     titulares del privilegio, que la contesta el servidor.

     Cuesta una petición por entrar a Accesos —no por sujeto elegido: no depende
     de `sel`— y es la que hace que la confirmación diga algo en vez de repetir
     «¿estás seguro?». */
  const administradores = useRecurso(
    (s) => titularesDelPrivilegio('permisos', 'REGISTRO', { tamano: 100 }, s),
    [],
    enAccesos,
  );

  /* De los titulares leídos, los que se van con este acto. Para una cuenta es
     ella misma; para un grupo, todos los que lo tienen POR ese grupo —los que
     además lo tengan por otro sitio no lo pierden, y por eso se filtra por
     `grupoId` y no por pertenencia—. */
  const administradoresQueSeVan = useMemo(() => {
    const filas = administradores.datos?.contenido ?? [];
    if (sel === null) return [];
    return esGrupo
      ? filas.filter((t) => t.origen === 'GRUPO' && t.grupoId === sel.id)
      : filas.filter((t) => t.usuarioId === sel.id);
  }, [administradores.datos, sel, esGrupo]);

  /* La cuenta de los que quedarían. `null` mientras no se haya podido leer: un
     cero ahí se leería como «no queda ninguno» —la frase que asusta— y un
     número inventado como «quedan varios», que es la que tranquiliza sin
     motivo. Las dos son peores que el guion largo. */
  const administradoresQueQuedan =
    administradores.datos === null || administradores.datos.hayMas
      ? null
      : administradores.datos.totalElementos - administradoresQueSeVan.length;

  const sujetoHabilitado = (grupoElegido ?? usuarioElegido)?.habilitado ?? null;
  const comoSeLlamaElSujeto = esGrupo ? 'el grupo' : 'la cuenta';

  /* La fecha va con el formato que el backend lee (`LocalDate`): un texto que
     no sea `AAAA-MM-DD` se para aquí en vez de viajar y volver como un 422 que
     no dice cuál de los dos campos está mal. */
  const esFecha = (t: string) => t.trim() === '' || /^\d{4}-\d{2}-\d{2}$/.test(t.trim());
  const vigenciaCambia =
    vigDesde.trim() !== (vigenciaDesdeDelSujeto ?? '') || vigHasta.trim() !== (vigenciaHastaDelSujeto ?? '');
  /* Y la que de verdad importa: la vigencia que ya no incluye hoy **corta el
     acceso en el acto**. Medido contra el backend: `{"vigenciaHasta":
     "2020-01-31"}` contesta 200 y lo guarda; no es un descuido, es RF-123 —un
     contrato que ya terminó—, pero su efecto es el de una baja escrita en un
     campo que se lee como administrativo. Por eso ésta se confirma. */
  const vigenciaDejaFueraHoy =
    (vigDesde.trim() !== '' && vigDesde.trim() > hoy) || (vigHasta.trim() !== '' && vigHasta.trim() < hoy);
  const vigenciaInvertida =
    vigDesde.trim() !== '' && vigHasta.trim() !== '' && vigHasta.trim() < vigDesde.trim();

  const impedimentoDelEstado =
    sujetoHabilitado === null
      ? 'Todavía no se ha leído el estado de ' + comoSeLlamaElSujeto + '.'
      : obsDelEstado.trim() === ''
        ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace (RNF-052).'
        : '';
  const puedeCambiarElEstado = impedimentoDelEstado === '' && !cambiandoEstado;

  const impedimentoDeLaVigencia =
    sujetoHabilitado === null
      ? 'Todavía no se ha leído el estado de ' + comoSeLlamaElSujeto + '.'
      : !esFecha(vigDesde) || !esFecha(vigHasta)
        ? 'Las fechas se escriben AAAA-MM-DD, o se dejan en blanco: sin «desde» vale desde siempre, sin «hasta» vale indefinidamente.'
        : vigenciaInvertida
          ? 'La vigencia terminaría antes de empezar. El backend lo rechaza con un 422, y aquí no hace falta llegar a mandarlo.'
          : !vigenciaCambia
            ? 'Las dos fechas son las que ya tiene: no hay nada que cambiar.'
            : obsDeLaVigencia.trim() === ''
              ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace (RNF-052).'
              : '';
  const puedeCambiarLaVigencia = impedimentoDeLaVigencia === '' && !cambiandoEstado;

  /* Tocar una fecha DESARMA la confirmación de la vigencia, y teclear otro
     motivo desarma la que hubiera: lo que se confirmó era otra fecha o por otra
     razón, y la segunda pulsación aquí es la que corta el acceso. */
  const alTocarLaVigencia = (que: 'desde' | 'hasta', v: string) => {
    setConfirmando((c) => (c === 'vigencia' ? null : c));
    if (que === 'desde') setVigDesde(v);
    else setVigHasta(v);
  };

  const cambiarElEstado = async (accion: 'baja' | 'reactivacion') => {
    if (!puedeCambiarElEstado || sel === null) return;
    /* La baja se confirma; la reactivación no. No es simetría rota: la baja
       quita acceso en el acto y la reactivación lo devuelve, y de la segunda se
       vuelve con la primera. Lo irreversible aquí es el efecto inmediato de
       quitar, no la fila —que no se borra nunca (RNF-051)—. */
    if (accion === 'baja' && confirmando !== 'baja') {
      setConfirmando('baja');
      return;
    }
    setCambiandoEstado(true);
    setErrorDelEstado(null);
    try {
      if (accion === 'baja') {
        if (esGrupo) await darDeBajaGrupo(sel.id, obsDelEstado.trim());
        else await darDeBajaUsuario(sel.id, obsDelEstado.trim());
      } else if (esGrupo) {
        await reactivarGrupo(sel.id, obsDelEstado.trim());
      } else {
        await reactivarUsuario(sel.id, obsDelEstado.trim());
      }
      setObsDelEstado('');
      setConfirmando(null);
      trasCambiarElEstado();
      toast(
        accion === 'baja'
          ? esGrupo
            ? 'Grupo dado de baja: deja de conceder lo que concedía a todos sus miembros.'
            : 'Cuenta dada de baja: deja de poder operar, y sus permisos siguen configurados.'
          : esGrupo
            ? 'Grupo reactivado: sus miembros recuperan lo que concedía.'
            : 'Cuenta reactivada: recupera enteros los permisos que tenía.',
      );
    } catch (fallo) {
      setErrorDelEstado(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo cambiar el estado', 0),
      );
    } finally {
      setCambiandoEstado(false);
    }
  };

  const cambiarLaVigencia = async () => {
    if (!puedeCambiarLaVigencia || sel === null) return;
    if (vigenciaDejaFueraHoy && confirmando !== 'vigencia') {
      setConfirmando('vigencia');
      return;
    }
    setCambiandoEstado(true);
    setErrorDelEstado(null);
    /* Las dos fechas viajan **siempre**, también en blanco: el `PUT` reemplaza
       la vigencia entera, así que mandar sólo la que se tocó dejaría la otra en
       nulo sin que nadie lo pidiera. En blanco es nulo a propósito, que es lo
       que quita ese extremo. */
    const cambio: CambioDeVigencia = {
      vigenciaDesde: vigDesde.trim() === '' ? null : vigDesde.trim(),
      vigenciaHasta: vigHasta.trim() === '' ? null : vigHasta.trim(),
    };
    try {
      if (esGrupo) await fijarVigenciaDeGrupo(sel.id, cambio, obsDeLaVigencia.trim());
      else await fijarVigenciaDeUsuario(sel.id, cambio, obsDeLaVigencia.trim());
      setObsDeLaVigencia('');
      setConfirmando(null);
      trasCambiarElEstado();
      toast(
        vigenciaDejaFueraHoy
          ? 'Vigencia guardada. Con esas fechas, hoy ya no autoriza nada.'
          : 'Vigencia guardada. Queda en la auditoría con tu usuario.',
      );
    } catch (fallo) {
      setErrorDelEstado(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo cambiar la vigencia', 0),
      );
    } finally {
      setCambiandoEstado(false);
    }
  };

  /* Lo que hay que volver a leer después de tocar el estado, que es más de lo
     que se tocó: el listado del árbol trae `habilitado` y las dos fechas, y la
     matriz efectiva de una cuenta **cambia sin que nadie la haya tocado**
     —medido: con el grupo 2 dado de baja, `GET /seguridad/usuarios/4/permisos`
     pasa de once filas a dos, y las dos que quedan son sus excepciones—. Y los
     titulares del privilegio también, que es lo que la confirmación cuenta. */
  function trasCambiarElEstado() {
    if (esGrupo) {
      gruposReales.reintentar();
      permisosReales.reintentar();
      miembrosDelGrupoElegido.reintentar();
    } else {
      usuariosReales.reintentar();
      efectivosReales.reintentar();
      gruposDeLaCuenta.reintentar();
    }
    administradores.reintentar();
  }

  /* El impedimento se dice entero, y no se reparte: un boton apagado sin
     motivo legible es RNF-082 incumplido. La fecha va con el formato que el
     backend lee (`LocalDate`), asi que un texto que no sea `AAAA-MM-DD` se
     para aqui en vez de viajar y volver como un 422 que no dice cual campo. */
  const vigenciaBienEscrita = altaVigencia.trim() === '' || /^\d{4}-\d{2}-\d{2}$/.test(altaVigencia.trim());
  const impedimentoDelAlta =
    altaCuenta.trim() === ''
      ? 'Falta la cuenta: es lo único que une esta fila con la identidad con la que la persona entra (ADR-0005).'
      : altaNombre.trim() === ''
        ? 'Falta el nombre: es lo que la bitácora y los listados muestran.'
        : !vigenciaBienEscrita
          ? 'La vigencia se escribe AAAA-MM-DD, o se deja en blanco para que no caduque.'
          : altaObservacion.trim() === ''
            ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace (RNF-052).'
            : '';
  const puedeDarDeAlta = impedimentoDelAlta === '' && !dandoDeAlta;

  const darDeAlta = async () => {
    if (!puedeDarDeAlta) return;
    setDandoDeAlta(true);
    setErrorDelAlta(null);
    setAltaHecha(null);
    try {
      const creado = await registrarUsuario(
        {
          cuenta: altaCuenta.trim(),
          nombre: altaNombre.trim(),
          correo: altaCorreo.trim() === '' ? null : altaCorreo.trim(),
          vigenciaHasta: altaVigencia.trim() === '' ? null : altaVigencia.trim(),
        },
        altaObservacion.trim(),
      );
      setAltaCuenta('');
      setAltaNombre('');
      setAltaCorreo('');
      setAltaVigencia('');
      setAltaObservacion('');
      setAltaHecha(creado.cuenta);
      usuariosReales.reintentar();
      toast('Fila del padrón creada. Falta su cuenta en el proveedor de identidad.');
    } catch (fallo) {
      setErrorDelAlta(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo dar de alta', 0),
      );
    } finally {
      setDandoDeAlta(false);
    }
  };

  /* ── El árbol de usuarios y grupos, entero del backend ───────── */
  const nodos = useMemo(() => {
    const lista: { tipo: 'usuario' | 'grupo'; id: number; label: string; nota: string; marca: string }[] = [];
    grupos.forEach((g) =>
      lista.push({
        tipo: 'grupo',
        id: g.id,
        label: g.nombre,
        /* «N miembros» **sólo en el grupo elegido**, que es el único cuyo
           recuento se ha pedido (#582, #646). Ponerlo en todos costaría una
           petición por grupo nada más abrir —lo que #583 existe para evitar— y
           ponerlo sin pedirlo sería dibujar una cifra que nadie contestó. El
           resto se quedan con su descripción, que es lo que ya decían. */
        nota:
          sel?.tipo === 'grupo' && sel.id === g.id && nMiembros !== null
            ? cuantosMiembros(nMiembros)
            : (g.descripcion ?? 'Sin descripción'),
        marca: g.habilitado ? '' : 'Deshabilitado',
      }),
    );
    usuarios.forEach((u) =>
      lista.push({
        tipo: 'usuario',
        id: u.id,
        label: u.cuenta,
        nota: u.nombre,
        marca: u.habilitado ? '' : 'Deshabilitada',
      }),
    );
    const filtro = q.trim().toLowerCase();
    return lista.filter(
      (n) => filtro === '' || n.label.toLowerCase().indexOf(filtro) >= 0 || n.nota.toLowerCase().indexOf(filtro) >= 0,
    );
  }, [q, grupos, usuarios, sel?.tipo, sel?.id, nMiembros]);

  /* ── Los hallazgos del panel: los que SÍ se pueden calcular ─────
     El artboard listaba cuatro y ninguno se podía. Con #543 uno cambió de
     motivo y otro resultó ser imposible por diseño: «permiso Total» ya se
     pregunta de UNA cuenta, pero del padrón costaría una petición por usuario y
     no hay filtro por privilegio; y «cuentas inactivas con permisos» no se puede
     ni así, porque la lectura efectiva aplica la misma regla que el guardia y a
     una cuenta deshabilitada le contesta la lista vacía (#583). La caducidad de
     la contraseña la gobierna el proveedor de identidad y no este sistema, y
     «restauración sin verificar» no es un campo de `RespaldoResource` (#558).
     Los tres de aquí salen de columnas que las dos lecturas ya traen. */
  const cuentasDeshabilitadas = usuarios.filter((u) => !u.habilitado);

  /* ── Cuál de las deshabilitadas CONSERVA permisos (#583) ────────────────
     Hasta #693 esto no se podía preguntar: la lectura efectiva aplica la misma
     regla que el guardia y a una cuenta deshabilitada le contesta la lista
     vacía, tanto si conserva permisos como si nunca los tuvo. `configurados`
     contesta la otra pregunta.

     Cuesta UNA petición por cuenta deshabilitada, así que se acota y se dice
     cuántas quedaron fuera: un padrón con cien cuentas caídas no puede convertir
     la apertura del panel en cien viajes. El tope es generoso a propósito
     —quedarse corto es lo corriente, no lo normal—. */
  const TOPE_DE_SONDEO = 12;
  const sondeadas = cuentasDeshabilitadas.slice(0, TOPE_DE_SONDEO);
  const llaveDeLasSondeadas = sondeadas.map((u) => u.id).join(',');
  const conservan = useRecurso(
    (s) => Promise.all(sondeadas.map((u) => permisosConfiguradosDelUsuario(u.id, s))),
    [llaveDeLasSondeadas],
    enPanel && sondeadas.length > 0,
  );
  const cuentasVencidas = usuarios.filter((u) => u.vigenciaHasta !== null && u.vigenciaHasta < hoy);
  const gruposDeshabilitados = grupos.filter((g) => !g.habilitado);

  /* ── Quién tiene un privilegio sobre una opción (#583) ──────────────────
     Es la pregunta INVERSA a la matriz de una cuenta, y hasta #693 costaba una
     petición por usuario del padrón: en la práctica no se hacía.

     Se pregunta POR OPCIÓN y no del padrón entero, y eso no es una comodidad:
     la lectura contesta quién tiene un privilegio sobre UNA opción, así que
     «quién tiene Especial en algo» seguiría costando 134 peticiones. La pantalla
     lo dice en vez de fingir que contesta la otra pregunta.

     Empieza en `ESPECIAL` porque es el que el diseño pedía: es el que abre las
     opciones que ningún otro privilegio abre. */
  const [accesoSondeado, setAccesoSondeado] = useState('');
  const [privilegioSondeado, setPrivilegioSondeado] = useState<Privilegio>('ESPECIAL');
  const titulares = useRecurso(
    (s) => titularesDelPrivilegio(accesoSondeado, privilegioSondeado, { tamano: 50 }, s),
    [accesoSondeado, privilegioSondeado],
    enPanel && accesoSondeado !== '',
  );

  const hallazgos = [
    {
      etiqueta: 'Cuenta',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Cuentas deshabilitadas',
      detalle:
        cuentasDeshabilitadas.length === 0
          ? 'Ninguna cuenta del padrón está deshabilitada.'
          : 'No pueden entrar: ' + cuentasDeshabilitadas.map((u) => u.cuenta).join(', ') + '.',
      conteo: String(cuentasDeshabilitadas.length),
    },
    /* Este hallazgo lo pedía el diseño y hasta #693 se decía imposible. La
       redacción no promete lo que no se midió: si el sondeo no ha vuelto o
       falló, se dice eso y no un cero — un cero aquí se lee como «ninguna
       conserva permisos», que es la frase tranquilizadora y falsa. */
    {
      etiqueta: 'Llave',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Cuentas deshabilitadas que conservan permisos',
      detalle: (() => {
        if (cuentasDeshabilitadas.length === 0) return 'No hay ninguna cuenta deshabilitada que mirar.';
        if (conservan.cargando) return 'Preguntando qué conserva cada cuenta caída…';
        if (conservan.error !== null)
          return 'No se pudo leer lo configurado de las cuentas caídas, así que no se sabe cuáles conservan permisos.';
        const con = (conservan.datos ?? []).filter((c) => c.permisos.length > 0);
        const deMas = cuentasDeshabilitadas.length - sondeadas.length;
        const cola = deMas > 0 ? ' Quedan ' + deMas + ' sin preguntar: se sondean ' + TOPE_DE_SONDEO + ' como mucho.' : '';
        if (con.length === 0) return 'Ninguna de las caídas conserva ningún permiso configurado.' + cola;
        return (
          'Basta rehabilitarlas para que vuelvan a abrir: ' +
          con.map((c) => c.cuenta + ' (' + c.permisos.length + ')').join(', ') +
          '.' +
          cola
        );
      })(),
      conteo:
        cuentasDeshabilitadas.length === 0
          ? '0'
          : conservan.cargando || conservan.error !== null || conservan.datos === null
            ? SIN_DATO
            : String((conservan.datos ?? []).filter((c) => c.permisos.length > 0).length),
    },
    {
      etiqueta: 'Vigencia',
      tono: 'warn' as TonoDeSeguridad,
      titulo: 'Cuentas cuya vigencia terminó',
      detalle:
        cuentasVencidas.length === 0
          ? 'Ninguna cuenta tiene la vigencia vencida a ' + hoy + '.'
          : 'Su vigencia acabó y siguen en el padrón: ' + cuentasVencidas.map((u) => u.cuenta).join(', ') + '.',
      conteo: String(cuentasVencidas.length),
    },
    {
      etiqueta: 'Grupo',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Grupos deshabilitados',
      detalle:
        gruposDeshabilitados.length === 0
          ? 'Los ' + grupos.length + ' grupos están habilitados.'
          : 'Un grupo deshabilitado deja de conceder lo que concedía: ' +
            gruposDeshabilitados.map((g) => g.nombre).join(', ') +
            '.',
      conteo: String(gruposDeshabilitados.length),
    },
  ];

  /* ── La matriz de un USUARIO, entera del backend (#543) ─────────
     Se dibuja sobre el MISMO catalogo filtrado que la del grupo, porque la
     pregunta es la misma —que puede hacer sobre cada opcion—, pero las filas no
     salen igual: la lectura solo devuelve los accesos sobre los que hay algo
     configurado, asi que «no viene fila» y «viene fila sin privilegios» son dos
     cosas distintas y no se pueden pintar iguales. La primera es «nunca lo
     tuvo»; la segunda solo la produce una excepcion que NIEGA. */
  const nombreDelGrupo = useMemo(() => {
    const m = new Map<number, string>();
    (gruposReales.datos?.contenido ?? []).forEach((g) => m.set(g.id, g.nombre));
    return m;
  }, [gruposReales.datos]);

  /* Los recuentos de la cabecera salen del CATALOGO ENTERO, no de lo filtrado.
     «Con privilegio Especial: 0» bajo el filtro «Sensibles» —que son doce
     accesos de 134— se lee como «esta cuenta no tiene Especial en ninguna
     parte», y esa frase es la que decide si alguien investiga o pasa de largo.
     Lo que si dice el filtro es cuantas filas hay en pantalla, y para eso esta
     la cuarta casilla. */
  const totalesDelUsuario = useMemo(() => {
    let nOtorgados = 0;
    let nEspeciales = 0;
    let nExcepciones = 0;
    let nNegados = 0;
    (efectivosReales.datos ?? []).forEach((e) => {
      nOtorgados += e.privilegios.length;
      if (e.privilegios.indexOf('ESPECIAL') >= 0) nEspeciales++;
      if (e.origen === 'EXCEPCION') {
        nExcepciones++;
        if (e.privilegios.length === 0) nNegados++;
      }
    });
    return { nOtorgados, nEspeciales, nExcepciones, nNegados };
  }, [efectivosReales.datos]);

  /* Lo mismo para el grupo, y por el mismo motivo: hasta hoy estas dos cifras
     se calculaban sobre `accesosVisibles`, o sea sobre el filtro puesto. */
  const totalesDelGrupo = useMemo(() => {
    let nOtorgados = 0;
    let nEspeciales = 0;
    catalogo.forEach((a) => {
      const vigentes = editados[a.codigo] ?? propios[a.codigo] ?? [];
      nOtorgados += vigentes.length;
      if (vigentes.indexOf('ESPECIAL') >= 0) nEspeciales++;
    });
    return { nOtorgados, nEspeciales };
  }, [catalogo, editados, propios]);

  /* Una cuenta deshabilitada o fuera de vigencia recibe la lista VACIA, con la
     misma regla que el guardia. No es que no tenga permisos configurados: es
     que hoy no puede ninguno, y las dos frases no significan lo mismo. Por eso
     ahi no se dibuja la matriz: 134 filas diciendo «sin configurar» serian 134
     afirmaciones falsas sobre la configuracion. */
  const cuentaPuedeOperarHoy =
    usuarioElegido !== undefined &&
    usuarioElegido.habilitado &&
    (usuarioElegido.vigenciaDesde === null || usuarioElegido.vigenciaDesde <= hoy) &&
    (usuarioElegido.vigenciaHasta === null || usuarioElegido.vigenciaHasta >= hoy);

  /* Las filas de la cuenta son las MISMAS que las del grupo —mismo catálogo
     filtrado, mismas casillas, misma cuenta de lo tocado— más el `efectivo`,
     que es lo único propio: de dónde viene hoy cada fila. Componerlas aparte
     dejaría dos sitios donde decidir qué se tocó, y el que se olvidara de
     actualizarse mandaría otra cosa que la que se ve. */
  const matrizDelUsuario = useMemo(
    () => matriz.filas.map((f) => ({ ...f, efectivo: efectivosPorAcceso.get(f.acceso.codigo) })),
    [matriz, efectivosPorAcceso],
  );

  const catalogoCompleto = accesosReales.datos !== null && !accesosReales.datos.hayMas;
  const usuariosCompletos = usuariosReales.datos !== null && !usuariosReales.datos.hayMas;

  const kpis = [
    {
      valor: usuariosReales.datos ? String(usuariosReales.datos.totalElementos) : SIN_DATO,
      etiqueta: 'Usuarios registrados',
      /* «N activos» sólo se puede decir si la página trae a todos: contarlo
         sobre una página parcial daría un número más pequeño que el real, que
         es exactamente el que nadie sabría distinguir del bueno. */
      nota: usuariosCompletos
        ? (usuarios.filter((u) => u.habilitado).length === 1
            ? '1 cuenta habilitada; el resto no puede entrar.'
            : usuarios.filter((u) => u.habilitado).length + ' cuentas habilitadas; el resto no puede entrar.')
        : 'Cuántas están habilitadas: — (hay más de una página de usuarios).',
    },
    {
      valor: gruposReales.datos ? String(gruposReales.datos.totalElementos) : SIN_DATO,
      etiqueta: 'Grupos',
      nota: 'Los permisos se dan al grupo y se heredan; darlos uno a uno es lo que se descontrola.',
    },
    {
      valor: accesosReales.datos ? String(accesosReales.datos.totalElementos) : SIN_DATO,
      etiqueta: 'Accesos del catálogo',
      nota: 'Las 134 opciones del manual, cada una con sus siete privilegios.',
    },
    {
      valor: catalogoCompleto ? String(catalogo.filter((a) => MUEVEN_DINERO.has(a.codigo)).length) : SIN_DATO,
      etiqueta: 'Accesos que mueven dinero',
      nota: 'Cobranza, anulaciones, bajas, prescripciones, aranceles y los permisos mismos.',
    },
    {
      valor: String(PRIVILEGIOS.length),
      etiqueta: 'Privilegios por acceso',
      nota: PRIVILEGIOS.map((p) => ROTULO_DEL_PRIVILEGIO[p]).join(', ') + '.',
    },
  ];

  /* ── Auditoría ─────────────────────────────────────────────── */
  /* Los cinco filtros del artboard se sustituyen por los que la bitácora
     admite de verdad: `usuario`, `tabla`, `operacion`, `desde` y `hasta`.
     «Módulo» y «Buscar en el detalle» no existen en el backend (#544). */
  const audFiltros: { k: string; label: string; tipo: 'sel' | 'fecha' | 'texto'; valor: string; opts?: string[]; ph?: string }[] = [
    { k: 'audUsuario', label: 'Usuario', tipo: 'texto', valor: '', ph: 'jperez' },
    { k: 'audTabla', label: 'Tabla', tipo: 'texto', valor: '', ph: 'recibo, permiso, predio…' },
    /* Los siete del enumerado `Operacion`, y sólo esos: son los mismos que el
       contrato publica como `enum` de `operacion` desde #544, letra por letra.
       El desplegable del manual ofrecía `ELIMINACIÓN` —que es un PRIVILEGIO, no
       una operación— y dejaba fuera `PERMISO`, que son 1 453 de las 1 783 filas
       del ejercicio 2026. Y `ELIMINACION` ya no devuelve una tabla vacía sino un
       422: ofrecerlo dejaría la pantalla en rojo por una palabra que ella misma
       puso. */
    { k: 'audOperacion', label: 'Operación', tipo: 'sel', valor: 'Todas', opts: ['Todas', ...OPERACIONES] },
    { k: 'audDesde', label: 'Desde', tipo: 'fecha', valor: '' },
    { k: 'audHasta', label: 'Hasta', tipo: 'fecha', valor: '' },
  ];

  const [paginaAud, setPaginaAud] = useState(0);
  const usuarioAud = useRebote(String(val('audUsuario', '')).trim());
  const tablaAud = useRebote(String(val('audTabla', '')).trim());
  const operacionAud = String(val('audOperacion', 'Todas'));
  const desdeAud = String(val('audDesde', ''));
  const hastaAud = String(val('audHasta', ''));

  useEffect(() => setPaginaAud(0), [usuarioAud, tablaAud, operacionAud, desdeAud, hastaAud, pref.ejercicio]);

  /* `ejercicio` es obligatorio: la bitácora está particionada por él, y sin él
     el backend contesta 422. Sale del selector de la cabecera.

     Y `direccion` viaja SIEMPRE: sin ella `ParametrosDePaginacion` resuelve
     `ASCENDENTE`, así que las 20 filas visibles eran las 20 más antiguas de la
     partición —el acta de instalación del sistema— bajo el rótulo «últimos
     movimientos». */
  const auditoria = useRecurso(
    (senal) =>
      listarAuditoria(
        {
          ejercicio: pref.ejercicio,
          usuario: usuarioAud || undefined,
          tabla: tablaAud || undefined,
          operacion: operacionAud === 'Todas' ? undefined : operacionAud,
          desde: desdeAud || undefined,
          hasta: hastaAud || undefined,
        },
        { pagina: paginaAud, tamano: 20, ordenarPor: 'fecha', direccion: 'DESCENDENTE' },
        senal,
      ),
    [pref.ejercicio, usuarioAud, tablaAud, operacionAud, desdeAud, hastaAud, paginaAud],
    dest === 'auditoria' || enPanel,
  );
  const filasDeAuditoria = auditoria.datos?.contenido ?? [];

  /* ── Sistema ───────────────────────────────────────────────── */
  const SIS = panelesDeSistema(pref.ejercicio);
  const sisIdx = Math.min(sisTab, SIS.length - 1);
  const sisDef = SIS[sisIdx];
  const enCopias = dest === 'sistema' && sisIdx === 3;
  const respaldos = useRecurso((s) => listarRespaldos({ tamano: 20 }, s), [], enCopias);
  /* `GET /seguridad/parametros` SÍ existe —y el prototipo no lo usaba—: publica
     los conjuntos por ejercicio y su estado. No sus cifras, a propósito: la
     pregunta que contesta esta pestaña es «con qué juego de valores se emitió
     este ejercicio», y esa sólo tiene respuesta a nivel de conjunto. */
  const enParametros = dest === 'sistema' && sisIdx === 1;
  const conjuntos = useRecurso((s) => listarConjuntosDeParametros({ tamano: 20, ordenarPor: 'ejercicio', direccion: 'DESCENDENTE' }, s), [], enParametros);

  /* ── Mi contraseña: la segunda escritura de esta pantalla (#559) ──
     La pestaña se reconoce por su rótulo y no por su índice como las dos de
     arriba, y la diferencia importa porque de aquí cuelga un acto: un panel
     insertado delante movería el cambio de contraseña a otra pestaña —dejaría
     «Cambiar el ejercicio» habilitado y, al pulsarlo, mandaría el `PUT` de la
     clave—. Un índice movido en «Parámetros» o en «Copias» sólo dibuja una
     tabla donde no toca. */
  const enClave = dest === 'sistema' && sisDef.label === 'Mi contraseña';
  /* Quién eres, que hasta #559 no lo publicaba ninguna lectura al alcance de
     esta pantalla: `usuario.id` sólo salía del padrón de usuarios y de la matriz
     de otro, las dos detrás de un permiso de administración mucho mayor que
     «cambiar mi propia contraseña». */
  const identidad = useRecurso((s) => identidadDeLaSesion(s), [], enClave);
  const observacionDelCambio = String(val('cMotivo', '')).trim();

  /* Lo que impide el acto es de ejecución, no estructural: por eso se calcula
     aquí y `panelesDeSistema` deja el impedimento de esta pestaña vacío. */
  const impedimentoDelCambioDeClave =
    identidad.error !== null
      ? 'No se ha podido leer quién eres en esta municipalidad, y sin tu identificador la petición no puede salir.'
      : identidad.datos === null
        ? 'Todavía no se ha leído quién eres en esta municipalidad.'
        : cambioIniciado !== null
          ? 'El cambio ya está iniciado: la contraseña se termina de cambiar en el proveedor de identidad, con el enlace de aquí arriba.'
          : observacionDelCambio === ''
            ? 'Falta el motivo: toda modificación se registra con el motivo de quien la hace (RNF-052).'
            : '';
  const impedimentoDeSistema = enClave ? impedimentoDelCambioDeClave : sisDef.impedimento;
  const puedeCambiarLaClave = enClave && impedimentoDeSistema === '' && !cambiandoClave;

  /* Al salir de la pestaña se olvida lo que pasó en ella. La confirmación de un
     cambio ya iniciado, leída al volver, diría de un acto de hace una hora lo
     mismo que del de hace un segundo. */
  useEffect(() => {
    if (enClave) return;
    setCambioIniciado(null);
    setErrorAlCambiar(null);
  }, [enClave]);

  const cambiarLaClave = async () => {
    const yo = identidad.datos;
    if (!puedeCambiarLaClave || yo === null) return;
    setCambiandoClave(true);
    setErrorAlCambiar(null);
    try {
      /* El id sale de la lectura de la sesión y nunca de una lista: el servidor
         compara la cuenta del token con la del usuario que ese id nombra y
         contesta 403 si no son la misma. Cambiar la de otro no es administrar,
         es suplantar. */
      const iniciado = await iniciarCambioDeClave(yo.usuarioId, observacionDelCambio);
      setCambioIniciado(iniciado);
      set('cMotivo', '');
      toast('Cambio iniciado. Queda en la auditoría con tu usuario.');
    } catch (fallo) {
      setErrorAlCambiar(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo iniciar el cambio', 0),
      );
    } finally {
      setCambiandoClave(false);
    }
  };

  /* ── Shell ─────────────────────────────────────────────────── */
  const labelDest = (DESTINOS.find((d) => d[0] === dest) || ['', 'Seguridad'])[1];
  const paleta: EntradaDePaleta[] = OPCIONES_DE_PALETA.map(([label, k]) => ({
    label,
    nota: 'Seguridad',
    ir: () => onDest(k),
  }));

  return (
    <Shell
      modulo="seguridad"
      dest={dest}
      onDest={onDest}
      miga={['Seguridad', labelDest]}
      titulo={labelDest}
      tarjeta={
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
            Ejercicio de trabajo
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>{pref.ejercicio}</p>
          {/* Lo que este selector hace HOY es acotar lo que se pide, y nada más:
              vive en el estado de React del navegador. Decir «decide sobre qué
              año escriben los doce módulos» prometía un acto que no ocurre —el
              backend sabe registrarlo y no lo llama nadie (#557)—, y aquí, en la
              pantalla que audita, esa promesa es la peor de todas. */}
          <p style={{ margin: '5px 0 0', fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Acota lo que las consultas piden. No se registra en el servidor todavía (#557).
          </p>
        </div>
      }
      paleta={paleta}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {enPanel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch', textWrap: 'pretty' }}>
              Módulos, usuarios, grupos, accesos, miembros y permisos eran seis pantallas para responder una pregunta: quién puede hacer
              qué. Aquí la pregunta se responde en una matriz, y se ve de dónde le viene el permiso a cada uno.
            </p>

            {(usuariosReales.error !== null || gruposReales.error !== null) && (
              <FalloDeLectura
                error={usuariosReales.error ?? gruposReales.error!}
                que="el padrón de cuentas y grupos"
                acceso={usuariosReales.error !== null ? 'usuarios' : 'grupos'}
                alReintentar={usuariosReales.error !== null ? usuariosReales.reintentar : gruposReales.reintentar}
              />
            )}
            {accesosReales.error !== null && (
              <FalloDeLectura
                error={accesosReales.error}
                que="el catálogo de accesos"
                acceso="accesos"
                alReintentar={accesosReales.reintentar}
              />
            )}

            {usuariosReales.error === null && gruposReales.error === null && (
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que hay que revisar</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {/* Se suma lo CONTADO, no las tarjetas: las cuentas que conservan
                        permisos son un subconjunto de las caídas, así que sumar la
                        tarjeta entera las contaría dos veces. Y cuando el sondeo no
                        ha vuelto, ese sumando no existe todavía y no vale cero. */}
                    {cuentasDeshabilitadas.length +
                      cuentasVencidas.length +
                      gruposDeshabilitados.length +
                      (conservan.datos === null ? 0 : conservan.datos.filter((c) => c.permisos.length > 0).length)}{' '}
                    hallazgos
                  </span>
                </div>
                {(usuariosReales.cargando || gruposReales.cargando) && (
                  <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo cuentas y grupos…</p>
                )}
                {!usuariosReales.cargando &&
                  !gruposReales.cargando &&
                  hallazgos.map((r) => (
                    <button
                      key={r.titulo}
                      onClick={() => onDest('accesos')}
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
                      <span style={INS[r.conteo === '0' ? 'neutro' : r.tono]}>{r.etiqueta}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{r.titulo}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r.detalle}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', flex: '0 0 auto' }}>{r.conteo}</span>
                      <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                    </button>
                  ))}
                {/* Los otros cuatro hallazgos del artboard se dicen aquí, con lo
                    que le falta a cada uno. Enseñarlos con la cifra de la maqueta
                    era peor que no enseñarlos: «Cuentas con permiso Total:
                    jquispe, aayca, fruiz» nombraba a tres personas que no existen
                    en ninguna de las dos municipalidades. */}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Faltan <strong>dos</strong> hallazgos que el diseño pedía, y ya no son cuatro. <strong>Qué cuenta deshabilitada
                  conserva permisos</strong> ya está arriba: #693 publicó la lectura de lo <em>configurado</em>, que contesta otra
                  pregunta que la de permisos efectivos —ésa aplica la misma regla que el guardia y a una cuenta caída le contesta la
                  lista vacía, conserve permisos o no los haya tenido nunca—. <strong>Quién tiene el privilegio Especial</strong> se
                  pregunta abajo, y se pregunta <em>por opción</em>: la lectura contesta quién lo tiene sobre una, y hacerlo del padrón
                  entero seguiría costando una petición por cada una de las 134. Siguen sin poder calcularse la <strong>caducidad de la
                  contraseña</strong>, que la gobierna el proveedor de identidad y no este sistema, y la <strong>última restauración
                  verificada</strong>, que no es un campo de la consulta de respaldos. Un permiso total sobre un módulo tributario permite
                  anular recibos y dar de baja deuda: no es una preferencia, es la llave de la caja, y por eso en su sitio no se enseña una
                  cifra inventada.
                </p>
              </section>
            )}

            {/* La pregunta inversa (#583, #693). Va en el panel y no en «Accesos»
                porque la hace quien audita —«¿quién puede anular recibos?»— y no
                quien configura una cuenta. */}
            {enPanel && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Quién tiene un privilegio sobre una opción</h2>
                  <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--ink-4)' }}>
                    GET /api/v1/seguridad/accesos/&#123;codigo&#125;/usuarios
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                  <label htmlFor="acceso-sondeado" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Opción
                  </label>
                  <select
                    id="acceso-sondeado"
                    value={accesoSondeado}
                    onChange={(e) => setAccesoSondeado(e.target.value)}
                    style={{ flex: 1, minWidth: 230, border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 9px', background: 'var(--bg-card)', fontSize: 12 }}
                  >
                    {/* La opción vacía se queda: sin ella la pantalla preguntaría
                        sola por la primera del catálogo, que es una elección que
                        nadie hizo y una petición que nadie pidió. */}
                    <option value="">Elige una opción del catálogo…</option>
                    {catalogo.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                  <label htmlFor="privilegio-sondeado" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Privilegio
                  </label>
                  <select
                    id="privilegio-sondeado"
                    value={privilegioSondeado}
                    onChange={(e) => setPrivilegioSondeado(e.target.value as Privilegio)}
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 9px', background: 'var(--bg-card)', fontSize: 12 }}
                  >
                    {/* Los siete salen del enumerado que la fachada declara, no de
                        una lista escrita aquí: uno nuevo en el backend aparece
                        solo, y uno inventado no se puede elegir. */}
                    {PRIVILEGIOS.map((pv) => (
                      <option key={pv} value={pv}>
                        {pv}
                      </option>
                    ))}
                  </select>
                </div>
                {accesoSondeado === '' ? (
                  <p style={{ margin: 0, padding: '13px 16px', fontSize: 12, color: 'var(--ink-4)' }}>
                    Elige una opción para ver quién tiene ese privilegio sobre ella. Se pregunta por opción y no del padrón entero: la
                    lectura contesta quién lo tiene sobre <strong>una</strong>, y hacerlo de todas costaría {catalogo.length || 134}{' '}
                    peticiones.
                  </p>
                ) : titulares.cargando ? (
                  <p style={{ margin: 0, padding: '13px 16px', fontSize: 12, color: 'var(--ink-4)' }}>Preguntando…</p>
                ) : titulares.error !== null ? (
                  <FalloDeLectura
                    error={titulares.error}
                    que="quién tiene ese privilegio"
                    acceso="permisos"
                    alReintentar={titulares.reintentar}
                  />
                ) : (
                  <div style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
                      {(titulares.datos?.totalElementos ?? 0) === 0
                        ? 'Nadie tiene ' + privilegioSondeado + ' sobre «' + accesoSondeado + '».'
                        : titulares.datos!.totalElementos +
                          (titulares.datos!.totalElementos === 1 ? ' cuenta tiene ' : ' cuentas tienen ') +
                          privilegioSondeado +
                          ' sobre «' +
                          accesoSondeado +
                          '».'}
                    </p>
                    {(titulares.datos?.contenido ?? []).map((t) => (
                      <div key={t.usuarioId} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', minWidth: 110 }}>{t.cuenta}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>{t.nombre}</span>
                        {/* De dónde le viene, que es la mitad que ningún recorrido
                            por grupos encontraría: una excepción propia no se ve
                            mirando a qué grupo pertenece nadie. */}
                        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          {t.origen === 'GRUPO' ? 'por el grupo ' + String(t.grupoId) : 'excepción propia de la cuenta'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {kpis.map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: k.valor === SIN_DATO ? 'var(--ink-4)' : 'var(--accent-ink)' }}>
                    {k.valor}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Últimos movimientos de seguridad</h2>
                <button onClick={() => onDest('auditoria')} className="hov-linea" style={BOTON_LINEA}>
                  Ver auditoría
                </button>
              </div>
              {auditoria.cargando && (
                <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo la bitácora…</p>
              )}
              {auditoria.error !== null && (
                <div style={{ padding: '14px 16px' }}>
                  <FalloDeLectura error={auditoria.error} que="la bitácora" acceso="auditoria" alReintentar={auditoria.reintentar} />
                </div>
              )}
              {auditoria.datos !== null && filasDeAuditoria.length === 0 && (
                <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  El ejercicio {pref.ejercicio} no tiene ningún movimiento registrado.
                </p>
              )}
              {filasDeAuditoria.slice(0, 4).map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span style={INS[tonoDeLaOperacion(r.operacion)]}>{r.operacion}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                      {r.tabla} · {r.clave}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r.observacion}</span>
                  </span>
                  <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {instante(r.fecha)}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{r.usuario}</span>
                  </span>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* ══════════ ACCESOS: LA MATRIZ ══════════ */}
        {enAccesos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Elige un grupo y mira qué concede, o una cuenta y mira qué puede. Los permisos se dan al grupo y se heredan; una cuenta
              puede además tener una <strong>excepción propia</strong>, que <strong>sustituye</strong> a lo que su grupo le da para ese
              acceso —otorgue o niegue— en vez de sumarse. La matriz de una cuenta dice, fila a fila, cuál de las dos mandó.
            </p>

            {gruposReales.error !== null && (
              <FalloDeLectura error={gruposReales.error} que="los grupos" acceso="grupos" alReintentar={gruposReales.reintentar} />
            )}
            {usuariosReales.error !== null && (
              <FalloDeLectura error={usuariosReales.error} que="las cuentas" acceso="usuarios" alReintentar={usuariosReales.reintentar} />
            )}
            {accesosReales.error !== null && (
              <FalloDeLectura error={accesosReales.error} que="el catálogo de accesos" acceso="accesos" alReintentar={accesosReales.reintentar} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,282px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section style={TARJETA}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Usuario o grupo"
                    aria-label="Buscar un usuario o un grupo"
                    style={{ flex: 1, minWidth: 0, border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg-elev)', fontSize: 12.5 }}
                  />
                </div>
                <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                  {(gruposReales.cargando || usuariosReales.cargando) && (
                    <p style={{ margin: 0, padding: '12px 14px', fontSize: 12, color: 'var(--ink-3)' }}>Leyendo…</p>
                  )}
                  {/* «No hay ninguno» y «no se pudo leer» son dos cosas
                      distintas, y la segunda ya la dice el aviso de arriba: sin
                      esta guarda, un 403 se leia ademas como una municipalidad
                      sin grupos ni cuentas. */}
                  {!gruposReales.cargando && !usuariosReales.cargando && nodos.length === 0 && (
                    <p style={{ margin: 0, padding: '12px 14px', fontSize: 12, color: 'var(--ink-3)' }}>
                      {gruposReales.error !== null || usuariosReales.error !== null
                        ? 'No se pudo leer la lista: mira el aviso de arriba.'
                        : q.trim() === ''
                          ? 'Esta municipalidad no tiene grupos ni cuentas que mostrar.'
                          : 'Nada con ese nombre.'}
                    </p>
                  )}
                  {nodos.map((n) => {
                    const on = sel?.tipo === n.tipo && sel.id === n.id;
                    return (
                      <button
                        key={n.tipo + ':' + n.id}
                        onClick={() => setSel({ tipo: n.tipo, id: n.id })}
                        aria-current={on ? 'true' : undefined}
                        className={on ? undefined : 'hov-acento'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          textAlign: 'left',
                          border: 0,
                          borderBottom: '1px solid var(--line)',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: on ? 'var(--accent-soft)' : 'transparent',
                          color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            flex: '0 0 auto',
                            border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                            background: on ? 'var(--accent)' : 'var(--bg-elev)',
                            color: on ? '#fff' : 'var(--ink-3)',
                          }}
                        >
                          <Icono d={n.tipo === 'grupo' ? ICO_GRUPO : ICO_USUARIO} tam={13} grosor={1.8} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.label}
                          </span>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.nota}
                          </span>
                        </span>
                        {n.marca && <span style={INS.bad}>{n.marca}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                {sel === null && (
                  <section style={{ ...TARJETA, padding: '16px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Elige un grupo o una cuenta de la lista.</p>
                  </section>
                )}

                {/* ── La cabecera de lo elegido ── */}
                {sel !== null && (
                  <section style={TARJETA}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ flex: 1, minWidth: 190 }}>
                        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                          {grupoElegido?.nombre ?? usuarioElegido?.nombre ?? SIN_DATO}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                          {esGrupo
                            ? /* Desde #646 la ruta tiene su `GET` y el recuento se puede
                                 decir. Las dos cifras salen de la misma lectura y no de la
                                 misma forma: ver `loQueSeSabeDelGrupo`. */
                              loQueSeSabeDelGrupo(
                                miembrosDelGrupoElegido.cargando,
                                miembrosDelGrupoElegido.error !== null,
                                nMiembros,
                                nMiembrosSinPoderEntrar,
                              )
                            : 'Cuenta ' + (usuarioElegido?.cuenta ?? SIN_DATO) + (usuarioElegido?.correo ? ' · ' + usuarioElegido.correo : '')}
                        </p>
                      </div>
                      <span style={INS[(grupoElegido ?? usuarioElegido)?.habilitado === false ? 'bad' : 'neutro']}>
                        {esGrupo
                          ? grupoElegido?.habilitado === false
                            ? 'Deshabilitado'
                            : 'Grupo'
                          : usuarioElegido?.habilitado === false
                            ? 'Deshabilitada'
                            : 'Cuenta habilitada'}
                      </span>
                    </div>
                    {esGrupo && (
                      <FranjaDeCasillas
                        casillas={[
                          /* Estas dos cuentan sobre el CATALOGO ENTERO y no sobre
                             el filtro puesto: ver `totalesDelGrupo`. Cuantas filas
                             hay en pantalla lo dice la cuarta casilla. */
                          ['Privilegios otorgados', permisosReales.datos ? String(totalesDelGrupo.nOtorgados) : SIN_DATO, 'var(--ink)'],
                          [
                            'Accesos con Especial',
                            permisosReales.datos ? String(totalesDelGrupo.nEspeciales) : SIN_DATO,
                            totalesDelGrupo.nEspeciales > 0 ? 'var(--bad-fg)' : 'var(--ink-3)',
                          ],
                          ['Sin guardar', String(aGuardar.length), aGuardar.length > 0 ? 'var(--warn-fg)' : 'var(--ink-3)'],
                          [
                            'Accesos mostrados',
                            accesosReales.datos
                              ? accesosVisibles.length + ' de ' + accesosReales.datos.totalElementos
                              : SIN_DATO,
                            'var(--ink-3)',
                          ],
                        ]}
                      />
                    )}
                    {/* El fallo de ESTA lectura se dice aquí y no arriba con los
                        de la página: los de arriba son de listados que valen
                        para toda la pantalla, y éste es de un grupo concreto.

                        El 404 no es un fallo que reintentar sino una respuesta
                        —ese grupo no existe en esta municipalidad, y desde el
                        árbol sólo se llega ahí si alguien lo dio de baja entre
                        las dos lecturas—. No hace falta separarlo a mano:
                        `FalloDeLectura` decide por CÓDIGO, y `NO_ENCONTRADO` no
                        es `reintentable`, así que no ofrece el botón de volver a
                        intentar e imprime el mensaje del servidor, que es el que
                        nombra el grupo. Un 403 tampoco lo ofrece —lo que dice
                        ahí es qué acceso hace falta—, y `alReintentar` se pasa
                        igual porque una red caída o un 500 sí se arreglan
                        insistiendo, y ésos son los dos únicos que lo pintan. */}
                    {esGrupo && miembrosDelGrupoElegido.error !== null && (
                      <div style={{ padding: '13px 16px 0' }}>
                        <FalloDeLectura
                          error={miembrosDelGrupoElegido.error}
                          que="la lista de miembros del grupo"
                          acceso="grupos"
                          alReintentar={miembrosDelGrupoElegido.reintentar}
                        />
                      </div>
                    )}
                    {/* Las de una CUENTA, y la tercera es la que este arreglo
                        hizo posible: cuantos de sus permisos son excepcion
                        propia, o sea cuantos NO se ven mirando a su grupo. */}
                    {esUsuario && cuentaPuedeOperarHoy && (
                      <FranjaDeCasillas
                        casillas={[
                          ['Privilegios efectivos', efectivosReales.datos ? String(totalesDelUsuario.nOtorgados) : SIN_DATO, 'var(--ink)'],
                          [
                            'Accesos con Especial',
                            efectivosReales.datos ? String(totalesDelUsuario.nEspeciales) : SIN_DATO,
                            totalesDelUsuario.nEspeciales > 0 ? 'var(--bad-fg)' : 'var(--ink-3)',
                          ],
                          [
                            'Por excepción propia',
                            efectivosReales.datos
                              ? String(totalesDelUsuario.nExcepciones) +
                                (totalesDelUsuario.nNegados > 0 ? ' · ' + totalesDelUsuario.nNegados + ' niegan' : '')
                              : SIN_DATO,
                            totalesDelUsuario.nExcepciones > 0 ? 'var(--warn-fg)' : 'var(--ink-3)',
                          ],
                          [
                            'Accesos mostrados',
                            accesosReales.datos
                              ? accesosVisibles.length + ' de ' + accesosReales.datos.totalElementos
                              : SIN_DATO,
                            'var(--ink-3)',
                          ],
                        ]}
                      />
                    )}
                  </section>
                )}

                {/* ── El estado del sujeto: baja, reactivación y vigencia (#572) ──
                    Los tres actos existen en el backend desde #572 y no los
                    llamaba ninguna pantalla. Van aquí, bajo la cabecera de lo
                    elegido, porque es donde ya se leen `habilitado` y las dos
                    fechas: una pantalla propia obligaría a elegir el sujeto dos
                    veces y a mirar en dos sitios el mismo dato. */}
                {sel !== null && (
                  <section style={TARJETA}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                      <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        {esGrupo ? 'Estado del grupo' : 'Estado de la cuenta'}
                      </h2>
                      <span style={INS[sujetoHabilitado === false ? 'bad' : 'ok']}>
                        {sujetoHabilitado === null
                          ? SIN_DATO
                          : sujetoHabilitado
                            ? 'Habilitado'
                            : 'Dado de baja'}
                      </span>
                      <span style={INS.neutro}>
                        {'Vigencia: ' +
                          (vigenciaDesdeDelSujeto ?? 'desde siempre') +
                          ' → ' +
                          (vigenciaHastaDelSujeto ?? 'sin fin')}
                      </span>
                    </div>

                    {errorDelEstado !== null && (
                      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.55 }}>
                        <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>No se cambió nada</strong>
                        {errorDelEstado.mensaje}
                      </div>
                    )}

                    {/* ── Baja y reactivación ──
                        Nunca están las dos: el estado de la fila decide cuál se
                        dibuja, y por eso comparten la caja del motivo. */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '13px 16px' }}>
                      <label style={{ flex: 1, minWidth: 240 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                          {(sujetoHabilitado === false ? 'Motivo de la reactivación' : 'Motivo de la baja') + ' · obligatorio'}
                        </span>
                        <input
                          value={obsDelEstado}
                          onChange={(e) => {
                            /* Cambiar el motivo desarma la confirmación: lo que
                               se había confirmado era otra razón. */
                            setConfirmando((c) => (c === 'baja' ? null : c));
                            setObsDelEstado(e.target.value);
                          }}
                          placeholder="Con qué documento, y por qué"
                          style={{ ...IN, background: 'var(--bg-card)' }}
                        />
                      </label>
                      <button
                        onClick={() => void cambiarElEstado(sujetoHabilitado === false ? 'reactivacion' : 'baja')}
                        disabled={!puedeCambiarElEstado}
                        title={impedimentoDelEstado || undefined}
                        aria-describedby="motivo-del-estado"
                        className={puedeCambiarElEstado ? 'hov-acento-2' : undefined}
                        style={{
                          border: 0,
                          borderRadius: 6,
                          padding: '9px 18px',
                          background: sujetoHabilitado === false ? 'var(--accent)' : 'var(--bad-fg)',
                          color: '#fff',
                          fontSize: 12.5,
                          fontWeight: 500,
                          cursor: puedeCambiarElEstado ? 'pointer' : 'not-allowed',
                          opacity: puedeCambiarElEstado ? 1 : 0.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cambiandoEstado
                          ? 'Guardando…'
                          : sujetoHabilitado === false
                            ? esGrupo
                              ? 'Reactivar el grupo'
                              : 'Reactivar la cuenta'
                            : confirmando === 'baja'
                              ? esGrupo
                                ? 'Sí: dar de baja el grupo'
                                : 'Sí: dar de baja la cuenta'
                              : esGrupo
                                ? 'Dar de baja el grupo'
                                : 'Dar de baja la cuenta'}
                      </button>
                    </div>
                    {/* El pie dice QUÉ se va a hacer, nunca «¿estás seguro?».
                        Y con la baja armada dice además a quién alcanza y qué
                        pasa con el privilegio de administrar, que es lo único
                        de lo que no se vuelve por el sistema. */}
                    <p id="motivo-del-estado" style={{ margin: 0, padding: '0 16px 13px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {impedimentoDelEstado !== ''
                        ? impedimentoDelEstado
                        : sujetoHabilitado === false
                          ? esGrupo
                            ? 'Se volverá a habilitar el grupo y sus miembros recuperarán lo que concedía. Ninguna afiliación se borró al darlo de baja, así que vuelven los mismos.'
                            : 'Se volverá a habilitar la cuenta. Recupera enteros los permisos que tenía configurados: deshabilitar no retira ninguno.'
                          : confirmando === 'baja'
                            ? (esGrupo
                                ? 'Se dará de baja el grupo. Deja de conceder lo que concedía' +
                                  (nMiembros === null ? '' : ' a sus ' + cuantosMiembros(nMiembros).toLowerCase()) +
                                  ', sus afiliaciones no se borran y reactivarlo lo devuelve todo. '
                                : 'Se dará de baja la cuenta. Deja de poder operar en el acto —la lectura de permisos efectivos le contestará la lista vacía—, sus permisos siguen configurados y reactivarla se los devuelve. ') +
                              (administradoresQueSeVan.length === 0
                                ? 'No es de donde sale el privilegio de administrar permisos. '
                                : 'ATENCIÓN: de aquí sale el privilegio de administrar permisos para ' +
                                  administradoresQueSeVan.map((t) => t.cuenta).join(', ') +
                                  '. Quedarían ' +
                                  (administradoresQueQuedan === null
                                    ? SIN_DATO + ' (no se pudo leer quién puede administrarlos)'
                                    : String(administradoresQueQuedan)) +
                                  ' con ese privilegio, y el backend NO rechaza este acto aunque no quede ninguno. ') +
                              'Vuelve a pulsar para confirmar.'
                            : esGrupo
                              ? 'Dar de baja un grupo retira el acceso de todos sus miembros a la vez. Se confirma antes de mandarlo.'
                              : 'Dar de baja una cuenta le quita el acceso en el acto. Se confirma antes de mandarlo.'}
                    </p>

                    {/* ── La vigencia, que es una fecha y corta como una baja ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                      <label style={{ minWidth: 150 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                          Vigencia desde
                        </span>
                        <input
                          value={vigDesde}
                          onChange={(e) => alTocarLaVigencia('desde', e.target.value)}
                          placeholder="AAAA-MM-DD · en blanco, siempre"
                          style={{ ...IN, background: 'var(--bg-card)' }}
                        />
                      </label>
                      <label style={{ minWidth: 150 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                          Vigencia hasta
                        </span>
                        <input
                          value={vigHasta}
                          onChange={(e) => alTocarLaVigencia('hasta', e.target.value)}
                          placeholder="AAAA-MM-DD · en blanco, sin fin"
                          style={{ ...IN, background: 'var(--bg-card)' }}
                        />
                      </label>
                      <label style={{ flex: 1, minWidth: 220 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                          Motivo del cambio de vigencia · obligatorio
                        </span>
                        <input
                          value={obsDeLaVigencia}
                          onChange={(e) => {
                            setConfirmando((c) => (c === 'vigencia' ? null : c));
                            setObsDeLaVigencia(e.target.value);
                          }}
                          placeholder="Qué contrato o resolución fija estas fechas"
                          style={{ ...IN, background: 'var(--bg-card)' }}
                        />
                      </label>
                      <button
                        onClick={() => void cambiarLaVigencia()}
                        disabled={!puedeCambiarLaVigencia}
                        title={impedimentoDeLaVigencia || undefined}
                        aria-describedby="motivo-de-la-vigencia"
                        className={puedeCambiarLaVigencia ? 'hov-acento-2' : undefined}
                        style={{
                          border: 0,
                          borderRadius: 6,
                          padding: '9px 18px',
                          background: vigenciaDejaFueraHoy ? 'var(--bad-fg)' : 'var(--accent)',
                          color: '#fff',
                          fontSize: 12.5,
                          fontWeight: 500,
                          cursor: puedeCambiarLaVigencia ? 'pointer' : 'not-allowed',
                          opacity: puedeCambiarLaVigencia ? 1 : 0.5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cambiandoEstado
                          ? 'Guardando…'
                          : confirmando === 'vigencia'
                            ? 'Sí: dejar fuera de vigencia'
                            : 'Guardar la vigencia'}
                      </button>
                    </div>
                    <p id="motivo-de-la-vigencia" style={{ margin: 0, padding: '0 16px 13px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      {impedimentoDeLaVigencia !== ''
                        ? impedimentoDeLaVigencia
                        : confirmando === 'vigencia'
                          ? 'Con esas fechas, hoy (' +
                            hoy +
                            ') queda FUERA de vigencia: ' +
                            comoSeLlamaElSujeto +
                            ' deja de autorizar nada en el acto, igual que una baja, aunque siga marcado como habilitado. Vuelve a pulsar para confirmar.'
                          : 'Se guardarán las dos fechas de una vez: en blanco es «sin ese extremo», no «déjalo como estaba». ' +
                            (vigenciaDejaFueraHoy
                              ? 'Ojo: las fechas escritas dejan hoy fuera.'
                              : 'Con estas fechas hoy sigue dentro.')}
                    </p>
                  </section>
                )}

                {/* ── La matriz de un USUARIO, del backend (#543) ──
                    Aquí no se reconstruye nada: el servidor manda una fila por
                    acceso con la precedencia YA resuelta, y cada fila dice de
                    dónde viene. Componerla aquí uniendo «lo del grupo» con «lo
                    propio» es exactamente el defecto que este arreglo cerró:
                    una excepción que RESTRINGE se volvía una que amplía. */}
                {sel !== null && esUsuario && (
                  <>
                    <section style={TARJETA}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                        <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                          Grupos a los que pertenece
                          <span style={{ marginLeft: 9, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>
                            {gruposDeLaCuenta.cargando ? 'leyendo…' : gruposDeLaCuenta.datos ? 'del backend' : 'sin leer'}
                          </span>
                        </h2>
                      </div>
                      <div style={{ padding: '13px 16px' }}>
                        {gruposDeLaCuenta.error !== null && (
                          <FalloDeLectura
                            error={gruposDeLaCuenta.error}
                            que="los grupos de esta cuenta"
                            acceso="usuarios"
                            alReintentar={gruposDeLaCuenta.reintentar}
                          />
                        )}
                        {gruposDeLaCuenta.datos !== null && gruposDeLaCuenta.datos.contenido.length === 0 && (
                          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                            No pertenece a ninguno. Lo que pueda hacer sale entonces sólo de sus excepciones propias, si tiene alguna.
                          </p>
                        )}
                        {gruposDeLaCuenta.datos !== null && gruposDeLaCuenta.datos.contenido.length > 0 && (
                          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                            {gruposDeLaCuenta.datos.contenido.map((g) => {
                              const surteEfecto =
                                g.habilitado &&
                                (g.vigenciaDesde === null || g.vigenciaDesde <= hoy) &&
                                (g.vigenciaHasta === null || g.vigenciaHasta >= hoy);
                              return (
                                <span
                                  key={g.id}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}
                                >
                                  <Icono d={ICO_GRUPO} tam={13} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{g.nombre}</span>
                                  {/* Pertenecer y surtir efecto no son lo mismo, y el
                                      backend lo separa a propósito: esta lectura devuelve
                                      también los grupos deshabilitados o fuera de vigencia
                                      a los que se sigue perteneciendo, y la matriz de
                                      abajo no los cuenta como origen de nada. */}
                                  {!surteEfecto && <span style={INS.bad}>Hoy no concede nada</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {/* La nota explica lo que la lista dice, así que sin lista
                            no explica nada: bajo un aviso de fallo se leería como si
                            algo se hubiera llegado a leer. */}
                        {gruposDeLaCuenta.datos !== null && (
                          <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-4)', maxWidth: '78ch', textWrap: 'pretty' }}>
                            Sólo las pertenencias activas: quien salió de un grupo deja de pertenecer, aunque su fila siga ahí porque
                            aquí no se borra (RNF-051).
                          </p>
                        )}
                      </div>
                    </section>

                    <section style={TARJETA}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                        <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                          Permisos efectivos
                          <span style={{ marginLeft: 9, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>
                            {efectivosReales.cargando ? 'leyendo…' : efectivosReales.datos ? 'del backend' : 'sin leer'}
                          </span>
                        </h2>
                        {['Sensibles', 'Todos'].map((m) => (
                          <PastillaDeFiltro key={m} label={m} on={modFiltro === m} onClick={() => setModFiltro(m)} />
                        ))}
                        {modulosOfrecidos.map((m) => (
                          <PastillaDeFiltro
                            key={m.id}
                            label={m.nombre}
                            on={modFiltro === String(m.id)}
                            onClick={() => setModFiltro(String(m.id))}
                          />
                        ))}
                      </div>

                      {efectivosReales.error !== null && (
                        <div style={{ padding: '14px 16px' }}>
                          <FalloDeLectura
                            error={efectivosReales.error}
                            que="los permisos efectivos de esta cuenta"
                            acceso="permisos"
                            alReintentar={efectivosReales.reintentar}
                          />
                        </div>
                      )}
                      {efectivosReales.cargando && (
                        <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo los permisos de la cuenta…</p>
                      )}

                      {/* Una cuenta que hoy no puede operar recibe la lista VACÍA,
                          con la misma regla que el guardia. Dibujar la matriz aquí
                          serían 134 filas diciendo «sin configurar», y eso es una
                          afirmación sobre la configuración que nadie ha leído. */}
                      {efectivosReales.datos !== null && !cuentaPuedeOperarHoy && (
                        <div style={{ padding: '14px 16px' }}>
                          <Aviso tono="bad" titulo="Esta cuenta hoy no puede nada, y por eso la matriz no se dibuja">
                            La lectura de permisos efectivos aplica la <strong>misma regla que el guardia</strong>: a una cuenta
                            deshabilitada o fuera de vigencia le contesta la lista vacía. Vacía no quiere decir «no tiene permisos
                            configurados» —puede tenerlos, y volverían a valer el día que se rehabilite—, quiere decir que hoy no le
                            sirve ninguno. Los permisos de sus grupos se revisan eligiendo el grupo en la lista de la izquierda.
                            Y por lo mismo <strong>tampoco se le escribe aquí su excepción</strong> (#585): la matriz que se edita es
                            ésta, y editar sobre una lista vacía escribiría negaciones de accesos que nadie ha mirado. Si hay que
                            apartarla de su grupo, se reactiva primero —arriba, en «Estado de la cuenta»— y entonces se ve qué tiene.
                          </Aviso>
                        </div>
                      )}

                      {efectivosReales.datos !== null && cuentaPuedeOperarHoy && accesosReales.datos !== null && (
                        <>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                              <thead>
                                <tr>
                                  {/* «Acceso y de dónde viene» en la MISMA columna, y esa es
                                      la fija: con el origen en una columna del final, en un
                                      portátil se quedaba fuera del marco —«Grupo · Admini…»—
                                      justo el dato por el que existe esta matriz. */}
                                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)', position: 'sticky', left: 0, borderRight: '1px solid var(--line)' }}>
                                    Acceso · origen
                                  </th>
                                  {PRIVILEGIOS.map((p) => (
                                    <th key={p} title={p} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', background: 'var(--bg-elev)', whiteSpace: 'nowrap' }}>
                                      {ROTULO_DEL_PRIVILEGIO[p]}
                                    </th>
                                  ))}
                                  {/* La columna que dice QUE se va a escribir, que en esta
                                      matriz no es lo mismo que en la del grupo: aqui lo que
                                      se guarda es una EXCEPCION, y una fila tocada deja de
                                      heredar aunque las casillas queden como estaban. */}
                                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)' }}>
                                    Estado
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {matrizDelUsuario.length === 0 && (
                                  <tr>
                                    <td colSpan={PRIVILEGIOS.length + 2} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)' }}>
                                      Ningún acceso del catálogo cae en este filtro.
                                    </td>
                                  </tr>
                                )}
                                {matrizDelUsuario.map((f) => {
                                  /* Lo que se dibuja es lo que QUEDARIA al guardar, no lo
                                     que hoy hay: `vigentes` es lo editado si se tocó, y lo
                                     efectivo si no. Dibujar lo efectivo con la edición
                                     encima sería enseñar una casilla marcada que el clic
                                     acaba de desmarcar. */
                                  const privilegios = f.vigentes;
                                  const negado = f.tocada
                                    ? privilegios.length === 0
                                    : f.efectivo !== undefined && privilegios.length === 0;
                                  const origen = origenDeLaFila(f.efectivo, nombreDelGrupo, f.tocada);
                                  const fondo = negado
                                    ? 'var(--bad-bg)'
                                    : f.sensible && privilegios.length > 0
                                      ? 'var(--warn-bg)'
                                      : 'transparent';
                                  return (
                                    <tr key={f.acceso.codigo} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: fondo }}>
                                      <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', maxWidth: 300, position: 'sticky', left: 0, borderRight: '1px solid var(--line)', background: fondo === 'transparent' ? 'var(--bg-card)' : fondo }}>
                                        <span style={{ display: 'block' }}>{f.acceso.nombre}</span>
                                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>
                                          {f.modulo + (f.sensible ? ' · mueve dinero' : '')}
                                        </span>
                                        {/* El nombre del grupo puede ser largo: la insignia
                                            envuelve en vez de ensanchar la columna fija. */}
                                        <span
                                          style={{ ...INS[origen.tono], display: 'inline-block', whiteSpace: 'normal', marginTop: 5 }}
                                          title={origen.ayuda}
                                        >
                                          {origen.texto}
                                        </span>
                                      </td>
                                      {f.celdas.map((c) => {
                                        const on = c.on;
                                        return (
                                          <td key={c.privilegio} style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <button
                                              onClick={() => alternar(f, c)}
                                              aria-pressed={on}
                                              aria-label={ROTULO_DEL_PRIVILEGIO[c.privilegio] + ' en ' + f.acceso.nombre}
                                              /* El rótulo dice lo que pasa al pulsar, y aquí eso
                                                 NO es «otorgar» ni «retirar» a secas: escribe una
                                                 excepción propia que sustituye a lo que su grupo
                                                 le da en esta fila. */
                                              title={
                                                on
                                                  ? 'Lo tiene: pulsa para escribir una excepción que se lo retire'
                                                  : 'No lo tiene: pulsa para escribir una excepción que se lo dé'
                                              }
                                              style={{
                                                display: 'grid',
                                                placeItems: 'center',
                                                width: 26,
                                                height: 26,
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                                                background: on ? 'var(--accent)' : 'var(--bg-card)',
                                                color: on ? '#fff' : 'var(--accent-ink)',
                                                /* Sin fila no hay nada configurado: la casilla se
                                                   apaga para que no se lea como «se le negó». Lo
                                                   negado se distingue en la columna de estado. */
                                                opacity: f.efectivo === undefined && !f.tocada ? 0.45 : 1,
                                              }}
                                            >
                                              {on && <Icono d={['M5 12.5l4.5 4.5L19 7']} tam={12} grosor={3} />}
                                            </button>
                                          </td>
                                        );
                                      })}
                                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                        <span style={INS[f.tocada ? 'warn' : negado ? 'bad' : privilegios.length === 0 ? 'neutro' : 'ok']}>
                                          {f.tocada
                                            ? privilegios.length === 0
                                              ? 'Sin guardar · negará'
                                              : 'Sin guardar · ' + privilegios.length + ' de 7'
                                            : negado
                                              ? 'Negado'
                                              : privilegios.length === 0
                                                ? 'Sin configurar'
                                                : privilegios.length + ' de 7'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* ── Guardar la EXCEPCIÓN de la cuenta (#585) ──
                              Mismo camino que el de la matriz del grupo —manda sólo
                              los accesos tocados, con su observación— y otro acto:
                              lo que se escribe aquí sustituye a lo que sus grupos le
                              dan en esas filas. Por eso el aviso va ANTES del botón y
                              no en una ayuda al pasar el ratón: quien lo lea después
                              de pulsar ya no puede elegir. */}
                          <div style={{ padding: '13px 16px 0', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                            <Aviso tono="warn" titulo="Lo que se guarda aquí sustituye a lo que su grupo le da, y no se puede retirar">
                              Una excepción propia <strong>desplaza</strong> a lo que sus grupos concedan en ese acceso: no se suma a
                              ello, ni le quita sólo lo desmarcado. Y una vez escrita, ese acceso <strong>deja de heredar del grupo
                              para siempre</strong> —aquí no se borra nada (regla 4) y el contrato no publica ningún borrado de esta
                              ruta—; lo más parecido a deshacerlo es volver a escribirla con lo que el grupo concede, que deja los
                              mismos privilegios y sigue diciendo «Excepción propia». Dejar una fila en cero no es «quitarle la
                              excepción»: es <strong>negar</strong> ese acceso, que es lo único que distingue «se le negó» de «nunca
                              lo tuvo». Para cambiar lo que hereda todo el grupo, la matriz es la del grupo.
                            </Aviso>
                          </div>
                          {errorAlGuardar !== null && (
                            <div style={{ padding: '13px 16px 0', background: 'var(--bg-elev)' }}>
                              <div style={{ padding: '11px 13px', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--bad-fg)', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.55 }}>
                                <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>No se guardó nada</strong>
                                {errorAlGuardar.mensaje}
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '13px 16px', background: 'var(--bg-elev)' }}>
                            <label style={{ flex: 1, minWidth: 260 }}>
                              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                                Observación · obligatoria
                              </span>
                              <input
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                placeholder="Por qué esta persona se aparta de lo que su grupo le da"
                                style={{ ...IN, background: 'var(--bg-card)' }}
                              />
                            </label>
                            <button
                              onClick={() => void guardar()}
                              disabled={!puedeGuardar}
                              title={impedimentoAlGuardar || undefined}
                              aria-describedby="motivo-de-la-excepcion"
                              className={puedeGuardar ? 'hov-acento-2' : undefined}
                              style={{
                                border: 0,
                                borderRadius: 6,
                                padding: '9px 18px',
                                background: 'var(--accent)',
                                color: '#fff',
                                fontSize: 12.5,
                                fontWeight: 500,
                                cursor: puedeGuardar ? 'pointer' : 'not-allowed',
                                opacity: puedeGuardar ? 1 : 0.5,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {guardando
                                ? 'Guardando…'
                                : 'Escribir la excepción de ' + (aGuardar.length === 1 ? '1 acceso' : aGuardar.length + ' accesos')}
                            </button>
                          </div>
                          <p id="motivo-de-la-excepcion" style={{ margin: 0, padding: '0 16px 13px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                            {impedimentoAlGuardar !== ''
                              ? impedimentoAlGuardar
                              : 'Se escribirá la excepción de ' +
                                aGuardar.map((n) => n.acceso).join(', ') +
                                '. Los demás accesos siguen heredando de sus grupos: lo que no viaja se queda como estaba. ' +
                                (aGuardar.some((n) => n.privilegios.length === 0)
                                  ? 'Alguno va con los siete retirados, o sea NEGADO: la fila se escribe en cero y ese acceso deja de heredar. '
                                  : '') +
                                'El cambio queda en la auditoría como PERMISO, con tu usuario y la observación.'}
                          </p>
                        </>
                      )}
                    </section>
                  </>
                )}
                {/* ── La matriz de un GRUPO ── */}
                {sel !== null && esGrupo && (
                  <section style={TARJETA}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                      <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        Permisos efectivos
                        <span style={{ marginLeft: 9, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>
                          {permisosReales.cargando ? 'leyendo…' : permisosReales.datos ? 'del backend' : 'sin leer'}
                        </span>
                      </h2>
                      {['Sensibles', 'Todos'].map((m) => (
                        <PastillaDeFiltro key={m} label={m} on={modFiltro === m} onClick={() => setModFiltro(m)} />
                      ))}
                      {modulosOfrecidos.map((m) => (
                        <PastillaDeFiltro
                          key={m.id}
                          label={m.nombre}
                          on={modFiltro === String(m.id)}
                          onClick={() => setModFiltro(String(m.id))}
                        />
                      ))}
                    </div>

                    {permisosReales.error !== null && (
                      <div style={{ padding: '14px 16px' }}>
                        <FalloDeLectura
                          error={permisosReales.error}
                          que="los permisos de este grupo"
                          acceso="permisos"
                          alReintentar={permisosReales.reintentar}
                        />
                      </div>
                    )}
                    {permisosReales.cargando && (
                      <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo los permisos del grupo…</p>
                    )}
                    {accesosReales.datos === null && accesosReales.error === null && !accesosReales.cargando && (
                      <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Sin catálogo de accesos que mostrar.</p>
                    )}

                    {permisosReales.datos !== null && accesosReales.datos !== null && (
                      <>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)', position: 'sticky', left: 0, borderRight: '1px solid var(--line)' }}>
                                  Acceso
                                </th>
                                {PRIVILEGIOS.map((p) => (
                                  <th key={p} title={p} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', background: 'var(--bg-elev)', whiteSpace: 'nowrap' }}>
                                    {ROTULO_DEL_PRIVILEGIO[p]}
                                  </th>
                                ))}
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)' }}>
                                  Estado
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {matriz.filas.length === 0 && (
                                <tr>
                                  <td colSpan={PRIVILEGIOS.length + 2} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)' }}>
                                    Ningún acceso del catálogo cae en este filtro.
                                  </td>
                                </tr>
                              )}
                              {matriz.filas.map((f) => (
                                <tr key={f.acceso.codigo} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: f.sensible && f.vigentes.length > 0 ? 'var(--warn-bg)' : 'transparent' }}>
                                  {/* La primera celda se fija igual que su cabecera y con fondo
                                      opaco: sin esto, al desplazarse en horizontal la columna de
                                      rótulos se salía del marco y la fila quedaba en casillas
                                      anónimas. */}
                                  <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', position: 'sticky', left: 0, borderRight: '1px solid var(--line)', background: f.sensible && f.vigentes.length > 0 ? 'var(--warn-bg)' : 'var(--bg-card)' }}>
                                    <span style={{ display: 'block' }}>{f.acceso.nombre}</span>
                                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>
                                      {f.modulo + (f.sensible ? ' · mueve dinero' : '')}
                                    </span>
                                  </td>
                                  {f.celdas.map((c) => (
                                    <td key={c.privilegio} style={{ padding: '6px 8px', textAlign: 'center' }}>
                                      <button
                                        onClick={() => alternar(f, c)}
                                        aria-pressed={c.on}
                                        aria-label={ROTULO_DEL_PRIVILEGIO[c.privilegio] + ' en ' + f.acceso.nombre}
                                        title={c.on ? 'Otorgado: pulsa para retirarlo' : 'Sin otorgar: pulsa para otorgarlo'}
                                        style={{
                                          display: 'grid',
                                          placeItems: 'center',
                                          width: 26,
                                          height: 26,
                                          borderRadius: 6,
                                          cursor: 'pointer',
                                          border: `1px solid ${c.on ? 'var(--accent)' : 'var(--line-2)'}`,
                                          background: c.on ? 'var(--accent)' : 'var(--bg-card)',
                                          color: c.on ? '#fff' : 'var(--accent-ink)',
                                        }}
                                      >
                                        {c.on && <Icono d={['M5 12.5l4.5 4.5L19 7']} tam={12} grosor={3} />}
                                      </button>
                                    </td>
                                  ))}
                                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                    <span style={INS[f.tocada ? 'warn' : f.vigentes.length === 0 ? 'neutro' : 'ok']}>
                                      {f.tocada ? 'Sin guardar' : f.vigentes.length === 0 ? 'Sin permiso' : f.vigentes.length + ' de 7'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* ── Guardar: la única escritura de esta pantalla ──
                            Manda SÓLO los accesos tocados. `PermisosController`
                            hace un upsert por acceso y deja los ausentes como
                            estaban, así que mandar las 134 sería escribir 134
                            permisos y 134 filas de auditoría por un clic. */}
                        {errorAlGuardar !== null && (
                          <div style={{ padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bad-bg)', color: 'var(--bad-fg)', fontSize: 12.5, lineHeight: 1.55 }}>
                            <strong style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>No se guardó nada</strong>
                            {errorAlGuardar.mensaje}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                          <label style={{ flex: 1, minWidth: 260 }}>
                            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 5 }}>
                              Observación · obligatoria
                            </span>
                            <input
                              value={observacion}
                              onChange={(e) => setObservacion(e.target.value)}
                              placeholder="Por qué cambia el permiso, y con qué documento"
                              style={{ ...IN, background: 'var(--bg-card)' }}
                            />
                          </label>
                          <button
                            onClick={() => void guardar()}
                            disabled={!puedeGuardar}
                            title={impedimentoAlGuardar || undefined}
                            aria-describedby="motivo-de-guardar"
                            className={puedeGuardar ? 'hov-acento-2' : undefined}
                            style={{
                              border: 0,
                              borderRadius: 6,
                              padding: '9px 18px',
                              background: 'var(--accent)',
                              color: '#fff',
                              fontSize: 12.5,
                              fontWeight: 500,
                              cursor: puedeGuardar ? 'pointer' : 'not-allowed',
                              opacity: puedeGuardar ? 1 : 0.5,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {guardando ? 'Guardando…' : 'Guardar ' + (aGuardar.length === 1 ? '1 acceso' : aGuardar.length + ' accesos')}
                          </button>
                        </div>
                        <p id="motivo-de-guardar" style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                          {impedimentoAlGuardar !== ''
                            ? impedimentoAlGuardar
                            : 'Se mandarán ' +
                              aGuardar.map((n) => n.acceso).join(', ') +
                              '. Los demás accesos del grupo no se tocan. El cambio queda en la auditoría como PERMISO, con tu usuario y la observación.'}
                        </p>
                      </>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ AUDITORÍA ══════════ */}
        {dest === 'auditoria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Quién hizo qué, cuándo y desde dónde. Lo que se mira aquí no son los accesos: son los actos que mueven dinero —anulaciones,
              bajas de deuda, cambios de permiso— y quién los firmó. Se listan del más reciente al más antiguo.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end', borderBottom: '1px solid var(--line)' }}>
                {audFiltros.map((f) => (
                  <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{f.label}</span>
                    {f.tipo === 'sel' && (
                      <select value={String(val(f.k, f.valor))} onChange={(e) => set(f.k, e.target.value)} style={{ ...IN, fontSize: 13.5 }}>
                        {(f.opts || []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )}
                    {f.tipo === 'fecha' && (
                      <input type="date" value={String(val(f.k, f.valor))} onChange={(e) => set(f.k, e.target.value)} style={IN} />
                    )}
                    {f.tipo === 'texto' && (
                      <input value={String(val(f.k, f.valor))} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph} style={IN} />
                    )}
                  </label>
                ))}
              </div>

              {/* El artboard ponía aquí tres pastillas de «Riesgo» —Todos, Alto,
                  Medio—. El riesgo NO existe en el backend: es una calificación
                  que nadie escribe, y las pastillas no acotaban nada — se
                  pintaban a sí mismas y la tabla no cambiaba (#544). Un control
                  que no controla nada se retira. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                  Ejercicio {pref.ejercicio}
                  {auditoria.cargando ? ' · leyendo…' : ''}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {auditoria.datos === null
                    ? SIN_DATO
                    : `${filasDeAuditoria.length} de ${auditoria.datos.totalElementos.toLocaleString('es-PE')} registros`}
                </span>
              </div>

              {auditoria.error !== null && (
                <div style={{ padding: '14px 16px' }}>
                  <FalloDeLectura error={auditoria.error} que="la bitácora" acceso="auditoria" alReintentar={auditoria.reintentar} />
                </div>
              )}

              {auditoria.datos !== null && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
                    <thead>
                      <tr>
                        {COLUMNAS_DE_LA_BITACORA.map((c) => (
                          <th key={c} style={TH}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasDeAuditoria.length === 0 && (
                        <tr>
                          <td colSpan={COLUMNAS_DE_LA_BITACORA.length} style={{ ...TD, whiteSpace: 'normal', color: 'var(--ink-3)' }}>
                            Ningún movimiento del ejercicio {pref.ejercicio} cumple estos filtros.
                          </td>
                        </tr>
                      )}
                      {filasDeAuditoria.map((r) => (
                        <tr key={r.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={TD1}>{instante(r.fecha)}</td>
                          <td style={TD}>{r.usuario}</td>
                          <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.tabla}</td>
                          <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'normal' }}>
                            <span style={{ display: 'block', maxWidth: 220, overflowWrap: 'anywhere' }}>{r.clave}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={INS[tonoDeLaOperacion(r.operacion)]}>{r.operacion}</span>
                          </td>
                          {/* La observacion es la columna larga y la IP es la
                              ultima: sin acotarla, la observacion empuja la IP
                              fuera del marco y la fila se queda sin el dato
                              desde donde se hizo el acto. */}
                          <td style={{ ...TD, whiteSpace: 'normal' }}>
                            <span style={{ display: 'block', maxWidth: 300, textWrap: 'pretty' }}>{r.observacion}</span>
                          </td>
                          <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.origenIp ?? SIN_DATO}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* La bitácora del ejercicio son miles de filas y la página son 20.
                  Sin estos dos botones sólo se podía ver una página de 74, y el
                  pie decía «20 de 1 481» como si eso fuera todo. */}
              {auditoria.datos !== null && (
                <Paginador
                  pagina={auditoria.datos.pagina}
                  totalPaginas={auditoria.datos.totalPaginas}
                  hayMas={auditoria.datos.hayMas}
                  ir={setPaginaAud}
                />
              )}

              <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                La bitácora no se edita ni se borra: es lo que se presenta cuando alguien pregunta por qué desapareció una deuda.
              </p>
            </section>
          </div>
        )}

        {/* ══════════ SISTEMA ══════════ */}
        {dest === 'sistema' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Lo que afecta a todo el sistema y no a un usuario: el ejercicio de trabajo, los parámetros que los doce módulos leen, la
              contraseña propia y las copias de seguridad.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {SIS.map((t, i) => {
                const on = sisIdx === i;
                return (
                  <button
                    key={t.label}
                    onClick={() => setSisTab(i)}
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

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{sisDef.titulo}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  {sisDef.nota}
                </p>
              </div>
              {sisDef.campos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
                  {sisDef.campos.map((f) => (
                    <CampoDelSistema key={f.k} campo={f} valor={val(f.k, f.v === undefined ? '' : f.v)} onCambio={(v) => set(f.k, v)} />
                  ))}
                </div>
              )}

              {enParametros && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {conjuntos.error !== null && (
                    <div style={{ padding: '14px 16px' }}>
                      <FalloDeLectura error={conjuntos.error} que="los conjuntos de parámetros" acceso="parametros" alReintentar={conjuntos.reintentar} />
                    </div>
                  )}
                  {conjuntos.cargando && (
                    <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo los conjuntos…</p>
                  )}
                  {conjuntos.datos !== null && conjuntos.datos.contenido.length === 0 && (
                    <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Esta municipalidad no tiene ningún conjunto de parámetros. Mientras no haya uno sellado, ningún cálculo
                      tributario del ejercicio puede resolverse: las operaciones que lo necesiten contestan nombrando la cifra que
                      les falta, y eso es lo correcto — no un cero.
                    </p>
                  )}
                  {conjuntos.datos !== null && conjuntos.datos.contenido.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                        <thead>
                          <tr>
                            {(['Ejercicio', 'Versión', 'Estado', 'Sellado el', 'Selló'] as const).map((c) => (
                              <th key={c} style={TH}>
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {conjuntos.datos.contenido.map((c) => (
                            <tr key={c.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                              <td style={TD1}>{c.ejercicio}</td>
                              <td style={TDN}>{c.version}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={INS[c.estado === 'SELLADO' ? 'ok' : 'warn']}>{c.estado}</span>
                              </td>
                              <td style={TD}>{c.fechaSellado === null ? SIN_DATO : c.fechaSellado.replace('T', ' ').slice(0, 16)}</td>
                              <td style={TD}>{c.usuarioSellado ?? SIN_DATO}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Las copias, contra `POST /seguridad/respaldos`. El artboard traía
                  cuatro filas inventadas y un «La última restauración verificada
                  es de hace 94 días» que no salía de ninguna parte. Desde #558 el
                  recurso SÍ publica esa columna, y la celda dice el instante o
                  «Nunca» —que es lo que significa el nulo—, nunca una cifra
                  derivada: «hace N días» se lee como una medición. */}
              {enCopias && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {respaldos.error !== null && (
                    <div style={{ padding: '14px 16px' }}>
                      <FalloDeLectura error={respaldos.error} que="las copias de seguridad" acceso="respaldo" alReintentar={respaldos.reintentar} />
                    </div>
                  )}
                  {respaldos.cargando && (
                    <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo las copias…</p>
                  )}
                  {respaldos.datos !== null && respaldos.datos.contenido.length === 0 && (
                    <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      El backend no tiene registrada ninguna copia de esta municipalidad. No quiere decir que no se estén haciendo: las
                      hace el proceso de despliegue, y lo que se ve aquí es lo que ese proceso haya registrado.
                    </p>
                  )}
                  {respaldos.datos !== null && respaldos.datos.contenido.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                        <thead>
                          <tr>
                            {(['Inicio', 'Fin', 'Resultado', 'Destino', 'Tamaño', 'Restauración verificada'] as const).map((c, j) => (
                              <th key={c} style={j === 4 ? THN : TH}>
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {respaldos.datos.contenido.map((r) => (
                            <tr key={r.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                              <td style={TD1}>{r.inicio.replace('T', ' ').slice(0, 16)}</td>
                              <td style={TD}>{r.fin === null ? SIN_DATO : r.fin.replace('T', ' ').slice(0, 16)}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={INS[r.resultado === 'EXITO' ? 'ok' : 'bad']}>{r.resultado}</span>
                              </td>
                              <td style={TD}>{r.destino}</td>
                              <td style={TDN}>{r.tamanoBytes === null ? SIN_DATO : enGigabytes(r.tamanoBytes)}</td>
                              <td style={TD}>
                                {r.ultimaRestauracionVerificada === null ? (
                                  <span title="Esta copia no se ha restaurado nunca para comprobar que se puede restaurar (RNF-079). No es un fallo de la copia: es que nadie lo ha probado.">
                                    Nunca
                                  </span>
                                ) : (
                                  <span title={r.ultimaRestauracionVerificadaPor ?? ''}>
                                    {r.ultimaRestauracionVerificada.replace('T', ' ').slice(0, 16)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Quién eres, que es lo único que la petición lleva además del
                  motivo. El artboard no dibujaba nada de esto: daba por hecho
                  que la pantalla sabía a quién estaba cambiando la contraseña, y
                  hasta #559 no lo sabía. */}
              {enClave && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                  {identidad.error !== null && (
                    <FalloDeLectura error={identidad.error} que="quién eres en esta municipalidad" alReintentar={identidad.reintentar} />
                  )}
                  {identidad.cargando && (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo quién eres…</p>
                  )}
                  {identidad.datos !== null && (
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Se cambia la contraseña de{' '}
                      <strong style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{identidad.datos.nombre}</strong>{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>({identidad.datos.cuenta})</span>, el usuario n.º{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{identidad.datos.usuarioId}</span> de esta municipalidad. Sólo
                      la propia: el servidor compara la cuenta de tu token con la de ese identificador y rechaza cualquier otro.
                    </p>
                  )}
                  {errorAlCambiar !== null && (
                    <Aviso tono="bad" titulo="No se inició ningún cambio">
                      {errorAlCambiar.mensaje}
                    </Aviso>
                  )}
                  {cambioIniciado !== null && (
                    <Aviso tono="ok" titulo="Cambio iniciado, y anotado en la bitácora">
                      El backend no ha recibido ninguna contraseña: registró el acto con tu motivo y contestó quién la guarda
                      —<span style={{ fontFamily: 'var(--font-mono)' }}>{cambioIniciado.gestionadaPor}</span>— y a qué ruta suya
                      hay que ir —<span style={{ fontFamily: 'var(--font-mono)' }}>{cambioIniciado.destino}</span>—. La ruta es la
                      que contestó el servidor; lo único que pone esta pantalla es la base, que es el mismo emisor con el que
                      entraste.
                      <span style={{ display: 'block', marginTop: 9 }}>
                        <a
                          href={enElProveedorDeIdentidad(cambioIniciado.destino)}
                          className="hov-acento-2"
                          style={{
                            display: 'inline-block',
                            borderRadius: 6,
                            padding: '9px 18px',
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 12.5,
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          Ir a {enElProveedorDeIdentidad(cambioIniciado.destino)}
                        </a>
                      </span>
                    </Aviso>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p id="motivo-de-la-primaria" style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {impedimentoDeSistema === '' ? sisDef.pie : impedimentoDeSistema}
                </p>
                <button
                  onClick={() => void cambiarLaClave()}
                  disabled={impedimentoDeSistema !== '' || cambiandoClave}
                  title={impedimentoDeSistema || undefined}
                  aria-describedby="motivo-de-la-primaria"
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '10px 20px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: impedimentoDeSistema === '' && !cambiandoClave ? 'pointer' : 'not-allowed',
                    opacity: impedimentoDeSistema === '' && !cambiandoClave ? 1 : 0.5,
                  }}
                >
                  {cambiandoClave ? 'Iniciando…' : sisDef.primaria}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ══════════ NUEVO USUARIO ══════════ */}
        {dest === 'alta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              El alta crea la cuenta, no los permisos. Los permisos se dan al grupo y se heredan; darlos uno a uno es lo que se
              descontrola.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '13px 16px',
                border: '1px solid var(--line-2)',
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
                strokeWidth={1.8}
                strokeLinecap="round"
                style={{ color: 'var(--warn-fg)', flex: '0 0 auto', marginTop: 1 }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 8.4v.02M12 11.4v4.2" />
              </svg>
              <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
                <strong>Esta alta crea la fila del padrón, no la cuenta con la que se entra.</strong> Una persona son{' '}
                <strong>dos mitades</strong>: esta fila y su cuenta en el proveedor de identidad. La segunda se declara en{' '}
                <code>despliegue/identidad/municipalidades/&lt;ubigeo&gt;.json</code>, que es la fuente versionada que la recrea si el
                servidor se reconstruye (ADR-0012 §5). Mientras esa cuenta no exista, esta persona aparece en los listados, admite
                permisos y <strong>no puede entrar</strong>.
              </p>
            </div>

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Nuevo usuario</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  <strong>No hay campo de contraseña, y no puede haberlo</strong>: la credencial la guarda el proveedor de identidad y
                  este sistema no la recibe nunca (ADR-0005). El <em>Usuario</em> es lo que une esta fila con esa cuenta, así que tiene
                  que ser el mismo con el que la persona entra.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
                <CampoDelSistema
                  campo={{ k: 'nUsuario', l: 'Usuario', t: 'text', ph: 'Sin espacios ni tildes', ayuda: 'Es el nombre con el que firma cada acto en la bitácora, y el que tiene que coincidir con su cuenta del proveedor' }}
                  valor={altaCuenta}
                  onCambio={(v) => setAltaCuenta(String(v))}
                />
                <CampoDelSistema
                  campo={{ k: 'nNombre', l: 'Nombre y apellidos', t: 'text', ancho: true, ph: 'APELLIDOS, NOMBRES' }}
                  valor={altaNombre}
                  onCambio={(v) => setAltaNombre(String(v))}
                />
                <CampoDelSistema
                  campo={{ k: 'nCorreo', l: 'Correo', t: 'text', ph: 'Para el enlace del proveedor de identidad' }}
                  valor={altaCorreo}
                  onCambio={(v) => setAltaCorreo(String(v))}
                />
                <CampoDelSistema
                  campo={{ k: 'nVigencia', l: 'Vigencia hasta', t: 'text', ph: 'AAAA-MM-DD · opcional', ayuda: 'Pasada esa fecha la cuenta deja de valer, sin que nadie tenga que acordarse' }}
                  valor={altaVigencia}
                  onCambio={(v) => setAltaVigencia(String(v))}
                />
                <CampoDelSistema
                  campo={{ k: 'nMotivo', l: 'Motivo del alta', t: 'text', ancho: true, ph: 'Obligatorio: queda en la auditoría con tu usuario', ayuda: 'Toda modificación se guarda con el motivo de quien la hace (RNF-052)' }}
                  valor={altaObservacion}
                  onCambio={(v) => setAltaObservacion(String(v))}
                />
              </div>
              <div style={{ padding: '0 16px 17px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
                  Grupos de esta municipalidad ·{' '}
                  <span style={{ fontWeight: 400 }}>
                    el alta no afilia a ninguno: eso se hace después, y es lo que le da permisos
                  </span>
                </p>
                {gruposReales.error !== null && (
                  <FalloDeLectura error={gruposReales.error} que="los grupos" acceso="grupos" alReintentar={gruposReales.reintentar} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '10px 16px' }}>
                  {grupos.map((g) => (
                    <span key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)' }}>{g.nombre}</span>
                      {!g.habilitado && <span style={INS.bad}>Deshabilitado</span>}
                    </span>
                  ))}
                  {grupos.length === 0 && (
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                      {gruposReales.cargando
                        ? 'Leyendo los grupos…'
                        : gruposReales.error !== null
                          ? 'No se pudieron leer: mira el aviso de arriba.'
                          : 'Esta municipalidad no tiene ningún grupo.'}
                    </span>
                  )}
                </div>
              </div>
              {errorDelAlta !== null && (
                <div style={{ margin: '0 16px 14px', padding: '11px 13px', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--bad-fg)', borderRadius: 8, background: 'var(--bad-bg)' }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--bad-fg)', textWrap: 'pretty' }}>
                    {errorDelAlta.mensaje}
                  </p>
                </div>
              )}
              {altaHecha !== null && (
                <div style={{ margin: '0 16px 14px', padding: '11px 13px', border: '1px solid var(--line-2)', borderLeft: '3px solid var(--warn-fg)', borderRadius: 8, background: 'var(--warn-bg)' }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--warn-fg)', textWrap: 'pretty' }}>
                    <strong>«{altaHecha}» ya está en el padrón, y todavía no puede entrar.</strong> Faltan las dos cosas que esta
                    pantalla no hace: declarar su cuenta en <code>despliegue/identidad/</code> —que es lo que le da con qué
                    autenticarse— y afiliarla a un grupo, que es lo que le da permisos.
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p id="motivo-del-alta" style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {impedimentoDelAlta !== ''
                    ? impedimentoDelAlta
                    : 'Se creará la fila del padrón. La cuenta del proveedor de identidad se declara aparte.'}
                </p>
                <button
                  onClick={() => void darDeAlta()}
                  disabled={!puedeDarDeAlta}
                  title={impedimentoDelAlta || undefined}
                  aria-describedby="motivo-del-alta"
                  className={puedeDarDeAlta ? 'hov-acento-2' : undefined}
                  style={{ border: 0, borderRadius: 6, padding: '10px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: puedeDarDeAlta ? 'pointer' : 'not-allowed', opacity: puedeDarDeAlta ? 1 : 0.5 }}
                >
                  {dandoDeAlta ? 'Creando…' : 'Crear la fila del padrón'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}

/**
 * De donde le viene a una cuenta lo que puede hacer sobre un acceso (#543).
 *
 * Son seis estados y **ninguno se puede fundir con otro**, porque las
 * diferencias son justo las que se leen mal:
 *
 * - **Tocada y sin guardar** (#585) ya no viene de donde venia: las casillas
 *   que se ven son las editadas, y seguir diciendo «Grupo · X» describiria un
 *   origen que ya no es el de lo dibujado.
 *
 * - **Sin fila** es «no hay nada configurado». La lectura no devuelve una fila
 *   por acceso sino una por acceso configurado: serian 134 vacias por cuenta.
 * - **Fila con cero privilegios** solo la produce una excepcion que NIEGA, y es
 *   lo unico que distingue «se le nego expresamente» de «nunca lo tuvo».
 * - **Excepcion** sustituye a lo del grupo, no se suma. Por eso se dibuja en
 *   tono de aviso aunque otorgue: es una desviacion de lo que el grupo dice, y
 *   quien audita tiene que verla.
 * - **Grupo con `grupoId`** es lo heredado de UNO.
 * - **Grupo sin `grupoId`** es lo heredado de VARIOS: el backend manda el grupo
 *   solo cuando hay uno solo, porque elegir el primero por id daria un dato
 *   plausible y equivocado. Aqui eso se dice, no se rellena con el primero de
 *   los grupos de la cuenta.
 */
function origenDeLaFila(
  efectivo: PermisoEfectivo | undefined,
  nombreDelGrupo: Map<number, string>,
  tocada = false,
): { texto: string; tono: TonoDeSeguridad; ayuda: string } {
  /* Una fila tocada y sin guardar ya no viene de donde venia, y decir «Grupo ·
     Administracion» sobre casillas que el operador acaba de cambiar seria la
     mentira mas facil de esta matriz: el origen que se lee no describiria lo que
     se ve. Va primero, antes que las cinco de abajo, porque gana a todas. */
  if (tocada) {
    return {
      texto: 'Excepción · sin guardar',
      tono: 'warn',
      ayuda:
        'Estas casillas se han cambiado y todavía no se han mandado. Al guardar se escribirá una excepción propia de esta ' +
        'cuenta sobre este acceso, que sustituirá a lo que sus grupos le den aquí.',
    };
  }
  if (efectivo === undefined) {
    return {
      texto: 'Sin configurar',
      tono: 'neutro',
      ayuda:
        'La lectura no devuelve ninguna fila para este acceso: no hay nada configurado, ni por grupo ni por excepción. ' +
        'No es lo mismo que estar negado.',
    };
  }
  if (efectivo.origen === 'EXCEPCION') {
    return efectivo.privilegios.length === 0
      ? {
          texto: 'Excepción · niega',
          tono: 'bad',
          ayuda:
            'Una excepción de esta cuenta le retira el acceso. Sustituye a lo que su grupo conceda, así que aquí el ' +
            'grupo no cuenta: se le negó expresamente.',
        }
      : {
          texto: 'Excepción propia',
          tono: 'warn',
          ayuda:
            'Una excepción de esta cuenta, que SUSTITUYE a lo que sus grupos le den para este acceso. No se suma a ello: ' +
            'lo que se ve aquí es lo único que vale.',
        };
  }
  if (efectivo.grupoId === null) {
    return {
      texto: 'De más de un grupo',
      tono: 'ok',
      ayuda:
        'Lo otorga más de uno de sus grupos vigentes, así que no hay UNO que nombrar. El backend manda el grupo sólo ' +
        'cuando lo concede uno solo; elegir el primero por id sería un dato plausible y equivocado.',
    };
  }
  const nombre = nombreDelGrupo.get(efectivo.grupoId);
  return {
    texto: 'Grupo · ' + (nombre ?? '#' + efectivo.grupoId),
    tono: 'ok',
    ayuda:
      nombre === undefined
        ? 'Lo hereda del grupo ' + efectivo.grupoId + ', que no está en la lista de grupos leída.'
        : 'Lo hereda de «' + nombre + '». No tiene excepción propia sobre este acceso.',
  };
}

/** La franja de cifras de la cabecera: rótulo, valor y color del valor. */
function FranjaDeCasillas({ casillas }: { casillas: [string, string, string][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
      {casillas.map((r) => (
        <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '13px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
            {r[0]}
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 14, color: r[2] }}>{r[1]}</p>
        </div>
      ))}
    </div>
  );
}

/** Dos conjuntos de privilegios, iguales sin importar el orden. Es lo que
 *  decide si una fila «se tocó»: marcar y desmarcar la misma casilla no es un
 *  cambio, y mandarlo escribiría una fila de auditoría por nada. */
function mismoConjunto(a: readonly Privilegio[], b: readonly Privilegio[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x) => b.indexOf(x) >= 0);
}

/**
 * El tono de una operación de la bitácora.
 *
 * `PERMISO` va en rojo a propósito: es el acto que cambia quién puede hacer
 * qué, y es además el más numeroso del ejercicio.
 */
function tonoDeLaOperacion(operacion: string): TonoDeSeguridad {
  if (operacion === 'ANULACION' || operacion === 'REVERSION' || operacion === 'PERMISO') return 'bad';
  if (operacion === 'ACCESO') return 'neutro';
  return 'warn';
}

/** Los bytes de un respaldo, en la unidad en que se leen. No es dinero. */
function enGigabytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return (gb >= 1 ? gb.toFixed(1) + ' GB' : (bytes / 1024 ** 2).toFixed(0) + ' MB');
}

/** Una pastilla del filtro de la matriz. */
function PastillaDeFiltro({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
        borderRadius: 999,
        padding: '5px 11px',
        cursor: 'pointer',
        fontSize: 11.5,
        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
        color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
      }}
    >
      {label}
    </button>
  );
}

/** Un campo de «Sistema»: los cinco tipos que el artboard declara —texto,
 *  desplegable, contraseña, casilla y solo lectura— con su ayuda. */
function CampoDelSistema({
  campo,
  valor,
  onCambio,
  apagado = false,
}: {
  campo: CampoDeSistema;
  valor: string | boolean;
  onCambio: (v: string | boolean) => void;
  apagado?: boolean;
}) {
  const t = campo.t === undefined ? 'text' : campo.t;
  return (
    <label data-ancho={campo.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{campo.l}</span>
      {t === 'text' && (
        <input value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={campo.ph} disabled={apagado} style={{ ...IN, opacity: apagado ? 0.55 : 1 }} />
      )}
      {t === 'clave' && (
        <input type="password" value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={campo.ph} disabled={apagado} style={IN} />
      )}
      {t === 'sel' && (
        <select value={String(valor)} onChange={(e) => onCambio(e.target.value)} disabled={apagado} style={IN}>
          {(campo.o || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      {t === 'chk' && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}>
          <input
            type="checkbox"
            checked={valor === true}
            onChange={(e) => onCambio(e.target.checked)}
            disabled={apagado}
            style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{campo.ph}</span>
        </span>
      )}
      {t === 'ro' && (
        <span style={{ display: 'block', minHeight: 38, lineHeight: '19px', padding: '9px 10px', border: '1px dashed var(--line-2)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)' }}>
          {String(valor)}
        </span>
      )}
      {campo.ayuda && (
        <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{campo.ayuda}</span>
      )}
    </label>
  );
}

/**
 * Las columnas de la bitacora, en la forma que el recurso publica.
 *
 * El artboard dibuja «Modulo» y «Riesgo», y **ninguna de las dos existe en el
 * backend**: el riesgo es una calificacion que nadie ha escrito, y el modulo
 * habria que deducirlo de la tabla tocada. Y su «Acto» habla otro idioma que
 * el enumerado `Operacion`. Se usan las del recurso: la tabla y la clave dicen
 * sobre que fila se actuo, que es lo que se pregunta cuando desaparece una
 * deuda.
 */
const COLUMNAS_DE_LA_BITACORA = ['Fecha y hora', 'Usuario', 'Tabla', 'Clave', 'Operacion', 'Observacion', 'IP'];

/**
 * Los accesos que mueven dinero, por su codigo del backend.
 *
 * Es lo que tiñe la fila de la matriz, y son los que hay que mirar primero
 * cuando alguien audita quien puede que. La lista es corta a proposito: si lo
 * fuera todo, no destacaria nada.
 */
const MUEVEN_DINERO = new Set([
  'caja_tributaria',
  'caja_tasas',
  'anulacion_recibo',
  'baja_deuda',
  'alta_deuda',
  'prescripcion',
  'fraccionamiento',
  'anulacion_convenio',
  'aranceles',
  'permisos',
  'accesos',
  'condonacion',
]);
