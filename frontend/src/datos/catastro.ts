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

/* `CODIGO_YA_USADO` se ha ido. Era un literal de veintiun digitos copiado del
   artboard con el ubigeo cambiado, y decidia por si solo si un codigo estaba
   ocupado: la rama de «Codigo ya usado» se disparaba contra una cadena escrita a
   mano y nunca contra el padron. Se fue cuando el alta paso a preguntarselo al
   backend. */

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
        nota: 'El padrón publica el ubigeo del predio —seis dígitos, «200104»— y ninguna lectura traduce esos dígitos a nombres: no hay catálogo de ubigeo en este sistema. Por eso los tres salen «—» en vez de PIURA / PIURA / CATACAOS, que es lo que el artboard escribía y se dibujaba igual en cualquier municipalidad.',
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
        nota: 'Las siete partidas de acabados llevan una categoría de la A a la J. La letra es la categoría, no una nota. Van de la A a la J y no de la A a la G desde que se leyeron los cuatro anexos: el cuadro de la Costa tiene nueve y el de la Selva diez —la J es «CAÑA GUAYAQUIL PONA O PINTOC»—, y con el rango corto una municipalidad de la Selva no podía fichar una construcción de ese material (#436).',
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
        nota: 'Las cuatro salen «—» y no es un fallo de lectura: la ficha catastral no publica ni un importe —ni valor unitario, ni arancel, ni autovalúo— porque son datos normativos versionados (regla 5, D-02a), y el cuadro de valores unitarios del ejercicio todavía no está cargado (GOB-03, H-14). Aquí venían cuatro importes copiados del artboard —los del predio de la maqueta— que se dibujaban idénticos sobre cualquier predio que se abriera, autovalúo incluido.',
        campos: [],
        totales: [['Valor del terreno', 'S/ 135,745.40', 0], ['Valor de la construcción', 'S/ 96,182.10', 0], ['Otras instalaciones', 'S/ 8,420.00', 0], ['Autovalúo', 'S/ 240,347.50', 1]],
      },
    ],
  },
];

/* ══════════ Los valores de la ficha ══════════ */
export type ValoresDeFicha = Record<string, string | boolean>;

/* `BASE` se ha ido. Eran los ciento veintitrés valores de la ficha del predio
   `01-1042-0004` del artboard —«VILLEGAS PRADO, ROSA» de contribuyente, «198.40»
   de arancel de la vía, la partida registral «11024-0418», el material y el
   estado del piso 02—, y se dibujaban tal cual sobre el predio real que se
   acabara de abrir: eran indistinguibles de lo declarado en cuanto salían de la
   pantalla. Se fue cuando la ficha pasó a leerse del backend (#566): lo que la
   lectura publica lo pone `PROCEDENCIA` campo por campo, y lo que no publica
   nadie sale «—» con su motivo. Las casillas arrancan en blanco, compuestas de
   las claves que `GRUPOS` dibuja y de los ocho tramos del código. */

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

/* `KPIS` y `PENDIENTES`, con el tipo `Pendiente`, se han ido. `KPIS` eran las
   cuatro cifras de cabecera —«18,412 predios», «1,096 manzanas», «96.4 %»,
   «S/ 198.40» de arancel mediano—, cuatro conteos de una captura que se
   dibujaban iguales en toda municipalidad. `PENDIENTES` eran las tres tarjetas de
   avisos de la maqueta del prototipo —«14 fichas con área verificada
   pendiente», «208 predios sin conciliar»—, tres conteos que ninguna lectura
   había contado y que se dibujaban iguales en toda municipalidad. Se fueron
   cuando el panel pasó a leer del backend. */

/* ══════════ Padrón de predios ══════════ */
export const COLS_PREDIOS: readonly ColumnaDeTabla[] = [
  ['Cod. ref. catastral', 0], ['Titular', 0], ['Dirección', 0], ['Uso', 0],
  ['Área terreno m²', 1], ['Área const. m²', 1], ['Con rentas', 0],
];

