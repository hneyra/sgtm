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
export interface PuertaDeSesionProps {
  readonly children: ReactNode;
  /**
   * Que se ve sin sesion, cuando la invitacion de siempre no es la que toca.
   *
   * Lo pasa **el portal** (ADR-0020): su puerta lleva al realm del **ciudadano**
   * —otro emisor, y una vuelta a `/portal/` en vez de a la raiz del origen— y lo
   * que hay al otro lado no es «tu sesion de trabajo» sino la consulta de tu
   * propia deuda. El mecanismo es el mismo; lo que cambia es a quien se le
   * habla, y eso no se puede redactar una vez para los dos.
   *
   * Lo que aqui se dibuje **tiene que ofrecer la puerta**: puede llamar a
   * `useSesion().entrar`, porque se monta dentro del proveedor.
   *
   * Sin esto se dibuja la invitacion de siempre, que es la del back-office.
   */
  readonly anonima?: ReactNode;
}

export function PuertaDeSesion({ children, anonima }: PuertaDeSesionProps) {
  const sesion = useSesion();

  if (sesion.estado === 'entrando') {
    return (
      <div className="sgtm-puerta">
        <Esqueleto alto={18} ancho="14ch" />
      </div>
    );
  }

  if (sesion.estado === 'anonima') {
    if (anonima !== undefined) return <div className="sgtm-puerta">{anonima}</div>;
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
