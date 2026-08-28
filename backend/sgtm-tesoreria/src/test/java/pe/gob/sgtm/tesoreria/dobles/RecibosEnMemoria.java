package pe.gob.sgtm.tesoreria.dobles;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.tesoreria.dominio.Caja;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.Recibo;
import pe.gob.sgtm.tesoreria.dominio.ReciboRepository;

/** Los recibos, en memoria. Solo agrega: no hay forma de editar uno, igual que en la base. */
public final class RecibosEnMemoria implements ReciboRepository {

    private final List<Recibo> emitidos = new ArrayList<>();
    private final Map<String, Recibo> porClave = new LinkedHashMap<>();
    private final Map<String, Long> correlativos = new LinkedHashMap<>();
    private long siguienteId = 1;

    public List<Recibo> emitidos() {
        return List.copyOf(emitidos);
    }

    @Override
    public NumeroDeRecibo siguienteNumero(Caja caja) {
        long ultimo = correlativos.merge(caja.serie(), 1L, Long::sum);
        return caja.numero(ultimo);
    }

    @Override
    public Recibo emitir(Recibo recibo, @Nullable String claveDeIdempotencia) {
        Recibo guardado =
                new Recibo(
                        siguienteId++,
                        recibo.numero(),
                        recibo.cajaId(),
                        recibo.turnoId(),
                        recibo.cajero(),
                        recibo.contribuyenteId(),
                        recibo.emitidoEn(),
                        recibo.formaDePago(),
                        recibo.tipoDePago(),
                        recibo.campaniaBeneficio(),
                        recibo.actualizadoA(),
                        recibo.observacion(),
                        recibo.lineas());
        emitidos.add(guardado);
        if (claveDeIdempotencia != null) {
            porClave.put(claveDeIdempotencia, guardado);
        }
        return guardado;
    }

    @Override
    public Optional<Recibo> porClaveDeIdempotencia(String clave) {
        return Optional.ofNullable(porClave.get(clave));
    }

    @Override
    public Optional<Recibo> porNumero(NumeroDeRecibo numero) {
        return emitidos.stream().filter(r -> r.numero().equals(numero)).findFirst();
    }
}
