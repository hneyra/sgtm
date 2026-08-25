package pe.gob.sgtm.sanciones.aplicacion;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.cuentacorriente.GeneradorDeCargos;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccionRepository;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;

/**
 * Registra una papeleta —de tránsito (#46, RF-060) o administrativa (#47, RF-071)— con su desglose
 * <b>tomado del acta física</b>, no calculado (DAT-01 §4.5). Una sola clase para las dos familias,
 * "mismo esqueleto, distinta base legal": comparten la inserción, el asiento del cargo y la
 * auditoría; lo único que cambia entre {@link #registrarTransito} y {@link
 * #registrarAdministrativa} es la forma de los datos de origen de cada una.
 *
 * <p>Los seis importes llegan como argumentos porque este caso de uso no los deriva de ninguna
 * regla: hacerlo exigiría la UIT y la tabla de infracciones del ejercicio, que siguen bloqueadas
 * por D-02a. Lo único que valida es que el código de infracción esté <b>vigente el día de la
 * infracción</b> (regla 9) —resuelto contra el catálogo de #43, de la familia que corresponda—, no
 * que las cifras sean correctas.
 *
 * <p><b>Quién paga no lo decide esta clase.</b> En tránsito, el infractor y el propietario pueden
 * ser personas distintas; en administrativa, la papeleta puede traer solo un predio, sin
 * contribuyente. El manual no fija aquí una regla única sobre a quién se le cobra. Por eso {@code
 * contribuyenteObligadoId} es un argumento explícito de quien registra la papeleta, nunca inferido
 * dentro de este caso de uso.
 *
 * <p>El cargo se asienta con {@code referenciaExterna = "PAPELETA-" + id}, la clave <b>estable</b>
 * de la fila —no {@code numero}, que {@code CambiarNumeroDePapeleta} puede corregir después en
 * tránsito—: así el enlace con el cargo ya asentado no se rompe cuando el número cambia (AC de
 * #46).
 */
@Service
public class RegistrarPapeleta {

    private static final String TRIBUTO_TRANSITO = "MULTA_TRANSITO";
    private static final String TRIBUTO_ADMINISTRATIVA = "MULTA_ADMINISTRATIVA";
    private static final String TABLA_AUDITADA = "papeleta";

    private final PapeletaRepository papeletas;
    private final CodigoInfraccionRepository codigos;
    private final GeneradorDeCargos cargos;
    private final Auditoria auditoria;

    public RegistrarPapeleta(
            PapeletaRepository papeletas,
            CodigoInfraccionRepository codigos,
            GeneradorDeCargos cargos,
            Auditoria auditoria) {
        this.papeletas = papeletas;
        this.codigos = codigos;
        this.cargos = cargos;
        this.auditoria = auditoria;
    }

    @Transactional
    public Papeleta registrarTransito(
            String numero,
            String codigoInfraccion,
            LocalDate fechaInfraccion,
            @Nullable LocalTime horaInfraccion,
            String lugar,
            String placa,
            @Nullable Long vehiculoId,
            @Nullable String licenciaConducir,
            @Nullable Long infractorId,
            @Nullable Long propietarioId,
            long contribuyenteObligadoId,
            Dinero baseImponible,
            Alicuota porcentajeInfraccion,
            Dinero importeInfraccion,
            Alicuota porcentajeACobrar,
            Dinero importeAPagar,
            @Nullable Dinero importeConBeneficio,
            Observacion observacion) {

        long codigoInfraccionId =
                idDelCodigoVigente(Familia.TRANSITO, codigoInfraccion, fechaInfraccion);

        Papeleta nueva =
                Papeleta.nuevaTransito(
                        numero,
                        codigoInfraccionId,
                        fechaInfraccion,
                        horaInfraccion,
                        lugar,
                        placa,
                        vehiculoId,
                        licenciaConducir,
                        infractorId,
                        propietarioId,
                        baseImponible,
                        porcentajeInfraccion,
                        importeInfraccion,
                        porcentajeACobrar,
                        importeAPagar,
                        importeConBeneficio,
                        observacion);

        return guardarYAsentar(
                nueva,
                TRIBUTO_TRANSITO,
                contribuyenteObligadoId,
                null,
                vehiculoId,
                fechaInfraccion,
                importeAPagar,
                observacion);
    }

