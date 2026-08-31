import { Link } from 'react-router-dom';
import { IconoDeModulo } from '@sgtm/design-system';
import { rutaDeModulo } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';

/**
 * El riel de modulos: el primero de los dos niveles de la navegacion, y el que
 * **no se va nunca**.
 *
 * Hasta aqui la barra lateral ensenaba **un** nivel: o los doce modulos o las
 * opciones del abierto, y se conmutaba con «Todos los modulos». Cambiar de
 * modulo costaba dos pulsaciones y, entre una y otra, la pantalla se quedaba
 * sin decir en que modulo se estaba: el nivel raiz no marca ninguno.
 *
 * El riel pone los dos niveles a la vez. Doce iconos, siempre visibles, con el
 * abierto marcado; al lado, el panel de sus opciones. Se pierde el rotulo de
 * cada modulo —caben 68 px, no 258—, y por eso cada boton lleva `title` para el
 * raton y el nombre accesible para lo demas: el icono solo no nombra nada.
 *
 * **Enlaces y no botones.** Van a la portada del modulo, que es una direccion:
 * se abren en otra pestana, se marcan y se pegan. Que la barra de antes usara
 * `navigate()` era una limitacion de su conmutador, no una decision.
 *
 * Se dibujan **los modulos que este usuario ve** (REQ-03 §5): el riel no puede
 * ser la lista completa mientras el panel esta filtrado, o delataria por el
 * icono lo que el panel esconde.
 */
export interface RielDeModulosProps {
  /** Id del modulo abierto, o `null` si la ruta no esta en ninguno. */
  readonly moduloActivo: string | null;
  readonly entidad: string;
  readonly onNavegar: () => void;
}

export function RielDeModulos({ moduloActivo, entidad, onNavegar }: RielDeModulosProps) {
  const catalogo = useCatalogoVisible();

  return (
    <nav className="sgtm-modulos" aria-label="Módulos del sistema">
      {/* La marca sigue siendo **la vuelta al inicio** (#296): lo unico que
          cambia es que ahora vive en el riel, que es lo que no se mueve. El
          `aria-label` sustituye al contenido, asi que el nombre de la
          municipalidad se devuelve como descripcion —lo describe el parrafo del
          panel, que es donde se lee—. */}
      <Link
        className="sgtm-modulos__marca"
        to="/"
        onClick={onNavegar}
        aria-label="Inicio: a quién atiendes"
        aria-describedby="sgtm-nav-entidad"
        title={entidad}
      >
        S
      </Link>

      {/* Sin `<ul>`: los enlaces cuelgan del `<nav>`, que ya es el landmark que
          los agrupa. Una lista aqui anadiria un `role="list"` al shell entero, y
          las pantallas que buscan **su** lista —el desplegable de solicitantes
          del asistente de licencias, sin ir mas lejos— empezarian a encontrar
          esta. */}
      {catalogo.modulos.map((modulo) => (
        /* `aria-current="true"` y no `"page"`: estando en
           `/catastro/ficha-urbana`, el icono de Catastro senala el modulo
           abierto, no la pagina abierta —que es la opcion, y la marca el
           panel—. Por eso es un `Link` y no un `NavLink`: el segundo pondria
           `"page"` solo por ser prefijo de la ruta. */
        <Link
          key={modulo.id}
          to={rutaDeModulo(modulo)}
          className="sgtm-modulos__modulo"
          data-activo={modulo.id === moduloActivo ? '1' : '0'}
          aria-current={modulo.id === moduloActivo ? 'true' : undefined}
          title={modulo.label}
          onClick={onNavegar}
        >
          <IconoDeModulo trazos={modulo.icono} tamano={19} />
          {/* El rotulo no cabe en 68 px, pero **existe**: el nombre accesible
              sale del texto y no de un `aria-label`, que es lo que sobrevive a
              que la traduccion cambie uno de los dos. */}
          <span className="sgtm-modulos__rotulo">{modulo.label}</span>
        </Link>
      ))}
    </nav>
  );
}
