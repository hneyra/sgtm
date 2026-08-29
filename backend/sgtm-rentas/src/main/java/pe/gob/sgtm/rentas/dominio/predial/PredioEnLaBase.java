package pe.gob.sgtm.rentas.dominio.predial;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Porcentaje;

/**
 * Un predio tal como entra en la base del contribuyente, con lo que hace falta para explicarlo ante
 * una impugnacion: de donde es, para que se usa, que parte es de quien y cuanto puso (#395).
 *
 * <p>Es {@link DetalleDeterminacionPredio} —lo que se guarda— mas lo que identifica al predio ante
 * una persona —codigo, direccion, uso—, que vive en catastro y no se copia a rentas. Se compone al
 * leer y no se persiste: duplicar la direccion en {@code determinacion_predio_detalle} la dejaria
 * envejecer aparte de la del padron.
 *
 * <p><b>El porcentaje no se teclea.</b> Sale de {@code titularidad} a la fecha de calculo, que es
 * la unica fuente de quien es dueno de que parte. Es lo que impide que la base del contribuyente se
 * pueda inflar o desinflar desde la peticion.
 *
 * @param predioId el predio
 * @param codigoReferenciaCatastral como se le nombra en el padron
 * @param direccion donde esta
 * @param uso para que se usa segun la ficha vigente; nulo si el predio no tiene ficha
 * @param porcentajePropiedad la cuota del contribuyente sobre este predio, de {@code titularidad}
 * @param autovaluo el autovaluo declarado del predio (RT-010: terreno + construccion + obras)
 * @param valuoExonerado la parte del autovaluo que no esta afecta
 * @param baseImponiblePredio lo que este predio aporta a la base, ya ponderado por el porcentaje
 */
public record PredioEnLaBase(
        long predioId,
        String codigoReferenciaCatastral,
        String direccion,
        @Nullable String uso,
        Porcentaje porcentajePropiedad,
        Dinero autovaluo,
        Dinero valuoExonerado,
        Dinero baseImponiblePredio) {

    public PredioEnLaBase {
        if (predioId <= 0) {
            throw new IllegalArgumentException(
                    "El predio de la base tiene identificador: " + predioId);
        }
        Objects.requireNonNull(codigoReferenciaCatastral, "El predio necesita su codigo");
        Objects.requireNonNull(direccion, "El predio necesita su direccion");
        Objects.requireNonNull(porcentajePropiedad, "El predio necesita el % de propiedad");
        Objects.requireNonNull(autovaluo, "El predio necesita su autovaluo");
        Objects.requireNonNull(valuoExonerado, "El predio necesita su valuo exonerado");
        Objects.requireNonNull(baseImponiblePredio, "El predio necesita lo que aporta a la base");
        if (valuoExonerado.esNegativo()) {
            throw new IllegalArgumentException("El valuo exonerado no puede ser negativo");
        }
        if (valuoExonerado.esMayorQue(autovaluo)) {
            throw new IllegalArgumentException(
                    "El valuo exonerado del predio "
                            + predioId
                            + " ("
                            + valuoExonerado
                            + ") supera su autovaluo ("
                            + autovaluo
                            + "): la parte exonerada es una parte del autovaluo, no otra cifra");
        }
    }

    /** La parte del autovaluo que si esta afecta, antes de ponderar por el % de propiedad. */
    public Dinero valuoAfecto() {
        return autovaluo.menos(valuoExonerado);
    }

    /** El detalle que se guarda de este predio. */
    public DetalleDeterminacionPredio comoDetalle() {
        return DetalleDeterminacionPredio.nuevo(
                predioId, autovaluo, valuoExonerado, porcentajePropiedad, baseImponiblePredio);
    }
}
