package pe.gob.sgtm.indicadores.infraestructura.web;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.indicadores.aplicacion.PanelDeRecaudacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * El panel de recaudacion, por HTTP: la operacion de la pantalla {@code inicio} (RF-130).
 *
 * <h2>Una sola lectura del reloj</h2>
 *
 * <p>El controlador consulta el reloj <b>una vez</b> y pasa el dia y el instante al caso de uso.
 * Las cifras del panel describen entonces la misma lectura, y una prueba puede pedir el panel de un
 * dia concreto y obtener siempre lo mismo (regla 6).
 *
 * <h2>Sin paginar, y a proposito</h2>
 *
 * <p>El contrato declara {@code ejercicio} y nada mas, que es lo que la pantalla manda. No hay
 * {@code pagina} ni {@code tamano} porque la respuesta es un <b>agregado</b> —una fila por tributo,
 * una por mes—, no un padron: paginar un agregado deja al cliente con una pagina de sumas y sin el
 * total, que es la cifra que un panel existe para dar.
 *
 * <h2>El ejercicio</h2>
 *
 * <p>Si no viene, el del reloj. No se rechaza la peticion sin el —la pantalla de inicio se abre sin
 * parametros— y no se inventa nada: lo que cambia es que ejercicio se resume, y la respuesta lo
 * dice en {@code ejercicio} y en la nota de cada bloque.
 */
@RestController
@RequestMapping(Api.RAIZ + "/indicadores")
public class IndicadoresController {

    /** La opcion del catalogo (NEG-03) que este controlador sirve. */
    static final String ACCESO = "inicio";

    private final PanelDeRecaudacion panel;
    private final Clock reloj;

    public IndicadoresController(PanelDeRecaudacion panel, Clock reloj) {
        this.panel = panel;
        this.reloj = reloj;
    }

    /** El avance de la recaudacion del ejercicio, con su cartera pendiente (RF-130). */
    @GetMapping("/recaudacion")
    @RequiereAcceso(acceso = ACCESO, privilegio = Privilegio.LECTURA)
    public PanelResource recaudacion(@RequestParam(required = false) @Nullable String ejercicio) {
        Instant ahora = reloj.instant();
        LocalDate hoy = LocalDate.now(reloj);
        return PanelResource.de(panel.del(ejercicioDe(ejercicio, hoy), hoy, ahora));
    }

    private static Ejercicio ejercicioDe(@Nullable String texto, LocalDate hoy) {
        if (texto == null || texto.isBlank()) {
            return Ejercicio.de(hoy);
        }
        try {
            return new Ejercicio(Integer.parseInt(texto.strip()));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'ejercicio' no es un ano valido: '" + texto + "'");
        }
    }
}
