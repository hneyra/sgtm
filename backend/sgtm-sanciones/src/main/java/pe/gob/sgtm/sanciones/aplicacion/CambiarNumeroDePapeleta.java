package pe.gob.sgtm.sanciones.aplicacion;

import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;

/**
 * Corrige el número de una papeleta cuando hubo error del operador al registrarla, dejando traza en
 * {@code papeleta_cambio_numero} (RF-067, #46).
 *
 * <p><b>No rompe el enlace con el cargo ya asentado</b> (AC de #46): el {@code id} de la papeleta
 * no cambia —solo la columna {@code numero}—, y {@code RegistrarPapeleta} asentó el cargo con
 * {@code referenciaExterna = "PAPELETA-" + id}, no con el número. Cambiar el número aquí no toca
 * {@code cuenta_corriente_asiento} en absoluto.
 */
@Service
public class CambiarNumeroDePapeleta {

    private static final String TABLA_AUDITADA = "papeleta";

    private final PapeletaRepository papeletas;
    private final Auditoria auditoria;

    public CambiarNumeroDePapeleta(PapeletaRepository papeletas, Auditoria auditoria) {
        this.papeletas = papeletas;
        this.auditoria = auditoria;
    }

    @Transactional
    public Papeleta cambiar(String numeroActual, String numeroNuevo, Observacion observacion) {
        Papeleta anterior =
                papeletas
                        .porNumero(numeroActual)
                        .orElseThrow(() -> new PapeletaInexistente(numeroActual));

        long papeletaId =
                Objects.requireNonNull(
                        anterior.id(), "Una papeleta ya guardada tiene identificador");
        Papeleta actualizada =
                papeletas.cambiarNumero(papeletaId, numeroNuevo, observacion.texto());

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                anterior.fechaInfraccion(),
                                TABLA_AUDITADA,
                                String.valueOf(anterior.id()),
                                Operacion.MODIFICACION,
                                observacion)
                        .con(
                                "{\"numero\":\"" + numeroActual + "\"}",
                                "{\"numero\":\"" + actualizada.numero() + "\"}"));

        return actualizada;
    }

    /** No hay ninguna papeleta con ese número, o es de otra municipalidad. */
    public static final class PapeletaInexistente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        PapeletaInexistente(String numero) {
            super("No hay ninguna papeleta con numero '" + numero + "' en esta municipalidad");
        }
    }
}
