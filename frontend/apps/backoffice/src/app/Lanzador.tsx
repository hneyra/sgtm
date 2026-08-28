import { useNavigate } from 'react-router-dom';
import { Icono, IconoDeModulo } from '@sgtm/design-system';
import { conteoDeOpciones, rutaDeModulo } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import { MenuDeCabecera } from './MenuDeCabecera';

/**
 * El lanzador de modulos: la rejilla de nueve puntos de la cabecera
 * (ADR-0014 §2, el patron de Google Workspace / Microsoft 365).
 *
 * Lista los modulos del **catalogo visible**, no del catalogo entero: un
 * modulo sin opciones visibles no aparece, que es la misma regla que ya
 * cumplen la barra lateral, el hub y la paleta (REQ-03 §5). Las rutas no
 * cambian: elegir un modulo lleva a su hub de siempre.
 *
 * Se ve tambien en movil: con la barra lateral plegada en cajon, es la
 * puerta corta a los modulos.
 *
 * El desplegable —teclado, foco y ARIA— es el de `MenuDeCabecera`; aqui solo
 * queda lo que distingue al lanzador: la fila de dos lineas de cada modulo.
 *
 * ── La primera entrada es el inicio, y no es un modulo ─────────────────────
 *
 * Desde #296 `/` es la pregunta de a quien se atiende, y **no es una opcion del
 * catalogo**: no publica lectura ni permiso propios. Eso la dejaba fuera del
 * menu, de la paleta y de aqui, con la marca de la barra lateral como unico
 * camino de vuelta —y la barra se pliega en movil—. El lanzador es la puerta
 * corta de la cabecera, asi que el inicio va aqui, el primero.
 *
 * **Va siempre que el lanzador se dibuje**, y no solo si algun padron es
 * visible. El filtro de REQ-03 §5 es sobre opciones con permiso, y esta no tiene
 * ninguno que comprobar: es el inicio del shell, el mismo sitio al que lleva la
 * marca, que tampoco se esconde. Atarlo a un permiso que no lo gobierna dejaria
 * sin camino de vuelta a quien mas lo necesita —el que entro por un enlace y se
 * quedo a media pantalla—, y la pregunta ya dice ella misma, y con el rotulo del
 * catalogo, que consultas del padron le faltan a su perfil.
 */
const CLASES = {
  contenedor: 'sgtm-lanzador',
  boton: 'sgtm-lanzador__boton',
  panel: 'sgtm-lanzador__panel',
  entrada: 'sgtm-lanzador__modulo',
};

export function Lanzador() {
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();
  const modulos = catalogo.modulos;

  // Sin ningun modulo visible no hay nada que lanzar, y un boton que abre un
  // panel vacio prometeria lo que los permisos niegan.
  if (modulos.length === 0) return null;

  return (
    <MenuDeCabecera
      clases={CLASES}
      etiquetaDelBoton="Abrir los módulos"
      // No «Módulos del sistema»: ese nombre ya es el del `<nav>` raiz de la
      // barra lateral, y dos regiones con el mismo nombre no se distinguen.
      etiquetaDelPanel="Lanzador de módulos"
      entradas={[
        {
          id: 'inicio-de-atencion',
          elegir: () => navegar('/'),
          contenido: (
            <>
              <span className="sgtm-lanzador__icono">
                <Icono nombre="lupa" tamano={16} />
              </span>
              <span className="sgtm-lanzador__texto">
                {/* Con el mismo nombre que el titulo de la pantalla y que la
                    marca de la barra: una puerta se nombra como el sitio al que
                    lleva. No «Inicio» a secas, que es ademas el rotulo de un
                    modulo del catalogo y se leerian igual dos entradas. */}
                <span className="sgtm-lanzador__etiqueta">¿A quién atiendes?</span>
                <span className="sgtm-lanzador__conteo">Inicio</span>
              </span>
            </>
          ),
        },
        ...modulos.map((modulo) => ({
          id: modulo.id,
          elegir: () => navegar(rutaDeModulo(modulo)),
          contenido: (
            <>
              <span className="sgtm-lanzador__icono">
                <IconoDeModulo trazos={modulo.icono} tamano={16} />
              </span>
              <span className="sgtm-lanzador__texto">
                <span className="sgtm-lanzador__etiqueta">{modulo.label}</span>
                <span className="sgtm-lanzador__conteo">{conteoDeOpciones(modulo)}</span>
              </span>
            </>
          ),
        })),
      ]}
    >
      <Icono nombre="nuevePuntos" tamano={18} />
    </MenuDeCabecera>
  );
}
