package pe.gob.sgtm.fiscalizacion.aplicacion;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;

/**
 * Programa la muestra de predios o vehículos que entran a un proceso de fiscalización (RF-050,
 * #45).
 *
 * <p><b>Reprogramar no borra el programa anterior</b> (AC de #45): no hay ningún método de
 * actualización aquí. Un programa que reemplaza a otro es un programa nuevo, con su propio código;
 * el anterior queda tal cual, lo haya usado alguna acta o no.
 */
@Service
public class RegistrarPrograma {

    private static final String TABLA_AUDITADA = "programa_fiscalizacion";

    private final ProgramaFiscalizacionRepository repositorio;
    private final Auditoria auditoria;

    public RegistrarPrograma(ProgramaFiscalizacionRepository repositorio, Auditoria auditoria) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
    }

    @Transactional
    public ProgramaFiscalizacion registrar(
            String codigo,
            String descripcion,
            TipoDePrograma tipo,
            LocalDate fechaInicio,
            @Nullable LocalDate fechaFin,
            Observacion observacion) {

        ProgramaFiscalizacion guardado =
                repositorio.insertar(
                        ProgramaFiscalizacion.nuevo(
                                codigo, descripcion, tipo, fechaInicio, fechaFin));

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fechaInicio,
                                TABLA_AUDITADA,
                                String.valueOf(guardado.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardado)));

        return guardado;
    }

    private static String descripcion(ProgramaFiscalizacion programa) {
        return "{\"codigo\":\""
                + programa.codigo()
                + "\",\"tipo\":\""
                + programa.tipo()
                + "\",\"estado\":\""
                + programa.estado()
                + "\"}";
    }
}
