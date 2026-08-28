import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icono, IconoDeModulo } from '@sgtm/design-system';
import { bloquesDe, conteoDeOpciones, rutaDeModulo, rutaDeOpcion } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import type { BloqueDeNavegacion, ModuloDelCatalogo } from '../catalogo';
import { usePreferencias } from './preferencias';

/**
 * Barra lateral de dos niveles (FRO-03 §3).
 *
 * **Nivel raiz:** los recientes y los doce modulos.
 * **Nivel modulo:** vuelta a «Todos los modulos» y las opciones del modulo
 * abierto, repartidas en sus bloques colapsables —salvo el que el modulo
 * pliega en su centro de reportes (ADR-0014 §5), que es una entrada unica—.
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

  /* El nivel modulo lista **el modulo que este usuario ve**, no el del catalogo
     entero: la ruta se resuelve contra las 134 —es la que da el titulo de la
     cabecera—, y dibujar sus opciones sin filtrar delataba las que sus permisos
     niegan al entrar por la URL (REQ-03 §5). Si de este modulo no ve ninguna,
     queda el encabezado sin opciones: la pantalla ya dice que no tiene permiso. */
  const abierto =
    modulo === null
      ? null
      : (catalogo.modulos.find((m) => m.id === modulo.id) ?? {
          ...modulo,
          bloques: [],
          opciones: [],
        });

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

      {abierto === null ? (
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
        <nav className="sgtm-nav__lista" aria-label={`Opciones de ${abierto.label}`}>
          <button type="button" className="sgtm-nav__volver" onClick={onVolverARaiz}>
            <Icono nombre="chevronIzquierda" tamano={14} />
            Todos los módulos
          </button>
          <p className="sgtm-nav__modulo-actual">{abierto.label}</p>
          {bloquesDe(abierto).map((bloque) => {
            // Las hojas plegadas no se listan: son una entrada que abre el
            // centro de reportes (ADR-0014 §5).
            if (bloque.plegado) {
              return (
                <EntradaDelCentro
                  key={bloque.label}
                  modulo={abierto}
                  bloque={bloque}
                  onNavegar={onNavegar}
                />
              );
            }
            const clave = `${abierto.id}|${bloque.label}`;
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
                      to={rutaDeOpcion(abierto, opcion)}
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

/**
 * La entrada unica de un bloque plegado en centro de reportes (ADR-0014 §5).
 *
 * Navega a **una hoja concreta** —la primera que el usuario puede ver— y no a
 * una ruta nueva: una ruta del centro seria una opcion mas, sin id en el
 * catalogo y sin permiso propio, y esta decision no crea ninguna. El centro
 * lista las demas.
 *
 * Se dibuja solo si queda alguna hoja visible: el modulo ya llega filtrado por
 * `useCatalogoVisible`, asi que un usuario sin permiso sobre ninguna hoja no ve
 * la entrada (REQ-03 §5).
 */
function EntradaDelCentro({
  modulo,
  bloque,
  onNavegar,
}: {
  readonly modulo: ModuloDelCatalogo;
  readonly bloque: BloqueDeNavegacion;
  readonly onNavegar: () => void;
}) {
  const { pathname } = useLocation();
  const primera = bloque.opciones[0];
  if (primera === undefined) return null;

  // Se esta en el centro si la ruta abierta es la de **alguna** de sus hojas.
  // No se marca `aria-current="page"`: el enlace apunta a la primera hoja, que
  // casi nunca es la abierta, y decir «esta es la pagina» seria mentir. La que
  // si lo lleva es la hoja del carril del centro.
  const dentro = bloque.opciones.some((hoja) => pathname === rutaDeOpcion(modulo, hoja));

  return (
    <Link
      to={rutaDeOpcion(modulo, primera)}
      className="sgtm-nav__opcion sgtm-nav__centro"
      data-dentro={dentro ? '1' : '0'}
      onClick={onNavegar}
    >
      <span className="sgtm-nav__opcion-etiqueta">{bloque.label}</span>
      <span className="sgtm-nav__bloque-conteo">{bloque.opciones.length}</span>
    </Link>
  );
}
