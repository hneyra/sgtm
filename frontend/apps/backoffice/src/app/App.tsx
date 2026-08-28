import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { HubDeModulo } from '../pantallas/HubDeModulo';
import { Pantalla } from '../pantallas/Pantalla';
import { Atencion } from '../pantallas/atencion/Atencion';
import { Inicio } from '../pantallas/inicio/Inicio';
import { ProveedorDeEjercicio } from './ejercicio';
import { ProveedorDePreferencias } from './preferencias';
import { ProveedorDeSesion, PuertaDeSesion } from '@sgtm/sesion';
import { Shell } from './Shell';

/**
 * Raiz de la aplicacion: proveedores y rutas.
 *
 * Una ruta por opcion del menu (FRO-01 §3), derivada del catalogo: `/:modulo`
 * abre el hub, `/:modulo/:opcion` la pantalla y `/:modulo/:opcion/:codigo` la
 * pantalla con un registro abierto. No hay 134 declaraciones de ruta porque no
 * hay 134 componentes: hay un renderizador y un catalogo.
 *
 * **Y `/` es la pregunta, no un desvio** (#296, ADR-0016 §1). Hasta ahora
 * redirigia al panel de recaudacion, que es la primera opcion del catalogo; el
 * panel **sigue siendo esa opcion y se sigue abriendo por su ruta** —del
 * lanzador, de la paleta o del menu—, lo que deja de ser es la portada. Quien
 * entra a trabajar no viene a mirar el avance del ejercicio: viene a atender a
 * alguien.
 *
 * El inicio **no es una opcion mas**, y por eso vive en una ruta y no en el
 * catalogo: no publica ninguna lectura propia ni tiene un permiso que conceder
 * —consulta las tres que ya existen, cada una con el suyo—. Es el mismo criterio
 * con el que ADR-0014 §5 se nego a inventar una ruta para el centro de
 * reportes: «una opcion mas, sin id en el catalogo y sin permiso propio».
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
      <ProveedorDeSesion>
        {/* El ejercicio de trabajo va por encima de las rutas: es de la sesion,
            no de la pantalla, y cambiarlo vacia la cache de todas (#70). */}
        <ProveedorDeEjercicio>
          <ProveedorDePreferencias>
            <PuertaDeSesion>
              <Router>
                <Routes>
                  <Route element={<Shell />}>
                    <Route path="/" element={<Inicio />} />
                    {/* La ficha 360° de una persona (#297, ADR-0016 §2). Va
                        antes de `/:moduloId/:ranura` para leerse en el orden en
                        que se navega, no porque haga falta: React Router puntúa
                        por encima el segmento estático, y ningún módulo del
                        catálogo se llama «atencion». */}
                    <Route path="/atencion/:codigo" element={<Atencion />} />
                    <Route path="/:moduloId" element={<HubDeModulo />} />
                    <Route path="/:moduloId/:ranura" element={<Pantalla />} />
                    {/* El registro abierto va en la ruta, no en el estado: pegar el
                      enlace de una ficha en otra pestana abre esa misma ficha. */}
                    <Route path="/:moduloId/:ranura/:codigo" element={<Pantalla />} />
                  </Route>
                </Routes>
              </Router>
            </PuertaDeSesion>
          </ProveedorDePreferencias>
        </ProveedorDeEjercicio>
      </ProveedorDeSesion>
    </QueryClientProvider>
  );
}
