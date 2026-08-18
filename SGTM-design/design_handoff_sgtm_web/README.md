# Handoff: SGTM — Interfaz web moderna

## Overview

Rediseño web del **SGTM (Sistema de Gestión Tributaria Municipal)**, sistema tributario municipal peruano documentado en un manual de usuario de 231 figuras. El prototipo cubre **12 módulos y 134 opciones (pantallas)** —todas las del manual— conservando la nomenclatura y la estructura de campos originales, pero con navegación jerárquica, búsqueda global y una capa visual editorial-institucional.

Entidad de ejemplo en las capturas: *Municipalidad Provincial de Sullana*. Usuario de ejemplo: *J. Cárdenas — Caja C-3*.

## About the Design Files

Los archivos en `design/` son **referencias de diseño creadas en HTML**: prototipos que muestran el aspecto y el comportamiento buscado, **no código de producción para copiar directamente**. La tarea es **recrear estos diseños en el entorno del repositorio destino** (React, Vue, Angular, etc.) usando sus patrones, librerías y convenciones. Si el repo no tiene aún entorno frontend, elige el framework más adecuado e impleméntalo ahí.

`design/SGTM.dc.html` es un componente con dos partes: la **plantilla** (markup con huecos `{{ }}`) y, al final del archivo, la **clase de lógica** (`class Component`) que calcula todos los valores. Los estilos están inline en la plantilla y con valores literales: úsalos como especificación exacta de medidas.

## Fidelity

**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, radios, sombras y estados están definidos con valores finales tomados del design system Juris PE. Reprodúcelos con precisión. Los textos en español son definitivos: no reescribas etiquetas de campos, títulos ni nombres de opciones (provienen del manual).

---

## Design Tokens

Copiados de `design/_ds/juris-pe-design-system-.../tokens/`. Úsalos como CSS variables con estos mismos nombres.

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f6f4ef` | fondo de página (papel crema cálido) |
| `--bg-elev` | `#fbfaf6` | sidebar, inputs, cabeceras de tabla, notas |
| `--bg-card` | `#ffffff` | tarjetas, hojas, paneles |
| `--ink` | `#1a1612` | texto primario |
| `--ink-2` | `#3d362e` | texto secundario, celdas de tabla |
| `--ink-3` | `#6b6258` | metadatos, etiquetas de campo |
| `--ink-4` | `#9a9085` | texto tenue, chevrons, placeholders |
| `--line` | `#e6e1d6` | hairline por defecto, divisores |
| `--line-2` | `#d8d2c4` | borde de inputs y controles |
| `--accent` | `#1F3A5F` | navy institucional (primario) |
| `--accent-2` | `#2a4d7a` | hover de botón primario |
| `--accent-soft` | `#e7ecf3` | relleno tenue (item activo, hover, chips) |
| `--accent-ink` | `#0e1f33` | texto navy sobre `--accent-soft` |
| `--ok-bg` / `--ok-fg` | `#e8efe6` / `#2d4a26` | badge estado correcto |
| `--bad-bg` / `--bad-fg` | `#f3e6e1` / `#7C2D12` | badge estado negativo |
| badge warn | `#f6ecd9` / `#8a6420` | badge advertencia (definido en el prototipo) |

Alternativas de acento seleccionables por el usuario: `#1F3A5F` (navy, default), `#7C2D12` (tierra), `#1f5f3a` (moss), `#444444` (slate). El acento se inyecta en: item de módulo activo, barra de progreso, subrayado de tab activa, botón primario, hero del portal.

Scrim de overlay: `rgba(26,22,18,.34)` (sidebar móvil) y `rgba(26,22,18,.4)` + `backdrop-filter: blur(2px)` (paleta de comandos).

### Tipografía

Tres familias (Google Fonts, ver `tokens/fonts.css`):

