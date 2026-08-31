/* Datos de muestra del módulo de autorizaciones y licencias, copiados
   literalmente del artboard `Autorizaciones y licencias.dc.html`. Nada de esto
   viaja a ningún backend: es la maqueta. «SULLANA» de la dirección del padrón
   pasa a «CATACAOS», que es la municipalidad piloto. */

export type TipoDeTramite = 'funcionamiento' | 'edificacion' | 'anuncio';

/** Quién aporta el requisito: el administrado o la propia municipalidad. */
export type Quien = 'Administrado' | 'Municipalidad';

/** [rótulo, detalle, quién lo aporta] */
export type Requisito = [string, string, Quien];

export type TipoDeCampo = 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro';

export type CampoDef = {
  k: string;
  l: string;
  t?: TipoDeCampo;
  v?: string | boolean;
  o?: string[];
  /** El campo ocupa la fila entera de la rejilla. */
  ancho?: 1;
  ayuda?: string;
  ph?: string;
  c?: string;
};

export type BloqueDef = { titulo?: string; campos: CampoDef[] };

/** [rótulo, 1 si la columna es numérica y va a la derecha]. */
export type ColDef = [string, 0 | 1];

export type TablaDef = {
  titulo: string;
  /** Vacío: el conteo se deriva de las filas. */
  conteo: string;
  min: string;
  cols: ColDef[];
  /** `'actos'` los compone el expediente abierto, que es de donde salen. */
  filas: string[][] | 'actos';
  /** Índice de la columna que se dibuja como insignia. */
  insignia?: number;
  /** [rótulo, valor, 1 si es el total destacado]. */
  totales?: [string, string, 0 | 1][];
  nota: string;
};

export type TabDef = {
  label: string;
  titulo: string;
  nota: string;
  bloques: BloqueDef[];
  tabla?: TablaDef;
};

export type Tramite = {
  label: string;
  plazoDias: number;
  modalidad: string;
  requisitos: Requisito[];
  tabs: TabDef[];
};

/* Los tres trámites. Comparten la anatomía —requisitos, plazo, autorización con
   vigencia— y se diferencian en los requisitos del TUPA y en el plazo. */
