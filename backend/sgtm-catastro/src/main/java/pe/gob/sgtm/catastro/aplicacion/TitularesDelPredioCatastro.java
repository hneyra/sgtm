package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.TitularDelPredio;
import pe.gob.sgtm.catastro.TitularesDelPredio;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Titularidad;

/**
 * Implementacion de {@link TitularesDelPredio} (#366, ADR-0015 §2.4).
 *
 * <p>Es una proyeccion y nada mas: la vigencia a la fecha la resuelve el repositorio, que ya sabe
 * hacerlo para {@code PrediosDelContribuyente} y para la grilla, y duplicarla aqui —o resolver «la
 * ultima» filtrando en memoria— es el defecto que la ficha del contribuyente (#24) ya pago una vez.
 */
@Service
public class TitularesDelPredioCatastro implements TitularesDelPredio {

    private final CatastroRepository repositorio;

    public TitularesDelPredioCatastro(CatastroRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TitularDelPredio> de(long predioId, LocalDate fecha) {
        Objects.requireNonNull(fecha, "De quien es el predio se pregunta a una fecha (regla 9)");
        List<TitularDelPredio> cuotas = new ArrayList<>();
        for (Titularidad titularidad : repositorio.titularesDe(predioId, fecha)) {
            cuotas.add(
                    new TitularDelPredio(
                            titularidad.contribuyenteId(),
                            titularidad.condicion().name(),
                            titularidad.porcentaje()));
        }
        return cuotas;
    }
}
