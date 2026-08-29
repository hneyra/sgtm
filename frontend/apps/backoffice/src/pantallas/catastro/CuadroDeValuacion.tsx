import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Aviso, Boton, Campo, Esqueleto, FechaDeCalculo } from '@sgtm/design-system';
import type { Celda } from '@sgtm/api-client';
import type { CampoDePantalla, EstructuraDePantalla } from '../../catalogo';
import { opcionPorId } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { composicionDe, filtrosDe } from '../composicion';
import { PAGINA, conCambio, leerBusqueda, parametrosDeBusqueda } from '../busqueda';
import { SIN_PERMISO, textoDeError } from '../estados';
import { Filtros } from '../bloques/Filtros';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_DATO, hoy, tablaDeLista, texto } from '../seguridad/listado';
import { useTablaDeValuacion } from './useTablaDeValuacion';
import type { OperacionDeValuacion } from './useTablaDeValuacion';

/**
 * **El cuadro de valuación del ejercicio**: aranceles, valores unitarios y
 * depreciación en una sola superficie (propuesta B de `design/propuestas/catastro`).
 *
 * Las tres opciones responden la misma pregunta —qué valores rigen para este
 * ejercicio— y hasta hoy la respondían en tres pantallas, con tres selectores de
 * año y dos botones que no podían guardar. Aquí son una pantalla, tres hojas y
 * una banda de procedencia.
 *
 * **Lo que no cambia**: las tres rutas siguen siendo tres —`/catastro/aranceles`,
 * `/catastro/valores-unitarios`, `/catastro/depreciacion`—, cada una con su id,
 * su entrada de menú y **su permiso**. La hoja activa la decide la ruta y
 * cambiar de pestaña **navega**, igual que en `Territorio.tsx` y por los mismos
 * dos motivos: el enlace de lo que se está mirando se puede compartir (FRO-04
 * §5) y el permiso lo sigue decidiendo el guardia de `Pantalla`, que corre al
 * entrar por la ruta. La pestaña de una opción que este perfil no puede ver no
 * se dibuja: sería un enlace a un aviso de «no tienes permiso».
 *
 * **Un solo ejercicio, arriba, y es lo único que decide qué cuadro se lee.** Los
 * tres controladores aceptan `@RequestParam int anio` y nada más. `depreciacion`
 * gana así el año que su pantalla no tenía —se filtraba por material y uso, sin
 * ejercicio, y un cuadro de depreciación sin año no se puede defender—.
 *
 * **Las columnas salen del cuadro, no de una lista fija.** Era lo que impedía
 * conectar dos de las tres: el prototipo dibuja siete partidas fijas y el
 * sistema publica una fila por partida. La cabecera se construye con los valores
 * de `partida` y de `estadoConservacion` que **vengan en la respuesta**, así que
 * una partida que el cuadro no traiga no tiene columna —nunca una cifra bajo la
 * cabecera de otra— y una celda que falte sale «—», jamás un cero.
 *
 * **Ninguna cifra se compone aquí** (RNF-083, regla 5): no se suma, no se
 * promedia y no se calcula la variación contra el año anterior. Lo que el
 * recurso no publica sale «—».
 *
 * **No hay «Importar tabla del año» ni «Guardar»**, y no es una simplificación:
 * ninguno de los dos podía escribir nunca. `ADR-0017` deja valores unitarios y
 * depreciación como catálogos nacionales que solo escribe `rol_carga_parametros`
 * (V55, con `REVOKE INSERT/UPDATE` a `sgtm_app`), y el arancel municipal cuelga
 * del conjunto de parámetros que V18 vuelve inmutable al sellarse. Es el patrón
 * de #332 —ningún acto promete lo que no puede— y el precedente de `sectores`
 * en `Territorio.tsx`: no es que la franja del motivo esté vacía, es que no hay
 * barra de acciones que leer.
 */

const ARANCELES = 'aranceles';
const VALORES_UNITARIOS = 'valores_unitarios';
const DEPRECIACION = 'depreciacion';

/** Las tres hojas, en el orden del cuadro: terreno, edificación, descuento. */
const HOJAS: readonly OperacionDeValuacion[] = [ARANCELES, VALORES_UNITARIOS, DEPRECIACION];