export const TRAMITES: Record<TipoDeTramite, Tramite> = {
  funcionamiento: {
    label: 'Licencia de funcionamiento',
    plazoDias: 15,
    modalidad: 'Aprobación automática',
    requisitos: [
      ['Solicitud-declaración jurada', 'Formato del TUPA con vigencia de poder si es persona jurídica.', 'Administrado'],
      ['Copia del RUC y del documento de identidad', 'Del titular o del representante legal acreditado.', 'Administrado'],
      ['Declaración jurada de condiciones de seguridad', 'ITSE básica ex post para riesgo bajo o medio.', 'Administrado'],
      ['Pago del derecho de trámite', 'Tasa del TUPA. Sin recibo la solicitud no se admite.', 'Administrado'],
      ['Compatibilidad de uso y zonificación', 'La verifica Catastro contra la zonificación del predio.', 'Municipalidad'],
      ['Inspección técnica de seguridad', 'Solo si el riesgo es alto o muy alto, y entonces es previa.', 'Municipalidad'],
    ],
    tabs: [
      {
        label: 'Licencia',
        titulo: 'Datos de la licencia',
        nota: 'El giro decide la modalidad y el plazo. Un giro de riesgo alto deja de ser aprobación automática y pasa a evaluación previa.',
        bloques: [
          {
            campos: [
              { k: 'lNum', l: 'Nº de licencia', t: 'ro', v: '2026-006549' },
              { k: 'lTipo', l: 'Tipo de licencia', t: 'sel', v: 'DEFINITIVA', o: ['DEFINITIVA', 'TEMPORAL', 'CESIONARIA'] },
              { k: 'lEstado', l: 'Estado', t: 'ro', v: 'PENDIENTE' },
              { k: 'lFecha', l: 'Fecha de solicitud', t: 'date', v: '2026-08-04' },
              { k: 'lVence', l: 'Vigencia hasta', t: 'ro', v: 'Indeterminada', ayuda: 'La definitiva no caduca; caduca el giro si cambia' },
              { k: 'lHorario', l: 'Horario autorizado', t: 'sel', v: 'DE 06:00 A 23:00 HORAS', o: ['DE 06:00 A 23:00 HORAS', 'DE 08:00 A 20:00 HORAS', 'LAS 24 HORAS'] },
              { k: 'lProceso', l: 'Proceso', t: 'sel', ancho: 1, v: 'REGISTRO SIMPLE DE NUEVA LICENCIA', o: ['REGISTRO SIMPLE DE NUEVA LICENCIA', 'CAMBIO DE GIRO', 'AMPLIACIÓN DE ÁREA', 'CESIÓN DE POSICIÓN', 'CESE DE ACTIVIDADES'] },
            ],
          },
          {
            titulo: 'Titular y denominación',
            campos: [
              { k: 'lContrib', l: 'Contribuyente', t: 'ro', ancho: 1, v: '00000003541 — CASTILLO PASCUALA, MARÍA ELENA' },
              { k: 'lDoc', l: 'D.N.I. / R.U.C.', t: 'ro', v: 'DNI 44218937' },
              { k: 'lDenom', l: 'Denominación comercial', t: 'text', ancho: 1, v: 'RESTAURANT SABOR Y SAZÓN' },
              { k: 'lArea', l: 'Área del establecimiento (m²)', t: 'text', v: '84.00', ayuda: 'Decide el nivel de riesgo y la tasa' },
              { k: 'lAforo', l: 'Aforo', t: 'text', v: '40' },
            ],
          },
        ],
        tabla: {
          titulo: 'Giros autorizados',
          conteo: '3 giros',
          min: '620px',
          cols: [['Código CIIU', 0], ['Descripción', 0], ['Riesgo', 0]],
          filas: [
            ['D-1549-19', 'RESTAURANTE-POLLERÍA', 'Medio'],
            ['H-5520-02', 'SERVICIO DE RESTAURANTES A DOMICILIO', 'Bajo'],
            ['H-5520-63', 'CHIFA AL PASO', 'Medio'],
          ],
          insignia: 2,
          nota: 'El riesgo más alto de los giros manda: con un giro de riesgo alto la licencia deja de ser de aprobación automática.',
        },
      },
      {
        label: 'Predio',
        titulo: 'Predio del establecimiento',
        nota: 'El predio viene de Catastro. Si el uso declarado no admite el giro, la compatibilidad de uso se deniega y con ella la licencia.',
        bloques: [
          {
            campos: [
              { k: 'pCod', l: 'Código catastral', t: 'ro', v: '02-014-D-14-01' },
              { k: 'pDir', l: 'Dirección', t: 'ro', ancho: 1, v: 'CALLE LAMA 482 — ZONA 2 INDUSTRIAL' },
              { k: 'pUso', l: 'Uso del predio en catastro', t: 'ro', v: 'COMERCIO' },
              { k: 'pZona', l: 'Zonificación', t: 'ro', v: 'COMERCIO VECINAL' },
              { k: 'pCompat', l: 'Compatibilidad de uso', t: 'sel', v: 'COMPATIBLE', o: ['COMPATIBLE', 'COMPATIBLE CON RESTRICCIONES', 'NO COMPATIBLE'] },
              { k: 'pPropietario', l: 'Propietario del predio', t: 'ro', ancho: 1, v: 'AUTOMOTORES LA PRIMAVERA S.R.L.' },
              { k: 'pTitulo', l: 'Título del solicitante sobre el predio', t: 'sel', v: 'ARRENDATARIO', o: ['PROPIETARIO', 'ARRENDATARIO', 'CESIONARIO', 'USUFRUCTUARIO'] },
            ],
          },
        ],
      },
      {
        label: 'Trámite y tasas',
        titulo: 'Expediente y derechos',
        nota: 'La tasa se cobra al presentar. Sin recibo la solicitud no se admite y el plazo no empieza a correr.',
        bloques: [
          {
            campos: [
              { k: 'tExp', l: 'Nº de expediente', t: 'ro', v: '2026-0280' },
              { k: 'tFecha', l: 'Fecha de presentación', t: 'date', v: '2026-08-04' },
              { k: 'tRecibo', l: 'Nº de recibo', t: 'text', v: '0003-0041183' },
              { k: 'tImporte', l: 'Derecho de trámite (S/)', t: 'ro', v: '184.00' },
              { k: 'tRes', l: 'Nº de resolución', t: 'text', v: '', ayuda: 'Se genera al aprobar' },
              { k: 'tResFecha', l: 'Fecha de resolución', t: 'date', v: '' },
              { k: 'tObs', l: 'Observaciones', t: 'area', ancho: 1, v: '' },
            ],
          },
        ],
        tabla: {
          titulo: 'Actos del expediente',
          conteo: '',
          min: '660px',
          cols: [['Nº', 0], ['Acto', 0], ['Fecha', 0], ['Documento', 0], ['Estado', 0]],
          filas: 'actos',
          insignia: 4,
          nota: 'El plazo del TUPA corre desde la presentación con la tasa pagada, no desde que el expediente llega al evaluador.',
        },
      },
    ],
  },
  edificacion: {
    label: 'Licencia de edificación (FUE)',
    plazoDias: 30,
    modalidad: 'Aprobación automática con firma de revisores',
    requisitos: [
      ['Formulario único de edificación (FUE)', 'Tres juegos firmados por el propietario y los proyectistas.', 'Administrado'],
      ['Planos de arquitectura, estructuras e instalaciones', 'Firmados por profesionales habilitados con su CAP o CIP.', 'Administrado'],
      ['Certificado de factibilidad de servicios', 'Solo en obra nueva y ampliación.', 'Administrado'],
      ['Póliza CAR o certificado de seguro', 'Por el plazo de ejecución de la obra.', 'Administrado'],
      ['Pago del derecho de licencia', 'Se calcula por valor de obra y modalidad.', 'Administrado'],
      ['Conformidad de revisores urbanos o comisión técnica', 'Según la modalidad del trámite.', 'Municipalidad'],
      ['Verificación del retiro y de los parámetros urbanísticos', 'La hace la municipalidad contra el certificado de parámetros.', 'Municipalidad'],
    ],
    tabs: [
      {
        label: 'Licencia',
        titulo: 'Datos de la licencia de edificación',
        nota: 'La modalidad decide quién aprueba: aprobación automática, revisores urbanos o comisión técnica. No es lo mismo un cerco que un edificio.',
        bloques: [
          {
            campos: [
              { k: 'eExp', l: 'Nº de expediente', t: 'ro', v: '00007' },
              { k: 'eExpAnt', l: 'Nº de expediente anterior', t: 'text', v: '' },
              { k: 'eLicAnt', l: 'Nº de licencia anterior', t: 'text', v: '' },
              { k: 'eTipo', l: 'Tipo de trámite', t: 'sel', ancho: 1, v: 'LICENCIA DE OBRA', o: ['ANTEPROYECTO EN CONSULTA', 'LICENCIA DE OBRA', 'AMPLIACIÓN DE LICENCIA', 'REVALIDACIÓN DE LICENCIA', 'REGULARIZACIÓN DE LICENCIA'] },
              { k: 'eObra', l: 'Tipo de obra', t: 'sel', ancho: 1, v: 'EDIFICACIÓN NUEVA', o: ['EDIFICACIÓN NUEVA', 'AMPLIACIÓN', 'REMODELACIÓN', 'DEMOLICIÓN TOTAL', 'CERCO', 'PUESTA EN VALOR'] },
              { k: 'eModalidad', l: 'Modalidad de aprobación', t: 'sel', ancho: 1, v: 'A — APROBACIÓN AUTOMÁTICA', o: ['A — APROBACIÓN AUTOMÁTICA', 'B — COMISIÓN TÉCNICA', 'C — REVISORES URBANOS', 'D — COMISIÓN TÉCNICA'] },
              { k: 'eDecl', l: 'Fecha de declaración', t: 'date', v: '2026-08-04' },
              { k: 'eCaduca', l: 'Caducidad de la licencia', t: 'ro', v: '04/08/2031', ayuda: 'Treinta y seis meses, prorrogables' },
              { k: 'eInicio', l: 'Fecha de inicio de obra', t: 'date', v: '2026-09-01' },
            ],
          },
          {
            titulo: 'Solicitante',
            campos: [
              { k: 'eSolic', l: 'Solicitante', t: 'ro', ancho: 1, v: '00000152614 — VALDEZ RIOS, OLIVER FABIÁN Y MILENA A.' },
              { k: 'eCalidad', l: 'Calidad del solicitante', t: 'sel', v: 'PROPIETARIO', o: ['PROPIETARIO', 'NO PROPIETARIO'] },
              { k: 'eRepr', l: 'Representante legal', t: 'text', v: '' },
            ],
          },
          {
            titulo: 'Anexos del FUE',
            campos: [
              { k: 'eAnexoA', l: 'Anexo A', t: 'chk', v: false, ph: 'Datos de condóminos — personas naturales' },
              { k: 'eAnexoB', l: 'Anexo B', t: 'chk', v: false, ph: 'Datos de condóminos — personas jurídicas' },
              { k: 'eAnexoC', l: 'Anexo C', t: 'chk', v: true, ph: 'Pre-declaratoria de fábrica' },
              { k: 'eAnexoD', l: 'Anexo D', t: 'chk', v: true, ph: 'Autoliquidación del derecho' },
            ],
          },
        ],
      },
      {
        label: 'Terreno y proyecto',
        titulo: 'Terreno y proyecto',
        nota: 'El derecho de licencia se calcula sobre el valor de obra, y el valor de obra sobre los valores unitarios de Catastro. Ninguna de las dos cifras se teclea.',
        bloques: [
          {
            titulo: 'Terreno',
            campos: [
              { k: 'tCod', l: 'Código catastral', t: 'ro', v: '02-016-A-09-00' },
              { k: 'tDir', l: 'Dirección', t: 'ro', ancho: 1, v: 'AV. JOSÉ DE LAMA 1180' },
              { k: 'tArea', l: 'Área del terreno (m²)', t: 'ro', v: '640.00' },
              { k: 'tParametros', l: 'Certificado de parámetros', t: 'text', v: 'CP-2026-0418' },
              { k: 'tZonif', l: 'Zonificación', t: 'ro', v: 'INDUSTRIA LIVIANA' },
              { k: 'tRetiro', l: 'Retiro exigido (m)', t: 'ro', v: '3.00' },
            ],
          },
          {
            titulo: 'Proyecto',
            campos: [
              { k: 'prPisos', l: 'Nº de pisos', t: 'text', v: '1' },
              { k: 'prAreaLibre', l: 'Área libre (m²)', t: 'text', v: '600.00' },
              { k: 'prAreaConstr', l: 'Área construida (m²)', t: 'ro', v: '40.00' },
              { k: 'prValorObra', l: 'Valor de obra (S/)', t: 'ro', v: '24,483.20' },
              { k: 'prDerecho', l: 'Derecho de licencia (S/)', t: 'ro', v: '6,365.63' },
              { k: 'prMulta', l: 'Multa por regularización (S/)', t: 'ro', v: '0.00' },
            ],
          },
        ],
        tabla: {
          titulo: 'Pisos del proyecto',
          conteo: '1 piso',
          min: '700px',
          cols: [['Piso', 0], ['Uso', 0], ['Área m²', 1], ['Valor unitario S/', 1], ['Valor del piso S/', 1], ['Derecho S/', 1]],
          filas: [['1', 'RESIDENCIAL', '40.00', '612.08', '24,483.20', '6,365.63']],
          totales: [['Pisos', '1', 0], ['Área construida', '40.00 m²', 0], ['Valor de obra', 'S/ 24,483.20', 0], ['Derecho de licencia', 'S/ 6,365.63', 1]],
          nota: 'El valor unitario sale del cuadro de Catastro para las categorías declaradas en las estructuras del proyecto.',
        },
      },
      {
        label: 'Profesionales',
        titulo: 'Proyectistas y responsables de obra',
        nota: 'Cada especialidad necesita un profesional habilitado. Un colegiado no habilitado invalida el plano que firma y con él la licencia.',
        bloques: [
          {
            campos: [
              { k: 'fArq', l: 'Arquitecto', t: 'text', ancho: 1, v: 'RÍOS PALACIOS, JORGE — CAP 12844' },
              { k: 'fEstr', l: 'Ingeniero estructural', t: 'text', ancho: 1, v: 'ANCAJIMA FLORES, CARLOS — CIP 84118' },
              { k: 'fSanit', l: 'Ingeniero sanitario', t: 'text', ancho: 1, v: '' },
              { k: 'fElec', l: 'Ingeniero electricista', t: 'text', ancho: 1, v: '' },
              { k: 'fResp', l: 'Responsable de obra', t: 'text', ancho: 1, v: 'RÍOS PALACIOS, JORGE — CAP 12844' },
              { k: 'fSuper', l: 'Supervisor municipal', t: 'sel', v: 'PEÑA SANDOVAL, LUIS', o: ['PEÑA SANDOVAL, LUIS', 'VÍLCHEZ ROJAS, ANDRÉS'] },
            ],
          },
        ],
        tabla: {
          titulo: 'Documentos adjuntos',
          conteo: '4 archivos',
          min: '640px',
          cols: [['Documento', 0], ['Especialidad', 0], ['Profesional', 0], ['Estado', 0]],
          filas: [
            ['Planos de arquitectura', 'Arquitectura', 'RÍOS PALACIOS, JORGE', 'Conforme'],
            ['Planos de estructuras', 'Estructuras', 'ANCAJIMA FLORES, CARLOS', 'Conforme'],
            ['Planos de instalaciones sanitarias', 'Sanitarias', '—', 'Falta'],
            ['Póliza CAR', 'Seguros', '—', 'Falta'],
          ],
          insignia: 3,
          nota: 'Lo que falta bloquea la conformidad, no la presentación: el expediente se admite incompleto y el plazo corre igual.',
        },
      },
    ],
  },
  anuncio: {
    label: 'Anuncio y propaganda',
    plazoDias: 10,
    modalidad: 'Aprobación automática',
    requisitos: [
      ['Solicitud con diseño del anuncio', 'Con medidas, materiales y ubicación exacta en la fachada.', 'Administrado'],
      ['Licencia de funcionamiento vigente', 'El anuncio se autoriza sobre un establecimiento autorizado.', 'Administrado'],
      ['Autorización del propietario del inmueble', 'Si el solicitante no es el propietario.', 'Administrado'],
      ['Pago del derecho de anuncio', 'Se calcula por área del anuncio y tipo de vía.', 'Administrado'],
      ['Conformidad de ornato y seguridad', 'La municipalidad verifica que no invada la vía ni obstruya señales.', 'Municipalidad'],
    ],
    tabs: [
      {
        label: 'Anuncio',
        titulo: 'Datos del anuncio',
        nota: 'El derecho se calcula por área: base por altura por número de lados. Un anuncio de dos caras paga por las dos.',
        bloques: [
          {
            campos: [
              { k: 'aNum', l: 'Nº de autorización', t: 'ro', v: '2026-000001' },
              { k: 'aEstado', l: 'Estado', t: 'sel', v: 'ACTIVA', o: ['ACTIVA', 'PENDIENTE', 'VENCIDA', 'ANULADA'] },
              { k: 'aInicio', l: 'Fecha de inicio', t: 'date', v: '2026-08-04' },
              { k: 'aVence', l: 'Fecha de vencimiento', t: 'date', v: '2027-08-04', ayuda: 'La autorización de anuncio es anual y se renueva' },
              { k: 'aExp', l: 'Nº de expediente', t: 'text', v: '2026-0281' },
              { k: 'aLicencia', l: 'Licencia de funcionamiento', t: 'text', v: 'LF-2024-00812' },
            ],
          },
          {
            titulo: 'Titular y predio',
            campos: [
              { k: 'aContrib', l: 'Contribuyente', t: 'ro', ancho: 1, v: '00000025673 — SUC. RUFINA MEDINA MEDINA' },
              { k: 'aDoc', l: 'D.N.I. / R.U.C.', t: 'ro', v: 'DNI 03593174' },
              { k: 'aRazon', l: 'Razón social', t: 'text', v: '' },
              { k: 'aCod', l: 'Código catastral', t: 'ro', v: '02-014-D-14-01' },
              { k: 'aDir', l: 'Dirección', t: 'ro', ancho: 1, v: 'URB. SANTA ROSA — EL ALTO 116' },
            ],
          },
          {
            titulo: 'Características del anuncio',
            campos: [
              { k: 'aClase', l: 'Clase de anuncio', t: 'sel', v: 'LETRERO', o: ['LETRERO', 'PANEL MONUMENTAL', 'AVISO LUMINOSO', 'TOLDO', 'BANDEROLA', 'PANTALLA DIGITAL'] },
              { k: 'aTipo', l: 'Tipo de anuncio', t: 'sel', v: 'AVISO SIMPLE', o: ['AVISO SIMPLE', 'AVISO LUMINOSO', 'AVISO ILUMINADO'] },
              { k: 'aUbic', l: 'Ubicación', t: 'sel', v: 'LOCALES COMERCIALES', o: ['LOCALES COMERCIALES', 'FACHADA', 'AZOTEA', 'VÍA PÚBLICA', 'MOBILIARIO URBANO'] },
              { k: 'aForma', l: 'Forma', t: 'sel', v: 'MONOLITO', o: ['MONOLITO', 'ADOSADO', 'PERPENDICULAR', 'BANDEJA'] },
              { k: 'aDenom', l: 'Texto del anuncio', t: 'text', ancho: 1, v: 'VAMOS PERÚ!!!' },
              { k: 'aBase', l: 'Base (m)', t: 'text', v: '8.0000' },
              { k: 'aAltura', l: 'Altura (m)', t: 'text', v: '2.0000' },
              { k: 'aLados', l: 'Nº de lados', t: 'text', v: '2' },
              { k: 'aArea', l: 'Área total (m²)', t: 'ro', v: '32.0000', ayuda: 'Base × altura × lados' },
              { k: 'aTasa', l: 'Derecho de anuncio (S/)', t: 'ro', v: '412.00' },
            ],
          },
        ],
      },
      {
        label: 'Trámite y cancelación',
        titulo: 'Recibo y cancelación',
        nota: 'El anuncio se cancela cuando el negocio cierra o cuando el anuncio se retira. Si no se cancela, el derecho sigue devengando cada año.',
        bloques: [
          {
            campos: [
              { k: 'aRecibo', l: 'Nº de recibo', t: 'text', v: '0003-0041184' },
              { k: 'aRecFecha', l: 'Fecha del recibo', t: 'date', v: '2026-08-04' },
              { k: 'aRecImp', l: 'Importe (S/)', t: 'ro', v: '412.00' },
              { k: 'aResol', l: 'Nº de resolución', t: 'text', v: '' },
              { k: 'aCancela', l: 'Cancelación', t: 'chk', v: false, ph: 'El anuncio fue retirado' },
              { k: 'aCancelaFecha', l: 'Fecha de cancelación', t: 'date', v: '' },
              { k: 'aObs', l: 'Observaciones', t: 'area', ancho: 1, v: '' },
            ],
          },
        ],
      },
    ],
  },
};

