package pe.gob.sgtm.fiscalizacion.dominio;

import java.util.Optional;

public interface ProgramaFiscalizacionRepository {

    ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa);

    Optional<ProgramaFiscalizacion> findById(long id);
}
