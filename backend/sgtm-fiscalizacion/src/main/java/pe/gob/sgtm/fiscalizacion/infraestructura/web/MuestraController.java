package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.ConsultaDeMuestra;
import pe.gob.sgtm.fiscalizacion.aplicacion.GenerarMuestra;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelPrograma;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * La muestra de un programa: {@code GET} y {@code POST
 * /api/v1/fiscalizacion/programas/{id}/muestra} (#481, AC 2 de #431).
 *
 * <p><b>Es la pieza que le faltaba a las dos mitades del AC 2 a la vez.</b> La lectura es la grilla
 * «Predios seleccionados» de {@code fisc_programa}, y es también de donde {@code fisc_predial} —que
 * no declara ni filtros ni tabla, y dibuja sus tres identificadores de solo lectura— resuelve su
 * fila: sin ella no hay dónde buscarlos, y con ella salen los tres de golpe.
 *
 * <p><b>El privilegio se declara en cada método</b> y no sólo en la clase, que es la lección de
 * #431: leer la muestra pide {@link Privilegio#LECTURA} y sortearla {@link Privilegio#REGISTRO}, y
 * con una sola anotación de clase quien tuviera únicamente lectura sobre {@code fisc_programa} no
 * podría abrir su pantalla — sin que nada lo dijera hasta integrar.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion/programas")
@RequiereAcceso(acceso = "fisc_programa", privilegio = Privilegio.REGISTRO)
public class MuestraController {

    /** El orden por omisión: el código del predio, que es como se lee la grilla. */
    private static final String ORDEN_POR_OMISION = "codRefCatastral";

    private final GenerarMuestra sorteo;
    private final ConsultaDeMuestra muestra;
    private final DirectorioDeContribuyentes contribuyentes;

    public MuestraController(
            GenerarMuestra sorteo,
            ConsultaDeMuestra muestra,
            DirectorioDeContribuyentes contribuyentes) {
        this.sorteo = sorteo;
        this.muestra = muestra;
        this.contribuyentes = contribuyentes;
    }

    /**
     * La muestra sorteada de un programa.
     *
     * <p>{@code predio} viaja <b>por la consulta</b> y no por el cuerpo (#425): es como el acta
     * pide su propia fila, y una búsqueda que no cabe en la URL no se puede compartir ni recargar.
     */
    @GetMapping("/{id}/muestra")
    @RequiereAcceso(acceso = "fisc_programa", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<MuestraResource> muestra(
            @PathVariable long id,
            @RequestParam(required = false) @Nullable String predio,
            ParametrosDePaginacion paginacion) {

        ConsultaDeMuestra.Resultado resultado =
                muestra.buscar(
                        id, predioOpcional(predio), paginacion.aPaginacion(ORDEN_POR_OMISION));

        Map<Long, ResumenDeContribuyente> padron = padronDe(resultado.pagina());
        return RespuestaPaginada.de(
                resultado.pagina(),
                fila ->
                        MuestraResource.de(
                                fila,
                                codigoDe(padron, fila.contribuyenteId()),
                                nombreDe(padron, fila.contribuyenteId()),
                                resultado.visitado(fila)));
    }

    /**
     * Sortea la muestra: el acto que dispara la acción «Generar muestra» de la pantalla.
     *
     * <p>Responde <b>409</b> si el programa ya la sorteó. Una muestra es un acto y no se regenera:
     * hay actas levantadas sobre ella, y volver a sortear cambiaría la foto bajo sus pies. Para
     * otra muestra, otro programa.
     */
    @PostMapping("/{id}/muestra")
    @ResponseStatus(HttpStatus.CREATED)
    public MuestraSorteadaResource generar(
            @PathVariable long id, @RequestBody PeticionDeMuestra peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            return new MuestraSorteadaResource(id, sorteo.generar(id, observacion));
        } catch (GenerarMuestra.ProgramaInexistente inexistente) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(inexistente));
        } catch (GenerarMuestra.MuestraYaSorteada repetida) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(repetida));
        } catch (GenerarMuestra.ProgramaSinParametros incompleto) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(incompleto));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static @Nullable Long predioOpcional(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(texto.strip());
        } catch (NumberFormatException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El predio de la muestra es un identificador: '" + texto + "'");
        }
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

    /** Una sola lectura del padrón por página, no una por fila. */
    private Map<Long, ResumenDeContribuyente> padronDe(Pagina<MuestraDelPrograma> pagina) {
        Set<Long> ids = new HashSet<>();
        for (MuestraDelPrograma fila : pagina.contenido()) {
            ids.add(fila.contribuyenteId());
        }
        return ids.isEmpty() ? Map.of() : contribuyentes.porIds(ids);
    }

    // Sin fila en el padron se cae al identificador en vez de ocultar el predio: uno cuyo titular
    // se dio de baja es justamente el que hay que revisar. Mismo criterio que OmisosController.
    private static String codigoDe(Map<Long, ResumenDeContribuyente> padron, long contribuyenteId) {
        ResumenDeContribuyente enElMapa = padron.get(contribuyenteId);
        return enElMapa == null ? String.valueOf(contribuyenteId) : enElMapa.codigo();
    }

    private static String nombreDe(Map<Long, ResumenDeContribuyente> padron, long contribuyenteId) {
        ResumenDeContribuyente enElMapa = padron.get(contribuyenteId);
        return enElMapa == null ? String.valueOf(contribuyenteId) : enElMapa.nombre();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo del sorteo. <b>Sólo la observación</b>: a quién se fiscaliza lo deciden los
     * parámetros del programa, no esta petición — si viajaran aquí, la muestra dejaría de ser del
     * programa y dos sorteos del mismo podrían dar cosas distintas.
     */
    public record PeticionDeMuestra(@Nullable String observacion) {}

    /** Lo que el sorteo devuelve: sobre cuántos predios va a actuar el programa. */
    public record MuestraSorteadaResource(long programaId, int predios) {}
}
