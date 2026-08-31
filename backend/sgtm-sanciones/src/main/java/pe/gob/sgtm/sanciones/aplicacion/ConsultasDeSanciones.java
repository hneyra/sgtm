package pe.gob.sgtm.sanciones.aplicacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccion;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccionRepository;
import pe.gob.sgtm.sanciones.dominio.CriterioDeCodigoInfraccion;
import pe.gob.sgtm.sanciones.dominio.CriterioDeNotificacion;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.CriterioDelProcedimiento;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativa;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativaRepository;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.sanciones.dominio.ProcedimientoSancionador;
import pe.gob.sgtm.sanciones.dominio.ProcedimientoSancionadorRepository;

/**
 * Las grillas del modulo, cada una <b>dentro de su transaccion</b> (#486).
 *
 * <p>Existe por el mismo 500 que {@code ConsultaDeVias} cerro en #16 y {@code ConsultaDelPadron} en
 * #486: nueve controladores de este modulo llamaban al repositorio <b>directamente</b>, y ningun
 * {@code RepositoryJdbc} del sistema anota {@code @Transactional} —ni tiene por que: la transaccion
 * es del caso de uso—. Sin ella no se emite el {@code SET LOCAL app.municipalidad_id}, y la
 * politica RLS de estas tablas consulta ese parametro: la consulta no devuelve vacio,
 * <b>revienta</b> con «invalid input syntax for type bigint: ""», porque el {@code ::bigint} de la
 * cadena vacia no se puede evaluar.
 *
 * <p>Ninguna prueba lo veia: las de repositorio hablan con PostgreSQL desde <b>dentro</b> de una
 * transaccion que abre la propia prueba, y las de capa web llegan por HTTP contra un <b>doble</b>.
 * Entre las dos queda justo el trozo que falla.
 *
 * <p>Van las cuatro juntas y no en cuatro clases porque son la misma cosa —la lectura paginada de
 * una grilla, sin nada que componer— y separarlas daria cuatro ficheros con un metodo cada uno.
 * Cuando una de ellas tenga que componer algo, se muda a su propia clase, como {@code
 * ConsultaDeLaHojaDePapeleta}.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2): sale del token.
 */
@Service
public class ConsultasDeSanciones {

    private final PapeletaRepository papeletas;
    private final CodigoInfraccionRepository codigos;
    private final ProcedimientoSancionadorRepository procedimientos;
    private final NotificacionAdministrativaRepository notificaciones;

    public ConsultasDeSanciones(
            PapeletaRepository papeletas,
            CodigoInfraccionRepository codigos,
            ProcedimientoSancionadorRepository procedimientos,
            NotificacionAdministrativaRepository notificaciones) {
        this.papeletas = papeletas;
        this.codigos = codigos;
        this.procedimientos = procedimientos;
        this.notificaciones = notificaciones;
    }

    /** Las papeletas que pide el criterio. La usan las cinco grillas que las listan. */
    @Transactional(readOnly = true)
    public Pagina<Papeleta> papeletas(CriterioDePapeleta criterio, Paginacion paginacion) {
        return papeletas.buscar(criterio, paginacion);
    }

    /** El catalogo de infracciones, de transito o administrativas. */
    @Transactional(readOnly = true)
    public Pagina<CodigoInfraccion> codigos(
            CriterioDeCodigoInfraccion criterio, Paginacion paginacion) {
        return codigos.buscar(criterio, paginacion);
    }

    /** Los procedimientos sancionadores, con su fase ya resuelta a la fecha del criterio. */
    @Transactional(readOnly = true)
    public Pagina<ProcedimientoSancionador> procedimientos(
            CriterioDelProcedimiento criterio, Paginacion paginacion) {
        return procedimientos.buscar(criterio, paginacion);
    }

    /** Las notificaciones preventivas cuyo plazo ya vencio. */
    @Transactional(readOnly = true)
    public Pagina<NotificacionAdministrativa> notificacionesVencidas(
            CriterioDeNotificacion criterio, Paginacion paginacion) {
        return notificaciones.buscarVencidas(criterio, paginacion);
    }
}
