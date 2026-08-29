import { Suspense, lazy } from 'react';
import { Campo, Esqueleto } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { SeccionDePantalla } from '../../catalogo';
import { arrancaCerrada } from '../../catalogo';
import { controlesDeLaSeccion, memoriaDeSeccion, resolutorDeCampo } from '../composicion';
import type { ControlDeclarado } from '../composicion';
import { mapaEnElCampo } from '../escrituras';
import { Icono } from '@sgtm/design-system';

/* **La memoria del calculo, perezosa.** La dibuja la seccion que declara
   `memoriaDeSeccion` —hoy el predial individual (#393)— y nadie mas, asi que
   las otras 133 pantallas la descargaban para no usarla nunca. Es el tercer
   movimiento de este PR, y el mismo de #379, #424 y el de la hoja del reporte:
   el umbral lo sube quien no tiene otra salida, y aqui la habia. Hizo falta
   porque `main` llego a 155,9 de 156 con #445 dentro, y las dos formas de
   cuerpo de este issue no cabian en el 0,1 KB que quedaba. */
const MemoriaDeCalculo = lazy(async () => ({
  default: (await import('./MemoriaDeCalculo')).MemoriaDeCalculo,
}));

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
 *
 * **Y una seccion puede llevar un campo que el manual no dibuja** (#422): si la
 * opcion declara `controles` para su etiqueta, se anaden al final de su rejilla,
 * con **su propia etiqueta** —nunca la de ningun campo del catalogo (RNF-080)—.
 * Es el otro lado de lo mismo: el resolutor sustituye el dibujo de un campo que
 * existe, esto anade uno que no. Misma negacion por omision, y misma guarda: un
 * control solo escribe **el campo que declaro**, y si esta pantalla no lo
 * declara en `escrituras.ts` se dibuja bloqueado en vez de tragarse lo tecleado.
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
  /** Lo escrito en un mapa declarado, por su clave del vocabulario (#423). */
  readonly entradasDe?: (mapa: string) => Readonly<Record<string, string>>;
  /** Escribe una entrada de un mapa declarado. Sin esto, el mapa se dibuja bloqueado. */
  readonly onEntrada?: (mapa: string, clave: string, valor: string) => void;
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
  entradasDe,
  onEntrada,
}: FormularioProps) {
  return (
    <div className="sgtm-formulario">
      {secciones.map((seccion, i) => {
        const clave = `${i}|${pestana}`;
        const cerrada = cerradas[clave] ?? arrancaCerrada(seccion);
        const memoria = memoriaDeSeccion(opcion, seccion.label);
        /* Con memoria declarada, la seccion se parte en dos y la rejilla se
           queda solo con lo que se teclea; sin ella, la rejilla es la seccion
           entera, como en las otras 129 pantallas. Vacia no se dibuja: un
           recuadro de 36 px de alto y sin nada dentro se lee como un dato que
           falta. */
        const deLaRejilla =
          memoria === undefined ? seccion.campos : seccion.campos.filter((c) => c.t !== 'ro');
        /* Lo que esta opcion **anade** al final de esta seccion (#422). Vacio en
           133 de las 134, y entonces la rejilla es exactamente la del catalogo. */
        const anadidos = controlesDeLaSeccion(opcion, seccion.label);
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
            {!cerrada && memoria !== undefined && (
              /* La seccion se lee como la memoria de un calculo (#393), y se
                 parte por el **tipo del catalogo**: los `"ro"` son la cuenta y
                 van a la memoria; los que se teclean siguen en su rejilla,
                 debajo. La linea de corte no es «lo que esta pantalla puede
                 escribir» sino «lo que el catalogo dibuja como campo»: en
                 «Alcabala» el numero de expediente y la fecha de la
                 transferencia son entradas aunque hoy nadie pueda mandarlas, y
                 dibujarlas como texto de una cuenta seria decir que ya estan
                 decididas. */
              <Suspense fallback={<Esqueleto alto={160} />}>
                <MemoriaDeCalculo
                  campos={seccion.campos.filter((campo) => campo.t === 'ro')}
                  valores={valores}
                  cargando={cargando}
                  memoria={memoria}
                />
              </Suspense>
            )}
            {!cerrada && (deLaRejilla.length > 0 || anadidos.length > 0) && (
              <div className="sgtm-seccion__rejilla">
                {deLaRejilla.map((campo) => {
                  /* **Un mapa del cuerpo, en el sitio de los campos a los que
                     sustituye** (#423). El arqueo del cierre de caja son cinco
                     medios de pago con su importe, y el prototipo dibuja cuatro
                     casillas con otro vocabulario y sin el cheque: el mapa las
                     sustituye, y los sustituidos que no son el primero no se
                     dibujan —dibujarlos dejaria nueve cajas de importe en la
                     seccion, cuatro de ellas muertas—. */
                  const enElCampo = mapaEnElCampo(opcion, campo.clave);
                  if (enElCampo !== undefined) {
                    if (!('mapa' in enElCampo)) return null;
                    const { nombre, mapa } = enElCampo;
                    const escritas = entradasDe?.(nombre) ?? {};
                    return mapa.entradas.map((entrada) => (
                      <Campo
                        key={entrada.clave}
                        etiqueta={entrada.etiqueta}
                        tipo="text"
                        valor={escritas[entrada.clave] ?? ''}
                        cargando={cargando}
                        bloqueado={onEntrada === undefined}
                        {...(onEntrada === undefined
                          ? {}
                          : {
                              onCambio: (nuevo: string) => onEntrada(nombre, entrada.clave, nuevo),
                            })}
                      />
                    ));
                  }
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
                      /* **Una casilla escribible tiene que enseñar lo que se
                         acaba de pulsar.** Lo que sirve la API es un booleano;
                         lo que guarda el borrador es la cadena `'si'`
                         (`design-system/Campo`), asi que comparar solo contra
                         `true` dejaba la casilla siempre desmarcada por mucho
                         que se pulsara — y con ella la pantalla diciendo lo
                         contrario de lo que iba a mandar. Salio al declarar las
                         dos de «Predial — masivo» (#445). */
                      marcado={valor === true || valor === 'si'}
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
                {anadidos.map((control) => (
                  <ControlAnadido
                    key={`anadido|${control.campo}`}
                    control={control}
                    valor={borrador[control.campo] ?? ''}
                    /* Se dibuja **bloqueado** si esta pantalla no declara ese
                       campo en `escrituras.ts`, o si quien mira no tiene el
                       privilegio del acto: es la misma guarda que el resolutor
                       (`ResolutorProps.bloqueado`) y por el mismo motivo —sin la
                       declaracion, `fijarCampo` se traga lo tecleado en silencio
                       y el campo anadido seria un adorno—. */
                    bloqueado={!puedeActuar || !(escribibles?.has(control.campo) ?? false)}
                    onCampo={onCampo ?? NADA}
                    {...(errorPorCampo[control.campo] === undefined
                      ? {}
                      : { error: errorPorCampo[control.campo] })}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Un campo que la opcion **anade** a una seccion del catalogo (#422).
 *
 * Es un `Campo` normal y nada mas: lo que lo hace distinto no esta aqui sino en
 * quien lo declara. Se separa en su propio componente para poder leer de un
 * vistazo lo unico que hay que mirar aqui: que **la etiqueta que dibuja es la
 * del control** y no la de ningun campo del catalogo (RNF-080).
 *
 * **Y no lleva `soloSusCampos`, a diferencia del resolutor**, aunque la
 * propiedad que hay que garantizar sea la misma —«escribe solo lo que declaro»—.
 * Ahi hace falta porque el control es **codigo ajeno**: `CampoResolutor.Control`
 * es un componente cualquiera al que se le entrega un `onCampo`, y puede llamarlo
 * con la clave que le de la gana (la muestra de `formulario-resolutor.test.tsx`
 * lo hace). Aqui no hay codigo: la clave sale de la declaracion y es la unica que
 * se puede pasar. Envolverlo tambien seria una guarda que **no puede fallar**, y
 * una regla que no puede fallar no protege nada — se midio quitandola, y no pone
 * nada en rojo. Lo que si protege, y si muerde, es el censo: la clave declarada
 * tiene que estar en `escrituras.ts` (`controles-declarados.test.ts`).
 */
function ControlAnadido({
  control,
  valor,
  bloqueado,
  onCampo,
  error,
}: {
  readonly control: ControlDeclarado;
  readonly valor: string;
  readonly bloqueado: boolean;
  readonly onCampo: (campo: string, valor: string) => void;
  readonly error?: string;
}) {
  return (
    <Campo
      etiqueta={control.etiqueta}
      tipo={control.tipo}
      valor={valor}
      bloqueado={bloqueado}
      ayuda={control.ayuda}
      {...(control.ph === undefined ? {} : { ph: control.ph })}
      {...(control.opciones === undefined ? {} : { opciones: control.opciones })}
      /* La misma regla que los `sel` escribibles del catalogo: sin la opcion
         vacia, el desplegable se dibuja mostrando la primera y no manda nada
         (revision de #331). Aqui vale siempre —un control declarado se declara
         para escribirlo—, y estando bloqueado tampoco estorba: no hay nada
         elegido que ensenar. */
      {...(control.tipo === 'sel' ? { eleccionObligatoria: true } : {})}
      {...(error === undefined ? {} : { error })}
      {...(bloqueado ? {} : { onCambio: (nuevo: string) => onCampo(control.campo, nuevo) })}
    />
  );
}
