import { useEffect, useMemo, useState } from 'react';
import './mapa.css';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { pedirOperacion } from '@sgtm/api-client';
import { opcionPorId } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { SIN_PERMISO, textoDeError } from '../estados';
import { SIN_DATO } from '../seguridad/listado';
import { PlanoConLeaflet } from './PlanoConLeaflet';
import type { AgrupacionDelPlano, LoteDelPlano } from './plano';
import { CAPAS, MARCO_INICIAL, casaConLaBusqueda, pedirPlano, rotuloDelLote } from './plano';

/**
 * **El mapa catastral**: el plano como forma principal de encontrar un predio
 * (#500, ADR-0022).
 *
 * <h2>Que es esta pantalla en el catalogo: nada</h2>
 *
 * No es una opcion. Las 134 siguen siendo 134: esto es una **ruta del modulo**
 * —`/catastro/mapa`—, sin id y sin permiso propio, como la portada (ADR-0014
 * §5). Lo que exige es el permiso de **encontrar un predio**, `consulta_fichas`,
 * porque es esa misma busqueda por otro camino; pedir el de actualizar el
 * catastro dejaria sin mapa a quien solo mira.
 *
 * <h2>De las cinco capas del diseño, una tiene con que dibujarse</h2>
 *
 * Y las otras cuatro **lo dicen**, cada una con su motivo medido (ADR-0022 §5).
 * «Manzanas» y «Sectores» no dibujan perimetros —ni `manzana` ni `sector` tienen
 * geometria en el esquema—: agrupan los lotes por color, que es exactamente lo
 * que se sabe. «Vias» no se dibuja: la tabla `via` guarda codigo, nombre y tipo,
 * no trazado. Y «Aranceles» no se pinta porque **no es resoluble**: el arancel
 * es de un tramo de via y el predio no dice en que tramo esta.
 *
 * Una capa que falta sin explicacion se lee como una capa que no existe, y esa
 * es la diferencia entre un plano incompleto y un plano que miente.
 *
 * <h2>El plano vacio es el estado normal, no un error</h2>
 *
 * Hoy no hay una sola municipalidad con un poligono cargado (ADR-0021). Por eso
 * `sinGeometria` se dice **siempre**, y el vacio nombra la causa y la salida: sin
 * esa cifra, un plano sin lotes se lee como un distrito sin predios en vez de
 * como un catastro sin levantar.
 *
 * <h2>Lo que se aparta del artboard, y por que</h2>
 *
 * - **El zoom del 75 % al 175 % no se porta.** Era una escala CSS de un plano
 *   esquematico; sobre geometria proyectada un porcentaje no significa nada
 *   —¿el 125 % de que?—. Lo que si significa algo es la **escala grafica en
 *   metros**, que el propio artboard pide al pie y que el mapa dibuja sobre el
 *   lienzo junto a su control de zoom.
 * - **«UTM 17S» sale del pie.** La geometria viaja en WGS84 y no en una zona
 *   UTM, por la razon de ADR-0021: una instalacion atiende municipalidades de
 *   tres zonas distintas. Escribir una zona fija seria decir de la mitad de los
 *   inquilinos algo que no es cierto.
 * - **«Base catastral municipal — actualizacion 2026-I» tampoco.** Ningun dato
 *   del sistema respalda esa fecha; es una cifra de una captura.
 * - **Se anade la lista de lotes de la vista.** Un mapa que solo se opera con el
 *   raton no cumple RNF-082, y un lienzo de teselas no tiene contenido que un
 *   lector de pantalla pueda recorrer. La lista es el equivalente: mismo
 *   conjunto, mismo lote seleccionado, alcanzable con el teclado.
 */