/** Qué se está leyendo, para el mensaje del lector que rechaza un cuerpo raro. */
const QUE: Readonly<Record<OperacionDeValuacion, string>> = {
  aranceles: 'los aranceles',
  valores_unitarios: 'los valores unitarios',
  depreciacion: 'la depreciación',
};

/**
 * El filtro del ejercicio del catálogo **no se dibuja en la hoja**: lo sustituye
 * el selector único de arriba, que es la propuesta entera. Dibujar los dos
 * dejaría dos años en la misma pantalla y solo uno viajando.
 */
const EJERCICIO = 'ejercicio';

/**
 * Filtros que **acotan lo que ya llegó**, en el navegador, y por eso no se
 * dibujan en el bloque de búsqueda: ahí un valor acaba en la URL y se lee como
 * un filtro del servidor.
 *
 * Hoy uno: `materialMep`. `DepreciacionResource` publica `material` en cada
 * fila, así que elegir un material es elegir entre lo recibido —no inventar un
 * filtro que el controlador ignora—. Su desplegable se construye con los
 * materiales que vinieron, no con las cinco opciones del prototipo.
 */
const ACOTAN_EN_EL_NAVEGADOR: ReadonlySet<string> = new Set(['materialMep']);

/** La opción del desplegable local que no acota nada. Como los «Todas» del prototipo. */
const TODOS = 'Todos';

export function CuadroDeValuacion({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const [busqueda, fijarBusqueda] = useSearchParams();
  const [material, fijarMaterial] = useState(TODOS);

  const hoja = esHoja(estructura.id) ? estructura.id : ARANCELES;
  const tabla = useTablaDeValuacion(hoja, QUE[hoja], parametrosQueViajan(hoja, busqueda));

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (tabla.error !== undefined) {
    const error = textoDeError(tabla.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={tabla.reintentar}>Reintentar</Boton>
      </Aviso>
    );
  }

  const busquedaActiva = leerBusqueda(busqueda);
  const declarados = filtrosDe(estructura.id, estructura.filtros) ?? [];
  const filtrosDeLaHoja = declarados.filter(
    (campo) => campo.clave !== EJERCICIO && !ACOTAN_EN_EL_NAVEGADOR.has(campo.clave),
  );

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <FechaDeCalculo fecha={hoy()} />

      {/* **Un solo selector de ejercicio, arriba de las tres hojas.** Es de solo
          lectura a propósito: el ejercicio es de la sesión —lo cambia el `PUT`
          de «Cambiar el año de trabajo» (#13)— y ofrecer aquí un desplegable que
          lo cambiara sería escribir en la sesión desde una pantalla de consulta,
          sin observación (regla 10) y sin que el resto de los módulos se
          enteraran. */}
      <section className="sgtm-tarjeta sgtm-cuadro__ejercicio" aria-label="Ejercicio del cuadro">
        <Campo
          etiqueta="Ejercicio"
          tipo="ro"
          valor={String(tabla.ejercicio)}
          ayuda="El año de trabajo de la sesión, y lo único que se manda al pedir el cuadro: los tres controladores solo reciben «anio». Se cambia en «Cambiar el año de trabajo»."
        />
      </section>

      <div className="sgtm-pestanas" role="tablist" aria-label="Hojas del cuadro de valuación">
        {HOJAS.filter((opcion) => catalogo.puedeVer(opcion)).map((opcion) => {
          const situada = opcionPorId(opcion);
          if (situada === undefined) return null;
          return (
            <Link
              key={opcion}
              to={situada.ruta}
              role="tab"
              aria-selected={opcion === hoja}
              className="sgtm-pestanas__tab"
              data-activa={opcion === hoja ? '1' : '0'}
            >
              {/* El rótulo del catálogo, sin reescribir (RNF-080). */}
              {situada.title}
            </Link>
          );
        })}
      </div>

      <BandaDeProcedencia hoja={hoja} filas={tabla.filas} cargando={tabla.cargando} />

      {filtrosDeLaHoja.length > 0 && (
        <Filtros
          opcion={estructura.id}
          campos={filtrosDeLaHoja}
          buscado={busquedaActiva.filtros}
          cargando={tabla.cargando}
          onBuscar={(valores) =>
            fijarBusqueda(
              conCambio(new URLSearchParams(busqueda), {
                ...vaciar(busquedaActiva.filtros),
                ...valores,
                [PAGINA]: undefined,
              }),
            )
          }
        />
      )}

      {tabla.cargando ? (
        <Esqueleto alto={200} />
      ) : hoja === ARANCELES ? (
        <HojaDeAranceles estructura={estructura} filas={tabla.filas} />
      ) : tabla.vacia ? (
        <SinCuadro hoja={hoja} ejercicio={tabla.ejercicio} />
      ) : hoja === VALORES_UNITARIOS ? (
        <HojaDeValoresUnitarios filas={tabla.filas} ejercicio={tabla.ejercicio} />
      ) : (
        <HojaDeDepreciacion
          estructura={estructura}
          filas={tabla.filas}
          ejercicio={tabla.ejercicio}
          material={material}
          onMaterial={fijarMaterial}
        />
      )}
    </>
  );
}

