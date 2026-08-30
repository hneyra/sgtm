package pe.gob.sgtm.fiscalizacion.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dobles.ActasEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.DeclaracionesDeMentira;
import pe.gob.sgtm.fiscalizacion.dobles.PadronDeMentira;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeProgramas;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelProgramaRepository;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;

/**
 * El sorteo de la muestra (#481, AC 2 de #431), sin base de datos.
 *
 * <p>La detección <b>no se reimplementa aquí</b>: el sorteo llama a {@link DeteccionDeOmisos}, que
 * es la única fuente de la condición en el sistema y la misma que dibuja {@code fisc_omisos}. Lo
 * que estas pruebas miden es lo que el sorteo añade — las dos exclusiones, la guarda de los
 * parámetros y la de sortear dos veces.
 */
@DisplayName("#481 — Generar la muestra de un programa")
class GenerarMuestraTest {

    private static final Ejercicio E2026 = new Ejercicio(2026);
    private static final LocalDate HOY = LocalDate.of(2026, 3, 16);
    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-03-16T09:00:00Z"), ZoneOffset.UTC);
    private static final Observacion OBSERVACION = Observacion.de("Se sortea la muestra anual");

    private static final long OMISO_UNO = 21L;
    private static final long OMISO_DOS = 22L;
    private static final long CONFORME = 23L;
    private static final long FICHA = 700L;

    private final ProgramasEnMemoria programas = new ProgramasEnMemoria();
    private final MuestrasEnMemoria muestras = new MuestrasEnMemoria();
    private final ActasEnMemoria actas = new ActasEnMemoria();
    private final List<RegistroDeAuditoria> auditados = new ArrayList<>();

