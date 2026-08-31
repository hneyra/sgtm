import type { ComposicionDeOpcion } from '../composicion';

/**
 * **Los resultados de la fiscalizacion, una superficie de tres hojas** (#506 F1).
 *
 * `fisc_resultados`, `fisc_estado_cuenta` y `fisc_historico` son el mismo objeto
 * —el desenlace de un proceso fiscalizador— preguntado de tres maneras: por acta,
 * por contribuyente y por version. Y hasta hoy eran **tres pantallas con tres
 * formas**: tabla con totales, tres secciones mas tabla, y seis pestañas mas
 * tabla. Pasar de una a otra era volver al menu.
 *
 * Es el sintoma que FRO-05 §0 manda medir sobre el catalogo portado antes de
 * unificar nada, y las tres lo dan: mismo objeto, tres formas, tres barras de
 * busqueda —once filtros entre las tres— para acotar el mismo desenlace.
 *
 * **El prototipo lo dibuja exactamente asi**: un destino «Resultados» con tres
 * pestañas —«Por acta», «Por contribuyente», «Histórico de versiones»— sobre una
 * banda de totales. Los rotulos que se dibujan aqui **no son esos tres**: son los
 * titulos del catalogo, sin reescribir (RNF-080), porque la pestaña lleva a esa
 * pantalla y su nombre es su titulo.
 *
 * **Las tres conservan su id, su ruta y su permiso**, que es lo que separa esta
 * composicion de una pantalla que absorbe a las otras. Aqui importa mas que en
 * ninguna otra superficie del sistema, y el motivo es SoD-4: el fiscalizador de
 * campo levanta actas y **no ve** `fisc_resultados`, que es desde donde se
 * transfiere al padron. Con las pestañas en un `useState` llegaria a ella sin
 * pasar por ningun guardia (REQ-03 §5); con enlaces, la hoja que su perfil no
 * puede ver **no se dibuja** y el guardia de `Pantalla` vuelve a correr al
 * entrar por la ruta.
 *
 * Ver `bloques/HojasDeSuperficie` para por que esto **no** saca las tres del
 * renderizador generico: sus cuerpos ya estan bien —dos de las tres leen su
 * recurso real desde #80— y rehacerlos a mano es como se pierde una columna.
 */
const RESULTADOS_DE_FISCALIZACION = {
  titulo: 'Resultados de la fiscalización',
  hojas: ['fisc_resultados', 'fisc_estado_cuenta', 'fisc_historico'],
} as const;

/**
 * Lo que Fiscalizacion compone alrededor de los bloques comunes (#431).
 *
 * **Cinco filtros que se dibujan y no filtran**, en dos pantallas y por dos
 * motivos distintos. Es el mismo hueco de `consulta_fichas` (#322) y de los dos
 * resumenes de transito (#398), y estaba **vivo** en las dos: elegir cualquiera
 * cambiaba la URL y, contra el backend de verdad, o se caia en silencio o
 * contestaba 422 despues de buscar.
 *
 * Se **bloquean y no se quitan**: el rotulo del prototipo se conserva (RNF-080),
 * y un filtro que desaparece deja a quien lo buscaba pensando que se ha roto
 * algo. Aqui va la declaracion; la redaccion del motivo vive en
 * `prosa-textos.ts`, y `prosa.test.ts` exige que las dos listas digan lo mismo.
 */
