/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 11 pantallas de Consultas: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "cuenta_corriente": {
    "id": "cuenta_corriente",
    "mod": "Consultas",
    "title": "Estado de cuenta corriente",
    "endpoint": "GET /api/v1/consultas/cuenta-corriente/{codigo}",
    "desc": "Deuda y pagos del contribuyente por ejercicio y tributo, con la fase en la que se encuentra cada obligación.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "ejercicio",
        "label": "Ejercicio",
        "t": "sel",
        "opts": [
          "Todos",
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
        "clave": "tributo",
        "label": "Tributo",
        "t": "sel",
        "opts": [
          "Todos",
          "IMPUESTO PREDIAL",
          "ARBITRIOS",
          "PATRIMONIO VEHICULAR",
          "MULTAS"
        ]
      },
      {
        "clave": "situacion",
        "label": "Situación",
        "t": "sel",
        "opts": [
          "Todas",
          "CON DEUDA",
          "CANCELADO"
        ]
      }
    ],
    "tabla": {
      "title": "Cuenta corriente — CASTILLO PASCUALA, MARÍA ELENA",
      "cols": [
        "Año",
        "Tributo",
        "Unidad",
        "Cuota",
        "Emitido S/",
        "Pagado S/",
        "Saldo S/",
        "Fase"
      ],
      "claves": [
        "ano",
        "tributo",
        "unidad",
        "cuota",
        "emitidoS",
        "pagadoS",
        "saldoS",
        "fase"
      ],
      "num": [
        4,
        5,
        6
      ]
    },
    "totales": [
      {
        "label": "Deuda insoluta",
        "fuerte": false
      },
      {
        "label": "Reajuste e interés",
        "fuerte": false
      },
      {
        "label": "Costas y gastos",
        "fuerte": false
      },
      {
        "label": "Saldo total",
        "fuerte": true
      }
    ],
    "acciones": [
      "Excel",
      "Imprimir estado de cuenta"
    ]
  },
  "consulta_deuda": {
    "id": "consulta_deuda",
    "mod": "Consultas",
    "title": "Consulta de deuda",
    "endpoint": "GET /api/v1/consultas/deuda",
    "desc": "Deuda exigible a una fecha de corte, con el interés moratorio calculado al día y el desglose por fase de cobranza.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "fechaDeCorte",
        "label": "Fecha de corte",
        "t": "date"
      },
      {
        "clave": "fase",
        "label": "Fase",
        "t": "sel",
        "opts": [
          "Todas",
          "ORDINARIA",
          "VALOR EMITIDO",
          "COACTIVA"
        ]
      },
      {
        "clave": "incluyeConvenios",
        "label": "Incluye convenios",
        "t": "sel",
        "opts": [
          "Sí",
          "No"
        ]
      }
    ],
    "tabla": {
      "title": "Deuda al 13/08/2026 — DÍAZ MADRID, JULIO CÉSAR",
      "cols": [
        "Año",
        "Tributo",
        "Cuota",
        "Insoluto S/",
        "Reajuste S/",
        "Interés S/",
        "Gastos S/",
        "Total S/",
        "Fase"
      ],
      "claves": [
        "ano",
        "tributo",
        "cuota",
        "insolutoS",
        "reajusteS",
        "interesS",
        "gastosS",
        "totalS",
        "fase"
      ],
      "num": [
        3,
        4,
        5,
        6,
        7
      ],
      "note": "El interés moratorio se calcula con la TIM vigente de 0.90 % mensual desde el día siguiente al vencimiento."
    },
    "totales": [
      {
        "label": "Fase ordinaria",
        "fuerte": false
      },
      {
        "label": "Valor emitido",
        "fuerte": false
      },
      {
        "label": "Fase coactiva",
        "fuerte": false
      },
      {
        "label": "Deuda total",
        "fuerte": true
      }
    ],
    "acciones": [
      "Excel",
      "Imprimir liquidación de deuda"
    ]
  },
  "consulta_unificada": {
    "id": "consulta_unificada",
    "mod": "Consultas",
    "title": "Consulta unificada predial-arbitrios",
    "endpoint": "GET /api/v1/consultas/unificada?contribuyente={codigo}",
    "desc": "Vista única del contribuyente: impuesto anual por ejercicio, impuesto por predio y, en pestañas, deudas, pagos, altas y bajas, movimientos del predio, fraccionamientos y valores emitidos.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "impresion",
        "label": "Impresión",
        "t": "sel",
        "opts": [
          "PREDIAL",
          "ARBITRIOS",
          "PREDIAL Y ARBITRIOS"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Resumen de Deudas",
        "secciones": [
          {
            "label": "Resumen de saldos",
            "campos": [
              {
                "clave": "insoluto",
                "label": "Insoluto",
                "t": "ro"
              },
              {
                "clave": "reajuste",
                "label": "Reajuste",
                "t": "ro"
              },
              {
                "clave": "interes",
                "label": "Interés",
                "t": "ro"
              },
              {
                "clave": "gasto",
                "label": "Gasto",
                "t": "ro"
              },
              {
                "clave": "total",
                "label": "Total",
                "t": "ro"
              },
              {
                "clave": "estadoDeLaConsulta",
                "label": "Estado de la consulta",
                "t": "ro",
                "ancho": true
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Deudas Pendientes",
        "secciones": [
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
              }
            ]
          }
        ]
      },
      {
        "label": "Pagos Realizados",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "desde",
                "label": "Desde",
                "t": "date"
              },
              {
                "clave": "hasta",
                "label": "Hasta",
                "t": "date"
              },
              {
                "clave": "nDeRecibo",
                "label": "Nº de recibo",
                "t": "text"
              },
              {
                "clave": "caja",
                "label": "Caja",
                "t": "sel",
                "opts": [
                  "Todas",
                  "CAJA 01",
                  "CAJA 02",
                  "CAJA 03"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Altas y Bajas",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "altaBaja",
                "label": "Alta / Baja",
                "t": "sel",
                "opts": [
                  "(TODAS)",
                  "A — ALTA",
                  "B — BAJA"
                ]
              },
              {
                "clave": "autoManual",
                "label": "Auto / Manual",
                "t": "sel",
                "opts": [
                  "(TODAS)",
                  "A — AUTOMÁTICA",
                  "M — MANUAL"
                ]
              },
              {
                "clave": "nDocum",
                "label": "Nº Docum.",
                "t": "text"
              },
              {
                "clave": "unidad",
                "label": "Unidad",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Movimientos del Predio",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "codRefCatastral",
                "label": "Cod. Ref. Catastral",
                "t": "text"
              },
              {
                "clave": "tipoDeMovimiento",
                "label": "Tipo de movimiento",
                "t": "sel",
                "opts": [
                  "(TODOS)",
                  "ALTA",
                  "TRANSFERENCIA",
                  "MODIFICACIÓN",
                  "BAJA"
                ]
              },
              {
                "clave": "desde2",
                "label": "Desde",
                "t": "date"
              },
              {
                "clave": "hasta2",
                "label": "Hasta",
                "t": "date"
              }
            ]
          }
        ]
      },
      {
        "label": "Fraccionamientos",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "nDeConvenio",
                "label": "Nº de convenio",
                "t": "text"
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "Todos",
                  "NORMAL",
                  "CANCELADO",
                  "ANULADO",
                  "QUEBRADO"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Valores",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "tipoDeValor",
                "label": "Tipo de valor",
                "t": "sel",
                "opts": [
                  "Todos",
                  "ORDEN DE PAGO",
                  "RES. DETERMINACIÓN",
                  "RES. DE MULTA",
                  "RES. EJE. COACTIVA"
                ]
              },
              {
                "clave": "ano2",
                "label": "Año",
                "t": "sel",
                "opts": [
                  "Todos",
                  "2026",
                  "2025",
                  "2024",
                  "2023",
                  "2022",
                  "2021",
                  "2020"
                ]
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Impuesto anual",
      "cols": [
        "Año",
        "Numero HR",
        "NumCálculo",
        "Dirección",
        "NumPredios",
        "Valúo afecto",
        "Valúo exonerado",
        "Valúo total",
        "Impto. predial",
        "Limp. pública",
        "Parq. y jardines",
        "Rell. sanitario",
        "Serenazgo"
      ],
      "claves": [
        "ano",
        "numeroHr",
        "numcalculo",
        "direccion",
        "numpredios",
        "valuoAfecto",
        "valuoExonerado",
        "valuoTotal",
        "imptoPredial",
        "limpPublica",
        "parqYJardines",
        "rellSanitario",
        "serenazgo"
      ],
      "num": [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ]
    },
    "acciones": [
      "Buscar",
      "Imprimir",
      "Impuestos calculados por predio"
    ]
  },
  "consulta_resumen_predial": {
    "id": "consulta_resumen_predial",
    "mod": "Consultas",
    "title": "Consulta resumen predial-arbitrios",
    "endpoint": "GET /api/v1/consultas/resumen-predial",
    "desc": "Resumen por predio: impuesto predial de cada ejercicio con su valúo afecto y el saldo de deuda, más el valúo de arbitrios y los movimientos del predio.",
    "filtros": [
      {
        "clave": "codCatastral",
        "label": "Cod. Catastral",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "uso",
        "label": "Uso",
        "t": "sel",
        "opts": [
          "Todos",
          "CASA HABITACIÓN",
          "COMERCIO",
          "INDUSTRIA",
          "TERRENO SIN CONSTRUIR",
          "SERVICIOS"
        ]
      },
      {
        "clave": "palabra",
        "label": "Palabra",
        "t": "text"
      }
    ],
    "tabs": [
      {
        "label": "Impuesto Predial",
        "secciones": [
          {
            "label": "Determinación por ejercicio",
            "campos": [
              {
                "clave": "totalDeudaPredialInsolutoS",
                "label": "Total deuda predial — insoluto (S/)",
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
                "clave": "gastoS",
                "label": "Gasto (S/)",
                "t": "ro"
              },
              {
                "clave": "totalS",
                "label": "Total (S/)",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Valúo Predial / Arbitrios",
        "secciones": [
          {
            "label": "Valúo y arbitrios por ejercicio",
            "campos": [
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
                "clave": "valuoAfectoS",
                "label": "Valúo afecto (S/)",
                "t": "ro"
              },
              {
                "clave": "limpiezaPublicaS",
                "label": "Limpieza pública (S/)",
                "t": "ro"
              },
              {
                "clave": "parquesYJardinesS",
                "label": "Parques y jardines (S/)",
                "t": "ro"
              },
              {
                "clave": "serenazgoS",
                "label": "Serenazgo (S/)",
                "t": "ro"
              },
              {
                "clave": "rellenoSanitarioS",
                "label": "Relleno sanitario (S/)",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      },
      {
        "label": "Movimientos del Predio",
        "secciones": [
          {
            "label": "Criterios",
            "campos": [
              {
                "clave": "tipoDeMovimiento",
                "label": "Tipo de movimiento",
                "t": "sel",
                "opts": [
                  "(TODOS)",
                  "ALTA",
                  "TRANSFERENCIA",
                  "MODIFICACIÓN",
                  "BAJA"
                ]
              },
              {
                "clave": "desde",
                "label": "Desde",
                "t": "date"
              },
              {
                "clave": "hasta",
                "label": "Hasta",
                "t": "date"
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Predios encontrados",
      "cols": [
        "Cod. Catastral",
        "Cod. Propietario",
        "Nombre del propietario",
        "Dirección del predio"
      ],
      "claves": [
        "codCatastral",
        "codPropietario",
        "nombreDelPropietario",
        "direccionDelPredio"
      ],
      "num": []
    },
    "acciones": [
      "Buscar",
      "Limpiar",
      "Detalle de deudas",
      "Actualizar deuda"
    ]
  },
  "consulta_altas_bajas": {
    "id": "consulta_altas_bajas",
    "mod": "Consultas",
    "title": "Consulta de altas y bajas",
    "endpoint": "GET /api/v1/consultas/altas-bajas",
    "desc": "Movimientos de alta y baja de deuda de un contribuyente, automáticos o manuales, con el documento que los aprueba y el detalle de las deudas afectadas.",
    "filtros": [
      {
        "clave": "tipoDeConsulta",
        "label": "Tipo de consulta",
        "t": "sel",
        "opts": [
          "TRIBUTARIA",
          "P. TRÁNSITO",
          "P. ADMINISTRATIVA"
        ]
      },
      {
        "clave": "codigoCont",
        "label": "Código Cont.",
        "t": "text"
      },
      {
        "clave": "altaBaja",
        "label": "Alta / Baja",
        "t": "sel",
        "opts": [
          "(TODAS)",
          "A — ALTA",
          "B — BAJA"
        ]
      },
      {
        "clave": "autoManual",
        "label": "Auto / Manual",
        "t": "sel",
        "opts": [
          "(TODAS)",
          "A — AUTOMÁTICA",
          "M — MANUAL"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Altas y Bajas",
        "secciones": [
          {
            "label": "Observaciones del movimiento",
            "campos": [
              {
                "clave": "observacion",
                "label": "Observación",
                "t": "area",
                "ancho": true
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
            "label": "Filtros del detalle",
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
                "clave": "tipoAB",
                "label": "Tipo A/B",
                "t": "sel",
                "opts": [
                  "(TODOS)",
                  "A — ALTA",
                  "B — BAJA"
                ]
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Relación de altas y bajas",
      "cols": [
        "Num. Docum.",
        "A/B",
        "A/M",
        "Cod. Municipal",
        "Doc. Aprob.",
        "Fec. Doc. Aprob.",
        "Fecha Reg.",
        "Est."
      ],
      "claves": [
        "numDocum",
        "aB",
        "aM",
        "codMunicipal",
        "docAprob",
        "fecDocAprob",
        "fechaReg",
        "est"
      ],
      "num": []
    },
    "acciones": [
      "Buscar",
      "Imprimir",
      "Excel"
    ]
  },
  "consulta_deudas_beneficio": {
    "id": "consulta_deudas_beneficio",
    "mod": "Consultas",
    "title": "Consulta de deudas con beneficio",
    "endpoint": "GET /api/v1/consultas/deudas-con-beneficio",
    "desc": "Simula el acogimiento de la deuda a un beneficio vigente: muestra la deuda total, la deuda acogida y la deuda con beneficio, con la tasa aplicada y el ahorro resultante.",
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
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "formaDePago",
        "label": "Forma de pago",
        "t": "sel",
        "opts": [
          "PRECONVENIO",
          "CONTADO TOTAL"
        ]
      },
      {
        "clave": "benefAplicable",
        "label": "Benef. aplicable",
        "t": "sel",
        "opts": [
          "CONTADO TRIBUTARIO PERM",
          "AMNISTÍA ORDENANZA 018-2026",
          "PRONTO PAGO ANUAL",
          "CONVENIO PERMANENTE"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Búsqueda",
        "campos": [
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
        "label": "Resultado del acogimiento",
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
            "clave": "tasaAplicada",
            "label": "Tasa aplicada (%)",
            "t": "ro"
          },
          {
            "clave": "beneficioS",
            "label": "Beneficio (S/)",
            "t": "ro"
          },
          {
            "clave": "registrosAcogidos",
            "label": "Registros acogidos",
            "t": "ro"
          },
          {
            "clave": "impresion",
            "label": "Impresión",
            "t": "sel",
            "opts": [
              "CONSOLIDADO",
              "DETALLADO",
              "BENEFICIO"
            ]
          },
          {
            "clave": "impresoraMatricial",
            "label": "Impresora matricial",
            "t": "chk"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Deudas seleccionables",
      "cols": [
        "Año",
        "Unidad",
        "Convenio",
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
        "convenio",
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
        9,
        10,
        11,
        12,
        13
      ],
      "note": "Deuda total 1,848.66 · acogida 797.77 · con beneficio 250.15"
    },
    "acciones": [
      "Filtrar",
      "Limpiar",
      "Imprimir",
      "Bajar deuda"
    ]
  },
  "consulta_pagos": {
    "id": "consulta_pagos",
    "mod": "Consultas",
    "title": "Consulta de pagos",
    "endpoint": "GET /api/v1/consultas/pagos",
    "desc": "Historial de pagos con el recibo, la caja y el concepto imputado.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "desde",
        "label": "Desde",
        "t": "date"
      },
      {
        "clave": "hasta",
        "label": "Hasta",
        "t": "date"
      },
      {
        "clave": "medioDePago",
        "label": "Medio de pago",
        "t": "sel",
        "opts": [
          "Todos",
          "EFECTIVO",
          "TARJETA",
          "DEPÓSITO",
          "PAGO EN LÍNEA"
        ]
      }
    ],
    "tabla": {
      "title": "Pagos registrados",
      "cols": [
        "Fecha",
        "Recibo",
        "Concepto",
        "Año",
        "Medio",
        "Caja",
        "Importe S/"
      ],
      "claves": [
        "fecha",
        "recibo",
        "concepto",
        "ano",
        "medio",
        "caja",
        "importeS"
      ],
      "num": [
        6
      ]
    },
    "acciones": [
      "Excel",
      "Imprimir"
    ]
  },
  "consulta_predios": {
    "id": "consulta_predios",
    "mod": "Consultas",
    "title": "Consulta de predios",
    "endpoint": "GET /api/v1/consultas/predios",
    "desc": "Búsqueda de predios por titular, ubicación o código, con el autovalúo vigente y la deuda asociada a cada unidad.",
    "filtros": [
      {
        "clave": "codigoPredial",
        "label": "Código predial",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "calle",
        "label": "Calle",
        "t": "text"
      },
      {
        "clave": "manzana",
        "label": "Manzana",
        "t": "text"
      },
      {
        "clave": "lote",
        "label": "Lote",
        "t": "text"
      }
    ],
    "tabla": {
      "title": "Predios encontrados",
      "cols": [
        "Código predial",
        "Titular",
        "Dirección",
        "Uso",
        "Terreno m²",
        "Const. m²",
        "Autovalúo S/",
        "Deuda S/"
      ],
      "claves": [
        "codigoPredial",
        "titular",
        "direccion",
        "uso",
        "terrenoM",
        "constM",
        "autovaluoS",
        "deudaS"
      ],
      "num": [
        4,
        5,
        6,
        7
      ]
    },
    "acciones": [
      "Excel",
      "Ver ficha"
    ]
  },
  "consulta_vehiculos": {
    "id": "consulta_vehiculos",
    "mod": "Consultas",
    "title": "Consulta de vehículos",
    "endpoint": "GET /api/v1/consultas/vehiculos",
    "desc": "Padrón vehicular consultable por placa, motor o titular, con los ejercicios afectos y la deuda vigente.",
    "filtros": [
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "nroMotor",
        "label": "Nro. Motor",
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
          "AFECTO",
          "INAFECTO",
          "EXONERADO",
          "BAJA"
        ]
      }
    ],
    "tabla": {
      "title": "Vehículos encontrados",
      "cols": [
        "Placa",
        "Clase",
        "Marca y modelo",
        "Año fab.",
        "Titular",
        "Afectación",
        "Base imponible S/",
        "Deuda S/"
      ],
      "claves": [
        "placa",
        "clase",
        "marcaYModelo",
        "anoFab",
        "titular",
        "afectacion",
        "baseImponibleS",
        "deudaS"
      ],
      "num": [
        6,
        7
      ]
    },
    "acciones": [
      "Excel",
      "Ver ficha"
    ]
  },
  "consulta_valores": {
    "id": "consulta_valores",
    "mod": "Consultas",
    "title": "Consulta de valores emitidos",
    "endpoint": "GET /api/v1/consultas/valores",
    "desc": "Órdenes de pago, resoluciones de determinación y de multa emitidas a un contribuyente, con su estado de notificación y firmeza.",
    "filtros": [
      {
        "clave": "nroDeValor",
        "label": "Nro. de valor",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "Todos",
          "ORDEN DE PAGO",
          "RES. DETERMINACIÓN",
          "RES. DE MULTA"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "EMITIDO",
          "NOTIFICADO",
          "FIRME",
          "RECLAMADO",
          "COACTIVA",
          "ANULADO"
        ]
      }
    ],
    "tabla": {
      "title": "Valores encontrados",
      "cols": [
        "Nro. valor",
        "Tipo",
        "Contribuyente",
        "Tributo",
        "Periodo",
        "Monto S/",
        "Notificado",
        "Estado"
      ],
      "claves": [
        "nroValor",
        "tipo",
        "contribuyente",
        "tributo",
        "periodo",
        "montoS",
        "notificado",
        "estado"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Excel",
      "Imprimir valor"
    ]
  },
  "constancia": {
    "id": "constancia",
    "mod": "Consultas",
    "title": "Constancia de no adeudo",
    "endpoint": "GET /api/v1/consultas/constancias/no-adeudo",
    "kind": "report",
    "desc": "Vista previa del documento que se entrega al contribuyente. Se imprime con el mismo formato en papel membretado.",
    "reporte": {
      "title": "Constancia de no adeudo",
      "subtitle": "Emitida conforme al Texto Único de Procedimientos Administrativos vigente",
      "cols": [
        "Tributo",
        "Ejercicios",
        "Situación",
        "Saldo S/"
      ],
      "num": [
        3
      ]
    }
  }
};
