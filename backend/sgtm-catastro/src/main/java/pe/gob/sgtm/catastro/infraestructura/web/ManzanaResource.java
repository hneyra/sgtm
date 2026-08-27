package pe.gob.sgtm.catastro.infraestructura.web;

import pe.gob.sgtm.catastro.dominio.Manzana;

/**
 * Una manzana, tal como sale por HTTP. Campos en español {@code camelCase} (ARQ-04 §3).
 *
 * <p>Publica el {@code sectorId} y no el codigo de su sector: quien la pidio ya conoce ese codigo
 * —va en la ruta— y releerlo para devolverlo seria un viaje a la base para repetirle al cliente lo
 * que acaba de escribir.
 */
public record ManzanaResource(long id, long sectorId, String codigo) {

    public static ManzanaResource de(Manzana manzana) {
        return new ManzanaResource(
                manzana.id() == null ? 0L : manzana.id(), manzana.sectorId(), manzana.codigo());
    }
}
