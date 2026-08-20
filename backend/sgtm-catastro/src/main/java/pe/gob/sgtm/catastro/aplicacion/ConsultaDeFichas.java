package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.dominio.FichaCatastralRepository;
import pe.gob.sgtm.catastro.dominio.FichaEncontrada;
import pe.gob.sgtm.catastro.dominio.FiltroDeFichas;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.catastro.dominio.VersionDeLaFicha;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;

/**
 * La consulta transversal de fichas y su historico (RF-006).
 *
 * <p>Es el unico sitio del contexto que le habla al padron, y lo hace por la API publica del
 * vecino. La division es deliberada: el repositorio consulta <b>solo tablas de catastro</b> y este
 * caso de uso pone los dos lados juntos. Con un {@code JOIN} a la tabla {@code contribuyente} desde
 * el SQL de catastro la consulta seria mas corta y el acoplamiento invisible para Spring Modulith,
 * que es la peor combinacion posible.
 *
 * <p><b>Toda consulta lleva fecha.</b> La grilla muestra la ficha y el titular vigentes a una
 * fecha, no «los ultimos»: si no, atender una reclamacion de 2027 en 2029 daria el titular de hoy,
 * y la notificacion se dirigiria a quien ya no era propietario (regla 9).
 */
@Service
public class ConsultaDeFichas {

    /**
     * Cuantos contribuyentes resuelve como mucho el filtro por nombre.
     *
     * <p>No es una cifra de negocio: es el tope de una lista {@code IN}. Un nombre muy comun —«Juan
     * Perez»— puede parecerse a cientos, y meterlos todos en la clausula convierte la consulta en
     * un recorrido. Doscientos cubren cualquier busqueda que una persona vaya a mirar.
     */
    private static final int TITULARES_MAXIMOS = 200;

    private final FichaCatastralRepository fichas;
    private final DirectorioDeContribuyentes padron;

    public ConsultaDeFichas(FichaCatastralRepository fichas, DirectorioDeContribuyentes padron) {
        this.fichas = fichas;
        this.padron = padron;
    }

    @Transactional(readOnly = true)
    public Pagina<FichaEncontrada> buscar(
            FiltroDeFichas filtro, LocalDate fecha, Paginacion paginacion) {

        List<Long> titulares =
                filtro.porContribuyente()
                        .map(texto -> padron.buscar(texto, TITULARES_MAXIMOS))
                        .map(hallados -> hallados.stream().map(ResumenDeContribuyente::id).toList())
                        .orElse(List.of());

        Pagina<FichaEncontrada> pagina = fichas.consultar(filtro, titulares, fecha, paginacion);
        return conNombresDeTitular(pagina);
    }

    /**
     * El historico de una ficha, de la version mas reciente a la mas antigua.
     *
     * <p>Cada fila trae su observacion, su autor y cuando se escribio. Es lo que hace util al
     * versionado: sin el motivo, el historico es una lista de areas distintas y nadie puede decir
     * si el cambio fue una fiscalizacion o un error de tecleo.
     */
    @Transactional(readOnly = true)
    public List<VersionDeLaFicha> historial(long predioId, TipoFicha tipo) {
        return fichas.versionesDe(predioId, tipo);
    }

    /**
     * Pone el nombre del titular en cada fila, con <b>una</b> consulta al padron para toda la
     * pagina.
     *
     * <p>Un predio sin titular vigente se queda sin nombre y sigue en la grilla: es justo el caso
     * que catastro tiene que revisar, y ocultarlo lo escondería.
     */
    private Pagina<FichaEncontrada> conNombresDeTitular(Pagina<FichaEncontrada> pagina) {
        Set<Long> ids = new LinkedHashSet<>();
        for (FichaEncontrada fila : pagina.contenido()) {
            if (fila.titularId() != null) {
                ids.add(fila.titularId());
            }
        }
        if (ids.isEmpty()) {
            return pagina;
        }

        Map<Long, ResumenDeContribuyente> resumenes = padron.porIds(ids);
        return pagina.mapear(
                fila -> {
                    ResumenDeContribuyente titular =
                            fila.titularId() == null ? null : resumenes.get(fila.titularId());
                    return fila.conTitular(titular == null ? null : titular.nombre());
                });
    }
}
