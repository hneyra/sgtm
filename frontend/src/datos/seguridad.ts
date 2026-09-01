/* Datos de muestra del módulo de Seguridad, copiados literalmente del artboard
   `Seguridad.dc.html`. Nada de esto viaja a ningún backend: es la maqueta. */

/* ══════════ Niveles y accesos ══════════ */

/** Los siete privilegios. El rotulo que usa el manual para `ESPECIAL` es
 *  «Total», y no lo es: ver el comentario de `NIVELES`. */
export type Nivel = 'Especial' | 'Ejecuta' | 'Consulta' | 'Ingresa' | 'Modifica' | 'Anula' | 'Imprime';

/**
 * Los siete privilegios, con el nombre que el dominio les da.
 *
 * **No existe ninguno que se llame «Total».** El artboard lo dibuja primero y
 * como si implicara los otros seis, y en el backend es `ESPECIAL`: uno mas,
 * ni mayor ni menor. Sobre ese rotulo falso estaba construido el primer riesgo
 * del panel —«tres cuentas con privilegio Especial»—, que decia otra cosa de la que
 * parecia.
 */
export const NIVELES: Nivel[] = ['Ejecuta', 'Consulta', 'Ingresa', 'Modifica', 'Anula', 'Imprime', 'Especial'];

export type Acceso = {
  id: string;
  label: string;
  modulo: string;
  /** Si el acceso mueve dinero. Es lo que tiñe la fila de la matriz. */
  sensible: boolean;
};

/** Los accesos, con el módulo del que cuelgan y si mueven dinero. */
export const ACCESOS: Acceso[] = [
  { id: 'caja', label: 'Caja tributaria', modulo: 'Tesorería', sensible: true },
  { id: 'anulacion', label: 'Anulación de recibo', modulo: 'Tesorería', sensible: true },
  { id: 'baja', label: 'Baja de deuda', modulo: 'Rentas · Registro', sensible: true },
  { id: 'prescripcion', label: 'Prescripción', modulo: 'Valores', sensible: true },
  { id: 'ficha', label: 'Ficha urbana individual', modulo: 'Catastro', sensible: false },
  { id: 'aranceles', label: 'Aranceles de terreno', modulo: 'Catastro', sensible: true },
  { id: 'acta', label: 'Acta de inspección', modulo: 'Fiscalización', sensible: false },
  { id: 'papeleta', label: 'Papeletas de tránsito', modulo: 'Tránsito', sensible: false },
  { id: 'permisos', label: 'Permisos y accesos', modulo: 'Seguridad', sensible: true },
];

/* ══════════ Grupos y usuarios ══════════ */

/** Los niveles concedidos, por acceso. La clave es el `id` del acceso. */
export type Permisos = Record<string, Nivel[]>;

export type Grupo = { label: string; miembros: string[]; permisos: Permisos };

/** Grupos con sus permisos, y usuarios con los suyos. El permiso efectivo de un
 *  usuario es la unión de los propios y los de sus grupos: es lo que las seis
 *  pantallas del sistema actual obligaban a juntar de memoria. */
export const GRUPOS: Record<string, Grupo> = {
  ADMINISTRADORES: {
    label: 'ADMINISTRADORES',
    miembros: ['jquispe', 'aayca'],
    permisos: { permisos: ['Especial'], caja: ['Consulta'], baja: ['Consulta'], aranceles: ['Consulta'] },
  },
  CAJA: {
    label: 'CAJA',
    miembros: ['jcardenas', 'mrios'],
    permisos: { caja: ['Ejecuta', 'Consulta', 'Ingresa', 'Imprime'], papeleta: ['Consulta'] },
  },
  RENTAS: {
    label: 'RENTAS',
    miembros: ['mrios', 'lpena'],
    permisos: { baja: ['Consulta', 'Ingresa'], ficha: ['Consulta'], papeleta: ['Consulta', 'Imprime'] },
  },
  CATASTRO: {
    label: 'CATASTRO',
    miembros: ['vreto'],
    permisos: { ficha: ['Consulta', 'Ingresa', 'Modifica', 'Imprime'], acta: ['Consulta'], aranceles: ['Consulta'] },
  },
};

export type EstadoDeCuenta = 'Activa' | 'Inactiva';

export type Usuario = {
  label: string;
  nombre: string;
  estado: EstadoDeCuenta;
  /** Días desde el último cambio de contraseña. Pasados 365 caducó. */
  clave: number;
  propios: Permisos;
};

