# Juris PE — Design System

> Buscador inteligente de jurisprudencia peruana. Búsqueda semántica (RAG +
> LLM) sobre el corpus oficial, con **síntesis y citas verificables**.

Juris PE lets Peruvian lawyers, judicial staff, academics and students query
case law in **natural Spanish** and get an AI-synthesized answer where **every
claim links back to the exact paragraph of an official resolution** — no
hallucinated citations. It indexes the Tribunal Constitucional, Corte Suprema,
Cortes Superiores and El Peruano from 1996 onward.

The brand voice is **editorial and institutional**: warm "paper" surfaces, a
serif reading voice, navy authority, monospaced legal references. It should feel
closer to a well-set legal periodical than to a typical SaaS dashboard.

## Sources

This system was distilled from the Juris PE exploratory design prototype:

- **Prototype project:** `https://claude.ai/design/p/019e2d04-0264-77f9-a4df-baea90f3e093`
  (HTML + React + Babel inline; `tokens.css` + `data.js` + per-screen `.jsx`).
- **Spec / brief:** `github-issue.md` in that project — "Rediseño de la página de
  inicio + flujo de búsqueda con RAG" (cc: @hneyra).
- Screens covered there: Landing (4 hero variants), Resultados de búsqueda,
  Vista de sentencia, Comparador de sentencias, Línea de tiempo doctrinal, Alertas.

The reader is not assumed to have access; everything needed has been copied here.

---

## Content fundamentals

- **Language: Spanish (Perú).** All product copy is Spanish. Legal terms stay in
  their formal Peruvian form (*sentencia, expediente, sala, fallo, casación,
  fundamentos, petitorio, vacancia, hábeas corpus*).
- **Address: tú (informal-but-respectful), default formal tone.** Copy speaks to
  the user as "tú" ("Pregunta como pensarías", "Tú tienes la última palabra")
  while staying professional. A `tone` switch offers **formal** (default:
  "Escriba en lenguaje natural…") vs **cercano** ("Escribe como hablas").
- **Confident, plain, slightly editorial.** Headlines are short declarative
  serif statements, often with one italic navy emphasis:
  *"La jurisprudencia peruana, **como una conversación**."*,
  *"Diseñado para quienes **no pueden equivocarse**."*,
  *"Cuatro pasos. Cita oficial al final."*
- **Trust is the throughline.** Copy repeatedly reassures about verifiability:
  *"Toda afirmación está enlazada a una sentencia del corpus. Verifica cada cita
  antes de citar formalmente."*, *"0 citas inventadas. Solo del corpus."*
- **Casing:** Sentence case for headings and buttons. UPPERCASE only for
  eyebrows (`CÓMO FUNCIONA`), fallo labels (`FUNDADA` / `INFUNDADA`) and short
  metadata labels. Buttons are verbs: *Buscar, Solicitar demo, Ver sentencia,
  Citar, Resumir con IA, Crear alerta*.
- **Numbers as proof.** Corpus counts (2.3M, 412,860), precision (94%), latency
  (4.2s) and year ranges (1996 — 2026) are shown plainly — never decorative.
- **No emoji** in the product surface. (The source uses a couple of emoji glyphs
  only inside the internal Alerts frequency menu; avoid them in brand-facing UI.)

---

## Visual foundations

**Palette.** Warm cream "paper" (`--bg #f6f4ef`), raised cream (`--bg-elev`),
white cards (`--bg-card`). Text is a warm near-black ink ramp (`--ink #1a1612`
→ `--ink-4`). Accent is **institutional navy `--accent #1F3A5F`** with a soft
tint (`--accent-soft`) for backgrounds behind navy text. Brand alternates exist
(tierra `#7C2D12`, moss `#1f5f3a`, coral, slate) and are user-selectable.
Semantic accents: gold (annotations), crimson (dissent / INFUNDADA), moss-green
(firme / verified). Each **official source has its own tint**: TC navy, CS earth,
EP moss — see `SourceChip`.

**Type.** A three-family editorial pairing:
- **Source Serif 4** — display titles (clamp 44–76px, weight 400, tracking
  −0.025em) and *all sentence/reading body* at 17px / 1.7, justified. This is
  the voice of the brand.
- **Inter** — all UI: labels, metadata, buttons, eyebrows (11px, uppercase,
  tracking 0.14em).
- **JetBrains Mono** — legal references, expedientes, page numbers, timings.

A `typo` switch offers **mix** (default), **sans** (all Inter) or **serif**.

