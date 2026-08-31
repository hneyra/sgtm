/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 11 pantallas de Autorizaciones y licencias: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "anuncios": {
    "id": "anuncios",
    "mod": "Autorizaciones",
    "title": "Anuncio y propaganda",
    "endpoint": "GET /api/v1/autorizaciones/anuncios",
    "desc": "Autorización para instalar elementos publicitarios. La tasa resulta del área del anuncio, el número de lados y su clase.",
    "filtros": [
      {
        "clave": "nroAutorizacion",
        "label": "Nro. Autorización",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "rUC",
        "label": "R.U.C.",
        "t": "text"
      },
      {
        "clave": "nExpediente",
        "label": "Nº Expediente",
        "t": "text"
      },
      {
        "clave": "direccion",
        "label": "Dirección",
        "t": "text"
      },
      {
        "clave": "dNI",
        "label": "D.N.I.",
        "t": "text"
      }
    ],
    "tabs": [
      {
        "label": "Datos Generales",
        "secciones": [
          {
            "label": "Anuncio",
            "campos": [
              {
                "clave": "nroAutorizacion2",
                "label": "Nro. Autorización",
                "t": "ro"
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "A — ACTIVA",
                  "I — INACTIVA",
                  "P — PENDIENTE",
                  "X — ANULADA"
                ]
              },
              {
                "clave": "fecInicio",
                "label": "Fec. Inicio",
                "t": "date"
              },
              {
                "clave": "fecVenc",
                "label": "Fec. Venc.",
                "t": "date"
              }
            ]
          },
          {
            "label": "Datos del titular",
            "campos": [
              {
                "clave": "nroLicencia",
                "label": "Nro. Licencia",
                "t": "text"
              },
              {
                "clave": "razonSocial",
                "label": "Razón Social",
                "t": "text"
              },
              {
                "clave": "contribuyente2",
                "label": "Contribuyente",
                "t": "text"
              },
              {
                "clave": "nombre",
                "label": "Nombre",
                "t": "ro"
              },
              {
                "clave": "rUC2",
                "label": "R.U.C.",
                "t": "text"
              },
              {
                "clave": "dNI2",
                "label": "D.N.I.",
                "t": "text"
              },
              {
                "clave": "codCatastral",
                "label": "Cod. Catastral",
                "t": "text"
              },
              {
                "clave": "direccion2",
                "label": "Dirección",
                "t": "ro",
                "ancho": true
              }
            ]
          },
          {
            "label": "Características",
            "campos": [
              {
                "clave": "claseAnuncio",
                "label": "Clase Anuncio",
                "t": "sel",
                "opts": [
                  "LETRERO",
                  "PANEL",
                  "TOLDO",
                  "BANDEROLA",
                  "PANTALLA DIGITAL",
                  "GLOBO AEROSTÁTICO"
                ]
              },
              {
                "clave": "ubicacion",
                "label": "Ubicacion",
                "t": "sel",
                "opts": [
                  "LOCALES COMERCIALES",
                  "VÍA PÚBLICA",
                  "AZOTEA",
                  "FACHADA",
                  "TERRENO PRIVADO"
                ]
              },
              {
                "clave": "tipoAnuncio",
                "label": "Tipo Anuncio",
                "t": "sel",
                "opts": [
                  "AVISO SIMPLE",
                  "AVISO LUMINOSO",
                  "AVISO ILUMINADO",
                  "AVISO ELECTRÓNICO"
                ]
              },
              {
                "clave": "forma",
                "label": "Forma",
                "t": "sel",
                "opts": [
                  "MONOLITO",
                  "ADOSADO",
                  "BIPOSTE",
                  "MONOPOSTE",
                  "TIPO BANDERA"
                ]
              },
              {
                "clave": "denominacion",
                "label": "Denominación",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "base",
                "label": "Base",
                "t": "text"
              },
              {
                "clave": "altura",
                "label": "Altura",
                "t": "text"
              },
              {
                "clave": "nroLados",
                "label": "Nro lados",
                "t": "text"
              },
              {
                "clave": "area",
                "label": "Area",
                "t": "ro"
              },
              {
                "clave": "tasa",
                "label": "Tasa",
                "t": "ro"
              },
              {
                "clave": "observacion",
                "label": "Observación",
                "t": "text",
                "ancho": true
              }
            ]
          },
          {
            "label": "Trámite interno",
            "campos": [
              {
                "clave": "nroDeExpediente",
                "label": "Nro de Expediente",
                "t": "text"
              },
              {
                "clave": "fechaExp",
                "label": "Fecha Exp.",
                "t": "date"
              },
              {
                "clave": "nroDeResolucion",
                "label": "Nro de Resolución",
                "t": "text"
              },
              {
                "clave": "fechaDeRes",
                "label": "Fecha de Res.",
                "t": "date"
              },
              {
                "clave": "nroRecibo",
                "label": "Nro. Recibo",
                "t": "text"
              },
              {
                "clave": "fechaRec",
                "label": "Fecha Rec.",
                "t": "date"
              },
              {
                "clave": "importeRec",
                "label": "Importe Rec.",
                "t": "ro"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Cancelación",
        "secciones": [
          {
            "label": "Cese de la autorización",
            "campos": [
              {
                "clave": "fechaDeCancelacion",
                "label": "Fecha de cancelación",
                "t": "date"
              },
              {
                "clave": "motivo",
                "label": "Motivo",
                "t": "sel",
                "opts": [
                  "—",
                  "SOLICITUD DEL TITULAR",
                  "VENCIMIENTO",
                  "RETIRO POR INFRACCIÓN",
                  "CESE DEL NEGOCIO"
                ]
              },
              {
                "clave": "nDeDocumento",
                "label": "Nº de documento",
                "t": "text"
              },
              {
                "clave": "anuncioRetirado",
                "label": "Anuncio retirado",
                "t": "chk",
                "ph": "Verificado en campo"
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
            "label": "Notas",
            "campos": [
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
      "title": "Autorizaciones encontradas",
      "cols": [
        "Est.",
        "Nro. Autorización",
        "Nro. Expediente",
        "Contribuyente",
        "D.N.I.",
        "R.U.C.",
        "Dirección",
        "Tasa S/"
      ],
      "claves": [
        "est",
        "nroAutorizacion",
        "nroExpediente",
        "contribuyente",
        "dNI",
        "rUC",
        "direccion",
        "tasaS"
      ],
      "num": [
        7
      ]
    },
    "acciones": [
      "Nuevo",
      "Activar",
      "Excel",
      "Imprimir",
      "Guardar"
    ]
  },
  "anuncios_reportes": {
    "id": "anuncios_reportes",
    "mod": "Autorizaciones y licencias",
    "title": "Reportes de anuncio y propaganda",
    "endpoint": "POST /api/v1/autorizaciones/anuncios/reportes",
    "desc": "Emite el padrón de autorizaciones de anuncio y propaganda por contribuyente, dirección, estado o intervalo de fechas.",
    "secciones": [
      {
        "label": "Tipo de reporte",
        "campos": [
          {
            "clave": "reporte",
            "label": "Reporte",
            "t": "sel",
            "opts": [
              "PADRÓN DE ANUNCIOS Y PROPAGANDAS"
            ],
            "ancho": true
          }
        ]
      },
      {
        "label": "Criterios",
        "campos": [
          {
            "clave": "nAnuncioSerie",
            "label": "Nº anuncio — serie",
            "t": "text"
          },
          {
            "clave": "nAnuncioNumero",
            "label": "Nº anuncio — número",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "VENCIDA",
              "ANULADA",
              "TODAS"
            ]
          },
          {
            "clave": "contribuyente",
            "label": "Contribuyente",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "direccion",
            "label": "Dirección",
            "t": "text",
            "ancho": true
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
    ],
    "tabla": {
      "title": "Autorizaciones del padrón",
      "cols": [
        "Nº autorización",
        "Contribuyente",
        "Dirección",
        "Tipo de anuncio",
        "Área m²",
        "Tasa S/",
        "Vigencia",
        "Estado"
      ],
      "claves": [
        "nAutorizacion",
        "contribuyente",
        "direccion",
        "tipoDeAnuncio",
        "areaM",
        "tasaS",
        "vigencia",
        "estado"
      ],
      "num": [
        4,
        5
      ]
    },
    "acciones": [
      "Exportar",
      "Imprimir",
      "Pantalla",
      "Cancelar"
    ]
  },
  "licencia_funcionamiento": {
    "id": "licencia_funcionamiento",
    "mod": "Licencias",
    "title": "Licencia de funcionamiento",
    "endpoint": "GET /api/v1/licencias/funcionamiento",
    "desc": "Registro y seguimiento de licencias comerciales, con giros CIIU, zonificación, aforo, inspección técnica de seguridad y arbitrios del establecimiento.",
    "filtros": [
      {
        "clave": "nroLicencia",
        "label": "Nro. Licencia",
        "t": "text"
      },
      {
        "clave": "nExpediente",
        "label": "Nº Expediente",
        "t": "text"
      },
      {
        "clave": "nombreDelContribuyente",
        "label": "Nombre del Contribuyente",
        "t": "text"
      },
      {
        "clave": "denominacionComercial",
        "label": "Denominación Comercial",
        "t": "text"
      },
      {
        "clave": "direccion",
        "label": "Dirección",
        "t": "text"
      }
    ],
    "tabs": [
      {
        "label": "Datos Generales",
        "secciones": [
          {
            "label": "Licencia",
            "campos": [
              {
                "clave": "codigoInterno",
                "label": "Código interno",
                "t": "ro"
              },
              {
                "clave": "proceso",
                "label": "Proceso",
                "t": "sel",
                "opts": [
                  "REGISTRO SIMPLE DE NUEVA LICENCIA",
                  "RENOVACIÓN",
                  "AMPLIACIÓN DE GIRO",
                  "CAMBIO DE TITULAR",
                  "DUPLICADO",
                  "CESE"
                ]
              },
              {
                "clave": "nroLicencia2",
                "label": "Nro. Licencia",
                "t": "ro"
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "A — ACTIVA",
                  "P — PENDIENTE",
                  "C — CESADA",
                  "S — SUSPENDIDA",
                  "X — ANULADA"
                ]
              },
              {
                "clave": "tipoDeLicencia",
                "label": "Tipo de licencia",
                "t": "sel",
                "opts": [
                  "DEFINITIVA",
                  "TEMPORAL",
                  "CESIONARIA"
                ]
              },
              {
                "clave": "fechaDeEmision",
                "label": "Fecha de emisión",
                "t": "date"
              },
              {
                "clave": "fechaDeVencimiento",
                "label": "Fecha de vencimiento",
                "t": "date"
              },
              {
                "clave": "horarioAutorizado",
                "label": "Horario autorizado",
                "t": "sel",
                "opts": [
                  "DE 06:00 A 23:00 HORAS",
                  "DE 08:00 A 20:00 HORAS",
                  "DE 24 HORAS",
                  "HORARIO EXTENDIDO"
                ]
              }
            ]
          },
          {
            "label": "Contribuyente y denominación",
            "campos": [
              {
                "clave": "codContribuyente",
                "label": "Cod. Contribuyente",
                "t": "ro"
              },
              {
                "clave": "nombreRazonSocial",
                "label": "Nombre / razón social",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "dNI",
                "label": "D.N.I.",
                "t": "text"
              },
              {
                "clave": "rUC",
                "label": "R.U.C.",
                "t": "text"
              },
              {
                "clave": "denominacionComercial2",
                "label": "Denominación Comercial",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "actividadPrincipal",
                "label": "Actividad principal",
                "t": "text",
                "ancho": true
              }
            ]
          },
          {
            "label": "Giros CIIU autorizados",
            "campos": [
              {
                "clave": "ciiu1",
                "label": "CIIU 1",
                "t": "ro"
              },
              {
                "clave": "ciiu2",
                "label": "CIIU 2",
                "t": "ro"
              },
              {
                "clave": "ciiu3",
                "label": "CIIU 3",
                "t": "ro"
              },
              {
                "clave": "agregarGiro",
                "label": "Agregar giro",
                "t": "text",
                "ph": "Buscar por código o descripción",
                "ancho": true
              }
            ]
          },
          {
            "label": "Expediente, resolución y recibo",
            "campos": [
              {
                "clave": "nDeExpediente",
                "label": "Nº de expediente",
                "t": "text"
              },
              {
                "clave": "fechaDeExpediente",
                "label": "Fecha de expediente",
                "t": "date"
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
                "clave": "nDeRecibo",
                "label": "Nº de recibo",
                "t": "text"
              },
              {
                "clave": "importePagadoS",
                "label": "Importe pagado (S/)",
                "t": "ro"
              },
              {
                "clave": "fechaDePago",
                "label": "Fecha de pago",
                "t": "date"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Predio",
        "secciones": [
          {
            "label": "Establecimiento",
            "campos": [
              {
                "clave": "codigoPredial",
                "label": "Código predial",
                "t": "text"
              },
              {
                "clave": "direccionDelEstablecimiento",
                "label": "Dirección del establecimiento",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "areaDelEstablecimientoM",
                "label": "Área del establecimiento (m²)",
                "t": "text"
              },
              {
                "clave": "zonificacion",
                "label": "Zonificación",
                "t": "sel",
                "opts": [
                  "RDM — RESIDENCIAL DENSIDAD MEDIA",
                  "CV — COMERCIO VECINAL",
                  "CZ — COMERCIO ZONAL",
                  "I1 — INDUSTRIA LIVIANA",
                  "OU — OTROS USOS"
                ]
              },
              {
                "clave": "compatibilidadDeUso",
                "label": "Compatibilidad de uso",
                "t": "sel",
                "opts": [
                  "COMPATIBLE",
                  "COMPATIBLE CON RESTRICCIONES",
                  "NO COMPATIBLE"
                ]
              },
              {
                "clave": "aforoAutorizado",
                "label": "Aforo autorizado",
                "t": "text"
              },
              {
                "clave": "condicionDelLocal",
                "label": "Condición del local",
                "t": "sel",
                "opts": [
                  "PROPIO",
                  "ALQUILADO",
                  "CEDIDO EN USO"
                ]
              }
            ]
          },
          {
            "label": "Inspección técnica de seguridad (ITSE)",
            "campos": [
              {
                "clave": "nivelDeRiesgo",
                "label": "Nivel de riesgo",
                "t": "sel",
                "opts": [
                  "RIESGO BAJO",
                  "RIESGO MEDIO",
                  "RIESGO ALTO",
                  "RIESGO MUY ALTO"
                ]
              },
              {
                "clave": "momentoDeLaItse",
                "label": "Momento de la ITSE",
                "t": "sel",
                "opts": [
                  "PREVIA",
                  "POSTERIOR"
                ]
              },
              {
                "clave": "nDeCertificadoItse",
                "label": "Nº de certificado ITSE",
                "t": "text"
              },
              {
                "clave": "fechaDeInspeccion",
                "label": "Fecha de inspección",
                "t": "date"
              },
              {
                "clave": "resultado",
                "label": "Resultado",
                "t": "sel",
                "opts": [
                  "PENDIENTE",
                  "CONFORME",
                  "OBSERVADO",
                  "NO CONFORME"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Documentos",
        "secciones": [
          {
            "label": "Requisitos presentados",
            "campos": [
              {
                "clave": "solicitudDeclaracionJurada",
                "label": "Solicitud - declaración jurada",
                "t": "chk",
                "ph": "Presentada"
              },
              {
                "clave": "vigenciaDePoder",
                "label": "Vigencia de poder",
                "t": "chk",
                "ph": "Solo persona jurídica"
              },
              {
                "clave": "declaracionJuradaDeItse",
                "label": "Declaración jurada de ITSE",
                "t": "chk",
                "ph": "Presentada"
              },
              {
                "clave": "autorizacionSectorial",
                "label": "Autorización sectorial",
                "t": "chk",
                "ph": "Según giro"
              },
              {
                "clave": "copiaDelContratoDeAlquiler",
                "label": "Copia del contrato de alquiler",
                "t": "chk",
                "ph": "Presentada"
              },
              {
                "clave": "reciboDePagoDelDerecho",
                "label": "Recibo de pago del derecho",
                "t": "chk",
                "ph": "Pendiente"
              }
            ]
          }
        ]
      },
      {
        "label": "Arbitrios",
        "secciones": [
          {
            "label": "Arbitrios del establecimiento",
            "campos": [
              {
                "clave": "usoParaArbitrios",
                "label": "Uso para arbitrios",
                "t": "sel",
                "opts": [
                  "COMERCIO",
                  "SERVICIOS",
                  "INDUSTRIA"
                ]
              },
              {
                "clave": "zona",
                "label": "Zona",
                "t": "sel",
                "opts": [
                  "Zona 1",
                  "Zona 2",
                  "Zona 3"
                ]
              },
              {
                "clave": "limpiezaPublicaAnualS",
                "label": "Limpieza pública anual (S/)",
                "t": "ro"
              },
              {
                "clave": "parquesYJardinesAnualS",
                "label": "Parques y jardines anual (S/)",
                "t": "ro"
              },
              {
                "clave": "serenazgoAnualS",
                "label": "Serenazgo anual (S/)",
                "t": "ro"
              },
              {
                "clave": "totalArbitriosAnualS",
                "label": "Total arbitrios anual (S/)",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Procesos",
        "secciones": [
          {
            "label": "Trazabilidad del trámite",
            "campos": [
              {
                "clave": "estadoDelTramite",
                "label": "Estado del trámite",
                "t": "ro"
              },
              {
                "clave": "plazoTupa",
                "label": "Plazo TUPA",
                "t": "ro"
              },
              {
                "clave": "diasTranscurridos",
                "label": "Días transcurridos",
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
        ]
      }
    ],
    "tabla": {
      "title": "Licencias encontradas",
      "cols": [
        "Est.",
        "Nro. Licencia",
        "Contribuyente",
        "Nº Expediente",
        "Denominación Comercial",
        "Dirección"
      ],
      "claves": [
        "est",
        "nroLicencia",
        "contribuyente",
        "nExpediente",
        "denominacionComercial",
        "direccion"
      ]
    },
    "acciones": [
      "Nuevo",
      "Activar",
      "Duplicar",
      "Imprimir licencia",
      "Guardar"
    ]
  },
  "licencia_padron": {
    "id": "licencia_padron",
    "mod": "Autorizaciones y licencias",
    "title": "Padrón de licencias de funcionamiento",
    "endpoint": "POST /api/v1/licencias/funcionamiento/reportes/padron",
    "desc": "Padrón de licencias municipales con agrupación por año y subagrupación por giro, dirección o contribuyente. El orden y los filtros se definen antes de emitir.",
    "secciones": [
      {
        "label": "Agrupado por",
        "campos": [
          {
            "clave": "agrupar",
            "label": "Agrupar",
            "t": "chk"
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
        ]
      },
      {
        "label": "Subagrupado por",
        "campos": [
          {
            "clave": "subagrupar",
            "label": "Subagrupar",
            "t": "chk"
          },
          {
            "clave": "criterio",
            "label": "Criterio",
            "t": "sel",
            "opts": [
              "GIRO COMERCIAL",
              "DIRECCIÓN",
              "NOMBRE CONTRIBUYENTE"
            ]
          }
        ]
      },
      {
        "label": "Ordenado por",
        "campos": [
          {
            "clave": "ordenar",
            "label": "Ordenar",
            "t": "chk"
          },
          {
            "clave": "criterio2",
            "label": "Criterio",
            "t": "sel",
            "opts": [
              "NÚMERO DE LICENCIA",
              "NOMBRE CONTRIBUYENTE",
              "GIRO COMERCIAL",
              "DIRECCIÓN"
            ]
          }
        ]
      },
      {
        "label": "Filtrado por",
        "campos": [
          {
            "clave": "filtrar",
            "label": "Filtrar",
            "t": "chk"
          },
          {
            "clave": "nLicenciaSerie",
            "label": "Nº licencia — serie",
            "t": "text"
          },
          {
            "clave": "nLicenciaNumero",
            "label": "Nº licencia — número",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "CANCELADA",
              "DUPLICADA",
              "VENCIDA",
              "TODAS"
            ]
          },
          {
            "clave": "tipoLic",
            "label": "Tipo Lic.",
            "t": "sel",
            "opts": [
              "(TODOS)",
              "INDETERMINADA",
              "TEMPORAL",
              "CESIONARIO",
              "MERCADO"
            ]
          },
          {
            "clave": "ciiu",
            "label": "CIIU",
            "t": "text"
          },
          {
            "clave": "direccion",
            "label": "Dirección",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "fecLicDesde",
            "label": "Fec. Lic. desde",
            "t": "date"
          },
          {
            "clave": "fecLicHasta",
            "label": "Fec. Lic. hasta",
            "t": "date"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Licencias del padrón",
      "cols": [
        "Nº licencia",
        "Fecha",
        "Contribuyente",
        "Nombre comercial",
        "CIIU",
        "Giro",
        "Dirección",
        "Estado"
      ],
      "claves": [
        "nLicencia",
        "fecha",
        "contribuyente",
        "nombreComercial",
        "ciiu",
        "giro",
        "direccion",
        "estado"
      ],
      "num": []
    },
    "acciones": [
      "Exportar",
      "Imprimir",
      "Pantalla",
      "Cancelar"
    ]
  },
  "licencia_resumen_anual": {
    "id": "licencia_resumen_anual",
    "mod": "Autorizaciones y licencias",
    "title": "Resumen de licencias por año",
    "endpoint": "GET /api/v1/licencias/funcionamiento/reportes/resumen-anual",
    "desc": "Cantidades de licencias emitidas, canceladas y duplicadas por año, con la recaudación por derecho de trámite.",
    "filtros": [
      {
        "clave": "desdeElAno",
        "label": "Desde el año",
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
        "clave": "hastaElAno",
        "label": "Hasta el año",
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
        "clave": "tipoDeLicencia",
        "label": "Tipo de licencia",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "INDETERMINADA",
          "TEMPORAL",
          "CESIONARIO",
          "MERCADO"
        ]
      },
      {
        "clave": "agrupadoPor",
        "label": "Agrupado por",
        "t": "sel",
        "opts": [
          "AÑO",
          "GIRO COMERCIAL",
          "TIPO DE LICENCIA"
        ]
      }
    ],
    "tabla": {
      "title": "Licencias por año",
      "cols": [
        "Año",
        "Emitidas",
        "Canceladas",
        "Duplicados",
        "Vigentes al cierre",
        "Derecho de trámite S/"
      ],
      "claves": [
        "ano",
        "emitidas",
        "canceladas",
        "duplicados",
        "vigentesAlCierre",
        "derechoDeTramiteS"
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
  "licencia_resolucion_cancelacion": {
    "id": "licencia_resolucion_cancelacion",
    "mod": "Autorizaciones y licencias",
    "title": "Resolución de cancelación de licencia",
    "endpoint": "POST /api/v1/licencias/funcionamiento/{id}/cancelacion",
    "kind": "report",
    "desc": "Resolución que deja sin efecto la licencia de funcionamiento, por solicitud del titular o por cierre del establecimiento.",
    "reporte": {
      "title": "Resolución de cancelación de licencia",
      "subtitle": "Licencia municipal de funcionamiento",
      "cols": [
        "Concepto",
        "Detalle"
      ],
      "num": []
    }
  },
  "licencia_resolucion_duplicado": {
    "id": "licencia_resolucion_duplicado",
    "mod": "Autorizaciones y licencias",
    "title": "Resolución de duplicado de licencia",
    "endpoint": "POST /api/v1/licencias/funcionamiento/{id}/duplicado",
    "kind": "report",
    "desc": "Resolución que autoriza la emisión de un duplicado de la licencia de funcionamiento, con el número de duplicado que corresponde.",
    "reporte": {
      "title": "Resolución de duplicado de licencia",
      "subtitle": "Licencia municipal de funcionamiento",
      "cols": [
        "Concepto",
        "Detalle"
      ],
      "num": []
    }
  },
  "fue_edificacion": {
    "id": "fue_edificacion",
    "mod": "Licencias",
    "title": "Formulario único de edificación (FUE)",
    "endpoint": "GET /api/v1/licencias/edificacion",
    "desc": "Licencia de obra bajo la Ley 29090. La modalidad de aprobación determina si basta la verificación administrativa o se requiere comisión técnica.",
    "filtros": [
      {
        "clave": "nroExpediente",
        "label": "NRO EXPEDIENTE",
        "t": "text"
      },
      {
        "clave": "nroLicencia",
        "label": "NRO LICENCIA",
        "t": "text"
      },
      {
        "clave": "nombreContribuyente",
        "label": "NOMBRE CONTRIBUYENTE",
        "t": "text"
      },
      {
        "clave": "lugarMz",
        "label": "LUGAR — Mz.",
        "t": "text"
      },
      {
        "clave": "lugarLt",
        "label": "LUGAR — Lt.",
        "t": "text"
      },
      {
        "clave": "tipoTramite",
        "label": "TIPO TRAMITE",
        "t": "sel",
        "opts": [
          "Todos",
          "ANTEPROYECTO EN CONSULTA",
          "LICENCIA DE OBRA",
          "AMPLIACIÓN DE LICENCIA",
          "REVALIDACIÓN DE LICENCIA",
          "REGULARIZACIÓN DE LICENCIA"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Datos Licencia",
        "secciones": [
          {
            "label": "Expediente",
            "campos": [
              {
                "clave": "nroExpediente2",
                "label": "NRO EXPEDIENTE",
                "t": "ro"
              },
              {
                "clave": "nroExpedienteAnterior",
                "label": "NRO EXPEDIENTE ANTERIOR",
                "t": "text"
              },
              {
                "clave": "nroLicenciaAnterior",
                "label": "NRO LICENCIA ANTERIOR",
                "t": "text"
              }
            ]
          },
          {
            "label": "Licencia de edificación",
            "campos": [
              {
                "clave": "tipoTramite2",
                "label": "Tipo Trámite",
                "t": "sel",
                "opts": [
                  "ANTEPROYECTO EN CONSULTA",
                  "LICENCIA DE OBRA",
                  "AMPLIACIÓN DE LICENCIA",
                  "REVALIDACIÓN DE LICENCIA",
                  "REGULARIZACIÓN DE LICENCIA"
                ]
              },
              {
                "clave": "obra",
                "label": "OBRA",
                "t": "sel",
                "opts": [
                  "EDIFICACIÓN NUEVA",
                  "AMPLIACIÓN",
                  "REMODELACIÓN",
                  "DEMOLICIÓN",
                  "CERCO",
                  "PUESTA EN VALOR"
                ]
              },
              {
                "clave": "fechaDeclaracion",
                "label": "FECHA DECLARACIÓN",
                "t": "date"
              },
              {
                "clave": "fechaCaducidad",
                "label": "FECHA CADUCIDAD",
                "t": "date"
              },
              {
                "clave": "fechaInicioDeObra",
                "label": "FECHA INICIO DE OBRA",
                "t": "date"
              },
              {
                "clave": "tipoTramite3",
                "label": "TIPO TRAMITE",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "modalidadAprobacion",
                "label": "MODALIDAD APROBACION",
                "t": "sel",
                "opts": [
                  "A — APROBACION AUTOMATICA",
                  "B — APROBACIÓN CON EVALUACIÓN PREVIA",
                  "C — COMISIÓN TÉCNICA",
                  "D — COMISIÓN TÉCNICA"
                ]
              },
              {
                "clave": "revision",
                "label": "Revisión",
                "t": "sel",
                "opts": [
                  "REVISORES URBANOS",
                  "COMISION TECNICA"
                ]
              },
              {
                "clave": "generarNLicencia",
                "label": "Generar N° Licencia",
                "t": "chk",
                "ph": "Nº 000001"
              }
            ]
          },
          {
            "label": "Anexos",
            "campos": [
              {
                "clave": "aDatosCondominosPersonasNaturales",
                "label": "\"A\" DATOS CONDOMINOS - PERSONAS NATURALES",
                "t": "chk",
                "ph": "Adjunta anexo A"
              },
              {
                "clave": "bDatosCondominosPersonasJuridicas",
                "label": "\"B\" DATOS CONDOMINOS - PERSONAS JURIDICAS",
                "t": "chk",
                "ph": "Adjunta anexo B"
              },
              {
                "clave": "cPreDeclaratoriaDeFabrica",
                "label": "\"C\" PRE-DECLARATORIA DE FABRICA",
                "t": "chk",
                "ph": "Adjunta anexo C"
              },
              {
                "clave": "dAutoliquidacion",
                "label": "\"D\" AUTOLIQUIDACION",
                "t": "chk",
                "ph": "Adjunta anexo D"
              },
              {
                "clave": "solicitante",
                "label": "SOLICITANTE",
                "t": "sel",
                "opts": [
                  "PROPIETARIO",
                  "NO PROPIETARIO"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Datos Solicitante",
        "secciones": [
          {
            "label": "Solicitante",
            "campos": [
              {
                "clave": "codContribuyente",
                "label": "Cod. Contribuyente",
                "t": "text"
              },
              {
                "clave": "nombreRazonSocial",
                "label": "Nombre / razón social",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "dNI",
                "label": "D.N.I.",
                "t": "text"
              },
              {
                "clave": "rUC",
                "label": "R.U.C.",
                "t": "text"
              },
              {
                "clave": "domicilio",
                "label": "Domicilio",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "telefono",
                "label": "Teléfono",
                "t": "text"
              },
              {
                "clave": "correoElectronico",
                "label": "Correo electrónico",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Representante Legal",
        "secciones": [
          {
            "label": "Representante",
            "campos": [
              {
                "clave": "dNI2",
                "label": "D.N.I.",
                "t": "text"
              },
              {
                "clave": "nombre",
                "label": "Nombre",
                "t": "text"
              },
              {
                "clave": "partidaRegistralDelPoder",
                "label": "Partida registral del poder",
                "t": "text"
              },
              {
                "clave": "vigenciaDePoder",
                "label": "Vigencia de poder",
                "t": "date"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Datos Terreno",
        "secciones": [
          {
            "label": "Terreno",
            "campos": [
              {
                "clave": "codCatastral",
                "label": "Cod. Catastral",
                "t": "text"
              },
              {
                "clave": "direccion",
                "label": "Dirección",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "mz",
                "label": "Mz.",
                "t": "text"
              },
              {
                "clave": "lt",
                "label": "Lt.",
                "t": "text"
              },
              {
                "clave": "areaDelTerrenoM",
                "label": "Área del terreno (m²)",
                "t": "text"
              },
              {
                "clave": "zonificacion",
                "label": "Zonificación",
                "t": "sel",
                "opts": [
                  "RDM — RESIDENCIAL DENSIDAD MEDIA",
                  "CV — COMERCIO VECINAL",
                  "CZ — COMERCIO ZONAL",
                  "I1 — INDUSTRIA LIVIANA"
                ]
              },
              {
                "clave": "partidaRegistral",
                "label": "Partida registral",
                "t": "text"
              },
              {
                "clave": "frenteM",
                "label": "Frente (m)",
                "t": "text"
              },
              {
                "clave": "fondoM",
                "label": "Fondo (m)",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Datos Proyecto",
        "secciones": [
          {
            "label": "Proyecto",
            "campos": [
              {
                "clave": "usoDeLaEdificacion",
                "label": "Uso de la edificación",
                "t": "sel",
                "opts": [
                  "VIVIENDA UNIFAMILIAR",
                  "VIVIENDA MULTIFAMILIAR",
                  "COMERCIO",
                  "INDUSTRIA",
                  "SERVICIOS"
                ]
              },
              {
                "clave": "nDePisos",
                "label": "Nº de pisos",
                "t": "text"
              },
              {
                "clave": "areaTechadaTotalM",
                "label": "Área techada total (m²)",
                "t": "text"
              },
              {
                "clave": "areaLibreM",
                "label": "Área libre (m²)",
                "t": "text"
              },
              {
                "clave": "nDeEstacionamientos",
                "label": "Nº de estacionamientos",
                "t": "text"
              },
              {
                "clave": "valorDeObraS",
                "label": "Valor de obra (S/)",
                "t": "text"
              },
              {
                "clave": "tasaDeLicencia",
                "label": "Tasa de licencia",
                "t": "ro"
              },
              {
                "clave": "derechoDeLicenciaS",
                "label": "Derecho de licencia (S/)",
                "t": "ro"
              },
              {
                "clave": "plazoDeEjecucionMeses",
                "label": "Plazo de ejecución (meses)",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Proyectistas",
        "secciones": [
          {
            "label": "Profesionales responsables",
            "campos": [
              {
                "clave": "proyectistaDeArquitectura",
                "label": "Proyectista de arquitectura",
                "t": "text"
              },
              {
                "clave": "colegiaturaCap",
                "label": "Colegiatura (CAP)",
                "t": "text"
              },
              {
                "clave": "proyectistaDeEstructuras",
                "label": "Proyectista de estructuras",
                "t": "text"
              },
              {
                "clave": "colegiaturaCip",
                "label": "Colegiatura (CIP)",
                "t": "text"
              },
              {
                "clave": "proyectistaDeInstalaciones",
                "label": "Proyectista de instalaciones",
                "t": "text"
              },
              {
                "clave": "responsableDeObra",
                "label": "Responsable de obra",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Documentos Adjuntos",
        "secciones": [
          {
            "label": "Requisitos",
            "campos": [
              {
                "clave": "fueFirmadoPorElSolicitante",
                "label": "FUE firmado por el solicitante",
                "t": "chk",
                "ph": "Presentado"
              },
              {
                "clave": "copiaLiteralDeDominio",
                "label": "Copia literal de dominio",
                "t": "chk",
                "ph": "Presentada"
              },
              {
                "clave": "planosDeArquitectura",
                "label": "Planos de arquitectura",
                "t": "chk",
                "ph": "Presentados"
              },
              {
                "clave": "planosDeEstructuras",
                "label": "Planos de estructuras",
                "t": "chk",
                "ph": "Presentados"
              },
              {
                "clave": "planosDeInstalaciones",
                "label": "Planos de instalaciones",
                "t": "chk",
                "ph": "Pendiente"
              },
              {
                "clave": "certificadoDeParametrosUrbanisticos",
                "label": "Certificado de parámetros urbanísticos",
                "t": "chk",
                "ph": "Presentado"
              },
              {
                "clave": "reciboDePagoDelDerecho",
                "label": "Recibo de pago del derecho",
                "t": "chk",
                "ph": "Pendiente"
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Registros encontrados",
      "cols": [
        "Nro Expedient",
        "Contribuyente",
        "Nombre Contribuyente",
        "Tipo Tramite",
        "Nro Licencia",
        "Modalidad"
      ],
      "claves": [
        "nroExpedient",
        "contribuyente",
        "nombreContribuyente",
        "tipoTramite",
        "nroLicencia",
        "modalidad"
      ]
    },
    "acciones": [
      "Nuevo",
      "Inactivar",
      "Excel",
      "Imprimir",
      "Guardar"
    ]
  },
  "edificacion_reporte": {
    "id": "edificacion_reporte",
    "mod": "Autorizaciones y licencias",
    "title": "Reporte general de licencias de edificación",
    "endpoint": "GET /api/v1/licencias/edificacion/reportes/general",
    "desc": "Relación de licencias de edificación por modalidad, con el área a construir, el valor de obra declarado y el estado del expediente.",
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
        "clave": "modalidad",
        "label": "Modalidad",
        "t": "sel",
        "opts": [
          "Todas",
          "A — APROBACIÓN AUTOMÁTICA",
          "B — VERIFICACIÓN TÉCNICA",
          "C — REVISIÓN POR COMISIÓN",
          "D — REVISIÓN POR COMISIÓN"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "EN TRÁMITE",
          "APROBADA",
          "OBSERVADA",
          "DENEGADA",
          "CONFORME DE OBRA"
        ]
      }
    ],
    "tabla": {
      "title": "Licencias de edificación",
      "cols": [
        "Nº licencia",
        "Expediente",
        "Fecha",
        "Administrado",
        "Predio",
        "Modalidad",
        "Área a construir m²",
        "Valor de obra S/",
        "Estado"
      ],
      "claves": [
        "nLicencia",
        "expediente",
        "fecha",
        "administrado",
        "predio",
        "modalidad",
        "areaAConstruirM",
        "valorDeObraS",
        "estado"
      ],
      "num": [
        6,
        7
      ]
    },
    "acciones": [
      "Imprimir",
      "Excel"
    ]
  },
  "ciiu": {
    "id": "ciiu",
    "mod": "Licencias",
    "title": "Catálogo CIIU de giros",
    "endpoint": "GET /api/v1/licencias/ciiu",
    "desc": "Clasificación industrial internacional uniforme. Determina la compatibilidad del giro con la zonificación y el nivel de riesgo de la ITSE.",
    "filtros": [
      {
        "clave": "codigoCiiu",
        "label": "Código CIIU",
        "t": "text"
      },
      {
        "clave": "descripcion",
        "label": "Descripción",
        "t": "text"
      },
      {
        "clave": "seccion",
        "label": "Sección",
        "t": "sel",
        "opts": [
          "Todas",
          "D — INDUSTRIAS MANUFACTURERAS",
          "G — COMERCIO",
          "H — HOTELES Y RESTAURANTES",
          "I — TRANSPORTE",
          "K — ACTIVIDADES INMOBILIARIAS"
        ]
      }
    ],
    "tabla": {
      "title": "Giros registrados",
      "cols": [
        "Código",
        "Descripción",
        "Sección",
        "Riesgo ITSE",
        "Zonificación compatible",
        "Requiere sectorial"
      ],
      "claves": [
        "codigo",
        "descripcion",
        "seccion",
        "riesgoItse",
        "zonificacionCompatible",
        "requiereSectorial"
      ]
    },
    "acciones": [
      "Nuevo",
      "Guardar"
    ]
  },
  "certificados": {
    "id": "certificados",
    "mod": "Licencias",
    "title": "Certificados de numeración y zonificación",
    "endpoint": "POST /api/v1/licencias/certificados",
    "desc": "Emisión de los certificados que acreditan el número municipal asignado y los parámetros urbanísticos del predio.",
    "filtros": [
      {
        "clave": "nDeCertificado",
        "label": "Nº de certificado",
        "t": "text"
      },
      {
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "Todos",
          "NUMERACIÓN",
          "ZONIFICACIÓN Y VÍAS",
          "PARÁMETROS URBANÍSTICOS",
          "JURISDICCIÓN"
        ]
      },
      {
        "clave": "predio",
        "label": "Predio",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Datos del certificado",
        "campos": [
          {
            "clave": "tipoDeCertificado",
            "label": "Tipo de certificado",
            "t": "sel",
            "opts": [
              "NUMERACIÓN",
              "ZONIFICACIÓN Y VÍAS",
              "PARÁMETROS URBANÍSTICOS",
              "JURISDICCIÓN"
            ]
          },
          {
            "clave": "codigoPredial",
            "label": "Código predial",
            "t": "text"
          },
          {
            "clave": "solicitante",
            "label": "Solicitante",
            "t": "text"
          },
          {
            "clave": "nDeExpediente",
            "label": "Nº de expediente",
            "t": "text"
          },
          {
            "clave": "zonificacion",
            "label": "Zonificación",
            "t": "ro"
          },
          {
            "clave": "alturaMaximaPermitida",
            "label": "Altura máxima permitida",
            "t": "ro"
          },
          {
            "clave": "areaLibreMinima",
            "label": "Área libre mínima",
            "t": "ro"
          },
          {
            "clave": "retiroMunicipal",
            "label": "Retiro municipal",
            "t": "ro"
          },
          {
            "clave": "coeficienteDeEdificacion",
            "label": "Coeficiente de edificación",
            "t": "ro"
          },
          {
            "clave": "derechoDeTramiteS",
            "label": "Derecho de trámite (S/)",
            "t": "ro"
          },
          {
            "clave": "vigencia",
            "label": "Vigencia",
            "t": "ro"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Certificados emitidos",
      "cols": [
        "Nº certificado",
        "Tipo",
        "Predio",
        "Solicitante",
        "Fecha",
        "Derecho S/",
        "Estado"
      ],
      "claves": [
        "nCertificado",
        "tipo",
        "predio",
        "solicitante",
        "fecha",
        "derechoS",
        "estado"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Emitir",
      "Imprimir certificado"
    ]
  }
};
