package pe.gob.sgtm.documentos;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import pe.gob.sgtm.compartido.TenantContext;

/**
 * Lee {@code municipalidad.es_demostracion} de la municipalidad en curso.
 *
 * <h2>La consulta no lleva la municipalidad en Java</h2>
 *
 * <p>{@code municipalidad} no es una tabla de tenant —su politica es {@code FOR SELECT USING
 * (true)}, porque los procesos masivos la recorren entera—, asi que aqui si hace falta un {@code
 * WHERE}. Lo que no hace falta es que el identificador pase por Java: lo pone el motor con {@code
 * current_setting('app.municipalidad_id')}, el mismo parametro de sesion que fija {@code SET LOCAL}
 * y que consultan las politicas RLS. Asi una lectura sin contexto <b>falla</b> en lugar de
 * responder por la municipalidad equivocada (regla 2).
 *
 * <h2>Por que hay cache, y por que se puede</h2>
 *
 * <p>Se pregunta una vez por documento, y {@code emitirEnLote} emite miles. Sin cache, cada recibo
 * del padron llevaria su propia consulta.
 *
 * <p>Se puede porque el valor no cambia en caliente: quitarle la marca a una instalacion es un
 * {@code UPDATE} de {@code sgtm_owner}, una operacion de implantacion, y las de implantacion
 * reinician el proceso. No hay ninguna pantalla que lo cambie, y ese es justamente el punto de que
 * el hecho viva en la base y no en configuracion.
 *
 * <p>La cache es por municipalidad y no global: una sola instalacion atiende a muchas, y una cache
 * de un solo valor haria que la primera que emitiera decidiera por todas. Ese fallo no se ve
 * probando con una.
 */
@Component
public class RegimenDeLaInstalacionJdbc implements RegimenDeLaInstalacion {

    private static final String CONSULTA =
            "SELECT es_demostracion FROM municipalidad"
                    + " WHERE id = current_setting('app.municipalidad_id')::bigint";

    private final JdbcClient jdbc;
    private final Map<Long, Boolean> sabido = new ConcurrentHashMap<>();

    public RegimenDeLaInstalacionJdbc(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean esDeDemostracion() {
        return sabido.computeIfAbsent(TenantContext.actual().valor(), municipalidad -> consultar());
    }

    private boolean consultar() {
        return jdbc.sql(CONSULTA)
                .query(Boolean.class)
                .optional()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "La municipalidad en curso no esta en el registro de"
                                                + " municipalidades. Sin saber si la instalacion es de"
                                                + " demostracion no se puede emitir ningun documento:"
                                                + " saldria sin marca."));
    }
}
