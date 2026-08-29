package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.ConsultaDeProgramas;
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeProgramas;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.FiltroDeLaConsulta;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Programación de fiscalización: {@code GET} y {@code POST /api/v1/fiscalizacion/programas}
 * (RF-050, #45 y #431).
 *
 * <p>Reprogramar es registrar otro programa: no hay ruta de edición. El cuerpo es una <b>lista
 * blanca</b>, mismo patrón que {@code TransferenciaPredioController}.
 *
 * <p><b>{@code tipo} también viaja por la consulta</b> (#425). Es el filtro «Tipo» que la pantalla
 * dibuja y el contrato lo declara {@code in: query}; leerlo solo del cuerpo dejaba la operación
 * publicada y sin ninguna pantalla que pudiera llamarla —el 422 diría «Falta el campo 'tipo'»
 * mientras la pantalla lo estaba mandando—. Se sigue aceptando en el cuerpo, y ahí gana: ver {@link
 * FiltroDeLaConsulta}.
 *
 * <p><b>La lectura llegó después que la escritura</b> (#431), y hasta entonces un programa se podía
 * registrar y no se podía volver a encontrar: la pantalla {@code fisc_programa} declaraba el {@code
 * POST} como su único endpoint y las dos actas —que exigen el {@code programaId} de un programa ya
 * generado— no tenían ninguna fila real de la que sacarlo. Los dos verbos comparten ruta y opción
 * del catálogo, y el privilegio no: leer pide {@link Privilegio#LECTURA} y programar {@link
 * Privilegio#REGISTRO}, declarado en cada método —la anotación del método gana sobre la de la
 * clase—.
 */
@RestController
@RequestMapping(Api.RAIZ + "/fiscalizacion/programas")
@RequiereAcceso(acceso = "fisc_programa", privilegio = Privilegio.REGISTRO)
public class ProgramasController {

    /** El orden por omisión de la grilla: el «Nº de programa», que es como se buscan. */
    private static final String ORDEN_POR_OMISION = "codigo";

    private final RegistrarPrograma programas;
    private final ConsultaDeProgramas consulta;

    public ProgramasController(RegistrarPrograma programas, ConsultaDeProgramas consulta) {
        this.programas = programas;
        this.consulta = consulta;
    }

    /**
     * La grilla de programas (RF-050, #431).
     *
     * <p>Los dos filtros viajan <b>por la consulta</b> y no por el cuerpo: una búsqueda que no cabe
     * en la URL no se puede compartir ni recargar, y es lo que #399 dejó escrito. Los otros dos
     * desplegables de la pantalla —«Tipo» y «Estado»— no se declaran, y el motivo está en {@link
     * CriterioDeProgramas}: hablan un vocabulario que este dominio no tiene.
     */
    @GetMapping
    @RequiereAcceso(acceso = "fisc_programa", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<ProgramaResource> programas(
            @RequestParam(required = false) @Nullable String nDePrograma,
            @RequestParam(required = false) @Nullable String ejercicio,
            ParametrosDePaginacion paginacion) {

        return RespuestaPaginada.de(
                consulta.buscar(
                        new CriterioDeProgramas(
                                vacioAnulo(nDePrograma), ejercicioOpcional(ejercicio)),
                        paginacion.aPaginacion(ORDEN_POR_OMISION)),
                ProgramaResource::de);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProgramaResource programar(
            @RequestParam(required = false) @Nullable String tipo,
            @RequestBody PeticionDePrograma peticion) {
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            return ProgramaResource.de(
                    programas.registrar(
                            exigir(peticion.codigo(), "codigo"),
                            exigir(peticion.descripcion(), "descripcion"),
                            tipoDe(FiltroDeLaConsulta.primeroNoVacio(peticion.tipo(), tipo)),
                            fechaDe(peticion.fechaInicio(), "fechaInicio"),
                            fechaOpcionalDe(peticion.fechaFin()),
                            observacion));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static @Nullable Integer ejercicioOpcional(@Nullable String texto) {
        String valor = vacioAnulo(texto);
        if (valor == null) {
            return null;
        }
        try {
            return Integer.valueOf(valor);
        } catch (NumberFormatException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El ejercicio va en cuatro digitos: '" + texto + "'");
        }
    }

    private static @Nullable String vacioAnulo(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }

    private static TipoDePrograma tipoDe(@Nullable String texto) {
        try {
            return TipoDePrograma.valueOf(exigir(texto, "tipo").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Tipo de programa desconocido: '" + texto + "'");
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

    private static LocalDate fechaDe(@Nullable String texto, String campo) {
        try {
            return LocalDate.parse(exigir(texto, campo).strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static @Nullable LocalDate fechaOpcionalDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return fechaDe(texto, "fechaFin");
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /** El cuerpo de una programación. <b>Lista blanca</b>: lo que no está aquí no entra. */
    public record PeticionDePrograma(
            @Nullable String observacion,
            @Nullable String codigo,
            @Nullable String descripcion,
            @Nullable String tipo,
            @Nullable String fechaInicio,
            @Nullable String fechaFin) {}
}
