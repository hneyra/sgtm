import { Boton, Esqueleto, Insignia, TONO_DE_INSIGNIA } from '@sgtm/design-system';
import type { DatosDeTabla } from '@sgtm/api-client';
import type { EstructuraDeTabla } from '../../catalogo';

/**
 * Bloque de tabla (FRO-03 §5, bloque 5).
 *
 * Las columnas las declara el catalogo; las filas llegan de la API. Los indices
 * de `num` alinean a la derecha y usan monoespaciada, la primera columna va en
 * peso 500 y una celda con tono se pinta como insignia —con su texto dentro,
 * nunca solo color—.
 */
export interface TablaDePantallaProps {
  readonly estructura: EstructuraDeTabla;
  readonly datos?: DatosDeTabla;
  readonly cargando: boolean;
}

export function TablaDePantalla({ estructura, datos, cargando }: TablaDePantallaProps) {
  const numericas = new Set(estructura.num ?? []);
  const filas = datos?.filas ?? [];

  return (
    <section className="sgtm-tarjeta">
      <div className="sgtm-tarjeta__cabecera">
        <h2 className="sgtm-tarjeta__titulo">{estructura.title}</h2>
        <span className="sgtm-tarjeta__conteo">{cargando ? '…' : (datos?.conteo ?? '')}</span>
        {estructura.acciones && (
          <div className="sgtm-tarjeta__acciones">
            {estructura.acciones.map((accion) => (
              <Boton key={accion} variante="fantasma">
                {accion}
              </Boton>
            ))}
          </div>
        )}
      </div>
      <div className="sgtm-tabla__marco">
        <table className="sgtm-tabla">
          <thead>
            <tr>
              {estructura.cols.map((columna, i) => (
                <th key={columna} className={numericas.has(i) ? 'sgtm-tabla--numerica' : undefined}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando
              ? [0, 1, 2, 3, 4].map((n) => (
                  <tr key={n}>
                    {estructura.cols.map((columna) => (
                      <td key={columna}>
                        <Esqueleto alto={12} />
                      </td>
                    ))}
                  </tr>
                ))
              : filas.map((fila, f) => (
                  // Las filas del catalogo no traen identificador propio; el
                  // indice es estable porque la lista no se reordena en cliente.
                  <tr key={f}>
                    {fila.map((celda, c) => (
                      <td
                        key={estructura.cols[c] ?? c}
                        className={numericas.has(c) ? 'sgtm-tabla--numerica' : undefined}
                      >
                        {celda.tono ? (
                          <Insignia tono={TONO_DE_INSIGNIA[celda.tono]}>{celda.texto}</Insignia>
                        ) : (
                          celda.texto
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {estructura.note && <p className="sgtm-tarjeta__pie">{estructura.note}</p>}
    </section>
  );
}
