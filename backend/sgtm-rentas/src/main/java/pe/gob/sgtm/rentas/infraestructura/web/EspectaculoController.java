package pe.gob.sgtm.rentas.infraestructura.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.rentas.aplicacion.RegistrarEspectaculo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Espectáculos públicos no deportivos: registro del evento y determinación del impuesto en un solo
 * paso: {@code POST /api/v1/rentas/espectaculos} (RF-028, #32).
 *
 * <p>{@code organizadorId} llega como identificador, igual que {@code predioId} en {@code
 * TransferenciaPredioController}: quien completa esta pantalla ya vino de la búsqueda de
 * contribuyente (RF-004), que es quien resuelve el código.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/espectaculos")
@RequiereAcceso(acceso = "espectaculos", privilegio = Privilegio.REGISTRO)
public class EspectaculoController {

    private final RegistrarEspectaculo servicio;

    public EspectaculoController(RegistrarEspectaculo servicio) {
        this.servicio = servicio;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeterminacionEspectaculoResource registrar(@RequestBody PeticionDeEspectaculo peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        long organizadorId = exigirId(peticion.organizadorId(), "organizadorId");

        try {
            return DeterminacionEspectaculoResource.de(
                    servicio.registrar(
                            organizadorId,
                            exigir(peticion.denominacion(), "denominacion"),
                            exigir(peticion.tipo(), "tipo"),
                            exigir(peticion.lugar(), "lugar"),
                            fechaDe(peticion.fechaEvento()),
                            peticion.aforo(),
                            dineroOpcionalDe(peticion.valorEntrada()),
                            dineroDe(peticion.ingresoDeclarado(), "ingresoDeclarado"),
                            observacion));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

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

    private static Dinero dineroDe(@Nullable String texto, String campo) {
        try {
            return new Dinero(new BigDecimal(exigir(texto, campo)));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo '" + campo + "' no es un importe valido");
        }
    }

    private static @Nullable Dinero dineroOpcionalDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return dineroDe(texto, "valorEntrada");
    }

    private static LocalDate fechaDe(@Nullable String texto) {
        try {
            return LocalDate.parse(exigir(texto, "fechaEvento").strip());
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

    /**
     * El cuerpo del registro de un espectáculo. <b>Lista blanca</b>: lo que no está aquí no entra.
     */
    public record PeticionDeEspectaculo(
            @Nullable String observacion,
            @Nullable Long organizadorId,
            @Nullable String denominacion,
            @Nullable String tipo,
            @Nullable String lugar,
            @Nullable String fechaEvento,
            @Nullable Integer aforo,
            @Nullable String valorEntrada,
            @Nullable String ingresoDeclarado) {}
}
