import { useState } from 'react';
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
 */
export interface BarraDeAccionesProps {
  readonly acciones: readonly string[];
  /** La escritura de esta pantalla, si escribe alguna. */
  readonly escritura?: Escritura;
}

export function BarraDeAcciones({ acciones, escritura }: BarraDeAccionesProps) {
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
              titulo={`Vas a ${porConfirmar.toLowerCase()}, y eso no se deshace`}
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
          const esPrimaria = i === acciones.length - 1;
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
