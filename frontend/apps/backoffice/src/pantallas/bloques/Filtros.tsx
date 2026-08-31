import { useState } from 'react';
import { Boton, Campo, Icono } from '@sgtm/design-system';
import type { CampoDePantalla } from '../../catalogo';
import { filtroBloqueado, widgetDeFiltro } from '../composicion';
import { motivoDeFiltro } from '../prosa';

/**
 * Bloque de busqueda (FRO-03 §5, bloque 4).
 *
 * **Lo buscado vive en la URL**, no aqui: al pulsar «Buscar» los valores se
 * escriben en la consulta y la pantalla vuelve a pedir. Lo que se guarda en
 * este componente es solo lo que el usuario esta escribiendo y todavia no ha
 * buscado —un borrador—, y por eso se pierde al recargar sin que se pierda la
 * busqueda.
 *
 * **El proxy de datos no filtra**, y es a proposito: fingir la semantica de
 * `?uso=Comercio` seria inventar un comportamiento que el backend no ha
 * decidido. Lo que si se ejerce de verdad es el camino entero: el valor entra
 * en la URL, viaja como parametro si el contrato lo declara, y entra en la
 * clave de cache.
 */
export interface FiltrosProps {
  /**
   * La opcion a la que pertenece esta busqueda.
   *
   * Sirve para **una** cosa: preguntar si declara un control propio para alguno
   * de sus campos (`composicion.ts`). El codigo de referencia catastral se
   * compone en tramos y no se teclea de corrido (#318), y eso es una propiedad
   * de ese campo en esa pantalla, no del bloque de busqueda. Sin declaracion, el
   * campo se dibuja con el `Campo` de siempre: negacion por omision.
   */
  readonly opcion: string;
  readonly campos: readonly CampoDePantalla[];
  /** Lo que hay buscado ahora mismo, leido de la URL. */
  readonly buscado: Readonly<Record<string, string>>;
  readonly cargando: boolean;
  readonly onBuscar: (valores: Readonly<Record<string, string>>) => void;
  /**
   * Si los filtros **de detras del primero** se pliegan tras «Búsqueda
   * avanzada» (#498 F7).
   *
   * «Empieza por encontrar el predio. Un código, un nombre o una dirección
   * bastan; los filtros de abajo solo hacen falta cuando la búsqueda devuelve
   * demasiado.» Ese es el encargo, y el primer campo de la pantalla es el que
   * lo cumple.
   *
   * **Va por pantalla y no para las noventa y siete**, por la misma razon por
   * la que la portada del modulo se hace primero la de Catastro: cuatro filtros
   * es la norma del catalogo —57 pantallas— y plegarlas todas de golpe cambia
   * como se busca en el sistema entero. Catastro marca el estandar; las demas
   * lo declaran cuando les toque.
   */
  readonly plegables?: boolean;
}

