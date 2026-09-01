/* Datos de muestra del módulo de Catastro, copiados literalmente del artboard
   `Catastro.dc.html` y de su anexo `Catastro - Estados y comparación.dc.html`.
   Nada de esto viaja a ningún backend: es la maqueta.

   La entidad del port es la Municipalidad Distrital de Catacaos, así que donde
   el artboard escribe «Sullana» va «Catacaos» (PORTAR.md). Catacaos es distrito
   de la provincia de Piura —ubigeo 200104, «departamento 20 (Piura), provincia
   01 (Piura), distrito 04», como lo declara `infra/carga-de-datos/ejemplos/`—,
   de modo que la provincia del artboard pasa a PIURA y el distrito a CATACAOS.
   La oficina registral que sirve a Catacaos es la de Piura; la de Sullana se
   queda en la lista porque un título puede estar inscrito allí. */

/* ══════════ El código de referencia catastral ══════════
   Teclear veintitrés dígitos de corrido es la primera forma de equivocarse;
   compuesto, cada tramo se comprueba solo. `[rótulo, clave, longitud]`. */
export const TRAMOS: readonly [string, string, number][] = [
  ['Distrito', 'distrito', 6],
  ['Sector', 'sector', 2],
  ['Manzana', 'manzana', 3],
  ['Lote', 'lote', 3],
  ['Edific.', 'edif', 2],
  ['Entrada', 'entrada', 2],
  ['Piso', 'piso', 2],
  ['Unidad', 'unidad', 3],
];

/** El código que ya está en uso. Se copia del artboard tal cual —allí es un
 *  literal de veintiún dígitos frente a los veintitrés que exigen los ocho
 *  tramos, así que la rama de «Código ya usado» no llega a dispararse—; lo
 *  único que cambia es el ubigeo, que aquí es el de Catacaos. */
export const CODIGO_YA_USADO = '200104010420040101020';

/* ══════════ Las seis secciones de la ficha ══════════
   Seis grupos donde el sistema actual pone once pestañas: lo que se agrupa es
   lo que se decide junto, no lo que la base guarda junto. Cada campo conserva
   su etiqueta del manual y, cuando el manual usa una sigla, la sigla queda
   visible al lado del nombre en claro. */

export type TipoDeCampo = 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro' | 'codigo';
export type Modalidad = 'urbana' | 'economica' | 'bienes' | 'rural';

export type CampoDeFicha = {
  k: string;
  l: string;
  t: TipoDeCampo;
  /** La sigla del manual, si la hay: MEP, ECS, CUC, S/, m²… */
  c?: string;
  o?: string[];
  ph?: string;
  ayuda?: string;
  ancho?: boolean;
};

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColumnaDeTabla = readonly [string, 0 | 1];

export type TablaDeBloque = {
  titulo: string;
  conteo: string;
  accion: string;
  min: string;
  cols: readonly ColumnaDeTabla[];
  filas: readonly (readonly string[])[];
  nota?: string;
};

/** Un total del pie de un bloque: rótulo, valor y si va sobre el tinte. */
export type TotalDeBloque = readonly [string, string, 0 | 1];

export type BloqueDeFicha = {
  titulo?: string;
  nota?: string;
  modalidad?: Modalidad;
  campos: CampoDeFicha[];
  tabla?: TablaDeBloque;
  totales?: readonly TotalDeBloque[];
};

export type GrupoDeFicha = { id: string; label: string; hint: string; bloques: BloqueDeFicha[] };

