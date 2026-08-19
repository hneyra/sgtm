package pe.gob.sgtm.catastro.infraestructura.web;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ReporteDeFichaDelContribuyente;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Ficha del contribuyente: {@code GET /api/v1/catastro/contribuyentes/{codigo}/ficha.pdf} (RF-010).
 *
 * <p><b>La ruta acaba en {@code .pdf} y devuelve JSON, y esta bien.</b> Es lo que el contrato
 * declara —{@code application/json}—, porque la ruta salio del nombre que le da la pantalla del
 * prototipo al boton. Lo que hay aqui es el <i>contenido</i> del documento; convertirlo en PDF,
 * hoja de calculo o texto enriquecido es la capa de generacion de documentos (#55, RNF-132), y
 * cuando exista consumira esto mismo.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/contribuyentes")
@RequiereAcceso(acceso = "ficha_contribuyente_reporte", privilegio = Privilegio.LECTURA)
public class ReporteController {

    private final ReporteDeFichaDelContribuyente reporte;

    public ReporteController(ReporteDeFichaDelContribuyente reporte) {
        this.reporte = reporte;
    }

    @GetMapping("/{codigo}/ficha.pdf")
    public ReporteResource ficha(
            @PathVariable String codigo, @RequestParam(required = false) @Nullable String fecha) {

        LocalDate cuando = fecha == null || fecha.isBlank() ? null : parsear(fecha);

        return reporte.de(codigo, cuando)
                .map(ReporteResource::de)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun contribuyente con ese codigo"));
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
