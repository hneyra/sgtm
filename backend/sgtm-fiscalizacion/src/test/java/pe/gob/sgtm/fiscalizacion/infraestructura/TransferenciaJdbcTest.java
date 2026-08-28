package pe.gob.sgtm.fiscalizacion.infraestructura;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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
import pe.gob.sgtm.catastro.TransferenciaDeFiscalizacion;
import pe.gob.sgtm.catastro.aplicacion.ActualizarFichaCatastral;
import pe.gob.sgtm.catastro.aplicacion.TransferenciaDeFiscalizacionCatastro;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.catastro.infraestructura.FichaCatastralRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.contribuyentes.aplicacion.DirectorioJdbc;
import pe.gob.sgtm.contribuyentes.infraestructura.ContribuyenteRepositoryJdbc;
import pe.gob.sgtm.contribuyentes.infraestructura.FichaRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.GeneradorDeCargos;
import pe.gob.sgtm.cuentacorriente.aplicacion.GeneradorDeCargosCuentaCorriente;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarAsiento;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.documentos.DocumentoRepositoryJdbc;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.FormatoDeDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.fiscalizacion.aplicacion.TransferirARentas;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.LineaDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Liquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.MovimientoDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.ResolucionDeDeterminacion;
import pe.gob.sgtm.fiscalizacion.dominio.ResolucionDeDeterminacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDeFiscalizacion;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import tools.jackson.databind.json.JsonMapper;

/**
 * La transferencia a rentas contra PostgreSQL de verdad, conectado como {@code sgtm_app} (#52).
 *
 * <p>Conectado como {@code sgtm_app} y no como el superusuario que Testcontainers entrega por
 * omision: un superusuario <b>omite RLS incluso con {@code FORCE ROW LEVEL SECURITY}</b>, y una
 * prueba escrita sobre esa conexion pasa en verde sin verificar nada (CAL-01 §3.2).
 *
 * <h2>Aqui se cablea el sistema entero, y hace falta</h2>
 *
 * <p>Esta prueba usa los repositorios y los casos de uso <b>reales</b> de cuatro contextos — {@code
 * fiscalizacion}, {@code catastro}, {@code cuentacorriente} y {@code documentos}—, envueltos en un
 * proxy transaccional de verdad. Es lo unico que puede demostrar los AC que el issue pide:
 *
 * <ul>
 *   <li><b>AC 4, atomicidad</b>: se provoca el fallo en el <b>ultimo</b> paso, con la ficha ya
 *       versionada, los cargos ya asentados y el papel ya emitido, y se comprueba que no queda
 *       nada. Con un {@code TransactionTemplate} escrito por la prueba, quitarle el
 *       {@code @Transactional} al caso de uso no pondria nada en rojo.
 *   <li><b>AC 5, reconstruir el padron</b>: preguntar por la ficha vigente a una fecha anterior. Lo
 *       que hace verdadera la respuesta son las dos columnas de vigencia, y solo la base las tiene.
 *   <li><b>AC 6, dos veces no duplica</b>: con diez hilos de verdad.
 * </ul>
 */
@DisplayName("#52 — Transferencia a rentas contra PostgreSQL")
class TransferenciaJdbcTest {

    private static final Observacion PORQUE =
            Observacion.de("Se transfiere lo hallado en la inspeccion");
    private static final LocalDate VIGENCIA_ORIGINAL = LocalDate.of(2024, 1, 1);
    private static final LocalDate HOY = LocalDate.of(2026, 6, 15);
    private static final Ejercicio E2026 = new Ejercicio(2026);

    /**
     * El ejercicio FISCALIZADO, y es 2026 por una razon de la base que conviene saber.
     *
     * <p>{@code cuenta_corriente_asiento} se particiona por ejercicio y V2 solo declara las
     * particiones de 2026 y 2027. Un cargo de 2024 no falla «raro»: falla con «no partition of
     * relation found», que es exactamente lo que debe pasar mientras nadie haya creado esa
     * particion. La transferencia de una fiscalizacion de 2024 tendra que esperar a que exista, y
     * eso es cosa del despliegue, no de este caso de uso.
     */
    private static final Ejercicio FISCALIZADO = new Ejercicio(2026);

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-06-15T10:00:00Z"), ZoneId.of("America/Lima"));

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static JdbcClient jdbc;
    private static TenantTransactionManager gestor;
    private static TransactionTemplate transaccion;

