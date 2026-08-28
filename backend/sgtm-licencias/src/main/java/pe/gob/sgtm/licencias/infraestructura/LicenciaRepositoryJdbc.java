package pe.gob.sgtm.licencias.infraestructura;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.licencias.dominio.CriterioDeLicencias;
import pe.gob.sgtm.licencias.dominio.GiroDeLaLicencia;
import pe.gob.sgtm.licencias.dominio.LicenciaDeFuncionamiento;
import pe.gob.sgtm.licencias.dominio.LicenciaRepository;
import pe.gob.sgtm.licencias.dominio.TipoDeLicencia;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RangoDePrefijo;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Las licencias de funcionamiento contra PostgreSQL (V4, V37).
 *
 * <p><b>Solo inserta.</b> No hay aqui ni un {@code UPDATE licencia_funcionamiento} ni un {@code
 * DELETE}: V37 le retira a {@code sgtm_app} el privilegio de {@code UPDATE} y {@code DELETE} nunca
 * lo tuvo (V7); el escaner de fuentes rechaza esas dos cadenas antes de que lleguen a ejecutarse.
 * El unico {@code UPDATE} de esta clase es el del contador de {@code licencia_correlativo}, que es
 * infraestructura de numeracion y no un acto administrativo (mismo criterio que {@code
 * valor_correlativo} en V26 y {@code expediente_correlativo} en V33).
 *
 * <p><b>El numero repetido lo rechaza el indice, no un {@code if}.</b> Se inserta y se traduce el
 * choque contra {@code licencia_numero_uq}: diez peticiones simultaneas pasan las diez por
 * cualquier comprobacion escrita en Java.
 *
 * <h2>Dos pasos para leer, y por que</h2>
 *
 * <p>La consulta devuelve primero las filas de {@code licencia_funcionamiento} —como {@link Fila},
 * que no es todavia una licencia— y resuelve despues los giros de todas ellas en <b>una</b>
 * consulta. No se construye {@link LicenciaDeFuncionamiento} antes de tener sus giros porque su
 * constructor exige al menos uno y exactamente un principal: es una invariante del acto
 * administrativo, y relajarla para poder leer dejaria pasar una licencia sin giros al
 * <b>escribir</b>, que es donde importa.
 */
@Repository
public class LicenciaRepositoryJdbc extends RepositorioJdbc implements LicenciaRepository {

    private static final String COLUMNAS =
            "id, numero, contribuyente_id, predio_id, ficha_id, nombre_comercial, direccion,"
                    + " area_solicitada, tipo_licencia, zonificacion, aforo, fecha_emision,"
                    + " vigencia_hasta, recibo_id, documento_id, expediente, fecha_expediente,"
                    + " usuario_registro, fecha_registro, observacion";

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre(
                    "numero", "fecha_emision", "nombre_comercial", "direccion", "expediente");

    public LicenciaRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public long siguienteCorrelativo(Ejercicio ejercicio) {
        // Una sola sentencia: el UPSERT bloquea la fila del contador mientras la actualiza, asi
        // que dos emisiones concurrentes del mismo ejercicio se serializan en el motor y salen con
        // numeros consecutivos. Nunca un SELECT seguido de un UPDATE: entre los dos cabe otra
        // emision, y las dos leerian el mismo numero.
        Long ultimo =
                jdbc().sql(
                                "INSERT INTO licencia_correlativo (municipalidad_id, ejercicio,"
                                        + " ultimo) VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :ejercicio, 1)"
                                        + " ON CONFLICT (municipalidad_id, ejercicio)"
                                        + " DO UPDATE SET"
                                        + "   ultimo = licencia_correlativo.ultimo + 1"
                                        + " RETURNING ultimo")
                        .param("ejercicio", ejercicio.valor())
                        .query(Long.class)
                        .single();
        return Objects.requireNonNull(ultimo);
    }

