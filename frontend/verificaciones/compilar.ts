import ts from 'typescript';

/**
 * Compila unos archivos con `tsc` y devuelve sus quejas.
 *
 * Existe porque hay reglas de este proyecto que **son de tipos**: «renombrar un
 * campo del contrato rompe la compilacion», «un adaptador que pierde la fecha
 * de calculo no compila». Afirmarlas en un comentario no las verifica; lo que
 * las verifica es compilar de verdad un archivo que las viola y comprobar que
 * el compilador se queja.
 */

const OPCIONES = (raiz: string): ts.CompilerOptions => ({
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  // `@sgtm/api-client` lee `import.meta.env` para saber el camino base; sin los
  // tipos de Vite, compilar el cliente se queja de algo que no es la regla.
  types: ['vite/client'],
  baseUrl: raiz,
  paths: {
    '@sgtm/dominio': ['packages/dominio/src/index.ts'],
    '@sgtm/api-client': ['packages/api-client/src/index.ts'],
  },
});

export function compilar(archivos: readonly string[], raiz: string): string[] {
  const programa = ts.createProgram([...archivos], OPCIONES(raiz));
  return ts
    .getPreEmitDiagnostics(programa)
    .map((diagnostico) => ts.flattenDiagnosticMessageText(diagnostico.messageText, ' '));
}
