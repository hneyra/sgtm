package pe.gob.sgtm.licencias.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.licencias.dominio.CriterioDeFue;
import pe.gob.sgtm.licencias.dominio.EstadoDelFue;
import pe.gob.sgtm.licencias.dominio.EstructuraDelProyecto;
import pe.gob.sgtm.licencias.dominio.FueDeEdificacion;
import pe.gob.sgtm.licencias.dominio.FueRepository;
import pe.gob.sgtm.licencias.dominio.MovimientoDeEdificacion;
import pe.gob.sgtm.licencias.dominio.MovimientoDeEdificacionRepository;
import pe.gob.sgtm.licencias.dominio.ProfesionalDelFue;
import pe.gob.sgtm.licencias.dominio.ProyectoDelFue;
import pe.gob.sgtm.licencias.dominio.RequisitoDelFue;
import pe.gob.sgtm.licencias.dominio.SeccionDelFue;
import pe.gob.sgtm.licencias.dominio.TerrenoDelFue;
import pe.gob.sgtm.licencias.dominio.TipoDeMovimientoDeEdificacion;
import pe.gob.sgtm.licencias.dominio.VigenciaDeLaLicencia;

/**
 * La grilla, la ficha y el reporte general del FUE (#48, RF-113, RF-115).
 *
 * <h2>Lleva su propia transaccion, y hace falta</h2>
 *
 * <p>{@code @Transactional(readOnly = true)} es lo que abre la transaccion donde {@code
 * TenantTransactionManager} emite el {@code SET LOCAL app.municipalidad_id} que las politicas RLS
 * consultan. Un controlador que llamara al repositorio directamente leeria sin contexto, y eso no
 * devuelve vacio: <b>falla</b>, con un mensaje que no se parece a su causa. Es el defecto que la
 * marcha blanca de seguridad destapo en {@code GET /catastro/vias}.
 *
 * <h2>El estado se deriva, y en dos consultas</h2>
 *
 * <p>Una pagina de veinte expedientes necesita veinte estados, y cada estado necesita movimientos y
 * vigencias. Se leen los de los veinte de golpe y se derivan en memoria: con una lectura por fila
 * serian cuarenta y una consultas.
 *
 * <h2>«A la fecha», tambien aqui</h2>
 *
 * <p>El estado depende del dia —una licencia vence—, asi que la fecha entra como argumento y viaja
 * en la respuesta. Y la valorizacion viaja con el ejercicio del conjunto sellado con que se
 * calculo: sin eso, dos consultas hechas a un anio de distancia podrian dar cifras distintas sin
 * que ninguna dijera de cuando es (regla 9, RNF-075).
 */
@Service
public class ConsultaDeFue {

    /** Cuantos contribuyentes se resuelven como mucho al filtrar por nombre. */
    private static final int TITULARES_MAXIMOS = 200;

    private final FueRepository expedientes;
    private final MovimientoDeEdificacionRepository movimientos;
    private final DirectorioDeContribuyentes contribuyentes;
    private final ValorizacionDelFue valorizaciones;

    public ConsultaDeFue(
            FueRepository expedientes,
            MovimientoDeEdificacionRepository movimientos,
            DirectorioDeContribuyentes contribuyentes,
            ValorizacionDelFue valorizaciones) {
        this.expedientes = expedientes;
        this.movimientos = movimientos;
        this.contribuyentes = contribuyentes;
        this.valorizaciones = valorizaciones;
    }

