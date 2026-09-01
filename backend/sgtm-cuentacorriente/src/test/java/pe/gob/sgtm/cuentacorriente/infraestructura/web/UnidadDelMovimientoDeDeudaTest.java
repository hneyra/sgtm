package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.cuentacorriente.aplicacion.ComprobarLaUnidadDelMovimiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.RangoDeCuotas;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #635 — La unidad de un alta o una baja de deuda es del obligado, o la peticion dice que no lo es.
 *
 * <h2>Que estaba mal</h2>
 *
 * <p>{@code predioId} y {@code vehiculoId} llegaban del cuerpo a {@code ClaveDeSaldo} <b>sin que
 * nadie los mirara</b>. Un alta sobre el vehiculo de otra persona respondia 201, con su importe
 * correcto y su nota de abono emitida; y como {@code ClaveDeSaldo} compara por igualdad exacta, esa
 * obligacion queda en una clave que no sale en la ficha del vehiculo —que es la de su titular— ni
 * se suma a la deuda sin unidad de quien paga. Ninguna cifra parece mal.
 *
 * <h2>Que mide esta prueba y que no</h2>
 *
 * <p>El <b>borde</b>: que se pregunte por la unidad, con la {@code fechaValor} y no con el reloj,
 * que las tres respuestas sean tres, y que la declaracion de titular ajeno acabe en la {@link
 * Observacion} que llega al libro. Que la titularidad se resuelva de verdad contra {@code
 * titularidad} y {@code vehiculo}, y que la unidad de otra municipalidad no exista, se mide contra
 * PostgreSQL en {@code PadronDeUnidadesFronteraTest}: un doble puede prometer cualquier cosa.
 *
 * <p>Cada caso se prueba en las <b>dos</b> rutas donde el issue lo pide: alta y baja comparten el
 * metodo privado {@code registrar}, y lo que estas pruebas fijan es que siga siendo asi.
 */
@DisplayName("#635 — La unidad de la obligacion es del obligado, o se declara que no")
class UnidadDelMovimientoDeDeudaTest {

    private static final LocalDate HOY = LocalDate.of(2026, 9, 1);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    /** La fecha valor de las peticiones: a proposito distinta del reloj (regla 9). */
    private static final String FECHA_VALOR = "2024-06-30";

    private static final String OBSERVACION = "Deuda migrada del sistema anterior";

