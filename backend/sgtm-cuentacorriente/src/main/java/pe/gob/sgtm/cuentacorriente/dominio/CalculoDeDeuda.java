package pe.gob.sgtm.cuentacorriente.dominio;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * {@code deudaActualizadaA(fecha)}: la funcion sobre la que se apoya toda la cobranza (RF-042,
 * ADR-0012 de {@code ../srtm}).
 *
 * <p><b>Funcion pura</b> (regla 6): todo lo que necesita entra como argumento. Sin base de datos,
 * sin reloj interno y sin configuracion global —la fecha de corte, la {@link PoliticaDeMora} y la
 * {@link PoliticaDeRedondeo} las trae quien llama—. Los mismos asientos y los mismos parametros dan
 * el mismo centimo hoy y dentro de diez anios.
 *
 * <p><b>Recorre el libro, no lo modifica.</b> Este contexto no tiene {@code UPDATE} ni {@code
 * DELETE} sobre {@code cuenta_corriente_asiento} (V7): el insoluto, el reajuste, el interes y el
 * gasto ya asentados salen de netear cargos contra abonos por concepto, tal como estan en el libro.
 * Lo unico que esta funcion agrega es el interes y el reajuste <b>todavia no asentados</b> —desde
 * el ultimo movimiento conocido hasta la fecha de corte—, porque «el interes se calcula, no se
 * asienta» (ADR-0012): asentarlo dia a dia produciria miles de millones de filas sin aportar
 * informacion, ya que es una funcion determinista del insoluto, la fecha y la {@link
 * PoliticaDeMora} vigente.
 */
public final class CalculoDeDeuda {

    private final PoliticaDeMora mora;

    public CalculoDeDeuda(PoliticaDeMora mora) {
        this.mora = Objects.requireNonNull(mora, "El calculo necesita su politica de mora");
    }

    /**
     * La deuda de una obligacion a una fecha de corte.
     *
     * @param asientos los de <b>una</b> obligacion —ya la resolvio quien llama, con {@link
     *     CriterioDeDeuda}—; un asiento de otra obligacion mezclaria cargos y abonos que no se
     *     corresponden
     * @param fecha la fecha de corte (regla 9, RNF-075): ningun asiento posterior al corte entra, y
     *     la deuda del futuro no existe todavia
     * @param redondeo la politica con la que {@link PoliticaDeMora} redondea lo que acumula (D-03)
     */
    public DeudaActualizada deudaActualizadaA(
            List<Asiento> asientos, LocalDate fecha, PoliticaDeRedondeo redondeo) {
        Objects.requireNonNull(asientos, "La lista de asientos es vacia, no nula");
        Objects.requireNonNull(fecha, "La fecha de corte entra como argumento (regla 6, RNF-075)");
        Objects.requireNonNull(redondeo, "La politica de redondeo se recibe, no se fija (D-03)");

        List<Asiento> hastaElCorte =
                asientos.stream().filter(a -> !a.fechaValor().isAfter(fecha)).toList();

        Dinero insoluto = netear(hastaElCorte, Concepto.INSOLUTO);
        Dinero gasto = netear(hastaElCorte, Concepto.GASTO);
        Dinero reajuste = netear(hastaElCorte, Concepto.REAJUSTE);
        Dinero interes = netear(hastaElCorte, Concepto.INTERES);

        if (insoluto.esPositivo()) {
            LocalDate desde = ultimoMovimiento(hastaElCorte).orElse(fecha);
            if (desde.isBefore(fecha)) {
                reajuste = reajuste.mas(mora.reajusteAcumulado(insoluto, desde, fecha, redondeo));
                interes = interes.mas(mora.interesAcumulado(insoluto, desde, fecha, redondeo));
            }
        }

        return new DeudaActualizada(fecha, insoluto, reajuste, interes, gasto);
    }

    /**
     * Lo que el libro <b>ya tiene asentado</b> a esa fecha: las mismas cuatro partes, neteadas,
     * pero <b>sin</b> agregar el reajuste ni el interes que todavia no se asentaron.
     *
     * <p>Existe por la cobranza (#33). {@link #deudaActualizadaA} devuelve lo que hay que cobrar, y
     * ahi dentro va una parte que <b>no esta en el libro</b> —«el interes se calcula, no se
     * asienta»—. Cuando el dinero entra por ventanilla eso deja de ser una proyeccion y pasa a ser
     * un hecho: hay que asentar el cargo de lo devengado antes de abonar el pago, o el abono del
     * interes dejaria {@code netear(INTERES)} en negativo para siempre y la obligacion quedaria con
     * deuda negativa.
     *
     * <p>La diferencia entre las dos funciones es exactamente lo que hay que cristalizar. Que sean
     * dos metodos de la misma clase pura, sobre los mismos asientos, es lo que garantiza que se
     * netee igual en los dos: calcular una en el dominio y la otra en un {@code SUM} de SQL seria
     * volver a tener dos definiciones de lo mismo.
     *
     * @param asientos los de <b>una</b> obligacion
     * @param fecha la fecha de corte; ningun asiento posterior entra
     */
    public DeudaActualizada asentadoA(List<Asiento> asientos, LocalDate fecha) {
        Objects.requireNonNull(asientos, "La lista de asientos es vacia, no nula");
        Objects.requireNonNull(fecha, "La fecha de corte entra como argumento (regla 6, RNF-075)");

        List<Asiento> hastaElCorte =
                asientos.stream().filter(a -> !a.fechaValor().isAfter(fecha)).toList();

        return new DeudaActualizada(
                fecha,
                netear(hastaElCorte, Concepto.INSOLUTO),
                netear(hastaElCorte, Concepto.REAJUSTE),
                netear(hastaElCorte, Concepto.INTERES),
                netear(hastaElCorte, Concepto.GASTO));
    }

    /**
     * Cargos suman, abonos restan: el mismo signo que fija {@link TipoAsiento} en todo el libro.
     */
    private static Dinero netear(List<Asiento> asientos, Concepto concepto) {
        Dinero total = Dinero.CERO;
        for (Asiento asiento : asientos) {
            if (asiento.concepto() != concepto) {
                continue;
            }
            total =
                    asiento.tipo() == TipoAsiento.CARGO
                            ? total.mas(asiento.monto())
                            : total.menos(asiento.monto());
        }
        return total;
    }

    /**
     * El punto desde el que todavia no hay nada asentado: la fecha valor mas reciente que ya se
     * conoce. Desde ahi hasta el corte es el tramo que {@link PoliticaDeMora} tiene que acumular.
     */
    private static Optional<LocalDate> ultimoMovimiento(List<Asiento> asientos) {
        return asientos.stream().map(Asiento::fechaValor).max(Comparator.naturalOrder());
    }
}
