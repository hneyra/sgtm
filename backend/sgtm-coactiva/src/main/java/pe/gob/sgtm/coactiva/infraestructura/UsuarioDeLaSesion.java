package pe.gob.sgtm.coactiva.infraestructura;

import pe.gob.sgtm.auditoria.OrigenContext;

/**
 * Quien esta operando, para la columna {@code usuario_registro}.
 *
 * <p>Sale del {@code Origen} que el filtro de la peticion fijo, nunca de un argumento: si viajara
 * en la firma, una peticion podria decir que la hizo otro ejecutor coactivo, y la traza del
 * expediente dejaria de significar nada.
 */
final class UsuarioDeLaSesion {

    private UsuarioDeLaSesion() {}

    static String actual() {
        return OrigenContext.actual().usuario();
    }
}
