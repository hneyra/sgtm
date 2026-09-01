package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeAltasBajas;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Consulta de altas y bajas: {@code GET /api/v1/consultas/altas-bajas} (RF-045).
 *
 * <p>Devuelve los asientos que son movimientos de deuda, con el documento que los sustenta y el
 * motivo con que se registraron. Es lo que responde «por que debe esto» sobre una deuda restante:
 * la lista de lo que entro y lo que salio, cada linea con su resolucion.
 *
 * <p><b>{@code autoManual} es un filtro que el contrato declara y esta pantalla no resuelve</b>, y
 * conviene decir por que en vez de fingirlo: hoy nada distingue en el libro un movimiento
 * registrado a mano de uno que produjo una emision, porque no hay ninguna columna que lo marque y
 * la emision masiva todavia no existe —es #30, mas adelante en la secuencia—. Cuando exista habra
 * que decidir como se marca; mientras tanto el filtro se ignora en vez de fallar la peticion, igual
 * que {@code situacion} en {@code CuentaCorrienteController}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/altas-bajas")
@RequiereAcceso(acceso = "consulta_altas_bajas", privilegio = Privilegio.LECTURA)
public class AltasBajasController {

    /** Cronologico, como se lee cualquier movimiento de cuenta corriente. */
    private static final String ORDEN_POR_OMISION = "fecha_valor";

    private final ConsultasDelLibro consulta;

    public AltasBajasController(ConsultasDelLibro consulta) {
        this.consulta = consulta;
    }

    /**
     * {@code @Transactional(readOnly = true)} directo en el controlador: es un passthrough de
     * lectura, sin caso de uso intermedio que lo justifique. Sin la anotacion, la consulta falla en
     * la base por falta de contexto —{@code RepositorioJdbc} no abre transaccion propia—, igual que
     * le pasaba a {@code CuentaCorrienteController} antes de este mismo arreglo.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public RespuestaPaginada<AsientoResource> altasYBajas(
            @RequestParam(required = false) @Nullable String codigoCont,
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String ano,
            @RequestParam(required = false) @Nullable String tributo,
            @RequestParam(required = false) @Nullable String altaBaja,
            ParametrosDePaginacion paginacion) {

        String codigo = exigirContribuyente(codContribuyente, codigoCont, "codigoCont");
        if (consulta.contribuyentePorCodigo(codigo).isEmpty()) {
            throw noEstaEnElPadron(codigo);
        }

        CriterioDeAltasBajas criterio =
                new CriterioDeAltasBajas(codigo, ejercicioDe(ano), tributo, sentidoDe(altaBaja));

        return RespuestaPaginada.de(
                consulta.altasYBajas(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION)),
                AsientoResource::de);
    }

    private static @Nullable Ejercicio ejercicioDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return new Ejercicio(Integer.parseInt(texto.strip()));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "El año no es un numero");
        }
    }

    private static @Nullable SentidoDelMovimiento sentidoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return SentidoDelMovimiento.valueOf(texto.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El filtro «Alta / Baja» admite ALTA o BAJA: '" + texto + "'");
        }
    }

    /**
     * Lo que la peticion diga de quien es la consulta, con los dos nombres (#622).
     *
     * <p>Uno de los dos es <b>obligatorio</b>: sin ninguno, 422. Sin esa exigencia esto seria una
     * puerta al padron entero.
     */
    private static String exigirContribuyente(
            @Nullable String canonico, @Nullable String alias, String nombreDelAlias) {
        String codigo = primeroNoVacio(canonico, alias);
        if (codigo == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Hay que decir de quien es la consulta: falta «codContribuyente» (o su otro"
                            + " nombre, «"
                            + nombreDelAlias
                            + "»)");
        }
        return codigo;
    }

    private static @Nullable String primeroNoVacio(@Nullable String uno, @Nullable String otro) {
        String primero = limpio(uno);
        return primero != null ? primero : limpio(otro);
    }

    private static @Nullable String limpio(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String sinBlancos = texto.strip();
        return sinBlancos.isEmpty() ? null : sinBlancos;
    }

    /**
     * Un codigo que no esta en el padron es {@code 404} nombrandolo, no una pagina vacia (#622).
     *
     * <p>Es el mismo defecto que #541 y #595 cerraron en las dos lecturas de Rentas: el expediente
     * pide siete lecturas con el mismo codigo, una contestaba 404 y las otras seis «existe y no
     * tiene nada». Quien atiende leia seis afirmaciones de que la persona existe debajo de una que
     * decia que no — y la que mas cuesta es la de deuda, porque «no tiene deuda pendiente» sobre
     * alguien que el padron no reconoce es lo que se dice antes de emitir una constancia de no
     * adeudo.
     */
    private static RuntimeException noEstaEnElPadron(String codigo) {
        return new ProblemaDeNegocio(
                CodigoDeError.NO_ENCONTRADO,
                "En el padron de esta municipalidad no hay ningun contribuyente con codigo '"
                        + codigo
                        + "'");
    }
}
