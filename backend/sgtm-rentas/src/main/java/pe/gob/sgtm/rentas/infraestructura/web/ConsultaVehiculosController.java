package pe.gob.sgtm.rentas.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.rentas.aplicacion.ConsultaDeVehiculos;
import pe.gob.sgtm.rentas.dominio.CriterioDeVehiculo;
import pe.gob.sgtm.rentas.dominio.EstadoVehiculo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * {@code consulta_vehiculos}: {@code GET /api/v1/consultas/vehiculos} (RF-024, #25).
 *
 * <p>Vive en {@code rentas} y no en {@code cuentacorriente}: es el contexto mas rico de los dos
 * para esta pantalla —el padron vehicular es suyo—, y consulta la deuda de cada fila a traves de
 * {@link pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica}, la API publica del otro (ARQ-01 §4).
 *
 * <p>{@code estado} filtra por el estado del vehiculo en el padron ({@code ACTIVO}, {@code
 * TRANSFERIDO}, {@code BAJA}, {@code ROBADO}): el prototipo dibuja
 * «AFECTO/INAFECTO/EXONERADO/BAJA», que no son valores de esta columna sino de la afectacion
 * calculada de cada fila. Solo {@code BAJA} coincide entre los dos vocabularios; el resto se ignora
 * como filtro —igual que {@code ConsultaDeudaController} ignora una «Fase» que no traduce—, y queda
 * para cuando la pantalla se conecte.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/vehiculos")
@RequiereAcceso(acceso = "consulta_vehiculos", privilegio = Privilegio.LECTURA)
public class ConsultaVehiculosController {

    private static final String ORDEN_POR_OMISION = "placa";

    private final ConsultaDeVehiculos consulta;
    private final Clock reloj;

    public ConsultaVehiculosController(ConsultaDeVehiculos consulta, Clock reloj) {
        this.consulta = consulta;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<VehiculoEncontradoResource> buscar(
            @RequestParam(required = false) @Nullable String placa,
            @RequestParam(required = false) @Nullable String nroMotor,
            @RequestParam(required = false) @Nullable String contribuyente,
            @RequestParam(required = false) @Nullable String estado,
            @RequestParam(required = false) @Nullable String fecha,
            ParametrosDePaginacion parametros) {

        CriterioDeVehiculo criterio =
                new CriterioDeVehiculo(placa, nroMotor, contribuyente, estadoDe(estado));

        return RespuestaPaginada.de(
                consulta.buscar(
                        criterio, fechaDe(fecha), parametros.aPaginacion(ORDEN_POR_OMISION)),
                VehiculoEncontradoResource::de);
    }

    /** Solo {@code BAJA} tiene equivalente en el padron; el resto no filtra (ver el javadoc). */
    private static @Nullable EstadoVehiculo estadoDe(@Nullable String texto) {
        if (texto == null || !"BAJA".equalsIgnoreCase(texto.strip())) {
            return null;
        }
        return EstadoVehiculo.BAJA;
    }

    private LocalDate fechaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return LocalDate.now(reloj);
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException excepcion) {
            throw new IllegalArgumentException(
                    "La fecha debe tener formato AAAA-MM-DD: '" + texto + "'", excepcion);
        }
    }
}
