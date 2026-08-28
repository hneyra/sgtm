import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  datosDe,
  estado,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';
import { fechaDeCorteDe, obligacionDeDeuda } from '../consultas';

/**
 * Rentas · Registro, conectado hasta donde llega el backend: **ocho opciones de quince**.
 *
 * `contribuyentes` (#11), `vehiculos` (#26), `declaracion_jurada` (#28), `beneficios` (#27),
 * `arbitrios` (#31), `alta_deuda` (#24) y `baja_deuda` (#332) ya estaban. Se suman
 * `transferencia_predio` y `transferencia_vehiculo` (#73): las dos escrituras que el backend
 * servia y a las que solo les faltaba un campo que ninguna pantalla del manual dibuja.
 *
 * ── El campo que resuelve, y el que ademas anade (#331, #73) ────────────────
 *
 * `escrituras.ts` no tenia forma de expresar «esto se busca antes de mandarse», y eso bloqueaba
 * cinco opciones. `alta_deuda` lo resolvio primero: el opt-in `resolutores` de `composicion.ts` y
 * `ResolutorDeUnidad` resuelven su «Unidad (predio / placa)» contra `consulta_fichas` y
 * `vehiculos`, que son las dos lecturas que **si publican** el identificador interno
 * —`FichaEncontradaResource.predioId` y `VehiculoResource.id`—.
 *
 * Las dos transferencias necesitaban algo mas, y por eso el mecanismo crecio: no solo resolver
 * un identificador, tambien **anadir un campo que el catalogo no dibuja en absoluto**.
 * `TransferenciaPredioController` y `TransferenciaVehiculoController` exigen
 * **`valorTransferencia`** —`dineroDe` lo pasa por `exigir`, y `Transferencia` lo declara
 * obligatorio— y ninguna de las dos pantallas del manual tiene un campo para el; el prototipo lo
 * dibuja en **otra**, «Impuesto de alcabala» (`valorDeTransferenciaS`), que es justo la que el
 * backend **no** lee para esto. La salida no fue editar el catalogo —`rentas-registro.generado.ts`
 * no se toca a mano— ni inventar el importe con un cero: `pantallas/rentas/ResolutorDeTransferencia.tsx`
 * declara dos controles que **sustituyen** a un campo existente y **anaden** el que falta, con su
 * propia etiqueta —nunca la del campo al que sustituyen, RNF-080—.
 *
 * - En «Transferencia de predio», el control sustituye a «Código predial»: resuelve `predioId`
 *   contra `consulta_fichas` —la misma lectura de `alta_deuda`, sin la mitad «por placa», que
 *   aqui no tiene sentido— y, junto a el, pide el valor. Los dos son el mismo gesto: fijar el
 *   objeto del acto y su valor.
 * - En «Transferencia de vehiculo» no hay ningun identificador que resolver: `placa` viaja tal
 *   cual —`TransferenciaVehiculoController` la resuelve el mismo contra el padron— y **sin
 *   `codTransferente`**, porque el transferente es quien figura hoy como titular y el
 *   controlador lo lee de ahi. El control se cuelga de «Transferente — documento», un campo que
 *   **hoy no llega a ningun sitio** —ninguna de las dos peticiones del controlador lo acepta para
 *   un vehiculo—, y lo sigue dibujando exactamente igual que antes de declararse: no escribible,
 *   porque no lo era.
 *
 * `ACTOS_SIN_CAMPO` de `pantallas/actos.ts` queda **vacia**, y no se borra: es el mecanismo que
 * demostro que un acto puede necesitar un dato que ninguna pantalla del manual dibuja, y es
 * exactamente lo que le pasa hoy a `alcabala` y a `espectaculos` (ver abajo) — solo que sus
 * primarias del catalogo son «Imprimir liquidación», que `DE_SALIDA` reconoce **antes** de llegar
 * a esa lista, asi que hoy se leen como pantallas de consulta y la franja no se ve.
 *
 * `codTransferente`/`codAdquiriente` no se resuelven contra `contribuyentes`: los dos
 * controladores los reciben como **codigos**, no como identificadores internos, y el codigo es
 * exactamente lo que se teclea en «Transferente/Adquirente — documento». El rotulo del prototipo
 * dice «documento» y lo que viaja es un codigo (el ejemplo del prototipo, «44218937», parece un
 * DNI); no se corrige aqui —el catalogo no se edita— y queda anotado en la escritura declarada.
 *
 * **El historico de las transferencias tampoco se puede dibujar todavia**:
 * `TransferenciaRepository.historicoDePredio` existe en el dominio y **ningun controlador lo
 * publica**, asi que no hay `GET` que devuelva quien transfirio, cuando y con que sustento. No se
 * compone de otra lectura: se anota (ADR-0010 §4) y no se dibuja ninguna tabla de historico.
 *
 * ── `alcabala` y `espectaculos`: el mismo hueco, sin salida honesta todavia ─
 *
 * Las dos tienen ya su backend (#32) y las dos tienen el mismo tipo de bloqueo que las
 * transferencias tenian —un dato que el acto exige y que ninguna pantalla puede escribir—, pero
 * en ninguna de las dos hay un campo al que colgar un resolutor: son bloqueos dobles.
 *
 * - `alcabala` pide `transferenciaId` (el identificador interno de una `Transferencia` **ya
 *   registrada**) y `autoavaluoAjustado`. El primero **no es resoluble**: ninguna operacion del
 *   contrato lista transferencias —`POST /rentas/transferencias/predio` la crea y no hay ningun
 *   `GET` que la devuelva—, asi que no hay lectura contra la que resolver, ni campo del prototipo
 *   que lo pida (su unico campo de texto libre, «Nº de expediente», no es ese identificador). El
 *   segundo **si tiene el campo mas cercano** —`autovaluoAjustadoS`— pero el catalogo lo dibuja
 *   `"ro"` (solo lectura, `Campo.tsx` lo bloquea siempre, sin importar lo que declare
 *   `escrituras.ts`), mientras que `AlcabalaController` lo pide como **dato de entrada**: su
 *   propio javadoc dice que «quien complete esta pantalla lo trae ya calculado», porque el ajuste
 *   por el IPM no esta resuelto todavia (D-11). El campo que si es de texto libre en esta
 *   pantalla, `valorDeTransferenciaS`, es el que el backend **no** lee.
 * - `espectaculos` pide `organizadorId` —resoluble, en principio: `ContribuyenteResource` publica
 *   `id`, y «Organizador» es un campo de texto que podria colgar un resolutor contra
 *   `contribuyentes`— e `ingresoDeclarado`, que **no lo es**: el catalogo dibuja
 *   `recaudacionDeclaradaS` `"ro"`, esperando que el servidor lo componga de aforo por precio, y
 *   `EspectaculoController.registrar` lo pide como argumento obligatorio, sin componerlo. Resolver
 *   solo `organizadorId` no desbloquea nada —el acto sigue sin poder registrarse sin el ingreso—,
 *   asi que no se construye el resolutor mientras el otro campo siga cerrado.
 *
 *   En las dos, y a diferencia de las transferencias, el campo mas cercano que el catalogo dibuja
 *   ya esta **ocupado por otro dato** (`"ro"`, o el valor que el backend no lee): no hay un campo
 *   «vacio de significado» al que anadirle uno nuevo sin volver a mentir sobre lo que muestra. Se
 *   anota y no se puentea (ADR-0010 §4); conectarlas sigue siendo rellenar un formulario, confirmar
 *   un acto irreversible y recibir un 422 por un campo que no se puede escribir.
 *
 * ── Lo que sigue fuera, y por que ───────────────────────────────────────────
 *
 * - `predios_rentas`, `predial_individual`, `predial_masivo`: el backend no publica todavia
 *   ningun `Controller` para `Determinacion` — #30 dejo la regla de negocio y su prueba, no la
 *   capa web. Ver abajo el contrato que esa capa tendria que publicar (#333).
 * - `vehicular_calculo`: **el contrato y el controlador no dicen lo mismo, y eso se anota, no se
 *   puentea** (#333c). `VehicularController.PeticionDeCalculoVehicular` lee `placa`,
 *   `codContribuyente`, `vehiculoId`, `ejercicio`, `minimoImponible` y `simulacion` del **cuerpo**
 *   de la peticion; `sgtm-v1.yaml` declara `placa`, `codContribuyente` y `ejercicio` como
 *   parametros de **consulta**. Los filtros de una pantalla viajan por la URL, nunca por el
 *   cuerpo, asi que hoy la peticion saldria con los tres en la URL y el controlador los leeria
 *   nulos: calcularia sobre el padron entero, o fallaria. Ademas su catalogo no tiene `secciones`,
 *   asi que no hay formulario al que declararle campos —los tres datos que necesita son
 *   `filtros`, y un filtro nunca viaja por el cuerpo (`bloques/Filtros.tsx`)—. Conectarlo es
 *   corregir el contrato o el controlador —una sola verdad—, y esa correccion no cabe en un issue
 *   de interfaz: puentearla desde aqui dejaria dos contratos vivos y el proximo que lea el YAML
 *   creeria el equivocado. `minimoImponible` es, ademas, un valor normativo (D-02a).
 *
 * ── (#333b) El contrato que la capa web de la determinacion tendra que publicar ─
 *
 * Se anota **como anotacion y no como forma en el proxy**: fingir aqui la derivacion haria que la
 * pantalla se construyera contra una invencion, que es lo que ADR-0010 prohibe. Lo que
 * `predial_individual` necesita, en el orden en que se lee, y todo por **contribuyente y
 * ejercicio**:
 *
 *   1. los predios que integran la base: por cada uno, su codigo, ubicacion, uso, `%` de
 *      propiedad y su autovaluo. Es `determinacion_predio_detalle` (V20), que ya existe como
 *      tabla y no tiene recurso;
 *   2. la base imponible **del conjunto**, ponderada por el `%` de propiedad de cada predio
 *      (`RT011BaseImponibleDelContribuyente`), con el valuo total, el exonerado y el afecto;
 *   3. los tramos aplicados: para cada uno, su limite en UIT, su alicuota y el importe que
 *      aporta, **con el identificador del conjunto de parametros sellado** que se uso —«2026 v1»,
 *      `determinacion.conjunto_id`—, porque una cifra sin su version no se puede recalcular;
 *   4. las cuotas con sus vencimientos, y el derecho de emision;
 *   5. la fecha a la que todo eso esta calculado (regla 9, RNF-075).
 *
 * Ninguna de las cinco se compone en la interfaz. La 2 y la 3 son literalmente las que RNF-083
 * prohibe recomponer aqui: sumar los autovaluos de la tabla para «adelantar» la base daria una
 * cifra parecida y sin el `%` de propiedad, y el error seria invisible.
 */

