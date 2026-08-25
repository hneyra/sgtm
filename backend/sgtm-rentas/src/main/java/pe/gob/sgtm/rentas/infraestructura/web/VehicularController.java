package pe.gob.sgtm.rentas.infraestructura.web;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.rentas.aplicacion.RegistrarDeterminacionVehicular;
import pe.gob.sgtm.rentas.dominio.CriterioDeVehiculo;
import pe.gob.sgtm.rentas.dominio.EstadoVehiculo;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.VehiculoEncontrado;
import pe.gob.sgtm.rentas.dominio.VehiculoRepository;
import pe.gob.sgtm.rentas.dominio.predial.Determinacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Cálculo del impuesto vehicular: {@code POST /api/v1/rentas/vehicular/calculo} (RF-025, #32).
 *
 * <p>Resuelve el objetivo de tres formas —un {@code vehiculoId}, una {@code placa}, o todos los
 * vehículos activos de un {@code codContribuyente}—, tal como pide el catálogo («por contribuyente
 * o por placa»). Cuando el objetivo es un contribuyente, un vehículo fuera de su plazo de
 * afectación se excluye del resultado en silencio —es la respuesta automática que #32 exige—;
 * cuando el objetivo es un vehículo puntual, la misma situación se informa como error: quien pidió
 * ese vehículo esperaba una respuesta sobre él, no una lista vacía.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/vehicular/calculo")
@RequiereAcceso(acceso = "vehicular_calculo", privilegio = Privilegio.REGISTRO)
public class VehicularController {

    private static final String ORDEN_POR_OMISION = "placa";

    private final RegistrarDeterminacionVehicular servicio;
    private final VehiculoRepository vehiculos;
    private final Clock reloj;

    public VehicularController(
            RegistrarDeterminacionVehicular servicio, VehiculoRepository vehiculos, Clock reloj) {
        this.servicio = servicio;
        this.vehiculos = vehiculos;
        this.reloj = reloj;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<DeterminacionVehicularResource> calcular(
            @RequestBody PeticionDeCalculoVehicular peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        Ejercicio ejercicio = ejercicioDe(peticion.ejercicio());
        Dinero minimoImponible = dineroDe(peticion.minimoImponible());
        boolean simulacion = Boolean.TRUE.equals(peticion.simulacion());
        boolean objetivoPuntual = esObjetivoPuntual(peticion);

        List<DeterminacionVehicularResource> resultado = new ArrayList<>();
        for (Vehiculo vehiculo : resolverVehiculos(peticion)) {
            try {
                Determinacion determinacion =
                        servicio.calcular(
                                exigirId(vehiculo.id()),
                                ejercicio,
                                minimoImponible,
                                simulacion,
                                observacion);
                resultado.add(DeterminacionVehicularResource.de(determinacion, vehiculo));
            } catch (RegistrarDeterminacionVehicular.VehiculoNoAfecto fueraDePlazo) {
                if (objetivoPuntual) {
                    throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(fueraDePlazo));
                }
                // Calculo por contribuyente: un vehiculo fuera de plazo se excluye, no se informa.
            }
        }
        return resultado;
    }

    // ------------------------------------------------------------------

    private List<Vehiculo> resolverVehiculos(PeticionDeCalculoVehicular peticion) {
        if (peticion.vehiculoId() != null) {
            return List.of(
                    vehiculos
                            .findById(peticion.vehiculoId())
                            .orElseThrow(
                                    () ->
                                            new ProblemaDeNegocio(
                                                    CodigoDeError.NO_ENCONTRADO,
                                                    "No hay ningun vehiculo con identificador "
                                                            + peticion.vehiculoId())));
        }
        if (peticion.placa() != null && !peticion.placa().isBlank()) {
            return List.of(
                    vehiculos
                            .findByPlaca(Placa.de(peticion.placa()))
                            .orElseThrow(
                                    () ->
                                            new ProblemaDeNegocio(
                                                    CodigoDeError.NO_ENCONTRADO,
                                                    "No hay ningun vehiculo con placa '"
                                                            + peticion.placa()
                                                            + "'")));
        }
        if (peticion.codContribuyente() != null && !peticion.codContribuyente().isBlank()) {
            CriterioDeVehiculo criterio =
                    new CriterioDeVehiculo(
                            null, null, peticion.codContribuyente(), EstadoVehiculo.ACTIVO);
            Pagina<VehiculoEncontrado> pagina =
                    vehiculos.buscar(
                            criterio,
                            Paginacion.de(0, Paginacion.TAMANO_MAXIMO, ORDEN_POR_OMISION));
            if (pagina.contenido().isEmpty()) {
                throw new ProblemaDeNegocio(
                        CodigoDeError.NO_ENCONTRADO,
                        "El contribuyente '"
                                + peticion.codContribuyente()
                                + "' no tiene ningun vehiculo activo");
            }
            return pagina.contenido().stream().map(VehiculoEncontrado::vehiculo).toList();
        }
        throw new ProblemaDeNegocio(
                CodigoDeError.VALIDACION,
                "Falta el objetivo del calculo: 'vehiculoId', 'placa' o 'codContribuyente'");
    }

    private static boolean esObjetivoPuntual(PeticionDeCalculoVehicular peticion) {
        return peticion.vehiculoId() != null
                || (peticion.placa() != null && !peticion.placa().isBlank());
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

    private Ejercicio ejercicioDe(@Nullable String texto) {
        return texto == null || texto.isBlank()
                ? Ejercicio.de(LocalDate.now(reloj))
                : new Ejercicio(Integer.parseInt(texto));
    }

    private static Dinero dineroDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return Dinero.CERO;
        }
        try {
            return new Dinero(new BigDecimal(texto));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El minimo imponible no es un importe valido");
        }
    }

    private static long exigirId(@Nullable Long valor) {
        if (valor == null) {
            throw new IllegalStateException("Un vehiculo ya guardado siempre tiene identificador");
        }
        return valor;
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo del cálculo vehicular. <b>Lista blanca</b>: lo que no está aquí no entra.
     *
     * <p>Exactamente uno de {@code vehiculoId}, {@code placa} o {@code codContribuyente} resuelve
     * el objetivo. {@code minimoImponible} viaja como texto (regla 1) y es opcional: sin él, no se
     * aplica ningún mínimo —el origen del mínimo del vehicular no está decidido todavía (D-02a)—.
     */
    public record PeticionDeCalculoVehicular(
            @Nullable String observacion,
            @Nullable Long vehiculoId,
            @Nullable String placa,
            @Nullable String codContribuyente,
            @Nullable String ejercicio,
            @Nullable String minimoImponible,
            @Nullable Boolean simulacion) {}
}
