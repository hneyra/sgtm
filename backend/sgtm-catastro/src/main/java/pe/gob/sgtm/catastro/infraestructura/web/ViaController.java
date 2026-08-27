package pe.gob.sgtm.catastro.infraestructura.web;

import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.autorizacion.ComprobadorDeAcceso;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ConsultaDeVias;
import pe.gob.sgtm.catastro.aplicacion.RegistrarVia;
import pe.gob.sgtm.catastro.dominio.TipoVia;
import pe.gob.sgtm.catastro.dominio.Via;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Catalogo vial: {@code GET/POST /api/v1/catastro/vias} y {@code PUT
 * /api/v1/catastro/vias/{codigo}}.
 *
 * <p>Es la opcion {@code calles} del contrato —«Mantenimiento de vias y calles» (RF-008)—. Nacio
 * como el primer endpoint del sistema, solo lectura; con #290 gana su lado de escritura: el alta y
 * la edicion que el manual pide en su pantalla de mantenimiento.
 *
 * <p><b>Declara su acceso</b>: {@code calles} es el id de esta opcion en el catalogo de pantallas
 * (NEG-03), el mismo que la siembra pone en la tabla {@code acceso}. Una regla de ArchUnit rompe el
 * build si un endpoint no lo declara, y el guardia niega si no lo encuentra. La lectura exige
 * {@code LECTURA} (de la clase); el alta, {@code REGISTRO}; la edicion y la baja logica, {@code
 * MODIFICACION}. Un solo camino de escritura para editar y para dar de baja, igual que {@code POST
 * /seguridad/grupos/{grupo}/miembros}: la baja <b>no es un borrado</b> (RNF-051), es la misma fila
 * con {@code activa = false}.
 *
 * <p><b>Y la baja exige ademas {@code ELIMINACION}</b>, comprobado aqui dentro. La anotacion
 * declara lo que exige la <i>ruta</i>, y la ruta es una sola para editar y para retirar del
 * catalogo; cual de las dos es depende del cuerpo, que el guardia no lee. El privilegio {@code
 * ELIMINACION} del manual «gobierna la baja —desactivar—, no un {@code DELETE}» (ver {@link
 * Privilegio}), asi que dejar la baja solo bajo {@code MODIFICACION} lo volveria un privilegio que
 * no gobierna nada. La comprobacion usa el mismo puerto que el guardia —{@link
 * ComprobadorDeAcceso}, con el usuario de {@link OrigenContext} y la fecha del reloj inyectado— y
 * lanza el mismo {@code ProblemaDeNegocio} con {@code SIN_PRIVILEGIO}, de modo que quien no la
 * tiene recibe el 403 de siempre y no distingue este camino del otro.
 *
 * <p><b>La lectura pasa por {@link ConsultaDeVias}</b>, no por el repositorio directamente: es esa
 * capa la que lleva el {@code @Transactional(readOnly = true)} donde se fija el tenant. Sin ella la
 * consulta corre sin {@code SET LOCAL} y la politica RLS de {@code via} falla. La escritura pasa
 * por {@link RegistrarVia}, que lleva su {@code @Transactional} y asienta la auditoria en la misma
 * transaccion.
 *
 * <p><b>La observacion del usuario es obligatoria en toda escritura</b> (regla 10, RNF-052): viaja
 * en el cuerpo y se convierte en {@link Observacion} antes de tocar el caso de uso; si viene vacia,
 * la peticion es 422 y no se guarda nada.
 *
 * <p><b>Ningun metodo recibe la municipalidad</b>, ni como parametro ni como encabezado ni en el
 * cuerpo: sale del token (ADR-0005, regla 2) y hay una regla de ArchUnit que rechaza el build si
 * alguien la anade «por comodidad».
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/vias")
@RequiereAcceso(acceso = ViaController.ACCESO, privilegio = Privilegio.LECTURA)
public class ViaController {

    /** Id de esta opcion en el catalogo de pantallas (NEG-03) y en la tabla {@code acceso}. */
    static final String ACCESO = "calles";

    /** Por codigo: es el orden con el que se lee un catalogo vial en pantalla. */
    private static final String ORDEN_POR_OMISION = "codigo";

    private final ConsultaDeVias consulta;
    private final RegistrarVia registrarVia;
    private final ComprobadorDeAcceso comprobador;
    private final Clock reloj;

    public ViaController(
            ConsultaDeVias consulta,
            RegistrarVia registrarVia,
            ComprobadorDeAcceso comprobador,
            Clock reloj) {
        this.consulta = consulta;
        this.registrarVia = registrarVia;
        this.comprobador = comprobador;
        this.reloj = reloj;
    }

