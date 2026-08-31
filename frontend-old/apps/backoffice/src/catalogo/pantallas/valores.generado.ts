/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 6 pantallas de Valores: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "valores_individual": {
    "id": "valores_individual",
    "mod": "Valores y coactiva",
    "title": "Generación individual de valores",
    "endpoint": "POST /api/v1/valores",
    "desc": "Emisión de una orden de pago, resolución de determinación o resolución de multa para un contribuyente, con la base legal que la sustenta.",
    "secciones": [
      {
        "label": "Datos del valor",
        "campos": [
          {
            "clave": "tipoDeValor",
            "label": "Tipo de valor",
            "t": "sel",
            "opts": [
              "ORDEN DE PAGO",
              "RESOLUCIÓN DE DETERMINACIÓN",
              "RESOLUCIÓN DE MULTA"
            ]
          },
          {
            "clave": "nroDeValor",
            "label": "Nro. de valor",
            "t": "ro"
          },
          {
            "clave": "fechaDeEmision",
            "label": "Fecha de emisión",
            "t": "date"
          },
          {
            "clave": "codContribuyente",
            "label": "Cod. Contribuyente",
            "t": "text"
          },
          {
            "clave": "nombre",
            "label": "Nombre",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "baseLegal",
            "label": "Base legal",
            "t": "sel",
            "opts": [
              "ART. 78º NUM. 1 DEL CÓDIGO TRIBUTARIO",
              "ART. 76º — DETERMINACIÓN",
              "ART. 180º — MULTA"
            ]
          },
          {
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "IMPUESTO PREDIAL",
              "ARBITRIOS",
              "PATRIMONIO VEHICULAR",
              "ALCABALA",
              "MULTA"
            ]
          },
          {
            "clave": "unidadPredioPlaca",
            "label": "Unidad (predio / placa)",
            "t": "text"
          },
          {
            "clave": "periodo",
            "label": "Periodo",
            "t": "text"
          }
        ]
      },
      {
        "label": "Importes",
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
            "clave": "interesMoratorioS",
            "label": "Interés moratorio (S/)",
            "t": "ro"
          },
          {
            "clave": "gastosS",
            "label": "Gastos (S/)",
            "t": "ro"
          },
          {
            "clave": "totalDelValorS",
            "label": "Total del valor (S/)",
            "t": "ro"
          },
          {
            "clave": "plazoParaReclamar",
            "label": "Plazo para reclamar",
            "t": "ro"
          }
        ]
      }
    ],
    "totales": [
      {
        "label": "Insoluto",
        "fuerte": false
      },
      {
        "label": "Reajuste",
        "fuerte": false
      },
      {
        "label": "Interés",
        "fuerte": false
      },
      {
        "label": "Total del valor",
        "fuerte": true
      }
    ],
    "acciones": [
      "Previsualizar",
      "Imprimir",
      "Emitir valor"
    ]
  },
  "valores_masivo": {
    "id": "valores_masivo",
    "mod": "Valores y coactiva",
    "title": "Generación masiva de valores",
    "endpoint": "POST /api/v1/valores/masivo",
    "desc": "Emite órdenes de pago en bloque para toda la deuda vencida que cumpla el filtro, respetando el monto mínimo de emisión fijado por ordenanza.",
    "secciones": [
      {
        "label": "Criterios de selección",
        "campos": [
          {
            "clave": "tipoDeValor",
            "label": "Tipo de valor",
            "t": "sel",
            "opts": [
              "ORDEN DE PAGO",
              "RESOLUCIÓN DE DETERMINACIÓN"
            ]
          },
          {
            "clave": "ejercicioDesde",
            "label": "Ejercicio desde",
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
            "clave": "ejercicioHasta",
            "label": "Ejercicio hasta",
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
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "TODOS",
              "IMPUESTO PREDIAL",
              "ARBITRIOS",
              "PATRIMONIO VEHICULAR"
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
            "clave": "montoMinimoDeEmisionS",
            "label": "Monto mínimo de emisión (S/)",
            "t": "text"
          },
          {
            "clave": "excluyeContribuyentesConConvenio",
            "label": "Excluye contribuyentes con convenio",
            "t": "chk",
            "ph": "No emitir a deuda fraccionada vigente"
          },
          {
            "clave": "excluyeDeudaReclamada",
            "label": "Excluye deuda reclamada",
            "t": "chk",
            "ph": "No emitir sobre expedientes en trámite"
          },
          {
            "clave": "fechaDeEmision",
            "label": "Fecha de emisión",
            "t": "date"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Simulación de la emisión",
      "cols": [
        "Tributo",
        "Ejercicios",
        "Contribuyentes",
        "Valores",
        "Insoluto S/",
        "Interés S/",
        "Total S/"
      ],
      "claves": [
        "tributo",
        "ejercicios",
        "contribuyentes",
        "valores",
        "insolutoS",
        "interesS",
        "totalS"
      ],
      "num": [
        2,
        3,
        4,
        5,
        6
      ],
      "note": "Los valores generados quedan en estado EMITIDO hasta que se registre su notificación; solo entonces empieza a correr el plazo de reclamación."
    },
    "acciones": [
      "Simular",
      "Ver excluidos",
      "Generar valores"
    ]
  },
  "valores_busqueda": {
    "id": "valores_busqueda",
    "mod": "Valores y coactiva",
    "title": "Búsqueda y mantenimiento de valores",
    "endpoint": "GET /api/v1/valores",
    "desc": "Localiza un valor por número, contribuyente o periodo para consultarlo, anularlo o derivarlo a cobranza coactiva.",
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
    "secciones": [
      {
        "label": "Anulación del valor",
        "campos": [
          {
            "clave": "motivoDeAnulacion",
            "label": "Motivo de anulación",
            "t": "sel",
            "opts": [
              "—",
              "ERROR EN LA DETERMINACIÓN",
              "PAGO PREVIO NO IMPUTADO",
              "DUPLICIDAD",
              "RESOLUCIÓN QUE LO DEJA SIN EFECTO",
              "PRESCRIPCIÓN"
            ]
          },
          {
            "clave": "nDeResolucionDeAnulacion",
            "label": "Nº de resolución de anulación",
            "t": "text"
          },
          {
            "clave": "fecha",
            "label": "Fecha",
            "t": "date"
          },
          {
            "clave": "sustento",
            "label": "Sustento",
            "t": "area",
            "ancho": true
          }
        ],
        "hint": "Opcional"
      }
    ],
    "tabla": {
      "title": "Valores emitidos",
      "cols": [
        "Nro. valor",
        "Tipo",
        "Contribuyente",
        "Tributo",
        "Periodo",
        "Monto S/",
        "Notificación",
        "Estado"
      ],
      "claves": [
        "nroValor",
        "tipo",
        "contribuyente",
        "tributo",
        "periodo",
        "montoS",
        "notificacion",
        "estado"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Excel",
      "Anular valor",
      "Derivar a coactiva"
    ]
  },
  "notificacion_valores": {
    "id": "notificacion_valores",
    "mod": "Valores y coactiva",
    "title": "Notificación de valores",
    "endpoint": "POST /api/v1/valores/{nro}/notificacion",
    "desc": "Registro del acto de notificación. La fecha de notificación determina el inicio del plazo de reclamación y, vencido este, la firmeza del valor.",
    "filtros": [
      {
        "clave": "nroDeValor",
        "label": "Nro. de valor",
        "t": "text"
      },
      {
        "clave": "notificador",
        "label": "Notificador",
        "t": "sel",
        "opts": [
          "Todos",
          "J. RUIZ PALACIOS",
          "A. VÍLCHEZ ROJAS"
        ]
      },
      {
        "clave": "resultado",
        "label": "Resultado",
        "t": "sel",
        "opts": [
          "Todos",
          "RECIBIDO POR EL TITULAR",
          "RECIBIDO POR TERCERO",
          "CEDULÓN FIJADO",
          "RECHAZADO",
          "DOMICILIO CERRADO",
          "NO UBICADO"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Acto de notificación",
        "campos": [
          {
            "clave": "nroDeValor2",
            "label": "Nro. de valor",
            "t": "ro"
          },
          {
            "clave": "contribuyente",
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
            "clave": "tipoDeNotificacion",
            "label": "Tipo de notificación",
            "t": "sel",
            "opts": [
              "PERSONAL EN DOMICILIO FISCAL",
              "CEDULÓN",
              "PUBLICACIÓN",
              "BUZÓN ELECTRÓNICO"
            ]
          },
          {
            "clave": "fechaDeNotificacion",
            "label": "Fecha de notificación",
            "t": "date"
          },
          {
            "clave": "hora",
            "label": "Hora",
            "t": "text"
          },
          {
            "clave": "notificador2",
            "label": "Notificador",
            "t": "sel",
            "opts": [
              "J. RUIZ PALACIOS",
              "A. VÍLCHEZ ROJAS"
            ]
          },
          {
            "clave": "resultado2",
            "label": "Resultado",
            "t": "sel",
            "opts": [
              "RECIBIDO POR EL TITULAR",
              "RECIBIDO POR TERCERO",
              "CEDULÓN FIJADO",
              "RECHAZADO",
              "DOMICILIO CERRADO",
              "NO UBICADO"
            ]
          },
          {
            "clave": "personaQueRecibe",
            "label": "Persona que recibe",
            "t": "text"
          },
          {
            "clave": "documentoDeQuienRecibe",
            "label": "Documento de quien recibe",
            "t": "text"
          },
          {
            "clave": "vinculo",
            "label": "Vínculo",
            "t": "sel",
            "opts": [
              "TITULAR",
              "FAMILIAR",
              "EMPLEADO",
              "PORTERO",
              "OTRO"
            ]
          },
          {
            "clave": "fechaDeFirmeza",
            "label": "Fecha de firmeza",
            "t": "ro"
          },
          {
            "clave": "observaciones",
            "label": "Observaciones",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Imprimir cargo",
      "Registrar notificación"
    ]
  },
  "prescripcion": {
    "id": "prescripcion",
    "mod": "Valores y coactiva",
    "title": "Prescripción de la deuda",
    "endpoint": "POST /api/v1/coactiva/prescripcion",
    "desc": "Solicitud de prescripción de la acción de cobro, con el cómputo del plazo y los actos que lo interrumpen o suspenden.",
    "secciones": [
      {
        "label": "Solicitud",
        "campos": [
          {
            "clave": "nDeExpediente",
            "label": "Nº de expediente",
            "t": "ro"
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
            "clave": "tributo",
            "label": "Tributo",
            "t": "sel",
            "opts": [
              "IMPUESTO PREDIAL",
              "ARBITRIOS",
              "PATRIMONIO VEHICULAR",
              "MULTA"
            ]
          },
          {
            "clave": "ejerciciosSolicitados",
            "label": "Ejercicios solicitados",
            "t": "text"
          },
          {
            "clave": "fechaDePresentacion",
            "label": "Fecha de presentación",
            "t": "date"
          }
        ]
      },
      {
        "label": "Cómputo del plazo",
        "campos": [
          {
            "clave": "plazoAplicable",
            "label": "Plazo aplicable",
            "t": "sel",
            "opts": [
              "4 AÑOS — DECLARACIÓN PRESENTADA",
              "6 AÑOS — NO PRESENTÓ DECLARACIÓN",
              "10 AÑOS — AGENTE DE RETENCIÓN"
            ]
          },
          {
            "clave": "inicioDelComputo",
            "label": "Inicio del cómputo",
            "t": "ro"
          },
          {
            "clave": "actoDeInterrupcion",
            "label": "Acto de interrupción",
            "t": "sel",
            "opts": [
              "NINGUNO",
              "NOTIFICACIÓN DE ORDEN DE PAGO",
              "PAGO PARCIAL",
              "RECONOCIMIENTO DE DEUDA",
              "NOTIFICACIÓN DE REC",
              "SOLICITUD DE FRACCIONAMIENTO"
            ]
          },
          {
            "clave": "fechaDelUltimoActo",
            "label": "Fecha del último acto",
            "t": "date"
          },
          {
            "clave": "nuevoInicioDelComputo",
            "label": "Nuevo inicio del cómputo",
            "t": "ro"
          },
          {
            "clave": "fechaDePrescripcion",
            "label": "Fecha de prescripción",
            "t": "ro"
          },
          {
            "clave": "resultado",
            "label": "Resultado",
            "t": "sel",
            "opts": [
              "PROCEDE",
              "PROCEDE EN PARTE",
              "NO PROCEDE"
            ]
          },
          {
            "clave": "nDeResolucion",
            "label": "Nº de resolución",
            "t": "text"
          },
          {
            "clave": "montoAExtinguirS",
            "label": "Monto a extinguir (S/)",
            "t": "ro"
          }
        ]
      }
    ],
    "acciones": [
      "Calcular",
      "Notificar",
      "Resolver"
    ]
  },
  "pase_coactiva": {
    "id": "pase_coactiva",
    "mod": "Coactiva",
    "title": "Pase de valores a coactiva",
    "endpoint": "POST /api/v1/valores/{numero}/movimientos",
    "desc": "Registra el movimiento del valor hacia el área de cobranza coactiva: PCO — pase a coactivas, ACO — aceptado en coactivas o RCO — rechazado en coactivas.",
    "filtros": [
      {
        "clave": "contrib",
        "label": "Contrib.",
        "t": "text"
      },
      {
        "clave": "tipoDeValor",
        "label": "Tipo de valor",
        "t": "sel",
        "opts": [
          "Todos",
          "RDP — RES. DETERMINACIÓN PREDIAL",
          "RMLF — RM LICENCIA FUNCIONAMIENTO",
          "REC — RES. EJE. COACTIVA",
          "OP — ORDEN DE PAGO"
        ]
      },
      {
        "clave": "tipoMov",
        "label": "Tipo Mov.",
        "t": "sel",
        "opts": [
          "Todos",
          "PCO — PASE A COACTIVAS",
          "ACO — ACEPTADO EN COACTIVAS",
          "RCO — RECHAZADO EN COACTIVAS"
        ]
      },
      {
        "clave": "nroValor",
        "label": "Nro. Valor",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Búsqueda",
        "campos": [
          {
            "clave": "emitidoDesde",
            "label": "Emitido desde",
            "t": "date"
          },
          {
            "clave": "emitidoHasta",
            "label": "Emitido hasta",
            "t": "date"
          },
          {
            "clave": "unidadPlaca",
            "label": "Unidad / Placa",
            "t": "text"
          },
          {
            "clave": "papeletaN",
            "label": "Papeleta Nº",
            "t": "text"
          }
        ]
      },
      {
        "label": "Detalle de los movimientos",
        "campos": [
          {
            "clave": "tipoDeOperacion",
            "label": "Tipo de operación",
            "t": "sel",
            "opts": [
              "INDIVIDUAL",
              "MASIVA"
            ]
          },
          {
            "clave": "numRecaudo",
            "label": "Num. Recaudo",
            "t": "ro"
          },
          {
            "clave": "anoDeuda",
            "label": "Año Deuda",
            "t": "text"
          },
          {
            "clave": "fechaDeEmision",
            "label": "Fecha de emisión",
            "t": "date"
          },
          {
            "clave": "tipoDeRecaudo",
            "label": "Tipo de recaudo",
            "t": "ro"
          },
          {
            "clave": "contribuyente",
            "label": "Contribuyente",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "nroMov",
            "label": "Nro. Mov.",
            "t": "text"
          },
          {
            "clave": "fechaDelMovimiento",
            "label": "Fecha del movimiento",
            "t": "date"
          },
          {
            "clave": "tipoDeMovimiento",
            "label": "Tipo de movimiento",
            "t": "sel",
            "opts": [
              "PCO — PASE A COACTIVAS",
              "ACO — ACEPTADO EN COACTIVAS",
              "RCO — RECHAZADO EN COACTIVAS"
            ]
          },
          {
            "clave": "observacion",
            "label": "Observación",
            "t": "text",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Valores por pasar a coactiva",
      "cols": [
        "Recaudo",
        "Año Rec.",
        "Tipo",
        "Cod. Contrib.",
        "Nombre",
        "Año Deu.",
        "Vence",
        "Coac",
        "Mov",
        "Est."
      ],
      "claves": [
        "recaudo",
        "anoRec",
        "tipo",
        "codContrib",
        "nombre",
        "anoDeu",
        "vence",
        "coac",
        "mov",
        "est"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Generar",
      "Inactivar",
      "Imprimir"
    ]
  }
};
