/**
 * Las operaciones que el backend **ya sirve de verdad**.
 *
 * El proxy de datos las deja pasar: la peticion sale a `/api/v1`, Vite la
 * reenvia al Spring Boot local y la respuesta es la del backend. Todo lo demas
 * lo sigue contestando el proxy.
 *
 * Por que hace falta un modo intermedio: el backend no va a existir de golpe,
 * llega contexto por contexto, en seis ondas. Sin esto, la integracion seria un
 * unico salto de 134 operaciones que nadie puede probar; con esto, cada issue de
 * modulo mueve sus rutas aqui y se comprueba una a una.
 *
 * **Esta lista crece hasta cubrir las 134, y entonces desaparece**: con el
 * backend sirviendolo todo, el proxy se apaga —`VITE_SGTM_PROXY_DE_DATOS=false`—
 * y este archivo se borra. El modo intermedio es transitorio, y su final es
 * parte del trabajo, no un pendiente que se queda.
 *
 * Sigue vacia aunque el backend ya sirva las once operaciones de seguridad
 * (#9, #12, #13), y eso es deliberado: una ruta aqui que el backend no conteste
 * **falla ruidosamente**, y las pruebas y la compilacion del frontend corren sin
 * ningun Spring Boot al lado. Encenderlas es cosa de quien tiene los dos
 * procesos levantados —ver «Los dos procesos, juntos» en `frontend/README.md`—.
 *
 * Lo que si esta hecho es lo que hacia falta para poder encenderlas: las
 * pantallas de seguridad **ya leen el recurso que publica el backend**, y el
 * proxy lo publica con esa misma forma (`seguridad.ts`). El dia que se muevan
 * aqui no cambia ni una linea de la interfaz.
 */
export interface OperacionServida {
  readonly metodo: string;
  /** Camino del contrato, relativo a `/api/v1`, con sus parametros entre llaves. */
  readonly ruta: string;
}

export const YA_SERVIDAS: readonly OperacionServida[] = [];

/** `/rentas/vehiculos/{placa}` → `^/api/v1/rentas/vehiculos/[^/]+$`. */
function compilar(ruta: string): RegExp {
  const escapado = ruta
    .split(/(\{\w+\})/)
    .map((trozo) =>
      /^\{\w+\}$/.test(trozo) ? '[^/]+' : trozo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^/api/v1${escapado}$`);
}

export function laSirveElBackend(
  servidas: readonly OperacionServida[],
  metodo: string,
  camino: string,
): boolean {
  const buscado = metodo.toUpperCase();
  return servidas.some(
    (operacion) =>
      operacion.metodo.toUpperCase() === buscado && compilar(operacion.ruta).test(camino),
  );
}
