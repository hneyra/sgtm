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
}

export function BarraDeAcciones({ acciones, escritura, alcance, enlace }: BarraDeAccionesProps) {
  const [porConfirmar, fijarPorConfirmar] = useState<string | null>(null);
  const escribe = escritura?.operacion !== undefined;

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

      <div className="sgtm-acciones" data-no-imprimible="1">
        {acciones.map((accion, i) => {
          // «La ultima es la primaria» (FRO-03 §5), salvo cuando el acto de la
          // pantalla es el enlace: dos botones primarios en la misma barra
          // dirian que hay dos actos, y uno de los dos esta apagado.
          const esPrimaria = enlace === undefined && i === acciones.length - 1;
          const habilitada = esPrimaria && escribe && (escritura?.puedeEnviar ?? false);
          return (
            <Boton
              key={accion}
              variante={esPrimaria ? 'primario' : 'secundario'}
              disabled={!habilitada}
              title={tituloDe(accion, esPrimaria, escribe, escritura)}
              onClick={() => {
                if (!escritura) return;
                // Lo irreversible se confirma diciendo que va a pasar; lo demas
                // se manda directamente, que para eso se pulso.
                if (esIrreversible(accion)) fijarPorConfirmar(accion);
                else escritura.enviar();
              }}
            >
              {escritura?.enviando && esPrimaria ? `${accion}…` : accion}
            </Boton>
          );
        })}
        {enlace !== undefined && (
          <Link className="sgtm-boton sgtm-boton--primario" to={enlace.ruta}>
            {enlace.etiqueta}
          </Link>
        )}
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
