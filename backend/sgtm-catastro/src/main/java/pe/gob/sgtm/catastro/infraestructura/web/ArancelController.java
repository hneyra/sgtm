package pe.gob.sgtm.catastro.infraestructura.web;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.catastro.aplicacion.TablasDeValuacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Aranceles de terreno: {@code GET /api/v1/catastro/tablas/aranceles?anio=2026} (RF-009).
 *
 * <p>Devuelve el conjunto <b>sellado</b> vigente del ejercicio, nunca el ultimo cargado: si el
 * ejercicio no tiene ninguno, es {@code NO_ENCONTRADO} y no una lista vacia —una lista vacia diria
 * que la municipalidad no tiene aranceles, cuando lo que pasa es que todavia nadie cerro la carga
 * del ejercicio—.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/tablas/aranceles")
@RequiereAcceso(acceso = "aranceles", privilegio = Privilegio.LECTURA)
public class ArancelController {

    private final TablasDeValuacion tablas;

    public ArancelController(TablasDeValuacion tablas) {
        this.tablas = tablas;
    }

    @GetMapping
    public List<ArancelResource> listar(@RequestParam int anio) {
        try {
            return tablas.aranceles(new Ejercicio(anio)).stream().map(ArancelResource::de).toList();
        } catch (LectorDeParametros.EjercicioSinSellar excepcion) {
            String mensaje = excepcion.getMessage();
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO,
                    mensaje == null ? "Ejercicio sin sellar" : mensaje);
        }
    }
}
