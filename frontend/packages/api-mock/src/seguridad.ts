import { RESPUESTAS } from './respuestas.generado';

/**
 * Las seis lecturas de seguridad, con la forma que **el backend ya publica**.
 *
 * El resto del proxy contesta `DatosDePantalla` —la forma que comparten las 134
 * pantallas— porque es lo que las pantallas piden mientras no hay backend. Para
 * estas seis si lo hay (#9, #12, #13), y lo que publica no es esa forma: es un
 * recurso del dominio dentro del sobre paginado de `RespuestaPaginada`. La
 * interfaz habla ya ese idioma, asi que el proxy tambien tiene que hablarlo; si
 * no, se estaria construyendo la pantalla contra una forma que el servidor no
 * usa, que es justo lo que este modo intermedio existe para evitar.
 *
 * **Los valores siguen siendo los del prototipo.** Aqui no se inventa ni un
 * dato: se leen las mismas filas que dibuja el catalogo portado y se les pone
 * el nombre de campo que declara cada `Resource` del backend. Lo que cambia es
 * el sobre y las claves, no el contenido.
 *
 * Lo que sigue sin simular es la semantica: no filtra, no ordena y no pagina de
 * verdad —siempre devuelve la pagina 0 con todo lo que hay—. Fingir que pagina
 * seria inventar un comportamiento del servidor, que es lo que el proxy no hace.
 */

/** El sobre de un listado, tal como lo publica `RespuestaPaginada` (#6). */
export interface Paginado {
  readonly contenido: readonly Readonly<Record<string, unknown>>[];
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
  readonly hayMas: boolean;
}

/** Las celdas de una fila del prototipo, como texto. */
type Fila = readonly string[];

function filasDe(pantalla: string): readonly Fila[] {
  return (RESPUESTAS[pantalla]?.tabla?.filas ?? []).map((fila) => fila.map((celda) => celda.texto));
}

/** Envuelve el contenido en una sola pagina: el proxy no pagina, y lo dice. */
function unaPagina(contenido: readonly Readonly<Record<string, unknown>>[]): Paginado {
  return {
    contenido,
    pagina: 0,
    tamano: contenido.length,
    totalElementos: contenido.length,
    totalPaginas: 1,
    hayMas: false,
  };
}

/** `Activa`, `ACTIVA`, `HABILITADO` → `true`. Cualquier otra cosa, `false`. */
const activo = (texto = ''): boolean => /^(activ|habilitad)/i.test(texto);

