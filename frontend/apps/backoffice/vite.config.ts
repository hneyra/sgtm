import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const raiz = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

/**
 * El backend real todavia no sirve ni un endpoint (ver `backend/README.md`),
 * pero la aplicacion habla HTTP contra `/api/v1` desde el primer dia: cuando
 * Spring Boot exponga las operaciones basta con apuntar SGTM_API ahi, sin
 * cambiar una linea del codigo de la aplicacion.
 */
const API = process.env['SGTM_API'] ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // El orden importa: la hoja de estilos se resuelve antes que el paquete.
    alias: [
      {
        find: '@sgtm/design-system/estilos.css',
        replacement: raiz('../../packages/design-system/src/estilos/estilos.css'),
      },
      {
        find: '@sgtm/design-system',
        replacement: raiz('../../packages/design-system/src/index.ts'),
      },
      { find: '@sgtm/dominio', replacement: raiz('../../packages/dominio/src/index.ts') },
      { find: '@sgtm/api-client', replacement: raiz('../../packages/api-client/src/index.ts') },
      { find: '@sgtm/api-mock', replacement: raiz('../../packages/api-mock/src/index.ts') },
      { find: '@sgtm/lectura', replacement: raiz('../../packages/lectura/src/index.ts') },
      { find: '@sgtm/sesion', replacement: raiz('../../packages/sesion/src/index.ts') },
    ],
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: API, changeOrigin: true } },
  },
});
