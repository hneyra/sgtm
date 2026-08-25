package pe.gob.sgtm.rentas.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.rentas.dominio.arbitrios.CriterioDeArbitrio;
import pe.gob.sgtm.rentas.dominio.arbitrios.CuotaDeArbitrioRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Arbitrios municipales: {@code GET /api/v1/rentas/arbitrios?anio=2026} (#31, RF-022).
 *
 * <p>Solo lectura: la determinación vive en {@code DeterminarArbitrios} y no se publica todavía
 * —igual que {@code beneficios} en este mismo módulo—; el contrato no declara ningún {@code POST}
 * en esta ruta.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/arbitrios")
@RequiereAcceso(acceso = "arbitrios", privilegio = Privilegio.LECTURA)
public class ArbitriosController {

    private static final String ORDEN_POR_OMISION = "fechaCalculo";

    private final CuotaDeArbitrioRepository repositorio;
    private final Clock reloj;

    public ArbitriosController(CuotaDeArbitrioRepository repositorio, Clock reloj) {
        this.repositorio = repositorio;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<ArbitrioResource> buscar(
            @RequestParam(required = false) @Nullable String anio,
            @RequestParam(required = false) @Nullable String codigoPredial,
            ParametrosDePaginacion paginacion) {

        CriterioDeArbitrio criterio = new CriterioDeArbitrio(ejercicioDe(anio), codigoPredial);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                ArbitrioResource::de);
    }

    private Ejercicio ejercicioDe(@Nullable String anio) {
        return anio == null || anio.isBlank()
                ? Ejercicio.de(LocalDate.now(reloj))
                : new Ejercicio(Integer.parseInt(anio));
    }
}