/** `12/08/2026 09:41` → `2026-08-12T09:41:00Z`. El backend publica instantes ISO. */
function instante(texto = ''): string | null {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!partes) return null;
  const [, dia, mes, anio, hora = '00', minuto = '00'] = partes;
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:00Z`;
}

/** `PC-CAJA3 · 10.0.2.43` → equipo e IP por separado, como los guarda la bitacora. */
function origen(texto = ''): { equipo: string | null; ip: string | null } {
  const [equipo = '', ip = ''] = texto.split('·').map((parte) => parte.trim());
  return { equipo: equipo === '' ? null : equipo, ip: ip === '' ? null : ip };
}

/* ── Una funcion por recurso, con los campos que declara su `Resource` ──── */

const modulos = (): Paginado =>
  unaPagina(
    filasDe('modulos').map(([codigo, , nombre, estado], i) => ({
      id: i + 1,
      codigo,
      nombre,
      orden: i + 1,
      activo: activo(estado),
    })),
  );

const accesos = (): Paginado =>
  unaPagina(
    filasDe('accesos').map(([codigo, tipo, nombre, , , estado], i) => ({
      id: i + 1,
      moduloId: 1,
      tipo,
      codigo,
      nombre,
      activo: activo(estado),
    })),
  );

const grupos = (): Paginado =>
  unaPagina(
    filasDe('grupos').map(([nombre, descripcion, , , estado], i) => ({
      id: i + 1,
      nombre,
      descripcion,
      habilitado: activo(estado),
      vigenciaDesde: null,
      vigenciaHasta: null,
    })),
  );

const usuarios = (): Paginado =>
  unaPagina(
    filasDe('usuarios').map(([cuenta, nombre, , , , , estado], i) => ({
      id: i + 1,
      cuenta,
      nombre,
      correo: null,
      habilitado: activo(estado),
      vigenciaDesde: null,
      vigenciaHasta: null,
    })),
  );

const auditoria = (): Paginado =>
  unaPagina(
    filasDe('auditoria').map(([fecha, usuario, tabla, operacion, clave, desde], i) => {
      const { equipo, ip } = origen(desde);
      return {
        id: i + 1,
        ejercicio: 2026,
        tabla,
        clave,
        operacion,
        usuario,
        origenEquipo: equipo,
        origenIp: ip,
        fecha: instante(fecha),
        observacion: '',
        datosAnteriores: null,
        datosNuevos: null,
      };
    }),
  );

/**
 * Los conjuntos de parametros por ejercicio.
 *
 * Esta pantalla del prototipo no trae tabla —dibuja campos—, asi que el
 * ejercicio vigente sale de sus propios campos. Es un solo conjunto: los
 * anteriores los tendra el backend, que es quien los guarda.
 */
const parametros = (): Paginado => {
  const campos = RESPUESTAS['parametros']?.campos ?? {};
  const vigente = campos['ejercicioVigente'];
  const ejercicio = typeof vigente === 'string' ? Number(vigente) : new Date().getFullYear();
  return unaPagina([
    {
      id: 1,
      ejercicio,
      version: 1,
      estado: 'SELLADO',
      fechaSellado: null,
      usuarioSellado: null,
    },
  ]);
};

/** Por camino del contrato, relativo a `/api/v1`. Solo `GET`: ninguna escribe. */
export const PAGINADOS: Readonly<Record<string, () => Paginado>> = {
  '/seguridad/modulos': modulos,
  '/seguridad/accesos': accesos,
  '/seguridad/grupos': grupos,
  '/seguridad/usuarios': usuarios,
  '/seguridad/auditoria': auditoria,
  '/seguridad/parametros': parametros,
};

/* ── Lo que devuelven las dos escrituras que la interfaz ya usa ─────────── */

/**
 * Respuesta del `PUT` que cambia el ejercicio de trabajo.
 *
 * **Devuelve el ejercicio que se le pidio**, y no uno fijo, porque es lo que
 * hace el backend: la interfaz adopta el que responde el servidor, no el que
 * ella misma eligio. Con una respuesta fija la cabecera se quedaria clavada y
 * la pantalla pareceria no hacer nada.
 */
function sesionConEjercicio(cuerpo: unknown): Readonly<Record<string, unknown>> {
  const pedido =
    typeof cuerpo === 'object' && cuerpo !== null
      ? (cuerpo as Readonly<Record<string, unknown>>)['ejercicio']
      : undefined;
  return {
    id: 1,
    usuarioId: 1,
    inicio: new Date().toISOString(),
    ejercicioDeTrabajo: typeof pedido === 'number' ? pedido : new Date().getFullYear(),
  };
}

/**
 * Respuesta del `PUT` que inicia el cambio de contrasena.
 *
 * Lo que devuelve el backend es **a donde tiene que ir la interfaz**, no una
 * confirmacion: el sistema no recibe contrasenas y el cambio lo hace el
 * proveedor de identidad (ADR-0005).
 */
const cambioDeClaveIniciado = (): Readonly<Record<string, unknown>> => ({
  gestionadaPor: 'PROVEEDOR_DE_IDENTIDAD',
  destino: '/proveedor-de-identidad/cambiar-clave',
});

/** Por verbo y camino del contrato. Las que no estan aqui siguen el camino de siempre. */
const ESCRITURAS: Readonly<Record<string, (cuerpo: unknown) => Readonly<Record<string, unknown>>>> =
  {
    'PUT /seguridad/sesion/ejercicio': sesionConEjercicio,
    'PUT /seguridad/usuarios/{id}/clave': cambioDeClaveIniciado,
  };

/** La respuesta de una escritura de seguridad, si el proxy la publica con la forma del backend. */
export function escrituraDe(
  metodo: string,
  camino: string,
  cuerpo: unknown,
): Readonly<Record<string, unknown>> | null {
  const relativo = camino.replace(/^\/api\/v1/, '');
  const clave = `${metodo.toUpperCase()} ${relativo}`;
  const directa = ESCRITURAS[clave];
  if (directa) return directa(cuerpo);
  // El camino de la clave lleva un parametro: se compara por patron.
  for (const [declarada, construir] of Object.entries(ESCRITURAS)) {
    const [verbo = '', ruta = ''] = declarada.split(' ');
    if (verbo !== metodo.toUpperCase()) continue;
    if (patron(ruta).test(relativo)) return construir(cuerpo);
  }
  return null;
}

/** `/seguridad/usuarios/{id}/clave` → `^/seguridad/usuarios/[^/]+/clave$`. */
function patron(ruta: string): RegExp {
  const escapado = ruta
    .split(/(\{\w+\})/)
    .map((trozo) =>
      /^\{\w+\}$/.test(trozo) ? '[^/]+' : trozo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${escapado}$`);
}

/** El recurso paginado de un camino, si el proxy lo publica con la forma del backend. */
export function paginadoDe(metodo: string, camino: string): Paginado | null {
  if (metodo.toUpperCase() !== 'GET') return null;
  const construir = PAGINADOS[camino.replace(/^\/api\/v1/, '')];
  return construir === undefined ? null : construir();
}
