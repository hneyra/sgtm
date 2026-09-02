import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `seguridad` publica.
 *
 * <h2>Los siete privilegios, y el que no existe</h2>
 *
 * El dominio declara `EJECUCION`, `LECTURA`, `REGISTRO`, `MODIFICACION`,
 * `ELIMINACION`, `IMPRESION` y `ESPECIAL`. **No hay ninguno que se llame
 * «Total»**: el artboard lo dibuja como si implicara los otros seis, y es
 * `ESPECIAL` con otro nombre. La matriz usa los nombres del dominio.
 */
export const PRIVILEGIOS = [
  'EJECUCION',
  'LECTURA',
  'REGISTRO',
  'MODIFICACION',
  'ELIMINACION',
  'IMPRESION',
  'ESPECIAL',
] as const;

export type Privilegio = (typeof PRIVILEGIOS)[number];

/** Como se lee cada privilegio en pantalla. */
export const ROTULO_DEL_PRIVILEGIO: Record<Privilegio, string> = {
  EJECUCION: 'Ejecuta',
  LECTURA: 'Consulta',
  REGISTRO: 'Ingresa',
  MODIFICACION: 'Modifica',
  ELIMINACION: 'Anula',
  IMPRESION: 'Imprime',
  ESPECIAL: 'Especial',
};

/**
 * Las siete clases de acto que la bitacora reconoce. Es `Operacion` del
 * backend, **letra por letra**, y desde #544 tambien el `enum` que el contrato
 * publica para el parametro `operacion` de esta ruta.
 *
 * <h2>El que no esta, y el que no es de aqui</h2>
 *
 * No hay `ELIMINACION`: la aplicacion no borra (RNF-051), y lo que parece un
 * borrado es una `BAJA`, una `ANULACION` o una `REVERSION`. `ELIMINACION` si
 * existe, pero como **privilegio** —esta arriba, en `PRIVILEGIOS`—.
 *
 * <h2>Y ofrecerlo ya no sale gratis (#544)</h2>
 *
 * Antes daba una tabla vacia —indistinguible de «no hubo ninguno»— y ahora el
 * controlador lo **rechaza**: medido el 2026-09-01 contra la municipalidad 1,
 * `?operacion=ELIMINACION` contesta `422 VALIDACION` con «La operacion va entre
 * ALTA, MODIFICACION, BAJA, ANULACION, REVERSION, PERMISO, ACCESO:
 * 'ELIMINACION'». Por eso esta lista es la unica fuente del desplegable: una
 * palabra de mas no devuelve nada raro, deja la pantalla en rojo.
 *
 * Y el que mas pesa es el que faltaba: `PERMISO` son **1 453 de las 1 783** filas
 * del ejercicio 2026 —cada cambio de la matriz de accesos deja la suya
 * (ADR-0008 §5)—, que es justo lo que esta pantalla existe para poder mirar. La
 * bitacora crece, asi que la proporcion es de ese dia; el comportamiento no.
 */
export const OPERACIONES = [
  'ALTA',
  'MODIFICACION',
  'BAJA',
  'ANULACION',
  'REVERSION',
  'PERMISO',
  'ACCESO',
] as const;

export type Operacion = (typeof OPERACIONES)[number];

export type Modulo = { id: number; codigo: string; nombre: string; orden: number; activo: boolean };
export type Acceso = { id: number; moduloId: number; tipo: string; codigo: string; nombre: string; activo: boolean };

/**
 * Es `GrupoResource`.
 *
 * El campo de estado se llama **`habilitado`**, no `activo`: `Modulo` y
 * `Acceso` si usan `activo` y el parecido es lo que hizo el defecto. Con
 * `activo` aqui, `solicitar<T>` —que no valida en ejecucion— dejaba
 * `undefined`, y la pantalla marcaba TODOS los grupos como inactivos: el que
 * administra la municipalidad entera incluido.
 */
export type Grupo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  habilitado: boolean;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};
export type Usuario = {
  id: number;
  cuenta: string;
  nombre: string;
  correo: string | null;
  habilitado: boolean;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};

/**
 * Un permiso **configurado** sobre un grupo. Es `PermisoResource`.
 *
 * <h2>Las dos claves son nulables, y eso es lo que dice de quien es la fila</h2>
 *
 * Desde #543 el recurso declara `usuarioId` y su `grupoId` dejo de ser
 * primitivo. Antes valia `0L` cuando la fila no tenia grupo —o sea, cuando era
 * la excepcion de un usuario— y salia por HTTP **indistinguible de un permiso
 * del grupo 0**. La lectura del grupo devuelve siempre `usuarioId` nulo, y el
 * `PUT` de la excepcion (#585) devuelve el par al reves —`grupoId` nulo y
 * `usuarioId` puesto—: el mismo recurso sirve a las dos, y cual de los dos
 * identificadores viene es lo que dice de quien es la fila. Medido:
 * `{"id":292,"acceso":"respaldo","grupoId":null,"usuarioId":4,"privilegios":[]}`.
 *
 * Y **no es lo mismo que el permiso EFECTIVO de un usuario**: esto es lo que se
 * configura y se guarda con el `PUT` de la misma ruta; aquello es lo que una
 * persona puede, con la precedencia ya resuelta. Ver `PermisoEfectivo`.
 */
export type PermisoDeGrupo = {
  id: number;
  acceso: string;
  grupoId: number | null;
  usuarioId: number | null;
  privilegios: Privilegio[];
};

