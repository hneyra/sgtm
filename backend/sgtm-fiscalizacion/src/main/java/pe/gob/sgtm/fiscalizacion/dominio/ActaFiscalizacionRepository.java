package pe.gob.sgtm.fiscalizacion.dominio;

public interface ActaFiscalizacionRepository {

    ActaFiscalizacion insertar(ActaFiscalizacion acta);

    /**
     * Un acta por su identificador (#49).
     *
     * <p>Existe porque liquidar parte del acta: de ella salen el contribuyente, la unidad
     * fiscalizada, el area medida en campo y el hallazgo. Vacio si no existe o es de otra
     * municipalidad —lo segundo lo decide la politica RLS, no un {@code WHERE}—.
     */
    java.util.Optional<ActaFiscalizacion> findById(long id);

    /**
     * La próxima versión para este contribuyente dentro de este programa: 1 si nunca se le hizo un
     * acta, o la mayor existente más uno. Es lo que permite refiscalizar sin borrar la visita
     * anterior (V4: {@code acta_fisc_version_uq}).
     */
    int siguienteVersion(long programaId, long contribuyenteId);
}
