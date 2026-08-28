import { describe, expect, it } from 'vitest';
import {
  LOS_TRES_FILTROS_DEL_PADRON,
  documentoDe,
  identidadPorCodigo,
  identidadesQueCoinciden,
} from './identidad';

/**
 * **La fila del padron que de verdad se pidio** (#298, ADR-0016 §3).
 *
 * Lo que se lee aqui lo dibujan las dos aplicaciones —la ficha 360° de
 * ventanilla y el portal del contribuyente—, y en las dos la consecuencia de
 * equivocarse es la misma: ensenarle a alguien la deuda de otra persona. El
 * proxy de datos no filtra y devuelve el padron entero (ADR-0010), y un filtro
 * del backend que un dia se relaje produce exactamente el mismo destrozo sin que
 * nada se ponga rojo.
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

describe('coincide, o no coincide: no se parece', () => {
  it('la fila cuyo campo es igual a lo buscado', () => {
    const coinciden = identidadesQueCoinciden(padron(RUFINA, OTRO), 'codigo', '00000025673');

    expect(coinciden).toHaveLength(1);
    expect(coinciden[0]?.nombre).toBe('SUC. RUFINA MEDINA MEDINA');
  });

  it('**un prefijo de un codigo real no es ese codigo**', () => {
    /* Es la comparacion que el backend hace —`codigo_contribuyente = :codigo`,
       igualdad exacta— y la que aqui no puede aflojarse: con «empieza por», el
       codigo `0000002` tecleado en el portal le abriria a quien lo escriba la
       deuda de `00000025673`, que es de otra persona. Y no seria un error
       visible: la pantalla ensena un nombre y unas cifras que existen. */
    expect(identidadesQueCoinciden(padron(RUFINA, OTRO), 'codigo', '0000002')).toEqual([]);
    // Ni por el otro extremo, ni por el medio.
    expect(identidadesQueCoinciden(padron(RUFINA), 'codigo', '25673')).toEqual([]);
    expect(identidadesQueCoinciden(padron(RUFINA), 'dNI', '0359')).toEqual([]);
  });

  it('mayusculas no, espacios de sobra tampoco', () => {
    // El backend sube el criterio a mayusculas, asi que aqui no pueden dejar de
    // ser la misma persona.
    expect(
      identidadesQueCoinciden(padron({ ...RUFINA, codigo: '25673A' }), 'codigo', ' 25673a '),
    ).toHaveLength(1);
  });

  it('sin nada que buscar no coincide nadie', () => {
    // Un filtro vacio devolveria el padron entero, y de ahi saldria «la primera».
    expect(identidadesQueCoinciden(padron(RUFINA, OTRO), 'codigo', '   ')).toEqual([]);
  });

  it('el DNI y el RUC se comparan contra `numeroDocumento`, que es lo que el recurso publica', () => {
    expect(identidadesQueCoinciden(padron(RUFINA, OTRO), 'dNI', '03593174')).toHaveLength(1);
    expect(identidadesQueCoinciden(padron(RUFINA, OTRO), 'rUC', '20100066603')).toHaveLength(1);
    // Y no se mira el `tipoDocumento`: el numero ya los separa, y una diferencia
    // de rotulo —«DNI», «02 — DNI»— se convertiria en «esa persona no existe».
    expect(
      identidadesQueCoinciden(padron({ ...RUFINA, tipoDocumento: '02 — DNI' }), 'dNI', '03593174'),
    ).toHaveLength(1);
  });

  it('devuelve **todas** las que coinciden, no la primera', () => {
    /* Ninguna, una y varias son tres respuestas distintas, y quien llama las
       dice de tres maneras: con dos filas al mismo numero, el portal manda a
       ventanilla en vez de elegir. */
    const coinciden = identidadesQueCoinciden(
      padron(RUFINA, { ...OTRO, numeroDocumento: '03593174' }),
      'dNI',
      '03593174',
    );

    expect(coinciden).toHaveLength(2);
  });
});

describe('lo que se lee de una fila', () => {
  it('el codigo, cuando la fila no lo trae, es el guion y no una cadena vacia', () => {
    /* Y de eso depende que no salga `?contribuyente=—`: quien pregunta por la
       deuda compara contra `SIN_DATO`, no contra la cadena vacia. */
    const [sinCodigo] = identidadesQueCoinciden(
      padron({ nombreRazonSocial: 'ALGUIEN', numeroDocumento: '03593174' }),
      'dNI',
      '03593174',
    );

    expect(sinCodigo?.codigo).toBe('—');
  });

  it('el documento se escribe igual en las dos aplicaciones', () => {
    expect(documentoDe(identidadesQueCoinciden(padron(RUFINA), 'codigo', RUFINA.codigo)[0])).toBe(
      'DNI 03593174',
    );
    expect(documentoDe(undefined)).toBe('—');
  });

  it('`identidadPorCodigo` devuelve null cuando ninguna coincide, no la primera', () => {
    expect(identidadPorCodigo(padron(RUFINA, OTRO), '00000000000')).toBeNull();
    expect(identidadPorCodigo(padron(RUFINA, OTRO), '00000099999')?.nombre).toBe('JUAN PEREZ');
  });
});

describe('las claves del padron salen del contrato', () => {
  it('los tres filtros siguen publicados', () => {
    /* Esta linea no comprueba nada **en ejecucion**: lo que comprueba es que el
       archivo compile. `LOS_TRES_FILTROS_DEL_PADRON` esta tipado como
       `'codigo' | 'dNI' | 'rUC' extends ClaveDelPadron ? true : never`, y
       `ClaveDelPadron` sale por `Extract` de los parametros que el contrato
       declara para `GET /rentas/contribuyentes`. Si el contrato renombrara uno,
       el tipo pasa a `never` y `tsc` se para aqui. */
    expect(LOS_TRES_FILTROS_DEL_PADRON).toBe(true);
  });
});
