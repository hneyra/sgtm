package pe.gob.sgtm.seguridad.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.seguridad.dominio.PermisoEfectivo;
import pe.gob.sgtm.seguridad.dominio.PermisoRepository;
import pe.gob.sgtm.seguridad.dominio.TitularDelPrivilegio;

/**
 * Persistencia de los permisos.
 *
 * <p>Las siete columnas booleanas se escriben <b>siempre</b>, tanto al insertar como al actualizar:
 * lo que no esta en el conjunto queda en falso. Un {@code UPDATE} que solo tocara los privilegios
 * presentes dejaria activos los que el administrador acaba de quitar de la pantalla, y ese es el
 * defecto que no se nota hasta que alguien entra donde no debia.
 *
 * <p>{@code usuario_registro} sale de {@link OrigenContext} y no de un argumento: es el mismo dato
 * que la auditoria, y tenerlo en la firma invitaria a que dos sitios dijeran cosas distintas sobre
 * quien hizo el cambio.
 */
@Repository
public class PermisoRepositoryJdbc extends RepositorioJdbc implements PermisoRepository {

    private static final String COLUMNAS =
            "id, acceso_id, grupo_id, usuario_id,"
                    + " ejecucion, lectura, registro, modificacion, eliminacion, impresion, especial";

    /**
     * El acceso que gobierna la propia administracion de permisos, y el privilegio que hace falta
     * para ejercerla. Es el id de esa pantalla en el catalogo (NEG-03).
     */
    static final String ACCESO_DE_ADMINISTRACION = "permisos";

    /**
     * Por que se ordena el listado de titulares (#583).
     *
     * <p>Los mismos campos que el padron de usuarios —es el padron, acotado a quienes tienen el
     * privilegio— y con el mismo {@code desempatandoPor("id")}: {@code cuenta} es unica por
     * municipalidad y por tanto ya es un orden total, pero {@code nombre} no lo es, y sin desempate
     * dos personas homonimas dejan de tener orden estable — dos paginas consecutivas pueden repetir
     * a una y omitir a otra, que en una lista de «quien tiene la llave de la caja» es justamente la
     * cuenta que no aparece (#548).
     *
     * <p>La columna {@code id} se admite con el nombre que la fila <b>publica</b>, {@code
     * usuarioId}: aceptar {@code id} y no {@code usuarioId} dejaria el listado ordenando por un
     * nombre que no esta en ninguna de sus filas, que es lo que #546 encontro en los omisos.
     */
    private static final OrdenSeguro ORDEN_TITULAR =
            OrdenSeguro.sobre("cuenta", "nombre", "id")
                    .publicandoComo("usuarioId", "id")
                    .desempatandoPor("id");

    public PermisoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Permiso save(Permiso permiso) {
        return permiso.esNuevo() ? insertar(permiso) : actualizar(permiso);
    }

    @Override
    public Optional<Permiso> deGrupo(long accesoId, long grupoId) {
        return uno("acceso_id = :acceso AND grupo_id = :sujeto", accesoId, grupoId);
    }

    @Override
    public Optional<Permiso> deUsuario(long accesoId, long usuarioId) {
        return uno("acceso_id = :acceso AND usuario_id = :sujeto", accesoId, usuarioId);
    }

    private Optional<Permiso> uno(String condicion, long accesoId, long sujeto) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM permiso WHERE " + condicion)
                .param("acceso", accesoId)
                .param("sujeto", sujeto)
                .query(PermisoRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public List<Permiso> todosLosDeGrupo(long grupoId) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM permiso WHERE grupo_id = :grupo")
                .param("grupo", grupoId)
                .query(PermisoRepositoryJdbc::mapear)
                .list();
    }

