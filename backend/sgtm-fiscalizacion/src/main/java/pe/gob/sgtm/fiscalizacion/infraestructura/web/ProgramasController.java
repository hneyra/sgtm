package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Programación de fiscalización: {@code POST /api/v1/fiscalizacion/programas} (RF-050, #45).
 *
 * <p>Reprogramar es registrar otro programa: no hay ruta de edición. El cuerpo es una <b>lista
 * blanca</b>, mismo patrón que {@code TransferenciaPredioController}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion/programas")
@RequiereAcceso(acceso = "fisc_programa", privilegio = Privilegio.REGISTRO)
public class ProgramasController {

    private final RegistrarPrograma programas;

    public ProgramasController(RegistrarPrograma programas) {
        this.programas = programas;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProgramaResource programar(@RequestBody PeticionDePrograma peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            return ProgramaResource.de(
                    programas.registrar(
                            exigir(peticion.codigo(), "codigo"),
                            exigir(peticion.descripcion(), "descripcion"),
                            tipoDe(peticion.tipo()),
                            fechaDe(peticion.fechaInicio(), "fechaInicio"),
                            fechaOpcionalDe(peticion.fechaFin()),
                            observacion));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static TipoDePrograma tipoDe(@Nullable String texto) {
        try {
            return TipoDePrograma.valueOf(exigir(texto, "tipo").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Tipo de programa desconocido: '" + texto + "'");
        }
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda modificacion exige la observacion del usuario: sin ella no se guarda");
        }
        try {
            return Observacion.de(texto);
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static LocalDate fechaDe(@Nullable String texto, String campo) {
        try {
            return LocalDate.parse(exigir(texto, campo).strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static @Nullable LocalDate fechaOpcionalDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return fechaDe(texto, "fechaFin");
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /** El cuerpo de una programación. <b>Lista blanca</b>: lo que no está aquí no entra. */
    public record PeticionDePrograma(
            @Nullable String observacion,
            @Nullable String codigo,
            @Nullable String descripcion,
            @Nullable String tipo,
            @Nullable String fechaInicio,
            @Nullable String fechaFin) {}
}
