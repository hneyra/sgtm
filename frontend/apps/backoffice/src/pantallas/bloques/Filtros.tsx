import { useState } from 'react';
import { Boton, Campo } from '@sgtm/design-system';
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
}

export function Filtros({ opcion, campos, buscado, cargando, onBuscar }: FiltrosProps) {
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
        {campos.map((campo) => {
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
    </section>
  );
}
