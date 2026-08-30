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
 * Sigue vacia aunque el backend sirva ya 178 de las 179 operaciones del
 * contrato, y eso es deliberado: una ruta aqui que el backend no conteste
 * **falla ruidosamente**, y las pruebas y la compilacion del frontend corren sin
 * ningun Spring Boot al lado. Encenderlas es cosa de quien tiene los dos
 * procesos levantados —ver «Los dos procesos, juntos» en `frontend/README.md`—.
 *
 * **Anadir una linea aqui no es configurar: es afirmar algo**, y desde #400 hay
 * quien lo comprueba. `verificaciones/rutas-encendidas.test.ts` exige de cada
 * entrada que sea una operacion del contrato letra por letra —una errata no
 * casa con nada, no deja pasar nada y **deja la integracion parada con aspecto
 * de estar hecha**—, que alguna pantalla declare como consumirla, y que si la
 * interfaz lee lo que vuelve, el proxy se lo de ya con la forma del backend.
 * Alli mismo esta el censo: cuantas se pueden encender hoy y cuantas necesitan
 * trabajo antes.
 */
export interface OperacionServida {
  readonly metodo: string;
  /** Camino del contrato, relativo a `/api/v1`, con sus parametros entre llaves. */
  readonly ruta: string;
}

export const YA_SERVIDAS: readonly OperacionServida[] = [
  /* ── Catastro: el territorio y la consulta de fichas ──────────────────
     Las tres primeras encendidas, y las tres vistas leer del backend con los
     dos procesos levantados: PostgreSQL con el padron de la municipalidad
     sembrada, la aplicacion en el perfil `web` y un emisor OIDC contestando el
     JWKS. No se encendieron «porque el backend las tiene»: se encendieron
     habiendo mirado lo que contestan.

     Las cuatro fichas individuales —`/catastro/fichas/{tipo}/{codigo}`— NO
     estan, y no por olvido: contestan 500. `FichaController.predioDe` resuelve
     el predio **desde el controlador**, fuera de transaccion, asi que corre sin
     el `SET LOCAL app.municipalidad_id` y la politica RLS rechaza la consulta
     con «invalid input syntax for type bigint: ""». Es el defecto que el javadoc
     de `InscribirFicha` advierte con todas las letras y el que `ConsultaDeVias`
     ya cerro una vez. */
  { metodo: 'GET', ruta: '/catastro/vias' },
  { metodo: 'GET', ruta: '/catastro/sectores' },
  { metodo: 'GET', ruta: '/catastro/fichas' },
];

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
