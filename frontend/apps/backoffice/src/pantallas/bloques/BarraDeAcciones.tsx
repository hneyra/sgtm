import { Boton } from '@sgtm/design-system';

/**
 * Barra de acciones fija al fondo (FRO-03 §5, bloque 10). **La ultima accion es
 * la primaria**, como en el prototipo.
 *
 * Ninguna envia nada todavia, y por una razon que no es la falta de backend:
 * **toda modificacion de datos exige una observacion del usuario** (regla 10 de
 * CLAUDE.md, RNF-052) y ese campo se conecta pantalla por pantalla junto con su
 * operacion. Un boton que guardara sin observacion seria un defecto del
 * formulario, no una funcionalidad a medias.
 */
export interface BarraDeAccionesProps {
  readonly acciones: readonly string[];
}

export function BarraDeAcciones({ acciones }: BarraDeAccionesProps) {
  return (
    <div className="sgtm-acciones" data-no-imprimible="1">
      {acciones.map((accion, i) => (
        <Boton
          key={accion}
          variante={i === acciones.length - 1 ? 'primario' : 'secundario'}
          disabled
          title="La operación se conecta junto con su campo de observación (RNF-052)"
        >
          {accion}
        </Boton>
      ))}
    </div>
  );
}
