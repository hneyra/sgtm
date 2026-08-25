package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.math.BigDecimal;
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
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Acta de inspección predial: {@code POST /api/v1/fiscalizacion/predial/actas} (RF-051, #45).
 *
 * <p>Trabaja sobre una copia: no toca ninguna fila de {@code catastro} (AC de #45). El cuerpo es
 * una <b>lista blanca</b>, mismo patrón que {@code TransferenciaPredioController}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion/predial/actas")
@RequiereAcceso(acceso = "fisc_predial", privilegio = Privilegio.REGISTRO)
public class ActaPredialController {

    private final RegistrarActaFiscalizacion actas;

    public ActaPredialController(RegistrarActaFiscalizacion actas) {
        this.actas = actas;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActaFiscalizacionResource registrar(@RequestBody PeticionDeActaPredial peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            return ActaFiscalizacionResource.de(
                    actas.registrarPredial(
                            exigirId(peticion.programaId(), "programaId"),
                            exigirId(peticion.contribuyenteId(), "contribuyenteId"),
                            exigirId(peticion.predioId(), "predioId"),
                            fechaDe(peticion.fechaVisita()),
                            exigir(peticion.fiscalizador(), "fiscalizador"),
                            hallazgoDe(peticion.hallazgo()),
                            areaDe(peticion.areaHallada()),
                            peticion.detalle(),
                            observacion));
        } catch (RegistrarActaFiscalizacion.ProgramaInexistente
                | RegistrarActaFiscalizacion.ProgramaDeOtroTipo problema) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(problema));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static @Nullable Hallazgo hallazgoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return Hallazgo.valueOf(texto.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Hallazgo desconocido: '" + texto + "'");
        }
    }

    private static @Nullable BigDecimal areaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(texto.strip());
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El area hallada no es un numero valido");
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

    private static LocalDate fechaDe(@Nullable String texto) {
        try {
            return LocalDate.parse(exigir(texto, "fechaVisita").strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static long exigirId(@Nullable Long valor, String campo) {
        if (valor == null || valor < 1) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor;
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

    /** El cuerpo de un acta predial. <b>Lista blanca</b>: lo que no está aquí no entra. */
    public record PeticionDeActaPredial(
            @Nullable String observacion,
            @Nullable Long programaId,
            @Nullable Long contribuyenteId,
            @Nullable Long predioId,
            @Nullable String fechaVisita,
            @Nullable String fiscalizador,
            @Nullable String hallazgo,
            @Nullable String areaHallada,
            @Nullable String detalle) {}
}
