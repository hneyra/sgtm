package pe.gob.sgtm.plataforma;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaEnBruto;

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
 * <h2>Las reglas de hoy</h2>
 *
 * <ul>
 *   <li>{@code /actuator/health} es publico. Es lo que permite que el orquestador sepa si el
 *       proceso esta vivo y con base de datos; sin un endpoint publico, {@code depends_on:
 *       service_healthy} no puede significar nada. No expone detalles: {@code show-details} va en
 *       {@code never}, asi que dice si y no que.
 *   <li>Todo lo demas exige un token que el emisor configurado haya firmado. No hay lista de rutas
 *       protegidas: la regla es {@code anyRequest().authenticated()}, asi que una ruta nueva nace
 *       protegida y hay que escribir una linea para abrirla. Al reves —una lista de lo protegido—
 *       cada endpoint nuevo nace publico y nadie se entera.
 * </ul>
 *
 * <h2>El emisor no tiene valor por omision, y el proceso no arranca sin el</h2>
 *
 * <p>{@code spring.security.oauth2.resourceserver.jwt.issuer-uri} sale de {@code SGTM_OIDC_EMISOR}
 * y no trae respaldo. Sin la variable el contexto no levanta: es ruidoso, ocurre en el arranque y
 * en el despliegue, y no en la primera peticion de un usuario. La alternativa —arrancar sin emisor
 * y negarlo todo— produce un sistema que responde a la sonda de vida, se declara sano y no atiende
 * a nadie.
 *
 * <p>El {@code issuer-uri} hace ademas que Spring valide el claim {@code iss}: un token
 * perfectamente firmado por <b>otro</b> emisor se rechaza. Con solo {@code jwk-set-uri} —la otra
 * forma de configurarlo— la validacion por omision no mira el emisor, y bastaria con que el
 * atacante tuviera un token valido de cualquier otro realm del mismo Keycloak.
 *
 * <h2>Lo que este archivo decide en negativo</h2>
 *
 * <ul>
 *   <li><b>Sin sesion.</b> {@code STATELESS}: no se crea {@code HttpSession}, asi que no hay cookie
 *       de sesion que robar ni que sincronizar entre nodos. La identidad viaja entera en el token,
 *       que en la interfaz vive en memoria (FRO-01 §5).
 *   <li><b>Sin CSRF.</b> Se desactiva <i>porque</i> lo anterior es cierto, no por comodidad: CSRF
 *       explota que el navegador adjunta credenciales solo — cookies — a una peticion que origina
 *       otro sitio. Un {@code Authorization: Bearer} lo pone el codigo de la aplicacion, y otro
 *       origen no puede leerlo. El dia que la sesion vuelva a una cookie, esta linea vuelve atras.
 *   <li><b>Sin formulario ni clave por cabecera.</b> Dejarlos puestos haria que una peticion negada
 *       devolviera una redireccion a una pantalla que no existe, o un dialogo de clave del
 *       navegador.
 *   <li><b>Sin CORS.</b> La interfaz no llama al backend desde otro origen: en desarrollo Vite
 *       reenvia {@code /api}, y en la instalacion va detras del mismo proxy. Quien si recibe
 *       peticiones del navegador desde otro origen es Keycloak, y eso se declara en el realm
 *       ({@code webOrigins}), no aqui.
 * </ul>
 *
 * <h2>Lo que todavia no verifica</h2>
 *
 * <p><b>La audiencia.</b> Un token emitido por este realm a cualquier cliente lo acepta el backend,
 * porque la validacion por omision mira emisor y vencimiento, no {@code aud}. Hoy el realm tiene un
 * solo cliente y el efecto es nulo; el dia que tenga dos —una app movil, un integrador— deja de
 * serlo, y entonces hacen falta un mapeador de audiencia en el realm y un {@code JwtClaimValidator}
 * aqui. Esta escrito para que sea una decision y no un olvido.
 *
 * <p><b>La lista de municipalidades autorizadas</b> de un usuario con acceso a varias: es D-06, y
 * {@code TenantContextFilter} documenta por que.
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
                                        .authenticated())
                .oauth2ResourceServer(
                        servidor ->
                                servidor.jwt(Customizer.withDefaults())
                                        .authenticationEntryPoint(sinIdentidad()))
                .sessionManagement(
                        sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(proteccion -> proteccion.disable())
                .cors(mecanismo -> mecanismo.disable())
                .httpBasic(mecanismo -> mecanismo.disable())
                .formLogin(mecanismo -> mecanismo.disable())
                .logout(mecanismo -> mecanismo.disable())
                .build();
    }

    /**
     * El 401 sale en la misma forma que el resto de la API.
     *
     * <p>Va colgado del servidor de recursos y <b>no</b> tambien de {@code exceptionHandling}. Se
     * comprobo quitandolo de ahi: las once pruebas siguen en verde, porque configurar el servidor
     * de recursos ya instala su punto de entrada como el de toda la cadena. La segunda linea era
     * decorativa, y una linea decorativa en una configuracion de seguridad es una que alguien leera
     * como si hiciera algo.
     *
     * <p>Sin esto, Spring Security devuelve un 401 con el cuerpo vacio y un {@code
     * WWW-Authenticate}. Para un navegador da igual; para {@code solicitar()} de la interfaz no: es
     * el unico camino de error que llegaria sin el campo {@code codigo} al que reacciona, y la
     * sesion vencida —el 401 mas frecuente que va a existir— se veria como un fallo de red.
     */
    private static AuthenticationEntryPoint sinIdentidad() {
        return (peticion, respuesta, fallo) ->
                ProblemaEnBruto.responder(respuesta, CodigoDeError.SIN_IDENTIDAD);
    }
}
