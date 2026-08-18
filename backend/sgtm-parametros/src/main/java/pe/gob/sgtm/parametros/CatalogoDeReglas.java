package pe.gob.sgtm.parametros;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Las implementaciones de reglas disponibles, con su vigencia.
 *
 * <h2>La regla que gobierna esta clase</h2>
 *
 * <p><b>Dos implementaciones de la misma regla no pueden tener vigencias que se solapen.</b> De ahi
 * salen las dos garantias que ADR-0007 necesita:
 *
 * <ul>
 *   <li>Para una fecha dada hay <b>una</b> implementacion de cada regla, asi que el calculo es
 *       determinista. Con solape habria dos candidatas y el resultado dependeria del orden en que
 *       se registraron, que es la peor clase de dependencia porque no se ve.
 *   <li>Una implementacion ya usada <b>no se puede editar</b>: intentar sustituirla es intentar
 *       registrar otra sobre su mismo rango, y eso se rechaza. La unica salida es cerrarle la
 *       vigencia y abrir la siguiente a continuacion, que es lo que deja la version anterior
 *       intacta para recalcular lo que se emitio con ella.
 * </ul>
 *
 * <p>El catalogo es inmutable: {@link #con} devuelve uno nuevo. Asi el que ya se uso en una emision
 * no puede cambiar bajo los pies de nadie.
 */
public final class CatalogoDeReglas {

    /**
     * En orden de registro, y en una lista y no en un mapa por identificador.
     *
     * <p>La primera version usaba {@code Map<IdentificadorDeRegla, List<ReglaTributaria>>} y una
     * prueba la puso en rojo: {@code Map.copyOf} <b>no conserva el orden de insercion</b>, asi que
     * la secuencia de reglas salia distinta entre ejecuciones. En un motor donde el orden es parte
     * del calculo —valor unitario, mas 5 %, menos depreciacion, por area— eso es un padron
     * calculado de dos maneras segun el dia.
     */
    private final List<ReglaTributaria> enOrdenDeRegistro;

    private CatalogoDeReglas(List<ReglaTributaria> enOrdenDeRegistro) {
        this.enOrdenDeRegistro = enOrdenDeRegistro;
    }

    public static CatalogoDeReglas vacio() {
        return new CatalogoDeReglas(List.of());
    }

    public static CatalogoDeReglas de(ReglaTributaria... reglas) {
        CatalogoDeReglas catalogo = vacio();
        for (ReglaTributaria regla : reglas) {
            catalogo = catalogo.con(regla);
        }
        return catalogo;
    }

    /**
     * El mismo catalogo mas una implementacion.
     *
     * @throws VigenciasQueSeSolapan si ya hay una implementacion de esa regla cuyo rango se cruza
     */
    public CatalogoDeReglas con(ReglaTributaria regla) {
        Objects.requireNonNull(regla, "No se registra una regla nula");

        for (ReglaTributaria existente : enOrdenDeRegistro) {
            if (existente.identificador().equals(regla.identificador())
                    && seSolapan(existente.vigencia(), regla.vigencia())) {
                throw new VigenciasQueSeSolapan(regla.identificador());
            }
        }

        List<ReglaTributaria> ampliado = new ArrayList<>(enOrdenDeRegistro);
        ampliado.add(regla);
        return new CatalogoDeReglas(List.copyOf(ampliado));
    }

    /**
     * Las reglas vigentes a una fecha, en el orden en que se registraron.
     *
     * <p>El orden es el de registro y no el alfabetico del identificador: el orden en que se
     * aplican las reglas es parte del calculo —la secuencia de la construccion es valor unitario,
     * mas 5 %, menos depreciacion, por area— y ordenarlo por su nombre seria una coincidencia que
     * se rompe el dia que se agregue una regla intermedia.
     */
    public List<ReglaTributaria> vigentesEn(LocalDate fecha) {
        List<ReglaTributaria> vigentes = new ArrayList<>();
        for (ReglaTributaria regla : enOrdenDeRegistro) {
            if (regla.vigencia().vigenteEn(fecha)) {
                vigentes.add(regla);
            }
        }
        return List.copyOf(vigentes);
    }

    public boolean estaVacio() {
        return enOrdenDeRegistro.isEmpty();
    }

    private static boolean seSolapan(
            pe.gob.sgtm.dominio.Vigencia una, pe.gob.sgtm.dominio.Vigencia otra) {
        LocalDate inicioDeUna = una.desde() == null ? LocalDate.MIN : una.desde();
        LocalDate finDeUna = una.hasta() == null ? LocalDate.MAX : una.hasta();
        LocalDate inicioDeOtra = otra.desde() == null ? LocalDate.MIN : otra.desde();
        LocalDate finDeOtra = otra.hasta() == null ? LocalDate.MAX : otra.hasta();

        return !finDeUna.isBefore(inicioDeOtra) && !finDeOtra.isBefore(inicioDeUna);
    }

    /** Se intento registrar una implementacion sobre el rango de otra que ya existe. */
    public static final class VigenciasQueSeSolapan extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        VigenciasQueSeSolapan(IdentificadorDeRegla identificador) {
            super(
                    "Ya hay una implementacion de "
                            + identificador
                            + " cuya vigencia se cruza con la nueva. Una implementacion que ya se"
                            + " uso en una emision no se modifica: se le cierra la vigencia y se"
                            + " abre la siguiente a continuacion (ADR-0007)");
        }
    }
}
