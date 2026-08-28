/**
 * Los permisos del manual, vistos desde la interfaz (REQ-03, ADR-0005).
 *
 * > **Que la interfaz oculte una opcion es comodidad, no seguridad** (REQ-03
 * > §5). La comprobacion es del servidor, que responde 403 igual. Esto reduce
 * > el error y la superficie de exploracion; no protege nada por si solo.
 *
 * **Las 134 opciones son 134 accesos**: el identificador de la opcion del
 * catalogo **es** la clave del permiso. No hay una segunda lista que mantener
 * sincronizada, y por eso una opcion nueva en el catalogo es permisible sin
 * tocar una linea de esto.
 */

/** Los siete privilegios del manual, en el orden en que los enumera. */
export type Privilegio =
  'ejecucion' | 'lectura' | 'registro' | 'modificacion' | 'eliminacion' | 'impresion' | 'especial';

const PRIVILEGIOS: readonly Privilegio[] = [
  'ejecucion',
  'lectura',
  'registro',
  'modificacion',
  'eliminacion',
  'impresion',
  'especial',
];

/**
 * Los permisos efectivos: la union de los del usuario y los de sus grupos, ya
 * restringidos por vigencia y habilitacion (REQ-03 §5).
 *
 * La union y el recorte los hace **el servidor**, con la misma precedencia que el
 * guardia; aqui llega el resultado ya resuelto. Se pide una vez por sesion a
 * `GET /seguridad/sesion/permisos` (ADR-0013): el token solo autentica, la
 * autorizacion vive en la base (ADR-0005). El sitio donde se lee es uno solo.
 */
export interface PermisosEfectivos {
  readonly porOpcion: Readonly<Record<string, readonly Privilegio[]>>;
  /**
   * No hay permisos que aplicar porque no hay proveedor de identidad: se
   * trabaja como contra el proxy de datos. **No es «puede todo» en produccion**,
   * es «aqui no hay sesion que consultar».
   */
  readonly sinProveedor: boolean;
}

export const SIN_PROVEEDOR: PermisosEfectivos = { porOpcion: {}, sinProveedor: true };

/** Nadie ve nada: negacion por omision (REQ-03 §1, regla 5). */
export const NINGUNO: PermisosEfectivos = { porOpcion: {}, sinProveedor: false };

/**
 * Interpreta la matriz que devuelve `GET /seguridad/sesion/permisos`: un objeto
 * `{ opcion: [privilegios] }`.
 *
 * Si la peticion falla, o la respuesta no tiene forma de matriz, se devuelve
 * {@link NINGUNO}: la autorizacion del manual es **de negacion por omision**, y un
 * menu vacio dice la verdad mucho mejor que un menu completo que falla en cada
 * pulsacion.
 */
export function permisosDelClaim(matriz: unknown): PermisosEfectivos {
  if (typeof matriz !== 'object' || matriz === null) return NINGUNO;

  const porOpcion: Record<string, readonly Privilegio[]> = {};
  for (const [opcion, valor] of Object.entries(matriz as Record<string, unknown>)) {
    const privilegios = Array.isArray(valor)
      ? valor.filter((p): p is Privilegio => PRIVILEGIOS.includes(p as Privilegio))
      : [];
    if (privilegios.length > 0) porOpcion[opcion] = privilegios;
  }
  return { porOpcion, sinProveedor: false };
}

const privilegiosDe = (permisos: PermisosEfectivos, opcion: string): readonly Privilegio[] =>
  permisos.porOpcion[opcion] ?? [];

/** Se ve la opcion si se tiene algun privilegio sobre ella. */
export function puedeVer(permisos: PermisosEfectivos, opcion: string): boolean {
  return permisos.sinProveedor || privilegiosDe(permisos, opcion).length > 0;
}

/**
 * Se puede escribir con `registro` o `modificacion`.
 *
 * Es lo que el manual llama niveles de accesibilidad, y **apagan acciones, no
 * opciones**: ver una ficha sin poder modificarla es un caso normal de un
 * perfil de consulta, no un error.
 */
export function puedeEscribir(permisos: PermisosEfectivos, opcion: string): boolean {
  if (permisos.sinProveedor) return true;
  const privilegios = privilegiosDe(permisos, opcion);
  return privilegios.includes('registro') || privilegios.includes('modificacion');
}

/**
 * Se puede **dar de alta** solo con `registro`.
 *
 * Es mas estricto que {@link puedeEscribir} a proposito, y no por simetria: el
 * backend exige `REGISTRO` en los tres `POST` del catalogo territorial y en el
 * alta de una ficha (`SectorController`, `ViaController`, `FichaController`).
 * Un perfil que solo corrige lo que ya existe —`modificacion`— puede editar una
 * via y no puede crear un sector, y ofrecerle el panel de alta seria ofrecerle
 * un formulario que el servidor va a rechazar con 403 despues de rellenarlo.
 */
export function puedeRegistrar(permisos: PermisosEfectivos, opcion: string): boolean {
  if (permisos.sinProveedor) return true;
  return privilegiosDe(permisos, opcion).includes('registro');
}

/*
 * **`catalogoVisible` no esta aqui, y es deliberado** (#298).
 *
 * Aplicar estos permisos al catalogo de navegacion es del back-office: es quien
 * tiene catalogo. El portal del contribuyente no navega modulos (ADR-0016 §3),
 * asi que esa funcion vive junto a su unico usuario, en
 * `apps/backoffice/src/app/sesion/useCatalogoVisible.ts`. Traerla aqui obligaria
 * ademas a que este paquete conociera los tipos del catalogo del back-office, que
 * es la dependencia que la separacion existe para no tener.
 */
