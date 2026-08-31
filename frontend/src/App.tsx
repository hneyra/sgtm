import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DENSIDADES, PreferenciasCtx, type Preferencias } from './shell/preferencias';
import { MODULOS, moduloDe } from './shell/modulos';
import { Icono } from './ds/Icono';
import { ICO } from './ds/iconos';

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

export type PantallaProps = { dest: string; onDest: (k: string) => void };

/** La ruta vive en el hash: `#/catastro/predios`. No hay servidor que la sirva
 *  y así una pantalla concreta se puede compartir por su URL. */
function leerRuta(): { modulo: string; dest: string } {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [modulo = 'inicio', dest = ''] = h.split('/');
  const m = MODULOS.find((x) => x.k === modulo) ? modulo : 'inicio';
  return { modulo: m, dest: dest || (moduloDe(m).destinos[0]?.k ?? 'panel') };
}

export function App() {
  const [ruta, setRuta] = useState(leerRuta);
  const [toast, setToast] = useState('');
  const [pref, setPref] = useState<Preferencias>(() => ({
    entidad: 'Municipalidad Distrital de Catacaos',
    acento: '#1F3A5F',
    densidad: 'Normal',
    tema: 'claro',
    ejercicio: '2026',
  }));

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
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* Un aviso habla de lo que acaba de pasar en una pantalla, así que no
     sobrevive a irse a otra: sin esto, el «Solicitud nueva…» de Licencias se
     queda flotando sobre la matriz de permisos de Seguridad. */
  useEffect(() => setToast(''), [ruta.modulo, ruta.dest]);

  const ir = useCallback((modulo: string, dest?: string) => {
    const d = dest ?? moduloDe(modulo).destinos[0]?.k ?? 'panel';
    window.location.hash = `#/${modulo}/${d}`;
  }, []);

  const onDest = useCallback((k: string) => ir(ruta.modulo, k), [ir, ruta.modulo]);

  const ctx = useMemo(
    () => ({ pref, fijar: (p: Partial<Preferencias>) => setPref((v) => ({ ...v, ...p })), toast: setToast, ir }),
    [pref, ir],
  );

  const Pantalla = PANTALLAS[ruta.modulo] ?? PANTALLAS.inicio;

  return (
    <PreferenciasCtx.Provider value={ctx}>
      <Suspense fallback={<Cargando />}>
        <Pantalla dest={ruta.dest} onDest={onDest} />
      </Suspense>
      {toast && (
        <div
          role="status"
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
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontSize: 13,
            boxShadow: 'var(--shadow-3)',
            animation: 'subir .2s ease',
            maxWidth: 'min(560px, 92vw)',
          }}
        >
          <Icono d={ICO.visto} tam={15} grosor={2.4} style={{ flex: '0 0 auto' }} />
          {toast}
        </div>
      )}
    </PreferenciasCtx.Provider>
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
