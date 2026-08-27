package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.cuentacorriente.dominio.ObligacionConDeuda;

/** Implementa {@link ConsultaDeDeudaPublica} sobre {@link ConsultarDeuda} (#25). */
@Service
public class ConsultaDeDeudaCuentaCorriente implements ConsultaDeDeudaPublica {

    private final ConsultarDeuda consulta;

    public ConsultaDeDeudaCuentaCorriente(ConsultarDeuda consulta) {
        this.consulta = consulta;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ObligacionPublica> deTodoElContribuyente(long contribuyenteId, LocalDate fecha) {
        return consulta.todasLasObligacionesDe(contribuyenteId, fecha).stream()
                .map(ConsultaDeDeudaCuentaCorriente::aPublica)
                .toList();
    }

    private static ObligacionPublica aPublica(ObligacionConDeuda obligacion) {
        DeudaActualizada deuda = obligacion.deuda();
        return new ObligacionPublica(
                obligacion.tributo(),
                obligacion.ejercicio(),
                obligacion.predioId(),
                obligacion.vehiculoId(),
                deuda.fecha(),
                deuda.insoluto(),
                deuda.reajuste(),
                deuda.interes(),
                deuda.gasto());
    }
}
