package pe.gob.sgtm.plataforma;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * La cadena de filtros de seguridad, escrita en vez de heredada.
 *
 * <h2>Por que existe este archivo</h2>
 *
 * <p>Con {@code spring-boot-starter-oauth2-resource-server} en el classpath y <b>ninguna</b> cadena
 * declarada, Spring Boot arma la suya: protege todo con autenticacion basica y una clave generada
 * que escribe en el registro de arranque. El efecto en este sistema es peor que un endpoint
 * abierto, porque no se parece a un fallo: sin emisor configurado no hay {@code JwtDecoder}, sin
 * {@code JwtDecoder} no hay {@code Jwt} en el {@code SecurityContextHolder}, y {@link
 * pe.gob.sgtm.plataforma.tenant.TenantContextFilter} toma entonces siempre su camino de «peticion
 * sin token: sigue sin contexto». Toda consulta falla despues en la base por falta de contexto de
 * tenant —que es el comportamiento correcto del aislamiento— y el sistema queda mudo sin que nada
 * se vea roto.
 *
 * <h2>Lo que decide hoy, y lo que no</h2>
 *
 * <p>Hoy son dos reglas, y las dos son deliberadamente estrechas:
 *
 * <ul>
 *   <li>{@code /actuator/health} es publico. Es lo que permite que el orquestador sepa si el
 *       proceso esta vivo y con base de datos; sin un endpoint publico, {@code depends_on:
 *       service_healthy} no puede significar nada. No expone detalles: {@code show-details} va en
 *       {@code never}, asi que dice si y no que.
 *   <li>Todo lo demas se <b>niega</b>. No «se deja pasar mientras tanto»: mientras no haya emisor
 *       de identidad no hay forma de autenticar a nadie, y una API que responde a peticiones sin
 *       identidad porque todavia no se configuro la identidad es exactamente el descuido que este
 *       archivo existe para impedir.
 * </ul>
 *
 * <p>El emisor, el {@code issuer-uri}, el realm y la verificacion del claim son la iteracion de
 * identidad: ahi el {@code denyAll} de abajo se sustituye por el servidor de recursos con JWT, y
 * esta clase pasa a decidir que rutas son publicas y cuales exigen token. Hasta entonces el sistema
 * no atiende a nadie, y ahora lo dice el codigo en lugar de ocurrir por omision.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SeguridadWeb {

    /** Lo unico que se atiende sin identidad: la sonda de vida del orquestador. */
    public static final String SONDA_DE_SALUD = "/actuator/health";

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(
                        rutas ->
                                rutas.requestMatchers(SONDA_DE_SALUD)
                                        .permitAll()
                                        .anyRequest()
                                        .denyAll())
                // Sin mecanismos de autenticacion interactivos: este backend no tiene
                // formulario de acceso ni acepta clave por cabecera. Dejarlos puestos
                // haria que una peticion negada devolviera una redireccion a una pantalla
                // que no existe, o un dialogo de clave del navegador.
                .httpBasic(mecanismo -> mecanismo.disable())
                .formLogin(mecanismo -> mecanismo.disable())
                .logout(mecanismo -> mecanismo.disable())
                .build();
    }
}
