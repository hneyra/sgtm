import { useId } from 'react';
import type { ReactNode } from 'react';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { IdDeOperacion } from '@sgtm/api-client';
import { useEscritura } from '../escritura';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { textoDeError } from '../estados';

/**
 * **El andamio que comparten todas las altas en panel lateral.**
 *
 * Salio de `catastro/altas.tsx` (#321) y se movio aqui al aparecer la segunda
 * familia que lo necesita —el alta de contribuyente de #503 F7—. No es una
 * generalizacion anticipada: las tres piezas ya estaban escritas y probadas, y
 * lo unico que cambia es de donde se importan.
 *
 * Lo que aporta, y lo que ninguna alta debe volver a escribir a mano:
 *
 *   `useAlta`             ata la operacion a su lista blanca de
 *                         `escrituras.ts`. Un campo que la declaracion no
 *                         tenga **no viaja y ni siquiera se puede escribir**
 *   `CampoDeAlta`         un control cuya escritura pasa por `useEscritura`,
 *                         bloqueado si su campo no esta declarado
 *   `FormularioDeAlta`    el cierre: la observacion (regla 10, RNF-052), el
 *                         error del servidor tal como lo redacto, el motivo por
 *                         el que no se puede guardar **antes** de las acciones,
 *                         y la primaria que no se habilita sin observacion
 */

/**
 * El alta, con su lista blanca y lo que ademas de la observacion hace falta.
 *
 * `exigir` recibe el borrador para que la condicion se lea donde se entiende
 * —«falta la denominación del sector»— en vez de dejar pulsar y contestar con un
 * 422 del servidor a algo que la pantalla ya sabia.
 */
export function useAlta(
  operacion: IdDeOperacion,
  parametros: Readonly<Record<string, string>>,
  exigir: (borrador: Readonly<Record<string, string>>) => string | undefined,
): Escritura {
  const declarada = escrituraDe(operacion);
  return useEscritura(operacion, parametros, { campos: declarada?.campos ?? {}, exigir });
}

export function CampoDeAlta({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  ph,
  opciones,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel';
  readonly ph?: string;
  readonly opciones?: readonly string[];
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      tipo={tipo}
      valor={escritura.borrador[campo] ?? ''}
      // Un campo que la opcion no declaro no se puede escribir: la lista blanca
      // se aplica aqui y otra vez al enviar, y las dos barreras protegen de
      // cosas distintas.
      bloqueado={!escritura.campos.has(campo)}
      // Todo `sel` de este formulario **escribe**, y un `sel` de escritura sin
      // valor no puede ensenar la primera opcion como si alguien la hubiera
      // elegido: el borrador seguiria vacio y el 422 hablaria de un campo que
      // la pantalla ensena lleno. En un filtro del catalogo es al reves —«Todos»
      // es su posicion de partida—, y por eso lo pide quien escribe.
      {...(tipo === 'sel' ? { eleccionObligatoria: true } : {})}
      {...(ph === undefined ? {} : { ph })}
      {...(opciones === undefined ? {} : { opciones })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

/**
 * El cierre que comparten las tres: la observacion, el error del servidor tal
 * como lo redacto, y la accion que no se habilita sin ella.
 */
export function FormularioDeAlta({
  escritura,
  accion,
  onCerrar,
  children,
}: {
  readonly escritura: Escritura;
  readonly accion: string;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}) {
  const idDelMotivo = useId();
  return (
    <>
      {children}

      <Campo
        etiqueta="Observación"
        tipo="area"
        ancho
        valor={escritura.observacion}
        ph="Por qué se da de alta. Queda en la auditoría junto a tu usuario."
        {...(escritura.errorPorCampo['observacion'] === undefined
          ? {}
          : { error: escritura.errorPorCampo['observacion'] })}
        onCambio={escritura.fijarObservacion}
      />

      {escritura.error !== undefined && escritura.error !== null && (
        <ErrorDelAlta error={escritura.error} />
      )}

      {escritura.enviada && (
        <p className="sgtm-escritura__hecho" role="status">
          Guardado, con tu observación en la auditoría.
        </p>
      )}

      {/* **Por que no se puede guardar, antes de las acciones y siempre.** Antes
          se pintaba debajo del boton y solo cuando lo que faltaba era un campo:
          el motivo mas frecuente —la observacion en blanco— vivia en un `title`
          sobre un boton `disabled`, y ahi no existe ni para el teclado, que no
          puede enfocarlo, ni para el lector de pantalla. */}
      {escritura.motivo !== undefined && (
        <p className="sgtm-lateral__falta" id={idDelMotivo} role="status">
          {escritura.motivo}
        </p>
      )}

      <div className="sgtm-lateral__acciones">
        <Boton onClick={onCerrar}>Cerrar</Boton>
        <Boton
          variante="primario"
          disabled={!escritura.puedeEnviar}
          {...(escritura.motivo === undefined ? {} : { 'aria-describedby': idDelMotivo })}
          onClick={() => escritura.enviar()}
        >
          {escritura.enviando ? `${accion}…` : accion}
        </Boton>
      </div>
    </>
  );
}

function ErrorDelAlta({ error }: { readonly error: unknown }) {
  const texto = textoDeError(error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}
