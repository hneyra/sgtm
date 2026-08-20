import type { Celda, DatosDePantalla, ValorDeCampo } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, estado, instante, leerPaginado, tablaDe, texto } from './listado';

/**
 * El modulo de seguridad, conectado al backend de verdad.
 *
 * Es el primero que se conecta porque todos los demas dependen de el: sin
 * usuarios, grupos y permisos reales, el filtrado por rol de #66 no tiene de
 * donde leer, y sin ejercicio de trabajo ninguna consulta sabe de que ano
 * habla.
 *
 * **Lo que se ve aqui es lo que el backend manda, y solo eso.** El prototipo
 * dibuja columnas que su recurso no tiene —la unidad organica de un usuario, la
 * caja en la que atiende, cuantos accesos tiene un grupo— y esas salen con «—»
 * en vez de con un valor inventado. Que se vea el hueco es el punto: dice que
 * falta, y a quien le toca.
 */

/** Filtros, orden y pagina de la URL, ya filtrados por lo que el contrato declara (#63). */
const deLaBusqueda =
  (operacion: Parameters<typeof parametrosDeBusqueda>[0]) =>
  ({ ruta, busqueda }: ContextoDePantalla) =>
    parametrosDeBusqueda(operacion, ruta['codigo'], busqueda);

/* ── Los listados ──────────────────────────────────────────────────────── */

const modulos = definirConexion({
  operacion: 'modulos',
  parametros: deLaBusqueda('modulos'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los modulos'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (modulo): readonly Celda[] => [
          { texto: texto(modulo['codigo']) },
          // El manual pide abreviatura y el recurso no la trae.
          { texto: SIN_DATO },
          { texto: texto(modulo['nombre']) },
          estado(modulo['activo']),
        ],
        'módulos',
      ),
    ),
});

const accesos = definirConexion({
  operacion: 'accesos',
  parametros: deLaBusqueda('accesos'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los accesos'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (acceso): readonly Celda[] => [
          { texto: texto(acceso['codigo']) },
          { texto: texto(acceso['tipo']) },
          { texto: texto(acceso['nombre']) },
          { texto: texto(acceso['moduloId']) },
          // El nivel es del permiso, no del acceso: se ve en la matriz.
          { texto: SIN_DATO },
          estado(acceso['activo']),
        ],
        'accesos',
      ),
    ),
});

const grupos = definirConexion({
  operacion: 'grupos',
  parametros: deLaBusqueda('grupos'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los grupos'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (grupo): readonly Celda[] => [
          { texto: texto(grupo['nombre']) },
          { texto: texto(grupo['descripcion']) },
          // Cuantos usuarios y cuantos accesos tiene no viene en el recurso.
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          estado(grupo['habilitado'], 'HABILITADO', 'INHABILITADO'),
        ],
        'grupos',
      ),
    ),
});

const usuarios = definirConexion({
  operacion: 'usuarios',
  parametros: deLaBusqueda('usuarios'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los usuarios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (usuario): readonly Celda[] => [
          { texto: texto(usuario['cuenta']) },
          { texto: texto(usuario['nombre']) },
          // Unidad organica, grupo, caja y ultimo acceso no los manda el
          // recurso: son del manual y todavia no del backend.
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          estado(usuario['habilitado'], 'HABILITADO', 'INHABILITADO'),
        ],
        'usuarios',
      ),
    ),
});

/**
 * La bitacora: la tabla que mas crece del sistema.
 *
 * Por eso pagina y filtra **contra el servidor** (#63): traerla entera a la
 * memoria del navegador deja de funcionar el primer mes de operacion.
 *
 * Y por eso el ejercicio va **siempre**, aunque nadie lo escriba en un filtro:
 * es la clave de particion de la tabla y su controlador lo exige (#13). Sin el,
 * la consulta recorre todas las particiones. No sale de la URL sino de la
 * sesion, que es de donde sale para las doce modulos.
 */
const auditoria = definirConexion({
  operacion: 'auditoria',
  parametros: (contexto) => ({
    ...deLaBusqueda('auditoria')(contexto),
    ejercicio: String(contexto.ejercicio),
  }),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la auditoria'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (registro): readonly Celda[] => [
          { texto: instante(registro['fecha']) },
          { texto: texto(registro['usuario']) },
          { texto: texto(registro['tabla']) },
          { texto: texto(registro['operacion']) },
          { texto: texto(registro['clave']) },
          {
            texto:
              [registro['origenEquipo'], registro['origenIp']]
                .filter((dato): dato is string => typeof dato === 'string' && dato !== '')
                .join(' · ') || SIN_DATO,
          },
        ],
        'registros',
      ),
    ),
});

/**
 * Los conjuntos de parametros por ejercicio.
 *
 * Esta pantalla del prototipo dibuja diecisiete campos —UIT, TIM, cuotas,
 * derecho de emision— y el backend publica **uno**: con que juego de valores se
 * emitio cada ejercicio, y si esta sellado (#10, #14). Los otros dieciseis
 * salen vacios, y tienen que salir vacios: son cifras normativas sin fuente
 * verificada todavia (D-02a y D-02b), y rellenarlas con lo que dibujo el
 * prototipo seria publicar como parametro del sistema un valor que nadie ha
 * comprobado.
 */
const parametros = definirConexion({
  // No declara ni filtros ni paginacion en el contrato: es un listado corto y
  // cerrado —un conjunto por ejercicio—, asi que no hay busqueda que trasladar.
  operacion: 'parametros',
  parametros: () => ({}),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los parametros'),
  adaptar: (paginado): DatosDePantalla => {
    const campos: Record<string, ValorDeCampo> = {};
    const vigente = ejercicioMasReciente(paginado.contenido);
    if (vigente !== undefined) campos['ejercicioVigente'] = String(vigente);
    return { fechaCalculo: hoyDeLaPantalla(), campos };
  },
});

/** El ejercicio mas alto de los conjuntos publicados: el que esta vigente. */
function ejercicioMasReciente(conjuntos: readonly unknown[]): number | undefined {
  let mayor: number | undefined;
  for (const conjunto of conjuntos) {
    if (!esConjunto(conjunto)) continue;
    const ejercicio = conjunto['ejercicio'];
    if (typeof ejercicio === 'number' && (mayor === undefined || ejercicio > mayor)) {
      mayor = ejercicio;
    }
  }
  return mayor;
}

const esConjunto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Ver `listado.ts`: la fecha sale del reloj solo porque estas lecturas no la mandan. */
const hoyDeLaPantalla = () => new Date().toISOString().slice(0, 10);

/**
 * Las opciones de seguridad ya conectadas, por su identificador del catalogo.
 *
 * Son las **seis de lectura**. Las cinco que escriben —miembros, permisos,
 * cambiar de ano, cambiar de clave y respaldos— no se conectan por aqui: una
 * pantalla no pide su operacion al abrirse cuando esa operacion escribe (#64),
 * porque abrir «Copias de seguridad» no puede lanzar un respaldo. Van por el
 * camino de escritura, con su observacion, cuando alguien pulsa.
 */
export const CONEXIONES_DE_SEGURIDAD: Readonly<Record<string, Conexion>> = {
  modulos,
  accesos,
  grupos,
  usuarios,
  auditoria,
  parametros,
};