- `--font-serif` → **Source Serif 4** — títulos, nombres de módulo, cabeceras de panel, párrafos descriptivos.
- `--font-sans` → **Inter** — toda la UI: etiquetas, metadatos, botones, celdas.
- `--font-mono` → **JetBrains Mono** — códigos, montos, contadores, endpoints, badges numéricos.

Escala usada en el prototipo:

| Rol | Familia | Tamaño / peso / tracking |
|---|---|---|
| Título de pantalla (header) | serif | 21px / 600 / -.02em / line-height 1.2 |
| Título de hub de módulo | serif | 24px / 600 / -.02em |
| Hero del portal | serif | 29px / 400 / -.025em / lh 1.15 (énfasis en itálica) |
| Cabecera de panel / sección | serif | 16px / 600 |
| Descripción de pantalla | serif | 17px / lh 1.6 / `--ink-2` / max 70ch |
| Eyebrow (módulo, bloques) | sans | 10px / 500 / uppercase / tracking .13–.14em / `--ink-3` |
| Item de navegación | sans | 13.5px |
| Subtítulo de item (conteo) | sans | 10.5px / `--ink-4` |
| Etiqueta de campo | sans | 11.5px / 500 / `--ink-3` |
| Input / select / textarea | sans | heredado (≈14px) |
| Celda de tabla | sans | 13px (numérica: mono 12.5px, alineada a la derecha) |
| Cabecera de tabla | sans | 10.5px / 500 / uppercase / tracking .1em / `--ink-3` |
| Badge | sans | 11px / 500 |
| Endpoint / kbd | mono | 11px / 10px |

### Espaciado, radios, sombras

- Radios: **4px** (kbd, badges cuadrados), **6px** (inputs, botones), **7–8px** (items de nav, iconos), **10px** (tarjetas, paneles), **12px** (hero, paleta, tarjeta de hub), **999px** (chips, píldoras, barras).
- Sombras: `--shadow-1` (tarjetas KPI), `--shadow-2` (hoja de reporte), `--shadow-3` (paleta de comandos, sidebar móvil abierto).
- Gutter de contenido: `22px 20px 72px`; contenedor centrado `max-width: 1240px`; separación vertical entre bloques `18px`; grids con `gap: 12–15px`.
- **Densidad configurable** (`Compacta | Normal | Amplia`) → padding vertical de items de nav = `8 | 10 | 13` px (items de módulo +2px).

### Animación

- `fadeIn` 0.35s ease (opacity 0→1, translateY 4px→0) al entrar contenido; 0.18s en la paleta.
- Rotación de chevron de sección: `transform .15s ease` (0° abierto → -90° cerrado).
- Sin rebotes ni easings elásticos.

### Focus / hover

- Focus de input: `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--accent-soft)`.
- Hover de items de nav, filas de hub y resultados de paleta: `background: var(--accent-soft)`.
- Hover de fila de tabla: `background: var(--bg-elev)`.
- Hover de botón primario: `--accent` → `--accent-2`; secundario: borde → `--ink-3`.
- Enlaces: sin subrayado; al hover `border-bottom: 1px solid var(--accent)`.

---

## Arquitectura de datos

Todo el catálogo es declarativo (`design/sgtm-data-1..5.js`, ~305 KB en total). Pórtalo a módulos de datos tipados; **no escribas 134 pantallas a mano**.

### `window.SGTM_NAV`

Array de 12 módulos: `{ label, items: [[id, label], …] }`.

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

### `window.SGTM_SCREENS`

Objeto `id → descriptor`. Campos posibles:

