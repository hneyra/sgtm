import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Aviso, Esqueleto } from '@sgtm/design-system';
import { ProblemaDeApi } from '@sgtm/api-client';
import type { ValorDeCampo } from '@sgtm/api-client';
import { opcionPorRuta, pantallaDe, seccionesDe } from '../catalogo';
import { useDatosDePantalla } from './useDatosDePantalla';
import { BarraDeAcciones } from './bloques/BarraDeAcciones';
import { Filtros } from './bloques/Filtros';
import { Formulario } from './bloques/Formulario';
import { Indicadores } from './bloques/Indicadores';
import { Portal } from './bloques/Portal';
import { Reporte } from './bloques/Reporte';
import { TablaDePantalla } from './bloques/TablaDePantalla';
import { Totales } from './bloques/Totales';

/**
 * **El renderizador.** Una sola pantalla para las 134 del manual.
 *
 * FRO-03 §2 lo dice sin rodeos: no se escriben 134 pantallas a mano. El
 * prototipo las declara como datos y este componente compone, en el orden que
 * fija FRO-03 §5, los bloques que cada descriptor declare.
 *
 * La division del trabajo, que es lo unico que hay que entender de este
 * archivo:
 *
 * - **el catalogo** dice que bloques hay y como son (que campos, que columnas);
 * - **la API** dice que dicen (que valores, que filas, que totales).
 *
 * Por eso la pantalla se dibuja entera antes de que llegue la respuesta —el
 * esqueleto ocupa el sitio exacto de cada dato— y por eso conectar el backend
 * no es reescribir nada: es apagar el proxy.
 */
export function Pantalla() {
  const { moduloId = '', ranura = '' } = useParams();
  const opcion = opcionPorRuta(moduloId, ranura);
  const estructura = opcion ? pantallaDe(opcion.id) : undefined;

  if (!estructura) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  return <Contenido key={estructura.id} estructura={estructura} />;
}

function Contenido({
  estructura,
}: {
  readonly estructura: NonNullable<ReturnType<typeof pantallaDe>>;
}) {
  const [pestana, fijarPestana] = useState(0);
  const [cerradas, fijarCerradas] = useState<Readonly<Record<string, boolean>>>({});
  const consulta = useDatosDePantalla(estructura);

  const cargando = consulta.isPending;
  const datos = consulta.data;
  const valores: Readonly<Record<string, ValorDeCampo>> = datos?.campos ?? {};
  const secciones = seccionesDe(estructura, pestana);

  if (consulta.isError) {
    const problema = consulta.error instanceof ProblemaDeApi ? consulta.error : null;
    return (
      <Aviso
        tipo="error"
        // El backend redacta el mensaje en castellano y en lenguaje del dominio
        // (RNF-080); aqui no se reescribe ni se sustituye por uno generico.
        titulo={problema?.titulo ?? 'No se pudieron cargar los datos'}
        detalle={problema?.detalle ?? 'Vuelve a intentarlo; si persiste, avisa a soporte.'}
        traza={problema?.traza}
      />
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      {estructura.kind === 'dash' && (
        <Indicadores kpis={datos?.kpis} paneles={datos?.paneles} cargando={cargando} />
      )}

      {estructura.kind === 'portal' && <Portal pasos={estructura.steps ?? []} />}

      {estructura.filtros && (
        <Filtros
          campos={estructura.filtros}
          valores={valores}
          cargando={consulta.isFetching}
          onBuscar={() => void consulta.refetch()}
        />
      )}

      {estructura.tabla && (
        <TablaDePantalla estructura={estructura.tabla} datos={datos?.tabla} cargando={cargando} />
      )}

      {estructura.totales && (
        <Totales
          estructura={estructura.totales}
          datos={datos?.totales}
          fechaCalculo={datos?.fechaCalculo}
        />
      )}

      {estructura.tabs && estructura.tabs.length > 0 && (
        <div className="sgtm-pestanas" role="tablist" aria-label="Secciones de la pantalla">
          {estructura.tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={i === pestana}
              className="sgtm-pestanas__tab"
              data-activa={i === pestana ? '1' : '0'}
              onClick={() => {
                fijarPestana(i);
                // Cambiar de pestana resetea el colapso, como en el prototipo.
                fijarCerradas({});
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {secciones.length > 0 && (
        <Formulario
          secciones={secciones}
          valores={valores}
          cargando={cargando}
          cerradas={cerradas}
          pestana={pestana}
          onAlternar={(clave, cerrada) =>
            fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
          }
        />
      )}

      {estructura.kind === 'report' && estructura.reporte && (
        <Reporte estructura={estructura.reporte} datos={datos?.reporte} cargando={cargando} />
      )}

      {cargando && !estructura.kind && !estructura.tabla && secciones.length === 0 && (
        <Esqueleto alto={120} />
      )}

      {estructura.acciones && <BarraDeAcciones acciones={estructura.acciones} />}
    </>
  );
}
