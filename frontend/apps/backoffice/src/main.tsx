import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@sgtm/design-system/estilos.css';
import './estilos/aplicacion.css';
import { App } from './app/App';

/**
 * Proxy de datos: la API simulada del SGTM.
 *
 * Mientras el backend no sirva las 134 operaciones del contrato, el proxy las
 * contesta interceptando `fetch`. La aplicacion no se entera: pide por HTTP a
 * `/api/v1` igual que lo hara en produccion.
 *
 * **Para integrar el backend basta apagarlo:** `VITE_SGTM_PROXY_DE_DATOS=false`
 * y `SGTM_API` apuntando al Spring Boot. No hay una segunda ruta de codigo que
 * mantener ni un modo «con datos de ejemplo» dentro de las pantallas.
 *
 * Se carga con `import()` y no arriba del todo por dos razones: el juego de
 * datos pesa mas que la aplicacion entera, y apagado por bandera el empaquetador
 * puede descartar la rama y no incluirlo en la compilacion.
 */
const PROXY_ACTIVO = import.meta.env['VITE_SGTM_PROXY_DE_DATOS'] !== 'false';

async function arrancar(): Promise<void> {
  // Se instala **antes** de montar: una pantalla no debe poder pedir sus datos
  // antes de que haya quien los conteste.
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
