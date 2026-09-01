package pe.gob.sgtm.valores.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.valores.aplicacion.DeclararPrescripcion;
import pe.gob.sgtm.valores.aplicacion.PlazosParametrizados;
import pe.gob.sgtm.valores.dominio.CausalDePrescripcion;
import pe.gob.sgtm.valores.dominio.ClaseDeHecho;
import pe.gob.sgtm.valores.dominio.HechoDelComputo;
import pe.gob.sgtm.valores.dominio.Prescripcion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Declaracion de prescripcion de la accion de cobro: {@code POST /api/v1/coactiva/prescripcion}
 * (RF-094).
 *
 * <p><b>Vive en {@code valores} aunque su ruta diga {@code coactiva}.</b> La ruta la fija el
 * contrato, que sale del menu del manual; el contexto acotado lo fija lo que el caso de uso toca, y
 * lo que este toca son valores: los marca {@code PRESCRITO}. No abre expedientes, no escribe actos
 * coactivos y no lee ninguno —eso es #40—.
 *
 * <p>Sin {@code PUT} ni {@code PATCH}: una resolucion no se edita.
 *
 * <h2>Que devuelve 422, y por que no 500 (#562)</h2>
 *
 * <p>El plazo del art. 43 y el desfase del inicio del computo del art. 44 salen del <b>conjunto
 * sellado</b> que rige a la fecha de la solicitud ({@link PlazosParametrizados}, regla 5). Que el
 * conjunto exista y no traiga la llave ({@code PlazoSinParametrizar}) ya estaba traducido desde
 * #192; que <b>no exista ningun conjunto sellado</b> ({@code EjercicioSinSellar}) no lo estaba, y
 * con D-02a abierta ese es el estado <i>normal</i> de todas las municipalidades: caia en el
 * {@code @ExceptionHandler(Exception.class)} de {@code ManejadorDeErrores} y salia como <b>500
 * {@code ERROR_INTERNO} con identificador de incidencia</b> —con lo que, ademas, cada intento
 * ensuciaba el registro de errores del servidor con lo que no es un error—.
 *
 * <p>El mensaje es el de la propia excepcion: nombra la llave —{@code
 * PLAZO:PRESCRIPCION-DECLARACION_PRESENTADA}— o, cuando lo que falta es el conjunto entero y no hay
 * llave que nombrar, el <b>ejercicio</b>. Un fallo de verdad del servidor sigue siendo 500 con su
 * incidencia, y hay una prueba de contraste que lo mide. El razonamiento completo esta en la
 * cabecera de {@link ValoresController}.
 */
@RestController
@RequestMapping(Api.RAIZ + "/coactiva")
public class PrescripcionController {

    private final DeclararPrescripcion declarar;
    private final DirectorioDeContribuyentes contribuyentes;
    private final Clock reloj;

    public PrescripcionController(
            DeclararPrescripcion declarar, DirectorioDeContribuyentes contribuyentes, Clock reloj) {
        this.declarar = declarar;
        this.contribuyentes = contribuyentes;
        this.reloj = reloj;
    }

    @PostMapping("/prescripcion")
    @RequiereAcceso(acceso = "prescripcion", privilegio = Privilegio.REGISTRO)
    public ResponseEntity<PrescripcionResource> declarar(
            @RequestBody PeticionDePrescripcion peticion) {

        ResumenDeContribuyente contribuyente = contribuyenteDe(peticion.codContribuyente());
        String tributo = exigir(peticion.tributo(), "tributo");
        Ejercicio desde = ejercicioDe(peticion.ejercicioDesde(), "ejercicioDesde");
        Ejercicio hasta = ejercicioDe(peticion.ejercicioHasta(), "ejercicioHasta");
        LocalDate presentacion =
                fechaOpcionalDe(peticion.fechaDePresentacion(), "fechaDePresentacion");
        CausalDePrescripcion causal = causalDe(peticion.plazoAplicable());
        List<HechoDelComputo> hechos = hechosDe(peticion.hechos());
        Observacion observacion = observacionDe(peticion.observacion());

        try {
            Prescripcion guardada =
                    declarar.declarar(
                            contribuyente.id(),
                            tributo,
                            desde,
                            hasta,
                            presentacion == null ? LocalDate.now(reloj) : presentacion,
                            causal,
                            hechos,
                            vacioAnulo(peticion.nDeResolucion()),
                            observacion);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(PrescripcionResource.de(guardada, contribuyente.codigo()));
        } catch (DeclararPrescripcion.RangoInvertido
                | PlazosParametrizados.PlazoSinParametrizar
                | LectorDeParametros.EjercicioSinSellar
                | IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    // ------------------------------------------------------------------

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

    private static Ejercicio ejercicioDe(@Nullable Integer valor, String campo) {
        if (valor == null) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        try {
            return new Ejercicio(valor);
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }
    }

    private static CausalDePrescripcion causalDe(@Nullable String texto) {
        String valor = exigir(texto, "plazoAplicable");
        try {
            return CausalDePrescripcion.valueOf(valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Causal de prescripcion desconocida: '"
                            + texto
                            + "'. Se admite DECLARACION_PRESENTADA, SIN_DECLARACION o"
                            + " AGENTE_RETENCION");
        }
    }

    private static List<HechoDelComputo> hechosDe(
            @Nullable List<PeticionDePrescripcion.PeticionDeHecho> peticiones) {
        if (peticiones == null || peticiones.isEmpty()) {
            return List.of();
        }
        List<HechoDelComputo> hechos = new ArrayList<>(peticiones.size());
        for (PeticionDePrescripcion.PeticionDeHecho hecho : peticiones) {
            ClaseDeHecho clase = claseDe(hecho.clase());
            LocalDate desde = fechaRequeridaDe(hecho.fechaDesde(), "hechos[].fechaDesde");
            LocalDate hasta = fechaOpcionalDe(hecho.fechaHasta(), "hechos[].fechaHasta");
            try {
                hechos.add(
                        new HechoDelComputo(
                                clase, exigir(hecho.causal(), "hechos[].causal"), desde, hasta));
            } catch (IllegalArgumentException invalido) {
                throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
            }
        }
        return hechos;
    }

    private static ClaseDeHecho claseDe(@Nullable String texto) {
        String valor = exigir(texto, "hechos[].clase");
        try {
            return ClaseDeHecho.valueOf(valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Clase de hecho desconocida: '"
                            + texto
                            + "'. Se admite INTERRUPCION o SUSPENSION");
        }
    }

    private static @Nullable LocalDate fechaOpcionalDe(@Nullable String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException invalida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '" + campo + "' no es una fecha ISO valida: '" + texto + "'");
        }
    }

    private static LocalDate fechaRequeridaDe(@Nullable String texto, String campo) {
        LocalDate fecha = fechaOpcionalDe(texto, campo);
        if (fecha == null) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return fecha;
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda declaracion exige la observacion del usuario: sin ella no se guarda");
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
