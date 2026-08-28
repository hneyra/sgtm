import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Esqueleto } from '@sgtm/design-system';
import { pedirOperacion } from '@sgtm/api-client';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEscritura } from '../escritura';
import type { Escritura } from '../escritura';
import { escrituraDe } from '../escrituras';
import { textoDeError } from '../estados';
import { SIN_DATO, esObjeto, leerPaginado } from '../seguridad/listado';
import { CodigoCatastral } from './CodigoCatastral';
import {
  TRAMOS_DEL_CODIGO,
  formatearCodigoCatastral,
  normalizarCodigoCatastral,
  tramoDelCodigo,
} from './codigo';
import { CONSTRUCCIONES, TablaDePisos } from './TablaDePisos';

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

/** La opción del catálogo de la que cuelga este alta: de ella sale el permiso. */
const OPCION = 'ficha_urbana';

/** La operación que escribe. Solo se pasa a `useEscritura` con privilegio de registro. */
const OPERACION = 'registrar_ficha_urbana';

/** La clave del bloque de titular en `escrituras.ts`. Ni aquí ni allí un literal suelto. */
const TITULAR = 'titular';

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

export function AltaGuiadaDeFicha({
  titulo,
  onCerrar,
}: {
  /** Cómo se llama lo que se está dando de alta: «Nueva ficha urbana». */
  readonly titulo: string;
  readonly onCerrar: () => void;
}) {
  const [paso, fijarPaso] = useState(0);
  const declarada = escrituraDe(OPERACION);
  const catalogo = useCatalogoVisible();
  // El privilegio se comprueba también aquí y no solo en quien abre el
  // asistente: sin él la operación no existe, y entonces ningún control se puede
  // escribir. Es lo mismo que hace `ActualizacionDeCatastro`.
  const puedeRegistrar = catalogo.puedeRegistrar(OPCION);
  // Qué código se acaba de inscribir. Hace falta guardarlo aparte porque al
  // guardar el borrador se vacía —lo que ya está en el servidor no se queda en
  // memoria—, y sin él la pantalla de éxito no podría enlazar a la ficha creada.
  const [inscrita, fijarInscrita] = useState<string | null>(null);
  const codigoEnCurso = useRef('');

  const escritura = useEscritura(
    puedeRegistrar ? OPERACION : undefined,
    {},
    {
      campos: declarada?.campos ?? {},
      tablas: declarada?.tablas ?? {},
      // Lo que además de la observación hace falta para inscribir. Se comprueba
      // aquí y no al pulsar porque el backend lo exige y la pantalla ya lo sabe:
      // `direccion`, `uso`, `areaTerreno` y `documentoOrigen` son los cuatro que
      // `FichaController` reclama con `exigir(...)`, y el bloque de titular
      // reclama otros tres en cuanto se declara alguno.
      exigir: faltaParaInscribir,
      alGuardar: () => fijarInscrita(codigoEnCurso.current),
    },
  );

  const territorio = useTerritorio();
  const codigo = escritura.borrador['codRefCatastral'] ?? '';
  const duplicado = usePosibleDuplicado(codigo);
  codigoEnCurso.current = codigo;

  useLoElegidoEnElCodigo(escritura, codigo);
  useSalidaConEsc(onCerrar);

  const rotulo = useRef<HTMLHeadingElement>(null);
  // **El foco viaja con el paso.** Al avanzar, el botón que se pulsó se
  // deshabilita —«Continuar» sin lo que el paso nuevo pide—, y un botón
  // deshabilitado suelta el foco al `body`: el tabulador siguiente empieza por
  // la cabecera de la aplicación y quien no usa ratón no sabe que la pantalla
  // cambió. Se lleva al rótulo del paso, que es lo que hay que oír.
  useEffect(() => {
    rotulo.current?.focus();
  }, [paso, inscrita]);

  const idDelMotivo = useId();
  const esElUltimo = paso === PASOS.length - 1;
  // Por qué no se puede seguir. En el último paso es el motivo **completo**, con
  // la observación incluida: era el que faltaba, y vivía en un `title` sobre un
  // botón deshabilitado, donde no existe ni para el teclado ni para el lector.
  const motivo = esElUltimo ? escritura.motivo : faltaDelPaso(paso, escritura);

  if (inscrita !== null) {
    return <FichaInscrita codigo={inscrita} titulo={titulo} rotulo={rotulo} onCerrar={onCerrar} />;
  }

  return (
    <section className="sgtm-asistente" aria-label="Alta de ficha catastral urbana">
      <Riel paso={paso} />

      <div className="sgtm-asistente__panel">
        {/* Qué se está dando de alta, dicho mientras dura: el título de la
            cabecera sigue siendo el de la pantalla que había detrás. */}
        <p className="sgtm-asistente__flujo">{titulo}</p>
        <h2 className="sgtm-asistente__titulo" tabIndex={-1} ref={rotulo}>
          {`Paso ${paso + 1} de ${PASOS.length} · ${PASOS[paso]?.titulo ?? ''}`}
          <span>{PASOS[paso]?.detalle}</span>
        </h2>

        {paso === 0 && <PasoDeUbicacion escritura={escritura} territorio={territorio} />}
        {paso === 1 && (
          <PasoDelCodigo escritura={escritura} territorio={territorio} duplicado={duplicado} />
        )}
        {paso === 2 && <PasoDeLaFicha escritura={escritura} />}
        {paso === 3 && <PasoDeCierre escritura={escritura} duplicado={duplicado} />}

        {/* Por qué no se puede seguir, dicho donde se lee: en el paso, no en un
            botón apagado sin explicación. */}
        {motivo !== undefined && (
          <p className="sgtm-asistente__falta" id={idDelMotivo} role="status">
            {motivo}
          </p>
        )}

        <div className="sgtm-asistente__acciones">
          {/* «Cancelar» en los cuatro pasos: salir de un formulario de cuatro
              pantallas no puede exigir retroceder hasta el primero. */}
          <div className="sgtm-asistente__izquierda">
            <Boton onClick={onCerrar}>Cancelar</Boton>
            {paso > 0 && <Boton onClick={() => fijarPaso(paso - 1)}>Volver</Boton>}
          </div>
          {esElUltimo ? (
            <Boton
              variante="primario"
              disabled={!escritura.puedeEnviar}
              {...(motivo === undefined ? {} : { 'aria-describedby': idDelMotivo })}
              onClick={escritura.enviar}
            >
              {escritura.enviando ? 'Inscribir ficha…' : 'Inscribir ficha'}
            </Boton>
          ) : (
            <Boton
              variante="primario"
              disabled={motivo !== undefined}
              {...(motivo === undefined ? {} : { 'aria-describedby': idDelMotivo })}
              onClick={() => fijarPaso(paso + 1)}
            >
              Continuar
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

      {/* Lo elegido en el paso 1 se pone detrás del ubigeo en cuanto se teclea:
          es lo que el subtítulo del paso promete. Se dice, para que quien mire
          la pantalla sepa que esos tramos no los escribió él. */}
      {colaDeLoElegido(escritura.borrador) !== '' && (
        <p className="sgtm-asistente__nota">
          Al teclear los seis dígitos del ubigeo, el sector, la manzana y el lote elegidos en el
          paso anterior se componen detrás. Después manda lo que escribas aquí.
        </p>
      )}

      {sectorDelCodigo !== '' && !sectorExiste && !territorio.completo && (
        <Aviso
          titulo={`El sector ${sectorDelCodigo} no aparece en lo que se leyó del catálogo`}
          detalle="No se pudo comprobar contra el catálogo completo: el sistema lee una página de sectores y esta municipalidad tiene más de los que caben. Que no aparezca aquí no significa que no exista."
        />
      )}

      {sectorDelCodigo !== '' && !sectorExiste && territorio.completo && (
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

      {/* Callar mientras no se comprueba se lee como «no hay duplicado», que es
          lo contrario de lo que pasa: todavía no se ha preguntado. */}
      {!duplicado.comprobable && (
        <p className="sgtm-asistente__nota">
          Todavía no se ha comprobado si el código ya está inscrito: hacen falta al menos{' '}
          {MINIMO_PARA_BUSCAR} dígitos —el ubigeo y el sector— para preguntar por él.
        </p>
      )}

      {duplicado.buscando && (
        <p className="sgtm-asistente__nota">Comprobando si ya está inscrita…</p>
      )}

      {duplicado.ficha !== undefined && <AvisoDeDuplicado ficha={duplicado.ficha} />}
    </>
  );
}

/**
 * La unidad ya está inscrita: quién la tiene y dónde mirarla.
 *
 * Se dibuja **en el paso 2 y otra vez en el resumen del paso 4**. No es
 * repetirse: el aviso del paso 2 desaparece al continuar, y en el momento de
 * pulsar «Inscribir ficha» —tres pasos y cuarenta campos después— quien decide
 * ya no lo tiene delante. Que un código esté repetido es exactamente lo que hay
 * que saber justo antes de inscribirlo.
 */
function AvisoDeDuplicado({ ficha }: { readonly ficha: FichaYaInscrita }) {
  return (
    <div className="sgtm-duplicado" role="alert">
      <p className="sgtm-duplicado__titulo">
        La unidad {formatearCodigoCatastral(ficha.codigo)} ya está inscrita
        {ficha.titular === SIN_DATO ? '' : ` a nombre de ${ficha.titular}`}
      </p>
      <p className="sgtm-duplicado__detalle">
        Inscribir otra primera versión con este código es un conflicto, no un alta: lo que toca
        entonces es actualizar la ficha que ya existe. Míralo antes de seguir llenando el resto.
      </p>
      <Link
        className="sgtm-boton sgtm-boton--secundario sgtm-boton--menudo"
        to={rutaDeLaFicha(ficha.codigo)}
      >
        Ver esa ficha
      </Link>
    </div>
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

function PasoDeCierre({
  escritura,
  duplicado,
}: {
  readonly escritura: Escritura;
  readonly duplicado: PosibleDuplicado;
}) {
  const [buscado, fijarBuscado] = useState('');
  const padron = usePadron(buscado);
  const [titular = {}] = escritura.filasDe(TITULAR);
  const fijarTitular = (campo: string, valor: string): void =>
    escritura.fijarFilas(TITULAR, [{ ...titular, [campo]: valor }]);

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

      {/* El duplicado, otra vez y aquí: es el momento en el que se decide. */}
      {duplicado.ficha !== undefined && <AvisoDeDuplicado ficha={duplicado.ficha} />}

      {/* El titular es **opcional a propósito**: en un levantamiento catastral se
          ficha el predio antes de identificar a su propietario, y exigirlo aquí
          obligaría al técnico a inventarse uno (DAT-01 §4.2). Pero **declarado a
          medias no existe**: `DeclaracionDeFicha.titularDe` exige el código, la
          condición y el documento en cuanto el bloque viaja. */}
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
      {/* El documento **del título**, que no es el de la ficha: uno dice de dónde
          sale la inscripción y el otro con qué se acredita la propiedad. El
          backend pide los dos, y hasta hoy este no tenía control en pantalla —el
          alta con titular era 422 siempre, y sin sitio donde corregirlo—. */}
      <Campo
        etiqueta="Documento que acredita la titularidad"
        tipo="text"
        ph="Escritura pública, minuta o sucesión intestada"
        valor={titular['documentoOrigen'] ?? ''}
        onCambio={(valor) => fijarTitular('documentoOrigen', valor)}
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
        ayuda="Sin fecha, rige desde hoy."
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
    </>
  );
}

/**
 * Lo que se ve **después** del 201.
 *
 * Antes el asistente se quedaba en el paso 4 con los campos vacíos y una línea
 * de «hecho» arriba: parecía un formulario que se acababa de borrar solo, y no
 * había desde ahí ningún camino a la ficha que se acababa de crear. Ahora el
 * paso 4 termina en su acto: qué se inscribió, dónde verlo y cómo salir.
 */
function FichaInscrita({
  codigo,
  titulo,
  rotulo,
  onCerrar,
}: {
  readonly codigo: string;
  readonly titulo: string;
  readonly rotulo: RefObject<HTMLHeadingElement | null>;
  readonly onCerrar: () => void;
}) {
  return (
    <section className="sgtm-asistente__hecho" aria-label="Ficha inscrita">
      <div className="sgtm-asistente__panel">
        <p className="sgtm-asistente__flujo">{titulo}</p>
        <h2 className="sgtm-asistente__titulo" tabIndex={-1} ref={rotulo}>
          Ficha inscrita
          <span>
            La unidad {formatearCodigoCatastral(codigo)} quedó inscrita en su primera versión, con
            tu observación en la auditoría.
          </span>
        </h2>
        <div className="sgtm-asistente__acciones">
          <div className="sgtm-asistente__izquierda">
            <Boton onClick={onCerrar}>Cerrar</Boton>
          </div>
          <Link className="sgtm-boton sgtm-boton--primario" to={rutaDeLaFicha(codigo)}>
            Ver la ficha inscrita
          </Link>
        </div>
      </div>
    </section>
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
  // El último paso no lo decide esta función: lo decide `exigir`, que es lo que
  // la escritura ya evaluó —y lo que trae, además, la observación que falta—.
  return escritura.motivo;
}

/**
 * Lo que el backend exige y la pantalla ya sabe.
 *
 * Son los cuatro campos que `FichaController` reclama con `exigir(...)` antes de
 * tocar nada, más los tres que `DeclaracionDeFicha.titularDe` reclama **en
 * cuanto el bloque de titular viaja**: sin ellos la petición es 422 y no se
 * guarda ni la ficha, ni el predio, ni la titularidad. Comprobarlos aquí no
 * duplica esa regla —el servidor sigue mandando—: evita que alguien rellene
 * cuatro pasos para que se lo digan al final.
 */
function faltaParaInscribir(
  borrador: Readonly<Record<string, string>>,
  filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
): string | undefined {
  const valor = (campo: string): string => (borrador[campo] ?? '').trim();
  if (valor('codRefCatastral') === '') return 'Falta el código de referencia catastral.';
  if (valor('direccion') === '') return 'Falta la dirección del predio.';
  if (valor('areaTerreno') === '') return 'Falta el área de terreno.';
  if (valor('uso') === '') return 'Falta el uso del predio.';
  if (valor('documentoOrigen') === '') {
    return 'Falta el documento de origen: el acta, la resolución o la declaración jurada de la que sale esta ficha.';
  }
  return faltaDelTitular(filas[TITULAR]?.[0] ?? {});
}

/**
 * El titular: o entero, o ninguno.
 *
 * Es opcional —un predio se ficha antes de saber de quién es—, pero el bloque
 * que viaja lo declara `InscribirFicha.DatosDelTitular`, y ahí el código, la
 * condición y el documento son obligatorios los tres. Medio bloque es un 422, no
 * un titular a medias.
 */
function faltaDelTitular(titular: Readonly<Record<string, string>>): string | undefined {
  const valor = (campo: string): string => (titular[campo] ?? '').trim();
  const declarado = ['codigoContribuyente', 'condicion', 'porcentaje', 'documentoOrigen'].some(
    (campo) => valor(campo) !== '',
  );
  if (!declarado) return undefined;
  if (valor('codigoContribuyente') === '') {
    return 'Falta el código del contribuyente: un titular declarado a medias no se puede inscribir.';
  }
  if (valor('condicion') === '') {
    return 'Falta la condición del titular: con qué título se tiene el predio.';
  }
  if (valor('documentoOrigen') === '') {
    return 'Falta el documento que acredita la titularidad: la escritura, la minuta o la sucesión.';
  }
  return undefined;
}

/** El resumen del paso 4: lo capturado, tal como se va a mandar. */
function resumenDe(escritura: Escritura): readonly { rotulo: string; valor: string }[] {
  const valor = (campo: string): string => {
    const escrito = (escritura.borrador[campo] ?? '').trim();
    return escrito === '' ? SIN_DATO : escrito;
  };
  const pisos = escritura.filasDe(CONSTRUCCIONES).length;
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

/* ── Lo elegido en el paso 1, dentro del código ────────────────────────── */

/** Cuántos dígitos ocupa el ubigeo: departamento, provincia y distrito. */
const UBIGEO = ['departamento', 'provincia', 'distrito'].reduce(
  (total, nombre) =>
    total + (TRAMOS_DEL_CODIGO.find((tramo) => tramo.nombre === nombre)?.longitud ?? 0),
  0,
);

/** La longitud del tramo del código que se llama así. */
const largoDelTramo = (nombre: string): number =>
  TRAMOS_DEL_CODIGO.find((tramo) => tramo.nombre === nombre)?.longitud ?? 0;

/**
 * Sector, manzana y lote del paso 1, **como cola del código**.
 *
 * El código es una cadena posicional que se llena de izquierda a derecha y sin
 * huecos (ver `CodigoCatastral`), así que estos tres tramos solo se pueden poner
 * detrás del ubigeo —y el ubigeo no sale de ninguna elección: lo teclea quien
 * compone—. Por eso se corta en el primer tramo que falte: con la manzana vacía,
 * el lote ocuparía la posición de la manzana y diría otra cosa.
 */
function colaDeLoElegido(borrador: Readonly<Record<string, string>>): string {
  let cola = '';
  for (const [campo, tramo] of [
    ['codigoDeSector', 'sector'],
    ['codigoDeManzana', 'manzana'],
    ['lote', 'lote'],
  ] as const) {
    const escrito = (borrador[campo] ?? '').replace(/[^0-9]/g, '');
    if (escrito === '') return cola;
    cola += escrito.slice(0, largoDelTramo(tramo)).padStart(largoDelTramo(tramo), '0');
  }
  return cola;
}

/**
 * Compone el código sobre lo elegido, en cuanto el ubigeo está escrito.
 *
 * Es lo que el subtítulo del paso 2 promete y no hacía: se elegía el sector en
 * un desplegable y después había que volver a teclearlo dígito a dígito, con la
 * posibilidad de teclear otro distinto —y el aviso de discrepancia existía justo
 * porque eso pasaba—.
 *
 * Se hace **una vez por ubigeo**: después manda quien escribe. Volver atrás y
 * borrar hasta el ubigeo no vuelve a componer, porque borrar es una decisión.
 */
function useLoElegidoEnElCodigo(escritura: Escritura, codigo: string): void {
  const cola = colaDeLoElegido(escritura.borrador);
  const compuesto = useRef<string | null>(null);
  const fijar = useRef(escritura.fijarCampo);
  fijar.current = escritura.fijarCampo;

  useEffect(() => {
    if (cola === '' || codigo.length !== UBIGEO || compuesto.current === codigo) return;
    compuesto.current = codigo;
    fijar.current('codRefCatastral', codigo + cola);
  }, [codigo, cola]);
}

/** Esc cierra el asistente, oído en `document`: el foco puede estar en cualquier campo. */
function useSalidaConEsc(onCerrar: () => void): void {
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      cerrar.current();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);
}

/* ── Las lecturas: ninguna inventada, todas del contrato ───────────────── */

interface Territorio {
  readonly sectores: readonly string[];
  readonly vias: readonly string[];
  readonly cargando: boolean;
  /**
   * Se leyó el catálogo **entero**, no su primera página.
   *
   * Importa porque de ello depende qué se puede afirmar: con el catálogo
   * completo, un sector que no está es un sector que no existe; con una página,
   * es un sector que no se pudo comprobar. Decir lo primero cuando pasa lo
   * segundo manda a dar de alta un sector que ya existe.
   */
  readonly completo: boolean;
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
      pedirOperacion('sectores', { tamano: `${DEL_CATALOGO}` }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'los sectores'),
      ),
  });
  const vias = useQuery({
    queryKey: ['alta-ficha', 'vias'],
    queryFn: ({ signal }) =>
      pedirOperacion('calles', { tamano: `${DEL_CATALOGO}` }, signal).then((cuerpo) =>
        leerPaginado(cuerpo, 'las vias'),
      ),
  });

  return {
    sectores: codigosDe(sectores.data?.contenido),
    vias: codigosDe(vias.data?.contenido),
    cargando: sectores.isPending || vias.isPending,
    completo:
      sectores.data !== undefined && sectores.data.contenido.length >= sectores.data.totalElementos,
    ...((sectores.error ?? vias.error) ? { error: sectores.error ?? vias.error } : {}),
  };
}

/** Cuántas filas del catálogo se piden de una vez. Una página, no el padrón. */
const DEL_CATALOGO = 200;

interface FichaYaInscrita {
  readonly codigo: string;
  readonly titular: string;
}

interface PosibleDuplicado {
  /** Ya hay código suficiente para preguntar. Si no, no es que no haya: es que no se preguntó. */
  readonly comprobable: boolean;
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
 *
 * **No se pregunta por tecla**: componer un código de 21 dígitos disparaba 21
 * consultas contra el padrón, y las veinte primeras eran prefijos que a nadie le
 * interesaban. Se espera a que la mano pare (`useValorAposentado`).
 */
function usePosibleDuplicado(codigo: string): PosibleDuplicado {
  const digitos = useValorAposentado(normalizarCodigoCatastral(codigo));
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

  if (!buscable) return { comprobable: false, buscando: false };
  const encontrada = (consulta.data?.contenido ?? [])
    .filter(esObjeto)
    .find((fila) => fila['codRefCatastral'] === digitos);

  return {
    comprobable: true,
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
const MINIMO_PARA_BUSCAR = UBIGEO + largoDelTramo('sector');

interface Padron {
  readonly buscando: boolean;
  readonly encontrados: readonly { readonly codigo: string; readonly nombre: string }[];
}

/** El padrón de contribuyentes (`contribuyentes`, #11): lectura, y del backend. */
function usePadron(buscado: string): Padron {
  const texto = useValorAposentado(buscado.trim());
  const consulta = useQuery({
    queryKey: ['alta-ficha', 'padron', texto],
    enabled: texto.length >= MINIMO_DEL_PADRON,
    queryFn: ({ signal }) =>
      pedirOperacion('contribuyentes', { nombreRazonSocial: texto, tamano: '10' }, signal).then(
        (cuerpo) => leerPaginado(cuerpo, 'los contribuyentes'),
      ),
  });

  if (texto.length < MINIMO_DEL_PADRON) return { buscando: false, encontrados: [] };
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

/** Con menos de esto, buscar en el padrón devuelve el padrón. */
const MINIMO_DEL_PADRON = 3;

/**
 * El valor, cuando la mano para.
 *
 * Las dos búsquedas en vivo del asistente —el duplicado y el padrón— entraban en
 * la clave de consulta con lo tecleado tal cual, así que cada tecla era una
 * consulta contra el padrón. Con esto entra **lo que quedó escrito**: teclear
 * «GARCIA» son seis pulsaciones y una consulta.
 */
function useValorAposentado<T>(valor: T, milisegundos = ESPERA): T {
  const [aposentado, fijar] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => fijar(valor), milisegundos);
    return () => clearTimeout(temporizador);
  }, [valor, milisegundos]);

  return aposentado;
}

/** Lo que se espera antes de preguntar. Suficiente para escribir el siguiente dígito. */
const ESPERA = 300;

/* ── Piezas menudas ────────────────────────────────────────────────────── */

function CampoDelAlta({
  escritura,
  campo,
  etiqueta,
  tipo = 'text',
  ph,
  ayuda,
  opciones,
}: {
  readonly escritura: Escritura;
  readonly campo: string;
  readonly etiqueta: string;
  readonly tipo?: 'text' | 'sel' | 'date';
  readonly ph?: string;
  readonly ayuda?: string;
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
      {...(ayuda === undefined ? {} : { ayuda })}
      {...(opciones === undefined ? {} : { opciones })}
      {...(escritura.errorPorCampo[campo] === undefined
        ? {}
        : { error: escritura.errorPorCampo[campo] })}
      onCambio={(valor) => escritura.fijarCampo(campo, valor)}
    />
  );
}

const rutaDeLaFicha = (codigo: string): string =>
  `/catastro/ficha-urbana/${encodeURIComponent(codigo)}`;

/** Los códigos de un listado del catálogo territorial, para un desplegable. */
const codigosDe = (contenido: readonly unknown[] = []): readonly string[] =>
  contenido
    .filter(esObjeto)
    .map((fila) => (typeof fila['codigo'] === 'string' ? fila['codigo'] : ''))
    .filter((codigo) => codigo !== '');
