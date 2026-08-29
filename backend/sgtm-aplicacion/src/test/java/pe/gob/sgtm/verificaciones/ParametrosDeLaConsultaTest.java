package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.lang.reflect.RecordComponent;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * El contrato y el controlador tienen que decir lo mismo sobre <b>por donde viajan los datos</b>
 * (#399).
 *
 * <p>{@link ContratoDeApiTest} compara <b>rutas</b>: si el verbo y el camino existen en los dos
 * lados, da la operacion por publicada. Eso deja pasar un desajuste que no se ve hasta integrar y
 * que no produce ningun error de compilacion en ninguna de las dos mitades: el contrato declara un
 * dato {@code in: query} y el controlador lo lee del <b>cuerpo</b>. La peticion que la interfaz
 * sabe construir —los filtros de una pantalla viajan por la URL, en las 134— llega entonces con ese
 * dato nulo, y el backend contesta «falta el objetivo del calculo» o, peor, calcula sobre lo que no
 * se le pidio.
 *
 * <p>Es exactamente lo que le pasaba a {@code POST /rentas/vehicular/calculo} desde #32: estaba en
 * {@code IMPLEMENTADAS}, el recuento decia que existia, y ninguna pantalla podia llamarla.
 *
 * <h2>Las dos comprobaciones</h2>
 *
 * <ul>
 *   <li>{@link #POR_LA_CONSULTA} es la tabla de las operaciones cuyos datos <b>tienen</b> que poder
 *       mandarse por la consulta. Se comprueba en <b>las dos direcciones</b>: el contrato los
 *       declara {@code in: query} y el controlador los lee con {@code @RequestParam}. Separar
 *       cualquiera de las dos mitades pone la prueba en rojo.
 *   <li>La regla general: <b>ningun dato que el contrato declare {@code in: query} puede leerse
 *       solo del cuerpo</b>. Se aplica a todo controlador publicado, con la lista {@link
 *       #EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO} de las que lo arrastran y todavia no se han corregido
 *       —cada una con su motivo—. Esa lista es el censo de la deuda: se acorta, nunca se alarga sin
 *       decir por que.
 * </ul>
 */
@DisplayName("Por donde viajan los datos: contrato y controlador (docs/50-api)")
class ParametrosDeLaConsultaTest {

    private static final String RAIZ = "/api/v1";

    /**
     * Lo que <b>tiene</b> que poder viajar por la consulta, operacion por operacion.
     *
     * <p>Una entrada aqui es una promesa de las dos mitades a la vez, y por eso cuesta una linea:
     * el contrato declara esos parametros {@code in: query} y el controlador los lee de ahi. Que el
     * controlador los acepte <b>ademas</b> en el cuerpo no es un incumplimiento —es lo que hacen
     * {@code PredialController} y {@code VehicularController}, y lo que deja funcionar al cliente
     * viejo—; lo que no puede es leerlos <b>solo</b> del cuerpo.
     */
    private static final Map<String, Set<String>> POR_LA_CONSULTA =
            Map.of(
                    // #395 — la capa web de la determinacion predial. Los dos filtros que la
                    // pantalla dibuja y que deciden la cifra: de quien y de que ano.
                    "POST /rentas/predial/calculo-individual", Set.of("codContribuyente", "ano"),
                    // #399 — el calculo vehicular. Los tres filtros de la pantalla: los dos que
                    // resuelven el objetivo (placa o contribuyente) y el ejercicio. `simulacion` no
                    // esta y no es un olvido: no identifica lo que se calcula, decide si la
                    // operacion escribe, asi que va en el cuerpo (ver VehicularController).
                    "POST /rentas/vehicular/calculo",
                            Set.of("placa", "codContribuyente", "ejercicio"));

    /**
     * Las operaciones que todavia leen del cuerpo un dato que el contrato declara de consulta.
     *
     * <p>Es el censo que #399 destapo al medirlo: el desajuste del calculo vehicular no era unico,
     * eran <b>nueve</b>. Las ocho que quedan estan aqui con lo que leen. Siete no estan conectadas
     * todavia en la interfaz —por eso nadie lo habia notado— y la octava lo esta pagandolo de otra
     * manera, ver su comentario. Cada una se saca de esta lista el dia que su issue de conexion la
     * corrija, igual que #399 saco al vehicular.
     *
     * <p><b>No se alarga sin motivo escrito.</b> Anadir una entrada aqui es declarar que una
     * pantalla no va a poder llamar a su operacion.
     */
    private static final Map<String, Set<String>> EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO =
            Map.of(
                    "POST /coactiva/liquidaciones-costas", Set.of("nroExpedCoact"),
                    "POST /coactiva/rec/impresion", Set.of("proyectarInteresAl"),
                    "POST /fiscalizacion/programas", Set.of("tipo"),
                    "POST /fiscalizacion/vehicular", Set.of("hallazgo"),
                    "POST /infracciones/administrativas/notificaciones", Set.of("numero"),
                    "POST /tesoreria/caja/tasas", Set.of("codContribuyente"),
                    "POST /transito/descargos", Set.of("nDeExpediente", "papeleta"),
                    "POST /valores/{nro}/notificacion", Set.of("notificador", "resultado"),
                    // La unica de las ocho que SI esta conectada (#332), y funciona porque la
                    // interfaz se adapto al controlador: `escrituras.ts` manda los tres en el
                    // cuerpo, dentro de la tabla `cuotas` y su `contexto`. El contrato sigue
                    // prometiendo la consulta, asi que el desajuste sigue ahi —solo que hoy lo
                    // paga quien lea el YAML, no la pantalla—.
                    "POST /rentas/deuda/bajas", Set.of("codContribuyente", "tributo", "ano"));

    /** Una ruta del contrato: {@code "/ruta":} con dos espacios de sangria. */
    private static final Pattern RUTA_DEL_CONTRATO = Pattern.compile("  \"(/[^\"]*)\":");

    /** Un verbo dentro de la ruta actual, con cuatro espacios de sangria. */
    private static final Pattern VERBO_DEL_CONTRATO =
            Pattern.compile("    (get|post|put|patch|delete):");

    /** El nombre de un parametro, con ocho espacios de sangria: {@code - name: placa}. */
    private static final Pattern NOMBRE_DEL_PARAMETRO = Pattern.compile("        - name: (\\S+)");

    /** Donde viaja ese parametro: {@code in: query} con diez. */
    private static final Pattern DONDE_VIAJA = Pattern.compile("          in: (\\S+)");

    @Test
    @DisplayName("el contrato se lee, y trae parametros de consulta que comparar")
    void elContratoSeLee() throws IOException {
        Map<String, Set<String>> contrato = parametrosDeConsultaDelContrato();

        assertThat(contrato).as("sin operaciones no hay nada que comparar").hasSizeGreaterThan(100);
        assertThat(contrato.get("POST /rentas/vehicular/calculo"))
                .as("la pantalla del calculo vehicular declara sus tres filtros")
                .containsExactlyInAnyOrder("placa", "codContribuyente", "ejercicio");
    }

    @Test
    @DisplayName("lo que viaja por la consulta lo declara el contrato como parametro de consulta")
    void elContratoLoDeclaraDeConsulta() throws IOException {
        Map<String, Set<String>> contrato = parametrosDeConsultaDelContrato();

        Map<String, Set<String>> faltan = new TreeMap<>();
        POR_LA_CONSULTA.forEach(
                (operacion, exigidos) -> {
                    Set<String> declarados = contrato.getOrDefault(operacion, Set.of());
                    Set<String> sinDeclarar = new TreeSet<>(exigidos);
                    sinDeclarar.removeAll(declarados);
                    if (!sinDeclarar.isEmpty()) {
                        faltan.put(operacion, sinDeclarar);
                    }
                });

        assertThat(faltan)
                .as(
                        "el contrato tiene que declarar «in: query» lo que el controlador lee de la"
                                + " consulta. Si se quitan de ahi, la pantalla deja de poder mandarlos y"
                                + " nadie se entera hasta integrar. El contrato se corrige en"
                                + " docs/50-api/generar-openapi.mjs, nunca a mano")
                .isEmpty();
    }

    @Test
    @DisplayName("y el controlador los lee de la consulta, no solo del cuerpo")
    void elControladorLosLeeDeLaConsulta() {
        Map<String, Handler> publicados = handlersPublicados();

        Map<String, Set<String>> faltan = new TreeMap<>();
        POR_LA_CONSULTA.forEach(
                (operacion, exigidos) -> {
                    Handler handler = publicados.get(operacion);
                    assertThat(handler)
                            .as("la operacion %s no esta publicada", operacion)
                            .isNotNull();
                    Set<String> sinLeer = new TreeSet<>(exigidos);
                    sinLeer.removeAll(handler == null ? Set.of() : handler.deLaConsulta());
                    if (!sinLeer.isEmpty()) {
                        faltan.put(operacion, sinLeer);
                    }
                });

        assertThat(faltan)
                .as(
                        "estos datos los declara el contrato «in: query» y el controlador no los lee"
                                + " de la consulta: la peticion que la interfaz sabe construir llegaria"
                                + " con ellos nulos. Se leen con @RequestParam, y se puede seguir"
                                + " aceptando el cuerpo (ver PredialController y VehicularController)")
                .isEmpty();
    }

    @Test
    @DisplayName("ningun dato del contrato «in: query» se lee solo del cuerpo")
    void ningunDatoDeConsultaSeLeeSoloDelCuerpo() throws IOException {
        Map<String, Set<String>> contrato = parametrosDeConsultaDelContrato();
        Map<String, Handler> publicados = handlersPublicados();

        Map<String, Set<String>> desajustados = new TreeMap<>();
        publicados.forEach(
                (operacion, handler) -> {
                    Set<String> soloEnElCuerpo = new TreeSet<>(handler.delCuerpo());
                    soloEnElCuerpo.retainAll(contrato.getOrDefault(operacion, Set.of()));
                    soloEnElCuerpo.removeAll(handler.deLaConsulta());
                    soloEnElCuerpo.removeAll(
                            EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO.getOrDefault(operacion, Set.of()));
                    if (!soloEnElCuerpo.isEmpty()) {
                        desajustados.put(operacion, soloEnElCuerpo);
                    }
                });

        assertThat(desajustados)
                .as(
                        "el contrato declara estos datos «in: query» y el controlador solo los lee"
                                + " del cuerpo. Es el defecto de #399: la operacion figura publicada y"
                                + " ninguna pantalla puede llamarla. O el controlador los lee tambien de"
                                + " la consulta, o se anotan en EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO con"
                                + " su motivo")
                .isEmpty();
    }

    @Test
    @DisplayName("el censo de lo abierto no miente: cada entrada sigue estando desajustada")
    void elCensoNoMiente() throws IOException {
        Map<String, Set<String>> contrato = parametrosDeConsultaDelContrato();
        Map<String, Handler> publicados = handlersPublicados();

        Map<String, Set<String>> yaCorregidas = new TreeMap<>();
        EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO.forEach(
                (operacion, nombres) -> {
                    Handler handler = publicados.get(operacion);
                    assertThat(handler)
                            .as("%s ya no se publica: sobra del censo", operacion)
                            .isNotNull();
                    Set<String> sinDesajuste = new TreeSet<>(nombres);
                    if (handler != null) {
                        sinDesajuste.retainAll(contrato.getOrDefault(operacion, Set.of()));
                        sinDesajuste.retainAll(handler.delCuerpo());
                        sinDesajuste.removeAll(handler.deLaConsulta());
                    }
                    if (!sinDesajuste.equals(new TreeSet<>(nombres))) {
                        yaCorregidas.put(operacion, new TreeSet<>(nombres));
                    }
                });

        assertThat(yaCorregidas)
                .as(
                        "estas entradas del censo ya no describen ningun desajuste: se corrigieron y"
                                + " nadie las quito. Una lista de deuda que no se acorta deja de decir"
                                + " cuanta deuda hay")
                .isEmpty();
    }

    @Test
    @DisplayName("todo cuerpo publicado es un record, o la regla de arriba deja de verlo")
    void todoCuerpoPublicadoEsUnRecord() {
        List<String> sinForma = new ArrayList<>();
        for (Method metodo : handlersConCuerpo()) {
            for (Parameter parametro : metodo.getParameters()) {
                if (parametro.getAnnotation(RequestBody.class) == null
                        || parametro.getType().isRecord()) {
                    continue;
                }
                sinForma.add(
                        metodo.getDeclaringClass().getSimpleName()
                                + "#"
                                + metodo.getName()
                                + " lee el cuerpo como "
                                + parametro.getType().getSimpleName());
            }
        }

        assertThat(sinForma)
                .as(
                        "la regla de arriba compara los campos del cuerpo con los parametros de"
                                + " consulta del contrato, y los campos de un cuerpo solo se pueden"
                                + " enumerar si es un record. Un cuerpo leido como Map o como clase con"
                                + " setters no aporta ningun nombre: la comprobacion pasaria en VERDE"
                                + " sin mirar nada, que es la forma en que esta regla dejaria de"
                                + " proteger sin que nadie se entere. Ademas es la «lista blanca» que"
                                + " cada controlador declara: lo que no esta en el record no entra")
                .isEmpty();
    }

    // ------------------------------------------------------------------

    /** Lo que un handler publicado sabe leer: de la consulta, y del cuerpo. */
    private record Handler(Set<String> deLaConsulta, Set<String> delCuerpo) {}

    private static Map<String, Set<String>> parametrosDeConsultaDelContrato() throws IOException {
        List<String> lineas =
                Files.readAllLines(
                        raizDelRepositorio().resolve("docs/50-api/openapi/sgtm-v1.yaml"),
                        StandardCharsets.UTF_8);

        Map<String, Set<String>> porOperacion = new TreeMap<>();
        String rutaActual = null;
        String operacionActual = null;
        for (int i = 0; i < lineas.size(); i++) {
            String linea = lineas.get(i);
            Matcher ruta = RUTA_DEL_CONTRATO.matcher(linea);
            if (ruta.matches()) {
                rutaActual = ruta.group(1);
                operacionActual = null;
                continue;
            }
            Matcher verbo = VERBO_DEL_CONTRATO.matcher(linea);
            if (verbo.matches() && rutaActual != null) {
                operacionActual = verbo.group(1).toUpperCase(Locale.ROOT) + " " + rutaActual;
                porOperacion.computeIfAbsent(operacionActual, clave -> new TreeSet<>());
                continue;
            }
            Matcher nombre = NOMBRE_DEL_PARAMETRO.matcher(linea);
            if (nombre.matches() && operacionActual != null && viajaEnLaConsulta(lineas, i)) {
                porOperacion.get(operacionActual).add(nombre.group(1));
            }
        }
        return porOperacion;
    }

    /**
     * El {@code in:} del parametro que empieza en esa linea.
     *
     * <p>Se mira hacia adelante en vez de con un solo regex porque el parametro son varias lineas
     * —{@code name}, {@code in}, {@code required}, {@code description}, {@code schema}— y el orden
     * no es parte del contrato.
     */
    private static boolean viajaEnLaConsulta(List<String> lineas, int desde) {
        for (int i = desde + 1; i < lineas.size() && lineas.get(i).startsWith("          "); i++) {
            Matcher donde = DONDE_VIAJA.matcher(lineas.get(i));
            if (donde.matches()) {
                return "query".equals(donde.group(1));
            }
        }
        return false;
    }

    /** Los metodos publicados de todo {@code @RestController}, sin agrupar por operacion. */
    private static List<Method> handlersConCuerpo() {
        List<Method> handlers = new ArrayList<>();
        for (JavaClass clase : ReglasDeArquitectura.clasesDeProduccion()) {
            Class<?> tipo = clase.reflect();
            if (!AnnotatedElementUtils.hasAnnotation(tipo, RestController.class)) {
                continue;
            }
            for (Method metodo : tipo.getDeclaredMethods()) {
                if (AnnotatedElementUtils.findMergedAnnotation(metodo, RequestMapping.class)
                        != null) {
                    handlers.add(metodo);
                }
            }
        }
        return handlers;
    }

    private static Map<String, Handler> handlersPublicados() {
        Map<String, Handler> publicados = new LinkedHashMap<>();
        for (JavaClass clase : ReglasDeArquitectura.clasesDeProduccion()) {
            Class<?> tipo = clase.reflect();
            if (!AnnotatedElementUtils.hasAnnotation(tipo, RestController.class)) {
                continue;
            }
            RequestMapping deLaClase =
                    AnnotatedElementUtils.findMergedAnnotation(tipo, RequestMapping.class);
            String base = deLaClase == null ? "" : primero(deLaClase.path());

            for (Method metodo : tipo.getDeclaredMethods()) {
                RequestMapping mapeo =
                        AnnotatedElementUtils.findMergedAnnotation(metodo, RequestMapping.class);
                if (mapeo == null) {
                    continue;
                }
                String ruta = sinRaiz(base + primero(mapeo.path()));
                Handler handler = new Handler(nombresDeConsulta(metodo), nombresDelCuerpo(metodo));
                for (RequestMethod verbo : verbos(mapeo)) {
                    publicados.put(verbo.name() + " " + ruta, handler);
                }
            }
        }
        return publicados;
    }

    /** Los {@code @RequestParam} del metodo, con el nombre con el que viajan. */
    private static Set<String> nombresDeConsulta(Method metodo) {
        Set<String> nombres = new LinkedHashSet<>();
        for (Parameter parametro : metodo.getParameters()) {
            RequestParam anotacion = parametro.getAnnotation(RequestParam.class);
            if (anotacion == null) {
                continue;
            }
            String declarado = anotacion.name().isEmpty() ? anotacion.value() : anotacion.name();
            nombres.add(declarado.isEmpty() ? parametro.getName() : declarado);
        }
        return nombres;
    }

    /**
     * Los campos del {@code @RequestBody}, cuando es un record.
     *
     * <p>Un record es la forma que tienen todos los cuerpos del proyecto —la «lista blanca» de cada
     * controlador— y sus componentes son, letra por letra, las claves del JSON. Un cuerpo que no
     * sea un record no aporta nombres: no hay nada que comparar, y suponerlos seria peor.
     */
    private static Set<String> nombresDelCuerpo(Method metodo) {
        Set<String> nombres = new LinkedHashSet<>();
        for (Parameter parametro : metodo.getParameters()) {
            if (parametro.getAnnotation(RequestBody.class) == null) {
                continue;
            }
            Class<?> tipo = parametro.getType();
            if (!tipo.isRecord()) {
                continue;
            }
            for (RecordComponent componente : tipo.getRecordComponents()) {
                nombres.add(componente.getName());
            }
        }
        return nombres;
    }

    private static Set<RequestMethod> verbos(RequestMapping mapeo) {
        Set<RequestMethod> verbos = new LinkedHashSet<>(List.of(mapeo.method()));
        if (verbos.isEmpty()) {
            verbos.add(RequestMethod.GET);
        }
        return verbos;
    }

    private static String primero(String[] rutas) {
        return rutas.length == 0 ? "" : rutas[0];
    }

    private static String sinRaiz(String ruta) {
        return ruta.startsWith(RAIZ) ? ruta.substring(RAIZ.length()) : ruta;
    }

    private static Path raizDelRepositorio() {
        Path actual = Path.of("").toAbsolutePath();
        List<Path> intentos = new ArrayList<>();
        while (actual != null) {
            intentos.add(actual);
            if (Files.exists(actual.resolve("docs/50-api/openapi/sgtm-v1.yaml"))) {
                return actual;
            }
            actual = actual.getParent();
        }
        throw new IllegalStateException(
                "No se encontro la raiz del repositorio buscando hacia arriba: " + intentos);
    }
}
