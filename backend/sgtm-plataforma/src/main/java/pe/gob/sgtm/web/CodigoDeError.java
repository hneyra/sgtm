package pe.gob.sgtm.web;

import org.springframework.http.HttpStatus;

/**
 * Catalogo de codigos de error, estable.
 *
 * <p>Estable quiere decir que <b>el nombre no cambia</b> aunque cambie el mensaje: la interfaz
 * reacciona al codigo —deshabilitar un boton, ofrecer otra accion—, y un texto en castellano no
 * sirve para eso porque se reescribe en cuanto alguien lo lee en voz alta.
 *
 * <p>Cada codigo lleva su estado HTTP para que la respuesta no dependa de que quien lanza la
 * excepcion se acuerde de cual toca.
 */
public enum CodigoDeError {

    /**
     * El token no identifica una municipalidad (ADR-0005). No hay valor por omision ni modo sin
     * municipalidad.
     */
    SIN_MUNICIPALIDAD(HttpStatus.FORBIDDEN, "El token no identifica una municipalidad"),

    /** El usuario no tiene el privilegio que la operacion exige (RF-121). */
    SIN_PRIVILEGIO(HttpStatus.FORBIDDEN, "No tiene el privilegio necesario para esta operacion"),

    /** La peticion no cumple una regla de validacion o de negocio. */
    VALIDACION(HttpStatus.UNPROCESSABLE_ENTITY, "La peticion no cumple una regla de validacion"),

    /** Se pidio ordenar por un campo que la operacion no admite. */
    ORDEN_NO_ADMITIDO(HttpStatus.UNPROCESSABLE_ENTITY, "No se puede ordenar por ese campo"),

    /** Lo pedido no existe en esta municipalidad. */
    NO_ENCONTRADO(HttpStatus.NOT_FOUND, "No se encontro lo solicitado"),

    /** El estado actual no admite la operacion: un recibo ya anulado, un convenio quebrado. */
    CONFLICTO(HttpStatus.CONFLICT, "El estado actual no admite esta operacion"),

    /**
     * Cualquier otra cosa.
     *
     * <p>Su mensaje es deliberadamente inutil para quien lo recibe y util para quien lo investiga:
     * el detalle va al registro con el identificador que aparece en la respuesta. Es la unica forma
     * de no filtrar nombres de tabla ni SQL sin renunciar a poder diagnosticar.
     */
    ERROR_INTERNO(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo completar la operacion");

    private final HttpStatus estado;
    private final String mensaje;

    CodigoDeError(HttpStatus estado, String mensaje) {
        this.estado = estado;
        this.mensaje = mensaje;
    }

    public HttpStatus estado() {
        return estado;
    }

    public String mensaje() {
        return mensaje;
    }
}
