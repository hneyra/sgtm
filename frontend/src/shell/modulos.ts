import type { Trazos } from '../ds/Icono';
import { ICO } from '../ds/iconos';

/** Un destino es una de las cuatro a seis paradas en que el rediseño resume
 *  las 134 opciones del manual.
 *
 *  **Ni la nota ni la pastilla llevan cifras de aquí.** Las llevaron, y eran las
 *  del prototipo: «62,418 en el padrón» sobre las 16 personas de una
 *  municipalidad y las 10 603 de otra, y una pastilla en rojo diciendo «4,036
 *  pendientes» que no cambiaba con nadie. Un recuento sólo lo puede poner quien
 *  lo ha contado, y eso es el módulo: `pastillasDeDestino` y `notasDeDestino`
 *  del shell. Lo que queda escrito aquí describe la pantalla, no su contenido. */
export type Destino = {
  k: string;
  label: string;
  nota: string;
  icono: Trazos;
  /* No hay `pastilla` ni `tono` a propósito: si el catálogo pudiera declararlos,
     la cifra del prototipo volvería a entrar por aquí sin que nadie la contara. */
};

export type Sesion = { iniciales: string; nombre: string; rol: string };

export type Modulo = {
  k: string;
  /** El rótulo del riel y de la cabecera del panel. */
  label: string;
  /** Cuántas opciones del manual resume, para el pie de la paleta. */
  opciones: number;
  destinos: Destino[];
  /** El botón de acción del panel. Consultas no tiene: no registra nada. */
  accion?: { label: string; k: string };
  /** La entrada de «Documentos» al pie del panel. */
  documento?: { label: string; k: string };
  /** La frase que cierra el panel cuando no hay documentos. */
  pie?: string;
  /** Lo que se anuncia al cambiar de ejercicio. Cada módulo dice qué se
   *  recargó, porque cambiar de ejercicio no significa lo mismo en todos. */
  avisoDeEjercicio: string;
  sesion: Sesion;
};

