package pe.gob.sgtm.valores.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.valores.dominio.CausalDePrescripcion;
import pe.gob.sgtm.valores.dominio.ClaseDeHecho;
import pe.gob.sgtm.valores.dominio.ComputoDeEjercicio;
import pe.gob.sgtm.valores.dominio.HechoDelComputo;
import pe.gob.sgtm.valores.dominio.Plazo;
import pe.gob.sgtm.valores.dominio.Prescripcion;
import pe.gob.sgtm.valores.dominio.PrescripcionRepository;
import pe.gob.sgtm.valores.dominio.ResultadoDeLaSolicitud;
import pe.gob.sgtm.valores.dominio.UnidadDePlazo;

/**
 * Las declaraciones de prescripcion contra PostgreSQL (V28).
 *
 * <p>Tres tablas, una sola operacion: la cabecera, el computo de cada ejercicio y los hechos
 * alegados. Sin {@code UPDATE} y sin {@code DELETE}: una resolucion no se edita.
 *
 * <p>El plazo se guarda partido en {@code plazo_anios} porque asi lo expresa el art. 43 del TUO del
 * Codigo Tributario -en anios- y asi tiene que poder consultarse. La unidad no viaja a la base: si
 * manana un plazo se parametrizara en dias, {@code plazo_anios} dejaria de servir y habria que
 * migrar la columna, que es preferible a guardar "20" sin decir de que.
 */
@Repository
public class PrescripcionRepositoryJdbc extends RepositorioJdbc implements PrescripcionRepository {

    private static final String COLUMNAS =
            "id, contribuyente_id, tributo, ejercicio_desde, ejercicio_hasta, fecha_presentacion,"
                    + " causal, plazo_anios, conjunto_id, resultado, resolucion, usuario_registro,"
                    + " observacion";

