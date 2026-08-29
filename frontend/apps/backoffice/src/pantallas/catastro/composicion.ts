import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';
import { CodigoCatastral } from './CodigoCatastral';
import { normalizarCodigoCatastral } from './codigo';

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
 * Dos cosas, y las dos opt-in por opcion: el codigo de referencia catastral se
 * compone en tramos en vez de teclearse de corrido, y la ficha del predio lleva
 * a su acto —actualizar— con el predio ya puesto.
 *
 * **La cabecera-resumen y el indice de secciones ya no se declaran aqui**: desde
 * la propuesta A las cuatro fichas y la actualizacion las dibuja
 * `FichaDelPredio.tsx`, que trae las suyas. Declararlas para una opcion que el
 * renderizador comun ya no sirve seria una declaracion que nadie lee, y ademas
 * arrastraba `ResumenDeFicha` al trozo de arranque —este archivo lo importa
 * `Pantalla`— para una cabecera que solo se dibuja dentro de un trozo perezoso.
 */

/**
 * **La anatomia de las doce, en un sitio** (#391 §4).
 *
 * La anatomia es **el orden y las ranuras**, no los tres bloques repetidos doce
 * veces: cada superficie llena las que tiene, y donde una no aplica se dice por
 * que. Forzar los tres en las doce seria uniformidad de adorno, y en alguna
 * exigiria inventar un dato que el backend no publica (ADR-0010 §4).
 *
 * El orden lo impone `Pantalla` (FRO-03 §5) y las tres superficies propias lo
 * repiten: **aviso → cabecera-resumen → versionado → filtros → tabla → totales →
 * indice + formulario → barra de acciones**.
 *
 * | Opcion | Superficie | Cabecera | Versionado | Indice |
 * |---|---|---|---|---|
 * | `ficha_urbana`, `ficha_economica`, `ficha_bienes`, `ficha_rural`, `actualizacion_catastro` | `FichaDelPredio` | si, `ResumenDeFicha` | si | si |
 * | `sectores` | `Territorio` | si, lo senalado en el arbol | no aplica | no aplica |
 * | `calles` | `Territorio` | si, lo senalado en el arbol | no aplica | si |
 * | `aranceles`, `valores_unitarios`, `depreciacion` | `CuadroDeValuacion` | si, el cuadro del ejercicio | no aplica | no aplica |
 * | `consulta_fichas` | `Pantalla` | **vacia** | no aplica | no aplica |
 * | `ficha_contribuyente_reporte` | `Pantalla` | **vacia** | no aplica | no aplica |
 *
 * Las dos que sirve el renderizador comun no declaran `resumen` ni `indice`, y
 * **eso es la decision, no un olvido**:
 *
 *   consulta_fichas   **es una lista, no un registro abierto.** Su ranura de
 *                     cabecera queda vacia porque no hay un registro que
 *                     resumir: lo que hay son cinco filtros y una tabla de
 *                     predios, y cada uno se abre en su ficha —donde si tiene
 *                     cabecera—. Resumir «la busqueda» seria contar cuantas
 *                     filas hay, que ya lo dice el conteo de la tabla. Sin
 *                     secciones en el catalogo tampoco hay indice: es filtros,
 *                     tabla y acciones
 *   ficha_contribuyente_reporte
 *                     **es una hoja de reporte, y su anatomia es la de la
 *                     hoja**: `kind: 'report'`, con su cabecera membretada, su
 *                     cuerpo y su pie de firmas, que dibuja `bloques/Reporte`.
 *                     No declara filtros, ni secciones, ni acciones, asi que no
 *                     hay ranura de cabecera-resumen que llenar ni indice que
 *                     poner: el papel se lee de arriba abajo y su indice es el
 *                     propio membrete
 *
 * Y **ninguna de las doce lleva banda de versionado fuera de la ficha**: lo
 * unico que el backend versiona en Catastro es la ficha catastral (#18). El
 * territorio no —`SectorResource` y `ViaResource` publican el registro tal como
 * esta— y los cuadros tampoco: se sellan por conjunto (ADR-0007), y de eso no
 * publica nada ni el recurso ni el contrato.
 *
 * <h2>Lo que se ve al uniformar y no se toca todavia</h2>
 *
 * En la ficha del predio, la apostilla de la cabecera-resumen —«v3 · desde
 * 12/03/2026 · FISCALIZACION»— y la primera linea de la banda de versionado
 * dicen **lo mismo**: que version rige, desde cuando y de donde salio. Con las
 * doce puestas en la misma anatomia eso se ve, y no se quita aqui:
 *
 * - lo que la banda tiene y la cabecera no es **el historico con su
 *   observacion**, que es la mitad util del versionado (`bloques/Versionado`):
 *   el diff dice que el area paso de 120 a 180 y solo la observacion dice que
 *   fue una fiscalizacion de campo. Quitar la banda se llevaria eso por delante;
 * - quitar la apostilla dejaria la cabecera sin fechar la ficha, y **los cuatro
 *   datos que ensena son de esa version** (regla 9): el titular, el uso y el
 *   area de terreno son los de la version que rige, no los de hoy.
 *
 * Cual de las dos mitades se recorta —y si se recorta— es una decision de
 * contenido, no de anatomia, y merece su propio diff.
 */

