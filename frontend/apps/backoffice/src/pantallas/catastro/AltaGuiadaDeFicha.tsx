import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Esqueleto } from '@sgtm/design-system';
import { pedirOperacion } from '@sgtm/api-client';
import { useEscritura } from '../escritura';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { textoDeError } from '../estados';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { CodigoCatastral } from './CodigoCatastral';
import { formatearCodigoCatastral, normalizarCodigoCatastral, tramoDelCodigo } from './codigo';
import { TablaDePisos } from './TablaDePisos';

/**
 * El alta de una ficha catastral, **guiada y validada contra el territorio** (#320).
 *
 * El prototipo la dibuja como lo que el manual heredó del sistema de escritorio:
 * un formulario de cuarenta campos en once pestañas, con el código de referencia
 * catastral tecleado de corrido en algún sitio del medio. Quien ficha un predio
 * no trabaja así —primero sabe dónde está, después de qué unidad es el código, y
 * al final quién lo declara—, y sobre todo: **el error caro se comete al
 * principio**. Un código repetido o con un sector que no existe no se descubre
 * al pulsar «Guardar»; se descubre cuando dos predios colisionan y el padrón
 * deja de cuadrar con el catastro.
 *
 * Así que son cuatro pasos, y el segundo es el que justifica los otros tres:
 *
 *   1. Ubicación      dónde está, contra el catálogo de Territorio
 *   2. Código         se compone sobre lo elegido en 1, con el sector
 *                     comprobado y el duplicado avisado **antes** de llenar
 *                     el resto
 *   3. La ficha       terreno, uso y la tabla de pisos
 *   4. Titularidad    quién lo declara, y la observación que crea la v1
 *
 * **Nada se guarda hasta el paso 4** (regla 10, RNF-052). Los tres primeros son
 * borrador en el componente, que es lo único que FRO-04 §5 deja quedarse ahí, y
 * el paso 4 no habilita su acción mientras la observación esté vacía.
 *
 * **Ninguna de las validaciones escribe**: el sector y el duplicado se
 * comprueban con las operaciones de lectura que ya existen —`sectores`,
 * `calles`, `consulta_fichas`, `contribuyentes`—, y ninguna es una consulta
 * inventada para esta pantalla.
 */

/** Los cuatro pasos, en su orden. El riel los dibuja tal cual. */
const PASOS = [
  { titulo: 'Ubicación', detalle: 'Dónde está el predio, contra el catálogo de Territorio' },
  { titulo: 'Código catastral', detalle: 'Se compone sobre lo elegido, y se comprueba' },
  { titulo: 'La ficha', detalle: 'Terreno, uso y los pisos construidos' },
  { titulo: 'Titularidad y cierre', detalle: 'Quién lo declara, y por qué se inscribe' },
] as const;

/** De dónde puede salir la primera versión de una ficha (`OrigenDeLaFicha`). */
const ORIGENES = ['DECLARACION_JURADA', 'FISCALIZACION', 'RESOLUCION', 'MIGRACION'];

/** Con qué título se tiene el predio (`CondicionDeTitularidad`). */
const CONDICIONES = [
  'PROPIETARIO_UNICO',
  'COPROPIETARIO',
  'CONYUGE',
  'POSEEDOR',
  'SUCESION',
  'USUFRUCTUARIO',
];

