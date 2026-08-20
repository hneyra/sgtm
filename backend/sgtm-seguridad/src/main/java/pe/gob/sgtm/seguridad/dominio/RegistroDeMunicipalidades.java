package pe.gob.sgtm.seguridad.dominio;

/**
 * El registro de tenants: la unica escritura del sistema que no la hace {@code sgtm_app}.
 *
 * <p>{@code V6__rls.sql} le pone a {@code municipalidad} una politica {@code FOR ALL TO sgtm_owner}
 * y lo explica sin rodeos: «dar de alta una municipalidad es una operacion de implantacion». Este
 * puerto existe para que esa excepcion tenga un sitio con nombre en lugar de aparecer como un
 * {@code DriverManager} suelto en medio de un caso de uso.
 *
 * <p>Es deliberadamente diminuto. No hay {@code renombrar}, ni {@code desactivar}, ni consulta: lo
 * que no se necesita para implantar no se pone, porque cada metodo aqui es una capacidad que el
 * proceso de implantacion tendria sobre <b>todas</b> las municipalidades.
 */
public interface RegistroDeMunicipalidades {

    /**
     * Da de alta la municipalidad si no existe, y devuelve su identificador.
     *
     * <p>Idempotente por {@code ubigeo}: repetirlo no crea una segunda fila ni falla. Si ya existe,
     * <b>no</b> actualiza el nombre ni el tipo — un despliegue no es el sitio donde se corrige el
     * nombre de una municipalidad, y hacerlo en silencio seria peor que no hacerlo.
     */
    long darDeAltaSiFalta(String ubigeo, String nombre, String tipo);
}
