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
import pe.gob.sgtm.cuentacorriente.GeneradorDeCargos;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccion;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccionRepository;
import pe.gob.sgtm.sanciones.dominio.CriterioDeCodigoInfraccion;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;

/**
 * #46 — sin base de datos: lo que se verifica aquí es la orquestación (código vigente a la fecha
 * del hecho, referencia externa estable para el cargo). El aislamiento y "reimprimir da los mismos
 * seis importes" contra PostgreSQL real viven en {@code PapeletaRepositoryJdbcTest}.
 */
@DisplayName("#46 — RegistrarPapeleta")
class RegistrarPapeletaTest {

    private static final Observacion OBSERVACION = Observacion.de("Se registra para la prueba");
    private static final LocalDate FECHA_INFRACCION = LocalDate.of(2026, 3, 15);

    private PapeletasDeMentira papeletas;
    private CargosDeMentira cargos;
    private List<RegistroDeAuditoria> auditados;
    private RegistrarPapeleta servicio;

    @BeforeEach
    void preparar() {
        papeletas = new PapeletasDeMentira();
        cargos = new CargosDeMentira();
        auditados = new ArrayList<>();
        servicio = new RegistrarPapeleta(papeletas, codigosDeMentira(), cargos, auditados::add);
    }

    @Test
    @DisplayName("registra la papeleta y asienta el cargo con referencia externa estable")
    void registraLaPapeletaYAsientaElCargo() {
        Papeleta guardada = registrarUna();

        assertThat(guardada.id()).isNotNull();
        assertThat(cargos.generados).hasSize(1);
        assertThat(cargos.generados.get(0).referenciaExterna())
                .isEqualTo("PAPELETA-" + guardada.id());
        assertThat(cargos.generados.get(0).monto()).isEqualTo(Dinero.de("440"));
        assertThat(auditados).hasSize(1);
    }

    @Test
    @DisplayName("la referencia externa del cargo usa el id, nunca el numero")
    void laReferenciaExternaUsaElIdNoElNumero() {
        Papeleta guardada = registrarUna();

        assertThat(cargos.generados.get(0).referenciaExterna()).doesNotContain(guardada.numero());
    }

    @Test
    @DisplayName("un codigo que no esta vigente esa fecha falla, y no asienta nada")
    void unCodigoQueNoEstaVigenteEsaFechaFalla() {
        assertThatThrownBy(
                        () ->
                                servicio.registrar(
                                        "PT-9999",
                                        "G-99",
                                        FECHA_INFRACCION,
                                        null,
                                        "Av. Grau",
                                        "ABC-123",
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
                                        OBSERVACION))
                .isInstanceOf(RegistrarPapeleta.CodigoNoVigente.class);

        assertThat(papeletas.filas).isEmpty();
        assertThat(cargos.generados).isEmpty();
    }

    private Papeleta registrarUna() {
        return servicio.registrar(
                "PT-0001",
                "G-01",
                FECHA_INFRACCION,
                null,
                "Av. Grau",
                "ABC-123",
                10L,
                null,
                100L,
                101L,
                200L,
                Dinero.de("5500"),
                Alicuota.de("8"),
                Dinero.de("440"),
                Alicuota.de("100"),
                Dinero.de("440"),
                null,
                OBSERVACION);
    }

    private static CodigoInfraccionRepository codigosDeMentira() {
        return new CodigoInfraccionRepository() {
            @Override
            public Optional<CodigoInfraccion> findById(long id) {
                return Optional.empty();
            }

            @Override
            public Optional<CodigoInfraccion> vigenteA(
                    Familia familia, String codigo, LocalDate fecha) {
                if (!"G-01".equals(codigo)) {
                    return Optional.empty();
                }
                return Optional.of(
                        new CodigoInfraccion(
                                77L,
                                Familia.TRANSITO,
                                "G-01",
                                "Exceso de velocidad",
                                Alicuota.de("8"),
                                null,
                                null,
                                "RNT art. 300",
                                LocalDate.of(2020, 1, 1),
                                null));
            }

            @Override
            public pe.gob.sgtm.compartido.Pagina<CodigoInfraccion> buscar(
                    CriterioDeCodigoInfraccion criterio,
                    pe.gob.sgtm.compartido.Paginacion paginacion) {
                throw new UnsupportedOperationException("esta prueba no lista codigos");
            }

            @Override
            public CodigoInfraccion insertar(CodigoInfraccion codigoInfraccion) {
                throw new UnsupportedOperationException("esta prueba no escribe codigos");
            }

            @Override
            public CodigoInfraccion actualizar(CodigoInfraccion codigoInfraccion) {
                throw new UnsupportedOperationException("esta prueba no escribe codigos");
            }
        };
    }

    private static final class PapeletasDeMentira implements PapeletaRepository {
        private final List<Papeleta> filas = new ArrayList<>();
        private long siguiente = 1;

        @Override
        public Papeleta insertar(Papeleta papeleta) {
            Papeleta guardada =
                    new Papeleta(
                            siguiente++,
                            papeleta.numero(),
                            papeleta.codigoInfraccionId(),
                            papeleta.fechaInfraccion(),
                            papeleta.horaInfraccion(),
                            papeleta.lugar(),
                            papeleta.placa(),
                            papeleta.vehiculoId(),
                            papeleta.licenciaConducir(),
                            papeleta.infractorId(),
                            papeleta.propietarioId(),
                            papeleta.baseImponible(),
                            papeleta.porcentajeInfraccion(),
                            papeleta.importeInfraccion(),
                            papeleta.porcentajeACobrar(),
                            papeleta.importeAPagar(),
                            papeleta.importeConBeneficio(),
                            papeleta.estado(),
                            "prueba",
                            papeleta.observacion());
            filas.add(guardada);
            return guardada;
        }

        @Override
        public Optional<Papeleta> porNumero(String numero) {
            return filas.stream().filter(p -> p.numero().equals(numero)).findFirst();
        }

        @Override
        public pe.gob.sgtm.compartido.Pagina<Papeleta> buscar(
                CriterioDePapeleta criterio, pe.gob.sgtm.compartido.Paginacion paginacion) {
            throw new UnsupportedOperationException("esta prueba no lista papeletas");
        }

        @Override
        public Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo) {
            throw new UnsupportedOperationException("esta prueba no cambia numeros");
        }
    }

    private static final class CargosDeMentira implements GeneradorDeCargos {
        private final List<CargoGenerado> generados = new ArrayList<>();

        @Override
        public void generarCargo(
                Ejercicio ejercicio,
                long contribuyenteId,
                String tributo,
                Integer periodo,
                Long predioId,
                Long vehiculoId,
                String referenciaExterna,
                Dinero monto,
                LocalDate fechaValor,
                String documentoOrigen,
                Observacion observacion) {
            generados.add(new CargoGenerado(contribuyenteId, referenciaExterna, monto));
        }
    }

    private record CargoGenerado(long contribuyenteId, String referenciaExterna, Dinero monto) {}
}