/* `PREDIOS` se ha ido. Eran las seis filas de la maqueta del prototipo —«VILLEGAS
   PRADO, ROSA», «DISARTEX S.A.C.», con sus áreas y su columna «Con rentas» ya
   conciliada—, seis predios de una captura dibujados bajo el padrón de cualquier
   municipalidad. Se fueron cuando la grilla pasó a leer del backend. */

/* `FILTROS` y su tipo `FiltroDelPadron` se han ido. Eran los seis filtros de la
   maqueta del prototipo, con los sectores «01» a «05» y los usos escritos a mano
   dentro: cinco sectores que son los de una captura y no los de ninguna
   municipalidad. Se fueron cuando la consulta pasó a leer del backend, que es
   quien sabe qué sectores y qué usos tiene el padrón que se está mirando. */

/* ══════════ Mapa catastral ══════════ */
/**
 * Las cinco capas del artboard, y **cuál sostiene cada una** (ADR-0022 §5).
 *
 * **Sin conteo.** Los llevaba dentro —«18,412» predios, «2,184» vías, «1,096»
 * manzanas, «5» sectores— y eran los del artboard: el carril de al lado decía
 * 14 422 y 1 110 en cuanto alguna lectura los había contado, y las dos cifras se
 * leían a la vez sin que nada dijera cuál era la del sistema. El conteo lo pone
 * ahora la pantalla, de lo que el backend acaba de contar.
 *
 * **Y sólo una tiene geometría propia.** `predio.geometria` existe desde V61;
 * `via`, `manzana` y `sector` no tienen ninguna columna de forma, así que su
 * perímetro no se puede dibujar —y no se deriva de la unión de los lotes ya
 * digitalizados, porque eso sería publicar un lindero que nadie levantó—. Lo que
 * sí es cierto es que cada lote sabe de qué manzana y de qué sector es, y
 * agruparlo por color dice eso y nada más.
 */
export type CapaDelPlano = {
  k: 'predios' | 'manzanas' | 'sectores' | 'vias' | 'aranceles';
  label: string;
  /** Qué hace la capa sobre el plano, o por qué no hay con qué dibujarla. */
  nota: string;
  /** Con `false` el conmutador nace apagado y bloqueado, con su motivo. */
  dibujable: boolean;
};

export const CAPAS: readonly CapaDelPlano[] = [
  {
    k: 'predios',
    label: 'Predios (lotes)',
    nota: 'El polígono de cada lote, tal como está en el padrón: ni reproyectado ni simplificado.',
    dibujable: true,
  },
  {
    k: 'manzanas',
    label: 'Manzanas',
    nota: 'Colorea y rotula los lotes por su manzana. No dibuja su perímetro: «manzana» no tiene columna de geometría.',
    dibujable: true,
  },
  {
    k: 'sectores',
    label: 'Sectores',
    nota: 'Colorea los lotes por su sector, cuando «Manzanas» está apagada. Tampoco tiene perímetro propio.',
    dibujable: true,
  },
  {
    k: 'vias',
    label: 'Vías y calles',
    nota: 'No se dibuja: «via» no tiene columna de geometría, así que el sistema no sabe por dónde pasa ninguna calle.',
    dibujable: false,
  },
  {
    k: 'aranceles',
    label: 'Aranceles por zona',
    nota: 'No se pinta, y no por prudencia: el arancel está llaveado por vía y tramo, y un predio no tiene tramo. Una vía con dos aranceles no se puede colorear sin elegir uno, y elegir mal no se ve.',
    dibujable: false,
  },
];

/* ══════════ Territorio ══════════ */