/* ── La banda de procedencia ───────────────────────────────────────────── */

/**
 * De dónde sale este cuadro, **con lo que la API publica de verdad**.
 *
 * Lo único que publica es el `documentoFuente` de cada fila: los tres recursos
 * lo traen y ninguno trae nada más de la procedencia. No hay fecha de
 * publicación, ni las dos firmas que `ADR-0007` exige de un parámetro
 * verificado, ni el estado de sellado del conjunto —ni en el recurso ni en el
 * contrato—. Los cuatro salen «—» y la banda dice por qué; **no se rellenan
 * desde el corpus** de `docs/10-negocio/valores-normativos/`, que es donde están
 * escritos: el corpus es lo que se cargó, no lo que este servidor está
 * sirviendo, y copiarlo aquí produciría una banda que jura por un cuadro que
 * nadie ha comprobado que sea ese.
 *
 * **Y si las filas citan varios documentos distintos, se dicen todos.** Pintar
 * el primero es lo cómodo y es exactamente lo que no se puede hacer: un cuadro
 * cuyas filas vienen de dos resoluciones distintas se estaría atribuyendo entero
 * a una de las dos, y esa es la frase que acaba en el sustento de una
 * determinación.
 */
export function BandaDeProcedencia({
  hoja,
  filas,
  cargando,
}: {
  readonly hoja: OperacionDeValuacion;
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  readonly cargando: boolean;
}) {
  const documentos = documentosFuente(filas);

  return (
    <section className="sgtm-procedencia" aria-label="Procedencia del cuadro">
      <p className="sgtm-procedencia__ambito">
        <span className="sgtm-procedencia__etiqueta">Ámbito</span>
        <span className="sgtm-procedencia__valor">{AMBITO[hoja]}</span>
      </p>

      <div className="sgtm-procedencia__norma">
        <span className="sgtm-procedencia__etiqueta">Norma · documento fuente de cada fila</span>
        {cargando ? (
          <Esqueleto alto={20} />
        ) : documentos.length === 0 ? (
          <span className="sgtm-procedencia__hueco">{SIN_DATO}</span>
        ) : documentos.length === 1 ? (
          <span className="sgtm-procedencia__valor">{documentos[0]}</span>
        ) : (
          <>
            <ul className="sgtm-procedencia__documentos">
              {documentos.map((documento) => (
                <li key={documento}>{documento}</li>
              ))}
            </ul>
            <p className="sgtm-procedencia__nota">
              Las filas de este cuadro citan {documentos.length} documentos distintos: se enumeran
              todos, porque cualquiera de ellos sustenta parte del cuadro y ninguno lo sustenta
              entero.
            </p>
          </>
        )}
      </div>

      <dl className="sgtm-procedencia__firmas">
        {SIN_PUBLICAR.map((dato) => (
          <div key={dato}>
            <dt className="sgtm-procedencia__etiqueta">{dato}</dt>
            <dd className="sgtm-procedencia__hueco">{SIN_DATO}</dd>
          </div>
        ))}
      </dl>

      <p className="sgtm-procedencia__nota">
        Lo único que la API publica de la procedencia es el documento fuente de cada fila. La fecha
        de publicación, las dos firmas que ADR-0007 exige y el estado de sellado del conjunto no
        salen por ningún recurso ni por el contrato: salen «—» hasta que salgan, y no se rellenan
        desde el corpus de valores normativos.
      </p>
    </section>
  );
}

