package pe.gob.sgtm.licencias.aplicacion;

import java.time.LocalDate;
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
import pe.gob.sgtm.licencias.dominio.CriterioDeLicencias;
import pe.gob.sgtm.licencias.dominio.DuplicadoDeLicencia;
import pe.gob.sgtm.licencias.dominio.DuplicadoDeLicenciaRepository;
import pe.gob.sgtm.licencias.dominio.EstadoDeLicencia;
import pe.gob.sgtm.licencias.dominio.LicenciaDeFuncionamiento;
import pe.gob.sgtm.licencias.dominio.LicenciaRepository;
import pe.gob.sgtm.licencias.dominio.MovimientoDeLicencia;
import pe.gob.sgtm.licencias.dominio.MovimientoDeLicenciaRepository;

/**
 * La grilla y la ficha de la opcion {@code licencia_funcionamiento} (#44, RF-110).
 *
 * <h2>Lleva su propia transaccion, y hace falta</h2>
 *
 * <p>{@code @Transactional(readOnly = true)} es lo que abre la transaccion donde {@code
 * TenantTransactionManager} emite el {@code SET LOCAL app.municipalidad_id} que las politicas RLS
 * consultan. Un controlador que llamara al repositorio directamente leeria sin contexto, y eso no
 * devuelve vacio: <b>falla</b>, con un mensaje que no se parece a su causa. Es el defecto que la
 * marcha blanca de seguridad destapo en {@code GET /catastro/vias}.
 *
 * <h2>El estado se deriva, y en una sola consulta</h2>
 *
 * <p>Una pagina de veinte licencias necesita veinte estados. Se leen los movimientos de las veinte
 * de golpe ({@code deLicencias}) y se derivan en memoria: con una lectura por fila serian veintiuna
 * consultas, y eso no se nota en la prueba y si en el padron de una provincia.
 *
 * <h2>«A la fecha», tambien aqui</h2>
 *
 * <p>El estado depende del dia (una licencia temporal vence), asi que la fecha entra como argumento
 * y viaja en la respuesta. Sin ella, un padron impreso ayer y otro impreso hoy podrian discrepar
 * sin que ninguno de los dos dijera de cuando es (regla 9, RNF-075).
 */
@Service
public class ConsultaDeLicencias {

    /**
     * Cuantos contribuyentes se resuelven como mucho al filtrar por nombre.
     *
     * <p>El filtro busca por aproximacion, asi que «GARCIA» puede encontrar cientos. El tope evita
     * armar un {@code IN} de tamano ilimitado; quien busque un titular concreto escribe mas.
     */
    private static final int TITULARES_MAXIMOS = 200;

    private final LicenciaRepository licencias;
    private final MovimientoDeLicenciaRepository movimientos;
    private final DuplicadoDeLicenciaRepository duplicados;
    private final DirectorioDeContribuyentes contribuyentes;

    public ConsultaDeLicencias(
            LicenciaRepository licencias,
            MovimientoDeLicenciaRepository movimientos,
            DuplicadoDeLicenciaRepository duplicados,
            DirectorioDeContribuyentes contribuyentes) {
        this.licencias = licencias;
        this.movimientos = movimientos;
        this.duplicados = duplicados;
        this.contribuyentes = contribuyentes;
    }

    /**
     * La grilla, paginada, con el estado de cada fila derivado a {@code aLaFecha}.
     *
     * @param nombreDelTitular el filtro por nombre del contribuyente; se resuelve contra el padron
     */
    @Transactional(readOnly = true)
    public Pagina<LicenciaEnConsulta> buscar(
            CriterioDeLicencias criterio,
            @Nullable String nombreDelTitular,
            LocalDate aLaFecha,
            Paginacion paginacion) {

        CriterioDeLicencias conTitulares = conTitularesResueltos(criterio, nombreDelTitular);
        if (conTitulares.sinTitularPosible()) {
            // Se filtro por titular y no hay ninguno que se parezca. Devolver la pagina entera
            // aqui —que es lo que pasa si se deja el criterio sin el conjunto— convertiria un
            // nombre inexistente en «todas las licencias», que es el defecto que la consulta de
            // fichas ya cometio una vez.
            return Pagina.vacia(paginacion);
        }

        Pagina<LicenciaDeFuncionamiento> pagina = licencias.buscar(conTitulares, paginacion);
        if (pagina.estaVacia()) {
            return Pagina.vacia(paginacion);
        }

        Set<Long> ids = new HashSet<>();
        Set<Long> titulares = new HashSet<>();
        for (LicenciaDeFuncionamiento licencia : pagina.contenido()) {
            ids.add(licencia.identificador());
            titulares.add(licencia.contribuyenteId());
        }
        Map<Long, List<MovimientoDeLicencia>> historiales = movimientos.deLicencias(ids);
        Map<Long, ResumenDeContribuyente> padron = contribuyentes.porIds(titulares);

        return pagina.mapear(
                licencia ->
                        new LicenciaEnConsulta(
                                licencia,
                                EstadoDeLicencia.derivarDe(
                                        historiales.getOrDefault(
                                                licencia.identificador(), List.of()),
                                        licencia.vigenciaHasta(),
                                        aLaFecha),
                                aLaFecha,
                                padron.get(licencia.contribuyenteId()),
                                List.of(),
                                List.of()));
    }

