import { Fragment, useState } from 'react';
import { Aviso, Boton, Esqueleto, Insignia, TONO_DE_INSIGNIA } from '@sgtm/design-system';
import { agruparMiles } from '@sgtm/dominio';
import type { DatosDeTabla, DetalleDeFila } from '@sgtm/api-client';
import type { EstructuraDeTabla } from '../../catalogo';
import { Paginacion } from './Paginacion';
import type { Sentido } from '../busqueda';
import { vacioDe } from '../estados';
import { pieDe } from '../prosa';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Bloque de tabla (FRO-03 §5, bloque 5).
 *
 * Las columnas las declara el catalogo; las filas llegan de la API. Los indices
 * de `num` alinean a la derecha, usan monoespaciada y llevan el separador de
 * millares de `agruparMiles` (#342, nit 6) —solo al dibujar: `celda.texto` es
 * el texto que mando el backend y nadie lo toca antes de mandarlo de vuelta—,
 * la primera columna va en peso 500 y una celda con tono se pinta como
 * insignia —con su texto dentro, nunca solo color—.
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
  /**
   * La opcion a la que pertenece esta tabla, para **una** cosa: preguntar si su
   * pie del prototipo sigue siendo cierto (`prosa-textos.ts`, `PIES`).
   *
   * El pie viene del catalogo portado, que es un `.generado.ts` y no se edita a
   * mano: cuando lo que dice ha dejado de ser verdad —o contradice al aviso
   * permanente de la misma pantalla— la correccion vive en la prosa, y esto es
   * lo que la deja llegar hasta aqui. Sin opcion, el pie se pinta tal cual, que
   * es lo que hacen las tablas de `Respaldos` y las de las pruebas.
   */
  readonly opcion?: string;
  readonly datos?: DatosDeTabla;
  readonly cargando: boolean;
  readonly orden?: string;
  readonly sentido?: Sentido;
  readonly onOrdenar?: (clave: string) => void;
  readonly onPagina?: (pagina: number) => void;
  /** Hay filtros aplicados: cambia lo que significa que no haya filas. */
  readonly hayFiltros?: boolean;
  /**
   * El `id` con que la tarjeta queda anclada, cuando la pantalla lleva indice
   * de secciones (`composicion.ts`).
   *
   * La tabla se dibuja **antes** que las secciones y fuera de la rejilla del
   * indice (FRO-03 §5), asi que sin esto el indice de una pantalla con tabla
   * empieza por la segunda cosa que hay en la pagina: en «Cálculo individual
   * del impuesto predial» el paso 1 del calculo —los predios que integran la
   * base— quedaba sin entrada.
   */
  readonly ancla?: string;
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
  /**
   * La tabla **elige filas** (#332), cuando la opcion lo declara
   * (`composicion.ts`). Sin esto se dibuja como siempre.
   *
   * La casilla ocupa la primera columna del catalogo, que es la que el prototipo
   * dibuja vacia para esto mismo —no se anade una columna al lado: dos columnas
   * de seleccion, una viva y una muerta, no se distinguen—.
   */
  readonly seleccion?: {
    /**
     * Las **claves** de las filas elegidas, no sus indices.
     *
     * Un indice no identifica una fila: identifica un sitio. Volver atras con el
     * navegador restauraba la busqueda anterior y dejaba marcado «el 3», que en
     * la pagina de vuelta es otra cuota —y de otro contribuyente— sin que nada
     * lo dijera (#332). La clave la compone quien tiene la respuesta.
     */
    readonly elegidas: ReadonlySet<string>;
    /** La clave de la fila que ocupa esa posicion en la pagina que se ve. */
    readonly claveDe: (indice: number) => string;
    readonly onAlternar: (indice: number) => void;
    /** Como nombrar una fila: «cuota» / «cuotas». Del manual, no inventado. */
    readonly una: string;
    readonly varias: string;
    /** Para que el participio de la banda concuerde. Ver `SeleccionDeFilas.genero`. */
    readonly genero: 'femenino' | 'masculino';
  };
}

