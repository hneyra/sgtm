package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.CargadoEnElLibro;
import pe.gob.sgtm.cuentacorriente.CargoDeUnTributo;
import pe.gob.sgtm.cuentacorriente.CarteraDelLibro;
import pe.gob.sgtm.cuentacorriente.CarteraPendiente;
import pe.gob.sgtm.cuentacorriente.PendienteDeUnTributo;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CargoAgregado;
import pe.gob.sgtm.cuentacorriente.dominio.PendienteAgregado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Implementa {@link CarteraDelLibro} sobre el libro y la proyeccion del saldo (#56, RF-130).
 *
 * <p><b>Cada mitad lee de donde tiene que leer.</b> Lo cargado sale del libro, que es la verdad; lo
 * pendiente sale de {@code saldo_proyectado}, que es un cache (ADR-0006). Podria salir todo del
 * libro —lo pendiente es cargos menos abonos de insoluto—, y seria una consulta correcta que en
 * produccion no se puede permitir: recorrer el libro entero de un ejercicio en cada carga de la
 * pantalla de inicio. Para eso existe la proyeccion, y por eso la respuesta dice cuando se
 * proyecto.
 *
 * <p>{@code readOnly = true} y ni un bloqueo, por lo mismo que en {@link
 * RecaudacionDelLibroCuentaCorriente}: un panel se mira mientras la ventanilla cobra. Sin
 * transaccion no hay {@code SET LOCAL}, y sin el la politica RLS no puede evaluar {@code
 * current_setting('app.municipalidad_id')} —la consulta <b>falla</b>—.
 *
 * <p><b>No interpreta nada.</b> No sabe que {@code PREDIAL} sea el impuesto predial ni que {@code
 * MULTA_TRANSITO} sea una papeleta: devuelve lo que el libro dice de cada nombre de tributo.
 */
@Service
public class CarteraDelLibroCuentaCorriente implements CarteraDelLibro {

    private final AsientoRepository asientos;
    private final SaldoRepository saldos;

    public CarteraDelLibroCuentaCorriente(AsientoRepository asientos, SaldoRepository saldos) {
        this.asientos = asientos;
        this.saldos = saldos;
    }

    @Override
    @Transactional(readOnly = true)
    public CargadoEnElLibro cargadoPorTributo(Ejercicio ejercicio, LocalDate aLaFecha) {
        Objects.requireNonNull(ejercicio, "Lo cargado siempre es de un ejercicio");
        Objects.requireNonNull(aLaFecha, "Toda cifra indica su fecha (RNF-075, regla 9)");
        List<CargoDeUnTributo> lineas =
                asientos.cargadoPorTributo(ejercicio).stream()
                        .map(CarteraDelLibroCuentaCorriente::aPublico)
                        .toList();
        return new CargadoEnElLibro(lineas, ejercicio, aLaFecha);
    }

    @Override
    @Transactional(readOnly = true)
    public CarteraPendiente pendientePorTributo(Ejercicio ejercicio, LocalDate aLaFecha) {
        Objects.requireNonNull(ejercicio, "La cartera siempre es de un ejercicio");
        Objects.requireNonNull(aLaFecha, "Toda cifra indica su fecha (RNF-075, regla 9)");
        List<PendienteDeUnTributo> lineas =
                saldos.pendientePorTributo(ejercicio).stream()
                        .map(CarteraDelLibroCuentaCorriente::aPublico)
                        .toList();
        return new CarteraPendiente(lineas, ejercicio, aLaFecha);
    }

    private static CargoDeUnTributo aPublico(CargoAgregado agregado) {
        return new CargoDeUnTributo(agregado.tributo(), agregado.cargado(), agregado.cargos());
    }

    private static PendienteDeUnTributo aPublico(PendienteAgregado agregado) {
        return new PendienteDeUnTributo(
                agregado.tributo(),
                agregado.pendiente(),
                agregado.obligaciones(),
                agregado.proyectadoDesde());
    }
}
