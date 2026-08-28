package pe.gob.sgtm.fiscalizacion.dobles;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;

/** Actas en memoria, para probar los casos de uso sin base de datos. */
public final class ActasEnMemoria implements ActaFiscalizacionRepository {

    private final List<ActaFiscalizacion> guardadas = new ArrayList<>();
    private long siguiente = 1;

    @Override
    public ActaFiscalizacion insertar(ActaFiscalizacion acta) {
        ActaFiscalizacion guardada = conIdentificador(acta, siguiente++);
        guardadas.add(guardada);
        return guardada;
    }

    @Override
    public Optional<ActaFiscalizacion> findById(long id) {
        return guardadas.stream().filter(acta -> acta.id() != null && acta.id() == id).findFirst();
    }

    @Override
    public int siguienteVersion(long programaId, long contribuyenteId) {
        return (int)
                        guardadas.stream()
                                .filter(
                                        acta ->
                                                acta.programaId() == programaId
                                                        && acta.contribuyenteId()
                                                                == contribuyenteId)
                                .count()
                + 1;
    }

    /** Siembra un acta ya guardada y devuelve su identificador. */
    public long sembrar(ActaFiscalizacion acta) {
        ActaFiscalizacion guardada = insertar(acta);
        return java.util.Objects.requireNonNull(guardada.id());
    }

    private static ActaFiscalizacion conIdentificador(ActaFiscalizacion acta, long id) {
        return new ActaFiscalizacion(
                id,
                acta.programaId(),
                acta.version(),
                acta.contribuyenteId(),
                acta.predioId(),
                acta.vehiculoId(),
                acta.fichaId(),
                acta.fechaVisita(),
                acta.fiscalizador(),
                acta.hallazgo(),
                acta.areaHallada(),
                acta.detalle(),
                acta.estado(),
                acta.observacion());
    }
}
