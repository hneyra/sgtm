package pe.gob.sgtm.rentas.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.TitularDelPredio;
import pe.gob.sgtm.catastro.TitularesDelPredio;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.TitularesDeLaUnidad;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.VehiculoRepository;

/**
 * Quien contesta el puerto {@link TitularesDeLaUnidad} que declara {@code cuentacorriente} (#635).
 *
 * <h2>Por que aqui</h2>
 *
 * <p>Porque hace falta saber de las <b>dos</b> unidades y del padron: el predio lo sabe {@code
 * catastro} ({@link TitularesDelPredio}), el vehiculo lo sabe este contexto ({@code
 * VehiculoRepository}) y el nombre lo sabe {@code contribuyentes}. {@code rentas} es el unico que
 * depende de los tres sin cerrar ningun ciclo — la misma razon por la que la consulta unificada de
 * #25 vive aqui.
 *
 * <p><b>Una transaccion</b> ({@code @Transactional(readOnly = true)}): sin ella no hay {@code SET
 * LOCAL} y la politica RLS no se puede evaluar, asi que la consulta no devolveria vacio sino que
 * <b>reventaria</b> (#486). Y esa transaccion se une a la del movimiento que la llama, de modo que
 * la titularidad que se comprueba es la misma que veria el asiento.
 */
@Service
public class TitularesDeLaUnidadRentas implements TitularesDeLaUnidad {

    private final TitularesDelPredio predios;
    private final VehiculoRepository vehiculos;
    private final DirectorioDeContribuyentes directorio;

    public TitularesDeLaUnidadRentas(
            TitularesDelPredio predios,
            VehiculoRepository vehiculos,
            DirectorioDeContribuyentes directorio) {
        this.predios = predios;
        this.vehiculos = vehiculos;
        this.directorio = directorio;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TitularDeLaUnidad> delPredio(long predioId, LocalDate fecha) {
        Set<Long> ids = new LinkedHashSet<>();
        for (TitularDelPredio cuota : predios.de(predioId, fecha)) {
            ids.add(cuota.contribuyenteId());
        }
        return conNombre(ids);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TitularDeLaUnidad> delVehiculo(long vehiculoId, LocalDate fecha) {
        return vehiculos
                .findById(vehiculoId)
                .map(Vehiculo::contribuyenteId)
                .map(quien -> conNombre(Set.of(quien)))
                .orElseGet(List::of);
    }

    /**
     * Los nombres, en <b>una</b> lectura del padron.
     *
     * <p>Un titular que ya no esta en el padron no desaparece de la lista: sale con su
     * identificador y sin nombre. Esconderlo haria que la unidad pareciera de nadie, que es
     * justamente el caso que hay que poder decir en voz alta.
     */
    private List<TitularDeLaUnidad> conNombre(Set<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, ResumenDeContribuyente> padron = directorio.porIds(ids);
        List<TitularDeLaUnidad> titulares = new ArrayList<>();
        for (long id : ids) {
            ResumenDeContribuyente quien = padron.get(id);
            titulares.add(
                    new TitularDeLaUnidad(
                            id,
                            quien == null ? String.valueOf(id) : quien.codigo(),
                            quien == null ? "" : quien.nombre()));
        }
        return List.copyOf(titulares);
    }
}
