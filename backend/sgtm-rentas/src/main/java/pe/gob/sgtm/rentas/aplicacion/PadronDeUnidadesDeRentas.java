package pe.gob.sgtm.rentas.aplicacion;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.LectorDeCaracteristicas;
import pe.gob.sgtm.catastro.TitularDelPredio;
import pe.gob.sgtm.catastro.TitularesDelPredio;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.PadronDeUnidades;
import pe.gob.sgtm.cuentacorriente.TitularDeLaUnidad;
import pe.gob.sgtm.cuentacorriente.TitularidadDeLaUnidad;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.VehiculoRepository;

/**
 * Implementa {@link PadronDeUnidades} (#635): de quien es el predio o el vehiculo de una
 * obligacion.
 *
 * <h2>Por que vive en {@code rentas}</h2>
 *
 * <p>Porque es el unico contexto que puede contestar las dos mitades sin cerrar ningun ciclo: el
 * predio lo sabe {@code catastro} —{@link TitularesDelPredio}, el puerto de #366—, el vehiculo lo
 * sabe {@code rentas} y el codigo del padron lo sabe {@code contribuyentes}. Es exactamente el
 * reparto de {@code ConsultaDeTitulares} y el de {@code ConsultaDeConciliacion}, y el motivo que
 * ARQ-01 §2 da para la arista {@code cuentacorriente ──► rentas}.
 *
 * <h2>Existir y tener titular son dos preguntas</h2>
 *
 * <p>{@link TitularesDelPredio#de} devuelve lista vacia tanto para «el predio no existe» como para
 * «no tiene titular a esa fecha», <b>a proposito</b>: contestar distinto la convertiria en un
 * detector de predios ajenos. Pero un alta de deuda si tiene que distinguirlas —un identificador
 * que no apunta a nada no se arregla declarando nada—, asi que la existencia se pregunta aparte, a
 * {@link LectorDeCaracteristicas}, cuyo {@code Optional} vacio significa literalmente «el predio no
 * existe en esta municipalidad». Nada de esto se sale del inquilino: las dos lecturas van bajo RLS.
 *
 * <h2>El vehiculo no tiene titularidad historica, y por eso la fecha no se usa</h2>
 *
 * <p>{@code vehiculo} (V2) guarda <b>un</b> {@code contribuyente_id} y {@code
 * RegistrarTransferencia#transferirVehiculo} lo sobrescribe. No hay tabla de titularidad vehicular
 * y {@code TransferenciaRepository} tiene {@code historicoDePredio} y no su gemelo. Reconstruirlo
 * de la cadena de transferencias seria inventarlo: un vehiculo cargado con el padron inicial no
 * tiene ninguna, y el resultado —plausible y equivocado— decidiria a quien se le cobra.
 *
 * <p>Asi que se contesta con el titular de hoy y {@link PadronDeUnidades#vehiculo} lo dice en su
 * contrato, para que el rechazo pueda decirlo tambien. Darle historia al padron vehicular es otro
 * issue y lleva migracion.
 */
@Service
public class PadronDeUnidadesDeRentas implements PadronDeUnidades {

    private final LectorDeCaracteristicas predios;
    private final TitularesDelPredio titulares;
    private final VehiculoRepository vehiculos;
    private final DirectorioDeContribuyentes padron;

    public PadronDeUnidadesDeRentas(
            LectorDeCaracteristicas predios,
            TitularesDelPredio titulares,
            VehiculoRepository vehiculos,
            DirectorioDeContribuyentes padron) {
        this.predios = predios;
        this.titulares = titulares;
        this.vehiculos = vehiculos;
        this.padron = padron;
    }

    @Override
    @Transactional(readOnly = true)
    public TitularidadDeLaUnidad predio(long predioId, LocalDate fecha) {
        if (predios.de(predioId, fecha).isEmpty()) {
            return TitularidadDeLaUnidad.INEXISTENTE;
        }
        List<Long> ids =
                titulares.de(predioId, fecha).stream()
                        .map(TitularDelPredio::contribuyenteId)
                        .toList();
        return TitularidadDeLaUnidad.de(nombrar(ids));
    }

    @Override
    @Transactional(readOnly = true)
    public TitularidadDeLaUnidad vehiculo(long vehiculoId, LocalDate fecha) {
        return vehiculos
                .findById(vehiculoId)
                .map(Vehiculo::contribuyenteId)
                .map(titular -> TitularidadDeLaUnidad.de(nombrar(List.of(titular))))
                .orElse(TitularidadDeLaUnidad.INEXISTENTE);
    }

    // ------------------------------------------------------------------

    /**
     * Los titulares con su codigo del padron, en una sola lectura.
     *
     * <p>Con {@code porCodigo} en un bucle, un condominio serian tantas consultas como titulares
     * por cada alta de deuda. Y el que no se resuelva no se calla: sale como {@code #<id>}, porque
     * un titular que existe y no se sabe nombrar sigue siendo el motivo por el que el alta se
     * rechaza.
     */
    private List<TitularDeLaUnidad> nombrar(List<Long> contribuyenteIds) {
        if (contribuyenteIds.isEmpty()) {
            return List.of();
        }
        Map<Long, ResumenDeContribuyente> resueltos = padron.porIds(Set.copyOf(contribuyenteIds));
        return contribuyenteIds.stream()
                .map(
                        id -> {
                            ResumenDeContribuyente quien = resueltos.get(id);
                            return new TitularDeLaUnidad(
                                    id, quien == null ? "#" + id : quien.codigo());
                        })
                .collect(Collectors.toList());
    }
}
