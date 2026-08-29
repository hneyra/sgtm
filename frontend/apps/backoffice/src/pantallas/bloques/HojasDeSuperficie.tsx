import { Link, useSearchParams } from 'react-router-dom';
import { opcionPorId } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';

/**
 * **Las hojas de una superficie**: dos o mas opciones del catalogo que hablan
 * del mismo objeto, dibujadas con una tira de pestañas que lleva de una a otra.
 *
 * Es la mitad navegacional de lo que `catastro/Territorio.tsx` hace entero. La
 * diferencia entre las dos es deliberada y conviene tenerla escrita, porque
 * decide cuando usar cada una:
 *
 * - `Territorio` **tiene que ser** un componente propio: su contenido es un
 *   arbol de sectores y manzanas, y un arbol no se puede declarar en el
 *   catalogo. Al serlo, deja de pasar por el renderizador generico y tiene que
 *   volver a dibujar a mano filtros, tabla, secciones y barra.
 * - Aqui las hojas **son** pantallas del catalogo. Lo unico que faltaba era
 *   poder pasar de una a otra sin volver al menu, asi que se anade la tira y
 *   **nada mas**: cada hoja se sigue dibujando por el camino comun, con todos
 *   sus bloques. Es lo que hace que el censo de capacidades siga en verde sin
 *   que este archivo tenga que reproducir ni un filtro.
 *
 * Tres cosas, y las tres por el mismo motivo que en `Territorio`:
 *
 * 1. **Las pestañas son enlaces**, no un `useState`. El enlace de lo que se
 *    esta mirando se puede compartir (FRO-04 §5) y el permiso lo sigue
 *    decidiendo el guardia de `Pantalla`, que corre al entrar por la ruta. Con
 *    estado local, quien no tiene la otra hoja llegaria a ella sin pasar por
 *    ningun guardia y la pantalla ya habria dibujado su estructura, que es lo
 *    que REQ-03 §5 prohibe.
 * 2. **La hoja que este perfil no puede ver no se dibuja.** Ofrecerla seria
 *    ofrecer un enlace a un aviso de «no tienes permiso».
 * 3. **El rotulo es el titulo del catalogo**, sin reescribir (RNF-080): la
 *    pestaña lleva a esa pantalla, y su nombre es su titulo.
 *
 * Y una propia: **la busqueda viaja con el enlace**. Las dos hojas de un
 * movimiento de deuda trabajan sobre el mismo contribuyente, y volver a
 * teclearlo al cambiar de hoja es exactamente lo que la superficie viene a
 * quitar. Lo que la hoja de destino no declare como filtro lo ignora, que es lo
 * que ya hace con cualquier parametro de mas.
 */
export function HojasDeSuperficie({
  titulo,
  hojas,
  activa,
}: {
  /** Como se llama el objeto del que hablan todas: «Movimientos de deuda». */
  readonly titulo: string;
  /** Los ids de opcion, en el orden en que se dibujan. */
  readonly hojas: readonly string[];
  /** La opcion que se esta viendo. */
  readonly activa: string;
}) {
  const catalogo = useCatalogoVisible();
  const [busqueda] = useSearchParams();
  const cola = busqueda.toString();

  const visibles = hojas
    .filter((opcion) => catalogo.puedeVer(opcion))
    .flatMap((opcion) => {
      const situada = opcionPorId(opcion);
      return situada === undefined ? [] : [{ opcion, situada }];
    });

  // Con una sola hoja visible no hay superficie: una tira de una pestaña es un
  // titulo con aspecto de navegacion.
  if (visibles.length < 2) return null;

  return (
    <div className="sgtm-superficie">
      <p className="sgtm-superficie__titulo">{titulo}</p>
      <div className="sgtm-pestanas" role="tablist" aria-label={`Hojas de ${titulo}`}>
        {visibles.map(({ opcion, situada }) => (
          <Link
            key={opcion}
            to={cola === '' ? situada.ruta : `${situada.ruta}?${cola}`}
            role="tab"
            aria-selected={opcion === activa}
            className="sgtm-pestanas__tab"
            data-activa={opcion === activa ? '1' : '0'}
          >
            {situada.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
