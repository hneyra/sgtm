package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.math.BigDecimal;
import java.time.Clock;
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
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Alta y baja de deuda: {@code POST /api/v1/rentas/deuda/altas} y {@code .../bajas} (RF-043,
 * RF-044).
 *
 * <p>Son dos rutas y un solo controlador porque el cuerpo es el mismo y lo unico que cambia es el
 * sentido. Separarlos en dos clases duplicaria la validacion entera para cambiar un enum.
 *
 * <p><b>La observacion viene en el cuerpo y es obligatoria</b> (regla 10, RNF-052), igual que en
 * {@code ActualizacionController}. Y el <b>sustento documental</b> tambien: sin la resolucion que
 * lo aprueba, un alta o una baja de deuda no se puede defender ante nadie, y por eso lo exige
 * {@link MovimientoDeDeuda} en su constructor y no una validacion de cortesia aqui.
 *
 * <p>El cuerpo es una <b>lista blanca</b>: un campo que la opcion no declara no entra, aunque
 * llegue en el JSON.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/deuda")
public class MovimientosDeDeudaController {

    private final RegistrarMovimientoDeDeuda movimientos;
    private final AsientoRepository asientos;
    private final Clock reloj;

    public MovimientosDeDeudaController(
            RegistrarMovimientoDeDeuda movimientos, AsientoRepository asientos, Clock reloj) {
        this.movimientos = movimientos;
        this.asientos = asientos;
        this.reloj = reloj;
    }

    @PostMapping("/altas")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "alta_deuda", privilegio = Privilegio.REGISTRO)
    public MovimientoDeDeudaResource alta(@RequestBody PeticionDeMovimiento peticion) {
        return registrar(SentidoDelMovimiento.ALTA, peticion);
    }

    @PostMapping("/bajas")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "baja_deuda", privilegio = Privilegio.REGISTRO)
    public MovimientoDeDeudaResource baja(@RequestBody PeticionDeMovimiento peticion) {
        return registrar(SentidoDelMovimiento.BAJA, peticion);
    }

    // ------------------------------------------------------------------

    private MovimientoDeDeudaResource registrar(
            SentidoDelMovimiento sentido, PeticionDeMovimiento peticion) {

        Observacion observacion = observacionDe(peticion.observacion());
        String codigoContribuyente = exigir(peticion.codContribuyente(), "codContribuyente");
        long contribuyenteId = contribuyenteDe(codigoContribuyente);

        MovimientoDeDeuda movimiento;
        try {
            movimiento =
                    new MovimientoDeDeuda(
                            sentido,
                            new ClaveDeSaldo(
                                    contribuyenteId,
                                    exigir(peticion.tributo(), "tributo"),
                                    new Ejercicio(entero(peticion.ano(), "ano")),
                                    peticion.cuota() == null ? 0 : peticion.cuota(),
                                    peticion.predioId(),
                                    peticion.vehiculoId()),
                            importe(peticion.insoluto(), "insoluto"),
                            importe(peticion.reajuste(), "reajuste"),
                            importe(peticion.interes(), "interes"),
                            importe(peticion.gasto(), "gasto"),
                            faseDe(peticion.fase()),
                            fechaDe(peticion.fechaValor()),
                            exigir(peticion.documentoOrigen(), "documentoOrigen"),
                            peticion.referenciaExterna());
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }

        RegistrarMovimientoDeDeuda.Registro registro;
        try {
            registro = movimientos.registrar(movimiento, codigoContribuyente, observacion);
        } catch (RegistrarMovimientoDeDeuda.BajaMayorQueLaDeuda excede) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(excede));
        }
        return MovimientoDeDeudaResource.de(
                sentido.name(), registro.asientos(), registro.numeroDeDocumento());
    }

    private long contribuyenteDe(String codigo) {
        return asientos.contribuyentePorCodigo(codigo.strip().toUpperCase(Locale.ROOT))
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun contribuyente con ese codigo"));
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

    /** Ausente o en blanco es cero: una parte del desglose que este movimiento no toca. */
    private static Dinero importe(@Nullable String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return Dinero.CERO;
        }
        try {
            return new Dinero(new BigDecimal(texto.strip()));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo '" + campo + "' no es un importe valido");
        }
    }

    private static Fase faseDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return Fase.ORDINARIA;
        }
        try {
            return Fase.valueOf(texto.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Fase desconocida: '" + texto + "'");
        }
    }

    /** Sin fecha, la de hoy del reloj inyectado; nunca {@code LocalDate.now()} suelto (regla 6). */
    private LocalDate fechaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return LocalDate.now(reloj);
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static int entero(@Nullable String texto, String campo) {
        try {
            return Integer.parseInt(exigir(texto, campo));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo '" + campo + "' no es un numero");
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
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo de un alta o una baja. <b>Lista blanca</b>: lo que no esta aqui no entra.
     *
     * <p>Los importes viajan como texto y no como numero a proposito: un {@code double} en el JSON
     * pierde centimos antes de llegar (regla 1), y aceptarlo como {@code BigDecimal} directo
     * dejaria que Jackson decidiera el formato en vez de rechazarlo con un mensaje que se entienda.
     */
    public record PeticionDeMovimiento(
            @Nullable String observacion,
            @Nullable String codContribuyente,
            @Nullable String tributo,
            @Nullable String ano,
            @Nullable Integer cuota,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            @Nullable String insoluto,
            @Nullable String reajuste,
            @Nullable String interes,
            @Nullable String gasto,
            @Nullable String fase,
            @Nullable String fechaValor,
            @Nullable String documentoOrigen,
            @Nullable String referenciaExterna) {}
}
