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

    /** Y el homonimo en B, para el aislamiento. */
    private static long usuarioDeB;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("250101", "Municipalidad de permisos A");
        municipalidadB = crearMunicipalidad("250102", "Municipalidad de permisos B");

        DriverManagerDataSource pool = new DriverManagerDataSource();
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

    // ------------------------------------------------------------------ apoyo

    private record Fila(String acceso, List<String> privilegios, String origen, Long grupoId) {}

    private static List<Fila> permisosDe(long usuario) throws Exception {
        return leerFilas(cuerpoDe(get(camino("/seguridad/usuarios/%d/permisos", usuario))));
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

            app.commit();
        }

        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadB);
            modulo(app, municipalidadB, "CATASTRO", 0);
            usuarioDeB = usuario(app, municipalidadB, "admin.local");
            long grupoDeB = grupo(app, municipalidadB, "Grupo de B");
            afiliar(app, municipalidadB, grupoDeB, usuarioDeB, true);
            app.commit();
        }
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
