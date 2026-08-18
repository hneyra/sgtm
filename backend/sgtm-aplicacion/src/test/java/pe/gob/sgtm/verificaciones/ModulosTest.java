package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import pe.gob.sgtm.SgtmAplicacion;

/**
 * Limites entre modulos (ADR-0003, ARQ-01 §4). Bloqueante.
 *
 * <p>Sin esto, "monolito modular" degrada a monolito en pocos meses: nada impide que un contexto
 * llame a las clases internas de otro, y cuando se nota ya hay cincuenta llamadas que desenredar.
 */
@DisplayName("ADR-0003 — Limites entre modulos")
class ModulosTest {

    private static final ApplicationModules MODULOS = ApplicationModules.of(SgtmAplicacion.class);

    @Test
    @DisplayName("los modulos esperados estan detectados")
    void losModulosEsperadosEstanDetectados() {
        List<String> detectados =
                MODULOS.stream().map(m -> m.getIdentifier().toString()).sorted().toList();

        // Si Modulith no detectara ningun modulo, verify() pasaria sin comprobar nada.
        //
        // Heredado del SRTM y verificado alli: un paquete con solo package-info.java
        // NO es un modulo para Modulith, hace falta al menos un tipo. Por eso los doce
        // contextos acotados todavia no aparecen: apareceran con su primera clase.
        assertThat(detectados)
                .as("los modulos que ya tienen codigo")
                .contains(
                        "dominio",
                        "compartido",
                        "plataforma",
                        "persistencia",
                        "auditoria",
                        "catastro",
                        "seguridad");
    }

    @Test
    @DisplayName("no hay dependencias no declaradas ni ciclos entre modulos")
    void noHayDependenciasNoDeclaradasNiCiclos() {
        MODULOS.verify();
    }
}
