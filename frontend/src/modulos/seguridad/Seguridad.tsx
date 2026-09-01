import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Icono } from '../../ds/Icono';
import {
  listarAccesos,
  listarAuditoria,
  listarGrupos,
  permisosDelGrupo,
  ROTULO_DEL_PRIVILEGIO,
  type Privilegio,
} from '../../api/seguridad';
import { useRebote, useRecurso } from '../../api/useRecurso';
import { ICO } from '../../ds/iconos';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import { usarPreferencias } from '../../shell/preferencias';
import type { PantallaProps } from '../../App';
import {
  ACCESOS,
  GRUPOS,
  NIVELES,
  OPCIONES_DE_PALETA,
  USUARIOS,
  panelesDeSistema,
  type Acceso,
  type CampoDeSistema,
  type Nivel,
  type Permisos,
} from '../../datos/seguridad';

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

/** El tono de este módulo no es el del sistema de diseño: aquí «Total» y
 *  «Alto» son riesgos, no estados de un trámite. */
function tono(texto: string): TonoDeSeguridad {
  const t = String(texto).toLowerCase();
  if (/alto|inactiva|denegado|total/.test(t)) return 'bad';
  if (/medio|caducad|propio/.test(t)) return 'warn';
  return 'ok';
}

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

/** Los grupos a los que pertenece un usuario. */
const gruposDe = (id: string) => Object.keys(GRUPOS).filter((g) => GRUPOS[g].miembros.indexOf(id) >= 0);

type Seleccion = { tipo: 'usuario' | 'grupo'; id: string };
type CeldaDeMatriz = {
  nivel: Nivel;
  esPropio: boolean;
  esHeredado: boolean;
  on: boolean;
  /** Lo que el grupo daba y la excepcion propia le quita a este acceso. */
  revocado: boolean;
};
type FilaDeMatriz = {
  acceso: Acceso;
  prop: Nivel[];
  her: Nivel[];
  celdas: CeldaDeMatriz[];
  origen: string;
  soloHeredado: boolean;
  /** La fila se tiñe cuando el acceso mueve dinero y hay permiso sobre él. */
  tenida: boolean;
};

