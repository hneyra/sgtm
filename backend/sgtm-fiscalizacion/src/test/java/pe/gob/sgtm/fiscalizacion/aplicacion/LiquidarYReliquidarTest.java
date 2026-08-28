package pe.gob.sgtm.fiscalizacion.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.dobles.ActasEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.DeclaracionesDeMentira;
import pe.gob.sgtm.fiscalizacion.dobles.LiquidacionesEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.MovimientosDeLiquidacionEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.PadronDeMentira;
import pe.gob.sgtm.fiscalizacion.dobles.ParametrosDeMentira;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.fiscalizacion.dominio.LineaDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Liquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDeFiscalizacion;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.rentas.DeclaracionDelEjercicio;

/**
 * Liquidar y reliquidar (#49, AC 1, AC 2, AC 4 y AC 5).
 *
 * <p>Sin base de datos: lo que se verifica aquí es la orquestación —qué conjunto se fija, qué
 * versión se encadena, qué se escribe y qué no—. Lo que la base garantiza por su cuenta —RLS,
 * unicidad, privilegios— lo verifica {@code LiquidacionJdbcTest} contra PostgreSQL real.
 */
@DisplayName("#49 — Liquidar y reliquidar")
class LiquidarYReliquidarTest {

    private static final Observacion OBSERVACION = Observacion.de("Se liquida para la prueba");
    private static final LocalDate HOY = LocalDate.of(2026, 3, 16);
    private static final Ejercicio E2024 = new Ejercicio(2024);
    private static final Ejercicio E2025 = new Ejercicio(2025);
    private static final long PREDIO = 20L;
    private static final long CONTRIBUYENTE = 10L;
    private static final long FICHA_DECLARADA = 700L;
    private static final long FICHA_VIGENTE = 900L;
    private static final long CONJUNTO_2024 = 41L;
    private static final long CONJUNTO_2025 = 42L;

    private ActasEnMemoria actas;
    private LiquidacionesEnMemoria liquidaciones;
    private MovimientosDeLiquidacionEnMemoria movimientos;
    private ParametrosDeMentira parametros;
    private PadronDeMentira catastro;
    private DeclaracionesDeMentira rentas;
    private LiquidarFiscalizacion liquidar;
    private ReliquidarFiscalizacion reliquidar;
    private ConsultaDeLiquidaciones consulta;
    private long actaId;

    @BeforeEach
    void armar() {
        actas = new ActasEnMemoria();
        liquidaciones = new LiquidacionesEnMemoria();
        movimientos = new MovimientosDeLiquidacionEnMemoria();
        parametros =
                new ParametrosDeMentira()
                        .sellar(2024, CONJUNTO_2024, 1)
                        .sellar(2025, CONJUNTO_2025, 1);
        catastro =
                new PadronDeMentira()
                        .conFicha(FICHA_DECLARADA, AreaM2.de("120.00"))
                        .conFicha(FICHA_VIGENTE, AreaM2.de("300.00"))
                        .conCaracteristicas(
                                PREDIO, "CASA_HABITACION", AreaM2.de("300.00"), FICHA_VIGENTE)
                        .con(
                                new PredioDelPadron(
                                        PREDIO,
                                        "000000000000000020",
                                        "Jr. Union 100",
                                        "S-01",
                                        CONTRIBUYENTE,
                                        AreaM2.de("300.00"),
                                        "CASA_HABITACION",
                                        FICHA_VIGENTE));
        rentas =
                new DeclaracionesDeMentira()
                        .con(
                                PREDIO,
                                new DeclaracionDelEjercicio(
                                        1L,
                                        "DJ-0001",
                                        E2024,
                                        CONTRIBUYENTE,
                                        LocalDate.of(2024, 2, 20),
                                        false,
                                        FICHA_DECLARADA));

        liquidar =
                new LiquidarFiscalizacion(
                        actas,
                        liquidaciones,
                        movimientos,
                        parametros,
                        catastro,
                        catastro,
                        rentas,
                        registro -> {},
                        Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC));
        reliquidar = new ReliquidarFiscalizacion(liquidaciones, liquidar);
        consulta = new ConsultaDeLiquidaciones(liquidaciones, movimientos);

