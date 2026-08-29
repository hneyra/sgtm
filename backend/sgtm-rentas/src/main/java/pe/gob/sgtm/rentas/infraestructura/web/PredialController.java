package pe.gob.sgtm.rentas.infraestructura.web;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.autorizacion.RequiereAcceso;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.aplicacion.CuadroPredialParametrizado;
import pe.gob.sgtm.rentas.aplicacion.DeterminarPredial;
import pe.gob.sgtm.rentas.aplicacion.DeterminarPredialMasivo;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * La capa web de la determinacion predial (#395): {@code predial_individual} y {@code
 * predial_masivo}.
 *
 * <p>#30 dejo la regla de negocio —{@code RegistrarDeterminacionPredial}, {@code
 * TramosProgresivosAcumulativos}, {@code MinimoImponible}— y su prueba; ningun controlador la
 * publicaba, asi que el calculo del predial se seguia haciendo fuera del sistema. Esto es esa capa.
 *
 * <h2>Simular y determinar, en la misma operacion</h2>
 *
 * <p>El contrato declara <b>una</b> operacion por pantalla, y la pantalla tiene los dos botones. La
 * diferencia va en el cuerpo, como ya hacia {@code VehicularController} con {@code simulacion}
 * (#32), y aqui es <b>obligatoria</b>: una peticion que no diga cual de las dos cosas quiere se
 * rechaza. Suponer «determina» emitiria deuda al pulsar un boton que dice «Simular» —el defecto que
 * la guarda del frontend evitaba mientras contestaba el proxy de datos—; suponer «simula» dejaria
 * de emitirla al pulsar el que dice «Calcular». Ninguna de las dos equivocaciones avisa, asi que no
 * hay valor por omision que elegir.
 *
 * <h2>Los filtros del contrato se leen de la consulta; lo demas, del cuerpo</h2>
 *
 * <p>El contrato declara {@code codContribuyente} y {@code ano} como parametros de consulta —son
 * los filtros que la pantalla dibuja— y el cuerpo como un objeto libre. Se aceptan los dos caminos
 * y gana el cuerpo si trae el dato: es lo que evita repetir aqui el desajuste que {@code
 * vehicular_calculo} arrastra desde #32, donde el controlador lee del cuerpo lo que el contrato
 * declara de consulta y ninguna pantalla puede llamarlo.
 *
 * <h2>Que devuelve 422</h2>
 *
 * <p>Todo lo que es un dato que falta y no un sistema roto: una cifra del cuadro que el conjunto
 * sellado no trae —y el mensaje dice <b>cual</b>, {@code TRAMO_PREDIAL_LIMITE:2}, {@code
 * DERECHO_EMISION_PREDIAL}—, un predio de la base sin autovaluo declarado, un predio que no es del
 * contribuyente. Mismo trato que {@code TASA_ANUNCIO:‹CLASE›} en #51 y {@code BENEFICIO:‹CAMPANIA›}
 * en #72: quien opera tiene que enterarse de que le falta para poder pedirlo.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/predial")
public class PredialController {

    private final DeterminarPredial individual;
    private final DeterminarPredialMasivo masivo;
    private final Clock reloj;

    public PredialController(
            DeterminarPredial individual, DeterminarPredialMasivo masivo, Clock reloj) {
        this.individual = individual;
        this.masivo = masivo;
        this.reloj = reloj;
    }

    /**
     * Determina —o simula— el predial de un contribuyente sobre el autovaluo acumulado de todos sus
     * predios, con la escala progresiva acumulativa y el minimo imponible del conjunto sellado.
     */
    @PostMapping("/calculo-individual")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "predial_individual", privilegio = Privilegio.REGISTRO)
    public DeterminacionPredialResource calcular(
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String ano,
            @RequestBody PeticionDeCalculoPredial peticion) {

        boolean simulacion = exigirSimulacion(peticion.simulacion());
        Observacion observacion =
                observacionDe(
                        peticion.observacion(),
                        simulacion,
                        "Simulacion del impuesto predial individual: se calcula y no se asienta"
                                + " ninguna determinacion (#395)");
        String contribuyente =
                exigir(
                        primeroNoVacio(peticion.codContribuyente(), codContribuyente),
                        "Hay que decir de que contribuyente se determina: falta"
                                + " «codContribuyente»");
        Ejercicio ejercicio = ejercicioDe(primeroNoVacio(peticion.ejercicio(), ano));

        List<DeterminarPredial.PredioDeclarado> predios = new ArrayList<>();
        List<PeticionDeCalculoPredial.PredioDelCalculo> declarados =
                peticion.predios() == null ? List.of() : peticion.predios();
        for (PeticionDeCalculoPredial.PredioDelCalculo predio : declarados) {
            Long id = predio.predioId();
            if (id == null) {
                throw new ProblemaDeNegocio(
                        CodigoDeError.VALIDACION,
                        "Cada predio declarado dice a que predio corresponde su autovaluo: falta"
                                + " «predioId»");
            }
            predios.add(
                    new DeterminarPredial.PredioDeclarado(
                            id,
                            importe(predio.autovaluo(), "autovaluo"),
                            predio.valuoExonerado() == null
                                    ? null
                                    : importe(predio.valuoExonerado(), "valuoExonerado")));
        }

        try {
            return DeterminacionPredialResource.de(
                    individual.determinar(
                            new DeterminarPredial.Peticion(
                                    ejercicio,
                                    contribuyente,
                                    predios,
                                    peticion.modalidad() == null ? "" : peticion.modalidad(),
                                    simulacion),
                            observacion));
        } catch (DeterminarPredial.ContribuyenteInexistente noEsta) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, mensajeDe(noEsta));
        } catch (DeterminarPredial.SinPrediosEnElPadron
                | DeterminarPredial.PredioSinAutovaluo
                | DeterminarPredial.PredioRepetido
                | DeterminarPredial.PredioAjeno mal) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(mal));
        } catch (CuadroPredialParametrizado.ParametroDelPredialAusente falta) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(falta));
        } catch (ParametrosSellados.ParametroAusente falta) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(falta));
        }
    }

    /**
     * Recalcula el padron declarado del ejercicio y deja constancia de los contribuyentes
     * observados que quedan fuera de la emision.
     */
    @PostMapping("/calculo-masivo")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "predial_masivo", privilegio = Privilegio.EJECUCION)
    public CorridaPredialResource correr(@RequestBody PeticionDeCalculoMasivo peticion) {
        boolean simulacion = exigirSimulacion(peticion.simulacion());
        Observacion observacion =
                observacionDe(
                        peticion.observacion(),
                        simulacion,
                        "Simulacion de la emision anual del predial: se recorre el padron y no se"
                                + " asienta ninguna determinacion (#395)");
        Ejercicio ejercicio = ejercicioDeLaCorrida(peticion.ejercicio(), simulacion);
        rechazarLoQueNoHace(peticion);

        try {
            return CorridaPredialResource.de(
                    masivo.ejecutar(
                            new DeterminarPredialMasivo.Peticion(
                                    ejercicio,
                                    peticion.alcance() == null ? "" : peticion.alcance(),
                                    peticion.sector(),
                                    peticion.modalidad() == null ? "" : peticion.modalidad(),
                                    Boolean.TRUE.equals(peticion.recalculaYaEmitidos()),
                                    simulacion),
                            observacion));
        } catch (CuadroPredialParametrizado.ParametroDelPredialAusente falta) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(falta));
        } catch (ParametrosSellados.ParametroAusente falta) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(falta));
        } catch (IllegalArgumentException mal) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(mal));
        }
    }

    /**
     * Los dos interruptores que la pantalla dibuja y esta corrida no hace se rechazan en vez de
     * ignorarse.
     *
     * <p>Ignorarlos devolveria una corrida «correcta» a quien pidio ademas los arbitrios o la
     * cuponera, y la ausencia solo se notaria al buscar los recibos que nadie genero. Los arbitrios
     * son otro tributo con su propia determinacion —{@code DeterminarArbitrios}, #37— y la cuponera
     * es un documento, que es la capa de #43 y no esta.
     */
    private static void rechazarLoQueNoHace(PeticionDeCalculoMasivo peticion) {
        if (Boolean.TRUE.equals(peticion.incluyeArbitrios())) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Esta corrida determina el impuesto predial. Los arbitrios son otro tributo, con"
                            + " su propia determinacion por periodo, y no se emiten aqui");
        }
        if (Boolean.TRUE.equals(peticion.generaCuponeraPdf())) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Esta corrida determina; no genera documentos. La cuponera se imprime desde la"
                            + " emision de valores, con su numeracion y su rastro");
        }
    }

    /**
     * Sin observacion no se guarda (regla 10, RNF-052) — <b>cuando se guarda</b>.
     *
     * <p>La regla 10 gobierna las modificaciones de datos, y una simulacion no modifica ninguno: no
     * escribe fila de {@code determinacion} ni de {@code auditoria}. Exigirsela dejaria a la
     * pantalla sin poder ensenar el calculo antes de asentarlo, que es justo lo que su boton
     * «Simular» existe para hacer. La que se pasa entonces la <b>compone el sistema</b>, como en
     * las filas de {@code ACCESO} de {@code ConsultaDeTitulares}, y {@link
     * pe.gob.sgtm.rentas.aplicacion.RegistrarDeterminacionPredial} la sigue recibiendo: la regla de
     * ArchUnit no se relaja, lo que cambia es quien la escribe cuando no hay nada que justificar.
     *
     * <p>Con {@code simulacion = false} vuelve a ser obligatoria del usuario, porque ahi si hay una
     * determinacion nueva que alguien tendra que explicar.
     */
    private static Observacion observacionDe(
            @Nullable String texto, boolean simulacion, String laDelSistema) {
        if (texto == null || texto.isBlank()) {
            if (simulacion) {
                return Observacion.de(laDelSistema);
            }
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Toda modificacion exige la observacion del usuario: sin ella no se guarda");
        }
        try {
            return Observacion.de(texto);
        } catch (IllegalArgumentException invalida) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalida));
        }
    }

    /**
     * El ejercicio de la corrida: obligatorio para asentar, optativo para simular.
     *
     * <p>Simular sin decir el ejercicio se lee como «el que corre», que es lo que la pantalla
     * ensena al abrirse. Emitir sin decirlo, no: elegir por el operador que padron se emite es la
     * clase de suposicion que nadie revisa hasta que llegan los valores del ano equivocado.
     */
    private Ejercicio ejercicioDeLaCorrida(@Nullable String texto, boolean simulacion) {
        if ((texto == null || texto.isBlank()) && simulacion) {
            return Ejercicio.de(LocalDate.now(reloj));
        }
        return ejercicioDe(texto);
    }

    /** Sin valor por omision: ver el javadoc de la clase. */
    private static boolean exigirSimulacion(@Nullable Boolean simulacion) {
        if (simulacion == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Hay que decir si esto simula o determina: «simulacion» es obligatorio. Con"
                            + " true se calcula y no se guarda nada; con false se asienta la"
                            + " determinacion");
        }
        return simulacion;
    }

    private static Ejercicio ejercicioDe(@Nullable String texto) {
        String pedido =
                exigir(texto, "Hay que decir que ejercicio se determina: falta «ejercicio»");
        try {
            return new Ejercicio(Integer.parseInt(pedido.strip()));
        } catch (IllegalArgumentException mal) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El ejercicio tiene que ser un ano: '" + pedido + "'");
        }
    }

    private static Dinero importe(@Nullable String texto, String campo) {
        String pedido = exigir(texto, "Falta «" + campo + "»");
        try {
            return Dinero.de(pedido.strip());
        } catch (IllegalArgumentException | ArithmeticException mal) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo «" + campo + "» tiene que ser un importe: '" + pedido + "'");
        }
    }

    private static String exigir(@Nullable String texto, String queFalta) {
        if (texto == null || texto.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, queFalta);
        }
        return texto.strip();
    }

    private static @Nullable String primeroNoVacio(
            @Nullable String delCuerpo, @Nullable String deLaConsulta) {
        if (delCuerpo != null && !delCuerpo.isBlank()) {
            return delCuerpo;
        }
        return deLaConsulta;
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? CodigoDeError.VALIDACION.mensaje() : mensaje;
    }
}
