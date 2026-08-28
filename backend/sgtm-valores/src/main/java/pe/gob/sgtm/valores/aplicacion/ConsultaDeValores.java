package pe.gob.sgtm.valores.aplicacion;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.valores.dominio.CriterioDeConsultaDeValores;
import pe.gob.sgtm.valores.dominio.ValorEnConsulta;
import pe.gob.sgtm.valores.dominio.ValorRepository;

/**
 * La grilla de {@code consulta_valores}: los valores emitidos con su situacion real (RF-041, #25).
 *
 * <h2>Por que vive en {@code valores} y no en {@code cuentacorriente}</h2>
 *
 * <p>Porque es el contexto que mas datos aporta: la cabecera, el detalle congelado, la diligencia
 * que surtio efecto y el pase a coactiva son todos suyos. La consulta no le pide nada a {@code
 * cuentacorriente} —el importe que muestra <b>no</b> es la deuda de hoy sino el desglose congelado
 * al emitir— y solo cruza la frontera del modulo para una cosa: resolver el codigo del
 * contribuyente contra {@code DirectorioDeContribuyentes}, la API publica del padron.
 *
 * <h2>Por que es un caso de uso y no un passthrough del controlador</h2>
 *
 * <p>Por {@code @Transactional(readOnly = true)}: sin transaccion no hay {@code SET LOCAL}, y sin
 * el la politica RLS no puede evaluar {@code current_setting('app.municipalidad_id')} — la consulta
 * <b>falla</b>. Es el mismo defecto que {@code GET /catastro/vias} arrastro sin que nadie lo notara
 * hasta que alguien con permiso llego a el.
 *
 * <p>Y ademas las dos consultas tienen que ir juntas: la pagina de valores y los nombres de sus
 * contribuyentes se leen en la misma transaccion, o la grilla puede nombrar a alguien que se
 * renombro entre una lectura y la otra.
 */
@Service
public class ConsultaDeValores {

    private final ValorRepository repositorio;
    private final DirectorioDeContribuyentes padron;

    public ConsultaDeValores(ValorRepository repositorio, DirectorioDeContribuyentes padron) {
        this.repositorio = repositorio;
        this.padron = padron;
    }

    /**
     * Resuelve el codigo de contribuyente que escribio el usuario.
     *
     * <p>Vacio si el codigo no existe: un padron sin ese contribuyente no es una peticion mal
     * formada, es una busqueda sin resultados. Mismo criterio que {@code valores_busqueda} y que
     * {@code consulta_deuda}.
     */
    @Transactional(readOnly = true)
    public Optional<ResumenDeContribuyente> contribuyentePorCodigo(String codigo) {
        return padron.porCodigo(codigo.strip());
    }

    /** La pagina de valores que pide el criterio, con el nombre de cada contribuyente resuelto. */
    @Transactional(readOnly = true)
    public Pagina<FilaDeValor> buscar(CriterioDeConsultaDeValores criterio, Paginacion paginacion) {
        Pagina<ValorEnConsulta> pagina = repositorio.consultar(criterio, paginacion);
        if (pagina.estaVacia()) {
            return pagina.mapear(fila -> new FilaDeValor(fila, null));
        }

        Set<Long> ids = new LinkedHashSet<>();
        for (ValorEnConsulta fila : pagina.contenido()) {
            ids.add(fila.valor().contribuyenteId());
        }
        Map<Long, ResumenDeContribuyente> resumenes = padron.porIds(ids);

        return pagina.mapear(
                fila -> new FilaDeValor(fila, resumenes.get(fila.valor().contribuyenteId())));
    }

    /**
     * Una fila de la grilla: el valor con su situacion, y a quien se le emitio.
     *
     * <p>{@code contribuyente} nulo significa que el padron no devolvio ese identificador. El valor
     * sale igual en la grilla: es justo la fila que hay que revisar, y esconderla no la arregla.
     */
    public record FilaDeValor(
            ValorEnConsulta valor, @Nullable ResumenDeContribuyente contribuyente) {}
}
