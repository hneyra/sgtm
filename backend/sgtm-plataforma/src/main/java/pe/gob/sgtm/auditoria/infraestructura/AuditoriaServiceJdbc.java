package pe.gob.sgtm.auditoria.infraestructura;

import java.time.Clock;
import java.time.Year;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import pe.gob.sgtm.auditoria.AuditoriaService;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.OrigenContext;
import pe.gob.sgtm.compartido.OrigenPeticion;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Implementacion JDBC de {@link AuditoriaService}: un {@code INSERT} en {@code auditoria}, nunca un
 * {@code UPDATE} ni un {@code DELETE} (V7 solo le concede a {@code sgtm_app} {@code SELECT, INSERT}
 * sobre esa tabla).
 *
 * <h2>De donde sale cada columna</h2>
 *
 * <ul>
 *   <li>{@code municipalidad_id}: como en todo repositorio, del motor via {@link
 *       RepositorioJdbc#MUNICIPALIDAD_ACTUAL}, nunca de un parametro Java (regla 2).
 *   <li>{@code ejercicio}: de un {@link Clock} inyectado por constructor, no leido directamente
 *       aqui con {@code Clock.systemDefaultZone()}. Sustituible en pruebas, y la unica lectura del
 *       reloj de todo el mecanismo.
 *   <li>{@code usuario_id}, {@code origen_equipo}, {@code origen_ip}: de {@link OrigenContext},
 *       poblado en el borde de la peticion por {@code OrigenContextFilter}. Ningun caso de uso de
 *       negocio los pasa como argumento de {@link #registrar}.
 *   <li>{@code fecha}: la deja el {@code DEFAULT now()} de la columna (V5). No hay una segunda
 *       lectura del reloj en Java para un valor que la base ya sabe poner.
 *   <li>{@code tabla}, {@code clave}, {@code operacion}, {@code observacion}, {@code
 *       datos_anteriores}, {@code datos_nuevos}: del {@link RegistroDeAuditoria} que entrega el
 *       llamador.
 * </ul>
 *
 * <p>Los mapas de {@code datos_anteriores}/{@code datos_nuevos} se serializan a JSON a mano, sin
 * depender de Jackson: este modulo no tiene esa dependencia y el formato que necesita es sencillo
 * —un mapa plano de columna a valor primitivo—, no una serializacion de objetos de dominio
 * arbitrarios.
 */
@Service
public class AuditoriaServiceJdbc extends RepositorioJdbc implements AuditoriaService {

    private static final String INSERT =
            """
            INSERT INTO auditoria
                (municipalidad_id, ejercicio, tabla, clave, operacion,
                 usuario_id, origen_equipo, origen_ip,
                 observacion, datos_anteriores, datos_nuevos)
            VALUES
                (%s, :ejercicio, :tabla, :clave, :operacion,
                 :usuarioId, :origenEquipo, :origenIp::inet,
                 :observacion, :datosAnteriores::jsonb, :datosNuevos::jsonb)
            """
                    .formatted(MUNICIPALIDAD_ACTUAL);

    private final Clock reloj;

    public AuditoriaServiceJdbc(JdbcClient jdbc, Clock reloj) {
        super(jdbc);
        this.reloj = Objects.requireNonNull(reloj, "AuditoriaServiceJdbc necesita un reloj");
    }

    @Override
    public void registrar(RegistroDeAuditoria registro) {
        Objects.requireNonNull(registro, "No hay nada que registrar sin un RegistroDeAuditoria");
        OrigenPeticion origen =
                OrigenContext.actualSiHay()
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No hay OrigenContext fijado: toda escritura de"
                                                        + " auditoria ocurre dentro de una peticion"
                                                        + " o de un proceso que fijo su propio"
                                                        + " origen"));

        jdbc().sql(INSERT)
                .param("ejercicio", Year.now(reloj).getValue())
                .param("tabla", registro.tabla())
                .param("clave", registro.clave())
                .param("operacion", registro.operacion().name())
                .param("usuarioId", origen.usuarioId())
                .param("origenEquipo", origen.equipo())
                .param("origenIp", origen.ip())
                .param("observacion", registro.observacion().texto())
                .param("datosAnteriores", aJson(registro.datosAnteriores()))
                .param("datosNuevos", aJson(registro.datosNuevos()))
                .update();
    }

    private static @Nullable String aJson(@Nullable Map<String, Object> mapa) {
        if (mapa == null) {
            return null;
        }
        StringBuilder json = new StringBuilder("{");
        boolean primero = true;
        for (Map.Entry<String, Object> entrada : mapa.entrySet()) {
            if (!primero) {
                json.append(',');
            }
            primero = false;
            json.append(cadenaJson(entrada.getKey()))
                    .append(':')
                    .append(valorJson(entrada.getValue()));
        }
        return json.append('}').toString();
    }

    private static String valorJson(@Nullable Object valor) {
        if (valor == null) {
            return "null";
        }
        if (valor instanceof Number || valor instanceof Boolean) {
            return valor.toString();
        }
        return cadenaJson(valor.toString());
    }

    private static String cadenaJson(String texto) {
        StringBuilder escapado = new StringBuilder(texto.length() + 2).append('"');
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            switch (c) {
                case '"' -> escapado.append("\\\"");
                case '\\' -> escapado.append("\\\\");
                case '\n' -> escapado.append("\\n");
                case '\r' -> escapado.append("\\r");
                case '\t' -> escapado.append("\\t");
                default -> escapado.append(c);
            }
        }
        return escapado.append('"').toString();
    }
}
