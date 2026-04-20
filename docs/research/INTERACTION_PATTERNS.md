# Interaction Patterns — nodaysoff.run

Minimal interactivity — this is a document, not an app.

## Interactive elements observed

### 1. Tab chips (Notable Runs)
Six `<button>` elements in `flex flex-wrap gap-2 justify-center`.
- **Active state**: `bg-white text-neutral-900` (dark-mode invert).
- **Inactive state**: `bg-neutral-800 text-neutral-300`.
- **Hover (inactive)**: `hover:bg-neutral-200 dark:bg-neutral-700` per utility classes (darker step).
- **Transition**: `transition-colors` (Tailwind default 150ms ease).
- **Cursor**: `pointer`.
- **No focus ring styling** observed in classes — we should add `focus-visible:ring-2 ring-neutral-500` for accessibility.

On click: swaps the Notable Run panel (rank table + map + elevation + details). Client-side only, no URL hash update.

### 2. Sortable table headers (Geography)
Columns indicate sort direction via a ↓ arrow next to "MILES". Clicking other headers likely re-sorts. Not yet confirmed — to verify in follow-up capture.

### 3. Hover rows (tables)
Selected/hovered `#1` row in the Notable Runs rank table has `bg-neutral-800` fill. Probably on hover and on "selected" (== the run being displayed in the right panel).

## Animations / transitions
- `transition-colors` on chip buttons (only).
- No entrance animations, parallax, or scroll-driven effects detected.
- No micro-interactions on hero numbers.

## Keyboard / accessibility gaps to fix in our clone
- Tab chips should get `role="tablist"` / `role="tab"` with `aria-selected`, and arrow-key navigation.
- Focus-visible outlines.
- Skip link to main content (there's no `<main>` on the target; we'll add one).
- Alt text for map and equipment photos.

## Tooltips
Bars and chart segments presumably have hover tooltips showing exact values, but static SVG labels already display counts (e.g., `1632` above each annual-mileage bar), so tooltips are optional.

## Smooth transitions we should add
- Fade between Notable Run tab panels (200ms opacity).
- Respect `prefers-reduced-motion: reduce`.
