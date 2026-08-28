package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.TransferenciaDeFiscalizacion;
import pe.gob.sgtm.documentos.FormatoDeDocumento;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.ConsultaDeResoluciones;
import pe.gob.sgtm.fiscalizacion.aplicacion.LiquidarFiscalizacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.TransferirARentas;
import pe.gob.sgtm.fiscalizacion.dominio.ResolucionDeDeterminacionRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * La transferencia a rentas y su resolucion de determinacion por HTTP (#52, RF-054, RF-057).
 *
 * <h2>Dos rutas, dos opciones del catalogo</h2>
 *
 * <ul>
 *   <li>{@code POST /fiscalizacion/transferencias} es la accion de {@code fisc_resultados}: la
 *       pantalla declara su grilla como endpoint, y transferir necesita verbo propio. Exige el
 *       privilegio de <b>registro</b>: es el acto que cambia el padron.
 *   <li>{@code GET /fiscalizacion/resoluciones/{numero}} es {@code resolucion_determinacion_fisc},
 *       que el contrato ya publicaba y nadie servia.
 * </ul>
 *
 * <p>No hay {@code PUT} ni {@code PATCH}, y no es un olvido: {@code resolucion_determinacion} no
 * admite {@code UPDATE} desde V49. Una resolucion equivocada se deja sin efecto con otro acto.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion")
public class ResolucionController {

    /** Las dos opciones del catalogo (NEG-03) que este controlador sirve. */
    static final String ACCESO_RESULTADOS = "fisc_resultados";

    static final String ACCESO_RESOLUCION = "resolucion_determinacion_fisc";

    private final TransferirARentas transferir;
    private final ConsultaDeResoluciones consulta;
    private final Clock reloj;

    public ResolucionController(
            TransferirARentas transferir, ConsultaDeResoluciones consulta, Clock reloj) {
        this.transferir = transferir;
        this.consulta = consulta;
        this.reloj = reloj;
    }

    /**
     * Transfiere el resultado al padron y emite su resolucion (RF-054).
     *
     * <p>Los errores se traducen uno a uno y no a un 500 generico: cada uno se arregla de una
     * manera distinta —cerrar la liquidacion, adjuntar el papel, transferir la version buena— y un
     * mensaje unico dejaria a quien opera adivinando.
     */
    @PostMapping("/transferencias")
    @RequiereAcceso(acceso = ACCESO_RESULTADOS, privilegio = Privilegio.REGISTRO)
    @ResponseStatus(HttpStatus.CREATED)
    public ResolucionResource transferir(@RequestBody PeticionDeTransferencia peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        TransferirARentas.Transferencia transferencia;
        try {
            transferencia =
                    transferir.transferir(
                            new TransferirARentas.Peticion(
                                    exigir(peticion.nLiquidacion(), "nLiquidacion"),
                                    fechaOpcional(peticion.fecha(), "fecha", LocalDate.now(reloj)),
                                    exigir(peticion.documentoSustento(), "documentoSustento"),
                                    exigir(peticion.sustento(), "sustento"),
                                    exigir(peticion.baseLegal(), "baseLegal")),
                            formatoDe(peticion.formato()),
                            observacion);
        } catch (TransferirARentas.LiquidacionInexistente
                | LiquidarFiscalizacion.ActaInexistente noExiste) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noExiste));
        } catch (ResolucionDeDeterminacionRepository.LiquidacionYaTransferida
                | TransferirARentas.LiquidacionSustituida enConflicto) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(enConflicto));
        } catch (TransferirARentas.SinSustentoDocumental
                | TransferenciaDeFiscalizacion.SinFichaQueVersionar
                | IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }

        return ResolucionResource.de(
                consulta.porNumero(transferencia.resolucion().numero())
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "La resolucion recien registrada tiene que poder"
                                                        + " leerse en la misma transaccion")),
                transferencia);
    }

    /** La resolucion de determinacion por su numero (RF-057). */
    @GetMapping("/resoluciones/{numero}")
    @RequiereAcceso(acceso = ACCESO_RESOLUCION, privilegio = Privilegio.LECTURA)
    public ResolucionResource resolucion(@PathVariable String numero) {
        return ResolucionResource.de(
                consulta.porNumero(numero)
                        .orElseThrow(
                                () ->
                                        new ProblemaDeNegocio(
                                                CodigoDeError.NO_ENCONTRADO,
                                                "No hay ninguna resolucion de determinacion con el"
                                                        + " numero '"
                                                        + numero
                                                        + "'")));
    }

    // ------------------------------------------------------------------

    private static FormatoDeDocumento formatoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return FormatoDeDocumento.PDF;
        }
        try {
            return FormatoDeDocumento.valueOf(texto.strip().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'formato' admite PDF, XLS o RTF: '" + texto + "'");
        }
    }

    private static LocalDate fechaOpcional(
            @Nullable String texto, String campo, LocalDate porOmision) {
        if (texto == null || texto.isBlank()) {
            return porOmision;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '" + campo + "' va en formato ISO (2026-03-16): '" + texto + "'");
        }
    }

    private static Observacion observacionDe(@Nullable String texto) {
        try {
            return Observacion.de(exigir(texto, "observacion"));
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "La operacion no se pudo completar" : mensaje;
    }

    /**
     * El cuerpo de una transferencia. <b>Lista blanca</b>: lo que no esta aqui no entra.
     *
     * <p>No lleva ni el predio, ni el area, ni el uso: todo eso sale de la liquidacion y del acta,
     * que es donde el fiscalizador lo dejo. Si el cuerpo pudiera traerlos, la transferencia
     * inscribiria en el padron lo que alguien teclea en la pantalla y no lo que se hallo en campo,
     * que es exactamente lo que esta frontera existe para impedir.
     */
    public record PeticionDeTransferencia(
            @Nullable String observacion,
            @Nullable String nLiquidacion,
            @Nullable String documentoSustento,
            @Nullable String sustento,
            @Nullable String baseLegal,
            @Nullable String fecha,
            @Nullable String formato) {}
}
