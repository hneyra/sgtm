import { Aviso, Boton, Esqueleto, Insignia, TONO_DE_INSIGNIA } from '@sgtm/design-system';
import type { DatosDeTabla } from '@sgtm/api-client';
import type { EstructuraDeTabla } from '../../catalogo';
import { Paginacion } from './Paginacion';
import type { Sentido } from '../busqueda';
import { vacioDe } from '../estados';

/**
 * Bloque de tabla (FRO-03 §5, bloque 5).
 *
 * Las columnas las declara el catalogo; las filas llegan de la API. Los indices
 * de `num` alinean a la derecha y usan monoespaciada, la primera columna va en
 * peso 500 y una celda con tono se pinta como insignia —con su texto dentro,
 * nunca solo color—.
 *
 * Dos cosas que la tabla **no** hace, y las dos por el mismo motivo: no ordena
 * ni pagina en el cliente. Lo que tiene delante es una pagina de un padron que
 * puede tener cientos de miles de filas; ordenar esa pagina ordena media tabla
 * y **miente**. Pulsar una cabecera pide otro orden al servidor.
 *
 * Lo que **no** hace es convertir la primera celda en el enlace al registro de
 * la pantalla. Seria comodo, pero el catalogo no lo sostiene: de las quince
 * pantallas que abren un registro y traen tabla, la primera columna es ese
 * registro en **una**. En las demas la tabla es parte de la ficha —las vias de
 * un predio, las cuotas de un convenio—, y enlazarla llevaria a abrir una via
 * como si fuera un predio. Que busqueda abre que ficha lo decide cada modulo.
 */
export interface TablaDePantallaProps {
  readonly estructura: EstructuraDeTabla;
  readonly datos?: DatosDeTabla;
  readonly cargando: boolean;
  readonly orden?: string;
  readonly sentido?: Sentido;
  readonly onOrdenar?: (clave: string) => void;
  readonly onPagina?: (pagina: number) => void;
  /** Hay filtros aplicados: cambia lo que significa que no haya filas. */
  readonly hayFiltros?: boolean;
}

const ARIA_SENTIDO = { ASCENDENTE: 'ascending', DESCENDENTE: 'descending' } as const;

export function TablaDePantalla({
  estructura,
  datos,
  cargando,
  orden,
  sentido,
  onOrdenar,
  onPagina,
  hayFiltros = false,
}: TablaDePantallaProps) {
  const numericas = new Set(estructura.num ?? []);
  const filas = datos?.filas ?? [];
  const vacia = !cargando && filas.length === 0;

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
      {vacia ? (
        <Vacio hayFiltros={hayFiltros} que={estructura.title.toLowerCase()} />
      ) : (
        <div className="sgtm-tabla__marco">
          <table className="sgtm-tabla">
            <thead>
              <tr>
                {estructura.cols.map((columna, i) => {
                  const clave = estructura.claves[i];
                  const ordenable = onOrdenar !== undefined && clave !== undefined;
                  const activa = ordenable && clave === orden;
                  return (
                    <th
                      key={columna}
                      className={numericas.has(i) ? 'sgtm-tabla--numerica' : undefined}
                      aria-sort={activa ? ARIA_SENTIDO[sentido ?? 'ASCENDENTE'] : undefined}
                    >
                      {ordenable ? (
                        <button
                          type="button"
                          className="sgtm-tabla__orden"
                          data-activa={activa ? '1' : '0'}
                          onClick={() => onOrdenar(clave)}
                        >
                          {columna}
                          <span aria-hidden="true">
                            {activa ? (sentido === 'DESCENDENTE' ? ' ↓' : ' ↑') : ''}
                          </span>
                        </button>
                      ) : (
                        columna
                      )}
                    </th>
                  );
                })}
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
      )}
      {datos?.paginacion && onPagina && <Paginacion datos={datos.paginacion} onPagina={onPagina} />}
      {estructura.note && <p className="sgtm-tarjeta__pie">{estructura.note}</p>}
    </section>
  );
}

/**
 * Que decir cuando no hay filas.
 *
 * «Ningun resultado para este filtro» y «todavia no hay nada» no son lo mismo
 * para quien atiende en ventanilla: en el primero hay algo que hacer —quitar un
 * filtro—, y en el segundo no hay nada que buscar.
 */
function Vacio({ hayFiltros, que }: { readonly hayFiltros: boolean; readonly que: string }) {
  const texto = vacioDe(que, hayFiltros);
  return <Aviso titulo={texto.titulo} detalle={texto.detalle} />;
}
