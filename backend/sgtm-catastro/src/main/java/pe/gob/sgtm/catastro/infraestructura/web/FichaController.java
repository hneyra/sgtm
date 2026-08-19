package pe.gob.sgtm.catastro.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ActualizarFichaCatastral;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Las cuatro fichas del manual, por codigo de referencia catastral (RF-001 a RF-004).
 *
 * <p>Un controlador y no cuatro, porque la pregunta es la misma —«dame la ficha de este predio»— y
 * lo unico que cambia es el tipo. Lo que si cambia por metodo es el {@code acceso}: cada una es una
 * opcion distinta del menu, con sus propios permisos.
 *
 * <p><b>Las rutas nombran el parametro de tres maneras</b> —{@code codRefCatastral}, {@code
 * codEdificacion}, {@code codUnidad}— y las tres reciben lo mismo: el codigo de referencia
 * catastral. La edificacion en propiedad exclusiva y comun y la unidad catastral rural son predios
 * del padron, con su propio codigo; no hacen falta dos numeraciones mas. Los nombres se respetan
 * porque son los del contrato, y el contrato salio de las pantallas del prototipo.
 *
 * <p>Se entra por el <b>codigo de referencia catastral</b>, no por el identificador interno del
 * predio: es lo que el tecnico tiene delante y lo que el contrato declara en la ruta.
 *
 * <p><b>Acepta una fecha.</b> Sin ella devuelve la ficha que rige hoy; con ella, la que regia
 * entonces. Es lo que permite responder «como estaba este predio cuando se emitio el valor de
 * 2027», que es exactamente la pregunta de una reclamacion. La respuesta lleva siempre la version y
 * su vigencia, para que ninguna cifra salga sin decir de cuando es (regla 9).
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/fichas")
@RequiereAcceso(acceso = "ficha_urbana", privilegio = Privilegio.LECTURA)
public class FichaController {

    private final ActualizarFichaCatastral fichas;
    private final CatastroRepository catastro;
    private final Clock reloj;

    public FichaController(
            ActualizarFichaCatastral fichas, CatastroRepository catastro, Clock reloj) {
        this.fichas = fichas;
        this.catastro = catastro;
        this.reloj = reloj;
    }

    @GetMapping("/urbana/{codRefCatastral}")
    public FichaResource urbana(
            @PathVariable String codRefCatastral,
            @RequestParam(required = false) @Nullable String fecha) {
        return leer(codRefCatastral, TipoFicha.UNICA, fecha, "urbana");
    }

    @GetMapping("/economica/{codRefCatastral}")
    @RequiereAcceso(acceso = "ficha_economica", privilegio = Privilegio.LECTURA)
    public FichaResource economica(
            @PathVariable String codRefCatastral,
            @RequestParam(required = false) @Nullable String fecha) {
        return leer(codRefCatastral, TipoFicha.ECONOMICA, fecha, "economica");
    }

    @GetMapping("/bienes-comunes/{codEdificacion}")
    @RequiereAcceso(acceso = "ficha_bienes", privilegio = Privilegio.LECTURA)
    public FichaResource bienesComunes(
            @PathVariable String codEdificacion,
            @RequestParam(required = false) @Nullable String fecha) {
        return leer(codEdificacion, TipoFicha.BIENES_COMUNES, fecha, "de bienes comunes");
    }

    @GetMapping("/rural/{codUnidad}")
    @RequiereAcceso(acceso = "ficha_rural", privilegio = Privilegio.LECTURA)
    public FichaResource rural(
            @PathVariable String codUnidad,
            @RequestParam(required = false) @Nullable String fecha) {
        return leer(codUnidad, TipoFicha.RURAL, fecha, "rural");
    }

    /**
     * Un solo camino para los cuatro tipos.
     *
     * <p>Que la fecha se resuelva aqui y no en cada metodo es lo que impide que uno de los cuatro
     * acabe respondiendo «la ultima» en vez de «la vigente a la fecha». Es el mismo defecto que ya
     * aparecio en el domicilio del contribuyente, y se corrige una vez.
     */
    private FichaResource leer(
            String codigo, TipoFicha tipo, @Nullable String fecha, String comoSeLlama) {

        Predio predio = predioDe(codigo);
        LocalDate cuando = fecha == null || fecha.isBlank() ? LocalDate.now(reloj) : parsear(fecha);

        long predioId = java.util.Objects.requireNonNull(predio.id(), "El predio leido tiene id");
        Optional<FichaCatastral> ficha = fichas.vigenteA(predioId, tipo, cuando);

        return ficha.map(FichaResource::de)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "El predio no tiene ficha "
                                                + comoSeLlama
                                                + " vigente al "
                                                + cuando));
    }

    private Predio predioDe(String codigo) {
        CodigoReferenciaCatastral referencia;
        try {
            referencia = CodigoReferenciaCatastral.de(codigo);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
        return catastro.predioPorCodigo(referencia)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun predio con ese codigo de referencia"
                                                + " catastral"));
    }

    private static LocalDate parsear(String fecha) {
        try {
            return LocalDate.parse(fecha);
        } catch (java.time.format.DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + fecha + "'");
        }
    }

    /**
     * El mensaje de una excepcion es {@code @Nullable} para el verificador. Aqui nunca lo es —los
     * objetos de valor siempre explican por que rechazan—, pero decirlo con un texto de reserva
     * cuesta menos que discutirlo.
     */
    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }
}
