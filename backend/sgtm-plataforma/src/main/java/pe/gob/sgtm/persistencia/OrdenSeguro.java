package pe.gob.sgtm.persistencia;

import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Traduce el campo de ordenacion que pide el cliente a una columna real, contra una lista blanca.
 *
 * <p><b>Por que existe.</b> {@code ORDER BY} no admite parametros de enlace: el nombre de la
 * columna se concatena a la consulta si o si. Un {@code "ORDER BY " + parametro} es una inyeccion
 * de libro, y no de las inofensivas —{@code ORDER BY (SELECT ...)} permite extraer datos fila a
 * fila con una consulta ciega—. La unica defensa que no depende de recordar escapar es que el texto
 * del cliente <b>nunca</b> llegue a la consulta: llega la columna que este objeto devuelve, y si no
 * esta en la lista, no hay consulta.
 *
 * <p>Ademas traduce del {@code camelCase} del JSON al {@code snake_case} de la tabla, de modo que
 * el cliente ordena por {@code nombreRazonSocial} sin saber como se llama la columna.
 */
public final class OrdenSeguro {

    private final Map<String, String> columnasPorCampo;

    /** Columna que rompe los empates de la pedida, o nulo si no se declaro ninguna. */
    private final @Nullable String desempate;

    private OrdenSeguro(Map<String, String> columnasPorCampo, @Nullable String desempate) {
        this.columnasPorCampo = columnasPorCampo;
        this.desempate = desempate;
    }

    /**
     * Lista blanca a partir de los nombres de columna admitidos.
     *
     * <p>El campo que acepta del cliente es el mismo nombre en {@code camelCase}: {@code
     * fecha_registro} se pide como {@code fechaRegistro}. Ambas formas se admiten, para que un
     * cliente que ya conozca la columna no se quede fuera.
     */
    public static OrdenSeguro sobre(String... columnas) {
        Map<String, String> mapa = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (String columna : columnas) {
            if (!esIdentificadorSimple(columna)) {
                throw new IllegalArgumentException(
                        "Una lista blanca de orden solo admite nombres de columna simples: '"
                                + columna
                                + "'");
            }
            mapa.put(columna, columna);
            mapa.put(aCamelCase(columna), columna);
        }
        return new OrdenSeguro(Map.copyOf(mapa), null);
    }

    /**
     * La misma lista blanca, con una columna que <b>rompe los empates</b> de la pedida (#543).
     *
     * <p>{@code ORDER BY orden} sobre doce modulos que tienen todos {@code orden = 0} no es un
     * orden: es doce filas empatadas y un plan de ejecucion que puede devolverlas como quiera. Se
     * midio, y el orden relativo <b>cambia con el tamano de pagina</b> —{@code AUTORIZACIONES} sale
     * tercero con {@code ?tamano=3}, quinto con {@code ?tamano=5} y primero con {@code
     * ?tamano=12}—, porque el plan no es el mismo. Es el mismo motivo por el que {@link Paginacion}
     * exige que <b>siempre</b> haya un {@code ORDER BY}, un escalon mas abajo: sin orden
     * <b>total</b>, dos paginas consecutivas pueden repetir una fila y omitir otra.
     *
     * <p>El desempate va siempre {@code ASC} aunque la direccion pedida sea {@code DESC}: lo que
     * hace falta es que el orden sea total y estable, no que la columna de desempate acompañe al
     * sentido de la otra —cambiarlo con la direccion no aporta nada y añade un caso mas que
     * razonar—.
     *
     * @param columna nombre de columna simple, tipicamente la clave primaria
     */
    public OrdenSeguro desempatandoPor(String columna) {
        if (!esIdentificadorSimple(columna)) {
            throw new IllegalArgumentException(
                    "El desempate solo admite un nombre de columna simple: '" + columna + "'");
        }
        return new OrdenSeguro(columnasPorCampo, columna);
    }

    public Set<String> camposAdmitidos() {
        return columnasPorCampo.keySet();
    }

    /**
     * La clausula {@code ORDER BY} completa, ya validada.
     *
     * @throws OrdenNoAdmitido si el campo no esta en la lista blanca
     */
    public String clausula(Paginacion paginacion) {
        String columna = columnasPorCampo.get(paginacion.ordenarPor());
        if (columna == null) {
            throw new OrdenNoAdmitido(paginacion.ordenarPor(), columnasPorCampo.keySet());
        }
        String clausula = "ORDER BY " + columna + " " + paginacion.direccion().sql();
        if (desempate == null || desempate.equals(columna)) {
            return clausula;
        }
        return clausula + ", " + desempate + " ASC";
    }

    private static boolean esIdentificadorSimple(String texto) {
        if (texto.isEmpty()) {
            return false;
        }
        for (int i = 0; i < texto.length(); i++) {
            char caracter = texto.charAt(i);
            boolean admitido =
                    caracter == '_'
                            || (caracter >= 'a' && caracter <= 'z')
                            || (caracter >= 'A' && caracter <= 'Z')
                            || (caracter >= '0' && caracter <= '9');
            if (!admitido) {
                return false;
            }
        }
        return true;
    }

    static String aCamelCase(String columna) {
        StringBuilder resultado = new StringBuilder(columna.length());
        boolean siguienteEnMayuscula = false;
        for (int i = 0; i < columna.length(); i++) {
            char caracter = columna.charAt(i);
            if (caracter == '_') {
                siguienteEnMayuscula = true;
                continue;
            }
            resultado.append(
                    siguienteEnMayuscula
                            ? Character.toUpperCase(caracter)
                            : Character.toLowerCase(caracter));
            siguienteEnMayuscula = false;
        }
        return resultado.toString();
    }

    /** El campo pedido no esta en la lista blanca. Es 422, no 500: lo mando mal el cliente. */
    public static final class OrdenNoAdmitido extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        private final String campo;

        OrdenNoAdmitido(String campo, Set<String> admitidos) {
            super(
                    "No se puede ordenar por '"
                            + campo
                            + "'. Campos admitidos: "
                            + String.join(", ", admitidos.stream().sorted().toList())
                            + ". El nombre de columna no se puede parametrizar en un ORDER BY, asi"
                            + " que solo se admite lo declarado");
            this.campo = campo;
        }

        public String campo() {
            return campo;
        }
    }

    @Override
    public String toString() {
        return "OrdenSeguro" + columnasPorCampo.values().stream().distinct().sorted().toList();
    }
}
