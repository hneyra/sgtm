import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@sgtm/design-system/estilos.css';
import './estilos/portal.css';
import { App } from './App';

/**
 * Arranque del portal del contribuyente (#298, ADR-0016 §3).
 *
 * Gemelo del del back-office, y a proposito: el proxy de datos se instala
 * **antes de montar** —una pantalla no debe poder pedir sus datos antes de que
 * haya quien los conteste— y va detras de la misma bandera, de modo que el juego
 * de datos de ejemplo tampoco llega a produccion por este camino.
 * `comprobar-compilaciones` lo mide en las dos aplicaciones.
 */
const PROXY_ACTIVO = import.meta.env['VITE_SGTM_PROXY_DE_DATOS'] !== 'false';

async function arrancar(): Promise<void> {
  if (PROXY_ACTIVO) {
    const { instalarProxyDeDatos } = await import('@sgtm/api-mock');
    instalarProxyDeDatos();
  }

  const raiz = document.getElementById('raiz');
  if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void arrancar();
