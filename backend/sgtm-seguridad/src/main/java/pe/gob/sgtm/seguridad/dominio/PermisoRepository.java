package pe.gob.sgtm.seguridad.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia de los permisos (RF-121).
 *
 * <p>Un permiso es de un grupo <b>o</b> de un usuario, nunca de los dos, asi que las consultas van
 * separadas: mezclarlas en un {@code findBySujeto(Object)} obligaria a preguntar el tipo en cada
 * llamada, que es la forma de que un dia se pregunte mal.
 */
public interface PermisoRepository {

    Permiso save(Permiso permiso);

    Optional<Permiso> deGrupo(long accesoId, long grupoId);

    Optional<Permiso> deUsuario(long accesoId, long usuarioId);

    /** Todos los permisos de un grupo, para la pantalla de niveles de accesibilidad. */
    List<Permiso> todosLosDeGrupo(long grupoId);

    /**
     * Cuantos usuarios habilitados y vigentes pueden hoy administrar permisos.
     *
     * <p>Existe para una sola cosa: impedir que el ultimo se quede sin el privilegio. Un sistema
     * sin nadie que pueda otorgar permisos no se arregla desde el sistema —hace falta entrar por la
     * base de datos—, asi que el error mas caro de esta pantalla es tambien el mas facil de
     * cometer: quitarse a uno mismo el permiso que hacia falta para devolverselo.
     */
    long usuariosQuePuedenAdministrarPermisos(LocalDate fecha);
}