**Backgrounds.** No photography, no gradients-as-decoration. Surfaces are flat
warm paper. The only "imagery" is typographic: oversized faint serif glyphs
(source abbreviations like `TC`, the `§` section mark) bled off card/CTA corners
at ~5–8% opacity, and a single very soft radial navy wash in the hero corner.

**Borders & cards.** Cards are white on a 1px warm hairline (`--line`), radius
`--r-3` (10px). Inputs/buttons use `--r-2` (6px); chips are pills (999px).
Borders carry most of the structure — Juris leans on **hairlines, not heavy
fills**. Section dividers are 1px rules; section headers often sit on a top
hairline rather than inside a box.

**Shadows.** Soft and grounded, never floaty: a hairline + a wide diffuse blur
(`--shadow-1/2/3`). Elevation is used sparingly (hover on cards, modals, the
hero answer-preview card).

**Radii.** Restrained: 3 / 6 / 10 / 14px. Nothing is very round; the feel is
documentary.

**Animation.** Quiet. A 0.35s `fadeIn` (4px rise) for entering content; a
shimmer skeleton for loading; a slow pulse only on the PDF bbox highlight.
**No bounces, no springy easing** — everything is `ease` / `ease-in-out` and
short (.12–.2s for interactions).

**Hover / press.** Buttons: primary darkens navy (`--accent` → `--accent-2`);
secondary darkens its border to `--ink-3`; ghost fills with `--accent-soft`.
Cards lift `−2px` with `--shadow-2` and a navy border on hover. Press nudges
~0.5px down. Links underline on hover (border-bottom, not text-decoration).

**Focus.** Navy border + 3px `--accent-soft` ring (`--ring`).

**Layout.** Centered containers — `--container 1240px`, `--container-narrow
880px` — with `--space-6` gutters. Header is sticky, translucent
(`color-mix` + `blur(10px)`). Reading and detail views use 3-column grids
(rail · content · rail) that collapse gracefully. Transparency/blur is reserved
for the sticky header and modal scrims; the body stays opaque paper.

**Density.** A `--density` multiplier (0.85 compact → 1.2 airy) scales the whole
spacing ramp; default 1.

---

## Iconography

- **Custom inline SVG, single stroke style.** Icons are line icons drawn at
  `stroke-width: 1.6–1.8`, `stroke-linecap/linejoin: round`, on a 24×24
  viewBox, rendered ~14–18px in `currentColor`. They read like a lightweight
  Lucide/Feather-family set but are hand-authored in the source.
- **Recurring glyphs:** search, sparkles (AI / synthesis), scales (law),
  brain (semantic), shield (verifiable source), doc, bookmark, copy, download,
  link, bell (alerts), trend, history, arrow / chevron, check, close.
  The DS ships this set as `KIcon` inside `ui_kits/juris-web/chrome.jsx`; reuse
  those rather than introducing a different icon family.
- **Logo:** navy rounded-square mark holding a stylized scales/"J" stroke with
  two dots, beside the serif wordmark "Juris·PE" (navy interpunct). Files in
  `assets/` (`logo-mark.svg`, `logo-lockup.svg`) and as the `Logo` component.
- **No icon font, no emoji** in brand surfaces. **Do not hand-draw new picteral
  illustrations** — the brand has none; use type, rules and the existing line
  icons instead.
- **Source abbreviations as graphic device:** `TC` / `CS` / `EP` / `CSJ` set in
  large faint serif are used as decorative corner glyphs on source cards.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this); `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.
- `assets/` — `logo-mark.svg`, `logo-lockup.svg`.
- `readme.md` — this guide. `SKILL.md` — Agent-Skill wrapper.

**Components** (`window.JurisPEDesignSystem_cf0a1e`)
- `components/core/` — **Button, IconButton, Input, Checkbox, Switch**
- `components/display/` — **SourceChip, Badge, Chip, Tabs, Stat**
- `components/brand/` — **Logo, CitationRef**
- `components/legal/` — **SearchBar, SynthesisCallout, ResultCard**

**Foundation cards** (Design System tab) — `guidelines/`: paper & ink, accent &
variants, semantic & source colors, display / reading-UI / mono type, spacing
scale, radii & shadows.

**UI kits**
- `ui_kits/juris-web/` — Landing → Resultados → Vista de sentencia (click-through).

## Fonts — substitution note

The three families (Source Serif 4, Inter, JetBrains Mono) are all Google Fonts
and are loaded via the Google Fonts CDN in `tokens/fonts.css` — they are **not
bundled as local binaries**. If you need a fully offline / self-hosted system,
download the woff2 files and replace the `@import` with local `@font-face` rules.
No substitute families were needed (all three are the originals).