export const GRUPOS: GrupoDeFicha[] = [
  {
    id: 'ident',
    label: 'Identificación',
    hint: 'El código del predio, su ficha y el contribuyente al que se le carga',
    bloques: [
      {
        campos: [
          { k: 'cod', l: 'Código de referencia catastral', t: 'codigo', ancho: true, ayuda: 'Sector, manzana, lote, edificación, entrada, piso y unidad. Cambiarlo obliga a recalcular el autovalúo.' },
          { k: 'uso', l: 'Uso del predio', t: 'sel', o: ['Casa habitación', 'Comercio', 'Industria', 'Terreno sin construir', 'Servicios', 'Educación', 'Salud'] },
          { k: 'cuc', l: 'Código único catastral', c: 'CUC', t: 'text', ph: '12 dígitos' },
          { k: 'hoja', l: 'Hoja catastral', t: 'text' },
          { k: 'anterior', l: 'Código catastral anterior', t: 'text', ayuda: 'Solo si el predio viene del padrón migrado' },
          { k: 'contrib', l: 'Contribuyente', t: 'ro' },
          { k: 'predial', l: 'Código predial de rentas', t: 'ro', ayuda: 'Es el mismo código catastral: no hay dos padrones de predios' },
          { k: 'ficha', l: 'Nº de ficha', t: 'text' },
          { k: 'fichaLote', l: 'Nº de ficha por lote', t: 'text' },
          { k: 'unidAcum', l: 'Unidad acumulada al código predial', t: 'text' },
          { k: 'arancel', l: 'Arancel de la vía', t: 'ro', c: 'S/ m²' },
        ],
      },
    ],
  },

  {
    id: 'ubic',
    label: 'Ubicación',
    hint: 'Dónde está el predio y por qué puerta se entra',
    bloques: [
      {
        titulo: 'Dirección del predio',
        campos: [
          { k: 'tipoVia', l: 'Tipo de vía', t: 'sel', o: ['AVENIDA', 'CALLE', 'JIRÓN', 'PASAJE', 'CARRETERA', 'NO ESPECIFICADO'] },
          { k: 'calle', l: 'Vía o calle', t: 'sel', o: ['CALLE BOLÍVAR', 'AV. JOSÉ DE LAMA', 'CALLE SANTA ROSA', 'CALLE LAMA', 'PASAJE EL ALTO'] },
          { k: 'numMun', l: 'Número municipal', t: 'text' },
          { k: 'numAd', l: 'Número adicional', t: 'text' },
          { k: 'tipoPuerta', l: 'Tipo de puerta', t: 'sel', o: ['P — PRINCIPAL', 'S — SECUNDARIA', 'C — COCHERA'] },
          { k: 'condNum', l: 'Condición de numeración', t: 'sel', o: ['CON CERTIFICADO', 'SIN CERTIFICADO', 'NO ESPECIFICADO'] },
          { k: 'certNum', l: 'Nº de certificado de numeración', t: 'text' },
          { k: 'antNum', l: 'Numeración municipal anterior', t: 'text' },
        ],
        tabla: {
          titulo: 'Otras puertas del predio',
          conteo: '2 direcciones',
          accion: '+ Añadir puerta',
          min: '620px',
          cols: [['Nombre de calle', 0], ['Tipo de vía', 0], ['Tipo de puerta', 0], ['Número', 1], ['Adicional', 1], ['Nomenclatura', 0]],
          filas: [
            ['CALLE BOLÍVAR', 'CALLE', 'PRINCIPAL', '539', '—', 'MUNICIPAL'],
            ['CALLE SANTA ROSA', 'CALLE', 'SECUNDARIA', '112', 'A', 'MUNICIPAL'],
          ],
        },
      },
      {
        titulo: 'Territorio',
        nota: 'Departamento, provincia y distrito los pone el sistema desde el sector: no se vuelven a escribir.',
        campos: [
          { k: 'dep', l: 'Departamento', t: 'ro' },
          { k: 'prov', l: 'Provincia', t: 'ro' },
          { k: 'dist', l: 'Distrito', t: 'ro' },
          { k: 'habUrb', l: 'Habilitación urbana', t: 'text' },
          { k: 'zona', l: 'Zona de arbitrios', t: 'sel', o: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'] },
          { k: 'ref', l: 'Referencia', t: 'text', ancho: true, ph: 'Frente al parque, costado del mercado…' },
        ],
      },
    ],
  },

  {
    id: 'titu',
    label: 'Titularidad',
    hint: 'Quién es dueño, con qué documento y en qué porcentaje',
    bloques: [
      {
        campos: [
          { k: 'condTit', l: 'Condición del titular', t: 'sel', o: ['PROPIETARIO ÚNICO', 'COPROPIETARIO', 'POSEEDOR', 'SUCESIÓN INDIVISA', 'ARRENDATARIO', 'OCUPANTE'] },
          { k: 'formaAdq', l: 'Forma de adquisición', t: 'sel', o: ['COMPRA-VENTA', 'DONACIÓN', 'HERENCIA', 'ADJUDICACIÓN', 'PERMUTA', 'PRESCRIPCIÓN ADQUISITIVA'] },
          { k: 'fechaAdq', l: 'Fecha de adquisición', t: 'date' },
          { k: 'docAcre', l: 'Documento que acredita', t: 'sel', o: ['ESCRITURA PÚBLICA', 'MINUTA', 'CONTRATO PRIVADO', 'FICHA REGISTRAL', 'TÍTULO DE PROPIEDAD', 'CONSTANCIA DE POSESIÓN'] },
          { k: 'partida', l: 'Nº de partida registral', t: 'text' },
          { k: 'oficina', l: 'Oficina registral', t: 'sel', o: ['SUNARP — PIURA', 'SUNARP — SULLANA'] },
          { k: 'partic', l: '% de participación', t: 'text' },
          { k: 'litigio', l: 'Predio en litigio', t: 'chk', ph: 'Existe proceso judicial en curso' },
        ],
        tabla: {
          titulo: 'Titulares registrados',
          conteo: '2 titulares · 100.00 %',
          accion: '+ Añadir titular',
          min: '760px',
          cols: [['Cod. contribuyente', 0], ['Nombre / razón social', 0], ['D.N.I.', 0], ['R.U.C.', 0], ['% propiedad', 1], ['Condición', 0], ['Estado civil', 0], ['Desde', 0]],
          filas: [
            ['00000003542', 'VILLEGAS PRADO, ROSA', '03593174', '—', '50.00', 'TITULAR', 'CASADA', '12/03/2014'],
            ['00000003543', 'SERNAQUE PRADO, LUIS', '03421886', '—', '50.00', 'CÓNYUGE', 'CASADO', '12/03/2014'],
          ],
          nota: 'La suma de porcentajes tiene que ser 100.00 para poder grabar.',
        },
      },
    ],
  },

  {
    id: 'constr',
    label: 'Terreno y construcción',
    hint: 'Lo que se midió: área de terreno, pisos y obras complementarias',
    bloques: [
      {
        titulo: 'Áreas del predio',
        campos: [
          { k: 'terLegal', l: 'Terreno según título', c: 'LEGAL', t: 'text' },
          { k: 'terFis', l: 'Terreno medido en campo', c: 'FÍSICO', t: 'text' },
          { k: 'consLegal', l: 'Construcción según título', c: 'LEGAL', t: 'text' },
          { k: 'consFis', l: 'Construcción medida en campo', c: 'FÍSICO', t: 'text' },
        ],
      },
      {
        titulo: 'Piso en edición — 02',
        nota: 'Las siete partidas de acabados llevan la categoría A–G de la tabla de valores unitarios. La letra es la categoría, no una nota.',
        campos: [
          { k: 'nPiso', l: 'Nº de piso', t: 'text' },
          { k: 'mesC', l: 'Mes de construcción', t: 'text' },
          { k: 'anoC', l: 'Año de construcción', t: 'text' },
          { k: 'mep', l: 'Material predominante', c: 'MEP', t: 'sel', o: ['01 — CONCRETO', '02 — LADRILLO', '03 — ADOBE / TAPIA', '04 — QUINCHA', '05 — MADERA', '99 — NO ESPECIFICADO'] },
          { k: 'ecs', l: 'Estado de conservación', c: 'ECS', t: 'sel', o: ['01 — MUY BUENO', '02 — BUENO', '03 — REGULAR', '04 — MALO', '05 — MUY MALO'] },
          { k: 'ecc', l: 'Estado de la construcción', c: 'ECC', t: 'sel', o: ['01 — EN CONSTRUCCIÓN', '02 — INCONCLUSO', '03 — TERMINADO', '04 — EN RUINAS'] },
          { k: 'uca', l: 'Uso de la unidad', c: 'UCA', t: 'sel', o: ['01 — CASA HABITACIÓN', '02 — TIENDA / DEPÓSITO', '03 — EDIFICIO', '99 — NO ESPECIFICADO'] },
          { k: 'muros', l: 'Muros y columnas', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'techos', l: 'Techos', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'pisos', l: 'Pisos', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'puertas', l: 'Puertas y ventanas', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'revest', l: 'Revestimientos', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'banos', l: 'Baños', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'instEle', l: 'Instalaciones eléctricas y sanitarias', t: 'sel', o: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          { k: 'areaDecl', l: 'Área construida declarada', t: 'text' },
          { k: 'areaVer', l: 'Área construida verificada', t: 'text' },
        ],
        tabla: {
          titulo: 'Pisos declarados',
          conteo: '3 pisos · 136.00 m²',
          accion: '+ Añadir piso',
          min: '1080px',
          cols: [['Piso', 0], ['Mes', 0], ['Año', 0], ['MEP', 0], ['ECS', 0], ['ECC', 0], ['Muro', 0], ['Tech', 0], ['Piso', 0], ['Puer', 0], ['Rev', 0], ['Bañ', 0], ['Inst', 0], ['Declarada', 1], ['Verificada', 1], ['UCA', 0]],
          filas: [
            ['01', '01', '1986', '02', '03', '03', 'C', 'F', 'I', 'H', 'I', 'F', 'H', '0.00', '40.00', '99'],
            ['02', '01', '1998', '02', '03', '03', 'C', 'F', 'H', 'F', 'H', 'E', 'G', '0.00', '75.54', '99'],
            ['03', '06', '2014', '02', '02', '03', 'C', 'F', 'G', 'F', 'F', 'H', 'H', '0.00', '20.46', '99'],
          ],
        },
      },
      {
        titulo: 'Obras complementarias',
        nota: 'Cercos, portones, tanques y losas. Se valorizan aparte de la construcción.',
        campos: [
          { k: 'tipoObra', l: 'Tipo de obra', t: 'sel', o: ['CERCO PERIMÉTRICO', 'LOSA DEPORTIVA', 'PISCINA', 'TANQUE ELEVADO', 'POZO', 'PAVIMENTO', 'PORTÓN'] },
          { k: 'unidMed', l: 'Unidad de medida', t: 'sel', o: ['m²', 'ml', 'm³', 'Unidad'] },
          { k: 'metrado', l: 'Metrado', t: 'text' },
          { k: 'largo', l: 'Largo', t: 'text' },
          { k: 'ancho', l: 'Ancho', t: 'text' },
          { k: 'alto', l: 'Alto', t: 'text' },
          { k: 'anoO', l: 'Año', t: 'text' },
          { k: 'estObra', l: 'Estado de conservación', t: 'sel', o: ['MUY BUENO', 'BUENO', 'REGULAR', 'MALO'] },
          { k: 'valUni', l: 'Valor unitario', c: 'S/', t: 'text' },
          { k: 'valObra', l: 'Valor de la obra', c: 'S/', t: 'ro' },
        ],
        tabla: {
          titulo: 'Instalaciones registradas',
          conteo: '2 instalaciones',
          accion: '+ Añadir instalación',
          min: '620px',
          cols: [['Código', 0], ['Descripción', 0], ['Año', 0], ['MEP', 0], ['ECS', 0], ['Metrado', 1], ['Unidad', 0]],
          filas: [
            ['00006', 'CERCO PERIMÉTRICO', '2006', '02', '02', '45.50', 'ml'],
            ['00033', 'PORTÓN DE FIERRO 2.50 ML', '2006', '03', '02', '1.00', 'Unidad'],
          ],
        },
      },
    ],
  },

  {
    id: 'uso',
    label: 'Uso y ocupación',
    hint: 'Quién ocupa el predio, qué actividad hay y qué servicios llegan',
    bloques: [
      {
        titulo: 'Servicios del predio',
        campos: [
          { k: 'agua', l: 'Agua potable', t: 'chk', ph: 'Cuenta con conexión' },
          { k: 'desague', l: 'Desagüe', t: 'chk', ph: 'Cuenta con conexión' },
          { k: 'luz', l: 'Energía eléctrica', t: 'chk', ph: 'Cuenta con conexión' },
          { k: 'gas', l: 'Gas natural', t: 'chk', ph: 'Cuenta con conexión' },
          { k: 'alumbrado', l: 'Alumbrado público', t: 'chk', ph: 'La vía cuenta con alumbrado' },
          { k: 'viaFrente', l: 'Tipo de vía frente al predio', t: 'sel', o: ['ASFALTADA', 'AFIRMADA', 'TROCHA', 'ADOQUINADA'] },
          { k: 'sumLuz', l: 'Nº de suministro de luz', t: 'text' },
          { k: 'sumAgua', l: 'Nº de suministro de agua', t: 'text' },
          { k: 'telPredio', l: 'Teléfono del predio', t: 'text' },
        ],
      },
      {
        titulo: 'Ocupantes no propietarios',
        nota: 'Solo si alguien distinto del titular usa el predio. Un inquilino con negocio es responsable solidario de los arbitrios.',
        campos: [
          { k: 'docInq', l: 'Documento', t: 'text' },
          { k: 'nomInq', l: 'Nombre del ocupante', t: 'text' },
          { k: 'areaInq', l: 'Área ocupada', c: 'm²', t: 'text' },
          { k: 'usoInq', l: 'Uso que da al predio', t: 'sel', o: ['VIVIENDA', 'COMERCIO', 'DEPÓSITO', 'SERVICIOS'] },
          { k: 'iniInq', l: 'Fecha de inicio', t: 'date' },
          { k: 'finInq', l: 'Fecha de término', t: 'date' },
          { k: 'merced', l: 'Merced conductiva', c: 'S/', t: 'text' },
        ],
      },
      {
        modalidad: 'economica',
        titulo: 'Actividad económica',
        nota: 'Este bloque solo aparece porque el predio tiene la modalidad económica activa. Es lo que fiscalización cruza con las licencias.',
        campos: [
          { k: 'nomCom', l: 'Nombre comercial', t: 'text' },
          { k: 'ciiu', l: 'Actividad', c: 'CIIU', t: 'sel', o: ['G-5211-01 — VENTA AL POR MENOR EN ALMACENES', 'D-1549-19 — RESTAURANTE-POLLERÍA', 'H-5520-02 — RESTAURANTES A DOMICILIO'] },
          { k: 'licencia', l: 'Nº de licencia de funcionamiento', t: 'text' },
          { k: 'estLic', l: 'Estado de la licencia', t: 'ro' },
          { k: 'areaNeg', l: 'Área destinada al negocio', c: 'm²', t: 'text' },
          { k: 'trab', l: 'Nº de trabajadores', t: 'text' },
          { k: 'horario', l: 'Horario de atención', t: 'text' },
          { k: 'iniAct', l: 'Fecha de inicio de actividades', t: 'date' },
          { k: 'anuncio', l: 'Anuncio publicitario', t: 'chk', ph: 'Verificar autorización de anuncio' },
        ],
      },
      {
        modalidad: 'bienes',
        titulo: 'Bienes comunes de la edificación',
        nota: 'Áreas comunes de un régimen de propiedad exclusiva y común. Su valor se reparte entre las unidades según el porcentaje de participación.',
        campos: [
          { k: 'codEdif', l: 'Código de edificación', t: 'ro' },
          { k: 'denom', l: 'Denominación', t: 'text' },
          { k: 'nPisosE', l: 'Nº de pisos', t: 'text' },
          { k: 'nUnid', l: 'Nº de unidades', t: 'text' },
          { k: 'areaComT', l: 'Área común de terreno', c: 'm²', t: 'text' },
          { k: 'areaComC', l: 'Área común construida', c: 'm²', t: 'text' },
          { k: 'valBC', l: 'Valor de bienes comunes', c: 'S/', t: 'ro' },
          { k: 'reglamento', l: 'Reglamento interno', t: 'chk', ph: 'Inscrito en registros' },
          { k: 'partidaReg', l: 'Partida del régimen', t: 'text' },
        ],
        tabla: {
          titulo: 'Unidades que participan',
          conteo: '3 unidades · 100.00 %',
          accion: '+ Añadir unidad',
          min: '620px',
          cols: [['Unidad', 0], ['Contribuyente', 0], ['Área exclusiva', 1], ['% participación', 1], ['Valor asignado', 1]],
          filas: [
            ['01-1042-0004-01', 'VILLEGAS PRADO, ROSA', '68.40', '38.00', '—'],
            ['01-1042-0004-02', 'CHÁVEZ SAAVEDRA, CÉSAR', '54.20', '31.00', '—'],
            ['01-1042-0004-03', 'RUFINO VALDERA, EDGAR', '54.20', '31.00', '—'],
          ],
          nota: 'El valor asignado sale de los valores unitarios del ejercicio: no se escribe aquí.',
        },
        totales: [['Área común total', '176.80 m²', 0], ['Valor bienes comunes', '—', 0], ['Participación asignada', '100.00 %', 0], ['Unidades', '3', 1]],
      },
      {
        modalidad: 'rural',
        titulo: 'Predio rústico',
        nota: 'El arancel rural es por hectárea. Leer metros cuadrados aquí calcularía diez mil veces de menos.',
        campos: [
          { k: 'codUC', l: 'Código de unidad catastral', c: 'UC', t: 'ro' },
          { k: 'nomPredio', l: 'Nombre del predio', t: 'text' },
          { k: 'valle', l: 'Valle o sector', t: 'sel', o: ['Valle del Chira', 'Cieneguillo', 'Miguel Checa', 'Lancones'] },
          { k: 'regantes', l: 'Comisión de regantes', t: 'text' },
          { k: 'areaHa', l: 'Área total', c: 'ha', t: 'text' },
          { k: 'tipoTierra', l: 'Tipo de tierra', t: 'sel', o: ['A1 — CULTIVO EN LIMPIO', 'A2 — CULTIVO EN LIMPIO', 'C — CULTIVO PERMANENTE', 'P — PASTOS', 'F — FORESTAL', 'X — PROTECCIÓN'] },
          { k: 'riego', l: 'Condición de riego', t: 'sel', o: ['BAJO RIEGO', 'SECANO'] },
          { k: 'cultivo', l: 'Cultivo predominante', t: 'sel', o: ['ARROZ', 'BANANO', 'MANGO', 'LIMÓN', 'MAÍZ AMARILLO', 'ALGODÓN'] },
          { k: 'arancelHa', l: 'Arancel rural', c: 'S/ ha', t: 'ro' },
          { k: 'valTerRus', l: 'Valor del terreno rústico', c: 'S/', t: 'ro' },
          { k: 'valInstFij', l: 'Valor de instalaciones fijas', c: 'S/', t: 'text' },
          { k: 'autoRural', l: 'Autovalúo rural', c: 'S/', t: 'ro' },
        ],
      },
      {
        titulo: 'Observaciones',
        campos: [
          { k: 'obs', l: 'Observaciones', t: 'area', ancho: true, ph: 'Lo que no cabe en ningún campo y hace falta para defender la ficha' },
          { k: 'verifCampo', l: 'Verificada en campo', t: 'chk', ph: 'Inspección realizada' },
          { k: 'fechaVerif', l: 'Fecha de verificación', t: 'date' },
          { k: 'fuente', l: 'Fuente de la información', t: 'sel', o: ['DECLARACIÓN DEL TITULAR', 'INSPECCIÓN DE CAMPO', 'CONVENIO INTERINSTITUCIONAL', 'BARRIDO CATASTRAL'] },
          { k: 'patrimonio', l: 'Predio declarado patrimonio', t: 'chk', ph: 'Inmueble con valor monumental' },
        ],
      },
    ],
  },

  {
    id: 'valu',
    label: 'Valuación y arbitrios',
    hint: 'Lo que el sistema calcula y los datos que solo sirven para los arbitrios',
    bloques: [
      {
        titulo: 'Datos para el cálculo de arbitrios',
        campos: [
          { k: 'usoRec', l: 'Uso para recolección', c: 'REC', t: 'sel', o: ['01 — CASA HABITACIÓN', '02 — COMERCIO', '03 — INDUSTRIA', '04 — SERVICIOS', '05 — TERRENO SIN CONSTRUIR'] },
          { k: 'usoBar', l: 'Uso para barrido', c: 'BAR', t: 'sel', o: ['01 — CASA HABITACIÓN', '02 — COMERCIO', '03 — INDUSTRIA', '04 — SERVICIOS'] },
          { k: 'frecRec', l: 'Frecuencia de recolección', t: 'sel', o: ['DIARIA', 'INTERDIARIA', 'DOS VECES POR SEMANA', 'SEMANAL'] },
          { k: 'frecBar', l: 'Frecuencia de barrido', t: 'sel', o: ['DIARIA', 'INTERDIARIA', 'SEMANAL'] },
          { k: 'frontis', l: 'Frontis', c: 'ml', t: 'text' },
          { k: 'posicion', l: 'Posición del predio', t: 'sel', o: ['INTERIOR', 'ESQUINA', 'FRENTE A PARQUE', 'FRENTE A VÍA PRINCIPAL'] },
          { k: 'peligro', l: 'Peligrosidad de la zona', t: 'sel', o: ['BAJA', 'MEDIA', 'ALTA'] },
          { k: 'factor', l: 'Factor de distribución de costo', t: 'ro' },
          { k: 'inafecto', l: 'Inafecto a arbitrios', t: 'chk', ph: 'Predio inafecto por norma' },
        ],
      },
      {
        titulo: 'Valuación del ejercicio',
        nota: 'Calculado con los aranceles y valores unitarios sellados para el ejercicio. No se escribe a mano.',
        campos: [],
        totales: [['Valor del terreno', 'S/ 135,745.40', 0], ['Valor de la construcción', 'S/ 96,182.10', 0], ['Otras instalaciones', 'S/ 8,420.00', 0], ['Autovalúo', 'S/ 240,347.50', 1]],
      },
    ],
  },
];

/* ══════════ Los valores de la ficha del predio 01-1042-0004 ══════════ */
export type ValoresDeFicha = Record<string, string | boolean>;

export const BASE: ValoresDeFicha = {
  uso: 'Casa habitación', cuc: '', hoja: '2006-17-010', anterior: '',
  contrib: '00000003542 · VILLEGAS PRADO, ROSA',
  predial: '01-1042-0004', ficha: '004182', fichaLote: '01', unidAcum: '',
  arancel: '198.40',
  tipoVia: 'CALLE', calle: 'CALLE BOLÍVAR', numMun: '539', numAd: '',
  tipoPuerta: 'P — PRINCIPAL', condNum: 'CON CERTIFICADO', certNum: '0004182', antNum: '',
  dep: 'PIURA', prov: 'PIURA', dist: 'CATACAOS', habUrb: 'URB. SANTA ROSA',
  zona: 'Zona 2', ref: 'A media cuadra del mercado modelo',
  condTit: 'COPROPIETARIO', formaAdq: 'COMPRA-VENTA', fechaAdq: '2014-03-12',
  docAcre: 'ESCRITURA PÚBLICA', partida: '11024-0418', oficina: 'SUNARP — PIURA',
  partic: '50.00', litigio: false,
  terLegal: '329.00', terFis: '329.00', consLegal: '136.00', consFis: '136.00',
  nPiso: '02', mesC: '01', anoC: '1998', mep: '02 — LADRILLO', ecs: '03 — REGULAR',
  ecc: '03 — TERMINADO', uca: '01 — CASA HABITACIÓN',
  muros: 'C', techos: 'F', pisos: 'H', puertas: 'F', revest: 'H', banos: 'E', instEle: 'G',
  areaDecl: '0.00', areaVer: '',
  tipoObra: 'CERCO PERIMÉTRICO', unidMed: 'ml', metrado: '45.50', largo: '45.50',
  ancho: '0.20', alto: '2.40', anoO: '2006', estObra: 'BUENO', valUni: '184.60', valObra: '8,399.30',
  agua: true, desague: true, luz: true, gas: false, alumbrado: true,
  viaFrente: 'ASFALTADA', sumLuz: '4182-0093', sumAgua: '', telPredio: '',
  docInq: '', nomInq: '', areaInq: '', usoInq: 'COMERCIO', iniInq: '', finInq: '', merced: '',
  nomCom: 'BODEGA ROSITA', ciiu: 'G-5211-01 — VENTA AL POR MENOR EN ALMACENES',
  licencia: '2019-004182', estLic: 'CON LICENCIA · ACTIVA', areaNeg: '18.00',
  trab: '2', horario: '07:00 a 22:00', iniAct: '2019-05-02', anuncio: true,
  codEdif: '11024-0418', denom: 'EDIFICIO SANTA ROSA', nPisosE: '3', nUnid: '3',
  areaComT: '176.80', areaComC: '48.20', valBC: '—', reglamento: true, partidaReg: '11024-0418',
  codUC: '11024-0418', nomPredio: '', valle: 'Valle del Chira', regantes: '',
  areaHa: '', tipoTierra: 'A1 — CULTIVO EN LIMPIO', riego: 'BAJO RIEGO', cultivo: 'ARROZ',
  arancelHa: '—', valTerRus: '—', valInstFij: '', autoRural: '—',
  obs: '', verifCampo: false, fechaVerif: '', fuente: 'INSPECCIÓN DE CAMPO', patrimonio: false,
  usoRec: '01 — CASA HABITACIÓN', usoBar: '01 — CASA HABITACIÓN',
  frecRec: 'INTERDIARIA', frecBar: 'SEMANAL', frontis: '9.40',
  posicion: 'FRENTE A VÍA PRINCIPAL', peligro: 'MEDIA', factor: '0.8420', inafecto: false,
  distrito: '200104', sector: '01', manzana: '042', lote: '004', edif: '01',
  entrada: '01', piso: '02', unidad: '001',
};

/**
 * Lo que la municipalidad ya sabe de una ficha nueva: hoy, nada de territorio.
 *
 * **Aquí venían `distrito: '200104'`, `dep`, `prov` y `dist`**, y el padrón real
 * de Catacaos es el ubigeo **200105**: un alta hecha sin tocar ese tramo entraba
 * con el ubigeo de otro distrito, y un ubigeo equivocado no se ve —el código
 * queda completo, con sus veintitrés dígitos, y el predio nace en el distrito de
 * al lado—. No hay ninguna lectura que publique el ubigeo de la municipalidad,
 * así que el tramo va **en blanco y se exige**; lo rellena la vía elegida del
 * catálogo, que sí trae el suyo.
 *
 * Los nombres del departamento, la provincia y el distrito salen «—» por lo
 * mismo: este producto atiende a muchas municipalidades y ninguna operación
 * publica el nombre del distrito de la que está en sesión.
 */
export const DEFECTOS_DE_FICHA_NUEVA: ValoresDeFicha = {
  dep: '—', prov: '—', dist: '—',
  fuente: 'INSPECCIÓN DE CAMPO', valBC: '—', arancelHa: '—', valTerRus: '—', autoRural: '—',
};

/* ══════════ Panel del módulo ══════════ */
export type Pendiente = { tipo: string; titulo: string; detalle: string; conteo: string; tono: 'ok' | 'warn' | 'bad'; dest: string };

export const PENDIENTES: Pendiente[] = [
  { tipo: 'Campo', titulo: 'Fichas con área verificada pendiente', detalle: 'Levantadas en el barrido del sector 03 y sin cerrar. El autovalúo no se recalcula hasta que se graben.', conteo: '14', tono: 'warn', dest: 'predios' },
  { tipo: 'Rentas', titulo: 'Predios sin conciliar con el padrón', detalle: 'Tienen ficha catastral y no generan deuda predial. La conciliación se hace desde Rentas.', conteo: '208', tono: 'bad', dest: 'predios' },
  { tipo: 'Valores', titulo: 'Tabla de aranceles {ejercicio} sellada', detalle: 'Publicada por el Ministerio de Vivienda. Ya se aplica a todo el padrón.', conteo: 'OK', tono: 'ok', dest: 'valores' },
];

export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '18,412', etiqueta: 'Predios en el padrón', nota: 'Activos. Los dados de baja siguen en determinaciones ya emitidas.' },
  { valor: '1,096', etiqueta: 'Manzanas en 5 sectores', nota: 'Un predio sin sector no cuenta en ninguno.' },
  { valor: '96.4 %', etiqueta: 'Fichas con área verificada', nota: '662 predios siguen solo con área declarada.' },
  { valor: 'S/ 198.40', etiqueta: 'Arancel mediano por m²', nota: 'Zona 2 — el tramo más frecuente del padrón.' },
];

