package pe.gob.sgtm.rentas.dominio;

/**
 * En que situacion esta la declaracion, en los mismos cuatro valores que {@code
 * declaracion_jurada_estado_check} (V2).
 *
 * <p>{@code SUSTITUIDA} es lo que deja {@link DeclaracionJurada#rectificadaPor}: la anterior no se
 * borra ni se edita en su contenido, solo cambia de estado (regla 4).
 */
public enum EstadoDeDeclaracion {
    PRESENTADA,
    OBSERVADA,
    SUSTITUIDA,
    ANULADA;

    /**
     * Los estados en que una declaracion <b>sustenta</b> algo, en un solo sitio (ADR-0015 §1).
     *
     * <p>Es el predicado de la conciliacion catastro-rentas y el de la deteccion de omisos, y son
     * el mismo: un predio pertenece al padron afecto de un ejercicio cuando tiene una declaracion
     * de ese ejercicio {@code PRESENTADA} u {@code OBSERVADA}.
     *
     * <ul>
     *   <li>{@code OBSERVADA} cuenta: la administracion objeto <b>el contenido</b> de una
     *       declaracion que existe y fue presentada. Observarla no la retira, y negarle la
     *       conciliacion seria acusar de omiso a quien declaro.
     *   <li>{@code SUSTITUIDA} no cuenta por si sola: cuenta a traves de su sustituta, que es otra
     *       fila {@code PRESENTADA}. Contar tambien la primera duplicaria la misma declaracion.
     *   <li>{@code ANULADA} no cuenta: dejo de sustentar nada.
     * </ul>
     */
    public static String[] nombresDeLasVigentes() {
        return new String[] {PRESENTADA.name(), OBSERVADA.name()};
    }
}
