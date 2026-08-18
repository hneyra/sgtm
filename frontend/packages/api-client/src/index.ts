export { solicitar, guardarToken, hayToken, nuevaClaveDeIdempotencia } from './cliente';
export { ProblemaDeApi } from './cliente';
export type { ProblemDetails, OpcionesDeSolicitud } from './cliente';
export { pedirDatosDePantalla } from './pantallas';
export type {
  DatosDePantalla,
  DatosDeTabla,
  DatosDeReporte,
  ValorDeCampo,
  Celda,
  TonoDeCelda,
  Kpi,
  Panel,
  FilaDePanel,
  Total,
} from './pantallas';
export { descriptorDe, rutaDeOperacion, consultaDeOperacion, pedirOperacion } from './operaciones';
export { OPERACIONES } from './operaciones.generado';
export type {
  VerboDeOperacion,
  DescriptorDeOperacion,
  CuerpoSinEsquema,
  IdDeOperacion,
  ParametrosPorOperacion,
  CuerpoPorOperacion,
  RespuestaPorOperacion,
  ParametrosDe,
  CuerpoDe,
  RespuestaDe,
} from './operaciones.generado';
