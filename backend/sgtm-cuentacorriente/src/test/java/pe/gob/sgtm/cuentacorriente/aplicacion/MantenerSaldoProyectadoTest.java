package pe.gob.sgtm.cuentacorriente.aplicacion;

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
import java.util.List;
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
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.Divergencia;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * El saldo proyectado, contra PostgreSQL real (ADR-0006).
 *
 * <p>Todo lo que sigue defiende una sola frase: <b>si la cache diverge del libro, manda el
 * libro</b>. De ahi salen las tres cosas que se comprueban —que se mantenga sola, que se pueda
 * rehacer y que la conciliacion <i>reporte</i> en vez de reparar— y tambien la que no se comprueba
 * porque no existe: aqui no se calcula deuda, solo se suma.
 */
@DisplayName("ADR-0006 — Saldo proyectado: cache reconstruible, no verdad")
class MantenerSaldoProyectadoTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-19T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);

    /** Reconstruir cambia cifras que la caja usa: la regla 10 pide decir por que. */
    private static final Observacion POR_QUE =
            Observacion.de("Reconstruccion tras la conciliacion mensual");

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long otraMunicipalidad;

    private static TransactionTemplate transaccion;
    private static RegistrarAsiento registrar;
    private static MantenerSaldoProyectado saldos;
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("310101", "Municipalidad del saldo");
        otraMunicipalidad = crearMunicipalidad("310102", "Municipalidad vecina");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        SaldoRepositoryJdbc repositorioDeSaldos = new SaldoRepositoryJdbc(jdbc);
        saldos =
                envolver(
                        new MantenerSaldoProyectado(
                                repositorioDeSaldos, new AuditoriaJdbc(jdbc, RELOJ), RELOJ),
                        gestor);
        registrar =
                envolver(
                        new RegistrarAsiento(
                                new AsientoRepositoryJdbc(jdbc),
                                repositorioDeSaldos,
                                new AuditoriaJdbc(jdbc, RELOJ)),
                        gestor);
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, TenantTransactionManager gestor) {
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
        OrigenContext.fijar(new Origen("caja.ventanilla", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("Se mantiene con el asiento, en la misma transaccion")
    class SeMantieneSolo {

        @Test
        @DisplayName("un cargo sube el saldo y un abono lo baja")
        void unCargoSubeYUnAbonoBaja() throws SQLException {
            long titular = crearContribuyente("C-310001", "41310001");

            registrar.asentar(cargo(titular, "150.00"), Observacion.de("Insoluto de la cuota 1"));
            assertThat(insolutoDe(titular)).isEqualTo(Dinero.de("150.00"));

            registrar.asentar(abono(titular, "50.00"), Observacion.de("Pago parcial en caja"));
            assertThat(insolutoDe(titular))
                    .as("el signo lo pone el tipo de asiento, no el importe")
                    .isEqualTo(Dinero.de("100.00"));
        }

        @Test
        @DisplayName("una reversion deshace tambien el saldo, no solo el libro")
        void unaReversionDeshaceElSaldo() throws SQLException {
            long titular = crearContribuyente("C-310011", "41310011");

            Asiento cargo =
                    registrar.asentar(cargo(titular, "200.00"), Observacion.de("Insoluto emitido"));
            registrar.reversar(
                    cargo.id(),
                    LocalDate.of(2026, 4, 1),
                    "RES-2026-0001",
                    Observacion.de("El cargo se emitio sobre el contribuyente equivocado"));

            assertThat(insolutoDe(titular))
                    .as(
                            "sin proyectar la reversion, el saldo se queda con el cargo deshecho y"
                                    + " la caja cobra una deuda que ya no existe")
                    .isEqualTo(Dinero.CERO);
        }

        @Test
        @DisplayName("cada clave lleva su propia fila: dos tributos no se suman en una")
        void cadaClaveLlevaSuFila() throws SQLException {
            long titular = crearContribuyente("C-310021", "41310021");

            registrar.asentar(cargo(titular, "100.00"), Observacion.de("Insoluto del predial"));
            registrar.asentar(
                    cargoDe(titular, "ARBITRIOS", 1, "80.00"),
                    Observacion.de("Insoluto de arbitrios"));

            List<SaldoProyectado> proyectado = saldos.de(titular, EJERCICIO);

            assertThat(proyectado)
                    .as("el estado de cuenta muestra una linea por tributo, no un total unico")
                    .hasSize(2);
            assertThat(proyectado)
                    .extracting(saldo -> saldo.clave().tributo())
                    .containsExactlyInAnyOrder("PREDIAL", "ARBITRIOS");
        }

        @Test
        @DisplayName("el saldo dice hasta que asiento del libro esta proyectado")
        void elSaldoDiceHastaDondeLlega() throws SQLException {
            long titular = crearContribuyente("C-310031", "41310031");

            Asiento cargo = registrar.asentar(cargo(titular, "90.00"), Observacion.de("Insoluto"));
            SaldoProyectado saldo = saldos.de(titular, EJERCICIO).get(0);

            assertThat(saldo.ultimoAsientoId()).isEqualTo(cargo.id());
            assertThat(saldo.estaAlDiaHasta(cargo.id()))
                    .as(
                            "es lo que permite a una consulta de cobranza DEMOSTRAR que la cifra"
                                    + " coincide con el libro, en vez de creerle")
                    .isTrue();
            assertThat(saldo.estaAlDiaHasta(cargo.id() + 1))
                    .as("y decir que no, cuando el libro avanzo y la cache no")
                    .isFalse();
        }
    }

    @Nested
    @DisplayName("Reconstruir da lo mismo que recorrer el libro")
    class Reconstruir {

        @Test
        @DisplayName("reconstruir sobre una cache correcta no cambia nada")
        void reconstruirSobreLoCorrectoNoCambiaNada() throws SQLException {
            long titular = crearContribuyente("C-310101", "41310101");
            registrar.asentar(cargo(titular, "300.00"), Observacion.de("Insoluto"));
            registrar.asentar(abono(titular, "120.00"), Observacion.de("Pago parcial en caja"));

            assertThat(saldos.reconstruir(titular, EJERCICIO, POR_QUE))
                    .as("si la reconstruccion moviera algo aqui, la proyeccion diaria estaria mal")
                    .isEmpty();
            assertThat(insolutoDe(titular)).isEqualTo(Dinero.de("180.00"));
        }

        @Test
        @DisplayName("una fila corrompida a mano se detecta y se repara")
        void unaFilaCorrompidaSeDetectaYSeRepara() throws SQLException {
            long titular = crearContribuyente("C-310111", "41310111");
            registrar.asentar(cargo(titular, "500.00"), Observacion.de("Insoluto"));

            corromper(titular, "9999.99");

            List<Divergencia> antes = saldos.conciliar(titular, EJERCICIO);
            assertThat(antes).hasSize(1);
            assertThat(antes.get(0).proyectado()).isEqualTo(Dinero.de("9999.99"));
            assertThat(antes.get(0).real()).isEqualTo(Dinero.de("500.00"));

            assertThat(saldos.reconstruir(titular, EJERCICIO, POR_QUE)).hasSize(1);
            assertThat(insolutoDe(titular)).isEqualTo(Dinero.de("500.00"));
            assertThat(saldos.conciliar(titular, EJERCICIO)).isEmpty();
        }

        @Test
        @DisplayName("una clave que la cache tiene y el libro no se pone en CERO, no se borra")
        void unaClaveQueElLibroNoTieneSePoneEnCero() throws SQLException {
            long titular = crearContribuyente("C-310121", "41310121");
            sembrarSaldoHuerfano(titular, "PATRIMONIO", "777.00");

            List<Divergencia> divergencias = saldos.conciliar(titular, EJERCICIO);
            assertThat(divergencias)
                    .as(
                            "sin mirar tambien en este sentido, el saldo de una deuda cuyos"
                                    + " asientos se reversaron seguiria cobrandose y la conciliacion"
                                    + " diria que todo esta bien")
                    .hasSize(1);
            assertThat(divergencias.get(0).real()).isEqualTo(Dinero.CERO);

            saldos.reconstruir(titular, EJERCICIO, POR_QUE);

            assertThat(filasDe(titular))
                    .as(
                            "saldo_proyectado no tiene privilegio de DELETE, y una fila en cero dice"
                                    + " «aqui hubo deuda y esta saldada» donde su ausencia no dice nada")
                    .isEqualTo(1);
            assertThat(saldos.conciliar(titular, EJERCICIO)).isEmpty();
        }

        @Test
        @DisplayName("el recorrido masivo es reanudable por identificador, sin tabla de progreso")
        void elRecorridoMasivoEsReanudable() throws SQLException {
            long uno = crearContribuyente("C-310131", "41310131");
            long dos = crearContribuyente("C-310132", "41310132");
            registrar.asentar(cargo(uno, "10.00"), Observacion.de("Insoluto del predial"));
            registrar.asentar(cargo(dos, "20.00"), Observacion.de("Insoluto del predial"));
            corromper(uno, "1.00");
            corromper(dos, "2.00");

            long ultimo = uno - 1;
            for (long contribuyente : saldos.conMovimiento(EJERCICIO, ultimo)) {
                saldos.reconstruir(contribuyente, EJERCICIO, POR_QUE);
                ultimo = contribuyente;
            }

            assertThat(ultimo)
                    .as(
                            "el recorrido avanza por identificador, que es todo lo que hace falta"
                                    + " para reanudar")
                    .isGreaterThanOrEqualTo(dos);
            assertThat(saldos.conciliar(uno, EJERCICIO)).isEmpty();
            assertThat(saldos.conciliar(dos, EJERCICIO)).isEmpty();

            assertThat(saldos.conMovimiento(EJERCICIO, ultimo))
                    .as("reanudar donde ya no queda nadie devuelve vacio, no revienta")
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("Lo que la conciliacion NO hace")
    class LoQueNoHace {

        @Test
        @DisplayName("conciliar reporta y NO repara")
        void conciliarReportaYNoRepara() throws SQLException {
            long titular = crearContribuyente("C-310201", "41310201");
            registrar.asentar(cargo(titular, "400.00"), Observacion.de("Insoluto"));
            corromper(titular, "1.00");

            saldos.conciliar(titular, EJERCICIO);

            assertThat(insolutoDe(titular))
                    .as(
                            "una cache que se arregla sola deja el saldo bien y el defecto que la"
                                    + " desajusto vivo, para que vuelva a pasar el mes siguiente sin"
                                    + " que nadie sepa cuantas veces paso")
                    .isEqualTo(Dinero.de(1));
        }

        @Test
        @DisplayName("una coincidencia no se puede reportar como divergencia")
        void unaCoincidenciaNoEsDivergencia() {
            assertThatThrownBy(
                            () ->
                                    new Divergencia(
                                            new ClaveDeSaldo(
                                                    1L,
                                                    "PREDIAL",
                                                    EJERCICIO,
                                                    0,
                                                    Fase.ORDINARIA,
                                                    null,
                                                    null),
                                            Dinero.de("10.00"),
                                            Dinero.de("10.00")))
                    .as("un informe de conciliacion con coincidencias dentro no se lee")
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Aislamiento")
    class Aislamiento {

        @Test
        @DisplayName("el saldo de A no se ve ni se reconstruye con el contexto de B")
        void elSaldoDeANoSeVeEnB() throws SQLException {
            long titular = crearContribuyente("C-310301", "41310301");
            registrar.asentar(cargo(titular, "600.00"), Observacion.de("Insoluto"));

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));

            assertThat(saldos.de(titular, EJERCICIO))
                    .as("la prueba corre como sgtm_app, que es a quien la politica RLS aplica")
                    .isEmpty();
            assertThat(saldos.conciliar(titular, EJERCICIO))
                    .as("y el libro tampoco se ve, asi que no hay divergencia que inventar")
                    .isEmpty();
        }
    }

    // ------------------------------------------------------------------

    private static Dinero insolutoDe(long titular) {
        List<SaldoProyectado> proyectado = saldos.de(titular, EJERCICIO);
        return proyectado.stream().map(SaldoProyectado::insoluto).reduce(Dinero.CERO, Dinero::mas);
    }

    private static Long filasDe(long titular) {
        return transaccion.execute(
                estado ->
                        jdbc.sql(
                                        "SELECT count(*) FROM saldo_proyectado"
                                                + " WHERE contribuyente_id = :contribuyente")
                                .param("contribuyente", titular)
                                .query(Long.class)
                                .single());
    }

    /**
     * Corrompe el saldo a proposito, por el propietario.
     *
     * <p>La aplicacion no puede llegar a este estado por si sola —el saldo lo escribe el mismo
     * {@code UPSERT} que suma el asiento—, y esa es justamente la razon de que la conciliacion
     * exista: el estado se alcanza por un defecto, una migracion a medias o una mano.
     */
    private static void corromper(long titular, String importe) throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER)) {
            ContextoDeTenant.fijar(owner, municipalidad);
            try (PreparedStatement sentencia =
                    owner.prepareStatement(
                            "UPDATE saldo_proyectado SET insoluto_saldo = ?::numeric"
                                    + " WHERE contribuyente_id = ?")) {
                sentencia.setString(1, importe);
                sentencia.setLong(2, titular);
                sentencia.executeUpdate();
                owner.commit();
            }
        }
    }

    /** Un saldo sin ningun asiento detras: lo que deja una deuda cuyos asientos se reversaron. */
    private static void sembrarSaldoHuerfano(long titular, String tributo, String importe)
            throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER)) {
            ContextoDeTenant.fijar(owner, municipalidad);
            try (PreparedStatement sentencia =
                    owner.prepareStatement(
                            "INSERT INTO saldo_proyectado (municipalidad_id, contribuyente_id,"
                                    + " tributo, ejercicio, periodo, fase, insoluto_saldo)"
                                    + " VALUES (?, ?, ?, 2026, 0, 'ORDINARIA', ?::numeric)")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, titular);
                sentencia.setString(3, tributo);
                sentencia.setString(4, importe);
                sentencia.executeUpdate();
                owner.commit();
            }
        }
    }

    private static Asiento cargo(long titular, String monto) {
        return cargoDe(titular, "PREDIAL", 1, monto);
    }

    private static Asiento cargoDe(long titular, String tributo, int periodo, String monto) {
        return Asiento.nuevo(
                EJERCICIO,
                titular,
                tributo,
                Concepto.INSOLUTO,
                TipoAsiento.CARGO,
                Fase.ORDINARIA,
                periodo,
                null,
                null,
                null,
                Dinero.de(monto),
                LocalDate.of(2026, 3, 1),
                "EM-2026-0010");
    }

    private static Asiento abono(long titular, String monto) {
        return Asiento.nuevo(
                EJERCICIO,
                titular,
                "PREDIAL",
                Concepto.PAGO,
                TipoAsiento.ABONO,
                Fase.ORDINARIA,
                1,
                null,
                null,
                null,
                Dinero.de(monto),
                LocalDate.of(2026, 4, 1),
                "REC-2026-0100");
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
}
