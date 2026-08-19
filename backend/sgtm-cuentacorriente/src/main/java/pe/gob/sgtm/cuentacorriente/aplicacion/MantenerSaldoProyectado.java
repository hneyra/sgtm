package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Divergencia;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;

/**
 * El saldo proyectado: mantenerlo, reconstruirlo y conciliarlo (ADR-0006).
 *
 * <h2>Qué es y qué no</h2>
 *
 * <p>Es una <b>cache</b>. Existe porque recorrer el libro de un contribuyente cuesta mas que leer
 * un campo y la caja no puede esperar. <b>Si diverge del libro, manda el libro</b>, y las tres
 * operaciones de aqui salen de esa frase:
 *
 * <ul>
 *   <li>{@link #reconstruir} la rehace desde el libro;
 *   <li>{@link #conciliar} <b>reporta</b> las diferencias, y no las corrige.
 * </ul>
 *
 * <p>Mantenerla al dia <b>no esta aqui</b>: lo hace {@code RegistrarAsiento} llamando al
 * repositorio dentro de su propia transaccion. No es un caso de uso —nadie «proyecta un saldo» como
 * acto administrativo—, y ponerlo aqui obligaba a inventarle una observacion de usuario que el
 * asiento ya trae. La regla 10 lo detecto antes que la revision.
 *
 * <p>Que conciliar no repare es deliberado. Una cache que se arregla sola deja el saldo bien y el
 * defecto que lo desajusto vivo, para que vuelva a pasar el mes siguiente sin que nadie sepa
 * cuantas veces paso. Reparar es {@link #reconstruir}, y es un acto aparte.
 *
 * <p><b>Aqui no se calcula deuda.</b> El insoluto es una suma de asientos: aritmetica, no regla
 * tributaria. Actualizar a una fecha —interes, reajuste— es {@code deudaActualizadaA} y esta
 * bloqueada por D-02a. Proyectar aqui una cifra «actualizada» seria peor que no tenerla: quedaria
 * congelada en el instante en que se calculo, y el campo no dice de cuando es (regla 9).
 */
@Service
public class MantenerSaldoProyectado {

    /** Cuantos contribuyentes se reconstruyen por vuelta en el recorrido masivo. */
    private static final int BLOQUE = 200;

    private final SaldoRepository saldos;
    private final Auditoria auditoria;
    private final Clock reloj;