export const USUARIOS: Record<string, Usuario> = {
  jquispe: { label: 'jquispe', nombre: 'QUISPE PEÑA, JORGE', estado: 'Activa', clave: 12, propios: {} },
  aayca: { label: 'aayca', nombre: 'AYCA GONZALES, ALBERTO', estado: 'Activa', clave: 384, propios: { anulacion: ['Especial'] } },
  jcardenas: { label: 'jcardenas', nombre: 'CÁRDENAS VEGA, JOSÉ', estado: 'Activa', clave: 44, propios: { anulacion: ['Ejecuta', 'Consulta'] } },
  mrios: { label: 'mrios', nombre: 'RÍOS MENDOZA, MARÍA', estado: 'Activa', clave: 8, propios: { prescripcion: ['Consulta', 'Ingresa'] } },
  lpena: { label: 'lpena', nombre: 'PEÑA SANDOVAL, LUIS', estado: 'Activa', clave: 201, propios: { acta: ['Ejecuta', 'Consulta', 'Ingresa', 'Modifica'] } },
  vreto: { label: 'vreto', nombre: 'RETO SANTOS, VÍCTOR', estado: 'Activa', clave: 96, propios: {} },
  fruiz: { label: 'fruiz', nombre: 'RUIZ INGA, FERNANDO', estado: 'Inactiva', clave: 812, propios: { caja: ['Especial'] } },
};

/* ══════════ Auditoría ══════════ */

/** Fecha y hora, usuario, módulo, acto, detalle, IP y riesgo. */
export type FilaDeAuditoria = [string, string, string, string, string, string, string];

export const AUDITORIA: FilaDeAuditoria[] = [
  ['13/08/2026 09:41', 'jcardenas', 'Tesorería', 'Anulación de recibo', 'Recibo 0003-0041184 · S/ 1,245.00', '10.4.2.18', 'Alto'],
  ['13/08/2026 08:12', 'jquispe', 'Seguridad', 'Cambio de permisos', 'aayca: Anulación de recibo → Especial', '10.4.2.3', 'Alto'],
  ['12/08/2026 17:04', 'mrios', 'Rentas · Registro', 'Baja de deuda', '2 cuotas · S/ 1,613.96 · prescripción', '10.4.2.22', 'Alto'],
  ['12/08/2026 16:48', 'lpena', 'Fiscalización', 'Cierre de acta', 'ACT-2026-00418 · diferencia +33.50 m²', '10.4.5.7', 'Medio'],
  ['12/08/2026 11:20', 'vreto', 'Catastro', 'Modificación de ficha', '01-1042-0004 · área construida 136 → 198', '10.4.5.11', 'Medio'],
  ['11/08/2026 08:02', 'jquispe', 'Seguridad', 'Cambio del ejercicio', '2025 → 2026 · global a la sesión', '10.4.2.3', 'Alto'],
  ['10/08/2026 15:38', 'fruiz', 'Tesorería', 'Intento de acceso denegado', 'Caja tributaria · cuenta inactiva', '181.66.4.90', 'Alto'],
];

/** Las columnas de la bitácora. El segundo elemento dice si la celda es
 *  numérica y va a la derecha; en esta tabla ninguna lo es. */
export const COLUMNAS_DE_AUDITORIA: [string, number][] = [
  ['Fecha y hora', 0],
  ['Usuario', 0],
  ['Módulo', 0],
  ['Acto', 0],
  ['Detalle', 0],
  ['IP', 0],
  ['Riesgo', 0],
];

/** Lo que dice el pie del listado: la bitácora completa del ejercicio. */
export const REGISTROS_DE_AUDITORIA = '84,182';

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

export type TablaDeSistema = {
  min: string;
  cols: [string, number][];
  filas: string[][];
  /** El índice de la columna que se dibuja como insignia. */
  insignia?: number;
};

export type PanelDeSistema = {
  label: string;
  titulo: string;
  nota: string;
  aviso: string;
  avisoTono: '' | 'warn' | 'bad';
  campos: CampoDeSistema[];
  tabla?: TablaDeSistema;
  pie: string;
  primaria: string;
};

/** Las cuatro pestañas de «Sistema». Las dos primeras cifras dependen del
 *  ejercicio de trabajo, que es de la sesión y no del módulo. */