    @Override
    public LicenciaDeFuncionamiento emitir(LicenciaDeFuncionamiento licencia) {
        if (!licencia.esNuevo()) {
            throw new IllegalArgumentException(
                    "Una licencia ya emitida no se vuelve a insertar ni se corrige: se cancela con"
                            + " su resolucion");
        }

        Long id;
        try {
            id =
                    jdbc().sql(
                                    "INSERT INTO licencia_funcionamiento"
                                            + " (municipalidad_id, numero, contribuyente_id, predio_id,"
                                            + "  ficha_id, nombre_comercial, direccion,"
                                            + "  area_solicitada, tipo_licencia, zonificacion, aforo,"
                                            + "  fecha_emision, vigencia_hasta, recibo_id,"
                                            + "  documento_id, expediente, fecha_expediente,"
                                            + "  usuario_registro, fecha_registro, observacion)"
                                            + " VALUES ("
                                            + MUNICIPALIDAD_ACTUAL
                                            + ", :numero, :contribuyente, :predio, :ficha,"
                                            + "  :nombreComercial, :direccion, :area, :tipo,"
                                            + "  :zonificacion, :aforo, :emision, :vigencia,"
                                            + "  :recibo, :documento, :expediente,"
                                            + "  :fechaExpediente, :usuario, :registrado,"
                                            + "  :observacion)"
                                            + " RETURNING id")
                            .param("numero", licencia.numero())
                            .param("contribuyente", licencia.contribuyenteId())
                            .param("predio", licencia.predioId())
                            .param("ficha", licencia.fichaId())
                            .param("nombreComercial", licencia.nombreComercial())
                            .param("direccion", licencia.direccion())
                            .param("area", licencia.areaSolicitada().valor())
                            .param("tipo", licencia.tipoLicencia().name())
                            .param("zonificacion", licencia.zonificacion())
                            .param("aforo", licencia.aforo())
                            .param("emision", licencia.fechaEmision())
                            .param("vigencia", licencia.vigenciaHasta())
                            .param("recibo", licencia.reciboId())
                            .param("documento", licencia.documentoId())
                            .param("expediente", licencia.expediente())
                            .param("fechaExpediente", licencia.fechaExpediente())
                            .param("usuario", UsuarioDeLaSesion.actual())
                            .param("registrado", Timestamp.from(licencia.registradoEn()))
                            .param("observacion", licencia.observacion().texto())
                            .query(Long.class)
                            .single();
        } catch (DuplicateKeyException yaEstaba) {
            throw new NumeroDuplicado(
                    "Ya existe la licencia "
                            + licencia.numero()
                            + " en esta municipalidad: dos licencias con el mismo numero no se"
                            + " pueden distinguir en el establecimiento",
                    yaEstaba);
        }

        long licenciaId = Objects.requireNonNull(id);
        for (GiroDeLaLicencia giro : licencia.giros()) {
            jdbc().sql(
                            "INSERT INTO licencia_giro"
                                    + " (municipalidad_id, licencia_id, ciiu_id, principal, activo)"
                                    + " VALUES ("
                                    + MUNICIPALIDAD_ACTUAL
                                    + ", :licencia, :ciiu, :principal, true)")
                    .param("licencia", licenciaId)
                    .param("ciiu", giro.ciiuId())
                    .param("principal", giro.principal())
                    .update();
        }

        return porId(licenciaId)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "La licencia recien insertada no se puede releer: eso solo"
                                                + " pasa sin contexto de tenant"));
    }

    @Override
    public Optional<LicenciaDeFuncionamiento> porNumero(String numero) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM licencia_funcionamiento WHERE numero = :numero")
                .param("numero", numero == null ? "" : numero.strip())
                .query(LicenciaRepositoryJdbc::mapear)
                .optional()
                .map(this::conSusGiros);
    }

    @Override
    public Pagina<LicenciaDeFuncionamiento> buscar(
            CriterioDeLicencias criterio, Paginacion paginacion) {

        StringBuilder donde = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parametros = new HashMap<>();

        if (criterio.numero() != null) {
            donde.append(" AND numero = :numero");
            parametros.put("numero", criterio.numero());
        }
        if (criterio.expediente() != null) {
            donde.append(" AND expediente = :expediente");
            parametros.put("expediente", criterio.expediente());
        }
        if (criterio.nombreComercial() != null) {
            RangoDePrefijo.condicion(
                    donde,
                    parametros,
                    "nombre_comercial",
                    criterio.nombreComercial().toUpperCase(Locale.ROOT),
                    "comercial");
        }
        if (criterio.direccion() != null) {
            RangoDePrefijo.condicion(
                    donde,
                    parametros,
                    "direccion",
                    criterio.direccion().toUpperCase(Locale.ROOT),
                    "dir");
        }
        Set<Long> titulares = criterio.contribuyentes();
        if (titulares != null) {
            // Vacio no llega aqui: `ConsultaDeLicencias` devuelve la pagina vacia antes, porque un
            // `IN ()` no es SQL valido y un filtro ignorado devolveria el padron entero.
            donde.append(" AND contribuyente_id IN (:titulares)");
            parametros.put("titulares", titulares);
        }

        Pagina<Fila> pagina =
                paginar(
                        "SELECT " + COLUMNAS + " FROM licencia_funcionamiento" + donde,
                        "SELECT count(*) FROM licencia_funcionamiento" + donde,
                        parametros,
                        paginacion,
                        ORDEN,
                        LicenciaRepositoryJdbc::mapear);

        if (pagina.estaVacia()) {
            return Pagina.vacia(paginacion);
        }
        Set<Long> ids = new HashSet<>();
        for (Fila fila : pagina.contenido()) {
            ids.add(fila.id());
        }
        Map<Long, List<GiroDeLaLicencia>> giros = girosDe(ids);
        return pagina.mapear(fila -> fila.con(giros.getOrDefault(fila.id(), List.of())));
    }

    private Optional<LicenciaDeFuncionamiento> porId(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM licencia_funcionamiento WHERE id = :id")
                .param("id", id)
                .query(LicenciaRepositoryJdbc::mapear)
                .optional()
                .map(this::conSusGiros);
    }

    private LicenciaDeFuncionamiento conSusGiros(Fila fila) {
        return fila.con(girosDe(Set.of(fila.id())).getOrDefault(fila.id(), List.of()));
    }

    /**
     * Los giros de varias licencias, en una consulta.
     *
     * <p>Cruza con {@code ciiu} para traer el codigo y la descripcion: quien pinta la ficha los
     * necesita, y una lectura por giro convertiria una pagina de veinte licencias en veintiuna
     * consultas.
     *
     * <p>Trae tambien los giros dados de baja ({@code activo = false}): el papel de una licencia
     * emitida con tres giros tiene que poder explicar por que hoy solo dos estan vigentes, y
     * filtrarlos aqui borraria esa traza de la pantalla.
     */
    private Map<Long, List<GiroDeLaLicencia>> girosDe(Set<Long> licenciaIds) {
        if (licenciaIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<GiroDeLaLicencia>> porLicencia = new LinkedHashMap<>();
        jdbc().sql(
                        "SELECT g.licencia_id, g.ciiu_id, g.principal, g.activo,"
                                + "       c.codigo, c.descripcion"
                                + "  FROM licencia_giro g"
                                + "  JOIN ciiu c ON c.municipalidad_id = g.municipalidad_id"
                                + "             AND c.id = g.ciiu_id"
                                + " WHERE g.licencia_id IN (:ids)"
                                + " ORDER BY g.principal DESC, c.codigo")
                .param("ids", licenciaIds)
                .query(
                        (ResultSet fila, int numeroDeFila) ->
                                porLicencia
                                        .computeIfAbsent(
                                                fila.getLong("licencia_id"),
                                                clave -> new ArrayList<>())
                                        .add(
                                                new GiroDeLaLicencia(
                                                        fila.getLong("ciiu_id"),
                                                        fila.getString("codigo"),
                                                        fila.getString("descripcion"),
                                                        fila.getBoolean("principal"),
                                                        fila.getBoolean("activo"))))
                .list();
        return porLicencia;
    }

    private static Fila mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long ficha = fila.getLong("ficha_id");
        Long fichaId = fila.wasNull() ? null : ficha;
        int aforo = fila.getInt("aforo");
        Integer aforoAutorizado = fila.wasNull() ? null : aforo;
        Date vigencia = fila.getDate("vigencia_hasta");
        Date fechaExpediente = fila.getDate("fecha_expediente");

        return new Fila(
                fila.getLong("id"),
                fila.getString("numero"),
                fila.getLong("contribuyente_id"),
                predioId,
                fichaId,
                fila.getString("nombre_comercial"),
                fila.getString("direccion"),
                new AreaM2(fila.getBigDecimal("area_solicitada")),
                TipoDeLicencia.porNombre(fila.getString("tipo_licencia")),
                fila.getString("zonificacion"),
                aforoAutorizado,
                fila.getDate("fecha_emision").toLocalDate(),
                vigencia == null ? null : vigencia.toLocalDate(),
                fila.getLong("recibo_id"),
                fila.getLong("documento_id"),
                fila.getString("expediente"),
                fechaExpediente == null ? null : fechaExpediente.toLocalDate(),
                fila.getTimestamp("fecha_registro").toInstant(),
                fila.getString("usuario_registro"),
                Observacion.de(fila.getString("observacion")));
    }

    /**
     * Una fila de {@code licencia_funcionamiento} <b>sin</b> sus giros.
     *
     * <p>No es una licencia todavia, y por eso no es {@link LicenciaDeFuncionamiento}: una licencia
     * sin giros no existe, y construir una para rellenarla despues obligaria a relajar la
     * invariante que impide emitir una sin ninguna actividad autorizada.
     */
    private record Fila(
            long id,
            String numero,
            long contribuyenteId,
            @Nullable Long predioId,
            @Nullable Long fichaId,
            String nombreComercial,
            String direccion,
            AreaM2 areaSolicitada,
            TipoDeLicencia tipoLicencia,
            @Nullable String zonificacion,
            @Nullable Integer aforo,
            LocalDate fechaEmision,
            @Nullable LocalDate vigenciaHasta,
            long reciboId,
            long documentoId,
            @Nullable String expediente,
            @Nullable LocalDate fechaExpediente,
            Instant registradoEn,
            @Nullable String usuarioRegistro,
            Observacion observacion) {

        LicenciaDeFuncionamiento con(List<GiroDeLaLicencia> giros) {
            return new LicenciaDeFuncionamiento(
                    id,
                    numero,
                    contribuyenteId,
                    predioId,
                    fichaId,
                    nombreComercial,
                    direccion,
                    areaSolicitada,
                    tipoLicencia,
                    zonificacion,
                    aforo,
                    fechaEmision,
                    vigenciaHasta,
                    reciboId,
                    documentoId,
                    expediente,
                    fechaExpediente,
                    registradoEn,
                    usuarioRegistro,
                    observacion,
                    giros);
        }
    }
}
