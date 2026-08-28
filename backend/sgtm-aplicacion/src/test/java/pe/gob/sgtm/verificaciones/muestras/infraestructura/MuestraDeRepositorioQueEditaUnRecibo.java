package pe.gob.sgtm.verificaciones.muestras.infraestructura;

/**
 * Repositorio de muestra que <b>viola a proposito</b> la regla 4 sobre el recibo (#33).
 *
 * <p>Es la forma en que el defecto aparece de verdad: nadie escribe {@code DELETE FROM recibo} —eso
 * se ve venir— pero anular uno con un {@code UPDATE recibo SET estado = 'ANULADO'} parece lo
 * natural, porque V3 dejo las columnas {@code estado}, {@code fecha_anulacion}, {@code
 * usuario_anulacion} y {@code motivo_anulacion} ahi mismo, invitando a usarlas.
 *
 * <p>No se puede. Un recibo es un documento con numeracion correlativa que el contribuyente se
 * lleva impreso: editarlo en la base deja al papel y al sistema diciendo cosas distintas, y quien
 * tenga el papel gana la discusion. Su detalle esta congelado por el mismo motivo —la reimpresion
 * tiene que salir identica aunque el libro haya seguido moviendose—. La anulacion (#34) se
 * registrara como un movimiento que se <b>agrega</b>, igual que {@code valor_movimiento} en V28.
 *
 * <p>La barrera final es que V29 le retira a {@code sgtm_app} el privilegio de {@code UPDATE} sobre
 * las dos tablas, pero eso falla en ejecucion; el escaner de fuentes falla en el build, que es
 * donde cuesta barato.
 *
 * <p>Vive en {@code src/test} a proposito: el escaner solo recorre {@code src/main}, asi que esta
 * clase no puede romper el build por accidente. La revisa {@link
 * pe.gob.sgtm.verificaciones.ProhibicionesEnElCodigoFuenteTest} leyendo este archivo del disco.
 */
@SuppressWarnings("unused")
public class MuestraDeRepositorioQueEditaUnRecibo {

    /** Anular no es editar el recibo: es agregar el movimiento que lo anula (#34). */
    private static final String ANULA_EN_EL_SITIO =
            "UPDATE recibo SET estado = 'ANULADO', motivo_anulacion = ? WHERE id = ?";

    /** Y el desglose esta congelado: recomponerlo haria que el duplicado no fuera un duplicado. */
    private static final String RECOMPONE_EL_DETALLE =
            "UPDATE recibo_detalle SET monto = ? WHERE recibo_id = ?";

    /** Ni borrando, claro: RNF-051 lo prohibe desde antes que nada de esto existiera. */
    private static final String BORRA_EL_DETALLE = "DELETE FROM recibo_detalle WHERE recibo_id = ?";
}
