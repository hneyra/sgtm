package pe.gob.sgtm.coactiva.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.coactiva.aplicacion.CambiarEstadoDelExpediente;
import pe.gob.sgtm.coactiva.aplicacion.FraccionarEnCoactiva;
import pe.gob.sgtm.cuentacorriente.SeleccionDeObligacion;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.tesoreria.ConvenioCoactivo;
import pe.gob.sgtm.tesoreria.FraccionamientoCoactivo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * El fraccionamiento coactivo por HTTP (RF-105).
 *
 * <h2>Una sola ruta, la que el prototipo declara</h2>
 *
 * <p>{@code POST /coactiva/convenios}, con la bandera {@code simular} para el boton «Simular» de la
 * pantalla, igual que {@code POST /tesoreria/fraccionamientos}. Con {@code simular = true} no se
 * escribe nada: ni se numera un convenio, ni se toca el libro, ni queda auditoria.
 *
 * <h2>Lo que este controlador NO publica</h2>
 *
 * <p><b>Ninguna ruta para formalizar, quebrar o anular.</b> Un convenio coactivo se pone en vigor
 * cobrando su cuota inicial en caja, y se cierra por {@code POST
 * /tesoreria/convenios/{numero}/anulacion} —que comprueba el recibo de la inicial y devuelve la
 * deuda a su fase de origen—. Duplicar aqui esas rutas seria duplicar sus guardas, y una de las dos
 * copias se quedaria atras.
 *
 * <p>Y es tambien lo que hace que <b>quebrar un convenio coactivo devuelva la deuda a COACTIVA</b>
 * sin una linea de codigo especifica: el quiebre es el de #35 y lee {@code
 * convenio_deuda.fase_origen}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/coactiva")
public class ConvenioCoactivoController {

    /** La opcion del catalogo (NEG-03) que este controlador sirve. */
    static final String ACCESO_CONVENIOS = "fraccionamiento_coactivo";

    private final FraccionarEnCoactiva fraccionar;
    private final Clock reloj;

    public ConvenioCoactivoController(FraccionarEnCoactiva fraccionar, Clock reloj) {
        this.fraccionar = fraccionar;
        this.reloj = reloj;
    }

    /**
     * Registra el preconvenio coactivo, o solo simula su cronograma (RF-105).
     *
     * <p>Responde <b>201</b> al registrar y <b>200</b> al simular: lo primero crea un recurso y lo
     * segundo no.
     */
    @PostMapping("/convenios")
    @RequiereAcceso(acceso = ACCESO_CONVENIOS, privilegio = Privilegio.REGISTRO)
    public ResponseEntity<ConvenioCoactivoResource> fraccionar(
            @RequestBody PeticionDeConvenioCoactivo peticion) {

        String numeroDeExpediente = exigir(peticion.nroExpedCoact(), "nroExpedCoact");
        FraccionarEnCoactiva.Peticion pedido = peticionDe(peticion, numeroDeExpediente);

        if (Boolean.TRUE.equals(peticion.simular())) {
            return ResponseEntity.ok(
                    ConvenioCoactivoResource.de(
                            ejecutar(() -> fraccionar.simular(pedido)), numeroDeExpediente));
        }

        Observacion observacion = observacionDe(peticion.observacion());
        ConvenioCoactivo registrado = ejecutar(() -> fraccionar.fraccionar(pedido, observacion));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ConvenioCoactivoResource.de(registrado, numeroDeExpediente));
    }

    // ------------------------------------------------------------------

    /**
     * Traduce las excepciones de negocio a codigos HTTP, una sola vez para las dos ramas.
     *
     * <p>Sin esto habria dos bloques {@code catch} identicos, y el dia que se agregara una
     * excepcion se agregaria a uno solo.
     */
    private static ConvenioCoactivo ejecutar(java.util.function.Supplier<ConvenioCoactivo> accion) {
        try {
            return accion.get();
        } catch (CambiarEstadoDelExpediente.ExpedienteInexistente noExiste) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noExiste));
        } catch (CambiarEstadoDelExpediente.ExpedienteConcluido enConflicto) {
            // 409: la peticion esta bien formada; lo que no admite la operacion es el estado del
            // expediente.
            throw new ProblemaDeNegocio(CodigoDeError.CONFLICTO, mensajeDe(enConflicto));
        } catch (FraccionarEnCoactiva.DeudaAjenaAlProcedimiento
                | FraccionamientoCoactivo.SinDeudaCoactivaQueFraccionar
                | IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private FraccionarEnCoactiva.Peticion peticionDe(
            PeticionDeConvenioCoactivo peticion, String numeroDeExpediente) {

        LocalDate fecha = fechaOpcional(peticion.fecha(), "fecha", LocalDate.now(reloj));
        LocalDate corte = fechaOpcional(peticion.fechaDeCorte(), "fechaDeCorte", fecha);
        Integer cuotas = peticion.nroDeCuotas();
        if (cuotas == null) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo 'nroDeCuotas'");
        }
        try {
            return new FraccionarEnCoactiva.Peticion(
                    numeroDeExpediente,
                    obligacionesDe(peticion.obligaciones()),
                    fecha,
                    corte,
                    cuotas,
                    porcentajeDe(peticion.cuotaInicial()),
                    fechaOpcional(peticion.primeraCuotaVence(), "primeraCuotaVence", fecha),
                    vacioAnulo(peticion.resolucion()));
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private static List<SeleccionDeObligacion> obligacionesDe(
            @Nullable List<PeticionDeConvenioCoactivo.PeticionDeObligacionAcogida> marcadas) {
        if (marcadas == null || marcadas.isEmpty()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Hay que marcar al menos una deuda: un convenio sin deuda acogida no fracciona"
                            + " nada");
        }
        List<SeleccionDeObligacion> seleccion = new ArrayList<>(marcadas.size());
        for (PeticionDeConvenioCoactivo.PeticionDeObligacionAcogida marcada : marcadas) {
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
     * <p>{@link Alicuota} y no {@code Porcentaje} porque el 0 % es admisible: la ordenanza puede
     * pactar un convenio sin entrada.
     */
    private static Alicuota porcentajeDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo 'cuotaInicial'");
        }
        String limpio = texto.strip().replace("%", "").strip();
        try {
            return Alicuota.de(limpio);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'cuotaInicial' es un porcentaje de 0 a 100: '" + texto + "'");
        }
    }

    private static LocalDate fechaOpcional(
            @Nullable String texto, String campo, LocalDate porOmision) {
        if (texto == null || texto.isBlank()) {
            return porOmision;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '" + campo + "' va en formato ISO (2026-03-16): '" + texto + "'");
        }
    }

    private static Observacion observacionDe(@Nullable String texto) {
        try {
            return Observacion.de(exigir(texto, "observacion"));
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
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        return limpio.isEmpty() ? null : limpio;
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "La operacion no se pudo completar" : mensaje;
    }
}
