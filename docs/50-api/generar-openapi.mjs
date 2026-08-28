/* Genera docs/50-api/openapi/sgtm-v1.yaml a partir de los `endpoint` que declara
   cada pantalla del prototipo de interfaz (design/sgtm-data-*.js).

   Por que se genera y no se escribe a mano: el contrato tiene 134 operaciones y
   su fuente de verdad son las pantallas. Escribirlo a mano garantizaria que se
   desincronizara con el prototipo en la primera semana.

   Lo que este generador NO inventa: los esquemas de cuerpo y respuesta. Cada
   operacion queda con su verbo, su ruta, sus parametros y de que pantalla sale.
   El esquema de cada recurso se escribe cuando se implemente la operacion, y
   entonces esta generacion pasa a ser el punto de partida, no el destino.

   Lo que si declara, porque es lo que la interfaz manda: **los filtros de cada
   pantalla y, en las que traen tabla, el orden y la pagina.** El prototipo
   dibuja los filtros pero no dice como viajan; el contrato lo dice, con el
   mismo nombre de campo que usa el catalogo portado —una prueba del frontend
   exige que coincidan—. Filtrar, ordenar y paginar en el cliente una pagina de
   un padron de cientos de miles de filas ordena media tabla y miente, asi que
   los tres viajan al servidor.

   Uso: node docs/50-api/generar-openapi.mjs
*/

import { createContext, runInContext } from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../../', import.meta.url);
const origen = new URL('design/', raiz);
const destino = new URL('docs/50-api/openapi/sgtm-v1.yaml', raiz);

const ventana = {};
const contexto = createContext({ window: ventana, Object, Array, JSON, Math, String, Number });
for (let i = 1; i <= 5; i++) {
  runInContext(readFileSync(fileURLToPath(new URL(`sgtm-data-${i}.js`, origen)), 'utf8'), contexto);
}

const NAV = ventana.SGTM_NAV;
const PANTALLAS = ventana.SGTM_SCREENS;

/* ── Nombres de parametro ─────────────────────────────────────────────────
   Misma regla que `frontend/scripts/portar-catalogo.mjs`: `Tipo de Vía` →
   `tipoDeVia`. Esta duplicada a proposito —los dos generadores viven en arboles
   distintos y no comparten build— y una prueba del frontend exige que los dos
   produzcan el mismo nombre para el mismo filtro. Si se separan, se pone roja. */

const sinTildes = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');

function aClave(etiqueta) {
  const partes = sinTildes(etiqueta)
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return 'campo';
  const [primera, ...resto] = partes;
  const camel =
    primera.toLowerCase() + resto.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
  return /^[0-9]/.test(camel) ? `c${camel}` : camel;
}

/** Los filtros de una pantalla, con el nombre con el que viajan. */
function filtrosDe(pantalla) {
  const usadas = new Set();
  return (pantalla.filters ?? []).map((filtro) => {
    let clave = aClave(filtro.label);
    for (let n = 2; usadas.has(clave); n++) clave = `${aClave(filtro.label)}${n}`;
    usadas.add(clave);
    return { nombre: clave, etiqueta: filtro.label };
  });
}

/**
 * Paginacion y orden, para las operaciones de lectura que traen tabla.
 *
 * **Los nombres son los del backend, no los que la interfaz propuso.** Cuando
 * se escribieron aqui el backend todavia no tenia capa web; ahora la tiene
 * (`ParametrosDePaginacion` de #6) y manda ella: `ordenarPor` y no `orden`,
 * `direccion` y no `sentido`, y la pagina contada desde 0. Que la interfaz
 * proponga esta bien; que siga proponiendo cuando ya hay respuesta, no.
 */
const PAGINACION = [
  { nombre: 'pagina', ejemplo: '0', descripcion: 'Pagina que se pide, contada desde 0' },
  { nombre: 'tamano', ejemplo: '20', descripcion: 'Filas por pagina' },
  { nombre: 'ordenarPor', ejemplo: '', descripcion: 'Campo por el que se ordena, en camelCase' },
  {
    nombre: 'direccion',
    ejemplo: 'ASCENDENTE',
    descripcion: 'ASCENDENTE | DESCENDENTE',
  },
];

