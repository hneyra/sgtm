package pe.gob.sgtm.seguridad.dominio;

import java.util.Optional;

/**
 * Puerto de persistencia de los permisos.
 *
 * <p>Solo lo que #7 necesita: otorgar y consultar. El mantenimiento completo —revocar, listar por
 * grupo, niveles de accesibilidad— es del issue #12, y el guardia que los comprueba, del #8.
 */
public interface PermisoRepository {

    Permiso save(Permiso permiso);

    Optional<Permiso> findByAccesoYGrupo(long accesoId, long grupoId);
}
