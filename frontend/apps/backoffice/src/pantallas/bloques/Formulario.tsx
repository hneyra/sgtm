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
  /**
   * Quien mira **tiene el privilegio que el acto de la pantalla exige**.
   *
   * Hoy solo lo consulta el resolutor: sin el, buscaba contra el padron para un
   * perfil que no puede registrar nada. Ver `ResolutorProps.bloqueado`.
   */
  readonly puedeActuar?: boolean;
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

/**
 * `onCampo` **acotado a los campos que ese control declaro**.
 *
 * Es una linea y cierra un agujero que no se ve (revision de #331): el
 * resolutor recibia el `fijarCampo` de la pantalla entera, y ese acepta
 * cualquier clave que la opcion declare. Un control que llenara
 * `codContribuyente` —o `insolutoS`— lo conseguia sin que nada lo dijera, y el
 * cuerpo salia con un campo que el operador no escribio. `CampoResolutor.campos`
 * existe justamente para declarar que llena; aqui se hace valer.
 *
 * Se exporta para poder probarla sin montar nada: es la comprobacion entera.
 */
export const soloSusCampos =
  (onCampo: (campo: string, valor: string) => void, suyos: readonly string[]) =>
  (campo: string, valor: string): void => {
    if (!suyos.includes(campo)) return;
    onCampo(campo, valor);
  };

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
  puedeActuar = true,
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
                    // Lo que ese control puede escribir: lo que llena y lo que
                    // guarda para enseñarlo. Ni una clave mas (`soloSusCampos`).
                    const suyos = [...resolutor.campos, ...(resolutor.memoria ?? [])];
                    /* Resuelve **solo si esta pantalla puede mandar los campos
                       que llena y quien mira puede actuar**: sin declararlos,
                       `fijarCampo` los descartaria en silencio y la busqueda
                       seria un adorno; sin el privilegio del acto, la busqueda
                       acaba en un 403 despues de haberla hecho (ADR-0013). */
                    const puede =
                      puedeActuar && suyos.every((llena) => escribibles?.has(llena) ?? false);
                    return (
                      <Suspense key={campo.clave} fallback={<Esqueleto alto={72} />}>
                        <resolutor.Control
                          etiqueta={campo.label}
                          resuelto={Object.fromEntries(
                            suyos.map((llena) => [llena, borrador[llena] ?? '']),
                          )}
                          contexto={Object.fromEntries(
                            (resolutor.contexto ?? []).map((lee) => {
                              // El borrador manda sobre lo que sirvio la API,
                              // igual que en un campo escribible: lo que se
                              // acaba de teclear es mas nuevo.
                              const valor = borrador[lee] ?? valores[lee];
                              return [lee, typeof valor === 'string' ? valor : ''];
                            }),
                          )}
                          onCampo={soloSusCampos(onCampo ?? NADA, suyos)}
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
                      /* **Un `sel` de escritura no enseña una elección que
                         nadie hizo** (revision de #331). Un `<select value="">`
                         cuyas opciones no incluyen la cadena vacia se dibuja
                         mostrando la primera y no manda nada: en «Alta de
                         deuda» eso se veia como «IMPUESTO PREDIAL» elegido, con
                         el borrador vacio y el cuerpo saliendo **sin
                         `tributo`**. Solo a los **escribibles**: un `sel` de
                         solo lectura pinta lo que sirvio el servidor, y uno no
                         declarado no manda nada de todas formas. Los filtros no
                         pasan por aqui —`Filtros` no lo pasa, y su primera
                         opcion es «Todos» a proposito—. */
                      {...(escribible && campo.t === 'sel' ? { eleccionObligatoria: true } : {})}
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