```ts
type Screen = {
  mod: string;            // eyebrow del header
  title: string;          // título de la pantalla
  endpoint?: string;      // contrato API propuesto, p.ej. "GET /api/v1/predios"
  desc?: string;          // párrafo serif introductorio
  kind?: 'dash' | 'portal' | 'report';   // plantillas especiales
  kpis?: { value, label, note }[];       // solo kind 'dash'
  panels?: { title, note, rows: { label, sub, value, pct }[] }[];
  steps?: string[];                      // solo kind 'portal'
  tabs?: { label, sections: Section[] }[];
  sections?: Section[];
  filters?: Field[];
  table?: { title, count, note?, actions?: string[], cols: string[], num?: number[], rows: Cell[][] };
  totals?: { label, value, strong?: boolean }[];
  actions?: string[];                    // última = primaria
  report?: { code, date, title, subtitle, meta: {k,v}[], cols, num?, rows, footer };
};

type Section = { label: string; hint?: string; fields: Field[] };
type Field = { label: string; t: 'text'|'date'|'sel'|'area'|'chk'|'ro'; v?: string; ph?: string; opts?: string[]; wide?: 0|1; on?: boolean };
type Cell = string | [string, 'ok'|'warn'|'bad'];   // tupla = badge
```

Reglas de render de campos:
- `text` / `date` → input; `sel` → select con `opts`; `area` → textarea 3 filas, `resize: vertical`; `chk` → checkbox + texto `ph` dentro de una caja con borde; `ro` → valor de solo lectura, borde **dashed**, fondo transparente, mono 13px, min-height 38px.
- `wide: 1` → `grid-column: 1 / -1`.
- Grid de campos: `repeat(auto-fit, minmax(196px, 1fr))`, `gap: 15px 16px`, padding `18px 16px`.
- Secciones con `hint` igual a `Colapsado`, `Opcional` o `Solo lectura` arrancan **cerradas**; el resto abiertas.

Reglas de tabla: los índices en `num` alinean a la derecha y usan mono 12.5px; la primera columna va en peso 500; el resto en `--ink-2`; celdas `white-space: nowrap`, padding `11px 14px`; contenedor con `overflow-x: auto` y `min-width: 640px`.

---

## Screens / Views

### 1. Shell de la aplicación

**Layout:** flex horizontal, `min-height: 100vh`, fondo `--bg`.
- **Sidebar:** `width: 258px; flex: 0 0 258px`, fondo `--bg-elev`, `border-right: 1px solid --line`, scroll propio.
- **Main:** `flex: 1; min-width: 0`, columna: header sticky + área de contenido.

**Cabecera del sidebar** (sticky, `padding: 16px 16px 14px`, borde inferior): cuadrado 34×34 radio 8 fondo `--accent` con "S" serif 16px/600 blanco; a su lado "SGTM" serif 17px/600 y el nombre de la entidad en 10px uppercase tracking .13em `--ink-3` (truncado con ellipsis).

**Buscador del sidebar:** botón de ancho completo, `padding: 9px 10px`, borde `--line-2`, radio 7px, fondo `--bg`, con icono de lupa 15px, texto "Buscar en el sistema" 13px `--ink-3` y `kbd` "Ctrl K" (mono 10px, borde, radio 4px). Hover: borde `--ink-4`.

**Header de la app** (sticky, z 40, `padding: 12px 20px`, borde inferior, fondo `color-mix(in srgb, var(--bg) 84%, transparent)` + `backdrop-filter: blur(10px)`):
- botón hamburguesa 36×36 (solo ≤1080px),
- eyebrow con el módulo + `h1` serif 21px con el título de la pantalla,
- botón de lupa 36×36,
- chip de endpoint (mono 11px, píldora, fondo `--bg-elev`) — ocultable por configuración,
- chip de usuario: avatar 26px redondo fondo `--accent-soft` con iniciales "JC", nombre 12px/500 y rol 10px `--ink-3`.

### 2. Navegación (dos niveles)

**Nivel raíz** (ningún módulo abierto):
- Bloque "Recientes" (si hay): hasta 5 opciones visitadas, cada una con etiqueta 13px `--ink-2` y módulo 10.5px `--ink-4`; divisor hairline al final.
- Eyebrow "Módulos" y los 12 módulos. Cada item: icono en caja 28×28 radio 7px (fondo `--bg-card`, borde `--line-2`, color `--ink-3`; activo: fondo y borde `--accent`, icono blanco), etiqueta 13.5px, subtítulo "N opciones" 10.5px, chevron derecho 14px `--ink-4`. Radio 8px, `gap: 11px`.

