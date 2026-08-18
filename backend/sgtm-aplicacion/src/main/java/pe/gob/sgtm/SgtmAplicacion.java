package pe.gob.sgtm;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.Modulithic;
import pe.gob.sgtm.plataforma.ConfiguracionDeTenant;

/**
 * Artefacto unico del SGTM, desplegado en los perfiles {@code web} y {@code batch} (ADR-0003).
 * Mismo codigo y misma imagen; lo que cambia es la configuracion.
 *
 * <p>Cuatro modulos se declaran <b>compartidos</b>: {@code dominio} (el vocabulario comun), {@code
 * compartido} (el contexto de tenant), {@code plataforma} (el camino del token al {@code SET
 * LOCAL}) y {@code persistencia} (el patron de repositorio). Ninguno es un contexto acotado, y que
 * cualquier contexto los use no es una violacion de los limites sino su proposito: sin declararlos,
 * cada contexto que use {@code Dinero} o extienda {@code RepositorioJdbc} contaria como una
 * dependencia que explicar.
 */
@Modulithic(
        systemName = "SGTM",
        sharedModules = {"dominio", "compartido", "plataforma", "persistencia", "auditoria"})
@SpringBootApplication
@Import(ConfiguracionDeTenant.class)
public class SgtmAplicacion {

    public static void main(String[] args) {
        SpringApplication.run(SgtmAplicacion.class, args);
    }

    /**
     * El reloj del sistema, como componente inyectable.
     *
     * <p>Existe para que ninguna capa llame a {@code LocalDate.now()} sin argumento. En el dominio
     * esta prohibido y lo verifica ArchUnit; en la capa de aplicacion es legitimo necesitar la
     * fecha —la auditoria se particiona por ejercicio— pero sigue siendo indeseable que sea
     * imposible de fijar en una prueba. Un {@code Clock} inyectado resuelve las dos cosas sin
     * discutir con nadie.
     */
    @Bean
    Clock reloj() {
        return Clock.systemDefaultZone();
    }
}
