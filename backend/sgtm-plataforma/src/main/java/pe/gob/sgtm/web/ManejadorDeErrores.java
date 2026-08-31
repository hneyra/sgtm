package pe.gob.sgtm.web;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import pe.gob.sgtm.persistencia.OrdenSeguro;

/**
 * Traduce excepciones a {@code application/problem+json} (RFC 9457).
 *
 * <h2>La regla que gobierna este archivo</h2>
 *
 * <p><b>Ningun mensaje que salga de aqui menciona una tabla, una columna, una restriccion ni una
 * linea de SQL.</b> Un {@code duplicate key value violates unique constraint "via_codigo_uq"}
 * devuelto tal cual es un regalo: dice como se llama la tabla, como se llama la restriccion y que
 * columnas la componen. Con veinte peticiones mal formadas se reconstruye buena parte del esquema.
 *
 * <p>Renunciar al detalle no es renunciar a diagnosticar: cada 500 lleva un identificador de
 * incidencia que aparece en la respuesta <i>y</i> en el registro del servidor junto al mensaje
 * completo. Quien atiende la incidencia pide ese identificador y encuentra la causa exacta; quien
 * la provoca a proposito no aprende nada.
 */
@RestControllerAdvice
public class ManejadorDeErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorDeErrores.class);

    /** Campo de extension con el codigo del catalogo, que es a lo que reacciona la interfaz. */
    static final String CAMPO_CODIGO = "codigo";

    static final String CAMPO_MENSAJE = "mensaje";
    static final String CAMPO_DETALLES = "detalles";
    static final String CAMPO_INCIDENCIA = "incidencia";

    @ExceptionHandler(ProblemaDeNegocio.class)
    public ResponseEntity<ProblemDetail> problemaDeNegocio(ProblemaDeNegocio problema) {
        return respuesta(
                problema.codigo(), mensajeDe(problema, problema.codigo()), problema.detalles());
    }

    @ExceptionHandler(OrdenSeguro.OrdenNoAdmitido.class)
    public ResponseEntity<ProblemDetail> ordenNoAdmitido(OrdenSeguro.OrdenNoAdmitido error) {
        return respuesta(
                CodigoDeError.ORDEN_NO_ADMITIDO,
                CodigoDeError.ORDEN_NO_ADMITIDO.mensaje(),
                List.of("Campo pedido: " + error.campo()));
    }

    /**
     * Los objetos de valor validan en su constructor, asi que una entrada mal formada llega aqui
     * como {@code IllegalArgumentException} con un mensaje escrito para el usuario —«El codigo de
     * referencia catastral debe tener 23 posiciones»—. Ese si se devuelve: lo escribimos nosotros y
     * habla del dato, no del esquema.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> validacion(IllegalArgumentException error) {
        return respuesta(
                CodigoDeError.VALIDACION, mensajeDe(error, CodigoDeError.VALIDACION), List.of());
    }

    /**
     * La peticion no se puede leer: falta un parametro obligatorio, uno no admite el valor que
     * llego, o el cuerpo no es JSON valido.
     *
     * <p><b>Hasta #486 esto era un 500 con identificador de incidencia.</b> Spring lanza estas tres
     * excepciones <i>antes</i> de entrar al controlador, ninguna la cazaba nadie, y caian en el
     * {@code @ExceptionHandler(Exception.class)} de mas abajo. Tres consecuencias, y la tercera es
     * la peor:
     *
     * <ul>
     *   <li>el estado miente: un {@code 500} le dice al cliente «el servidor se rompio» cuando lo
     *       que pasa es que su peticion esta mal, y un cliente que reintenta un 500 reintenta para
     *       siempre;
     *   <li>el mensaje no dice que arreglar —«No se pudo completar la operacion»—, asi que quien
     *       integra tiene que adivinar cual de sus quince parametros es el que sobra;
     *   <li>y cada una <b>escribe una incidencia en el registro con nivel ERROR</b>. Un cliente
     *       tecleando mal ensucia el registro de errores del servidor, que es exactamente lo que el
     *       javadoc de {@link #rutaNoEncontrada} explica que no debe pasar. Con eso, el registro de
     *       incidencias deja de servir para encontrar defectos reales.
     * </ul>
     *
     * <p>Sale {@code 422} y no {@code 400} porque es el que el contrato declara en las 195
     * operaciones —{@code ErrorDeValidacion}— y porque el catalogo ya tiene ese significado. Lo que
     * importa del criterio es que sea <b>el mismo en todas</b>, no cual de los dos.
     *
     * <p>El mensaje nombra el parametro y, si lo hubo, el valor recibido: los dos vienen del propio
     * cliente, asi que devolverlos no revela nada del esquema. El del cuerpo ilegible es
     * <b>fijo</b>: el de Jackson nombra clases y campos de Java, y eso no sale de aqui.
     */
    @ExceptionHandler({
        org.springframework.web.bind.MissingServletRequestParameterException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.validation.BindException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class
    })
    public ResponseEntity<ProblemDetail> peticionQueNoSePuedeLeer(Exception error) {
        return respuesta(CodigoDeError.VALIDACION, motivoDe(error), List.of());
    }

    /** El motivo, escrito para quien integra y sin una sola palabra del esquema. */
    private static String motivoDe(Exception error) {
        if (error
                instanceof
                org.springframework.web.bind.MissingServletRequestParameterException falta) {
            return "Falta el parametro obligatorio '" + falta.getParameterName() + "'";
        }
        if (error
                instanceof
                org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
                        noCuadra) {
            Object valor = noCuadra.getValue();
            return "El parametro '"
                    + noCuadra.getName()
                    + "' no admite el valor '"
                    + (valor == null ? "" : valor)
                    + "'";
        }
        // Cuando el valor malo viene dentro de un objeto que Spring compone —la paginacion, sin
        // ir mas lejos—, no llega como desajuste de tipo sino envuelto en un BindException. Lo
        // descubrio la propia prueba: el caso `?pagina=abc` seguia en 500 con las otras tres ya
        // arregladas, y el registro decia «Validation failed for argument [0]».
        if (error instanceof org.springframework.validation.BindException enlace) {
            org.springframework.validation.FieldError campo = enlace.getFieldError();
            if (campo != null) {
                Object valor = campo.getRejectedValue();
                return "El parametro '"
                        + campo.getField()
                        + "' no admite el valor '"
                        + (valor == null ? "" : valor)
                        + "'";
            }
            return "Alguno de los parametros no admite el valor recibido";
        }
        // El mensaje de Jackson nombra la clase y el campo de Java que esperaba. No sale.
        return "El cuerpo de la peticion no se puede leer: no es JSON valido";
    }

    /**
     * Todo lo que venga del acceso a datos.
     *
     * <p>Aqui esta la razon de ser de la clase: el mensaje de PostgreSQL <b>no</b> sale. Se
     * registra entero y se devuelve un codigo con el identificador de incidencia.
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ProblemDetail> accesoADatos(DataAccessException error) {
        return interno(error);
    }

    /**
     * Una ruta que ningun controlador mapea. Es {@code 404}, no {@code 500}.
     *
     * <p>Sin este manejador, {@link NoResourceFoundException} —que Spring lanza para toda peticion
     * sin handler— cae en {@link #cualquierOtra} y sale como {@code 500} con identificador de
     * incidencia. El contrato declara 134 operaciones y hoy hay una implementada: cada pantalla del
     * prototipo cuyo endpoint todavia no existe generaria una «incidencia» por carga. El {@code
     * 404} dice la verdad —la operacion aun no esta publicada— y no ensucia el registro.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetail> rutaNoEncontrada(NoResourceFoundException error) {
        return respuesta(
                CodigoDeError.NO_ENCONTRADO, CodigoDeError.NO_ENCONTRADO.mensaje(), List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> cualquierOtra(Exception error) {
        return interno(error);
    }

    private ResponseEntity<ProblemDetail> interno(Exception error) {
        String incidencia = UUID.randomUUID().toString();
        log.error("Incidencia {}: {}", incidencia, error.toString(), error);

        ProblemDetail cuerpo =
                cuerpoDe(CodigoDeError.ERROR_INTERNO, CodigoDeError.ERROR_INTERNO.mensaje());
        cuerpo.setProperty(CAMPO_INCIDENCIA, incidencia);
        return ResponseEntity.status(CodigoDeError.ERROR_INTERNO.estado()).body(cuerpo);
    }

    /** Una excepcion sin mensaje deja el del catalogo; nunca un {@code null} en la respuesta. */
    private static String mensajeDe(Exception error, CodigoDeError codigo) {
        String mensaje = error.getMessage();
        return mensaje == null || mensaje.isBlank() ? codigo.mensaje() : mensaje;
    }

    private ResponseEntity<ProblemDetail> respuesta(
            CodigoDeError codigo, String mensaje, List<String> detalles) {
        ProblemDetail cuerpo = cuerpoDe(codigo, mensaje);
        if (!detalles.isEmpty()) {
            cuerpo.setProperty(CAMPO_DETALLES, detalles);
        }
        return ResponseEntity.status(codigo.estado()).body(cuerpo);
    }

    private static ProblemDetail cuerpoDe(CodigoDeError codigo, String mensaje) {
        ProblemDetail cuerpo = ProblemDetail.forStatus(codigo.estado());
        cuerpo.setType(URI.create("https://sgtm.gob.pe/errores/" + codigo.name().toLowerCase()));
        cuerpo.setTitle(codigo.mensaje());
        cuerpo.setDetail(mensaje);
        // `codigo` y `mensaje` como extensiones: son los dos campos que el contrato
        // generado (docs/50-api) declara para su esquema Error, y asi la respuesta
        // cumple RFC 9457 sin dejar de cumplir el contrato.
        cuerpo.setProperty(CAMPO_CODIGO, codigo.name());
        cuerpo.setProperty(CAMPO_MENSAJE, mensaje);
        return cuerpo;
    }
}
