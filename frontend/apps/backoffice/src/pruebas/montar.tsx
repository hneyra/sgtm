import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ProveedorDeEjercicio } from '../app/ejercicio';
import { ProveedorDePreferencias } from '../app/preferencias';
import { ProveedorDeSesion } from '../app/sesion/ProveedorDeSesion';
import { Shell } from '../app/Shell';
import { HubDeModulo } from '../pantallas/HubDeModulo';
import { Pantalla } from '../pantallas/Pantalla';

/**
 * Un cliente de consultas para pruebas.
 *
 * Las consultas no reintentan: en una prueba un reintento convierte un fallo en
 * un tiempo de espera agotado, que dice mucho menos.
 */
export const clienteDePruebas = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

/**
 * Monta la aplicacion en una ruta, con los mismos proveedores que en produccion
 * y con el enrutador en memoria.
 *
 * El cliente se puede compartir entre dos montajes: es la unica forma de
 * comprobar que la cache **no** mezcla dos peticiones distintas de la misma
 * pantalla. Sin compartirlo, cada montaje empieza con la cache vacia y la
 * prueba no diria nada.
 */
export function montarEnRuta(ruta: string, cliente = clienteDePruebas()): RenderResult {
  return montarEnRutas([ruta], cliente);
}

/**
 * Monta con **varias entradas en el historial**, para poder volver atras.
 *
 * Existe por un defecto que ninguna prueba de una sola entrada podia encontrar
 * (#332): el boton Atras del navegador restaura la busqueda anterior sin pasar
 * por «Buscar», y lo que quedaba marcado en la tabla seguia marcado —senalando
 * a otra fila y con el contribuyente de la busqueda restaurada—. Con un solo
 * `initialEntries` no hay a donde volver, asi que el camino no se podia recorrer.
 *
 * La ultima entrada es la que se esta viendo, como en un navegador de verdad.
 */
export function montarEnRutas(
  rutas: readonly string[],
  cliente = clienteDePruebas(),
): RenderResult {
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorDeSesion>
        <ProveedorDeEjercicio>
          <ProveedorDePreferencias>
            <MemoryRouter initialEntries={[...rutas]} initialIndex={rutas.length - 1}>
              <PuenteDeNavegacion />
              <Routes>
                <Route element={<Shell />}>
                  <Route path="/:moduloId" element={<HubDeModulo />} />
                  <Route path="/:moduloId/:ranura" element={<Pantalla />} />
                  <Route path="/:moduloId/:ranura/:codigo" element={<Pantalla />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ProveedorDePreferencias>
        </ProveedorDeEjercicio>
      </ProveedorDeSesion>
    </QueryClientProvider>,
  );
}

/** El `navigate` del enrutador montado, para que {@link volverAtras} lo alcance. */
let navegarDelMontaje: ((delta: number) => void) | undefined;

/**
 * Deja el `navigate` del enrutador a la vista de la prueba.
 *
 * `MemoryRouter` no expone su historial y `window.history.back()` no lo toca:
 * sin este puente, el gesto mas comun de quien atiende —volver atras— no se
 * puede recorrer en una prueba. No dibuja nada.
 */
function PuenteDeNavegacion() {
  navegarDelMontaje = useNavigate();
  return null;
}

/** El boton Atras del navegador, sobre el ultimo montaje. */
export function volverAtras(): void {
  if (navegarDelMontaje === undefined) throw new Error('No hay ningun montaje al que volver.');
  act(() => navegarDelMontaje?.(-1));
}
