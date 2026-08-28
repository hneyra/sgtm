import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';
import { CodigoCatastral } from './CodigoCatastral';
import { normalizarCodigoCatastral } from './codigo';
import { ResumenDeFicha } from './ResumenDeFicha';

/**
 * Los formularios de alta, **cargados cuando se abren**.
 *
 * Este archivo lo importa `pantallas/composicion.ts`, y ese lo importa
 * `Pantalla`: importar aqui el asistente de cuatro pasos —700 lineas— y las tres
 * altas del territorio los metia en el trozo de arranque, que es el que baja
 * quien entra a mirar un recibo y no va a dar de alta nada. `lazy` los deja
 * donde tienen que estar: en un trozo aparte que solo pide quien pulsa «Nuevo».
 */
const AltaGuiadaDeFicha = lazy(async () => ({
  default: (await import('./AltaGuiadaDeFicha')).AltaGuiadaDeFicha,
}));
const AltaDeVia = lazy(async () => ({ default: (await import('./altas')).AltaDeVia }));
const AltaDeSector = lazy(async () => ({ default: (await import('./altas')).AltaDeSector }));
const AltaDeManzana = lazy(async () => ({ default: (await import('./altas')).AltaDeManzana }));

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
  consulta_fichas: {
    widgetsDeFiltro: CODIGO('codRefCatastral'),
    // **«Conciliada con rentas» garantiza un 422** (ADR-0015 §2).
    // `ConsultaController` lo rechaza con cualquier valor —«Todas» incluida, en
    // cuanto se elige y viaja—, porque la lectura que lo respondería vive en
    // rentas y todavia no existe. Vivo, este desplegable era la unica forma de
    // romper la busqueda desde la propia pantalla; ninguna prueba lo veia porque
    // el proxy de datos ignora los filtros.
    //
    // Mismo trato que «Conciliar seleccionadas»: se ve, no se puede usar, y dice
    // por que. El motivo se redacta en `prosa-textos.ts`; aqui solo se declara.
    filtrosBloqueados: ['conciliadaConRentas'],
  },
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