    @Test
    @DisplayName("sortea solo los predios cuya condicion es la que el programa busca")
    void sorteaSoloLosDelCriterio() {
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));

        int cuantos = servicio().generar(programaId, OBSERVACION);

        assertThat(cuantos).isEqualTo(2);
        assertThat(muestras.predios()).containsExactlyInAnyOrder(OMISO_UNO, OMISO_DOS);
    }

    @Test
    @DisplayName("la fila guardada copia la condicion y las dos areas del dia del sorteo")
    void laFilaCopiaLoQueLaDeteccionConcluyo() {
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));

        servicio().generar(programaId, OBSERVACION);

        MuestraDelPrograma fila =
                muestras.guardadas.stream()
                        .filter(m -> m.predioId() == OMISO_UNO)
                        .findFirst()
                        .orElseThrow();
        assertThat(fila.condicion()).isEqualTo(CondicionFiscalizada.OMISO);
        assertThat(fila.areaCatastral()).isEqualTo(AreaM2.de("120.00"));
        assertThat(fila.fechaSorteo())
                .as("la foto lleva su fecha, y sale del reloj inyectado (regla 9)")
                .isEqualTo(HOY);
    }

    @Test
    @DisplayName("un predio que otro programa ABIERTO ya se llevo no se vuelve a sortear")
    void noSorteaUnPredioDeOtroProgramaAbierto() {
        long otro = programas.sembrar(programa(CondicionFiscalizada.OMISO));
        muestras.sembrar(otro, OMISO_UNO);
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));

        int cuantos = servicio().generar(programaId, OBSERVACION);

        assertThat(cuantos)
                .as("la muestra depende del orden: el primero que se genera se lleva los predios")
                .isEqualTo(1);
        assertThat(muestras.prediosDe(programaId)).containsExactly(OMISO_DOS);
    }

    @Test
    @DisplayName("y uno ya fiscalizado en el ejercicio tampoco")
    void noSorteaUnPredioYaFiscalizadoEsteEjercicio() {
        actas.sembrar(
                ActaFiscalizacion.nuevaPredial(
                        99L,
                        1,
                        100L + OMISO_DOS,
                        OMISO_DOS,
                        FICHA,
                        LocalDate.of(2026, 2, 1),
                        "R. MENDOZA CRUZ",
                        Hallazgo.OMISO,
                        null,
                        null,
                        OBSERVACION));
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));

        servicio().generar(programaId, OBSERVACION);

        assertThat(muestras.prediosDe(programaId)).containsExactly(OMISO_UNO);
    }

    @Test
    @DisplayName("un programa sin criterio no puede sortear, y el 422 dice cual le falta")
    void unProgramaSinCriterioNoSortea() {
        long programaId =
                programas.sembrar(
                        ProgramaFiscalizacion.nuevo(
                                "PF-SIN",
                                "Programa anterior a V60",
                                TipoDePrograma.PREDIAL,
                                LocalDate.of(2026, 1, 1),
                                null));

        assertThatThrownBy(() -> servicio().generar(programaId, OBSERVACION))
                .isInstanceOf(GenerarMuestra.ProgramaSinParametros.class)
                .hasMessageContaining("ejercicio");
        assertThat(muestras.guardadas).isEmpty();
    }

    @Test
    @DisplayName("sortear dos veces no se permite: hay actas levantadas sobre la foto")
    void sortearDosVecesNoSePermite() {
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));
        servicio().generar(programaId, OBSERVACION);

        assertThatThrownBy(() -> servicio().generar(programaId, OBSERVACION))
                .isInstanceOf(GenerarMuestra.MuestraYaSorteada.class);
        assertThat(muestras.guardadas).hasSize(2);
    }

    @Test
    @DisplayName("un programa que no existe no sortea nada")
    void unProgramaQueNoExisteNoSortea() {
        assertThatThrownBy(() -> servicio().generar(404L, OBSERVACION))
                .isInstanceOf(GenerarMuestra.ProgramaInexistente.class);
    }

    @Test
    @DisplayName("el sorteo se audita con su observacion y cuantos predios entraron")
    void elSorteoSeAudita() {
        long programaId = programas.sembrar(programa(CondicionFiscalizada.OMISO));

        servicio().generar(programaId, OBSERVACION);

        assertThat(auditados).hasSize(1);
        assertThat(auditados.get(0).observacion()).isEqualTo(OBSERVACION);
        assertThat(auditados.get(0).datosNuevos()).contains("\"predios\":2");
    }

    // ------------------------------------------------------------------

    private GenerarMuestra servicio() {
        PadronDeMentira catastro =
                new PadronDeMentira()
                        .conFicha(FICHA, AreaM2.de("120.00"))
                        .con(predio(OMISO_UNO))
                        .con(predio(OMISO_DOS))
                        .con(predio(CONFORME));

        DeclaracionesDeMentira rentas =
                new DeclaracionesDeMentira()
                        .con(
                                CONFORME,
                                new pe.gob.sgtm.rentas.DeclaracionDelEjercicio(
                                        1L,
                                        "DJ-0001",
                                        E2026,
                                        100L + CONFORME,
                                        LocalDate.of(2026, 2, 1),
                                        false,
                                        FICHA));

        return new GenerarMuestra(
                programas,
                muestras,
                actas,
                new DeteccionDeOmisos(catastro, catastro, rentas),
                auditados::add,
                RELOJ);
    }

    private static ProgramaFiscalizacion programa(CondicionFiscalizada criterio) {
        return ProgramaFiscalizacion.nuevo(
                "PF-" + criterio.name(),
                "Programa de prueba",
                TipoDePrograma.PREDIAL,
                LocalDate.of(2026, 1, 1),
                null,
                E2026,
                null,
                criterio,
                "R. MENDOZA CRUZ");
    }

    private static PredioDelPadron predio(long id) {
        return new PredioDelPadron(
                id,
                String.format("%018d", id),
                "Jr. Union " + id,
                "S-01",
                100L + id,
                AreaM2.de("120.00"),
                "CASA_HABITACION",
                FICHA);
    }

    /** Programas en memoria: sólo lo que el sorteo pide. */
    private static final class ProgramasEnMemoria implements ProgramaFiscalizacionRepository {
        private final List<ProgramaFiscalizacion> filas = new ArrayList<>();
        private long siguiente = 1;

        long sembrar(ProgramaFiscalizacion programa) {
            return insertar(programa).id();
        }

        @Override
        public ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa) {
            ProgramaFiscalizacion guardado =
                    new ProgramaFiscalizacion(
                            siguiente++,
                            programa.codigo() + "-" + siguiente,
                            programa.descripcion(),
                            programa.tipo(),
                            programa.fechaInicio(),
                            programa.fechaFin(),
                            EstadoDePrograma.ABIERTO,
                            programa.ejercicio(),
                            programa.sectorCodigo(),
                            programa.criterio(),
                            programa.fiscalizador());
            filas.add(guardado);
            return guardado;
        }

        @Override
        public Optional<ProgramaFiscalizacion> findById(long id) {
            return filas.stream().filter(p -> p.id() != null && p.id() == id).findFirst();
        }

        @Override
        public Pagina<ProgramaFiscalizacion> consultar(
                CriterioDeProgramas criterio, Paginacion paginacion) {
            throw new UnsupportedOperationException("el sorteo no consulta la grilla");
        }
    }

    /** La muestra en memoria, con la misma exclusión que la consulta real. */
    private static final class MuestrasEnMemoria implements MuestraDelProgramaRepository {
        private final List<MuestraDelPrograma> guardadas = new ArrayList<>();

        void sembrar(long programaId, long predioId) {
            guardadas.add(
                    new MuestraDelPrograma(
                            (long) guardadas.size() + 1,
                            programaId,
                            predioId,
                            String.format("%018d", predioId),
                            100L + predioId,
                            CondicionFiscalizada.OMISO,
                            null,
                            null,
                            null,
                            HOY));
        }

        Set<Long> predios() {
            Set<Long> ids = new HashSet<>();
            guardadas.forEach(m -> ids.add(m.predioId()));
            return ids;
        }

        List<Long> prediosDe(long programaId) {
            return guardadas.stream()
                    .filter(m -> m.programaId() == programaId)
                    .map(MuestraDelPrograma::predioId)
                    .toList();
        }

        @Override
        public int insertar(
                List<MuestraDelPrograma> filas, Observacion observacion, Instant fechaRegistro) {
            guardadas.addAll(filas);
            return filas.size();
        }

        @Override
        public boolean tieneMuestra(long programaId) {
            return guardadas.stream().anyMatch(m -> m.programaId() == programaId);
        }

        @Override
        public Pagina<MuestraDelPrograma> delPrograma(
                long programaId, @Nullable Long predioId, Paginacion paginacion) {
            throw new UnsupportedOperationException("el sorteo no lee la grilla");
        }

        @Override
        public Set<Long> prediosEnProgramasAbiertos(long programaPropio, Set<Long> predios) {
            // El doble sólo siembra programas abiertos: lo que el CERRADO cambia lo mide
            // `MuestraDelProgramaRepositoryJdbcTest` contra PostgreSQL de verdad.
            return guardadas.stream()
                    .filter(m -> m.programaId() != programaPropio)
                    .map(MuestraDelPrograma::predioId)
                    .filter(predios::contains)
                    .collect(java.util.stream.Collectors.toSet());
        }
    }
}
