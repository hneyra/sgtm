import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { ResolutorProps } from '../composicion';
import { useValorAposentado } from '../aposentar';
import { SIN_DATO, esObjeto, leerPaginado } from '../seguridad/listado';

/**
 * **El valor de la transferencia, y donde escribirlo** (#73).
 *
 * `TransferenciaPredioController` y `TransferenciaVehiculoController` exigen
 * `valorTransferencia` —lo pasan por `dineroDe`, que llama a `exigir`— y
 * `Transferencia` lo declara obligatorio, pero **ninguna de las dos pantallas
 * del manual dibuja un campo para él**: el prototipo lo dibuja en «Impuesto de
 * alcabala», que es justo la pantalla que el backend **no** lee para esto
 * —`RegistrarAlcabala` toma la base de `transferencia.valorTransferencia()`, ya
 * calculada—.
 *
 * La salida no es inventar un campo nuevo en el catálogo —`rentas-registro.generado.ts`
 * no se edita a mano— ni reescribir el rótulo de uno existente (RNF-080): es
 * **añadir** el campo dentro de un control que ya sustituye a uno, sin tocar lo
 * que ese control seguía significando. En «Transferencia de predio» viaja junto
 * a la búsqueda del predio, porque los dos son el mismo gesto —fijar el objeto
 * del acto y su valor—; en «Transferencia de vehículo» no hay ningún
 * identificador que resolver —`placa` viaja tal cual, y el transferente lo
 * resuelve el backend del titular vigente— así que se cuelga de «Transferente —
 * documento», que hoy no llega a ningún sitio: ninguna de las dos peticiones
 * acepta `codTransferente` para un vehículo (`TransferenciaVehiculoController`
 * lo lee del dueño actual). El control sigue dibujando ese campo tal cual lo
 * dibujaba antes de declararse aquí —sin marcarlo escribible, porque no lo es—,
 * y debajo, con su propia etiqueta, va el campo nuevo.
 *
 * Las dos exportan de aquí porque comparten la mitad —el campo de valor— y solo
 * una necesita la otra mitad —la búsqueda del predio—.
 */

/** Con menos de esto no se pregunta: seis dígitos son el ubigeo de un código catastral. */
const MINIMO = 6;

/** Cuántos candidatos se enseñan. Un prefijo corto trae el catastro entero. */
const MAXIMO = 8;

interface CandidatoDePredio {
  readonly id: string;
  readonly codigo: string;
  readonly titular: string;
  readonly direccion: string;
}

/** El identificador interno como texto, o vacío si el recurso no lo trajo. */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

const cadena = (valor: unknown, porOmision: string): string =>
  typeof valor === 'string' && valor !== '' ? valor : porOmision;

/** El servidor contestó que no hay (404), que no es un fallo de la consulta. */
const esNoEncontrado = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 404;

const esSinPermiso = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

/** Las fichas cuyo código empieza así (`consulta_fichas`). Publica `predioId`. */
async function porCodigo(digitos: string, senal: AbortSignal): Promise<CandidatoDePredio[]> {
  const cuerpo = await pedirOperacion('consulta_fichas', { codRefCatastral: digitos }, senal);
  const pagina = leerPaginado(cuerpo, 'las fichas');
  return pagina.contenido
    .filter(esObjeto)
    .flatMap((fila) => {
      const id = identificador(fila['predioId']);
      if (id === '') return [];
      return [
        {
          id,
          codigo: cadena(fila['codRefCatastral'], SIN_DATO),
          titular: cadena(fila['titular'], SIN_DATO),
          direccion: cadena(fila['direccion'], ''),
        },
      ];
    })
    .slice(0, MAXIMO);
}

/**
 * El campo de valor, compartido por los dos resolutores.
 *
 * Su propia etiqueta —no la del campo al que sustituye—: es un dato nuevo, y
 * decir de qué se trata es lo que separa esto de rebautizar un campo del
 * manual.
 */
function CampoDeValor({
  valor,
  bloqueado,
  onCambio,
}: {
  readonly valor: string;
  readonly bloqueado: boolean;
  readonly onCambio: (valor: string) => void;
}) {
  return (
    <Campo
      etiqueta="Valor de transferencia (S/)"
      tipo="text"
      valor={valor}
      bloqueado={bloqueado}
      ph="95000.00"
      ayuda="Es la base sobre la que se liquida la alcabala (art. 24 de la LTM): el que figura en la minuta, el acta o el parte registral."
      onCambio={onCambio}
    />
  );
}

/**
 * «Transferencia de vehículo»: solo el valor, sin ningún identificador que
 * resolver —`placa` viaja tal cual, y `TransferenciaVehiculoController` no
 * acepta `codTransferente`—.
 *
 * El campo al que sustituye —«Transferente — documento»— se sigue dibujando
 * como lo dibujaba antes de declararse: no escribible, porque no lo era.
 */
