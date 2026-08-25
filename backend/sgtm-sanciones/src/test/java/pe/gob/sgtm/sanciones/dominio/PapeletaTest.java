package pe.gob.sgtm.sanciones.dominio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;

@DisplayName("#46 — Papeleta")
class PapeletaTest {

    private static final Observacion OBSERVACION = Observacion.de("Se registra para la prueba");
    private static final LocalDate FECHA = LocalDate.of(2026, 3, 1);

    @Test
    @DisplayName("una papeleta nueva no tiene id, y nace IMPUESTA")
    void unaPapeletaNuevaNoTieneIdYNaceImpuesta() {
        Papeleta papeleta = papeletaDe("PT-0001", "ABC-123");

        assertThat(papeleta.esNueva()).isTrue();
        assertThat(papeleta.estado()).isEqualTo(EstadoDePapeleta.IMPUESTA);
    }

    @Test
    @DisplayName("una papeleta de transito exige placa (papeleta_familia_ck)")
    void unaPapeletaDeTransitoExigePlaca() {
        assertThatThrownBy(
                        () ->
                                Papeleta.nueva(
                                        "PT-0002",
                                        1L,
                                        FECHA,
                                        null,
                                        "Av. Grau",
                                        "  ",
                                        null,
                                        null,
                                        null,
                                        null,
                                        Dinero.de("5500"),
                                        Alicuota.de("8"),
                                        Dinero.de("440"),
                                        Alicuota.de("100"),
                                        Dinero.de("440"),
                                        null,
                                        OBSERVACION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("sin observacion no se construye (regla 10)")
    void sinObservacionNoSeConstruye() {
        assertThatThrownBy(
                        () ->
                                Papeleta.nueva(
                                        "PT-0003",
                                        1L,
                                        FECHA,
                                        null,
                                        "Av. Grau",
                                        "ABC-123",
                                        null,
                                        null,
                                        null,
                                        null,
                                        Dinero.de("5500"),
                                        Alicuota.de("8"),
                                        Dinero.de("440"),
                                        Alicuota.de("100"),
                                        Dinero.de("440"),
                                        null,
                                        null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("conNumero conserva el desglose, y solo cambia el numero")
    void conNumeroConservaElDesglose() {
        Papeleta original = papeletaConId("PT-0004", "ABC-123", 1L);

        Papeleta renumerada = original.conNumero("PT-0004-B");

        assertThat(renumerada.numero()).isEqualTo("PT-0004-B");
        assertThat(renumerada.id()).isEqualTo(original.id());
        assertThat(renumerada.importeAPagar()).isEqualTo(original.importeAPagar());
        assertThat(renumerada.baseImponible()).isEqualTo(original.baseImponible());
    }

    @Test
    @DisplayName("no se cambia el numero de una papeleta que no esta guardada")
    void noSeCambiaElNumeroDeUnaPapeletaSinGuardar() {
        Papeleta sinGuardar = papeletaDe("PT-0005", "ABC-123");

        assertThatThrownBy(() -> sinGuardar.conNumero("PT-0005-B"))
                .isInstanceOf(NullPointerException.class);
    }

    private static Papeleta papeletaDe(String numero, String placa) {
        return Papeleta.nueva(
                numero,
                1L,
                FECHA,
                null,
                "Av. Grau",
                placa,
                null,
                null,
                null,
                null,
                Dinero.de("5500"),
                Alicuota.de("8"),
                Dinero.de("440"),
                Alicuota.de("100"),
                Dinero.de("440"),
                null,
                OBSERVACION);
    }

    private static Papeleta papeletaConId(String numero, String placa, long id) {
        Papeleta nueva = papeletaDe(numero, placa);
        return new Papeleta(
                id,
                nueva.numero(),
                nueva.codigoInfraccionId(),
                nueva.fechaInfraccion(),
                nueva.horaInfraccion(),
                nueva.lugar(),
                nueva.placa(),
                nueva.vehiculoId(),
                nueva.licenciaConducir(),
                nueva.infractorId(),
                nueva.propietarioId(),
                nueva.baseImponible(),
                nueva.porcentajeInfraccion(),
                nueva.importeInfraccion(),
                nueva.porcentajeACobrar(),
                nueva.importeAPagar(),
                nueva.importeConBeneficio(),
                nueva.estado(),
                "prueba",
                nueva.observacion());
    }
}
