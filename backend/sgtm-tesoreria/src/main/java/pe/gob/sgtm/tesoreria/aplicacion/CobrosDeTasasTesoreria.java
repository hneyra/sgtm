package pe.gob.sgtm.tesoreria.aplicacion;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.tesoreria.CobrosDeTasas;
import pe.gob.sgtm.tesoreria.TasaCobrada;
import pe.gob.sgtm.tesoreria.dominio.LineaDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeReciboRepository;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.Recibo;
import pe.gob.sgtm.tesoreria.dominio.ReciboRepository;

/**
 * Implementa {@link CobrosDeTasas} (#50, RF-064).
 *
 * <p>Lee el recibo por su numero impreso, comprueba que <b>nadie lo anulo</b> —la anulacion es un
 * movimiento del recibo (#34), no una columna suya— y busca entre sus lineas la del concepto
 * pedido. Las lineas de tasa las escribe {@link CobrarTasa} con el codigo del TUPA en {@code
 * tributo} y {@code TASA} en {@code concepto}; ese par es lo que las distingue de una linea de
 * deuda tributaria en el mismo recibo.
 *
 * <p><b>Un numero mal formado no es un error</b>: es un recibo que no existe. Quien pregunta desde
 * otro contexto recibe un vacio y decide que hacer con el —en {@code sanciones}, negar la
 * liberacion—; lanzar una excepcion de validacion desde aqui obligaria a ese contexto a conocer el
 * formato de un numero de recibo, que es justo lo que este puerto existe para no exigir.
 */
@Service
public class CobrosDeTasasTesoreria implements CobrosDeTasas {

    /** El concepto con el que {@link CobrarTasa} rotula una linea de tasa. */
    private static final String CONCEPTO_TASA = "TASA";

    private final ReciboRepository recibos;
    private final MovimientoDeReciboRepository movimientos;

    public CobrosDeTasasTesoreria(
            ReciboRepository recibos, MovimientoDeReciboRepository movimientos) {
        this.recibos = recibos;
        this.movimientos = movimientos;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TasaCobrada> acreditar(String numeroDeRecibo, String codigoDeTasa) {
        Objects.requireNonNull(
                numeroDeRecibo, "Falta el numero del recibo que se quiere acreditar");
        Objects.requireNonNull(codigoDeTasa, "Falta el concepto del TUPA que se quiere acreditar");

        Optional<NumeroDeRecibo> numero = numeroDe(numeroDeRecibo);
        if (numero.isEmpty()) {
            return Optional.empty();
        }
        Optional<Recibo> emitido = recibos.porNumero(numero.get());
        if (emitido.isEmpty()) {
            return Optional.empty();
        }
        Recibo recibo = emitido.get();
        long reciboId =
                Objects.requireNonNull(recibo.id(), "Un recibo leido de la base tiene su id");
        if (movimientos.anulacionDe(reciboId).isPresent()) {
            return Optional.empty();
        }

        String buscado = codigoDeTasa.strip().toUpperCase(Locale.ROOT);
        for (LineaDeRecibo linea : recibo.lineas()) {
            if (!CONCEPTO_TASA.equals(linea.concepto()) || !buscado.equals(linea.tributo())) {
                continue;
            }
            Integer cantidad = linea.cantidad();
            return Optional.of(
                    new TasaCobrada(
                            numero.get().impreso(),
                            linea.tributo(),
                            cantidad == null ? 1 : cantidad,
                            totalDe(linea),
                            LocalDate.ofInstant(recibo.emitidoEn(), ZoneOffset.UTC)));
        }
        return Optional.empty();
    }

    /**
     * El importe de la linea: sus cuatro partes. Un derecho de tramite las lleva todas en cero
     * salvo el insoluto, pero sumarlas es lo unico que no depende de eso.
     */
    private static Dinero totalDe(LineaDeRecibo linea) {
        return linea.insoluto().mas(linea.reajuste()).mas(linea.interes()).mas(linea.gasto());
    }

    /**
     * Del numero impreso al objeto de valor. Devuelve vacio en vez de lanzar: ver el javadoc de la
     * clase.
     */
    private static Optional<NumeroDeRecibo> numeroDe(String impreso) {
        String texto = impreso.strip();
        int guion = texto.lastIndexOf('-');
        if (guion <= 0 || guion == texto.length() - 1) {
            return Optional.empty();
        }
        try {
            return Optional.of(
                    new NumeroDeRecibo(
                            texto.substring(0, guion), Long.parseLong(texto.substring(guion + 1))));
        } catch (IllegalArgumentException invalido) {
            return Optional.empty();
        }
    }
}
