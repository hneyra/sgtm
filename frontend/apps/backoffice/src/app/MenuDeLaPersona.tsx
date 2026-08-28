import { useNavigate } from 'react-router-dom';
import { rutaDeModulo } from '../catalogo';
import { usePreferencias } from './preferencias';
import { useSesion } from './sesion/ProveedorDeSesion';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';
import { MenuDeCabecera } from './MenuDeCabecera';

/**
 * El menu de la persona: el usuario de la cabecera abre lo suyo (ADR-0014 §3).
 *
 * Cada entrada existe **solo si opera de verdad** —sin sesion, el menu dice la
 * verdad—:
 *
 * - «Cambiar el año» es la opcion `cambiar_anio` de Seguridad, y se resuelve
 *   por el catalogo visible: si los permisos no la dejan ver, no esta.
 * - «Seguridad» es la ruta del modulo, si es visible. El modulo conserva su
 *   entrada en el lanzador: dos puertas, mismo permiso, misma pantalla.
 * - «Cerrar sesión» solo con sesion abierta, con el cierre que expone
 *   `ProveedorDeSesion` (`salir`).
 *
 * De las tres entradas que ADR-0014 §3 enumera falta **«Preferencias»**, y es
 * deliberado: todavia no hay panel de preferencias que abrir, y una entrada que
 * no lleva a ningun sitio es peor que no tenerla.
 *
 * Si no queda ninguna entrada, el usuario se muestra como hasta ahora: un
 * chip, no un boton que no abre nada.
 */

interface EntradaDelMenu {
  readonly id: string;
  readonly etiqueta: string;
  readonly elegir: () => void;
}

const CLASES = {
  contenedor: 'sgtm-menu-persona',
  boton: 'sgtm-cabecera__usuario sgtm-menu-persona__boton',
  panel: 'sgtm-menu-persona__panel',
  entrada: 'sgtm-menu-persona__entrada',
};

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
  // puerta la sigue. Se nombra con su `label`, que es como la nombran la
  // barra, la paleta y el lanzador: misma opcion, mismo nombre en cada puerta.
  const cambiarAnio = catalogo.opciones.find((opcion) => opcion.id === 'cambiar_anio');
  if (cambiarAnio) {
    entradas.push({
      id: cambiarAnio.id,
      etiqueta: cambiarAnio.label,
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
    <MenuDeCabecera
      clases={CLASES}
      // El nombre accesible **contiene el nombre visible** (WCAG 2.5.3): quien
      // dicta por voz dice lo que lee, y es ademas el unico sitio de la
      // cabecera que dice quien esta en la caja.
      etiquetaDelBoton={`Menú de ${quien}`}
      etiquetaDelPanel="Menú personal"
      entradas={entradas.map((entrada) => ({
        id: entrada.id,
        contenido: entrada.etiqueta,
        elegir: entrada.elegir,
      }))}
    >
      {chip}
    </MenuDeCabecera>
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
