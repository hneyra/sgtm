import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DENSIDADES, PreferenciasCtx, type Preferencias } from './shell/preferencias';
import { MODULOS, moduloDe } from './shell/modulos';
import { PermisosCtx, type EstadoDePermisos } from './shell/permisos';
import { Icono } from './ds/Icono';
import { ICO } from './ds/iconos';
import { rotuloDeLaEntidad } from './api/sesion';
import { identidadDeLaSesion, municipalidadDeLaSesion, permisosDeLaSesion } from './api/seguridad';
import { useRecurso } from './api/useRecurso';

/* Cada módulo llega en su propio trozo: el arranque no paga los doce. */
const PANTALLAS: Record<string, React.LazyExoticComponent<React.ComponentType<PantallaProps>>> = {
  inicio: lazy(() => import('./modulos/inicio/Inicio')),
  catastro: lazy(() => import('./modulos/catastro/Catastro')),
  rentas: lazy(() => import('./modulos/rentas/Rentas')),
  fiscalizacion: lazy(() => import('./modulos/fiscalizacion/Fiscalizacion')),
  transito: lazy(() => import('./modulos/transito/Transito')),
  sanciones: lazy(() => import('./modulos/sanciones/Sanciones')),
  tesoreria: lazy(() => import('./modulos/tesoreria/Tesoreria')),
  consultas: lazy(() => import('./modulos/consultas/Consultas')),
  valores: lazy(() => import('./modulos/valores/Valores')),
  coactiva: lazy(() => import('./modulos/coactiva/Coactiva')),
  licencias: lazy(() => import('./modulos/licencias/Licencias')),
  seguridad: lazy(() => import('./modulos/seguridad/Seguridad')),
};

export type PantallaProps = {
  dest: string;
  onDest: (k: string) => void;
  /**
   * El sujeto que la pantalla tiene abierto: el tercer tramo de la ruta.
   *
   * `#/catastro/predios/2001…` es la ficha de ESE predio. Sin él, lo que se
   * abre al pulsar una fila vive sólo en el estado de React (#685): la URL no lo
   * dice, así que no se puede compartir —la otra pestaña enseña la lista—, se
   * pierde al recargar, y «Atrás» no vuelve a la lista sino un nivel más arriba,
   * porque nunca hubo una entrada de historial para la ficha.
   *
   * Va **en la ruta y no en un parámetro** porque es lo que se está mirando, no
   * cómo se está filtrando; y como tercer tramo y no como cuarto módulo porque
   * las 134 opciones no cambian: sigue siendo el destino `predios` de catastro.
   *
   * Llega decodificado. Vacío cuando la pantalla no tiene ninguno abierto.
   */
  sujeto: string;
  /** Abre un sujeto —o lo cierra con `''`— dejando entrada en el historial. */
  onSujeto: (s: string) => void;
  /**
   * Lo que la pantalla tiene tecleado en su búsqueda, leído de la consulta.
   *
   * `#/catastro/predios?q=COMERCIO`. Va aparte del sujeto porque es otra cosa:
   * el sujeto es **qué se está mirando** y esto es **cómo se llegó a la lista**.
   * Sin él, recargar con una ficha abierta la deja abierta y vacía el filtro, de
   * modo que al volver hay que teclear otra vez sobre 14 422 predios (#685).
   *
   * Es un mapa y no una cadena para que una pantalla con dos filtros no tenga
   * que inventarse un separador.
   */
  filtros: Record<string, string>;
  /** Reescribe la consulta **sin** dejar entrada en el historial. */
  onFiltros: (f: Record<string, string>) => void;
};

/** La ruta vive en el hash: `#/catastro/predios`. No hay servidor que la sirva
 *  y así una pantalla concreta se puede compartir por su URL. */
