import { useEffect, useRef, useState } from 'react';
import type { AgrupacionDelPlano, LoteDelPlano, Marco } from './plano';
import { claveDeAgrupacion } from './plano';

/**
 * El lienzo del plano: **lo unico que carga Leaflet** (#500, ADR-0022 §4).
 *
 * <h2>Por que `import()` y no un `import` de arriba</h2>
 *
 * Leaflet es la primera dependencia de terceros con peso del frontend, y el
 * presupuesto de arranque anda pegado a su tope. Cargandola aqui, dentro de un
 * efecto, viaja en su propio trozo y **solo la descarga quien abre el mapa**:
 * quien entra a mirar un recibo no baja un motor de mapas. Es lo mismo que
 * #433 dejo escrito para los trozos por modulo, un escalon mas abajo.
 *
 * <h2>Las teselas son la referencia, no el dato</h2>
 *
 * El plano son los poligonos, que llegan por HTTP del mismo servidor que todo lo
 * demas. Las teselas de OpenStreetMap solo dicen que hay alrededor, y **si no
 * cargan el plano se dibuja igual**: una municipalidad sin salida a internet es
 * lo corriente, y el visor no puede depender de un tercero para enseñar el
 * catastro. Por eso el origen se puede cambiar (`VITE_SGTM_TESELAS`), y por eso
 * la atribucion se dibuja siempre que las teselas se usen: es su licencia.
 *
 * <h2>Y por que el lienzo esta oculto para el lector de pantalla</h2>
 *
 * Un plano de teselas no tiene contenido que un lector de pantalla pueda leer, y
 * anunciarlo como si lo tuviera es peor que callar. Lo que hace equivalente esta
 * pantalla no es el mapa: es la **lista de lotes** que la superficie dibuja al
 * lado, que es navegable con el teclado y selecciona el mismo lote. Marcarlo
 * `aria-hidden` dice eso mismo (RNF-082).
 */
export interface PlanoConLeafletProps {
  readonly lotes: readonly LoteDelPlano[];
  readonly seleccionado: number | null;
  readonly agrupacion: AgrupacionDelPlano;
  readonly onSeleccionar: (predioId: number) => void;
  readonly marcoInicial: Marco;
}

/** El origen de las teselas, cambiable por la instalacion que no salga a internet. */
const TESELAS =
  (import.meta.env['VITE_SGTM_TESELAS'] as string | undefined) ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** La atribucion de OpenStreetMap, que **no** es adorno: es la licencia ODbL. */
const ATRIBUCION =
  '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Los colores con los que se agrupa, del design system.
 *
 * Se reparten por orden de aparicion y **se repiten** cuando hay mas grupos que
 * colores: un color no identifica una manzana —para eso esta su rotulo—, dice
 * que dos lotes son de la misma. Inventar un color por manzana daria una paleta
 * de mil entradas indistinguibles entre si.
 */
const COLORES = ['#2f5d8a', '#8a5a2f', '#4d7a4a', '#6b5b95', '#a1662f', '#3f7f8a'] as const;

const colorDelGrupo = (clave: string | null, grupos: readonly string[]): string => {
  if (clave === null) return '#8a8378';
  const posicion = grupos.indexOf(clave);
  return COLORES[posicion % COLORES.length] ?? '#8a8378';
};

export function PlanoConLeaflet({
  lotes,
  seleccionado,
  agrupacion,
  onSeleccionar,
  marcoInicial,
}: PlanoConLeafletProps) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<unknown>(null);
  const capaDeLotes = useRef<unknown>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-biblioteca'>('cargando');

  /* La seleccion se lee desde el manejador de clic sin volver a suscribirlo:
     re-crear las capas en cada seleccion tiraria el encuadre del usuario. */
  const alSeleccionar = useRef(onSeleccionar);
  alSeleccionar.current = onSeleccionar;

  useEffect(() => {
    let vivo = true;
    let instancia: { remove: () => void } | null = null;

    void (async () => {
      let L: typeof import('leaflet');
      try {
        await import('leaflet/dist/leaflet.css');
        L = await import('leaflet');
      } catch {
        // La biblioteca no llego. No es un error del padron ni de la sesion, y
        // decirlo asi es lo que permite que la pantalla siga siendo util: la
        // lista de lotes de al lado no depende de esto.
        if (vivo) setEstado('sin-biblioteca');
        return;
      }
      if (!vivo || contenedor.current === null) return;

      const mapaNuevo = L.map(contenedor.current, { attributionControl: true }).fitBounds([
        [marcoInicial.sur, marcoInicial.oeste],
        [marcoInicial.norte, marcoInicial.este],
      ]);
      L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19 }).addTo(mapaNuevo);
      instancia = mapaNuevo;
      mapa.current = mapaNuevo;
      setEstado('listo');
    })();

    return () => {
      vivo = false;
      instancia?.remove();
      mapa.current = null;
      capaDeLotes.current = null;
    };
    // El marco inicial se aplica **una vez**: despues manda el encuadre del
    // usuario, y volver a aplicarlo le moveria el mapa bajo el raton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (estado !== 'listo' || mapa.current === null) return;
    let cancelado = false;

    void (async () => {
      const L = await import('leaflet');
      if (cancelado || mapa.current === null) return;
      const instancia = mapa.current as import('leaflet').Map;

      if (capaDeLotes.current !== null) {
        instancia.removeLayer(capaDeLotes.current as import('leaflet').Layer);
      }
      const grupos = [
        ...new Set(
          lotes
            .map((lote) => claveDeAgrupacion(lote, agrupacion))
            .filter((clave): clave is string => clave !== null),
        ),
      ].sort();

      const capa = L.geoJSON(
        {
          type: 'FeatureCollection',
          features: lotes.map((lote) => ({
            type: 'Feature' as const,
            properties: { predioId: lote.predioId },
            geometry: lote.geometria as never,
          })),
        } as never,
        {
          style: (rasgo) => {
            const predioId = (rasgo?.properties as { predioId?: number } | undefined)?.predioId;
            const lote = lotes.find((l) => l.predioId === predioId);
            const elegido = predioId === seleccionado;
            return {
              color: elegido ? '#1c3d5a' : '#5a5148',
              weight: elegido ? 3 : 1,
              fillColor:
                lote === undefined
                  ? '#8a8378'
                  : colorDelGrupo(claveDeAgrupacion(lote, agrupacion), grupos),
              fillOpacity: elegido ? 0.65 : 0.35,
            };
          },
          onEachFeature: (rasgo, capaDelRasgo) => {
            const predioId = (rasgo.properties as { predioId?: number } | undefined)?.predioId;
            if (predioId === undefined) return;
            capaDelRasgo.on('click', () => alSeleccionar.current(predioId));
          },
        },
      ).addTo(instancia);
      capaDeLotes.current = capa;
    })();

    return () => {
      cancelado = true;
    };
  }, [lotes, seleccionado, agrupacion, estado]);

  return (
    <div className="sgtm-plano__lienzo">
      {/* `aria-hidden`: el equivalente accesible es la lista de lotes, no esto. */}
      <div ref={contenedor} className="sgtm-plano__mapa" aria-hidden="true" />
      {estado === 'sin-biblioteca' && (
        <p className="sgtm-plano__sin-mapa" role="status">
          No se pudo cargar el visor de mapas. Los lotes de este marco siguen en la lista de al
          lado, con sus datos y sus salidas.
        </p>
      )}
    </div>
  );
}
