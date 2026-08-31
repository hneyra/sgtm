// Viola: sin tabIndex positivo (FRO-04 §7).
export function CampoDeBusqueda() {
  return <input aria-label="Buscar" tabIndex={3} />;
}
