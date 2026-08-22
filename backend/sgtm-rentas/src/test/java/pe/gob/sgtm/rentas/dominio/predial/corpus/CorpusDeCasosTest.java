package pe.gob.sgtm.rentas.dominio.predial.corpus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.fail;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.dominio.PoliticasDeRedondeo;
import pe.gob.sgtm.dominio.PuntoDeRedondeo;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.parametros.CaracteristicasDeLaPartida;
import pe.gob.sgtm.parametros.CatalogoDeReglas;
import pe.gob.sgtm.parametros.Concepto;
import pe.gob.sgtm.parametros.EntradaDeCalculo;
import pe.gob.sgtm.parametros.EstadoDelCalculo;
import pe.gob.sgtm.parametros.IdentificadorDeRegla;
import pe.gob.sgtm.parametros.MotorDeReglas;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.parametros.ReglaDeAgregacion;
import pe.gob.sgtm.parametros.ReglaTributaria;
import pe.gob.sgtm.parametros.ResultadoDelCalculo;
import pe.gob.sgtm.parametros.ResultadoDelContribuyente;
import pe.gob.sgtm.rentas.dominio.predial.RT001ValorDeTerreno;
import pe.gob.sgtm.rentas.dominio.predial.RT011BaseImponibleDelContribuyente;

/**
 * El corpus de casos de NEG-05, <b>ejecutable con la cifra en blanco</b> (E-5, #201).
 *
 * <p>#30 pedia «casos de prueba con las cifras esperadas en blanco». Escrito asi, un corpus sin
 * cifras no verifica nada: es una lista de deseos. Hay una forma en que si verifica: <b>se deja en
 * blanco la cifra, no las aristas del grafo</b>. Con parametros ficticios se comprueba hoy que un
 * caso aplica exactamente las reglas que declara, produce exactamente los conceptos que declara, y
 * que los parametros que declara son los que la regla pide <b>de verdad</b> —recogidos corriendola
 * con un conjunto vacio, no escritos a mano—.
 *
 * <p>Y para lo que todavia no se puede correr, el corpus es un <b>libro mayor</b>: cada caso dice
 * quien lo impide, y las cuentas cuadran en las dos direcciones. Un caso que se declara sin regla y
 * cuya regla si esta registrada pone esta prueba en rojo; uno que se declara fuera del motor
 * nombrando una clase que no existe, tambien.
 */
@DisplayName("Corpus de casos de NEG-05 (E-5)")
class CorpusDeCasosTest {

    /**
     * Las reglas que NEG-05 §2 <b>define</b>.
     *
     * <p>GOB-03 y #30 hablan de «{@code RT-001}…{@code RT-016}», que suena a dieciseis. Son
     * <b>doce</b>: NEG-05 §2 no define {@code RT-006} a {@code RT-009}, y los identificadores
     * quedan sin usar. Esta lista es el inventario real, y por eso la prueba exige un archivo por
     * cada una de estas y no por un rango.
     */
    private static final List<String> REGLAS_DE_NEG05 =
            List.of(
                    "RT-001", "RT-002", "RT-003", "RT-004", "RT-005", "RT-010", "RT-011", "RT-012",
                    "RT-013", "RT-014", "RT-015", "RT-016");

    /**
     * Los casos borde que NEG-05 §2 enumera, uno por uno.
     *
     * <p>NEG-05 §6 pide «resolucion de los <b>14</b> casos borde de §2» y en §2 hay
     * <b>diecisiete</b>: tres en RT-001, cuatro en el bloque RT-002/RT-004, cuatro en RT-011,
     * cuatro en RT-012 y dos en RT-014. El corpus los enumera para que el numero deje de estar en
     * discusion.
     */
    private static final List<String> CASOS_BORDE_DE_NEG05 =
            List.of(
                    "dos-vias-con-arancel-distinto",
                    "predio-sin-arancel-asignado",
                    "terreno-sin-habilitacion-urbana",
                    "construccion-en-curso",
                    "mas-de-un-material-predominante",
                    "antiguedad-mayor-al-maximo",
                    "ampliacion-con-antiguedad-distinta",
                    "copropiedad",
                    "predios-en-varias-municipalidades",
                    "sucesion-indivisa",
                    "poseedor-sin-titulo",
                    "pensionista-con-mas-de-un-predio",
                    "pensionista-a-mitad-de-ejercicio",
                    "deduccion-mayor-que-la-base",
                    "concurrencia-de-deducciones",
                    "base-cero-por-deduccion",
                    "predio-inafecto");

