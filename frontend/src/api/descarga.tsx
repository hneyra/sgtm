import { useCallback, useState } from 'react';
import { ErrorDeApi } from './cliente';
import { cuentaActual } from './sesion';
import { puede, usarPermisos, type EstadoDePermisos } from '../shell/permisos';
import { Aviso, Boton } from '../ds/componentes';
import { ICO } from '../ds/iconos';

/**
 * Traerse el documento que el backend ya emite — y no entregarlo cuando falla.
 *
 * <h2>Por qué no basta un enlace</h2>
 *
 * El token viaja en una cabecera, no en la URL. Un `<a href>` a
 * `…/ficha.pdf?formato=PDF` sale sin `Authorization` y el servidor contesta 401:
 * el navegador se descarga un JSON de error con nombre de PDF. Por eso la
 * descarga pasa por `descargar()` de `cliente.ts`, que es la ÚNICA puerta que
 * firma la petición, y no por una pestaña nueva.
 *
 * <h2>Y por qué el fallo se dibuja y no se susurra</h2>
 *
 * Una hoja oficial no se entrega ante un error. Si la descarga falla —403 sin
 * privilegio de impresión, 404 porque el sujeto no existe, 500— el navegador se
 * queda callado: no hay archivo, y tampoco hay señal. Un aviso permanente con
 * **el mensaje del servidor** es lo único que distingue «no se pudo» de «ya se
 * descargó y no lo encuentro». Un `toast` no sirve: se va solo, y el que atiende
 * mira la pantalla después de ir a por el papel a la impresora.
 */

/** Los tres de `FormatoDeDocumento`. Ni uno más: el backend contesta 422. */
export const FORMATOS_DE_DOCUMENTO = ['PDF', 'XLS', 'RTF'] as const;

export type FormatoDeDocumento = (typeof FORMATOS_DE_DOCUMENTO)[number];

/**
 * El privilegio que el endpoint exige para el documento.
 *
 * No es un adorno: cambia lo que hay que decir ante un 403. Los reportes de #53
 * piden `IMPRESION` —sacan del sistema un listado que nadie vio entero en
 * pantalla—, y la ficha y la constancia se conforman con `LECTURA` porque el
 * documento es la misma hoja que ya está dibujada. Decir «hace falta lectura»
 * ante un 403 de impresión manda a pedir un permiso que ya se tiene.
 */
export type PrivilegioDelDocumento = 'lectura' | 'impresion';

type Estado = { pidiendo: FormatoDeDocumento | null; error: ErrorDeApi | null };

/**
 * El estado de una descarga: cuál se está pidiendo y qué falló en la última.
 *
 * Guarda **un** error, no una lista: lo que hace falta saber es si la hoja que
 * se acaba de pedir salió, y un error viejo al lado de una descarga que sí
 * funcionó se lee como que tampoco esta salió.
 */
export function useDescarga() {
  const [estado, setEstado] = useState<Estado>({ pidiendo: null, error: null });

  const pedir = useCallback(
    async (formato: FormatoDeDocumento, traer: (f: FormatoDeDocumento) => Promise<void>) => {
      setEstado({ pidiendo: formato, error: null });
      try {
        await traer(formato);
        setEstado({ pidiendo: null, error: null });
      } catch (fallo) {
        /* Lo que no es un `ErrorDeApi` no se traga: `descargar()` traduce todo
           lo que viene del servidor, así que llegar aquí con otra cosa es un
           defecto de la interfaz y tiene que verse. */
        setEstado({
          pidiendo: null,
          error:
            fallo instanceof ErrorDeApi
              ? fallo
              : new ErrorDeApi('ERROR_INTERNO', 'La descarga falló en la interfaz, no en el servidor.', 0),
        });
      }
    },
    [],
  );

  return { ...estado, pedir };
}

