package pe.gob.sgtm.licencias.dominio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.ValorNormativo;

/**
 * #48 — Lo que se puede comprobar <b>sin base de datos y sin reloj</b>: el estado derivado, las
 * invariantes del expediente y la valorizacion de obra (reglas 6 y 7).
 *
 * <p>Que esta clase no necesite Spring ni PostgreSQL es el punto: {@link ValorizacionDeObra} es una
 * funcion pura, y valorizar el mismo proyecto con la misma tabla en 2037 tiene que dar el mismo
 * centimo.
 *
 * <p><b>Ninguna cifra de esta prueba es normativa.</b> Los valores por metro cuadrado que se le dan
 * a la tabla son inventados para la prueba y estan a la vista; las celdas reales del cuadro estan
 * bloqueadas por D-02a y las espera #197. Precisamente por eso la prueba central de la valorizacion
 * es la que comprueba que <b>sin</b> tabla no sale ninguna cifra.
 */
@DisplayName("#48 — El FUE, su estado y la valorizacion de obra")
class FueYValorizacionTest {

    private static final LocalDate DECLARADO = LocalDate.of(2026, 3, 2);
    private static final Instant AHORA = Instant.parse("2026-03-02T10:00:00Z");
    private static final Observacion PORQUE = Observacion.de("Se registra para la prueba");

    // ==================================================================

    @Nested
    @DisplayName("AC 2 — La valorizacion usa las tablas de #17 y no duplica cifras")
    class Valorizacion {

        @Test
        @DisplayName("area por valor unitario, linea a linea, y la suma")
        void areaPorValorUnitario() {
            TablaDeValoresUnitarios tabla =
                    TablaDeValoresUnitarios.de(
                            List.of(
                                    celda("MUROS", 'A', "100.000000"),
                                    celda("TECHOS", 'B', "50.000000")),
                            2026);

            ValorizacionDeObra.Valorizacion obra =
                    ValorizacionDeObra.valorizar(
                            List.of(
                                    estructura(1, PartidaDeEdificacion.MUROS, 'A', "80.00"),
                                    estructura(1, PartidaDeEdificacion.TECHOS, 'B', "80.00")),
                            tabla);

            assertThat(obra.lineas()).hasSize(2);
            assertThat(obra.total().valor())
                    .as("80 x 100 + 80 x 50, sin ningun factor de mas")
                    .isEqualByComparingTo(new BigDecimal("12000.00"));
            assertThat(obra.anioDeConstruccion()).isEqualTo(2026);
        }

        @Test
        @DisplayName(
                "no aplica el 5 % ni deprecia: los dos son de otra regla y uno no tiene fuente")
        void ningunFactorDeMas() {
            TablaDeValoresUnitarios tabla =
                    TablaDeValoresUnitarios.de(List.of(celda("MUROS", 'A', "10.000000")), 2026);

            ValorizacionDeObra.Valorizacion obra =
                    ValorizacionDeObra.valorizar(
                            List.of(estructura(1, PartidaDeEdificacion.MUROS, 'A', "10.00")),
                            tabla);

            // 100,00 exactos. Con el incremento del 5 % de RT-002 —que D-11 marca SIN FUENTE
            // IDENTIFICADA— saldrian 105,00; con una depreciacion, menos. Los dos serian un
            // multiplicador inventado sobre el valor de una obra, y de ahi sale el derecho de
            // tramite que se le cobra al administrado.
            assertThat(obra.total().valor()).isEqualByComparingTo(new BigDecimal("100.00"));
        }

        @Test
        @DisplayName("no redondea: D-03 sigue abierta en sus tres partes")
        void noRedondea() {
            TablaDeValoresUnitarios tabla =
                    TablaDeValoresUnitarios.de(List.of(celda("PISOS", 'C', "33.333333")), 2026);

            ValorizacionDeObra.Valorizacion obra =
                    ValorizacionDeObra.valorizar(
                            List.of(estructura(2, PartidaDeEdificacion.PISOS, 'C', "3.33")), tabla);

            assertThat(obra.total().valor().scale())
                    .as("el producto trae mas decimales que los operandos, y salen enteros")
                    .isGreaterThan(2);
            assertThat(obra.total().valor()).isEqualByComparingTo(new BigDecimal("110.99999889"));
        }