    /**
     * La matriz efectiva, en <b>una</b> consulta: por cada acceso activo, la fila de la excepcion
     * del usuario si existe, y si no la union de sus grupos vigentes. La precedencia —el {@code
     * CASE} sobre {@code ux.acceso_id}— es la misma que {@code ComprobadorDeAccesoJdbc}: una fila
     * de excepcion, aunque niegue, sustituye al grupo entero para ese acceso.
     */
    @Override
    public Map<String, Set<Privilegio>> efectivosDe(String cuenta, LocalDate fecha) {
        String sql =
                "SELECT a.codigo,"
                        + columnaEfectiva("ejecucion")
                        + ", "
                        + columnaEfectiva("lectura")
                        + ", "
                        + columnaEfectiva("registro")
                        + ", "
                        + columnaEfectiva("modificacion")
                        + ", "
                        + columnaEfectiva("eliminacion")
                        + ", "
                        + columnaEfectiva("impresion")
                        + ", "
                        + columnaEfectiva("especial")
                        + " FROM acceso a"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT p.acceso_id, p.ejecucion, p.lectura, p.registro, p.modificacion,"
                        + "          p.eliminacion, p.impresion, p.especial"
                        + "     FROM permiso p JOIN usuario u ON u.id = p.usuario_id"
                        + "    WHERE p.acceso_id = a.id AND u.cuenta = :cuenta"
                        + " ) ux ON true"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT bool_or(p.ejecucion) AS ejecucion, bool_or(p.lectura) AS lectura,"
                        + "          bool_or(p.registro) AS registro,"
                        + "          bool_or(p.modificacion) AS modificacion,"
                        + "          bool_or(p.eliminacion) AS eliminacion,"
                        + "          bool_or(p.impresion) AS impresion,"
                        + "          bool_or(p.especial) AS especial"
                        + "     FROM permiso p"
                        + "     JOIN grupo g ON g.id = p.grupo_id AND g.habilitado"
                        + "                 AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                 AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "     JOIN miembro m ON m.grupo_id = g.id AND m.activo"
                        + "     JOIN usuario u ON u.id = m.usuario_id AND u.cuenta = :cuenta"
                        + "    WHERE p.acceso_id = a.id"
                        + " ) gx ON true"
                        + " WHERE a.activo"
                        + "   AND EXISTS (SELECT 1 FROM usuario u"
                        + "                WHERE u.cuenta = :cuenta AND "
                        + usuarioOperativo("u")
                        + ")";

        Map<String, Set<Privilegio>> matriz = new LinkedHashMap<>();
        jdbc().sql(sql)
                .param("cuenta", cuenta)
                .param("fecha", fecha)
                .query(
                        (fila, numero) -> {
                            Set<Privilegio> otorgados = EnumSet.noneOf(Privilegio.class);
                            for (Privilegio privilegio : Privilegio.values()) {
                                if (fila.getBoolean(privilegio.columna())) {
                                    otorgados.add(privilegio);
                                }
                            }
                            if (!otorgados.isEmpty()) {
                                matriz.put(fila.getString("codigo"), otorgados);
                            }
                            return null;
                        })
                .list();
        return matriz;
    }

    /**
     * La misma matriz de otro usuario, diciendo <b>de donde viene cada fila</b> (#543).
     *
     * <p>Es la de arriba con dos datos mas y una regla de emision distinta, y las dos diferencias
     * son el issue entero:
     *
     * <ol>
     *   <li><b>Una excepcion emite fila aunque no otorgue nada.</b> {@code efectivosDe} descarta el
     *       conjunto vacio porque dibuja un menu, y una opcion sin privilegios no se dibuja. Aqui
     *       se administra: «se le nego expresamente» y «nunca lo tuvo» son dos configuraciones
     *       distintas y la matriz tiene que poder enseñar la diferencia.
     *   <li><b>Cuenta los grupos que aportan.</b> El {@code min(g.id)} solo se publica cuando son
     *       uno; con dos, la union no tiene <b>un</b> grupo que nombrar y el id del menor seria un
     *       dato plausible y equivocado. El filtro de «aporta algo» va en el propio lateral, asi
     *       que un grupo con la fila de permiso en cero no cuenta como origen de nada.
     * </ol>
     *
     * <p>El sujeto es el {@code id} y no la cuenta —lo pide la ruta asi—, pero la precedencia es la
     * misma expresion {@link #columnaEfectiva(String)} que usa la matriz de la sesion y que usa el
     * guardia: si se separaran, la pantalla que administra permisos enseñaria una cosa y el
     * servidor haria otra.
     */
    @Override
    public List<PermisoEfectivo> efectivosConOrigenDe(long usuarioId, LocalDate fecha) {
        return matriz(usuarioId, fecha, true);
    }

