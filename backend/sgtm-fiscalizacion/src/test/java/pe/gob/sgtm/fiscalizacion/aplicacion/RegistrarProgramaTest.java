package pe.gob.sgtm.fiscalizacion.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeProgramas;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;

@DisplayName("#45 — RegistrarPrograma")
class RegistrarProgramaTest {

    @Test
    @DisplayName("registrar guarda el programa y audita el alta")
    void registrarGuardaElProgramaYAuditaElAlta() {
        List<ProgramaFiscalizacion> guardados = new ArrayList<>();
        List<RegistroDeAuditoria> auditados = new ArrayList<>();
        ProgramaFiscalizacionRepository repositorio =
                new ProgramaFiscalizacionRepository() {
                    private long siguiente = 1;

                    @Override
                    public ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa) {
                        ProgramaFiscalizacion guardado =
                                new ProgramaFiscalizacion(
                                        siguiente++,
                                        programa.codigo(),
                                        programa.descripcion(),
                                        programa.tipo(),
                                        programa.fechaInicio(),
                                        programa.fechaFin(),
                                        programa.estado());
                        guardados.add(guardado);
                        return guardado;
                    }

                    @Override
                    public Optional<ProgramaFiscalizacion> findById(long id) {
                        return guardados.stream().filter(p -> p.id() == id).findFirst();
                    }

                    @Override
                    public Pagina<ProgramaFiscalizacion> consultar(
                            CriterioDeProgramas criterio, Paginacion paginacion) {
                        throw new UnsupportedOperationException(
                                "esta prueba no consulta la grilla de programas");
                    }
                };
        RegistrarPrograma servicio = new RegistrarPrograma(repositorio, auditados::add);

        ProgramaFiscalizacion guardado =
                servicio.registrar(
                        "PF-010",
                        "Muestra de riesgo",
                        TipoDePrograma.PREDIAL,
                        LocalDate.of(2026, 4, 1),
                        null,
                        Observacion.de("Se programa para la prueba"));

        assertThat(guardado.id()).isNotNull();
        assertThat(guardado.estado()).isEqualTo(EstadoDePrograma.ABIERTO);
        assertThat(guardados).hasSize(1);
        assertThat(auditados).hasSize(1);
    }
}
