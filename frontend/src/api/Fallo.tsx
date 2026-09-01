import { ErrorDeApi } from './cliente';
import { cuentaActual } from './sesion';
import { Boton, Aviso } from '../ds/componentes';

/**
 * Lo que la pantalla dibuja cuando una lectura NO se pudo hacer.
 *
 * Existe porque el silencio tiene un desenlace, y no es que nadie se entere.
 * Una búsqueda del padrón que falla y se dibuja como «0 de 0» se lee como «esa
 * persona no existe», y la pantalla ofrece a continuación crear un
 * contribuyente: el final natural de un 403 es duplicar en el padrón a alguien
 * que sí figura. En la matriz de accesos es peor —quien mira quién tiene la
 * llave de la caja leería los permisos de una maqueta— y en el panel de inicio
 * un avance del 77,7 % encima de una respuesta que dice 0 %.
 *
 * Por eso son TRES cosas y ninguna sobra: qué no se pudo leer, por qué, y —sólo
 * cuando reintentar puede cambiar algo— el botón. Un permiso que falta no se
 * arregla pulsando otra vez, y ofrecerlo ahí manda a quien atiende a insistir
 * en vez de a pedir el acceso.
 */
export function FalloDeLectura({
  error,
  que,
  acceso,
  alReintentar,
}: {
  error: ErrorDeApi;
  /** Lo que no se pudo leer, en minúscula y con artículo: «el padrón», «la bitácora». */
  que: string;
  /** El acceso que hace falta, si se sabe cuál. Sólo se nombra ante un 403. */
  acceso?: string;
  alReintentar?: () => void;
}) {
  return (
    <Aviso tono="bad" titulo={tituloDelFallo(error, que)}>
      {explicacionDelFallo(error, acceso)}
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
      {error.reintentable && alReintentar !== undefined && (
        <div style={{ marginTop: 9 }}>
          <Boton onClick={alReintentar}>Reintentar</Boton>
        </div>
      )}
    </Aviso>
  );
}

/**
 * El titular sale del CÓDIGO, no del texto.
 *
 * Los códigos son estables por contrato; el mensaje se reescribe en cuanto
 * alguien lo lee en voz alta. Y las causas no se parecen entre sí: un permiso
 * que falta no se arregla reintentando, y una red caída sí.
 */
export function tituloDelFallo(error: ErrorDeApi | null, que: string): string {
  const cuenta = cuentaActual();
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'La sesión no vale';
    case 'SIN_PRIVILEGIO':
      /* Nombra la cuenta: sin ella, «tu perfil no puede» obliga a averiguar con
         cuál se entró, y el caso corriente es haber entrado con otra. */
      return cuenta === null ? `Esta sesión no puede ver ${que}` : `La cuenta «${cuenta}» no puede ver ${que}`;
    case 'SIN_MUNICIPALIDAD':
      return 'La sesión no dice de qué municipalidad es';
    case 'NO_ENCONTRADO':
      return `No se encontró ${que}`;
    case 'METODO_NO_ADMITIDO':
      /* Es un defecto de la propia interfaz: pidio con el verbo que no era.
         Se dice asi para que no se confunda con un fallo del servidor, que es
         lo que parecia cuando esto salia 500 con incidencia (#556). */
      return 'La interfaz pidió esto de una forma que el servidor no admite';
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return 'El servidor no admite esa búsqueda';
    case 'SIN_RESPUESTA':
      /* Con estado, algo contestó: lo que falla es QUÉ contestó, no que no
         hubiera nadie. Decir «no contestó» al lado de un 200 se lee como que la
         pantalla no sabe lo que dice. */
      return error.estado === 0 ? 'No se pudo contactar con el servidor' : 'El servidor contestó otra cosa';
    default:
      return `No se pudo consultar ${que}`;
  }
}

export function explicacionDelFallo(error: ErrorDeApi | null, acceso?: string): string {
  switch (error?.codigo) {
    case 'NO_AUTENTICADO':
      return 'Vuelve a entrar: el token caducó o no es de este emisor.';
    case 'SIN_PRIVILEGIO':
      return (
        (acceso !== undefined ? `Hace falta el acceso «${acceso}» con privilegio de lectura. ` : '') +
        'Que Keycloak la deje entrar no basta: la cuenta tiene que estar además dada de alta en esta ' +
        'municipalidad, y el permiso lo concede Seguridad.'
      );
    case 'SIN_MUNICIPALIDAD':
      return 'No hay valor por omisión: sin municipalidad en el token no hay nada que consultar.';
    case 'NO_ENCONTRADO':
    case 'METODO_NO_ADMITIDO':
      return error.mensaje;
    case 'VALIDACION':
    case 'ORDEN_NO_ADMITIDO':
      return error.mensaje;
    case 'SIN_RESPUESTA':
      return error.estado === 0
        ? 'El servidor no contestó. Puede estar apagado o no alcanzable desde aquí.'
        : error.mensaje;
    default:
      return error?.mensaje ?? 'La consulta falló en el servidor.';
  }
}
