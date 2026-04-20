# Design Tokens — nodaysoff.run

Captured via Chrome DevTools / computed styles on 2026-04-17 at 1710×981 viewport.

## Palette
Dark-only, monochrome. No accent hue — emphasis comes from brightness steps.

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0a0a0a` | page background (body) |
| `--foreground` | `#ededed` | primary body text |
| heading fg | `rgb(245, 245, 245)` (`neutral-100`) | H1/H2 text |
| muted text | `rgb(163, 163, 163)` (`neutral-400`) | table cells, captions |
| active tab bg | `#ffffff` (white, dark-mode invert) | selected tab chip |
| active tab fg | `rgb(23, 23, 23)` (`neutral-900`) | selected tab label |
| inactive tab bg | `rgb(38, 38, 38)` (`neutral-800`) | unselected tab chip |
| inactive tab fg | `rgb(212, 212, 212)` (`neutral-300`) | unselected tab label |
| heatmap cell range | `rgb(28,28,28)` → `rgb(94,94,94)` (observed min/max among `neutral-900…neutral-600`) | daily log density |

All colors are Tailwind's `neutral-*` greyscale. No semantic accents (no blue, no green). White is used sparingly for selected state and chart fills.

## Typography

Two families only, both self-hosted via Next.js font optimization.

**Jost** (variable 100–900) — all UI chrome, headings, stat numbers.
- H1 display: `48px / 56px`, weight `700`, family `Jost`, no letter-spacing, no uppercase transform (title is already uppercase literal text "NO DAYS OFF").
- H2 section: `20px / 28px`, weight `500`, color `neutral-100`.
- Body: `16px / 24px`, weight `400`.
- Stat-card big numbers: weight `700`, ~`48px` (matches H1 scale visually).

**Tamzen** (bitmap monospace, multiple sizes) — all tabular data, chart labels, metadata.
- `Tamzen5x9` through `Tamzen10x20`, 400/700.
- Table cells observed at `14px / 20px` in `Tamzen7x14`.
- Author credit: `Tamzen` by sunaku, based on `Tamsyn` by Scott Fial.

Font stack fallback: `Jost, "Jost Fallback", system-ui, sans-serif`.

## Spacing
Tailwind default scale. Observed rhythm:
- Section separator: `mb-16` (64px) between sections.
- Sub-heading separator: `mb-8` (32px) between H2 and content.
- Tab-chip gap: `gap-2` (8px).
- Chip padding: `px-3 py-1` (12px / 4px).

## Layout
- Outer wrapper: `.container mx-auto p-8` — centered, 32px horizontal padding.
- Max width is Tailwind `container` default (responsive breakpoints: 640/768/1024/1280/1536px).
- All content is a single vertical scroll; **no sticky nav, no global header, no sidebar**.

## Borders & Radius
- No visible card borders on section wrappers.
- Tab chips: no radius (observed `border-radius: 0`). Square chips.
- Tables: no borders, alternating zero-background rows, highlighted-row uses `bg-neutral-800`.

## Shadows
None observed. Flat design.

## Iconography
- Lucide icons (`lucide-cloud`, etc.), 16×16 inline next to weather labels.
- Color inherits from text (`neutral-700` / `neutral-300` depending on context).

## Breakpoints
Default Tailwind (`sm/md/lg/xl/2xl`). Multi-column stats grid collapses on narrow viewports; not yet confirmed with responsive mode capture.
