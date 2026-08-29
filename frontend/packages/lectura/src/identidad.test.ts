import { describe, expect, it } from 'vitest';
import { documentoDe, identidadPorCodigo } from './identidad';

/**
 * **La fila del padron que de verdad se pidio** (#297).
 *
 * La consecuencia de equivocarse es ensenarle a quien atiende la ficha de otra
 * persona. El proxy de datos no filtra y devuelve el padron entero (ADR-0010), y
 * un filtro del backend que un dia se relaje produce exactamente el mismo
 * destrozo sin que nada se ponga rojo.
 *
 * La guarda gemela del portal ya no esta aqui: con la sesion del ciudadano
 * (ADR-0020) no hay listado del padron que filtrar, y lo que se comprueba —que
 * la situacion que llego sea la de este token— vive en `situacion.test.ts`.
 */

const RUFINA = {
  codigo: '00000025673',
  nombreRazonSocial: 'SUC. RUFINA MEDINA MEDINA',
  tipoDocumento: 'DNI',
  numeroDocumento: '03593174',
  activo: true,
};

const OTRO = {
  codigo: '00000099999',
  nombreRazonSocial: 'JUAN PEREZ',
  tipoDocumento: 'RUC',
  numeroDocumento: '20100066603',
  activo: true,
};

const padron = (...filas: readonly unknown[]) => ({
  contenido: filas,
  pagina: 0,
  tamano: filas.length,
  totalElementos: filas.length,
  totalPaginas: 1,
  hayMas: false,
});

describe('lo que se lee de una fila', () => {
  it('el codigo, cuando la fila no lo trae, es el guion y no una cadena vacia', () => {
    /* De eso depende que ninguna pantalla pregunte por `?contribuyente=—`: quien
       usa el codigo compara contra `SIN_DATO`, no contra la cadena vacia. */
    const sinCodigo = identidadPorCodigo(
      padron({ codigo: '', nombreRazonSocial: 'ALGUIEN', numeroDocumento: '03593174' }),
      '',
    );

    expect(sinCodigo?.codigo).toBe('—');
  });

  it('el documento se escribe siempre igual', () => {
    expect(documentoDe(identidadPorCodigo(padron(RUFINA), RUFINA.codigo) ?? undefined)).toBe(
      'DNI 03593174',
    );
    expect(documentoDe(undefined)).toBe('—');
  });

  it('`identidadPorCodigo` devuelve null cuando ninguna coincide, no la primera', () => {
    expect(identidadPorCodigo(padron(RUFINA, OTRO), '00000000000')).toBeNull();
    expect(identidadPorCodigo(padron(RUFINA, OTRO), '00000099999')?.nombre).toBe('JUAN PEREZ');
  });
});
