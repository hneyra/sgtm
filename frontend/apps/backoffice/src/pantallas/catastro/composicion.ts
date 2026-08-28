import type { ComposicionDeOpcion } from '../composicion';
import { CodigoCatastral } from './CodigoCatastral';
import { normalizarCodigoCatastral } from './codigo';
import { ResumenDeFicha } from './ResumenDeFicha';
import { AltaDeManzana, AltaDeSector, AltaDeVia } from './altas';
import { AltaGuiadaDeFicha } from './AltaGuiadaDeFicha';

/**
 * Lo que Catastro compone alrededor de los bloques comunes (#318, #319).
 *
 * Tres cosas, y las tres opt-in por opcion: el codigo de referencia catastral se
 * compone en tramos en vez de teclearse de corrido, las cuatro fichas abren con
 * una cabecera-resumen y un indice de secciones, y las dos que se abren **por el
 * codigo catastral** llevan a su acto —actualizar— con el predio ya puesto.
 */

/** A donde lleva actualizar un predio, con su codigo en la ruta. */
const ACTO_DE_ACTUALIZAR = {
  etiqueta: 'Actualizar catastro',
  rutaDe: (codigo: string): string =>
    `/catastro/actualizacion-catastro/${encodeURIComponent(codigo)}`,
};

/**
 * La cabecera-resumen y el indice, que las cuatro fichas comparten.
 *
 * El acto **no** entra aqui: dos de las cuatro se abren por un identificador que
 * no es el codigo de referencia catastral —`codEdificacion` en bienes comunes,
 * `codUnidad` en rural—, y «Actualización del catastro» abre su predio pidiendo
 * `ficha_urbana` por `codRefCatastral`. Mandarle el codigo de una edificacion
 * seria ofrecer un boton que lleva a un 404, que es peor que no ofrecerlo.
 */
const FICHA: ComposicionDeOpcion = { resumen: ResumenDeFicha, indice: true };

/**
 * El control del codigo, declarado **campo a campo**.
 *
 * Solo donde el campo **es** el codigo de referencia catastral. `codEdificacion`
 * (bienes comunes) es el codigo sin el tramo de unidad y `codUnidadCatastralUc`
 * (rural) no es un codigo catastral en absoluto —`11024-0418`, con guion—:
 * troquelar cualquiera de los dos en los diez tramos del manual diria de ellos
 * algo que no es cierto, y ademas impediria escribirlos.
 */
const CODIGO = (clave: string): ComposicionDeOpcion['widgetsDeFiltro'] => ({
  [clave]: { Control: CodigoCatastral, normalizar: normalizarCodigoCatastral },
});

export const COMPOSICION_DE_CATASTRO: Readonly<Record<string, ComposicionDeOpcion>> = {
  consulta_fichas: { widgetsDeFiltro: CODIGO('codRefCatastral') },
  ficha_urbana: {
    ...FICHA,
    widgetsDeFiltro: CODIGO('codigoDeRefCatastral'),
    acto: ACTO_DE_ACTUALIZAR,
    // El «Nuevo» que el prototipo dibuja, con algo detras: el alta guiada de
    // cuatro pasos (#320). Va en la ficha urbana y no en las otras tres porque
    // es la unica que se abre por el codigo de referencia catastral, que es
    // exactamente lo que el paso 2 compone y comprueba.
    flujo: { accion: 'Nuevo', titulo: 'Nueva ficha urbana', Asistente: AltaGuiadaDeFicha },
  },
  // El catalogo vial: hasta hoy su «Nuevo» estaba dibujado y muerto (#321).
  calles: {
    altas: [
      {
        accion: 'Nuevo',
        titulo: 'Nueva vía',
        descripcion:
          'La nomenclatura vial alimenta el domicilio fiscal y la ubicación del predio. Su tipo sale del catálogo: con texto libre, la misma calle entra tres veces.',
        Formulario: AltaDeVia,
      },
    ],
  },
  // Los sectores, con sus manzanas colgando de la fila. El alta de una manzana
  // cuelga del sector porque es como se identifica: la 001 del sector 01 y la
  // 001 del 02 son manzanas distintas, y elegir el sector aparte se prestaria a
  // darla de alta en el que no era.
  sectores: {
    altas: [
      {
        accion: 'Nuevo sector',
        titulo: 'Nuevo sector',
        descripcion:
          'El código de un sector es un tramo del código catastral de todos sus predios, así que después no se cambia: la edición no lo toca y la baja es lógica.',
        Formulario: AltaDeSector,
      },
    ],
    altaDeFila: {
      accion: '+ Añadir manzana',
      titulo: 'Nueva manzana del sector',
      descripcion: 'La manzana se da de alta dentro del sector que se desplegó.',
      Formulario: AltaDeManzana,
    },
  },
  ficha_economica: {
    ...FICHA,
    widgetsDeFiltro: CODIGO('codigoDeRefCatastral'),
    acto: ACTO_DE_ACTUALIZAR,
  },
  ficha_bienes: FICHA,
  ficha_rural: FICHA,
};
