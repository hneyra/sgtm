package pe.gob.sgtm.rentas.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Beneficios y exoneraciones (RF-029). Ningun metodo recibe la municipalidad (regla 2): sale del
 * token y la aplica la politica RLS.
 *
 * <p><b>No hay {@code delete}.</b> Un beneficio se cesa, no se borra (regla 4): {@link #actualizar}
 * es como se guarda el cese, sin tocar el resto de la fila.
 */
public interface BeneficioRepository {

    Optional<Beneficio> findById(long id);

    Pagina<Beneficio> buscar(CriterioDeBeneficio criterio, Paginacion paginacion);

    /**
     * Los beneficios de ese tipo que tiene el contribuyente, vigentes o no. Es lo que consulta
     * {@code RegistrarBeneficio} antes de dar de alta uno nuevo, para rechazar el que se solape.
     */
    List<Beneficio> delContribuyente(long contribuyenteId, String tipo);

    /**
     * Los beneficios de ese tributo, vigentes a esa fecha, que tiene el predio —independientemente
     * de quién sea hoy su titular (#31): un predio sin servicio de limpieza lo sigue sin tener
     * aunque el predio cambie de dueño.
     */
    List<Beneficio> vigentesDelPredio(long predioId, String tributo, LocalDate fecha);

    Beneficio insertar(Beneficio beneficio);

    /** Guarda el cese: la unica escritura que admite un beneficio ya guardado. */
    Beneficio actualizar(Beneficio beneficio);
}
