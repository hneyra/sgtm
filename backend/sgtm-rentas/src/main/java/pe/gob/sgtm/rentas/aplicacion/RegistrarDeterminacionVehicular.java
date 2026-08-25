package pe.gob.sgtm.rentas.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.dominio.ValorReferencial;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.VehiculoRepository;
import pe.gob.sgtm.rentas.dominio.predial.Determinacion;
import pe.gob.sgtm.rentas.dominio.predial.DeterminacionRepository;
import pe.gob.sgtm.rentas.dominio.vehicular.ImpuestoVehicular;

/**
 * Determina el impuesto al patrimonio vehicular de un vehículo para un ejercicio (#32, RF-025).
 *
 * <p><b>El plazo de afectación se respeta automáticamente</b>: un vehículo fuera de {@link
 * Vehiculo#afectoEn} no se determina, sin que nadie tenga que decidirlo caso por caso —es el
 * criterio de aceptación de #32—. Ver {@link VehiculoNoAfecto}.
 *
 * <p><b>El modo simulación no escribe nada</b> (RF-025, «el manual lo distingue explícitamente»):
 * con {@code simulacion = true}, {@link #calcular} devuelve la {@link Determinacion} calculada sin
 * guardarla —{@link Determinacion#esNueva()} sigue siendo {@code true}— y sin auditarla. Ni una
 * fila de {@code determinacion} ni de {@code auditoria} cambia.
 *
 * <p>La alícuota se lee del conjunto sellado del ejercicio, igual que {@code RT001ValorDeTerreno}
 * lee el arancel: parametrizada, nunca un literal (regla 5). El mínimo imponible, en cambio, llega
 * como argumento —como los tramos y el mínimo de {@link RegistrarDeterminacionPredial}—: de dónde
 * sale (UIT × un factor) no está decidido todavía (D-02a).
 *
 * <p><b>Ningún asiento de cuenta corriente se genera aquí</b>, igual que en {@link
 * RegistrarDeterminacionPredial}: trasladar el monto a una deuda exigible es un acto posterior
 * (#24).
 */
@Service
public class RegistrarDeterminacionVehicular {

    /**
     * El tipo del parámetro que trae la alícuota; una sola clave por ejercicio (no por vehículo).
     */
    public static final String ALICUOTA_VEHICULAR = "ALICUOTA_VEHICULAR";

    private static final String TABLA_AUDITADA = "determinacion";

    private final VehiculoRepository vehiculos;
    private final ValoresReferenciales valoresReferenciales;
    private final DeterminacionRepository determinaciones;
    private final LectorDeParametros parametros;
    private final Auditoria auditoria;
    private final Clock reloj;

    public RegistrarDeterminacionVehicular(
            VehiculoRepository vehiculos,
            ValoresReferenciales valoresReferenciales,
            DeterminacionRepository determinaciones,
            LectorDeParametros parametros,
            Auditoria auditoria,
            Clock reloj) {
        this.vehiculos = vehiculos;
        this.valoresReferenciales = valoresReferenciales;
        this.determinaciones = determinaciones;
        this.parametros = parametros;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /**
     * Calcula el impuesto de un vehículo. Con {@code simulacion = true}, calcula sin guardar ni
     * generar declaración jurada; con {@code false}, guarda una determinación nueva y la audita.
     *
     * @param minimoImponible el mínimo del ejercicio; {@link Dinero#CERO} si no se conoce todavía
     */
    @Transactional
    public Determinacion calcular(
            long vehiculoId,
            Ejercicio ejercicio,
            Dinero minimoImponible,
            boolean simulacion,
            Observacion observacion) {
        Vehiculo vehiculo =
                vehiculos
                        .findById(vehiculoId)
                        .orElseThrow(() -> new VehiculoInexistente(vehiculoId));

        if (!vehiculo.afectoEn(ejercicio)) {
            throw new VehiculoNoAfecto(vehiculo, ejercicio);
        }

        ValorReferencial valorReferencial =
                valoresReferenciales
                        .de(vehiculo, ejercicio)
                        .orElseThrow(() -> new SinValorReferencial(vehiculo, ejercicio));

        ParametrosSellados sellados = parametros.vigenteEn(ejercicio);
        long conjuntoId = parametros.conjuntoVigenteEn(ejercicio).valor();
        Alicuota alicuota =
                Alicuota.de(
                        sellados.exigirNumero(ALICUOTA_VEHICULAR, null).valor().toPlainString());

        Dinero montoDeterminado =
                ImpuestoVehicular.calcular(valorReferencial.valor(), alicuota, minimoImponible);

        Determinacion nueva =
                Determinacion.nuevaVehicular(
                        ejercicio,
                        vehiculo.contribuyenteId(),
                        vehiculoId,
                        conjuntoId,
                        valorReferencial.valor(),
                        montoDeterminado,
                        java.util.List.of(ALICUOTA_VEHICULAR));

        if (simulacion) {
            return nueva;
        }

        Determinacion guardada = determinaciones.insertar(nueva);
        auditar(guardada, observacion);
        return guardada;
    }

    private void auditar(Determinacion guardada, Observacion observacion) {
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                TABLA_AUDITADA,
                                String.valueOf(guardada.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardada)));
    }

    private static String descripcion(Determinacion determinacion) {
        return "{\"tributo\":\"VEHICULAR\",\"vehiculoId\":"
                + determinacion.vehiculoId()
                + ",\"contribuyenteId\":"
                + determinacion.contribuyenteId()
                + ",\"ejercicio\":\""
                + determinacion.ejercicio()
                + "\",\"conjuntoId\":"
                + determinacion.conjuntoId()
                + ",\"baseImponible\":\""
                + determinacion.baseImponible()
                + "\",\"montoDeterminado\":\""
                + determinacion.montoDeterminado()
                + "\"}";
    }

    /** No hay ningún vehículo con ese identificador, o es de otra municipalidad. */
    public static final class VehiculoInexistente extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        VehiculoInexistente(long id) {
            super("No hay ningun vehiculo con identificador " + id + " en esta municipalidad");
        }
    }

    /**
     * El vehículo ya no está afecto en el ejercicio pedido: el plazo de tres años venció. No se
     * determina — es la respuesta automática que #32 exige, sin que nadie tenga que revisarlo.
     */
    public static final class VehiculoNoAfecto extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        VehiculoNoAfecto(Vehiculo vehiculo, Ejercicio ejercicio) {
            super(
                    "El vehiculo "
                            + vehiculo.placa()
                            + " no esta afecto en el ejercicio "
                            + ejercicio
                            + ": su afectacion corrio de "
                            + vehiculo.rangoDeAfectacion().desde()
                            + " a "
                            + vehiculo.rangoDeAfectacion().hasta());
        }
    }

    /**
     * El vehículo no tiene valor referencial en la tabla del ejercicio: no hay base para calcular.
     */
    public static final class SinValorReferencial extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        SinValorReferencial(Vehiculo vehiculo, Ejercicio ejercicio) {
            super(
                    "El vehiculo "
                            + vehiculo.placa()
                            + " ("
                            + vehiculo.marca()
                            + " "
                            + vehiculo.modelo()
                            + " "
                            + vehiculo.anioFabricacion()
                            + ") no tiene valor referencial en la tabla del ejercicio "
                            + ejercicio);
        }
    }
}
