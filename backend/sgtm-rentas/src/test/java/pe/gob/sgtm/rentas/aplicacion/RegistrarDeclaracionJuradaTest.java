package pe.gob.sgtm.rentas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
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
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.aplicacion.AdministrarParametros;
import pe.gob.sgtm.parametros.aplicacion.LectorDeParametrosSellados;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.parametros.infraestructura.ParametrosRepositoryJdbc;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.rentas.dominio.DeclaracionJurada;
import pe.gob.sgtm.rentas.dominio.TipoDeDeclaracion;
import pe.gob.sgtm.rentas.infraestructura.DeclaracionJuradaRepositoryJdbc;

/**
 * {@code RegistrarDeclaracionJurada} contra PostgreSQL real (RF-023, #28).
 *
 * <p>Lo que da valor a esta prueba son las dos resoluciones que hace el caso de uso antes de
 * construir el dominio, ninguna de las dos trivial de verificar con un doble:
 *
 * <ul>
 *   <li>{@code fechaLimite} sale de un conjunto <b>sellado</b> de verdad, via {@link
 *       LectorDeParametrosSellados} contra la base —no un literal de la prueba—, y un ejercicio sin
 *       sellar falla con {@link RegistrarDeclaracionJurada.PlazoSinParametrizar}.
 *   <li>la rectificacion dobla la fila anterior a {@code SUSTITUIDA} con el unico {@code UPDATE}
 *       del repositorio, sin tocar su numero ni su fecha (regla 4): las dos filas quedan, y se
 *       verifica contra la base, no contra el objeto en memoria.
 * </ul>
 *
 * <p>El enlace con la ficha catastral vigente ({@link LectorDeFichas}) se prueba con un doble fijo:
 * lo que aqui se verifica es que {@code RegistrarDeclaracionJurada} lo consulta y guarda lo que
 * devuelve, no la resolucion de vigencia en si —esa la prueba {@code catastro}, donde vive—.
 */