    /** La ficha completa de una licencia: sus giros, su historial y sus duplicados. */
    @Transactional(readOnly = true)
    public Optional<LicenciaEnConsulta> porNumero(String numero, LocalDate aLaFecha) {
        return licencias
                .porNumero(numero)
                .map(
                        licencia -> {
                            List<MovimientoDeLicencia> historial =
                                    movimientos.deLicencia(licencia.identificador());
                            Map<Long, ResumenDeContribuyente> padron =
                                    contribuyentes.porIds(Set.of(licencia.contribuyenteId()));
                            return new LicenciaEnConsulta(
                                    licencia,
                                    EstadoDeLicencia.derivarDe(
                                            historial, licencia.vigenciaHasta(), aLaFecha),
                                    aLaFecha,
                                    padron.get(licencia.contribuyenteId()),
                                    historial,
                                    duplicados.deLicencia(licencia.identificador()));
                        });
    }

    /**
     * El criterio con el filtro por nombre ya traducido a identificadores.
     *
     * <p>La traduccion se hace <b>aqui</b> y no en el repositorio porque el padron es de otro
     * contexto: {@code licencias} no puede unir {@code licencia_funcionamiento} con {@code
     * contribuyente} en un {@code JOIN} sin cruzar el limite que Spring Modulith vigila.
     */
    private CriterioDeLicencias conTitularesResueltos(
            CriterioDeLicencias criterio, @Nullable String nombreDelTitular) {
        String buscado = nombreDelTitular == null ? "" : nombreDelTitular.strip();
        if (buscado.isEmpty()) {
            return criterio;
        }
        Set<Long> encontrados = new HashSet<>();
        for (ResumenDeContribuyente resumen : contribuyentes.buscar(buscado, TITULARES_MAXIMOS)) {
            encontrados.add(resumen.id());
        }
        return new CriterioDeLicencias(
                criterio.numero(),
                criterio.expediente(),
                criterio.nombreComercial(),
                criterio.direccion(),
                encontrados);
    }

    /**
     * Una licencia tal como la pantalla la pinta.
     *
     * @param licencia la fila, con sus giros resueltos
     * @param estado el derivado de sus movimientos
     * @param aLaFecha el dia al que se derivo (regla 9)
     * @param titular el resumen del padron; nulo si el contribuyente ya no esta
     * @param historial sus movimientos; vacio en la grilla, completo en la ficha
     * @param duplicados los duplicados autorizados; vacio en la grilla
     */
    public record LicenciaEnConsulta(
            LicenciaDeFuncionamiento licencia,
            EstadoDeLicencia estado,
            LocalDate aLaFecha,
            @Nullable ResumenDeContribuyente titular,
            List<MovimientoDeLicencia> historial,
            List<DuplicadoDeLicencia> duplicados) {

        public LicenciaEnConsulta {
            historial = List.copyOf(historial);
            duplicados = List.copyOf(duplicados);
        }

        /** El nombre del titular, o vacio si el padron ya no lo tiene. */
        public String nombreDelTitular() {
            ResumenDeContribuyente resumen = titular;
            return resumen == null ? "" : resumen.nombre();
        }

        /** El codigo del titular, o vacio si el padron ya no lo tiene. */
        public String codigoDelTitular() {
            ResumenDeContribuyente resumen = titular;
            return resumen == null ? "" : resumen.codigo();
        }
    }
}