    /**
     * Las reglas registradas hoy. El corpus se mide contra esto, no contra lo que deberia haber.
     */
    private static final List<ReglaTributaria> REGLAS_DE_PARTIDA =
            List.of(new RT001ValorDeTerreno());

    private static final List<ReglaDeAgregacion> REGLAS_DE_AGREGACION =
            List.of(new RT011BaseImponibleDelContribuyente());

    /**
     * Ficticia y marcada como tal: ninguna cifra de aqui es una decision sobre D-03. Cubre todos
     * los puntos porque el corpus no sabe cual redondeara cada regla el dia que D-03c cierre.
     */
    private static final PoliticasDeRedondeo REDONDEO_FICTICIO = redondeoFicticio();

    private static final ValorNormativo VALOR_FICTICIO = ValorNormativo.de("1");

    private static List<CasoDelCorpus> todosLosCasos() {
        List<CasoDelCorpus> casos = new ArrayList<>();
        for (String regla : REGLAS_DE_NEG05) {
            casos.addAll(LectorDelCorpus.de(regla));
        }
        return casos;
    }

    // ------------------------------------------------------------------
    // Cobertura: que el corpus cubra lo que NEG-05 describe
    // ------------------------------------------------------------------

    @Test
    @DisplayName("cada regla que NEG-05 define tiene su archivo, con al menos un caso")
    void cadaReglaTieneSuArchivo() {
        for (String regla : REGLAS_DE_NEG05) {
            assertThat(LectorDelCorpus.de(regla)).describedAs("casos de %s", regla).isNotEmpty();
        }
    }

    @Test
    @DisplayName("cada caso borde de NEG-05 §2 tiene su fila, y ninguna fila inventa uno")
    void cadaCasoBordeTieneSuFila() {
        Set<String> declarados = new TreeSet<>();
        for (CasoDelCorpus caso : todosLosCasos()) {
            caso.casoBorde().ifPresent(declarados::add);
        }

        assertThat(declarados)
                .describedAs("casos borde cubiertos por el corpus")
                .containsExactlyInAnyOrderElementsOf(CASOS_BORDE_DE_NEG05);
    }

    @Test
    @DisplayName("el identificador de cada caso corresponde al archivo en el que vive")
    void elIdentificadorCorrespondeAlArchivo() {
        for (String regla : REGLAS_DE_NEG05) {
            for (CasoDelCorpus caso : LectorDelCorpus.de(regla)) {
                assertThat(caso.caso()).startsWith(regla + "-c");
                assertThat(caso.regla()).isEqualTo(regla);
            }
        }
    }

    // ------------------------------------------------------------------
    // El libro mayor: que el estado declarado sea el real
    // ------------------------------------------------------------------