@DisplayName("RF-023 — Registrar y rectificar declaraciones juradas")
class RegistrarDeclaracionJuradaTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final LocalDate PLAZO = LocalDate.of(2026, 6, 30);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static JdbcClient jdbc;
    private static TenantTransactionManager gestor;
    private static TransactionTemplate transaccion;
    private static DeclaracionJuradaRepositoryJdbc repositorio;
    private static RegistrarDeclaracionJurada registrar;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("270101", "Municipalidad de la declaracion jurada");
        sellarPlazo(EJERCICIO, PLAZO);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        repositorio = new DeclaracionJuradaRepositoryJdbc(jdbc);

        LectorDeParametros parametros =
                envolver(new LectorDeParametrosSellados(new ParametrosRepositoryJdbc(jdbc)));
        registrar =
                envolver(
                        new RegistrarDeclaracionJurada(
                                repositorio,
                                parametros,
                                new FichaFija(),
                                new AuditoriaJdbc(jdbc, RELOJ)));
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
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
        OrigenContext.fijar(new Origen("jefe.rentas", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("Registro")
    class Registro {

        @Test
        @DisplayName("una DJ dentro del plazo se guarda sin marca de fuera de plazo")
        void unaDjDentroDelPlazoSeGuarda() throws SQLException {
            long titular = crearContribuyente("DJ-0001", "80200001");

            DeclaracionJurada guardada =
                    registrar.registrar(
                            "DJ-0001",
                            EJERCICIO,
                            titular,
                            TipoDeDeclaracion.HR,
                            null,
                            null,
                            LocalDate.of(2026, 3, 1),
                            Observacion.de("Primera inscripcion del predio"));

            assertThat(guardada.id()).isNotNull();
            assertThat(guardada.fechaLimite()).isEqualTo(PLAZO);
            assertThat(guardada.fueraDePlazo()).isFalse();

            // porNumero es lo que usa DeclaracionJuradaController: el contrato de djNro (RF-023).
            DeclaracionJurada porNumero =
                    transaccion.execute(
                            estado -> repositorio.porNumero("DJ-0001", EJERCICIO).orElseThrow());
            assertThat(porNumero).isNotNull();
            assertThat(porNumero.id()).isEqualTo(guardada.id());

            Long filas =
                    transaccion.execute(
                            estado ->
                                    jdbc.sql(
                                                    "SELECT count(*) FROM auditoria WHERE tabla ="
                                                            + " 'declaracion_jurada' AND operacion ="
                                                            + " 'ALTA' AND observacion LIKE"
                                                            + " '%inscripcion del predio%'")
                                            .query(Long.class)
                                            .single());
            assertThat(filas).isNotNull().isPositive();
        }

        @Test
        @DisplayName("una DJ presentada despues del plazo parametrizado se marca fuera de plazo")
        void unaDjFueraDePlazoSeMarca() throws SQLException {
            long titular = crearContribuyente("DJ-0002", "80200002");

            DeclaracionJurada guardada =
                    registrar.registrar(
                            "DJ-0002",
                            EJERCICIO,
                            titular,
                            TipoDeDeclaracion.PU,
                            null,
                            null,
                            LocalDate.of(2026, 7, 15),
                            Observacion.de("Se presenta fuera del plazo del ejercicio"));

            assertThat(guardada.fueraDePlazo())
                    .as("15 de julio es posterior al 30 de junio parametrizado")
                    .isTrue();

            Boolean marcada =
                    transaccion.execute(
                            estado ->
                                    jdbc.sql(
                                                    "SELECT fuera_de_plazo FROM declaracion_jurada"
                                                            + " WHERE id = :id")
                                            .param("id", guardada.id())
                                            .query(Boolean.class)
                                            .single());
            assertThat(marcada)
                    .as("la marca tambien queda en la fila, no solo en memoria")
                    .isTrue();
        }

        @Test
        @DisplayName(
                "el predio con ficha vigente enlaza el fichaCatastralId que devuelve LectorDeFichas")
        void elPredioConFichaEnlazaLaFicha() throws SQLException {
            long titular = crearContribuyente("DJ-0003", "80200003");
            long predio = crearPredio("000000000000000003");
            long ficha = crearFichaCatastral(predio);

            DeclaracionJurada guardada =
                    registrar.registrar(
                            "DJ-0003",
                            EJERCICIO,
                            titular,
                            TipoDeDeclaracion.PR,
                            predio,
                            null,
                            LocalDate.of(2026, 3, 1),
                            Observacion.de("Predial con ficha ya registrada"));

            assertThat(guardada.fichaCatastralId()).isEqualTo(ficha);
        }

        @Test
        @DisplayName("un predio sin ficha vigente guarda la DJ sin ficha enlazada")
        void unPredioSinFichaNoEnlazaNada() throws SQLException {
            long titular = crearContribuyente("DJ-0004", "80200004");
            long predio = crearPredio("000000000000000004");

            DeclaracionJurada guardada =
                    registrar.registrar(
                            "DJ-0004",
                            EJERCICIO,
                            titular,
                            TipoDeDeclaracion.PR,
                            predio,
                            null,
                            LocalDate.of(2026, 3, 1),
                            Observacion.de("Predio sin ficha catastral registrada todavia"));

            assertThat(guardada.fichaCatastralId()).isNull();
        }

        @Test
        @DisplayName("un ejercicio sin ningun conjunto sellado falla al resolver el plazo")
        void sinConjuntoSelladoFalla() throws SQLException {
            long titular = crearContribuyente("DJ-0005", "80200005");

            assertThatThrownBy(
                            () ->
                                    registrar.registrar(
                                            "DJ-0005",
                                            new Ejercicio(2031),
                                            titular,
                                            TipoDeDeclaracion.HR,
                                            null,
                                            null,
                                            LocalDate.of(2031, 3, 1),
                                            Observacion.de(
                                                    "El ejercicio 2031 no tiene ningun conjunto"
                                                            + " sellado")))
                    .as(
                            "calcular con un conjunto abierto daria una cifra que manana puede ser otra")
                    .isInstanceOf(LectorDeParametros.EjercicioSinSellar.class);
        }

        @Test
        @DisplayName(
                "un ejercicio sellado sin el parametro de plazo falla con PlazoSinParametrizar")
        void selladoSinElParametroDePlazoFalla() throws SQLException {
            long titular = crearContribuyente("DJ-0006", "80200006");
            sellarSinPlazo(new Ejercicio(2032));

            assertThatThrownBy(
                            () ->
                                    registrar.registrar(
                                            "DJ-0006",
                                            new Ejercicio(2032),
                                            titular,
                                            TipoDeDeclaracion.HR,
                                            null,
                                            null,
                                            LocalDate.of(2032, 3, 1),
                                            Observacion.de(
                                                    "El ejercicio 2032 esta sellado, pero sin el"
                                                            + " plazo de DJ")))
                    .as(
                            "sin plazo no hay con que comparar: inventar uno clasificaria mal cada"
                                    + " DJ que se registre")
                    .isInstanceOf(RegistrarDeclaracionJurada.PlazoSinParametrizar.class);
        }
    }

    @Nested
    @DisplayName("Rectificacion")
    class Rectificacion {

        @Test
        @DisplayName(
                "rectificar deja la anterior SUSTITUIDA y crea otra PRESENTADA: las dos filas quedan")
        void rectificarDejaLasDosFilas() throws SQLException {
            long titular = crearContribuyente("DJ-0010", "80200010");

            DeclaracionJurada original =
                    registrar.registrar(
                            "DJ-0010",
                            EJERCICIO,
                            titular,
                            TipoDeDeclaracion.HR,
                            null,
                            null,
                            LocalDate.of(2026, 3, 1),
                            Observacion.de("Declaracion original, con un area equivocada"));

            DeclaracionJurada rectificatoria =
                    registrar.rectificar(
                            original.id(),
                            "DJ-0010-R1",
                            null,
                            null,
                            LocalDate.of(2026, 4, 1),
                            Observacion.de("Se corrige el area declarada por error"));

            assertThat(rectificatoria.tipo()).isEqualTo(TipoDeDeclaracion.RECTIFICATORIA);
            assertThat(rectificatoria.djRectificaId()).isEqualTo(original.id());

            DeclaracionJurada anteriorEnBase =
                    transaccion.execute(
                            estado -> repositorio.findById(original.id()).orElseThrow());
            assertThat(anteriorEnBase).isNotNull();
            assertThat(anteriorEnBase.estado().name()).isEqualTo("SUSTITUIDA");
            assertThat(anteriorEnBase.numero())
                    .as("regla 4: la anterior no se edita, solo cambia su estado")
                    .isEqualTo("DJ-0010");

            DeclaracionJurada nuevaEnBase =
                    transaccion.execute(
                            estado -> repositorio.findById(rectificatoria.id()).orElseThrow());
            assertThat(nuevaEnBase).isNotNull();
            assertThat(nuevaEnBase.estado().name()).isEqualTo("PRESENTADA");
        }

        @Test
        @DisplayName("rectificar una DJ inexistente falla")
        void rectificarUnaDjInexistenteFalla() {
            assertThatThrownBy(
                            () ->
                                    registrar.rectificar(
                                            999_999L,
                                            "DJ-INEXISTENTE",
                                            null,
                                            null,
                                            LocalDate.of(2026, 4, 1),
                                            Observacion.de("No deberia llegar a escribirse")))
                    .isInstanceOf(RegistrarDeclaracionJurada.DeclaracionInexistente.class);
        }
    }

    // ------------------------------------------------------------------

    /**
     * Un {@link LectorDeFichas} de prueba: fijo, sin base de datos. Lo que prueba este archivo es
     * que {@code RegistrarDeclaracionJurada} lo consulta con el predio y la fecha correctos y
     * guarda lo que devuelve —no la resolucion de vigencia, que es de {@code catastro}—.
     */
    private static final class FichaFija implements LectorDeFichas {

        @Override
        public java.util.Optional<pe.gob.sgtm.dominio.AreaM2> areaDeLaVersion(long fichaId) {
            // El area de una version concreta la lee la deteccion de omisos (#49), no la DJ.
            throw new UnsupportedOperationException("esta prueba no lee superficies");
        }

        @Override
        public Optional<Long> fichaVigenteEn(long predioId, LocalDate fecha) {
            return jdbc().sql(
                            "SELECT id FROM ficha_catastral WHERE predio_id = :predioId AND"
                                    + " vigencia_desde <= :fecha AND (vigencia_hasta IS NULL OR"
                                    + " vigencia_hasta >= :fecha)")
                    .param("predioId", predioId)
                    .param("fecha", fecha)
                    .query(Long.class)
                    .optional();
        }
    }

    private static JdbcClient jdbc() {
        return jdbc;
    }

    private static void sellarPlazo(Ejercicio ejercicio, LocalDate plazo) throws SQLException {
        long parametro = parametroDePlazo(plazo);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));
        JdbcClient jdbcSellado = JdbcClient.create(pool);
        TenantTransactionManager gestorSellado = new TenantTransactionManager(pool);

        AdministrarParametros administrar =
                envolverCon(
                        new AdministrarParametros(
                                new ParametrosRepositoryJdbc(jdbcSellado),
                                new AuditoriaJdbc(jdbcSellado, RELOJ),
                                RELOJ),
                        gestorSellado);

        TenantContext.fijar(new MunicipalidadId(municipalidad));
        OrigenContext.fijar(new Origen("carga.parametros", null, null));
        try {
            ConjuntoDeParametros conjunto =
                    administrar.abrirVersion(
                            ejercicio, Observacion.de("Se abre el ejercicio para el plazo de DJ"));
            administrar.agregarParametro(
                    conjunto.id(),
                    parametro,
                    Observacion.de("Se incorpora el plazo de declaracion jurada"));
            administrar.sellar(
                    conjunto.id(), Observacion.de("Se sella el ejercicio para poder registrar"));
        } finally {
            TenantContext.limpiar();
            OrigenContext.limpiar();
        }
    }

    /**
     * Sella un conjunto del ejercicio sin el parametro {@code PLAZO/DECLARACION_JURADA}: hace falta
     * al menos un parametro para sellar (un conjunto vacio no se puede sellar), y aqui se agrega
     * uno que no es el que {@code RegistrarDeclaracionJurada} busca.
     */
    private static void sellarSinPlazo(Ejercicio ejercicio) throws SQLException {
        long otroParametro = parametroDistintoDelPlazo(ejercicio);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));
        JdbcClient jdbcSellado = JdbcClient.create(pool);
        TenantTransactionManager gestorSellado = new TenantTransactionManager(pool);

        AdministrarParametros administrar =
                envolverCon(
                        new AdministrarParametros(
                                new ParametrosRepositoryJdbc(jdbcSellado),
                                new AuditoriaJdbc(jdbcSellado, RELOJ),
                                RELOJ),
                        gestorSellado);

        // A diferencia de sellarPlazo (que corre en @BeforeAll, sin contexto ambiente), este
        // metodo lo invoca un test ya dentro de @BeforeEach: el TenantContext y el OrigenContext
        // los fija fijarContexto(), y aqui no se tocan para no dejarlos vacios cuando el test
        // continua con registrar.registrar(...) despues de llamar a este metodo.
        ConjuntoDeParametros conjunto =
                administrar.abrirVersion(
                        ejercicio, Observacion.de("Se abre el ejercicio sin el plazo de DJ"));
        administrar.agregarParametro(
                conjunto.id(),
                otroParametro,
                Observacion.de("Se incorpora un parametro que no es el plazo de DJ"));
        administrar.sellar(
                conjunto.id(),
                Observacion.de("Se sella el ejercicio, deliberadamente sin el plazo de DJ"));
    }

    private static long parametroDistintoDelPlazo(Ejercicio ejercicio) throws SQLException {
        try (Connection carga = base.conexion(BaseDeDatosDePrueba.CARGA_PARAMETROS);
                PreparedStatement sentencia =
                        carga.prepareStatement(
                                "INSERT INTO parametro_tributario (municipalidad_id, tipo, clave,"
                                        + " valor_numerico, vigencia_desde, documento_fuente,"
                                        + " usuario_carga, usuario_aprueba) VALUES (NULL,"
                                        + " 'FICTICIO', ?, 1.000000, DATE '2026-01-01', 'Valor"
                                        + " ficticio de prueba; no representa ninguna norma',"
                                        + " 'carga', 'aprueba') RETURNING id")) {
            sentencia.setString(1, "SIN_PLAZO_" + ejercicio.valor());
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                carga.commit();
                return id;
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolverCon(T objetivo, TenantTransactionManager gestorPropio) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(
                        gestorPropio, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
    }

    /**
     * Publica el parametro de texto con el rol que corresponde: la aplicacion solo tiene {@code
     * SELECT} sobre {@code parametro_tributario} (V7); publicar es trabajo de {@code
     * rol_carga_parametros}.
     */
    private static long parametroDePlazo(LocalDate plazo) throws SQLException {
        try (Connection carga = base.conexion(BaseDeDatosDePrueba.CARGA_PARAMETROS);
                PreparedStatement sentencia =
                        carga.prepareStatement(
                                "INSERT INTO parametro_tributario (municipalidad_id, tipo, clave,"
                                        + " valor_texto, vigencia_desde, documento_fuente,"
                                        + " usuario_carga, usuario_aprueba) VALUES (NULL, 'PLAZO',"
                                        + " 'DECLARACION_JURADA', ?, DATE '2026-01-01', 'Plazo"
                                        + " ficticio de prueba; no representa ninguna ordenanza',"
                                        + " 'carga', 'aprueba') RETURNING id")) {
            sentencia.setString(1, plazo.toString());
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                carga.commit();
                return id;
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

    private static long crearContribuyente(String codigo, String dni) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PRUEBA',"
                                    + " 'siembra') RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, dni);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearPredio(String codigoRefCatastral) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                    + " direccion) VALUES (?, ?, 'URBANO', 'Calle de prueba 123')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigoRefCatastral);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearFichaCatastral(long predioId) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo,"
                                    + " version, area_terreno, uso, vigencia_desde, origen,"
                                    + " documento_origen, observacion, usuario_registro)"
                                    + " VALUES (?, ?, 'UNICA', 1, 120.00, 'CASA HABITACION', DATE"
                                    + " '2026-01-01', 'DECLARACION_JURADA', 'DJ de prueba',"
                                    + " 'Se registra la ficha para la prueba', 'siembra')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, predioId);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }
}
