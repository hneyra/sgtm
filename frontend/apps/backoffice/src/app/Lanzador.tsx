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
      entradas={modulos.map((modulo) => ({
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
      }))}
    >
      <Icono nombre="nuevePuntos" tamano={18} />
    </MenuDeCabecera>
  );
}
