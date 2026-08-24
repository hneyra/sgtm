package pe.gob.sgtm.catastro.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.CondicionDeTitularidad;
import pe.gob.sgtm.catastro.dominio.EstadoPredio;
import pe.gob.sgtm.catastro.dominio.Inquilino;
import pe.gob.sgtm.catastro.dominio.Manzana;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.TipoPredio;
import pe.gob.sgtm.catastro.dominio.Titularidad;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.dominio.Porcentaje;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Predios, catalogos y titularidad contra PostgreSQL.
 *
 * <p>La regla de que los porcentajes vigentes no excedan 100 <b>no esta aqui</b>: vive en el
 * disparador diferido {@code titularidad_no_excede_trg} de {@code V1}. Escribirla en Java ademas
 * seria repetirla en el sitio equivocado —se evalua al cerrar la transaccion, y desde aqui no se
 * sabe cuando cierra—.
 */
@Repository
public class CatastroRepositoryJdbc extends RepositorioJdbc implements CatastroRepository {

    private static final String COLUMNAS_SECTOR = "id, codigo, nombre, zona, activo";

    private static final String COLUMNAS_MANZANA = "id, sector_id, codigo";

    private static final String COLUMNAS_PREDIO =
            "id, codigo_ref_catastral, tipo, via_id, numero_municipal, direccion, sector_id,"
                    + " manzana_id, lote, ubigeo, estado";

    private static final String COLUMNAS_TITULARIDAD =
            "id, predio_id, contribuyente_id, condicion, porcentaje, vigencia_desde,"
                    + " vigencia_hasta, documento_origen";

    private static final String COLUMNAS_INQUILINO =
            "id, predio_id, contribuyente_id, uso, vigencia_desde, vigencia_hasta,"
                    + " documento_origen";

    private static final OrdenSeguro ORDEN_SECTOR =
            OrdenSeguro.sobre("codigo", "nombre", "zona", "id");

    private static final OrdenSeguro ORDEN_PREDIO =
            OrdenSeguro.sobre("codigo_ref_catastral", "direccion", "tipo", "id");

    /** Rige en la fecha; los dos extremos entran, igual que {@code Titularidad.rigeEn}. */
    private static final String VIGENTE_A_LA_FECHA =
            " vigencia_desde <= :fecha AND (vigencia_hasta IS NULL OR vigencia_hasta >= :fecha)";

    public CatastroRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    // ---------- Sectores y manzanas ----------

    @Override
    public Pagina<Sector> sectores(Paginacion paginacion) {
        return paginar(
                "SELECT " + COLUMNAS_SECTOR + " FROM sector",
                "SELECT count(*) FROM sector",
                Map.of(),
                paginacion,
                ORDEN_SECTOR,
                CatastroRepositoryJdbc::mapearSector);
    }

    @Override
    public Optional<Sector> sectorPorCodigo(String codigo) {
        return jdbc().sql("SELECT " + COLUMNAS_SECTOR + " FROM sector WHERE codigo = :codigo")
                .param("codigo", codigo)
                .query(CatastroRepositoryJdbc::mapearSector)
                .optional();
    }

    @Override
    public Optional<Sector> sectorPorId(long id) {
        return jdbc().sql("SELECT " + COLUMNAS_SECTOR + " FROM sector WHERE id = :id")
                .param("id", id)
                .query(CatastroRepositoryJdbc::mapearSector)
                .optional();
    }

    @Override
    public Sector guardar(Sector sector) {
        if (sector.esNuevo()) {
            Long id =
                    jdbc().sql(
                                    "INSERT INTO sector"
                                            + " (municipalidad_id, codigo, nombre, zona, activo)"
                                            + " VALUES ("
                                            + MUNICIPALIDAD_ACTUAL
                                            + ", :codigo, :nombre, :zona, :activo) RETURNING id")
                            .param("codigo", sector.codigo())
                            .param("nombre", sector.nombre())
                            .param("zona", sector.zona())
                            .param("activo", sector.activo())
                            .query(Long.class)
                            .single();
            return new Sector(id, sector.codigo(), sector.nombre(), sector.zona(), sector.activo());
        }

        long id = Objects.requireNonNull(sector.id(), "Un sector existente tiene identificador");
        int filas =
                jdbc().sql(
                                "UPDATE sector SET nombre = :nombre, zona = :zona, activo = :activo"
                                        + " WHERE id = :id")
                        .param("id", id)
                        .param("nombre", sector.nombre())
                        .param("zona", sector.zona())
                        .param("activo", sector.activo())
                        .update();
        if (filas == 0) {
            throw new NoEncontrado("sector", id);
        }
        return sector;
    }

