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
 * Relación impresa del CUIS vigente: {@code GET
 * /api/v1/infracciones/administrativas/codigos/reporte} (#43, RF-072).
 *
 * <p>Mismo catálogo que {@link CodigosCuisController}, con privilegio de {@link
 * Privilegio#IMPRESION}: emitir esta relación es un acto administrativo, no una simple lectura
 * (javadoc de {@link Privilegio}).
 */
@RestController
@RequestMapping(Api.RAIZ + "/infracciones/administrativas/codigos/reporte")
@RequiereAcceso(acceso = "adm_codigos_reporte", privilegio = Privilegio.IMPRESION)
public class ReporteCodigosAdministrativosController {

    private static final String ORDEN_POR_OMISION = "codigo";

    private final CodigoInfraccionRepository repositorio;
    private final Clock reloj;

    public ReporteCodigosAdministrativosController(
            CodigoInfraccionRepository repositorio, Clock reloj) {
        this.repositorio = repositorio;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<CodigoInfraccionResource> reporte(
            @RequestParam(required = false) @Nullable String codigo,
            @RequestParam(required = false) @Nullable String descripcionContiene,
            @RequestParam(required = false) @Nullable String fecha,
            ParametrosDePaginacion paginacion) {

        CriterioDeCodigoInfraccion criterio =
                new CriterioDeCodigoInfraccion(
                        Familia.ADMINISTRATIVA, codigo, descripcionContiene, fechaDe(fecha));

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                CodigoInfraccionResource::de);
    }

    /**
     * {@code fecha} es la forma explícita de pedir el catálogo tal como regía en el pasado. Sin
     * ella, el reporte es el vigente hoy: es lo que se imprime.
     */
    private LocalDate fechaDe(@Nullable String fecha) {
        return fecha == null || fecha.isBlank() ? LocalDate.now(reloj) : LocalDate.parse(fecha);
    }
}