/**
 * De donde le viene a un usuario lo que puede hacer sobre un acceso.
 *
 * Es `PermisoEfectivo.OrigenDelPermiso` del backend, letra por letra. Solo hay
 * dos valores y **no hay un tercero para «de los dos»**: la precedencia no suma.
 *
 * Va como union y no como el arreglo `as const` de `PRIVILEGIOS` y `OPERACIONES`
 * porque nadie lo recorre —no llena ningun desplegable—: lo unico que se hace
 * con el es distinguir las dos ramas, y una constante que no lee nadie no
 * protege de nada.
 */
export type OrigenDelPermiso = 'EXCEPCION' | 'GRUPO';

/**
 * Lo que un usuario **puede** hacer sobre un acceso, ya resuelto por el
 * servidor. Es `PermisoEfectivoResource` (#543).
 *
 * <h2>Por que el origen viaja en el dato</h2>
 *
 * La regla es que la excepcion propia de un usuario **sustituye** al grupo
 * entero para ese acceso —otorgue o niegue—, no se suma. Deducirla comparando
 * dos listas obliga a quien pregunta a reimplementar justo la regla que no se
 * puede equivocar: la interfaz vieja calculaba `on = propio || heredado`, que
 * convierte una excepcion que **restringe** en una que amplia.
 *
 * <h2>Lo que hay que saber para dibujarlo sin mentir</h2>
 *
 * Medido el 2026-09-01 contra el backend local, y contrastado con
 * `PermisoRepositoryJdbc.efectivosConOrigenDe` y con
 * `PermisosDeUnUsuarioFronteraTest`:
 *
 * 1. **Un acceso sin nada configurado NO produce fila.** Serian 134 filas
 *    vacias por usuario. Asi que «no esta en la lista» significa «no hay nada
 *    configurado», no «se le nego».
 * 2. **`privilegios: []` si es una fila, y solo la produce una excepcion que
 *    niega.** Es lo unico que distingue «se le nego expresamente» de «nunca lo
 *    tuvo», y por eso las dos no se pueden dibujar igual.
 * 3. **`grupoId` es nulo con `origen: 'GRUPO'`** cuando lo otorga mas de un
 *    grupo vigente: no hay UNO que nombrar, y elegir el primero por id daria un
 *    dato plausible y equivocado. Con `origen: 'EXCEPCION'` es nulo siempre —el
 *    constructor del backend lo rechaza si no lo es—.
 * 4. **Un usuario deshabilitado o fuera de vigencia recibe la lista VACIA**, con
 *    la misma regla que el guardia (`AND EXISTS (... u.habilitado AND vigencia)`
 *    en la consulta; AC 2 de la prueba de frontera). No es que no tenga
 *    permisos configurados: es que hoy no puede ninguno. Dibujar «sin permisos»
 *    ahi seria decir algo distinto de lo que pasa.
 * 5. Un `id` que no existe **en esta municipalidad** es 404 nombrandolo, no una
 *    lista vacia. Comprobado cruzado: el usuario 2 —que existe en la
 *    municipalidad 9— es 404 desde la 1.
 *
 * Y **ya se escribe** (#585): el mismo camino que la matriz de un grupo, con
 * `fijarPermisosDelUsuario`. Hasta ese issue la ruta solo tenia `GET` y la
 * unica forma de negarle un privilegio a alguien sin sacarlo de su grupo era el
 * SQL directo, que no deja fila de auditoria con quien lo decidio.
 */
export type PermisoEfectivo = {
  acceso: string;
  privilegios: Privilegio[];
  origen: OrigenDelPermiso;
  grupoId: number | null;
};

/**
 * Una fila de la bitacora. Es `AuditoriaResource`, campo por campo.
 *
 * `observacion` **no** es opcional: el backend la declara sin `@Nullable`
 * porque ninguna escritura pasa sin ella (regla 10, RNF-052). Verificado sobre
 * las 500 ultimas filas de la municipalidad 1: 0 nulas. `origenEquipo` si es
 * nulo —en esas mismas 500, las 500—, y por eso no se dibuja columna para el.
 */
export type FilaDeAuditoria = {
  id: number;
  ejercicio: number;
  tabla: string;
  clave: string;
  operacion: string;
  usuario: string;
  origenEquipo: string | null;
  origenIp: string | null;
  fecha: string;
  observacion: string;
  /** El JSON de la fila antes y despues. Nulos en un ALTA y en un ACCESO. */
  datosAnteriores: string | null;
  datosNuevos: string | null;
};

export const listarModulos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Modulo>>('/seguridad/modulos', { parametros: { ...p }, senal: s });

export const listarAccesos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Acceso>>('/seguridad/accesos', { parametros: { ...p }, senal: s });

export const listarGrupos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Grupo>>('/seguridad/grupos', { parametros: { ...p }, senal: s });

export const listarUsuarios = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Usuario>>('/seguridad/usuarios', { parametros: { ...p }, senal: s });

/** Los permisos de UN grupo. Devuelve lista suelta, no el sobre paginado. */
export const permisosDelGrupo = (grupoId: number, s?: AbortSignal) =>
  solicitar<PermisoDeGrupo[]>(`/seguridad/grupos/${grupoId}/permisos`, { senal: s });

/**
 * A que grupos pertenece un usuario (#543).
 *
 * **Solo las pertenencias activas**: una baja no borra la fila (RNF-051) pero
 * quien salio del grupo ya no pertenece. Lo que si devuelve son los grupos
 * deshabilitados o fuera de vigencia a los que se sigue perteneciendo —cada
 * fila trae su `habilitado` y su vigencia—, y esa distincion importa: pertenecer
 * y surtir efecto no son lo mismo. Un grupo deshabilitado no aparece como
 * origen de ningun permiso efectivo, porque la consulta que los resuelve exige
 * `g.habilitado` y la vigencia.
 *
 * No pertenecer a ninguno es una pagina vacia con 200; un usuario que no existe
 * en esta municipalidad es 404.
 */
