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
    ANULADA
}