/* ══════════ Padrón de predios ══════════ */
export type FiltroDelPadron =
  | { label: string; tipo: 'sel'; valor: string; opts: string[] }
  | { label: string; tipo: 'texto'; valor: string; ph: string };

export const FILTROS: FiltroDelPadron[] = [
  { label: 'Sector', tipo: 'sel', valor: 'Todos', opts: ['Todos', '01', '02', '03', '04', '05'] },
  { label: 'Manzana', tipo: 'texto', valor: '', ph: '042' },
  { label: 'Lote', tipo: 'texto', valor: '', ph: '004' },
  { label: 'Uso', tipo: 'sel', valor: 'Todos', opts: ['Todos', 'Casa habitación', 'Comercio', 'Industria', 'Terreno sin construir', 'Servicios', 'Educación', 'Salud'] },
  { label: 'Conciliada con rentas', tipo: 'sel', valor: 'Todas', opts: ['Todas', 'Sí', 'No'] },
  { label: 'Estado de la ficha', tipo: 'sel', valor: 'Todas', opts: ['Todas', 'Verificada', 'Solo declarada', 'Sin ficha'] },
];

export const COLS_PREDIOS: readonly ColumnaDeTabla[] = [
  ['Cod. ref. catastral', 0], ['Titular', 0], ['Dirección', 0], ['Uso', 0],
  ['Área terreno m²', 1], ['Área const. m²', 1], ['Con rentas', 0],
];

