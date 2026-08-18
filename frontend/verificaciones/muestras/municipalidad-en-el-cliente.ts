// Viola: el frontend jamas envia municipalidadId (regla 2, ARQ-03 §3.1).
export function consultarPredios(municipalidadId: string) {
  return fetch(`/api/v1/predios?municipalidad=${municipalidadId}`);
}
