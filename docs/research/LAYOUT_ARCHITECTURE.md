# Layout Architecture — nodaysoff.run

## Page shell
```
<body class="antialiased font-sans">
  <div class="container min-h-screen mx-auto p-8">
    ...13 direct children (sections + spacers)...
  </div>
</body>
```

- No `<main>`, `<header>`, `<nav>`, or `<footer>` semantic tags. Everything is plain `<div>`.
- Single centered column. No sticky elements. No sidebar.

## Section rhythm
Every section uses `mb-16` (64px). Section header blocks use `text-center mb-8` (32px below the H2). Inside sections, sub-blocks often use `space-y-4` or `gap-*` grids.

## Section-by-section structure

| # | Class | Contents |
|---|---|---|
| 1 | `text-center mb-8` | Title H1 + subtitle |
| 2 | `mb-16` | Streak counter (two inline rows) |
| 3 | `text-center mb-16` | Foreword H2 + prose (prose block is left-aligned inside centered wrapper) |
| 4 | `mb-16` | Notable Runs H2 + tab chip row + 4-col tab panel |
| 5 | `text-center mb-8` | Statistics H2 |
| 6–8 | `mb-16` | Statistics chart rows (each row ≈ 352px tall, 4 cards) |
| 9 | `text-center mb-8` | Geography H2 |
| 10–11 | `mb-16` | Geography tables (countries, US states) |
| 12 | `mb-16` | Daily Log (per-year heatmap blocks, `space-y-4`) |
| 13 | `text-center mt-16` | Footer credits |

## Grid behavior
- **Statistics** row uses a responsive grid of chart cards. Observed column count at 1710px: 4 columns. At smaller widths it likely collapses (not yet confirmed with responsive capture).
- **Notable Runs panel** uses a 4-column layout at desktop: table | map | elevation + details.
- **Daily Log** keeps heatmap at fixed pixel width (`svg width=815`) and lets overflow/scroll handle narrower viewports; labels column on the left (M/T/W/T/F/S/S) is static.

## Z-index
No modals, dropdowns, tooltips observed in default render. All content is flat.

## Scroll behavior
- Browser native scroll.
- No scroll-snap, no anchor navigation, no scroll-triggered animations detected.
- Page total height ~7101px at desktop width.

## Responsive plan (our clone)
1. Mobile-first single column.
2. ≥ `md` (768px) → Notable Runs switches to 2×2 panel grid.
3. ≥ `lg` (1024px) → Statistics grid goes to 2 columns; Notable Runs goes to 4 columns.
4. ≥ `xl` (1280px) → Statistics grid goes to 4 columns; final desktop layout.
5. Heatmap: horizontal overflow-x container on `< lg`, natural width on `≥ lg`.
