package pe.gob.sgtm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.Modulithic;
import pe.gob.sgtm.plataforma.ConfiguracionDeAuditoria;
import pe.gob.sgtm.plataforma.ConfiguracionDeTenant;

/**
 * Artefacto unico del SGTM, desplegado en los perfiles {@code web} y {@code batch} (ADR-0003).
 * Mismo codigo y misma imagen; lo que cambia es la configuracion.
 *
 * <p>Cinco modulos se declaran <b>compartidos</b>: {@code dominio} (el vocabulario comun), {@code
 * compartido} (el contexto de tenant y el de origen de la peticion), {@code plataforma} (el camino
 * del token al {@code SET LOCAL}), {@code persistencia} (el patron de repositorio) y {@code
 * auditoria} (ADR-0008: ninguna escritura sin observacion). Ninguno es un contexto acotado, y que
 * cualquier contexto los use no es una violacion de los limites sino su proposito: sin declararlos,
 * cada contexto que use {@code Dinero}, extienda {@code RepositorioJdbc} o llame a {@code
 * AuditoriaService} contaria como una dependencia que explicar.
 */
@Modulithic(
        systemName = "SGTM",
        sharedModules = {"dominio", "compartido", "plataforma", "persistencia", "auditoria"})
@SpringBootApplication
@Import({ConfiguracionDeTenant.class, ConfiguracionDeAuditoria.class})
public class SgtmAplicacion {

    public static void main(String[] args) {
        SpringApplication.run(SgtmAplicacion.class, args);
    }
}
