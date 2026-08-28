import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Aviso } from '@sgtm/design-system';
import { ProveedorDeSesion, PuertaDeSesion } from '@sgtm/sesion';
import { Portal } from './Portal';

/**
 * **El portal del contribuyente, fuera del shell del back-office** (#298,
 * ADR-0016 §3).
 *
 * Lo que aqui NO hay es lo que justifica que exista: no hay catalogo de
 * navegacion —doce modulos, 134 opciones, ~11,5 KB que el ciudadano se
 * descargaba para no usarlos nunca (#81)—, no hay barra lateral, no hay paleta
 * de comandos, no hay enrutador y no hay una sola escritura. Hay **una**
 * pantalla: la consulta de una persona, en solo lectura y en un telefono.
 *
 * ── Por que se separa por la condicion 3 de ADR-0009, y no por la 1 ────────
 *
 * ADR-0009 pide **cualquiera** de sus tres condiciones, y la que se cumple hoy
 * es la tercera: el paquete del portal arrastraba codigo que solo usa el
 * back-office. **La primera y la segunda siguen sin cumplirse**, y eso decide lo
 * que aqui se puede construir: no existe realm ciudadano, no hay sesion propia
 * del contribuyente y **ninguna lectura se abre al publico por este camino**.
 *
 * Mientras tanto el portal se sirve **tras la misma puerta de sesion del
 * funcionario** —la de `@sgtm/sesion`, la que ya existia, no una nueva—: es la
 * marcha blanca en la que quien atiende previsualiza lo que vera el ciudadano.
 * Por eso el aviso de {@link SinAccesoDelCiudadano} no ofrece un boton de
 * entrar: el `redirect_uri` del proveedor es la raiz del origen y devolveria al
 * back-office, y sobre todo porque la puerta del ciudadano todavia no existe.
 *
 * ── Y la opcion `portal` de las 134 sigue donde estaba ─────────────────────
 *
 * En el back-office, con su id, su ruta y su permiso: es la vista del
 * funcionario. Esta aplicacion no la sustituye ni la borra —las 134 siguen
 * siendo 134—; servira al ciudadano el dia que exista el realm que lo
 * autentique (ADR-0016 §3).
 */
export function crearClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Lo mismo que el back-office: la deuda de una persona no cambia entre
        // dos pulsaciones de la misma pantalla.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

const cliente = crearClienteDeConsultas();

/**
 * Sin sesion, y sin puerta propia que ofrecer: se dice, no se disimula.
 *
 * Es el acto honesto de esta aplicacion. Un boton de «Iniciar sesión» aqui
 * llevaria al ciudadano a un formulario del realm de **funcionarios**, y de
 * vuelta al back-office: prometeria un acceso que no existe.
 */
function SinAccesoDelCiudadano() {
  return (
    <Aviso
      titulo="Todavía no hay acceso del ciudadano"
      detalle="Este portal se sirve, por ahora, tras la sesión de quien atiende en la municipalidad: es una vista previa, no el acceso público. El acceso propio del contribuyente —con su propia identificación— está pendiente y no se puede usar todavía."
    />
  );
}

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorDeSesion>
        <PuertaDeSesion anonima={<SinAccesoDelCiudadano />}>
          <Portal />
        </PuertaDeSesion>
      </ProveedorDeSesion>
    </QueryClientProvider>
  );
}
