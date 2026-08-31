/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 12 pantallas de Catastro: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
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
      ],
      "claves": [
        "nombreCalle",
        "tipoVia",
        "tipPuerta",
        "numero",
        "numAdicional",
        "nomTipoNum"
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
      "claves": [
        "unidad",
        "contribuyente",
        "areaExclusivaM",
        "participacion",
        "valorAsignadoS"
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
      "claves": [
        "codRefCatastral",
        "codPredialRentas",
        "titular",
        "uso",
        "areaTerrenoM",
        "areaConstM",
        "conciliada"
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
      "claves": [
        "numPiso",
        "mes",
        "ano",
        "mpe",
        "ecs",
        "ecc",
        "muro",
        "tech",
        "piso",
        "puer",
        "rev",
        "ban",
        "instele",
        "areaDeclarada",
        "areaVerificada",
        "uca"
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
      "claves": [
        "codigo",
        "tipoVia",
        "nombre",
        "sector",
        "zona",
        "arancelSM",
        "estado"
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
      "claves": [
        "sector",
        "denominacion",
        "manzanas",
        "lotes",
        "prediosInscritos",
        "zonaDeArbitrios",
        "estado"
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
      "claves": [
        "via",
        "cuadraDesde",
        "cuadraHasta",
        "zona",
        "arancelSM",
        "variacionVs2025"
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
      "claves": [
        "cat",
        "murosYColumnas",
        "techos",
        "pisos",
        "puertasYVentanas",
        "revestimientos",
        "banos",
        "instElectYSanit"
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
      "claves": [
        "antiguedad",
        "muyBueno",
        "bueno",
        "regular",
        "malo"
      ],
      "num": [
        1,
        2,
        3,
        4
      ]
    }
  }
};
