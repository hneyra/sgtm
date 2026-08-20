package pe.gob.sgtm.catastro.dominio;

import java.util.List;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;

/**
 * Aranceles, valores unitarios de edificacion y depreciacion, siempre <b>acotados a un conjunto</b>
 * (#17).
 *
 * <p>Ningun metodo admite solo el ejercicio, por el mismo motivo que {@code
 * ValorReferencialRepository} de {@code rentas}: resolver por ejercicio devuelve la version que
 * rige hoy, no la que se uso al determinar. Con dos versiones selladas del mismo ejercicio —un
 * arancel corregido a mitad de ano— recalcular una determinacion daria otra cifra sin ningun error
 * de por medio. Quien traduce el ejercicio a un conjunto es {@code LectorDeParametros}, una sola
 * vez.
 *
 * <p>Los tres {@code guardar*} insertan sin comprobar el estado del conjunto: esa comprobacion no
 * vive aqui porque no puede vivir aqui de forma confiable —una carga masiva concurrente burlaria
 * una comprobacion de aplicacion—. La vive el disparador {@code
 * valuacion_de_conjunto_sellado_es_inmutable} de {@code V18}, en la base, que es quien la hace
 * imposible de rodear.
 */
public interface ValuacionRepository {

    List<Arancel> arancelesDe(IdentificadorDeConjunto conjunto);

    Arancel guardarArancel(Arancel arancel, IdentificadorDeConjunto conjunto);

    List<ValorUnitarioEdificacion> valoresUnitariosDe(IdentificadorDeConjunto conjunto);

    ValorUnitarioEdificacion guardarValorUnitario(
            ValorUnitarioEdificacion valorUnitario, IdentificadorDeConjunto conjunto);

    List<Depreciacion> depreciacionesDe(IdentificadorDeConjunto conjunto);

    Depreciacion guardarDepreciacion(Depreciacion depreciacion, IdentificadorDeConjunto conjunto);
}
