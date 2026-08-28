import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const raiz = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

/**
 * El portal del contribuyente, **fuera del shell del back-office** (#298,
 * ADR-0016 §3).
 *
 * Se sirve en `/portal/` del **mismo origen** que el back-office, y eso no es
 * comodidad: es lo que hace que `/api/v1` siga siendo del propio origen —sin
 * CORS que configurar ni un segundo origen que autorizar en Keycloak— y que la
 * separacion sea de paquete, no de despliegue. `nginx.conf` sirve este `dist`
 * bajo esa ruta.
 */
const API = process.env['SGTM_API'] ?? 'http://localhost:8080';

export default defineConfig({
  base: '/portal/',
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
    // Otro puerto que el back-office (5173): los dos se levantan a la vez.
    port: 5174,
    proxy: { '/api': { target: API, changeOrigin: true } },
  },
});
