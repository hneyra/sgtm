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

export type Modulo = { id: number; codigo: string; nombre: string; orden: number; activo: boolean };
export type Acceso = { id: number; moduloId: number; tipo: string; codigo: string; nombre: string; activo: boolean };
export type Grupo = { id: number; nombre: string; descripcion: string | null; activo: boolean };
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

/** Una fila de la bitacora. Es el recurso de auditoria. */
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
  observacion: string | null;
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
