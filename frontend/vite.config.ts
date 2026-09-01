import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: false,
    /* El backend se sirve por el mismo origen que la interfaz, así que no hay
       CORS que configurar ni preflight que responder. Con `VITE_SGTM_BACKEND`
       se apunta a otro sitio sin tocar el código. */
    proxy: {
      '/api': {
        target: process.env.VITE_SGTM_BACKEND ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
