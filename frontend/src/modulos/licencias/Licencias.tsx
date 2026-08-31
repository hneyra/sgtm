import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Shell, type EntradaDePaleta } from '../../shell/Shell';
import type { PantallaProps } from '../../App';
import { Icono } from '../../ds/Icono';
import { ICO } from '../../ds/iconos';
import { usarPreferencias } from '../../shell/preferencias';
import {
  AVANCE_DE_TRAMITES,
  BANDEJA,
  CERTIFICADOS,
  CIIU,
  COLS_CERT,
  COLS_CIIU,
  COLS_LISTA,
  CRITERIOS,
  ESTADOS_DE_LISTA,
  FILTROS_CERT,
  FILTROS_CIIU,
  HOJAS,
  OPCIONES,
  SOLICITUDES,
  TIPOS_DE_LISTA,
  TRAMITES,
  type CampoDef,
  type ColDef,
  type Solicitud,
  type TipoDeTramite,
} from '../../datos/licencias';

/* ══════════ Los estilos del artboard, tal cual ══════════ */
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
const RTH: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 9.5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.09em',
  color: 'var(--ink-3)',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--ink)',
};
const RTHN: CSSProperties = { ...RTH, textAlign: 'right' };
const RTD: CSSProperties = { padding: '8px 10px', fontSize: 12, color: 'var(--ink-2)' };
const RTDN: CSSProperties = {
  padding: '8px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  color: 'var(--ink)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

type Tono = 'ok' | 'warn' | 'bad';

const INS: Record<Tono, CSSProperties> = {
  ok: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--ok-bg)', color: 'var(--ok-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  warn: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--warn-bg)', color: 'var(--warn-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
  bad: { fontSize: 11, fontWeight: 500, borderRadius: 999, padding: '3px 9px', background: 'var(--bad-bg)', color: 'var(--bad-fg)', whiteSpace: 'nowrap', flex: '0 0 auto' },
};

/** El tono del módulo: aquí «medio» y «alto» son niveles de riesgo del giro,
 *  no estados, y por eso no vale el `tonoDe` común. */
function tono(texto: string): Tono {
  const t = String(texto).toLowerCase();
  if (/vencida|denegada|falta|anulada|no compatible|alto/.test(t)) return 'bad';
  if (/observada|pendiente|en evaluación|medio|dictado/.test(t)) return 'warn';
  return 'ok';
}

function Cabecera({ cols }: { cols: ColDef[] }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c[0]} style={c[1] ? THN : TH}>
            {c[0]}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Celda({ texto, j, cols, insignia }: { texto: string; j: number; cols: ColDef[]; insignia: boolean }) {
  if (insignia)
    return (
      <td style={{ padding: '11px 14px' }}>
        <span style={INS[tono(texto)]}>{texto}</span>
      </td>
    );
  return <td style={j === 0 ? TD1 : cols[j] && cols[j][1] ? TDN : TD}>{texto}</td>;
}

/* La lupa del artboard es la misma que el shell usa en la cabecera. El icono de
   aviso de la guía, en cambio, no está en `ICO`: es un círculo con la barra de
   información dentro, y va literal. */
function IconoGuia({ color }: { color: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      style={{ color, flex: '0 0 auto', marginTop: 1 }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.4v.02M12 11.4v4.2" />
    </svg>
  );
}

export default function Licencias({ dest, onDest }: PantallaProps) {
  const { pref, toast } = usarPreferencias();

  const [vals, setVals] = useState<Record<string, string | boolean>>({});
  const [solicitud, setSolicitud] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<string>('Todos');
  const [chip, setChip] = useState('Todos');
  const [tab, setTab] = useState(0);
  const [req, setReq] = useState<Record<string, Record<number, boolean>>>({});
  const [catTab, setCatTab] = useState(0);
  const [catQ, setCatQ] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todas');
  const [hojaIdx, setHojaIdx] = useState(0);

  const set = (k: string, v: string | boolean) => setVals((s) => ({ ...s, [k]: v }));
  const val = (k: string, d: string | boolean | undefined) => {
    const v = vals[k];
    return v === undefined ? d : v;
  };

  /* «Nueva solicitud» es la acción primaria del panel: abre el expediente sin
     solicitud, que es lo que el artboard hace con `nuevaSolicitud`. */
  useEffect(() => {
    if (dest === 'alta') {
      setSolicitud(null);
      setTab(0);
      toast('Solicitud nueva: el tipo de trámite decide los requisitos y el plazo.');
    }
    if (dest !== 'lista') setSolicitud(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest]);

  /* El plazo se deriva del par (días, estado) y los requisitos de lo que el
     usuario ha marcado. Observar **suspende** el cómputo, y una solicitud ya
     resuelta no invoca el silencio positivo: calcularlo solo con los días
     hacía que la misma pantalla dijera que el reloj corre y que está parado. */
  const conDatos = useMemo(
    () =>
      SOLICITUDES.map((x: Solicitud) => {
        const t = TRAMITES[x.tipo];
        const total = t.requisitos.length;
        const marcados = req[x.exp];
        const cumplidos = marcados ? t.requisitos.filter((_r, i) => marcados[i] === true).length : x.cumplidos;
        const restantes = t.plazoDias - x.dias;
        const suspendido = x.estado === 'Observada';
        const resuelto = x.estado === 'Otorgada' || x.estado === 'Denegada';
        const vencido = !suspendido && !resuelto && restantes <= 0;
        const abs = Math.abs(restantes);
        return {
          ...x,
          tramite: t,
          total,
          cumplidos,
          faltan: total - cumplidos,
          restantes,
          vencido,
          suspendido,
          resuelto,
          plazoTexto: suspendido
            ? 'Cómputo suspendido'
            : resuelto
              ? x.resuelta
                ? 'Resuelta el ' + x.resuelta
                : 'Resuelta'
              : vencido
                ? 'Plazo agotado hace ' + abs + (abs === 1 ? ' día' : ' días')
                : 'Quedan ' + restantes + (restantes === 1 ? ' día' : ' días'),
          completa: cumplidos >= total,
        };
      }),
    [req],
  );

  const sol = conDatos.find((x) => x.exp === solicitud) ?? conDatos[0];
  const tram = sol.tramite;

  /* Los requisitos marcados viven por expediente: un expediente completo no
     puede abrir la puerta de otro. */
  const reqEx: Record<number, boolean> =
    req[sol.exp] ??
    (() => {
      const base: Record<number, boolean> = {};
      const literal = (SOLICITUDES.find((x) => x.exp === sol.exp) ?? { cumplidos: 0 }).cumplidos;
      tram.requisitos.forEach((_r, i) => {
        base[i] = i < literal;
      });
      return base;
    })();

  const cumplidos = sol.cumplidos;
  const faltan = sol.faltan;
  const completa = sol.completa;
  const faltanDelAdministrado = tram.requisitos.filter((r, i) => reqEx[i] !== true && r[2] === 'Administrado').length;

  const tabIdx = Math.min(tab, tram.tabs.length - 1);
  const tabDef = tram.tabs[tabIdx];

  const ACTOS: string[][] = [
    ['1', 'Presentación del expediente', sol.presentada, 'Expediente ' + sol.exp, 'Admitido'],
    ['2', 'Pago del derecho de trámite', sol.presentada, 'Recibo 0003-0041183', 'Aplicado'],
    ['3', 'Verificación de requisitos', '05/08/2026', 'Informe de admisibilidad', completa ? 'Conforme' : 'Observada'],
  ];

  const esExpediente = dest === 'alta' || (dest === 'lista' && solicitud !== null);

  const filtrados = conDatos.filter(
    (x) => (tipo === 'Todos' || x.tipo === tipo) && (chip === 'Todos' || x.estado === chip),
  );

  /* Las cifras del panel se derivan de la bandeja: 376 es su suma y 164 —la
     pastilla del destino— es lo que pide acción, las tres primeras filas. */
  const totalDelEjercicio = BANDEJA.reduce((a, b) => a + b[4], 0);
  const autorizacionesDelEjercicio = (Object.keys(AVANCE_DE_TRAMITES) as TipoDeTramite[]).reduce(
    (a, k) => a + AVANCE_DE_TRAMITES[k][0],
    0,
  );

  const hoja = HOJAS[Math.min(hojaIdx, HOJAS.length - 1)];

  const esCiiu = catTab === 0;
  const catQl = catQ.toLowerCase();
  const filtrosCat = esCiiu ? FILTROS_CIIU : FILTROS_CERT;
  const catFilas = esCiiu
    ? CIIU.filter(
        (c) =>
          (catQl === '' || c[0].toLowerCase().indexOf(catQl) >= 0 || c[2].toLowerCase().indexOf(catQl) >= 0) &&
          (catFiltro === 'Todas' || c[1] === catFiltro),
      )
    : CERTIFICADOS.filter(
        (c) =>
          (catQl === '' || c[0].toLowerCase().indexOf(catQl) >= 0 || c[3].toLowerCase().indexOf(catQl) >= 0) &&
          (catFiltro === 'Todas' || c[1] === catFiltro),
      );
  const colsCat = esCiiu ? COLS_CIIU : COLS_CERT;

  const paleta: EntradaDePaleta[] = OPCIONES.map((o) => ({
    label: o[0],
    nota: 'Autorizaciones',
    ir: () => onDest(o[1]),
  }));

  const rotuloDelDestino =
    dest === 'panel'
      ? 'Panel del módulo'
      : dest === 'lista'
        ? 'Solicitudes'
        : dest === 'catalogos'
          ? 'Catálogos'
          : dest === 'reportes'
            ? 'Centro de reportes'
            : 'Autorizaciones y licencias';

  const guia = sol.resuelto
    ? {
        texto:
          'Esta solicitud está ' +
          sol.estado.toLowerCase() +
          (sol.resuelta ? ' desde el ' + sol.resuelta : '') +
          '. El expediente se consulta; para cambiar lo resuelto hace falta un recurso del administrado o una nulidad de oficio.',
        color: 'var(--ink-2)',
        fondo: 'var(--bg-elev)',
      }
    : sol.suspendido
      ? {
          texto:
            'El expediente está observado: el cómputo del plazo está suspendido y se reanuda cuando el administrado subsane. Faltan ' +
            faltan +
            (faltan === 1 ? ' requisito' : ' requisitos') +
            (faltanDelAdministrado > 0 ? ', ' + faltanDelAdministrado + ' de su parte' : '') +
            '.',
          color: 'var(--warn-fg)',
          fondo: 'var(--warn-bg)',
        }
      : sol.vencido
        ? {
            texto:
              'El plazo del TUPA se agotó hace ' +
              Math.abs(sol.restantes) +
              ' días. En ' +
              tram.modalidad.toLowerCase() +
              ', la autorización se entiende otorgada por silencio positivo: lo que queda es registrarlo, no denegarlo.',
            color: 'var(--bad-fg)',
            fondo: 'var(--bad-bg)',
          }
        : completa
          ? {
              texto: 'Requisitos completos y quedan ' + sol.restantes + ' días de plazo. Se puede resolver.',
              color: 'var(--ok-fg)',
              fondo: 'var(--ok-bg)',
            }
          : {
              texto:
                'Faltan ' +
                faltan +
                (faltan === 1 ? ' requisito' : ' requisitos') +
                (faltanDelAdministrado > 0 ? ', ' + faltanDelAdministrado + ' del administrado' : '') +
                '. El plazo corre igual: hay que observar el expediente para suspenderlo.',
              color: 'var(--warn-fg)',
              fondo: 'var(--warn-bg)',
            };

  const reqNota = sol.resuelto
    ? 'La solicitud ya está resuelta: los requisitos quedan como constancia de lo que se evaluó y no admiten cambios.'
    : completa
      ? 'Con los requisitos completos la autorización se puede emitir. Lo que falte después es evaluación, no admisibilidad.'
      : sol.suspendido
        ? 'El expediente ya está observado: el cómputo del plazo está suspendido y se reanuda cuando el administrado subsane.'
        : 'Un expediente incompleto se admite y el plazo corre igual. Para detener el reloj hay que observarlo formalmente y notificar al administrado.';

  /* Cada situación deja habilitada la acción que de verdad corresponde. El
     cálculo anterior podía dejar el expediente sin ninguna salida. */
  const accionesAviso = sol.resuelto
    ? 'La solicitud ya está resuelta: desde aquí solo se imprime la resolución o se registra un recurso.'
    : sol.suspendido
      ? 'El cómputo está suspendido. Cuando el administrado subsane, se reanuda el plazo y se puede resolver.'
      : sol.vencido
        ? 'El silencio positivo ya operó: lo que queda es registrar el otorgamiento y emitir la resolución que lo documenta.'
        : completa
          ? 'Con requisitos completos se puede otorgar o denegar con resolución motivada.'
          : 'Observar suspende el plazo y se lo devuelve al administrado. Es lo que toca cuando faltan requisitos.';

  const accionesLista: { label: string; primaria: boolean; apagado: boolean; motivo: string }[] = sol.resuelto
    ? [
        { label: 'Imprimir resolución', primaria: false, apagado: false, motivo: '' },
        { label: 'Registrar recurso', primaria: false, apagado: false, motivo: '' },
        { label: 'Ver el padrón', primaria: true, apagado: false, motivo: '' },
      ]
    : sol.vencido
      ? [
          { label: 'Imprimir constancia de silencio', primaria: false, apagado: false, motivo: '' },
          { label: 'Denegar', primaria: false, apagado: true, motivo: 'El silencio positivo ya operó: la autorización se entiende otorgada' },
          { label: 'Registrar el otorgamiento por silencio', primaria: true, apagado: false, motivo: '' },
        ]
      : sol.suspendido
        ? [
            { label: 'Reiterar la observación', primaria: false, apagado: false, motivo: '' },
            { label: 'Declarar en abandono', primaria: false, apagado: false, motivo: '' },
            { label: 'Reanudar el cómputo', primaria: true, apagado: !completa, motivo: !completa ? 'Se reanuda cuando el administrado subsane lo observado' : '' },
          ]
        : [
            { label: 'Observar', primaria: false, apagado: completa, motivo: completa ? 'No hay requisitos que observar' : '' },
            { label: 'Denegar', primaria: false, apagado: false, motivo: '' },
            {
              label: sol.tipo === 'anuncio' ? 'Otorgar la autorización' : 'Otorgar la licencia',
              primaria: true,
              apagado: !completa,
              motivo: !completa ? 'Faltan requisitos del TUPA' : '',
            },
          ];

  /* ── El campo de un bloque, en cualquiera de sus seis formas ── */
  const dibujarCampo = (f: CampoDef): ReactNode => {
    const valor = val(f.k, f.v);
    const texto = valor === undefined ? '' : String(valor);
    const marcado = valor === true;
    const t = f.t ?? 'text';
    return (
      <label key={f.k} data-ancho={f.ancho ? '1' : '0'} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>
          <span>{f.l}</span>
          {f.c && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '1px 4px' }}>
              {f.c}
            </span>
          )}
        </span>
        {t === 'text' && <input value={texto} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph ?? ''} style={IN} />}
        {t === 'date' && <input type="date" value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN} />}
        {t === 'sel' && (
          <select value={texto} onChange={(e) => set(f.k, e.target.value)} style={IN}>
            {(f.o ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {t === 'area' && (
          <textarea
            value={texto}
            onChange={(e) => set(f.k, e.target.value)}
            rows={3}
            placeholder={f.ph ?? ''}
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
        {t === 'chk' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--bg-elev)' }}>
            <input
              type="checkbox"
              checked={marcado}
              onChange={(e) => set(f.k, e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15, flex: '0 0 auto' }}
            />
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{f.ph}</span>
          </span>
        )}
        {t === 'ro' && (
          <span
            style={{
              display: 'block',
              minHeight: 38,
              lineHeight: '19px',
              padding: '9px 10px',
              border: '1px dashed var(--line-2)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--ink-2)',
            }}
          >
            {texto}
          </span>
        )}
        {f.ayuda && <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-4)', textWrap: 'pretty' }}>{f.ayuda}</span>}
      </label>
    );
  };

  return (
    <Shell
      modulo="licencias"
      dest={dest}
      onDest={onDest}
      miga={esExpediente ? ['Autorizaciones', 'Solicitudes', sol.exp] : ['Autorizaciones', rotuloDelDestino]}
      titulo={esExpediente ? `${tram.label} — ${sol.exp}` : rotuloDelDestino}
      contexto={
        esExpediente
          ? {
              volver: {
                label: 'Solicitudes',
                onClick: () => {
                  setSolicitud(null);
                  if (dest !== 'lista') onDest('lista');
                },
              },
              codigo: sol.exp,
              titular: sol.titular,
              ubic: `${sol.doc} · ${tram.label}`,
              /* Las dos pastillas del artboard: el estado de la solicitud y lo
                 que le queda de plazo. Son dos cosas distintas —una resuelta
                 puede haberse resuelto tarde— y por eso van separadas. */
              derecha: (
                <>
                  <span style={INS[tono(sol.estado)]}>{sol.estado}</span>
                  <span style={INS[sol.vencido ? 'bad' : sol.resuelto ? 'ok' : 'warn']}>{sol.plazoTexto}</span>
                </>
              ),
            }
          : undefined
      }
      /* Lo que el módulo no puede dejar de decir: si nadie resuelve, el plazo
         del TUPA otorga solo. Por eso el artboard lo pone en el panel y no en
         una pantalla a la que haya que entrar. */
      tarjeta={
        <div
          style={{
            border: '1px solid var(--bad-fg)',
            borderRadius: 8,
            padding: '11px 12px',
            background: 'var(--bad-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              style={{ color: 'var(--bad-fg)', flex: '0 0 auto' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--bad-fg)',
              }}
            >
              Aprobación automática
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--bad-fg)' }}>
            {BANDEJA[0][4]} solicitudes
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.45, color: 'var(--bad-fg)', textWrap: 'pretty' }}>
            Con el plazo del TUPA agotado: si nadie resuelve, quedan otorgadas por silencio positivo.
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
              Once opciones de menú para tres trámites que hacen lo mismo: recibir una solicitud, comprobar requisitos del TUPA, resolver en
              plazo y emitir una autorización con vigencia. Lo que cambia entre licencia, edificación y anuncio son los requisitos, no el
              procedimiento.
            </p>

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Solicitudes por lo que les falta</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{totalDelEjercicio} solicitudes del ejercicio</span>
              </div>
              {BANDEJA.map((b) => (
                <button
                  key={b[0]}
                  onClick={() => {
                    setChip(b[0] === 'Plazo agotado' ? 'Vencida sin resolver' : b[0] === 'Requisitos incompletos' ? 'Observada' : 'Todos');
                    onDest('lista');
                  }}
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
                  <span style={INS[b[1]]}>{b[0]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{b[2]}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{b[3]}</span>
                  </span>
                  <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>{b[4]}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>{b[5]}</span>
                  </span>
                  <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                Una solicitud de aprobación automática que pasa su plazo queda otorgada por silencio positivo, con o sin evaluación. Es la
                única fila del módulo que no admite espera.
              </p>
            </section>

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
                  Los tres trámites, en el ejercicio {pref.ejercicio}
                </h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {Object.keys(TRAMITES).length} trámites
                </span>
              </div>
              {(Object.keys(TRAMITES) as TipoDeTramite[]).map((k) => {
                const t = TRAMITES[k];
                const datos = AVANCE_DE_TRAMITES[k];
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setTipo(k);
                      onDest('lista');
                    }}
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
                    <span style={{ flex: '0 0 176px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{t.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                        {t.plazoDias} días hábiles · {t.modalidad.toLowerCase()}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 50, height: 10, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden', position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          inset: '0 auto 0 0',
                          width: `${datos[1].toFixed(1)}%`,
                          borderRadius: 999,
                          background: datos[1] < 80 ? 'var(--warn-fg)' : 'var(--accent)',
                        }}
                      />
                    </span>
                    <span style={{ flex: '0 0 56px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {datos[1].toFixed(1)} %
                    </span>
                    <span style={{ flex: '0 0 88px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13.5, color: 'var(--ink)' }}>
                      {datos[0].toLocaleString('es-PE')}
                    </span>
                    <Icono d={ICO.flechaDer} tam={14} grosor={1.8} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                );
              })}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                La barra es lo resuelto dentro del plazo del TUPA. Lo que queda fuera no se pierde: se otorga por silencio o se deniega tarde,
                y las dos cosas se reclaman.
              </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))', gap: 13 }}>
              {[
                { valor: autorizacionesDelEjercicio.toLocaleString('es-PE'), etiqueta: 'Autorizaciones del ejercicio', nota: 'Funcionamiento, edificación y anuncios juntos.' },
                { valor: String(BANDEJA[0][4]), etiqueta: 'Con el plazo agotado', nota: 'Cada una es una autorización otorgada sin evaluar.' },
                { valor: String(BANDEJA[1][4]), etiqueta: 'Con requisitos incompletos', nota: 'Admitidas incompletas: el plazo corre igual.' },
                { valor: '11.2 días', etiqueta: 'Plazo medio de resolución', nota: 'Contra los 15 hábiles de la licencia de funcionamiento.' },
              ].map((k) => (
                <div key={k.etiqueta} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', padding: '16px 17px' }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500, letterSpacing: '-.01em', color: 'var(--accent-ink)' }}>{k.valor}</p>
                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{k.etiqueta}</p>
                  <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--ink-4)', textWrap: 'pretty' }}>{k.nota}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ LISTA DE SOLICITUDES ══════════ */}
        {dest === 'lista' && !esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Los tres trámites en una lista. El tipo cambia los requisitos y el plazo; la columna que decide el trabajo del día es lo que le
              falta a cada solicitud.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIPOS_DE_LISTA.map((t) => {
                const on = tipo === t;
                const label = t === 'Todos' ? 'Todos los trámites' : TRAMITES[t].label;
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
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
                      color: on ? '#fff' : 'var(--ink-2)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
                <Icono d={ICO.lupa} tam={18} style={{ color: 'var(--ink-3)', flex: '0 0 auto' }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Expediente, nombre comercial, titular o RUC"
                  style={{ flex: 1, border: 0, background: 'transparent', fontSize: 15, padding: '3px 0', outline: 'none' }}
                />
                <button
                  onClick={() => toast(`${filtrados.length} solicitudes coinciden.`)}
                  className="hov-acento-2"
                  style={{ border: 0, borderRadius: 6, padding: '9px 20px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', flex: '0 0 auto' }}
                >
                  Buscar
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Estado</span>
                {ESTADOS_DE_LISTA.map((c) => {
                  const on = chip === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setChip(c)}
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
              </div>
            </section>

            {filtrados.length === 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '44px 24px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-card)' }}>
                <Icono d={ICO.lupa} tam={26} grosor={1.5} style={{ color: 'var(--ink-4)' }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Ninguna solicitud con esos criterios</p>
                <p style={{ margin: 0, maxWidth: '52ch', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', textAlign: 'center', textWrap: 'pretty' }}>
                  Prueba con otro tipo de trámite o quita el filtro de estado.
                </p>
                <button
                  onClick={() => {
                    setChip('Todos');
                    setTipo('Todos');
                  }}
                  className="hov-linea"
                  style={{ marginTop: 6, border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 16px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}
                >
                  Quitar los filtros
                </button>
              </section>
            )}

            {filtrados.length > 0 && (
              <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Solicitudes</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {filtrados.length} de {totalDelEjercicio}
                  </span>
                  <button
                    className="hov-linea"
                    style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}
                  >
                    Excel
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                    <Cabecera cols={COLS_LISTA} />
                    <tbody>
                      {filtrados.map((x) => (
                        <tr
                          key={x.exp}
                          onClick={() => {
                            setSolicitud(x.exp);
                            setTab(0);
                          }}
                          className="hov-acento"
                          style={{ borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          {[
                            x.exp,
                            x.tramite.label,
                            x.titular,
                            x.negocio,
                            x.presentada,
                            `${x.cumplidos} de ${x.total}`,
                            x.plazoTexto,
                            x.estado,
                          ].map((c, j) => (
                            <Celda key={j} texto={c} j={j} cols={COLS_LISTA} insignia={j === 7} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                  «Plazo» cuenta días hábiles desde la presentación. En aprobación automática, agotado el plazo la autorización se entiende
                  otorgada.
                </p>
              </section>
            )}
          </div>
        )}

        {/* ══════════ EL EXPEDIENTE ══════════ */}
        {esExpediente && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, background: 'var(--bg-card)' }}>
                {[
                  { etiqueta: 'Expediente', valor: sol.exp, color: 'var(--ink)', nota: '' },
                  { etiqueta: 'Trámite', valor: tram.label, color: 'var(--ink)', nota: tram.modalidad },
                  { etiqueta: 'Presentada', valor: sol.presentada, color: 'var(--ink)', nota: `hace ${sol.dias} días hábiles` },
                  { etiqueta: 'Plazo del TUPA', valor: `${tram.plazoDias} días`, color: sol.vencido ? 'var(--bad-fg)' : 'var(--ink)', nota: sol.plazoTexto },
                  {
                    etiqueta: 'Requisitos',
                    valor: `${cumplidos} de ${tram.requisitos.length}`,
                    color: completa ? 'var(--ok-fg)' : 'var(--bad-fg)',
                    nota: completa ? 'completos' : `${faltan} sin cumplir`,
                  },
                  { etiqueta: 'Objeto', valor: sol.negocio, color: 'var(--ink)', nota: '' },
                ].map((r) => (
                  <div key={r.etiqueta} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', margin: '-1px 0 0 -1px' }}>
                    <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.11em', color: 'var(--ink-3)' }}>{r.etiqueta}</p>
                    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 15, color: r.color, textWrap: 'pretty' }}>{r.valor}</p>
                    {r.nota && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-4)' }}>{r.nota}</p>}
                  </div>
                ))}
              </div>
            </section>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '13px 16px',
                border: '1px solid var(--line-2)',
                borderLeft: `3px solid ${guia.color}`,
                borderRadius: 8,
                background: guia.fondo,
              }}
            >
              <IconoGuia color={guia.color} />
              <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: guia.color, textWrap: 'pretty' }}>{guia.texto}</p>
            </div>

            {/* la compuerta: los requisitos del TUPA */}
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 190 }}>
                  <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>Requisitos del TUPA</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                    {cumplidos} de {tram.requisitos.length} cumplidos · {faltanDelAdministrado} pendientes del administrado
                  </p>
                </div>
                <span style={completa ? INS.ok : INS.bad}>{completa ? 'Completos' : `${faltan} sin cumplir`}</span>
              </div>
              {tram.requisitos.map((r, i) => (
                <label
                  key={r[0]}
                  className="hov-elev"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={reqEx[i] === true}
                    onChange={(e) => {
                      const marcado = e.target.checked;
                      setReq((x) => ({ ...x, [sol.exp]: { ...reqEx, [i]: marcado } }));
                    }}
                    style={{ accentColor: 'var(--accent)', width: 17, height: 17, flex: '0 0 auto', marginTop: 2 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{r[0]}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2, textWrap: 'pretty' }}>{r[1]}</span>
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      borderRadius: 999,
                      padding: '3px 9px',
                      whiteSpace: 'nowrap',
                      flex: '0 0 auto',
                      background: r[2] === 'Administrado' ? 'var(--bg-elev)' : 'var(--accent-soft)',
                      color: r[2] === 'Administrado' ? 'var(--ink-3)' : 'var(--accent-ink)',
                    }}
                  >
                    {r[2]}
                  </span>
                </label>
              ))}
              <p style={{ margin: 0, padding: '11px 16px', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>{reqNota}</p>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {tram.tabs.map((t, i) => {
                const on = tabIdx === i;
                return (
                  <button
                    key={t.label}
                    onClick={() => setTab(i)}
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

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{tabDef.titulo}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-3)', maxWidth: '76ch', textWrap: 'pretty' }}>{tabDef.nota}</p>
              </div>
              {tabDef.bloques.map((bl, i) => (
                <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  {bl.titulo && (
                    <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-3)' }}>
                      {bl.titulo}
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(192px,1fr))', gap: '15px 16px', padding: '15px 16px 17px' }}>
                    {bl.campos.map(dibujarCampo)}
                  </div>
                </div>
              ))}
              {tabDef.tabla &&
                (() => {
                  const t = tabDef.tabla;
                  const filas = t.filas === 'actos' ? ACTOS : t.filas;
                  const conteo = t.conteo !== '' ? t.conteo : `${filas.length} ${filas.length === 1 ? 'acto' : 'actos'}`;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                        <p style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{t.titulo}</p>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{conteo}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: t.min }}>
                          <Cabecera cols={t.cols} />
                          <tbody>
                            {filas.map((f, i) => (
                              <tr key={i} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                                {f.map((c, j) => (
                                  <Celda key={j} texto={c} j={j} cols={t.cols} insignia={t.insignia !== undefined && j === t.insignia} />
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {t.totales && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--line)' }}>
                          {t.totales.map((tt) => (
                            <div
                              key={tt[0]}
                              style={{
                                background: tt[2] ? 'var(--accent-soft)' : 'var(--bg-card)',
                                padding: '14px 16px',
                                borderLeft: '1px solid var(--line)',
                                borderTop: '1px solid var(--line)',
                                margin: '-1px 0 0 -1px',
                              }}
                            >
                              <p style={{ margin: '0 0 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{tt[0]}</p>
                              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--ink)' }}>{tt[1]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                        {t.nota}
                      </p>
                    </>
                  );
                })()}
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 180, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>{accionesAviso}</p>
              {accionesLista.map((a) => (
                <button
                  key={a.label}
                  onClick={() => toast(a.apagado ? a.motivo || 'No disponible.' : `${a.label}: registrado en el expediente ${sol.exp}.`)}
                  aria-disabled={a.apagado}
                  title={a.motivo}
                  style={
                    a.primaria
                      ? { border: 0, borderRadius: 6, padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', opacity: a.apagado ? 0.55 : 1 }
                      : { border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 18px', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer', opacity: a.apagado ? 0.55 : 1 }
                  }
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ CATÁLOGOS ══════════ */}
        {dest === 'catalogos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Lo que las solicitudes consultan: el giro comercial que se autoriza y los certificados que la municipalidad emite sobre un
              predio.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              {['Catálogo CIIU', 'Certificados'].map((l, i) => {
                const on = catTab === i;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setCatTab(i);
                      setCatQ('');
                      setCatFiltro('Todas');
                    }}
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
            </div>

            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <input
                  value={catQ}
                  onChange={(e) => setCatQ(e.target.value)}
                  placeholder={esCiiu ? 'Código CIIU o actividad' : 'Nº de certificado o dirección'}
                  style={{ flex: 1, minWidth: 180, border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                />
                {filtrosCat.map((g) => {
                  const on = catFiltro === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setCatFiltro(g)}
                      aria-pressed={on}
                      style={{
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
                        borderRadius: 999,
                        padding: '6px 13px',
                        cursor: 'pointer',
                        fontSize: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-3)',
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: esCiiu ? 700 : 820 }}>
                  <Cabecera cols={colsCat} />
                  <tbody>
                    {catFilas.map((f) => (
                      <tr key={f[0]} className="hov-elev" style={{ borderTop: '1px solid var(--line)' }}>
                        {f.map((c, j) => (
                          <Celda key={j} texto={c} j={j} cols={colsCat} insignia={esCiiu ? j === 3 : j === 5} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: 0, padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                {esCiiu
                  ? 'El riesgo del giro decide la modalidad de la licencia: bajo y medio van por aprobación automática con declaración jurada; alto y muy alto exigen inspección previa.'
                  : 'Los certificados los emite la municipalidad sobre un predio de Catastro. El de parámetros es requisito de la licencia de edificación.'}
              </p>
            </section>
          </div>
        )}

        {/* ══════════ CENTRO DE REPORTES ══════════ */}
        {dest === 'reportes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p data-noprint="1" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: '70ch' }}>
              Cuatro entradas de menú eran cuatro reportes con el mismo formulario de agrupación. Aquí son un carril, y cada uno pide solo los
              criterios que usa.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
              <section data-noprint="1" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--ink-3)' }}>
                  Reportes del módulo
                </p>
                {HOJAS.map((h, i) => {
                  const on = hojaIdx === i;
                  const primero = i === 0 || HOJAS[i - 1].g !== h.g;
                  return (
                    <button
                      key={h.label}
                      onClick={() => setHojaIdx(i)}
                      aria-current={on ? 'true' : undefined}
                      className="hov-acento"
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0 9px',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        borderBottom: '1px solid var(--line)',
                        padding: primero ? '12px 14px 11px' : '11px 14px',
                        cursor: 'pointer',
                        background: on ? 'var(--accent-soft)' : 'transparent',
                        color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {primero && (
                        <span style={{ display: 'block', width: '100%', fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.13em', color: 'var(--ink-4)', marginBottom: 5 }}>
                          {h.g}
                        </span>
                      )}
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, textWrap: 'pretty' }}>{h.label}</span>
                    </button>
                  );
                })}
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <section data-noprint="1" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-1)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                    <h2 style={{ margin: 0, flex: 1, fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>{hoja.label}</h2>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                      {hoja.crit.length} de {Object.keys(CRITERIOS).length} criterios
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px 16px', padding: '15px 16px', alignItems: 'end' }}>
                    {hoja.crit.map((k) => {
                      const c = CRITERIOS[k];
                      const valor = String(val('rep_' + k, c.v) ?? '');
                      return (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)' }}>{c.l}</span>
                          {c.t === 'sel' && (
                            <select
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            >
                              {(c.o ?? []).map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.t === 'date' && (
                            <input
                              type="date"
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            />
                          )}
                          {c.t === 'text' && (
                            <input
                              value={valor}
                              onChange={(e) => set('rep_' + k, e.target.value)}
                              placeholder=""
                              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '9px 10px', background: 'var(--bg-elev)', fontSize: 13.5 }}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
                    <p style={{ margin: 0, flex: 1, minWidth: 170, fontSize: 12, color: 'var(--ink-3)', textWrap: 'pretty' }}>
                      Los criterios que este reporte no usa no se dibujan.
                    </p>
                    <button className="hov-linea" style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 15px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}>
                      Excel
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="hov-linea"
                      style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 15px', background: 'var(--bg-card)', fontSize: 12.5, cursor: 'pointer' }}
                    >
                      Imprimir
                    </button>
                    <button
                      onClick={() => toast(`${hoja.label} generado con ${hoja.crit.length} criterios.`)}
                      className="hov-acento-2"
                      style={{ border: 0, borderRadius: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Generar
                    </button>
                  </div>
                </section>

                <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, boxShadow: 'var(--shadow-2)', padding: '32px 34px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, paddingBottom: 11, borderBottom: '2px solid var(--ink)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600 }}>{pref.entidad}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ink-3)' }}>Gerencia de Comercialización y Licencias</p>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                      <p style={{ margin: 0 }}>{hoja.codigo}</p>
                      <p style={{ margin: '3px 0 0' }}>13 de agosto de {pref.ejercicio}</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--ink)', marginTop: 2, paddingTop: 22, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, letterSpacing: '-.01em' }}>{hoja.label}</h2>
                    <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{hoja.sub}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px 18px', margin: '20px 0', padding: '14px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                    {hoja.meta.map((m) => (
                      <div key={m[0]}>
                        <p style={{ margin: '0 0 3px', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>{m[0]}</p>
                        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink)' }}>{m[1]}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {hoja.cols.map((c) => (
                            <th key={c[0]} style={c[1] ? RTHN : RTH}>
                              {c[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hoja.filas.map((f, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                            {f.map((c, j) => (
                              <td key={j} style={hoja.cols[j] && hoja.cols[j][1] ? RTDN : RTD}>
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: '18px 0 0', fontFamily: 'var(--font-serif)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>{hoja.cierre}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginTop: 44 }}>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Gerente de Comercialización</div>
                    <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 6, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center' }}>Solicitante</div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
