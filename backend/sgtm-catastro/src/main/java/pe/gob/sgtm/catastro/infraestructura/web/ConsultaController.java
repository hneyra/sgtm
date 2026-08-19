package pe.gob.sgtm.catastro.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ConsultaDeFichas;
import pe.gob.sgtm.catastro.dominio.FiltroDeFichas;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Consulta transversal de fichas: {@code GET /api/v1/catastro/fichas} (RF-006).
 *
 * <p>Los filtros son los que declara el contrato, que salio de la pantalla del prototipo. Uno de
 * ellos, {@code conciliadaConRentas}, no se acepta todavia: comparar el catastro con la declaracion
 * jurada exige el contexto {@code rentas}, que aun no existe. Se rechaza con 422 y con el motivo,
 * en vez de aceptarlo y devolver el listado sin filtrar: eso ultimo daria un resultado plausible y
 * equivocado, y nadie lo notaria.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/fichas")
@RequiereAcceso(acceso = "consulta_fichas", privilegio = Privilegio.LECTURA)
public class ConsultaController {

    /** Por codigo de referencia catastral, que es como se recorre un sector. */
    private static final String ORDEN_POR_OMISION = "codRefCatastral";

    private final ConsultaDeFichas consulta;
    private final Clock reloj;

    public ConsultaController(ConsultaDeFichas consulta, Clock reloj) {
        this.consulta = consulta;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<FichaEncontradaResource> consultar(
            @RequestParam(required = false) @Nullable String codRefCatastral,
            @RequestParam(required = false) @Nullable String contribuyente,
            @RequestParam(required = false) @Nullable String manzana,
            @RequestParam(required = false) @Nullable String lote,
            @RequestParam(required = false) @Nullable String tipo,
            @RequestParam(required = false) @Nullable String conciliadaConRentas,
            @RequestParam(required = false) @Nullable String fecha,
            ParametrosDePaginacion paginacion) {

        if (conciliadaConRentas != null && !conciliadaConRentas.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "La conciliacion con el padron de rentas todavia no se puede consultar:"
                            + " compara el catastro con la declaracion jurada, y ese contexto aun"
                            + " no publica su lado");
        }

        FiltroDeFichas filtro =
                new FiltroDeFichas(codRefCatastral, contribuyente, manzana, lote, tipoDe(tipo));
        LocalDate cuando = fecha == null || fecha.isBlank() ? LocalDate.now(reloj) : parsear(fecha);

        return RespuestaPaginada.de(
                consulta.buscar(filtro, cuando, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                FichaEncontradaResource::de);
    }

    private static @Nullable TipoFicha tipoDe(@Nullable String tipo) {
        if (tipo == null || tipo.isBlank()) {
            return null;
        }
        try {
            return TipoFicha.valueOf(tipo.strip().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException noExiste) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El tipo de ficha va entre UNICA, ECONOMICA, BIENES_COMUNES y RURAL: '"
                            + tipo
                            + "'");
        }
    }

    private static LocalDate parsear(String fecha) {
        try {
            return LocalDate.parse(fecha);
        } catch (java.time.format.DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + fecha + "'");
        }
    }
}