export const MODULOS: Modulo[] = [
  {
    k: 'inicio',
    label: 'Inicio',
    opciones: 2,
    destinos: [],
    pie: 'Inicio no es un módulo: es la respuesta a «a quién atiendes». Cambia según quién entra.',
    avisoDeEjercicio: '.',
    sesion: { iniciales: 'JC', nombre: 'J. Cárdenas', rol: 'Rentas · ventanilla' },
  },
  {
    k: 'catastro',
    label: 'Catastro',
    opciones: 13,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'Lo que te toca hoy', icono: ICO.inicio },
      { k: 'predios', label: 'Predios', nota: 'Ficha, historial y conciliación', icono: ICO.lupa },
      { k: 'mapa', label: 'Mapa catastral', nota: 'Buscar por manzana y lote', icono: ICO.mapa },
      { k: 'territorio', label: 'Territorio', nota: 'Sectores, manzanas y vías', icono: ICO.rejilla },
      { k: 'valores', label: 'Valores del ejercicio', nota: 'Aranceles y depreciación', icono: ICO.barras },
    ],
    accion: { label: 'Registrar predio', k: 'alta' },
    documento: { label: 'Ficha del contribuyente', k: 'reporte' },
    avisoDeEjercicio: ': se recargaron aranceles y valores unitarios.',
    sesion: { iniciales: 'JC', nombre: 'J. Cárdenas', rol: 'Técnico catastral' },
  },
  {
    k: 'rentas',
    label: 'Rentas · Registro',
    opciones: 15,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'Estado de la emisión', icono: ICO.inicio },
      { k: 'padron', label: 'Contribuyentes', nota: 'Personas, predios y vehículos', icono: ICO.persona },
      { k: 'determinar', label: 'Determinaciones', nota: '6 tipos de cálculo', icono: ICO.barras },
      { k: 'transferir', label: 'Transferencias', nota: 'Predio y vehículo', icono: ICO.intercambio },
      { k: 'deuda', label: 'Movimientos de deuda', nota: 'Alta y baja', icono: ICO.caja },
    ],
    accion: { label: 'Nuevo contribuyente', k: 'alta' },
    documento: { label: 'Declaración jurada — HR, PU, PR', k: 'reporte' },
    avisoDeEjercicio: ': se recargaron UIT, escala y tablas.',
    sesion: { iniciales: 'JC', nombre: 'J. Cárdenas', rol: 'Rentas · ventanilla' },
  },
  {
    k: 'fiscalizacion',
    label: 'Fiscalización',
    opciones: 8,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'El embudo del programa', icono: ICO.inicio },
      { k: 'deteccion', label: 'Detección', nota: 'Omisos y subvaluadores', icono: ICO.lupaMas },
      { k: 'programas', label: 'Programas', nota: 'Programación y seguimiento', icono: ICO.calendario },
      { k: 'actas', label: 'Actas de inspección', nota: 'Campo y gabinete', icono: ICO.portapapeles },
      { k: 'resultados', label: 'Resultados', nota: 'Deuda determinada', icono: ICO.barras },
    ],
    accion: { label: 'Levantar acta', k: 'acta' },
    documento: { label: 'Resolución de determinación', k: 'reporte' },
    avisoDeEjercicio: ': se recargaron programas y cruces.',
    sesion: { iniciales: 'RM', nombre: 'R. Mendoza Cruz', rol: 'Fiscalizador · IM-0412' },
  },
  {
    k: 'transito',
    label: 'Tránsito',
    opciones: 23,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'La vida de una papeleta', icono: ICO.inicio },
      { k: 'padron', label: 'Papeletas', nota: 'Impuestas, notificadas y resueltas', icono: ICO.tabla },
      { k: 'internamiento', label: 'Internamiento', nota: 'Depósito municipal', icono: ICO.vehiculo },
      { k: 'procesos', label: 'Procesos', nota: 'Valores, número, documentos', icono: ICO.engranajeMas },
      { k: 'codigos', label: 'Códigos de tránsito', nota: 'Tipificación del reglamento', icono: ICO.hojaLineas },
      { k: 'reportes', label: 'Centro de reportes', nota: '15 reportes', icono: ICO.barras },
    ],
    accion: { label: 'Registrar papeleta', k: 'alta' },
    pie: 'Los catorce reportes del manual viven en un solo centro, no en catorce entradas de menú.',
    avisoDeEjercicio: ': se recargó la UIT y los reportes.',
    sesion: { iniciales: 'AV', nombre: 'A. Vílchez Rojas', rol: 'Inspector · IM-0412' },
  },
  {
    k: 'sanciones',
    label: 'Infracciones administrativas',
    opciones: 13,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'El procedimiento completo', icono: ICO.inicio },
      { k: 'lista', label: 'Expedientes', nota: 'Actas y procedimiento sancionador', icono: ICO.tabla },
      { k: 'cuis', label: 'Cuadro CUIS', nota: 'Infracciones tipificadas', icono: ICO.hojaLineas },
      { k: 'valores', label: 'Generación de valores', nota: 'Multas firmes por cobrar', icono: ICO.caja },
      { k: 'reportes', label: 'Centro de reportes', nota: '6 reportes', icono: ICO.barras },
    ],
    accion: { label: 'Nueva notificación', k: 'alta' },
    pie: 'El procedimiento tiene tres actos en orden. El expediente los enseña en ese orden y no deja saltárselos.',
    avisoDeEjercicio: ': se recargó la UIT y el cuadro CUIS.',
    sesion: { iniciales: 'VR', nombre: 'V. Reto Santos', rol: 'Fiscalizador · IM-0244' },
  },
  {
    k: 'tesoreria',
    label: 'Tesorería',
    opciones: 10,
    destinos: [
      { k: 'panel', label: 'Panel del turno', nota: 'Lo recaudado hoy', icono: ICO.inicio },
      { k: 'cobrar', label: 'Cobrar', nota: 'Deuda y tasas', icono: ICO.caja },
      { k: 'convenios', label: 'Convenios', nota: 'Fraccionar y seguir', icono: ICO.hojaLineas },
      { k: 'recibos', label: 'Recibos', nota: 'Duplicar y anular', icono: ICO.recibo },
      { k: 'cierre', label: 'Cierre de caja', nota: 'Arqueo del turno', icono: ICO.candado },
      { k: 'recaudacion', label: 'Recaudación', nota: 'Avance y por área', icono: ICO.barras },
    ],
    accion: { label: 'Cobrar', k: 'cobrar' },
    pie: 'Todo lo que se hace aquí ocurre dentro de un turno abierto, y el turno termina en un arqueo que cuadra.',
    avisoDeEjercicio: ': se recargó el avance de recaudación.',
    sesion: { iniciales: 'JC', nombre: 'J. Cárdenas Vega', rol: 'Cajero · Caja C-3' },
  },
  {
    k: 'consultas',
    label: 'Consultas',
    opciones: 11,
    destinos: [
      { k: 'buscar', label: 'Buscar', nota: 'Un campo para todo', icono: ICO.lupa },
      { k: 'cuenta', label: 'Estado de cuenta', nota: 'Seis vistas del sujeto', icono: ICO.tabla },
      { k: 'constancia', label: 'Constancia de no adeudo', nota: 'El documento', icono: ICO.hojaVisto },
    ],
    pie: 'Once opciones de menú eran once formas de la misma pregunta. Aquí es una sola: quién es y qué le pasa.',
    avisoDeEjercicio: ': se recalculó la deuda a esa fecha.',
    sesion: { iniciales: 'JC', nombre: 'J. Cárdenas', rol: 'Ventanilla · consulta' },
  },
  {
    k: 'valores',
    label: 'Valores',
    opciones: 6,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'Qué le falta a cada valor', icono: ICO.inicio },
      { k: 'lista', label: 'Valores', nota: 'Emisión, notificación y prescripción', icono: ICO.hoja },
      { k: 'emision', label: 'Emisión', nota: 'Individual y masiva', icono: ICO.mas },
      { k: 'prescripcion', label: 'Prescripción', nota: 'Declarar y extinguir', icono: ICO.reloj },
    ],
    accion: { label: 'Emitir valores', k: 'emision' },
    pie: 'Un valor sin notificar no cobra y prescribe igual. El módulo se ordena por lo que le falta a cada uno.',
    avisoDeEjercicio: ': se recalcularon los plazos de prescripción.',
    sesion: { iniciales: 'MR', nombre: 'M. Ríos Mendoza', rol: 'Valores · emisión' },
  },
  {
    k: 'coactiva',
    label: 'Coactiva',
    opciones: 12,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'La cartera del ejecutor', icono: ICO.inicio },
      { k: 'importacion', label: 'Importación', nota: 'Valores firmes por recibir', icono: ICO.descarga },
      { k: 'lista', label: 'Expedientes', nota: 'Cartera del procedimiento coactivo', icono: ICO.tabla },
      { k: 'deuda', label: 'Deuda en coactiva', nota: 'Con y sin beneficio', icono: ICO.caja },
    ],
    accion: { label: 'Importar valores', k: 'importacion' },
    pie: 'Cada acto del procedimiento añade costas al obligado. El expediente lo dice en cada paso, antes de dictarlo.',
    avisoDeEjercicio: ': se actualizó la deuda de la cartera.',
    sesion: { iniciales: 'HC', nombre: 'H. Checa Fernández', rol: 'Ejecutor coactivo' },
  },
  {
    k: 'licencias',
    label: 'Autorizaciones y licencias',
    opciones: 11,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'Solicitudes y plazos', icono: ICO.inicio },
      { k: 'lista', label: 'Solicitudes', nota: 'Los tres trámites', icono: ICO.edificio },
      { k: 'catalogos', label: 'Catálogos', nota: 'CIIU y certificados', icono: ICO.hoja },
      { k: 'reportes', label: 'Centro de reportes', nota: '4 reportes', icono: ICO.barras },
    ],
    accion: { label: 'Nueva solicitud', k: 'alta' },
    pie: 'Los tres trámites —funcionamiento, edificación y anuncio— tienen la misma forma: requisitos, plazo y una autorización con vigencia.',
    avisoDeEjercicio: ': se recargaron el padrón y las tasas del TUPA.',
    sesion: { iniciales: 'LP', nombre: 'L. Peña Sandoval', rol: 'Comercialización' },
  },
  {
    k: 'seguridad',
    label: 'Seguridad',
    opciones: 11,
    destinos: [
      { k: 'panel', label: 'Panel del módulo', nota: 'Riesgos y movimientos', icono: ICO.inicio },
      { k: 'accesos', label: 'Accesos', nota: 'Quién puede hacer qué', icono: ICO.rejillaAcc },
      { k: 'auditoria', label: 'Auditoría', nota: 'Quién hizo qué', icono: ICO.hojaLineas },
      { k: 'sistema', label: 'Sistema', nota: 'Ejercicio, parámetros, copias', icono: ICO.engranaje },
    ],
    accion: { label: 'Nuevo usuario', k: 'alta' },
    pie: 'Seis opciones de menú eran las piezas de una sola pregunta: quién puede hacer qué, y de dónde le viene el permiso.',
    avisoDeEjercicio: ': el cambio queda en la auditoría.',
    sesion: { iniciales: 'JQ', nombre: 'J. Quispe Peña', rol: 'Administrador' },
  },
];

export const moduloDe = (k: string) => MODULOS.find((m) => m.k === k) ?? MODULOS[0];
