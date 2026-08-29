import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { esIrreversible } from '../escritura';
import type { Escritura } from '../escritura';
import { textoDeError } from '../estados';

/**
 * Barra de acciones fija al fondo (FRO-03 §5, bloque 10). **La ultima accion es
 * la primaria**, como en el prototipo.
 *
 * La accion primaria escribe **si la pantalla escribe algo**, y entonces trae su
 * campo de observacion pegado: toda modificacion de datos la exige (regla 10 de
 * CLAUDE.md, RNF-052), asi que sin texto la accion no se habilita. No es un
 * `placeholder` amable, es la condicion de guardado.
 *
 * Cuando la operacion de la pantalla es de lectura no hay nada que escribir
 * desde aqui, y los botones siguen deshabilitados: un boton que no sabe a que
 * endpoint llamar no se arregla habilitandolo.
 *
 * **Lo irreversible se confirma diciendo que va a pasar y sobre cuantos**, no
 * preguntando si se esta seguro: quien pulsa siempre esta seguro. La diferencia
 * importa donde mas duele —emitir una tanda de valores, pasarlos a coactiva—:
 * «¿estas seguro?» no da ninguna informacion nueva, y «vas a emitir sobre 47
 * valores» si (#75, FRO-04 §5).
 */
export interface BarraDeAccionesProps {
  readonly acciones: readonly string[];
  /** La escritura de esta pantalla, si escribe alguna. */
  readonly escritura?: Escritura;
  /**
   * Sobre cuantos registros va a actuar, tal como lo redacta el backend:
   * «47 valores». Es lo que convierte la confirmacion en informacion.
   */
  readonly alcance?: string;
  /**
   * El acto de la pantalla, cuando vive **en otra opcion**.
   *
   * Una ficha catastral es de lectura —`GET`—, y su acto es actualizarla, que es
   * otra pantalla con su propio permiso y su propia escritura. Sin esto, las
   * cinco acciones que dibuja el prototipo se quedan las cinco apagadas y el
   * camino de «estoy viendo esta ficha» a «voy a corregirla» no existe: hay que
   * volver al menu y buscar el predio otra vez.
   *
   * Cuando lo hay, **ninguna accion del catalogo se dibuja como primaria**: la
   * primaria es este enlace. Las del prototipo que aun no tienen acto —«Nuevo»,
   * «Deshacer»— se quedan como estaban, apagadas y visibles.
   */
  readonly enlace?: { readonly etiqueta: string; readonly ruta: string };
  /**
   * Las acciones del catalogo que **abren un alta**, por su rotulo.
   *
   * No es un boton mas: es el que el prototipo ya dibuja y hasta ahora estaba
   * muerto —«Nuevo sector» en el catalogo territorial—. Anadir otro al lado
   * dejaria dos con el mismo texto, uno vivo y uno apagado, y quien atiende no
   * tendria como distinguirlos.
   *
   * Se pasa **solo si quien mira puede registrar**: sin ese privilegio la accion
   * se queda como estaba, dibujada y apagada, y no aparece un formulario que el
   * servidor va a rechazar con 403.
   */
  readonly altas?: Readonly<Record<string, () => void>>;
  /**
   * La accion que **enseña el resultado sin escribir nada** (#393): su rotulo y
   * lo que hace al pulsarla.
   *
   * Se dibuja como secundaria y encendida, que es lo que es: no guarda nada, asi
   * que no compite con la primaria ni necesita observacion. Cuando la opcion no
   * declara ninguna —129 de las 134— aqui no llega nada y la barra se dibuja
   * exactamente como se dibujaba.
   */
  readonly simulacion?: {
    readonly accion: string;
    readonly simulando: boolean;
    readonly onSimular: () => void;
  };
  /**
   * Por que la accion primaria **no puede guardar todavia** (#332): la operacion
   * no escribe, o la opcion no ha declarado sus campos (`pantallas/actos.ts`).
   *
   * Cuando lo hay no hay escritura ninguna —ni caja de observacion—, porque no
   * hay a donde escribir; lo que hay es esta franja diciendolo. Sin ella, la
   * primaria se quedaba apagada y muda, que en ventanilla se lee como un error
   * de quien atiende y acaba en una llamada a soporte.
   *
   * Llegan las dos mitades: `detalle` es lo que lee quien atiende, y `causa` lo
   * que necesita quien mantiene. La segunda no se pinta —viaja en `data-causa`—.
   */
  readonly impedimento?: { readonly detalle: string; readonly causa: string };
  /**
   * Cuantas filas hay elegidas, cuando la pantalla elige las suyas: la primaria
   * lo dice —«Dar de baja (2)»—, porque el acto es sobre lo elegido y no sobre
   * lo que se ve. No renombra la accion (RNF-080): le anade su cuenta.
   */
  readonly contadorDeLaPrimaria?: number;
  /**
   * **Ninguna accion del catalogo es la primaria de esta pantalla** (#391 §2).
   *
   * La regla de FRO-03 §5 —«la ultima es la primaria»— da por supuesto que hay
   * una que escribe. Cuando no la hay, convierte en boton navy lo ultimo que
   * quede: en «Ficha catastral rural», «Imprimir ficha rural». Quien atiende
   * aprende que el navy es el acto de la pantalla, y en cuatro fichas de
   * consulta el navy imprimia.
   *
   * Con esto puesto, todas las acciones se dibujan secundarias y apagadas.
   * **No apaga el alta ni el enlace**: los dos siguen siendo el acto de la
   * pantalla cuando no hay otro —y los dos llevan a un sitio donde si se
   * escribe—, asi que «Nuevo» de la ficha urbana sigue siendo su primaria
   * mientras no haya un predio abierto.
   *
   * Lo decide `accionesDeLaBarra` (`pantallas/actos.ts`) y lo pasa quien compone
   * la barra; las 129 opciones que no declaran el vocabulario uniforme no lo
   * reciben nunca y se dibujan exactamente como se dibujaban.
   */
  readonly sinPrimaria?: true;
}

