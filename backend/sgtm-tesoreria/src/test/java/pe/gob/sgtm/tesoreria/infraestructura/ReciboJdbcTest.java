package pe.gob.sgtm.tesoreria.infraestructura;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.jspecify.annotations.Nullable;
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
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.RegistroDeAbonos;
import pe.gob.sgtm.cuentacorriente.SeleccionDeObligacion;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarAsiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistroDeAbonosCuentaCorriente;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SinAcumulacion;
import pe.gob.sgtm.documentos.FormatoDeDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.tesoreria.aplicacion.AbrirCaja;
import pe.gob.sgtm.tesoreria.aplicacion.AnularRecibo;
import pe.gob.sgtm.tesoreria.aplicacion.CobrarDeuda;
import pe.gob.sgtm.tesoreria.aplicacion.DuplicadoDeRecibo;
import pe.gob.sgtm.tesoreria.dobles.SinConvenios;
import pe.gob.sgtm.tesoreria.dominio.FormaDePago;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeReciboRepository;
import pe.gob.sgtm.tesoreria.dominio.Recibo;
import pe.gob.sgtm.tesoreria.dominio.TipoDePago;

/**
 * #34 — El duplicado y la anulacion contra PostgreSQL de verdad, como {@code sgtm_app}.
 *
 * <p>Lo que esta clase defiende y ninguna prueba con dobles puede:
 *
 * <ul>
 *   <li><b>El ciclo completo</b> (AC central). Se cobra de verdad, se anula, y se vuelve a
 *       preguntar {@code deudaActualizadaA(hoy)} al libro real: la deuda esta pendiente otra vez,
 *       el libro conserva los dos asientos y el recibo sigue con su numero. Contra un doble esto
 *       solo probaria que el doble repone lo que le quitaron.
 *   <li><b>La doble anulacion</b>, con <b>hilos de verdad</b>. La barrera es {@code
 *       recibo_movimiento_anulacion_uq}; sin el, diez peticiones simultaneas reversarian diez veces
 *       y el contribuyente acabaria debiendo diez veces lo que pago.
 *   <li><b>Los {@code CHECK}</b>, por SQL directo: un motivo en blanco y una anulacion sin importe
 *       no dependen de que la aplicacion los mire.
 *   <li><b>Que {@code sgtm_app} no pueda editar ni borrar un movimiento</b>. No es una convencion:
 *       son los privilegios que V30 concede, y se comprueba intentandolo.
 *   <li><b>El aislamiento</b>: con el contexto de B, la anulacion de A no existe.
 * </ul>
 */
@DisplayName("#34 — Duplicado y anulacion contra PostgreSQL")
class ReciboJdbcTest {

    private static final LocalDate PAGO = LocalDate.of(2026, 3, 16);

    /** El libro se particiona por ejercicio y V2 solo declara 2026 y 2027. */
    private static final Ejercicio EJERCICIO_DEUDA = new Ejercicio(2026);

    private static final Clock RELOJ = relojDe(PAGO);

