import { describe, expect, it } from 'vitest';
import { esLaSituacionDe, leerSituacion } from './situacion';

/**
 * **La situacion que de verdad se pidio** (#57, ADR-0020).
 *
 * Es la heredera de `identidad.test.ts` en su mitad del portal, y la
 * consecuencia de equivocarse es la misma que alli: ensenarle a alguien la deuda
 * de otra persona. Lo que cambia es la forma —ya no hay listado del padron que
 * filtrar, hay una respuesta compuesta— y la fuente del sujeto: un claim firmado
 * en vez de una caja.
 */

const DNI = '03593174';

const CUERPO = {
  tipoDocumento: 'DNI',
  numeroDocumento: DNI,
  aLaFecha: '2026-08-13',
  municipalidadesRecorridas: 3,
  totalConsolidado: { importe: '240.00', actualizadoA: '2026-08-13' },
  notaDelTotal: null,
  sinRegistros: false,
  municipalidades: [
    {
      ubigeo: '200601',
      nombre: 'MUNICIPALIDAD PROVINCIAL DE SULLANA',
      codigoContribuyente: '00000025673',
      nombreContribuyente: 'SUC. RUFINA MEDINA MEDINA',
      activo: true,
      resumenDeSaldos: {
        insoluto: { importe: '100.00', actualizadoA: '2026-08-13' },
        reajuste: { importe: '0.00', actualizadoA: '2026-08-13' },
        interes: { importe: '20.00', actualizadoA: '2026-08-13' },
        gasto: { importe: '0.00', actualizadoA: '2026-08-13' },
        total: { importe: '120.00', actualizadoA: '2026-08-13' },
        estadoDeLaConsulta: '1 obligacion con saldo al 2026-08-13',
      },
      obligaciones: [
        {
          tributo: 'PREDIAL',
          ejercicio: 2026,
          total: { importe: '120.00', actualizadoA: '2026-08-13' },
        },
      ],
      predios: [
        {
          codigoReferenciaCatastral: '00001182',
          tipo: 'URBANO',
          direccion: 'JR. UNION 123',
          porcentajeTitularidad: '50.0000',
        },
      ],
    },
  ],
};

describe('es esta situacion la de este token', () => {
  it('el mismo numero, si', () => {
    expect(esLaSituacionDe(leerSituacion(CUERPO), DNI)).toBe(true);
    // Espacios de sobra y mayusculas no cambian de persona: el backend sube el
    // documento a mayusculas al guardarlo.
    expect(esLaSituacionDe(leerSituacion({ ...CUERPO, numeroDocumento: 'x1a' }), ' X1A ')).toBe(
      true,
    );
  });

  it('**otro numero, no** — y un prefijo tampoco', () => {
    /* Es la comparacion que separa «tu deuda» de «la deuda de otro»: con
       «empieza por», `0359` abriria la situacion de `03593174`. Y no seria un
       error visible: la pantalla ensena un nombre y unas cifras que existen. */
    expect(esLaSituacionDe(leerSituacion(CUERPO), '44218937')).toBe(false);
    expect(esLaSituacionDe(leerSituacion(CUERPO), '0359')).toBe(false);
    expect(esLaSituacionDe(leerSituacion(CUERPO), '035931741')).toBe(false);
  });

  it('sin nada con que comparar, tampoco', () => {
    // Un documento vacio compararia contra cualquier cosa. Quien no tiene token
    // no puede decidir que la respuesta es suya.
    expect(esLaSituacionDe(leerSituacion(CUERPO), '')).toBe(false);
    expect(esLaSituacionDe(leerSituacion(CUERPO), '   ')).toBe(false);
  });

  it('una respuesta sin documento no puede ser de nadie', () => {
    const sinDocumento = leerSituacion({ ...CUERPO, numeroDocumento: undefined });
    expect(esLaSituacionDe(sinDocumento, DNI)).toBe(false);
  });
});

describe('lo que se lee de la respuesta', () => {
  it('la fecha de corte, el total y su nota', () => {
    const situacion = leerSituacion(CUERPO);

    expect(situacion.aLaFecha).toBe('2026-08-13');
    expect(situacion.totalConsolidado?.importe).toBe('240.00');
    expect(situacion.municipalidadesRecorridas).toBe(3);
    expect(situacion.notaDelTotal).toBe('');
  });

  it('**sin total no se inventa un cero**, y la nota dice por que', () => {
    /* Un total al que le falta una municipalidad es un importe plausible y
       equivocado; un cero, ademas, dice que no debe nada. */
    const situacion = leerSituacion({
      ...CUERPO,
      totalConsolidado: null,
      notaDelTotal: 'No se pudo consultar CATACAOS.',
    });

    expect(situacion.totalConsolidado).toBeUndefined();
    expect(situacion.notaDelTotal).toBe('No se pudo consultar CATACAOS.');
  });

  it('un importe sin su fecha no es un importe (regla 9)', () => {
    // `importeDe` exige los dos campos: media cifra no se dibuja.
    const situacion = leerSituacion({ ...CUERPO, totalConsolidado: { importe: '240.00' } });

    expect(situacion.totalConsolidado).toBeUndefined();
  });

  it('la municipalidad, con su codigo de contribuyente y su resumen', () => {
    const [sullana] = leerSituacion(CUERPO).municipalidades;

    expect(sullana?.ubigeo).toBe('200601');
    expect(sullana?.codigoContribuyente).toBe('00000025673');
    expect(sullana?.resumen.total?.importe).toBe('120.00');
    expect(sullana?.resumen.estadoDeLaConsulta).toBe('1 obligacion con saldo al 2026-08-13');
    expect(sullana?.obligaciones).toHaveLength(1);
    expect(sullana?.predios[0]?.porcentajeTitularidad).toBe('50.0000');
  });

  it('de alta salvo que el servidor diga lo contrario', () => {
    /* La marca de baja es la **afirmacion**. Afirmarla por omision pondria
       «dado de baja» a todo el mundo el dia que el campo faltara. */
    const conCampo = leerSituacion({
      ...CUERPO,
      municipalidades: [{ ...CUERPO.municipalidades[0], activo: false }],
    });
    const sinCampo = leerSituacion({
      ...CUERPO,
      municipalidades: [{ ...CUERPO.municipalidades[0], activo: undefined }],
    });

    expect(conCampo.municipalidades[0]?.activo).toBe(false);
    expect(sinCampo.municipalidades[0]?.activo).toBe(true);
  });

  it('lo que no es un objeto falla en voz alta', () => {
    // Media pantalla mal dibujada es peor que un error que dice que la
    // respuesta no era la esperada.
    expect(() => leerSituacion([])).toThrow(/no trae un objeto/);
    expect(() => leerSituacion(null)).toThrow(/no trae un objeto/);
  });
});
