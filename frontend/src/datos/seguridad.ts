/*
 * Lo que queda del artboard `Seguridad.dc.html`: la ESTRUCTURA de la pantalla
 * de «Sistema» y el mapa de las once opciones del manual a los cuatro destinos.
 *
 * <h2>Lo que se fue, y por que</h2>
 *
 * Este archivo tenia ademas cuatro grupos, siete usuarios, nueve accesos, sus
 * permisos y siete filas de bitacora. La pantalla los usaba **como respaldo**:
 * cuando la lectura del backend fallaba —un 403, un 500, la red caida— dibujaba
 * el arbol de la maqueta sin decirlo, y quien miraba quien tiene la llave de la
 * caja leia los permisos de una municipalidad que no existe.
 *
 * No se arreglo poniendo un `if` mas: se **borraron los datos**. Un respaldo que
 * no esta en el modulo no se puede reintroducir por descuido, y una mutacion que
 * intente volver a el ni siquiera compila. Las cifras que si son reales se leen
 * de `api/seguridad.ts`, y las que no tiene el backend se dicen con un guion.
 */

/* ══════════ Sistema ══════════ */

export type CampoDeSistema = {
  k: string;
  l: string;
  t?: 'text' | 'sel' | 'clave' | 'chk' | 'ro';
  v?: string | boolean;
  o?: string[];
  ph?: string;
  ayuda?: string;
  ancho?: boolean;
};

export type PanelDeSistema = {
  label: string;
  titulo: string;
  nota: string;
  campos: CampoDeSistema[];
  /**
   * Lo que impide ejecutar la accion primaria, cuando algo lo impide.
   *
   * Con texto, la primaria nace apagada y **este texto es su `title`** y la nota
   * que se lee al lado (RNF-082): un boton apagado sin motivo obliga a
   * adivinar. Vacio, la accion se puede hacer.
   */
  impedimento: string;
  pie: string;
  primaria: string;
};

/**
 * Las cuatro pestañas de «Sistema».
 *
 * <h2>Ninguna cifra tributaria se dibuja aqui</h2>
 *
 * El artboard rellenaba «Parametros» con la UIT en 5 350,00, el IPM en 1,0206,
 * el interes moratorio en 0,90 % y el derecho de emision en 4,50. **Ninguna
 * salia de ninguna parte**, y la UIT publicada del ejercicio no es esa. Una
 * cifra tributaria no se teclea en una pantalla (regla 5): entra por el corpus
 * verificado a doble firma y se publica al conjunto sellado del ejercicio. Los
 * campos se quedan de solo lectura con un guion y dicen de donde vendrian.
 */
