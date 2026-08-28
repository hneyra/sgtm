package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lo que el backend publica y lo que el contrato promete tienen que ser lo mismo.
 *
 * <p>{@code docs/50-api/openapi/sgtm-v1.yaml} no es documentacion escrita despues: esta derivado de
 * los {@code endpoint} que declara cada una de las 134 pantallas del prototipo, y el frontend lo
 * consume. Un endpoint que publique una ruta que el contrato no tiene es una ruta que ninguna
 * pantalla va a llamar; una ruta del contrato con una forma distinta a la implementada es una
 * pantalla que se rompe en integracion, semanas despues de escribir las dos mitades.
 *
 * <p>La prueba cubre <b>las dos direcciones</b>:
 *
 * <ul>
 *   <li>Toda ruta publicada tiene que estar en el contrato. Si alguien inventa una, falla.
 *   <li>Toda ruta de {@link #IMPLEMENTADAS} tiene que estar publicada. Esa lista es el registro
 *       explicito de lo que ya existe: no se puede publicar un endpoint sin anotarlo ahi, ni
 *       retirarlo sin quitarlo. Las 133 operaciones restantes del contrato estan pendientes, y no
 *       se pueden exigir todavia sin dejar el build en rojo permanente —que es la forma segura de
 *       que nadie vuelva a mirar esta prueba—.
 * </ul>
 */
@DisplayName("ARQ-05 — Contrato de la API")
class ContratoDeApiTest {

    /** Raiz declarada en {@code servers.url} del contrato. */
    private static final String RAIZ = "/api/v1";

    /**
     * Las operaciones del contrato que ya estan implementadas.
     *
     * <p>Se agrega una linea por endpoint nuevo. Es deliberado que cueste una linea: asi el diff de
     * un endpoint nuevo dice que operacion del manual cubre.
     */
    private static final Set<String> IMPLEMENTADAS =
            Set.of(
                    "GET /catastro/vias",
                    "POST /catastro/vias",
                    "PUT /catastro/vias/{codigo}",
                    "GET /rentas/vehiculos/{placa}",
                    "GET /catastro/sectores",
                    "POST /catastro/sectores",
                    "PUT /catastro/sectores/{codigo}",
                    "POST /catastro/sectores/{codigo}/manzanas",
                    "GET /catastro/fichas/urbana/{codRefCatastral}",
                    "GET /catastro/fichas/economica/{codRefCatastral}",
                    "GET /catastro/fichas/bienes-comunes/{codEdificacion}",
                    "GET /catastro/fichas/rural/{codUnidad}",
                    "GET /catastro/fichas",
                    "GET /catastro/contribuyentes/{codigo}/ficha.pdf",
                    "POST /catastro/fichas/urbana",
                    "POST /catastro/fichas/economica",
                    "POST /catastro/fichas/bienes-comunes",
                    "POST /catastro/fichas/rural",
                    "PUT /catastro/fichas/{codigo}/actualizacion",
                    "PUT /catastro/fichas/economica/{codRefCatastral}/actualizacion",
                    "PUT /catastro/fichas/bienes-comunes/{codEdificacion}/actualizacion",
                    "PUT /catastro/fichas/rural/{codUnidad}/actualizacion",
                    "GET /catastro/tablas/aranceles",
                    "GET /catastro/tablas/valores-unitarios",
                    "GET /catastro/tablas/depreciacion",
                    "GET /rentas/contribuyentes",
                    "GET /rentas/beneficios",
                    "GET /rentas/arbitrios",
                    "GET /rentas/declaraciones/{djNro}",
                    "POST /rentas/transferencias/predio",
                    "POST /rentas/transferencias/vehiculo",
                    "POST /rentas/vehicular/calculo",
                    "POST /rentas/alcabala",
                    "POST /rentas/espectaculos",
                    "GET /consultas/cuenta-corriente/{codigo}",
                    "GET /consultas/deuda",
                    "GET /consultas/altas-bajas",
                    "GET /consultas/constancias/no-adeudo",
                    "GET /consultas/vehiculos",
                    "GET /consultas/pagos",
                    "GET /consultas/predios",
                    "GET /consultas/valores",
                    "GET /consultas/resumen-predial",
                    "GET /consultas/unificada",
                    "POST /rentas/deuda/altas",
                    "POST /rentas/deuda/bajas",
                    "GET /seguridad/modulos",
                    "GET /seguridad/accesos",
                    "GET /seguridad/grupos",
                    "GET /seguridad/usuarios",
                    "POST /seguridad/grupos/{grupo}/miembros",
                    "PUT /seguridad/grupos/{id}/permisos",
                    "GET /seguridad/grupos/{id}/permisos",
                    "GET /seguridad/sesion/permisos",
                    "PUT /seguridad/sesion/ejercicio",
                    "PUT /seguridad/usuarios/{id}/clave",
                    "GET /seguridad/auditoria",
                    "POST /seguridad/respaldos",
                    "GET /seguridad/parametros",
                    "GET /transito/codigos",
                    "GET /infracciones/cuis",
                    "GET /infracciones/administrativas/codigos/reporte",
                    "POST /fiscalizacion/programas",
                    "POST /fiscalizacion/predial/actas",
                    "POST /fiscalizacion/vehicular",
                    "GET /transito/papeletas",
                    "GET /transito/papeletas/busqueda",
                    "PATCH /transito/papeletas/{numero}/codigo",
                    "GET /transito/estado-cuenta",
                    "POST /infracciones/administrativas/notificaciones",
                    "GET /infracciones/actas",
                    "GET /infracciones/administrativas/estado-cuenta",
                    "GET /infracciones/administrativas/reportes/vencidas",
                    "GET /infracciones/administrativas/reportes/por-contribuyente",
                    "POST /valores",
                    "GET /valores",
                    "POST /valores/masivo",
                    "POST /valores/{nro}/notificacion",
                    "POST /coactiva/prescripcion",
                    "POST /valores/{numero}/movimientos",
                    "POST /tesoreria/caja/cobranza",
                    "POST /tesoreria/caja/tasas",
                    "GET /tesoreria/recibos/{nro}/duplicado",
                    "POST /tesoreria/recibos/{nro}/anulacion",
                    "POST /tesoreria/fraccionamientos",
                    "GET /tesoreria/convenios",
                    "POST /tesoreria/convenios/{numero}/anulacion",
                    "POST /tesoreria/caja/cierre",
                    "GET /tesoreria/recaudacion/avance",
                    "GET /tesoreria/recaudacion/por-area",
                    "GET /coactiva/expedientes",
                    "POST /coactiva/expedientes/importacion",
                    "PATCH /coactiva/expedientes/{numero}/estados",
                    "PATCH /coactiva/expedientes/{numero}/direccion-referencial",
                    "POST /coactiva/rec/impresion",
                    "GET /coactiva/expedientes/{numero}/proceso",
                    "POST /coactiva/expedientes/{numero}/actos",
                    "POST /coactiva/notificaciones");

    /** Una ruta del contrato: {@code "/ruta":} con dos espacios de sangria, nada mas. */
    private static final Pattern RUTA_DEL_CONTRATO = Pattern.compile("  \"(/[^\"]*)\":");

    /**
     * Un verbo dentro de la ruta actual: {@code verbo:} con cuatro espacios de sangria.
     *
     * <p>Una ruta puede declarar mas de un verbo —{@code permisos} lee y guarda en la misma ruta,
     * {@code GET} para cargar la matriz y {@code PUT} para guardarla—, asi que esto no puede ser
     * parte de un solo regex por ruta: hay que seguir mirando lineas hasta la siguiente ruta.
     */
    private static final Pattern VERBO_DEL_CONTRATO =
            Pattern.compile("    (get|post|put|patch|delete):");

    @Test
    @DisplayName("el contrato se lee, y trae las 134 operaciones del manual")
    void elContratoSeLee() throws IOException {
        Set<String> contrato = operacionesDelContrato();

        // Si el analisis del YAML devolviera vacio, las dos pruebas de abajo pasarian
        // sin comparar nada. Ha pasado en otros proyectos con un cambio de formato.
        assertThat(contrato)
                .as("el contrato declara una operacion por opcion del menu")
                .hasSizeGreaterThan(100);
        assertThat(contrato).contains("GET /catastro/vias");
    }

    @Test
    @DisplayName("ninguna ruta publicada falta en el contrato")
    void ningunaRutaPublicadaFaltaEnElContrato() throws IOException {
        Set<String> contrato = operacionesDelContrato();
        Set<String> publicadas = operacionesPublicadas();

        assertThat(publicadas).as("sin endpoints publicados no hay nada que comparar").isNotEmpty();

        Set<String> fueraDelContrato = new TreeSet<>(publicadas);
        fueraDelContrato.removeAll(contrato);

        assertThat(fueraDelContrato)
                .as(
                        "estas rutas se publican y el contrato no las tiene: ninguna pantalla las va"
                                + " a llamar. O se agregan al prototipo y se regenera el contrato, o"
                                + " sobran")
                .isEmpty();
    }

    @Test
    @DisplayName("toda operacion declarada implementada esta realmente publicada")
    void todaOperacionDeclaradaImplementadaEstaPublicada() throws IOException {
        Set<String> publicadas = operacionesPublicadas();

        assertThat(publicadas)
                .as("lo que IMPLEMENTADAS promete tiene que existir de verdad")
                .containsAll(IMPLEMENTADAS);
        assertThat(operacionesDelContrato())
                .as("y tiene que ser una operacion que el contrato declare")
                .containsAll(IMPLEMENTADAS);
        assertThat(publicadas)
                .as(
                        "hay endpoints publicados que no estan en IMPLEMENTADAS: un endpoint nuevo"
                                + " se anota ahi, para que el diff diga que opcion del manual cubre")
                .isSubsetOf(IMPLEMENTADAS);
    }

    // ------------------------------------------------------------------

    private static Set<String> operacionesDelContrato() throws IOException {
        List<String> lineas =
                Files.readAllLines(
                        raizDelRepositorio().resolve("docs/50-api/openapi/sgtm-v1.yaml"),
                        StandardCharsets.UTF_8);

        Set<String> operaciones = new TreeSet<>();
        String rutaActual = null;
        for (String linea : lineas) {
            Matcher ruta = RUTA_DEL_CONTRATO.matcher(linea);
            if (ruta.matches()) {
                rutaActual = ruta.group(1);
                continue;
            }
            Matcher verbo = VERBO_DEL_CONTRATO.matcher(linea);
            if (verbo.matches() && rutaActual != null) {
                operaciones.add(
                        verbo.group(1).toUpperCase(java.util.Locale.ROOT) + " " + rutaActual);
            }
        }
        return operaciones;
    }

    private static Set<String> operacionesPublicadas() {
        Set<String> operaciones = new TreeSet<>();
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
                String ruta = base + primero(mapeo.path());
                for (RequestMethod verbo : verbos(mapeo)) {
                    operaciones.add(verbo.name() + " " + sinRaiz(ruta));
                }
            }
        }
        return operaciones;
    }

    private static Set<RequestMethod> verbos(RequestMapping mapeo) {
        Set<RequestMethod> verbos = new LinkedHashSet<>(java.util.List.of(mapeo.method()));
        if (verbos.isEmpty()) {
            // Un mapeo sin verbo responde a todos; en el contrato eso no existe, y
            // dejarlo pasar en silencio esconderia un endpoint mal declarado.
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

    /** El contrato vive en docs/, fuera del build de Gradle. */
    private static Path raizDelRepositorio() {
        Path actual = Path.of("").toAbsolutePath();
        while (actual != null) {
            if (Files.exists(actual.resolve("docs/50-api/openapi/sgtm-v1.yaml"))) {
                return actual;
            }
            actual = actual.getParent();
        }
        throw new IllegalStateException("No se encontro el contrato de la API");
    }
}
