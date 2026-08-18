import { Boton } from '@sgtm/design-system';
import type { Paginacion as DatosDePaginacion } from '@sgtm/api-client';

/**
 * Paginador (FRO-03 §5, junto a la tabla).
 *
 * **Se dibuja solo si la respuesta trae paginacion.** Solo el servidor sabe
 * cuantas filas hay: un padron del manual son cientos de miles, y un paginador
 * que no sabe el total no puede decir si hay pagina siguiente. Mientras el
 * backend no pagine, aqui no hay nada que pintar, y eso es mejor que un control
 * que promete lo que no puede cumplir.
 */
export interface PaginacionProps {
  readonly datos: DatosDePaginacion;
  readonly onPagina: (pagina: number) => void;
}

export function Paginacion({ datos, onPagina }: PaginacionProps) {
  const paginas = Math.max(1, Math.ceil(datos.filas / Math.max(1, datos.tamano)));
  const primera = datos.pagina <= 1;
  const ultima = datos.pagina >= paginas;

  return (
    <nav className="sgtm-paginacion" aria-label="Paginación de la tabla">
      <Boton menudo disabled={primera} onClick={() => onPagina(datos.pagina - 1)}>
        Anterior
      </Boton>
      <span className="sgtm-paginacion__estado" aria-live="polite">
        Página {datos.pagina} de {paginas}
      </span>
      <Boton menudo disabled={ultima} onClick={() => onPagina(datos.pagina + 1)}>
        Siguiente
      </Boton>
    </nav>
  );
}
