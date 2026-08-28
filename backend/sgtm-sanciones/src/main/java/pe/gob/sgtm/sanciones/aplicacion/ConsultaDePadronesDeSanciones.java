package pe.gob.sgtm.sanciones.aplicacion;

import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.sanciones.dominio.ConstanciaLibre;
import pe.gob.sgtm.sanciones.dominio.ConstanciaLibreRepository;
import pe.gob.sgtm.sanciones.dominio.CriterioDeConstancias;
import pe.gob.sgtm.sanciones.dominio.CriterioDePadron;
import pe.gob.sgtm.sanciones.dominio.CriterioDelPadronDeNotificaciones;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativaRepository;
import pe.gob.sgtm.sanciones.dominio.NotificacionDelPadron;
import pe.gob.sgtm.sanciones.dominio.PadronDePapeletasRepository;
import pe.gob.sgtm.sanciones.dominio.PapeletaDelPadron;

/**
 * Los seis listados de lectura de #53: el padrón de papeletas, el de las que pasaron a coactiva, el
 * de constancias, el de notificaciones administrativas y los dos records —de conductor y vehicular—
 * (RF-068, RF-073, RF-074).
 *
 * <h2>Existe por el {@code @Transactional}, no por el reparto</h2>
 *
 * <p>Una consulta sin transacción no lleva {@code SET LOCAL}, y sin él la política RLS no puede
 * evaluar {@code current_setting('app.municipalidad_id')}: la consulta <b>falla</b>. Es el defecto
 * que la marcha blanca de seguridad destapó en {@code GET /catastro/vias} —corría sin transacción
 * porque nadie con permiso había llegado nunca a él— y que se arregló con {@code ConsultaDeVias}.
 * Este servicio es lo mismo para los seis listados de sanciones.
 *
 * <p>{@code readOnly = true} y ni un bloqueo: un padrón se mira mientras la ventanilla sigue
 * cobrando.
 *
 * <h2>Los dos records son el mismo padrón con otro filtro</h2>
 *
 * <p>«Historial de infracciones de un conductor» y «historial de papeletas de un vehículo» son la
 * misma consulta con {@code licenciaConducir}/{@code documentoInfractor} o con {@code placa}. Dos
 * consultas separadas para la misma cuenta serían dos oportunidades de divergir, y la que se mira
 * menos es la que se queda mal.
 */
@Service
public class ConsultaDePadronesDeSanciones {

    private final PadronDePapeletasRepository papeletas;
    private final ConstanciaLibreRepository constancias;
    private final NotificacionAdministrativaRepository notificaciones;

    public ConsultaDePadronesDeSanciones(
            PadronDePapeletasRepository papeletas,
            ConstanciaLibreRepository constancias,
            NotificacionAdministrativaRepository notificaciones) {
        this.papeletas = papeletas;
        this.constancias = constancias;
        this.notificaciones = notificaciones;
    }

    /**
     * Una página del padrón de papeletas.
     *
     * <p>Sirve al padrón corriente, al de coactiva y a los dos records: lo que los distingue es el
     * criterio que arma cada controlador, no la consulta.
     */
    @Transactional(readOnly = true)
    public Pagina<PapeletaDelPadron> papeletas(CriterioDePadron criterio, Paginacion paginacion) {
        Objects.requireNonNull(criterio, "El padron necesita su criterio");
        return papeletas.buscar(criterio, paginacion);
    }

    /** Una página del padrón de constancias libres de infracciones. */
    @Transactional(readOnly = true)
    public Pagina<ConstanciaLibre> constancias(
            CriterioDeConstancias criterio, Paginacion paginacion) {
        Objects.requireNonNull(criterio, "El padron necesita su criterio");
        return constancias.buscar(criterio, paginacion);
    }

    /** Una página del padrón de notificaciones administrativas, con su papeleta cuando la hay. */
    @Transactional(readOnly = true)
    public Pagina<NotificacionDelPadron> notificaciones(
            CriterioDelPadronDeNotificaciones criterio, Paginacion paginacion) {
        Objects.requireNonNull(criterio, "El padron necesita su criterio");
        return notificaciones.buscarPadron(criterio, paginacion);
    }
}