/**
 * Los tres botones de descarga, con su fallo debajo.
 *
 * `impedimento` los apaga con su motivo dibujado. Existe porque el defecto de
 * esta familia ya pasó: la ficha del contribuyente se imprimía ante un 404, ante
 * un 403 y con la caja de búsqueda vacía, y un papel oficial con todos los datos
 * en «—» sigue siendo un papel oficial. Si no hay hoja leída, no hay documento
 * que pedir.
 *
 * <h2>Y desde #592 hay una segunda puerta, antes que ésa</h2>
 *
 * Las nueve descargas de Tránsito e Infracciones exigen `IMPRESION`, y hasta
 * ahora esta interfaz no lo preguntaba: dibujaba el botón encendido y quien no
 * tenía el privilegio recibía el 403 **después** de que se le hubiera prometido
 * el archivo. Ahora se comprueba contra el mapa de la sesión —una lectura, en
 * `App.tsx`— y el botón nace apagado diciendo cuál de los tres casos es.
 *
 * Un `impedimento` que llegue por prop **gana**, y es lo correcto: es más
 * específico —«no hay hoja leída», «falta la observación»— y el privilegio no
 * hace falta para algo que de todas formas no se puede pedir todavía.
 */
export function Descargas({
  traer,
  que,
  acceso,
  privilegio = 'lectura',
  impedimento,
  formatos = FORMATOS_DE_DOCUMENTO,
}: {
  /** Lo que va a `descargar()`. Lo escribe el `src/api/<modulo>.ts` de cada módulo. */
  traer: (formato: FormatoDeDocumento) => Promise<void>;
  /** Qué se descarga, en minúscula y con artículo: «la ficha del contribuyente». */
  que: string;
  /** El acceso del catálogo que hace falta, para poder nombrarlo ante un 403. */
  acceso?: string;
  privilegio?: PrivilegioDelDocumento;
  /** Lo que impide pedirlo hoy. Presente = los tres botones apagados con este texto. */
  impedimento?: string;
  /** Los formatos que ESTA ruta sirve. Por omisión los tres. */
  formatos?: readonly FormatoDeDocumento[];
}) {
  const { pidiendo, error, pedir } = useDescarga();
  /* Preguntar ANTES de prometer el archivo (#592). El 403 de abajo sigue
     estando y sigue explicándose bien, pero llega tarde: para entonces ya se
     pulsó el botón y ya se fue a por el papel a la impresora. */
  const sesion = usarPermisos();
  const motivo = impedimento ?? impedimentoDelPrivilegio(sesion, acceso, privilegio);
  const apagado = motivo !== undefined || pidiendo !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)' }}>
          Descargar
        </span>
        {formatos.map((f) => (
          <Boton
            key={f}
            icono={ICO.descarga}
            disabled={apagado}
            title={motivo}
            onClick={() => void pedir(f, traer)}
            style={{ padding: '7px 12px', fontSize: 12.5 }}
          >
            {pidiendo === f ? 'Generando…' : f}
          </Boton>
        ))}
      </div>
      {/* El motivo se DIBUJA, no se deja en el `title`: un boton apagado no
          recibe el foco, asi que su `title` no lo lee ni el raton de quien no
          pasa por encima ni un lector de pantalla (RNF-082, y es lo que #385
          cerro un escalon mas abajo). El `title` se queda ademas, para quien si
          pase el raton. */}
      {motivo !== undefined && (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)', textWrap: 'pretty' }}>{motivo}</p>
      )}
      {error !== null && (
        <Aviso tono="bad" titulo={tituloDeLaDescarga(error, que)}>
          {explicacionDeLaDescarga(error, acceso, privilegio)}
          {error.incidencia !== undefined && (
            <>
              {' '}
              <span style={{ opacity: 0.75 }}>Incidencia {error.incidencia}.</span>
            </>
          )}
          {error.detalles !== undefined && error.detalles.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </Aviso>
      )}
    </div>
  );
}

/**
 * Lo que impide descargar por falta de privilegio, dicho de tres maneras (#592).
 *
 * <h2>Con `lectura` no se aplica NUNCA, y eso es lo que la hace útil</h2>
 *
 * La ficha del contribuyente, la constancia y la resolución de determinación se
 * conforman con `LECTURA`, que es el mismo privilegio con el que ya se está
 * mirando la hoja: comprobarlo aquí apagaría una descarga que el servidor
 * entrega sin rechistar, y una guarda que dice que no a todo se acaba quitando
 * entera. La lista de lo que exige `IMPRESION` la fija cada pantalla al declarar
 * su `privilegio`, contra el `@RequiereAcceso` de su controlador.
 *
 * <h2>Tres textos y no uno, porque se arreglan de tres maneras</h2>
 *
 * Mientras se lee no se sabe todavía; ante un fallo de la lectura no se ha
 * podido saber —y decir ahí «no tienes permiso» manda a pedirle a Seguridad algo
 * que a lo mejor ya se tiene—; y sin el privilegio sí se sabe, y entonces lo que
 * hace falta es nombrar el acceso y el privilegio, que es lo que hay que pedir.
 *
 * El caso sin `acceso` declarado no se calla: no es que la sesión no pueda, es
 * que esta pantalla no dice contra qué comprobarlo, y apagar sin explicación es
 * el defecto que RNF-082 nombra.
 */
