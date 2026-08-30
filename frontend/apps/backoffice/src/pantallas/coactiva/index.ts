import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  esObjeto,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Coactiva, conectado entero: **las doce opciones del modulo** (#76, #426).
 *
 * Las cuatro lecturas llegaron con #76 —`coactiva_expedientes` (#40),
 * `proceso_coactivo` (#41), `coactiva_consulta_deudas` y
 * `coactiva_deudas_beneficio` (#42)— y las **ocho escrituras** con #426. Ninguna
 * cifra se compone (RNF-083): lo que el recurso no publica sale con
 * {@link SIN_DATO}.
 *
 * <h2>Que las tenia paradas, y con que se solto cada una</h2>
 *
 * Las doce tenian `Controller` en `sgtm-coactiva` desde #40–#42: **no faltaba
 * backend**. Lo que faltaba eran tres cosas distintas, y por eso hicieron falta
 * tres issues:
 *
 * 1. **La primaria no era la accion que guarda** (#421). FRO-03 §5 fija la
 *    primaria en la ultima accion; el prototipo capturo estas pantallas como
 *    barras de herramientas de escritorio —Nuevo, Modificar, Guardar, Imprimir…—
 *    y en **seis de las ocho** la ultima no es la que guarda. Declarar la
 *    escritura sin resolver eso encendia el boton equivocado: pulsar «Limpiar
 *    campos» en «Importacion de valores» habria importado valores a coactiva
 *    —irreversible, RF-100— cuando quien atiende solo queria borrar el
 *    formulario. `LA_QUE_ESCRIBE` (`pantallas/actos.ts`) lo dice por el **rotulo**
 *    del catalogo, opcion por opcion.
 * 2. **Un campo que el backend exige y ninguna seccion dibuja** (#422). Son
 *    cinco, todos en `coactiva/composicion.ts` y cada uno con su etiqueta propia
 *    (RNF-080): el acto que se dicta, el que se diligencia, el motivo del cambio
 *    de direccion, el expediente que se fracciona y su cuota inicial. Y dos que
 *    **no** hicieron falta porque el filtro ya los preguntaba —el contribuyente
 *    de la importacion y el expediente de las costas—: esos pasan del filtro al
 *    cuerpo con `delFiltro`, el mecanismo de `cierre_caja` (#423).
 * 3. **Filas que marcar** (#332, y aqui backend nuevo). «Fraccionamiento
 *    coactivo» es la que el issue titula «el caso que no se resuelve con los
 *    mecanismos»: su cuerpo pide `obligaciones[]` con `tributo`, `ejercicio` y
 *    `predioId`/`vehiculoId` **fila a fila**, y ninguna lectura del modulo tenia
 *    esa granularidad. La trae `GET /coactiva/expedientes/{numero}/deuda`, que
 *    sale de la **misma** composicion que la deuda que imprime la REC-2 —si
 *    divergieran, la grilla y el papel dirian cifras distintas de la misma
 *    carpeta—. «Impresion de REC» tenia el mismo hueco y se resolvio sin backend:
 *    su tabla es la de expedientes, leida bajo su clave.
 *
 * <h2>Lo que se queda fuera, y por que</h2>
 *
 * **«Caratula» y «REC 2», en `rec_impresion`.** No son dos formatos del mismo
 * papel: son dos cosas distintas y ninguna se puede mandar hoy.
 *
 * - **«Caratula» no tiene acto propio.** `ActoCoactivoController.recDe` acepta
 *   la palabra y la mapea a `REC1` —en `TipoDeActoCoactivo` no existe ninguna
 *   constante para ella—, asi que un boton con ese rotulo **dictaria la REC-1**:
 *   `RegistrarActoCoactivo.dictar` asienta el acto, emite su documento y mueve el
 *   expediente a `REC1_EMITIDA`, y si ya habia una responde 409. Es el mismo
 *   defecto de clase que #421 nombra —un boton que hace algo que su rotulo no
 *   promete—, y por eso la accion se queda secundaria y apagada.
 * - **«REC 2» exige `medida`**, la forma del embargo del art. 33 —retencion,
 *   inscripcion, deposito, intervencion—, y ninguna seccion de esta pantalla la
 *   dibuja: el desplegable esta en «Proceso coactivo», que es otra opcion.
 *   Mandarla sin ella es un 422 despues de confirmar.
 *
 * **«Expedientes libres» y «Rechazar recaudo»** (`importacion_valores`) no tienen
 * ninguna operacion en el contrato. **«Nuevo», «Modificar», «Quitar» y
 * «Deshacer»** no hacen nada aqui, y no por falta de conexion: el historial de un
 * expediente no se sobrescribe (regla 4) y `expediente_coactivo` no admite
 * `UPDATE` desde V33.
 *
 * <h2>La puerta que sigue faltando, y es de navegacion</h2>
 *
 * Tres de las ocho —«Historial del expediente», «Registro de actos coactivos» y
 * «Cambiar direccion referencial»— se abren **por el numero del expediente en la
 * direccion**, porque asi lo declara su ruta. Desde «Proceso coactivo» se llega
 * al historial con `composicion.acto`; a las otras dos, hoy solo pegando el
 * enlace. `ComposicionDeOpcion.acto` admite **un** destino por opcion, y aqui
 * harian falta tres: ampliarlo es trabajo de la superficie del modulo (FRO-05),
 * no de la conexion.
 */

/**
 * `EstadoDelExpediente` (V33): los seis codigos del manual mas `INICIADO`,
 * con el mismo tono que ya usan `estados.ts`/`estadoDeValor` — el texto es
 * siempre el nombre literal que publica el backend, nunca una etiqueta
 * inventada (FRO-02 §2.1: un estado no se comunica solo por color).
 */
const TONO_DEL_ESTADO_COACTIVO: Readonly<Record<string, TonoDeCelda>> = {
  INICIADO: 'warn',
  'REC 01 EMITIDO': 'warn',
  'REC 01 NOTIFICADA': 'warn',
  'REC 02 EMITIDA': 'warn',
  'MEDIDA CAUTELAR': 'bad',
  SUSPENDIDO: 'warn',
  CONCLUIDO: 'ok',
};

function estadoDeExpediente(cruda: unknown): Celda {
  const valor = texto(cruda);
  return valor === SIN_DATO
    ? { texto: SIN_DATO }
    : { texto: valor, tono: TONO_DEL_ESTADO_COACTIVO[valor] };
}

/**
 * Expedientes coactivos (`ExpedienteResource`, #40, RF-100).
 *
 * **«Medida cautelar» sale con `SIN_DATO`**: el recurso no la publica en la
 * grilla —es del acto que la trabo, no del expediente, y esta lectura no trae
 * actuaciones (`GET /coactiva/expedientes` sin `nroDeExpediente` no las pide:
 * «una pagina de veinte no puede costar veinte lecturas de detalle»,
 * `ExpedienteController.listar`)—. **«Contribuyente» tampoco es el nombre**:
 * `ExpedienteResource` solo publica `codContribuyente`, y ese es lo que sale
 * en la columna — un codigo, no la razon social que dibuja el prototipo.
 *
 * Los cuatro totales del catalogo —«Deuda en coactiva», «Costas y gastos»,
 * «Retenido», «Total exigible»— no los publica esta lectura por fila: sumarlos
 * aqui seria RNF-083. Salen con `SIN_DATO`.
 */
const coactiva_expedientes = definirConexion({
  operacion: 'coactiva_expedientes',
  parametros: ({ busqueda }) => parametrosDeBusqueda('coactiva_expedientes', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los expedientes coactivos'),
  adaptar: (paginado) => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (expediente): readonly Celda[] => [
        { texto: texto(expediente['numero']) },
        { texto: texto(expediente['codContribuyente']) },
        { texto: texto(expediente['valores']) },
        { texto: texto(expediente['deudaMateriaDeCobranza']) },
        { texto: texto(expediente['costas']) },
        { texto: SIN_DATO },
        estadoDeExpediente(expediente['estado']),
      ],
      'expedientes',
    ),
    totales: [
      { label: 'Deuda en coactiva', value: SIN_DATO },
      { label: 'Costas y gastos', value: SIN_DATO },
      { label: 'Retenido', value: SIN_DATO },
      { label: 'Total exigible', value: SIN_DATO },
    ],
  }),
});

/**
 * El seguimiento de un expediente (`ProcesoResource`, #41, RF-101): se abre
 * por su `numero`, en la ruta, igual que una ficha catastral por su codigo.
 *
 * Solo se conectan los `campos` de «Datos Generales»: la tabla «Expedientes del
 * contribuyente» —una busqueda por `codContribuyente` que este `GET` no
 * ofrece, esa la sirve `coactiva_expedientes`— y las pestañas «Proceso
 * Coactivo»/«Detalle Valores» —que piden `actuaciones`, y el proxy no las
 * simula (`packages/api-mock/src/recursos.ts`)— se quedan con lo que dibuje
 * el catalogo, sin datos de verdad detras todavia.
 */
const proceso_coactivo = definirConexion({
  operacion: 'proceso_coactivo',
  parametros: ({ ruta, busqueda }) => ({
    numero: ruta['codigo'] ?? '',
    ...parametrosDeBusqueda('proceso_coactivo', ruta['codigo'], busqueda),
  }),
  leer: (cuerpo) => {
    const proceso = leerObjeto(cuerpo, 'el proceso coactivo');
    const expediente = proceso['expediente'];
    if (!esObjeto(expediente)) {
      throw new Error('La respuesta del proceso coactivo no trae el expediente.');
    }
    return expediente;
  },
  adaptar: (expediente) => ({
    // `deudaAlDia` es a que fecha estan las cinco cifras de deuda de la
    // pestaña «Datos Generales» (regla 9, RNF-075): la misma que `proyectadaAl`.
    fechaCalculo:
      texto(expediente['deudaAlDia']) === SIN_DATO ? hoy() : texto(expediente['deudaAlDia']),
    campos: {
      numero: texto(expediente['numero']),
      ano: texto(expediente['ejercicio']),
      // `ExpedienteResource` no publica el expediente anterior.
      expAnterior: SIN_DATO,
      asunto: texto(expediente['asunto']),
      direccionReferencialDelContribuyente: texto(expediente['direccionReferencial']),
      // Tampoco publica una observacion general del expediente: la observacion
      // vive por movimiento, dentro de `historial` (`MovimientoResource`).
      observaciones: SIN_DATO,
      fechaDeCreacion: texto(expediente['fechaDeApertura']),
      auxiliar: texto(expediente['auxiliar']),
      ejecutor: texto(expediente['ejecutor']),
      insolutoS: texto(expediente['insoluto']),
      reajusteS: texto(expediente['reajuste']),
      interesS: texto(expediente['interes']),
      gastosS: texto(expediente['gastos']),
      totalS: texto(expediente['totalExigible']),
      proyectadaAl: texto(expediente['deudaAlDia']),
    },
  }),
});

/**
 * Deuda en cobranza coactiva (`DeudaCoactivaResource`, #42, RF-107): la base
 * comun de `coactiva_consulta_deudas` y `coactiva_deudas_beneficio`.
 */
function tributosDe(cruda: unknown): string {
  if (!Array.isArray(cruda)) return SIN_DATO;
  const nombres = cruda.filter((t): t is string => typeof t === 'string' && t !== '');
  return nombres.length === 0 ? SIN_DATO : nombres.join(', ');
}

/**
 * Consulta de deudas en coactiva (`coactiva_consulta_deudas`, #42, RF-107).
 */
const coactiva_consulta_deudas = definirConexion({
  operacion: 'coactiva_consulta_deudas',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('coactiva_consulta_deudas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda en cobranza coactiva'),
  adaptar: (paginado) => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (deuda): readonly Celda[] => [
        { texto: texto(deuda['expediente']) },
        { texto: texto(deuda['ano']) },
        { texto: texto(deuda['contribuyente']) },
        { texto: tributosDe(deuda['tributos']) },
        { texto: texto(deuda['deudaS']) },
        { texto: texto(deuda['costasS']) },
        { texto: ultimaActuacionDe(deuda['ultimaActuacion']) },
        estadoDeExpediente(deuda['estado']),
      ],
      'deudas',
    ),
  }),
});

function ultimaActuacionDe(cruda: unknown): string {
  if (!esObjeto(cruda)) return SIN_DATO;
  return texto(cruda['acto']);
}

/** La fecha de la primera fila, o hoy si no hay ninguna: es la `aLaFecha` que trae cada fila. */
function fechaDeLaPrimera(contenido: readonly unknown[]): string {
  const [primera] = contenido;
  if (!esObjeto(primera)) return hoy();
  const fecha = texto(primera['aLaFecha']);
  return fecha === SIN_DATO ? hoy() : fecha;
}

/**
 * Deuda acogible a un beneficio, en coactiva (`coactiva_deudas_beneficio`, #42, RF-107).
 *
 * **«Insoluto S/» e «Interés S/» salen con `SIN_DATO`**: `DeudaCoactivaResource`
 * no desglosa la deuda materia de cobranza en esas dos partes, solo publica el
 * total. Y **«Con beneficio S/» tambien**, y no por falta de dato: el propio
 * recurso lo deja fuera a proposito —el efecto de un beneficio sobre el
 * importe es D-02b (#191)— y una cifra rebajada aqui se imprimiria y se
 * entregaria en ventanilla.
 */
const coactiva_deudas_beneficio = definirConexion({
  operacion: 'coactiva_deudas_beneficio',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('coactiva_deudas_beneficio', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda acogible en coactiva'),
  adaptar: (paginado) => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (deuda): readonly Celda[] => [
        { texto: texto(deuda['expediente']) },
        { texto: texto(deuda['ano']) },
        { texto: tributosDe(deuda['tributos']) },
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: texto(deuda['costasS']) },
        { texto: texto(deuda['totalS']) },
        { texto: SIN_DATO },
      ],
      'deudas',
    ),
  }),
});