    /**
     * La matriz <b>configurada</b>: la misma, sin exigir que la cuenta pueda operar hoy (#583).
     *
     * <p>Es la de arriba con un solo cambio —el {@code EXISTS} sobre {@code usuario} no va— y ese
     * cambio es el issue: con el, una cuenta deshabilitada recibe la lista vacia <b>conserve
     * permisos o no los haya tenido nunca</b>, y las dos respuestas son el mismo JSON.
     *
     * <p>No se escribe como otra consulta a proposito: las dos salen del mismo constructor, de modo
     * que una mutacion de la precedencia —{@link #expresionEfectiva(String)}— pone en rojo las dos
     * a la vez. Si solo cayera una, se habrian separado, y entonces la pantalla que administra
     * permisos y el guardia acabarian diciendo cosas distintas (#397, #543).
     */
    @Override
    public List<PermisoEfectivo> configuradosConOrigenDe(long usuarioId, LocalDate fecha) {
        return matriz(usuarioId, fecha, false);
    }

    private List<PermisoEfectivo> matriz(
            long usuarioId, LocalDate fecha, boolean soloSiPuedeOperarHoy) {
        String sql =
                "SELECT a.codigo,"
                        + " (ux.acceso_id IS NOT NULL) AS por_excepcion,"
                        + " COALESCE(gx.grupos, 0) AS grupos,"
                        + " gx.grupo AS grupo_id, "
                        + columnaEfectiva("ejecucion")
                        + ", "
                        + columnaEfectiva("lectura")
                        + ", "
                        + columnaEfectiva("registro")
                        + ", "
                        + columnaEfectiva("modificacion")
                        + ", "
                        + columnaEfectiva("eliminacion")
                        + ", "
                        + columnaEfectiva("impresion")
                        + ", "
                        + columnaEfectiva("especial")
                        + " FROM acceso a"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT p.acceso_id, p.ejecucion, p.lectura, p.registro, p.modificacion,"
                        + "          p.eliminacion, p.impresion, p.especial"
                        + "     FROM permiso p"
                        + "    WHERE p.acceso_id = a.id AND p.usuario_id = :usuario"
                        + " ) ux ON true"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT bool_or(p.ejecucion) AS ejecucion, bool_or(p.lectura) AS lectura,"
                        + "          bool_or(p.registro) AS registro,"
                        + "          bool_or(p.modificacion) AS modificacion,"
                        + "          bool_or(p.eliminacion) AS eliminacion,"
                        + "          bool_or(p.impresion) AS impresion,"
                        + "          bool_or(p.especial) AS especial,"
                        + "          count(*) AS grupos, min(g.id) AS grupo"
                        + "     FROM permiso p"
                        + "     JOIN grupo g ON g.id = p.grupo_id AND g.habilitado"
                        + "                 AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                 AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "     JOIN miembro m ON m.grupo_id = g.id AND m.activo"
                        + "                   AND m.usuario_id = :usuario"
                        + "    WHERE p.acceso_id = a.id"
                        // Un grupo que no otorga nada no es el origen de nada: sin esto,
                        // `grupos` contaria filas de permiso en cero y `grupo_id` saldria
                        // nulo por «hay varios» cuando en realidad aporta uno solo.
                        + "      AND (p.ejecucion OR p.lectura OR p.registro OR p.modificacion"
                        + "           OR p.eliminacion OR p.impresion OR p.especial)"
                        + " ) gx ON true"
                        + " WHERE a.activo"
                        + (soloSiPuedeOperarHoy
                                ? "   AND EXISTS (SELECT 1 FROM usuario u"
                                        + "                WHERE u.id = :usuario AND "
                                        + usuarioOperativo("u")
                                        + ")"
                                : "")
                        + " ORDER BY a.codigo";

        List<PermisoEfectivo> efectivos = new ArrayList<>();
        jdbc().sql(sql)
                .param("usuario", usuarioId)
                .param("fecha", fecha)
                .query(
                        (fila, numero) -> {
                            Set<Privilegio> otorgados = EnumSet.noneOf(Privilegio.class);
                            for (Privilegio privilegio : Privilegio.values()) {
                                if (fila.getBoolean(privilegio.columna())) {
                                    otorgados.add(privilegio);
                                }
                            }
                            boolean porExcepcion = fila.getBoolean("por_excepcion");
                            long grupos = fila.getLong("grupos");
                            if (porExcepcion) {
                                efectivos.add(
                                        new PermisoEfectivo(
                                                fila.getString("codigo"),
                                                otorgados,
                                                PermisoEfectivo.OrigenDelPermiso.EXCEPCION,
                                                null));
                            } else if (grupos > 0) {
                                long grupo = fila.getLong("grupo_id");
                                efectivos.add(
                                        new PermisoEfectivo(
                                                fila.getString("codigo"),
                                                otorgados,
                                                PermisoEfectivo.OrigenDelPermiso.GRUPO,
                                                grupos == 1 ? grupo : null));
                            }
                            return null;
                        })
                .list();
        return List.copyOf(efectivos);
    }

