import type { Fecha, Importe } from './dinero';

/**
 * Tono de un estado. La interfaz debe poder distinguirlo **sin color**: el
 * prototipo pinta la insignia con color, y el texto de `etiqueta` la acompana
 * siempre (FRO-02 §2.1).
 *
 * Se corresponde con las tres insignias del prototipo (`ok`, `warn`, `bad`);
 * el nombre va en espanol porque es vocabulario del dominio.
 */
export type Tono = 'ok' | 'atencion' | 'critico' | 'neutro';

export interface Estado {
  /** Codigo estable del dominio: `AL_DIA`, `VENCIDO`, `COACTIVO`, `ANULADO`… */
  readonly codigo: string;
  /** Texto ya redactado por el backend. No se arma en el componente (RNF-080). */
  readonly etiqueta: string;
  readonly tono: Tono;
}

/**
 * Todo importe que se muestre viaja con la fecha en que el backend lo calculo.
 * No existe «la deuda»: existe `deudaActualizadaA(fecha)` (regla 9, RNF-075).
 */
export interface ImporteCalculado {
  readonly valor: Importe;
  readonly fechaCalculo: Fecha;
}

/** Tipos de documento de identidad que el manual admite. */
export type TipoDocumento = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';

export interface Documento {
  readonly tipo: TipoDocumento;
  readonly numero: string;
}

export type { Fecha, Importe };
