package pe.gob.sgtm.rentas.aplicacion;

import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.rentas.dominio.CambioDePlaca;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.VehiculoRepository;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * La ficha del vehiculo y su historial de placas, en <b>una</b> transaccion.
 *
 * <h2>Por que existe, y no basta con que el controlador llame al repositorio</h2>
 *
 * <p>Porque una lectura fuera de transaccion no tiene {@code SET LOCAL}, y sin el la politica RLS
 * no puede evaluar {@code current_setting('app.municipalidad_id')}: la consulta <b>falla</b>. Es el
 * comportamiento correcto —mejor fallar que devolver de mas—, pero significa que un controlador que
 * llame al repositorio directamente no funciona nunca. Se descubre ejecutandolo, no leyendolo: en
 * la revision se ve una lectura simple que no parece necesitar transaccion.
 *
 * <p>Y ademas las dos consultas tienen que ir juntas: la ficha y su historial se leen en el mismo
 * instante o el historial puede describir un vehiculo que ya cambio.
 *
 * @param vehiculo la ficha
 * @param historial las placas que tuvo, de la mas reciente a la mas antigua
 */
@Service
public class ConsultaDeVehiculos {

    private final VehiculoRepository repositorio;

    public ConsultaDeVehiculos(VehiculoRepository repositorio) {
        this.repositorio = repositorio;
    }

    /** La ficha con su historial, o {@code NO_ENCONTRADO} si esa placa no esta en el padron. */
    @Transactional(readOnly = true)
    public FichaDeVehiculo porPlaca(Placa placa) {
        Vehiculo vehiculo =
                repositorio
                        .findByPlaca(placa)
                        .orElseThrow(
                                () ->
                                        new ProblemaDeNegocio(
                                                CodigoDeError.NO_ENCONTRADO,
                                                "No hay ningun vehiculo con la placa " + placa));
        long id = Objects.requireNonNull(vehiculo.id(), "Un vehiculo leido de la base tiene id");
        return new FichaDeVehiculo(vehiculo, repositorio.historialDePlacas(id));
    }

    /** Lo que la pantalla de la ficha necesita, leido de una vez. */
    public record FichaDeVehiculo(Vehiculo vehiculo, List<CambioDePlaca> historial) {}
}
