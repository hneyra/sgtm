package pe.gob.sgtm.fiscalizacion.infraestructura;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeDeteccion;
import pe.gob.sgtm.fiscalizacion.dominio.DeteccionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.FilaDeOmisos;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * El cruce padrón-declaraciones contra PostgreSQL (#545, RF-055).
 *
 * <p>Por qué esta consulta vive aquí y no en {@code catastro} ni en {@code rentas} está escrito en
 * {@link DeteccionRepository}. Lo que hay que saber para leerla es esto:
 *
 * <ol>
 *   <li><b>La condición se escribe una sola vez.</b> {@link #CONDICION} entra en el {@code SELECT}
 *       de la subconsulta y el {@code WHERE} de fuera la filtra por su alias. Dos copias del mismo
 *       {@code CASE} —una para pintar la columna y otra para filtrar— es el defecto que #397 midió:
 *       divergen, y la fila que se lee acaba no siendo la que el filtro dejó pasar.
 *   <li><b>La declaración se elige con un {@code LATERAL} que trae una sola fila.</b> Un predio
 *       puede tener más de una declaración vigente del mismo ejercicio, y la que cuenta es la más
 *       reciente: comparar contra la vieja acusaría de subvaluación a quien ya corrigió. Es el
 *       mismo desempate que hacía {@code DeclaracionesDelEjercicioRentas}, ahora en el motor.
 *   <li><b>Los tres {@code JOIN} son externos, y los tres a propósito.</b> Sin sector, sin ficha o
 *       sin declaración son los tres casos que esta consulta existe para encontrar. El de {@code
 *       titularidad} no está: los titulares se resuelven por el puerto público de catastro.
 * </ol>
 *
 * <p>El filtro de sector va con la bandera {@code :conSector} en vez de con {@code :sector IS
 * NULL}: PostgreSQL no puede inferir el tipo de un parámetro que sólo aparece en un {@code IS
 * NULL}, y falla con «could not determine data type».
 */
@Repository
public class DeteccionRepositoryJdbc extends RepositorioJdbc implements DeteccionRepository {

    /**
     * La condición, transcrita de {@link
     * pe.gob.sgtm.fiscalizacion.dominio.ComparacionHalladoDeclarado#condicion}.
     *
     * <p>Las cinco preguntas de aquella función, en el mismo orden, para el cruce de gabinete:
     *
     * <ul>
     *   <li>{@code NO_UBICADO} no puede salir: no hay visita que pueda no ubicar nada. Lo que un
     *       cruce de gabinete «halla» es lo que el catastro tiene inscrito, y eso siempre está.
     *   <li>{@code OMISO} cuando no hay declaración vigente del ejercicio, y sólo entonces: quien
     *       declaró tarde llega aquí con su fila y sigue de largo (AC 3 de #49).
     *   <li>{@code SUBVALUADOR} cuando el área de la ficha vigente supera la de la ficha que la
     *       declaración referencia. Con cualquiera de las dos en nulo no hay comparación, y decir
     *       que la hay sería afirmar sobre lo que no se midió.
     *   <li>{@code USO_DISTINTO} tampoco sale, porque el uso hallado va en nulo: la detección
     *       compara superficies, que es lo único reproducible sin visita.
     *   <li>{@code CONFORME} en lo demás. Un área hallada <b>menor</b> que la declarada no es un
     *       hallazgo contra el contribuyente: declaró de más.
     * </ul>
     *
     * <p>Que esta transcripción no se separe de la función pura no lo garantiza este comentario: lo
     * garantiza {@code DeteccionDeOmisosJdbcTest}, que compara las dos caso por caso.
     */
    private static final String CONDICION =
            """
            CASE
              WHEN dj.id IS NULL THEN 'OMISO'
              WHEN f.area_terreno IS NOT NULL
               AND fd.area_terreno IS NOT NULL
               AND f.area_terreno > fd.area_terreno THEN 'SUBVALUADOR'
              ELSE 'CONFORME'
            END""";

    private static final String DESDE =
            """
             FROM predio p
             LEFT JOIN sector s
               ON s.municipalidad_id = p.municipalidad_id
              AND s.id = p.sector_id
             LEFT JOIN ficha_catastral f
               ON f.municipalidad_id = p.municipalidad_id
              AND f.predio_id = p.id
              AND f.tipo = 'UNICA'
              AND f.vigencia_desde <= :fecha
              AND (f.vigencia_hasta IS NULL OR f.vigencia_hasta >= :fecha)
             LEFT JOIN LATERAL (
                   SELECT d.id, d.fuera_de_plazo, d.ficha_catastral_id
                     FROM declaracion_jurada d
                    WHERE d.municipalidad_id = p.municipalidad_id
                      AND d.predio_id = p.id
                      AND d.ejercicio = :ejercicio
                      AND d.estado = ANY(:estados)
                    ORDER BY d.fecha_presentacion DESC, d.id DESC
                    LIMIT 1
                 ) dj ON true
             LEFT JOIN ficha_catastral fd
               ON fd.municipalidad_id = p.municipalidad_id
              AND fd.id = dj.ficha_catastral_id
            WHERE p.estado = :activo
              AND (NOT :conSector OR s.codigo = :sector)
            """;

    private static final String INTERIOR =
            "SELECT p.id AS predio_id, p.codigo_ref_catastral, p.direccion,"
                    + " s.codigo AS sector_codigo, f.area_terreno AS area_catastral,"
                    + " fd.area_terreno AS area_declarada,"
                    + " COALESCE(dj.fuera_de_plazo, false) AS fuera_de_plazo, "
                    + CONDICION
                    + " AS condicion"
                    + DESDE;

    /** El filtro de condición, sobre el alias de la subconsulta: la misma expresión, una vez. */
    private static final String FILTRO_DE_CONDICION =
            " WHERE (NOT :conCondicion OR d.condicion = :condicion)";

    /**
     * Los dos estados en que una declaración sustenta algo, escritos aquí y no leídos de {@code
     * EstadoDeDeclaracion}: ese enumerado es {@code rentas.dominio}, y este contexto sólo importa
     * el paquete raíz de los demás (ARQ-01 §4 regla 1). Que los dos digan lo mismo lo comprueba
     * {@code DeteccionDeOmisosJdbcTest}, que siembra una declaración {@code SUSTITUIDA} y otra
     * {@code ANULADA} y exige que su predio salga OMISO.
     */
    private static final String[] ESTADOS_VIGENTES = {"PRESENTADA", "OBSERVADA"};

    /**
     * Solo predios <b>activos</b>, por lo mismo y escrito aqui por lo mismo: {@code EstadoPredio}
     * es {@code catastro.dominio}. Un predio dado de baja no genera obligacion, asi que marcarlo
     * como omiso seria abrir una fiscalizacion sobre algo que ya no existe.
     */
    private static final String PREDIO_ACTIVO = "ACTIVO";

    /**
     * Por lo que la fila <b>publica</b>, y por nada mas (#546).
     *
     * <p>{@code codRefCatastral} es el nombre del campo de {@code OmisoResource}; el {@code
     * camelCase} automatico de la columna era {@code codigoRefCatastral}, o sea un segundo nombre
     * para el mismo dato que ademas era el unico que funcionaba. {@code direccion} sale de la lista
     * porque {@code OmisoResource} no la publica —ordenar por una columna que no esta en la fila no
     * se puede explicar en pantalla—, y {@code predio_id} pasa a <b>desempate</b>, que es para lo
     * que servia: da orden total sin ofrecerse como campo (#543).
     */
    static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("codigo_ref_catastral")
                    .publicandoComo("codRefCatastral", "codigo_ref_catastral")
                    .desempatandoPor("predio_id");

    public DeteccionRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Pagina<FilaDeOmisos> detectar(CriterioDeDeteccion criterio, Paginacion paginacion) {
        String sector = criterio.sectorCodigo();
        CondicionFiscalizada condicion = criterio.condicion();

        Map<String, Object> parametros = new HashMap<>();
        parametros.put("fecha", criterio.aLaFecha());
        parametros.put("ejercicio", criterio.ejercicio().valor());
        parametros.put("estados", ESTADOS_VIGENTES);
        parametros.put("activo", PREDIO_ACTIVO);
        parametros.put("sector", sector == null ? "" : sector);
        parametros.put("conSector", sector != null);
        parametros.put("condicion", condicion == null ? "" : condicion.name());
        parametros.put("conCondicion", condicion != null);

        return paginar(
                "SELECT d.* FROM (" + INTERIOR + ") d" + FILTRO_DE_CONDICION,
                "SELECT count(*) FROM (" + INTERIOR + ") d" + FILTRO_DE_CONDICION,
                Map.copyOf(parametros),
                paginacion,
                ORDEN,
                (fila, numeroDeFila) -> mapear(fila, criterio));
    }

    private static FilaDeOmisos mapear(ResultSet fila, CriterioDeDeteccion criterio)
            throws SQLException {
        return new FilaDeOmisos(
                fila.getLong("predio_id"),
                fila.getString("codigo_ref_catastral"),
                fila.getString("sector_codigo"),
                // Los titulares los resuelve el caso de uso, en una lectura por pagina.
                List.of(),
                criterio.ejercicio(),
                CondicionFiscalizada.porNombre(fila.getString("condicion")),
                fila.getBoolean("fuera_de_plazo"),
                area(fila.getBigDecimal("area_catastral")),
                area(fila.getBigDecimal("area_declarada")),
                null,
                null,
                null);
    }

    private static @Nullable AreaM2 area(@Nullable BigDecimal valor) {
        return valor == null ? null : new AreaM2(valor);
    }
}
