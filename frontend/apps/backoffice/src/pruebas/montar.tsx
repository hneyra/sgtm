import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProveedorDePreferencias } from '../app/preferencias';
import { Shell } from '../app/Shell';
import { HubDeModulo } from '../pantallas/HubDeModulo';
import { Pantalla } from '../pantallas/Pantalla';

/**
 * Monta la aplicacion en una ruta, con los mismos proveedores que en produccion
 * y con el enrutador en memoria.
 *
 * Las consultas no reintentan: en una prueba un reintento convierte un fallo en
 * un tiempo de espera agotado, que dice mucho menos.
 */
export function montarEnRuta(ruta: string): RenderResult {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorDePreferencias>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/:moduloId" element={<HubDeModulo />} />
              <Route path="/:moduloId/:ranura" element={<Pantalla />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ProveedorDePreferencias>
    </QueryClientProvider>,
  );
}
