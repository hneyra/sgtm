# FRO-03 — Mapa de pantallas

**Fuente:** el prototipo `design/SGTM.dc.html` y el catálogo `design/sgtm-data-{1..5}.js`
**Catálogo de opciones:** [NEG-03](../10-negocio/catalogo-de-opciones.md)
**Estado:** ninguna pantalla implementada; este documento es el plan

## 1. Doce módulos, 134 opciones

Son las del manual, con sus nombres. Ninguna se inventa y ninguna se omite.

| Módulo | Opciones |
|---|---|
| Inicio | 2 |
| Catastro | 12 |
| Rentas · Registro | 15 |
| Fiscalización | 8 |
| Tránsito | 23 |
| Infracciones administrativas | 13 |
| Tesorería | 10 |
| Consultas | 11 |
| Valores | 6 |
| Coactiva | 12 |
| Autorizaciones y licencias | 11 |
| Seguridad | 11 |
| **Total** | **134** |

Los módulos visibles dependen del rol ([REQ-03](../20-requisitos/actores-y-permisos.md)). Ocultar
lo que no se puede usar reduce el error y la superficie de exploración; un cajero no debería ver
Coactiva.

## 2. El catálogo se porta, no se escribe

**No se escriben 134 pantallas a mano.** El prototipo declara cada una como un descriptor de datos
y un solo renderizador las compone. La iteración de interfaz porta ese catálogo a módulos de datos
tipados —unos 305 KB de JavaScript declarativo— y escribe **un** renderizador.

```ts
type Pantalla = {
  mod: string;             // eyebrow de la cabecera
  title: string;           // título de la pantalla
  endpoint?: string;       // operación del contrato, p. ej. "GET /api/v1/predios"
  desc?: string;           // párrafo serif introductorio
  kind?: 'dash' | 'portal' | 'report';
  kpis?: { value: string; label: string; note: string }[];
  panels?: { title: string; note: string; rows: FilaDePanel[] }[];
  steps?: string[];
  tabs?: { label: string; sections: Seccion[] }[];
  sections?: Seccion[];
  filters?: Campo[];
  table?: Tabla;
  totals?: { label: string; value: string; strong?: boolean }[];
  actions?: string[];      // la última es la primaria
  report?: Reporte;
};

type Seccion = { label: string; hint?: string; fields: Campo[] };
type Campo = {
  label: string;
  t: 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';
  v?: string; ph?: string; opts?: string[]; wide?: 0 | 1; on?: boolean;
};
type Celda = string | [string, 'ok' | 'warn' | 'bad'];   // la tupla es una insignia
```

Dos decisiones al portarlo:

1. **Precalcular la clasificación en bloques** (§4) como un campo `group` del descriptor, en lugar
   de correr expresiones regulares en tiempo de ejecución.
2. **Los textos son definitivos.** Etiquetas de campo, títulos y nombres de opción vienen del
   manual y no se reescriben (RNF-080).

## 3. Navegación de dos niveles

**Nivel raíz** — bloque «Recientes» (hasta 5, persistido en `localStorage`; el token **no**, ver
FRO-01 §5) y los doce módulos, cada uno con su icono, su nombre y «N opciones».

**Nivel módulo** — vuelta a «Todos los módulos», nombre del módulo y sus opciones agrupadas en
cuatro bloques colapsables.

**Hub de módulo** — al abrir un módulo, ruta `/:modulo`: tarjeta de encabezado y una rejilla de
bloques con las opciones y su descripción recortada.

**Paleta de comandos** — `Ctrl/Cmd + K`. Busca por etiqueta, título y módulo sobre las 134
opciones. Con 134 opciones en doce módulos, es el camino corto que un menú de dos niveles no da.

## 4. Los cuatro bloques

Cada opción cae en un bloque según su título, evaluado **en este orden**:

| # | Bloque | Coincide con |
|---|---|---|
| 1 | Documentos y reportes | `kind: 'report'` o `/reporte\|padrón\|resumen\|record\|constancia\|resolución\|certificado/i` |
| 2 | Consultas | `/consulta\|búsqueda\|estado de cuenta\|histórico\|auditoría\|panel\|portal/i` |
| 3 | Procesos | `/cálculo\|generación\|proceso\|transferencia\|emisión\|notificación\|anulación\|alta de\|baja de\|cambio\|fraccionamiento\|liquidación\|declaración\|prescripción/i` (lista completa en el handoff) |
| 4 | Registro y mantenimiento | El resto |

## 5. Las diez plantillas de contenido

Un renderizador compone, en este orden, los bloques que declare el descriptor:

| # | Bloque | Se activa con |
|---|---|---|
| 1 | Descripción | `desc` |
| 2 | Panel de indicadores | `kind: 'dash'` — KPIs y paneles con barras |
| 3 | Portal ciudadano | `kind: 'portal'` — hero, consulta y pasos numerados |
| 4 | Filtros | `filters` |
| 5 | Tabla | `table` |
| 6 | Totales | `totals` |
| 7 | Pestañas | `tabs` |
| 8 | Formulario | `sections` |
| 9 | Reporte | `kind: 'report'` — hoja A4 con firmas |
| 10 | Barra de acciones | `actions`, fija al fondo |

Las medidas exactas de cada una están en `design/SGTM.dc.html`, que es la fuente de verdad; el
handoff las resume.

## 6. Las pantallas donde equivocarse cuesta más

Tres merecen validación con usuarios reales antes de darlas por buenas:

| Pantalla | Por qué |
|---|---|
| **Cobro en Tesorería** | Se opera con teclado y sin ratón (RNF-082). Es donde el sistema se usa a diario y donde un clic de más se paga cien veces al día |
| **Portal ciudadano** | Lo usa quien no conoce el sistema, una vez al año, desde un móvil con red mala |
| **Reportes** | Se imprimen en A4 y salen de la municipalidad con firma (RNF-084) |

Ninguna está validada. Es un pendiente declarado, no un olvido.

## 7. Orden sugerido de implementación

1. **Shell y navegación** — barra lateral de dos niveles, cabecera, paleta de comandos. Sin esto
   no hay dónde poner una pantalla.
2. **El catálogo portado y el renderizador** — las 134 pantallas aparecen a la vez, con los datos
   de muestra del prototipo.
3. **Las plantillas por orden de frecuencia** — formulario y tabla primero; reporte y portal
   después.
4. **Conexión al backend, opción por opción**, a medida que cada operación exista de verdad.

El paso 2 es el que decide el coste de todo lo demás: hecho como catálogo, las 134 pantallas
cuestan un renderizador; hechas a mano, cuestan 134 archivos que nadie mantiene.

## 8. Documentos relacionados

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`design-system.md`](design-system.md) (FRO-02) ·
[`../10-negocio/catalogo-de-opciones.md`](../10-negocio/catalogo-de-opciones.md) (NEG-03) ·
[`../50-api/openapi/sgtm-v1.yaml`](../50-api/openapi/sgtm-v1.yaml)
