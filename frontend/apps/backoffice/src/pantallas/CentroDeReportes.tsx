import { Link } from 'react-router-dom';
import { hojasDelCentro, rutaDeOpcion } from '../catalogo';
import type { ModuloDelCatalogo } from '../catalogo';

/**
 * El centro de reportes (ADR-0014 §5): las hojas de un modulo, una pantalla.
 *
 * Transito tiene trece hojas y en el menu competian con sus diez operaciones.
 * Aqui son **una** entrada: el carril de la izquierda lista las hojas que el
 * usuario puede ver y a la derecha entra la pantalla de la elegida, con sus
 * criterios y su hoja.
 *
 * Lo que esto **no** es, y es lo unico que hay que entender de este archivo:
 *
 * - **No es un renderizador.** La pantalla de cada hoja la sigue dibujando
 *   `Pantalla` con los bloques de siempre; esto la envuelve, nada mas. Que el
 *   `e2e` de A4 siga pasando sobre una hoja de Transito sin tocar mas que la
 *   ruta es la evidencia de que el bloque de hoja sigue siendo uno solo.
 * - **No absorbe permisos.** Cada hoja conserva su id de opcion, su ruta y su
 *   permiso: entrar por `/transito/record-conductor` cae en su hoja, ahora
 *   dentro de este layout, y el guardia de `Pantalla` decide igual que antes.
 *
 * El carril va marcado `data-no-imprimible`: el documento que sale de la
 * municipalidad lleva la hoja, no la lista de hojas (RNF-084).
 */
export interface CentroDeReportesProps {
  /** El modulo **visible**: sus hojas son las que los permisos dejan ver. */
  readonly modulo: ModuloDelCatalogo;
  /** Id de la hoja abierta, para marcarla en el carril. */
  readonly activa: string;
  /** La pantalla de la hoja, dibujada por el camino de siempre. */
  readonly children: React.ReactNode;
}

export function CentroDeReportes({ modulo, activa, children }: CentroDeReportesProps) {
  const hojas = hojasDelCentro(modulo);

  return (
    <div className="sgtm-centro">
      {/* Navegacion, no menu: son enlaces, y el teclado que ya funciona con
          enlaces es el que hace falta aqui (nada de roles de menu). */}
      <nav
        className="sgtm-centro__carril"
        aria-label={`Reportes de ${modulo.label}`}
        data-no-imprimible="1"
      >
        <p className="sgtm-centro__eyebrow">
          {hojas.length} {hojas.length === 1 ? 'hoja' : 'hojas'}
        </p>
        {hojas.map((hoja) => {
          const abierta = hoja.id === activa;
          return (
            <Link
              key={hoja.id}
              to={rutaDeOpcion(modulo, hoja)}
              className="sgtm-centro__hoja"
              data-abierta={abierta ? '1' : '0'}
              {...(abierta ? { 'aria-current': 'page' as const } : {})}
            >
              {hoja.label}
            </Link>
          );
        })}
      </nav>
      <div className="sgtm-centro__panel">{children}</div>
    </div>
  );
}
