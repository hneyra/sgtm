package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.PadronDeUnidades;
import pe.gob.sgtm.cuentacorriente.TitularidadDeLaUnidad;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Que la unidad de un alta o una baja de deuda sea del contribuyente del movimiento, o que quien
 * registra diga que no lo es (#635).
 *
 * <h2>Que estaba mal</h2>
 *
 * <p>{@code POST /rentas/deuda/altas} y {@code .../bajas} identifican la obligacion con {@code
 * predioId} y {@code vehiculoId}, y hasta este issue <b>nadie los miraba</b>: el controlador los
 * copiaba a {@code ClaveDeSaldo} y el caso de uso los copiaba al asiento. Un alta sobre el vehiculo
 * de otra persona respondia <b>201</b>, con su importe correcto y su nota de abono emitida.
 *
 * <p>Y no se ve en ninguna cifra. {@code ClaveDeSaldo} compara por igualdad exacta, asi que esa
 * obligacion queda en una clave que nadie mira: no sale en la ficha del vehiculo —que es la de su
 * titular—, no se suma a la deuda sin unidad del obligado, y el estado de cuenta la publica como
 * una fila mas. Es el defecto que #430 documento para la caja —«dinero recibido y aplicado a otra
 * deuda, sin que ninguna cifra parezca mal»— por el lado del cargo. Peor todavia con un
 * identificador que no existe: la clave queda apuntando a nada y ninguna consulta lo delata.
 *
 * <h2>Las tres respuestas, y por que son tres y no dos</h2>
 *
 * <ul>
 *   <li>La unidad <b>no esta en el padron</b>: 422 nombrandola. No hay declaracion que lo arregle
 *       —declarar que la unidad es de otro no hace que exista— y por eso se comprueba antes que
 *       nada.
 *   <li>La unidad <b>es de otro</b> y no se dijo: 422 nombrando al titular a la fecha valor. Es la
 *       unica de las tres que se puede confundir con un acto legitimo, y por eso se explica como
 *       declararla.
 *   <li>La unidad <b>es de otro</b> y se dijo: se registra, y la {@link Observacion} que llega al
 *       libro lleva la nota que lo dice. La deuda de un ejercicio anterior a una transferencia es
 *       del titular de entonces (RF-030), asi que este caso <b>tiene</b> que poder registrarse; lo
 *       que no puede es quedar indistinguible de un alta normal.
 * </ul>
 *
 * <h2>Por que aqui y no en el controlador</h2>
 *
 * <p>Porque necesita transaccion. La resolucion de la titularidad es una lectura de la base, y sin
 * transaccion no se emite el {@code SET LOCAL app.municipalidad_id}: la politica RLS no devuelve
 * vacio, <b>revienta</b> con «invalid input syntax for type bigint: ""» (#486). Es el mismo motivo
 * por el que {@link ConsultasDelLibro#contribuyentePorCodigo} existe, y por el que un controlador
 * no sostiene un repositorio.
 *
 * <p>Y no dentro de {@link RegistrarMovimientoDeDeuda}: alli entran tambien los cargos que otros
 * contextos generan por su cuenta —una multa administrativa asienta el cargo <b>con</b> el {@code
 * predioId} de la papeleta y el obligado puede ser el infractor, no el titular—, y esta regla es de
 * las dos pantallas de alta y baja, no del libro entero.
 *
 * <p>La {@link Observacion} viaja para poder devolverla compuesta, no para escribir nada: este
 * metodo es {@code readOnly} y no toca una fila.
 */
@Service
public class ComprobarLaUnidadDelMovimiento {

    /**
     * Cuantos titulares se nombran en el mensaje y en la nota.
     *
     * <p>Tres, porque los casos corrientes —propietario unico, dos conyuges, una sucesion corta— se
     * dicen enteros, y un condominio largo no puede empujar la {@link Observacion} fuera de sus 500
     * caracteres.
     */
    private static final int TITULARES_QUE_SE_NOMBRAN = 3;

    private final PadronDeUnidades padron;

    public ComprobarLaUnidadDelMovimiento(PadronDeUnidades padron) {
        this.padron = padron;
    }

    /**
     * Comprueba las unidades que trae el movimiento y devuelve la observacion que debe llegar al
     * libro.
     *
     * <p>Sin unidad no comprueba nada y devuelve la misma observacion: la obligacion sin predio ni
     * vehiculo es legitima —es la anual del contribuyente— y este issue no la toca.
     *
     * @param contribuyenteId el obligado del movimiento, ya resuelto
     * @param codigoContribuyente su codigo, que es como se le nombra en el mensaje
     * @param predioId la unidad predial, si la hay
     * @param vehiculoId la unidad vehicular, si la hay
     * @param fechaValor la fecha a la que se resuelve la titularidad; nunca el reloj (regla 9)
     * @param deOtroTitular si la peticion declaro que la unidad es de otro titular
     * @param observacion la del usuario (regla 10)
     * @return la del usuario, o la del usuario con la nota que deja constancia del titular ajeno
     */
    @Transactional(readOnly = true)
    public Observacion exigirQueSeaDelObligado(
            long contribuyenteId,
            String codigoContribuyente,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            LocalDate fechaValor,
            boolean deOtroTitular,
            Observacion observacion) {

        List<String> notas = new ArrayList<>();
        if (predioId != null) {
            comprobar(
                    "predio",
                    predioId,
                    padron.predio(predioId, fechaValor),
                    " al " + fechaValor,
                    contribuyenteId,
                    codigoContribuyente,
                    deOtroTitular,
                    notas);
        }
        if (vehiculoId != null) {
            comprobar(
                    "vehiculo",
                    vehiculoId,
                    padron.vehiculo(vehiculoId, fechaValor),
                    " hoy —el padron vehicular no guarda de quien era en otra fecha—",
                    contribuyenteId,
                    codigoContribuyente,
                    deOtroTitular,
                    notas);
        }
        return notas.isEmpty() ? observacion : conLaNota(observacion, notas);
    }

    // ------------------------------------------------------------------

    private static void comprobar(
            String queEs,
            long unidadId,
            TitularidadDeLaUnidad titularidad,
            String cuando,
            long contribuyenteId,
            String codigoContribuyente,
            boolean deOtroTitular,
            List<String> notas) {

        if (!titularidad.existeEnElPadron()) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El "
                            + queEs
                            + " "
                            + unidadId
                            + " no esta en el padron de esta municipalidad: una obligacion no se"
                            + " identifica con una unidad que no apunta a nada");
        }
        if (titularidad.esDe(contribuyenteId)) {
            return;
        }
        String aNombreDe =
                titularidad.titulares().isEmpty()
                        ? "no figura a nombre de nadie" + cuando
                        : "figura a nombre de "
                                + titularidad.nombrarlos(TITULARES_QUE_SE_NOMBRAN)
                                + cuando;
        if (!deOtroTitular) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "El "
                            + queEs
                            + " "
                            + unidadId
                            + " no es del contribuyente "
                            + codigoContribuyente
                            + ": "
                            + aNombreDe
                            + ". Si la deuda es de un titular anterior, mandalo con"
                            + " 'unidadDeOtroTitular': true y explicalo en la observacion");
        }
        notas.add("titular ajeno declarado: el " + queEs + " " + unidadId + " " + aNombreDe);
    }

    /**
     * La observacion del usuario con la nota delante.
     *
     * <p>Delante y no detras porque es lo que hace la fila <b>distinguible</b>: el {@code motivo}
     * del asiento y la fila de auditoria se leen desde el principio, y una nota al final de un
     * texto largo no se ve. Y la del usuario se conserva entera: si no cabe, no se recorta ninguna
     * de las dos, se pide acortar la suya — recortar en silencio la explicacion de quien registra
     * seria perder justo lo que la regla 10 existe para guardar.
     */
    private static Observacion conLaNota(Observacion observacion, List<String> notas) {
        String nota = "[" + String.join(" · ", notas) + "] ";
        String compuesta = nota + observacion.texto();
        if (compuesta.length() > Observacion.LARGO_MAXIMO) {
            throw new ProblemaDeNegocio(
                    CodigoDeError.VALIDACION,
                    "La observacion no cabe junto a la nota que deja constancia del titular ajeno ("
                            + nota.length()
                            + " caracteres): acortala a "
                            + (Observacion.LARGO_MAXIMO - nota.length())
                            + " como mucho");
        }
        return Observacion.de(compuesta);
    }
}