/** El registro que abre la ficha o la declaracion. Sin el no hay peticion. */
const registro = ({ ruta }: ContextoDePantalla): string => ruta['codigo'] ?? '';

/**
 * El padron de contribuyentes.
 *
 * Ocho columnas para un recurso que publica seis campos. Las dos que faltan son
 * las que mas se miran —**cuantos predios tiene y cuanto debe**— y las dos salen
 * vacias a proposito: los predios los tiene `catastro` y la deuda es
 * `deudaActualizadaA(fecha)` (#22), que no existe todavia. Componer aqui
 * cualquiera de las dos seria inventarse la respuesta a «¿cuanto debo?», que es
 * la pregunta que trae a la gente a la ventanilla.
 */
const contribuyentes = definirConexion({
  operacion: 'contribuyentes',
  parametros: ({ ruta, busqueda }) =>
    parametrosDeBusqueda('contribuyentes', ruta['codigo'], busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los contribuyentes'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (contribuyente): readonly Celda[] => {
          // El documento viaja como tipo y numero; la pantalla tiene una
          // columna para cada tipo, asi que el numero va a la que le toca.
          const esRuc = contribuyente['tipoDocumento'] === 'RUC';
          const numero = texto(contribuyente['numeroDocumento']);
          return [
            estado(contribuyente['activo'], 'A', 'I'),
            { texto: texto(contribuyente['codigo']) },
            { texto: texto(contribuyente['nombreRazonSocial']) },
            { texto: esRuc ? SIN_DATO : numero },
            { texto: esRuc ? numero : SIN_DATO },
            // El domicilio fiscal es #15; los predios, de catastro; la deuda,
            // de #22. Ninguna se compone aqui.
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
          ];
        },
        'contribuyentes',
      ),
    ),
});

