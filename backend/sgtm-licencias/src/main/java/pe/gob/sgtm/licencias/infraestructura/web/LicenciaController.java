package pe.gob.sgtm.licencias.infraestructura.web;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
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
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.FormatoDeDocumento;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.licencias.aplicacion.CancelarLicencia;
import pe.gob.sgtm.licencias.aplicacion.ComprobacionDelDerecho;
import pe.gob.sgtm.licencias.aplicacion.ConsultaDeLicencias;
import pe.gob.sgtm.licencias.aplicacion.DerechosDeTramiteParametrizados;
import pe.gob.sgtm.licencias.aplicacion.DuplicarLicencia;
import pe.gob.sgtm.licencias.aplicacion.EmitirLicenciaDeFuncionamiento;
import pe.gob.sgtm.licencias.dominio.CriterioDeLicencias;
import pe.gob.sgtm.licencias.dominio.DuplicadoDeLicenciaRepository;
import pe.gob.sgtm.licencias.dominio.LicenciaRepository;
import pe.gob.sgtm.licencias.dominio.MovimientoDeLicenciaRepository;
import pe.gob.sgtm.licencias.dominio.TipoDeLicencia;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ParametrosDePaginacion;
import pe.gob.sgtm.web.ProblemaDeNegocio;
import pe.gob.sgtm.web.RespuestaPaginada;

/**
 * La licencia de funcionamiento por HTTP: consulta, emision, cancelacion y duplicado (RF-110,
 * RF-111).
 *
 * <h2>Tres opciones del catalogo, tres accesos</h2>
 *
 * <p>Cada endpoint declara el suyo: {@code licencia_funcionamiento} lee y registra, {@code
 * licencia_resolucion_cancelacion} y {@code licencia_resolucion_duplicado} escriben. Sin
 * {@code @RequiereAcceso} el guardia <b>niega</b>, y la regla de arquitectura rompe el build; las
 * dos cosas juntas hacen que el olvido no se pueda convertir en una puerta abierta.
 *
 * <h2>Ningun {@code PUT} ni {@code PATCH}</h2>
 *
 * <p>Una licencia no se corrige: es un acto administrativo que el titular cuelga en la pared, y
 * {@code licencia_funcionamiento} no admite {@code UPDATE} desde V37. Lo que le pasa llega como un
 * recurso nuevo —{@code /cancelacion}, {@code /duplicado}—, que es ademas lo que el prototipo
 * declara.
 *
 * <h2>El numero, en la ruta</h2>
 *
 * <p>{@code {id}} es el numero <b>impreso</b> de la licencia, tal como esta en el papel del
 * establecimiento. Ni el identificador interno de la fila —que ninguna pantalla conoce— ni el
 * ejercicio y el correlativo por separado.
 */
@RestController
@RequestMapping(Api.RAIZ + "/licencias")
public class LicenciaController {

    /** Las tres opciones del catalogo (NEG-03) que este controlador sirve. */
    static final String ACCESO_LICENCIA = "licencia_funcionamiento";

    static final String ACCESO_CANCELACION = "licencia_resolucion_cancelacion";

    static final String ACCESO_DUPLICADO = "licencia_resolucion_duplicado";

    private static final String ORDEN_POR_OMISION = "numero";

    private final ConsultaDeLicencias consulta;
    private final EmitirLicenciaDeFuncionamiento emitir;
    private final CancelarLicencia cancelar;
    private final DuplicarLicencia duplicar;
    private final Clock reloj;

    public LicenciaController(
            ConsultaDeLicencias consulta,
            EmitirLicenciaDeFuncionamiento emitir,
            CancelarLicencia cancelar,
            DuplicarLicencia duplicar,
            Clock reloj) {
        this.consulta = consulta;
        this.emitir = emitir;
        this.cancelar = cancelar;
        this.duplicar = duplicar;
        this.reloj = reloj;
    }

    /**
     * La grilla de licencias, paginada, con el estado de cada una derivado a hoy (RF-110).
     *
     * <p>Con {@code nroLicencia}, la fila trae ademas su historial y sus duplicados: es la ficha
     * que la pantalla dibuja al abrir una licencia. Sin el, la fila es la que la grilla pinta y
     * nada mas —una pagina de veinte no puede costar veinte lecturas de detalle—.
     */
    @GetMapping("/funcionamiento")
    @RequiereAcceso(acceso = ACCESO_LICENCIA, privilegio = Privilegio.LECTURA)
    public RespuestaPaginada<LicenciaResource> listar(
            @RequestParam(required = false) @Nullable String nroLicencia,
            @RequestParam(required = false) @Nullable String nExpediente,
            @RequestParam(required = false) @Nullable String nombreDelContribuyente,
            @RequestParam(required = false) @Nullable String denominacionComercial,
            @RequestParam(required = false) @Nullable String direccion,
            ParametrosDePaginacion paginacion) {

        LocalDate hoy = LocalDate.now(reloj);

        if (nroLicencia != null && !nroLicencia.isBlank()) {
            return consulta.porNumero(nroLicencia.strip(), hoy)
                    .map(
                            ficha ->
                                    RespuestaPaginada.de(
                                            Pagina.de(
                                                    List.of(LicenciaResource.de(ficha)),
                                                    paginacion.aPaginacion(ORDEN_POR_OMISION),
                                                    1)))
                    .orElseGet(
                            () ->
                                    RespuestaPaginada.de(
                                            Pagina.vacia(
                                                    paginacion.aPaginacion(ORDEN_POR_OMISION))));
        }

        CriterioDeLicencias criterio =
                new CriterioDeLicencias(null, nExpediente, denominacionComercial, direccion, null);

        return RespuestaPaginada.de(
                consulta.buscar(
                        criterio,
                        nombreDelContribuyente,
                        hoy,
                        paginacion.aPaginacion(ORDEN_POR_OMISION)),
                LicenciaResource::de);
    }

