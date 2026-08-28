package pe.gob.sgtm.catastro;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * El padrón de predios con su titular vigente, publicado para otros contextos acotados (ARQ-01 §4,
 * #49).
 *
 * <p>Es la cuarta API pública de este módulo, después de {@link LectorDeFichas}, {@link
 * PrediosDelContribuyente} y {@link LectorDeCaracteristicas}. Vive en el paquete raíz por lo mismo
 * que las otras tres: Spring Modulith trata como interno todo lo que está en un subpaquete.
 *
 * <h2>Para qué existe</h2>
 *
 * <p>Para la detección de omisos de {@code fiscalizacion} (RF-055): «contribuyentes con predio en
 * catastro pero sin declaración en rentas». Esa pregunta se responde recorriendo el padrón, y
 * {@link PrediosDelContribuyente} responde la contraria —los predios de <b>uno</b>—, que obligaría
 * a conocer de antemano a quién preguntar.
 *
 * <p>Sin este puerto la única salida habría sido que {@code fiscalizacion} consultara {@code
 * predio} y {@code titularidad} directamente, cruzando el límite del contexto.
 *
 * <h2>Paginado, y no podía ser de otra manera</h2>
 *
 * <p>Un padrón son decenas de miles de predios. {@link PrediosDelContribuyente} devuelve una lista
 * porque los de una persona nunca son muchos; esto devuelve una {@link Pagina} porque son todos.
 */
public interface PadronDePredios {

    /**
     * Los predios del padrón activos, con el titular que rige en esa fecha, paginados.
     *
     * <p>Solo predios <b>activos</b>: un predio dado de baja no genera obligación, así que marcarlo
     * como omiso sería abrir una fiscalización sobre algo que ya no existe.
     *
     * <p>Un predio <b>sin titular vigente</b> a esa fecha no sale. No es un descuido: la fila de
     * omisos es «este contribuyente no declaró», y sin titular no hay a quién imputarlo. Un predio
     * sin titularidad es un defecto del padrón, y su sitio es el saneamiento catastral, no una
     * esquela.
     *
     * @param sectorCodigo filtro opcional por sector; {@code null} trae el padrón entero
     * @param aLaFecha a qué día se resuelven la titularidad y la ficha vigente (regla 9)
     */
    Pagina<PredioDelPadron> porSector(
            @Nullable String sectorCodigo, LocalDate aLaFecha, Paginacion paginacion);
}