export const panelesDeSistema = (ejercicio: string, ejercicios: readonly string[]): PanelDeSistema[] => [
  {
    label: 'Ejercicio de trabajo',
    titulo: 'Cambiar el ejercicio de trabajo',
    nota: 'Cambiar el ejercicio de trabajo es un acto: lleva observación y exige el privilegio Especial sobre «cambiar_anio», porque decide sobre qué año escriben los doce módulos y hacerlo con una caja abierta produce recibos con el año equivocado. El selector de la cabecera NO es eso: sólo acota lo que las consultas piden, vive en el navegador y no queda registrado en ninguna parte.',
    campos: [
      { k: 'ejActual', l: 'Ejercicio de la vista', t: 'ro', v: ejercicio },
      { k: 'ejNuevo', l: 'Fijar como ejercicio de trabajo', t: 'sel', v: ejercicio, o: [...ejercicios] },
      {
        k: 'ejMotivo',
        l: 'Motivo del cambio · obligatorio',
        t: 'text',
        ancho: true,
        ph: 'Por qué pasa el trabajo a ese ejercicio',
        ayuda: 'Es lo único que la petición lleva además del año. Sin él no se puede registrar el acto (RNF-052).',
      },
    ],
    /* El artboard avisaba aquí de «una caja abierta (C-3, turno mañana)». No hay
       ninguna lectura de turnos abiertos en el contrato, así que el aviso no
       podía ser más que decorado — y decorado que dice que NO cambies algo.

       Sin impedimento estructural desde #557: `PUT /seguridad/sesion/ejercicio`
       existe y esta pantalla lo llama. Lo que puede impedir el acto es de
       ejecución —que falte el motivo, que el envío esté en curso— y lo calcula
       la pantalla, como el cambio de contraseña de aquí abajo. El permiso NO se
       cuenta entre esos impedimentos: sin él esta pestaña no se dibuja, así que
       no hay nada que apagar ni motivo que dar. */
    impedimento: '',
    pie: 'El cambio se anota en la bitácora con tu usuario, la hora y el motivo. El selector de la cabecera pasa además a ese año, pero eso es un efecto: lo que queda registrado es el ejercicio de trabajo de tu sesión.',
    primaria: 'Cambiar el ejercicio',
  },
  {
    label: 'Parámetros',
    titulo: 'Parámetros del sistema',
    nota: 'Con qué juego de valores se emitió cada ejercicio. La UIT, el IPM, los intereses y los derechos de emisión no se teclean: se publican al conjunto del ejercicio desde el corpus normativo, con dos firmas distintas, y sellarlo lo vuelve inmutable. Esta lectura publica el conjunto y su estado, no sus cifras una a una.',
    /* Las ocho cajas de cifras del artboard —UIT, IPM, interés moratorio, de
       fraccionamiento, custodia, derecho de emisión, caducidad e intentos— se
       retiran enteras. `GET /seguridad/parametros` SÍ existe y se lee (la tabla
       de abajo), pero publica la IDENTIDAD del conjunto y no sus cifras, a
       propósito: su javadoc dice que la pregunta que contesta esta pantalla es
       «con qué juego de valores se emitió este ejercicio». Dibujar ocho guiones
       con rótulo de UIT no informaría de nada; lo que informa es el conjunto. */
    campos: [],
    impedimento:
      'Un parámetro tributario no entra por una pantalla: entra por el corpus verificado a doble firma y ' +
      'se publica al conjunto del ejercicio, que una vez sellado no admite una cifra más. Aquí no hay nada ' +
      'que guardar.',
    pie: 'Un parámetro mal puesto no da error: da cifras equivocadas en todo el sistema.',
    primaria: 'Guardar parámetros',
  },
  {
    label: 'Mi contraseña',
    titulo: 'Cambiar mi contraseña',
    nota: 'La contraseña no vive en este sistema: la guarda el proveedor de identidad (ADR-0005). Lo que el backend hace es iniciar el cambio y mandarte allí; por eso su petición no lleva ningún campo de contraseña, ni la vieja ni la nueva.',
    /* El artboard dibujaba tres cajas de contraseña —actual, nueva y repetir—.
       `PUT /seguridad/usuarios/{id}/clave` recibe SOLO una observación: lo tecleado
       ahí no viajaba a ninguna parte y se quedaba en el estado de React. Se
       retiran: no hay campo porque no hay a dónde mandarlo. Y no vuelven ahora
       que la pantalla escribe de verdad — lo que cambió es que se sabe QUIÉN
       eres (#559), no dónde vive la credencial. */
    campos: [
      {
        k: 'cMotivo',
        l: 'Motivo del cambio · obligatorio',
        t: 'text',
        ancho: true,
        ph: 'Por qué cambias la contraseña',
        ayuda: 'Es lo único que la petición lleva: ninguna contraseña. Sin él no se puede iniciar el cambio (RNF-052).',
      },
    ],
    /* Sin impedimento estructural: `GET /seguridad/sesion` publica desde #559 el
       `usuarioId` que este `PUT` pide, y lo publica para cualquier sesión válida.
       Lo que puede impedir el acto es de ejecución —que esa lectura no haya
       llegado, o que falte la observación— y lo calcula la pantalla, porque
       depende de lo que se haya tecleado y no de lo que el backend publique. */
    impedimento: '',
    pie: 'El backend no recibe ninguna contraseña: registra el acto y te manda al proveedor de identidad.',
    primaria: 'Cambiar la contraseña',
  },
  {
    label: 'Copias de seguridad',
    titulo: 'Copias de seguridad',
    nota: 'Una copia sin restauración probada no es una copia. La tabla es la que el backend registra; la columna que importaría —la última restauración verificada— no es un campo suyo.',
    campos: [],
    impedimento:
      'La aplicación no ejecuta respaldos ni restauraciones: los hace el proceso de despliegue, y darle a ' +
      'sgtm_app lo que haría falta sería deshacer la separación de privilegios. Aquí sólo se consulta.',
    pie: 'Probar una restauración no toca la base en producción: se restaura en un entorno aparte y se comprueba el cuadre de caja.',
    primaria: 'Probar una restauración',
  },
];

/* ══════════ Paleta ══════════ */

/** Las once opciones de menú del manual que este módulo resume, con el destino
 *  al que van a parar. */
export const OPCIONES_DE_PALETA: [string, string][] = [
  ['Módulos', 'accesos'],
  ['Usuarios', 'accesos'],
  ['Grupos', 'accesos'],
  ['Accesos y políticas', 'accesos'],
  ['Miembros', 'accesos'],
  ['Permisos', 'accesos'],
  ['Auditoría', 'auditoria'],
  ['Cambiar el año', 'sistema'],
  ['Cambiar contraseña', 'sistema'],
  ['Parámetros', 'sistema'],
  ['Copias de seguridad', 'sistema'],
];
