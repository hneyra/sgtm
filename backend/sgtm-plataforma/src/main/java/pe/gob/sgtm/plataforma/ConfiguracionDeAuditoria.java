package pe.gob.sgtm.plataforma;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.gob.sgtm.plataforma.tenant.OrigenContextFilter;

/**
 * Cablea el mecanismo de auditoria (ADR-0008): el reloj del que sale el ejercicio de cada registro,
 * y el filtro que puebla {@code OrigenContext} desde la peticion HTTP.
 *
 * <p>Separada de {@link ConfiguracionDeTenant} a proposito: son dos contextos distintos —tenant y
 * origen de peticion— y mezclarlos en una sola clase de configuracion los haria parecer una sola
 * decision cuando son dos.
 *
 * <p><b>Por que vive en el modulo {@code plataforma} y no en el modulo {@code auditoria}</b>,
 * aunque cablea un mecanismo que ese modulo expone: {@link OrigenContextFilter} vive en {@code
 * pe.gob.sgtm.plataforma.tenant}, subpaquete interno del modulo {@code plataforma} para Spring
 * Modulith. Una clase de otro modulo que lo instanciara violaria el limite entre modulos —
 * exactamente el error que {@code ModulosTest} existe para atrapar—, asi que quien cablea el filtro
 * tiene que vivir en el mismo modulo que el filtro. El paquete raiz de {@code plataforma} es ademas
 * donde ya vive {@link ConfiguracionDeTenant}, que hace lo mismo para {@code TenantContextFilter}.
 */
@Configuration(proxyBeanMethods = false)
public class ConfiguracionDeAuditoria {

    /**
     * Mismo orden que {@code TenantContextFilter}: dentro de la cadena de Spring Security, para
     * poder leer el {@code SecurityContextHolder} ya poblado, y no antes ni despues el uno del
     * otro, porque ninguno de los dos depende del otro.
     */
    private static final int ORDEN_DESPUES_DE_SEGURIDAD = 0;

    /**
     * El reloj del que sale el ejercicio de cada registro de auditoria ({@code
     * AuditoriaServiceJdbc}). Un bean y no una lectura directa de {@code Clock.systemDefaultZone()}
     * en la clase que lo usa: asi una prueba puede sustituirlo por uno fijo sin que el ejercicio
     * dependa de en que dia corre el build (regla 6, por extension).
     *
     * <p>{@code @ConditionalOnMissingBean}: si otro modulo alguna vez necesita fijar el reloj de
     * toda la aplicacion, su bean gana y este no compite.
     */
    @Bean
    @ConditionalOnMissingBean(Clock.class)
    Clock relojDeAuditoria() {
        return Clock.systemDefaultZone();
    }

    /**
     * Registra el filtro <b>despues</b> de la cadena de Spring Security, igual que {@code
     * TenantContextFilter}: lee el {@code SecurityContextHolder} ya poblado.
     *
     * <p>Solo en el perfil {@code web}: el perfil {@code batch} no atiende HTTP, y un proceso batch
     * que necesite auditar fija su propio {@code OrigenContext} antes de escribir.
     */
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    FilterRegistrationBean<OrigenContextFilter> filtroDeContextoDeOrigen() {
        FilterRegistrationBean<OrigenContextFilter> registro =
                new FilterRegistrationBean<>(new OrigenContextFilter());
        registro.setOrder(ORDEN_DESPUES_DE_SEGURIDAD);
        return registro;
    }
}
