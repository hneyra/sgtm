package pe.gob.sgtm.catastro.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import pe.gob.sgtm.catastro.dominio.ActividadEconomica;
import pe.gob.sgtm.catastro.dominio.BienComun;
import pe.gob.sgtm.catastro.dominio.Colindante;
import pe.gob.sgtm.catastro.dominio.DetalleDeBienesComunes;
import pe.gob.sgtm.catastro.dominio.DetalleEconomico;
import pe.gob.sgtm.catastro.dominio.DetalleRural;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.Orientacion;
import pe.gob.sgtm.catastro.dominio.ParticipacionComun;
import pe.gob.sgtm.catastro.dominio.Riego;
import pe.gob.sgtm.catastro.dominio.TierraRural;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.catastro.infraestructura.FichaCatastralRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Porcentaje;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * Los otros tres tipos de ficha (RF-002, RF-003, RF-004), contra PostgreSQL real.
 *
 * <p>La afirmacion que estas pruebas defienden es que <b>el mecanismo no cambio</b>: siguen siendo
 * versiones con vigencia, la version anterior sigue entera, y la copia arrastra tambien lo que es
 * propio de cada tipo. Esa ultima parte es la que se olvida —ya paso con las construcciones— y por
 * eso hay una prueba por tipo que la comprueba a la vuelta de la base, no en memoria.
 *
 * <p>Ninguna cifra normativa aparece aqui. Las hectareas y los porcentajes son superficies y
 * reparto, no importes; cuanto vale una hectarea de cultivo bajo riego es D-02a.
 */
