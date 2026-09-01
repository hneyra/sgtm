package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.cuentacorriente.PadronDeUnidades;
import pe.gob.sgtm.cuentacorriente.TitularDeLaUnidad;
import pe.gob.sgtm.cuentacorriente.TitularidadDeLaUnidad;

/**
 * El padron de unidades, con lo que cada prueba le siembre (#635).
 *
 * <p>Lo que este doble <b>no</b> puede demostrar es que la titularidad se resuelva de verdad contra
 * {@code titularidad} y {@code vehiculo}, ni que RLS deje fuera la unidad de otra municipalidad:
 * eso se mide contra PostgreSQL en {@code PadronDeUnidadesFronteraTest}, con la conexion de {@code
 * sgtm_app}. Aqui se mide el borde: que se pregunte, <b>con que fecha</b>, y que se conteste.
 */
final class PadronDeUnidadesDeMentira implements PadronDeUnidades {

    private final Map<Long, List<Long>> predios = new HashMap<>();
    private final Map<Long, List<Long>> vehiculos = new HashMap<>();
    private final List<LocalDate> fechasPreguntadas = new ArrayList<>();

    PadronDeUnidadesDeMentira conPredio(long predioId, long... titulares) {
        predios.put(predioId, deLargos(titulares));
        return this;
    }

    PadronDeUnidadesDeMentira conVehiculo(long vehiculoId, long... titulares) {
        vehiculos.put(vehiculoId, deLargos(titulares));
        return this;
    }

    @Override
    public TitularidadDeLaUnidad predio(long predioId, LocalDate fecha) {
        fechasPreguntadas.add(fecha);
        return responder(predios.get(predioId));
    }

    @Override
    public TitularidadDeLaUnidad vehiculo(long vehiculoId, LocalDate fecha) {
        fechasPreguntadas.add(fecha);
        return responder(vehiculos.get(vehiculoId));
    }

    /** Con que fecha se pregunto la titularidad; vacia si no se pregunto nada. */
    List<LocalDate> fechasPreguntadas() {
        return List.copyOf(fechasPreguntadas);
    }

    private static TitularidadDeLaUnidad responder(@Nullable List<Long> titulares) {
        if (titulares == null) {
            return TitularidadDeLaUnidad.INEXISTENTE;
        }
        return TitularidadDeLaUnidad.de(
                titulares.stream().map(id -> new TitularDeLaUnidad(id, "C-000" + id)).toList());
    }

    private static List<Long> deLargos(long... titulares) {
        List<Long> lista = new ArrayList<>();
        for (long titular : titulares) {
            lista.add(titular);
        }
        return lista;
    }
}
