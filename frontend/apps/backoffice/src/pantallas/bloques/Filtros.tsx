import { useState } from 'react';
import { Boton, Campo } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { CampoDePantalla } from '../../catalogo';

/**
 * Bloque de busqueda (FRO-03 §5, bloque 4).
 *
 * «Buscar» vuelve a pedir la operacion. **El proxy de datos no filtra**, y es a
 * proposito: fingir la semantica de `?uso=Comercio` seria inventar un
 * comportamiento que el backend todavia no ha decidido, y la interfaz acabaria
 * construida contra esa invencion. Lo que si se ejerce de verdad es el camino:
 * los valores viajan como parametros y la pantalla vuelve a su estado de carga.
 */
export interface FiltrosProps {
  readonly campos: readonly CampoDePantalla[];
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
  readonly cargando: boolean;
  readonly onBuscar: () => void;
}

export function Filtros({ campos, valores, cargando, onBuscar }: FiltrosProps) {
  const [escritos, fijarEscritos] = useState<Readonly<Record<string, string>>>({});

  const valorDe = (campo: CampoDePantalla): string => {
    const escrito = escritos[campo.clave];
    if (escrito !== undefined) return escrito;
    const servido = valores[campo.clave];
    return typeof servido === 'string' ? servido : '';
  };

  return (
    <section className="sgtm-tarjeta sgtm-filtros" aria-label="Búsqueda">
      <div className="sgtm-filtros__cabecera">
        <p className="sgtm-filtros__eyebrow">Búsqueda</p>
        <Boton menudo onClick={() => fijarEscritos({})}>
          Limpiar
        </Boton>
      </div>
      <div className="sgtm-filtros__rejilla">
        {campos.map((campo) => (
          <Campo
            key={campo.clave}
            etiqueta={campo.label}
            tipo={campo.t}
            valor={valorDe(campo)}
            ph={campo.ph}
            opciones={campo.opts}
            onCambio={(valor) => fijarEscritos((previos) => ({ ...previos, [campo.clave]: valor }))}
          />
        ))}
        <Boton variante="primario" disabled={cargando} onClick={onBuscar}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </Boton>
      </div>
    </section>
  );
}
