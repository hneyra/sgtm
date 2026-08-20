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
 * Valores unitarios de edificacion: {@code GET /api/v1/catastro/tablas/valores-unitarios?anio=2026}
 * (RF-009).
 *
 * <p>Igual que {@link ArancelController}: devuelve el conjunto sellado vigente del ejercicio, y
 * {@code NO_ENCONTRADO} si el ejercicio no tiene ninguno.
 */
@RestController
@RequestMapping(Api.RAIZ + "/catastro/tablas/valores-unitarios")
@RequiereAcceso(acceso = "valores_unitarios", privilegio = Privilegio.LECTURA)
public class ValorUnitarioController {

    private final TablasDeValuacion tablas;

    public ValorUnitarioController(TablasDeValuacion tablas) {
        this.tablas = tablas;
    }

    @GetMapping
    public List<ValorUnitarioResource> listar(@RequestParam int anio) {
        try {
            return tablas.valoresUnitarios(new Ejercicio(anio)).stream()
                    .map(ValorUnitarioResource::de)
                    .toList();
        } catch (LectorDeParametros.EjercicioSinSellar excepcion) {
            String mensaje = excepcion.getMessage();
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO,
                    mensaje == null ? "Ejercicio sin sellar" : mensaje);
        }
    }
}
