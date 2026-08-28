package pe.gob.sgtm.fiscalizacion.dobles;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.CaracteristicasDelPredio;
import pe.gob.sgtm.catastro.LectorDeCaracteristicas;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.catastro.PadronDePredios;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;

/**
 * El catastro de mentira: padron, fichas y caracteristicas.
 *
 * <p><b>Solo lee.</b> No tiene un solo metodo que escriba, y eso es lo que hace comprobable el AC 4
 * de #49 —«nada de esto escribe en catastro ni en rentas»— desde el propio tipo: si algun dia
 * {@code fiscalizacion} intentara escribir, no habria por donde.
 */
public final class PadronDeMentira
        implements PadronDePredios, LectorDeFichas, LectorDeCaracteristicas {

    private final List<PredioDelPadron> predios = new ArrayList<>();
    private final Map<Long, AreaM2> areasPorFicha = new HashMap<>();
    private final Map<Long, CaracteristicasDelPredio> caracteristicas = new HashMap<>();
    private final Map<Long, Long> fichaVigentePorPredio = new HashMap<>();

    public PadronDeMentira con(PredioDelPadron predio) {
        predios.add(predio);
        return this;
    }

    /** Registra una version de ficha con su area. */
    public PadronDeMentira conFicha(long fichaId, AreaM2 area) {
        areasPorFicha.put(fichaId, area);
        return this;
    }

    /** Lo que la ficha vigente de un predio dice a cualquier fecha. */
    public PadronDeMentira conCaracteristicas(
            long predioId, @Nullable String uso, @Nullable AreaM2 area, long fichaVigenteId) {
        caracteristicas.put(predioId, new CaracteristicasDelPredio(uso, "S-01", area));
        fichaVigentePorPredio.put(predioId, fichaVigenteId);
        return this;
    }

    @Override
    public Pagina<PredioDelPadron> porSector(
            @Nullable String sectorCodigo, LocalDate aLaFecha, Paginacion paginacion) {
        List<PredioDelPadron> filtrados =
                predios.stream()
                        .filter(
                                p ->
                                        sectorCodigo == null
                                                || Objects.equals(p.sectorCodigo(), sectorCodigo))
                        .toList();
        return Pagina.de(filtrados, paginacion, filtrados.size());
    }

    @Override
    public Optional<Long> fichaVigenteEn(long predioId, LocalDate fecha) {
        return Optional.ofNullable(fichaVigentePorPredio.get(predioId));
    }

    @Override
    public Optional<AreaM2> areaDeLaVersion(long fichaId) {
        return Optional.ofNullable(areasPorFicha.get(fichaId));
    }

    @Override
    public Optional<CaracteristicasDelPredio> de(long predioId, LocalDate fecha) {
        return Optional.ofNullable(caracteristicas.get(predioId));
    }
}
