package pe.gob.sgtm.sanciones.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

public interface PapeletaRepository {

    Papeleta insertar(Papeleta papeleta);

    Optional<Papeleta> porNumero(String numero);

    Pagina<Papeleta> buscar(CriterioDePapeleta criterio, Paginacion paginacion);

    /**
     * Cambia el número dejando traza en {@code papeleta_cambio_numero} (RF-067): un {@code UPDATE}
     * de la columna {@code numero}, nunca un alta ni una baja —la papeleta sigue siendo la misma
     * fila, con el mismo {@code id}, así que cualquier enlace que ya la referencie por {@code id}
     * sigue intacto. El usuario que hace el cambio no es un parámetro: lo resuelve la
     * implementación desde {@link pe.gob.sgtm.auditoria.OrigenContext}, igual que {@code
     * usuario_registro} en {@link #insertar}.
     */
    Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo);
}
