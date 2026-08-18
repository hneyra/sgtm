package pe.gob.sgtm.seguridad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.autorizacion.ComprobadorDeAcceso;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.seguridad.infraestructura.ComprobadorDeAccesoJdbc;

/**
 * RF-121 a RF-123, contra PostgreSQL real: la siembra de accesos y la comprobacion de privilegios.
 *
 * <p>Se prueban juntos porque van juntos: sin siembra no hay acceso sobre el que otorgar un
 * permiso, y sin permiso la siembra no sirve de nada. Lo que se verifica es la cadena completa
 * —catalogo → acceso → permiso → grupo → miembro → usuario— con la vigencia en cada eslabon.
 */
@DisplayName("RF-121/123 — Autorizacion en el servidor")
class AutorizacionTest {

    private static final LocalDate HOY = LocalDate.of(2026, 8, 18);
    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;

    private static JdbcClient jdbc;
    private static TransactionTemplate transaccion;
    private static SembradorDeAccesos sembrador;
    private static ComprobadorDeAcceso comprobador;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("240101", "Municipalidad de autorizacion");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        comprobador = new ComprobadorDeAccesoJdbc(jdbc);

        SembradorDeAccesos objetivo = new SembradorDeAccesos(jdbc, new AuditoriaJdbc(jdbc), RELOJ);
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        sembrador = (SembradorDeAccesos) fabrica.getProxy();
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarContexto() {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        OrigenContext.fijar(Origen.deProceso("despliegue"));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("RF-122 — La siembra reconoce el catalogo sin intervencion manual")
    class Siembra {

        @Test
        @DisplayName("siembra las 134 opciones, es idempotente y deja una sola fila de auditoria")
        void siembraEsIdempotenteYSeAudita() throws SQLException {
            // Las aserciones no dependen de que esta prueba corra la primera: JUnit no
            // garantiza el orden entre clases anidadas, y una prueba que solo pasa si
            // va primero es una prueba que se rompera al agregar otra.
            sembrador.sembrar(Observacion.de("Siembra inicial de accesos, RF-122"));

            assertThat(contar("SELECT count(*) FROM acceso")).isEqualTo(134);
            assertThat(contar("SELECT count(*) FROM modulo_sistema")).isEqualTo(12);

            int repetida = sembrador.sembrar(Observacion.de("Segundo despliegue, sin cambios"));
            assertThat(repetida)
                    .as("se ejecuta en cada despliegue: lo que ya existe se queda como esta")
                    .isZero();
            assertThat(contar("SELECT count(*) FROM acceso")).isEqualTo(134);

            assertThat(contar("SELECT count(*) FROM auditoria WHERE tabla = 'acceso'"))
                    .as("una fila por corrida que crea algo, no 134 filas identicas")
                    .isEqualTo(1);
            assertThat(
                            textoUnico(
                                    "SELECT datos_nuevos::text FROM auditoria WHERE tabla = 'acceso'"))
                    .as("y esa fila dice cuantos accesos creo la corrida que si creo algo")
                    .contains("\"accesosCreados\": 134");
        }
    }

    @Nested
    @DisplayName("RF-121/123 — Los siete privilegios, con su vigencia")
    class Comprobacion {

        @Test
        @DisplayName("un usuario sin el privilegio no autoriza, aunque la opcion exista")
        void sinPrivilegioNoAutoriza() throws SQLException {
            sembrar();
            long usuario = crearUsuario("sin.permisos", null, null);

            assertThat(autoriza("sin.permisos", "calles", Privilegio.LECTURA))
                    .as("la opcion existe y el usuario tambien; lo que falta es el permiso")
                    .isFalse();
            assertThat(usuario).isPositive();
        }

        @Test
        @DisplayName("el privilegio otorgado autoriza, y solo ese")
        void elPrivilegioOtorgadoAutorizaYSoloEse() throws SQLException {
            sembrar();
            long usuario = crearUsuario("solo.lectura", null, null);
            otorgarAUsuario(usuario, "calles", Privilegio.LECTURA);

            assertThat(autoriza("solo.lectura", "calles", Privilegio.LECTURA)).isTrue();
            assertThat(autoriza("solo.lectura", "calles", Privilegio.REGISTRO))
                    .as("los siete son independientes: leer no es registrar")
                    .isFalse();
            assertThat(autoriza("solo.lectura", "sectores", Privilegio.LECTURA))
                    .as("y el permiso es sobre una opcion, no sobre el modulo entero")
                    .isFalse();
        }

        @Test
        @DisplayName("el permiso del grupo llega al miembro")
        void elPermisoDelGrupoLlegaAlMiembro() throws SQLException {
            sembrar();
            long usuario = crearUsuario("del.grupo", null, null);
            long grupo = crearGrupo("Mesa de Partes", null, null);
            afiliar(grupo, usuario, true);
            otorgarAGrupo(grupo, "calles", Privilegio.IMPRESION);

            assertThat(autoriza("del.grupo", "calles", Privilegio.IMPRESION)).isTrue();
        }

        @Test
        @DisplayName("RF-123: un permiso vencido no autoriza, ni por el usuario ni por el grupo")
        void unPermisoVencidoNoAutoriza() throws SQLException {
            sembrar();

            long vencido =
                    crearUsuario("vencido", LocalDate.of(2020, 1, 1), LocalDate.of(2026, 1, 1));
            otorgarAUsuario(vencido, "calles", Privilegio.LECTURA);
            assertThat(autoriza("vencido", "calles", Privilegio.LECTURA))
                    .as("la vigencia del usuario acabo antes de hoy")
                    .isFalse();

            long futuro = crearUsuario("futuro", LocalDate.of(2027, 1, 1), null);
            otorgarAUsuario(futuro, "calles", Privilegio.LECTURA);
            assertThat(autoriza("futuro", "calles", Privilegio.LECTURA))
                    .as("y la de este todavia no empieza")
                    .isFalse();

            long usuario = crearUsuario("grupo.vencido", null, null);
            long grupo =
                    crearGrupo("Grupo vencido", LocalDate.of(2020, 1, 1), LocalDate.of(2026, 1, 1));
            afiliar(grupo, usuario, true);
            otorgarAGrupo(grupo, "calles", Privilegio.LECTURA);
            assertThat(autoriza("grupo.vencido", "calles", Privilegio.LECTURA))
                    .as("comprobar solo la vigencia del usuario dejaria esta puerta abierta")
                    .isFalse();
        }

        @Test
        @DisplayName("sacar a alguien de un grupo le quita lo que el grupo le daba")
        void sacarDelGrupoQuitaElPermiso() throws SQLException {
            sembrar();
            long usuario = crearUsuario("dado.de.baja", null, null);
            long grupo = crearGrupo("Grupo del que sale", null, null);
            afiliar(grupo, usuario, false);
            otorgarAGrupo(grupo, "calles", Privilegio.LECTURA);

            assertThat(autoriza("dado.de.baja", "calles", Privilegio.LECTURA))
                    .as("la fila sigue ahi porque no se borra (RNF-051); hay que mirar activo")
                    .isFalse();
        }

        @Test
        @DisplayName("un usuario deshabilitado no entra aunque conserve sus permisos")
        void unUsuarioDeshabilitadoNoEntra() throws SQLException {
            sembrar();
            long usuario = crearUsuario("deshabilitado", null, null);
            otorgarAUsuario(usuario, "calles", Privilegio.LECTURA);
            ejecutar("UPDATE usuario SET habilitado = false WHERE id = " + usuario);

            assertThat(autoriza("deshabilitado", "calles", Privilegio.LECTURA)).isFalse();
        }
    }

    // ------------------------------------------------------------------

    private static boolean autoriza(String usuario, String acceso, Privilegio privilegio) {
        return Boolean.TRUE.equals(
                transaccion.execute(
                        estado -> comprobador.autoriza(usuario, acceso, privilegio, HOY)));
    }

    private static void sembrar() {
        sembrador.sembrar(Observacion.de("Siembra de accesos para la prueba de autorizacion"));
    }

    private static long crearUsuario(String cuenta, LocalDate desde, LocalDate hasta) {
        return unicoLong(
                transaccion.execute(
                        estado ->
                                jdbc.sql(
                                                "INSERT INTO usuario (municipalidad_id, cuenta,"
                                                        + " nombre, vigencia_desde, vigencia_hasta)"
                                                        + " VALUES"
                                                        + " (current_setting('app.municipalidad_id')::bigint,"
                                                        + " :cuenta, :cuenta, :desde, :hasta)"
                                                        + " RETURNING id")
                                        .param("cuenta", cuenta)
                                        .param("desde", desde)
                                        .param("hasta", hasta)
                                        .query(Long.class)
                                        .single()));
    }

    private static long crearGrupo(String nombre, LocalDate desde, LocalDate hasta) {
        return unicoLong(
                transaccion.execute(
                        estado ->
                                jdbc.sql(
                                                "INSERT INTO grupo (municipalidad_id, nombre,"
                                                        + " vigencia_desde, vigencia_hasta) VALUES"
                                                        + " (current_setting('app.municipalidad_id')::bigint,"
                                                        + " :nombre, :desde, :hasta) RETURNING id")
                                        .param("nombre", nombre)
                                        .param("desde", desde)
                                        .param("hasta", hasta)
                                        .query(Long.class)
                                        .single()));
    }

    private static void afiliar(long grupo, long usuario, boolean activo) {
        transaccion.execute(
                estado ->
                        jdbc.sql(
                                        "INSERT INTO miembro (municipalidad_id, grupo_id,"
                                                + " usuario_id, usuario_alta, activo) VALUES"
                                                + " (current_setting('app.municipalidad_id')::bigint,"
                                                + " :grupo, :usuario, 'prueba', :activo)")
                                .param("grupo", grupo)
                                .param("usuario", usuario)
                                .param("activo", activo)
                                .update());
    }

    private static void otorgarAUsuario(long usuario, String acceso, Privilegio privilegio) {
        otorgar("usuario_id", usuario, acceso, privilegio);
    }

    private static void otorgarAGrupo(long grupo, String acceso, Privilegio privilegio) {
        otorgar("grupo_id", grupo, acceso, privilegio);
    }

    private static void otorgar(
            String columnaDelSujeto, long sujeto, String acceso, Privilegio privilegio) {
        transaccion.execute(
                estado ->
                        jdbc.sql(
                                        "INSERT INTO permiso (municipalidad_id, acceso_id, "
                                                + columnaDelSujeto
                                                + ", "
                                                + privilegio.columna()
                                                + ", usuario_registro) SELECT"
                                                + " current_setting('app.municipalidad_id')::bigint,"
                                                + " a.id, :sujeto, true, 'prueba' FROM acceso a"
                                                + " WHERE a.codigo = :acceso")
                                .param("sujeto", sujeto)
                                .param("acceso", acceso)
                                .update());
    }

    private static void ejecutar(String sql) {
        transaccion.execute(estado -> jdbc.sql(sql).update());
    }

    private static long unicoLong(Long valor) {
        if (valor == null) {
            throw new IllegalStateException("La insercion no devolvio identificador");
        }
        return valor;
    }

    private static long crearMunicipalidad(String ubigeo, String nombre) throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES (?, ?, 'DISTRITAL') RETURNING id")) {
            sentencia.setString(1, ubigeo);
            sentencia.setString(2, nombre);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                owner.commit();
                return id;
            }
        }
    }

    private static String textoUnico(String sql) throws SQLException {
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia = admin.prepareStatement(sql);
                ResultSet resultado = sentencia.executeQuery()) {
            resultado.next();
            return String.valueOf(resultado.getString(1));
        }
    }

    private static long contar(String sql) throws SQLException {
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia = admin.prepareStatement(sql);
                ResultSet resultado = sentencia.executeQuery()) {
            resultado.next();
            return resultado.getLong(1);
        }
    }

    /** Sin uso directo; el fixture queda referenciado para que no se pierda de vista. */
    @SuppressWarnings("unused")
    private static void fijarEn(Connection conexion) throws SQLException {
        ContextoDeTenant.fijar(conexion, municipalidad);
    }
}
