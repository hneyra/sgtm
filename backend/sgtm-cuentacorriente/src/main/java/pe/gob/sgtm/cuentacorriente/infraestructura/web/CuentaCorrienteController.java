package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeConsulta;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Estado de cuenta corriente: {@code GET /api/v1/consultas/cuenta-corriente/{codigo}} (NEG-03,
 * RF-040).
 *
 * <p><b>Solo lectura.</b> El alta y la reversion de asientos las hacen los contextos que emiten
 * deuda —determinacion, tesoreria, coactiva— llamando a {@code RegistrarAsiento}; no se publican
 * aqui porque el contrato no declara ningun {@code POST} en esta ruta y ninguno de esos contextos
 * existe todavia.
 *
 * <p>{@code situacion} es un filtro que el contrato declara y esta pantalla no resuelve: depende
 * del saldo proyectado (issue #23), que sigue bloqueado. Se ignora en vez de fallar la peticion.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/cuenta-corriente")
@RequiereAcceso(acceso = "cuenta_corriente", privilegio = Privilegio.LECTURA)
public class CuentaCorrienteController {

    /** Cronologico: es como se lee un estado de cuenta cuando no se pide otro orden. */
    private static final String ORDEN_POR_OMISION = "fecha_valor";

    private final AsientoRepository repositorio;

    public CuentaCorrienteController(AsientoRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping("/{codigo}")
    public RespuestaPaginada<AsientoResource> estadoDeCuenta(
            @PathVariable String codigo,
            @RequestParam(required = false) @Nullable String ejercicio,
            @RequestParam(required = false) @Nullable String tributo,
            ParametrosDePaginacion paginacion) {

        CriterioDeConsulta criterio =
                new CriterioDeConsulta(codigo, ejercicioDe(ejercicio), tributo, null);

        return RespuestaPaginada.de(
                repositorio.buscar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                AsientoResource::de);
    }

    /**
     * {@code null} si no viene o viene en blanco. Un valor no numerico llega como {@code
     * NumberFormatException}, que extiende {@code IllegalArgumentException} y el manejador global
     * de errores traduce a 422 sin exponer nada de la base.
     */
    private static @Nullable Ejercicio ejercicioDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return new Ejercicio(Integer.parseInt(texto.strip()));
    }
}