export type Solicitud = {
  exp: string;
  tipo: TipoDeTramite;
  titular: string;
  doc: string;
  negocio: string;
  presentada: string;
  resuelta?: string;
  /** Días hábiles transcurridos desde la presentación. */
  dias: number;
  estado: string;
  /** Requisitos cumplidos de partida, antes de que nadie marque nada. */
  cumplidos: number;
};

export const SOLICITUDES: Solicitud[] = [
  { exp: '2026-0280', tipo: 'funcionamiento', titular: 'CASTILLO PASCUALA, MARÍA ELENA', doc: 'DNI 44218937', negocio: 'RESTAURANT SABOR Y SAZÓN', presentada: '04/08/2026', dias: 7, estado: 'En evaluación', cumplidos: 4 },
  { exp: '2026-0281', tipo: 'anuncio', titular: 'SUC. RUFINA MEDINA MEDINA', doc: 'DNI 03593174', negocio: 'VAMOS PERÚ!!! — letrero', presentada: '04/08/2026', resuelta: '11/08/2026', dias: 7, estado: 'Otorgada', cumplidos: 5 },
  { exp: '00007', tipo: 'edificacion', titular: 'VALDEZ RIOS, OLIVER FABIÁN', doc: 'DNI 41182844', negocio: 'Edificación nueva 40 m²', presentada: '04/08/2026', dias: 7, estado: 'En evaluación', cumplidos: 5 },
  { exp: '2026-0650', tipo: 'funcionamiento', titular: 'DÍAZ MADRID, JULIO CÉSAR', doc: 'DNI 02718844', negocio: 'BODEGA LOS ÁNGELES', presentada: '21/07/2026', dias: 17, estado: 'Vencida sin resolver', cumplidos: 6 },
  { exp: '2026-0621', tipo: 'anuncio', titular: 'NOBLECILLA ARISMENDIZ SAC', doc: 'RUC 20525118447', negocio: 'DEPÓSITO NOBLECILLA — panel', presentada: '18/07/2026', dias: 20, estado: 'Observada', cumplidos: 3 },
  { exp: '2026-0418', tipo: 'edificacion', titular: 'INVERSIONES DEL NORTE SAC', doc: 'RUC 20525118880', negocio: 'Ampliación 220 m²', presentada: '02/06/2026', resuelta: '15/07/2026', dias: 52, estado: 'Denegada', cumplidos: 4 },
];

