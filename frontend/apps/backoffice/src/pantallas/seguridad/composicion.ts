import type { ComposicionDeOpcion } from '../composicion';

/**
 * Lo que Seguridad compone alrededor de los diez bloques comunes.
 *
 * Hoy, una sola opcion: la bitacora (#544).
 */

/**
 * El vocabulario del filtro «Acción», que es el de la bitacora y no el del prototipo.
 *
 * Son las siete palabras que admite `auditoria.operacion` (V5) y que declara el enumerado
 * `Operacion`; el contrato las publica como `enum` del parametro, y una prueba compara esta lista
 * con la suya letra por letra.
 *
 * **Por que no son las cinco del desplegable del manual.** El prototipo ofrece Todas / ALTA /
 * MODIFICACIÓN / ELIMINACIÓN / ANULACIÓN / ACCESO, y de esas: dos coinciden, dos difieren solo en
 * la tilde que ningun identificador de este sistema lleva, y **ELIMINACIÓN no existe ni puede
 * existir** —la aplicacion no borra (RNF-051, regla 4), y lo que parece un borrado es una BAJA, una
 * ANULACION o una REVERSION—. Al reves, la bitacora registra tres clases que el desplegable no
 * ofrece, y una de ellas es **PERMISO**: los cambios de la propia seguridad, que ADR-0008 §5 anadio
 * precisamente para que quien administra permisos no pueda alterar su pista sin dejar rastro. Un
 * desplegable sin PERMISO deja esa pregunta sin poder hacerse.
 *
 * Traducir «ELIMINACIÓN» a BAJA porque se parecen es lo que #427 se nego a hacer con «ACTIVA» y
 * VIGENTE, y aqui saldria peor: en la fila del prototipo que dice «Eliminación», la opcion es «Baja
 * de deuda», asi que la traduccion parece obvia y sigue siendo una suposicion sobre un acto
 * administrativo.
 */
export const OPERACIONES_DE_LA_BITACORA = [
  'ALTA',
  'MODIFICACION',
  'BAJA',
  'ANULACION',
  'REVERSION',
  'PERMISO',
  'ACCESO',
] as const;

/** La primera opcion del desplegable: «sin filtrar». No viaja (ver `seguridad/index.ts`). */
export const TODAS = 'Todas';

export const COMPOSICION_DE_SEGURIDAD: Readonly<Record<string, ComposicionDeOpcion>> = {
  /**
   * La bitacora filtra por lo que la bitacora guarda (#544).
   *
   * El catalogo dibuja «Acción» con la clave `accion`, que el contrato declaraba y **ningun
   * parametro del controlador leia**: se tecleaba, viajaba y el listado salia entero —medido sobre
   * las 1 441 filas de la municipalidad 1—. No era un filtro sin implementar sino `operacion` con
   * el nombre del prototipo, asi que lo que cambia es el nombre y el vocabulario, no el sitio: el
   * control se dibuja donde el manual lo dibuja y con su rotulo (RNF-080).
   *
   * Y «Tabla» se anade porque el servicio acota por ella desde #13 y el manual no la dibuja. Su
   * vocabulario es el de la bitacora —el nombre de la tabla afectada: `recibo`, `predio`,
   * `sesion`—, que es lo que la columna «Opción» de la grilla ensena en cuanto el backend sirve
   * esta ruta; mientras responda el proxy, esa columna trae el texto que capturo el prototipo
   * («Anulación de recibo»), que no es el nombre de ninguna tabla. Eso **no se traduce en el
   * proxy**: de «Eliminación» a BAJA hay una suposicion, y de «Anulación de recibo» a `recibo`,
   * dos.
   */
  auditoria: {
    filtrosDelBackend: [
      {
        enVezDe: 'accion',
        campo: {
          clave: 'operacion',
          label: 'Acción',
          t: 'sel',
          opts: [TODAS, ...OPERACIONES_DE_LA_BITACORA],
        },
      },
      {
        campo: {
          clave: 'tabla',
          label: 'Tabla',
          t: 'text',
          ph: 'recibo, predio, sesion…',
        },
      },
    ],
  },
};
