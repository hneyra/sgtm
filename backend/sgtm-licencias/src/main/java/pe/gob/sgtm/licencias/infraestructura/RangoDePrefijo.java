package pe.gob.sgtm.licencias.infraestructura;

import org.jspecify.annotations.Nullable;

/**
 * Una busqueda por prefijo, escrita como rango en vez de como {@code LIKE}.
 *
 * <h2>Por que no se usa {@code LIKE}</h2>
 *
 * <p>Es el tercer hallazgo de RLS del proyecto (DAT-01 §0): <b>bajo RLS un {@code LIKE 'prefijo%'}
 * no llega nunca al indice</b>. {@code textlike} no es <i>leakproof</i> ({@code
 * pg_proc.proleakproof = false}), y PostgreSQL no evalua una condicion que no lo sea antes de la
 * politica de seguridad —podria filtrar por un mensaje de error filas de otra municipalidad—. Asi
 * que el {@code LIKE} se queda como {@code Filter} despues del recorrido y el plan degrada a {@code
 * Seq Scan}. Los operadores de {@code text_pattern_ops} —{@code ~&gt;=~}, {@code ~&lt;~}— si son
 * leakproof y expresan el mismo prefijo como un rango que el indice recorre.
 *
 * <p>La logica es la misma que {@code FichaCatastralRepositoryJdbc#siguienteAlPrefijo} verifico en
 * #47 midiendo los dos planes. Se repite aqui —y no se comparte— porque moverla a {@code
 * pe.gob.sgtm.persistencia} tocaria un modulo compartido por los doce contextos; el dia que
 * aparezca la tercera copia, ese es su sitio.
 */
final class RangoDePrefijo {

    private RangoDePrefijo() {}

    /**
     * El limite superior exclusivo del rango de ese prefijo.
     *
     * @return {@code null} si el prefijo no es ASCII imprimible y hay que conformarse con {@code
     *     LIKE}: incrementar el ultimo caracter en UTF-16 no equivale a incrementarlo en bytes, y
     *     una comparacion por bytes con un limite calculado en caracteres dejaria filas fuera
     */
    static @Nullable String siguienteA(String prefijo) {
        if (prefijo.isEmpty()) {
            return null;
        }
        for (int i = 0; i < prefijo.length(); i++) {
            char caracter = prefijo.charAt(i);
            if (caracter < ' ' || caracter > '~') {
                return null;
            }
        }
        char ultimo = prefijo.charAt(prefijo.length() - 1);
        if (ultimo == '~') {
            return null;
        }
        return prefijo.substring(0, prefijo.length() - 1) + (char) (ultimo + 1);
    }

    /**
     * Anade una condicion de prefijo a un {@code WHERE}, por rango cuando se puede.
     *
     * <p>Se escribe una vez y la usan los cuatro filtros de texto del modulo: repetir el rango a
     * mano en cada uno es como se acaba colando un {@code LIKE} en el quinto.
     *
     * @param donde el {@code WHERE} que se esta construyendo
     * @param parametros los parametros con nombre de la consulta
     * @param columna la columna sobre la que se busca
     * @param prefijo lo que el usuario escribio
     * @param alias raiz del nombre de los parametros, para que dos filtros no se pisen
     */
    static void condicion(
            StringBuilder donde,
            java.util.Map<String, Object> parametros,
            String columna,
            String prefijo,
            String alias) {
        String hasta = siguienteA(prefijo);
        if (hasta == null) {
            donde.append(" AND ").append(columna).append(" LIKE :").append(alias).append(" || '%'");
            parametros.put(alias, prefijo);
            return;
        }
        donde.append(" AND ")
                .append(columna)
                .append(" ~>=~ :")
                .append(alias)
                .append("Desde AND ")
                .append(columna)
                .append(" ~<~ :")
                .append(alias)
                .append("Hasta");
        parametros.put(alias + "Desde", prefijo);
        parametros.put(alias + "Hasta", hasta);
    }
}
