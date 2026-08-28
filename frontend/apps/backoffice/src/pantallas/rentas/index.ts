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
 * Rentas · Registro, conectado hasta donde llega el backend: **seis opciones de quince**.
 *
 * `contribuyentes` (#11), `vehiculos` (#26), `declaracion_jurada` (#28), `beneficios` (#27) y
 * `alta_deuda` (#24, escritura en `escrituras.ts`) ya estaban. Se suma `arbitrios` (#31): lectura,
 * con el mismo hueco de forma que ya tenia `declaracion_jurada` — `GET /rentas/arbitrios` trae un
 * padron de **cuotas mensuales** (una fila por servicio y mes), y el catalogo dibuja
 * «Determinacion por servicio» como si cada fila fuera un servicio con su tasa mensual y su total
 * anual ya sumado. No se recompone: `anualS`, `criterioDeDistribucion`, `frecuencia` y `condicion`
 * no estan en `ArbitrioResource`, y sumar doce cuotas para inventar el anual es exactamente lo que
 * RNF-083 prohibe — se dejan en `SIN_DATO`.
 *
 * Quedan fuera de este PR, deliberadamente:
 *
 * - `predios_rentas`, `predial_individual`, `predial_masivo`: el backend no publica todavia
 *   ningun `Controller` para `Determinacion` — #30 dejo la regla de negocio y su prueba, no la
 *   capa web.
 * - `alcabala`, `vehicular_calculo`, `espectaculos`: #32 (este mismo `onda:2`) resolvio la parte
 *   **estructural** de D-02 para los tres —sus controladores calculan de verdad, sin ningun
 *   literal tributario—, pero ninguno se puede conectar todavia y **no es por D-02**:
 *     - `alcabala` pide `transferenciaId` (identificador interno de una `Transferencia` ya
 *       registrada) y `autoavaluoAjustado` como los dos argumentos que decide quien llama; el
 *       catalogo no dibuja ningun campo escribible para el primero, y marca el segundo `"ro"`
 *       (`autovaluoAjustadoS`) esperando que el servidor calcule el ajuste por IPM — que D-11 dice
 *       explicitamente que no se calcula aqui.
 *     - `vehicular_calculo` pide `placa`/`codContribuyente`/`ejercicio` en el **cuerpo** de la
 *       peticion (`VehicularController`), pero `sgtm-v1.yaml` los declara como parametros de
 *       **consulta** de una pantalla que solo tiene `filtros` —sin `secciones`, asi que
 *       `escrituras.ts` no tiene formulario al que declararle campos—, y los filtros viajan por la
 *       URL, nunca por el cuerpo. Conectarlo de verdad es corregir el contrato o el controlador,
 *       no una entrada en la lista blanca.
 *     - `espectaculos` pide `organizadorId` (identificador interno) e `ingresoDeclarado`; el
 *       catalogo solo ofrece `organizador2`/`rUC` (texto) para lo primero y marca
 *       `recaudacionDeclaradaS` `"ro"` para lo segundo, esperando que el servidor la componga de
 *       aforo por precio — cosa que el controlador no hace.
 *   Los tres necesitan resolver un codigo contra un identificador interno antes de poder enviar,
 *   igual que ya le falta a `transferencia_predio`/`transferencia_vehiculo` (ver abajo).
 * - `transferencia_predio`, `transferencia_vehiculo`: el backend pide un identificador interno
 *   (`predioId`) y el codigo exacto de contribuyente, y el prototipo solo pide un codigo
 *   catastral y un numero de documento — hace falta una busqueda que resuelva uno contra el
 *   otro antes de poder enviar, y `escrituras.ts` no tiene forma de expresar eso (ver #73).
 * - `baja_deuda`: a diferencia de `alta_deuda`, su pantalla es buscar-y-seleccionar-varias-filas
 *   sobre una tabla de deuda existente, no un formulario plano — cada fila seleccionada es su
 *   propio `POST` a `/rentas/deuda/bajas`, y eso es una pieza de interfaz que no existe todavia,
 *   no una entrada mas en la lista blanca.
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
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda del contribuyente'),
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

/** Las opciones de Rentas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_RENTAS: Readonly<Record<string, Conexion>> = {
  contribuyentes,
  vehiculos,
  declaracion_jurada,
  beneficios,
  arbitrios,
  baja_deuda,
};
