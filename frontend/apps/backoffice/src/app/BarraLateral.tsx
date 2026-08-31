import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icono } from '@sgtm/design-system';
import { bloquesDe, rutaDeOpcion } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import type { BloqueDeNavegacion, ModuloDelCatalogo } from '../catalogo';
import { usePreferencias } from './preferencias';
import { RielDeModulos } from './RielDeModulos';

/**
 * Barra lateral de dos niveles **a la vez** (FRO-03 §3, rediseño de Catastro).
 *
 * **Riel:** los doce modulos, siempre visibles, con el abierto marcado.
 * **Panel:** el modulo abierto y sus opciones, repartidas en sus bloques —salvo
 * los que el modulo pliega (ADR-0014 §5), que son una entrada unica cada uno—.
 *
 * Lo que cambia respecto de la barra de un nivel, y por que:
 *
 * - **Se va «Todos los modulos».** Era el conmutador entre los dos niveles, y
 *   con los dos dibujados no conmuta nada. Cambiar de modulo pasa de dos
 *   pulsaciones a una, y deja de haber un estado —el nivel raiz— en el que la
 *   navegacion no dice en que modulo se esta.
 * - **Los bloques dejan de plegarse.** Plegar servia para que las opciones del
 *   modulo cupieran junto a los doce modulos en la misma columna; con los
 *   modulos en el riel, el panel es del modulo entero y su bloque mas largo son
 *   siete entradas. Un acordeon que nunca hace falta cerrar es una pulsacion
 *   antes de cada opcion. El bloque se queda como **rotulo** del grupo, que es
 *   lo que aportaba: decir de que va lo que viene debajo.
 *
 *   Esto **no** toca el pliegue de ADR-0014 §5, que es otra cosa con nombre
 *   parecido: aquel esconde las opciones de un grupo detras de una entrada
 *   porque su superficie ya sabe navegar entre ellas, y sigue igual.
 * - **Los recientes se quedan en el panel** cuando la ruta no esta en ningun
 *   modulo. Sin nivel raiz que los albergara, el sitio natural es el panel de
 *   la portada.
 */
export interface BarraLateralProps {
  /** Modulo abierto, o `null` si la ruta no esta en ninguno. */
  readonly modulo: ModuloDelCatalogo | null;
  readonly recientes: readonly string[];
  readonly abierta: boolean;
  readonly onNavegar: () => void;
  readonly onAbrirPaleta: () => void;
}