/**
 * Los cuatro datos de procedencia que **ninguna respuesta publica**.
 *
 * Se enumeran en vez de omitirse por lo mismo que un filtro bloqueado se dibuja
 * (`composicion.ts`): quien tiene que defender una determinación viene a buscar
 * exactamente esto, y una banda que no los nombra deja pensando que no hacen
 * falta. Nombrados y en «—» dicen que faltan y a quién le toca.
 */
const SIN_PUBLICAR: readonly string[] = [
  'Publicada',
  'Transcribió',
  'Verificó',
  'Estado del conjunto',
];

/**
 * Municipal o nacional, que es lo que decide **quién** puede cargar el cuadro.
 *
 * No es un dato de la respuesta: es del contrato del backend, y está escrito en
 * `ADR-0017` —valores unitarios y depreciación son catálogos nacionales, con
 * `REVOKE INSERT/UPDATE` a `sgtm_app` en V55; el arancel es municipal y cuelga
 * del conjunto de parámetros del ejercicio—. Se dice porque es la mitad de por
 * qué esta pantalla no tiene «Guardar».
 */
const AMBITO: Readonly<Record<OperacionDeValuacion, string>> = {
  aranceles: 'Municipal',
  valores_unitarios: 'Nacional',
  depreciacion: 'Nacional',
};

/**
 * Los documentos fuente que citan las filas, **sin repetir y sin elegir uno**.
 *
 * Ordenados alfabéticamente para que dos dibujos de la misma respuesta salgan
 * iguales: el orden de las filas lo decide el servidor y no significa nada.
 */
export function documentosFuente(
  filas: readonly Readonly<Record<string, unknown>>[],
): readonly string[] {
  const vistos = new Set<string>();
  for (const fila of filas) {
    const documento = fila['documentoFuente'];
    if (typeof documento === 'string' && documento.trim() !== '') vistos.add(documento.trim());
  }
  return [...vistos].sort((a, b) => a.localeCompare(b));
}

/* ── Hoja 1: aranceles de terreno ──────────────────────────────────────── */

/**
 * Aranceles de terreno (RF-009, #17): la única de las tres que **no es una
 * matriz**, sino la fila suelta que el resto del módulo ya dibuja.
 *
 * Sus columnas siguen siendo las del catálogo portado, letra por letra
 * (RNF-080), y con los mismos huecos que ya tenía: `ArancelResource` publica el
 * id de la vía y no su nombre —cruzarlo con el catálogo vial traería las vías
 * enteras a una tabla que solo necesita el arancel—, `tramo` es una subdivisión
 * libre y no un rango, así que no hay «cuadra hasta» que separarle, y la zona no
 * la publica nadie. La variación contra el año anterior sale «—» y no se
 * calcula: sería componer una cifra de valuación (RNF-083).
 *
 * **Sus filtros «Vía» y «Zona» sí viajan**, como hasta hoy: el contrato los
 * declara y `ArancelController` los ignora. Es la brecha que #70 aceptó para
 * `accesos`, y no la cierra esta propuesta —fingir que la interfaz los aplica
 * sería peor que dejarlos sin efecto—.
 */
function HojaDeAranceles({
  estructura,
  filas,
}: {
  readonly estructura: EstructuraDePantalla;
  readonly filas: readonly Readonly<Record<string, unknown>>[];
}) {
  if (estructura.tabla === undefined) return null;
  return (
    <TablaDePantalla
      estructura={estructura.tabla}
      opcion={estructura.id}
      datos={tablaDeLista(filas, celdasDelArancel, 'aranceles')}
      cargando={false}
    />
  );
}

const celdasDelArancel = (arancel: Readonly<Record<string, unknown>>): readonly Celda[] => [
  { texto: texto(arancel['viaId']) },
  { texto: texto(arancel['tramo']) },
  { texto: SIN_DATO },
  { texto: SIN_DATO },
  { texto: texto(arancel['valorM2']) },
  { texto: SIN_DATO },
];

/* ── Hoja 2: valores unitarios de edificación ──────────────────────────── */

