/* Comprueba lo que llega al navegador de una municipalidad, y lo que no.
 *
 * Tres cosas, y las tres hay que medirlas porque las tres se pierden sin avisar:
 *
 *   1. Que el juego de datos de ejemplo **no llega a produccion**.
 *   2. Que el paquete no pasa de su presupuesto, ni el arranque ni cada modulo.
 *   3. Que el paquete **no conoce el dominio** donde se sirve.
 *
 * El proxy de datos pesa mas que la aplicacion entera: son las respuestas de
 * las 134 operaciones. Se carga con `import()` y detras de una bandera para que
 * el empaquetador pueda descartar la rama, pero eso hay que comprobarlo, no
 * suponerlo: basta un `import` normal en cualquier archivo para que el chunk
 * vuelva a entrar sin que nada mas cambie.
 *
 * Compila dos veces —con la bandera y sin ella— y compara.
 *
 * Uso: node scripts/comprobar-compilaciones.mjs
 */

import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raiz = fileURLToPath(new URL('..', import.meta.url));

/**
 * Las **dos** aplicaciones, cada una con su paquete (#298, ADR-0016 §3).
 *
 * Antes habia una, y «el portal» se media como `arranque del back-office + el
 * trozo de Inicio`: era la mejor aproximacion posible mientras el ciudadano
 * entraba por el shell. Con `apps/portal` separado eso dejo de ser una
 * aproximacion y paso a ser una cifra falsa —medir el paquete que el ciudadano
 * YA NO descarga—, asi que ahora se mide el paquete propio de cada una.
 */
const APLICACIONES = [
  { nombre: 'backoffice', salida: join(raiz, 'apps/backoffice/dist') },
  { nombre: 'portal', salida: join(raiz, 'apps/portal/dist') },
];

/**
 * Dos huellas: una del juego de datos y otra del **codigo** del proxy.
 *
 * La lista de operaciones ya servidas vive en el mismo paquete que el proxy, asi
 * que viaja con el: si el proxy no llega a produccion, la lista tampoco.
 */
const HUELLAS = [
  { que: 'el juego de datos de ejemplo', texto: 'SANTA ROSA' },
  { que: 'el codigo del proxy', texto: 'El proxy de datos no conoce' },
];

