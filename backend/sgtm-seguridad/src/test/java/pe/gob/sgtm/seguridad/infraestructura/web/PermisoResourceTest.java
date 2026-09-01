package pe.gob.sgtm.seguridad.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;

/**
 * {@code PermisoResource} distingue una fila de <b>grupo</b> de una de <b>usuario</b> (#543).
 *
 * <h2>Que estaba mal</h2>
 *
 * <p>El recurso era {@code record PermisoResource(long id, String acceso, long grupoId,
 * List<String> privilegios)}: {@code grupoId} <b>primitivo</b>, con {@code 0L} cuando la fila no
 * tenia grupo —o sea, cuando era una excepcion de usuario—, y sin {@code usuarioId} en ninguna
 * parte. Por HTTP, una excepcion de usuario salia <b>indistinguible de un permiso del grupo 0</b>,
 * y no habia ni un campo con el que separarlas.
 *
 * <h2>Por que se prueba llamando al mapeo y no por HTTP</h2>
 *
 * <p>Porque hoy <b>ninguna ruta devuelve una fila de usuario</b>: {@code GET
 * /seguridad/grupos/&#123;id&#125;/permisos} lee las del grupo, y la escritura de la excepcion
 * ({@code AdministrarPermisos.fijarParaUsuario}) sigue sin endpoint —#572—. Esperar a que la haya
 * para comprobar esto seria dejar el defecto en pie hasta entonces; el mapeo es donde vive, y es
 * donde se mide.
 */
@DisplayName("El recurso del permiso dice de quien es (#543)")
class PermisoResourceTest {

    @Test
    @DisplayName("una fila de usuario no sale como si fuera del grupo 0")
    void laFilaDeUsuarioNoSaleComoDelGrupoCero() {
        PermisosController.PermisoResource deUsuario =
                PermisosController.PermisoResource.de(
                        new AdministrarPermisos.PermisoDeAcceso(
                                7L, "anulacion_recibo", null, 42L, Set.of(Privilegio.LECTURA)));

        assertThat(deUsuario.grupoId())
                .as("con el primitivo, esto valdria 0 y se leeria como «del grupo 0»")
                .isNull();
        assertThat(deUsuario.usuarioId())
                .as("y sin este campo no habria ni un dato con el que separarlas")
                .isEqualTo(42L);
    }

    @Test
    @DisplayName("y una de grupo sigue diciendo de que grupo, sin usuario")
    void laFilaDeGrupoDiceSuGrupo() {
        PermisosController.PermisoResource deGrupo =
                PermisosController.PermisoResource.de(
                        new AdministrarPermisos.PermisoDeAcceso(
                                8L, "calles", 3L, null, Set.of(Privilegio.LECTURA)));

        assertThat(deGrupo.grupoId()).isEqualTo(3L);
        assertThat(deGrupo.usuarioId())
                .as(
                        "nulo aqui significa «es del grupo», no «se desconoce»: lo garantiza"
                                + " permiso_sujeto_ck (V5)")
                .isNull();
    }
}
