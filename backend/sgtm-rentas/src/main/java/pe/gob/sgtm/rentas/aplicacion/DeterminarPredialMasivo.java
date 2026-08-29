package pe.gob.sgtm.rentas.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import pe.gob.sgtm.catastro.CaracteristicasDelPredio;
import pe.gob.sgtm.catastro.LectorDeCaracteristicas;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.dominio.EstadoDeDeterminacion;
import pe.gob.sgtm.rentas.dominio.predial.DetalleDeterminacionPredio;
import pe.gob.sgtm.rentas.dominio.predial.DeterminacionPredialCalculada;

/**
 * La emision anual del predial: recorre el padron ya declarado del ejercicio y vuelve a determinar
 * a cada contribuyente con el conjunto sellado de hoy (#395, {@code POST
 * /rentas/predial/calculo-masivo}).
 *
 * <h2>Que padron recorre, y por que ese</h2>
 *
 * <p>El de los contribuyentes que <b>ya tienen una determinacion del ejercicio</b>, o sea aquellos
 * cuyos predios tienen autovaluo declarado. No es una limitacion de esta corrida sino la unica
 * lectura honesta que existe: el sistema no sabe valorizar un predio todavia (D-11, GOB-03), asi
 * que un contribuyente sin autovaluo declarado no se puede determinar ni de uno en uno ni en lote,
 * y la corrida lo dice en vez de emitir una cifra baja.
 *
 * <p><b>Y no arrastra el autovaluo de un ejercicio a otro.</b> Tomar el del ano pasado seria
 * aplicar en silencio un {@code % actualizacion} de cero, que es justo el factor que D-11 deja sin
 * fuente y que NEG-05 §0.1 advierte que <b>multiplica</b> importes: omitirlo no es neutro. Los
 * autovaluos que la corrida usa son los del <b>mismo</b> ejercicio.
 *
 * <h2>Lo que si cambia al recalcular</h2>
 *
 * <p>El conjunto sellado —de ahi salen la UIT, los tramos, el minimo, el derecho de emision y el
 * cronograma— y el <b>porcentaje de propiedad</b>, que se vuelve a leer de {@code titularidad} a la
 * fecha de la corrida: una transferencia posterior a la primera determinacion cambia quien paga que
 * parte, y congelarlo dejaria cobrando al que ya vendio.
 *
 * <h2>Una transaccion por contribuyente</h2>
 *
 * <p>Esta clase <b>no</b> abre transaccion. Cada determinacion abre la suya al entrar en {@link
 * RegistrarDeterminacionPredial}, que es lo que hace que el contribuyente que falla no se lleve por
 * delante al siguiente. Envolver el bucle —con {@code @Transactional} o con un solo {@code
 * TransactionTemplate}— es el defecto que #328 y #247 §2 documentan: la fila rechazada marca la
 * transaccion como <i>rollback-only</i> y la corrida entera revienta al confirmarla, informe
 * incluido. La lectura del padron, que si necesita transaccion para que RLS funcione, vive en
 * {@link PadronPredialDelEjercicio}.
 */
@Service
public class DeterminarPredialMasivo {

    /** Todo el padron declarado del ejercicio. */
    public static final String ALCANCE_TODOS = "TODOS";

    /** Solo los contribuyentes con al menos un predio en el sector indicado. */
    public static final String ALCANCE_SECTOR = "SECTOR";

    private final PadronPredialDelEjercicio padron;
    private final DeterminarPredial individual;
    private final DirectorioDeContribuyentes directorio;
    private final LectorDeCaracteristicas caracteristicas;
    private final Clock reloj;

    public DeterminarPredialMasivo(
            PadronPredialDelEjercicio padron,
            DeterminarPredial individual,
            DirectorioDeContribuyentes directorio,
            LectorDeCaracteristicas caracteristicas,
            Clock reloj) {
        this.padron = padron;
        this.individual = individual;
        this.directorio = directorio;
        this.caracteristicas = caracteristicas;
        this.reloj = reloj;
    }

