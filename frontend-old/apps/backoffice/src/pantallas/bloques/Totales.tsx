import { Esqueleto } from '@sgtm/design-system';
import type { Total } from '@sgtm/api-client';

/**
 * Banda de totales (FRO-03 §5, bloque 6).
 *
 * Los importes llegan **ya sumados por el backend**: sumar aqui produciria una
 * cifra que el backend no puede sustentar (RNF-083).
 *
 * La fecha a la que estan actualizados **ya no vive aqui**, y ese cambio corrige
 * un defecto: era de la banda, asi que una pantalla que ensena cifras en una
 * tabla y no tiene banda —siete de las once de Consultas— mostraba importes sin
 * decir de cuando eran. Es de la respuesta, y se dibuja una vez por pantalla
 * (`FechaDeCalculo`).
 *
 * Mientras carga, cada celda guarda su sitio con un esqueleto del alto de la
 * cifra: la banda no cambia de altura al llegar la respuesta. Y **no muestra un
 * cero**: un total en blanco es «todavia no se sabe», y un cero es una cifra.
 */
export interface TotalesProps {
  readonly estructura: readonly { readonly label: string; readonly fuerte: boolean }[];
  readonly datos?: readonly Total[];
  readonly cargando?: boolean;
}

export function Totales({ estructura, datos, cargando = false }: TotalesProps) {
  const porEtiqueta = new Map((datos ?? []).map((t) => [t.label, t.value]));

  return (
    <section className="sgtm-totales-marco">
      <div className="sgtm-totales">
        {estructura.map((total) => (
          <div
            key={total.label}
            className="sgtm-totales__celda"
            data-fuerte={total.fuerte ? '1' : '0'}
          >
            <span className="sgtm-totales__etiqueta">{total.label}</span>
            <span className="sgtm-totales__valor">
              {cargando ? (
                <Esqueleto alto={18} ancho="7ch" />
              ) : (
                (porEtiqueta.get(total.label) ?? '—')
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
