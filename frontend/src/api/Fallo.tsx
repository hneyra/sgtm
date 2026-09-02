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
  llave,
  alReintentar,
}: {
  error: ErrorDeApi;
  /** Lo que no se pudo leer, en minúscula y con artículo: «el padrón», «la bitácora». */
  que: string;
  /** El acceso que hace falta, si se sabe cuál. Sólo se nombra ante un 403. */
  acceso?: string;
  /** La llave del conjunto sellado que ESTA lectura necesita, si se sabe cuál (#562). */
  llave?: string;
  alReintentar?: () => void;
}) {
  const causas = causasDelRechazo(error, llave);
  return (
    <Aviso tono="bad" titulo={tituloDelFallo(error, que)}>
      {explicacionDelFallo(error, acceso)}
      {/* Un 422 es la única respuesta con DOS causas que el código no separa, y
          la de arriba —el mensaje del servidor— es lo único que las distingue.
          Sale sólo aquí: en un 403 o en un 500 este párrafo sobraría. */}
      {causas !== null && (
        <span style={{ display: 'block', marginTop: 6, opacity: 0.85 }}>{causas}</span>
      )}
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
      /* No dice «esa búsqueda»: desde #562 un 422 puede ser también una cifra
         normativa que nadie ha publicado —el conjunto sellado del ejercicio sin
         la llave que la operación pide—, y culpar a lo tecleado pone a quien
         atiende a corregir un formulario que está bien. Lo que sí se sabe por
         código es que el servidor lo rechazó y que reintentar no lo cambia. */
      return 'El servidor rechazó esta consulta';
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

/**
 * Las dos causas de un 422, que el código NO separa.
 *
 * Desde #562 los últimos veinte endpoints que faltaban dejaron de contestar un
 * 500 opaco cuando falta publicar una cifra normativa: ahora contestan **422
 * nombrando la llave** —`TASA_ANUNCIO:PANEL`, `ARANCEL_COSTA:REC1`,
 * `PLAZO:DESCARGO_PAPELETA`—. Lo que eso deja en la interfaz es que ese 422
 * llega con el **mismo `VALIDACION`** que un campo mal tecleado: los
 * controladores construyen el `ProblemaDeNegocio` de dos argumentos, así que la
 * llave viaja sólo dentro de la prosa del `mensaje` y `detalles` llega vacío.
 * No hay ningún discriminador legible por programa (#604, #605).
 *
 * Y **no se adivina leyendo el texto**: el mensaje se reescribe en cuanto
 * alguien lo lee en voz alta, y una clasificación por subcadena acabaría
 * llamando «cifra sin publicar» a un campo que falta. Se hace lo que ya decidió
 * tesorería en #547: decir las dos posibilidades y en qué se reconocen, y decir
 * lo único que sí se sabe por código —que reintentar no lo cambia—.
 *
 * Devuelve `null` para todo lo demás, y ahí está la mitad del valor: un
 * `ORDEN_NO_ADMITIDO` es siempre un campo de orden que la operación no admite y
 * nunca una cifra sin publicar, y un `ERROR_INTERNO` sí es un fallo del
 * servidor y trae su incidencia. Un párrafo que saliera en los tres volvería a
 * juntar lo que #562 separó.
 *
 * `llave` es la que ESTA pantalla necesitaría, para que el ejemplo no sea el de
 * otro módulo. Sin ella se describe la forma y no se inventa ninguna.
 */
export function causasDelRechazo(error: ErrorDeApi | null, llave?: string): string | null {
  if (error === null) return null;
  /* No sólo el 422: **el mismo hecho sale con dos códigos** y es deliberado.
     Catastro traduce «falta publicar» a 404 porque allí se LEE un cuadro —el
     ejercicio sin conjunto sellado no tiene esa tabla—, mientras un cálculo lo
     da como 422 (#540, #723). Mirando sólo el código, los tres cuadros de
     catastro se quedaban sin esta frase aunque su respuesta trae el
     discriminador; y mirando sólo el discriminador, un 404 corriente —«ese
     número no existe»— se llevaría una frase sobre valores normativos.

     Así que se admite el 404 **sólo cuando trae el miembro**, que es lo que lo
     distingue de un no-encontrado de verdad. */
  if (error.codigo !== 'VALIDACION' && !(error.codigo === 'NO_ENCONTRADO' && error.faltaUnaCifraNormativa)) return null;
  /* UNA de las dos cosas, no las dos (#691, AC 5).
     Hasta que #714 llevó el discriminador a los seis módulos que no eran
     convenios, esta frase tenía que enumerar —«si nombra un dato de esta
     pantalla…; si nombra un ejercicio sin conjunto…»— y dejarle la clasificación
     a quien atiende, que es justo quien no puede hacerla: los dos casos salen con
     el mismo `codigo` y el mismo `estado`, y lo único que los separaba era el
     texto. Es la misma corrección que #604 hizo en Tesorería, ahora en el sitio
     compartido y por tanto en los cuatro módulos que llaman aquí.

     Se pregunta por la PRESENCIA del miembro y nunca por el texto: clasificar por
     subcadena deja de funcionar en cuanto alguien reescribe la frase, y esa
     reescritura no rompe ninguna compilación. */
  if (error.faltaUnaCifraNormativa) {
    const p = error.parametroQueFalta;
    return (
      'Lo que falta es una cifra normativa, no un dato de esta pantalla: ' +
      (p?.llave === undefined
        ? 'el ejercicio ' + String(p?.ejercicio) + ' no tiene conjunto de parámetros sellado'
        : 'falta publicar «' + p.llave + '» en el conjunto de ' + String(p.ejercicio)) +
      '. Eso no se arregla desde aquí, no es un fallo del servidor y no se corrige tecleando otra cosa ' +
      '(D-02a, D-02b): lo resuelve quien publica los valores normativos.'
    );
  }
  /* Sin el miembro, lo que falta es de la petición — **en las rutas cuyas
     excepciones de parámetro lo llevan todas**. Donde no, la ausencia significa
     tres cosas a la vez y el texto del servidor es lo único que las separa; por
     eso se dice que es el del servidor y se deja delante, en vez de afirmar que
     hay un campo que corregir. `llave` se conserva porque una pantalla que sabe
     cuál es la suya puede nombrarla antes de que el rechazo llegue. */
  return (
    'El texto de arriba es el del servidor, tal cual: es el único sitio donde se nombra lo que falta, y ' +
    'reintentar sin cambiar nada volvería a dar lo mismo. Lo corriente es que nombre un dato de esta ' +
    'pantalla, y entonces se corrige aquí' +
    (llave === undefined ? '' : `; si nombrara una llave como «${llave}», sería una cifra por publicar`) +
    '.'
  );
}
