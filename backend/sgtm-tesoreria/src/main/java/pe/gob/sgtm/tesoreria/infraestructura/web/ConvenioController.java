package pe.gob.sgtm.tesoreria.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.SeleccionDeObligacion;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.tesoreria.aplicacion.CerrarConvenio;
import pe.gob.sgtm.tesoreria.aplicacion.CondicionesParametrizadas;
import pe.gob.sgtm.tesoreria.aplicacion.ConsultaDeConvenios;
import pe.gob.sgtm.tesoreria.aplicacion.FormalizarConvenio;
import pe.gob.sgtm.tesoreria.aplicacion.RegistrarPreconvenio;
import pe.gob.sgtm.tesoreria.aplicacion.RegistrarPreconvenio.Peticion;
import pe.gob.sgtm.tesoreria.dominio.CondicionesDelConvenio;
import pe.gob.sgtm.tesoreria.dominio.Convenio;
import pe.gob.sgtm.tesoreria.dominio.ConvenioEnConsulta;
import pe.gob.sgtm.tesoreria.dominio.ConvenioRepository;
import pe.gob.sgtm.tesoreria.dominio.CriterioDeConvenios;
import pe.gob.sgtm.tesoreria.dominio.Cronograma;
import pe.gob.sgtm.tesoreria.dominio.EstadoDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeConvenioRepository;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.TipoDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.TipoDeGarantia;
import pe.gob.sgtm.tesoreria.dominio.TipoDeMovimientoDeConvenio;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * Los convenios de fraccionamiento por HTTP: registro, consulta y cierre (RF-084, RF-085, RF-086).
 *
 * <p>Ningun {@code PUT} ni {@code PATCH}, igual que en {@link CajaController} y por lo mismo: un
 * convenio no se corrige (regla 4, V31). Lo que le pasa llega como un recurso nuevo —una anulacion,
 * un quiebre, una reformulacion—, porque eso es lo que son: actos que se agregan.
 *
 * <h2>Lo que este controlador NO publica</h2>
 *
 * <p><b>Ninguna ruta para formalizar.</b> Un convenio se pone en vigor cobrando su cuota inicial, y
 * eso pasa por la caja: {@code POST /tesoreria/caja/cobranza} con {@code tipoDePago = PRECONVENIO}.
 * Publicar aqui un «formalizar» permitiria poner un convenio en vigor sin recibo, que es
 * exactamente lo que el criterio de aceptacion de #35 prohibe.
 *
 * <h2>El numero, en la ruta</h2>
 *
 * <p>{@code {numero}} es el numero <b>impreso</b>, {@code F-2026-000123}: lo que dice el papel que
 * el contribuyente trae a la ventanilla. Ni el identificador interno ni el ejercicio y el
 * correlativo por separado.
 */
@RestController
@RequestMapping(Api.RAIZ + "/tesoreria")
public class ConvenioController {

    /** Las tres opciones del catalogo (NEG-03) que este controlador sirve. */
    static final String ACCESO_FRACCIONAMIENTO = "fraccionamiento";

    static final String ACCESO_CONSULTA = "consulta_convenios";

    static final String ACCESO_ANULACION = "anulacion_convenio";

    private static final String ORDEN_POR_OMISION = "fecha";

    /** Los tres actos que la pantalla ofrece; ninguno mas entra por aqui. */
    private static final Set<TipoDeMovimientoDeConvenio> CIERRES =
            Set.of(
                    TipoDeMovimientoDeConvenio.ANULACION,
                    TipoDeMovimientoDeConvenio.QUIEBRE,
                    TipoDeMovimientoDeConvenio.REFORMULACION);

