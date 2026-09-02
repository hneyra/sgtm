import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icono } from '../ds/Icono';
import { ICONOS, ICO } from '../ds/iconos';
import { MODULOS, moduloDe, type Modulo } from './modulos';
import { ejerciciosCon, usarPreferencias } from './preferencias';
import { hayPuerta, salir } from '../api/sesion';
import { personaDeLaSesion } from './persona';

/**
 * El shell común de los doce módulos: riel de 68 px con los módulos, panel de
 * 246 px con los destinos, cabecera pegajosa con la ruta y el ejercicio, barra
 * de contexto opcional y la paleta de comandos. Es literal el que los trece
 * artboards de `design/design-sgtm/` repiten sin una diferencia.
 */

export type Contexto = {
  volver?: { label: string; onClick: () => void };
  codigo?: string;
  titular?: string;
  ubic?: string;
  estado?: string;
  estadoColor?: string;
  /** Lo que va pegado a la derecha de la barra. Cuatro artboards ponen ahí
   *  acciones o una segunda pastilla, no solo el punto de estado. */
  derecha?: ReactNode;
};

export type EntradaDePaleta = { label: string; nota: string; ir: () => void };

export function Shell({
  modulo,
  dest,
  onDest,
  miga,
  titulo,
  contexto,
  tarjeta,
  notasDeDestino,
  pastillasDeDestino,
  paleta,
  children,
}: {
  modulo: string;
  dest: string;
  onDest: (k: string) => void;
  miga: string[];
  titulo: string;
  contexto?: Contexto;
  /** El bloque que cinco artboards meten entre la cabecera del panel y el botón
   *  de acción: el turno de caja abierto, la cartera del ejecutor, el aviso de
   *  aprobación automática. Va aquí y no en el cuerpo porque es del panel. */
  tarjeta?: ReactNode;
  /**
   * La nota de un destino, cuando el módulo sabe la de verdad.
   *
   * `modulos.ts` la trae del artboard —«18,412 en el padrón»—, y eso vale
   * mientras la pantalla enseñe el juego de datos. En cuanto un destino lee del
   * backend, esa cifra queda contradicha por la que sale a su lado, así que el
   * módulo la sustituye por la que acaba de contar.
   *
   * **Sustituir la nota APAGA además su pastilla.** La pastilla es del mismo
   * artboard —«8,662», «118», «214»— y quedaba encendida al lado de la nota
   * contada, diciendo dos cifras distintas de lo mismo en la misma línea. Un
   * módulo que sabe contar puede volver a encenderla con `pastillasDeDestino`.
   */
  notasDeDestino?: Record<string, string>;
  /** La pastilla de un destino, cuando el módulo la ha contado de verdad. */
  pastillasDeDestino?: Record<string, { texto: string; tono?: 'warn' | 'bad' }>;
  paleta?: EntradaDePaleta[];
  children: ReactNode;
}) {
  const m: Modulo = moduloDe(modulo);
  const persona = personaDeLaSesion(m.sesion);
  const { pref, fijar, toast, ir } = usarPreferencias();
  const [navOpen, setNavOpen] = useState(false);
  const [pal, setPal] = useState(false);
  const [pq, setPq] = useState('');
  /* Cuál entrada está enfocada. Con teclado no hay puntero: sin esto la paleta
     se abre, se teclea, se filtra… y no hay forma de elegir. */
  const [foco, setFoco] = useState(0);

  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPal((v) => !v);
        setPq('');
        setFoco(0);
      }
      if (e.key === 'Escape') {
        setPal(false);
        setNavOpen(false);
      }
    };
    document.addEventListener('keydown', t);
    return () => document.removeEventListener('keydown', t);
  }, []);

  const entradas = useMemo<EntradaDePaleta[]>(() => {
    if (paleta && paleta.length) return paleta;
    return m.destinos.map((d) => ({ label: d.label, nota: d.nota, ir: () => onDest(d.k) }));
  }, [paleta, m, onDest]);

  const res = useMemo(() => {
    const q = pq.trim().toLowerCase();
    if (!q) return entradas;
    return entradas.filter((r) => (r.label + ' ' + r.nota).toLowerCase().includes(q));
  }, [entradas, pq]);

  /* Al filtrar, la entrada que estaba enfocada ya no es la misma —o ya no está—,
     así que el foco vuelve al principio. Sin esto, teclear una letra más deja el
     foco apuntando a una fila que la lista ya no tiene y Enter abre otra cosa. */
  useEffect(() => setFoco(0), [pq, pal]);

  /**
   * El teclado de la paleta.
   *
   * Va en el `input` y no en `document` a propósito: mientras la paleta está
   * abierta el foco está ahí dentro, y colgarlo del documento haría que las
   * flechas movieran también la lista de detrás.
   *
   * Enter abre **la entrada enfocada**, no `res[0]` ni el índice sin acotar: si
   * abriera por índice, filtrar hasta una sola coincidencia y pulsar Enter
   * llevaría a la primera de la lista anterior.
   */
  const teclaDeLaPaleta = (e: React.KeyboardEvent) => {
    if (res.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFoco((i) => (i + 1) % res.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFoco((i) => (i - 1 + res.length) % res.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFoco(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFoco(res.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const elegida = res[Math.min(foco, res.length - 1)];
      if (elegida) {
        elegida.ir();
        setPal(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        data-scrim="1"
        data-open={navOpen ? '1' : '0'}
        onClick={() => setNavOpen(false)}
        style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(26,22,18,.34)' }}
      />

      {/* ══════════ RIEL DE MÓDULOS ══════════ */}
      <nav
        aria-label="Módulos del sistema"
        style={{
          flex: '0 0 68px',
          width: 68,
          background: 'var(--accent)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '12px 0 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: 'rgba(255,255,255,.14)',
            border: '1px solid rgba(255,255,255,.2)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            marginBottom: 12,
          }}
        >
          S
        </div>
        {MODULOS.map((x) => {
          const on = x.k === m.k;
          return (
            <button
              key={x.k}
              onClick={() => ir(x.k)}
              title={x.label}
              aria-label={x.label}
              aria-current={on ? 'true' : undefined}
              className={on ? undefined : 'hov-blanco'}
              style={{
                width: 44,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                border: 0,
                borderRadius: 9,
                cursor: 'pointer',
                background: on ? 'rgba(255,255,255,.18)' : 'transparent',
                color: on ? '#fff' : 'rgba(255,255,255,.62)',
              }}
            >
              <Icono d={ICONOS[x.label]} tam={19} />
            </button>
          );
        })}
      </nav>

      {/* ══════════ PANEL DE DESTINOS ══════════ */}
      <aside
        data-panel="1"
        data-open={navOpen ? '1' : '0'}
        style={{
          flex: '0 0 246px',
          width: 246,
          background: 'var(--bg-elev)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '16px 16px 13px', borderBottom: '1px solid var(--line)' }}>
          <p
            style={{
              margin: '0 0 2px',
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              color: 'var(--ink-3)',
            }}
          >
            Módulo
          </p>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, letterSpacing: '-.01em' }}>
            {m.label}
          </p>
          <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{pref.entidad}</p>
        </div>

        {tarjeta && (
          <div style={{ padding: '12px 12px 11px', borderBottom: '1px solid var(--line)' }}>{tarjeta}</div>
        )}

        {(m.accion || m.destinos.length > 0) && (
          <div
            style={{
              padding: '12px 12px 10px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {m.accion && (
              <button
                onClick={() => onDest(m.accion!.k)}
                className="hov-acento-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  border: 0,
                  borderRadius: 7,
                  padding: '11px 14px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Icono d={ICO.mas} tam={15} grosor={1.9} />
                {m.accion.label}
              </button>
            )}
            <button
              onClick={() => {
                setPal(true);
                setPq('');
              }}
              className="hov-linea-4"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                border: '1px solid var(--line-2)',
                borderRadius: 7,
                padding: '9px 10px',
                background: 'var(--bg)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icono d={ICO.lupa} tam={14} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-3)' }}>Buscar</span>
              <kbd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'var(--ink-4)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 4,
                  padding: '2px 4px',
                }}
              >
                Ctrl K
              </kbd>
            </button>
          </div>
        )}

        <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {m.destinos.map((d) => {
            const on = dest === d.k;
            return (
              <button
                key={d.k}
                onClick={() => onDest(d.k)}
                aria-current={on ? 'true' : undefined}
                className={on ? undefined : 'hov-acento'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 10px',
                  cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: on ? 'var(--accent-ink)' : 'var(--ink)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    flex: '0 0 auto',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                    background: on ? 'var(--accent)' : 'var(--bg-card)',
                    color: on ? '#fff' : 'var(--ink-3)',
                  }}
                >
                  <Icono d={d.icono} tam={15} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5 }}>{d.label}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>
                    {notasDeDestino?.[d.k] ?? d.nota}
                  </span>
                </span>
                {(() => {
                  /* La pastilla SÓLO la pone quien contó.
                     Antes salía del catálogo, y ahí era una cifra del prototipo
                     que no cambiaba con la municipalidad: «4,036» en rojo junto
                     a «Detección» decía «hay 4 036 pendientes aquí» en las dos,
                     con 25 en una y 9 445 en la otra. Un recuento en tono `bad`
                     es una afirmación sobre el trabajo que espera; sin contarlo,
                     no se hace. */
                  const contada = pastillasDeDestino?.[d.k];
                  const texto = contada?.texto;
                  const tono = contada?.tono;
                  if (!texto) return null;
                  return (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        borderRadius: 999,
                        padding: '2px 7px',
                        flex: '0 0 auto',
                        background: tono === 'bad' ? 'var(--bad-bg)' : 'var(--warn-bg)',
                        color: tono === 'bad' ? 'var(--bad-fg)' : 'var(--warn-fg)',
                      }}
                    >
                      {texto}
                    </span>
                  );
                })()}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 'auto',
            padding: m.documento ? '12px 8px 16px' : '12px 12px 16px',
            borderTop: m.documento ? '1px solid var(--line)' : undefined,
          }}
        >
          {m.documento ? (
            <>
              <p
                style={{
                  margin: '0 0 6px 8px',
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '.14em',
                  color: 'var(--ink-3)',
                }}
              >
                Documentos
              </p>
              <button
                onClick={() => onDest(m.documento!.k)}
                aria-current={dest === m.documento.k ? 'true' : undefined}
                className="hov-acento"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  borderRadius: 8,
                  padding: '9px 10px',
                  cursor: 'pointer',
                  background: dest === m.documento.k ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <Icono d={ICO.hojaLineas} tam={15} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <span style={{ fontSize: 13 }}>{m.documento.label}</span>
              </button>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{m.pie}</p>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* ══════════ CABECERA ══════════ */}
        <header
          data-noprint="1"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <button
            data-navtoggle="1"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir la navegación"
            style={{
              display: 'none',
              width: 34,
              height: 34,
              placeItems: 'center',
              border: '1px solid var(--line-2)',
              borderRadius: 7,
              background: 'var(--bg-card)',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            <Icono d={ICO.menu} tam={16} grosor={1.8} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <nav
              aria-label="Ruta"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)', marginBottom: 1 }}
            >
              {miga.map((b, i) => (
                <span key={i} style={i === miga.length - 1 ? { color: 'var(--ink-2)' } : undefined}>
                  {i > 0 && <span style={{ marginRight: 6, color: 'var(--ink-4)' }}>›</span>}
                  {b}
                </span>
              ))}
            </nav>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 21,
                fontWeight: 600,
                letterSpacing: '-.02em',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {titulo}
            </h1>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--line-2)',
              borderRadius: 999,
              padding: '4px 5px 4px 12px',
              background: 'var(--bg-card)',
            }}
          >
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-3)' }}>
              Ejercicio
            </span>
            <select
              value={pref.ejercicio}
              onChange={(e) => {
                fijar({ ejercicio: e.target.value });
                /* Se dice lo que pasa y nada más.
                   Cada módulo traía su frase —«se recargaron UIT, escala y
                   tablas», «se recargaron programas y cruces», «el cambio queda
                   en la auditoría»— y ninguna de las doce era cierta.

                   Y la última sigue sin serlo, ahora que el acto existe (#557):
                   esto es el FILTRO DE VISTA —vive en el navegador, no pide
                   permiso y no deja rastro—, y el acto registrado es otra cosa,
                   con su observación y su privilegio `ESPECIAL` sobre
                   `cambiar_anio`, en Seguridad › Sistema. Decir aquí «queda en
                   la auditoría» nombraría una fila que nadie escribió. */
                toast(`Ejercicio ${e.target.value}. Las consultas pasan a pedir ese año.`);
              }}
              aria-label="Ejercicio de trabajo"
              style={{
                border: 0,
                background: 'var(--accent-soft)',
                color: 'var(--accent-ink)',
                borderRadius: 999,
                padding: '3px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {ejerciciosCon(pref.ejercicio).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setPal(true);
              setPq('');
            }}
            aria-label="Buscar en el sistema"
            className="hov-linea-4"
            style={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid var(--line-2)',
              borderRadius: 7,
              background: 'var(--bg-card)',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            <Icono d={ICO.lupa} tam={16} />
          </button>
          <button
            onClick={() => fijar({ tema: pref.tema === 'claro' ? 'oscuro' : 'claro' })}
            aria-label="Cambiar el contraste"
            title={pref.tema === 'claro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro'}
            className="hov-linea-4"
            style={{
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid var(--line-2)',
              borderRadius: 7,
              background: 'var(--bg-card)',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            <Icono
              d={
                pref.tema === 'claro'
                  ? ['M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1']
                  : ['M12 6.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8', 'M12 2.6v1.8', 'M12 19.6v1.8', 'M2.6 12h1.8', 'M19.6 12h1.8']
              }
              tam={16}
            />
          </button>
          <div
            data-sm-hide="1"
            style={{ display: 'flex', alignItems: 'center', gap: 9, borderLeft: '1px solid var(--line)', paddingLeft: 12 }}
          >
            <span
              style={{
                width: 27,
                height: 27,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                color: 'var(--accent-ink)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {persona.iniciales}
            </span>
            <span style={{ lineHeight: 1.25 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>{persona.nombre}</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-3)' }}>{persona.rol}</span>
            </span>
            {/* Solo donde hay puerta: en la vista previa local no hay sesión de
                la que salir, y un botón que no lleva a ninguna parte es peor que
                no tenerlo. */}
            {hayPuerta() && (
              <button
                onClick={salir}
                aria-label="Cerrar la sesión"
                title="Cerrar la sesión"
                className="hov-linea-4"
                style={{
                  width: 30,
                  height: 30,
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--line-2)',
                  borderRadius: 7,
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  marginLeft: 3,
                }}
              >
                <Icono d={['M15 17l5-5-5-5', 'M20 12H9', 'M12 20H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4H12']} tam={15} />
              </button>
            )}
          </div>
        </header>

        {/* ══════════ BARRA DE CONTEXTO ══════════ */}
        {contexto && (
          <div
            style={{
              position: 'sticky',
              top: 57,
              zIndex: 35,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              padding: '9px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg-card)',
            }}
          >
            {contexto.volver && (
              <button
                onClick={contexto.volver.onClick}
                className="hov-linea"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--line-2)',
                  borderRadius: 6,
                  background: 'var(--bg-elev)',
                  padding: '5px 11px',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <Icono d={ICO.flechaIzq} tam={13} grosor={1.8} />
                {contexto.volver.label}
              </button>
            )}
            {contexto.codigo && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--accent-ink)',
                  background: 'var(--accent-soft)',
                  borderRadius: 6,
                  padding: '4px 10px',
                }}
              >
                {contexto.codigo}
              </span>
            )}
            {contexto.titular && <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{contexto.titular}</span>}
            {contexto.ubic && (
              <span data-sm-hide="1" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {contexto.ubic}
              </span>
            )}
            {contexto.derecha && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>{contexto.derecha}</span>
            )}
            {contexto.estado && (
              <span
                style={{
                  marginLeft: contexto.derecha ? undefined : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 12,
                  color: contexto.estadoColor || 'var(--ink-3)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: contexto.estadoColor || 'var(--ink-4)',
                    display: 'block',
                  }}
                />
                {contexto.estado}
              </span>
            )}
          </div>
        )}

        <main style={{ flex: 1, padding: '22px 20px 96px', animation: 'fadeIn .35s ease' }}>{children}</main>
      </div>

      {/* ══════════ PALETA DE COMANDOS ══════════ */}
      {pal && (
        <>
          <div
            onClick={() => setPal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(26,22,18,.4)', backdropFilter: 'blur(2px)' }}
          />
          <div
            style={{
              position: 'fixed',
              zIndex: 81,
              top: '11vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(600px,92vw)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-2)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-3)',
              overflow: 'hidden',
              animation: 'fadeIn .18s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <Icono d={ICO.lupa} tam={17} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
              <input
                value={pq}
                onChange={(e) => setPq(e.target.value)}
                onKeyDown={teclaDeLaPaleta}
                autoFocus
                role="combobox"
                aria-expanded
                aria-controls="paleta-resultados"
                aria-activedescendant={res.length ? `paleta-opcion-${Math.min(foco, res.length - 1)}` : undefined}
                aria-label="Buscar un destino"
                placeholder="Un destino, un código, un titular…"
                style={{ flex: 1, border: 0, background: 'transparent', padding: '2px 0', fontSize: 15, outline: 'none' }}
              />
              <kbd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 4,
                  padding: '2px 5px',
                }}
              >
                Esc
              </kbd>
            </div>
            <div id="paleta-resultados" role="listbox" aria-label="Destinos" style={{ maxHeight: '52vh', overflow: 'auto' }}>
              {res.map((r, i) => (
                <button
                  key={i}
                  id={`paleta-opcion-${i}`}
                  role="option"
                  aria-selected={i === Math.min(foco, res.length - 1)}
                  /* Que la fila enfocada se vea es la mitad del trabajo: sin
                     esto, bajar más allá del alto visible mueve un foco que
                     nadie puede seguir. */
                  ref={(el) => {
                    if (el && i === Math.min(foco, res.length - 1) && pal) el.scrollIntoView({ block: 'nearest' });
                  }}
                  onMouseEnter={() => setFoco(i)}
                  onClick={() => {
                    r.ir();
                    setPal(false);
                  }}
                  className="hov-acento"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    borderBottom: '1px solid var(--line)',
                    background: i === Math.min(foco, res.length - 1) ? 'var(--accent-soft)' : 'transparent',
                    padding: '11px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: '0 0 auto' }}>{r.nota}</span>
                </button>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                padding: '9px 16px',
                background: 'var(--bg-elev)',
                fontSize: 11.5,
                color: 'var(--ink-3)',
              }}
            >
              <span>
                {res.length} de {m.opciones} opciones de {m.label}
              </span>
              <span>↑↓ mueve · Intro abre · Esc cierra</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

