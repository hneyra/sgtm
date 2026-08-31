import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const raiz = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@sgtm/design-system', replacement: raiz('./packages/design-system/src/index.ts') },
      { find: '@sgtm/dominio', replacement: raiz('./packages/dominio/src/index.ts') },
      { find: '@sgtm/api-client', replacement: raiz('./packages/api-client/src/index.ts') },
      { find: '@sgtm/api-mock', replacement: raiz('./packages/api-mock/src/index.ts') },
      { find: '@sgtm/lectura', replacement: raiz('./packages/lectura/src/index.ts') },
      { find: '@sgtm/sesion', replacement: raiz('./packages/sesion/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['{apps,packages,verificaciones}/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'verificaciones/muestras/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
