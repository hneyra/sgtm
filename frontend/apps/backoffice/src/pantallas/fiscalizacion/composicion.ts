import type { ComposicionDeOpcion } from '../composicion';

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
    filtrosBloqueados: ['programa', 'hallazgo', 'estado'],
  },
};