/**
 * Ficha de vehiculo (RF-024, #26). `VehiculoResource` es registro puro: ni el valor
 * referencial, ni el impuesto, ni el titular con nombre —solo `contribuyenteId`, y unir con
 * `contribuyentes` no es cosa de este endpoint—. De las mas de cuarenta claves que el prototipo
 * dibuja en sus seis pestanas, ocho tienen de donde salir; el resto sale con «—», que es lo que
 * distingue «no llego» de «vale cero».
 *
 * `categoria` (M1/M2/M3...) es la unica que podria confundirse con `clase`
 * (AUTOMOVIL/CAMIONETA...): el dominio solo guarda `categoria`, asi que es la que se usa y
 * `clase` se deja sin dato en vez de adivinar cual de las dos es.
 *
 * El historial de placas que trae `ConsultaDeVehiculos` no se dibuja: el catalogo no reserva
 * una tabla para el en esta pantalla —la unica `tabla` declarada es «Vehiculos encontrados», el
 * resultado de una busqueda que este endpoint (por placa unica) no hace—. Anadirla ahi mostraria
 * un historial de cambios de placa bajo un titulo que dice otra cosa.
 */
const vehiculos = definirConexion({
  operacion: 'vehiculos',
  parametros: (contexto) => ({ placa: registro(contexto) }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el vehiculo'),
  adaptar: (vehiculo): DatosDePantalla => ({
    // Registro puro (#26): ninguna cifra que fechar. hoy() es el mismo recurso
    // que usa `contribuyentes` para el mismo motivo (ver su doc en listado.ts).
    fechaCalculo: hoy(),
    campos: {
      placa2: texto(vehiculo['placa']),
      anoDeFabricacion: texto(vehiculo['anioFabricacion']),
      marca: texto(vehiculo['marca']),
      modelo: texto(vehiculo['modelo']),
      categoria: texto(vehiculo['categoria']),
      nroDeMotor: texto(vehiculo['numeroMotor']),
      nroDeSerie: texto(vehiculo['numeroSerie']),
    },
  }),
});

/**
 * Declaracion jurada (RF-023, #28). `GET /rentas/declaraciones/{djNro}?ano=` trae **una**
 * declaracion, mientras que el prototipo dibuja «Declaraciones presentadas» como si fuera un
 * padron entero de resultados —el mismo desajuste que #175 encontro y reescribio en
 * `consulta_deuda`—. Aqui no se reescribe el contrato (no es este issue): la unica declaracion que
 * el backend puede traer se dibuja como una tabla de **una fila**, con lo que el recurso
 * publica; contribuyente y predios no estan en `DeclaracionJuradaResource` y salen con «—».
 *
 * El bloque «Formularios a emitir» (HR/PU/PR, ejemplares, OpenOffice) no son datos que esta
 * pantalla lea: son casillas de una accion de impresion, y esta conexion es de solo lectura.
 */
const declaracion_jurada = definirConexion({
  operacion: 'declaracion_jurada',
  parametros: (contexto) => {
    const ano = contexto.busqueda.get('ano') ?? '';
    return { djNro: registro(contexto), ...(ano === '' ? {} : { ano }) };
  },
  leer: (cuerpo) => leerObjeto(cuerpo, 'la declaracion jurada'),
  adaptar: (dj): DatosDePantalla => {
    const fechaPresentacion = texto(dj['fechaPresentacion']);
    return {
      // La fecha de la propia declaracion, si la trajo; hoy() solo si no.
      fechaCalculo: fechaPresentacion === SIN_DATO ? hoy() : fechaPresentacion,
      tabla: {
        filas: [
          [
            { texto: texto(dj['numero']) },
            { texto: texto(dj['ejercicio']) },
            // Ni el contribuyente ni el conteo de predios salen de este recurso.
            { texto: SIN_DATO },
            { texto: texto(dj['tipo']) },
            { texto: fechaPresentacion },
            { texto: SIN_DATO },
            // El valuo afecto es D-02: depende de la determinacion, no de la DJ.
            { texto: SIN_DATO },
            { texto: texto(dj['estado']) },
          ],
        ],
        conteo: '1 declaración',
      },
    };
  },
});

/**
 * Beneficios y exoneraciones (RF-029, #27). Solo lectura: el alta y el cese de
 * `RegistrarBeneficio` no tienen `POST` en el contrato todavia —lo dice el propio
 * `BeneficioController`—, asi que «Solicitud de beneficio» no se puede escribir aqui.
 *
 * `Expediente`/`Resolucion` no son dos campos en `Beneficio`: el dominio solo guarda
 * `documentoOrigen` (con que se registro) y `baseLegal` (que lo sustenta). Van ahi, que es lo mas
 * cerca que hay, y no a un tercer campo que el recurso no tiene.
 *
 * `Estado` tampoco es una columna del recurso: se deriva de `vigenciaHasta` —nulo es vigente,
 * con fecha es cesado—, que son los dos unicos estados que el dominio modela. «EN TRAMITE» y
 * «DENEGADO» son del catalogo de un flujo de aprobacion que `Beneficio` no tiene: cada fila que
 * llega aqui ya fue registrada, no esta pendiente de nada.
 */
const beneficios = definirConexion({
  operacion: 'beneficios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('beneficios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los beneficios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (beneficio): readonly Celda[] => {
          const vigenciaHasta = beneficio['vigenciaHasta'];
          const vigente = vigenciaHasta === null || vigenciaHasta === undefined;
          const vigencia = vigente
            ? `Desde ${texto(beneficio['vigenciaDesde'])}`
            : `${texto(beneficio['vigenciaDesde'])} — ${texto(vigenciaHasta)}`;
          const porcentaje = beneficio['porcentaje'];
          const monto = beneficio['monto'];
          const deduccion =
            typeof porcentaje === 'string'
              ? `${porcentaje}%`
              : typeof monto === 'string'
                ? `S/ ${monto}`
                : SIN_DATO;
          return [
            { texto: texto(beneficio['documentoOrigen']) },
            // contribuyenteId es un identificador interno, no el codigo del
            // contribuyente: mostrarlo confundiria a quien lee la columna.
            { texto: SIN_DATO },
            { texto: texto(beneficio['tipo']) },
            { texto: texto(beneficio['baseLegal']) },
            { texto: vigencia },
            { texto: deduccion },
            estado(vigente, 'VIGENTE', 'CESADO'),
          ];
        },
        'beneficios',
      ),
    ),
});