export function impedimentoDelPrivilegio(
  sesion: EstadoDePermisos,
  acceso: string | undefined,
  privilegio: PrivilegioDelDocumento,
): string | undefined {
  if (privilegio !== 'impresion' || puede(sesion, acceso, 'impresion')) return undefined;
  if (sesion.leyendo) return 'Comprobando si esta sesión puede imprimir…';
  if (sesion.fallo)
    return 'No se pudieron leer los permisos de esta sesión, así que no se ofrece la descarga. No quiere decir que falte el privilegio de impresión: quiere decir que no se sabe. Vuelve a cargar la pantalla.';
  if (acceso === undefined)
    return 'Esta descarga no declara qué acceso necesita, así que no se puede comprobar si la sesión puede imprimirla. Es un defecto de la interfaz, no un permiso que falte.';
  return `Hace falta el acceso «${acceso}» con privilegio de impresión. Con lectura se ve la hoja en pantalla; sacarla del sistema es otro permiso.`;
}

/**
 * El titular sale del código, igual que en `FalloDeLectura` y por lo mismo.
 *
 * Lo que cambia respecto de una lectura es el verbo: aquí no se «consulta», se
 * **entrega un papel**, y la frase tiene que dejar claro que no salió ninguno.
 */
export function tituloDeLaDescarga(error: ErrorDeApi, que: string): string {
  const cuenta = cuentaActual();
  switch (error.codigo) {
    case 'NO_AUTENTICADO':
      return 'La sesión no vale: no se descargó nada';
    case 'SIN_PRIVILEGIO':
      return cuenta === null
        ? `Esta sesión no puede descargar ${que}`
        : `La cuenta «${cuenta}» no puede descargar ${que}`;
    case 'SIN_MUNICIPALIDAD':
      return 'La sesión no dice de qué municipalidad es: no se descargó nada';
    case 'NO_ENCONTRADO':
      return `No se descargó ${que}: no se encontró`;
    case 'CONFLICTO':
      return `No se descargó ${que}: el estado actual no lo admite`;
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return `No se descargó ${que}: el servidor no admite esa petición`;
    case 'SIN_RESPUESTA':
      return error.estado === 0
        ? 'No se pudo contactar con el servidor: no se descargó nada'
        : 'El servidor contestó otra cosa: no se descargó nada';
    default:
      return `No se pudo descargar ${que}`;
  }
}

/** La explicación. Ante un 403 nombra el privilegio que ESTE endpoint pide. */
export function explicacionDeLaDescarga(
  error: ErrorDeApi,
  acceso: string | undefined,
  privilegio: PrivilegioDelDocumento,
): string {
  switch (error.codigo) {
    case 'NO_AUTENTICADO':
      return 'Vuelve a entrar: el token caducó o no es de este emisor.';
    case 'SIN_PRIVILEGIO':
      return (
        (acceso !== undefined
          ? `Hace falta el acceso «${acceso}» con privilegio de ${privilegio === 'impresion' ? 'impresión' : 'lectura'}. `
          : '') +
        (privilegio === 'impresion'
          ? 'Ver la hoja en pantalla es lectura; sacarla del sistema como archivo es impresión, y son dos permisos distintos. El de impresión lo concede Seguridad.'
          : 'Que Keycloak la deje entrar no basta: la cuenta tiene que estar además dada de alta en esta municipalidad, y el permiso lo concede Seguridad.')
      );
    case 'SIN_MUNICIPALIDAD':
      return 'No hay valor por omisión: sin municipalidad en el token no hay documento que emitir.';
    case 'SIN_RESPUESTA':
      return error.estado === 0
        ? 'El servidor no contestó. Puede estar apagado o no alcanzable desde aquí.'
        : error.mensaje;
    default:
      /* El mensaje del servidor, tal cual. Es el que nombra el dato que falta
         —«El formato va entre PDF, XLS y RTF»— y reescribirlo aquí sería tapar
         lo único que dice qué hacer. */
      return error.mensaje;
  }
}