    /**
     * La grilla, paginada, con el estado de cada fila derivado a {@code aLaFecha}.
     *
     * <p><b>Sin valorizar.</b> Valorizar veinte expedientes por pagina seria pedir el cuadro de
     * valores unitarios veinte veces para una columna que la grilla ni siquiera pinta. La
     * valorizacion vive en la ficha y en el reporte, que son los dos sitios donde se lee.
     *
     * @param nombreDelSolicitante el filtro por nombre; se resuelve contra el padron
     * @param estado el filtro por estado; se aplica <b>despues</b> de derivarlo, porque no es una
     *     columna
     */
    @Transactional(readOnly = true)
    public Pagina<FueEnConsulta> buscar(
            CriterioDeFue criterio,
            @Nullable String nombreDelSolicitante,
            @Nullable EstadoDelFue estado,
            LocalDate aLaFecha,
            Paginacion paginacion) {

        CriterioDeFue conTitulares = conTitularesResueltos(criterio, nombreDelSolicitante);
        if (conTitulares.sinTitularPosible()) {
            // Se filtro por solicitante y no hay ninguno que se parezca. Devolver la pagina entera
            // aqui convertiria un nombre inexistente en «todos los expedientes», que es el defecto
            // que la consulta de fichas ya cometio una vez.
            return Pagina.vacia(paginacion);
        }

        Pagina<FueDeEdificacion> pagina = expedientes.buscar(conTitulares, paginacion);
        if (pagina.estaVacia()) {
            return Pagina.vacia(paginacion);
        }

        Set<Long> ids = new HashSet<>();
        Set<Long> titulares = new HashSet<>();
        for (FueDeEdificacion fue : pagina.contenido()) {
            ids.add(fue.identificador());
            titulares.add(fue.contribuyenteId());
        }
        Map<Long, List<MovimientoDeEdificacion>> historiales = movimientos.deExpedientes(ids);
        Map<Long, List<VigenciaDeLaLicencia>> vigencias = movimientos.vigenciasDeVarias(ids);
        Map<Long, TerrenoDelFue> terrenos = expedientes.terrenosDe(ids);
        Map<Long, ResumenDeContribuyente> padron = contribuyentes.porIds(titulares);

        Pagina<FueEnConsulta> resuelta =
                pagina.mapear(
                        fue ->
                                filaDe(
                                        fue,
                                        historiales.getOrDefault(fue.identificador(), List.of()),
                                        vigencias.getOrDefault(fue.identificador(), List.of()),
                                        terrenos.get(fue.identificador()),
                                        padron.get(fue.contribuyenteId()),
                                        aLaFecha));

        if (estado == null) {
            return resuelta;
        }
        // El estado no es una columna y no se puede filtrar en el WHERE: se deriva y se filtra
        // aqui. El total de la pagina se recalcula sobre lo que queda, para que el reporte no
        // prometa mas filas de las que ensena.
        List<FueEnConsulta> filtradas =
                resuelta.contenido().stream().filter(fila -> fila.estado() == estado).toList();
        return Pagina.de(filtradas, paginacion, filtradas.size());
    }

    /**
     * El reporte general de licencias de edificacion (RF-115, opcion {@code edificacion_reporte}).
     *
     * <p>Lo que la grilla no trae y este si: el area a construir y el valor de obra de cada fila.
     * El cuadro de valores unitarios se lee <b>una sola vez</b> para toda la pagina —{@link
     * ValorizacionDelFue#valorizarVarias}—, y con la misma fecha de corte: si cada fila lo
     * resolviera por su cuenta y entre dos lecturas se sellara una version nueva, media hoja
     * saldria con un cuadro y media con otro.
     *
     * @param aLaFecha la fecha de corte del reporte; deriva el estado y resuelve el cuadro
     */
    @Transactional(readOnly = true)
    public Pagina<FilaDelReporte> reporte(
            CriterioDeFue criterio,
            @Nullable String nombreDelSolicitante,
            @Nullable EstadoDelFue estado,
            LocalDate aLaFecha,
            Paginacion paginacion) {

        Pagina<FueEnConsulta> filas =
                buscar(criterio, nombreDelSolicitante, estado, aLaFecha, paginacion);
        if (filas.estaVacia()) {
            return Pagina.vacia(paginacion);
        }

        Set<Long> ids = new HashSet<>();
        for (FueEnConsulta fila : filas.contenido()) {
            ids.add(fila.fue().identificador());
        }
        Map<Long, ProyectoDelFue> proyectos = expedientes.proyectosDe(ids);
        Map<Long, ValorizacionDelFue.Resultado> valorizadas =
                valorizaciones.valorizarVarias(expedientes.valorizacionesDe(ids), aLaFecha);

        return filas.mapear(
                fila ->
                        new FilaDelReporte(
                                fila,
                                proyectos.get(fila.fue().identificador()),
                                valorizadas.get(fila.fue().identificador())));
    }

