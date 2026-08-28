import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { pedirOperacion } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { FechaDeCalculo } from '../bloques/FechaDeCalculo';
import { SIN_PERMISO, textoDeError } from '../estados';
import { hoy } from '../seguridad/listado';
import { leerFicha } from './fichas';
import { CodigoCatastral } from './CodigoCatastral';
import { CONSTRUCCIONES, TablaDePisos, filaDeConstruccionLeida } from './TablaDePisos';

/**
 * Actualización del catastro: `PUT /catastro/fichas/{codigo}/actualizacion` (#71).
 *
 * **El cuerpo no cabe en campos planos**: el backend recibe una lista de
 * construcciones —piso, área y siete categorías de una letra—. Antes esa lista
 * la armaba esta pantalla a mano con `cuerpo`, la salida de emergencia de
 * `useEscritura`, porque el camino declarado solo llevaba campos sueltos. Ya no:
 * la tabla está declarada en `pantallas/escrituras.ts` con su lista blanca **por
 * columna** (#320), y con ella la lista blanca vuelve a decir qué puede escribir
 * esta pantalla en vez de fiarse de lo que este archivo recuerde armar.
 *
 * **Guardar reemplaza la lista entera de pisos, no solo el que cambia**: es lo
 * que dice `ActualizacionController` (`construcciones: null` significa «lo mismo
 * que tenía»; una lista significa esa lista, completa). Por eso la pantalla
 * carga primero los pisos de la versión vigente —de la misma lectura que ya usa
 * `ficha_urbana`— y dejar de declarar uno aquí es borrarlo de la ficha, no «no
 * tocarlo».
 *
 * Lo que el prototipo dibuja y esta pantalla **no manda**, porque
 * `ActualizacionController.PeticionDeActualizacion` no lo acepta: mes, año, MEP,
 * ECS, ECC, UCA y la pestaña entera de «Otras instalaciones». Un campo que el
 * backend no pide no entra por aquí.
 */
export function ActualizacionDeCatastro({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const { codigo } = useParams();
  const catalogo = useCatalogoVisible();
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const declarada = escrituraDe(estructura.id);

  const actual = useQuery({
    queryKey: ['ficha-urbana-para-actualizar', codigo],
    queryFn: ({ signal }) =>
      pedirOperacion('ficha_urbana', { codRefCatastral: codigo ?? '' }, signal).then((cuerpo) =>
        leerFicha(cuerpo, 'urbana'),
      ),
    enabled: codigo !== undefined && codigo !== '',
  });

  const [sembrada, fijarSembrada] = useState(false);

  const escritura = useEscritura(
    puedeEscribirAqui ? 'actualizacion_catastro' : undefined,
    codigo === undefined ? {} : { codigo },
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      exigir: (borrador) =>
        (borrador['documentoOrigen'] ?? '').trim() === ''
          ? 'Falta el documento de origen (acta, resolución o declaración jurada).'
          : undefined,
    },
  );

  // Se siembra una sola vez, con los pisos de la versión vigente: guardar sin
  // haberlos visto los borraría de la ficha sin que nadie lo pidiera. El origen
  // por omisión entra igual, porque el backend lo exige y el prototipo lo pinta
  // con un valor elegido.
  if (!sembrada && actual.data !== undefined) {
    fijarSembrada(true);
    escritura.fijarFilas(CONSTRUCCIONES, actual.data.construcciones.map(filaDeConstruccionLeida));
    escritura.fijarCampo('origen', ORIGEN_POR_OMISION);
  }

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (codigo === undefined || codigo === '') {
    return (
      <Aviso
        titulo="Elige un predio para actualizar su catastro"
        detalle="Esta pantalla abre un predio por su código de referencia catastral. Compónlo abajo tramo a tramo, búscalo en «Consulta de fichas» o pega el enlace: el código va en la dirección, así que se puede compartir."
      >
        <AbrirPorCodigo />
      </Aviso>
    );
  }

  if (actual.isError) {
    const error = textoDeError(actual.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={() => void actual.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  const cargando = actual.isPending;

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      <FechaDeCalculo fecha={hoy()} />

      <Aviso
        titulo="Guardar reemplaza la lista completa de pisos"
        detalle="La versión nueva lleva exactamente los pisos que estén en la tabla de abajo. Se cargaron los de la versión vigente: si quitas uno, la ficha nueva no lo tendrá."
      />

      <TablaDePisos escritura={escritura} cargando={cargando} />

      {puedeEscribirAqui && (
        <section className="sgtm-tarjeta">
          <div className="sgtm-tarjeta__cabecera">
            <h2 className="sgtm-tarjeta__titulo">De dónde sale esta versión</h2>
          </div>
          <CampoDeclarado
            escritura={escritura}
            campo="origen"
            etiqueta="Origen"
            tipo="sel"
            opciones={ORIGENES}
          />
          <CampoDeclarado
            escritura={escritura}
            campo="documentoOrigen"
            etiqueta="Documento de origen"
            ph="Acta de inspección, resolución o declaración jurada"
          />
          <CampoDeclarado
            escritura={escritura}
            campo="vigenciaDesde"
            etiqueta="Vigente desde"
            tipo="date"
            ph="Sin fecha, rige desde hoy"
          />
          {escritura.falta !== undefined && (
            <p className="sgtm-asistente__falta">{escritura.falta}</p>
          )}
        </section>
      )}

      <BarraDeAcciones acciones={['Guardar']} escritura={escritura} />
    </>
  );
}

/**
 * Componer el codigo del predio que se va a actualizar, y abrirlo (#318).
 *
 * Esta pantalla abre por ruta y su busqueda del prototipo no se dibuja —tiene
 * componente propio, no bloques—, asi que sin esto la unica forma de llegar es
 * pegar una URL. El codigo se compone en sus tramos, y abrir es **navegar**: el
 * registro abierto vive en la ruta, y el enlace que queda se puede compartir.
 */
function AbrirPorCodigo() {
  const navegar = useNavigate();
  const [codigo, fijarCodigo] = useState('');

  return (
    <>
      <CodigoCatastral etiqueta="Cod. Ref. Catastral" valor={codigo} onCambio={fijarCodigo} />
      <Boton
        variante="primario"
        disabled={codigo === ''}
        onClick={() => navegar(`/catastro/actualizacion-catastro/${encodeURIComponent(codigo)}`)}
      >
        Abrir predio
      </Boton>
    </>
  );
}

function CampoDeclarado({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  ph,
  opciones,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel' | 'date';
  readonly ph?: string;
  readonly opciones?: readonly string[];
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      tipo={tipo}
      valor={escritura.borrador[campo] ?? ''}
      bloqueado={!escritura.campos.has(campo)}
      {...(ph === undefined ? {} : { ph })}
      {...(opciones === undefined ? {} : { opciones })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

const ORIGENES = ['DECLARACION_JURADA', 'FISCALIZACION', 'RESOLUCION', 'MIGRACION'];

/** El que el prototipo trae elegido: la mayoría de las actualizaciones vienen de una DJ. */
const ORIGEN_POR_OMISION = 'DECLARACION_JURADA';
