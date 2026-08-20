import type { ReactNode } from 'react';
import { Aviso, Boton, Esqueleto } from '@sgtm/design-system';
import { useSesion } from './ProveedorDeSesion';

/**
 * Lo que se ve segun el estado de la sesion.
 *
 * La regla que gobierna este archivo: **mientras la sesion esta abierta, los
 * hijos no se desmontan nunca**. Renovar el token cambia el token, no lo que
 * hay en pantalla; si al renovar se sustituyera el arbol, una declaracion
 * jurada a medio llenar se perderia cada pocos minutos, que es el defecto que
 * mas duele de los que se pueden cometer en la sesion (FRO-01 §5).
 *
 * El aviso de expiracion se pinta **encima**, como hermano: tampoco desmonta
 * nada.
 */
export function PuertaDeSesion({ children }: { readonly children: ReactNode }) {
  const sesion = useSesion();

  if (sesion.estado === 'entrando') {
    return (
      <div className="sgtm-puerta">
        <Esqueleto alto={18} ancho="14ch" />
      </div>
    );
  }

  if (sesion.estado === 'anonima') {
    return (
      <div className="sgtm-puerta">
        <Aviso
          titulo="Hay que iniciar sesión"
          detalle="El SGTM identifica a cada usuario para poder decir quién hizo cada cambio. Al volver, se sigue en la misma pantalla."
        >
          <Boton variante="primario" onClick={sesion.entrar}>
            Iniciar sesión
          </Boton>
        </Aviso>
      </div>
    );
  }

  return (
    <>
      {sesion.porExpirar && (
        <p className="sgtm-sesion__aviso" role="status">
          Tu sesión está por vencer y se renovará sola. No pierdas lo que estés escribiendo: no hace
          falta que hagas nada.
        </p>
      )}
      {children}
    </>
  );
}
