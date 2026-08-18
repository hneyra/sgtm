/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 8 pantallas de Fiscalización: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "fisc_programa": {
    "id": "fisc_programa",
    "mod": "Fiscalización",
    "title": "Programación de fiscalización",
    "endpoint": "POST /api/v1/fiscalizacion/programas",
    "desc": "Selección de la muestra a inspeccionar por sector y criterio de riesgo, con el fiscalizador asignado y el plazo del programa.",
    "filtros": [
      {
        "clave": "nDePrograma",
        "label": "Nº de programa",
        "t": "text"
      },
      {
        "clave": "ejercicio",
        "label": "Ejercicio",
        "t": "sel",
        "opts": [
          "2026",
          "2025",
          "2024",
          "2023",
          "2022",
          "2021",
          "2020"
        ]
      },
      {
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "Todos",
          "PREDIAL MASIVO",
          "PREDIAL SELECTIVO",
          "VEHICULAR",
          "LICENCIAS",
          "OMISOS",
          "SUBVALUACIÓN"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "EN PREPARACIÓN",
          "APROBADO",
          "EN EJECUCIÓN",
          "CERRADO"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Datos del programa",
        "campos": [
          {
            "clave": "nDePrograma2",
            "label": "Nº de programa",
            "t": "ro"
          },
          {
            "clave": "ejercicio2",
            "label": "Ejercicio",
            "t": "sel",
            "opts": [
              "2026",
              "2025",
              "2024",
              "2023",
              "2022",
              "2021",
              "2020"
            ]
          },
          {
            "clave": "tipoDePrograma",
            "label": "Tipo de programa",
            "t": "sel",
            "opts": [
              "PREDIAL MASIVO",
              "PREDIAL SELECTIVO",
              "VEHICULAR",
              "LICENCIAS",
              "OMISOS",
              "SUBVALUACIÓN"
            ]
          },
          {
            "clave": "sector",
            "label": "Sector",
            "t": "sel",
            "opts": [
              "01",
              "02",
              "03",
              "04",
              "05"
            ]
          },
          {
            "clave": "criterioDeRiesgo",
            "label": "Criterio de riesgo",
            "t": "sel",
            "opts": [
              "SUBVALUACIÓN PROBABLE",
              "OMISO A LA DECLARACIÓN",
              "AMPLIACIÓN NO DECLARADA",
              "USO DISTINTO AL DECLARADO",
              "DEUDA ALTA"
            ]
          },
          {
            "clave": "fiscalizadorAsignado",
            "label": "Fiscalizador asignado",
            "t": "sel",
            "opts": [
              "R. MENDOZA CRUZ",
              "L. PEÑA SANDOVAL",
              "A. VÍLCHEZ ROJAS"
            ]
          },
          {
            "clave": "fechaDeInicio",
            "label": "Fecha de inicio",
            "t": "date"
          },
          {
            "clave": "fechaDeTermino",
            "label": "Fecha de término",
            "t": "date"
          },
          {
            "clave": "tamanoDeMuestra",
            "label": "Tamaño de muestra",
            "t": "text"
          },
          {
            "clave": "estado2",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "EN PREPARACIÓN",
              "APROBADO",
              "EN EJECUCIÓN",
              "CERRADO"
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Predios seleccionados",
      "cols": [
        "Predio",
        "Contribuyente",
        "Uso declarado",
        "Área decl. m²",
        "Riesgo",
        "Estado"
      ],
      "claves": [
        "predio",
        "contribuyente",
        "usoDeclarado",
        "areaDeclM",
        "riesgo",
        "estado"
      ],
      "num": [
        3
      ]
    },
    "acciones": [
      "Generar muestra",
      "Asignar fiscalizador",
      "Aprobar programa"
    ]
  },
  "fisc_predial": {
    "id": "fisc_predial",
    "mod": "Fiscalización",
    "title": "Fiscalización predial — acta de inspección",
    "endpoint": "POST /api/v1/fiscalizacion/predial/actas",
    "desc": "Formulario de campo optimizado para tablet. Contrasta lo verificado con lo declarado y determina si corresponde emitir resolución de determinación.",
    "secciones": [
      {
        "label": "Datos de la visita",
        "campos": [
          {
            "clave": "nDeActa",
            "label": "Nº de acta",
            "t": "ro"
          },
          {
            "clave": "programa",
            "label": "Programa",
            "t": "ro"
          },
          {
            "clave": "codigoPredial",
            "label": "Código predial",
            "t": "ro"
          },
          {
            "clave": "contribuyente",
            "label": "Contribuyente",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "fechaDeInspeccion",
            "label": "Fecha de inspección",
            "t": "date"
          },
          {
            "clave": "hora",
            "label": "Hora",
            "t": "text"
          },
          {
            "clave": "fiscalizador",
            "label": "Fiscalizador",
            "t": "ro"
          },
          {
            "clave": "personaQueAtiende",
            "label": "Persona que atiende",
            "t": "text"
          },
          {
            "clave": "vinculoConElPredio",
            "label": "Vínculo con el predio",
            "t": "sel",
            "opts": [
              "PROPIETARIO",
              "FAMILIAR",
              "INQUILINO",
              "ENCARGADO",
              "NADIE ATENDIÓ"
            ]
          },
          {
            "clave": "resultadoDeLaVisita",
            "label": "Resultado de la visita",
            "t": "sel",
            "opts": [
              "INSPECCIÓN REALIZADA",
              "PREDIO CERRADO",
              "SE NEGÓ A LA INSPECCIÓN",
              "DIRECCIÓN NO UBICADA"
            ]
          }
        ]
      },
      {
        "label": "Verificación de campo",
        "campos": [
          {
            "clave": "usoVerificado",
            "label": "Uso verificado",
            "t": "sel",
            "opts": [
              "CASA HABITACIÓN",
              "COMERCIO",
              "INDUSTRIA",
              "SERVICIOS",
              "TERRENO SIN CONSTRUIR"
            ]
          },
          {
            "clave": "usoDeclarado",
            "label": "Uso declarado",
            "t": "ro"
          },
          {
            "clave": "areaDeTerrenoVerificadaM",
            "label": "Área de terreno verificada (m²)",
            "t": "text"
          },
          {
            "clave": "areaConstruidaVerificadaM",
            "label": "Área construida verificada (m²)",
            "t": "text"
          },
          {
            "clave": "areaConstruidaDeclaradaM",
            "label": "Área construida declarada (m²)",
            "t": "ro"
          },
          {
            "clave": "diferenciaM",
            "label": "Diferencia (m²)",
            "t": "ro"
          },
          {
            "clave": "nDePisosVerificados",
            "label": "Nº de pisos verificados",
            "t": "text"
          },
          {
            "clave": "mepVerificado",
            "label": "MEP verificado",
            "t": "sel",
            "opts": [
              "01 — CONCRETO",
              "02 — LADRILLO",
              "03 — ADOBE",
              "04 — QUINCHA",
              "05 — MADERA"
            ]
          },
          {
            "clave": "ecsVerificado",
            "label": "ECS verificado",
            "t": "sel",
            "opts": [
              "01 — MUY BUENO",
              "02 — BUENO",
              "03 — REGULAR",
              "04 — MALO"
            ]
          },
          {
            "clave": "serviciosBasicos",
            "label": "Servicios básicos",
            "t": "sel",
            "opts": [
              "AGUA, DESAGÜE Y LUZ",
              "AGUA Y LUZ",
              "SOLO LUZ",
              "NINGUNO"
            ]
          }
        ]
      },
      {
        "label": "Hallazgos y evidencia",
        "campos": [
          {
            "clave": "hallazgoPrincipal",
            "label": "Hallazgo principal",
            "t": "sel",
            "opts": [
              "SIN OBSERVACIONES",
              "AMPLIACIÓN NO DECLARADA",
              "USO DISTINTO AL DECLARADO",
              "OMISO A LA DECLARACIÓN",
              "PREDIO SUBVALUADO",
              "PREDIO INEXISTENTE"
            ]
          },
          {
            "clave": "generaDeterminacion",
            "label": "Genera determinación",
            "t": "chk",
            "ph": "Deriva a resolución de determinación"
          },
          {
            "clave": "fotografias",
            "label": "Fotografías",
            "t": "ro"
          },
          {
            "clave": "croquisGeorreferencia",
            "label": "Croquis / georreferencia",
            "t": "ro"
          },
          {
            "clave": "observacionesDelFiscalizador",
            "label": "Observaciones del fiscalizador",
            "t": "area",
            "ancho": true
          },
          {
            "clave": "firmaDelAdministrado",
            "label": "Firma del administrado",
            "t": "ro"
          },
          {
            "clave": "seNegoAFirmar",
            "label": "Se negó a firmar",
            "t": "chk",
            "ph": "Dejar constancia en el acta"
          }
        ]
      }
    ],
    "acciones": [
      "Guardar borrador",
      "Cerrar acta",
      "Generar determinación"
    ]
  },
  "fisc_vehicular": {
    "id": "fisc_vehicular",
    "mod": "Fiscalización",
    "title": "Fiscalización vehicular",
    "endpoint": "POST /api/v1/fiscalizacion/vehicular",
    "desc": "Cruce del padrón vehicular con la información registral y de SUNAT para detectar vehículos afectos no declarados o con valor subvaluado.",
    "filtros": [
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "ejercicio",
        "label": "Ejercicio",
        "t": "sel",
        "opts": [
          "2026",
          "2025",
          "2024",
          "2023",
          "2022",
          "2021",
          "2020"
        ]
      },
      {
        "clave": "origenDelCruce",
        "label": "Origen del cruce",
        "t": "sel",
        "opts": [
          "Todos",
          "SUNARP",
          "SUNAT",
          "MTC",
          "DECLARACIÓN"
        ]
      },
      {
        "clave": "hallazgo",
        "label": "Hallazgo",
        "t": "sel",
        "opts": [
          "Todos",
          "NO DECLARADO",
          "SUBVALUADO",
          "BAJA INDEBIDA",
          "CONFORME"
        ]
      }
    ],
    "tabla": {
      "title": "Vehículos observados",
      "cols": [
        "Placa",
        "Contribuyente",
        "Origen",
        "Valor declarado S/",
        "Valor referencial S/",
        "Hallazgo",
        "Deuda omitida S/"
      ],
      "claves": [
        "placa",
        "contribuyente",
        "origen",
        "valorDeclaradoS",
        "valorReferencialS",
        "hallazgo",
        "deudaOmitidaS"
      ],
      "num": [
        3,
        4,
        6
      ],
      "note": "El valor referencial proviene de la tabla del MEF vigente para el año de fabricación del vehículo."
    },
    "acciones": [
      "Importar cruce",
      "Notificar requerimiento",
      "Generar determinación"
    ]
  },
  "fisc_resultados": {
    "id": "fisc_resultados",
    "mod": "Fiscalización",
    "title": "Resultados y determinaciones",
    "endpoint": "GET /api/v1/fiscalizacion/resultados",
    "desc": "Diferencias detectadas, deuda omitida por ejercicio y estado del valor emitido a partir de cada acta.",
    "filtros": [
      {
        "clave": "programa",
        "label": "Programa",
        "t": "sel",
        "opts": [
          "PF-2026-014",
          "PF-2026-011",
          "PF-2025-032"
        ]
      },
      {
        "clave": "hallazgo",
        "label": "Hallazgo",
        "t": "sel",
        "opts": [
          "Todos",
          "AMPLIACIÓN NO DECLARADA",
          "OMISO",
          "USO DISTINTO",
          "SUBVALUACIÓN"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "PENDIENTE",
          "DETERMINADO",
          "NOTIFICADO",
          "RECLAMADO"
        ]
      }
    ],
    "tabla": {
      "title": "Actas con diferencia determinada",
      "cols": [
        "Acta",
        "Predio",
        "Hallazgo",
        "Dif. m²",
        "Ejercicios",
        "Deuda omitida S/",
        "Estado"
      ],
      "claves": [
        "acta",
        "predio",
        "hallazgo",
        "difM",
        "ejercicios",
        "deudaOmitidaS",
        "estado"
      ],
      "num": [
        3,
        5
      ],
      "note": "La deuda omitida incluye insoluto, reajuste e interés moratorio calculado a la fecha de emisión de la resolución de determinación."
    },
    "totales": [
      {
        "label": "Actas cerradas",
        "fuerte": false
      },
      {
        "label": "Con diferencia",
        "fuerte": false
      },
      {
        "label": "Deuda determinada",
        "fuerte": false
      },
      {
        "label": "Efectividad",
        "fuerte": true
      }
    ],
    "acciones": [
      "Exportar Excel",
      "Emitir resoluciones de determinación"
    ]
  },
  "fisc_omisos": {
    "id": "fisc_omisos",
    "mod": "Fiscalización",
    "title": "Omisos y subvaluadores",
    "endpoint": "GET /api/v1/fiscalizacion/omisos",
    "desc": "Contribuyentes con predio en catastro pero sin declaración en rentas, y declaraciones cuyo autovalúo está por debajo del valor catastral verificado.",
    "filtros": [
      {
        "clave": "ejercicio",
        "label": "Ejercicio",
        "t": "sel",
        "opts": [
          "2026",
          "2025",
          "2024",
          "2023",
          "2022",
          "2021",
          "2020"
        ]
      },
      {
        "clave": "sector",
        "label": "Sector",
        "t": "sel",
        "opts": [
          "Todos",
          "01",
          "02",
          "03",
          "04",
          "05"
        ]
      },
      {
        "clave": "condicion",
        "label": "Condición",
        "t": "sel",
        "opts": [
          "Todas",
          "OMISO",
          "SUBVALUADOR"
        ]
      }
    ],
    "tabla": {
      "title": "Contribuyentes detectados",
      "cols": [
        "Cod. Ref. Catastral",
        "Titular",
        "Condición",
        "Valor catastral S/",
        "Valor declarado S/",
        "Diferencia S/",
        "Impuesto omitido S/"
      ],
      "claves": [
        "codRefCatastral",
        "titular",
        "condicion",
        "valorCatastralS",
        "valorDeclaradoS",
        "diferenciaS",
        "impuestoOmitidoS"
      ],
      "num": [
        3,
        4,
        5,
        6
      ]
    },
    "acciones": [
      "Exportar",
      "Programar fiscalización",
      "Notificar esquela"
    ]
  },
  "fisc_estado_cuenta": {
    "id": "fisc_estado_cuenta",
    "mod": "Fiscalización",
    "title": "Estado de cuenta de fiscalización",
    "endpoint": "GET /api/v1/fiscalizacion/estado-cuenta?contribuyente={codigo}",
    "desc": "Consulta las deudas originadas en un proceso fiscalizador: diferencias de impuesto predial, arbitrios y patrimonio vehicular con sus multas tributarias.",
    "filtros": [
      {
        "clave": "tipoDePapeleta",
        "label": "Tipo de papeleta",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA"
        ]
      },
      {
        "clave": "papeleta",
        "label": "Papeleta",
        "t": "text"
      },
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Búsqueda",
        "campos": [
          {
            "clave": "contribuyente2",
            "label": "Contribuyente",
            "t": "ro"
          },
          {
            "clave": "domicilioFiscal",
            "label": "Domicilio fiscal",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "incluirInquilinos",
            "label": "Incluir inquilinos",
            "t": "chk"
          },
          {
            "clave": "excluirDeudasPrescritas",
            "label": "Excluir deudas prescritas",
            "t": "chk"
          },
          {
            "clave": "fechaDeConsulta",
            "label": "Fecha de consulta",
            "t": "date"
          }
        ]
      },
      {
        "label": "Filtros de deuda",
        "campos": [
          {
            "clave": "ano",
            "label": "Año",
            "t": "text"
          },
          {
            "clave": "cuota",
            "label": "Cuota",
            "t": "text"
          },
          {
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "00001 — PREDIAL",
              "00003 — VEHICULAR",
              "00007 — LIMPIEZA PÚBLICA",
              "00008 — PARQUES Y JARDINES",
              "00026 — SERENAZGO"
            ]
          },
          {
            "clave": "fase",
            "label": "Fase",
            "t": "text"
          },
          {
            "clave": "conc",
            "label": "Conc.",
            "t": "text"
          },
          {
            "clave": "codunid",
            "label": "CodUnid",
            "t": "text"
          },
          {
            "clave": "codconv",
            "label": "CodConv",
            "t": "text"
          },
          {
            "clave": "recau",
            "label": "Recau",
            "t": "text"
          },
          {
            "clave": "coac",
            "label": "Coac",
            "t": "text"
          }
        ]
      },
      {
        "label": "Impresión",
        "campos": [
          {
            "clave": "formato",
            "label": "Formato",
            "t": "sel",
            "opts": [
              "CONSOLIDADO",
              "DETALLADO",
              "VOUCHER"
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Deudas de fiscalización",
      "cols": [
        "Deuda",
        "Cod. Contri.",
        "Año",
        "Unidad",
        "Convenio",
        "Cuota",
        "Cod. Tri.",
        "Nom. Trib.",
        "Fase",
        "Concepto",
        "Estad.",
        "Papeleta",
        "UnidIden"
      ],
      "claves": [
        "deuda",
        "codContri",
        "ano",
        "unidad",
        "convenio",
        "cuota",
        "codTri",
        "nomTrib",
        "fase",
        "concepto",
        "estad",
        "papeleta",
        "unididen"
      ],
      "num": [],
      "note": "Tributo 500.00 · Reajuste 12.50 · Interés 58.35 · Gastos 10.80"
    },
    "acciones": [
      "Buscar",
      "Filtrar",
      "Limpiar",
      "Imprimir"
    ]
  },
  "fisc_historico": {
    "id": "fisc_historico",
    "mod": "Fiscalización",
    "title": "Histórico de fiscalización predial",
    "endpoint": "GET /api/v1/fiscalizacion/predial/historico",
    "desc": "Versiones de un proceso fiscalizador: qué característica cambió, quién la modificó y en qué momento. Cada liquidación conserva su estado y su versión.",
    "filtros": [
      {
        "clave": "nLiquidacion",
        "label": "Nº Liquidación",
        "t": "text"
      },
      {
        "clave": "codCont",
        "label": "Cód. Cont.",
        "t": "text"
      },
      {
        "clave": "nNotificacion",
        "label": "Nº Notificación",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      }
    ],
    "tabs": [
      {
        "label": "Datos Generales",
        "secciones": [
          {
            "label": "Propietario",
            "campos": [
              {
                "clave": "codigoCont",
                "label": "Código Cont.",
                "t": "ro"
              },
              {
                "clave": "nombre",
                "label": "Nombre",
                "t": "ro",
                "ancho": true
              }
            ]
          },
          {
            "label": "Fiscalización",
            "campos": [
              {
                "clave": "fechaDeFiscalizacion",
                "label": "Fecha de fiscalización",
                "t": "date"
              },
              {
                "clave": "bloqueado",
                "label": "Bloqueado",
                "t": "chk"
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "ABIERTA",
                  "EN PROCESO",
                  "LIQUIDADA",
                  "NOTIFICADA",
                  "ANULADA"
                ]
              },
              {
                "clave": "motivoDeterminante",
                "label": "Motivo determinante",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "periodoFiscalizadoDesde",
                "label": "Periodo fiscalizado — desde",
                "t": "sel",
                "opts": [
                  "2026",
                  "2025",
                  "2024",
                  "2023",
                  "2022",
                  "2021",
                  "2020"
                ]
              },
              {
                "clave": "periodoFiscalizadoHasta",
                "label": "Periodo fiscalizado — hasta",
                "t": "sel",
                "opts": [
                  "2026",
                  "2025",
                  "2024",
                  "2023",
                  "2022",
                  "2021",
                  "2020"
                ]
              },
              {
                "clave": "tipoDeFiscalizacion",
                "label": "Tipo de fiscalización",
                "t": "sel",
                "opts": [
                  "CIERTA",
                  "PRESUNTA",
                  "DE OFICIO",
                  "GABINETE"
                ]
              },
              {
                "clave": "ultimoUsuario",
                "label": "Último usuario",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Versiones",
        "secciones": [
          {
            "label": "Historial de versiones",
            "campos": [
              {
                "clave": "nDeVersion",
                "label": "Nº de versión",
                "t": "ro"
              },
              {
                "clave": "estadoDeLaVersion",
                "label": "Estado de la versión",
                "t": "ro"
              },
              {
                "clave": "fechaDeLaVersion",
                "label": "Fecha de la versión",
                "t": "ro"
              },
              {
                "clave": "versionAnterior",
                "label": "Versión anterior",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Estado de predios",
        "secciones": [
          {
            "label": "Predio urbano",
            "campos": [
              {
                "clave": "codCatastral",
                "label": "Cod. Catastral",
                "t": "ro"
              },
              {
                "clave": "direccionDelPredio",
                "label": "Dirección del predio",
                "t": "ro",
                "ancho": true
              }
            ]
          },
          {
            "label": "Predio rural",
            "campos": [
              {
                "clave": "codRef",
                "label": "Cod. Ref.",
                "t": "ro"
              },
              {
                "clave": "ubicacion",
                "label": "Ubicación",
                "t": "ro",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Documentos",
        "secciones": [
          {
            "label": "Documentos de la fiscalización",
            "campos": [
              {
                "clave": "tipoDeDocumento",
                "label": "Tipo de documento",
                "t": "sel",
                "opts": [
                  "ACTA DE INSPECCIÓN",
                  "REQUERIMIENTO",
                  "RESULTADO DE REQUERIMIENTO",
                  "LIQUIDACIÓN",
                  "NOTIFICACIÓN"
                ]
              },
              {
                "clave": "nDeDocumento",
                "label": "Nº de documento",
                "t": "text"
              },
              {
                "clave": "fecha",
                "label": "Fecha",
                "t": "date"
              },
              {
                "clave": "archivo",
                "label": "Archivo",
                "t": "ro",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Infracciones",
        "secciones": [
          {
            "label": "Infracciones detectadas",
            "campos": [
              {
                "clave": "codigoDeInfraccion",
                "label": "Código de infracción",
                "t": "text"
              },
              {
                "clave": "articuloDelCodigoTributario",
                "label": "Artículo del Código Tributario",
                "t": "sel",
                "opts": [
                  "ART. 176 NUM. 1",
                  "ART. 177 NUM. 5",
                  "ART. 178 NUM. 1",
                  "ART. 173 NUM. 1"
                ]
              },
              {
                "clave": "multaS",
                "label": "Multa (S/)",
                "t": "text"
              },
              {
                "clave": "gradualidad",
                "label": "Gradualidad (%)",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Observaciones",
        "secciones": [
          {
            "label": "Observaciones de la versión",
            "campos": [
              {
                "clave": "observacion",
                "label": "Observación",
                "t": "area",
                "ancho": true
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Fiscalizaciones encontradas",
      "cols": [
        "Est.",
        "Cód. Cont.",
        "Contribuyente",
        "Nº Liquidación",
        "Nº Notificación",
        "Versión"
      ],
      "claves": [
        "est",
        "codCont",
        "contribuyente",
        "nLiquidacion",
        "nNotificacion",
        "version"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Buscar",
      "Actualizar",
      "Imprimir"
    ]
  },
  "resolucion_determinacion_fisc": {
    "id": "resolucion_determinacion_fisc",
    "mod": "Consultas",
    "title": "Resolución de determinación de fiscalización",
    "endpoint": "GET /api/v1/fiscalizacion/resoluciones/{numero}",
    "kind": "report",
    "desc": "Valor emitido al cierre de un procedimiento de fiscalización: determina la diferencia de tributo por ejercicio y la multa tributaria que corresponde.",
    "reporte": {
      "title": "Resolución de determinación",
      "subtitle": "Procedimiento de fiscalización tributaria — impuesto predial y arbitrios",
      "cols": [
        "Ejercicio",
        "Determinado S/",
        "Declarado S/",
        "Diferencia S/",
        "Interés S/",
        "Total S/"
      ],
      "num": [
        1,
        2,
        3,
        4,
        5
      ]
    }
  }
};
