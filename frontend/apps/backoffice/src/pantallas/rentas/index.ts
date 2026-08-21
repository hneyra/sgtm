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

/**
 * Rentas · Registro, conectado hasta donde llega el backend: **siete opciones de quince**.
 *
 * `contribuyentes` (#11) ya estaba. Se suman `vehiculos` (#26), `declaracion_jurada` (#28) y
 * `beneficios` (#27): las tres son lectura, y las tres tenian su endpoint publicado desde hace
 * dias sin que nadie las conectara. Quedan fuera de este PR, deliberadamente:
 *
 * - `predios_rentas`, `predial_individual`, `predial_masivo`: el backend no publica todavia
 *   ningun `Controller` para `Determinacion` — #30 dejo la regla de negocio y su prueba, pero
 *   "los dos endpoints... siguen sin capa web" es literal, no una figura retorica.
 * - `arbitrios`, `alcabala`, `vehicular_calculo`, `espectaculos`: bloqueados por D-02 (#31, #32).
 * - `transferencia_predio`, `transferencia_vehiculo`, `alta_deuda`, `baja_deuda`: **tienen**
 *   backend (#29, #24) pero son las primeras escrituras que se conectarian en toda la interfaz —
 *   `escrituras.ts` hoy solo declara `cambiar_anio` y `cambiar_clave`, dos formularios triviales.
 *   Merecen su propio PR: cada campo que se declare ahi es el unico que su formulario podra
 *   mandar (la lista blanca de #64), y apurarlo junto con tres lecturas mas es la forma de
 *   equivocarse en un campo que nadie revisa con cuidado.
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

/** Las opciones de Rentas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_RENTAS: Readonly<Record<string, Conexion>> = {
  contribuyentes,
  vehiculos,
  declaracion_jurada,
  beneficios,
};
