package pe.gob.sgtm.catastro.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.autorizacion.ComprobadorDeAcceso;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.catastro.aplicacion.ConsultaDeSectores;
import pe.gob.sgtm.catastro.aplicacion.RegistrarManzana;
import pe.gob.sgtm.catastro.aplicacion.RegistrarSector;
import pe.gob.sgtm.catastro.dominio.CatastroRepository;
import pe.gob.sgtm.catastro.dominio.Inquilino;
import pe.gob.sgtm.catastro.dominio.Manzana;
import pe.gob.sgtm.catastro.dominio.Predio;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.dominio.Titularidad;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * El catalogo territorial por HTTP de verdad: sectores y sus manzanas.
 *
 * <p>Espejo de {@code ViaControllerTest}, y por la misma razon: sin base de datos, con el
 * repositorio en memoria. Lo que se verifica aqui es el <b>transporte</b> —forma del JSON,
 * paginacion, traduccion de errores, el estado HTTP de un alta, la observacion vacia como 422 y el
 * privilegio que la baja exige de mas—; lo que la base si verifica —el aislamiento y la auditoria
 * en la misma transaccion— tiene sus pruebas en {@code RegistrarSectorTest} y {@code
 * RegistrarManzanaTest}, contra PostgreSQL real.
 */
@DisplayName("Capa web — /api/v1/catastro/sectores")
class SectorControllerTest {

    private final RepositorioEnMemoria repositorio = new RepositorioEnMemoria();

    /** Lo que la auditoria recibio, para poder afirmar sobre la operacion que se asento. */
    private final List<RegistroDeAuditoria> asentado = new ArrayList<>();

    /** La fecha no importa al transporte; se fija para no depender del dia de ejecucion. */
    private final Clock reloj =
            Clock.fixed(Instant.parse("2026-08-27T10:00:00Z"), ZoneId.of("America/Lima"));

    private final RegistrarSector registrarSector =
            new RegistrarSector(repositorio, asentado::add, reloj);

    private final RegistrarManzana registrarManzana =
            new RegistrarManzana(repositorio, asentado::add, reloj);

    /**
     * Quien tiene que privilegio. Empieza con los tres que la pantalla usa; una prueba le quita
     * {@code ELIMINACION} para comprobar que la baja se niega sin el.
     */
    private final Set<Privilegio> privilegios =
            EnumSet.of(Privilegio.LECTURA, Privilegio.REGISTRO, Privilegio.MODIFICACION);