/** A donde lleva actualizar un predio, con su codigo en la ruta. */
const ACTO_DE_ACTUALIZAR = {
  etiqueta: 'Actualizar catastro',
  rutaDe: (codigo: string): string =>
    `/catastro/actualizacion-catastro/${encodeURIComponent(codigo)}`,
};

/**
 * El control del codigo, declarado **campo a campo**.
 *
 * Donde el campo **es** el codigo de referencia catastral, que son tres de las
 * cinco pantallas de la ficha: las dos que el prototipo rotula «Código de Ref.
 * Catastral» y la actualizacion, que lo rotula «Cod. Ref. Catastral».
 *
 * `codEdificacion` (bienes comunes) y `codUnidadCatastralUc` (rural) se quedan
 * fuera: el prototipo los declara como identificadores propios —el segundo lleva
 * guion, `11024-0418`— y troquelarlos en los diez tramos del manual diria de
 * ellos algo que su pantalla no dice, y ademas impediria escribirlos. (Lo que el
 * **backend** hace con esos dos parametros es otra cosa, y esta contada en el
 * docblock de `FichaDelPredio`: los tres nombres reciben el mismo codigo.)
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
  // La actualizacion es el **modo de edicion** de la pestana Valorizacion
  // (propuesta A), y sigue teniendo ruta propia: se abre por el codigo del
  // predio, compuesto en sus tramos como en las dos fichas que lo rotulan igual.
  actualizacion_catastro: { widgetsDeFiltro: CODIGO('codRefCatastral') },
  ficha_urbana: {
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
  /* Los sectores, con sus manzanas colgando del nodo del arbol. El alta de una
     manzana cuelga del sector porque es como se identifica: la 001 del sector 01
     y la 001 del 02 son manzanas distintas, y elegir el sector aparte se
     prestaria a darla de alta en el que no era.

     **Las dos altas las abre `catastro/Territorio.tsx`**, no la barra de
     acciones: desde que `sectores` y `calles` comparten superficie, «Nuevo
     sector» vive al pie del carril —debajo del arbol del que cuelga— y
     «+ Añadir manzana» dentro del sector desplegado. Lo que se declara aqui es
     lo mismo de antes: la accion del catalogo que abre cada una y su
     formulario. */
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
  /* Las dos hojas nacionales del cuadro de valuacion (propuesta B).

     **`region` y `uso` no viajan nunca.** No estan en ninguna respuesta
     —`ValorUnitarioResource` publica partida, categoria, tramo de ano y valor;
     `DepreciacionResource`, material, estado, antiguedad y porcentaje— y sus
     controladores no los reciben: `ValorUnitarioController` y
     `DepreciacionController` declaran `@RequestParam int anio` y nada mas.
     Vivos, quien eligiera «SIERRA» o «INDUSTRIA» veria exactamente el mismo
     cuadro y creeria que lo ha acotado, que es la peor de las tres respuestas
     posibles: peor que un hueco y peor que un error.

     Mismo trato que `conciliadaConRentas`: se ve, no se puede usar, y dice por
     que. El motivo se redacta en `prosa-textos.ts`; aqui solo se declara.

     `materialMep` **no** entra aqui, y la diferencia importa: `material` viene
     en cada fila, asi que acotar por el es elegir entre lo recibido. No se
     manda —tampoco lo recibiria nadie—, se acota en el navegador, y por eso
     `CuadroDeValuacion` lo saca del bloque de busqueda y lo dibuja al lado de
     la matriz, con las opciones que trajo la respuesta. */
  valores_unitarios: { filtrosBloqueados: ['region'] },
  depreciacion: { filtrosBloqueados: ['uso'] },
  ficha_economica: {
    widgetsDeFiltro: CODIGO('codigoDeRefCatastral'),
    acto: ACTO_DE_ACTUALIZAR,
  },
  /* **Bienes comunes y rural no ofrecen «Actualizar catastro»**, y el motivo ya
     no es el que decia el comentario anterior —«se abren por un identificador
     que no es el codigo de referencia catastral»—, porque el backend recibe el
     mismo codigo en las cuatro rutas (`FichaController`).

     El motivo es lo que la operacion **versiona**: `actualizacion_catastro` es
     `PUT /catastro/fichas/{codigo}/actualizacion`, y `ActualizacionController`
     la resuelve con `TipoFicha.UNICA`. Ofrecerla desde bienes comunes o desde
     rural llevaria a editar los pisos de la ficha urbana del mismo predio, que
     no es la que se estaba mirando. El backend publica un `PUT` por tipo; el
     contrato los declara los cuatro y `escrituras.ts` declara los campos de
     uno: mientras sea asi, el acto se ofrece donde de verdad lleva. */
};
