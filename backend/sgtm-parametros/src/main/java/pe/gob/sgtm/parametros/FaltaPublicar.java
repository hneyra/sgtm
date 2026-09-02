package pe.gob.sgtm.parametros;

import java.util.Objects;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.PoliticasDeRedondeo;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametroQueFalta;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * El <b>unico</b> sitio donde una cifra normativa sin publicar se convierte en un {@code 422}
 * (#691).
 *
 * <h2>Que problema resuelve</h2>
 *
 * <p>#604 puso el miembro {@code parametroQueFalta} en el cuerpo del 422 y lo cableo en las tres
 * capturas de {@code ConvenioController}, con un ayudante privado. Fuera de tesoreria las demas
 * rutas seguian contestando un 422 con {@code codigo} y {@code mensaje} y nada mas, o sea
 * <b>indistinguible del de un campo que falta</b>. Dentro de tesoreria la ausencia del miembro
 * significa «es un campo de la peticion, se corrige aqui»; aplicada fuera, esa regla es falsa y
 * manda a quien atiende a buscar en el formulario un dato que no esta mal.
 *
 * <p>Un ayudante privado por controlador habria sido la copia numero veintitres de las mismas seis
 * lineas, y la copia que se quedara atras seria invisible: el sintoma de «este 422 no lleva el
 * miembro» es exactamente el mismo que el de «este 422 es de un campo». Por eso hay uno solo y una
 * guarda que exige usarlo ({@code DiscriminadorDeLoQueFaltaPublicarTest}).
 *
 * <h2>Por que vive en {@code sgtm-parametros}</h2>
 *
 * <p>Porque es el unico modulo que puede nombrar a la vez las dos mitades: {@link
 * ParametroSinPublicar} —suyo— y {@link ProblemaDeNegocio} de {@code sgtm-plataforma}, del que todo
 * contexto depende. Al reves no se puede: {@code sgtm-plataforma} es la base del grafo y no depende
 * de ningun contexto acotado, asi que {@code pe.gob.sgtm.web} no puede nombrar {@code
 * ParametroSinPublicar} (lo dice el javadoc de {@link ParametroQueFalta}).
 *
 * <h2>El tipo es la guarda, no el nombre del metodo</h2>
 *
 * <p>El parametro esta acotado a los dos limites a la vez —{@code RuntimeException} para poder leer
 * su mensaje y {@link ParametroSinPublicar} para poder leer su llave—, que es exactamente lo que da
 * el tipo de un {@code catch} multiple. Con eso, meter en esa lista una excepcion que no publique
 * su ejercicio <b>no compila</b>, en vez de producir un 422 sin miembro que nadie distinguiria del
 * de un campo ausente.
 */
public final class FaltaPublicar {

    private FaltaPublicar() {}

    /**
     * El 422 de una cifra normativa que no esta publicada, con su discriminador.
     *
     * <p>El mensaje sigue siendo el de la propia excepcion: ya esta redactado en lenguaje del
     * dominio y nombra el ejercicio o la llave. Lo que se anade es el mismo dato en forma legible
     * por programa.
     */
    public static <E extends RuntimeException & ParametroSinPublicar> ProblemaDeNegocio problema(
            E falta) {
        Objects.requireNonNull(falta, "Traducir «falta publicar» exige la excepcion que lo dice");
        int ejercicio = falta.ejercicio().valor();
        ParametroQueFalta discriminador =
                falta.llave()
                        .map(llave -> ParametroQueFalta.llave(ejercicio, llave))
                        .orElseGet(() -> ParametroQueFalta.conjuntoDelEjercicio(ejercicio));
        return new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(falta), discriminador);
    }

    /**
     * El mismo 422 para la <b>unica</b> de estas excepciones que no puede declarar {@link
     * ParametroSinPublicar}: la del dominio puro.
     *
     * <p>{@link PoliticasDeRedondeo.PuntoSinPolitica} vive en {@code sgtm-dominio-compartido} y no
     * sabe de que ejercicio salieron las politicas —no puede saberlo: la capa {@code dominio} no
     * mira la base ni la configuracion (regla 7)—. Quien si lo sabe es quien resolvio el conjunto
     * sellado, y por eso el ejercicio entra por argumento.
     *
     * <p>La llave se compone con {@link PoliticasDeRedondeoSelladas#llaveDe} a partir de {@link
     * PoliticasDeRedondeo.PuntoSinPolitica#punto()}, o sea de las <b>dos</b> mitades que existen y
     * no de una clave inventada. Nunca sale el {@code TIPO} solo: eso significa «falta el bloque
     * entero» ({@code SinPuntosObservados}) y aqui se sabe exactamente cual falta, porque lo pidio
     * el calculo.
     */
    public static ProblemaDeNegocio problema(
            Ejercicio ejercicio, PoliticasDeRedondeo.PuntoSinPolitica sinPolitica) {
        Objects.requireNonNull(ejercicio, "El dominio no sabe de que ejercicio son sus politicas");
        Objects.requireNonNull(sinPolitica, "Traducir «falta publicar» exige la excepcion");
        return new ProblemaDeNegocio(
                CodigoDeError.VALIDACION,
                mensajeDe(sinPolitica),
                ParametroQueFalta.llave(
                        ejercicio.valor(),
                        PoliticasDeRedondeoSelladas.llaveDe(sinPolitica.punto())));
    }

    /** Una excepcion sin mensaje no deja un {@code null} en la respuesta. */
    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null || mensaje.isBlank() ? "El valor recibido no es valido" : mensaje;
    }
}
