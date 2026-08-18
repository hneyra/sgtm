# FRO-02 — Design system

**Ubicación:** `frontend/packages/design-system`
**Origen:** Juris PE, el design system del prototipo (`design/ds/`)
**RNF:** RNF-080, RNF-082, RNF-084

## 1. Qué hay hoy

Los **tokens**, copiados literalmente de `design/ds/tokens/`, y una hoja base con reset, foco
visible y estilos de impresión. **No hay componentes**, y es intencional: un componente escrito
antes de la pantalla que lo usa es un componente que nadie pidió, y el prototipo ya fija sus
medidas exactas para cuando llegue el momento.

```
packages/design-system/src/
├── estilos/
│   ├── estilos.css        # punto de entrada
│   ├── base.css           # reset, foco, impresión A4
│   └── tokens/            # copiados de design/ds/tokens/
│       ├── colors.css     ├── typography.css
│       ├── spacing.css    └── fonts.css
└── index.ts               # Densidad, Acento, Insignia
```

Los tokens se **copian**, no se importan: `design/` es el prototipo de referencia, no una entrada
del build. Si el prototipo cambia, se vuelven a copiar y se anota en el PR.

## 2. Tokens

### 2.1 Color

Paleta editorial-institucional: papel crema cálido, tinta casi negra, azul marino de autoridad.
Los nombres son los del prototipo y **no se renombran**: el handoff los usa como especificación.

| Grupo | Tokens |
|---|---|
| Superficies | `--bg` `#f6f4ef` · `--bg-elev` `#fbfaf6` · `--bg-card` `#ffffff` |
| Tinta | `--ink` `#1a1612` · `--ink-2` · `--ink-3` · `--ink-4` |
| Hairlines | `--line` `#e6e1d6` · `--line-2` `#d8d2c4` |
| Acento | `--accent` `#1F3A5F` · `--accent-2` · `--accent-soft` · `--accent-ink` |
| Estado | `--ok-bg`/`--ok-fg` · `--bad-bg`/`--bad-fg` · advertencia `#f6ecd9`/`#8a6420` |

**Regla de accesibilidad no negociable:** el estado **nunca** se comunica solo por color. Una
cuota vencida lleva color, texto y —cuando el espacio lo permite— icono. Quien no distingue
colores, o imprime en blanco y negro (RNF-084), tiene que poder separar una cuota vencida de una
al día.

El tipo `Estado` de `@sgtm/dominio` está construido para eso: trae `codigo`, `etiqueta` ya
redactada por el backend y `tono`. El mapeo a las insignias del prototipo:

| `Tono` | Insignia | Fondo / texto |
|---|---|---|
| `ok` | `ok` | `--ok-bg` / `--ok-fg` |
| `atencion` | `warn` | `#f6ecd9` / `#8a6420` |
| `critico` | `bad` | `--bad-bg` / `--bad-fg` |
| `neutro` | — | `--bg-elev` / `--ink-3` |

El nombre del tono va en español porque es vocabulario del dominio; el de la insignia
en inglés porque es el del design system.

### 2.2 Tipografía

Tres familias, según el prototipo:

| Token | Familia | Uso |
|---|---|---|
| `--font-serif` | Source Serif 4 | Títulos, nombres de módulo, cabeceras de panel, párrafos descriptivos |
| `--font-sans` | Inter | Toda la interfaz: etiquetas, metadatos, botones, celdas |
| `--font-mono` | JetBrains Mono | **Importes**, códigos, contadores, endpoints |

**Los importes van en monoespaciada y alineados a la derecha.** En una tabla de deuda, la columna
alineada permite comparar magnitudes de un vistazo; con fuente proporcional `S/ 1 111,11` y
`S/ 8 888,88` tienen anchos distintos y el ojo se pierde. Es un detalle pequeño con efecto grande
en ventanilla, y el prototipo ya lo aplica: las columnas de `num` van en mono 12,5 px a la derecha.

La escala completa está en el handoff, §Tipografía.

### 2.3 Espaciado, radios y sombras

Escala en múltiplos de 4 px multiplicada por `--density`; radios de 3 a 14 px; tres sombras
suaves. El detalle está en `tokens/spacing.css`.

## 3. Preferencias configurables

El prototipo declara cuatro propiedades ajustables. `index.ts` las expone como tipos para que la
iteración de interfaz las implemente sin reinventarlas:

| Preferencia | Valores | Efecto |
|---|---|---|
| `Densidad` | `compacta` · `normal` · `amplia` | Alto de los items de navegación: 8 · 10 · 13 px |
| `Acento` | `navy` · `tierra` · `moss` · `slate` | Item activo, barra de progreso, tab activa, botón primario, hero |
| `entidad` | texto | Nombre de la municipalidad en la cabecera |
| `showEndpoint` | booleano | Chip con el endpoint; útil solo en desarrollo |

La densidad no es cosmética: un cajero trabaja ocho horas al día y cuanta más información quepa
sin desplazar, menos veces desplaza (RNF-082).

## 4. Componentes por construir

Cuando llegue la iteración de interfaz, con la particularidad que cada uno tiene en este dominio:

| Componente | Particularidad |
|---|---|
| `Importe` | **Muestra un importe con su fecha de cálculo** (RNF-075). Sin `fechaCalculo` no compila el lint |
| `EstadoDeuda` | Insignia con color **y** texto |
| `Tabla` | Densidad compacta, columnas numéricas en mono a la derecha, teclado completo |
| `CampoImporte` | Solo decimal, sin `type=number`: el control nativo se comporta de forma errática |
| `Formulario` / `Seccion` | Secciones colapsables; las marcadas `Colapsado`, `Opcional` o `Solo lectura` arrancan cerradas |
| `Hoja` (reporte) | A4 vertical, doble regla institucional, dos líneas de firma (RNF-084) |
| `PaletaDeComandos` | `Ctrl/Cmd + K`, búsqueda sobre las 134 opciones |
| `Cargando` | Esqueleto, no girador: reduce el salto de diseño |
| `EstadoVacio` / `EstadoError` | Explican qué pasó y qué hacer; el error trae la traza |

Regla de entrada: **un componente sube aquí cuando lo usan dos módulos**, no antes.

## 5. Pendientes

- [ ] Autoalojar las tres familias (`woff2`) en lugar de cargarlas de Google Fonts.
- [ ] Confirmar el separador de millares con el área de Rentas (FRO-01 §6).
- [ ] Verificar el contraste de la insignia de advertencia `#f6ecd9`/`#8a6420` contra 4,5:1.
- [ ] Decidir si el modo oscuro del design system se ofrece; el prototipo lo trae y ninguna
      pantalla del manual lo pide.

## 6. Documentos relacionados

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`mapa-de-pantallas.md`](mapa-de-pantallas.md) (FRO-03) ·
[handoff de diseño](../../design/design_handoff_sgtm_web/README.md)
