package pe.gob.sgtm.web;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.http.MediaType;

/**
 * Escribe un {@code application/problem+json} directamente sobre la respuesta, para el codigo que
 * corre <b>antes</b> del {@code DispatcherServlet}.
 *
 * <h2>Por que no basta con {@link ManejadorDeErrores}</h2>
 *
 * <p>El {@code @RestControllerAdvice} traduce excepciones de los controladores, y en la cadena de
 * filtros todavia no hay controlador: ni la cadena de seguridad ni {@code TenantContextFilter}
 * pueden lanzar una excepcion y esperar que alguien la convierta. Tampoco sirve {@code
 * HttpServletResponse#sendError}, que delega en la pagina de error del contenedor: el cliente
 * recibiria HTML donde espera JSON, y la interfaz —que reacciona al campo {@code codigo}, no al
 * texto— no tendria a que reaccionar.
 *
 * <p>Antes esto estaba escrito a mano dentro del filtro de tenant. Ahora lo comparten los dos
 * sitios que rechazan una peticion sin llegar al controlador —el que dice «no se quien eres» y el
 * que dice «se quien eres, pero tu token no trae municipalidad»—, y los dos responden con la misma
 * forma que el resto de la API.
 *
 * <h2>El cuerpo se arma a mano, y por eso se escapa</h2>
 *
 * <p>Los valores que salen de aqui son constantes de {@link CodigoDeError} y hoy ninguna lleva
 * comillas ni barras. Escapar igualmente cuesta unas lineas y evita que el dia que un mensaje del
 * catalogo lleve una comilla la respuesta deje de ser JSON valido justo en el camino que nadie
 * mira, que es el de los rechazos.
 */
public final class ProblemaEnBruto {

    private ProblemaEnBruto() {}

    /** Responde con el estado del codigo y el cuerpo que el contrato declara para {@code Error}. */
    public static void responder(HttpServletResponse respuesta, CodigoDeError codigo)
            throws IOException {
        respuesta.setStatus(codigo.estado().value());
        respuesta.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.getWriter().write(cuerpo(codigo));
    }

    /**
     * Los mismos campos que arma {@code ManejadorDeErrores}: {@code status}, {@code type}, {@code
     * title} y {@code detail} de RFC 9457, mas las dos extensiones que declara el contrato.
     */
    static String cuerpo(CodigoDeError codigo) {
        String mensaje = escapar(codigo.mensaje());
        return "{\"status\":"
                + codigo.estado().value()
                + ",\"type\":\"https://sgtm.gob.pe/errores/"
                + escapar(codigo.name().toLowerCase(Locale.ROOT))
                + "\",\"title\":\""
                + mensaje
                + "\",\"detail\":\""
                + mensaje
                + "\",\"codigo\":\""
                + escapar(codigo.name())
                + "\",\"mensaje\":\""
                + mensaje
                + "\"}";
    }

    private static String escapar(String texto) {
        StringBuilder salida = new StringBuilder(texto.length() + 8);
        for (int i = 0; i < texto.length(); i++) {
            char caracter = texto.charAt(i);
            switch (caracter) {
                case '"' -> salida.append("\\\"");
                case '\\' -> salida.append("\\\\");
                case '\n' -> salida.append("\\n");
                case '\r' -> salida.append("\\r");
                case '\t' -> salida.append("\\t");
                default -> {
                    if (caracter < 0x20) {
                        salida.append(String.format(Locale.ROOT, "\\u%04x", (int) caracter));
                    } else {
                        salida.append(caracter);
                    }
                }
            }
        }
        return salida.toString();
    }
}
