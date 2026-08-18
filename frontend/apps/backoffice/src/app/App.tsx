import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { OPCION_INICIAL } from '../catalogo';
import { HubDeModulo } from '../pantallas/HubDeModulo';
import { Pantalla } from '../pantallas/Pantalla';
import { ProveedorDePreferencias } from './preferencias';
import { Shell } from './Shell';

/**
 * Raiz de la aplicacion: proveedores y rutas.
 *
 * Una ruta por opcion del menu (FRO-01 §3), derivada del catalogo: `/:modulo`
 * abre el hub y `/:modulo/:opcion` la pantalla. No hay 134 declaraciones de
 * ruta porque no hay 134 componentes: hay un renderizador y un catalogo.
 */
export function crearClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los padrones no cambian entre dos pulsaciones de la misma pantalla.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Un reintento automatico de un cobro es un cobro doble (FRO-04 §5).
        retry: false,
      },
    },
  });
}

const cliente = crearClienteDeConsultas();

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorDePreferencias>
        <Router>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<Navigate to={OPCION_INICIAL.ruta} replace />} />
              <Route path="/:moduloId" element={<HubDeModulo />} />
              <Route path="/:moduloId/:ranura" element={<Pantalla />} />
            </Route>
          </Routes>
        </Router>
      </ProveedorDePreferencias>
    </QueryClientProvider>
  );
}