    /**
     * Emite una licencia de funcionamiento (RF-110).
     *
     * <p>Responde <b>201</b> con el numero de la licencia y el de su papel. El {@code 422} de un
     * recibo que no respalda el derecho lleva el motivo exacto: cual de las cuatro condiciones
     * fallo.
     */
    @PostMapping("/funcionamiento")
    @RequiereAcceso(acceso = ACCESO_LICENCIA, privilegio = Privilegio.REGISTRO)
    public ResponseEntity<ActoDeLicenciaResource> emitir(@RequestBody PeticionDeLicencia peticion) {

        Observacion observacion = observacionDe(peticion.observacion());
        FormatoDeDocumento formato = formatoDe(peticion.formato());
        LocalDate emisionEl = fechaOhoy(peticion.fechaDeEmision(), "fechaDeEmision");

        EmitirLicenciaDeFuncionamiento.Solicitud solicitud =
                new EmitirLicenciaDeFuncionamiento.Solicitud(
                        exigido(peticion.codContribuyente(), "codContribuyente"),
                        peticion.predioId(),
                        exigido(peticion.denominacionComercial(), "denominacionComercial"),
                        exigido(peticion.direccion(), "direccion"),
                        areaDe(peticion.areaDelEstablecimiento()),
                        tipoDe(peticion.tipoDeLicencia()),
                        vacioAnulo(peticion.zonificacion()),
                        peticion.aforo(),
                        emisionEl,
                        fechaOpcional(peticion.fechaDeVencimiento(), "fechaDeVencimiento"),
                        exigido(peticion.nDeRecibo(), "nDeRecibo"),
                        peticion.giros() == null ? List.of() : peticion.giros(),
                        exigido(peticion.giroPrincipal(), "giroPrincipal"),
                        vacioAnulo(peticion.nExpediente()),
                        fechaOpcional(peticion.fechaDeExpediente(), "fechaDeExpediente"));

        EmitirLicenciaDeFuncionamiento.LicenciaEmitida emitida;
        try {
            emitida = emitir.emitir(solicitud, formato, observacion);
        } catch (EmitirLicenciaDeFuncionamiento.TitularDesconocido noEsta) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noEsta));
        } catch (EmitirLicenciaDeFuncionamiento.GiroDesconocido noEstaElGiro) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(noEstaElGiro));
        } catch (ComprobacionDelDerecho.DerechoNoPagado sinPagar) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(sinPagar));
        } catch (DerechosDeTramiteParametrizados.DerechoSinParametrizar sinParametro) {
            // 422 y no 500: la peticion esta bien y el sistema tampoco esta roto. Lo que falta es
            // un dato de configuracion, y quien opera tiene que enterarse de cual para poder
            // pedirlo, en vez de recibir «error interno» y un identificador de incidencia.
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(sinParametro));
        } catch (LicenciaRepository.NumeroDuplicado repetido) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(repetido));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(ActoDeLicenciaResource.de(emitida));
    }

    /** Cancela una licencia y emite su resolucion (RF-111). */
    @PostMapping("/funcionamiento/{id}/cancelacion")
    @RequiereAcceso(acceso = ACCESO_CANCELACION, privilegio = Privilegio.REGISTRO)
    public ResponseEntity<ActoDeLicenciaResource> cancelacion(
            @PathVariable String id, @RequestBody PeticionDeCancelacion peticion) {

        Observacion observacion = observacionDe(peticion.observacion());
        FormatoDeDocumento formato = formatoDe(peticion.formato());
        LocalDate fecha = fechaOhoy(peticion.fecha(), "fecha");

        CancelarLicencia.Cancelacion cancelacion;
        try {
            cancelacion =
                    cancelar.cancelar(
                            id,
                            fecha,
                            peticion.motivo() == null ? "" : peticion.motivo(),
                            formato,
                            observacion);
        } catch (CancelarLicencia.LicenciaInexistente noExiste) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noExiste));
        } catch (CancelarLicencia.YaEstabaCancelada yaEstaba) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(yaEstaba));
        } catch (MovimientoDeLicenciaRepository.LicenciaYaCancelada carrera) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(carrera));
        } catch (CancelarLicencia.SinMotivo | CancelarLicencia.AnteriorALaEmision invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ActoDeLicenciaResource.de(cancelacion));
    }

    /** Autoriza un duplicado y vuelve a sacar la licencia, marcada (RF-111). */
    @PostMapping("/funcionamiento/{id}/duplicado")
    @RequiereAcceso(acceso = ACCESO_DUPLICADO, privilegio = Privilegio.IMPRESION)
    public ResponseEntity<ActoDeLicenciaResource> duplicado(
            @PathVariable String id, @RequestBody PeticionDeDuplicado peticion) {

        Observacion observacion = observacionDe(peticion.observacion());
        FormatoDeDocumento formato = formatoDe(peticion.formato());
        LocalDate fecha = fechaOhoy(peticion.fecha(), "fecha");

        DuplicarLicencia.Duplicado duplicado;
        try {
            duplicado =
                    duplicar.duplicar(
                            id,
                            fecha,
                            exigido(peticion.motivo(), "motivo"),
                            exigido(peticion.nDeRecibo(), "nDeRecibo"),
                            formato,
                            observacion);
        } catch (CancelarLicencia.LicenciaInexistente noExiste) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noExiste));
        } catch (DuplicarLicencia.LicenciaCancelada cancelada) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(cancelada));
        } catch (EmitirDocumento.LaReimpresionNoCoincide distinto) {
            // 409 y no 500: la peticion esta bien y el sistema tampoco esta roto en el sentido de
            // un fallo tecnico. Lo que pasa es que el estado actual no admite entregar este papel.
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(distinto));
        } catch (EmitirDocumento.DocumentoNoEmitido sinPapel) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(sinPapel));
        } catch (ComprobacionDelDerecho.DerechoNoPagado sinPagar) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(sinPagar));
        } catch (DerechosDeTramiteParametrizados.DerechoSinParametrizar sinParametro) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(sinParametro));
        } catch (DuplicadoDeLicenciaRepository.DuplicadoDuplicado carrera) {
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(carrera));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(ActoDeLicenciaResource.de(duplicado));
    }

    // ------------------------------------------------------------------

    private static Observacion observacionDe(@Nullable String texto) {
        try {
            return Observacion.de(texto == null ? "" : texto);
        } catch (IllegalArgumentException sinObservacion) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda modificacion de datos exige la observacion del usuario (regla 10,"
                            + " RNF-052): "
                            + mensajeDe(sinObservacion));
        }
    }

    private static FormatoDeDocumento formatoDe(@Nullable String formato) {
        if (formato == null || formato.isBlank()) {
            return FormatoDeDocumento.PDF;
        }
        try {
            return FormatoDeDocumento.valueOf(formato.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException noExiste) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El formato va entre PDF, XLS y RTF: '" + formato + "'");
        }
    }

    private static TipoDeLicencia tipoDe(@Nullable String tipo) {
        String texto = tipo == null ? "" : tipo.strip();
        if (texto.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Hay que decir que tipo de licencia es: DEFINITIVA, TEMPORAL o CESIONARIA");
        }
        try {
            return TipoDeLicencia.porNombre(texto);
        } catch (IllegalArgumentException noExiste) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El tipo de licencia va entre DEFINITIVA, TEMPORAL y CESIONARIA: '"
                            + tipo
                            + "'");
        }
    }

    private static AreaM2 areaDe(@Nullable String area) {
        String texto = area == null ? "" : area.strip();
        if (texto.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El area del establecimiento es obligatoria: de ella depende la tasa y el"
                            + " aforo");
        }
        try {
            return new AreaM2(new BigDecimal(texto));
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El area del establecimiento va en metros cuadrados: '" + area + "'");
        }
    }

    private static String exigido(@Nullable String valor, String campo) {
        String texto = valor == null ? "" : valor.strip();
        if (texto.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Falta el campo obligatorio '" + campo + "'");
        }
        return texto;
    }

    private static @Nullable String vacioAnulo(@Nullable String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }

    private static @Nullable LocalDate fechaOpcional(@Nullable String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '" + campo + "' va en formato ISO (2026-03-15): '" + texto + "'");
        }
    }

    /**
     * La fecha del acto, o la de hoy.
     *
     * <p>El reloj es el <b>inyectado</b>, no {@code LocalDate.now()} suelto: una prueba que no
     * pueda congelar el dia no puede comprobar nada que dependa de el, y una fila de auditoria
     * fechada con el reloj de la maquina cae en la particion que no es.
     */
    private LocalDate fechaOhoy(@Nullable String texto, String campo) {
        LocalDate fecha = fechaOpcional(texto, campo);
        return fecha == null ? LocalDate.now(reloj) : fecha;
    }

    /**
     * El texto de una excepcion, sin poder ser nulo.
     *
     * <p>{@code getMessage()} es {@code @Nullable} y NullAway lo exige: una respuesta de error con
     * el cuerpo en blanco es peor que una con un texto generico, porque no dice ni siquiera que
     * clase de problema hubo.
     */
    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "La peticion no se pudo completar" : mensaje;
    }
}
