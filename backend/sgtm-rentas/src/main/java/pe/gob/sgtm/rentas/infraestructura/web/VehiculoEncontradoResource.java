package pe.gob.sgtm.rentas.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.rentas.aplicacion.ConsultaDeVehiculos.VehiculoConDeuda;
import pe.gob.sgtm.web.ImporteActualizado;

/**
 * Una fila de {@code consulta_vehiculos}, tal como sale por HTTP. Campos en español {@code
 * camelCase} (ARQ-04 §3).
 *
 * <p>No lleva base imponible: el impuesto al patrimonio vehicular necesita la tabla de valores
 * referenciales, y eso sigue bloqueado por D-02 (ver el javadoc de {@code Vehiculo}). Un campo
 * ausente es lo honesto; inventar un cero no lo seria.
 *
 * <p>{@code afectoDesde}/{@code afectoHasta} son {@code Vehiculo#rangoDeAfectacion}: estructural,
 * los tres ejercicios desde la inscripcion, no el resultado de cruzar con un beneficio —una
 * exoneracion registrada no cambia estos campos—. Es el mismo par que el prototipo dibuja en la
 * columna «Afectación» como «2019 — 2021».
 */
public record VehiculoEncontradoResource(
        String placa,
        @Nullable String clase,
        String marca,
        String modelo,
        int anioFabricacion,
        String estado,
        int afectoDesde,
        int afectoHasta,
        long contribuyenteId,
        String codigoContribuyente,
        String titular,
        ImporteActualizado deuda) {

    public static VehiculoEncontradoResource de(VehiculoConDeuda fila) {
        var vehiculo = fila.fila().vehiculo();
        var rango = vehiculo.rangoDeAfectacion();
        return new VehiculoEncontradoResource(
                vehiculo.placa().valor(),
                vehiculo.categoria(),
                vehiculo.marca(),
                vehiculo.modelo(),
                vehiculo.anioFabricacion().valor(),
                vehiculo.estado().name(),
                rango.desde().valor(),
                rango.hasta().valor(),
                vehiculo.contribuyenteId(),
                fila.fila().codigoContribuyente(),
                fila.fila().titular(),
                fila.deuda());
    }
}
