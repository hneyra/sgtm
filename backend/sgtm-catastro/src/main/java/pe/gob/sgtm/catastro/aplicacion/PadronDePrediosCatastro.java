package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.PadronDePredios;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Implementación de {@link PadronDePredios} (#49, RF-055).
 *
 * <p>{@code @Transactional(readOnly = true)} no es decorativo: sin transacción no hay {@code SET
 * LOCAL}, y sin él la política RLS <b>falla</b> en vez de devolver filas. Es el defecto que la
 * marcha blanca destapó en {@code GET /catastro/vias} y que {@code ConsultaDeVias} arregló.
 */
@Service
public class PadronDePrediosCatastro implements PadronDePredios {

    private final CatastroRepository repositorio;

    public PadronDePrediosCatastro(CatastroRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public Pagina<PredioDelPadron> porSector(
            @Nullable String sectorCodigo, LocalDate aLaFecha, Paginacion paginacion) {
        return repositorio.padron(vacioAnulo(sectorCodigo), aLaFecha, paginacion);
    }

    private static @Nullable String vacioAnulo(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }
}
