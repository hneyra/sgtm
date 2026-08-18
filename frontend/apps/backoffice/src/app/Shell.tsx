import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { moduloPorId, opcionPorRuta, pantallaDe } from '../catalogo';
import { BarraLateral } from './BarraLateral';
import { CabeceraDeApp } from './CabeceraDeApp';
import { PaletaDeComandos } from './PaletaDeComandos';
import { anotarReciente, leerRecientes } from './recientes';
import { usePreferencias, variablesDe } from './preferencias';

/**
 * El shell: barra lateral, cabecera y el hueco donde entra la pantalla.
 *
 * De donde sale cada cosa: **la ruta**. El prototipo guardaba `view` y `navMod`
 * en su estado; aqui la URL es el estado, que es lo que FRO-03 §3 pide al
 * portarlo. Una opcion es una direccion que se puede compartir, marcar y
 * recargar.
 */
export function Shell() {
  const { pathname } = useLocation();
  const { preferencias } = usePreferencias();

  /* La barra lateral vive en el nivel raiz solo mientras el usuario lo pida:
     «Todos los modulos» no cambia de pantalla, cambia de nivel de navegacion. */
  const [raizForzada, fijarRaizForzada] = useState(false);
  const [navAbierta, fijarNavAbierta] = useState(false);
  const [paletaAbierta, fijarPaletaAbierta] = useState(false);
  const [recientes, fijarRecientes] = useState<readonly string[]>(() => leerRecientes());

  const [, moduloId = '', ranura = ''] = pathname.split('/');
  const opcion = opcionPorRuta(moduloId, ranura);
  const modulo = opcion?.modulo ?? moduloPorId(moduloId) ?? null;
  const pantalla = opcion ? pantallaDe(opcion.id) : undefined;

  /* Navegar cierra la paleta y el cajon movil, y devuelve la barra lateral al
     modulo de la ruta: es el comportamiento del prototipo al abrir una opcion. */
  useEffect(() => {
    fijarRaizForzada(false);
    fijarNavAbierta(false);
    fijarPaletaAbierta(false);
  }, [pathname]);

  /* Abrir una opcion la anota en «Recientes», sin duplicados y hasta cinco. */
  useEffect(() => {
    if (opcion) fijarRecientes((previos) => anotarReciente(opcion.id, previos));
  }, [opcion]);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        fijarPaletaAbierta((abierta) => !abierta);
      } else if (evento.key === 'Escape') {
        fijarPaletaAbierta(false);
        fijarNavAbierta(false);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  const cerrarNav = useCallback(() => fijarNavAbierta(false), []);
  const variables = useMemo(() => variablesDe(preferencias), [preferencias]);

  const moduloVisible = raizForzada ? null : modulo;

  return (
    <div className="sgtm-shell" style={variables}>
      <div
        className="sgtm-shell__scrim"
        data-abierta={navAbierta ? '1' : '0'}
        onClick={cerrarNav}
        aria-hidden="true"
      />
      <BarraLateral
        modulo={moduloVisible}
        recientes={recientes}
        abierta={navAbierta}
        onVolverARaiz={() => fijarRaizForzada(true)}
        onNavegar={cerrarNav}
        onAbrirPaleta={() => fijarPaletaAbierta(true)}
      />
      {/* La columna derecha no es el contenido principal: lo es lo que hay
          debajo de la cabecera. Asi `<header>` queda como landmark `banner` y
          `<main>` acota lo que un lector de pantalla debe saltar a leer. */}
      <div className="sgtm-shell__principal">
        <CabeceraDeApp
          modulo={pantalla?.mod ?? (modulo ? 'Módulo' : 'SGTM')}
          titulo={pantalla?.title ?? modulo?.label ?? 'Sistema de Gestión Tributaria Municipal'}
          endpoint={pantalla?.endpoint}
          onAbrirNavegacion={() => fijarNavAbierta(true)}
          onAbrirPaleta={() => fijarPaletaAbierta(true)}
        />
        <main className="sgtm-shell__contenido">
          <div className="sgtm-shell__columna">
            <Outlet />
          </div>
        </main>
      </div>
      <PaletaDeComandos abierta={paletaAbierta} onCerrar={() => fijarPaletaAbierta(false)} />
    </div>
  );
}
