package pe.gob.sgtm.catastro.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
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
import pe.gob.sgtm.catastro.dominio.FiltroDePredios;
import pe.gob.sgtm.catastro.dominio.FiltroDelPlano;
import pe.gob.sgtm.catastro.dominio.Inquilino;
import pe.gob.sgtm.catastro.dominio.LoteDelPlano;
import pe.gob.sgtm.catastro.dominio.Manzana;
import pe.gob.sgtm.catastro.dominio.ManzanaConConteos;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.PredioDelCatastro;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.SectorConConteos;
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

    /**
     * Por codigo o por identificador, y nada mas.
     *
     * <p>Los dos son <b>unicos dentro del sector</b> —{@code manzana_codigo_uq (municipalidad_id,
     * sector_id, codigo)}—, asi que cualquiera de los dos ordena de forma total y dos paginas
     * consecutivas no pueden repetir una fila ni saltarse otra. Los conteos no estan en la lista a
     * proposito: {@code predios} y {@code lotes} no son columnas de {@code manzana} sino el
     * resultado de contar <b>despues</b> del limite, asi que no hay por donde ordenar por ellos; y
     * si los hubiera, ordenar por un numero que se repite dejaria el orden sin desempate.
     */
    private static final OrdenSeguro ORDEN_MANZANA = OrdenSeguro.sobre("codigo", "id");

    /**
     * Los tres conteos de cada sector <b>de la pagina</b> (#290), en una sola consulta.
     *
     * <h2>Por que se cuenta aparte y no dentro del listado</h2>
     *
     * <p>Porque asi se cuenta <b>despues</b> del {@code LIMIT}. Escrito como subconsulta en la
     * lista de campos del listado, o como {@code LATERAL} de su {@code FROM}, la agregacion entra
     * en el plan por debajo del orden y el limite: PostgreSQL la evaluaria para <b>todos</b> los
     * sectores que cumplen el filtro y despues tiraria todos menos veinte. Aqui la entrada es la
     * lista de identificadores que la pagina ya trajo, asi que el trabajo esta acotado por el
     * tamano de pagina y no por el del padron.
     *
     * <p>Cada {@code LATERAL} es una agregacion sin {@code GROUP BY}, asi que devuelve <b>siempre
     * una fila</b> —cero cuando no hay nada que contar— y ningun conteo sale nulo. Los dos usan
     * {@code predio_sector_ix (municipalidad_id, sector_id, manzana_id)} y el indice de la clave
     * ajena del sector en {@code manzana}.
     *
     * <p>El estado entra por parametro y no como literal para que la unica definicion de «predio
     * activo» siga siendo {@link EstadoPredio}.
     *
     * <p>{@code count(DISTINCT (manzana_id, lote))} cuenta pares, no lotes sueltos: el lote «01» de
     * la manzana A y el «01» de la manzana B son dos. El {@code FILTER} deja fuera al predio sin
     * lote, que no es un lote vacio sino un predio del que todavia no se sabe en cual esta.
     */
    private static final String CONTEOS_DEL_SECTOR =
            """
            SELECT s.id AS sector_id,
                   mz.manzanas,
                   pd.predios,
                   pd.lotes
              FROM sector s
              LEFT JOIN LATERAL (
                       SELECT count(*) AS manzanas
                         FROM manzana m
                        WHERE m.sector_id = s.id) mz ON true
              LEFT JOIN LATERAL (
                       SELECT count(*) AS predios,
                              count(DISTINCT (p.manzana_id, p.lote))
                                  FILTER (WHERE p.lote IS NOT NULL) AS lotes
                         FROM predio p
                        WHERE p.sector_id = s.id
                          AND p.estado = :activo) pd ON true
             WHERE s.id IN (:sectores)
            """;

    /**
     * Los dos conteos de cada manzana <b>de la pagina</b> (#537), en una sola consulta.
     *
     * <p>Se cuenta aparte y no dentro del listado por lo mismo que {@link #CONTEOS_DEL_SECTOR}: asi
     * la agregacion entra <b>despues</b> del {@code LIMIT} y su trabajo lo acota el tamano de
     * pagina y no el del padron.
     *
     * <p><b>El {@code sector_id} esta en el {@code WHERE} y no sobra.</b> Hace dos cosas: usa
     * {@code predio_sector_ix (municipalidad_id, sector_id, manzana_id)} —sin el, {@code
     * manzana_id} no tiene indice propio y esto seria un recorrido de {@code predio} por cada
     * pagina—, y dice <b>que</b> se cuenta: los predios de este sector repartidos por manzana. Un
     * predio que nombra la manzana y no nombra su sector no cuenta en ninguna, que es la misma
     * regla que {@link SectorConConteos} ya aplica un escalon mas arriba.
     *
     * <p>Aqui es {@code GROUP BY} y no un {@code LATERAL} por sector: la entrada es una sola tabla
     * acotada por dos columnas del mismo indice, y la manzana sin ningun predio simplemente no sale
     * en el resultado —el mapeo de arriba la deja en cero, que en una manzana <b>de la pagina</b>
     * es una cuenta hecha y no una cuenta que falta—.
     *
     * <p>{@code count(DISTINCT p.lote)} cuenta lotes y no pares: dentro de una manzana el lote ya
     * identifica. El {@code FILTER} deja fuera al predio sin lote, que no es un lote vacio sino un
     * predio del que todavia no se sabe en cual esta.
     */
    private static final String CONTEOS_DE_LA_MANZANA =
            """
            SELECT p.manzana_id,
                   count(*) AS predios,
                   count(DISTINCT p.lote) FILTER (WHERE p.lote IS NOT NULL) AS lotes
              FROM predio p
             WHERE p.sector_id = :sector
               AND p.manzana_id IN (:manzanas)
               AND p.estado = :activo
             GROUP BY p.manzana_id
            """;

    /**
     * El padron del catastro: el predio con su ubicacion resuelta a codigos y si llego a ficharse.
     *
     * <p>Los cuatro {@code JOIN} son externos, y no es una precaucion de estilo: un predio sin via,
     * sin sector, sin manzana o <b>sin ficha</b> es exactamente lo que esta consulta existe para
     * encontrar. Con {@code JOIN} interno, la cola de saneamiento se esconderia de si misma.
     *
     * <p>Cada uno cruza tambien por {@code municipalidad_id}, como el resto del repositorio: RLS ya
     * acota lo visible, y repetirlo en el {@code ON} hace que el plan use la clave primaria
     * compuesta en vez de descartar filas despues.
     *
     * <p>{@code fichado} se resuelve con {@code EXISTS} y no contando fichas: la pregunta es «se
     * levanto la ficha», que no lleva fecha, y una cuenta invitaria a leerla como «fichas vigentes
     * hoy», que si la llevaria (regla 9).
     */
    private static final String CATASTRO_DESDE =
            """
             FROM predio p
             LEFT JOIN via v
               ON v.municipalidad_id = p.municipalidad_id
              AND v.id = p.via_id
             LEFT JOIN sector s
               ON s.municipalidad_id = p.municipalidad_id
              AND s.id = p.sector_id
             LEFT JOIN manzana m
               ON m.municipalidad_id = p.municipalidad_id
              AND m.id = p.manzana_id
            """;

    private static final String COLUMNAS_CATASTRO =
            "p.id AS predio_id, p.codigo_ref_catastral AS cod_ref_catastral, p.tipo,"
                    + " p.direccion, p.numero_municipal,"
                    + " v.codigo AS via_codigo, v.nombre AS via_nombre,"
                    + " s.codigo AS sector_codigo, m.codigo AS manzana_codigo,"
                    + " p.lote, p.ubigeo, p.estado,"
                    + " EXISTS (SELECT 1 FROM ficha_catastral f"
                    + " WHERE f.municipalidad_id = p.municipalidad_id"
                    + " AND f.predio_id = p.id) AS fichado";

    private static final OrdenSeguro ORDEN_CATASTRO =
            OrdenSeguro.sobre("cod_ref_catastral", "direccion", "predio_id");

    /** Rige en la fecha; los dos extremos entran, igual que {@code Titularidad.rigeEn}. */
    private static final String VIGENTE_A_LA_FECHA =
            " vigencia_desde <= :fecha AND (vigencia_hasta IS NULL OR vigencia_hasta >= :fecha)";

    public CatastroRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    // ---------- Sectores y manzanas ----------

    @Override
    public Pagina<SectorConConteos> sectores(Paginacion paginacion) {
        Pagina<Sector> pagina =
                paginar(
                        "SELECT " + COLUMNAS_SECTOR + " FROM sector",
                        "SELECT count(*) FROM sector",
                        Map.of(),
                        paginacion,
                        ORDEN_SECTOR,
                        CatastroRepositoryJdbc::mapearSector);

        List<Long> ids =
                pagina.contenido().stream().map(Sector::id).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return pagina.mapear(SectorConConteos::sinContar);
        }

        Map<Long, Conteos> conteos = conteosDe(ids);
        return pagina.mapear(
                sector -> {
                    Long id = sector.id();
                    Conteos suyos = id == null ? Conteos.NINGUNO : conteos.get(id);
                    Conteos ciertos = suyos == null ? Conteos.NINGUNO : suyos;
                    return new SectorConConteos(
                            sector, ciertos.manzanas(), ciertos.predios(), ciertos.lotes());
                });
    }

    /**
     * Cuenta lo que cuelga de los sectores <b>ya paginados</b>. Ver {@link #CONTEOS_DEL_SECTOR}.
     */
    private Map<Long, Conteos> conteosDe(List<Long> sectorIds) {
        return jdbc()
                .sql(CONTEOS_DEL_SECTOR)
                .param("sectores", sectorIds)
                .param("activo", EstadoPredio.ACTIVO.name())
                .query(
                        (fila, numeroDeFila) ->
                                Map.entry(
                                        fila.getLong("sector_id"),
                                        new Conteos(
                                                fila.getLong("manzanas"),
                                                fila.getLong("predios"),
                                                fila.getLong("lotes"))))
                .stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** Lo contado para un sector. Se queda aqui: fuera del repositorio viaja como proyeccion. */
    private record Conteos(long manzanas, long predios, long lotes) {

        /** El sector del que no se conto nada, o del que no colgaba nada. */
        static final Conteos NINGUNO = new Conteos(0, 0, 0);
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
    public Pagina<ManzanaConConteos> manzanas(Sector sector, Paginacion paginacion) {
        long sectorId =
                Objects.requireNonNull(sector.id(), "Un sector existente tiene identificador");
        Map<String, Object> parametros = Map.of("sector", sectorId);
        Pagina<Manzana> pagina =
                paginar(
                        "SELECT " + COLUMNAS_MANZANA + " FROM manzana WHERE sector_id = :sector",
                        "SELECT count(*) FROM manzana WHERE sector_id = :sector",
                        parametros,
                        paginacion,
                        ORDEN_MANZANA,
                        CatastroRepositoryJdbc::mapearManzana);

        List<Long> ids =
                pagina.contenido().stream().map(Manzana::id).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return pagina.mapear(manzana -> ManzanaConConteos.sinContar(manzana, sector.codigo()));
        }

        Map<Long, ConteosDeManzana> conteos = conteosDeManzanas(sectorId, ids);
        return pagina.mapear(
                manzana -> {
                    Long id = manzana.id();
                    ConteosDeManzana suyos = id == null ? null : conteos.get(id);
                    ConteosDeManzana ciertos = suyos == null ? ConteosDeManzana.NINGUNO : suyos;
                    return new ManzanaConConteos(
                            manzana, sector.codigo(), ciertos.predios(), ciertos.lotes());
                });
    }

    /**
     * Cuenta lo que cuelga de las manzanas <b>ya paginadas</b>. Ver {@link #CONTEOS_DE_LA_MANZANA}.
     */
    private Map<Long, ConteosDeManzana> conteosDeManzanas(long sectorId, List<Long> manzanaIds) {
        return jdbc()
                .sql(CONTEOS_DE_LA_MANZANA)
                .param("sector", sectorId)
                .param("manzanas", manzanaIds)
                .param("activo", EstadoPredio.ACTIVO.name())
                .query(
                        (fila, numeroDeFila) ->
                                Map.entry(
                                        fila.getLong("manzana_id"),
                                        new ConteosDeManzana(
                                                fila.getLong("predios"), fila.getLong("lotes"))))
                .stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** Lo contado para una manzana. Se queda aqui: fuera del repositorio viaja como proyeccion. */
    private record ConteosDeManzana(long predios, long lotes) {

        /** La manzana de la que no colgaba nada. */
        static final ConteosDeManzana NINGUNO = new ConteosDeManzana(0, 0);
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
    public Pagina<PredioDelCatastro> predios(FiltroDePredios filtro, Paginacion paginacion) {
        List<String> condiciones = new ArrayList<>();
        Map<String, Object> parametros = new HashMap<>();

        if (filtro.codRefCatastral() != null) {
            // Por RANGO, no por LIKE: bajo RLS un LIKE 'prefijo%' no llega nunca al indice, porque
            // textlike no es leakproof y PostgreSQL no lo evalua antes de la politica (DAT-01 §0).
            String desde = filtro.codRefCatastral();
            String hasta = FichaCatastralRepositoryJdbc.siguienteAlPrefijo(desde);
            if (hasta == null) {
                condiciones.add("p.codigo_ref_catastral LIKE :codigo || '%'");
                parametros.put("codigo", desde);
            } else {
                condiciones.add(
                        "p.codigo_ref_catastral ~>=~ :codigoDesde"
                                + " AND p.codigo_ref_catastral ~<~ :codigoHasta");
                parametros.put("codigoDesde", desde);
                parametros.put("codigoHasta", hasta);
            }
        }
        if (filtro.codigoDeSector() != null) {
            condiciones.add("s.codigo = :sector");
            parametros.put("sector", filtro.codigoDeSector());
        }
        if (filtro.estado() != null) {
            condiciones.add("p.estado = :estado");
            parametros.put("estado", filtro.estado().name());
        }
        if (filtro.fichado() != null) {
            condiciones.add(
                    (filtro.fichado() ? "" : "NOT ")
                            + "EXISTS (SELECT 1 FROM ficha_catastral fx"
                            + " WHERE fx.municipalidad_id = p.municipalidad_id"
                            + " AND fx.predio_id = p.id)");
        }

        String donde = condiciones.isEmpty() ? "" : " WHERE " + String.join(" AND ", condiciones);

        return paginar(
                "SELECT " + COLUMNAS_CATASTRO + CATASTRO_DESDE + donde,
                "SELECT count(*)" + CATASTRO_DESDE + donde,
                parametros,
                paginacion,
                ORDEN_CATASTRO,
                CatastroRepositoryJdbc::mapearPredioDelCatastro);
    }

    // ---------- El plano catastral (ADR-0022, #536) ----------

    /**
     * El marco, escrito con los operadores que SI llegan al indice bajo RLS.
     *
     * <p><b>Aqui esta el hallazgo de #536, y conviene leerlo entero antes de «simplificarlo».</b>
     * La forma obvia de esta condicion es {@code p.geometria && ST_MakeEnvelope(...)::geography}, y
     * medida contra PostgreSQL 16 con PostGIS 3.5, con 30 000 predios y conectado como {@code
     * sgtm_app}, produce un {@code Seq Scan} de la tabla entera. La misma consulta como
     * superusuario —que omite RLS— usa {@code predio_geometria_gix}.
     *
     * <p>El motivo es el hallazgo 3 de DAT-01 §0 trasladado al espacio: PostgreSQL solo promueve
     * una condicion por encima de la politica de seguridad si es <i>leakproof</i>, y {@code
     * geography_overlaps} tiene {@code proleakproof = f} —igual que {@code textlike}, y al reves
     * que {@code int8eq}, que es lo que dejo a #313 empujar {@code ficha_id} al indice—.
     *
     * <p>Las cuatro columnas de {@code V65} dicen lo mismo con {@code float8le} y {@code float8ge},
     * que si lo son. El {@code CAST} es el que convierte el parametro —{@code BigDecimal}, porque
     * {@code double} esta prohibido en Java (regla 1)— en el {@code double precision} de la
     * columna: sin el, la comparacion se resolveria en {@code numeric}, y {@code numeric_le}
     * tampoco es leakproof.
     *
     * <p>El {@code geometria IS NOT NULL} es explicito porque el indice es parcial sobre esa misma
     * condicion, y porque dice lo que la lectura hace: el plano dibuja lo levantado.
     *
     * <h2>Y por que NO lleva ademas el {@code &&}, que seria lo natural</h2>
     *
     * <p>Se escribio con las dos y se midio, porque parecia que el {@code &&} aportaba algo: es el
     * unico estimador de selectividad que PostGIS trae, y sin el PostgreSQL calcula las cuatro
     * desigualdades <b>como si fueran independientes</b> —no lo son: son un rectangulo—. Medido
     * sobre 60 000 lotes de dos municipalidades, con el {@code &&} puesto la estimacion baja de 2
     * 905 filas a 39 y el coste del plan de 5 097 a 3 313.
     *
     * <p>Y aun asi sobra, por dos motivos que solo se ven midiendo. El primero es que <b>el plan es
     * el mismo con y sin el</b>: quien elige el indice es la condicion de la politica junto con las
     * cuatro columnas, no la estimacion. El segundo es que <b>esa estimacion tampoco es la
     * correcta</b>: el marco de la medida contiene unos 440 lotes, asi que 2 905 se pasa por exceso
     * y 39 se queda corto por diez —y quedarse corto es la direccion peligrosa, la que produce
     * planes anidados sobre una fila que resultan ser cientos—.
     *
     * <p>Lo que queda entonces es una <b>segunda copia del mismo predicado</b>, que es justo lo que
     * este repositorio no admite en otros sitios. El {@code &&} de {@code geography} compara cajas
     * envolventes y las cuatro columnas comparan la misma caja; la diferencia es que la geodesica
     * es la conservadora y la de los vertices la exacta, asi que el resultado lo decide la segunda
     * y el primero no decide nada.
     */
    private static final String EN_EL_MARCO =
            " p.geometria IS NOT NULL"
                    + " AND p.marco_oeste <= CAST(:este AS double precision)"
                    + " AND p.marco_sur   <= CAST(:norte AS double precision)"
                    + " AND p.marco_este  >= CAST(:oeste AS double precision)"
                    + " AND p.marco_norte >= CAST(:sur AS double precision)";

    private static final String PLANO_DESDE =
            """
             FROM predio p
             LEFT JOIN sector s
               ON s.municipalidad_id = p.municipalidad_id
              AND s.id = p.sector_id
             LEFT JOIN manzana m
               ON m.municipalidad_id = p.municipalidad_id
              AND m.id = p.manzana_id
            """;

    /**
     * {@code ST_AsGeoJSON} sobre la columna, sin tocarla.
     *
     * <p>Ni {@code ST_Transform} ni {@code ST_Simplify} (ADR-0022 §1): un vertice movido es un
     * lindero movido, y un lindero movido no se ve. Lo que se acota es cuantas filas se piden, no
     * la precision de cada una.
     */
    private static final String COLUMNAS_PLANO =
            "p.id AS predio_id, p.codigo_ref_catastral AS cod_ref_catastral, p.direccion,"
                    + " s.codigo AS sector_codigo, m.codigo AS manzana_codigo, p.lote,"
                    + " p.estado, ST_AsGeoJSON(p.geometria) AS geometria";

    @Override
    public List<LoteDelPlano> lotesDelPlano(FiltroDelPlano filtro, int tope) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_PLANO
                                + PLANO_DESDE
                                + " WHERE"
                                + EN_EL_MARCO
                                + condicionesDeFiltro(filtro)
                                + " LIMIT :tope")
                .params(parametrosDelPlano(filtro))
                .param("tope", tope)
                .query(CatastroRepositoryJdbc::mapearLoteDelPlano)
                .list();
    }

    @Override
    public long lotesEnElMarco(FiltroDelPlano filtro) {
        return jdbc().sql(
                        "SELECT count(*)"
                                + PLANO_DESDE
                                + " WHERE"
                                + EN_EL_MARCO
                                + condicionesDeFiltro(filtro))
                .params(parametrosDelPlano(filtro))
                .query(Long.class)
                .optional()
                .orElse(0L);
    }

    /**
     * Los que no tienen poligono: <b>sin</b> el marco, y con los mismos filtros.
     *
     * <p>No es una omision. Un predio sin poligono no tiene sitio en el marco, y el unico dato que
     * podria situarlo —el perimetro de su manzana— no existe en el esquema; derivarlo de la union
     * de los lotes ya digitalizados es lo que ADR-0022 §5 prohibe, y ademas daria cero hoy, que es
     * cuando no hay ni un lote digitalizado y la cifra mas hace falta.
     */
    @Override
    public long prediosSinGeometria(FiltroDelPlano filtro) {
        return jdbc().sql(
                        "SELECT count(*)"
                                + PLANO_DESDE
                                + " WHERE p.geometria IS NULL"
                                + condicionesDeFiltro(filtro))
                .params(parametrosDeFiltro(filtro))
                .query(Long.class)
                .optional()
                .orElse(0L);
    }

    private static String condicionesDeFiltro(FiltroDelPlano filtro) {
        StringBuilder condiciones = new StringBuilder();
        if (filtro.codigoDeSector() != null) {
            condiciones.append(" AND s.codigo = :sector");
        }
        if (filtro.codigoDeManzana() != null) {
            condiciones.append(" AND m.codigo = :manzana");
        }
        return condiciones.toString();
    }

    private static Map<String, Object> parametrosDeFiltro(FiltroDelPlano filtro) {
        Map<String, Object> parametros = new HashMap<>();
        if (filtro.codigoDeSector() != null) {
            parametros.put("sector", filtro.codigoDeSector());
        }
        if (filtro.codigoDeManzana() != null) {
            parametros.put("manzana", filtro.codigoDeManzana());
        }
        return parametros;
    }

    private static Map<String, Object> parametrosDelPlano(FiltroDelPlano filtro) {
        Map<String, Object> parametros = parametrosDeFiltro(filtro);
        parametros.put("oeste", filtro.marco().oeste());
        parametros.put("sur", filtro.marco().sur());
        parametros.put("este", filtro.marco().este());
        parametros.put("norte", filtro.marco().norte());
        return parametros;
    }

    private static LoteDelPlano mapearLoteDelPlano(ResultSet fila, int numeroDeFila)
            throws SQLException {
        return new LoteDelPlano(
                fila.getLong("predio_id"),
                CodigoReferenciaCatastral.de(fila.getString("cod_ref_catastral")),
                fila.getString("direccion"),
                fila.getString("sector_codigo"),
                fila.getString("manzana_codigo"),
                fila.getString("lote"),
                EstadoPredio.valueOf(fila.getString("estado")),
                fila.getString("geometria"));
    }

    private static PredioDelCatastro mapearPredioDelCatastro(ResultSet fila, int numeroDeFila)
            throws SQLException {
        return new PredioDelCatastro(
                fila.getLong("predio_id"),
                CodigoReferenciaCatastral.de(fila.getString("cod_ref_catastral")),
                TipoPredio.valueOf(fila.getString("tipo")),
                fila.getString("direccion"),
                fila.getString("numero_municipal"),
                fila.getString("via_codigo"),
                fila.getString("via_nombre"),
                fila.getString("sector_codigo"),
                fila.getString("manzana_codigo"),
                fila.getString("lote"),
                fila.getString("ubigeo"),
                EstadoPredio.valueOf(fila.getString("estado")),
                fila.getBoolean("fichado"));
    }

    @Override
    public void asignarGeometria(long predioId, String wkt) {
        // ST_GeogFromText interpreta el WKT como WGS84, que es el SRID de la columna. Si el texto
        // no es un MULTIPOLYGON valido, falla aqui y no guarda medio poligono.
        int filas =
                jdbc().sql(
                                "UPDATE predio SET geometria = ST_GeogFromText(:wkt)"
                                        + " WHERE id = :id")
                        .param("wkt", wkt)
                        .param("id", predioId)
                        .update();
        if (filas == 0) {
            throw new IllegalArgumentException(
                    "No hay ningun predio con el identificador "
                            + predioId
                            + " en esta"
                            + " municipalidad");
        }
    }

    @Override
    public Optional<String> geometriaDe(long predioId) {
        return jdbc().sql("SELECT ST_AsText(geometria) FROM predio WHERE id = :id")
                .param("id", predioId)
                .query(String.class)
                .optional();
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

    /**
     * Los titulares vigentes de un lote de predios, en una sola consulta (#545).
     *
     * <p>{@code predio_id = ANY(:predios)} y no {@code IN (:predios)}: con la primera forma el lote
     * viaja como <b>un</b> parametro y el plan se cachea igual para paginas de veinte y de cien;
     * con {@code IN}, cada tamano de lote produce una consulta distinta. Es el mismo criterio que
     * {@code DeclaracionJuradaRepositoryJdbc.vigentesDePredios}.
     *
     * <p>El orden es el de {@link #titularesDe}: mayor porcentaje primero. Quien tenga que elegir
     * uno —la muestra de un programa, que solo puede visitar a alguien— toma el primero, y esa es
     * la misma eleccion que {@code TitularPrincipalRepository} hace para el arbitrio.
     */
    @Override
    public Map<Long, List<Titularidad>> titularesDeVarios(
            Collection<Long> predioIds, LocalDate fecha) {
        Objects.requireNonNull(fecha, "De quien es el predio se pregunta a una fecha (regla 9)");
        if (predioIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<Titularidad>> porPredio = new HashMap<>();
        List<Titularidad> filas =
                jdbc().sql(
                                "SELECT "
                                        + COLUMNAS_TITULARIDAD
                                        + " FROM titularidad"
                                        + " WHERE predio_id = ANY(:predios) AND"
                                        + VIGENTE_A_LA_FECHA
                                        + " ORDER BY predio_id, porcentaje DESC, id")
                        .param("predios", predioIds.toArray(Long[]::new))
                        .param("fecha", fecha)
                        .query(CatastroRepositoryJdbc::mapearTitularidad)
                        .list();
        for (Titularidad titularidad : filas) {
            porPredio
                    .computeIfAbsent(titularidad.predioId(), predio -> new ArrayList<>())
                    .add(titularidad);
        }
        return Map.copyOf(porPredio);
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