export function BarraLateral({
  modulo,
  recientes,
  abierta,
  onNavegar,
  onAbrirPaleta,
}: BarraLateralProps) {
  const { preferencias } = usePreferencias();
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();

  // Los recientes se guardan en el navegador y sobreviven a un cambio de
  // permisos: se cruzan con lo que el usuario puede ver **ahora**, o «Recientes»
  // resucitaria una opcion que ya no le toca.
  const visitados = recientes
    .map((id) => catalogo.opciones.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined);

  /* El panel lista **el modulo que este usuario ve**, no el del catalogo
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
    <>
      <RielDeModulos
        moduloActivo={abierto?.id ?? null}
        entidad={preferencias.entidad}
        onNavegar={onNavegar}
      />

      <aside className="sgtm-nav" data-abierta={abierta ? '1' : '0'}>
        {/* La cabecera del panel dice **donde se esta**, y es la unica del shell
            que nombra la municipalidad: la marca del riel lleva `aria-label`, que
            sustituye a su contenido, y el chip de la cabecera de la aplicacion
            vive dentro de un boton que tambien lo tapa con el suyo. De aqui lo
            toma el `aria-describedby` de la marca. */}
        <div className="sgtm-nav__cabecera">
          <p className="sgtm-nav__eyebrow sgtm-nav__eyebrow--cabecera">
            {abierto === null ? 'Sistema' : 'Módulo'}
          </p>
          <p className="sgtm-nav__titulo">{abierto?.label ?? 'SGTM'}</p>
          <p className="sgtm-nav__entidad" id="sgtm-nav-entidad" title={preferencias.entidad}>
            {preferencias.entidad}
          </p>
        </div>

        <div className="sgtm-nav__buscador">
          <button type="button" onClick={onAbrirPaleta}>
            <Icono nombre="lupa" tamano={15} />
            <span>Buscar en el sistema</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        {abierto === null ? (
          <nav className="sgtm-nav__lista" aria-label="Lo último que abriste">
            {visitados.length > 0 ? (
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
              </>
            ) : (
              /* El vacio dice la causa y la salida, como los demas de este
                 rediseño: aqui la salida son los doce iconos de al lado. */
              <p className="sgtm-nav__vacio">
                Elige un módulo en la columna de la izquierda, o busca con Ctrl K. Lo que abras
                quedará aquí.
              </p>
            )}
          </nav>
        ) : (
          <nav className="sgtm-nav__lista" aria-label={`Opciones de ${abierto.label}`}>
            {bloquesDe(abierto).map((bloque) => {
              // Las opciones de un bloque plegado no se listan: son **una**
              // entrada que abre su superficie (ADR-0014 §5). Que esa superficie
              // sea un carril de hojas o las pestanas de una pantalla es cosa de
              // la pantalla, no del menu: aqui los dos se dibujan igual. Y no
              // lleva rotulo de grupo encima porque el rotulo **es** la entrada.
              if (bloque.plegado) {
                return (
                  <EntradaPlegada
                    key={bloque.label}
                    modulo={abierto}
                    bloque={bloque}
                    onNavegar={onNavegar}
                  />
                );
              }
              return (
                <div key={bloque.label} className="sgtm-nav__grupo">
                  <p className="sgtm-nav__eyebrow">{bloque.label}</p>
                  {bloque.opciones.map((opcion) => (
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
    </>
  );
}

/**
 * La entrada unica de un bloque plegado (ADR-0014 §5).
 *
 * La misma para los dos pliegues, y eso es lo que hace que plegar un grupo
 * cueste una marca en la tabla: el centro de reportes de Transito y el cuadro
 * de valuacion de Catastro se dibujan aqui igual, y lo que los diferencia
 * —tener carril o no— lo decide la pantalla, no el menu.
 *
 * Navega a **una opcion concreta** —la primera que el usuario puede ver— y no a
 * una ruta nueva: una ruta del pliegue seria una opcion mas, sin id en el
 * catalogo y sin permiso propio, y esta decision no crea ninguna. Desde ahi, la
 * superficie lleva a las demas: el carril en el centro, el conmutador o las
 * pestanas en las tres superficies de Catastro.
 *
 * Se dibuja solo si queda alguna opcion visible: el modulo ya llega filtrado
 * por `useCatalogoVisible`, asi que un usuario sin permiso sobre ninguna de
 * ellas no ve la entrada (REQ-03 §5).
 */
function EntradaPlegada({
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

  // Se esta dentro si la ruta abierta es la de **alguna** de sus opciones.
  // No se marca `aria-current="page"`: el enlace apunta a la primera, que casi
  // nunca es la abierta, y decir «esta es la pagina» seria mentir. Quien si lo
  // lleva es la hoja del carril, o la pestana activa de la superficie.
  const dentro = bloque.opciones.some((opcion) => pathname === rutaDeOpcion(modulo, opcion));

  return (
    <Link
      to={rutaDeOpcion(modulo, primera)}
      className="sgtm-nav__opcion sgtm-nav__plegado"
      data-dentro={dentro ? '1' : '0'}
      onClick={onNavegar}
    >
      <span className="sgtm-nav__opcion-etiqueta">{bloque.label}</span>
      <span className="sgtm-nav__bloque-conteo">{bloque.opciones.length}</span>
    </Link>
  );
}
