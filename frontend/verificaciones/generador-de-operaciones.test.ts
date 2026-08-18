import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * El generador de operaciones muerde.
 *
 * Mismo criterio que `reglas-de-eslint.test.ts` y que la prueba de aislamiento
 * del backend: **una verificacion que no puede fallar no protege nada.** Aqui
 * cada guarda del generador tiene un contrato de muestra que la viola, y se
 * exige que el generador lo rechace en vez de repartir el defecto por las 134
 * operaciones.
 *
 * La ultima prueba es la que da sentido a todo el issue: renombrar un campo en
 * `sgtm-v1.yaml` **rompe la compilacion** del codigo escrito contra el nombre
 * viejo. Se demuestra renombrandolo de verdad y compilando con `tsc`.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const GENERADOR = join(RAIZ, 'scripts/generar-operaciones.mjs');
const CONTRATO = join(RAIZ, '..', 'docs/50-api/openapi/sgtm-v1.yaml');

const taller = mkdtempSync(join(tmpdir(), 'sgtm-contrato-'));
let secuencia = 0;

interface Resultado {
  readonly codigo: number;
  readonly salida: string;
  readonly queja: string;
  readonly generado: string;
}

interface FalloDeProceso {
  readonly status: number | null;
  readonly stderr: string | null;
  readonly stdout: string | null;
}

/** Corre el generador sobre un contrato de muestra, sin dejar que un fallo tumbe la prueba. */
function generar(contrato: string, ...argumentos: readonly string[]): Resultado {
  secuencia += 1;
  const rutaDelContrato = join(taller, `contrato-${secuencia}.yaml`);
  const rutaDeSalida = join(taller, `operaciones-${secuencia}.generado.ts`);
  writeFileSync(rutaDelContrato, contrato, 'utf8');

  const orden = [GENERADOR, '--contrato', rutaDelContrato, '--salida', rutaDeSalida, ...argumentos];
  try {
    const salida = execFileSync(process.execPath, orden, { encoding: 'utf8', stdio: 'pipe' });
    return { codigo: 0, salida, queja: '', generado: rutaDeSalida };
  } catch (fallo) {
    const proceso = fallo as FalloDeProceso;
    return {
      codigo: proceso.status ?? 1,
      salida: proceso.stdout ?? '',
      queja: proceso.stderr ?? '',
      generado: rutaDeSalida,
    };
  }
}

/** Un contrato minimo y correcto: una operacion con deuda, su fecha y su importe. */
const CORRECTO = `
openapi: 3.1.0
info:
  title: Contrato de muestra
  version: 1.0.0
paths:
  "/rentas/deuda/{codigo}":
    get:
      operationId: deuda
      summary: "Deuda del contribuyente"
      tags: ["Rentas"]
      parameters:
        - name: codigo
          in: path
          required: true
          schema: { type: string }
        - name: ejercicio
          in: query
          required: false
          schema: { type: string }
      responses:
        200:
          description: Operacion realizada
          content:
            application/json:
              schema:
                type: object
                required: [fechaCalculo, montoInsoluto]
                properties:
                  fechaCalculo: { type: string, format: date }
                  montoInsoluto: { type: string }
components:
  schemas:
    Importe:
      type: string
`;

const cambiando = (que: string, por: string): string => {
  if (!CORRECTO.includes(que)) throw new Error(`La muestra ya no dice «${que}»`);
  return CORRECTO.replace(que, por);
};

describe('el generador acepta un contrato que respeta las reglas', () => {
  it('genera, y el importe se tipa como Importe del dominio', () => {
    const resultado = generar(CORRECTO);
    expect(resultado.queja).toBe('');
    expect(resultado.codigo).toBe(0);

    const generado = readFileSync(resultado.generado, 'utf8');
    expect(generado).toContain("import type { Fecha, Importe } from '@sgtm/dominio';");
    expect(generado).toContain('readonly montoInsoluto: Importe;');
    expect(generado).toContain('readonly fechaCalculo: Fecha;');
    expect(generado).toContain("ruta: '/rentas/deuda/{codigo}'");
  });
});

/** Cada guarda, el contrato que la viola y el texto que delata el rechazo. */
const GUARDAS: { guarda: string; contrato: string; delata: RegExp }[] = [
  {
    guarda: 'la municipalidad como parametro de consulta (regla 2, FRO-01 §4)',
    contrato: cambiando('        - name: ejercicio', '        - name: municipalidadId'),
    delata: /municipalidad no viaja en la peticion/,
  },
  {
    guarda: 'la municipalidad en la ruta (regla 2, ADR-0005)',
    contrato: cambiando('"/rentas/deuda/{codigo}"', '"/rentas/{municipalidadId}/deuda/{codigo}"'),
    delata: /municipalidad en la ruta/,
  },
  {
    guarda: 'un importe declarado como numero (regla 1, RNF-055)',
    contrato: cambiando('montoInsoluto: { type: string }', 'montoInsoluto: { type: number }'),
    delata: /importe y el contrato lo declara como numero/,
  },
  {
    guarda: 'cifras de deuda sin fecha de calculo (regla 9, RNF-075)',
    contrato: cambiando('required: [fechaCalculo, montoInsoluto]', 'required: [montoInsoluto]'),
    delata: /no obliga a «fechaCalculo»/,
  },
  {
    guarda: 'el propio Importe declarado como numero (regla 1)',
    contrato:
      `${cambiando('montoInsoluto: { type: string }', 'montoInsoluto: { $ref: "#/components/schemas/Importe" }')}`.replace(
        '    Importe:\n      type: string',
        '    Importe:\n      type: number',
      ),
    delata: /declara «Importe» como «number»/,
  },
  {
    guarda: 'un parametro de ruta que la ruta no trae',
    contrato: cambiando('"/rentas/deuda/{codigo}"', '"/rentas/deuda"'),
    delata: /la ruta y sus parametros no cuadran/,
  },
];

