// Viola: las peticiones pasan por «solicitar» de @sgtm/api-client, no por
// `fetch` suelto (FRO-01 §5). Un fetch aqui se salta el token, la clave de
// idempotencia y el formato de error del backend.
export async function traerPredios() {
  const respuesta = await fetch('/api/v1/rentas/predios');
  return respuesta.json();
}
