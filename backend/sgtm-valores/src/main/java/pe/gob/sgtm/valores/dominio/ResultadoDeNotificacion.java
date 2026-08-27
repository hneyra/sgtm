package pe.gob.sgtm.valores.dominio;

/**
 * Con que resultado termino la diligencia (V3, {@code notificacion.resultado}).
 *
 * <p>Son exactamente los tres valores que admite la restriccion de la columna despues de V28: si
 * aqui apareciera uno mas, la insercion fallaria en ejecucion, que es tarde. {@code PENDIENTE}, que
 * V3 admitia, se retiro en V28: una fila de {@code notificacion} se escribe <b>despues</b> de la
 * diligencia, con lo que paso.
 */
public enum ResultadoDeNotificacion {

    /** Se entrego y hay acuse. */
    NOTIFICADO,

    /** No se ubico el domicilio ni a nadie en el: se reintenta (AC de #39). */
    NO_UBICADO,

    /** Se rehuso recibir. Es notificacion valida: art. 104 a), "certificacion de la negativa". */
    RECHAZADO;

    /**
     * Si esta diligencia hace exigible la deuda.
     *
     * <p>{@link #RECHAZADO} cuenta, y esto no es un descuido: negarse a recibir no deja al deudor
     * sin notificar —si lo dejara, bastaria con cerrar la puerta para que ningun valor llegara a
     * ser exigible nunca—. El unico que no surte efecto es {@link #NO_UBICADO}, y por eso es el
     * unico que se reintenta.
     */
    public boolean surteEfecto() {
        return this != NO_UBICADO;
    }
}
