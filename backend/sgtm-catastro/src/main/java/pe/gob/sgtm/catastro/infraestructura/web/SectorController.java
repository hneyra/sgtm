package pe.gob.sgtm.catastro.infraestructura.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Catalogo de sectores: {@code GET /api/v1/catastro/sectores}.
 *
 * <p>Es la operacion {@code sectores} del contrato —«Sectores, manzanas y lotes»—. Se publica el
 * listado de sectores; las manzanas cuelgan de cada uno y el contrato no declara ruta propia para
 * ellas, asi que se leen por el repositorio hasta que la pantalla las pida.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/sectores")
@RequiereAcceso(acceso = "sectores", privilegio = Privilegio.LECTURA)
public class SectorController {

    /** Por codigo: el codigo del sector es un tramo del codigo catastral, y se lee en ese orden. */
    private static final String ORDEN_POR_OMISION = "codigo";

    private final CatastroRepository repositorio;

    public SectorController(CatastroRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<SectorResource> listar(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                repositorio.sectores(paginacion.aPaginacion(ORDEN_POR_OMISION)),
                SectorResource::de);
    }
}