/**
 * Presupuesto, en KB **comprimidos**, que es lo que viaja por la red.
 *
 * Sin un umbral que muerda, el paquete solo crece: nadie agrega 40 KB de golpe,
 * se agregan de dos en dos. Subir un numero tiene que costar una linea de este
 * archivo y una frase en el PR que diga por que.
 *
 * `arranque` se subio a 150 KB el 2026-08-27 —quedaban doce modulos por
 * conectar— y a 156 el 2026-08-28, al conectarse tesoreria, valores, coactiva
 * y el resto de rentas (#73–#76): sus escrituras declaradas y sus conexiones
 * son parte del arranque por diseno —`conexiones.ts` y `escrituras.ts` son
 * quienes deciden que puede hacer cada pantalla, y eso se decide antes de
 * dibujarla—. Lo medido al subirlo: 152,7. El margen es para los cuatro
 * modulos de la onda 4, no para crecer sin mirar: el mayor trozo por modulo
 * sigue apretado en 11 KB.
 *
 * **Y a 157 el 2026-08-29** (#421), que es la subida mas pequena que cabe. Lo
 * que la pide es `LA_QUE_ESCRIBE` (`pantallas/actos.ts`): once pares
 * opcion → rotulo, 0,2 KB comprimidos, que dicen cual accion escribe en las
 * pantallas donde el prototipo no la dibujo la ultima. La alternativa medida no
 * es «no gastar»: son **once componentes propios**, uno por opcion, como los que
 * #75 escribio para `valores_masivo` y `pase_coactiva`; el mas pequeno de
 * aquellos pesa mas que este mapa entero, y once dejarian ademas once sitios
 * donde volver a equivocarse. Lo medido al subirlo: 156,1 con la rama ya puesta,
 * sobre los 155,9 que ya traia `main` —el margen que quedaba era de 0,1 KB, asi
 * que cualquier cambio transversal habria tenido que tocar este numero—.
 *
 * **Y de vuelta a 156 el mismo dia** (#424). Aquella subida se pidio por falta
 * de margen, no por peso: el mapa costaba 0,2 KB y solo quedaban 0,1. Este
 * issue devolvio el margen sin quitar nada —`PermisosMatrix`, `MiembrosDeGrupo`
 * y `Respaldos`, las tres pantallas propias de seguridad que seguian en el
 * trozo comun, pasaron a `lazy()`, el movimiento de #379—, y con el emisor de
 * reportes ya conectado lo medido es **154,3**. Se baja el numero en vez de
 * heredarlo: un presupuesto con 2,7 KB de holgura sigue apretando; uno con 0,1
 * obliga a tocarlo en el proximo cambio transversal, y uno con 2,9 deja de
 * medir. Bajarlo de verdad —decidir que sale del arranque— es #433.
 *
 * **Y a 157 el 2026-08-29** (#442), con dos cosas que conviene dejar escritas.
 *
 * La primera: **CI mide mas que esta maquina**. Lo mismo daba 155,9 en local y
 * **156,2** en el runner —0,3 KB de diferencia, que a esta granularidad es mas
 * que el margen que quedaba—. De modo que un umbral con 0,1 KB de holgura no es
 * un umbral apretado: es uno que decide en verde o rojo segun donde se compile.
 * Lo que se mide de verdad es lo que corre en CI.
 *
 * La segunda: **el margen ya se lo habia comido #445**, no este cambio. Con la
 * corrida del predial declarada, CI dejaba el arranque en ~155,9 de 156; lo que
 * anade #442 —la tira de hojas de una superficie, las tres entradas del
 * vocabulario uniforme y su hoja de estilos— son 0,3. Se intento devolverlo
 * sacando la tira del arranque con `lazy()`, el movimiento de #379 y #424, y
 * **solo dio 0,1**: el peso no esta ahi. Se revirtio en vez de dejar un
 * `Suspense` y un esqueleto en cada carga de esas dos pantallas a cambio de una
 * decima.
 *
 * **Y a 145 el 2026-08-29** (#433), que es la primera vez que este numero BAJA
 * porque baja lo medido y no porque se herede mejor.
 *
 * Lo que salio: **los doce registros de modulo**. `conexiones.ts` y
 * `composicion.ts` los importaban de forma estatica, asi que el `parametros`, el
 * `leer` y el `adaptar` de las 79 opciones conectadas —los de Transito
 * incluidos— viajaban en el arranque de quien solo iba a abrir Catastro. Ahora
 * llegan con el trozo de su modulo, en la MISMA espera que ya bloqueaba el
 * dibujo (`pantallas/aportes-de-modulo.ts`): ni un viaje mas, ni un `Suspense`
 * mas. Medido: **155,7 → 141,3**, o sea **14,4 KB**, repartidos hoy en
 * `rentas-index` 2,8 · `consultas-index` 2,7 · `transito-index` 2,4 ·
 * `catastro-index` 1,8 · `tesoreria-index` 1,7 · `fiscalizacion-index` 1,5 ·
 * `sanciones-index` 1,2 · `licencias-index` 1,1 · `coactiva-index` 1,1 ·
 * `seguridad-index` 0,8 · `valores-index` 0,5 · `recaudacion` 0,6, mas las cinco
 * composiciones (1,0 + 1,0 + 0,3 + 0,2 + 0,1).
 *
 * **Y el margen ya no se mide igual, que es lo que este issue cambia de
 * verdad.** Antes cada opcion que se conectaba engordaba el arranque de todos:
 * 14,4 KB entre 79 opciones son ~0,18 KB por opcion, asi que las seis oleadas
 * que faltan (#426–#432, unas treinta opciones) valian ~5,4 KB del arranque y no
 * cabian. Desde aqui valen **cero**: caen en el trozo de su modulo, cuyo
 * presupuesto propio —11 KB, el mayor va por 8,9— es el que las mide.
 *
 * De modo que los 3,7 KB que quedan (141,3 medidos aqui, ~141,6 en CI por la
 * diferencia de abajo) no son para las conexiones: son para lo que esas
 * conexiones dejan en el arranque, que es su declaracion de escritura. El mapa
 * `ESCRITURAS` pesa 5,2 KB comprimidos para 49 opciones —**0,11 KB por opcion
 * que escribe**—, asi que si la mitad de las treinta escribiera serian ~1,7 KB;
 * el resto es para un mecanismo transversal mas, de los que costaron 0,2–0,4 KB
 * a #421, #423 y #442.
 *
 * Lo medido y NO sacado, con su numero, para que el proximo no vuelva a medirlo:
 *
 *   `ESCRITURAS` (`pantallas/escrituras.ts`)            5,2 KB
 *   `OPERACIONES` (`@sgtm/api-client`, 176 del contrato) 4,3 KB
 *
 * El primero es un mapa plano de 750 lineas cuyo censo —`OPCIONES_QUE_ESCRIBEN`—
 * lo lee `lecturas-por-post.ts` en produccion, no solo las pruebas: partirlo por
 * modulo es otro issue, no una linea. El segundo no se puede partir por modulo
 * porque las operaciones no son de un modulo —«Caja tributaria» lee
 * `consulta_deuda`, que es de Consultas—, y `descriptorDe` se llama sincrono
 * dentro de `useDatosDeOperacion`; lo que #298 le quito al **portal** fue no
 * usarlo, y el back-office si lo usa.
 *
 * **Y a 158 el 2026-08-30** (#427), con la leccion de #442 aplicada al pie de la
 * letra: lo medido en esta maquina es **156,9**, y CI mide ~0,3 mas, asi que con
 * 157 este cambio decidiria en verde o rojo segun donde se compile. Lo que lo
 * pide es lo mismo que subio el numero las veces anteriores y por el mismo
 * diseno: **`escrituras.ts` esta en el arranque a proposito** —el camino de
 * escritura lo necesita entero y sincrono—, y `certificados` le anade su lista
 * blanca, su tabla de traduccion del tipo y lo que su `exigir` dice; los dos
 * padrones anaden sus dos lineas a `lecturas-por-post.ts`. Son 0,8 KB entre las
 * tres. La alternativa medida no es «no gastar»: los dos emisores y el resolutor
 * del solicitante **ya van en `lazy()`** —3,8 KB fuera del arranque— y la prosa
 * de los mensajes se recorto antes de tocar este numero, sin mover la decima.
 *
 * Se sube a 158 y no a 157,5 porque el margen tiene que aguantar lo que queda de
 * la via B (#428 y #432 anaden declaraciones del mismo tipo); si al cerrarla
 * sobra, se baja, como hizo #424.
 *
 * **Y #426 no lo toca, que es la noticia**: conectar el modulo de Coactiva
 * entero —ocho escrituras, cinco controles anadidos y tres conexiones— cuesta
 * **1,4 KB** del arranque (142,6 → 144,0 medidos aqui), y no los 2,5 que habria
 * costado antes de este reparto: las composiciones y las conexiones se van con
 * el trozo de su modulo, y lo unico que sigue pagando todo el mundo son los ocho
 * cuerpos de `escrituras.ts`, que estan en el arranque por diseno —el camino de
 * escritura los necesita enteros y sincronos—. Quedan 1,0 KB de los 2,4 que este
 * numero traia: la via B de arriba sigue siendo lo que decide si sobra o falta.
 *
 * **Y a 146 el 2026-08-31** (#498 F2), con el margen que #426 dejo ya gastado.
 *
 * Lo medido: `main` con F1 dentro esta en **144,9**, y F2 lo deja en **145,1**.
 * Son **0,2 KB**, y los tres sitios donde caen son arranque por diseno, no por
 * descuido: la barra lateral **es** el shell.
 *
 *   `accionPrimaria` en `navegacion.generado.ts`   el dato del boton
 *   el boton y su calculo en `BarraLateral.tsx`    incluida la guarda de permiso
 *   `NUEVO` en `busqueda.ts` y `mas` en `Icono`    dos constantes
 *
 * **Lo que se intento antes de tocar este numero, y lo que dio.** El boton se
 * escribio primero con CSS propio —seis declaraciones—, y se sustituyo por
 * `.sgtm-boton--primario` del design system, que ya las tenia todas. Es la
 * correccion correcta por si sola —repetir `--accent-contraste` a mano es como
 * se pierde el tema oscuro— y **no movio la decima**: 145,1 antes y despues. El
 * peso no esta en el CSS.
 *
 * Sacar el boton del arranque **no es una opcion**: vive en la barra lateral,
 * que se dibuja en la primera pantalla y en todas. Un `lazy()` ahi es un hueco
 * parpadeando en el sitio mas visible del shell a cambio de dos decimas.
 *
 * Se sube a 146 y no a 145,5 por la leccion de #442, que este archivo ya
 * aprendio dos veces: lo medido aqui son 145,1 y CI mide ~0,3 mas, asi que
 * 145,5 decidiria en verde o rojo segun donde se compile. Y porque quedan
 * fases del mismo issue que caen en el arranque —la barra de contexto del
 * predio (F3) y los cinco estados (F6) son las dos del shell—; si al cerrarlas
 * sobra, se baja, como hizo #424.
 *
 * **Y a 147 el 2026-08-31** (#506 F2 y F3), por lo mismo y con la misma cuenta.
 *
 * Lo medido: `main` con la F1 de Fiscalización dentro sigue en **144,9** —esa
 * fase no costó nada: es una declaración, y viaja en el trozo de su módulo—. F2
 * lo deja en **145,3** y F3 en **145,7**, y los dos sitios donde cae son
 * arranque por diseño:
 *
 *   F2   la hoja de estilos del acta —los cuatro pasos, el modo campo y el
 *        contraste—. El componente **no**: entra por `lazy()` y viaja en su
 *        propio trozo, que es lo que se ve en la lista de a-petición
 *   F3   `accionDeFila` en `TablaDePantalla`, que es del arranque porque la
 *        tabla la dibujan las 134 pantallas, más su declaración en `Pantalla`
 *
 * **Sacar cualquiera de los dos del arranque no es una opción**, y por el mismo
 * motivo que el botón de F2 de #498: la tabla se dibuja en casi todas las
 * pantallas y su hoja de estilos es global. Un `lazy()` ahí es un hueco
 * parpadeando dentro de la tabla a cambio de tres décimas.
 *
 * Se sube a 147 y no a 146 por la lección de #442, que este archivo ya aprendió
 * tres veces: lo medido son 145,7 y CI mide ~0,3 más, así que **146 decidiría en
 * verde o rojo según dónde se compile**. Quedan fases del mismo issue que caen
 * en el arranque; si al cerrarlas sobra, se baja, como hizo #424.
 *
 * **148 desde #503 F7**, y es la misma leccion por cuarta vez. Lo que sube al
 * arranque es el camino que abre un alta desde el shell: `?nuevo=1` deja de
 * abrir solo el asistente guiado y abre tambien el panel lateral, mas el
 * `accionPrimaria` de Rentas en el catalogo de navegacion. **El formulario no**:
 * `AltaDeContribuyente` y el andamio que comparte con las tres altas de Catastro
 * viajan en sus propios trozos, y se ven en la lista de a-peticion
 * (`FormularioDeAlta`, `altas`).
 *
 * Sacar del arranque el resto no es una opcion: la barra lateral vive ahi —es
 * quien dibuja el boton— y el catalogo de navegacion tambien. Lo medido son
 * 146,6 y CI mide ~0,3 mas, asi que **147 decidiria en verde o rojo segun donde
 * se compile**, que es exactamente lo que #442 enseño y este archivo ya ha
 * aprendido tres veces.
 *
 * **Y 149 desde #500**, el mapa catastral, que es la primera dependencia de
 * terceros con peso del frontend. Lo medido: 146,9 antes y **147,5** despues.
 * Los 0,6 son enteros del arranque por diseño —el destino «Mapa catastral» en
 * `navegacion.generado.ts`, la rama de la barra lateral que dibuja un destino de
 * ruta con su guarda de permiso, y la ruta con su puerta perezosa en
 * `App.tsx`—: la barra se dibuja en las 134 pantallas y el enrutador es el
 * enrutador.
 *
 * **Leaflet no esta ahi, y esa es la condicion con la que ADR-0022 §4 lo
 * acepta.** Se carga con `import()` desde el lienzo y sale en la lista de
 * a-peticion: `leaflet-src` 42,3 KB comprimidos y su hoja 6,3, mas los 4,5 de la
 * pantalla y los 0,9 de su CSS. Quien entra a mirar un recibo no descarga nada
 * de eso.
 *
 * **Y la hoja de estilos tampoco**, que es lo que hizo falta medir dos veces:
 * escrita en `estilos/aplicacion.css` —la global, que carga `main.tsx`— dejaba
 * el arranque en **147,9 de 148**, una decima. Movida a
 * `pantallas/catastro/mapa.css` e importada desde el componente perezoso, viaja
 * con su trozo. Es la primera hoja del back-office que vive fuera de la global,
 * y el mecanismo no es nuevo: la de Leaflet ya salia asi.
 *
 * Se sube a 149 y no a 148 por la leccion de #442 por quinta vez: lo medido son
 * 147,5 y CI mide ~0,3 mas, asi que **148 decidiria en verde o rojo segun donde
 * se compile**.
 *
 * **Y #498 F2b gasta 0,6 de ese margen** —no vuelve a subir el numero—: es la
 * reagrupacion de Catastro conforme al artboard, donde el panel deja de listar
 * opciones y pasa a dibujar **destinos** (icono, rotulo y la nota que dice de
 * que va). Lo medido: 146,3 antes y 146,9 despues, repartidos en los trazos de
 * los cuatro iconos y sus notas dentro de `navegacion.generado.ts`, el
 * componente `Destino` y su bloque de estilos.
 *
 * Lo que se intento antes: reusar los estilos del modulo del riel no vale —el
 * riel es solo icono, sin texto ni nota— y las clases equivalentes de la barra
 * vieja (`.sgtm-nav__modulo*`) las borro #498 F1 precisamente porque nada las
 * usaba. No habia de donde reusar. Y sacarlo del arranque tampoco: la barra se
 * dibuja en la primera pantalla y en todas.
 *
 * **149 desde #503**, y por quinta vez la misma leccion. Lo que sube al arranque
 * es que la lista y el expediente dejen de dibujarse a la vez: dos derivaciones
 * en `Pantalla` —quien tiene registro abierto y quien no— y la composicion de la
 * ruta de la fila, mas el nombre accesible del enlace en `TablaDePantalla`. Las
 * tres viven en el arranque porque la tabla y el renderizador los dibujan las
 * 134 pantallas.
 *
 * Lo medido son 147,4 y CI mide ~0,3 mas, asi que **148 dejaria 0,3 KB de
 * margen**: cualquier cambio que aterrice al lado lo vuelca, y entonces el rojo
 * no seria de quien lo causo. Subirlo es una decision que se explica en el PR,
 * como las cuatro anteriores.
 *
 * En una municipalidad con red mala, el arranque es lo que separa «lento» de
 * «no abre».
 */
