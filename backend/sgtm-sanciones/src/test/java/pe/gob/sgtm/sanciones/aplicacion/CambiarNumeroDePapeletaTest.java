package pe.gob.sgtm.sanciones.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;

@DisplayName("#46 — CambiarNumeroDePapeleta")
class CambiarNumeroDePapeletaTest {

    private static final Observacion OBSERVACION = Observacion.de("Corrige el numero del acta");

    private PapeletasDeMentira papeletas;
    private CambiarNumeroDePapeleta servicio;

    @BeforeEach
    void preparar() {
        papeletas = new PapeletasDeMentira();
        servicio = new CambiarNumeroDePapeleta(papeletas, (RegistroDeAuditoria registro) -> {});
    }

    @Test
    @DisplayName("cambia el numero sin tocar el id ni el desglose")
    void cambiaElNumeroSinTocarElIdNiElDesglose() {
        Papeleta original = papeletas.crear("PT-0001");

        Papeleta cambiada = servicio.cambiar("PT-0001", "PT-0001-B", OBSERVACION);

        assertThat(cambiada.id()).isEqualTo(original.id());
        assertThat(cambiada.numero()).isEqualTo("PT-0001-B");
        assertThat(cambiada.importeAPagar()).isEqualTo(original.importeAPagar());
    }

    @Test
    @DisplayName("una papeleta que no existe falla nombrandola")
    void unaPapeletaQueNoExisteFalla() {
        assertThatThrownBy(() -> servicio.cambiar("PT-9999", "PT-9999-B", OBSERVACION))
                .isInstanceOf(CambiarNumeroDePapeleta.PapeletaInexistente.class);
    }

    private static final class PapeletasDeMentira implements PapeletaRepository {
        private final List<Papeleta> filas = new ArrayList<>();
        private long siguiente = 1;

        Papeleta crear(String numero) {
            Papeleta nueva =
                    new Papeleta(
                            siguiente++,
                            pe.gob.sgtm.sanciones.dominio.Familia.TRANSITO,
                            numero,
                            1L,
                            LocalDate.of(2026, 3, 1),
                            null,
                            "Av. Grau",
                            "ABC-123",
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            1L,
                            Dinero.de("5500"),
                            Alicuota.de("8"),
                            Dinero.de("440"),
                            Alicuota.de("100"),
                            Dinero.de("440"),
                            null,
                            pe.gob.sgtm.sanciones.dominio.EstadoDePapeleta.IMPUESTA,
                            "prueba",
                            OBSERVACION);
            filas.add(nueva);
            return nueva;
        }

        @Override
        public Papeleta insertar(Papeleta papeleta) {
            throw new UnsupportedOperationException("esta prueba no registra papeletas nuevas");
        }

        @Override
        public Optional<Papeleta> porNumero(String numero) {
            return filas.stream().filter(p -> p.numero().equals(numero)).findFirst();
        }

        @Override
        public Optional<Papeleta> porNumero(
                pe.gob.sgtm.sanciones.dominio.Familia familia, String numero) {
            return porNumero(numero);
        }

        @Override
        public Optional<Papeleta> porId(long id) {
            return Optional.empty();
        }

        @Override
        public pe.gob.sgtm.compartido.Pagina<Papeleta> buscar(
                CriterioDePapeleta criterio, pe.gob.sgtm.compartido.Paginacion paginacion) {
            throw new UnsupportedOperationException("esta prueba no lista papeletas");
        }

        @Override
        public Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo) {
            for (int i = 0; i < filas.size(); i++) {
                Papeleta actual = filas.get(i);
                if (actual.id() != null && actual.id() == papeletaId) {
                    Papeleta renombrada = actual.conNumero(numeroNuevo);
                    filas.set(i, renombrada);
                    return renombrada;
                }
            }
            throw new IllegalStateException("No hay papeleta con id " + papeletaId);
        }
    }
}