    @Override
    public List<Manzana> manzanasDe(long sectorId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_MANZANA
                                + " FROM manzana WHERE sector_id = :sector ORDER BY codigo")
                .param("sector", sectorId)
                .query(CatastroRepositoryJdbc::mapearManzana)
                .list();
    }

    @Override
    public Manzana guardar(Manzana manzana) {
        if (!manzana.esNueva()) {
            throw new IllegalArgumentException(
                    "Una manzana no se edita: su codigo esta dentro del codigo catastral de sus"
                            + " predios, y cambiarlo los desalinearia todos");
        }
        Long id =
                jdbc().sql(
                                "INSERT INTO manzana (municipalidad_id, sector_id, codigo)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :sector, :codigo) RETURNING id")
                        .param("sector", manzana.sectorId())
                        .param("codigo", manzana.codigo())
                        .query(Long.class)
                        .single();
        return new Manzana(id, manzana.sectorId(), manzana.codigo());
    }

    // ---------- Predios ----------

    @Override
    public Optional<Predio> predio(long id) {
        return jdbc().sql("SELECT " + COLUMNAS_PREDIO + " FROM predio WHERE id = :id")
                .param("id", id)
                .query(CatastroRepositoryJdbc::mapearPredio)
                .optional();
    }

    @Override
    public Optional<Predio> predioPorCodigo(CodigoReferenciaCatastral codigo) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_PREDIO
                                + " FROM predio WHERE codigo_ref_catastral = :codigo")
                .param("codigo", codigo.valor())
                .query(CatastroRepositoryJdbc::mapearPredio)
                .optional();
    }

    @Override
    public Pagina<Predio> predios(Paginacion paginacion) {
        return paginar(
                "SELECT " + COLUMNAS_PREDIO + " FROM predio",
                "SELECT count(*) FROM predio",
                Map.of(),
                paginacion,
                ORDEN_PREDIO,
                CatastroRepositoryJdbc::mapearPredio);
    }

    @Override
    public Predio guardar(Predio predio) {
        if (predio.esNuevo()) {
            Long id =
                    jdbc().sql(
                                    "INSERT INTO predio"
                                            + " (municipalidad_id, codigo_ref_catastral, tipo, via_id,"
                                            + "  numero_municipal, direccion, sector_id, manzana_id,"
                                            + "  lote, ubigeo, estado)"
                                            + " VALUES ("
                                            + MUNICIPALIDAD_ACTUAL
                                            + ", :codigo, :tipo, :via, :numero, :direccion,"
                                            + "  :sector, :manzana, :lote, :ubigeo, :estado)"
                                            + " RETURNING id")
                            .params(camposDe(predio))
                            .query(Long.class)
                            .single();
            return conIdentificador(predio, id);
        }

        long id = Objects.requireNonNull(predio.id(), "Un predio existente tiene identificador");
        java.util.Map<String, Object> campos = new java.util.HashMap<>(camposDe(predio));
        campos.put("id", id);
        int filas =
                jdbc().sql(
                                """
                                UPDATE predio
                                   SET tipo             = :tipo,
                                       via_id           = :via,
                                       numero_municipal = :numero,
                                       direccion        = :direccion,
                                       sector_id        = :sector,
                                       manzana_id       = :manzana,
                                       lote             = :lote,
                                       ubigeo           = :ubigeo,
                                       estado           = :estado
                                 WHERE id = :id
                                """)
                        .params(campos)
                        .update();
        if (filas == 0) {
            throw new NoEncontrado("predio", id);
        }
        return predio;
    }

    // ---------- Titularidad ----------

    @Override
    public List<Titularidad> titularesDe(long predioId, LocalDate fecha) {
        Objects.requireNonNull(fecha, "De quien es el predio se pregunta a una fecha (regla 9)");
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_TITULARIDAD
                                + " FROM titularidad"
                                + " WHERE predio_id = :predio AND"
                                + VIGENTE_A_LA_FECHA
                                + " ORDER BY porcentaje DESC, id")
                .param("predio", predioId)
                .param("fecha", fecha)
                .query(CatastroRepositoryJdbc::mapearTitularidad)
                .list();
    }

    @Override
    public List<Titularidad> prediosDe(long contribuyenteId, LocalDate fecha) {
        Objects.requireNonNull(fecha, "Los predios de alguien se preguntan a una fecha (regla 9)");
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_TITULARIDAD
                                + " FROM titularidad"
                                + " WHERE contribuyente_id = :contribuyente AND"
                                + VIGENTE_A_LA_FECHA
                                + " ORDER BY predio_id, id")
                .param("contribuyente", contribuyenteId)
                .param("fecha", fecha)
                .query(CatastroRepositoryJdbc::mapearTitularidad)
                .list();
    }

    @Override
    public Optional<Titularidad> titularidad(long id) {
        return jdbc().sql("SELECT " + COLUMNAS_TITULARIDAD + " FROM titularidad WHERE id = :id")
                .param("id", id)
                .query(CatastroRepositoryJdbc::mapearTitularidad)
                .optional();
    }

    @Override
    public Titularidad guardar(Titularidad titularidad) {
        if (titularidad.esNueva()) {
            Long id =
                    jdbc().sql(
                                    "INSERT INTO titularidad"
                                            + " (municipalidad_id, predio_id, contribuyente_id,"
                                            + "  condicion, porcentaje, vigencia_desde,"
                                            + "  vigencia_hasta, documento_origen)"
                                            + " VALUES ("
                                            + MUNICIPALIDAD_ACTUAL
                                            + ", :predio, :contribuyente, :condicion,"
                                            + "  :porcentaje, :desde, :hasta, :documento)"
                                            + " RETURNING id")
                            .param("predio", titularidad.predioId())
                            .param("contribuyente", titularidad.contribuyenteId())
                            .param("condicion", titularidad.condicion().name())
                            .param("porcentaje", titularidad.porcentaje().valor())
                            .param("desde", titularidad.vigenciaDesde())
                            .param("hasta", titularidad.vigenciaHasta())
                            .param("documento", titularidad.documentoOrigen())
                            .query(Long.class)
                            .single();
            return new Titularidad(
                    id,
                    titularidad.predioId(),
                    titularidad.contribuyenteId(),
                    titularidad.condicion(),
                    titularidad.porcentaje(),
                    titularidad.vigenciaDesde(),
                    titularidad.vigenciaHasta(),
                    titularidad.documentoOrigen());
        }

        long id = Objects.requireNonNull(titularidad.id(), "Una titularidad existente tiene id");
        int filas =
                jdbc().sql(
                                "UPDATE titularidad SET vigencia_hasta = :hasta"
                                        + " WHERE id = :id AND vigencia_hasta IS NULL")
                        .param("id", id)
                        .param("hasta", titularidad.vigenciaHasta())
                        .update();
        if (filas == 0) {
            throw new NoEncontrado("titularidad vigente", id);
        }
        return titularidad;
    }

    // ---------- Inquilinos (#31) ----------

    @Override
    public List<Inquilino> inquilinosDe(long predioId, LocalDate fecha) {
        Objects.requireNonNull(fecha, "Quien ocupa el predio se pregunta a una fecha (regla 9)");
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_INQUILINO
                                + " FROM inquilino"
                                + " WHERE predio_id = :predio AND"
                                + VIGENTE_A_LA_FECHA
                                + " ORDER BY id")
                .param("predio", predioId)
                .param("fecha", fecha)
                .query(CatastroRepositoryJdbc::mapearInquilino)
                .list();
    }

    @Override
    public Optional<Inquilino> inquilino(long id) {
        return jdbc().sql("SELECT " + COLUMNAS_INQUILINO + " FROM inquilino WHERE id = :id")
                .param("id", id)
                .query(CatastroRepositoryJdbc::mapearInquilino)
                .optional();
    }

    @Override
    public Inquilino guardar(Inquilino inquilino) {
        if (inquilino.esNuevo()) {
            Long id =
                    jdbc().sql(
                                    "INSERT INTO inquilino"
                                            + " (municipalidad_id, predio_id, contribuyente_id,"
                                            + "  uso, vigencia_desde, vigencia_hasta,"
                                            + "  documento_origen)"
                                            + " VALUES ("
                                            + MUNICIPALIDAD_ACTUAL
                                            + ", :predio, :contribuyente, :uso, :desde, :hasta,"
                                            + "  :documento)"
                                            + " RETURNING id")
                            .param("predio", inquilino.predioId())
                            .param("contribuyente", inquilino.contribuyenteId())
                            .param("uso", inquilino.uso())
                            .param("desde", inquilino.vigenciaDesde())
                            .param("hasta", inquilino.vigenciaHasta())
                            .param("documento", inquilino.documentoOrigen())
                            .query(Long.class)
                            .single();
            return new Inquilino(
                    id,
                    inquilino.predioId(),
                    inquilino.contribuyenteId(),
                    inquilino.uso(),
                    inquilino.vigenciaDesde(),
                    inquilino.vigenciaHasta(),
                    inquilino.documentoOrigen());
        }

        long id = Objects.requireNonNull(inquilino.id(), "Un inquilino existente tiene id");
        int filas =
                jdbc().sql(
                                "UPDATE inquilino SET vigencia_hasta = :hasta"
                                        + " WHERE id = :id AND vigencia_hasta IS NULL")
                        .param("id", id)
                        .param("hasta", inquilino.vigenciaHasta())
                        .update();
        if (filas == 0) {
            throw new NoEncontrado("inquilino vigente", id);
        }
        return inquilino;
    }

    // ---------- Mapeos ----------

    private static Map<String, Object> camposDe(Predio predio) {
        java.util.Map<String, Object> campos = new java.util.HashMap<>();
        campos.put("codigo", predio.codigo().valor());
        campos.put("tipo", predio.tipo().name());
        campos.put("via", predio.viaId());
        campos.put("numero", predio.numeroMunicipal());
        campos.put("direccion", predio.direccion());
        campos.put("sector", predio.sectorId());
        campos.put("manzana", predio.manzanaId());
        campos.put("lote", predio.lote());
        campos.put("ubigeo", predio.ubigeo());
        campos.put("estado", predio.estado().name());
        return campos;
    }

    private static Predio conIdentificador(Predio predio, Long id) {
        return new Predio(
                id,
                predio.codigo(),
                predio.tipo(),
                predio.viaId(),
                predio.numeroMunicipal(),
                predio.direccion(),
                predio.sectorId(),
                predio.manzanaId(),
                predio.lote(),
                predio.ubigeo(),
                predio.estado());
    }

    private static Sector mapearSector(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Sector(
                fila.getLong("id"),
                fila.getString("codigo"),
                fila.getString("nombre"),
                fila.getString("zona"),
                fila.getBoolean("activo"));
    }

    private static Manzana mapearManzana(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Manzana(fila.getLong("id"), fila.getLong("sector_id"), fila.getString("codigo"));
    }

    private static Predio mapearPredio(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Predio(
                fila.getLong("id"),
                CodigoReferenciaCatastral.de(fila.getString("codigo_ref_catastral")),
                TipoPredio.valueOf(fila.getString("tipo")),
                largoOpcional(fila, "via_id"),
                fila.getString("numero_municipal"),
                fila.getString("direccion"),
                largoOpcional(fila, "sector_id"),
                largoOpcional(fila, "manzana_id"),
                fila.getString("lote"),
                fila.getString("ubigeo"),
                EstadoPredio.valueOf(fila.getString("estado")));
    }

    private static Titularidad mapearTitularidad(ResultSet fila, int numeroDeFila)
            throws SQLException {
        java.sql.Date hasta = fila.getDate("vigencia_hasta");
        return new Titularidad(
                fila.getLong("id"),
                fila.getLong("predio_id"),
                fila.getLong("contribuyente_id"),
                CondicionDeTitularidad.valueOf(fila.getString("condicion")),
                new Porcentaje(fila.getBigDecimal("porcentaje")),
                fila.getDate("vigencia_desde").toLocalDate(),
                hasta == null ? null : hasta.toLocalDate(),
                fila.getString("documento_origen"));
    }

    private static Inquilino mapearInquilino(ResultSet fila, int numeroDeFila) throws SQLException {
        java.sql.Date hasta = fila.getDate("vigencia_hasta");
        return new Inquilino(
                fila.getLong("id"),
                fila.getLong("predio_id"),
                fila.getLong("contribuyente_id"),
                fila.getString("uso"),
                fila.getDate("vigencia_desde").toLocalDate(),
                hasta == null ? null : hasta.toLocalDate(),
                fila.getString("documento_origen"));
    }

    /** {@code wasNull()} se pregunta justo despues de leer la columna, nunca mas tarde. */
    private static @Nullable Long largoOpcional(ResultSet fila, String columna)
            throws SQLException {
        long valor = fila.getLong(columna);
        return fila.wasNull() ? null : valor;
    }

    /** No existe, o es de otra municipalidad. Desde la aplicacion es lo mismo. */
    public static final class NoEncontrado extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        NoEncontrado(String que, long id) {
            super("No hay ningun " + que + " con identificador " + id + " en esta municipalidad");
        }
    }
}
