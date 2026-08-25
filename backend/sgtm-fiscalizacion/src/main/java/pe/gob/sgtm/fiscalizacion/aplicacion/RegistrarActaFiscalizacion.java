package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;

/**
 * El acta de inspección: predial (RF-051) o vehicular (RF-052), sobre una <b>copia</b> —esta clase
 * nunca escribe en {@code catastro} ni en {@code rentas} (ARQ-01 §3.5, AC de #45).
 *
 * <p>La única resolución que hace antes de construir el dominio, y que {@link ActaFiscalizacion}
 * deliberadamente no hace por su cuenta: {@code fichaId} sale de {@link
 * LectorDeFichas#fichaVigenteEn}, a la fecha de la visita —no a hoy—, para que el contraste
 * hallado/declarado se pueda reproducir después (RNF-075), igual que {@code
 * RegistrarDeclaracionJurada} en {@code rentas} (#28).
 *
 * <p>La versión —la visita número N sobre este contribuyente dentro del mismo programa— sale de
 * {@link ActaFiscalizacionRepository#siguienteVersion}: refiscalizar no reemplaza el acta anterior,
 * agrega una versión (V4: {@code acta_fisc_version_uq}).
 */
@Service
public class RegistrarActaFiscalizacion {

    private static final String TABLA_AUDITADA = "acta_fiscalizacion";

    private final ActaFiscalizacionRepository actas;
    private final ProgramaFiscalizacionRepository programas;
    private final LectorDeFichas fichas;
    private final Auditoria auditoria;

    public RegistrarActaFiscalizacion(
            ActaFiscalizacionRepository actas,
            ProgramaFiscalizacionRepository programas,
            LectorDeFichas fichas,
            Auditoria auditoria) {
        this.actas = actas;
        this.programas = programas;
        this.fichas = fichas;
        this.auditoria = auditoria;
    }

    @Transactional
    public ActaFiscalizacion registrarPredial(
            long programaId,
            long contribuyenteId,
            long predioId,
            LocalDate fechaVisita,
            String fiscalizador,
            @Nullable Hallazgo hallazgo,
            @Nullable BigDecimal areaHallada,
            @Nullable String detalle,
            Observacion observacion) {

        exigirPrograma(programaId, TipoDePrograma.PREDIAL);
        Long fichaId = fichas.fichaVigenteEn(predioId, fechaVisita).orElse(null);

        return guardar(
                ActaFiscalizacion.nuevaPredial(
                        programaId,
                        actas.siguienteVersion(programaId, contribuyenteId),
                        contribuyenteId,
                        predioId,
                        fichaId,
                        fechaVisita,
                        fiscalizador,
                        hallazgo,
                        areaHallada == null ? null : new AreaM2(areaHallada),
                        detalle,
                        observacion));
    }

    @Transactional
    public ActaFiscalizacion registrarVehicular(
            long programaId,
            long contribuyenteId,
            long vehiculoId,
            LocalDate fechaVisita,
            String fiscalizador,
            @Nullable Hallazgo hallazgo,
            @Nullable String detalle,
            Observacion observacion) {

        exigirPrograma(programaId, TipoDePrograma.VEHICULAR);

        return guardar(
                ActaFiscalizacion.nuevaVehicular(
                        programaId,
                        actas.siguienteVersion(programaId, contribuyenteId),
                        contribuyenteId,
                        vehiculoId,
                        fechaVisita,
                        fiscalizador,
                        hallazgo,
                        detalle,
                        observacion));
    }

    // ------------------------------------------------------------------

    private void exigirPrograma(long programaId, TipoDePrograma tipoEsperado) {
        ProgramaFiscalizacion programa =
                programas
                        .findById(programaId)
                        .orElseThrow(() -> new ProgramaInexistente(programaId));
        if (programa.tipo() != tipoEsperado) {
            throw new ProgramaDeOtroTipo(programa, tipoEsperado);
        }
    }

    private ActaFiscalizacion guardar(ActaFiscalizacion nueva) {
        ActaFiscalizacion guardada = actas.insertar(nueva);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                guardada.fechaVisita(),
                                TABLA_AUDITADA,
                                String.valueOf(guardada.id()),
                                Operacion.ALTA,
                                guardada.observacion())
                        .con(null, descripcion(guardada)));

        return guardada;
    }

    private static String descripcion(ActaFiscalizacion acta) {
        return "{\"programaId\":"
                + acta.programaId()
                + ",\"version\":"
                + acta.version()
                + ",\"contribuyenteId\":"
                + acta.contribuyenteId()
                + ",\"hallazgo\":"
                + (acta.hallazgo() == null ? "null" : "\"" + acta.hallazgo() + "\"")
                + "}";
    }

    /**
     * No hay ningun programa de fiscalizacion con ese identificador, o es de otra municipalidad.
     */
    public static final class ProgramaInexistente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        ProgramaInexistente(long id) {
            super("No hay ningun programa de fiscalizacion con identificador " + id);
        }
    }

    /** El acta es predial y el programa es vehicular, o al reves. */
    public static final class ProgramaDeOtroTipo extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        ProgramaDeOtroTipo(ProgramaFiscalizacion programa, TipoDePrograma tipoEsperado) {
            super(
                    "El programa "
                            + programa.codigo()
                            + " es "
                            + programa.tipo()
                            + ", no "
                            + tipoEsperado
                            + ": no se le puede registrar un acta de ese tipo");
        }
    }
}
