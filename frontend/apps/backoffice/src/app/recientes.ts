/**
 * Las ultimas cinco opciones visitadas.
 *
 * Se persisten en `localStorage` porque duran mas que la pestana y no valen
 * nada para nadie: son nombres de menu. **El token no**, y esa es la linea que
 * FRO-01 §5 traza y que una regla de ESLint vigila —la prohibicion es guardar
 * credenciales en el almacenamiento del navegador, no usar el almacenamiento—.
 */

const CLAVE = 'sgtm.recientes';
const MAXIMO = 5;

export function leerRecientes(): readonly string[] {
  try {
    const crudo = globalThis.localStorage?.getItem(CLAVE);
    if (!crudo) return [];
    const valor: unknown = JSON.parse(crudo);
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    // Modo privado, cuota llena o JSON corrupto: no tener recientes no es un error.
    return [];
  }
}

export function anotarReciente(id: string, actuales: readonly string[]): readonly string[] {
  const siguientes = [id, ...actuales.filter((x) => x !== id)].slice(0, MAXIMO);
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(siguientes));
  } catch {
    // Sin persistencia se sigue trabajando: los recientes son una comodidad.
  }
  return siguientes;
}
