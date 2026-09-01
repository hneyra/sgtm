package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
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
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.RangoDeCuotas;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.Api;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.FiltroDeLaConsulta;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Alta y baja de deuda: {@code POST /api/v1/rentas/deuda/altas} y {@code .../bajas} (RF-043,
 * RF-044).
 *
 * <p>Son dos rutas y un solo controlador porque el cuerpo es el mismo y lo unico que cambia es el
 * sentido. Separarlos en dos clases duplicaria la validacion entera para cambiar un enum.
 *
 * <p><b>La observacion viene en el cuerpo y es obligatoria</b> (regla 10, RNF-052), igual que en
 * {@code ActualizacionController}. Y el <b>sustento documental</b> tambien: sin la resolucion que
 * lo aprueba, un alta o una baja de deuda no se puede defender ante nadie, y por eso lo exige
 * {@link MovimientoDeDeuda} en su constructor y no una validacion de cortesia aqui.
 *
 * <p>El cuerpo es una <b>lista blanca</b>: un campo que la opcion no declara no entra, aunque
 * llegue en el JSON.
 *
 * <h2>El rango de cuotas, y por que se declara en vez de rechazarse (#538)</h2>
 *
 * <p>La pantalla del manual da de alta un <b>rango</b> —«cuotas 1 a 4»— y manda {@code cuotaDesde}
 * y {@code cuotaHasta}. Hasta #538 el {@code record} declaraba solo {@code cuota}, singular:
 * Jackson descartaba los dos campos de mas sin decir nada —el proyecto no activa {@code
 * FAIL_ON_UNKNOWN_PROPERTIES} y el valor por omision de Spring Boot es desactivado— y la clave se
 * componia con {@code cuota == null ? 0}. Respuesta <b>201</b>, importe correcto, documento
 * emitido, y los asientos en {@code periodo = 0}.
 *
 * <p>Eso no se ve. {@code 0} <b>es un valor legitimo</b> —la obligacion anual, la que no se divide
 * en cuotas; {@link ClaveDeSaldo} lo documenta—, asi que la fila mala es indistinguible de una
 * buena: la deuda existe, la cifra es la correcta, y lo unico que cambia es a que cuota se imputa.
 * Se descubre cuando alguien paga y el abono no cancela lo que creia.
 *
 * <p>De las dos salidas que #538 ofrecia se toma <b>la primera</b>, que el rango exista, por dos
 * motivos. Uno, es lo que la pantalla necesita: rechazar el campo dejaria la unica pantalla que da
 * de alta deuda a mano sin poder hacer lo que el manual dibuja. Y dos, la otra salida no es local:
 * el silencio no lo produce este {@code record} sino la configuracion de Jackson, y endurecerla
 * cambia el borde de las <b>102</b> operaciones con cuerpo del contrato a la vez —una decision que
 * #539 tiene abierta para las lecturas y que no se toma de paso (#538 AC 3 lo dice con esas
 * palabras)—.
 *
 * <h2>Las tres formas de decir que cuota, y ninguna se adivina</h2>
 *
 * <ul>
 *   <li>ni {@code cuota} ni rango: la obligacion <b>anual</b>, {@code periodo = 0}, que es lo que
 *       significaba y sigue significando;
 *   <li>{@code cuota}: esa sola, como antes de #538;
 *   <li>{@code cuotaDesde} y {@code cuotaHasta}: las dos incluidas, un asiento por cuota.
 * </ul>
 *
 * <p>Media pregunta es media pregunta y se contesta con 422: solo {@code cuotaDesde}, el rango
 * invertido, uno fuera de 1..12, o {@code cuota} <b>y</b> el rango a la vez. Ese ultimo caso no se
 * resuelve por precedencia a proposito: elegir uno de los dos en silencio seria exactamente el
 * defecto que este issue cierra, con otro nombre.
 *
 * <p><b>El desglose se repite en cada cuota</b>, no se reparte entre ellas: ver {@link
 * MovimientoDeDeuda#enCadaCuota}. Lo que queda pendiente y no es del backend es que la pantalla lo
 * diga: el rotulo del manual es «Insoluto (S/)» a secas junto a «Cuota desde» y «Cuota hasta», y no
 * dice si esa cifra es la del ano o la de cada cuota. Quien porte la pantalla (#574) tiene que
 * rotularlo, porque las dos lecturas son plausibles y se diferencian en un factor {@code n}.
 *
 * <h2>La baja lee sus tres datos tambien de la consulta (#425)</h2>
 *
 * <p>El contrato declara {@code codContribuyente}, {@code tributo} y {@code ano} <b>de consulta</b>
 * en {@code POST /rentas/deuda/bajas} —son los tres filtros que la pantalla {@code baja_deuda}
 * dibuja—, y hasta #425 el controlador los leia solo del cuerpo. De las nueve operaciones con ese
 * desajuste esta era <b>la unica conectada</b>, y funcionaba porque en #332 fue la interfaz la que
 * se adapto: {@code escrituras.ts} los manda dentro de la tabla {@code cuotas}, aplanada.
 *
 * <p>Por eso la correccion <b>no toca la pantalla</b>: gana el cuerpo, asi que la peticion que
 * {@code baja_deuda} manda hoy sigue produciendo exactamente el mismo movimiento. Lo que cambia es
 * que ahora tambien se puede llamar como el contrato promete. La alternativa —mover los tres a la
 * URL en la interfaz— habria roto la unica cosa que ya funcionaba para arreglar lo que solo paga
 * quien lee el YAML.
 *
 * <p>El alta <b>no</b> cambia: {@code POST /rentas/deuda/altas} no declara ningun parametro de
 * consulta en el contrato, porque su pantalla no dibuja filtros. Es el mismo cuerpo y el mismo
 * metodo privado, y por eso los tres entran hasta {@link #registrar} como argumentos y no leidos
 * dos veces.
 */
@RestController
@RequestMapping(Api.RAIZ + "/rentas/deuda")
public class MovimientosDeDeudaController {

    private final RegistrarMovimientoDeDeuda movimientos;
    private final ConsultasDelLibro consulta;
    private final Clock reloj;

    public MovimientosDeDeudaController(
            RegistrarMovimientoDeDeuda movimientos, ConsultasDelLibro consulta, Clock reloj) {
        this.movimientos = movimientos;
        this.consulta = consulta;
        this.reloj = reloj;
    }

    @PostMapping("/altas")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "alta_deuda", privilegio = Privilegio.REGISTRO)
    public MovimientoDeDeudaResource alta(@RequestBody PeticionDeMovimiento peticion) {
        return registrar(SentidoDelMovimiento.ALTA, peticion, DeLaConsulta.NINGUNO);
    }

    @PostMapping("/bajas")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiereAcceso(acceso = "baja_deuda", privilegio = Privilegio.REGISTRO)
    public MovimientoDeDeudaResource baja(
            @RequestParam(required = false) @Nullable String codContribuyente,
            @RequestParam(required = false) @Nullable String tributo,
            @RequestParam(required = false) @Nullable String ano,
            @RequestBody PeticionDeMovimiento peticion) {
        return registrar(
                SentidoDelMovimiento.BAJA,
                peticion,
                new DeLaConsulta(codContribuyente, tributo, ano));
    }

    // ------------------------------------------------------------------

    /**
     * Los tres datos que la consulta puede traer, ya reunidos.
     *
     * <p>El alta pasa {@link #NINGUNO} porque su operacion no los declara en el contrato: asi el
     * metodo comun no tiene que preguntarse de que ruta viene.
     */
    private record DeLaConsulta(
            @Nullable String codContribuyente, @Nullable String tributo, @Nullable String ano) {

        static final DeLaConsulta NINGUNO = new DeLaConsulta(null, null, null);
    }

    private MovimientoDeDeudaResource registrar(
            SentidoDelMovimiento sentido,
            PeticionDeMovimiento peticion,
            DeLaConsulta deLaConsulta) {

        Observacion observacion = observacionDe(peticion.observacion());
        String codigoContribuyente =
                exigir(
                        FiltroDeLaConsulta.primeroNoVacio(
                                peticion.codContribuyente(), deLaConsulta.codContribuyente()),
                        "codContribuyente");
        long contribuyenteId = contribuyenteDe(codigoContribuyente);

        RangoDeCuotas cuotas;
        MovimientoDeDeuda movimiento;
        // El mismo `catch` cubre las dos: el rango y la clave comprueban sus invariantes con
        // IllegalArgumentException —son dominio, y el dominio no conoce HTTP— y aqui se
        // traducen a 422. `cuotasDe` lanza ademas su propio ProblemaDeNegocio para poder
        // NOMBRAR el campo que esta mal, que es lo que un 422 tiene que decir.
        try {
            cuotas = cuotasDe(peticion);
            movimiento =
                    new MovimientoDeDeuda(
                            sentido,
                            new ClaveDeSaldo(
                                    contribuyenteId,
                                    exigir(
                                            FiltroDeLaConsulta.primeroNoVacio(
                                                    peticion.tributo(), deLaConsulta.tributo()),
                                            "tributo"),
                                    new Ejercicio(
                                            entero(
                                                    FiltroDeLaConsulta.primeroNoVacio(
                                                            peticion.ano(), deLaConsulta.ano()),
                                                    "ano")),
                                    cuotas.desde(),
                                    peticion.predioId(),
                                    peticion.vehiculoId()),
                            importe(peticion.insoluto(), "insoluto"),
                            importe(peticion.reajuste(), "reajuste"),
                            importe(peticion.interes(), "interes"),
                            importe(peticion.gasto(), "gasto"),
                            faseDe(peticion.fase()),
                            fechaDe(peticion.fechaValor()),
                            exigir(peticion.documentoOrigen(), "documentoOrigen"),
                            peticion.referenciaExterna());
        } catch (IllegalArgumentException invalido) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(invalido));
        }

        RegistrarMovimientoDeDeuda.Registro registro;
        try {
            registro =
                    Boolean.TRUE.equals(peticion.repartir())
                            ? movimientos.registrarRepartido(
                                    movimiento,
                                    declaraSusCuotas(peticion) ? cuotas : null,
                                    comprobacionDe(peticion),
                                    codigoContribuyente,
                                    observacion)
                            : movimientos.registrar(
                                    movimiento,
                                    cuotas,
                                    comprobacionDe(peticion),
                                    codigoContribuyente,
                                    observacion);
        } catch (RegistrarMovimientoDeDeuda.BajaMayorQueLaDeuda excede) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(excede));
        } catch (RegistrarMovimientoDeDeuda.UnidadAjena ajena) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, mensajeDe(ajena));
        }
        return MovimientoDeDeudaResource.de(
                sentido.name(), registro.asientos(), registro.numeroDeDocumento());
    }

    /**
     * Si hay que comprobar que la unidad sea del contribuyente, o si la peticion lo declara (#635).
     *
     * <p>Aqui <b>siempre</b> se comprueba: quien registra un alta o una baja desde ventanilla dice
     * a quien y sobre que, y una unidad que no es suya deja el cargo sobre una clave que ninguna
     * consulta va a mirar. Lo unico que la peticion puede hacer es <b>declarar</b> que la deuda es
     * de un titular anterior —lo que ocurre de verdad con la deuda de un ejercicio previo a una
     * transferencia—, y entonces se admite y <b>la declaracion queda escrita en la fila del
     * libro</b>: {@code cuenta_corriente_asiento.unidad_de_titular_anterior} (V71, #653), y de ahi
     * en la fila de auditoria del asiento. No se compone dentro del texto de la observacion: esa es
     * del usuario (regla 10).
     */
    private static RegistrarMovimientoDeDeuda.ComprobacionDeUnidad comprobacionDe(
            PeticionDeMovimiento peticion) {
        return Boolean.TRUE.equals(peticion.deudaDeTitularAnterior())
                ? RegistrarMovimientoDeDeuda.ComprobacionDeUnidad.DECLARADA_DE_TITULAR_ANTERIOR
                : RegistrarMovimientoDeDeuda.ComprobacionDeUnidad.EXIGIDA;
    }

    /**
     * Si la peticion dijo <b>ella</b> que cuotas cubre, o si lo dejo abierto (#598).
     *
     * <p>Hace falta porque {@link #cuotasDe} devuelve {@link RangoDeCuotas#ANUAL} en los dos casos
     * —«cuota 0» y «sin cuota»— y con {@code repartir} no significan lo mismo: sin cuota, el acto
     * cubre <b>la fila entera</b>, que es lo que la pantalla necesita y lo unico que se puede
     * expresar cuando el grupo empieza en la obligacion anual.
     */
    private static boolean declaraSusCuotas(PeticionDeMovimiento peticion) {
        return peticion.cuota() != null
                || peticion.cuotaDesde() != null
                || peticion.cuotaHasta() != null;
    }

    /**
     * Que cuotas abarca el acto, dicho por la peticion y nunca adivinado (#538).
     *
     * <p>El {@code 0} entra por «sin cuota» y no por el rango: es la obligacion anual, no la cuota
     * cero, asi que {@code cuotaDesde: 0} se rechaza nombrandolo en vez de asentar una obligacion
     * distinta de la que se pidio —que es el defecto entero de este issue—.
     */
    private static RangoDeCuotas cuotasDe(PeticionDeMovimiento peticion) {
        Integer cuota = peticion.cuota();
        Integer desde = peticion.cuotaDesde();
        Integer hasta = peticion.cuotaHasta();

        if (desde == null && hasta == null) {
            return cuota == null ? RangoDeCuotas.ANUAL : RangoDeCuotas.deUnaSola(cuota);
        }
        if (cuota != null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Llegaron 'cuota' y 'cuotaDesde'/'cuotaHasta' a la vez, y dicen cosas"
                            + " distintas: se manda la cuota sola o el rango, no los dos");
        }
        if (desde == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Falta el campo 'cuotaDesde': con 'cuotaHasta' solo no se sabe donde empieza"
                            + " el rango");
        }
        if (hasta == null) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "Falta el campo 'cuotaHasta': con 'cuotaDesde' solo no se sabe donde acaba el"
                            + " rango");
        }
        if (desde == 0) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'cuotaDesde' no puede ser 0: 0 es la obligacion anual —la que no se"
                            + " divide en cuotas— y se pide sin cuota, no como principio de un"
                            + " rango");
        }
        if (desde > hasta) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo 'cuotaDesde' ("
                            + desde
                            + ") es mayor que 'cuotaHasta' ("
                            + hasta
                            + "): el rango va de la primera cuota a la ultima");
        }
        exigirQueSeaUnaCuota(desde, "cuotaDesde");
        exigirQueSeaUnaCuota(hasta, "cuotaHasta");
        return new RangoDeCuotas(desde, hasta);
    }

    private static void exigirQueSeaUnaCuota(int valor, String campo) {
        if (valor < 1 || valor > ClaveDeSaldo.PERIODO_MAXIMO) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El campo '"
                            + campo
                            + "' esta fuera de rango: "
                            + valor
                            + ". Una cuota va de 1 a "
                            + ClaveDeSaldo.PERIODO_MAXIMO);
        }
    }

    private long contribuyenteDe(String codigo) {
        return consulta.contribuyentePorCodigo(codigo.strip().toUpperCase(Locale.ROOT))
                .orElseThrow(
                        () ->
                                new ProblemaDeNegocio(
                                        CodigoDeError.NO_ENCONTRADO,
                                        "No hay ningun contribuyente con ese codigo"));
    }

    private static Observacion observacionDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
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

    /** Ausente o en blanco es cero: una parte del desglose que este movimiento no toca. */
    private static Dinero importe(@Nullable String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            return Dinero.CERO;
        }
        try {
            return new Dinero(new BigDecimal(texto.strip()));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo '" + campo + "' no es un importe valido");
        }
    }

    private static Fase faseDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return Fase.ORDINARIA;
        }
        try {
            return Fase.valueOf(texto.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException desconocida) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "Fase desconocida: '" + texto + "'");
        }
    }

    /** Sin fecha, la de hoy del reloj inyectado; nunca {@code LocalDate.now()} suelto (regla 6). */
    private LocalDate fechaDe(@Nullable String texto) {
        if (texto == null || texto.isBlank()) {
            return LocalDate.now(reloj);
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (DateTimeParseException malFormada) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "La fecha va en formato AAAA-MM-DD: '" + texto + "'");
        }
    }

    private static int entero(@Nullable String texto, String campo) {
        try {
            return Integer.parseInt(exigir(texto, campo));
        } catch (NumberFormatException noEsNumero) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION, "El campo '" + campo + "' no es un numero");
        }
    }

    private static String exigir(@Nullable String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "Falta el campo '" + campo + "'");
        }
        return valor.strip();
    }

    private static String mensajeDe(RuntimeException excepcion) {
        String mensaje = excepcion.getMessage();
        return mensaje == null ? "El valor recibido no es valido" : mensaje;
    }

    /**
     * El cuerpo de un alta o una baja. <b>Lista blanca</b>: lo que no esta aqui no entra.
     *
     * <p>Los importes viajan como texto y no como numero a proposito: un {@code double} en el JSON
     * pierde centimos antes de llegar (regla 1), y aceptarlo como {@code BigDecimal} directo
     * dejaria que Jackson decidiera el formato en vez de rechazarlo con un mensaje que se entienda.
     *
     * <p>{@code cuota} y el par {@code cuotaDesde}/{@code cuotaHasta} son <b>excluyentes</b>: ver
     * {@link #cuotasDe}. Los tres se declaran aqui —y no dos de ellos fuera— porque lo que la lista
     * blanca protege es que nada entre sin declararse; lo que no puede hacer es distinguir «este
     * campo no existe» de «este campo existe y se descarta», y esa es exactamente la diferencia que
     * dejaba los asientos en {@code periodo = 0} sin que nada lo dijera (#538).
     */
    public record PeticionDeMovimiento(
            @Nullable String observacion,
            @Nullable String codContribuyente,
            @Nullable String tributo,
            @Nullable String ano,
            @Nullable Integer cuota,
            @Nullable Integer cuotaDesde,
            @Nullable Integer cuotaHasta,
            @Nullable Boolean repartir,
            @Nullable Boolean deudaDeTitularAnterior,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            @Nullable String insoluto,
            @Nullable String reajuste,
            @Nullable String interes,
            @Nullable String gasto,
            @Nullable String fase,
            @Nullable String fechaValor,
            @Nullable String documentoOrigen,
            @Nullable String referenciaExterna) {}
}
