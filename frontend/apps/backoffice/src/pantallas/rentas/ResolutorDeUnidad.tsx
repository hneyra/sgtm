import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { ResolutorProps } from '../composicion';
import { useValorAposentado } from '../aposentar';
import { SIN_DATO, esObjeto, leerObjeto, leerPaginado } from '../seguridad/listado';

/**
 * **De un código catastral o una placa al identificador que el backend pide** (#331).
 *
 * El hueco que cierra, dicho con nombres: `alta_deuda` dibuja «Unidad (predio /
 * placa)» y quien atiende escribe ahí lo que tiene —un código de referencia
 * catastral, una placa—. `PeticionDeMovimiento` no acepta ninguna de las dos
 * cosas: acepta `predioId` y `vehiculoId`, que son los identificadores internos
 * que `ClaveDeSaldo` compara con igualdad exacta. Hasta hoy el campo se tecleaba
 * y **no viajaba**, así que el alta quedaba a nivel de contribuyente: sin unidad,
 * y por tanto sobre otra obligación distinta de la que se quería dar de alta.
 *
 * **Ninguna consulta inventada.** Se resuelve con las dos operaciones de lectura
 * que el backend ya publica, y las dos publican el identificador:
 *
 *   `consulta_fichas`  `GET /catastro/fichas?codRefCatastral=` — `FichaEncontradaResource`
 *                      trae `predioId`, el código, la dirección y el titular
 *   `vehiculos`        `GET /rentas/vehiculos/{placa}` — `VehiculoResource` trae `id`
 *
 * Es lo que separa este issue de los otros cuatro consumidores que el hueco
 * bloquea: aquí el identificador **está publicado**. Ver `rentas/index.ts` para
 * los que no lo están, que se anotan y no se fingen (ADR-0010).
 *
 * Tres cosas que hace y que se ven poco:
 *
 * - **No pregunta por tecla.** Un código catastral son 21 dígitos, y con la
 *   consulta en la clave del `useQuery` eso eran 21 consultas contra el padrón.
 *   Se espera a que la mano pare (`useValorAposentado`, 300 ms), igual que el
 *   asistente de catastro.
 * - **Un fallo de red no es «no existe».** Son dos frases distintas y se dicen
 *   distintas: `no encontrado` es una respuesta del servidor sobre el padrón, y
 *   cualquier otro error es que no se pudo preguntar. Callar ante el segundo lo
 *   convierte en el primero, que es exactamente lo que autoriza a dar de alta la
 *   deuda de una unidad que sí existe como si no existiera.
 * - **Lo tecleado no viaja.** El código y la placa son texto de presentación y
 *   viven en este control, como el borrador de `Filtros`. Lo único que sale de
 *   aquí es el identificador, y pasa por la lista blanca de `escrituras.ts`.
 */

/** Las dos formas de nombrar una unidad, con el rótulo del manual. */
const POR_CODIGO = 'CÓDIGO CATASTRAL';
const POR_PLACA = 'PLACA';
const FORMAS = [POR_CODIGO, POR_PLACA] as const;

/** Qué campo del cuerpo llena cada forma. Los dos, declarados en `escrituras.ts`. */
const CAMPO_DE_LA_FORMA: Readonly<Record<string, string>> = {
  [POR_CODIGO]: 'predioId',
  [POR_PLACA]: 'vehiculoId',
};

/**
 * Con menos de esto no se pregunta.
 *
 * Seis dígitos es el ubigeo de un código catastral —por debajo, la consulta por
 * prefijo devuelve medio padrón—; seis caracteres es una placa peruana entera.
 * No es el mismo número por casualidad, pero tampoco hay motivo para dos.
 */
const MINIMO = 6;

interface Candidato {
  /** El identificador interno, tal como lo publica el recurso. */
  readonly id: string;
  /** Cómo se llama la unidad para quien la busca: el código o la placa. */
  readonly codigo: string;
  /** De quién es, o qué es. */
  readonly titulo: string;
  /** Dónde está, cuando el recurso lo publica. */
  readonly detalle: string;
}

