import { Fragment, useState } from 'react';
import { Aviso, Boton, Esqueleto, Insignia, TONO_DE_INSIGNIA } from '@sgtm/design-system';
import type { DatosDeTabla, DetalleDeFila } from '@sgtm/api-client';
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
  /**
   * El alta que cuelga de una fila desplegada, cuando quien mira puede darla.
   *
   * Solo se dibuja si la respuesta trae `detalles`: sin desplegable no hay
   * donde poner el boton, y ponerlo en la fila plegada obligaria a elegir un
   * sector a ciegas.
   */
  readonly altaDeFila?: {
    readonly etiqueta: string;
    readonly onAbrir: (clave: string) => void;
  };
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
  altaDeFila,
}: TablaDePantallaProps) {
  const numericas = new Set(estructura.num ?? []);
  const filas = datos?.filas ?? [];
  const vacia = !cargando && filas.length === 0;
  const detalles = datos?.detalles;
  // Se despliegan de una en una: abrir varias a la vez convierte la tabla en una
  // lista que ya no se puede recorrer con la vista. Se guarda **la clave del
  // detalle** y no el indice de la fila: con el indice, pasar de pagina o
  // filtrar dejaba abierta «la fila 3», que en la pagina nueva es otro registro
  // —el desplegable seguia abierto ensenando el detalle de otro sector—.
  const [desplegada, fijarDesplegada] = useState<string | null>(null);
  const columnas = estructura.cols.length + (detalles === undefined ? 0 : 1);

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
                {detalles !== undefined && (
                  <th className="sgtm-tabla__desplegar">
                    <span className="sgtm-portal__oculto">Desplegar</span>
                  </th>
                )}
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
                      {detalles !== undefined && <td className="sgtm-tabla__desplegar" />}
                      {estructura.cols.map((columna) => (
                        <td key={columna}>
                          <Esqueleto alto={12} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filas.map((fila, f) => {
                    const detalle = detalles?.[f];
                    const abierta = detalle !== undefined && desplegada === detalle.clave;
                    return (
                      // Las filas del catalogo no traen identificador propio; el
                      // indice es estable porque la lista no se reordena en cliente.
                      <Fragment key={f}>
                        <tr>
                          {detalles !== undefined && (
                            <td className="sgtm-tabla__desplegar">
                              {detalle !== undefined && (
                                <button
                                  type="button"
                                  aria-expanded={abierta}
                                  onClick={() => fijarDesplegada(abierta ? null : detalle.clave)}
                                >
                                  <span aria-hidden="true">{abierta ? '▾' : '▸'}</span>
                                  <span className="sgtm-portal__oculto">
                                    {abierta ? 'Plegar' : 'Desplegar'} {detalle.titulo}
                                  </span>
                                </button>
                              )}
                            </td>
                          )}
                          {fila.map((celda, c) => (
                            <td
                              key={estructura.cols[c] ?? c}
                              className={numericas.has(c) ? 'sgtm-tabla--numerica' : undefined}
                            >
                              {celda.tono ? (
                                <Insignia tono={TONO_DE_INSIGNIA[celda.tono]}>
                                  {celda.texto}
                                </Insignia>
                              ) : (
                                celda.texto
                              )}
                            </td>
                          ))}
                        </tr>
                        {/* **Sin `aria-controls`.** Apuntaba a un `id` que solo
                            existe con la fila desplegada: plegada, el atributo
                            senalaba a la nada, y un lector de pantalla que sigue
                            la referencia no encuentra nada que anunciar. La otra
                            salida —dibujar el detalle siempre y ocultarlo con
                            `hidden`— mete en el DOM el detalle de cada fila de
                            cada pagina; `aria-expanded` solo ya dice lo que hay
                            que decir: si esta abierto o cerrado. */}
                        {detalle !== undefined && abierta && (
                          <tr className="sgtm-tabla__fila-detalle">
                            <td colSpan={columnas}>
                              <Detalle detalle={detalle} altaDeFila={altaDeFila} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
 * Lo que cuelga de una fila desplegada.
 *
 * Las piezas se dibujan como fichas con su conteo **tal como llego** (RNF-083):
 * ni se suman, ni se completan, ni se deducen. Cuando el servidor todavia no
 * publica lo que cuelga, se dice —`nota`— en vez de ensenar un desplegable vacio
 * que se leeria como «aqui no hay nada».
 */
function Detalle({
  detalle,
  altaDeFila,
}: {
  readonly detalle: DetalleDeFila;
  readonly altaDeFila?: TablaDePantallaProps['altaDeFila'];
}) {
  return (
    <div className="sgtm-detalle">
      <div className="sgtm-detalle__cabecera">
        <span className="sgtm-detalle__titulo">{detalle.titulo}</span>
        {altaDeFila !== undefined && (
          <Boton variante="fantasma" onClick={() => altaDeFila.onAbrir(detalle.clave)}>
            {altaDeFila.etiqueta}
          </Boton>
        )}
      </div>
      {detalle.items.length > 0 && (
        <ul className="sgtm-detalle__fichas">
          {detalle.items.map((item, i) => (
            // El texto no es clave: dos manzanas de sectores distintos se
            // llaman «001», y React se queda con la primera de las dos.
            <li key={`${i}-${item.texto}`} className="sgtm-detalle__ficha">
              <span className="sgtm-detalle__codigo">{item.texto}</span>
              {item.nota !== undefined && <span className="sgtm-detalle__conteo">{item.nota}</span>}
            </li>
          ))}
        </ul>
      )}
      {detalle.nota !== undefined && <p className="sgtm-detalle__nota">{detalle.nota}</p>}
    </div>
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