        actaId =
                actas.sembrar(
                        ActaFiscalizacion.nuevaPredial(
                                1L,
                                1,
                                CONTRIBUYENTE,
                                PREDIO,
                                FICHA_VIGENTE,
                                LocalDate.of(2026, 3, 1),
                                "J. Perez",
                                Hallazgo.SUBVALUADOR,
                                AreaM2.de("300.00"),
                                "ampliacion no declarada",
                                OBSERVACION));
        liquidaciones.actaDe(actaId, CONTRIBUYENTE);
    }

    @Nested
    @DisplayName("Cada linea fija su conjunto sellado (AC 1)")
    class ConjuntoSellado {

        @Test
        @DisplayName("una linea por ejercicio, y cada una con el conjunto sellado del suyo")
        void unaLineaPorEjercicioConSuConjunto() {
            Liquidacion emitida = liquidarDe(E2024, E2025);

            List<LineaDeLiquidacion> lineas = liquidaciones.lineasDe(emitida.identificador());
            assertThat(lineas).hasSize(2);
            assertThat(lineas)
                    .as("los parametros de 2024 no son los de 2025")
                    .anySatisfy(
                            linea -> {
                                assertThat(linea.ejercicio()).isEqualTo(E2024);
                                assertThat(linea.conjuntoId()).isEqualTo(CONJUNTO_2024);
                            })
                    .anySatisfy(
                            linea -> {
                                assertThat(linea.ejercicio()).isEqualTo(E2025);
                                assertThat(linea.conjuntoId()).isEqualTo(CONJUNTO_2025);
                            });
        }

        @Test
        @DisplayName("sellar otra version despues NO altera la liquidacion emitida")
        void sellarOtraVersionNoAlteraLoEmitido() {
            Liquidacion emitida = liquidarDe(E2024, E2024);
            long conjuntoAlEmitir =
                    liquidaciones.lineasDe(emitida.identificador()).get(0).conjuntoId();

            // Se sella la version 2 del mismo ejercicio, como pasaria al corregir un arancel.
            parametros.sellar(2024, 77L, 2);

            LineaDeLiquidacion linea = liquidaciones.lineasDe(emitida.identificador()).get(0);
            assertThat(linea.conjuntoId())
                    .as("la liquidacion emitida sigue apuntando al conjunto con el que se emitio")
                    .isEqualTo(conjuntoAlEmitir)
                    .isEqualTo(CONJUNTO_2024);
        }

        @Test
        @DisplayName("la valorizacion lee POR CONJUNTO, nunca «el vigente del ejercicio»")
        void laValorizacionLeePorConjunto() {
            Liquidacion emitida = liquidarDe(E2024, E2024);
            LineaDeLiquidacion linea = liquidaciones.lineasDe(emitida.identificador()).get(0);
            parametros.sellar(2024, 77L, 2);

            InsumosNormativosDeLaLiquidacion insumos =
                    new InsumosNormativosDeLaLiquidacion(parametros);
            parametros.conjuntosPedidos.clear();
            parametros.ejerciciosResueltos.clear();

            assertThatThrownBy(() -> insumos.de(linea))
                    .as("D-02a no ha entregado la UIT: falla nombrando la llave")
                    .isInstanceOf(pe.gob.sgtm.parametros.ParametrosSellados.ParametroAusente.class)
                    .hasMessageContaining("UIT");

            assertThat(parametros.conjuntosPedidos)
                    .as("pregunta por el conjunto que la linea fijo")
                    .containsExactly(CONJUNTO_2024);
            assertThat(parametros.ejerciciosResueltos)
                    .as("y no resuelve «el vigente de 2024», que hoy seria el 77 (ARQ-09 §3)")
                    .isEmpty();
        }

        @Test
        @DisplayName("un ejercicio sin conjunto sellado detiene la liquidacion, nombrandolo")
        void unEjercicioSinSellarDetieneLaLiquidacion() {
            assertThatThrownBy(() -> liquidarDe(new Ejercicio(2023), E2024))
                    .isInstanceOf(LectorDeParametros.EjercicioSinSellar.class)
                    .hasMessageContaining("2023");

            assertThat(liquidaciones.versionesDeActa(actaId))
                    .as("y no deja media liquidacion escrita")
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("El contraste y lo que no escribe (AC 4)")
    class ContrasteYEscrituras {

        @Test
        @DisplayName("compara la ficha que la DJ referencia contra la que el catastro tiene hoy")
        void comparaLaFichaDeclaradaContraLaVigente() {
            Liquidacion emitida = liquidarDe(E2024, E2024);
            LineaDeLiquidacion linea = liquidaciones.lineasDe(emitida.identificador()).get(0);

            assertThat(linea.areaDeclarada()).isEqualTo(AreaM2.de("120.00"));
            assertThat(linea.areaHallada()).isEqualTo(AreaM2.de("300.00"));
            assertThat(linea.condicion()).isEqualTo(CondicionFiscalizada.SUBVALUADOR);
            assertThat(linea.diferenciaDeArea()).isEqualTo(AreaM2.de("180.00"));
        }

        @Test
        @DisplayName("sin declaracion del ejercicio, OMISO")
        void sinDeclaracionOmiso() {
            Liquidacion emitida = liquidarDe(E2025, E2025);
            assertThat(liquidaciones.lineasDe(emitida.identificador()).get(0).condicion())
                    .isEqualTo(CondicionFiscalizada.OMISO);
        }

        @Test
        @DisplayName("la liquidacion sale sin un solo importe (D-02a, #198)")
        void sinUnSoloImporte() {
            Liquidacion emitida = liquidarDe(E2024, E2025);
            assertThat(liquidaciones.lineasDe(emitida.identificador()))
                    .allSatisfy(
                            linea -> {
                                assertThat(linea.baseDeclarada()).isNull();
                                assertThat(linea.baseHallada()).isNull();
                                assertThat(linea.insolutoOmitido()).isNull();
                                assertThat(linea.multaTributaria()).isNull();
                            });
        }

        @Test
        @DisplayName("los puertos de catastro y rentas que usa no tienen ninguna escritura")
        void losPuertosSonDeSoloLectura() {
            // AC 4: «nada de esto escribe en catastro ni en rentas». Se comprueba en el TIPO: los
            // tres puertos que este contexto importa no declaran un solo metodo que escriba, asi
            // que no hay camino desde aqui al padron ni a las declaraciones.
            assertThat(metodosDe(pe.gob.sgtm.catastro.PadronDePredios.class))
                    .containsExactly("porSector");
            assertThat(metodosDe(pe.gob.sgtm.catastro.LectorDeFichas.class))
                    .containsExactlyInAnyOrder("fichaVigenteEn", "areaDeLaVersion");
            assertThat(metodosDe(pe.gob.sgtm.catastro.LectorDeCaracteristicas.class))
                    .containsExactly("de");
            assertThat(metodosDe(pe.gob.sgtm.rentas.DeclaracionesDelEjercicio.class))
                    .containsExactly("dePredios");
        }

        @Test
        @DisplayName("liquidar dos veces el mismo acta se rechaza: lo que toca es reliquidar")
        void liquidarDosVecesSeRechaza() {
            liquidarDe(E2024, E2024);
            assertThatThrownBy(() -> liquidarDe(E2024, E2024))
                    .isInstanceOf(LiquidarFiscalizacion.ActaYaLiquidada.class)
                    .hasMessageContaining("reliquidar");
        }
    }

    @Nested
    @DisplayName("La reliquidacion (AC 2) y el historico (AC 5)")
    class ReliquidacionEHistorico {

        @Test
        @DisplayName(
                "deja las dos versiones, la segunda referencia la primera, y explica el cambio")
        void dejaLasDosVersionesYExplica() {
            Liquidacion primera = liquidarDe(E2024, E2024);

            ReliquidarFiscalizacion.Resultado resultado =
                    reliquidar.reliquidar(
                            primera.numero(),
                            E2024,
                            E2024,
                            TipoDeFiscalizacion.CIERTA,
                            "Reinspeccion: el area medida era la del lote, no la construida",
                            List.of(
                                    new ReliquidarFiscalizacion.CorreccionDeLinea(
                                            E2024, null, AreaM2.de("180.00"), null, null)),
                            HOY,
                            OBSERVACION);

            assertThat(liquidaciones.versionesDeActa(actaId)).hasSize(2);
            assertThat(resultado.liquidacion().version()).isEqualTo(2);
            assertThat(resultado.liquidacion().liquidacionAnteriorId())
                    .isEqualTo(primera.identificador());
            assertThat(liquidaciones.lineasDe(primera.identificador()).get(0).areaHallada())
                    .as("la version anterior no cambia")
                    .isEqualTo(AreaM2.de("300.00"));
            assertThat(resultado.diferencia().cambios())
                    .anySatisfy(
                            cambio -> {
                                assertThat(cambio.concepto()).contains("area hallada");
                                assertThat(cambio.antes()).isEqualTo("300.00 m2");
                                assertThat(cambio.despues()).isEqualTo("180.00 m2");
                            });
        }

        @Test
        @DisplayName("la reliquidacion HEREDA el conjunto sellado de la linea anterior")
        void heredaElConjuntoSellado() {
            Liquidacion primera = liquidarDe(E2024, E2024);
            parametros.sellar(2024, 77L, 2);

            ReliquidarFiscalizacion.Resultado resultado =
                    reliquidar.reliquidar(
                            primera.numero(),
                            E2024,
                            E2024,
                            TipoDeFiscalizacion.CIERTA,
                            "Area corregida",
                            List.of(
                                    new ReliquidarFiscalizacion.CorreccionDeLinea(
                                            E2024, null, AreaM2.de("180.00"), null, null)),
                            HOY,
                            OBSERVACION);

            assertThat(
                            liquidaciones
                                    .lineasDe(resultado.liquidacion().identificador())
                                    .get(0)
                                    .conjuntoId())
                    .as(
                            "una reliquidacion corrige el contraste, no el marco normativo:"
                                    + " resolverlo otra vez mezclaria dos correcciones en una")
                    .isEqualTo(CONJUNTO_2024);
        }

        @Test
        @DisplayName("la condicion se recalcula, no se recibe")
        void laCondicionSeRecalcula() {
            Liquidacion primera = liquidarDe(E2024, E2024);

            ReliquidarFiscalizacion.Resultado resultado =
                    reliquidar.reliquidar(
                            primera.numero(),
                            E2024,
                            E2024,
                            TipoDeFiscalizacion.CIERTA,
                            "El area hallada era la declarada",
                            List.of(
                                    new ReliquidarFiscalizacion.CorreccionDeLinea(
                                            E2024, null, AreaM2.de("120.00"), null, null)),
                            HOY,
                            OBSERVACION);

            assertThat(
                            liquidaciones
                                    .lineasDe(resultado.liquidacion().identificador())
                                    .get(0)
                                    .condicion())
                    .as("con las dos superficies iguales ya no hay subvaluacion")
                    .isEqualTo(CondicionFiscalizada.CONFORME);
        }

        @Test
        @DisplayName("reliquidar una version ya sustituida se rechaza")
        void reliquidarUnaVersionYaSustituidaSeRechaza() {
            Liquidacion primera = liquidarDe(E2024, E2024);
            reliquidar.reliquidar(
                    primera.numero(),
                    E2024,
                    E2024,
                    TipoDeFiscalizacion.CIERTA,
                    "primera correccion",
                    List.of(),
                    HOY,
                    OBSERVACION);

            assertThatThrownBy(
                            () ->
                                    reliquidar.reliquidar(
                                            primera.numero(),
                                            E2024,
                                            E2024,
                                            TipoDeFiscalizacion.CIERTA,
                                            "segunda correccion sobre la primera",
                                            List.of(),
                                            HOY,
                                            OBSERVACION))
                    .isInstanceOf(ReliquidarFiscalizacion.NoEsLaUltimaVersion.class);
        }

        @Test
        @DisplayName("el historico reconstruye el proceso completo, con su diferencia (AC 5)")
        void elHistoricoReconstruyeElProceso() {
            Liquidacion primera = liquidarDe(E2024, E2024);
            reliquidar.reliquidar(
                    primera.numero(),
                    E2024,
                    E2024,
                    TipoDeFiscalizacion.CIERTA,
                    "Area corregida",
                    List.of(
                            new ReliquidarFiscalizacion.CorreccionDeLinea(
                                    E2024, null, AreaM2.de("180.00"), null, null)),
                    HOY,
                    OBSERVACION);

            List<ConsultaDeLiquidaciones.VersionDelProceso> proceso =
                    consulta.historicoDeActa(actaId);

            assertThat(proceso).hasSize(2);
            assertThat(proceso.get(0).version().liquidacion().version()).isEqualTo(1);
            assertThat(proceso.get(0).diferencia())
                    .as("la primera no tiene con que compararse")
                    .isNull();
            assertThat(proceso.get(1).diferencia()).isNotNull();
            assertThat(proceso.get(1).diferencia().cambios())
                    .anySatisfy(cambio -> assertThat(cambio.concepto()).contains("area hallada"));
            assertThat(proceso).allSatisfy(v -> assertThat(v.version().historial()).isNotEmpty());
            assertThat(proceso.get(1).version().estado()).isEqualTo(EstadoDeLiquidacion.ABIERTA);
        }

        @Test
        @DisplayName(
                "ampliar el periodo a un ejercicio que la version anterior no cubria se rechaza")
        void ampliarElPeriodoSeRechaza() {
            Liquidacion primera = liquidarDe(E2024, E2024);

            assertThatThrownBy(
                            () ->
                                    reliquidar.reliquidar(
                                            primera.numero(),
                                            E2024,
                                            E2025,
                                            TipoDeFiscalizacion.CIERTA,
                                            "ampliando",
                                            List.of(),
                                            HOY,
                                            OBSERVACION))
                    .isInstanceOf(ReliquidarFiscalizacion.EjercicioSinLineaAnterior.class)
                    .hasMessageContaining("2025");
        }
    }

    // ------------------------------------------------------------------

    private Liquidacion liquidarDe(Ejercicio desde, Ejercicio hasta) {
        return liquidar.liquidar(
                actaId,
                desde,
                hasta,
                TipoDeFiscalizacion.CIERTA,
                "Ampliacion detectada en inspeccion",
                null,
                HOY,
                OBSERVACION);
    }

    private static List<String> metodosDe(Class<?> puerto) {
        return java.util.Arrays.stream(puerto.getDeclaredMethods())
                .map(java.lang.reflect.Method::getName)
                .sorted()
                .toList();
    }
}
