import { useState } from 'react';
import { Icono } from '../../ds/Icono';
import { ICONOS, ICO } from '../../ds/iconos';
import { Aviso, Esqueleto, Insignia } from '../../ds/componentes';
import { MODULOS } from '../../shell/modulos';
import { personaDeLaSesion } from '../../shell/persona';
import { hayPuerta, salir } from '../../api/sesion';
import { ejerciciosCon, miles, usarPreferencias } from '../../shell/preferencias';
import { indicadores, trabajoParado, type ImporteConFecha } from '../../api/rentas';
import { useRecurso } from '../../api/useRecurso';
import { FalloDeLectura } from '../../api/Fallo';
import { dia, instante, zonaDelLector } from '../../ds/fechas';

/** Lo que se dibuja cuando no hay dato. Igual que en el resto del producto. */
const SIN_DATO = '—';

/**
 * Un importe del backend, tal cual, con el signo de soles delante.
 *
 * **No convierte a numero.** El backend manda `BigDecimal.toPlainString()` y
 * pasarlo por `Number` lo mete en un `double`, que es lo que la regla 1 prohibe
 * al otro lado y por el mismo motivo. Lo unico que se hace es separar los miles
 * —que es tipografia, no aritmetica—, con la misma guarda que `areaEnMetros`:
 * sale verbatim todo lo que no sea un decimal sin signo y sin ceros a la
 * izquierda, para no convertir un codigo en una cantidad.
 *
 * Un nulo NO sale como «S/ 0.00»: sale con el guion. Un cero es una medida y un
 * nulo es que no hay cifra, y confundirlos es lo que el AC 2.2 de #549 existe
 * para impedir.
 */
function moneda(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return SIN_DATO;
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(v)) return 'S/ ' + v;
  const punto = v.indexOf('.');
  const entero = punto === -1 ? v : v.slice(0, punto);
  const decimales = punto === -1 ? '.00' : v.slice(punto).padEnd(3, '0');
  return 'S/ ' + entero.replace(/\B(?=(\d{3})+$)/g, ',') + decimales;
}

/**
 * Donde se desatasca cada frente, dicho como una parada del riel.
 *
 * La llave es el nombre del **enumerado** del backend, no el rotulo: el rotulo
 * es prosa que el servidor redacta y reescribirla no debe mover a nadie de
 * modulo. El valor es el par (modulo, destino) del shell, elegido para que sea
 * la misma pantalla cuyo permiso de lectura decide que el frente se publique
 * —`transito_padron` → Papeletas, `consulta_valores` → Valores,
 * `coactiva_expedientes` → Expedientes, `consulta_fichas` → Predios—: quien
 * recibe el frente puede abrir eso, asi que el enlace no lleva a un 403.
 *
 * **Un frente que no este aqui no se enlaza.** El enumerado del backend puede
 * crecer —el propio issue enumera seis y hoy hay cuatro—, y mandar a nadie a
 * `#/undefined/panel` es peor que dejar la fila sin enlace: la fila se dibuja
 * igual, con su recuento, y dice que todavia no tiene pantalla a la que llevar.
 */
const DESTINO_DEL_FRENTE: Record<string, { modulo: string; dest: string } | undefined> = {
  TRANSITO: { modulo: 'transito', dest: 'padron' },
  VALORES: { modulo: 'valores', dest: 'lista' },
  COACTIVA: { modulo: 'coactiva', dest: 'lista' },
  CATASTRO: { modulo: 'catastro', dest: 'predios' },
};

/**
 * Lo que una fila de frente dice de su importe, y por que.
 *
 * Tres estados y no dos: la cifra, el cero medido y el «no se cifra». El
 * tercero **no** puede salir como `S/ 0.00` —seria afirmar que ese trabajo
 * parado no cuesta nada—, y el segundo tampoco puede salir como guion, porque
 * cero papeletas sin emitir es un hecho y una buena noticia.
 */
