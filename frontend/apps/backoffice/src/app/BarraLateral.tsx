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
 * abierto, repartidas en sus bloques colapsables —salvo los que el modulo
 * pliega (ADR-0014 §5), que son una entrada unica cada uno—.
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
      {/* La marca es **la vuelta al inicio** (#296). Desde que `/` dejo de ser
          un desvio al panel de recaudacion y pasa a ser la pregunta de a quien
          se atiende, hacia falta un camino de vuelta: no es una opcion del
          catalogo, asi que ni el menu ni el lanzador ni la paleta llegan a ella.
          El de siempre —la marca de arriba a la izquierda— es el que no hay que
          explicarle a nadie.

          El `aria-label` **sustituye** al contenido en el arbol accesible, y con
          el se iba de ahi el nombre de la municipalidad: la cabecera de la
          aplicacion tampoco lo deja —su boton lleva `aria-label={«Menú de …»}`,
          que tapa el chip donde se lee—, asi que el dato no se anunciaba en
          ninguna parte. `aria-describedby` lo devuelve como descripcion del
          enlace: primero a donde lleva, y despues donde se esta. */}
      <Link
        className="sgtm-nav__cabecera"
        to="/"
        onClick={onNavegar}
        aria-label="Inicio: a quién atiendes"
        aria-describedby="sgtm-nav-entidad"
      >
        <div className="sgtm-nav__marca" aria-hidden="true">
          S
        </div>
        <div className="sgtm-nav__identidad">
          <div className="sgtm-nav__producto">SGTM</div>
          <div className="sgtm-nav__entidad" id="sgtm-nav-entidad" title={preferencias.entidad}>
            {preferencias.entidad}
          </div>
        </div>
      </Link>

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
            // Las opciones de un bloque plegado no se listan: son **una**
            // entrada que abre su superficie (ADR-0014 §5). Que esa superficie
            // sea un carril de hojas o las pestanas de una pantalla es cosa de
            // la pantalla, no del menu: aqui los dos se dibujan igual.
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
