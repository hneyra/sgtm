# Prompt para Claude Code

> Copia y pega este bloque completo en Claude Code, con la carpeta `design_handoff_sgtm_web/` dentro del repo.

---

Implementa la interfaz web del **SGTM (Sistema de Gestión Tributaria Municipal)** siguiendo el diseño de referencia que está en `design_handoff_sgtm_web/`.

**Contexto.** El SGTM es un sistema tributario municipal peruano documentado en un manual de 231 figuras. El diseño de referencia moderniza esa aplicación de escritorio como app web: **12 módulos, 134 opciones (pantallas)**, ~8 roles. Los archivos de `design_handoff_sgtm_web/design/` son **prototipos HTML de referencia** (no código de producción): definen aspecto, estructura y comportamiento. Tu tarea es **recrearlos en el entorno del repo** con sus patrones y librerías existentes; si el repo aún no tiene frontend, elige el stack más adecuado (por defecto: React + TypeScript + Vite, CSS variables + CSS Modules, sin librería de UI pesada) y justifícalo en el PR.

**Fidelidad: alta (hi-fi).** Colores, tipografía, espaciados, radios y estados están definidos con valores exactos. Reprodúcelos tal cual; no "mejores" el diseño ni cambies la nomenclatura en español de los campos.

**Antes de escribir código, lee en este orden:**
1. `design_handoff_sgtm_web/README.md` — especificación completa (layout, componentes, tokens, interacciones, estado).
2. `design_handoff_sgtm_web/design/SGTM.dc.html` — el prototipo: plantilla + clase de lógica al final del archivo. Es la fuente de verdad para medidas y estilos.
3. `design_handoff_sgtm_web/design/sgtm-data-*.js` — catálogo de datos: `window.SGTM_NAV` (12 módulos → 134 opciones) y `window.SGTM_SCREENS` (definición declarativa de cada pantalla: `title`, `mod`, `endpoint`, `desc`, `kind`, `tabs`, `sections[].fields[]`, `filters`, `table`, `totals`, `actions`, `report`).
4. `design_handoff_sgtm_web/design/_ds/.../readme.md` y `tokens/*.css` — el design system Juris PE (paleta, tipografía, espaciado, radios, sombras).

**Requisitos no negociables:**
- **Los datos manejan la UI.** No hardcodees 134 pantallas: porta `SGTM_SCREENS` a módulos de datos tipados (TS) y renderiza cada pantalla desde su descriptor, igual que el prototipo. Los tipos de campo son `text | date | sel | area | chk | ro`.
- **Navegación de dos niveles.** El sidebar muestra solo los 12 módulos con su conteo; al entrar a un módulo se listan sus opciones agrupadas en 4 bloques colapsables (Registro y mantenimiento · Procesos · Consultas · Documentos y reportes) con botón "Todos los módulos" para volver. Ver README §Navegación.
- **Paleta de comandos global** con `Ctrl/Cmd K` sobre las 134 opciones, y "Recientes" (últimas 5) en la raíz del sidebar.
- **Rutas reales.** Cada opción debe tener URL propia (`/:modulo/:opcion`, hub del módulo en `/:modulo`) con estado sincronizado, back/forward y recarga. El prototipo usa estado en memoria; en el repo usa el router.
- **Los `endpoint` de cada pantalla** (p. ej. `GET /api/v1/predios`) son el contrato propuesto de API. Genera una capa de cliente y datos mock para todas las pantallas; no bloquees la UI esperando al backend.
- **Accesibilidad y teclado:** foco visible (borde navy + anillo 3px `--accent-soft`), navegación por tabulación en tablas y formularios, labels reales asociados a inputs, `aria-expanded` en secciones colapsables, Esc cierra paleta y sidebar móvil.
- **Impresión.** Las pantallas `kind: 'report'` se imprimen en A4 vertical: se oculta sidebar, cabecera y acciones, y la hoja va sin sombra ni borde. Ver README §Impresión.
- **Responsive.** ≥1081px sidebar fijo de 258px; ≤1080px sidebar como panel deslizante con scrim; ≤760px se ocultan endpoint, barras de progreso y datos de usuario en la cabecera.

**Entrega esperada:**
1. Estructura de carpetas y decisiones de stack en un `ARCHITECTURE.md` breve.
2. Tokens del design system como CSS variables (copiadas de `tokens/*.css`, sin reinventar valores).
3. Componentes base: `AppShell`, `Sidebar`, `ModuleHub`, `CommandPalette`, `ScreenRenderer` y sus primitivos (`FieldGroup`, `FilterBar`, `DataTable`, `TotalsStrip`, `Tabs`, `CollapsibleSection`, `ReportSheet`, `ActionBar`, `Badge`, `Stat`, `Button`).
4. Las 134 pantallas navegables con datos mock.
5. Tests de humo: cada opción del catálogo renderiza sin error; la paleta encuentra por título, módulo y etiqueta.

Trabaja por fases y para al final de cada una para que revise: **(1)** shell + navegación + rutas + tokens, **(2)** `ScreenRenderer` y primitivos con 3 pantallas piloto (`inicio`, `contribuyentes`, `caja_tributaria`), **(3)** el resto del catálogo por módulo, **(4)** impresión, accesibilidad y tests.
