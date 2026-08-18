package pe.gob.sgtm.verificaciones.muestras.infraestructura;

import pe.gob.sgtm.auditoria.AuditoriaService;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Caso de uso de muestra que <b>viola a proposito</b> la regla 10: escribe la observacion como
 * literal dentro del propio metodo, en vez de recibirla como argumento de quien hizo el cambio.
 *
 * <p>ADR-0008 exige que la observacion la escriba el usuario en el momento del cambio. {@code
 * Observacion.de("actualizacion masiva")} compila y pasa la validacion del tipo —tiene mas de cinco
 * caracteres—, y esa es la trampa: nada distingue en tiempo de compilacion una observacion real de
 * esta, escrita una sola vez por quien programo el metodo y repetida despues en cada llamada como
 * si cada usuario la hubiera escrito.
 *
 * <p>Existe por el mismo motivo que {@link MuestraDeRepositorioQueBorra}: una regla que no puede
 * fallar no protege nada. Vive en {@code src/test} a proposito —el escaner solo recorre {@code
 * src/main}—, asi que no puede romper el build por accidente. La revisa {@link
 * pe.gob.sgtm.verificaciones.ProhibicionesEnElCodigoFuenteTest} leyendo este archivo del disco.
 */
@SuppressWarnings("unused")
public class MuestraDeEscrituraSinObservacion {

    private final AuditoriaService auditoria;

    public MuestraDeEscrituraSinObservacion(AuditoriaService auditoria) {
        this.auditoria = auditoria;
    }

    /**
     * Un caso de uso real recibiria la observacion como parametro de este metodo. Este la escribe a
     * mano, y por eso el escaner lo detecta.
     */
    void actualizarViaSinPedirleAlUsuarioElPorque(long id) {
        auditoria.registrar(
                new RegistroDeAuditoria(
                        "via",
                        Long.toString(id),
                        Operacion.MODIFICACION,
                        Observacion.de("actualizacion masiva"),
                        null,
                        null));
    }
}
