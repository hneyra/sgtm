// Viola: la interfaz no hace aritmetica con importes (RNF-083, FRO-04 §4).
interface Cuota {
  insoluto: string;
  interes: string;
}

export function totalDeLaCuota(cuota: Cuota) {
  return cuota.insoluto + cuota.interes;
}

export function totalDeLaDeuda(cuotas: { montos: number[] }) {
  return cuotas.montos.reduce((a, b) => a + b, 0);
}
