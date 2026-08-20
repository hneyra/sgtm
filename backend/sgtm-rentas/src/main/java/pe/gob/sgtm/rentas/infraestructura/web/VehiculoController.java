package pe.gob.sgtm.rentas.infraestructura.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.rentas.aplicacion.ConsultaDeVehiculos;
import pe.gob.sgtm.web.Api;

/**
 * Ficha del vehiculo: {@code GET /api/v1/rentas/vehiculos/{placa}} (RF-024).
 *
 * <p>La placa de la ruta se compara <b>sin el guion</b>, asi que {@code ABC-123} y {@code ABC123}
 * llevan a la misma ficha. Es lo que se necesita en ventanilla: quien pregunta trae la placa
 * escrita como se le ocurrio, y el sistema no puede contestar «no existe» a una diferencia de
 * puntuacion.
 *
 * <p>La ficha incluye el <b>historial de placas</b>. Es el dato que convierte una consulta en una
 * respuesta util cuando alguien reclama una papeleta a nombre de una placa que ya no es la suya:
 * dice cuando cambio, quien lo hizo y con que sustento.
 *
 * <p>El controlador no habla con el repositorio: llama al caso de uso, que es quien abre la
 * transaccion. Sin transaccion no hay {@code SET LOCAL} y la politica RLS no tiene que leer, asi
 * que una lectura «simple» desde aqui no funcionaria nunca.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/vehiculos")
@RequiereAcceso(acceso = "vehiculos", privilegio = Privilegio.LECTURA)
public class VehiculoController {

    private final ConsultaDeVehiculos consulta;

    public VehiculoController(ConsultaDeVehiculos consulta) {
        this.consulta = consulta;
    }

    @GetMapping("/{placa}")
    public VehiculoResource porPlaca(@PathVariable String placa) {
        // `Placa` valida y normaliza: una placa mal formada sale como 422 con un
        // mensaje que habla del dato, no como un 404 que haria pensar que el
        // vehiculo no esta.
        ConsultaDeVehiculos.FichaDeVehiculo ficha = consulta.porPlaca(Placa.de(placa));
        return VehiculoResource.de(ficha.vehiculo(), ficha.historial());
    }
}