export const gruposDelUsuario = (usuarioId: number, p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Grupo>>(`/seguridad/usuarios/${usuarioId}/grupos`, {
    parametros: { ...p },
    senal: s,
  });

/**
 * Quien esta DENTRO de un grupo (#582). La pregunta inversa de
 * `gruposDelUsuario`, y hasta #646 no se podia hacer: de esta ruta solo existia
 * el `POST` que afilia, asi que contestar «quien esta dentro» obligaba a
 * recorrer el padron de cuentas preguntando por cada una.
 *
 * <h2>Solo las pertenencias activas</h2>
 *
 * Una baja no borra la fila —sigue ahi con `activo` en falso (RNF-051)— pero
 * quien salio del grupo ya no esta dentro, y el `JOIN ... AND m.activo` del
 * repositorio lo deja fuera. Lo que si devuelve son las cuentas
 * **deshabilitadas** que siguen afiliadas: cada fila trae su `habilitado`, y esa
 * separacion es la que permite contestar que cuenta sin poder entrar conserva
 * permisos sin una segunda lectura. Estar en el grupo y poder entrar son cosas
 * distintas.
 *
 * <h2>Cero miembros y no existir son dos respuestas</h2>
 *
 * Un grupo sin nadie es una pagina vacia con 200; un grupo que no existe **en
 * esta municipalidad** es 404 nombrandolo. La segunda no se puede decir
 * callando: cero filas se leeria como «a este grupo no pertenece nadie», que es
 * lo contrario de lo que hay que contestarle a quien administra. Es la misma
 * decision que el `Optional.empty()` frente a la pagina vacia del listado de
 * manzanas (#537).
 *
 * <h2>Lo que hay que pedir para poder contar los deshabilitados</h2>
 *
 * El sobre publica `totalElementos`, asi que **cuantos son** lo dice el servidor
 * sobre el grupo entero y no hace falta traerlos todos. **Cuantos de ellos estan
 * deshabilitados**, en cambio, solo se puede contar sobre las filas que
 * llegaron: con mas de una pagina, contar la primera y presentarlo como del
 * grupo da un numero mas pequeno que el real, o sea el que nadie sabria
 * distinguir del bueno. Quien lo dibuje tiene que mirar `hayMas` antes de decir
 * esa segunda cifra.
 *
 * Ordena por `cuenta` si no se pide otra cosa, y ese orden ya desempata por `id`
 * en el backend: sin desempate, dos cuentas homonimas dejan de tener un orden
 * total y dos paginas consecutivas pueden repetir a una y omitir a otra (#548).
 */
export const miembrosDelGrupo = (grupoId: number, p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Usuario>>(`/seguridad/grupos/${grupoId}/miembros`, {
    parametros: { ...p },
    senal: s,
  });

/**
 * La matriz efectiva de un usuario, con el origen de cada fila (#543).
 *
 * Devuelve lista suelta, no el sobre paginado, y **sin filas** para los accesos
 * sobre los que no hay nada configurado. Lee `PermisoEfectivo` antes de
 * dibujarla: las cinco cosas que ahi se anotan son las que separan una matriz
 * honesta de una que se equivoca en el sentido peor.
 */
export const permisosEfectivosDelUsuario = (usuarioId: number, s?: AbortSignal) =>
  solicitar<PermisoEfectivo[]>(`/seguridad/usuarios/${usuarioId}/permisos`, { senal: s });

/**
 * Lo CONFIGURADO de una cuenta, que no es lo mismo que lo efectivo (#583).
 *
 * <h2>La pregunta que esto contesta y la otra no</h2>
 *
 * {@link permisosEfectivosDelUsuario} aplica la misma regla que el guardia, y a
 * una cuenta deshabilitada le contesta la lista **vacía**. Eso está bien: es lo
 * que esa persona puede hacer hoy, que es nada. Pero deja dos situaciones
 * distintas con la misma respuesta — la cuenta que **conserva** permisos y la
 * que nunca tuvo ninguno—, y son las dos que quien administra necesita separar:
 * la primera es una llave que sigue existiendo y que basta rehabilitar para que
 * vuelva a abrir.
 *
 * Medido contra el backend, municipalidad 1:
 *
 * ```
 * jperez    habilitada      surtenEfectoHoy=true    configurados=134  efectivos=134
 * avilchez  deshabilitada   surtenEfectoHoy=false   configurados=134  efectivos=0
 * ccruz     deshabilitada   surtenEfectoHoy=false   configurados= 11  efectivos=0
 * ```
 *
 * Antes de #583 las dos últimas eran `[]` y no había forma de distinguirlas.
 *
 * **`surtenEfectoHoy` es el discriminador y se lee, no se deduce.** Deducirlo de
 * `usuario.habilitado` funcionaría hoy y dejaría de funcionar en cuanto la
 * vigencia o cualquier otra condición entre en la regla del guardia: la
 * respuesta la da quien aplica esa regla.
 */
export type PermisosConfigurados = {
  usuarioId: number;
  cuenta: string;
  /** Si lo configurado surte efecto hoy. Con `false`, la cuenta no puede operar. */
  surtenEfectoHoy: boolean;
  permisos: PermisoEfectivo[];
};

export const permisosConfiguradosDelUsuario = (usuarioId: number, s?: AbortSignal) =>
  solicitar<PermisosConfigurados>(`/seguridad/usuarios/${usuarioId}/permisos/configurados`, { senal: s });

/**
 * Una fila de «quién tiene este privilegio sobre esta opción». Es
 * `TitularDelPrivilegioResource`.
 *
 * `origen` dice de dónde le viene: `GRUPO` con su `grupoId`, o `EXCEPCION`
 * cuando es una excepción propia de la cuenta. Esa segunda mitad es la que
 * ningún recorrido por grupos encontraría, y es justo la que importa —una
 * excepción propia no se ve mirando a qué grupo pertenece nadie—.
 */
export type TitularDelPrivilegio = {
  usuarioId: number;
  cuenta: string;
  nombre: string;
  origen: OrigenDelPermiso;
  grupoId: number | null;
};

/**
 * Quién tiene un privilegio sobre una opción (#583).
 *
 * Es **la pregunta inversa** a la matriz de una cuenta, y hasta #693 costaba una
 * petición por usuario del padrón: en la práctica no se hacía.
 *
 * El vocabulario se admite en cualquier caja —`especial` y `ESPECIAL` son la
 * misma palabra, medido: 200 las dos— y cualquier otra palabra es **422
 * enumerando los siete**, no una página vacía: «nadie tiene Especial» es la
 * lectura plausible y equivocada por la que #427 se negó a traducir vocabularios
 * (medido: `?privilegio=TOTAL` → «Privilegio desconocido: 'TOTAL'. Los siete son
 * [EJECUCION, LECTURA, REGISTRO, MODIFICACION, ELIMINACION, IMPRESION,
 * ESPECIAL]»).
 *
 * **Es por opción, no del padrón entero.** Preguntar «quién tiene Especial en
 * algo» seguiría costando una petición por acceso —134—, así que la pantalla
 * pregunta por la opción que se elija y lo dice.
 */
export const titularesDelPrivilegio = (
  codigoDeAcceso: string,
  privilegio: Privilegio,
  paginacion: { pagina?: number; tamano?: number },
  s?: AbortSignal,
) =>
  solicitar<RespuestaPaginada<TitularDelPrivilegio>>(`/seguridad/accesos/${codigoDeAcceso}/usuarios`, {
    parametros: { privilegio, ...paginacion },
    senal: s,
  });

/**
 * La bitacora.
 *
 * `ejercicio` es OBLIGATORIO —sin el, 422— porque la tabla esta particionada
 * por ejercicio. Los filtros que funcionan son `usuario`, `tabla`, `operacion`,
 * `desde` y `hasta`.
 *
 * <h2>El orden hay que pedirlo</h2>
 *
 * `ParametrosDePaginacion` resuelve `direccion` a **`ASCENDENTE`** cuando no
 * viaja, y el orden por omision de esta operacion es `fecha`: sin pedir nada,
 * las 20 primeras filas son las 20 **mas antiguas** de la particion, o sea el
 * acta de instalacion del sistema. Quien llama tiene que mandar
 * `direccion: 'DESCENDENTE'` para que «ultimos movimientos» lo sean.
 */
export type FiltroDeAuditoria = {
  ejercicio: string;
  usuario?: string;
  tabla?: string;
  operacion?: string;
  desde?: string;
  hasta?: string;
};

export const listarAuditoria = (f: FiltroDeAuditoria, p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<FilaDeAuditoria>>('/seguridad/auditoria', { parametros: { ...f, ...p }, senal: s });

/**
 * Fija los privilegios de un grupo sobre uno o varios accesos.
 *
 * <h2>No es un reemplazo de la matriz, y eso decide que se manda</h2>
 *
 * `PermisosController` recorre `niveles` y hace un *upsert* **por acceso**; su
 * javadoc lo dice con todas las letras: «lo que **no** hace es borrar los
 * permisos que no vengan en el cuerpo. Un acceso ausente se queda como estaba».
 * Lo que si se reemplaza entero es la lista de privilegios **del acceso que
 * viaja**: mandar `privilegios: []` retira los siete, y eso es explicito.
 *
 * Por eso esta pantalla manda **solo los accesos que se tocaron**, no las 134
 * ni las que el filtro tenga en pantalla. Mandarlas todas seria escribir 134
 * permisos y 134 filas de auditoria por un clic; mandar «las visibles» seria
 * peor, porque cuales son depende del filtro que este puesto.
 *
 * Puede contestar **409** por la guarda del ultimo administrador: un cambio que
 * dejara a la municipalidad sin nadie capaz de administrar permisos se rechaza,
 * y de ahi no se sale por el sistema.
 */
/**
 * La municipalidad de la sesion, con su nombre (#555).
 *
 * Sin esta lectura la cabecera no podia decir de quien son las cifras que se
 * estan mirando: el token trae el identificador y nada mas. Se decia
 * «Municipalidad n.º 1» —feo a proposito, para que se leyera como el dato que
 * faltaba— despues de haber dicho durante meses un nombre compilado que era el
 * de otra: la municipalidad 1 es **Sullana**, y la constante decia «Catacaos».
 *
 * No lleva parametro: sale del token. Pedirla por identificador convertiria la
 * operacion en un directorio de municipalidades.
 */
export type MunicipalidadDeLaSesion = {
  id: number;
  ubigeo: string;
  nombre: string;
  tipo: string;
};

export function municipalidadDeLaSesion(senal?: AbortSignal): Promise<MunicipalidadDeLaSesion> {
  return solicitar('/seguridad/sesion/municipalidad', { senal });
}

/**
 * Quien es la sesion (#559). Es `IdentidadResource`, campo por campo.
 *
 * <h2>El `usuarioId` es el dato, no un campo mas</h2>
 *
 * `PUT /seguridad/usuarios/{id}/clave` solo admite la clave PROPIA —el servidor
 * compara la cuenta del token con la del usuario que ese `id` nombra— y hasta
 * esta lectura la interfaz no sabia cual era el suyo: las dos unicas
 * operaciones que publican un `usuario.id` son el listado de usuarios y la
 * matriz de otro, las dos detras de un permiso de administracion mucho mayor
 * que «cambiar mi propia contrasena». Deducirlo cruzando la cuenta del token
 * contra el listado obligaria a otorgarlo.
 *
 * Y es el de ESTA municipalidad: la misma persona con la misma cuenta en dos
 * municipalidades son dos filas de `usuario` y dos identificadores distintos,
 * asi que no puede salir del token —que trae la cuenta— sino de la consulta.
 *
 * <h2>`ejercicioDeTrabajo` nulo no quiere decir «el corriente»</h2>
 *
 * Quiere decir que nadie lo ha fijado con `PUT /seguridad/sesion/ejercicio`, y
 * las dos cosas se distinguen a proposito (#557): el año del reloj ahi afirmaria
 * que alguien lo eligio. El selector de la cabecera no lo escribe — solo acota
 * lo que las consultas piden.
 */
export type IdentidadDeLaSesion = {
  usuarioId: number;
  cuenta: string;
  nombre: string;
  ejercicioDeTrabajo: number | null;
};

/**
 * La sesion preguntando quien es.
 *
 * **Sin ningun parametro**, igual que `municipalidadDeLaSesion`: el sujeto sale
 * del token. Con un identificador seria el padron de usuarios sin su permiso, y
 * devolveria el `id` de otro — justo lo que la guarda del cambio de clave
 * existe para rechazar. Uno de mas ni siquiera se ignora: el servidor contesta
 * 422 nombrandolo.
 *
 * La lee cualquier sesion valida, tenga los permisos que tenga: leer quien es
 * uno mismo no revela nada que no revele el token que ya se presento (ADR-0013).
 */
export function identidadDeLaSesion(senal?: AbortSignal): Promise<IdentidadDeLaSesion> {
  return solicitar('/seguridad/sesion', { senal });
}

/**
 * Lo que ESTA sesion puede hacer, acceso por acceso (#592).
 *
 * <h2>La forma, medida contra el servidor y no supuesta</h2>
 *
 * Es un objeto plano: la clave es el acceso del catalogo y el valor la lista de
 * privilegios **en minuscula**, que no es como los escribe `PRIVILEGIOS` aqui
 * arriba —el dominio los declara en mayuscula— ni como los dibuja la matriz.
 *
 * ```json
 * {"cambiar_direccion_ref":["ejecucion","lectura","registro","modificacion",
 *                           "eliminacion","impresion","especial"],
 *  "transferencia_vehiculo":["ejecucion","lectura"]}
 * ```
 *
 * <h2>Un acceso que falta no es un acceso sin privilegios</h2>
 *
 * Es un acceso que la sesion **no tiene**: el servidor no publica una clave con
 * la lista vacia, sencillamente no la publica. Por eso el tipo es un
 * `Record<string, string[]>` y no una lista de pares con su `privilegios: []`:
 * la ausencia significa algo, y un mapa la expresa sin inventar una fila.
 *
 * <h2>Sin ningun parametro, como sus dos hermanas</h2>
 *
 * El sujeto sale del token. Pedirlo por identificador seria la matriz de otro,
 * que es {@link permisosEfectivosDelUsuario} y vive detras del permiso de
 * administracion; esta la lee cualquier sesion valida, porque preguntar que
 * puede uno mismo no revela nada que el guardia no vaya a contestar igual al
 * primer intento (ADR-0013).
 */
export type PermisosDeLaSesion = Record<string, string[]>;

export function permisosDeLaSesion(senal?: AbortSignal): Promise<PermisosDeLaSesion> {
  return solicitar('/seguridad/sesion/permisos', { senal });
}

/**
 * Lo que contesta el cambio de clave: quien la gestiona y a donde hay que ir.
 *
 * `destino` es una ruta RELATIVA del proveedor —hoy `/account/password`—, no una
 * URL completa: el emisor concreto es configuracion del ambiente (ADR-0005). La
 * base la pone `enElProveedorDeIdentidad`, que es la misma con la que se pide el
 * token.
 */
export type CambioDeClaveIniciado = { gestionadaPor: string; destino: string };

/**
 * Inicia el cambio de la contrasena PROPIA.
 *
 * <h2>No viaja ninguna contrasena, y esa ausencia es la garantia</h2>
 *
 * El cuerpo lleva la observacion y nada mas: `SolicitudDeCambioDeClave` no
 * declara ni la vieja, ni la nueva, ni la repetida. La credencial no vive en
 * este sistema —la guarda el proveedor de identidad (ADR-0005)—, asi que no hay
 * donde ponerla y lo tecleado en una caja de contrasena se quedaria en el estado
 * de React. Lo que el backend hace es registrar el acto en la bitacora y decir a
 * donde mandar a quien lo pide.
 *
 * <h2>Solo la propia</h2>
 *
 * `AdministrarSesion` compara la cuenta del token con la del usuario que el `id`
 * nombra y contesta 403 si no son la misma: cambiar la clave de otro no es
 * administrar, es suplantar. Por eso el `id` que se manda es el de
 * `identidadDeLaSesion` y no uno elegido en ninguna lista.
 */
export function iniciarCambioDeClave(usuarioId: number, observacion: string): Promise<CambioDeClaveIniciado> {
  return solicitar(`/seguridad/usuarios/${usuarioId}/clave`, {
    metodo: 'PUT',
    cuerpo: { observacion },
  });
}

export function fijarPermisosDelGrupo(
  grupoId: number,
  niveles: { acceso: string; privilegios: Privilegio[] }[],
  observacion: string,
): Promise<PermisoDeGrupo[]> {
  return solicitar(`/seguridad/grupos/${grupoId}/permisos`, {
    metodo: 'PUT',
    cuerpo: { niveles, observacion },
  });
}

/**
 * La **excepcion propia** de una cuenta sobre uno o varios accesos (#585).
 *
 * <h2>Mismo cuerpo que el del grupo, y una sola diferencia que lo cambia todo</h2>
 *
 * `PUT /seguridad/usuarios/{id}/permisos` recibe el mismo `{niveles,
 * observacion}` que {@link fijarPermisosDelGrupo} y hace el mismo *upsert* por
 * acceso: **lo que no viaja se queda como estaba**. Lo que cambia es lo que
 * significa `privilegios: []`. En el grupo es «este grupo no otorga nada aqui»;
 * en la cuenta es una **negacion**, y la fila se escribe en cero en vez de
 * borrarse —si se borrara, el acceso volveria a heredar del grupo y «se le nego
 * expresamente» y «nunca lo tuvo» volverian a leerse igual, que es justo lo que
 * el `GET` de esta misma ruta existe para distinguir (#543)—.
 *
 * <h2>Lo que se escribe SUSTITUYE a lo del grupo, no se suma</h2>
 *
 * Una excepcion sobre un acceso desplaza entero lo que sus grupos le den ahi.
 * Medido el 2026-09-02 contra este ambiente, sobre `lpena` (usuario 4, del
 * grupo 2):
 *
 * ```
 * PUT .../usuarios/4/permisos  {"niveles":[{"acceso":"respaldo","privilegios":[]}], ...}
 *   -> [{"id":292,"acceso":"respaldo","grupoId":null,"usuarioId":4,"privilegios":[]}]
 * GET .../usuarios/4/permisos  -> respaldo  {"privilegios":[],"origen":"EXCEPCION","grupoId":null}
 *
 * POST .../grupos/2/baja       (el grupo del que lo heredaba TODO)
 * GET  .../usuarios/4/permisos -> 2 filas, y las dos son sus excepciones
 * ```
 *
 * Esa segunda medicion es la demostracion de que sustituye: con el grupo caido
 * la cuenta pierde las nueve filas heredadas y **conserva** las dos propias.
 *
 * <h2>Una excepcion escrita no se puede retirar</h2>
 *
 * Aqui no se borra nada (regla 4) y el contrato no publica ningun `DELETE` de
 * esta ruta: escrita la fila, ese acceso deja de heredar del grupo **para
 * siempre**. Lo mas parecido a deshacerlo es volver a escribir la excepcion con
 * lo que el grupo concede, que deja los mismos privilegios y **no** devuelve el
 * origen a `GRUPO`. Quien lo dibuje tiene que decirlo antes de escribir la
 * primera, porque despues ya no hay eleccion.
 *
 * <h2>Los dos 422 y el 409</h2>
 *
 * Medidos, con su mensaje literal:
 *
 * - sin `observacion` — «Toda modificacion exige la observacion del usuario:
 *   sin ella no se guarda» (regla 10, RNF-052).
 * - con el nivel **sin la clave `privilegios`** — «El nivel de 'respaldo' no
 *   trae 'privilegios'. Para retirarlos todos hay que mandar la lista vacia,
 *   que es explicito». La clave ausente **no** es la lista vacia: retirar siete
 *   privilegios no puede ser el resultado de un campo olvidado.
 * - **409** por la guarda del ultimo administrador: negarle por excepcion
 *   `permisos`/`REGISTRO` al unico que podia administrarlos deja la
 *   municipalidad sin nadie que administre, y de ahi no se sale por el sistema.
 *   La comprobacion corre **despues** de guardar y dentro de la misma
 *   transaccion, asi que lo que deshace el cambio es el rollback: un 409 aqui
 *   significa que no se escribio nada.
 */
export function fijarPermisosDelUsuario(
  usuarioId: number,
  niveles: { acceso: string; privilegios: Privilegio[] }[],
  observacion: string,
): Promise<PermisoDeGrupo[]> {
  return solicitar(`/seguridad/usuarios/${usuarioId}/permisos`, {
    metodo: 'PUT',
    cuerpo: { niveles, observacion },
  });
}

/**
 * Baja de una cuenta: **deja de poder entrar**, y no se borra (#572, RNF-051).
 *
 * Su fila sigue ahi para que la bitacora pueda seguir diciendo quien hizo que,
 * y sus permisos siguen configurados: `permisosConfiguradosDelUsuario` los
 * enseña, y `permisosEfectivosDelUsuario` contesta la lista vacia porque aplica
 * la misma regla que el guardia. Rehabilitarla se los devuelve **enteros**, sin
 * volver a otorgar ninguno — que es lo que hace que una baja no sea una forma
 * de retirar permisos.
 *
 * **No toca la cuenta del proveedor de identidad** (ADR-0005): esa persona
 * seguira autenticando y el guardia le negara todo. Es la mitad que esta
 * pantalla no puede tocar.
 *
 * <h2>Aqui NO hay guarda del ultimo administrador</h2>
 *
 * Medido: `usuariosQuePuedenAdministrarPermisos` se consulta en un solo sitio
 * del backend —`AdministrarPermisos.guardarYComprobar`—, o sea en los dos `PUT`
 * de permisos y en ninguna otra escritura. Dar de baja a la unica cuenta que
 * podia administrar permisos **no se rechaza**, y el resultado es el mismo
 * callejon del que el 409 de los permisos protege. Quien lo dibuje tiene que
 * decirlo antes de mandarlo; comprobarlo aqui seria reimplementar la
 * precedencia, que es lo que #543 existe para no hacer. Lo que si se puede es
 * **preguntarlo**: {@link titularesDelPrivilegio} sobre `permisos`/`REGISTRO` lo
 * contesta con la precedencia ya resuelta por el servidor.
 */
export function darDeBajaUsuario(usuarioId: number, observacion: string): Promise<Usuario> {
  return solicitar(`/seguridad/usuarios/${usuarioId}/baja`, {
    metodo: 'POST',
    cuerpo: { observacion },
  });
}

/** Reactiva una cuenta: recupera **todos** los permisos que tenia, sin repetirlos. */
export function reactivarUsuario(usuarioId: number, observacion: string): Promise<Usuario> {
  return solicitar(`/seguridad/usuarios/${usuarioId}/reactivacion`, {
    metodo: 'POST',
    cuerpo: { observacion },
  });
}

/**
 * La vigencia de una cuenta o de un grupo (RF-123).
 *
 * Los dos extremos admiten nulo y **significan cosas distintas**: sin `desde`
 * vale desde siempre, sin `hasta` vale indefinidamente, y mandar los dos nulos
 * es **quitar** la vigencia, no dejarla como estaba —el `PUT` reemplaza las dos
 * fechas de una vez—.
 *
 * <h2>Una fecha pasada se admite, y corta el acceso hoy</h2>
 *
 * Medido el 2026-09-02: `{"vigenciaHasta":"2020-01-31"}` contesta **200** con
 * esa fecha guardada. No es un descuido del backend sino lo que RF-123 pide
 * —el contrato que ya termino—, pero su efecto es inmediato y es el mismo que
 * una baja: `Usuario.autorizaEn(hoy)` pasa a falso y el guardia niega todo. Una
 * pantalla que lo mande sin decirlo estaria dando de baja a alguien con un
 * campo que se lee como administrativo.
 *
 * La vigencia invertida es **422** nombrando las dos fechas —«La vigencia
 * termina antes de empezar: 2026-12-01 a 2026-01-01»— y una fecha que no sea
 * `AAAA-MM-DD` tambien, porque el cuerpo declara `LocalDate`.
 */
export type CambioDeVigencia = { vigenciaDesde?: string | null; vigenciaHasta?: string | null };

export function fijarVigenciaDeUsuario(
  usuarioId: number,
  vigencia: CambioDeVigencia,
  observacion: string,
): Promise<Usuario> {
  return solicitar(`/seguridad/usuarios/${usuarioId}/vigencia`, {
    metodo: 'PUT',
    cuerpo: { ...vigencia, observacion },
  });
}

/**
 * Baja de un grupo: **retira el acceso de todos sus miembros de golpe** (#572).
 *
 * No borra ninguna relacion (RNF-051): las filas de `miembro` siguen ahi y
 * reactivarlo devuelve el acceso a los mismos. Lo que cambia mientras tanto es
 * el alcance, y por eso es el acto mas caro de esta pantalla: no afecta a una
 * persona sino a todas las que pertenecen.
 *
 * Medido sobre el grupo 2 de este ambiente, que tiene un miembro: con el grupo
 * dado de baja, `GET /seguridad/usuarios/4/permisos` pasa de **11 filas a 2**, y
 * las dos que quedan son sus excepciones propias. Reactivandolo vuelve a 11.
 *
 * Tampoco aqui hay guarda del ultimo administrador: dar de baja el grupo del
 * que salia el privilegio `permisos` deja la municipalidad sin quien administre
 * y el backend no lo rechaza. Ver {@link darDeBajaUsuario}.
 */
export function darDeBajaGrupo(grupoId: number, observacion: string): Promise<Grupo> {
  return solicitar(`/seguridad/grupos/${grupoId}/baja`, {
    metodo: 'POST',
    cuerpo: { observacion },
  });
}

/** Reactiva un grupo: sus miembros recuperan el acceso que tenian. */
export function reactivarGrupo(grupoId: number, observacion: string): Promise<Grupo> {
  return solicitar(`/seguridad/grupos/${grupoId}/reactivacion`, {
    metodo: 'POST',
    cuerpo: { observacion },
  });
}

/** La vigencia de un grupo. Mismas reglas que la de una cuenta: ver {@link fijarVigenciaDeUsuario}. */
export function fijarVigenciaDeGrupo(
  grupoId: number,
  vigencia: CambioDeVigencia,
  observacion: string,
): Promise<Grupo> {
  return solicitar(`/seguridad/grupos/${grupoId}/vigencia`, {
    metodo: 'PUT',
    cuerpo: { ...vigencia, observacion },
  });
}

/**
 * Alta de un usuario: **la fila del padron, no la cuenta del proveedor** (#572).
 *
 * Un usuario del SGTM son **dos mitades** —esta fila y la cuenta del proveedor
 * de identidad (ADR-0005)— y esta operacion escribe la primera. La cuenta se
 * declara aparte, en `despliegue/identidad/municipalidades/<ubigeo>.json`, que
 * es la fuente versionada que la reproduce si el cluster se reconstruye
 * (ADR-0012 §5). Mientras esa cuenta no exista, la persona figura en el padron,
 * admite permisos y **no puede entrar**.
 *
 * **No hay campo de clave, y no puede haberlo**: la credencial vive en el
 * proveedor y este sistema no la recibe nunca. Tampoco hay campo para el
 * identificador OIDC: el enlace entre las dos mitades es la `cuenta`, que tiene
 * que ser el mismo `preferred_username` con el que la persona entra.
 *
 * Una cuenta ya usada en esta municipalidad es **409**.
 */
export function registrarUsuario(
  alta: {
    cuenta: string;
    nombre: string;
    correo?: string | null;
    vigenciaDesde?: string | null;
    vigenciaHasta?: string | null;
  },
  observacion: string,
): Promise<Usuario> {
  return solicitar('/seguridad/usuarios', { metodo: 'POST', cuerpo: { ...alta, observacion } });
}

/**
 * Una copia de seguridad registrada. Es `RespaldoResource`.
 *
 * `ultimaRestauracionVerificada` es la columna que esta pantalla existe para
 * enseñar (#558): una copia sin restauracion probada no es una copia (RNF-079).
 * **Nulo significa «nunca se probo»**, no «hoy» y no «no hace falta»: lo escribe
 * el simulacro de restauracion cuando restaura de verdad, y hasta entonces no
 * hay nada que decir. Por eso la celda lleva el guion largo y su motivo, y no un
 * cero ni un «no» —el artboard ponia ahi «hace 94 dias», que se lee como una
 * medicion y llevaria a auditar lo que no toca—.
 */
export type Respaldo = {
  id: number;
  inicio: string;
  fin: string | null;
  resultado: string;
  destino: string;
  tamanoBytes: number | null;
  detalle: string | null;
  ultimaRestauracionVerificada: string | null;
  ultimaRestauracionVerificadaPor: string | null;
};

/**
 * El estado de las copias.
 *
 * Es un `POST` que **consulta**: asi lo declara el contrato, derivado de la
 * pantalla del prototipo. La paginacion viaja igualmente por la consulta.
 */
export const listarRespaldos = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<Respaldo>>('/seguridad/respaldos', {
    metodo: 'POST',
    parametros: { ...p },
    senal: s,
  });

/**
 * Un conjunto de parametros de un ejercicio, con su estado. Es
 * `ParametrosController.ConjuntoResource`.
 *
 * **No lleva ninguna cifra**, y es a proposito: lo que esta operacion publica es
 * la IDENTIDAD del juego de valores con que se emitio un ejercicio —cual, en que
 * version y si esta sellado—, no la UIT ni las alicuotas. Una vez sellado, el
 * conjunto es inmutable y esa es la garantia de que recalcular 2027 en 2037 da
 * el mismo centimo.
 */
export type ConjuntoDeParametros = {
  id: number;
  ejercicio: number;
  version: number;
  estado: string;
  fechaSellado: string | null;
  usuarioSellado: string | null;
};

export const listarConjuntosDeParametros = (p: Paginacion, s?: AbortSignal) =>
  solicitar<RespuestaPaginada<ConjuntoDeParametros>>('/seguridad/parametros', {
    parametros: { ...p },
    senal: s,
  });

/**
 * Si un ejercicio tiene conjunto de parametros SELLADO. Es
 * `ParametrosController.EjercicioParametrizadoResource`.
 *
 * **Ninguna cifra, y ninguna promesa.** Lo que contesta es si HAY conjunto
 * sellado, no si el calculo va a salir: sin conjunto seguro que no, pero con el
 * puede faltar dentro alguna llave que la regla pida —`INTERES_FRACCIONAMIENTO:
 * ORDINARIO`, `CUOTAS_MAXIMAS_FRACCIONAMIENTO:ORDINARIO`, `REDONDEO:CUOTA`— y
 * eso sigue saliendo como 422 al calcular (#547, #562). Medido contra este
 * ambiente: el ejercicio 2026 contesta `sellado: true` y la simulacion de un
 * fraccionamiento contesta igualmente 422 nombrando
 * `CUOTAS_MAXIMAS_FRACCIONAMIENTO:ORDINARIO`. Quien la use tiene que decir esa
 * mitad y no la otra.
 *
 * `conjuntoId` y `version` son nulos cuando `sellado` es falso, y son la
 * IDENTIDAD del juego de valores —lo mismo que `ConvenioResource
 * .conjuntoDeParametros` publica cuando el convenio ya existe—, nunca sus
 * cifras: esas siguen detras del permiso de `parametros` (REQ-03).
 */
export type EjercicioParametrizado = {
  ejercicio: number;
  sellado: boolean;
  conjuntoId: number | null;
  version: number | null;
};

/**
 * Pregunta por UN ejercicio, con el numero en la ruta.
 *
 * No exige ninguna opcion del catalogo —el backend la sirve con el centinela
 * `SESION_PROPIA` (#605)—, asi que la puede llamar quien fracciona sin tener
 * que administrar los parametros del sistema. Fuera del rango 1990 a 2100 es un
 * 422 nombrando el rango, que **no** es lo mismo que «ese ejercicio no esta
 * sellado»: eso es un 200 diciendo que no.
 */
export const ejercicioParametrizado = (ejercicio: number, s?: AbortSignal) =>
  solicitar<EjercicioParametrizado>(`/seguridad/parametros/ejercicios/${ejercicio}`, { senal: s });