/**
 * Parametros que el backend tiene y la pantalla no dibuja.
 *
 * Misma regla que `PAGINACION`: cuando el backend ya existe, manda el backend.
 * La bitacora esta particionada por ejercicio y su controlador lo pide
 * obligatorio (`SesionController#auditoria`, #13); sin el, la consulta recorre
 * todas las particiones, y con el volumen que alcanza esa tabla la diferencia
 * es entre una pantalla que responde y una que hay que cancelar.
 *
 * Esta lista es corta a proposito. Un parametro aqui es una divergencia entre
 * lo que la pantalla dibuja y lo que el servicio ofrece, y cada una se anota
 * con el controlador que la impone.
 */
const DEL_BACKEND = {
  auditoria: [
    {
      nombre: 'ejercicio',
      ejemplo: '2026',
      descripcion: 'Ejercicio de trabajo. Obligatorio: es la clave de particion de la bitacora',
    },
  ],
  // `respaldo` trae tabla pero su verbo es POST —lo fija el contrato del
  // prototipo, no la pantalla—, y la paginacion solo se anade mas abajo
  // cuando el metodo es GET. `SesionController#respaldos` sigue paginando
  // igual que las lecturas: sin esto, la pantalla no podria pedir la pagina
  // siguiente de un historico que solo crece.
  respaldo: PAGINACION,
  // Las cuatro fichas responden **a una fecha**: sin ella, la que rige hoy; con
  // ella, la que regia entonces. Es lo que contesta «como estaba este predio
  // cuando se emitio el valor de 2027», que es la pregunta de una reclamacion.
  // Y `historico` trae todas las versiones: la pantalla que solo pinta la
  // vigente no tiene por que pagarlas (`FichaController`, #18).
  ...Object.fromEntries(
    ['ficha_urbana', 'ficha_economica', 'ficha_bienes', 'ficha_rural'].map((id) => [
      id,
      [
        {
          nombre: 'fecha',
          ejemplo: '2026-08-20',
          descripcion: 'Ficha vigente a esta fecha. Sin ella, la que rige hoy',
        },
        {
          nombre: 'historico',
          ejemplo: 'true',
          descripcion: 'Trae todas las versiones de la ficha, no solo la vigente',
        },
      ],
    ]),
  ),
  // El reporte responde a una fecha, igual que las cuatro fichas, y ademas
  // a un formato: sin el, JSON —lo que la pantalla dibuja—; con
  // `PDF`/`XLS`/`RTF`, el documento (`ReporteController`, #71).
  ficha_contribuyente_reporte: [
    {
      nombre: 'fecha',
      ejemplo: '2026-08-20',
      descripcion: 'Ficha vigente a esta fecha. Sin ella, la que rige hoy',
    },
    {
      nombre: 'formato',
      ejemplo: 'PDF',
      descripcion: 'PDF | XLS | RTF. Sin el, responde JSON: lo que la pantalla dibuja',
    },
  ],
  // El avance en vivo del turno de un cajero: lo que la pantalla de cierre llama
  // «Cuadrar», y que se mira ANTES de firmar el arqueo (#36, RF-087). La pantalla
  // de avance dibuja ejercicio, rango y tributo, y ninguno de los dos identifica
  // una ventanilla; sin ellos, «Cierre y arqueo de caja» no tendria de donde leer
  // sus totales sin bloquear el turno, que es lo que hace la cobranza
  // (`RecaudacionController`, #36).
  avance_recaudacion: [
    {
      nombre: 'caja',
      ejemplo: 'C-01',
      descripcion:
        'Codigo de la ventanilla. Con `cajero`, responde ademas el arqueo en vivo de su turno',
    },
    {
      nombre: 'cajero',
      ejemplo: 'jperez',
      descripcion: 'Cajero del turno. Solo tiene efecto junto con `caja`',
    },
  ],
};

