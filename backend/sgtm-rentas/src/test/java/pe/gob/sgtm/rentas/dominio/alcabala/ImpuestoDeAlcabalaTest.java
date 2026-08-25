package pe.gob.sgtm.rentas.dominio.alcabala;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;

@DisplayName("#32 — ImpuestoDeAlcabala: alicuota sobre el exceso del tramo inafecto")
class ImpuestoDeAlcabalaTest {

    @Test
    @DisplayName("grava solo el excedente del tramo inafecto")
    void gravaSoloElExcedente() {
        Dinero resultado =
                ImpuestoDeAlcabala.calcular(
                        Dinero.de("50000.00"), Dinero.de("46000.00"), Alicuota.de("3.0"));
        // (50000 - 46000) * 3% = 4000 * 0.03 = 120.00
        assertThat(resultado).isEqualTo(Dinero.de("120.00"));
    }

    @Test
    @DisplayName("una base que no supera el tramo inafecto no genera impuesto")
    void noGeneraImpuestoBajoElTramo() {
        Dinero resultado =
                ImpuestoDeAlcabala.calcular(
                        Dinero.de("40000.00"), Dinero.de("46000.00"), Alicuota.de("3.0"));
        assertThat(resultado).isEqualTo(Dinero.CERO);
    }

    @Test
    @DisplayName("una base exactamente igual al tramo inafecto no genera impuesto")
    void unaBaseIgualAlTramoNoGeneraImpuesto() {
        Dinero resultado =
                ImpuestoDeAlcabala.calcular(
                        Dinero.de("46000.00"), Dinero.de("46000.00"), Alicuota.de("3.0"));
        assertThat(resultado).isEqualTo(Dinero.CERO);
    }
}
