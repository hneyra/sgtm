package pe.gob.sgtm.plataforma;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.RespuestaDeError;

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
 * <h2>Las tres reglas</h2>
 *
 * <ul>
 *   <li>{@code /actuator/health} es publico. Es lo que permite que el orquestador sepa si el
 *       proceso esta vivo y con base de datos; sin un endpoint publico, {@code depends_on:
 *       service_healthy} no puede significar nada. No expone detalles: {@code show-details} va en
 *       {@code never}, asi que dice si y no que.
 *   <li>{@code /api/v1/**} exige un token que valide contra el emisor configurado. Validar es
 *       comprobar la firma contra su JWKS, el vencimiento y el emisor; el <b>claim</b> {@code
 *       municipalidad_id} lo exige despues {@code TenantContextFilter}, que corre por dentro de
 *       esta cadena y por eso ve la autenticacion ya puesta.
 *   <li>Todo lo demas se <b>niega</b>. Una ruta que nadie declaro no es una ruta que convenga
 *       servir, y {@code /actuator/**} entero cae aqui: {@code health} esta nombrado uno por uno,
 *       de modo que exponer un endpoint nuevo del actuator exige tambien abrirlo aqui.
 * </ul>
 *
 * <h2>Sin sesion y sin CSRF, y por que eso no es un descuido</h2>
 *
 * <p>La autenticacion viaja en el encabezado {@code Authorization} y en ningun otro sitio: no hay
 * cookie de sesion, y el frontend guarda el token <b>en memoria</b> (FRO-01 §5). CSRF protege
 * contra que el navegador adjunte una credencial ambiental —una cookie— a una peticion que el
 * usuario no hizo; sin credencial ambiental no hay nada que adjuntar. Dejar CSRF puesto con
 * sesiones sin estado solo produciria 403 en cada escritura.
 *
 * <h2>Lo que todavia no hace</h2>
 *
 * <p><b>D-06:</b> el token de un usuario con acceso a varias municipalidades llevara la lista de
 * autorizadas ademas de la activa, y comprobar que la activa esta en la lista es una defensa
 * barata. El nombre de ese claim no esta fijado. Hasta entonces, un usuario, una municipalidad.
 *
 * <p><b>D-07:</b> el portal del contribuyente, cuyo token no lleva municipalidad, necesita su
 * propia cadena y sus propias pruebas.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SeguridadWeb {

    /** Lo unico que se atiende sin identidad: la sonda de vida del orquestador. */
    public static final String SONDA_DE_SALUD = "/actuator/health";

    /** Todo lo que publica la API, bajo la raiz que declara el contrato. */
    public static final String RAIZ_DE_LA_API = "/api/v1/**";

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(
                        rutas ->
                                rutas.requestMatchers(SONDA_DE_SALUD)
                                        .permitAll()
                                        .requestMatchers(RAIZ_DE_LA_API)
                                        .authenticated()
                                        .anyRequest()
                                        .denyAll())
                .oauth2ResourceServer(
                        servidor ->
                                servidor.jwt(jwt -> {})
                                        // Sin esto, un token invalido devuelve el cuerpo vacio de
                                        // Spring Security en vez del error del catalogo, y la
                                        // interfaz no tiene a que reaccionar.
                                        .authenticationEntryPoint(entradaSinToken())
                                        .accessDeniedHandler(accesoDenegado()))
                // La misma respuesta para lo que no pasa por el servidor de recursos: una ruta
                // negada tiene que contestar igual la pida quien la pida.
                .exceptionHandling(
                        errores ->
                                errores.authenticationEntryPoint(entradaSinToken())
                                        .accessDeniedHandler(accesoDenegado()))
                .sessionManagement(
                        sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(proteccion -> proteccion.disable())
                // Sin mecanismos de autenticacion interactivos: este backend no tiene formulario de
                // acceso ni acepta clave por cabecera. Dejarlos puestos haria que una peticion
                // negada devolviera una redireccion a una pantalla que no existe, o el dialogo de
                // clave del navegador.
                .httpBasic(mecanismo -> mecanismo.disable())
                .formLogin(mecanismo -> mecanismo.disable())
                .logout(mecanismo -> mecanismo.disable())
                .build();
    }

    private static AuthenticationEntryPoint entradaSinToken() {
        return (peticion, respuesta, excepcion) ->
                RespuestaDeError.escribir(respuesta, CodigoDeError.NO_AUTENTICADO);
    }

    private static AccessDeniedHandler accesoDenegado() {
        return (peticion, respuesta, excepcion) ->
                RespuestaDeError.escribir(respuesta, CodigoDeError.SIN_PRIVILEGIO);
    }
}
