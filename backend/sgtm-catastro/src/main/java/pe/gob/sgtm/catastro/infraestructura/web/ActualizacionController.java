package pe.gob.sgtm.catastro.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ActualizarFichaCatastral;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Actualizacion del catastro, para los cuatro tipos de ficha:
 *
 * <ul>
 *   <li>{@code PUT /api/v1/catastro/fichas/{codigo}/actualizacion} — la urbana (RF-001)
 *   <li>{@code PUT /api/v1/catastro/fichas/economica/{codRefCatastral}/actualizacion} (RF-002)
 *   <li>{@code PUT /api/v1/catastro/fichas/bienes-comunes/{codEdificacion}/actualizacion} (RF-003)
 *   <li>{@code PUT /api/v1/catastro/fichas/rural/{codUnidad}/actualizacion} (RF-004)
 * </ul>
 *
 * <p><b>La urbana conserva su ruta sin el tramo del tipo</b>, y no es una asimetria que convenga
 * arreglar: {@code actualizacion_catastro} es la opcion de Procesos del manual y su {@code
 * endpoint} salio del prototipo. Cambiarla renombraria una operacion que el contrato ya publica y
 * que la interfaz ya llama.
 *
 * <p>Las cuatro son la <b>misma opcion del menu</b> —{@code actualizacion_catastro}, privilegio
 * {@code MODIFICACION}—: en el manual «Actualizacion del Catastro» es un solo proceso, y el tipo de
 * ficha que se actualiza no cambia quien puede hacerlo. Cada tipo se identifica como lo hace su
 * lectura: la urbana y la economica por el codigo de referencia catastral, la de bienes comunes por
 * el de la edificacion y la rural por el de la unidad. Los tres nombres reciben lo mismo —el codigo
 * de referencia catastral del predio— y se respetan porque son los del contrato.
 *
 * <h2>Tres cosas que conviene mirar</h2>
 *
 * <ol>
 *   <li><b>La observacion viene en el cuerpo y es obligatoria.</b> Sin ella no se guarda (regla 10,
 *       RNF-052). No es una validacion de cortesia: {@link Observacion} exige que diga algo, y la
 *       columna es {@code NOT NULL}.
 *   <li><b>{@code PUT} no significa sobrescribir.</b> El verbo lo fija el contrato; lo que hace por
 *       debajo es crear la version siguiente y cerrar la anterior. La ficha de ayer sigue entera.
 *   <li><b>Lo que no se manda, no cambia.</b> Una lista ausente copia la de la version vigente; una
 *       lista presente aunque vacia la reemplaza. Confundir las dos vacia lo declarado sin que
 *       ningun {@code DELETE} aparezca en el diff, que es justo lo que el versionado existe para
 *       evitar. La regla vive en {@link DeclaracionDeFicha}, una sola vez para los dos verbos.
 * </ol>
 *
 * <p>Un predio sin ficha vigente de ese tipo es {@code 404} y no una incidencia: lo que falta es la
 * <b>primera</b> version, y esa se registra con el {@code POST} de su tipo, no se actualiza.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/fichas")
@RequiereAcceso(acceso = "actualizacion_catastro", privilegio = Privilegio.MODIFICACION)
public class ActualizacionController {

    private final ActualizarFichaCatastral fichas;
    private final CatastroRepository catastro;
    private final Clock reloj;

    public ActualizacionController(
            ActualizarFichaCatastral fichas, CatastroRepository catastro, Clock reloj) {
        this.fichas = fichas;
        this.catastro = catastro;
        this.reloj = reloj;
    }

    /** La ficha urbana individual (RF-001). Su ruta es la que el contrato ya publicaba. */
    @PutMapping("/{codigo}/actualizacion")
    public FichaResource actualizar(
            @PathVariable String codigo, @RequestBody PeticionDeActualizacion peticion) {
        return versionar(codigo, TipoFicha.UNICA, peticion);
    }

    @PutMapping("/economica/{codRefCatastral}/actualizacion")
    public FichaResource actualizarEconomica(
            @PathVariable String codRefCatastral, @RequestBody PeticionDeActualizacion peticion) {
        return versionar(codRefCatastral, TipoFicha.ECONOMICA, peticion);
    }

