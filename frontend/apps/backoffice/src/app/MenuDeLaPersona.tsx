import { useNavigate } from 'react-router-dom';
import { rutaDeModulo } from '../catalogo';
import { usePreferencias } from './preferencias';
import { useSesion } from './sesion/ProveedorDeSesion';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import { useMenuDeCabecera } from './useMenuDeCabecera';

/**
 * El menu de la persona: el usuario de la cabecera abre lo suyo (ADR-0014 §3).
 *
 * Cada entrada existe **solo si opera de verdad** —sin sesion, el menu dice la
 * verdad—:
 *
 * - «Cambiar el año de trabajo» es la opcion `cambiar_anio` de Seguridad, y se
 *   resuelve por el catalogo visible: si los permisos no la dejan ver, no esta.
 * - «Seguridad» es la ruta del modulo, si es visible. El modulo conserva su
 *   entrada en el lanzador: dos puertas, mismo permiso, misma pantalla.
 * - «Cerrar sesión» solo con sesion abierta, con el cierre que expone
 *   `ProveedorDeSesion` (`salir`).
 *
 * Si no queda ninguna entrada, el usuario se muestra como hasta ahora: un
 * chip, no un boton que no abre nada.
 */

interface EntradaDelMenu {
  readonly id: string;
  readonly etiqueta: string;
  readonly elegir: () => void;
}

export function MenuDeLaPersona() {
  const navegar = useNavigate();
  const { preferencias } = usePreferencias();
  const sesion = useSesion();
  const catalogo = useCatalogoVisible();

  const quien = sesion.datos?.usuario ?? 'Sin sesión';
  const donde = sesion.datos?.municipalidad ?? preferencias.entidad;

  const entradas: EntradaDelMenu[] = [];
  // La opcion se busca por su identificador de catalogo —la clave del
  // permiso—, no por una ruta cableada: si manana cambia de ranura, esta
  // puerta la sigue.
  const cambiarAnio = catalogo.opciones.find((opcion) => opcion.id === 'cambiar_anio');
  if (cambiarAnio) {
    entradas.push({
      id: cambiarAnio.id,
      etiqueta: cambiarAnio.title,
      elegir: () => navegar(cambiarAnio.ruta),
    });
  }
  const seguridad = catalogo.modulos.find((modulo) => modulo.id === 'seguridad');
  if (seguridad) {
    entradas.push({
      id: seguridad.id,
      etiqueta: seguridad.label,
      elegir: () => navegar(rutaDeModulo(seguridad)),
    });
  }
  if (sesion.datos !== null) {
    entradas.push({ id: 'salir', etiqueta: 'Cerrar sesión', elegir: sesion.salir });
  }

  const menu = useMenuDeCabecera(entradas.length, (indice) => entradas[indice]?.elegir());

  const chip = (
    <>
      <span className="sgtm-cabecera__avatar" aria-hidden="true">
        {iniciales(quien)}
      </span>
      <span className="sgtm-cabecera__identidad">
        <span className="sgtm-cabecera__nombre">{quien}</span>
        <span className="sgtm-cabecera__rol">{donde}</span>
      </span>
    </>
  );

  // Sin ninguna entrada que operar, el boton no se dibuja como boton.
  if (entradas.length === 0) {
    return <div className="sgtm-cabecera__usuario">{chip}</div>;
  }

  return (
    <div className="sgtm-menu-persona" ref={menu.contenedor}>
      <button
        type="button"
        ref={menu.boton}
        className="sgtm-cabecera__usuario sgtm-menu-persona__boton"
        aria-label="Abrir el menú personal"
        aria-haspopup="menu"
        aria-expanded={menu.abierto}
        onClick={menu.alternar}
        onKeyDown={menu.alTeclear}
      >
        {chip}
      </button>
      {menu.abierto && (
        // El teclado tambien se atiende aqui por si el foco entro a una
        // entrada con Tab: las flechas siguen recorriendo el menu.
        <div
          className="sgtm-menu-persona__panel"
          role="menu"
          aria-label="Menú personal"
          onKeyDown={menu.alTeclear}
          // Focalizable por codigo, nunca por Tab: el foco vive en el boton.
          tabIndex={-1}
        >
          {entradas.map((entrada, i) => (
            <button
              key={entrada.id}
              type="button"
              role="menuitem"
              className="sgtm-menu-persona__entrada"
              data-elegido={i === menu.activo ? '1' : '0'}
              aria-current={i === menu.activo ? 'true' : undefined}
              onClick={() => {
                entrada.elegir();
                menu.cerrar();
              }}
            >
              {entrada.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** «María Quispe» → «MQ». Sin sesion, el hueco no se rellena con nada inventado. */
function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}
