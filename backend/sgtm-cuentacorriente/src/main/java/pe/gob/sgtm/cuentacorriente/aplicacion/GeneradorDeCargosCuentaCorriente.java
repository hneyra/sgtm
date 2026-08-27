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
}
