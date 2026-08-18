/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * Lo que responde cada una de las 134 operaciones: valores de campo, filas de
 * tabla, indicadores, totales y reportes. Son los datos de ejemplo del
 * prototipo, con la Municipalidad Provincial de Sullana como entidad.
 *
 * Es lo unico que el backend tendra que reemplazar. La estructura de las
 * pantallas vive en la aplicacion, no aqui.
 */

import type { DatosDePantalla } from '@sgtm/api-client';

export const RESPUESTAS: Readonly<Record<string, DatosDePantalla>> = {
  inicio: {
    fechaCalculo: '2026-08-13',
    kpis: [
      {
        label: 'Recaudado 2026',
        value: 'S/ 18.42 M',
        note: '77.6 % de lo emitido',
      },
      {
        label: 'Predial del mes',
        value: 'S/ 1.94 M',
        note: '+12.8 % vs. julio',
      },
      {
        label: 'Cartera morosa',
        value: 'S/ 26.71 M',
        note: '38,412 contribuyentes',
      },
      {
        label: 'Emitidos hoy',
        value: '412',
        note: 'recibos · 9 cajas activas',
      },
    ],
    paneles: [
      {
        title: 'Recaudación por tributo',
        note: 'Ejercicio 2026',
        rows: [
          {
            label: 'Impuesto predial',
            sub: '24,118 contribuyentes',
            value: 'S/ 8.42 M',
            pct: 89,
          },
          {
            label: 'Arbitrios municipales',
            sub: 'Limpieza, parques, serenazgo',
            value: 'S/ 5.11 M',
            pct: 87,
          },
          {
            label: 'Patrimonio vehicular',
            sub: '3,204 vehículos afectos',
            value: 'S/ 1.88 M',
            pct: 65,
          },
          {
            label: 'Alcabala',
            sub: '612 transferencias',
            value: 'S/ 1.42 M',
            pct: 100,
          },
          {
            label: 'Multas y papeletas',
            sub: 'Tránsito e infracciones',
            value: 'S/ 1.59 M',
            pct: 39,
          },
        ],
      },
      {
        title: 'Pendientes por unidad',
        note: 'Requieren acción',
        rows: [
          {
            label: 'Valores por notificar',
            sub: 'Órdenes de pago y RD',
            value: '1,284',
            pct: 74,
          },
          {
            label: 'Expedientes coactivos activos',
            sub: 'Ejecutor: R. Mendoza',
            value: '318',
            pct: 45,
          },
          {
            label: 'Fiscalizaciones en campo',
            sub: 'Sectores 02 y 04',
            value: '96',
            pct: 28,
          },
          {
            label: 'Convenios en riesgo',
            sub: '2 cuotas vencidas',
            value: '141',
            pct: 52,
          },
          {
            label: 'Licencias por resolver',
            sub: 'Funcionamiento y edificación',
            value: '73',
            pct: 21,
          },
        ],
      },
    ],
  },
  portal: {
    fechaCalculo: '2026-08-13',
    campos: {
      medioDePago: 'Tarjeta de débito o crédito',
      correoParaElComprobante: 'mcastillo@correo.pe',
      celular: '969 442 118',
      aceptoLosTerminosDelPagoElectronico: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: 'Impuesto predial — cuota 2',
          },
          {
            texto: '2026',
          },
          {
            texto: '31/05/2026',
          },
          {
            texto: '146.86',
          },
          {
            texto: '6.96',
          },
          {
            texto: '153.82',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: 'Arbitrios municipales',
          },
          {
            texto: '2026',
          },
          {
            texto: 'Mensual',
          },
          {
            texto: '486.00',
          },
          {
            texto: '25.64',
          },
          {
            texto: '511.64',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: 'Impuesto predial — cuota 3',
          },
          {
            texto: '2025',
          },
          {
            texto: '31/08/2025',
          },
          {
            texto: '144.20',
          },
          {
            texto: '51.78',
          },
          {
            texto: '195.98',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: 'Patrimonio vehicular T2G-418',
          },
          {
            texto: '2024',
          },
          {
            texto: '28/02/2024',
          },
          {
            texto: '614.00',
          },
          {
            texto: '326.64',
          },
          {
            texto: '940.64',
          },
        ],
      ],
      conteo: 'CASTILLO PASCUALA, MARÍA ELENA',
    },
    totales: [
      {
        label: 'Seleccionado',
        value: 'S/ 665.46',
      },
      {
        label: 'Descuento pronto pago',
        value: '− S/ 25.40',
      },
      {
        label: 'Total a pagar',
        value: 'S/ 640.06',
      },
    ],
  },
  ficha_urbana: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigoDeRefCatastral: '200601010150010101001',
      codContribuyenteRentas: '00000025673',
      uso: 'Todos',
      codigoDeRefCatastral2: '200601010150010101001',
      uso2: 'Casa habitación',
      cuc: '0015001',
      codigoHojaCatastral: '200601-15',
      codRefCatastralUrb: '200601 · 01 · 015 · 001 · 01 · 01 · 01 · 001',
      codContribuyenteRentas2: '00000025673',
      nombreDelContribuyente: 'SUC. RUFINA MEDINA MEDINA',
      codigoPredialDeRentas: '02-014-D-14-01',
      codigoAnterior: '—',
      nroFicha2: '000418',
      arancel: '198.40',
      numeroDeFichaPorLote: '01 de 03',
      tipoDeVia: '02 — CALLE',
      calle: 'SANTA ROSA',
      tipoDePuerta: 'P — PRINCIPAL',
      condNumeracion: '99 — NO ESPECIFICADO',
      nuevoNMunicipal: '116',
      departamento: 'PIURA',
      provincia: 'SULLANA',
      distrito: 'SULLANA',
      sector: '01',
      manzana: '015',
      lote: '001',
      edificacion: '01',
      entrada: '01',
      piso: '01',
      unidad: '001',
      habilitacionUrbana: 'URB. SANTA ROSA — EL ALTO',
      zonaSectorCatastral: 'Zona 2',
      referencia: 'Frente al parque',
      condicionDelTitular: 'PROPIETARIO ÚNICO',
      formaDeAdquisicion: 'COMPRA-VENTA',
      fechaDeAdquisicion: '2004-06-18',
      documentoQueAcredita: 'ESCRITURA PÚBLICA',
      nDePartidaRegistral: 'P11024478',
      oficinaRegistral: 'SUNARP — SULLANA',
      deParticipacion: '100.00',
      codContribuyente: '00000025673',
      nombreRazonSocial: 'SUC. RUFINA MEDINA MEDINA',
      dNI: '03593174',
      dePropiedad: '100.00',
      condicion: 'TITULAR',
      estadoCivil: 'VIUDO(A)',
      fechaDesde: '2004-06-18',
      nPiso: '01',
      mes: '01',
      ano: '2000',
      mep: '02 — LADRILLO',
      ecs: '02 — BUENO',
      ecc: '03 — TERMINADO',
      muros: 'C',
      techos: 'D',
      pisos: 'E',
      puertas: 'E',
      revest: 'E',
      banos: 'E',
      instalacionesElectricas: 'F',
      areaConstruidaDeclarada: '100.00',
      areaConstruidaVerificada: '100.00',
      uca: '99 — NO ESPECIFICADO',
      terrenoLegal: '210.00',
      terrenoFisico: '210.00',
      construcLegal: '164.50',
      construcFisico: '198.00',
      tipoDeObra: 'CERCO PERIMÉTRICO',
      unidadDeMedida: 'ml',
      metrado: '38.00',
      ano2: '2006',
      mes2: '03',
      estadoDeConservacion: 'BUENO',
      valorUnitarioS: '142.00',
      valorDeLaObraS: '4,120.00',
      documento: '02718844',
      nombreDelInquilino: 'DÍAZ MADRID, JULIO CÉSAR',
      areaOcupadaM: '48.00',
      usoQueDaAlPredio: 'COMERCIO',
      fechaDeInicio: '2024-01-02',
      mercedConductivaS: '450.00',
      codUsoRecRecoleccion: '01 — CASA HABITACIÓN',
      codUsoBarBarrido: '01 — CASA HABITACIÓN',
      frecuenciaDeRecoleccion: 'INTERDIARIA',
      frecuenciaDeBarrido: 'DIARIA',
      frontisMl: '10.50',
      posicionDelPredio: 'ESQUINA',
      peligrosidadDeLaZona: 'MEDIA',
      factorDeDistribucionDeCosto: '0.00842',
      observaciones:
        'Ampliación del segundo piso verificada en inspección del 03/2026; pendiente de declaración jurada rectificatoria.',
      fichaVerificadaEnCampo: true,
      fechaDeVerificacion: '2026-03-14',
      nDeSuministroDeLuz: '4471182',
      nDeSuministroDeAgua: '221884',
      telefonoDelPredio: '073-502147',
      nDeLicenciaDeFuncionamiento: '2010-006549',
      fuenteDeLaInformacion: 'DECLARACIÓN DEL TITULAR',
      aguaPotable: true,
      desague: true,
      energiaElectrica: true,
      telefono: true,
      tipoDeViaFrenteAlPredio: 'ASFALTADA',
      alumbradoPublico: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: 'SANTA ROSA',
          },
          {
            texto: 'CALLE',
          },
          {
            texto: 'P — Principal',
          },
          {
            texto: '116',
          },
          {
            texto: '—',
          },
          {
            texto: 'MUNICIPAL',
          },
        ],
        [
          {
            texto: 'EL ALTO',
          },
          {
            texto: 'PASAJE',
          },
          {
            texto: 'S — Secundaria',
          },
          {
            texto: '116-A',
          },
          {
            texto: 'INT. 2',
          },
          {
            texto: 'MUNICIPAL',
          },
        ],
        [
          {
            texto: 'LOS ALGARROBOS',
          },
          {
            texto: 'AVENIDA',
          },
          {
            texto: 'C — Cochera',
          },
          {
            texto: '118',
          },
          {
            texto: '—',
          },
          {
            texto: 'ANTERIOR',
          },
        ],
      ],
      conteo: '3 vías registradas',
    },
  },
  ficha_economica: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigoDeRefCatastral: '200601010150010101001',
      codigoDeRefCatastral2: '200601010150010101001',
      nombreComercial: 'BODEGA EL SOL',
      ciiu2: 'G-5211-01 — VENTA AL POR MENOR EN ALMACENES',
      nDeLicenciaDeFuncionamiento: '2010-006549',
      estadoDeLaLicencia: 'ACTIVA',
      areaDestinadaAlNegocioM: '48.00',
      nDeTrabajadores: '2',
      horarioDeAtencion: '07:00 — 22:00',
      fechaDeInicioDeActividades: '2010-09-16',
      cuentaConAnuncioPublicitario: true,
    },
  },
  ficha_bienes: {
    fechaCalculo: '2026-08-13',
    campos: {
      codEdificacion: '200601010150010101',
      codEdificacion2: '200601010150010101',
      denominacion2: 'EDIFICIO SANTA ROSA',
      nDePisos: '3',
      nDeUnidades: '6',
      areaComunDeTerrenoM: '124.00',
      areaComunConstruidaM: '86.00',
      valorDeBienesComunesS: '23,956.00',
      reglamentoInternoInscrito: true,
      partidaDelRegimen: 'P11088412',
    },
    tabla: {
      filas: [
        [
          {
            texto: '001',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: '86.00',
          },
          {
            texto: '18.40',
          },
          {
            texto: '4,412.00',
          },
        ],
        [
          {
            texto: '002',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: '86.00',
          },
          {
            texto: '18.40',
          },
          {
            texto: '4,412.00',
          },
        ],
        [
          {
            texto: '003',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: '92.00',
          },
          {
            texto: '19.68',
          },
          {
            texto: '4,720.00',
          },
        ],
        [
          {
            texto: '004',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: '86.00',
          },
          {
            texto: '18.40',
          },
          {
            texto: '4,412.00',
          },
        ],
        [
          {
            texto: '005',
          },
          {
            texto: 'SILVA CÓRDOVA, ANA',
          },
          {
            texto: '61.00',
          },
          {
            texto: '13.05',
          },
          {
            texto: '3,128.00',
          },
        ],
        [
          {
            texto: '006',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: '56.00',
          },
          {
            texto: '11.98',
          },
          {
            texto: '2,872.00',
          },
        ],
      ],
      conteo: '6 unidades',
    },
    totales: [
      {
        label: 'Área común total',
        value: '210.00 m²',
      },
      {
        label: 'Valor bienes comunes',
        value: 'S/ 23,956.00',
      },
      {
        label: 'Participación asignada',
        value: '100.00 %',
      },
      {
        label: 'Unidades',
        value: '6',
      },
    ],
  },
  ficha_rural: {
    fechaCalculo: '2026-08-13',
    campos: {
      codUnidadCatastralUc: '11024-0418',
      valleSector: 'Todos',
      codUnidadCatastralUc2: '11024-0418',
      nombreDelPredio: 'FUNDO LA CAPILLA',
      valleSector2: 'Valle del Chira',
      comisionDeRegantes: 'JUNTA DE USUARIOS DEL CHIRA',
      codContribuyenteRentas: '00000006551',
      partidaRegistral: 'P11033872',
      areaTotalHa: '4.5000',
      tipoDeTierra: 'A2 — CULTIVO EN LIMPIO',
      condicionDeRiego: 'BAJO RIEGO',
      cultivoPredominante: 'ARROZ',
      arancelRuralSPorHa: '18,400.00',
      valorDelTerrenoRusticoS: '82,800.00',
      valorDeInstalacionesFijasS: '12,400.00',
      autovaluoRuralS: '95,200.00',
    },
  },
  consulta_fichas: {
    fechaCalculo: '2026-08-13',
    campos: {
      conciliadaConRentas: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: '200601010150010101001',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '210.00',
          },
          {
            texto: '164.50',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '200601010150010101002',
          },
          {
            texto: '02-014-D-14-02',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: 'Comercio',
          },
          {
            texto: '120.00',
          },
          {
            texto: '96.00',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '200601010160020101001',
          },
          {
            texto: '—',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '160.00',
          },
          {
            texto: '120.00',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '200601020210070100000',
          },
          {
            texto: '04-021-B-07-00',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'Terreno sin construir',
          },
          {
            texto: '184.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 de 48,412',
    },
  },
  actualizacion_catastro: {
    fechaCalculo: '2026-08-13',
    campos: {
      codRefCatastral: '200601010150010101001',
      sector: 'Todos',
      tipoDeActualizacion: 'INDIVIDUAL',
      nPiso: '01',
      mes: '01',
      ano: '1986',
      mep: '02 — LADRILLO',
      ecs: '03 — REGULAR',
      ecc: '03 — TERMINADO',
      uca: '99 — NO ESPECIFICADO',
      muros: 'C',
      techos: 'F',
      pisos: 'I',
      puertas: 'H',
      revest: 'I',
      banos: 'F',
      instalacionesElectricas: 'H',
      declaradaM: '0.000',
      verificadaM: '40.000',
      legalTerrenoM: '0.00',
      legalConstruccionM: '0.00',
      fisicoTerrenoM: '0.00',
      fisicoConstruccionM: '0.00',
      codigo: '00033 — PORTÓN DE FIERRO (2.50 ML) F2"',
      mes2: '01',
      ano2: '2006',
      mep2: '02 — LADRILLO',
      ecs2: '02 — BUENO',
      edc: '01 — TERRENO SIN CONSTRUIR',
      largo: '1.00',
      ancho: '1.00',
      alto: '1.00',
      metrado: '1.00',
      unidadDeMedida: '02 — METROS CUADRADOS',
      uca2: '99 — NO ESPECIFICADO',
    },
    tabla: {
      filas: [
        [
          {
            texto: '01',
          },
          {
            texto: '01',
          },
          {
            texto: '1986',
          },
          {
            texto: '02',
          },
          {
            texto: '03',
          },
          {
            texto: '03',
          },
          {
            texto: 'C',
          },
          {
            texto: 'F',
          },
          {
            texto: 'I',
          },
          {
            texto: 'I',
          },
          {
            texto: 'F',
          },
          {
            texto: 'H',
          },
          {
            texto: 'H',
          },
          {
            texto: '0.000',
          },
          {
            texto: '40.000',
          },
          {
            texto: '99',
          },
        ],
        [
          {
            texto: '01',
          },
          {
            texto: '01',
          },
          {
            texto: '1978',
          },
          {
            texto: '02',
          },
          {
            texto: '03',
          },
          {
            texto: '03',
          },
          {
            texto: 'C',
          },
          {
            texto: 'F',
          },
          {
            texto: 'H',
          },
          {
            texto: 'F',
          },
          {
            texto: 'H',
          },
          {
            texto: 'E',
          },
          {
            texto: 'G',
          },
          {
            texto: '0.000',
          },
          {
            texto: '75.540',
          },
          {
            texto: '99',
          },
        ],
        [
          {
            texto: '01',
          },
          {
            texto: '01',
          },
          {
            texto: '1986',
          },
          {
            texto: '02',
          },
          {
            texto: '02',
          },
          {
            texto: '03',
          },
          {
            texto: 'C',
          },
          {
            texto: 'F',
          },
          {
            texto: 'G',
          },
          {
            texto: 'F',
          },
          {
            texto: 'F',
          },
          {
            texto: 'H',
          },
          {
            texto: 'H',
          },
          {
            texto: '0.000',
          },
          {
            texto: '77.000',
          },
          {
            texto: '99',
          },
        ],
      ],
      conteo: '3 registros',
    },
  },
  ficha_contribuyente_reporte: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'FC-00000025673',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Código',
          v: '00000025673',
        },
        {
          k: 'Contribuyente',
          v: 'SUC. RUFINA MEDINA MEDINA',
        },
        {
          k: 'Tipo de persona',
          v: 'SUCESIÓN INDIVISA',
        },
        {
          k: 'Documento',
          v: 'DNI 03593174',
        },
        {
          k: 'Domicilio fiscal',
          v: 'CA. SANTA ROSA 116 — URB. SANTA ROSA, SULLANA',
        },
        {
          k: 'Estado',
          v: 'A — ACTIVO',
        },
      ],
      filas: [
        ['Predio', '02-014-D-14-01', 'Casa habitación', 'Propietario único', '1,842.60'],
        ['Predio', '04-021-B-07-00', 'Terreno sin construir', 'Copropietario 50 %', '0.00'],
        ['Vehículo', 'T2G-418', 'Automóvil', 'Afecto 2019 — 2021', '0.00'],
        ['Licencia', 'LF-2024-00812', 'Bodega', 'Vigente', '0.00'],
      ],
      footer:
        'Documento emitido por el Sistema de Gestión Tributaria Municipal. La información corresponde al registro a la fecha de emisión y no constituye constancia de no adeudo.',
    },
  },
  calles: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeVia: 'Todos',
      sector: 'Todos',
      codigoDeVia2: '00001183',
      tipoDeVia2: 'CALLE',
      nombre: 'SANTA ROSA',
      sector2: '01',
      zonaDeArancel: 'Zona 2',
      cuadraDesde: '1',
      cuadraHasta: '12',
      estado: 'ACTIVA',
    },
    tabla: {
      filas: [
        [
          {
            texto: '00001182',
          },
          {
            texto: 'AVENIDA',
          },
          {
            texto: 'JOSÉ DE LAMA',
          },
          {
            texto: '01',
          },
          {
            texto: 'Zona 1',
          },
          {
            texto: '412.60',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00001183',
          },
          {
            texto: 'CALLE',
          },
          {
            texto: 'SANTA ROSA',
          },
          {
            texto: '01',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: '198.40',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00001184',
          },
          {
            texto: 'CALLE',
          },
          {
            texto: 'LAMA',
          },
          {
            texto: '02',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: '198.40',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00001185',
          },
          {
            texto: 'PASAJE',
          },
          {
            texto: 'EL ALTO',
          },
          {
            texto: '02',
          },
          {
            texto: 'Zona 3',
          },
          {
            texto: '142.80',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00001186',
          },
          {
            texto: 'CARRETERA',
          },
          {
            texto: 'SULLANA — PAITA',
          },
          {
            texto: '05',
          },
          {
            texto: 'Zona 4',
          },
          {
            texto: '96.20',
          },
          {
            texto: 'INACTIVA',
            tono: 'bad',
          },
        ],
      ],
      conteo: '5 de 2,184',
    },
  },
  sectores: {
    fechaCalculo: '2026-08-13',
    campos: {
      sector: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '01',
          },
          {
            texto: 'CERCADO DE SULLANA',
          },
          {
            texto: '96',
          },
          {
            texto: '2,418',
          },
          {
            texto: '2,384',
          },
          {
            texto: 'Zona 1',
          },
          {
            texto: 'ACTIVO',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '02',
          },
          {
            texto: 'ZONA INDUSTRIAL',
          },
          {
            texto: '84',
          },
          {
            texto: '1,982',
          },
          {
            texto: '1,944',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: 'ACTIVO',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '03',
          },
          {
            texto: 'BARRIO BUENOS AIRES',
          },
          {
            texto: '112',
          },
          {
            texto: '3,104',
          },
          {
            texto: '3,018',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: 'ACTIVO',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '04',
          },
          {
            texto: 'BELLAVISTA LÍMITE',
          },
          {
            texto: '68',
          },
          {
            texto: '1,412',
          },
          {
            texto: '1,388',
          },
          {
            texto: 'Zona 3',
          },
          {
            texto: 'ACTIVO',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '05',
          },
          {
            texto: 'EJE CARRETERA PAITA',
          },
          {
            texto: '58',
          },
          {
            texto: '984',
          },
          {
            texto: '902',
          },
          {
            texto: 'Zona 4',
          },
          {
            texto: 'ACTIVO',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 sectores · 418 manzanas',
    },
  },
  aranceles: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      zona: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'AV. JOSÉ DE LAMA',
          },
          {
            texto: '1',
          },
          {
            texto: '6',
          },
          {
            texto: 'Zona 1',
          },
          {
            texto: '412.60',
          },
          {
            texto: '+4.2 %',
          },
        ],
        [
          {
            texto: 'AV. JOSÉ DE LAMA',
          },
          {
            texto: '7',
          },
          {
            texto: '14',
          },
          {
            texto: 'Zona 1',
          },
          {
            texto: '386.40',
          },
          {
            texto: '+4.0 %',
          },
        ],
        [
          {
            texto: 'CALLE SANTA ROSA',
          },
          {
            texto: '1',
          },
          {
            texto: '12',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: '198.40',
          },
          {
            texto: '+3.8 %',
          },
        ],
        [
          {
            texto: 'CALLE LAMA',
          },
          {
            texto: '1',
          },
          {
            texto: '10',
          },
          {
            texto: 'Zona 2',
          },
          {
            texto: '198.40',
          },
          {
            texto: '+3.8 %',
          },
        ],
        [
          {
            texto: 'PASAJE EL ALTO',
          },
          {
            texto: '1',
          },
          {
            texto: '4',
          },
          {
            texto: 'Zona 3',
          },
          {
            texto: '142.80',
          },
          {
            texto: '+3.2 %',
          },
        ],
        [
          {
            texto: 'CARRETERA SULLANA — PAITA',
          },
          {
            texto: '1',
          },
          {
            texto: '8',
          },
          {
            texto: 'Zona 4',
          },
          {
            texto: '96.20',
          },
          {
            texto: '+2.8 %',
          },
        ],
      ],
      conteo: '6 tramos',
    },
  },
  valores_unitarios: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      region: 'COSTA',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'A',
          },
          {
            texto: '451.28',
          },
          {
            texto: '212.90',
          },
          {
            texto: '148.36',
          },
          {
            texto: '204.12',
          },
          {
            texto: '286.44',
          },
          {
            texto: '78.20',
          },
          {
            texto: '212.10',
          },
        ],
        [
          {
            texto: 'B',
          },
          {
            texto: '341.72',
          },
          {
            texto: '162.14',
          },
          {
            texto: '112.88',
          },
          {
            texto: '158.42',
          },
          {
            texto: '221.06',
          },
          {
            texto: '58.72',
          },
          {
            texto: '160.44',
          },
        ],
        [
          {
            texto: 'C',
          },
          {
            texto: '256.18',
          },
          {
            texto: '118.92',
          },
          {
            texto: '84.36',
          },
          {
            texto: '112.60',
          },
          {
            texto: '162.18',
          },
          {
            texto: '42.10',
          },
          {
            texto: '118.32',
          },
        ],
        [
          {
            texto: 'D',
          },
          {
            texto: '182.44',
          },
          {
            texto: '86.20',
          },
          {
            texto: '61.42',
          },
          {
            texto: '78.14',
          },
          {
            texto: '112.36',
          },
          {
            texto: '28.44',
          },
          {
            texto: '84.16',
          },
        ],
        [
          {
            texto: 'E',
          },
          {
            texto: '124.36',
          },
          {
            texto: '58.72',
          },
          {
            texto: '41.20',
          },
          {
            texto: '52.88',
          },
          {
            texto: '76.42',
          },
          {
            texto: '18.62',
          },
          {
            texto: '56.44',
          },
        ],
        [
          {
            texto: 'F',
          },
          {
            texto: '78.20',
          },
          {
            texto: '34.16',
          },
          {
            texto: '24.88',
          },
          {
            texto: '31.44',
          },
          {
            texto: '44.20',
          },
          {
            texto: '10.36',
          },
          {
            texto: '32.18',
          },
        ],
        [
          {
            texto: 'G',
          },
          {
            texto: '41.62',
          },
          {
            texto: '18.44',
          },
          {
            texto: '12.36',
          },
          {
            texto: '16.20',
          },
          {
            texto: '22.88',
          },
          {
            texto: '4.12',
          },
          {
            texto: '16.44',
          },
        ],
      ],
      conteo: '7 categorías',
    },
  },
  depreciacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      materialMep: 'LADRILLO',
      uso: 'CASA HABITACIÓN',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'Hasta 5 años',
          },
          {
            texto: '0',
          },
          {
            texto: '3',
          },
          {
            texto: '8',
          },
          {
            texto: '15',
          },
        ],
        [
          {
            texto: '6 a 10 años',
          },
          {
            texto: '3',
          },
          {
            texto: '8',
          },
          {
            texto: '15',
          },
          {
            texto: '24',
          },
        ],
        [
          {
            texto: '11 a 20 años',
          },
          {
            texto: '8',
          },
          {
            texto: '17',
          },
          {
            texto: '27',
          },
          {
            texto: '39',
          },
        ],
        [
          {
            texto: '21 a 30 años',
          },
          {
            texto: '15',
          },
          {
            texto: '25',
          },
          {
            texto: '38',
          },
          {
            texto: '52',
          },
        ],
        [
          {
            texto: '31 a 40 años',
          },
          {
            texto: '22',
          },
          {
            texto: '33',
          },
          {
            texto: '48',
          },
          {
            texto: '64',
          },
        ],
        [
          {
            texto: 'Más de 40 años',
          },
          {
            texto: '30',
          },
          {
            texto: '42',
          },
          {
            texto: '58',
          },
          {
            texto: '76',
          },
        ],
      ],
      conteo: '6 rangos',
    },
  },
  contribuyentes: {
    fechaCalculo: '2026-08-13',
    campos: {
      dNI: '03593174',
      codigo2: '00000025673',
      tipoDePersona: 'NATURAL',
      apellidoPaterno: 'MEDINA',
      apellidoMaterno: 'MEDINA',
      nombres: 'RUFINA',
      dNI2: '03593174',
      fechaDeNacimiento: '1948-08-30',
      sexo: 'FEMENINO',
      estadoCivil: 'VIUDO(A)',
      calificacionDelContribuyente: '003 — PEQUEÑO CONTRIBUYENTE',
      estado: 'A — ACTIVO',
      tipoDeVia: '02 — CA - CALLE',
      via: '99999999 — NO ESPECIFICADO',
      habUrbana: '200601000 — SULLANA',
      numero: '116',
      departamento: 'PIURA',
      provincia: 'SULLANA',
      distrito: 'SULLANA',
      tipoEdific: '99 — NO ESPECIFICADO',
      tipoInterior: '99 — NO ESPECIFICADO',
      nombre: 'URB. SANTA ROSA — EL ALTO',
      manzana: '015',
      lote: '001',
      tipoDeDocumento: '02 — DNI',
      numeroDeDocumento: '03593174',
      nombreDelContacto: 'FERNANDO RUIZ INGA',
      cargo: 'GERENTE',
      eMail: 'FRUIZ159@GMAIL.COM',
      telefonos: '969032194',
      codigoGestor: '00000001 — GESTOR 1',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      tipoDeTelefono: '01 — DOMICILIO 1',
      numero2: '073-413074',
      direccion: 'FRUIZ159@GMAIL.COM',
      autorizaNotificacionElectronica: true,
      observacion2: 'MODIFICACIÓN DE PRUEBA',
      registradoPor: 'MRIOS — 12/08/2026 09:14',
      ultimaModificacion: 'MRIOS — 03/07/2026 16:02',
      historialDeFotos: '2 imágenes — 12/08/2026, 03/07/2026',
      prediosRegistrados: '2',
      autovaluoAcumuladoS: '132,196.75',
      vehiculosAfectos: '1',
      licenciasDeFuncionamiento: '1',
      papeletasPendientes: '2',
      conveniosVigentes: '1',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '00000025673',
          },
          {
            texto: 'SUC. RUFINA MEDINA MEDINA',
          },
          {
            texto: '03593174',
          },
          {
            texto: '—',
          },
          {
            texto: 'URB. SANTA ROSA — EL ALTO 116',
          },
          {
            texto: '2',
          },
          {
            texto: '1,842.60',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '00000003541',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA ELENA',
          },
          {
            texto: '44218937',
          },
          {
            texto: '—',
          },
          {
            texto: 'CALLE LAMA 482',
          },
          {
            texto: '2',
          },
          {
            texto: '591.94',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '00000006550',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: '02718844',
          },
          {
            texto: '—',
          },
          {
            texto: 'C.P. BARRIO BUENOS AIRES',
          },
          {
            texto: '3',
          },
          {
            texto: '9,412.15',
          },
        ],
        [
          {
            texto: 'I',
            tono: 'bad',
          },
          {
            texto: '00000006551',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: '—',
          },
          {
            texto: '20525118447',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: '1',
          },
          {
            texto: '412.00',
          },
        ],
      ],
      conteo: '4 de 62,418',
    },
  },
  predios_rentas: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000025673',
      sector: 'Todos',
      condicion: 'Todas',
      codigoPredial2: '02-014-D-14-01',
      codRefCatastral: '200601010150010101001',
      usoDelPredio: 'CASA HABITACIÓN',
      clasificacion: 'URBANO',
      condicionDePropiedad: 'PROPIETARIO ÚNICO',
      dePropiedad: '100.00',
      fechaDeAdquisicion: '2004-06-18',
      afectoDesdeEjercicio: '2005',
      areaDeTerrenoM: '210.00',
      arancelSM: '198.40',
      valorDelTerrenoS: '41,664.00',
      areaConstruidaM: '164.50',
      valorDeConstruccionS: '86,412.75',
      obrasComplementariasS: '4,120.00',
      autovaluoDelPredioS: '132,196.75',
    },
    tabla: {
      filas: [
        [
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'CALLE SANTA ROSA 116',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '210.00',
          },
          {
            texto: '164.50',
          },
          {
            texto: '100.00',
          },
          {
            texto: '132,196.75',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '04-021-B-07-00',
          },
          {
            texto: 'MZ. B LT. 7 — BELLAVISTA',
          },
          {
            texto: 'Terreno sin construir',
          },
          {
            texto: '184.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '50.00',
          },
          {
            texto: '38,420.00',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
      ],
      conteo: '2 predios · autovalúo S/ 170,616.75',
    },
  },
  predial_individual: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000025673',
      ano: '2026',
      djN: '000418',
      tipoDeDeclaracion: 'RECTIFICATORIA',
      fechaDeDeclaracion: '2026-02-27',
      uitVigente2026S: '5,350.00',
      valuoTotalS: '170,616.75',
      valuoExoneradoS: '0.00',
      valuoAfectoS: '151,406.75',
      tramo1Hasta15Uit02: 'S/ 80,250.00 → S/ 160.50',
      tramo2De15A60Uit06: 'S/ 71,156.75 → S/ 426.94',
      tramo3MasDe60Uit10: 'S/ 0.00 → S/ 0.00',
      impuestoInsolutoAnualS: '587.44',
      minimoImponible06Uit: '32.10',
      deduccionPensionistaAdultoMayor: 'NO APLICA',
      inafectacion: 'NINGUNA',
      montoDeducidoS: '0.00',
      modalidad: 'FRACCIONADO EN 4 CUOTAS',
      derechoDeEmisionS: '4.50',
      cuota1Vence2802: '147.98',
      cuota2Vence3105: '146.86',
      cuota3Vence3108: '146.86',
      cuota4Vence3011: '146.86',
    },
    tabla: {
      filas: [
        [
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'CALLE SANTA ROSA 116',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '100.00',
          },
          {
            texto: '132,196.75',
          },
          {
            texto: '0.00',
          },
          {
            texto: '132,196.75',
          },
        ],
        [
          {
            texto: '04-021-B-07-00',
          },
          {
            texto: 'MZ. B LT. 7 — BELLAVISTA',
          },
          {
            texto: 'Terreno sin construir',
          },
          {
            texto: '50.00',
          },
          {
            texto: '38,420.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '19,210.00',
          },
        ],
      ],
      conteo: '2 predios',
    },
    totales: [
      {
        label: 'Valuo afecto',
        value: 'S/ 151,406.75',
      },
      {
        label: 'Impuesto insoluto',
        value: 'S/ 587.44',
      },
      {
        label: 'Derecho de emisión',
        value: 'S/ 4.50',
      },
      {
        label: 'Total a pagar',
        value: 'S/ 591.94',
      },
    ],
  },
  predial_masivo: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicioACalcular: '2026',
      alcance: 'TODO EL PADRÓN',
      sector: 'Todos',
      uitDelEjercicioS: '5,350.00',
      derechoDeEmisionS: '4.50',
      incluyeArbitrios: true,
      generaCuponeraPdf: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: 'Lectura del padrón',
          },
          {
            texto: '62,418',
          },
          {
            texto: '—',
          },
          {
            texto: '0',
          },
          {
            texto: 'Completa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'Valuación de predios',
          },
          {
            texto: '78,204',
          },
          {
            texto: '1,842,116,420.00',
          },
          {
            texto: '412',
          },
          {
            texto: 'Completa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'Determinación del impuesto',
          },
          {
            texto: '61,884',
          },
          {
            texto: '9,418,204.60',
          },
          {
            texto: '534',
          },
          {
            texto: 'Completa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'Determinación de arbitrios',
          },
          {
            texto: '61,884',
          },
          {
            texto: '5,884,110.20',
          },
          {
            texto: '188',
          },
          {
            texto: 'Completa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'Generación de cuponeras',
          },
          {
            texto: '61,350',
          },
          {
            texto: '—',
          },
          {
            texto: '534',
          },
          {
            texto: 'Con observados',
            tono: 'warn',
          },
        ],
      ],
      conteo: 'Ejecutada el 28/01/2026 — 02:14 h',
    },
  },
  declaracion_jurada: {
    fechaCalculo: '2026-08-13',
    campos: {
      djN: '000418',
      codContribuyente: '00000025673',
      ano: '2026',
      tipo: 'Todas',
      hrHojaResumen: true,
      puPredioUrbano: true,
      nDeEjemplares: '2',
    },
    tabla: {
      filas: [
        [
          {
            texto: '000418',
          },
          {
            texto: '2026',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: 'RECTIFICATORIA',
          },
          {
            texto: '27/02/2026',
          },
          {
            texto: '2',
          },
          {
            texto: '151,406.75',
          },
          {
            texto: 'Procesada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000392',
          },
          {
            texto: '2026',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'ANUAL MECANIZADA',
          },
          {
            texto: '15/01/2026',
          },
          {
            texto: '2',
          },
          {
            texto: '151,406.75',
          },
          {
            texto: 'Procesada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000401',
          },
          {
            texto: '2026',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'INSCRIPCIÓN',
          },
          {
            texto: '04/03/2026',
          },
          {
            texto: '3',
          },
          {
            texto: '284,120.00',
          },
          {
            texto: 'Observada',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '000388',
          },
          {
            texto: '2025',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'DESCARGO',
          },
          {
            texto: '18/11/2025',
          },
          {
            texto: '1',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Procesada',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 de 1,184',
    },
  },
  arbitrios: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      codigoPredial: '02-014-D-14-01',
      zona: 'Zona 2',
      uso: 'CASA HABITACIÓN',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'LIMPIEZA PÚBLICA — BARRIDO',
          },
          {
            texto: 'Metros lineales de frontis',
          },
          {
            texto: 'DIARIA',
          },
          {
            texto: '8.40',
          },
          {
            texto: '100.80',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LIMPIEZA PÚBLICA — RECOLECCIÓN',
          },
          {
            texto: 'Área construida y uso',
          },
          {
            texto: 'INTERDIARIA',
          },
          {
            texto: '14.20',
          },
          {
            texto: '170.40',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PARQUES Y JARDINES',
          },
          {
            texto: 'Ubicación del predio',
          },
          {
            texto: 'PERMANENTE',
          },
          {
            texto: '6.10',
          },
          {
            texto: '73.20',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'SERENAZGO',
          },
          {
            texto: 'Uso y peligrosidad de zona',
          },
          {
            texto: 'PERMANENTE',
          },
          {
            texto: '11.80',
          },
          {
            texto: '141.60',
          },
          {
            texto: 'Afecto',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 servicios · 12 cuotas',
    },
    totales: [
      {
        label: 'Arbitrio anual',
        value: 'S/ 486.00',
      },
      {
        label: 'Descuento pronto pago',
        value: '− S/ 48.60',
      },
      {
        label: 'Cuotas',
        value: '12 mensuales',
      },
      {
        label: 'Total 2026',
        value: 'S/ 437.40',
      },
    ],
  },
  transferencia_predio: {
    fechaCalculo: '2026-08-13',
    campos: {
      nDeExpediente: '2026-0918',
      tipoDeActo: 'COMPRA-VENTA',
      fechaDelActo: '2026-07-18',
      nDeMinutaEscritura: 'EP-2218-2026',
      notaria: 'NOTARÍA ZAPATA — SULLANA',
      codigoPredial: '04-021-B-07-00',
      transferido: '50.00',
      transferenteDocumento: '44218937',
      transferenteNombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      transferenteAfectoHasta: '31/12/2026',
      adquirenteDocumento: '02718844',
      adquirenteNombre: 'DÍAZ MADRID, JULIO CÉSAR',
      adquirenteAfectoDesde: '01/01/2027',
      generaAlcabala: true,
    },
  },
  alcabala: {
    fechaCalculo: '2026-08-13',
    campos: {
      nDeLiquidacion: 'ALC-2026-00418',
      nDeExpediente: '2026-0918',
      fechaDeLaTransferencia: '2026-07-18',
      valorDeTransferenciaS: '95,000.00',
      autovaluoDelPredioS: '76,840.00',
      ipmAplicado: '1.0206',
      autovaluoAjustadoS: '78,420.00',
      baseDeCalculoElMayor: '95,000.00',
      tramoInafecto10UitS: '53,500.00',
      baseImponibleS: '41,500.00',
      tasa: '3.0 %',
      impuestoDeAlcabalaS: '1,245.00',
      venceElUltimoDiaHabilDelMesSiguiente: '31/08/2026',
    },
    totales: [
      {
        label: 'Base de cálculo',
        value: 'S/ 95,000.00',
      },
      {
        label: 'Tramo inafecto',
        value: 'S/ 53,500.00',
      },
      {
        label: 'Base imponible',
        value: 'S/ 41,500.00',
      },
      {
        label: 'Alcabala a pagar',
        value: 'S/ 1,245.00',
      },
    ],
  },
  vehiculos: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000003541',
      placa: 'T2G-418',
      nroDeTarjeta: 'B-4471182',
      reparticion: 'SULLANA',
      placa2: 'T2G-418',
      nroDeExpediente: '2026-0281',
      fechaDeInscripcion: '2019-02-11',
      anoDeFabricacion: '2018',
      fechaDeIngresoMps: '2019-03-02',
      clase: 'AUTOMÓVIL',
      marca: 'TOYOTA',
      modelo: 'YARIS GLI',
      carroceria: 'SEDÁN',
      combustible: 'GASOLINA',
      categoria: 'M1',
      cilindrajeCC: '1497',
      cilindros: '4',
      ejes: '2',
      ruedas: '4',
      colores: 'PLATA METÁLICO',
      nroDeMotor: '2NR0483117',
      nroDeSerie: 'MR2B29F31K1084472',
      pasajeros: '5',
      asientos: '5',
      pesoSecoKg: '1,050',
      pesoBrutoKg: '1,510',
      cargaUtilKg: '460',
      longitudM: '4.42',
      alturaM: '1.47',
      anchoM: '1.73',
      codContribuyente2: '00000003541',
      nombreRazonSocial: 'CASTILLO PASCUALA, MARÍA ELENA',
      documento: 'DNI 44218937',
      domicilioFiscal: 'CALLE LAMA 482 — ZONA 2 INDUSTRIAL',
      fechaDeAdquisicion: '2019-02-05',
      formaDeAdquisicion: 'COMPRA-VENTA',
      documento2: '44218937',
      nombre2: 'CASTILLO PASCUALA, MARÍA ELENA',
      nroDeLicencia: 'Q44218937',
      claseCategoria: 'A-I',
      vencimientoDeLicencia: '2027-05-30',
      primerAnoDeAfectacion: '2019',
      ultimoAnoDeAfectacion: '2021',
      valorDeAdquisicionS: '58,900.00',
      tablaReferencialMefS: '61,400.00',
      baseImponibleElMayorS: '61,400.00',
      tasa: '1.0 %',
      impuestoAnualS: '614.00',
      minimoImponible15Uit: '80.25',
      estado: 'B — BAJA POR VENCIMIENTO',
      tipoDeBeneficio: 'NINGUNO',
      observaciones: 'Vehículo con transferencia pendiente de inscripción registral.',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: 'AUTOMÓVIL',
          },
          {
            texto: 'TOYOTA',
          },
          {
            texto: 'YARIS GLI',
          },
          {
            texto: '2018',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '2019 — 2021',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: 'V1H-882',
          },
          {
            texto: 'CAMIONETA',
          },
          {
            texto: 'HYUNDAI',
          },
          {
            texto: 'TUCSON',
          },
          {
            texto: '2024',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '2025 — 2027',
          },
        ],
      ],
      conteo: '2 registros',
    },
  },
  vehicular_calculo: {
    fechaCalculo: '2026-08-13',
    campos: {
      placa: 'V1H-882',
      codContribuyente: '00000003541',
      ejercicio: '2026',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2025',
          },
          {
            texto: '112,800.00',
          },
          {
            texto: '1.0 %',
          },
          {
            texto: '1,128.00',
          },
          {
            texto: '4',
          },
          {
            texto: 'Cancelado',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '112,800.00',
          },
          {
            texto: '1.0 %',
          },
          {
            texto: '1,128.00',
          },
          {
            texto: '4',
          },
          {
            texto: 'Emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2027',
          },
          {
            texto: '112,800.00',
          },
          {
            texto: '1.0 %',
          },
          {
            texto: '1,128.00',
          },
          {
            texto: '4',
          },
          {
            texto: 'Proyectado',
            tono: 'warn',
          },
        ],
      ],
      conteo: '3 ejercicios afectos',
    },
    totales: [
      {
        label: 'Base imponible',
        value: 'S/ 112,800.00',
      },
      {
        label: 'Impuesto anual',
        value: 'S/ 1,128.00',
      },
      {
        label: 'Cuota trimestral',
        value: 'S/ 282.00',
      },
      {
        label: 'Total tres ejercicios',
        value: 'S/ 3,384.00',
      },
    ],
  },
  transferencia_vehiculo: {
    fechaCalculo: '2026-08-13',
    campos: {
      placa: 'T2G-418',
      nroDeExpediente: '2026-0944',
      fechaDeTransferencia: '2026-06-20',
      tipoDeActo: 'COMPRA-VENTA',
      documentoSustentatorio: 'ACTA NOTARIAL DE TRANSFERENCIA',
      nDelDocumento: 'AN-1182-2026',
      transferenteDocumento: '44218937',
      transferenteNombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      afectoHasta: '31/12/2026',
      adquirenteDocumento: '03593174',
      adquirenteNombre: 'SUC. RUFINA MEDINA MEDINA',
      afectoDesde: '01/01/2027',
      deudaPendienteDelTransferenteS: '940.64',
    },
  },
  espectaculos: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-01-01',
      hasta: '2026-08-13',
      nDeExpediente2: '2026-0884',
      organizador2: 'PRODUCCIONES DEL NORTE EIRL',
      rUC: '20525118880',
      tipoDeEspectaculo: 'CONCIERTO DE MÚSICA POPULAR',
      denominacionDelEvento: 'GRAN NOCHE DE CUMBIA',
      local: 'COLISEO MUNICIPAL',
      fechaDelEvento: '2026-07-18',
      aforoAutorizado: '2400',
      nDeEntradasVendidas: '2,240',
      precioPromedioS: '37.50',
      recaudacionDeclaradaS: '84,000.00',
      tasaAplicable: '10 %',
      impuestoAPagarS: '8,400.00',
      garantiaDepositadaS: '8,400.00',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026-0884',
          },
          {
            texto: 'PRODUCCIONES DEL NORTE EIRL',
          },
          {
            texto: 'Concierto de cumbia',
          },
          {
            texto: '18/07/2026',
          },
          {
            texto: '2,400',
          },
          {
            texto: '84,000.00',
          },
          {
            texto: '10 %',
          },
          {
            texto: '8,400.00',
          },
        ],
        [
          {
            texto: '2026-0912',
          },
          {
            texto: 'ASOC. TAURINA SULLANA',
          },
          {
            texto: 'Corrida de toros',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: '1,800',
          },
          {
            texto: '126,000.00',
          },
          {
            texto: '10 %',
          },
          {
            texto: '12,600.00',
          },
        ],
        [
          {
            texto: '2026-0918',
          },
          {
            texto: 'CINE PLAZA SAC',
          },
          {
            texto: 'Función de cine',
          },
          {
            texto: '10/08/2026',
          },
          {
            texto: '320',
          },
          {
            texto: '4,800.00',
          },
          {
            texto: '0 %',
          },
          {
            texto: '0.00',
          },
        ],
      ],
      conteo: '3 de 84',
    },
  },
  beneficios: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipo: 'Todos',
      estado: 'Todos',
      tipoDeBeneficio: 'PENSIONISTA — DEDUCCIÓN 50 UIT',
      codContribuyente: '00000003541',
      codigoPredial: '02-014-D-14-01',
      nDeExpediente: '2026-0281',
      fechaDeSolicitud: '2026-03-04',
      nDeResolucion: 'RES-0412-2026-MPS',
      fechaDeResolucion: '2026-03-22',
      vigenciaDesde: '2026-01-01',
      predioUnicoVerificado: true,
      destinadoAVivienda: true,
      sustento: 'Resolución de pensión ONP y declaración jurada de predio único.',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026-0281',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'PENSIONISTA',
          },
          {
            texto: 'RES-0412-2026-MPS',
          },
          {
            texto: '2026 — indefinida',
          },
          {
            texto: '50 UIT',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2026-0344',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: 'ADULTO MAYOR',
          },
          {
            texto: 'RES-0448-2026-MPS',
          },
          {
            texto: '2026 — indefinida',
          },
          {
            texto: '50 UIT',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2026-0388',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'INAFECTACIÓN',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: 'En trámite',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2025-1102',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'AMNISTÍA 2025',
          },
          {
            texto: 'ORD-018-2025-MPS',
          },
          {
            texto: '2025',
          },
          {
            texto: '100 % interés',
          },
          {
            texto: 'Vencido',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 1,842',
    },
  },
  alta_deuda: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000006550',
      nombre: 'DÍAZ MADRID, JULIO CÉSAR',
      conceptoTributo: 'IMPUESTO PREDIAL',
      unidadPredioPlaca: '02-014-D-14-01',
      ano: '2024',
      cuotaDesde: '1',
      cuotaHasta: '4',
      insolutoS: '1,842.60',
      reajusteS: '84.20',
      interesS: '212.44',
      gastosS: '0.00',
      fechaDeVencimiento: '2024-11-30',
      documentoQueSustenta: 'RESOLUCIÓN DE DETERMINACIÓN',
      nDelDocumento: 'RD-2026-000418',
      motivoDelAlta: 'Deuda omitida detectada en fiscalización predial del programa PF-2026-014.',
    },
    totales: [
      {
        label: 'Insoluto',
        value: 'S/ 1,842.60',
      },
      {
        label: 'Reajuste',
        value: 'S/ 84.20',
      },
      {
        label: 'Interés',
        value: 'S/ 212.44',
      },
      {
        label: 'Total del alta',
        value: 'S/ 2,139.24',
      },
    ],
  },
  baja_deuda: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000006550',
      ano: 'Todos',
      tributo: 'Todos',
      causal: 'PRESCRIPCIÓN DECLARADA',
      nDeResolucion: 'RGAT-0244-2026-MPS',
      fechaDeResolucion: '2026-08-04',
      autorizadoPor: 'Gerencia de Administración Tributaria',
      montoTotalAExtinguirS: '1,613.96',
      motivo:
        'Prescripción declarada de los ejercicios 2014 a 2016 conforme al artículo 43º del Código Tributario.',
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: '2016',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1-4',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '482.40',
          },
          {
            texto: '388.12',
          },
          {
            texto: '870.52',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '2016',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1-12',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '412.00',
          },
          {
            texto: '331.44',
          },
          {
            texto: '743.44',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: '2024',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1-4',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '1,842.60',
          },
          {
            texto: '212.44',
          },
          {
            texto: '2,055.04',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: '2025',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: '1',
          },
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: '614.00',
          },
          {
            texto: '182.44',
          },
          {
            texto: '796.44',
          },
        ],
      ],
      conteo: '4 registros · 2 marcados',
    },
  },
  fisc_programa: {
    fechaCalculo: '2026-08-13',
    campos: {
      nDePrograma: 'PF-2026-014',
      ejercicio: '2026',
      tipo: 'Todos',
      estado: 'Todos',
      nDePrograma2: 'PF-2026-014',
      ejercicio2: '2026',
      tipoDePrograma: 'PREDIAL SELECTIVO',
      sector: '02',
      criterioDeRiesgo: 'SUBVALUACIÓN PROBABLE',
      fiscalizadorAsignado: 'R. MENDOZA CRUZ',
      fechaDeInicio: '2026-08-17',
      fechaDeTermino: '2026-09-30',
      tamanoDeMuestra: '96',
      estado2: 'EN EJECUCIÓN',
    },
    tabla: {
      filas: [
        [
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '164.50',
          },
          {
            texto: 'Alto',
          },
          {
            texto: 'Programado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '02-014-D-18-00',
          },
          {
            texto: 'SILVA CÓRDOVA, ANA',
          },
          {
            texto: 'Comercio',
          },
          {
            texto: '82.00',
          },
          {
            texto: 'Alto',
          },
          {
            texto: 'Inspeccionado',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '02-016-A-02-00',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '120.00',
          },
          {
            texto: 'Medio',
          },
          {
            texto: 'Programado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '02-016-A-09-00',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'Industria',
          },
          {
            texto: '640.00',
          },
          {
            texto: 'Alto',
          },
          {
            texto: 'Con acta',
            tono: 'ok',
          },
        ],
      ],
      conteo: '96 predios · 4 visibles',
    },
  },
  fisc_predial: {
    fechaCalculo: '2026-08-13',
    campos: {
      nDeActa: 'ACT-2026-00418',
      programa: 'PF-2026-014',
      codigoPredial: '02-014-D-14-01',
      contribuyente: 'MEDINA MEDINA, RUFINA (SUC.)',
      fechaDeInspeccion: '2026-08-12',
      hora: '10:25',
      fiscalizador: 'R. MENDOZA CRUZ',
      personaQueAtiende: 'MEDINA CHÁVEZ, ROSA',
      vinculoConElPredio: 'FAMILIAR',
      resultadoDeLaVisita: 'INSPECCIÓN REALIZADA',
      usoVerificado: 'COMERCIO',
      usoDeclarado: 'CASA HABITACIÓN',
      areaDeTerrenoVerificadaM: '210.00',
      areaConstruidaVerificadaM: '198.00',
      areaConstruidaDeclaradaM: '164.50',
      diferenciaM: '+33.50',
      nDePisosVerificados: '2',
      mepVerificado: '02 — LADRILLO',
      ecsVerificado: '02 — BUENO',
      serviciosBasicos: 'AGUA, DESAGÜE Y LUZ',
      hallazgoPrincipal: 'AMPLIACIÓN NO DECLARADA',
      generaDeterminacion: true,
      fotografias: '4 archivos adjuntos',
      croquisGeorreferencia: '-4.902315, -80.685442',
      observacionesDelFiscalizador:
        'Segundo piso construido en 2011 destinado a bodega; no figura en la declaración jurada.',
      firmaDelAdministrado: 'Capturada — 10:52',
    },
  },
  fisc_vehicular: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      origenDelCruce: 'Todos',
      hallazgo: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'V1H-882',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'SUNARP',
          },
          {
            texto: '0.00',
          },
          {
            texto: '112,800.00',
          },
          {
            texto: 'No declarado',
            tono: 'bad',
          },
          {
            texto: '3,384.00',
          },
        ],
        [
          {
            texto: 'B7T-221',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: 'SUNAT',
          },
          {
            texto: '38,000.00',
          },
          {
            texto: '62,400.00',
          },
          {
            texto: 'Subvaluado',
            tono: 'warn',
          },
          {
            texto: '732.00',
          },
        ],
        [
          {
            texto: 'T4M-119',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'MTC',
          },
          {
            texto: '84,000.00',
          },
          {
            texto: '84,000.00',
          },
          {
            texto: 'Conforme',
            tono: 'ok',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: 'C2P-704',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'SUNARP',
          },
          {
            texto: '0.00',
          },
          {
            texto: '48,200.00',
          },
          {
            texto: 'Baja indebida',
            tono: 'bad',
          },
          {
            texto: '1,446.00',
          },
        ],
      ],
      conteo: '4 de 618',
    },
  },
  fisc_resultados: {
    fechaCalculo: '2026-08-13',
    campos: {
      programa: 'PF-2026-014',
      hallazgo: 'Todos',
      estado: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'ACT-2026-00418',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'Ampliación no declarada',
          },
          {
            texto: '+33.50',
          },
          {
            texto: '2022 — 2026',
          },
          {
            texto: '1,842.60',
          },
          {
            texto: 'Determinado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'ACT-2026-00419',
          },
          {
            texto: '02-014-D-18-00',
          },
          {
            texto: 'Uso distinto al declarado',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2024 — 2026',
          },
          {
            texto: '944.10',
          },
          {
            texto: 'Notificado',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'ACT-2026-00421',
          },
          {
            texto: '02-016-A-09-00',
          },
          {
            texto: 'Omiso a la declaración',
          },
          {
            texto: '+640.00',
          },
          {
            texto: '2021 — 2026',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: 'Reclamado',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'ACT-2026-00424',
          },
          {
            texto: '02-016-A-02-00',
          },
          {
            texto: 'Sin observaciones',
          },
          {
            texto: '0.00',
          },
          {
            texto: '—',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Conforme',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 de 96',
    },
    totales: [
      {
        label: 'Actas cerradas',
        value: '96',
      },
      {
        label: 'Con diferencia',
        value: '61',
      },
      {
        label: 'Deuda determinada',
        value: 'S/ 214,882.40',
      },
      {
        label: 'Efectividad',
        value: '63.5 %',
      },
    ],
  },
  fisc_omisos: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      sector: 'Todos',
      condicion: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: '200601010160020101001',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: 'Omiso',
            tono: 'bad',
          },
          {
            texto: '96,400.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '96,400.00',
          },
          {
            texto: '478.40',
          },
        ],
        [
          {
            texto: '200601010150010101001',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: 'Subvaluador',
            tono: 'warn',
          },
          {
            texto: '178,200.00',
          },
          {
            texto: '132,196.75',
          },
          {
            texto: '46,003.25',
          },
          {
            texto: '276.02',
          },
        ],
        [
          {
            texto: '200601020210070100000',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'Subvaluador',
            tono: 'warn',
          },
          {
            texto: '44,800.00',
          },
          {
            texto: '38,420.00',
          },
          {
            texto: '6,380.00',
          },
          {
            texto: '38.28',
          },
        ],
        [
          {
            texto: '200601030880010101001',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'Omiso',
            tono: 'bad',
          },
          {
            texto: '842,000.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '842,000.00',
          },
          {
            texto: '7,984.40',
          },
        ],
      ],
      conteo: '4 de 3,418',
    },
  },
  fisc_estado_cuenta: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDePapeleta: 'TRIBUTARIA',
      contribuyente: '00000093199',
      contribuyente2: '00000093199 — ALBURQUEQUE INFANTE GENARO',
      domicilioFiscal: 'SULLANA - CA. — DIR. REFER.: LA HUACA - PAITA',
      fechaDeConsulta: '2026-08-13',
      tributo: '00003 — VEHICULAR',
      formato: 'DETALLADO',
    },
    tabla: {
      filas: [
        [
          {
            texto: '47',
          },
          {
            texto: '00000093',
          },
          {
            texto: '2010',
          },
          {
            texto: 'SC-2346',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
          {
            texto: '00003',
          },
          {
            texto: 'VEHICULAR-FIS',
          },
          {
            texto: '002',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
        ],
        [
          {
            texto: '48',
          },
          {
            texto: '00000093',
          },
          {
            texto: '2010',
          },
          {
            texto: 'SC-2346',
          },
          {
            texto: '—',
          },
          {
            texto: '002',
          },
          {
            texto: '00003',
          },
          {
            texto: 'VEHICULAR-FIS',
          },
          {
            texto: '002',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
        ],
        [
          {
            texto: '49',
          },
          {
            texto: '00000093',
          },
          {
            texto: '2010',
          },
          {
            texto: 'SC-2346',
          },
          {
            texto: '—',
          },
          {
            texto: '003',
          },
          {
            texto: '00003',
          },
          {
            texto: 'VEHICULAR-FIS',
          },
          {
            texto: '002',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
        ],
        [
          {
            texto: '50',
          },
          {
            texto: '00000093',
          },
          {
            texto: '2010',
          },
          {
            texto: 'SC-2346',
          },
          {
            texto: '—',
          },
          {
            texto: '004',
          },
          {
            texto: '00003',
          },
          {
            texto: 'VEHICULAR-FIS',
          },
          {
            texto: '002',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
        ],
      ],
      conteo: '4 registros · total S/ 581.65',
    },
  },
  fisc_historico: {
    fechaCalculo: '2026-08-13',
    campos: {
      codCont: '00000277292',
      codigoCont: '00000277292',
      nombre: 'CORPORACIÓN BUSTAMANTE S.A.C.',
      fechaDeFiscalizacion: '2026-03-08',
      estado: 'LIQUIDADA',
      periodoFiscalizadoDesde: '2024',
      periodoFiscalizadoHasta: '2026',
      tipoDeFiscalizacion: 'CIERTA',
      ultimoUsuario: 'MRIOS — 08/03/2026 11:42',
      nDeVersion: '3',
      estadoDeLaVersion: 'L — LIQUIDADA',
      fechaDeLaVersion: '08/03/2026',
      versionAnterior: '2 — A — 08/03/2026',
      codCatastral: '200601010150010101001',
      direccionDelPredio: 'AV. JOSÉ DE LAMA 1180',
      codRef: '—',
      ubicacion: '—',
      tipoDeDocumento: 'ACTA DE INSPECCIÓN',
      fecha: '2026-03-08',
      archivo: 'ACTA-277292-V3.pdf',
      articuloDelCodigoTributario: 'ART. 176 NUM. 1',
      multaS: '0.00',
      gradualidad: '0',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '00000038288',
          },
          {
            texto: 'EUREKA S.R.L.',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '2',
          },
        ],
        [
          {
            texto: 'L',
            tono: 'warn',
          },
          {
            texto: '00000043655',
          },
          {
            texto: 'BUSTAMANTE REPRESENTACIONES S...',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '1',
          },
        ],
        [
          {
            texto: 'L',
            tono: 'warn',
          },
          {
            texto: '00000277292',
          },
          {
            texto: 'CORPORACIÓN BUSTAMANTE S.A.C.',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '3',
          },
        ],
        [
          {
            texto: 'L',
            tono: 'warn',
          },
          {
            texto: '00000041313',
          },
          {
            texto: 'RUGEL MEDINA-CESAR',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '2',
          },
        ],
        [
          {
            texto: 'L',
            tono: 'warn',
          },
          {
            texto: '00000013846',
          },
          {
            texto: 'TALLEDO TORRES-GUIDO GERARDO',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '1',
          },
        ],
        [
          {
            texto: 'L',
            tono: 'warn',
          },
          {
            texto: '00000009738',
          },
          {
            texto: 'AGROCHIRA S.A.',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '1',
          },
        ],
      ],
      conteo: '6 registros',
    },
  },
  resolucion_determinacion_fisc: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RD-2026-000418',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '000418-2026-SGFT/MPS',
        },
        {
          k: 'Contribuyente',
          v: 'INVERSIONES DEL NORTE SAC',
        },
        {
          k: 'R.U.C.',
          v: '20525118447',
        },
        {
          k: 'Predio',
          v: '02-014-D-14-01 — AV. JOSÉ DE LAMA 1180',
        },
        {
          k: 'Periodo fiscalizado',
          v: '2021 — 2026',
        },
        {
          k: 'Tipo de fiscalización',
          v: 'CIERTA',
        },
      ],
      filas: [
        ['2021', '3,182.00', '1,120.00', '2,062.00', '618.60', '2,680.60'],
        ['2022', '3,410.00', '1,180.00', '2,230.00', '556.00', '2,786.00'],
        ['2023', '3,618.00', '1,240.00', '2,378.00', '441.00', '2,819.00'],
        ['2024', '3,880.00', '1,310.00', '2,570.00', '318.00', '2,888.00'],
        ['2025', '4,120.00', '1,380.00', '2,740.00', '182.00', '2,922.00'],
        ['2026', '4,412.00', '1,440.00', '2,972.00', '48.00', '3,020.00'],
      ],
      footer:
        'Contra la presente resolución procede recurso de reclamación dentro de los veinte días hábiles siguientes a su notificación, conforme al artículo 137 del Código Tributario. Vencido el plazo sin pago ni reclamación, la deuda queda firme y exigible coactivamente.',
    },
  },
  papeletas: {
    fechaCalculo: '2026-08-13',
    campos: {
      placa: 'T2G-418',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      estado: 'Todas',
      nroPapeleta2: 'MPS-2026-041182',
      fecha: '2026-08-02',
      hora: '18:40',
      lugarDeLaIntervencion: 'AV. JOSÉ DE LAMA CUADRA 12',
      inspectorMunicipal: 'A. VÍLCHEZ ROJAS',
      nDeCredencial: 'IM-0412',
      supervisor: 'C. ANCAJIMA FLORES',
      documento: '44218937',
      nombreDelInfractor: 'CASTILLO PASCUALA, MARÍA ELENA',
      nroDeLicencia: 'Q44218937',
      claseCategoria: 'A-I',
      placa2: 'T2G-418',
      claseDeVehiculo: 'AUTOMÓVIL',
      propietarioDelVehiculo: 'CASTILLO PASCUALA, MARÍA ELENA',
      codigoDeInfraccion: 'M-02',
      descripcion: 'CONDUCIR CON PRESENCIA DE ALCOHOL EN LA SANGRE',
      gravedad: 'MUY GRAVE',
      baseUitS: '5,350.00',
      porcentajeDeUit: '10 %',
      valorDeLaMultaS: '535.00',
      puntosAcumulados: '50',
      medidaPreventiva: 'RETENCIÓN DE LICENCIA',
      depositoMunicipal: 'NO APLICA',
      descuentoPorProntoPago5Dias: '− S/ 214.00',
      importePagadoS: '0.00',
      motivoDeAnulacion: '—',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'MPS-2026-041182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'M-02',
          },
          {
            texto: 'Muy grave',
            tono: 'bad',
          },
          {
            texto: '535.00',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'MPS-2026-040877',
          },
          {
            texto: '21/07/2026',
          },
          {
            texto: 'V1H-882',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'G-58',
          },
          {
            texto: 'Grave',
            tono: 'warn',
          },
          {
            texto: '428.00',
          },
          {
            texto: 'Con descargo',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'MPS-2026-040412',
          },
          {
            texto: '09/06/2026',
          },
          {
            texto: 'B7T-221',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: 'L-11',
          },
          {
            texto: 'Leve',
            tono: 'ok',
          },
          {
            texto: '214.00',
          },
          {
            texto: 'Pagada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'MPS-2025-038119',
          },
          {
            texto: '14/11/2025',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'G-40',
          },
          {
            texto: 'Grave',
            tono: 'warn',
          },
          {
            texto: '428.00',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 12,844',
    },
  },
  transito_busqueda: {
    fechaCalculo: '2026-08-13',
    campos: {
      nPlaca: 'NB-21169',
      estadoDeDeuda: '(TODOS)',
      ingresadoPor: 'JC',
      registradasDesde: '2026-07-21',
      registradasHasta: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '01/07/2026',
          },
          {
            texto: 'CANCELADA',
            tono: 'ok',
          },
          {
            texto: 'D',
          },
          {
            texto: '007782',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '01/07/2026',
          },
          {
            texto: 'OM F-16',
          },
          {
            texto: 'SERNAQUE VILLEGAS H...',
          },
          {
            texto: '144.00',
          },
          {
            texto: '144.00',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'PENDIENTE',
            tono: 'warn',
          },
          {
            texto: 'C',
          },
          {
            texto: '002635',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '12/04/2025',
          },
          {
            texto: 'DS F1',
          },
          {
            texto: 'SERNAQUE VILLEGAS H...',
          },
          {
            texto: '142.00',
          },
          {
            texto: '42.60',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'A CUENTA',
            tono: 'warn',
          },
          {
            texto: 'C',
          },
          {
            texto: '010962',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '31/01/2024',
          },
          {
            texto: 'DS F1',
          },
          {
            texto: 'SÁNCHEZ NAVARRO MIG...',
          },
          {
            texto: '280.00',
          },
          {
            texto: '84.00',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '■',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'PENDIENTE',
            tono: 'warn',
          },
          {
            texto: 'C',
          },
          {
            texto: '006230',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '25/03/2022',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: 'SERNAQUE VILLEGAS H...',
          },
          {
            texto: '34.00',
          },
          {
            texto: '34.00',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'PENDIENTE',
            tono: 'warn',
          },
          {
            texto: 'C',
          },
          {
            texto: '003159',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '09/09/2021',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: 'CARRASCO MIGUEL ÁNG...',
          },
          {
            texto: '33.00',
          },
          {
            texto: '9.90',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'PENDIENTE',
            tono: 'warn',
          },
          {
            texto: 'C',
          },
          {
            texto: '001686',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: '03/08/2021',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: 'CARRASCO MONTES AN...',
          },
          {
            texto: '16.50',
          },
          {
            texto: '16.50',
          },
        ],
      ],
      conteo: '6 registros',
    },
  },
  codigos_transito: {
    fechaCalculo: '2026-08-13',
    campos: {
      gravedad: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'M-02',
          },
          {
            texto: 'Conducir con presencia de alcohol en la sangre',
          },
          {
            texto: 'Muy grave',
            tono: 'bad',
          },
          {
            texto: '10 %',
          },
          {
            texto: '535.00',
          },
          {
            texto: '50',
          },
          {
            texto: 'Retención de licencia',
          },
        ],
        [
          {
            texto: 'M-08',
          },
          {
            texto: 'Conducir sin licencia vigente',
          },
          {
            texto: 'Muy grave',
            tono: 'bad',
          },
          {
            texto: '8 %',
          },
          {
            texto: '428.00',
          },
          {
            texto: '50',
          },
          {
            texto: 'Internamiento del vehículo',
          },
        ],
        [
          {
            texto: 'M-20',
          },
          {
            texto: 'Prestar servicio de transporte sin autorización',
          },
          {
            texto: 'Muy grave',
            tono: 'bad',
          },
          {
            texto: '12 %',
          },
          {
            texto: '642.00',
          },
          {
            texto: '50',
          },
          {
            texto: 'Internamiento del vehículo',
          },
        ],
        [
          {
            texto: 'G-40',
          },
          {
            texto: 'Estacionar en zona rígida o prohibida',
          },
          {
            texto: 'Grave',
            tono: 'warn',
          },
          {
            texto: '8 %',
          },
          {
            texto: '428.00',
          },
          {
            texto: '20',
          },
          {
            texto: 'Remoción del vehículo',
          },
        ],
        [
          {
            texto: 'G-58',
          },
          {
            texto: 'Exceder la velocidad permitida',
          },
          {
            texto: 'Grave',
            tono: 'warn',
          },
          {
            texto: '8 %',
          },
          {
            texto: '428.00',
          },
          {
            texto: '20',
          },
          {
            texto: 'Ninguna',
          },
        ],
        [
          {
            texto: 'L-11',
          },
          {
            texto: 'No portar el certificado SOAT vigente',
          },
          {
            texto: 'Leve',
            tono: 'ok',
          },
          {
            texto: '4 %',
          },
          {
            texto: '214.00',
          },
          {
            texto: '10',
          },
          {
            texto: 'Ninguna',
          },
        ],
      ],
      conteo: '6 de 342',
    },
  },
  transito_descargos: {
    fechaCalculo: '2026-08-13',
    campos: {
      papeleta: 'MPS-2026-040877',
      estado: 'Todos',
      nDeExpediente2: '2026-1188',
      papeletaImpugnada: 'MPS-2026-040877',
      fechaDePresentacion: '2026-07-28',
      dentroDelPlazo5DiasHabiles: true,
      tipoDeRecurso: 'DESCARGO',
      fundamentoDelAdministrado:
        'Señala que el vehículo se encontraba detenido por desperfecto mecánico y adjunta constancia del taller.',
      areaEvaluadora: 'SUBGERENCIA DE TRÁNSITO',
      nDeResolucion: 'RSG-0812-2026-MPS',
      fechaDeResolucion: '2026-08-08',
      sentidoDelFallo: 'INFUNDADO',
      efectoSobreLaMulta: 'SE MANTIENE',
    },
  },
  internamiento: {
    fechaCalculo: '2026-08-13',
    campos: {
      deposito: 'Todos',
      estado: 'Todos',
      placa2: 'T2G-418',
      fechaDeLiberacion: '2026-08-13',
      soatVigenteAcreditado: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: 'T2G-418',
          },
          {
            texto: 'MPS-2026-041182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: '11',
          },
          {
            texto: '18.00',
          },
          {
            texto: '198.00',
          },
          {
            texto: 'Internado',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'C2P-704',
          },
          {
            texto: 'MPS-2026-040991',
          },
          {
            texto: '28/07/2026',
          },
          {
            texto: '16',
          },
          {
            texto: '18.00',
          },
          {
            texto: '288.00',
          },
          {
            texto: 'Internado',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'B7T-221',
          },
          {
            texto: 'MPS-2026-040412',
          },
          {
            texto: '09/06/2026',
          },
          {
            texto: '3',
          },
          {
            texto: '18.00',
          },
          {
            texto: '54.00',
          },
          {
            texto: 'Liberado',
            tono: 'ok',
          },
        ],
      ],
      conteo: '3 de 118',
    },
  },
  transito_documentos: {
    fechaCalculo: '2026-08-13',
    campos: {
      papeletaN: 'C2007005161',
      expediente: '112',
      placa: 'NB-1712',
      papeletaN2: 'C2007005161',
      fecPapeleta: '2026-07-25',
      exped: '112',
      fecExp: '2026-05-05',
      infraccion:
        'F5 — NO PRESENTAR LA TARJETA DE IDENTIFICACIÓN VEHICULAR, LICENCIA DE CONDUCIR U OTRO DOCUMENTO DE IDENTIDAD',
      obligado: '00000071013 — JUÁREZ SEMINARIO DANIEL',
      domicilio: 'CALLE BERNAL 439 BELLAVISTA',
      dNI: '03901006',
      argumento: 'PRUEBA',
      informeN: '156',
      glosa: 'PRUEBA 1',
      documento: 'RESOLUCIÓN',
      nDoc: '1',
      fecDoc: '2026-05-05',
      nombreDeArchivo: 'RESOLUCION G...pdf',
      glosaDelActo: '.',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'NB-68190',
          },
          {
            texto: 'C2009002448',
          },
          {
            texto: '—',
          },
          {
            texto: '00000092245',
          },
          {
            texto: 'ADANAQUE CHINCHAY JOSÉ JORGE',
          },
        ],
        [
          {
            texto: 'BIM-310',
          },
          {
            texto: 'C2008020114',
          },
          {
            texto: '—',
          },
          {
            texto: '00000056625',
          },
          {
            texto: 'BACA NEIRA RICARDO MARTÍN',
          },
        ],
        [
          {
            texto: 'NB-26629',
          },
          {
            texto: 'C2008017310',
          },
          {
            texto: '—',
          },
          {
            texto: '00000088898',
          },
          {
            texto: 'VEGA PALACIOS MIGUEL RODOLFO',
          },
        ],
        [
          {
            texto: 'NB-1712',
          },
          {
            texto: 'C2007005161',
          },
          {
            texto: '112',
          },
          {
            texto: '00000071013',
          },
          {
            texto: 'JUÁREZ SEMINARIO DANIEL',
          },
        ],
      ],
      conteo: '4 registros',
    },
  },
  transito_valores: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigoDeCriterio: '00000007748',
      descripcion: 'PAPELETAS AGOSTO 2026',
      fecInicio: '2026-08-01',
      fecFin: '2026-10-31',
      tipoDeRecaudo: '003 — RS PAPELETAS DE TRÁNSITO',
      vencimiento: '2026-10-06',
      oficina: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA',
    },
    tabla: {
      filas: [
        [
          {
            texto: '00000000090',
          },
          {
            texto: 'INSERCIÓN MIGRACIÓN PAPELETAS',
          },
          {
            texto: 'RS',
          },
          {
            texto: '01/01/2021',
          },
          {
            texto: '01/12/2023',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00000000091',
          },
          {
            texto: 'INSERCIÓN MIGRACIÓN PAPELETAS 2007-2008',
          },
          {
            texto: 'RS',
          },
          {
            texto: '01/01/2021',
          },
          {
            texto: '01/12/2023',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00000007747',
          },
          {
            texto: 'PAP TRAN-CRITERIO DE PRUEBA',
          },
          {
            texto: 'RS',
          },
          {
            texto: '01/10/2024',
          },
          {
            texto: '31/10/2025',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00000007748',
          },
          {
            texto: 'PAPELETAS AGOSTO 2026',
          },
          {
            texto: 'RS',
          },
          {
            texto: '01/08/2026',
          },
          {
            texto: '31/10/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 criterios',
    },
  },
  transito_cambio_numero: {
    fechaCalculo: '2026-08-13',
  },
  transito_reportes: {
    fechaCalculo: '2026-08-13',
    campos: {
      reporte: 'RECORD DE CONDUCTOR',
      estado: '(TODOS)',
      accion: 'GENERAR',
      fechaDesde: '2026-07-01',
      fechaHasta: '2026-08-13',
      ordenacion: 'FECHA DE INFRACCIÓN',
      agrupadoPor: 'MES',
    },
  },
  transito_record_conductor: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RC-2026-00418',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Conductor',
          v: 'SERNAQUE VILLEGAS, DORIS',
        },
        {
          k: 'Licencia',
          v: 'Q-44218937 — clase A-I',
        },
        {
          k: 'Documento',
          v: 'DNI 44218937',
        },
        {
          k: 'Domicilio',
          v: 'CALLE TÚPAC AMARU 611 — SULLANA',
        },
        {
          k: 'Papeletas registradas',
          v: '6',
        },
        {
          k: 'Deuda pendiente',
          v: 'S/ 175.00',
        },
      ],
      filas: [
        ['D2026007782', '01/07/2026', 'NB-21169', 'OM F-16', '144.00', 'Cancelada'],
        ['C2025002635', '12/04/2025', 'NB-21169', 'DS F1', '142.00', 'Pendiente'],
        ['C2022006230', '25/03/2022', 'NB-21169', 'OM F4', '34.00', 'Coactiva'],
        ['C2021003159', '09/09/2021', 'NB-21169', 'OM F4', '33.00', 'Pendiente'],
      ],
      footer:
        'El presente record se emite a solicitud del interesado y refleja las papeletas registradas en el sistema a la fecha de emisión.',
    },
  },
  transito_record_vehicular: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RV-2026-00219',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Placa',
          v: 'NB-21169',
        },
        {
          k: 'Clase',
          v: 'AUTOMÓVIL',
        },
        {
          k: 'Marca y modelo',
          v: 'TOYOTA COROLLA',
        },
        {
          k: 'Propietario',
          v: 'SERNAQUE VILLEGAS, DORIS',
        },
        {
          k: 'Papeletas',
          v: '6',
        },
        {
          k: 'Pendiente',
          v: 'S/ 175.00',
        },
      ],
      filas: [
        ['D2026007782', '01/07/2026', 'SERNAQUE VILLEGAS, D.', 'OM F-16', '144.00', 'Cancelada'],
        ['C2024010962', '31/01/2024', 'SÁNCHEZ NAVARRO, M.', 'DS F1', '280.00', 'A cuenta'],
        ['C2022006230', '25/03/2022', 'SERNAQUE VILLEGAS, D.', 'OM F4', '34.00', 'Coactiva'],
        ['C2021001686', '03/08/2021', 'CARRASCO MONTES, A.', 'OM F4', '16.50', 'Pendiente'],
      ],
      footer:
        'Documento informativo. No acredita la ausencia de infracciones; para ello corresponde la constancia libre de infracciones.',
    },
  },
  transito_constancia_libre: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'CLI-2026-00742',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de constancia',
          v: '000742-2026',
        },
        {
          k: 'Placa',
          v: 'B7T-221',
        },
        {
          k: 'Propietario',
          v: 'REYES CHUNGA, PEDRO',
        },
        {
          k: 'Documento',
          v: 'DNI 02718844',
        },
        {
          k: 'Recibo de pago',
          v: '000000049406 — S/ 36.00',
        },
        {
          k: 'Vigencia',
          v: '30 días calendario',
        },
      ],
      filas: [
        ['Papeletas de tránsito', '2019 — 2026', '0', 'Sin registros pendientes'],
        ['Papeletas en cobranza coactiva', '2019 — 2026', '0', 'Sin registros'],
        ['Internamiento vehicular', '2019 — 2026', '0', 'Sin registros'],
      ],
      footer:
        'Se deja constancia de que el vehículo identificado no registra papeletas de infracción de tránsito pendientes de pago a la fecha de emisión.',
    },
  },
  transito_padron: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-06-01',
      hasta: '2026-08-13',
      estado: 'PENDIENTES',
      ordenadoPor: 'FECHA',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'C2026004182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: 'CASTILLO PASCUALA, M.',
          },
          {
            texto: 'M-20',
          },
          {
            texto: '412.00',
          },
          {
            texto: '123.60',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2026004183',
          },
          {
            texto: '04/08/2026',
          },
          {
            texto: 'V1H-882',
          },
          {
            texto: 'DÍAZ MADRID, J.',
          },
          {
            texto: 'G-58',
          },
          {
            texto: '206.00',
          },
          {
            texto: '61.80',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2026004184',
          },
          {
            texto: '11/08/2026',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: 'SERNAQUE VILLEGAS, D.',
          },
          {
            texto: 'DS F1',
          },
          {
            texto: '142.00',
          },
          {
            texto: '42.60',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2026004185',
          },
          {
            texto: '11/08/2026',
          },
          {
            texto: 'B7T-221',
          },
          {
            texto: 'REYES CHUNGA, P.',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: '34.00',
          },
          {
            texto: '34.00',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'C2026004186',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: 'T4M-119',
          },
          {
            texto: 'INVERSIONES DEL NORTE',
          },
          {
            texto: 'M-02',
          },
          {
            texto: '824.00',
          },
          {
            texto: '247.20',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
      ],
      conteo: '5 de 1,184 · S/ 8,442.50 pendiente',
    },
  },
  transito_estado_cuenta: {
    fechaCalculo: '2026-08-13',
    campos: {
      placa: 'NB-21169',
      estado: 'PENDIENTE',
      fechaDeCalculo: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'C2025002635',
          },
          {
            texto: '12/04/2025',
          },
          {
            texto: 'DS F1',
          },
          {
            texto: '142.00',
          },
          {
            texto: '70',
          },
          {
            texto: '42.60',
          },
          {
            texto: 'No',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2024010962',
          },
          {
            texto: '31/01/2024',
          },
          {
            texto: 'DS F1',
          },
          {
            texto: '280.00',
          },
          {
            texto: '70',
          },
          {
            texto: '84.00',
          },
          {
            texto: 'No',
          },
          {
            texto: 'A cuenta',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2022006230',
          },
          {
            texto: '25/03/2022',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: '34.00',
          },
          {
            texto: '0',
          },
          {
            texto: '34.00',
          },
          {
            texto: 'Sí',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'C2021003159',
          },
          {
            texto: '09/09/2021',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: '33.00',
          },
          {
            texto: '70',
          },
          {
            texto: '9.90',
          },
          {
            texto: 'No',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'C2021001686',
          },
          {
            texto: '03/08/2021',
          },
          {
            texto: 'OM F4',
          },
          {
            texto: '16.50',
          },
          {
            texto: '0',
          },
          {
            texto: '16.50',
          },
          {
            texto: 'No',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
      ],
      conteo: '5 papeletas · S/ 175.00',
    },
  },
  transito_papeleta_reporte: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'C2025002635',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de papeleta',
          v: 'C2025002635',
        },
        {
          k: 'Fecha y hora',
          v: '12/04/2025 — 18:40',
        },
        {
          k: 'Placa',
          v: 'NB-21169',
        },
        {
          k: 'Conductor',
          v: 'SERNAQUE VILLEGAS, DORIS',
        },
        {
          k: 'Licencia',
          v: 'Q-44218937',
        },
        {
          k: 'Lugar',
          v: 'AV. JOSÉ DE LAMA CDRA. 11',
        },
      ],
      filas: [
        ['Código de infracción', 'DS F1 — Conducir sin portar licencia', '—'],
        ['Base imponible (UIT 2025)', 'S/ 5,350.00', '5,350.00'],
        ['% de la UIT por la infracción', '8 %', '428.00'],
        ['% realmente a cobrar', '33.18 %', '142.00'],
        ['Importe a pagar con beneficio', 'Descuento 70 % — pago dentro de 5 días', '42.60'],
      ],
      footer:
        'El infractor puede presentar descargo dentro de los cinco días hábiles de notificada la papeleta, conforme al Reglamento Nacional de Tránsito.',
    },
  },
  transito_rg_ordinaria: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RG-2026-001842',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '001842-2026-GR/MPS',
        },
        {
          k: 'Papeleta',
          v: 'C2025002635',
        },
        {
          k: 'Obligado',
          v: 'SERNAQUE VILLEGAS, DORIS',
        },
        {
          k: 'Documento',
          v: 'DNI 44218937',
        },
        {
          k: 'Domicilio',
          v: 'CALLE TÚPAC AMARU 611 — SULLANA',
        },
        {
          k: 'Plazo de pago',
          v: '7 días hábiles',
        },
      ],
      filas: [
        ['Multa por infracción DS F1', '2025', '142.00'],
        ['Interés moratorio', 'al 13/08/2026', '18.40'],
        ['Gastos administrativos', '—', '10.80'],
        ['Total a pagar', '—', '171.20'],
      ],
      footer:
        'Vencido el plazo señalado sin acreditarse el pago, el expediente será remitido a la Oficina de Ejecutoría Coactiva para el inicio del procedimiento de cobranza coactiva.',
    },
  },
  transito_rg_sancionadora: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RGS-2026-000418',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '000418-2026-GR/MPS',
        },
        {
          k: 'Resolución ordinaria',
          v: '001842-2026-GR/MPS',
        },
        {
          k: 'Papeleta',
          v: 'C2025002635',
        },
        {
          k: 'Obligado',
          v: 'SERNAQUE VILLEGAS, DORIS',
        },
        {
          k: 'Licencia',
          v: 'Q-44218937 — clase A-I',
        },
        {
          k: 'Sanción accesoria',
          v: 'Suspensión de licencia',
        },
      ],
      filas: [
        ['Multa firme', 'DS F1 — papeleta C2025002635', '142.00'],
        ['Interés y gastos', 'al 13/08/2026', '29.20'],
        ['Total exigible', '—', '171.20'],
        ['Sanción no pecuniaria', 'Suspensión de licencia por 30 días', '—'],
      ],
      footer:
        'Se remite copia a la Dirección Regional de Transportes y Comunicaciones para el registro de la sanción en el Registro Nacional de Sanciones.',
    },
  },
  transito_padron_coactiva: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-01-01',
      hasta: '2026-08-13',
      ejecutor: 'Todos',
      estadoDelExpediente: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026-0001201',
          },
          {
            texto: 'C2022006230',
          },
          {
            texto: '18/03/2026',
          },
          {
            texto: 'NB-21169',
          },
          {
            texto: 'SERNAQUE VILLEGAS, D.',
          },
          {
            texto: '34.00',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2026-0001248',
          },
          {
            texto: 'C2021009118',
          },
          {
            texto: '02/04/2026',
          },
          {
            texto: 'B7T-221',
          },
          {
            texto: 'REYES CHUNGA, P.',
          },
          {
            texto: '412.00',
          },
          {
            texto: 'Notificado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2026-0001302',
          },
          {
            texto: 'C2020004410',
          },
          {
            texto: '11/05/2026',
          },
          {
            texto: 'T4M-119',
          },
          {
            texto: 'INVERSIONES DEL NORTE',
          },
          {
            texto: '824.00',
          },
          {
            texto: 'Medida cautelar',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '2026-0001344',
          },
          {
            texto: 'C2020001188',
          },
          {
            texto: '30/06/2026',
          },
          {
            texto: 'V1H-882',
          },
          {
            texto: 'DÍAZ MADRID, J.',
          },
          {
            texto: '14.00',
          },
          {
            texto: 'Concluido',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 papeletas · S/ 1,284.00',
    },
  },
  transito_padron_constancias: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-07-01',
      hasta: '2026-08-13',
      usuarioQueEmitio: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '000742-2026',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'B7T-221',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: '000000049406',
          },
          {
            texto: '36.00',
          },
          {
            texto: 'VRETO',
          },
        ],
        [
          {
            texto: '000741-2026',
          },
          {
            texto: '11/08/2026',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: 'CASTILLO PASCUALA, M.',
          },
          {
            texto: '000000049388',
          },
          {
            texto: '36.00',
          },
          {
            texto: 'VRETO',
          },
        ],
        [
          {
            texto: '000740-2026',
          },
          {
            texto: '06/08/2026',
          },
          {
            texto: 'V1H-882',
          },
          {
            texto: 'DÍAZ MADRID, J.',
          },
          {
            texto: '000000049341',
          },
          {
            texto: '36.00',
          },
          {
            texto: 'MRIOS',
          },
        ],
        [
          {
            texto: '000739-2026',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'T4M-119',
          },
          {
            texto: 'INVERSIONES DEL NORTE',
          },
          {
            texto: '000000049302',
          },
          {
            texto: '36.00',
          },
          {
            texto: 'MRIOS',
          },
        ],
      ],
      conteo: '4 constancias · S/ 144.00 recaudado',
    },
  },
  transito_resumen_recaudacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      ano: '2026',
      tipoDeCobranza: 'Todas',
      agrupadoPor: 'MES',
      caja: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'Enero',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '4,120.00',
          },
          {
            texto: '2,180.00',
          },
          {
            texto: '184',
          },
          {
            texto: '24,712.00',
          },
        ],
        [
          {
            texto: 'Febrero',
          },
          {
            texto: '16,204.50',
          },
          {
            texto: '3,880.00',
          },
          {
            texto: '1,940.00',
          },
          {
            texto: '162',
          },
          {
            texto: '22,024.50',
          },
        ],
        [
          {
            texto: 'Marzo',
          },
          {
            texto: '21,180.00',
          },
          {
            texto: '5,412.00',
          },
          {
            texto: '2,410.00',
          },
          {
            texto: '204',
          },
          {
            texto: '29,002.00',
          },
        ],
        [
          {
            texto: 'Abril',
          },
          {
            texto: '19,442.10',
          },
          {
            texto: '4,018.00',
          },
          {
            texto: '2,110.00',
          },
          {
            texto: '191',
          },
          {
            texto: '25,570.10',
          },
        ],
        [
          {
            texto: 'Mayo',
          },
          {
            texto: '22,104.00',
          },
          {
            texto: '6,180.00',
          },
          {
            texto: '2,880.00',
          },
          {
            texto: '218',
          },
          {
            texto: '31,164.00',
          },
        ],
        [
          {
            texto: 'Junio',
          },
          {
            texto: '17,880.00',
          },
          {
            texto: '3,410.00',
          },
          {
            texto: '1,780.00',
          },
          {
            texto: '172',
          },
          {
            texto: '23,070.00',
          },
        ],
        [
          {
            texto: 'Julio',
          },
          {
            texto: '20,412.00',
          },
          {
            texto: '4,918.00',
          },
          {
            texto: '2,240.00',
          },
          {
            texto: '198',
          },
          {
            texto: '27,570.00',
          },
        ],
        [
          {
            texto: 'Agosto (al 13)',
          },
          {
            texto: '1,180.00',
          },
          {
            texto: '120.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '14',
          },
          {
            texto: '1,300.00',
          },
        ],
      ],
      conteo: 'Enero — agosto 2026 · S/ 184,412.60',
    },
  },
  transito_resumen_papeletas: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-01-01',
      hasta: '2026-08-13',
      agrupadoPor: 'AÑO',
      cobranza: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: '412',
          },
          {
            texto: '84,180.00',
          },
          {
            texto: '1,184',
          },
          {
            texto: '184,412.60',
          },
          {
            texto: '48',
          },
          {
            texto: '18,420.00',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: '388',
          },
          {
            texto: '76,410.00',
          },
          {
            texto: '1,042',
          },
          {
            texto: '162,180.40',
          },
          {
            texto: '92',
          },
          {
            texto: '32,118.00',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: '294',
          },
          {
            texto: '58,220.00',
          },
          {
            texto: '918',
          },
          {
            texto: '141,204.80',
          },
          {
            texto: '118',
          },
          {
            texto: '41,880.00',
          },
        ],
        [
          {
            texto: '2023',
          },
          {
            texto: '218',
          },
          {
            texto: '42,180.00',
          },
          {
            texto: '842',
          },
          {
            texto: '128,410.00',
          },
          {
            texto: '142',
          },
          {
            texto: '48,120.00',
          },
        ],
        [
          {
            texto: '2022',
          },
          {
            texto: '184',
          },
          {
            texto: '34,110.00',
          },
          {
            texto: '788',
          },
          {
            texto: '112,880.00',
          },
          {
            texto: '164',
          },
          {
            texto: '52,410.00',
          },
        ],
        [
          {
            texto: '2021',
          },
          {
            texto: '142',
          },
          {
            texto: '26,480.00',
          },
          {
            texto: '712',
          },
          {
            texto: '98,412.00',
          },
          {
            texto: '188',
          },
          {
            texto: '58,204.00',
          },
        ],
      ],
      conteo: '2021 — 2026',
    },
  },
  transito_resumen_codigo: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-01-01',
      hasta: '2026-08-13',
      estado: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'M-20',
          },
          {
            texto: 'Conducir en estado de ebriedad',
          },
          {
            texto: '18',
          },
          {
            texto: '14,842.00',
          },
          {
            texto: '42',
          },
          {
            texto: '34,180.00',
          },
        ],
        [
          {
            texto: 'G-58',
          },
          {
            texto: 'Estacionar en zona rígida',
          },
          {
            texto: '184',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '612',
          },
          {
            texto: '61,200.00',
          },
        ],
        [
          {
            texto: 'DS F1',
          },
          {
            texto: 'No portar licencia de conducir',
          },
          {
            texto: '92',
          },
          {
            texto: '13,064.00',
          },
          {
            texto: '288',
          },
          {
            texto: '40,896.00',
          },
        ],
        [
          {
            texto: 'OM F4',
          },
          {
            texto: 'Circular sin SOAT vigente',
          },
          {
            texto: '76',
          },
          {
            texto: '6,460.00',
          },
          {
            texto: '204',
          },
          {
            texto: '17,340.00',
          },
        ],
        [
          {
            texto: 'OM F-16',
          },
          {
            texto: 'Transporte informal de pasajeros',
          },
          {
            texto: '28',
          },
          {
            texto: '4,032.00',
          },
          {
            texto: '88',
          },
          {
            texto: '12,672.00',
          },
        ],
        [
          {
            texto: 'M-02',
          },
          {
            texto: 'Exceso de velocidad',
          },
          {
            texto: '14',
          },
          {
            texto: '11,536.00',
          },
          {
            texto: '38',
          },
          {
            texto: '31,312.00',
          },
        ],
      ],
      conteo: '6 códigos con movimiento',
    },
  },
  transito_resumen_placa: {
    fechaCalculo: '2026-08-13',
    campos: {
      iniciales2Letras: 'NB',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      estado: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'NB',
          },
          {
            texto: '412',
          },
          {
            texto: '118',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '294',
          },
          {
            texto: '41,180.00',
          },
        ],
        [
          {
            texto: 'T2',
          },
          {
            texto: '288',
          },
          {
            texto: '82',
          },
          {
            texto: '12,204.00',
          },
          {
            texto: '206',
          },
          {
            texto: '31,420.00',
          },
        ],
        [
          {
            texto: 'V1',
          },
          {
            texto: '204',
          },
          {
            texto: '64',
          },
          {
            texto: '9,880.00',
          },
          {
            texto: '140',
          },
          {
            texto: '22,110.00',
          },
        ],
        [
          {
            texto: 'B7',
          },
          {
            texto: '184',
          },
          {
            texto: '48',
          },
          {
            texto: '7,412.00',
          },
          {
            texto: '136',
          },
          {
            texto: '19,840.00',
          },
        ],
        [
          {
            texto: 'T4',
          },
          {
            texto: '142',
          },
          {
            texto: '38',
          },
          {
            texto: '6,180.00',
          },
          {
            texto: '104',
          },
          {
            texto: '16,204.00',
          },
        ],
        [
          {
            texto: 'M8',
          },
          {
            texto: '118',
          },
          {
            texto: '28',
          },
          {
            texto: '4,410.00',
          },
          {
            texto: '90',
          },
          {
            texto: '13,880.00',
          },
        ],
      ],
      conteo: '6 grupos',
    },
  },
  adm_notificacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      serie: '001',
      ano: '2026',
      estado: '(TODOS)',
      serie2: '001',
      ano2: '2026',
      numero2: '004183',
      fechaDeNotificacion: '2026-08-04',
      hora: '11:20',
      plazoDiasHabiles: '10',
      vence: '14/08/2026',
      infractorCodigo: '00000003541',
      infractorNombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      dNIRUC: '44218937',
      direccionDelPredio: 'CALLE LAMA 482',
      ciiu: '4711 — VENTA AL POR MENOR EN COMERCIOS NO ESPECIALIZADOS',
      licenciaDeFuncionamiento: 'LF-2024-00812',
      codigoDeInfraccion: 'A-021',
      descripcion: 'ABRIR ESTABLECIMIENTO SIN AUTORIZACIÓN MUNICIPAL',
      fiscalizador: 'RETO SANTOS, VÍCTOR',
      recibidoPor: 'CONTRIBUYENTE',
    },
    tabla: {
      filas: [
        [
          {
            texto: '001-004182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: '5610',
          },
          {
            texto: 'A-014',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: 'Vencida',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '001-004183',
          },
          {
            texto: '04/08/2026',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'CALLE LAMA 482',
          },
          {
            texto: '4711',
          },
          {
            texto: 'A-021',
          },
          {
            texto: '14/08/2026',
          },
          {
            texto: 'Notificada',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '001-004184',
          },
          {
            texto: '07/08/2026',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'C.P. BARRIO BUENOS AIRES',
          },
          {
            texto: '—',
          },
          {
            texto: 'A-008',
          },
          {
            texto: '17/08/2026',
          },
          {
            texto: 'Subsanada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '001-004185',
          },
          {
            texto: '11/08/2026',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'AV. CHAMPAGNAT 220',
          },
          {
            texto: '4520',
          },
          {
            texto: 'A-032',
          },
          {
            texto: '21/08/2026',
          },
          {
            texto: 'Con papeleta',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 812',
    },
  },
  infracciones_adm: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigoCuis: 'Todos',
      estado: 'Todos',
      nroDeActa2: 'AC-2026-0912',
      fecha: '2026-08-05',
      hora: '11:20',
      administrado2: 'NOBLECILLA ARISMENDIZ SAC',
      rUCDNI: '20525118447',
      nombreComercial: 'DEPÓSITO NOBLECILLA',
      establecimiento: 'AV. JOSÉ DE LAMA 1180',
      ciiuDelNegocio: 'G-5234-01 — VENTA DE MATERIALES DE CONSTRUCCIÓN',
      inspector: 'L. PEÑA SANDOVAL',
      supervisor: 'C. ANCAJIMA FLORES',
      personaQueAtiende: 'NOBLECILLA RUIZ, CARLOS',
      seNegoAFirmar: true,
      descripcionDeLosHechos:
        'Establecimiento comercial en funcionamiento sin contar con licencia municipal vigente.',
      codigoCuis2: 'C-101',
      descripcionDeLaInfraccion: 'FUNCIONAR SIN LICENCIA MUNICIPAL DE FUNCIONAMIENTO',
      baseUitS: '5,350.00',
      porcentajeDeUit: '50 %',
      valorDeLaMultaS: '2,675.00',
      medidaComplementaria: 'CLAUSURA TEMPORAL',
      nroDeResolucionRis: 'RIS-0912-2026-MPS',
      fechaDeNotificacion: '2026-08-07',
      descuentoProntoPago50: '− S/ 1,337.50',
      plazoDeDescargo: '5 días hábiles',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'AC-2026-0912',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'C-101',
          },
          {
            texto: 'Funcionar sin licencia municipal',
          },
          {
            texto: '50 %',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: 'Clausura temporal',
          },
          {
            texto: 'Sancionada',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'AC-2026-0918',
          },
          {
            texto: 'RESTAURANT SABOR Y SAZÓN',
          },
          {
            texto: 'S-018',
          },
          {
            texto: 'Deficiencias de salubridad',
          },
          {
            texto: '20 %',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: 'Retiro de productos',
          },
          {
            texto: 'Constatada',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'AC-2026-0921',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'A-042',
          },
          {
            texto: 'Anuncio sin autorización',
          },
          {
            texto: '10 %',
          },
          {
            texto: '535.00',
          },
          {
            texto: 'Retiro del anuncio',
          },
          {
            texto: 'Preventiva',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'AC-2026-0904',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'C-214',
          },
          {
            texto: 'Obra sin licencia de edificación',
          },
          {
            texto: '100 %',
          },
          {
            texto: '5,350.00',
          },
          {
            texto: 'Paralización de obra',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 2,118',
    },
  },
  codigos_cuis: {
    fechaCalculo: '2026-08-13',
    campos: {
      materia: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'C-101',
          },
          {
            texto: 'Comercialización',
          },
          {
            texto: 'Funcionar sin licencia municipal de funcionamiento',
          },
          {
            texto: '50 %',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: 'Clausura temporal',
          },
        ],
        [
          {
            texto: 'C-108',
          },
          {
            texto: 'Comercialización',
          },
          {
            texto: 'Funcionar en giro distinto al autorizado',
          },
          {
            texto: '30 %',
          },
          {
            texto: '1,605.00',
          },
          {
            texto: 'Clausura temporal',
          },
        ],
        [
          {
            texto: 'C-214',
          },
          {
            texto: 'Obras',
          },
          {
            texto: 'Ejecutar obra sin licencia de edificación',
          },
          {
            texto: '100 %',
          },
          {
            texto: '5,350.00',
          },
          {
            texto: 'Paralización de obra',
          },
        ],
        [
          {
            texto: 'S-018',
          },
          {
            texto: 'Salubridad',
          },
          {
            texto: 'Deficiencias de salubridad en el establecimiento',
          },
          {
            texto: '20 %',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: 'Retiro de productos',
          },
        ],
        [
          {
            texto: 'A-042',
          },
          {
            texto: 'Anuncios',
          },
          {
            texto: 'Instalar anuncio sin autorización municipal',
          },
          {
            texto: '10 %',
          },
          {
            texto: '535.00',
          },
          {
            texto: 'Retiro del anuncio',
          },
        ],
        [
          {
            texto: 'L-007',
          },
          {
            texto: 'Limpieza',
          },
          {
            texto: 'Arrojar residuos sólidos en la vía pública',
          },
          {
            texto: '10 %',
          },
          {
            texto: '535.00',
          },
          {
            texto: 'Ninguna',
          },
        ],
      ],
      conteo: '6 de 284',
    },
  },
  adm_codigos_reporte: {
    fechaCalculo: '2026-08-13',
    campos: {
      estado: 'VIGENTES',
      ordenadoPor: 'CÓDIGO',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'A-005',
          },
          {
            texto: 'Ocupar la vía pública sin autorización',
          },
          {
            texto: 'UIT',
          },
          {
            texto: '10',
          },
          {
            texto: '535.00',
          },
          {
            texto: 'Retiro de bienes',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'A-008',
          },
          {
            texto: 'Arrojar residuos sólidos en la vía pública',
          },
          {
            texto: 'UIT',
          },
          {
            texto: '20',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '—',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'A-014',
          },
          {
            texto: 'Funcionar sin licencia de funcionamiento',
          },
          {
            texto: 'UIT',
          },
          {
            texto: '50',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: 'Clausura temporal',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'A-021',
          },
          {
            texto: 'Abrir establecimiento sin autorización municipal',
          },
          {
            texto: 'UIT',
          },
          {
            texto: '20',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: 'Clausura',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'A-032',
          },
          {
            texto: 'Construir sin licencia de edificación',
          },
          {
            texto: 'Valor de obra',
          },
          {
            texto: '10',
          },
          {
            texto: '5,350.00',
          },
          {
            texto: 'Paralización de obra',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'A-041',
          },
          {
            texto: 'Instalar anuncio sin autorización',
          },
          {
            texto: 'UIT',
          },
          {
            texto: '15',
          },
          {
            texto: '802.50',
          },
          {
            texto: 'Retiro del anuncio',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
      ],
      conteo: '6 de 184 códigos',
    },
  },
  adm_valores: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigoDeCriterio: '00000000418',
      descripcion: 'RM PAPELETAS ADMINISTRATIVAS 001 AÑO 2026',
      fecInicio: '2026-01-01',
      fecFin: '2026-07-31',
      tipoDeRecaudo: '035 — RM PAPELETAS ADMINISTRATIVAS',
      vencimiento: '2026-09-15',
      oficina: '999999 — OFICINA NO ESPECIFICADA',
    },
    tabla: {
      filas: [
        [
          {
            texto: '00000000400',
          },
          {
            texto: 'RM PAPELETAS ADMINISTRATIVAS 013 AÑO 2025',
          },
          {
            texto: 'RMPAD',
          },
          {
            texto: '01/01/2025',
          },
          {
            texto: '31/12/2025',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '00000000418',
          },
          {
            texto: 'RM PAPELETAS ADMINISTRATIVAS 001 AÑO 2026',
          },
          {
            texto: 'RMPAD',
          },
          {
            texto: '01/01/2026',
          },
          {
            texto: '31/07/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
      ],
      conteo: '2 criterios',
    },
  },
  adm_estado_cuenta: {
    fechaCalculo: '2026-08-13',
    campos: {
      papeleta: 'P-002418',
      fechaDeCalculo: '2026-08-13',
      incluirGastos: 'SÍ',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'MULTA ADMINISTRATIVA A-014',
          },
          {
            texto: '001',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: '138.60',
          },
          {
            texto: '10.80',
          },
          {
            texto: '2,824.40',
          },
        ],
        [
          {
            texto: 'Beneficio por pronto pago (50 %)',
          },
          {
            texto: '—',
          },
          {
            texto: '31/08/2026',
          },
          {
            texto: '1,337.50',
          },
          {
            texto: '0.00',
          },
          {
            texto: '10.80',
          },
          {
            texto: '1,348.30',
          },
        ],
      ],
      conteo: 'Total S/ 2,824.40',
    },
  },
  adm_resolucion_gerencia: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RG-2026-000912',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '000912-2026-GM/MPS',
        },
        {
          k: 'Papeleta',
          v: 'P-002418',
        },
        {
          k: 'Notificación previa',
          v: '001-004182 del 02/08/2026',
        },
        {
          k: 'Infractor',
          v: 'NOBLECILLA ARISMENDIZ SAC',
        },
        {
          k: 'R.U.C.',
          v: '20525118447',
        },
        {
          k: 'Establecimiento',
          v: 'AV. JOSÉ DE LAMA 1180',
        },
      ],
      filas: [
        ['Multa A-014 — funcionar sin licencia', 'CUIS — Ordenanza Municipal 018-2024', '2,675.00'],
        ['Interés moratorio', 'Art. 33 Código Tributario', '138.60'],
        ['Gastos administrativos', 'TUPA vigente', '10.80'],
        ['Total exigible', '—', '2,824.40'],
      ],
      footer:
        'Contra la presente resolución procede recurso de reconsideración o apelación dentro de los quince días hábiles siguientes a su notificación.',
    },
  },
  adm_notificacion_resolucion: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'NOT-2026-001842',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de notificación',
          v: '001842-2026',
        },
        {
          k: 'Resolución',
          v: '000912-2026-GM/MPS',
        },
        {
          k: 'Administrado',
          v: 'NOBLECILLA ARISMENDIZ SAC',
        },
        {
          k: 'Domicilio',
          v: 'AV. JOSÉ DE LAMA 1180 — SULLANA',
        },
        {
          k: 'Nº de visita',
          v: '1',
        },
        {
          k: 'Tipo de notificación',
          v: 'NOTIFICACIÓN CON ÉXITO',
        },
      ],
      filas: [
        ['Fecha y hora', '13/08/2026 — 10:15'],
        ['Recibido por', 'REPRESENTANTE — RUIZ INGA, FERNANDO'],
        ['Documento del receptor', 'DNI 10027723'],
        ['Características de la vivienda', 'LOCAL COMERCIAL DE UN PISO, FACHADA DE LADRILLO'],
        ['Notificador', 'RETO SANTOS, VÍCTOR'],
        ['Testigo 01', '—'],
      ],
      footer:
        'La notificación surte efecto el día hábil siguiente de su recepción, conforme al artículo 25 del Texto Único Ordenado de la Ley del Procedimiento Administrativo General.',
    },
  },
  adm_reportes: {
    fechaCalculo: '2026-08-13',
    campos: {
      reporte: 'PADRÓN DE NOTIFICACIONES',
      ano: '2026',
      estado: '(TODOS)',
      deuda: '(TODOS)',
      fiscalizador: '(TODOS)',
      rangoDesde: '2026-07-01',
      rangoHasta: '2026-08-13',
    },
  },
  adm_padron_notificaciones: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-07-01',
      hasta: '2026-08-13',
      agrupadoPor: 'MES',
      estado: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: '001-004182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'A-014',
          },
          {
            texto: 'RETO SANTOS, V.',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: 'P-002418',
          },
          {
            texto: '2,675.00',
          },
        ],
        [
          {
            texto: '001-004183',
          },
          {
            texto: '04/08/2026',
          },
          {
            texto: 'CASTILLO PASCUALA, M. E.',
          },
          {
            texto: 'A-021',
          },
          {
            texto: 'RÍOS MENDOZA, M.',
          },
          {
            texto: '14/08/2026',
          },
          {
            texto: '—',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: '001-004184',
          },
          {
            texto: '07/08/2026',
          },
          {
            texto: 'DÍAZ MADRID, J. C.',
          },
          {
            texto: 'A-008',
          },
          {
            texto: 'QUISPE PEÑA, J.',
          },
          {
            texto: '17/08/2026',
          },
          {
            texto: '—',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: '001-004185',
          },
          {
            texto: '11/08/2026',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'A-032',
          },
          {
            texto: 'RETO SANTOS, V.',
          },
          {
            texto: '21/08/2026',
          },
          {
            texto: 'P-002419',
          },
          {
            texto: '5,350.00',
          },
        ],
        [
          {
            texto: '001-004186',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: 'SUC. RUFINA MEDINA MEDINA',
          },
          {
            texto: 'A-005',
          },
          {
            texto: 'RÍOS MENDOZA, M.',
          },
          {
            texto: '22/08/2026',
          },
          {
            texto: '—',
          },
          {
            texto: '0.00',
          },
        ],
      ],
      conteo: '5 de 812',
    },
  },
  adm_notificaciones_vencidas: {
    fechaCalculo: '2026-08-13',
    campos: {
      vencidasAl: '2026-08-13',
      fiscalizador: '(TODOS)',
      conPapeleta: 'NO',
    },
    tabla: {
      filas: [
        [
          {
            texto: '001-004182',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: 'A-014',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '1',
          },
        ],
        [
          {
            texto: '001-004102',
          },
          {
            texto: '18/07/2026',
          },
          {
            texto: 'COMERCIAL SULLANA EIRL',
          },
          {
            texto: 'CALLE BOLÍVAR 318',
          },
          {
            texto: 'A-021',
          },
          {
            texto: '30/07/2026',
          },
          {
            texto: '14',
          },
        ],
        [
          {
            texto: '001-004044',
          },
          {
            texto: '02/07/2026',
          },
          {
            texto: 'RESTAURANT EL PARAÍSO',
          },
          {
            texto: 'AV. CHAMPAGNAT 118',
          },
          {
            texto: 'A-014',
          },
          {
            texto: '14/07/2026',
          },
          {
            texto: '30',
          },
        ],
        [
          {
            texto: '001-003988',
          },
          {
            texto: '12/06/2026',
          },
          {
            texto: 'BODEGA SANTA ROSA',
          },
          {
            texto: 'URB. SANTA ROSA MZ. B LT. 4',
          },
          {
            texto: 'A-005',
          },
          {
            texto: '26/06/2026',
          },
          {
            texto: '48',
          },
        ],
      ],
      conteo: '4 notificaciones',
    },
  },
  adm_notificaciones_contribuyente: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000006551',
      ano: 'Todos',
      estadoDeDeuda: '(TODOS)',
      agrupadoPor: 'AÑO Y MES',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: 'Agosto',
          },
          {
            texto: 'P-002418',
          },
          {
            texto: 'A-014',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: 'Pendiente',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: 'Mayo',
          },
          {
            texto: 'P-002204',
          },
          {
            texto: 'A-021',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '000000048112',
          },
          {
            texto: '20/05/2026',
          },
          {
            texto: 'Cancelada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: 'Noviembre',
          },
          {
            texto: 'P-001988',
          },
          {
            texto: 'A-014',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: 'Julio',
          },
          {
            texto: 'P-001842',
          },
          {
            texto: 'A-005',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '000000044180',
          },
          {
            texto: '02/08/2025',
          },
          {
            texto: 'Cancelada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: 'Marzo',
          },
          {
            texto: 'P-001412',
          },
          {
            texto: 'A-032',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: 'Prescrita',
            tono: 'warn',
          },
        ],
      ],
      conteo: '5 registros · S/ 8,025.00',
    },
  },
  adm_resumen_recaudacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      ano: '2026',
      agrupadoPor: 'MES',
      tipoDeCobranza: 'Todas',
      caja: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'Enero',
          },
          {
            texto: '42',
          },
          {
            texto: '8,412.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '11,622.00',
          },
        ],
        [
          {
            texto: 'Febrero',
          },
          {
            texto: '38',
          },
          {
            texto: '7,490.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '10,700.00',
          },
        ],
        [
          {
            texto: 'Marzo',
          },
          {
            texto: '51',
          },
          {
            texto: '11,235.00',
          },
          {
            texto: '3,210.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '15,515.00',
          },
        ],
        [
          {
            texto: 'Abril',
          },
          {
            texto: '44',
          },
          {
            texto: '9,630.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '12,840.00',
          },
        ],
        [
          {
            texto: 'Mayo',
          },
          {
            texto: '48',
          },
          {
            texto: '10,700.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '13,910.00',
          },
        ],
        [
          {
            texto: 'Junio',
          },
          {
            texto: '39',
          },
          {
            texto: '8,025.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '1,070.00',
          },
          {
            texto: '11,235.00',
          },
        ],
        [
          {
            texto: 'Julio',
          },
          {
            texto: '52',
          },
          {
            texto: '12,840.00',
          },
          {
            texto: '3,210.00',
          },
          {
            texto: '2,140.00',
          },
          {
            texto: '18,190.00',
          },
        ],
        [
          {
            texto: 'Agosto (al 13)',
          },
          {
            texto: '9',
          },
          {
            texto: '2,400.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2,400.00',
          },
        ],
      ],
      conteo: 'Enero — agosto 2026 · S/ 96,412.00',
    },
  },
  caja_tributaria: {
    fechaCalculo: '2026-08-13',
    campos: {
      formaDePago: 'NORMAL TRIBUTARIO',
      beneficioAplicable: 'ORD. 012-2026-MPS — 100 % INTERESES',
      buscarPor: 'CONTRIBUYENTE',
      codContribuyente: '00000003541',
      nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      domicilioFiscal: 'CALLE LAMA 482 — ZONA 2 INDUSTRIAL, SULLANA',
      anoDesde: '2022',
      anoHasta: '2026',
      cuotaDesde: '1',
      cuotaHasta: '12',
      tributo: 'TODOS',
      fase: 'TODAS',
      codUnidad: '02-014-D-14-01',
      coactiva: 'TODAS',
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: '2026',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: 'Ordinaria',
          },
          {
            texto: '147.98',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '147.98',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '2026',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '2',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: 'Ordinaria',
          },
          {
            texto: '146.86',
          },
          {
            texto: '2.14',
          },
          {
            texto: '4.82',
          },
          {
            texto: '0.00',
          },
          {
            texto: '153.82',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '2026',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1-12',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: 'Ordinaria',
          },
          {
            texto: '486.00',
          },
          {
            texto: '7.20',
          },
          {
            texto: '18.44',
          },
          {
            texto: '0.00',
          },
          {
            texto: '511.64',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: '2025',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '3',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: 'Valor emitido',
          },
          {
            texto: '144.20',
          },
          {
            texto: '8.60',
          },
          {
            texto: '31.18',
          },
          {
            texto: '12.00',
          },
          {
            texto: '195.98',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: '2024',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: '1',
          },
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: 'Coactiva',
          },
          {
            texto: '614.00',
          },
          {
            texto: '48.20',
          },
          {
            texto: '182.44',
          },
          {
            texto: '96.00',
          },
          {
            texto: '940.64',
          },
        ],
      ],
      conteo: '5 registros · 3 seleccionados',
    },
    totales: [
      {
        label: 'Deuda total',
        value: 'S/ 1,950.06',
      },
      {
        label: 'Deuda acogida',
        value: 'S/ 813.44',
      },
      {
        label: 'Beneficio aplicado',
        value: '− S/ 25.40',
      },
      {
        label: 'Total a cobrar',
        value: 'S/ 788.04',
      },
    ],
  },
  caja_tasas: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000003541',
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: '1.3.2.5.2.2',
          },
          {
            texto: 'INSPECCIÓN OCULAR',
          },
          {
            texto: 'Fiscalización',
          },
          {
            texto: '1',
          },
          {
            texto: '88.40',
          },
          {
            texto: '88.40',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '1.3.2.10.1.99',
          },
          {
            texto: 'CONSTANCIA DE NO ADEUDO',
          },
          {
            texto: 'Rentas',
          },
          {
            texto: '1',
          },
          {
            texto: '18.00',
          },
          {
            texto: '18.00',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '1.3.2.10.1.99',
          },
          {
            texto: 'COPIA CERTIFICADA DE FICHA',
          },
          {
            texto: 'Catastro',
          },
          {
            texto: '2',
          },
          {
            texto: '12.00',
          },
          {
            texto: '24.00',
          },
        ],
        [
          {
            texto: '',
          },
          {
            texto: '1.3.2.9.1.6',
          },
          {
            texto: 'DERECHO DE ANUNCIO Y PROPAGANDA',
          },
          {
            texto: 'Comercialización',
          },
          {
            texto: '1',
          },
          {
            texto: '412.00',
          },
          {
            texto: '412.00',
          },
        ],
      ],
      conteo: '3 conceptos seleccionados',
    },
    totales: [
      {
        label: 'Conceptos',
        value: '3',
      },
      {
        label: 'Subtotal',
        value: 'S/ 130.40',
      },
      {
        label: 'Descuentos',
        value: 'S/ 0.00',
      },
      {
        label: 'Total a cobrar',
        value: 'S/ 130.40',
      },
    ],
  },
  fraccionamiento: {
    fechaCalculo: '2026-08-13',
    campos: {
      totalDeudaS: '262.160',
      gastosDeudaS: '0.000',
      codContribuyente: '00000003541',
      nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      nroDeCuotas: '6',
      montoDeCuotaS: '0',
      cuotaInicial: '20 %',
      interesDeFraccionamientoMensual: '0.80 %',
      primeraCuotaVence: '2026-11-30',
      estado: 'VIGENTE',
      tipoDeGarantia: 'NO REQUIERE',
      convenio: 'CONV-2026-00412',
      solicitud: true,
      compromiso: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: '001',
          },
          {
            texto: '46.17',
          },
          {
            texto: '42.65',
          },
          {
            texto: '2.52',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '30/11/2026',
          },
        ],
        [
          {
            texto: '002',
          },
          {
            texto: '46.17',
          },
          {
            texto: '43.06',
          },
          {
            texto: '2.11',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '30/12/2026',
          },
        ],
        [
          {
            texto: '003',
          },
          {
            texto: '46.17',
          },
          {
            texto: '43.48',
          },
          {
            texto: '1.69',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '30/01/2027',
          },
        ],
        [
          {
            texto: '004',
          },
          {
            texto: '46.17',
          },
          {
            texto: '43.89',
          },
          {
            texto: '1.28',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '28/02/2027',
          },
        ],
        [
          {
            texto: '005',
          },
          {
            texto: '46.17',
          },
          {
            texto: '44.31',
          },
          {
            texto: '0.86',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '30/03/2027',
          },
        ],
        [
          {
            texto: '006',
          },
          {
            texto: '46.20',
          },
          {
            texto: '44.77',
          },
          {
            texto: '0.43',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.00',
          },
          {
            texto: '30/04/2027',
          },
        ],
      ],
      conteo: '6 cuotas',
    },
    totales: [
      {
        label: 'Total cuotas',
        value: 'S/ 277.05',
      },
      {
        label: 'Capital',
        value: 'S/ 262.16',
      },
      {
        label: 'Interés',
        value: 'S/ 8.89',
      },
      {
        label: 'Gastos',
        value: 'S/ 6.00',
      },
    ],
  },
  consulta_convenios: {
    fechaCalculo: '2026-08-13',
    campos: {
      estado: 'Todos',
      desde: '2026-01-01',
      hasta: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'CONV-2026-00412',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '262.16',
          },
          {
            texto: '6',
          },
          {
            texto: '1',
          },
          {
            texto: '0',
          },
          {
            texto: '231.03',
          },
          {
            texto: 'Vigente',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'CONV-2026-00388',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: '04/06/2026',
          },
          {
            texto: '9,412.15',
          },
          {
            texto: '12',
          },
          {
            texto: '2',
          },
          {
            texto: '2',
          },
          {
            texto: '7,844.10',
          },
          {
            texto: 'En riesgo',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'CONV-2025-00944',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: '18/09/2025',
          },
          {
            texto: '3,180.00',
          },
          {
            texto: '6',
          },
          {
            texto: '6',
          },
          {
            texto: '0',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Cumplido',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'CONV-2025-00812',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: '02/04/2025',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '24',
          },
          {
            texto: '3',
          },
          {
            texto: '5',
          },
          {
            texto: '16,102.40',
          },
          {
            texto: 'Quebrado',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 2,184',
    },
    totales: [
      {
        label: 'Convenios vigentes',
        value: '1,842',
      },
      {
        label: 'En riesgo',
        value: '141',
      },
      {
        label: 'Quebrados 2026',
        value: '88',
      },
      {
        label: 'Saldo por cobrar',
        value: 'S/ 4.21 M',
      },
    ],
  },
  duplicado_recibo: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroDeRecibo: '0003-0041182',
      fecha: '2026-08-12',
      caja: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: '0003-0041182',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '09:14',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'Impuesto predial cuotas 1 y 2',
          },
          {
            texto: '301.80',
          },
          {
            texto: '1',
          },
          {
            texto: 'Emitido',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '0003-0041183',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '09:22',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: 'Arbitrios 2026',
          },
          {
            texto: '437.40',
          },
          {
            texto: '0',
          },
          {
            texto: 'Emitido',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '0003-0041184',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '09:41',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'Alcabala',
          },
          {
            texto: '1,245.00',
          },
          {
            texto: '0',
          },
          {
            texto: 'Anulado',
            tono: 'bad',
          },
        ],
      ],
      conteo: '3 recibos',
    },
  },
  anulacion_recibo: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroDeRecibo: '0003-0041184',
      fechaDeEmision: '12/08/2026 09:41',
      cajaCajero: 'C-3 — J. CÁRDENAS VEGA',
      contribuyente: 'DÍAZ MADRID, JULIO CÉSAR',
      concepto: 'IMPUESTO DE ALCABALA — EXPEDIENTE 2026-0918',
      importeS: '1,245.00',
      medioDePago: 'DEPÓSITO EN CUENTA',
      motivo: 'ERROR EN EL CONCEPTO COBRADO',
      autorizadoPor: 'RESPONSABLE DE TESORERÍA',
      nDeMemorando: 'MEM-0418-2026-MPS-T',
      devuelveLaDeudaACuentaCorriente: true,
      detalle: 'Se cobró alcabala sobre el 100 % del predio cuando la transferencia fue del 50 %.',
    },
  },
  anulacion_convenio: {
    fechaCalculo: '2026-08-13',
    campos: {
      numConv: '0000000643',
      estadoDelConvenio: 'Todos',
      fechaDeAnulacion: '2026-08-13',
      numAnul: '000016',
      fechaAnul: '2026-08-13',
      responsableAnul: 'JC',
      numConv2: '0000000643',
      estadoDelConvenio2: 'NORMAL',
      contribuyente2: '00000003542 — SANTIAGO MOSCOL-GASPAR',
      motivo: 'PAGOS NO REALIZADOS',
      glosa: 'PAGOS NO REALIZADOS',
    },
    tabla: {
      filas: [
        [
          {
            texto: '000016',
          },
          {
            texto: '0000000643',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'PAGOS NO REALIZADOS',
          },
          {
            texto: 'JC',
          },
        ],
        [
          {
            texto: '000015',
          },
          {
            texto: '0000000618',
          },
          {
            texto: '04/08/2026',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'SOLICITUD DEL CONTRIBUYENTE',
          },
          {
            texto: 'VRETO',
          },
        ],
        [
          {
            texto: '000014',
          },
          {
            texto: '0000000602',
          },
          {
            texto: '22/07/2026',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'QUIEBRA POR INCUMPLIMIENTO',
          },
          {
            texto: 'MRIOS',
          },
        ],
      ],
      conteo: '3 registros',
    },
  },
  cierre_caja: {
    fechaCalculo: '2026-08-13',
    campos: {
      caja: 'C-3',
      cajero: 'J. CÁRDENAS VEGA',
      fecha: '2026-08-12',
      turno: 'MAÑANA',
      horaDeApertura: '08:00',
      horaDeCierre: '13:30',
      efectivoS: '12,418.40',
      tarjetaDeDebitoCreditoS: '4,120.00',
      depositoEnCuentaS: '8,940.60',
      pagoEnLineaS: '2,214.30',
      totalDeclaradoS: '27,693.30',
      totalSistemaS: '27,693.30',
      diferenciaS: '0.00',
      recibosEmitidos: '148',
      recibosAnulados: '3',
    },
  },
  avance_recaudacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejercicio: '2026',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      tributo: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '9,418,204.60',
          },
          {
            texto: '8,420,118.40',
          },
          {
            texto: '998,086.20',
          },
          {
            texto: '89.4 %',
          },
          {
            texto: '9,600,000.00',
          },
          {
            texto: '87.7 %',
          },
        ],
        [
          {
            texto: 'ARBITRIOS MUNICIPALES',
          },
          {
            texto: '5,884,110.20',
          },
          {
            texto: '5,112,440.80',
          },
          {
            texto: '771,669.40',
          },
          {
            texto: '86.9 %',
          },
          {
            texto: '6,100,000.00',
          },
          {
            texto: '83.8 %',
          },
        ],
        [
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: '2,884,000.00',
          },
          {
            texto: '1,882,400.00',
          },
          {
            texto: '1,001,600.00',
          },
          {
            texto: '65.3 %',
          },
          {
            texto: '2,900,000.00',
          },
          {
            texto: '64.9 %',
          },
        ],
        [
          {
            texto: 'ALCABALA',
          },
          {
            texto: '1,420,880.00',
          },
          {
            texto: '1,420,880.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '100.0 %',
          },
          {
            texto: '1,600,000.00',
          },
          {
            texto: '88.8 %',
          },
        ],
        [
          {
            texto: 'MULTAS Y PAPELETAS',
          },
          {
            texto: '4,118,200.00',
          },
          {
            texto: '1,588,412.00',
          },
          {
            texto: '2,529,788.00',
          },
          {
            texto: '38.6 %',
          },
          {
            texto: '3,200,000.00',
          },
          {
            texto: '49.6 %',
          },
        ],
      ],
      conteo: 'Ejercicio 2026 al 13/08',
    },
    totales: [
      {
        label: 'Emitido',
        value: 'S/ 23.73 M',
      },
      {
        label: 'Recaudado',
        value: 'S/ 18.42 M',
      },
      {
        label: 'Saldo por cobrar',
        value: 'S/ 5.30 M',
      },
      {
        label: 'Avance',
        value: '77.6 %',
      },
    ],
  },
  recaudacion_area: {
    fechaCalculo: '2026-08-13',
    campos: {
      area: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      agruparPorArea: 'No',
      agruparPorTributo: 'No',
    },
    tabla: {
      filas: [
        [
          {
            texto: '1.1. 2. 1. 1. 1',
          },
          {
            texto: 'PREDIAL',
          },
          {
            texto: '3,300.93',
          },
        ],
        [
          {
            texto: '1.1. 3. 3. 3. 4',
          },
          {
            texto: 'IMPUESTO A LOS ESPECTÁCULOS PÚBLICOS NO DEPORTIVOS',
          },
          {
            texto: '23,020.00',
          },
        ],
        [
          {
            texto: '1.1. 5. 3. 1.99',
          },
          {
            texto: 'OTRAS MULTAS',
          },
          {
            texto: '16.00',
          },
        ],
        [
          {
            texto: '1.1. 5. 3. 2.99',
          },
          {
            texto: 'OTRAS SANCIONES',
          },
          {
            texto: '1,041.06',
          },
        ],
        [
          {
            texto: '1.3. 2. 5. 2. 2',
          },
          {
            texto: 'INSPECCIÓN OCULAR',
          },
          {
            texto: '688.80',
          },
        ],
        [
          {
            texto: '1.3. 2. 9. 1. 6',
          },
          {
            texto: 'ANUNCIOS Y PROPAGANDA',
          },
          {
            texto: '5,924.75',
          },
        ],
        [
          {
            texto: '1.3. 2.10. 1.99',
          },
          {
            texto: 'OTROS DERECHOS ADMINISTRATIVOS',
          },
          {
            texto: '1,391.10',
          },
        ],
        [
          {
            texto: '1.3. 3. 9. 2.27',
          },
          {
            texto: 'PARQUES Y JARDINES',
          },
          {
            texto: '34.38',
          },
        ],
        [
          {
            texto: '1.3. 3. 9. 2.23',
          },
          {
            texto: 'LIMPIEZA PUBLICA',
          },
          {
            texto: '99.05',
          },
        ],
        [
          {
            texto: '1.3. 3. 9. 2.24',
          },
          {
            texto: 'SERENAZGO',
          },
          {
            texto: '63.26',
          },
        ],
      ],
      conteo: '10 partidas',
    },
  },
  cuenta_corriente: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000003541',
      ejercicio: 'Todos',
      tributo: 'Todos',
      situacion: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1 de 4',
          },
          {
            texto: '147.98',
          },
          {
            texto: '147.98',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Cancelado',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '2 de 4',
          },
          {
            texto: '146.86',
          },
          {
            texto: '0.00',
          },
          {
            texto: '153.82',
          },
          {
            texto: 'Ordinaria',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '1-12',
          },
          {
            texto: '486.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '511.64',
          },
          {
            texto: 'Ordinaria',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: '3 de 4',
          },
          {
            texto: '144.20',
          },
          {
            texto: '0.00',
          },
          {
            texto: '195.98',
          },
          {
            texto: 'Valor emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: 'T2G-418',
          },
          {
            texto: '1 de 1',
          },
          {
            texto: '614.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '940.64',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '5 obligaciones',
    },
    totales: [
      {
        label: 'Deuda insoluta',
        value: 'S/ 1,591.06',
      },
      {
        label: 'Reajuste e interés',
        value: 'S/ 263.00',
      },
      {
        label: 'Costas y gastos',
        value: 'S/ 96.00',
      },
      {
        label: 'Saldo total',
        value: 'S/ 1,802.06',
      },
    ],
  },
  consulta_deuda: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000006550',
      fechaDeCorte: '2026-08-13',
      fase: 'Todas',
      incluyeConvenios: 'No',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '1-4',
          },
          {
            texto: '1,842.60',
          },
          {
            texto: '26.40',
          },
          {
            texto: '84.12',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1,953.12',
          },
          {
            texto: 'Ordinaria',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '1-12',
          },
          {
            texto: '1,184.00',
          },
          {
            texto: '38.20',
          },
          {
            texto: '188.44',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1,410.64',
          },
          {
            texto: 'Valor emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '1-4',
          },
          {
            texto: '2,880.00',
          },
          {
            texto: '142.80',
          },
          {
            texto: '682.44',
          },
          {
            texto: '96.00',
          },
          {
            texto: '3,801.24',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '2023',
          },
          {
            texto: 'MULTA ADMINISTRATIVA',
          },
          {
            texto: '1',
          },
          {
            texto: '1,840.00',
          },
          {
            texto: '98.40',
          },
          {
            texto: '308.75',
          },
          {
            texto: '184.00',
          },
          {
            texto: '2,431.15',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 obligaciones',
    },
    totales: [
      {
        label: 'Fase ordinaria',
        value: 'S/ 1,953.12',
      },
      {
        label: 'Valor emitido',
        value: 'S/ 1,410.64',
      },
      {
        label: 'Fase coactiva',
        value: 'S/ 6,232.39',
      },
      {
        label: 'Deuda total',
        value: 'S/ 9,596.15',
      },
    ],
  },
  consulta_unificada: {
    fechaCalculo: '2026-08-13',
    campos: {
      contribuyente: '00000003542',
      impresion: 'PREDIAL Y ARBITRIOS',
      insoluto: '186.48',
      reajuste: '0.00',
      interes: '0.00',
      gasto: '92.55',
      total: '279.03',
      estadoDeLaConsulta: 'CONSULTA FINALIZADA',
      tributo: '(TODOS)',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      caja: 'Todas',
      altaBaja: '(TODAS)',
      autoManual: '(TODAS)',
      codRefCatastral: '20060100567032',
      tipoDeMovimiento: '(TODOS)',
      estado: 'Todos',
      tipoDeValor: 'Todos',
      ano2: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: '0000098252',
          },
          {
            texto: '007',
          },
          {
            texto: 'A.H. CUATRO',
          },
          {
            texto: '1',
          },
          {
            texto: '15,821.60',
          },
          {
            texto: '0.00',
          },
          {
            texto: '15,821.60',
          },
          {
            texto: '31.64',
          },
          {
            texto: '84.78',
          },
          {
            texto: '25.20',
          },
          {
            texto: '0.00',
          },
          {
            texto: '37.08',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: '0000005821',
          },
          {
            texto: '001',
          },
          {
            texto: 'A.H. CUATRO',
          },
          {
            texto: '1',
          },
          {
            texto: '26,320.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '26,320.00',
          },
          {
            texto: '52.80',
          },
          {
            texto: '35.58',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '60.00',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: '0000005579',
          },
          {
            texto: '001',
          },
          {
            texto: 'A.H. CUATRO',
          },
          {
            texto: '1',
          },
          {
            texto: '24,219.20',
          },
          {
            texto: '0.00',
          },
          {
            texto: '24,219.20',
          },
          {
            texto: '48.40',
          },
          {
            texto: '35.58',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '60.00',
          },
        ],
      ],
      conteo: '3 ejercicios',
    },
  },
  consulta_resumen_predial: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000003542',
      uso: 'Todos',
      totalDeudaPredialInsolutoS: '319.32',
      reajusteS: '0.00',
      interesS: '0.00',
      gastoS: '141.50',
      totalS: '460.82',
      ejercicio: '2026',
      valuoAfectoS: '15,821.60',
      limpiezaPublicaS: '84.78',
      parquesYJardinesS: '25.20',
      serenazgoS: '37.08',
      rellenoSanitarioS: '0.00',
      tipoDeMovimiento: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: '200601005670320A01...',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'A.H. CUATRO DE NOVIEMBRE — SANTO TORIBIO 17',
          },
        ],
      ],
      conteo: '1 predio',
    },
  },
  consulta_altas_bajas: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeConsulta: 'TRIBUTARIA',
      codigoCont: '00000003542',
      altaBaja: '(TODAS)',
      autoManual: '(TODAS)',
      observacion:
        'BAJA AUTOMÁTICA: POR NO CORRESPONDER DEUDA, DEUDA HA SIDO CANCELADA — PARQUES Y JARDINES — UNIDAD: 20',
      tributo: '(TODOS)',
      tipoAB: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: '000000694727',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'ALTA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694726',
          },
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'BAJA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694725',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'ALTA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694724',
          },
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'BAJA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694723',
          },
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'BAJA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694722',
          },
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'BAJA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694721',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'ALTA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694720',
          },
          {
            texto: 'B',
            tono: 'bad',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'BAJA AUTOMÁTICA',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: '15/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '000000694719',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: 'A',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'ALTA AUTOMÁTICA: REC 01 — TRIBUTARIA',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
      ],
      conteo: '9 de 17 movimientos',
    },
  },
  consulta_deudas_beneficio: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDePapeleta: 'TRIBUTARIA',
      contribuyente: '00000003542',
      formaDePago: 'CONTADO TOTAL',
      benefAplicable: 'CONTADO TRIBUTARIO PERM',
      contribuyente2: 'SANTIAGO MOSCOL-GASPAR',
      domicilioFiscal: 'A.H. CUATRO DE NOVIEMBRE — CA. SANTO TORIBIO 17',
      fechaDeConsulta: '2026-08-13',
      tributo: '(TODOS)',
      deudaTotalS: '1,848.66',
      deudaAcogidaS: '797.77',
      deudaConBeneficioS: '250.15',
      tasaAplicada: '68.64',
      beneficioS: '547.62',
      registrosAcogidos: '36 de 128',
      impresion: 'BENEFICIO',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2019',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.00',
          },
          {
            texto: '36.85',
          },
          {
            texto: '7.80',
          },
          {
            texto: '48.87',
          },
        ],
        [
          {
            texto: '2019',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '002',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.08',
          },
          {
            texto: '35.04',
          },
          {
            texto: '0.00',
          },
          {
            texto: '39.34',
          },
        ],
        [
          {
            texto: '2019',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '003',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.15',
          },
          {
            texto: '33.19',
          },
          {
            texto: '0.00',
          },
          {
            texto: '37.56',
          },
        ],
        [
          {
            texto: '2019',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '004',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.21',
          },
          {
            texto: '0.17',
          },
          {
            texto: '31.04',
          },
          {
            texto: '0.00',
          },
          {
            texto: '35.42',
          },
        ],
        [
          {
            texto: '2020',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.00',
          },
          {
            texto: '28.17',
          },
          {
            texto: '8.40',
          },
          {
            texto: '40.79',
          },
        ],
        [
          {
            texto: '2020',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '002',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.06',
          },
          {
            texto: '26.63',
          },
          {
            texto: '0.00',
          },
          {
            texto: '30.91',
          },
        ],
        [
          {
            texto: '2020',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '003',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.22',
          },
          {
            texto: '0.09',
          },
          {
            texto: '25.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '29.31',
          },
        ],
        [
          {
            texto: '2020',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '004',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.21',
          },
          {
            texto: '0.16',
          },
          {
            texto: '23.43',
          },
          {
            texto: '0.00',
          },
          {
            texto: '27.80',
          },
        ],
        [
          {
            texto: '2021',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.36',
          },
          {
            texto: '0.00',
          },
          {
            texto: '22.04',
          },
          {
            texto: '8.70',
          },
          {
            texto: '35.10',
          },
        ],
        [
          {
            texto: '2021',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '002',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.36',
          },
          {
            texto: '0.04',
          },
          {
            texto: '20.71',
          },
          {
            texto: '0.00',
          },
          {
            texto: '25.11',
          },
        ],
        [
          {
            texto: '2021',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '003',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.36',
          },
          {
            texto: '0.08',
          },
          {
            texto: '19.33',
          },
          {
            texto: '0.00',
          },
          {
            texto: '23.77',
          },
        ],
        [
          {
            texto: '2022',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '001',
          },
          {
            texto: '00001',
          },
          {
            texto: 'PREDIAL-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '4.50',
          },
          {
            texto: '0.00',
          },
          {
            texto: '17.09',
          },
          {
            texto: '9.00',
          },
          {
            texto: '30.59',
          },
        ],
      ],
      conteo: '12 de 128 · acogidas 36',
    },
  },
  consulta_pagos: {
    fechaCalculo: '2026-08-13',
    campos: {
      codContribuyente: '00000003541',
      desde: '2026-01-01',
      hasta: '2026-08-13',
      medioDePago: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '12/08/2026',
          },
          {
            texto: '0003-0041182',
          },
          {
            texto: 'Impuesto predial cuotas 1 y 2',
          },
          {
            texto: '2026',
          },
          {
            texto: 'EFECTIVO',
          },
          {
            texto: 'C-3',
          },
          {
            texto: '301.80',
          },
        ],
        [
          {
            texto: '28/02/2026',
          },
          {
            texto: '0001-0038114',
          },
          {
            texto: 'Impuesto predial cuota 1',
          },
          {
            texto: '2026',
          },
          {
            texto: 'PAGO EN LÍNEA',
          },
          {
            texto: 'WEB',
          },
          {
            texto: '147.98',
          },
        ],
        [
          {
            texto: '14/12/2025',
          },
          {
            texto: '0002-0034477',
          },
          {
            texto: 'Arbitrios 2025',
          },
          {
            texto: '2025',
          },
          {
            texto: 'TARJETA',
          },
          {
            texto: 'C-2',
          },
          {
            texto: '412.00',
          },
        ],
        [
          {
            texto: '30/08/2025',
          },
          {
            texto: '0003-0031208',
          },
          {
            texto: 'Impuesto predial cuota 3',
          },
          {
            texto: '2025',
          },
          {
            texto: 'EFECTIVO',
          },
          {
            texto: 'C-3',
          },
          {
            texto: '377.00',
          },
        ],
      ],
      conteo: '4 pagos · S/ 1,238.78',
    },
  },
  consulta_predios: {
    fechaCalculo: '2026-08-13',
    tabla: {
      filas: [
        [
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: 'CALLE SANTA ROSA 116',
          },
          {
            texto: 'Casa habitación',
          },
          {
            texto: '210.00',
          },
          {
            texto: '164.50',
          },
          {
            texto: '132,196.75',
          },
          {
            texto: '1,842.60',
          },
        ],
        [
          {
            texto: '02-014-D-14-02',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: 'CALLE SANTA ROSA 118',
          },
          {
            texto: 'Comercio',
          },
          {
            texto: '120.00',
          },
          {
            texto: '96.00',
          },
          {
            texto: '88,412.00',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: '04-021-B-07-00',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'MZ. B LT. 7 — BELLAVISTA',
          },
          {
            texto: 'Terreno sin construir',
          },
          {
            texto: '184.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: '38,420.00',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: '03-088-A-01-00',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'CARRETERA SULLANA-PAITA KM 2',
          },
          {
            texto: 'Industria',
          },
          {
            texto: '1,840.00',
          },
          {
            texto: '640.00',
          },
          {
            texto: '842,000.00',
          },
          {
            texto: '18,412.00',
          },
        ],
      ],
      conteo: '4 de 78,204',
    },
  },
  consulta_vehiculos: {
    fechaCalculo: '2026-08-13',
    campos: {
      estado: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'T2G-418',
          },
          {
            texto: 'AUTOMÓVIL',
          },
          {
            texto: 'TOYOTA YARIS GLI',
          },
          {
            texto: '2018',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '2019 — 2021',
          },
          {
            texto: '61,400.00',
          },
          {
            texto: '940.64',
          },
        ],
        [
          {
            texto: 'V1H-882',
          },
          {
            texto: 'CAMIONETA',
          },
          {
            texto: 'HYUNDAI TUCSON',
          },
          {
            texto: '2024',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '2025 — 2027',
          },
          {
            texto: '112,800.00',
          },
          {
            texto: '1,128.00',
          },
        ],
        [
          {
            texto: 'B7T-221',
          },
          {
            texto: 'AUTOMÓVIL',
          },
          {
            texto: 'KIA RIO',
          },
          {
            texto: '2020',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: '2021 — 2023',
          },
          {
            texto: '62,400.00',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: 'T4M-119',
          },
          {
            texto: 'CAMIÓN',
          },
          {
            texto: 'HYUNDAI HD-78',
          },
          {
            texto: '2022',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: '2023 — 2025',
          },
          {
            texto: '84,000.00',
          },
          {
            texto: '840.00',
          },
        ],
      ],
      conteo: '4 de 3,204',
    },
  },
  consulta_valores: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipo: 'Todos',
      estado: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'OP-2026-004182',
          },
          {
            texto: 'ORDEN DE PAGO',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '2025 — cuota 3',
          },
          {
            texto: '195.98',
          },
          {
            texto: '18/07/2026',
          },
          {
            texto: 'Firme',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'RD-2026-000418',
          },
          {
            texto: 'RES. DETERMINACIÓN',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '2021 — 2026',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'Reclamado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'RM-2026-000912',
          },
          {
            texto: 'RES. DE MULTA',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'MULTA ADMINISTRATIVA',
          },
          {
            texto: '2026',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: 'Pendiente',
          },
          {
            texto: 'Emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'OP-2026-004044',
          },
          {
            texto: 'ORDEN DE PAGO',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: '2024',
          },
          {
            texto: '940.64',
          },
          {
            texto: '11/06/2026',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 1,284',
    },
  },
  constancia: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'CNA-2026-01184',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Contribuyente',
          v: 'CASTILLO PASCUALA, MARÍA ELENA',
        },
        {
          k: 'Documento',
          v: 'DNI 44218937',
        },
        {
          k: 'Código',
          v: '00000003541',
        },
        {
          k: 'Predio',
          v: '02-014-D-14-01',
        },
        {
          k: 'Ejercicios verificados',
          v: '2022 — 2026',
        },
        {
          k: 'Vigencia',
          v: '30 días calendario',
        },
      ],
      filas: [
        ['Impuesto predial', '2022 — 2026', 'Cancelado', '0.00'],
        ['Arbitrios municipales', '2022 — 2026', 'Cancelado', '0.00'],
        ['Patrimonio vehicular', '2019 — 2021', 'Cancelado', '0.00'],
        ['Multas administrativas', '2022 — 2026', 'Sin registros', '0.00'],
      ],
      footer:
        'Se deja constancia de que el contribuyente identificado no registra deuda pendiente por los tributos y ejercicios señalados a la fecha de emisión. El presente documento pierde validez si con posterioridad se detecta deuda omitida producto de un procedimiento de fiscalización.',
    },
  },
  valores_individual: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeValor: 'ORDEN DE PAGO',
      nroDeValor: 'OP-2026-004182',
      fechaDeEmision: '2026-07-10',
      codContribuyente: '00000003541',
      nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
      baseLegal: 'ART. 78º NUM. 1 DEL CÓDIGO TRIBUTARIO',
      tributo: 'IMPUESTO PREDIAL',
      unidadPredioPlaca: '02-014-D-14-01',
      periodo: '2025 — cuota 3',
      insolutoS: '144.20',
      reajusteS: '8.60',
      interesMoratorioS: '31.18',
      gastosS: '12.00',
      totalDelValorS: '195.98',
      plazoParaReclamar: '20 días hábiles',
    },
    totales: [
      {
        label: 'Insoluto',
        value: 'S/ 144.20',
      },
      {
        label: 'Reajuste',
        value: 'S/ 8.60',
      },
      {
        label: 'Interés',
        value: 'S/ 31.18',
      },
      {
        label: 'Total del valor',
        value: 'S/ 195.98',
      },
    ],
  },
  valores_masivo: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeValor: 'ORDEN DE PAGO',
      ejercicioDesde: '2023',
      ejercicioHasta: '2025',
      tributo: 'TODOS',
      sector: 'Todos',
      montoMinimoDeEmisionS: '50.00',
      excluyeContribuyentesConConvenio: true,
      excluyeDeudaReclamada: true,
      fechaDeEmision: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '2023 — 2025',
          },
          {
            texto: '2,184',
          },
          {
            texto: '2,412',
          },
          {
            texto: '1,412,880.00',
          },
          {
            texto: '284,120.40',
          },
          {
            texto: '1,697,000.40',
          },
        ],
        [
          {
            texto: 'ARBITRIOS MUNICIPALES',
          },
          {
            texto: '2023 — 2025',
          },
          {
            texto: '1,418',
          },
          {
            texto: '1,418',
          },
          {
            texto: '1,120,400.00',
          },
          {
            texto: '241,882.20',
          },
          {
            texto: '1,362,282.20',
          },
        ],
        [
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: '2023 — 2025',
          },
          {
            texto: '352',
          },
          {
            texto: '352',
          },
          {
            texto: '648,000.00',
          },
          {
            texto: '132,884.60',
          },
          {
            texto: '780,884.60',
          },
        ],
      ],
      conteo: '4,182 valores · S/ 3.84 M',
    },
  },
  valores_busqueda: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipo: 'Todos',
      ejercicio: '2026',
      estado: 'Todos',
      motivoDeAnulacion: '—',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'OP-2026-004182',
          },
          {
            texto: 'ORDEN DE PAGO',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '2025 — cuota 3',
          },
          {
            texto: '195.98',
          },
          {
            texto: '18/07/2026',
          },
          {
            texto: 'Firme',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'RD-2026-000418',
          },
          {
            texto: 'RES. DETERMINACIÓN',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'IMPUESTO PREDIAL',
          },
          {
            texto: '2021 — 2026',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '02/08/2026',
          },
          {
            texto: 'Reclamado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'RM-2026-000912',
          },
          {
            texto: 'RES. DE MULTA',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'MULTA ADMINISTRATIVA',
          },
          {
            texto: '2026',
          },
          {
            texto: '2,675.00',
          },
          {
            texto: 'Pendiente',
          },
          {
            texto: 'Emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'OP-2026-004044',
          },
          {
            texto: 'ORDEN DE PAGO',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'PATRIMONIO VEHICULAR',
          },
          {
            texto: '2024',
          },
          {
            texto: '940.64',
          },
          {
            texto: '11/06/2026',
          },
          {
            texto: 'Coactiva',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 1,284',
    },
  },
  notificacion_valores: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroDeValor: 'OP-2026-004182',
      notificador: 'Todos',
      resultado: 'Todos',
      nroDeValor2: 'OP-2026-004182',
      contribuyente: 'CASTILLO PASCUALA, MARÍA ELENA',
      domicilioFiscal: 'CALLE LAMA 482 — ZONA 2 INDUSTRIAL',
      tipoDeNotificacion: 'PERSONAL EN DOMICILIO FISCAL',
      fechaDeNotificacion: '2026-07-18',
      hora: '11:40',
      notificador2: 'J. RUIZ PALACIOS',
      resultado2: 'RECIBIDO POR EL TITULAR',
      personaQueRecibe: 'CASTILLO PASCUALA, MARÍA E.',
      documentoDeQuienRecibe: '44218937',
      vinculo: 'TITULAR',
      fechaDeFirmeza: '15/08/2026',
    },
  },
  prescripcion: {
    fechaCalculo: '2026-08-13',
    campos: {
      nDeExpediente: '2026-1204',
      codContribuyente: '00000006550',
      nombre: 'DÍAZ MADRID, JULIO CÉSAR',
      tributo: 'IMPUESTO PREDIAL',
      ejerciciosSolicitados: '2014 — 2018',
      fechaDePresentacion: '2026-08-04',
      plazoAplicable: '4 AÑOS — DECLARACIÓN PRESENTADA',
      inicioDelComputo: '01/01/2015',
      actoDeInterrupcion: 'NOTIFICACIÓN DE ORDEN DE PAGO',
      fechaDelUltimoActo: '2019-05-12',
      nuevoInicioDelComputo: '13/05/2019',
      fechaDePrescripcion: '13/05/2023',
      resultado: 'PROCEDE',
      nDeResolucion: 'RGAT-0244-2026-MPS',
      montoAExtinguirS: '4,412.80',
    },
  },
  pase_coactiva: {
    fechaCalculo: '2026-08-13',
    campos: {
      contrib: '00000329592',
      tipoDeValor: 'Todos',
      tipoMov: 'Todos',
      emitidoDesde: '2026-07-22',
      emitidoHasta: '2026-08-13',
      tipoDeOperacion: 'INDIVIDUAL',
      numRecaudo: '0000000003',
      anoDeuda: '1996',
      fechaDeEmision: '1997-03-31',
      tipoDeRecaudo: '081 — RM LICENCIA FUNCIONAMIENTO',
      contribuyente: '00000329592 — MOLINO SULLANA — LICENCIA',
      nroMov: '1',
      fechaDelMovimiento: '1997-05-19',
      tipoDeMovimiento: 'PCO — PASE A COACTIVAS',
      observacion: 'PASE A COACTIVAS',
    },
    tabla: {
      filas: [
        [
          {
            texto: '0000000002',
          },
          {
            texto: '2026',
          },
          {
            texto: 'RDP',
          },
          {
            texto: '00000009723',
          },
          {
            texto: 'GARCÍA VALDIVIEZO-HILDEFREDO',
          },
          {
            texto: '2021',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000000003',
          },
          {
            texto: '1997',
          },
          {
            texto: 'RMLF',
          },
          {
            texto: '00000329592',
          },
          {
            texto: 'MOLINO SULLANA — LICENCIA',
          },
          {
            texto: '1996',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'S',
          },
          {
            texto: '1',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000000003',
          },
          {
            texto: '2024',
          },
          {
            texto: 'REC',
          },
          {
            texto: '00000002368',
          },
          {
            texto: 'SUC. ALBERTO PANTA GONZALES',
          },
          {
            texto: '2021',
          },
          {
            texto: '—',
          },
          {
            texto: 'S',
          },
          {
            texto: '—',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000000003',
          },
          {
            texto: '2026',
          },
          {
            texto: 'REC',
          },
          {
            texto: '00000072348',
          },
          {
            texto: 'MADERERA ROLANDO CISNEROS GONZA...',
          },
          {
            texto: '2023',
          },
          {
            texto: '—',
          },
          {
            texto: 'S',
          },
          {
            texto: '—',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
      ],
      conteo: '4 valores',
    },
  },
  coactiva_expedientes: {
    fechaCalculo: '2026-08-13',
    campos: {
      ejecutor: 'R. MENDOZA CRUZ',
      estado: 'Todos',
      nroDeExpediente2: 'EC-2026-00421',
      nroDeRec: 'REC-0421-2026-MPS-EC',
      fechaDeInicio: '2026-08-04',
      ejecutorCoactivo: 'R. MENDOZA CRUZ',
      auxiliarCoactivo: 'S. PALACIOS NIMA',
      codContribuyente2: '00000003541',
      valoresAcumulados: '1',
      plazoParaPagoVoluntario: '7 días hábiles',
      fechaDeNotificacionDeLaRec: '2026-08-06',
      tipoDeMedida: 'EMBARGO EN FORMA DE RETENCIÓN',
      nDeResolucionCoactiva: 'RC-02-0421-2026',
      entidadTerceroRetenedor: 'BANCO DE LA NACIÓN',
      bienOCuentaAfectada: 'CTA. AHORROS 00-412-118442',
      montoDeLaMedidaS: '1,036.64',
      fechaDeLaMedida: '2026-08-11',
      resultado: 'EN TRÁMITE',
      deudaMateriaDeCobranzaS: '940.64',
      costasProcesales10: '94.06',
      gastosDeNotificacionS: '12.00',
      gastosDeMedidaCautelarS: '38.00',
      gastosDeTasacionS: '0.00',
      gastosDeRemateS: '0.00',
      totalCostasYGastosS: '144.06',
      causal: 'NINGUNA',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'EC-2026-00412',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: '3',
          },
          {
            texto: '9,412.15',
          },
          {
            texto: '941.20',
          },
          {
            texto: 'Embargo en forma de retención',
          },
          {
            texto: 'Con medida',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'EC-2026-00418',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: '1',
          },
          {
            texto: '18,412.00',
          },
          {
            texto: '1,841.20',
          },
          {
            texto: 'Embargo en forma de inscripción',
          },
          {
            texto: 'Con medida',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'EC-2026-00421',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '1',
          },
          {
            texto: '940.64',
          },
          {
            texto: '96.00',
          },
          {
            texto: 'Ninguna',
          },
          {
            texto: 'Iniciado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'EC-2025-00988',
          },
          {
            texto: 'REYES CHUNGA, PEDRO',
          },
          {
            texto: '2',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.00',
          },
          {
            texto: 'Levantada',
          },
          {
            texto: 'Concluido',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 de 318',
    },
    totales: [
      {
        label: 'Deuda en coactiva',
        value: 'S/ 940.64',
      },
      {
        label: 'Costas y gastos',
        value: 'S/ 144.06',
      },
      {
        label: 'Retenido',
        value: 'S/ 0.00',
      },
      {
        label: 'Total exigible',
        value: 'S/ 1,084.70',
      },
    ],
  },
  importacion_valores: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeDeuda: 'TRIBUTARIA',
      contribuyente: '00000031704',
      filtro: 'TODOS',
      ano: '2026',
      auxiliar: 'GARCÍA NAVARRO-MARTHA ELENA',
      ejecutor: 'CHECA FERNÁNDEZ-HILTON ARTURO',
      numRecaudo: '0000000726',
      tipoDeRecaudo: 'OP — ORDEN DE PAGO',
      anoDeuda: '2026',
      totalRecaudoS: '44.61',
      tributo: '(TODOS)',
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000000726',
          },
          {
            texto: 'ORDEN DE PAGO — PREDIAL',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '44.61',
          },
          {
            texto: '00000031704',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000000727',
          },
          {
            texto: 'ORDEN DE PAGO — PREDIAL',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '40.62',
          },
          {
            texto: '00000031704',
          },
        ],
        [
          {
            texto: '—',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000000728',
          },
          {
            texto: 'ORDEN DE PAGO — PREDIAL',
          },
          {
            texto: '—',
          },
          {
            texto: '—',
          },
          {
            texto: '29.88',
          },
          {
            texto: '00000031704',
          },
        ],
      ],
      conteo: '3 valores · S/ 115.11',
    },
  },
  proceso_coactivo: {
    fechaCalculo: '2026-08-13',
    campos: {
      contribuyente: '00000003542',
      estado: 'Todos',
      numero: '0000001201',
      ano: '2022',
      expAnterior: '701.08T1',
      asunto: '.',
      observaciones: '.',
      fechaDeCreacion: '2022-10-01',
      auxiliar: 'NO ESPECIFICADO',
      ejecutor: 'NO ESPECIFICADO',
      insolutoS: '186.48',
      reajusteS: '0.00',
      interesS: '0.00',
      gastosS: '92.55',
      totalS: '279.03',
      proyectadaAl: '2026-08-13',
      tipoDeMedida: 'EMBARGO EN FORMA DE RETENCIÓN',
      fechaDeEmision: '2026-08-13',
      montoDelEmbargoS: '500.00',
      montoRetenidoS: '0.00',
      nroDeValor: '0000000726',
      tipoDeValor: 'ORDEN DE PAGO — PREDIAL',
      anoDeuda: '2021',
      montoS: '44.61',
    },
    tabla: {
      filas: [
        [
          {
            texto: '0000001201',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: '.',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
          {
            texto: '003',
          },
          {
            texto: '701.08T1',
          },
        ],
        [
          {
            texto: '0000000907',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'IMPORTACIÓN FISCA',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
          {
            texto: '003',
          },
          {
            texto: '—',
          },
        ],
      ],
      conteo: '2 expedientes',
    },
  },
  rec_impresion: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeDeuda: 'TRIBUTARIA',
      contribuyente: '00000003542',
      ano: '(Todos)',
      proyectarInteresAl: '2026-08-13',
      numero: '0000001201',
      ano2: '2022',
      asunto: '.',
      observaciones: '.',
      estado: 'REC 01 EMITIDO',
      fechaDelEstado: '11/10/2026',
      documentoDeRespaldo: '—',
      proyectarInteresAl2: '2026-08-13',
      insolutoS: '186.48',
      interesS: '0.00',
      gastosYCostasS: '92.55',
      totalS: '279.03',
    },
    tabla: {
      filas: [
        [
          {
            texto: '✓',
          },
          {
            texto: '0000001201',
          },
          {
            texto: '2022',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
          {
            texto: '—',
          },
        ],
        [
          {
            texto: '✓',
          },
          {
            texto: '0000000907',
          },
          {
            texto: '2026',
          },
          {
            texto: '00000003542',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
          {
            texto: 'IMPORTACIÓN FISCA',
          },
        ],
      ],
      conteo: '2 expedientes seleccionados',
    },
  },
  expediente_historial: {
    fechaCalculo: '2026-08-13',
    campos: {
      contribuyente: '00000031704',
      estadoActual: 'Todos',
      ano: '2026',
      fecDoc: '11/10/2026',
      numDoc: '—',
      motivo: '—',
      estado: 'REC 01 EMITIDO',
      activo: 'Sí',
      observaciones: '—',
      nExpedienteAno: '2026',
      nExpedienteNumero: '0000000906',
      nuevoEstado: '011 — REC 01 EMITIDO',
      activo2: true,
      documentoDeRespaldoFecha: '2026-10-11',
    },
    tabla: {
      filas: [
        [
          {
            texto: '0000000906',
          },
          {
            texto: '2026',
          },
          {
            texto: '00000031704',
          },
          {
            texto: 'GONZALES ÁVILA-PASCUAL / ESPINOZA ACHA-ZOILA IVONNE',
          },
          {
            texto: '—',
          },
        ],
      ],
      conteo: '1 expediente',
    },
  },
  cambiar_direccion_ref: {
    fechaCalculo: '2026-08-13',
    campos: {
      contribuyente: '00000003542',
      domicilioFiscal: 'A.H. CUATRO DE NOVIEMBRE — CA. SANTO TORIBIO 17',
    },
  },
  costas_procesales: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroLiquidacion: '1000000004',
      estado: 'Todos',
      nroLiquidacion2: '1000000004',
      fecha: '2026-06-14',
      nroExpedCoact2: '0000001096',
      contribuyente2: '00000019535 — CALDERÓN ESLAVA-JUAN ALBERTO',
      domicilioFiscal: 'UNIÓN 273',
      observaciones: 'REC (01) NOTIFICADA EL 21/05/26.-',
      tributo: '00101 — COSTAS PROCESALES',
      descripcion: 'AUTO DE EJECUCIÓN COACTIVA',
      montoS: '17.75',
      totalS: '17.75',
    },
    tabla: {
      filas: [
        [
          {
            texto: '1000000001',
          },
          {
            texto: '00000015342',
          },
          {
            texto: '28/05/2026',
          },
          {
            texto: '0000000538',
          },
          {
            texto: 'CASA 2 PISOS',
          },
          {
            texto: 'A',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '1000000004',
          },
          {
            texto: '00000019535',
          },
          {
            texto: '14/06/2026',
          },
          {
            texto: '0000001096',
          },
          {
            texto: 'REC (01) NOTIFICADA EL 21/05/26',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '1000000005',
          },
          {
            texto: '00000035180',
          },
          {
            texto: '15/06/2026',
          },
          {
            texto: '0000004841',
          },
          {
            texto: 'REC (01), NOTIFICADA EL 02/06/26',
          },
          {
            texto: 'N',
            tono: 'warn',
          },
        ],
      ],
      conteo: '3 de 17 registros',
    },
  },
  fraccionamiento_coactivo: {
    fechaCalculo: '2026-08-13',
    campos: {
      formaDePago: 'CONVENIO TRIBUTARIO PERMA',
      benefAplicable: 'CONVENIO PERMANENTE',
      contribuyente: '00000003542',
      coact: 'SÍ',
      nombre: 'SANTIAGO MOSCOL-GASPAR',
      domicilioFiscal: 'A.H. CUATRO DE NOVIEMBRE — CA. SANTO TORIBIO 17',
      tributo: '(TODOS)',
      deudaTotalS: '1,848.66',
      deudaAcogidaS: '1,848.66',
      deudaConBeneficioS: '1,845.51',
      registros: '128 de 128',
      tasa: '0.17',
      beneficioS: '3.15',
      pagoInicialS: '200.00',
      nDeCuotas: '12',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '001',
          },
          {
            texto: '00008',
          },
          {
            texto: 'JARDINES-REG',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2.10',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.51',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2.61',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '001',
          },
          {
            texto: '00026',
          },
          {
            texto: 'SERENAZGO-RE',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '3.09',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.75',
          },
          {
            texto: '0.00',
          },
          {
            texto: '3.84',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '002',
          },
          {
            texto: '00007',
          },
          {
            texto: 'LIMPIEZA-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '7.07',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.71',
          },
          {
            texto: '0.00',
          },
          {
            texto: '8.78',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '002',
          },
          {
            texto: '00008',
          },
          {
            texto: 'JARDINES-REG',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2.10',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.51',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2.61',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '002',
          },
          {
            texto: '00026',
          },
          {
            texto: 'SERENAZGO-RE',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '3.09',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.75',
          },
          {
            texto: '0.00',
          },
          {
            texto: '3.84',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '003',
          },
          {
            texto: '00007',
          },
          {
            texto: 'LIMPIEZA-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '7.07',
          },
          {
            texto: '0.00',
          },
          {
            texto: '1.71',
          },
          {
            texto: '0.00',
          },
          {
            texto: '8.78',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '003',
          },
          {
            texto: '00008',
          },
          {
            texto: 'JARDINES-REG',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2.10',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.51',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2.61',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '003',
          },
          {
            texto: '00026',
          },
          {
            texto: 'SERENAZGO-RE',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '3.09',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.75',
          },
          {
            texto: '0.00',
          },
          {
            texto: '3.84',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '004',
          },
          {
            texto: '00007',
          },
          {
            texto: 'LIMPIEZA-REG-E',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '7.07',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.94',
          },
          {
            texto: '0.00',
          },
          {
            texto: '8.01',
          },
        ],
        [
          {
            texto: '2026',
          },
          {
            texto: '200601005670320A010100',
          },
          {
            texto: '004',
          },
          {
            texto: '00008',
          },
          {
            texto: 'JARDINES-REG',
          },
          {
            texto: '014',
          },
          {
            texto: '081',
          },
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2.10',
          },
          {
            texto: '0.00',
          },
          {
            texto: '0.28',
          },
          {
            texto: '0.00',
          },
          {
            texto: '2.38',
          },
        ],
      ],
      conteo: '10 de 128 registros',
    },
  },
  actos_coactivos: {
    fechaCalculo: '2026-08-13',
    campos: {
      expAno: '2026',
      expNumero: '0000005687',
      tributo: '(TODOS)',
      expedienteAno: '2026',
      expedienteNumero: '0000005687',
      obligado: '00000003035 — INFANTE CÁRCELEN RAÚL',
      domicilio: 'CENTRO DE SULLANA — AV. DE LAMA, JOSÉ 587',
      dNI: '02867895',
      referencia: 'PRUEBA',
      tributo2: 'PREDIAL, SERENAZGO',
      periodo: '2026',
      deudaS: '344.68',
      embargoN: '500',
      fechaEmb: '2026-03-10',
      montoEmbS: '500.00',
      domicEmb: 'CENTRO DE SULLANA — AV. DE LAMA, JOSÉ 587',
      montoRetenidoS: '0.00',
      documento: 'RESOLUCIÓN COACTIVA',
      fecDoc: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2025 3852',
          },
          {
            texto: '00000004491',
          },
          {
            texto: 'SUC. TOMÁS MAZA GÓMEZ',
          },
          {
            texto: '333.58',
          },
          {
            texto: '—',
          },
          {
            texto: 'PREDIAL',
          },
        ],
        [
          {
            texto: '2026 5687',
          },
          {
            texto: '00000003035',
          },
          {
            texto: 'INFANTE CÁRCELEN RAÚL',
          },
          {
            texto: '344.68',
          },
          {
            texto: 'PRUEBA',
          },
          {
            texto: 'PREDIAL, SERENAZGO',
          },
        ],
        [
          {
            texto: '2026 5687',
          },
          {
            texto: '00000003035',
          },
          {
            texto: 'INFANTE CÁRCELEN RAÚL',
          },
          {
            texto: '344.68',
          },
          {
            texto: 'ACTO DE PRUEBA',
          },
          {
            texto: 'PREDIAL, SERENAZGO',
          },
        ],
      ],
      conteo: '3 actos',
    },
  },
  notificaciones_coactivas: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeValor: 'RES. EJE. COACTIVA - 004',
      nroVisita: '1',
      fecha: '2026-08-13',
      vence: '2026-08-20',
      recibidoPor: 'CONTRIBUYENTE',
      tipoDeNotificacion: 'NOTIFICACIÓN CON ÉXITO',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'DE RET',
          },
          {
            texto: '00000015099',
          },
          {
            texto: 'ENCALADA VERA-LIDIO ALBERTO',
          },
          {
            texto: 'REC',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000003985',
          },
          {
            texto: '19/01/2026',
          },
          {
            texto: 'RES. EJE. COACTIVA',
          },
          {
            texto: '0000004505',
          },
        ],
        [
          {
            texto: 'DE RET',
          },
          {
            texto: '00000327930',
          },
          {
            texto: 'LEIGH ARBULÚ CARLOS',
          },
          {
            texto: 'REC',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000001404',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'RES. EJE. COACTIVA',
          },
          {
            texto: '0000007669',
          },
        ],
        [
          {
            texto: 'DE RET',
          },
          {
            texto: '00000009757',
          },
          {
            texto: 'AGROINDUSTRIAL S.R.L.',
          },
          {
            texto: 'REC',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000001403',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'RES. EJE. COACTIVA',
          },
          {
            texto: '0000000518',
          },
        ],
        [
          {
            texto: 'DE RET',
          },
          {
            texto: '00000005598',
          },
          {
            texto: 'LÓPEZ GARCÍA-ARNALDO',
          },
          {
            texto: 'REC',
          },
          {
            texto: '2026',
          },
          {
            texto: '0000001402',
          },
          {
            texto: '13/08/2026',
          },
          {
            texto: 'RES. EJE. COACTIVA',
          },
          {
            texto: '0000004416',
          },
        ],
      ],
      conteo: '4 valores',
    },
  },
  coactiva_consulta_deudas: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeDeuda: 'TRIBUTARIA',
      estado: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: '0000001201',
          },
          {
            texto: '2026',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'PREDIAL, SERENAZGO',
          },
          {
            texto: '279.03',
          },
          {
            texto: '17.75',
          },
          {
            texto: 'REC 01 notificada 21/05/2026',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000000907',
          },
          {
            texto: '2026',
          },
          {
            texto: 'SANTIAGO MOSCOL-GASPAR',
          },
          {
            texto: 'PREDIAL',
          },
          {
            texto: '186.48',
          },
          {
            texto: '17.75',
          },
          {
            texto: 'Importación fiscalización',
          },
          {
            texto: 'REC 01 emitido',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000005687',
          },
          {
            texto: '2026',
          },
          {
            texto: 'INFANTE CÁRCELEN RAÚL',
          },
          {
            texto: 'PREDIAL, SERENAZGO',
          },
          {
            texto: '344.68',
          },
          {
            texto: '35.50',
          },
          {
            texto: 'Embargo Nº 500 — 10/03/2026',
          },
          {
            texto: 'Medida cautelar',
            tono: 'bad',
          },
        ],
        [
          {
            texto: '0000003852',
          },
          {
            texto: '2025',
          },
          {
            texto: 'SUC. TOMÁS MAZA GÓMEZ',
          },
          {
            texto: 'PREDIAL',
          },
          {
            texto: '333.58',
          },
          {
            texto: '17.75',
          },
          {
            texto: 'Notificación de REC',
          },
          {
            texto: 'Notificado',
            tono: 'warn',
          },
        ],
        [
          {
            texto: '0000004841',
          },
          {
            texto: '2025',
          },
          {
            texto: 'CALDERÓN ESLAVA-JUAN ALBERTO',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '1,204.00',
          },
          {
            texto: '17.75',
          },
          {
            texto: 'Convenio coactivo 0000000643',
          },
          {
            texto: 'Fraccionado',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 de 1,842 expedientes',
    },
  },
  coactiva_deudas_beneficio: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipoDeDeuda: 'TRIBUTARIA',
      contribuyente: '00000003542',
      benefAplicable: 'AMNISTÍA COACTIVA 2026',
      fechaDeCalculo: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026-0001201',
          },
          {
            texto: '2021',
          },
          {
            texto: 'PREDIAL',
          },
          {
            texto: '418.00',
          },
          {
            texto: '182.40',
          },
          {
            texto: '17.75',
          },
          {
            texto: '618.15',
          },
          {
            texto: '309.08',
          },
        ],
        [
          {
            texto: '2026-0001248',
          },
          {
            texto: '2022',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '882.00',
          },
          {
            texto: '312.80',
          },
          {
            texto: '17.75',
          },
          {
            texto: '1,212.55',
          },
          {
            texto: '606.28',
          },
        ],
        [
          {
            texto: '2026-0001302',
          },
          {
            texto: '2023',
          },
          {
            texto: 'PREDIAL',
          },
          {
            texto: '1,104.00',
          },
          {
            texto: '284.10',
          },
          {
            texto: '17.75',
          },
          {
            texto: '1,405.85',
          },
          {
            texto: '702.93',
          },
        ],
        [
          {
            texto: '2026-0001344',
          },
          {
            texto: '2024',
          },
          {
            texto: 'VEHICULAR',
          },
          {
            texto: '940.64',
          },
          {
            texto: '188.12',
          },
          {
            texto: '17.75',
          },
          {
            texto: '1,146.51',
          },
          {
            texto: '573.26',
          },
        ],
        [
          {
            texto: '2026-0001388',
          },
          {
            texto: '2025',
          },
          {
            texto: 'ARBITRIOS',
          },
          {
            texto: '1,682.00',
          },
          {
            texto: '324.00',
          },
          {
            texto: '17.75',
          },
          {
            texto: '2,023.75',
          },
          {
            texto: '1,011.88',
          },
        ],
      ],
      conteo: '5 expedientes · S/ 6,412.80',
    },
  },
  anuncios: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroAutorizacion2: '2010 — 000001',
      estado: 'A — ACTIVA',
      fecInicio: '2010-10-19',
      fecVenc: '2011-10-19',
      contribuyente2: '00000025673',
      nombre: 'SUC. RUFINA MEDINA MEDINA',
      dNI2: '03593174',
      codCatastral: '200601001010080A0101001',
      direccion2: 'URB. SANTA ROSA — EL ALTO 116',
      claseAnuncio: 'LETRERO',
      ubicacion: 'LOCALES COMERCIALES',
      tipoAnuncio: 'AVISO SIMPLE',
      forma: 'MONOLITO',
      denominacion: 'VAMOS PERU!!!',
      base: '8.0000',
      altura: '2.0000',
      nroLados: '2',
      area: '32.0000',
      tasa: '0.0000',
      fechaExp: '1900-01-01',
      fechaDeRes: '1900-01-01',
      fechaRec: '1900-01-01',
      importeRec: '0.000',
      motivo: '—',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '2010-000001',
          },
          {
            texto: '—',
          },
          {
            texto: 'SUC. RUFINA MEDINA MEDINA',
          },
          {
            texto: '03593174',
          },
          {
            texto: '—',
          },
          {
            texto: 'URB. SANTA ROSA — EL ALTO 116',
          },
          {
            texto: '0.00',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '2026-000184',
          },
          {
            texto: '2026-0884',
          },
          {
            texto: 'RESTAURANT SABOR Y SAZÓN',
          },
          {
            texto: '44218937',
          },
          {
            texto: '—',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: '288.00',
          },
        ],
        [
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2026-000191',
          },
          {
            texto: '2026-0918',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: '—',
          },
          {
            texto: '20525118447',
          },
          {
            texto: 'CARRETERA SULLANA-PAITA KM 2',
          },
          {
            texto: '2,880.00',
          },
        ],
      ],
      conteo: '3 de 884',
    },
  },
  anuncios_reportes: {
    fechaCalculo: '2026-08-13',
    campos: {
      reporte: 'PADRÓN DE ANUNCIOS Y PROPAGANDAS',
      estado: 'ACTIVA',
      desde: '2026-01-01',
      hasta: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: '001-000418',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: 'LUMINOSO',
          },
          {
            texto: '12.00',
          },
          {
            texto: '840.00',
          },
          {
            texto: '31/12/2026',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '001-000419',
          },
          {
            texto: 'COMERCIAL SULLANA EIRL',
          },
          {
            texto: 'CALLE BOLÍVAR 318',
          },
          {
            texto: 'SIMPLE',
          },
          {
            texto: '4.50',
          },
          {
            texto: '162.00',
          },
          {
            texto: '31/12/2026',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '001-000420',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'CALLE LAMA 482',
          },
          {
            texto: 'TOLDO',
          },
          {
            texto: '6.00',
          },
          {
            texto: '180.00',
          },
          {
            texto: '31/12/2026',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '001-000402',
          },
          {
            texto: 'RESTAURANT EL PARAÍSO',
          },
          {
            texto: 'AV. CHAMPAGNAT 118',
          },
          {
            texto: 'PANEL MONUMENTAL',
          },
          {
            texto: '18.00',
          },
          {
            texto: '660.00',
          },
          {
            texto: '31/12/2025',
          },
          {
            texto: 'Vencida',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 autorizaciones · S/ 1,842.00',
    },
  },
  licencia_funcionamiento: {
    fechaCalculo: '2026-08-13',
    campos: {
      nroLicencia: '2010-000000',
      codigoInterno: '54350',
      proceso: 'REGISTRO SIMPLE DE NUEVA LICENCIA',
      nroLicencia2: '2010-000000',
      estado: 'P — PENDIENTE',
      tipoDeLicencia: 'DEFINITIVA',
      fechaDeEmision: '2026-09-16',
      horarioAutorizado: 'DE 06:00 A 23:00 HORAS',
      codContribuyente: '00000003541',
      nombreRazonSocial: 'CASTILLO PASCUALA, MARÍA ELENA',
      dNI: '44218937',
      denominacionComercial2: 'RESTAURANT SABOR Y SAZÓN',
      actividadPrincipal: 'SERVICIO DE RESTAURANTE',
      ciiu1: 'D-1549-19 — RESTAURANTE-POLLERÍA',
      ciiu2: 'H-5520-02 — SERVICIO DE RESTAURANTES A DOMICILIO',
      ciiu3: 'H-5520-63 — CHIFA AL PASO',
      nDeExpediente: '2010-0281',
      fechaDeExpediente: '2026-09-16',
      importePagadoS: '412.00',
      codigoPredial: '02-014-D-14-01',
      direccionDelEstablecimiento: 'CALLE LAMA 482 — ZONA 2 INDUSTRIAL',
      areaDelEstablecimientoM: '96.00',
      zonificacion: 'CV — COMERCIO VECINAL',
      compatibilidadDeUso: 'COMPATIBLE',
      aforoAutorizado: '48',
      condicionDelLocal: 'ALQUILADO',
      nivelDeRiesgo: 'RIESGO MEDIO',
      momentoDeLaItse: 'POSTERIOR',
      resultado: 'PENDIENTE',
      solicitudDeclaracionJurada: true,
      declaracionJuradaDeItse: true,
      copiaDelContratoDeAlquiler: true,
      usoParaArbitrios: 'COMERCIO',
      zona: 'Zona 2',
      limpiezaPublicaAnualS: '412.80',
      parquesYJardinesAnualS: '96.00',
      serenazgoAnualS: '188.40',
      totalArbitriosAnualS: '697.20',
      estadoDelTramite: 'EN EVALUACIÓN — SUBGERENCIA DE COMERCIALIZACIÓN',
      plazoTupa: '15 días hábiles',
      diasTranscurridos: '4',
      observaciones: 'Falta acreditar el pago del derecho de trámite.',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'P',
            tono: 'warn',
          },
          {
            texto: '2010-000000',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: '2010-0281',
          },
          {
            texto: 'RESTAURANT SABOR Y SAZÓN',
          },
          {
            texto: 'ZONA 2 INDUSTRIAL',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '2010-006549',
          },
          {
            texto: 'QUIROGA RAMOS, ELEODORO',
          },
          {
            texto: '2010-0280',
          },
          {
            texto: 'BODEGA EL SOL',
          },
          {
            texto: 'CENTRO DE SULLANA — DE LAMA',
          },
        ],
        [
          {
            texto: 'A',
            tono: 'ok',
          },
          {
            texto: '2010-006550',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: '2010-0650',
          },
          {
            texto: 'FERRETERÍA DÍAZ',
          },
          {
            texto: 'C.P. BARRIO BUENOS AIRES',
          },
        ],
        [
          {
            texto: 'C',
            tono: 'bad',
          },
          {
            texto: '2010-006551',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: '2010-0621',
          },
          {
            texto: 'DEPÓSITO NOBLECILLA',
          },
          {
            texto: 'C.P. BARRIO BUENOS AIRES',
          },
        ],
      ],
      conteo: '4 de 6,551',
    },
  },
  licencia_padron: {
    fechaCalculo: '2026-08-13',
    campos: {
      ano: '2026',
      criterio: 'GIRO COMERCIAL',
      ordenar: true,
      criterio2: 'NÚMERO DE LICENCIA',
      estado: 'ACTIVA',
      tipoLic: '(TODOS)',
      fecLicDesde: '2026-01-01',
      fecLicHasta: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'LF-2026-00418',
          },
          {
            texto: '12/02/2026',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'BODEGA MARÍA',
          },
          {
            texto: '4711',
          },
          {
            texto: 'Bodega',
          },
          {
            texto: 'CALLE LAMA 482',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LF-2026-00419',
          },
          {
            texto: '18/02/2026',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'RESTAURANT EL NORTE',
          },
          {
            texto: '5610',
          },
          {
            texto: 'Restaurante',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LF-2026-00420',
          },
          {
            texto: '02/03/2026',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'FERRETERÍA EL SOL',
          },
          {
            texto: '4752',
          },
          {
            texto: 'Ferretería',
          },
          {
            texto: 'AV. CHAMPAGNAT 220',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LF-2025-00318',
          },
          {
            texto: '14/07/2025',
          },
          {
            texto: 'COMERCIAL SULLANA EIRL',
          },
          {
            texto: 'BOTICA SALUD',
          },
          {
            texto: '4772',
          },
          {
            texto: 'Farmacia',
          },
          {
            texto: 'CALLE BOLÍVAR 318',
          },
          {
            texto: 'Cancelada',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'LF-2024-00812',
          },
          {
            texto: '20/09/2024',
          },
          {
            texto: 'SUC. RUFINA MEDINA MEDINA',
          },
          {
            texto: 'BODEGA SANTA ROSA',
          },
          {
            texto: '4711',
          },
          {
            texto: 'Bodega',
          },
          {
            texto: 'URB. SANTA ROSA 116',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 de 4,182 licencias',
    },
  },
  licencia_resumen_anual: {
    fechaCalculo: '2026-08-13',
    campos: {
      desdeElAno: '2021',
      hastaElAno: '2026',
      tipoDeLicencia: '(TODOS)',
      agrupadoPor: 'AÑO',
    },
    tabla: {
      filas: [
        [
          {
            texto: '2026',
          },
          {
            texto: '418',
          },
          {
            texto: '42',
          },
          {
            texto: '18',
          },
          {
            texto: '4,182',
          },
          {
            texto: '58,420.00',
          },
        ],
        [
          {
            texto: '2025',
          },
          {
            texto: '512',
          },
          {
            texto: '68',
          },
          {
            texto: '24',
          },
          {
            texto: '3,806',
          },
          {
            texto: '71,680.00',
          },
        ],
        [
          {
            texto: '2024',
          },
          {
            texto: '488',
          },
          {
            texto: '54',
          },
          {
            texto: '21',
          },
          {
            texto: '3,362',
          },
          {
            texto: '68,320.00',
          },
        ],
        [
          {
            texto: '2023',
          },
          {
            texto: '442',
          },
          {
            texto: '61',
          },
          {
            texto: '19',
          },
          {
            texto: '2,928',
          },
          {
            texto: '61,880.00',
          },
        ],
        [
          {
            texto: '2022',
          },
          {
            texto: '396',
          },
          {
            texto: '48',
          },
          {
            texto: '16',
          },
          {
            texto: '2,547',
          },
          {
            texto: '55,440.00',
          },
        ],
        [
          {
            texto: '2021',
          },
          {
            texto: '318',
          },
          {
            texto: '39',
          },
          {
            texto: '12',
          },
          {
            texto: '2,199',
          },
          {
            texto: '44,520.00',
          },
        ],
      ],
      conteo: '2021 — 2026',
    },
  },
  licencia_resolucion_cancelacion: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RC-2026-000118',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '000118-2026-SGCL/MPS',
        },
        {
          k: 'Licencia cancelada',
          v: 'LF-2025-00318',
        },
        {
          k: 'Titular',
          v: 'COMERCIAL SULLANA EIRL',
        },
        {
          k: 'R.U.C.',
          v: '20525118447',
        },
        {
          k: 'Nombre comercial',
          v: 'BOTICA SALUD',
        },
        {
          k: 'Establecimiento',
          v: 'CALLE BOLÍVAR 318 — SULLANA',
        },
      ],
      filas: [
        ['Motivo de la cancelación', 'CESE DE ACTIVIDADES SOLICITADO POR EL TITULAR'],
        ['Fecha de cese declarada', '31/07/2026'],
        ['Expediente', '2026-004182'],
        ['Recibo de trámite', '000000049180 — S/ 36.00'],
        ['Deuda pendiente por licencia', 'S/ 0.00'],
      ],
      footer:
        'Queda sin efecto la licencia municipal de funcionamiento señalada. El titular debe cesar toda actividad comercial en el establecimiento a partir de la fecha de cese declarada.',
    },
  },
  licencia_resolucion_duplicado: {
    fechaCalculo: '2026-08-13',
    reporte: {
      code: 'RD-2026-000042',
      date: '13 de agosto de 2026',
      meta: [
        {
          k: 'Nº de resolución',
          v: '000042-2026-SGCL/MPS',
        },
        {
          k: 'Licencia',
          v: 'LF-2024-00812',
        },
        {
          k: 'Duplicado Nº',
          v: '2',
        },
        {
          k: 'Titular',
          v: 'SUC. RUFINA MEDINA MEDINA',
        },
        {
          k: 'Nombre comercial',
          v: 'BODEGA SANTA ROSA',
        },
        {
          k: 'Establecimiento',
          v: 'URB. SANTA ROSA 116 — SULLANA',
        },
      ],
      filas: [
        ['Motivo', 'PÉRDIDA DEL ORIGINAL — DECLARACIÓN JURADA ADJUNTA'],
        ['Expediente', '2026-004244'],
        ['Recibo de trámite', '000000049211 — S/ 24.00'],
        ['Giro autorizado', '4711 — Bodega'],
        ['Vigencia', 'INDETERMINADA'],
      ],
      footer:
        'El duplicado conserva el número, el giro y la vigencia de la licencia original. Su emisión no implica nueva autorización ni modificación de las condiciones del establecimiento.',
    },
  },
  fue_edificacion: {
    fechaCalculo: '2026-08-13',
    campos: {
      nombreContribuyente: '%%%%',
      tipoTramite: 'Todos',
      nroExpediente2: '00007',
      nroLicenciaAnterior: '2010',
      tipoTramite2: 'LICENCIA DE OBRA',
      obra: 'EDIFICACIÓN NUEVA',
      fechaDeclaracion: '2010-09-14',
      fechaCaducidad: '2015-09-14',
      fechaInicioDeObra: '2010-09-14',
      tipoTramite3: 'LICENCIA DE EDIFICACION NUEVA.',
      modalidadAprobacion: 'A — APROBACION AUTOMATICA',
      revision: 'REVISORES URBANOS',
      solicitante: 'PROPIETARIO',
      codContribuyente: '00000152614',
      nombreRazonSocial: 'OLIVER FABIAN VALDEZ RIOS Y MILENA ALE',
      dNI: '44118207',
      domicilio: 'URB. SANTA ROSA MZ. D LT. 14',
      telefono: '073-502147',
      correoElectronico: 'ovaldez@correo.pe',
      codCatastral: '200601010150010101001',
      direccion: 'URB. SANTA ROSA MZ. D LT. 14',
      mz: 'D',
      lt: '14',
      areaDelTerrenoM: '210.00',
      zonificacion: 'RDM — RESIDENCIAL DENSIDAD MEDIA',
      partidaRegistral: 'P11024478',
      frenteM: '10.50',
      fondoM: '20.00',
      usoDeLaEdificacion: 'VIVIENDA UNIFAMILIAR',
      nDePisos: '3',
      areaTechadaTotalM: '186.00',
      areaLibreM: '84.00',
      nDeEstacionamientos: '1',
      valorDeObraS: '148,200.00',
      tasaDeLicencia: '1.0 %',
      derechoDeLicenciaS: '1,482.00',
      plazoDeEjecucionMeses: '36',
      proyectistaDeArquitectura: 'ARQ. C. ZAPATA RUIZ',
      colegiaturaCap: '18442',
      proyectistaDeEstructuras: 'ING. M. SANDOVAL CRUZ',
      colegiaturaCip: '92118',
      proyectistaDeInstalaciones: 'ING. R. FLORES NIMA',
      responsableDeObra: 'ING. M. SANDOVAL CRUZ',
      fueFirmadoPorElSolicitante: true,
      copiaLiteralDeDominio: true,
      planosDeArquitectura: true,
      planosDeEstructuras: true,
      certificadoDeParametrosUrbanisticos: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: '00007',
          },
          {
            texto: '00000152614',
          },
          {
            texto: 'OLIVER FABIAN VALDEZ RIOS Y MILENA ALE',
          },
          {
            texto: 'LICENCIA DE OBRA',
          },
          {
            texto: '000001',
          },
          {
            texto: 'APROBACIÓN AUTOMÁTICA',
          },
        ],
      ],
      conteo: '1 — Registros Encontrados',
    },
  },
  edificacion_reporte: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-01-01',
      hasta: '2026-08-13',
      modalidad: 'Todas',
      estado: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'LE-2026-00118',
          },
          {
            texto: '2026-001842',
          },
          {
            texto: '18/02/2026',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: 'AV. CHAMPAGNAT 220',
          },
          {
            texto: 'C',
          },
          {
            texto: '842.00',
          },
          {
            texto: '1,284,000.00',
          },
          {
            texto: 'Aprobada',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LE-2026-00119',
          },
          {
            texto: '2026-001918',
          },
          {
            texto: '02/03/2026',
          },
          {
            texto: 'CASTILLO PASCUALA, MARÍA E.',
          },
          {
            texto: 'CALLE LAMA 482',
          },
          {
            texto: 'A',
          },
          {
            texto: '84.50',
          },
          {
            texto: '112,400.00',
          },
          {
            texto: 'Conforme de obra',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'LE-2026-00120',
          },
          {
            texto: '2026-002044',
          },
          {
            texto: '14/04/2026',
          },
          {
            texto: 'DÍAZ MADRID, JULIO CÉSAR',
          },
          {
            texto: 'C.P. BARRIO BUENOS AIRES',
          },
          {
            texto: 'B',
          },
          {
            texto: '164.00',
          },
          {
            texto: '208,800.00',
          },
          {
            texto: 'En trámite',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'LE-2026-00121',
          },
          {
            texto: '2026-002188',
          },
          {
            texto: '28/05/2026',
          },
          {
            texto: 'NOBLECILLA ARISMENDIZ SAC',
          },
          {
            texto: 'AV. JOSÉ DE LAMA 1180',
          },
          {
            texto: 'D',
          },
          {
            texto: '1,412.00',
          },
          {
            texto: '2,840,000.00',
          },
          {
            texto: 'Observada',
            tono: 'warn',
          },
        ],
        [
          {
            texto: 'LE-2026-00122',
          },
          {
            texto: '2026-002302',
          },
          {
            texto: '11/07/2026',
          },
          {
            texto: 'SUC. RUFINA MEDINA MEDINA',
          },
          {
            texto: 'URB. SANTA ROSA 116',
          },
          {
            texto: 'A',
          },
          {
            texto: '48.00',
          },
          {
            texto: '62,800.00',
          },
          {
            texto: 'Aprobada',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 de 218 expedientes',
    },
  },
  ciiu: {
    fechaCalculo: '2026-08-13',
    campos: {
      seccion: 'Todas',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'D-1549-19',
          },
          {
            texto: 'RESTAURANTE-POLLERÍA',
          },
          {
            texto: 'D',
          },
          {
            texto: 'Medio',
            tono: 'warn',
          },
          {
            texto: 'CV, CZ',
          },
          {
            texto: 'No',
          },
        ],
        [
          {
            texto: 'G-5211-01',
          },
          {
            texto: 'VENTA AL POR MENOR EN ALMACENES',
          },
          {
            texto: 'G',
          },
          {
            texto: 'Bajo',
            tono: 'ok',
          },
          {
            texto: 'CV, CZ, RDM',
          },
          {
            texto: 'No',
          },
        ],
        [
          {
            texto: 'G-5234-01',
          },
          {
            texto: 'VENTA DE MATERIALES DE CONSTRUCCIÓN',
          },
          {
            texto: 'G',
          },
          {
            texto: 'Medio',
            tono: 'warn',
          },
          {
            texto: 'CZ, I1',
          },
          {
            texto: 'No',
          },
        ],
        [
          {
            texto: 'H-5520-02',
          },
          {
            texto: 'SERVICIO DE RESTAURANTES A DOMICILIO',
          },
          {
            texto: 'H',
          },
          {
            texto: 'Bajo',
            tono: 'ok',
          },
          {
            texto: 'CV, CZ',
          },
          {
            texto: 'No',
          },
        ],
        [
          {
            texto: 'H-5520-63',
          },
          {
            texto: 'CHIFA AL PASO',
          },
          {
            texto: 'H',
          },
          {
            texto: 'Medio',
            tono: 'warn',
          },
          {
            texto: 'CV, CZ',
          },
          {
            texto: 'No',
          },
        ],
        [
          {
            texto: 'N-8511-01',
          },
          {
            texto: 'ACTIVIDADES DE HOSPITALES Y CLÍNICAS',
          },
          {
            texto: 'N',
          },
          {
            texto: 'Alto',
            tono: 'bad',
          },
          {
            texto: 'OU, CZ',
          },
          {
            texto: 'Sí — MINSA',
          },
        ],
      ],
      conteo: '6 de 1,842',
    },
  },
  certificados: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipo: 'Todos',
      tipoDeCertificado: 'PARÁMETROS URBANÍSTICOS',
      codigoPredial: '02-014-D-14-01',
      solicitante: 'VALDEZ RIOS, OLIVER FABIÁN',
      nDeExpediente: '2026-0944',
      zonificacion: 'RDM — RESIDENCIAL DENSIDAD MEDIA',
      alturaMaximaPermitida: '3 pisos',
      areaLibreMinima: '30 %',
      retiroMunicipal: '2.00 m',
      coeficienteDeEdificacion: '2.1',
      derechoDeTramiteS: '112.00',
      vigencia: '36 meses',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'CN-2026-00418',
          },
          {
            texto: 'NUMERACIÓN',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'MEDINA MEDINA, RUFINA (SUC.)',
          },
          {
            texto: '04/08/2026',
          },
          {
            texto: '42.00',
          },
          {
            texto: 'Emitido',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'CZ-2026-00212',
          },
          {
            texto: 'ZONIFICACIÓN Y VÍAS',
          },
          {
            texto: '03-088-A-01-00',
          },
          {
            texto: 'INVERSIONES DEL NORTE SAC',
          },
          {
            texto: '28/07/2026',
          },
          {
            texto: '86.00',
          },
          {
            texto: 'Emitido',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'CP-2026-00188',
          },
          {
            texto: 'PARÁMETROS URBANÍSTICOS',
          },
          {
            texto: '02-014-D-14-01',
          },
          {
            texto: 'VALDEZ RIOS, OLIVER F.',
          },
          {
            texto: '12/08/2026',
          },
          {
            texto: '112.00',
          },
          {
            texto: 'En trámite',
            tono: 'warn',
          },
        ],
      ],
      conteo: '3 de 1,184',
    },
  },
  modulos: {
    fechaCalculo: '2026-08-13',
    campos: {
      codigo: '1',
      nombreDelModulo: 'SISTEMA TRIBUTARIO MUNICIPAL',
      abreviatura: 'SIGTM',
      estado: 'ACTIVA',
      descripcion: 'SISTEMA TRIBUTARIO MUNICIPAL',
    },
    tabla: {
      filas: [
        [
          {
            texto: '1',
          },
          {
            texto: 'SIGTM',
          },
          {
            texto: 'SISTEMA TRIBUTARIO MUNICIPAL',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '2',
          },
          {
            texto: 'SIGAM',
          },
          {
            texto: 'SISTEMA ADMINISTRATIVO MUNICIPAL',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '3',
          },
          {
            texto: 'SISEG',
          },
          {
            texto: 'SISTEMA DE SEGURIDAD MUNICIPAL',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
      ],
      conteo: '3 módulos',
    },
  },
  usuarios: {
    fechaCalculo: '2026-08-13',
    campos: {
      unidadOrganica: 'Todas',
      estado: 'Todos',
      usuario2: 'jcardenas',
      nombreCompleto: 'CÁRDENAS VEGA, JOSÉ',
      dNI: '02718844',
      cargo: 'CAJERO DE VENTANILLA',
      unidadOrganica2: 'TESORERÍA',
      grupo: 'CAJERO',
      cajaAsignada: 'C-3',
      estado2: 'ACTIVA',
      vencimientoDeContrasena: '2026-11-30',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'jcardenas',
          },
          {
            texto: 'CÁRDENAS VEGA, JOSÉ',
          },
          {
            texto: 'TESORERÍA',
          },
          {
            texto: 'CAJERO',
          },
          {
            texto: 'C-3',
          },
          {
            texto: '13/08/2026 08:00',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'mrios',
          },
          {
            texto: 'RÍOS PALACIOS, MARIELA',
          },
          {
            texto: 'UNIDAD DE RENTAS',
          },
          {
            texto: 'ANALISTA',
          },
          {
            texto: '—',
          },
          {
            texto: '13/08/2026 07:52',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'rmendoza',
          },
          {
            texto: 'MENDOZA CRUZ, RICARDO',
          },
          {
            texto: 'EJECUTORÍA COACTIVA',
          },
          {
            texto: 'EJECUTOR',
          },
          {
            texto: '—',
          },
          {
            texto: '12/08/2026 17:20',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'lpena',
          },
          {
            texto: 'PEÑA SANDOVAL, LUIS',
          },
          {
            texto: 'FISCALIZACIÓN',
          },
          {
            texto: 'FISCALIZADOR',
          },
          {
            texto: '—',
          },
          {
            texto: '02/07/2026 12:11',
          },
          {
            texto: 'BLOQUEADA',
            tono: 'bad',
          },
        ],
        [
          {
            texto: 'ehurtado',
          },
          {
            texto: 'HURTADO CHERO, ELENA',
          },
          {
            texto: 'COMERCIALIZACIÓN',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '—',
          },
          {
            texto: '13/08/2026 09:04',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 de 68',
    },
  },
  grupos: {
    fechaCalculo: '2026-08-13',
    campos: {
      estado: 'Todos',
      nombreDelGrupo: 'PLANEAMIENTO',
      descripcion: 'Presupuesto y planeamiento',
      grupoPadre: 'SIGAM',
      estado2: 'ACTIVA',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: 'Acceso total al sistema',
          },
          {
            texto: '6',
          },
          {
            texto: '184',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'EJECUCION PO',
          },
          {
            texto: 'Ejecución presupuestal',
          },
          {
            texto: '4',
          },
          {
            texto: '42',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLAN',
          },
          {
            texto: 'Planificación',
          },
          {
            texto: '3',
          },
          {
            texto: '38',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAMIENTO',
          },
          {
            texto: 'Presupuesto y planeamiento',
          },
          {
            texto: '2',
          },
          {
            texto: '21',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
      ],
      conteo: '4 grupos · 68 usuarios',
    },
  },
  accesos: {
    fechaCalculo: '2026-08-13',
    campos: {
      tipo: '(TODOS)',
      nombreDelAcceso: 'cambiar',
      codigo: '824',
      modulo: 'SIGTM',
      tipo2: 'OPCIÓN MENÚ',
      objetoControl: 'miCambiarPassword',
      nivel: '01.05',
      nombreDelAcceso2: 'Cambiar Password',
      estado: 'ACTIVA',
      descripcion: 'Archivo - Cambiar Password',
      grupo: 'ADMINISTRADORES',
    },
    tabla: {
      filas: [
        [
          {
            texto: '824',
          },
          {
            texto: 'MENU',
          },
          {
            texto: 'Cambiar Password',
          },
          {
            texto: 'SIGTM',
          },
          {
            texto: '01.05',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '823',
          },
          {
            texto: 'MENU',
          },
          {
            texto: 'Cambiar Usuario',
          },
          {
            texto: 'SIGTM',
          },
          {
            texto: '01.04',
          },
          {
            texto: 'Activa',
            tono: 'ok',
          },
        ],
      ],
      conteo: '2 accesos',
    },
  },
  miembros: {
    fechaCalculo: '2026-08-13',
    campos: {
      grupo: 'ADMINISTRADORES',
      modulo: 'SIGAM',
      estado: 'ACTIVA',
      sigamAdministradores: 'aayca · ehurtado · fruiz · jquispep · vrosales',
      sigamEjecucionPo: 'EjePO',
      sigamPlan: 'avaldez · jquispep · PLAN',
      sigamPlaneamiento: 'fmita · jquispep',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'aayca',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '03/04/2021',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'ehurtado',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '15/09/2021',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'fruiz',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '31/10/2021',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'jquispep',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '03/04/2021',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'vrosales',
          },
          {
            texto: 'ADMINISTRADORES',
          },
          {
            texto: '15/09/2021',
          },
          {
            texto: '01/01/1900',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
      ],
      conteo: '5 miembros',
    },
  },
  permisos: {
    fechaCalculo: '2026-08-13',
    campos: {
      buscarPor: 'Grupo',
      grupoUsuario: 'PLANEAMIENTO',
      acceso: 'Todos',
    },
    tabla: {
      filas: [
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'Archivo - Cambiar el Año',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'Archivo - Cambiar Usuario',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'MENU SIGAM',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'Caja tributaria',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'Cierre de caja',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
        [
          {
            texto: 'PLANEAM…',
          },
          {
            texto: 'Contribuyentes',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'Sí',
            tono: 'ok',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'No',
            tono: 'bad',
          },
          {
            texto: 'ACTIVA',
            tono: 'ok',
          },
        ],
      ],
      conteo: '6 de 21 accesos',
    },
  },
  cambiar_anio: {
    fechaCalculo: '2026-08-13',
    campos: {
      anoActualDeLaSesion: '2026',
      cambiarAlAno: '2026',
      ejercicioContableAbierto: '2026',
      ultimoCierreEjecutado: '31/12/2025',
      advertencia: 'Cambiar de año afecta a todas las pantallas abiertas',
    },
  },
  cambiar_clave: {
    fechaCalculo: '2026-08-13',
    campos: {
      usuario: 'jcardenas',
      vencimientoActual: '30/11/2026',
      requisitos: 'Ocho caracteres, una mayúscula, un número',
    },
  },
  auditoria: {
    fechaCalculo: '2026-08-13',
    campos: {
      usuario: 'Todos',
      accion: 'Todas',
      desde: '2026-08-01',
      hasta: '2026-08-13',
    },
    tabla: {
      filas: [
        [
          {
            texto: '12/08/2026 09:41',
          },
          {
            texto: 'jcardenas',
          },
          {
            texto: 'Anulación de recibo',
          },
          {
            texto: 'Anulación',
            tono: 'bad',
          },
          {
            texto: 'Recibo 0003-0041184',
          },
          {
            texto: 'PC-CAJA3 · 10.0.2.43',
          },
        ],
        [
          {
            texto: '12/08/2026 09:14',
          },
          {
            texto: 'jcardenas',
          },
          {
            texto: 'Caja tributaria',
          },
          {
            texto: 'Alta',
            tono: 'ok',
          },
          {
            texto: 'Recibo 0003-0041182',
          },
          {
            texto: 'PC-CAJA3 · 10.0.2.43',
          },
        ],
        [
          {
            texto: '12/08/2026 08:22',
          },
          {
            texto: 'mrios',
          },
          {
            texto: 'Baja de deuda',
          },
          {
            texto: 'Eliminación',
            tono: 'bad',
          },
          {
            texto: 'RGAT-0244-2026-MPS',
          },
          {
            texto: 'PC-RENT2 · 10.0.1.18',
          },
        ],
        [
          {
            texto: '11/08/2026 17:20',
          },
          {
            texto: 'rmendoza',
          },
          {
            texto: 'Expedientes coactivos',
          },
          {
            texto: 'Modificación',
            tono: 'warn',
          },
          {
            texto: 'EC-2026-00412',
          },
          {
            texto: 'PC-COAC1 · 10.0.2.88',
          },
        ],
        [
          {
            texto: '11/08/2026 08:02',
          },
          {
            texto: 'lpena',
          },
          {
            texto: 'Acceso al sistema',
          },
          {
            texto: 'Acceso fallido',
            tono: 'bad',
          },
          {
            texto: '3 intentos',
          },
          {
            texto: 'TAB-FISC2 · 10.0.4.12',
          },
        ],
      ],
      conteo: '5 de 18,442',
    },
  },
  parametros: {
    fechaCalculo: '2026-08-13',
    campos: {
      entidad: 'MUNICIPALIDAD PROVINCIAL DE SULLANA',
      rUCDeLaEntidad: '20146114677',
      ejercicioVigente: '2026',
      uitDelEjercicioS: '5,350.00',
      fechaDeCierreDelEjercicioAnterior: '2025-12-31',
      timMensual: '0.90',
      interesDeFraccionamientoMensual: '0.80',
      indiceDePreciosAlPorMayorIpm: '1.0206',
      derechoDeEmisionPredialS: '4.50',
      costasCoactivasDeLaDeuda: '10.00',
      descuentoPorProntoPago: '10.00',
      montoMinimoDeEmisionDeValoresS: '50.00',
      cuota1: '2026-02-28',
      cuota2: '2026-05-31',
      cuota3: '2026-08-31',
      cuota4: '2026-11-30',
      vencimientoDeLaDeclaracionJuradaAnual: '2026-02-28',
    },
  },
  respaldo: {
    fechaCalculo: '2026-08-13',
    campos: {
      desde: '2026-08-01',
      hasta: '2026-08-13',
      tipo: 'Todos',
      tipo2: 'MANUAL',
      destino: '\\\\SRV-BK01\\sgtm',
      comprimir: true,
      verificarAlTerminar: true,
    },
    tabla: {
      filas: [
        [
          {
            texto: '12/08/2026 19:00',
          },
          {
            texto: 'DIARIA',
          },
          {
            texto: '4.82 GB',
          },
          {
            texto: '\\\\SRV-BK01\\sgtm',
          },
          {
            texto: 'Automático',
          },
          {
            texto: 'Correcta',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '11/08/2026 19:00',
          },
          {
            texto: 'DIARIA',
          },
          {
            texto: '4.81 GB',
          },
          {
            texto: '\\\\SRV-BK01\\sgtm',
          },
          {
            texto: 'Automático',
          },
          {
            texto: 'Correcta',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '31/07/2026 22:00',
          },
          {
            texto: 'MENSUAL',
          },
          {
            texto: '4.78 GB',
          },
          {
            texto: 'Unidad externa',
          },
          {
            texto: 'ehurtado',
          },
          {
            texto: 'Correcta',
            tono: 'ok',
          },
        ],
        [
          {
            texto: '10/08/2026 19:00',
          },
          {
            texto: 'DIARIA',
          },
          {
            texto: '0.00 GB',
          },
          {
            texto: '\\\\SRV-BK01\\sgtm',
          },
          {
            texto: 'Automático',
          },
          {
            texto: 'Fallida',
            tono: 'bad',
          },
        ],
      ],
      conteo: '4 de 218',
    },
  },
};

