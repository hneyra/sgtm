import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `fiscalizacion` publica.
 *
 * <h2>Las cuatro cifras que siempre son nulas</h2>
 *
 * `valorCatastralS`, `valorDeclaradoS`, `diferenciaS` e `impuestoOmitidoS`
 * llegan `null` y seguiran llegando `null` mientras D-02a este abierta: valorar
 * un predio exige el cuadro de valores unitarios, la depreciacion y el arancel,
 * y ninguno esta firmado. No es que falten en esta consulta: es que el sistema
 * no sabe valorizar todavia.
 */
export type FilaDeOmisos = {
  codRefCatastral: string;
  /** El CODIGO del contribuyente, no su nombre. */
  titular: string;
  sector: string | null;
  /** `OMISO` | `SUBVALUADOR`. */
  condicion: string;
  declaroFueraDePlazo: boolean;
  areaCatastral: string | null;
  areaDeclarada: string | null;
  diferenciaDeArea: string | null;
  valorCatastralS: string | null;
  valorDeclaradoS: string | null;
  diferenciaS: string | null;
  impuestoOmitidoS: string | null;
};

export type FiltroDeOmisos = {
  ejercicio?: string;
  sector?: string;
  /** `OMISO` | `SUBVALUADOR`. */
  condicion?: string;
  contribuyente?: string;
  /** La fecha a la que se resuelve, que es la de la regla 9. */
  fechaDeConsulta?: string;
};

export function listarOmisos(
  filtro: FiltroDeOmisos,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FilaDeOmisos>> {
  return solicitar('/fiscalizacion/omisos', { parametros: { ...filtro, ...paginacion }, senal });
}