const PRESUPUESTO = {
  /** Lo que hay que descargar para ver la primera pantalla: JS de arranque y CSS. */
  arranque: 149,
  /** Lo que cuesta entrar en un modulo: su trozo del catalogo. */
  modulo: 11,
  /**
   * Lo que le cuesta al **ciudadano** abrir el portal (#81, #298).
   *
   * Es el unico flujo del sistema que no usa alguien de la municipalidad: se
   * entra desde un telefono, una vez al ano, con la red que haya. Y desde #298
   * es **su propio paquete**: `apps/portal` no lleva el shell ni el catalogo de
   * navegacion de los doce modulos —los ~11,5 KB de 134 opciones con sus iconos
   * y resumenes que el ciudadano se descargaba para no usarlos nunca—.
   *
   * **79,1 KB medidos el 2026-08-29** (#57), contra los 147,4 que costaba entrar
   * por el shell: se fija en 82, que son tres kilobytes de margen. Corto **a
   * proposito**: el portal es una pantalla, no doce modulos, y no tiene por que
   * crecer. Un presupuesto holgado aqui devolveria en seis meses lo que la
   * separacion acaba de quitar. Subirlo es una decision que se explica en el PR,
   * como el de arriba.
   *
   * **Y con ADR-0020 baja, no sube**, que es lo que hay que mirar: el portal gano
   * la sesion del ciudadano y perdio la caja de documento, los tres tipos de
   * documento del prototipo, el adaptador de las seis rejillas de la unificada y
   * la segunda lectura del padron. De 80,9 a 79,1. Lo que ahora dibuja es una
   * respuesta ya compuesta por el servidor, y componer en el servidor pesa cero
   * en el telefono.
   *
   * Los 4,2 KB que antes bajaron de 85,1 a 80,9 fueron el mapa entero de las
   * operaciones del contrato —169 entonces—: el portal pedia con
   * `pedirOperacion`, que lo lee para resolver la ruta, y con el viajaban las
   * rutas de escritura del sistema en la aplicacion destinada a ser publica.
   * Ahora declara **una** ruta
   * (`apps/portal/src/lecturas.ts`) y pide con `solicitar()`.
   *
   * De los 79, unos 60 son React y el cliente de consultas; lo propio del portal
   * —su pantalla, los adaptadores de `@sgtm/lectura` y la puerta de sesion— no
   * llega a 20. Bajar de ahi es cambiar de biblioteca, no de pantalla.
   */
  portal: 82,
};