/** [etiqueta, tono, título, detalle, conteo, nota] */
export const BANDEJA: [string, 'ok' | 'warn' | 'bad', string, string, number, string][] = [
  ['Plazo agotado', 'bad', 'Con el plazo del TUPA agotado', 'Otorgadas por silencio positivo si nadie resuelve. La evaluación ya no las detiene.', 42, 'de aprobación automática'],
  ['Requisitos incompletos', 'bad', 'Con requisitos sin cumplir', 'El expediente se admitió incompleto y el plazo corre igual. Hay que observar al administrado.', 88, 'esperando al administrado'],
  ['Por vencer', 'warn', 'Con menos de cinco días de plazo', 'Lo que hay que resolver esta semana antes de que el silencio decida.', 34, 'en los próximos 5 días'],
  ['En evaluación', 'ok', 'En evaluación, dentro de plazo', 'Con requisitos completos y tiempo por delante.', 24, 'sin urgencia'],
  ['Resueltas', 'ok', 'Resueltas este mes', 'Otorgadas o denegadas con resolución notificada.', 188, 'otorgadas y denegadas'],
];

/** [resueltas del ejercicio, % resuelto dentro del plazo del TUPA] */
export const AVANCE_DE_TRAMITES: Record<TipoDeTramite, [number, number]> = {
  funcionamiento: [474, 88.4],
  edificacion: [188, 71.2],
  anuncio: [1184, 94.1],
};

