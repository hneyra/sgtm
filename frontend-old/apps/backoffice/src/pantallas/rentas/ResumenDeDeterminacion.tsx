import { Esqueleto, FechaDeCalculo, Insignia } from '@sgtm/design-system';
import type { ResumenDePantallaProps } from '../composicion';

/**
 * La banda de sujeto de las cinco pantallas de determinacion (#393).
 *
 * Es el paso 1 del marco —sujeto arriba, memoria del calculo en medio, acto
 * abajo—, y responde a la unica pregunta que hay que tener contestada antes de
 * mirar una cifra: **sobre quien se determina, y con que**.
 *
 *   el sujeto     de quien es la determinacion. Sale del filtro que la pantalla
 *                 ya tiene contestado —en el predial individual, el codigo del
 *                 contribuyente—. La base del predial es **del contribuyente**,
 *                 no de cada predio (`RT-011`), asi que tenerlo a la vista
 *                 mientras se lee la escala no es decoracion
 *   el ejercicio  de que ano se determina. Es el otro filtro que decide la cifra
 *   la fecha      a cuando estan actualizadas las cifras (regla 9, RNF-075)
 *
 *   el conjunto   el conjunto de parametros **sellado** con que se calculo: la
 *                 UIT, los tramos y las alicuotas de un ejercicio viven en un
 *                 conjunto que no se edita nunca —se crea otro—, y dos conjuntos
 *                 del mismo ejercicio dan dos importes distintos y los dos
 *                 correctos (`ARQ-09` §3). Sin el, una cifra no se puede
 *                 recalcular dentro de diez anos
 *
 * **Y mientras no hay determinacion, lo dice.** Las cuatro pantallas cuya
 * operacion es un `POST` no piden nada al abrir —abrir una pantalla no puede
 * lanzar una determinacion—, asi que hasta que alguien pulsa la accion que
 * simula (#393) no hay conjunto que ensenar, y la banda lo cuenta en vez de
 * callarlo: es la mitad que hace reproducible una cifra.
 *
 * **No pide nada y no compone ninguna cifra**: lo que ensena es lo que se
 * pregunto en el bloque de busqueda, mas lo que trajo la respuesta.
 *
 * **Y sin sujeto no se dibuja.** Cuatro de las cinco pantallas tienen un `POST`
 * por operacion y no piden nada al abrir —abrir una pantalla no puede lanzar una
 * determinacion (`useDatosDePantalla`)—, asi que recien abiertas no tienen ni
 * sujeto ni respuesta: una banda ahi seria un recuadro con cuatro guiones. En
 * cuanto se teclea a quien se atiende, aparece.
 */

/**
 * De donde sale el sujeto de cada una, y como se llama en su pantalla.
 *
 * Se declara opcion por opcion porque **cada una pregunta por lo suyo**: el
 * predial por un contribuyente, los arbitrios por un predio, el vehicular por
 * una placa. Deducirlo —«el primer filtro», «el que acabe en `codigo`»— seria
 * adivinar, y el dia que el catalogo mueva un filtro la banda encabezaria la
 * determinacion con el dato equivocado sin que nada lo dijera.
 *
 * `predial_masivo` no esta: su sujeto no es un registro sino el padron entero, y
 * su pantalla no tiene bloque de busqueda. Cuando su corrida devuelva algo, el
 * `sujeto` de la respuesta lo dira; hasta entonces la banda no se dibuja, que es
 * lo correcto.
 */
const SUJETO: Readonly<Record<string, { readonly filtro: string; readonly etiqueta: string }>> = {
  predial_individual: { filtro: 'codContribuyente', etiqueta: 'Contribuyente' },
  arbitrios: { filtro: 'codigoPredial', etiqueta: 'Predio' },
  vehicular_calculo: { filtro: 'placa', etiqueta: 'Placa' },
  alcabala: { filtro: 'nDeExpediente', etiqueta: 'Expediente' },
};

/** El filtro del ejercicio, que en el catalogo se llama de dos maneras. */
const EJERCICIO: readonly string[] = ['ano', 'ejercicio'];

const leer = (busqueda: URLSearchParams | undefined, clave: string): string =>
  (busqueda?.get(clave) ?? '').trim();

export function ResumenDeDeterminacion({
  datos,
  cargando,
  opcion,
  busqueda,
}: ResumenDePantallaProps) {
  const determinacion = datos?.determinacion;
  const declarado =
    opcion !== undefined && Object.hasOwn(SUJETO, opcion) ? SUJETO[opcion] : undefined;
  // El texto del servidor manda sobre el codigo tecleado: «SUC. RUFINA MEDINA
  // MEDINA» dice lo mismo mejor, y es el sujeto sobre el que **se determino**.
  const sujeto =
    determinacion?.sujeto ?? (declarado === undefined ? '' : leer(busqueda, declarado.filtro));
  const ejercicio = EJERCICIO.map((clave) => leer(busqueda, clave)).find((valor) => valor !== '');

  if (cargando && sujeto !== '') return <Esqueleto alto={92} />;
  if (sujeto === '') return null;

  return (
    <section className="sgtm-resumen" aria-label="Sujeto y parámetros de la determinación">
      <div className="sgtm-resumen__identidad">
        <p className="sgtm-resumen__codigo">{sujeto}</p>
        <p className="sgtm-resumen__vigencia">
          <span>
            {declarado?.etiqueta ?? 'Determinación'}
            {ejercicio === undefined ? '' : ` · ejercicio ${ejercicio}`}
          </span>
          {/* «Sellado» con su texto dentro, nunca solo por color: es la
              diferencia entre una cifra que se puede recalcular y una que no. */}
          {determinacion !== undefined && (
            <Insignia tono="ok">Parámetros {determinacion.conjunto} · sellado</Insignia>
          )}
          <FechaDeCalculo
            {...(datos?.fechaCalculo === undefined ? {} : { fecha: datos.fechaCalculo })}
          />
        </p>
      </div>
      {determinacion === undefined && (
        /* Lo que **todavia** no se puede decir, dicho donde se buscaria: con que
           parametros se calculo. No es un adorno pendiente —es la mitad de lo que
           hace reproducible una cifra— y callarlo dejaria la banda afirmando mas
           de lo que sabe. */
        <p className="sgtm-resumen__nota">
          Todavía no hay determinación: los importes salen con «—» hasta que se pida el cálculo, y
          entonces esta banda dice con qué conjunto de parámetros se hizo.
        </p>
      )}
    </section>
  );
}