/* `SECTORES`, `MANZANAS_DEL_SECTOR`, `COLS_VIAS` y `VIAS` se han ido: el bloque
   entero era la maqueta del prototipo. Los cinco sectores de Catacaos con su
   nombre y su conteo de predios, ocho manzanas «M-01» a «M-08» que no son las de
   ningún sector, y cinco vías con su código, su zona y su arancel al céntimo
   —«JOSÉ DE LAMA · Zona 1 · 412.60»—, que es una cifra de valuación inventada.
   Se fueron cuando el territorio pasó a leer del backend: los sectores y sus
   manzanas salen de `GET /catastro/sectores`, y las vías de su propia lectura
   con las columnas que el recurso publica. */

/* ══════════ Valores del ejercicio ══════════ */
export type TablaDeValores = {
  titulo: string;
  conteo: string;
  cols: readonly ColumnaDeTabla[];
  filas: readonly (readonly string[])[];
  nota: string;
};

export const PESTANIAS_DE_VALORES = ['Aranceles de terreno', 'Valores unitarios', 'Depreciación'];

/* `tablasDeValores` se ha ido. Eran las tres tablas normativas escritas a mano
   —seis tramos de arancel con su variacion, los valores unitarios y la
   depreciacion—, o sea cifras que multiplican el autovaluo de todo un padron
   dibujadas desde una captura (regla 5). Se fue cuando la pantalla paso a leer
   los cuadros publicados al conjunto del ejercicio, que es de donde tienen que
   salir o no salir. */


/* ══════════ Ficha del contribuyente (el documento) ══════════ */

/* `REPORTE_META`, `COLS_REPORTE` y `FILAS_REPORTE` se han ido, y eran la hoja
   entera: el nombre, el código, el D.N.I. y el domicilio de una persona de la
   maqueta del prototipo, y sus tres unidades con la deuda de cada una. La
   pantalla la dibujaba con cualquier sesión y sin haber abierto ningún
   contribuyente, y una vez impresa esa hoja no se distingue de una correcta. Se
   fueron cuando el reporte pasó a leer del backend, que es quien sabe de quién
   es la ficha y qué unidades tiene. */

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

/* ══════════ De dónde sale cada uno de los 123 campos de la ficha ══════════

   Medido contra el backend en marcha, no razonado: `GET /catastro/fichas/{tipo}/{codigo}`
   publica veintiún campos de cabecera y cinco listas, y el cuerpo de
   `PUT …/actualizacion` admite diez claves. Todo lo demás que el manual dibuja
   —y son más de cien casillas— no lo publica ninguna lectura ni lo admite
   ninguna escritura, así que rellenarlo era teclear en una caja que no viaja.

   La regla es una: **un campo sin `lee` y sin `escribe` no se puede teclear, y
   dice por qué**. Sin esa exigencia, la casilla vacía se lee como un dato que
   falta —algo que alguien tendría que rellenar— cuando lo que falta es el
   modelo entero por debajo.

   Y `motivo` no admite rellenos: nombra la columna que no existe, el cuerpo que
   no la lleva o la decisión que la bloquea. «No disponible» no dice nada, y un
   escáner que grita en verde deja de leerse. */

/**
 * Los datos que la lectura de la ficha —o la del padrón, o la de titulares—
 * sabe poner en un campo del formulario.
 *
 * Son diez de las veintiséis cosas que `FichaResource` publica: las otras son
 * listas, y una lista no cabe en una casilla. Van a las tablas.
 */
export const SELECTORES_DE_LECTURA = [
  'predio.codRefCatastral',
  'predio.via',
  'predio.numeroMunicipal',
  'titulares.texto',
  'ficha.uso',
  'ficha.origen',
  'ficha.observacion',
  'ficha.frontis',
  'ficha.denominacion',
  'ficha.hectareasTotales',
  'ficha.sinLicencia',
  /* Los dos que NO salen de la ficha ni del predio, y que hasta #687 se decían
     indisponibles cuando el backend sí los publica. Un «—» honesto y un «—» que
     se podía haber llenado se leen exactamente igual, y eso es peor que un
     campo que falta. */
  'via.tipo',
  'sector.zona',
] as const;
export type SelectorDeLectura = (typeof SELECTORES_DE_LECTURA)[number];

