package pe.gob.sgtm.sanciones.infraestructura.web;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Estado de cuenta de infracciones: {@code GET /api/v1/transito/estado-cuenta} (RF-062).
 *
 * <p>Papeletas pendientes de pago de un conductor o de un vehículo, con su importe y su beneficio
 * —los dos ya guardados en la propia papeleta (#46)—. La situación de coactiva que describe el
 * contrato no sale de aquí todavía: {@code coactiva} es un contexto acotado vacío; cuando publique
 * su API, este controlador la incorpora sin cambiar la ruta.
 */
@RestController
@RequestMapping(Api.RAIZ + "/transito/estado-cuenta")
@RequiereAcceso(acceso = "transito_estado_cuenta", privilegio = Privilegio.LECTURA)
public class EstadoDeCuentaTransitoController {

    private static final String ORDEN_POR_OMISION = "fechaInfraccion";

    private final PapeletaRepository repositorio;

    public EstadoDeCuentaTransitoController(PapeletaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<PapeletaResource> buscar(
            @RequestParam(required = false) @Nullable String conductor,
            @RequestParam(required = false) @Nullable String placa,
            ParametrosDePaginacion paginacion) {

        CriterioDePapeleta criterio =
                new CriterioDePapeleta(null, placa, conductor, null, null, null, null, true);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                PapeletaResource::de);
    }
}
