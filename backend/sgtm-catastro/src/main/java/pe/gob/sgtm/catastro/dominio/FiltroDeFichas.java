package pe.gob.sgtm.catastro.dominio;

import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * Los filtros de la consulta transversal de fichas (RF-006).
 *
 * <p>Son exactamente los que declara la pantalla en el contrato: codigo de referencia catastral,
 * titular, manzana y lote. No hay aqui un «buscar cualquier cosa»: cada filtro apunta a una
 * columna, y una consulta que acepta texto libre acaba haciendo {@code LIKE '%…%'} sobre todo el
 * padron.
 *
 * <p>{@code contribuyente} es distinto de los otros tres: no es una columna de catastro. Se
 * resuelve preguntandole al padron, y por aproximacion —el nombre llega mal escrito desde
 * ventanilla mas a menudo que bien—.
 *
 * <p><b>Lo que no esta y por que.</b> El contrato declara tambien {@code conciliadaConRentas}, que
 * compara el catastro con la declaracion jurada del padron de rentas. Ese contexto todavia no
 * existe, y responderlo leyendo su tabla desde aqui seria el acoplamiento que ARQ-01 §4 evita, con
 * el agravante de ser invisible para Spring Modulith. Queda para cuando {@code rentas} publique su
 * lado.
 */
public record FiltroDeFichas(
        @Nullable String codRefCatastral,
        @Nullable String contribuyente,
        @Nullable String manzana,
        @Nullable String lote,
        @Nullable TipoFicha tipo) {

    public FiltroDeFichas {
        codRefCatastral = limpio(codRefCatastral);
        contribuyente = limpio(contribuyente);
        manzana = limpio(manzana);
        lote = limpio(lote);
    }

    public static FiltroDeFichas ninguno() {
        return new FiltroDeFichas(null, null, null, null, null);
    }

    public Optional<String> porContribuyente() {
        return Optional.ofNullable(contribuyente);
    }

    /** Si no filtra por nada. Una consulta asi devuelve el padron paginado, que es legitimo. */
    public boolean estaVacio() {
        return codRefCatastral == null
                && contribuyente == null
                && manzana == null
                && lote == null
                && tipo == null;
    }

    private static @Nullable String limpio(@Nullable String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.strip();
        return recortado.isEmpty() ? null : recortado;
    }
}
