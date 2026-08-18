package pe.gob.sgtm.parametros.infraestructura.web;

import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.parametros.aplicacion.AdministrarParametros;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Parametros del sistema: {@code GET /api/v1/seguridad/parametros}.
 *
 * <p>La ruta cuelga de {@code /seguridad} porque asi la declara el contrato —es una opcion del
 * modulo Seguridad del menu— pero el controlador vive en {@code parametros}, que es el contexto
 * dueno de estos datos. Ponerlo en {@code seguridad} habria significado que ese modulo consulte
 * tablas de otro, y esa es exactamente la clase de atajo que convierte un monolito modular en un
 * monolito.
 *
 * <p>Lo que muestra son los <b>conjuntos por ejercicio y su estado</b>, no las cifras una a una: la
 * pregunta que responde esta pantalla es «con que juego de valores se emitio este ejercicio», y esa
 * solo tiene respuesta a nivel de conjunto.
 */
@RestController
@RequestMapping(Api.RAIZ + "/seguridad/parametros")
public class ParametrosController {

    private final AdministrarParametros administrar;

    public ParametrosController(AdministrarParametros administrar) {
        this.administrar = administrar;
    }

    @GetMapping
    @RequiereAcceso(acceso = "parametros", privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<ConjuntoResource> conjuntos(ParametrosDePaginacion paginacion) {
        return RespuestaPaginada.de(
                administrar.conjuntos(paginacion.aPaginacion("ejercicio")), ConjuntoResource::de);
    }

    /**
     * Un conjunto y su estado.
     *
     * <p>No lleva ningun importe, asi que no le aplica la regla de {@code actualizadoA}: lo que se
     * publica aqui es la <b>identidad</b> del juego de parametros, no sus cifras.
     */
    public record ConjuntoResource(
            long id,
            int ejercicio,
            int version,
            String estado,
            @Nullable Instant fechaSellado,
            @Nullable String usuarioSellado) {

        static ConjuntoResource de(ConjuntoDeParametros conjunto) {
            return new ConjuntoResource(
                    conjunto.id() == null ? 0L : conjunto.id(),
                    conjunto.ejercicio().valor(),
                    conjunto.version(),
                    conjunto.estado().name(),
                    conjunto.fechaSellado(),
                    conjunto.usuarioSellado());
        }
    }
}