export function MapaCatastral() {
  const catalogo = useCatalogoVisible();
  const puedeVerElPlano = catalogo.puedeVer('consulta_fichas');
  const puedeVerElPadron = catalogo.puedeVer('contribuyentes');

  const [sector, setSector] = useState('');
  const [buscado, setBuscado] = useState('');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [capasApagadas, setCapasApagadas] = useState<readonly string[]>([]);
  const [agrupacion, setAgrupacion] = useState<AgrupacionDelPlano>('ninguna');
  const [aviso, setAviso] = useState<string | null>(null);

  const plano = useQuery({
    queryKey: ['plano-catastral', sector],
    enabled: puedeVerElPlano,
    queryFn: ({ signal }) =>
      pedirPlano(MARCO_INICIAL, sector === '' ? {} : { codigoDeSector: sector }, signal),
  });

  const lotes = useMemo(() => plano.data?.lotes ?? [], [plano.data]);
  const elegido = lotes.find((lote) => lote.predioId === seleccionado) ?? null;

  /* Si el marco cambia y el lote elegido ya no esta, la seleccion se suelta: un
     panel que sigue describiendo un lote que el plano ya no dibuja es un panel
     que habla de otro sitio. */
  useEffect(() => {
    if (seleccionado !== null && !lotes.some((lote) => lote.predioId === seleccionado)) {
      setSeleccionado(null);
    }
  }, [lotes, seleccionado]);

  if (!puedeVerElPlano) {
    return (
      <div className="sgtm-plano">
        <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />
      </div>
    );
  }

  const ubicar = () => {
    const encontrado = lotes.find((lote) => casaConLaBusqueda(lote, buscado));
    if (encontrado === undefined) {
      setAviso(
        buscado.trim() === ''
          ? 'Escribe un código predial o un lote para ubicarlo.'
          : `Ningún lote de los ${lotes.length} de esta vista responde a «${buscado.trim()}».`,
      );
      return;
    }
    setSeleccionado(encontrado.predioId);
    setAviso(null);
  };

  const capaEncendida = (id: string): boolean => !capasApagadas.includes(id);
  const alternarCapa = (id: string) =>
    setCapasApagadas((apagadas) =>
      apagadas.includes(id) ? apagadas.filter((otra) => otra !== id) : [...apagadas, id],
    );

  const manzanas = new Set(
    lotes.map((lote) => lote.codigoDeManzana).filter((codigo) => codigo !== null),
  );
  const sectores = new Set(
    lotes.map((lote) => lote.codigoDeSector).filter((codigo) => codigo !== null),
  );
  /* El desplegable ofrece **los sectores que el plano trae**, y conserva el
     elegido aunque su filtro los haya reducido a uno: sin eso, elegir un sector
     lo borraria de su propia lista y no habria forma de volver a «todos». */
  const sectoresDelPadron = [...new Set([...sectores, ...(sector === '' ? [] : [sector])])].sort();

  const conteoDeCapa = (id: string): string => {
    if (id === 'predios') return String(lotes.length);
    if (id === 'manzanas') return String(manzanas.size);
    if (id === 'sectores') return String(sectores.size);
    return SIN_DATO;
  };

  return (
    <div className="sgtm-plano">
      <header className="sgtm-plano__cabecera">
        <p className="sgtm-plano__eyebrow">Catastro</p>
        <h1>Mapa catastral</h1>
        <p className="sgtm-plano__prosa">
          El plano catastral con los lotes del padrón. Al seleccionar uno se ven sus datos y el
          camino a su ficha. Las capas que no se pueden dibujar dicen por qué.
        </p>
      </header>

      <div className="sgtm-plano__cuerpo">
        <section className="sgtm-plano__seccion" aria-label="Plano">
          <div className="sgtm-plano__barra">
            <Campo
              tipo="sel"
              etiqueta="Sector"
              valor={sector === '' ? TODOS_LOS_SECTORES : sector}
              opciones={[TODOS_LOS_SECTORES, ...sectoresDelPadron]}
              onCambio={(valor) => setSector(valor === TODOS_LOS_SECTORES ? '' : valor)}
            />
            <Campo
              tipo="text"
              etiqueta="Código predial o lote"
              valor={buscado}
              onCambio={(valor) => setBuscado(valor)}
            />
            <Boton variante="primario" onClick={ubicar}>
              Ubicar
            </Boton>
          </div>

          {aviso !== null && (
            <p className="sgtm-plano__aviso" role="status">
              {aviso}
            </p>
          )}

          {plano.isError ? (
            <Aviso
              tipo="error"
              titulo={textoDeError(plano.error).titulo}
              detalle={textoDeError(plano.error).detalle}
            />
          ) : lotes.length === 0 && !plano.isLoading ? (
            /* El vacio nombra la causa y la salida, no se queda callado: hoy
               este es el estado de toda municipalidad (ADR-0022 §3). */
            <Aviso
              titulo="Este marco no tiene ningún lote levantado"
              detalle="El plano se dibuja con la geometría de los predios, y esa geometría se carga desde el plano catastral de la municipalidad. Mientras no se cargue, el padrón se consulta por código y por titular en «Consulta de fichas»."
            />
          ) : (
            <PlanoConLeaflet
              lotes={capaEncendida('predios') ? lotes : []}
              seleccionado={seleccionado}
              agrupacion={agrupacion}
              onSeleccionar={(predioId) => setSeleccionado(predioId)}
              marcoInicial={MARCO_INICIAL}
            />
          )}

          <p className="sgtm-plano__pie">
            {/* Ni «UTM 17S» ni una fecha de actualización que nada respalda: lo
                que se puede afirmar es la proyección en que viaja el dato. */}
            Coordenadas en WGS 84 (EPSG:4326). La escala en metros se dibuja sobre el plano.
          </p>
          <p className="sgtm-plano__pie" data-sin-geometria={plano.data?.sinGeometria ?? 0}>
            {plano.data === undefined
              ? 'Sin predios contados todavía.'
              : plano.data.sinGeometria === 0
                ? 'Todos los predios de este marco tienen su polígono.'
                : `${plano.data.sinGeometria} predios de este marco no tienen polígono: no se dibujan.`}
          </p>
        </section>

        <div className="sgtm-plano__lateral">
          <section className="sgtm-plano__tarjeta" aria-label="Capas">
            <p className="sgtm-plano__rotulo">Capas</p>
            <ul className="sgtm-plano__capas">
              {CAPAS.map((capa) => (
                <li key={capa.id}>
                  <label className="sgtm-plano__capa">
                    <input
                      type="checkbox"
                      checked={capa.impedimento === null && capaEncendida(capa.id)}
                      disabled={capa.impedimento !== null}
                      onChange={() => alternarCapa(capa.id)}
                    />
                    <span className="sgtm-plano__capa-etiqueta">{capa.label}</span>
                    <span className="sgtm-plano__capa-conteo">{conteoDeCapa(capa.id)}</span>
                  </label>
                  {capa.impedimento !== null && (
                    <p className="sgtm-plano__capa-motivo">{capa.impedimento}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="sgtm-plano__agrupacion">
              <Campo
                tipo="sel"
                etiqueta="Agrupar los lotes por"
                valor={ROTULO_DE_AGRUPACION[agrupacion]}
                opciones={Object.values(ROTULO_DE_AGRUPACION)}
                onCambio={(valor) => setAgrupacion(agrupacionDelRotulo(valor))}
              />
              <p className="sgtm-plano__capa-motivo">
                Colorea los lotes por la manzana o el sector que declaran. No es el perímetro de la
                manzana: eso no está en el sistema.
              </p>
            </div>
          </section>

          {/* El equivalente accesible del lienzo (RNF-082): el mismo conjunto de
              lotes, recorrible con el teclado, seleccionando el mismo lote. */}
          <section className="sgtm-plano__tarjeta" aria-label="Lotes de la vista">
            <p className="sgtm-plano__rotulo">Lotes de la vista ({lotes.length})</p>
            <ul className="sgtm-plano__lista">
              {lotes.map((lote) => (
                <li key={lote.predioId}>
                  <button
                    type="button"
                    className="sgtm-plano__lote"
                    aria-pressed={lote.predioId === seleccionado}
                    onClick={() => setSeleccionado(lote.predioId)}
                  >
                    <span className="sgtm-plano__lote-rotulo">{rotuloDelLote(lote)}</span>
                    <span className="sgtm-plano__lote-codigo">{lote.codRefCatastral}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <PanelDelLote
            lote={elegido}
            puedeVerElPadron={puedeVerElPadron}
            habilitado={puedeVerElPlano}
          />
        </div>
      </div>
    </div>
  );
}

/** Lo que la consulta de fichas publica del predio elegido: uso, áreas y titular. */
interface DatosDeLaFicha {
  readonly uso: string | null;
  readonly areaTerreno: string | null;
  readonly areaConstruida: string | null;
  readonly titular: string | null;
}

/**
 * El panel del lote: sus datos y sus dos salidas.
 *
 * <h2>De donde sale cada fila, y por que no de la lectura del plano</h2>
 *
 * El plano publica la identidad y la ubicacion, y **nada mas**: ni titular, ni
 * areas (ADR-0022 §1). El uso, las dos areas y el nombre del titular salen de la
 * consulta de fichas del mismo predio —una lectura que este perfil ya puede
 * hacer, porque es la que el mapa exige—, y un predio **sin ficha** —que es
 * justo lo que produce una carga cartografica— los enseña en «—».
 *
 * <h2>«Ver deuda» necesita un permiso mas, y por eso puede no estar</h2>
 *
 * La deuda es de una persona, no de un predio, asi que ese camino exige resolver
 * quien es el titular **con su codigo**, y eso es
 * `/catastro/predios/{predioId}/titulares`: privilegio de lectura sobre
 * `contribuyentes` —el permiso del padron, no el de esta pantalla— y una fila de
 * ACCESO en la bitacora por cada resolucion (ADR-0015 §2.4). Quien no lo tenga
 * no ve un enlace que le llevaria a un 403: ve dicho que le falta ese permiso.
 */
function PanelDelLote({
  lote,
  puedeVerElPadron,
}: {
  readonly lote: LoteDelPlano | null;
  readonly puedeVerElPadron: boolean;
  readonly habilitado: boolean;
}) {
  const ficha = useQuery<DatosDeLaFicha | null>({
    queryKey: ['plano-ficha', lote?.codRefCatastral ?? ''],
    enabled: lote !== null,
    queryFn: async ({ signal }) => {
      const cuerpo = await pedirOperacion(
        'consulta_fichas',
        { codRefCatastral: lote?.codRefCatastral ?? '' },
        signal,
      );
      return filaDeLaFicha(cuerpo, lote?.codRefCatastral ?? '');
    },
  });

  const titular = useQuery<string | null>({
    queryKey: ['plano-titular', lote?.predioId ?? 0],
    enabled: lote !== null && puedeVerElPadron,
    queryFn: async ({ signal }) => {
      const cuerpo = await pedirOperacion(
        'titulares_del_predio',
        { predioId: String(lote?.predioId ?? '') },
        signal,
      );
      return codigoDelPrimerTitular(cuerpo);
    },
  });

  if (lote === null) {
    return (
      <section className="sgtm-plano__tarjeta" aria-label="Lote seleccionado">
        <p className="sgtm-plano__rotulo">Lote seleccionado</p>
        <p className="sgtm-plano__vacio">
          Elige un lote en el plano o en la lista para ver sus datos.
        </p>
      </section>
    );
  }

  const predio = opcionPorId('ficha_urbana');
  const deuda = opcionPorId('consulta_deuda');
  const codigoDelTitular = titular.data ?? null;

  const filas: readonly (readonly [string, string])[] = [
    ['Código predial', lote.codRefCatastral],
    ['Contribuyente', ficha.data?.titular ?? SIN_DATO],
    [
      'Sector / manzana',
      lote.codigoDeSector === null && lote.codigoDeManzana === null
        ? SIN_DATO
        : `${lote.codigoDeSector ?? SIN_DATO} · ${lote.codigoDeManzana ?? SIN_DATO}`,
    ],
    ['Lote', lote.lote ?? SIN_DATO],
    ['Frente a vía', lote.via ?? SIN_DATO],
    ['Uso', ficha.data?.uso ?? SIN_DATO],
    ['Área de terreno', areaConUnidad(ficha.data?.areaTerreno ?? null)],
    ['Área construida', areaConUnidad(ficha.data?.areaConstruida ?? null)],
    // El arancel **no se resuelve** por lote (ADR-0022 §5): el arancel es de un
    // tramo de via y el predio no dice en cual esta. Se nombra la fila y se dice
    // donde se consulta con su importe exacto, que es lo contrario de dejarla
    // con una cifra plausible.
    ['Arancel de la vía', SIN_DATO],
  ];

  return (
    <section className="sgtm-plano__tarjeta" aria-label="Lote seleccionado">
      <div className="sgtm-plano__tarjeta-cabecera">
        <p className="sgtm-plano__rotulo">Lote seleccionado</p>
        <span className="sgtm-plano__insignia">{rotuloDelLote(lote)}</span>
      </div>
      <dl className="sgtm-plano__datos">
        {filas.map(([clave, valor]) => (
          <div key={clave}>
            <dt>{clave}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {/* **Un «—» porque la lectura falló no es el mismo «—» que porque el dato
          no existe**, y las cuatro filas de la ficha salen iguales en los dos
          casos. Sin esta línea, un predio cuya ficha no se pudo leer se lee como
          un predio sin ficha —que es una afirmación sobre el padrón, y no la
          hemos comprobado—. Es la distinción de #331 entre «no se pudo» y «no
          hay». */}
      {ficha.isError && (
        <p className="sgtm-plano__capa-motivo" role="status">
          No se pudo leer la ficha de este predio, así que el uso, las áreas y el titular quedan sin
          dato: no quiere decir que no la tenga.
        </p>
      )}
      <p className="sgtm-plano__capa-motivo">
        El arancel es de un tramo de vía y el predio no dice en cuál está: se consulta con su
        importe exacto en «Aranceles».
      </p>
      <div className="sgtm-plano__salidas">
        {predio !== undefined && (
          <Link
            className="sgtm-boton sgtm-boton--primario"
            to={`${predio.ruta}/${lote.codRefCatastral}`}
          >
            Abrir el predio
          </Link>
        )}
        {deuda !== undefined && puedeVerElPadron && codigoDelTitular !== null && (
          <Link
            className="sgtm-boton"
            to={`${deuda.ruta}?codContribuyente=${encodeURIComponent(codigoDelTitular)}`}
          >
            Ver deuda
          </Link>
        )}
      </div>
      {!puedeVerElPadron && (
        <p className="sgtm-plano__capa-motivo">
          Para ver la deuda hace falta «{opcionPorId('contribuyentes')?.title ?? 'Contribuyentes'}»:
          la deuda es de una persona, y resolver quién es titular de este predio exige ese permiso.
        </p>
      )}
    </section>
  );
}

/** `210.00` → `210.00 m²`; sin dato, «—» a secas y sin unidad. */
const areaConUnidad = (area: string | null): string =>
  area === null || area === '' ? SIN_DATO : `${area} m²`;

/**
 * La fila de la ficha **que se pidio**, no la primera que venga.
 *
 * El proxy no filtra (ADR-0010), asi que sin esta comprobacion el panel
 * enseñaria el uso y las areas del primer predio del padron bajo el codigo de
 * otro. Es la leccion de #298, donde la misma omision le enseñaba al ciudadano
 * la deuda de la primera persona de la lista.
 */
function filaDeLaFicha(cuerpo: unknown, codRefCatastral: string): DatosDeLaFicha | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const contenido = (cuerpo as { contenido?: unknown }).contenido;
  if (!Array.isArray(contenido)) return null;
  const fila = contenido.find(
    (candidata) =>
      typeof candidata === 'object' &&
      candidata !== null &&
      (candidata as { codRefCatastral?: unknown }).codRefCatastral === codRefCatastral,
  ) as Record<string, unknown> | undefined;
  if (fila === undefined) return null;
  const texto = (clave: string): string | null =>
    typeof fila[clave] === 'string' && fila[clave] !== '' ? (fila[clave] as string) : null;
  return {
    uso: texto('uso'),
    areaTerreno: texto('areaTerreno'),
    areaConstruida: texto('areaConstruida'),
    titular: texto('titular'),
  };
}

/**
 * El codigo del primer titular, o nada.
 *
 * Un predio puede tener varios titulares —dos conyuges, una sucesion, un
 * condominio— y esta salida abre **una** consulta de deuda, asi que se toma el
 * primero de la lista que el servidor devuelve, que es el orden en que la
 * publica. No se compone «el titular»: eso lo hace la ficha del predio.
 */
function codigoDelPrimerTitular(cuerpo: unknown): string | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const titulares = (cuerpo as { titulares?: unknown }).titulares;
  if (!Array.isArray(titulares) || titulares.length === 0) return null;
  const primero = titulares[0] as { codigo?: unknown };
  return typeof primero.codigo === 'string' && primero.codigo !== '' ? primero.codigo : null;
}

/** La opcion que no filtra. Es un rotulo del desplegable, no un valor que viaje. */
const TODOS_LOS_SECTORES = 'Todos los sectores';

/** Como se rotula cada agrupacion, y como se vuelve del rotulo al valor. */
const ROTULO_DE_AGRUPACION: Readonly<Record<AgrupacionDelPlano, string>> = {
  ninguna: 'Nada',
  manzanas: 'Manzana',
  sectores: 'Sector',
};

const agrupacionDelRotulo = (rotulo: string): AgrupacionDelPlano =>
  (Object.keys(ROTULO_DE_AGRUPACION) as AgrupacionDelPlano[]).find(
    (clave) => ROTULO_DE_AGRUPACION[clave] === rotulo,
  ) ?? 'ninguna';
