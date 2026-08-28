/**
 * **Lo que hay que olvidar cuando la sesion deja de ser la misma** (#296).
 *
 * `ProveedorDeSesion` ya vacia la cache de consultas en los dos caminos que
 * cambian de quien —`salir` y `cambiarDeMunicipalidad`—, y **ninguno de los dos
 * recarga la pagina**: el cierre solo recarga si hay `finDeSesion` configurado,
 * y el cambio de municipalidad no recarga nunca, que es exactamente el motivo
 * de que ese `clientes.clear()` exista (FRO-01 §4). Todo lo que viva en una
 * variable de modulo sobrevive a los dos.
 *
 * ── Por que un registro y no una llamada directa ───────────────────────────
 *
 * Lo que hay que olvidar hoy son **las atenciones recientes**, y viven en
 * `pantallas/inicio/atenciones.ts`. Que `app/sesion` importara esa pantalla
 * invertiria las capas: el arranque de la sesion pasaria a depender de una de
 * las 134, y la siguiente memoria que aparezca —en otro modulo— obligaria a
 * importarla tambien aqui.
 *
 * Con el registro la dependencia va en el sentido bueno: **quien tiene memoria
 * se apunta**, y la sesion solo sabe que hay una lista de olvidos que ejecutar.
 * Es lo mismo que hace `configurarRenovacion` en `@sgtm/api-client` —el cliente
 * HTTP no importa el proveedor de React; el proveedor le deja su funcion—.
 *
 * La alternativa era llavear el almacen por `datos.municipalidad`, y es peor por
 * dos motivos: no arregla el cierre de sesion —el operador siguiente en el mismo
 * puesto y la misma municipalidad seguiria viendo a quien atendio el anterior—,
 * y guarda lo que hay que borrar en vez de borrarlo.
 */

/** Los olvidos apuntados, en el orden en que se apuntaron. */
const olvidos: (() => void)[] = [];

/**
 * Apunta algo que se olvida al cambiar de sesion.
 *
 * Se llama **al cargar el modulo** que tiene la memoria, no al montar un
 * componente: la memoria sobrevive al desmontaje —de eso se trata— y una
 * suscripcion atada a un `useEffect` se iria justo cuando la pantalla se cierra.
 * No hay que darlo de baja porque no hay nada a lo que sobreviva: el modulo dura
 * lo que el documento.
 */
export function alOlvidarLaSesion(olvidar: () => void): void {
  olvidos.push(olvidar);
}

/**
 * Olvida todo lo apuntado. La llama `ProveedorDeSesion` **junto al vaciado de la
 * cache**, en los dos caminos, y no en un `useEffect` sobre el token: renovar
 * cambia el token cada pocos minutos sin cambiar de persona.
 */
export function olvidarLoDeLaSesion(): void {
  for (const olvidar of olvidos) olvidar();
}
