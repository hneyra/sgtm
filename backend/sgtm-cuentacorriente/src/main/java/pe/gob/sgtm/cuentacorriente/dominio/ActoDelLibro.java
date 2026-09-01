package pe.gob.sgtm.cuentacorriente.dominio;

/**
 * De que acto nace un asiento, cuando el libro lo sabe (#601, V67).
 *
 * <p>No es el {@link Concepto}. El concepto dice <b>contra que parte</b> se imputa —insoluto,
 * reajuste, interes, gasto— y es lo que netean {@link CalculoDeDeuda} y {@link ProyeccionDelSaldo};
 * esto dice <b>por que</b> existe la fila, que es una pregunta distinta y hasta #601 no la
 * contestaba ninguna columna.
 *
 * <h2>Para que hizo falta</h2>
 *
 * <p>Un abono de una <b>baja de deuda</b> y un abono de una <b>cobranza</b> son, columna a columna,
 * el mismo asiento: {@code ABONO} de concepto {@code INSOLUTO}. Sin distinguirlos, «lo cargado» del
 * panel —la emision del ejercicio, que es el denominador de todas las barras de avance— se quedaba
 * con el cargo de un alta que ya no debe nada, y lo recaudado contaba como dinero que entro una
 * deuda que se habia extinguido.
 *
 * <p>Y no se podia distinguir por el signo: netear cargos contra abonos se llevaria por delante los
 * <b>cobros</b>, y «lo cargado» acabaria valiendo la cartera pendiente. Es lo mismo que #56
 * aprendio de {@link Asiento#reversionDe}, que produce el asiento contrario con el <b>mismo</b>
 * concepto.
 *
 * <h2>Los dos que hay, y el silencio de los demas</h2>
 *
 * <p>Solo estan los dos actos de RF-043 y RF-044, que es lo unico que {@link MovimientoDeDeuda}
 * produce. Un asiento sin acto —{@code null}— no es un asiento del que se ignore el origen: es uno
 * que <b>no nacio</b> de un alta ni de una baja de deuda. Una emision masiva, una cobranza, una
 * reversion o un acogimiento a convenio dejan la columna en nulo, y la consulta de lo cargado los
 * trata por lo que son.
 *
 * <h2>Lo que este enumerado todavia no cubre, dicho antes de que se descubra</h2>
 *
 * <p>{@code ExtincionDeDeudaCuentaCorriente} —la baja por prescripcion, por descargo fundado o por
 * resolucion que deja la multa sin efecto (#50, RF-064)— escribe <b>exactamente los mismos
 * asientos</b>: su propio javadoc lo dice, «exactamente lo que {@code MovimientoDeDeuda} de sentido
 * {@code BAJA} produce, y con los mismos conceptos». Hoy no estampa ningun acto, asi que
 * <b>arrastra el defecto de #601 por su lado</b>: lo que extingue sigue contando como emision del
 * ejercicio y ademas se publica como recaudacion.
 *
 * <p>No se corrige aqui a proposito, y no por descuido: marcarlo cambia las cifras del panel de
 * coactiva y de sanciones, y «una deuda prescrita, ¿sigue siendo emision del ejercicio?» es una
 * pregunta que el issue de #601 no plantea y que hay que contestar antes —a diferencia de una baja
 * por error material, que nunca debio emitirse—. Cuando se conteste, el cambio es una linea aqui y
 * otra alli.
 */
public enum ActoDelLibro {

    /**
     * Alta de deuda: la «nota de abono» del manual (RF-043). Incorpora deuda que no vino de la
     * emision masiva.
     */
    ALTA_DEUDA,

    /**
     * Baja de deuda: la «nota de cargo» del manual (RF-044). Extingue deuda por prescripcion,
     * resolucion que la deja sin efecto o error material.
     */
    BAJA_DEUDA
}
