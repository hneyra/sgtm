package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultarDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.web.Api;

/**
 * {@code consulta_deuda}: {@code GET /api/v1/consultas/deuda} (RF-041, RF-042).
 *
 * <p>Insoluto, reajuste, interes y gasto de <b>una</b> obligacion —contribuyente, tributo, año y,
 * si el tributo se divide, la cuota y la unidad que la distinguen—, a una fecha de corte. Sin
 * {@code fecha}, se calcula a hoy, con el reloj inyectado de {@link ConsultarDeuda#hoy()} y no con
 * {@code LocalDate.now()} (regla 6).
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/deuda")
@RequiereAcceso(acceso = "consulta_deuda", privilegio = Privilegio.LECTURA)
public class ConsultaDeudaController {

    private final ConsultarDeuda consulta;

    public ConsultaDeudaController(ConsultarDeuda consulta) {
        this.consulta = consulta;
    }

    @GetMapping
    public DeudaResource deuda(
            @RequestParam String codContribuyente,
            @RequestParam String tributo,
            @RequestParam int anio,
            @RequestParam(required = false) @Nullable Integer cuota,
            @RequestParam(required = false) @Nullable Long predioId,
            @RequestParam(required = false) @Nullable Long vehiculoId,
            @RequestParam(required = false) @Nullable String fase,
            @RequestParam(required = false) @Nullable String concepto,
            @RequestParam(required = false) @Nullable String fecha) {

        CriterioDeDeuda criterio =
                new CriterioDeDeuda(
                        codContribuyente,
                        tributo,
                        new Ejercicio(anio),
                        cuota,
                        predioId,
                        vehiculoId,
                        faseDe(fase),
                        conceptoDe(concepto),
                        fechaDe(fecha));

        return DeudaResource.de(consulta.deudaActualizadaA(criterio));
    }

    private static @Nullable Fase faseDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return Fase.valueOf(texto.strip().toUpperCase(Locale.ROOT));
    }

    private static @Nullable Concepto conceptoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return Concepto.valueOf(texto.strip().toUpperCase(Locale.ROOT));
    }

    /**
     * La fecha de corte pedida, o hoy si no viene ninguna.
     *
     * <p>{@code DateTimeParseException} no extiende {@code IllegalArgumentException} —a diferencia
     * de {@code NumberFormatException}—, asi que sin este {@code catch} el manejador global la
     * trataria como error interno (500) en vez de una entrada mal formada (422).
     */
    private LocalDate fechaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return consulta.hoy();
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException excepcion) {
            throw new IllegalArgumentException(
                    "La fecha de corte debe tener formato AAAA-MM-DD: '" + texto + "'", excepcion);
        }
    }
}
