package pe.gob.sgtm.seguridad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
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
import pe.gob.sgtm.autorizacion.ComprobadorDeAcceso;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.seguridad.dominio.CatalogoDeOpciones;
import pe.gob.sgtm.seguridad.dominio.Grupo;
import pe.gob.sgtm.seguridad.dominio.RegistroDeMunicipalidades;
import pe.gob.sgtm.seguridad.dominio.Usuario;
import pe.gob.sgtm.seguridad.infraestructura.AdministracionRepositoryJdbc;
import pe.gob.sgtm.seguridad.infraestructura.ComprobadorDeAccesoJdbc;
import pe.gob.sgtm.seguridad.infraestructura.PermisoRepositoryJdbc;
import pe.gob.sgtm.seguridad.infraestructura.RegistroDeMunicipalidadesJdbc;

/**
 * La implantacion, contra PostgreSQL real y de punta a punta.
 *
 * <p>Lo que se verifica no es que las filas queden escritas —eso lo verifica cada caso de uso por
 * su cuenta— sino <b>que despues de correr esto haya alguien que pueda administrar el sistema</b>.
 * Es la unica pregunta que importa el dia de la implantacion, y la unica que no se puede responder
 * mirando tablas sueltas.
 *
 * <p>Se usa el {@link RegistroDeMunicipalidadesJdbc} de verdad, con las credenciales de {@code
 * sgtm_owner} de la base de prueba: el paso que necesita ese rol es justamente el que no tiene
 * sentido simular.
 */
