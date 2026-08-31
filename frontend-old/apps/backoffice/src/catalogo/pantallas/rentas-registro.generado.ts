/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 15 pantallas de Rentas · Registro: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "contribuyentes": {
    "id": "contribuyentes",
    "mod": "Rentas · Registro",
    "title": "Contribuyentes",
    "endpoint": "GET /api/v1/rentas/contribuyentes",
    "desc": "Padrón único del contribuyente. Su código enlaza predios, vehículos, licencias, papeletas y la cuenta corriente.",
    "filtros": [
      {
        "clave": "codigo",
        "label": "Código",
        "t": "text"
      },
      {
        "clave": "nombreRazonSocial",
        "label": "Nombre / razón social",
        "t": "text"
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
      }
    ],
    "tabs": [
      {
        "label": "Identificación del Contribuyente",
        "secciones": [
          {
            "label": "Identificación",
            "campos": [
              {
                "clave": "codigo2",
                "label": "Código",
                "t": "ro"
              },
              {
                "clave": "tipoDePersona",
                "label": "Tipo de persona",
                "t": "sel",
                "opts": [
                  "NATURAL",
                  "JURÍDICA",
                  "SUCESIÓN INDIVISA",
                  "SOCIEDAD CONYUGAL"
                ]
              },
              {
                "clave": "apellidoPaterno",
                "label": "Apellido paterno",
                "t": "text"
              },
              {
                "clave": "apellidoMaterno",
                "label": "Apellido materno",
                "t": "text"
              },
              {
                "clave": "nombres",
                "label": "Nombres",
                "t": "text"
              },
              {
                "clave": "razonSocial",
                "label": "Razón social",
                "t": "text",
                "ph": "Solo persona jurídica",
                "ancho": true
              },
              {
                "clave": "dNI2",
                "label": "D.N.I.",
                "t": "text"
              },
              {
                "clave": "rUC2",
                "label": "R.U.C.",
                "t": "text"
              },
              {
                "clave": "fechaDeNacimiento",
                "label": "Fecha de nacimiento",
                "t": "date"
              },
              {
                "clave": "sexo",
                "label": "Sexo",
                "t": "sel",
                "opts": [
                  "MASCULINO",
                  "FEMENINO"
                ]
              },
              {
                "clave": "estadoCivil",
                "label": "Estado civil",
                "t": "sel",
                "opts": [
                  "SOLTERO(A)",
                  "CASADO(A)",
                  "VIUDO(A)",
                  "DIVORCIADO(A)",
                  "CONVIVIENTE"
                ]
              },
              {
                "clave": "conyuge",
                "label": "Cónyuge",
                "t": "text"
              },
              {
                "clave": "calificacionDelContribuyente",
                "label": "Calificación del contribuyente",
                "t": "sel",
                "opts": [
                  "001 — PRINCIPAL CONTRIBUYENTE",
                  "002 — MEDIANO CONTRIBUYENTE",
                  "003 — PEQUEÑO CONTRIBUYENTE"
                ]
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "A — ACTIVO",
                  "I — INACTIVO",
                  "B — BAJA",
                  "F — FALLECIDO",
                  "N — NO HABIDO"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Domicilio Fiscal",
        "secciones": [
          {
            "label": "Domicilio fiscal",
            "campos": [
              {
                "clave": "tipoDeVia",
                "label": "Tipo de vía",
                "t": "sel",
                "opts": [
                  "01 — AV - AVENIDA",
                  "02 — CA - CALLE",
                  "03 — JR - JIRÓN",
                  "04 — PS - PASAJE",
                  "05 — CR - CARRETERA",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "via",
                "label": "Vía",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "habUrbana",
                "label": "Hab. Urbana",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "numero",
                "label": "Número",
                "t": "text"
              },
              {
                "clave": "numeroAdicional",
                "label": "Número adicional",
                "t": "text"
              },
              {
                "clave": "departamento",
                "label": "Departamento",
                "t": "ro"
              },
              {
                "clave": "provincia",
                "label": "Provincia",
                "t": "ro"
              },
              {
                "clave": "distrito",
                "label": "Distrito",
                "t": "ro"
              }
            ]
          },
          {
            "label": "Edificación",
            "campos": [
              {
                "clave": "nombreDeLaEdificacion",
                "label": "Nombre de la edificación",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "tipoEdific",
                "label": "Tipo edific.",
                "t": "sel",
                "opts": [
                  "01 — CASA",
                  "02 — EDIFICIO",
                  "03 — QUINTA",
                  "04 — CENTRO COMERCIAL",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "tipoInterior",
                "label": "Tipo interior",
                "t": "sel",
                "opts": [
                  "01 — DEPARTAMENTO",
                  "02 — INTERIOR",
                  "03 — OFICINA",
                  "04 — TIENDA",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "numInterior",
                "label": "Núm. interior",
                "t": "text"
              }
            ]
          },
          {
            "label": "Zona - Sector - Etapa",
            "campos": [
              {
                "clave": "nombre",
                "label": "Nombre",
                "t": "text",
                "ancho": true
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
              },
              {
                "clave": "subLote",
                "label": "Sub lote",
                "t": "text"
              },
              {
                "clave": "direccionAdicional",
                "label": "Dirección adicional",
                "t": "text",
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
            "label": "Documentos del contribuyente",
            "campos": [
              {
                "clave": "tipoDeDocumento",
                "label": "Tipo de documento",
                "t": "sel",
                "opts": [
                  "01 — NO PRESENTÓ DOCUMENTO",
                  "02 — DNI",
                  "03 — CARNET DE IDENTIDAD DE POLICÍA NACIONAL",
                  "04 — CARNET DE IDENTIDAD DE FUERZAS ARMADAS",
                  "05 — PARTIDA DE NACIMIENTO",
                  "06 — PASAPORTE",
                  "07 — CARNET DE EXTRANJERÍA",
                  "08 — OTROS (ESPECIFICAR)",
                  "09 — RUC",
                  "99 — NO ESPECIFICADO"
                ],
                "ancho": true
              },
              {
                "clave": "numeroDeDocumento",
                "label": "Número de documento",
                "t": "text"
              }
            ],
            "hint": "Nuevo · Agregar · Editar doc. · Quitar"
          }
        ]
      },
      {
        "label": "Contactos",
        "secciones": [
          {
            "label": "Contactos registrados",
            "campos": [
              {
                "clave": "nombreDelContacto",
                "label": "Nombre del contacto",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "cargo",
                "label": "Cargo",
                "t": "text"
              },
              {
                "clave": "eMail",
                "label": "E-Mail",
                "t": "text"
              },
              {
                "clave": "telefonos",
                "label": "Teléfonos",
                "t": "text"
              }
            ],
            "hint": "Nuevo · Agregar · Editar · Quitar"
          }
        ]
      },
      {
        "label": "Gestores",
        "secciones": [
          {
            "label": "Gestores del contribuyente",
            "campos": [
              {
                "clave": "codigoGestor",
                "label": "Código gestor",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "fechaInicio",
                "label": "Fecha inicio",
                "t": "date"
              },
              {
                "clave": "fechaFin",
                "label": "Fecha fin",
                "t": "date"
              },
              {
                "clave": "observacion",
                "label": "Observación",
                "t": "area",
                "ancho": true
              }
            ],
            "hint": "Nuevo · Agregar · Editar · Quitar"
          }
        ]
      },
      {
        "label": "Teléfonos - EMail",
        "secciones": [
          {
            "label": "Teléfonos",
            "campos": [
              {
                "clave": "tipoDeTelefono",
                "label": "Tipo de teléfono",
                "t": "sel",
                "opts": [
                  "01 — DOMICILIO 1",
                  "02 — DOMICILIO 2",
                  "03 — CELULAR",
                  "04 — TRABAJO",
                  "05 — FAX",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "numero2",
                "label": "Número",
                "t": "text"
              }
            ],
            "hint": "Nuevo · Agregar · Editar · Quitar"
          },
          {
            "label": "E-Mail",
            "campos": [
              {
                "clave": "direccion",
                "label": "Dirección",
                "t": "text",
                "ph": "Ej. micorreo@dominio.com",
                "ancho": true
              },
              {
                "clave": "autorizaNotificacionElectronica",
                "label": "Autoriza notificación electrónica",
                "t": "chk"
              }
            ],
            "hint": "Nuevo · Agregar · Editar · Quitar"
          }
        ]
      },
      {
        "label": "Observaciones",
        "secciones": [
          {
            "label": "Observaciones del registro",
            "campos": [
              {
                "clave": "observacion2",
                "label": "Observación",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "registradoPor",
                "label": "Registrado por",
                "t": "ro"
              },
              {
                "clave": "ultimaModificacion",
                "label": "Última modificación",
                "t": "ro"
              }
            ],
            "hint": "Nueva obs. · Agregar"
          }
        ]
      },
      {
        "label": "Fotos",
        "secciones": [
          {
            "label": "Foto álbum personal",
            "campos": [
              {
                "clave": "historialDeFotos",
                "label": "Historial de fotos",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "descripcionDeLaImagen",
                "label": "Descripción de la imagen",
                "t": "text",
                "ancho": true
              }
            ],
            "hint": "Capturar · Cargar · Guardar · Quitar"
          }
        ]
      },
      {
        "label": "Predios y vehículos",
        "secciones": [
          {
            "label": "Unidades afectas del contribuyente",
            "campos": [
              {
                "clave": "prediosRegistrados",
                "label": "Predios registrados",
                "t": "ro"
              },
              {
                "clave": "autovaluoAcumuladoS",
                "label": "Autovalúo acumulado (S/)",
                "t": "ro"
              },
              {
                "clave": "vehiculosAfectos",
                "label": "Vehículos afectos",
                "t": "ro"
              },
              {
                "clave": "licenciasDeFuncionamiento",
                "label": "Licencias de funcionamiento",
                "t": "ro"
              },
              {
                "clave": "papeletasPendientes",
                "label": "Papeletas pendientes",
                "t": "ro"
              },
              {
                "clave": "conveniosVigentes",
                "label": "Convenios vigentes",
                "t": "ro"
              }
            ],
            "hint": "Solo lectura"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Contribuyentes encontrados",
      "cols": [
        "Est.",
        "Código",
        "Nombre / razón social",
        "D.N.I.",
        "R.U.C.",
        "Dirección",
        "Predios",
        "Deuda S/"
      ],
      "claves": [
        "est",
        "codigo",
        "nombreRazonSocial",
        "dNI",
        "rUC",
        "direccion",
        "predios",
        "deudaS"
      ],
      "num": [
        6,
        7
      ]
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Imprimir",
      "Guardar"
    ]
  },
  "predios_rentas": {
    "id": "predios_rentas",
    "mod": "Rentas · Registro",
    "title": "Predios del contribuyente",
    "endpoint": "GET /api/v1/rentas/predios?contribuyente={codigo}",
    "desc": "Padrón predial de rentas. Cada predio guarda su autovalúo, condición de propiedad y la fecha desde la que genera obligación.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "codigoPredial",
        "label": "Código predial",
        "t": "text"
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
          "Afecto",
          "Inafecto",
          "Exonerado",
          "Transferido"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Datos del predio",
        "campos": [
          {
            "clave": "codigoPredial2",
            "label": "Código predial",
            "t": "ro"
          },
          {
            "clave": "codRefCatastral",
            "label": "Cod. Ref. Catastral",
            "t": "ro"
          },
          {
            "clave": "usoDelPredio",
            "label": "Uso del predio",
            "t": "sel",
            "opts": [
              "CASA HABITACIÓN",
              "COMERCIO",
              "INDUSTRIA",
              "TERRENO SIN CONSTRUIR",
              "SERVICIOS"
            ]
          },
          {
            "clave": "clasificacion",
            "label": "Clasificación",
            "t": "sel",
            "opts": [
              "URBANO",
              "RÚSTICO"
            ]
          },
          {
            "clave": "condicionDePropiedad",
            "label": "Condición de propiedad",
            "t": "sel",
            "opts": [
              "PROPIETARIO ÚNICO",
              "COPROPIETARIO",
              "POSEEDOR",
              "SUCESIÓN"
            ]
          },
          {
            "clave": "dePropiedad",
            "label": "% de propiedad",
            "t": "text"
          },
          {
            "clave": "fechaDeAdquisicion",
            "label": "Fecha de adquisición",
            "t": "date"
          },
          {
            "clave": "afectoDesdeEjercicio",
            "label": "Afecto desde (ejercicio)",
            "t": "ro"
          }
        ]
      },
      {
        "label": "Valuación",
        "campos": [
          {
            "clave": "areaDeTerrenoM",
            "label": "Área de terreno (m²)",
            "t": "text"
          },
          {
            "clave": "arancelSM",
            "label": "Arancel (S/ m²)",
            "t": "ro"
          },
          {
            "clave": "valorDelTerrenoS",
            "label": "Valor del terreno (S/)",
            "t": "ro"
          },
          {
            "clave": "areaConstruidaM",
            "label": "Área construida (m²)",
            "t": "ro"
          },
          {
            "clave": "valorDeConstruccionS",
            "label": "Valor de construcción (S/)",
            "t": "ro"
          },
          {
            "clave": "obrasComplementariasS",
            "label": "Obras complementarias (S/)",
            "t": "ro"
          },
          {
            "clave": "autovaluoDelPredioS",
            "label": "Autovalúo del predio (S/)",
            "t": "ro"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Predios registrados",
      "cols": [
        "Código predial",
        "Ubicación",
        "Uso",
        "Terreno m²",
        "Const. m²",
        "% prop.",
        "Autovalúo S/",
        "Condición"
      ],
      "claves": [
        "codigoPredial",
        "ubicacion",
        "uso",
        "terrenoM",
        "constM",
        "prop",
        "autovaluoS",
        "condicion"
      ],
      "num": [
        3,
        4,
        5,
        6
      ]
    },
    "acciones": [
      "Nuevo",
      "Guardar",
      "Ver ficha catastral"
    ]
  },
  "predial_individual": {
    "id": "predial_individual",
    "mod": "Rentas · Registro",
    "title": "Cálculo individual del impuesto predial",
    "endpoint": "POST /api/v1/rentas/predial/calculo-individual",
    "desc": "Determina el impuesto de un contribuyente sobre el autovalúo acumulado de todos sus predios en el distrito, con la escala progresiva acumulativa y el mínimo imponible de 0.6 % de la UIT.",
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
        "clave": "djN",
        "label": "DJ N°",
        "t": "text"
      },
      {
        "clave": "tipoDeDeclaracion",
        "label": "Tipo de declaración",
        "t": "sel",
        "opts": [
          "INSCRIPCIÓN",
          "DESCARGO",
          "RECTIFICATORIA",
          "ANUAL MECANIZADA"
        ]
      },
      {
        "clave": "fechaDeDeclaracion",
        "label": "Fecha de declaración",
        "t": "date"
      }
    ],
    "secciones": [
      {
        "label": "Escala progresiva acumulativa",
        "campos": [
          {
            "clave": "uitVigente2026S",
            "label": "UIT vigente 2026 (S/)",
            "t": "ro"
          },
          {
            "clave": "valuoTotalS",
            "label": "Valuo Total (S/)",
            "t": "ro"
          },
          {
            "clave": "valuoExoneradoS",
            "label": "Valuo Exonerado (S/)",
            "t": "ro"
          },
          {
            "clave": "valuoAfectoS",
            "label": "Valuo Afecto (S/)",
            "t": "ro"
          },
          {
            "clave": "tramo1Hasta15Uit02",
            "label": "Tramo 1 — hasta 15 UIT (0.2 %)",
            "t": "ro"
          },
          {
            "clave": "tramo2De15A60Uit06",
            "label": "Tramo 2 — de 15 a 60 UIT (0.6 %)",
            "t": "ro"
          },
          {
            "clave": "tramo3MasDe60Uit10",
            "label": "Tramo 3 — más de 60 UIT (1.0 %)",
            "t": "ro"
          },
          {
            "clave": "impuestoInsolutoAnualS",
            "label": "Impuesto insoluto anual (S/)",
            "t": "ro"
          },
          {
            "clave": "minimoImponible06Uit",
            "label": "Mínimo imponible (0.6 % UIT)",
            "t": "ro"
          }
        ]
      },
      {
        "label": "Beneficios aplicados",
        "campos": [
          {
            "clave": "deduccionPensionistaAdultoMayor",
            "label": "Deducción pensionista / adulto mayor",
            "t": "sel",
            "opts": [
              "NO APLICA",
              "PENSIONISTA — 50 UIT",
              "ADULTO MAYOR NO PENSIONISTA — 50 UIT"
            ]
          },
          {
            "clave": "nDeResolucion",
            "label": "Nº de resolución",
            "t": "text",
            "ph": "RES-0000-2026-MPS"
          },
          {
            "clave": "inafectacion",
            "label": "Inafectación",
            "t": "sel",
            "opts": [
              "NINGUNA",
              "GOBIERNO CENTRAL",
              "ENTIDAD RELIGIOSA",
              "CUERPO DE BOMBEROS",
              "BENEFICENCIA"
            ]
          },
          {
            "clave": "montoDeducidoS",
            "label": "Monto deducido (S/)",
            "t": "ro"
          }
        ],
        "hint": "Opcional"
      },
      {
        "label": "Emisión y cuotas",
        "campos": [
          {
            "clave": "modalidad",
            "label": "Modalidad",
            "t": "sel",
            "opts": [
              "AL CONTADO",
              "FRACCIONADO EN 4 CUOTAS"
            ]
          },
          {
            "clave": "derechoDeEmisionS",
            "label": "Derecho de emisión (S/)",
            "t": "ro"
          },
          {
            "clave": "cuota1Vence2802",
            "label": "Cuota 1 — vence 28/02",
            "t": "ro"
          },
          {
            "clave": "cuota2Vence3105",
            "label": "Cuota 2 — vence 31/05",
            "t": "ro"
          },
          {
            "clave": "cuota3Vence3108",
            "label": "Cuota 3 — vence 31/08",
            "t": "ro"
          },
          {
            "clave": "cuota4Vence3011",
            "label": "Cuota 4 — vence 30/11",
            "t": "ro"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Predios que integran la base imponible",
      "cols": [
        "Código predial",
        "Ubicación",
        "Uso",
        "% prop.",
        "Valuo Total S/",
        "Valuo Exonerado S/",
        "Valuo Afecto S/"
      ],
      "claves": [
        "codigoPredial",
        "ubicacion",
        "uso",
        "prop",
        "valuoTotalS",
        "valuoExoneradoS",
        "valuoAfectoS"
      ],
      "num": [
        3,
        4,
        5,
        6
      ],
      "note": "Fases del cálculo: REGISTRO → HR (hoja resumen) → PU (predio urbano) → PR (predio rústico). El sistema no permite emitir la cuponera si alguna fase presenta inconsistencia."
    },
    "totales": [
      {
        "label": "Valuo afecto",
        "fuerte": false
      },
      {
        "label": "Impuesto insoluto",
        "fuerte": false
      },
      {
        "label": "Derecho de emisión",
        "fuerte": false
      },
      {
        "label": "Total a pagar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Buscar",
      "Simular",
      "Calcular"
    ]
  },
  "predial_masivo": {
    "id": "predial_masivo",
    "mod": "Rentas · Registro",
    "title": "Cálculo masivo del impuesto predial",
    "endpoint": "POST /api/v1/rentas/predial/calculo-masivo",
    "desc": "Proceso batch de emisión anual. Recalcula todo el padrón para el ejercicio seleccionado y deja constancia de los contribuyentes observados que quedan fuera de la emisión.",
    "secciones": [
      {
        "label": "Parámetros del proceso",
        "campos": [
          {
            "clave": "ejercicioACalcular",
            "label": "Ejercicio a calcular",
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
            "clave": "alcance",
            "label": "Alcance",
            "t": "sel",
            "opts": [
              "TODO EL PADRÓN",
              "POR SECTOR",
              "POR RANGO DE CÓDIGO",
              "SOLO OBSERVADOS"
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
            "clave": "uitDelEjercicioS",
            "label": "UIT del ejercicio (S/)",
            "t": "ro"
          },
          {
            "clave": "derechoDeEmisionS",
            "label": "Derecho de emisión (S/)",
            "t": "text"
          },
          {
            "clave": "incluyeArbitrios",
            "label": "Incluye arbitrios",
            "t": "chk",
            "ph": "Emitir arbitrios junto al predial"
          },
          {
            "clave": "recalculaYaEmitidos",
            "label": "Recalcula ya emitidos",
            "t": "chk",
            "ph": "Sobrescribe cuponeras existentes"
          },
          {
            "clave": "generaCuponeraPdf",
            "label": "Genera cuponera PDF",
            "t": "chk",
            "ph": "Produce archivo para imprenta"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Resultado de la última corrida",
      "cols": [
        "Etapa",
        "Registros",
        "Monto S/",
        "Observados",
        "Estado"
      ],
      "claves": [
        "etapa",
        "registros",
        "montoS",
        "observados",
        "estado"
      ],
      "num": [
        1,
        2,
        3
      ],
      "note": "Los contribuyentes observados quedan sin emisión hasta que se corrija la inconsistencia (predio sin arancel, ficha no conciliada o titularidad incompleta)."
    },
    "acciones": [
      "Simular",
      "Ver observados",
      "Ejecutar proceso"
    ]
  },
  "declaracion_jurada": {
    "id": "declaracion_jurada",
    "mod": "Rentas · Registro",
    "title": "Declaración jurada — HR, PU y PR",
    "endpoint": "GET /api/v1/rentas/declaraciones/{djNro}",
    "desc": "Formularios de la declaración: hoja resumen (HR), predio urbano (PU) y predio rústico (PR). Se imprimen para la firma del contribuyente y quedan como sustento del cálculo.",
    "filtros": [
      {
        "clave": "djN",
        "label": "DJ N°",
        "t": "text"
      },
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
          "Todas",
          "INSCRIPCIÓN",
          "DESCARGO",
          "RECTIFICATORIA",
          "ANUAL MECANIZADA"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Formularios a emitir",
        "campos": [
          {
            "clave": "hrHojaResumen",
            "label": "HR — Hoja resumen",
            "t": "chk",
            "ph": "Resumen de predios y determinación"
          },
          {
            "clave": "puPredioUrbano",
            "label": "PU — Predio urbano",
            "t": "chk",
            "ph": "Un formulario por predio urbano"
          },
          {
            "clave": "prPredioRustico",
            "label": "PR — Predio rústico",
            "t": "chk",
            "ph": "Un formulario por predio rústico"
          },
          {
            "clave": "nDeEjemplares",
            "label": "Nº de ejemplares",
            "t": "sel",
            "opts": [
              "1",
              "2",
              "3"
            ]
          },
          {
            "clave": "enviarAOpenoffice",
            "label": "Enviar a OpenOffice",
            "t": "chk",
            "ph": "Exporta en lugar de imprimir"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Declaraciones presentadas",
      "cols": [
        "DJ N°",
        "Año",
        "Contribuyente",
        "Tipo",
        "Fecha",
        "Predios",
        "Valuo afecto S/",
        "Estado"
      ],
      "claves": [
        "djN",
        "ano",
        "contribuyente",
        "tipo",
        "fecha",
        "predios",
        "valuoAfectoS",
        "estado"
      ],
      "num": [
        5,
        6
      ]
    },
    "acciones": [
      "Vista previa",
      "Imprimir HR / PU / PR"
    ]
  },
  "arbitrios": {
    "id": "arbitrios",
    "mod": "Rentas · Registro",
    "title": "Arbitrios municipales",
    "endpoint": "GET /api/v1/rentas/arbitrios?anio=2026",
    "desc": "Limpieza pública, parques y jardines y serenazgo. La tasa depende del uso del predio, la zona, la frecuencia del servicio y los metros de frontis declarados en la ficha.",
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
        "clave": "codigoPredial",
        "label": "Código predial",
        "t": "text"
      },
      {
        "clave": "zona",
        "label": "Zona",
        "t": "sel",
        "opts": [
          "Zona 1",
          "Zona 2",
          "Zona 3",
          "Zona 4"
        ]
      },
      {
        "clave": "uso",
        "label": "Uso",
        "t": "sel",
        "opts": [
          "CASA HABITACIÓN",
          "COMERCIO",
          "INDUSTRIA",
          "SERVICIOS",
          "TERRENO SIN CONSTRUIR"
        ]
      }
    ],
    "tabla": {
      "title": "Determinación por servicio",
      "cols": [
        "Servicio",
        "Criterio de distribución",
        "Frecuencia",
        "Tasa mensual S/",
        "Anual S/",
        "Condición"
      ],
      "claves": [
        "servicio",
        "criterioDeDistribucion",
        "frecuencia",
        "tasaMensualS",
        "anualS",
        "condicion"
      ],
      "num": [
        3,
        4
      ]
    },
    "totales": [
      {
        "label": "Arbitrio anual",
        "fuerte": false
      },
      {
        "label": "Descuento pronto pago",
        "fuerte": false
      },
      {
        "label": "Cuotas",
        "fuerte": false
      },
      {
        "label": "Total 2026",
        "fuerte": true
      }
    ],
    "acciones": [
      "Recalcular",
      "Emitir cuponera de arbitrios"
    ]
  },
  "transferencia_predio": {
    "id": "transferencia_predio",
    "mod": "Rentas · Registro",
    "title": "Transferencia de predio",
    "endpoint": "POST /api/v1/rentas/transferencias/predio",
    "desc": "Da de baja al transferente y de alta al adquirente desde la fecha del acto. La obligación del vendedor corre hasta el 31 de diciembre del año de la transferencia.",
    "secciones": [
      {
        "label": "Datos del acto",
        "campos": [
          {
            "clave": "nDeExpediente",
            "label": "Nº de expediente",
            "t": "text"
          },
          {
            "clave": "tipoDeActo",
            "label": "Tipo de acto",
            "t": "sel",
            "opts": [
              "COMPRA-VENTA",
              "DONACIÓN",
              "PERMUTA",
              "ANTICIPO DE LEGÍTIMA",
              "ADJUDICACIÓN",
              "DACIÓN EN PAGO",
              "SUCESIÓN"
            ]
          },
          {
            "clave": "fechaDelActo",
            "label": "Fecha del acto",
            "t": "date"
          },
          {
            "clave": "nDeMinutaEscritura",
            "label": "Nº de minuta / escritura",
            "t": "text"
          },
          {
            "clave": "notaria",
            "label": "Notaría",
            "t": "text"
          },
          {
            "clave": "codigoPredial",
            "label": "Código predial",
            "t": "text"
          },
          {
            "clave": "transferido",
            "label": "% transferido",
            "t": "text"
          }
        ]
      },
      {
        "label": "Partes intervinientes",
        "campos": [
          {
            "clave": "transferenteDocumento",
            "label": "Transferente — documento",
            "t": "text"
          },
          {
            "clave": "transferenteNombre",
            "label": "Transferente — nombre",
            "t": "ro"
          },
          {
            "clave": "transferenteAfectoHasta",
            "label": "Transferente afecto hasta",
            "t": "ro"
          },
          {
            "clave": "adquirenteDocumento",
            "label": "Adquirente — documento",
            "t": "text"
          },
          {
            "clave": "adquirenteNombre",
            "label": "Adquirente — nombre",
            "t": "ro"
          },
          {
            "clave": "adquirenteAfectoDesde",
            "label": "Adquirente afecto desde",
            "t": "ro"
          },
          {
            "clave": "generaAlcabala",
            "label": "Genera alcabala",
            "t": "chk",
            "ph": "Liquida el impuesto de alcabala"
          }
        ]
      }
    ],
    "acciones": [
      "Validar deuda del transferente",
      "Registrar transferencia"
    ]
  },
  "alcabala": {
    "id": "alcabala",
    "mod": "Rentas · Registro",
    "title": "Impuesto de alcabala",
    "endpoint": "POST /api/v1/rentas/alcabala",
    "desc": "Grava la transferencia de propiedad con el 3 % sobre el exceso de las primeras 10 UIT, tomando como base el mayor valor entre el de transferencia y el autovalúo ajustado por el IPM.",
    "secciones": [
      {
        "label": "Liquidación",
        "campos": [
          {
            "clave": "nDeLiquidacion",
            "label": "Nº de liquidación",
            "t": "ro"
          },
          {
            "clave": "nDeExpediente",
            "label": "Nº de expediente",
            "t": "text"
          },
          {
            "clave": "fechaDeLaTransferencia",
            "label": "Fecha de la transferencia",
            "t": "date"
          },
          {
            "clave": "valorDeTransferenciaS",
            "label": "Valor de transferencia (S/)",
            "t": "text"
          },
          {
            "clave": "autovaluoDelPredioS",
            "label": "Autovalúo del predio (S/)",
            "t": "ro"
          },
          {
            "clave": "ipmAplicado",
            "label": "IPM aplicado",
            "t": "ro"
          },
          {
            "clave": "autovaluoAjustadoS",
            "label": "Autovalúo ajustado (S/)",
            "t": "ro"
          },
          {
            "clave": "baseDeCalculoElMayor",
            "label": "Base de cálculo (el mayor)",
            "t": "ro"
          },
          {
            "clave": "tramoInafecto10UitS",
            "label": "Tramo inafecto — 10 UIT (S/)",
            "t": "ro"
          },
          {
            "clave": "baseImponibleS",
            "label": "Base imponible (S/)",
            "t": "ro"
          },
          {
            "clave": "tasa",
            "label": "Tasa",
            "t": "ro"
          },
          {
            "clave": "impuestoDeAlcabalaS",
            "label": "Impuesto de alcabala (S/)",
            "t": "ro"
          },
          {
            "clave": "venceElUltimoDiaHabilDelMesSiguiente",
            "label": "Vence el último día hábil del mes siguiente",
            "t": "ro"
          }
        ]
      }
    ],
    "totales": [
      {
        "label": "Base de cálculo",
        "fuerte": false
      },
      {
        "label": "Tramo inafecto",
        "fuerte": false
      },
      {
        "label": "Base imponible",
        "fuerte": false
      },
      {
        "label": "Alcabala a pagar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Liquidar",
      "Generar orden de pago",
      "Imprimir liquidación"
    ]
  },
  "vehiculos": {
    "id": "vehiculos",
    "mod": "Rentas · Registro",
    "title": "Ficha de vehículo",
    "endpoint": "GET /api/v1/rentas/vehiculos/{placa}",
    "desc": "Registro del vehículo. La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral.",
    "filtros": [
      {
        "clave": "codContribuyente",
        "label": "Cod. Contribuyente",
        "t": "text"
      },
      {
        "clave": "nombre",
        "label": "Nombre",
        "t": "text"
      },
      {
        "clave": "nroDocumento",
        "label": "Nro. Documento",
        "t": "text"
      },
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
      {
        "clave": "nroMotor",
        "label": "Nro. Motor",
        "t": "text"
      }
    ],
    "tabs": [
      {
        "label": "Datos del vehículo",
        "secciones": [
          {
            "label": "Identificación",
            "campos": [
              {
                "clave": "nroDeTarjeta",
                "label": "Nro. de tarjeta",
                "t": "text"
              },
              {
                "clave": "reparticion",
                "label": "Repartición",
                "t": "sel",
                "opts": [
                  "SULLANA",
                  "PIURA",
                  "LIMA"
                ]
              },
              {
                "clave": "placa2",
                "label": "Placa",
                "t": "text"
              },
              {
                "clave": "nroDeExpediente",
                "label": "Nro. de expediente",
                "t": "text"
              },
              {
                "clave": "fechaDeInscripcion",
                "label": "Fecha de inscripción",
                "t": "date"
              },
              {
                "clave": "anoDeFabricacion",
                "label": "Año de fabricación",
                "t": "text"
              },
              {
                "clave": "fechaDeIngresoMps",
                "label": "Fecha de ingreso MPS",
                "t": "date"
              },
              {
                "clave": "clase",
                "label": "Clase",
                "t": "sel",
                "opts": [
                  "AUTOMÓVIL",
                  "STATION WAGON",
                  "CAMIONETA",
                  "CAMIÓN",
                  "ÓMNIBUS",
                  "REMOLCADOR"
                ]
              },
              {
                "clave": "marca",
                "label": "Marca",
                "t": "sel",
                "opts": [
                  "TOYOTA",
                  "HYUNDAI",
                  "NISSAN",
                  "KIA",
                  "SUZUKI",
                  "CHEVROLET"
                ]
              },
              {
                "clave": "modelo",
                "label": "Modelo",
                "t": "text"
              },
              {
                "clave": "carroceria",
                "label": "Carrocería",
                "t": "sel",
                "opts": [
                  "SEDÁN",
                  "HATCHBACK",
                  "FURGÓN",
                  "TOLVA",
                  "CISTERNA"
                ]
              },
              {
                "clave": "combustible",
                "label": "Combustible",
                "t": "sel",
                "opts": [
                  "GASOLINA",
                  "DIÉSEL",
                  "GLP",
                  "GNV",
                  "ELÉCTRICO",
                  "HÍBRIDO"
                ]
              },
              {
                "clave": "categoria",
                "label": "Categoría",
                "t": "sel",
                "opts": [
                  "M1",
                  "M2",
                  "M3",
                  "N1",
                  "N2",
                  "N3",
                  "L5"
                ]
              }
            ]
          },
          {
            "label": "Características técnicas",
            "campos": [
              {
                "clave": "cilindrajeCC",
                "label": "Cilindraje (C.C.)",
                "t": "text"
              },
              {
                "clave": "cilindros",
                "label": "Cilindros",
                "t": "text"
              },
              {
                "clave": "ejes",
                "label": "Ejes",
                "t": "text"
              },
              {
                "clave": "ruedas",
                "label": "Ruedas",
                "t": "text"
              },
              {
                "clave": "colores",
                "label": "Colores",
                "t": "text"
              },
              {
                "clave": "nroDeMotor",
                "label": "Nro. de motor",
                "t": "text"
              },
              {
                "clave": "nroDeSerie",
                "label": "Nro. de serie",
                "t": "text"
              },
              {
                "clave": "pasajeros",
                "label": "Pasajeros",
                "t": "text"
              },
              {
                "clave": "asientos",
                "label": "Asientos",
                "t": "text"
              },
              {
                "clave": "pesoSecoKg",
                "label": "Peso seco (kg)",
                "t": "text"
              },
              {
                "clave": "pesoBrutoKg",
                "label": "Peso bruto (kg)",
                "t": "text"
              },
              {
                "clave": "cargaUtilKg",
                "label": "Carga útil (kg)",
                "t": "text"
              },
              {
                "clave": "longitudM",
                "label": "Longitud (m)",
                "t": "text"
              },
              {
                "clave": "alturaM",
                "label": "Altura (m)",
                "t": "text"
              },
              {
                "clave": "anchoM",
                "label": "Ancho (m)",
                "t": "text"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Propietario",
        "secciones": [
          {
            "label": "Titular del vehículo",
            "campos": [
              {
                "clave": "codContribuyente2",
                "label": "Cod. Contribuyente",
                "t": "ro"
              },
              {
                "clave": "nombreRazonSocial",
                "label": "Nombre / razón social",
                "t": "ro"
              },
              {
                "clave": "documento",
                "label": "Documento",
                "t": "ro"
              },
              {
                "clave": "domicilioFiscal",
                "label": "Domicilio fiscal",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "fechaDeAdquisicion",
                "label": "Fecha de adquisición",
                "t": "date"
              },
              {
                "clave": "formaDeAdquisicion",
                "label": "Forma de adquisición",
                "t": "sel",
                "opts": [
                  "COMPRA-VENTA",
                  "REMATE",
                  "DONACIÓN",
                  "HERENCIA",
                  "IMPORTACIÓN"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Conductor",
        "secciones": [
          {
            "label": "Conductor habitual",
            "campos": [
              {
                "clave": "documento2",
                "label": "Documento",
                "t": "text"
              },
              {
                "clave": "nombre2",
                "label": "Nombre",
                "t": "text"
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
                  "A-IIIa",
                  "B-IIa",
                  "B-IIc"
                ]
              },
              {
                "clave": "vencimientoDeLicencia",
                "label": "Vencimiento de licencia",
                "t": "date"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Datos tributarios",
        "secciones": [
          {
            "label": "Impuesto al patrimonio vehicular",
            "campos": [
              {
                "clave": "primerAnoDeAfectacion",
                "label": "Primer año de afectación",
                "t": "ro"
              },
              {
                "clave": "ultimoAnoDeAfectacion",
                "label": "Último año de afectación",
                "t": "ro"
              },
              {
                "clave": "valorDeAdquisicionS",
                "label": "Valor de adquisición (S/)",
                "t": "text"
              },
              {
                "clave": "tablaReferencialMefS",
                "label": "Tabla referencial MEF (S/)",
                "t": "ro"
              },
              {
                "clave": "baseImponibleElMayorS",
                "label": "Base imponible — el mayor (S/)",
                "t": "ro"
              },
              {
                "clave": "tasa",
                "label": "Tasa",
                "t": "ro"
              },
              {
                "clave": "impuestoAnualS",
                "label": "Impuesto anual (S/)",
                "t": "ro"
              },
              {
                "clave": "minimoImponible15Uit",
                "label": "Mínimo imponible (1.5 % UIT)",
                "t": "ro"
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "A — AFECTO",
                  "I — INAFECTO",
                  "E — EXONERADO",
                  "B — BAJA POR VENCIMIENTO"
                ]
              }
            ]
          }
        ]
      },
      {
        "label": "Beneficios",
        "secciones": [
          {
            "label": "Inafectación y exoneración",
            "campos": [
              {
                "clave": "tipoDeBeneficio",
                "label": "Tipo de beneficio",
                "t": "sel",
                "opts": [
                  "NINGUNO",
                  "GOBIERNO CENTRAL",
                  "CUERPO DIPLOMÁTICO",
                  "BOMBEROS",
                  "TRANSPORTE PÚBLICO",
                  "PERSONA CON DISCAPACIDAD"
                ]
              },
              {
                "clave": "nroDeResolucion",
                "label": "Nro. de resolución",
                "t": "text",
                "ph": "RES-0000-2026"
              },
              {
                "clave": "vigenciaDesde",
                "label": "Vigencia desde",
                "t": "date"
              },
              {
                "clave": "vigenciaHasta",
                "label": "Vigencia hasta",
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
      "title": "Vehículos encontrados",
      "cols": [
        "Est.",
        "Placa",
        "Clase",
        "Marca",
        "Modelo",
        "Año fab.",
        "Contribuyente",
        "Afectación"
      ],
      "claves": [
        "est",
        "placa",
        "clase",
        "marca",
        "modelo",
        "anoFab",
        "contribuyente",
        "afectacion"
      ]
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Excel",
      "Imprimir",
      "Guardar"
    ]
  },
  "vehicular_calculo": {
    "id": "vehicular_calculo",
    "mod": "Rentas · Registro",
    "title": "Cálculo del impuesto vehicular",
    "endpoint": "POST /api/v1/rentas/vehicular/calculo",
    "desc": "Aplica el 1 % sobre la base imponible con un mínimo del 1.5 % de la UIT, por los tres ejercicios en que el vehículo permanece afecto.",
    "filtros": [
      {
        "clave": "placa",
        "label": "Placa",
        "t": "text"
      },
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
    "tabla": {
      "title": "Determinación por ejercicio",
      "cols": [
        "Ejercicio",
        "Base imponible S/",
        "Tasa",
        "Impuesto S/",
        "Cuotas",
        "Estado"
      ],
      "claves": [
        "ejercicio",
        "baseImponibleS",
        "tasa",
        "impuestoS",
        "cuotas",
        "estado"
      ],
      "num": [
        1,
        3
      ],
      "note": "La base imponible es el mayor valor entre el de adquisición y la tabla referencial del MEF vigente para el año de fabricación."
    },
    "totales": [
      {
        "label": "Base imponible",
        "fuerte": false
      },
      {
        "label": "Impuesto anual",
        "fuerte": false
      },
      {
        "label": "Cuota trimestral",
        "fuerte": false
      },
      {
        "label": "Total tres ejercicios",
        "fuerte": true
      }
    ],
    "acciones": [
      "Simular",
      "Calcular",
      "Emitir cuponera"
    ]
  },
  "transferencia_vehiculo": {
    "id": "transferencia_vehiculo",
    "mod": "Rentas · Registro",
    "title": "Transferencia de vehículo",
    "endpoint": "POST /api/v1/rentas/transferencias/vehiculo",
    "desc": "Registra el cambio de titular. El transferente responde por el impuesto hasta el 31 de diciembre del año en que se produce la venta.",
    "secciones": [
      {
        "label": "Datos de la transferencia",
        "campos": [
          {
            "clave": "placa",
            "label": "Placa",
            "t": "text"
          },
          {
            "clave": "nroDeExpediente",
            "label": "Nro. de expediente",
            "t": "text"
          },
          {
            "clave": "fechaDeTransferencia",
            "label": "Fecha de transferencia",
            "t": "date"
          },
          {
            "clave": "tipoDeActo",
            "label": "Tipo de acto",
            "t": "sel",
            "opts": [
              "COMPRA-VENTA",
              "DONACIÓN",
              "REMATE",
              "HERENCIA",
              "DACIÓN EN PAGO"
            ]
          },
          {
            "clave": "documentoSustentatorio",
            "label": "Documento sustentatorio",
            "t": "sel",
            "opts": [
              "ACTA NOTARIAL DE TRANSFERENCIA",
              "CONTRATO CON FIRMA LEGALIZADA",
              "PARTE REGISTRAL",
              "RESOLUCIÓN JUDICIAL"
            ]
          },
          {
            "clave": "nDelDocumento",
            "label": "Nº del documento",
            "t": "text"
          }
        ]
      },
      {
        "label": "Partes",
        "campos": [
          {
            "clave": "transferenteDocumento",
            "label": "Transferente — documento",
            "t": "text"
          },
          {
            "clave": "transferenteNombre",
            "label": "Transferente — nombre",
            "t": "ro"
          },
          {
            "clave": "afectoHasta",
            "label": "Afecto hasta",
            "t": "ro"
          },
          {
            "clave": "adquirenteDocumento",
            "label": "Adquirente — documento",
            "t": "text"
          },
          {
            "clave": "adquirenteNombre",
            "label": "Adquirente — nombre",
            "t": "ro"
          },
          {
            "clave": "afectoDesde",
            "label": "Afecto desde",
            "t": "ro"
          },
          {
            "clave": "deudaPendienteDelTransferenteS",
            "label": "Deuda pendiente del transferente (S/)",
            "t": "ro"
          }
        ]
      }
    ],
    "acciones": [
      "Validar deuda",
      "Registrar transferencia"
    ]
  },
  "espectaculos": {
    "id": "espectaculos",
    "mod": "Rentas · Registro",
    "title": "Espectáculos públicos no deportivos",
    "endpoint": "POST /api/v1/rentas/espectaculos",
    "desc": "Grava el monto que se abona por presenciar el espectáculo. La tasa depende del tipo de evento y el organizador actúa como agente perceptor.",
    "filtros": [
      {
        "clave": "nDeExpediente",
        "label": "Nº de expediente",
        "t": "text"
      },
      {
        "clave": "organizador",
        "label": "Organizador",
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
      }
    ],
    "secciones": [
      {
        "label": "Declaración del espectáculo",
        "campos": [
          {
            "clave": "nDeExpediente2",
            "label": "Nº de expediente",
            "t": "text"
          },
          {
            "clave": "organizador2",
            "label": "Organizador",
            "t": "text"
          },
          {
            "clave": "rUC",
            "label": "R.U.C.",
            "t": "text"
          },
          {
            "clave": "tipoDeEspectaculo",
            "label": "Tipo de espectáculo",
            "t": "sel",
            "opts": [
              "CONCIERTO DE MÚSICA POPULAR",
              "ESPECTÁCULO TAURINO",
              "CARRERA DE CABALLOS",
              "DISCOTECA",
              "CINE",
              "TEATRO",
              "FOLCLORE NACIONAL"
            ]
          },
          {
            "clave": "denominacionDelEvento",
            "label": "Denominación del evento",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "local",
            "label": "Local",
            "t": "text"
          },
          {
            "clave": "fechaDelEvento",
            "label": "Fecha del evento",
            "t": "date"
          },
          {
            "clave": "aforoAutorizado",
            "label": "Aforo autorizado",
            "t": "text"
          },
          {
            "clave": "nDeEntradasVendidas",
            "label": "Nº de entradas vendidas",
            "t": "text"
          },
          {
            "clave": "precioPromedioS",
            "label": "Precio promedio (S/)",
            "t": "text"
          },
          {
            "clave": "recaudacionDeclaradaS",
            "label": "Recaudación declarada (S/)",
            "t": "ro"
          },
          {
            "clave": "tasaAplicable",
            "label": "Tasa aplicable",
            "t": "ro"
          },
          {
            "clave": "impuestoAPagarS",
            "label": "Impuesto a pagar (S/)",
            "t": "ro"
          },
          {
            "clave": "garantiaDepositadaS",
            "label": "Garantía depositada (S/)",
            "t": "text"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Espectáculos declarados",
      "cols": [
        "Expediente",
        "Organizador",
        "Espectáculo",
        "Fecha",
        "Aforo",
        "Recaudación S/",
        "Tasa",
        "Impuesto S/"
      ],
      "claves": [
        "expediente",
        "organizador",
        "espectaculo",
        "fecha",
        "aforo",
        "recaudacionS",
        "tasa",
        "impuestoS"
      ],
      "num": [
        4,
        5,
        7
      ],
      "note": "El cine, el teatro, los conciertos de música clásica, la ópera, el ballet y el folclore nacional están inafectos por ley."
    },
    "acciones": [
      "Liquidar",
      "Registrar",
      "Imprimir liquidación"
    ]
  },
  "beneficios": {
    "id": "beneficios",
    "mod": "Rentas · Registro",
    "title": "Beneficios y exoneraciones",
    "endpoint": "GET /api/v1/rentas/beneficios",
    "desc": "Deducciones, inafectaciones y amnistías. La deducción de 50 UIT para pensionistas y adultos mayores exige predio único destinado a vivienda.",
    "filtros": [
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "Todos",
          "PENSIONISTA",
          "ADULTO MAYOR",
          "DISCAPACIDAD",
          "INAFECTACIÓN",
          "AMNISTÍA"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "VIGENTE",
          "EN TRÁMITE",
          "DENEGADO",
          "VENCIDO"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Solicitud de beneficio",
        "campos": [
          {
            "clave": "tipoDeBeneficio",
            "label": "Tipo de beneficio",
            "t": "sel",
            "opts": [
              "PENSIONISTA — DEDUCCIÓN 50 UIT",
              "ADULTO MAYOR NO PENSIONISTA",
              "PERSONA CON DISCAPACIDAD",
              "INAFECTACIÓN",
              "AMNISTÍA TRIBUTARIA"
            ]
          },
          {
            "clave": "codContribuyente",
            "label": "Cod. Contribuyente",
            "t": "text"
          },
          {
            "clave": "codigoPredial",
            "label": "Código predial",
            "t": "text"
          },
          {
            "clave": "nDeExpediente",
            "label": "Nº de expediente",
            "t": "text"
          },
          {
            "clave": "fechaDeSolicitud",
            "label": "Fecha de solicitud",
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
            "clave": "vigenciaDesde",
            "label": "Vigencia desde",
            "t": "date"
          },
          {
            "clave": "predioUnicoVerificado",
            "label": "Predio único verificado",
            "t": "chk",
            "ph": "Cumple el requisito de predio único"
          },
          {
            "clave": "destinadoAVivienda",
            "label": "Destinado a vivienda",
            "t": "chk",
            "ph": "Uso parcial comercial permitido"
          },
          {
            "clave": "sustento",
            "label": "Sustento",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Beneficios registrados",
      "cols": [
        "Expediente",
        "Contribuyente",
        "Tipo",
        "Resolución",
        "Vigencia",
        "Deducción",
        "Estado"
      ],
      "claves": [
        "expediente",
        "contribuyente",
        "tipo",
        "resolucion",
        "vigencia",
        "deduccion",
        "estado"
      ]
    },
    "acciones": [
      "Registrar",
      "Denegar",
      "Aprobar"
    ]
  },
  "alta_deuda": {
    "id": "alta_deuda",
    "mod": "Rentas · Registro",
    "title": "Alta de deuda",
    "endpoint": "POST /api/v1/rentas/deuda/altas",
    "desc": "Incorpora manualmente una obligación a la cuenta corriente cuando no proviene de la emisión masiva: determinaciones de fiscalización, multas o deuda migrada.",
    "secciones": [
      {
        "label": "Deuda a dar de alta",
        "campos": [
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
            "clave": "conceptoTributo",
            "label": "Concepto / tributo",
            "t": "sel",
            "opts": [
              "IMPUESTO PREDIAL",
              "ARBITRIOS MUNICIPALES",
              "PATRIMONIO VEHICULAR",
              "ALCABALA",
              "MULTA TRIBUTARIA",
              "MULTA ADMINISTRATIVA",
              "DERECHOS ADMINISTRATIVOS"
            ]
          },
          {
            "clave": "unidadPredioPlaca",
            "label": "Unidad (predio / placa)",
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
            "clave": "insolutoS",
            "label": "Insoluto (S/)",
            "t": "text"
          },
          {
            "clave": "reajusteS",
            "label": "Reajuste (S/)",
            "t": "text"
          },
          {
            "clave": "interesS",
            "label": "Interés (S/)",
            "t": "text"
          },
          {
            "clave": "gastosS",
            "label": "Gastos (S/)",
            "t": "text"
          },
          {
            "clave": "fechaDeVencimiento",
            "label": "Fecha de vencimiento",
            "t": "date"
          },
          {
            "clave": "documentoQueSustenta",
            "label": "Documento que sustenta",
            "t": "sel",
            "opts": [
              "RESOLUCIÓN DE DETERMINACIÓN",
              "RESOLUCIÓN DE MULTA",
              "ACTA DE FISCALIZACIÓN",
              "MIGRACIÓN DE SISTEMA ANTERIOR",
              "RESOLUCIÓN GERENCIAL"
            ]
          },
          {
            "clave": "nDelDocumento",
            "label": "Nº del documento",
            "t": "text"
          },
          {
            "clave": "motivoDelAlta",
            "label": "Motivo del alta",
            "t": "area",
            "ancho": true
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
        "label": "Total del alta",
        "fuerte": true
      }
    ],
    "acciones": [
      "Validar",
      "Dar de alta"
    ]
  },
  "baja_deuda": {
    "id": "baja_deuda",
    "mod": "Rentas · Registro",
    "title": "Baja de deuda",
    "endpoint": "POST /api/v1/rentas/deuda/bajas",
    "desc": "Extingue deuda de la cuenta corriente por prescripción, resolución que la deja sin efecto, error material o compensación. Requiere resolución y queda en la bitácora de auditoría.",
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
      }
    ],
    "secciones": [
      {
        "label": "Sustento de la baja",
        "campos": [
          {
            "clave": "causal",
            "label": "Causal",
            "t": "sel",
            "opts": [
              "PRESCRIPCIÓN DECLARADA",
              "RESOLUCIÓN QUE DEJA SIN EFECTO",
              "ERROR MATERIAL",
              "COMPENSACIÓN",
              "DEUDA DE COBRANZA DUDOSA",
              "CONDONACIÓN POR ORDENANZA"
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
            "clave": "autorizadoPor",
            "label": "Autorizado por",
            "t": "ro"
          },
          {
            "clave": "montoTotalAExtinguirS",
            "label": "Monto total a extinguir (S/)",
            "t": "ro"
          },
          {
            "clave": "motivo",
            "label": "Motivo",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Deuda seleccionable para baja",
      "cols": [
        "",
        "Año",
        "Unidad",
        "Cuota",
        "Tributo",
        "Insoluto S/",
        "Interés S/",
        "Total S/"
      ],
      "claves": [
        "campo",
        "ano",
        "unidad",
        "cuota",
        "tributo",
        "insolutoS",
        "interesS",
        "totalS"
      ],
      "num": [
        5,
        6,
        7
      ]
    },
    "acciones": [
      "Previsualizar",
      "Dar de baja"
    ]
  }
};