**Nivel módulo** (tras pulsar un módulo):
- Botón "Todos los módulos" con chevron izquierdo, 12px `--ink-3`.
- Nombre del módulo en serif 16px/600.
- Sus opciones agrupadas en 4 bloques colapsables, cabecera con chevron 12px + etiqueta uppercase 10px tracking .14em + conteo mono 10px. Item activo: fondo `--accent-soft`, color `--accent-ink`, peso 600 y "●" mono a la derecha.

**Clasificación automática de bloques** (por título de la pantalla, en este orden):
1. `Documentos y reportes` — `kind: 'report'` o coincide `/reporte|padrón|resumen|record|constancia|resolución|certificado/i`.
2. `Consultas` — `/consulta|búsqueda|estado de cuenta|histórico|auditoría|panel|portal/i`.
3. `Procesos` — `/cálculo|generación|proceso|transferencia|pase|importación|emisión|notificación|anulación|alta de|baja de|cambio|cambiar|actualización|fraccionamiento|liquidación|declaración|duplicado|prescripción|copias de seguridad|acto/i`.
4. `Registro y mantenimiento` — resto.

En la implementación conviene **precalcular** esa clasificación en los datos (campo `group`) en lugar de correr regex en runtime.

**Iconos de módulo.** SVG de línea, viewBox 24×24, `stroke-width: 1.7`, `linecap/linejoin: round`, `currentColor`; 16px en el sidebar, 24px en el hub. Los `path` exactos están en el objeto `icons` de la clase de lógica de `SGTM.dc.html`. Correspondencias: Inicio = casita · Catastro = plano/mapa plegado · Rentas = documento con líneas · Fiscalización = portapapeles con check · Tránsito = automóvil · Infracciones administrativas = triángulo de alerta · Tesorería = billete con moneda · Consultas = lupa · Valores = documento sellado · Coactiva = balanza · Autorizaciones y licencias = local comercial con toldo · Seguridad = escudo con check.

### 3. Hub de módulo

Se muestra al abrir un módulo (vista `@mod:<label>` en el prototipo; en el repo, ruta `/:modulo`).
- Tarjeta de encabezado: `padding: 20px 22px`, fondo `--bg-card`, borde `--line`, radio 12px; icono 44×44 radio 10px fondo `--accent-soft` color `--accent-ink`; título serif 24px; subtítulo "N opciones en M bloques" 13px `--ink-3`.
- Grid de bloques: `repeat(auto-fit, minmax(300px, 1fr))`, `gap: 14px`. Cada bloque es una tarjeta radio 10px con cabecera (eyebrow + conteo mono) y filas-botón: etiqueta 13.5px/500 + descripción 12px `--ink-3` `text-wrap: pretty` (recortada a 108 caracteres con "…") + chevron. Hover `--accent-soft`.

### 4. Paleta de comandos

Overlay centrado: `top: 11vh`, `width: min(620px, 92vw)`, fondo `--bg-card`, borde `--line-2`, radio 12px, `--shadow-3`.
- Campo con icono de lupa, `autofocus`, placeholder "Escribe una opción, un módulo o un trámite…", `kbd` "Esc".
- Resultados: máx. 14 (sin consulta: primeras 10), fila con etiqueta truncada + módulo 11px `--ink-3`; búsqueda por `label + title + módulo` (substring, minúsculas).
- Pie: `padding: 9px 16px`, fondo `--bg-elev`, izquierda "N de 134 opciones", derecha "Ctrl K abre y cierra este buscador".

### 5. Plantillas de contenido

Un mismo renderer compone, en este orden, los bloques que declare el descriptor:

