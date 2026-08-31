import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { descriptorDe } from '@sgtm/api-client';
import { moduloPorId, opcionPorRuta } from '../catalogo';
import { operacionDe } from '../pantallas/busqueda';
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
 *
 * Y desde el rediseño de Catastro, **tampoco el nivel de la navegacion es
 * estado**: el riel y el panel se dibujan los dos a la vez, asi que el modulo
 * que ensena la barra sale de la ruta como todo lo demas. La `raizForzada` que
 * habia aqui era el unico trozo de navegacion que la URL no explicaba —recargar
 * la perdia, y el enlace de lo que se estaba mirando no la llevaba—.
 */
export function Shell() {
  const { pathname } = useLocation();
  const { preferencias } = usePreferencias();

  const [navAbierta, fijarNavAbierta] = useState(false);
  const [paletaAbierta, fijarPaletaAbierta] = useState(false);
  const [recientes, fijarRecientes] = useState<readonly string[]>(() => leerRecientes());

  const [, moduloId = '', ranura = ''] = pathname.split('/');
  const opcion = opcionPorRuta(moduloId, ranura);
  const modulo = opcion?.modulo ?? moduloPorId(moduloId) ?? null;
  // El titulo y el modulo salen de la navegacion, y la operacion del contrato:
  // la cabecera no necesita la estructura de la pantalla, que viaja aparte.
  const operacion = opcion ? operacionDe(opcion.id) : undefined;
  const descriptor = operacion === undefined ? undefined : descriptorDe(operacion);

  /* Navegar cierra la paleta y el cajon movil: es el comportamiento del
     prototipo al abrir una opcion. */
  useEffect(() => {
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

  return (
    <div className="sgtm-shell" style={variables}>
      <div
        className="sgtm-shell__scrim"
        data-abierta={navAbierta ? '1' : '0'}
        onClick={cerrarNav}
        aria-hidden="true"
      />
      <BarraLateral
        modulo={modulo}
        recientes={recientes}
        abierta={navAbierta}
        onNavegar={cerrarNav}
        onAbrirPaleta={() => fijarPaletaAbierta(true)}
      />
      {/* La columna derecha no es el contenido principal: lo es lo que hay
          debajo de la cabecera. Asi `<header>` queda como landmark `banner` y
          `<main>` acota lo que un lector de pantalla debe saltar a leer. */}
      <div className="sgtm-shell__principal">
        <CabeceraDeApp
          modulo={opcion?.modulo.label ?? (modulo ? 'Módulo' : 'SGTM')}
          titulo={opcion?.title ?? modulo?.label ?? 'Sistema de Gestión Tributaria Municipal'}
          endpoint={descriptor && `${descriptor.metodo} /api/v1${descriptor.ruta}`}
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