/**
 * Valores unitarios: una matriz **por tramo de año de construcción**.
 *
 * El año de construcción es la segunda dimensión que NEG-05 exige y que el
 * prototipo no dibuja ni como columna ni como filtro. Colapsarla —una sola
 * matriz con las filas de todos los tramos— haría que el valor de una
 * edificación de 1990 y el de una de 2020 acabaran en la misma celda, y ganaría
 * el último que llegase. Aquí cada tramo es su propia tabla, con su título, y
 * las partidas de **ese** tramo por columnas.
 */
function HojaDeValoresUnitarios({
  filas,
  ejercicio,
}: {
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  readonly ejercicio: number;
}) {
  return (
    <>
      {agruparPorTramo(filas).map((tramo) => (
        <Matriz
          key={tramo.clave}
          titulo={`Edificaciones de ${tramo.desde}${tramo.hasta === undefined ? ' a más' : ` a ${tramo.hasta}`}`}
          conteo={`Ejercicio ${ejercicio}`}
          rotuloDeLaPrimera="Categoría"
          columnas={tramo.partidas}
          renglones={tramo.categorias}
          valores={tramo.valores}
        />
      ))}
    </>
  );
}

/* ── Hoja 3: tabla de depreciación ─────────────────────────────────────── */

/**
 * Depreciación: una matriz **por material**, con los estados de conservación que
 * vengan por columnas y los tramos de antigüedad por filas.
 *
 * El desplegable de material acota **lo que ya llegó** —`material` viene en cada
 * fila— y no vuelve a pedir: no viaja, porque `DepreciacionController` no lo
 * recibe. Sus opciones son los materiales de la respuesta y no las cinco del
 * prototipo: ofrecer «QUINCHA» cuando el cuadro no la trae es ofrecer un filtro
 * que siempre vacía la tabla.
 */
function HojaDeDepreciacion({
  estructura,
  filas,
  ejercicio,
  material,
  onMaterial,
}: {
  readonly estructura: EstructuraDePantalla;
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  readonly ejercicio: number;
  readonly material: string;
  readonly onMaterial: (valor: string) => void;
}) {
  const grupos = agruparPorMaterial(filas);
  const visibles = material === TODOS ? grupos : grupos.filter((g) => g.material === material);

  return (
    <>
      <section className="sgtm-tarjeta sgtm-cuadro__acotar" aria-label="Acotar el cuadro">
        <Campo
          // El rótulo del catálogo, no uno escrito aquí (RNF-080).
          etiqueta={rotuloDelFiltro(estructura, 'materialMep', 'Material (MEP)')}
          tipo="sel"
          valor={material}
          opciones={[TODOS, ...grupos.map((grupo) => grupo.material)]}
          ayuda="Acota los materiales que ya se cargaron: el cuadro llega entero y este desplegable no vuelve a pedirlo."
          onCambio={onMaterial}
        />
      </section>

      {visibles.map((grupo) => (
        <Matriz
          key={grupo.material}
          titulo={grupo.material}
          conteo={`Ejercicio ${ejercicio}`}
          rotuloDeLaPrimera="Antigüedad hasta (años)"
          columnas={grupo.estados}
          renglones={grupo.tramos.map(String)}
          valores={grupo.valores}
        />
      ))}
    </>
  );
}

/** El rótulo con que el catálogo llama a ese filtro, o el de reserva. */
function rotuloDelFiltro(
  estructura: EstructuraDePantalla,
  clave: string,
  porOmision: string,
): string {
  const declarado: CampoDePantalla | undefined = estructura.filtros?.find(
    (campo) => campo.clave === clave,
  );
  return declarado?.label ?? porOmision;
}

/* ── La matriz, común a las dos hojas nacionales ───────────────────────── */

/**
 * Una matriz cuya **cabecera sale de los datos**.
 *
 * `columnas` son los valores distintos que trajo la respuesta —partidas o
 * estados de conservación—, y `renglones` los de la otra dimensión. Una celda
 * que no venga sale «—», nunca un cero: un cero afirma que el cuadro vale cero
 * ahí, y eso valoriza.
 */