    private final PadronDeUnidadesDeMentira padron =
            new PadronDeUnidadesDeMentira().conPredio(5L, 11L).conVehiculo(8L, 11L);
    private final MovimientosEspiados movimientos = new MovimientosEspiados();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new MovimientosDeDeudaController(
                                    movimientos,
                                    new LibroDeMentira(),
                                    new ComprobarLaUnidadDelMovimiento(padron),
                                    RELOJ))
                    .setControllerAdvice(new ManejadorDeErrores())
                    .setMessageConverters(
                            new JacksonJsonHttpMessageConverter(
                                    JsonMapper.builder()
                                            .addModule(
                                                    new ConfiguracionDeJson()
                                                            .moduloDeObjetosDeValor())
                                            .build()))
                    .build();

    // ---------- AC 1 y AC 2: la unidad tiene que existir ----------

    @Test
    @DisplayName("un vehiculoId que no esta en el padron responde 422 nombrandolo (AC 1)")
    void elVehiculoInexistenteSeRechaza() throws Exception {
        MvcResult resultado = alta("\"vehiculoId\":999999,", "RD-2026-000901");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("nombrando la unidad: un identificador que no apunta a nada no se adivina")
                .contains("vehiculo 999999")
                .contains("no esta en el padron");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("un predioId que no esta en el padron responde 422 nombrandolo (AC 2)")
    void elPredioInexistenteSeRechaza() throws Exception {
        MvcResult resultado = alta("\"predioId\":999999,", "RD-2026-000902");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("predio 999999")
                .contains("no esta en el padron");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("declarar el titular ajeno no hace que la unidad exista: sigue siendo 422 (AC 1)")
    void laDeclaracionNoInventaLaUnidad() throws Exception {
        MvcResult resultado =
                alta("\"vehiculoId\":999999,\"unidadDeOtroTitular\":true,", "RD-2026-000903");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("no esta en el padron");
        assertThat(movimientos.registros).isZero();
    }

    // ---------- AC 3: la unidad de otro, sin declararlo ----------

    @Test
    @DisplayName("un predio de otro contribuyente responde 422 nombrando al titular (AC 3)")
    void elPredioAjenoSeRechaza() throws Exception {
        MvcResult resultado = alta("\"predioId\":5,", "RD-2026-000904");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("nombrando al titular y la fecha a la que se resolvio, no «no autorizado»")
                .contains("no es del contribuyente C-0007")
                .contains("C-00011")
                .contains(FECHA_VALOR)
                .contains("unidadDeOtroTitular");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("la titularidad se resuelve con la fechaValor, nunca con el reloj (AC 3)")
    void laTitularidadSeResuelveConLaFechaValor() throws Exception {
        alta("\"predioId\":5,", "RD-2026-000905");

        assertThat(padron.fechasPreguntadas())
                .as(
                        "la deuda de 2024 es del titular de 2024: con el reloj (%s) se senalaria a"
                                + " quien compro despues, que es #24 y #366 en este camino",
                        HOY)
                .containsExactly(LocalDate.parse(FECHA_VALOR));
    }

    @Test
    @DisplayName("una unidad sin titular a esa fecha tampoco se da por buena (AC 3)")
    void laUnidadSinTitularSeRechaza() throws Exception {
        padron.conPredio(6L);

        MvcResult resultado = alta("\"predioId\":6,", "RD-2026-000906");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("no figura a nombre de nadie");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("la unidad del propio obligado pasa, y la observacion no se toca")
    void laUnidadPropiaPasaSinNota() throws Exception {
        padron.conPredio(7L, 7L);

        MvcResult resultado = alta("\"predioId\":7,", "RD-2026-000907");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimaObservacion().texto())
                .as("sin nada anomalo que decir, la bitacora lleva lo que escribio el usuario")
                .isEqualTo(OBSERVACION);
    }

    @Test
    @DisplayName("uno de varios titulares basta: el copropietario es titular (AC 3)")
    void unoDeVariosTitularesBasta() throws Exception {
        padron.conPredio(9L, 11L, 7L);

        MvcResult resultado = alta("\"predioId\":9,", "RD-2026-000908");

        assertThat(resultado.getResponse().getStatus())
                .as("dos conyuges al 50 %% son los dos titulares, no medio titular cada uno")
                .isEqualTo(201);
    }

    @Test
    @DisplayName("sin unidad no se pregunta nada: la obligacion anual sigue siendo legitima")
    void sinUnidadNoSePreguntaNada() throws Exception {
        MvcResult resultado = alta("", "RD-2026-000909");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(padron.fechasPreguntadas()).isEmpty();
    }

    // ---------- AC 4: el caso legitimo se registra, y se nota ----------

    @Test
    @DisplayName("declarado, el alta sobre la unidad de otro se registra (AC 4)")
    void laUnidadAjenaDeclaradaSeRegistra() throws Exception {
        MvcResult resultado =
                alta("\"predioId\":5,\"unidadDeOtroTitular\":true,", "RD-2026-000910");

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "la deuda de un ejercicio anterior a la transferencia es del titular de"
                                + " entonces: bloquearla sin salida dejaria ese acto sin poder hacerse")
                .isEqualTo(201);
        assertThat(movimientos.registros).isEqualTo(1);
    }

    @Test
    @DisplayName("y queda dicho en la bitacora: la fila no es indistinguible de un alta normal")
    void laDeclaracionQuedaEnLaBitacora() throws Exception {
        alta("\"predioId\":5,\"unidadDeOtroTitular\":true,", "RD-2026-000911");

        assertThat(movimientos.ultimaObservacion().texto())
                .as("la observacion es el motivo del asiento y la de su fila de auditoria")
                .startsWith("[titular ajeno declarado: el predio 5 figura a nombre de C-00011")
                .contains(FECHA_VALOR)
                .endsWith(OBSERVACION);
    }

    @Test
    @DisplayName("si la nota no cabe en los 500 de la observacion, se dice cuanto acortar")
    void laNotaQueNoCabeSeDice() throws Exception {
        String larga = "M".repeat(Observacion.LARGO_MAXIMO - 10);

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpo(
                                                        "\"predioId\":5,\"unidadDeOtroTitular\":true,",
                                                        "RD-2026-000912",
                                                        larga)))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "recortar en silencio lo que escribio el usuario es perder lo que la regla"
                                + " 10 existe para guardar")
                .contains("no cabe junto a la nota")
                .contains("acortala a");
        assertThat(movimientos.registros).isZero();
    }

    // ---------- AC 5: la baja lo contesta igual ----------

    @Test
    @DisplayName("la baja rechaza la unidad inexistente igual que el alta (AC 5)")
    void laBajaRechazaLaUnidadInexistente() throws Exception {
        MvcResult resultado = baja("\"vehiculoId\":999999,", "RES-2026-000913");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("vehiculo 999999");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("la baja rechaza la unidad ajena igual que el alta (AC 5)")
    void laBajaRechazaLaUnidadAjena() throws Exception {
        MvcResult resultado = baja("\"vehiculoId\":8,", "RES-2026-000914");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("y el mensaje dice que del vehiculo solo se sabe el titular de HOY")
                .contains("no es del contribuyente C-0007")
                .contains("el padron vehicular no guarda de quien era en otra fecha");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("la baja declarada se registra, con su nota, igual que el alta (AC 5)")
    void laBajaDeclaradaSeRegistra() throws Exception {
        MvcResult resultado =
                baja("\"vehiculoId\":8,\"unidadDeOtroTitular\":true,", "RES-2026-000915");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimaObservacion().texto())
                .startsWith("[titular ajeno declarado: el vehiculo 8 figura a nombre de C-00011");
    }

    // ------------------------------------------------------------------

    private MvcResult alta(String unidad, String documento) throws Exception {
        return mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo(unidad, documento, OBSERVACION)))
                .andReturn();
    }

    private MvcResult baja(String unidad, String documento) throws Exception {
        return mvc.perform(
                        post("/api/v1/rentas/deuda/bajas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo(unidad, documento, OBSERVACION)))
                .andReturn();
    }

    private static String cuerpo(String unidad, String documento, String observacion) {
        return "{\"codContribuyente\":\"C-0007\",\"tributo\":\"PREDIAL\",\"ano\":\"2026\","
                + "\"cuota\":1,"
                + unidad
                + "\"insoluto\":\"100.00\",\"fechaValor\":\""
                + FECHA_VALOR
                + "\",\"documentoOrigen\":\""
                + documento
                + "\",\"observacion\":\""
                + observacion
                + "\"}";
    }

    /** Espia el movimiento y la observacion con que el controlador lo mando al libro. */
    private static final class MovimientosEspiados extends RegistrarMovimientoDeDeuda {

        private int registros;
        private @Nullable Observacion observacion;

        MovimientosEspiados() {
            super(null, null, null, null, null);
        }

        @Override
        public Registro registrar(
                MovimientoDeDeuda movimiento,
                RangoDeCuotas cuotas,
                String codigoContribuyente,
                Observacion observacion) {
            registros++;
            this.observacion = observacion;
            List<Asiento> asentados = new ArrayList<>();
            for (MovimientoDeDeuda deLaCuota : movimiento.enCadaCuota(cuotas)) {
                asentados.addAll(deLaCuota.enAsientos());
            }
            return new Registro(List.copyOf(asentados), "NC-2026-000001");
        }

        Observacion ultimaObservacion() {
            if (observacion == null) {
                throw new AssertionError("No se registro ningun movimiento");
            }
            return observacion;
        }
    }

    /** Solo resuelve el codigo del contribuyente: es lo unico que el controlador le pide. */
    private static final class LibroDeMentira extends ConsultasDelLibro {

        LibroDeMentira() {
            super(null);
        }

        @Override
        public Optional<Long> contribuyentePorCodigo(String codigo) {
            return "C-0007".equals(codigo) ? Optional.of(7L) : Optional.empty();
        }
    }
}