1. **Descripción** — párrafo serif 17px, max 70ch.
2. **Dashboard** (`kind: 'dash'`, pantalla `inicio`) — grid de KPIs `minmax(190px, 1fr)` (tarjeta radio 10px, `--shadow-1`, componente `Stat` + nota 12px) y grid de paneles `minmax(320px, 1fr)` con filas: etiqueta + subtítulo, barra de progreso 110×6px (`--accent-soft` de fondo, relleno acento, radio 999px) y valor mono 12.5px alineado a la derecha (min-width 76px).
3. **Portal ciudadano** (`kind: 'portal'`) — hero fondo `--accent`, texto blanco, radio 12px, `padding: 26px 24px`, eyebrow + titular serif 29px con énfasis en itálica; caja de consulta translúcida (`rgba(255,255,255,.1)`, borde `rgba(255,255,255,.22)`) con select de tipo de documento, input y botón blanco con texto navy. Debajo, píldoras de pasos numerados (`01`…): los 3 primeros en `--accent-soft`/`--accent-ink`, el resto en `--bg-card`/`--ink-3` con borde.
4. **Filtros** (`filters`) — tarjeta con eyebrow "Búsqueda", botón "Limpiar" a la derecha, grid `minmax(180px, 1fr)` `align-items: end` y botón primario "Buscar" (38px de alto).
5. **Tabla** (`table`) — tarjeta con cabecera (título serif 16px + conteo mono 11px + acciones ghost), tabla con `overflow-x: auto`, y nota al pie sobre `--bg-elev` 12px `--ink-3`.
6. **Totales** (`totals`) — banda de celdas separadas por 1px de `--line` (grid `minmax(150px,1fr)` con `gap: 1px` sobre fondo `--line`), etiqueta uppercase 10.5px y valor mono 19px; celdas `strong` con fondo `--accent-soft`.
7. **Tabs** (`tabs`) — fila scrollable con borde inferior; tab activa: `border-bottom: 2px solid` acento, color `--ink`, peso 600. Cambiar de tab resetea el estado de colapso de secciones.
8. **Formulario** (`sections` o `tabs[i].sections`) — secciones colapsables (ver reglas de campos arriba); cabecera con título serif 16px, `hint` 11px `--ink-3` y chevron rotatorio.
9. **Reporte** (`kind: 'report'`) — hoja blanca `max-width: 820px`, `padding: 40px 44px`, radio 6px, `--shadow-2`: encabezado institucional con doble regla `2px solid --ink` (entidad + "Gerencia de Administración Tributaria — Unidad de Rentas" a la izquierda; código y fecha en mono a la derecha), título centrado serif 24px + subtítulo 12px, banda de metadatos entre hairlines (`minmax(190px,1fr)`), tabla, párrafo de cierre serif 14px y dos líneas de firma ("Cajero / Responsable", "Contribuyente") a `margin-top: 56px`. Fuera de la hoja: botones "Imprimir" (primario) y "Descargar PDF".
10. **Barra de acciones** (`actions`) — sticky al fondo, alineada a la derecha, borde superior y degradado `linear-gradient(to top, var(--bg) 62%, transparent)`; la última acción es primaria, las demás secundarias.

---

## Interactions & Behavior

- **Abrir módulo** → sidebar pasa a nivel módulo, contenido muestra el hub, `tab` vuelve a 0, se cierra el sidebar móvil.
- **Abrir opción** → carga la pantalla, resetea `tab` y colapsos, cierra paleta y sidebar móvil, y añade la opción al inicio de "Recientes" (sin duplicados, máx. 5). El módulo de la opción pasa a ser el módulo activo del sidebar.
- **`Ctrl/Cmd + K`** alterna la paleta y limpia la consulta. **`Esc`** cierra paleta y sidebar móvil. Listeners a nivel `window`, removidos al desmontar.
- **Colapsos** son por clave (`índice|tab` en formularios, `módulo|índice` en bloques de nav) para que se conserven de forma independiente.
- **"Imprimir"** llama a `window.print()`.
- Estados **loading / error / vacío** no están diseñados en el prototipo: usa los patrones del repo (skeleton shimmer del design system para carga, mensaje hairline centrado para vacío).
- Validación: no especificada en el manual; aplica requeridos y formatos (DNI/RUC, fechas, montos) según el backend.

