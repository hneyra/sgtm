package pe.gob.sgtm.licencias.infraestructura.web;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.licencias.aplicacion.ConsultaDeFue;
import pe.gob.sgtm.licencias.aplicacion.ValorizacionDelFue;
import pe.gob.sgtm.licencias.dominio.ProyectoDelFue;
import pe.gob.sgtm.licencias.dominio.ValorizacionDeObra;
import pe.gob.sgtm.web.ImporteActualizado;

/**
 * Una fila del reporte general de licencias de edificacion (#48, RF-115).
 *
 * <p>Las claves son las que declara la tabla de la pantalla {@code edificacion_reporte}: {@code
 * nLicencia}, {@code expediente}, {@code administrado}, {@code areaAConstruirM}, {@code
 * valorDeObraS}.
 *
 * <p><b>El valor de obra va con su fecha o no va.</b> Es la unica cifra de la hoja, y cuando el
 * cuadro de valores unitarios sellado no permite calcularla el campo llega nulo con su motivo. El
 * frontend imprime «—»; un cero se leeria como una obra que no vale nada, y esa hoja se usa para
 * conciliar lo que se cobro por derechos de tramite.
 */
public record ReporteDeEdificacionResource(
        @Nullable String nLicencia,
        String expediente,
        LocalDate fecha,
        String administrado,
        @Nullable String predio,
        String modalidad,
        @Nullable String areaAConstruirM,
        @Nullable ImporteActualizado valorDeObraS,
        @Nullable String valorDeObraNoDisponible,
        String estado,
        LocalDate estadoALaFecha) {

    public static ReporteDeEdificacionResource de(ConsultaDeFue.FilaDelReporte fila) {
        ConsultaDeFue.FueEnConsulta consulta = fila.fila();
        ProyectoDelFue proyecto = fila.proyecto();
        ValorizacionDelFue.Resultado valorizacion = fila.valorizacion();
        ValorizacionDeObra.Valorizacion obra =
                valorizacion == null ? null : valorizacion.valorizacion();

        return new ReporteDeEdificacionResource(
                consulta.numeroDeLicencia(),
                consulta.fue().expediente(),
                consulta.fue().fechaDeclaracion(),
                consulta.nombreDelSolicitante(),
                consulta.terreno() == null ? null : consulta.terreno().direccion(),
                consulta.fue().modalidad().name(),
                proyecto == null ? null : proyecto.areaTechada().valor().toPlainString(),
                obra == null ? null : new ImporteActualizado(obra.total(), consulta.aLaFecha()),
                valorizacion == null ? null : valorizacion.motivo(),
                consulta.estado().name(),
                consulta.aLaFecha());
    }
}
