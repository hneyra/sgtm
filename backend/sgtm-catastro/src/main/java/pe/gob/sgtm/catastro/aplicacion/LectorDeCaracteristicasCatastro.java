package pe.gob.sgtm.catastro.aplicacion;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.catastro.CaracteristicasDelPredio;
import pe.gob.sgtm.catastro.LectorDeCaracteristicas;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.FichaCatastralRepository;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.TipoFicha;

/** Implementacion de {@link LectorDeCaracteristicas}. */
@Service
public class LectorDeCaracteristicasCatastro implements LectorDeCaracteristicas {

    private final CatastroRepository catastro;
    private final FichaCatastralRepository fichas;

    public LectorDeCaracteristicasCatastro(
            CatastroRepository catastro, FichaCatastralRepository fichas) {
        this.catastro = catastro;
        this.fichas = fichas;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CaracteristicasDelPredio> de(long predioId, LocalDate fecha) {
        Optional<Predio> predio = catastro.predio(predioId);
        if (predio.isEmpty()) {
            return Optional.empty();
        }

        String uso =
                fichas.vigenteA(predioId, TipoFicha.UNICA, fecha)
                        .map(ficha -> ficha.uso())
                        .orElse(null);

        Long sectorId = predio.get().sectorId();
        String sectorCodigo =
                sectorId == null
                        ? null
                        : catastro.sectorPorId(sectorId).map(Sector::codigo).orElse(null);

        return Optional.of(new CaracteristicasDelPredio(uso, sectorCodigo));
    }
}