    @Test
    @DisplayName("un caso «sin regla» cuya regla si esta registrada pone esto en rojo")
    void loQueSeDeclaraSinReglaNoEstaRegistrado() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.estado().clase() != EstadoDelCaso.Clase.SIN_REGLA) {
                continue;
            }
            List<String> queFaltan =
                    caso.reglasEsperadas().stream()
                            .filter(regla -> !estaRegistrada(regla))
                            .toList();
            assertThat(queFaltan)
                    .describedAs(
                            "%s se declara SIN_REGLA (%s) y todas las reglas que declara —%s— estan"
                                    + " registradas en el motor: el caso ya se puede correr, y el"
                                    + " corpus se quedo viejo",
                            caso.caso(), caso.estado(), caso.reglasEsperadas())
                    .isNotEmpty();
        }
    }

    @Test
    @DisplayName("un caso «fuera del motor» nombra una clase que existe y que el motor no registra")
    void loQueSeDeclaraFueraDelMotorExiste() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.estado().clase() != EstadoDelCaso.Clase.FUERA_DEL_MOTOR) {
                continue;
            }
            try {
                Class.forName(caso.estado().detalle());
            } catch (ClassNotFoundException noExiste) {
                fail(
                        "%s dice que su regla vive en %s y esa clase no existe"
                                .formatted(caso.caso(), caso.estado().detalle()));
            }
            for (String regla : caso.reglasEsperadas()) {
                assertThat(estaRegistrada(regla))
                        .describedAs(
                                "%s se declara fuera del motor y %s si esta registrada en el",
                                caso.caso(), regla)
                        .isFalse();
            }
        }
    }

    @Test
    @DisplayName("un caso «sin criterio» es un caso borde de NEG-05, no una regla que falta")
    void loQueNoTieneCriterioEsUnCasoBorde() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.estado().clase() != EstadoDelCaso.Clase.SIN_CRITERIO) {
                continue;
            }
            assertThat(caso.casoBorde())
                    .describedAs(
                            "%s dice que no hay criterio decidido; si no es un caso borde de"
                                    + " NEG-05 §2, lo que falta es otra cosa",
                            caso.caso())
                    .isPresent();
            assertThat(CASOS_BORDE_DE_NEG05).contains(caso.casoBorde().orElseThrow());
        }
    }

    @Test
    @DisplayName("todo caso ejecutable declara reglas que el motor tiene registradas")
    void loEjecutableEstaRegistrado() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.estado().clase() != EstadoDelCaso.Clase.EJECUTABLE
                    && caso.estado().clase() != EstadoDelCaso.Clase.FALLA_ESPERADA) {
                continue;
            }
            assertThat(caso.reglasEsperadas())
                    .describedAs("reglas de %s", caso.caso())
                    .isNotEmpty()
                    .allSatisfy(
                            regla ->
                                    assertThat(estaRegistrada(regla))
                                            .describedAs(
                                                    "%s se declara %s y %s no esta registrada",
                                                    caso.caso(), caso.estado(), regla)
                                            .isTrue());
        }
    }

    // ------------------------------------------------------------------
    // Las aristas: lo que si se puede comprobar hoy, sin una sola cifra
    // ------------------------------------------------------------------

    @Test
    @DisplayName(
            "un caso ejecutable aplica exactamente sus reglas y produce exactamente sus conceptos")
    void lasAristasDeclaradasSonLasQueElMotorRecorre() {
        for (CasoDelCorpus caso : ejecutables()) {
            Corrida corrida = correr(caso);

            assertThat(corrida.reglasAplicadas())
                    .describedAs("reglas aplicadas en %s", caso.caso())
                    .containsExactlyInAnyOrderElementsOf(caso.reglasEsperadas());
            assertThat(corrida.conceptosProducidos())
                    .describedAs("conceptos producidos en %s", caso.caso())
                    .containsExactlyInAnyOrderElementsOf(caso.conceptosEsperados());
        }
    }

    @Test
    @DisplayName("los parametros que un caso declara son los que la regla pide de verdad")
    void losParametrosDeclaradosSonLosQueLaReglaPide() {
        for (CasoDelCorpus caso : ejecutables()) {
            assertThat(correr(caso).parametrosPedidos())
                    .describedAs(
                            "parametros que %s pide de verdad, recogidos corriendola con un"
                                    + " conjunto vacio",
                            caso.caso())
                    .containsExactlyInAnyOrderElementsOf(caso.parametrosRequeridos());
        }
    }

    @Test
    @DisplayName("un caso que debe fallar falla, y con la excepcion que declara")
    void loQueDebeFallarFalla() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.estado().clase() != EstadoDelCaso.Clase.FALLA_ESPERADA) {
                continue;
            }
            String excepcion = caso.estado().detalle();
            assertThatThrownBy(() -> correrSinRellenarParametros(caso))
                    .describedAs("%s debe fallar con %s", caso.caso(), excepcion)
                    .satisfies(
                            fallo ->
                                    assertThat(fallo.getClass().getSimpleName())
                                            .isEqualTo(excepcion));
        }
    }

    @Test
    @DisplayName("una cifra esperada sin su fuente no se admite")
    void ningunaCifraSinFuente() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.esperado().isPresent()) {
                assertThat(caso.fuenteDelEsperado())
                        .describedAs(
                                "%s trae una cifra esperada sin decir de donde sale; sin fuente no"
                                        + " se distingue de una inventada",
                                caso.caso())
                        .isPresent();
            }
        }
    }

    @Test
    @DisplayName(
            "una cifra esperada se compara al centimo, y no se admite si los parametros son ficticios")
    void laCifraEsperadaSeComparaAlCentimo() {
        for (CasoDelCorpus caso : todosLosCasos()) {
            if (caso.esperado().isEmpty()) {
                continue;
            }
            assertThat(caso.estado().clase())
                    .describedAs(
                            "%s trae una cifra esperada y no es ejecutable: nadie la comprobaria",
                            caso.caso())
                    .isEqualTo(EstadoDelCaso.Clase.EJECUTABLE);
            assertThat(caso.parametrosRequeridos())
                    .describedAs(
                            "%s trae una cifra esperada y pide parametros que hoy se rellenan con"
                                    + " valores ficticios: compararla no probaria nada, y pasar en"
                                    + " verde seria peor que no tenerla. La comparacion al centimo"
                                    + " necesita el conjunto sellado real, que es D-02a",
                            caso.caso())
                    .isEmpty();

            Corrida corrida = correr(caso);
            Concepto ultimo =
                    Concepto.de(
                            caso.conceptosEsperados().get(caso.conceptosEsperados().size() - 1));
            assertThat(corrida.valores().get(ultimo.nombre()))
                    .describedAs("%s, al centimo", caso.caso())
                    .isEqualTo(Dinero.de(caso.esperado().orElseThrow()));
        }
    }

    @Test
    @DisplayName("el corpus dice cuantos casos siguen sin cifra, y por quien esperan")
    void elCorpusDiceCuantoFalta() {
        List<CasoDelCorpus> casos = todosLosCasos();
        long sinCifra = casos.stream().filter(CasoDelCorpus::sinCifra).count();
        Map<String, Long> porEstado =
                casos.stream()
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        c ->
                                                c.estado().clase()
                                                        + (c.estado().detalle().isEmpty()
                                                                ? ""
                                                                : ":" + c.estado().detalle()),
                                        java.util.TreeMap::new,
                                        java.util.stream.Collectors.counting()));

        System.out.println("Corpus de casos de NEG-05: " + casos.size() + " casos");
        System.out.println("  SIN_CIFRA: " + sinCifra + " — bajar este numero es D-02a avanzando");
        porEstado.forEach((estado, cuantos) -> System.out.println("  " + estado + ": " + cuantos));

        assertThat(casos).describedAs("el corpus no puede estar vacio").isNotEmpty();
        assertThat(sinCifra)
                .describedAs("hoy ninguna cifra esta cerrada: D-02a sigue abierta")
                .isEqualTo(casos.size());
    }

    // ------------------------------------------------------------------
    // Correr un caso
    // ------------------------------------------------------------------

    private record Corrida(
            List<String> reglasAplicadas,
            List<String> conceptosProducidos,
            Map<String, Dinero> valores,
            List<String> parametrosPedidos) {}

    private List<CasoDelCorpus> ejecutables() {
        return todosLosCasos().stream()
                .filter(c -> c.estado().clase() == EstadoDelCaso.Clase.EJECUTABLE)
                .toList();
    }

    /**
     * Corre el caso rellenando con valores ficticios los parametros que la regla vaya pidiendo, y
     * devuelve <b>que pidio</b>. Es lo que convierte la columna {@code parametros_requeridos} en
     * verificada: nadie la escribe a mano, se recoge.
     */
    private Corrida correr(CasoDelCorpus caso) {
        Set<String> pedidos = new LinkedHashSet<>();
        for (int intento = 0; intento <= pedidos.size() + 20; intento++) {
            try {
                Corrida corrida = correrCon(caso, pedidos);
                return new Corrida(
                        corrida.reglasAplicadas(),
                        corrida.conceptosProducidos(),
                        corrida.valores(),
                        List.copyOf(pedidos));
            } catch (ParametrosSellados.ParametroAusente falta) {
                if (!pedidos.add(falta.llave())) {
                    throw falta;
                }
            }
        }
        throw new IllegalStateException(
                "El caso " + caso.caso() + " sigue pidiendo parametros despues de 20 vueltas");
    }

    private Corrida correrSinRellenarParametros(CasoDelCorpus caso) {
        return correrCon(caso, Set.of());
    }

    private Corrida correrCon(CasoDelCorpus caso, Set<String> parametros) {
        Ejercicio ejercicio = new Ejercicio(caso.ejercicio());
        EntradaDeCalculo entrada =
                new EntradaDeCalculo(
                        ejercicio,
                        estadoDeclarado(caso),
                        caracteristicas(caso),
                        sellados(ejercicio, parametros),
                        REDONDEO_FICTICIO);

        boolean agrega = caso.reglasEsperadas().stream().anyMatch(this::esAgregacion);
        MotorDeReglas motor = new MotorDeReglas(catalogo());
        List<String> reglas = new ArrayList<>();
        List<String> conceptos = new ArrayList<>();
        Map<String, Dinero> valores = new java.util.LinkedHashMap<>();

        if (agrega) {
            ResultadoDelContribuyente resultado = motor.aplicarAlContribuyente(List.of(entrada));
            reglas.addAll(resultado.reglasComoTexto());
            for (ResultadoDelCalculo porPartida : resultado.porPartida()) {
                anadirProducidos(caso, porPartida.estado(), conceptos, valores);
            }
            anadirProducidos(caso, resultado.agregado(), conceptos, valores);
        } else {
            ResultadoDelCalculo resultado = motor.aplicarA(entrada);
            resultado.reglasAplicadas().forEach(r -> reglas.add(r.valor()));
            anadirProducidos(caso, resultado.estado(), conceptos, valores);
        }
        return new Corrida(
                List.copyOf(reglas), List.copyOf(conceptos), Map.copyOf(valores), List.of());
    }

    /** Lo que el calculo produjo: el estado menos lo que la partida ya traia declarado. */
    private void anadirProducidos(
            CasoDelCorpus caso,
            EstadoDelCalculo estado,
            List<String> conceptos,
            Map<String, Dinero> valores) {
        for (Concepto concepto : estado.conceptos()) {
            if (!caso.entradas().containsKey(concepto.nombre())) {
                conceptos.add(concepto.nombre());
                estado.valor(concepto).ifPresent(v -> valores.put(concepto.nombre(), v));
            }
        }
    }

    /**
     * El catalogo con el que se corre. <b>Todas</b> las reglas registradas de la fase que toca, no
     * solo las que el caso declara: si el motor aplicara una que el caso no espera, la prueba tiene
     * que verlo.
     */
    private CatalogoDeReglas catalogo() {
        CatalogoDeReglas catalogo = CatalogoDeReglas.vacio();
        for (ReglaTributaria regla : REGLAS_DE_PARTIDA) {
            catalogo = catalogo.con(regla);
        }
        for (ReglaDeAgregacion regla : REGLAS_DE_AGREGACION) {
            catalogo = catalogo.con(regla);
        }
        return catalogo;
    }

    private EstadoDelCalculo estadoDeclarado(CasoDelCorpus caso) {
        EstadoDelCalculo estado = EstadoDelCalculo.vacio();
        for (Map.Entry<String, String> entrada : caso.entradas().entrySet()) {
            estado = estado.mas(Concepto.de(entrada.getKey()), Dinero.de(entrada.getValue()));
        }
        return estado;
    }

    private CaracteristicasDeLaPartida caracteristicas(CasoDelCorpus caso) {
        if (caso.caracteristicas().isEmpty()) {
            return CaracteristicasDeLaPartida.ninguna();
        }
        CaracteristicasDeLaPartida.Constructor constructor = null;
        for (Map.Entry<String, String> par : caso.caracteristicas().entrySet()) {
            constructor =
                    constructor == null
                            ? CaracteristicasDeLaPartida.de(par.getKey(), par.getValue())
                            : constructor.y(par.getKey(), par.getValue());
        }
        return java.util.Objects.requireNonNull(constructor).construir();
    }

    private ParametrosSellados sellados(Ejercicio ejercicio, Set<String> llaves) {
        ParametrosSellados.Constructor constructor = ParametrosSellados.de(ejercicio, 1);
        for (String llave : llaves) {
            int corte = llave.indexOf(':');
            String tipo = corte < 0 ? llave : llave.substring(0, corte);
            String clave = corte < 0 ? null : llave.substring(corte + 1);
            constructor.numero(tipo, clave, VALOR_FICTICIO);
        }
        return constructor.construir();
    }

    private boolean esAgregacion(String regla) {
        return REGLAS_DE_AGREGACION.stream()
                .anyMatch(r -> r.identificador().equals(IdentificadorDeRegla.de(regla)));
    }

    private boolean estaRegistrada(String regla) {
        IdentificadorDeRegla identificador = IdentificadorDeRegla.de(regla);
        return REGLAS_DE_PARTIDA.stream().anyMatch(r -> r.identificador().equals(identificador))
                || REGLAS_DE_AGREGACION.stream()
                        .anyMatch(r -> r.identificador().equals(identificador));
    }

    private static PoliticasDeRedondeo redondeoFicticio() {
        PoliticasDeRedondeo.Constructor constructor = PoliticasDeRedondeo.construir();
        for (PuntoDeRedondeo punto : PuntoDeRedondeo.values()) {
            constructor.en(punto, new PoliticaDeRedondeo(2, RoundingMode.HALF_UP));
        }
        return constructor.construir();
    }
}
