import { cuentaActual, nombreDeLaSesion } from '../api/sesion';
import type { Sesion } from './modulos';

/**
 * Quién aparece en la cabecera.
 *
 * Con sesión de verdad manda quien entró, no la persona que el artboard dibuja
 * para el módulo: ver «J. Cárdenas» habiendo entrado como otro es lo que hace
 * que un 403 parezca un fallo del sistema y no de la cuenta.
 *
 * El **rol** sigue siendo el del módulo. El token no dice qué hace alguien en
 * Catastro, y ponerle «Administrador» a todo el mundo sería inventar un cargo;
 * lo que el token sí dice —quién es— es lo que se sustituye.
 *
 * Vive aquí y no dentro del shell porque Inicio tiene el suyo propio (el riel
 * desaparece cuando entra un contribuyente) y las dos cabeceras tienen que
 * decir lo mismo.
 */
export function personaDeLaSesion(porOmision: Sesion): Sesion {
  const cuenta = cuentaActual();
  if (cuenta === null) return porOmision;

  const mostrado = nombreDeLaSesion() ?? cuenta;
  const iniciales = mostrado
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return { iniciales: iniciales || cuenta.slice(0, 2).toUpperCase(), nombre: mostrado, rol: porOmision.rol };
}
