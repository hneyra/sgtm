import { useState } from 'react';
import { Boton, Campo } from '@sgtm/design-system';
import type { CampoDePantalla } from '../../catalogo';

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
  readonly campos: readonly CampoDePantalla[];
  /** Lo que hay buscado ahora mismo, leido de la URL. */
  readonly buscado: Readonly<Record<string, string>>;
  readonly cargando: boolean;
  readonly onBuscar: (valores: Readonly<Record<string, string>>) => void;
}

export function Filtros({ campos, buscado, cargando, onBuscar }: FiltrosProps) {
  const [borrador, fijarBorrador] = useState<Readonly<Record<string, string>>>(buscado);

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
        {campos.map((campo) => (
          <Campo
            key={campo.clave}
            etiqueta={campo.label}
            tipo={campo.t}
            valor={borrador[campo.clave] ?? ''}
            ph={campo.ph}
            opciones={campo.opts}
            onCambio={(valor) => fijarBorrador((previos) => ({ ...previos, [campo.clave]: valor }))}
          />
        ))}
        <Boton variante="primario" disabled={cargando} onClick={() => onBuscar(borrador)}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </Boton>
      </div>
    </section>
  );
}
