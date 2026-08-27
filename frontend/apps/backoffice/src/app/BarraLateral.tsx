import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icono, IconoDeModulo } from '@sgtm/design-system';
import { bloquesDe, conteoDeOpciones, rutaDeModulo, rutaDeOpcion } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import type { ModuloDelCatalogo } from '../catalogo';
import { usePreferencias } from './preferencias';

/**
 * Barra lateral de dos niveles (FRO-03 §3).
 *
 * **Nivel raiz:** los recientes y los doce modulos.
 * **Nivel modulo:** vuelta a «Todos los modulos» y las opciones del modulo
 * abierto, repartidas en sus cuatro bloques colapsables.
 *
 * El colapso se guarda por clave `modulo|bloque` para que cada bloque conserve
 * su estado con independencia de los demas, como en el prototipo.
 */
export interface BarraLateralProps {
  /** Modulo abierto, o `null` en el nivel raiz. */
  readonly modulo: ModuloDelCatalogo | null;
  readonly recientes: readonly string[];
  readonly abierta: boolean;
  readonly onVolverARaiz: () => void;
  readonly onNavegar: () => void;
  readonly onAbrirPaleta: () => void;
}

export function BarraLateral({
  modulo,
  recientes,
  abierta,
  onVolverARaiz,
  onNavegar,
  onAbrirPaleta,
}: BarraLateralProps) {
  const { preferencias } = usePreferencias();
  const [cerrados, fijarCerrados] = useState<Readonly<Record<string, boolean>>>({});
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();

  // Los recientes se guardan en el navegador y sobreviven a un cambio de
  // permisos: se cruzan con lo que el usuario puede ver **ahora**, o «Recientes»
  // resucitaria una opcion que ya no le toca.
  const visitados = recientes
    .map((id) => catalogo.opciones.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined);

  return (
    <aside className="sgtm-nav" data-abierta={abierta ? '1' : '0'}>
      <div className="sgtm-nav__cabecera">
        <div className="sgtm-nav__marca" aria-hidden="true">
          S
        </div>
        <div className="sgtm-nav__identidad">
          <div className="sgtm-nav__producto">SGTM</div>
          <div className="sgtm-nav__entidad" title={preferencias.entidad}>
            {preferencias.entidad}
          </div>
        </div>
      </div>

      <div className="sgtm-nav__buscador">
        <button type="button" onClick={onAbrirPaleta}>
          <Icono nombre="lupa" tamano={15} />
          <span>Buscar en el sistema</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>

      {modulo === null ? (
        <nav className="sgtm-nav__lista" aria-label="Módulos del sistema">
          {visitados.length > 0 && (
            <>
              <p className="sgtm-nav__eyebrow">Recientes</p>
              {visitados.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  className="sgtm-nav__reciente"
                  onClick={() => {
                    navegar(opcion.ruta);
                    onNavegar();
                  }}
                >
                  <span className="sgtm-nav__reciente-etiqueta">{opcion.label}</span>
                  <span className="sgtm-nav__reciente-modulo">{opcion.modulo.label}</span>
                </button>
              ))}
              <hr className="sgtm-nav__divisor" />
            </>
          )}
          <p className="sgtm-nav__eyebrow">Módulos</p>
          {catalogo.modulos.map((m) => (
            <button
              key={m.id}
              type="button"
              className="sgtm-nav__modulo"
              onClick={() => {
                navegar(rutaDeModulo(m));
                onNavegar();
              }}
            >
              <span className="sgtm-nav__icono">
                <IconoDeModulo trazos={m.icono} tamano={16} />
              </span>
              <span className="sgtm-nav__modulo-texto">
                <span className="sgtm-nav__modulo-etiqueta">{m.label}</span>
                <span className="sgtm-nav__modulo-conteo">{conteoDeOpciones(m)}</span>
              </span>
              <Icono nombre="chevronDerecha" tamano={14} />
            </button>
          ))}
        </nav>
      ) : (
        <nav className="sgtm-nav__lista" aria-label={`Opciones de ${modulo.label}`}>
          <button type="button" className="sgtm-nav__volver" onClick={onVolverARaiz}>
            <Icono nombre="chevronIzquierda" tamano={14} />
            Todos los módulos
          </button>
          <p className="sgtm-nav__modulo-actual">{modulo.label}</p>
          {bloquesDe(modulo).map((bloque) => {
            const clave = `${modulo.id}|${bloque.label}`;
            const cerrado = cerrados[clave] === true;
            return (
              <div key={bloque.label}>
                <button
                  type="button"
                  className="sgtm-nav__bloque"
                  aria-expanded={!cerrado}
                  onClick={() => fijarCerrados((previos) => ({ ...previos, [clave]: !cerrado }))}
                >
                  <span className="sgtm-nav__caret" data-cerrado={cerrado ? '1' : '0'}>
                    <Icono nombre="chevronAbajo" tamano={12} />
                  </span>
                  <span className="sgtm-nav__bloque-etiqueta">{bloque.label}</span>
                  <span className="sgtm-nav__bloque-conteo">{bloque.opciones.length}</span>
                </button>
                {!cerrado &&
                  bloque.opciones.map((opcion) => (
                    <NavLink
                      key={opcion.id}
                      to={rutaDeOpcion(modulo, opcion)}
                      className="sgtm-nav__opcion"
                      onClick={onNavegar}
                    >
                      {({ isActive }) => (
                        <>
                          <span className="sgtm-nav__opcion-etiqueta">{opcion.label}</span>
                          <span className="sgtm-nav__opcion-punto">{isActive ? '●' : ''}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
              </div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