    /**
     * Quien tiene un privilegio sobre un acceso, en <b>una</b> consulta (#583).
     *
     * <p>Es la matriz de arriba dada vuelta: alli el sujeto es fijo y se recorren los accesos; aqui
     * el acceso y el privilegio son fijos y se recorre el padron. La precedencia es la <b>misma
     * expresion</b> {@link #expresionEfectiva(String)}, de modo que las dos lecturas no puedan
     * discrepar sobre quien manda —la excepcion del usuario o sus grupos—.
     *
     * <p><b>Aqui el filtro de «aporta algo» del lateral de grupos es el del privilegio pedido</b>,
     * y no el de los siete que usa la matriz. Los dos son el mismo criterio —«un grupo que no
     * otorga no es el origen de nada»— dicho de la pregunta que cada consulta hace: contando
     * cualquier privilegio, un grupo que da LECTURA y no ESPECIAL sumaria a {@code grupos} y
     * dejaria {@code grupo_id} en nulo —«viene de varios»— cuando ESPECIAL lo otorga uno solo, que
     * es el dato con el que se decide de donde quitarlo. Sobre {@code bool_or} no cambia nada: un
     * grupo que no otorga este privilegio aporta {@code false} tanto si se filtra como si no.
     *
     * <p>El nombre de la columna se concatena, no se enlaza —{@code ORDER BY} y las columnas no
     * admiten parametro—, y por eso sale de {@link Privilegio#columna()}: un enumerado de siete
     * valores, nunca del texto que llegue por HTTP.
     */
    @Override
    public Pagina<TitularDelPrivilegio> titularesDe(
            long accesoId, Privilegio privilegio, LocalDate fecha, Paginacion paginacion) {

        String columna = privilegio.columna();
        String desde =
                " FROM usuario u"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT p.acceso_id, p."
                        + columna
                        + "     FROM permiso p"
                        + "    WHERE p.acceso_id = :acceso AND p.usuario_id = u.id"
                        + " ) ux ON true"
                        + " LEFT JOIN LATERAL ("
                        + "   SELECT bool_or(p."
                        + columna
                        + ") AS "
                        + columna
                        + ", count(*) AS grupos, min(g.id) AS grupo"
                        + "     FROM permiso p"
                        + "     JOIN grupo g ON g.id = p.grupo_id AND g.habilitado"
                        + "                 AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                 AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "     JOIN miembro m ON m.grupo_id = g.id AND m.activo"
                        + "                   AND m.usuario_id = u.id"
                        + "    WHERE p.acceso_id = :acceso AND p."
                        + columna
                        + " ) gx ON true"
                        + " WHERE "
                        + expresionEfectiva(columna);

        return paginar(
                "SELECT u.id AS id, u.cuenta AS cuenta, u.nombre AS nombre,"
                        + usuarioOperativo("u")
                        + " AS efectivo_hoy,"
                        + " (ux.acceso_id IS NOT NULL) AS por_excepcion,"
                        + " COALESCE(gx.grupos, 0) AS grupos,"
                        + " gx.grupo AS grupo_id"
                        + desde,
                "SELECT count(*)" + desde,
                Map.of("acceso", accesoId, "fecha", fecha),
                paginacion,
                ORDEN_TITULAR,
                PermisoRepositoryJdbc::mapearTitular);
    }

    private static TitularDelPrivilegio mapearTitular(ResultSet fila, int numeroDeFila)
            throws SQLException {
        boolean porExcepcion = fila.getBoolean("por_excepcion");
        long grupos = fila.getLong("grupos");
        long grupo = fila.getLong("grupo_id");
        return new TitularDelPrivilegio(
                fila.getLong("id"),
                fila.getString("cuenta"),
                fila.getString("nombre"),
                fila.getBoolean("efectivo_hoy"),
                porExcepcion
                        ? PermisoEfectivo.OrigenDelPermiso.EXCEPCION
                        : PermisoEfectivo.OrigenDelPermiso.GRUPO,
                porExcepcion || grupos != 1 ? null : grupo);
    }