    private static Clock relojDe(LocalDate dia) {
        return Clock.fixed(dia.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
    }

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long otraMunicipalidad;
    private static long areaId;
    private static JdbcClient jdbc;
    private static TransactionTemplate transaccion;
    private static TenantTransactionManager gestor;

    private static ReciboRepositoryJdbc recibos;
    private static MovimientoDeReciboRepositoryJdbc movimientos;
    private static TurnoDeCajaRepositoryJdbc turnos;
    private static RegistrarAsiento registrarAsiento;
    private static RegistroDeAbonos abonos;
    private static CobrarDeuda cobrarDeuda;
    private static GeneradorDeDocumentos generador;
    private static DirectorioDeContribuyentes padron;

    private static final AtomicInteger CONTADOR = new AtomicInteger();

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("240301", "Municipalidad de los recibos");
        otraMunicipalidad = crearMunicipalidad("240302", "Municipalidad vecina de #34");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        CajaRepositoryJdbc cajas = new CajaRepositoryJdbc(jdbc);
        recibos = new ReciboRepositoryJdbc(jdbc);
        movimientos = new MovimientoDeReciboRepositoryJdbc(jdbc);
        turnos = new TurnoDeCajaRepositoryJdbc(jdbc);

        Auditoria auditoria = new AuditoriaJdbc(jdbc, RELOJ);
        AsientoRepositoryJdbc asientos = new AsientoRepositoryJdbc(jdbc);
        SaldoRepositoryJdbc saldos = new SaldoRepositoryJdbc(jdbc);
        registrarAsiento = new RegistrarAsiento(asientos, saldos, auditoria, RELOJ);
        CalculoDeDeuda calculo = new CalculoDeDeuda(new SinAcumulacion());
        PoliticaDeRedondeo redondeo = new PoliticaDeRedondeo(2, java.math.RoundingMode.HALF_UP);
        abonos =
                envolver(
                        new RegistroDeAbonosCuentaCorriente(
                                asientos, saldos, envolver(registrarAsiento), calculo, redondeo));

        AbrirCaja abrirCaja = envolver(new AbrirCaja(cajas, turnos, auditoria, RELOJ));
        cobrarDeuda =
                envolver(
                        new CobrarDeuda(
                                abrirCaja,
                                abonos,
                                recibos,
                                SinConvenios.formalizador(RELOJ),
                                auditoria,
                                RELOJ));

        generador =
                new GeneradorDeDocumentos(
                        List.of(
                                new RenderizadorPdf(),
                                new RenderizadorXls(),
                                new RenderizadorRtf()),
                        RegimenDeLaInstalacion.REAL);
        padron = new PadronDeLaPrueba();

        areaId = crearArea(municipalidad, "A-34");
        crearCaja(municipalidad, "C-34", "R34", areaId);
        crearArea(otraMunicipalidad, "A-34");
        crearCaja(otraMunicipalidad, "C-34", "R34", null);
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
    }

    private static AnularRecibo anularEl(LocalDate dia) {
        return envolver(
                new AnularRecibo(
                        recibos,
                        movimientos,
                        turnos,
                        abonos,
                        new AuditoriaJdbc(jdbc, relojDe(dia)),
                        relojDe(dia)));
    }

