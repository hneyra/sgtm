package pe.gob.sgtm.sanciones.aplicacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.sanciones.PapeletasSinNotificar;
import pe.gob.sgtm.sanciones.dominio.CriterioDePadron;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.PadronDePapeletasRepository;
import pe.gob.sgtm.sanciones.dominio.RecuentoDelPadron;

/**
 * Lo que {@code sanciones} le contesta al panel de trabajo parado (#549).
 *
 * <p>Una sola linea de negocio, y esta escrita en el criterio: las papeletas de <b>transito</b>
 * ({@link Familia#TRANSITO}) <b>sin valor emitido</b> y <b>todavia exigibles</b>. El porque de que
 * no sea {@code estado = IMPUESTA} esta en el javadoc del puerto, y se midio: ningun codigo de
 * produccion escribe {@code NOTIFICADA}, asi que ese estado no distingue lo que su nombre promete.
 *
 * <p>{@code soloPendientes} deja fuera las {@code PAGADA}, {@code ANULADA} y {@code PRESCRITA}: una
 * papeleta pagada no es trabajo parado, es trabajo hecho, y una anulada no es trabajo.
 *
 * <p>La familia no es opcional a proposito ({@code CriterioDePadron} lo exige): sin ella el
 * recuento mezclaria las actas administrativas, que son otro procedimiento con otro plazo y otra
 * pantalla, y la cifra saldria mas grande sin que nada la delatara.
 *
 * <p>{@code @Transactional(readOnly = true)} porque sin transaccion no hay {@code SET LOCAL} y la
 * politica RLS no puede evaluar {@code app.municipalidad_id}: la consulta <b>falla</b> (#486). Se
 * une a la del llamador cuando la hay —{@code REQUIRED} es la propagacion por omision—, que es lo
 * que hace que los frentes del panel salgan todos de la misma foto.
 */
@Service
public class PapeletasSinNotificarSanciones implements PapeletasSinNotificar {

    private final PadronDePapeletasRepository padron;

    public PapeletasSinNotificarSanciones(PadronDePapeletasRepository padron) {
        this.padron = padron;
    }

    @Override
    @Transactional(readOnly = true)
    public PapeletasImpuestas sinNotificar() {
        RecuentoDelPadron recuento =
                padron.contar(
                        new CriterioDePadron(
                                Familia.TRANSITO,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                Boolean.FALSE,
                                true));
        return new PapeletasImpuestas(recuento.cuantas(), recuento.importe());
    }
}
