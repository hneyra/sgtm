import { useId } from 'react';
import type { ReactNode } from 'react';
import { Esqueleto, Insignia } from '@sgtm/design-system';
import { formatearFecha } from '@sgtm/dominio';
import type { Fecha, Tono } from '@sgtm/dominio';
import { SIN_DATO } from '../seguridad/listado';

/**
 * **La cabecera-resumen de un registro abierto**, sin dominio dentro (#391 §4).
 *
 * Es la primera ranura de la anatomia que `Pantalla` impone (FRO-03 §5): quien
 * abre algo necesita antes que nada saber **cual es y de cuando**. El lenguaje
 * visual es uno solo —identificador en monoespaciada, insignias de estado con su
 * texto, y debajo la rejilla de datos— y aqui vive entero, sin saber si el
 * registro es una ficha catastral, un sector del territorio o el cuadro de
 * valuacion de un ejercicio.
 *
 * **Sale de `ResumenDeFicha`, que era de catastro y no tenia por que serlo.**
 * Es el mismo movimiento que {@link PanelDeAlta}, extraido de `Pantalla` cuando
 * el territorio lo necesito: la copia es la que un dia deja de ser igual. Que lo
 * usen tres superficies distintas —las fichas, el territorio y el cuadro— es lo
 * que demuestra que sirve para mas de una pantalla; que ninguna de las tres
 * tenga que redibujar el filete, la monoespaciada ni la rejilla es lo que se
 * gana.
 *
 * <h2>Que no hace, y por que</h2>
 *
 * **No pide nada.** Recibe lo que la superficie ya trajo. Una cabecera que
 * necesitara otra peticion seria otra peticion por registro abierto, y no hay
 * nada en una cabecera que lo justifique.
 *
 * **No compone ninguna cifra** (RNF-083): no suma, no promedia y no deduce. Lo
 * que la respuesta no publica sale «—», y el hueco dice a quien le toca.
 *
 * **Ninguna cifra sin su fecha** (regla 9, RNF-075). Un dato que se declara
 * `cifra` lleva obligatoriamente su `aLaFecha` —el tipo no deja escribirlo de
 * otra forma— y se dibuja con ella al lado. Y hay una segunda mitad, que es la
 * que un tipo no puede sostener: si la fecha llega en blanco, **la cifra no se
 * ensena**. Sale «—», porque una cifra sin fecha no es una cifra a medias: es
 * una afirmacion que nadie puede fechar, y en un padron eso acaba en el sustento
 * de una determinacion.
 */

/** Una insignia de la linea de identidad. **Siempre con texto** (FRO-02 §2.1). */
export interface InsigniaDeCabecera {
  readonly texto: string;
  readonly tono: Tono;
}

/**
 * Un dato de la rejilla.
 *
 * `cifra: true` obliga a declarar su fecha: es la regla 9 escrita como tipo, de
 * modo que la unica forma de ensenar un numero sin fecha sea **no declararlo
 * numero**, que es un cambio visible en el diff y no un olvido.
 */
export type DatoDeCabecera =
  | { readonly etiqueta: string; readonly valor: string; readonly cifra?: false }
  | {
      readonly etiqueta: string;
      readonly valor: string;
      readonly cifra: true;
      readonly aLaFecha: Fecha;
    };

export interface CabeceraDeRegistroProps {
  /** El nombre accesible de la region. Lo que se busca al acotar en una prueba. */
  readonly rotulo: string;
  /** Como se identifica el registro abierto. Va en monoespaciada. */
  readonly identificador?: string;
  readonly insignias?: readonly InsigniaDeCabecera[];
  /** Lo que acompana a las insignias: version, vigencia, hoja… */
  readonly apostilla?: ReactNode;
  readonly datos?: readonly DatoDeCabecera[];
  readonly cargando?: boolean;
  /**
   * Que decir **cuando no hay registro abierto**, si la superficie quiere
   * conservar la ranura.
   *
   * Sin esto, la cabecera de una superficie donde todavia no se ha elegido nada
   * desapareceria, y con ella la indicacion de que hay algo que elegir —que es
   * justo lo que el territorio dice al arrancar—. Las fichas no lo declaran:
   * ahi el registro esta en la ruta, y sin ruta no hay ficha que resumir.
   */
  readonly vacio?: string;
  /**
   * Si hay algo tecleado y sin enviar, para decirlo donde no se pierda de vista
   * (#498 F3).
   *
   * **Responde a un dolor declarado del rediseno: «no se si guarde».** Una ficha
   * son entre una y once pestanas; quien corrige un campo en la ultima y sube a
   * mirar otra cosa no tenia como saber si lo suyo seguia sin mandar. La
   * cabecera es `sticky`, asi que la respuesta esta siempre en pantalla.
   *
   * Es un **derivado del borrador de `useEscritura`**, no un estado nuevo: si no
   * lo fuera, habria dos verdades sobre lo mismo y la que se lee seria la que
   * nadie recalculo. Una superficie que no escribe no lo declara, y entonces la
   * cabecera no dice nada de guardar —que es lo correcto: el territorio y el
   * cuadro de valuacion no tienen borrador que perder—.
   */
  readonly sinGuardar?: boolean;
  /** Lo que la cabecera **todavia** no puede decir: guiones con su motivo. */
  readonly children?: ReactNode;
}

