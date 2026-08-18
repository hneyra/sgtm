import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Mensaje centrado entre hairlines: vacio, error o sin permiso (FRO-01 §7).
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
  readonly tipo?: 'vacio' | 'error' | 'sin-permiso';
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