/** Verbo y ruta de cada operacion, tal como los declara el contrato. */
export const RUTAS: readonly { metodo: string; ruta: string; pantalla: string }[] = [
  {
    metodo: 'GET',
    ruta: '/api/v1/indicadores/recaudacion',
    pantalla: 'inicio',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/portal/deuda',
    pantalla: 'portal',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/fichas/urbana/{codRefCatastral}',
    pantalla: 'ficha_urbana',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/fichas/economica/{codRefCatastral}',
    pantalla: 'ficha_economica',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/fichas/bienes-comunes/{codEdificacion}',
    pantalla: 'ficha_bienes',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/fichas/rural/{codUnidad}',
    pantalla: 'ficha_rural',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/fichas',
    pantalla: 'consulta_fichas',
  },
  {
    metodo: 'PUT',
    ruta: '/api/v1/catastro/fichas/{codigo}/actualizacion',
    pantalla: 'actualizacion_catastro',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/contribuyentes/{codigo}/ficha.pdf',
    pantalla: 'ficha_contribuyente_reporte',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/vias',
    pantalla: 'calles',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/sectores',
    pantalla: 'sectores',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/tablas/aranceles',
    pantalla: 'aranceles',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/tablas/valores-unitarios',
    pantalla: 'valores_unitarios',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/catastro/tablas/depreciacion',
    pantalla: 'depreciacion',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/contribuyentes',
    pantalla: 'contribuyentes',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/predios',
    pantalla: 'predios_rentas',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/predial/calculo-individual',
    pantalla: 'predial_individual',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/predial/calculo-masivo',
    pantalla: 'predial_masivo',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/declaraciones/{djNro}',
    pantalla: 'declaracion_jurada',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/arbitrios',
    pantalla: 'arbitrios',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/transferencias/predio',
    pantalla: 'transferencia_predio',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/alcabala',
    pantalla: 'alcabala',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/vehiculos/{placa}',
    pantalla: 'vehiculos',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/vehicular/calculo',
    pantalla: 'vehicular_calculo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/transferencias/vehiculo',
    pantalla: 'transferencia_vehiculo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/espectaculos',
    pantalla: 'espectaculos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/rentas/beneficios',
    pantalla: 'beneficios',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/deuda/altas',
    pantalla: 'alta_deuda',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/rentas/deuda/bajas',
    pantalla: 'baja_deuda',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/fiscalizacion/programas',
    pantalla: 'fisc_programa',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/fiscalizacion/predial/actas',
    pantalla: 'fisc_predial',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/fiscalizacion/vehicular',
    pantalla: 'fisc_vehicular',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/fiscalizacion/resultados',
    pantalla: 'fisc_resultados',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/fiscalizacion/omisos',
    pantalla: 'fisc_omisos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/fiscalizacion/estado-cuenta',
    pantalla: 'fisc_estado_cuenta',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/fiscalizacion/predial/historico',
    pantalla: 'fisc_historico',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/fiscalizacion/resoluciones/{numero}',
    pantalla: 'resolucion_determinacion_fisc',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/papeletas',
    pantalla: 'papeletas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/papeletas/busqueda',
    pantalla: 'transito_busqueda',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/codigos',
    pantalla: 'codigos_transito',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/descargos',
    pantalla: 'transito_descargos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/internamientos',
    pantalla: 'internamiento',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/papeletas/{numero}/actos',
    pantalla: 'transito_documentos',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/valores/generacion-masiva',
    pantalla: 'transito_valores',
  },
  {
    metodo: 'PATCH',
    ruta: '/api/v1/transito/papeletas/{numero}/codigo',
    pantalla: 'transito_cambio_numero',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/reportes',
    pantalla: 'transito_reportes',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/record-conductor',
    pantalla: 'transito_record_conductor',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/record-vehicular',
    pantalla: 'transito_record_vehicular',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/constancias-libres',
    pantalla: 'transito_constancia_libre',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/padron',
    pantalla: 'transito_padron',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/estado-cuenta',
    pantalla: 'transito_estado_cuenta',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/papeletas/{numero}/hoja-informativa',
    pantalla: 'transito_papeleta_reporte',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/resoluciones/ordinaria',
    pantalla: 'transito_rg_ordinaria',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/transito/resoluciones/sancionadora',
    pantalla: 'transito_rg_sancionadora',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/padron-coactiva',
    pantalla: 'transito_padron_coactiva',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/padron-constancias',
    pantalla: 'transito_padron_constancias',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/resumen-recaudacion',
    pantalla: 'transito_resumen_recaudacion',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/resumen-papeletas',
    pantalla: 'transito_resumen_papeletas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/resumen-por-codigo',
    pantalla: 'transito_resumen_codigo',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/transito/reportes/resumen-por-placa',
    pantalla: 'transito_resumen_placa',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/infracciones/administrativas/notificaciones',
    pantalla: 'adm_notificacion',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/actas',
    pantalla: 'infracciones_adm',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/cuis',
    pantalla: 'codigos_cuis',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/codigos/reporte',
    pantalla: 'adm_codigos_reporte',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/infracciones/administrativas/valores/generacion-masiva',
    pantalla: 'adm_valores',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/estado-cuenta',
    pantalla: 'adm_estado_cuenta',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/infracciones/administrativas/resoluciones',
    pantalla: 'adm_resolucion_gerencia',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/infracciones/administrativas/resoluciones/{id}/notificacion',
    pantalla: 'adm_notificacion_resolucion',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/infracciones/administrativas/reportes',
    pantalla: 'adm_reportes',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/reportes/padron-notificaciones',
    pantalla: 'adm_padron_notificaciones',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/reportes/vencidas',
    pantalla: 'adm_notificaciones_vencidas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/reportes/por-contribuyente',
    pantalla: 'adm_notificaciones_contribuyente',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/infracciones/administrativas/reportes/resumen-recaudacion',
    pantalla: 'adm_resumen_recaudacion',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/caja/cobranza',
    pantalla: 'caja_tributaria',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/caja/tasas',
    pantalla: 'caja_tasas',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/fraccionamientos',
    pantalla: 'fraccionamiento',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/tesoreria/convenios',
    pantalla: 'consulta_convenios',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/tesoreria/recibos/{nro}/duplicado',
    pantalla: 'duplicado_recibo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/recibos/{nro}/anulacion',
    pantalla: 'anulacion_recibo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/convenios/{numero}/anulacion',
    pantalla: 'anulacion_convenio',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/tesoreria/caja/cierre',
    pantalla: 'cierre_caja',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/tesoreria/recaudacion/avance',
    pantalla: 'avance_recaudacion',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/tesoreria/recaudacion/por-area',
    pantalla: 'recaudacion_area',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/cuenta-corriente/{codigo}',
    pantalla: 'cuenta_corriente',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/deuda',
    pantalla: 'consulta_deuda',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/unificada',
    pantalla: 'consulta_unificada',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/resumen-predial',
    pantalla: 'consulta_resumen_predial',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/altas-bajas',
    pantalla: 'consulta_altas_bajas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/deudas-con-beneficio',
    pantalla: 'consulta_deudas_beneficio',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/pagos',
    pantalla: 'consulta_pagos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/predios',
    pantalla: 'consulta_predios',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/vehiculos',
    pantalla: 'consulta_vehiculos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/valores',
    pantalla: 'consulta_valores',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/consultas/constancias/no-adeudo',
    pantalla: 'constancia',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/valores',
    pantalla: 'valores_individual',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/valores/masivo',
    pantalla: 'valores_masivo',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/valores',
    pantalla: 'valores_busqueda',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/valores/{nro}/notificacion',
    pantalla: 'notificacion_valores',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/prescripcion',
    pantalla: 'prescripcion',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/valores/{numero}/movimientos',
    pantalla: 'pase_coactiva',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/coactiva/expedientes',
    pantalla: 'coactiva_expedientes',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/expedientes/importacion',
    pantalla: 'importacion_valores',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/coactiva/expedientes/{numero}/proceso',
    pantalla: 'proceso_coactivo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/rec/impresion',
    pantalla: 'rec_impresion',
  },
  {
    metodo: 'PATCH',
    ruta: '/api/v1/coactiva/expedientes/{numero}/estados',
    pantalla: 'expediente_historial',
  },
  {
    metodo: 'PATCH',
    ruta: '/api/v1/coactiva/expedientes/{numero}/direccion-referencial',
    pantalla: 'cambiar_direccion_ref',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/liquidaciones-costas',
    pantalla: 'costas_procesales',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/convenios',
    pantalla: 'fraccionamiento_coactivo',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/expedientes/{numero}/actos',
    pantalla: 'actos_coactivos',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/coactiva/notificaciones',
    pantalla: 'notificaciones_coactivas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/coactiva/deudas',
    pantalla: 'coactiva_consulta_deudas',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/coactiva/deudas-en-beneficio',
    pantalla: 'coactiva_deudas_beneficio',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/autorizaciones/anuncios',
    pantalla: 'anuncios',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/autorizaciones/anuncios/reportes',
    pantalla: 'anuncios_reportes',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/licencias/funcionamiento',
    pantalla: 'licencia_funcionamiento',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/licencias/funcionamiento/reportes/padron',
    pantalla: 'licencia_padron',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/licencias/funcionamiento/reportes/resumen-anual',
    pantalla: 'licencia_resumen_anual',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/licencias/funcionamiento/{id}/cancelacion',
    pantalla: 'licencia_resolucion_cancelacion',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/licencias/funcionamiento/{id}/duplicado',
    pantalla: 'licencia_resolucion_duplicado',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/licencias/edificacion',
    pantalla: 'fue_edificacion',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/licencias/edificacion/reportes/general',
    pantalla: 'edificacion_reporte',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/licencias/ciiu',
    pantalla: 'ciiu',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/licencias/certificados',
    pantalla: 'certificados',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/modulos',
    pantalla: 'modulos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/usuarios',
    pantalla: 'usuarios',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/grupos',
    pantalla: 'grupos',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/accesos',
    pantalla: 'accesos',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/seguridad/grupos/{grupo}/miembros',
    pantalla: 'miembros',
  },
  {
    metodo: 'PUT',
    ruta: '/api/v1/seguridad/grupos/{id}/permisos',
    pantalla: 'permisos',
  },
  {
    metodo: 'PUT',
    ruta: '/api/v1/seguridad/sesion/ejercicio',
    pantalla: 'cambiar_anio',
  },
  {
    metodo: 'PUT',
    ruta: '/api/v1/seguridad/usuarios/{id}/clave',
    pantalla: 'cambiar_clave',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/auditoria',
    pantalla: 'auditoria',
  },
  {
    metodo: 'GET',
    ruta: '/api/v1/seguridad/parametros',
    pantalla: 'parametros',
  },
  {
    metodo: 'POST',
    ruta: '/api/v1/seguridad/respaldos',
    pantalla: 'respaldo',
  },
];
