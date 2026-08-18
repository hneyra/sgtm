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
  // El backend cuenta desde 0 y la gente desde 1. Lo que se ensena y lo que se
  // pide van en el mismo idioma que quien lo lee.
  const actual = datos.pagina + 1;
  const paginas = Math.max(1, datos.totalPaginas);

  return (
    <nav className="sgtm-paginacion" aria-label="Paginación de la tabla">
      <Boton menudo disabled={actual <= 1} onClick={() => onPagina(actual - 1)}>
        Anterior
      </Boton>
      <span className="sgtm-paginacion__estado" aria-live="polite">
        Página {actual} de {paginas}
      </span>
      <Boton menudo disabled={!datos.hayMas} onClick={() => onPagina(actual + 1)}>
        Siguiente
      </Boton>
    </nav>
  );
}
