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
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Implementa {@link CarteraDelLibro} sobre el libro (#56, #639, RF-130).
 *
 * <h2>Las dos mitades leen del libro, y desde #639 tambien la segunda</h2>
 *
 * <p>Lo cargado son los cargos de insoluto del ejercicio; lo pendiente es lo mismo neteado contra
 * sus abonos <b>hasta la fecha de corte</b>. Hasta #639 lo pendiente salia de {@code
 * saldo_proyectado} —el cache de #23—, y se cambio porque esa tabla <b>no puede aplicar una fecha
 * de corte</b>: netea el insoluto de la obligacion entera y no tiene ninguna columna con la fecha
 * valor de sus asientos. El sintoma era el de #639: el panel decia 13 783,75 de cartera donde la
 * suma de {@code GET /consultas/deuda} sobre los mismos contribuyentes daba 11 342,20, y los 2
 * 441,55 de diferencia eran <b>la cuota que aun no vence</b>.
 *
 * <h2>Y lo que costo se midio antes de cambiarlo</h2>
 *
 * <p>El motivo escrito en #56 para no leer el libro era el coste: «recorrer el libro entero de un
 * ejercicio en cada carga de la pantalla de inicio». Medido contra PostgreSQL 16 con un padron del
 * tamano de Catacaos —105 161 asientos y 100 154 filas proyectadas, como {@code sgtm_app}, con RLS
 * activa y tres repeticiones de cada consulta en la misma sesion (mediana)—: la cartera sobre
 * {@code saldo_proyectado} tardaba <b>74,6 ms</b> y sobre el libro tarda <b>234,0 ms</b>. Pero
 * {@link #cargadoPorTributo} <b>ya</b> recorre esa misma particion en cada carga del panel y tarda
 * <b>178,8 ms</b>: la consulta nueva cuesta 1,3 veces la que el panel ya paga sobre la misma
 * particion, asi que leer el libro no es una clase de coste nueva. Lo que se gana a cambio es que
 * no hay dos definiciones de «lo pendiente» que puedan divergir.
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

    public CarteraDelLibroCuentaCorriente(AsientoRepository asientos) {
        this.asientos = asientos;
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
        Objects.requireNonNull(aLaFecha, "La cartera es a una fecha de corte (regla 9, #639)");
        List<PendienteDeUnTributo> lineas =
                asientos.pendientePorTributo(ejercicio, aLaFecha).stream()
                        .map(CarteraDelLibroCuentaCorriente::aPublico)
                        .toList();
        return new CarteraPendiente(lineas, ejercicio, aLaFecha);
    }

    private static CargoDeUnTributo aPublico(CargoAgregado agregado) {
        return new CargoDeUnTributo(agregado.tributo(), agregado.cargado(), agregado.cargos());
    }

    private static PendienteDeUnTributo aPublico(PendienteAgregado agregado) {
        return new PendienteDeUnTributo(
                agregado.tributo(), agregado.pendiente(), agregado.obligaciones());
    }
}
