package pe.gob.sgtm.documentos;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * Lo que hay que imprimir, sin decir en que formato.
 *
 * <p>Es la pieza que hace que los tres formatos digan lo mismo. Cada renderizador recibe este
 * modelo y no los datos de negocio, asi que un reporte nuevo se exporta a los tres <b>sin escribir
 * nada</b> para cada uno. Si cada formato se construyera aparte, un dia el PDF llevaria una columna
 * que la hoja de calculo no, y nadie sabria cual de los dos esta bien.
 *
 * <p><b>Todo es texto ya formateado.</b> Este paquete no sabe redondear —eso es D-03— ni de que
 * moneda es una cifra: quien construye el modelo ya lo decidio.
 *
 * <p><b>{@code aLaFecha} es obligatoria.</b> Toda cifra impresa dice de cuando es (RNF-075, regla
 * 9). Un papel sin fecha no sirve para discutir nada, y hacerla opcional garantiza que alguna
 * pantalla la olvide.
 *
 * @param duplicado nulo en el original; con texto, el documento sale marcado
 */
public record ModeloDeDocumento(
        String titulo,
        @Nullable String subtitulo,
        LocalDate aLaFecha,
        List<Campo> cabecera,
        List<Tabla> tablas,
        List<String> pie,
        @Nullable String duplicado) {

    public ModeloDeDocumento {
        Objects.requireNonNull(titulo, "El documento necesita su titulo");
        Objects.requireNonNull(aLaFecha, "Toda cifra impresa dice de cuando es (RNF-075, regla 9)");
        Objects.requireNonNull(cabecera, "La lista de campos es vacia, no nula");
        Objects.requireNonNull(tablas, "La lista de tablas es vacia, no nula");
        Objects.requireNonNull(pie, "La lista de lineas del pie es vacia, no nula");

        titulo = titulo.strip();
        if (titulo.isEmpty()) {
            throw new IllegalArgumentException("El titulo del documento no puede estar en blanco");
        }
        cabecera = List.copyOf(cabecera);
        tablas = List.copyOf(tablas);
        pie = List.copyOf(pie);
    }

    public static ModeloDeDocumento de(
            String titulo, LocalDate aLaFecha, List<Campo> cabecera, List<Tabla> tablas) {
        return new ModeloDeDocumento(titulo, null, aLaFecha, cabecera, tablas, List.of(), null);
    }

    /**
     * El mismo documento, marcado como reimpresion.
     *
     * <p>La marca no es cosmetica: un duplicado sin marcar circula como si fuera el original, y en
     * un procedimiento coactivo eso es un documento de mas en el expediente.
     */
    public ModeloDeDocumento comoDuplicado(int numero) {
        if (numero < 1) {
            throw new IllegalArgumentException("El primer duplicado es el 1, no el " + numero);
        }
        return new ModeloDeDocumento(
                titulo, subtitulo, aLaFecha, cabecera, tablas, pie, "DUPLICADO N° " + numero);
    }

    public ModeloDeDocumento con(List<String> lineasDePie) {
        return new ModeloDeDocumento(
                titulo, subtitulo, aLaFecha, cabecera, tablas, lineasDePie, duplicado);
    }

    public boolean esDuplicado() {
        return duplicado != null;
    }
}
