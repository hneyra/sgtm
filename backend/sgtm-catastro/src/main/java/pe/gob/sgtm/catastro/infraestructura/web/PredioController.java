package pe.gob.sgtm.catastro.infraestructura.web;

import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.ActualizarCatastro;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * El predio como recurso propio: {@code POST /api/v1/catastro/predios/{predioId}/baja} y {@code
 * POST /api/v1/catastro/predios/{predioId}/reactivacion}.
 *
 * <h2>Por que la baja tiene ruta y no es un campo de la actualizacion</h2>
 *
 * <p>Retirar un predio del padron no es versionar su ficha: la ficha sigue entera y lo que cambia
 * es el estado del predio. Meterlo como un campo del {@code PUT} de la actualizacion obligaria a
 * crear una version de ficha que no declara nada nuevo cada vez que se retira un predio, y dejaria
 * el acto mas grave del catastro escondido dentro del mas corriente.
 *
 * <p>Se identifica por {@code predioId} y no por codigo de referencia catastral, por lo mismo que
 * {@code /catastro/predios/{predioId}/titulares}: es el identificador que cada fila de la consulta
 * de fichas ya publica, y no hay dos convenciones para el mismo tramo de ruta.
 *
 * <h2>Las dos son irreversibles a medias, y a proposito</h2>
 *
 * <p>La baja no borra nada (regla 4, RNF-051): el predio deja de estar activo y sus fichas, su
 * titularidad y las determinaciones que se apoyaron en el quedan como estaban. Y tiene vuelta,
 * {@code reactivacion}, porque sin ella seria una puerta de un solo sentido —{@link
 * ActualizarCatastro#reactivar} lo explica—.
 *
 * <p><b>La baja exige {@code ELIMINACION} y la reactivacion {@code MODIFICACION}.</b> No son el
 * mismo privilegio porque no son el mismo riesgo: retirar un predio del padron lo saca de toda
 * emision futura, y devolverlo solo lo restituye. Es el reparto que {@link ViaController} y {@link
 * SectorController} ya hacen con la baja logica de su catalogo, aqui mas facil de declarar porque
 * cada acto tiene su ruta y el guardia no necesita leer el cuerpo.
 *
 * <p>La observacion viene en el cuerpo y es obligatoria en las dos (regla 10, RNF-052).
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/predios")
@RequiereAcceso(acceso = "actualizacion_catastro", privilegio = Privilegio.MODIFICACION)
public class PredioController {

    private final ActualizarCatastro catastro;

    public PredioController(ActualizarCatastro catastro) {
        this.catastro = catastro;
    }

    /** Retira el predio del padron. No lo borra. */
    @PostMapping("/{predioId}/baja")
    @RequiereAcceso(acceso = "actualizacion_catastro", privilegio = Privilegio.ELIMINACION)
    public PredioResource darDeBaja(
            @PathVariable long predioId, @RequestBody PeticionDeCambioDeEstado peticion) {
        Observacion observacion = DeclaracionDeFicha.observacionDe(peticion.observacion());
        try {
            return PredioResource.de(catastro.darDeBaja(predioId, observacion));
        } catch (ActualizarCatastro.PredioInexistente noExiste) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO, DeclaracionDeFicha.mensajeDe(noExiste));
        } catch (ActualizarCatastro.EstadoQueYaTiene yaEsta) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.CONFLICTO, DeclaracionDeFicha.mensajeDe(yaEsta));
        }
    }

    /** Devuelve al padron un predio retirado. */
    @PostMapping("/{predioId}/reactivacion")
    public PredioResource reactivar(
            @PathVariable long predioId, @RequestBody PeticionDeCambioDeEstado peticion) {
        Observacion observacion = DeclaracionDeFicha.observacionDe(peticion.observacion());
        try {
            return PredioResource.de(catastro.reactivar(predioId, observacion));
        } catch (ActualizarCatastro.PredioInexistente noExiste) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO, DeclaracionDeFicha.mensajeDe(noExiste));
        } catch (ActualizarCatastro.EstadoQueYaTiene yaEsta) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.CONFLICTO, DeclaracionDeFicha.mensajeDe(yaEsta));
        }
    }

    /**
     * El cuerpo de los dos actos. <b>Lista blanca</b>: solo la observacion.
     *
     * <p>No lleva el estado al que se va —eso lo dice la ruta— ni el predio —lo dice la ruta—. Un
     * cuerpo con el estado dentro admitiria una peticion que dice {@code baja} en la ruta y {@code
     * ACTIVO} en el cuerpo, y habria que decidir cual gana; asi no hay nada que decidir.
     */
    public record PeticionDeCambioDeEstado(@Nullable String observacion) {}
}
