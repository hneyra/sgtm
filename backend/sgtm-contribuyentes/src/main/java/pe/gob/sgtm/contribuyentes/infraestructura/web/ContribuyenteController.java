package pe.gob.sgtm.contribuyentes.infraestructura.web;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.contribuyentes.dominio.ContribuyenteRepository;
import pe.gob.sgtm.contribuyentes.dominio.CriterioDeBusqueda;
import pe.gob.sgtm.dominio.TipoDocumento;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Padron de contribuyentes: {@code GET /api/v1/rentas/contribuyentes}.
 *
 * <p>Los cuatro filtros son los que declara el contrato, con los nombres que trae de la pantalla
 * del manual: {@code codigo}, {@code nombreRazonSocial}, {@code dNI} y {@code rUC}. Que los dos
 * ultimos vengan asi —con la mayuscula corrida— no es un descuido: el contrato se derivo del
 * prototipo, y cambiarlo aqui rompe la pantalla. Se corrige en el contrato o no se corrige.
 *
 * <p><b>Solo lectura.</b> El alta vive en {@code RegistrarContribuyente} y no se publica todavia
 * porque el contrato no declara ningun {@code POST} en esta ruta. Publicar un endpoint que el
 * contrato no tiene rompe la prueba de contrato, y con razon: la pantalla no sabria llamarlo.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/contribuyentes")
@RequiereAcceso(acceso = "contribuyentes", privilegio = Privilegio.LECTURA)
public class ContribuyenteController {

    /** Por codigo: es como se lee un padron cuando no se busca nada en concreto. */
    private static final String ORDEN_POR_OMISION = "codigo_contribuyente";

    private final ContribuyenteRepository repositorio;

    public ContribuyenteController(ContribuyenteRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<ContribuyenteResource> buscar(
            @RequestParam(required = false) @Nullable String codigo,
            @RequestParam(required = false) @Nullable String nombreRazonSocial,
            @RequestParam(name = "dNI", required = false) @Nullable String dni,
            @RequestParam(name = "rUC", required = false) @Nullable String ruc,
            ParametrosDePaginacion paginacion) {

        CriterioDeBusqueda criterio =
                new CriterioDeBusqueda(
                        codigo,
                        nombreRazonSocial,
                        tipoDe(dni, ruc),
                        dni != null && !dni.isBlank() ? dni : ruc,
                        false);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                ContribuyenteResource::de);
    }

    /**
     * El contrato trae el DNI y el RUC como dos filtros distintos, no como un tipo y un numero. Si
     * llegan los dos, gana el DNI: son criterios excluyentes —nadie tiene los dos en la misma fila—
     * y combinarlos con Y devolveria siempre vacio, que es la respuesta mas confusa posible.
     */
    private static @Nullable TipoDocumento tipoDe(@Nullable String dni, @Nullable String ruc) {
        if (dni != null && !dni.isBlank()) {
            return TipoDocumento.DNI;
        }
        if (ruc != null && !ruc.isBlank()) {
            return TipoDocumento.RUC;
        }
        return null;
    }
}
