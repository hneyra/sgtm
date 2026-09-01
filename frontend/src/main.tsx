import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ds/global.css';
import { App } from './App';
import { PuertaParada } from './api/PuertaParada';
import { canjearSiVuelve, entrar, hayPuerta, puedeIrALaPuerta, token, vieneDeSalir, type Vuelta } from './api/sesion';

/**
 * Antes de dibujar nada: si venimos de Keycloak, se canjea el código; y si no
 * hay sesión y hay puerta, se va a por ella.
 *
 * Va aquí y no dentro de un efecto de React porque el canje **limpia la URL** y
 * restituye el destino al que se iba. Hacerlo después de montar significa montar
 * dos veces, y la primera con `?code=` en la barra: la ruta por omisión gana y
 * quien pidió `#/catastro/predios` acaba en Inicio.
 *
 * <h2>Por qué no se va a la puerta «siempre que no haya token»</h2>
 *
 * Porque eso es un bucle. Si el emisor devuelve `?error=…` —un alcance mal
 * puesto, un cliente que no reconoce, o que el usuario canceló— el canje limpia
 * la URL y deja la sesión sin token, y volver a la puerta produce el mismo
 * error otra vez. Sin nada dibujado, sin traza y con el emisor recibiendo la
 * ráfaga. Sólo se puede dar en despliegue, porque en local no hay puerta, que
 * es exactamente donde nadie está mirando.
 *
 * Así que hay tres desenlaces y no dos: se entra, se monta la aplicación, o
 * **se para y se dice qué pasó**.
 */
async function arrancar() {
  const vuelta: Vuelta = await canjearSiVuelve();
  const raiz = createRoot(document.getElementById('raiz')!);

  if (!token() && hayPuerta()) {
    if (vuelta.estado === 'fallo') {
      raiz.render(<PuertaParada motivo={vuelta.motivo} detalle={vuelta.detalle} />);
      return;
    }
    /* Recién salido: la vuelta del `logout` trae a la raíz sin token, y entrar
       aquí devolvería al usuario adentro con la misma cuenta sin que hubiera
       hecho nada. Se le ofrece el botón. */
    if (vieneDeSalir()) {
      raiz.render(<PuertaParada motivo="Sesión cerrada" detalle="Ya no hay ninguna sesión abierta en este navegador." salida />);
      return;
    }
    if (!puedeIrALaPuerta()) {
      raiz.render(
        <PuertaParada
          motivo="La entrada no llega a completarse"
          detalle="Se fue al formulario varias veces seguidas y ninguna volvió con una sesión. Se para aquí para no seguir rebotando."
        />,
      );
      return;
    }
    await entrar();
    return; // el navegador ya se va: no se monta nada
  }

  raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void arrancar();