    @Transactional
    public Papeleta registrarAdministrativa(
            String numero,
            String codigoInfraccion,
            LocalDate fechaInfraccion,
            @Nullable LocalTime horaInfraccion,
            String lugar,
            @Nullable Long contribuyenteId,
            @Nullable Long predioId,
            @Nullable Long notificacionPreviaId,
            long contribuyenteObligadoId,
            Dinero baseImponible,
            Alicuota porcentajeInfraccion,
            Dinero importeInfraccion,
            Alicuota porcentajeACobrar,
            Dinero importeAPagar,
            @Nullable Dinero importeConBeneficio,
            Observacion observacion) {

        long codigoInfraccionId =
                idDelCodigoVigente(Familia.ADMINISTRATIVA, codigoInfraccion, fechaInfraccion);

        Papeleta nueva =
                Papeleta.nuevaAdministrativa(
                        numero,
                        codigoInfraccionId,
                        fechaInfraccion,
                        horaInfraccion,
                        lugar,
                        contribuyenteId,
                        predioId,
                        notificacionPreviaId,
                        baseImponible,
                        porcentajeInfraccion,
                        importeInfraccion,
                        porcentajeACobrar,
                        importeAPagar,
                        importeConBeneficio,
                        observacion);

        return guardarYAsentar(
                nueva,
                TRIBUTO_ADMINISTRATIVA,
                contribuyenteObligadoId,
                predioId,
                null,
                fechaInfraccion,
                importeAPagar,
                observacion);
    }

    // ------------------------------------------------------------------

    private long idDelCodigoVigente(Familia familia, String codigoInfraccion, LocalDate fecha) {
        return Objects.requireNonNull(
                codigos.vigenteA(familia, codigoInfraccion, fecha)
                        .orElseThrow(() -> new CodigoNoVigente(familia, codigoInfraccion, fecha))
                        .id(),
                "Un codigo ya guardado tiene identificador");
    }

    private Papeleta guardarYAsentar(
            Papeleta nueva,
            String tributo,
            long contribuyenteObligadoId,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            LocalDate fechaInfraccion,
            Dinero importeAPagar,
            Observacion observacion) {

        Papeleta guardada = papeletas.insertar(nueva);

        cargos.generarCargo(
                Ejercicio.de(fechaInfraccion),
                contribuyenteObligadoId,
                tributo,
                null,
                predioId,
                vehiculoId,
                referenciaExternaDe(guardada),
                importeAPagar,
                fechaInfraccion,
                "PAPELETA-" + guardada.numero(),
                observacion);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fechaInfraccion,
                                TABLA_AUDITADA,
                                String.valueOf(guardada.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardada)));

        return guardada;
    }

    private static String referenciaExternaDe(Papeleta papeleta) {
        return "PAPELETA-" + papeleta.id();
    }

    private static String descripcion(Papeleta papeleta) {
        return "{\"numero\":\""
                + papeleta.numero()
                + "\",\"familia\":\""
                + papeleta.familia()
                + "\",\"importeAPagar\":"
                + papeleta.importeAPagar().valor().toPlainString()
                + ",\"estado\":\""
                + papeleta.estado()
                + "\"}";
    }

    /** El código de infracción no existe, o no está vigente el día en que ocurrió. */
    public static final class CodigoNoVigente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        CodigoNoVigente(Familia familia, String codigo, LocalDate fecha) {
            super(
                    "El codigo de infraccion "
                            + codigo
                            + " no esta vigente el "
                            + fecha
                            + " (o no existe en "
                            + familia
                            + ")");
        }
    }
}