    /** {@link #expresionEfectiva(String)} con el alias que espera el mapeo de filas. */
    private static String columnaEfectiva(String columna) {
        return expresionEfectiva(columna) + " AS " + columna;
    }

    /**
     * La <b>regla de precedencia</b>, en una sola expresion: {@code CASE WHEN ux.acceso_id IS NOT
     * NULL THEN ux.<col> ELSE COALESCE(gx.<col>, false) END}.
     *
     * <p>Una fila de excepcion de usuario sustituye al grupo entero para ese acceso, <b>otorgue o
     * niegue</b>; no se suma. Es la misma que aplica {@code ComprobadorDeAccesoJdbc}, y la usan las
     * <b>cuatro</b> lecturas de esta clase: la matriz de la sesion, la matriz efectiva de otro
     * usuario, la configurada (#583) y la de quien tiene un privilegio sobre un acceso (#583).
     *
     * <p>Vive aqui y no copiada en cada consulta por lo que #397 midio con el «Estado» de la
     * infraccion administrativa: dos copias del mismo {@code CASE} divergen, y la que se lee en
     * pantalla acaba no siendo la que filtro. Aqui seria peor, porque la copia divergente decide
     * quien entra donde: escrita como union —{@code grupo OR excepcion}— convierte una excepcion
     * que <b>restringe</b> en una que amplia, que es el defecto exacto que #543 encontro en la
     * interfaz.
     *
     * <p>Sin alias, para que tambien se pueda poner en un {@code WHERE}: PostgreSQL no admite el
     * nombre de una columna de salida en la clausula que filtra, y escribir el {@code CASE} dos
     * veces en la misma consulta seria la copia divergente otra vez.
     */
    private static String expresionEfectiva(String columna) {
        return "CASE WHEN ux.acceso_id IS NOT NULL THEN ux."
                + columna
                + " ELSE COALESCE(gx."
                + columna
                + ", false) END";
    }

    /**
     * Que la cuenta pueda operar hoy: habilitada y dentro de vigencia (RF-123).
     *
     * <p>Es el eslabon del usuario de la comprobacion que hace el guardia —los otros dos, el grupo
     * y la pertenencia, viajan dentro del lateral {@code gx}—, y esta escrito una vez porque las
     * tres lecturas que lo usan lo usan de <b>tres maneras distintas</b> y esa es justo la
     * diferencia entre ellas (#583):
     *
     * <ul>
     *   <li>la matriz <b>efectiva</b> lo exige, en un {@code EXISTS}: un usuario deshabilitado
     *       recibe la lista vacia, como el guardia. Enseñarle privilegios que despues responden 403
     *       seria peor que no enseñarle ninguno;
     *   <li>la <b>configurada</b> no lo exige: es la unica forma de distinguir «se deshabilito y
     *       conserva permisos» de «nunca tuvo ninguno», que hoy son el mismo JSON vacio;
     *   <li>y la de <b>titulares</b> ni lo exige ni lo calla: lo <b>publica</b> como {@code
     *       efectivoHoy}, porque la cuenta deshabilitada que conserva el privilegio es justo la que
     *       se audita y esconderla seria el defecto, pero decir que lo tiene sin decir que hoy no
     *       lo ejerce seria el otro.
     * </ul>
     */
    private static String usuarioOperativo(String alias) {
        return "("
                + alias
                + ".habilitado"
                + " AND ("
                + alias
                + ".vigencia_desde IS NULL OR "
                + alias
                + ".vigencia_desde <= :fecha)"
                + " AND ("
                + alias
                + ".vigencia_hasta IS NULL OR "
                + alias
                + ".vigencia_hasta >= :fecha))";
    }

