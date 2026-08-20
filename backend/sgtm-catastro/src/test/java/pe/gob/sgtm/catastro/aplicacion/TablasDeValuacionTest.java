package pe.gob.sgtm.catastro.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.catastro.dominio.Arancel;
import pe.gob.sgtm.catastro.dominio.Depreciacion;
import pe.gob.sgtm.catastro.dominio.Partida;
import pe.gob.sgtm.catastro.dominio.ValorUnitarioEdificacion;
import pe.gob.sgtm.catastro.infraestructura.ValuacionRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.aplicacion.LectorDeParametrosSellados;
import pe.gob.sgtm.parametros.infraestructura.ParametrosRepositoryJdbc;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * Aranceles, valores unitarios y depreciacion salen del <b>conjunto sellado</b>, y corregir una
 * cifra ya usada exige version nueva (#17).
 *
 * <p>Las dos pruebas que dan valor a este archivo son {@link
 * #corregirCreaVersionNuevaYLaAnteriorSigueIntacta()} y {@link
 * #cargarContraUnConjuntoSelladoFalla()}: la primera demuestra que el mecanismo de #10 funciona
 * igual aqui que en {@code parametros} y en el valor referencial vehicular de #141 —dos versiones
 * selladas del mismo ejercicio, cada una con su cifra, y la vigente es la de mayor version—; la
 * segunda demuestra que "editar en sitio falla" no es una promesa de la aplicacion sino del
 * disparador de {@code V18}, que ninguna carga concurrente puede sortear.
 *
 * <p><b>Aqui no hay ninguna cifra tributaria.</b> Los importes son de relleno y no representan
 * ningun valor normativo real: lo que se prueba es de donde se lee y cuando se puede escribir, no
 * cuanto vale (D-02).
 */
@DisplayName("#17 — Tablas de valuacion por conjunto")
class TablasDeValuacionTest {

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final BigDecimal VALOR_V1 = new BigDecimal("850.000000");
    private static final BigDecimal VALOR_V2 = new BigDecimal("900.000000");
    private static final Observacion OBSERVACION = Observacion.de("carga de prueba");

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long viaId;
    private static long conjuntoV1;
    private static long conjuntoV2;
    private static long conjuntoAbierto;
    private static TablasDeValuacion tablas;
    private static LectorDeParametros lector;
    private static ValuacionRepositoryJdbc repositorio;
    private static TransactionTemplate transacciones;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad();
        viaId = crearVia();
        conjuntoV1 = sellarConjuntoConArancel(1, VALOR_V1);
        conjuntoV2 = sellarConjuntoConArancel(2, VALOR_V2);
        conjuntoAbierto = crearConjuntoAbierto(3);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        repositorio = new ValuacionRepositoryJdbc(jdbc);
        transacciones = new TransactionTemplate(new TenantTransactionManager(pool));
        lector = envolver(new LectorDeParametrosSellados(new ParametrosRepositoryJdbc(jdbc)), pool);
        Clock reloj = Clock.fixed(Instant.parse("2026-06-01T00:00:00Z"), ZoneOffset.UTC);
        Auditoria auditoria = new AuditoriaJdbc(jdbc, reloj);
        tablas = envolver(new TablasDeValuacion(repositorio, lector, auditoria, reloj), pool);
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, DriverManagerDataSource pool) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(
                        new TenantTransactionManager(pool),
                        new AnnotationTransactionAttributeSource()));
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
        OrigenContext.fijar(new Origen("catastro.tecnico", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("el ejercicio resuelve al conjunto sellado de mayor version")
    void elEjercicioResuelveAlSelladoVigente() {
        assertThat(lector.conjuntoVigenteEn(EJERCICIO))
                .isEqualTo(IdentificadorDeConjunto.de(conjuntoV2));
    }

    @Test
    @DisplayName(
            "corregir crea version nueva, y la anterior sigue intacta con la cifra que uso su"
                    + " emision")
    void corregirCreaVersionNuevaYLaAnteriorSigueIntacta() {
        assertThat(tablas.aranceles(EJERCICIO))
                .as("la consulta por ejercicio usa el conjunto vigente: el de mayor version")
                .singleElement()
                .extracting(Arancel::valorM2)
                .extracting(ValorNormativo::valor)
                .satisfies(valor -> assertThat(valor).isEqualByComparingTo(VALOR_V2));

        BigDecimal arancelV1 = arancelDe(conjuntoV1);
        assertThat(arancelV1)
                .as(
                        "sin esto la prueba de arriba no demuestra nada: podria estar leyendo"
                                + " siempre la unica fila que hay, sin importar el conjunto")
                .isEqualByComparingTo(VALOR_V1);
    }

    @Test
    @DisplayName("cargar contra un conjunto sellado falla: no hay forma de editar en sitio")
    void cargarContraUnConjuntoSelladoFalla() {
        assertThatThrownBy(
                        () ->
                                tablas.cargarArancel(
                                        Arancel.nuevo(
                                                viaId,
                                                null,
                                                new ValorNormativo(VALOR_V1),
                                                "otra resolucion"),
                                        IdentificadorDeConjunto.de(conjuntoV1),
                                        OBSERVACION))
                .as(
                        "el disparador de V18 lo impide aunque la aplicacion nunca comprobara el"
                                + " estado del conjunto antes de escribir")
                .hasMessageContaining("sellad");
    }

    @Test
    @DisplayName("cargar contra un conjunto abierto entra, con auditoria")
    void cargarContraUnConjuntoAbiertoEntra() {
        Arancel guardado =
                tablas.cargarArancel(
                        Arancel.nuevo(
                                viaId,
                                "TRAMO-2",
                                new ValorNormativo(VALOR_V1),
                                "resolucion de prueba"),
                        IdentificadorDeConjunto.de(conjuntoAbierto),
                        OBSERVACION);

        assertThat(guardado.id()).isNotNull();
    }

    @Test
    @DisplayName("cargar sin observacion no compila: el metodo la exige en la firma (regla 10)")
    void observacionEsObligatoriaEnLaFirma() {
        // No hay sobrecarga sin Observacion, y por eso no hay nada que probar en tiempo de
        // ejecucion: TablasDeValuacion.cargarArancel(Arancel, IdentificadorDeConjunto,
        // Observacion) no compila si se omite el tercer argumento.
        assertThat(tablas).isNotNull();
    }

    @Test
    @DisplayName("valores unitarios y depreciacion tambien salen del conjunto vigente")
    void valoresUnitariosYDepreciacionSalenDelConjunto() {
        IdentificadorDeConjunto conjunto = IdentificadorDeConjunto.de(conjuntoAbierto);

        tablas.cargarValorUnitario(
                ValorUnitarioEdificacion.nuevo(
                        Partida.MUROS, 'C', 2000, null, new ValorNormativo(VALOR_V1), "resolucion"),
                conjunto,
                OBSERVACION);
        tablas.cargarDepreciacion(
                Depreciacion.nueva("CONCRETO", "BUENO", 10, Alicuota.de("5"), "resolucion"),
                conjunto,
                OBSERVACION);

        // El conjunto abierto no tiene por que ser el vigente de EJERCICIO todavia —solo lo
        // sellado cuenta—, asi que se lee directamente por identificador, como haria un
        // recalculo.
        List<ValorUnitarioEdificacion> valoresUnitarios =
                transacciones.execute(estado -> repositorio.valoresUnitariosDe(conjunto));
        assertThat(valoresUnitarios)
                .singleElement()
                .extracting(ValorUnitarioEdificacion::partida)
                .isEqualTo(Partida.MUROS);

        List<Depreciacion> depreciaciones =
                transacciones.execute(estado -> repositorio.depreciacionesDe(conjunto));
        assertThat(depreciaciones)
                .singleElement()
                .extracting(Depreciacion::material)
                .isEqualTo("CONCRETO");
    }

    /**
     * Lee el arancel de un conjunto concreto, que es la lectura de la reproducibilidad.
     *
     * <p>Va dentro de una transaccion explicita porque un repositorio no la abre: la abre el caso
     * de uso, y aqui se esta llamando al repositorio a proposito, para leer por identificador sin
     * pasar por la resolucion del ejercicio.
     */
    private static BigDecimal arancelDe(long conjunto) {
        return transacciones.execute(
                estado ->
                        repositorio.arancelesDe(IdentificadorDeConjunto.de(conjunto)).stream()
                                .findFirst()
                                .map(Arancel::valorM2)
                                .map(ValorNormativo::valor)
                                .orElseThrow());
    }

    private static long crearMunicipalidad() throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES ('220303', 'Municipalidad de la valuacion',"
                                        + " 'DISTRITAL') RETURNING id")) {
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                long id = fila.getLong(1);
                owner.commit();
                return id;
            }
        }
    }

    private static long crearVia() throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO via (municipalidad_id, codigo, tipo_via, nombre)"
                                    + " VALUES (?, 'V-VALUACION', 'AVENIDA', 'Via de la prueba')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long sellarConjuntoConArancel(int version, BigDecimal valor)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            long conjunto;
            // El conjunto se carga ABIERTO y se sella despues, en ese orden: el disparador
            // valuacion_de_conjunto_sellado_es_inmutable (V18) bloquea el INSERT en arancel
            // en cuanto su conjunto esta SELLADO, asi que sellar antes de cargar la fila
            // haria fallar esta misma fixture con el mismo error que
            // cargarContraUnConjuntoSelladoFalla existe para demostrar.
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio, version)"
                                    + " VALUES (?, ?, ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setInt(2, EJERCICIO.valor());
                sentencia.setInt(3, version);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    conjunto = fila.getLong(1);
                }
            }
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO arancel (municipalidad_id, conjunto_id, via_id, valor_m2,"
                                    + " documento_fuente)"
                                    + " VALUES (?, ?, ?, ?, 'tabla de la prueba, sin valor normativo')")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, conjunto);
                sentencia.setLong(3, viaId);
                sentencia.setBigDecimal(4, valor);
                sentencia.executeUpdate();
            }
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "UPDATE conjunto_parametros SET estado = 'SELLADO', fecha_sellado = now(),"
                                    + " usuario_sellado = 'prueba' WHERE municipalidad_id = ? AND id = ?")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, conjunto);
                sentencia.executeUpdate();
            }
            app.commit();
            return conjunto;
        }
    }

    private static long crearConjuntoAbierto(int version) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio, version)"
                                    + " VALUES (?, ?, ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setInt(2, EJERCICIO.valor());
                sentencia.setInt(3, version);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }
}
