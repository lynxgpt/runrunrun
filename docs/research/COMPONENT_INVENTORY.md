# Component Inventory — nodaysoff.run

Single long-scroll landing page. Thirteen top-level blocks under a centered `.container`.

## 1. Header (`HeaderTitle`)
Text-center, `mb-8`.
- H1 `NO DAYS OFF` (Jost 48/56 bold).
- Subtitle paragraph in body text: "running everyday from July 11, 2015 to February 23, 2026".

## 2. Streak counter (`StreakHero`)
Two inline rows, text-center:
- Row A — `10 YEARS · 7 MONTHS · 13 DAYS` (large number + small label).
- Row B — four stat cells: `3,881 days`, `13,454 miles`, `2,088 hours`, `257k ft climbed`.
Large numbers use Jost bold; labels use Tamzen.

## 3. Foreword (`ForewordSection`)
Text-center H2, then a left-aligned prose block in Tamzen monospace. Signed off right-aligned with "Adrien Friggeri / July 2025".

## 4. Notable Runs (`NotableRunsSection`)
H2 + **tab chip row** (6 tabs):
- Longest Runs · Personal Bests · Biggest Elevation Gain · Races · Bus Run Bus · Weekly Half Marathon

Tab panel layout: 4-column grid (desktop):
1. **Rank table** (#1–#10): RANK / DATE / DISTANCE columns. Hovered/selected row gets `bg-neutral-800`. Tamzen.
2. **Map panel**: Mapbox static-ish tile with white GPX trace overlay. Day label top-left, date top-right.
3. **Elevation profile**: small SVG line chart (miles × elevation / pace).
4. **Run details panel**: run title, stat grid (miles/time/pace/ft climbed), temperature + weather icon, location (city / country).

## 5. Statistics (`StatisticsGrid`)
H2 + two rows × 4 columns of chart cards:

Row 1: **Annual Mileage** (bar chart by streak year) · **Workout Activity by Time** (polar clock histogram) · **Average Daily Mileage by Day** (radar/web chart Mon–Sun) · **[4th col]**.

Row 2: **Run Distances** (histogram by mile bucket) · **Treadmill vs Outdoor** · **Pace Distribution** (mean/median markers on density curve) · **Heart Rate Zones** (horizontal stacked bar by zone).

Row 3: **Temperature** (bell-curve histogram by temp band) · **Weather Conditions** (icon-labeled bar row).

Row 4: **Equipment** (shoe usage bars).

Each chart card = `<h3>TITLE</h3>` + italic caption sentence + inline SVG. Greyscale fills only; hover tooltips likely.

## 6. Geography (`GeographySection`)
H2 + two tables:
- **Countries Visited** — COUNTRY / DAYS / ↓MILES (sortable arrow indicator on MILES).
- **US States Visited** — same schema, two columns when wide.

## 7. Daily Log (`DailyLogSection`)
H3 "DAILY LOG" (not an H2). Tagline "every. single. day."
Then per-streak-year blocks (Year 11 → Year 1, newest first):
- Year label + date range + total miles + avg/day, all on one row.
- Calendar heatmap: 7 rows (M/T/W/T/F/S/S) × ~52 week columns. Each cell = one day, fill from `neutral-900` to ~`neutral-600` by miles. Month labels below.

## 8. Footer (`SiteFooter`)
Centered, Tamzen, `mt-16`:
- Copyright line
- Map attribution (Mapbox, OpenStreetMap)
- Data sources (OpenCage, OpenWeatherMap, Strava)
- Font + icon credits

## Shared primitives to implement in `src/components/`
- `Chip` — square Tailwind button with active/inactive variants.
- `StatCell` — big-number + small-label pair.
- `ChartCard` — title + caption + SVG slot, vertical stack.
- `DataTable` — zero-border, Tamzen, hoverable rows.
- `HeatmapYear` — 7×~52 grid of colored cells.
- `RunCard` — 4-column Notable-Run panel (table · map · elevation · details).
- `Icon` — Lucide wrapper.

## Tab/navigation structure
No global nav. "First-level tabs" == **Notable Runs tab strip** (only tab UI on the page). All other sections are static stacked blocks.