    /**
     * Cuenta los usuarios que hoy pueden administrar permisos, con la <b>misma precedencia</b> que
     * usa el guardia: la excepcion del usuario decide, y si no la hay manda la union de sus grupos.
     *
     * <p>Contar con otra regla que la del guardia seria peor que no contar: dejaria pasar un cambio
     * que en la practica si deja el sistema sin administrador, y con la tranquilidad de haberlo
     * comprobado.
     */
    @Override
    public long usuariosQuePuedenAdministrarPermisos(LocalDate fecha) {
        String sql =
                "SELECT count(*) FROM usuario u"
                        + " WHERE u.habilitado"
                        + "   AND (u.vigencia_desde IS NULL OR u.vigencia_desde <= :fecha)"
                        + "   AND (u.vigencia_hasta IS NULL OR u.vigencia_hasta >= :fecha)"
                        + "   AND COALESCE("
                        + "        (SELECT p.registro FROM permiso p"
                        + "           JOIN acceso a ON a.id = p.acceso_id AND a.codigo = :acceso"
                        + "          WHERE p.usuario_id = u.id),"
                        + "        EXISTS (SELECT 1 FROM miembro m"
                        + "                  JOIN grupo g ON g.id = m.grupo_id AND g.habilitado"
                        + "                   AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                   AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "                  JOIN permiso p ON p.grupo_id = g.id"
                        + "                  JOIN acceso a ON a.id = p.acceso_id AND a.codigo = :acceso"
                        + "                 WHERE m.usuario_id = u.id AND m.activo AND p.registro))";

        return Objects.requireNonNull(
                jdbc().sql(sql)
                        .param("fecha", fecha)
                        .param("acceso", ACCESO_DE_ADMINISTRACION)
                        .query(Long.class)
                        .single());
    }

    private Permiso insertar(Permiso permiso) {
        Origen origen = OrigenContext.actual();
        Long id =
                conPrivilegios(
                                jdbc().sql(
                                                "INSERT INTO permiso"
                                                        + " (municipalidad_id, acceso_id, grupo_id,"
                                                        + "  usuario_id, ejecucion, lectura, registro,"
                                                        + "  modificacion, eliminacion, impresion,"
                                                        + "  especial, usuario_registro)"
                                                        + " VALUES ("
                                                        + MUNICIPALIDAD_ACTUAL
                                                        + ", :acceso, :grupo, :usuario,"
                                                        + " :ejecucion, :lectura, :registro,"
                                                        + " :modificacion, :eliminacion,"
                                                        + " :impresion, :especial, :usuarioRegistro)"
                                                        + " RETURNING id")
                                        .param("acceso", permiso.accesoId())
                                        .param("grupo", permiso.grupoId())
                                        .param("usuario", permiso.usuarioId())
                                        .param("usuarioRegistro", origen.usuario()),
                                permiso)
                        .query(Long.class)
                        .single();

        return new Permiso(
                id,
                permiso.accesoId(),
                permiso.grupoId(),
                permiso.usuarioId(),
                permiso.privilegios());
    }

    private Permiso actualizar(Permiso permiso) {
        long id = Objects.requireNonNull(permiso.id(), "Un permiso existente tiene identificador");
        int filas =
                conPrivilegios(
                                jdbc().sql(
                                                "UPDATE permiso SET ejecucion = :ejecucion,"
                                                        + " lectura = :lectura, registro = :registro,"
                                                        + " modificacion = :modificacion,"
                                                        + " eliminacion = :eliminacion,"
                                                        + " impresion = :impresion,"
                                                        + " especial = :especial"
                                                        + " WHERE id = :id")
                                        .param("id", id),
                                permiso)
                        .update();
        if (filas == 0) {
            throw new IllegalStateException(
                    "No hay ningun permiso con identificador " + id + " en esta municipalidad");
        }
        return permiso;
    }

    /** Las siete, siempre: lo que no esta otorgado se escribe en falso, no se deja como estaba. */
    private static JdbcClient.StatementSpec conPrivilegios(
            JdbcClient.StatementSpec sentencia, Permiso permiso) {
        JdbcClient.StatementSpec resultado = sentencia;
        for (Privilegio privilegio : Privilegio.values()) {
            resultado = resultado.param(privilegio.columna(), permiso.tiene(privilegio));
        }
        return resultado;
    }

    private static Permiso mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        Set<Privilegio> privilegios = EnumSet.noneOf(Privilegio.class);
        for (Privilegio privilegio : Privilegio.values()) {
            if (fila.getBoolean(privilegio.columna())) {
                privilegios.add(privilegio);
            }
        }
        long grupoId = fila.getLong("grupo_id");
        boolean sinGrupo = fila.wasNull();
        long usuarioId = fila.getLong("usuario_id");
        boolean sinUsuario = fila.wasNull();

        return new Permiso(
                fila.getLong("id"),
                fila.getLong("acceso_id"),
                sinGrupo ? null : grupoId,
                sinUsuario ? null : usuarioId,
                privilegios);
    }
}