/* ── Las tres lecturas que dan filas a una escritura (#426) ────────────── */

/**
 * Los expedientes sobre los que se emite la REC (`rec_impresion`, #41, RF-101).
 *
 * **Es la misma lectura que dibuja la grilla de «Expedientes coactivos»**, leida
 * bajo la clave de otra opcion — el patron de `baja_deuda`, que lee
 * `consulta_deuda` para poder elegir las cuotas que da de baja. Sin ella la
 * tabla de esta pantalla no tenia ninguna fila que marcar: su operacion es un
 * `POST`, y una operacion que escribe no se pide al abrir la pantalla.
 *
 * **La primera celda va vacia a proposito**: es la columna «Seleccione», y la
 * dibuja `TablaDePantalla` cuando la opcion declara seleccion
 * (`coactiva/composicion.ts`). Con seis celdas en vez de siete, cada dato caeria
 * una columna a la izquierda.
 *
 * **«Nombre» sale con `SIN_DATO`**, y no es un descuido: `ExpedienteResource`
 * publica `codContribuyente` y no la razon social —el nombre vive en
 * `ResumenDeContribuyente`, que `ExpedienteController` resuelve aparte y no
 * expone en esta grilla—. Componerlo aqui seria inventarlo.
 */
const rec_impresion = definirConexion({
  operacion: 'coactiva_expedientes',
  /* **El «Contribuyente» del filtro es el `codContribuyente` de la lectura.**
     Los dos vocabularios se llaman distinto y `parametrosDeBusqueda` filtra por
     el nombre que el contrato declara, asi que sin traducirlo el filtro se
     quedaba dibujado y **sin filtrar nada**, que es lo que #397 condeno. Los
     otros dos —«Tipo de deuda» y «Año»— no tienen a donde ir y se bloquean con
     su motivo (`coactiva/composicion.ts`); «Proyectar interes al» no es un filtro
     de esta grilla sino un parametro de la emision, y viaja con ella (#425). */
  parametros: ({ busqueda }) => {
    const contribuyente = (busqueda.get('contribuyente') ?? '').trim();
    return {
      ...parametrosDeBusqueda('coactiva_expedientes', undefined, busqueda),
      ...(contribuyente === '' ? {} : { codContribuyente: contribuyente }),
    };
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'los expedientes pendientes de pago'),
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Expedientes coactivos»',
    detalle:
      'Para elegir sobre qué expedientes se emite la REC hace falta lectura de «Expedientes coactivos»: la tabla de aquí es esa misma lista. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (expediente): readonly Celda[] => [
        { texto: '' },
        { texto: texto(expediente['numero']) },
        { texto: texto(expediente['ejercicio']) },
        { texto: texto(expediente['codContribuyente']) },
        { texto: SIN_DATO },
        estadoDeExpediente(expediente['estado']),
        { texto: texto(expediente['asunto']) },
      ],
      'expedientes',
      // Lo unico que `PeticionDeRec.expedientes` pide de cada uno: su numero
      // impreso. La celda lo dibuja igual, pero lo que viaja sale de aqui.
      (expediente) => ({ numero: texto(expediente['numero']) }),
    ),
  }),
});

