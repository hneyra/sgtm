/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * La ESTRUCTURA de las 11 pantallas de Seguridad: que pestanas, que
 * secciones, que campos, que columnas.
 *
 * Se carga al entrar en el modulo, no antes. Los VALORES no estan aqui: los
 * sirve la API (packages/api-mock hoy, el backend manana).
 */

import type { EstructuraDePantalla } from '../tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = {
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
      "claves": [
        "codigo",
        "abreviatura",
        "nombreDelModulo",
        "estado"
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
      ],
      "claves": [
        "usuario",
        "nombre",
        "unidadOrganica",
        "grupo",
        "caja",
        "ultimoAcceso",
        "estado"
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
      "claves": [
        "grupo",
        "descripcion",
        "usuarios",
        "accesosAsignados",
        "estado"
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
      "claves": [
        "codigo",
        "tipo",
        "nombreDelAcceso",
        "modulo",
        "nivel",
        "estado"
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
      "claves": [
        "usuario",
        "grupo",
        "fecAlta",
        "fecBaja",
        "estado"
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
      "claves": [
        "usuario",
        "acceso",
        "total",
        "ejecuta",
        "consulta",
        "ingresa",
        "modifica",
        "anula",
        "imprime",
        "estado"
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
      ],
      "claves": [
        "fechaYHora",
        "usuario",
        "opcion",
        "accion",
        "registroAfectado",
        "terminalIp"
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
      "claves": [
        "fechaYHora",
        "tipo",
        "tamano",
        "destino",
        "ejecutadoPor",
        "estado"
      ],
      "note": "El respaldo del 10/08 falló por falta de espacio en el servidor de destino."
    },
    "acciones": [
      "Restaurar",
      "Ejecutar respaldo"
    ]
  }
};
