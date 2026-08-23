package pe.gob.sgtm.parametros;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.dominio.PoliticasDeRedondeo;
import pe.gob.sgtm.dominio.PuntoDeRedondeo;
import pe.gob.sgtm.dominio.ValorNormativo;

/**
 * Arma las {@link PoliticasDeRedondeo} <b>leyendolas del conjunto sellado</b>, nunca
 * escribiendolas.
 *
 * <p>Es el tercer entregable de E-7 (#203): lo que la campana de observacion del SRTM del MEF
 * averigue —en que puntos redondea y con que escala y modo— entra como <b>dato</b>, con su
 * documento fuente y su vigencia, igual que un tramo o una alicuota. Una politica escrita en el
 * codigo ya la detecta el escaner de fuentes (regla 5, D-03); lo que faltaba era el camino por el
 * que entra la respuesta.
 *
 * <h2>Un punto, una fila</h2>
 *
 * <p>Cada punto observado es una fila de {@code parametro_tributario} con {@code tipo = 'REDONDEO'}
 * y {@code clave} igual al nombre del {@link PuntoDeRedondeo}, que lleva <b>las dos mitades a la
 * vez</b>: {@code valor_numerico} es la escala y {@code valor_texto} el modo.
 *
 * <p>Van juntas en una fila y no en dos a proposito. Con una fila por mitad, un conjunto sellado
 * podria tener la escala de un punto sin su modo: eso no falla al sellar —cada fila es valida por
 * separado— y produce un punto <b>medio configurado</b>, que es peor que uno ausente porque
 * aparenta estar resuelto. Aqui esa situacion no se puede representar, y si aun asi llega, {@link
 * #de(ParametrosSellados)} la rechaza nombrando la mitad que falta.
 *
 * <h2>Por que un conjunto sin ningun punto falla</h2>
 *
 * <p>Devolver unas politicas vacias seria legal —{@link PoliticasDeRedondeo} admite no cubrir un
 * punto— pero el calculo reventaria despues, en el primer {@code en(punto)}, lejos de la causa. Y
 * mientras D-03c siga abierta la causa es siempre la misma: <b>todavia no se ha observado ningun
 * punto</b>. Se dice ahi, una vez, en vez de trece veces disfrazado.
 */
public final class PoliticasDeRedondeoSelladas {

    /** El {@code tipo} de la fila. La {@code clave} es el nombre del punto. */
    public static final String TIPO = "REDONDEO";

    private PoliticasDeRedondeoSelladas() {}

    /**
     * Las politicas que el conjunto sellado parametriza, una por punto observado.
     *
     * @throws MediaPolitica si un punto trae la escala sin el modo, o al reves
     * @throws EscalaNoEntera si la escala tiene decimales
     * @throws ModoDesconocido si el modo no es un {@link RoundingMode}
     * @throws SinPuntosObservados si el conjunto no parametriza ningun punto
     */
    public static PoliticasDeRedondeo de(ParametrosSellados sellados) {
        Objects.requireNonNull(
                sellados, "Leer las politicas de redondeo exige el conjunto sellado");
        PoliticasDeRedondeo.Constructor constructor = PoliticasDeRedondeo.construir();
        List<PuntoDeRedondeo> leidos = new ArrayList<>();

        for (PuntoDeRedondeo punto : PuntoDeRedondeo.values()) {
            Optional<ValorNormativo> escala = sellados.numero(TIPO, punto.name());
            Optional<String> modo = sellados.texto(TIPO, punto.name());
            if (escala.isEmpty() && modo.isEmpty()) {
                continue;
            }
            if (escala.isEmpty() || modo.isEmpty()) {
                throw new MediaPolitica(punto, escala.isPresent());
            }
            constructor.en(
                    punto,
                    new PoliticaDeRedondeo(escala(punto, escala.get()), modo(punto, modo.get())));
            leidos.add(punto);
        }

        if (leidos.isEmpty()) {
            throw new SinPuntosObservados(sellados);
        }
        return constructor.construir();
    }

    private static int escala(PuntoDeRedondeo punto, ValorNormativo valor) {
        BigDecimal escala = valor.valor().stripTrailingZeros();
        if (escala.scale() > 0) {
            throw new EscalaNoEntera(punto, valor);
        }
        return escala.intValueExact();
    }

    private static RoundingMode modo(PuntoDeRedondeo punto, String texto) {
        try {
            return RoundingMode.valueOf(texto.strip());
        } catch (IllegalArgumentException desconocido) {
            throw new ModoDesconocido(punto, texto);
        }
    }

    /** Un punto con la escala pero sin el modo, o al reves. Ver el javadoc de la clase. */
    public static final class MediaPolitica extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        MediaPolitica(PuntoDeRedondeo punto, boolean tieneEscala) {
            super(
                    "El punto "
                            + punto
                            + " tiene "
                            + (tieneEscala ? "escala sin modo" : "modo sin escala")
                            + " en el conjunto sellado. Media politica no es una politica: la"
                            + " fila de REDONDEO:"
                            + punto
                            + " lleva valor_numerico y valor_texto, los dos");
        }
    }

    /** La escala llego con decimales: «redondear a 2,5 decimales» no significa nada. */
    public static final class EscalaNoEntera extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        EscalaNoEntera(PuntoDeRedondeo punto, ValorNormativo valor) {
            super(
                    "La escala de REDONDEO:"
                            + punto
                            + " es "
                            + valor
                            + ", y una escala es un numero de decimales, no un decimal");
        }
    }

    /** El modo no es ninguno de {@link RoundingMode}. */
    public static final class ModoDesconocido extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        ModoDesconocido(PuntoDeRedondeo punto, String texto) {
            super(
                    "El modo de REDONDEO:"
                            + punto
                            + " es '"
                            + texto
                            + "', que no es un RoundingMode. Los admitidos son "
                            + java.util.Arrays.toString(RoundingMode.values()));
        }
    }

    /** El conjunto sellado no parametriza ningun punto de redondeo. */
    public static final class SinPuntosObservados extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        SinPuntosObservados(ParametrosSellados sellados) {
            super(
                    "El conjunto sellado del ejercicio "
                            + sellados.ejercicio()
                            + " (version "
                            + sellados.version()
                            + ") no tiene ninguna fila REDONDEO:‹punto›. Mientras D-03c siga"
                            + " abierta eso significa que todavia no se ha observado ningun punto"
                            + " del SRTM del MEF (#203); calcular sin ellas no da un importe sin"
                            + " redondear, da un fallo por cada punto y lejos de aqui");
        }
    }
}
