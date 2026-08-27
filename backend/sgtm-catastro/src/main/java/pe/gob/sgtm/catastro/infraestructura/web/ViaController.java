package pe.gob.sgtm.catastro.infraestructura.web;

import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
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
@RequiereAcceso(acceso = "calles", privilegio = Privilegio.LECTURA)
public class ViaController {

    /** Por codigo: es el orden con el que se lee un catalogo vial en pantalla. */
    private static final String ORDEN_POR_OMISION = "codigo";

    private final ConsultaDeVias consulta;
    private final RegistrarVia registrarVia;

    public ViaController(ConsultaDeVias consulta, RegistrarVia registrarVia) {
        this.consulta = consulta;
        this.registrarVia = registrarVia;
    }

    @GetMapping
    public RespuestaPaginada<ViaResource> listar(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                consulta.listar(paginacion.aPaginacion(ORDEN_POR_OMISION)), ViaResource::de);
    }

    /** Alta de una via del catalogo vial (RF-008). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "calles", privilegio = Privilegio.REGISTRO)
    public ViaResource registrar(@RequestBody PeticionDeVia peticion) {
        Observacion observacion = observacionDe(peticion.observacion());
        Via nueva =
                Via.nueva(
                        exigir(peticion.codigo(), "codigo"),
                        tipoDe(peticion.tipo()),
                        exigir(peticion.nombre(), "nombre"),
                        vacioANulo(peticion.ubigeo()));
        return ViaResource.de(registrarVia.registrar(nueva, observacion));
    }

    /**
     * Edicion de una via ya existente, o su baja logica.
     *
     * <p>El {@code codigo} de la ruta identifica la via y <b>no se cambia</b> por esta operacion:
     * el {@code codigo} del cuerpo, si viene, se ignora. {@code activa = false} es la baja; sin
     * {@code activa} en el cuerpo, la via conserva el estado que tenia.
     */
    @PutMapping("/{codigo}")
    @RequiereAcceso(acceso = "calles", privilegio = Privilegio.MODIFICACION)
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
                        tipoDe(peticion.tipo()),
                        exigir(peticion.nombre(), "nombre"),
                        vacioANulo(peticion.ubigeo()),
                        peticion.activa() == null ? existente.activa() : peticion.activa());
        return ViaResource.de(registrarVia.registrar(cambiada, observacion));
    }

    // ------------------------------------------------------------------

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
                java.text.Normalizer.normalize(limpio, java.text.Normalizer.Form.NFD)
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
