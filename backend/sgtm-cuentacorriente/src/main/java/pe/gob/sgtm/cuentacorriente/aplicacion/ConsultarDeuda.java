package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * {@code consulta_deuda}: trae los asientos de una obligacion y les aplica {@link
 * CalculoDeDeuda#deudaActualizadaA} (RF-041, RF-042).
 *
 * <p>Este servicio es el unico sitio de este contexto que conoce el reloj —para la fecha de corte
 * por omision, cuando quien consulta no pide una fecha pasada— y la {@link PoliticaDeRedondeo}
 * vigente. {@link CalculoDeDeuda} sigue sin conocer ninguno de los dos: los recibe como argumento,
 * y por eso su prueba no necesita levantar Spring ni el reloj del sistema (regla 6).
 */
@Service
public class ConsultarDeuda {

    private final AsientoRepository repositorio;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;
    private final Clock reloj;

    public ConsultarDeuda(
            AsientoRepository repositorio,
            CalculoDeDeuda calculo,
            PoliticaDeRedondeo redondeo,
            Clock reloj) {
        this.repositorio = repositorio;
        this.calculo = calculo;
        this.redondeo = redondeo;
        this.reloj = reloj;
    }

    /**
     * La deuda de una obligacion, a la fecha de corte del criterio.
     *
     * <p>La fecha no la elige este metodo: la trae {@link CriterioDeDeuda#fecha()}, que quien llama
     * ya resolvio —a hoy, con {@link #hoy()}, o a una fecha pasada—.
     */
    @Transactional(readOnly = true)
    public DeudaActualizada deudaActualizadaA(CriterioDeDeuda criterio) {
        List<Asiento> asientos = repositorio.paraDeuda(criterio);
        return calculo.deudaActualizadaA(asientos, criterio.fecha(), redondeo);
    }

    /** La fecha de hoy, del reloj inyectado y no de {@code LocalDate.now()} (regla 6). */
    public LocalDate hoy() {
        return LocalDate.now(reloj);
    }
}
