package pe.gob.sgtm.plataforma.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import pe.gob.sgtm.compartido.OrigenContext;
import pe.gob.sgtm.compartido.OrigenPeticion;

/** {@link OrigenContextFilter}: de donde sale cada campo de {@link OrigenPeticion} (ADR-0008). */
@DisplayName("ADR-0008 — El origen de la peticion se puebla en el borde de la aplicacion")
class OrigenContextFilterTest {

    private final OrigenContextFilter filtro = new OrigenContextFilter();

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("con token autenticado, el usuario es el subject del JWT")
    void conTokenAutenticadoElUsuarioEsElSubject() throws Exception {
        autenticarConSubject("usuario-41");
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.setRemoteAddr("10.0.0.5");

        ejecutar(peticion, cadenaQueObserva(visto));

        assertThat(visto.get()).isNotNull();
        assertThat(visto.get().usuarioId()).isEqualTo("usuario-41");
    }

    @Test
    @DisplayName("sin token, el usuario es 'desconocido' y no se inventa uno")
    void sinTokenElUsuarioEsDesconocido() throws Exception {
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        ejecutar(new MockHttpServletRequest(), cadenaQueObserva(visto));

        assertThat(visto.get()).isNotNull();
        assertThat(visto.get().usuarioId()).isEqualTo("desconocido");
    }

    @Test
    @DisplayName("la IP sale de getRemoteAddr()")
    void laIpSaleDeGetRemoteAddr() throws Exception {
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.setRemoteAddr("192.168.1.10");

        ejecutar(peticion, cadenaQueObserva(visto));

        assertThat(visto.get().ip()).isEqualTo("192.168.1.10");
    }

    @Test
    @DisplayName("el equipo sale de X-Equipo si el cliente lo manda")
    void elEquipoSaleDeCabeceraXEquipo() throws Exception {
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.addHeader(OrigenContextFilter.CABECERA_EQUIPO, "CAJA-03");
        peticion.addHeader("Host", "sgtm.example.pe");

        ejecutar(peticion, cadenaQueObserva(visto));

        assertThat(visto.get().equipo())
                .as("X-Equipo tiene prioridad sobre Host")
                .isEqualTo("CAJA-03");
    }

    @Test
    @DisplayName("sin X-Equipo, el equipo cae a la cabecera Host")
    void sinXEquipoCaeAHost() throws Exception {
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.addHeader("Host", "sgtm.example.pe");

        ejecutar(peticion, cadenaQueObserva(visto));

        assertThat(visto.get().equipo()).isEqualTo("sgtm.example.pe");
    }

    @Test
    @DisplayName("sin X-Equipo ni Host, el equipo es 'desconocido'")
    void sinNingunaCabeceraElEquipoEsDesconocido() throws Exception {
        AtomicReference<OrigenPeticion> visto = new AtomicReference<>();

        ejecutar(new MockHttpServletRequest(), cadenaQueObserva(visto));

        assertThat(visto.get().equipo()).isEqualTo("desconocido");
    }

    @Test
    @DisplayName("al terminar la peticion el contexto se limpia")
    void alTerminarSeLimpia() throws Exception {
        ejecutar(new MockHttpServletRequest(), new MockFilterChain());

        assertThat(OrigenContext.actualSiHay())
                .as("el hilo vuelve al pool de hilos: no puede llevarse el contexto puesto")
                .isEmpty();
    }

    @Test
    @DisplayName("el contexto se limpia aunque la cadena lance")
    void seLimpiaAunqueLaCadenaLance() {
        assertThatThrownBy(
                        () ->
                                ejecutar(
                                        new MockHttpServletRequest(),
                                        (peticion, respuesta) -> {
                                            throw new IllegalStateException(
                                                    "fallo del controlador");
                                        }))
                .isInstanceOf(IllegalStateException.class);

        assertThat(OrigenContext.actualSiHay()).isEmpty();
    }

    // ------------------------------------------------------------------

    private void autenticarConSubject(String subject) {
        Jwt token =
                Jwt.withTokenValue("t")
                        .header("alg", "none")
                        .subject(subject)
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(60))
                        .build();
        SecurityContextHolder.getContext()
                .setAuthentication(new JwtAuthenticationToken(token, List.of()));
    }

    private void ejecutar(MockHttpServletRequest peticion, FilterChain cadena)
            throws ServletException, IOException {
        filtro.doFilter(peticion, new MockHttpServletResponse(), cadena);
    }

    private static FilterChain cadenaQueObserva(AtomicReference<OrigenPeticion> visto) {
        return (peticion, respuesta) -> visto.set(OrigenContext.actualSiHay().orElse(null));
    }
}
