package pe.gob.sgtm.tesoreria.dominio;

/**
 * Que clase de cobranza es: los cinco valores de {@code recibo_tipo_pago_check} (V3).
 *
 * <p>#33 escribe <b>dos</b>: {@link #NORMAL} en caja tributaria y {@link #TASA} en caja de tasas.
 * Los otros tres no estan sin escribir por falta de tiempo:
 *
 * <ul>
 *   <li>{@link #A_CUENTA} es un pago parcial, y decidir a que cuota y a que concepto se imputa lo
 *       parcial es una regla de imputacion que este issue no define;
 *   <li>{@link #PRECONVENIO} y {@link #CUOTA_CONVENIO} son del fraccionamiento (RF-082), que tiene
 *       su propio issue.
 * </ul>
 *
 * <p>Aceptarlos y cobrarlos como si fueran {@link #NORMAL} seria peor que rechazarlos: el recibo
 * diria una cosa y el libro otra.
 */
public enum TipoDePago {
    NORMAL,
    A_CUENTA,
    PRECONVENIO,
    CUOTA_CONVENIO,
    TASA
}
