# REQ-02 — Requisitos no funcionales

Los que el manual promete explícitamente llevan la marca **(manual)**: son compromisos del
sistema actual que la reimplementación no puede perder.

## Aislamiento y seguridad de datos

| # | Requisito | Verificación |
|---|---|---|
| RNF-030 | Ninguna operación puede leer ni escribir datos de una municipalidad distinta de la del token | `verificarAislamiento`, bloqueante |
| RNF-031 | **Toda** tabla lleva RLS activa y forzada. Lo que varía es la política, no su existencia | Prueba de aislamiento, cobertura estructural |
| RNF-032 | Una consulta **sin contexto de municipalidad falla**; no devuelve vacío ni devuelve todo | Prueba de aislamiento; `ContextoDeTenant.ESTADOS_SIN_CONTEXTO` |
| RNF-033 | El identificador de municipalidad sale **exclusivamente** del token validado | Prueba del filtro con encabezado y parámetro hostiles |
| RNF-034 | Ninguna conexión vuelve al pool con el contexto fijado | `TenantConnectionGuard`, con prueba gemela sin guardia |
| RNF-035 | El rol de aplicación no es superusuario, no tiene `BYPASSRLS` y no es propietario de ninguna tabla | Prueba de aislamiento, configuración de roles |

## Integridad y trazabilidad

| # | Requisito | Verificación |
|---|---|---|
| RNF-050 | **(manual)** Un proceso se registra en su totalidad o no se registra. Si falla un paso, se deshacen todos | Pruebas de integración por caso de uso |
| RNF-051 | No se borra deuda, pagos, recibos, valores, papeletas, asientos ni auditoría. Se anula, se da de baja o se reversa | Privilegios: la aplicación no tiene `DELETE`; escáner de fuentes |
| RNF-052 | **(manual)** Cada modificación registra usuario, nombre de máquina, IP, fecha, hora y **observación obligatoria**; sin observación no se guarda | Restricción `NOT NULL` en auditoría + prueba |
| RNF-053 | **(manual)** Se conserva el registro original antes de cada modificación | Tablas históricas y fichas versionadas |
| RNF-054 | Recalcular un ejercicio pasado con su conjunto de parámetros sellado da el mismo resultado | Pruebas de reglas con parámetros congelados |
| RNF-055 | Los importes se representan en decimal exacto. `double` y `float` prohibidos | ArchUnit |
| RNF-056 | El libro de cuenta corriente no admite `UPDATE` desde la aplicación | Privilegios + prueba de aislamiento |

## Disponibilidad y rendimiento

| # | Requisito | Objetivo |
|---|---|---|
| RNF-060 | Consulta de deuda de un contribuyente | < 1 s en el percentil 95 |
| RNF-061 | Cobro en caja, de la selección al recibo | < 2 s en el percentil 95 |
| RNF-062 | **(manual)** Estadísticas «en tiempo real», que se actualizan a medida que varía la información | El avance de recaudación no depende de un proceso nocturno |
| RNF-063 | Emisión masiva de un padrón de 100 000 predios | Ventana nocturna, reanudable, con avance consultable |
| RNF-064 | Todo índice selectivo empieza por `municipalidad_id`, porque la política RLS añade esa condición a cada consulta | Revisión del DDL |
| RNF-065 | **(manual)** El sistema maneja volúmenes del orden de terabytes | Particionado por ejercicio en las tablas de movimiento |

## Operación

| # | Requisito | Objetivo |
|---|---|---|
| RNF-070 | **(manual)** Copias de seguridad programadas, comprimidas y en dispositivo distinto del servidor | Responsabilidad de la plataforma; el sistema expone su estado |
| RNF-071 | Recuperación ante caída sin pérdida de transacciones confirmadas | Archivado continuo de WAL |
| RNF-072 | **(manual)** Registro de sesiones: quién está conectado y desde cuándo | Tabla de sesiones |
| RNF-073 | Toda migración de esquema es reversible o aditiva; ninguna borra datos sin respaldo verificado | Revisión de migraciones |
| RNF-075 | Toda cifra de deuda mostrada indica **a qué fecha** está actualizada | Revisión de la API y de la interfaz |

## Interfaz y accesibilidad

| # | Requisito | Objetivo |
|---|---|---|
| RNF-080 | **(manual)** Pantallas, reportes, mensajes y ayudas en castellano | — |
| RNF-081 | **(manual)** Todo reporte se puede guardar en `.xls` y `.rtf` | — |
| RNF-082 | Operación de caja completa con teclado, sin ratón | Pruebas de interacción |
| RNF-083 | La interfaz no hace aritmética con importes: los totales llegan calculados del servidor | Revisión de código del frontend |
| RNF-084 | Los reportes se imprimen en A4 vertical, una hoja por reporte | Estilos de impresión |

## Cumplimiento

| # | Requisito | Objetivo |
|---|---|---|
| RNF-090 | Datos personales tratados conforme a la Ley 29733 y su reglamento | Documento propio, pendiente |
| RNF-091 | Ningún dato normativo vive en el código: todos en datos versionados con documento fuente | Escáner de fuentes; revisión |
| RNF-092 | Un parámetro tributario lo carga un usuario y lo aprueba otro | Restricción `CHECK` en `parametro_tributario` |