const ARIA_SENTIDO = { ASCENDENTE: 'ascending', DESCENDENTE: 'descending' } as const;

export function TablaDePantalla({
  estructura,
  opcion,
  datos,
  cargando,
  orden,
  sentido,
  onOrdenar,
  onPagina,
  hayFiltros = false,
  ancla,
  altaDeFila,
  seleccion,
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
  // El pie: el del catalogo, salvo que la prosa lo corrija. `undefined` en el
  // corrector es «esta opcion no declara nada», que es lo que devuelven 133 de
  // las 134; `null` es «suprimido», y no hay que confundirlo con lo anterior.
  const correccionDelPie = opcion === undefined ? undefined : pieDe(opcion);
  const pie = correccionDelPie === undefined ? estructura.note : (correccionDelPie ?? undefined);

  return (
    <section
      className="sgtm-tarjeta"
      // `tabIndex` negativo, no positivo (FRO-04 §7), igual que las secciones
      // del formulario: la tarjeta no entra en el recorrido del tabulador, pero
      // el indice puede llevarle el foco al saltar a ella.
      {...(ancla === undefined ? {} : { id: ancla, tabIndex: -1 })}
    >
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
      {seleccion !== undefined && !vacia && (
        <BandaDeSeleccion
          elegidas={seleccion.elegidas.size}
          una={seleccion.una}
          varias={seleccion.varias}
          genero={seleccion.genero}
        />
      )}
      {vacia ? (
        <Vacio hayFiltros={hayFiltros} que={estructura.title.toLowerCase()} />
      ) : (
        // **El marco se desplaza, asi que tiene que poder recibir el foco**
        // (FRO-04 §7, RNF-082). Es un contenedor con `overflow-x: auto` y una
        // tabla con `min-width` dentro: en 1366 px —la resolucion de la caja de
        // ventanilla— las siete columnas de la consulta de fichas no caben y la
        // ultima, «Conciliada», queda fuera. Con raton se arrastra; **sin raton
        // no habia forma de llegar a ella**, porque un `div` que desborda no
        // esta en el recorrido del tabulador y ningun control de dentro esta a
        // la derecha del corte que lo obligara a desplazarse.
        //
        // Los tres atributos van juntos y ninguno sobra: `tabIndex` mete el
        // marco en el tabulador, `role="region"` es lo que hace que un lector de
        // pantalla lo anuncie como algo en lo que se ha entrado en vez de como
        // un contenedor mudo, y sin `aria-label` una region no tiene nombre y no
        // se puede anunciar. El nombre es el titulo de la tabla del catalogo
        // —«Fichas encontradas»—, que es como la pantalla ya la llama.
        <div className="sgtm-tabla__marco" tabIndex={0} role="region" aria-label={estructura.title}>
          <table className="sgtm-tabla">
            <thead>
              <tr>
                {detalles !== undefined && (
                  <th className="sgtm-tabla__desplegar">
                    <span className="sgtm-portal__oculto">Desplegar</span>
                  </th>
                )}
                {estructura.cols.map((columna, i) => {
                  // La primera columna del catalogo es la de la casilla cuando
                  // la opcion declara seleccion: se rotula, para que la columna
                  // tenga cabecera y el lector de pantalla pueda anunciarla.
                  if (seleccion !== undefined && i === 0) {
                    return (
                      <th key={columna} className="sgtm-tabla__elegir">
                        <span className="sgtm-portal__oculto">Elegir</span>
                      </th>
                    );
                  }
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
                              className={
                                seleccion !== undefined && c === 0
                                  ? 'sgtm-tabla__elegir'
                                  : numericas.has(c)
                                    ? 'sgtm-tabla--numerica'
                                    : undefined
                              }
                            >
                              {seleccion !== undefined && c === 0 ? (
                                <Casilla
                                  elegida={seleccion.elegidas.has(seleccion.claveDe(f))}
                                  onAlternar={() => seleccion.onAlternar(f)}
                                  // La etiqueta accesible nombra **la fila**, no
                                  // «fila 3»: quien la oye tiene que saber que
                                  // esta marcando, y eso son sus dos primeras
                                  // columnas con dato.
                                  etiqueta={etiquetaDeFila(fila, seleccion.una)}
                                />
                              ) : celda.tono ? (
                                <Insignia tono={TONO_DE_INSIGNIA[celda.tono]}>
                                  {celda.texto}
                                </Insignia>
                              ) : numericas.has(c) ? (
                                // Separador de millares **al dibujar**, nunca al
                                // viajar (#342, nit 6): `celda.texto` sigue siendo
                                // lo que mando el backend, y lo unico que cambia
                                // es lo que ve quien lee la tabla. `agruparMiles`
                                // no antepone «S/» porque una columna `num` no
                                // siempre es dinero (ver su doc en `@sgtm/dominio`).
                                agruparMiles(celda.texto)
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
      {pie && <p className="sgtm-tarjeta__pie">{pie}</p>}
    </section>
  );
}

/**
 * La banda de la seleccion: **cuantas filas hay elegidas, y nada mas**.
 *
 * Lo que no dice es el importe, y es lo mas importante de este bloque: sumar las
 * columnas que tiene delante daria una cifra que el backend no puede sustentar
 * (RNF-083), y el total de una baja no es la suma de lo que se ve —el interes
 * corre hasta la fecha del acto—. Quien lo calcula es el servidor; mientras no
 * publique la previsualizacion, la banda lo dice en vez de ensenar un numero.
 *
 * **La region viva es el recuento, no la banda entera.** Con `role="status"` en
 * el parrafo, marcar una casilla hacia releer las veintidos palabras de la
 * explicacion —que no ha cambiado—, y quien navega con lector de pantalla
 * marcando seis cuotas se las oye seis veces. La explicacion se queda fuera: se
 * lee cuando se llega a ella.
 */
function BandaDeSeleccion({
  elegidas,
  una,
  varias,
  genero,
}: {
  readonly elegidas: number;
  readonly una: string;
  readonly varias: string;
  readonly genero: 'femenino' | 'masculino';
}) {
  const participio = genero === 'femenino' ? 'elegida' : 'elegido';
  return (
    <p className="sgtm-seleccion">
      <span role="status">
        <strong>
          {elegidas} {elegidas === 1 ? una : varias}{' '}
          {elegidas === 1 ? participio : `${participio}s`}
        </strong>
      </span>
      <span>
        {' '}
        · el total lo calcula el servidor, y la previsualización todavía no está disponible: aquí no
        se suma ninguna columna.
      </span>
    </p>
  );
}

/** La casilla de una fila, con su etiqueta accesible. */
function Casilla({
  elegida,
  onAlternar,
  etiqueta,
}: {
  readonly elegida: boolean;
  readonly onAlternar: () => void;
  readonly etiqueta: string;
}) {
  return (
    <label className="sgtm-tabla__casilla">
      <input type="checkbox" checked={elegida} onChange={onAlternar} />
      <span className="sgtm-portal__oculto">{etiqueta}</span>
    </label>
  );
}

/**
 * «Elegir la cuota 2016 · 1-4 · IMPUESTO PREDIAL»: lo que se marca, dicho con sus datos.
 *
 * **Se filtra tambien el guion**, y no es cosmetica: `SIN_DATO` es lo que la
 * interfaz dibuja donde el backend no mando dato, y en la tabla de la baja la
 * columna «Unidad» sale siempre asi. Contandolo como si fuera un dato, las tres
 * primeras celdas con contenido eran «2026 · — · 1 - 4» y **el tributo se
 * quedaba fuera** del nombre accesible: quien elige de oido no oia lo unico que
 * separa la cuota del predial de la de arbitrios, en un acto que no se deshace.
 */
function etiquetaDeFila(fila: readonly { readonly texto: string }[], una: string): string {
  const datos = fila
    .slice(1)
    .map((celda) => celda.texto)
    .filter((texto) => texto !== '' && texto !== SIN_DATO)
    .slice(0, 3);
  return `Elegir la ${una} ${datos.join(' · ')}`.trimEnd();
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