## State Management

Estado del prototipo (portar a router + store ligero):

| Estado | Tipo | Uso |
|---|---|---|
| `view` | `string` | id de pantalla o `@mod:<label>` para el hub → en el repo, la ruta |
| `navMod` | `string \| null` | módulo abierto en el sidebar (`null` = nivel raíz) |
| `tab` | `number` | tab activa de la pantalla |
| `closed` | `Record<string, boolean>` | secciones/bloques colapsados |
| `navOpen` | `boolean` | sidebar móvil |
| `pal`, `pq` | `boolean`, `string` | paleta de comandos y su consulta |
| `recent` | `string[]` | últimas 5 opciones (persistir en `localStorage`) |

Props configurables del prototipo (exponer como preferencias): `entidad` (texto), `showEndpoint` (bool, mostrar el chip de endpoint — útil solo en desarrollo), `density` (`Compacta | Normal | Amplia`), `accent` (color, 4 opciones).

## Responsive behavior

- **≤1080px:** sidebar `position: fixed; inset: 0 auto 0 0`, oculto con `translateX(-101%)`, abierto con `--shadow-3` y scrim `rgba(26,22,18,.34)`; aparece el botón hamburguesa.
- **≤760px:** se ocultan el chip de endpoint, el chip de usuario y las barras de progreso de los paneles (marcados `data-sm-hide` en el prototipo).

## Impresión

`@media print`: ocultar sidebar, header de la app y todo lo marcado como no imprimible (barra de acciones, botones de la hoja); la hoja de reporte pierde sombra, borde y márgenes. Objetivo: A4 vertical, una hoja por reporte.

## Assets

- **Iconos:** SVG de línea escritos a mano en el prototipo (12 iconos de módulo + lupa, chevrons, hamburguesa). No hay librería de iconos ni fuente de iconos. Sin emoji.
- **Logo:** marca tipográfica "S" en cuadrado navy + wordmark "SGTM". No hay archivo de logo; si la municipalidad aporta su escudo, sustituye el cuadrado manteniendo 34×34.
- **Fuentes:** Source Serif 4, Inter y JetBrains Mono vía Google Fonts (`tokens/fonts.css`). Para entorno offline, autohospedar los woff2.
- **Sin fotografías ni ilustraciones.**

## Files

En `design/`:

| Archivo | Contenido |
|---|---|
| `SGTM.dc.html` | Prototipo completo: plantilla (markup + estilos inline) y clase de lógica al final del archivo. Fuente de verdad de medidas y comportamiento. |
| `sgtm-data-1.js` … `sgtm-data-5.js` | Catálogo: `window.SGTM_NAV` (en `sgtm-data-3.js`) y `window.SGTM_SCREENS` repartido en los cinco archivos. |
| `support.js` | Runtime del prototipo. **No portar**: es andamiaje del entorno de diseño. |
| `_ds/juris-pe-design-system-…/tokens/*.css`, `styles.css` | Tokens y estilos del design system Juris PE. |
| `_ds/juris-pe-design-system-…/_ds_bundle.js` | Componentes del design system usados en el prototipo (`Button`, `Badge`, `Stat`). |
| `_ds/juris-pe-design-system-…/readme.md` | Guía del design system (voz, paleta, tipografía, iconografía). |

Para abrir el prototipo: servir `design/` con cualquier servidor estático y abrir `SGTM.dc.html`.

`PROMPT.md` (junto a este README) contiene el prompt listo para pegar en Claude Code.