/** [código CIIU, materia, actividad, riesgo] */
export const CIIU: string[][] = [
  ['G-5211-01', 'Comercialización', 'VENTA AL POR MENOR EN ALMACENES NO ESPECIALIZADOS', 'Bajo'],
  ['G-5234-01', 'Comercialización', 'VENTA DE MATERIALES DE CONSTRUCCIÓN', 'Medio'],
  ['D-1549-19', 'Alimentos', 'RESTAURANTE-POLLERÍA', 'Medio'],
  ['H-5520-02', 'Alimentos', 'SERVICIO DE RESTAURANTES A DOMICILIO', 'Bajo'],
  ['H-5520-63', 'Alimentos', 'CHIFA AL PASO', 'Medio'],
  ['I-6023-01', 'Transporte', 'TRANSPORTE DE CARGA POR CARRETERA', 'Alto'],
  ['D-2320-01', 'Industria', 'FABRICACIÓN DE PRODUCTOS DE REFINACIÓN', 'Alto'],
];

/** [nº certificado, tipo, código catastral, dirección, emitido, estado] */
export const CERTIFICADOS: string[][] = [
  ['CN-2026-0418', 'Numeración', '02-014-D-14-01', 'CALLE LAMA 482', '13/08/2026', 'Emitido'],
  ['CZ-2026-0388', 'Zonificación y vías', '02-016-A-09-00', 'AV. JOSÉ DE LAMA 1180', '11/08/2026', 'Emitido'],
  ['CP-2026-0418', 'Parámetros urbanísticos', '02-016-A-09-00', 'AV. JOSÉ DE LAMA 1180', '11/08/2026', 'Emitido'],
  ['CN-2026-0344', 'Numeración', '03-1042-0088', 'PASAJE EL ALTO 116', '04/08/2026', 'Pendiente'],
];