function Matriz({
  titulo,
  conteo,
  rotuloDeLaPrimera,
  columnas,
  renglones,
  valores,
}: {
  readonly titulo: string;
  readonly conteo: string;
  readonly rotuloDeLaPrimera: string;
  readonly columnas: readonly string[];
  readonly renglones: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}) {
  return (
    <section className="sgtm-tarjeta">
      <div className="sgtm-tarjeta__cabecera">
        <h2 className="sgtm-tarjeta__titulo">{titulo}</h2>
        <span className="sgtm-tarjeta__conteo">{conteo}</span>
      </div>
      <div className="sgtm-tabla__marco" role="region" aria-label={titulo} tabIndex={0}>
        <table className="sgtm-tabla">
          <thead>
            <tr>
              <th scope="col">{rotuloDeLaPrimera}</th>
              {columnas.map((columna) => (
                <th key={columna} scope="col" className="sgtm-tabla--numerica">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renglones.map((renglon) => (
              <tr key={renglon}>
                <td>{renglon}</td>
                {columnas.map((columna) => (
                  <td key={columna} className="sgtm-tabla--numerica">
                    {valores[claveDeCelda(renglon, columna)] ?? SIN_DATO}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Sin cuadro sellado para el ejercicio: vacío explícito, nunca cifras de ejemplo.
 *
 * Solo para las dos hojas nacionales: los aranceles son una tabla del catálogo y
 * su vacío lo dice `TablaDePantalla`, que además distingue «no hay ninguno» de
 * «ninguno cumple los filtros» —esa hoja sí tiene filtros vivos—.
 */
function SinCuadro({
  hoja,
  ejercicio,
}: {
  readonly hoja: 'valores_unitarios' | 'depreciacion';
  readonly ejercicio: number;
}) {
  return (
    <Aviso
      titulo={`${TITULO_DEL_VACIO[hoja]} ${ejercicio}`}
      detalle="El sistema no devolvió ninguna fila para este ejercicio. Sin cuadro no hay cifras que enseñar, y esa es la respuesta correcta: una matriz a medio llenar valorizaría todo un padrón sin que ninguna celda pareciera mal. En cuanto se selle un conjunto verificado (D-02a), esta pantalla lo muestra."
    />
  );
}

const TITULO_DEL_VACIO: Readonly<Record<'valores_unitarios' | 'depreciacion', string>> = {
  valores_unitarios: 'Sin valores unitarios sellados para',
  depreciacion: 'Sin tabla de depreciación sellada para',
};

/* ── Lo que agrupa las filas sueltas en matrices ───────────────────────── */

/** La clave de una celda de la matriz: su renglón y su columna. */
const claveDeCelda = (renglon: string, columna: string): string => `${renglon}·${columna}`;

/**
 * Los valores distintos de una clave, ordenados de forma **estable**.
 *
 * Alfabéticamente y no por orden de llegada: el orden de las filas lo decide el
 * servidor, no significa nada y cambiaría la cabecera de un dibujo a otro. Y no
 * por una lista de partidas escrita aquí, que es justo lo que esta propuesta
 * quita: una lista fija pone cifras bajo la cabecera de otra partida en cuanto
 * el cuadro deje de traer una.
 */
const distintosOrdenados = (valores: Iterable<string>): readonly string[] =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b));

export interface TramoDeValores {
  readonly clave: string;
  readonly desde: number;
  readonly hasta?: number;
  readonly categorias: readonly string[];
  /** Las partidas **de este tramo**, tal como vinieron. Nunca una lista fija. */
  readonly partidas: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}

/** Agrupa las filas sueltas del backend por tramo de año de construcción. */
export function agruparPorTramo(
  filas: readonly Readonly<Record<string, unknown>>[],
): readonly TramoDeValores[] {
  const tramos = new Map<
    string,
    {
      desde: number;
      hasta?: number;
      categorias: string[];
      partidas: string[];
      valores: Record<string, string>;
    }
  >();

  for (const fila of filas) {
    const desde = entero(fila['anioConstruccionDesde']) ?? 0;
    const hasta = entero(fila['anioConstruccionHasta']);
    const clave = `${desde}-${hasta ?? ''}`;
    const categoria = texto(fila['categoria']);
    const partida = texto(fila['partida']);

    const tramo = tramos.get(clave) ?? {
      desde,
      ...(hasta === undefined ? {} : { hasta }),
      categorias: [],
      partidas: [],
      valores: {},
    };
    tramo.categorias.push(categoria);
    tramo.partidas.push(partida);
    tramo.valores[claveDeCelda(categoria, partida)] = texto(fila['valorM2']);
    tramos.set(clave, tramo);
  }

  return [...tramos.entries()]
    .sort(([, a], [, b]) => a.desde - b.desde)
    .map(([clave, tramo]) => ({
      clave,
      desde: tramo.desde,
      ...(tramo.hasta === undefined ? {} : { hasta: tramo.hasta }),
      categorias: distintosOrdenados(tramo.categorias),
      partidas: distintosOrdenados(tramo.partidas),
      valores: tramo.valores,
    }));
}

export interface GrupoDeDepreciacion {
  readonly material: string;
  readonly tramos: readonly number[];
  /** Los estados de conservación **de este material**, tal como vinieron. */
  readonly estados: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}

/** Agrupa las filas sueltas del backend por material predominante. */
export function agruparPorMaterial(
  filas: readonly Readonly<Record<string, unknown>>[],
): readonly GrupoDeDepreciacion[] {
  const grupos = new Map<
    string,
    { tramos: number[]; estados: string[]; valores: Record<string, string> }
  >();

  for (const fila of filas) {
    const material = texto(fila['material']);
    const estado = texto(fila['estadoConservacion']);
    const antiguedad = entero(fila['antiguedadHasta']) ?? 0;

    const grupo = grupos.get(material) ?? { tramos: [], estados: [], valores: {} };
    grupo.tramos.push(antiguedad);
    grupo.estados.push(estado);
    grupo.valores[claveDeCelda(String(antiguedad), estado)] = texto(fila['porcentaje']);
    grupos.set(material, grupo);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, grupo]) => ({
      material,
      tramos: [...new Set(grupo.tramos)].sort((a, b) => a - b),
      estados: distintosOrdenados(grupo.estados),
      valores: grupo.valores,
    }));
}

/* ── Lo que viaja, y lo que no ─────────────────────────────────────────── */

/**
 * Los parámetros de la petición: los de la URL que el contrato declara, **menos
 * el año y menos lo que esta hoja no manda**.
 *
 * Tres cosas se quitan, y cada una por su motivo:
 *
 * - `ejercicio` y `anio` de la URL, porque el año lo pone la sesión. Un enlace
 *   compartido con `?ejercicio=2019` mostraría el ejercicio de la cabecera y
 *   pediría otro cuadro;
 * - los **filtros bloqueados** de la opción (`composicion.ts`): `region` en
 *   valores unitarios y `uso` en depreciación no están en ninguna respuesta ni
 *   los recibe ningún controlador. Su desplegable ya se dibuja bloqueado, así
 *   que desde la pantalla no pueden entrar en la URL; esto cubre el otro camino,
 *   que es real —el montaje lee la URL directamente— y es el mismo que
 *   `consulta_fichas` cierra para `conciliadaConRentas`;
 * - los que **acotan en el navegador**: `materialMep` elige entre lo recibido y
 *   mandarlo fingiría que el servidor lo aplica.
 */
export function parametrosQueViajan(
  hoja: OperacionDeValuacion,
  busqueda: URLSearchParams,
): Readonly<Record<string, string>> {
  const parametros: Record<string, string> = { ...parametrosDeBusqueda(hoja, undefined, busqueda) };
  delete parametros[EJERCICIO];
  delete parametros['anio'];
  for (const clave of composicionDe(hoja).filtrosBloqueados ?? []) delete parametros[clave];
  for (const clave of ACOTAN_EN_EL_NAVEGADOR) delete parametros[clave];
  return parametros;
}

const esHoja = (opcion: string): opcion is OperacionDeValuacion =>
  (HOJAS as readonly string[]).includes(opcion);

/** Un entero del servidor, o nada. Sin `parseInt`: aquí no se lee texto. */
const entero = (valor: unknown): number | undefined =>
  typeof valor === 'number' && Number.isInteger(valor) ? valor : undefined;

/**
 * Los filtros de antes puestos a `undefined`, para que una búsqueda nueva
 * **quite** los que ya no están en vez de dejarlos pegados en la dirección.
 */
function vaciar(filtros: Readonly<Record<string, string>>): Record<string, undefined> {
  return Object.fromEntries(Object.keys(filtros).map((nombre) => [nombre, undefined]));
}
