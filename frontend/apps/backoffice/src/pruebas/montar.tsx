import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorDeSesion>
        <ProveedorDeEjercicio>
          <ProveedorDePreferencias>
            <MemoryRouter initialEntries={[ruta]}>
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
