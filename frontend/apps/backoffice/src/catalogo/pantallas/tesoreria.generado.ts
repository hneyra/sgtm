/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 10 pantallas de Tesorería: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "caja_tributaria": {
    "id": "caja_tributaria",
    "mod": "Tesorería",
    "title": "Caja tributaria",
    "endpoint": "POST /api/v1/tesoreria/caja/cobranza",
    "desc": "Cobranza en ventanilla. Se elige la forma de pago, se filtra la deuda del contribuyente, se aplica el beneficio vigente y se emite el recibo.",
    "secciones": [
      {
        "label": "Forma de pago y beneficio",
        "campos": [
          {
            "clave": "formaDePago",
            "label": "Forma de pago",
            "t": "sel",
            "opts": [
              "NORMAL TRIBUTARIO",
              "A CUENTA",
              "SÓLO GASTOS",
              "BENEFICIO TOTAL AÑO",
              "BENEFICIO PARCIAL AÑO",
              "ADELANTO DE CONVENIO",
              "PRECONVENIO",
              "CONTADO TOTAL",
              "PRESCRIPCIÓN"
            ]
          },
          {
            "clave": "beneficioAplicable",
            "label": "Beneficio aplicable",
            "t": "sel",
            "opts": [
              "NINGUNO",
              "ORD. 012-2026-MPS — 100 % INTERESES",
              "AMNISTÍA PREDIAL 2026",
              "DESCUENTO PRONTO PAGO"
            ]
          },
          {
            "clave": "buscarPor",
            "label": "Buscar por",
            "t": "sel",
            "opts": [
              "CONTRIBUYENTE",
              "OPERACIÓN"
            ]
          },
          {
            "clave": "codContribuyente",
            "label": "Cod. Contribuyente",
            "t": "text"
          },
          {
            "clave": "nombre",
            "label": "Nombre",
            "t": "ro"
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
            "clave": "anoHasta",
            "label": "Año hasta",
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
            "clave": "cuotaDesde",
            "label": "Cuota desde",
            "t": "text"
          },
          {
            "clave": "cuotaHasta",
            "label": "Cuota hasta",
            "t": "text"
          },
          {
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "TODOS",
              "IMPUESTO PREDIAL",
              "LIMPIEZA PÚBLICA",
              "PARQUES Y JARDINES",
              "SERENAZGO",
              "PATRIMONIO VEHICULAR",
              "MULTAS"
            ]
          },
          {
            "clave": "fase",
            "label": "Fase",
            "t": "sel",
            "opts": [
              "TODAS",
              "ORDINARIA",
              "VALOR EMITIDO",
              "COACTIVA"
            ]
          },
          {
            "clave": "concepto",
            "label": "Concepto",
            "t": "text"
          },
          {
            "clave": "codUnidad",
            "label": "Cód. unidad",
            "t": "text"
          },
          {
            "clave": "codConvenio",
            "label": "Cód. convenio",
            "t": "text"
          },
          {
            "clave": "recaudador",
            "label": "Recaudador",
            "t": "text"
          },
          {
            "clave": "coactiva",
            "label": "Coactiva",
            "t": "sel",
            "opts": [
              "TODAS",
              "SÍ",
              "NO"
            ]
          }
        ],
        "hint": "Filtro rápido"
      }
    ],
    "tabla": {
      "title": "Deudas del contribuyente",
      "cols": [
        "",
        "Año",
        "Unidad",
        "Cuota",
        "Tributo",
        "Fase",
        "Insoluto",
        "Reajuste",
        "Interés",
        "Gastos",
        "Total"
      ],
      "claves": [
        "campo",
        "ano",
        "unidad",
        "cuota",
        "tributo",
        "fase",
        "insoluto",
        "reajuste",
        "interes",
        "gastos",
        "total"
      ],
      "num": [
        6,
        7,
        8,
        9,
        10
      ],
      "note": "La fase coactiva incluye costas y gastos del procedimiento; solo el ejecutor puede levantarlos.",
      "acciones": [
        "Marcar todos",
        "Quitar selección"
      ]
    },
    "totales": [
      {
        "label": "Deuda total",
        "fuerte": false
      },
      {
        "label": "Deuda acogida",
        "fuerte": false
      },
      {
        "label": "Beneficio aplicado",
        "fuerte": false
      },
      {
        "label": "Total a cobrar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Limpiar",
      "Cargar deudas",
      "Cobrar deuda"
    ]
  },
  "caja_tasas": {
    "id": "caja_tasas",
    "mod": "Tesorería",
    "title": "Caja de tasas y derechos administrativos",
    "endpoint": "POST /api/v1/tesoreria/caja/tasas",
    "desc": "Cobro de conceptos del TUPA que no forman parte de la cuenta corriente: constancias, copias, certificados y derechos de trámite.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "partida",
        "label": "Partida",
        "t": "text"
      },
      {
        "clave": "conceptoTupa",
        "label": "Concepto TUPA",
        "t": "text"
      }
    ],
    "tabla": {
      "title": "Conceptos a cobrar",
      "cols": [
        "",
        "Partida",
        "Concepto TUPA",
        "Área",
        "Cantidad",
        "Precio S/",
        "Importe S/"
      ],
      "claves": [
        "campo",
        "partida",
        "conceptoTupa",
        "area",
        "cantidad",
        "precioS",
        "importeS"
      ],
      "num": [
        4,
        5,
        6
      ]
    },
    "totales": [
      {
        "label": "Conceptos",
        "fuerte": false
      },
      {
        "label": "Subtotal",
        "fuerte": false
      },
      {
        "label": "Descuentos",
        "fuerte": false
      },
      {
        "label": "Total a cobrar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Limpiar",
      "Cobrar y emitir recibo"
    ]
  },
  "fraccionamiento": {
    "id": "fraccionamiento",
    "mod": "Tesorería",
    "title": "Fraccionamiento tributario",
    "endpoint": "POST /api/v1/tesoreria/fraccionamientos",
    "desc": "Acogimiento de la deuda a pago fraccionado. El sistema simula el cronograma antes de generar el convenio; dos cuotas consecutivas impagas producen la pérdida del beneficio.",
    "secciones": [
      {
        "label": "Total deuda",
        "campos": [
          {
            "clave": "totalDeudaS",
            "label": "Total deuda (S/)",
            "t": "ro"
          },
          {
            "clave": "gastosDeudaS",
            "label": "Gastos Deuda (S/)",
            "t": "ro"
          },
          {
            "clave": "codContribuyente",
            "label": "Cod. Contribuyente",
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
        "label": "Datos fraccionamiento",
        "campos": [
          {
            "clave": "nroDeCuotas",
            "label": "Nro. de Cuotas",
            "t": "text"
          },
          {
            "clave": "montoDeCuotaS",
            "label": "Monto de Cuota (S/)",
            "t": "text"
          },
          {
            "clave": "cuotaInicial",
            "label": "Cuota inicial (%)",
            "t": "sel",
            "opts": [
              "0 %",
              "10 %",
              "20 %",
              "30 %",
              "50 %"
            ]
          },
          {
            "clave": "interesDeFraccionamientoMensual",
            "label": "Interés de fraccionamiento mensual",
            "t": "ro"
          },
          {
            "clave": "primeraCuotaVence",
            "label": "Primera cuota vence",
            "t": "date"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "VIGENTE",
              "CUMPLIDO",
              "EN RIESGO",
              "QUEBRADO"
            ]
          }
        ]
      },
      {
        "label": "Ofrecimiento de garantía",
        "campos": [
          {
            "clave": "tipoDeGarantia",
            "label": "Tipo de garantía",
            "t": "sel",
            "opts": [
              "NO REQUIERE",
              "CARTA FIANZA",
              "HIPOTECA",
              "AVAL",
              "PRENDA"
            ]
          },
          {
            "clave": "detalleDelOfrecimiento",
            "label": "Detalle del ofrecimiento",
            "t": "area",
            "ph": "Descripción del bien o documento ofrecido en garantía",
            "ancho": true
          }
        ],
        "hint": "Opcional"
      },
      {
        "label": "Impresión",
        "campos": [
          {
            "clave": "convenio",
            "label": "Convenio",
            "t": "ro"
          },
          {
            "clave": "enviarAOpenoffice",
            "label": "Enviar a OpenOffice",
            "t": "chk",
            "ph": "Exporta en lugar de imprimir"
          },
          {
            "clave": "solicitud",
            "label": "Solicitud",
            "t": "chk",
            "ph": "Imprimir solicitud"
          },
          {
            "clave": "compromiso",
            "label": "Compromiso",
            "t": "chk",
            "ph": "Imprimir compromiso de pago"
          },
          {
            "clave": "resolucion",
            "label": "Resolución",
            "t": "chk",
            "ph": "Imprimir resolución de aprobación"
          }
        ],
        "hint": "Opcional"
      }
    ],
    "tabla": {
      "title": "Detalle cuotas",
      "cols": [
        "Nro",
        "Cuota",
        "Capital",
        "Interes",
        "Gasto.Conv.",
        "Gasto.Cuota",
        "Vencimiento"
      ],
      "claves": [
        "nro",
        "cuota",
        "capital",
        "interes",
        "gastoConv",
        "gastoCuota",
        "vencimiento"
      ],
      "num": [
        1,
        2,
        3,
        4,
        5
      ],
      "note": "Totales: 6 cuotas · 277.05 · capital 262.16 · interés 8.89 · gasto convenio 0.00 · gasto cuota 6.00"
    },
    "totales": [
      {
        "label": "Total cuotas",
        "fuerte": false
      },
      {
        "label": "Capital",
        "fuerte": false
      },
      {
        "label": "Interés",
        "fuerte": false
      },
      {
        "label": "Gastos",
        "fuerte": true
      }
    ],
    "acciones": [
      "Fraccionar",
      "Imprimir simulación",
      "Aceptar"
    ]
  },
  "consulta_convenios": {
    "id": "consulta_convenios",
    "mod": "Tesorería",
    "title": "Consulta de convenios",
    "endpoint": "GET /api/v1/tesoreria/convenios",
    "desc": "Seguimiento de los convenios suscritos, con las cuotas pagadas, las vencidas y los que están por quebrarse.",
    "filtros": [
      {
        "clave": "nroDeConvenio",
        "label": "Nro. de convenio",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "VIGENTE",
          "CUMPLIDO",
          "EN RIESGO",
          "QUEBRADO"
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
    ],
    "tabla": {
      "title": "Convenios registrados",
      "cols": [
        "Nro. convenio",
        "Contribuyente",
        "Fecha",
        "Deuda acogida S/",
        "Cuotas",
        "Pagadas",
        "Vencidas",
        "Saldo S/",
        "Estado"
      ],
      "claves": [
        "nroConvenio",
        "contribuyente",
        "fecha",
        "deudaAcogidaS",
        "cuotas",
        "pagadas",
        "vencidas",
        "saldoS",
        "estado"
      ],
      "num": [
        3,
        4,
        5,
        6,
        7
      ],
      "note": "El quiebre del convenio devuelve la deuda a su fase original y habilita la cobranza coactiva por el saldo."
    },
    "totales": [
      {
        "label": "Convenios vigentes",
        "fuerte": false
      },
      {
        "label": "En riesgo",
        "fuerte": false
      },
      {
        "label": "Quebrados 2026",
        "fuerte": false
      },
      {
        "label": "Saldo por cobrar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Exportar",
      "Imprimir cronograma"
    ]
  },
  "duplicado_recibo": {
    "id": "duplicado_recibo",
    "mod": "Tesorería",
    "title": "Duplicado de recibo",
    "endpoint": "GET /api/v1/tesoreria/recibos/{nro}/duplicado",
    "desc": "Reimpresión de un recibo ya emitido. El duplicado sale marcado como tal y queda registrado en la bitácora con el usuario que lo generó.",
    "filtros": [
      {
        "clave": "nroDeRecibo",
        "label": "Nro. de recibo",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "fecha",
        "label": "Fecha",
        "t": "date"
      },
      {
        "clave": "caja",
        "label": "Caja",
        "t": "sel",
        "opts": [
          "Todas",
          "C-1",
          "C-2",
          "C-3",
          "C-4"
        ]
      }
    ],
    "tabla": {
      "title": "Recibos localizados",
      "cols": [
        "Nro. recibo",
        "Fecha",
        "Hora",
        "Contribuyente",
        "Concepto",
        "Importe S/",
        "Duplicados",
        "Estado"
      ],
      "claves": [
        "nroRecibo",
        "fecha",
        "hora",
        "contribuyente",
        "concepto",
        "importeS",
        "duplicados",
        "estado"
      ],
      "num": [
        5,
        6
      ]
    },
    "acciones": [
      "Vista previa",
      "Imprimir duplicado"
    ]
  },
  "anulacion_recibo": {
    "id": "anulacion_recibo",
    "mod": "Tesorería",
    "title": "Anulación de recibo",
    "endpoint": "POST /api/v1/tesoreria/recibos/{nro}/anulacion",
    "desc": "Deja sin efecto un recibo y devuelve la deuda a la cuenta corriente. Requiere autorización del responsable de tesorería y solo procede mientras la caja del turno siga abierta.",
    "secciones": [
      {
        "label": "Recibo a anular",
        "campos": [
          {
            "clave": "nroDeRecibo",
            "label": "Nro. de recibo",
            "t": "text"
          },
          {
            "clave": "fechaDeEmision",
            "label": "Fecha de emisión",
            "t": "ro"
          },
          {
            "clave": "cajaCajero",
            "label": "Caja / cajero",
            "t": "ro"
          },
          {
            "clave": "contribuyente",
            "label": "Contribuyente",
            "t": "ro"
          },
          {
            "clave": "concepto",
            "label": "Concepto",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "importeS",
            "label": "Importe (S/)",
            "t": "ro"
          },
          {
            "clave": "medioDePago",
            "label": "Medio de pago",
            "t": "ro"
          }
        ]
      },
      {
        "label": "Sustento de la anulación",
        "campos": [
          {
            "clave": "motivo",
            "label": "Motivo",
            "t": "sel",
            "opts": [
              "ERROR EN EL CONCEPTO COBRADO",
              "ERROR EN EL IMPORTE",
              "ERROR EN EL CONTRIBUYENTE",
              "PAGO DUPLICADO",
              "DESISTIMIENTO DEL ADMINISTRADO",
              "FALLA DE IMPRESIÓN"
            ]
          },
          {
            "clave": "autorizadoPor",
            "label": "Autorizado por",
            "t": "sel",
            "opts": [
              "RESPONSABLE DE TESORERÍA",
              "GERENTE DE ADMINISTRACIÓN TRIBUTARIA"
            ]
          },
          {
            "clave": "nDeMemorando",
            "label": "Nº de memorando",
            "t": "text"
          },
          {
            "clave": "devuelveLaDeudaACuentaCorriente",
            "label": "Devuelve la deuda a cuenta corriente",
            "t": "chk",
            "ph": "Restablece las obligaciones canceladas"
          },
          {
            "clave": "detalle",
            "label": "Detalle",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Verificar recibo",
      "Anular recibo"
    ]
  },
  "anulacion_convenio": {
    "id": "anulacion_convenio",
    "mod": "Tesorería",
    "title": "Anulación de convenio",
    "endpoint": "POST /api/v1/tesoreria/convenios/{numero}/anulacion",
    "desc": "Anula, reforma o quiebra un convenio de fraccionamiento. La deuda acogida retorna a su estado original y el sistema conserva el motivo y el responsable de la anulación.",
    "filtros": [
      {
        "clave": "numConv",
        "label": "Num. Conv.",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "estadoDelConvenio",
        "label": "Estado del convenio",
        "t": "sel",
        "opts": [
          "Todos",
          "NORMAL",
          "ANULADO",
          "QUEBRADO",
          "REFORMADO",
          "CANCELADO"
        ]
      },
      {
        "clave": "fechaDeAnulacion",
        "label": "Fecha de anulación",
        "t": "date"
      }
    ],
    "secciones": [
      {
        "label": "Detalle de la anulación",
        "campos": [
          {
            "clave": "numAnul",
            "label": "Num. Anul.",
            "t": "ro"
          },
          {
            "clave": "fechaAnul",
            "label": "Fecha Anul.",
            "t": "date"
          },
          {
            "clave": "responsableAnul",
            "label": "Responsable Anul.",
            "t": "ro"
          },
          {
            "clave": "numConv2",
            "label": "Num. Conv.",
            "t": "text"
          },
          {
            "clave": "estadoDelConvenio2",
            "label": "Estado del convenio",
            "t": "ro"
          },
          {
            "clave": "contribuyente2",
            "label": "Contribuyente",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "motivo",
            "label": "Motivo",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "glosa",
            "label": "Glosa",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Anulaciones registradas",
      "cols": [
        "Num. Anul.",
        "Num. Conv.",
        "Fecha Anul.",
        "Contribuyente",
        "Motivo",
        "Responsable"
      ],
      "claves": [
        "numAnul",
        "numConv",
        "fechaAnul",
        "contribuyente",
        "motivo",
        "responsable"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Deshacer",
      "Anular",
      "Reformar",
      "Quebrar"
    ]
  },
  "cierre_caja": {
    "id": "cierre_caja",
    "mod": "Tesorería",
    "title": "Cierre y arqueo de caja",
    "endpoint": "POST /api/v1/tesoreria/caja/cierre",
    "desc": "Arqueo del turno: recaudación por medio de pago, recibos emitidos y anulados, y diferencia entre lo declarado y lo registrado por el sistema.",
    "secciones": [
      {
        "label": "Turno",
        "campos": [
          {
            "clave": "caja",
            "label": "Caja",
            "t": "ro"
          },
          {
            "clave": "cajero",
            "label": "Cajero",
            "t": "ro"
          },
          {
            "clave": "fecha",
            "label": "Fecha",
            "t": "date"
          },
          {
            "clave": "turno",
            "label": "Turno",
            "t": "sel",
            "opts": [
              "MAÑANA",
              "TARDE",
              "CONTINUO"
            ]
          },
          {
            "clave": "horaDeApertura",
            "label": "Hora de apertura",
            "t": "ro"
          },
          {
            "clave": "horaDeCierre",
            "label": "Hora de cierre",
            "t": "text"
          }
        ]
      },
      {
        "label": "Arqueo",
        "campos": [
          {
            "clave": "efectivoS",
            "label": "Efectivo (S/)",
            "t": "text"
          },
          {
            "clave": "tarjetaDeDebitoCreditoS",
            "label": "Tarjeta de débito / crédito (S/)",
            "t": "text"
          },
          {
            "clave": "depositoEnCuentaS",
            "label": "Depósito en cuenta (S/)",
            "t": "text"
          },
          {
            "clave": "pagoEnLineaS",
            "label": "Pago en línea (S/)",
            "t": "text"
          },
          {
            "clave": "totalDeclaradoS",
            "label": "Total declarado (S/)",
            "t": "ro"
          },
          {
            "clave": "totalSistemaS",
            "label": "Total sistema (S/)",
            "t": "ro"
          },
          {
            "clave": "diferenciaS",
            "label": "Diferencia (S/)",
            "t": "ro"
          },
          {
            "clave": "recibosEmitidos",
            "label": "Recibos emitidos",
            "t": "ro"
          },
          {
            "clave": "recibosAnulados",
            "label": "Recibos anulados",
            "t": "ro"
          },
          {
            "clave": "observacionesDelArqueo",
            "label": "Observaciones del arqueo",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Cuadrar",
      "Imprimir arqueo",
      "Cerrar caja"
    ]
  },
  "avance_recaudacion": {
    "id": "avance_recaudacion",
    "mod": "Tesorería",
    "title": "Avance de recaudación",
    "endpoint": "GET /api/v1/tesoreria/recaudacion/avance",
    "desc": "Comparación de lo emitido contra lo recaudado por tributo y periodo, base del seguimiento de la meta anual.",
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
        "clave": "tributo",
        "label": "Tributo",
        "t": "sel",
        "opts": [
          "Todos",
          "IMPUESTO PREDIAL",
          "ARBITRIOS",
          "PATRIMONIO VEHICULAR",
          "ALCABALA",
          "MULTAS"
        ]
      }
    ],
    "tabla": {
      "title": "Emitido contra recaudado",
      "cols": [
        "Tributo",
        "Emitido S/",
        "Recaudado S/",
        "Saldo S/",
        "% avance",
        "Meta S/",
        "% de meta"
      ],
      "claves": [
        "tributo",
        "emitidoS",
        "recaudadoS",
        "saldoS",
        "avance",
        "metaS",
        "deMeta"
      ],
      "num": [
        1,
        2,
        3,
        4,
        5,
        6
      ]
    },
    "totales": [
      {
        "label": "Emitido",
        "fuerte": false
      },
      {
        "label": "Recaudado",
        "fuerte": false
      },
      {
        "label": "Saldo por cobrar",
        "fuerte": false
      },
      {
        "label": "Avance",
        "fuerte": true
      }
    ],
    "acciones": [
      "Excel",
      "Imprimir avance"
    ]
  },
  "recaudacion_area": {
    "id": "recaudacion_area",
    "mod": "Tesorería",
    "title": "Recaudación por área",
    "endpoint": "GET /api/v1/tesoreria/recaudacion/por-area",
    "desc": "Recaudación desagregada por partida presupuestal y unidad orgánica generadora, para el reporte mensual a la gerencia de administración.",
    "filtros": [
      {
        "clave": "area",
        "label": "Área",
        "t": "sel",
        "opts": [
          "113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA",
          "113100 — UNIDAD DE RENTAS",
          "113200 — TESORERÍA",
          "114000 — COMERCIALIZACIÓN"
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
      },
      {
        "clave": "agruparPorArea",
        "label": "Agrupar por Área",
        "t": "sel",
        "opts": [
          "Sí",
          "No"
        ]
      },
      {
        "clave": "agruparPorTributo",
        "label": "Agrupar por Tributo",
        "t": "sel",
        "opts": [
          "Sí",
          "No"
        ]
      }
    ],
    "tabla": {
      "title": "Recaudación por partida",
      "cols": [
        "Partida",
        "Descripción",
        "Monto S/"
      ],
      "claves": [
        "partida",
        "descripcion",
        "montoS"
      ],
      "num": [
        2
      ],
      "note": "Total del periodo para el área seleccionada: S/ 35,579.33"
    },
    "acciones": [
      "Excel",
      "Imprimir por partida",
      "Imprimir por tributo"
    ]
  }
};
