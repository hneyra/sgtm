import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { ResolutorProps } from '../composicion';
import { useValorAposentado } from '../aposentar';
import { SIN_DATO, esObjeto, leerPaginado } from '../seguridad/listado';

/**
 * **El solicitante del certificado, resuelto contra el padrón** (#427, #422).
 *
 * El hueco que cierra es de los que no se ven: `certificados` dibuja un campo de
 * texto libre rotulado «Solicitante», y el prototipo teclea ahí un **nombre**
 * —«VALDEZ RIOS, OLIVER FABIÁN»—. `PeticionDeCertificado.solicitante` es, en
 * cambio, el **código** del contribuyente: el controlador lo pasa como
 * `EmitirCertificado.Solicitud.codigoContribuyente` y `EmitirCertificado` lo
 * resuelve con `contribuyentes.porCodigo(...)`.
 *
 * La misma clave significa dos cosas distintas en la lectura y en la escritura
 * —`CertificadoResource.solicitante` **sí** es el nombre, y es lo que la grilla
 * ya pinta en su cuarta columna—, así que declararlo tal cual en `escrituras.ts`
 * compila, pasa la lista blanca y pasa el lint, y lo que llega a ventanilla es
 * un **404 sobre una persona que sí está en el padrón**, llamando «código» a lo
 * que la pantalla de al lado rotula «Solicitante». El síntoma miente dos veces.
 *
 * Es la segunda de las tres formas del hueco de `ACTOS_SIN_CAMPO` —un
 * identificador que hay que resolver contra una lista— y, a diferencia de
 * `fisc_predial`, **la lista existe**: `GET /rentas/contribuyentes` publica
 * `codigo` y filtra por `nombreRazonSocial`. Así que se resuelve, con el mismo
 * gesto de `ResolutorDeUnidad` (#331) y `ResolutorDeTransferencia` (#73): lo
 * tecleado es texto de presentación y **no viaja**; lo que viaja es el registro
 * elegido.
 */

/** Con menos de esto no se pregunta: un prefijo de dos letras trae el padrón entero. */
const MINIMO = 3;

/** Cuántos candidatos se enseñan. */
const MAXIMO = 8;

interface CandidatoDeContribuyente {
  readonly codigo: string;
  readonly nombre: string;
  readonly documento: string;
}

const cadena = (valor: unknown, porOmision: string): string =>
  typeof valor === 'string' && valor !== '' ? valor : porOmision;

const esNoEncontrado = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 404;

const esSinPermiso = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

/** Los contribuyentes cuyo nombre o razón social responde a eso. */
async function porNombre(escrito: string, senal: AbortSignal): Promise<CandidatoDeContribuyente[]> {
  const cuerpo = await pedirOperacion('contribuyentes', { nombreRazonSocial: escrito }, senal);
  const pagina = leerPaginado(cuerpo, 'el padrón de contribuyentes');
  return pagina.contenido
    .filter(esObjeto)
    .flatMap((fila) => {
      const codigo = cadena(fila['codigo'], '');
      if (codigo === '') return [];
      return [
        {
          codigo,
          nombre: cadena(fila['nombreRazonSocial'], SIN_DATO),
          documento: cadena(fila['numeroDocumento'], ''),
        },
      ];
    })
    .slice(0, MAXIMO);
}

export function ResolutorDelSolicitante({
  etiqueta,
  resuelto,
  onCampo,
  bloqueado,
}: ResolutorProps) {
  const [escrito, fijarEscrito] = useState('');
  const codigo = (resuelto['solicitante'] ?? '').trim();
  const buscado = useValorAposentado(escrito.trim());
  const preguntable = !bloqueado && codigo === '' && buscado.length >= MINIMO;

  const consulta = useQuery({
    queryKey: ['resolutor-del-solicitante', buscado],
    enabled: preguntable,
    retry: 1,
    queryFn: ({ signal }) => porNombre(buscado, signal),
  });

  if (codigo !== '') {
    return (
      <div className="sgtm-resolutor sgtm-resolutor--resuelto">
        <p className="sgtm-resolutor__eyebrow">{etiqueta}</p>
        <p className="sgtm-resolutor__codigo">{codigo}</p>
        <Boton
          menudo
          aria-label="Cambiar el solicitante resuelto"
          onClick={() => {
            onCampo('solicitante', '');
            fijarEscrito('');
          }}
        >
          Cambiar
        </Boton>
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
        ph="VALDEZ RIOS, OLIVER"
        ayuda="Escribe el nombre y elige a la persona en la lista: el certificado se emite al contribuyente del padrón, y lo que se guarda es su código, no el texto."
        onCambio={fijarEscrito}
      />
      <p className="sgtm-resolutor__nota" role="status">
        {anuncioDelSolicitante(consulta, preguntable, escrito, bloqueado)}
      </p>
      {consulta.error !== null && <ErrorDeLaBusquedaDelSolicitante error={consulta.error} />}
      {candidatos.length > 0 && (
        <ul className="sgtm-asistente__resultados">
          {candidatos.map((candidato) => (
            <li key={candidato.codigo}>
              <button type="button" onClick={() => onCampo('solicitante', candidato.codigo)}>
                <span>
                  {candidato.nombre}
                  {candidato.documento === '' ? '' : ` · ${candidato.documento}`}
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

function anuncioDelSolicitante(
  consulta: { readonly isFetching: boolean; readonly error: unknown; readonly data?: unknown },
  preguntable: boolean,
  escrito: string,
  bloqueado: boolean,
): string {
  if (consulta.isFetching) return 'Buscando en el padrón…';
  if (!preguntable) {
    return !bloqueado && escrito.trim() !== ''
      ? `Todavía no se ha buscado: hacen falta al menos ${MINIMO} caracteres.`
      : '';
  }
  // El error tiene su propio bloque: no se repite aquí.
  if (consulta.error !== null) return '';
  const candidatos = Array.isArray(consulta.data) ? consulta.data.length : 0;
  if (candidatos === 0) {
    return 'Nadie del padrón responde a ese nombre. Revísalo, o dalo de alta antes de emitir.';
  }
  return candidatos === 1
    ? '1 contribuyente encontrado.'
    : `${candidatos} contribuyentes encontrados.`;
}

function ErrorDeLaBusquedaDelSolicitante({ error }: { readonly error: unknown }) {
  if (esNoEncontrado(error)) {
    return (
      <p className="sgtm-resolutor__nota" role="status">
        Nadie del padrón responde a ese nombre.
      </p>
    );
  }
  if (esSinPermiso(error)) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="No tienes permiso para consultar el padrón"
        detalle="Resolver al solicitante se hace contra el padrón de contribuyentes, y tu perfil no tiene esa consulta. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="No se pudo buscar al solicitante"
      detalle="La consulta no respondió, así que el sistema no sabe si esa persona está en el padrón. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no esté."
    />
  );
}
