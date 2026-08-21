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
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultarDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeudaPorContribuyente;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * {@code consulta_deuda}: {@code GET /api/v1/consultas/deuda} (RF-041, RF-042, #25).
 *
 * <p>Todas las obligaciones del contribuyente —tributo, ejercicio, unidad— con su deuda actualizada
 * a una fecha de corte, en una fila por obligacion. Sin {@code fechaDeCorte}, se calcula a hoy, con
 * el reloj inyectado de {@link ConsultarDeuda#hoy()} y no con {@code LocalDate.now()} (regla 6).
 *
 * <p>{@code incluyeConvenios} esta en el contrato de la pantalla pero se ignora: el contexto de
 * convenios de fraccionamiento todavia no existe (#25 depende de el solo para esa parte). Se acepta
 * el parametro para no romper la pantalla, no se aplica —el mismo patron que {@code situacion} en
 * {@code CuentaCorrienteController}—.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/deuda")
@RequiereAcceso(acceso = "consulta_deuda", privilegio = Privilegio.LECTURA)
public class ConsultaDeudaController {

    private static final String ORDEN_POR_OMISION = "ejercicio";

    private final ConsultarDeuda consulta;

    public ConsultaDeudaController(ConsultarDeuda consulta) {
        this.consulta = consulta;
    }

    @GetMapping
    public RespuestaPaginada<ObligacionConDeudaResource> deuda(
            @RequestParam String codContribuyente,
            @RequestParam(required = false) @Nullable String fechaDeCorte,
            @RequestParam(required = false) @Nullable String fase,
            @RequestParam(required = false) @Nullable String incluyeConvenios,
            ParametrosDePaginacion parametros) {

        if (codContribuyente.isBlank()) {
            throw new IllegalArgumentException(
                    "codContribuyente es obligatorio para consultar la deuda");
        }

        CriterioDeDeudaPorContribuyente criterio =
                new CriterioDeDeudaPorContribuyente(
                        codContribuyente, fechaDe(fechaDeCorte), faseDe(fase));

        return RespuestaPaginada.de(
                consulta.porContribuyente(criterio, paginacionDe(parametros)),
                ObligacionConDeudaResource::de);
    }

    private static @Nullable Fase faseDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return Fase.valueOf(texto.strip().toUpperCase(Locale.ROOT));
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

    /**
     * Igual que {@link ParametrosDePaginacion#aPaginacion}, salvo la direccion por omision: aqui es
     * {@code DESCENDENTE} —el ejercicio mas reciente primero, como se lee un listado de deuda en
     * ventanilla—, en vez de la {@code ASCENDENTE} que asume {@code aPaginacion}.
     */
    private static Paginacion paginacionDe(ParametrosDePaginacion parametros) {
        return new Paginacion(
                parametros.pagina() == null ? 0 : parametros.pagina(),
                parametros.tamano() == null ? 20 : parametros.tamano(),
                parametros.ordenarPor() == null || parametros.ordenarPor().isBlank()
                        ? ORDEN_POR_OMISION
                        : parametros.ordenarPor(),
                parametros.direccion() == null
                        ? Paginacion.Direccion.DESCENDENTE
                        : parametros.direccion());
    }
}