@DisplayName("RF-002/003/004 — Fichas economica, de bienes comunes y rural")
class FichasDeTodoTipoTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-19T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final LocalDate ALTA = LocalDate.of(2026, 1, 1);
    private static final LocalDate CAMBIO = LocalDate.of(2026, 7, 1);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;

    private static TransactionTemplate transaccion;
    private static FichaCatastralRepositoryJdbc repositorio;
    private static ActualizarFichaCatastral fichas;
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("250101", "Municipalidad de los cuatro tipos");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);
        repositorio = new FichaCatastralRepositoryJdbc(jdbc);
        fichas =
                envolver(
                        new ActualizarFichaCatastral(
                                repositorio, new AuditoriaJdbc(jdbc, RELOJ), RELOJ),
                        gestor);
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
    @DisplayName("Ficha economica (RF-002)")
    class Economica {

        @Test
        @DisplayName("la licencia entra por NUMERO, y catastro no depende de licencias")
        void laLicenciaEntraPorNumero() throws SQLException {
            long predio = crearPredio("25010100100100101010001", "AV. ECONOMICA 100");

            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.ECONOMICA, "150.00", "COMERCIO")
                            .conDetalle(
                                    DetalleEconomico.de(
                                            ActividadEconomica.de("Juan Perez", "4711")
                                                    .conLicencia("LIC-2026-0001", ALTA))),
                    Observacion.de("Alta de la ficha economica tras la inspeccion"));

            Optional<FichaCatastral> leida = fichas.vigenteA(predio, TipoFicha.ECONOMICA, CAMBIO);

            assertThat(leida).isPresent();
            DetalleEconomico detalle = (DetalleEconomico) leida.get().detalle();
            assertThat(detalle).isNotNull();
            assertThat(detalle.actividades()).hasSize(1);
            assertThat(detalle.actividades().get(0).licenciaNumero()).isEqualTo("LIC-2026-0001");

            Long conClaveAjena =
                    transaccion.execute(
                            estado ->
                                    jdbc.sql(
                                                    "SELECT count(*) FROM information_schema"
                                                            + ".referential_constraints r"
                                                            + " JOIN information_schema"
                                                            + ".table_constraints t"
                                                            + "   ON t.constraint_name ="
                                                            + " r.constraint_name"
                                                            + " WHERE t.table_name ="
                                                            + " 'actividad_economica'"
                                                            + "   AND r.unique_constraint_name LIKE"
                                                            + " 'licencia%'")
                                            .query(Long.class)
                                            .single());

            assertThat(conClaveAjena)
                    .as(
                            "una clave ajena a licencia_funcionamiento ataria catastro al contexto"
                                    + " licencias (ARQ-01 §4) y ademas impediria anotar el numero del"
                                    + " cartel de la puerta mientras el otro contexto no lo hubiera"
                                    + " cargado")
                    .isZero();
        }

        @Test
        @DisplayName("un numero de licencia que no existe se admite: es el hallazgo, no un error")
        void unaLicenciaInexistenteSeAdmite() throws SQLException {
            long predio = crearPredio("25010100100100101010002", "AV. ECONOMICA 200");

            FichaCatastral guardada =
                    fichas.registrarPrimera(
                            ficha(predio, TipoFicha.ECONOMICA, "90.00", "COMERCIO")
                                    .conDetalle(
                                            DetalleEconomico.de(
                                                    ActividadEconomica.de("Ana Quispe", "5610")
                                                            .conLicencia("NO-EXISTE-9999", ALTA))),
                            Observacion.de("El local exhibe una licencia que no figura"));

            assertThat(guardada.detalle()).isNotNull();
        }

        @Test
        @DisplayName("una actividad sin licencia se cuenta: es lo que fiscalizacion busca")
        void sinLicenciaSeCuenta() {
            DetalleEconomico detalle =
                    new DetalleEconomico(
                            List.of(
                                    ActividadEconomica.de("Con licencia", "4711")
                                            .conLicencia("LIC-1", ALTA),
                                    ActividadEconomica.de("Sin licencia", "5610")),
                            null);

            assertThat(detalle.sinLicencia()).hasSize(1);
            assertThat(detalle.sinLicencia().get(0).conductor()).isEqualTo("Sin licencia");
        }

        @Test
        @DisplayName("una fecha de licencia sin numero no se construye")
        void fechaSinNumeroNoSeConstruye() {
            assertThatThrownBy(
                            () ->
                                    new ActividadEconomica(
                                            null,
                                            null,
                                            "Conductor",
                                            null,
                                            "4711",
                                            null,
                                            null,
                                            ALTA,
                                            null,
                                            null,
                                            null))
                    .as("una fecha sola no permite comprobar nada contra licencias")
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Ficha de bienes comunes (RF-003)")
    class BienesComunes {

        @Test
        @DisplayName("las areas comunes y su reparto sobreviven al versionado")
        void elRepartoSobreviveAlVersionado() throws SQLException {
            long edificio = crearPredio("25010100100100101010101", "AV. EDIFICIO 100");
            long unidad = crearPredio("25010100100100101010102", "AV. EDIFICIO 100 DPTO 302");

            fichas.registrarPrimera(
                    ficha(edificio, TipoFicha.BIENES_COMUNES, "400.00", "MULTIFAMILIAR")
                            .conDenominacion("Residencial Los Algarrobos")
                            .conDetalle(
                                    DetalleDeBienesComunes.de(
                                                    BienComun.de(
                                                            "Escalera comun",
                                                            new AreaM2(new BigDecimal("30.00"))),
                                                    BienComun.de(
                                                            "Azotea",
                                                            new AreaM2(new BigDecimal("70.00"))))
                                            .repartidoEntre(
                                                    List.of(
                                                            ParticipacionComun.de(
                                                                    unidad,
                                                                    new Porcentaje(
                                                                            new BigDecimal(
                                                                                    "60.0000")))))),
                    Observacion.de("Alta de la ficha de bienes comunes de la edificacion"));

            fichas.actualizar(
                    edificio,
                    TipoFicha.BIENES_COMUNES,
                    CAMBIO,
                    pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha.FISCALIZACION,
                    "Acta de fiscalizacion 090-2026",
                    null,
                    null,
                    null,
                    Observacion.de("Se rectifica el uso declarado sin tocar las areas comunes"));

            Optional<FichaCatastral> segunda =
                    fichas.vigenteA(edificio, TipoFicha.BIENES_COMUNES, CAMBIO);

            assertThat(segunda).isPresent();
            assertThat(segunda.get().version()).isEqualTo(2);

            DetalleDeBienesComunes detalle = (DetalleDeBienesComunes) segunda.get().detalle();
            assertThat(detalle).isNotNull();
            assertThat(detalle.bienes())
                    .as(
                            "versionar copia tambien lo comun; si no, la version 2 naceria sin"
                                    + " areas y el edificio dejaria de repartir nada sin que ningun"
                                    + " DELETE apareciera en el diff")
                    .hasSize(2);
            assertThat(detalle.participaciones()).hasSize(1);
            assertThat(detalle.areaComunTotal()).isEqualTo(new AreaM2(new BigDecimal("100.00")));

            assertThat(segunda.get().denominacion()).isEqualTo("Residencial Los Algarrobos");
        }

        @Test
        @DisplayName("las participaciones de una ficha no pasan de 100")
        void lasParticipacionesNoPasanDeCien() throws SQLException {
            long edificio = crearPredio("25010100100100101010111", "AV. EDIFICIO 200");
            long uno = crearPredio("25010100100100101010112", "AV. EDIFICIO 200 DPTO 101");
            long otro = crearPredio("25010100100100101010113", "AV. EDIFICIO 200 DPTO 102");

            DetalleDeBienesComunes reparto =
                    DetalleDeBienesComunes.de(
                                    BienComun.de("Patio", new AreaM2(new BigDecimal("20.00"))))
                            .repartidoEntre(
                                    List.of(
                                            ParticipacionComun.de(
                                                    uno, new Porcentaje(new BigDecimal("70.0000"))),
                                            ParticipacionComun.de(
                                                    otro,
                                                    new Porcentaje(new BigDecimal("50.0000")))));

            FichaCatastral inconsistente =
                    ficha(edificio, TipoFicha.BIENES_COMUNES, "300.00", "MULTIFAMILIAR")
                            .conDetalle(reparto);

            assertThatThrownBy(
                            () ->
                                    fichas.registrarPrimera(
                                            inconsistente, Observacion.de("Reparto que suma 120")))
                    .as(
                            "si suman 120, el valor de lo comun se reparte por mas de lo que hay y"
                                    + " todas las unidades del edificio pagan de mas")
                    // La causa raiz, y no el mensaje de arriba, porque el disparador es
                    // diferido: salta en el COMMIT, y ahi Spring ya lo envolvio en un «JDBC
                    // commit failed» que no dice nada. Quien presente este error al usuario
                    // tiene que bajar hasta aqui; darlo por bueno con el mensaje de la
                    // envoltura seria dejar pasar cualquier fallo del commit como si fuera
                    // este.
                    .rootCause()
                    .hasMessageContaining("120");
        }
    }

    @Nested
    @DisplayName("Ficha rural (RF-004)")
    class Rural {

        @Test
        @DisplayName("un predio rustico SIN construccion se ficha igual")
        void sinConstruccionSeFichaIgual() throws SQLException {
            long predio = crearPredio("25010100100100101010201", "FUNDO SIN CASA");

            FichaCatastral guardada =
                    fichas.registrarPrimera(
                            ficha(predio, TipoFicha.RURAL, "25000.00", "AGRICOLA")
                                    .conDenominacion("Fundo La Esperanza")
                                    .conDetalle(
                                            DetalleRural.de(
                                                            TierraRural.de(
                                                                    "CULTIVO_TRANSITORIO",
                                                                    Riego.BAJO_RIEGO,
                                                                    "1.5000"),
                                                            TierraRural.de(
                                                                    "PASTOS_NATURALES",
                                                                    Riego.SECANO,
                                                                    "1.0000"))
                                                    .con(
                                                            List.of(
                                                                    Colindante.por(
                                                                            Orientacion.NORTE,
                                                                            "Fundo San Juan"),
                                                                    Colindante.por(
                                                                            Orientacion.SUR,
                                                                            "Canal de regadio")))),
                            Observacion.de("Alta de la ficha rural del fundo"));

            assertThat(guardada.construcciones())
                    .as(
                            "un predio rustico sin ninguna edificacion es lo normal; exigir una"
                                    + " obligaria al tecnico a inventarse un dato o a no fichar el"
                                    + " predio")
                    .isEmpty();

            DetalleRural detalle = (DetalleRural) guardada.detalle();
            assertThat(detalle).isNotNull();
            assertThat(detalle.tierras()).hasSize(2);
            assertThat(detalle.colindantes()).hasSize(2);
            assertThat(detalle.hectareasTotales().toString()).isEqualTo("2.5000 HA");
        }

        @Test
        @DisplayName("la superficie va en HECTAREAS: guardarla en metros no compila el dato")
        void laSuperficieVaEnHectareas() {
            assertThatThrownBy(
                            () ->
                                    new TierraRural(
                                            null,
                                            null,
                                            "CULTIVO_TRANSITORIO",
                                            null,
                                            Riego.SECANO,
                                            pe.gob.sgtm.dominio.Medida.enMetrosCuadrados("15000"),
                                            null))
                    .as(
                            "el arancel rural se publica por hectarea; 15000 leido como hectareas"
                                    + " valoriza diez mil veces de mas")
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HA");
        }

        @Test
        @DisplayName("dos colindantes por la misma orientacion se rechazan")
        void dosColindantesPorLaMismaOrientacion() {
            assertThatThrownBy(
                            () ->
                                    new DetalleRural(
                                            List.of(),
                                            List.of(
                                                    Colindante.por(Orientacion.NORTE, "Uno"),
                                                    Colindante.por(Orientacion.NORTE, "Otro"))))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("NORTE");
        }
    }

    @Nested
    @DisplayName("Los cuatro tipos a la vez")
    class LosCuatroTipos {

        @Test
        @DisplayName("un predio puede tener las cuatro fichas vigentes al mismo tiempo")
        void lasCuatroConviven() throws SQLException {
            long predio = crearPredio("25010100100100101010301", "AV. CUATRO TIPOS 100");

            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.UNICA, "200.00", "CASA HABITACION"),
                    Observacion.de("Alta de la ficha urbana"));
            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.ECONOMICA, "200.00", "COMERCIO")
                            .conDetalle(
                                    DetalleEconomico.de(ActividadEconomica.de("Bodega", "4711"))),
                    Observacion.de("Alta de la ficha economica"));
            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.BIENES_COMUNES, "200.00", "MULTIFAMILIAR")
                            .conDetalle(
                                    DetalleDeBienesComunes.de(
                                            BienComun.de(
                                                    "Pasaje",
                                                    new AreaM2(new BigDecimal("10.00"))))),
                    Observacion.de("Alta de la ficha de bienes comunes"));
            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.RURAL, "200.00", "AGRICOLA")
                            .conDetalle(
                                    DetalleRural.de(
                                            TierraRural.de("ERIAZA", Riego.SECANO, "0.5000"))),
                    Observacion.de("Alta de la ficha rural"));

            for (TipoFicha tipo : TipoFicha.values()) {
                assertThat(fichas.vigenteA(predio, tipo, CAMBIO))
                        .as(
                                "ficha_vigente_uq es unico por predio Y tipo: las cuatro conviven,"
                                        + " dos del mismo no")
                        .isPresent();
            }
        }

        @Test
        @DisplayName("dos fichas del mismo tipo y predio no conviven")
        void dosDelMismoTipoNoConviven() throws SQLException {
            long predio = crearPredio("25010100100100101010311", "AV. CUATRO TIPOS 200");

            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.RURAL, "500.00", "AGRICOLA")
                            .conDetalle(
                                    DetalleRural.de(
                                            TierraRural.de("ERIAZA", Riego.SECANO, "0.2000"))),
                    Observacion.de("Alta de la ficha rural"));

            assertThatThrownBy(
                            () ->
                                    fichas.registrarPrimera(
                                            ficha(predio, TipoFicha.RURAL, "600.00", "AGRICOLA"),
                                            Observacion.de("Segunda primera version")))
                    .isInstanceOf(ActualizarFichaCatastral.YaTieneFicha.class);
        }

        @Test
        @DisplayName("una ficha ECONOMICA no acepta detalle rural")
        void elDetalleTieneQueSerDelTipo() {
            assertThatThrownBy(
                            () ->
                                    ficha(1L, TipoFicha.ECONOMICA, "100.00", "COMERCIO")
                                            .conDetalle(
                                                    DetalleRural.de(
                                                            TierraRural.de(
                                                                    "ERIAZA",
                                                                    Riego.SECANO,
                                                                    "1.0000"))))
                    .as(
                            "sin esta comprobacion la combinacion equivocada se escribe sin ruido y"
                                    + " se descubre al leerla, cuando ya nadie recuerda quien la"
                                    + " escribio")
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("RURAL");
        }
    }

    @Nested
    @DisplayName("Reconstruir el pasado, en los tres tipos")
    class ReconstruirElPasado {

        @Test
        @DisplayName("cada tipo devuelve la version que regia EN esa fecha, no la ultima")
        void cadaTipoDevuelveLaDeSuFecha() throws SQLException {
            long predio = crearPredio("25010100100100101010401", "AV. PASADO 100");

            registrarYVersionar(predio, TipoFicha.ECONOMICA, "COMERCIO");
            registrarYVersionar(predio, TipoFicha.BIENES_COMUNES, "MULTIFAMILIAR");
            registrarYVersionar(predio, TipoFicha.RURAL, "AGRICOLA");

            for (TipoFicha tipo :
                    List.of(TipoFicha.ECONOMICA, TipoFicha.BIENES_COMUNES, TipoFicha.RURAL)) {

                Optional<FichaCatastral> enMarzo =
                        fichas.vigenteA(predio, tipo, LocalDate.of(2026, 3, 15));
                Optional<FichaCatastral> hoy = fichas.vigenteA(predio, tipo, CAMBIO);

                assertThat(enMarzo).isPresent();
                assertThat(enMarzo.get().version())
                        .as(
                                "una notificacion de marzo se defiende con la ficha de marzo; «la"
                                        + " ultima» seria la de julio y la determinacion no se podria"
                                        + " reproducir (%s)",
                                tipo)
                        .isEqualTo(1);
                assertThat(hoy).isPresent();
                assertThat(hoy.get().version()).isEqualTo(2);
            }
        }

        @Test
        @DisplayName("la version cerrada conserva SU detalle, no el de la siguiente")
        void laCerradaConservaSuDetalle() throws SQLException {
            long predio = crearPredio("25010100100100101010411", "AV. PASADO 200");

            fichas.registrarPrimera(
                    ficha(predio, TipoFicha.RURAL, "10000.00", "AGRICOLA")
                            .conDetalle(
                                    DetalleRural.de(
                                            TierraRural.de(
                                                    "CULTIVO_TRANSITORIO",
                                                    Riego.SECANO,
                                                    "1.0000"))),
                    Observacion.de("Alta con una hectarea de secano"));

            fichas.actualizar(
                    predio,
                    TipoFicha.RURAL,
                    CAMBIO,
                    pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha.DECLARACION_JURADA,
                    "Declaracion jurada 200-2026",
                    null,
                    null,
                    DetalleRural.de(
                            TierraRural.de("CULTIVO_TRANSITORIO", Riego.BAJO_RIEGO, "3.0000")),
                    Observacion.de("Se instala riego y se amplia la superficie declarada"));

            List<FichaCatastral> historial = fichas.historial(predio, TipoFicha.RURAL);

            assertThat(historial).hasSize(2);
            DetalleRural nueva = (DetalleRural) historial.get(0).detalle();
            DetalleRural vieja = (DetalleRural) historial.get(1).detalle();
            assertThat(nueva).isNotNull();
            assertThat(vieja).isNotNull();

            assertThat(nueva.hectareasTotales().toString()).isEqualTo("3.0000 HA");
            assertThat(vieja.hectareasTotales().toString())
                    .as(
                            "la version de enero se calculo con una hectarea de secano; si al"
                                    + " versionar se le hubiera cambiado el detalle, la determinacion"
                                    + " de ese ejercicio dejaria de reproducirse")
                    .isEqualTo("1.0000 HA");
            assertThat(vieja.tierras().get(0).riego()).isEqualTo(Riego.SECANO);
        }
    }

    // ------------------------------------------------------------------

    private void registrarYVersionar(long predio, TipoFicha tipo, String uso) {
        fichas.registrarPrimera(
                ficha(predio, tipo, "300.00", uso).conDetalle(detalleDe(tipo)),
                Observacion.de("Alta de la ficha " + tipo));

        fichas.actualizar(
                predio,
                tipo,
                CAMBIO,
                pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha.FISCALIZACION,
                "Acta de fiscalizacion 300-2026",
                null,
                null,
                null,
                Observacion.de("Se rectifica lo declarado en la inspeccion de julio"));
    }

    private static pe.gob.sgtm.catastro.dominio.DetalleDeLaFicha detalleDe(TipoFicha tipo) {
        return switch (tipo) {
            case ECONOMICA ->
                    DetalleEconomico.de(ActividadEconomica.de("Conductor de prueba", "4711"));
            case BIENES_COMUNES ->
                    DetalleDeBienesComunes.de(
                            BienComun.de("Escalera", new AreaM2(new BigDecimal("12.00"))));
            case RURAL -> DetalleRural.de(TierraRural.de("ERIAZA", Riego.SECANO, "0.7500"));
            case UNICA ->
                    throw new IllegalArgumentException("La ficha unica no tiene detalle propio");
        };
    }

    private static FichaCatastral ficha(long predioId, TipoFicha tipo, String area, String uso) {
        return FichaCatastral.primera(
                predioId,
                tipo,
                new AreaM2(new BigDecimal(area)),
                uso,
                ALTA,
                pe.gob.sgtm.catastro.dominio.OrigenDeLaFicha.DECLARACION_JURADA,
                "Declaracion jurada 100-2026",
                Observacion.de("Version inicial de la ficha del predio"));
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

    private static long crearPredio(String codigo, String direccion) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                    + " direccion) VALUES (?, ?, 'URBANO', ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, direccion);
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
