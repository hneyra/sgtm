package pe.gob.sgtm.seguridad.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import pe.gob.sgtm.autorizacion.Privilegio;

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
     * La matriz de permisos <b>efectivos</b> de un usuario: por cada opcion del catalogo sobre la
     * que tiene algun privilegio, el conjunto de privilegios. Las opciones sin ninguno no aparecen.
     *
     * <p>Misma precedencia que el guardia ({@code ComprobadorDeAcceso}): la excepcion del usuario
     * decide —otorgue o niegue—, y si no la hay manda la union de sus grupos vigentes. Vigencia y
     * habilitacion se comprueban en el usuario, en el grupo y en la pertenencia (RF-123); un
     * usuario deshabilitado o fuera de vigencia recibe la matriz vacia.
     *
     * <p>Es la fuente del menu de la interfaz (ADR-0013): resolverlo con otra regla que la del
     * guardia mostraria opciones que despues responden 403, o esconderia opciones que si funcionan.
     */
    Map<String, Set<Privilegio>> efectivosDe(String cuenta, LocalDate fecha);

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