export const panelesDeSistema = (ejercicio: string): PanelDeSistema[] => [
  {
    label: 'Ejercicio de trabajo',
    titulo: 'Cambiar el ejercicio de trabajo',
    nota: 'El ejercicio es global a la sesión y decide sobre qué año escriben los doce módulos. Cambiarlo con una caja abierta es lo que produce recibos con el año equivocado.',
    aviso: 'Hay una caja abierta (C-3, turno mañana). Cambiar el ejercicio ahora afectaría a los recibos que se emitan después.',
    avisoTono: 'warn',
    campos: [
      { k: 'ejActual', l: 'Ejercicio actual', t: 'ro', v: ejercicio },
      { k: 'ejNuevo', l: 'Cambiar a', t: 'sel', v: ejercicio, o: ['2026', '2025', '2024', '2023'] },
      { k: 'ejMotivo', l: 'Motivo del cambio', t: 'text', ancho: true, v: '', ph: 'Queda en la auditoría' },
    ],
    pie: 'El cambio se anota en la bitácora con tu usuario y la hora.',
    primaria: 'Cambiar el ejercicio',
  },
  {
    label: 'Parámetros',
    titulo: 'Parámetros del sistema',
    nota: 'Los valores que los doce módulos leen. Cambiar la UIT recalcula multas, mínimos imponibles y tramos de escala en todo el sistema.',
    aviso: '',
    avisoTono: '',
    campos: [
      { k: 'pUit', l: 'UIT del ejercicio (S/)', t: 'text', v: '5,350.00', ayuda: 'Afecta a predial, vehicular, multas y CUIS' },
      { k: 'pIpm', l: 'IPM para alcabala', t: 'text', v: '1.0206' },
      { k: 'pInteres', l: 'Interés moratorio mensual', t: 'text', v: '0.90 %' },
      { k: 'pFracc', l: 'Interés de fraccionamiento', t: 'text', v: '0.80 %' },
      { k: 'pCustodia', l: 'Tasa diaria de custodia (S/)', t: 'text', v: '18.00' },
      { k: 'pEmision', l: 'Derecho de emisión (S/)', t: 'text', v: '4.50' },
      { k: 'pCaducidad', l: 'Caducidad de contraseña (días)', t: 'text', v: '365' },
      { k: 'pIntentos', l: 'Intentos antes de bloquear', t: 'text', v: '5' },
    ],
    pie: 'Un parámetro mal puesto no da error: da cifras equivocadas en todo el sistema. El cambio queda en la auditoría.',
    primaria: 'Guardar parámetros',
  },
  {
    label: 'Mi contraseña',
    titulo: 'Cambiar mi contraseña',
    nota: 'La contraseña es personal y caduca cada 365 días. Compartirla es lo que hace que la auditoría deje de servir: los actos aparecen firmados por quien no los hizo.',
    aviso: 'Tu contraseña caduca en 12 días.',
    avisoTono: 'warn',
    campos: [
      { k: 'cActual', l: 'Contraseña actual', t: 'clave', v: '', ph: '••••••••' },
      { k: 'cNueva', l: 'Contraseña nueva', t: 'clave', v: '', ph: 'Mínimo 10 caracteres' },
      { k: 'cRepetir', l: 'Repetir la nueva', t: 'clave', v: '', ph: '••••••••' },
    ],
    pie: 'Al cambiarla se cierran las demás sesiones abiertas con tu usuario.',
    primaria: 'Cambiar la contraseña',
  },
  {
    label: 'Copias de seguridad',
    titulo: 'Copias de seguridad',
    nota: 'Una copia sin restauración probada no es una copia. La columna que importa es la última restauración verificada, no la última copia hecha.',
    aviso: 'La última restauración verificada es de hace 94 días. Una copia que nadie ha probado a restaurar no protege nada.',
    avisoTono: 'bad',
    campos: [
      {
        k: 'bDestino',
        l: 'Destino',
        t: 'sel',
        ancho: true,
        v: 'ALMACENAMIENTO EN NUBE — REGIÓN LIMA',
        o: ['ALMACENAMIENTO EN NUBE — REGIÓN LIMA', 'SERVIDOR LOCAL — SALA DE CÓMPUTO', 'DISCO EXTERNO'],
      },
      { k: 'bFrecuencia', l: 'Frecuencia', t: 'sel', v: 'DIARIA', o: ['DIARIA', 'CADA 12 HORAS', 'SEMANAL'] },
      { k: 'bRetencion', l: 'Retención (días)', t: 'text', v: '90' },
      { k: 'bCifrado', l: 'Cifrado en reposo', t: 'chk', v: true, ph: 'Obligatorio: la base tiene datos personales' },
    ],
    tabla: {
      min: '700px',
      cols: [['Fecha', 0], ['Tipo', 0], ['Tamaño', 0], ['Destino', 0], ['Restauración probada', 0]],
      filas: [
        ['13/08/2026 02:00', 'Completa', '18.4 GB', 'Nube — Lima', 'No probada'],
        ['12/08/2026 02:00', 'Completa', '18.4 GB', 'Nube — Lima', 'No probada'],
        ['11/08/2026 02:00', 'Completa', '18.3 GB', 'Nube — Lima', 'No probada'],
        ['11/05/2026 02:00', 'Completa', '17.1 GB', 'Nube — Lima', 'Verificada'],
      ],
      insignia: 4,
    },
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
