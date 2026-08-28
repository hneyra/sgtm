package pe.gob.sgtm.fiscalizacion.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.catastro.PredioDelPadron;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.fiscalizacion.dobles.DeclaracionesDeMentira;
import pe.gob.sgtm.fiscalizacion.dobles.PadronDeMentira;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.FilaDeOmisos;
import pe.gob.sgtm.rentas.DeclaracionDelEjercicio;

/**
 * Omisos y subvaluadores (#49, RF-055). El cruce del padrón contra las declaraciones.
 *
 * <p>El caso que da nombre al AC 3 es {@link #elExtemporaneoNoEsOmiso()}.
 */
@DisplayName("#49 — Omisos y subvaluadores")
class DeteccionDeOmisosTest {

    private static final Ejercicio E2024 = new Ejercicio(2024);
    private static final LocalDate HOY = LocalDate.of(2026, 3, 16);
    private static final Paginacion PAGINA = Paginacion.de(0, 20, "codigoRefCatastral");

    private static final long SIN_DECLARAR = 21L;
    private static final long EN_PLAZO = 22L;
    private static final long TARDE = 23L;
    private static final long AMPLIADO = 24L;

    private static final long FICHA_120 = 700L;
    private static final long FICHA_300 = 800L;

    @Test
    @DisplayName("quien tiene predio y no declaro sale OMISO")
    void quienNoDeclaroSaleOmiso() {
        assertThat(condicionDe(SIN_DECLARAR)).isEqualTo(CondicionFiscalizada.OMISO);
    }

    @Test
    @DisplayName("quien declaro fuera de plazo NO sale omiso, y la fila lo dice aparte (AC 3)")
    void elExtemporaneoNoEsOmiso() {
        FilaDeOmisos fila = filaDe(TARDE);

        assertThat(fila.condicion())
                .as(
                        "declarar tarde y no declarar son cosas distintas: la primera es la multa"
                                + " del art. 176, la segunda una determinacion de oficio")
                .isEqualTo(CondicionFiscalizada.CONFORME);
        assertThat(fila.declaroFueraDePlazo())
                .as("y la pantalla tiene que poder decirlo sin mezclarlo con la condicion")
                .isTrue();
    }

    @Test
    @DisplayName("quien declaro una ficha mas pequena que la vigente sale SUBVALUADOR")
    void quienDeclaroDeMenosSaleSubvaluador() {
        FilaDeOmisos fila = filaDe(AMPLIADO);

        assertThat(fila.condicion()).isEqualTo(CondicionFiscalizada.SUBVALUADOR);
        assertThat(fila.areaDeclarada()).isEqualTo(AreaM2.de("120.00"));
        assertThat(fila.areaCatastral()).isEqualTo(AreaM2.de("300.00"));
        assertThat(fila.diferenciaDeArea()).isEqualTo(AreaM2.de("180.00"));
    }

    @Test
    @DisplayName("quien declaro la ficha vigente sale CONFORME")
    void quienDeclaroBienSaleConforme() {
        assertThat(condicionDe(EN_PLAZO)).isEqualTo(CondicionFiscalizada.CONFORME);
    }

    @Test
    @DisplayName("las cuatro columnas de importe salen con nombre y sin cifra (D-02a, #198)")
    void lasCuatroColumnasDeImporteSinCifra() {
        FilaDeOmisos fila = filaDe(AMPLIADO);

        assertThat(fila.valorCatastral()).isNull();
        assertThat(fila.valorDeclarado()).isNull();
        assertThat(fila.impuestoOmitido()).isNull();
        assertThat(fila.esperaSusCifras()).isTrue();
    }

    @Test
    @DisplayName("el filtro de condicion no altera el total de la pagina")
    void elFiltroDeCondicionNoAlteraElTotal() {
        Pagina<FilaDeOmisos> pagina =
                servicio().detectar(E2024, null, CondicionFiscalizada.OMISO, HOY, PAGINA);

        assertThat(pagina.contenido()).hasSize(1);
        assertThat(pagina.totalElementos())
                .as(
                        "el total es el del padron filtrado por sector: recalcularlo sobre las"
                                + " filas que sobreviven diria «1 de 1» sobre un padron entero")
                .isEqualTo(4);
    }

    @Test
    @DisplayName("una fila OMISA no puede declarar que presento fuera de plazo")
    void unaFilaOmisaNoDeclaraFueraDePlazo() {
        assertThat(filaDe(SIN_DECLARAR).declaroFueraDePlazo()).isFalse();
    }

    // ------------------------------------------------------------------

    private static CondicionFiscalizada condicionDe(long predioId) {
        return filaDe(predioId).condicion();
    }

    private static FilaDeOmisos filaDe(long predioId) {
        return servicio().detectar(E2024, null, null, HOY, PAGINA).contenido().stream()
                .filter(fila -> fila.predioId() == predioId)
                .findFirst()
                .orElseThrow();
    }

    private static DeteccionDeOmisos servicio() {
        PadronDeMentira catastro =
                new PadronDeMentira()
                        .conFicha(FICHA_120, AreaM2.de("120.00"))
                        .conFicha(FICHA_300, AreaM2.de("300.00"))
                        .con(predio(SIN_DECLARAR, FICHA_120, "120.00"))
                        .con(predio(EN_PLAZO, FICHA_120, "120.00"))
                        .con(predio(TARDE, FICHA_120, "120.00"))
                        .con(predio(AMPLIADO, FICHA_300, "300.00"));

        DeclaracionesDeMentira rentas =
                new DeclaracionesDeMentira()
                        .con(EN_PLAZO, declaracion(1L, false, FICHA_120))
                        .con(TARDE, declaracion(2L, true, FICHA_120))
                        // El contribuyente declaro la ficha de 120 m2; el catastro tiene inscrita
                        // la de 300 m2 tras una ampliacion que nunca se declaro.
                        .con(AMPLIADO, declaracion(3L, false, FICHA_120));

        return new DeteccionDeOmisos(catastro, catastro, rentas);
    }

    private static PredioDelPadron predio(long id, long fichaId, String area) {
        return new PredioDelPadron(
                id,
                String.format("%018d", id),
                "Jr. Union " + id,
                "S-01",
                100L + id,
                AreaM2.de(area),
                "CASA_HABITACION",
                fichaId);
    }

    private static DeclaracionDelEjercicio declaracion(
            long id, boolean fueraDePlazo, long fichaId) {
        return new DeclaracionDelEjercicio(
                id,
                "DJ-000" + id,
                E2024,
                100L,
                LocalDate.of(2024, fueraDePlazo ? 6 : 2, 20),
                fueraDePlazo,
                fichaId);
    }
}