/**
 * Las liquidaciones de costas ya registradas (`costas_procesales`, #42, RF-104).
 *
 * La grilla «Liquidaciones encontradas» la sirve el `GET` hermano del `POST` que
 * esta pantalla escribe —`costas_procesales_listado`, que #42 anadio al contrato
 * con los mismos filtros que la opcion ya declaraba—. No da filas que marcar:
 * da el historial, que es lo que la pantalla lista mientras se compone una nueva.
 *
 * **«Cod. Contrib.» sale con `SIN_DATO`**: `LiquidacionResource` no publica ni el
 * codigo ni el nombre del contribuyente —lo identifica el expediente, que si
 * viaja—. Componerlo aqui seria inventarlo (RNF-083).
 *
 * El filtro «Estado» **no viaja**: esta bloqueado en `coactiva/composicion.ts`,
 * y ahi esta escrito por que.
 */
const costas_procesales = definirConexion({
  operacion: 'costas_procesales_listado',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('costas_procesales_listado', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las liquidaciones de costas'),
  adaptar: (paginado): DatosDePantalla => ({
    // `aLaFecha` es a que dia esta el pendiente del que se deriva el estado
    // (regla 9, RNF-075). `fecha` es otra cosa: el dia en que se liquido.
    fechaCalculo: fechaDeLaConsulta(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (liquidacion): readonly Celda[] => [
        { texto: texto(liquidacion['nroLiquidacion']) },
        { texto: SIN_DATO },
        { texto: texto(liquidacion['fecha']) },
        { texto: texto(liquidacion['expedCoact']) },
        { texto: texto(liquidacion['observacion']) },
        { texto: texto(liquidacion['estado']) },
      ],
      'liquidaciones',
    ),
  }),
});

/**
 * La deuda del expediente, **obligacion por obligacion**
 * (`DeudaPorObligacionResource`, #426, RF-105).
 *
 * **Es la lectura que le faltaba al modulo, y por eso la columna de seleccion de
 * «Fraccionamiento coactivo» no tenia sobre que actuar.**
 * `PeticionDeConvenioCoactivo` pide `obligaciones[]` con `tributo`, `ejercicio` y
 * `predioId`/`vehiculoId` **por fila**, y ninguna lectura tenia esa granularidad:
 * `coactiva_consulta_deudas` es por expediente y ni siquiera desglosa insoluto de
 * interes. Es el mismo hueco que #332 cerro en rentas, y la salida es la misma.
 *
 * **El expediente sale del control que la pantalla pregunta**
 * (`coactiva/composicion.ts`), leido del borrador — el mismo mecanismo con que
 * `baja_deuda` lee la deuda a la fecha del acto. De ahi salen **las dos cosas**:
 * la deuda que se ve y el `nroExpedCoact` que viaja en el cuerpo. Un solo sitio,
 * asi que la grilla y el convenio no pueden discrepar.
 *
 * **Seis de las trece columnas salen con `SIN_DATO`**, y ninguna es un descuido.
 * «Cuota», «Nom. Trib.», «Fase», «Conc.» y «Est.» no las publica el recurso —la
 * lectura es por obligacion, no por cuota, y la fase no viaja porque una
 * obligacion de un expediente coactivo esta, por definicion, en el
 * procedimiento—. Y **«Unidad» tampoco**, que es la que mas dice: el recurso
 * publica `predioId`/`vehiculoId`, que es un **identificador interno**, y el
 * prototipo dibuja ahi un codigo de referencia catastral de veintidos
 * caracteres; pintar el primero bajo ese rotulo seria ensenar otra cosa, que es
 * exactamente lo que `baja_deuda` decidio en #332 para la misma columna.
 *
 * La **costa** si se distingue sin inventar nada: su `tributo` es el de las
 * costas procesales, que es lo que la columna «Trib.» dibuja.
 *
 * **Y publica `valores`**: `tributo`, `ejercicio` y los dos identificadores viajan
 * crudos junto a la fila, porque son lo que el cuerpo necesita y **ninguna celda
 * los dibuja**.
 */
const fraccionamiento_coactivo = definirConexion({
  operacion: 'coactiva_deuda_del_expediente',
  parametros: ({ borrador }) => ({ numero: (borrador['nroExpedCoact'] ?? '').trim() }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'la deuda del expediente coactivo'),
  /* Sin expediente no hay deuda que leer, y lo que hay que decir no es
     «elige un registro»: aqui el expediente no va en la direccion, se
     pregunta arriba. `faltaFiltro` gana al mensaje de `faltaRegistro`. */
  exige: [
    {
      parametro: 'numero',
      titulo: 'Escribe el expediente coactivo que se va a fraccionar',
      detalle:
        'El convenio se suscribe sobre una carpeta concreta: escribe su número en «Nº del expediente coactivo que se fracciona». Hasta entonces no hay ninguna obligación que acoger.',
    },
  ],
  adaptar: (deuda): DatosDePantalla => {
    const obligaciones = Array.isArray(deuda['obligaciones'])
      ? deuda['obligaciones'].filter(esObjeto)
      : [];
    const aLaFecha = texto(deuda['aLaFecha']);

    return {
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as DatosDePantalla['fechaCalculo']),
      campos: {
        nombre: texto(deuda['contribuyente']),
        // Los tres totales VIENEN CALCULADOS del servidor: sumar las filas aqui
        // es lo que RNF-083 prohibe. Los otros cinco campos «ro» de «Resultado
        // del convenio» —acogida, con beneficio, registros, tasa y beneficio—
        // dependen de lo que se elija y de un beneficio que es D-02b: no los
        // publica nadie, y salen como el catalogo los dibuje.
        deudaTotalS: texto(deuda['totalS']),
      },
      tabla: {
        filas: obligaciones.map((fila): readonly Celda[] => [
          { texto: texto(fila['ejercicio']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(fila['tributo']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(fila['insolutoS']) },
          { texto: texto(fila['reajusteS']) },
          { texto: texto(fila['interesS']) },
          { texto: texto(fila['gastosS']) },
          { texto: texto(fila['totalS']) },
        ]),
        valores: obligaciones.map((fila) => ({
          tributo: texto(fila['tributo']),
          ano: texto(fila['ejercicio']),
          predioId: identificadorDeUnidad(fila['predioId']),
          vehiculoId: identificadorDeUnidad(fila['vehiculoId']),
        })),
        conteo: `${obligaciones.length} obligación(es) en el expediente`,
      },
    };
  },
});

/**
 * El identificador interno de la unidad como texto, o vacio si no lo trae.
 *
 * Vacio y no `SIN_DATO`: esto no se dibuja en ninguna parte, y un campo vacio es
 * lo que la lista blanca ya sabe no mandar. Una obligacion que no cuelga de
 * ninguna unidad —una costa del procedimiento— es un caso legitimo, y su fila
 * lleva los dos identificadores nulos.
 */
const identificadorDeUnidad = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

/**
 * La fecha a la que se respondio el pendiente de las liquidaciones.
 *
 * Sale de la primera fila y no del reloj: `aLaFecha` es lo que el backend
 * devolvio con esas cifras, y la cabecera de la tabla tiene que decir esa (regla
 * 9). Una pagina vacia no tiene fecha que ensenar, y ahi vale la de hoy porque no
 * hay ninguna cifra que fechar.
 */
function fechaDeLaConsulta(contenido: readonly unknown[]): DatosDePantalla['fechaCalculo'] {
  const primera = contenido.find(esObjeto);
  const fecha = primera === undefined ? SIN_DATO : texto(primera['aLaFecha']);
  return fecha === SIN_DATO ? hoy() : (fecha as DatosDePantalla['fechaCalculo']);
}

export const CONEXIONES_DE_COACTIVA: Readonly<Record<string, Conexion>> = {
  coactiva_expedientes,
  proceso_coactivo,
  rec_impresion,
  costas_procesales,
  fraccionamiento_coactivo,
  coactiva_consulta_deudas,
  coactiva_deudas_beneficio,
};
