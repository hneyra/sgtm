package pe.gob.sgtm.licencias.infraestructura;

import pe.gob.sgtm.auditoria.OrigenContext;

/**
 * Quien esta operando, para la columna {@code usuario_registro}.
 *
 * <p>Sale del {@code Origen} que el filtro de la peticion fijo, nunca de un argumento: si viajara
 * en la firma, una peticion podria decir que la licencia la emitio otro funcionario, y la traza del
 * acto administrativo dejaria de significar nada.
 */
final class UsuarioDeLaSesion {

    private UsuarioDeLaSesion() {}

    static String actual() {
        return OrigenContext.actual().usuario();
    }
}
