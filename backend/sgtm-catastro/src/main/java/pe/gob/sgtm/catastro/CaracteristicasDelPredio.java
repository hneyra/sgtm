package pe.gob.sgtm.catastro;

import org.jspecify.annotations.Nullable;

/**
 * Lo que otro contexto necesita saber de un predio para determinar arbitrios (#31), publicado desde
 * este contexto (ARQ-01 §4).
 *
 * <p>No es {@link pe.gob.sgtm.catastro.dominio.Predio} ni {@link
 * pe.gob.sgtm.catastro.dominio.FichaCatastral}: arbitrios no necesita el area, las construcciones
 * ni el estado del padron, solo estas dos claves para buscar la tasa parametrizada por sector y
 * uso.
 *
 * @param uso el de la ficha {@code UNICA} vigente a la fecha consultada; {@code null} si el predio
 *     no tiene ficha vigente esa fecha
 * @param sectorCodigo el codigo del sector del predio; {@code null} si el predio no tiene sector
 *     asignado
 */
public record CaracteristicasDelPredio(@Nullable String uso, @Nullable String sectorCodigo) {}
