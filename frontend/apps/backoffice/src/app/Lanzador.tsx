import { useNavigate } from 'react-router-dom';
import { Icono, IconoDeModulo } from '@sgtm/design-system';
import { rutaDeModulo } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import { useMenuDeCabecera } from './useMenuDeCabecera';

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
 */
export function Lanzador() {
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();
  const modulos = catalogo.modulos;
  const menu = useMenuDeCabecera(modulos.length, (indice) => {
    const modulo = modulos[indice];
    if (modulo) navegar(rutaDeModulo(modulo));
  });

  // Sin ningun modulo visible no hay nada que lanzar, y un boton que abre un
  // panel vacio prometeria lo que los permisos niegan.
  if (modulos.length === 0) return null;

  return (
    <div className="sgtm-lanzador" ref={menu.contenedor}>
      <button
        type="button"
        ref={menu.boton}
        className="sgtm-lanzador__boton"
        aria-label="Abrir los módulos"
        aria-haspopup="menu"
        aria-expanded={menu.abierto}
        onClick={menu.alternar}
        onKeyDown={menu.alTeclear}
      >
        <Icono nombre="nuevePuntos" tamano={18} />
      </button>
      {menu.abierto && (
        // El teclado tambien se atiende aqui por si el foco entro a una
        // entrada con Tab: las flechas siguen recorriendo el menu.
        <div
          className="sgtm-lanzador__panel"
          role="menu"
          aria-label="Módulos del sistema"
          onKeyDown={menu.alTeclear}
          // Focalizable por codigo, nunca por Tab: el foco vive en el boton.
          tabIndex={-1}
        >
          {modulos.map((modulo, i) => (
            <button
              key={modulo.id}
              type="button"
              role="menuitem"
              className="sgtm-lanzador__modulo"
              data-elegido={i === menu.activo ? '1' : '0'}
              aria-current={i === menu.activo ? 'true' : undefined}
              onClick={() => {
                navegar(rutaDeModulo(modulo));
                menu.cerrar();
              }}
            >
              <span className="sgtm-lanzador__icono">
                <IconoDeModulo trazos={modulo.icono} tamano={16} />
              </span>
              <span className="sgtm-lanzador__texto">
                <span className="sgtm-lanzador__etiqueta">{modulo.label}</span>
                <span className="sgtm-lanzador__conteo">
                  {modulo.opciones.length} {modulo.opciones.length === 1 ? 'opción' : 'opciones'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
