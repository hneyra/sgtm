package pe.gob.sgtm.cuentacorriente.dominio;

import java.time.OffsetDateTime;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;

/**
 * El saldo insoluto de una clave, tal como esta proyectado en la cache.
 *
 * <p><b>No es la verdad.</b> La verdad es el libro (ADR-0006): esto existe porque recorrer los
 * asientos de un contribuyente cuesta mas que leer un campo y la caja no puede esperar. Si diverge,
 * manda el libro, y por eso hay una conciliacion que <b>reporta</b> las divergencias en vez de
 * corregirlas en silencio: una cache que se arregla sola esconde el defecto que la desajusto.
 *
 * <p><b>No lleva interes ni reajuste</b>, solo el insoluto. Actualizar a una fecha es una regla
 * tributaria —{@code deudaActualizadaA}, #22— y esta bloqueada por D-02a. Proyectar aqui una cifra
 * «actualizada» seria peor que no tenerla: quedaria congelada al instante en que se calculo y nadie
 * lo notaria, porque el campo no dice de cuando es.
 *
 * @param ultimoAsientoId hasta que asiento del libro esta proyectado este saldo; es lo que permite
 *     a una consulta <b>demostrar</b> que coincide con el libro en vez de suponerlo
 * @param fechaCalculo cuando se proyecto por ultima vez
 */
public record SaldoProyectado(
        @Nullable Long id,
        ClaveDeSaldo clave,
        Dinero insoluto,
        @Nullable Long ultimoAsientoId,
        @Nullable OffsetDateTime fechaCalculo) {

    public SaldoProyectado {
        Objects.requireNonNull(clave, "El saldo necesita su clave");
        Objects.requireNonNull(insoluto, "El saldo necesita su importe");
    }

    public static SaldoProyectado en(ClaveDeSaldo clave, Dinero insoluto) {
        return new SaldoProyectado(null, clave, insoluto, null, null);
    }

    /**
     * Si este saldo esta proyectado hasta ese punto del libro.
     *
     * <p>Es lo que una consulta de cobranza tiene que poder responder antes de tomar la cifra:
     * «coincide con el libro a esta fecha». Sin esto, usar la cache es creerle.
     */
    public boolean estaAlDiaHasta(@Nullable Long ultimoAsientoDelLibro) {
        if (ultimoAsientoDelLibro == null) {
            // El libro no tiene asientos para esta clave: el saldo esta al dia si es cero.
            return insoluto.esCero();
        }
        return ultimoAsientoId != null && ultimoAsientoId >= ultimoAsientoDelLibro;
    }

    public boolean estaEnCero() {
        return insoluto.esCero();
    }
}