    private static DuplicadoDeRecibo duplicadosEl(LocalDate dia) {
        return envolver(
                new DuplicadoDeRecibo(
                        recibos,
                        movimientos,
                        padron,
                        generador,
                        new AuditoriaJdbc(jdbc, relojDe(dia)),
                        relojDe(dia)));
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
        OrigenContext.fijar(new Origen("cajero.prueba", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------

    @Nested
    @DisplayName("AC central — Cobrar, anular, y que la deuda vuelva")
    class DelCicloCompleto {

        @Test
        @DisplayName("tras anular, deudaActualizadaA(hoy) vuelve a mostrar la deuda pendiente")
        void laDeudaVuelveAEstarPendiente() {
            long contribuyente = contribuyenteConDeuda("CICLO-1", Dinero.de("300.00"));
            assertThat(deudaHoy(contribuyente)).isEqualTo(Dinero.de("300.00"));

            Recibo cobrado = cobrar(contribuyente);
            assertThat(deudaHoy(contribuyente))
                    .as("cobrada, la deuda queda en cero")
                    .isEqualTo(Dinero.CERO);

            AnularRecibo.Anulado anulado = anular(cobrado, PAGO);

            assertThat(deudaHoy(contribuyente))
                    .as("y anulada, vuelve a estar pendiente: el libro netea, nadie la reescribe")
                    .isEqualTo(Dinero.de("300.00"));
            assertThat(anulado.asientosReversados())
                    .as("un asiento reversado: el abono del insoluto")
                    .isPositive();
        }

        @Test
        @DisplayName("el libro conserva los dos asientos: el abono y su reverso")
        void elLibroConservaLosDos() {
            long contribuyente = contribuyenteConDeuda("CICLO-2", Dinero.de("150.00"));
            Recibo cobrado = cobrar(contribuyente);
            long antes = contarAsientos(contribuyente);

            anular(cobrado, PAGO);

            assertThat(contarAsientos(contribuyente))
                    .as("reversar AGREGA: nunca se borra ni se edita una fila del libro")
                    .isGreaterThan(antes);
            assertThat(asientosCon("ANULACION " + cobrado.numero().impreso()))
                    .as("y el reverso se marca con su propio documento, no con el del recibo")
                    .isPositive();
            assertThat(reversionesDe(contribuyente))
                    .as("cada reverso apunta al asiento que corrige")
                    .isPositive();
        }

        @Test
        @DisplayName("el recibo sigue intacto, con su numero y su desglose")
        void elReciboSigueIntacto() {
            long contribuyente = contribuyenteConDeuda("CICLO-3", Dinero.de("88.00"));
            Recibo cobrado = cobrar(contribuyente);

            anular(cobrado, PAGO);

            Recibo leido = enTransaccion(() -> recibos.porNumero(cobrado.numero())).orElseThrow();
            assertThat(leido.numero()).isEqualTo(cobrado.numero());
            assertThat(leido.total()).isEqualTo(Dinero.de("88.00"));
            assertThat(leido.actualizadoA()).isEqualTo(PAGO);
            assertThat(leido.lineas()).hasSize(1);
        }

        @Test
        @DisplayName("el estado ANULADO se deriva del movimiento: el recibo no lo guarda")
        void elEstadoSeDeriva() {
            long contribuyente = contribuyenteConDeuda("CICLO-4", Dinero.de("55.00"));
            Recibo cobrado = cobrar(contribuyente);
            long reciboId = cobrado.id();

            assertThat(enTransaccion(() -> movimientos.anulacionDe(reciboId))).isEmpty();
            anular(cobrado, PAGO);

            MovimientoDeRecibo anulacion =
                    enTransaccion(() -> movimientos.anulacionDe(reciboId)).orElseThrow();
            assertThat(anulacion.motivoDeLaAnulacion()).isEqualTo("ERROR EN EL IMPORTE");
            assertThat(anulacion.usuarioRegistro()).isEqualTo("cajero.prueba");
            assertThat(anulacion.importeReversado()).isEqualTo(Dinero.de("55.00"));
            assertThat(columnasDeRecibo())
                    .as("V30 retiro las columnas de V3: decian EMITIDO para siempre")
                    .doesNotContain(
                            "estado", "fecha_anulacion", "usuario_anulacion", "motivo_anulacion");
        }
    }

    @Nested
    @DisplayName("Solo el mismo dia, y solo una vez")
    class DeLosLimites {

        @Test
        @DisplayName("un recibo de ayer no se anula")
        void elReciboDeAyerNoSeAnula() {
            long contribuyente = contribuyenteConDeuda("AYER-1", Dinero.de("70.00"));
            Recibo cobrado = cobrar(contribuyente);

            assertThatThrownBy(() -> anular(cobrado, PAGO.plusDays(1)))
                    .isInstanceOf(AnularRecibo.FueraDelDiaDePago.class)
                    .hasMessageContaining("mismo dia del pago");
            assertThat(deudaHoy(contribuyente))
                    .as("y nada se reverso: el pago sigue asentado")
                    .isEqualTo(Dinero.CERO);
        }

        @Test
        @DisplayName("con DIEZ hilos anulando el mismo recibo, solo uno lo consigue")
        @SuppressWarnings("checkstyle:IllegalCatch")
        void diezAnulacionesSimultaneasProducenUna() throws Exception {
            long contribuyente = contribuyenteConDeuda("CONC-1", Dinero.de("500.00"));
            Recibo cobrado = cobrar(contribuyente);

            int hilos = 10;
            CountDownLatch salida = new CountDownLatch(1);
            List<Callable<Boolean>> tareas = new ArrayList<>();
            for (int i = 0; i < hilos; i++) {
                String quien = "cajero." + i;
                tareas.add(
                        () -> {
                            TenantContext.fijar(new MunicipalidadId(municipalidad));
                            OrigenContext.fijar(new Origen(quien, null, null));
                            salida.await(10, TimeUnit.SECONDS);
                            try {
                                anular(cobrado, PAGO);
                                return true;
                            } catch (RuntimeException rechazada) {
                                // Se captura lo ancho a proposito: lo que se mide es
                                // cuantas ganan, y las nueve que pierden pueden hacerlo
                                // por el indice unico o por el aborto de su transaccion.
                                // Distinguirlas aqui probaria menos, no mas.
                                return false;
                            }
                        });
            }

            ExecutorService ejecutor = Executors.newFixedThreadPool(hilos);
            int anuladas = 0;
            try {
                List<Future<Boolean>> futuros = new ArrayList<>();
                for (Callable<Boolean> tarea : tareas) {
                    futuros.add(ejecutor.submit(tarea));
                }
                salida.countDown();
                for (Future<Boolean> futuro : futuros) {
                    if (Boolean.TRUE.equals(futuro.get(60, TimeUnit.SECONDS))) {
                        anuladas++;
                    }
                }
            } finally {
                ejecutor.shutdownNow();
            }

            assertThat(anuladas).as("recibo_movimiento_anulacion_uq: una sola gana").isEqualTo(1);
            assertThat(anulacionesDe(cobrado.id())).isEqualTo(1);
            assertThat(deudaHoy(contribuyente))
                    .as("diez reversiones dejarian al contribuyente debiendo diez veces lo pagado")
                    .isEqualTo(Dinero.de("500.00"));
        }

        @Test
        @DisplayName("anular dos veces seguidas: la segunda dice que ya estaba anulado")
        void laSegundaAnulacionSeRechaza() {
            long contribuyente = contribuyenteConDeuda("DOBLE-A", Dinero.de("60.00"));
            Recibo cobrado = cobrar(contribuyente);
            anular(cobrado, PAGO);

            assertThatThrownBy(() -> anular(cobrado, PAGO))
                    .isInstanceOf(MovimientoDeReciboRepository.ReciboYaAnulado.class);
            assertThat(anulacionesDe(cobrado.id())).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("Lo que la base impide por si sola")
    class DeLaBase {

        @Test
        @DisplayName("un motivo en blanco muere en el CHECK, aunque se inserte a mano")
        void elMotivoEnBlancoMuereEnElCheck() {
            long contribuyente = contribuyenteConDeuda("CHK-1", Dinero.de("10.00"));
            Recibo cobrado = cobrar(contribuyente);

            assertThatThrownBy(() -> insertarMovimiento(cobrado, "ANULACION", "   ", CIEN))
                    .as("espacios no son un motivo: btrim lo dice")
                    .hasStackTraceContaining("recibo_movimiento_anulacion_ck");
        }

        @Test
        @DisplayName("una anulacion sin importe tampoco pasa: el arqueo no sabria que restar")
        void laAnulacionSinImporteNoPasa() {
            long contribuyente = contribuyenteConDeuda("CHK-2", Dinero.de("10.00"));
            Recibo cobrado = cobrar(contribuyente);

            assertThatThrownBy(
                            () ->
                                    insertarMovimiento(
                                            cobrado, "ANULACION", "ERROR EN EL IMPORTE", null))
                    .hasStackTraceContaining("recibo_movimiento_anulacion_ck");
        }

        @Test
        @DisplayName("un duplicado sin resumen tampoco: la reimpresion no se podria comprobar")
        void elDuplicadoSinResumenNoPasa() {
            long contribuyente = contribuyenteConDeuda("CHK-3", Dinero.de("10.00"));
            Recibo cobrado = cobrar(contribuyente);

            assertThatThrownBy(() -> insertarMovimiento(cobrado, "DUPLICADO", null, null))
                    .hasStackTraceContaining("recibo_movimiento_duplicado_ck");
        }

        @Test
        @DisplayName("sgtm_app no puede actualizar un movimiento (V30)")
        void noSePuedeActualizarUnMovimiento() {
            long contribuyente = contribuyenteConDeuda("PRIV-1", Dinero.de("10.00"));
            Recibo cobrado = cobrar(contribuyente);
            MovimientoDeRecibo anulacion = anular(cobrado, PAGO).anulacion();

            assertThat(
                            sqlStateAlIntentar(
                                    () ->
                                            jdbc.sql(
                                                            "UPDATE recibo_movimiento"
                                                                    + " SET motivo = 'otro'"
                                                                    + " WHERE id = :id")
                                                    .param("id", anulacion.id())
                                                    .update()))
                    .as(
                            "una anulacion por error se corrige con otro acto, no reescribiendo el acta")
                    .isEqualTo(PRIVILEGIO_INSUFICIENTE);
        }

        @Test
        @DisplayName("ni borrarlo: un recibo que estuvo anulado tiene que decirlo siempre")
        void noSePuedeBorrarUnMovimiento() {
            long contribuyente = contribuyenteConDeuda("PRIV-2", Dinero.de("10.00"));
            Recibo cobrado = cobrar(contribuyente);
            MovimientoDeRecibo anulacion = anular(cobrado, PAGO).anulacion();

            assertThat(
                            sqlStateAlIntentar(
                                    () ->
                                            jdbc.sql(
                                                            "DELETE FROM recibo_movimiento"
                                                                    + " WHERE id = :id")
                                                    .param("id", anulacion.id())
                                                    .update()))
                    .isEqualTo(PRIVILEGIO_INSUFICIENTE);
        }

        @Test
        @DisplayName("desde B, la anulacion de A no existe")
        void desdeBLaAnulacionDeANoExiste() {
            long contribuyente = contribuyenteConDeuda("RLS-34", Dinero.de("40.00"));
            Recibo cobrado = cobrar(contribuyente);
            anular(cobrado, PAGO);
            long reciboId = cobrado.id();

            // El contexto se fija ANTES de abrir la transaccion: el SET LOCAL lo emite el
            // gestor al abrirla, asi que fijarlo solo dentro del callback llegaria tarde y
            // la consulta correria con el tenant anterior -que es como esta prueba paso en
            // verde la primera vez, sin verificar nada-.
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));
            Optional<MovimientoDeRecibo> desdeB =
                    transaccion.execute(
                            estado -> {
                                TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));
                                return movimientos.anulacionDe(reciboId);
                            });

            assertThat(desdeB)
                    .as("la politica RLS de recibo_movimiento no deja ver la fila de A")
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("El duplicado, contra la base")
    class DelDuplicado {

        @Test
        @DisplayName("meses despues y con el libro movido, el papel sale igual")
        void mesesDespuesSaleIgual() {
            long contribuyente = contribuyenteConDeuda("DUP-1", Dinero.de("210.00"));
            Recibo cobrado = cobrar(contribuyente);

            byte[] enMarzo = duplicado(cobrado, PAGO).contenido();

            // Seis meses despues, y con el libro movido de verdad: otra determinacion sobre
            // la misma obligacion. El papel no puede enterarse.
            asentarCargo(contribuyente, Dinero.de("777.77"), PAGO.plusMonths(6));
            byte[] enSetiembre = duplicado(cobrado, PAGO.plusMonths(6)).contenido();

            assertThat(texto(enSetiembre)).contains("210.00").doesNotContain("777.77");
            // Las dos lineas de fecha del papel, enteras y no como subcadena suelta: el
            // instante de emision tambien contiene «2026-03-16», asi que buscar solo eso
            // deja pasar un aLaFecha resuelto con el reloj de la reimpresion —que es
            // exactamente lo que una rotura de prueba destapo aqui—.
            assertThat(texto(enSetiembre))
                    .as("la fecha del papel es la del cobro, no la de la reimpresion (regla 9)")
                    .contains("Datos al " + PAGO)
                    .contains("Importes actualizados al " + PAGO);
            assertThat(sinLaMarca(enSetiembre))
                    .as("todo lo demas, byte a byte igual")
                    .isEqualTo(sinLaMarca(enMarzo));
        }

        @Test
        @DisplayName("cada reimpresion se numera y queda registrada con quien la genero")
        void cadaReimpresionQuedaRegistrada() {
            long contribuyente = contribuyenteConDeuda("DUP-2", Dinero.de("35.00"));
            Recibo cobrado = cobrar(contribuyente);

            assertThat(duplicado(cobrado, PAGO).cual()).isEqualTo(1);
            assertThat(duplicado(cobrado, PAGO).cual()).isEqualTo(2);

            List<MovimientoDeRecibo> registrados =
                    enTransaccion(() -> movimientos.deRecibo(cobrado.id()));
            assertThat(registrados).hasSize(2);
            assertThat(registrados.get(0).usuarioRegistro()).isEqualTo("cajero.prueba");
            assertThat(enTransaccion(() -> movimientos.duplicadosDe(cobrado.id()))).isEqualTo(2);
        }

        @Test
        @DisplayName("el duplicado de un recibo anulado lo dice en el papel")
        void elDuplicadoDeUnAnuladoLoDice() {
            long contribuyente = contribuyenteConDeuda("DUP-3", Dinero.de("25.00"));
            Recibo cobrado = cobrar(contribuyente);
            anular(cobrado, PAGO);

            assertThat(texto(duplicado(cobrado, PAGO).contenido()))
                    .contains("RECIBO ANULADO")
                    .contains("ERROR EN EL IMPORTE");
        }

        @Test
        @DisplayName("la vista previa devuelve el estado sin emitir nada")
        void laVistaPreviaNoEmite() {
            long contribuyente = contribuyenteConDeuda("DUP-4", Dinero.de("15.00"));
            Recibo cobrado = cobrar(contribuyente);
            anular(cobrado, PAGO);

            DuplicadoDeRecibo.Consultado visto =
                    duplicadosEl(PAGO).consultar(cobrado.numero()).orElseThrow();

            assertThat(visto.estaAnulado()).isTrue();
            assertThat(visto.duplicados()).isZero();
            assertThat(enTransaccion(() -> movimientos.duplicadosDe(cobrado.id()))).isZero();
        }
    }

    // ------------------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------------------

    private static final BigDecimal CIEN = new BigDecimal("100.00");

    /** {@code insufficient_privilege}: el SQLSTATE de un {@code REVOKE} que muerde. */
    private static final String PRIVILEGIO_INSUFICIENTE = "42501";

    private static Recibo cobrar(long contribuyenteId) {
        return cobrarDeuda.cobrar(
                new CobrarDeuda.Cobranza(
                        "C-34",
                        "cajero.prueba",
                        contribuyenteId,
                        List.of(new SeleccionDeObligacion("PREDIAL", EJERCICIO_DEUDA, null, null)),
                        FormaDePago.EFECTIVO,
                        TipoDePago.NORMAL,
                        null,
                        PAGO,
                        null,
                        null),
                Observacion.de("Cobranza en ventanilla, prueba de #34"));
    }

    private static AnularRecibo.Anulado anular(Recibo recibo, LocalDate dia) {
        return anularEl(dia)
                .anular(
                        new AnularRecibo.Anulacion(
                                recibo.numero(),
                                "ERROR EN EL IMPORTE",
                                "RESPONSABLE DE TESORERIA",
                                "MEMO-2026-034"),
                        Observacion.de("Se cobro de mas por error del cajero"));
    }

    private static DuplicadoDeRecibo.Duplicado duplicado(Recibo recibo, LocalDate dia) {
        return duplicadosEl(dia)
                .imprimir(
                        recibo.numero(),
                        FormatoDeDocumento.PDF,
                        Observacion.de("Duplicado pedido por el contribuyente"));
    }

    /** El PDF como texto, en la codificacion que declara su fuente ({@code /WinAnsiEncoding}). */
    private static String texto(byte[] documento) {
        return new String(documento, Charset.forName("windows-1252"));
    }

    /**
     * El documento sin la marca de duplicado, para poder comparar dos reimpresiones.
     *
     * <p>La marca cambia entre la primera y la segunda —{@code N.° 1} y {@code N.° 2}— y tiene que
     * cambiar. Lo que no puede cambiar es nada mas.
     */
    private static String sinLaMarca(byte[] documento) {
        return texto(documento)
                .replaceAll("DUPLICADO N[^\\n)]*", "DUPLICADO")
                .replaceAll("/Length [0-9]+", "/Length")
                .replaceAll("(?s)xref.*", "");
    }

    @SuppressWarnings("checkstyle:IllegalCatch")
    private static @Nullable String sqlStateAlIntentar(Runnable sentencia) {
        try {
            enTransaccion(
                    () -> {
                        sentencia.run();
                        return null;
                    });
            return null;
        } catch (RuntimeException rechazo) {
            for (Throwable causa = rechazo; causa != null; causa = causa.getCause()) {
                if (causa instanceof SQLException sql) {
                    return sql.getSQLState();
                }
            }
            throw rechazo;
        }
    }

    private static void insertarMovimiento(
            Recibo recibo, String tipo, @Nullable String motivo, @Nullable BigDecimal importe) {
        enTransaccion(
                () ->
                        jdbc.sql(
                                        "INSERT INTO recibo_movimiento (municipalidad_id,"
                                                + " recibo_id, tipo, fecha, caja_id, turno_id,"
                                                + " motivo, importe, usuario_registro, observacion)"
                                                + " VALUES (:muni, :recibo, :tipo, :fecha, :caja,"
                                                + "  :turno, :motivo, :importe, 'prueba',"
                                                + "  'insercion directa de la prueba')")
                                .param("muni", municipalidad)
                                .param("recibo", recibo.id())
                                .param("tipo", tipo)
                                .param("fecha", PAGO)
                                .param("caja", recibo.cajaId())
                                .param("turno", recibo.turnoId())
                                .param("motivo", motivo)
                                .param("importe", importe)
                                .update());
    }

    private static <T> T enTransaccion(java.util.function.Supplier<T> accion) {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        return transaccion.execute(
                estado -> {
                    TenantContext.fijar(new MunicipalidadId(municipalidad));
                    return accion.get();
                });
    }

    private static long contribuyenteConDeuda(String sufijo, Dinero monto) {
        long id = crearContribuyente(municipalidad, sufijo);
        asentarCargo(id, monto, LocalDate.of(2026, 1, 2));
        return id;
    }

    private static void asentarCargo(long contribuyenteId, Dinero monto, LocalDate fecha) {
        enTransaccion(
                () ->
                        registrarAsiento.asentar(
                                Asiento.nuevo(
                                        EJERCICIO_DEUDA,
                                        contribuyenteId,
                                        "PREDIAL",
                                        Concepto.INSOLUTO,
                                        TipoAsiento.CARGO,
                                        Fase.ORDINARIA,
                                        null,
                                        null,
                                        null,
                                        null,
                                        monto,
                                        fecha,
                                        "DETERMINACION DE LA PRUEBA"),
                                Observacion.de("Se asienta la deuda de la prueba")));
    }

    private static Dinero deudaHoy(long contribuyenteId) {
        return enTransaccion(
                () -> {
                    CalculoDeDeuda calculo = new CalculoDeDeuda(new SinAcumulacion());
                    List<Asiento> asientos =
                            new AsientoRepositoryJdbc(jdbc)
                                    .deLaObligacion(
                                            new pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo(
                                                    contribuyenteId,
                                                    "PREDIAL",
                                                    EJERCICIO_DEUDA,
                                                    0,
                                                    null,
                                                    null));
                    return calculo.deudaActualizadaA(
                                    asientos,
                                    PAGO,
                                    new PoliticaDeRedondeo(2, java.math.RoundingMode.HALF_UP))
                            .total();
                });
    }

    private static long contarAsientos(long contribuyenteId) {
        return enTransaccion(
                () ->
                        jdbc.sql(
                                        "SELECT count(*) FROM cuenta_corriente_asiento"
                                                + " WHERE contribuyente_id = :c")
                                .param("c", contribuyenteId)
                                .query(Long.class)
                                .single());
    }

    private static long reversionesDe(long contribuyenteId) {
        return enTransaccion(
                () ->
                        jdbc.sql(
                                        "SELECT count(*) FROM cuenta_corriente_asiento"
                                                + " WHERE contribuyente_id = :c"
                                                + "   AND asiento_reversado_id IS NOT NULL")
                                .param("c", contribuyenteId)
                                .query(Long.class)
                                .single());
    }

    private static long asientosCon(String documentoOrigen) {
        return enTransaccion(
                () ->
                        jdbc.sql(
                                        "SELECT count(*) FROM cuenta_corriente_asiento"
                                                + " WHERE documento_origen = :d")
                                .param("d", documentoOrigen)
                                .query(Long.class)
                                .single());
    }

    private static long anulacionesDe(long reciboId) {
        return enTransaccion(
                () ->
                        jdbc.sql(
                                        "SELECT count(*) FROM recibo_movimiento"
                                                + " WHERE recibo_id = :r AND tipo = 'ANULACION'")
                                .param("r", reciboId)
                                .query(Long.class)
                                .single());
    }

    private static List<String> columnasDeRecibo() {
        return enTransaccion(
                () ->
                        jdbc.sql(
                                        "SELECT column_name FROM information_schema.columns"
                                                + " WHERE table_name = 'recibo'")
                                .query(String.class)
                                .list());
    }

    private static long crearContribuyente(long muni, String sufijo) {
        int orden = CONTADOR.incrementAndGet();
        return insertarComoOwner(
                muni,
                "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                        + " tipo_documento, numero_documento, tipo_persona, nombre_razon_social,"
                        + " usuario_registro)"
                        + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PRUEBA', 'siembra')"
                        + " RETURNING id",
                muni,
                sufijo,
                String.format("%08d", 30_000_000 + orden));
    }

    private static long crearArea(long muni, String codigo) {
        return insertarComoOwner(
                muni,
                "INSERT INTO area (municipalidad_id, codigo, nombre)"
                        + " VALUES (?, ?, 'Unidad de Rentas') RETURNING id",
                muni,
                codigo);
    }

    private static long crearCaja(long muni, String codigo, String serie, @Nullable Long area) {
        return insertarComoOwner(
                muni,
                "INSERT INTO caja (municipalidad_id, codigo, nombre, area_id, serie)"
                        + " VALUES (?, ?, 'Caja de la prueba', ?, ?) RETURNING id",
                muni,
                codigo,
                area,
                serie);
    }

    private static long insertarComoOwner(long muni, String sql, Object... parametros) {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER)) {
            ContextoDeTenant.fijar(owner, muni);
            try (PreparedStatement sentencia = owner.prepareStatement(sql)) {
                for (int i = 0; i < parametros.length; i++) {
                    sentencia.setObject(i + 1, parametros[i]);
                }
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    owner.commit();
                    return id;
                }
            }
        } catch (SQLException fallo) {
            throw new IllegalStateException("No se pudo sembrar: " + sql, fallo);
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

    /** El padron, lo justo para poner un nombre en el papel. */
    private static final class PadronDeLaPrueba implements DirectorioDeContribuyentes {

        @Override
        public List<ResumenDeContribuyente> buscar(String texto, int maximo) {
            return List.of();
        }

        @Override
        public Optional<ResumenDeContribuyente> porCodigo(String codigo) {
            return Optional.empty();
        }

        @Override
        public Map<Long, ResumenDeContribuyente> porIds(Set<Long> ids) {
            Map<Long, ResumenDeContribuyente> encontrados = new java.util.LinkedHashMap<>();
            for (Long id : ids) {
                encontrados.put(
                        id,
                        new ResumenDeContribuyente(
                                id, "C-" + id, "TITULAR, PRUEBA", "DNI 00000000"));
            }
            return encontrados;
        }

        @Override
        public Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return Optional.empty();
        }
    }
}
