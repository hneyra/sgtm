package pe.gob.sgtm.catastro.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
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
import pe.gob.sgtm.catastro.dominio.CategoriasConstructivas;
import pe.gob.sgtm.catastro.dominio.Construccion;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.FichaEncontrada;
import pe.gob.sgtm.catastro.dominio.FiltroDeFichas;
import pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.catastro.dominio.VersionDeLaFicha;
import pe.gob.sgtm.catastro.infraestructura.FichaCatastralRepositoryJdbc;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * La consulta transversal de fichas y su historico (RF-006), contra PostgreSQL real.
 *
 * <p>El padron entra por un doble de la <b>interfaz publica</b> del contexto vecino, no por su
 * implementacion. Es deliberado: que la busqueda por aproximacion encuentre a quien esta mal
 * escrito lo prueba {@code DirectorioDeContribuyentesTest}, en el modulo que sabe hacerlo. Lo que
 * se prueba aqui es lo que catastro decide con esa respuesta —y sobre todo lo que decide cuando la
 * respuesta viene vacia—.
 */
@DisplayName("RF-006 — Consulta de fichas e historico de versiones")
class ConsultaDeFichasTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-19T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final LocalDate ALTA = LocalDate.of(2026, 1, 1);
    private static final LocalDate CAMBIO = LocalDate.of(2026, 7, 1);
    private static final LocalDate HOY = LocalDate.of(2026, 8, 19);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long otraMunicipalidad;

    private static TransactionTemplate transaccion;
    private static FichaCatastralRepositoryJdbc repositorio;
    private static ActualizarFichaCatastral fichas;
    private static ConsultaDeFichas consulta;
    private static PadronDePrueba padron;
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("270101", "Municipalidad de la consulta");
        otraMunicipalidad = crearMunicipalidad("270102", "Municipalidad vecina");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        repositorio = new FichaCatastralRepositoryJdbc(jdbc);
        padron = new PadronDePrueba();

        fichas =
                envolver(
                        new ActualizarFichaCatastral(
                                repositorio, new AuditoriaJdbc(jdbc, RELOJ), RELOJ),
                        gestor);
        consulta = envolver(new ConsultaDeFichas(repositorio, padron), gestor);
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
        OrigenContext.fijar(new Origen("catastro.tecnico", null, null));
        padron.limpiar();
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("La grilla")
    class Grilla {

        @Test
        @DisplayName("un predio con tres copropietarios sale UNA vez, no tres")
        void unPredioConTresCopropietariosSaleUnaVez() throws SQLException {
            long predio = crearPredio("27010100100100101010001", "AV. COPROPIEDAD 100", null, "01");
            long uno = crearContribuyente("C-000301", "40300301", "ROJAS DIAZ, ANA");
            long dos = crearContribuyente("C-000302", "40300302", "ROJAS DIAZ, LUIS");
            long tres = crearContribuyente("C-000303", "40300303", "ROJAS DIAZ, PEDRO");
            titular(predio, uno, "50.0000");
            titular(predio, dos, "30.0000");
            titular(predio, tres, "20.0000");
            registrar(predio, "120.00", "CASA HABITACION");

            padron.registrar(uno, "C-000301", "ROJAS DIAZ, ANA");
            padron.registrar(dos, "C-000302", "ROJAS DIAZ, LUIS");
            padron.registrar(tres, "C-000303", "ROJAS DIAZ, PEDRO");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("27010100100100101010001"));

            assertThat(pagina.contenido())
                    .as(
                            "un JOIN normal a titularidad multiplicaria la fila por cada"
                                    + " copropietario, y la grilla diria que hay tres predios donde hay"
                                    + " uno")
                    .hasSize(1);
            assertThat(pagina.totalElementos()).isEqualTo(1);
            assertThat(pagina.contenido().get(0).titular())
                    .as(
                            "de los tres sale el de mayor porcentaje, que es el que la pantalla muestra")
                    .isEqualTo("ROJAS DIAZ, ANA");
        }

        @Test
        @DisplayName("un predio SIN titular vigente sale igual, sin nombre")
        void unPredioSinTitularSaleIgual() throws SQLException {
            long predio = crearPredio("27010100100100101010011", "AV. SIN TITULAR 100", null, "02");
            registrar(predio, "90.00", "TERRENO SIN CONSTRUIR");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("27010100100100101010011"));

            assertThat(pagina.contenido()).hasSize(1);
            assertThat(pagina.contenido().get(0).titular())
                    .as(
                            "es justo el predio que catastro tiene que revisar; sacarlo del listado"
                                    + " esconderia el problema")
                    .isNull();
        }

        @Test
        @DisplayName("devuelve la version vigente a la fecha, no la ultima")
        void devuelveLaVersionVigenteALaFecha() throws SQLException {
            long predio = crearPredio("27010100100100101010021", "AV. VIGENTE 100", null, "03");
            registrar(predio, "100.00", "CASA HABITACION");
            fichas.actualizar(
                    predio,
                    TipoFicha.UNICA,
                    CAMBIO,
                    OrigenDeLaFicha.FISCALIZACION,
                    "Acta 400-2026",
                    null,
                    null,
                    null,
                    Observacion.de("Se verifica en campo un area mayor a la declarada"));

            Pagina<FichaEncontrada> enMarzo =
                    consulta.buscar(
                            porCodigo("27010100100100101010021"),
                            LocalDate.of(2026, 3, 15),
                            unaPagina());
            Pagina<FichaEncontrada> hoy = buscar(porCodigo("27010100100100101010021"));

            assertThat(enMarzo.contenido()).hasSize(1);
            assertThat(enMarzo.contenido().get(0).version())
                    .as(
                            "atender en 2029 una reclamacion de marzo con «la ultima» version daria"
                                    + " el area de julio, y la determinacion no se podria explicar")
                    .isEqualTo(1);
            assertThat(hoy.contenido().get(0).version()).isEqualTo(2);
        }

        @Test
        @DisplayName("el filtro por prefijo del codigo trae todo el tramo")
        void elFiltroPorPrefijoTraeElTramo() throws SQLException {
            for (int i = 1; i <= 3; i++) {
                long predio =
                        crearPredio(
                                "27010100100100101020" + String.format("%03d", i),
                                "AV. PREFIJO " + i,
                                null,
                                "04");
                registrar(predio, "80.00", "CASA HABITACION");
            }

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("2701010010010010102"));

            assertThat(pagina.totalElementos())
                    .as("«dame todo el sector» es la pregunta natural sobre un codigo compuesto")
                    .isEqualTo(3);
        }

        @Test
        @DisplayName("filtrar por manzana y lote acota, y los dos a la vez acotan mas")
        void filtrarPorManzanaYLote() throws SQLException {
            long sector = crearSector("S-27", "Sector de la consulta");
            long manzana = crearManzana(sector, "MZ-A");
            long unPredio =
                    crearPredio("27010100100100101030001", "AV. MANZANA 100", manzana, "07");
            long otroPredio =
                    crearPredio("27010100100100101030002", "AV. MANZANA 200", manzana, "08");
            registrar(unPredio, "70.00", "CASA HABITACION");
            registrar(otroPredio, "70.00", "CASA HABITACION");

            assertThat(buscar(new FiltroDeFichas(null, null, "MZ-A", null, null)).totalElementos())
                    .isEqualTo(2);
            assertThat(buscar(new FiltroDeFichas(null, null, "MZ-A", "07", null)).totalElementos())
                    .isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("El area construida de la grilla (RNF-083)")
    class AreaConstruida {

        @Test
        @DisplayName("viene SUMADA del servidor: la interfaz no suma")
        void vieneSumadaDelServidor() throws SQLException {
            long predio = crearPredio("27010100100100101080001", "AV. SUMADA 100", null, "20");
            registrarCon(predio, "200.00", "CASA HABITACION", "90.00", "30.50");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("27010100100100101080001"));

            assertThat(pagina.contenido()).hasSize(1);
            assertThat(pagina.contenido().get(0).areaConstruida())
                    .as(
                            "sin la suma en el servidor, cada pantalla la escribiria por su cuenta y"
                                    + " dos podrian mostrar dos totales distintos del mismo predio")
                    .isEqualTo(AreaM2.de("120.50"));
        }

        @Test
        @DisplayName("una ficha con tres construcciones sale UNA vez, con el total")
        void unaFichaConTresConstruccionesSaleUnaVez() throws SQLException {
            long predio =
                    crearPredio("27010100100100101080002", "AV. DE TRES PISOS 200", null, "21");
            registrarCon(predio, "300.00", "CASA HABITACION", "100.00", "80.00", "20.00");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("27010100100100101080002"));

            assertThat(pagina.contenido())
                    .as(
                            "sumar con un JOIN a construccion dentro de la grilla multiplicaria la"
                                    + " fila por cada piso: tres predios donde hay uno")
                    .hasSize(1);
            assertThat(pagina.totalElementos()).isEqualTo(1);
            assertThat(pagina.contenido().get(0).areaConstruida()).isEqualTo(AreaM2.de("200.00"));
        }

        @Test
        @DisplayName("un terreno sin construir sale con area construida NULA, no cero")
        void unTerrenoSinConstruirSaleNulo() throws SQLException {
            long predio =
                    crearPredio("27010100100100101080003", "AV. SIN CONSTRUIR 300", null, "22");
            registrar(predio, "150.00", "TERRENO SIN CONSTRUIR");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("27010100100100101080003"));

            assertThat(pagina.contenido().get(0).areaConstruida())
                    .as(
                            "cero seria un area declarada; «no declara ninguna» y «declaro cero» son"
                                    + " cosas distintas, y la segunda es un error de captura que hay"
                                    + " que poder ver")
                    .isNull();
        }

        @Test
        @DisplayName(
                "suma las construcciones de la version VIGENTE A LA FECHA, no las de la ultima")
        void sumaLasDeLaVersionVigenteALaFecha() throws SQLException {
            long predio = crearPredio("27010100100100101080004", "AV. AMPLIADA 400", null, "23");
            registrarCon(predio, "300.00", "CASA HABITACION", "100.00");
            fichas.actualizar(
                    predio,
                    TipoFicha.UNICA,
                    CAMBIO,
                    OrigenDeLaFicha.FISCALIZACION,
                    "Acta 800-2026",
                    List.of(
                            Construccion.en(
                                    "1", AreaM2.de("100.00"), CategoriasConstructivas.todas('C')),
                            Construccion.en(
                                    "2", AreaM2.de("70.00"), CategoriasConstructivas.todas('C'))),
                    null,
                    null,
                    Observacion.de("Ampliacion de un segundo piso detectada en campo"));

            Pagina<FichaEncontrada> enMarzo =
                    consulta.buscar(
                            porCodigo("27010100100100101080004"),
                            LocalDate.of(2026, 3, 15),
                            unaPagina());
            Pagina<FichaEncontrada> hoy = buscar(porCodigo("27010100100100101080004"));

            assertThat(enMarzo.contenido().get(0).areaConstruida())
                    .as(
                            "en marzo el segundo piso no existia; sumar «las construcciones del"
                                    + " predio» daria 170 y una determinacion de marzo no se podria"
                                    + " explicar")
                    .isEqualTo(AreaM2.de("100.00"));
            assertThat(hoy.contenido().get(0).areaConstruida()).isEqualTo(AreaM2.de("170.00"));
        }

        @Test
        @DisplayName("cada fila de la pagina lleva la suya, y la que no tiene se queda nula")
        void cadaFilaLlevaLaSuya() throws SQLException {
            long conObra = crearPredio("27010100100100101081001", "AV. MIXTA 100", null, "24");
            long sinObra = crearPredio("27010100100100101081002", "AV. MIXTA 200", null, "25");
            registrarCon(conObra, "200.00", "CASA HABITACION", "45.00");
            registrar(sinObra, "200.00", "TERRENO SIN CONSTRUIR");

            Pagina<FichaEncontrada> pagina = buscar(porCodigo("2701010010010010108100"));

            assertThat(pagina.totalElementos()).isEqualTo(2);
            assertThat(pagina.contenido())
                    .as("una sola consulta de suma para la pagina, y cada fila con lo suyo")
                    .extracting(FichaEncontrada::areaConstruida)
                    .containsExactlyInAnyOrder(AreaM2.de("45.00"), null);
        }

        @Test
        @DisplayName("no cruza de municipalidad: con el contexto de B no hay area que sumar")
        void noCruzaDeMunicipalidad() throws SQLException {
            long predio = crearPredio("27010100100100101082001", "AV. AISLADA 500", null, "26");
            registrarCon(predio, "200.00", "CASA HABITACION", "55.00");

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));

            assertThat(buscar(porCodigo("27010100100100101082001")).contenido())
                    .as("la suma corre bajo la misma politica RLS que la grilla")
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("El filtro por contribuyente")
    class PorContribuyente {

        @Test
        @DisplayName("resuelve el titular contra el padron, en UNA consulta por pagina")
        void resuelveElTitularEnUnaConsulta() throws SQLException {
            long primero = crearPredio("27010100100100101040001", "AV. TITULAR 100", null, "09");
            long segundo = crearPredio("27010100100100101040002", "AV. TITULAR 200", null, "10");
            long contribuyente = crearContribuyente("C-000400", "40400400", "VEGA MORI, CARLA");
            titular(primero, contribuyente, "100.0000");
            titular(segundo, contribuyente, "100.0000");
            registrar(primero, "60.00", "CASA HABITACION");
            registrar(segundo, "60.00", "CASA HABITACION");
            padron.registrar(contribuyente, "C-000400", "VEGA MORI, CARLA");

            Pagina<FichaEncontrada> pagina =
                    buscar(new FiltroDeFichas(null, "vega mori", null, null, null));

            assertThat(pagina.totalElementos()).isEqualTo(2);
            assertThat(pagina.contenido())
                    .extracting(FichaEncontrada::titular)
                    .containsOnly("VEGA MORI, CARLA");
            assertThat(padron.llamadasAPorIds())
                    .as(
                            "con porId en un bucle, una pagina de veinte fichas serian veintiuna"
                                    + " consultas al padron; eso no se nota en la prueba y si en una"
                                    + " provincia")
                    .isEqualTo(1);
        }

        @Test
        @DisplayName("un nombre que el padron no encuentra devuelve VACIO, no el padron entero")
        void unNombreQueNoExisteDevuelveVacio() throws SQLException {
            long predio = crearPredio("27010100100100101050001", "AV. FANTASMA 100", null, "11");
            registrar(predio, "50.00", "CASA HABITACION");

            Pagina<FichaEncontrada> pagina =
                    buscar(new FiltroDeFichas(null, "no existe nadie asi", null, null, null));

            assertThat(pagina.contenido())
                    .as(
                            "ignorar el filtro devolveria el listado completo: la respuesta que"
                                    + " hace creer al usuario que busco mal cuando lo que pasa es que"
                                    + " no hay nadie")
                    .isEmpty();
            assertThat(pagina.totalElementos()).isZero();
        }
    }

    @Nested
    @DisplayName("El historico")
    class Historico {

        @Test
        @DisplayName("cada version dice quien, cuando y POR QUE")
        void cadaVersionDicePorQue() throws SQLException {
            long predio = crearPredio("27010100100100101060001", "AV. HISTORICO 100", null, "12");
            registrar(predio, "100.00", "CASA HABITACION");
            fichas.actualizar(
                    predio,
                    TipoFicha.UNICA,
                    CAMBIO,
                    OrigenDeLaFicha.FISCALIZACION,
                    "Acta de fiscalizacion 600-2026",
                    null,
                    null,
                    null,
                    Observacion.de("Ampliacion no declarada detectada en inspeccion de campo"));

            List<VersionDeLaFicha> historial = consulta.historial(predio, TipoFicha.UNICA);

            assertThat(historial).hasSize(2);
            assertThat(historial.get(0).version()).isEqualTo(2);
            assertThat(historial.get(0).estaVigente()).isTrue();
            assertThat(historial.get(1).estaVigente()).isFalse();

            assertThat(historial.get(0).observacion().texto())
                    .as(
                            "un diff dice que el area cambio; solo la observacion dice que fue una"
                                    + " fiscalizacion y no un error de tecleo, y es lo que se lee en"
                                    + " voz alta en ventanilla")
                    .contains("inspeccion de campo");
            assertThat(historial.get(0).usuario())
                    .as("un historico sin autor no sirve para responderle a nadie")
                    .isEqualTo("catastro.tecnico");
            assertThat(historial.get(0).registradaEn()).isNotNull();
        }

        @Test
        @DisplayName("la version cerrada conserva su observacion, no la de la que la sustituyo")
        void laCerradaConservaSuObservacion() throws SQLException {
            long predio = crearPredio("27010100100100101060011", "AV. HISTORICO 200", null, "13");
            registrar(predio, "100.00", "CASA HABITACION");
            fichas.actualizar(
                    predio,
                    TipoFicha.UNICA,
                    CAMBIO,
                    OrigenDeLaFicha.RESOLUCION,
                    "Resolucion 12-2026",
                    null,
                    null,
                    null,
                    Observacion.de("Cambio de uso por resolucion de la gerencia"));

            List<VersionDeLaFicha> historial = consulta.historial(predio, TipoFicha.UNICA);

            assertThat(historial.get(1).observacion().texto())
                    .as(
                            "si la version anterior adoptara el motivo de la nueva, el historial mentiria")
                    .contains("Version inicial");
            assertThat(historial.get(1).origen()).isEqualTo(OrigenDeLaFicha.DECLARACION_JURADA);
        }
    }

    @Nested
    @DisplayName("Volumen")
    class Volumen {

        /**
         * Suficientes para que el planificador prefiera el indice.
         *
         * <p>Se midio: con tres mil, PostgreSQL elige un recorrido secuencial <b>y hace bien</b>
         * —la tabla entera cabe en unas paginas—, asi que una prueba con esa cifra no dice si el
         * indice sirve, dice que la tabla es pequena. Con treinta mil el plan cambia a un recorrido
         * por indice, que es lo que hay que verificar.
         */
        private static final int PREDIOS = 30_000;

        /** Como lo escribe el repositorio: el prefijo como rango, con operadores leakproof. */
        private static final String RANGO =
                "EXPLAIN SELECT p.id FROM predio p"
                        + " WHERE p.codigo_ref_catastral ~>=~ '2701019000000000001'"
                        + "   AND p.codigo_ref_catastral ~<~ '2701019000000000002'";

        /** Lo mismo, escrito de la manera obvia. */
        private static final String CON_LIKE =
                "EXPLAIN SELECT p.id FROM predio p"
                        + " WHERE p.codigo_ref_catastral LIKE '2701019000000000001%'";

        @Test
        @DisplayName("con miles de predios, el prefijo del codigo usa indice y no recorre la tabla")
        void elPrefijoUsaIndice() throws SQLException {
            sembrarVolumen();

            String plan = explicar(RANGO);

            assertThat(plan)
                    .as(
                            "sin predio_codigo_prefijo_ix esto es un recorrido secuencial de %d"
                                    + " predios, y crece con el padron",
                            PREDIOS)
                    .contains("Index");
            assertThat(plan)
                    .as("y si aparece un recorrido secuencial del predio, el indice no se usa")
                    .doesNotContain("Seq Scan on predio");
        }

        @Test
        @DisplayName("el mismo prefijo escrito con LIKE no llega al indice: por eso va por rango")
        void elMismoPrefijoConLikeNoLlegaAlIndice() throws SQLException {
            sembrarVolumen();

            assertThat(explicar(CON_LIKE))
                    .as(
                            "textlike no es leakproof, asi que bajo RLS PostgreSQL no lo evalua"
                                    + " antes de la politica de seguridad y lo deja como Filter"
                                    + " despues del recorrido. Esta prueba fija el motivo por el que"
                                    + " la consulta esta escrita como un rango: si alguien la devuelve"
                                    + " a LIKE porque «se lee mejor», la de arriba se pone roja y esta"
                                    + " dice por que")
                    .contains("Seq Scan on predio");
        }

        /** Se siembra una vez para las dos pruebas: son treinta mil filas, no una por prueba. */
        private static boolean sembrado;

        private void sembrarVolumen() throws SQLException {
            if (sembrado) {
                return;
            }
            sembrado = true;
            try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
                ContextoDeTenant.fijar(app, municipalidad);
                try (PreparedStatement sentencia =
                        app.prepareStatement(
                                "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                        + " direccion)"
                                        + " SELECT ?, '2701019' || lpad(g::text, 15, '0'),"
                                        + "        'URBANO', 'AV. VOLUMEN ' || g"
                                        + "   FROM generate_series(1, ?) g")) {
                    sentencia.setLong(1, municipalidad);
                    sentencia.setInt(2, PREDIOS);
                    sentencia.executeUpdate();
                }
                try (PreparedStatement sentencia =
                        app.prepareStatement(
                                "INSERT INTO ficha_catastral (municipalidad_id, predio_id, tipo,"
                                        + " version, area_terreno, uso, vigencia_desde, origen,"
                                        + " documento_origen, observacion, usuario_registro)"
                                        + " SELECT ?, id, 'UNICA', 1, 100.00, 'CASA HABITACION',"
                                        + "        DATE '2026-01-01', 'MIGRACION', 'CARGA',"
                                        + "        'siembra de volumen', 'prueba'"
                                        + "   FROM predio WHERE codigo_ref_catastral LIKE"
                                        + " '2701019%'")) {
                    sentencia.setLong(1, municipalidad);
                    sentencia.executeUpdate();
                }
                app.commit();
            }
            // Sin estadisticas el planificador adivina, y la prueba mediria su adivinanza.
            try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                    PreparedStatement sentencia =
                            owner.prepareStatement("ANALYZE predio, ficha_catastral")) {
                sentencia.execute();
                owner.commit();
            }
        }

        private String explicar(String consulta) {
            String plan =
                    transaccion.execute(
                            estado ->
                                    String.join(
                                            "\n", jdbc.sql(consulta).query(String.class).list()));
            return plan == null ? "" : plan;
        }
    }

    @Nested
    @DisplayName("Aislamiento")
    class Aislamiento {

        @Test
        @DisplayName("la consulta de A no devuelve ni una fila con el contexto de B")
        void laConsultaDeANoDevuelveFilasEnB() throws SQLException {
            long predio = crearPredio("27010100100100101070001", "AV. AISLADA 100", null, "14");
            registrar(predio, "100.00", "CASA HABITACION");

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));

            assertThat(buscar(FiltroDeFichas.ninguno()).contenido())
                    .as("la prueba corre como sgtm_app, que es a quien la politica RLS aplica")
                    .isEmpty();
            assertThat(consulta.historial(predio, TipoFicha.UNICA))
                    .as("ni el historico, que es la via por la que se escaparia el detalle")
                    .isEmpty();
        }
    }

    // ------------------------------------------------------------------

    /**
     * Doble de la API publica del contexto vecino.
     *
     * <p>Implementa {@link DirectorioDeContribuyentes} —la interfaz, no la clase— y cuenta cuantas
     * veces se le pidieron resumenes en bloque: es lo que permite afirmar que la grilla resuelve
     * una pagina entera con una sola consulta al padron.
     */
    private static final class PadronDePrueba implements DirectorioDeContribuyentes {

        private final Map<Long, ResumenDeContribuyente> conocidos = new java.util.LinkedHashMap<>();
        private int llamadasAPorIds;

        void registrar(long id, String codigo, String nombre) {
            conocidos.put(id, new ResumenDeContribuyente(id, codigo, nombre, "DNI 00000000"));
        }

        void limpiar() {
            llamadasAPorIds = 0;
        }

        int llamadasAPorIds() {
            return llamadasAPorIds;
        }

        @Override
        public List<ResumenDeContribuyente> buscar(String texto, int maximo) {
            String buscado = texto.toLowerCase(java.util.Locale.ROOT);
            return conocidos.values().stream()
                    .filter(
                            resumen ->
                                    resumen.nombre()
                                            .toLowerCase(java.util.Locale.ROOT)
                                            .contains(buscado))
                    .limit(maximo)
                    .toList();
        }

        @Override
        public Optional<ResumenDeContribuyente> porCodigo(String codigo) {
            return conocidos.values().stream()
                    .filter(resumen -> resumen.codigo().equals(codigo))
                    .findFirst();
        }

        @Override
        public Map<Long, ResumenDeContribuyente> porIds(Set<Long> ids) {
            llamadasAPorIds++;
            return ids.stream()
                    .filter(conocidos::containsKey)
                    .collect(Collectors.toMap(id -> id, conocidos::get));
        }

        @Override
        public Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return Optional.empty();
        }
    }

    private static FiltroDeFichas porCodigo(String codigo) {
        return new FiltroDeFichas(codigo, null, null, null, null);
    }

    private static Paginacion unaPagina() {
        return Paginacion.de(0, 50, "codRefCatastral");
    }

    private static Pagina<FichaEncontrada> buscar(FiltroDeFichas filtro) {
        return consulta.buscar(filtro, HOY, unaPagina());
    }

    /** La misma alta, con las construcciones que la version declara —una por piso—. */
    private static void registrarCon(
            long predioId, String area, String uso, String... construidas) {
        List<Construccion> construcciones = new java.util.ArrayList<>();
        for (int piso = 0; piso < construidas.length; piso++) {
            construcciones.add(
                    Construccion.en(
                            String.valueOf(piso + 1),
                            AreaM2.de(construidas[piso]),
                            CategoriasConstructivas.todas('C')));
        }
        fichas.registrarPrimera(
                FichaCatastral.primera(
                                predioId,
                                TipoFicha.UNICA,
                                new AreaM2(new BigDecimal(area)),
                                uso,
                                ALTA,
                                OrigenDeLaFicha.DECLARACION_JURADA,
                                "Declaracion jurada 700-2026",
                                Observacion.de("Version inicial de la ficha del predio"))
                        .con(construcciones),
                Observacion.de("Alta de la ficha por declaracion jurada"));
    }

    private static void registrar(long predioId, String area, String uso) {
        fichas.registrarPrimera(
                FichaCatastral.primera(
                        predioId,
                        TipoFicha.UNICA,
                        new AreaM2(new BigDecimal(area)),
                        uso,
                        ALTA,
                        OrigenDeLaFicha.DECLARACION_JURADA,
                        "Declaracion jurada 600-2026",
                        Observacion.de("Version inicial de la ficha del predio")),
                Observacion.de("Alta de la ficha por declaracion jurada"));
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

    private static long crearSector(String codigo, String nombre) throws SQLException {
        return insertar(
                "INSERT INTO sector (municipalidad_id, codigo, nombre) VALUES (?, ?, ?)"
                        + " RETURNING id",
                codigo,
                nombre);
    }

    private static long crearManzana(long sectorId, String codigo) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO manzana (municipalidad_id, sector_id, codigo)"
                                    + " VALUES (?, ?, ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, sectorId);
                sentencia.setString(3, codigo);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearPredio(String codigo, String direccion, Long manzanaId, String lote)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                    + " direccion, manzana_id, lote)"
                                    + " VALUES (?, ?, 'URBANO', ?, ?, ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, direccion);
                sentencia.setObject(4, manzanaId);
                sentencia.setString(5, lote);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearContribuyente(String codigo, String dni, String nombre)
            throws SQLException {
        return insertar(
                "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente, tipo_documento,"
                        + " numero_documento, tipo_persona, nombre_razon_social, usuario_registro)"
                        + " VALUES (?, ?, 'DNI', ?, 'NATURAL', ?, 'siembra') RETURNING id",
                codigo,
                dni,
                nombre);
    }

    private static void titular(long predioId, long contribuyenteId, String porcentaje)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO titularidad (municipalidad_id, predio_id,"
                                    + " contribuyente_id, condicion, porcentaje, vigencia_desde,"
                                    + " documento_origen)"
                                    + " VALUES (?, ?, ?, 'COPROPIETARIO', ?::numeric, ?,"
                                    + " 'MINUTA-600')")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, predioId);
                sentencia.setLong(3, contribuyenteId);
                sentencia.setString(4, porcentaje);
                sentencia.setObject(5, ALTA);
                sentencia.executeUpdate();
                app.commit();
            }
        }
    }

    private static long insertar(String sql, String... valores) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia = app.prepareStatement(sql)) {
                sentencia.setLong(1, municipalidad);
                for (int i = 0; i < valores.length; i++) {
                    sentencia.setString(i + 2, valores[i]);
                }
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
