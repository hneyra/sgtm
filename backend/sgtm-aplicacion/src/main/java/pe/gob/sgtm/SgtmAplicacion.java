package pe.gob.sgtm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.Modulithic;
import pe.gob.sgtm.plataforma.ConfiguracionDeTenant;

/**
 * Artefacto unico del SGTM, desplegado en los perfiles {@code web} y {@code batch} (ADR-0003).
 * Mismo codigo y misma imagen; lo que cambia es la configuracion.
 *
 * <p>{@code dominio}, {@code compartido} y {@code plataforma} se declaran modulos compartidos: no
 * son contextos acotados, y que cualquier contexto los use no es una violacion de los limites sino
 * su proposito. {@code dominio} es el vocabulario comun —importes, periodos, codigos—; sin
 * declararlo aqui, cada contexto que use {@code Dinero} contaria como dependencia a explicar.
 */
@Modulithic(
        systemName = "SGTM",
        sharedModules = {"dominio", "compartido", "plataforma"})
@SpringBootApplication
@Import(ConfiguracionDeTenant.class)
public class SgtmAplicacion {

    public static void main(String[] args) {
        SpringApplication.run(SgtmAplicacion.class, args);
    }
}