describe('toda guarda del generador tiene un contrato que la viola', () => {
  it.each(GUARDAS)('$guarda', ({ contrato, delata }) => {
    const resultado = generar(contrato);
    expect(resultado.codigo, `deberia haber fallado:\n${resultado.salida}`).not.toBe(0);
    expect(resultado.queja).toMatch(delata);
  });
});

describe('la comprobacion de que lo generado cuadra con el contrato', () => {
  it('pasa cuando cuadra y falla cuando el contrato cambio y nadie regenero', () => {
    secuencia += 1;
    const rutaDelContrato = join(taller, `comprobado-${secuencia}.yaml`);
    const rutaDeSalida = join(taller, `comprobado-${secuencia}.generado.ts`);
    const correr = (argumentos: readonly string[]): FalloDeProceso | null => {
      try {
        execFileSync(
          process.execPath,
          [GENERADOR, '--contrato', rutaDelContrato, '--salida', rutaDeSalida, ...argumentos],
          { encoding: 'utf8', stdio: 'pipe' },
        );
        return null;
      } catch (fallo) {
        return fallo as FalloDeProceso;
      }
    };

    writeFileSync(rutaDelContrato, CORRECTO, 'utf8');
    expect(correr([])).toBeNull();
    expect(correr(['--comprobar'])).toBeNull();

    // El contrato cambia y el archivo generado se queda como estaba.
    writeFileSync(rutaDelContrato, CORRECTO.replace('name: ejercicio', 'name: anio'), 'utf8');
    const fallo = correr(['--comprobar']);
    expect(fallo).not.toBeNull();
    expect(fallo?.stderr ?? '').toMatch(/no cuadran con el contrato/);
  });
});

/* ── La prueba del issue: el contrato manda sobre la compilacion ────────── */

const OPCIONES_DE_COMPILACION: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  baseUrl: RAIZ,
  paths: { '@sgtm/dominio': ['packages/dominio/src/index.ts'] },
};

function compilar(archivos: readonly string[]): string[] {
  const programa = ts.createProgram([...archivos], OPCIONES_DE_COMPILACION);
  return ts
    .getPreEmitDiagnostics(programa)
    .map((diagnostico) => ts.flattenDiagnosticMessageText(diagnostico.messageText, ' '));
}

/** Genera desde un contrato dado y devuelve el archivo, con un consumidor que lo usa. */
function generarYConsumir(yaml: string, nombre: string): { generado: string; consumidor: string } {
  const rutaDelContrato = join(taller, `${nombre}.yaml`);
  const generado = join(taller, `${nombre}.ts`);
  const consumidor = join(taller, `consumidor-${nombre}.ts`);
  writeFileSync(rutaDelContrato, yaml, 'utf8');
  execFileSync(process.execPath, [GENERADOR, '--contrato', rutaDelContrato, '--salida', generado], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  writeFileSync(
    consumidor,
    [
      `import type { ParametrosDe } from './${nombre}';`,
      '',
      '// El codigo de la interfaz, escrito contra el nombre que el contrato tenia.',
      `export const ficha: ParametrosDe<'ficha_urbana'> = { codRefCatastral: '01-02-03' };`,
      '',
    ].join('\n'),
    'utf8',
  );
  return { generado, consumidor };
}

describe('un cambio del contrato es un error de compilacion', () => {
  it('con el contrato de hoy, el codigo que usa sus parametros compila', () => {
    const { generado, consumidor } = generarYConsumir(
      readFileSync(CONTRATO, 'utf8'),
      'contrato-vigente',
    );
    expect(compilar([generado, consumidor])).toEqual([]);
  });

  it('renombrar un campo en el yaml deja de compilar el codigo que usaba el nombre viejo', () => {
    const renombrado = readFileSync(CONTRATO, 'utf8').replaceAll(
      'codRefCatastral',
      'codigoDeReferenciaCatastral',
    );
    const { generado, consumidor } = generarYConsumir(renombrado, 'contrato-renombrado');

    const quejas = compilar([generado, consumidor]);
    expect(quejas.join('\n')).toMatch(/codRefCatastral/);
    expect(quejas.length).toBeGreaterThan(0);
  });
});
