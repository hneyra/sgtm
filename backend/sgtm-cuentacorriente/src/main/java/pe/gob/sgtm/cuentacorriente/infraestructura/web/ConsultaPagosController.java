package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDePagos;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * {@code consulta_pagos}: {@code GET /api/v1/consultas/pagos} (RF-048, #25).
 *
 * <p>El historial de pagos de un contribuyente: cada fila es el asiento {@code ABONO} de concepto
 * {@code PAGO} con que se registro el cobro, con su {@code documentoOrigen} como recibo y su fecha
 * valor (regla 9, RNF-075). Reusa {@link AsientoResource}, la misma forma que {@code
 * consulta_altas_bajas} —es la misma tabla, filtrada distinto—.
 *
 * <p><b>{@code medioDePago} es un filtro que el contrato declara y esta pantalla no resuelve</b>:
 * ningun campo del asiento distingue efectivo de tarjeta o transferencia, porque esa distincion es
 * de caja —{@code tesoreria}, que todavia no existe—. Se ignora en vez de fallar la peticion, igual
 * que {@code autoManual} en {@code AltasBajasController}. Lo mismo para «la caja» que menciona el
 * resumen del manual: no hay ninguna columna que la registre todavia.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/pagos")
@RequiereAcceso(acceso = "consulta_pagos", privilegio = Privilegio.LECTURA)
public class ConsultaPagosController {

    /** Cronologico, como se lee cualquier movimiento de cuenta corriente. */
    private static final String ORDEN_POR_OMISION = "fecha_valor";

    private final ConsultasDelLibro consulta;

    public ConsultaPagosController(ConsultasDelLibro consulta) {
        this.consulta = consulta;
    }

    /**
     * {@code @Transactional(readOnly = true)} directo en el controlador: es un passthrough de
     * lectura, sin caso de uso intermedio que lo justifique, igual que {@code
     * AltasBajasController}.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public RespuestaPaginada<AsientoResource> pagos(
            @RequestParam String codContribuyente,
            @RequestParam(required = false) @Nullable String desde,
            @RequestParam(required = false) @Nullable String hasta,
            ParametrosDePaginacion parametros) {

        CriterioDePagos criterio =
                new CriterioDePagos(
                        codContribuyente, fechaDe("desde", desde), fechaDe("hasta", hasta));

        return RespuestaPaginada.de(
                consulta.pagos(criterio, parametros.aPaginacion(ORDEN_POR_OMISION)),
                AsientoResource::de);
    }

    private static @Nullable LocalDate fechaDe(String nombre, @Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException excepcion) {
            throw new IllegalArgumentException(
                    "El filtro «" + nombre + "» debe tener formato AAAA-MM-DD: '" + texto + "'",
                    excepcion);
        }
    }
}