    @PutMapping("/bienes-comunes/{codEdificacion}/actualizacion")
    public FichaResource actualizarBienesComunes(
            @PathVariable String codEdificacion, @RequestBody PeticionDeActualizacion peticion) {
        return versionar(codEdificacion, TipoFicha.BIENES_COMUNES, peticion);
    }

    @PutMapping("/rural/{codUnidad}/actualizacion")
    public FichaResource actualizarRural(
            @PathVariable String codUnidad, @RequestBody PeticionDeActualizacion peticion) {
        return versionar(codUnidad, TipoFicha.RURAL, peticion);
    }

    // ------------------------------------------------------------------

    /**
     * Un solo camino para los cuatro, por lo mismo que en la lectura: si cada tipo resolviera su
     * fecha y su semantica trivaluada por separado, uno de los cuatro acabaria copiando donde los
     * otros reemplazan.
     */
    private FichaResource versionar(
            String codigo, TipoFicha tipo, PeticionDeActualizacion peticion) {

        Observacion observacion = DeclaracionDeFicha.observacionDe(peticion.observacion());
        Predio predio = predioDe(codigo);
        long predioId = Objects.requireNonNull(predio.id(), "El predio leido tiene identificador");

        LocalDate desde =
                peticion.vigenciaDesde() == null
                        ? LocalDate.now(reloj)
                        : DeclaracionDeFicha.fechaDe(peticion.vigenciaDesde(), "vigenciaDesde");

        try {
            FichaCatastral nueva =
                    fichas.actualizar(
                            predioId,
                            tipo,
                            desde,
                            DeclaracionDeFicha.origenDe(peticion.origen()),
                            DeclaracionDeFicha.exigir(
                                    peticion.documentoOrigen(), "documentoOrigen"),
                            DeclaracionDeFicha.construccionesDe(peticion.construcciones()),
                            DeclaracionDeFicha.instalacionesDe(peticion.instalaciones()),
                            DeclaracionDeFicha.detalleDe(
                                    tipo,
                                    peticion.economico(),
                                    peticion.bienesComunes(),
                                    peticion.rural()),
                            observacion);
            return FichaResource.de(nueva);
        } catch (ActualizarFichaCatastral.SinFichaVigente sinFicha) {
            // Lo que falta es la primera version, y esa se registra. Un 500 aqui diria que el
            // sistema fallo, cuando lo que pasa es que el recurso no esta.
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO,
                    "El predio no tiene ficha " + tipo + " vigente al " + desde);
        }
    }

    private Predio predioDe(String codigo) {
        CodigoReferenciaCatastral referencia;
        try {
            referencia = CodigoReferenciaCatastral.de(codigo);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, DeclaracionDeFicha.mensajeDe(invalido));
        }
        return catastro.predioPorCodigo(referencia)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun predio con ese codigo de referencia"
                                                + " catastral"));
    }

    /**
     * El cuerpo de la actualizacion, el mismo para los cuatro tipos. <b>Lista blanca</b>: lo que no
     * esta aqui no entra, aunque llegue en el JSON.
     *
     * <p>Los tres bloques de detalle conviven en el record y <b>solo entra el del tipo que la ruta
     * declara</b>: mandar el de otro es {@code 422}. Uno por ruta seria un record por tipo con once
     * campos repetidos, y el dia que se agregue un campo a la construccion se agregaria a tres de
     * los cuatro.
     */
    public record PeticionDeActualizacion(
            @Nullable String observacion,
            @Nullable String documentoOrigen,
            @Nullable String origen,
            @Nullable String vigenciaDesde,
            @Nullable List<DeclaracionDeFicha.ConstruccionDeclarada> construcciones,
            @Nullable List<DeclaracionDeFicha.InstalacionDeclarada> instalaciones,
            DeclaracionDeFicha.@Nullable EconomicoDeclarado economico,
            DeclaracionDeFicha.@Nullable BienesComunesDeclarados bienesComunes,
            DeclaracionDeFicha.@Nullable RuralDeclarado rural) {}
}
