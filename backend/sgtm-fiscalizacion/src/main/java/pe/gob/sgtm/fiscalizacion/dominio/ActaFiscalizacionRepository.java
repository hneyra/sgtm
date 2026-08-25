package pe.gob.sgtm.fiscalizacion.dominio;

public interface ActaFiscalizacionRepository {

    ActaFiscalizacion insertar(ActaFiscalizacion acta);

    /**
     * La próxima versión para este contribuyente dentro de este programa: 1 si nunca se le hizo un
     * acta, o la mayor existente más uno. Es lo que permite refiscalizar sin borrar la visita
     * anterior (V4: {@code acta_fisc_version_uq}).
     */
    int siguienteVersion(long programaId, long contribuyenteId);
}