export function CabeceraDeRegistro({
  rotulo,
  identificador,
  insignias = [],
  sinGuardar,
  apostilla,
  datos = [],
  cargando = false,
  vacio,
  children,
}: CabeceraDeRegistroProps) {
  // El `useId` va antes de cualquier retorno: un hook no se llama a veces.
  const id = useId();

  if (cargando) return <Esqueleto alto={72} />;

  return (
    <section className="sgtm-resumen" aria-label={rotulo}>
      {vacio === undefined ? (
        <>
          <div className="sgtm-resumen__identidad">
            <p className="sgtm-resumen__codigo">
              {identificador === undefined || identificador === '' ? SIN_DATO : identificador}
            </p>
            {(insignias.length > 0 || apostilla !== undefined) && (
              <p className="sgtm-resumen__vigencia">
                {insignias.map((insignia) => (
                  <Insignia key={insignia.texto} tono={insignia.tono}>
                    {insignia.texto}
                  </Insignia>
                ))}
                {apostilla !== undefined && <span>{apostilla}</span>}
              </p>
            )}

            {/* El estado de guardado, al final de la linea de identidad (#498
                F3). **Con texto y no solo con color** (FRO-02 §2.1): el punto
                acompana, no informa. Y es una region viva —`role="status"`—
                porque cambia sin que el foco se mueva: quien teclea en el
                ultimo campo de la ultima pestana no esta mirando aqui arriba. */}
            {sinGuardar !== undefined && (
              <p
                className="sgtm-resumen__guardado"
                data-sin-guardar={sinGuardar ? '1' : '0'}
                role="status"
              >
                <span className="sgtm-resumen__punto" aria-hidden="true" />
                {sinGuardar ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
              </p>
            )}
          </div>

          {datos.length > 0 && (
            <dl className="sgtm-resumen__datos">
              {datos.map((dato, indice) => (
                <Dato key={dato.etiqueta} dato={dato} id={`${id}-${indice}`} />
              ))}
            </dl>
          )}
        </>
      ) : (
        <p className="sgtm-resumen__pendiente">{vacio}</p>
      )}

      {children}
    </section>
  );
}

/**
 * Un termino y su valor.
 *
 * **El valor se anuncia con su etiqueta** (`aria-labelledby`): en una rejilla de
 * definiciones, un lector de pantalla que salte al valor lee «CERCADO» sin decir
 * de que. Es ademas lo que permite pedirlo por su rotulo desde una prueba, igual
 * que se pedia cuando esto eran campos de solo lectura.
 */
function Dato({ dato, id }: { readonly dato: DatoDeCabecera; readonly id: string }) {
  // Regla 9, la mitad que el tipo no puede sostener: una cifra cuya fecha llega
  // en blanco no se ensena. Ver el docblock del componente.
  const fechada = dato.cifra === true && dato.aLaFecha.trim() !== '';
  const valor = dato.cifra === true && !fechada ? SIN_DATO : dato.valor;
  const hueco = valor === '' || valor === SIN_DATO;

  return (
    <div className="sgtm-resumen__dato">
      <dt id={id}>{dato.etiqueta}</dt>
      <dd aria-labelledby={id}>
        {hueco ? SIN_DATO : valor}
        {/* Un hueco no es una cifra: «— al 29/08/2026» fecharia lo que no hay. */}
        {!hueco && dato.cifra === true && fechada && (
          <span className="sgtm-resumen__alafecha"> al {formatearFecha(dato.aLaFecha)}</span>
        )}
      </dd>
    </div>
  );
}
