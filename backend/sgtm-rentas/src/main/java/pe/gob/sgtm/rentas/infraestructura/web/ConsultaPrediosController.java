package pe.gob.sgtm.rentas.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.PredioDelContribuyente;
import pe.gob.sgtm.catastro.PrediosDelContribuyente;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.rentas.dominio.TransferenciaRepository;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ImporteActualizado;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * {@code consulta_predios}: {@code GET /api/v1/consultas/predios} (#25).
 *
 * <p>Vive en {@code rentas} y no en {@code catastro}: la deuda de cada predio es de {@code
 * cuentacorriente}, y {@code catastro} no puede depender de ella (ARQ-01 §4 regla 2). Combina la
 * API publica de los dos —{@link PrediosDelContribuyente} y {@link ConsultaDeDeudaPublica}—, mismo
 * patron que {@code ConsultaVehiculosController}.
 *
 * <p><b>{@code codigoPredial}, {@code calle}, {@code manzana} y {@code lote} son filtros que el
 * contrato declara y esta pantalla no resuelve todavia</b>: {@link PrediosDelContribuyente} solo
 * sabe listar los predios de un contribuyente, no buscar por ubicacion ni por codigo — eso necesita
 * una busqueda propia en {@code catastro} que no existe. Se aceptan para no romper la pantalla y no
 * filtran nada, igual que {@code autoManual} en {@code AltasBajasController}. {@code contribuyente}
 * si es obligatorio: sin el no hay que listar.
 *
 * <p>El autovaluo que menciona el contrato tampoco viaja: depende de la determinacion predial (#30,
 * #188), bloqueada por D-02a.
 */
@RestController
@RequestMapping(Api.RAIZ + "/consultas/predios")
@RequiereAcceso(acceso = "consulta_predios", privilegio = Privilegio.LECTURA)
public class ConsultaPrediosController {

    private static final String ORDEN_POR_OMISION = "codigoReferenciaCatastral";

    private final PrediosDelContribuyente predios;
    private final ConsultaDeDeudaPublica deuda;
    // Solo para contribuyentePorCodigo: vive en TransferenciaRepository por el mismo motivo que en
    // AsientoRepository, y no hace falta un repositorio nuevo para el mismo cruce por SQL.
    private final TransferenciaRepository contribuyentes;
    private final Clock reloj;

    public ConsultaPrediosController(
            PrediosDelContribuyente predios,
            ConsultaDeDeudaPublica deuda,
            TransferenciaRepository contribuyentes,
            Clock reloj) {
        this.predios = predios;
        this.deuda = deuda;
        this.contribuyentes = contribuyentes;
        this.reloj = reloj;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public RespuestaPaginada<PredioEncontradoResource> buscar(
            @RequestParam String contribuyente,
            @RequestParam(required = false) @Nullable String codigoPredial,
            @RequestParam(required = false) @Nullable String calle,
            @RequestParam(required = false) @Nullable String manzana,
            @RequestParam(required = false) @Nullable String lote,
            @RequestParam(required = false) @Nullable String fecha,
            ParametrosDePaginacion parametros) {

        Paginacion paginacion = parametros.aPaginacion(ORDEN_POR_OMISION);
        Optional<Long> contribuyenteId =
                contribuyentes.contribuyentePorCodigo(
                        contribuyente.strip().toUpperCase(Locale.ROOT));
        if (contribuyenteId.isEmpty()) {
            return RespuestaPaginada.de(Pagina.vacia(paginacion));
        }

        LocalDate fechaDeCorte = fechaDe(fecha);
        List<PredioDelContribuyente> todos =
                new ArrayList<>(predios.de(contribuyenteId.get(), fechaDeCorte));
        todos.sort(Comparator.comparing(PredioDelContribuyente::codigoReferenciaCatastral));

        List<ObligacionPublica> obligaciones =
                deuda.deTodoElContribuyente(contribuyenteId.get(), fechaDeCorte);

        int desde = Math.min(paginacion.desplazamiento(), todos.size());
        int hasta = Math.min(desde + paginacion.tamano(), todos.size());

        List<PredioEncontradoResource> contenido = new ArrayList<>();
        for (PredioDelContribuyente predio : todos.subList(desde, hasta)) {
            contenido.add(
                    PredioEncontradoResource.de(
                            predio, deudaDe(predio.predioId(), obligaciones, fechaDeCorte)));
        }

        return RespuestaPaginada.de(Pagina.de(contenido, paginacion, todos.size()));
    }

    /**
     * La deuda de un predio es la suma de sus obligaciones: un predio puede tener el predial de mas
     * de un ejercicio a la vez. Las obligaciones comparten la misma fecha de corte —vienen de una
     * sola llamada a {@link ConsultaDeDeudaPublica#deTodoElContribuyente}—, asi que sumarlas no
     * mezcla cifras de fechas distintas.
     */
    private static ImporteActualizado deudaDe(
            long predioId, List<ObligacionPublica> obligaciones, LocalDate fecha) {
        Dinero total = Dinero.CERO;
        for (ObligacionPublica obligacion : obligaciones) {
            Long delPredio = obligacion.predioId();
            if (delPredio != null && delPredio == predioId) {
                total = total.mas(obligacion.total());
            }
        }
        return new ImporteActualizado(total, fecha);
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
