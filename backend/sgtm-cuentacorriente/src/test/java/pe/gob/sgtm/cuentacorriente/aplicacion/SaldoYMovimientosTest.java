package pe.gob.sgtm.cuentacorriente.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Divergencia;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.PoliticaDeMora;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * El saldo proyectado y los movimientos de deuda, contra PostgreSQL de verdad (#23, #24).
 *
 * <p>Las pruebas que dan valor a este archivo son tres: que el saldo se mantiene <b>en la misma
 * transaccion</b> que el asiento, que la conciliacion <b>detecta</b> una fila corrompida a
 * proposito y la reconstruccion la repara, y que una baja mayor que la deuda vigente a su fecha se
 * rechaza.
 *
 * <p><b>Aqui no hay ninguna cifra tributaria.</b> Los importes son de relleno: lo que se prueba es
 * el mecanismo, no cuanto se debe (D-02).
 */
@DisplayName("#23/#24 — Saldo proyectado y movimientos de deuda")
class SaldoYMovimientosTest {

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-06-01T00:00:00Z"), ZoneOffset.UTC);
    private static final Observacion OBSERVACION = Observacion.de("movimiento de la prueba");
    private static final LocalDate FECHA = LocalDate.of(2026, 5, 10);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static AsientoRepositoryJdbc asientos;
    private static SaldoRepositoryJdbc saldos;
    private static RegistrarAsiento registrarAsiento;
    private static RegistrarMovimientoDeDeuda movimientos;
    private static ReconstruirSaldo reconstruir;
    private static ReconstruirPadron padron;
    private static org.springframework.transaction.support.TransactionTemplate transaccion;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("250101", "Municipalidad del saldo");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);

        asientos = new AsientoRepositoryJdbc(jdbc);
        saldos = new SaldoRepositoryJdbc(jdbc);
        registrarAsiento =
                envolver(
                        new RegistrarAsiento(
                                asientos, saldos, new AuditoriaJdbc(jdbc, RELOJ), RELOJ),
                        gestor);
        movimientos =
                envolver(
                        new RegistrarMovimientoDeDeuda(
                                asientos,
                                registrarAsiento,
                                new CalculoDeDeuda(new SinAcumulacionDePrueba()),
                                new PoliticaDeRedondeo(2, RoundingMode.HALF_UP)),
                        gestor);
        reconstruir = envolver(new ReconstruirSaldo(asientos, saldos, RELOJ), gestor);
        padron = new ReconstruirPadron(asientos, reconstruir, gestor);
        transaccion = new org.springframework.transaction.support.TransactionTemplate(gestor);
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
        OrigenContext.fijar(new Origen("cajera.ventanilla", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ---------- #23 ----------

    @Test
    @DisplayName("asentar deja el saldo proyectado al dia, sin reconstruir nada")
    void asentarDejaElSaldoAlDia() {
        long titular = crearContribuyente("S-0001", "60100001");

        movimientos.registrar(alta(titular, Dinero.de(1000)), OBSERVACION);

        assertThat(saldoDe(titular))
                .as("el mantenimiento va en la misma transaccion que el asiento (ADR-0006)")
                .get()
                .extracting(SaldoProyectado::insolutoSaldo)
                .isEqualTo(Dinero.de(1000));
    }

    @Test
    @DisplayName("reconstruir da exactamente lo mismo que recorrer el libro")
    void reconstruirDaLoMismoQueElLibro() {
        long titular = crearContribuyente("S-0002", "60100002");

        movimientos.registrar(alta(titular, Dinero.de(1000)), OBSERVACION);
        movimientos.registrar(baja(titular, Dinero.de(250)), OBSERVACION);

        List<SaldoProyectado> reconstruidos = reconstruir.deContribuyente(titular);

        assertThat(reconstruidos)
                .singleElement()
                .extracting(SaldoProyectado::insolutoSaldo)
                .isEqualTo(Dinero.de(750));
        assertThat(reconstruir.conciliar(titular))
                .as("y despues de reconstruir no queda ninguna divergencia")
                .isEmpty();
    }

    @Test
    @DisplayName(
            "una fila corrompida a proposito: la conciliacion la detecta y la reparacion la repara")
    void laConciliacionDetectaLaCorrupcionYLaReconstruccionLaRepara() throws SQLException {
        long titular = crearContribuyente("S-0003", "60100003");
        movimientos.registrar(alta(titular, Dinero.de(1000)), OBSERVACION);

        corromperElSaldo(titular);

        List<Divergencia> divergencias = reconstruir.conciliar(titular);
        assertThat(divergencias)
                .as("el libro manda: si la proyeccion no coincide, se reporta")
                .singleElement()
                .satisfies(
                        divergencia -> {
                            assertThat(divergencia.segunElLibro()).isEqualTo(Dinero.de(1000));
                            assertThat(divergencia.proyectado()).isEqualTo(Dinero.de(1));
                        });

        reconstruir.deContribuyente(titular);

        assertThat(reconstruir.conciliar(titular))
                .as("reparar es un acto aparte y explicito, y despues de el ya cuadra")
                .isEmpty();
    }

    @Test
    @DisplayName("la conciliacion no repara: reportar y arreglar son dos actos distintos")
    void laConciliacionNoRepara() throws SQLException {
        long titular = crearContribuyente("S-0004", "60100004");
        movimientos.registrar(alta(titular, Dinero.de(500)), OBSERVACION);
        corromperElSaldo(titular);

        reconstruir.conciliar(titular);

        assertThat(saldoDe(titular))
                .as(
                        "una proyeccion que se autocorrige en silencio esconde el defecto que la desalineo")
                .get()
                .extracting(SaldoProyectado::insolutoSaldo)
                .isEqualTo(Dinero.de(1));
    }

    @Test
    @DisplayName("la reconstruccion masiva recorre el padron y es reanudable")
    void laReconstruccionMasivaEsReanudable() throws SQLException {
        long primero = crearContribuyente("S-0010", "60100010");
        long segundo = crearContribuyente("S-0011", "60100011");
        movimientos.registrar(alta(primero, Dinero.de(100)), OBSERVACION);
        movimientos.registrar(alta(segundo, Dinero.de(200)), OBSERVACION);
        corromperElSaldo(primero);
        corromperElSaldo(segundo);

        long ultimo = padron.reconstruir(0L);

        assertThat(ultimo)
                .as("devuelve el ultimo terminado, que es con lo que se reanuda")
                .isGreaterThanOrEqualTo(segundo);
        assertThat(reconstruir.conciliar(primero)).isEmpty();
        assertThat(reconstruir.conciliar(segundo)).isEmpty();
    }

    @Test
    @DisplayName("reanudar desde un identificador no vuelve a tocar lo anterior")
    void reanudarNoVuelveATocarLoAnterior() throws SQLException {
        long anterior = crearContribuyente("S-0020", "60100020");
        long posterior = crearContribuyente("S-0021", "60100021");
        movimientos.registrar(alta(anterior, Dinero.de(100)), OBSERVACION);
        movimientos.registrar(alta(posterior, Dinero.de(200)), OBSERVACION);
        corromperElSaldo(anterior);
        corromperElSaldo(posterior);

        padron.reconstruir(anterior);

        assertThat(reconstruir.conciliar(anterior))
                .as("el que ya estaba terminado no se vuelve a recorrer")
                .isNotEmpty();
        assertThat(reconstruir.conciliar(posterior)).isEmpty();
    }

    // ---------- #24 ----------

    @Test
    @DisplayName("un alta y una baja producen asientos, nunca un UPDATE de deuda existente")
    void unAltaYUnaBajaProducenAsientos() {
        long titular = crearContribuyente("M-0001", "70100001");

        List<Asiento> deAlta = movimientos.registrar(alta(titular, Dinero.de(1000)), OBSERVACION);
        List<Asiento> deBaja = movimientos.registrar(baja(titular, Dinero.de(300)), OBSERVACION);

        assertThat(deAlta).singleElement().extracting(Asiento::id).isNotNull();
        assertThat(deBaja).singleElement().extracting(Asiento::id).isNotNull();
        assertThat(asientosDe(titular)).as("dos filas en el libro, ninguna modificada").hasSize(2);
    }

    @Test
    @DisplayName("la observacion queda en el motivo de cada asiento (regla 10)")
    void laObservacionQuedaEnElMotivo() {
        long titular = crearContribuyente("M-0002", "70100002");

        List<Asiento> guardados =
                movimientos.registrar(
                        new MovimientoDeDeuda(
                                SentidoDelMovimiento.ALTA,
                                clave(titular),
                                Dinero.de(100),
                                Dinero.CERO,
                                Dinero.de(20),
                                Dinero.CERO,
                                Fase.ORDINARIA,
                                FECHA,
                                "RES-2026-0001",
                                null),
                        OBSERVACION);

        assertThat(guardados)
                .hasSize(2)
                .allSatisfy(
                        asiento ->
                                assertThat(asiento.motivo()).isEqualTo("movimiento de la prueba"));
    }

    @Test
    @DisplayName("una baja mayor que la deuda vigente a su fecha se rechaza")
    void unaBajaMayorQueLaDeudaSeRechaza() {
        long titular = crearContribuyente("M-0003", "70100003");
        movimientos.registrar(alta(titular, Dinero.de(500)), OBSERVACION);

        assertThatThrownBy(() -> movimientos.registrar(baja(titular, Dinero.de(501)), OBSERVACION))
                .isInstanceOf(RegistrarMovimientoDeDeuda.BajaMayorQueLaDeuda.class)
                .hasMessageContaining("no puede extinguir mas de lo que hay");
    }

    @Test
    @DisplayName("la baja se compara parte por parte, no solo contra el total")
    void laBajaSeComparaParteAParte() {
        long titular = crearContribuyente("M-0004", "70100004");
        movimientos.registrar(alta(titular, Dinero.de(500)), OBSERVACION);

        // El total de la baja (500) no excede el insoluto vigente (500), pero la parte de
        // interes si: se estaria extinguiendo interes que nunca se asento.
        assertThatThrownBy(
                        () ->
                                movimientos.registrar(
                                        new MovimientoDeDeuda(
                                                SentidoDelMovimiento.BAJA,
                                                clave(titular),
                                                Dinero.de(400),
                                                Dinero.CERO,
                                                Dinero.de(100),
                                                Dinero.CERO,
                                                Fase.ORDINARIA,
                                                FECHA,
                                                "RES-2026-0002",
                                                null),
                                        OBSERVACION))
                .isInstanceOf(RegistrarMovimientoDeDeuda.BajaMayorQueLaDeuda.class)
                .hasMessageContaining("interes");
    }

    @Test
    @DisplayName("una baja rechazada no deja ningun asiento a medias")
    void unaBajaRechazadaNoDejaAsientosAMedias() {
        long titular = crearContribuyente("M-0005", "70100005");
        movimientos.registrar(alta(titular, Dinero.de(500)), OBSERVACION);

        assertThatThrownBy(
                        () ->
                                movimientos.registrar(
                                        new MovimientoDeDeuda(
                                                SentidoDelMovimiento.BAJA,
                                                clave(titular),
                                                Dinero.de(400),
                                                Dinero.CERO,
                                                Dinero.de(100),
                                                Dinero.CERO,
                                                Fase.ORDINARIA,
                                                FECHA,
                                                "RES-2026-0003",
                                                null),
                                        OBSERVACION))
                .isInstanceOf(RegistrarMovimientoDeDeuda.BajaMayorQueLaDeuda.class);

        assertThat(asientosDe(titular))
                .as("o entran todos los asientos del movimiento o no entra ninguno")
                .hasSize(1);
    }

    @Test
    @DisplayName("una baja parcial deja la deuda restante consultable y explicable")
    void unaBajaParcialDejaLaDeudaExplicable() {
        long titular = crearContribuyente("M-0006", "70100006");
        movimientos.registrar(alta(titular, Dinero.de(1000)), OBSERVACION);
        movimientos.registrar(baja(titular, Dinero.de(400)), OBSERVACION);

        assertThat(saldoDe(titular))
                .get()
                .extracting(SaldoProyectado::insolutoSaldo)
                .isEqualTo(Dinero.de(600));
        assertThat(asientosDe(titular))
                .as("la lista de asientos responde «por que debe esto»")
                .hasSize(2)
                .allSatisfy(asiento -> assertThat(asiento.documentoOrigen()).isNotBlank());
    }

    @Test
    @DisplayName("una baja hasta el total deja el saldo en cero, y se admite")
    void unaBajaHastaElTotalSeAdmite() {
        long titular = crearContribuyente("M-0007", "70100007");
        movimientos.registrar(alta(titular, Dinero.de(700)), OBSERVACION);
        movimientos.registrar(baja(titular, Dinero.de(700)), OBSERVACION);

        assertThat(saldoDe(titular))
                .get()
                .extracting(SaldoProyectado::insolutoSaldo)
                .isEqualTo(Dinero.CERO);
    }

    // ------------------------------------------------------------------

    /**
     * Un repositorio no abre transaccion —la abre el caso de uso— y sin ella no hay {@code SET
     * LOCAL}, asi que RLS rechaza la consulta. Aqui se llama al repositorio a proposito, para mirar
     * lo que quedo en la base sin pasar por ningun servicio, y por eso hace falta la transaccion
     * explicita.
     */
    private static <T> T enTransaccion(java.util.function.Supplier<T> lectura) {
        return transaccion.execute(estado -> lectura.get());
    }

    private static java.util.Optional<SaldoProyectado> saldoDe(long titular) {
        return enTransaccion(() -> saldos.buscar(clave(titular)));
    }

    private static List<Asiento> asientosDe(long titular) {
        return enTransaccion(() -> asientos.deLaObligacion(clave(titular)));
    }

    private static ClaveDeSaldo clave(long titular) {
        return new ClaveDeSaldo(titular, "PREDIAL", EJERCICIO, 1, null, null);
    }

    private static MovimientoDeDeuda alta(long titular, Dinero insoluto) {
        return new MovimientoDeDeuda(
                SentidoDelMovimiento.ALTA,
                clave(titular),
                insoluto,
                Dinero.CERO,
                Dinero.CERO,
                Dinero.CERO,
                Fase.ORDINARIA,
                FECHA,
                "RES-2026-0001",
                null);
    }

    private static MovimientoDeDeuda baja(long titular, Dinero insoluto) {
        return new MovimientoDeDeuda(
                SentidoDelMovimiento.BAJA,
                clave(titular),
                insoluto,
                Dinero.CERO,
                Dinero.CERO,
                Dinero.CERO,
                Fase.ORDINARIA,
                FECHA,
                "RES-2026-0002",
                null);
    }

    /** Deja la fila de saldo con una cifra que el libro no respalda. */
    private static void corromperElSaldo(long titular) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "UPDATE saldo_proyectado SET insoluto_saldo = 1"
                                    + " WHERE contribuyente_id = ?")) {
                sentencia.setLong(1, titular);
                sentencia.executeUpdate();
            }
            app.commit();
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

    private static long crearContribuyente(String codigo, String dni) {
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
        } catch (SQLException excepcion) {
            throw new IllegalStateException(excepcion);
        }
    }

    /** No acumula nada: estas pruebas miran el libro y el saldo, no la mora (D-02). */
    private static final class SinAcumulacionDePrueba implements PoliticaDeMora {
        @Override
        public Dinero reajusteAcumulado(
                Dinero insoluto, LocalDate desde, LocalDate hasta, PoliticaDeRedondeo redondeo) {
            return Dinero.CERO;
        }

        @Override
        public Dinero interesAcumulado(
                Dinero insoluto, LocalDate desde, LocalDate hasta, PoliticaDeRedondeo redondeo) {
            return Dinero.CERO;
        }
    }
}
