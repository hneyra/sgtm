import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ds/global.css';
import { App } from './App';
import { canjearSiVuelve, entrar, hayPuerta, token } from './api/sesion';

/**
 * Antes de dibujar nada: si venimos de Keycloak, se canjea el código; y si no
 * hay sesión y hay puerta, se va a por ella.
 *
 * Va aquí y no dentro de un efecto de React porque el canje **limpia la URL** y
 * restituye el destino al que se iba. Hacerlo después de montar significa montar
 * dos veces, y la primera con `?code=` en la barra: la ruta por omisión gana y
 * quien pidió `#/catastro/predios` acaba en Inicio.
 */
async function arrancar() {
  await canjearSiVuelve();
  if (!token() && hayPuerta()) {
    await entrar();
    return; // el navegador ya se va: no se monta nada
  }
  createRoot(document.getElementById('raiz')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void arrancar();
