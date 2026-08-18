import type { Documento } from './tipos';

/** `{ tipo: 'DNI', numero: '44218937' }` → `"DNI 44218937"`. */
export function formatearDocumento(documento: Documento): string {
  return `${documento.tipo} ${documento.numero}`;
}