    private final ComprobadorDeAcceso comprobador =
            (usuario, acceso, privilegio, fecha) -> privilegios.contains(privilegio);

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new SectorController(
                                    new ConsultaDeSectores(repositorio),
                                    registrarSector,
                                    registrarManzana,
                                    comprobador,
                                    reloj))
                    .setControllerAdvice(new ManejadorDeErrores())
                    .setMessageConverters(
                            new JacksonJsonHttpMessageConverter(
                                    JsonMapper.builder()
                                            .addModule(
                                                    new ConfiguracionDeJson()
                                                            .moduloDeObjetosDeValor())
                                            .build()))
                    .build();

    /**
     * El origen de la peticion lo fija el borde de la aplicacion; aqui no hay borde, asi que se
     * fija a mano. Sin el, la comprobacion del privilegio de baja no sabria por quien preguntar.
     */
    @BeforeEach
    void fijarOrigen() {
        OrigenContext.fijar(new Origen("mtorres", "PC-CATASTRO-01", "10.1.1.9"));
    }

    @AfterEach
    void limpiarOrigen() {
        OrigenContext.limpiar();
    }

    // ── Lectura ────────────────────────────────────────────────────────

    @Test
    @DisplayName("devuelve la pagina en la forma unica, con campos en español camelCase")
    void devuelveLaPaginaEnLaFormaUnica() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/sectores")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"contenido\"")
                .contains("\"totalElementos\":3")
                .contains("\"codigo\":\"SC-1\"")
                .contains("\"nombre\":\"Sector Centro\"")
                .contains("\"zona\":\"Zona A\"");
    }

    @Test
    @DisplayName("no devuelve la municipalidad, porque no la conoce ni la necesita")
    void noDevuelveLaMunicipalidad() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/sectores")).andReturn();

        assertThat(resultado.getResponse().getContentAsString())
                .as("el identificador de municipalidad no sale ni entra por HTTP (ADR-0005)")
                .doesNotContain("municipalidad");
    }

    @Test
    @DisplayName("el orden por omision lo decide la operacion, que es quien conoce la tabla")
    void elOrdenPorOmisionLoDecideLaOperacion() throws Exception {
        mvc.perform(get("/api/v1/catastro/sectores")).andReturn();

        assertThat(repositorio.ultima).isNotNull();
        assertThat(repositorio.ultima.ordenarPor()).isEqualTo("codigo");
    }

    // ── Alta de sector ─────────────────────────────────────────────────

    @Test
    @DisplayName("el alta responde 201 con el sector ya identificado, sin la municipalidad")
    void elAltaResponde201() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"SC-9","nombre":"Sector Norte",
                                                 "zona":"Zona C",
                                                 "observacion":"Alta por ordenanza 2026-07"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"SC-9\"")
                .contains("\"nombre\":\"Sector Norte\"")
                .contains("\"zona\":\"Zona C\"")
                .contains("\"activo\":true")
                .doesNotContain("municipalidad");
        assertThat(repositorio.sectorPorCodigo("SC-9")).isPresent();
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.ALTA);
    }

    @Test
    @DisplayName("la zona es opcional: un alta sin ella entra igual")
    void laZonaEsOpcional() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"SC-10","nombre":"Sector Sin Zona",
                                                 "observacion":"Alta sin zona asignada todavia"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"zona\":null");
    }

    @Test
    @DisplayName("un alta sin observacion es 422: sin ella no se guarda (regla 10)")
    void unAltaSinObservacionEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codigo\":\"SC-9\","
                                                        + "\"nombre\":\"Sector Nuevo\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("observacion");
        assertThat(repositorio.sectorPorCodigo("SC-9")).as("no se guardo nada").isEmpty();
        assertThat(asentado).isEmpty();
    }

    @Test
    @DisplayName("un alta sin nombre es 422: no hay sector anterior del que heredarlo")
    void unAltaSinNombreEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codigo\":\"SC-9\","
                                                        + "\"observacion\":\"Alta sin nombre\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("nombre");
        assertThat(repositorio.sectorPorCodigo("SC-9")).isEmpty();
    }

    @Test
    @DisplayName("un sector nace activo: el activo=false del cuerpo del alta se ignora")
    void unSectorNaceActivo() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"SC-11","nombre":"Sector Nacido Muerto",
                                                 "activo":false,
                                                 "observacion":"Intento de alta ya dada de baja"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .as("un alta y una baja en un solo acto dejarian la auditoria diciendo solo ALTA")
                .contains("\"activo\":true");
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.ALTA);
    }

    @Test
    @DisplayName("un codigo que ya existe es 409, no una incidencia, y no nombra la restriccion")
    void unCodigoRepetidoEs409() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"SC-1","nombre":"Otro sector",
                                                 "observacion":"Alta con un codigo ya usado"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("lo mando mal el cliente, y el estado actual no admite la operacion")
                .isEqualTo(409);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"codigo\":\"CONFLICTO\"").contains("SC-1");
        assertThat(cuerpo)
                .as("ni tabla, ni restriccion, ni SQL: eso reconstruye el esquema")
                .doesNotContain("sector_codigo_uq")
                .doesNotContain("duplicate key")
                .doesNotContain("incidencia");
    }

    // ── Edicion y baja de sector ───────────────────────────────────────

    @Test
    @DisplayName("editar un sector cambia su nombre y conserva su codigo")
    void editarUnSectorCambiaSuNombre() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"nombre":"Sector Centro Historico",
                                                 "observacion":"Correccion de nomenclatura"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"SC-1\"")
                .contains("\"nombre\":\"Sector Centro Historico\"");
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.MODIFICACION);
        assertThat(ultimoAsiento().datosAnteriores())
                .as("una MODIFICACION sin el estado previo no permite reconstruir nada")
                .isNotNull()
                .contains("Sector Centro");
    }

    @Test
    @DisplayName("editar solo el nombre conserva la zona y el estado que el sector ya tenia")
    void editarSoloElNombreConservaLoDemas() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"nombre":"Sector Centro Historico",
                                                 "observacion":"Solo el nombre"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .as("lo que no viene en el cuerpo, no cambia")
                .contains("\"zona\":\"Zona A\"")
                .contains("\"activo\":true")
                .contains("\"nombre\":\"Sector Centro Historico\"");
    }

    @Test
    @DisplayName("una zona en blanco si la borra: es una instruccion, no una omision")
    void unaZonaEnBlancoLaBorra() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"zona":"","observacion":"La zona estaba mal"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"zona\":null");
    }

    @Test
    @DisplayName("el codigo del cuerpo se ignora en el PUT: al sector lo identifica la ruta")
    void elCodigoDelCuerpoSeIgnora() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"SC-OTRO","nombre":"Sector Centro",
                                                 "observacion":"Intento de renombrar el codigo"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"codigo\":\"SC-1\"");
        assertThat(repositorio.sectorPorCodigo("SC-OTRO"))
                .as("el codigo es un tramo del codigo catastral de sus predios: no se renombra")
                .isEmpty();
        assertThat(repositorio.sectorPorCodigo("SC-1")).isPresent();
    }

    @Test
    @DisplayName("un PUT sin observacion es 422: sin ella no se guarda (regla 10)")
    void unPutSinObservacionEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"nombre\":\"Sector sin motivo\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("observacion");
        assertThat(repositorio.sectorPorCodigo("SC-1"))
                .get()
                .extracting(Sector::nombre)
                .isEqualTo("Sector Centro");
        assertThat(asentado).as("no se asento nada").isEmpty();
    }

    @Test
    @DisplayName(
            "la baja es un PUT con activo=false, no un DELETE (RNF-051), y se audita como BAJA")
    void laBajaEsUnPutConActivoFalse() throws Exception {
        privilegios.add(Privilegio.ELIMINACION);

        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-2")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"activo":false,
                                                 "observacion":"Sector fusionado con el Centro"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"activo\":false");
        assertThat(repositorio.sectorPorCodigo("SC-2"))
                .as(
                        "dar de baja no es borrar: su codigo esta en el codigo catastral de sus predios")
                .isPresent();
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.BAJA);
        assertThat(ultimoAsiento().datosAnteriores()).isNotNull().contains("\"activo\":true");
    }

    @Test
    @DisplayName("sin el privilegio ELIMINACION la baja se niega, con el mismo 403 del guardia")
    void sinEliminacionLaBajaSeNiega() throws Exception {
        privilegios.remove(Privilegio.ELIMINACION);

        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-2")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"activo":false,
                                                 "observacion":"Baja sin tener el privilegio"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(403);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"SIN_PRIVILEGIO\"");
        assertThat(repositorio.sectorPorCodigo("SC-2"))
                .get()
                .extracting(Sector::activo)
                .as("el sector sigue activo: no se guardo nada")
                .isEqualTo(true);
        assertThat(asentado).isEmpty();
    }

    @Test
    @DisplayName("editar sin dar de baja no necesita ELIMINACION")
    void editarSinDarDeBajaNoNecesitaEliminacion() throws Exception {
        privilegios.remove(Privilegio.ELIMINACION);

        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-2")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"nombre":"Sector Sur Ampliado",
                                                 "observacion":"Correccion de nomenclatura"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.MODIFICACION);
    }

    @Test
    @DisplayName("reactivar un sector dado de baja es MODIFICACION, no una BAJA al reves")
    void reactivarEsModificacion() throws Exception {
        privilegios.remove(Privilegio.ELIMINACION);

        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-BAJA")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"activo":true,
                                                 "observacion":"Se reabre por acuerdo de concejo"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("reactivar no retira nada del catalogo: no exige ELIMINACION")
                .isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"activo\":true");
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.MODIFICACION);
    }

    @Test
    @DisplayName("editar un sector que no existe es 404, no 500 ni un alta encubierta")
    void editarUnSectorQueNoExisteEs404() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/sectores/SC-NADA")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"nombre\":\"Sector X\","
                                                        + "\"observacion\":\"Intento de edicion\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"NO_ENCONTRADO\"");
        assertThat(repositorio.sectorPorCodigo("SC-NADA")).isEmpty();
        assertThat(asentado).isEmpty();
    }

    // ── Alta de manzana ────────────────────────────────────────────────

    @Test
    @DisplayName("el alta de una manzana responde 201 bajo el sector de la ruta")
    void elAltaDeManzanaResponde201() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-1/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"002",
                                                 "observacion":"Alta por levantamiento catastral"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"002\"")
                .contains("\"sectorId\":1")
                .doesNotContain("municipalidad");
        assertThat(ultimoAsiento().operacion()).isEqualTo(Operacion.ALTA);
        assertThat(ultimoAsiento().tabla()).isEqualTo("manzana");
    }

    @Test
    @DisplayName("un alta de manzana sin observacion es 422 (regla 10)")
    void unAltaDeManzanaSinObservacionEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-1/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"codigo\":\"002\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("observacion");
        assertThat(asentado).isEmpty();
    }

    @Test
    @DisplayName("una manzana repetida dentro del mismo sector es 409")
    void unaManzanaRepetidaEs409() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-1/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"001",
                                                 "observacion":"Alta con un codigo ya usado"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(409);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"codigo\":\"CONFLICTO\"").contains("001").contains("SC-1");
        assertThat(cuerpo)
                .as("ni tabla, ni restriccion, ni SQL")
                .doesNotContain("manzana_codigo_uq")
                .doesNotContain("duplicate key");
    }

    @Test
    @DisplayName("el mismo codigo de manzana en otro sector es otra manzana, y entra")
    void elMismoCodigoEnOtroSectorEntra() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-2/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"001",
                                                 "observacion":"Manzana 001 del sector sur"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("el codigo es unico dentro de su sector, no en toda la municipalidad")
                .isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"sectorId\":2");
    }

    @Test
    @DisplayName("una manzana de un sector que no existe es 404, no 422 ni una incidencia")
    void unaManzanaDeSectorInexistenteEs404() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-NADA/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"001",
                                                 "observacion":"Alta bajo un sector inexistente"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("un recurso que no esta es un 404; el 422 diria que el cuerpo esta mal")
                .isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"NO_ENCONTRADO\"")
                .contains("SC-NADA");
        assertThat(asentado).as("no se asento un alta que no ocurrio").isEmpty();
    }

    @Test
    @DisplayName("una manzana sin codigo es 422")
    void unaManzanaSinCodigoEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/sectores/SC-1/manzanas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"observacion\":\"Alta sin codigo\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("codigo");
        assertThat(asentado).isEmpty();
    }

    private RegistroDeAuditoria ultimoAsiento() {
        assertThat(asentado).as("la escritura tenia que dejar su asiento").isNotEmpty();
        return asentado.get(asentado.size() - 1);
    }

    /**
     * Repositorio en memoria: aqui se prueba el transporte, no la persistencia.
     *
     * <p>Lo que si imita, porque sin ello no habria nada que traducir, es la <b>unicidad</b>: el
     * codigo del sector en toda la municipalidad, y el de la manzana <b>dentro de su sector</b>.
     * Las dos lanzan la misma {@link DuplicateKeyException} que Spring traduce del {@code duplicate
     * key value violates unique constraint} de PostgreSQL. Lo que no imita es la politica RLS: eso
     * lo verifican {@code RegistrarSectorTest} y {@code RegistrarManzanaTest} contra PostgreSQL.
     *
     * <p>De los otros metodos de {@link CatastroRepository} —predios, titularidad, inquilinos— no
     * pasa ninguno por este controlador; lanzan en vez de devolver vacio, para que una prueba que
     * los alcanzara sin querer se rompa en lugar de pasar por casualidad.
     */
    private static final class RepositorioEnMemoria implements CatastroRepository {

        private final List<Sector> sectores =
                new ArrayList<>(
                        List.of(
                                new Sector(1L, "SC-1", "Sector Centro", "Zona A", true),
                                new Sector(2L, "SC-2", "Sector Sur", "Zona B", true),
                                new Sector(3L, "SC-BAJA", "Sector Cerrado", null, false)));

        private final List<Manzana> manzanas = new ArrayList<>(List.of(new Manzana(1L, 1L, "001")));

        private Paginacion ultima;
        private long siguienteSector = 4L;
        private long siguienteManzana = 2L;

        @Override
        public Pagina<Sector> sectores(Paginacion paginacion) {
            this.ultima = paginacion;
            OrdenSeguro.sobre("codigo", "nombre", "zona", "id").clausula(paginacion);
            return Pagina.de(sectores, paginacion, sectores.size());
        }

        @Override
        public Optional<Sector> sectorPorCodigo(String codigo) {
            return sectores.stream().filter(s -> s.codigo().equals(codigo)).findFirst();
        }

        @Override
        public Optional<Sector> sectorPorId(long id) {
            return sectores.stream().filter(s -> s.id() != null && s.id() == id).findFirst();
        }

        @Override
        public Sector guardar(Sector sector) {
            if (sector.esNuevo()) {
                if (sectorPorCodigo(sector.codigo()).isPresent()) {
                    throw new DuplicateKeyException(
                            "duplicate key value violates unique constraint"
                                    + " \"sector_codigo_uq\"");
                }
                Sector guardado =
                        new Sector(
                                siguienteSector++,
                                sector.codigo(),
                                sector.nombre(),
                                sector.zona(),
                                sector.activo());
                sectores.add(guardado);
                return guardado;
            }
            sectores.removeIf(s -> s.id() != null && s.id().equals(sector.id()));
            sectores.add(sector);
            return sector;
        }

        @Override
        public List<Manzana> manzanasDe(long sectorId) {
            return manzanas.stream().filter(m -> m.sectorId() == sectorId).toList();
        }

        @Override
        public Manzana guardar(Manzana manzana) {
            boolean repetida =
                    manzanas.stream()
                            .anyMatch(
                                    m ->
                                            m.sectorId() == manzana.sectorId()
                                                    && m.codigo().equals(manzana.codigo()));
            if (repetida) {
                throw new DuplicateKeyException(
                        "duplicate key value violates unique constraint \"manzana_codigo_uq\"");
            }
            Manzana guardada =
                    new Manzana(siguienteManzana++, manzana.sectorId(), manzana.codigo());
            manzanas.add(guardada);
            return guardada;
        }

        // ---------- Lo que este controlador no toca ----------

        @Override
        public Optional<Predio> predio(long id) {
            throw new UnsupportedOperationException("SectorController no lee predios");
        }

        @Override
        public Optional<Predio> predioPorCodigo(CodigoReferenciaCatastral codigo) {
            throw new UnsupportedOperationException("SectorController no lee predios");
        }

        @Override
        public Pagina<Predio> predios(Paginacion paginacion) {
            throw new UnsupportedOperationException("SectorController no lee predios");
        }

        @Override
        public Predio guardar(Predio predio) {
            throw new UnsupportedOperationException("SectorController no escribe predios");
        }

        @Override
        public List<Titularidad> titularesDe(long predioId, LocalDate fecha) {
            throw new UnsupportedOperationException("SectorController no lee titularidad");
        }

        @Override
        public List<Titularidad> prediosDe(long contribuyenteId, LocalDate fecha) {
            throw new UnsupportedOperationException("SectorController no lee titularidad");
        }

        @Override
        public Optional<Titularidad> titularidad(long id) {
            throw new UnsupportedOperationException("SectorController no lee titularidad");
        }

        @Override
        public Titularidad guardar(Titularidad titularidad) {
            throw new UnsupportedOperationException("SectorController no escribe titularidad");
        }

        @Override
        public List<Inquilino> inquilinosDe(long predioId, LocalDate fecha) {
            throw new UnsupportedOperationException("SectorController no lee inquilinos");
        }

        @Override
        public Optional<Inquilino> inquilino(long id) {
            throw new UnsupportedOperationException("SectorController no lee inquilinos");
        }

        @Override
        public Inquilino guardar(Inquilino inquilino) {
            throw new UnsupportedOperationException("SectorController no escribe inquilinos");
        }
    }
}
