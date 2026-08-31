import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Esqueleto } from '@sgtm/design-system';
import type { DatosDePantalla, ValorDeCampo } from '@sgtm/api-client';
import type { CampoDePantalla, EstructuraDePantalla, SeccionDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEjercicio } from '../../app/ejercicio';
import { accionesDeLaBarra, impedimentoDelActo } from '../actos';
import { conexionDe } from '../conexiones';
import { SIN_PERMISO, textoDeError } from '../estados';
import { conCambio } from '../busqueda';
import { avisoDe } from '../prosa';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { CabeceraDeRegistro } from '../bloques/CabeceraDeRegistro';
import { Formulario } from '../bloques/Formulario';
import { SIN_DATO } from '../seguridad/listado';

/**
 * **El acta de inspección predial, en cuatro pasos** (#506 F2).
 *
 * El manual la capturó como tres secciones planas con veintisiete campos, todos
 * a la vez y en la misma página. Quien la llena no está en una oficina: está de
 * pie en la puerta de un predio, con una tablet, y lo que hace tiene un orden
 * —quién atendió, qué se midió, qué se concluye, y qué va a pasar cuando cierre—
 * que la página plana no cuenta.
 *
 * Así que son cuatro pasos, y **los tres primeros son las tres secciones del
 * catálogo, tal cual**: ni un campo se mueve de sección, ni un rótulo se
 * reescribe (RNF-080). El cuarto no estrena ninguno; ver «El cierre», abajo.
 *
 *   1. Datos de la visita      la sección 1 del catálogo
 *   2. Verificación de campo   la sección 2, **contrastada**
 *   3. Hallazgos y evidencia   la sección 3
 *   4. Cierre                  lo que va a pasar, derivado de lo anterior
 *
 * <h2>El contraste del paso 2, y por qué son dos filas y no siete</h2>
 *
 * El prototipo dibuja una tabla de siete características con su valor declarado
 * al lado, y **da los siete**. El catálogo del manual sólo dibuja el lado
 * declarado de **dos** —`usoDeclarado` y `areaConstruidaDeclaradaM`, los dos
 * `"ro"`—, así que las otras cinco tendrían que salir de alguna parte, y no hay
 * ninguna: `MuestraResource` publica `areaDeclarada` y `areaCatastral` y nada
 * más, y del uso dice de sí mismo que no lo tiene («`DeteccionDeOmisos` no
 * resuelve el uso declarado — pasa `null` en los dos lados de la comparación»).
 *
 * Inventar ese lado es peor que inventar una cifra: **es inventar la prueba
 * contra la que se fiscaliza**. Un «Nº de pisos declarado: 1» que nadie declaró
 * sostiene una determinación por ampliación no declarada.
 *
 * Las que no tienen contra qué contrastarse se dibujan como lo que son —lo
 * verificado, sin columna de declarado—, debajo de la tabla y con su rótulo
 * intacto.
 *
 * <h2>El cierre no estrena campos</h2>
 *
 * El prototipo añade al paso 4 «Ejercicios a determinar» y «Multa tributaria»,
 * que no están en ninguna sección del catálogo. El mecanismo de #422 permite
 * añadir un control que el manual no dibuja, pero **sólo cuando el backend lo
 * exige**: `PeticionDeActaPredial` no pide ejercicios ni multa —toma
 * `programaId`, `contribuyenteId`, `predioId`, `fechaVisita`, `fiscalizador`,
 * `hallazgo`, `areaHallada` y `detalle`—, así que aquí serían dos cajas donde
 * teclear algo que no viaja, que es el defecto de #331. La prescripción y la
 * multa se deciden al liquidar, y eso es `fisc_resultados`.
 *
 * Lo que el paso 4 sí hace es **decir lo que va a pasar**, derivado de lo que
 * quien fiscaliza acaba de rellenar. Ninguna consecuencia lleva importe: los de
 * la determinación y la multa son D-02a (#198, #194) y salen «—».
 *
 * <h2>Modo campo</h2>
 *
 * Controles grandes para trabajar de pie. **Vive en la URL** (FRO-04 §5), no en
 * un `useState`: quien levanta actas todo el día lo deja puesto, y recargar no
 * puede perderlo. Es una clase en la superficie, no una segunda maqueta.
 *
 * <h2>La barra, y por qué su primaria cambia de rótulo</h2>
 *
 * El catálogo dibuja «Guardar borrador · Cerrar acta · Generar determinación», y
 * la regla de FRO-03 §5 —la última es la primaria— hacía de «Generar
 * determinación» el botón navy. Ése **no es el acto de esta pantalla**: es el de
 * `fisc_resultados` (`POST /fiscalizacion/transferencias`). El acto de aquí
 * registra el acta, y quien lo nombra es «Cerrar acta», que pasa al final con
 * {@link LA_QUE_ESCRIBE}.
 *
 * Sigue **apagada**, y con la misma franja de siempre: `fisc_predial` está en
 * `ACTOS_SIN_CAMPO` porque le faltan dos datos que su catálogo no puede dar —el
 * fiscalizador, dibujado `"ro"`, y el hallazgo, cuyas seis opciones no son
 * ninguna de las cuatro que `Hallazgo` distingue—. Lo que cambia es que ahora la
 * franja explica **el botón correcto**.
 */

