package pe.gob.sgtm.plataforma.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.gob.sgtm.compartido.OrigenContext;
import pe.gob.sgtm.compartido.OrigenPeticion;

/**
 * Puebla {@link OrigenContext} desde la peticion HTTP, para que {@code AuditoriaService} sepa
 * quien, desde donde (ADR-0008).
 *
 * <h2>De donde sale cada campo</h2>
 *
 * <ul>
 *   <li><b>Usuario</b>: el {@code subject} del JWT autenticado, igual que {@link
 *       TenantContextFilter} lee el claim de municipalidad del mismo token. Sin token autenticado,
 *       {@code "desconocido"}: hay procesos batch legitimos sin peticion HTTP en absoluto (ver
 *       {@link OrigenContext#actualSiHay()}), y una peticion publica que de todos modos llegara a
 *       escribir algo no deberia hacerlo con un usuario inventado que parezca uno real.
 *   <li><b>IP</b>: {@link HttpServletRequest#getRemoteAddr()}.
 *   <li><b>Equipo</b>: la cabecera {@code X-Equipo} si el cliente la manda; si no, la cabecera
 *       {@code Host}; si tampoco, {@code "desconocido"}.
 * </ul>
 *
 * <p><b>Por que {@code Host} y no el nombre de maquina del manual.</b> Es una decision deliberada y
 * una limitacion real, no un descuido: el sistema original corria en una red municipal donde el
 * cliente era un PC con Windows y el servidor podia preguntarle su nombre NetBIOS. Un navegador no
 * expone eso a un servidor HTTP por ningun medio, y no hay forma de recuperarlo sin que el cliente
 * lo mande el mismo. {@code X-Equipo} es el gancho para el dia que un cliente municipal (un
 * quiosco, una app de campo) quiera declarar su identidad; {@code Host} es lo mejor que hay
 * mientras tanto y sigue siendo mas util que nada.
 */
public final class OrigenContextFilter extends OncePerRequestFilter {

    /** Cabecera opcional con la que un cliente puede declarar su equipo de origen. */
    public static final String CABECERA_EQUIPO = "X-Equipo";

    private static final String DESCONOCIDO = "desconocido";

    @Override
    protected void doFilterInternal(
            HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {

        OrigenContext.fijar(
                new OrigenPeticion(usuario(), equipo(peticion), peticion.getRemoteAddr()));
        try {
            cadena.doFilter(peticion, respuesta);
        } finally {
            // Siempre, incluso si la cadena lanza: el hilo vuelve al pool de hilos
            // igual que TenantContext.limpiar().
            OrigenContext.limpiar();
        }
    }

    private static String usuario() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacion != null
                && autenticacion.isAuthenticated()
                && autenticacion.getPrincipal() instanceof Jwt token) {
            String subject = token.getSubject();
            return subject != null ? subject : DESCONOCIDO;
        }
        return DESCONOCIDO;
    }

    private static String equipo(HttpServletRequest peticion) {
        String declarado = peticion.getHeader(CABECERA_EQUIPO);
        if (declarado != null && !declarado.isBlank()) {
            return declarado;
        }
        String host = peticion.getHeader("Host");
        return host != null && !host.isBlank() ? host : DESCONOCIDO;
    }
}