        @Test
        @DisplayName("una celda que falta NO vale cero: falla nombrando la llave")
        void celdaQueFalta() {
            TablaDeValoresUnitarios tabla =
                    TablaDeValoresUnitarios.de(List.of(celda("MUROS", 'A', "100.000000")), 2026);

            assertThatThrownBy(
                            () ->
                                    ValorizacionDeObra.valorizar(
                                            List.of(
                                                    estructura(
                                                            1,
                                                            PartidaDeEdificacion.TECHOS,
                                                            'D',
                                                            "10.00")),
                                            tabla))
                    .isInstanceOf(TablaDeValoresUnitarios.ValorUnitarioSinParametrizar.class)
                    .hasMessageContaining("TECHOS:D")
                    .hasMessageContaining("#197")
                    .satisfies(
                            fallo ->
                                    assertThat(
                                                    ((TablaDeValoresUnitarios
                                                                            .ValorUnitarioSinParametrizar)
                                                                    fallo)
                                                            .llave())
                                            .isEqualTo("TECHOS:D"));
        }

        @Test
        @DisplayName("una tabla vacia no valoriza nada, y ninguna cifra sale de esta clase")
        void tablaVacia() {
            TablaDeValoresUnitarios tabla = TablaDeValoresUnitarios.de(List.of(), 2026);

            assertThat(tabla.tamano()).isZero();
            assertThatThrownBy(
                            () ->
                                    ValorizacionDeObra.valorizar(
                                            List.of(
                                                    estructura(
                                                            1,
                                                            PartidaDeEdificacion.MUROS,
                                                            'A',
                                                            "10.00")),
                                            tabla))
                    .isInstanceOf(TablaDeValoresUnitarios.ValorUnitarioSinParametrizar.class);
        }

        @Test
        @DisplayName("el cuadro es una matriz de dos dimensiones: la del anio que no es, no rige")
        void elCuadroTieneDosDimensiones() {
            // NEG-05 §RT-002: «el cuadro de valores unitarios es una matriz de dos dimensiones:
            // categoria x ano de construccion». Una celda de un rango que no cubre el anio de la
            // obra no se puede usar, y usarla es el defecto que ese documento describe.
            TablaDeValoresUnitarios tabla =
                    TablaDeValoresUnitarios.de(
                            List.of(
                                    new TablaDeValoresUnitarios.Celda(
                                            "MUROS", 'A', 1990, 2000, ValorNormativo.de("7.5"))),
                            2026);

            assertThat(tabla.tamano()).as("la celda es de 1990-2000 y la obra es de 2026").isZero();
        }

        @Test
        @DisplayName("sin ninguna estructura no hay valorizacion, y tampoco un cero")
        void sinEstructuras() {
            assertThatThrownBy(
                            () ->
                                    ValorizacionDeObra.valorizar(
                                            List.of(),
                                            TablaDeValoresUnitarios.de(
                                                    List.of(celda("MUROS", 'A', "1.0")), 2026)))
                    .isInstanceOf(ValorizacionDeObra.SinEstructuras.class)
                    .hasMessageContaining("no vale nada");
        }