    public PrescripcionRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Prescripcion insertar(Prescripcion prescripcion) {
        if (!prescripcion.esNueva()) {
            throw new IllegalArgumentException(
                    "Una prescripcion ya declarada no se vuelve a insertar ni se corrige");
        }
        if (prescripcion.plazo().unidad() != UnidadDePlazo.ANIOS) {
            throw new IllegalArgumentException(
                    "El art. 43 expresa la prescripcion en anios; este plazo esta en "
                            + prescripcion.plazo().unidad());
        }

        Long id =
                jdbc().sql(
                                "INSERT INTO prescripcion"
                                        + " (municipalidad_id, contribuyente_id, tributo,"
                                        + "  ejercicio_desde, ejercicio_hasta, fecha_presentacion,"
                                        + "  causal, plazo_anios, conjunto_id, resultado,"
                                        + "  resolucion, usuario_registro, observacion)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :contribuyenteId, :tributo, :desde, :hasta, :fecha,"
                                        + "  :causal, :plazo, :conjuntoId, :resultado,"
                                        + "  :resolucion, :usuario, :observacion)"
                                        + " RETURNING id")
                        .param("contribuyenteId", prescripcion.contribuyenteId())
                        .param("tributo", prescripcion.tributo())
                        .param("desde", prescripcion.ejercicioDesde().valor())
                        .param("hasta", prescripcion.ejercicioHasta().valor())
                        .param("fecha", prescripcion.fechaPresentacion())
                        .param("causal", prescripcion.causal().name())
                        .param("plazo", prescripcion.plazo().cantidad())
                        .param("conjuntoId", prescripcion.conjuntoId())
                        .param("resultado", prescripcion.resultado().name())
                        .param("resolucion", prescripcion.resolucion())
                        .param("usuario", usuarioActual())
                        .param("observacion", prescripcion.observacion().texto())
                        .query(Long.class)
                        .single();

        for (ComputoDeEjercicio computo : prescripcion.ejercicios()) {
            jdbc().sql(
                            "INSERT INTO prescripcion_ejercicio"
                                    + " (municipalidad_id, prescripcion_id, ejercicio,"
                                    + "  inicio_computo, inicio_vigente, fecha_prescripcion,"
                                    + "  prescrita)"
                                    + " VALUES ("
                                    + MUNICIPALIDAD_ACTUAL
                                    + ", :prescripcionId, :ejercicio, :inicio, :vigente,"
                                    + "  :prescripcion, :prescrita)")
                    .param("prescripcionId", id)
                    .param("ejercicio", computo.ejercicio().valor())
                    .param("inicio", computo.inicioComputo())
                    .param("vigente", computo.inicioVigente())
                    .param("prescripcion", computo.fechaPrescripcion())
                    .param("prescrita", computo.prescrita())
                    .update();
        }

        for (HechoDelComputo hecho : prescripcion.hechos()) {
            jdbc().sql(
                            "INSERT INTO prescripcion_hecho"
                                    + " (municipalidad_id, prescripcion_id, clase, causal,"
                                    + "  fecha_desde, fecha_hasta)"
                                    + " VALUES ("
                                    + MUNICIPALIDAD_ACTUAL
                                    + ", :prescripcionId, :clase, :causal, :desde, :hasta)")
                    .param("prescripcionId", id)
                    .param("clase", hecho.clase().name())
                    .param("causal", hecho.causal())
                    .param("desde", hecho.desde())
                    .param("hasta", hecho.hasta())
                    .update();
        }

        return porId(id)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "La prescripcion " + id + " se desvanecio al releerla"));
    }

    @Override
    public Optional<Prescripcion> porId(long id) {
        Optional<Cabecera> cabecera =
                jdbc().sql("SELECT " + COLUMNAS + " FROM prescripcion WHERE id = :id")
                        .param("id", id)
                        .query(this::mapearCabecera)
                        .optional();
        if (cabecera.isEmpty()) {
            return Optional.empty();
        }
        Cabecera datos = cabecera.get();
        return Optional.of(
                new Prescripcion(
                        datos.id(),
                        datos.contribuyenteId(),
                        datos.tributo(),
                        datos.ejercicioDesde(),
                        datos.ejercicioHasta(),
                        datos.fechaPresentacion(),
                        datos.causal(),
                        datos.plazo(),
                        datos.conjuntoId(),
                        datos.resultado(),
                        datos.resolucion(),
                        ejerciciosDe(id),
                        hechosDe(id),
                        datos.usuarioRegistro(),
                        datos.observacion()));
    }

    private List<ComputoDeEjercicio> ejerciciosDe(long prescripcionId) {
        return jdbc().sql(
                        "SELECT id, ejercicio, inicio_computo, inicio_vigente, fecha_prescripcion,"
                                + " prescrita"
                                + " FROM prescripcion_ejercicio"
                                + " WHERE prescripcion_id = :id"
                                + " ORDER BY ejercicio")
                .param("id", prescripcionId)
                .query(
                        (ResultSet fila, int numero) ->
                                new ComputoDeEjercicio(
                                        fila.getLong("id"),
                                        new Ejercicio(fila.getInt("ejercicio")),
                                        fila.getDate("inicio_computo").toLocalDate(),
                                        fila.getDate("inicio_vigente").toLocalDate(),
                                        fila.getDate("fecha_prescripcion").toLocalDate(),
                                        fila.getBoolean("prescrita")))
                .list();
    }

    private List<HechoDelComputo> hechosDe(long prescripcionId) {
        List<HechoDelComputo> hechos = new ArrayList<>();
        hechos.addAll(
                jdbc().sql(
                                "SELECT clase, causal, fecha_desde, fecha_hasta"
                                        + " FROM prescripcion_hecho"
                                        + " WHERE prescripcion_id = :id"
                                        + " ORDER BY fecha_desde, id")
                        .param("id", prescripcionId)
                        .query(
                                (ResultSet fila, int numero) -> {
                                    java.sql.Date hasta = fila.getDate("fecha_hasta");
                                    return new HechoDelComputo(
                                            ClaseDeHecho.valueOf(fila.getString("clase")),
                                            fila.getString("causal"),
                                            fila.getDate("fecha_desde").toLocalDate(),
                                            hasta == null ? null : hasta.toLocalDate());
                                })
                        .list());
        return hechos;
    }

    private Cabecera mapearCabecera(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Cabecera(
                fila.getLong("id"),
                fila.getLong("contribuyente_id"),
                fila.getString("tributo"),
                new Ejercicio(fila.getInt("ejercicio_desde")),
                new Ejercicio(fila.getInt("ejercicio_hasta")),
                fila.getDate("fecha_presentacion").toLocalDate(),
                CausalDePrescripcion.valueOf(fila.getString("causal")),
                new Plazo(fila.getInt("plazo_anios"), UnidadDePlazo.ANIOS),
                fila.getLong("conjunto_id"),
                ResultadoDeLaSolicitud.valueOf(fila.getString("resultado")),
                fila.getString("resolucion"),
                fila.getString("usuario_registro"),
                Observacion.de(fila.getString("observacion")));
    }

    /** La fila de {@code prescripcion} sin sus dos listas, que se leen aparte. */
    private record Cabecera(
            long id,
            long contribuyenteId,
            String tributo,
            Ejercicio ejercicioDesde,
            Ejercicio ejercicioHasta,
            java.time.LocalDate fechaPresentacion,
            CausalDePrescripcion causal,
            Plazo plazo,
            long conjuntoId,
            ResultadoDeLaSolicitud resultado,
            @Nullable String resolucion,
            @Nullable String usuarioRegistro,
            Observacion observacion) {}

    private static String usuarioActual() {
        Origen origen = OrigenContext.actual();
        return origen.usuario();
    }
}
