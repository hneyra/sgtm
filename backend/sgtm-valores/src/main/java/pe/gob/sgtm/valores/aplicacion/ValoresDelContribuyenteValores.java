package pe.gob.sgtm.valores.aplicacion;

import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.valores.ValorDelContribuyente;
import pe.gob.sgtm.valores.ValoresDelContribuyente;
import pe.gob.sgtm.valores.dominio.CriterioDeConsultaDeValores;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorEnConsulta;

/**
 * Implementa {@link ValoresDelContribuyente} sobre {@link ConsultaDeValores} (#25, RF-046).
 *
 * <p><b>No escribe una segunda consulta.</b> Arma el mismo {@code CriterioDeConsultaDeValores} que
 * arma {@code ConsultaValoresController} para {@code consulta_valores} —con el contribuyente como
 * unico filtro— y llama al mismo {@link ConsultaDeValores#buscar}. Es lo que garantiza que la
 * pestaña «Valores» de la consulta unificada y {@code GET /consultas/valores} no puedan discrepar:
 * la situacion se resuelve en el mismo SQL, los tributos se agregan en el mismo {@code string_agg},
 * y el periodo se compone en el mismo sitio.
 *
 * <p>Lo unico que este adaptador tira por el camino es el nombre del contribuyente que {@code
 * ConsultaDeValores} resuelve para su grilla: la ficha unificada ya sabe de quien es —lo resolvio
 * para poder responder 404—, y traerlo veinte veces mas seria pagar la misma lectura dos veces.
 */
@Service
public class ValoresDelContribuyenteValores implements ValoresDelContribuyente {

    private final ConsultaDeValores consulta;

    public ValoresDelContribuyenteValores(ConsultaDeValores consulta) {
        this.consulta = consulta;
    }

    /**
     * {@code @Transactional(readOnly = true)} aunque {@link ConsultaDeValores#buscar} ya lo lleve:
     * quien llama desde otro contexto no tiene por que saber que la implementacion delega, y una
     * anotacion que sobra se une a la transaccion de fuera sin coste.
     */
    @Override
    @Transactional(readOnly = true)
    public Pagina<ValorDelContribuyente> deTodoElContribuyente(
            long contribuyenteId, LocalDate aLaFecha, Paginacion paginacion) {
        CriterioDeConsultaDeValores criterio =
                new CriterioDeConsultaDeValores(null, contribuyenteId, null, null, null, aLaFecha);
        return consulta.buscar(criterio, paginacion).mapear(fila -> aPublico(fila.valor()));
    }

    private static ValorDelContribuyente aPublico(ValorEnConsulta fila) {
        Valor valor = fila.valor();
        return new ValorDelContribuyente(
                // El codigo -«OP», «RD», «RM»- y no el nombre de la constante: es lo que
                // `consulta_valores` publica en su columna «Tipo», y dos pantallas que
                // nombren distinto el mismo documento son dos vocabularios que mantener.
                valor.tipo().codigo(),
                valor.numero(),
                valor.ejercicio(),
                valor.fechaEmision(),
                fila.tributos(),
                fila.periodo(),
                fila.situacion().name(),
                fila.situacionA(),
                valor.montoInsoluto(),
                valor.montoReajuste(),
                valor.montoInteres(),
                valor.montoGasto(),
                valor.total(),
                valor.proyectadoA());
    }
}