/**
 * Operaciones que el backend publica ademas de la que declara la pantalla.
 *
 * Misma razon que `DEL_BACKEND`: cuando el backend ya existe, manda el
 * backend. Una pantalla del prototipo declara **un** `endpoint`, pero
 * `permisos` guarda una matriz que antes hay que poder cargar, y ese `GET` no
 * tiene pantalla propia de la que salir —no puede leerse de
 * `PANTALLAS[id].endpoint`, que ya esta ocupado por el `PUT` que guarda—.
 *
 * Corta a proposito: cada entrada es una pantalla que escribe y no puede leer
 * su propio estado sin esto. El `operationId` es distinto del `id` de la
 * pantalla porque los dos verbos comparten ruta y opcion de menu, y el
 * generador de tipos del frontend exige que cada operationId sea unico.
 *
 * `ruta` es opcional: sin ella, la operacion cuelga de la misma ruta que la
 * pantalla (el caso de `permisos`, dos verbos en una ruta); con ella, de otra
 * —`calles` lee en `/catastro/vias` y edita en `/catastro/vias/{codigo}`—.
 */
const OPERACIONES_ADICIONALES = {
  permisos: [
    {
      operationId: 'permisos_de_grupo',
      metodo: 'get',
      titulo: 'Permisos ya otorgados de un grupo',
      descripcion:
        'Los permisos que el grupo ya tiene configurados, para cargar la matriz antes' +
        ' de guardarla (PUT de la misma ruta). No trae las 134 opciones del catalogo:' +
        ' solo las que el grupo ya tiene.',
    },
  ],
  // `internamiento` declara «GET /transito/internamientos» como su endpoint —la
  // grilla del deposito—; sus dos acciones, «Registrar ingreso» y «Liberar
  // vehiculo», necesitan verbo propio (#50, RF-064).
  internamiento: [
    {
      operationId: 'registrar_internamiento',
      metodo: 'post',
      titulo: 'Registro de ingreso al deposito',
      descripcion:
        'Interna un vehiculo en el deposito municipal y emite su acta. El cuerpo lleva la' +
        ' placa, el deposito, el concepto del TUPA con que se cobrara la custodia y la' +
        ' observacion del usuario, obligatoria (RNF-052).',
    },
    {
      operationId: 'liberar_internamiento',
      metodo: 'post',
      ruta: '/api/v1/transito/internamientos/{placa}/liberacion',
      titulo: 'Liberacion del vehiculo internado',
      descripcion:
        'Entrega el vehiculo a quien lo retira y emite el acta de liberacion. Exige el' +
        ' recibo con que se pago la custodia: el backend lo acredita contra `tesoreria`' +
        ' por su API publica, y sin esa acreditacion el vehiculo no sale. La casilla' +
        ' «Custodia cancelada» de la pantalla no basta: la marca quien entrega el vehiculo.',
    },
  ],
  // `transito_rg_ordinaria` declara «POST /transito/resoluciones/ordinaria»
  // —dictarla—; notificarla necesita ruta propia. Infracciones administrativas
  // SI tiene su pantalla de notificacion en el manual; transito no, y sin ella
  // la sancionadora no se puede dictar nunca porque su plazo se cuenta desde
  // que la ordinaria surte efecto (#50, RF-074).
  transito_rg_ordinaria: [
    {
      operationId: 'notificar_resolucion_transito',
      metodo: 'post',
      ruta: '/api/v1/transito/resoluciones/{numero}/notificacion',
      titulo: 'Notificacion de resolucion de gerencia de transito',
      descripcion:
        'Cedula de notificacion de la resolucion ordinaria o sancionadora de transito, con' +
        ' su acuse. Es de donde sale el derecho a la sancionadora: la diligencia que surte' +
        ' efecto sobre la ordinaria fija, con el plazo parametrizado del conjunto sellado,' +
        ' el dia desde el que se puede sancionar.',
    },
  ],
  // `calles` declara «GET /catastro/vias» como su endpoint —la lectura del
  // catalogo vial—; el alta y la edicion que pide su pantalla de mantenimiento
  // (RF-008, #290) necesitan un verbo aparte.
  calles: [
    {
      operationId: 'registrar_via',
      metodo: 'post',
      titulo: 'Alta de vía',
      descripcion:
        'Da de alta una vía del catálogo vial (RF-008). El cuerpo lleva tipo, código,' +
        ' nombre y la observación del usuario, obligatoria (RNF-052).',
    },
    {
      operationId: 'editar_via',
      metodo: 'put',
      ruta: '/api/v1/catastro/vias/{codigo}',
      titulo: 'Edición de vía',
      descripcion:
        'Modifica una vía existente o la da de baja (activa=false). No se borra: la baja' +
        ' es la misma fila con otro estado (RNF-051). El código de la ruta identifica la' +
        ' vía y no cambia.',
    },
  ],
  // `sectores` declara «GET /catastro/sectores» como su endpoint —la lectura del
  // catálogo territorial—; el alta y la edición del sector, y el alta de una
  // manzana dentro de él, necesitan sus propios verbos (#290).
  sectores: [
    {
      operationId: 'registrar_sector',
      metodo: 'post',
      titulo: 'Alta de sector',
      descripcion:
        'Da de alta un sector del catastro. El cuerpo lleva código, nombre, la zona' +
        ' —opcional— y la observación del usuario, obligatoria (RNF-052). Un sector nace' +
        ' activo: darlo de baja es el PUT.',
    },
    {
      operationId: 'editar_sector',
      metodo: 'put',
      ruta: '/api/v1/catastro/sectores/{codigo}',
      titulo: 'Edición de sector',
      descripcion:
        'Modifica un sector existente o lo da de baja (activo=false). No se borra: la baja' +
        ' es la misma fila con otro estado (RNF-051), y tiene que serlo porque su código es' +
        ' un tramo del código catastral de sus predios. El código de la ruta identifica el' +
        ' sector y no cambia.',
    },
    {
      operationId: 'registrar_manzana',
      metodo: 'post',
      ruta: '/api/v1/catastro/sectores/{codigo}/manzanas',
      titulo: 'Alta de manzana',
      descripcion:
        'Da de alta una manzana dentro del sector que identifica el código de la ruta. No hay' +
        ' verbo para editarla: el código de una manzana es un tramo del código catastral de' +
        ' sus predios, así que cambiarlo desalinearía el de todos ellos.',
    },
  ],
  // Las cuatro pantallas de ficha declaran «GET /catastro/fichas/…/{codigo}»
  // como su endpoint —la lectura de la ficha de un predio—; darla de alta
  // necesita su propio verbo, y sin parámetro de ruta: el predio todavía no
  // existe (#290).
  //
  // **El alta crea el predio en el mismo acto si no existe.** No es una
  // comodidad: `ficha_catastral.predio_id` es NOT NULL, así que sin el predio
  // no hay ficha; y hacerlo en dos peticiones dejaría predios sin ficha cada
  // vez que la segunda falle.
  ...Object.fromEntries(
    [
      ['ficha_urbana', 'registrar_ficha_urbana', 'urbana', 'urbana individual', 'RF-001'],
      ['ficha_economica', 'registrar_ficha_economica', 'economica', 'económica', 'RF-002'],
      ['ficha_bienes', 'registrar_ficha_bienes', 'bienes-comunes', 'de bienes comunes', 'RF-003'],
      ['ficha_rural', 'registrar_ficha_rural', 'rural', 'rural', 'RF-004'],
    ].map(([id, operationId, tramo, comoSeLlama, requisito]) => [
      id,
      [
        {
          operationId,
          metodo: 'post',
          ruta: `/api/v1/catastro/fichas/${tramo}`,
          titulo: `Alta de ficha ${comoSeLlama}`,
          descripcion:
            `Inscribe la primera versión de la ficha ${comoSeLlama} (${requisito}) de un` +
            ' predio, y da de alta' +
            ' el predio en el mismo acto si todavía no existe. El cuerpo lleva el código de' +
            ' referencia catastral, la ubicación del predio, los datos de la ficha —áreas y' +
            ' categorías, ningún importe—, su titularidad inicial si ya se conoce, y la' +
            ' observación del usuario, obligatoria (RNF-052). Si el predio ya tiene ficha de' +
            ' ese tipo, es 409: lo que toca entonces es actualizarla.',
        },
      ],
    ]),
  ),
  // «Actualización del Catastro» es una sola opción del manual y ya publica el
  // PUT de la ficha urbana como su endpoint. Los otros tres tipos versionan
  // igual y bajo la misma opción —el tipo de ficha no cambia quién puede
  // actualizarla—, pero cada uno se identifica como lo hace su lectura (#290).
  actualizacion_catastro: [
    {
      operationId: 'actualizar_ficha_economica',
      metodo: 'put',
      ruta: '/api/v1/catastro/fichas/economica/{codRefCatastral}/actualizacion',
      titulo: 'Actualización de la ficha económica',
      descripcion:
        'Crea la versión siguiente de la ficha económica y cierra la anterior, que queda entera.' +
        ' Lo que el cuerpo no manda, no cambia: una lista ausente copia la de la versión' +
        ' vigente y una lista presente aunque vacía la reemplaza.',
    },
    {
      operationId: 'actualizar_ficha_bienes',
      metodo: 'put',
      ruta: '/api/v1/catastro/fichas/bienes-comunes/{codEdificacion}/actualizacion',
      titulo: 'Actualización de la ficha de bienes comunes',
      descripcion:
        'Crea la versión siguiente de la ficha de bienes comunes y cierra la anterior. Las áreas' +
        ' comunes y su reparto se copian si el cuerpo no los declara; declararlos los' +
        ' reemplaza.',
    },
    {
      operationId: 'actualizar_ficha_rural',
      metodo: 'put',
      ruta: '/api/v1/catastro/fichas/rural/{codUnidad}/actualizacion',
      titulo: 'Actualización de la ficha rural',
      descripcion:
        'Crea la versión siguiente de la ficha rural y cierra la anterior. Los grupos de tierra' +
        ' van en hectáreas —el arancel rural se publica por hectárea— y se copian si el cuerpo' +
        ' no los declara.',
    },
  ],
  // «Resultados y determinaciones» declara «GET /fiscalizacion/resultados» como
  // su endpoint —la grilla—; emitir la liquidación de un acta y reliquidarla
  // (RF-053, #49) necesitan sus propios verbos. Sin ellos la pantalla lista un
  // resultado que nada puede producir.
  fisc_resultados: [
    {
      operationId: 'liquidar_fiscalizacion',
      metodo: 'post',
      ruta: '/api/v1/fiscalizacion/liquidaciones',
      titulo: 'Liquidación de un acta de fiscalización',
      descripcion:
        'Emite la liquidación de un acta: el contraste hallado/declarado, una línea por unidad y' +
        ' ejercicio del periodo fiscalizado. Cada línea fija el conjunto de parámetros SELLADO de' +
        ' su ejercicio, de modo que cambiar los parámetros de hoy no altera una liquidación ya' +
        ' emitida. Sin importes: los liquidados y las multas esperan a D-02a (#198). El cuerpo' +
        ' lleva la observación del usuario, obligatoria (RNF-052).',
    },
    {
      operationId: 'reliquidar_fiscalizacion',
      metodo: 'post',
      ruta: '/api/v1/fiscalizacion/liquidaciones/{numero}/reliquidaciones',
      titulo: 'Reliquidación',
      descripcion:
        'Corrige una liquidación emitiendo OTRA versión que la referencia. La anterior no cambia' +
        ' ni una columna, las dos quedan, y la respuesta explica qué cambió entre ellas. Las' +
        ' líneas heredan el conjunto sellado de la versión anterior: una reliquidación corrige el' +
        ' contraste, no el marco normativo.',
    },
    // Y transferir el resultado al padrón (#52, RF-054), que es la acción de la
    // misma pantalla y la frontera delicada del sistema: el único camino por el
    // que un dato de fiscalización pasa a ser el dato oficial.
    {
      operationId: 'transferir_a_rentas',
      metodo: 'post',
      ruta: '/api/v1/fiscalizacion/transferencias',
      titulo: 'Transferencia a rentas del resultado fiscalizado',
      descripcion:
        'Inscribe lo hallado en el padrón como versión NUEVA de la ficha catastral —con origen' +
        ' FISCALIZACION, el documento que la sustenta y la observación del usuario—, asienta los' +
        ' cargos de la diferencia en la cuenta corriente y emite la resolución de determinación.' +
        ' Los tres pasos van en una transacción: ficha nueva, asientos y resolución, o nada. La' +
        ' versión anterior queda intacta, así que el padrón anterior se reconstruye pidiendo la' +
        ' ficha vigente a una fecha anterior. Sin sustento documental no se transfiere, y' +
        ' transferir dos veces la misma liquidación se rechaza.',
    },
  ],
  // «Histórico de fiscalización predial» declara su GET; mover la liquidación
  // por sus estados —ABIERTA, EN PROCESO, LIQUIDADA, NOTIFICADA, ANULADA, que
  // son los de su propio desplegable— necesita un verbo aparte (#49, RF-056).
  fisc_historico: [
    {
      operationId: 'estado_de_liquidacion',
      metodo: 'patch',
      ruta: '/api/v1/fiscalizacion/liquidaciones/{numero}/estados',
      titulo: 'Estado de una liquidación de fiscalización',
      descripcion:
        'Mueve la liquidación de estado conservando el historial. No actualiza ninguna fila:' +
        ' agrega un movimiento, y el estado se DERIVA de él. Una liquidación anulada no vuelve:' +
        ' corregirla es reliquidar.',
    },
  ],
  // `licencia_funcionamiento` declara «GET /licencias/funcionamiento» como su
  // endpoint —la grilla—; emitir la licencia necesita su propio verbo (#44,
  // RF-110). No hay PUT ni PATCH: una licencia es un acto administrativo que el
  // titular cuelga en su establecimiento, y no se corrige —`licencia_funcionamiento`
  // ni siquiera admite UPDATE desde V37—. Lo que le pasa son las otras dos
  // opciones, que ya tienen su ruta: `/cancelacion` y `/duplicado`.
  licencia_funcionamiento: [
    {
      operationId: 'emitir_licencia',
      metodo: 'post',
      titulo: 'Emisión de licencia de funcionamiento',
      descripcion:
        'Emite una licencia de funcionamiento con sus giros CIIU y su papel (RF-110). El cuerpo' +
        ' lleva el titular, el establecimiento, los giros con su actividad principal, el' +
        ' número del recibo de caja de tasas del derecho de trámite y la observación del' +
        ' usuario, obligatoria (RNF-052). Sin un recibo válido —de caja de tasas, no anulado,' +
        ' del titular y por el concepto del TUPA que corresponde— no se emite. El número de la' +
        ' licencia lo pone el sistema desde su correlativo: no viene en el cuerpo.',
    },
  ],
  // `ciiu` declara «GET /licencias/ciiu» como su endpoint —el catálogo—; RF-112
  // exige que sea extensible por el usuario, y extenderlo necesita su verbo.
  ciiu: [
    {
      operationId: 'registrar_ciiu',
      metodo: 'post',
      titulo: 'Alta de giro CIIU',
      descripcion:
        'Agrega un giro al catálogo CIIU de la municipalidad (RF-112). El cuerpo lleva el' +
        ' código, la descripción, la sección, el nivel de riesgo de la ITSE si ya está' +
        ' clasificado, la zonificación compatible y la observación del usuario, obligatoria' +
        ' (RNF-052). El giro nace activo y marcado como extensión local: la clasificación' +
        ' oficial se carga por otro camino.',
    },
  ],
};

