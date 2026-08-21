package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.catastro.dominio.FichaCatastralRepository;
import pe.gob.sgtm.catastro.dominio.TipoFicha;

/** Implementa {@link LectorDeFichas} sobre {@link FichaCatastralRepository} (#28). */
@Service
public class LectorDeFichasCatastro implements LectorDeFichas {

    private final FichaCatastralRepository repositorio;

    public LectorDeFichasCatastro(FichaCatastralRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Long> fichaVigenteEn(long predioId, LocalDate fecha) {
        return repositorio.vigenteA(predioId, TipoFicha.UNICA, fecha).map(ficha -> ficha.id());
    }
}
