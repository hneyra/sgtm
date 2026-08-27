/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * Los 12 modulos del manual y sus 134 opciones, con el bloque de cada una ya
 * clasificado en el build: grupos por tarea donde el modulo esta disenado
 * (ADR-0014 §4) y los bloques de FRO-03 §4 en los demas.
 *
 * Los nombres vienen del manual y no se reescriben (RNF-080).
 */

import type { ModuloDelCatalogo } from './tipos';

export const MODULOS: readonly ModuloDelCatalogo[] = [
  {
    "id": "inicio",
    "label": "Inicio",
    "icono": [
      "M3 10.6 12 3.5l9 7.1",
      "M5.6 9.6V20.5h12.8V9.6",
      "M10 20.5v-5.4h4v5.4"
    ],
    "bloques": [
      "Consultas"
    ],
    "opciones": [
      {
        "id": "inicio",
        "label": "Panel de recaudación",
        "ranura": "inicio",
        "bloque": "Consultas",
        "title": "Panel de recaudación",
        "resumen": "Avance de la recaudación del ejercicio 2026 al 13 de agosto, con la cartera pendiente por tributo y las tareas abiertas de cada unidad."
      },
      {
        "id": "portal",
        "label": "Portal ciudadano",
        "ranura": "portal",
        "bloque": "Consultas",
        "title": "Consulta y pago en línea",
        "resumen": "Flujo público de autoconsulta: el contribuyente identifica su deuda, elige qué pagar y descarga su constancia sin acudir a la municipalidad."
      }
    ]
  },
  {
    "id": "catastro",
    "label": "Catastro",
    "icono": [
      "M3.5 6.6 9 4.2l6 2.4 5.5-2.4v13.2L15 19.8l-6-2.4-5.5 2.4z",
      "M9 4.2v13.2",
      "M15 6.6v13.2"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Procesos",
      "Consultas",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "ficha_urbana",
        "label": "Ficha urbana individual",
        "ranura": "ficha-urbana",
        "bloque": "Registro y mantenimiento",
        "title": "Ficha catastral urbana individual",
        "resumen": "Ficha del predio urbano. El código de referencia catastral se compone de sector, manzana, lote, edificación, entrada, piso y unidad; su cambio obliga a recalcular el autovalúo."
      },
      {
        "id": "ficha_economica",
        "label": "Ficha económica",
        "ranura": "ficha-economica",
        "bloque": "Registro y mantenimiento",
        "title": "Ficha catastral económica",
        "resumen": "Actividad económica que se desarrolla en la unidad catastral, usada para verificar licencias y determinar el uso real del predio."
      },
      {
        "id": "ficha_bienes",
        "label": "Bienes comunes",
        "ranura": "ficha-bienes",
        "bloque": "Registro y mantenimiento",
        "title": "Ficha de bienes comunes",
        "resumen": "Áreas comunes de una edificación en régimen de propiedad exclusiva y común, cuyo valor se distribuye entre las unidades según su porcentaje de participación."
      },
      {
        "id": "ficha_rural",
        "label": "Ficha rural",
        "ranura": "ficha-rural",
        "bloque": "Registro y mantenimiento",
        "title": "Ficha catastral rural",
        "resumen": "Predio rústico valorizado por hectárea según el arancel rural, el tipo de tierra y la disponibilidad de riego."
      },
      {
        "id": "consulta_fichas",
        "label": "Consulta de fichas",
        "ranura": "consulta-fichas",
        "bloque": "Consultas",
        "title": "Consulta de fichas catastrales",
        "resumen": "Búsqueda transversal de fichas por código, titular o ubicación, con el estado de conciliación entre catastro y el padrón de rentas."
      },
      {
        "id": "actualizacion_catastro",
        "label": "Actualización del catastro",
        "ranura": "actualizacion-catastro",
        "bloque": "Procesos",
        "title": "Actualización del catastro",
        "resumen": "Actualiza construcciones y otras instalaciones de una ficha ya registrada. El sistema conserva cada versión declarada y verificada por piso, con su MEP, ECS, ECC y estado de conservación."
      },
      {
        "id": "ficha_contribuyente_reporte",
        "label": "Reporte de ficha del contribuyente",
        "ranura": "ficha-contribuyente-reporte",
        "bloque": "Documentos y reportes",
        "title": "Reporte de ficha del contribuyente",
        "resumen": "Ficha impresa del contribuyente: identificación, domicilio fiscal, documentos, contactos y unidades afectas."
      },
      {
        "id": "calles",
        "label": "Vías y calles",
        "ranura": "calles",
        "bloque": "Registro y mantenimiento",
        "title": "Mantenimiento de vías y calles",
        "resumen": "Nomenclatura vial que alimenta el domicilio fiscal y la ubicación del predio. Cada vía guarda su tipo, sector y arancel unitario por tramo."
      },
      {
        "id": "sectores",
        "label": "Sectores y manzanas",
        "ranura": "sectores",
        "bloque": "Registro y mantenimiento",
        "title": "Sectores, manzanas y lotes",
        "resumen": "Estructura territorial sobre la que se arma el código de referencia catastral y se agrupan los padrones por zona."
      },
      {
        "id": "aranceles",
        "label": "Aranceles",
        "ranura": "aranceles",
        "bloque": "Registro y mantenimiento",
        "title": "Aranceles de terreno",
        "resumen": "Valor oficial del metro cuadrado de terreno por vía y tramo, publicado anualmente. Es el multiplicador del área de terreno en el autovalúo."
      },
      {
        "id": "valores_unitarios",
        "label": "Valores unitarios",
        "ranura": "valores-unitarios",
        "bloque": "Registro y mantenimiento",
        "title": "Valores unitarios de edificación",
        "resumen": "Tabla oficial por categoría constructiva. El sistema suma las siete partidas declaradas en la ficha y les aplica la depreciación correspondiente."
      },
      {
        "id": "depreciacion",
        "label": "Depreciación",
        "ranura": "depreciacion",
        "bloque": "Registro y mantenimiento",
        "title": "Tabla de depreciación",
        "resumen": "Porcentaje que se descuenta del valor de edificación según antigüedad, material predominante (MEP) y estado de conservación (ECS)."
      }
    ]
  },
  {
    "id": "rentas-registro",
    "label": "Rentas · Registro",
    "icono": [
      "M6.5 3.5h7.5l4 4v13h-11.5z",
      "M14 3.5v4h4",
      "M9.5 12.5h5",
      "M9.5 16.5h3.5"
    ],
    "bloques": [
      "Padrones",
      "Determinación",
      "Movimientos",
      "Tributos y beneficios"
    ],
    "opciones": [
      {
        "id": "contribuyentes",
        "label": "Contribuyentes",
        "ranura": "contribuyentes",
        "bloque": "Padrones",
        "title": "Contribuyentes",
        "resumen": "Padrón único del contribuyente. Su código enlaza predios, vehículos, licencias, papeletas y la cuenta corriente."
      },
      {
        "id": "predios_rentas",
        "label": "Predios",
        "ranura": "predios-rentas",
        "bloque": "Padrones",
        "title": "Predios del contribuyente",
        "resumen": "Padrón predial de rentas. Cada predio guarda su autovalúo, condición de propiedad y la fecha desde la que genera obligación."
      },
      {
        "id": "predial_individual",
        "label": "Predial — individual",
        "ranura": "predial-individual",
        "bloque": "Determinación",
        "title": "Cálculo individual del impuesto predial",
        "resumen": "Determina el impuesto de un contribuyente sobre el autovalúo acumulado de todos sus predios en el distrito, con la escala progresiva acumulativa y el mínimo imponible de 0.6 % de la UIT."
      },
      {
        "id": "predial_masivo",
        "label": "Predial — masivo",
        "ranura": "predial-masivo",
        "bloque": "Determinación",
        "title": "Cálculo masivo del impuesto predial",
        "resumen": "Proceso batch de emisión anual. Recalcula todo el padrón para el ejercicio seleccionado y deja constancia de los contribuyentes observados que quedan fuera de la emisión."
      },
      {
        "id": "declaracion_jurada",
        "label": "Declaración jurada",
        "ranura": "declaracion-jurada",
        "bloque": "Determinación",
        "title": "Declaración jurada — HR, PU y PR",
        "resumen": "Formularios de la declaración: hoja resumen (HR), predio urbano (PU) y predio rústico (PR). Se imprimen para la firma del contribuyente y quedan como sustento del cálculo."
      },
      {
        "id": "arbitrios",
        "label": "Arbitrios",
        "ranura": "arbitrios",
        "bloque": "Tributos y beneficios",
        "title": "Arbitrios municipales",
        "resumen": "Limpieza pública, parques y jardines y serenazgo. La tasa depende del uso del predio, la zona, la frecuencia del servicio y los metros de frontis declarados en la ficha."
      },
      {
        "id": "transferencia_predio",
        "label": "Transferencia de predio",
        "ranura": "transferencia-predio",
        "bloque": "Movimientos",
        "title": "Transferencia de predio",
        "resumen": "Da de baja al transferente y de alta al adquirente desde la fecha del acto. La obligación del vendedor corre hasta el 31 de diciembre del año de la transferencia."
      },
      {
        "id": "alcabala",
        "label": "Alcabala",
        "ranura": "alcabala",
        "bloque": "Tributos y beneficios",
        "title": "Impuesto de alcabala",
        "resumen": "Grava la transferencia de propiedad con el 3 % sobre el exceso de las primeras 10 UIT, tomando como base el mayor valor entre el de transferencia y el autovalúo ajustado por el IPM."
      },
      {
        "id": "vehiculos",
        "label": "Vehículos",
        "ranura": "vehiculos",
        "bloque": "Padrones",
        "title": "Ficha de vehículo",
        "resumen": "Registro del vehículo. La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral."
      },
      {
        "id": "vehicular_calculo",
        "label": "Cálculo vehicular",
        "ranura": "vehicular-calculo",
        "bloque": "Determinación",
        "title": "Cálculo del impuesto vehicular",
        "resumen": "Aplica el 1 % sobre la base imponible con un mínimo del 1.5 % de la UIT, por los tres ejercicios en que el vehículo permanece afecto."
      },
      {
        "id": "transferencia_vehiculo",
        "label": "Transferencia de vehículo",
        "ranura": "transferencia-vehiculo",
        "bloque": "Movimientos",
        "title": "Transferencia de vehículo",
        "resumen": "Registra el cambio de titular. El transferente responde por el impuesto hasta el 31 de diciembre del año en que se produce la venta."
      },
      {
        "id": "espectaculos",
        "label": "Espectáculos públicos",
        "ranura": "espectaculos",
        "bloque": "Tributos y beneficios",
        "title": "Espectáculos públicos no deportivos",
        "resumen": "Grava el monto que se abona por presenciar el espectáculo. La tasa depende del tipo de evento y el organizador actúa como agente perceptor."
      },
      {
        "id": "beneficios",
        "label": "Beneficios",
        "ranura": "beneficios",
        "bloque": "Tributos y beneficios",
        "title": "Beneficios y exoneraciones",
        "resumen": "Deducciones, inafectaciones y amnistías. La deducción de 50 UIT para pensionistas y adultos mayores exige predio único destinado a vivienda."
      },
      {
        "id": "alta_deuda",
        "label": "Alta de deuda",
        "ranura": "alta-deuda",
        "bloque": "Movimientos",
        "title": "Alta de deuda",
        "resumen": "Incorpora manualmente una obligación a la cuenta corriente cuando no proviene de la emisión masiva: determinaciones de fiscalización, multas o deuda migrada."
      },
      {
        "id": "baja_deuda",
        "label": "Baja de deuda",
        "ranura": "baja-deuda",
        "bloque": "Movimientos",
        "title": "Baja de deuda",
        "resumen": "Extingue deuda de la cuenta corriente por prescripción, resolución que la deja sin efecto, error material o compensación. Requiere resolución y queda en la bitácora de auditoría."
      }
    ]
  },
  {
    "id": "fiscalizacion",
    "label": "Fiscalización",
    "icono": [
      "M9.5 4.5H8A1.5 1.5 0 0 0 6.5 6v13A1.5 1.5 0 0 0 8 20.5h8a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 16 4.5h-1.5",
      "M9.5 3.2h5v2.8h-5z",
      "M9.6 13.2l2 2 3.4-4"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Consultas",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "fisc_programa",
        "label": "Programación",
        "ranura": "fisc-programa",
        "bloque": "Registro y mantenimiento",
        "title": "Programación de fiscalización",
        "resumen": "Selección de la muestra a inspeccionar por sector y criterio de riesgo, con el fiscalizador asignado y el plazo del programa."
      },
      {
        "id": "fisc_predial",
        "label": "Fiscalización predial",
        "ranura": "fisc-predial",
        "bloque": "Registro y mantenimiento",
        "title": "Fiscalización predial — acta de inspección",
        "resumen": "Formulario de campo optimizado para tablet. Contrasta lo verificado con lo declarado y determina si corresponde emitir resolución de determinación."
      },
      {
        "id": "fisc_vehicular",
        "label": "Fiscalización vehicular",
        "ranura": "fisc-vehicular",
        "bloque": "Registro y mantenimiento",
        "title": "Fiscalización vehicular",
        "resumen": "Cruce del padrón vehicular con la información registral y de SUNAT para detectar vehículos afectos no declarados o con valor subvaluado."
      },
      {
        "id": "fisc_resultados",
        "label": "Resultados",
        "ranura": "fisc-resultados",
        "bloque": "Registro y mantenimiento",
        "title": "Resultados y determinaciones",
        "resumen": "Diferencias detectadas, deuda omitida por ejercicio y estado del valor emitido a partir de cada acta."
      },
      {
        "id": "fisc_omisos",
        "label": "Omisos y subvaluadores",
        "ranura": "fisc-omisos",
        "bloque": "Registro y mantenimiento",
        "title": "Omisos y subvaluadores",
        "resumen": "Contribuyentes con predio en catastro pero sin declaración en rentas, y declaraciones cuyo autovalúo está por debajo del valor catastral verificado."
      },
      {
        "id": "fisc_estado_cuenta",
        "label": "Estado de cuenta de fiscalización",
        "ranura": "fisc-estado-cuenta",
        "bloque": "Consultas",
        "title": "Estado de cuenta de fiscalización",
        "resumen": "Consulta las deudas originadas en un proceso fiscalizador: diferencias de impuesto predial, arbitrios y patrimonio vehicular con sus multas tributarias."
      },
      {
        "id": "fisc_historico",
        "label": "Histórico de fiscalización predial",
        "ranura": "fisc-historico",
        "bloque": "Consultas",
        "title": "Histórico de fiscalización predial",
        "resumen": "Versiones de un proceso fiscalizador: qué característica cambió, quién la modificó y en qué momento. Cada liquidación conserva su estado y su versión."
      },
      {
        "id": "resolucion_determinacion_fisc",
        "label": "Resolución de determinación",
        "ranura": "resolucion-determinacion-fisc",
        "bloque": "Documentos y reportes",
        "title": "Resolución de determinación de fiscalización",
        "resumen": "Valor emitido al cierre de un procedimiento de fiscalización: determina la diferencia de tributo por ejercicio y la multa tributaria que corresponde."
      }
    ]
  },
  {
    "id": "transito",
    "label": "Tránsito",
    "icono": [
      "M5 15.8v-3.2l1.9-4.4h10.2l1.9 4.4v3.2",
      "M3.6 15.8h16.8",
      "M8.4 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0",
      "M18.8 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0"
    ],
    "bloques": [
      "Papeletas",
      "Vehículos",
      "Cobranza",
      "Catálogos",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "papeletas",
        "label": "Papeletas",
        "ranura": "papeletas",
        "bloque": "Papeletas",
        "title": "Papeletas de infracción de tránsito",
        "resumen": "Papeletas levantadas por el inspector municipal, con el código del Reglamento Nacional de Tránsito, la sanción en porcentaje de UIT y la medida preventiva aplicada."
      },
      {
        "id": "transito_busqueda",
        "label": "Búsqueda de infracciones",
        "ranura": "transito-busqueda",
        "bloque": "Papeletas",
        "title": "Búsqueda de infracciones",
        "resumen": "Búsqueda avanzada de papeletas por número, placa, infractor, propietario, rango de fechas y estado de deuda. Muestra el estado de coactiva, el último pago y el usuario que registró la papeleta."
      },
      {
        "id": "codigos_transito",
        "label": "Códigos de tránsito",
        "ranura": "codigos-transito",
        "bloque": "Catálogos",
        "title": "Tabla de códigos de infracción de tránsito",
        "resumen": "Catálogo del Reglamento Nacional de Tránsito con la sanción, los puntos y la medida preventiva que el sistema aplica al registrar cada papeleta."
      },
      {
        "id": "transito_descargos",
        "label": "Descargos",
        "ranura": "transito-descargos",
        "bloque": "Papeletas",
        "title": "Descargos y reclamos de papeletas",
        "resumen": "Escrito de descargo presentado dentro del plazo, su evaluación y la resolución que declara fundada o infundada la impugnación."
      },
      {
        "id": "internamiento",
        "label": "Internamiento vehicular",
        "ranura": "internamiento",
        "bloque": "Vehículos",
        "title": "Internamiento vehicular",
        "resumen": "Control de vehículos en el depósito municipal, con el cómputo diario de la tasa de custodia y los requisitos para la liberación."
      },
      {
        "id": "transito_documentos",
        "label": "Resoluciones y documentos",
        "ranura": "transito-documentos",
        "bloque": "Cobranza",
        "title": "Emisión de resoluciones y otros documentos",
        "resumen": "Registra los documentos emitidos por papeleta y conserva la secuencia del trámite, incluido el archivo digital de cada acto administrativo."
      },
      {
        "id": "transito_valores",
        "label": "Generación de valores",
        "ranura": "transito-valores",
        "bloque": "Cobranza",
        "title": "Generación de valores de tránsito",
        "resumen": "Genera masivamente los valores por papeletas de tránsito pendientes de pago. El criterio define el tipo de recaudo, la oficina y el vencimiento; las papeletas se agregan por selección o manualmente."
      },
      {
        "id": "transito_cambio_numero",
        "label": "Cambio de nº de papeleta",
        "ranura": "transito-cambio-numero",
        "bloque": "Papeletas",
        "title": "Cambio de número de papeleta de tránsito",
        "resumen": "Corrige el número de papeleta o el número de placa registrados, cuando hubo error del operador al momento del registro."
      },
      {
        "id": "transito_reportes",
        "label": "Reportes de tránsito",
        "ranura": "transito-reportes",
        "bloque": "Documentos y reportes",
        "title": "Reportes de infracción de tránsito",
        "resumen": "Emisor de los reportes del módulo de tránsito. El tipo de reporte habilita los criterios que corresponden y el destino puede ser pantalla, impresora o Excel."
      },
      {
        "id": "transito_record_conductor",
        "label": "Record de conductor",
        "ranura": "transito-record-conductor",
        "bloque": "Documentos y reportes",
        "title": "Record de conductor",
        "resumen": "Historial de infracciones cometidas por un conductor y el estado de deuda de cada papeleta impuesta."
      },
      {
        "id": "transito_record_vehicular",
        "label": "Record vehicular",
        "ranura": "transito-record-vehicular",
        "bloque": "Documentos y reportes",
        "title": "Record vehicular",
        "resumen": "Historial de papeletas de infracción de tránsito de un solo vehículo, con el estado de pago de cada una."
      },
      {
        "id": "transito_constancia_libre",
        "label": "Constancia libre de infracciones",
        "ranura": "transito-constancia-libre",
        "bloque": "Documentos y reportes",
        "title": "Constancia libre de infracciones",
        "resumen": "Documento con el que la municipalidad acredita que un vehículo no registra papeletas de tránsito pendientes de pago."
      },
      {
        "id": "transito_padron",
        "label": "Padrón de papeletas",
        "ranura": "transito-padron",
        "bloque": "Documentos y reportes",
        "title": "Padrón de papeletas de tránsito",
        "resumen": "Listado de las papeletas registradas en un intervalo de fechas, filtrable por estado de deuda, infracción y placa."
      },
      {
        "id": "transito_estado_cuenta",
        "label": "Estado de cuenta de infracciones",
        "ranura": "transito-estado-cuenta",
        "bloque": "Papeletas",
        "title": "Estado de cuenta de infracciones",
        "resumen": "Papeletas pendientes de pago de un conductor o de un vehículo, con importe, beneficio aplicable y situación de coactiva."
      },
      {
        "id": "transito_papeleta_reporte",
        "label": "Reporte de papeleta",
        "ranura": "transito-papeleta-reporte",
        "bloque": "Documentos y reportes",
        "title": "Reporte papeleta de infracción",
        "resumen": "Hoja informativa que resume la información relevante de una papeleta de infracción de tránsito."
      },
      {
        "id": "transito_rg_ordinaria",
        "label": "Res. de gerencia ordinaria",
        "ranura": "transito-rg-ordinaria",
        "bloque": "Documentos y reportes",
        "title": "Resolución de gerencia ordinaria",
        "resumen": "Resolución que emite la municipalidad para la cobranza de la papeleta. De no cancelarse, el documento pasa al área de cobranza coactiva."
      },
      {
        "id": "transito_rg_sancionadora",
        "label": "Res. de gerencia sancionadora",
        "ranura": "transito-rg-sancionadora",
        "bloque": "Documentos y reportes",
        "title": "Resolución de gerencia sancionadora",
        "resumen": "Segunda resolución, emitida luego de la ordinaria. Tiene carácter sancionador y se deriva a la Dirección General de Transportes."
      },
      {
        "id": "transito_padron_coactiva",
        "label": "Padrón enviadas a coactiva",
        "ranura": "transito-padron-coactiva",
        "bloque": "Cobranza",
        "title": "Padrón de papeletas enviadas a coactiva",
        "resumen": "Control de las papeletas derivadas al área de cobranza coactiva por intervalo de fechas."
      },
      {
        "id": "transito_padron_constancias",
        "label": "Padrón de constancias",
        "ranura": "transito-padron-constancias",
        "bloque": "Documentos y reportes",
        "title": "Padrón de constancias libres de infracciones",
        "resumen": "Padrón general de constancias libres de infracciones emitidas por la unidad competente."
      },
      {
        "id": "transito_resumen_recaudacion",
        "label": "Resumen de recaudación",
        "ranura": "transito-resumen-recaudacion",
        "bloque": "Documentos y reportes",
        "title": "Resumen de recaudación de tránsito",
        "resumen": "Recaudación por papeletas organizada por tipo de cobranza, año y mes."
      },
      {
        "id": "transito_resumen_papeletas",
        "label": "Resumen de papeletas",
        "ranura": "transito-resumen-papeletas",
        "bloque": "Documentos y reportes",
        "title": "Resumen de papeletas pendientes y pagadas",
        "resumen": "Cantidades e importes de papeletas pendientes y pagadas, diferenciando cobranza ordinaria de cobranza coactiva."
      },
      {
        "id": "transito_resumen_codigo",
        "label": "Resumen por código",
        "ranura": "transito-resumen-codigo",
        "bloque": "Documentos y reportes",
        "title": "Resumen de papeletas por código de infracción",
        "resumen": "Cantidades e importes de papeletas pendientes y pagadas de una infracción determinada."
      },
      {
        "id": "transito_resumen_placa",
        "label": "Resumen por iniciales de placa",
        "ranura": "transito-resumen-placa",
        "bloque": "Documentos y reportes",
        "title": "Resumen de papeletas por iniciales de placa",
        "resumen": "Resumen de papeletas filtrado por las dos letras iniciales del número de placa del vehículo."
      }
    ]
  },
  {
    "id": "infracciones-administrativas",
    "label": "Infracciones administrativas",
    "icono": [
      "M12 4.2 20.8 19.6H3.2z",
      "M12 9.8v4.4",
      "M12 17.1h.02"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Procesos",
      "Consultas",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "adm_notificacion",
        "label": "Notificación administrativa",
        "ranura": "adm-notificacion",
        "bloque": "Procesos",
        "title": "Notificación administrativa",
        "resumen": "Registro previo de la notificación emitida en la vivienda o el negocio inspeccionado. Es el paso anterior a la generación de la multa administrativa."
      },
      {
        "id": "infracciones_adm",
        "label": "Infracción administrativa",
        "ranura": "infracciones-adm",
        "bloque": "Registro y mantenimiento",
        "title": "Infracción administrativa",
        "resumen": "Procedimiento sancionador municipal: notificación preventiva, acta de constatación y resolución de infracción y sanción con multa y medida complementaria."
      },
      {
        "id": "codigos_cuis",
        "label": "Cuadro CUIS",
        "ranura": "codigos-cuis",
        "bloque": "Registro y mantenimiento",
        "title": "Cuadro único de infracciones y sanciones (CUIS)",
        "resumen": "Catálogo aprobado por ordenanza con el porcentaje de UIT y la medida complementaria de cada infracción administrativa."
      },
      {
        "id": "adm_codigos_reporte",
        "label": "Reporte de códigos",
        "ranura": "adm-codigos-reporte",
        "bloque": "Documentos y reportes",
        "title": "Reporte de códigos de infracción administrativa",
        "resumen": "Relación impresa del cuadro único de infracciones y sanciones vigente, con la base de cálculo y la sanción no pecuniaria de cada código."
      },
      {
        "id": "adm_valores",
        "label": "Generación de valores",
        "ranura": "adm-valores",
        "bloque": "Procesos",
        "title": "Generación de valores administrativa",
        "resumen": "Selecciona un conjunto de papeletas administrativas con deuda según un criterio y genera masivamente un valor por papeleta para su impresión y notificación posterior."
      },
      {
        "id": "adm_estado_cuenta",
        "label": "Estado de cuenta de papeleta",
        "ranura": "adm-estado-cuenta",
        "bloque": "Consultas",
        "title": "Estado de cuenta de papeleta administrativa",
        "resumen": "Deuda de una papeleta administrativa con su insoluto, reajuste, interés y gastos, y el importe con beneficio vigente."
      },
      {
        "id": "adm_resolucion_gerencia",
        "label": "Resolución de gerencia",
        "ranura": "adm-resolucion-gerencia",
        "bloque": "Documentos y reportes",
        "title": "Resolución de gerencia",
        "resumen": "Resolución que resuelve el procedimiento sancionador y determina la multa administrativa exigible."
      },
      {
        "id": "adm_notificacion_resolucion",
        "label": "Notificación de resolución",
        "ranura": "adm-notificacion-resolucion",
        "bloque": "Documentos y reportes",
        "title": "Notificación de resolución de gerencia",
        "resumen": "Cédula de notificación de la resolución de gerencia, con el acuse de recibo y los datos del notificador y testigos."
      },
      {
        "id": "adm_reportes",
        "label": "Reportes administrativos",
        "ranura": "adm-reportes",
        "bloque": "Documentos y reportes",
        "title": "Reportes de infracción administrativa",
        "resumen": "Emisor de los reportes del módulo de papeletas administrativas. El tipo de reporte habilita los criterios y el destino puede ser pantalla, impresora o Excel."
      },
      {
        "id": "adm_padron_notificaciones",
        "label": "Padrón de notificaciones",
        "ranura": "adm-padron-notificaciones",
        "bloque": "Documentos y reportes",
        "title": "Padrón de notificaciones",
        "resumen": "Relación de las notificaciones emitidas por el sistema y el estado de la deuda cuando ya existe papeleta."
      },
      {
        "id": "adm_notificaciones_vencidas",
        "label": "Notificaciones vencidas",
        "ranura": "adm-notificaciones-vencidas",
        "bloque": "Procesos",
        "title": "Notificaciones vencidas",
        "resumen": "Notificaciones cuyo plazo de subsanación venció sin acreditarse el cumplimiento; habilitan la generación de la papeleta administrativa."
      },
      {
        "id": "adm_notificaciones_contribuyente",
        "label": "Notificaciones por contribuyente",
        "ranura": "adm-notificaciones-contribuyente",
        "bloque": "Procesos",
        "title": "Notificaciones por contribuyente",
        "resumen": "Papeletas administrativas agrupadas por año y mes de cometida la infracción, con el estado de la multa y los datos de su pago."
      },
      {
        "id": "adm_resumen_recaudacion",
        "label": "Resumen de recaudación",
        "ranura": "adm-resumen-recaudacion",
        "bloque": "Documentos y reportes",
        "title": "Resumen de recaudación de papeletas",
        "resumen": "Recaudación por multas administrativas por año y mes, diferenciando cobranza ordinaria, coactiva y por convenio."
      }
    ]
  },
  {
    "id": "tesoreria",
    "label": "Tesorería",
    "icono": [
      "M3.2 7.4h17.6v9.2H3.2z",
      "M13.6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0",
      "M6.6 10.6v2.8",
      "M17.4 10.6v2.8"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Procesos",
      "Consultas"
    ],
    "opciones": [
      {
        "id": "caja_tributaria",
        "label": "Caja tributaria",
        "ranura": "caja-tributaria",
        "bloque": "Registro y mantenimiento",
        "title": "Caja tributaria",
        "resumen": "Cobranza en ventanilla. Se elige la forma de pago, se filtra la deuda del contribuyente, se aplica el beneficio vigente y se emite el recibo."
      },
      {
        "id": "caja_tasas",
        "label": "Caja de tasas",
        "ranura": "caja-tasas",
        "bloque": "Registro y mantenimiento",
        "title": "Caja de tasas y derechos administrativos",
        "resumen": "Cobro de conceptos del TUPA que no forman parte de la cuenta corriente: constancias, copias, certificados y derechos de trámite."
      },
      {
        "id": "fraccionamiento",
        "label": "Fraccionamiento",
        "ranura": "fraccionamiento",
        "bloque": "Procesos",
        "title": "Fraccionamiento tributario",
        "resumen": "Acogimiento de la deuda a pago fraccionado. El sistema simula el cronograma antes de generar el convenio; dos cuotas consecutivas impagas producen la pérdida del beneficio."
      },
      {
        "id": "consulta_convenios",
        "label": "Convenios",
        "ranura": "consulta-convenios",
        "bloque": "Consultas",
        "title": "Consulta de convenios",
        "resumen": "Seguimiento de los convenios suscritos, con las cuotas pagadas, las vencidas y los que están por quebrarse."
      },
      {
        "id": "duplicado_recibo",
        "label": "Duplicado de recibo",
        "ranura": "duplicado-recibo",
        "bloque": "Procesos",
        "title": "Duplicado de recibo",
        "resumen": "Reimpresión de un recibo ya emitido. El duplicado sale marcado como tal y queda registrado en la bitácora con el usuario que lo generó."
      },
      {
        "id": "anulacion_recibo",
        "label": "Anulación de recibo",
        "ranura": "anulacion-recibo",
        "bloque": "Procesos",
        "title": "Anulación de recibo",
        "resumen": "Deja sin efecto un recibo y devuelve la deuda a la cuenta corriente. Requiere autorización del responsable de tesorería y solo procede mientras la caja del turno siga abierta."
      },
      {
        "id": "anulacion_convenio",
        "label": "Anulación de convenio",
        "ranura": "anulacion-convenio",
        "bloque": "Procesos",
        "title": "Anulación de convenio",
        "resumen": "Anula, reforma o quiebra un convenio de fraccionamiento. La deuda acogida retorna a su estado original y el sistema conserva el motivo y el responsable de la anulación."
      },
      {
        "id": "cierre_caja",
        "label": "Cierre de caja",
        "ranura": "cierre-caja",
        "bloque": "Registro y mantenimiento",
        "title": "Cierre y arqueo de caja",
        "resumen": "Arqueo del turno: recaudación por medio de pago, recibos emitidos y anulados, y diferencia entre lo declarado y lo registrado por el sistema."
      },
      {
        "id": "avance_recaudacion",
        "label": "Avance de recaudación",
        "ranura": "avance-recaudacion",
        "bloque": "Registro y mantenimiento",
        "title": "Avance de recaudación",
        "resumen": "Comparación de lo emitido contra lo recaudado por tributo y periodo, base del seguimiento de la meta anual."
      },
      {
        "id": "recaudacion_area",
        "label": "Recaudación por área",
        "ranura": "recaudacion-area",
        "bloque": "Registro y mantenimiento",
        "title": "Recaudación por área",
        "resumen": "Recaudación desagregada por partida presupuestal y unidad orgánica generadora, para el reporte mensual a la gerencia de administración."
      }
    ]
  },
  {
    "id": "consultas",
    "label": "Consultas",
    "icono": [
      "M17.4 11a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0",
      "M15.8 15.8 20.6 20.6"
    ],
    "bloques": [
      "Consultas",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "cuenta_corriente",
        "label": "Cuenta corriente",
        "ranura": "cuenta-corriente",
        "bloque": "Consultas",
        "title": "Estado de cuenta corriente",
        "resumen": "Deuda y pagos del contribuyente por ejercicio y tributo, con la fase en la que se encuentra cada obligación."
      },
      {
        "id": "consulta_deuda",
        "label": "Deuda",
        "ranura": "consulta-deuda",
        "bloque": "Consultas",
        "title": "Consulta de deuda",
        "resumen": "Deuda exigible a una fecha de corte, con el interés moratorio calculado al día y el desglose por fase de cobranza."
      },
      {
        "id": "consulta_unificada",
        "label": "Unificada predial-arbitrios",
        "ranura": "consulta-unificada",
        "bloque": "Consultas",
        "title": "Consulta unificada predial-arbitrios",
        "resumen": "Vista única del contribuyente: impuesto anual por ejercicio, impuesto por predio y, en pestañas, deudas, pagos, altas y bajas, movimientos del predio, fraccionamientos y valores emitidos."
      },
      {
        "id": "consulta_resumen_predial",
        "label": "Resumen predial-arbitrios",
        "ranura": "consulta-resumen-predial",
        "bloque": "Documentos y reportes",
        "title": "Consulta resumen predial-arbitrios",
        "resumen": "Resumen por predio: impuesto predial de cada ejercicio con su valúo afecto y el saldo de deuda, más el valúo de arbitrios y los movimientos del predio."
      },
      {
        "id": "consulta_altas_bajas",
        "label": "Altas y bajas",
        "ranura": "consulta-altas-bajas",
        "bloque": "Consultas",
        "title": "Consulta de altas y bajas",
        "resumen": "Movimientos de alta y baja de deuda de un contribuyente, automáticos o manuales, con el documento que los aprueba y el detalle de las deudas afectadas."
      },
      {
        "id": "consulta_deudas_beneficio",
        "label": "Deudas con beneficio",
        "ranura": "consulta-deudas-beneficio",
        "bloque": "Consultas",
        "title": "Consulta de deudas con beneficio",
        "resumen": "Simula el acogimiento de la deuda a un beneficio vigente: muestra la deuda total, la deuda acogida y la deuda con beneficio, con la tasa aplicada y el ahorro resultante."
      },
      {
        "id": "consulta_pagos",
        "label": "Pagos",
        "ranura": "consulta-pagos",
        "bloque": "Consultas",
        "title": "Consulta de pagos",
        "resumen": "Historial de pagos con el recibo, la caja y el concepto imputado."
      },
      {
        "id": "consulta_predios",
        "label": "Predios",
        "ranura": "consulta-predios",
        "bloque": "Consultas",
        "title": "Consulta de predios",
        "resumen": "Búsqueda de predios por titular, ubicación o código, con el autovalúo vigente y la deuda asociada a cada unidad."
      },
      {
        "id": "consulta_vehiculos",
        "label": "Vehículos",
        "ranura": "consulta-vehiculos",
        "bloque": "Consultas",
        "title": "Consulta de vehículos",
        "resumen": "Padrón vehicular consultable por placa, motor o titular, con los ejercicios afectos y la deuda vigente."
      },
      {
        "id": "consulta_valores",
        "label": "Valores",
        "ranura": "consulta-valores",
        "bloque": "Consultas",
        "title": "Consulta de valores emitidos",
        "resumen": "Órdenes de pago, resoluciones de determinación y de multa emitidas a un contribuyente, con su estado de notificación y firmeza."
      },
      {
        "id": "constancia",
        "label": "Constancia de no adeudo",
        "ranura": "constancia",
        "bloque": "Documentos y reportes",
        "title": "Constancia de no adeudo",
        "resumen": "Vista previa del documento que se entrega al contribuyente. Se imprime con el mismo formato en papel membretado."
      }
    ]
  },
  {
    "id": "valores",
    "label": "Valores",
    "icono": [
      "M6.5 3.5h7.5l4 4v13h-11.5z",
      "M14 3.5v4h4",
      "M9.5 11.5h5",
      "M15.6 16.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0"
    ],
    "bloques": [
      "Emisión",
      "Gestión del valor"
    ],
    "opciones": [
      {
        "id": "valores_individual",
        "label": "Valor individual",
        "ranura": "valores-individual",
        "bloque": "Emisión",
        "title": "Generación individual de valores",
        "resumen": "Emisión de una orden de pago, resolución de determinación o resolución de multa para un contribuyente, con la base legal que la sustenta."
      },
      {
        "id": "valores_masivo",
        "label": "Valores masivos",
        "ranura": "valores-masivo",
        "bloque": "Emisión",
        "title": "Generación masiva de valores",
        "resumen": "Emite órdenes de pago en bloque para toda la deuda vencida que cumpla el filtro, respetando el monto mínimo de emisión fijado por ordenanza."
      },
      {
        "id": "valores_busqueda",
        "label": "Mantenimiento de valores",
        "ranura": "valores-busqueda",
        "bloque": "Gestión del valor",
        "title": "Búsqueda y mantenimiento de valores",
        "resumen": "Localiza un valor por número, contribuyente o periodo para consultarlo, anularlo o derivarlo a cobranza coactiva."
      },
      {
        "id": "notificacion_valores",
        "label": "Notificación",
        "ranura": "notificacion-valores",
        "bloque": "Gestión del valor",
        "title": "Notificación de valores",
        "resumen": "Registro del acto de notificación. La fecha de notificación determina el inicio del plazo de reclamación y, vencido este, la firmeza del valor."
      },
      {
        "id": "prescripcion",
        "label": "Prescripción",
        "ranura": "prescripcion",
        "bloque": "Gestión del valor",
        "title": "Prescripción de la deuda",
        "resumen": "Solicitud de prescripción de la acción de cobro, con el cómputo del plazo y los actos que lo interrumpen o suspenden."
      },
      {
        "id": "pase_coactiva",
        "label": "Pase de valores a coactiva",
        "ranura": "pase-coactiva",
        "bloque": "Gestión del valor",
        "title": "Pase de valores a coactiva",
        "resumen": "Registra el movimiento del valor hacia el área de cobranza coactiva: PCO — pase a coactivas, ACO — aceptado en coactivas o RCO — rechazado en coactivas."
      }
    ]
  },
  {
    "id": "coactiva",
    "label": "Coactiva",
    "icono": [
      "M12 4.4v3.2",
      "M5 8.6h14",
      "M5 8.6 2.8 14.4h4.4z",
      "M19 8.6 16.8 14.4h4.4z",
      "M8.4 20h7.2"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Procesos",
      "Consultas",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "coactiva_expedientes",
        "label": "Expedientes coactivos",
        "ranura": "coactiva-expedientes",
        "bloque": "Registro y mantenimiento",
        "title": "Expedientes coactivos",
        "resumen": "Cobranza coactiva de valores firmes: resolución de ejecución, medidas cautelares, costas y gastos, y causales de suspensión."
      },
      {
        "id": "importacion_valores",
        "label": "Importación de valores",
        "ranura": "importacion-valores",
        "bloque": "Procesos",
        "title": "Importación de valores a coactiva",
        "resumen": "Ingresa a coactiva un valor ya generado en el módulo de valores y le asigna número de expediente coactivo, auxiliar y ejecutor para su tratamiento posterior."
      },
      {
        "id": "proceso_coactivo",
        "label": "Proceso coactivo",
        "ranura": "proceso-coactivo",
        "bloque": "Procesos",
        "title": "Proceso coactivo",
        "resumen": "Seguimiento del expediente coactivo: datos generales, actuaciones del proceso y detalle de los valores que lo integran, con la deuda proyectada a la fecha."
      },
      {
        "id": "rec_impresion",
        "label": "Impresión de REC",
        "ranura": "rec-impresion",
        "bloque": "Documentos y reportes",
        "title": "Impresión de resolución de ejecución coactiva",
        "resumen": "Genera e imprime la REC de los expedientes pendientes de pago, con la deuda proyectada al día elegido. Permite imprimir la carátula y la REC 2."
      },
      {
        "id": "expediente_historial",
        "label": "Historial del expediente",
        "ranura": "expediente-historial",
        "bloque": "Registro y mantenimiento",
        "title": "Gestionar historial del expediente",
        "resumen": "Cambia el estado del expediente coactivo y conserva el historial de estados con su documento de respaldo, motivo y observaciones."
      },
      {
        "id": "cambiar_direccion_ref",
        "label": "Cambiar dirección referencial",
        "ranura": "cambiar-direccion-ref",
        "bloque": "Procesos",
        "title": "Cambiar dirección referencial",
        "resumen": "Reemplaza la dirección referencial del expediente coactivo, que es la que se usa para notificar al obligado cuando difiere del domicilio fiscal."
      },
      {
        "id": "costas_procesales",
        "label": "Liquidación de costas",
        "ranura": "costas-procesales",
        "bloque": "Procesos",
        "title": "Liquidación de costas procesales",
        "resumen": "Liquida las costas y gastos del procedimiento coactivo por expediente, según el arancel de costas aprobado."
      },
      {
        "id": "fraccionamiento_coactivo",
        "label": "Fraccionamiento coactivo",
        "ranura": "fraccionamiento-coactivo",
        "bloque": "Procesos",
        "title": "Fraccionamiento coactivo",
        "resumen": "Convenio tributario coactivo. Se inicia con un pago inicial y sobre el saldo se elabora el cronograma de cuotas, con el beneficio aplicable a la deuda acogida."
      },
      {
        "id": "actos_coactivos",
        "label": "Actos coactivos",
        "ranura": "actos-coactivos",
        "bloque": "Procesos",
        "title": "Registro de actos coactivos",
        "resumen": "Registra y emite los documentos de las medidas coactivas adoptadas: embargos, retenciones y demás actos, con su archivo digital adjunto."
      },
      {
        "id": "notificaciones_coactivas",
        "label": "Notificaciones coactivas",
        "ranura": "notificaciones-coactivas",
        "bloque": "Procesos",
        "title": "Emisión de notificaciones coactivas",
        "resumen": "Registra y emite las notificaciones de las resoluciones de ejecución coactiva. Admite una o varias notificaciones por expediente según el tratamiento del caso."
      },
      {
        "id": "coactiva_consulta_deudas",
        "label": "Consulta de deudas",
        "ranura": "coactiva-consulta-deudas",
        "bloque": "Consultas",
        "title": "Consulta de deudas en coactiva",
        "resumen": "Deuda en cobranza coactiva por contribuyente y expediente, con su estado procesal y la última actuación registrada."
      },
      {
        "id": "coactiva_deudas_beneficio",
        "label": "Deudas en beneficio",
        "ranura": "coactiva-deudas-beneficio",
        "bloque": "Consultas",
        "title": "Consulta de deudas en beneficio (coactiva)",
        "resumen": "Deuda en cobranza coactiva acogible a un beneficio vigente, con las costas procesales incorporadas al cálculo."
      }
    ]
  },
  {
    "id": "autorizaciones-y-licencias",
    "label": "Autorizaciones y licencias",
    "icono": [
      "M4.4 9.6V20h15.2V9.6",
      "M3.2 9.6 5.2 4.6h13.6l2 5z",
      "M9.6 20v-5.4h4.8V20"
    ],
    "bloques": [
      "Registro y mantenimiento",
      "Documentos y reportes"
    ],
    "opciones": [
      {
        "id": "anuncios",
        "label": "Anuncio y propaganda",
        "ranura": "anuncios",
        "bloque": "Registro y mantenimiento",
        "title": "Anuncio y propaganda",
        "resumen": "Autorización para instalar elementos publicitarios. La tasa resulta del área del anuncio, el número de lados y su clase."
      },
      {
        "id": "anuncios_reportes",
        "label": "Reportes de anuncios",
        "ranura": "anuncios-reportes",
        "bloque": "Documentos y reportes",
        "title": "Reportes de anuncio y propaganda",
        "resumen": "Emite el padrón de autorizaciones de anuncio y propaganda por contribuyente, dirección, estado o intervalo de fechas."
      },
      {
        "id": "licencia_funcionamiento",
        "label": "Licencia de funcionamiento",
        "ranura": "licencia-funcionamiento",
        "bloque": "Registro y mantenimiento",
        "title": "Licencia de funcionamiento",
        "resumen": "Registro y seguimiento de licencias comerciales, con giros CIIU, zonificación, aforo, inspección técnica de seguridad y arbitrios del establecimiento."
      },
      {
        "id": "licencia_padron",
        "label": "Padrón de licencias",
        "ranura": "licencia-padron",
        "bloque": "Documentos y reportes",
        "title": "Padrón de licencias de funcionamiento",
        "resumen": "Padrón de licencias municipales con agrupación por año y subagrupación por giro, dirección o contribuyente. El orden y los filtros se definen antes de emitir."
      },
      {
        "id": "licencia_resumen_anual",
        "label": "Resumen de licencias por año",
        "ranura": "licencia-resumen-anual",
        "bloque": "Documentos y reportes",
        "title": "Resumen de licencias por año",
        "resumen": "Cantidades de licencias emitidas, canceladas y duplicadas por año, con la recaudación por derecho de trámite."
      },
      {
        "id": "licencia_resolucion_cancelacion",
        "label": "Res. de cancelación",
        "ranura": "licencia-resolucion-cancelacion",
        "bloque": "Documentos y reportes",
        "title": "Resolución de cancelación de licencia",
        "resumen": "Resolución que deja sin efecto la licencia de funcionamiento, por solicitud del titular o por cierre del establecimiento."
      },
      {
        "id": "licencia_resolucion_duplicado",
        "label": "Res. de duplicado",
        "ranura": "licencia-resolucion-duplicado",
        "bloque": "Documentos y reportes",
        "title": "Resolución de duplicado de licencia",
        "resumen": "Resolución que autoriza la emisión de un duplicado de la licencia de funcionamiento, con el número de duplicado que corresponde."
      },
      {
        "id": "fue_edificacion",
        "label": "FUE — edificación",
        "ranura": "fue-edificacion",
        "bloque": "Registro y mantenimiento",
        "title": "Formulario único de edificación (FUE)",
        "resumen": "Licencia de obra bajo la Ley 29090. La modalidad de aprobación determina si basta la verificación administrativa o se requiere comisión técnica."
      },
      {
        "id": "edificacion_reporte",
        "label": "Reporte de licencias de edificación",
        "ranura": "edificacion-reporte",
        "bloque": "Documentos y reportes",
        "title": "Reporte general de licencias de edificación",
        "resumen": "Relación de licencias de edificación por modalidad, con el área a construir, el valor de obra declarado y el estado del expediente."
      },
      {
        "id": "ciiu",
        "label": "Catálogo CIIU",
        "ranura": "ciiu",
        "bloque": "Registro y mantenimiento",
        "title": "Catálogo CIIU de giros",
        "resumen": "Clasificación industrial internacional uniforme. Determina la compatibilidad del giro con la zonificación y el nivel de riesgo de la ITSE."
      },
      {
        "id": "certificados",
        "label": "Certificados",
        "ranura": "certificados",
        "bloque": "Documentos y reportes",
        "title": "Certificados de numeración y zonificación",
        "resumen": "Emisión de los certificados que acreditan el número municipal asignado y los parámetros urbanísticos del predio."
      }
    ]
  },
  {
    "id": "seguridad",
    "label": "Seguridad",
    "icono": [
      "M12 3.4 19 5.9v5.6c0 4.1-3 7.2-7 9.1-4-1.9-7-5-7-9.1V5.9z",
      "M9.4 12.1l1.9 1.9 3.5-3.6"
    ],
    "bloques": [
      "Cuentas y accesos",
      "Catálogo",
      "Sesión",
      "Operación"
    ],
    "opciones": [
      {
        "id": "modulos",
        "label": "Módulos",
        "ranura": "modulos",
        "bloque": "Catálogo",
        "title": "Módulos del sistema",
        "resumen": "Sistemas controlados por el módulo de seguridad integrada. Cada módulo agrupa sus grupos, accesos y permisos."
      },
      {
        "id": "usuarios",
        "label": "Usuarios",
        "ranura": "usuarios",
        "bloque": "Cuentas y accesos",
        "title": "Usuarios del sistema",
        "resumen": "Alta de usuarios con su unidad orgánica, la caja asignada y el grupo de acceso que define qué opciones del menú puede ejecutar."
      },
      {
        "id": "grupos",
        "label": "Grupos",
        "ranura": "grupos",
        "bloque": "Cuentas y accesos",
        "title": "Grupos de usuarios",
        "resumen": "Agrupación jerárquica de cuentas. El grupo concentra los accesos y todo usuario hereda los permisos del grupo al que pertenece."
      },
      {
        "id": "accesos",
        "label": "Accesos y políticas",
        "ranura": "accesos",
        "bloque": "Cuentas y accesos",
        "title": "Accesos y políticas",
        "resumen": "Opciones de menú y políticas del sistema controlado. La búsqueda admite filtrar por tipo y por parte del nombre del acceso."
      },
      {
        "id": "miembros",
        "label": "Miembros",
        "ranura": "miembros",
        "bloque": "Cuentas y accesos",
        "title": "Gestión de miembros",
        "resumen": "Afiliación de usuarios a uno o varios grupos, base de la posterior asignación de permisos a nivel de grupo. El árbol de la izquierda lista los grupos del módulo y sus usuarios."
      },
      {
        "id": "permisos",
        "label": "Permisos",
        "ranura": "permisos",
        "bloque": "Cuentas y accesos",
        "title": "Permisos y niveles de accesibilidad",
        "resumen": "Matriz de acceso por opción del menú. Cada acceso se otorga con siete niveles: total, ejecuta, consulta, ingresa, modifica, anula e imprime."
      },
      {
        "id": "cambiar_anio",
        "label": "Cambiar el año",
        "ranura": "cambiar-anio",
        "bloque": "Sesión",
        "title": "Cambiar el año de trabajo",
        "resumen": "Fija el ejercicio sobre el que operan todas las opciones del sistema. Los registros se graban contra el año seleccionado."
      },
      {
        "id": "cambiar_clave",
        "label": "Cambiar contraseña",
        "ranura": "cambiar-clave",
        "bloque": "Sesión",
        "title": "Cambiar contraseña",
        "resumen": "Cambio de la clave del usuario en sesión. La contraseña caduca cada 90 días y no puede repetir las tres últimas."
      },
      {
        "id": "auditoria",
        "label": "Auditoría",
        "ranura": "auditoria",
        "bloque": "Operación",
        "title": "Auditoría del sistema",
        "resumen": "Bitácora de operaciones sensibles: anulaciones, extornos, bajas de deuda, cambios de valor y accesos fallidos."
      },
      {
        "id": "parametros",
        "label": "Parámetros",
        "ranura": "parametros",
        "bloque": "Catálogo",
        "title": "Parámetros del sistema",
        "resumen": "Valores que gobiernan el cálculo tributario del ejercicio. Cambiarlos afecta a todas las liquidaciones posteriores."
      },
      {
        "id": "respaldo",
        "label": "Copias de seguridad",
        "ranura": "respaldo",
        "bloque": "Operación",
        "title": "Copias de seguridad",
        "resumen": "Respaldo de la base de datos. El manual exige una copia diaria al cierre de caja y una copia mensual fuera del servidor."
      }
    ]
  }
];