/* ── Recoger las operaciones ──────────────────────────────────────────── */

const operaciones = [];
for (const grupo of NAV) {
  for (const [id, etiqueta] of grupo.items) {
    const pantalla = PANTALLAS[id];
    if (!pantalla || !pantalla.endpoint) continue;

    const [metodo, rutaCompleta] = pantalla.endpoint.split(/\s+/);
    const [ruta, consulta] = rutaCompleta.split('?');

    const parametrosDeRuta = [...ruta.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

    operaciones.push({
      id,
      operationId: id,
      etiqueta,
      modulo: grupo.label,
      metodo: metodo.toLowerCase(),
      ruta,
      titulo: pantalla.title || etiqueta,
      descripcion: pantalla.desc || '',
      // Parametros de ruta: {codigo}, {numero}, …
      parametrosDeRuta,
      // Parametros de consulta del ejemplo del prototipo, mas los filtros que
      // dibuja la pantalla y —si trae tabla— la paginacion y el orden.
      parametrosDeConsulta: reunir(parametrosDeRuta, [
        ...(DEL_BACKEND[id] ?? []),
        ...(consulta
          ? consulta.split('&').map((p) => {
              const [nombre, ejemplo] = p.split('=');
              return { nombre, ejemplo: (ejemplo || '').replace(/[{}]/g, '') };
            })
          : []),
        ...filtrosDe(pantalla).map((filtro) => ({
          nombre: filtro.nombre,
          ejemplo: '',
          descripcion: `Filtro «${filtro.etiqueta}» de la pantalla`,
        })),
        ...(pantalla.table && metodo.toLowerCase() === 'get' ? PAGINACION : []),
      ]),
    });

    for (const extra of OPERACIONES_ADICIONALES[id] ?? []) {
      // `ruta` conserva el prefijo /api/v1 igual que la de la pantalla; el
      // serializador lo quita para todas por igual mas abajo.
      const rutaExtra = extra.ruta ?? ruta;
      const parametrosDeRutaExtra = [...rutaExtra.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      operaciones.push({
        id,
        operationId: extra.operationId,
        etiqueta,
        modulo: grupo.label,
        metodo: extra.metodo,
        ruta: rutaExtra,
        titulo: extra.titulo,
        descripcion: extra.descripcion,
        parametrosDeRuta: parametrosDeRutaExtra,
        parametrosDeConsulta: reunir(parametrosDeRutaExtra, []),
      });
    }
  }
}

/**
 * Sin repetidos: un parametro declarado dos veces perderia uno al tiparlo.
 *
 * Y sin los que ya van en la ruta: cuando el filtro se llama igual que el
 * parametro del camino —«Código de edificación» en una pantalla que abre
 * `/bienes-comunes/{codEdificacion}`— no son dos valores, es el mismo, y el que
 * manda es el de la ruta.
 */
function reunir(deLaRuta, parametros) {
  const porNombre = new Map();
  for (const parametro of parametros) {
    if (deLaRuta.includes(parametro.nombre)) continue;
    if (!porNombre.has(parametro.nombre)) porNombre.set(parametro.nombre, parametro);
  }
  return [...porNombre.values()];
}

/* ── Serializar a YAML, sin dependencias ──────────────────────────────── */

const comillas = (texto) => `"${String(texto).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const unaLinea = (texto) => String(texto).replace(/\s+/g, ' ').trim();

const porRuta = new Map();
for (const op of operaciones) {
  if (!porRuta.has(op.ruta)) porRuta.set(op.ruta, []);
  porRuta.get(op.ruta).push(op);
}

const lineas = [];
lineas.push('# ARCHIVO GENERADO — no editar a mano.');
lineas.push('# Origen: los `endpoint` de design/sgtm-data-{1..5}.js.');
lineas.push('# Regenerar con: node docs/50-api/generar-openapi.mjs');
lineas.push('#');
lineas.push('# Es el contrato PROPUESTO: define verbo, ruta y parametros de las 134');
lineas.push('# operaciones que la interfaz espera. Los esquemas de cuerpo y respuesta se');
lineas.push('# escriben cuando se implementa cada operacion.');
lineas.push('openapi: 3.1.0');
lineas.push('info:');
lineas.push('  title: SGTM — Sistema de Gestion Tributaria Municipal');
lineas.push('  version: 1.0.0-borrador');
lineas.push('  description: |');
lineas.push('    Contrato de la API del SGTM, derivado de las pantallas del prototipo de');
lineas.push('    interfaz. Una operacion por opcion del menu.');
lineas.push('');
lineas.push('    El identificador de municipalidad NO viaja en ninguna ruta, parametro ni');
lineas.push('    cuerpo: sale del claim `municipalidad_id` del token validado (ADR-0005).');
lineas.push('    Una peticion que lo mande por otro camino no lo consigue.');
lineas.push('');
lineas.push('    Los importes son cadenas decimales, nunca numeros de coma flotante');
lineas.push('    (RNF-055), y toda cifra de deuda indica a que fecha esta actualizada');
lineas.push('    (RNF-075).');
lineas.push('servers:');
lineas.push('  - url: /api/v1');
lineas.push('    description: Camino base');
lineas.push('security:');
lineas.push('  - tokenDeAcceso: []');
lineas.push('tags:');
for (const grupo of NAV) {
  lineas.push(`  - name: ${comillas(grupo.label)}`);
  lineas.push(`    description: ${comillas(`${grupo.items.length} opciones del manual`)}`);
}
lineas.push('paths:');

for (const [ruta, ops] of porRuta) {
  // El servidor ya sirve bajo /api/v1: la ruta del contrato es la relativa.
  const rutaRelativa = ruta.replace(/^\/api\/v1/, '') || '/';
  lineas.push(`  ${comillas(rutaRelativa)}:`);
  for (const op of ops) {
    lineas.push(`    ${op.metodo}:`);
    lineas.push(`      operationId: ${op.operationId}`);
    lineas.push(`      summary: ${comillas(op.titulo)}`);
    if (op.descripcion) {
      lineas.push(`      description: ${comillas(unaLinea(op.descripcion))}`);
    }
    lineas.push(`      tags: [${comillas(op.modulo)}]`);
    if (op.parametrosDeRuta.length || op.parametrosDeConsulta.length) {
      lineas.push('      parameters:');
      for (const nombre of op.parametrosDeRuta) {
        lineas.push(`        - name: ${nombre}`);
        lineas.push('          in: path');
        lineas.push('          required: true');
        lineas.push('          schema: { type: string }');
      }
      for (const p of op.parametrosDeConsulta) {
        lineas.push(`        - name: ${p.nombre}`);
        lineas.push('          in: query');
        lineas.push('          required: false');
        if (p.descripcion) lineas.push(`          description: ${comillas(p.descripcion)}`);
        lineas.push('          schema: { type: string }');
        if (p.ejemplo) lineas.push(`          example: ${comillas(p.ejemplo)}`);
      }
    }
    if (op.metodo !== 'get') {
      lineas.push('      requestBody:');
      lineas.push('        required: true');
      lineas.push('        content:');
      lineas.push('          application/json:');
      lineas.push('            schema: { type: object }');
    }
    lineas.push('      responses:');
    lineas.push(`        ${op.metodo === 'post' ? '201' : '200'}:`);
    lineas.push('          description: Operacion realizada');
    lineas.push('          content:');
    lineas.push('            application/json:');
    lineas.push('              schema: { type: object }');
    lineas.push('        "403":');
    lineas.push('          $ref: "#/components/responses/SinMunicipalidad"');
    lineas.push('        "422":');
    lineas.push('          $ref: "#/components/responses/ErrorDeValidacion"');
  }
}

lineas.push('components:');
lineas.push('  securitySchemes:');
lineas.push('    tokenDeAcceso:');
lineas.push('      type: http');
lineas.push('      scheme: bearer');
lineas.push('      bearerFormat: JWT');
lineas.push('      description: |');
lineas.push('        Token OIDC validado. Debe traer el claim `municipalidad_id`; sin el, la');
lineas.push('        peticion recibe 403 y no llega al controlador (ADR-0005, RNF-032).');
lineas.push('  schemas:');
lineas.push('    Importe:');
lineas.push('      type: string');
lineas.push('      pattern: "^-?[0-9]+\\\\.[0-9]{2}$"');
lineas.push('      description: |');
lineas.push('        Decimal exacto como cadena. Nunca numero JSON: el `number` de');
lineas.push('        JavaScript es binario de doble precision y pierde centimos (RNF-055).');
lineas.push('      example: "1234.50"');
lineas.push('    Error:');
lineas.push('      type: object');
lineas.push('      required: [codigo, mensaje]');
lineas.push('      properties:');
lineas.push('        codigo: { type: string, example: "DEUDA_YA_CANCELADA" }');
lineas.push('        mensaje: { type: string, description: "En castellano; se muestra al usuario" }');
lineas.push('        detalles: { type: array, items: { type: string } }');
lineas.push('  responses:');
lineas.push('    SinMunicipalidad:');
lineas.push('      description: |');
lineas.push('        El token no identifica una municipalidad. No hay valor por omision ni');
lineas.push('        modo sin municipalidad.');
lineas.push('      content:');
lineas.push('        application/json:');
lineas.push('          schema: { $ref: "#/components/schemas/Error" }');
lineas.push('    ErrorDeValidacion:');
lineas.push('      description: La peticion no cumple una regla de negocio');
lineas.push('      content:');
lineas.push('        application/json:');
lineas.push('          schema: { $ref: "#/components/schemas/Error" }');
lineas.push('');

writeFileSync(fileURLToPath(destino), lineas.join('\n'), 'utf8');
console.log(`OpenAPI generado: ${operaciones.length} operaciones en ${porRuta.size} rutas`);