    /** La ficha completa de un expediente: sus secciones, su historial y su valorizacion. */
    @Transactional(readOnly = true)
    public Optional<FichaDelFue> porExpediente(String expediente, LocalDate aLaFecha) {
        return expedientes.porExpediente(expediente).map(fue -> ficha(fue, aLaFecha));
    }

    /** La ficha completa por el numero de la licencia otorgada. */
    @Transactional(readOnly = true)
    public Optional<FichaDelFue> porNumeroDeLicencia(String numero, LocalDate aLaFecha) {
        return expedientes.porNumeroDeLicencia(numero).map(fue -> ficha(fue, aLaFecha));
    }

    // ------------------------------------------------------------------

    private FichaDelFue ficha(FueDeEdificacion fue, LocalDate aLaFecha) {
        long id = fue.identificador();
        List<MovimientoDeEdificacion> historial = movimientos.deExpediente(id);
        List<VigenciaDeLaLicencia> vigencias = movimientos.vigenciasDe(id);
        Map<Long, ResumenDeContribuyente> padron =
                contribuyentes.porIds(Set.of(fue.contribuyenteId()));
        List<EstructuraDelProyecto> estructuras = expedientes.valorizacionVigente(id);

        // La valorizacion se resuelve con la fecha del ACTO: la de la emision si ya la hubo, y la
        // de la declaracion mientras no. Resolverla con «hoy» haria que la misma licencia
        // consultada el anio que viene diera otra cifra sin que nada avisara (ARQ-09 §3, regla 9).
        LocalDate fechaDelActo =
                historial.stream()
                        .filter(m -> m.tipo() == TipoDeMovimientoDeEdificacion.EMISION)
                        .map(MovimientoDeEdificacion::fecha)
                        .findFirst()
                        .orElse(fue.fechaDeclaracion());

        List<SeccionDelFue> faltantes = new ArrayList<>();
        Optional<TerrenoDelFue> terreno = expedientes.terrenoVigente(id);
        Optional<ProyectoDelFue> proyecto = expedientes.proyectoVigente(id);
        List<ProfesionalDelFue> profesionales = expedientes.profesionalesVigentes(id);
        List<RequisitoDelFue> requisitos = expedientes.requisitosVigentes(id);
        if (terreno.isEmpty()) {
            faltantes.add(SeccionDelFue.TERRENO);
        }
        if (proyecto.isEmpty()) {
            faltantes.add(SeccionDelFue.PROYECTO);
        }
        if (estructuras.isEmpty()) {
            faltantes.add(SeccionDelFue.VALORIZACION);
        }
        if (profesionales.isEmpty()) {
            faltantes.add(SeccionDelFue.PROFESIONALES);
        }
        if (requisitos.isEmpty()) {
            faltantes.add(SeccionDelFue.DOCUMENTOS);
        }

        return new FichaDelFue(
                filaDe(
                        fue,
                        historial,
                        vigencias,
                        terreno.orElse(null),
                        padron.get(fue.contribuyenteId()),
                        aLaFecha),
                terreno.orElse(null),
                proyecto.orElse(null),
                estructuras,
                profesionales,
                requisitos,
                historial,
                vigencias,
                List.copyOf(faltantes),
                valorizaciones.valorizar(estructuras, fechaDelActo));
    }

    private static FueEnConsulta filaDe(
            FueDeEdificacion fue,
            List<MovimientoDeEdificacion> historial,
            List<VigenciaDeLaLicencia> vigencias,
            @Nullable TerrenoDelFue terreno,
            @Nullable ResumenDeContribuyente solicitante,
            LocalDate aLaFecha) {

        String numero =
                historial.stream()
                        .filter(m -> m.tipo() == TipoDeMovimientoDeEdificacion.EMISION)
                        .map(MovimientoDeEdificacion::numeroLicencia)
                        .filter(java.util.Objects::nonNull)
                        .findFirst()
                        .orElse(null);

        return new FueEnConsulta(
                fue,
                EstadoDelFue.derivarDe(historial, vigencias, aLaFecha),
                aLaFecha,
                numero,
                terreno,
                solicitante);
    }

