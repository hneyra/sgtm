package pe.gob.sgtm.rentas.infraestructura.web;

import java.math.BigDecimal;
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
import pe.gob.sgtm.rentas.aplicacion.RegistrarAlcabala;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Impuesto de alcabala: {@code POST /api/v1/rentas/alcabala} (RF-026, #32).
 *
 * <p>{@code autoavaluoAjustado} llega en el cuerpo porque el ajuste por el IPM no está resuelto
 * todavía (D-11): quien complete esta pantalla lo trae ya calculado, igual que {@code
 * TransferenciaPredioController} recibe el valor de transferencia en vez de inventarlo.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/alcabala")
@RequiereAcceso(acceso = "alcabala", privilegio = Privilegio.REGISTRO)
public class AlcabalaController {

    private final RegistrarAlcabala servicio;

    public AlcabalaController(RegistrarAlcabala servicio) {
        this.servicio = servicio;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeterminacionAlcabalaResource determinar(@RequestBody PeticionDeAlcabala peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        long transferenciaId = exigirId(peticion.transferenciaId(), "transferenciaId");
        Dinero autoavaluoAjustado = dineroDe(peticion.autoavaluoAjustado(), "autoavaluoAjustado");

        try {
            return DeterminacionAlcabalaResource.de(
                    servicio.determinar(transferenciaId, autoavaluoAjustado, observacion));
        } catch (RegistrarAlcabala.TransferenciaInexistente inexistente) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(inexistente));
        } catch (RegistrarAlcabala.NoGravaAlcabala noGrava) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(noGrava));
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
     * El cuerpo de la determinación de alcabala. <b>Lista blanca</b>: lo que no está aquí no entra.
     */
    public record PeticionDeAlcabala(
            @Nullable String observacion,
            @Nullable Long transferenciaId,
            @Nullable String autoavaluoAjustado) {}
}
