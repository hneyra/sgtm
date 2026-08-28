package pe.gob.sgtm.parametros.aplicacion;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Vigencia;
import pe.gob.sgtm.parametros.dominio.LlaveDeParametro;
import pe.gob.sgtm.parametros.dominio.ParametroTributario;

/**
 * Una fila del manifiesto de cuadros normativos, ya analizada (D-13, ADR-0017).
 *
 * <p>Declara <b>una edicion</b> y de donde salen sus filas. Las once columnas son:
 *
 * <pre>
 * cuadro,tipo,clave,vigencia_desde,vigencia_hasta,documento_fuente,
 * archivo_de_filas,sha256,archivo_del_corpus,transcribio,verifico
 * </pre>
 *
 * <p>Igual que en {@link FilaPublicable}, las <b>tres columnas de la llave</b> —{@code tipo},
 * {@code clave}, {@code vigencia_desde}— salen en el orden que lee {@code
 * ImportarParametrosDelConjunto}, de modo que el mismo manifiesto sirve para publicar la edicion y
 * para componerla en un conjunto. Ahi la columna {@code cuadro} sobra y se ignora, como sobran las
 * demas.
 *
 * <p>Las dos firmas son las del corpus y viajan a {@code usuario_carga} y {@code usuario_aprueba},
 * donde {@code parametro_doble_verificacion_ck} exige que sean distintas. Quien corre el proceso no
 * firma nada.
 */
record FilaDelManifiesto(
        String cuadro,
        ParametroTributario cabecera,
        String archivoDeFilas,
        String sha256,
        String archivoDelCorpus,
        String transcribio,
        String verifico) {

    static final int COLUMNAS = 11;

    /**
     * El unico cuadro que este proceso sabe publicar hoy, y por que solo uno.
     *
     * <p>{@code VALOR_UNITARIO} y {@code DEPRECIACION} <b>no</b> estan, y no es que falte escribir
     * el codigo: es que sus dos tablas todavia no pueden recibir su cuadro sin perder una
     * dimension. El de valores unitarios se publica por region —Costa, Lima/Callao, Sierra y
     * Selva—, y ademas su archivo del corpus dice de si mismo que sus cifras no estan cotejadas
     * contra el Anexo I.2 de la RM. El de depreciacion son cuatro tablas, una por uso de la
     * edificacion, y {@code depreciacion} no tiene columna de uso: cargarlas hoy seria colapsar
     * cuatro tablas de la norma en una y dejar que la unicidad decida cual sobrevive.
     *
     * <p>Por eso el manifiesto que las nombre se rechaza nombrando el motivo, en vez de publicar un
     * cuadro incompleto que nadie distinguiria de uno completo.
     */
    static final String VEHICULAR = "VALOR_REFERENCIAL";

    LlaveDeParametro llave() {
        return new LlaveDeParametro(
                cabecera.tipo(),
                cabecera.clave(),
                java.util.Objects.requireNonNull(
                        cabecera.vigencia().desde(),
                        "La fila valida siempre trae fecha de inicio de vigencia"));
    }

    /** El ejercicio del cuadro: el ano en que empieza su vigencia. */
    int ejercicio() {
        return java.util.Objects.requireNonNull(cabecera.vigencia().desde()).getYear();
    }

    String documentoFuente() {
        return cabecera.documentoFuente();
    }

    /**
     * Analiza una fila del manifiesto.
     *
     * @throws IllegalArgumentException con un mensaje que se muestra tal cual en el informe
     */
    static FilaDelManifiesto de(List<String> campos) {
        if (campos.size() < COLUMNAS) {
            throw new IllegalArgumentException(
                    "La fila del manifiesto trae "
                            + campos.size()
                            + " columna(s) y hacen falta "
                            + COLUMNAS
                            + ": cuadro, tipo, clave, vigencia_desde, vigencia_hasta,"
                            + " documento_fuente, archivo_de_filas, sha256, archivo_del_corpus,"
                            + " transcribio, verifico");
        }
        String cuadro = campos.get(0).strip();
        if (!VEHICULAR.equals(cuadro)) {
            throw new IllegalArgumentException(
                    "«"
                            + cuadro
                            + "» no es un cuadro que este proceso sepa publicar todavia. El unico"
                            + " es "
                            + VEHICULAR
                            + ": ver FilaDelManifiesto.VEHICULAR para que falta en los otros dos");
        }
        String transcribio = campos.get(9).strip();
        String verifico = campos.get(10).strip();
        if (transcribio.isEmpty() || verifico.isEmpty()) {
            throw new IllegalArgumentException(
                    "Faltan las dos firmas del corpus: una edicion normativa la lee quien la"
                            + " transcribe y la vuelve a leer quien la verifica (ADR-0007)");
        }
        if (transcribio.equals(verifico)) {
            throw new IllegalArgumentException(
                    "Las dos firmas son la misma persona («"
                            + transcribio
                            + "»): releerse a uno mismo no es verificar (RNF-092). La base lo"
                            + " rechaza igual con parametro_doble_verificacion_ck");
        }
        String sha256 = campos.get(7).strip();
        if (!sha256.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException(
                    "«" + sha256 + "» no es un sha256 en minusculas de 64 digitos hexadecimales");
        }
        String archivoDeFilas = obligatorio(campos.get(6), "archivo_de_filas");
        String archivoDelCorpus = obligatorio(campos.get(8), "archivo_del_corpus");
        String documentoFuente = obligatorio(campos.get(5), "documento_fuente");

        // La cabecera de una edicion no tiene valor numerico —lo tienen sus miles de filas— y
        // `parametro_valor_ck` (V1) exige uno de los dos. El valor de texto es la norma que
        // aprueba el cuadro, que es exactamente lo que la edicion ES: no se inventa un numero
        // para satisfacer una restriccion.
        ParametroTributario cabecera =
                new ParametroTributario(
                        null,
                        obligatorio(campos.get(1), "tipo"),
                        vacioEsNulo(campos.get(2)),
                        null,
                        documentoFuente,
                        new Vigencia(
                                fecha(campos.get(3), "vigencia_desde"),
                                fechaOpcional(campos.get(4))),
                        documentoFuente);

        return new FilaDelManifiesto(
                cuadro, cabecera, archivoDeFilas, sha256, archivoDelCorpus, transcribio, verifico);
    }

    private static String obligatorio(String celda, String columna) {
        String valor = celda.strip();
        if (valor.isEmpty()) {
            throw new IllegalArgumentException("La columna " + columna + " no puede ir vacia");
        }
        return valor;
    }

    private static @Nullable String vacioEsNulo(String celda) {
        String valor = celda.strip();
        return valor.isEmpty() ? null : valor;
    }

    private static LocalDate fecha(String celda, String columna) {
        String valor = obligatorio(celda, columna);
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "«" + valor + "» no es una fecha AAAA-MM-DD en " + columna, e);
        }
    }

    private static @Nullable LocalDate fechaOpcional(String celda) {
        String valor = celda.strip();
        if (valor.isEmpty()) {
            return null;
        }
        return fecha(valor, "vigencia_hasta");
    }
}
