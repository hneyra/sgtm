package pe.gob.sgtm.tesoreria.dobles;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import pe.gob.sgtm.tesoreria.dominio.Caja;
import pe.gob.sgtm.tesoreria.dominio.CajaRepository;

/** Las cajas, en memoria. */
public final class CajasEnMemoria implements CajaRepository {

    private final Map<String, Caja> porCodigo = new LinkedHashMap<>();

    public CajasEnMemoria con(Caja caja) {
        porCodigo.put(caja.codigo().toUpperCase(Locale.ROOT), caja);
        return this;
    }

    @Override
    public Optional<Caja> porCodigo(String codigo) {
        return Optional.ofNullable(porCodigo.get(codigo.strip().toUpperCase(Locale.ROOT)));
    }

    @Override
    public Optional<Caja> porId(long id) {
        return porCodigo.values().stream()
                .filter(caja -> caja.id() != null && caja.id() == id)
                .findFirst();
    }

    @Override
    public Caja insertar(Caja caja) {
        String clave = caja.codigo().toUpperCase(Locale.ROOT);
        if (porCodigo.containsKey(clave)) {
            throw new IllegalStateException("Ya hay una caja con el codigo '" + clave + "'");
        }
        Caja guardada =
                new Caja(
                        (long) (porCodigo.size() + 1),
                        caja.codigo(),
                        caja.nombre(),
                        caja.serie(),
                        caja.areaId(),
                        caja.activa());
        porCodigo.put(clave, guardada);
        return guardada;
    }
}