/** El `id` de la franja, para que la primaria la referencie con `aria-describedby`. */
const MOTIVO = 'sgtm-motivo-de-la-accion';

/**
 * El `id` del bloque de acciones, para que el indice de secciones tenga a donde
 * mandar «Ir a las acciones» (#332).
 *
 * Se exporta porque quien enlaza es otro bloque, y dos literales iguales en dos
 * archivos son un ancla que un dia lleva a ningun sitio.
 */
export const ID_DE_LAS_ACCIONES = 'sgtm-acciones-de-la-pantalla';

export function BarraDeAcciones({
  acciones,
  escritura,
  alcance,
  enlace,
  altas,
  impedimento,
  contadorDeLaPrimaria,
  simulacion,
  sinPrimaria,
}: BarraDeAccionesProps) {
  const [porConfirmar, fijarPorConfirmar] = useState<string | null>(null);
  const escribe = escritura?.operacion !== undefined;
  /* Los tres estados de una accion, y solo uno se pinta a la vez:
     puede guardar (sin motivo) · puede guardar y le falta algo del formulario
     (`escritura.motivo`) · no puede guardar todavia (`impedimento`).
     Con `enlace` no se pinta ninguno: la primaria es el enlace, y esa lleva a
     otra pantalla en vez de guardar aqui. */
  const motivo = enlace !== undefined ? undefined : (impedimento?.detalle ?? escritura?.motivo);
  const causa = enlace !== undefined ? undefined : impedimento?.causa;
  // Si el acto de la pantalla es abrir un alta, la ultima accion deja de ser la
  // primaria: si no, quedarian dos botones primarios y uno de ellos apagado.
  const altaEsElActo =
    enlace === undefined && !escribe && acciones.some((accion) => altas?.[accion] !== undefined);

  return (
    <>
      {escribe && escritura && (
        <section className="sgtm-tarjeta sgtm-escritura" aria-label="Observación del usuario">
          <Campo
            etiqueta="Observación"
            tipo="area"
            ancho
            valor={escritura.observacion}
            ph="Por qué se hace este cambio. Queda en la auditoría junto a tu usuario."
            {...(escritura.errorPorCampo['observacion'] === undefined
              ? {}
              : { error: escritura.errorPorCampo['observacion'] })}
            onCambio={(texto) => {
              escritura.fijarObservacion(texto);
              fijarPorConfirmar(null);
            }}
          />
          {escritura.error !== undefined && escritura.error !== null && (
            <ErrorDeEscritura escritura={escritura} />
          )}
          {escritura.enviada && (
            <p className="sgtm-escritura__hecho" role="status">
              Guardado, con tu observación en la auditoría.
            </p>
          )}
          {porConfirmar !== null && (
            <Aviso
              tipo="error"
              titulo={
                alcance === undefined
                  ? `Vas a ${porConfirmar.toLowerCase()}, y eso no se deshace`
                  : `Vas a ${porConfirmar.toLowerCase()} sobre ${alcance}, y eso no se deshace`
              }
              detalle="En el SGTM no se borra: queda asentado con tu usuario y tu observación, y corregirlo exige otro acto. Confirma si es lo que quieres hacer."
            >
              <Boton onClick={() => fijarPorConfirmar(null)}>Cancelar</Boton>
              <Boton
                variante="primario"
                onClick={() => {
                  fijarPorConfirmar(null);
                  // **Con el rotulo del boton que se pulso**: el cuerpo que sale
                  // es el de esa accion, no el de la primera declarada (#423).
                  escritura.enviar(porConfirmar);
                }}
              >
                Confirmar {porConfirmar.toLowerCase()}
              </Boton>
            </Aviso>
          )}
        </section>
      )}

      {/* ── La franja y la barra, **en el mismo bloque fijo** ──────────────
          Estaban sueltas y solo la barra era `sticky`. En una pantalla larga
          —el padron de contribuyentes apilado mide 4 800 px— eso deja al
          operador viendo «Guardar» apagado al pie, con la explicacion a cuatro
          mil pixeles de scroll: apagado y mudo, que es exactamente el estado
          que la franja vino a eliminar. Van juntos o la franja no sirve. */}
      <div className="sgtm-acciones__fija" data-no-imprimible="1">
        {/* El motivo se **pinta**, no se pone en un `title`: un `title` sobre un
            boton `disabled` no existe ni para el teclado —no se puede enfocar—
            ni para el lector de pantalla (FRO-04 §6).

            **Se dibuja siempre, vacio si no hay motivo.** Una region viva que
            aparece con su texto dentro no anuncia nada: los lectores de
            pantalla anuncian los cambios de una region que ya estaban
            observando, y la que se monta con contenido no llega a tiempo. Vacia
            no ocupa ni se ve (`:empty` en la hoja), y cuando el motivo aparece
            es un cambio, que es lo que si se lee. */}
        <p
          className="sgtm-acciones__motivo"
          role="status"
          id={MOTIVO}
          {...(causa === undefined ? {} : { 'data-causa': causa })}
        >
          {motivo ?? ''}
        </p>

        <div className="sgtm-acciones" id={ID_DE_LAS_ACCIONES}>
          {acciones.map((accion, i) => {
            // Una accion que abre un alta **es** el acto de esta pantalla cuando
            // no hay otro: si la pantalla no escribe (es de lectura) y no lleva a
            // otra opcion, la primaria es esta. Con enlace o con escritura propia
            // se queda de secundaria: dos primarias dirian que hay dos actos.
            /* La accion que simula: viva, secundaria y sin observacion. Va
               antes que el alta y que la primaria porque es la unica de las
               tres que **no cambia nada**, y quien atiende tiene que poder
               pulsarla sin pensarselo. */
            if (simulacion !== undefined && accion === simulacion.accion) {
              return (
                <Boton
                  key={accion}
                  variante="secundario"
                  /* `aria-disabled` y no `disabled` mientras calcula, por lo
                     mismo que la primaria apagada: un boton `disabled` **pierde
                     el foco**, y en ventanilla se atiende con el teclado
                     (RNF-082) — el foco saltaria al cuerpo del documento en
                     mitad de la peticion y habria que volver a recorrer la
                     barra. Enfocable y sordo al clic es lo que hace falta. */
                  aria-disabled={simulacion.simulando}
                  onClick={() => {
                    if (!simulacion.simulando) simulacion.onSimular();
                  }}
                >
                  {simulacion.simulando ? `${accion}…` : accion}
                </Boton>
              );
            }
            const abrirAlta = altas?.[accion];
            if (abrirAlta !== undefined) {
              return (
                <Boton
                  key={accion}
                  variante={altaEsElActo ? 'primario' : 'secundario'}
                  onClick={abrirAlta}
                >
                  {accion}
                </Boton>
              );
            }
            // «La ultima es la primaria» (FRO-03 §5), salvo cuando el acto de la
            // pantalla es el enlace: dos botones primarios en la misma barra
            // dirian que hay dos actos, y uno de los dos esta apagado. Y salvo
            // cuando **ninguna escribe** (`sinPrimaria`, #391 §2): ahi la regla
            // pintaria de navy lo ultimo que quedara, que en cuatro fichas de
            // consulta es un «Imprimir».
            const esPrimaria =
              sinPrimaria !== true &&
              !altaEsElActo &&
              enlace === undefined &&
              i === acciones.length - 1;
            /* **Que boton escribe.** Sin discriminador, la primaria y solo ella,
               que es como lleva funcionando desde siempre. Con discriminador
               (#423), **las que la opcion declara**: en «Anulación de convenio»
               son «Anular» y «Quebrar», dos actos distintos sobre el mismo
               convenio que llegan por la misma ruta con otro `accion`. Siguen
               siendo secundarias salvo la ultima —una primaria por pantalla,
               FRO-03 §5—, pero se pueden pulsar y mandan su cuerpo. */
            const declaraCual = (escritura?.acciones.size ?? 0) > 0;
            const actua =
              escribe && (declaraCual ? escritura?.acciones.has(accion) === true : esPrimaria);
            const habilitada = actua && (escritura?.puedeEnviar ?? false);
            /* La primaria apagada **con un motivo escrito al lado** se apaga con
               `aria-disabled`, no con `disabled`, y sigue siendo enfocable.
               Motivo: un boton `disabled` no recibe foco, asi que el
               `aria-describedby` que apunta a la franja no se lee nunca —quien
               navega con teclado o con lector pasa de largo y no se entera de por
               que no puede guardar—. Con `aria-disabled` el lector anuncia
               «no disponible» **y** lee la descripcion. El `onClick` guarda la
               otra mitad: enfocable no es pulsable. Las apagadas sin motivo
               —una secundaria del prototipo, la primaria mientras envia— siguen
               con `disabled`: ahi no hay nada que leer. */
            const apagadaConMotivo = (esPrimaria || actua) && motivo !== undefined;
            return (
              <Boton
                key={accion}
                variante={esPrimaria ? 'primario' : 'secundario'}
                {...(apagadaConMotivo
                  ? { 'aria-disabled': true, 'aria-describedby': MOTIVO }
                  : { disabled: !habilitada })}
                {...tituloDe(accion, actua, escribe, escritura)}
                onClick={() => {
                  if (apagadaConMotivo) return;
                  if (!escritura || !actua) return;
                  // Lo irreversible se confirma diciendo que va a pasar; lo demas
                  // se manda directamente, que para eso se pulso.
                  if (esIrreversible(accion)) fijarPorConfirmar(accion);
                  else escritura.enviar(accion);
                }}
              >
                {escritura?.enviando && actua
                  ? `${accion}…`
                  : esPrimaria && contadorDeLaPrimaria !== undefined
                    ? `${accion} (${contadorDeLaPrimaria})`
                    : accion}
              </Boton>
            );
          })}
          {enlace !== undefined && (
            <Link className="sgtm-boton sgtm-boton--primario" to={enlace.ruta}>
              {enlace.etiqueta}
            </Link>
          )}
        </div>
      </div>
    </>
  );

  /**
   * El `title` de un boton, **cuando decir algo ahi es cierto y sirve**.
   *
   * Devuelve las props y no la cadena para poder no ponerlo: `title={undefined}`
   * y no poner `title` se dibujan igual, pero lo segundo se lee en el codigo
   * como lo que es.
   *
   * **Con impedimento no lleva ninguno** (revision de #331). El texto de
   * RNF-052 —«la operación se conecta junto con su campo de observación»— era
   * cierto cuando la unica causa posible era esa, y dejo de serlo cuando la
   * franja aprendio a decir tres cosas distintas (`actos.ts`): en una pantalla
   * `sin-determinacion` afirmaba que falta la observacion, y lo que falta es la
   * capa web del calculo. Y **ademas no llega a nadie**: esos secundarios se
   * dibujan `disabled`, y un `title` sobre un boton deshabilitado no existe ni
   * para el teclado —no se puede enfocar— ni para el lector de pantalla
   * (FRO-04 §6). Lo que hay que leer ya esta pintado en la franja de arriba.
   */
  function tituloDe(
    accion: string,
    actua: boolean,
    escribe: boolean,
    escritura?: Escritura,
  ): { readonly title?: string } {
    if (impedimento !== undefined) return {};
    if (!actua || !escribe) {
      return { title: 'La operación se conecta junto con su campo de observación (RNF-052)' };
    }
    if (escritura?.puedeEnviar === false && escritura.observacion.trim() === '') {
      return { title: `Escribe la observación para poder ${accion.toLowerCase()}` };
    }
    return {};
  }
}

/** El error de una escritura: el texto del backend, y su traza si la trae. */
function ErrorDeEscritura({ escritura }: { readonly escritura: Escritura }) {
  const texto = textoDeError(escritura.error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}