    /**
     * Corre la emision del ejercicio.
     *
     * @param peticion que se recalcula y con que alcance
     * @param observacion por que (regla 10); queda en cada determinacion que la corrida asiente
     */
    public Corrida ejecutar(Peticion peticion, Observacion observacion) {
        Objects.requireNonNull(peticion, "Hace falta la peticion");
        Objects.requireNonNull(observacion, "Toda modificacion exige la observacion (regla 10)");

        LocalDate hoy = LocalDate.now(reloj);
        List<PadronPredialDelEjercicio.DeterminacionConDetalle> declarados =
                padron.ultimasDe(peticion.ejercicio());

        List<Observado> observados = new ArrayList<>();
        List<DeterminacionPredialCalculada> determinadas = new ArrayList<>();
        Dinero emitido = Dinero.CERO;
        String conjunto = "";

        Map<Long, ResumenDeContribuyente> nombres =
                directorio.porIds(
                        declarados.stream()
                                .map(fila -> fila.cabecera().contribuyenteId())
                                .collect(java.util.stream.Collectors.toSet()));

        for (PadronPredialDelEjercicio.DeterminacionConDetalle fila : declarados) {
            long contribuyenteId = fila.cabecera().contribuyenteId();
            ResumenDeContribuyente quien = nombres.get(contribuyenteId);
            String codigo = quien == null ? String.valueOf(contribuyenteId) : quien.codigo();
            String nombre = quien == null ? "" : quien.nombre();

            if (!peticion.recalculaYaEmitidos()
                    && fila.cabecera().estado() == EstadoDeDeterminacion.EMITIDA) {
                observados.add(
                        new Observado(
                                codigo,
                                nombre,
                                "Su determinacion del ejercicio ya esta EMITIDA. Recalcularla"
                                        + " crearia otra (ADR-0007) y dejaria dos valores en"
                                        + " circulacion por el mismo tributo; marcar «recalcula ya"
                                        + " emitidos» es decir que eso es lo que se quiere"));
                continue;
            }
            if (quien == null) {
                observados.add(
                        new Observado(
                                codigo,
                                nombre,
                                "Tiene determinacion del ejercicio y no esta en el padron de"
                                        + " contribuyentes: no se puede saber a nombre de quien"
                                        + " emitirla"));
                continue;
            }
            if (!enElAlcance(fila.detalle(), peticion, hoy)) {
                continue;
            }

            List<DeterminarPredial.PredioDeclarado> autovaluos = new ArrayList<>();
            for (DetalleDeterminacionPredio detalle : fila.detalle()) {
                autovaluos.add(
                        new DeterminarPredial.PredioDeclarado(
                                detalle.predioId(), detalle.autovaluo(), detalle.valuoExonerado()));
            }

            try {
                DeterminacionPredialCalculada calculada =
                        individual.determinar(
                                new DeterminarPredial.Peticion(
                                        peticion.ejercicio(),
                                        quien.codigo(),
                                        autovaluos,
                                        peticion.modalidad(),
                                        peticion.simulacion()),
                                observacion);
                determinadas.add(calculada);
                emitido = emitido.mas(calculada.totalAPagar());
                conjunto = calculada.nombreDelConjunto();
            } catch (DeterminarPredial.PredioSinAutovaluo
                    | DeterminarPredial.SinPrediosEnElPadron
                    | DeterminarPredial.PredioAjeno motivo) {
                // El padron cambio entre la primera determinacion y esta corrida: un predio nuevo
                // sin declarar, o uno que ya no es suyo. Se observa y la corrida sigue: es
                // exactamente lo que la pantalla llama «contribuyentes observados que quedan fuera
                // de la emision».
                observados.add(new Observado(codigo, nombre, String.valueOf(motivo.getMessage())));
            } catch (CuadroPredialParametrizado.ParametroDelPredialAusente falta) {
                // Esta le pasa a TODOS por igual —es del conjunto, no del contribuyente—, asi que
                // no se observa uno por uno: se corta la corrida. Observar 30 000 veces la misma
                // ordenanza que falta esconde el unico dato util del informe.
                throw falta;
            } catch (ParametrosSellados.ParametroAusente falta) {
                throw falta;
            }
        }

        return new Corrida(
                peticion.ejercicio(),
                peticion.alcance(),
                peticion.simulacion(),
                conjunto,
                determinadas.size(),
                emitido,
                List.copyOf(observados),
                hoy);
    }

