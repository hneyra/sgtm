package pe.gob.sgtm.catastro.infraestructura.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.catastro.dominio.ViaRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Catalogo vial: {@code GET /api/v1/catastro/vias}.
 *
 * <p>Es la operacion {@code calles} del contrato —«Mantenimiento de vias y calles»—, y el primer
 * endpoint del sistema. Existe sobre todo para que la prueba del contrato tenga algo que comparar:
 * una prueba que verifica que las rutas publicadas coinciden con {@code
 * docs/50-api/openapi/sgtm-v1.yaml} no vale nada mientras no haya ninguna publicada.
 *
 * <p><b>Ningun metodo recibe la municipalidad</b>, ni como parametro de consulta ni como
 * encabezado, y no es cuestion de disciplina: sale del token (ADR-0005, regla 2) y hay una regla de
 * ArchUnit que rechaza el build si alguien la anade «por comodidad».
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/vias")
public class ViaController {

    /** Por codigo: es el orden con el que se lee un catalogo vial en pantalla. */
    private static final String ORDEN_POR_OMISION = "codigo";

    private final ViaRepository repositorio;

    public ViaController(ViaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<ViaResource> listar(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                repositorio.findAll(paginacion.aPaginacion(ORDEN_POR_OMISION)), ViaResource::de);
    }
}