function importeDelFrente(f: { cuantos: number; importe: ImporteConFecha | null }): {
  texto: string;
  motivo: string | null;
} {
  if (f.importe !== null) {
    return { texto: moneda(f.importe.importe), motivo: null };
  }
  return {
    texto: SIN_DATO,
    motivo:
      f.cuantos === 0
        ? 'Su módulo no publica lo que suma este frente, así que no se cifra ni cuando está en cero.'
        : 'Su módulo cuenta cuántos hay pero no suma lo que valen; ponerle una cifra aquí sería inventarla.',
  };
}

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
  /* `fechaHoy` se ha ido: decia «13 de agosto de {ejercicio}», una fecha
     ESCRITA A MANO del artboard, y rotulaba «Su cuenta al …» y «Los importes
     estan calculados al …» — o sea le ponia fecha de corte a unas cifras que
     ademas eran de la maqueta (regla 9 al reves: la fecha tambien se inventaba). */

  /* `cuenta` se ha ido con la maqueta. Sumaba `DEUDA` —insoluto + interes +
     gastos— para pintar «Debe hoy» y «Con el beneficio vigente», o sea componia
     dinero en la pantalla (RNF-083) sobre cifras que ademas eran del artboard.
     Y derivaba `predioUnico` para marcar la deduccion de 50 UIT del
     pensionista, que es una regla tributaria (regla 6) y no vive aqui. */

  /* ── El panel de recaudacion, contra `GET /indicadores/recaudacion` ──
     Es la unica lectura de indicadores del sistema (ARQ-01 §3.13). Sus cuatro
     KPI y sus dos paneles vienen ya compuestos, con su fecha: aqui no se suma
     nada (RNF-083). */
  const panel = useRecurso((s2) => indicadores(pref.ejercicio, s2), [pref.ejercicio], esMuni);
  const porTributo = panel.datos?.paneles.find((x) => /tributo/i.test(x.title));
  /* La tarjeta del panel lateral dice lo mismo que el cuarto KPI. Se busca por
     rotulo y no por posicion: el orden de `kpis` no es contrato, y tomar el
     [3] pondria en «Recaudado hoy» la cifra de otra cosa el dia que cambie. */
  const kpiDelDia = panel.datos?.kpis.find((k) => /hoy/i.test(k.label)) ?? null;

  /* ── El trabajo parado por modulo, contra `GET /indicadores/trabajo-parado` ──
     Es una lectura APARTE de la del panel, y no un trozo de ella: son cuatro
     modulos distintos, con cuatro permisos distintos, y el backend le da a cada
     uno su propio `calculadoEn`. Falla por su lado y se dibuja por su lado: que
     no se pueda leer la recaudacion no tiene por que borrar el trabajo parado.

     Lo que llega ya viene filtrado por permiso —cada frente lleva detras el
     acceso de la pantalla de su modulo— asi que aqui NO se filtra otra vez ni
     se pregunta por los permisos: se dibuja lo que hay. Una fila «no puedes ver
     esto» seria justo lo que ADR-0016 §2 prohibe (#297). */
  const parado = useRecurso((s2) => trabajoParado(pref.ejercicio, s2), [pref.ejercicio], esMuni);

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
                {/* Lo cobrado HOY, del panel de recaudacion. Antes decia
                    «S/ 27,693.30 · 148 recibos · caja C-3 abierta», tres cifras
                    de la maqueta, y el KPI real de la misma pantalla decia
                    «S/ 0.00»: las dos a la vista y nada que las separara. */}
                <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 21, color: 'var(--ink)' }}>
                  {panel.cargando ? <Esqueleto alto={21} ancho={110} /> : (kpiDelDia?.value ?? '—')}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>
                  {panel.cargando
                    ? 'Leyendo la caja…'
                    : (kpiDelDia?.note ?? 'No se pudo leer lo cobrado hoy.')}
                </p>
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
                {/* La lista lleva SIEMPRE el año que se está mirando (#557).
                    Medido aquí antes de arreglarlo: con la sesión declarando
                    `ejercicioDeTrabajo` 2019 —un año que la lista compilada no
                    tiene— este panel pedía sus indicadores de 2019 y la píldora
                    de encima decía «2026», porque un `<select>` cuyo `value` no
                    está entre sus `<option>` no se queda en el valor. La
                    cabecera contradecía a la cifra que tenía debajo. */}
                {ejerciciosCon(pref.ejercicio).map((a) => (
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

              {/* El panel NO tiene respaldo de maqueta.
                  Lo tuvo, y era lo peor de esta pantalla: sin sesion, con la red
                  cortada y durante la carga salian «S/ 18.42 M», «77.7 %» y
                  «62,418 contribuyentes» —cifras de la maqueta, tres ordenes de
                  magnitud por encima de las reales— sin un solo aviso. Es la
                  pantalla de aterrizaje: un gerente lee el avance y se lo cree. */}
              {panel.error !== null && (
                <FalloDeLectura
                  error={panel.error}
                  que="el panel de recaudación"
                  acceso="panel_recaudacion"
                  alReintentar={panel.reintentar}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 13 }}>
                {(panel.datos
                  ? panel.datos.kpis.map((k) => ({ valor: k.value, etiqueta: k.label, nota: k.note }))
                  : [0, 1, 2, 3].map((i) => ({ valor: null, etiqueta: `k${i}`, nota: null }))
                ).map((k) => (
                  <div
                    key={k.etiqueta}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '17px 18px' }}
                  >
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 27, fontWeight: 500, letterSpacing: '-.015em', color: 'var(--accent-ink)' }}>
                      {k.valor ?? (panel.cargando ? <Esqueleto alto={27} ancho={132} /> : '—')}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                      {k.valor === null ? (panel.cargando ? <Esqueleto alto={12} ancho={104} /> : 'Sin leer') : k.etiqueta}
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      {k.nota ?? (panel.cargando ? <Esqueleto alto={11} ancho="80%" /> : '')}
                    </p>
                  </div>
                ))}
              </div>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                    Emitido contra recaudado · ejercicio {pref.ejercicio}
                  </h2>
                  {/* LO EMITIDO, por fin como cifra y no dentro de una frase (#549).
                      El titulo de esta seccion promete «emitido contra recaudado» y
                      hasta hoy el emitido no estaba: la franja que lo decia se
                      retiro porque era de la maqueta —«S/ 23,725,394.80» sobre
                      filas que suman catorce mil— y la unica cifra real vivia
                      dentro del texto del KPI «Avance de cobranza», «de
                      S/ 14,384.83 cargados». Sacarla de ahi con una expresion
                      regular habria sido peor que no tenerla.

                      Se LEE, no se compone: es `panel.datos.cargado`, un importe
                      con su fecha. Sumar los `cargado` de las filas daria el mismo
                      numero hoy y seria componer dinero en la pantalla (RNF-083),
                      ademas de romperse el dia que el bloque no traiga todos los
                      tributos. Y lo recaudado y el avance NO se repiten aqui: ya
                      son dos de los cuatro KPI de arriba. */}
                  {panel.datos && (
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--ink-4)' }}>Emitido</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--ink)' }}>
                        {moneda(panel.datos.cargado.importe)}
                      </span>
                      {/* SU fecha, no la del panel. `cargado` viaja con su propio
                          `actualizadoA` a proposito —«es la fecha con la que el
                          libro contesto», dice el dominio— y no con
                          `fechaCalculo`: hoy son la misma, y el dia que el libro
                          conteste con otra, estampar aqui la del panel seria
                          fechar una cifra con una fecha que no es la suya
                          (regla 9). Por eso no hay una fecha suelta de seccion:
                          cada cifra lleva la que le corresponde, y la del panel
                          entero se dice una vez al pie. */}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                        al {dia(panel.datos.cargado.actualizadoA)}
                      </span>
                    </span>
                  )}
                </div>
                {(porTributo?.rows ?? []).map((r) => ({
                  etiqueta: r.label,
                  pct: r.pct,
                  conocido: r.avanceConocido,
                  valor: r.value,
                  /* Las dos cifras salen de los CAMPOS y no del `sub` (#549).
                     El `sub` dice lo mismo con palabras —«cargado S/ 1,697.65 ·
                     pendiente S/ 1,697.65»— y sigue siendo lo que se lee cuando
                     la fila no publica los campos: el bloque «por mes» agrupa
                     por el mes del abono y no tiene cargado propio, y ahi un
                     cero afirmaria que ese mes cargo cero.

                     Cada una lleva SU fecha, que puede no ser la de la
                     cabecera: la del bloque es una sola hoy, pero es la fila la
                     que la publica y es la fila la que la tiene que decir
                     (regla 9). */
                  cargado: r.cargado,
                  pendiente: r.pendiente,
                  sub: r.sub,
                })).map((a) => {
                  const color = !a.conocido ? 'var(--ink-4)' : a.pct < 50 ? 'var(--bad-fg)' : a.pct < 80 ? 'var(--warn-fg)' : 'var(--ok-fg)';
                  const relleno = a.pct < 50 ? 'var(--bad-fg)' : a.pct < 80 ? 'var(--warn-fg)' : 'var(--accent)';
                  return (
                    <div key={a.etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ flex: '0 0 196px', minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>{a.etiqueta}</span>
                      <span style={{ flex: 1, minWidth: 60, height: 10, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                        {/* Sin base sobre la que calcular, NO se dibuja barra: un
                            0 % y un «no se sabe» no son lo mismo, y el backend
                            los distingue con `avanceConocido`. */}
                        {a.conocido && (
                          <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${a.pct.toFixed(1)}%`, borderRadius: 999, background: relleno }} />
                        )}
                      </span>
                      <span style={{ flex: '0 0 60px', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color }}>
                        {a.conocido ? `${a.pct.toFixed(1)} %` : '—'}
                      </span>
                      {/* Las cifras, del campo; el motivo, del `sub`.
                          Cuando la barra NO se pudo medir, el `sub` deja de
                          repetir las dos cifras y pasa a decir por que —«sin
                          cargos asentados en el ejercicio»—: es lo unico que
                          explica el hueco de la barra y el guion del
                          porcentaje, asi que ahi manda el, no los campos.
                          Ponerle «cargado S/ 0.00 · pendiente S/ 0.00» en su
                          lugar cambiaria una explicacion por dos ceros. */}
                      <span data-sm-hide="1" style={{ flex: '0 0 316px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {a.conocido && a.cargado !== null && a.pendiente !== null ? (
                          <>
                            cargado {moneda(a.cargado.importe)} · pendiente {moneda(a.pendiente.importe)}
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-4)' }}>al {dia(a.cargado.actualizadoA)}</span>
                          </>
                        ) : (
                          a.sub
                        )}
                      </span>
                    </div>
                  );
                })}
                {porTributo === undefined && !panel.cargando && panel.error === null && (
                  <p style={{ margin: 0, padding: '22px 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    El panel no trae ninguna línea por tributo para {pref.ejercicio}.
                  </p>
                )}
                {panel.cargando && (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Esqueleto alto={10} />
                    <Esqueleto alto={10} />
                    <Esqueleto alto={10} />
                  </div>
                )}
                {/* Aqui hubo una franja de totales —EMITIDO / RECAUDADO / SALDO /
                    AVANCE— sumada sobre la maqueta: decia «S/ 23,725,394.80 ·
                    S/ 18,424,251.20 · 77.7 %» encima de tres filas reales que
                    suman catorce mil, y contradecirlas por tres ordenes de
                    magnitud era peor que no decir nada.

                    De las cuatro cifras, tres ya estaban arriba como KPI y la
                    cuarta —lo emitido— no la publicaba nadie. Desde #549 si, y
                    esta en la cabecera de esta seccion, LEIDA de `cargado`. La
                    franja no vuelve: recomponer aqui el saldo y el avance
                    seria restar y dividir dos cifras de dinero en la pantalla
                    (RNF-083), y el avance ya viene calculado en su KPI. */}
                <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  {porTributo?.note ??
                    'Lo recaudado, la cartera pendiente y el avance del ejercicio están arriba, tal como los publica el panel.'}
                  {/* La hora de la lectura, no el dia (#549). `fechaCalculo` es
                      el dia tributario al que estan calculadas las cifras y
                      `calculadoEn` es CUANDO se leyeron: dos lecturas del mismo
                      dia dan cifras distintas —el interes corre, la caja
                      cobra— y sin la hora no se distingue cual se esta mirando.
                      Va por `instante()`, que es lo unico que lo dibuja en la
                      zona del lector: partir la cadena lo dejaria en UTC, y en
                      Peru son cinco horas, suficiente para cambiar de dia. */}
                  {panel.datos && (
                    <span style={{ display: 'block', marginTop: 4, color: 'var(--ink-4)' }}>
                      Cifras al {dia(panel.datos.fechaCalculo)}, leídas el {instante(panel.datos.calculadoEn)}, hora de{' '}
                      {zonaDelLector()}. No se actualiza solo.
                    </span>
                  )}
                </p>
              </section>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Dónde se para el trabajo</h2>
                  {/* El recuento de frentes sale de lo LEIDO, no de una constante.
                      Decia «6 módulos» siempre, y eran seis filas de la maqueta;
                      ahora son los que este perfil puede ver, que es un numero
                      que cambia con quien entra. */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {parado.datos ? `${parado.datos.frentes.length} ${parado.datos.frentes.length === 1 ? 'frente' : 'frentes'} · al ${dia(parado.datos.fechaCalculo)}` : ''}
                  </span>
                </div>

                {parado.error !== null && (
                  <div style={{ padding: '14px 16px' }}>
                    <FalloDeLectura
                      error={parado.error}
                      que="el trabajo parado por módulo"
                      alReintentar={parado.reintentar}
                    />
                  </div>
                )}

                {parado.cargando && (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Esqueleto alto={14} />
                    <Esqueleto alto={14} />
                    <Esqueleto alto={14} />
                  </div>
                )}

                {/* Ni una fila de aqui es de la maqueta (#549).
                    Lo eran las seis: «1,842 papeletas caducadas sin notificar ·
                    S/ 788,976.00», con su tono rojo, sumando S/ 1,351,114.40
                    que nadie habia contado. Lo que se dibuja ahora son los
                    frentes que `GET /indicadores/trabajo-parado` devuelve, con
                    el recuento y el importe que el backend cuenta con la MISMA
                    consulta que sostiene la pantalla del modulo (AC 2.4).

                    Y el rotulo lo redacta el servidor —`queEstaParado`,
                    `porQueCuestaDinero`—: reescribirlo aqui dejaria a la
                    pantalla de aterrizaje diciendo de un frente algo distinto
                    de lo que dice el modulo donde se desatasca (RNF-080). */}
                {(parado.datos?.frentes ?? []).map((f) => {
                  const destino = DESTINO_DEL_FRENTE[f.frente];
                  const cifra = importeDelFrente(f);
                  const idMotivo = `parado-${f.frente}-motivo`;
                  /* El cuerpo de la fila es el mismo se pueda entrar o no: lo
                     unico que cambia es si es un boton. Un frente sin destino
                     conocido —el enumerado del backend puede crecer— se dibuja
                     igual y dice que todavia no lleva a ninguna parte, en vez
                     de mandar a nadie a una ruta que no existe. */
                  const cuerpo = (
                    <>
                      <Insignia tono="neutro">{f.modulo}</Insignia>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>
                          {miles(f.cuantos)} · {f.queEstaParado}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>
                          {f.porQueCuestaDinero}
                          {destino === undefined && ' · todavía no hay pantalla a la que llevar desde aquí'}
                        </span>
                      </span>
                      <span style={{ flex: '0 0 auto', textAlign: 'right' }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: cifra.motivo === null ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {cifra.texto}
                        </span>
                        {/* La fecha va SOLO donde hay cifra que fechar: bajo un
                            guion diria que el guion esta calculado a esa fecha
                            (regla 9). El recuento no es dinero y la lleva la
                            cabecera de la seccion. */}
                        {f.importe !== null && (
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-4)' }}>al {dia(f.importe.actualizadoA)}</span>
                        )}
                      </span>
                    </>
                  );
                  /* El motivo del guion va DIBUJADO, no en un `title`: la fila
                     puede ser un boton y un `title` no lo lee un lector de
                     pantalla (RNF-082). Se ata con `aria-describedby` para que
                     se lea junto con la fila, no como un parrafo suelto. */
                  const motivo = cifra.motivo !== null && (
                    <p id={idMotivo} style={{ margin: 0, padding: '0 16px 11px 16px', fontSize: 11, lineHeight: 1.45, color: 'var(--ink-4)', textWrap: 'pretty' }}>
                      Sin cifrar: {cifra.motivo}
                    </p>
                  );
                  const ESTILO = {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    textAlign: 'left' as const,
                    border: 0,
                    background: 'transparent',
                    padding: '13px 16px',
                  };
                  return (
                    <div key={f.frente} style={{ borderBottom: '1px solid var(--line)' }}>
                      {destino !== undefined ? (
                        <button
                          onClick={() => ir(destino.modulo, destino.dest)}
                          className="hov-acento"
                          aria-describedby={cifra.motivo !== null ? idMotivo : undefined}
                          style={{ ...ESTILO, cursor: 'pointer' }}
                        >
                          {cuerpo}
                          <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                        </button>
                      ) : (
                        <div style={ESTILO}>{cuerpo}</div>
                      )}
                      {motivo}
                    </div>
                  );
                })}

                {/* Cero frentes NO es «no hay trabajo parado»: es que este perfil
                    no puede abrir ninguna de las cuatro pantallas donde se
                    desatasca. Decirlo con una lista vacia sin explicacion seria
                    afirmar lo primero. */}
                {parado.datos !== null && parado.datos.frentes.length === 0 && (
                  <p style={{ margin: 0, padding: '22px 16px', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    Tu perfil no puede abrir ninguna de las pantallas donde este trabajo se desatasca, así que el panel no
                    cuenta ninguno. Esto no dice que no haya trabajo parado: dice que no te toca a ti.
                  </p>
                )}

                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Cada fila es un frente donde el trabajo se queda parado y el dinero no entra. Los recuentos salen de la misma
                  consulta que sostiene la pantalla de su módulo, así que dicen lo mismo que dirá el módulo cuando entres.
                  <strong> Sólo Tránsito publica lo que suma</strong>: en los demás, el módulo cuenta cuántos hay y no suma lo
                  que valen, y ponerle una cifra aquí sería inventarla (#549).
                  <span style={{ display: 'block', marginTop: 4, color: 'var(--ink-4)' }}>
                    Faltan dos de los seis frentes del manual, y no por descuido: el de Autorizaciones necesita el plazo del
                    silencio positivo, que es un valor normativo sin publicar, y el de Fiscalización no tiene ninguna consulta de
                    módulo que reutilizar —ninguna pantalla lista actas—.
                    {parado.datos && ` Leído el ${instante(parado.datos.calculadoEn)}, hora de ${zonaDelLector()}.`}
                  </span>
                </p>
              </section>
            </div>
          )}

          {/* ══════════ PANEL DEL CONTRIBUYENTE ══════════ */}
          {!esMuni && (
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Aqui vivia la cuenta entera de una persona del artboard: su
                  nombre, cuatro obligaciones con sus importes, tres unidades con
                  su autovaluo —«S/ 132 196,75»—, tres pagos con su numero de
                  recibo, y botones de «Pagar en linea» y «Fraccionar la deuda».
                  Tenia encima un aviso que decia «las cifras de abajo son del
                  prototipo, no de nadie», y **ese es exactamente el arreglo que
                  este repositorio rechaza en todas partes**: una cifra que el
                  backend no publica sale con el guion largo y su motivo, nunca
                  con la de la maqueta. Un aviso encima no la desmiente; #702
                  midio lo contrario —lo que rodea a un dato hace que el dato
                  parezca cierto—.

                  Y no lo veia ningun arnes: el conmutador que trae aqui lleva
                  `aria-pressed` y vive FUERA de `<main>`, y `sin-red` solo
                  visitaba los pasos de un asistente y `role="tab"` —que en este
                  producto sale 0—. Con la red cortada, esta cara ensenaba doce
                  importes y dos codigos catastrales y el arnes informaba
                  «ninguna ensena una cifra». Ahora los visita (#735, #702).

                  Lo que hace falta para llenarla NO es conectar una lectura:
                  `GET /portal/deuda` es la UNICA operacion del contrato que
                  ningun controlador sirve **y ninguno va a servir** (ADR-0016
                  §3), y `GET /portal/situacion` —que si existe— contesta 401
                  con el token del funcionario, medido: es del realm del
                  ciudadano (`sgtm-ciudadano`, ADR-0020), otro emisor y otra
                  sesion. */}
              <Aviso tono="warn" titulo="Esta cara no tiene de dónde leer, y no es que falte conectarla">
                El contribuyente <strong style={{ fontWeight: 600 }}>no entra por aquí</strong>: tiene realm propio
                —<code>sgtm-ciudadano</code>, otro emisor y su propia sesión— y su situación sale de{' '}
                <code>GET /portal/situacion</code> sin teclear ningún documento (ADR-0020). Esa lectura contesta{' '}
                <strong style={{ fontWeight: 600 }}>401 con la sesión de un funcionario</strong>, así que desde el back-office no
                se puede pedir.
                <br />
                <br />
                Y la operación que sí sería de esta pantalla, <code>GET /portal/deuda</code>, es la{' '}
                <strong style={{ fontWeight: 600 }}>única de las 225 del contrato que ningún controlador sirve — y ninguno va a
                servirla</strong> (ADR-0016 §3). Hasta que eso se decida, aquí no hay cifra que enseñar, así que no se enseña
                ninguna: las que había eran de la maqueta.
              </Aviso>

              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Lo que enseñaría esta cara</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{SIN_DATO}</span>
                </div>
                {/* La FORMA se queda —es la opcion `portal` del catalogo, y las
                    134 siguen siendo 134—; lo que se va es el dato. Cada linea
                    dice de donde saldria, que es lo que separa «todavia no» de
                    «nunca». */}
                {[
                  ['Su deuda por concepto', 'Insoluto, interés y gastos de cada obligación, con su fecha de vencimiento.'],
                  ['Sus predios y vehículos', 'Con el porcentaje de propiedad, que es lo que pondera la base imponible.'],
                  ['Sus pagos', 'Con el número de recibo de cada uno, para poder descargarlo.'],
                  ['El beneficio vigente', 'Cuánto del interés condona la ordenanza del ejercicio (D-02b).'],
                ].map(([que, detalle]) => (
                  <div key={que} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{que}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{detalle}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-4)', flex: '0 0 auto' }}>{SIN_DATO}</span>
                  </div>
                ))}
                <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  Ninguna de las cuatro se compone aquí aunque hubiera de dónde: sumar importes en la pantalla daría una cifra que no
                  es la que acabaría impresa (RNF-083).
                </p>
              </section>

              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-4)', textAlign: 'center', textWrap: 'pretty' }}>
                Quien atiende ve la misma deuda, y con cifras de verdad, en «Consulta de deuda» y en la ficha del contribuyente.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
