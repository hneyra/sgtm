import { useEffect } from 'react';
import { Campo } from '@sgtm/design-system';
import type { ResolutorProps } from '../composicion';

/**
 * **El número de la notificación administrativa, que el manual teclea en tres
 * campos y la base guarda en uno** (#428, #422).
 *
 * `notificacion_administrativa` tiene `notif_adm_numero_uq UNIQUE
 * (municipalidad_id, numero)` (V4): el número **es** la identidad de la fila.
 * Y `NotificacionAdministrativa.numero` es **un** `varchar(20)`, mientras la
 * sección «Datos de la notificación» del prototipo lo teclea en tres —Serie,
 * Año y Número—.
 *
 * Declarar sólo «Número» dejaría la serie tecleada y sin viajar, que es el
 * defecto que #331 cerró en el alta de deuda; y en esta tabla además **choca**:
 * `001-004183` y `002-004183` se guardarían los dos como `004183`, así que la
 * segunda serie no se podría registrar.
 *
 * **El separador no se inventa aquí.** El propio manual imprime el número
 * compuesto en la columna «Serie-Nº» de esta misma pantalla —`001-004182`— y en
 * el padrón de notificaciones. Lo que hace este control es escribirlo así: lee
 * la serie del formulario (`contexto`), dibuja el «Número» que el catálogo ya
 * declara, y fija el compuesto —lo único que viaja—. El año se queda fuera
 * porque el número del manual no lo lleva.
 *
 * Sin componente no se podía: `CampoDelCuerpo.valor` traduce **un** campo, no
 * junta dos, y un control añadido (`ComposicionDeOpcion.controles`) tendría que
 * pedir el número entero al lado de los tres campos que el manual ya dibuja.
 */

/** Serie y número, como el manual los imprime. Vacío si falta cualquiera de los dos. */
export const numeroDeLaNotificacion = (serie: string, numero: string): string => {
  const partes = [serie.trim(), numero.trim()];
  return partes.some((parte) => parte === '') ? '' : partes.join('-');
};

export function ResolutorDelNumeroDeNotificacion({
  etiqueta,
  resuelto,
  contexto,
  onCampo,
  bloqueado,
}: ResolutorProps) {
  const serie = contexto['serie2'] ?? '';
  const escrito = resuelto['numeroDeLaNotificacion'] ?? '';
  const compuesto = numeroDeLaNotificacion(serie, escrito);

  /* **Se recompone también cuando cambia la serie**, no sólo al teclear el
     número: sin esto, corregir la serie después de escribir el número dejaría
     viajando el compuesto anterior —el defecto silencioso, otra vez—. El efecto
     no lleva lista de dependencias a propósito: corre tras cada dibujo y
     **escribe sólo si cambió**, así que no hay bucle. */
  useEffect(() => {
    if ((resuelto['numeroCompuesto'] ?? '') !== compuesto) onCampo('numeroCompuesto', compuesto);
  });

  return (
    <div className="sgtm-resolutor">
      <Campo
        etiqueta={etiqueta}
        tipo="text"
        valor={escrito}
        bloqueado={bloqueado}
        ph="004183"
        ayuda="El número se guarda junto con su serie, como el manual lo imprime: «001-004183». El año no entra en él."
        onCambio={(valor) => onCampo('numeroDeLaNotificacion', valor)}
      />
      <p className="sgtm-resolutor__nota" role="status">
        {compuesto === ''
          ? 'Escribe la serie y el número: la notificación se guarda con los dos juntos.'
          : `Se guardará como «${compuesto}».`}
      </p>
    </div>
  );
}
