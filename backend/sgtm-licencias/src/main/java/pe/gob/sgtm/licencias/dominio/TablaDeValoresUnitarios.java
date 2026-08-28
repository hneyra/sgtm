package pe.gob.sgtm.licencias.dominio;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import pe.gob.sgtm.dominio.ValorNormativo;

/**
 * El cuadro de valores unitarios de edificacion tal como la valorizacion del FUE lo consulta (#48
 * AC 2, RF-113).
 *
 * <h2>Es un envoltorio, no una copia</h2>
 *
 * <p>No guarda ninguna cifra propia: se construye con las celdas que {@code
 * catastro.LectorDeValoresUnitarios} entrega del conjunto sellado que rige, y su unica utilidad es
 * resolver «que vale la letra C de MUROS para una edificacion de 2026» sin recorrer una lista en
 * cada linea. Vaciarla y volverla a llenar del conjunto siguiente cambia toda la valorizacion sin
 * tocar una linea de codigo, que es lo que la regla 5 persigue.
 *
 * <h2>Lo que falta, falta con nombre</h2>
 *
 * <p>Una celda que no esta <b>no</b> vale cero: {@link ValorUnitarioSinParametrizar} dice que llave
 * falta. Es la diferencia entre «esta obra no vale nada» y «no sabemos cuanto vale esta obra», y la
 * primera es indistinguible de un calculo correcto si se devuelve un numero.
 */
public final class TablaDeValoresUnitarios {

    private final Map<String, ValorNormativo> celdas;
    private final int anioDeConstruccion;

    private TablaDeValoresUnitarios(Map<String, ValorNormativo> celdas, int anioDeConstruccion) {
        this.celdas = celdas;
        this.anioDeConstruccion = anioDeConstruccion;
    }

    /**
     * La tabla que rige a una edificacion construida en ese anio.
     *
     * <p>El cuadro es una matriz de <b>dos</b> dimensiones —categoria por anio de construccion,
     * como NEG-05 §RT-002 advierte— asi que la tabla se filtra al construirse: con el anio dentro,
     * quien valoriza pregunta por partida y categoria y no puede equivocarse de fila.
     *
     * @param celdas las del conjunto sellado, con su partida, su letra y su rango de anios
     * @param anioDeConstruccion el anio de la obra que se valoriza
     */
    public static TablaDeValoresUnitarios de(List<Celda> celdas, int anioDeConstruccion) {
        Objects.requireNonNull(celdas, "La tabla se construye con celdas, aunque sean cero");

        Map<String, ValorNormativo> porLlave = new LinkedHashMap<>();
        for (Celda celda : celdas) {
            if (celda.rigeEn(anioDeConstruccion)) {
                porLlave.put(llave(celda.partida(), celda.categoria()), celda.valorM2());
            }
        }
        return new TablaDeValoresUnitarios(Map.copyOf(porLlave), anioDeConstruccion);
    }

    /** Cuantas celdas rigen esa antiguedad. Cero significa que el cuadro no la cubre. */
    public int tamano() {
        return celdas.size();
    }

    /** El anio de construccion con el que se filtro. */
    public int anioDeConstruccion() {
        return anioDeConstruccion;
    }

    /**
     * El valor por metro cuadrado de esa partida en esa categoria.
     *
     * @throws ValorUnitarioSinParametrizar si el cuadro sellado no tiene esa celda
     */
    public ValorNormativo valorPorM2(PartidaDeEdificacion partida, char categoria) {
        Objects.requireNonNull(partida, "Hay que decir de que partida se pregunta");
        ValorNormativo valor = celdas.get(llave(partida.name(), categoria));
        if (valor == null) {
            throw new ValorUnitarioSinParametrizar(partida, categoria, anioDeConstruccion);
        }
        return valor;
    }

    private static String llave(String partida, char categoria) {
        return partida.toUpperCase(Locale.ROOT) + ":" + Character.toUpperCase(categoria);
    }

    // ------------------------------------------------------------------

    /**
     * Una celda del cuadro, tal como llega del conjunto sellado.
     *
     * @param partida MUROS, TECHOS, PISOS, PUERTAS, REVESTIMIENTOS, BANIOS o INSTALACIONES
     * @param categoria la letra
     * @param anioDesde extremo inferior del rango de anios de construccion
     * @param anioHasta extremo superior; nulo cuando la tabla no le pone tope
     * @param valorM2 la cifra normativa; sale de la tabla, nunca del codigo (regla 5)
     */
    public record Celda(
            String partida,
            char categoria,
            int anioDesde,
            @org.jspecify.annotations.Nullable Integer anioHasta,
            ValorNormativo valorM2) {

        public Celda {
            Objects.requireNonNull(partida, "La celda dice de que partida es");
            Objects.requireNonNull(valorM2, "La celda dice cuanto vale el metro cuadrado");
            partida = partida.strip().toUpperCase(Locale.ROOT);
        }

        boolean rigeEn(int anio) {
            Integer hasta = anioHasta;
            return anio >= anioDesde && (hasta == null || anio <= hasta);
        }
    }

    /**
     * El cuadro sellado no tiene la celda que la valorizacion necesita.
     *
     * <p>Que falle aqui, <b>nombrando la llave</b>, es preferible a que la valorizacion siga con un
     * cero o con un valor inventado: las celdas del cuadro estan bloqueadas por D-02a (#197, #200,
     * #233), y una valorizacion de cero soles es indistinguible de una correcta cuando llega al
     * papel que el administrado se lleva.
     */
    public static final class ValorUnitarioSinParametrizar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        private final String llave;

        ValorUnitarioSinParametrizar(
                PartidaDeEdificacion partida, char categoria, int anioDeConstruccion) {
            super(
                    String.format(
                            Locale.ROOT,
                            "El cuadro de valores unitarios sellado no tiene la celda %s:%s para"
                                    + " una edificacion de %d. Sin ella no se puede valorizar la obra, y"
                                    + " poner cero daria una valorizacion que nadie distingue de una"
                                    + " correcta (regla 5, AC 2 de #48; las cifras las espera #197)",
                            partida.name(),
                            Character.toUpperCase(categoria),
                            anioDeConstruccion));
            this.llave = partida.name() + ":" + Character.toUpperCase(categoria);
        }

        /** La llave que falta, {@code partida:categoria}, legible por programa. */
        public String llave() {
            return llave;
        }
    }
}
