package pe.gob.sgtm.auditoria;

/**
 * Las siete operaciones que admite {@code auditoria.operacion} (V5, {@code auditoria_pk} y su
 * {@code CHECK}). El enum y el {@code CHECK} tienen que coincidir en los siete nombres: si algun
 * dia se agrega un valor aqui sin agregarlo a la migracion, el {@code INSERT} lo rechaza en la
 * base, que es el fallo ruidoso correcto.
 */
public enum Operacion {

    /** Alta de un registro nuevo. */
    ALTA,

    /** Modificacion de un registro existente. */
    MODIFICACION,

    /** Baja logica: {@code activo = false}, nunca {@code DELETE} (regla 4). */
    BAJA,

    /** Anulacion de un acto administrativo ya emitido (recibo, valor, papeleta). */
    ANULACION,

    /** Reversion de un asiento del libro contable, con otro asiento (ADR-0006). */
    REVERSION,

    /**
     * Cambio de permisos, grupos, miembros o usuarios (ADR-0008 §5). Sin esta operacion, quien
     * administra la seguridad seria el unico capaz de alterar su propia pista.
     */
    PERMISO,

    /** Acceso a informacion sensible que en si mismo merece quedar registrado. */
    ACCESO
}
