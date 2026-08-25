package pe.gob.sgtm.sanciones.infraestructura.web;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Estado de cuenta de papeleta administrativa: {@code GET
 * /api/v1/infracciones/administrativas/estado-cuenta} (RF-074, #47).
 *
 * <p>Mismo patrón que {@code EstadoDeCuentaTransitoController} (#46): papeletas pendientes de pago,
 * con su importe y su beneficio ya guardados en la propia fila. El reajuste, el interés y los
 * gastos que describe el contrato no salen de aquí: dependen de {@code tesoreria}, que todavía no
 * publica su cálculo de deuda actualizada.
 */
@RestController
@RequestMapping(Api.RAIZ + "/infracciones/administrativas/estado-cuenta")
@RequiereAcceso(acceso = "adm_estado_cuenta", privilegio = Privilegio.LECTURA)
public class EstadoDeCuentaAdministrativoController {

    private static final String ORDEN_POR_OMISION = "fechaInfraccion";

    private final PapeletaRepository repositorio;

    public EstadoDeCuentaAdministrativoController(PapeletaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<PapeletaResource> buscar(
            @RequestParam(required = false) @Nullable String papeleta,
            @RequestParam(required = false) @Nullable String codContribuyente,
            ParametrosDePaginacion paginacion) {

        CriterioDePapeleta criterio =
                new CriterioDePapeleta(
                        Familia.ADMINISTRATIVA,
                        papeleta,
                        null,
                        null,
                        codContribuyente,
                        null,
                        null,
                        null,
                        null,
                        null,
                        true);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                PapeletaResource::de);
    }
}