/**
 * Arbitrios municipales (RF-022, #31). `GET /rentas/arbitrios?anio=&ejercicio=&codigoPredial=&zona=&uso=`
 * trae un padron paginado de `CuotaDeArbitrio` —una fila por servicio y mes—, no una fila por
 * servicio con su tasa mensual y su anual ya sumado como dibuja «Determinacion por servicio»: por
 * eso solo dos de las seis columnas del catalogo salen de `ArbitrioResource` (`servicio`, y
 * `monto` en «Tasa mensual», que es literalmente eso —la cuota de un mes—). `criterioDeDistribucion`,
 * `frecuencia`, `anualS` y `condicion` no estan en el recurso, y componer el anual sumando doce
 * cuotas es justo lo que RNF-083 prohibe: se dejan en `SIN_DATO`.
 *
 * `zona` y `uso` viajan porque el contrato los declara como filtro de esta pantalla, pero
 * `ArbitriosController` todavia no los lee (solo `anio` y `codigoPredial`) — un filtro que el
 * backend no aplica todavia, no uno que esta pantalla se inventa (ADR-0010).
 */
const arbitrios = definirConexion({
  operacion: 'arbitrios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('arbitrios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los arbitrios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (cuota): readonly Celda[] => [
          { texto: texto(cuota['servicio']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(cuota['monto']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ],
        'cuotas de arbitrio',
      ),
    ),
});

/**
 * La deuda que se puede dar de baja (RF-044, #332).
 *
 * **Es la unica conexion del sistema cuya operacion no se llama como su opcion**, y esa
 * excepcion tiene un motivo concreto: la operacion de `baja_deuda` es un `POST`, y una
 * operacion que escribe no se pide al abrir la pantalla —abrir «Baja de deuda» no puede dar
 * de baja nada—. Su tabla se quedaba por tanto vacia para siempre, y la columna de seleccion
 * que el prototipo dibuja no tenia sobre que actuar.
 *
 * Lo que se lee es `GET /consultas/deuda`, que es **exactamente** lo que la pantalla necesita:
 * las obligaciones pendientes de un contribuyente, con su desglose calculado por el backend a
 * una fecha de corte (#22, #175). No es un dato inventado ni un cruce de dos respuestas: es la
 * misma deuda, publicada por la unica operacion que la publica.
 *
 * **Depende de un permiso que no es el suyo, y hay que decirlo** (#332): quien tenga «Baja de
 * deuda» y no tenga **lectura sobre «Consulta de deuda»** recibe un 403 al abrir la pantalla.
 * No es un caso raro: son dos opciones distintas del catalogo, con dos permisos distintos, y el
 * manual las reparte en dos modulos. Sin nombrarlo, el sintoma es una tabla vacia y muda —«no
 * hay deuda»—, que es exactamente lo contrario de lo que pasa. Por eso esta conexion declara su
 * propio `sinPermiso`: el aviso dice **cual** permiso falta, no «no tienes permiso».
 *
 * Lo que no viaja, y por que:
 *
 * - `ano` y `tributo` (los otros dos filtros de la pantalla): `consulta_deuda` no los declara
 *   como parametros, y `parametrosDeBusqueda` no manda lo que el contrato no declara
 *   (ADR-0010). Se quedan en la URL hasta que el backend decida su semantica.
 * - `Unidad` (el predio o la placa de la fila): `ObligacionDeDeudaResource` publica el
 *   identificador interno, no el codigo catastral ni la placa. Ensenar un identificador
 *   interno en la columna que dice «Unidad» seria ensenar otra cosa con ese rotulo.
 *
 * Pero **el identificador si viaja**, y por `valores` en vez de por una columna: `ClaveDeSaldo`
 * lo compara con igualdad exacta —(contribuyente, tributo, ejercicio, periodo, predioId,
 * vehiculoId)—, asi que una baja sin el no senala a la obligacion que se eligio, sino a la que
 * ese contribuyente tenga **sin unidad**. Es la diferencia entre extinguir la cuota que se marco
 * y extinguir otra. Los importes van por el mismo camino y por un motivo hermano: la celda dice
 * «1,842.60» y `new BigDecimal` con la coma dentro lanza.
 *
 * La primera celda va vacia a proposito: es la columna de la casilla, y la dibuja
 * `TablaDePantalla` cuando la opcion declara seleccion (`rentas/composicion.ts`).
 */
const baja_deuda = definirConexion({
  operacion: 'consulta_deuda',
  /* **La deuda se lee a la fecha del acto, no a la de hoy** (regla 9, y #337).
     `fechaValor` de la baja es la fecha de la resolucion, y el backend valida
     `deudaActualizadaA(fechaValor)` contra el insoluto y el interes que se
     mandan (`RegistrarMovimientoDeDeuda`). Con la tabla leida a hoy —que es lo
     que pasaba, porque la pantalla no mandaba fecha de corte— y una resolucion
     anterior —que es lo normal: primero se resuelve y despues se registra—, el
     interes que viaja es **mayor** que el que el backend calcula a esa fecha, y
     la baja vuelve como 422 despues de confirmar un acto irreversible.
     Mandando la fecha, lo que se ve y lo que se manda son de la misma fecha. */
  parametros: ({ busqueda, borrador }) => {
    const fechaDeCorte = (borrador['fechaDeResolucion'] ?? '').trim();
    return {
      ...parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
      // Solo cuando esta escrita entera: el campo se teclea, y una fecha a
      // medias («2026-0») es un 400 por cada pulsacion.
      ...(FECHA_ISO.test(fechaDeCorte) ? { fechaDeCorte } : {}),
    };
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda del contribuyente'),
  /* Sin contribuyente no hay deuda que leer: `codContribuyente` es
     `@RequestParam` obligatorio de `GET /consultas/deuda`, asi que abrir la
     pantalla sin buscar a nadie es un 400 contra el backend real —el proxy lo
     tapa porque contesta igual—. Lo que hay que decir ahi no es el 400. */
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Busca un contribuyente para ver su deuda',
      detalle:
        'La baja se registra sobre la cuenta corriente de un contribuyente: escribe su código arriba y pulsa «Buscar». Hasta entonces no hay ninguna cuota que elegir.',
    },
  ],
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Consulta de deuda»',
    detalle:
      'Para elegir las cuotas hace falta lectura de «Consulta de deuda»: la tabla de aquí es la deuda del contribuyente, y esa la publica esa otra opción. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (paginado): DatosDePantalla => ({
    // Toda cifra con su fecha de calculo (regla 9, RNF-075): la de corte con que
    // el backend actualizo el interes, no la del reloj del navegador.
    fechaCalculo: fechaDeCorteDe(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (obligacion): readonly Celda[] => {
        const leida = obligacionDeDeuda(obligacion);
        return [
          { texto: '' },
          { texto: leida.ejercicio },
          { texto: SIN_DATO },
          { texto: leida.cuota },
          { texto: leida.tributo },
          { texto: leida.insoluto },
          { texto: leida.interes },
          // El total lo calcula el backend. Sumar insoluto e interes aqui daria
          // una cifra parecida y equivocada: falta el reajuste y faltan los
          // gastos (RNF-083).
          { texto: leida.total },
        ];
      },
      'cuotas',
      // Lo que identifica la obligacion, **leido del cuerpo y no de la celda**.
      // Las claves son las de las columnas del catalogo, salvo `predioId` y
      // `vehiculoId`, que ninguna columna dibuja: son el identificador interno
      // que `ClaveDeSaldo` compara, y ensenarlo bajo «Unidad» seria ensenar otra
      // cosa con ese rotulo.
      (obligacion) => {
        const leida = obligacionDeDeuda(obligacion);
        return {
          ano: leida.ejercicio,
          cuota: leida.cuota,
          tributo: leida.tributo,
          insolutoS: leida.insoluto,
          interesS: leida.interes,
          predioId: identificador(obligacion['predioId']),
          vehiculoId: identificador(obligacion['vehiculoId']),
          /* Y la fase, que tampoco dibuja ninguna columna. Sin ella la baja
             resuelve a `ORDINARIA` y `SaldoRepositoryJdbc.proyectar` hace
             `DO UPDATE SET fase = EXCLUDED.fase`: una baja parcial sobre deuda
             en COACTIVA o en CONVENIO la devolvia a la fase ordinaria sin que
             nada lo dijera. */
          fase: leida.fase,
        };
      },
    ),
  }),
});

/**
 * `predioId`/`vehiculoId` como texto, o vacio si no lo trae.
 *
 * Vacio y no `SIN_DATO`: esto no se dibuja en ninguna parte, y un campo vacio es
 * lo que la lista blanca ya sabe no mandar. Una obligacion que no cuelga de
 * ninguna unidad —la de un contribuyente, sin predio ni vehiculo— es un caso
 * legitimo del libro, y su clave lleva los dos identificadores nulos.
 */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

/** Una fecha entera, como la escribe un `input[type=date]` y como la lee `LocalDate`. */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Las opciones de Rentas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_RENTAS: Readonly<Record<string, Conexion>> = {
  contribuyentes,
  vehiculos,
  declaracion_jurada,
  beneficios,
  arbitrios,
  baja_deuda,
};
