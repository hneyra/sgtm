package pe.gob.sgtm.web;

/** Constantes del contrato HTTP. */
public final class Api {

    /**
     * Raiz de todas las operaciones.
     *
     * <p>Coincide con el {@code servers.url} de {@code docs/50-api/openapi/sgtm-v1.yaml}, y hay una
     * prueba que compara las rutas publicadas con las del contrato: si alguien monta un controlador
     * fuera de aqui, se nota.
     */
    public static final String RAIZ = "/api/v1";

    private Api() {}
}
