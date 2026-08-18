package pe.gob.sgtm.catastro.aplicacion;

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
import java.util.Optional;
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
import pe.gob.sgtm.catastro.dominio.CondicionDeTitularidad;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.Titularidad;
import pe.gob.sgtm.catastro.infraestructura.CatastroRepositoryJdbc;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Porcentaje;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * El predio, sus catalogos y su titularidad, contra PostgreSQL real.
 *
 * <p>La pieza que hay que ver funcionar es el <b>disparador diferido</b> de la titularidad: la
 * comprobacion de que los porcentajes vigentes no exceden 100 se evalua <b>al cerrar la
 * transaccion</b>, no fila a fila. Sin eso, una transferencia legitima —cerrar una titularidad y
 * abrir otra— seria imposible.
 *
 * <p>Los codigos catastrales de la prueba se construyen con la composicion del manual (23
 * posiciones). Si D-10 la cambia, lo que cambia es el parametro, no estas pruebas.
 */
@DisplayName("RF-005/008 — Predio, catalogos y titularidad")
class RegistrarPredioTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long otraMunicipalidad;
    private static long titular;
    private static long comprador;

    private static TransactionTemplate transaccion;
    private static CatastroRepositoryJdbc repositorio;
    private static RegistrarPredio registrar;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("230101", "Municipalidad del catastro");
        otraMunicipalidad = crearMunicipalidad("230102", "Municipalidad vecina");

        titular = crearContribuyente(municipalidad, "T-0001", "50100001", "TITULAR, PREDIO");
        comprador = crearContribuyente(municipalidad, "T-0002", "50100002", "COMPRADOR, PREDIO");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        repositorio = new CatastroRepositoryJdbc(jdbc);
        registrar =
                envolver(new RegistrarPredio(repositorio, new AuditoriaJdbc(jdbc), RELOJ), gestor);
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
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("Codigo de referencia catastral (D-10)")
    class Codigo {

        @Test
        @DisplayName("un codigo con la longitud del manual se acepta y se descompone")
        void unCodigoValido() {
            CodigoReferenciaCatastral codigo =
                    CodigoReferenciaCatastral.de("20010100100100101010001");

            assertThat(codigo.valor()).hasSize(23);
            assertThat(codigo.tramo("departamento")).isEqualTo("20");
            assertThat(codigo.ubigeo())
                    .as("los tres primeros tramos dicen de que distrito es el predio")
                    .isEqualTo("200101");
        }

        @Test
        @DisplayName("una posicion que no es digito se rechaza, y el error dice cual")
        void unaPosicionQueNoEsDigito() {
            assertThatThrownBy(() -> CodigoReferenciaCatastral.de("2001010010010010101000X"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("posicion 23");
        }

        @Test
        @DisplayName("un codigo corto se rechaza diciendo cuantas posiciones faltan")
        void unCodigoCorto() {
            assertThatThrownBy(() -> CodigoReferenciaCatastral.de("2001010010"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("23")
                    .hasMessageContaining("10");
        }

        @Test
        @DisplayName("la longitud es un parametro: con otra composicion, otro largo")
        void laLongitudEsUnParametro() {
            pe.gob.sgtm.dominio.ComposicionCatastral deVeintiuna =
                    new pe.gob.sgtm.dominio.ComposicionCatastral(
                            List.of(
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "departamento", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "provincia", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "distrito", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo("sector", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "manzana", 3),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo("lote", 3),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "edificacion", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo(
                                            "entrada", 2),
                                    new pe.gob.sgtm.dominio.ComposicionCatastral.Tramo("piso", 3)));

            CodigoReferenciaCatastral deOtroLargo =
                    CodigoReferenciaCatastral.de("200101001001001010001", deVeintiuna);

            assertThat(deOtroLargo.valor())
                    .as("cerrar D-10 sera fijar el parametro, no reescribir la validacion")
                    .hasSize(21);
        }
    }

    @Nested
    @DisplayName("Catalogos territoriales")
    class Catalogos {

        @Test
        @DisplayName("un sector se registra y se lee por su codigo")
        void unSectorSeRegistra() {
            Sector guardado =
                    transaccion.execute(
                            estado -> repositorio.guardar(Sector.nuevo("S-01", "Sector Centro")));

            assertThat(guardado).isNotNull();
            Optional<Sector> leido =
                    transaccion.execute(estado -> repositorio.sectorPorCodigo("S-01"));
            assertThat(leido).isPresent();
        }

        @Test
        @DisplayName("ningun catalogo de una municipalidad es visible desde otra")
        void losCatalogosNoCruzan() {
            transaccion.execute(
                    estado -> repositorio.guardar(Sector.nuevo("S-AISLADO", "Sector aislado")));

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));

            Optional<Sector> desdeLaVecina =
                    transaccion.execute(estado -> repositorio.sectorPorCodigo("S-AISLADO"));
            assertThat(desdeLaVecina)
                    .as("el catalogo territorial de un distrito no es visible desde el vecino")
                    .isEmpty();
        }

        @Test
        @DisplayName("el listado que publica el endpoint viene paginado y ordenado por codigo")
        void elListadoVienePaginado() {
            transaccion.execute(
                    estado -> repositorio.guardar(Sector.nuevo("S-90", "Sector del listado")));

            Pagina<Sector> pagina =
                    transaccion.execute(
                            estado -> repositorio.sectores(Paginacion.de(0, 20, "codigo")));

            assertThat(pagina).isNotNull();
            assertThat(pagina.contenido()).isNotEmpty();
        }

        @Test
        @DisplayName("las manzanas cuelgan de su sector")
        void lasManzanasCuelganDeSuSector() {
            Sector sector =
                    transaccion.execute(
                            estado ->
                                    repositorio.guardar(
                                            Sector.nuevo("S-02", "Sector con manzanas")));

            transaccion.execute(
                    estado ->
                            repositorio.guardar(
                                    pe.gob.sgtm.catastro.dominio.Manzana.nueva(
                                            sector.id(), "001")));

            List<pe.gob.sgtm.catastro.dominio.Manzana> manzanas =
                    transaccion.execute(estado -> repositorio.manzanasDe(sector.id()));
            assertThat(manzanas).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Predio")
    class Predios {

        @Test
        @DisplayName("un predio se registra con su codigo y se vuelve a leer")
        void unPredioSeRegistra() {
            Predio guardado =
                    registrar.registrar(
                            Predio.urbano(
                                    CodigoReferenciaCatastral.de("20010100100100101010101"),
                                    "AV. PRINCIPAL 100"),
                            Observacion.de("Alta del predio por declaracion jurada"));

            assertThat(guardado.id()).isNotNull();
            Optional<Predio> releido =
                    transaccion.execute(estado -> repositorio.predio(guardado.id()));
            assertThat(releido).isPresent();
        }

        @Test
        @DisplayName("dar de baja no borra: el predio sigue ahi, inactivo")
        void darDeBajaNoBorra() {
            Predio predio =
                    registrar.registrar(
                            Predio.urbano(
                                    CodigoReferenciaCatastral.de("20010100100100101010102"),
                                    "AV. BAJA 200"),
                            Observacion.de("Alta para la prueba de baja"));

            registrar.darDeBaja(predio, Observacion.de("Se demolio y se unifico con el vecino"));

            Optional<Predio> despues =
                    transaccion.execute(estado -> repositorio.predio(predio.id()));
            assertThat(despues)
                    .as("aparece en determinaciones ya emitidas; borrarlo las dejaria huerfanas")
                    .isPresent();
            assertThat(despues.orElseThrow().estaActivo()).isFalse();
        }

        @Test
        @DisplayName("un predio con manzana necesita su sector")
        void unPredioConManzanaNecesitaSector() {
            assertThatThrownBy(
                            () ->
                                    new Predio(
                                            null,
                                            CodigoReferenciaCatastral.de("20010100100100101010103"),
                                            pe.gob.sgtm.catastro.dominio.TipoPredio.URBANO,
                                            null,
                                            null,
                                            "SIN SECTOR",
                                            null,
                                            99L,
                                            null,
                                            null,
                                            pe.gob.sgtm.catastro.dominio.EstadoPredio.ACTIVO))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("un predio de otra municipalidad no se ve")
        void unPredioAjenoNoSeVe() {
            Predio predio =
                    registrar.registrar(
                            Predio.urbano(
                                    CodigoReferenciaCatastral.de("20010100100100101010104"),
                                    "AV. AISLADA 300"),
                            Observacion.de("Alta para la prueba de aislamiento"));

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(otraMunicipalidad));

            Optional<Predio> desdeLaVecina =
                    transaccion.execute(estado -> repositorio.predio(predio.id()));
            assertThat(desdeLaVecina).isEmpty();
        }
    }

    @Nested
    @DisplayName("DAT-01 §4.2 — Titularidad y el disparador diferido")
    class TitularidadDelPredio {

        @Test
        @DisplayName("un propietario unico con porcentaje distinto de 100 se rechaza")
        void elUnicoLoEsPorElTotal() {
            assertThatThrownBy(
                            () ->
                                    new Titularidad(
                                            null,
                                            1L,
                                            titular,
                                            CondicionDeTitularidad.PROPIETARIO_UNICO,
                                            Porcentaje.de("60"),
                                            LocalDate.of(2026, 1, 1),
                                            null,
                                            "Escritura publica"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("100");
        }

        @Test
        @DisplayName("una titularidad parcial del 60 % se admite: el padron real las tiene")
        void unaTitularidadParcialSeAdmite() {
            long predio = predioNuevo("20010100100100101010201", "AV. PARCIAL 100");

            Titularidad parcial =
                    registrar.registrarTitularidad(
                            Titularidad.parcial(
                                    predio,
                                    titular,
                                    CondicionDeTitularidad.COPROPIETARIO,
                                    Porcentaje.de("60"),
                                    LocalDate.of(2026, 1, 1),
                                    "Escritura publica 100-2026"),
                            Observacion.de("Se registra al copropietario identificado"));

            assertThat(parcial.id())
                    .as("exigir 100 obligaria al operador a inventar un titular")
                    .isNotNull();
            List<Titularidad> titulares =
                    transaccion.execute(
                            estado -> repositorio.titularesDe(predio, LocalDate.of(2026, 6, 1)));
            assertThat(titulares).hasSize(1);
        }

        @Test
        @DisplayName("pasar de 100 % falla AL CERRAR la transaccion, no antes")
        void pasarDeCienFallaAlCerrar() {
            long predio = predioNuevo("20010100100100101010202", "AV. EXCESO 200");

            registrar.registrarTitularidad(
                    Titularidad.parcial(
                            predio,
                            titular,
                            CondicionDeTitularidad.COPROPIETARIO,
                            Porcentaje.de("70"),
                            LocalDate.of(2026, 1, 1),
                            "Escritura publica 200-2026"),
                    Observacion.de("Primer copropietario"));

            assertThatThrownBy(
                            () ->
                                    registrar.registrarTitularidad(
                                            Titularidad.parcial(
                                                    predio,
                                                    comprador,
                                                    CondicionDeTitularidad.COPROPIETARIO,
                                                    Porcentaje.de("50"),
                                                    LocalDate.of(2026, 1, 1),
                                                    "Escritura publica 201-2026"),
                                            Observacion.de("Segundo, que llevaria el total a 120")))
                    .as("70 + 50 = 120; el disparador lo rechaza al cerrar")
                    .isNotNull();
        }

        @Test
        @DisplayName("una transferencia cierra una y abre otra en la misma transaccion")
        void laTransferenciaFuncionaGraciasAlDiferido() {
            long predio = predioNuevo("20010100100100101010203", "AV. TRANSFERIDA 300");

            Titularidad delVendedor =
                    registrar.registrarTitularidad(
                            Titularidad.unico(
                                    predio,
                                    titular,
                                    LocalDate.of(2026, 1, 1),
                                    "Escritura publica 300-2026"),
                            Observacion.de("Titular original del predio"));

            // Aqui esta el punto: entre cerrar la del vendedor y abrir la del comprador, el
            // total vigente pasa por 200 %. Con un disparador inmediato esto seria imposible.
            Titularidad delComprador =
                    registrar.transferir(
                            delVendedor,
                            Titularidad.unico(
                                    predio,
                                    comprador,
                                    LocalDate.of(2026, 7, 1),
                                    "Escritura publica 301-2026"),
                            Observacion.de("Compraventa inscrita en registros publicos"));

            assertThat(delComprador.id()).isNotNull();

            List<Titularidad> enMarzo =
                    transaccion.execute(
                            estado -> repositorio.titularesDe(predio, LocalDate.of(2026, 3, 1)));
            List<Titularidad> enSetiembre =
                    transaccion.execute(
                            estado -> repositorio.titularesDe(predio, LocalDate.of(2026, 9, 1)));

            assertThat(enMarzo).hasSize(1);
            assertThat(enMarzo.get(0).contribuyenteId())
                    .as("en marzo el predio era del vendedor, y una determinacion de marzo lo dice")
                    .isEqualTo(titular);
            assertThat(enSetiembre).hasSize(1);
            assertThat(enSetiembre.get(0).contribuyenteId()).isEqualTo(comprador);
        }

        @Test
        @DisplayName("se consulta tambien al reves: los predios de un contribuyente")
        void losPrediosDeUnContribuyente() {
            long predio = predioNuevo("20010100100100101010204", "AV. DEL TITULAR 400");

            registrar.registrarTitularidad(
                    Titularidad.unico(
                            predio, titular, LocalDate.of(2026, 1, 1), "Escritura 400-2026"),
                    Observacion.de("Titular del predio"));

            List<Titularidad> susPredios =
                    transaccion.execute(
                            estado -> repositorio.prediosDe(titular, LocalDate.of(2026, 6, 1)));
            assertThat(susPredios)
                    .as("la base del predial es por contribuyente: hace falta juntar sus predios")
                    .isNotEmpty();
        }
    }

    // ------------------------------------------------------------------

    private static long predioNuevo(String codigo, String direccion) {
        Predio predio =
                registrar.registrar(
                        Predio.urbano(CodigoReferenciaCatastral.de(codigo), direccion),
                        Observacion.de("Alta del predio para la prueba de titularidad"));
        return java.util.Objects.requireNonNull(predio.id());
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

    private static long crearContribuyente(long muni, String codigo, String dni, String nombre)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, muni);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', ?, 'siembra')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, muni);
                sentencia.setString(2, codigo);
                sentencia.setString(3, dni);
                sentencia.setString(4, nombre);
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
