package pe.gob.sgtm.cuentacorriente;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;

/**
 * El punto de entrada para que otro contexto acotado asiente un cargo (ARQ-01 §4 regla 2): quien
 * determina la deuda —rentas, sanciones, licencias— se la pide a {@code cuentacorriente} en vez de
 * escribir en {@code cuenta_corriente_asiento} por su cuenta; este contexto no conoce reglas
 * tributarias, así que no valida que el importe sea correcto, solo lo asienta.
 *
 * <p>Es la API pública de este módulo: vive en el paquete raíz, no en {@code .aplicacion} ni en
 * {@code .dominio}, mismo patrón que {@link ConsultaDeDeudaPublica}.
 *
 * <p>Cubre el caso corriente —un cargo nuevo, insoluto, en fase ordinaria— que es el único que un
 * contexto que recién determina una deuda necesita: reversar, abonar o mover de fase son actos
 * posteriores de otros contextos (tesorería, coactiva) que ya tienen su propio caso de uso.
 */
public interface GeneradorDeCargos {

    /**
     * Asienta un cargo insoluto nuevo, en fase ordinaria.
     *
     * @param ejercicio el ejercicio del cargo; clave de partición del libro
     * @param contribuyenteId a quién se le cobra
     * @param tributo el tributo al que se imputa, tal como lo nombra quien pide el cargo
     * @param periodo la cuota o el mes, si el tributo se divide; {@code null} si no aplica
     * @param predioId la unidad, si la obligación es predial o de arbitrios
     * @param vehiculoId la unidad, si la obligación es vehicular
     * @param monto siempre positivo
     * @param fechaValor fecha a la que se imputa el cargo
     * @param documentoOrigen el documento que lo origina
     * @param observacion por qué se asienta (regla 10)
     */
    void generarCargo(
            Ejercicio ejercicio,
            long contribuyenteId,
            String tributo,
            @Nullable Integer periodo,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            Dinero monto,
            LocalDate fechaValor,
            String documentoOrigen,
            Observacion observacion);
}
