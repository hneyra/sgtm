import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `seguridad` publica.
 *
 * <h2>Los siete privilegios, y el que no existe</h2>
 *
 * El dominio declara `EJECUCION`, `LECTURA`, `REGISTRO`, `MODIFICACION`,
 * `ELIMINACION`, `IMPRESION` y `ESPECIAL`. **No hay ninguno que se llame
 * «Total»**: el artboard lo dibuja como si implicara los otros seis, y es
 * `ESPECIAL` con otro nombre. La matriz usa los nombres del dominio.
 */
export const PRIVILEGIOS = [
  'EJECUCION',
  'LECTURA',
  'REGISTRO',
  'MODIFICACION',
  'ELIMINACION',
  'IMPRESION',
  'ESPECIAL',
] as const;

export type Privilegio = (typeof PRIVILEGIOS)[number];

/** Como se lee cada privilegio en pantalla. */
export const ROTULO_DEL_PRIVILEGIO: Record<Privilegio, string> = {
  EJECUCION: 'Ejecuta',
  LECTURA: 'Consulta',
  REGISTRO: 'Ingresa',
  MODIFICACION: 'Modifica',
  ELIMINACION: 'Anula',
  IMPRESION: 'Imprime',
  ESPECIAL: 'Especial',
};

/**
 * Las siete clases de acto que la bitacora reconoce. Es `Operacion` del
 * backend, **letra por letra**, y desde #544 tambien el `enum` que el contrato
 * publica para el parametro `operacion` de esta ruta.
 *
 * <h2>El que no esta, y el que no es de aqui</h2>
 *
 * No hay `ELIMINACION`: la aplicacion no borra (RNF-051), y lo que parece un
 * borrado es una `BAJA`, una `ANULACION` o una `REVERSION`. `ELIMINACION` si
 * existe, pero como **privilegio** —esta arriba, en `PRIVILEGIOS`—.
 *
 * <h2>Y ofrecerlo ya no sale gratis (#544)</h2>
 *
 * Antes daba una tabla vacia —indistinguible de «no hubo ninguno»— y ahora el
 * controlador lo **rechaza**: medido el 2026-09-01 contra la municipalidad 1,
 * `?operacion=ELIMINACION` contesta `422 VALIDACION` con «La operacion va entre
 * ALTA, MODIFICACION, BAJA, ANULACION, REVERSION, PERMISO, ACCESO:
 * 'ELIMINACION'». Por eso esta lista es la unica fuente del desplegable: una
 * palabra de mas no devuelve nada raro, deja la pantalla en rojo.
 *
 * Y el que mas pesa es el que faltaba: `PERMISO` son **1 453 de las 1 783** filas
 * del ejercicio 2026 —cada cambio de la matriz de accesos deja la suya
 * (ADR-0008 §5)—, que es justo lo que esta pantalla existe para poder mirar. La
 * bitacora crece, asi que la proporcion es de ese dia; el comportamiento no.
 */
export const OPERACIONES = [
  'ALTA',
  'MODIFICACION',
  'BAJA',
  'ANULACION',
  'REVERSION',
  'PERMISO',
  'ACCESO',
] as const;

export type Operacion = (typeof OPERACIONES)[number];

export type Modulo = { id: number; codigo: string; nombre: string; orden: number; activo: boolean };
export type Acceso = { id: number; moduloId: number; tipo: string; codigo: string; nombre: string; activo: boolean };

/**
 * Es `GrupoResource`.
 *
 * El campo de estado se llama **`habilitado`**, no `activo`: `Modulo` y
 * `Acceso` si usan `activo` y el parecido es lo que hizo el defecto. Con
 * `activo` aqui, `solicitar<T>` —que no valida en ejecucion— dejaba
 * `undefined`, y la pantalla marcaba TODOS los grupos como inactivos: el que
 * administra la municipalidad entera incluido.
 */
export type Grupo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  habilitado: boolean;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};
export type Usuario = {
  id: number;
  cuenta: string;
  nombre: string;
  correo: string | null;
  habilitado: boolean;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};

/** Es `PermisoResource`. **No trae `usuarioId`**: solo publica los del grupo. */
export type PermisoDeGrupo = { id: number; acceso: string; grupoId: number; privilegios: Privilegio[] };

/**
 * Una fila de la bitacora. Es `AuditoriaResource`, campo por campo.
 *
 * `observacion` **no** es opcional: el backend la declara sin `@Nullable`
 * porque ninguna escritura pasa sin ella (regla 10, RNF-052). Verificado sobre
 * las 500 ultimas filas de la municipalidad 1: 0 nulas. `origenEquipo` si es
 * nulo —en esas mismas 500, las 500—, y por eso no se dibuja columna para el.
 */
export type FilaDeAuditoria = {
  id: number;
  ejercicio: number;
  tabla: string;
  clave: string;
  operacion: string;
  usuario: string;
  origenEquipo: string | null;
  origenIp: string | null;
  fecha: string;
  observacion: string;
  /** El JSON de la fila antes y despues. Nulos en un ALTA y en un ACCESO. */
  datosAnteriores: string | null;
  datosNuevos: string | null;
};

