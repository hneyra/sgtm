package pe.gob.sgtm.seguridad.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarPermisos;
import pe.gob.sgtm.seguridad.aplicacion.AdministrarSeguridad;
import pe.gob.sgtm.seguridad.infraestructura.AdministracionRepositoryJdbc;
import pe.gob.sgtm.seguridad.infraestructura.PermisoRepositoryJdbc;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * La matriz de permisos efectivos de un usuario, de HTTP a PostgreSQL y sin un doble (#543).
 *
 * <h2>Que mide, y por que hace falta que lo mida entera</h2>
 *
 * <p>Lo que este issue publica no es un listado mas: es una <b>regla de precedencia</b> puesta en
 * una respuesta. Una excepcion de usuario <b>sustituye</b> al grupo entero para ese acceso —otorgue
 * o niegue—, y esa regla vive en SQL, en el {@code CASE} de {@code PermisoRepositoryJdbc}. Probarla
 * contra un doble del repositorio seria probar el doble.
 *
 * <p>Y hace falta cruzar la frontera por lo de #486: el controlador llama al caso de uso, y sin
 * {@code @Transactional} no hay {@code SET LOCAL app.municipalidad_id}, asi que RLS no devuelve
 * vacio — <b>revienta</b> con «invalid input syntax for type bigint». El proxy se construye con
 * {@link AnnotationTransactionAttributeSource}, o sea obedeciendo a la anotacion igual que el
 * contenedor: quitarsela a {@code efectivosDeUsuario} o a {@code gruposDeUsuario} pone estas
 * pruebas en rojo con el 500 de produccion.
 *
 * <p>La conexion es la de {@code sgtm_app} y no la de superusuario: un superusuario omite RLS
 * incluso con {@code FORCE ROW LEVEL SECURITY}, y entonces el aislamiento no se estaria midiendo.
 */
@DisplayName("RF-121 — Permisos efectivos de un usuario, de HTTP a PostgreSQL (#543)")
class PermisosDeUnUsuarioFronteraTest {

    private static final LocalDate HOY = LocalDate.of(2026, 9, 1);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    /**
     * Los doce modulos del catalogo, todos con {@code orden = 0}, como los siembra la aplicacion.
     */
    private static final List<String> MODULOS =
            List.of(
                    "CATASTRO",
                    "RENTAS",
                    "TESORERIA",
                    "FISCALIZACION",
                    "COACTIVA",
                    "VALORES",
                    "TRANSITO",
                    "INFRACCIONES",
                    "AUTORIZACIONES_Y_LICENCIAS",
                    "CONSULTAS",
                    "SEGURIDAD",
                    "INICIO");

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static MockMvc mvc;

    /**
     * El pool con el que hablan los repositorios, guardado para poder <b>comprobar quien es</b>
     * (#545).
     *
     * <p>Todo lo que estas pruebas dicen del aislamiento depende de que este pool sea el de {@code
     * sgtm_app}: un superusuario del cluster omite RLS incluso con {@code FORCE ROW LEVEL
     * SECURITY}, y entonces las pruebas de aislamiento pasarian en verde sin medir nada. El
     * centinela existe para que un cambio de fixture no lo devuelva sin que nadie lo note.
     */
    private static DriverManagerDataSource pool;

    /** Ids sembrados en A. */
    private static long moduloA;

    private static long usuarioDeDosGrupos;
    private static long usuarioSinGrupos;
    private static long usuarioDeLaExcepcion;
    private static long usuarioDeDosGruposConPermiso;
    private static long grupoUno;
    private static long grupoDos;
    private static long grupoAjeno;
    private static long grupoAdministrador;

    /**
     * Y el escenario de #583: quien tiene ESPECIAL sobre «caja», y quien lo conserva sin poder
     * usarlo.
     *
     * <p>Va sobre un acceso propio —{@code caja}— y con usuarios propios para no mover ninguna de
     * las cuentas que las pruebas anteriores cuentan: el grupo «Mesa de Partes» tiene exactamente
     * tres miembros y quitar o añadir uno pondria roja una prueba de #582 por un motivo que no es
     * el que mide. Y <b>ninguno de estos usuarios recibe {@code registro} sobre {@code
     * permisos}</b> : si lo tuvieran, retirarselo al grupo administrador dejaria de ser «el ultimo»
     * y la prueba del 409 pasaria a verde sin que nadie tocara esa guarda.
     */
    private static long grupoCaja;

    private static long grupoSupervision;
    private static long cajaPorGrupo;
    private static long cajaPorExcepcion;
    private static long cajaRecortado;
    private static long cajaDeshabilitado;
    private static long cajaDeDosGrupos;
    private static long deshabilitadoSinNada;

    /** Y el homonimo en B, para el aislamiento. */
    private static long usuarioDeB;

    private static long cajaDeB;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("250101", "Municipalidad de permisos A");
        municipalidadB = crearMunicipalidad("250102", "Municipalidad de permisos B");

        pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        AdministracionRepositoryJdbc administracion = new AdministracionRepositoryJdbc(jdbc);
        PermisoRepositoryJdbc permisos = new PermisoRepositoryJdbc(jdbc);
        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, RELOJ);

        AdministrarSeguridad seguridad =
                conLaTransaccionQueDiceLaAnotacion(
                        new AdministrarSeguridad(administracion, auditoria, RELOJ), gestor);
        AdministrarPermisos administrarPermisos =
                conLaTransaccionQueDiceLaAnotacion(
                        new AdministrarPermisos(permisos, administracion, auditoria, RELOJ),
                        gestor);

        mvc =
                MockMvcBuilders.standaloneSetup(
                                new SeguridadController(seguridad),
                                new PermisosDeUsuarioController(administrarPermisos),
                                new TitularesDelPrivilegioController(administrarPermisos),
                                new PermisosController(administrarPermisos))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(
                                new JacksonJsonHttpMessageConverter(
                                        JsonMapper.builder()
                                                .addModule(
                                                        new ConfiguracionDeJson()
                                                                .moduloDeObjetosDeValor())
                                                .build()))
                        .build();

        sembrar();
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarContexto() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        OrigenContext.fijar(Origen.deProceso("prueba"));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------ AC 1

    @Test
    @DisplayName("AC 1 — devuelve los grupos a los que pertenece, y solo esos")
    void losGruposDelUsuario() throws Exception {
        String cuerpo = cuerpoDe(get(camino("/seguridad/usuarios/%d/grupos", usuarioDeDosGrupos)));

        assertThat(cuerpo)
                .as(
                        "sin transaccion RLS falla con «invalid input syntax for type bigint» y sale 500")
                .contains("Mesa de Partes")
                .contains("Caja");
        assertThat(cuerpo)
                .as("el tercer grupo existe y este usuario no esta en el")
                .doesNotContain("Coactiva");
    }

    @Test
    @DisplayName("AC 1 — un usuario sin ningun grupo es una pagina vacia, no un 404")
    void usuarioSinNingunGrupo() throws Exception {
        MvcResult resultado =
                mvc.perform(get(camino("/seguridad/usuarios/%d/grupos", usuarioSinGrupos)))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"totalElementos\":0");
    }

    @Test
    @DisplayName("AC 1 — un usuario que no existe es 404 nombrandolo, no una lista vacia")
    void usuarioInexistente() throws Exception {
        MvcResult resultado =
                mvc.perform(get(camino("/seguridad/usuarios/%d/grupos", 999_999L))).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("no tener grupos y no existir son dos respuestas distintas")
                .isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString()).contains("999999");
    }

    @Test
    @DisplayName("AC 1 — quien salio del grupo ya no pertenece, aunque su fila siga ahi")
    void laBajaNoEsPertenencia() throws Exception {
        String cuerpo =
                cuerpoDe(get(camino("/seguridad/usuarios/%d/grupos", usuarioDeLaExcepcion)));

        assertThat(cuerpo)
                .as(
                        "la fila de miembro no se borra (RNF-051), pero activo = false no es pertenecer")
                .doesNotContain("Coactiva");
    }

    // ------------------- #582: la pregunta inversa, quien esta EN un grupo

    @Test
    @DisplayName("#582 AC 1 — el grupo devuelve a sus miembros activos, y solo a esos")
    void losMiembrosDelGrupo() throws Exception {
        String cuerpo = cuerpoDe(get(camino("/seguridad/grupos/%d/miembros", grupoUno)));

        assertThat(cuerpo)
                .as("sin transaccion RLS no devuelve vacio: revienta con 500 (#486)")
                .contains("admin.local")
                .contains("con.excepcion")
                .contains("de.dos.grupos");
        assertThat(cuerpo).contains("\"totalElementos\":3");
    }

    @Test
    @DisplayName("#582 AC 1 — quien salio del grupo no sale, aunque su fila siga ahi")
    void elQueSalioNoEsMiembro() throws Exception {
        String cuerpo = cuerpoDe(get(camino("/seguridad/grupos/%d/miembros", grupoAjeno)));

        assertThat(cuerpo)
                .as(
                        "la fila de miembro no se borra (RNF-051), pero activo = false no es estar"
                                + " dentro: sin «AND m.activo» el dado de baja reaparece y el grupo"
                                + " le atribuiria permisos que ya no tiene")
                .doesNotContain("con.excepcion");
        assertThat(cuerpo)
                .as("un grupo del que todos salieron es una pagina vacia, no un 404")
                .contains("\"totalElementos\":0");
    }

    @Test
    @DisplayName("#582 AC 2 — cada fila trae cuenta, nombre y habilitado")
    void cadaFilaTraeLoQueLaGrillaDibuja() throws Exception {
        ejecutar("UPDATE usuario SET habilitado = false WHERE id = " + usuarioDeDosGrupos);
        try {
            String cuerpo = cuerpoDe(get(camino("/seguridad/grupos/%d/miembros", grupoUno)));

            assertThat(cuerpo)
                    .as(
                            "una cuenta deshabilitada que sigue afiliada es justo lo que hay que"
                                    + " poder ver: estar en el grupo y poder entrar son cosas"
                                    + " distintas, y sin «habilitado» en la fila haria falta una"
                                    + " segunda lectura por usuario para saberlo")
                    .contains("\"cuenta\":\"admin.local\"")
                    .contains("\"habilitado\":false");
            assertThat(cuerpo)
                    .as("y los otros dos siguen habilitados, o sea que la columna dice algo")
                    .contains("\"habilitado\":true");
        } finally {
            ejecutar("UPDATE usuario SET habilitado = true WHERE id = " + usuarioDeDosGrupos);
        }
    }

    @Test
    @DisplayName("#582 AC 3 — un grupo que no existe es 404 nombrandolo, no una pagina vacia")
    void grupoInexistenteEs404() throws Exception {
        MvcResult resultado =
                mvc.perform(get(camino("/seguridad/grupos/%d/miembros", 999_999L))).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "no tener miembros y no existir son dos respuestas distintas, y la segunda"
                                + " no se puede decir callando")
                .isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString()).contains("999999");
    }

    @Test
    @DisplayName("#582 AC 3 — desde B, el grupo de A no existe: 404, no sus miembros")
    void elAislamientoDeLosMiembros() throws Exception {
        TenantContext.fijar(new MunicipalidadId(municipalidadB));

        MvcResult resultado =
                mvc.perform(get(camino("/seguridad/grupos/%d/miembros", grupoUno))).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "conectando el pool como SUPERUSUARIO del cluster —que omite RLS incluso"
                                + " con FORCE ROW LEVEL SECURITY— esto seria 200 con los miembros"
                                + " de A. Con sgtm_owner NO: al dueno la politica tambien lo"
                                + " somete, y la rotura pasaria en verde sin medir nada (#537,"
                                + " #545)")
                .isEqualTo(404);
    }

    @Test
    @DisplayName("#582 AC 4 — el acceso es «grupos» con LECTURA, declarado en el metodo")
    void elAccesoDeLosMiembrosEsElDelGrupo() throws Exception {
        RequiereAcceso anotacion =
                SeguridadController.class
                        .getMethod(
                                "usuariosDeGrupo",
                                long.class,
                                pe.gob.sgtm.web.ParametrosDePaginacion.class)
                        .getAnnotation(RequiereAcceso.class);

        assertThat(anotacion)
                .as("la clase no declara ninguna: sin la del metodo esta lectura no tiene guardia")
                .isNotNull();
        assertThat(anotacion.acceso())
                .as(
                        "es una lectura SOBRE UN GRUPO, simetrica a la de los grupos de un usuario,"
                                + " que pide «usuarios». Pedir «miembros» exigiria el privilegio de"
                                + " afiliar para poder mirar. ArchUnit no ve CUAL acceso es:"
                                + " cambiarlo por «usuarios» deja el build en VERDE")
                .isEqualTo("grupos");
        assertThat(anotacion.privilegio()).isEqualTo(Privilegio.LECTURA);
    }

    // ------------------------------------------------------------------ AC 2 y AC 3

    @Test
    @DisplayName("AC 2 — la excepcion que NIEGA sale como negada, en una sola fila")
    void laExcepcionQueNiegaSaleComoNegada() throws Exception {
        List<Fila> filas = permisosDe(usuarioDeLaExcepcion);

        List<Fila> sobreSectores = sobre(filas, "sectores");
        assertThat(sobreSectores)
                .as("una fila, no dos que el cliente tenga que reconciliar")
                .hasSize(1);
        assertThat(sobreSectores.get(0).origen())
                .as("manda la excepcion, aunque el grupo otorgue")
                .isEqualTo("EXCEPCION");
        assertThat(sobreSectores.get(0).privilegios())
                .as(
                        "la fila vacia es la negacion hecha visible: sin ella, «se le nego» y «nunca"
                                + " lo tuvo» se leen igual")
                .isEmpty();
        assertThat(sobreSectores.get(0).grupoId())
                .as("una excepcion no viene de ningun grupo")
                .isNull();
    }

    @Test
    @DisplayName("AC 3 — la excepcion sustituye al grupo, no se une: LECTURA a secas")
    void laExcepcionSustituyeAlGrupoEntero() throws Exception {
        List<Fila> sobreCalles = sobre(permisosDe(usuarioDeLaExcepcion), "calles");

        assertThat(sobreCalles).hasSize(1);
        assertThat(sobreCalles.get(0).privilegios())
                .as(
                        "el grupo da LECTURA y EJECUCION y la excepcion solo LECTURA: el efectivo es"
                                + " LECTURA, no la union. Con la excepcion compitiendo por columna"
                                + " saldria EJECUCION de mas")
                .containsExactly("LECTURA");
        assertThat(sobreCalles.get(0).origen()).isEqualTo("EXCEPCION");
    }

    @Test
    @DisplayName("AC 2 — lo heredado dice de que grupo, cuando hay uno solo")
    void loHeredadoDiceDeQueGrupo() throws Exception {
        List<Fila> sobreCalles = sobre(permisosDe(usuarioDeDosGrupos), "calles");

        assertThat(sobreCalles).hasSize(1);
        assertThat(sobreCalles.get(0).origen()).isEqualTo("GRUPO");
        assertThat(sobreCalles.get(0).grupoId()).isEqualTo(grupoUno);
        assertThat(sobreCalles.get(0).privilegios())
                .as(
                        "los dos que el grupo otorga; sin excepcion que los recorte, los hereda enteros")
                .containsExactlyInAnyOrder("LECTURA", "EJECUCION");
    }

    @Test
    @DisplayName("AC 2 — de dos grupos a la vez no hay UN grupo que nombrar")
    void deDosGruposNoHayUnoQueNombrar() throws Exception {
        List<Fila> sobreVehiculos = sobre(permisosDe(usuarioDeDosGruposConPermiso), "vehiculos");

        assertThat(sobreVehiculos)
                .as("sigue siendo una fila por acceso: la union la hace el servidor")
                .hasSize(1);
        assertThat(sobreVehiculos.get(0).privilegios())
                .containsExactlyInAnyOrder("LECTURA", "IMPRESION");
        assertThat(sobreVehiculos.get(0).origen()).isEqualTo("GRUPO");
        assertThat(sobreVehiculos.get(0).grupoId())
                .as(
                        "publicar el menor de los dos ids seria un dato plausible y equivocado: nulo"
                                + " aqui significa «no hay uno solo»")
                .isNull();
    }

    @Test
    @DisplayName("AC 2 — un grupo cuya fila esta en cero no es el origen de nada")
    void elGrupoQueNoOtorgaNadaNoEsOrigen() throws Exception {
        List<Fila> sobreSectores = sobre(permisosDe(usuarioDeDosGrupos), "sectores");

        assertThat(sobreSectores).hasSize(1);
        assertThat(sobreSectores.get(0).privilegios()).containsExactly("LECTURA");
        assertThat(sobreSectores.get(0).grupoId())
                .as(
                        "pertenece a los dos, pero solo «Mesa de Partes» otorga: «Caja» tiene la fila"
                                + " de permiso con los siete privilegios en falso. Sin el filtro de"
                                + " «aporta algo» en el lateral, esto saldria nulo —«viene de varios"
                                + " grupos»— y la matriz no podria decir de cual quitarlo")
                .isEqualTo(grupoUno);
    }

    @Test
    @DisplayName("AC 2 — un acceso sobre el que no hay nada configurado no produce fila")
    void sinNadaConfiguradoNoHayFila() throws Exception {
        assertThat(sobre(permisosDe(usuarioDeDosGrupos), "auditoria"))
                .as("134 filas vacias por usuario no serian una matriz, serian ruido")
                .isEmpty();
    }

    @Test
    @DisplayName("AC 2 — un usuario deshabilitado recibe la lista vacia, como el guardia")
    void usuarioDeshabilitadoRecibeLaListaVacia() throws Exception {
        ejecutar("UPDATE usuario SET habilitado = false WHERE id = " + usuarioDeDosGrupos);
        try {
            assertThat(permisosDe(usuarioDeDosGrupos))
                    .as(
                            "resolverlo con otra regla que la del guardia enseñaria en la matriz"
                                    + " privilegios que despues responden 403")
                    .isEmpty();
        } finally {
            ejecutar("UPDATE usuario SET habilitado = true WHERE id = " + usuarioDeDosGrupos);
        }
    }

    @Test
    @DisplayName("AC 2 — un usuario que no existe es 404, no una matriz vacia")
    void permisosDeUnUsuarioInexistente() throws Exception {
        MvcResult resultado =
                mvc.perform(get(camino("/seguridad/usuarios/%d/permisos", 999_999L))).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString()).contains("999999");
    }

    // ------------------------------------------------------------------ AC 4

    @Test
    @DisplayName("AC 4 — el permiso de un grupo dice de que grupo, y no lleva usuario")
    void elPermisoDeGrupoSeDistingue() throws Exception {
        String cuerpo = cuerpoDe(get(camino("/seguridad/grupos/%d/permisos", grupoUno)));

        assertThat(cuerpo)
                .as(
                        "con grupoId primitivo, una fila sin grupo salia como 0L: indistinguible de"
                                + " la del grupo 0")
                .contains("\"grupoId\":" + grupoUno)
                .contains("\"usuarioId\":null");
    }

    // ------------------------------------------------------------------ AC 5

    @Test
    @DisplayName("AC 5 — desde B, el usuario de A no existe: 404, no una lista vacia")
    void elAislamientoSeSostieneEnLaFrontera() throws Exception {
        TenantContext.fijar(new MunicipalidadId(municipalidadB));

        MvcResult grupos =
                mvc.perform(get(camino("/seguridad/usuarios/%d/grupos", usuarioDeDosGrupos)))
                        .andReturn();
        MvcResult permisos =
                mvc.perform(get(camino("/seguridad/usuarios/%d/permisos", usuarioDeDosGrupos)))
                        .andReturn();

        assertThat(grupos.getResponse().getStatus())
                .as("con un superusuario —que omite RLS— esto seria 200 con los grupos de A")
                .isEqualTo(404);
        assertThat(permisos.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("AC 5 — y el homonimo de B trae lo suyo, no lo de A")
    void elHomonimoDeBTraeLoSuyo() throws Exception {
        TenantContext.fijar(new MunicipalidadId(municipalidadB));

        String cuerpo = cuerpoDe(get(camino("/seguridad/usuarios/%d/grupos", usuarioDeB)));

        assertThat(cuerpo).contains("Grupo de B");
        assertThat(cuerpo).doesNotContain("Mesa de Partes").doesNotContain("Caja");
    }

    // ------------------------------------------------------------------ AC 9

    @Test
    @DisplayName("AC 9 — los modulos salen en el mismo orden con cualquier tamano de pagina")
    void elOrdenDeLosModulosNoDependeDelTamanoDePagina() throws Exception {
        List<String> deTres = codigosDeModulos(3, 4);
        List<String> deCinco = codigosDeModulos(5, 3);
        List<String> deDoce = codigosDeModulos(12, 1);

        assertThat(deTres)
                .as(
                        "los doce tienen orden = 0: sin desempate el plan cambia con el tamano de"
                                + " pagina y el orden relativo con el")
                .isEqualTo(deDoce);
        assertThat(deCinco).isEqualTo(deDoce);
    }

    @Test
    @DisplayName("AC 9 — y recorrer las paginas de tres en tres devuelve los doce, sin repetir")
    void recorrerLasPaginasDevuelveLosDoce() throws Exception {
        List<String> recorridos = codigosDeModulos(3, 4);

        assertThat(recorridos).hasSize(MODULOS.size());
        assertThat(recorridos).doesNotHaveDuplicates();
        assertThat(recorridos).containsExactlyInAnyOrderElementsOf(MODULOS);
    }

    // ------------------------------------------------------------------ AC 11

    @Test
    @DisplayName("AC 11 — quitar el ultimo permiso de administracion responde 409 y no lo quita")
    void quitarElUltimoAdministradorEs409() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put(camino("/seguridad/grupos/%d/permisos", grupoAdministrador))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"niveles\":[{\"acceso\":\"permisos\","
                                                        + "\"privilegios\":[]}],"
                                                        + "\"observacion\":\"retiro de prueba\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("de un sistema sin nadie que administre permisos no se sale por el sistema")
                .isEqualTo(409);
        assertThat(
                        contar(
                                "SELECT count(*) FROM permiso p JOIN acceso a ON a.id = p.acceso_id"
                                        + " WHERE a.codigo = 'permisos' AND p.grupo_id = "
                                        + grupoAdministrador
                                        + " AND p.registro"))
                .as("y la transaccion se deshace: el privilegio sigue ahi")
                .isEqualTo(1);
    }

    // ------------------------------- #583: quien tiene X, y que conserva quien no opera

    @Test
    @DisplayName(
            "#583 AC 1 — quien tiene ESPECIAL sale entero en UNA peticion, por grupo y por"
                    + " excepcion")
    void quienTieneElPrivilegioSaleEnUnaPeticion() throws Exception {
        List<Titular> titulares = titulares("caja", "ESPECIAL");

        assertThat(cuentasDe(titulares))
                .as(
                        "quitando de la consulta la rama de la excepcion —el CASE sobre"
                                + " ux.acceso_id— desaparece «caja.por.excepcion», que es la mitad"
                                + " que ningun recorrido por grupos encontraria. Y «caja.recortado»"
                                + " NO esta: su grupo le da ESPECIAL y su excepcion solo LECTURA,"
                                + " asi que la excepcion SUSTITUYE al grupo; escrita como union"
                                + " —grupo OR excepcion— aparece, que es el defecto de #543")
                .containsExactly(
                        "caja.deshabilitado",
                        "caja.dos.grupos",
                        "caja.por.excepcion",
                        "caja.por.grupo");
    }

    @Test
    @DisplayName("#583 AC 1 — cada fila dice de donde le viene, y de que grupo cuando hay uno")
    void cadaTitularDiceDeDondeLeViene() throws Exception {
        List<Titular> titulares = titulares("caja", "ESPECIAL");

        assertThat(uno(titulares, "caja.por.grupo").origen()).isEqualTo("GRUPO");
        assertThat(uno(titulares, "caja.por.grupo").grupoId()).isEqualTo(grupoCaja);
        assertThat(uno(titulares, "caja.por.excepcion").origen()).isEqualTo("EXCEPCION");
        assertThat(uno(titulares, "caja.por.excepcion").grupoId())
                .as("una excepcion no viene de ningun grupo")
                .isNull();
        assertThat(uno(titulares, "caja.dos.grupos").grupoId())
                .as(
                        "pertenece a los dos, y solo «Cajeros» otorga ESPECIAL: el origen es ese."
                                + " Contando los grupos que otorgan CUALQUIER privilegio —como hace"
                                + " la matriz, donde es lo correcto— saldria nulo, «viene de"
                                + " varios», y quien administra perderia el dato con el que sabria"
                                + " de cual quitarlo")
                .isEqualTo(grupoCaja);
    }

    @Test
    @DisplayName("#583 AC 1 — y el mismo acceso con otro privilegio contesta otra cosa")
    void elPrivilegioAcotaDeVerdad() throws Exception {
        List<Titular> conLectura = titulares("caja", "LECTURA");

        assertThat(cuentasDe(conLectura))
                .as(
                        "no es la lista de ESPECIAL con otro nombre: entra «caja.recortado», a"
                                + " quien su excepcion le deja LECTURA, y SALE «caja.por.excepcion»"
                                + " —su excepcion solo otorga ESPECIAL, y una excepcion sustituye"
                                + " al grupo entero, tambien para lo que no otorga—. Un filtro que"
                                + " no acotara devolveria lo mismo para los dos privilegios")
                .containsExactly(
                        "caja.deshabilitado",
                        "caja.dos.grupos",
                        "caja.por.grupo",
                        "caja.recortado");
        assertThat(uno(conLectura, "caja.dos.grupos").grupoId())
                .as(
                        "y aqui SI la otorgan los dos grupos: nulo significa «no hay uno solo»,"
                                + " frente al mismo usuario con ESPECIAL, donde solo la otorga"
                                + " «Cajeros»")
                .isNull();
        assertThat(cuentasDe(titulares("caja", "ELIMINACION")))
                .as("nadie tiene ELIMINACION sobre la caja")
                .isEmpty();
    }

    @Test
    @DisplayName("#583 AC 1 — un privilegio que no existe es 422 enumerando los siete, no vacio")
    void unPrivilegioQueNoExisteEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                get(camino("/seguridad/accesos/%s/usuarios", "caja"))
                                        .param("privilegio", "TOTAL"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "una pagina vacia se leeria como «no lo tiene nadie», que es la lectura"
                                + " plausible y equivocada de #427")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("TOTAL")
                .contains("ESPECIAL");
    }

    @Test
    @DisplayName("#583 AC 1 — sin el privilegio es 422 nombrandolo, y un acceso que no existe, 404")
    void faltaElPrivilegioOSobraElAcceso() throws Exception {
        MvcResult sinPrivilegio =
                mvc.perform(get(camino("/seguridad/accesos/%s/usuarios", "caja"))).andReturn();
        MvcResult accesoInexistente =
                mvc.perform(
                                get(camino("/seguridad/accesos/%s/usuarios", "no.existe"))
                                        .param("privilegio", "ESPECIAL"))
                        .andReturn();

        assertThat(sinPrivilegio.getResponse().getStatus()).isEqualTo(422);
        assertThat(sinPrivilegio.getResponse().getContentAsString()).contains("privilegio");
        assertThat(accesoInexistente.getResponse().getStatus())
                .as("cero titulares y «ese acceso no esta en el catalogo» son dos respuestas")
                .isEqualTo(404);
        assertThat(accesoInexistente.getResponse().getContentAsString()).contains("no.existe");
    }

    @Test
    @DisplayName("#583 AC 2 — la cuenta deshabilitada sale, y dice que hoy no lo ejerce")
    void laCuentaDeshabilitadaSaleConSuBandera() throws Exception {
        List<Titular> titulares = titulares("caja", "ESPECIAL");

        assertThat(uno(titulares, "caja.deshabilitado").efectivoHoy())
                .as(
                        "esconderla seria esconder justo la fila que se audita —rehabilitarla le"
                                + " devuelve el privilegio entero—; publicarla sin la bandera"
                                + " afirmaria que entra donde el guardia le responde 403")
                .isFalse();
        assertThat(uno(titulares, "caja.por.grupo").efectivoHoy())
                .as("y la habilitada dice que si, o sea que la bandera dice algo")
                .isTrue();
    }

    @Test
    @DisplayName("#583 AC 2 — lo configurado distingue «conserva permisos» de «nunca tuvo»")
    void loConfiguradoDistingueLoQueLoEfectivoNoPuede() throws Exception {
        List<Fila> conserva = configuradosDe(cajaDeshabilitado);
        List<Fila> nuncaTuvo = configuradosDe(deshabilitadoSinNada);

        assertThat(permisosDe(cajaDeshabilitado))
                .as("lo EFECTIVO de las dos es la lista vacia, y eso no cambia (AC 3)")
                .isEmpty();
        assertThat(permisosDe(deshabilitadoSinNada)).isEmpty();

        // Campo a campo, no «no son iguales»: dos respuestas pueden diferir en
        // cualquier otra cosa y dejar pasar el defecto (la leccion de #546).
        assertThat(conserva).hasSize(1);
        assertThat(conserva.get(0).acceso()).isEqualTo("caja");
        assertThat(conserva.get(0).privilegios()).containsExactlyInAnyOrder("LECTURA", "ESPECIAL");
        assertThat(conserva.get(0).origen()).isEqualTo("GRUPO");
        assertThat(conserva.get(0).grupoId()).isEqualTo(grupoCaja);
        assertThat(nuncaTuvo)
                .as(
                        "devolviendo el EXISTS de u.habilitado a esta lectura, las dos vuelven a"
                                + " ser el mismo JSON vacio y la pregunta del panel vuelve a ser"
                                + " incontestable")
                .isEmpty();
    }

    @Test
    @DisplayName("#583 AC 2 — y la excepcion que niega sigue saliendo, que es lo que la distingue")
    void loConfiguradoConservaLaNegacionExpresa() throws Exception {
        List<Fila> sobreSectores = sobre(configuradosDe(usuarioDeLaExcepcion), "sectores");

        assertThat(sobreSectores)
                .as(
                        "descartar el conjunto vacio aqui borraria la diferencia entre «se le nego"
                                + " expresamente» y «nunca lo tuvo», que es la mitad del motivo por"
                                + " el que la excepcion existe")
                .hasSize(1);
        assertThat(sobreSectores.get(0).origen()).isEqualTo("EXCEPCION");
        assertThat(sobreSectores.get(0).privilegios()).isEmpty();
    }

    @Test
    @DisplayName("#583 AC 3 — con la cuenta habilitada, lo efectivo y lo configurado coinciden")
    void lasDosMatricesCoincidenCuandoLaCuentaOpera() throws Exception {
        assertThat(configuradosDe(usuarioDeLaExcepcion))
                .as(
                        "la unica diferencia entre las dos es la habilitacion del usuario: si"
                                + " divergieran en algo mas, se habrian escrito dos veces, y la"
                                + " precedencia acabaria distinta en cada una (#397)")
                .isEqualTo(permisosDe(usuarioDeLaExcepcion));
        assertThat(configuradosDe(usuarioDeDosGrupos)).isEqualTo(permisosDe(usuarioDeDosGrupos));
    }

    @Test
    @DisplayName("#583 AC 3 — y «quien tiene X» dice de cada cuenta lo que dice su propia matriz")
    void losTitularesYLaMatrizDicenLoMismo() throws Exception {
        List<Titular> titulares = titulares("caja", "ESPECIAL");

        for (long usuario :
                List.of(cajaPorGrupo, cajaPorExcepcion, cajaRecortado, cajaDeDosGrupos)) {
            List<Fila> sobreCaja = sobre(permisosDe(usuario), "caja");
            boolean loDiceLaMatriz =
                    !sobreCaja.isEmpty() && sobreCaja.get(0).privilegios().contains("ESPECIAL");
            boolean loDicenLosTitulares =
                    titulares.stream()
                            .anyMatch(
                                    titular ->
                                            titular.usuarioId() == usuario
                                                    && titular.efectivoHoy());

            assertThat(loDicenLosTitulares)
                    .as(
                            "las dos lecturas resuelven la precedencia con la MISMA expresion SQL;"
                                    + " si se separaran, la insignia del panel y la matriz que se"
                                    + " administra dirian cosas distintas del mismo usuario (%d)",
                            usuario)
                    .isEqualTo(loDiceLaMatriz);
        }
    }

    @Test
    @DisplayName("#583 AC 4 — desde B no se ve ninguna cuenta de A, ni lo que tiene configurado")
    void elAislamientoDeLasDosLecturasNuevas() throws Exception {
        TenantContext.fijar(new MunicipalidadId(municipalidadB));

        MvcResult configurados =
                mvc.perform(
                                get(
                                        camino(
                                                "/seguridad/usuarios/%d/permisos/configurados",
                                                cajaDeshabilitado)))
                        .andReturn();
        List<Titular> desdeB = titulares("caja", "ESPECIAL");

        assertThat(configurados.getResponse().getStatus())
                .as(
                        "con un SUPERUSUARIO del cluster —que omite RLS incluso con FORCE ROW LEVEL"
                                + " SECURITY— esto seria 200 con lo que la cuenta de A conserva."
                                + " Con sgtm_owner NO: al dueno la politica tambien lo somete y la"
                                + " rotura pasaria en verde (#537, #545)")
                .isEqualTo(404);
        assertThat(cuentasDe(desdeB))
                .as(
                        "el codigo «caja» existe en las dos municipalidades y aqui identifica UNO"
                                + " solo. Sin RLS, ni siquiera se llegaria a listar: dos filas de"
                                + " acceso con el mismo codigo dejan de identificar una (#548)")
                .containsExactly("caja.de.b");
        assertThat(desdeB.get(0).usuarioId()).isEqualTo(cajaDeB);
    }

    @Test
    @DisplayName("#583 AC 4 — y el pool es el de sgtm_app, no el del dueno ni el del superusuario")
    void seConectaComoSgtmApp() throws SQLException {
        try (Connection conexion = pool.getConnection();
                PreparedStatement sentencia = conexion.prepareStatement("SELECT current_user");
                ResultSet resultado = sentencia.executeQuery()) {
            resultado.next();
            assertThat(resultado.getString(1))
                    .as(
                            "sin este centinela, un cambio de fixture puede devolver la conexion al"
                                    + " superusuario del cluster —que omite RLS incluso con FORCE"
                                    + " ROW LEVEL SECURITY— y todas las pruebas de aislamiento de"
                                    + " este archivo pasarian en verde sin medir nada (#545)")
                    .isEqualTo(BaseDeDatosDePrueba.APP);
        }
    }

    // ------------------------------------------------------------------ apoyo

    private record Fila(String acceso, List<String> privilegios, String origen, Long grupoId) {}

    private record Titular(
            long usuarioId, String cuenta, boolean efectivoHoy, String origen, Long grupoId) {}

    private static List<Fila> permisosDe(long usuario) throws Exception {
        return leerFilas(cuerpoDe(get(camino("/seguridad/usuarios/%d/permisos", usuario))));
    }

    private static List<Fila> configuradosDe(long usuario) throws Exception {
        return leerFilas(
                cuerpoDe(get(camino("/seguridad/usuarios/%d/permisos/configurados", usuario))));
    }

    private static List<Titular> titulares(String acceso, String privilegio) throws Exception {
        return leerTitulares(
                cuerpoDe(
                        get(camino("/seguridad/accesos/%s/usuarios", acceso))
                                .param("privilegio", privilegio)));
    }

    private static List<String> cuentasDe(List<Titular> titulares) {
        return titulares.stream().map(Titular::cuenta).toList();
    }

    private static Titular uno(List<Titular> titulares, String cuenta) {
        return titulares.stream()
                .filter(titular -> titular.cuenta().equals(cuenta))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no esta en la lista: " + cuenta));
    }

    private static List<Fila> sobre(List<Fila> filas, String acceso) {
        return filas.stream().filter(fila -> fila.acceso().equals(acceso)).toList();
    }

    /**
     * Lee la lista de permisos efectivos sin traer una dependencia de JSON a este modulo.
     *
     * <p>La respuesta es un arreglo de objetos de cuatro campos escalares y una lista de cadenas;
     * un analizador de expresiones regulares alcanza y no obliga a exponer aqui el {@code
     * JsonMapper} de la aplicacion.
     */
    private static List<Fila> leerFilas(String json) {
        Pattern objeto =
                Pattern.compile(
                        "\\{\"acceso\":\"([^\"]+)\",\"privilegios\":\\[([^\\]]*)\\],"
                                + "\"origen\":\"([^\"]+)\",\"grupoId\":([^}]+)\\}");
        List<Fila> filas = new ArrayList<>();
        Matcher coincidencia = objeto.matcher(json);
        while (coincidencia.find()) {
            String privilegios = coincidencia.group(2);
            List<String> nombres =
                    privilegios.isBlank()
                            ? List.of()
                            : java.util.Arrays.stream(privilegios.split(","))
                                    .map(nombre -> nombre.replace("\"", "").trim())
                                    .toList();
            String grupo = coincidencia.group(4);
            filas.add(
                    new Fila(
                            coincidencia.group(1),
                            nombres,
                            coincidencia.group(3),
                            "null".equals(grupo) ? null : Long.valueOf(grupo)));
        }
        return filas;
    }

    /** Las filas del sobre paginado de «quien tiene X sobre Y», con el mismo criterio. */
    private static List<Titular> leerTitulares(String json) {
        Pattern objeto =
                Pattern.compile(
                        "\\{\"usuarioId\":(\\d+),\"cuenta\":\"([^\"]+)\",\"nombre\":\"[^\"]*\","
                                + "\"efectivoHoy\":(true|false),\"origen\":\"([^\"]+)\","
                                + "\"grupoId\":([^,}]+)\\}");
        List<Titular> titulares = new ArrayList<>();
        Matcher coincidencia = objeto.matcher(json);
        while (coincidencia.find()) {
            String grupo = coincidencia.group(5);
            titulares.add(
                    new Titular(
                            Long.parseLong(coincidencia.group(1)),
                            coincidencia.group(2),
                            Boolean.parseBoolean(coincidencia.group(3)),
                            coincidencia.group(4),
                            "null".equals(grupo) ? null : Long.valueOf(grupo)));
        }
        return titulares;
    }

    private static List<String> codigosDeModulos(int tamano, int paginas) throws Exception {
        List<String> codigos = new ArrayList<>();
        Pattern patron = Pattern.compile("\"codigo\":\"([^\"]+)\"");
        for (int pagina = 0; pagina < paginas; pagina++) {
            String cuerpo =
                    cuerpoDe(
                            get(camino("/seguridad/modulos"))
                                    .param("tamano", String.valueOf(tamano))
                                    .param("pagina", String.valueOf(pagina)));
            Matcher coincidencia = patron.matcher(cuerpo);
            while (coincidencia.find()) {
                codigos.add(coincidencia.group(1));
            }
        }
        return codigos;
    }

    private static String camino(String plantilla, Object... argumentos) {
        return "/api/v1" + String.format(plantilla, argumentos);
    }

    private static String cuerpoDe(org.springframework.test.web.servlet.RequestBuilder peticion)
            throws Exception {
        MvcResult resultado = mvc.perform(peticion).andReturn();
        assertThat(resultado.getResponse().getStatus())
                .as("cuerpo: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(200);
        return resultado.getResponse().getContentAsString();
    }

    @SuppressWarnings("unchecked")
    private static <T> T conLaTransaccionQueDiceLaAnotacion(
            T objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
    }

    // ------------------------------------------------------------------ siembra

    private static void sembrar() throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadA);
            moduloA = modulo(app, municipalidadA, MODULOS.get(0), 0);
            for (int i = 1; i < MODULOS.size(); i++) {
                modulo(app, municipalidadA, MODULOS.get(i), 0);
            }
            long calles = acceso(app, municipalidadA, moduloA, "calles");
            long sectores = acceso(app, municipalidadA, moduloA, "sectores");
            long vehiculos = acceso(app, municipalidadA, moduloA, "vehiculos");
            acceso(app, municipalidadA, moduloA, "auditoria");
            long permisos = acceso(app, municipalidadA, moduloA, "permisos");

            usuarioDeDosGrupos = usuario(app, municipalidadA, "admin.local");
            usuarioSinGrupos = usuario(app, municipalidadA, "sin.grupos");
            usuarioDeLaExcepcion = usuario(app, municipalidadA, "con.excepcion");
            usuarioDeDosGruposConPermiso = usuario(app, municipalidadA, "de.dos.grupos");
            long administrador = usuario(app, municipalidadA, "el.administrador");

            grupoUno = grupo(app, municipalidadA, "Mesa de Partes");
            grupoDos = grupo(app, municipalidadA, "Caja");
            grupoAjeno = grupo(app, municipalidadA, "Coactiva");
            grupoAdministrador = grupo(app, municipalidadA, "Administradores");

            afiliar(app, municipalidadA, grupoUno, usuarioDeDosGrupos, true);
            afiliar(app, municipalidadA, grupoDos, usuarioDeDosGrupos, true);
            afiliar(app, municipalidadA, grupoUno, usuarioDeLaExcepcion, true);
            // Fila de baja: sigue en la tabla y no es pertenencia.
            afiliar(app, municipalidadA, grupoAjeno, usuarioDeLaExcepcion, false);
            afiliar(app, municipalidadA, grupoUno, usuarioDeDosGruposConPermiso, true);
            afiliar(app, municipalidadA, grupoDos, usuarioDeDosGruposConPermiso, true);
            afiliar(app, municipalidadA, grupoAdministrador, administrador, true);

            // `grupoUno` da LECTURA y EJECUCION sobre `calles`, y LECTURA sobre `sectores`.
            permisoDeGrupo(app, municipalidadA, calles, grupoUno, "lectura", "ejecucion");
            permisoDeGrupo(app, municipalidadA, sectores, grupoUno, "lectura");
            // Los dos grupos dan algo sobre `vehiculos`: la union no tiene UN grupo.
            permisoDeGrupo(app, municipalidadA, vehiculos, grupoUno, "lectura");
            permisoDeGrupo(app, municipalidadA, vehiculos, grupoDos, "impresion");
            // Un grupo con la fila en cero no es el origen de nada.
            permisoDeGrupo(app, municipalidadA, sectores, grupoDos);
            // Y el que sostiene la guarda del ultimo administrador.
            permisoDeGrupo(app, municipalidadA, permisos, grupoAdministrador, "registro");

            // Las dos excepciones de `con.excepcion`: una restringe, la otra niega.
            permisoDeUsuario(app, municipalidadA, calles, usuarioDeLaExcepcion, "lectura");
            permisoDeUsuario(app, municipalidadA, sectores, usuarioDeLaExcepcion);

            sembrarElEscenarioDeLaCaja(app);
            app.commit();
        }

        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadB);
            long moduloB = modulo(app, municipalidadB, "CATASTRO", 0);
            usuarioDeB = usuario(app, municipalidadB, "admin.local");
            long grupoDeB = grupo(app, municipalidadB, "Grupo de B");
            afiliar(app, municipalidadB, grupoDeB, usuarioDeB, true);

            // El mismo codigo de acceso en las dos municipalidades, a proposito: es lo
            // que hace que «caja» solo identifique UNO cuando la politica RLS acota, y
            // lo que convierte al superusuario del cluster —que la omite— en una
            // ambiguedad que se ve.
            long cajaB = acceso(app, municipalidadB, moduloB, "caja");
            cajaDeB = usuario(app, municipalidadB, "caja.de.b");
            permisoDeUsuario(app, municipalidadB, cajaB, cajaDeB, "especial");
            app.commit();
        }
    }

    /**
     * El escenario de #583, sobre un acceso propio y con cuentas propias.
     *
     * <p>Lo que tiene que poder distinguirse:
     *
     * <ul>
     *   <li><b>por grupo</b> y <b>por excepcion</b>, porque un recorrido por grupos —el atajo
     *       obvio— deja fuera al segundo;
     *   <li>una excepcion que <b>recorta</b>: su grupo le da ESPECIAL y su excepcion no, asi que no
     *       lo tiene. Escrita como union en vez de como sustitucion, aparece;
     *   <li>una cuenta <b>deshabilitada que lo conserva</b>, frente a otra que nunca tuvo nada;
     *   <li>y dos grupos, de los que <b>uno solo</b> otorga ESPECIAL: el origen es ese, no
     *       «varios».
     * </ul>
     */
    private static void sembrarElEscenarioDeLaCaja(Connection app) throws SQLException {
        long caja = acceso(app, municipalidadA, moduloA, "caja");

        grupoCaja = grupo(app, municipalidadA, "Cajeros");
        grupoSupervision = grupo(app, municipalidadA, "Supervision de caja");
        permisoDeGrupo(app, municipalidadA, caja, grupoCaja, "lectura", "especial");
        permisoDeGrupo(app, municipalidadA, caja, grupoSupervision, "lectura");

        cajaPorGrupo = usuario(app, municipalidadA, "caja.por.grupo");
        afiliar(app, municipalidadA, grupoCaja, cajaPorGrupo, true);

        cajaPorExcepcion = usuario(app, municipalidadA, "caja.por.excepcion");
        permisoDeUsuario(app, municipalidadA, caja, cajaPorExcepcion, "especial");

        cajaRecortado = usuario(app, municipalidadA, "caja.recortado");
        afiliar(app, municipalidadA, grupoCaja, cajaRecortado, true);
        permisoDeUsuario(app, municipalidadA, caja, cajaRecortado, "lectura");

        cajaDeDosGrupos = usuario(app, municipalidadA, "caja.dos.grupos");
        afiliar(app, municipalidadA, grupoCaja, cajaDeDosGrupos, true);
        afiliar(app, municipalidadA, grupoSupervision, cajaDeDosGrupos, true);

        cajaDeshabilitado = usuarioDeshabilitado(app, municipalidadA, "caja.deshabilitado");
        afiliar(app, municipalidadA, grupoCaja, cajaDeshabilitado, true);

        deshabilitadoSinNada = usuarioDeshabilitado(app, municipalidadA, "sin.nada.deshabilitado");
    }

    private static long modulo(Connection app, long municipalidad, String codigo, int orden)
            throws SQLException {
        return unaClave(
                app,
                "INSERT INTO modulo_sistema (municipalidad_id, codigo, nombre, orden)"
                        + " VALUES (?, ?, ?, ?) RETURNING id",
                municipalidad,
                codigo,
                codigo,
                orden);
    }

    private static long acceso(Connection app, long municipalidad, long modulo, String codigo)
            throws SQLException {
        return unaClave(
                app,
                "INSERT INTO acceso (municipalidad_id, modulo_id, tipo, codigo, nombre)"
                        + " VALUES (?, ?, 'OPCION_MENU', ?, ?) RETURNING id",
                municipalidad,
                modulo,
                codigo,
                codigo);
    }

    private static long usuario(Connection app, long municipalidad, String cuenta)
            throws SQLException {
        return unaClave(
                app,
                "INSERT INTO usuario (municipalidad_id, cuenta, nombre) VALUES (?, ?, ?)"
                        + " RETURNING id",
                municipalidad,
                cuenta,
                cuenta);
    }

    /** Una cuenta que hoy no puede operar y conserva lo que tuviera configurado (#583). */
    private static long usuarioDeshabilitado(Connection app, long municipalidad, String cuenta)
            throws SQLException {
        return unaClave(
                app,
                "INSERT INTO usuario (municipalidad_id, cuenta, nombre, habilitado)"
                        + " VALUES (?, ?, ?, false) RETURNING id",
                municipalidad,
                cuenta,
                cuenta);
    }

    private static long grupo(Connection app, long municipalidad, String nombre)
            throws SQLException {
        return unaClave(
                app,
                "INSERT INTO grupo (municipalidad_id, nombre) VALUES (?, ?) RETURNING id",
                municipalidad,
                nombre);
    }

    private static void afiliar(
            Connection app, long municipalidad, long grupo, long usuario, boolean activo)
            throws SQLException {
        try (PreparedStatement sentencia =
                app.prepareStatement(
                        "INSERT INTO miembro (municipalidad_id, grupo_id, usuario_id,"
                                + " usuario_alta, activo) VALUES (?, ?, ?, 'siembra', ?)")) {
            sentencia.setLong(1, municipalidad);
            sentencia.setLong(2, grupo);
            sentencia.setLong(3, usuario);
            sentencia.setBoolean(4, activo);
            sentencia.executeUpdate();
        }
    }

    private static void permisoDeGrupo(
            Connection app, long municipalidad, long acceso, long grupo, String... columnas)
            throws SQLException {
        permiso(app, municipalidad, acceso, "grupo_id", grupo, columnas);
    }

    private static void permisoDeUsuario(
            Connection app, long municipalidad, long acceso, long usuario, String... columnas)
            throws SQLException {
        permiso(app, municipalidad, acceso, "usuario_id", usuario, columnas);
    }

    private static void permiso(
            Connection app,
            long municipalidad,
            long acceso,
            String columnaDelSujeto,
            long sujeto,
            String... columnas)
            throws SQLException {
        StringBuilder sql =
                new StringBuilder("INSERT INTO permiso (municipalidad_id, acceso_id, ")
                        .append(columnaDelSujeto)
                        .append(", usuario_registro");
        for (String columna : columnas) {
            sql.append(", ").append(columna);
        }
        sql.append(") VALUES (?, ?, ?, 'siembra'");
        sql.append(", true".repeat(columnas.length));
        sql.append(')');

        try (PreparedStatement sentencia = app.prepareStatement(sql.toString())) {
            sentencia.setLong(1, municipalidad);
            sentencia.setLong(2, acceso);
            sentencia.setLong(3, sujeto);
            sentencia.executeUpdate();
        }
    }

    private static long unaClave(Connection app, String sql, Object... argumentos)
            throws SQLException {
        try (PreparedStatement sentencia = app.prepareStatement(sql)) {
            for (int i = 0; i < argumentos.length; i++) {
                sentencia.setObject(i + 1, argumentos[i]);
            }
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getLong(1);
            }
        }
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

    private static void ejecutar(String sql) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadA);
            try (PreparedStatement sentencia = app.prepareStatement(sql)) {
                sentencia.executeUpdate();
            }
            app.commit();
        }
    }

    private static long contar(String sql) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadA);
            try (PreparedStatement sentencia = app.prepareStatement(sql);
                    ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getLong(1);
            }
        }
    }
}
