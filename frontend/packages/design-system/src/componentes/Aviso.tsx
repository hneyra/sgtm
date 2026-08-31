import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Mensaje entre hairlines: vacio, error, sin permiso —o **nota permanente**.
 *
 * Los tres primeros son estados de una pantalla **sin nada que ensenar**, y por
 * eso van centrados y con aire: ocupan el hueco de lo que no hay (FRO-01 §7).
 *
 * <h2>La nota no es un estado, y no puede vestirse como uno</h2>
 *
 * `nota` es lo que una pantalla dice **con sus datos delante**: la conciliacion
 * de la consulta de fichas, por que una rejilla sale vacia, donde se registra
 * de verdad un acto. Veinte opciones tienen una, y las veinte se dibujaban con
 * la forma del vacio: un bloque centrado de 36 px de aire arriba y abajo,
 * encima de la tabla que se venia a mirar. En la consulta de fichas ocupaba
 * media pantalla y empujaba la busqueda fuera del primer viewport.
 *
 * La nota va como el artboard la dibuja: **franja compacta, alineada a la
 * izquierda y con el filete de acento a un lado**. Se lee de una pasada y no
 * compite con lo que hay debajo.
 *
 * El detalle de un error de negocio llega **ya redactado por el backend**, en
 * castellano y en lenguaje del dominio (RNF-080). Este componente lo muestra;
 * no lo reescribe ni lo sustituye por un texto generico.
 *
 * La traza se copia de un gesto porque quien atiende en ventanilla la **dicta
 * por telefono** a soporte: leerla de la pantalla y teclearla en otro sitio es
 * donde se pierde un caracter.
 */
export interface AvisoProps {
  readonly tipo?: 'vacio' | 'error' | 'sin-permiso' | 'nota';
  readonly titulo: string;
  readonly detalle?: string;
  /** Identificador de traza, para que soporte pueda seguir el caso. */
  readonly traza?: string;
  readonly children?: ReactNode;
}

export function Aviso({ tipo = 'vacio', titulo, detalle, traza, children }: AvisoProps) {
  return (
    <div className={`sgtm-aviso sgtm-aviso--${tipo}`} role={tipo === 'vacio' ? undefined : 'alert'}>
      <p className="sgtm-aviso__titulo">{titulo}</p>
      {detalle && <p className="sgtm-aviso__detalle">{detalle}</p>}
      {traza && <Traza traza={traza} />}
      {children && <div className="sgtm-aviso__acciones">{children}</div>}
    </div>
  );
}

function Traza({ traza }: { readonly traza: string }) {
  const [copiada, fijarCopiada] = useState(false);

  return (
    <p className="sgtm-aviso__traza">
      <span>Traza {traza}</span>
      <button
        type="button"
        className="sgtm-boton sgtm-boton--menudo"
        onClick={() => {
          // Sin portapapeles —navegador viejo, contexto sin permiso— el numero
          // sigue en pantalla: se dicta igual, que es como se usa de verdad.
          void navigator.clipboard?.writeText(traza).then(
            () => fijarCopiada(true),
            () => fijarCopiada(false),
          );
        }}
      >
        Copiar
      </button>
      <span role="status" className="sgtm-aviso__copiada">
        {copiada ? 'Copiada' : ''}
      </span>
    </p>
  );
}
