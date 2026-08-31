import { useMemo, useState } from 'react';
import { Icono } from '../../ds/Icono';
import { ICONOS, ICO } from '../../ds/iconos';
import { Insignia, tonoDe, type Tono } from '../../ds/componentes';
import { MODULOS, moduloDe } from '../../shell/modulos';
import { personaDeLaSesion } from '../../shell/persona';
import { hayPuerta, salir } from '../../api/sesion';
import { EJERCICIOS, soles, usarPreferencias } from '../../shell/preferencias';
import { AVANCE, DEUDA, PAGOS, PARADO, UNIDADES } from '../../datos/inicio';

/**
 * Inicio no es un módulo: es la respuesta a «a quién atiendes». Trae su propio
 * shell —el riel solo aparece para el personal— porque el contribuyente que
 * entra con su DNI no navega por módulos.
 */
export default function Inicio() {
  const { pref, fijar, toast, ir } = usarPreferencias();
  const [rol, setRol] = useState<'muni' | 'contrib'>('muni');
  const [navOpen, setNavOpen] = useState(false);
  const esMuni = rol === 'muni';
  const fechaHoy = `13 de agosto de ${pref.ejercicio}`;

  const cuenta = useMemo(() => {
    let insoluto = 0,
      interes = 0,
      gastos = 0;
    DEUDA.forEach((d) => {
      insoluto += d.insoluto;
      interes += d.interes;
      gastos += d.gastos;
    });
    const debe = insoluto + interes + gastos;
    const predios = UNIDADES.filter((u) => u.predio);
    const vehiculos = UNIDADES.filter((u) => !u.predio);
    return {
      debe,
      conBeneficio: debe - interes,
      vencidas: DEUDA.filter((d) => d.estado !== 'Por vencer'),
      predios,
      vehiculos,
      /* La deducción de 50 UIT exige predio único destinado a vivienda: la marca
         de la tarjeta se deriva de eso, no de un literal. */
      predioUnico: predios.length === 1 && predios[0].pct === 100,
    };
  }, []);

  const rec = useMemo(() => {
    let emitido = 0,
      recaudado = 0;
    AVANCE.forEach((a) => {
      emitido += a[1];
      recaudado += a[2];
    });
    return { emitido, recaudado, pct: (recaudado / emitido) * 100 };
  }, []);

  const paradoTotal = PARADO.reduce((a, p) => a + p[5], 0);

  /* La sesión de verdad es la del personal. La del contribuyente NO se sustituye:
     el ciudadano entra por otro realm —`sgtm-ciudadano`, con su propio emisor
     (ADR-0020)— y aquí es una demostración de la otra cara del mismo Inicio, no
     alguien que haya entrado. Poner ahí la cuenta del funcionario diría que el
     contribuyente es él. */
  const sesion = esMuni
    ? personaDeLaSesion({ iniciales: 'JC', nombre: 'J. Cárdenas Vega', rol: 'Cajero · Caja C-3' })
    : { iniciales: 'MC', nombre: 'María E. Castillo', rol: 'DNI 44218937' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        data-scrim="1"
        data-open={navOpen ? '1' : '0'}
        onClick={() => setNavOpen(false)}
        style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(26,22,18,.34)' }}
      />

      {/* ══════════ EL SHELL DEL PERSONAL: RIEL + PANEL ══════════ */}
      {esMuni && (
        <>
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
              const actual = x.k === 'inicio';
              return (
                <button
                  key={x.k}
                  onClick={() => ir(x.k)}
                  title={x.label}
                  aria-label={x.label}
                  aria-current={actual ? 'true' : undefined}
                  className={actual ? undefined : 'hov-blanco'}
                  style={{
                    width: 44,
                    height: 40,
                    display: 'grid',
                    placeItems: 'center',
                    border: 0,
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: actual ? '#fff' : 'rgba(255,255,255,.62)',
                    background: actual ? 'rgba(255,255,255,.18)' : 'transparent',
                  }}
                >
                  <Icono d={ICONOS[x.label]} tam={19} />
                </button>
              );
            })}
          </nav>

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
              <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                Módulo
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, letterSpacing: '-.01em' }}>Inicio</p>
              <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{pref.entidad}</p>
            </div>
            <div style={{ padding: '12px 12px 11px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '11px 12px', background: 'var(--bg-card)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>
                  Recaudado hoy
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>{soles(27693.3)}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>148 recibos · caja C-3 abierta</p>
              </div>
            </div>
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(
                [
                  ['Buscar contribuyente', 'DNI, RUC, placa o recibo', ICO.lupa, 'consultas', 'buscar'],
                  ['Cobrar', 'Deuda y tasas del TUPA', ICO.caja, 'tesoreria', 'cobrar'],
                  ['Constancia de no adeudo', 'Se emite en el acto', ICO.hoja, 'consultas', 'constancia'],
                  ['Cerrar caja', 'Arqueo del turno', ICO.grafico, 'tesoreria', 'cierre'],
                ] as const
              ).map((a) => (
                <button
                  key={a[0]}
                  onClick={() => ir(a[3], a[4])}
                  className="hov-acento"
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
                    background: 'transparent',
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
                      border: '1px solid var(--line-2)',
                      background: 'var(--bg-card)',
                      color: 'var(--ink-3)',
                    }}
                  >
                    <Icono d={a[2]} tam={15} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5 }}>{a[0]}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 1 }}>{a[1]}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 'auto', padding: '12px 12px 16px', borderTop: '1px solid var(--line)' }}>
              <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                Inicio no es un módulo: es la respuesta a «a quién atiendes». Cambia según quién entra.
              </p>
            </div>
          </aside>
        </>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
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
          {esMuni && (
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
          )}
          {!esMuni && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                S
              </span>
              <span style={{ lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>SGTM</span>
                <span data-sm-hide="1" style={{ display: 'block', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
                  {pref.entidad}
                </span>
              </span>
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 1px', fontSize: 11, color: 'var(--ink-3)' }}>{esMuni ? 'Inicio' : 'Mi cuenta'}</p>
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
              {esMuni ? 'Panel de recaudación' : 'Panel del contribuyente'}
            </h1>
          </div>
          {esMuni && (
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
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-3)' }}>Ejercicio</span>
              <select
                value={pref.ejercicio}
                onChange={(e) => {
                  fijar({ ejercicio: e.target.value });
                  toast(`Ejercicio ${e.target.value}${moduloDe('inicio').avisoDeEjercicio}`);
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
                {EJERCICIOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  : ['M12 6.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8', 'M12 2.6v1.8', 'M12 18.1v2.4', 'M2.6 12h1.8', 'M19.6 12h1.8']
              }
              tam={16}
            />
          </button>
          {/* El conmutador de rol: en el sistema real lo decide la sesión —un
              usuario de la municipalidad o un contribuyente con su DNI—; aquí se
              puede cambiar para ver las dos caras del mismo Inicio. */}
          <div
            data-noprint="1"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              border: '1px solid var(--line-2)',
              borderRadius: 7,
              overflow: 'hidden',
              background: 'var(--bg-card)',
              flex: '0 0 auto',
            }}
          >
            {(
              [
                ['muni', 'Personal', 'Sesión de un usuario de la municipalidad'],
                ['contrib', 'Contribuyente', 'Sesión de un contribuyente autenticado con su DNI'],
              ] as const
            ).map((r) => {
              const on = rol === r[0];
              return (
                <button
                  key={r[0]}
                  onClick={() => {
                    setRol(r[0]);
                    setNavOpen(false);
                  }}
                  aria-pressed={on}
                  title={r[2]}
                  style={{
                    border: 0,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: on ? 600 : 400,
                    background: on ? 'var(--accent)' : 'transparent',
                    color: on ? '#fff' : 'var(--ink-3)',
                  }}
                >
                  {r[1]}
                </button>
              );
            })}
          </div>
          <div data-sm-hide="1" style={{ display: 'flex', alignItems: 'center', gap: 9, borderLeft: '1px solid var(--line)', paddingLeft: 12 }}>
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
              {sesion.iniciales}
            </span>
            <span style={{ lineHeight: 1.25 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>{sesion.nombre}</span>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-3)' }}>{sesion.rol}</span>
            </span>
            {/* Inicio es donde se aterriza, así que también es desde donde hay que
                poder salir: sin esto habría que entrar en un módulo para cerrar
                sesión. Solo en la cara del personal, que es la que tiene una. */}
            {esMuni && hayPuerta() && (
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

        <main style={{ flex: 1, padding: '22px 20px 96px', animation: 'fadeIn .35s ease' }}>
          {/* ══════════ PANEL DE RECAUDACIÓN ══════════ */}
          {esMuni && (
            <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch', textWrap: 'pretty' }}>
                Lo que hay que saber al abrir el sistema: cuánto se ha recaudado del ejercicio, dónde está lo que falta y qué módulo tiene
                trabajo parado. Nada que no lleve a una pantalla concreta.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 13 }}>
                {[
                  { valor: `S/ ${(rec.recaudado / 1000000).toFixed(2)} M`, etiqueta: 'Recaudado del ejercicio', nota: `De ${soles(rec.emitido)} emitidos.` },
                  { valor: `${rec.pct.toFixed(1)} %`, etiqueta: 'Avance de la recaudación', nota: `Faltan ${soles(rec.emitido - rec.recaudado)} por cobrar.` },
                  { valor: '62,418', etiqueta: 'Contribuyentes en el padrón', nota: '18,412 predios y 8,844 vehículos afectos.' },
                  /* Forma compacta como en el primer indicador: el importe completo a
                     27 px parte en dos líneas justo después de «S/». La cifra exacta
                     va en la nota. */
                  { valor: `S/ ${(paradoTotal / 1000000).toFixed(2)} M`, etiqueta: 'Parado por falta de un acto', nota: `${soles(paradoTotal)} en notificaciones, RECs y determinaciones sin emitir.` },
                ].map((k) => (
                  <div
                    key={k.etiqueta}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '17px 18px' }}
                  >
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 27, fontWeight: 500, letterSpacing: '-.015em', color: 'var(--accent-ink)' }}>
                      {k.valor}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                  </div>
                ))}
              </div>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                    Emitido contra recaudado · ejercicio {pref.ejercicio}
                  </h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>al 13/08</span>
                </div>
                {AVANCE.map((a) => {
                  const p = (a[2] / a[1]) * 100;
                  const color = p < 50 ? 'var(--bad-fg)' : p < 80 ? 'var(--warn-fg)' : 'var(--ok-fg)';
                  const relleno = p < 50 ? 'var(--bad-fg)' : p < 80 ? 'var(--warn-fg)' : 'var(--accent)';
                  return (
                    <div key={a[0]} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ flex: '0 0 196px', minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{a[0]}</span>
                      <span style={{ flex: 1, minWidth: 60, height: 10, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${p.toFixed(1)}%`, borderRadius: 999, background: relleno }} />
                      </span>
                      <span style={{ flex: '0 0 60px', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color }}>
                        {p.toFixed(1)} %
                      </span>
                      <span data-sm-hide="1" style={{ flex: '0 0 124px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                        {soles(a[1] - a[2])}
                      </span>
                    </div>
                  );
                })}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
                  {(
                    [
                      ['Emitido', soles(rec.emitido), false],
                      ['Recaudado', soles(rec.recaudado), false],
                      ['Saldo por cobrar', soles(rec.emitido - rec.recaudado), false],
                      ['Avance', `${rec.pct.toFixed(1)} %`, true],
                    ] as const
                  ).map((t) => (
                    <div
                      key={t[0]}
                      style={{
                        background: t[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
                        padding: '14px 16px',
                        borderLeft: '1px solid var(--line)',
                        borderTop: '1px solid var(--line)',
                        margin: '-1px 0 0 -1px',
                      }}
                    >
                      <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{t[0]}</p>
                      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 16, whiteSpace: 'nowrap', color: 'var(--ink)' }}>{t[1]}</p>
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Multas y papeletas al {((1588412 / 4118200) * 100).toFixed(1)} % no es un problema de caja: es lo que Tránsito no llegó a
                  notificar.
                </p>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Trabajo parado, por módulo</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{PARADO.length} frentes</span>
                </div>
                {PARADO.map((p) => (
                  <button
                    key={p[0]}
                    onClick={() => ir(p[6])}
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
                    <Insignia tono={p[1]}>{p[0]}</Insignia>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{p[2]}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{p[3]}</span>
                    </span>
                    <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                        {p[4].toLocaleString('es-PE')}
                      </span>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                        {p[5] > 0 ? soles(p[5]) : 'sin cifrar'}
                      </span>
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                ))}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Cada fila es dinero que no entra por una razón que se puede arreglar hoy. Suman {soles(paradoTotal)}.
                </p>
              </section>
            </div>
          )}

          {/* ══════════ PANEL DEL CONTRIBUYENTE ══════════ */}
          {!esMuni && (
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section style={{ background: 'var(--accent)', borderRadius: 12, padding: '26px 26px 24px', color: '#fff' }}>
                <p style={{ margin: '0 0 9px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', opacity: 0.72 }}>
                  Su cuenta al {fechaHoy}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 29, fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.2, textWrap: 'pretty' }}>
                  María Elena, tiene {cuenta.vencidas.length} obligaciones vencidas y una por vencer.
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap', marginTop: 18 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.72 }}>Debe hoy</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, letterSpacing: '-.02em' }}>{soles(cuenta.debe)}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.72 }}>Con el beneficio vigente</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}>{soles(cuenta.conBeneficio)}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 20 }} />
                  <button
                    onClick={() => toast(`Abriría el pago en línea por ${soles(cuenta.conBeneficio)}.`)}
                    style={{ border: 0, borderRadius: 8, padding: '13px 24px', background: '#fff', color: 'var(--accent-ink)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', flex: '0 0 auto' }}
                  >
                    Pagar en línea
                  </button>
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.55, opacity: 0.82, maxWidth: '64ch', textWrap: 'pretty' }}>
                  La cifra está calculada al {fechaHoy} y cambia cada día: el interés corre. Con la Ordenanza 012-2026-MDC, vigente hasta el
                  31 de diciembre, se condona el 100 % del interés moratorio.
                </p>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que debe, por concepto</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{DEUDA.length} conceptos</span>
                </div>
                {DEUDA.map((d) => (
                  <div key={d.concepto} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <Insignia tono={tonoDe(d.estado) as Tono}>{d.estado}</Insignia>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{d.concepto}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                        Unidad {d.unidad}
                        {d.interes > 0 && ` · incluye ${soles(d.interes)} de interés`}
                        {d.gastos > 0 && ` y ${soles(d.gastos)} de gastos`}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
                        {soles(d.insoluto + d.interes + d.gastos)}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>{d.vence}</span>
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', background: 'var(--bg-elev)' }}>
                  <span style={{ flex: 1, minWidth: 170, fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Puede pagar todo, una cuota o acogerse a un fraccionamiento desde el 20 % de inicial. Lo que está en cobranza coactiva se
                    paga igual, pero además tiene costas.
                  </span>
                  <button
                    onClick={() => toast('Abriría la simulación del fraccionamiento.')}
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
                  >
                    Fraccionar la deuda
                  </button>
                </div>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Sus predios y vehículos</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {cuenta.predios.length} {cuenta.predios.length === 1 ? 'predio' : 'predios'} · {cuenta.vehiculos.length}{' '}
                    {cuenta.vehiculos.length === 1 ? 'vehículo' : 'vehículos'}
                  </span>
                </div>
                {UNIDADES.map((u) => (
                  <div key={u.codigo} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent-ink)', background: 'var(--accent-soft)', borderRadius: 5, padding: '4px 9px', flex: '0 0 auto' }}>
                      {u.codigo}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{u.titulo}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{u.detalle}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-2)', flex: '0 0 auto' }}>{u.valor}</span>
                  </div>
                ))}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Si algún dato no coincide con la realidad de su predio, puede pedir su rectificación: el impuesto se calcula sobre estos
                  datos.
                </p>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Qué puede hacer sin venir a la municipalidad</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(248px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                  {[
                    { label: 'Pagar en línea', detalle: 'Con tarjeta o banca por internet. El recibo se emite al instante y la deuda se descuenta el mismo día.', icon: ICO.tarjeta, marca: '', tono: 'warn' as Tono, msj: 'Abriría el pago en línea.' },
                    { label: 'Constancia de no adeudo', detalle: 'Se emite solo si no debe nada. Ahora mismo saldría como constancia de deuda.', icon: ICO.sello, marca: 'No disponible', tono: 'bad' as Tono, msj: 'Con deuda pendiente la constancia sale como constancia de deuda.' },
                    { label: 'Fraccionar la deuda', detalle: 'Desde el 20 % de inicial y hasta 24 cuotas. Dos cuotas impagas quiebran el convenio.', icon: ICO.reloj, marca: '', tono: 'warn' as Tono, msj: 'Abriría la simulación del fraccionamiento.' },
                    { label: 'Declaración jurada', detalle: 'Si compró, vendió, amplió o demolió, tiene que declararlo. El plazo es hasta el último día hábil de febrero.', icon: ICO.hoja, marca: '', tono: 'warn' as Tono, msj: 'Abriría el formulario de declaración.' },
                    { label: 'Ver mi predio en el mapa', detalle: 'Compruebe que los linderos y el área que figuran son los de su predio.', icon: ICO.mapa, marca: '', tono: 'warn' as Tono, msj: 'Abriría el visor catastral.' },
                    {
                      label: 'Solicitar beneficio de pensionista',
                      detalle: cuenta.predioUnico
                        ? 'Deducción de 50 UIT si es pensionista o adulto mayor. Su único predio es de vivienda, así que cumple ese requisito; falta acreditar la condición de pensionista.'
                        : `Deducción de 50 UIT para pensionistas y adultos mayores. Exige predio único de vivienda y usted tiene ${cuenta.predios.length} predios registrados, así que hoy no cumple el requisito.`,
                      icon: ICO.aviso,
                      /* Marca corta: la insignia es inflexible y con `nowrap`, así que
                         una etiqueta larga le quita el ancho al título. El motivo va
                         en el detalle. */
                      marca: cuenta.predioUnico ? 'Puede aplicar' : 'No procede',
                      tono: (cuenta.predioUnico ? 'ok' : 'warn') as Tono,
                      msj: cuenta.predioUnico
                        ? 'Abriría la solicitud de beneficio.'
                        : `Con ${cuenta.predios.length} predios registrados la deducción de 50 UIT no procede.`,
                    },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => toast(t.msj)}
                      className="hov-acento"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        borderLeft: '1px solid var(--line)',
                        borderTop: '1px solid var(--line)',
                        margin: '-1px 0 0 -1px',
                        padding: '15px 16px 17px',
                        cursor: 'pointer',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            flex: '0 0 auto',
                            border: '1px solid var(--line-2)',
                            background: 'var(--bg-elev)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          <Icono d={t.icon} tam={16} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{t.label}</span>
                        {t.marca && <Insignia tono={t.tono}>{t.marca}</Insignia>}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', marginTop: 8, textWrap: 'pretty' }}>
                        {t.detalle}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Sus últimos pagos</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>3 de 38</span>
                </div>
                {PAGOS.map((p) => (
                  <div key={p.recibo} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', flex: '0 0 auto' }}>{p.fecha}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)', textWrap: 'pretty' }}>{p.concepto}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)', flex: '0 0 auto' }}>{soles(p.monto)}</span>
                    <button
                      onClick={() => toast(`Descargaría el recibo ${p.recibo}.`)}
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer', flex: '0 0 auto', whiteSpace: 'nowrap' }}
                    >
                      Recibo
                    </button>
                  </div>
                ))}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Un pago aplicado ya descontó la cuota. Si pagó y sigue apareciendo la deuda, traiga el recibo: se resuelve en ventanilla el
                  mismo día.
                </p>
              </section>

              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-4)', textAlign: 'center', textWrap: 'pretty' }}>
                Los importes están calculados al {fechaHoy}. Si algo no coincide con sus recibos, acuda a la Unidad de Rentas con el
                comprobante: se corrige el mismo día.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