    /**
     * Los rotulos del desplegable «Estado» de la pantalla, traducidos al estado del dominio.
     *
     * <p>El prototipo ofrece «CUMPLIDO» y «EN RIESGO», que <b>no</b> son estados del convenio sino
     * situaciones derivadas de sus cuotas —y su definicion depende de cuantas impagas seguidas
     * producen la perdida del beneficio, que es una cifra de ordenanza local (D-02b, #191)—. Se
     * rechazan explicitamente en vez de traducirse a algo parecido: filtrar por «EN RIESGO» con una
     * definicion inventada devolveria una lista que nadie puede auditar.
     */
    private static final Map<String, EstadoDeConvenio> ESTADOS =
            Map.of(
                    "PRECONVENIO", EstadoDeConvenio.PRECONVENIO,
                    "VIGENTE", EstadoDeConvenio.VIGENTE,
                    "ANULADO", EstadoDeConvenio.ANULADO,
                    "QUEBRADO", EstadoDeConvenio.QUEBRADO,
                    "REFORMULADO", EstadoDeConvenio.REFORMULADO);

    private final RegistrarPreconvenio registrar;
    private final CerrarConvenio cerrar;
    private final ConsultaDeConvenios consulta;
    private final ConvenioRepository convenios;
    private final DirectorioDeContribuyentes contribuyentes;
    private final Clock reloj;

    public ConvenioController(
            RegistrarPreconvenio registrar,
            CerrarConvenio cerrar,
            ConsultaDeConvenios consulta,
            ConvenioRepository convenios,
            DirectorioDeContribuyentes contribuyentes,
            Clock reloj) {
        this.registrar = registrar;
        this.cerrar = cerrar;
        this.consulta = consulta;
        this.convenios = convenios;
        this.contribuyentes = contribuyentes;
        this.reloj = reloj;
    }

