// Viola: el token vive en memoria, nunca en localStorage (FRO-01 §5).
export function guardar(token: string) {
  localStorage.setItem('token', token);
}

export function leer() {
  return sessionStorage.getItem('token');
}