    @GetMapping
    public RespuestaPaginada<ViaResource> listar(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                consulta.listar(paginacion.aPaginacion(ORDEN_POR_OMISION)), ViaResource::de);
    }

    /**
     * Alta de una via del catalogo vial (RF-008).
     *
     * <p>{@code codigo}, {@code tipo} y {@code nombre} son obligatorios: no hay via anterior de la
     * que heredarlos. {@code ubigeo} es opcional.
     *
     * <p>Un codigo que ya existe sale como {@code 409} y no como incidencia: la unicidad la exige
     * la base —es la unica que puede—, pero su mensaje nombra la tabla y la restriccion, asi que se
     * traduce aqui. Lo que el cliente recibe dice que el codigo esta tomado y nada mas.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = ACCESO, privilegio = Privilegio.REGISTRO)
    public ViaResource registrar(@RequestBody PeticionDeVia peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        String codigo = exigir(peticion.codigo(), "codigo");
        Via nueva =
                Via.nueva(
                        codigo,
                        tipoDe(peticion.tipo()),
                        exigir(peticion.nombre(), "nombre"),
                        vacioANulo(peticion.ubigeo()));
        try {
            return ViaResource.de(registrarVia.registrar(nueva, observacion));
        } catch (DuplicateKeyException repetido) {
            // Ni tabla, ni restriccion, ni SQL: solo el dato que el usuario escribio.
            throw new ProblemaDeNegocio(
                    CodigoDeError.CONFLICTO,
                    "Ya existe una via con el codigo '" + codigo + "' en esta municipalidad");
        }
    }

    /**
     * Edicion de una via ya existente, o su baja logica.
     *
     * <p><b>Lo que no viene, no cambia.</b> Todo campo ausente —{@code null}— conserva el valor que
     * la via ya tiene: {@code tipo}, {@code nombre}, {@code ubigeo} y {@code activa}. Es la unica
     * regla que se puede escribir sin sorpresas en un PUT parcial; la anterior —obligatorios el
     * tipo y el nombre, y un {@code ubigeo} ausente borrando el guardado— hacia que editar solo el
     * nombre perdiera el ubigeo sin que nadie lo pidiera. Para <b>borrar</b> el ubigeo se manda la
     * cadena vacia, que es una instruccion y no una omision.
     *
     * <p>La {@code observacion} sigue siendo obligatoria (regla 10, RNF-052): sin ella, 422.
     *
     * <p>El {@code codigo} de la ruta identifica la via y <b>no se cambia</b> por esta operacion:
     * el {@code codigo} del cuerpo, si viene, se ignora. {@code activa = false} es la baja, y exige
     * ademas el privilegio {@code ELIMINACION} —ver el javadoc de la clase—.
     */
    @PutMapping("/{codigo}")
    @RequiereAcceso(acceso = ACCESO, privilegio = Privilegio.MODIFICACION)
    public ViaResource modificar(@PathVariable String codigo, @RequestBody PeticionDeVia peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        Via existente =
                consulta.buscarPorCodigo(codigo)
                        .orElseThrow(
                                () ->
                                        new ProblemaDeNegocio(
                                                CodigoDeError.NO_ENCONTRADO,
                                                "No hay ninguna via con codigo '"
                                                        + codigo
                                                        + "' en esta municipalidad"));
        Via cambiada =
                new Via(
                        existente.id(),
                        existente.codigo(),
                        peticion.tipo() == null ? existente.tipo() : tipoDe(peticion.tipo()),
                        peticion.nombre() == null
                                ? existente.nombre()
                                : exigir(peticion.nombre(), "nombre"),
                        peticion.ubigeo() == null
                                ? existente.ubigeo()
                                : vacioANulo(peticion.ubigeo()),
                        peticion.activa() == null ? existente.activa() : peticion.activa());

        if (existente.activa() && !cambiada.activa()) {
            exigirPrivilegioDeBaja();
        }
        return ViaResource.de(registrarVia.editar(existente, cambiada, observacion));
    }

    // ------------------------------------------------------------------

    /**
     * Retirar una via del catalogo exige {@code ELIMINACION}, y se pregunta por el mismo puerto que
     * usa el guardia.
     *
     * <p>No se toca {@link pe.gob.sgtm.autorizacion.GuardiaDeAcceso}: la anotacion no puede
     * expresar «segun lo que traiga el cuerpo» y el interceptor corre antes de que el cuerpo se
     * lea. Lo que si se conserva es la respuesta: el mismo {@code CodigoDeError.SIN_PRIVILEGIO} y
     * un mensaje de la misma forma, para que negar por esta via no se distinga de negar por aquella
     * —y no revele, de paso, que la peticion llego a interpretarse—.
     */
    private void exigirPrivilegioDeBaja() {
        String usuario = OrigenContext.actual().usuario();
        if (!comprobador.autoriza(usuario, ACCESO, Privilegio.ELIMINACION, LocalDate.now(reloj))) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.SIN_PRIVILEGIO,
                    "No tiene el privilegio " + Privilegio.ELIMINACION + " sobre " + ACCESO);
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

    private static TipoVia tipoDe(@Nullable String texto) {
        String limpio = exigir(texto, "tipo");
        String normalizado =
                Normalizer.normalize(limpio, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .toUpperCase(Locale.ROOT);
        try {
            return TipoVia.valueOf(normalizado);
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Tipo de via desconocido: '" + texto + "'");
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static @Nullable String vacioANulo(@Nullable String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo de un alta o una edicion de via. <b>Lista blanca</b>: lo que no esta aqui no entra,
     * aunque llegue en el JSON. {@code sector}, {@code zonaDeArancel} y las cuadras que dibuja el
     * prototipo no estan porque {@code ViaResource} todavia no los publica (Track 2 de #290).
     */
    public record PeticionDeVia(
            @Nullable String observacion,
            @Nullable String codigo,
            @Nullable String tipo,
            @Nullable String nombre,
            @Nullable String ubigeo,
            @Nullable Boolean activa) {}
}
