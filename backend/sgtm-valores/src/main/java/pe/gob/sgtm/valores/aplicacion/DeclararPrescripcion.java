package pe.gob.sgtm.valores.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Plazo;
import pe.gob.sgtm.valores.dominio.CausalDePrescripcion;
import pe.gob.sgtm.valores.dominio.ComputoDeEjercicio;
import pe.gob.sgtm.valores.dominio.ComputoDePrescripcion;
import pe.gob.sgtm.valores.dominio.EstadoDeValor;
import pe.gob.sgtm.valores.dominio.HechoDelComputo;
import pe.gob.sgtm.valores.dominio.Prescripcion;
import pe.gob.sgtm.valores.dominio.PrescripcionRepository;
import pe.gob.sgtm.valores.dominio.ResultadoDeLaSolicitud;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorRepository;

/**
 * Declara la prescripcion de la accion de cobro (#39, RF-094).
 *
 * <h2>No borra la deuda: la marca</h2>
 *
 * <p>No hay una sola sentencia contra {@code cuenta_corriente_asiento} en este camino, ni un {@code
 * DELETE} en ninguna parte (regla 4). Lo que queda es el acto —la fila de {@code prescripcion} con
 * su computo y sus hechos— y el estado {@link EstadoDeValor#PRESCRITO} en los valores alcanzados.
 * El libro conserva sus asientos: el dia que alguien pregunte por que dejo de cobrarse, la
 * respuesta es esta fila, y la deuda sigue estando donde estaba.
 *
 * <h2>Ejercicio por ejercicio</h2>
 *
 * <p>La solicitud pide un rango y lo normal es que los primeros ejercicios hayan prescrito y los
 * ultimos no: por eso el computo se resuelve uno a uno y el resultado puede ser {@link
 * ResultadoDeLaSolicitud#PROCEDE_EN_PARTE}. Resolver el rango entero con un si o un no obligaria a
 * redondear hacia el contribuyente —extinguiendo deuda viva— o hacia la municipalidad —cobrando lo
 * prescrito—.
 *
 * <h2>El plazo y el inicio salen del parametro, no del codigo</h2>
 *
 * <p>Los dos: cuantos anios dura (art. 43, segun la causal) y desde cuando se cuenta (art. 44,
 * segun el tributo). {@link PlazosParametrizados} los lee del conjunto sellado vigente a la fecha
 * de presentacion —la fecha del hecho—, y el identificador de ese conjunto queda en la fila, para
 * que revisar la resolucion dentro de dos anios no resuelva otro plazo (ARQ-09 §3).
 */
@Service
public class DeclararPrescripcion {

    private final PrescripcionRepository repositorio;
    private final ValorRepository valores;
    private final PlazosParametrizados plazos;
    private final Auditoria auditoria;

    public DeclararPrescripcion(
            PrescripcionRepository repositorio,
            ValorRepository valores,
            PlazosParametrizados plazos,
            Auditoria auditoria) {
        this.repositorio = repositorio;
        this.valores = valores;
        this.plazos = plazos;
        this.auditoria = auditoria;
    }