export const COLS_CIIU: ColDef[] = [['Código CIIU', 0], ['Materia', 0], ['Actividad', 0], ['Riesgo', 0]];
export const COLS_CERT: ColDef[] = [['Nº certificado', 0], ['Tipo', 0], ['Código catastral', 0], ['Dirección', 0], ['Emitido', 0], ['Estado', 0]];
export const FILTROS_CIIU = ['Todas', 'Comercialización', 'Alimentos', 'Transporte', 'Industria'];
export const FILTROS_CERT = ['Todas', 'Numeración', 'Zonificación y vías', 'Parámetros urbanísticos'];

export const COLS_LISTA: ColDef[] = [['Expediente', 0], ['Trámite', 0], ['Titular', 0], ['Objeto', 0], ['Presentada', 0], ['Requisitos', 0], ['Plazo', 0], ['Estado', 0]];
export const TIPOS_DE_LISTA = ['Todos', 'funcionamiento', 'edificacion', 'anuncio'] as const;
export const ESTADOS_DE_LISTA = ['Todos', 'En evaluación', 'Observada', 'Vencida sin resolver', 'Otorgada', 'Denegada'];

export type ClaveDeCriterio =
  | 'anio' | 'estado' | 'tipoLic' | 'ciiu' | 'modalidad' | 'tipoObra'
  | 'clase' | 'desde' | 'hasta' | 'agrupa' | 'orden';

