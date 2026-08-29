package pe.gob.sgtm.fiscalizacion.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

public interface ProgramaFiscalizacionRepository {

    ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa);

    Optional<ProgramaFiscalizacion> findById(long id);

    /** La grilla de programas de la pantalla {@code fisc_programa} (RF-050, #431). */
    Pagina<ProgramaFiscalizacion> consultar(CriterioDeProgramas criterio, Paginacion paginacion);
}
