package pe.gob.sgtm.fiscalizacion.dominio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Observacion;

@DisplayName("#45 — ActaFiscalizacion")
class ActaFiscalizacionTest {

    private static final Observacion OBSERVACION = Observacion.de("Se registra para la prueba");
    private static final LocalDate VISITA = LocalDate.of(2026, 3, 15);

    @Test
    @DisplayName("un acta predial nueva no tiene id, y es predial")
    void unActaPredialNuevaNoTieneIdYEsPredial() {
        ActaFiscalizacion acta =
                ActaFiscalizacion.nuevaPredial(
                        1L,
                        1,
                        1L,
                        1L,
                        1L,
                        VISITA,
                        "J. Perez",
                        Hallazgo.CONFORME,
                        AreaM2.de("120.00"),
                        "sin novedad",
                        OBSERVACION);

        assertThat(acta.esNueva()).isTrue();
        assertThat(acta.esPredial()).isTrue();
        assertThat(acta.estado()).isEqualTo(EstadoDeActa.ABIERTA);
    }

    @Test
    @DisplayName("un acta vehicular nunca lleva ficha ni area")
    void unActaVehicularNuncaLlevaFichaNiArea() {
        ActaFiscalizacion acta =
                ActaFiscalizacion.nuevaVehicular(
                        1L,
                        1,
                        1L,
                        1L,
                        VISITA,
                        "J. Perez",
                        Hallazgo.OMISO,
                        "no declarado",
                        OBSERVACION);

        assertThat(acta.esPredial()).isFalse();
        assertThat(acta.fichaId()).isNull();
        assertThat(acta.areaHallada()).isNull();
        assertThat(acta.vehiculoId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("un acta no puede ser de predio y de vehiculo a la vez, ni de ninguno")
    void unActaNoPuedeSerDeLosDosNiDeNinguno() {
        assertThatThrownBy(
                        () ->
                                new ActaFiscalizacion(
                                        null,
                                        1L,
                                        1,
                                        1L,
                                        1L,
                                        1L,
                                        null,
                                        VISITA,
                                        "J. Perez",
                                        null,
                                        null,
                                        null,
                                        EstadoDeActa.ABIERTA,
                                        OBSERVACION))
                .as("predio y vehiculo a la vez")
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(
                        () ->
                                new ActaFiscalizacion(
                                        null,
                                        1L,
                                        1,
                                        1L,
                                        null,
                                        null,
                                        null,
                                        VISITA,
                                        "J. Perez",
                                        null,
                                        null,
                                        null,
                                        EstadoDeActa.ABIERTA,
                                        OBSERVACION))
                .as("ni predio ni vehiculo")
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("solo un acta predial referencia una ficha")
    void soloUnActaPredialReferenciaUnaFicha() {
        assertThatThrownBy(
                        () ->
                                new ActaFiscalizacion(
                                        null,
                                        1L,
                                        1,
                                        1L,
                                        null,
                                        1L,
                                        5L,
                                        VISITA,
                                        "J. Perez",
                                        null,
                                        null,
                                        null,
                                        EstadoDeActa.ABIERTA,
                                        OBSERVACION))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("sin observacion no se construye (regla 10)")
    void sinObservacionNoSeConstruye() {
        assertThatThrownBy(
                        () ->
                                ActaFiscalizacion.nuevaVehicular(
                                        1L, 1, 1L, 1L, VISITA, "J. Perez", null, null, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("la version empieza en 1")
    void laVersionEmpiezaEn1() {
        assertThatThrownBy(
                        () ->
                                ActaFiscalizacion.nuevaVehicular(
                                        1L, 0, 1L, 1L, VISITA, "J. Perez", null, null, OBSERVACION))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
