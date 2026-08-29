/**
 * Lo que la aplicacion sabe de **como esta desplegada**, en un solo sitio.
 *
 * Hoy una cosa: si el proxy de datos esta contestando o si al otro lado hay un
 * backend de verdad. La expresion es la misma que usa `main.tsx` para decidir si
 * lo instala, y **no** una llamada a `@sgtm/api-mock`: importar el paquete del
 * proxy desde la aplicacion lo meteria en el paquete de produccion, que es justo
 * lo que `yarn comprobar-compilaciones` mide que no pase.
 *
 * **Vive en su propio modulo para que se pueda probar.** De esto cuelga la
 * guarda que hace segura la simulacion de una determinacion (#393), y una
 * guarda que ninguna prueba puede romper no protege nada: leida en linea desde
 * `useSimulacion`, no habia forma honesta de montar la pantalla «como si el
 * backend contestara». Con un modulo aparte, la prueba lo sustituye y comprueba
 * que la accion desaparece.
 */
export const proxyDeDatosContestando = (): boolean =>
  import.meta.env['VITE_SGTM_PROXY_DE_DATOS'] !== 'false';
