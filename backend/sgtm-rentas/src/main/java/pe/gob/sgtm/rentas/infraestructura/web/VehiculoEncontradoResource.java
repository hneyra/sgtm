package pe.gob.sgtm.rentas.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;
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
 * <p>{@code afecto} es estructural —{@code Vehiculo#afectoEn}, los tres ejercicios desde la
 * inscripcion—, no el resultado de cruzar con un beneficio: una exoneracion registrada no cambia
 * este campo. Traducir los dos en una sola palabra —«AFECTO», «EXONERADO»— es cosa de quien consuma
 * el contrato, igual que {@code consulta_deuda} traduce su «Fase» en el frontend.
 */
public record VehiculoEncontradoResource(
        String placa,
        @Nullable String clase,
        String marca,
        String modelo,
        int anioFabricacion,
        String estado,
        boolean afecto,
        long contribuyenteId,
        String codigoContribuyente,
        String titular,
        ImporteActualizado deuda) {

    public static VehiculoEncontradoResource de(VehiculoConDeuda fila) {
        var vehiculo = fila.fila().vehiculo();
        return new VehiculoEncontradoResource(
                vehiculo.placa().valor(),
                vehiculo.categoria(),
                vehiculo.marca(),
                vehiculo.modelo(),
                vehiculo.anioFabricacion().valor(),
                vehiculo.estado().name(),
                vehiculo.afectoEn(Ejercicio.de(fila.deuda().actualizadoA())),
                vehiculo.contribuyenteId(),
                fila.fila().codigoContribuyente(),
                fila.fila().titular(),
                fila.deuda());
    }
}
