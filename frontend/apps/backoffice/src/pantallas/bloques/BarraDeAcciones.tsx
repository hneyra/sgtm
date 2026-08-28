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
                  escritura.enviar();
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
            // dirian que hay dos actos, y uno de los dos esta apagado.
            const esPrimaria = !altaEsElActo && enlace === undefined && i === acciones.length - 1;
            const habilitada = esPrimaria && escribe && (escritura?.puedeEnviar ?? false);
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
            const apagadaConMotivo = esPrimaria && motivo !== undefined;
            return (
              <Boton
                key={accion}
                variante={esPrimaria ? 'primario' : 'secundario'}
                {...(apagadaConMotivo
                  ? { 'aria-disabled': true, 'aria-describedby': MOTIVO }
                  : { disabled: !habilitada })}
                title={tituloDe(accion, esPrimaria, escribe, escritura)}
                onClick={() => {
                  if (apagadaConMotivo) return;
                  if (!escritura) return;
                  // Lo irreversible se confirma diciendo que va a pasar; lo demas
                  // se manda directamente, que para eso se pulso.
                  if (esIrreversible(accion)) fijarPorConfirmar(accion);
                  else escritura.enviar();
                }}
              >
                {escritura?.enviando && esPrimaria
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

  function tituloDe(
    accion: string,
    esPrimaria: boolean,
    escribe: boolean,
    escritura?: Escritura,
  ): string | undefined {
    if (!esPrimaria || !escribe) {
      return 'La operación se conecta junto con su campo de observación (RNF-052)';
    }
    if (escritura?.puedeEnviar === false && escritura.observacion.trim() === '') {
      return `Escribe la observación para poder ${accion.toLowerCase()}`;
    }
    return undefined;
  }
}

/** El error de una escritura: el texto del backend, y su traza si la trae. */
function ErrorDeEscritura({ escritura }: { readonly escritura: Escritura }) {
  const texto = textoDeError(escritura.error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}