export const listarModulos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Modulo>>('/seguridad/modulos', { parametros: { ...p }, senal: s });

export const listarAccesos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Acceso>>('/seguridad/accesos', { parametros: { ...p }, senal: s });

export const listarGrupos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Grupo>>('/seguridad/grupos', { parametros: { ...p }, senal: s });

export const listarUsuarios = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Usuario>>('/seguridad/usuarios', { parametros: { ...p }, senal: s });

/** Los permisos de UN grupo. Devuelve lista suelta, no el sobre paginado. */
export const permisosDelGrupo = (grupoId: number, s?: AbortSignal) =>
  solicitar<PermisoDeGrupo[]>(`/seguridad/grupos/${grupoId}/permisos`, { senal: s });

/**
 * La bitacora.
 *
 * `ejercicio` es OBLIGATORIO —sin el, 422— porque la tabla esta particionada
 * por ejercicio. Los filtros que funcionan son `usuario`, `tabla`, `operacion`,
 * `desde` y `hasta`.
 *
 * <h2>El orden hay que pedirlo</h2>
 *
 * `ParametrosDePaginacion` resuelve `direccion` a **`ASCENDENTE`** cuando no
 * viaja, y el orden por omision de esta operacion es `fecha`: sin pedir nada,
 * las 20 primeras filas son las 20 **mas antiguas** de la particion, o sea el
 * acta de instalacion del sistema. Quien llama tiene que mandar
 * `direccion: 'DESCENDENTE'` para que «ultimos movimientos» lo sean.
 */
export type FiltroDeAuditoria = {
  ejercicio: string;
  usuario?: string;
  tabla?: string;
  operacion?: string;
  desde?: string;
  hasta?: string;
};

export const listarAuditoria = (f: FiltroDeAuditoria, p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<FilaDeAuditoria>>('/seguridad/auditoria', { parametros: { ...f, ...p }, senal: s });

/**
 * Fija los privilegios de un grupo sobre uno o varios accesos.
 *
 * <h2>No es un reemplazo de la matriz, y eso decide que se manda</h2>
 *
 * `PermisosController` recorre `niveles` y hace un *upsert* **por acceso**; su
 * javadoc lo dice con todas las letras: «lo que **no** hace es borrar los
 * permisos que no vengan en el cuerpo. Un acceso ausente se queda como estaba».
 * Lo que si se reemplaza entero es la lista de privilegios **del acceso que
 * viaja**: mandar `privilegios: []` retira los siete, y eso es explicito.
 *
 * Por eso esta pantalla manda **solo los accesos que se tocaron**, no las 134
 * ni las que el filtro tenga en pantalla. Mandarlas todas seria escribir 134
 * permisos y 134 filas de auditoria por un clic; mandar «las visibles» seria
 * peor, porque cuales son depende del filtro que este puesto.
 *
 * Puede contestar **409** por la guarda del ultimo administrador: un cambio que
 * dejara a la municipalidad sin nadie capaz de administrar permisos se rechaza,
 * y de ahi no se sale por el sistema.
 */
export function fijarPermisosDelGrupo(
  grupoId: number,
  niveles: { acceso: string; privilegios: Privilegio[] }[],
  observacion: string,
): Promise<PermisoDeGrupo[]> {
  return solicitar(`/seguridad/grupos/${grupoId}/permisos`, {
    metodo: 'PUT',
    cuerpo: { niveles, observacion },
  });
}

/**
 * Una copia de seguridad registrada. Es `RespaldoResource`.
 *
 * **No publica ninguna fecha de restauracion probada**, que es la unica columna
 * que el artboard consideraba interesante. La pantalla lo dice en vez de
 * inventarla.
 */
export type Respaldo = {
  id: number;
  inicio: string;
  fin: string | null;
  resultado: string;
  destino: string;
  tamanoBytes: number | null;
  detalle: string | null;
};

/**
 * El estado de las copias.
 *
 * Es un `POST` que **consulta**: asi lo declara el contrato, derivado de la
 * pantalla del prototipo. La paginacion viaja igualmente por la consulta.
 */
export const listarRespaldos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Respaldo>>('/seguridad/respaldos', {
    metodo: 'POST',
    parametros: { ...p },
    senal: s,
  });

/**
 * Un conjunto de parametros de un ejercicio, con su estado. Es
 * `ParametrosController.ConjuntoResource`.
 *
 * **No lleva ninguna cifra**, y es a proposito: lo que esta operacion publica es
 * la IDENTIDAD del juego de valores con que se emitio un ejercicio —cual, en que
 * version y si esta sellado—, no la UIT ni las alicuotas. Una vez sellado, el
 * conjunto es inmutable y esa es la garantia de que recalcular 2027 en 2037 da
 * el mismo centimo.
 */
export type ConjuntoDeParametros = {
  id: number;
  ejercicio: number;
  version: number;
  estado: string;
  fechaSellado: string | null;
  usuarioSellado: string | null;
};

export const listarConjuntosDeParametros = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<ConjuntoDeParametros>>('/seguridad/parametros', {
    parametros: { ...p },
    senal: s,
  });
