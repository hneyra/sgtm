package pe.gob.sgtm.catastro.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ActualizarFichaCatastral;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Ficha catastral urbana: {@code GET /api/v1/catastro/fichas/urbana/{codRefCatastral}}.
 *
 * <p>Se entra por el <b>codigo de referencia catastral</b>, no por el identificador interno del
 * predio: es lo que el tecnico tiene delante y lo que el contrato declara en la ruta.
 *
 * <p><b>Acepta una fecha.</b> Sin ella devuelve la ficha que rige hoy; con ella, la que regia
 * entonces. Es lo que permite responder «como estaba este predio cuando se emitio el valor de
 * 2027», que es exactamente la pregunta de una reclamacion. La respuesta lleva siempre la version y
 * su vigencia, para que ninguna cifra salga sin decir de cuando es (regla 9).
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/fichas")
@RequiereAcceso(acceso = "ficha_urbana", privilegio = Privilegio.LECTURA)
public class FichaController {

    private final ActualizarFichaCatastral fichas;
    private final CatastroRepository catastro;
    private final Clock reloj;

    public FichaController(
            ActualizarFichaCatastral fichas, CatastroRepository catastro, Clock reloj) {
        this.fichas = fichas;
        this.catastro = catastro;
        this.reloj = reloj;
    }

    @GetMapping("/urbana/{codRefCatastral}")
    public FichaResource urbana(
            @PathVariable String codRefCatastral,
            @RequestParam(required = false) @Nullable String fecha) {

        Predio predio = predioDe(codRefCatastral);
        LocalDate cuando = fecha == null || fecha.isBlank() ? LocalDate.now(reloj) : parsear(fecha);

        long predioId = java.util.Objects.requireNonNull(predio.id(), "El predio leido tiene id");
        Optional<FichaCatastral> ficha = fichas.vigenteA(predioId, TipoFicha.UNICA, cuando);

        return ficha.map(FichaResource::de)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "El predio no tiene ficha urbana vigente al " + cuando));
    }

    private Predio predioDe(String codigo) {
        CodigoReferenciaCatastral referencia;
        try {
            referencia = CodigoReferenciaCatastral.de(codigo);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
        return catastro.predioPorCodigo(referencia)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun predio con ese codigo de referencia"
                                                + " catastral"));
    }

    private static LocalDate parsear(String fecha) {
        try {
            return LocalDate.parse(fecha);
        } catch (java.time.format.DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + fecha + "'");
        }
    }

    /**
     * El mensaje de una excepcion es {@code @Nullable} para el verificador. Aqui nunca lo es —los
     * objetos de valor siempre explican por que rechazan—, pero decirlo con un texto de reserva
     * cuesta menos que discutirlo.
     */
    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }
}