/** `[código, titular, dirección, uso, terreno, construido, estado, tono]`. */
export const PREDIOS: readonly (readonly [string, string, string, string, string, string, string, 'ok' | 'warn' | 'bad'])[] = [
  ['01-1042-0004', 'VILLEGAS PRADO, ROSA', 'CALLE BOLÍVAR 539', 'Casa habitación', '329.00', '136.00', 'Conciliada', 'ok'],
  ['01-1042-0005', 'CHÁVEZ SAAVEDRA, CÉSAR', 'CALLE BOLÍVAR 543', 'Comercio', '212.00', '198.40', 'Conciliada', 'ok'],
  ['01-1007-0001', 'ASOCIACIÓN PRO CASA DEL MAESTRO', 'CALLE SAN MARTÍN 102', 'Educación', '5,000.00', '1,240.00', 'Sin conciliar', 'warn'],
  ['02-1188-0012', 'DISARTEX S.A.C.', 'AV. JOSÉ DE LAMA 1204', 'Industria', '1,840.00', '960.00', 'Conciliada', 'ok'],
  ['03-1042-0088', 'RUFINO VALDERA, EDGAR YOEL', 'PASAJE EL ALTO 116', 'Terreno sin construir', '148.00', '—', 'Sin ficha', 'bad'],
  ['05-2201-0004', 'SUC. TOMÁS MAZA GÓMEZ', 'CARRET. CATACAOS — PAITA KM 4', 'Casa habitación', '840.00', '96.00', 'Sin conciliar', 'warn'],
];