export function Filtros({
  opcion,
  campos,
  buscado,
  cargando,
  onBuscar,
  plegables = false,
}: FiltrosProps) {
  const [borrador, fijarBorrador] = useState<Readonly<Record<string, string>>>(() => {
    // El valor que llega de la URL pasa por el mismo embudo que el widget
    // aplica al teclear: lo que se ve y lo que se manda tienen que ser el
    // mismo valor, tambien cuando el codigo entro por un enlace compartido.
    const normalizados: Record<string, string> = { ...buscado };
    for (const campo of campos) {
      const propio = widgetDeFiltro(opcion, campo.clave);
      const valor = normalizados[campo.clave];
      if (propio !== undefined && valor !== undefined) {
        normalizados[campo.clave] = propio.normalizar(valor);
      }
    }
    return normalizados;
  });

  /* El primero se queda a la vista y el resto se pliega. «El primero» es el
     del catalogo, que es el que la pantalla pone delante: en la consulta de
     fichas, el codigo de referencia catastral. */
  const [principal, ...avanzados] = campos;
  const pliega = plegables && avanzados.length > 0 && principal !== undefined;

  /* **Un filtro plegado que trae valor abre el panel solo.** Si no, alguien
     pega el enlace de una busqueda con «Uso = Comercio» dentro, ve la caja del
     codigo vacia y no entiende por que salen tres filas: el filtro estaria
     actuando y escondido. Es la misma razon por la que el contador dice cuantos
     hay puestos. */
  const avanzadosConValor = avanzados.filter(
    (campo) => (buscado[campo.clave] ?? '').trim() !== '',
  ).length;
  const [abiertoAMano, fijarAbiertoAMano] = useState(false);
  const abierto = !pliega || abiertoAMano || avanzadosConValor > 0;
  const visibles = pliega && !abierto ? [principal] : campos;

  return (
    <section className="sgtm-tarjeta sgtm-filtros" aria-label="Búsqueda">
      <div className="sgtm-filtros__cabecera">
        <p className="sgtm-filtros__eyebrow">Búsqueda</p>
        <Boton
          menudo
          onClick={() => {
            fijarBorrador({});
            onBuscar({});
          }}
        >
          Limpiar
        </Boton>
      </div>
      <div className="sgtm-filtros__rejilla">
        {visibles.map((campo) => {
          const cambiar = (valor: string): void =>
            fijarBorrador((previos) => ({ ...previos, [campo.clave]: valor }));
          // **Un filtro bloqueado se dibuja y no se manda** (`composicion.ts`).
          // El `Campo` del catalogo, con sus opciones y su rotulo; `bloqueado`
          // para que no se escriba, y el motivo como `ayuda`, que va enlazada
          // por `aria-describedby` y por tanto se anuncia. Y **sin `onCambio`**:
          // asi el valor no puede entrar en el borrador, que es lo unico que
          // `Buscar` manda a la URL. No es la barrera —el servidor rechaza igual
          // (ADR-0013)—: es no dejar que nadie se lleve un 422 por usar un
          // control que la pantalla le ofrecia.
          //
          // `Campo` resuelve `bloqueado` con `readonly` donde el HTML lo
          // permite, para no sacar el control del tabulador (RNF-082). En un
          // `select` **no lo permite** —`readonly` no existe para `select`— y
          // cae en `disabled`; por eso el motivo va como `ayuda`, que se dibuja
          // como parrafo aparte y se lee este el control habilitado o no.
          //
          // Que la **declaracion** viva en `composicion.ts` y su redaccion en
          // `prosa-textos.ts` tiene una consecuencia buscada: si la prosa no
          // hubiera llegado, el filtro sigue bloqueado y solo falta el motivo.
          // Lo que no puede pasar es lo contrario.
          const bloqueado = filtroBloqueado(opcion, campo.clave);
          const motivo = bloqueado ? motivoDeFiltro(opcion, campo.clave) : undefined;
          // Un filtro bloqueado se dibuja con el `Campo` de siempre y **no** con
          // su control propio: lo que sustituye a un campo es un widget que
          // compone un valor, y aqui no hay valor que componer.
          const propio = bloqueado ? undefined : widgetDeFiltro(opcion, campo.clave);
          // El control propio recibe lo mismo que el `Campo` al que sustituye
          // —rotulo, valor y cambio— y **compone el mismo valor de cadena**: lo
          // que acaba en la URL y en la peticion es identico al de antes.
          return propio === undefined ? (
            <Campo
              key={campo.clave}
              etiqueta={campo.label}
              tipo={campo.t}
              valor={borrador[campo.clave] ?? ''}
              ph={campo.ph}
              opciones={campo.opts}
              bloqueado={bloqueado}
              {...(motivo === undefined ? {} : { ayuda: motivo })}
              {...(bloqueado ? {} : { onCambio: cambiar })}
            />
          ) : (
            <propio.Control
              key={campo.clave}
              etiqueta={campo.label}
              valor={borrador[campo.clave] ?? ''}
              onCambio={cambiar}
            />
          );
        })}
        <Boton variante="primario" disabled={cargando} onClick={() => onBuscar(borrador)}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </Boton>
      </div>

      {/* «Búsqueda avanzada» (#498 F7). Va **debajo** de la caja principal y no
          encima: lo primero de la pantalla tiene que ser con lo que se busca.

          El contador no es adorno: dice cuantos de los plegados traen valor, y
          es lo que impide que una busqueda parezca vacia teniendo filtros
          puestos. Cuando alguno lo trae, el panel esta abierto y el boton no se
          dibuja —cerrarlo escondería un filtro que esta actuando—. */}
      {pliega && avanzadosConValor === 0 && (
        <button
          type="button"
          className="sgtm-filtros__avanzada"
          aria-expanded={abierto}
          onClick={() => fijarAbiertoAMano(!abierto)}
        >
          <span className="sgtm-filtros__caret" data-abierto={abierto ? '1' : '0'}>
            <Icono nombre="chevronAbajo" tamano={12} />
          </span>
          Búsqueda avanzada
          <span className="sgtm-filtros__conteo">
            {avanzados.length === 1 ? '1 criterio más' : `${avanzados.length} criterios más`}
          </span>
        </button>
      )}
    </section>
  );
}
