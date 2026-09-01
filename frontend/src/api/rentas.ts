import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `rentas` publica. Los tipos son los `record` del backend, campo por
 * campo, y los nombres raros —`dNI`, `rUC`— son los del contrato generado: se
 * respetan porque son los que viajan.
 */

/** Una fila del padron. Es `ContribuyenteResource`. */
export type Contribuyente = {
  id: number;
  codigo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  /** `NATURAL` | `JURIDICA`. */
  tipoPersona: string;
  nombreRazonSocial: string;
  condicionEspecial: string | null;
  activo: boolean;
};

/**
 * Los cuatro filtros que `ContribuyenteController` admite. No hay mas.
 *
 * `nombreRazonSocial` busca por PARECIDO, no por igualdad: «SULLON» devuelve
 * 129 de 10 603. Es lo que permite encontrar a quien esta mal escrito en el
 * padron, y por eso el buscador no exige el nombre exacto.
 */
export type FiltroDeContribuyentes = {
  codigo?: string;
  nombreRazonSocial?: string;
  /** Se llama asi en el contrato. No es una errata. */
  dNI?: string;
  rUC?: string;
};

export function buscarContribuyentes(
  filtro: FiltroDeContribuyentes,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Contribuyente>> {
  return solicitar('/rentas/contribuyentes', { parametros: { ...filtro, ...paginacion }, senal });
}


/* ══════════ Escrituras ══════════
   Las cuatro exigen `observacion` (regla 10, RNF-052): sin motivo no se
   guarda, y el backend lo comprueba tambien de su lado. */

/** El cuerpo de `POST /rentas/transferencias/predio`. Lista blanca del backend. */
export type PeticionDeTransferenciaDePredio = {
  observacion: string;
  /** El identificador interno. **No se teclea**: se resuelve del codigo. */
  predioId: number;
  codTransferente: string;
  codAdquiriente: string;
  tipoTransferencia: string;
  fechaTransferencia: string;
  valorTransferencia: string;
  porcentajeTransferido: string;
  afectaAlcabala: boolean;
  documentoOrigen: string;
};

export function transferirPredio(peticion: PeticionDeTransferenciaDePredio): Promise<unknown> {
  return solicitar('/rentas/transferencias/predio', { metodo: 'POST', cuerpo: peticion });
}

/** El cuerpo de `POST /rentas/transferencias/vehiculo`. Va por PLACA, no por id. */
export type PeticionDeTransferenciaDeVehiculo = {
  observacion: string;
  placa: string;
  codAdquiriente: string;
  tipoTransferencia: string;
  fechaTransferencia: string;
  valorTransferencia: string;
  afectaAlcabala: boolean;
  documentoOrigen: string;
};

export function transferirVehiculo(peticion: PeticionDeTransferenciaDeVehiculo): Promise<unknown> {
  return solicitar('/rentas/transferencias/vehiculo', { metodo: 'POST', cuerpo: peticion });
}

/**
 * El cuerpo de un movimiento de deuda, alta o baja.
 *
 * **`cuota` es singular.** La pantalla del manual da de alta un rango —«cuotas
 * 1 a 4»— y este `record` no lo admite: `cuotaDesde`/`cuotaHasta` no estan en
 * la lista blanca, asi que Jackson los descartaria sin decir nada y el asiento
 * quedaria con `periodo: 0`. Se manda una cuota por peticion hasta que el
 * backend admita el rango.
 */
export type PeticionDeMovimientoDeDeuda = {
  observacion: string;
  codContribuyente: string;
  tributo: string;
  /** El ejercicio. Se llama `ano` en este cuerpo. */
  ano: string;
  cuota: number;
  predioId?: number;
  vehiculoId?: number;
  insoluto?: string;
  reajuste?: string;
  interes?: string;
  gasto?: string;
  fase?: string;
  fechaValor?: string;
  documentoOrigen?: string;
  referenciaExterna?: string;
};

export function altaDeDeuda(peticion: PeticionDeMovimientoDeDeuda): Promise<unknown> {
  return solicitar('/rentas/deuda/altas', { metodo: 'POST', cuerpo: peticion });
}

export function bajaDeDeuda(peticion: PeticionDeMovimientoDeDeuda): Promise<unknown> {
  return solicitar('/rentas/deuda/bajas', { metodo: 'POST', cuerpo: peticion });
}