/* ══════════ Mapa catastral ══════════ */
/**
 * `[clave, rótulo]`.
 *
 * **Sin conteo.** Los llevaba dentro —«18,412» predios, «2,184» vías, «1,096»
 * manzanas, «5» sectores— y eran los del artboard: el carril de al lado decía
 * 14 422 y 1 110 en cuanto alguna lectura los había contado, y las dos cifras se
 * leían a la vez sin que nada dijera cuál era la del sistema. El conteo lo pone
 * ahora la pantalla, de lo que el backend acaba de contar.
 */
export const CAPAS: readonly [string, string][] = [
  ['predios', 'Predios (lotes)'],
  ['vias', 'Vías y calles'],
  ['manzanas', 'Manzanas'],
  ['sectores', 'Sectores'],
  ['aranceles', 'Aranceles por zona'],
];

export const SECTORES_DEL_MAPA = ['S-01', 'S-02', 'S-03', 'S-04', 'S-05'];

/** El lote seleccionado: `[rótulo, valor, mono]`. */
export const LOTE_SELECCIONADO: readonly [string, string, 0 | 1][] = [
  ['Código predial', '01-1042-0004', 1],
  ['Contribuyente', 'Villegas Prado, Rosa', 0],
  ['Sector / manzana', 'S-01 · M-06', 1],
  ['Lote', '04', 1],
  ['Frente a vía', 'CALLE BOLÍVAR', 0],
  ['Uso', 'Casa habitación', 0],
  ['Área de terreno', '329.00 m²', 1],
  ['Área construida', '136.00 m²', 1],
  ['Arancel de la vía', 'S/ 198.40 / m²', 1],
];