/**
 * De dónde sale un campo y a dónde va.
 *
 * `lee` — el dato del backend que lo llena. Sin él, el campo sale «—».
 * `escribe` — la clave del cuerpo de `PUT …/actualizacion` que lo lleva. Sin
 *   ella, el campo no se puede teclear, se pinte o no un valor leído.
 * `motivo` — por qué no viaja. **Obligatorio cuando no hay `escribe`.**
 */
export type ProcedenciaDeCampo = {
  lee?: SelectorDeLectura;
  escribe?: string;
  motivo?: string;
};

/** Lo que se repite: los pisos y las obras son listas, y esto es la fila de edición de una. */
const LISTA_DE_PISOS =
  'Los pisos son una lista y esto es la fila de edición de uno; la tabla «Pisos declarados» los enseña todos. Y no se pueden mandar: el cuerpo lleva la lista entera, y reenviarla deja el «% construido» de TODOS los pisos en blanco, porque el cuerpo no tiene ese campo.';
const LISTA_DE_OBRAS =
  'Las obras complementarias son una lista y esto es la fila de edición de una; la tabla «Instalaciones registradas» las enseña todas.';
const IMPORTE_BLOQUEADO =
  'Es un importe, y la ficha no publica ninguno: valor unitario, arancel, depreciación y factor de oficialización son datos normativos versionados (regla 5, D-02a, D-11). Se calcula al determinar, no se teclea aquí.';
const TITULARIDAD_APARTE =
  'La titularidad es otro acto —`POST /catastro/predios/{id}/titulares`, con su propia observación— y un predio puede tener varias cuotas; la tabla «Titulares registrados» las enseña.';

