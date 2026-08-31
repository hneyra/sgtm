import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Aviso, Boton } from '@sgtm/design-system';
import { ProveedorDeSesion, PuertaDeSesion, useSesion } from '@sgtm/sesion';
import { Portal } from './Portal';

/**
 * **El portal del contribuyente, con sesion propia y fuera del shell** (#57,
 * #298, ADR-0016 §3, ADR-0020).
 *
 * Lo que aqui NO hay sigue siendo lo que justifica que exista: no hay catalogo
 * de navegacion —doce modulos, 134 opciones, ~11,5 KB que el ciudadano se
 * descargaba para no usarlos nunca—, no hay barra lateral, no hay paleta de
 * comandos, no hay enrutador y no hay una sola escritura. Hay **una** pantalla:
 * lo que esta persona debe y tiene, en solo lectura y en un telefono.
 *
 * ── Lo que cambia con ADR-0020: ya hay puerta ──────────────────────────────
 *
 * Hasta aqui esta aplicacion se servia **tras la sesion del funcionario** —era
 * la marcha blanca, y por eso mostraba un aviso honesto diciendo que el acceso
 * del ciudadano no existia—. Ahora existe: hay un realm propio
 * (`sgtm-ciudadano`), con **emisor distinto**, y la puerta de siempre lleva a el
 * porque {@link ProveedorDeSesion} recibe `quienEntra="ciudadano"`.
 *
 * Eso retira dos cosas a la vez: el aviso de «todavia no hay acceso» —que con la
 * puerta puesta seria falso— y el motivo por el que el boton de entrar no se
 * dibujaba, que era que el `redirect_uri` del proveedor volvia al back-office.
 * El del ciudadano vuelve a `/portal/`.
 *
 * ── Y la opcion `portal` de las 134 sigue donde estaba ─────────────────────
 *
 * En el back-office, con su id, su ruta y su permiso: es la vista del
 * funcionario. Esta aplicacion no la sustituye ni la borra —las 134 siguen
 * siendo 134—, y **no** se le sirve `/portal/**` a un funcionario: seria
 * devolver el endpoint de enumeracion que ADR-0020 retira.
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
 * Sin sesion todavia, **y con la puerta puesta**.
 *
 * Es la invitacion del ciudadano, no la del funcionario: al otro lado no hay una
 * sesion de trabajo que atribuya cambios —de aqui no sale ni una escritura—,
 * hay su propia deuda. Por eso no se reutiliza la de {@link PuertaDeSesion}.
 *
 * El boton lleva al realm del ciudadano y vuelve a `/portal/`: lo resuelve
 * `configuracionDelCiudadano`, y es lo que hasta ADR-0020 no se podia ofrecer.
 */
function EntrarComoCiudadano() {
  const sesion = useSesion();
  return (
    <Aviso
      titulo="Entra para ver tu deuda"
      detalle="Aquí ves lo que las municipalidades tienen registrado a tu nombre. Entras con la cuenta que te dieron en la municipalidad, y no hace falta que teclees tu documento: lo trae tu propia sesión."
    >
      <Boton variante="primario" onClick={sesion.entrar}>
        Iniciar sesión
      </Boton>
    </Aviso>
  );
}

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      {/* La otra poblacion, y la puerta que le corresponde (ADR-0020): otro
          realm, otro emisor y otra vuelta. Sin esta prop el ciudadano acabaria
          en el formulario de los funcionarios, con un token que el portal no
          puede usar —la cadena del portal valida contra el otro emisor—. */}
      <ProveedorDeSesion quienEntra="ciudadano">
        <PuertaDeSesion anonima={<EntrarComoCiudadano />}>
          <Portal />
        </PuertaDeSesion>
      </ProveedorDeSesion>
    </QueryClientProvider>
  );
}