/* ══════════ Territorio ══════════ */
/** `[código, nombre, predios, manzanas]`. */
export const SECTORES: readonly [string, string, string, number][] = [
  ['01', 'CERCADO DE CATACAOS', '2,384 predios', 96],
  ['02', 'ZONA INDUSTRIAL', '1,944 predios', 84],
  ['03', 'BARRIO BUENOS AIRES', '3,018 predios', 112],
  ['04', 'BELLAVISTA LÍMITE', '1,388 predios', 68],
  ['05', 'EJE CARRETERA PAITA', '902 predios', 58],
];

export const MANZANAS_DEL_SECTOR = ['M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06', 'M-07', 'M-08'];

export const COLS_VIAS: readonly ColumnaDeTabla[] = [
  ['Código', 0], ['Tipo', 0], ['Nombre', 0], ['Zona', 0], ['Arancel S/ m²', 1], ['Estado', 0],
];

export const VIAS: readonly (readonly string[])[] = [
  ['00001182', 'AVENIDA', 'JOSÉ DE LAMA', 'Zona 1', '412.60', 'ACTIVA'],
  ['00001183', 'CALLE', 'SANTA ROSA', 'Zona 2', '198.40', 'ACTIVA'],
  ['00001184', 'CALLE', 'LAMA', 'Zona 2', '198.40', 'ACTIVA'],
  ['00001185', 'PASAJE', 'EL ALTO', 'Zona 3', '142.80', 'ACTIVA'],
  ['00001186', 'CARRETERA', 'CATACAOS — PAITA', 'Zona 4', '96.20', 'INACTIVA'],
];