    private static LiquidacionRepositoryJdbc liquidaciones;
    private static MovimientoDeLiquidacionRepositoryJdbc movimientos;
    private static ActaFiscalizacionRepositoryJdbc actas;
    private static ResolucionDeDeterminacionRepositoryJdbc resoluciones;
    private static FichaCatastralRepositoryJdbc fichas;
    private static TransferirARentas transferir;

    private static final AtomicInteger SIGUIENTE = new AtomicInteger(1);
    private static final java.util.Map<Long, Long> CONJUNTOS = new java.util.HashMap<>();

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("251001", "Municipalidad de la transferencia A");
        municipalidadB = crearMunicipalidad("251002", "Municipalidad de la transferencia B");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        liquidaciones = new LiquidacionRepositoryJdbc(jdbc);
        movimientos = new MovimientoDeLiquidacionRepositoryJdbc(jdbc);
        actas = new ActaFiscalizacionRepositoryJdbc(jdbc);
        resoluciones = new ResolucionDeDeterminacionRepositoryJdbc(jdbc);
        fichas = new FichaCatastralRepositoryJdbc(jdbc);

        transferir = envolver(armar(resoluciones));
    }

    /**
     * El caso de uso con todos sus colaboradores reales.
     *
     * <p>Recibe el repositorio de resoluciones como parametro para poder sustituirlo por uno que
     * revienta: es el <b>ultimo</b> paso de la transferencia, y provocar el fallo ahi es provocarlo
     * en el peor momento posible —con la ficha ya versionada, los cargos ya asentados y el papel ya
     * emitido—.
     */
    private static TransferirARentas armar(ResolucionDeDeterminacionRepository repositorio) {
        Auditoria auditoria = new AuditoriaJdbc(jdbc, RELOJ);
        TransferenciaDeFiscalizacion padron =
                envolver(
                        new TransferenciaDeFiscalizacionCatastro(
                                fichas,
                                envolver(new ActualizarFichaCatastral(fichas, auditoria, RELOJ))));
        GeneradorDeCargos cargos =
                new GeneradorDeCargosCuentaCorriente(
                        new RegistrarAsiento(
                                new AsientoRepositoryJdbc(jdbc),
                                new SaldoRepositoryJdbc(jdbc),
                                auditoria,
                                RELOJ));
        EmitirDocumento documentos =
                envolver(
                        new EmitirDocumento(
                                new DocumentoRepositoryJdbc(
                                        jdbc,
                                        JsonMapper.builder()
                                                .addModule(
                                                        new pe.gob.sgtm.web.ConfiguracionDeJson()
                                                                .moduloDeObjetosDeValor())
                                                .build()),
                                new GeneradorDeDocumentos(
                                        List.of(
                                                new RenderizadorPdf(),
                                                new RenderizadorXls(),
                                                new RenderizadorRtf()),
                                        RegimenDeLaInstalacion.REAL),
                                auditoria,
                                RELOJ));

        return new TransferirARentas(
                liquidaciones,
                movimientos,
                actas,
                repositorio,
                padron,
                cargos,
                // El padron REAL, contra la misma base: el nombre que sale en el papel es el
                // que esta inscrito, no uno de mentira. Es ademas lo que hace que el cruce
                // acta -> contribuyente se pruebe de verdad.
                new DirectorioJdbc(
                        new ContribuyenteRepositoryJdbc(jdbc), new FichaRepositoryJdbc(jdbc)),
                documentos,
                auditoria,
                RELOJ);
    }

    /**
     * Envuelve el objetivo en un proxy transaccional <b>de verdad</b>.
     *
     * <p>Lo que se quiere verificar es la anotacion {@code @Transactional} del codigo de
     * produccion. Si la prueba abriera la transaccion ella misma, quitarle la anotacion al caso de
     * uso no pondria nada en rojo y la prueba de atomicidad estaria midiendo la transaccion de la
     * prueba (mismo criterio que {@code CajaJdbcTest}, #33).
     */
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
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        OrigenContext.fijar(new Origen("fiscalizador.campo", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------

    @Nested
    @DisplayName("AC 2 y AC 5 — La ficha anterior queda, y el padron se puede reconstruir")
    class DelPadron {

        @Test
        @DisplayName("la version anterior queda intacta y cerrada; la nueva dice de donde salio")
        void laVersionAnteriorQueda() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));

            TransferirARentas.Transferencia hecha = transferir(escenario);

            List<FichaCatastral> historial =
                    transaccion.execute(
                            estado -> fichas.historial(escenario.predioId, TipoFicha.UNICA));
            assertThat(historial).hasSize(2);

            FichaCatastral nueva = versionDe(historial, 2);
            FichaCatastral anterior = versionDe(historial, 1);

            assertThat(anterior.areaTerreno())
                    .as("la anterior no se toco: sigue diciendo lo que decia")
                    .isEqualTo(AreaM2.de("120.00"));
            assertThat(anterior.uso()).isEqualTo("CASA_HABITACION");
            assertThat(anterior.vigenciaHasta())
                    .as("y se cerro el dia antes de que empiece la nueva")
                    .isEqualTo(HOY.minusDays(1));

            assertThat(nueva.origen())
                    .isEqualTo(pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha.FISCALIZACION);
            assertThat(nueva.documentoOrigen()).isEqualTo(escenario.numeroDeLiquidacion);
            assertThat(nueva.observacion().texto()).isEqualTo(PORQUE.texto());
            assertThat(nueva.areaTerreno()).isEqualTo(AreaM2.de("300.00"));
            assertThat(nueva.uso()).isEqualTo("COMERCIO");
            assertThat(usuarioDeLaFicha(nueva.id()))
                    .as("y quien la registro sale del contexto de origen, no de un literal")
                    .isEqualTo("fiscalizador.campo");

            assertThat(hecha.resolucion().fichaAnteriorId()).isEqualTo(anterior.id());
            assertThat(hecha.resolucion().fichaNuevaId()).isEqualTo(nueva.id());
        }

        @Test
        @DisplayName("el padron de antes de la transferencia se reconstruye pidiendo la fecha")
        void elPadronAnteriorSeReconstruye() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));
            transferir(escenario);

            Optional<FichaCatastral> antes =
                    transaccion.execute(
                            estado ->
                                    fichas.vigenteA(
                                            escenario.predioId,
                                            TipoFicha.UNICA,
                                            HOY.minusDays(30)));
            Optional<FichaCatastral> despues =
                    transaccion.execute(
                            estado -> fichas.vigenteA(escenario.predioId, TipoFicha.UNICA, HOY));

            assertThat(antes).isPresent();
            assertThat(antes.get().areaTerreno())
                    .as(
                            "una determinacion de mayo se calculo sobre 120 m2, y tiene que poder"
                                    + " defenderse con esa cifra (regla 9, RNF-075)")
                    .isEqualTo(AreaM2.de("120.00"));
            assertThat(despues).isPresent();
            assertThat(despues.get().areaTerreno()).isEqualTo(AreaM2.de("300.00"));
        }
    }

    @Nested
    @DisplayName("AC 4 — Es atomica: ficha nueva, asientos y resolucion, o nada (RF-133)")
    class DeLaAtomicidad {

        @Test
        @DisplayName("si el ultimo paso falla, no queda ni la ficha, ni los cargos, ni el papel")
        void unFalloAlFinalNoDejaNada() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));

            long fichasAntes = contar("ficha_catastral");
            long asientosAntes = contar("cuenta_corriente_asiento");
            long documentosAntes = contar("documento_emitido");

            // La ficha YA esta versionada, los cargos YA estan asentados y el papel YA esta
            // emitido cuando esto revienta: es el peor momento posible, el que deja el padron
            // cambiado sin resolucion que lo justifique si la transaccion no cubriera todo.
            TransferirARentas conFalloAlFinal =
                    envolver(armar(new ResolucionQueRevientaAlRegistrar(resoluciones)));

            assertThatThrownBy(
                            () ->
                                    conFalloAlFinal.transferir(
                                            peticion(escenario), FormatoDeDocumento.PDF, PORQUE))
                    .isInstanceOf(FalloSimulado.class);

            assertThat(contar("ficha_catastral"))
                    .as("cero versiones nuevas: la transaccion se llevo la que ya estaba inscrita")
                    .isEqualTo(fichasAntes);
            assertThat(contar("cuenta_corriente_asiento"))
                    .as("cero asientos nuevos: el cargo se fue con la ficha")
                    .isEqualTo(asientosAntes);
            assertThat(contar("documento_emitido"))
                    .as(
                            "y cero papeles: no hay resolucion notificable de una transferencia que"
                                    + " no ocurrio")
                    .isEqualTo(documentosAntes);
            assertThat(
                            contarDonde(
                                    "resolucion_determinacion",
                                    "liquidacion_id = " + escenario.liquidacionId))
                    .isZero();

            Optional<FichaCatastral> vigente =
                    transaccion.execute(
                            estado -> fichas.vigenteA(escenario.predioId, TipoFicha.UNICA, HOY));
            assertThat(vigente).isPresent();
            assertThat(vigente.get().version())
                    .as("y la version que habia sigue abierta: ni siquiera se quedo cerrada")
                    .isEqualTo(1);
            assertThat(vigente.get().vigenciaHasta()).isNull();
        }

        @Test
        @DisplayName("cuando sale bien, estan la ficha, los cargos, el papel y la resolucion")
        void cuandoSaleBienEstaTodo() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));

            TransferirARentas.Transferencia hecha = transferir(escenario);

            assertThat(hecha.cargosAsentados()).isEqualTo(1);
            assertThat(
                            contarDonde(
                                    "cuenta_corriente_asiento",
                                    "documento_origen = '" + hecha.resolucion().numero() + "'"))
                    .as("el cargo apunta al papel notificado")
                    .isEqualTo(1);
            assertThat(
                            contarDonde(
                                    "documento_emitido",
                                    "tipo = 'RDF' AND numero = '"
                                            + hecha.resolucion().numero()
                                            + "'"))
                    .isEqualTo(1);
            Optional<ResolucionDeDeterminacion> registrada =
                    transaccion.execute(
                            estado -> resoluciones.porNumero(hecha.resolucion().numero()));
            assertThat(registrada).isPresent();
        }
    }

    @Nested
    @DisplayName("AC 6 — Transferir dos veces no duplica ni versiones ni cargos")
    class DeLaConcurrencia {

        @Test
        // Se captura RuntimeException a proposito: lo que se cuenta es cuantos hilos
        // ENTRARON, y el motivo por el que los demas fueron rechazados es lo de menos
        // —puede ser la guarda de Java o cualquiera de los indices unicos—. Mismo
        // criterio que `LicenciaDeFuncionamientoJdbcTest` (#44).
        @SuppressWarnings("checkstyle:IllegalCatch")
        @DisplayName("diez hilos transfieren la misma liquidacion y solo una entra")
        void diezHilosUnaSolaTransferencia() throws Exception {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));
            int hilos = 10;
            CountDownLatch salida = new CountDownLatch(1);
            ExecutorService piscina = Executors.newFixedThreadPool(hilos);
            List<Future<Boolean>> resultados = new ArrayList<>();

            try {
                for (int i = 0; i < hilos; i++) {
                    resultados.add(
                            piscina.submit(
                                    () -> {
                                        TenantContext.fijar(new MunicipalidadId(municipalidadA));
                                        OrigenContext.fijar(
                                                new Origen("fiscalizador.campo", null, null));
                                        salida.await();
                                        try {
                                            transferir.transferir(
                                                    peticion(escenario),
                                                    FormatoDeDocumento.PDF,
                                                    PORQUE);
                                            return true;
                                        } catch (RuntimeException rechazada) {
                                            return false;
                                        } finally {
                                            TenantContext.limpiar();
                                            OrigenContext.limpiar();
                                        }
                                    }));
                }
                salida.countDown();

                int entraron = 0;
                for (Future<Boolean> resultado : resultados) {
                    if (Boolean.TRUE.equals(resultado.get(60, TimeUnit.SECONDS))) {
                        entraron++;
                    }
                }

                assertThat(entraron).as("una transferencia, no diez").isEqualTo(1);
                List<FichaCatastral> historial =
                        transaccion.execute(
                                estado -> fichas.historial(escenario.predioId, TipoFicha.UNICA));
                assertThat(historial)
                        .as("dos versiones de ficha: la original y UNA nueva")
                        .hasSize(2);
                assertThat(
                                contarDonde(
                                        "cuenta_corriente_asiento",
                                        "contribuyente_id = " + escenario.contribuyenteId))
                        .as("un cargo, no diez: el contribuyente no debe diez veces lo mismo")
                        .isEqualTo(1);
                assertThat(
                                contarDonde(
                                        "resolucion_determinacion",
                                        "liquidacion_id = " + escenario.liquidacionId))
                        .isEqualTo(1);
            } finally {
                piscina.shutdownNow();
            }
        }

        @Test
        // Se captura RuntimeException a proposito: lo que se cuenta es cuantos hilos
        // ENTRARON, y el motivo por el que los demas fueron rechazados es lo de menos
        // —puede ser la guarda de Java o cualquiera de los indices unicos—. Mismo
        // criterio que `LicenciaDeFuncionamientoJdbcTest` (#44).
        @SuppressWarnings("checkstyle:IllegalCatch")
        @DisplayName("el indice unico es el que lo impide, y se mide sin nada que lo disimule")
        void elIndiceUnicoEsElQueLoImpide() throws Exception {
            // ESTA es la prueba que mide `resolucion_determinacion_liquidacion_uq`, y hace falta
            // aparte. En la de arriba, `DocumentoRepository.siguienteCorrelativo` es un
            // `count(*) + 1`: los diez hilos calculan el MISMO numero de documento y
            // `documento_numero_uq` rechaza a nueve antes de que ninguno llegue al indice que se
            // quiere medir. Con esa serializacion de por medio, degradar el indice a normal
            // dejaria la prueba de arriba en verde. Es el mismo hueco exacto que #44 destapo con
            // `licencia_duplicado_uq`.
            //
            // Aqui los diez hilos insertan filas que difieren en TODO —numero, documento— salvo
            // en `liquidacion_id`, que es lo unico que el indice vigila.
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));
            // Las dos versiones de ficha existen de verdad: las foraneas de V49 van NOT VALID,
            // pero NOT VALID sigue comprobando cada INSERT, asi que un identificador inventado
            // haria fallar a los diez hilos por el motivo equivocado.
            long fichaNueva = versionarFichaAMano(municipalidadA, escenario.predioId);
            int hilos = 10;
            List<Long> documentos = new ArrayList<>();
            for (int i = 0; i < hilos; i++) {
                documentos.add(
                        sembrarDocumento(
                                municipalidadA, "RDF-CARRERA-" + SIGUIENTE.getAndIncrement()));
            }

            CountDownLatch salida = new CountDownLatch(1);
            ExecutorService piscina = Executors.newFixedThreadPool(hilos);
            List<Future<Boolean>> resultados = new ArrayList<>();

            try {
                for (int i = 0; i < hilos; i++) {
                    long documentoId = documentos.get(i);
                    String numero = "RDF-HILO-" + documentoId;
                    resultados.add(
                            piscina.submit(
                                    () -> {
                                        TenantContext.fijar(new MunicipalidadId(municipalidadA));
                                        OrigenContext.fijar(
                                                new Origen("fiscalizador.campo", null, null));
                                        salida.await();
                                        try {
                                            transaccion.execute(
                                                    estado ->
                                                            resoluciones.registrar(
                                                                    ResolucionDeDeterminacion
                                                                            .predial(
                                                                                    numero,
                                                                                    documentoId,
                                                                                    escenario
                                                                                            .liquidacionId,
                                                                                    escenario
                                                                                            .contribuyenteId,
                                                                                    escenario
                                                                                            .predioId,
                                                                                    escenario
                                                                                            .fichaId,
                                                                                    fichaNueva,
                                                                                    HOY,
                                                                                    "ACTA-1",
                                                                                    "sustento",
                                                                                    "base legal",
                                                                                    PORQUE)));
                                            return true;
                                        } catch (RuntimeException rechazada) {
                                            return false;
                                        } finally {
                                            TenantContext.limpiar();
                                            OrigenContext.limpiar();
                                        }
                                    }));
                }
                salida.countDown();

                int entraron = 0;
                for (Future<Boolean> resultado : resultados) {
                    if (Boolean.TRUE.equals(resultado.get(60, TimeUnit.SECONDS))) {
                        entraron++;
                    }
                }

                assertThat(entraron)
                        .as(
                                "una fila, no diez: sin el indice serian diez transferencias de la"
                                        + " misma liquidacion, cada una con su papel y su cargo")
                        .isEqualTo(1);
                assertThat(
                                contarDonde(
                                        "resolucion_determinacion",
                                        "liquidacion_id = " + escenario.liquidacionId))
                        .isEqualTo(1);
            } finally {
                piscina.shutdownNow();
            }
        }
    }

    @Nested
    @DisplayName("Solo se agrega, y solo se ve lo propio")
    class DeLaInmutabilidadYElAislamiento {

        @Test
        @DisplayName("sgtm_app no puede actualizar ni borrar una resolucion de determinacion")
        void nadieLaEdita() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));
            TransferirARentas.Transferencia hecha = transferir(escenario);
            long id = hecha.resolucion().identificador();

            assertThat(
                            errorDe(
                                    "UPDATE resolucion_determinacion SET sustento = 'otro'"
                                            + " WHERE id = "
                                            + id))
                    .as(
                            "V49 no le concede UPDATE: el papel notificado, el padron y el libro"
                                    + " no pueden acabar diciendo cosas distintas")
                    .contains("42501");
            assertThat(errorDe("DELETE FROM resolucion_determinacion WHERE id = " + id))
                    .contains("42501");
        }

        @Test
        @DisplayName("desde B no se ve la transferencia de A")
        void desdeBNoSeVeLaDeA() {
            Escenario escenario = sembrar(municipalidadA, Dinero.de("450.00"));
            TransferirARentas.Transferencia deLaA = transferir(escenario);

            TenantContext.fijar(new MunicipalidadId(municipalidadB));
            Optional<ResolucionDeDeterminacion> desdeB =
                    transaccion.execute(
                            estado -> resoluciones.porNumero(deLaA.resolucion().numero()));

            assertThat(desdeB)
                    .as("la politica RLS, no un WHERE que alguien puede olvidar")
                    .isEmpty();
        }
    }

    // ------------------------------------------------------------------

    private static TransferirARentas.Transferencia transferir(Escenario escenario) {
        return transferir.transferir(peticion(escenario), FormatoDeDocumento.PDF, PORQUE);
    }

    private static TransferirARentas.Peticion peticion(Escenario escenario) {
        return new TransferirARentas.Peticion(
                escenario.numeroDeLiquidacion,
                HOY,
                "ACTA-2026-" + escenario.liquidacionId,
                "Ampliacion no declarada, verificada en inspeccion",
                "TUO del Codigo Tributario, arts. 76 y 77");
    }

    private static FichaCatastral versionDe(List<FichaCatastral> historial, int version) {
        return historial.stream()
                .filter(f -> f.version() == version)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta la version " + version));
    }

    private static String usuarioDeLaFicha(Long fichaId) {
        return transaccion.execute(
                estado ->
                        jdbc.sql("SELECT usuario_registro FROM ficha_catastral WHERE id = :id")
                                .param("id", fichaId)
                                .query(String.class)
                                .single());
    }

    private static long contar(String tabla) {
        return transaccion.execute(
                estado -> jdbc.sql("SELECT count(*) FROM " + tabla).query(Long.class).single());
    }

    private static long contarDonde(String tabla, String condicion) {
        return transaccion.execute(
                estado ->
                        jdbc.sql("SELECT count(*) FROM " + tabla + " WHERE " + condicion)
                                .query(Long.class)
                                .single());
    }

    /** El SQLSTATE del error, ejecutando como {@code sgtm_app} con contexto de tenant. */
    private static String errorDe(String sql) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadA);
            try (PreparedStatement sentencia = app.prepareStatement(sql)) {
                sentencia.executeUpdate();
                return "sin error";
            }
        } catch (SQLException fallo) {
            return fallo.getSQLState() + " " + fallo.getMessage();
        }
    }

    // ------------------------------------------------------------------

    private record Escenario(
            long actaId,
            long predioId,
            long contribuyenteId,
            long fichaId,
            long liquidacionId,
            String numeroDeLiquidacion) {}

    /**
     * Un predio con su ficha, su acta y su liquidacion LIQUIDADA, lista para transferirse.
     *
     * <p>{@code insoluto} entra como <b>dato de prueba</b> por el constructor de la linea: el
     * mecanismo de la transferencia no depende de D-02a, y sin importes no habria cargo que
     * comprobar (#198).
     */
    private static Escenario sembrar(long municipalidadId, Dinero insoluto) {
        String sufijo = String.valueOf(SIGUIENTE.getAndIncrement());
        long contribuyente =
                ejecutarComoApp(
                        municipalidadId,
                        "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                + " tipo_documento, numero_documento, tipo_persona,"
                                + " nombre_razon_social, usuario_registro)"
                                + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PRUEBA',"
                                + " 'siembra') RETURNING id",
                        municipalidadId,
                        "T-" + sufijo,
                        String.format("%08d", 62000000 + Integer.parseInt(sufijo)));
        long predio =
                ejecutarComoApp(
                        municipalidadId,
                        "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                + " direccion)"
                                + " VALUES (?, ?, 'URBANO', 'Jr. Union de prueba') RETURNING id",
                        municipalidadId,
                        String.format("%018d", 500000 + Integer.parseInt(sufijo)));
        long ficha =
                ejecutarComoApp(
                        municipalidadId,
                        "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                                + " area_terreno, uso, vigencia_desde, origen, documento_origen,"
                                + " observacion, usuario_registro)"
                                + " VALUES (?, ?, 'UNICA', 1, 120.00, 'CASA_HABITACION', ?,"
                                + "         'DECLARACION_JURADA', 'DJ-001', 'ficha', 'siembra')"
                                + " RETURNING id",
                        municipalidadId,
                        predio,
                        VIGENCIA_ORIGINAL);
        long programa =
                ejecutarComoApp(
                        municipalidadId,
                        "INSERT INTO programa_fiscalizacion (municipalidad_id, codigo, descripcion,"
                                + " tipo, fecha_inicio)"
                                + " VALUES (?, ?, 'Programa de prueba', 'PREDIAL', ?) RETURNING id",
                        municipalidadId,
                        "PF-T" + sufijo,
                        LocalDate.of(2026, 1, 1));
        long acta =
                ejecutarComoApp(
                        municipalidadId,
                        "INSERT INTO acta_fiscalizacion (municipalidad_id, programa_id, version,"
                                + " contribuyente_id, predio_id, ficha_id, fecha_visita,"
                                + " fiscalizador, hallazgo, area_hallada, estado, observacion,"
                                + " usuario_registro)"
                                + " VALUES (?, ?, 1, ?, ?, ?, ?, 'J. Perez', 'SUBVALUADOR', 300.00,"
                                + "         'ABIERTA', 'acta de prueba', 'siembra') RETURNING id",
                        municipalidadId,
                        programa,
                        contribuyente,
                        predio,
                        ficha,
                        LocalDate.of(2026, 3, 1));

        long conjunto = conjuntoSelladoDe(municipalidadId);
        String numero = "LIQ-2026-" + String.format("%06d", Integer.parseInt(sufijo));

        Liquidacion guardada =
                transaccion.execute(
                        estado ->
                                liquidaciones.insertar(
                                        Liquidacion.primera(
                                                numero,
                                                E2026,
                                                Integer.parseInt(sufijo),
                                                acta,
                                                FISCALIZADO,
                                                FISCALIZADO,
                                                TipoDeFiscalizacion.CIERTA,
                                                "Ampliacion detectada",
                                                HOY,
                                                PORQUE),
                                        List.of(
                                                new LineaDeLiquidacion(
                                                        null,
                                                        null,
                                                        FISCALIZADO,
                                                        conjunto,
                                                        predio,
                                                        null,
                                                        CondicionFiscalizada.SUBVALUADOR,
                                                        AreaM2.de("120.00"),
                                                        AreaM2.de("300.00"),
                                                        "CASA_HABITACION",
                                                        "COMERCIO",
                                                        Dinero.de("30000.00"),
                                                        Dinero.de("75000.00"),
                                                        insoluto,
                                                        null))));
        long liquidacionId = guardada.identificador();
        transaccion.execute(
                estado ->
                        movimientos.insertar(
                                MovimientoDeLiquidacion.apertura(
                                        liquidacionId, HOY, "emitida", PORQUE)));
        transaccion.execute(
                estado ->
                        movimientos.insertar(
                                MovimientoDeLiquidacion.cambioDeEstado(
                                        liquidacionId,
                                        EstadoDeLiquidacion.LIQUIDADA,
                                        HOY,
                                        "cerrada",
                                        PORQUE)));

        return new Escenario(acta, predio, contribuyente, ficha, liquidacionId, numero);
    }

    /**
     * Cierra la version vigente del predio y abre la siguiente, por SQL directo.
     *
     * <p>Existe para la prueba del indice unico: ahi los diez hilos tienen que insertar filas que
     * solo compartan {@code liquidacion_id}, y para eso las dos versiones de ficha a las que
     * apuntan tienen que existir antes.
     */
    private static long versionarFichaAMano(long municipalidadId, long predioId) {
        ejecutarComoApp(
                municipalidadId,
                "UPDATE ficha_catastral SET vigencia_hasta = ?"
                        + " WHERE predio_id = ? AND tipo = 'UNICA' AND vigencia_hasta IS NULL"
                        + " RETURNING id",
                HOY.minusDays(1),
                predioId);
        return ejecutarComoApp(
                municipalidadId,
                "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo, version,"
                        + " area_terreno, uso, vigencia_desde, origen, documento_origen,"
                        + " observacion, usuario_registro)"
                        + " VALUES (?, ?, 'UNICA', 2, 300.00, 'COMERCIO', ?, 'FISCALIZACION',"
                        + "         'LIQ-CARRERA', 'version de la carrera', 'siembra')"
                        + " RETURNING id",
                municipalidadId,
                predioId,
                HOY);
    }

    private static long sembrarDocumento(long municipalidadId, String numero) {
        return ejecutarComoApp(
                municipalidadId,
                "INSERT INTO documento_emitido (municipalidad_id, tipo, numero, ejercicio,"
                        + " referencia, datos, formato, resumen, fecha_emision, usuario_emision,"
                        + " observacion)"
                        + " VALUES (?, 'RDF', ?, 2026, 'carrera', '{}'::jsonb, 'PDF',"
                        + "         repeat('a', 64), ?, 'siembra', 'documento de prueba')"
                        + " RETURNING id",
                municipalidadId,
                numero,
                HOY);
    }

    /**
     * El conjunto SELLADO del ejercicio fiscalizado, creado una sola vez.
     *
     * <p>Memoizado porque la base lo exige: {@code conjunto_sellado_uq} (V9) admite un solo
     * conjunto sellado por municipalidad y ejercicio.
     */
    private static long conjuntoSelladoDe(long municipalidadId) {
        return CONJUNTOS.computeIfAbsent(
                municipalidadId,
                id ->
                        ejecutarComoApp(
                                id,
                                "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio,"
                                        + " version, estado, fecha_sellado, usuario_sellado)"
                                        + " VALUES (?, 2026, 1, 'SELLADO', now(), 'siembra')"
                                        + " RETURNING id",
                                id));
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

    private static long ejecutarComoApp(long municipalidadId, String sql, Object... valores) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadId);
            try (PreparedStatement sentencia = app.prepareStatement(sql)) {
                for (int i = 0; i < valores.length; i++) {
                    sentencia.setObject(i + 1, valores[i]);
                }
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

    /** El repositorio real, que revienta justo al registrar: el ultimo paso de la transferencia. */
    private record ResolucionQueRevientaAlRegistrar(ResolucionDeDeterminacionRepository real)
            implements ResolucionDeDeterminacionRepository {

        @Override
        public ResolucionDeDeterminacion registrar(ResolucionDeDeterminacion resolucion) {
            throw new FalloSimulado();
        }

        @Override
        public Optional<ResolucionDeDeterminacion> porNumero(String numero) {
            return real.porNumero(numero);
        }

        @Override
        public Optional<ResolucionDeDeterminacion> deLiquidacion(long liquidacionId) {
            return real.deLiquidacion(liquidacionId);
        }

        @Override
        public List<ResolucionDeDeterminacion> deContribuyente(long contribuyenteId) {
            return real.deContribuyente(contribuyenteId);
        }
    }

    /** El fallo que se provoca a proposito. */
    private static final class FalloSimulado extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        FalloSimulado() {
            super("Fallo provocado en el ultimo paso de la transferencia");
        }
    }
}