function leerRuta(): { modulo: string; dest: string; sujeto: string; filtros: Record<string, string> } {
  const bruto = window.location.hash.replace(/^#\/?/, '');
  const corte = bruto.indexOf('?');
  const h = corte < 0 ? bruto : bruto.slice(0, corte);
  const filtros: Record<string, string> = {};
  if (corte >= 0) for (const [k, v] of new URLSearchParams(bruto.slice(corte + 1))) filtros[k] = v;
  /* Sólo los DOS primeros separadores: un sujeto puede llevar barras —un número
     de expediente, una placa— y partirlo entero lo dejaría truncado. */
  const [modulo = 'inicio', dest = '', ...resto] = h.split('/');
  const m = MODULOS.find((x) => x.k === modulo) ? modulo : 'inicio';
  let sujeto = '';
  try {
    sujeto = decodeURIComponent(resto.join('/'));
  } catch {
    /* Un `%` suelto en la barra de direcciones no puede tumbar la aplicación:
       se queda sin sujeto, que es lo mismo que no haberlo puesto. */
    sujeto = '';
  }
  return { modulo: m, dest: dest || (moduloDe(m).destinos[0]?.k ?? 'panel'), sujeto, filtros };
}

export function App() {
  const [ruta, setRuta] = useState(leerRuta);
  /* El aviso lleva su tono: un visto sobre un mensaje de error dice que la
     operación salió bien encima del texto que dice que no (#547). */
  const [toast, setToast] = useState<{ texto: string; malo: boolean }>({ texto: '', malo: false });
  const avisar = useCallback(
    (texto: string, tono: 'bien' | 'mal' = 'bien') => setToast({ texto, malo: tono === 'mal' }),
    [],
  );
  const [pref, setPref] = useState<Preferencias>(() => ({
    entidad: rotuloDeLaEntidad(),
    acento: '#1F3A5F',
    densidad: 'Normal',
    tema: 'claro',
    ejercicio: '2026',
  }));

  /* El nombre de la municipalidad, del backend (#555).
     `rotuloDeLaEntidad()` sigue siendo el valor de partida y el de reserva: sale
     del claim del token, dice «Municipalidad n.º 1» y no puede mentir. Lo que se
     gana aqui es el nombre de verdad —«Municipalidad Provincial de Sullana»—,
     que es lo que se lee en la cabecera de los doce modulos y lo que sale
     impreso en el membrete de cinco hojas.

     Y conviene recordar de que se viene: la constante decia «Municipalidad
     Distrital de Catacaos» para TODAS, y la municipalidad 1 es Sullana. Estaba
     equivocada en las dos mitades, el tipo y el nombre. */
  const laMunicipalidad = useRecurso((senal) => municipalidadDeLaSesion(senal), []);
  useEffect(() => {
    const nombre = laMunicipalidad.datos?.nombre;
    if (nombre !== undefined && nombre !== '') setPref((p) => ({ ...p, entidad: nombre }));
  }, [laMunicipalidad.datos]);

  /**
   * El año con el que se abre, cuando la sesion tiene uno fijado (#557).
   *
   * <h2>Nulo NO quiere decir «el corriente»</h2>
   *
   * Quiere decir que nadie ha ejecutado `PUT /seguridad/sesion/ejercicio`, y el
   * contrato lo dice con todas las letras. Asi que con nulo el filtro de vista
   * se queda en su valor local de partida y **no se deriva ninguno del reloj**:
   * un año sacado de `new Date()` afirmaria que alguien lo eligio, que es la
   * misma clase de dato inventado que un cero en una celda de dinero.
   *
   * Y lo que se fija aqui es el **filtro de vista**, no el acto: esta linea no
   * escribe nada en ninguna parte. Lo unico que hace es empezar mirando el año
   * sobre el que esta sesion dijo que trabaja, en vez de uno compilado.
   *
   * <h2>El año que llega puede no estar en la lista del selector</h2>
   *
   * `EJERCICIOS` son cuatro años compilados y el dominio admite de 1990 a 2100,
   * asi que se toma **el que diga la sesion** y es el selector el que se
   * ensancha para poder ofrecerlo (`ejerciciosCon`, en `shell/preferencias`).
   *
   * Las dos alternativas se descartaron midiendo: ignorar el año por no estar
   * en la lista deja la cabecera diciendo uno distinto del que la sesion
   * declara, sin que nada lo explique; y fijarlo sin ensanchar la lista deja el
   * `<select>` fuera de sitio, porque un `value` que no esta entre las
   * `<option>` no se queda en el valor —medido con `ejercicioDeTrabajo` 2019 en
   * el panel de inicio: pedia los indicadores de 2019 y la pildora decia 2026—.
   *
   * <h2>Se lee aqui aunque Seguridad lo lea tambien</h2>
   *
   * Son dos lecturas de la misma ruta y a proposito: esta la hace toda sesion al
   * arrancar y calla —un fallo deja el año local, no una pantalla rota—,
   * mientras la de `Seguridad.tsx` solo ocurre al abrir «Mi contraseña» y
   * necesita su propio `cargando`, su fallo y su «Reintentar», porque sin el
   * `usuarioId` ese acto no puede salir. Compartirla exigiria un contexto mas
   * para ahorrar un GET de sesion.
   */
  const laIdentidad = useRecurso((senal) => identidadDeLaSesion(senal), []);
  useEffect(() => {
    const ejercicio = laIdentidad.datos?.ejercicioDeTrabajo;
    if (ejercicio === undefined || ejercicio === null) return;
    setPref((p) => ({ ...p, ejercicio: String(ejercicio) }));
  }, [laIdentidad.datos]);

  /* Lo que la sesion puede, leido UNA vez para las doce pantallas (#592).

     Aqui y no en cada pantalla porque el mapa es de la sesion, no del destino:
     pedirlo donde hace falta serian tantas peticiones como reportes se abran, y
     todas contestarian lo mismo. `useRecurso` vuelve a pedirlo solo cuando
     cambia la credencial, que es cuando el mapa deja de ser cierto.

     Los tres estados salen de los mismos campos que dibuja cualquier lectura, y
     `leyendo` es «ni datos ni error» a proposito y no `cargando`: entre el
     primer render y el efecto, `cargando` ya es cierto pero un reintento lo
     vuelve a poner a cierto con los datos delante — y ahi lo que se sabe se
     sigue sabiendo. */
  const losPermisos = useRecurso((senal) => permisosDeLaSesion(senal), []);
  const permisos = useMemo<EstadoDePermisos>(
    () => ({
      permisos: losPermisos.datos,
      leyendo: losPermisos.datos === null && losPermisos.error === null,
      fallo: losPermisos.error !== null,
    }),
    [losPermisos.datos, losPermisos.error],
  );

  useEffect(() => {
    const t = () => setRuta(leerRuta());
    window.addEventListener('hashchange', t);
    if (!window.location.hash) window.location.hash = '#/inicio';
    return () => window.removeEventListener('hashchange', t);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--accent', pref.acento);
    raiz.style.setProperty('--accent-2', pref.acento);
    raiz.style.setProperty('--density', DENSIDADES[pref.densidad]);
    raiz.setAttribute('data-theme', pref.tema === 'oscuro' ? 'dark' : 'light');
  }, [pref]);

  useEffect(() => {
    if (!toast.texto) return;
    const t = setTimeout(() => setToast({ texto: '', malo: false }), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* Un aviso habla de lo que acaba de pasar en una pantalla, así que no
     sobrevive a irse a otra: sin esto, el «Solicitud nueva…» de Licencias se
     queda flotando sobre la matriz de permisos de Seguridad. */
  useEffect(() => setToast({ texto: '', malo: false }), [ruta.modulo, ruta.dest]);

  const ir = useCallback((modulo: string, dest?: string, sujeto?: string, filtros?: Record<string, string>) => {
    const d = dest ?? moduloDe(modulo).destinos[0]?.k ?? 'panel';
    const s = sujeto !== undefined && sujeto !== '' ? '/' + encodeURIComponent(sujeto) : '';
    const q = new URLSearchParams(Object.entries(filtros ?? {}).filter(([, v]) => v !== '')).toString();
    window.location.hash = `#/${modulo}/${d}${s}${q === '' ? '' : '?' + q}`;
  }, []);

  /* Cambiar de destino cierra el sujeto: el predio abierto no significa nada en
     «Territorio», y arrastrarlo dejaría una URL que dice lo que no se mira. */
  const onDest = useCallback((k: string) => ir(ruta.modulo, k), [ir, ruta.modulo]);
  /* El sujeto CONSERVA los filtros: se abre una ficha desde una lista filtrada y
     al volver la lista tiene que seguir filtrada. */
  const onSujeto = useCallback(
    (s: string) => ir(ruta.modulo, ruta.dest, s, ruta.filtros),
    [ir, ruta.modulo, ruta.dest, ruta.filtros],
  );
  /* Teclear NO deja entrada en el historial: con una por pulsación, «Atrás»
     tendría que pulsarse una vez por letra para salir de la pantalla. */
  const onFiltros = useCallback(
    (f: Record<string, string>) => {
      const d = ruta.dest;
      const su = ruta.sujeto !== '' ? '/' + encodeURIComponent(ruta.sujeto) : '';
      const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '')).toString();
      window.history.replaceState(null, '', `#/${ruta.modulo}/${d}${su}${q === '' ? '' : '?' + q}`);
      setRuta(leerRuta());
    },
    [ruta.modulo, ruta.dest, ruta.sujeto],
  );

  const ctx = useMemo(
    () => ({ pref, fijar: (p: Partial<Preferencias>) => setPref((v) => ({ ...v, ...p })), toast: avisar, ir }),
    [pref, ir, avisar],
  );

  const Pantalla = PANTALLAS[ruta.modulo] ?? PANTALLAS.inicio;

  return (
    <PermisosCtx.Provider value={permisos}>
      <PreferenciasCtx.Provider value={ctx}>
        <Suspense fallback={<Cargando />}>
          <Pantalla dest={ruta.dest} onDest={onDest} sujeto={ruta.sujeto} onSujeto={onSujeto} filtros={ruta.filtros} onFiltros={onFiltros} />
        </Suspense>
        {toast.texto && (
          <div
            /* Un error no es una nota al margen: se anuncia, no se ofrece. */
            role={toast.malo ? 'alert' : 'status'}
            style={{
              position: 'fixed',
              zIndex: 90,
              bottom: 22,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 18px',
              borderRadius: 999,
              background: toast.malo ? 'var(--error-texto)' : 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 13,
              boxShadow: 'var(--shadow-3)',
              animation: 'subir .2s ease',
              maxWidth: 'min(560px, 92vw)',
            }}
          >
            <Icono d={toast.malo ? ICO.cerrar : ICO.visto} tam={15} grosor={2.4} style={{ flex: '0 0 auto' }} />
            {toast.texto}
          </div>
        )}
      </PreferenciasCtx.Provider>
    </PermisosCtx.Provider>
  );
}

function Cargando() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ flex: '0 0 68px', background: 'var(--accent)' }} />
      <div style={{ flex: '0 0 246px', background: 'var(--bg-elev)', borderRight: '1px solid var(--line)' }} />
      <div style={{ flex: 1, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <span data-esq="1" style={{ display: 'block', height: 28, width: 260 }} />
        <span data-esq="1" style={{ display: 'block', height: 96 }} />
        <span data-esq="1" style={{ display: 'block', height: 220 }} />
      </div>
    </div>
  );
}
