/**
 * **Lo que se lee del contrato, compartido por las dos aplicaciones** (#298).
 *
 * `apps/backoffice` y `apps/portal` ensenan **las mismas cifras a la misma fecha
 * de calculo** de la misma persona (ADR-0016 §2 y §3). Lo que las dos comparten
 * no es una pantalla —una es de ventanilla y la otra cabe en 390 px— sino los
 * **adaptadores**: como se abre un cuerpo del contrato, como se lee la identidad
 * del padron y que sale de cada seccion de `consulta_unificada`.
 *
 * Sin este paquete la separacion habria copiado esos adaptadores, y dos copias
 * del mismo lector acaban leyendo campos distintos —una de ellas el importe sin
 * su fecha— sin que nada se ponga rojo.
 *
 * Aqui no hay React, ni catalogo, ni peticiones: son funciones puras de un
 * cuerpo JSON a lo que se dibuja. Quien pide es cada aplicacion, siempre por
 * `solicitar()` de `@sgtm/api-client`.
 */

export { SIN_DATO, esObjeto, importeDe, leerObjeto, leerPaginado, texto } from './contrato';
export type { ImporteConFecha } from './contrato';

export {
  LOS_TRES_FILTROS_DEL_PADRON,
  documentoDe,
  identidadPorCodigo,
  identidadesQueCoinciden,
} from './identidad';
export type { ClaveDelPadron, Identidad } from './identidad';

export {
  ESTADO_DE_LA_CONSULTA,
  REJILLAS_DE_LA_UNIFICADA,
  RESUMEN_DE_SALDOS,
  conteoDeLaRejilla,
  fechaDeCorteDe,
  resumenDeSaldosDe,
  seccionDeLaFicha,
} from './unificada';
export type { RejillaDeLaFicha, SeccionDeLaFicha } from './unificada';
