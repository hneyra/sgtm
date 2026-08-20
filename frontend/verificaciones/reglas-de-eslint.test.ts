import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/**
 * Las reglas de `eslint.config.js` muerden.
 *
 * Es el equivalente frontend de `verificaciones/muestras/` en el backend: cada
 * prohibicion tiene una muestra que la viola, y esta prueba exige que ESLint la
 * detecte. **Una regla que no puede fallar no protege nada** — el mismo
 * argumento por el que la prueba de aislamiento demuestra que el superusuario
 * omite RLS en vez de afirmarlo.
 *
 * Las muestras estan en `ignores` de la configuracion para que `yarn lint` no
 * las senale; aqui se lintan como texto, con una ruta sintetica dentro de la
 * aplicacion, que es donde la regla tiene que aplicar de verdad.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

/** Ruta sintetica: la muestra se juzga como si viviera en el codigo de la aplicacion. */
const rutaEnLaAplicacion = (nombre: string) => join(RAIZ, 'apps/backoffice/src', nombre);

const eslint = new ESLint({ cwd: RAIZ });

async function mensajesDe(muestra: string): Promise<string[]> {
  const codigo = readFileSync(join(AQUI, 'muestras', muestra), 'utf8');
  const [resultado] = await eslint.lintText(codigo, { filePath: rutaEnLaAplicacion(muestra) });
  return (resultado?.messages ?? []).map((m) => `${m.ruleId ?? '?'}: ${m.message}`);
}

/** Cada prohibicion, su muestra y el texto que la delata. */
const PROHIBICIONES: { prohibicion: string; muestra: string; delata: RegExp }[] = [
  {
    prohibicion: 'aritmetica con importes (RNF-083)',
    muestra: 'aritmetica-con-importes.ts',
    delata: /Aritmética con un importe|Sumar importes en el cliente/,
  },
  {
    prohibicion: 'importe convertido a number (RNF-055)',
    muestra: 'importe-como-number.ts',
    delata: /pierde céntimos como number|No lo conviertas a number/,
  },
  {
    prohibicion: 'municipalidadId en el frontend (regla 2)',
    muestra: 'municipalidad-en-el-cliente.ts',
    delata: /jamás envía municipalidadId/,
  },
  {
    prohibicion: 'token en localStorage o sessionStorage (FRO-01 §5)',
    muestra: 'token-en-almacenamiento.ts',
    delata: /El token vive en memoria/,
  },
  {
    prohibicion: 'identificador con tilde (idioma)',
    muestra: 'identificador-con-tilde.ts',
    delata: /Sin tildes ni eñe en identificadores/,
  },
  {
    prohibicion: 'tasa en vez de alicuota (regla 8)',
    muestra: 'tasa-en-vez-de-alicuota.ts',
    delata: /se llama «alicuota»/,
  },
  {
    prohibicion: 'any explicito (FRO-04 §3)',
    muestra: 'any-explicito.ts',
    delata: /no-explicit-any/,
  },
  {
    prohibicion: 'importe sin fecha de calculo (RNF-075, regla 9)',
    muestra: 'importe-sin-fecha.tsx',
    delata: /con su fecha de cálculo/,
  },
  {
    prohibicion: 'tabIndex positivo (FRO-04 §7)',
    muestra: 'tabindex-positivo.tsx',
    delata: /Sin tabIndex positivo/,
  },
  {
    prohibicion: 'fetch suelto fuera de @sgtm/api-client (FRO-01 §5)',
    muestra: 'fetch-directo.ts',
    delata: /pasan por «solicitar»/,
  },
  {
    prohibicion: 'escritura sin observacion del usuario (regla 10, RNF-052)',
    muestra: 'escritura-sin-observacion.tsx',
    delata: /sin observación del usuario no se guarda/,
  },
];

describe('toda prohibicion del frontend tiene una regla que la detecta', () => {
  it.each(PROHIBICIONES)('$prohibicion', async ({ muestra, delata }) => {
    const mensajes = await mensajesDe(muestra);
    expect(mensajes.join('\n')).toMatch(delata);
  });
});

describe('las reglas no senalan codigo correcto', () => {
  it('el codigo que respeta las reglas pasa limpio', async () => {
    const correcto = `
      import { formatearImporte } from '@sgtm/dominio';

      export function totalDelRecibo(recibo: { total: string; fechaCalculo: string }) {
        // El total llega calculado del backend: aqui solo se formatea.
        return formatearImporte(recibo.total);
      }

      export const alicuotaPredial = '0.006';
    `;
    const [resultado] = await eslint.lintText(correcto, {
      filePath: rutaEnLaAplicacion('correcto.ts'),
    });
    expect(resultado?.messages ?? []).toEqual([]);
  });
});
