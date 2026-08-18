/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 13 pantallas de Infracciones administrativas: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "adm_notificacion": {
    "id": "adm_notificacion",
    "mod": "Infracciones administrativas",
    "title": "Notificación administrativa",
    "endpoint": "POST /api/v1/infracciones/administrativas/notificaciones",
    "desc": "Registro previo de la notificación emitida en la vivienda o el negocio inspeccionado. Es el paso anterior a la generación de la multa administrativa.",
    "filtros": [
      {
        "clave": "serie",
        "label": "Serie",
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
        "clave": "numero",
        "label": "Número",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "NOTIFICADA",
          "VENCIDA",
          "SUBSANADA",
          "CON PAPELETA",
          "ANULADA"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Datos de la notificación",
        "campos": [
          {
            "clave": "serie2",
            "label": "Serie",
            "t": "text"
          },
          {
            "clave": "ano2",
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
            "clave": "numero2",
            "label": "Número",
            "t": "text"
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
            "clave": "plazoDiasHabiles",
            "label": "Plazo (días hábiles)",
            "t": "text"
          },
          {
            "clave": "vence",
            "label": "Vence",
            "t": "ro"
          }
        ]
      },
      {
        "label": "Infractor y predio",
        "campos": [
          {
            "clave": "infractorCodigo",
            "label": "Infractor — código",
            "t": "text"
          },
          {
            "clave": "infractorNombre",
            "label": "Infractor — nombre",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "dNIRUC",
            "label": "D.N.I. / R.U.C.",
            "t": "ro"
          },
          {
            "clave": "direccionDelPredio",
            "label": "Dirección del predio",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "ciiu",
            "label": "CIIU",
            "t": "text"
          },
          {
            "clave": "licenciaDeFuncionamiento",
            "label": "Licencia de funcionamiento",
            "t": "text"
          }
        ]
      },
      {
        "label": "Infracción y fiscalizador",
        "campos": [
          {
            "clave": "codigoDeInfraccion",
            "label": "Código de infracción",
            "t": "text"
          },
          {
            "clave": "descripcion",
            "label": "Descripción",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "fiscalizador",
            "label": "Fiscalizador",
            "t": "sel",
            "opts": [
              "RETO SANTOS, VÍCTOR",
              "RÍOS MENDOZA, MARÍA",
              "QUISPE PEÑA, JORGE"
            ]
          },
          {
            "clave": "recibidoPor",
            "label": "Recibido por",
            "t": "sel",
            "opts": [
              "CONTRIBUYENTE",
              "FAMILIAR",
              "DEPENDIENTE",
              "NEGATIVA A RECIBIR",
              "CEDULÓN"
            ]
          },
          {
            "clave": "nombreDelReceptor",
            "label": "Nombre del receptor",
            "t": "text"
          },
          {
            "clave": "dNIDelReceptor",
            "label": "D.N.I. del receptor",
            "t": "text"
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
    "tabla": {
      "title": "Notificaciones registradas",
      "cols": [
        "Serie-Nº",
        "Fecha",
        "Infractor",
        "Dirección del predio",
        "CIIU",
        "Infracción",
        "Vence",
        "Estado"
      ],
      "claves": [
        "serieN",
        "fecha",
        "infractor",
        "direccionDelPredio",
        "ciiu",
        "infraccion",
        "vence",
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
  "infracciones_adm": {
    "id": "infracciones_adm",
    "mod": "Infracciones",
    "title": "Infracción administrativa",
    "endpoint": "GET /api/v1/infracciones/actas",
    "desc": "Procedimiento sancionador municipal: notificación preventiva, acta de constatación y resolución de infracción y sanción con multa y medida complementaria.",
    "filtros": [
      {
        "clave": "nroDeActa",
        "label": "Nro. de acta",
        "t": "text"
      },
      {
        "clave": "administrado",
        "label": "Administrado",
        "t": "text"
      },
      {
        "clave": "codigoCuis",
        "label": "Código CUIS",
        "t": "sel",
        "opts": [
          "Todos",
          "C-101",
          "C-214",
          "S-018",
          "A-042"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "PREVENTIVA",
          "CONSTATADA",
          "SANCIONADA",
          "PAGADA",
          "COACTIVA"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Acta de constatación",
        "secciones": [
          {
            "label": "Datos del acta",
            "campos": [
              {
                "clave": "nroDeActa2",
                "label": "Nro. de acta",
                "t": "ro"
              },
              {
                "clave": "fecha",
                "label": "Fecha",
                "t": "date"
              },
              {
                "clave": "hora",
                "label": "Hora",
                "t": "text"
              },
              {
                "clave": "administrado2",
                "label": "Administrado",
                "t": "text"
              },
              {
                "clave": "rUCDNI",
                "label": "R.U.C. / D.N.I.",
                "t": "text"
              },
              {
                "clave": "nombreComercial",
                "label": "Nombre comercial",
                "t": "text"
              },
              {
                "clave": "establecimiento",
                "label": "Establecimiento",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "ciiuDelNegocio",
                "label": "CIIU del negocio",
                "t": "sel",
                "opts": [
                  "G-5234-01 — VENTA DE MATERIALES DE CONSTRUCCIÓN",
                  "D-1549-19 — RESTAURANTE-POLLERÍA",
                  "G-5211-01 — VENTA AL POR MENOR EN ALMACENES"
                ]
              },
              {
                "clave": "inspector",
                "label": "Inspector",
                "t": "sel",
                "opts": [
                  "L. PEÑA SANDOVAL",
                  "A. VÍLCHEZ ROJAS"
                ]
              },
              {
                "clave": "supervisor",
                "label": "Supervisor",
                "t": "sel",
                "opts": [
                  "C. ANCAJIMA FLORES",
                  "R. MENDOZA CRUZ"
                ]
              },
              {
                "clave": "personaQueAtiende",
                "label": "Persona que atiende",
                "t": "text"
              },
              {
                "clave": "seNegoAFirmar",
                "label": "Se negó a firmar",
                "t": "chk",
                "ph": "Dejar constancia en el acta"
              },
              {
                "clave": "descripcionDeLosHechos",
                "label": "Descripción de los hechos",
                "t": "area",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Sanción",
        "secciones": [
          {
            "label": "Resolución de infracción y sanción",
            "campos": [
              {
                "clave": "codigoCuis2",
                "label": "Código CUIS",
                "t": "sel",
                "opts": [
                  "C-101",
                  "C-214",
                  "S-018",
                  "A-042"
                ]
              },
              {
                "clave": "descripcionDeLaInfraccion",
                "label": "Descripción de la infracción",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "baseUitS",
                "label": "Base UIT (S/)",
                "t": "ro"
              },
              {
                "clave": "porcentajeDeUit",
                "label": "Porcentaje de UIT",
                "t": "sel",
                "opts": [
                  "10 %",
                  "20 %",
                  "50 %",
                  "100 %",
                  "200 %"
                ]
              },
              {
                "clave": "valorDeLaMultaS",
                "label": "Valor de la multa (S/)",
                "t": "ro"
              },
              {
                "clave": "medidaComplementaria",
                "label": "Medida complementaria",
                "t": "sel",
                "opts": [
                  "NINGUNA",
                  "CLAUSURA TEMPORAL",
                  "CLAUSURA DEFINITIVA",
                  "DECOMISO",
                  "RETIRO",
                  "PARALIZACIÓN DE OBRA",
                  "DEMOLICIÓN"
                ]
              },
              {
                "clave": "nroDeResolucionRis",
                "label": "Nro. de resolución (RIS)",
                "t": "text"
              },
              {
                "clave": "fechaDeNotificacion",
                "label": "Fecha de notificación",
                "t": "date"
              },
              {
                "clave": "descuentoProntoPago50",
                "label": "Descuento pronto pago (50 %)",
                "t": "ro"
              },
              {
                "clave": "plazoDeDescargo",
                "label": "Plazo de descargo",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Cancelación",
        "secciones": [
          {
            "label": "Pago y anulación",
            "campos": [
              {
                "clave": "cancelo",
                "label": "Canceló",
                "t": "chk",
                "ph": "Multa pagada"
              },
              {
                "clave": "nroDeRecibo",
                "label": "Nro. de recibo",
                "t": "text"
              },
              {
                "clave": "fechaDePago",
                "label": "Fecha de pago",
                "t": "date"
              },
              {
                "clave": "anulo",
                "label": "Anuló",
                "t": "chk",
                "ph": "Acta anulada"
              },
              {
                "clave": "referenciaDeAnulacion",
                "label": "Referencia de anulación",
                "t": "text",
                "ancho": true
              }
            ],
            "hint": "Opcional"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Procedimientos sancionadores",
      "cols": [
        "Nro. acta",
        "Administrado",
        "CUIS",
        "Infracción",
        "% UIT",
        "Multa S/",
        "Medida complementaria",
        "Estado"
      ],
      "claves": [
        "nroActa",
        "administrado",
        "cuis",
        "infraccion",
        "uit",
        "multaS",
        "medidaComplementaria",
        "estado"
      ],
      "num": [
        4,
        5
      ]
    },
    "acciones": [
      "Nuevo",
      "Emitir RIS",
      "Imprimir",
      "Guardar"
    ]
  },
  "codigos_cuis": {
    "id": "codigos_cuis",
    "mod": "Infracciones",
    "title": "Cuadro único de infracciones y sanciones (CUIS)",
    "endpoint": "GET /api/v1/infracciones/cuis",
    "desc": "Catálogo aprobado por ordenanza con el porcentaje de UIT y la medida complementaria de cada infracción administrativa.",
    "filtros": [
      {
        "clave": "codigo",
        "label": "Código",
        "t": "text"
      },
      {
        "clave": "materia",
        "label": "Materia",
        "t": "sel",
        "opts": [
          "Todas",
          "COMERCIALIZACIÓN",
          "SALUBRIDAD",
          "ANUNCIOS",
          "OBRAS",
          "LIMPIEZA",
          "TRANSPORTE"
        ]
      }
    ],
    "tabla": {
      "title": "Infracciones tipificadas",
      "cols": [
        "Código",
        "Materia",
        "Descripción",
        "% UIT",
        "Multa S/",
        "Medida complementaria"
      ],
      "claves": [
        "codigo",
        "materia",
        "descripcion",
        "uit",
        "multaS",
        "medidaComplementaria"
      ],
      "num": [
        3,
        4
      ]
    },
    "acciones": [
      "Nuevo",
      "Guardar"
    ]
  },
  "adm_codigos_reporte": {
    "id": "adm_codigos_reporte",
    "mod": "Infracciones administrativas",
    "title": "Reporte de códigos de infracción administrativa",
    "endpoint": "GET /api/v1/infracciones/administrativas/codigos/reporte",
    "desc": "Relación impresa del cuadro único de infracciones y sanciones vigente, con la base de cálculo y la sanción no pecuniaria de cada código.",
    "filtros": [
      {
        "clave": "codigo",
        "label": "Código",
        "t": "text"
      },
      {
        "clave": "descripcionContiene",
        "label": "Descripción contiene",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "VIGENTES",
          "DEROGADOS",
          "TODOS"
        ]
      },
      {
        "clave": "ordenadoPor",
        "label": "Ordenado por",
        "t": "sel",
        "opts": [
          "CÓDIGO",
          "DESCRIPCIÓN",
          "IMPORTE"
        ]
      }
    ],
    "tabla": {
      "title": "Códigos tipificados",
      "cols": [
        "Código",
        "Infracción",
        "Base",
        "% UIT",
        "Multa S/",
        "Sanción no pecuniaria",
        "Estado"
      ],
      "claves": [
        "codigo",
        "infraccion",
        "base",
        "uit",
        "multaS",
        "sancionNoPecuniaria",
        "estado"
      ],
      "num": [
        3,
        4
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "adm_valores": {
    "id": "adm_valores",
    "mod": "Infracciones administrativas",
    "title": "Generación de valores administrativa",
    "endpoint": "POST /api/v1/infracciones/administrativas/valores/generacion-masiva",
    "desc": "Selecciona un conjunto de papeletas administrativas con deuda según un criterio y genera masivamente un valor por papeleta para su impresión y notificación posterior.",
    "filtros": [
      {
        "clave": "codigoDescripcionDelCriterio",
        "label": "Código / descripción del criterio",
        "t": "text",
        "ancho": true
      }
    ],
    "secciones": [
      {
        "label": "Criterio",
        "campos": [
          {
            "clave": "codigoDeCriterio",
            "label": "Código de criterio",
            "t": "ro"
          },
          {
            "clave": "descripcion",
            "label": "Descripción",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "fecInicio",
            "label": "Fec. inicio",
            "t": "date"
          },
          {
            "clave": "fecFin",
            "label": "Fec. fin",
            "t": "date"
          },
          {
            "clave": "tipoDeRecaudo",
            "label": "Tipo de recaudo",
            "t": "sel",
            "opts": [
              "035 — RM PAPELETAS ADMINISTRATIVAS",
              "003 — RS PAPELETAS DE TRÁNSITO"
            ]
          },
          {
            "clave": "vencimiento",
            "label": "Vencimiento",
            "t": "date"
          },
          {
            "clave": "oficina",
            "label": "Oficina",
            "t": "sel",
            "opts": [
              "113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA",
              "113100 — SUBGERENCIA DE RECAUDACIÓN",
              "999999 — OFICINA NO ESPECIFICADA"
            ],
            "ancho": true
          }
        ]
      },
      {
        "label": "Recaudo / papeletas",
        "campos": [
          {
            "clave": "papeleta",
            "label": "Papeleta",
            "t": "text"
          },
          {
            "clave": "placaEstablecimiento",
            "label": "Placa / establecimiento",
            "t": "text"
          }
        ],
        "hint": "Buscar papeletas y agregar al criterio"
      }
    ],
    "tabla": {
      "title": "Criterios registrados",
      "cols": [
        "Cod. Criterio",
        "Descripción",
        "Tipo Rec.",
        "Fec. Ini.",
        "Fec. Fin.",
        "Est."
      ],
      "claves": [
        "codCriterio",
        "descripcion",
        "tipoRec",
        "fecIni",
        "fecFin",
        "est"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Procesar",
      "Anular",
      "Imprimir"
    ]
  },
  "adm_estado_cuenta": {
    "id": "adm_estado_cuenta",
    "mod": "Infracciones administrativas",
    "title": "Estado de cuenta de papeleta administrativa",
    "endpoint": "GET /api/v1/infracciones/administrativas/estado-cuenta",
    "desc": "Deuda de una papeleta administrativa con su insoluto, reajuste, interés y gastos, y el importe con beneficio vigente.",
    "filtros": [
      {
        "clave": "papeleta",
        "label": "Papeleta",
        "t": "text"
      },
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "fechaDeCalculo",
        "label": "Fecha de cálculo",
        "t": "date"
      },
      {
        "clave": "incluirGastos",
        "label": "Incluir gastos",
        "t": "sel",
        "opts": [
          "SÍ",
          "NO"
        ]
      }
    ],
    "tabla": {
      "title": "Detalle de la deuda",
      "cols": [
        "Concepto",
        "Cuota",
        "Vencimiento",
        "Insoluto S/",
        "Interés S/",
        "Gastos S/",
        "Total S/"
      ],
      "claves": [
        "concepto",
        "cuota",
        "vencimiento",
        "insolutoS",
        "interesS",
        "gastosS",
        "totalS"
      ],
      "num": [
        3,
        4,
        5,
        6
      ],
      "note": "Insoluto 2,675.00 · Reajuste 0.00 · Interés 138.60 · Gastos 10.80"
    },
    "acciones": [
      "Imprimir",
      "Voucher de pago"
    ]
  },
  "adm_resolucion_gerencia": {
    "id": "adm_resolucion_gerencia",
    "mod": "Infracciones administrativas",
    "title": "Resolución de gerencia",
    "endpoint": "POST /api/v1/infracciones/administrativas/resoluciones",
    "kind": "report",
    "desc": "Resolución que resuelve el procedimiento sancionador y determina la multa administrativa exigible.",
    "reporte": {
      "title": "Resolución de gerencia",
      "subtitle": "Procedimiento administrativo sancionador — multa administrativa",
      "cols": [
        "Concepto",
        "Base legal",
        "Importe S/"
      ],
      "num": [
        2
      ]
    }
  },
  "adm_notificacion_resolucion": {
    "id": "adm_notificacion_resolucion",
    "mod": "Infracciones administrativas",
    "title": "Notificación de resolución de gerencia",
    "endpoint": "POST /api/v1/infracciones/administrativas/resoluciones/{id}/notificacion",
    "kind": "report",
    "desc": "Cédula de notificación de la resolución de gerencia, con el acuse de recibo y los datos del notificador y testigos.",
    "reporte": {
      "title": "Notificación de resolución de gerencia",
      "subtitle": "Cédula de notificación — Ley 27444",
      "cols": [
        "Dato del acto de notificación",
        "Detalle"
      ],
      "num": []
    }
  },
  "adm_reportes": {
    "id": "adm_reportes",
    "mod": "Infracciones administrativas",
    "title": "Reportes de infracción administrativa",
    "endpoint": "POST /api/v1/infracciones/administrativas/reportes",
    "desc": "Emisor de los reportes del módulo de papeletas administrativas. El tipo de reporte habilita los criterios y el destino puede ser pantalla, impresora o Excel.",
    "secciones": [
      {
        "label": "Tipo de reporte",
        "campos": [
          {
            "clave": "reporte",
            "label": "Reporte",
            "t": "sel",
            "opts": [
              "RELACIÓN DE NOTIFICACIONES POR MES",
              "PADRÓN DE NOTIFICACIONES",
              "NOTIFICACIONES VENCIDAS",
              "NOTIFICACIONES POR CONTRIBUYENTE",
              "PADRÓN DE PAPELETAS",
              "PAPELETAS POR INFRACCIÓN",
              "ESTADO DE CUENTA PAPELETA",
              "RESOLUCIONES DE GERENCIA",
              "NOTIFICACIÓN DE RESOLUCIÓN",
              "RESUMEN RECAUDACIÓN"
            ],
            "ancho": true
          }
        ]
      },
      {
        "label": "Criterios",
        "campos": [
          {
            "clave": "serie",
            "label": "Serie",
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
            "clave": "numero",
            "label": "Número",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "(TODOS)",
              "NOTIFICADA",
              "VENCIDA",
              "SUBSANADA",
              "CON PAPELETA",
              "ANULADA"
            ]
          },
          {
            "clave": "deuda",
            "label": "Deuda",
            "t": "sel",
            "opts": [
              "(TODOS)",
              "PENDIENTE",
              "A CUENTA",
              "CANCELADA",
              "FRACCIONADA",
              "ANULADA"
            ]
          },
          {
            "clave": "ciiu",
            "label": "CIIU",
            "t": "text"
          },
          {
            "clave": "infraccion",
            "label": "Infracción",
            "t": "text"
          },
          {
            "clave": "vence",
            "label": "Vence",
            "t": "text"
          },
          {
            "clave": "infractor",
            "label": "Infractor",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "fiscalizador",
            "label": "Fiscalizador",
            "t": "sel",
            "opts": [
              "(TODOS)",
              "RETO SANTOS, VÍCTOR",
              "RÍOS MENDOZA, MARÍA",
              "QUISPE PEÑA, JORGE"
            ],
            "ancho": true
          },
          {
            "clave": "direccionDelPredio",
            "label": "Dirección del predio",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "rangoDesde",
            "label": "Rango desde",
            "t": "date"
          },
          {
            "clave": "rangoHasta",
            "label": "Rango hasta",
            "t": "date"
          },
          {
            "clave": "registradasDesde",
            "label": "Registradas desde",
            "t": "date"
          },
          {
            "clave": "registradasHasta",
            "label": "Registradas hasta",
            "t": "date"
          }
        ]
      }
    ],
    "acciones": [
      "Exportar",
      "Imprimir",
      "Pantalla",
      "Cancelar"
    ]
  },
  "adm_padron_notificaciones": {
    "id": "adm_padron_notificaciones",
    "mod": "Infracciones administrativas",
    "title": "Padrón de notificaciones",
    "endpoint": "GET /api/v1/infracciones/administrativas/reportes/padron-notificaciones",
    "desc": "Relación de las notificaciones emitidas por el sistema y el estado de la deuda cuando ya existe papeleta.",
    "filtros": [
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
        "clave": "agrupadoPor",
        "label": "Agrupado por",
        "t": "sel",
        "opts": [
          "MES",
          "FISCALIZADOR",
          "INFRACCIÓN",
          "CIIU"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "NOTIFICADA",
          "VENCIDA",
          "SUBSANADA",
          "CON PAPELETA"
        ]
      }
    ],
    "tabla": {
      "title": "Notificaciones del periodo",
      "cols": [
        "Serie-Nº",
        "Fecha",
        "Infractor",
        "Infracción",
        "Fiscalizador",
        "Vence",
        "Papeleta",
        "Deuda S/"
      ],
      "claves": [
        "serieN",
        "fecha",
        "infractor",
        "infraccion",
        "fiscalizador",
        "vence",
        "papeleta",
        "deudaS"
      ],
      "num": [
        7
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "adm_notificaciones_vencidas": {
    "id": "adm_notificaciones_vencidas",
    "mod": "Infracciones administrativas",
    "title": "Notificaciones vencidas",
    "endpoint": "GET /api/v1/infracciones/administrativas/reportes/vencidas",
    "desc": "Notificaciones cuyo plazo de subsanación venció sin acreditarse el cumplimiento; habilitan la generación de la papeleta administrativa.",
    "filtros": [
      {
        "clave": "vencidasAl",
        "label": "Vencidas al",
        "t": "date"
      },
      {
        "clave": "fiscalizador",
        "label": "Fiscalizador",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "RETO SANTOS, VÍCTOR",
          "RÍOS MENDOZA, MARÍA",
          "QUISPE PEÑA, JORGE"
        ]
      },
      {
        "clave": "infraccion",
        "label": "Infracción",
        "t": "text"
      },
      {
        "clave": "conPapeleta",
        "label": "Con papeleta",
        "t": "sel",
        "opts": [
          "TODAS",
          "SÍ",
          "NO"
        ]
      }
    ],
    "tabla": {
      "title": "Notificaciones vencidas sin papeleta",
      "cols": [
        "Serie-Nº",
        "Fecha",
        "Infractor",
        "Dirección",
        "Infracción",
        "Venció",
        "Días vencidos"
      ],
      "claves": [
        "serieN",
        "fecha",
        "infractor",
        "direccion",
        "infraccion",
        "vencio",
        "diasVencidos"
      ],
      "num": [
        6
      ]
    },
    "acciones": [
      "Generar papeleta",
      "Imprimir",
      "Excel"
    ]
  },
  "adm_notificaciones_contribuyente": {
    "id": "adm_notificaciones_contribuyente",
    "mod": "Infracciones administrativas",
    "title": "Notificaciones por contribuyente",
    "endpoint": "GET /api/v1/infracciones/administrativas/reportes/por-contribuyente",
    "desc": "Papeletas administrativas agrupadas por año y mes de cometida la infracción, con el estado de la multa y los datos de su pago.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "ano",
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
      },
      {
        "clave": "estadoDeDeuda",
        "label": "Estado de deuda",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "PENDIENTE",
          "A CUENTA",
          "CANCELADA",
          "FRACCIONADA",
          "ANULADA"
        ]
      },
      {
        "clave": "agrupadoPor",
        "label": "Agrupado por",
        "t": "sel",
        "opts": [
          "AÑO Y MES",
          "INFRACCIÓN",
          "ESTADO"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas del contribuyente",
      "cols": [
        "Año",
        "Mes",
        "Papeleta",
        "Infracción",
        "Multa S/",
        "Recibo",
        "Fec. pago",
        "Estado"
      ],
      "claves": [
        "ano",
        "mes",
        "papeleta",
        "infraccion",
        "multaS",
        "recibo",
        "fecPago",
        "estado"
      ],
      "num": [
        4
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "adm_resumen_recaudacion": {
    "id": "adm_resumen_recaudacion",
    "mod": "Infracciones administrativas",
    "title": "Resumen de recaudación de papeletas",
    "endpoint": "GET /api/v1/infracciones/administrativas/reportes/resumen-recaudacion",
    "desc": "Recaudación por multas administrativas por año y mes, diferenciando cobranza ordinaria, coactiva y por convenio.",
    "filtros": [
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
        "clave": "agrupadoPor",
        "label": "Agrupado por",
        "t": "sel",
        "opts": [
          "MES",
          "INFRACCIÓN",
          "TIPO DE COBRANZA"
        ]
      },
      {
        "clave": "tipoDeCobranza",
        "label": "Tipo de cobranza",
        "t": "sel",
        "opts": [
          "Todas",
          "ORDINARIA",
          "COACTIVA",
          "CONVENIO"
        ]
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
    ],
    "tabla": {
      "title": "Recaudación por mes",
      "cols": [
        "Mes",
        "Papeletas pagadas",
        "Ordinaria S/",
        "Coactiva S/",
        "Convenios S/",
        "Total S/"
      ],
      "claves": [
        "mes",
        "papeletasPagadas",
        "ordinariaS",
        "coactivaS",
        "conveniosS",
        "totalS"
      ],
      "num": [
        1,
        2,
        3,
        4,
        5
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  }
};
