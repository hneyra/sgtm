// Viola: un importe es texto, nunca number (RNF-055, FRO-04 §4).
export function comoNumero(cuota: { importe: string }) {
  return Number(cuota.importe);
}

export function tambienProhibido(texto: string) {
  return parseFloat(texto);
}
