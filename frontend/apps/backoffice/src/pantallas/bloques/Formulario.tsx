import { Suspense } from 'react';
import { Campo, Esqueleto } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { SeccionDePantalla } from '../../catalogo';
import { arrancaCerrada } from '../../catalogo';
import { resolutorDeCampo } from '../composicion';
import { Icono } from '@sgtm/design-system';

/**
 * Formulario por secciones colapsables (FRO-03 §5, bloque 8).
 *
 * Las secciones marcadas `Opcional`, `Solo lectura` o `Colapsado` arrancan
 * cerradas. El colapso se guarda por clave `seccion|pestana` para que cambiar
 * de pestana no arrastre el estado de la anterior.
 *
 * **Que campos se pueden escribir no lo decide el catalogo: lo decide la
 * escritura de la opcion** (`pantallas/escrituras.ts`). Un campo que la opcion
 * no declara se dibuja bloqueado, y lo tecleado en el no se guarda en ningun
 * sitio. Es lo que hace que la pantalla de contrasena no pueda retener una
 * clave: no es que se borre despues, es que nunca entra.
 *
 * **Y un campo puede traer control propio**, igual que ya podia traerlo uno de
 * busqueda (#331): si la opcion declara un `resolutor` para su clave, se dibuja
 * ese en vez del `Campo`. No bifurca nada —el resto de la seccion se dibuja
 * igual— y es negacion por omision: 133 de las 134 pantallas no declaran
 * ninguno y no se enteran.
 */
export interface FormularioProps {
  /**
   * La opcion a la que pertenece este formulario.
   *
   * Sirve para **una** cosa, la misma que en `Filtros`: preguntar si declara un
   * control propio para alguno de sus campos (`composicion.ts`).
   */
  readonly opcion: string;
  readonly secciones: readonly SeccionDePantalla[];
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
  readonly cargando: boolean;
  readonly cerradas: Readonly<Record<string, boolean>>;
  readonly onAlternar: (clave: string, cerrada: boolean) => void;
  readonly pestana: number;
  /** Los campos que esta pantalla declara escribibles. Vacio si no escribe nada. */
  readonly escribibles?: ReadonlySet<string>;
  /** Lo tecleado y todavia sin enviar. Solo tiene claves de `escribibles`. */
  readonly borrador?: Readonly<Record<string, string>>;
  readonly onCampo?: (campo: string, valor: string) => void;
  /** Mensaje por campo que devolvio el backend (`ProblemaDeApi.errores`). */
  readonly errorPorCampo?: Readonly<Record<string, string>>;
  /**
   * El `id` con que cada seccion queda anclada, si la opcion declara indice
   * (`composicion.ts`). Sin el, las secciones se dibujan como siempre: un ancla
   * en las 134 pantallas seria un atributo que nadie usa.
   */
  readonly anclaDe?: (indice: number) => string;
}

/** Sin `onCampo` no hay donde escribir; el resolutor se dibuja inerte igualmente. */
const NADA = (): void => {};

export function Formulario({
  opcion,
  secciones,
  valores,
  cargando,
  cerradas,
  onAlternar,
  pestana,
  escribibles,
  borrador = {},
  onCampo,
  errorPorCampo = {},
  anclaDe,
}: FormularioProps) {
  return (
    <div className="sgtm-formulario">
      {secciones.map((seccion, i) => {
        const clave = `${i}|${pestana}`;
        const cerrada = cerradas[clave] ?? arrancaCerrada(seccion);
        return (
          <section
            key={clave}
            className="sgtm-tarjeta"
            {...(anclaDe === undefined
              ? {}
              : // `tabIndex` negativo, no positivo (FRO-04 §7): la seccion no entra
                // en el recorrido del tabulador, pero el indice puede llevarle el
                // foco al saltar a ella.
                { id: anclaDe(i), tabIndex: -1 })}
          >
            <button
              type="button"
              className="sgtm-seccion__cabecera"
              aria-expanded={!cerrada}
              onClick={() => onAlternar(clave, !cerrada)}
            >
              <h2 className="sgtm-tarjeta__titulo">{seccion.label}</h2>
              {seccion.hint && <span className="sgtm-seccion__hint">{seccion.hint}</span>}
              <span className="sgtm-seccion__caret" data-cerrada={cerrada ? '1' : '0'}>
                <Icono nombre="chevronAbajo" tamano={15} />
              </span>
            </button>
            {!cerrada && (
              <div className="sgtm-seccion__rejilla">
                {seccion.campos.map((campo) => {
                  /* El control propio de un campo que **resuelve**, si la opcion
                     declara uno. Llega en el trozo de su modulo, asi que se
                     dibuja dentro de un `Suspense` con el mismo hueco que
                     ocuparia el campo. */
                  const resolutor = resolutorDeCampo(opcion, campo.clave);
                  if (resolutor !== undefined) {
                    // Resuelve **solo si esta pantalla puede mandar los campos
                    // que llena**: sin declararlos, `fijarCampo` los descartaria
                    // en silencio y la busqueda seria un adorno.
                    const puede = resolutor.campos.every(
                      (llena) => escribibles?.has(llena) ?? false,
                    );
                    return (
                      <Suspense key={campo.clave} fallback={<Esqueleto alto={72} />}>
                        <resolutor.Control
                          etiqueta={campo.label}
                          resuelto={Object.fromEntries(
                            resolutor.campos.map((llena) => [llena, borrador[llena] ?? '']),
                          )}
                          onCampo={onCampo ?? NADA}
                          bloqueado={!puede}
                        />
                      </Suspense>
                    );
                  }
                  const escribible = escribibles?.has(campo.clave) ?? false;
                  // El borrador manda sobre lo que sirvio la API: lo que el
                  // usuario acaba de teclear es mas nuevo que lo que se pidio.
                  const valor = escribible
                    ? (borrador[campo.clave] ?? valores[campo.clave])
                    : valores[campo.clave];
                  const error = errorPorCampo[campo.clave];
                  return (
                    <Campo
                      key={campo.clave}
                      etiqueta={campo.label}
                      tipo={campo.t}
                      valor={typeof valor === 'string' ? valor : ''}
                      marcado={valor === true}
                      ph={campo.ph}
                      opciones={campo.opts}
                      ancho={campo.ancho}
                      cargando={cargando}
                      bloqueado={!escribible}
                      {...(error === undefined ? {} : { error })}
                      {...(escribible && onCampo
                        ? { onCambio: (nuevo: string) => onCampo(campo.clave, nuevo) }
                        : {})}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