    public MantenerSaldoProyectado(SaldoRepository saldos, Auditoria auditoria, Clock reloj) {
        this.saldos = saldos;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** El saldo proyectado de un contribuyente, tal como esta. */
    @Transactional(readOnly = true)
    public List<SaldoProyectado> de(long contribuyenteId, Ejercicio ejercicio) {
        return saldos.deContribuyente(contribuyenteId, ejercicio);
    }

    /**
     * Compara la cache contra el libro y devuelve <b>lo que no cuadra</b>.
     *
     * <p>Devuelve la lista vacia cuando todo cuadra, y no un booleano: quien concilia necesita
     * saber en que claves y por cuanto, no si «hay algo».
     */
    @Transactional(readOnly = true)
    public List<Divergencia> conciliar(long contribuyenteId, Ejercicio ejercicio) {
        List<SaldoProyectado> proyectado = saldos.deContribuyente(contribuyenteId, ejercicio);
        List<SaldoProyectado> real = saldos.segunElLibro(contribuyenteId, ejercicio);
        List<Divergencia> divergencias = new ArrayList<>();

        for (SaldoProyectado verdad : real) {
            Dinero cache = importeDe(proyectado, verdad.clave());
            if (!cache.equals(verdad.insoluto())) {
                divergencias.add(new Divergencia(verdad.clave(), cache, verdad.insoluto()));
            }
        }
        // Y al reves: una clave que la cache tiene con importe y el libro ya no. Sin esta vuelta,
        // el saldo de una deuda cuyos asientos se reversaron seguiria cobrandose y la conciliacion
        // diria que todo esta bien.
        for (SaldoProyectado cache : proyectado) {
            if (cache.estaEnCero()) {
                continue;
            }
            boolean elLibroLaTiene =
                    real.stream().anyMatch(verdad -> verdad.clave().equals(cache.clave()));
            if (!elLibroLaTiene) {
                divergencias.add(new Divergencia(cache.clave(), cache.insoluto(), Dinero.CERO));
            }
        }
        return List.copyOf(divergencias);
    }

    /**
     * Rehace la cache de un contribuyente desde el libro.
     *
     * <p>Exige {@link Observacion} —regla 10— y no por formalismo: reconstruir cambia cifras que la
     * caja usa para cobrar, y lo hace sin que ningun asiento lo respalde. Quien lo manda tiene que
     * decir por que, y queda en la auditoria junto con cuantas claves se movieron. Sin eso, un
     * saldo que cambia de un dia para otro no tiene explicacion en ningun sitio.
     *
     * @return las claves cuyo importe cambio; vacia si la cache ya estaba bien
     */
    @Transactional
    public List<SaldoProyectado> reconstruir(
            long contribuyenteId, Ejercicio ejercicio, Observacion observacion) {
        List<SaldoProyectado> cambiados = saldos.reconstruir(contribuyenteId, ejercicio);

        if (!cambiados.isEmpty()) {
            auditoria.registrar(
                    RegistroDeAuditoria.enLaFechaDe(
                                    // La fecha del ACTO de reconstruir, no la del ejercicio que se
                                    // reconstruye: rehacer 2026 en 2027 ocurrio en 2027, y es en
                                    // esa particion donde alguien lo va a buscar.
                                    LocalDate.now(reloj),
                                    "saldo_proyectado",
                                    String.valueOf(contribuyenteId),
                                    Operacion.MODIFICACION,
                                    observacion)
                            .con(null, resumen(cambiados)));
        }
        return cambiados;
    }

    /** Sin datos personales: esto acaba en la columna JSON de la auditoria. */
    private static String resumen(List<SaldoProyectado> cambiados) {
        return "{\"clavesReconstruidas\":" + cambiados.size() + "}";
    }

    /**
     * Los contribuyentes con movimiento en el ejercicio, en bloques y en orden estable.
     *
     * <p>Es la mitad del recorrido masivo; la otra es {@link #reconstruir}, y van <b>por
     * separado</b> a proposito. Cada contribuyente se reconstruye en su propia transaccion: una
     * sola sobre el padron de una provincia mantendria los bloqueos abiertos durante horas, y si
     * falla al final no se ha reconstruido nada.
     *
     * <p>Y no hay aqui un metodo que haga las dos cosas, aunque seria comodo. Tendria que ser el
     * mismo objeto llamandose a si mismo, y una llamada interna <b>no pasa por el proxy</b> de
     * Spring: la lectura correria sin transaccion, sin {@code SET LOCAL}, y la politica RLS
     * fallaria con «unrecognized configuration parameter». Es como se descubrio.
     *
     * <p>El recorrido es <b>reanudable sin tabla de progreso</b>: va por identificador ascendente,
     * asi que reanudar es volver a pedir desde el ultimo que termino. Una tabla de progreso seria
     * un segundo estado que mantener sincronizado con el primero, y el primero ya es una cache.
     *
     * @param desdeExclusive el ultimo contribuyente terminado, o 0 para empezar
     */
    @Transactional(readOnly = true)
    public List<Long> conMovimiento(Ejercicio ejercicio, long desdeExclusive) {
        return saldos.contribuyentesConMovimiento(ejercicio, desdeExclusive, BLOQUE);
    }

    private static Dinero importeDe(List<SaldoProyectado> saldos, ClaveDeSaldo clave) {
        Optional<SaldoProyectado> hallado =
                saldos.stream().filter(saldo -> saldo.clave().equals(clave)).findFirst();
        return hallado.map(SaldoProyectado::insoluto).orElse(Dinero.CERO);
    }
}
