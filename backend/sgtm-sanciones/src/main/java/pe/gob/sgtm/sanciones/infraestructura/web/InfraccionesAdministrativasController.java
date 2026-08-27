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
 * Papeletas administrativas: {@code GET /api/v1/infracciones/actas} (RF-071, #47).
 *
 * <p>Solo lectura: el registro ({@code RegistrarPapeleta.registrarAdministrativa}) no se publica
 * todavía —igual que {@code papeletas} de tránsito (#46)—; el contrato no declara ningún {@code
 * POST} en esta ruta.
 */
@RestController
@RequestMapping(Api.RAIZ + "/infracciones/actas")
@RequiereAcceso(acceso = "infracciones_adm", privilegio = Privilegio.LECTURA)
public class InfraccionesAdministrativasController {

    private static final String ORDEN_POR_OMISION = "fechaInfraccion";

    private final PapeletaRepository repositorio;

    public InfraccionesAdministrativasController(PapeletaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public RespuestaPaginada<PapeletaResource> buscar(
            @RequestParam(required = false) @Nullable String nroDeActa,
            @RequestParam(required = false) @Nullable String administrado,
            @RequestParam(required = false) @Nullable String codigoCuis,
            ParametrosDePaginacion paginacion) {

        CriterioDePapeleta criterio =
                new CriterioDePapeleta(
                        Familia.ADMINISTRATIVA,
                        nroDeActa,
                        null,
                        null,
                        administrado,
                        codigoCuis,
                        null,
                        null,
                        null,
                        null,
                        false);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                PapeletaResource::de);
    }
}