@DisplayName("Implantacion de una municipalidad")
class ImplantarMunicipalidadTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-20T10:00:00Z"), ZoneId.of("America/Lima"));
    private static final LocalDate HOY = LocalDate.of(2026, 8, 20);
    private static final Paginacion TODO = Paginacion.de(0, 500, "id");

    private static BaseDeDatosDePrueba base;
    private static JdbcClient jdbc;
    private static ComprobadorDeAcceso comprobador;
    private static TransactionTemplate transaccion;
    private static TenantTransactionManager gestor;
    private static AdministrarSeguridad administrar;
    private static AdministrarPermisos permisos;
    private static AdministracionRepositoryJdbc administracion;
    private static RegistroDeMunicipalidades registro;
    private static SembradorDeAccesos sembrador;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        // El comprobador es @Transactional y hay que envolverlo: consulta tablas con
        // RLS, y sus politicas leen app.municipalidad_id, que solo existe dentro de una
        // transaccion. Sin envolver, PostgreSQL responde «unrecognized configuration
        // parameter» —el aislamiento funcionando— y la prueba se cae por el motivo
        // equivocado. Es el mismo descuido que tenia el guardia de acceso en produccion.
        comprobador = envolver(new ComprobadorDeAccesoJdbc(jdbc), gestor);
        administracion = new AdministracionRepositoryJdbc(jdbc);

        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, RELOJ);
        administrar = envolver(new AdministrarSeguridad(administracion, auditoria, RELOJ), gestor);
        permisos =
                envolver(
                        new AdministrarPermisos(
                                new PermisoRepositoryJdbc(jdbc), administracion, auditoria, RELOJ),
                        gestor);
        sembrador = envolver(new SembradorDeAccesos(jdbc, auditoria, RELOJ), gestor);

        registro =
                new RegistroDeMunicipalidadesJdbc(
                        base.url(),
                        BaseDeDatosDePrueba.OWNER,
                        base.clave(BaseDeDatosDePrueba.OWNER));
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
    }

    private static ImplantarMunicipalidad implantacion(String ubigeo, String administradorCuenta) {
        return new ImplantarMunicipalidad(
                sembrador,
                administrar,
                permisos,
                administracion,
                registro,
                gestor,
                new DatosDeImplantacion(
                        ubigeo,
                        "Municipalidad de prueba " + ubigeo,
                        "DISTRITAL",
                        administradorCuenta,
                        "Administrador de la implantacion",
                        "implantacion"));
    }

    /** Ejecuta la implantacion y devuelve el identificador de la municipalidad. */
    private static long implantar(String ubigeo, String administradorCuenta) {
        implantacion(ubigeo, administradorCuenta).run(null);
        return idDe(ubigeo);
    }

    /**
     * Cuenta los accesos de la municipalidad del contexto, dentro de una transaccion.
     *
     * <p>`acceso` es tabla de tenant: su politica lee app.municipalidad_id, y ese parametro lo fija
     * TenantTransactionManager al abrir la transaccion. Una lectura suelta no falla en vacio, falla
     * y punto, que es el comportamiento correcto (DAT-01 §0).
     */
    private static long accesosSembrados() {
        return transaccion.execute(
                estado -> jdbc.sql("SELECT count(*) FROM acceso").query(Long.class).single());
    }

    private static long idDe(String ubigeo) {
        return jdbc.sql("SELECT id FROM municipalidad WHERE ubigeo = :u")
                .param("u", ubigeo)
                .query(Long.class)
                .single();
    }

    @Nested
    @DisplayName("Deja el sistema administrable")
    class DejaElSistemaAdministrable {

        @Test
        @DisplayName("el administrador puede administrar permisos, que es de lo que depende todo")
        void elAdministradorPuedeAdministrar() {
            long municipalidad = implantar("250201", "admin.implantacion");
            TenantContext.fijar(new MunicipalidadId(municipalidad));

            assertThat(
                            comprobador.autoriza(
                                    "admin.implantacion", "permisos", Privilegio.MODIFICACION, HOY))
                    .as(
                            "sin esto, el primer administrador no puede darle permisos a nadie —ni a"
                                    + " si mismo—, y de ahi solo se sale entrando por la base de datos")
                    .isTrue();

            TenantContext.limpiar();
        }

        @Test
        @DisplayName("quedan sembrados todos los accesos del catalogo, no solo los de seguridad")
        void quedanSembradosTodosLosAccesos() {
            long municipalidad = implantar("250202", "admin.250202");
            TenantContext.fijar(new MunicipalidadId(municipalidad));

            long enLaBase = accesosSembrados();

            assertThat(enLaBase)
                    .as(
                            "una opcion sin acceso sembrado es una opcion a la que nadie puede dar"
                                    + " permiso, y no se nota hasta que alguien la busca")
                    .isEqualTo(CatalogoDeOpciones.leer().size());

            TenantContext.limpiar();
        }

        @Test
        @DisplayName("el administrador NO recibe las 134 opciones: solo las de seguridad")
        void elAdministradorNoRecibeTodo() {
            long municipalidad = implantar("250203", "admin.250203");
            TenantContext.fijar(new MunicipalidadId(municipalidad));

            // Puede administrar la seguridad...
            assertThat(comprobador.autoriza("admin.250203", "usuarios", Privilegio.REGISTRO, HOY))
                    .isTrue();
            // ...y no puede, de entrada, tocar el padron.
            assertThat(
                            comprobador.autoriza(
                                    "admin.250203", "contribuyentes", Privilegio.REGISTRO, HOY))
                    .as(
                            "darle de entrada las 134 opciones seria comodo el primer dia y dejaria"
                                    + " una cuenta con todo para siempre: nadie vuelve a quitarle nada"
                                    + " a la cuenta que funciona")
                    .isFalse();

            TenantContext.limpiar();
        }
    }

    @Nested
    @DisplayName("Idempotente: corre en cada despliegue")
    class Idempotente {

        @Test
        @DisplayName("la segunda ejecucion no duplica nada ni falla")
        void laSegundaEjecucionNoDuplicaNada() {
            long primera = implantar("250204", "admin.250204");
            long segunda = implantar("250204", "admin.250204");

            assertThat(segunda).as("la municipalidad es la misma fila").isEqualTo(primera);

            TenantContext.fijar(new MunicipalidadId(primera));

            Pagina<Grupo> grupos = administrar.grupos(TODO);
            assertThat(
                            grupos.contenido().stream()
                                    .filter(
                                            g ->
                                                    ImplantarMunicipalidad.GRUPO_DE_ADMINISTRACION
                                                            .equals(g.nombre()))
                                    .count())
                    .as(
                            "un grupo de administracion duplicado deja permisos repartidos en dos sitios")
                    .isEqualTo(1);

            Pagina<Usuario> usuarios = administrar.usuarios(TODO);
            assertThat(
                            usuarios.contenido().stream()
                                    .filter(u -> "admin.250204".equals(u.cuenta()))
                                    .count())
                    .isEqualTo(1);

            assertThat(accesosSembrados()).isEqualTo(CatalogoDeOpciones.leer().size());

            TenantContext.limpiar();
        }
    }

    @Nested
    @DisplayName("Aislamiento entre municipalidades implantadas")
    class Aislamiento {

        @Test
        @DisplayName("desde B, el administrador de A no existe")
        void desdeBElAdministradorDeANoExiste() {
            long a = implantar("250205", "admin.de.a");
            long b = implantar("250206", "admin.de.b");

            TenantContext.fijar(new MunicipalidadId(b));

            Optional<Usuario> deA =
                    transaccion.execute(estado -> administracion.usuarioPorCuenta("admin.de.a"));
            assertThat(deA)
                    .as("dos municipalidades implantadas en la misma base no se ven entre si")
                    .isEmpty();
            assertThat(comprobador.autoriza("admin.de.a", "permisos", Privilegio.MODIFICACION, HOY))
                    .as("y el administrador de una no autoriza en la otra")
                    .isFalse();

            assertThat(a).isNotEqualTo(b);
            TenantContext.limpiar();
        }
    }

    @Nested
    @DisplayName("Lo que la implantacion deja protegido")
    class LoQueDejaProtegido {

        @Test
        @DisplayName("no se le puede quitar al grupo el permiso que sostiene la administracion")
        void noSeLePuedeQuitarElPermisoQueSostieneLaAdministracion() {
            long municipalidad = implantar("250207", "admin.250207");
            TenantContext.fijar(new MunicipalidadId(municipalidad));
            pe.gob.sgtm.auditoria.OrigenContext.fijar(
                    pe.gob.sgtm.auditoria.Origen.deProceso("admin.250207"));

            long grupoId =
                    transaccion.execute(
                            estado ->
                                    administracion
                                            .grupoPorNombre(
                                                    ImplantarMunicipalidad.GRUPO_DE_ADMINISTRACION)
                                            .orElseThrow()
                                            .id());

            // Es la comprobacion que da valor a todo lo anterior: si el unico grupo que
            // puede administrar permisos se quedara sin ellos, la municipalidad tendria
            // que arreglarse entrando por la base de datos.
            assertThatThrownBy(
                            () ->
                                    permisos.fijarParaGrupo(
                                            grupoId,
                                            "permisos",
                                            Set.of(),
                                            Observacion.de(
                                                    "Intento de dejar la municipalidad sin quien"
                                                            + " administre")))
                    .as(
                            "la implantacion deja UN grupo administrador: quitarle esto lo deja en cero")
                    .isInstanceOf(RuntimeException.class);

            assertThat(
                            comprobador.autoriza(
                                    "admin.250207", "permisos", Privilegio.MODIFICACION, HOY))
                    .as("y despues del intento fallido sigue pudiendo administrar")
                    .isTrue();

            pe.gob.sgtm.auditoria.OrigenContext.limpiar();
            TenantContext.limpiar();
        }

        @Test
        @DisplayName("los siete privilegios quedan puestos, no solo la lectura")
        void losSietePrivilegiosQuedanPuestos() {
            long municipalidad = implantar("250208", "admin.250208");
            TenantContext.fijar(new MunicipalidadId(municipalidad));

            for (Privilegio privilegio : EnumSet.allOf(Privilegio.class)) {
                assertThat(comprobador.autoriza("admin.250208", "grupos", privilegio, HOY))
                        .as("privilegio %s sobre la pantalla de grupos", privilegio)
                        .isTrue();
            }

            TenantContext.limpiar();
        }
    }
}
