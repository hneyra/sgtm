package pe.gob.sgtm.cuentacorriente.infraestructura;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.CargadoEnElLibro;
import pe.gob.sgtm.cuentacorriente.CarteraPendiente;
import pe.gob.sgtm.cuentacorriente.RecaudadoEnElLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.CarteraDelLibroCuentaCorriente;
import pe.gob.sgtm.cuentacorriente.aplicacion.RecaudacionDelLibroCuentaCorriente;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * Los agregados que alimentan el panel de recaudacion, contra PostgreSQL de verdad (#56, RF-130).
 *
 * <p>Se conecta como {@code sgtm_app}, no como el superusuario que entrega Testcontainers: un
 * superusuario omite Row Level Security incluso con {@code FORCE ROW LEVEL SECURITY}, y la prueba
 * de aislamiento pasaria en verde sin verificar nada.
 *
 * <h2>Que defiende</h2>
 *
 * <ul>
 *   <li><b>AC 1 — las cifras cuadran con el libro.</b> Lo recaudado es la suma de los abonos vivos,
 *       comparada contra la misma suma hecha en SQL a mano. Un abono reversado no cuenta, y un
 *       abono de un concepto que no es cobranza tampoco.
 *   <li><b>AC 5 — un panel de A no suma un centimo de B.</b> Dos municipalidades sembradas con las
 *       mismas cifras: desde A el agregado no ve nada de B, y no porque la consulta filtre, sino
 *       porque la politica RLS no le deja ver las filas.
 * </ul>
 *
 * <p>Lo que <b>no</b> repite: que {@code sgtm_app} no pueda hacer {@code UPDATE} sobre el libro,
 * que el acceso directo a una particion falle, ni el patron de repositorio. Eso ya lo demuestran
 * {@code AislamientoMultiTenantTest} y {@code AsientoRepositoryJdbcTest} sobre estas mismas tablas.
 */
@DisplayName("#56 — Los agregados del panel contra PostgreSQL")
class CarteraDelLibroJdbcTest {

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final LocalDate HOY = LocalDate.of(2026, 8, 13);
    private static final Instant PROYECTADO = Instant.parse("2026-08-12T03:00:00Z");
    private static final Instant PROYECTADO_HOY = Instant.parse("2026-08-13T09:30:00Z");

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static long titularA;
    private static long titularB;
    private static TransactionTemplate transaccion;
    private static AsientoRepositoryJdbc asientos;
    private static SaldoRepositoryJdbc saldos;
    private static RecaudacionDelLibroCuentaCorriente recaudacion;
    private static CarteraDelLibroCuentaCorriente cartera;
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();

        municipalidadA = crearMunicipalidad("230111", "Municipalidad del panel A");
        municipalidadB = crearMunicipalidad("230112", "Municipalidad del panel B");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        transaccion = new TransactionTemplate(new TenantTransactionManager(pool));
        asientos = new AsientoRepositoryJdbc(jdbc);
        saldos = new SaldoRepositoryJdbc(jdbc);
        recaudacion = new RecaudacionDelLibroCuentaCorriente(asientos);
        cartera = new CarteraDelLibroCuentaCorriente(asientos, saldos);

        OrigenContext.fijar(new Origen("panel.pruebas", null, null));
        titularA = crearContribuyente(municipalidadA, "P-0001", "50111001");
        titularB = crearContribuyente(municipalidadB, "P-0001", "50111002");
        sembrar(municipalidadA, titularA);
        sembrar(municipalidadB, titularB);
        OrigenContext.limpiar();
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------
    //  AC 1 — las cifras cuadran con el libro
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("AC 1 — cuadran con el libro")
    class CuadranConElLibro {

        @Test
        @DisplayName("lo recaudado es exactamente la suma de los abonos vivos del ejercicio")
        void loRecaudadoEsLaSumaDeLosAbonos() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            RecaudadoEnElLibro recaudado =
                    transaccion.execute(
                            estado ->
                                    recaudacion.recaudadoDeTodos(
                                            LocalDate.of(2026, 1, 1),
                                            LocalDate.of(2026, 12, 31),
                                            HOY));

            // La cifra de contraste se calcula con la MISMA definicion, en SQL suelto:
            // abonos de cobranza que nadie ha reversado. Compararla contra una suma
            // escrita a mano en la prueba —«los tres importes que sembre»— no probaria
            // nada del filtro de reversion.
            Dinero segunElLibro = sumaDeAbonosVivos(municipalidadA);

            assertThat(recaudado).isNotNull();
            assertThat(recaudado.total()).isEqualTo(segunElLibro);
            assertThat(recaudado.aLaFecha())
                    .as("y la cifra sale con la fecha con que se pidio (regla 9)")
                    .isEqualTo(HOY);
        }

        @Test
        @DisplayName("un abono reversado no se cuenta: el recibo anulado conserva sus asientos")
        void unAbonoReversadoNoSeCuenta() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            RecaudadoEnElLibro recaudado =
                    transaccion.execute(
                            estado ->
                                    recaudacion.recaudadoDeTodos(
                                            LocalDate.of(2026, 1, 1),
                                            LocalDate.of(2026, 12, 31),
                                            HOY));

            // Se sembraron 500 + 300 de PREDIAL y 120 de ARBITRIOS que despues se
            // reverso. Si el NOT EXISTS faltara, el total incluiria los 120 y ademas
            // la reversion, y la cifra saldria MAS ALTA que lo que entro de verdad.
            assertThat(recaudado.de("ARBITRIOS")).isEqualTo(Dinero.CERO);
            assertThat(recaudado.total()).isEqualTo(Dinero.de("800.00"));
            assertThat(recaudado.abonos()).isEqualTo(2);
        }

        @Test
        @DisplayName("un abono que no es cobranza mueve deuda pero no es dinero que entro")
        void unAbonoQueNoEsCobranzaNoSeCuenta() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            // La CONDONACION sembrada es un abono de 90.00: da de baja deuda, no la
            // cobra. Contarla inflaria la recaudacion con bajas de deuda, que es la peor
            // manera de equivocarse en esta cifra: hacia arriba y sin que nadie lo note.
            RecaudadoEnElLibro recaudado =
                    transaccion.execute(
                            estado ->
                                    recaudacion.recaudadoDeTodos(
                                            LocalDate.of(2026, 1, 1),
                                            LocalDate.of(2026, 12, 31),
                                            HOY));

            assertThat(recaudado.total()).isEqualTo(Dinero.de("800.00"));
        }

        @Test
        @DisplayName("lo cargado es la suma de los cargos de insoluto vivos, agrupada por tributo")
        void loCargadoEsLaSumaDeLosCargos() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            CargadoEnElLibro cargado =
                    transaccion.execute(estado -> cartera.cargadoPorTributo(EJERCICIO, HOY));

            assertThat(cargado).isNotNull();
            assertThat(cargado.total()).isEqualTo(sumaDeCargosVivosDeInsoluto(municipalidadA));
            assertThat(cargado.de("PREDIAL")).isEqualTo(Dinero.de("1000.00"));
            assertThat(cargado.de("ARBITRIOS")).isEqualTo(Dinero.de("400.00"));
            assertThat(cargado.lineas()).hasSize(2);
        }

        @Test
        @DisplayName("el cargo que nace de reversar un abono no es deuda nueva")
        void elCargoDeUnaReversionNoEsDeudaNueva() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            // Lo destapo ejecutando esta misma prueba. `Asiento#reversionDe` produce el
            // asiento CONTRARIO con el mismo concepto, asi que anular el recibo de 120 de
            // ARBITRIOS deja en el libro un CARGO de INSOLUTO de 120. Sin filtrarlo, un
            // tributo con 400 determinados y una anulacion de 120 se publicaba como 520
            // cargados: la emision del ejercicio inflada por cada anulacion, y con ella el
            // denominador de todas las barras del panel.
            CargadoEnElLibro cargado =
                    transaccion.execute(estado -> cartera.cargadoPorTributo(EJERCICIO, HOY));

            assertThat(cargado.de("ARBITRIOS")).isEqualTo(Dinero.de("400.00"));
            assertThat(cargado.lineas())
                    .filteredOn(linea -> linea.tributo().equals("ARBITRIOS"))
                    .singleElement()
                    .satisfies(linea -> assertThat(linea.cargos()).isEqualTo(1));
        }

        @Test
        @DisplayName("el interes y el gasto no son «lo cargado»: no se determinan, se anaden")
        void elInteresYElGastoNoSonLoCargado() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            // Se sembro un cargo de GASTO de 35.00. Si contara, el avance de cobranza
            // bajaria cada vez que corriera el interes, sin que nadie hubiera dejado de
            // pagar.
            CargadoEnElLibro cargado =
                    transaccion.execute(estado -> cartera.cargadoPorTributo(EJERCICIO, HOY));

            assertThat(cargado.total()).isEqualTo(Dinero.de("1400.00"));
        }

        @Test
        @DisplayName("la cartera pendiente sale de la proyeccion, y dice desde cuando")
        void laCarteraSaleDeLaProyeccion() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            CarteraPendiente pendiente =
                    transaccion.execute(estado -> cartera.pendientePorTributo(EJERCICIO, HOY));

            assertThat(pendiente).isNotNull();
            assertThat(pendiente.total()).isEqualTo(Dinero.de("250.00"));
            assertThat(pendiente.obligaciones()).isEqualTo(3);
            // La fecha de la fila MAS VIEJA, no la mas nueva. Una cartera es tan fresca
            // como su peor fila: con la mas nueva, un agregado que arrastra proyecciones
            // de hace una semana se leeria como si estuviera al dia (ADR-0006: es un
            // cache, no la verdad). Las dos filas positivas tienen fechas distintas
            // justamente para que la diferencia se vea.
            assertThat(pendiente.proyectadaDesde()).contains(PROYECTADO);
            assertThat(pendiente.lineas())
                    .filteredOn(linea -> linea.tributo().equals("PREDIAL"))
                    .singleElement()
                    .satisfies(
                            linea -> {
                                assertThat(linea.obligaciones()).isEqualTo(2);
                                assertThat(linea.proyectadoDesde()).isEqualTo(PROYECTADO);
                            });
        }

        @Test
        @DisplayName("un saldo en cero o negativo no es cartera por cobrar")
        void unSaldoEnCeroONegativoNoEsCartera() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));

            // Sembrados: PREDIAL 200 y MULTA_TRANSITO 50 (cuentan), ARBITRIOS 0
            // (cancelado) y ALCABALA -50 (pago en exceso). Restar el negativo taparia con
            // el saldo a favor de uno la deuda de otro.
            CarteraPendiente pendiente =
                    transaccion.execute(estado -> cartera.pendientePorTributo(EJERCICIO, HOY));

            assertThat(pendiente.lineas())
                    .extracting(pe.gob.sgtm.cuentacorriente.PendienteDeUnTributo::tributo)
                    .containsExactly("MULTA_TRANSITO", "PREDIAL");
        }
    }

    // ------------------------------------------------------------------
    //  AC 5 — un panel de A nunca suma un centimo de B
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("AC 5 — el panel de A no suma nada de B")
    class NoSumaNadaDeB {

        @Test
        @DisplayName("lo recaudado de A no incluye lo de B, con las mismas cifras sembradas")
        void loRecaudadoNoSeMezcla() {
            // Las dos municipalidades tienen sembrado exactamente lo mismo. Si la
            // consulta se saliera del tenant, el total de A saldria el doble, y ese
            // doble es indistinguible de una municipalidad que recaudo mas.
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            Dinero deA =
                    transaccion
                            .execute(
                                    estado ->
                                            recaudacion.recaudadoDeTodos(
                                                    LocalDate.of(2026, 1, 1),
                                                    LocalDate.of(2026, 12, 31),
                                                    HOY))
                            .total();

            TenantContext.fijar(new MunicipalidadId(municipalidadB));
            Dinero deB =
                    transaccion
                            .execute(
                                    estado ->
                                            recaudacion.recaudadoDeTodos(
                                                    LocalDate.of(2026, 1, 1),
                                                    LocalDate.of(2026, 12, 31),
                                                    HOY))
                            .total();

            assertThat(deA).isEqualTo(Dinero.de("800.00"));
            assertThat(deB).isEqualTo(Dinero.de("800.00"));
            assertThat(deA.mas(deB))
                    .as("las dos juntas son 1600: cada panel ve 800, no 1600")
                    .isEqualTo(Dinero.de("1600.00"));
        }

        @Test
        @DisplayName("lo cargado y la cartera tampoco")
        void loCargadoYLaCarteraTampoco() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            CargadoEnElLibro cargadoA =
                    transaccion.execute(estado -> cartera.cargadoPorTributo(EJERCICIO, HOY));
            CarteraPendiente pendienteA =
                    transaccion.execute(estado -> cartera.pendientePorTributo(EJERCICIO, HOY));

            assertThat(cargadoA.total()).isEqualTo(Dinero.de("1400.00"));
            assertThat(pendienteA.total()).isEqualTo(Dinero.de("250.00"));
            assertThat(pendienteA.obligaciones()).isEqualTo(3);
            assertThat(cargadoA.lineas()).hasSize(2);
            assertThat(pendienteA.lineas()).hasSize(2);
        }

        @Test
        @DisplayName("y el aislamiento lo pone la politica, no el superusuario que lo omite")
        void elSuperusuarioVeLasDos() throws SQLException {
            // La misma demostracion que exige AislamientoMultiTenantTest: con el mismo
            // contexto fijado, el superusuario ve las dos municipalidades y sgtm_app una.
            // Sin esto, esta clase entera podria estar pasando en verde sin verificar
            // nada del aislamiento.
            try (Connection admin = base.conexionAdmin();
                    PreparedStatement sentencia =
                            admin.prepareStatement(
                                    "SELECT count(DISTINCT municipalidad_id)"
                                            + " FROM cuenta_corriente_asiento"
                                            + " WHERE tributo = 'PREDIAL'")) {
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    assertThat(fila.getLong(1)).isEqualTo(2);
                }
            }

            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            Long municipalidades =
                    transaccion.execute(
                            estado ->
                                    jdbc.sql(
                                                    "SELECT count(DISTINCT municipalidad_id)"
                                                            + " FROM cuenta_corriente_asiento"
                                                            + " WHERE tributo = 'PREDIAL'")
                                            .query(Long.class)
                                            .single());
            assertThat(municipalidades).isEqualTo(1);
        }
    }

    // ------------------------------------------------------------------
    //  Siembra
    // ------------------------------------------------------------------

    /**
     * El mismo libro en las dos municipalidades: es lo que hace que una fuga se vea.
     *
     * <p>Cargos: 1000 de PREDIAL y 400 de ARBITRIOS de insoluto, mas 35 de GASTO que no es «lo
     * cargado». Abonos: 500 + 300 de cobranza, 120 reversado y 90 de condonacion.
     */
    private static void sembrar(long municipalidadId, long titular) {
        TenantContext.fijar(new MunicipalidadId(municipalidadId));
        transaccion.executeWithoutResult(
                estado -> {
                    asientos.registrar(
                            asiento(
                                    titular,
                                    "PREDIAL",
                                    Concepto.INSOLUTO,
                                    TipoAsiento.CARGO,
                                    "1000.00",
                                    LocalDate.of(2026, 1, 15)));
                    asientos.registrar(
                            asiento(
                                    titular,
                                    "ARBITRIOS",
                                    Concepto.INSOLUTO,
                                    TipoAsiento.CARGO,
                                    "400.00",
                                    LocalDate.of(2026, 1, 15)));
                    asientos.registrar(
                            asiento(
                                    titular,
                                    "PREDIAL",
                                    Concepto.GASTO,
                                    TipoAsiento.CARGO,
                                    "35.00",
                                    LocalDate.of(2026, 5, 2)));

                    asientos.registrar(
                            asiento(
                                    titular,
                                    "PREDIAL",
                                    Concepto.INSOLUTO,
                                    TipoAsiento.ABONO,
                                    "500.00",
                                    LocalDate.of(2026, 3, 10)));
                    asientos.registrar(
                            asiento(
                                    titular,
                                    "PREDIAL",
                                    Concepto.INSOLUTO,
                                    TipoAsiento.ABONO,
                                    "300.00",
                                    LocalDate.of(2026, 7, 4)));

                    Asiento anulado =
                            asientos.registrar(
                                    asiento(
                                            titular,
                                            "ARBITRIOS",
                                            Concepto.INSOLUTO,
                                            TipoAsiento.ABONO,
                                            "120.00",
                                            LocalDate.of(2026, 4, 1)));
                    asientos.registrar(
                            Asiento.reversionDe(
                                    anulado,
                                    LocalDate.of(2026, 4, 20),
                                    "AN-2026-0001",
                                    "recibo anulado en la prueba"));

                    asientos.registrar(
                            Asiento.nuevoConMotivo(
                                    EJERCICIO,
                                    titular,
                                    "PREDIAL",
                                    Concepto.CONDONACION,
                                    TipoAsiento.ABONO,
                                    Fase.ORDINARIA,
                                    1,
                                    null,
                                    null,
                                    null,
                                    Dinero.de("90.00"),
                                    LocalDate.of(2026, 6, 1),
                                    "CD-2026-0001",
                                    "condonacion de la prueba"));

                    // El PREDIAL lleva DOS cuotas proyectadas en dias distintos: es lo
                    // que hace visible que la fecha del grupo sea la mas vieja y no la mas
                    // nueva. Con una sola fila por tributo, min y max dan lo mismo y la
                    // comprobacion no probaria nada.
                    saldos.proyectar(saldo(titular, "PREDIAL", 1, "150.00", PROYECTADO));
                    saldos.proyectar(saldo(titular, "PREDIAL", 2, "50.00", PROYECTADO_HOY));
                    saldos.proyectar(saldo(titular, "MULTA_TRANSITO", 1, "50.00", PROYECTADO_HOY));
                    saldos.proyectar(saldo(titular, "ARBITRIOS", 1, "0.00", PROYECTADO));
                    saldos.proyectar(saldo(titular, "ALCABALA", 1, "-50.00", PROYECTADO));
                });
        TenantContext.limpiar();
    }

    private static Asiento asiento(
            long titular,
            String tributo,
            Concepto concepto,
            TipoAsiento tipo,
            String monto,
            LocalDate fechaValor) {
        return Asiento.nuevo(
                        EJERCICIO,
                        titular,
                        tributo,
                        concepto,
                        tipo,
                        Fase.ORDINARIA,
                        1,
                        null,
                        null,
                        null,
                        Dinero.de(monto),
                        fechaValor,
                        "EM-2026-0001")
                .conMotivo("siembra del panel");
    }

    private static SaldoProyectado saldo(
            long titular, String tributo, int periodo, String importe, Instant proyectadoEn) {
        return new SaldoProyectado(
                new ClaveDeSaldo(titular, tributo, EJERCICIO, periodo, null, null),
                Dinero.de(importe),
                Fase.ORDINARIA,
                null,
                proyectadoEn);
    }

    // ------------------------------------------------------------------
    //  Las cifras de contraste, en SQL suelto y con la misma definicion
    // ------------------------------------------------------------------

    private static Dinero sumaDeAbonosVivos(long municipalidadId) {
        return sumaComoAdmin(
                municipalidadId,
                "tipo = 'ABONO'"
                        + " AND concepto IN ('INSOLUTO','REAJUSTE','INTERES','GASTO')"
                        + " AND fecha_valor BETWEEN DATE '2026-01-01' AND DATE '2026-12-31'");
    }

    private static Dinero sumaDeCargosVivosDeInsoluto(long municipalidadId) {
        return sumaComoAdmin(
                municipalidadId,
                "tipo = 'CARGO' AND concepto = 'INSOLUTO' AND asiento_reversado_id IS NULL");
    }

    /**
     * La suma de contraste, hecha <b>como superusuario</b> y filtrando por municipalidad a mano.
     *
     * <p>Es deliberado que no pase por RLS: si las dos cifras salieran del mismo camino, comparar
     * la una con la otra no diria nada. Esta es «lo que hay en la tabla»; la otra es «lo que el
     * agregado devuelve».
     */
    private static Dinero sumaComoAdmin(long municipalidadId, String condicion) {
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT COALESCE(sum(a.monto), 0) FROM cuenta_corriente_asiento a"
                                        + " WHERE a.municipalidad_id = ?"
                                        + "   AND a.ejercicio = 2026"
                                        + "   AND "
                                        + condicion
                                        + "   AND NOT EXISTS ("
                                        + "     SELECT 1 FROM cuenta_corriente_asiento r"
                                        + "      WHERE r.municipalidad_id = a.municipalidad_id"
                                        + "        AND r.asiento_reversado_id = a.id)")) {
            sentencia.setLong(1, municipalidadId);
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                return new Dinero(fila.getBigDecimal(1));
            }
        } catch (SQLException excepcion) {
            throw new IllegalStateException(excepcion);
        }
    }

    // ------------------------------------------------------------------

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

    private static long crearContribuyente(long municipalidadId, String codigo, String dni) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadId);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PANEL',"
                                    + " 'siembra') RETURNING id")) {
                sentencia.setLong(1, municipalidadId);
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
}
