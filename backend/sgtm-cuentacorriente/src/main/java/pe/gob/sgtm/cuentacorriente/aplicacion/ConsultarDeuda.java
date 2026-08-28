package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeObligacion;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.ConstanciaDeNoAdeudo;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeudaPorContribuyente;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.ObligacionConDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * {@code consulta_deuda}: trae los asientos de una obligacion —o de todas las de un contribuyente—
 * y les aplica {@link CalculoDeDeuda#deudaActualizadaA} (RF-041, RF-042).
 *
 * <p>Este servicio es el unico sitio de este contexto que conoce el reloj —para la fecha de corte
 * por omision, cuando quien consulta no pide una fecha pasada— y la {@link PoliticaDeRedondeo}
 * vigente. {@link CalculoDeDeuda} sigue sin conocer ninguno de los dos: los recibe como argumento,
 * y por eso su prueba no necesita levantar Spring ni el reloj del sistema (regla 6).
 */
@Service
public class ConsultarDeuda {

    /** Como {@link Fase} declara sus valores en el orden de la cobranza: la mas avanzada gana. */
    private static final Comparator<Fase> FASE_MAS_AVANZADA = Comparator.naturalOrder();

    private static final Set<String> ORDEN_ADMITIDO = Set.of("ejercicio", "tributo");

    private final AsientoRepository repositorio;
    private final SaldoRepository saldos;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;
    private final Clock reloj;

    public ConsultarDeuda(
            AsientoRepository repositorio,
            SaldoRepository saldos,
            CalculoDeDeuda calculo,
            PoliticaDeRedondeo redondeo,
            Clock reloj) {
        this.repositorio = repositorio;
        this.saldos = saldos;
        this.calculo = calculo;
        this.redondeo = redondeo;
        this.reloj = reloj;
    }

    /**
     * La deuda de una obligacion, a la fecha de corte del criterio.
     *
     * <p>La fecha no la elige este metodo: la trae {@link CriterioDeDeuda#fecha()}, que quien llama
     * ya resolvio —a hoy, con {@link #hoy()}, o a una fecha pasada—.
     */
    @Transactional(readOnly = true)
    public DeudaActualizada deudaActualizadaA(CriterioDeDeuda criterio) {
        List<Asiento> asientos = repositorio.paraDeuda(criterio);
        return calculo.deudaActualizadaA(asientos, criterio.fecha(), redondeo);
    }

    /**
     * La deuda de <b>todas</b> las obligaciones del contribuyente, a la fecha de corte del
     * criterio, paginada (RF-041): una fila por tributo/ejercicio/unidad, con los periodos
     * agregados y la fase mas avanzada entre ellos.
     *
     * <p>Un codigo que no existe en esta municipalidad da una pagina vacia, igual que {@code
     * cuenta_corriente} (#21): no es una entrada mal formada, es un padron sin esa fila.
     *
     * <p>{@link SaldoRepository#deContribuyente} solo sirve aqui para <b>descubrir</b> que
     * obligaciones tiene el contribuyente —es un indice, no la cifra—: el importe de cada fila sale
     * siempre de recorrer sus asientos con {@link CalculoDeDeuda#deudaActualizadaA}, porque el
     * saldo proyectado es una cache de <i>hoy</i> (#23) y una fecha de corte pasada puede pedir
     * otra cosa.
     */
    @Transactional(readOnly = true)
    public Pagina<ObligacionConDeuda> porContribuyente(
            CriterioDeDeudaPorContribuyente criterio, Paginacion paginacion) {
        Optional<Long> contribuyenteId =
                repositorio.contribuyentePorCodigo(criterio.codigoContribuyente());
        if (contribuyenteId.isEmpty()) {
            return Pagina.vacia(paginacion);
        }

        Map<ClaveDeObligacion, List<SaldoProyectado>> agrupados = agrupar(contribuyenteId.get());

        List<ClaveDeObligacion> seleccionadas = new ArrayList<>();
        for (Map.Entry<ClaveDeObligacion, List<SaldoProyectado>> grupo : agrupados.entrySet()) {
            Fase faseDelGrupo = faseMasAvanzadaDe(grupo.getValue());
            if (criterio.fase() == null || criterio.fase() == faseDelGrupo) {
                seleccionadas.add(grupo.getKey());
            }
        }
        ordenar(seleccionadas, paginacion);

        long total = seleccionadas.size();
        int desde = Math.min(paginacion.desplazamiento(), seleccionadas.size());
        int hasta = Math.min(desde + paginacion.tamano(), seleccionadas.size());

        List<ObligacionConDeuda> contenido = new ArrayList<>();
        for (ClaveDeObligacion clave : seleccionadas.subList(desde, hasta)) {
            List<SaldoProyectado> delGrupo =
                    Objects.requireNonNull(
                            agrupados.get(clave), "la clave viene de agrupados.entrySet()");
            contenido.add(filaDe(criterio, clave, delGrupo));
        }

        return Pagina.de(contenido, paginacion, total);
    }

    /** La fecha de hoy, del reloj inyectado y no de {@code LocalDate.now()} (regla 6). */
    public LocalDate hoy() {
        return LocalDate.now(reloj);
    }

    /**
     * Si se puede emitir la constancia de no adeudo del contribuyente a la fecha de corte (RF-049,
     * RNF-084, #25): se niega si <b>alguna</b> obligacion tiene saldo pendiente a esa fecha, en
     * cualquier fase.
     *
     * <p>«Incluida la que esta en coactiva o en convenio vigente» (criterio de aceptacion de #25)
     * no exige consultar a {@code coactiva} ni a un contexto de convenios: {@link Fase#COACTIVA} y
     * {@link Fase#CONVENIO} ya son un valor mas de la fase de la propia obligacion, y este metodo
     * agrupa <b>todas</b> las obligaciones sin filtrar por fase —a diferencia de {@link
     * #porContribuyente}, que la deja elegir—. Es exactamente la regla 2 (ARQ-01 §4):
     * cuentacorriente no necesita conocer a nadie para responder esto.
     *
     * <p>A diferencia de {@link #porContribuyente}, un codigo que no existe <b>no</b> da un
     * resultado vacio silencioso: la constancia es un documento sobre una persona concreta, y «no
     * debe nada» seria una afirmacion falsa sobre alguien que no esta en el padron de esta
     * municipalidad.
     *
     * @throws ProblemaDeNegocio {@code NO_ENCONTRADO} si el codigo no identifica a ningun
     *     contribuyente de la municipalidad activa
     */
    @Transactional(readOnly = true)
    public ConstanciaDeNoAdeudo constanciaDeNoAdeudo(String codigoContribuyente, LocalDate fecha) {
        CriterioDeDeudaPorContribuyente criterio =
                new CriterioDeDeudaPorContribuyente(codigoContribuyente, fecha, null);
        Optional<Long> contribuyenteId =
                repositorio.contribuyentePorCodigo(criterio.codigoContribuyente());
        if (contribuyenteId.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.NO_ENCONTRADO,
                    "No hay ningun contribuyente con el codigo " + criterio.codigoContribuyente());
        }

        List<ObligacionConDeuda> obligaciones =
                new ArrayList<>(todasLasObligacionesDe(contribuyenteId.get(), fecha));
        obligaciones.sort(
                Comparator.comparing((ObligacionConDeuda o) -> o.ejercicio().valor())
                        .thenComparing(ObligacionConDeuda::tributo));

        return ConstanciaDeNoAdeudo.de(criterio.codigoContribuyente(), fecha, obligaciones);
    }

    /**
     * Todas las obligaciones con deuda del contribuyente, sin paginar y sin filtrar por fase —a
     * diferencia de {@link #porContribuyente}, que pagina y deja elegir la fase—: la lista
     * completa, en cualquier orden.
     *
     * <p>Es lo que necesitan tanto {@link #constanciaDeNoAdeudo} como el puerto publico de este
     * contexto ({@code pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica}, ARQ-01 §4): «cuanto
     * debe en total» no tiene pagina, la tiene una grilla.
     *
     * <p>A diferencia de {@link #filaDe} —que resuelve cada obligacion con su propia consulta a
     * {@link AsientoRepository#paraDeuda}—, agrupa <b>en memoria</b> los asientos de una sola
     * llamada a {@link AsientoRepository#deContribuyente}: no hay pagina que acote cuantos grupos
     * se resuelven, asi que una consulta por obligacion aqui podria ser cualquier numero de ellas.
     * {@link CalculoDeDeuda#deudaActualizadaA} filtra el corte por su cuenta (ve {@code
     * fechaValor}), asi que agrupar sin filtrar por fecha primero es seguro.
     */
    @Transactional(readOnly = true)
    public List<ObligacionConDeuda> todasLasObligacionesDe(long contribuyenteId, LocalDate fecha) {
        Map<ClaveDeObligacion, List<Asiento>> agrupados = new LinkedHashMap<>();
        for (Asiento asiento : repositorio.deContribuyente(contribuyenteId)) {
            agrupados
                    .computeIfAbsent(ClaveDeObligacion.de(asiento), k -> new ArrayList<>())
                    .add(asiento);
        }

        List<ObligacionConDeuda> obligaciones = new ArrayList<>();
        for (Map.Entry<ClaveDeObligacion, List<Asiento>> grupo : agrupados.entrySet()) {
            List<Asiento> delGrupo = grupo.getValue();
            ClaveDeObligacion clave = grupo.getKey();
            int periodoDesde =
                    delGrupo.stream().mapToInt(ConsultarDeuda::periodoDe).min().orElseThrow();
            int periodoHasta =
                    delGrupo.stream().mapToInt(ConsultarDeuda::periodoDe).max().orElseThrow();
            Fase fase = delGrupo.stream().map(Asiento::fase).max(FASE_MAS_AVANZADA).orElseThrow();
            DeudaActualizada deuda = calculo.deudaActualizadaA(delGrupo, fecha, redondeo);
            obligaciones.add(
                    new ObligacionConDeuda(
                            clave.tributo(),
                            clave.ejercicio(),
                            clave.predioId(),
                            clave.vehiculoId(),
                            periodoDesde,
                            periodoHasta,
                            fase,
                            deuda));
        }
        return obligaciones;
    }

    /** {@code periodo} nulo es anual, igual que en {@link ClaveDeSaldo#de(Asiento)}. */
    private static int periodoDe(Asiento asiento) {
        return asiento.periodo() == null ? 0 : asiento.periodo();
    }

    /** Los saldos del contribuyente, agrupados por obligacion (tributo/ejercicio/unidad). */
    private Map<ClaveDeObligacion, List<SaldoProyectado>> agrupar(long contribuyenteId) {
        Map<ClaveDeObligacion, List<SaldoProyectado>> agrupados = new LinkedHashMap<>();
        for (SaldoProyectado saldo : saldos.deContribuyente(contribuyenteId)) {
            agrupados
                    .computeIfAbsent(ClaveDeObligacion.de(saldo.clave()), k -> new ArrayList<>())
                    .add(saldo);
        }
        return agrupados;
    }

    private ObligacionConDeuda filaDe(
            CriterioDeDeudaPorContribuyente criterio,
            ClaveDeObligacion clave,
            List<SaldoProyectado> delGrupo) {
        int periodoDesde = delGrupo.stream().mapToInt(s -> s.clave().periodo()).min().orElseThrow();
        int periodoHasta = delGrupo.stream().mapToInt(s -> s.clave().periodo()).max().orElseThrow();

        // periodo=null trae los asientos de TODOS los periodos de la obligacion (ver
        // AsientoRepositoryJdbc#paraDeuda): es lo que permite agregar arbitrios de enero a
        // diciembre en una sola fila. fase=null a proposito: filtrar aqui dejaria fuera los
        // asientos de los periodos que todavia no llegaron a esa fase, y la fila subestimaria
        // la deuda de la obligacion.
        CriterioDeDeuda criterioDeLaObligacion =
                new CriterioDeDeuda(
                        criterio.codigoContribuyente(),
                        clave.tributo(),
                        clave.ejercicio(),
                        null,
                        clave.predioId(),
                        clave.vehiculoId(),
                        null,
                        null,
                        criterio.fecha());
        List<Asiento> asientos = repositorio.paraDeuda(criterioDeLaObligacion);
        DeudaActualizada deuda = calculo.deudaActualizadaA(asientos, criterio.fecha(), redondeo);

        return new ObligacionConDeuda(
                clave.tributo(),
                clave.ejercicio(),
                clave.predioId(),
                clave.vehiculoId(),
                periodoDesde,
                periodoHasta,
                faseMasAvanzadaDe(delGrupo),
                deuda);
    }

    private static Fase faseMasAvanzadaDe(List<SaldoProyectado> saldos) {
        return saldos.stream().map(SaldoProyectado::fase).max(FASE_MAS_AVANZADA).orElseThrow();
    }

    private static void ordenar(List<ClaveDeObligacion> grupos, Paginacion paginacion) {
        if (!ORDEN_ADMITIDO.contains(paginacion.ordenarPor())) {
            throw new IllegalArgumentException(
                    "consulta_deuda no admite ordenar por '"
                            + paginacion.ordenarPor()
                            + "'. Se admite: "
                            + ORDEN_ADMITIDO);
        }
        Comparator<ClaveDeObligacion> primario =
                "tributo".equals(paginacion.ordenarPor())
                        ? Comparator.comparing(ClaveDeObligacion::tributo)
                        : Comparator.comparing((ClaveDeObligacion g) -> g.ejercicio().valor());
        if (paginacion.direccion() == Paginacion.Direccion.DESCENDENTE) {
            primario = primario.reversed();
        }
        grupos.sort(
                primario.thenComparing((ClaveDeObligacion g) -> g.ejercicio().valor())
                        .thenComparing(ClaveDeObligacion::tributo)
                        .thenComparing(g -> g.predioId() == null ? 0L : g.predioId())
                        .thenComparing(g -> g.vehiculoId() == null ? 0L : g.vehiculoId()));
    }
}