export default function Seguridad({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Seleccion>({ tipo: 'usuario', id: 'jcardenas' });
  const [modFiltro, setModFiltro] = useState('Sensibles');
  const [permisos, setPermisos] = useState<Record<string, Permisos>>({});
  const [audChip, setAudChip] = useState('Todos');
  const [sisTab, setSisTab] = useState(0);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});

  const val = (k: string, d: string | boolean) => (vals[k] === undefined ? d : vals[k]);
  const set = (k: string, v: string | boolean) => setVals((s) => ({ ...s, [k]: v }));

  const esGrupo = sel.tipo === 'grupo';
  /* Un grupo del backend no está en el juego de datos: `label` y `miembros`
     salen de él cuando existe, y si no, del nombre —que es lo único que se
     sabe, porque no hay lectura de miembros (#543)—. */
  const grupo = GRUPOS[sel.id] ?? { label: sel.id, miembros: [] as string[], permisos: {} as Permisos };
  const usuario = USUARIOS[sel.id];

  const modulosUnicos = useMemo(() => {
    const u: string[] = [];
    ACCESOS.forEach((a) => {
      if (u.indexOf(a.modulo) < 0) u.push(a.modulo);
    });
    return u;
  }, []);

  /* ── La matriz, contra el backend ──────────────────────────────
     De un GRUPO sí se puede reconstruir: `GET /seguridad/accesos` da el
     catálogo y `GET /seguridad/grupos/{id}/permisos` sus privilegios. De un
     USUARIO no: no hay lectura de pertenencia a grupo, la excepción no tiene
     ruta y `PermisoResource` ni siquiera declara `usuarioId` (issue #543). Así
     que el grupo lee del backend y el usuario sigue en el juego de datos,
     diciéndolo. */
  const enAccesos = dest === 'accesos';
  const gruposReales = useRecurso((s2) => listarGrupos({ tamano: 100 }, s2), [], enAccesos);
  const accesosReales = useRecurso((s2) => listarAccesos({ tamano: 200 }, s2), [], enAccesos);

  /* El grupo del backend que corresponde al seleccionado, por nombre: el
     artboard identifica los grupos por su rótulo y el backend por su id. */
  const grupoReal = (gruposReales.datos?.contenido ?? []).find(
    (g) => g.nombre.toLowerCase() === String(sel.id).toLowerCase(),
  );
  const permisosReales = useRecurso(
    (s2) => permisosDelGrupo(grupoReal!.id, s2),
    [grupoReal?.id],
    enAccesos && esGrupo && grupoReal !== undefined,
  );

  /* El permiso efectivo. Dice, por nivel, de dónde viene, que es lo que decide
     dónde hay que ir a quitarlo. */
  const eff = useMemo(() => {
    const propios: Permisos = {};
    const heredados: Permisos = {};
    if (esGrupo && permisosReales.datos) {
      /* Del backend, traducido a los rótulos que la matriz dibuja. */
      permisosReales.datos.forEach((p) => {
        propios[p.acceso] = p.privilegios.map((x) => ROTULO_DEL_PRIVILEGIO[x as Privilegio]).filter(Boolean) as Nivel[];
      });
    } else if (esGrupo) {
      Object.keys(grupo.permisos).forEach((a) => {
        propios[a] = grupo.permisos[a].slice();
      });
    } else {
      const u = USUARIOS[sel.id];
      Object.keys(u.propios).forEach((a) => {
        propios[a] = u.propios[a].slice();
      });
      gruposDe(sel.id).forEach((gn) => {
        const g = GRUPOS[gn];
        Object.keys(g.permisos).forEach((a) => {
          const acumulado = heredados[a] || [];
          g.permisos[a].forEach((n) => {
            if (acumulado.indexOf(n) < 0) acumulado.push(n);
          });
          heredados[a] = acumulado;
        });
      });
    }
    /* Lo editado en esta sesión manda sobre lo propio del dato. */
    return { propios, heredados, editados: permisos[sel.tipo + ':' + sel.id] || {} };
  }, [esGrupo, sel, permisos, permisosReales.datos, grupo]);

  const accesosVisibles = useMemo(
    () =>
      modFiltro === 'Todos'
        ? ACCESOS
        : modFiltro === 'Sensibles'
          ? ACCESOS.filter((a) => a.sensible)
          : ACCESOS.filter((a) => a.modulo === modFiltro),
    [modFiltro],
  );

  const matriz = useMemo(() => {
    let nPropios = 0;
    let nHeredados = 0;
    let nTotales = 0;
    const filas: FilaDeMatriz[] = accesosVisibles.map((a) => {
      const prop = eff.editados[a.id] !== undefined ? eff.editados[a.id] : eff.propios[a.id] || [];
      const her = eff.heredados[a.id] || [];
      /* **La excepcion SUSTITUYE al grupo, no se suma.** `ComprobadorDeAccesoJdbc`
         lo documenta: si hay una fila propia para un acceso, esa fila decide
         entera —otorgue o niegue— y lo del grupo no cuenta para ese acceso.
         Sumarlos (`esPropio || esHeredado`) hace creer que marcar una casilla
         AÑADE un privilegio, cuando marcar una sobre un acceso que el grupo
         daba con cuatro deja uno y apaga los otros tres, en silencio. */
      const hayExcepcion = prop.length > 0;
      const vigentes = hayExcepcion ? prop : her;
      const celdas = NIVELES.map((n) => {
        const enExcepcion = prop.indexOf(n) >= 0;
        const enGrupo = her.indexOf(n) >= 0;
        const on = vigentes.indexOf(n) >= 0;
        /* Lo que el grupo daba y la excepcion quita. Es lo que hay que ver
           antes de guardar, no despues. */
        const revocado = hayExcepcion && enGrupo && !enExcepcion;
        if (on && hayExcepcion) nPropios++;
        if (on && !hayExcepcion) nHeredados++;
        if (on && n === 'Especial') nTotales++;
        return { nivel: n, esPropio: on && hayExcepcion, esHeredado: on && !hayExcepcion, on, revocado };
      });
      const soloHeredado = !hayExcepcion && her.length > 0;
      const revocadosAqui = celdas.filter((c) => c.revocado).length;
      const origen = hayExcepcion
        ? revocadosAqui > 0
          ? `Excepcion · quita ${revocadosAqui}`
          : 'Excepcion propia'
        : her.length > 0
          ? 'Heredado del grupo'
          : 'Sin permiso';
      return { acceso: a, prop, her, celdas, origen, soloHeredado, tenida: a.sensible && (prop.length > 0 || her.length > 0) };
    });
    return { filas, nPropios, nHeredados, nTotales };
  }, [accesosVisibles, eff]);

  const alternar = (fila: FilaDeMatriz, c: CeldaDeMatriz) => {
    if (c.esHeredado && !c.esPropio) {
      toast('Ese permiso viene del grupo ' + gruposDe(sel.id).join(', ') + '. Se quita allí, no aquí.');
      return;
    }
    const actual = fila.prop.slice();
    const i = actual.indexOf(c.nivel);
    if (i >= 0) actual.splice(i, 1);
    else actual.push(c.nivel);
    const clave = sel.tipo + ':' + sel.id;
    setPermisos((x) => ({ ...x, [clave]: { ...(x[clave] || {}), [fila.acceso.id]: actual } }));
  };

  /* ── El árbol de usuarios y grupos ─────────────────────────── */
  const nodos = useMemo(() => {
    const lista: { tipo: 'usuario' | 'grupo'; id: string; label: string; nota: string; marca: string }[] = [];
    /* Los grupos son los del BACKEND cuando se pudieron leer. Listar los del
       prototipo con la matriz conectada haría que elegir uno no pidiera nada:
       sus nombres no existen del otro lado. */
    if (gruposReales.datos) {
      gruposReales.datos.contenido.forEach((g) =>
        lista.push({ tipo: 'grupo', id: g.nombre, label: g.nombre, nota: g.descripcion ?? 'del backend', marca: g.activo ? '' : 'Inactivo' }),
      );
    } else {
      Object.keys(GRUPOS).forEach((g) =>
        lista.push({ tipo: 'grupo', id: g, label: GRUPOS[g].label, nota: GRUPOS[g].miembros.length + ' miembros', marca: '' }),
      );
    }
    Object.keys(USUARIOS).forEach((u) => {
      const usr = USUARIOS[u];
      lista.push({ tipo: 'usuario', id: u, label: usr.label, nota: usr.nombre, marca: usr.estado === 'Inactiva' ? 'Inactiva' : '' });
    });
    const filtro = q.toLowerCase();
    return lista.filter(
      (n) => filtro === '' || n.label.toLowerCase().indexOf(filtro) >= 0 || n.nota.toLowerCase().indexOf(filtro) >= 0,
    );
  }, [q, gruposReales.datos]);

  /* ── Los riesgos del panel, derivados de los datos ──────────── */
  /* Antes se llamaba «con nivel Total» y contaba un privilegio que no existe.
     Cuenta `Especial`, que es lo que el dominio declara: el que abre lo que
     ningun otro abre, y por eso interesa saber quien lo tiene. */
  const conTotal = useMemo(
    () =>
      Object.keys(USUARIOS).filter((u) => {
        const propios = USUARIOS[u].propios;
        const enPropios = Object.keys(propios).some((a) => propios[a].indexOf('Especial') >= 0);
        const enGrupos = gruposDe(u).some((g) =>
          Object.keys(GRUPOS[g].permisos).some((a) => GRUPOS[g].permisos[a].indexOf('Especial') >= 0),
        );
        return enPropios || enGrupos;
      }),
    [],
  );
  const inactivasConPermiso = Object.keys(USUARIOS).filter(
    (u) => USUARIOS[u].estado === 'Inactiva' && Object.keys(USUARIOS[u].propios).length > 0,
  );
  const clavesViejas = Object.keys(USUARIOS).filter((u) => USUARIOS[u].clave > 365);

  const riesgos = [
    {
      etiqueta: 'Permiso total',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Cuentas con permiso Total sobre algún acceso',
      detalle: 'Total implica ejecutar, ingresar, modificar, anular e imprimir a la vez: ' + conTotal.join(', ') + '.',
      conteo: String(conTotal.length),
      ir: () => {
        setModFiltro('Sensibles');
        onDest('accesos');
      },
    },
    {
      etiqueta: 'Cuenta inactiva',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Cuentas inactivas que conservan permisos',
      detalle:
        'Una cuenta inactiva con permisos vuelve a servir el día que alguien la reactiva sin revisarlos: ' +
        inactivasConPermiso.join(', ') +
        '.',
      conteo: String(inactivasConPermiso.length),
      ir: () => {
        setSel({ tipo: 'usuario', id: inactivasConPermiso[0] || 'fruiz' });
        setModFiltro('Todos');
        onDest('accesos');
      },
    },
    {
      etiqueta: 'Contraseña',
      tono: 'warn' as TonoDeSeguridad,
      titulo: 'Contraseñas que pasaron su caducidad',
      detalle:
        'Más de 365 días sin cambiar: ' +
        clavesViejas.join(', ') +
        '. Mientras no se cambien, la auditoría firma actos con una clave que puede estar compartida.',
      conteo: String(clavesViejas.length),
      ir: () => {
        setSisTab(2);
        onDest('sistema');
      },
    },
    {
      etiqueta: 'Copias',
      tono: 'bad' as TonoDeSeguridad,
      titulo: 'Restauración sin verificar',
      detalle:
        'La última restauración probada es de hace 94 días. Las copias diarias existen y nadie ha comprobado que se puedan restaurar.',
      conteo: '94 d',
      ir: () => {
        setSisTab(3);
        onDest('sistema');
      },
    },
  ];

  const kpis = [
    {
      valor: String(Object.keys(USUARIOS).length),
      etiqueta: 'Usuarios registrados',
      nota: Object.keys(USUARIOS).filter((u) => USUARIOS[u].estado === 'Activa').length + ' activos, el resto inactivos.',
    },
    {
      valor: String(Object.keys(GRUPOS).length),
      etiqueta: 'Grupos',
      nota: 'Los permisos se dan al grupo y se heredan; darlos uno a uno es lo que se descontrola.',
    },
    {
      valor: String(ACCESOS.filter((a) => a.sensible).length),
      etiqueta: 'Accesos que mueven dinero',
      nota: 'Anulaciones, bajas, prescripciones, aranceles y permisos.',
    },
    { valor: String(NIVELES.length), etiqueta: 'Niveles por acceso', nota: NIVELES.join(', ') + '.' },
  ];

  /* ── Auditoría ─────────────────────────────────────────────── */
  /* Los cinco filtros del artboard se sustituyen por los que la bitacora
     admite de verdad: `usuario`, `tabla`, `operacion`, `desde` y `hasta`.
     «Modulo» y «Buscar en el detalle» no existen en el backend. */
  const audFiltros: { k: string; label: string; tipo: 'sel' | 'fecha' | 'texto'; valor: string; opts?: string[]; ph?: string }[] = [
    { k: 'audUsuario', label: 'Usuario', tipo: 'texto', valor: '', ph: 'jperez' },
    { k: 'audTabla', label: 'Tabla', tipo: 'texto', valor: '', ph: 'recibo, permiso, predio…' },
    { k: 'audOperacion', label: 'Operación', tipo: 'sel', valor: 'Todas', opts: ['Todas', 'ALTA', 'MODIFICACION', 'ELIMINACION', 'ACCESO'] },
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

  /* `ejercicio` es obligatorio: la bitacora esta particionada por el, y sin el
     el backend contesta 422. Sale del selector de la cabecera. */
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
        { pagina: paginaAud, tamano: 20 },
        senal,
      ),
    [pref.ejercicio, usuarioAud, tablaAud, operacionAud, desdeAud, hastaAud, paginaAud],
    dest === 'auditoria' || dest === 'panel',
  );
  const filasDeAuditoria = auditoria.datos?.contenido ?? [];

  /* ── Sistema ───────────────────────────────────────────────── */
  const SIS = panelesDeSistema(pref.ejercicio);
  const sisIdx = Math.min(sisTab, SIS.length - 1);
  const sisDef = SIS[sisIdx];

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
          <p style={{ margin: '5px 0 0', fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-3)', textWrap: 'pretty' }}>
            Es global a la sesión: decide sobre qué año escriben los doce módulos.
          </p>
        </div>
      }
      paleta={paleta}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ══════════ PANEL ══════════ */}
        {dest === 'panel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch', textWrap: 'pretty' }}>
              Módulos, usuarios, grupos, accesos, miembros y permisos eran seis pantallas para responder una pregunta: quién puede hacer
              qué. Aquí la pregunta se responde en una matriz, y se ve de dónde le viene el permiso a cada uno.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que hay que revisar</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {conTotal.length + inactivasConPermiso.length + clavesViejas.length} hallazgos
                </span>
              </div>
              {riesgos.map((r) => (
                <button
                  key={r.titulo}
                  onClick={r.ir}
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
                  <span style={INS[r.tono]}>{r.etiqueta}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{r.titulo}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r.detalle}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', flex: '0 0 auto' }}>{r.conteo}</span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Un permiso total sobre un módulo tributario permite anular recibos y dar de baja deuda. No es una preferencia: es la llave
                de la caja.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {kpis.map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>
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
                <button
                  onClick={() => onDest('auditoria')}
                  className="hov-linea"
                  style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}
                >
                  Ver auditoría
                </button>
              </div>
              {auditoria.cargando && (
                <p style={{ margin: 0, padding: '14px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Leyendo la bitácora…</p>
              )}
              {filasDeAuditoria.slice(0, 4).map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span style={INS[r.operacion === 'ELIMINACION' ? 'bad' : r.operacion === 'ACCESO' ? 'neutro' : 'warn']}>
                    {r.operacion}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)' }}>
                      {r.tabla} · {r.clave}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                      {r.observacion ?? 'Sin observación'}
                    </span>
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
        {dest === 'accesos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Elige un usuario o un grupo y mira qué puede hacer. Lo que el sistema actual no dice y aquí sí: si el permiso es propio o le
              viene de un grupo, porque quitarlo del sitio equivocado no quita nada.
            </p>

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
                  {nodos.map((n) => {
                    const on = sel.tipo === n.tipo && sel.id === n.id;
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
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>{n.nota}</span>
                        </span>
                        {n.marca && <span style={INS.bad}>{n.marca}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section style={TARJETA}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ flex: 1, minWidth: 190 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                        {esGrupo ? grupo.label : usuario.nombre}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {esGrupo
                          ? grupo.miembros.length > 0
                            ? 'Grupo · ' + grupo.miembros.length + ' miembros: ' + grupo.miembros.join(', ')
                            : 'Grupo · el backend no publica sus miembros (#543)'
                          : 'Usuario ' + usuario.label + ' · contraseña de hace ' + usuario.clave + ' días'}
                      </p>
                    </div>
                    <span style={esGrupo ? INS.neutro : INS[tono(usuario.estado)]}>{esGrupo ? 'Grupo' : usuario.estado}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                    {(
                      [
                        ['Permisos propios', String(matriz.nPropios), 'var(--ink)'],
                        ['Heredados', String(matriz.nHeredados), 'var(--accent-ink)'],
                        ['Con privilegio Especial', String(matriz.nTotales), matriz.nTotales > 0 ? 'var(--bad-fg)' : 'var(--ink-3)'],
                        ['Accesos mostrados', accesosVisibles.length + ' de ' + ACCESOS.length, 'var(--ink-3)'],
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
                  {!esGrupo && gruposDe(sel.id).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                      <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>Hereda de</span>
                      {gruposDe(sel.id).map((g) => (
                        <PastillaDeGrupo key={g} label={GRUPOS[g].label} onClick={() => setSel({ tipo: 'grupo', id: g })} />
                      ))}
                      <span data-sm-hide="1" style={{ flex: 1, minWidth: 120, textAlign: 'right', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                        Los permisos heredados no se quitan desde aquí
                      </span>
                    </div>
                  )}
                </section>

                <section style={TARJETA}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                      Permisos efectivos
                      <span style={{ marginLeft: 9, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>
                        {esGrupo
                          ? permisosReales.datos
                            ? `del backend · ${accesosReales.datos?.totalElementos ?? 0} accesos`
                            : permisosReales.cargando
                              ? 'leyendo…'
                              : 'sin leer'
                          : 'del juego de datos: la matriz de un usuario no se puede reconstruir (#543)'}
                      </span>
                    </h2>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                      {matriz.nPropios} propios · {matriz.nHeredados} heredados
                    </span>
                    {['Sensibles', 'Todos'].concat(modulosUnicos).map((m) => {
                      const on = modFiltro === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setModFiltro(m)}
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
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)', position: 'sticky', left: 0, borderRight: '1px solid var(--line)' }}>
                            Acceso
                          </th>
                          {NIVELES.map((n) => (
                            <th key={n} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-3)', background: 'var(--bg-elev)', whiteSpace: 'nowrap' }}>
                              {n}
                            </th>
                          ))}
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', background: 'var(--bg-elev)' }}>
                            Origen
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {matriz.filas.map((f) => (
                          <tr key={f.acceso.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)', background: f.tenida ? 'var(--warn-bg)' : 'transparent' }}>
                            {/* La primera celda se fija igual que su cabecera y con fondo
                                opaco: sin esto, al desplazarse en horizontal la columna de
                                rótulos se salía del marco y la fila quedaba en casillas
                                anónimas. */}
                            <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--ink)', whiteSpace: 'nowrap', position: 'sticky', left: 0, borderRight: '1px solid var(--line)', background: f.tenida ? 'var(--warn-bg)' : 'var(--bg-card)' }}>
                              <span style={{ display: 'block' }}>{f.acceso.label}</span>
                              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>
                                {f.acceso.modulo + (f.acceso.sensible ? ' · mueve dinero' : '')}
                              </span>
                            </td>
                            {f.celdas.map((c) => {
                              const heredadoSolo = c.esHeredado && !c.esPropio;
                              return (
                                <td key={c.nivel} style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => alternar(f, c)}
                                    aria-pressed={c.on}
                                    aria-label={c.nivel + ' en ' + f.acceso.label}
                                    title={
                                      heredadoSolo
                                        ? 'Heredado de ' + gruposDe(sel.id).join(', ') + ': se quita en el grupo'
                                        : c.esPropio
                                          ? 'Permiso propio: se puede quitar aquí'
                                          : 'Sin permiso'
                                    }
                                    style={{
                                      display: 'grid',
                                      placeItems: 'center',
                                      width: 26,
                                      height: 26,
                                      borderRadius: 6,
                                      cursor: heredadoSolo ? 'not-allowed' : 'pointer',
                                      border: `1px solid ${c.on ? 'var(--accent)' : 'var(--line-2)'}`,
                                      background: c.esPropio ? 'var(--accent)' : c.esHeredado ? 'var(--accent-soft)' : 'var(--bg-card)',
                                      color: c.esPropio ? '#fff' : 'var(--accent-ink)',
                                    }}
                                  >
                                    {c.on && <Icono d={['M5 12.5l4.5 4.5L19 7']} tam={12} grosor={3} />}
                                  </button>
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 500,
                                  borderRadius: 999,
                                  padding: '3px 9px',
                                  whiteSpace: 'nowrap',
                                  background: f.origen === 'Sin permiso' ? 'var(--bg-elev)' : f.soloHeredado ? 'var(--accent-soft)' : 'var(--ok-bg)',
                                  color: f.origen === 'Sin permiso' ? 'var(--ink-4)' : f.soloHeredado ? 'var(--accent-ink)' : 'var(--ok-fg)',
                                }}
                              >
                                {f.origen}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ink-3)' }}>
                      <span style={{ width: 15, height: 15, borderRadius: 4, background: 'var(--accent)', flex: '0 0 auto' }} />
                      Propio: se quita desde aquí
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ink-3)' }}>
                      <span style={{ width: 15, height: 15, borderRadius: 4, background: 'var(--accent-soft)', border: '1px solid var(--accent)', flex: '0 0 auto' }} />
                      Heredado del grupo: se quita en el grupo
                    </span>
                    <span data-sm-hide="1" style={{ flex: 1, minWidth: 100 }} />
                    <button
                      onClick={() => toast('Permisos guardados. El cambio queda en la auditoría con tu usuario.')}
                      className="hov-acento-2"
                      style={{ border: 0, borderRadius: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Guardar permisos
                    </button>
                  </div>
                  <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {esGrupo
                      ? 'Lo que se marca aquí lo heredan los ' +
                        (grupo.miembros.length > 0 ? grupo.miembros.length + ' miembros del grupo' : 'los miembros del grupo') +
                        '. Es la forma de dar permisos que se puede revisar.'
                      : 'Las casillas de fondo claro vienen de ' +
                        (gruposDe(sel.id).join(', ') || 'ningún grupo') +
                        ' y no se quitan desde aquí. Las oscuras son propias de ' +
                        usuario.label +
                        '.'}
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ AUDITORÍA ══════════ */}
        {dest === 'auditoria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Quién hizo qué, cuándo y desde dónde. Lo que se mira aquí no son los accesos: son los actos que mueven dinero —anulaciones,
              bajas de deuda, cambios de permiso— y quién los firmó.
            </p>

            <section style={TARJETA}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end', borderBottom: '1px solid var(--line)' }}>
                {/* El artboard deja estos cinco filtros declarados y sin conectar:
                    la bitácora se acota con las pastillas de riesgo. */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Riesgo</span>
                {['Todos', 'Alto', 'Medio'].map((c) => {
                  const on = audChip === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setAudChip(c)}
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
                      {c}
                    </button>
                  );
                })}
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {filasDeAuditoria.length} de {(auditoria.datos?.totalElementos ?? 0).toLocaleString('es-PE')} registros
                </span>
              </div>
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
                    {filasDeAuditoria.map((r) => (
                      <tr key={r.id} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={TD1}>{r.fecha.replace('T', ' ').slice(0, 16)}</td>
                        <td style={TD}>{r.usuario}</td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.tabla}</td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.clave}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={INS[r.operacion === 'ELIMINACION' ? 'bad' : r.operacion === 'ACCESO' ? 'neutro' : 'warn']}>
                            {r.operacion}
                          </span>
                        </td>
                        <td style={{ ...TD, textWrap: 'pretty' }}>{r.observacion ?? '—'}</td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{r.origenIp ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

            {sisDef.aviso !== '' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '13px 16px',
                  border: '1px solid var(--line-2)',
                  borderLeft: `3px solid ${sisDef.avisoTono === 'bad' ? 'var(--bad-fg)' : 'var(--warn-fg)'}`,
                  borderRadius: 8,
                  background: sisDef.avisoTono === 'bad' ? 'var(--bad-bg)' : 'var(--warn-bg)',
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
                  style={{ color: sisDef.avisoTono === 'bad' ? 'var(--bad-fg)' : 'var(--warn-fg)', flex: '0 0 auto', marginTop: 1 }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 8.4v.02M12 11.4v4.2" />
                </svg>
                <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: sisDef.avisoTono === 'bad' ? 'var(--bad-fg)' : 'var(--warn-fg)', textWrap: 'pretty' }}>
                  {sisDef.aviso}
                </p>
              </div>
            )}

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
              {sisDef.tabla && (
                <div style={{ overflowX: 'auto', borderTop: '1px solid var(--line)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: sisDef.tabla.min }}>
                    <thead>
                      <tr>
                        {sisDef.tabla.cols.map((c) => (
                          <th key={c[0]} style={c[1] ? THN : TH}>
                            {c[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sisDef.tabla.filas.map((fila) => (
                        <tr key={fila[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                          {fila.map((c, j) =>
                            j === sisDef.tabla!.insignia ? (
                              <td key={j} style={{ padding: '11px 14px' }}>
                                <span style={INS[tono(c)]}>{c}</span>
                              </td>
                            ) : (
                              <td key={j} style={j === 0 ? TD1 : sisDef.tabla!.cols[j][1] ? TDN : TD}>
                                {c}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{sisDef.pie}</p>
                <button
                  onClick={() => toast(sisDef.primaria + ': registrado en la auditoría.')}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 6, padding: '10px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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
                Usuario nuevo: sin grupo no tiene ningún permiso.
              </p>
            </div>

            <section style={TARJETA}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Nuevo usuario</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>
                  La cuenta nace sin permisos propios. Lo que puede hacer sale de los grupos a los que entra, y eso es lo que se revisa en
                  la matriz de accesos.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
                <CampoDelSistema
                  campo={{ k: 'nUsuario', l: 'Usuario', t: 'text', ph: 'Sin espacios ni tildes', ayuda: 'Es el nombre con el que firma cada acto en la bitácora' }}
                  valor={val('nUsuario', '')}
                  onCambio={(v) => set('nUsuario', v)}
                />
                <CampoDelSistema
                  campo={{ k: 'nNombre', l: 'Nombre y apellidos', t: 'text', ancho: true, ph: 'APELLIDOS, NOMBRES' }}
                  valor={val('nNombre', '')}
                  onCambio={(v) => set('nNombre', v)}
                />
                <CampoDelSistema
                  campo={{ k: 'nEstado', l: 'Estado de la cuenta', t: 'sel', v: 'Activa', o: ['Activa', 'Inactiva'] }}
                  valor={val('nEstado', 'Activa')}
                  onCambio={(v) => set('nEstado', v)}
                />
                <CampoDelSistema
                  campo={{ k: 'nClave', l: 'Contraseña inicial', t: 'clave', ph: 'Mínimo 10 caracteres', ayuda: 'Caduca a los 365 días' }}
                  valor={val('nClave', '')}
                  onCambio={(v) => set('nClave', v)}
                />
              </div>
              <div style={{ padding: '0 16px 17px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>Grupos a los que entra</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '10px 16px' }}>
                  {Object.keys(GRUPOS).map((g) => {
                    const marcado = val('nGrupo:' + g, false) === true;
                    return (
                      <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) => set('nGrupo:' + g, e.target.checked)}
                          style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
                        />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)' }}>{GRUPOS[g].label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                          {Object.keys(GRUPOS[g].permisos).length} accesos
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  El alta se anota en la bitácora con tu usuario y la hora.
                </p>
                <button
                  onClick={() => toast('Usuario nuevo: sin grupo no tiene ningún permiso.')}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 6, padding: '10px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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

/** La pastilla de un grupo del que se hereda. Su gesto de hover cambia el
 *  filete y la tinta a la vez, y eso no lo cubre ninguna clase global. */
function PastillaDeGrupo({ label, onClick }: { label: string; onClick: () => void }) {
  const [sobre, setSobre] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocus={() => setSobre(true)}
      onBlur={() => setSobre(false)}
      style={{
        border: `1px solid ${sobre ? 'var(--accent)' : 'var(--line-2)'}`,
        borderRadius: 999,
        padding: '4px 12px',
        background: 'var(--bg-card)',
        fontSize: 12,
        color: sobre ? 'var(--accent-ink)' : 'var(--ink-2)',
        cursor: 'pointer',
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
}: {
  campo: CampoDeSistema;
  valor: string | boolean;
  onCambio: (v: string | boolean) => void;
}) {
  const t = campo.t === undefined ? 'text' : campo.t;
  return (
    <label data-ancho={campo.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{campo.l}</span>
      {t === 'text' && <input value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={campo.ph} style={IN} />}
      {t === 'clave' && (
        <input type="password" value={String(valor)} onChange={(e) => onCambio(e.target.value)} placeholder={campo.ph} style={IN} />
      )}
      {t === 'sel' && (
        <select value={String(valor)} onChange={(e) => onCambio(e.target.value)} style={IN}>
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
