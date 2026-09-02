import { createContext, useContext } from 'react';

/**
 * Lo que la sesion puede hacer, leido una sola vez y repartido por el shell (#592).
 *
 * <h2>Por que existe</h2>
 *
 * Nueve descargas de Transito y de Infracciones exigen `IMPRESION` y no
 * `LECTURA`, y la interfaz no lo preguntaba: dibujaba el boton «PDF» encendido y
 * quien no tenia ese privilegio se llevaba un 403 **despues** de que se le
 * hubiera prometido el archivo. El 403 se explica bien desde #53, pero llega
 * tarde: lo que hay que decir antes es que ese boton no va a entregar nada.
 *
 * <h2>Los tres estados son tres, no dos</h2>
 *
 * «Todavia no se sabe», «no se pudo saber» y «se sabe que no» se arreglan de
 * tres maneras distintas —esperar, reintentar la lectura, pedirle el permiso a
 * Seguridad—, asi que se dicen por separado. Un booleano solo los juntaria en
 * la frase que peor se lee: «no tienes permiso» dicho de una sesion cuyos
 * permisos no se han podido leer manda a pedir algo que a lo mejor ya se tiene.
 */
export type EstadoDePermisos = {
  /** El mapa del backend: acceso -> privilegios en minuscula. `null` mientras no se sepa. */
  permisos: Record<string, string[]> | null;
  leyendo: boolean;
  fallo: boolean;
};

/**
 * El valor por omision es el pesimista, y no por prudencia generica.
 *
 * Un componente montado fuera del proveedor —una prueba, un trozo del shell que
 * se dibuje antes— tiene que comportarse como el peor caso conocido, que es
 * `fallo`: si el estado por omision fuera «leyendo» el boton se quedaria
 * eternamente diciendo «Comprobando…», y si fuera un mapa vacio afirmaria que a
 * la sesion le faltan permisos sin haber preguntado.
 */
export const PermisosCtx = createContext<EstadoDePermisos>({ permisos: null, leyendo: false, fallo: true });

export const usarPermisos = () => useContext(PermisosCtx);

/**
 * Si la sesion puede ejercer `privilegio` sobre `acceso`. Ante un fallo o
 * mientras lee: NO.
 *
 * <h2>El sesgo es deliberado, y tiene precedente</h2>
 *
 * Con `permisos` en `null` devuelve `false`, o sea que una lectura caida apaga
 * la descarga en vez de ofrecerla. Es la misma regla que ADR-0013 fijo para el
 * menu: **cuando no se pueden leer los permisos, la interfaz ensena el menu
 * vacio, no todo** —y #297 la midio, con el endpoint de permisos contestando
 * 500 y el frontend pasando a ensenarlo entero—. Aqui la eleccion es entre
 * apagar un boton que quiza funcionaria y prometer una hoja oficial que el
 * servidor va a negar; la segunda es la que hace ir a por el papel a la
 * impresora.
 *
 * Quien apague algo con esto tiene que **decir cual de los tres casos es**: un
 * `false` a secas no distingue «no se sabe todavia» de «no se puede».
 *
 * <h2>Un acceso ausente es un acceso que no se tiene</h2>
 *
 * El servidor no publica la clave con la lista vacia: sencillamente no la
 * publica (ver `PermisosDeLaSesion`). Asi que la ausencia se lee como negativa,
 * que es exactamente lo que el guardia va a contestar. Y `acceso` sin definir
 * tambien es `false`: sin saber que acceso comprobar no hay nada que afirmar, y
 * conceder lo que no se ha preguntado es el defecto que esto cierra.
 */
export function puede(estado: EstadoDePermisos, acceso: string | undefined, privilegio: string): boolean {
  if (estado.permisos === null || acceso === undefined) return false;
  return (estado.permisos[acceso] ?? []).includes(privilegio);
}
