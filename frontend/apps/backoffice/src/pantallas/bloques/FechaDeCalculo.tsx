import { formatearFecha } from '@sgtm/dominio';
import type { Fecha } from '@sgtm/dominio';

/**
 * A que fecha estan actualizados los datos de esta pantalla.
 *
 * **Es de la respuesta, no de un bloque**, y ahi estaba el defecto que corrige:
 * la fecha vivia dentro de la banda de totales, asi que las pantallas que
 * ensenan cifras en una tabla y no tienen banda —siete de las once de
 * Consultas— mostraban importes sin decir de cuando eran. En ventanilla eso no
 * es un detalle de formato: es responder «debe 1,842.60» a alguien que pregunta
 * cuanto debe, sin decir que esa cifra era la de anteayer.
 *
 * No existe «la deuda», existe `deudaActualizadaA(fecha)` (regla 9 de
 * CLAUDE.md, RNF-075). Por eso `DatosDePantalla.fechaCalculo` es obligatoria: no
 * hay respuesta sin ella, y por eso esta linea se puede dibujar siempre.
 */
export interface FechaDeCalculoProps {
  readonly fecha?: Fecha;
}

export function FechaDeCalculo({ fecha }: FechaDeCalculoProps) {
  if (fecha === undefined) return null;
  return (
    <p className="sgtm-fecha-de-calculo">
      Cifras actualizadas al <strong>{formatearFecha(fecha)}</strong>
    </p>
  );
}
