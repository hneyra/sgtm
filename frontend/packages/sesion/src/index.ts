/**
 * **La puerta de sesion, compartida por las dos aplicaciones** (ADR-0016 §3).
 *
 * Estaba dentro de `apps/backoffice/src/app/sesion` y salio de ahi al separarse
 * `apps/portal` (#298): el portal se sirve **tras la misma sesion del
 * funcionario** mientras no exista el realm ciudadano —ADR-0009 §1 y §2 siguen
 * sin cumplirse—, asi que las dos aplicaciones necesitan la misma puerta.
 *
 * **Copiarla habria sido el error caro**: el canje de PKCE, la renovacion que no
 * desmonta nada y el vaciado de la cache al cambiar de municipalidad son tres
 * cosas que, duplicadas, divergen sin que nada se ponga rojo. Aqui hay una sola.
 *
 * Lo que **no** entra en el paquete es `catalogoVisible`: aplicar los permisos al
 * catalogo de navegacion es del back-office, que es quien tiene catalogo. El
 * portal no navega modulos (ADR-0016 §3), y por eso vive en
 * `apps/backoffice/src/app/sesion/useCatalogoVisible.ts`.
 */

export { ProveedorDeSesion, useSesion } from './ProveedorDeSesion';
export type { EstadoDeSesion, Sesion, ConfiguracionDeIdentidad } from './ProveedorDeSesion';
export { PuertaDeSesion } from './PuertaDeSesion';
export type { PuertaDeSesionProps } from './PuertaDeSesion';
export { alOlvidarLaSesion, olvidarLoDeLaSesion } from './olvidos';
export {
  NINGUNO,
  SIN_PROVEEDOR,
  permisosDelClaim,
  puedeEscribir,
  puedeRegistrar,
  puedeVer,
} from './permisos';
export type { PermisosEfectivos, Privilegio } from './permisos';