        @Test
        @DisplayName("una categoria fuera del cuadro no se puede ni declarar")
        void categoriaFueraDelCuadro() {
            assertThatThrownBy(() -> estructura(1, PartidaDeEdificacion.MUROS, 'Z', "10.00"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("de A a I");
        }

        @Test
        @DisplayName("una partida de cero metros no se declara: no aporta nada y confunde")
        void areaCero() {
            assertThatThrownBy(() -> estructura(1, PartidaDeEdificacion.MUROS, 'A', "0.00"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ==================================================================

    @Nested
    @DisplayName("El estado se deriva, y a una fecha")
    class Estado {

        @Test
        @DisplayName("un expediente recien presentado esta EN_TRAMITE, no VIGENTE")
        void reciennPresentado() {
            // Es el defecto que V4 tenia: `estado varchar(15) DEFAULT 'VIGENTE'` decia VIGENTE
            // desde el INSERT, y un expediente en mesa de partes ya figuraba con licencia.
            assertThat(EstadoDelFue.derivarDe(List.of(), List.of(), DECLARADO))
                    .isEqualTo(EstadoDelFue.EN_TRAMITE);
        }

        @Test
        @DisplayName("emitida y dentro de su vigencia: VIGENTE; fuera de ella: VENCIDA")
        void vigenteYVencida() {
            List<MovimientoDeEdificacion> historial = List.of(emision(LocalDate.of(2026, 4, 1)));
            List<VigenciaDeLaLicencia> vigencias =
                    List.of(
                            new VigenciaDeLaLicencia(
                                    1L,
                                    3L,
                                    9L,
                                    1,
                                    LocalDate.of(2026, 4, 1),
                                    LocalDate.of(2026, 12, 31)));

            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2026, 6, 15)))
                    .isEqualTo(EstadoDelFue.VIGENTE);
            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2027, 1, 2)))
                    .as("vencida manana no significa vencida ayer (regla 9)")
                    .isEqualTo(EstadoDelFue.VENCIDA);
            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2026, 3, 1)))
                    .as("antes de emitirse estaba en tramite, no vencida")
                    .isEqualTo(EstadoDelFue.EN_TRAMITE);
        }

        @Test
        @DisplayName("AC 4: con dos tramos, la licencia sigue vigente en el segundo")
        void dosTramos() {
            List<MovimientoDeEdificacion> historial = List.of(emision(LocalDate.of(2026, 4, 1)));
            List<VigenciaDeLaLicencia> vigencias =
                    List.of(
                            new VigenciaDeLaLicencia(
                                    1L,
                                    3L,
                                    9L,
                                    1,
                                    LocalDate.of(2026, 4, 1),
                                    LocalDate.of(2026, 12, 31)),
                            new VigenciaDeLaLicencia(
                                    2L,
                                    3L,
                                    10L,
                                    2,
                                    LocalDate.of(2027, 1, 1),
                                    LocalDate.of(2027, 12, 31)));

            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2027, 6, 1)))
                    .as("el tramo de la revalidacion tambien cuenta")
                    .isEqualTo(EstadoDelFue.VIGENTE);
            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2028, 1, 1)))
                    .isEqualTo(EstadoDelFue.VENCIDA);
        }

        @Test
        @DisplayName("la anulacion gana sobre el vencimiento y no se olvida en diciembre")
        void anulada() {
            List<MovimientoDeEdificacion> historial =
                    List.of(
                            emision(LocalDate.of(2026, 4, 1)),
                            new MovimientoDeEdificacion(
                                    2L,
                                    3L,
                                    TipoDeMovimientoDeEdificacion.ANULACION,
                                    LocalDate.of(2026, 5, 3),
                                    null,
                                    "Obra no iniciada",
                                    null,
                                    99L,
                                    "RES-2026-000002",
                                    AHORA,
                                    null,
                                    PORQUE));
            List<VigenciaDeLaLicencia> vigencias =
                    List.of(
                            new VigenciaDeLaLicencia(
                                    1L,
                                    3L,
                                    9L,
                                    1,
                                    LocalDate.of(2026, 4, 1),
                                    LocalDate.of(2026, 12, 31)));

            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2026, 12, 1)))
                    .isEqualTo(EstadoDelFue.ANULADA);
            assertThat(EstadoDelFue.derivarDe(historial, vigencias, LocalDate.of(2026, 4, 20)))
                    .as("antes de anularse estaba vigente")
                    .isEqualTo(EstadoDelFue.VIGENTE);
        }
    }

    // ==================================================================

    @Nested
    @DisplayName("Invariantes del expediente y de sus actos")
    class Invariantes {

        @Test
        @DisplayName("AC 3: una ampliacion sin licencia original no es una ampliacion")
        void ampliacionSinOriginal() {
            assertThatThrownBy(() -> fue(TipoDeTramiteDeEdificacion.AMPLIACION_DE_LICENCIA, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("AC 3");
        }

        @Test
        @DisplayName("y una licencia de obra que nombra una original haria pensar que la sustituye")
        void licenciaDeObraConOriginal() {
            assertThatThrownBy(() -> fue(TipoDeTramiteDeEdificacion.LICENCIA_DE_OBRA, 42L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("sustituye");
        }

        @Test
        @DisplayName("solo la emision numera: la revalidacion prorroga la misma licencia")
        void soloLaEmisionNumera() {
            assertThatThrownBy(
                            () ->
                                    new MovimientoDeEdificacion(
                                            null,
                                            3L,
                                            TipoDeMovimientoDeEdificacion.REVALIDACION,
                                            DECLARADO,
                                            "LE-2026-000001",
                                            null,
                                            5L,
                                            9L,
                                            "RES-1",
                                            AHORA,
                                            null,
                                            PORQUE))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Solo la emision numera");
        }

        @Test
        @DisplayName("la emision y la revalidacion se cobran; la anulacion no")
        void elReciboVaDondeToca() {
            assertThatThrownBy(
                            () ->
                                    new MovimientoDeEdificacion(
                                            null,
                                            3L,
                                            TipoDeMovimientoDeEdificacion.EMISION,
                                            DECLARADO,
                                            "LE-2026-000001",
                                            null,
                                            null,
                                            9L,
                                            "RES-1",
                                            AHORA,
                                            null,
                                            PORQUE))
                    .as("emitir sin recibo del derecho de tramite no se puede ni construir (AC 5)")
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("caja de tasas");

            assertThatThrownBy(
                            () ->
                                    new MovimientoDeEdificacion(
                                            null,
                                            3L,
                                            TipoDeMovimientoDeEdificacion.ANULACION,
                                            DECLARADO,
                                            null,
                                            "Obra no iniciada",
                                            7L,
                                            9L,
                                            "RES-1",
                                            AHORA,
                                            null,
                                            PORQUE))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("ninguna norma condiciona");
        }

        @Test
        @DisplayName("un tramo de vigencia que termina antes de empezar nace vencido")
        void vigenciaAlReves() {
            assertThatThrownBy(
                            () ->
                                    new VigenciaDeLaLicencia(
                                            null,
                                            3L,
                                            9L,
                                            1,
                                            LocalDate.of(2026, 5, 1),
                                            LocalDate.of(2026, 4, 1)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("nace vencida");
        }

        @Test
        @DisplayName("el representante legal va entero o no va")
        void representanteAMedias() {
            assertThatThrownBy(() -> new RepresentanteLegal("12345678", "  ", "P-1", null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("entero");
        }

        @Test
        @DisplayName("el colegio y la colegiatura van juntos o no va ninguno")
        void colegiaturaAMedias() {
            assertThatThrownBy(
                            () ->
                                    new ProfesionalDelFue(
                                            null,
                                            3L,
                                            1,
                                            TipoDeProfesional.PROYECTISTA_ARQUITECTURA,
                                            "PEREZ, ANA",
                                            "CAP",
                                            null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("juntos");
        }

        @Test
        @DisplayName("las cinco secciones obligatorias son las cinco")
        void lasCincoSecciones() {
            assertThat(SeccionDelFue.obligatoriasParaEmitir())
                    .containsExactlyInAnyOrder(SeccionDelFue.values());
        }

        @Test
        @DisplayName("un anteproyecto en consulta no otorga licencia")
        void anteproyectoNoOtorga() {
            assertThat(TipoDeTramiteDeEdificacion.ANTEPROYECTO_EN_CONSULTA.emiteLicencia())
                    .isFalse();
            assertThat(TipoDeTramiteDeEdificacion.REVALIDACION_DE_LICENCIA.emiteLicencia())
                    .as("la revalidacion prorroga la misma licencia; no numera otra")
                    .isFalse();
        }
    }

    // ==================================================================

    @Nested
    @DisplayName("La numeracion (D-09 abierta)")
    class Numeracion {

        @Test
        @DisplayName("compone con el prefijo de edificacion, distinto del de funcionamiento")
        void componeConSuPrefijo() {
            assertThat(PlantillaDeNumeroDeEdificacion.POR_OMISION.componer(new Ejercicio(2026), 42))
                    .isEqualTo("LE-2026-000042");
            assertThat(PlantillaDeNumeroDeLicencia.POR_OMISION.componer(new Ejercicio(2026), 42))
                    .as("dos numeraciones independientes no comparten prefijo")
                    .isEqualTo("LF-2026-000042");
        }

        @Test
        @DisplayName("otra plantilla da otro numero, sin tocar una linea de codigo")
        void otraPlantilla() {
            PlantillaDeNumeroDeEdificacion otra =
                    new PlantillaDeNumeroDeEdificacion(
                            new PlantillaDeNumeroDeLicencia("{correlativo:4}-{ejercicio}-LO"));
            assertThat(otra.componer(new Ejercicio(2026), 7)).isEqualTo("0007-2026-LO");
        }
    }

    // ==================================================================

    private static TablaDeValoresUnitarios.Celda celda(
            String partida, char categoria, String valorM2) {
        // La cifra es inventada para la prueba y esta a la vista. Las reales las espera #197.
        return new TablaDeValoresUnitarios.Celda(
                partida, categoria, 1990, null, ValorNormativo.de(valorM2));
    }

    private static EstructuraDelProyecto estructura(
            int piso, PartidaDeEdificacion partida, char categoria, String area) {
        return new EstructuraDelProyecto(
                null, 3L, 1, piso, partida, categoria, new AreaM2(new BigDecimal(area)));
    }

    private static MovimientoDeEdificacion emision(LocalDate fecha) {
        return MovimientoDeEdificacion.emision(
                3L,
                fecha,
                "LE-2026-000001",
                5L,
                9L,
                "LICENCIA_EDIFICACION-2026-000001",
                AHORA,
                PORQUE);
    }

    private static FueDeEdificacion fue(
            TipoDeTramiteDeEdificacion tramite, @org.jspecify.annotations.Nullable Long origen) {
        return new FueDeEdificacion(
                null,
                "EXP-2026-0001",
                DECLARADO,
                7L,
                null,
                tramite,
                TipoDeObra.EDIFICACION_NUEVA,
                ModalidadDeAprobacion.B,
                RevisionDelProyecto.COMISION_TECNICA,
                null,
                origen,
                true,
                null,
                AHORA,
                null,
                PORQUE);
    }
}