export function ResolutorDeValorDeTransferencia({
  etiqueta,
  resuelto,
  onCampo,
  bloqueado,
}: ResolutorProps) {
  return (
    <div className="sgtm-resolutor">
      <Campo
        etiqueta={etiqueta}
        tipo="text"
        valor=""
        bloqueado
        ayuda="Este dato no viaja: el transferente de un vehículo lo resuelve el sistema por quien figura hoy como su titular."
      />
      <CampoDeValor
        valor={resuelto['valorTransferencia'] ?? ''}
        bloqueado={bloqueado}
        onCambio={(valor) => onCampo('valorTransferencia', valor)}
      />
    </div>
  );
}

/**
 * «Transferencia de predio»: el predio se busca por su código catastral —lo
 * mismo que ya resuelve `ResolutorDeUnidad` para `alta_deuda` (#331), sin la
 * otra mitad («por placa»), que aquí no tiene sentido— y, junto a él, su valor.
 *
 * Solo una forma de búsqueda, así que no hay nada que recordar más allá del
 * identificador: a diferencia de `alta_deuda`, esta pantalla no se pliega ni
 * se vuelve a abrir sobre el mismo formulario, y el rótulo se puede volver a
 * pedir mientras la búsqueda está en pantalla.
 */
export function ResolutorDePredioDeTransferencia({
  etiqueta,
  resuelto,
  onCampo,
  bloqueado,
}: ResolutorProps) {
  const [escrito, fijarEscrito] = useState('');
  const predioId = (resuelto['predioId'] ?? '').trim();
  const buscado = useValorAposentado(escrito.replace(/[^0-9]/g, ''));
  const preguntable = !bloqueado && predioId === '' && buscado.length >= MINIMO;

  const consulta = useQuery({
    queryKey: ['resolutor-de-predio-de-transferencia', buscado],
    enabled: preguntable,
    retry: 1,
    queryFn: ({ signal }) => porCodigo(buscado, signal),
  });

  if (predioId !== '') {
    return (
      <div className="sgtm-resolutor sgtm-resolutor--resuelto">
        <p className="sgtm-resolutor__eyebrow">{etiqueta}</p>
        <p className="sgtm-resolutor__codigo">#{predioId}</p>
        <Boton
          menudo
          aria-label="Cambiar el predio resuelto"
          onClick={() => {
            onCampo('predioId', '');
            fijarEscrito('');
          }}
        >
          Cambiar
        </Boton>
        <CampoDeValor
          valor={resuelto['valorTransferencia'] ?? ''}
          bloqueado={bloqueado}
          onCambio={(valor) => onCampo('valorTransferencia', valor)}
        />
      </div>
    );
  }

  const candidatos = consulta.data ?? [];

  return (
    <div className="sgtm-resolutor">
      <Campo
        etiqueta={etiqueta}
        tipo="text"
        valor={escrito}
        bloqueado={bloqueado}
        ph="20 01 06 01 001 …"
        ayuda="Escribe el código y elige el predio en la lista: lo que se guarda es el registro encontrado, no el texto."
        onCambio={fijarEscrito}
      />
      <p className="sgtm-resolutor__nota" role="status">
        {anuncioDePredio(consulta, preguntable, escrito, bloqueado)}
      </p>
      {consulta.error !== null && <ErrorDeLaBusquedaDePredio error={consulta.error} />}
      {candidatos.length > 0 && (
        <ul className="sgtm-asistente__resultados">
          {candidatos.map((candidato) => (
            <li key={candidato.id}>
              <button type="button" onClick={() => onCampo('predioId', candidato.id)}>
                <span>
                  {candidato.titular}
                  {candidato.direccion === '' ? '' : ` · ${candidato.direccion}`}
                </span>
                <span className="sgtm-asistente__codigo">{candidato.codigo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <CampoDeValor
        valor={resuelto['valorTransferencia'] ?? ''}
        bloqueado={bloqueado}
        onCambio={(valor) => onCampo('valorTransferencia', valor)}
      />
    </div>
  );
}

function anuncioDePredio(
  consulta: { readonly isFetching: boolean; readonly error: unknown; readonly data?: unknown },
  preguntable: boolean,
  escrito: string,
  bloqueado: boolean,
): string {
  if (consulta.isFetching) return 'Buscando el predio…';
  if (!preguntable) {
    return !bloqueado && escrito.trim() !== ''
      ? `Todavía no se ha buscado: hacen falta al menos ${MINIMO} caracteres.`
      : '';
  }
  // El error tiene su propio bloque: no se repite aquí.
  if (consulta.error !== null) return '';
  const candidatos = Array.isArray(consulta.data) ? consulta.data.length : 0;
  if (candidatos === 0) {
    return 'Ningún predio responde a eso. Revisa el código catastral.';
  }
  return candidatos === 1 ? '1 predio encontrado.' : `${candidatos} predios encontrados.`;
}

function ErrorDeLaBusquedaDePredio({ error }: { readonly error: unknown }) {
  if (esNoEncontrado(error)) {
    return (
      <p className="sgtm-resolutor__nota" role="status">
        No hay ninguna unidad con ese código en el catastro.
      </p>
    );
  }
  if (esSinPermiso(error)) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="No tienes permiso para consultar ese predio"
        detalle="Resolver el predio se hace contra el catastro, y tu perfil no tiene esa consulta. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="No se pudo buscar el predio"
      detalle="La consulta no respondió, así que el sistema no sabe si ese predio existe. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no esté en el catastro."
    />
  );
}
