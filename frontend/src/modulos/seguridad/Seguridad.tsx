import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Icono } from '../../ds/Icono';
import {
  fijarPermisosDelGrupo,
  listarAccesos,
  listarAuditoria,
  listarConjuntosDeParametros,
  listarGrupos,
  listarModulos,
  listarRespaldos,
  listarUsuarios,
  permisosDelGrupo,
  OPERACIONES,
  PRIVILEGIOS,
  ROTULO_DEL_PRIVILEGIO,
  type Acceso,
  type Privilegio,
} from '../../api/seguridad';
import { FalloDeLectura } from '../../api/Fallo';
import { ErrorDeApi } from '../../api/cliente';
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
  /* Lo tocado en esta sesión, por grupo y por código de acceso. La clave es el
     id del grupo del BACKEND, no su nombre: dos municipalidades tienen grupos
     que se llaman igual, y el nombre no identifica nada del otro lado. */
  const [edicion, setEdicion] = useState<Record<string, Record<string, Privilegio[]>>>({});
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorAlGuardar, setErrorAlGuardar] = useState<ErrorDeApi | null>(null);
  const [sisTab, setSisTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});

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

  /* La observacion es de UN cambio, no de la sesion: al cambiar de grupo se
     vacia. Sin esto, el motivo tecleado para el grupo A viaja con el cambio del
     grupo B —la fila de auditoria diria por que se toco otro grupo—, que es
     justo lo que la regla 10 existe para que no pase. */
  useEffect(() => {
    setObservacion('');
    setErrorAlGuardar(null);
  }, [sel?.tipo, sel?.id]);

  /* ── La matriz: sólo de un GRUPO, y sólo del backend ────────────
     De un grupo se reconstruye con dos lecturas. De un USUARIO no: no hay
     lectura de pertenencia a grupo, la excepción propia no tiene ruta y
     `PermisoResource` ni siquiera declara `usuarioId` (#543). Antes se rellenaba
     con el juego de datos y se rotulaba «del juego de datos», que no basta: la
     matriz se veía igual de real que la del grupo de al lado. */
  const propios = useMemo(() => {
    const m: Record<string, Privilegio[]> = {};
    (permisosReales.datos ?? []).forEach((p) => {
      m[p.acceso] = p.privilegios.slice();
    });
    return m;
  }, [permisosReales.datos]);

  const editados = edicion[String(sel?.id ?? '')] ?? {};

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
    let nOtorgados = 0;
    let nEspeciales = 0;
    const filas: FilaDeMatriz[] = accesosVisibles.map((a) => {
      const vigentes = editados[a.codigo] ?? propios[a.codigo] ?? [];
      const celdas = PRIVILEGIOS.map((p) => {
        const on = vigentes.indexOf(p) >= 0;
        if (on) nOtorgados++;
        if (on && p === 'ESPECIAL') nEspeciales++;
        return { privilegio: p, on };
      });
      return {
        acceso: a,
        vigentes,
        celdas,
        tocada: editados[a.codigo] !== undefined && !mismoConjunto(editados[a.codigo], propios[a.codigo] ?? []),
        modulo: nombreDelModulo.get(a.moduloId) ?? SIN_DATO,
        sensible: MUEVEN_DINERO.has(a.codigo),
      };
    });
    return { filas, nOtorgados, nEspeciales };
  }, [accesosVisibles, editados, propios, nombreDelModulo]);

  /* Lo que se va a mandar: **sólo los accesos que se tocaron**, mirando la
     edición entera y no las filas en pantalla. Cuáles están en pantalla depende
     del filtro, y un cambio hecho con otro filtro puesto no se puede perder por
     eso. */
  const aGuardar = useMemo(
    () =>
      Object.keys(editados)
        .filter((codigo) => !mismoConjunto(editados[codigo], propios[codigo] ?? []))
        .map((codigo) => ({ acceso: codigo, privilegios: editados[codigo] })),
    [editados, propios],
  );

  const impedimentoAlGuardar = !esGrupo
    ? 'La matriz de un usuario no se lee del backend, así que tampoco se escribe (#543).'
    : permisosReales.datos === null
      ? 'Todavía no se han leído los permisos de este grupo.'
      : aGuardar.length === 0
        ? 'No has cambiado ninguna casilla: no hay nada que guardar.'
        : observacion.trim() === ''
          ? 'Falta la observación: toda modificación se guarda con el motivo de quien la hace (RNF-052).'
          : '';
  const puedeGuardar = impedimentoAlGuardar === '' && !guardando;

  const alternar = (fila: FilaDeMatriz, c: CeldaDeMatriz) => {
    if (sel === null || !esGrupo) return;
    const actual = fila.vigentes.slice();
    const i = actual.indexOf(c.privilegio);
    if (i >= 0) actual.splice(i, 1);
    else actual.push(c.privilegio);
    const clave = String(sel.id);
    setEdicion((x) => ({ ...x, [clave]: { ...(x[clave] ?? {}), [fila.acceso.codigo]: actual } }));
  };

  const guardar = async () => {
    if (!puedeGuardar || sel === null) return;
    setGuardando(true);
    setErrorAlGuardar(null);
    try {
      await fijarPermisosDelGrupo(sel.id, aGuardar, observacion.trim());
      setEdicion((x) => ({ ...x, [String(sel.id)]: {} }));
      setObservacion('');
      permisosReales.reintentar();
      toast(
        aGuardar.length === 1
          ? 'Guardado 1 acceso. Queda en la auditoría con tu usuario.'
          : `Guardados ${aGuardar.length} accesos. Quedan en la auditoría con tu usuario.`,
      );
    } catch (fallo) {
      setErrorAlGuardar(
        fallo instanceof ErrorDeApi ? fallo : new ErrorDeApi('ERROR_INTERNO', 'No se pudo guardar', 0),
      );
    } finally {
      setGuardando(false);
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
        /* No hay lectura de miembros —`/grupos/{id}/miembros` es sólo POST—, así
           que aquí va la descripción del grupo y nunca un recuento (#543). */
        nota: g.descripcion ?? 'Sin descripción',
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
  }, [q, grupos, usuarios]);

  /* ── Los hallazgos del panel: los que SÍ se pueden calcular ─────
     El artboard listaba cuatro y ninguno se podía: «permiso Total» y «cuentas
     inactivas con permisos» necesitan la matriz de un usuario (#543), la
     caducidad de la contraseña la gobierna el proveedor de identidad y no este
     sistema, y «restauración sin verificar» no es un campo de `RespaldoResource`.
     Los tres de aquí salen de columnas que las dos lecturas ya traen. */
  const hoy = new Date().toISOString().slice(0, 10);
  const cuentasDeshabilitadas = usuarios.filter((u) => !u.habilitado);
  const cuentasVencidas = usuarios.filter((u) => u.vigenciaHasta !== null && u.vigenciaHasta < hoy);
  const gruposDeshabilitados = grupos.filter((g) => !g.habilitado);

  const hallazgos = [
    {
      etiqueta: 'Cuenta',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Cuentas deshabilitadas',
      detalle:
        cuentasDeshabilitadas.length === 0
          ? 'Ninguna cuenta del padrón está deshabilitada.'
          : 'No pueden entrar, y conservan lo que tuvieran configurado: ' +
            cuentasDeshabilitadas.map((u) => u.cuenta).join(', ') +
            '.',
      conteo: String(cuentasDeshabilitadas.length),
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
    /* Los siete del enumerado `Operacion`, y sólo esos. El desplegable ofrecía
       antes `ELIMINACION` —que es un PRIVILEGIO y devuelve siempre 0 filas— y se
       dejaba fuera `PERMISO`, que son 1 160 de las 1 481 del ejercicio. */
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
                    {cuentasDeshabilitadas.length + cuentasVencidas.length + gruposDeshabilitados.length} hallazgos
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
                  Faltan cuatro hallazgos que el diseño pedía y hoy no se pueden calcular: <strong>quién tiene el privilegio
                  Especial</strong> y <strong>qué cuenta deshabilitada conserva permisos</strong> necesitan la matriz de un usuario, que
                  ninguna lectura publica (#543); la <strong>caducidad de la contraseña</strong> la gobierna el proveedor de identidad y
                  no este sistema; y la <strong>última restauración verificada</strong> no es un campo de la consulta de respaldos. Un
                  permiso total sobre un módulo tributario permite anular recibos y dar de baja deuda: no es una preferencia, es la llave
                  de la caja, y por eso no se enseña una cifra inventada en su sitio.
                </p>
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
                      {r.fecha.replace('T', ' ').slice(0, 16)}
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
              Elige un grupo y mira qué puede hacer. Los permisos se dan al grupo y se heredan: es la forma de darlos que se puede
              revisar, y la única que este sistema publica para leer.
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
                            ? /* Nunca «N miembros»: `/grupos/{id}/miembros` es sólo
                                 POST, así que ese recuento no existe (#543). */
                              'Grupo · el backend no publica sus miembros (#543)'
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                        {(
                          [
                            ['Privilegios otorgados', permisosReales.datos ? String(matriz.nOtorgados) : SIN_DATO, 'var(--ink)'],
                            ['Con privilegio Especial', permisosReales.datos ? String(matriz.nEspeciales) : SIN_DATO, matriz.nEspeciales > 0 ? 'var(--bad-fg)' : 'var(--ink-3)'],
                            ['Sin guardar', String(aGuardar.length), aGuardar.length > 0 ? 'var(--warn-fg)' : 'var(--ink-3)'],
                            [
                              'Accesos mostrados',
                              accesosReales.datos
                                ? accesosVisibles.length + ' de ' + accesosReales.datos.totalElementos
                                : SIN_DATO,
                              'var(--ink-3)',
                            ],
                          ] as [string, string, string][]
                        ).map((r) => (
                          <div key={r[0]} style={{ background: 'var(--bg-card)', padding: '13px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                              {r[0]}
                            </p>
                            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 14, color: r[2] }}>{r[1]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── La matriz de un USUARIO: no la hay ──
                    Y decirlo es lo único honesto: la excepción propia de un
                    usuario SUSTITUYE a lo que le da el grupo —no se suma—, así
                    que una matriz mal reconstruida no se equivoca de poco. */}
                {sel !== null && !esGrupo && (
                  <section style={{ ...TARJETA, padding: '16px 16px 17px' }}>
                    <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      Permisos efectivos de esta cuenta
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                      No se pueden mostrar, y no es que estén vacíos: <strong>ninguna lectura los publica</strong>. Haría falta saber a qué
                      grupos pertenece la cuenta —<code>/seguridad/grupos/{'{id}'}/miembros</code> es sólo <code>POST</code>— y qué
                      excepción propia tiene, que no tiene ruta y cuyo recurso ni siquiera declara <code>usuarioId</code>. Está pedido en
                      el issue <strong>#543</strong>.
                    </p>
                    <p style={{ margin: '9px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-4)', maxWidth: '76ch', textWrap: 'pretty' }}>
                      Importa cómo se publique: una excepción de usuario <strong>sustituye</strong> a lo que el grupo concede para ese
                      acceso —otorgue o niegue—, no se suma. Deducirla comparando dos listas obliga a reimplementar esa precedencia, que
                      es justo la que no se puede equivocar.
                    </p>
                    <p style={{ margin: '9px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)' }}>
                      Lo que sí se puede revisar hoy es el permiso <strong>del grupo</strong>: elígelo en la lista de la izquierda.
                    </p>
                  </section>
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
                          <td style={TD1}>{r.fecha.replace('T', ' ').slice(0, 16)}</td>
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
              {auditoria.datos !== null && auditoria.datos.totalPaginas > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                  <button
                    onClick={() => setPaginaAud((n) => Math.max(0, n - 1))}
                    disabled={paginaAud === 0}
                    className="hov-linea"
                    style={{ ...BOTON_LINEA, opacity: paginaAud === 0 ? 0.45 : 1, cursor: paginaAud === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    Anterior
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                    {auditoria.datos.pagina + 1} de {auditoria.datos.totalPaginas.toLocaleString('es-PE')}
                  </span>
                  <button
                    onClick={() => setPaginaAud((n) => n + 1)}
                    disabled={!auditoria.datos.hayMas}
                    className="hov-linea"
                    style={{ ...BOTON_LINEA, opacity: auditoria.datos.hayMas ? 1 : 0.45, cursor: auditoria.datos.hayMas ? 'pointer' : 'not-allowed' }}
                  >
                    Siguiente
                  </button>
                </div>
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
                  cuatro filas con tamaños y una columna «Restauración probada»
                  que `RespaldoResource` no publica: no hay tal campo, así que la
                  columna no está y el aviso de «hace 94 días» tampoco. */}
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                          <tr>
                            {(['Inicio', 'Fin', 'Resultado', 'Destino', 'Tamaño'] as const).map((c, j) => (
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {sisDef.impedimento === '' ? sisDef.pie : sisDef.impedimento}
                </p>
                <button
                  disabled={sisDef.impedimento !== ''}
                  title={sisDef.impedimento || undefined}
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: '10px 20px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: sisDef.impedimento === '' ? 'pointer' : 'not-allowed',
                    opacity: sisDef.impedimento === '' ? 1 : 0.5,
                  }}
                >
                  {sisDef.primaria}
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
                <strong>Esta alta todavía no se puede hacer desde aquí.</strong> No hay <code>POST /seguridad/usuarios</code> en el
                contrato, y una cuenta son dos mitades —la fila del padrón y la cuenta en el proveedor de identidad (ADR-0012)—, así que
                el alta completa exige decidir antes cómo se coordinan. Está pedido en el issue <strong>#543</strong>. Mientras tanto se
                dan de alta con el mecanismo declarativo del despliegue.
              </p>
            </div>

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Nuevo usuario</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  Esto es lo que el alta pedirá. Los campos están apagados porque no hay a dónde mandarlos, y no hay ninguno de
                  contraseña: la credencial la guarda el proveedor de identidad y este sistema no la recibe nunca.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
                <CampoDelSistema
                  campo={{ k: 'nUsuario', l: 'Usuario', t: 'text', ph: 'Sin espacios ni tildes', ayuda: 'Es el nombre con el que firma cada acto en la bitácora' }}
                  valor=""
                  onCambio={() => undefined}
                  apagado
                />
                <CampoDelSistema
                  campo={{ k: 'nNombre', l: 'Nombre y apellidos', t: 'text', ancho: true, ph: 'APELLIDOS, NOMBRES' }}
                  valor=""
                  onCambio={() => undefined}
                  apagado
                />
                <CampoDelSistema
                  campo={{ k: 'nCorreo', l: 'Correo', t: 'text', ph: 'Para el enlace del proveedor de identidad' }}
                  valor=""
                  onCambio={() => undefined}
                  apagado
                />
                <CampoDelSistema
                  campo={{ k: 'nVigencia', l: 'Vigencia hasta', t: 'text', ph: 'Opcional', ayuda: 'Pasada esa fecha la cuenta deja de valer' }}
                  valor=""
                  onCambio={() => undefined}
                  apagado
                />
              </div>
              <div style={{ padding: '0 16px 17px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
                  Grupos a los que podría entrar · los de esta municipalidad
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Sin <code>POST /seguridad/usuarios</code> no hay a dónde mandar el alta (#543).
                </p>
                <button
                  disabled
                  title="No hay POST /seguridad/usuarios en el contrato: el alta no se puede mandar a ninguna parte (#543)."
                  style={{ border: 0, borderRadius: 6, padding: '10px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'not-allowed', opacity: 0.5 }}
                >
                  Crear el usuario
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
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
