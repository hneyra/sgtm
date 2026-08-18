package pe.gob.sgtm.seguridad.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Puerto de persistencia del modelo de administracion del manual (cap. 4).
 *
 * <p>Los cinco conceptos van en un solo puerto y no en cinco porque se administran juntos: no hay
 * ningun caso de uso que toque grupos sin mirar usuarios, ni miembros sin mirar grupos. Cinco
 * interfaces de dos metodos serian cinco archivos que siempre se implementan a la vez y siempre se
 * inyectan a la vez.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2): la aplica la politica RLS.
 */
public interface AdministracionRepository {

    // ---- Modulos y accesos: se siembran del catalogo, aqui solo se leen ----

    Pagina<Modulo> modulos(Paginacion paginacion);

    Pagina<Acceso> accesos(Paginacion paginacion);

    Optional<Acceso> accesoPorCodigo(String codigo);

    // ---- Grupos ----

    Pagina<Grupo> grupos(Paginacion paginacion);

    Optional<Grupo> grupo(long id);

    Grupo guardar(Grupo grupo);

    // ---- Usuarios ----

    Pagina<Usuario> usuarios(Paginacion paginacion);

    Optional<Usuario> usuario(long id);

    Optional<Usuario> usuarioPorCuenta(String cuenta);

    Usuario guardar(Usuario usuario);

    // ---- Miembros ----

    Optional<Miembro> miembro(long grupoId, long usuarioId);

    /** Alta o baja de la pertenencia. Nunca borra: la fila queda con {@code activo} en falso. */
    Miembro guardar(Miembro miembro);
}
