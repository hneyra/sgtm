package pe.gob.sgtm.valores.dobles;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.valores.dominio.Prescripcion;
import pe.gob.sgtm.valores.dominio.PrescripcionRepository;

/** Un {@link PrescripcionRepository} en memoria, para las pruebas de los casos de uso de #39. */
public final class PrescripcionesEnMemoria implements PrescripcionRepository {

    private final List<Prescripcion> guardadas = new ArrayList<>();
    private long siguienteId = 1;

    @Override
    public Prescripcion insertar(Prescripcion prescripcion) {
        Prescripcion conId =
                new Prescripcion(
                        siguienteId++,
                        prescripcion.contribuyenteId(),
                        prescripcion.tributo(),
                        prescripcion.ejercicioDesde(),
                        prescripcion.ejercicioHasta(),
                        prescripcion.fechaPresentacion(),
                        prescripcion.causal(),
                        prescripcion.plazo(),
                        prescripcion.conjuntoId(),
                        prescripcion.resultado(),
                        prescripcion.resolucion(),
                        prescripcion.ejercicios(),
                        prescripcion.hechos(),
                        "prueba",
                        prescripcion.observacion());
        guardadas.add(conId);
        return conId;
    }

    @Override
    public Optional<Prescripcion> porId(long id) {
        return guardadas.stream().filter(p -> p.id() != null && p.id() == id).findFirst();
    }
}
