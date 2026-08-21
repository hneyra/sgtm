package pe.gob.sgtm.rentas.aplicacion;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.dominio.DeclaracionJurada;
import pe.gob.sgtm.rentas.dominio.DeclaracionJuradaRepository;
import pe.gob.sgtm.rentas.dominio.TipoDeDeclaracion;

/**
 * Registro y rectificacion de declaraciones juradas (RF-023, #28).
 *
 * <p>Sigue la plantilla de {@code RegistrarBeneficio}: la {@link Observacion} esta en la firma y en
 * la fila (regla 10). Lo propio de este caso de uso son las dos resoluciones que hace antes de
 * construir el dominio, y que {@link DeclaracionJurada} deliberadamente no hace por su cuenta:
 *
 * <ul>
 *   <li>{@code fechaLimite} sale de {@link LectorDeParametros#vigenteEn}, nunca de un literal
 *       (regla 5). Es la lectura «para determinaciones nuevas»: una DJ que se presenta hoy se
 *       compara contra el plazo vigente hoy, no contra el de un conjunto que una rectificatoria
 *       futura pudiera sellar distinto.
 *   <li>{@code fichaCatastralId} sale de {@link LectorDeFichas#fichaVigenteEn}, a la fecha de
 *       presentacion —no a hoy—: es la version que regia cuando se declaro.
 * </ul>
 */
@Service
public class RegistrarDeclaracionJurada {

    /** Tipo de {@code parametro_tributario} bajo el que vive el plazo de la DJ (ADR-0007). */
    private static final String TIPO_PARAMETRO_PLAZO = "PLAZO";

    private static final String CLAVE_PLAZO_DJ = "DECLARACION_JURADA";

    private final DeclaracionJuradaRepository repositorio;
    private final LectorDeParametros parametros;
    private final LectorDeFichas fichas;
    private final Auditoria auditoria;

    public RegistrarDeclaracionJurada(
            DeclaracionJuradaRepository repositorio,
            LectorDeParametros parametros,
            LectorDeFichas fichas,
            Auditoria auditoria) {
        this.repositorio = repositorio;
        this.parametros = parametros;
        this.fichas = fichas;
        this.auditoria = auditoria;
    }

    /** Registra una DJ nueva: HR, PU, PR o VEHICULAR. */
    @Transactional
    public DeclaracionJurada registrar(
            String numero,
            Ejercicio ejercicio,
            long contribuyenteId,
            TipoDeDeclaracion tipo,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            LocalDate fechaPresentacion,
            Observacion observacion) {

        DeclaracionJurada nueva =
                DeclaracionJurada.nueva(
                        numero,
                        ejercicio,
                        contribuyenteId,
                        tipo,
                        predioId,
                        vehiculoId,
                        fichaVigenteA(predioId, fechaPresentacion),
                        fechaPresentacion,
                        fechaLimiteDe(ejercicio),
                        observacion);

        DeclaracionJurada guardada = repositorio.insertar(nueva);
        auditar(guardada, Operacion.ALTA, observacion);
        return guardada;
    }

    /**
     * Rectifica una DJ ya presentada: crea la version nueva y deja la anterior {@code SUSTITUIDA},
     * sin tocar su contenido (regla 4). Las dos filas quedan en la base.
     */
    @Transactional
    public DeclaracionJurada rectificar(
            long anteriorId,
            String numero,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            LocalDate fechaPresentacion,
            Observacion observacion) {

        DeclaracionJurada anterior =
                repositorio
                        .findById(anteriorId)
                        .orElseThrow(() -> new DeclaracionInexistente(anteriorId));

        DeclaracionJurada rectificatoria =
                anterior.rectificadaPor(
                        numero,
                        predioId,
                        vehiculoId,
                        fichaVigenteA(predioId, fechaPresentacion),
                        fechaPresentacion,
                        fechaLimiteDe(anterior.ejercicio()),
                        observacion);

        DeclaracionJurada guardada = repositorio.insertar(rectificatoria);
        repositorio.marcarSustituida(anteriorId);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fechaPresentacion,
                                "declaracion_jurada",
                                String.valueOf(anteriorId),
                                Operacion.MODIFICACION,
                                observacion)
                        .con(descripcion(anterior), descripcion(guardada)));

        return guardada;
    }

    // ------------------------------------------------------------------

    private @Nullable Long fichaVigenteA(@Nullable Long predioId, LocalDate fecha) {
        if (predioId == null) {
            return null;
        }
        return fichas.fichaVigenteEn(predioId, fecha).orElse(null);
    }

    private LocalDate fechaLimiteDe(Ejercicio ejercicio) {
        ParametrosSellados sellados = parametros.vigenteEn(ejercicio);
        String texto =
                sellados.texto(TIPO_PARAMETRO_PLAZO, CLAVE_PLAZO_DJ)
                        .orElseThrow(() -> new PlazoSinParametrizar(ejercicio));
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new IllegalStateException(
                    "El plazo parametrizado del ejercicio "
                            + ejercicio
                            + " no es una fecha valida: '"
                            + texto
                            + "'",
                    malFormada);
        }
    }

    private void auditar(DeclaracionJurada guardada, Operacion operacion, Observacion observacion) {
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                guardada.fechaPresentacion(),
                                "declaracion_jurada",
                                String.valueOf(guardada.id()),
                                operacion,
                                observacion)
                        .con(null, descripcion(guardada)));
    }

    private static String descripcion(DeclaracionJurada declaracion) {
        return "{\"contribuyenteId\":"
                + declaracion.contribuyenteId()
                + ",\"tipo\":\""
                + declaracion.tipo()
                + "\",\"numero\":\""
                + declaracion.numero()
                + "\",\"estado\":\""
                + declaracion.estado()
                + "\",\"fueraDePlazo\":"
                + declaracion.fueraDePlazo()
                + "}";
    }

    /** No hay ninguna DJ con ese identificador, o es de otra municipalidad. */
    public static final class DeclaracionInexistente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        DeclaracionInexistente(long id) {
            super(
                    "No hay ninguna declaracion jurada con identificador "
                            + id
                            + " en esta municipalidad");
        }
    }

    /**
     * El ejercicio no tiene parametrizado el plazo de presentacion. No hay valor por omision: un
     * plazo inventado clasificaria mal cada DJ que se registre.
     */
    public static final class PlazoSinParametrizar extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        PlazoSinParametrizar(Ejercicio ejercicio) {
            super(
                    "El conjunto sellado del ejercicio "
                            + ejercicio
                            + " no tiene parametrizado el plazo de declaracion jurada");
        }
    }
}
