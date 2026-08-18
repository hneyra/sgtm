/**
 * El mecanismo de auditoria obligatoria de ADR-0008: {@link pe.gob.sgtm.auditoria.AuditoriaService}
 * es el unico punto de entrada para escribir {@code auditoria}, y {@link
 * pe.gob.sgtm.auditoria.RegistroDeAuditoria} lleva siempre una {@link
 * pe.gob.sgtm.dominio.Observacion}: no hay forma de construirlo sin ella.
 *
 * <p>Vive en el modulo Gradle {@code sgtm-plataforma}, igual que {@code pe.gob.sgtm.persistencia},
 * y cuelga de {@code pe.gob.sgtm} y no de {@code pe.gob.sgtm.plataforma} por el mismo motivo: para
 * Spring Modulith un subpaquete es interno a su modulo, y este patron lo usan los doce contextos.
 * Se declara modulo compartido en {@code SgtmAplicacion}.
 */
@org.jspecify.annotations.NullMarked
package pe.gob.sgtm.auditoria;
