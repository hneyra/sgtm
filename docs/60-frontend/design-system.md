# FRO-02 — Design system

**Ubicación:** `frontend/packages/design-system`
**Origen:** Juris PE, el design system del prototipo (`design/ds/`)
**RNF:** RNF-080, RNF-082, RNF-084

## 1. Qué hay hoy

Los **tokens**, copiados literalmente de `design/ds/tokens/`, una hoja base con reset, foco
visible y estilos de impresión, las tres familias tipográficas autoalojadas (§5) y **nueve
componentes que salieron todos del renderizador**: ninguno se escribió antes de la pantalla que
lo usa —un componente escrito antes de su pantalla es un componente que nadie pidió—, y el
prototipo fija sus medidas exactas.

```
packages/design-system/src/
├── componentes/           # Boton, Insignia, Importe, Indicador, Esqueleto,
│                          # Aviso, Icono, Campo y FechaDeCalculo (§4)
├── estilos/
│   ├── estilos.css        # punto de entrada
│   ├── base.css           # reset, foco, impresión A4
│   ├── componentes.css
│   ├── tipografias/       # los woff2 autoalojados (§5)
│   └── tokens/            # copiados de design/ds/tokens/
│       ├── colors.css     ├── typography.css
│       ├── spacing.css    └── fonts.css
└── index.ts               # los componentes, Densidad, Acento y el mapeo de tonos
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

## 4. Los componentes: qué existe hoy, y dónde

La lista que este documento pedía existe entera, con dos salvedades: algunos nombres cambiaron
al construirse, y no todo acabó en el design system — lo que solo dibuja el renderizador vive
con él, en `apps/backoffice`.

| Lo que se pedía | Lo que existe, y dónde |
|---|---|
| `Importe` | `componentes/Importe.tsx`. **Muestra un importe con su fecha de cálculo** (RNF-075): sin `fechaCalculo` no pasa el lint. La banda de fecha de una pantalla es `FechaDeCalculo.tsx`, que subió aquí al separarse `apps/portal` (#298) |
| `EstadoDeuda` | `componentes/Insignia.tsx`: color **y** texto, con el mapeo de tonos de §2.1 |
| `CampoImporte` | `componentes/Campo.tsx`, el campo del design system: texto o fecha, nunca `type=number` |
| `Cargando` | `componentes/Esqueleto.tsx`: esqueleto, no girador |
| `EstadoVacio` / `EstadoError` | `componentes/Aviso.tsx`: explica qué pasó y qué hacer |
| `Tabla` | No es del design system: es el bloque `TablaDePantalla.tsx` del renderizador (`apps/backoffice/src/pantallas/bloques/`), mono a la derecha en las columnas numéricas |
| `Formulario` / `Seccion` | Ídem: `bloques/Formulario.tsx`, con lo opcional arrancando cerrado |
| `Hoja` (reporte) | Ídem: `bloques/Reporte.tsx` — A4 vertical, doble regla, dos líneas de firma (RNF-084) |
| `PaletaDeComandos` | De la aplicación: `apps/backoffice/src/app/PaletaDeComandos.tsx`, `Ctrl/Cmd + K` sobre el catálogo visible |

Y tres que ninguna lista pidió porque los pidieron sus pantallas: `Boton`, `Icono` e
`Indicador`.

Regla de entrada, que no cambia: **un componente sube aquí cuando lo usan dos módulos —o las
dos aplicaciones—**, no antes.

## 5. Pendientes

- [x] Autoalojar las tres familias (`woff2`) en lugar de cargarlas de Google Fonts. **Hecho:**
      viven en `packages/design-system/src/estilos/tipografias/` con los subconjuntos `latin` y
      `latin-ext` —el resto no pinta nada en un padrón peruano y era la mitad del peso—, y se
      regeneran con `node scripts/traer-tipografias.mjs`.
- [ ] Confirmar el separador de millares con el área de Rentas (FRO-01 §6).
- [x] Verificar el contraste de la insignia de advertencia `#f6ecd9`/`#8a6420` contra 4,5:1.
      **4,61:1**, calculado en `verificaciones/contraste.test.ts` y no supuesto. Al hacerlo se vio
      que los tokens `--warn-bg`/`--warn-fg` **no estaban definidos**: el tono «atención» salía sin
      color. Ya lo están. La misma prueba encontró dos defectos más: la traza de un error usaba
      `--ink-4` (3,04:1 sobre la tarjeta) y el título de error usaba `--bad-fg`, que en tema oscuro
      da 1,87:1 —la insignia lleva su fondo claro y el título de un aviso no—, así que el texto de
      error tiene ahora token propio (`--error-texto`) con valor para cada tema.
- [ ] Decidir si el modo oscuro del design system se ofrece; el prototipo lo trae y ninguna
      pantalla del manual lo pide.

## 6. Documentos relacionados

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`mapa-de-pantallas.md`](mapa-de-pantallas.md) (FRO-03) ·
[handoff de diseño](../../design/design_handoff_sgtm_web/README.md)
