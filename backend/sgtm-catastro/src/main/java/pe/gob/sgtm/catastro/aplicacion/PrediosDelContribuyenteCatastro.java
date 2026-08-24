package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.PredioDelContribuyente;
import pe.gob.sgtm.catastro.PrediosDelContribuyente;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Titularidad;

/** Implementacion de {@link PrediosDelContribuyente}. */
@Service
public class PrediosDelContribuyenteCatastro implements PrediosDelContribuyente {

    private final CatastroRepository repositorio;

    public PrediosDelContribuyenteCatastro(CatastroRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PredioDelContribuyente> de(long contribuyenteId, LocalDate fecha) {
        List<Titularidad> titularidades = repositorio.prediosDe(contribuyenteId, fecha);
        List<PredioDelContribuyente> resultado = new ArrayList<>();
        for (Titularidad titularidad : titularidades) {
            Predio predio =
                    repositorio
                            .predio(titularidad.predioId())
                            .orElseThrow(
                                    () ->
                                            new IllegalStateException(
                                                    "La titularidad "
                                                            + titularidad.id()
                                                            + " referencia un predio que no"
                                                            + " existe: "
                                                            + titularidad.predioId()));
            resultado.add(
                    new PredioDelContribuyente(
                            Objects.requireNonNull(
                                    predio.id(), "un predio leido de la base tiene id"),
                            predio.codigo().valor(),
                            predio.tipo().name(),
                            predio.direccion(),
                            titularidad.porcentaje()));
        }
        return resultado;
    }
}
