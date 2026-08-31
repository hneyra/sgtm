/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 23 pantallas de Tránsito: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "papeletas": {
    "id": "papeletas",
    "mod": "Tránsito",
    "title": "Papeletas de infracción de tránsito",
    "endpoint": "GET /api/v1/transito/papeletas",
    "desc": "Papeletas levantadas por el inspector municipal, con el código del Reglamento Nacional de Tránsito, la sanción en porcentaje de UIT y la medida preventiva aplicada.",
    "filtros": [
      {
        "clave": "nroPapeleta",
        "label": "Nro. Papeleta",
        "t": "text"
      },
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "documentoDelInfractor",
        "label": "Documento del infractor",
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
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todas",
          "PENDIENTE",
          "PAGADA",
          "CON DESCARGO",
          "FIRME",
          "COACTIVA",
          "ANULADA"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Datos de la papeleta",
        "secciones": [
          {
            "label": "Intervención",
            "campos": [
              {
                "clave": "nroPapeleta2",
                "label": "Nro. Papeleta",
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
                "clave": "lugarDeLaIntervencion",
                "label": "Lugar de la intervención",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "inspectorMunicipal",
                "label": "Inspector municipal",
                "t": "sel",
                "opts": [
                  "A. VÍLCHEZ ROJAS",
                  "L. PEÑA SANDOVAL",
                  "J. RUIZ PALACIOS"
                ]
              },
              {
                "clave": "nDeCredencial",
                "label": "Nº de credencial",
                "t": "ro"
              },
              {
                "clave": "supervisor",
                "label": "Supervisor",
                "t": "sel",
                "opts": [
                  "C. ANCAJIMA FLORES",
                  "R. MENDOZA CRUZ"
                ]
              }
            ]
          },
          {
            "label": "Infractor y vehículo",
            "campos": [
              {
                "clave": "documento",
                "label": "Documento",
                "t": "text"
              },
              {
                "clave": "nombreDelInfractor",
                "label": "Nombre del infractor",
                "t": "ro"
              },
              {
                "clave": "nroDeLicencia",
                "label": "Nro. de licencia",
                "t": "text"
              },
              {
                "clave": "claseCategoria",
                "label": "Clase / categoría",
                "t": "sel",
                "opts": [
                  "A-I",
                  "A-IIa",
                  "A-IIb",
                  "A-IIIa"
                ]
              },
              {
                "clave": "placa2",
                "label": "Placa",
                "t": "text"
              },
              {
                "clave": "claseDeVehiculo",
                "label": "Clase de vehículo",
                "t": "sel",
                "opts": [
                  "AUTOMÓVIL",
                  "CAMIONETA",
                  "MOTOCICLETA",
                  "ÓMNIBUS",
                  "CAMIÓN",
                  "MOTOTAXI"
                ]
              },
              {
                "clave": "propietarioDelVehiculo",
                "label": "Propietario del vehículo",
                "t": "ro"
              },
              {
                "clave": "empresaDeTransporte",
                "label": "Empresa de transporte",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Infracción y sanción",
        "secciones": [
          {
            "label": "Sanción",
            "campos": [
              {
                "clave": "codigoDeInfraccion",
                "label": "Código de infracción",
                "t": "sel",
                "opts": [
                  "M-02",
                  "M-08",
                  "G-40",
                  "G-58",
                  "L-11"
                ]
              },
              {
                "clave": "descripcion",
                "label": "Descripción",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "gravedad",
                "label": "Gravedad",
                "t": "ro"
              },
              {
                "clave": "baseUitS",
                "label": "Base UIT (S/)",
                "t": "ro"
              },
              {
                "clave": "porcentajeDeUit",
                "label": "Porcentaje de UIT",
                "t": "ro"
              },
              {
                "clave": "valorDeLaMultaS",
                "label": "Valor de la multa (S/)",
                "t": "ro"
              },
              {
                "clave": "puntosAcumulados",
                "label": "Puntos acumulados",
                "t": "ro"
              },
              {
                "clave": "medidaPreventiva",
                "label": "Medida preventiva",
                "t": "sel",
                "opts": [
                  "NINGUNA",
                  "RETENCIÓN DE LICENCIA",
                  "INTERNAMIENTO DEL VEHÍCULO",
                  "REMOCIÓN DEL VEHÍCULO"
                ]
              },
              {
                "clave": "depositoMunicipal",
                "label": "Depósito municipal",
                "t": "sel",
                "opts": [
                  "NO APLICA",
                  "DEPÓSITO SULLANA NORTE",
                  "DEPÓSITO BELLAVISTA"
                ]
              },
              {
                "clave": "descuentoPorProntoPago5Dias",
                "label": "Descuento por pronto pago (5 días)",
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
            "label": "Estado del pago",
            "campos": [
              {
                "clave": "cancelo",
                "label": "Canceló",
                "t": "chk",
                "ph": "Papeleta pagada"
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
                "clave": "importePagadoS",
                "label": "Importe pagado (S/)",
                "t": "ro"
              },
              {
                "clave": "anulo",
                "label": "Anuló",
                "t": "chk",
                "ph": "Papeleta anulada"
              },
              {
                "clave": "referenciaDeAnulacion",
                "label": "Referencia de anulación",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "motivoDeAnulacion",
                "label": "Motivo de anulación",
                "t": "sel",
                "opts": [
                  "—",
                  "ERROR EN EL REGISTRO",
                  "DESCARGO FUNDADO",
                  "DUPLICADA",
                  "RESOLUCIÓN JUDICIAL"
                ]
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Observaciones",
        "secciones": [
          {
            "label": "Notas de la intervención",
            "campos": [
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "area",
                "ph": "Detalle de la intervención y firmas",
                "ancho": true
              }
            ],
            "hint": "Opcional"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas encontradas",
      "cols": [
        "Nro. Papeleta",
        "Fecha",
        "Placa",
        "Infractor",
        "Código",
        "Gravedad",
        "Multa S/",
        "Estado"
      ],
      "claves": [
        "nroPapeleta",
        "fecha",
        "placa",
        "infractor",
        "codigo",
        "gravedad",
        "multaS",
        "estado"
      ],
      "num": [
        6
      ]
    },
    "acciones": [
      "Nuevo",
      "Notificar",
      "Imprimir",
      "Guardar"
    ]
  },
  "transito_busqueda": {
    "id": "transito_busqueda",
    "mod": "Tránsito",
    "title": "Búsqueda de infracciones",
    "endpoint": "GET /api/v1/transito/papeletas/busqueda",
    "desc": "Búsqueda avanzada de papeletas por número, placa, infractor, propietario, rango de fechas y estado de deuda. Muestra el estado de coactiva, el último pago y el usuario que registró la papeleta.",
    "filtros": [
      {
        "clave": "papeleta",
        "label": "Papeleta",
        "t": "text"
      },
      {
        "clave": "nPlaca",
        "label": "Nº Placa",
        "t": "text"
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
        "clave": "ingresadoPor",
        "label": "Ingresado por",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Búsqueda avanzada",
        "campos": [
          {
            "clave": "conductorCodigo",
            "label": "Conductor — código",
            "t": "text"
          },
          {
            "clave": "conductorNombre",
            "label": "Conductor — nombre",
            "t": "text"
          },
          {
            "clave": "propietarioCodigo",
            "label": "Propietario — código",
            "t": "text"
          },
          {
            "clave": "propietarioNombre",
            "label": "Propietario — nombre",
            "t": "text"
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
    "tabla": {
      "title": "Papeletas encontradas",
      "cols": [
        "A.Coa",
        "Coact",
        "Fec. Reg.",
        "Deuda",
        "Serie",
        "Número",
        "Placa",
        "Fecha",
        "Infracción",
        "Conductor",
        "Importe",
        "A pagar"
      ],
      "claves": [
        "aCoa",
        "coact",
        "fecReg",
        "deuda",
        "serie",
        "numero",
        "placa",
        "fecha",
        "infraccion",
        "conductor",
        "importe",
        "aPagar"
      ],
      "num": [
        10,
        11
      ],
      "note": "Total pendiente — importe S/ 175.00 · a pagar S/ 52.50 · con beneficio S/ 52.50"
    },
    "acciones": [
      "Buscar",
      "Limpiar",
      "Ver propietario y pagos",
      "Excel"
    ]
  },
  "codigos_transito": {
    "id": "codigos_transito",
    "mod": "Tránsito",
    "title": "Tabla de códigos de infracción de tránsito",
    "endpoint": "GET /api/v1/transito/codigos",
    "desc": "Catálogo del Reglamento Nacional de Tránsito con la sanción, los puntos y la medida preventiva que el sistema aplica al registrar cada papeleta.",
    "filtros": [
      {
        "clave": "codigo",
        "label": "Código",
        "t": "text"
      },
      {
        "clave": "gravedad",
        "label": "Gravedad",
        "t": "sel",
        "opts": [
          "Todas",
          "MUY GRAVE",
          "GRAVE",
          "LEVE"
        ]
      },
      {
        "clave": "textoDeLaInfraccion",
        "label": "Texto de la infracción",
        "t": "text"
      }
    ],
    "tabla": {
      "title": "Códigos vigentes",
      "cols": [
        "Código",
        "Descripción",
        "Gravedad",
        "% UIT",
        "Multa S/",
        "Puntos",
        "Medida preventiva"
      ],
      "claves": [
        "codigo",
        "descripcion",
        "gravedad",
        "uit",
        "multaS",
        "puntos",
        "medidaPreventiva"
      ],
      "num": [
        3,
        4,
        5
      ]
    },
    "acciones": [
      "Nuevo código",
      "Guardar"
    ]
  },
  "transito_descargos": {
    "id": "transito_descargos",
    "mod": "Tránsito",
    "title": "Descargos y reclamos de papeletas",
    "endpoint": "POST /api/v1/transito/descargos",
    "desc": "Escrito de descargo presentado dentro del plazo, su evaluación y la resolución que declara fundada o infundada la impugnación.",
    "filtros": [
      {
        "clave": "nDeExpediente",
        "label": "Nº de expediente",
        "t": "text"
      },
      {
        "clave": "papeleta",
        "label": "Papeleta",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "EN EVALUACIÓN",
          "FUNDADO",
          "INFUNDADO",
          "IMPROCEDENTE"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Solicitud",
        "campos": [
          {
            "clave": "nDeExpediente2",
            "label": "Nº de expediente",
            "t": "ro"
          },
          {
            "clave": "papeletaImpugnada",
            "label": "Papeleta impugnada",
            "t": "text"
          },
          {
            "clave": "fechaDePresentacion",
            "label": "Fecha de presentación",
            "t": "date"
          },
          {
            "clave": "dentroDelPlazo5DiasHabiles",
            "label": "Dentro del plazo (5 días hábiles)",
            "t": "chk",
            "ph": "Presentado en plazo"
          },
          {
            "clave": "tipoDeRecurso",
            "label": "Tipo de recurso",
            "t": "sel",
            "opts": [
              "DESCARGO",
              "RECONSIDERACIÓN",
              "APELACIÓN",
              "NULIDAD"
            ]
          },
          {
            "clave": "fundamentoDelAdministrado",
            "label": "Fundamento del administrado",
            "t": "area",
            "ancho": true
          }
        ]
      },
      {
        "label": "Evaluación y resolución",
        "campos": [
          {
            "clave": "areaEvaluadora",
            "label": "Área evaluadora",
            "t": "sel",
            "opts": [
              "SUBGERENCIA DE TRÁNSITO",
              "GERENCIA DE ADMINISTRACIÓN TRIBUTARIA",
              "EJECUTORÍA COACTIVA"
            ]
          },
          {
            "clave": "nDeResolucion",
            "label": "Nº de resolución",
            "t": "text"
          },
          {
            "clave": "fechaDeResolucion",
            "label": "Fecha de resolución",
            "t": "date"
          },
          {
            "clave": "sentidoDelFallo",
            "label": "Sentido del fallo",
            "t": "sel",
            "opts": [
              "FUNDADO",
              "INFUNDADO",
              "IMPROCEDENTE",
              "FUNDADO EN PARTE"
            ]
          },
          {
            "clave": "efectoSobreLaMulta",
            "label": "Efecto sobre la multa",
            "t": "sel",
            "opts": [
              "SE MANTIENE",
              "SE DEJA SIN EFECTO",
              "SE REDUCE"
            ]
          },
          {
            "clave": "sustentoDeLaResolucion",
            "label": "Sustento de la resolución",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Registrar descargo",
      "Resolver",
      "Notificar al administrado"
    ]
  },
  "internamiento": {
    "id": "internamiento",
    "mod": "Tránsito",
    "title": "Internamiento vehicular",
    "endpoint": "GET /api/v1/transito/internamientos",
    "desc": "Control de vehículos en el depósito municipal, con el cómputo diario de la tasa de custodia y los requisitos para la liberación.",
    "filtros": [
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "deposito",
        "label": "Depósito",
        "t": "sel",
        "opts": [
          "Todos",
          "DEPÓSITO SULLANA NORTE",
          "DEPÓSITO BELLAVISTA"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "INTERNADO",
          "LIBERADO",
          "EN ABANDONO"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Liberación del vehículo",
        "campos": [
          {
            "clave": "placa2",
            "label": "Placa",
            "t": "text"
          },
          {
            "clave": "fechaDeLiberacion",
            "label": "Fecha de liberación",
            "t": "date"
          },
          {
            "clave": "multaCancelada",
            "label": "Multa cancelada",
            "t": "chk",
            "ph": "Recibo de la papeleta"
          },
          {
            "clave": "custodiaCancelada",
            "label": "Custodia cancelada",
            "t": "chk",
            "ph": "Recibo de la tasa diaria"
          },
          {
            "clave": "soatVigenteAcreditado",
            "label": "SOAT vigente acreditado",
            "t": "chk",
            "ph": "Copia del certificado"
          },
          {
            "clave": "personaQueRetira",
            "label": "Persona que retira",
            "t": "text"
          },
          {
            "clave": "documentoDeQuienRetira",
            "label": "Documento de quien retira",
            "t": "text"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Vehículos en depósito",
      "cols": [
        "Placa",
        "Papeleta",
        "Fecha de ingreso",
        "Días",
        "Tasa diaria S/",
        "Custodia S/",
        "Estado"
      ],
      "claves": [
        "placa",
        "papeleta",
        "fechaDeIngreso",
        "dias",
        "tasaDiariaS",
        "custodiaS",
        "estado"
      ],
      "num": [
        3,
        4,
        5
      ],
      "note": "Para liberar el vehículo el administrado debe cancelar la multa, la tasa de custodia y acreditar la titularidad y el SOAT vigente."
    },
    "acciones": [
      "Registrar ingreso",
      "Liberar vehículo"
    ]
  },
  "transito_documentos": {
    "id": "transito_documentos",
    "mod": "Tránsito",
    "title": "Emisión de resoluciones y otros documentos",
    "endpoint": "GET /api/v1/transito/papeletas/{numero}/actos",
    "desc": "Registra los documentos emitidos por papeleta y conserva la secuencia del trámite, incluido el archivo digital de cada acto administrativo.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "papeletaN",
        "label": "Papeleta Nº",
        "t": "text"
      },
      {
        "clave": "placaN",
        "label": "Placa Nº",
        "t": "text"
      },
      {
        "clave": "expediente",
        "label": "Expediente",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Datos principales",
        "campos": [
          {
            "clave": "placa",
            "label": "Placa",
            "t": "ro"
          },
          {
            "clave": "papeletaN2",
            "label": "Papeleta Nº",
            "t": "ro"
          },
          {
            "clave": "fecPapeleta",
            "label": "Fec. papeleta",
            "t": "date"
          },
          {
            "clave": "exped",
            "label": "Exped.",
            "t": "text"
          },
          {
            "clave": "fecExp",
            "label": "Fec. exp.",
            "t": "date"
          },
          {
            "clave": "infraccion",
            "label": "Infracción",
            "t": "ro",
            "ancho": true
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
          }
        ]
      },
      {
        "label": "Descargo e informe",
        "campos": [
          {
            "clave": "fecSolicitud",
            "label": "Fec. solicitud",
            "t": "date"
          },
          {
            "clave": "argumento",
            "label": "Argumento",
            "t": "area",
            "ancho": true
          },
          {
            "clave": "informeN",
            "label": "Informe Nº",
            "t": "text"
          },
          {
            "clave": "fecInforme",
            "label": "Fec. informe",
            "t": "date"
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
              "RESOLUCIÓN",
              "NOTIFICACIÓN",
              "INFORME",
              "CARTA",
              "MEMORANDO"
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
      "title": "Papeletas con expediente",
      "cols": [
        "Placa",
        "Papeleta",
        "Expediente",
        "Código",
        "Obligado"
      ],
      "claves": [
        "placa",
        "papeleta",
        "expediente",
        "codigo",
        "obligado"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Deshacer",
      "Imprimir"
    ]
  },
  "transito_valores": {
    "id": "transito_valores",
    "mod": "Tránsito",
    "title": "Generación de valores de tránsito",
    "endpoint": "POST /api/v1/transito/valores/generacion-masiva",
    "desc": "Genera masivamente los valores por papeletas de tránsito pendientes de pago. El criterio define el tipo de recaudo, la oficina y el vencimiento; las papeletas se agregan por selección o manualmente.",
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
              "003 — RS PAPELETAS DE TRÁNSITO",
              "035 — RM PAPELETAS ADMINISTRATIVAS",
              "081 — RM LICENCIA FUNCIONAMIENTO"
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
            "clave": "placa",
            "label": "Placa",
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
  "transito_cambio_numero": {
    "id": "transito_cambio_numero",
    "mod": "Tránsito",
    "title": "Cambio de número de papeleta de tránsito",
    "endpoint": "PATCH /api/v1/transito/papeletas/{numero}/codigo",
    "desc": "Corrige el número de papeleta o el número de placa registrados, cuando hubo error del operador al momento del registro.",
    "secciones": [
      {
        "label": "Actualización de cod. papeleta",
        "campos": [
          {
            "clave": "placaN",
            "label": "Placa Nº",
            "t": "text"
          },
          {
            "clave": "codPapeleta",
            "label": "Cod. papeleta",
            "t": "text"
          },
          {
            "clave": "placaNueva",
            "label": "Placa nueva",
            "t": "text"
          },
          {
            "clave": "codPapeletaNueva",
            "label": "Cod. papeleta nueva",
            "t": "text"
          }
        ]
      }
    ],
    "acciones": [
      "Consultar",
      "Modificar",
      "Salir"
    ]
  },
  "transito_reportes": {
    "id": "transito_reportes",
    "mod": "Tránsito",
    "title": "Reportes de infracción de tránsito",
    "endpoint": "POST /api/v1/transito/reportes",
    "desc": "Emisor de los reportes del módulo de tránsito. El tipo de reporte habilita los criterios que corresponden y el destino puede ser pantalla, impresora o Excel.",
    "secciones": [
      {
        "label": "Tipo de reporte",
        "campos": [
          {
            "clave": "reporte",
            "label": "Reporte",
            "t": "sel",
            "opts": [
              "RECORD DE CONDUCTOR",
              "RECORD VEHICULAR",
              "CONSTANCIA LIBRE DE INFRACCIONES",
              "PADRÓN DE PAPELETAS DE INFRACCIÓN",
              "ESTADO DE CUENTA DE INFRACCIONES",
              "PAPELETA DE INFRACCIÓN",
              "RESOLUCIÓN DE GERENCIA ORDINARIA",
              "PAPELETAS ENVIADAS A COACTIVAS",
              "RESOLUCIÓN DE GERENCIA SANCIONADA",
              "NOTIFICACIÓN",
              "RELACIÓN CONSTANCIAS LIBRE DE INFRAC.",
              "RESUMEN RECAUDACIÓN",
              "RESUMEN PAPEL. PENDIENTES Y PAGADAS",
              "RESUMEN POR CÓDIGO INFRACCIÓN",
              "RESUMEN POR PLACA (2 LETRAS)"
            ],
            "ancho": true
          }
        ]
      },
      {
        "label": "Criterios",
        "campos": [
          {
            "clave": "nPapeletaSerie",
            "label": "Nº papeleta — serie",
            "t": "text"
          },
          {
            "clave": "nPapeletaAno",
            "label": "Nº papeleta — año",
            "t": "text"
          },
          {
            "clave": "nPapeletaNumero",
            "label": "Nº papeleta — número",
            "t": "text"
          },
          {
            "clave": "hasta",
            "label": "¿Hasta?",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
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
            "clave": "conductor",
            "label": "Conductor",
            "t": "text"
          },
          {
            "clave": "placa",
            "label": "Placa",
            "t": "text"
          },
          {
            "clave": "infraccionCodigo",
            "label": "Infracción — código",
            "t": "text"
          },
          {
            "clave": "accion",
            "label": "Acción",
            "t": "sel",
            "opts": [
              "GENERAR",
              "REIMPRIMIR",
              "ANULAR"
            ]
          },
          {
            "clave": "nConstancia",
            "label": "Nº constancia",
            "t": "text"
          },
          {
            "clave": "nRecibo",
            "label": "Nº recibo",
            "t": "text"
          },
          {
            "clave": "importeS",
            "label": "Importe S/",
            "t": "text"
          },
          {
            "clave": "usuarioQueIngreso",
            "label": "Usuario que ingresó",
            "t": "text"
          },
          {
            "clave": "fechaDesde",
            "label": "Fecha desde",
            "t": "date"
          },
          {
            "clave": "fechaHasta",
            "label": "Fecha hasta",
            "t": "date"
          },
          {
            "clave": "fechaDeIngresoDesde",
            "label": "Fecha de ingreso desde",
            "t": "date"
          },
          {
            "clave": "fechaDeIngresoHasta",
            "label": "Fecha de ingreso hasta",
            "t": "date"
          },
          {
            "clave": "ordenacion",
            "label": "Ordenación",
            "t": "sel",
            "opts": [
              "FECHA DE INFRACCIÓN",
              "Nº DE PAPELETA",
              "PLACA",
              "CONDUCTOR",
              "IMPORTE"
            ]
          },
          {
            "clave": "agrupadoPor",
            "label": "Agrupado por",
            "t": "sel",
            "opts": [
              "MES",
              "AÑO",
              "CÓDIGO DE INFRACCIÓN",
              "ESTADO",
              "PLACA"
            ]
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
  "transito_record_conductor": {
    "id": "transito_record_conductor",
    "mod": "Tránsito",
    "title": "Record de conductor",
    "endpoint": "GET /api/v1/transito/reportes/record-conductor",
    "kind": "report",
    "desc": "Historial de infracciones cometidas por un conductor y el estado de deuda de cada papeleta impuesta.",
    "reporte": {
      "title": "Record de conductor",
      "subtitle": "Historial de infracciones de tránsito",
      "cols": [
        "Papeleta",
        "Fecha",
        "Placa",
        "Infracción",
        "Importe S/",
        "Estado"
      ],
      "num": [
        4
      ]
    }
  },
  "transito_record_vehicular": {
    "id": "transito_record_vehicular",
    "mod": "Tránsito",
    "title": "Record vehicular",
    "endpoint": "GET /api/v1/transito/reportes/record-vehicular",
    "kind": "report",
    "desc": "Historial de papeletas de infracción de tránsito de un solo vehículo, con el estado de pago de cada una.",
    "reporte": {
      "title": "Record vehicular",
      "subtitle": "Papeletas de infracción por vehículo",
      "cols": [
        "Papeleta",
        "Fecha",
        "Conductor",
        "Infracción",
        "Importe S/",
        "Estado"
      ],
      "num": [
        4
      ]
    }
  },
  "transito_constancia_libre": {
    "id": "transito_constancia_libre",
    "mod": "Tránsito",
    "title": "Constancia libre de infracciones",
    "endpoint": "POST /api/v1/transito/constancias-libres",
    "kind": "report",
    "desc": "Documento con el que la municipalidad acredita que un vehículo no registra papeletas de tránsito pendientes de pago.",
    "reporte": {
      "title": "Constancia libre de infracciones",
      "subtitle": "Emitida por la Subgerencia de Fiscalización y Control de Tránsito",
      "cols": [
        "Concepto",
        "Periodo verificado",
        "Papeletas",
        "Situación"
      ],
      "num": [
        2
      ]
    }
  },
  "transito_padron": {
    "id": "transito_padron",
    "mod": "Tránsito",
    "title": "Padrón de papeletas de tránsito",
    "endpoint": "GET /api/v1/transito/reportes/padron",
    "desc": "Listado de las papeletas registradas en un intervalo de fechas, filtrable por estado de deuda, infracción y placa.",
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
        "clave": "estado",
        "label": "Estado",
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
        "clave": "ordenadoPor",
        "label": "Ordenado por",
        "t": "sel",
        "opts": [
          "FECHA",
          "Nº PAPELETA",
          "PLACA",
          "IMPORTE"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas del periodo",
      "cols": [
        "Papeleta",
        "Fec. infracción",
        "Placa",
        "Conductor",
        "Infracción",
        "Importe S/",
        "A pagar S/",
        "Estado"
      ],
      "claves": [
        "papeleta",
        "fecInfraccion",
        "placa",
        "conductor",
        "infraccion",
        "importeS",
        "aPagarS",
        "estado"
      ],
      "num": [
        5,
        6
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "transito_estado_cuenta": {
    "id": "transito_estado_cuenta",
    "mod": "Tránsito",
    "title": "Estado de cuenta de infracciones",
    "endpoint": "GET /api/v1/transito/estado-cuenta",
    "desc": "Papeletas pendientes de pago de un conductor o de un vehículo, con importe, beneficio aplicable y situación de coactiva.",
    "filtros": [
      {
        "clave": "conductor",
        "label": "Conductor",
        "t": "text"
      },
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
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
        "clave": "fechaDeCalculo",
        "label": "Fecha de cálculo",
        "t": "date"
      }
    ],
    "tabla": {
      "title": "Deuda por papeletas",
      "cols": [
        "Papeleta",
        "Fecha",
        "Infracción",
        "Importe S/",
        "Descuento %",
        "A pagar S/",
        "Coactiva",
        "Estado"
      ],
      "claves": [
        "papeleta",
        "fecha",
        "infraccion",
        "importeS",
        "descuento",
        "aPagarS",
        "coactiva",
        "estado"
      ],
      "num": [
        3,
        4,
        5
      ],
      "note": "Importe S/ 175.00 · a pagar S/ 52.50 · con beneficio S/ 52.50"
    },
    "acciones": [
      "Imprimir",
      "Voucher de pago"
    ]
  },
  "transito_papeleta_reporte": {
    "id": "transito_papeleta_reporte",
    "mod": "Tránsito",
    "title": "Reporte papeleta de infracción",
    "endpoint": "GET /api/v1/transito/papeletas/{numero}/hoja-informativa",
    "kind": "report",
    "desc": "Hoja informativa que resume la información relevante de una papeleta de infracción de tránsito.",
    "reporte": {
      "title": "Papeleta de infracción de tránsito",
      "subtitle": "Hoja informativa de la infracción impuesta",
      "cols": [
        "Concepto",
        "Detalle",
        "Importe S/"
      ],
      "num": [
        2
      ]
    }
  },
  "transito_rg_ordinaria": {
    "id": "transito_rg_ordinaria",
    "mod": "Tránsito",
    "title": "Resolución de gerencia ordinaria",
    "endpoint": "POST /api/v1/transito/resoluciones/ordinaria",
    "kind": "report",
    "desc": "Resolución que emite la municipalidad para la cobranza de la papeleta. De no cancelarse, el documento pasa al área de cobranza coactiva.",
    "reporte": {
      "title": "Resolución de gerencia",
      "subtitle": "Cobranza ordinaria de papeleta de infracción de tránsito",
      "cols": [
        "Concepto",
        "Periodo",
        "Importe S/"
      ],
      "num": [
        2
      ]
    }
  },
  "transito_rg_sancionadora": {
    "id": "transito_rg_sancionadora",
    "mod": "Tránsito",
    "title": "Resolución de gerencia sancionadora",
    "endpoint": "POST /api/v1/transito/resoluciones/sancionadora",
    "kind": "report",
    "desc": "Segunda resolución, emitida luego de la ordinaria. Tiene carácter sancionador y se deriva a la Dirección General de Transportes.",
    "reporte": {
      "title": "Resolución de gerencia sancionadora",
      "subtitle": "Deriva la sanción a la Dirección Regional de Transportes y Comunicaciones",
      "cols": [
        "Concepto",
        "Detalle",
        "Importe S/"
      ],
      "num": [
        2
      ]
    }
  },
  "transito_padron_coactiva": {
    "id": "transito_padron_coactiva",
    "mod": "Tránsito",
    "title": "Padrón de papeletas enviadas a coactiva",
    "endpoint": "GET /api/v1/transito/reportes/padron-coactiva",
    "desc": "Control de las papeletas derivadas al área de cobranza coactiva por intervalo de fechas.",
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
        "clave": "ejecutor",
        "label": "Ejecutor",
        "t": "sel",
        "opts": [
          "Todos",
          "CHECA FERNÁNDEZ-HILTON ARTURO",
          "GARCÍA NAVARRO-MARTHA ELENA"
        ]
      },
      {
        "clave": "estadoDelExpediente",
        "label": "Estado del expediente",
        "t": "sel",
        "opts": [
          "Todos",
          "REC 01 EMITIDO",
          "NOTIFICADO",
          "MEDIDA CAUTELAR",
          "CONCLUIDO"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas en coactiva",
      "cols": [
        "Expediente",
        "Papeleta",
        "Fec. pase",
        "Placa",
        "Obligado",
        "Deuda S/",
        "Estado"
      ],
      "claves": [
        "expediente",
        "papeleta",
        "fecPase",
        "placa",
        "obligado",
        "deudaS",
        "estado"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "transito_padron_constancias": {
    "id": "transito_padron_constancias",
    "mod": "Tránsito",
    "title": "Padrón de constancias libres de infracciones",
    "endpoint": "GET /api/v1/transito/reportes/padron-constancias",
    "desc": "Padrón general de constancias libres de infracciones emitidas por la unidad competente.",
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
        "clave": "nDeConstancia",
        "label": "Nº de constancia",
        "t": "text"
      },
      {
        "clave": "usuarioQueEmitio",
        "label": "Usuario que emitió",
        "t": "sel",
        "opts": [
          "Todos",
          "VRETO",
          "MRIOS",
          "SISTEMAS"
        ]
      }
    ],
    "tabla": {
      "title": "Constancias emitidas",
      "cols": [
        "Nº constancia",
        "Fecha",
        "Placa",
        "Solicitante",
        "Recibo",
        "Importe S/",
        "Usuario"
      ],
      "claves": [
        "nConstancia",
        "fecha",
        "placa",
        "solicitante",
        "recibo",
        "importeS",
        "usuario"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "transito_resumen_recaudacion": {
    "id": "transito_resumen_recaudacion",
    "mod": "Tránsito",
    "title": "Resumen de recaudación de tránsito",
    "endpoint": "GET /api/v1/transito/reportes/resumen-recaudacion",
    "desc": "Recaudación por papeletas organizada por tipo de cobranza, año y mes.",
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
        "clave": "agrupadoPor",
        "label": "Agrupado por",
        "t": "sel",
        "opts": [
          "MES",
          "AÑO",
          "TIPO DE COBRANZA"
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
        "Ordinaria S/",
        "Coactiva S/",
        "Convenios S/",
        "Papeletas pagadas",
        "Total S/"
      ],
      "claves": [
        "mes",
        "ordinariaS",
        "coactivaS",
        "conveniosS",
        "papeletasPagadas",
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
  },
  "transito_resumen_papeletas": {
    "id": "transito_resumen_papeletas",
    "mod": "Tránsito",
    "title": "Resumen de papeletas pendientes y pagadas",
    "endpoint": "GET /api/v1/transito/reportes/resumen-papeletas",
    "desc": "Cantidades e importes de papeletas pendientes y pagadas, diferenciando cobranza ordinaria de cobranza coactiva.",
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
          "AÑO",
          "MES",
          "ESTADO",
          "CÓDIGO DE INFRACCIÓN"
        ]
      },
      {
        "clave": "cobranza",
        "label": "Cobranza",
        "t": "sel",
        "opts": [
          "Todas",
          "ORDINARIA",
          "COACTIVA"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas por año y estado",
      "cols": [
        "Año",
        "Pendientes",
        "Importe pendiente S/",
        "Pagadas",
        "Importe pagado S/",
        "En coactiva",
        "Importe coactiva S/"
      ],
      "claves": [
        "ano",
        "pendientes",
        "importePendienteS",
        "pagadas",
        "importePagadoS",
        "enCoactiva",
        "importeCoactivaS"
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
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "transito_resumen_codigo": {
    "id": "transito_resumen_codigo",
    "mod": "Tránsito",
    "title": "Resumen de papeletas por código de infracción",
    "endpoint": "GET /api/v1/transito/reportes/resumen-por-codigo",
    "desc": "Cantidades e importes de papeletas pendientes y pagadas de una infracción determinada.",
    "filtros": [
      {
        "clave": "codigoDeInfraccion",
        "label": "Código de infracción",
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
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "PENDIENTE",
          "A CUENTA",
          "CANCELADA",
          "FRACCIONADA",
          "ANULADA"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas por infracción",
      "cols": [
        "Código",
        "Descripción",
        "Pendientes",
        "Pendiente S/",
        "Pagadas",
        "Pagado S/"
      ],
      "claves": [
        "codigo",
        "descripcion",
        "pendientes",
        "pendienteS",
        "pagadas",
        "pagadoS"
      ],
      "num": [
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
  },
  "transito_resumen_placa": {
    "id": "transito_resumen_placa",
    "mod": "Tránsito",
    "title": "Resumen de papeletas por iniciales de placa",
    "endpoint": "GET /api/v1/transito/reportes/resumen-por-placa",
    "desc": "Resumen de papeletas filtrado por las dos letras iniciales del número de placa del vehículo.",
    "filtros": [
      {
        "clave": "iniciales2Letras",
        "label": "Iniciales (2 letras)",
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
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "PENDIENTE",
          "A CUENTA",
          "CANCELADA",
          "FRACCIONADA",
          "ANULADA"
        ]
      }
    ],
    "tabla": {
      "title": "Papeletas por iniciales",
      "cols": [
        "Iniciales",
        "Papeletas",
        "Pendientes",
        "Pendiente S/",
        "Pagadas",
        "Pagado S/"
      ],
      "claves": [
        "iniciales",
        "papeletas",
        "pendientes",
        "pendienteS",
        "pagadas",
        "pagadoS"
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
