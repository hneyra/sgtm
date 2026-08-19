package pe.gob.sgtm.catastro.infraestructura;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.catastro.dominio.ActividadEconomica;
import pe.gob.sgtm.catastro.dominio.BienComun;
import pe.gob.sgtm.catastro.dominio.CategoriasConstructivas;
import pe.gob.sgtm.catastro.dominio.Colindante;
import pe.gob.sgtm.catastro.dominio.Construccion;
import pe.gob.sgtm.catastro.dominio.DetalleDeBienesComunes;
import pe.gob.sgtm.catastro.dominio.DetalleDeLaFicha;
import pe.gob.sgtm.catastro.dominio.DetalleEconomico;
import pe.gob.sgtm.catastro.dominio.DetalleRural;
import pe.gob.sgtm.catastro.dominio.EstadoDeConservacion;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.FichaCatastralRepository;
import pe.gob.sgtm.catastro.dominio.MaterialEstructural;
import pe.gob.sgtm.catastro.dominio.Orientacion;
import pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha;
import pe.gob.sgtm.catastro.dominio.OtraInstalacion;
import pe.gob.sgtm.catastro.dominio.ParticipacionComun;
import pe.gob.sgtm.catastro.dominio.Riego;
import pe.gob.sgtm.catastro.dominio.TierraRural;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Medida;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Porcentaje;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Las versiones de la ficha contra PostgreSQL.
 *
 * <p>Hay un {@code INSERT} y hay un {@code UPDATE} que toca <b>una sola columna</b>, {@code
 * vigencia_hasta}. No hay ninguno que cambie los datos de una version: modificar una ficha es crear
 * otra. Si algun dia aparece aqui un {@code UPDATE ... SET area_terreno}, el versionado dejo de
 * existir aunque las tablas sigan igual.
 */
