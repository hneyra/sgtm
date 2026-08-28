package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import pe.gob.sgtm.cuentacorriente.GeneradorDeCargos;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Implementa {@link GeneradorDeCargos} sobre {@link RegistrarAsiento}: el cargo que otro contexto
 * pide siempre es insoluto y de fase ordinaria. La referencia externa es la que el llamador pase
 * —una papeleta o una licencia la usan para no necesitar clave foránea (ARQ-01 §4 regla 2); quien
 * ya tiene su propia cabecera de determinación, como {@code DeterminarArbitrios}, pasa {@code
 * null}—.
 */
@Service
public class GeneradorDeCargosCuentaCorriente implements GeneradorDeCargos {

    private final RegistrarAsiento registrar;

    public GeneradorDeCargosCuentaCorriente(RegistrarAsiento registrar) {
        this.registrar = registrar;
    }

    @Override
    public void generarCargo(
            Ejercicio ejercicio,
            long contribuyenteId,
            String tributo,
            @Nullable Integer periodo,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            @Nullable String referenciaExterna,
            Dinero monto,
            LocalDate fechaValor,
            String documentoOrigen,
            Observacion observacion) {
        Asiento asiento =
                Asiento.nuevo(
                        ejercicio,
                        contribuyenteId,
                        tributo,
                        Concepto.INSOLUTO,
                        TipoAsiento.CARGO,
                        Fase.ORDINARIA,
                        periodo,
                        predioId,
                        vehiculoId,
                        referenciaExterna,
                        monto,
                        fechaValor,
                        documentoOrigen);
        registrar.asentar(asiento, observacion);
    }

    /**
     * La costa del procedimiento: {@code GASTO} en fase {@code COACTIVA}, sin periodo y sin unidad
     * (#42).
     *
     * <p>Los dos valores que la distinguen —el concepto y la fase— se fijan aqui y no llegan por la
     * firma: son tipos de {@code .dominio} y no cruzan el limite del modulo (ARQ-01 §4).
     */
    @Override
    public void generarGastoDelProcedimiento(
            Ejercicio ejercicio,
            long contribuyenteId,
            String tributo,
            String referenciaExterna,
            Dinero monto,
            LocalDate fechaValor,
            String documentoOrigen,
            Observacion observacion) {
        Asiento asiento =
                Asiento.nuevo(
                        ejercicio,
                        contribuyenteId,
                        tributo,
                        Concepto.GASTO,
                        TipoAsiento.CARGO,
                        Fase.COACTIVA,
                        null,
                        null,
                        null,
                        referenciaExterna,
                        monto,
                        fechaValor,
                        documentoOrigen);
        registrar.asentar(asiento, observacion);
    }
}
