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

/**
 * El nombre del trozo, cuando el archivo se llama `index` o `composicion`.
 *
 * Rollup nombra cada trozo por su archivo, y desde #433 los doce registros de
 * modulo se cargan con `import()`: son doce `pantallas/<modulo>/index.ts` y
 * cinco `pantallas/<modulo>/composicion.ts`, o sea diecisiete trozos llamados
 * «index» y «composicion». La lista de diferidos que imprime
 * `scripts/comprobar-compilaciones.mjs` es lo unico que dice **que** se saco del
 * arranque, y con diecisiete nombres repetidos deja de decirlo: un diagnostico
 * que no distingue no vale mas que no tenerlo.
 *
 * Se antepone la carpeta —`catastro-index`, `rentas-composicion`—, que es el
 * dato que falta. No cambia como se carga nada: es el nombre del archivo.
 */
const nombreDelTrozo = (nombre: string, id: string | undefined): string => {
  if (id === undefined || !/^(index|composicion)$/.test(nombre)) return nombre;
  const carpeta = id.split('/').at(-2);
  return carpeta === undefined ? nombre : `${carpeta}-${nombre}`;
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (trozo) =>
          `assets/${nombreDelTrozo(trozo.name, trozo.facadeModuleId ?? undefined)}-[hash].js`,
      },
    },
  },
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
