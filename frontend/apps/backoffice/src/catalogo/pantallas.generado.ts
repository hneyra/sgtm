/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 134 pantallas: que pestanas, que secciones, que campos,
 * que columnas. Lo que la interfaz sabe sin preguntarle a nadie.
 *
 * Los VALORES no estan aqui: los sirve la API (packages/api-mock hoy, el
 * backend manana). Ver scripts/portar-catalogo.mjs.
 */

import type { EstructuraDePantalla } from './tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
  "inicio": {
    "id": "inicio",
    "mod": "Inicio",
    "title": "Panel de recaudación",
    "endpoint": "GET /api/v1/indicadores/recaudacion?ejercicio=2026",
    "kind": "dash",
    "desc": "Avance de la recaudación del ejercicio 2026 al 13 de agosto, con la cartera pendiente por tributo y las tareas abiertas de cada unidad."
  },
  "portal": {
    "id": "portal",
    "mod": "Portal ciudadano",
    "title": "Consulta y pago en línea",
    "endpoint": "GET /api/v1/portal/deuda?doc=44218937",
    "kind": "portal",
    "desc": "Flujo público de autoconsulta: el contribuyente identifica su deuda, elige qué pagar y descarga su constancia sin acudir a la municipalidad.",
    "steps": [
      "Identificarte",
      "Revisar tu deuda",
      "Elegir qué pagar",
      "Pagar",
      "Descargar constancia"
    ],
    "secciones": [
      {
        "label": "Pago en línea",
        "campos": [
          {
            "clave": "medioDePago",
            "label": "Medio de pago",
            "t": "sel",
            "opts": [
              "Tarjeta de débito o crédito",
              "Yape / Plin",
              "Banca por internet",
              "Agente autorizado"
            ]
          },
          {
            "clave": "correoParaElComprobante",
            "label": "Correo para el comprobante",
            "t": "text"
          },
          {
            "clave": "celular",
            "label": "Celular",
            "t": "text"
          },
          {
            "clave": "aceptoLosTerminosDelPagoElectronico",
            "label": "Acepto los términos del pago electrónico",
            "t": "chk",
            "ph": "Requerido para continuar"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Tu deuda al 13 de agosto de 2026",
      "cols": [
        "",
        "Concepto",
        "Periodo",
        "Vencimiento",
        "Insoluto S/",
        "Interés S/",
        "Total S/"
      ],
      "num": [
        4,
        5,
        6
      ],
      "note": "Las deudas en cobranza coactiva deben regularizarse en la Ejecutoría Coactiva y no pueden pagarse por este canal."
    },
    "totales": [
      {
        "label": "Seleccionado",
        "fuerte": false
      },
      {
        "label": "Descuento pronto pago",
        "fuerte": false
      },
      {
        "label": "Total a pagar",
        "fuerte": true
      }
    ],
    "acciones": [
      "Descargar estado de cuenta",
      "Pagar S/ 640.06"
    ]
  },
  "ficha_urbana": {
    "id": "ficha_urbana",
    "mod": "Catastro",
    "title": "Ficha catastral urbana individual",
    "endpoint": "GET /api/v1/catastro/fichas/urbana/{codRefCatastral}",
    "desc": "Ficha del predio urbano. El código de referencia catastral se compone de sector, manzana, lote, edificación, entrada, piso y unidad; su cambio obliga a recalcular el autovalúo.",
    "filtros": [
      {
        "clave": "codigoDeRefCatastral",
        "label": "Código de Ref. Catastral",
        "t": "text"
      },
      {
        "clave": "codContribuyenteRentas",
        "label": "Cod. Contribuyente Rentas",
        "t": "text"
      },
      {
        "clave": "nroFicha",
        "label": "Nro. Ficha",
        "t": "text"
      },
      {
        "clave": "uso",
        "label": "Uso",
        "t": "sel",
        "opts": [
          "Todos",
          "Casa habitación",
          "Comercio",
          "Industria",
          "Terreno sin construir",
          "Servicios",
          "Educación",
          "Salud"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Datos Generales",
        "secciones": [
          {
            "label": "Ficha catastral urbana individual",
            "campos": [
              {
                "clave": "codigoDeRefCatastral2",
                "label": "Código de Ref. Catastral",
                "t": "ro"
              },
              {
                "clave": "uso2",
                "label": "Uso",
                "t": "sel",
                "opts": [
                  "Casa habitación",
                  "Comercio",
                  "Industria",
                  "Terreno sin construir",
                  "Servicios"
                ]
              },
              {
                "clave": "cuc",
                "label": "CUC",
                "t": "text"
              },
              {
                "clave": "codigoHojaCatastral",
                "label": "Código Hoja Catastral",
                "t": "text"
              },
              {
                "clave": "codCatastralAnterior",
                "label": "Cod. Catastral Anterior",
                "t": "text"
              },
              {
                "clave": "codRefCatastralUrb",
                "label": "Cod. Ref Catastral / Urb.",
                "t": "ro",
                "ancho": true
              },
              {
                "clave": "codContribuyenteRentas2",
                "label": "Cod. Contribuyente Rentas",
                "t": "text"
              },
              {
                "clave": "nombreDelContribuyente",
                "label": "Nombre del contribuyente",
                "t": "ro"
              },
              {
                "clave": "codigoPredialDeRentas",
                "label": "Código Predial de Rentas",
                "t": "text"
              },
              {
                "clave": "codigoAnterior",
                "label": "Código Anterior",
                "t": "ro"
              },
              {
                "clave": "nroFicha2",
                "label": "Nro. Ficha",
                "t": "text"
              },
              {
                "clave": "unidAcumACodPredialDeRentas",
                "label": "Unid. Acum. a Cod. Predial de Rentas",
                "t": "text"
              },
              {
                "clave": "arancel",
                "label": "Arancel",
                "t": "ro"
              },
              {
                "clave": "numeroDeFichaPorLote",
                "label": "Número de Ficha por lote",
                "t": "text"
              }
            ]
          },
          {
            "label": "Ubicación del predio catastral",
            "campos": [
              {
                "clave": "tipoDeVia",
                "label": "Tipo de Vía",
                "t": "sel",
                "opts": [
                  "99 — NO ESPECIFICADO",
                  "01 — AVENIDA",
                  "02 — CALLE",
                  "03 — JIRÓN",
                  "04 — PASAJE",
                  "05 — CARRETERA"
                ]
              },
              {
                "clave": "calle",
                "label": "Calle",
                "t": "text"
              },
              {
                "clave": "tipoDePuerta",
                "label": "Tipo de Puerta",
                "t": "sel",
                "opts": [
                  "P — PRINCIPAL",
                  "S — SECUNDARIA",
                  "C — COCHERA"
                ]
              },
              {
                "clave": "antNumMunicipal",
                "label": "Ant. Num. Municipal",
                "t": "text"
              },
              {
                "clave": "condNumeracion",
                "label": "Cond. Numeración",
                "t": "sel",
                "opts": [
                  "99 — NO ESPECIFICADO",
                  "01 — CON CERTIFICADO",
                  "02 — SIN CERTIFICADO"
                ]
              },
              {
                "clave": "numDeCertDeNumeracion",
                "label": "Num. de Cert. de Numeración",
                "t": "text"
              },
              {
                "clave": "nuevoNMunicipal",
                "label": "Nuevo N. Municipal",
                "t": "text"
              },
              {
                "clave": "numeroAdicional",
                "label": "Número Adicional",
                "t": "text"
              }
            ]
          }
        ]
      },
      {
        "label": "Ubicación",
        "secciones": [
          {
            "label": "Localización",
            "campos": [
              {
                "clave": "departamento",
                "label": "Departamento",
                "t": "sel",
                "opts": [
                  "PIURA",
                  "LIMA",
                  "TUMBES",
                  "LAMBAYEQUE"
                ]
              },
              {
                "clave": "provincia",
                "label": "Provincia",
                "t": "sel",
                "opts": [
                  "SULLANA",
                  "PIURA",
                  "TALARA",
                  "PAITA"
                ]
              },
              {
                "clave": "distrito",
                "label": "Distrito",
                "t": "sel",
                "opts": [
                  "SULLANA",
                  "BELLAVISTA",
                  "MARCAVELICA",
                  "QUERECOTILLO",
                  "SALITRAL",
                  "IGNACIO ESCUDERO",
                  "LANCONES",
                  "MIGUEL CHECA"
                ]
              },
              {
                "clave": "sector",
                "label": "Sector",
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
              },
              {
                "clave": "edificacion",
                "label": "Edificación",
                "t": "text"
              },
              {
                "clave": "entrada",
                "label": "Entrada",
                "t": "text"
              },
              {
                "clave": "piso",
                "label": "Piso",
                "t": "text"
              },
              {
                "clave": "unidad",
                "label": "Unidad",
                "t": "text"
              },
              {
                "clave": "habilitacionUrbana",
                "label": "Habilitación urbana",
                "t": "text"
              },
              {
                "clave": "zonaSectorCatastral",
                "label": "Zona / sector catastral",
                "t": "sel",
                "opts": [
                  "Zona 1",
                  "Zona 2",
                  "Zona 3",
                  "Zona 4"
                ]
              },
              {
                "clave": "referencia",
                "label": "Referencia",
                "t": "text",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Carac. Titularidad",
        "secciones": [
          {
            "label": "Características de la titularidad",
            "campos": [
              {
                "clave": "condicionDelTitular",
                "label": "Condición del titular",
                "t": "sel",
                "opts": [
                  "PROPIETARIO ÚNICO",
                  "COPROPIETARIO",
                  "POSEEDOR",
                  "SUCESIÓN INDIVISA",
                  "ARRENDATARIO",
                  "OCUPANTE"
                ]
              },
              {
                "clave": "formaDeAdquisicion",
                "label": "Forma de adquisición",
                "t": "sel",
                "opts": [
                  "COMPRA-VENTA",
                  "DONACIÓN",
                  "HERENCIA",
                  "ADJUDICACIÓN",
                  "PERMUTA",
                  "PRESCRIPCIÓN ADQUISITIVA"
                ]
              },
              {
                "clave": "fechaDeAdquisicion",
                "label": "Fecha de adquisición",
                "t": "date"
              },
              {
                "clave": "documentoQueAcredita",
                "label": "Documento que acredita",
                "t": "sel",
                "opts": [
                  "ESCRITURA PÚBLICA",
                  "MINUTA",
                  "CONTRATO PRIVADO",
                  "FICHA REGISTRAL",
                  "TÍTULO DE PROPIEDAD",
                  "CONSTANCIA DE POSESIÓN"
                ]
              },
              {
                "clave": "nDePartidaRegistral",
                "label": "Nº de partida registral",
                "t": "text"
              },
              {
                "clave": "oficinaRegistral",
                "label": "Oficina registral",
                "t": "sel",
                "opts": [
                  "SUNARP — SULLANA",
                  "SUNARP — PIURA"
                ]
              },
              {
                "clave": "deParticipacion",
                "label": "% de participación",
                "t": "text"
              },
              {
                "clave": "predioEnLitigio",
                "label": "Predio en litigio",
                "t": "chk",
                "ph": "Existe proceso judicial en curso"
              }
            ]
          }
        ]
      },
      {
        "label": "Propietarios",
        "secciones": [
          {
            "label": "Titulares registrados",
            "campos": [
              {
                "clave": "codContribuyente",
                "label": "Cod. Contribuyente",
                "t": "text"
              },
              {
                "clave": "nombreRazonSocial",
                "label": "Nombre / razón social",
                "t": "ro"
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
                "clave": "dePropiedad",
                "label": "% de propiedad",
                "t": "text"
              },
              {
                "clave": "condicion",
                "label": "Condición",
                "t": "sel",
                "opts": [
                  "TITULAR",
                  "CÓNYUGE",
                  "COPROPIETARIO",
                  "REPRESENTANTE"
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
                "clave": "fechaDesde",
                "label": "Fecha desde",
                "t": "date"
              }
            ]
          }
        ]
      },
      {
        "label": "Construcción",
        "secciones": [
          {
            "label": "Características de construcción — piso 01",
            "campos": [
              {
                "clave": "nPiso",
                "label": "Nº Piso",
                "t": "text"
              },
              {
                "clave": "mes",
                "label": "Mes",
                "t": "text"
              },
              {
                "clave": "ano",
                "label": "Año",
                "t": "text"
              },
              {
                "clave": "mep",
                "label": "MEP",
                "t": "sel",
                "opts": [
                  "01 — CONCRETO",
                  "02 — LADRILLO",
                  "03 — ADOBE",
                  "04 — QUINCHA",
                  "05 — MADERA",
                  "06 — ESTERA"
                ]
              },
              {
                "clave": "ecs",
                "label": "ECS",
                "t": "sel",
                "opts": [
                  "01 — MUY BUENO",
                  "02 — BUENO",
                  "03 — REGULAR",
                  "04 — MALO",
                  "05 — MUY MALO"
                ]
              },
              {
                "clave": "ecc",
                "label": "ECC",
                "t": "sel",
                "opts": [
                  "01 — EN CONSTRUCCIÓN",
                  "02 — INCONCLUSO",
                  "03 — TERMINADO",
                  "04 — EN RUINAS"
                ]
              },
              {
                "clave": "muros",
                "label": "Muros",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "techos",
                "label": "Techos",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "pisos",
                "label": "Pisos",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "puertas",
                "label": "Puertas",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "revest",
                "label": "Revest.",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "banos",
                "label": "Baños",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "instalacionesElectricas",
                "label": "Instalaciones Eléctricas",
                "t": "sel",
                "opts": [
                  "A",
                  "B",
                  "C",
                  "D",
                  "E",
                  "F",
                  "G"
                ]
              },
              {
                "clave": "areaConstruidaDeclarada",
                "label": "Área Construida Declarada",
                "t": "text"
              },
              {
                "clave": "areaConstruidaVerificada",
                "label": "Área Construida Verificada",
                "t": "text"
              },
              {
                "clave": "uca",
                "label": "UCA",
                "t": "sel",
                "opts": [
                  "99 — NO ESPECIFICADO",
                  "01 — VIVIENDA",
                  "02 — COMERCIO",
                  "03 — DEPÓSITO"
                ]
              }
            ]
          },
          {
            "label": "Áreas legal y física",
            "campos": [
              {
                "clave": "terrenoLegal",
                "label": "Terreno — LEGAL",
                "t": "text"
              },
              {
                "clave": "terrenoFisico",
                "label": "Terreno — FÍSICO",
                "t": "text"
              },
              {
                "clave": "construcLegal",
                "label": "Construc. — LEGAL",
                "t": "text"
              },
              {
                "clave": "construcFisico",
                "label": "Construc. — FÍSICO",
                "t": "text"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Otras Instalaciones",
        "secciones": [
          {
            "label": "Obras complementarias",
            "campos": [
              {
                "clave": "tipoDeObra",
                "label": "Tipo de obra",
                "t": "sel",
                "opts": [
                  "CERCO PERIMÉTRICO",
                  "LOSA DEPORTIVA",
                  "PISCINA",
                  "TANQUE ELEVADO",
                  "POZO",
                  "PAVIMENTO",
                  "PORTÓN"
                ]
              },
              {
                "clave": "unidadDeMedida",
                "label": "Unidad de medida",
                "t": "sel",
                "opts": [
                  "m²",
                  "ml",
                  "m³",
                  "Unidad"
                ]
              },
              {
                "clave": "metrado",
                "label": "Metrado",
                "t": "text"
              },
              {
                "clave": "ano2",
                "label": "Año",
                "t": "text"
              },
              {
                "clave": "mes2",
                "label": "Mes",
                "t": "text"
              },
              {
                "clave": "estadoDeConservacion",
                "label": "Estado de conservación",
                "t": "sel",
                "opts": [
                  "MUY BUENO",
                  "BUENO",
                  "REGULAR",
                  "MALO"
                ]
              },
              {
                "clave": "valorUnitarioS",
                "label": "Valor unitario (S/)",
                "t": "text"
              },
              {
                "clave": "valorDeLaObraS",
                "label": "Valor de la obra (S/)",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Inquilinos",
        "secciones": [
          {
            "label": "Ocupantes no propietarios",
            "campos": [
              {
                "clave": "documento",
                "label": "Documento",
                "t": "text"
              },
              {
                "clave": "nombreDelInquilino",
                "label": "Nombre del inquilino",
                "t": "text"
              },
              {
                "clave": "areaOcupadaM",
                "label": "Área ocupada (m²)",
                "t": "text"
              },
              {
                "clave": "usoQueDaAlPredio",
                "label": "Uso que da al predio",
                "t": "sel",
                "opts": [
                  "VIVIENDA",
                  "COMERCIO",
                  "DEPÓSITO",
                  "SERVICIOS"
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
                "clave": "mercedConductivaS",
                "label": "Merced conductiva (S/)",
                "t": "text"
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Arbitrios",
        "secciones": [
          {
            "label": "Datos para el cálculo de arbitrios",
            "campos": [
              {
                "clave": "codUsoRecRecoleccion",
                "label": "Cod. Uso REC (recolección)",
                "t": "sel",
                "opts": [
                  "01 — CASA HABITACIÓN",
                  "02 — COMERCIO",
                  "03 — INDUSTRIA",
                  "04 — SERVICIOS",
                  "05 — TERRENO SIN CONSTRUIR"
                ]
              },
              {
                "clave": "codUsoBarBarrido",
                "label": "Cod. Uso BAR (barrido)",
                "t": "sel",
                "opts": [
                  "01 — CASA HABITACIÓN",
                  "02 — COMERCIO",
                  "03 — INDUSTRIA",
                  "04 — SERVICIOS"
                ]
              },
              {
                "clave": "frecuenciaDeRecoleccion",
                "label": "Frecuencia de recolección",
                "t": "sel",
                "opts": [
                  "DIARIA",
                  "INTERDIARIA",
                  "DOS VECES POR SEMANA",
                  "SEMANAL"
                ]
              },
              {
                "clave": "frecuenciaDeBarrido",
                "label": "Frecuencia de barrido",
                "t": "sel",
                "opts": [
                  "DIARIA",
                  "INTERDIARIA",
                  "SEMANAL"
                ]
              },
              {
                "clave": "frontisMl",
                "label": "Frontis (ml)",
                "t": "text"
              },
              {
                "clave": "posicionDelPredio",
                "label": "Posición del predio",
                "t": "sel",
                "opts": [
                  "INTERIOR",
                  "ESQUINA",
                  "FRENTE A PARQUE",
                  "FRENTE A VÍA PRINCIPAL"
                ]
              },
              {
                "clave": "peligrosidadDeLaZona",
                "label": "Peligrosidad de la zona",
                "t": "sel",
                "opts": [
                  "BAJA",
                  "MEDIA",
                  "ALTA"
                ]
              },
              {
                "clave": "factorDeDistribucionDeCosto",
                "label": "Factor de distribución de costo",
                "t": "ro"
              },
              {
                "clave": "inafectoAArbitrios",
                "label": "Inafecto a arbitrios",
                "t": "chk",
                "ph": "Predio inafecto por norma"
              }
            ]
          }
        ]
      },
      {
        "label": "Observaciones",
        "secciones": [
          {
            "label": "Notas de la ficha",
            "campos": [
              {
                "clave": "observaciones",
                "label": "Observaciones",
                "t": "area",
                "ancho": true
              },
              {
                "clave": "fichaVerificadaEnCampo",
                "label": "Ficha verificada en campo",
                "t": "chk",
                "ph": "Inspección realizada"
              },
              {
                "clave": "fechaDeVerificacion",
                "label": "Fecha de verificación",
                "t": "date"
              }
            ]
          }
        ]
      },
      {
        "label": "Inf. Complementaria",
        "secciones": [
          {
            "label": "Información complementaria",
            "campos": [
              {
                "clave": "nDeSuministroDeLuz",
                "label": "Nº de suministro de luz",
                "t": "text"
              },
              {
                "clave": "nDeSuministroDeAgua",
                "label": "Nº de suministro de agua",
                "t": "text"
              },
              {
                "clave": "telefonoDelPredio",
                "label": "Teléfono del predio",
                "t": "text"
              },
              {
                "clave": "nDeLicenciaDeFuncionamiento",
                "label": "Nº de licencia de funcionamiento",
                "t": "text"
              },
              {
                "clave": "predioDeclaradoPatrimonio",
                "label": "Predio declarado patrimonio",
                "t": "chk",
                "ph": "Inmueble con valor monumental"
              },
              {
                "clave": "fuenteDeLaInformacion",
                "label": "Fuente de la información",
                "t": "sel",
                "opts": [
                  "DECLARACIÓN DEL TITULAR",
                  "INSPECCIÓN DE CAMPO",
                  "CONVENIO INTERINSTITUCIONAL",
                  "BARRIDO CATASTRAL"
                ]
              }
            ],
            "hint": "Opcional"
          }
        ]
      },
      {
        "label": "Servicios",
        "secciones": [
          {
            "label": "Servicios básicos del predio",
            "campos": [
              {
                "clave": "aguaPotable",
                "label": "Agua potable",
                "t": "chk",
                "ph": "Cuenta con conexión"
              },
              {
                "clave": "desague",
                "label": "Desagüe",
                "t": "chk",
                "ph": "Cuenta con conexión"
              },
              {
                "clave": "energiaElectrica",
                "label": "Energía eléctrica",
                "t": "chk",
                "ph": "Cuenta con conexión"
              },
              {
                "clave": "telefono",
                "label": "Teléfono",
                "t": "chk",
                "ph": "Cuenta con línea fija"
              },
              {
                "clave": "gasNatural",
                "label": "Gas natural",
                "t": "chk",
                "ph": "Cuenta con conexión"
              },
              {
                "clave": "tipoDeViaFrenteAlPredio",
                "label": "Tipo de vía frente al predio",
                "t": "sel",
                "opts": [
                  "ASFALTADA",
                  "AFIRMADA",
                  "TROCHA",
                  "ADOQUINADA"
                ]
              },
              {
                "clave": "alumbradoPublico",
                "label": "Alumbrado público",
                "t": "chk",
                "ph": "La vía cuenta con alumbrado"
              }
            ],
            "hint": "Opcional"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Ubicación del predio catastral",
      "cols": [
        "Nombre Calle",
        "Tipo Vía",
        "Tip. Puerta",
        "Número",
        "Num. Adicional",
        "Nom. Tipo Num."
      ]
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Deshacer",
      "Imprimir",
      "Guardar"
    ]
  },
  "ficha_economica": {
    "id": "ficha_economica",
    "mod": "Catastro",
    "title": "Ficha catastral económica",
    "endpoint": "GET /api/v1/catastro/fichas/economica/{codRefCatastral}",
    "desc": "Actividad económica que se desarrolla en la unidad catastral, usada para verificar licencias y determinar el uso real del predio.",
    "filtros": [
      {
        "clave": "codigoDeRefCatastral",
        "label": "Código de Ref. Catastral",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "ciiu",
        "label": "CIIU",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Actividad económica",
        "campos": [
          {
            "clave": "codigoDeRefCatastral2",
            "label": "Código de Ref. Catastral",
            "t": "ro"
          },
          {
            "clave": "nombreComercial",
            "label": "Nombre comercial",
            "t": "text"
          },
          {
            "clave": "ciiu2",
            "label": "CIIU",
            "t": "sel",
            "opts": [
              "G-5211-01 — VENTA AL POR MENOR EN ALMACENES",
              "D-1549-19 — RESTAURANTE-POLLERÍA",
              "H-5520-02 — RESTAURANTES A DOMICILIO"
            ]
          },
          {
            "clave": "nDeLicenciaDeFuncionamiento",
            "label": "Nº de licencia de funcionamiento",
            "t": "text"
          },
          {
            "clave": "estadoDeLaLicencia",
            "label": "Estado de la licencia",
            "t": "sel",
            "opts": [
              "A — Activa",
              "I — Inactiva",
              "P — Pendiente",
              "X — Anulada"
            ]
          },
          {
            "clave": "areaDestinadaAlNegocioM",
            "label": "Área destinada al negocio (m²)",
            "t": "text"
          },
          {
            "clave": "nDeTrabajadores",
            "label": "Nº de trabajadores",
            "t": "text"
          },
          {
            "clave": "horarioDeAtencion",
            "label": "Horario de atención",
            "t": "text"
          },
          {
            "clave": "fechaDeInicioDeActividades",
            "label": "Fecha de inicio de actividades",
            "t": "date"
          },
          {
            "clave": "cuentaConAnuncioPublicitario",
            "label": "Cuenta con anuncio publicitario",
            "t": "chk",
            "ph": "Verificar autorización de anuncio"
          }
        ]
      }
    ],
    "acciones": [
      "Nuevo",
      "Guardar",
      "Imprimir"
    ]
  },
  "ficha_bienes": {
    "id": "ficha_bienes",
    "mod": "Catastro",
    "title": "Ficha de bienes comunes",
    "endpoint": "GET /api/v1/catastro/fichas/bienes-comunes/{codEdificacion}",
    "desc": "Áreas comunes de una edificación en régimen de propiedad exclusiva y común, cuyo valor se distribuye entre las unidades según su porcentaje de participación.",
    "filtros": [
      {
        "clave": "codEdificacion",
        "label": "Cod. Edificación",
        "t": "text"
      },
      {
        "clave": "denominacion",
        "label": "Denominación",
        "t": "text"
      }
    ],
    "secciones": [
      {
        "label": "Bienes comunes de la edificación",
        "campos": [
          {
            "clave": "codEdificacion2",
            "label": "Cod. Edificación",
            "t": "ro"
          },
          {
            "clave": "denominacion2",
            "label": "Denominación",
            "t": "text"
          },
          {
            "clave": "nDePisos",
            "label": "Nº de pisos",
            "t": "text"
          },
          {
            "clave": "nDeUnidades",
            "label": "Nº de unidades",
            "t": "text"
          },
          {
            "clave": "areaComunDeTerrenoM",
            "label": "Área común de terreno (m²)",
            "t": "text"
          },
          {
            "clave": "areaComunConstruidaM",
            "label": "Área común construida (m²)",
            "t": "text"
          },
          {
            "clave": "valorDeBienesComunesS",
            "label": "Valor de bienes comunes (S/)",
            "t": "ro"
          },
          {
            "clave": "reglamentoInternoInscrito",
            "label": "Reglamento interno inscrito",
            "t": "chk",
            "ph": "Partida registral del régimen"
          },
          {
            "clave": "partidaDelRegimen",
            "label": "Partida del régimen",
            "t": "text"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Unidades que participan",
      "cols": [
        "Unidad",
        "Contribuyente",
        "Área exclusiva m²",
        "% participación",
        "Valor asignado S/"
      ],
      "num": [
        2,
        3,
        4
      ],
      "note": "La suma de porcentajes de participación debe ser exactamente 100.00 para que el sistema permita grabar la ficha."
    },
    "totales": [
      {
        "label": "Área común total",
        "fuerte": false
      },
      {
        "label": "Valor bienes comunes",
        "fuerte": false
      },
      {
        "label": "Participación asignada",
        "fuerte": false
      },
      {
        "label": "Unidades",
        "fuerte": true
      }
    ],
    "acciones": [
      "Distribuir valor",
      "Guardar"
    ]
  },
  "ficha_rural": {
    "id": "ficha_rural",
    "mod": "Catastro",
    "title": "Ficha catastral rural",
    "endpoint": "GET /api/v1/catastro/fichas/rural/{codUnidad}",
    "desc": "Predio rústico valorizado por hectárea según el arancel rural, el tipo de tierra y la disponibilidad de riego.",
    "filtros": [
      {
        "clave": "codUnidadCatastralUc",
        "label": "Cod. Unidad Catastral (UC)",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
        "t": "text"
      },
      {
        "clave": "valleSector",
        "label": "Valle / sector",
        "t": "sel",
        "opts": [
          "Todos",
          "Valle del Chira",
          "Cieneguillo",
          "Miguel Checa",
          "Lancones"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Identificación del predio rústico",
        "campos": [
          {
            "clave": "codUnidadCatastralUc2",
            "label": "Cod. Unidad Catastral (UC)",
            "t": "ro"
          },
          {
            "clave": "nombreDelPredio",
            "label": "Nombre del predio",
            "t": "text"
          },
          {
            "clave": "valleSector2",
            "label": "Valle / sector",
            "t": "sel",
            "opts": [
              "Valle del Chira",
              "Cieneguillo",
              "Miguel Checa",
              "Lancones"
            ]
          },
          {
            "clave": "comisionDeRegantes",
            "label": "Comisión de regantes",
            "t": "text"
          },
          {
            "clave": "codContribuyenteRentas",
            "label": "Cod. Contribuyente Rentas",
            "t": "text"
          },
          {
            "clave": "partidaRegistral",
            "label": "Partida registral",
            "t": "text"
          }
        ]
      },
      {
        "label": "Tierras y valuación",
        "campos": [
          {
            "clave": "areaTotalHa",
            "label": "Área total (ha)",
            "t": "text"
          },
          {
            "clave": "tipoDeTierra",
            "label": "Tipo de tierra",
            "t": "sel",
            "opts": [
              "A1 — CULTIVO EN LIMPIO",
              "A2 — CULTIVO EN LIMPIO",
              "C — CULTIVO PERMANENTE",
              "P — PASTOS",
              "F — FORESTAL",
              "X — PROTECCIÓN"
            ]
          },
          {
            "clave": "condicionDeRiego",
            "label": "Condición de riego",
            "t": "sel",
            "opts": [
              "BAJO RIEGO",
              "SECANO"
            ]
          },
          {
            "clave": "cultivoPredominante",
            "label": "Cultivo predominante",
            "t": "sel",
            "opts": [
              "ARROZ",
              "BANANO",
              "MANGO",
              "LIMÓN",
              "MAÍZ AMARILLO",
              "ALGODÓN"
            ]
          },
          {
            "clave": "arancelRuralSPorHa",
            "label": "Arancel rural (S/ por ha)",
            "t": "ro"
          },
          {
            "clave": "valorDelTerrenoRusticoS",
            "label": "Valor del terreno rústico (S/)",
            "t": "ro"
          },
          {
            "clave": "valorDeInstalacionesFijasS",
            "label": "Valor de instalaciones fijas (S/)",
            "t": "text"
          },
          {
            "clave": "autovaluoRuralS",
            "label": "Autovalúo rural (S/)",
            "t": "ro"
          }
        ]
      }
    ],
    "acciones": [
      "Calcular",
      "Guardar",
      "Imprimir ficha rural"
    ]
  },
  "consulta_fichas": {
    "id": "consulta_fichas",
    "mod": "Catastro",
    "title": "Consulta de fichas catastrales",
    "endpoint": "GET /api/v1/catastro/fichas",
    "desc": "Búsqueda transversal de fichas por código, titular o ubicación, con el estado de conciliación entre catastro y el padrón de rentas.",
    "filtros": [
      {
        "clave": "codRefCatastral",
        "label": "Cod. Ref. Catastral",
        "t": "text"
      },
      {
        "clave": "contribuyente",
        "label": "Contribuyente",
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
      },
      {
        "clave": "conciliadaConRentas",
        "label": "Conciliada con rentas",
        "t": "sel",
        "opts": [
          "Todas",
          "Sí",
          "No"
        ]
      }
    ],
    "tabla": {
      "title": "Fichas encontradas",
      "cols": [
        "Cod. Ref. Catastral",
        "Cod. Predial Rentas",
        "Titular",
        "Uso",
        "Área terreno m²",
        "Área const. m²",
        "Conciliada"
      ],
      "num": [
        4,
        5
      ],
      "note": "Las fichas no conciliadas no generan deuda predial hasta que se les asigne código predial de rentas."
    },
    "acciones": [
      "Exportar Excel",
      "Conciliar seleccionadas"
    ]
  },
  "actualizacion_catastro": {
    "id": "actualizacion_catastro",
    "mod": "Catastro",
    "title": "Actualización del catastro",
    "endpoint": "PUT /api/v1/catastro/fichas/{codigo}/actualizacion",
    "desc": "Actualiza construcciones y otras instalaciones de una ficha ya registrada. El sistema conserva cada versión declarada y verificada por piso, con su MEP, ECS, ECC y estado de conservación.",
    "filtros": [
      {
        "clave": "codRefCatastral",
        "label": "Cod. Ref. Catastral",
        "t": "text"
      },
      {
        "clave": "nDeFicha",
        "label": "Nº de ficha",
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
        "clave": "tipoDeActualizacion",
        "label": "Tipo de actualización",
        "t": "sel",
        "opts": [
          "INDIVIDUAL",
          "MASIVA POR SECTOR",
          "POR NOTIFICACIÓN",
          "POR FISCALIZACIÓN"
        ]
      }
    ],
    "tabs": [
      {
        "label": "Construcción",
        "secciones": [
          {
            "label": "Características de construcción",
            "campos": [
              {
                "clave": "nPiso",
                "label": "Nº Piso",
                "t": "text"
              },
              {
                "clave": "mes",
                "label": "Mes",
                "t": "text"
              },
              {
                "clave": "ano",
                "label": "Año",
                "t": "text"
              },
              {
                "clave": "mep",
                "label": "MEP",
                "t": "sel",
                "opts": [
                  "01 — CONCRETO",
                  "02 — LADRILLO",
                  "03 — ADOBE / TAPIA",
                  "04 — QUINCHA",
                  "05 — MADERA",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "ecs",
                "label": "ECS",
                "t": "sel",
                "opts": [
                  "01 — MUY BUENO",
                  "02 — BUENO",
                  "03 — REGULAR",
                  "04 — MALO",
                  "05 — MUY MALO"
                ]
              },
              {
                "clave": "ecc",
                "label": "ECC",
                "t": "sel",
                "opts": [
                  "01 — EN CONSTRUCCIÓN",
                  "02 — INCONCLUSO",
                  "03 — TERMINADO",
                  "04 — EN RUINAS"
                ]
              },
              {
                "clave": "uca",
                "label": "UCA",
                "t": "sel",
                "opts": [
                  "01 — CASA HABITACIÓN",
                  "02 — TIENDA / DEPÓSITO",
                  "03 — EDIFICIO",
                  "99 — NO ESPECIFICADO"
                ]
              }
            ]
          },
          {
            "label": "Acabados (categorías)",
            "campos": [
              {
                "clave": "muros",
                "label": "Muros",
                "t": "text"
              },
              {
                "clave": "techos",
                "label": "Techos",
                "t": "text"
              },
              {
                "clave": "pisos",
                "label": "Pisos",
                "t": "text"
              },
              {
                "clave": "puertas",
                "label": "Puertas",
                "t": "text"
              },
              {
                "clave": "revest",
                "label": "Revest.",
                "t": "text"
              },
              {
                "clave": "banos",
                "label": "Baños",
                "t": "text"
              },
              {
                "clave": "instalacionesElectricas",
                "label": "Instalaciones eléctricas",
                "t": "text"
              }
            ]
          },
          {
            "label": "Área construida",
            "campos": [
              {
                "clave": "declaradaM",
                "label": "Declarada (m²)",
                "t": "text"
              },
              {
                "clave": "verificadaM",
                "label": "Verificada (m²)",
                "t": "text"
              },
              {
                "clave": "legalTerrenoM",
                "label": "Legal — terreno (m²)",
                "t": "ro"
              },
              {
                "clave": "legalConstruccionM",
                "label": "Legal — construcción (m²)",
                "t": "ro"
              },
              {
                "clave": "fisicoTerrenoM",
                "label": "Físico — terreno (m²)",
                "t": "ro"
              },
              {
                "clave": "fisicoConstruccionM",
                "label": "Físico — construcción (m²)",
                "t": "ro"
              }
            ]
          }
        ]
      },
      {
        "label": "Otras instalaciones",
        "secciones": [
          {
            "label": "Instalación",
            "campos": [
              {
                "clave": "codigo",
                "label": "Código",
                "t": "ro"
              },
              {
                "clave": "mes2",
                "label": "Mes",
                "t": "text"
              },
              {
                "clave": "ano2",
                "label": "Año",
                "t": "text"
              },
              {
                "clave": "mep2",
                "label": "MEP",
                "t": "sel",
                "opts": [
                  "01 — CONCRETO",
                  "02 — LADRILLO",
                  "03 — FIERRO",
                  "04 — MADERA",
                  "99 — NO ESPECIFICADO"
                ]
              },
              {
                "clave": "ecs2",
                "label": "ECS",
                "t": "sel",
                "opts": [
                  "01 — MUY BUENO",
                  "02 — BUENO",
                  "03 — REGULAR",
                  "04 — MALO"
                ]
              },
              {
                "clave": "edc",
                "label": "EDC",
                "t": "sel",
                "opts": [
                  "01 — TERRENO SIN CONSTRUIR",
                  "02 — CONSTRUIDO",
                  "03 — EN CONSTRUCCIÓN"
                ]
              }
            ]
          },
          {
            "label": "Dimensiones verificadas",
            "campos": [
              {
                "clave": "largo",
                "label": "Largo",
                "t": "text"
              },
              {
                "clave": "ancho",
                "label": "Ancho",
                "t": "text"
              },
              {
                "clave": "alto",
                "label": "Alto",
                "t": "text"
              },
              {
                "clave": "metrado",
                "label": "Metrado",
                "t": "text"
              },
              {
                "clave": "unidadDeMedida",
                "label": "Unidad de medida",
                "t": "sel",
                "opts": [
                  "01 — METROS LINEALES",
                  "02 — METROS CUADRADOS",
                  "03 — UNIDAD",
                  "04 — GLOBAL"
                ]
              },
              {
                "clave": "uca2",
                "label": "UCA",
                "t": "sel",
                "opts": [
                  "01 — CERCO",
                  "02 — PORTÓN",
                  "03 — TANQUE",
                  "99 — NO ESPECIFICADO"
                ]
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Versiones registradas por piso",
      "cols": [
        "Num. Piso",
        "Mes",
        "Año",
        "MPE",
        "ECS",
        "ECC",
        "Muro",
        "Tech",
        "Piso",
        "Puer",
        "Rev",
        "Bañ",
        "InstEle",
        "Área declarada",
        "Área verificada",
        "UCA"
      ],
      "num": [
        13,
        14
      ]
    },
    "acciones": [
      "Nuevo",
      "Guardar",
      "Imprimir",
      "Quitar"
    ]
  },
  "ficha_contribuyente_reporte": {
    "id": "ficha_contribuyente_reporte",
    "mod": "Catastro",
    "title": "Reporte de ficha del contribuyente",
    "endpoint": "GET /api/v1/catastro/contribuyentes/{codigo}/ficha.pdf",
    "kind": "report",
    "desc": "Ficha impresa del contribuyente: identificación, domicilio fiscal, documentos, contactos y unidades afectas.",
    "reporte": {
      "title": "Ficha del contribuyente",
      "subtitle": "Registro único de contribuyentes — Gerencia de Rentas",
      "cols": [
        "Unidad",
        "Identificación",
        "Uso / clase",
        "Condición",
        "Deuda S/"
      ],
      "num": [
        4
      ]
    }
  },
  "calles": {
    "id": "calles",
    "mod": "Catastro",
    "title": "Mantenimiento de vías y calles",
    "endpoint": "GET /api/v1/catastro/vias",
    "desc": "Nomenclatura vial que alimenta el domicilio fiscal y la ubicación del predio. Cada vía guarda su tipo, sector y arancel unitario por tramo.",
    "filtros": [
      {
        "clave": "codigoDeVia",
        "label": "Código de vía",
        "t": "text"
      },
      {
        "clave": "nombreDeCalle",
        "label": "Nombre de calle",
        "t": "text"
      },
      {
        "clave": "tipoDeVia",
        "label": "Tipo de vía",
        "t": "sel",
        "opts": [
          "Todos",
          "AVENIDA",
          "CALLE",
          "JIRÓN",
          "PASAJE",
          "CARRETERA",
          "PROLONGACIÓN"
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
      }
    ],
    "secciones": [
      {
        "label": "Datos de la vía",
        "campos": [
          {
            "clave": "codigoDeVia2",
            "label": "Código de vía",
            "t": "ro"
          },
          {
            "clave": "tipoDeVia2",
            "label": "Tipo de vía",
            "t": "sel",
            "opts": [
              "AVENIDA",
              "CALLE",
              "JIRÓN",
              "PASAJE",
              "CARRETERA",
              "PROLONGACIÓN"
            ]
          },
          {
            "clave": "nombre",
            "label": "Nombre",
            "t": "text"
          },
          {
            "clave": "sector2",
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
            "clave": "zonaDeArancel",
            "label": "Zona de arancel",
            "t": "sel",
            "opts": [
              "Zona 1",
              "Zona 2",
              "Zona 3",
              "Zona 4"
            ]
          },
          {
            "clave": "cuadraDesde",
            "label": "Cuadra desde",
            "t": "text"
          },
          {
            "clave": "cuadraHasta",
            "label": "Cuadra hasta",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "INACTIVA"
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Vías registradas",
      "cols": [
        "Código",
        "Tipo Vía",
        "Nombre",
        "Sector",
        "Zona",
        "Arancel S/ m²",
        "Estado"
      ],
      "num": [
        5
      ]
    },
    "acciones": [
      "Nuevo",
      "Guardar",
      "Inactivar"
    ]
  },
  "sectores": {
    "id": "sectores",
    "mod": "Catastro",
    "title": "Sectores, manzanas y lotes",
    "endpoint": "GET /api/v1/catastro/sectores",
    "desc": "Estructura territorial sobre la que se arma el código de referencia catastral y se agrupan los padrones por zona.",
    "filtros": [
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
        "clave": "manzana",
        "label": "Manzana",
        "t": "text"
      }
    ],
    "tabla": {
      "title": "Estructura territorial",
      "cols": [
        "Sector",
        "Denominación",
        "Manzanas",
        "Lotes",
        "Predios inscritos",
        "Zona de arbitrios",
        "Estado"
      ],
      "num": [
        2,
        3,
        4
      ]
    },
    "acciones": [
      "Nuevo sector",
      "Guardar"
    ]
  },
  "aranceles": {
    "id": "aranceles",
    "mod": "Catastro",
    "title": "Aranceles de terreno",
    "endpoint": "GET /api/v1/catastro/tablas/aranceles?anio=2026",
    "desc": "Valor oficial del metro cuadrado de terreno por vía y tramo, publicado anualmente. Es el multiplicador del área de terreno en el autovalúo.",
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
        "clave": "via",
        "label": "Vía",
        "t": "text"
      },
      {
        "clave": "zona",
        "label": "Zona",
        "t": "sel",
        "opts": [
          "Todas",
          "Zona 1",
          "Zona 2",
          "Zona 3",
          "Zona 4"
        ]
      }
    ],
    "tabla": {
      "title": "Aranceles vigentes 2026",
      "cols": [
        "Vía",
        "Cuadra desde",
        "Cuadra hasta",
        "Zona",
        "Arancel S/ m²",
        "Variación vs. 2025"
      ],
      "num": [
        1,
        2,
        4,
        5
      ],
      "note": "Aranceles aprobados por el Ministerio de Vivienda, Construcción y Saneamiento para el ejercicio 2026."
    },
    "acciones": [
      "Importar tabla del año",
      "Guardar"
    ]
  },
  "valores_unitarios": {
    "id": "valores_unitarios",
    "mod": "Catastro",
    "title": "Valores unitarios de edificación",
    "endpoint": "GET /api/v1/catastro/tablas/valores-unitarios?anio=2026",
    "desc": "Tabla oficial por categoría constructiva. El sistema suma las siete partidas declaradas en la ficha y les aplica la depreciación correspondiente.",
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
        "clave": "region",
        "label": "Región",
        "t": "sel",
        "opts": [
          "COSTA",
          "SIERRA",
          "SELVA"
        ]
      }
    ],
    "tabla": {
      "title": "Valores unitarios oficiales de edificación — costa 2026 (S/ por m²)",
      "cols": [
        "Cat.",
        "Muros y columnas",
        "Techos",
        "Pisos",
        "Puertas y ventanas",
        "Revestimientos",
        "Baños",
        "Inst. eléct. y sanit."
      ],
      "num": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ]
    },
    "acciones": [
      "Importar tabla del año",
      "Guardar"
    ]
  },
  "depreciacion": {
    "id": "depreciacion",
    "mod": "Catastro",
    "title": "Tabla de depreciación",
    "endpoint": "GET /api/v1/catastro/tablas/depreciacion?anio=2026",
    "desc": "Porcentaje que se descuenta del valor de edificación según antigüedad, material predominante (MEP) y estado de conservación (ECS).",
    "filtros": [
      {
        "clave": "materialMep",
        "label": "Material (MEP)",
        "t": "sel",
        "opts": [
          "CONCRETO",
          "LADRILLO",
          "ADOBE",
          "QUINCHA",
          "MADERA"
        ]
      },
      {
        "clave": "uso",
        "label": "Uso",
        "t": "sel",
        "opts": [
          "CASA HABITACIÓN",
          "TIENDAS Y OFICINAS",
          "INDUSTRIA"
        ]
      }
    ],
    "tabla": {
      "title": "Depreciación por antigüedad y estado — ladrillo, casa habitación",
      "cols": [
        "Antigüedad",
        "Muy bueno %",
        "Bueno %",
        "Regular %",
        "Malo %"
      ],
      "num": [
        1,
        2,
        3,
        4
      ]
    }
  },
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
  },
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
  },
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
  },
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
  },
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
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Generar",
      "Inactivar",
      "Imprimir"
    ]
  },
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
  },
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
      "num": [
        5
      ]
    },
    "acciones": [
      "Emitir",
      "Imprimir certificado"
    ]
  },
  "modulos": {
    "id": "modulos",
    "mod": "Seguridad",
    "title": "Módulos del sistema",
    "endpoint": "GET /api/v1/seguridad/modulos",
    "desc": "Sistemas controlados por el módulo de seguridad integrada. Cada módulo agrupa sus grupos, accesos y permisos.",
    "filtros": [
      {
        "clave": "modulo",
        "label": "Módulo",
        "t": "text",
        "ancho": true
      }
    ],
    "secciones": [
      {
        "label": "Datos del módulo",
        "campos": [
          {
            "clave": "codigo",
            "label": "Código",
            "t": "ro"
          },
          {
            "clave": "nombreDelModulo",
            "label": "Nombre del módulo",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "abreviatura",
            "label": "Abreviatura",
            "t": "text"
          },
          {
            "clave": "estado",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "INACTIVA"
            ]
          },
          {
            "clave": "descripcion",
            "label": "Descripción",
            "t": "area",
            "ancho": true
          }
        ]
      }
    ],
    "tabla": {
      "title": "Módulos registrados",
      "cols": [
        "Codigo",
        "Abreviatura",
        "Nombre del módulo",
        "Estado"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Deshacer",
      "Limpiar",
      "Imprimir"
    ]
  },
  "usuarios": {
    "id": "usuarios",
    "mod": "Seguridad",
    "title": "Usuarios del sistema",
    "endpoint": "GET /api/v1/seguridad/usuarios",
    "desc": "Alta de usuarios con su unidad orgánica, la caja asignada y el grupo de acceso que define qué opciones del menú puede ejecutar.",
    "filtros": [
      {
        "clave": "usuario",
        "label": "Usuario",
        "t": "text"
      },
      {
        "clave": "unidadOrganica",
        "label": "Unidad orgánica",
        "t": "sel",
        "opts": [
          "Todas",
          "UNIDAD DE RENTAS",
          "TESORERÍA",
          "FISCALIZACIÓN",
          "EJECUTORÍA COACTIVA",
          "COMERCIALIZACIÓN"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "ACTIVA",
          "BLOQUEADA",
          "INACTIVA"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Cuenta",
        "campos": [
          {
            "clave": "usuario2",
            "label": "Usuario",
            "t": "text"
          },
          {
            "clave": "nombreCompleto",
            "label": "Nombre completo",
            "t": "text"
          },
          {
            "clave": "dNI",
            "label": "D.N.I.",
            "t": "text"
          },
          {
            "clave": "cargo",
            "label": "Cargo",
            "t": "text"
          },
          {
            "clave": "unidadOrganica2",
            "label": "Unidad orgánica",
            "t": "sel",
            "opts": [
              "UNIDAD DE RENTAS",
              "TESORERÍA",
              "FISCALIZACIÓN",
              "EJECUTORÍA COACTIVA",
              "COMERCIALIZACIÓN"
            ]
          },
          {
            "clave": "grupo",
            "label": "Grupo",
            "t": "sel",
            "opts": [
              "ADMINISTRADORES",
              "EJECUCION PO",
              "PLAN",
              "PLANEAMIENTO",
              "CAJERO",
              "ORIENTADOR",
              "ANALISTA",
              "FISCALIZADOR",
              "EJECUTOR",
              "CONSULTA"
            ]
          },
          {
            "clave": "cajaAsignada",
            "label": "Caja asignada",
            "t": "sel",
            "opts": [
              "—",
              "C-1",
              "C-2",
              "C-3",
              "C-4"
            ]
          },
          {
            "clave": "estado2",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "BLOQUEADA",
              "INACTIVA"
            ]
          },
          {
            "clave": "vencimientoDeContrasena",
            "label": "Vencimiento de contraseña",
            "t": "date"
          },
          {
            "clave": "obligaCambioEnElProximoAcceso",
            "label": "Obliga cambio en el próximo acceso",
            "t": "chk",
            "ph": "Forzar cambio de contraseña"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Usuarios registrados",
      "cols": [
        "Usuario",
        "Nombre",
        "Unidad orgánica",
        "Grupo",
        "Caja",
        "Último acceso",
        "Estado"
      ]
    },
    "acciones": [
      "Nuevo",
      "Restablecer contraseña",
      "Eliminar",
      "Guardar"
    ]
  },
  "grupos": {
    "id": "grupos",
    "mod": "Seguridad",
    "title": "Grupos de usuarios",
    "endpoint": "GET /api/v1/seguridad/grupos",
    "desc": "Agrupación jerárquica de cuentas. El grupo concentra los accesos y todo usuario hereda los permisos del grupo al que pertenece.",
    "filtros": [
      {
        "clave": "grupo",
        "label": "Grupo",
        "t": "text"
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "Todos",
          "ACTIVA",
          "INACTIVA"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Datos del grupo",
        "campos": [
          {
            "clave": "nombreDelGrupo",
            "label": "Nombre del grupo",
            "t": "text"
          },
          {
            "clave": "descripcion",
            "label": "Descripción",
            "t": "text",
            "ancho": true
          },
          {
            "clave": "grupoPadre",
            "label": "Grupo padre",
            "t": "sel",
            "opts": [
              "SIGAM",
              "ADMINISTRADORES",
              "—"
            ]
          },
          {
            "clave": "estado2",
            "label": "Estado",
            "t": "sel",
            "opts": [
              "ACTIVA",
              "INACTIVA"
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Grupos y usuarios — SIGAM",
      "cols": [
        "Grupo",
        "Descripción",
        "Usuarios",
        "Accesos asignados",
        "Estado"
      ],
      "num": [
        2,
        3
      ],
      "note": "Los usuarios del grupo ADMINISTRADORES son aayca, ehurtado, fruiz, iquispep y vrosales."
    },
    "acciones": [
      "Nuevo",
      "Eliminar",
      "Guardar"
    ]
  },
  "accesos": {
    "id": "accesos",
    "mod": "Seguridad",
    "title": "Accesos y políticas",
    "endpoint": "GET /api/v1/seguridad/accesos",
    "desc": "Opciones de menú y políticas del sistema controlado. La búsqueda admite filtrar por tipo y por parte del nombre del acceso.",
    "filtros": [
      {
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "(TODOS)",
          "OPCIÓN MENÚ",
          "POLÍTICA"
        ]
      },
      {
        "clave": "nombreDelAcceso",
        "label": "Nombre del acceso",
        "t": "text",
        "ancho": true
      }
    ],
    "tabs": [
      {
        "label": "Datos del Acceso",
        "secciones": [
          {
            "label": "Acceso",
            "campos": [
              {
                "clave": "codigo",
                "label": "Código",
                "t": "ro"
              },
              {
                "clave": "modulo",
                "label": "Modulo",
                "t": "sel",
                "opts": [
                  "SIGTM",
                  "SIGAM",
                  "SISEG"
                ]
              },
              {
                "clave": "tipo2",
                "label": "Tipo",
                "t": "sel",
                "opts": [
                  "OPCIÓN MENÚ",
                  "POLÍTICA"
                ]
              },
              {
                "clave": "objetoControl",
                "label": "Objeto control",
                "t": "text"
              },
              {
                "clave": "nivel",
                "label": "Nivel",
                "t": "text"
              },
              {
                "clave": "nombreDelAcceso2",
                "label": "Nombre del acceso",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "estado",
                "label": "Estado",
                "t": "sel",
                "opts": [
                  "ACTIVA",
                  "INACTIVA"
                ]
              },
              {
                "clave": "descripcion",
                "label": "Descripción",
                "t": "area",
                "ancho": true
              }
            ]
          }
        ]
      },
      {
        "label": "Usuarios y Grupos Autorizados",
        "secciones": [
          {
            "label": "Autorizados sobre este acceso",
            "campos": [
              {
                "clave": "buscarUsuarioOGrupo",
                "label": "Buscar usuario o grupo",
                "t": "text",
                "ancho": true
              },
              {
                "clave": "grupo",
                "label": "Grupo",
                "t": "sel",
                "opts": [
                  "ADMINISTRADORES",
                  "CAJA",
                  "EJECUCIÓN PO",
                  "PLANEAMIENTO",
                  "FISCALIZACIÓN"
                ]
              },
              {
                "clave": "usuario",
                "label": "Usuario",
                "t": "text"
              }
            ]
          }
        ]
      }
    ],
    "tabla": {
      "title": "Accesos coincidentes",
      "cols": [
        "Código",
        "Tipo",
        "Nombre del acceso",
        "Modulo",
        "Nivel",
        "Estado"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Modificar",
      "Guardar",
      "Deshacer",
      "Eliminar",
      "Imprimir"
    ]
  },
  "miembros": {
    "id": "miembros",
    "mod": "Seguridad",
    "title": "Gestión de miembros",
    "endpoint": "POST /api/v1/seguridad/grupos/{grupo}/miembros",
    "desc": "Afiliación de usuarios a uno o varios grupos, base de la posterior asignación de permisos a nivel de grupo. El árbol de la izquierda lista los grupos del módulo y sus usuarios.",
    "filtros": [
      {
        "clave": "usuario",
        "label": "Usuario",
        "t": "text"
      },
      {
        "clave": "grupo",
        "label": "Grupo",
        "t": "sel",
        "opts": [
          "ADMINISTRADORES",
          "CAJA",
          "EJECUCIÓN PO",
          "PLAN",
          "PLANEAMIENTO",
          "FISCALIZACIÓN"
        ]
      },
      {
        "clave": "modulo",
        "label": "Modulo",
        "t": "sel",
        "opts": [
          "SIGTM",
          "SIGAM",
          "SISEG"
        ]
      },
      {
        "clave": "estado",
        "label": "Estado",
        "t": "sel",
        "opts": [
          "ACTIVA",
          "INACTIVA",
          "TODAS"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Grupos y usuarios del módulo",
        "campos": [
          {
            "clave": "sigamAdministradores",
            "label": "SIGAM › ADMINISTRADORES",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "sigamEjecucionPo",
            "label": "SIGAM › EJECUCIÓN PO",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "sigamPlan",
            "label": "SIGAM › PLAN",
            "t": "ro",
            "ancho": true
          },
          {
            "clave": "sigamPlaneamiento",
            "label": "SIGAM › PLANEAMIENTO",
            "t": "ro",
            "ancho": true
          }
        ],
        "hint": "Solo lectura"
      }
    ],
    "tabla": {
      "title": "Asignación de usuarios y grupos",
      "cols": [
        "Usuario",
        "Grupo",
        "Fec. Alta",
        "Fec. Baja",
        "Estado"
      ],
      "num": []
    },
    "acciones": [
      "Nuevo",
      "Agregar",
      "Guardar",
      "Eliminar",
      "Imprimir"
    ]
  },
  "permisos": {
    "id": "permisos",
    "mod": "Seguridad",
    "title": "Permisos y niveles de accesibilidad",
    "endpoint": "PUT /api/v1/seguridad/grupos/{id}/permisos",
    "desc": "Matriz de acceso por opción del menú. Cada acceso se otorga con siete niveles: total, ejecuta, consulta, ingresa, modifica, anula e imprime.",
    "filtros": [
      {
        "clave": "buscarPor",
        "label": "Buscar por",
        "t": "sel",
        "opts": [
          "Grupo",
          "Usuario"
        ]
      },
      {
        "clave": "grupoUsuario",
        "label": "Grupo / Usuario",
        "t": "text"
      },
      {
        "clave": "acceso",
        "label": "Acceso",
        "t": "sel",
        "opts": [
          "Todos",
          "MENU SIGAM",
          "Archivo - Cambiar el Año",
          "Presupuesto",
          "Patrimonio - Catálogo de Bienes"
        ]
      }
    ],
    "tabla": {
      "title": "Permisos entre usuarios y accesos",
      "cols": [
        "Usuario",
        "Acceso",
        "Total",
        "Ejecuta",
        "Consulta",
        "Ingresa",
        "Modifica",
        "Anula",
        "Imprime",
        "Estado"
      ],
      "note": "Los cambios se aplican en el siguiente inicio de sesión de los usuarios del grupo.",
      "acciones": [
        "Agregar",
        "Agregar Todo"
      ]
    },
    "acciones": [
      "Nuevo",
      "Eliminar",
      "Imprimir",
      "Guardar"
    ]
  },
  "cambiar_anio": {
    "id": "cambiar_anio",
    "mod": "Seguridad",
    "title": "Cambiar el año de trabajo",
    "endpoint": "PUT /api/v1/seguridad/sesion/ejercicio",
    "desc": "Fija el ejercicio sobre el que operan todas las opciones del sistema. Los registros se graban contra el año seleccionado.",
    "secciones": [
      {
        "label": "Ejercicio de trabajo",
        "campos": [
          {
            "clave": "anoActualDeLaSesion",
            "label": "Año actual de la sesión",
            "t": "ro"
          },
          {
            "clave": "cambiarAlAno",
            "label": "Cambiar al año",
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
            "clave": "ejercicioContableAbierto",
            "label": "Ejercicio contable abierto",
            "t": "ro"
          },
          {
            "clave": "ultimoCierreEjecutado",
            "label": "Último cierre ejecutado",
            "t": "ro"
          },
          {
            "clave": "advertencia",
            "label": "Advertencia",
            "t": "ro",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Cancelar",
      "Aceptar"
    ]
  },
  "cambiar_clave": {
    "id": "cambiar_clave",
    "mod": "Seguridad",
    "title": "Cambiar contraseña",
    "endpoint": "PUT /api/v1/seguridad/usuarios/{id}/clave",
    "desc": "Cambio de la clave del usuario en sesión. La contraseña caduca cada 90 días y no puede repetir las tres últimas.",
    "secciones": [
      {
        "label": "Credenciales",
        "campos": [
          {
            "clave": "usuario",
            "label": "Usuario",
            "t": "ro"
          },
          {
            "clave": "contrasenaActual",
            "label": "Contraseña actual",
            "t": "text",
            "ph": "••••••••"
          },
          {
            "clave": "nuevaContrasena",
            "label": "Nueva contraseña",
            "t": "text",
            "ph": "Mínimo 8 caracteres"
          },
          {
            "clave": "confirmarNuevaContrasena",
            "label": "Confirmar nueva contraseña",
            "t": "text",
            "ph": "Repita la contraseña"
          },
          {
            "clave": "vencimientoActual",
            "label": "Vencimiento actual",
            "t": "ro"
          },
          {
            "clave": "requisitos",
            "label": "Requisitos",
            "t": "ro",
            "ancho": true
          }
        ]
      }
    ],
    "acciones": [
      "Cancelar",
      "Aceptar"
    ]
  },
  "auditoria": {
    "id": "auditoria",
    "mod": "Seguridad",
    "title": "Auditoría del sistema",
    "endpoint": "GET /api/v1/seguridad/auditoria",
    "desc": "Bitácora de operaciones sensibles: anulaciones, extornos, bajas de deuda, cambios de valor y accesos fallidos.",
    "filtros": [
      {
        "clave": "usuario",
        "label": "Usuario",
        "t": "sel",
        "opts": [
          "Todos",
          "jcardenas",
          "mrios",
          "rmendoza",
          "lpena"
        ]
      },
      {
        "clave": "accion",
        "label": "Acción",
        "t": "sel",
        "opts": [
          "Todas",
          "ALTA",
          "MODIFICACIÓN",
          "ELIMINACIÓN",
          "ANULACIÓN",
          "ACCESO"
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
      "title": "Movimientos registrados",
      "cols": [
        "Fecha y hora",
        "Usuario",
        "Opción",
        "Acción",
        "Registro afectado",
        "Terminal / IP"
      ]
    },
    "acciones": [
      "Excel",
      "Imprimir bitácora"
    ]
  },
  "parametros": {
    "id": "parametros",
    "mod": "Seguridad",
    "title": "Parámetros del sistema",
    "endpoint": "GET /api/v1/seguridad/parametros",
    "desc": "Valores que gobiernan el cálculo tributario del ejercicio. Cambiarlos afecta a todas las liquidaciones posteriores.",
    "secciones": [
      {
        "label": "Entidad y ejercicio",
        "campos": [
          {
            "clave": "entidad",
            "label": "Entidad",
            "t": "ro"
          },
          {
            "clave": "rUCDeLaEntidad",
            "label": "R.U.C. de la entidad",
            "t": "ro"
          },
          {
            "clave": "ejercicioVigente",
            "label": "Ejercicio vigente",
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
            "clave": "uitDelEjercicioS",
            "label": "UIT del ejercicio (S/)",
            "t": "text"
          },
          {
            "clave": "fechaDeCierreDelEjercicioAnterior",
            "label": "Fecha de cierre del ejercicio anterior",
            "t": "date"
          }
        ]
      },
      {
        "label": "Tasas e intereses",
        "campos": [
          {
            "clave": "timMensual",
            "label": "TIM mensual (%)",
            "t": "text"
          },
          {
            "clave": "interesDeFraccionamientoMensual",
            "label": "Interés de fraccionamiento mensual (%)",
            "t": "text"
          },
          {
            "clave": "indiceDePreciosAlPorMayorIpm",
            "label": "Índice de precios al por mayor (IPM)",
            "t": "text"
          },
          {
            "clave": "derechoDeEmisionPredialS",
            "label": "Derecho de emisión predial (S/)",
            "t": "text"
          },
          {
            "clave": "costasCoactivasDeLaDeuda",
            "label": "Costas coactivas (% de la deuda)",
            "t": "text"
          },
          {
            "clave": "descuentoPorProntoPago",
            "label": "Descuento por pronto pago (%)",
            "t": "text"
          },
          {
            "clave": "montoMinimoDeEmisionDeValoresS",
            "label": "Monto mínimo de emisión de valores (S/)",
            "t": "text"
          }
        ]
      },
      {
        "label": "Vencimientos del ejercicio",
        "campos": [
          {
            "clave": "cuota1",
            "label": "Cuota 1",
            "t": "date"
          },
          {
            "clave": "cuota2",
            "label": "Cuota 2",
            "t": "date"
          },
          {
            "clave": "cuota3",
            "label": "Cuota 3",
            "t": "date"
          },
          {
            "clave": "cuota4",
            "label": "Cuota 4",
            "t": "date"
          },
          {
            "clave": "vencimientoDeLaDeclaracionJuradaAnual",
            "label": "Vencimiento de la declaración jurada anual",
            "t": "date"
          }
        ]
      }
    ],
    "acciones": [
      "Deshacer",
      "Guardar parámetros"
    ]
  },
  "respaldo": {
    "id": "respaldo",
    "mod": "Seguridad",
    "title": "Copias de seguridad",
    "endpoint": "POST /api/v1/seguridad/respaldos",
    "desc": "Respaldo de la base de datos. El manual exige una copia diaria al cierre de caja y una copia mensual fuera del servidor.",
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
        "clave": "tipo",
        "label": "Tipo",
        "t": "sel",
        "opts": [
          "Todos",
          "DIARIA",
          "MENSUAL",
          "MANUAL"
        ]
      }
    ],
    "secciones": [
      {
        "label": "Nuevo respaldo",
        "campos": [
          {
            "clave": "tipo2",
            "label": "Tipo",
            "t": "sel",
            "opts": [
              "DIARIA",
              "MENSUAL",
              "MANUAL"
            ]
          },
          {
            "clave": "destino",
            "label": "Destino",
            "t": "text"
          },
          {
            "clave": "comprimir",
            "label": "Comprimir",
            "t": "chk",
            "ph": "Comprime el archivo resultante"
          },
          {
            "clave": "verificarAlTerminar",
            "label": "Verificar al terminar",
            "t": "chk",
            "ph": "Comprueba la integridad de la copia"
          }
        ]
      }
    ],
    "tabla": {
      "title": "Respaldos ejecutados",
      "cols": [
        "Fecha y hora",
        "Tipo",
        "Tamaño",
        "Destino",
        "Ejecutado por",
        "Estado"
      ],
      "note": "El respaldo del 10/08 falló por falta de espacio en el servidor de destino."
    },
    "acciones": [
      "Restaurar",
      "Ejecutar respaldo"
    ]
  }
};
