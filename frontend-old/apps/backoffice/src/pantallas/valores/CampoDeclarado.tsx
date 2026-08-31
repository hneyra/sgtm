import { Campo } from '@sgtm/design-system';
import type { Escritura } from '../escritura';

/**
 * Un campo plano ligado a una escritura declarada, tal como lo repiten las
 * cuatro pantallas propias de Valores (#75). Un solo componente en vez de
 * cuatro copias casi iguales, por lo mismo que `alcance` es un solo prop en
 * `BarraDeAcciones`: menos bytes en el arranque, y una sola forma de errar.
 */
export function CampoDeclarado({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  opciones,
  ayuda,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel' | 'date';
  readonly opciones?: readonly string[];
  readonly ayuda?: string;
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      tipo={tipo}
      valor={escritura.borrador[campo] ?? ''}
      bloqueado={!escritura.campos.has(campo)}
      {...(tipo === 'sel' ? { eleccionObligatoria: true } : {})}
      {...(opciones === undefined ? {} : { opciones })}
      {...(ayuda === undefined ? {} : { ayuda })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}