export const COMPOSICION_DE_FISCALIZACION: Readonly<Record<string, ComposicionDeOpcion>> = {
  /**
   * **Dos de los cuatro filtros del programa no llegan al servidor** (#431).
   *
   * La lectura que #431 publico —`GET /fiscalizacion/programas`— acota por
   * `nDePrograma` y por `ejercicio`, y por nada mas: el contrato declara esos
   * dos parametros de consulta y `ProgramasController.listar` lee esos dos.
   * «Tipo» y «Estado» se teclean y **se caen en silencio**, porque
   * `parametrosDeBusqueda` cruza lo tecleado contra los parametros que el
   * contrato declara y descarta lo que no este.
   *
   * Y el de «Tipo» tiene ademas el problema de siempre: su desplegable ofrece
   * seis clases —PREDIAL MASIVO, PREDIAL SELECTIVO, VEHICULAR, LICENCIAS,
   * OMISOS, SUBVALUACIÓN— y `TipoDePrograma` solo declara **PREDIAL** y
   * **VEHICULAR**, asi que ni traduciendolo llegaria entero.
   */
  fisc_programa: {
    filtrosBloqueados: ['tipo', 'estado'],
    /**
     * **De la fila de la muestra al acta que se levanta en ella** (#506 F3).
     *
     * Cada fila de «Predios seleccionados» es un predio que hay que ir a
     * visitar, y lo que se hace con él es levantar su acta —que es otra opcion,
     * `fisc_predial`, con su ruta y su permiso—. Hasta hoy ese camino no
     * existia: habia que volver al menu, abrir el acta y teclear a mano dos
     * identificadores que **la fila ya tiene y no dibuja en ninguna columna**
     * (un `predioId` bajo el rotulo «Predio» seria otro dato con el mismo
     * nombre), asi que en la practica no se podian teclear.
     *
     * El rotulo dice **lo que hace el acto**, no como se llama la pantalla que
     * lo aloja: es el criterio que #498 F2 fijo para la accion primaria del
     * modulo, y el que el prototipo usa en esta misma grilla.
     *
     * Los dos identificadores salen de `MuestraResource` por
     * `DatosDeTabla.valores`. Sin los dos no hay enlace: el acta que no cuelga
     * de una fila de la muestra no tiene predio ni contribuyente, y abrirla asi
     * es abrir un formulario vacio con aspecto de estar sobre algo.
     */
    accionDeFila: {
      opcion: 'fisc_predial',
      etiqueta: 'Levantar acta',
      parametros: (valores) => {
        const programa = valores['programaId'];
        const predio = valores['predioId'];
        // Vacio es «esta fila no lo trae»: sin los dos, no hay enlace.
        return programa === undefined ||
          programa === '' ||
          predio === undefined ||
          predio === ''
          ? undefined
          : { programa, predio };
      },
    },
  },

  /**
   * **Los tres filtros de los resultados contestan 422 en cuanto se tocan** (#431).
   *
   * Aqui no es que no viajen: viajan y el servidor los rechaza.
   *
   *   «Programa»  ofrece codigos —«PF-2026-014»— y `LiquidacionController` pide
   *               el **identificador interno** (`enteroOpcional`). Ni siquiera
   *               tiene opcion «Todos», asi que cualquier eleccion da 422. Desde
   *               #431 el id **si** tiene de donde salir (`ProgramaResource.id`),
   *               que es lo unico que cambio de los tres
   *   «Hallazgo»  dos de sus cuatro opciones —«AMPLIACIÓN NO DECLARADA» y
   *               «SUBVALUACIÓN»— no son `CondicionFiscalizada`
   *   «Estado»    las **cuatro** —PENDIENTE, DETERMINADO, NOTIFICADO,
   *               RECLAMADO— tampoco son el estado que el backend conoce
   */
  fisc_resultados: {
    superficie: RESULTADOS_DE_FISCALIZACION,
    filtrosBloqueados: ['programa', 'hallazgo', 'estado'],
  },

  /**
   * La segunda hoja: el mismo desenlace, preguntado por contribuyente.
   *
   * Solo declara la superficie. Sus cuatro filtros **si** viajan —a diferencia
   * de los cinco de arriba—, asi que no hay ninguno que bloquear.
   */
  fisc_estado_cuenta: {
    superficie: RESULTADOS_DE_FISCALIZACION,
  },

  /**
   * La tercera: el mismo desenlace, version a version.
   *
   * Sus seis pestañas del manual —«Datos Generales», «Versiones», «Estado de
   * predios», «Documentos», «Infracciones», «Observaciones»— **se quedan**. Son
   * del catalogo portado y las dibuja el renderizador comun; la tira de la
   * superficie va por encima y no las sustituye. El prototipo las cambia por una
   * linea de tiempo de versiones, y eso no se hace aqui: seis rotulos del manual
   * no se pierden para ganar un dibujo (RNF-080).
   */
  fisc_historico: {
    superficie: RESULTADOS_DE_FISCALIZACION,
  },
};