export function AltaGuiadaDeFicha({ onCerrar }: { readonly onCerrar: () => void }) {
  const [paso, fijarPaso] = useState(0);
  const declarada = escrituraDe('registrar_ficha_urbana');

  const escritura = useEscritura(
    'registrar_ficha_urbana',
    {},
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      // Lo que además de la observación hace falta para inscribir. Se comprueba
      // aquí y no al pulsar porque el backend lo exige y la pantalla ya lo sabe:
      // `direccion`, `uso`, `areaTerreno` y `documentoOrigen` son los cuatro que
      // `FichaController` reclama con `exigir(...)`.
      exigir: faltaParaInscribir,
    },
  );

  const territorio = useTerritorio();
  const codigo = escritura.borrador['codRefCatastral'] ?? '';
  const duplicado = usePosibleDuplicado(codigo);

  const puedeContinuar = faltaDelPaso(paso, escritura) === undefined;

  return (
    <section className="sgtm-asistente" aria-label="Alta de ficha catastral urbana">
      <Riel paso={paso} />

      <div className="sgtm-asistente__panel">
        <h2 className="sgtm-asistente__titulo">
          {PASOS[paso]?.titulo} <span>{PASOS[paso]?.detalle}</span>
        </h2>

        {paso === 0 && <PasoDeUbicacion escritura={escritura} territorio={territorio} />}
        {paso === 1 && (
          <PasoDelCodigo escritura={escritura} territorio={territorio} duplicado={duplicado} />
        )}
        {paso === 2 && <PasoDeLaFicha escritura={escritura} />}
        {paso === 3 && <PasoDeCierre escritura={escritura} />}

        {/* Por qué no se puede seguir, dicho donde se lee: en el paso, no en un
            botón apagado sin explicación. */}
        {!puedeContinuar && (
          <p className="sgtm-asistente__falta">{faltaDelPaso(paso, escritura)}</p>
        )}

        <div className="sgtm-asistente__acciones">
          <Boton onClick={paso === 0 ? onCerrar : () => fijarPaso(paso - 1)}>
            {paso === 0 ? 'Cancelar' : 'Volver'}
          </Boton>
          {paso < PASOS.length - 1 ? (
            <Boton
              variante="primario"
              disabled={!puedeContinuar}
              onClick={() => fijarPaso(paso + 1)}
            >
              Continuar
            </Boton>
          ) : (
            <Boton
              variante="primario"
              disabled={!escritura.puedeEnviar}
              title={
                escritura.puedeEnviar
                  ? undefined
                  : (escritura.falta ?? 'Escribe la observación para poder inscribir la ficha')
              }
              onClick={escritura.enviar}
            >
              {escritura.enviando ? 'Inscribir ficha…' : 'Inscribir ficha'}
            </Boton>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── El riel ───────────────────────────────────────────────────────────── */

function Riel({ paso }: { readonly paso: number }) {
  return (
    <ol className="sgtm-riel" aria-label="Pasos del alta">
      {PASOS.map((definicion, i) => {
        const estado = i < paso ? 'hecho' : i === paso ? 'actual' : 'pendiente';
        return (
          <li
            key={definicion.titulo}
            className="sgtm-riel__paso"
            data-estado={estado}
            aria-current={i === paso ? 'step' : undefined}
          >
            <span className="sgtm-riel__numero" aria-hidden="true">
              {i < paso ? '✓' : String(i + 1)}
            </span>
            <span className="sgtm-riel__texto">
              <span className="sgtm-riel__titulo">{definicion.titulo}</span>
              {/* El estado no se comunica solo por color (FRO-02 §2.1). */}
              <span className="sgtm-riel__estado">
                {estado === 'hecho' ? 'Hecho' : estado === 'actual' ? 'En curso' : 'Pendiente'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Paso 1: la ubicación ──────────────────────────────────────────────── */

function PasoDeUbicacion({
  escritura,
  territorio,
}: {
  readonly escritura: Escritura;
  readonly territorio: Territorio;
}) {
  if (territorio.cargando) return <Esqueleto alto={160} />;

  return (
    <>
      {territorio.error !== undefined && (
        <Aviso
          tipo="error"
          titulo="No se pudo leer el catálogo territorial"
          detalle="Sin sectores ni vías no se puede comprobar dónde está el predio. Vuelve a intentarlo antes de seguir."
        />
      )}

      {/* La vía y el sector salen del catálogo, no de un campo libre: con texto
          libre la misma calle entra tres veces y el padrón acaba con tres vías
          donde hay una. */}
      <CampoDelAlta
        escritura={escritura}
        campo="codigoDeVia"
        etiqueta="Vía"
        tipo="sel"
        opciones={territorio.vias}
      />
      <CampoDelAlta
        escritura={escritura}
        campo="numeroMunicipal"
        etiqueta="Numeración municipal"
        ph="1245"
      />
      <CampoDelAlta
        escritura={escritura}
        campo="direccion"
        etiqueta="Dirección"
        ph="AV. JOSÉ DE LAMA 1245"
      />
      <CampoDelAlta
        escritura={escritura}
        campo="codigoDeSector"
        etiqueta="Sector"
        tipo="sel"
        opciones={territorio.sectores}
      />
      <CampoDelAlta escritura={escritura} campo="codigoDeManzana" etiqueta="Manzana" ph="501" />
      <CampoDelAlta escritura={escritura} campo="lote" etiqueta="Lote" ph="010" />
    </>
  );
}

/* ── Paso 2: el código, comprobado ─────────────────────────────────────── */

function PasoDelCodigo({
  escritura,
  territorio,
  duplicado,
}: {
  readonly escritura: Escritura;
  readonly territorio: Territorio;
  readonly duplicado: PosibleDuplicado;
}) {
  const codigo = escritura.borrador['codRefCatastral'] ?? '';
  const sectorDelCodigo = tramoDelCodigo(codigo, 'sector');
  const sectorElegido = escritura.borrador['codigoDeSector'] ?? '';
  // El sector del código se comprueba contra el catálogo leído, no contra el
  // desplegable del paso 1: quien pega un código entero no pasó por él.
  const sectorExiste =
    sectorDelCodigo === '' || territorio.sectores.some((codigo) => codigo === sectorDelCodigo);

  return (
    <>
      <CodigoCatastral
        etiqueta="Código de referencia catastral"
        valor={codigo}
        onCambio={(valor) =>
          escritura.fijarCampo('codRefCatastral', normalizarCodigoCatastral(valor))
        }
      />

      {sectorDelCodigo !== '' && !sectorExiste && (
        <Aviso
          tipo="error"
          titulo={`El sector ${sectorDelCodigo} no está en el catálogo`}
          detalle="El código de un predio empieza por un sector que exista: si es un sector nuevo, se da de alta primero en «Sectores, manzanas y lotes»."
        />
      )}

      {sectorDelCodigo !== '' &&
        sectorElegido !== '' &&
        sectorDelCodigo !== sectorElegido &&
        sectorExiste && (
          <Aviso
            titulo={`El código dice sector ${sectorDelCodigo} y arriba se eligió el ${sectorElegido}`}
            detalle="Los dos son sectores del catálogo, así que el sistema no decide cuál vale: revisa cuál de los dos es el del predio antes de seguir."
          />
        )}

      {duplicado.buscando && (
        <p className="sgtm-asistente__nota">Comprobando si ya está inscrita…</p>
      )}

      {duplicado.ficha !== undefined && (
        <div className="sgtm-duplicado" role="alert">
          <p className="sgtm-duplicado__titulo">
            La unidad {formatearCodigoCatastral(duplicado.ficha.codigo)} ya está inscrita
            {duplicado.ficha.titular === SIN_DATO ? '' : ` a nombre de ${duplicado.ficha.titular}`}
          </p>
          <p className="sgtm-duplicado__detalle">
            Inscribir otra primera versión con este código es un conflicto, no un alta: lo que toca
            entonces es actualizar la ficha que ya existe. Míralo antes de seguir llenando el resto.
          </p>
          <Link
            className="sgtm-boton sgtm-boton--menudo"
            to={rutaDeLaFicha(duplicado.ficha.codigo)}
          >
            Ver esa ficha
          </Link>
        </div>
      )}
    </>
  );
}

/* ── Paso 3: la ficha ──────────────────────────────────────────────────── */

function PasoDeLaFicha({ escritura }: { readonly escritura: Escritura }) {
  return (
    <>
      {/* Áreas y categorías, **ningún importe** (regla 5, D-02a): cuánto vale un
          metro de terreno o una categoría constructiva vive en datos versionados,
          y el autovalúo lo calcula rentas. */}
      <CampoDelAlta
        escritura={escritura}
        campo="areaTerreno"
        etiqueta="Área de terreno (m²)"
        ph="180.00"
      />
      <CampoDelAlta escritura={escritura} campo="uso" etiqueta="Uso" ph="CASA HABITACIÓN" />
      <CampoDelAlta
        escritura={escritura}
        campo="denominacion"
        etiqueta="Denominación"
        ph="Opcional. Edificio Santa Rosa"
      />

      <TablaDePisos escritura={escritura} titulo="Pisos de la primera versión" />
    </>
  );
}

/* ── Paso 4: titularidad y cierre ──────────────────────────────────────── */

function PasoDeCierre({ escritura }: { readonly escritura: Escritura }) {
  const [buscado, fijarBuscado] = useState('');
  const padron = usePadron(buscado);
  const [titular = {}] = escritura.filasDe('titular');
  const fijarTitular = (campo: string, valor: string): void =>
    escritura.fijarFilas('titular', [{ ...titular, [campo]: valor }]);

  return (
    <>
      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h3 className="sgtm-tarjeta__titulo">Lo capturado</h3>
        </div>
        <dl className="sgtm-resumen">
          {resumenDe(escritura).map(({ rotulo, valor }) => (
            <div key={rotulo} className="sgtm-resumen__par">
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* El titular es **opcional a propósito**: en un levantamiento catastral se
          ficha el predio antes de identificar a su propietario, y exigirlo aquí
          obligaría al técnico a inventarse uno (DAT-01 §4.2). */}
      <Campo
        etiqueta="Buscar en el padrón"
        tipo="text"
        ph="Nombre o razón social del contribuyente"
        valor={buscado}
        onCambio={fijarBuscado}
      />
      {padron.buscando && <p className="sgtm-asistente__nota">Buscando en el padrón…</p>}
      {padron.encontrados.length > 0 && (
        <ul className="sgtm-asistente__resultados">
          {padron.encontrados.map((contribuyente) => (
            <li key={contribuyente.codigo}>
              <button
                type="button"
                onClick={() => fijarTitular('codigoContribuyente', contribuyente.codigo)}
              >
                <span>{contribuyente.nombre}</span>
                <span className="sgtm-asistente__codigo">{contribuyente.codigo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Campo
        etiqueta="Código del contribuyente"
        tipo="text"
        ph="Opcional. Se puede fichar el predio sin titular identificado"
        valor={titular['codigoContribuyente'] ?? ''}
        onCambio={(valor) => fijarTitular('codigoContribuyente', valor)}
      />
      <Campo
        etiqueta="Condición"
        tipo="sel"
        opciones={CONDICIONES}
        valor={titular['condicion'] ?? ''}
        onCambio={(valor) => fijarTitular('condicion', valor)}
      />
      <Campo
        etiqueta="% de propiedad"
        tipo="text"
        ph="100.00"
        valor={titular['porcentaje'] ?? ''}
        onCambio={(valor) => fijarTitular('porcentaje', valor)}
      />

      <CampoDelAlta
        escritura={escritura}
        campo="origen"
        etiqueta="Origen"
        tipo="sel"
        opciones={ORIGENES}
      />
      <CampoDelAlta
        escritura={escritura}
        campo="documentoOrigen"
        etiqueta="Documento de origen"
        ph="Acta de inspección, resolución o declaración jurada"
      />
      <CampoDelAlta
        escritura={escritura}
        campo="vigenciaDesde"
        etiqueta="Vigente desde"
        tipo="date"
        ph="Sin fecha, rige desde hoy"
      />

      {/* La observación **crea la v1**: no es un comentario, es lo que se lee en
          voz alta cuando el contribuyente pregunta de dónde salió su ficha
          (regla 10, RNF-052). */}
      <Campo
        etiqueta="Observación"
        tipo="area"
        ancho
        valor={escritura.observacion}
        ph="Por qué se inscribe esta ficha. Queda en la auditoría junto a tu usuario."
        {...(escritura.errorPorCampo['observacion'] === undefined
          ? {}
          : { error: escritura.errorPorCampo['observacion'] })}
        onCambio={escritura.fijarObservacion}
      />

      {escritura.error !== undefined && escritura.error !== null && (
        <ErrorDelAlta error={escritura.error} />
      )}
      {escritura.enviada && (
        <p className="sgtm-escritura__hecho" role="status">
          Ficha inscrita, con tu observación en la auditoría.
        </p>
      )}
    </>
  );
}

function ErrorDelAlta({ error }: { readonly error: unknown }) {
  const texto = textoDeError(error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}

/* ── Lo que hace falta en cada paso ────────────────────────────────────── */

/** Por qué todavía no se puede continuar desde este paso, o `undefined`. */
function faltaDelPaso(paso: number, escritura: Escritura): string | undefined {
  const valor = (campo: string): string => (escritura.borrador[campo] ?? '').trim();
  if (paso === 0) {
    if (valor('direccion') === '') return 'Falta la dirección del predio.';
    return undefined;
  }
  if (paso === 1) {
    if (valor('codRefCatastral') === '') return 'Falta el código de referencia catastral.';
    return undefined;
  }
  if (paso === 2) {
    if (valor('areaTerreno') === '') return 'Falta el área de terreno.';
    if (valor('uso') === '') return 'Falta el uso del predio.';
    return undefined;
  }
  return faltaParaInscribir(escritura.borrador);
}

/**
 * Lo que el backend exige y la pantalla ya sabe.
 *
 * Son los cuatro campos que `FichaController` reclama con `exigir(...)` antes de
 * tocar nada: sin ellos la petición es 422 y no se guarda ni la ficha, ni el
 * predio, ni la titularidad. Comprobarlos aquí no duplica esa regla —el servidor
 * sigue mandando—: evita que alguien rellene cuatro pasos para que se lo digan
 * al final.
 */
function faltaParaInscribir(borrador: Readonly<Record<string, string>>): string | undefined {
  const valor = (campo: string): string => (borrador[campo] ?? '').trim();
  if (valor('codRefCatastral') === '') return 'Falta el código de referencia catastral.';
  if (valor('direccion') === '') return 'Falta la dirección del predio.';
  if (valor('areaTerreno') === '') return 'Falta el área de terreno.';
  if (valor('uso') === '') return 'Falta el uso del predio.';
  if (valor('documentoOrigen') === '') {
    return 'Falta el documento de origen: el acta, la resolución o la declaración jurada de la que sale esta ficha.';
  }
  return undefined;
}

/** El resumen del paso 4: lo capturado, tal como se va a mandar. */
function resumenDe(escritura: Escritura): readonly { rotulo: string; valor: string }[] {
  const valor = (campo: string): string => {
    const escrito = (escritura.borrador[campo] ?? '').trim();
    return escrito === '' ? SIN_DATO : escrito;
  };
  const pisos = escritura.filasDe('construcciones').length;
  return [
    {
      rotulo: 'Código de referencia catastral',
      valor: formatearCodigoCatastral(valor('codRefCatastral')),
    },
    { rotulo: 'Dirección', valor: valor('direccion') },
    { rotulo: 'Sector', valor: valor('codigoDeSector') },
    { rotulo: 'Manzana', valor: valor('codigoDeManzana') },
    { rotulo: 'Lote', valor: valor('lote') },
    { rotulo: 'Área de terreno (m²)', valor: valor('areaTerreno') },
    { rotulo: 'Uso', valor: valor('uso') },
    // Cuántos pisos se declararon: se cuenta lo que está en la tabla, que es lo
    // que se va a mandar. Ninguna área se suma aquí (RNF-083).
    { rotulo: 'Pisos declarados', valor: `${pisos}` },
  ];
}

/* ── Las lecturas: ninguna inventada, todas del contrato ───────────────── */

interface Territorio {
  readonly sectores: readonly string[];
  readonly vias: readonly string[];
  readonly cargando: boolean;
  readonly error?: unknown;
}

/**
 * El catálogo territorial contra el que se valida: sectores y vías.
 *
 * Son las dos operaciones de **lectura** que Catastro ya publica (#16). No se
 * pide una consulta nueva ni se finge una en el proxy: si algo falta, se anota
 * (ADR-0010 §4).
 */
function useTerritorio(): Territorio {
  const sectores = useQuery({
    queryKey: ['alta-ficha', 'sectores'],
    queryFn: ({ signal }) =>
      pedirOperacion('sectores', { tamano: '200' }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'los sectores'),
      ),
  });
  const vias = useQuery({
    queryKey: ['alta-ficha', 'vias'],
    queryFn: ({ signal }) =>
      pedirOperacion('calles', { tamano: '200' }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'las vias'),
      ),
  });

  return {
    sectores: codigosDe(sectores.data?.contenido),
    vias: codigosDe(vias.data?.contenido),
    cargando: sectores.isPending || vias.isPending,
    ...((sectores.error ?? vias.error) ? { error: sectores.error ?? vias.error } : {}),
  };
}

interface FichaYaInscrita {
  readonly codigo: string;
  readonly titular: string;
}

interface PosibleDuplicado {
  readonly buscando: boolean;
  readonly ficha?: FichaYaInscrita;
}

/**
 * ¿Ya hay una ficha con este código? (`consulta_fichas`, operación de lectura).
 *
 * Se pregunta **mientras se compone** y no al guardar, que es el momento en el
 * que sirve: el 409 del backend llega después de haber llenado cuarenta campos.
 *
 * El filtro viaja como **prefijo por rango** —los dígitos, sin guiones—, que es
 * lo que el backend resuelve; la coincidencia exacta se decide aquí sobre lo que
 * vuelva, porque una búsqueda por prefijo también trae las unidades vecinas y
 * esas no son un duplicado, son los otros departamentos del mismo edificio.
 */
function usePosibleDuplicado(codigo: string): PosibleDuplicado {
  const digitos = normalizarCodigoCatastral(codigo);
  // Con menos de un código a medio componer no se pregunta: buscar por «2» trae
  // el padrón entero y no dice nada de nadie.
  const buscable = digitos.length >= MINIMO_PARA_BUSCAR;

  const consulta = useQuery({
    queryKey: ['alta-ficha', 'duplicado', digitos],
    enabled: buscable,
    queryFn: ({ signal }) =>
      pedirOperacion('consulta_fichas', { codRefCatastral: digitos }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'las fichas'),
      ),
  });

  if (!buscable) return { buscando: false };
  const encontrada = (consulta.data?.contenido ?? [])
    .filter(esObjeto)
    .find((fila) => fila['codRefCatastral'] === digitos);

  return {
    buscando: consulta.isFetching,
    ...(encontrada === undefined
      ? {}
      : {
          ficha: {
            codigo: digitos,
            titular:
              typeof encontrada['titular'] === 'string' && encontrada['titular'] !== ''
                ? encontrada['titular']
                : SIN_DATO,
          },
        }),
  };
}

/**
 * Cuántos dígitos hacen falta antes de preguntar por un duplicado.
 *
 * Son los del ubigeo más el sector: por debajo de eso la consulta devolvería
 * medio padrón y el aviso no diría nada. Sale de la composición y no de un
 * número escrito a mano porque D-10 sigue abierta.
 */
const MINIMO_PARA_BUSCAR = 8;

interface Padron {
  readonly buscando: boolean;
  readonly encontrados: readonly { readonly codigo: string; readonly nombre: string }[];
}

/** El padrón de contribuyentes (`contribuyentes`, #11): lectura, y del backend. */
function usePadron(buscado: string): Padron {
  const texto = buscado.trim();
  const consulta = useQuery({
    queryKey: ['alta-ficha', 'padron', texto],
    enabled: texto.length >= 3,
    queryFn: ({ signal }) =>
      pedirOperacion('contribuyentes', { nombreRazonSocial: texto, tamano: '10' }, signal).then(
        (cuerpo) => leerPaginado(cuerpo, 'los contribuyentes'),
      ),
  });

  if (texto.length < 3) return { buscando: false, encontrados: [] };
  return {
    buscando: consulta.isFetching,
    encontrados: (consulta.data?.contenido ?? [])
      .filter(esObjeto)
      .map((fila) => ({
        codigo: typeof fila['codigo'] === 'string' ? fila['codigo'] : '',
        nombre:
          typeof fila['nombreRazonSocial'] === 'string' ? fila['nombreRazonSocial'] : SIN_DATO,
      }))
      .filter((contribuyente) => contribuyente.codigo !== ''),
  };
}

/* ── Piezas menudas ────────────────────────────────────────────────────── */

function CampoDelAlta({
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
      // Lo que la opción no declaró no se puede escribir: la lista blanca vale
      // igual dentro del asistente que en cualquier otro formulario.
      bloqueado={!escritura.campos.has(campo)}
      {...(ph === undefined ? {} : { ph })}
      {...(opciones === undefined ? {} : { opciones: ['', ...opciones] })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

const rutaDeLaFicha = (codigo: string): string =>
  `/catastro/ficha-urbana/${encodeURIComponent(codigo)}`;

const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Los códigos de un listado del catálogo territorial, para un desplegable. */
const codigosDe = (contenido: readonly unknown[] = []): readonly string[] =>
  contenido
    .filter(esObjeto)
    .map((fila) => (typeof fila['codigo'] === 'string' ? fila['codigo'] : ''))
    .filter((codigo) => codigo !== '');