/* ══════════ Valores del ejercicio ══════════ */
export type TablaDeValores = {
  titulo: string;
  conteo: string;
  cols: readonly ColumnaDeTabla[];
  filas: readonly (readonly string[])[];
  nota: string;
};

export const PESTANIAS_DE_VALORES = ['Aranceles de terreno', 'Valores unitarios', 'Depreciación'];

/** Las tres tablas oficiales. El ejercicio entra en el rótulo, así que el
 *  título se compone con el que esté elegido en la cabecera. */
export const tablasDeValores = (ejercicio: string): TablaDeValores[] => [
  {
    titulo: 'Aranceles vigentes ' + ejercicio,
    conteo: '6 tramos',
    cols: [['Vía', 0], ['Cuadra desde', 1], ['Cuadra hasta', 1], ['Zona', 0], ['Arancel S/ m²', 1], ['Variación', 1]],
    filas: [
      ['AV. JOSÉ DE LAMA', '1', '6', 'Zona 1', '412.60', '+4.2 %'],
      ['AV. JOSÉ DE LAMA', '7', '14', 'Zona 1', '386.40', '+4.0 %'],
      ['CALLE SANTA ROSA', '1', '12', 'Zona 2', '198.40', '+3.8 %'],
      ['CALLE LAMA', '1', '10', 'Zona 2', '198.40', '+3.8 %'],
      ['PASAJE EL ALTO', '1', '4', 'Zona 3', '142.80', '+3.2 %'],
      ['CARRETERA CATACAOS — PAITA', '1', '8', 'Zona 4', '96.20', '+2.8 %'],
    ],
    nota: 'Aranceles aprobados por el Ministerio de Vivienda, Construcción y Saneamiento para el ejercicio ' + ejercicio + '.',
  },
  {
    titulo: 'Valores unitarios de edificación — costa ' + ejercicio + ' (S/ por m²)',
    conteo: '7 categorías',
    cols: [['Cat.', 0], ['Muros y columnas', 1], ['Techos', 1], ['Pisos', 1], ['Puertas y ventanas', 1], ['Revestimientos', 1], ['Baños', 1], ['Inst. eléct. y sanit.', 1]],
    filas: [
      ['A', '451.28', '212.90', '148.36', '204.12', '286.44', '78.20', '212.10'],
      ['B', '341.72', '162.14', '112.88', '158.42', '221.06', '58.72', '160.44'],
      ['C', '256.18', '118.92', '84.36', '112.60', '162.18', '42.10', '118.32'],
      ['D', '182.44', '86.20', '61.42', '78.14', '112.36', '28.44', '84.16'],
      ['E', '124.36', '58.72', '41.20', '52.88', '76.42', '18.62', '56.44'],
      ['F', '78.20', '34.16', '24.88', '31.44', '44.20', '10.36', '32.18'],
      ['G', '41.62', '18.44', '12.36', '16.20', '22.88', '4.12', '16.44'],
    ],
    nota: 'La ficha declara una categoría A–G por cada una de las siete partidas. El sistema las suma y les aplica la depreciación.',
  },
  {
    titulo: 'Depreciación por antigüedad y estado — ladrillo, casa habitación',
    conteo: '6 rangos',
    cols: [['Antigüedad', 0], ['Muy bueno %', 1], ['Bueno %', 1], ['Regular %', 1], ['Malo %', 1]],
    filas: [
      ['Hasta 5 años', '0', '3', '8', '15'],
      ['6 a 10 años', '3', '8', '15', '24'],
      ['11 a 20 años', '8', '17', '27', '39'],
      ['21 a 30 años', '15', '25', '38', '52'],
      ['31 a 40 años', '22', '33', '48', '64'],
      ['Más de 40 años', '30', '42', '58', '76'],
    ],
    nota: 'El porcentaje depende del material predominante (MEP) y del estado de conservación (ECS) declarados por piso.',
  },
];

