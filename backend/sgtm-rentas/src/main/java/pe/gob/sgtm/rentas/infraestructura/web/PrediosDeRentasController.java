package pe.gob.sgtm.rentas.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
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
import pe.gob.sgtm.catastro.CaracteristicasDelPredio;
import pe.gob.sgtm.catastro.LectorDeCaracteristicas;
import pe.gob.sgtm.catastro.PredioDelContribuyente;
import pe.gob.sgtm.catastro.PrediosDelContribuyente;
import pe.gob.sgtm.catastro.TitularDelPredio;
import pe.gob.sgtm.catastro.TitularesDelPredio;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * {@code predios_rentas}: {@code GET /api/v1/rentas/predios} (#395).
 *
 * <p>El padron predial visto desde rentas: los predios de un contribuyente con lo que hace falta
 * para elegir uno y determinarlo —su identificador interno, su codigo, donde esta, para que se usa,
 * que parte es suya y en que condicion—.
 *
 * <p><b>No es una segunda copia de {@code consulta_predios}.</b> Aquella (#25) responde «cuanto
 * debe cada predio» y por eso trae la deuda; esta responde «que predios entran en la base» y por
 * eso trae el uso, el sector, el area y la condicion de la titularidad, que es lo que la pantalla
 * de Rentas · Registro dibuja. Las dos leen los mismos puertos de catastro, ninguna copia sus
 * tablas.
 *
 * <p>Los cuatro filtros que la pantalla dibuja se resuelven de verdad y en memoria, sobre la lista
 * del contribuyente: {@code codigoPredial} por prefijo del codigo de referencia catastral, {@code
 * sector} y {@code condicion} por igualdad sin distinguir mayusculas. No se aceptan filtros que no
 * filtren —el criterio de {@code AltasBajasController} sirve cuando la busqueda no existe; aqui la
 * lista ya esta en memoria y no filtrar seria una respuesta equivocada, no una incompleta—.
 *
 * <p>{@code contribuyente} y {@code codContribuyente} son el mismo filtro con dos nombres: el
 * contrato declara los dos porque el prototipo dibuja «Cod. Contribuyente» y el resto de las
 * lecturas usa {@code contribuyente}. Sin ninguno de los dos no hay a quien listar y se responde
 * una pagina vacia, como {@code ConsultaPrediosController}: un padron entero no es la respuesta a
 * una pregunta que no se hizo.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/predios")
@RequiereAcceso(acceso = "predios_rentas", privilegio = Privilegio.LECTURA)
public class PrediosDeRentasController {

    private static final String ORDEN_POR_OMISION = "codigoReferenciaCatastral";

    private final PrediosDelContribuyente predios;
    private final LectorDeCaracteristicas caracteristicas;
    private final TitularesDelPredio titulares;
    private final DirectorioDeContribuyentes directorio;
    private final Clock reloj;

    public PrediosDeRentasController(
            PrediosDelContribuyente predios,
            LectorDeCaracteristicas caracteristicas,
            TitularesDelPredio titulares,
            DirectorioDeContribuyentes directorio,
            Clock reloj) {
        this.predios = predios;
        this.caracteristicas = caracteristicas;
        this.titulares = titulares;
        this.directorio = directorio;
        this.reloj = reloj;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public RespuestaPaginada<PredioDeRentasResource> listar(
            @RequestParam(required = false) @Nullable String contribuyente,
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String codigoPredial,
            @RequestParam(required = false) @Nullable String sector,
            @RequestParam(required = false) @Nullable String condicion,
            ParametrosDePaginacion parametros) {

        Paginacion paginacion = parametros.aPaginacion(ORDEN_POR_OMISION);
        String codigo = primeroNoVacio(codContribuyente, contribuyente);
        if (codigo == null) {
            return RespuestaPaginada.de(Pagina.vacia(paginacion));
        }
        Optional<ResumenDeContribuyente> encontrado =
                directorio.porCodigo(codigo.toUpperCase(Locale.ROOT));
        if (encontrado.isEmpty()) {
            return RespuestaPaginada.de(Pagina.vacia(paginacion));
        }

        // La fecha de corte sale del reloj inyectado y no de la peticion: el contrato de esta
        // operacion no declara ninguna —la pantalla no dibuja un campo de fecha— y aceptar un
        // parametro que ningun cliente sabe mandar seria publicar una entrada invisible (#312).
        LocalDate fechaDeCorte = LocalDate.now(reloj);
        long contribuyenteId = encontrado.get().id();
        List<PredioDelContribuyente> suyos =
                new ArrayList<>(predios.de(contribuyenteId, fechaDeCorte));
        suyos.sort(Comparator.comparing(PredioDelContribuyente::codigoReferenciaCatastral));

        List<PredioDeRentasResource> todos = new ArrayList<>();
        for (PredioDelContribuyente predio : suyos) {
            CaracteristicasDelPredio rasgos =
                    caracteristicas.de(predio.predioId(), fechaDeCorte).orElse(null);
            PredioDeRentasResource fila =
                    PredioDeRentasResource.de(
                            predio,
                            rasgos,
                            condicionDe(predio.predioId(), contribuyenteId, fechaDeCorte));
            if (pasa(fila, codigoPredial, sector, condicion)) {
                todos.add(fila);
            }
        }

        int desde = Math.min(paginacion.desplazamiento(), todos.size());
        int hasta = Math.min(desde + paginacion.tamano(), todos.size());
        return RespuestaPaginada.de(
                Pagina.de(List.copyOf(todos.subList(desde, hasta)), paginacion, todos.size()));
    }

    /**
     * En que condicion tiene este contribuyente ese predio, a la fecha: la de <b>su</b> cuota de
     * titularidad, no la del primer titular que aparezca. Un predio con tres copropietarios tiene
     * tres condiciones, y la que se dibuja en su fila es la suya.
     */
    private @Nullable String condicionDe(long predioId, long contribuyenteId, LocalDate fecha) {
        for (TitularDelPredio titular : titulares.de(predioId, fecha)) {
            if (titular.contribuyenteId() == contribuyenteId) {
                return titular.condicion();
            }
        }
        return null;
    }

    private static boolean pasa(
            PredioDeRentasResource fila,
            @Nullable String codigoPredial,
            @Nullable String sector,
            @Nullable String condicion) {
        String prefijo = filtro(codigoPredial);
        if (prefijo != null && !fila.codigoReferenciaCatastral().startsWith(prefijo)) {
            return false;
        }
        String elSector = filtro(sector);
        if (elSector != null && !elSector.equalsIgnoreCase(fila.sector())) {
            return false;
        }
        String laCondicion = filtro(condicion);
        return laCondicion == null || laCondicion.equalsIgnoreCase(fila.condicion());
    }

    private static @Nullable String filtro(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }

    private static @Nullable String primeroNoVacio(@Nullable String uno, @Nullable String otro) {
        String primero = filtro(uno);
        return primero != null ? primero : filtro(otro);
    }
}
