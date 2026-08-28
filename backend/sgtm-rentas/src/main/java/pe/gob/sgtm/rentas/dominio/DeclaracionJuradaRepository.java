package pe.gob.sgtm.rentas.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Las declaraciones juradas. Ningun metodo recibe la municipalidad (regla 2).
 *
 * <p><b>No hay {@code eliminar}.</b> {@link #insertar} es el unico punto de alta; {@link
 * #marcarSustituida} es el unico {@code UPDATE}, y toca solo {@code estado} —nunca el numero, la
 * fecha ni el tipo—. Una rectificatoria es otra fila, nunca una edicion (regla 4).
 */
public interface DeclaracionJuradaRepository {

    Optional<DeclaracionJurada> findById(long id);

    /** Por numero y ejercicio, que es como la busca quien atiende (contrato de {@code djNro}). */
    Optional<DeclaracionJurada> porNumero(String numero, Ejercicio ejercicio);

    /**
     * Las declaraciones presentadas por un contribuyente, de la mas reciente a la mas antigua,
     * paginadas (#25, RF-046).
     *
     * <p>Existe para la pestaña de declaraciones juradas de la consulta unificada, que es la unica
     * pantalla que pregunta «que ha declarado esta persona» en vez de «que dice la declaracion
     * numero tal». Se apoya en {@code dj_contribuyente_ix} (V2), que ya indexa exactamente esta
     * pregunta.
     *
     * <p>Trae <b>todas</b>, incluidas las {@code SUSTITUIDA}s por una rectificatoria: una
     * declaracion sustituida no desaparece del expediente, y esconderla dejaria sin explicar por
     * que la vigente dice lo que dice. Cada fila lleva su estado.
     */
    Pagina<DeclaracionJurada> deContribuyente(long contribuyenteId, Paginacion paginacion);

    /**
     * Las declaraciones <b>vigentes</b> de esos predios en ese ejercicio, para {@link
     * pe.gob.sgtm.rentas.DeclaracionesDelEjercicio} (#49, RF-055).
     *
     * <p>Vigente es {@code PRESENTADA} u {@code OBSERVADA}: una {@code SUSTITUIDA} por una
     * rectificatoria no es lo que el contribuyente declara hoy, y compararla contra lo hallado
     * acusaria de subvaluacion a quien ya corrigio. Una {@code ANULADA} tampoco cuenta.
     *
     * <p>Por lote y no una por una: la deteccion de omisos recorre paginas del padron, y preguntar
     * predio a predio seria una consulta por fila. Se apoya en {@code dj_ejercicio_predio_ix}
     * (V39), que indexa exactamente esta pregunta.
     *
     * <p>Los predios sin declaracion no aparecen en la lista devuelta.
     */
    java.util.List<DeclaracionJurada> vigentesDePredios(
            java.util.Collection<Long> predioIds, Ejercicio ejercicio);

    /**
     * Cuales de esos predios estan <b>conciliados</b> con el padron de rentas en ese ejercicio
     * (ADR-0015 §1, #344).
     *
     * <p>El predicado, entero: un predio esta conciliado a un ejercicio cuando existe una
     * declaracion jurada de ese ejercicio, con {@code predio_id} igual al del predio, en estado
     * {@code PRESENTADA} u {@code OBSERVADA} ({@link EstadoDeDeclaracion#nombresDeLasVigentes()}).
     *
     * <p><b>Por {@code predio_id}, nunca por {@code ficha_catastral_id}.</b> La segunda columna
     * (V19) es <i>nullable</i> por diseño —«nulo si el predio no tiene ficha registrada todavia, o
     * si el tipo no es predial»—, su clave foranea va {@code NOT VALID} y toda fila anterior a V19
     * la tiene nula: derivar de ella produce <b>falsos omisos</b>, o sea acusar de omiso a quien
     * declaro. {@code ficha_catastral_id} contesta otra pregunta —«que version declaro»—, que es
     * detalle de la declaracion y no predicado de pertenencia al padron afecto.
     *
     * <p>Devuelve <b>identificadores de predio</b> y no declaraciones: quien pregunta por la
     * conciliacion no tiene por que recibir el numero de la DJ, su tipo, sus importes ni quien la
     * presento (ADR-0015 §2.2). Y devuelve un conjunto, asi que un predio con dos declaraciones
     * vigentes —o una sustituida y su rectificatoria— aparece <b>una vez</b>, no dos.
     *
     * <p>Los predios sin declaracion no aparecen en el conjunto devuelto.
     */
    java.util.Set<Long> prediosConDeclaracionVigente(
            java.util.Collection<Long> predioIds, Ejercicio ejercicio);

    /** Inserta la declaracion y devuelve la fila guardada, con su {@code id} y su usuario. */
    DeclaracionJurada insertar(DeclaracionJurada declaracion);

    /** Dobla la fila a {@code SUSTITUIDA}: el unico {@code UPDATE}, y solo toca el estado. */
    DeclaracionJurada marcarSustituida(long id);
}