    /**
     * Registra el preconvenio, o solo simula su cronograma (RF-084).
     *
     * <p>Con {@code simular = true} no escribe nada: ni numera un convenio, ni toca el libro, ni
     * deja auditoria. Es el boton «Imprimir simulacion» de la pantalla, y va por la misma ruta
     * porque el prototipo declara una sola.
     *
     * <p>Lo que sale de aqui es <b>siempre</b> un preconvenio: no acoge deuda, y hasta que su cuota
     * inicial se cobre en caja el libro no se entera de que existe.
     */
    @PostMapping("/fraccionamientos")
    @RequiereAcceso(acceso = ACCESO_FRACCIONAMIENTO, privilegio = Privilegio.REGISTRO)
    public ResponseEntity<Object> fraccionar(@RequestBody PeticionDeFraccionamiento peticion) {
        ResumenDeContribuyente contribuyente = contribuyenteDe(peticion.codContribuyente());
        RegistrarPreconvenio.Peticion pedido = peticionDe(peticion, contribuyente.id());

        if (Boolean.TRUE.equals(peticion.simular())) {
            try {
                return ResponseEntity.ok(
                        ConvenioResource.SimulacionResource.de(registrar.simular(pedido)));
            } catch (RegistrarPreconvenio.SinDeudaQueFraccionar
                    | CondicionesDelConvenio.DemasiadasCuotas
                    | CondicionesParametrizadas.CondicionSinParametrizar
                    | Cronograma.NadaQueFraccionar
                    | IllegalArgumentException invalido) {
                throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
            }
        }

        Observacion observacion = observacionDe(peticion.observacion());
        try {
            Convenio guardado = registrar.registrar(pedido, observacion);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(
                            ConvenioResource.de(
                                    guardado,
                                    contribuyente.codigo(),
                                    EstadoDeConvenio.PRECONVENIO.name()));
        } catch (ConvenioRepository.CronogramaDuplicado yaTeniaCronograma) {
            // 409: la peticion esta bien formada; lo que no admite la operacion es el
            // estado actual del convenio.
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(yaTeniaCronograma));
        } catch (RegistrarPreconvenio.SinDeudaQueFraccionar
                | CondicionesDelConvenio.DemasiadasCuotas
                | CondicionesParametrizadas.CondicionSinParametrizar
                | Cronograma.NadaQueFraccionar
                | IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    /**
     * El seguimiento de los convenios suscritos, paginado (RF-084).
     *
     * <h2>El detalle se carga solo cuando la consulta apunta a uno</h2>
     *
     * <p>Con {@code nroDeConvenio}, la fila trae ademas su cronograma, la deuda original que acogio
     * y sus movimientos: es la ficha que la pantalla dibuja al abrir un convenio. Sin el, la fila
     * es la que la grilla pinta y nada mas —una pagina de veinte no puede costar veinte lecturas de
     * detalle—.
     *
     * <p>Una ruta y no dos porque el prototipo declara una: {@code GET /tesoreria/convenios}. Un
     * {@code GET /tesoreria/convenios/{numero}} seria una ruta que ninguna pantalla llama, y el
     * contrato la rechazaria (ARQ-05).
     */
    @GetMapping("/convenios")
    @RequiereAcceso(acceso = ACCESO_CONSULTA, privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<ConvenioResource.FilaResource> listar(
            @RequestParam(required = false) @Nullable String nroDeConvenio,
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String estado,
            @RequestParam(required = false) @Nullable String desde,
            @RequestParam(required = false) @Nullable String hasta,
            ParametrosDePaginacion paginacion) {

        CriterioDeConvenios criterio;
        try {
            criterio =
                    new CriterioDeConvenios(
                            vacioAnulo(nroDeConvenio),
                            vacioAnulo(codContribuyente),
                            estadoDe(estado),
                            fechaOpcional(desde, "desde"),
                            fechaOpcional(hasta, "hasta"),
                            LocalDate.now(reloj));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }

        Pagina<ConvenioEnConsulta> pagina =
                consulta.listar(criterio, paginacion.aPaginacion(ORDEN_POR_OMISION));

        if (criterio.numero() == null || pagina.contenido().size() != 1) {
            return RespuestaPaginada.de(pagina, ConvenioResource.FilaResource::de);
        }
        ConvenioEnConsulta unica = pagina.contenido().get(0);
        return RespuestaPaginada.de(
                pagina,
                fila ->
                        consulta.ficha(unica.numero())
                                .map(ficha -> ConvenioResource.FilaResource.de(fila, ficha))
                                .orElseGet(() -> ConvenioResource.FilaResource.de(fila)));
    }

    /**
     * Anula, quiebra o reformula el convenio, devolviendo su deuda a la fase de origen (RF-085,
     * RF-086).
     *
     * <p>Las tres acciones por la misma ruta porque el prototipo declara una sola —«Anulacion de
     * convenio», con los botones «Anular», «Reformar» y «Quebrar»— y porque en el libro son el
     * mismo acto: lo pendiente vuelve a la fase de la que salio.
     */
    @PostMapping("/convenios/{numero}/anulacion")
    @RequiereAcceso(acceso = ACCESO_ANULACION, privilegio = Privilegio.ELIMINACION)
    public ResponseEntity<ConvenioResource> cerrar(
            @PathVariable String numero, @RequestBody PeticionDeCierreDeConvenio peticion) {

        NumeroDeConvenio delConvenio = numeroDe(numero);
        Observacion observacion = observacionDe(peticion.observacion());
        TipoDeMovimientoDeConvenio accion = accionDe(peticion.accion());

        @Nullable Peticion reformulacion = null;
        if (accion == TipoDeMovimientoDeConvenio.REFORMULACION) {
            PeticionDeFraccionamiento cuerpo = peticion.reformulacion();
            if (cuerpo == null) {
                throw new ProblemaDeNegocio(
                        CodigoDeError.VALIDACION,
                        "Una reformulacion trae el convenio nuevo que la sustituye: sin el, el"
                                + " saldo pendiente se quedaria sin convenio");
            }
            reformulacion = peticionDe(cuerpo, contribuyenteDe(cuerpo.codContribuyente()).id());
        }

        CerrarConvenio.Cierre cierre;
        try {
            cierre =
                    new CerrarConvenio.Cierre(
                            delConvenio,
                            accion,
                            fechaDe(peticion.fechaAnul(), "fechaAnul"),
                            exigir(peticion.motivo(), "motivo"),
                            vacioAnulo(peticion.responsableAnul()),
                            vacioAnulo(peticion.nDeMemorando()),
                            reformulacion);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }

        try {
            CerrarConvenio.Cerrado cerrado = cerrar.cerrar(cierre, observacion);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(
                            ConvenioResource.de(
                                    cerrado.convenio(),
                                    codigoDe(cerrado.convenio().contribuyenteId()),
                                    estadoTras(accion).name()));
        } catch (FormalizarConvenio.ConvenioInexistente noExiste) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noExiste));
        } catch (MovimientoDeConvenioRepository.ConvenioYaCerrado
                | MovimientoDeConvenioRepository.ConvenioYaFormalizado
                | CerrarConvenio.ReciboDeLaInicialVigente
                | ConvenioRepository.CronogramaDuplicado enConflicto) {
            // 409: la peticion esta bien formada; lo que no admite la operacion es el
            // estado actual del convenio.
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(enConflicto));
        } catch (RegistrarPreconvenio.SinDeudaQueFraccionar
                | CerrarConvenio.ConvenioSinFormalizar
                | CondicionesDelConvenio.DemasiadasCuotas
                | CondicionesParametrizadas.CondicionSinParametrizar
                | Cronograma.NadaQueFraccionar
                | IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

    private static EstadoDeConvenio estadoTras(TipoDeMovimientoDeConvenio accion) {
        return switch (accion) {
            case ANULACION -> EstadoDeConvenio.ANULADO;
            case QUIEBRE -> EstadoDeConvenio.QUEBRADO;
            case REFORMULACION -> EstadoDeConvenio.REFORMULADO;
            case FORMALIZACION -> EstadoDeConvenio.VIGENTE;
        };
    }

    private RegistrarPreconvenio.Peticion peticionDe(
            PeticionDeFraccionamiento peticion, long contribuyenteId) {
        LocalDate fecha = fechaDe(peticion.fecha(), "fecha");
        LocalDate corte =
                peticion.fechaDeCorte() == null || peticion.fechaDeCorte().isBlank()
                        ? fecha
                        : fechaDe(peticion.fechaDeCorte(), "fechaDeCorte");
        Integer cuotas = peticion.nroDeCuotas();
        if (cuotas == null) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo 'nroDeCuotas'");
        }
        try {
            return new RegistrarPreconvenio.Peticion(
                    contribuyenteId,
                    obligacionesDe(peticion.obligaciones()),
                    tipoDe(peticion.tipo()),
                    fecha,
                    corte,
                    cuotas,
                    porcentajeDe(peticion.cuotaInicial()),
                    peticion.primeraCuotaVence() == null || peticion.primeraCuotaVence().isBlank()
                            ? fecha
                            : fechaDe(peticion.primeraCuotaVence(), "primeraCuotaVence"),
                    garantiaDe(peticion.tipoDeGarantia()),
                    vacioAnulo(peticion.detalleDelOfrecimiento()),
                    vacioAnulo(peticion.resolucion()),
                    null);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private ResumenDeContribuyente contribuyenteDe(@Nullable String codigo) {
        String valor = exigir(codigo, "codContribuyente");
        return contribuyentes
                .porCodigo(valor)
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun contribuyente con el codigo '"
                                                + valor
                                                + "'"));
    }

    private String codigoDe(long contribuyenteId) {
        return Optional.ofNullable(
                        contribuyentes.porIds(Set.of(contribuyenteId)).get(contribuyenteId))
                .map(ResumenDeContribuyente::codigo)
                .orElse(String.valueOf(contribuyenteId));
    }

    private static List<SeleccionDeObligacion> obligacionesDe(
            @Nullable List<PeticionDeFraccionamiento.PeticionDeObligacionAcogida> marcadas) {
        if (marcadas == null || marcadas.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Hay que marcar al menos una deuda: un convenio sin deuda acogida no fracciona"
                            + " nada");
        }
        List<SeleccionDeObligacion> seleccion = new ArrayList<>(marcadas.size());
        for (PeticionDeFraccionamiento.PeticionDeObligacionAcogida marcada : marcadas) {
            Integer ejercicio = marcada.ejercicio();
            if (ejercicio == null) {
                throw new ProblemaDeNegocio(
                        CodigoDeError.VALIDACION, "Falta el campo 'obligaciones[].ejercicio'");
            }
            try {
                seleccion.add(
                        new SeleccionDeObligacion(
                                exigir(marcada.tributo(), "obligaciones[].tributo"),
                                new Ejercicio(ejercicio),
                                marcada.predioId(),
                                marcada.vehiculoId()));
            } catch (IllegalArgumentException invalido) {
                throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
            }
        }
        return seleccion;
    }

    /**
     * El porcentaje de cuota inicial, admitiendo el rotulo de la pantalla («20 %»).
     *
     * <p>Es un {@code Alicuota} y no un {@code Porcentaje} porque el 0 % es admisible: la ordenanza
     * puede pactar un convenio sin entrada, y {@code Porcentaje} exige mayor que cero.
     */
    private static Alicuota porcentajeDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo 'cuotaInicial'");
        }
        String limpio = texto.strip().replace("%", "").strip();
        try {
            // NumberFormatException es una IllegalArgumentException, igual que el rechazo
            // de rango de Alicuota: las dos dicen lo mismo a quien teclea el porcentaje.
            return Alicuota.de(limpio);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'cuotaInicial' es un porcentaje de 0 a 100: '" + texto + "'");
        }
    }

    private static TipoDeConvenio tipoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return TipoDeConvenio.ORDINARIO;
        }
        try {
            return TipoDeConvenio.porNombre(texto);
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Tipo de convenio desconocido: '"
                            + texto
                            + "'. Se admite ORDINARIO o"
                            + " COACTIVO");
        }
    }

    private static @Nullable TipoDeGarantia garantiaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return TipoDeGarantia.porNombre(texto);
        } catch (IllegalArgumentException desconocido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Tipo de garantia desconocido: '"
                            + texto
                            + "'. Se admite NO REQUIERE, CARTA FIANZA, HIPOTECA, AVAL o PRENDA");
        }
    }

    private static TipoDeMovimientoDeConvenio accionDe(@Nullable String texto) {
        String valor = exigir(texto, "accion");
        TipoDeMovimientoDeConvenio accion;
        try {
            accion = TipoDeMovimientoDeConvenio.porNombre(valor);
        } catch (IllegalArgumentException desconocida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Accion desconocida: '"
                            + texto
                            + "'. Se admite ANULACION, QUIEBRE o REFORMULACION");
        }
        if (!CIERRES.contains(accion)) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Un convenio se formaliza cobrando su cuota inicial en caja, no por esta ruta"
                            + " (#35, RF-084)");
        }
        return accion;
    }

    private static @Nullable EstadoDeConvenio estadoDe(@Nullable String texto) {
        if (texto == null || texto.isBlank() || "TODOS".equalsIgnoreCase(texto.strip())) {
            return null;
        }
        EstadoDeConvenio estado = ESTADOS.get(texto.strip().toUpperCase(Locale.ROOT));
        if (estado == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Estado desconocido: '"
                            + texto
                            + "'. Se admite "
                            + new java.util.TreeSet<>(ESTADOS.keySet())
                            + " o Todos. «CUMPLIDO» y «EN RIESGO» no son estados del convenio sino"
                            + " situaciones de sus cuotas, y cuantas impagas producen la perdida"
                            + " del beneficio es una cifra de ordenanza local (D-02b)");
        }
        return estado;
    }

    private static NumeroDeConvenio numeroDe(String impreso) {
        try {
            return NumeroDeConvenio.de(impreso);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    /**
     * La fecha del acto. Si no viene, hoy.
     *
     * <p>Admitirla explicita no es un descuido de seguridad sino lo que exige registrar un convenio
     * firmado ayer: quien puede hacerlo tiene el privilegio sobre la opcion, y todo queda en la
     * auditoria con su observacion (mismo criterio que {@code CajaController}).
     */
    private LocalDate fechaDe(@Nullable String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return LocalDate.now(reloj);
        }
        return exigirFecha(texto, campo);
    }

    private static @Nullable LocalDate fechaOpcional(@Nullable String texto, String campo) {
        return texto == null || texto.isBlank() ? null : exigirFecha(texto, campo);
    }

    private static LocalDate exigirFecha(String texto, String campo) {
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException invalida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '" + campo + "' no es una fecha ISO valida: '" + texto + "'");
        }
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda escritura exige la observacion del usuario: sin ella no se guarda");
        }
        try {
            return Observacion.de(texto);
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static @Nullable String vacioAnulo(@Nullable String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }
}