    /**
     * Resuelve la solicitud y deja el acto.
     *
     * @param contribuyenteId quien solicita; ya resuelto por quien llama
     * @param tributo sobre que tributo
     * @param ejercicioDesde primero del rango solicitado
     * @param ejercicioHasta ultimo del rango solicitado
     * @param fechaPresentacion cuando se presento; es la fecha a la que se resuelve el computo y de
     *     la que sale el conjunto de parametros, no "hoy"
     * @param causal cual de los tres plazos del art. 43 aplica
     * @param hechos las interrupciones y suspensiones alegadas; puede ir vacia
     * @param resolucion el numero de la resolucion, si ya se emitio
     * @param observacion por que se declara (regla 10)
     */
    @Transactional
    public Prescripcion declarar(
            long contribuyenteId,
            String tributo,
            Ejercicio ejercicioDesde,
            Ejercicio ejercicioHasta,
            LocalDate fechaPresentacion,
            CausalDePrescripcion causal,
            List<HechoDelComputo> hechos,
            @Nullable String resolucion,
            Observacion observacion) {

        if (ejercicioDesde.compareTo(ejercicioHasta) > 0) {
            throw new RangoInvertido(ejercicioDesde, ejercicioHasta);
        }

        PlazosParametrizados.Vigentes vigentes = plazos.aLaFechaDe(fechaPresentacion);
        Plazo plazo = vigentes.paraPrescribir(causal);
        Plazo desfase = vigentes.inicioDelComputo(tributo);

        List<ComputoDeEjercicio> computos = new ArrayList<>();
        int prescritos = 0;
        for (int anio = ejercicioDesde.valor(); anio <= ejercicioHasta.valor(); anio++) {
            Ejercicio ejercicio = new Ejercicio(anio);
            ComputoDePrescripcion.Computo computo =
                    ComputoDePrescripcion.resolver(
                            inicioDelComputo(ejercicio, desfase), plazo, hechos, fechaPresentacion);
            if (computo.prescrita()) {
                prescritos++;
            }
            computos.add(ComputoDeEjercicio.nuevo(ejercicio, computo));
        }

        Prescripcion guardada =
                repositorio.insertar(
                        new Prescripcion(
                                null,
                                contribuyenteId,
                                tributo,
                                ejercicioDesde,
                                ejercicioHasta,
                                fechaPresentacion,
                                causal,
                                plazo,
                                vigentes.conjuntoId(),
                                ResultadoDeLaSolicitud.de(prescritos, computos.size()),
                                resolucion,
                                computos,
                                hechos,
                                null,
                                observacion));

        marcarLosValoresAlcanzados(guardada);
        auditar(guardada, observacion);
        return guardada;
    }

    // ------------------------------------------------------------------

    /**
     * El dia 1 del computo: el 1 de enero del ejercicio mas el desfase parametrizado (art. 44).
     *
     * <p>El desfase es un plazo en anios porque el art. 44 lo expresa asi —"desde el uno (1) de
     * enero del anio siguiente a la fecha en que vence el plazo para la presentacion de la
     * declaracion anual respectiva"—, y cuantos anios sean depende de cuando vence esa declaracion,
     * que es distinto por tributo. Por eso entra por parametro y no como un uno compilado.
     */
    private static LocalDate inicioDelComputo(Ejercicio ejercicio, Plazo desfase) {
        return LocalDate.of(ejercicio.valor(), 1, 1).plusYears(desfase.cantidad());
    }

    /**
     * Marca {@code PRESCRITO} lo que la declaracion alcanza.
     *
     * <p>Solo los valores cobrables: uno ya pagado o anulado no tiene accion de cobro que
     * prescriba, y sobreescribir su estado borraria el dato de que se pago.
     */
    private void marcarLosValoresAlcanzados(Prescripcion prescripcion) {
        for (Ejercicio ejercicio : prescripcion.ejerciciosPrescritos()) {
            for (Valor valor :
                    valores.cobrablesDe(
                            prescripcion.contribuyenteId(), prescripcion.tributo(), ejercicio)) {
                Long id = valor.id();
                if (id != null) {
                    valores.cambiarEstado(id, EstadoDeValor.PRESCRITO);
                }
            }
        }
    }

    private void auditar(Prescripcion prescripcion, Observacion observacion) {
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                prescripcion.fechaPresentacion(),
                                "prescripcion",
                                String.valueOf(prescripcion.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(prescripcion)));
    }

    /** Sin datos personales: esto acaba en la columna JSON de la auditoria. */
    private static String descripcion(Prescripcion prescripcion) {
        return "{\"tributo\":\""
                + prescripcion.tributo()
                + "\",\"desde\":"
                + prescripcion.ejercicioDesde().valor()
                + ",\"hasta\":"
                + prescripcion.ejercicioHasta().valor()
                + ",\"causal\":\""
                + prescripcion.causal()
                + "\",\"plazo\":\""
                + prescripcion.plazo()
                + "\",\"resultado\":\""
                + prescripcion.resultado()
                + "\",\"prescritos\":"
                + prescripcion.ejerciciosPrescritos().size()
                + "}";
    }

    /** El rango de ejercicios va al reves. */
    public static final class RangoInvertido extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        RangoInvertido(Ejercicio desde, Ejercicio hasta) {
            super("El rango de ejercicios va de menor a mayor: " + desde + " a " + hasta);
        }
    }
}