@Repository
public class FichaCatastralRepositoryJdbc extends RepositorioJdbc
        implements FichaCatastralRepository {

    private static final String COLUMNAS_FICHA =
            "id, predio_id, tipo, version, area_terreno, uso, frontis, condicion_propiedad,"
                    + " tipo_edificacion, denominacion, informacion_complementaria,"
                    + " vigencia_desde, vigencia_hasta, origen, documento_origen, observacion";

    private static final String COLUMNAS_ACTIVIDAD =
            "id, ficha_id, conductor, nombre_comercial, ciiu, area_ocupada, licencia_numero,"
                    + " licencia_fecha, anuncio_numero, anuncio_fecha, vigencia_desde";

    private static final String COLUMNAS_BIEN =
            "id, ficha_id, descripcion, area, material_estructural, estado_conservacion,"
                    + " anio_construccion";

    private static final String COLUMNAS_PARTICIPACION = "id, ficha_id, predio_id, porcentaje";

    private static final String COLUMNAS_TIERRA =
            "id, ficha_id, clasificacion, calidad_agrologica, riego, cantidad_hectareas,"
                    + " cantidad_hectareas_comun";

    private static final String COLUMNAS_COLINDANTE = "id, ficha_id, orientacion, descripcion";

    private static final String COLUMNAS_CONSTRUCCION =
            "id, ficha_id, piso, area_construida, anio_construccion, material_estructural,"
                    + " estado_conservacion, categoria_muros, categoria_techos, categoria_pisos,"
                    + " categoria_puertas, categoria_revestim, categoria_banios,"
                    + " categoria_instalac, porcentaje_construido";

    private static final String COLUMNAS_INSTALACION =
            "id, ficha_id, descripcion, unidad_medida, cantidad, anio_construccion,"
                    + " estado_conservacion";

    public FichaCatastralRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<FichaCatastral> vigenteA(long predioId, TipoFicha tipo, LocalDate fecha) {
        Objects.requireNonNull(fecha, "La ficha se pide a una fecha, nunca «la ultima» (regla 9)");
        Optional<FichaCatastral> ficha =
                jdbc().sql(
                                "SELECT "
                                        + COLUMNAS_FICHA
                                        + " FROM ficha_catastral"
                                        + " WHERE predio_id = :predio AND tipo = :tipo"
                                        + "   AND vigencia_desde <= :fecha"
                                        + "   AND (vigencia_hasta IS NULL"
                                        + "        OR vigencia_hasta >= :fecha)"
                                        + " ORDER BY version DESC"
                                        + " LIMIT 1")
                        .param("predio", predioId)
                        .param("tipo", tipo.name())
                        .param("fecha", fecha)
                        .query(FichaCatastralRepositoryJdbc::mapearFicha)
                        .optional();
        return ficha.map(this::conSusPartes);
    }

    @Override
    public List<FichaCatastral> historial(long predioId, TipoFicha tipo) {
        List<FichaCatastral> versiones =
                jdbc().sql(
                                "SELECT "
                                        + COLUMNAS_FICHA
                                        + " FROM ficha_catastral"
                                        + " WHERE predio_id = :predio AND tipo = :tipo"
                                        + " ORDER BY version DESC")
                        .param("predio", predioId)
                        .param("tipo", tipo.name())
                        .query(FichaCatastralRepositoryJdbc::mapearFicha)
                        .list();
        List<FichaCatastral> completas = new ArrayList<>();
        for (FichaCatastral version : versiones) {
            completas.add(conSusPartes(version));
        }
        return List.copyOf(completas);
    }

    @Override
    public Optional<FichaCatastral> ultimaVersion(long predioId, TipoFicha tipo) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_FICHA
                                + " FROM ficha_catastral"
                                + " WHERE predio_id = :predio AND tipo = :tipo"
                                + " ORDER BY version DESC LIMIT 1")
                .param("predio", predioId)
                .param("tipo", tipo.name())
                .query(FichaCatastralRepositoryJdbc::mapearFicha)
                .optional()
                .map(this::conSusPartes);
    }

    @Override
    public FichaCatastral insertar(FichaCatastral ficha) {
        if (!ficha.esNueva()) {
            throw new IllegalArgumentException(
                    "Una version ya registrada no se vuelve a insertar; modificar la ficha es"
                            + " crear la version siguiente");
        }

        Long id =
                jdbc().sql(
                                "INSERT INTO ficha_catastral"
                                        + " (municipalidad_id, predio_id, tipo, version, area_terreno,"
                                        + "  uso, frontis, condicion_propiedad, tipo_edificacion,"
                                        + "  denominacion, informacion_complementaria,"
                                        + "  vigencia_desde, vigencia_hasta, origen, documento_origen,"
                                        + "  observacion, usuario_registro)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :predio, :tipo, :version, :area, :uso, :frontis,"
                                        + "  :condicion, :edificacion, :denominacion,"
                                        + "  :complementaria, :desde, :hasta, :origen,"
                                        + "  :documento, :observacion, :usuario)"
                                        + " RETURNING id")
                        .param("predio", ficha.predioId())
                        .param("tipo", ficha.tipo().name())
                        .param("version", ficha.version())
                        .param("area", ficha.areaTerreno().valor())
                        .param("uso", ficha.uso())
                        .param(
                                "frontis",
                                ficha.frontis() == null ? null : ficha.frontis().magnitud())
                        .param("condicion", ficha.condicionPropiedad())
                        .param("edificacion", ficha.tipoEdificacion())
                        .param("denominacion", ficha.denominacion())
                        .param("complementaria", complementariaDe(ficha))
                        .param("desde", ficha.vigenciaDesde())
                        .param("hasta", ficha.vigenciaHasta())
                        .param("origen", ficha.origen().name())
                        .param("documento", ficha.documentoOrigen())
                        .param("observacion", ficha.observacion().texto())
                        .param("usuario", usuarioActual())
                        .query(Long.class)
                        .single();

        for (Construccion construccion : ficha.construcciones()) {
            insertarConstruccion(construccion.enLaFicha(id));
        }
        for (OtraInstalacion instalacion : ficha.instalaciones()) {
            insertarInstalacion(instalacion.enLaFicha(id));
        }
        insertarDetalle(id, ficha.detalle());

        return conSusPartes(conIdentificador(ficha, id));
    }

    @Override
    public FichaCatastral cerrar(FichaCatastral ficha) {
        long id = Objects.requireNonNull(ficha.id(), "Una version registrada tiene identificador");
        // Una sola columna, y solo si seguia abierta: dos cierres simultaneos no se pisan.
        int filas =
                jdbc().sql(
                                "UPDATE ficha_catastral SET vigencia_hasta = :hasta"
                                        + " WHERE id = :id AND vigencia_hasta IS NULL")
                        .param("id", id)
                        .param("hasta", ficha.vigenciaHasta())
                        .update();
        if (filas == 0) {
            throw new VersionNoVigente(id);
        }
        return ficha;
    }

    @Override
    public List<Construccion> construccionesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_CONSTRUCCION
                                + " FROM construccion WHERE ficha_id = :ficha ORDER BY piso, id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearConstruccion)
                .list();
    }

    @Override
    public List<OtraInstalacion> instalacionesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_INSTALACION
                                + " FROM otra_instalacion WHERE ficha_id = :ficha"
                                + " ORDER BY descripcion, id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearInstalacion)
                .list();
    }

    @Override
    public Optional<DetalleDeLaFicha> detalleDe(long fichaId, TipoFicha tipo) {
        return switch (tipo) {
            // Su detalle son las construcciones, que ya viajan en la ficha.
            case UNICA -> Optional.empty();
            case ECONOMICA ->
                    Optional.of(
                            new DetalleEconomico(
                                    actividadesDe(fichaId), complementariaDe(fichaId)));
            case BIENES_COMUNES ->
                    Optional.of(
                            new DetalleDeBienesComunes(
                                    bienesDe(fichaId), participacionesDe(fichaId)));
            case RURAL -> Optional.of(new DetalleRural(tierrasDe(fichaId), colindantesDe(fichaId)));
        };
    }

    private List<ActividadEconomica> actividadesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_ACTIVIDAD
                                + " FROM actividad_economica WHERE ficha_id = :ficha"
                                + " ORDER BY id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearActividad)
                .list();
    }

    /**
     * Una lectura mas, y a proposito: {@code detalleDe} es parte de la interfaz y tiene que
     * funcionar con solo el identificador. Pasarle la columna desde {@code mapearFicha} lo ataria a
     * quien lo llama, y solo la ficha economica hace este viaje.
     */
    private @Nullable String complementariaDe(long fichaId) {
        return jdbc().sql(
                        "SELECT informacion_complementaria FROM ficha_catastral WHERE id = :ficha")
                .param("ficha", fichaId)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private List<BienComun> bienesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_BIEN
                                + " FROM bien_comun WHERE ficha_id = :ficha"
                                + " ORDER BY descripcion, id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearBien)
                .list();
    }

    private List<ParticipacionComun> participacionesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_PARTICIPACION
                                + " FROM participacion_comun WHERE ficha_id = :ficha"
                                + " ORDER BY predio_id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearParticipacion)
                .list();
    }

    private List<TierraRural> tierrasDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_TIERRA
                                + " FROM tierra_rural WHERE ficha_id = :ficha"
                                + " ORDER BY clasificacion, id")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearTierra)
                .list();
    }

    private List<Colindante> colindantesDe(long fichaId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_COLINDANTE
                                + " FROM colindante_rural WHERE ficha_id = :ficha"
                                + " ORDER BY orientacion")
                .param("ficha", fichaId)
                .query(FichaCatastralRepositoryJdbc::mapearColindante)
                .list();
    }

    /**
     * Escribe lo propio del tipo. Es el reverso exacto de {@link #detalleDe}: si aparece aqui una
     * rama que alli no esta, o al reves, versionar dejaria de copiar algo.
     */
    private void insertarDetalle(long fichaId, @Nullable DetalleDeLaFicha detalle) {
        switch (detalle) {
            case null -> {
                // La ficha UNICA no tiene detalle propio.
            }
            case DetalleEconomico economico -> {
                for (ActividadEconomica actividad : economico.actividades()) {
                    insertarActividad(actividad.enLaFicha(fichaId));
                }
            }
            case DetalleDeBienesComunes comunes -> {
                for (BienComun bien : comunes.bienes()) {
                    insertarBien(bien.enLaFicha(fichaId));
                }
                for (ParticipacionComun participacion : comunes.participaciones()) {
                    insertarParticipacion(participacion.enLaFicha(fichaId));
                }
            }
            case DetalleRural rural -> {
                for (TierraRural tierra : rural.tierras()) {
                    insertarTierra(tierra.enLaFicha(fichaId));
                }
                for (Colindante colindante : rural.colindantes()) {
                    insertarColindante(colindante.enLaFicha(fichaId));
                }
            }
        }
    }

    private void insertarActividad(ActividadEconomica actividad) {
        jdbc().sql(
                        "INSERT INTO actividad_economica"
                                + " (municipalidad_id, ficha_id, conductor, nombre_comercial, ciiu,"
                                + "  area_ocupada, licencia_numero, licencia_fecha, anuncio_numero,"
                                + "  anuncio_fecha, vigencia_desde)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :conductor, :comercial, :ciiu, :area, :licencia,"
                                + "  :licenciaFecha, :anuncio, :anuncioFecha, :desde)")
                .param("ficha", actividad.fichaId())
                .param("conductor", actividad.conductor())
                .param("comercial", actividad.nombreComercial())
                .param("ciiu", actividad.ciiu())
                .param(
                        "area",
                        actividad.areaOcupada() == null ? null : actividad.areaOcupada().valor())
                .param("licencia", actividad.licenciaNumero())
                .param("licenciaFecha", actividad.licenciaFecha())
                .param("anuncio", actividad.anuncioNumero())
                .param("anuncioFecha", actividad.anuncioFecha())
                .param("desde", actividad.vigenciaDesde())
                .update();
    }

    private void insertarBien(BienComun bien) {
        jdbc().sql(
                        "INSERT INTO bien_comun"
                                + " (municipalidad_id, ficha_id, descripcion, area,"
                                + "  material_estructural, estado_conservacion, anio_construccion)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :descripcion, :area, :material, :estado, :anio)")
                .param("ficha", bien.fichaId())
                .param("descripcion", bien.descripcion())
                .param("area", bien.area().valor())
                .param("material", nombreDe(bien.material()))
                .param("estado", nombreDe(bien.estadoConservacion()))
                .param(
                        "anio",
                        bien.anioConstruccion() == null ? null : bien.anioConstruccion().valor())
                .update();
    }

    private void insertarParticipacion(ParticipacionComun participacion) {
        jdbc().sql(
                        "INSERT INTO participacion_comun"
                                + " (municipalidad_id, ficha_id, predio_id, porcentaje)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :predio, :porcentaje)")
                .param("ficha", participacion.fichaId())
                .param("predio", participacion.predioId())
                .param("porcentaje", participacion.porcentaje().valor())
                .update();
    }

    private void insertarTierra(TierraRural tierra) {
        jdbc().sql(
                        "INSERT INTO tierra_rural"
                                + " (municipalidad_id, ficha_id, clasificacion, calidad_agrologica,"
                                + "  riego, cantidad_hectareas, cantidad_hectareas_comun)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :clasificacion, :calidad, :riego, :hectareas,"
                                + "  :comunes)")
                .param("ficha", tierra.fichaId())
                .param("clasificacion", tierra.clasificacion())
                .param("calidad", tierra.calidadAgrologica())
                .param("riego", tierra.riego().name())
                .param("hectareas", tierra.hectareas().magnitud())
                .param(
                        "comunes",
                        tierra.hectareasComunes() == null
                                ? null
                                : tierra.hectareasComunes().magnitud())
                .update();
    }

    private void insertarColindante(Colindante colindante) {
        jdbc().sql(
                        "INSERT INTO colindante_rural"
                                + " (municipalidad_id, ficha_id, orientacion, descripcion)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :orientacion, :descripcion)")
                .param("ficha", colindante.fichaId())
                .param("orientacion", colindante.orientacion().name())
                .param("descripcion", colindante.descripcion())
                .update();
    }

    private static ActividadEconomica mapearActividad(ResultSet fila, int numeroDeFila)
            throws SQLException {
        BigDecimal area = fila.getBigDecimal("area_ocupada");
        return new ActividadEconomica(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getString("conductor"),
                fila.getString("nombre_comercial"),
                fila.getString("ciiu"),
                area == null ? null : new AreaM2(area),
                fila.getString("licencia_numero"),
                fecha(fila, "licencia_fecha"),
                fila.getString("anuncio_numero"),
                fecha(fila, "anuncio_fecha"),
                fecha(fila, "vigencia_desde"));
    }

    private static BienComun mapearBien(ResultSet fila, int numeroDeFila) throws SQLException {
        int anio = fila.getInt("anio_construccion");
        Ejercicio ejercicio = fila.wasNull() ? null : new Ejercicio(anio);
        return new BienComun(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getString("descripcion"),
                new AreaM2(fila.getBigDecimal("area")),
                valorDe(MaterialEstructural.class, fila.getString("material_estructural")),
                valorDe(EstadoDeConservacion.class, fila.getString("estado_conservacion")),
                ejercicio);
    }

    private static ParticipacionComun mapearParticipacion(ResultSet fila, int numeroDeFila)
            throws SQLException {
        return new ParticipacionComun(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getLong("predio_id"),
                new Porcentaje(fila.getBigDecimal("porcentaje")));
    }

    private static TierraRural mapearTierra(ResultSet fila, int numeroDeFila) throws SQLException {
        BigDecimal comunes = fila.getBigDecimal("cantidad_hectareas_comun");
        return new TierraRural(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getString("clasificacion"),
                fila.getString("calidad_agrologica"),
                Riego.valueOf(fila.getString("riego")),
                new Medida(fila.getBigDecimal("cantidad_hectareas"), TierraRural.HECTAREA),
                comunes == null ? null : new Medida(comunes, TierraRural.HECTAREA));
    }

    private static Colindante mapearColindante(ResultSet fila, int numeroDeFila)
            throws SQLException {
        return new Colindante(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                Orientacion.valueOf(fila.getString("orientacion")),
                fila.getString("descripcion"));
    }

    private static @Nullable LocalDate fecha(ResultSet fila, String columna) throws SQLException {
        java.sql.Date valor = fila.getDate(columna);
        return valor == null ? null : valor.toLocalDate();
    }

    /** Lo que va a la columna de la ficha; solo la economica lo tiene. */
    private static @Nullable String complementariaDe(FichaCatastral ficha) {
        return ficha.detalle() instanceof DetalleEconomico economico
                ? economico.informacionComplementaria()
                : null;
    }

    // ------------------------------------------------------------------

    private FichaCatastral conSusPartes(FichaCatastral ficha) {
        long id = Objects.requireNonNull(ficha.id(), "Una ficha leida tiene identificador");
        return ficha.con(construccionesDe(id))
                .conInstalaciones(instalacionesDe(id))
                .conDetalle(detalleDe(id, ficha.tipo()).orElse(null));
    }

    private void insertarConstruccion(Construccion construccion) {
        CategoriasConstructivas categorias = construccion.categorias();
        jdbc().sql(
                        "INSERT INTO construccion"
                                + " (municipalidad_id, ficha_id, piso, area_construida,"
                                + "  anio_construccion, material_estructural, estado_conservacion,"
                                + "  categoria_muros, categoria_techos, categoria_pisos,"
                                + "  categoria_puertas, categoria_revestim, categoria_banios,"
                                + "  categoria_instalac, porcentaje_construido)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :piso, :area, :anio, :material, :estado, :muros,"
                                + "  :techos, :pisos, :puertas, :revestim, :banios, :instalac,"
                                + "  :porcentaje)")
                .param("ficha", construccion.fichaId())
                .param("piso", construccion.piso())
                .param("area", construccion.areaConstruida().valor())
                .param(
                        "anio",
                        construccion.anioConstruccion() == null
                                ? null
                                : construccion.anioConstruccion().valor())
                .param("material", nombreDe(construccion.material()))
                .param("estado", nombreDe(construccion.estadoConservacion()))
                .param("muros", texto(categorias.muros()))
                .param("techos", texto(categorias.techos()))
                .param("pisos", texto(categorias.pisos()))
                .param("puertas", texto(categorias.puertas()))
                .param("revestim", texto(categorias.revestimientos()))
                .param("banios", texto(categorias.banios()))
                .param("instalac", texto(categorias.instalaciones()))
                .param(
                        "porcentaje",
                        construccion.porcentajeConstruido() == null
                                ? null
                                : construccion.porcentajeConstruido().valor())
                .update();
    }

    private void insertarInstalacion(OtraInstalacion instalacion) {
        jdbc().sql(
                        "INSERT INTO otra_instalacion"
                                + " (municipalidad_id, ficha_id, descripcion, unidad_medida,"
                                + "  cantidad, anio_construccion, estado_conservacion)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :ficha, :descripcion, :unidad, :cantidad, :anio, :estado)")
                .param("ficha", instalacion.fichaId())
                .param("descripcion", instalacion.descripcion())
                .param("unidad", instalacion.cantidad().unidad())
                .param("cantidad", instalacion.cantidad().magnitud())
                .param(
                        "anio",
                        instalacion.anioConstruccion() == null
                                ? null
                                : instalacion.anioConstruccion().valor())
                .param("estado", nombreDe(instalacion.estadoConservacion()))
                .update();
    }

    private static FichaCatastral conIdentificador(FichaCatastral ficha, Long id) {
        return new FichaCatastral(
                id,
                ficha.predioId(),
                ficha.tipo(),
                ficha.version(),
                ficha.areaTerreno(),
                ficha.uso(),
                ficha.frontis(),
                ficha.condicionPropiedad(),
                ficha.tipoEdificacion(),
                ficha.denominacion(),
                ficha.vigenciaDesde(),
                ficha.vigenciaHasta(),
                ficha.origen(),
                ficha.documentoOrigen(),
                ficha.observacion(),
                ficha.construcciones(),
                ficha.instalaciones(),
                ficha.detalle());
    }

    private static FichaCatastral mapearFicha(ResultSet fila, int numeroDeFila)
            throws SQLException {
        java.sql.Date hasta = fila.getDate("vigencia_hasta");
        return new FichaCatastral(
                fila.getLong("id"),
                fila.getLong("predio_id"),
                TipoFicha.valueOf(fila.getString("tipo")),
                fila.getInt("version"),
                new AreaM2(fila.getBigDecimal("area_terreno")),
                fila.getString("uso"),
                frontisDe(fila),
                fila.getString("condicion_propiedad"),
                fila.getString("tipo_edificacion"),
                fila.getString("denominacion"),
                fila.getDate("vigencia_desde").toLocalDate(),
                hasta == null ? null : hasta.toLocalDate(),
                OrigenDeLaFicha.valueOf(fila.getString("origen")),
                fila.getString("documento_origen"),
                Observacion.de(fila.getString("observacion")),
                List.of(),
                List.of(),
                null);
    }

    private static Construccion mapearConstruccion(ResultSet fila, int numeroDeFila)
            throws SQLException {
        int anio = fila.getInt("anio_construccion");
        Ejercicio ejercicio = fila.wasNull() ? null : new Ejercicio(anio);
        BigDecimal porcentaje = fila.getBigDecimal("porcentaje_construido");

        return new Construccion(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getString("piso"),
                new AreaM2(fila.getBigDecimal("area_construida")),
                ejercicio,
                valorDe(MaterialEstructural.class, fila.getString("material_estructural")),
                valorDe(EstadoDeConservacion.class, fila.getString("estado_conservacion")),
                new CategoriasConstructivas(
                        caracter(fila, "categoria_muros"),
                        caracter(fila, "categoria_techos"),
                        caracter(fila, "categoria_pisos"),
                        caracter(fila, "categoria_puertas"),
                        caracter(fila, "categoria_revestim"),
                        caracter(fila, "categoria_banios"),
                        caracter(fila, "categoria_instalac")),
                porcentaje == null ? null : new Porcentaje(porcentaje));
    }

    private static OtraInstalacion mapearInstalacion(ResultSet fila, int numeroDeFila)
            throws SQLException {
        int anio = fila.getInt("anio_construccion");
        Ejercicio ejercicio = fila.wasNull() ? null : new Ejercicio(anio);

        return new OtraInstalacion(
                fila.getLong("id"),
                fila.getLong("ficha_id"),
                fila.getString("descripcion"),
                new Medida(fila.getBigDecimal("cantidad"), fila.getString("unidad_medida")),
                ejercicio,
                valorDe(EstadoDeConservacion.class, fila.getString("estado_conservacion")));
    }

    private static <E extends Enum<E>> @Nullable E valorDe(Class<E> tipo, @Nullable String nombre) {
        return nombre == null ? null : Enum.valueOf(tipo, nombre);
    }

    private static @Nullable Character caracter(ResultSet fila, String columna)
            throws SQLException {
        String valor = fila.getString(columna);
        return valor == null || valor.isEmpty() ? null : valor.charAt(0);
    }

    /** El frontis se guarda en metros lineales; la columna no lleva unidad porque solo hay una. */
    private static @Nullable Medida frontisDe(ResultSet fila) throws SQLException {
        BigDecimal valor = fila.getBigDecimal("frontis");
        return valor == null ? null : new Medida(valor, "ML");
    }

    private static @Nullable String texto(@Nullable Character categoria) {
        return categoria == null ? null : String.valueOf(categoria);
    }

    private static @Nullable String nombreDe(@Nullable Enum<?> valor) {
        return valor == null ? null : valor.name();
    }

    /** Quien registra. La columna es {@code NOT NULL} y sale del contexto de origen. */
    private static String usuarioActual() {
        Origen origen = OrigenContext.actual();
        return origen.usuario();
    }

    /** Se quiso cerrar una version que ya estaba cerrada, o que no existe aqui. */
    public static final class VersionNoVigente extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        VersionNoVigente(long id) {
            super(
                    "La version "
                            + id
                            + " no esta vigente en esta municipalidad; cerrarla otra vez"
                            + " reescribiria el historial");
        }
    }
}
