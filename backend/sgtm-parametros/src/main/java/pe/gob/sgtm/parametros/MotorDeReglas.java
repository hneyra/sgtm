package pe.gob.sgtm.parametros;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Aplica las reglas vigentes a una fecha, en orden, encadenando el importe.
 *
 * <p>Es todo lo que hace, y es a proposito: el motor no decide <b>que</b> se calcula —eso lo dice
 * el catalogo— ni <b>cuanto</b> —eso lo dicen los parametros—. Su unica responsabilidad es que la
 * secuencia sea la misma hoy y en 2037, y que quede escrito cual fue.
 *
 * <p><b>No lee el reloj.</b> La fecha viene en la {@link EntradaDeCalculo}, y por eso dos
 * ejecuciones separadas por anios dan el mismo centimo mientras la entrada sea la misma.
 *
 * <p>Sin Spring y sin base de datos: se construye con un catalogo y se prueba con un {@code new}.
 */
public final class MotorDeReglas {

    private final CatalogoDeReglas catalogo;

    public MotorDeReglas(CatalogoDeReglas catalogo) {
        this.catalogo = Objects.requireNonNull(catalogo, "El motor necesita su catalogo de reglas");
    }

    /**
     * Aplica la secuencia.
     *
     * @throws SinReglasVigentes si a esa fecha no rige ninguna. Devolver la base sin tocar seria
     *     peor: produciria una cifra plausible y equivocada, sin ningun error de por medio.
     */
    public ResultadoDelCalculo aplicar(EntradaDeCalculo entrada) {
        List<ReglaTributaria> vigentes = catalogo.vigentesEn(entrada.fecha());
        if (vigentes.isEmpty()) {
            throw new SinReglasVigentes(entrada);
        }

        Dinero importe = entrada.base();
        List<IdentificadorDeRegla> aplicadas = new ArrayList<>();
        EntradaDeCalculo actual = entrada;

        for (ReglaTributaria regla : vigentes) {
            importe = regla.aplicar(actual);
            actual = actual.con(importe);
            aplicadas.add(regla.identificador());
        }

        return new ResultadoDelCalculo(
                importe,
                entrada.parametros().ejercicio(),
                entrada.parametros().version(),
                aplicadas);
    }

    /** A esa fecha no rige ninguna implementacion. */
    public static final class SinReglasVigentes extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        SinReglasVigentes(EntradaDeCalculo entrada) {
            super(
                    "Ninguna regla rige el "
                            + entrada.fecha()
                            + ". Devolver la base sin tocar produciria una cifra plausible y"
                            + " equivocada, sin ningun error de por medio");
        }
    }
}