/* ── El paquete no conoce el dominio ─────────────────────────────────────── */

/**
 * Los valores de identidad con los que CI construye la imagen, leidos del PROPIO
 * flujo de publicacion.
 *
 * Compilar aqui con otros valores no comprobaria nada: lo que llega a la
 * municipalidad es lo que `publicar-imagenes.yml` pasa como `build-args`, y es
 * ahi donde el defecto se reintroduce. Si alguien vuelve a poner una URL
 * absoluta, esta compilacion la hornea y el paso de abajo la encuentra.
 *
 * Si no encuentra los valores, **falla**. Una comprobacion que se salta a si
 * misma cuando no halla lo que buscaba deja el verde intacto y no protege nada.
 */
function identidadDeCI() {
  const flujo = readFileSync(join(raiz, '../.github/workflows/publicar-imagenes.yml'), 'utf8');
  const valores = {};
  for (const [, clave, valor] of flujo.matchAll(/^\s*(VITE_SGTM_OIDC_[A-Z_]+)=(.+)$/gm)) {
    valores[clave] = valor.trim();
  }
  const exigidas = [
    'VITE_SGTM_OIDC_CLIENTE',
    'VITE_SGTM_OIDC_AUTORIZACION',
    'VITE_SGTM_OIDC_TOKEN',
    'VITE_SGTM_OIDC_FIN_DE_SESION',
  ];
  const faltan = exigidas.filter((c) => !valores[c]);
  if (faltan.length > 0) {
    console.error(
      `\n\u2717 No se pudieron leer de publicar-imagenes.yml: ${faltan.join(', ')}.\n  Sin esos valores esta comprobacion no mide nada; se para en vez de pasar en verde.\n`,
    );
    process.exit(1);
  }
  return valores;
}

