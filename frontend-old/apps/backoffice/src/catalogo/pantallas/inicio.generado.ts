/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 2 pantallas de Inicio: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

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
      "claves": [
        "campo",
        "concepto",
        "periodo",
        "vencimiento",
        "insolutoS",
        "interesS",
        "totalS"
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
  }
};
