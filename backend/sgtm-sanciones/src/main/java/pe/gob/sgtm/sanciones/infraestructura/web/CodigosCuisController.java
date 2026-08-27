package pe.gob.sgtm.sanciones.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.sanciones.dominio.CodigoInfraccionRepository;
import pe.gob.sgtm.sanciones.dominio.CriterioDeCodigoInfraccion;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Cuadro único de infracciones y sanciones administrativas (CUIS): {@code GET
 * /api/v1/infracciones/cuis} (#43, RF-072, NEG-03).
 *
 * <p>Mismo modelo que {@link CodigosTransitoController}; lo único que cambia es la familia que
 * filtra ({@link Familia#ADMINISTRATIVA}) y el privilegio de la opción.
 */
@RestController
@RequestMapping(Api.RAIZ + "/infracciones/cuis")
@RequiereAcceso(acceso = "codigos_cuis", privilegio = Privilegio.LECTURA)
public class CodigosCuisController {

    private static final String ORDEN_POR_OMISION = "codigo";

    private final CodigoInfraccionRepository repositorio;
    private final Clock reloj;

    public CodigosCuisController(CodigoInfraccionRepository repositorio, Clock reloj) {
        this.repositorio = repositorio;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<CodigoInfraccionResource> buscar(
            @RequestParam(required = false) @Nullable String codigo,
            @RequestParam(required = false) @Nullable String materia,
            @RequestParam(required = false) @Nullable String fecha,
            ParametrosDePaginacion paginacion) {

        CriterioDeCodigoInfraccion criterio =
                new CriterioDeCodigoInfraccion(
                        Familia.ADMINISTRATIVA, codigo, materia, fechaDe(fecha));

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                CodigoInfraccionResource::de);
    }

    private LocalDate fechaDe(@Nullable String fecha) {
        return fecha == null || fecha.isBlank() ? LocalDate.now(reloj) : LocalDate.parse(fecha);
    }
}
