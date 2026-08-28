import { useState } from 'react';
import { Boton, Campo } from '@sgtm/design-system';
import type { CampoDePantalla } from '../../catalogo';
import { widgetDeFiltro } from '../composicion';

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
          const propio = widgetDeFiltro(opcion, campo.clave);
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
              onCambio={cambiar}
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
