package pe.gob.sgtm.compartido;

import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * De donde vino una peticion, para la auditoria (ADR-0008).
 *
 * <p>Es el equivalente de hoy al «Nombre de la Maquina (PC) y el IP de la PC» que el manual del
 * sistema original registraba en cada modificacion. Un servidor HTTP no conoce el nombre de maquina
 * del cliente salvo que este se lo diga, asi que {@code equipo} es lo mas cercano que hay: ver
 * {@code pe.gob.sgtm.plataforma.tenant.OrigenContextFilter} para como se obtiene.
 *
 * @param usuarioId identificador del usuario autenticado, o {@code "desconocido"} si no lo hay
 *     (proceso batch legitimo sin peticion HTTP)
 * @param equipo el equivalente moderno del nombre de maquina del manual
 * @param ip la IP de origen, o {@code null} si no se pudo determinar
 */
public record OrigenPeticion(String usuarioId, String equipo, @Nullable String ip) {

    public OrigenPeticion {
        Objects.requireNonNull(usuarioId, "El origen de la peticion exige un usuario");
        Objects.requireNonNull(equipo, "El origen de la peticion exige un equipo");
    }
}