/* ══════════ Ficha del contribuyente (el documento) ══════════ */
export const REPORTE_META: readonly [string, string][] = [
  ['Contribuyente', 'VILLEGAS PRADO, ROSA'],
  ['Código', '00000003542'],
  ['D.N.I.', '03593174'],
  ['Domicilio fiscal', 'CALLE BOLÍVAR 539 — CATACAOS'],
  ['Calificación', '003 — PEQUEÑO CONTRIBUYENTE'],
  ['Ejercicio', '{ejercicio}'],
];

export const COLS_REPORTE: readonly ColumnaDeTabla[] = [
  ['Unidad', 0], ['Identificación', 0], ['Uso / clase', 0], ['Condición', 0], ['Deuda S/', 1],
];

export const FILAS_REPORTE: readonly (readonly string[])[] = [
  ['01-1042-0004', 'CALLE BOLÍVAR 539', 'Casa habitación', 'PROPIETARIO', '0.00'],
  ['01-1042-0004-02', 'CALLE BOLÍVAR 539 int. 2', 'Comercio', 'PROPIETARIO', '182.40'],
  ['05-2201-0018', 'CARRET. CATACAOS — PAITA KM 4', 'Terreno sin construir', 'POSEEDOR', '96.20'],
];

/* ══════════ Modalidades de la ficha ══════════ */
/** `[clave, rótulo, ayuda]`. Las que no aplican no piden datos. */
export const MODALIDADES: readonly [Modalidad, string, string][] = [
  ['urbana', 'Urbana', 'El predio urbano y sus pisos. Siempre activa.'],
  ['economica', 'Económica', 'Actividad económica en la unidad. Añade el bloque de licencia y CIIU.'],
  ['bienes', 'Bienes comunes', 'Régimen de propiedad exclusiva y común. Añade el reparto entre unidades.'],
  ['rural', 'Rural', 'Predio rústico valorizado por hectárea.'],
];

/* ══════════ Las trece opciones del manual que resume el módulo ══════════ */
/** `[rótulo, destino]`. Es lo que la paleta de comandos lista. */
export const OPCIONES: readonly [string, string][] = [
  ['Ficha urbana individual', 'predio'],
  ['Ficha económica', 'predio'],
  ['Bienes comunes', 'predio'],
  ['Ficha rural', 'predio'],
  ['Actualización del catastro', 'predio'],
  ['Consulta de fichas', 'predios'],
  ['Mapa catastral', 'mapa'],
  ['Sectores, manzanas y lotes', 'territorio'],
  ['Mantenimiento de vías y calles', 'territorio'],
  ['Aranceles de terreno', 'valores'],
  ['Valores unitarios de edificación', 'valores'],
  ['Tabla de depreciación', 'valores'],
  ['Reporte de ficha del contribuyente', 'reporte'],
];

/* ══════════ Las dos formas de recorrer la misma ficha ══════════ */
export const MODOS: readonly [('pagina' | 'pasos'), string][] = [
  ['pagina', 'Una página'],
  ['pasos', 'Por pasos'],
];