export function ResolutorDeUnidad({ etiqueta, resuelto, onCampo, bloqueado }: ResolutorProps) {
  const [forma, fijarForma] = useState<string>(POR_CODIGO);
  const [escrito, fijarEscrito] = useState('');
  /* Cómo se llamaba lo que se eligió, para poder decirlo en la tarjeta. Es
     presentación: la verdad de si hay algo resuelto está en `resuelto`, que sale
     del borrador de la escritura —si el envío lo vacía, la tarjeta desaparece
     sola—. Sin esto la tarjeta enseñaría un número interno, que no dice nada. */
  const [elegido, fijarElegido] = useState<Candidato | null>(null);

  const campo = CAMPO_DE_LA_FORMA[forma] ?? '';
  // Cuál de los dos identificadores tiene valor, si alguno. A lo sumo uno: una
  // obligación cuelga de un predio, de un vehículo o de ninguno.
  const fijado = Object.entries(resuelto).find(([, valor]) => valor.trim() !== '');

  const busqueda = useBusquedaDeUnidad(forma, escrito, !bloqueado && fijado === undefined);

  if (fijado !== undefined) {
    const [nombre, valor] = fijado;
    const mismo = elegido !== null && elegido.id === valor;
    return (
      <div className="sgtm-resolutor sgtm-resolutor--resuelto">
        <p className="sgtm-resolutor__eyebrow">{etiqueta}</p>
        <p className="sgtm-resolutor__codigo">{mismo ? elegido.codigo : `#${valor}`}</p>
        <p className="sgtm-resolutor__detalle">
          {mismo ? [elegido.titulo, elegido.detalle].filter((t) => t !== '').join(' · ') : SIN_DATO}
        </p>
        <Boton
          menudo
          onClick={() => {
            // Se vacía el campo, no se cambia por otro: cambiar de unidad es
            // dejar de señalar a la que había mientras se busca la siguiente.
            onCampo(nombre, '');
            fijarElegido(null);
            fijarEscrito('');
          }}
        >
          Cambiar
        </Boton>
      </div>
    );
  }

  return (
    <div className="sgtm-resolutor">
      <Campo
        etiqueta={`${etiqueta} — buscar por`}
        tipo="sel"
        opciones={[...FORMAS]}
        valor={forma}
        bloqueado={bloqueado}
        onCambio={(valor) => {
          fijarForma(valor);
          fijarEscrito('');
        }}
      />
      <Campo
        etiqueta={etiqueta}
        tipo="text"
        valor={escrito}
        bloqueado={bloqueado}
        ph={forma === POR_CODIGO ? '20 01 06 01 001 …' : 'ABC-123'}
        ayuda={
          bloqueado
            ? 'Esta pantalla todavía no puede mandar la unidad: hasta entonces el alta queda a nivel de contribuyente.'
            : 'Escribe lo que tengas y elige la unidad en la lista: lo que se guarda es el registro, no el texto.'
        }
        onCambio={fijarEscrito}
      />

      {busqueda.buscando && <p className="sgtm-resolutor__nota">Buscando la unidad…</p>}

      {/* Que no se haya preguntado no es que no exista. Se dice, por lo mismo que
          lo dice el asistente de catastro antes de comprobar un duplicado. */}
      {!busqueda.preguntable && !bloqueado && escrito.trim() !== '' && (
        <p className="sgtm-resolutor__nota">
          Todavía no se ha buscado: hacen falta al menos {MINIMO} caracteres.
        </p>
      )}

      {busqueda.error !== undefined && <ErrorDeLaBusqueda error={busqueda.error} forma={forma} />}

      {busqueda.preguntable &&
        !busqueda.buscando &&
        busqueda.error === undefined &&
        busqueda.candidatos.length === 0 && (
          <p className="sgtm-resolutor__nota">
            Ninguna unidad responde a eso. Revisa lo escrito, o deja el alta a nivel de
            contribuyente.
          </p>
        )}

      {busqueda.candidatos.length > 0 && (
        <ul className="sgtm-asistente__resultados">
          {busqueda.candidatos.map((candidato) => (
            <li key={candidato.id}>
              <button
                type="button"
                onClick={() => {
                  fijarElegido(candidato);
                  onCampo(campo, candidato.id);
                }}
              >
                <span>
                  {candidato.titulo}
                  {candidato.detalle === '' ? '' : ` · ${candidato.detalle}`}
                </span>
                <span className="sgtm-asistente__codigo">{candidato.codigo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * No se pudo preguntar, o el padrón contestó que no hay.
 *
 * **Las dos cosas no se dicen igual.** «No existe» es una afirmación sobre el
 * padrón y solo la puede hacer el servidor contestando; un 500, un 403 o la red
 * caída no dicen nada sobre la unidad, y presentarlos como «no existe» lleva a
 * dar de alta sin unidad una deuda que sí tiene la suya.
 */
function ErrorDeLaBusqueda({ error, forma }: { readonly error: unknown; readonly forma: string }) {
  if (esNoEncontrado(error)) {
    return (
      <p className="sgtm-resolutor__nota">
        {forma === POR_PLACA
          ? 'No hay ningún vehículo con esa placa en el padrón.'
          : 'No hay ninguna unidad con ese código en el catastro.'}
      </p>
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="No se pudo buscar la unidad"
      detalle="La consulta no respondió, así que el sistema no sabe si esa unidad existe. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no esté en el padrón."
    />
  );
}

/**
 * El servidor contestó que no hay (404), que **no** es un fallo de la consulta.
 *
 * Se exporta para poder probarlo sin montar nada: es la distinción entera de la
 * que depende que un fallo de red no se lea como «no existe».
 */
export const esNoEncontrado = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 404;

interface BusquedaDeUnidad {
  /** Ya hay texto suficiente para preguntar. Si no, no es que no haya: es que no se preguntó. */
  readonly preguntable: boolean;
  readonly buscando: boolean;
  readonly candidatos: readonly Candidato[];
  readonly error?: unknown;
}

/**
 * La búsqueda, por la operación de lectura que corresponde a la forma elegida.
 *
 * Un solo `useQuery` y no dos: la forma entra en la clave, así que cambiar de
 * código a placa es otra consulta y no hay ningún hook que se llame a veces.
 */
function useBusquedaDeUnidad(forma: string, escrito: string, activa: boolean): BusquedaDeUnidad {
  const buscado = useValorAposentado(normalizar(forma, escrito));
  const preguntable = activa && buscado.length >= MINIMO;

  const consulta = useQuery({
    queryKey: ['resolutor-de-unidad', forma, buscado],
    enabled: preguntable,
    queryFn: ({ signal }) =>
      forma === POR_PLACA ? porPlaca(buscado, signal) : porCodigo(buscado, signal),
  });

  if (!preguntable) return { preguntable: false, buscando: false, candidatos: [] };
  return {
    preguntable: true,
    buscando: consulta.isFetching,
    candidatos: consulta.data ?? [],
    ...(consulta.error === null ? {} : { error: consulta.error }),
  };
}

/**
 * Lo que se manda, a partir de lo que se escribió.
 *
 * Un código catastral se busca **por sus dígitos**: el prototipo lo escribe
 * troquelado y el backend resuelve el prefijo por rango, no por el texto con
 * guiones (`modelo-logico-fisico.md` §0). Una placa se busca en mayúsculas y sin
 * espacios, que es como `Placa.de` la normaliza en el dominio.
 */
function normalizar(forma: string, escrito: string): string {
  const limpio = escrito.trim();
  if (forma === POR_PLACA) return limpio.toUpperCase().replace(/\s+/g, '');
  return limpio.replace(/[^0-9]/g, '');
}

/** Las fichas cuyo código empieza así (`consulta_fichas`). Publica `predioId`. */
async function porCodigo(digitos: string, senal: AbortSignal): Promise<readonly Candidato[]> {
  const cuerpo = await pedirOperacion('consulta_fichas', { codRefCatastral: digitos }, senal);
  return leerPaginado(cuerpo, 'las fichas')
    .contenido.filter(esObjeto)
    .flatMap((fila) => {
      const id = identificador(fila['predioId']);
      if (id === '') return [];
      return [
        {
          id,
          codigo: cadena(fila['codRefCatastral'], SIN_DATO),
          titulo: cadena(fila['titular'], SIN_DATO),
          detalle: cadena(fila['direccion'], ''),
        },
      ];
    })
    .slice(0, MAXIMO);
}

/** El vehículo de esa placa (`vehiculos`). Publica su `id`. */
async function porPlaca(placa: string, senal: AbortSignal): Promise<readonly Candidato[]> {
  const vehiculo = leerObjeto(await pedirOperacion('vehiculos', { placa }, senal), 'el vehiculo');
  const id = identificador(vehiculo['id']);
  if (id === '') return [];
  return [
    {
      id,
      codigo: cadena(vehiculo['placa'], placa),
      titulo: [cadena(vehiculo['marca'], ''), cadena(vehiculo['modelo'], '')]
        .filter((parte) => parte !== '')
        .join(' '),
      detalle: cadena(vehiculo['categoria'], ''),
    },
  ];
}

/**
 * Cuántos candidatos se enseñan.
 *
 * Un prefijo corto trae el edificio entero, y una lista de cien no es una lista:
 * es la invitación a elegir el primero. Quien no encuentre el suyo escribe más
 * dígitos, que es lo que la búsqueda por prefijo pide.
 */
const MAXIMO = 8;

const cadena = (valor: unknown, porOmision: string): string =>
  typeof valor === 'string' && valor !== '' ? valor : porOmision;

/** El identificador interno como texto, o vacío si el recurso no lo trajo. */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';