    private CriterioDeFue conTitularesResueltos(
            CriterioDeFue criterio, @Nullable String nombreDelSolicitante) {
        String buscado = nombreDelSolicitante == null ? "" : nombreDelSolicitante.strip();
        if (buscado.isEmpty()) {
            return criterio;
        }
        Set<Long> encontrados = new HashSet<>();
        for (ResumenDeContribuyente resumen : contribuyentes.buscar(buscado, TITULARES_MAXIMOS)) {
            encontrados.add(resumen.id());
        }
        return criterio.conTitulares(encontrados);
    }

    // ------------------------------------------------------------------

    /**
     * Un expediente tal como la grilla lo pinta.
     *
     * @param fue la cabecera
     * @param estado el derivado de sus movimientos y vigencias
     * @param aLaFecha el dia al que se derivo (regla 9)
     * @param numeroDeLicencia el numero otorgado; nulo mientras el expediente este en tramite
     * @param terreno el terreno vigente; nulo si la seccion no se completo
     * @param solicitante el resumen del padron; nulo si el contribuyente ya no esta
     */
    public record FueEnConsulta(
            FueDeEdificacion fue,
            EstadoDelFue estado,
            LocalDate aLaFecha,
            @Nullable String numeroDeLicencia,
            @Nullable TerrenoDelFue terreno,
            @Nullable ResumenDeContribuyente solicitante) {

        public String nombreDelSolicitante() {
            ResumenDeContribuyente resumen = solicitante;
            return resumen == null ? "" : resumen.nombre();
        }

        public String codigoDelSolicitante() {
            ResumenDeContribuyente resumen = solicitante;
            return resumen == null ? "" : resumen.codigo();
        }
    }

    /**
     * Una fila del reporte general.
     *
     * @param fila lo mismo que pinta la grilla, con su estado y su fecha
     * @param proyecto la version vigente de las caracteristicas; nula si la seccion falta
     * @param valorizacion la obra valorizada, o el motivo por el que no hay cifra; nula si la fila
     *     no llego a valorizarse
     */
    public record FilaDelReporte(
            FueEnConsulta fila,
            @Nullable ProyectoDelFue proyecto,
            ValorizacionDelFue.@Nullable Resultado valorizacion) {}

    /**
     * La ficha del FUE: la fila, sus cinco secciones, su historial y su valorizacion.
     *
     * @param fila lo mismo que pinta la grilla
     * @param terreno la version vigente de los datos urbanos; nulo si falta
     * @param proyecto la version vigente de las caracteristicas; nulo si falta
     * @param estructuras la valorizacion declarada, sin importes
     * @param profesionales los firmantes
     * @param requisitos los documentos adjuntos declarados
     * @param historial los movimientos
     * @param vigencias los tramos de vigencia, en orden (AC 4)
     * @param seccionesFaltantes las que impiden emitir hoy (AC 1)
     * @param valorizacion la obra valorizada, o el motivo por el que no hay cifra (AC 2)
     */
    public record FichaDelFue(
            FueEnConsulta fila,
            @Nullable TerrenoDelFue terreno,
            @Nullable ProyectoDelFue proyecto,
            List<EstructuraDelProyecto> estructuras,
            List<ProfesionalDelFue> profesionales,
            List<RequisitoDelFue> requisitos,
            List<MovimientoDeEdificacion> historial,
            List<VigenciaDeLaLicencia> vigencias,
            List<SeccionDelFue> seccionesFaltantes,
            ValorizacionDelFue.Resultado valorizacion) {

        public FichaDelFue {
            estructuras = List.copyOf(estructuras);
            profesionales = List.copyOf(profesionales);
            requisitos = List.copyOf(requisitos);
            historial = List.copyOf(historial);
            vigencias = List.copyOf(vigencias);
            seccionesFaltantes = List.copyOf(seccionesFaltantes);
        }

        /** Si hoy se podria emitir: no falta ninguna seccion. */
        public boolean estaCompleto() {
            return seccionesFaltantes.isEmpty();
        }
    }
}