/** La opción, y de ella el permiso. */
const OPCION = 'fisc_predial';

/** El paso abierto y el modo campo viven en la URL (FRO-04 §5). */
const PASO = 'paso';
const CAMPO = 'campo';

/** El cuarto paso no es una sección del catálogo: es lo que va a pasar. */
const CIERRE = 'Cierre';

/**
 * Las parejas declarado/verificado que **el propio catálogo dibuja**.
 *
 * No es una lista de características inventada: cada entrada empareja dos campos
 * que la sección 2 ya tiene, uno de ellos `"ro"`. Añadir una fila exige que el
 * catálogo traiga su lado declarado — que es justo lo que impide inventarlo.
 */
const PAREJAS: readonly {
  readonly verificado: string;
  readonly declarado: string;
  readonly diferencia?: string;
}[] = [
  { verificado: 'usoVerificado', declarado: 'usoDeclarado' },
  {
    verificado: 'areaConstruidaVerificadaM',
    declarado: 'areaConstruidaDeclaradaM',
    diferencia: 'diferenciaM',
  },
];

const clavesEmparejadas = new Set(
  PAREJAS.flatMap((p) => [p.verificado, p.declarado, ...(p.diferencia === undefined ? [] : [p.diferencia])]),
);

export function ActaDeInspeccion({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const [busqueda, fijarBusqueda] = useSearchParams();
  const { ejercicio } = useEjercicio();

  const aviso = avisoDe(OPCION);
  const secciones = useMemo(() => estructura.secciones ?? [], [estructura.secciones]);
  /* Los pasos son las secciones del catálogo **más** el cierre. Si el prototipo
     añadiera una cuarta sección, aquí habría cinco pasos sin tocar nada: la
     lista no está escrita a mano. */
  const pasos = useMemo(
    () => [...secciones.map((s) => s.label), CIERRE],
    [secciones],
  );

  const pedido = Number.parseInt(busqueda.get(PASO) ?? '1', 10);
  const paso = Number.isInteger(pedido) && pedido >= 1 && pedido <= pasos.length ? pedido : 1;
  const modoCampo = busqueda.get(CAMPO) === '1';

  /* La fila de la muestra de la que sale este acta: de ella vienen los cuatro
     campos `"ro"` de la cabecera y el área declarada contra la que se contrasta.
     Sin programa y sin predio en la URL no sale ninguna petición — no es una
     lectura vacía, es una lectura que no se hace (#481). */
  const conexion = conexionDe(OPCION);
  const parametros = conexion?.parametros({
    ruta: {},
    busqueda,
    ejercicio,
    borrador: {},
  });
  const hayFila = parametros !== undefined && parametros['id'] !== undefined;
  const fila = useQuery<DatosDePantalla>({
    queryKey: ['operacion', OPCION, parametros],
    queryFn: ({ signal }) => conexion!.cargar(parametros!, signal),
    enabled: hayFila && catalogo.puedeVer(OPCION),
  });

  if (!catalogo.puedeVer(OPCION)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (fila.error !== null && fila.error !== undefined) {
    const error = textoDeError(fila.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={() => void fila.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  const valores = fila.data?.campos ?? {};
  const barra = accionesDeLaBarra(OPCION, estructura.acciones ?? []);
  const impedimento = impedimentoDelActo(OPCION, barra.acciones);
  const irAlPaso = (n: number): void =>
    fijarBusqueda(conCambio(busqueda, { [PASO]: String(n) }), { replace: false });

  const seccionDelPaso = secciones[paso - 1];

  return (
    <div className="sgtm-acta" data-modo-campo={modoCampo ? '1' : '0'}>
      {/* **El aviso del módulo, y va primero.** Fiscalización trabaja sobre una
          copia y sólo escribe en el padrón por transferencia (ARQ-01 §3.5); si
          esto no se dice antes de que nadie teclee, quien levanta el acta se va
          creyendo que ya cambió algo que no ha cambiado. Lo dibuja el camino
          común para las 134, y una superficie propia se lo deja fuera sin que
          nada lo diga — lo cazó `fiscalizacion.test.tsx`, que ya existía. */}
      {aviso !== undefined && <Aviso titulo={aviso.titulo} detalle={aviso.detalle} />}

      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <CabeceraDeRegistro
        rotulo="Acta de inspección"
        identificador={texto(valores['nDeActa'])}
        cargando={fila.isLoading}
        datos={[
          { etiqueta: 'Programa', valor: texto(valores['programa']) },
          { etiqueta: 'Código predial', valor: texto(valores['codigoPredial']) },
          { etiqueta: 'Contribuyente', valor: texto(valores['contribuyente']) },
        ]}
        vacio={
          hayFila
            ? undefined
            : 'Esta acta todavía no cuelga de ninguna fila de la muestra: entra desde el programa para que traiga su predio y su contribuyente.'
        }
      />

      {/* Modo campo. Es cromo de la pantalla y no del acta, así que no va al
          papel (RNF-084). */}
      <div className="sgtm-acta__modo" data-no-imprimible="1">
        <Link
          to={`?${conCambio(busqueda, { [CAMPO]: modoCampo ? undefined : '1' }).toString()}`}
          className="sgtm-acta__conmutador"
          data-activo={modoCampo ? '1' : '0'}
          role="switch"
          aria-checked={modoCampo}
        >
          Modo campo
        </Link>
        <span className="sgtm-acta__modo-nota">
          Controles grandes para levantar el acta de pie, con la tablet en la mano.
        </span>
      </div>

      <RielDePasos pasos={pasos} paso={paso} busqueda={busqueda} />

      {fila.isLoading ? (
        <Esqueleto alto={280} />
      ) : paso === pasos.length ? (
        <Cierre valores={valores} />
      ) : seccionDelPaso === undefined ? null : (
        <PasoDelActa seccion={seccionDelPaso} valores={valores} />
      )}

      <div className="sgtm-acta__avance" data-no-imprimible="1">
        <Boton
          variante="secundario"
          onClick={() => irAlPaso(paso - 1)}
          {...(paso === 1 ? { deshabilitado: true } : {})}
        >
          Atrás
        </Boton>
        {paso < pasos.length && <Boton onClick={() => irAlPaso(paso + 1)}>Siguiente</Boton>}
      </div>

      {/* La barra se le pide a `accionesDeLaBarra`, no se pasa la lista cruda
          del catalogo (FRO-05 §3.1): si no, ni `LA_QUE_ESCRIBE` ni el vocabulario
          uniforme se aplicarian aqui — que es lo que le paso a «Vías y calles»—.
          Y **el impedimento va con ella**: sin el, la primaria se queda apagada
          y muda, que en ventanilla se lee como un error de quien atiende. */}
      <BarraDeAcciones
        acciones={barra.acciones}
        {...(impedimento === undefined ? {} : { impedimento })}
        {...(barra.conPrimaria ? {} : { sinPrimaria: true })}
      />
    </div>
  );
}

/* ── El riel de los cuatro pasos ───────────────────────────────────────── */

/**
 * La barra de progreso y los cuatro rótulos.
 *
 * **Son enlaces**, por lo mismo que las pestañas de una superficie (FRO-05 §1):
 * el enlace de lo que se está rellenando se puede compartir y recargar no lo
 * pierde. Aquí no hay guarda de permiso que hacer —los cuatro pasos son la misma
 * opción y el mismo permiso—, que es la diferencia con aquéllas.
 */
function RielDePasos({
  pasos,
  paso,
  busqueda,
}: {
  readonly pasos: readonly string[];
  readonly paso: number;
  readonly busqueda: URLSearchParams;
}) {
  return (
    <nav className="sgtm-acta__riel" aria-label="Pasos del acta" data-no-imprimible="1">
      <p className="sgtm-acta__conteo">
        Paso {paso} de {pasos.length}
      </p>
      <ol className="sgtm-acta__pasos">
        {pasos.map((titulo, i) => {
          const n = i + 1;
          return (
            <li key={titulo}>
              <Link
                to={`?${conCambio(busqueda, { [PASO]: String(n) }).toString()}`}
                className="sgtm-acta__paso"
                data-estado={n === paso ? 'actual' : n < paso ? 'hecho' : 'pendiente'}
                {...(n === paso ? { 'aria-current': 'step' as const } : {})}
              >
                <span className="sgtm-acta__paso-n">{n}</span>
                <span className="sgtm-acta__paso-titulo">{titulo}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Un paso: su sección del catálogo, con el contraste si lo tiene ────── */

function PasoDelActa({
  seccion,
  valores,
}: {
  readonly seccion: SeccionDePantalla;
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
}) {
  const porClave = new Map(seccion.campos.map((c) => [c.clave, c]));
  const parejas = PAREJAS.filter(
    (p) => porClave.has(p.verificado) && porClave.has(p.declarado),
  );
  // Lo que no se empareja sigue siendo la sección, tal cual y con su rótulo.
  const sueltos = seccion.campos.filter((c) => !clavesEmparejadas.has(c.clave));
  const resto: SeccionDePantalla = { ...seccion, campos: sueltos };

  return (
    <>
      {parejas.length > 0 && (
        <TablaDeContraste parejas={parejas} porClave={porClave} valores={valores} />
      )}
      {sueltos.length > 0 && (
        <Formulario
          opcion={OPCION}
          secciones={[resto]}
          valores={valores}
          cerradas={{}}
          onAlternar={() => undefined}
          pestana={0}
          escribibles={new Set()}
          onCampo={() => undefined}
          cargando={false}
        />
      )}
    </>
  );
}

/**
 * Lo declarado contra lo verificado, característica a característica.
 *
 * **Sólo las parejas que el catálogo dibuja.** Ver el docblock de arriba: el
 * lado declarado que no está no se inventa, porque es la prueba contra la que se
 * fiscaliza.
 */
function TablaDeContraste({
  parejas,
  porClave,
  valores,
}: {
  readonly parejas: readonly (typeof PAREJAS)[number][];
  readonly porClave: ReadonlyMap<string, CampoDePantalla>;
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
}) {
  return (
    <section className="sgtm-tarjeta sgtm-contraste">
      <h2 className="sgtm-tarjeta__titulo">Lo declarado y lo verificado</h2>
      <div className="sgtm-tabla-envoltura">
        <table className="sgtm-tabla">
          <thead>
            <tr>
              <th scope="col">Característica</th>
              <th scope="col">Declarado</th>
              <th scope="col">Verificado</th>
              <th scope="col">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {parejas.map((pareja) => {
              const verificado = porClave.get(pareja.verificado);
              const declarado = porClave.get(pareja.declarado);
              if (verificado === undefined || declarado === undefined) return null;
              return (
                <tr key={pareja.verificado}>
                  {/* El rótulo del catálogo **menos la palabra «declarado»**, que
                      es lo que dice ya la cabecera de su columna. Se le quita la
                      palabra y nada más: «Área construida declarada (m²)» tiene
                      que seguir diciendo «(m²)», o la fila compara superficies
                      sin decir en qué unidad (RNF-080). */}
                  <th scope="row">{declarado.label.replace(/\s+declarad[oa]/i, '')}</th>
                  <td>{texto(valores[pareja.declarado])}</td>
                  <td>
                    <Campo
                      etiqueta={verificado.label}
                      tipo={verificado.t}
                      {...(verificado.opts === undefined ? {} : { opciones: verificado.opts })}
                      valor={
                        typeof valores[pareja.verificado] === 'string'
                          ? (valores[pareja.verificado] as string)
                          : ''
                      }
                      onCambio={() => undefined}
                      bloqueado
                    />
                  </td>
                  <td>
                    {pareja.diferencia === undefined ? SIN_DATO : texto(valores[pareja.diferencia])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="sgtm-contraste__nota">
        Se contrasta lo que el catálogo del manual empareja. Del resto de las características sólo
        hay el valor verificado: nadie publica lo que se declaró, y ponerlo aquí sería inventar la
        prueba contra la que se fiscaliza.
      </p>
    </section>
  );
}

/* ── El cierre ─────────────────────────────────────────────────────────── */

/**
 * Lo que va a pasar al cerrar el acta, **derivado de lo que se acaba de
 * rellenar** y no escrito a mano.
 *
 * Ninguna consecuencia lleva importe. Los de la determinación y la multa
 * tributaria son D-02a (#198, #194): salen «—», nunca una cifra plausible.
 */
function Cierre({ valores }: { readonly valores: Readonly<Record<string, ValorDeCampo>> }) {
  const bruto = valores['hallazgoPrincipal'];
  const hallazgo = typeof bruto === 'string' ? bruto : '';
  /* La casilla llega como booleano del catalogo, y de la API puede llegar como
     la cadena «true». Las dos cuentan; cualquier otra cosa, no. */
  const marca = valores['generaDeterminacion'];
  const determina = marca === true || marca === 'true';
  const conforme = hallazgo === '' || hallazgo === 'SIN OBSERVACIONES';

  const consecuencias: readonly { readonly titulo: string; readonly detalle: string }[] = [
    {
      titulo: 'Se cierra el acta',
      detalle:
        'Deja de ser editable. Para corregirla habría que anularla y levantar otra: un acta cerrada es la prueba de lo que se vio ese día.',
    },
    ...(conforme
      ? [
          {
            titulo: 'El acta se cierra como conforme',
            detalle:
              'Sin hallazgo no hay diferencia que sostener: no se genera determinación ni multa, y el predio sale de la muestra.',
          },
        ]
      : determina
        ? [
            {
              titulo: 'Se deriva a resolución de determinación',
              detalle: `Hallazgo: ${hallazgo.toLowerCase()}. La diferencia de tributo la determina el servidor al liquidar, y esa cifra todavía no se puede calcular (D-02a): aquí sale «—».`,
            },
          ]
        : [
            {
              titulo: 'No se genera determinación',
              detalle:
                'Hay hallazgo, pero «Genera determinación» está sin marcar: la deuda omitida no entra en la cuenta corriente.',
            },
          ]),
    {
      titulo: 'El padrón no cambia todavía',
      detalle:
        'Fiscalización trabaja sobre una copia y sólo escribe en el padrón por transferencia (ARQ-01 §3.5), que es un acto de «Resultados y determinaciones» y no de esta acta.',
    },
  ];

  return (
    <section className="sgtm-tarjeta sgtm-cierre">
      <h2 className="sgtm-tarjeta__titulo">Lo que pasa al cerrar</h2>
      <ul className="sgtm-cierre__lista">
        {consecuencias.map((c) => (
          <li key={c.titulo}>
            <p className="sgtm-cierre__titulo">{c.titulo}</p>
            <p className="sgtm-cierre__detalle">{c.detalle}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lo que no viene, «—». Nunca un cero, que afirma otra cosa (RNF-083). */
const texto = (valor: ValorDeCampo | undefined): string =>
  valor === undefined || valor === '' || typeof valor === 'boolean' ? SIN_DATO : valor;
