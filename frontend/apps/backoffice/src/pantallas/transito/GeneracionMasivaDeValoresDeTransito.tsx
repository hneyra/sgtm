import { Aviso, Campo } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { SIN_PERMISO } from '../estados';

/**
 * Generación masiva de valores de tránsito: `POST /transito/valores/generacion-masiva`
 * (#53, RF-066, RF-073, #77).
 *
 * **Por qué su propio componente**: el catálogo dibuja las acciones de esta pantalla como
 * `["Nuevo", "Modificar", "Guardar", "Procesar", "Anular", "Imprimir"]` —son las de la
 * ficha «Criterios registrados» del manual, no las de este acto—, y la última es
 * «Imprimir», que no registra ninguna corrida. Con una barra propia de una sola acción —
 * «Generar valores», siempre la primaria— el botón que escribe es el único que hay.
 *
 * **Registra el criterio; no emite ni un valor.** `IniciarCorridaDeValores` deja la
 * emisión para el perfil batch (ADR-0003), igual que `POST /valores/masivo` (#38): la
 * respuesta trae `totalCandidatos`, el conteo que el servidor calculó al registrar, y eso
 * es lo único que se muestra como resultado.
 *
 * **Solo por rango de fechas.** El catálogo no dibuja ninguna lista ni selección múltiple
 * de papeletas —«Papeleta», en «Recaudo / papeletas», es un único campo de texto—, así que
 * no hay de dónde sacar el arreglo `papeletas[]` que el modo «por selección» del contrato
 * exige. `GeneracionMasivaDeValoresController` rechaza con 422 si llegan los dos modos a
 * la vez o ninguno, y aquí solo se declara el de rango (ver `escrituras.ts`).
 */
export function GeneracionMasivaDeValoresDeTransito({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);

  const escritura = useEscritura(
    puedeEscribirAqui ? 'transito_valores' : undefined,
    {},
    {
      campos: declarada?.campos ?? {},
      exigir: declarada?.exigir,
    },
  );

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Criterio de la corrida</h2>
        </div>
        <Campo
          etiqueta="Fec. inicio"
          tipo="date"
          valor={escritura.borrador['fecInicio'] ?? ''}
          bloqueado={!escritura.campos.has('fecInicio')}
          {...(escritura.errorPorCampo['fecInicio'] === undefined
            ? {}
            : { error: escritura.errorPorCampo['fecInicio'] })}
          onCambio={(valor) => escritura.fijarCampo('fecInicio', valor)}
        />
        <Campo
          etiqueta="Fec. fin"
          tipo="date"
          valor={escritura.borrador['fecFin'] ?? ''}
          bloqueado={!escritura.campos.has('fecFin')}
          {...(escritura.errorPorCampo['fecFin'] === undefined
            ? {}
            : { error: escritura.errorPorCampo['fecFin'] })}
          onCambio={(valor) => escritura.fijarCampo('fecFin', valor)}
        />
        <p className="sgtm-descripcion">
          Las papeletas pendientes de pago en este rango de fechas de infracción entran a la
          corrida. El código de criterio, el tipo de recaudo, el vencimiento y la oficina que dibuja
          el catálogo no los acepta este endpoint todavía.
        </p>
      </section>

      <BarraDeAcciones acciones={['Generar valores']} escritura={escritura} />
    </>
  );
}