    /**
     * Si el contribuyente entra en el alcance: con {@link #ALCANCE_SECTOR}, basta que uno de sus
     * predios este en el sector pedido.
     *
     * <p>Se determina igual sobre <b>todos</b> sus predios, tambien los de otros sectores: la base
     * es del contribuyente (NEG-05 §1) y recortarla al sector produciria el mismo error a la baja
     * que calcular predio por predio. El sector elige a quien se emite, no que se le cobra.
     */
    private boolean enElAlcance(
            List<DetalleDeterminacionPredio> detalle, Peticion peticion, LocalDate hoy) {
        String sector = peticion.sector();
        if (!ALCANCE_SECTOR.equals(peticion.alcance()) || sector == null) {
            return true;
        }
        for (DetalleDeterminacionPredio predio : detalle) {
            String suyo =
                    caracteristicas
                            .de(predio.predioId(), hoy)
                            .map(CaracteristicasDelPredio::sectorCodigo)
                            .orElse(null);
            if (sector.equalsIgnoreCase(suyo)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lo que se pide correr.
     *
     * @param ejercicio el ejercicio que se recalcula
     * @param alcance {@link #ALCANCE_TODOS} o {@link #ALCANCE_SECTOR}
     * @param sector obligatorio con {@link #ALCANCE_SECTOR}
     * @param modalidad el cronograma que se aplica a las cuotas
     * @param recalculaYaEmitidos si tambien entran los que ya tienen su determinacion emitida
     * @param simulacion si la corrida no guarda ninguna determinacion
     */
    public record Peticion(
            Ejercicio ejercicio,
            String alcance,
            @Nullable String sector,
            String modalidad,
            boolean recalculaYaEmitidos,
            boolean simulacion) {

        public Peticion {
            Objects.requireNonNull(ejercicio, "La corrida necesita su ejercicio");
            alcance =
                    alcance == null || alcance.isBlank()
                            ? ALCANCE_TODOS
                            : alcance.strip().toUpperCase(Locale.ROOT);
            if (!ALCANCE_TODOS.equals(alcance) && !ALCANCE_SECTOR.equals(alcance)) {
                throw new IllegalArgumentException(
                        "Alcance desconocido: '"
                                + alcance
                                + "'. Se admite «"
                                + ALCANCE_TODOS
                                + "» y «"
                                + ALCANCE_SECTOR
                                + "»");
            }
            sector = sector == null || sector.isBlank() ? null : sector.strip();
            if (ALCANCE_SECTOR.equals(alcance) && sector == null) {
                throw new IllegalArgumentException(
                        "El alcance por sector necesita decir que sector: sin el, «solo el sector»"
                                + " y «todo el padron» serian la misma corrida");
            }
            modalidad =
                    modalidad == null || modalidad.isBlank()
                            ? DeterminarPredial.MODALIDAD_TRIMESTRAL
                            : modalidad.strip().toUpperCase(Locale.ROOT);
        }
    }

    /**
     * Lo que la corrida hizo.
     *
     * @param ejercicio el ejercicio recalculado
     * @param alcance con que alcance
     * @param simulacion si no guardo nada
     * @param nombreDelConjunto el conjunto sellado con que se calculo; vacio si no se determino
     *     nada
     * @param determinados cuantos contribuyentes se determinaron
     * @param montoEmitido la suma de lo determinado, impuesto mas derecho de emision
     * @param observados los que quedaron fuera, cada uno con su motivo
     * @param fechaCalculo el dia al que corresponde la corrida (regla 9)
     */
    public record Corrida(
            Ejercicio ejercicio,
            String alcance,
            boolean simulacion,
            String nombreDelConjunto,
            int determinados,
            Dinero montoEmitido,
            List<Observado> observados,
            LocalDate fechaCalculo) {

        public Corrida {
            Objects.requireNonNull(ejercicio, "La corrida necesita su ejercicio");
            Objects.requireNonNull(alcance, "La corrida necesita su alcance");
            Objects.requireNonNull(nombreDelConjunto, "La corrida necesita su conjunto");
            Objects.requireNonNull(montoEmitido, "La corrida necesita lo que emitio");
            observados =
                    List.copyOf(
                            Objects.requireNonNull(observados, "La lista es vacia," + " no nula"));
            Objects.requireNonNull(
                    fechaCalculo, "Toda cifra dice a que fecha esta calculada (regla 9)");
        }

        /** Cuantos contribuyentes miro la corrida en total. */
        public int leidos() {
            return determinados + observados.size();
        }
    }

    /**
     * Un contribuyente que queda fuera de la emision, y por que.
     *
     * <p>El motivo va en la respuesta y no en un registro que nadie mira: la pantalla lo llama «Ver
     * observados» y es lo unico que convierte una corrida que emitio menos de lo esperado en una
     * lista de cosas que arreglar.
     */
    public record Observado(String codContribuyente, String nombre, String motivo) {

        public Observado {
            Objects.requireNonNull(codContribuyente, "El observado necesita su codigo");
            Objects.requireNonNull(nombre, "El observado necesita su nombre, aunque sea vacio");
            Objects.requireNonNull(motivo, "Un observado sin motivo no se puede arreglar");
        }
    }
}
