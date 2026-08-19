package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * La cache del saldo insoluto. Ningun metodo recibe la municipalidad (regla 2).
 *
 * <p><b>No hay {@code borrar}.</b> {@code saldo_proyectado} esta en las tablas protegidas y sin
 * privilegio de {@code DELETE}: una clave que se queda sin asientos se pone en cero, no desaparece.
 * Es lo correcto y no una limitacion: una fila en cero dice «aqui hubo deuda y esta saldada», y su
 * ausencia no dice nada.
 */
public interface SaldoRepository {

    Optional<SaldoProyectado> de(ClaveDeSaldo clave);

    List<SaldoProyectado> deContribuyente(long contribuyenteId, Ejercicio ejercicio);

    /**
     * Aplica el efecto de un asiento sobre su clave, en la misma transaccion.
     *
     * <p>Es un {@code UPSERT} y no un «leer, decidir, escribir»: dos cajas cobrando a la vez sobre
     * el mismo contribuyente leerian el mismo saldo y una de las dos escribiria encima de la otra.
     * La suma la hace el motor sobre la fila bloqueada.
     */
    SaldoProyectado aplicar(Asiento asiento);

    /**
     * Lo que dice <b>el libro</b> para cada clave de un contribuyente: la verdad contra la que se
     * concilia.
     */
    List<SaldoProyectado> segunElLibro(long contribuyenteId, Ejercicio ejercicio);

    /**
     * Reescribe la cache de un contribuyente con lo que dice el libro.
     *
     * <p>Pone en cero las claves que la cache tiene y el libro ya no —no las borra— e inserta las
     * que el libro tiene y la cache no.
     *
     * @return las claves que cambiaron
     */
    List<SaldoProyectado> reconstruir(long contribuyenteId, Ejercicio ejercicio);

    /**
     * Los contribuyentes con movimiento en el ejercicio, en bloques y en orden estable.
     *
     * <p>En bloques porque la reconstruccion masiva no puede traerse el padron entero a memoria, y
     * en orden estable porque es lo que la hace <b>reanudable</b>: quien reanuda pasa el ultimo
     * identificador que termino y sigue por ahi. No hace falta ninguna tabla de progreso.
     */
    List<Long> contribuyentesConMovimiento(Ejercicio ejercicio, long desdeExclusive, int cuantos);
}
