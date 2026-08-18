/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 12 pantallas de Coactiva: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "coactiva_expedientes": {
    "id": "coactiva_expedientes",
    "mod": "Valores y coactiva",
    "title": "Expedientes coactivos",
    "endpoint": "GET /api/v1/coactiva/expedientes",
    "desc": "Cobranza coactiva de valores firmes: resolución de ejecución, medidas cautelares, costas y gastos, y causales de suspensión.",
    "filtros": [
      {
        "clave": "nroDeExpediente",
        "label": "Nro. de expediente",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "ejecutor",
        "label": "Ejecutor",
        "t": "sel",
        "opts": [
          "R. MENDOZA CRUZ",
          "C. ANCAJIMA FLORES"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "INICIADO",
          "CON MEDIDA CAUTELAR",
          "SUSPENDIDO",
          "CONCLUIDO"
        ]
      }
    ],
    "tabs": [
      {
        "label": "REC",
        "secciones": [
          {
            "label": "Resolución de ejecución coactiva",
            "campos": [
              {
                "clave": "nroDeExpediente2",
                "label": "Nro. de expediente",
                "t": "ro"
              },
              {
                "clave": "nroDeRec",
                "label": "Nro. de REC",
                "t": "text"
              },
              {
                "clave": "fechaDeInicio",
                "label": "Fecha de inicio",
                "t": "date"
              },
              {
                "clave": "ejecutorCoactivo",
                "label": "Ejecutor coactivo",
                "t": "ro"
              },
              {
                "clave": "auxiliarCoactivo",
                "label": "Auxiliar coactivo",
                "t": "sel",
                "opts": [
                  "S. PALACIOS NIMA",
                  "K. CHERO VARGAS"
                ]
              },
              {
                "clave": "codContribuyente2",
                "label": "Cod. Contribuyente",
                "t": "ro"
              },
              {
                "clave": "valoresAcumulados",
                "label": "Valores acumulados",
                "t": "ro"
              },
              {
                "clave": "plazoParaPagoVoluntario",
                "label": "Plazo para pago voluntario",
                "t": "ro"
              },
              {
                "clave": "fechaDeNotificacionDeLaRec",
                "label": "Fecha de notificación de la REC",
                "t": "date"
              }
            ]
          }
        ]
      },
      {
        "label": "Medida cautelar",
        "secciones": [
          {
            "label": "Medida trabada",
            "campos": [
              {
                "clave": "tipoDeMedida",
                "label": "Tipo de medida",
                "t": "sel",
                "opts": [
                  "NINGUNA",
                  "EMBARGO EN FORMA DE RETENCIÓN",
                  "EMBARGO EN FORMA DE INSCRIPCIÓN",
                  "EMBARGO EN FORMA DE DEPÓSITO",
                  "EMBARGO EN FORMA DE INTERVENCIÓN"
                ]
              },
              {
                "clave": "nDeResolucionCoactiva",
                "label": "Nº de resolución coactiva",
                "t": "text"
              },
              {
                "clave": "entidadTerceroRetenedor",
                "label": "Entidad / tercero retenedor",
                "t": "text"
              },
              {
                "clave": "bienOCuentaAfectada",
                "label": "Bien o cuenta afectada",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "montoDeLaMedidaS",
                "label": "Monto de la medida (S/)",
                "t": "text"
              },
              {
                "clave": "fechaDeLaMedida",
                "label": "Fecha de la medida",
                "t": "date"
              },
              {
                "clave": "resultado",
                "label": "Resultado",
                "t": "sel",
                "opts": [
                  "EN TRÁMITE",
                  "RETENIDO",
                  "SIN FONDOS",
                  "LEVANTADA"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Costas y gastos",
        "secciones": [
          {
            "label": "Liquidación de costas",
            "campos": [
              {
                "clave": "deudaMateriaDeCobranzaS",
                "label": "Deuda materia de cobranza (S/)",
                "t": "ro"
              },
              {
                "clave": "costasProcesales10",
                "label": "Costas procesales (10 %)",
                "t": "ro"
              },
              {
                "clave": "gastosDeNotificacionS",
                "label": "Gastos de notificación (S/)",
                "t": "text"
              },
              {
                "clave": "gastosDeMedidaCautelarS",
                "label": "Gastos de medida cautelar (S/)",
                "t": "text"
              },
              {
                "clave": "gastosDeTasacionS",
                "label": "Gastos de tasación (S/)",
                "t": "text"
              },
              {
                "clave": "gastosDeRemateS",
                "label": "Gastos de remate (S/)",
                "t": "text"
              },
              {
                "clave": "totalCostasYGastosS",
                "label": "Total costas y gastos (S/)",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Suspensión",
        "secciones": [
          {
            "label": "Suspensión y conclusión",
            "campos": [
              {
                "clave": "causal",
                "label": "Causal",
                "t": "sel",
                "opts": [
                  "NINGUNA",
                  "RECLAMACIÓN EN TRÁMITE",
                  "PRESCRIPCIÓN DECLARADA",
                  "PAGO TOTAL",
                  "CONVENIO DE FRACCIONAMIENTO",
                  "MANDATO JUDICIAL",
                  "DEUDA DECLARADA NULA"
                ]
              },
              {
                "clave": "documentoSustentatorio",
                "label": "Documento sustentatorio",
                "t": "text"
              },
              {
                "clave": "fechaDeSuspension",
                "label": "Fecha de suspensión",
                "t": "date"
              },
              {
                "clave": "fechaDeConclusion",
                "label": "Fecha de conclusión",
                "t": "date"
              },
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "area",
                "ancho": true
              }
            ],
            "hint": "Opcional"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Expedientes activos",
      "cols": [
        "Expediente",
        "Contribuyente",
        "Valores",
        "Deuda S/",
        "Costas S/",
        "Medida cautelar",
        "Estado"
      ],
      "claves": [
        "expediente",
        "contribuyente",
        "valores",
        "deudaS",
        "costasS",
        "medidaCautelar",
        "estado"
      ],
      "num": [
        2,
        3,
        4
      ]
    },
    "totales": [
      {
        "label": "Deuda en coactiva",
        "fuerte": false
      },
      {
        "label": "Costas y gastos",
        "fuerte": false
      },
      {
        "label": "Retenido",
        "fuerte": false
      },
      {
        "label": "Total exigible",
        "fuerte": true
      }
    ],
    "acciones": [
      "Iniciar cobranza",
      "Trabar medida",
      "Suspender",
      "Imprimir REC"
    ]
  },
  "importacion_valores": {
    "id": "importacion_valores",
    "mod": "Coactiva",
    "title": "Importación de valores a coactiva",
    "endpoint": "POST /api/v1/coactiva/expedientes/importacion",
    "desc": "Ingresa a coactiva un valor ya generado en el módulo de valores y le asigna número de expediente coactivo, auxiliar y ejecutor para su tratamiento posterior.",
    "filtros": [
      {
        "clave": "tipoDeDeuda",
        "label": "Tipo de deuda",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA",
          "CLAUSURA DE LOCAL"
        ]
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "codUnidad",
        "label": "Cod. Unidad",
        "t": "text"
      },
      {
        "clave": "filtro",
        "label": "Filtro",
        "t": "sel",
        "opts": [
          "TODOS",
          "OP",
          "RD",
          "RG",
          "RM"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Datos Expediente",
        "secciones": [
          {
            "label": "Expediente coactivo",
            "campos": [
              {
                "clave": "numero",
                "label": "Número",
                "t": "text"
              },
              {
                "clave": "ano",
                "label": "Año",
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
                "clave": "asunto",
                "label": "Asunto",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "direccionReferencialDelContribuyente",
                "label": "Dirección referencial del contribuyente",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "area",
                "ancho": true
              }
            ]
          },
          {
            "label": "Encargados",
            "campos": [
              {
                "clave": "auxiliar",
                "label": "Auxiliar",
                "t": "sel",
                "opts": [
                  "GARCÍA NAVARRO-MARTHA ELENA",
                  "RÍOS MENDOZA-MARÍA",
                  "NO ESPECIFICADO"
                ]
              },
              {
                "clave": "ejecutor",
                "label": "Ejecutor",
                "t": "sel",
                "opts": [
                  "CHECA FERNÁNDEZ-HILTON ARTURO",
                  "QUISPE PEÑA-JORGE",
                  "NO ESPECIFICADO"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Detalle de Recaudos",
        "secciones": [
          {
            "label": "Recaudo seleccionado",
            "campos": [
              {
                "clave": "numRecaudo",
                "label": "Num. recaudo",
                "t": "ro"
              },
              {
                "clave": "tipoDeRecaudo",
                "label": "Tipo de recaudo",
                "t": "ro"
              },
              {
                "clave": "anoDeuda",
                "label": "Año deuda",
                "t": "ro"
              },
              {
                "clave": "totalRecaudoS",
                "label": "Total recaudo (S/)",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Detalle de Deudas",
        "secciones": [
          {
            "label": "Filtros de deuda",
            "campos": [
              {
                "clave": "ano2",
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
                  "(TODOS)",
                  "00001 — PREDIAL",
                  "00003 — VEHICULAR",
                  "00007 — LIMPIEZA PÚBLICA",
                  "00008 — PARQUES Y JARDINES",
                  "00026 — SERENAZGO",
                  "00101 — COSTAS PROCESALES"
                ]
              },
              {
                "clave": "codUnid",
                "label": "Cod. Unid.",
                "t": "text"
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Lista de valores pendientes",
      "cols": [
        "Seleccione",
        "Año recaudo",
        "Numero",
        "Recaudo",
        "TipoMov",
        "CodPapel",
        "Total recaudo",
        "Cod. Contribuyente"
      ],
      "claves": [
        "seleccione",
        "anoRecaudo",
        "numero",
        "recaudo",
        "tipomov",
        "codpapel",
        "totalRecaudo",
        "codContribuyente"
      ],
      "num": [
        6
      ]
    },
    "acciones": [
      "Importar valores",
      "Expedientes libres",
      "Rechazar recaudo",
      "Limpiar campos"
    ]
  },
  "proceso_coactivo": {
    "id": "proceso_coactivo",
    "mod": "Coactiva",
    "title": "Proceso coactivo",
    "endpoint": "GET /api/v1/coactiva/expedientes/{numero}/proceso",
    "desc": "Seguimiento del expediente coactivo: datos generales, actuaciones del proceso y detalle de los valores que lo integran, con la deuda proyectada a la fecha.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "expedienteAno",
        "label": "Expediente — año",
        "t": "text"
      },
      {
        "clave": "expedienteNumero",
        "label": "Expediente — número",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "REC 01 EMITIDO",
          "REC 02 EMITIDA",
          "MEDIDA CAUTELAR",
          "CONCLUIDO"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Datos Generales",
        "secciones": [
          {
            "label": "Expediente",
            "campos": [
              {
                "clave": "numero",
                "label": "Número",
                "t": "ro"
              },
              {
                "clave": "ano",
                "label": "Año",
                "t": "ro"
              },
              {
                "clave": "expAnterior",
                "label": "Exp. anterior",
                "t": "ro"
              },
              {
                "clave": "asunto",
                "label": "Asunto",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "direccionReferencialDelContribuyente",
                "label": "Dirección referencial del contribuyente",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "fechaDeCreacion",
                "label": "Fecha de creación",
                "t": "date"
              }
            ]
          },
          {
            "label": "Encargados",
            "campos": [
              {
                "clave": "auxiliar",
                "label": "Auxiliar",
                "t": "sel",
                "opts": [
                  "NO ESPECIFICADO",
                  "GARCÍA NAVARRO-MARTHA ELENA",
                  "RÍOS MENDOZA-MARÍA"
                ]
              },
              {
                "clave": "ejecutor",
                "label": "Ejecutor",
                "t": "sel",
                "opts": [
                  "NO ESPECIFICADO",
                  "CHECA FERNÁNDEZ-HILTON ARTURO",
                  "QUISPE PEÑA-JORGE"
                ]
              }
            ]
          },
          {
            "label": "Deuda del expediente",
            "campos": [
              {
                "clave": "insolutoS",
                "label": "Insoluto (S/)",
                "t": "ro"
              },
              {
                "clave": "reajusteS",
                "label": "Reajuste (S/)",
                "t": "ro"
              },
              {
                "clave": "interesS",
                "label": "Interés (S/)",
                "t": "ro"
              },
              {
                "clave": "gastosS",
                "label": "Gastos (S/)",
                "t": "ro"
              },
              {
                "clave": "totalS",
                "label": "Total (S/)",
                "t": "ro"
              },
              {
                "clave": "proyectadaAl",
                "label": "Proyectada al",
                "t": "date"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Proceso Coactivo",
        "secciones": [
          {
            "label": "Medida cautelar — REC 2",
            "campos": [
              {
                "clave": "tipoDeMedida",
                "label": "Tipo de medida",
                "t": "sel",
                "opts": [
                  "EMBARGO EN FORMA DE RETENCIÓN",
                  "EMBARGO EN FORMA DE INSCRIPCIÓN",
                  "EMBARGO EN FORMA DE DEPÓSITO",
                  "EMBARGO EN FORMA DE INTERVENCIÓN"
                ]
              },
              {
                "clave": "nDeResolucionRec2",
                "label": "Nº de resolución (REC 2)",
                "t": "text"
              },
              {
                "clave": "fechaDeEmision",
                "label": "Fecha de emisión",
                "t": "date"
              },
              {
                "clave": "montoDelEmbargoS",
                "label": "Monto del embargo (S/)",
                "t": "text"
              },
              {
                "clave": "entidadFinanciera",
                "label": "Entidad financiera",
                "t": "text"
              },
              {
                "clave": "bienEmbargado",
                "label": "Bien embargado",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "montoRetenidoS",
                "label": "Monto retenido (S/)",
                "t": "text"
              },
              {
                "clave": "glosa",
                "label": "Glosa",
                "t": "area",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Detalle Valores",
        "secciones": [
          {
            "label": "Valores del expediente",
            "campos": [
              {
                "clave": "nroDeValor",
                "label": "Nro. de valor",
                "t": "ro"
              },
              {
                "clave": "tipoDeValor",
                "label": "Tipo de valor",
                "t": "ro"
              },
              {
                "clave": "anoDeuda",
                "label": "Año deuda",
                "t": "ro"
              },
              {
                "clave": "montoS",
                "label": "Monto (S/)",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Expedientes del contribuyente",
      "cols": [
        "ExpCoact",
        "Codigo",
        "Nombre",
        "Asunto",
        "Estado",
        "CodTipoRecaudo",
        "ExpedAnt"
      ],
      "claves": [
        "expcoact",
        "codigo",
        "nombre",
        "asunto",
        "estado",
        "codtiporecaudo",
        "expedant"
      ],
      "num": []
    },
    "acciones": [
      "Buscar",
      "Actualizar deuda",
      "Imprimir"
    ]
  },
  "rec_impresion": {
    "id": "rec_impresion",
    "mod": "Coactiva",
    "title": "Impresión de resolución de ejecución coactiva",
    "endpoint": "POST /api/v1/coactiva/rec/impresion",
    "desc": "Genera e imprime la REC de los expedientes pendientes de pago, con la deuda proyectada al día elegido. Permite imprimir la carátula y la REC 2.",
    "filtros": [
      {
        "clave": "tipoDeDeuda",
        "label": "Tipo de deuda",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA",
          "CLAUSURA DE LOCAL"
        ]
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "ano",
        "label": "Año",
        "t": "sel",
        "opts": [
          "(Todos)",
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
        "clave": "proyectarInteresAl",
        "label": "Proyectar interés al",
        "t": "date"
      }
    ],
    "tabs": [
      {
        "label": "Datos Expediente",
        "secciones": [
          {
            "label": "Expediente",
            "campos": [
              {
                "clave": "numero",
                "label": "Número",
                "t": "ro"
              },
              {
                "clave": "ano2",
                "label": "Año",
                "t": "ro"
              },
              {
                "clave": "asunto",
                "label": "Asunto",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "direccionReferencialDelContribuyente",
                "label": "Dirección referencial del contribuyente",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "auxiliar",
                "label": "Auxiliar",
                "t": "text"
              },
              {
                "clave": "ejecutor",
                "label": "Ejecutor",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Detalle de Expediente",
        "secciones": [
          {
            "label": "Actuaciones",
            "campos": [
              {
                "clave": "estado",
                "label": "Estado",
                "t": "ro"
              },
              {
                "clave": "fechaDelEstado",
                "label": "Fecha del estado",
                "t": "ro"
              },
              {
                "clave": "documentoDeRespaldo",
                "label": "Documento de respaldo",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Detalle de Deudas",
        "secciones": [
          {
            "label": "Carga de deudas",
            "campos": [
              {
                "clave": "proyectarInteresAl2",
                "label": "Proyectar interés al",
                "t": "date"
              },
              {
                "clave": "insolutoS",
                "label": "Insoluto (S/)",
                "t": "ro"
              },
              {
                "clave": "interesS",
                "label": "Interés (S/)",
                "t": "ro"
              },
              {
                "clave": "gastosYCostasS",
                "label": "Gastos y costas (S/)",
                "t": "ro"
              },
              {
                "clave": "totalS",
                "label": "Total (S/)",
                "t": "ro"
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Expedientes pendientes de pago a imprimir",
      "cols": [
        "Seleccione",
        "Numero",
        "Año",
        "CodContribuyente",
        "Nombre",
        "Estado",
        "Asunto"
      ],
      "claves": [
        "seleccione",
        "numero",
        "ano",
        "codcontribuyente",
        "nombre",
        "estado",
        "asunto"
      ],
      "num": []
    },
    "acciones": [
      "Listar expedientes",
      "Seleccionar todos",
      "Generar",
      "Imprimir",
      "Carátula",
      "REC 2"
    ]
  },
  "expediente_historial": {
    "id": "expediente_historial",
    "mod": "Coactiva",
    "title": "Gestionar historial del expediente",
    "endpoint": "PATCH /api/v1/coactiva/expedientes/{numero}/estados",
    "desc": "Cambia el estado del expediente coactivo y conserva el historial de estados con su documento de respaldo, motivo y observaciones.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "nExpediente",
        "label": "Nº Expediente",
        "t": "text"
      },
      {
        "clave": "estadoActual",
        "label": "Estado actual",
        "t": "sel",
        "opts": [
          "Todos",
          "REC 01 EMITIDO",
          "NOTIFICADO",
          "MEDIDA CAUTELAR",
          "SUSPENDIDO",
          "CONCLUIDO"
        ]
      },
      {
        "clave": "ano",
        "label": "Año",
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
      }
    ],
    "secciones": [
      {
        "label": "Historial de estados",
        "campos": [
          {
            "clave": "fecDoc",
            "label": "Fec. Doc.",
            "t": "ro"
          },
          {
            "clave": "numDoc",
            "label": "Num. Doc.",
            "t": "ro"
          },
          {
            "clave": "motivo",
            "label": "Motivo",
            "t": "ro"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "ro"
          },
          {
            "clave": "activo",
            "label": "Activo",
            "t": "ro"
          },
          {
            "clave": "observaciones",
            "label": "Observaciones",
            "t": "ro",
            "ancho": true
          }
        ],
        "hint": "Solo lectura"
      },
      {
        "label": "Nuevo estado",
        "campos": [
          {
            "clave": "nExpedienteAno",
            "label": "Nº Expediente — año",
            "t": "ro"
          },
          {
            "clave": "nExpedienteNumero",
            "label": "Nº Expediente — número",
            "t": "ro"
          },
          {
            "clave": "nuevoEstado",
            "label": "Nuevo estado",
            "t": "sel",
            "opts": [
              "011 — REC 01 EMITIDO",
              "012 — REC 01 NOTIFICADA",
              "021 — REC 02 EMITIDA",
              "031 — MEDIDA CAUTELAR",
              "041 — SUSPENDIDO",
              "051 — CONCLUIDO"
            ]
          },
          {
            "clave": "activo2",
            "label": "Activo",
            "t": "chk"
          },
          {
            "clave": "motivo2",
            "label": "Motivo",
            "t": "area",
            "ancho": true
          },
          {
            "clave": "observaciones2",
            "label": "Observaciones",
            "t": "area",
            "ancho": true
          },
          {
            "clave": "documentoDeRespaldoFecha",
            "label": "Documento de respaldo — fecha",
            "t": "date"
          },
          {
            "clave": "documentoDeRespaldoNumero",
            "label": "Documento de respaldo — número",
            "t": "text"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Expedientes encontrados",
      "cols": [
        "Numero",
        "Año",
        "Cod. Contribuyente",
        "Contribuyente",
        "Exped. Ant."
      ],
      "claves": [
        "numero",
        "ano",
        "codContribuyente",
        "contribuyente",
        "expedAnt"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Quitar",
      "Guardar cambios",
      "Limpiar"
    ]
  },
  "cambiar_direccion_ref": {
    "id": "cambiar_direccion_ref",
    "mod": "Coactiva",
    "title": "Cambiar dirección referencial",
    "endpoint": "PATCH /api/v1/coactiva/expedientes/{numero}/direccion-referencial",
    "desc": "Reemplaza la dirección referencial del expediente coactivo, que es la que se usa para notificar al obligado cuando difiere del domicilio fiscal.",
    "secciones": [
      {
        "label": "Datos de búsqueda",
        "campos": [
          {
            "clave": "contribuyente",
            "label": "Contribuyente",
            "t": "text"
          },
          {
            "clave": "domicilioFiscal",
            "label": "Domicilio fiscal",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "direccionReferencialActualExpediente",
            "label": "Dirección referencial actual (expediente)",
            "t": "ro",
            "ancho": true
          }
        ]
      },
      {
        "label": "Nueva dirección",
        "campos": [
          {
            "clave": "habUrbana",
            "label": "Hab. Urbana",
            "t": "text"
          },
          {
            "clave": "via",
            "label": "Vía",
            "t": "text"
          },
          {
            "clave": "nuevaDireccionReferencial",
            "label": "Nueva dirección referencial",
            "t": "text",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Buscar",
      "Limpiar",
      "Cambiar"
    ]
  },
  "costas_procesales": {
    "id": "costas_procesales",
    "mod": "Coactiva",
    "title": "Liquidación de costas procesales",
    "endpoint": "POST /api/v1/coactiva/liquidaciones-costas",
    "desc": "Liquida las costas y gastos del procedimiento coactivo por expediente, según el arancel de costas aprobado.",
    "filtros": [
      {
        "clave": "nroLiquidacion",
        "label": "Nro. Liquidación",
        "t": "text"
      },
      {
        "clave": "nroExpedCoact",
        "label": "Nro. Exped. Coact.",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "A — ACTIVA",
          "N — NOTIFICADA",
          "C — CANCELADA",
          "X — ANULADA"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Detalle de liquidación",
        "campos": [
          {
            "clave": "nroLiquidacion2",
            "label": "Nro. Liquidación",
            "t": "ro"
          },
          {
            "clave": "fecha",
            "label": "Fecha",
            "t": "date"
          },
          {
            "clave": "nroExpedCoact2",
            "label": "Nro. Exped. Coact.",
            "t": "ro"
          },
          {
            "clave": "contribuyente2",
            "label": "Contribuyente",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "domicilioFiscal",
            "label": "Domicilio fiscal",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "observaciones",
            "label": "Observaciones",
            "t": "area",
            "ancho": true
          }
        ]
      },
      {
        "label": "Costas procesales",
        "campos": [
          {
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "00101 — COSTAS PROCESALES",
              "00102 — GASTOS DE EJECUCIÓN"
            ]
          },
          {
            "clave": "descripcion",
            "label": "Descripción",
            "t": "ro"
          },
          {
            "clave": "montoS",
            "label": "Monto (S/)",
            "t": "text"
          },
          {
            "clave": "totalS",
            "label": "Total (S/)",
            "t": "ro"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Liquidaciones encontradas",
      "cols": [
        "Nro. Liquidación",
        "Cod. Contrib.",
        "Fecha",
        "Exped. Coact.",
        "Observación",
        "Estado"
      ],
      "claves": [
        "nroLiquidacion",
        "codContrib",
        "fecha",
        "expedCoact",
        "observacion",
        "estado"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Anular",
      "Imprimir"
    ]
  },
  "fraccionamiento_coactivo": {
    "id": "fraccionamiento_coactivo",
    "mod": "Coactiva",
    "title": "Fraccionamiento coactivo",
    "endpoint": "POST /api/v1/coactiva/convenios",
    "desc": "Convenio tributario coactivo. Se inicia con un pago inicial y sobre el saldo se elabora el cronograma de cuotas, con el beneficio aplicable a la deuda acogida.",
    "filtros": [
      {
        "clave": "formaDePago",
        "label": "Forma de pago",
        "t": "sel",
        "opts": [
          "CONVENIO TRIBUTARIO PERMA",
          "CONVENIO COACTIVO ORDENANZA",
          "PRECONVENIO"
        ]
      },
      {
        "clave": "benefAplicable",
        "label": "Benef. aplicable",
        "t": "sel",
        "opts": [
          "CONVENIO PERMANENTE",
          "AMNISTÍA COACTIVA 2026",
          "SIN BENEFICIO"
        ]
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "coact",
        "label": "Coact.",
        "t": "sel",
        "opts": [
          "SÍ",
          "NO"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Contribuyente",
        "campos": [
          {
            "clave": "nombre",
            "label": "Nombre",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "domicilioFiscal",
            "label": "Domicilio fiscal",
            "t": "ro",
            "ancho": true
          }
        ]
      },
      {
        "label": "Filtros de deuda",
        "campos": [
          {
            "clave": "anoDesde",
            "label": "Año desde",
            "t": "text"
          },
          {
            "clave": "anoHasta",
            "label": "Año hasta",
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
              "(TODOS)",
              "00001 — PREDIAL",
              "00003 — VEHICULAR",
              "00007 — LIMPIEZA PÚBLICA",
              "00008 — PARQUES Y JARDINES",
              "00026 — SERENAZGO",
              "00101 — COSTAS PROCESALES"
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
            "clave": "codUnid",
            "label": "Cod. Unid.",
            "t": "text"
          },
          {
            "clave": "preconv",
            "label": "PreConv",
            "t": "text"
          }
        ]
      },
      {
        "label": "Resultado del convenio",
        "campos": [
          {
            "clave": "deudaTotalS",
            "label": "Deuda total (S/)",
            "t": "ro"
          },
          {
            "clave": "deudaAcogidaS",
            "label": "Deuda acogida (S/)",
            "t": "ro"
          },
          {
            "clave": "deudaConBeneficioS",
            "label": "Deuda con beneficio (S/)",
            "t": "ro"
          },
          {
            "clave": "registros",
            "label": "Registros",
            "t": "ro"
          },
          {
            "clave": "tasa",
            "label": "Tasa (%)",
            "t": "ro"
          },
          {
            "clave": "beneficioS",
            "label": "Beneficio (S/)",
            "t": "ro"
          },
          {
            "clave": "pagoInicialS",
            "label": "Pago inicial (S/)",
            "t": "text"
          },
          {
            "clave": "nDeCuotas",
            "label": "Nº de cuotas",
            "t": "sel",
            "opts": [
              "3",
              "6",
              "9",
              "12",
              "18",
              "24",
              "36"
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Deudas acogidas",
      "cols": [
        "Año",
        "Unidad",
        "Cuota",
        "Trib.",
        "Nom. Trib.",
        "Fase",
        "Conc.",
        "Est.",
        "Insoluto",
        "Reajuste",
        "Interés",
        "Gastos",
        "Total"
      ],
      "claves": [
        "ano",
        "unidad",
        "cuota",
        "trib",
        "nomTrib",
        "fase",
        "conc",
        "est",
        "insoluto",
        "reajuste",
        "interes",
        "gastos",
        "total"
      ],
      "num": [
        8,
        9,
        10,
        11,
        12
      ],
      "note": "Deuda total 1,848.66 · acogida 1,848.66 · con beneficio 1,845.51"
    },
    "acciones": [
      "Filtrar",
      "Limpiar",
      "Fraccionamiento"
    ]
  },
  "actos_coactivos": {
    "id": "actos_coactivos",
    "mod": "Coactiva",
    "title": "Registro de actos coactivos",
    "endpoint": "POST /api/v1/coactiva/expedientes/{numero}/actos",
    "desc": "Registra y emite los documentos de las medidas coactivas adoptadas: embargos, retenciones y demás actos, con su archivo digital adjunto.",
    "filtros": [
      {
        "clave": "expAno",
        "label": "Exp. — año",
        "t": "text"
      },
      {
        "clave": "expNumero",
        "label": "Exp. — número",
        "t": "text"
      },
      {
        "clave": "contrib",
        "label": "Contrib.",
        "t": "text"
      },
      {
        "clave": "tributo",
        "label": "Tributo",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "00001 — PREDIAL",
          "00003 — VEHICULAR",
          "00007 — LIMPIEZA PÚBLICA",
          "00008 — PARQUES Y JARDINES",
          "00026 — SERENAZGO",
          "00101 — COSTAS PROCESALES"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Datos principales",
        "campos": [
          {
            "clave": "expedienteAno",
            "label": "Expediente — año",
            "t": "ro"
          },
          {
            "clave": "expedienteNumero",
            "label": "Expediente — número",
            "t": "ro"
          },
          {
            "clave": "obligado",
            "label": "Obligado",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "domicilio",
            "label": "Domicilio",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "dNI",
            "label": "D.N.I.",
            "t": "ro"
          },
          {
            "clave": "rUC",
            "label": "R.U.C.",
            "t": "ro"
          },
          {
            "clave": "referencia",
            "label": "Referencia",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "tributo2",
            "label": "Tributo",
            "t": "ro"
          },
          {
            "clave": "periodo",
            "label": "Periodo",
            "t": "ro"
          },
          {
            "clave": "deudaS",
            "label": "Deuda (S/)",
            "t": "ro"
          }
        ]
      },
      {
        "label": "Medida cautelar",
        "campos": [
          {
            "clave": "embargoN",
            "label": "Embargo Nº",
            "t": "text"
          },
          {
            "clave": "fechaEmb",
            "label": "Fecha Emb.",
            "t": "date"
          },
          {
            "clave": "montoEmbS",
            "label": "Monto Emb. (S/)",
            "t": "text"
          },
          {
            "clave": "domicEmb",
            "label": "Domic. Emb.",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "bienEmb",
            "label": "Bien Emb.",
            "t": "text"
          },
          {
            "clave": "montoRetenidoS",
            "label": "Monto retenido (S/)",
            "t": "text"
          },
          {
            "clave": "entidadFinanciera",
            "label": "Entidad financiera",
            "t": "text"
          },
          {
            "clave": "glosa",
            "label": "Glosa",
            "t": "area",
            "ancho": true
          }
        ]
      },
      {
        "label": "Actos administrativos",
        "campos": [
          {
            "clave": "documento",
            "label": "Documento",
            "t": "sel",
            "opts": [
              "RESOLUCIÓN COACTIVA",
              "OFICIO DE EMBARGO",
              "ACTA DE EMBARGO",
              "CARTA",
              "NOTIFICACIÓN"
            ]
          },
          {
            "clave": "nDoc",
            "label": "Nº Doc.",
            "t": "text"
          },
          {
            "clave": "fecDoc",
            "label": "Fec. Doc.",
            "t": "date"
          },
          {
            "clave": "nombreDeArchivo",
            "label": "Nombre de archivo",
            "t": "ro"
          },
          {
            "clave": "glosaDelActo",
            "label": "Glosa del acto",
            "t": "text",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Actos registrados",
      "cols": [
        "Expediente",
        "Codigo",
        "Obligado",
        "Deuda S/",
        "Referencia",
        "Tributo"
      ],
      "claves": [
        "expediente",
        "codigo",
        "obligado",
        "deudaS",
        "referencia",
        "tributo"
      ],
      "num": [
        3
      ]
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Imprimir",
      "Padrón"
    ]
  },
  "notificaciones_coactivas": {
    "id": "notificaciones_coactivas",
    "mod": "Coactiva",
    "title": "Emisión de notificaciones coactivas",
    "endpoint": "POST /api/v1/coactiva/notificaciones",
    "desc": "Registra y emite las notificaciones de las resoluciones de ejecución coactiva. Admite una o varias notificaciones por expediente según el tratamiento del caso.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "tipoDeValor",
        "label": "Tipo de valor",
        "t": "sel",
        "opts": [
          "RES. EJE. COACTIVA - 004",
          "RES. DETERMINACIÓN - 002",
          "ORDEN DE PAGO - 001",
          "RES. DE MULTA - 035"
        ]
      },
      {
        "clave": "valorN",
        "label": "Valor Nº",
        "t": "text"
      },
      {
        "clave": "expCoac",
        "label": "Exp. Coac.",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Notificación",
        "campos": [
          {
            "clave": "nNotificacionSerie",
            "label": "Nº Notificación — serie",
            "t": "text"
          },
          {
            "clave": "nNotificacionNumero",
            "label": "Nº Notificación — número",
            "t": "text"
          },
          {
            "clave": "nroVisita",
            "label": "Nro. visita",
            "t": "text"
          },
          {
            "clave": "fecha",
            "label": "Fecha",
            "t": "date"
          },
          {
            "clave": "vence",
            "label": "Vence",
            "t": "date"
          },
          {
            "clave": "representante",
            "label": "Representante",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "notificador",
            "label": "Notificador",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "domicilio",
            "label": "Domicilio",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "recibidoPor",
            "label": "Recibido por",
            "t": "sel",
            "opts": [
              "CONTRIBUYENTE",
              "REPRESENTANTE",
              "FAMILIAR",
              "DEPENDIENTE",
              "NEGATIVA A RECIBIR",
              "CEDULÓN"
            ]
          },
          {
            "clave": "dNIDelReceptor",
            "label": "D.N.I. del receptor",
            "t": "text"
          },
          {
            "clave": "nombreDelReceptor",
            "label": "Nombre del receptor",
            "t": "text"
          },
          {
            "clave": "tipoDeNotificacion",
            "label": "Tipo de notificación",
            "t": "sel",
            "opts": [
              "NOTIFICACIÓN CON ÉXITO",
              "NOTIFICACIÓN POR CEDULÓN",
              "NOTIFICACIÓN NEGATIVA",
              "DIRECCIÓN NO EXISTE",
              "DESTINATARIO DESCONOCIDO"
            ]
          },
          {
            "clave": "conFirma",
            "label": "Con firma",
            "t": "chk"
          },
          {
            "clave": "caracteristicasDeLaVivienda",
            "label": "Características de la vivienda",
            "t": "area",
            "ancho": true
          },
          {
            "clave": "testigo01",
            "label": "Testigo 01",
            "t": "text"
          },
          {
            "clave": "dniTestigo01",
            "label": "DNI testigo 01",
            "t": "text"
          },
          {
            "clave": "testigo02",
            "label": "Testigo 02",
            "t": "text"
          },
          {
            "clave": "dniTestigo02",
            "label": "DNI testigo 02",
            "t": "text"
          },
          {
            "clave": "testigo03",
            "label": "Testigo 03",
            "t": "text"
          },
          {
            "clave": "dniTestigo03",
            "label": "DNI testigo 03",
            "t": "text"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Valores por notificar",
      "cols": [
        "Tipo notif.",
        "Cod. Municipal",
        "Contribuyente",
        "Tipo",
        "Año",
        "Nº Valor",
        "Fec. Emisión",
        "Tipo Recaudo",
        "Exp. Coac."
      ],
      "claves": [
        "tipoNotif",
        "codMunicipal",
        "contribuyente",
        "tipo",
        "ano",
        "nValor",
        "fecEmision",
        "tipoRecaudo",
        "expCoac"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Grabar",
      "Deshacer",
      "Vista",
      "Resol. consentida"
    ]
  },
  "coactiva_consulta_deudas": {
    "id": "coactiva_consulta_deudas",
    "mod": "Coactiva",
    "title": "Consulta de deudas en coactiva",
    "endpoint": "GET /api/v1/coactiva/deudas",
    "desc": "Deuda en cobranza coactiva por contribuyente y expediente, con su estado procesal y la última actuación registrada.",
    "filtros": [
      {
        "clave": "tipoDeDeuda",
        "label": "Tipo de deuda",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA",
          "CLAUSURA DE LOCAL"
        ]
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "nExpediente",
        "label": "Nº Expediente",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "REC 01 EMITIDO",
          "NOTIFICADO",
          "MEDIDA CAUTELAR",
          "FRACCIONADO",
          "SUSPENDIDO",
          "CONCLUIDO"
        ]
      }
    ],
    "tabla": {
      "title": "Deudas en cobranza coactiva",
      "cols": [
        "Expediente",
        "Año",
        "Contribuyente",
        "Tributo",
        "Deuda S/",
        "Costas S/",
        "Última actuación",
        "Estado"
      ],
      "claves": [
        "expediente",
        "ano",
        "contribuyente",
        "tributo",
        "deudaS",
        "costasS",
        "ultimaActuacion",
        "estado"
      ],
      "num": [
        4,
        5
      ]
    },
    "acciones": [
      "Buscar",
      "Imprimir",
      "Excel"
    ]
  },
  "coactiva_deudas_beneficio": {
    "id": "coactiva_deudas_beneficio",
    "mod": "Coactiva",
    "title": "Consulta de deudas en beneficio (coactiva)",
    "endpoint": "GET /api/v1/coactiva/deudas-en-beneficio",
    "desc": "Deuda en cobranza coactiva acogible a un beneficio vigente, con las costas procesales incorporadas al cálculo.",
    "filtros": [
      {
        "clave": "tipoDeDeuda",
        "label": "Tipo de deuda",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA",
          "CLAUSURA DE LOCAL"
        ]
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "benefAplicable",
        "label": "Benef. aplicable",
        "t": "sel",
        "opts": [
          "AMNISTÍA COACTIVA 2026",
          "CONTADO COACTIVO PERM",
          "FRACCIONAMIENTO COACTIVO"
        ]
      },
      {
        "clave": "fechaDeCalculo",
        "label": "Fecha de cálculo",
        "t": "date"
      }
    ],
    "tabla": {
      "title": "Deuda acogible en coactiva",
      "cols": [
        "Expediente",
        "Año",
        "Tributo",
        "Insoluto S/",
        "Interés S/",
        "Costas S/",
        "Total S/",
        "Con beneficio S/"
      ],
      "claves": [
        "expediente",
        "ano",
        "tributo",
        "insolutoS",
        "interesS",
        "costasS",
        "totalS",
        "conBeneficioS"
      ],
      "num": [
        3,
        4,
        5,
        6,
        7
      ],
      "note": "Deuda total 6,412.80 · acogida 4,180.00 · con beneficio 2,090.00 · costas 412.50"
    },
    "acciones": [
      "Filtrar",
      "Imprimir",
      "Generar convenio coactivo"
    ]
  }
};
