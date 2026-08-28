package pe.gob.sgtm.catastro;

import java.time.LocalDate;
import java.util.List;

/**
 * Quien es titular de un predio a una fecha, publicado para otros contextos acotados (ADR-0015
 * §2.4, #366).
 *
 * <p>Vive en el paquete raiz por lo mismo que los demas puertos de este modulo: Spring Modulith
 * trata como interno todo lo que esta en un subpaquete.
 *
 * <h2>Para que existe</h2>
 *
 * <p>Para que la fila de la consulta de fichas pueda <b>enlazar</b> con la ficha de su titular. La
 * grilla muestra el nombre y nada mas —{@link FichaDelPadron} no lleva identificador a proposito—,
 * asi que hoy el operador salta al padron y busca por nombre, con la homonimia que eso invita. La
 * resolucion se hace al clic, de un predio cada vez, con permiso del padron y con rastro: es la
 * opcion (b) de #366, y ADR-0015 §2.4 dice por que no es un campo mas del listado.
 *
 * <p>Este puerto es la mitad de catastro de esa resolucion. La otra mitad —el codigo y el nombre
 * del contribuyente— es de {@code contribuyentes}, y quien las junta es {@code rentas}: es el unico
 * de los tres que puede depender de los otros dos sin cerrar un ciclo, porque {@code catastro} ya
 * depende de {@code contribuyentes} y {@code contribuyentes} no depende de nadie (ARQ-01 §2). El
 * patron es el de {@code ConsultaPrediosController} y el de {@code ConsultaDeConciliacion}.
 *
 * <p>Es la inversa de {@link PrediosDelContribuyente}, que responde «que predios tiene esta
 * persona»: puertos pequenos, uno por pregunta.
 *
 * <h2>Lo que este puerto no da</h2>
 *
 * <p>No da la titularidad entera —ni sus fechas, ni el documento que la sustenta, ni el
 * identificador de la fila, que es lo que {@link GestorDeTitularidad} publica para quien transfiere
 * y aqui no hace falta—, no da nada del predio y no escribe.
 */
public interface TitularesDelPredio {

    /**
     * Las cuotas de titularidad <b>vigentes en esa fecha</b>. Vacia si el predio no tiene titular a
     * esa fecha.
     *
     * <p>La fecha entra como argumento y no se lee del reloj (regla 9): la titularidad de marzo no
     * es la de setiembre, y atender en 2029 una reclamacion de 2027 con el titular de hoy senala a
     * quien ya no era propietario.
     *
     * <p><b>Son varias, no una.</b> Un predio puede tener varios titulares a la vez —dos conyuges,
     * una sucesion, un condominio—, cada uno con su porcentaje, y devolver «el titular» obligaria a
     * elegir uno y a callar los demas. Los porcentajes vigentes no exceden 100 pero tampoco tienen
     * que sumarlo: la titularidad parcialmente identificada es un caso corriente del padron (DAT-01
     * §4.2).
     *
     * <p>Una lista vacia <b>no distingue</b> «el predio no existe» de «no tiene titular a esa
     * fecha», y es deliberado: bajo RLS un predio de otra municipalidad tampoco existe, y contestar
     * distinto en cada caso convertiria esta lectura en un detector de predios ajenos.
     */
    List<TitularDelPredio> de(long predioId, LocalDate fecha);
}