export type Criterio = { l: string; t: 'sel' | 'text' | 'date'; v: string; o?: string[] };

export const CRITERIOS: Record<ClaveDeCriterio, Criterio> = {
  anio: { l: 'Ejercicio', t: 'sel', v: '2026', o: ['2026', '2025', '2024', '2023'] },
  estado: { l: 'Estado', t: 'sel', v: 'Todos', o: ['Todos', 'ACTIVA', 'PENDIENTE', 'VENCIDA', 'ANULADA', 'CESADA'] },
  tipoLic: { l: 'Tipo de licencia', t: 'sel', v: 'Todos', o: ['Todos', 'DEFINITIVA', 'TEMPORAL', 'CESIONARIA'] },
  ciiu: { l: 'Giro (CIIU)', t: 'text', v: '' },
  modalidad: { l: 'Modalidad', t: 'sel', v: 'Todas', o: ['Todas', 'A', 'B', 'C', 'D'] },
  tipoObra: { l: 'Tipo de obra', t: 'sel', v: 'Todos', o: ['Todos', 'EDIFICACIÓN NUEVA', 'AMPLIACIÓN', 'REMODELACIÓN', 'DEMOLICIÓN TOTAL', 'CERCO'] },
  clase: { l: 'Clase de anuncio', t: 'sel', v: 'Todas', o: ['Todas', 'LETRERO', 'PANEL MONUMENTAL', 'AVISO LUMINOSO', 'TOLDO', 'BANDEROLA'] },
  desde: { l: 'Desde', t: 'date', v: '2026-01-01' },
  hasta: { l: 'Hasta', t: 'date', v: '2026-08-13' },
  agrupa: { l: 'Agrupado por', t: 'sel', v: 'GIRO COMERCIAL', o: ['AÑO', 'GIRO COMERCIAL', 'DIRECCIÓN', 'TITULAR', 'ESTADO'] },
  orden: { l: 'Ordenado por', t: 'sel', v: 'Nº DE LICENCIA', o: ['Nº DE LICENCIA', 'TITULAR', 'GIRO COMERCIAL', 'DIRECCIÓN'] },
};

export type Hoja = {
  /** El grupo del carril: solo lo rotula la primera hoja de cada uno. */
  g: string;
  label: string;
  codigo: string;
  sub: string;
  crit: ClaveDeCriterio[];
  meta: [string, string][];
  cols: ColDef[];
  filas: string[][];
  cierre: string;
};