/** Los dominios que `infra/` declara hoy, uno por ambiente. */
function dominiosDeclarados() {
  const infra = join(raiz, '../infra');
  const dominios = [];
  for (const archivo of readdirSync(infra)) {
    if (!/^Pulumi\..+\.yaml$/.test(archivo)) continue;
    const encontrado = readFileSync(join(infra, archivo), 'utf8').match(
      /^\s*sgtm:domain:\s*(.+)$/m,
    );
    if (encontrado) dominios.push(encontrado[1].trim().replace(/['"]/g, ''));
  }
  if (dominios.length === 0) {
    console.error(
      '\n\u2717 Ningun Pulumi.<ambiente>.yaml declara `sgtm:domain`; no hay nada que buscar.\n',
    );
    process.exit(1);
  }
  return dominios;
}

const IDENTIDAD = identidadDeCI();
const DOMINIOS = dominiosDeclarados();

/* Vite resuelve las `VITE_*` AL COMPILAR: una URL absoluta aqui hornea el nombre
 * del servidor dentro del paquete. Como la etiqueta de la imagen vive fuera del
 * estado de Pulumi (`ADR-0011` §5), cambiar `sgtm:domain` actualiza el ingreso y
 * NO el paquete: las dos mitades quedan apuntando a sitios distintos, en verde y
 * sin un solo sintoma. Keycloak se sirve en el mismo origen, asi que basta una
 * ruta y el navegador la resuelve contra el origen desde el que se descargo. */
const absolutas = Object.entries(IDENTIDAD).filter(([, valor]) => valor.includes('://'));
if (absolutas.length > 0) {
  console.error(
    `\n\u2717 publicar-imagenes.yml hornea una URL absoluta en el paquete:\n${absolutas
      .map(([clave, valor]) => `    ${clave}=${valor}`)
      .join(
        '\n',
      )}\n  Keycloak se sirve en el mismo origen: usa una ruta (\u00abtoken\u00bb y \u00abfin de sesion\u00bb ya\n  funcionan tal cual, y \u00abautorizacion\u00bb la resuelve new URL(valor, origin)).\n`,
  );
  process.exit(1);
}

const comprimido = (contenido) => gzipSync(contenido).length / 1024;

function compilar(conProxy) {
  for (const app of APLICACIONES) rmSync(app.salida, { recursive: true, force: true });
  execFileSync('yarn', ['build'], {
    cwd: raiz,
    stdio: 'pipe',
    // Con la identidad que usa CI, no sin ella: si se compilara sin estas
    // variables, el paquete no podria contener el dominio y la comprobacion de
    // abajo pasaria siempre.
    env: { ...process.env, ...IDENTIDAD, VITE_SGTM_PROXY_DE_DATOS: conProxy ? 'true' : 'false' },
  });

  const medidas = {};
  for (const app of APLICACIONES) medidas[app.nombre] = medir(app.salida);
  return {
    ...medidas,
    // Lo que se busca dentro del paquete —el juego de datos, el proxy, el
    // dominio— se busca en las DOS aplicaciones: el portal instala el mismo
    // proxy detras de la misma bandera, y una fuga por ahi contaria igual.
    bytes: APLICACIONES.reduce((suma, app) => suma + medidas[app.nombre].bytes, 0),
    trae: new Set(APLICACIONES.flatMap((app) => [...medidas[app.nombre].trae])),
    dominios: new Set(APLICACIONES.flatMap((app) => [...medidas[app.nombre].dominios])),
  };
}

/** Lo que pesa el paquete de UNA aplicacion, repartido en arranque, modulos y diferidos. */
function medir(salida) {
  const activos = join(salida, 'assets');
  let bytes = 0;
  let arranque = 0;
  const trae = new Set();
  const dominios = new Set();
  const modulos = [];
  const diferidos = [];
  // Lo que el navegador pide **antes de pintar la primera pantalla**: el modulo
  // de entrada, su hoja de estilos y los trozos que Vite precarga porque la
  // entrada los importa de forma estatica. Es lo que `index.html` enumera.
  //
  // Antes se sumaba «todo lo que no es un trozo por modulo», y eso contaba como
  // arranque tambien lo que se carga con `import()` cuando alguien pulsa un
  // boton: partir en dos un formulario que nadie abre al entrar hacia **subir**
  // la cifra que mide lo que cuesta entrar. Un presupuesto que castiga la
  // correccion empuja a no hacerla.
  const deLaEntrada = primeraPantalla(salida);

  for (const archivo of readdirSync(activos)) {
    if (!archivo.endsWith('.js') && !archivo.endsWith('.css')) continue;
    const contenido = readFileSync(join(activos, archivo));
    const kb = comprimido(contenido);

    if (archivo.endsWith('.js')) {
      bytes += contenido.length;
      const texto = contenido.toString('utf8');
      for (const huella of HUELLAS) if (texto.includes(huella.texto)) trae.add(huella.que);
      for (const dominio of DOMINIOS) if (texto.includes(dominio)) dominios.add(dominio);
    }

    // Los trozos por modulo llevan el nombre de su archivo generado.
    if (archivo.includes('.generado-')) modulos.push({ archivo, kb });
    else if (deLaEntrada.has(archivo)) arranque += kb;
    else diferidos.push({ archivo, kb });
  }
  return { bytes, trae, dominios, arranque, modulos, diferidos };
}

/**
 * Los activos que `index.html` pide para pintar: la entrada, su CSS y los
 * `modulepreload` de su cierre de importaciones estaticas.
 *
 * Falla ruidosamente si no encuentra ninguno: si el formato de `index.html`
 * cambiara, esta funcion devolveria un conjunto vacio, el arranque saldria 0 KB
 * y el presupuesto pasaria siempre —una comprobacion que se salta a si misma—.
 *
 * **Queda un hueco estrecho, y esta dicho a proposito.** Lo que se mide es lo
 * que `index.html` enumera, y ahi solo entran la entrada y sus importaciones
 * *estaticas*. Un `import()` de nivel superior lanzado sin esperarlo —un
 * `void import('./loQueSea')` en el modulo de entrada— lo pide el navegador
 * nada mas arrancar y **no aparece en ningun `modulepreload`**: dejaria de
 * contar como arranque sin dejar de costarlo. No se cierra automaticamente
 * porque distinguir esa forma de un `import()` legitimo tras una pulsacion
 * exige analizar el codigo, no leer el HTML. Lo que si lo delata es la lista de
 * diferidos que este mismo guion imprime: un trozo que aparezca ahi y que la
 * primera pantalla necesite se ve en el diff del tamano de los diferidos, no en
 * el del arranque.
 */
function primeraPantalla(salida) {
  const html = readFileSync(join(salida, 'index.html'), 'utf8');
  /* La ruta base es del paquete, no de esta comprobacion: el back-office se
     sirve en `/` y el portal en `/portal/` (#298), asi que lo que se busca es
     «.../assets/<archivo>» y no una raiz concreta. Con la raiz fija dentro, el
     portal no habria enumerado NINGUN activo y su arranque habria salido 0 KB
     —el presupuesto pasaria siempre—; lo unico que lo evita es que
     `primeraPantalla` se pare cuando el conjunto sale vacio. */
  const activos = new Set(
    [...html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"]+)"/g)].map(([, archivo]) => archivo),
  );
  if (activos.size === 0) {
    console.error(
      `\n\u2717 ${salida}/index.html no enumera ningun activo: la medida del arranque no vale.\n`,
    );
    process.exit(1);
  }
  return activos;
}

const con = compilar(true);
const sin = compilar(false);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`con proxy: ${kb(con.bytes)} · sin proxy: ${kb(sin.bytes)}`);

for (const huella of HUELLAS) {
  if (!con.trae.has(huella.que)) {
    console.error(`\n✗ Con la bandera encendida deberia estar ${huella.que}, y no esta.\n`);
    process.exit(1);
  }
  if (sin.trae.has(huella.que)) {
    console.error(
      `\n✗ ${huella.que} llega a produccion: la compilacion sin proxy contiene «${huella.texto}».\n  Alguna importacion dejo de ser condicional; revisa que el proxy solo se cargue con «import()» tras la bandera.\n`,
    );
    process.exit(1);
  }
}
if (sin.bytes >= con.bytes) {
  console.error('\n✗ Sin el proxy el paquete deberia ser mas pequeno, y no lo es.\n');
  process.exit(1);
}

console.log(
  `Ni el juego de datos ni el proxy llegan a produccion: ${kb(con.bytes - sin.bytes)} menos.`,
);

/* ── Ningun dominio dentro del paquete ───────────────────────────────────── */

/* Lo anterior mira la fuente —lo que el flujo pasa—; esto mira el ARTEFACTO. No
 * es redundante: el dominio podria entrar por otro camino, una constante escrita
 * a mano en cualquier archivo, y esa no la ve leyendo el flujo. */
const horneados = [...new Set([...con.dominios, ...sin.dominios])];
if (horneados.length > 0) {
  console.error(
    `\n\u2717 El paquete lleva dentro el dominio donde se sirve: ${horneados.join(', ')}.\n` +
      '  La etiqueta de la imagen vive fuera del estado de Pulumi (`ADR-0011` §5), asi que\n' +
      '  cambiar `sgtm:domain` actualiza el ingreso y NO el paquete: las dos mitades acaban\n' +
      '  apuntando a sitios distintos, en verde. Usa rutas del mismo origen.\n',
  );
  process.exit(1);
}

console.log(`El paquete no conoce su dominio: ninguno de ${DOMINIOS.join(', ')} aparece dentro.`);

/* ── Presupuesto ─────────────────────────────────────────────────────────── */

const excedidos = [];
if (sin.backoffice.arranque > PRESUPUESTO.arranque) {
  excedidos.push(
    `el arranque ocupa ${sin.backoffice.arranque.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.arranque}`,
  );
}
for (const modulo of sin.backoffice.modulos) {
  if (modulo.kb > PRESUPUESTO.modulo) {
    excedidos.push(
      `«${modulo.archivo}» ocupa ${modulo.kb.toFixed(1)} KB comprimidos y el presupuesto por modulo son ${PRESUPUESTO.modulo}`,
    );
  }
}

/* ── Lo que le cuesta al ciudadano abrir el portal ───────────────────────── */

/* Su paquete propio, no el del back-office (#298). Si `apps/portal` volviera a
   arrastrar el catalogo de navegacion —basta una importacion del catalogo en
   cualquiera de sus archivos— esta cifra lo dice el mismo dia. */
const portal = sin.portal.arranque;
console.log(`Portal: ${portal.toFixed(1)} KB comprimidos de ${PRESUPUESTO.portal}.`);
if (portal > PRESUPUESTO.portal) {
  excedidos.push(
    `abrir el portal cuesta ${portal.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.portal}`,
  );
}

/* Y el portal no tiene modulos: son del back-office. Un trozo `.generado-` en
   su paquete quiere decir que el catalogo se le colo dentro. */
if (sin.portal.modulos.length > 0) {
  console.error(
    `\n✗ El paquete del portal lleva ${sin.portal.modulos.length} trozo(s) del catalogo de navegacion, y el ciudadano no navega modulos (ADR-0016 §3): ${sin.portal.modulos.map((m) => m.archivo).join(', ')}.\n`,
  );
  process.exit(1);
}

if (sin.backoffice.modulos.length !== 12) {
  console.error(
    `\n✗ Deberia haber un trozo por modulo —doce— y hay ${sin.backoffice.modulos.length}. Si el catalogo dejo de partirse, abrir una opcion de Catastro descarga tambien Transito.\n`,
  );
  process.exit(1);
}

if (excedidos.length > 0) {
  console.error(`\n✗ El paquete pasa de su presupuesto:\n  - ${excedidos.join('\n  - ')}`);
  console.error(
    '\n  Subir el umbral es una decision, no un tramite: se cambia en «scripts/comprobar-compilaciones.mjs» y se dice en el PR por que vale la pena.\n',
  );
  process.exit(1);
}

const mayor = sin.backoffice.modulos.reduce((a, b) => (a.kb > b.kb ? a : b));
console.log(
  `Arranque: ${sin.backoffice.arranque.toFixed(1)} KB comprimidos de ${PRESUPUESTO.arranque}. ` +
    `Doce trozos por modulo, el mayor ${mayor.kb.toFixed(1)} KB de ${PRESUPUESTO.modulo}.`,
);

/* Lo que **no** se descarga al entrar, dicho para que se vea que existe: son los
 * formularios que solo baja quien pulsa la accion que los abre. No tienen
 * presupuesto propio —no cuestan nada a quien no los usa— pero callarlos
 * dejaria la impresion de que el arranque bajo porque el codigo desaparecio. */
for (const app of APLICACIONES) {
  const diferidos = sin[app.nombre].diferidos;
  if (diferidos.length === 0) continue;
  const total = diferidos.reduce((suma, trozo) => suma + trozo.kb, 0);
  console.log(
    `[${app.nombre}] Fuera del arranque, a peticion: ${total.toFixed(1)} KB en ${diferidos.length} trozos ` +
      `(${diferidos.map((t) => t.archivo.replace(/-[^-]+\.js$/, '')).join(', ')}).`,
  );
}
