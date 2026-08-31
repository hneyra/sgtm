import { describe, expect, it } from 'vitest';
import { paginadoDe } from './recursos';

/**
 * `PapeletaResource` real (V4, `PapeletaController`), letra por letra: sirve
 * tanto a `papeletasTransito()` como a `adminEstadoCuenta()` — la familia es
 * lo unico que distingue una papeleta de transito de una administrativa, y
 * las dos publican exactamente estos veinte campos.
 *
 * Sin este guardia, un campo que el `Resource` no tiene —`licenciaConducir`
 * fue el caso: ni `PapeletaResource` ni `Papeleta` lo modelan— pasa sin que
 * nada lo note, porque el proxy no valida contra ningun esquema (#379, esta
 * pasada).
 */
const CAMPOS_DE_PAPELETA_RESOURCE = new Set([
  'id',
  'familia',
  'numero',
  'fechaInfraccion',
  'horaInfraccion',
  'lugar',
  'placa',
  'vehiculoId',
  'infractorId',
  'propietarioId',
  'contribuyenteId',
  'predioId',
  'notificacionPreviaId',
  'baseImponible',
  'porcentajeInfraccion',
  'importeInfraccion',
  'porcentajeACobrar',
  'importeAPagar',
  'importeConBeneficio',
  'estado',
  'usuarioRegistro',
]);

describe('las papeletas del mock solo publican campos de PapeletaResource', () => {
  it.each([
    ['/api/v1/transito/papeletas', 'de transito'],
    ['/api/v1/infracciones/administrativas/estado-cuenta', 'administrativas'],
  ])('%s (%s)', (ruta) => {
    const paginado = paginadoDe('GET', ruta);
    expect(paginado).not.toBeNull();
    expect(paginado?.contenido.length).toBeGreaterThan(0);
    for (const fila of paginado?.contenido ?? []) {
      // En las DOS direcciones: ninguna clave sobra Y las veinte estan todas.
      // La primera version solo miraba lo que sobraba, asi que quitarle un
      // campo al mock —`predioId`— dejaba las pruebas en verde (adversaria
      // de #379).
      const claves = Object.keys(fila);
      for (const clave of claves) {
        expect(CAMPOS_DE_PAPELETA_RESOURCE.has(clave)).toBe(true);
      }
      expect(new Set(claves).size).toBe(CAMPOS_DE_PAPELETA_RESOURCE.size);
    }
  });
});