export const PROCEDENCIA: Record<string, ProcedenciaDeCampo> = {
  /* ── Identificación ───────────────────────────────────────────── */
  cod: {
    lee: 'predio.codRefCatastral',
    motivo:
      'El código de referencia catastral identifica al predio (`predio_codigo_uq`); la corrección del predio no lo lleva a propósito, porque cambiarlo no es corregir este predio sino declarar otro.',
  },
  uso: {
    lee: 'ficha.uso',
    motivo:
      'El cuerpo de la actualización no lleva el uso. Sólo lo escriben el alta de la ficha y el puerto por el que fiscalización corrige el padrón, que tiene un único llamador y una regla de arquitectura que lo vigila.',
  },
  cuc: { motivo: 'El Código Único Catastral no está en el modelo: `ficha_catastral` no tiene esa columna y ninguna lectura lo publica.' },
  hoja: { motivo: 'La hoja catastral no está en el modelo: ninguna tabla la guarda y ninguna lectura la publica.' },
  anterior: { motivo: 'El código catastral anterior no está en el modelo; el padrón migrado no conserva el del sistema de origen.' },
  contrib: { lee: 'titulares.texto', motivo: TITULARIDAD_APARTE },
  predial: {
    lee: 'predio.codRefCatastral',
    motivo: 'No hay dos padrones de predios: el código predial de rentas ES el de referencia catastral (ADR-0015), así que se lee del mismo sitio y no se teclea.',
  },
  ficha: { motivo: 'El Nº de ficha del manual no lo publica ninguna lectura: una ficha se identifica por el código de su predio y su número de versión, que están en la cabecera.' },
  fichaLote: { motivo: 'El Nº de ficha por lote no está en el modelo, por lo mismo que el Nº de ficha.' },
  unidAcum: { motivo: 'La unidad acumulada al código predial no está en el modelo: ninguna columna la guarda.' },
  arancel: {
    motivo:
      'El arancel está llaveado por (conjunto sellado, vía, tramo) y `predio` no tiene tramo, así que una vía con dos aranceles no se puede resolver por lote (ADR-0022 §5). Y es un importe: la ficha no publica ninguno.',
  },

  /* ── Ubicación ────────────────────────────────────────────────── */
  tipoVia: {
    lee: 'via.tipo',
    /* Se lee, y cuesta UNA petición y no el catálogo entero: `GET /catastro/vias`
       admite `codigoDeVia` como filtro exacto —medido, `?codigoDeVia=V-0003` da
       una fila con `tipo: CALLE`—, y el predio publica ese código. El motivo
       anterior decía que resolverlo «pediría el catálogo vial una vez por
       predio», que era cierto del coste y falso de la disponibilidad; y es la
       disponibilidad lo que un «—» afirma.

       El motivo que queda es el de ESCRIBIR, que sigue siendo verdad. */
    motivo:
      'El tipo se lee del catálogo vial por el `codigoDeVia` del predio, pero no se puede corregir aquí: el cuerpo de la corrección no lleva ningún tipo de vía, lleva `codigoDeVia`, y cambiar el tipo es elegir otra vía del catálogo.',
  },
  calle: {
    lee: 'predio.via',
    motivo: 'Cambiar la vía es mandar `predio.codigoDeVia`, y un código de vía se elige del catálogo vial, no se teclea. Esta pantalla lo resuelve en el alta y todavía no aquí.',
  },
  numMun: { lee: 'predio.numeroMunicipal', escribe: 'predio.numeroMunicipal' },
  numAd: { motivo: 'El número adicional no está en el modelo: `predio` guarda un solo número municipal.' },
  tipoPuerta: { motivo: 'La nomenclatura de puertas no está en el modelo: `predio` guarda un número municipal y ninguna puerta.' },
  condNum: { motivo: 'La condición de numeración no está en el modelo; el certificado de numeración lo emite «Certificados» y no queda en el predio.' },
  certNum: { motivo: 'El Nº de certificado de numeración no lo guarda el predio: el certificado se emite y se numera en Autorizaciones y Licencias.' },
  antNum: { motivo: 'La numeración municipal anterior no está en el modelo.' },
  dep: { motivo: 'El padrón publica el ubigeo del predio —seis dígitos— y no su desglose en nombres; ninguna lectura del sistema resuelve el nombre de un departamento.' },
  prov: { motivo: 'Por lo mismo que el departamento: hay ubigeo y no hay catálogo que lo traduzca.' },
  dist: { motivo: 'Por lo mismo que el departamento: hay ubigeo y no hay catálogo que lo traduzca.' },
  habUrb: { motivo: 'La habilitación urbana no está en el modelo: lo que el predio guarda de su territorio es sector, manzana, lote y ubigeo.' },
  zona: {
    lee: 'sector.zona',
    /* Sale del sector del predio, y el cruce no cuesta ni una petición: la
       pantalla ya tiene los sectores descargados para su filtro. El motivo
       anterior hablaba de escribir —«el cuerpo de la actualización no la
       lleva»—, que es cierto y no viene al caso para un campo que se muestra de
       solo lectura como los demás de su bloque.

       Y sigue saliendo «—» cuando el sector no la trae: en Catacaos los seis
       sectores tienen `zona` nula, y ahí el guion es la verdad. */
    motivo:
      'La zona vive en el sector del predio, no en su ficha: se lee de ahí y se corrige en Territorio. Un sector sin zona declarada la deja en blanco, y eso no es un fallo de esta pantalla.',
  },
  ref: { motivo: 'La referencia de ubicación no está en el modelo.' },

  /* ── Titularidad ──────────────────────────────────────────────── */
  condTit: { motivo: TITULARIDAD_APARTE },
  partic: { motivo: TITULARIDAD_APARTE },
  formaAdq: { motivo: 'La forma de adquisición no está en el modelo: `titularidad` guarda quién, cuánto, desde cuándo y con qué documento de origen.' },
  fechaAdq: { motivo: 'La fecha de adquisición no está en el modelo; lo que la titularidad guarda es desde cuándo rige la cuota, que no es lo mismo.' },
  docAcre: { motivo: 'El tipo de documento que acredita no está en el modelo: la titularidad guarda el documento de origen como texto, sin clasificarlo.' },
  partida: { motivo: 'La partida registral no está en el modelo.' },
  oficina: { motivo: 'La oficina registral no está en el modelo.' },
  litigio: { motivo: 'El litigio no está en el modelo: ninguna columna lo marca y ninguna lectura lo publica.' },

  /* ── Terreno y construcción ───────────────────────────────────── */
  terLegal: { motivo: 'La ficha declara UN área de terreno —la de la cabecera— y el manual dibuja dos; el sistema no distingue «según título» de «medida en campo», así que ninguna de las dos casillas tiene de dónde salir.' },
  terFis: { motivo: 'Por lo mismo que el área según título: la ficha declara una sola.' },
  consLegal: { motivo: 'La construida se declara por piso; la del predio entero la suma el servidor en la consulta de fichas. El manual la parte en «según título» y «medida en campo», y el sistema no hace esa distinción.' },
  consFis: { motivo: 'Por lo mismo que la construcción según título.' },
  nPiso: { motivo: LISTA_DE_PISOS },
  mesC: { motivo: 'El mes de construcción no está en el modelo: la construcción declara su año, que es lo que la depreciación consume.' },
  anoC: { motivo: LISTA_DE_PISOS },
  mep: { motivo: LISTA_DE_PISOS },
  ecs: { motivo: LISTA_DE_PISOS },
  ecc: { motivo: 'El estado de la construcción —en construcción, inconcluso, terminado, en ruinas— no está en el modelo; lo que hay es el estado de CONSERVACIÓN, que es el campo de arriba y no dice lo mismo.' },
  uca: { motivo: 'El uso de la unidad no está en el modelo: la ficha declara un uso, el de «Identificación».' },
  muros: { motivo: LISTA_DE_PISOS },
  techos: { motivo: LISTA_DE_PISOS },
  pisos: { motivo: LISTA_DE_PISOS },
  puertas: { motivo: LISTA_DE_PISOS },
  revest: { motivo: LISTA_DE_PISOS },
  banos: { motivo: LISTA_DE_PISOS },
  instEle: { motivo: LISTA_DE_PISOS },
  areaDecl: { motivo: 'La construcción declara UN área construida y el manual dibuja dos, declarada y verificada; el sistema no las distingue. ' + LISTA_DE_PISOS },
  areaVer: { motivo: 'Por lo mismo que el área declarada: la construcción tiene una sola.' },
  tipoObra: { motivo: LISTA_DE_OBRAS },
  unidMed: { motivo: LISTA_DE_OBRAS },
  metrado: { motivo: LISTA_DE_OBRAS },
  largo: { motivo: 'La obra complementaria se declara por su metrado y su unidad; sus dimensiones no están en el modelo.' },
  ancho: { motivo: 'Por lo mismo que el largo: no está en el modelo.' },
  alto: { motivo: 'Por lo mismo que el largo: no está en el modelo.' },
  anoO: { motivo: LISTA_DE_OBRAS },
  estObra: { motivo: LISTA_DE_OBRAS },
  valUni: { motivo: IMPORTE_BLOQUEADO },
  valObra: { motivo: IMPORTE_BLOQUEADO },

  /* ── Uso y ocupación ──────────────────────────────────────────── */
  agua: { motivo: 'Los servicios del predio no están en el modelo: ninguna columna de `ficha_catastral` los guarda.' },
  desague: { motivo: 'Por lo mismo que el agua: los servicios no están en el modelo.' },
  luz: { motivo: 'Por lo mismo que el agua: los servicios no están en el modelo.' },
  gas: { motivo: 'Por lo mismo que el agua: los servicios no están en el modelo.' },
  alumbrado: { motivo: 'Por lo mismo que el agua: los servicios no están en el modelo.' },
  viaFrente: { motivo: 'El tipo de vía frente al predio no está en el modelo.' },
  sumLuz: { motivo: 'El número de suministro eléctrico no está en el modelo.' },
  sumAgua: { motivo: 'El número de suministro de agua no está en el modelo.' },
  telPredio: { motivo: 'El teléfono del predio no está en el modelo.' },
  docInq: { motivo: 'La ocupación no propietaria es otra lectura y otro acto —`GET`/`POST /catastro/predios/{id}/inquilinos`—; el cuerpo de la actualización de la ficha no la lleva.' },
  nomInq: { motivo: 'Por lo mismo que el documento del ocupante: la ocupación tiene su propia lectura y su propio acto.' },
  areaInq: { motivo: 'Por lo mismo que el documento del ocupante: la ocupación tiene su propia lectura y su propio acto.' },
  usoInq: { motivo: 'Por lo mismo que el documento del ocupante: la ocupación tiene su propia lectura y su propio acto.' },
  iniInq: { motivo: 'Por lo mismo que el documento del ocupante: la ocupación tiene su propia lectura y su propio acto.' },
  finInq: { motivo: 'Por lo mismo que el documento del ocupante: la ocupación tiene su propia lectura y su propio acto.' },
  merced: { motivo: 'La merced conductiva no está en el modelo: la ocupación guarda quién, qué área ocupa y desde cuándo, sin importe.' },
  nomCom: { motivo: 'Las actividades económicas son una lista; la tabla de abajo las enseña. Y no se pueden mandar desde aquí: el cuerpo lleva el bloque entero y reenviarlo deja SIN FECHA de vigencia todas las actividades, porque el cuerpo no tiene ese campo.' },
  ciiu: { motivo: 'Por lo mismo que el nombre comercial: la actividad es una fila de una lista.' },
  licencia: { motivo: 'Por lo mismo que el nombre comercial: la actividad es una fila de una lista.' },
  estLic: {
    lee: 'ficha.sinLicencia',
    motivo: 'El estado de la licencia lo sabe Autorizaciones y Licencias; catastro guarda su NÚMERO, y que falte no es un dato incompleto: es el hallazgo de fiscalización.',
  },
  areaNeg: { motivo: 'Por lo mismo que el nombre comercial: la actividad es una fila de una lista.' },
  trab: { motivo: 'El número de trabajadores no está en el modelo.' },
  horario: { motivo: 'El horario de atención no está en el modelo.' },
  iniAct: { motivo: 'La fecha de inicio la publica cada actividad y se ve en la tabla; el cuerpo de la actualización no la lleva, así que aquí no se puede teclear.' },
  anuncio: { motivo: 'El anuncio publicitario no es una marca: cada actividad declara el NÚMERO de su autorización y su fecha, y la tabla los enseña.' },
  codEdif: { motivo: 'No hay un código de edificación aparte: la lectura de bienes comunes recibe el código de referencia catastral del predio, el mismo de «Identificación».' },
  denom: {
    lee: 'ficha.denominacion',
    motivo: 'El cuerpo de la actualización no lleva la denominación; sólo la escribe el alta de la ficha.',
  },
  nPisosE: { motivo: 'El número de pisos de la edificación no está en el modelo: lo que hay son las construcciones de cada unidad, cada una con su piso.' },
  nUnid: { motivo: 'El número de unidades de la edificación no está en el modelo; lo que la ficha declara es cuántas participan del reparto de lo común, y eso sale en el pie de este bloque.' },
  areaComT: { motivo: 'La ficha declara UN área común total —sale en el pie— y el manual la parte en terreno y construida; el sistema no hace esa distinción.' },
  areaComC: { motivo: 'Por lo mismo que el área común de terreno: la ficha declara una sola.' },
  valBC: { motivo: IMPORTE_BLOQUEADO },
  reglamento: { motivo: 'El reglamento interno no está en el modelo.' },
  partidaReg: { motivo: 'La partida del régimen no está en el modelo.' },
  codUC: {
    lee: 'predio.codRefCatastral',
    motivo: 'No hay un código de unidad catastral aparte: la lectura de la ficha rural recibe el código de referencia catastral del predio.',
  },
  nomPredio: {
    lee: 'ficha.denominacion',
    motivo: 'Es el MISMO dato que «Denominación» de bienes comunes, con otro rótulo: la ficha guarda una denominación y el cuerpo de la actualización no la lleva.',
  },
  valle: { motivo: 'El valle o sector de riego no está en el modelo.' },
  regantes: { motivo: 'La comisión de regantes no está en el modelo.' },
  areaHa: {
    lee: 'ficha.hectareasTotales',
    motivo: 'El total en hectáreas lo SUMA el servidor a partir de los grupos de tierra; no se declara, se declara cada grupo.',
  },
  tipoTierra: { motivo: 'Los grupos de tierra son una lista —cada uno con su clasificación, su calidad agrológica, su riego y sus hectáreas— y la tabla de abajo los enseña.' },
  riego: { motivo: 'Por lo mismo que el tipo de tierra: el riego es de cada grupo, no del predio.' },
  cultivo: { motivo: 'El cultivo predominante no está en el modelo: lo que clasifica la tierra es su categoría y su calidad agrológica.' },
  arancelHa: { motivo: IMPORTE_BLOQUEADO },
  valTerRus: { motivo: IMPORTE_BLOQUEADO },
  valInstFij: { motivo: IMPORTE_BLOQUEADO },
  autoRural: { motivo: IMPORTE_BLOQUEADO },
  obs: {
    lee: 'ficha.observacion',
    motivo: 'Es la observación con la que se registró ESTA versión, y el histórico la conserva. La del acto nuevo se pide en la barra de guardado: son dos motivos distintos y confundirlos deja el cambio explicado con la razón del anterior.',
  },
  verifCampo: { motivo: 'La marca de verificación en campo no está en el modelo; lo que dice de dónde sale la versión es su origen, abajo.' },
  fechaVerif: { motivo: 'La fecha de verificación no está en el modelo; lo que la versión fecha es desde cuándo rige.' },
  fuente: { lee: 'ficha.origen', escribe: 'origen' },
  patrimonio: { motivo: 'La declaración de patrimonio no está en el modelo.' },

  /* ── Valuación y arbitrios ────────────────────────────────────── */
  usoRec: { motivo: 'Los datos de arbitrios no son de la ficha catastral: los usa la determinación de arbitrios, que es de Rentas, y ninguna lectura los publica.' },
  usoBar: { motivo: 'Por lo mismo que el uso para recolección: es un dato de arbitrios, no de la ficha.' },
  frecRec: { motivo: 'Por lo mismo que el uso para recolección: es un dato de arbitrios, no de la ficha.' },
  frecBar: { motivo: 'Por lo mismo que el uso para recolección: es un dato de arbitrios, no de la ficha.' },
  frontis: {
    lee: 'ficha.frontis',
    motivo: 'El frontis se lee y no se escribe: ningún cuerpo del contrato lo lleva, ni el alta ni la actualización.',
  },
  posicion: { motivo: 'La posición del predio —esquina, interior, frente a parque— no está en el modelo.' },
  peligro: { motivo: 'La peligrosidad de la zona no está en el modelo.' },
  factor: { motivo: 'El factor de distribución de costo lo calcula la determinación de arbitrios con sus tasas, que son de ordenanza local (D-02b); no es un dato de la ficha.' },
  inafecto: { motivo: 'La inafectación no está en la ficha: la resuelve la determinación, con la condición del contribuyente y la del predio.' },
};
