package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeAltasBajas;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeConsulta;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDePagos;

/**
 * Las cuatro lecturas del libro que las pantallas de Consultas dibujan, cada una <b>dentro de su
 * transaccion</b> (#486).
 *
 * <p>Existe por el mismo 500 que {@code ConsultaDeVias} cerro en #16: cuatro controladores de este
 * modulo llamaban al repositorio <b>directamente</b>, y ningun {@code RepositoryJdbc} anota
 * {@code @Transactional} —ni tiene por que: la transaccion es del caso de uso—. Sin ella no se
 * emite el {@code SET LOCAL app.municipalidad_id}, y la politica RLS de {@code
 * cuenta_corriente_asiento} lo consulta: la peticion no devuelve vacio, <b>revienta</b> con
 * «invalid input syntax for type bigint: ""».
 *
 * <p>{@link #contribuyentePorCodigo} tambien la lleva, y es la que mas engana: es una consulta
 * pequena, de una sola fila, que el controlador hacia «de paso» antes de componer el criterio. Una
 * consulta pequena fuera de transaccion falla igual que una grande.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2).
 */
@Service
public class ConsultasDelLibro {

    private final AsientoRepository libro;

    public ConsultasDelLibro(AsientoRepository libro) {
        this.libro = libro;
    }

    /** La cuenta corriente del contribuyente: los asientos que pide el criterio. */
    @Transactional(readOnly = true)
    public Pagina<Asiento> asientos(CriterioDeConsulta criterio, Paginacion paginacion) {
        return libro.buscar(criterio, paginacion);
    }

    /** Las altas y bajas de deuda del intervalo. */
    @Transactional(readOnly = true)
    public Pagina<Asiento> altasYBajas(CriterioDeAltasBajas criterio, Paginacion paginacion) {
        return libro.altasYBajas(criterio, paginacion);
    }

    /** Los pagos registrados que pide el criterio. */
    @Transactional(readOnly = true)
    public Pagina<Asiento> pagos(CriterioDePagos criterio, Paginacion paginacion) {
        return libro.pagos(criterio, paginacion);
    }

    /**
     * El identificador del contribuyente por su codigo.
     *
     * <p>Vacio no es una peticion mal formada: es un padron sin ese contribuyente, y quien llama
     * responde con una grilla vacia.
     */
    @Transactional(readOnly = true)
    public Optional<Long> contribuyentePorCodigo(String codigo) {
        return libro.contribuyentePorCodigo(codigo);
    }
}