export const HOJAS: Hoja[] = [
  {
    g: 'Licencias de funcionamiento',
    label: 'Padrón de licencias',
    codigo: 'PL-2026-00418',
    sub: 'Padrón de licencias municipales de funcionamiento',
    crit: ['anio', 'estado', 'tipoLic', 'ciiu', 'agrupa', 'orden'],
    meta: [['Ejercicio', '2026'], ['Licencias', '6,418'], ['Activas', '5,884'], ['Agrupado por', 'Giro comercial']],
    cols: [['Nº licencia', 0], ['Titular', 0], ['Denominación', 0], ['Giro', 0], ['Dirección', 0], ['Estado', 0]],
    filas: [
      ['2026-006549', 'ELEODORO QUIROGA RAMOS', 'BODEGA EL SOL', 'G-5211-01', 'CENTRO DE CATACAOS — DE LAMA 482', 'Activa'],
      ['2026-006550', 'DÍAZ MADRID, JULIO CÉSAR', 'BODEGA LOS ÁNGELES', 'G-5211-01', 'C.P. BARRIO BUENOS AIRES', 'Activa'],
      ['2026-000000', 'CASTILLO PASCUALA, MARÍA E.', 'RESTAURANT SABOR Y SAZÓN', 'D-1549-19', 'ZONA 2 INDUSTRIAL', 'Pendiente'],
    ],
    cierre: 'El padrón es la base del cruce con fiscalización: un establecimiento en funcionamiento que no figura aquí es una infracción C-101.',
  },
  {
    g: 'Licencias de funcionamiento',
    label: 'Resumen de licencias por año',
    codigo: 'RL-2026-00418',
    sub: 'Licencias otorgadas por ejercicio y giro',
    crit: ['anio', 'agrupa'],
    meta: [['Periodo', '2022 — 2026'], ['Otorgadas', '2,844'], ['Ceses', '412'], ['Agrupado por', 'Año']],
    cols: [['Ejercicio', 0], ['Otorgadas', 1], ['Ceses', 1], ['Activas al cierre', 1], ['Derecho recaudado S/', 1]],
    filas: [
      ['2024', '588', '84', '5,412', '108,192.00'],
      ['2025', '644', '112', '5,944', '118,496.00'],
      ['2026', '474', '88', '6,330', '87,216.00'],
    ],
    cierre: 'El derecho recaudado es solo la tasa de trámite. Lo que el establecimiento paga después son arbitrios, y esos van por Rentas.',
  },
  {
    g: 'Edificación',
    label: 'Reporte de licencias de edificación',
    codigo: 'RE-2026-00418',
    sub: 'Licencias de edificación por modalidad y tipo de obra',
    crit: ['anio', 'modalidad', 'tipoObra', 'desde', 'hasta'],
    meta: [['Ejercicio', '2026'], ['Licencias', '188'], ['Área autorizada', '42,844 m²'], ['Derecho recaudado', 'S/ 884,116.00']],
    cols: [['Nº expediente', 0], ['Titular', 0], ['Tipo de obra', 0], ['Modalidad', 0], ['Área m²', 1], ['Derecho S/', 1]],
    filas: [
      ['00007', 'VALDEZ RIOS, OLIVER FABIÁN', 'Edificación nueva', 'A', '40.00', '6,365.63'],
      ['2026-0418', 'INVERSIONES DEL NORTE SAC', 'Ampliación', 'C', '220.00', '34,116.00'],
      ['2026-0344', 'ASOC. PRO CASA DEL MAESTRO', 'Remodelación', 'B', '412.00', '61,844.00'],
    ],
    cierre: 'El área autorizada alimenta el catastro: cada licencia de obra terminada debe acabar en una actualización de ficha.',
  },
  {
    g: 'Anuncios',
    label: 'Padrón de anuncios y propaganda',
    codigo: 'PA-2026-00418',
    sub: 'Autorizaciones de anuncio vigentes',
    crit: ['anio', 'estado', 'clase', 'desde', 'hasta'],
    meta: [['Ejercicio', '2026'], ['Autorizaciones', '1,184'], ['Vigentes', '844'], ['Derecho recaudado', 'S/ 412,844.00']],
    cols: [['Nº autorización', 0], ['Titular', 0], ['Clase', 0], ['Área m²', 1], ['Vence', 0], ['Estado', 0]],
    filas: [
      ['2026-000001', 'SUC. RUFINA MEDINA MEDINA', 'Letrero', '32.00', '04/08/2027', 'Activa'],
      ['2026-000188', 'NOBLECILLA ARISMENDIZ SAC', 'Panel monumental', '96.00', '18/07/2027', 'Pendiente'],
      ['2025-000844', 'DISARTEX S.A.C.', 'Aviso luminoso', '18.00', '12/11/2026', 'Activa'],
    ],
    cierre: 'Un anuncio sin autorización vigente es la infracción A-042 del cuadro CUIS, y su retiro es medida complementaria.',
  },
];

/** Las once opciones del manual que el módulo resume, con el destino al que
 *  lleva cada una. Es lo que alimenta la paleta de comandos. */
export const OPCIONES: [string, string][] = [
  ['Licencia de funcionamiento', 'lista'],
  ['Padrón de licencias', 'reportes'],
  ['Resumen de licencias por año', 'reportes'],
  ['Res. de cancelación', 'lista'],
  ['Res. de duplicado', 'lista'],
  ['FUE — edificación', 'lista'],
  ['Reporte de licencias de edificación', 'reportes'],
  ['Anuncio y propaganda', 'lista'],
  ['Reportes de anuncios', 'reportes'],
  ['Catálogo CIIU', 'catalogos'],
  ['Certificados', 'catalogos'],
];
