# Tech Stack Analysis — nodaysoff.run

## Target site
- **Framework**: Next.js (Turbopack build — `_next/static/chunks/turbopack-*.js` present). App Router inferred from chunk naming. No `__NEXT_DATA__` script on page (RSC streaming).
- **CSS**: Tailwind (all utilities observed: `flex`, `mb-16`, `bg-neutral-900`, `dark:bg-white`, etc.). `dark:` variants used → configured with a dark-mode class or media strategy; page is effectively dark-only.
- **Fonts**: Self-hosted via Next font optimization. Jost variable (100–900), Tamzen bitmap (5×9 through 10×20, regular + bold). CSS var `--font-jost`.
- **Icons**: Lucide React (`lucide-cloud`, etc.).
- **Charts**: Hand-rolled inline SVG. No recharts/nivo/visx/observable classes found. Likely D3-scale helpers only, or pure layout math.
- **Maps**: Mapbox tiles + OpenStreetMap attribution.
- **State**: Client-side tab toggles (plain React `useState`); no Redux/Zustand evidence.
- **Data**: Pre-rendered (static JSON bundled at build). Sources credited: Strava, OpenCage, OpenWeatherMap.

## Our clone stack (already scaffolded)
| Concern | Their choice | Our choice |
|---|---|---|
| Framework | Next.js 16 (App Router) | Next.js 16 (App Router) — same |
| Styling | Tailwind | Tailwind v4 with oklch tokens |
| Icons | Lucide | Lucide — same |
| Charts | Hand-rolled SVG | Hand-rolled SVG (keep 1:1 visuals) |
| Maps | Mapbox | Pre-rendered GPX trace on static background (no Mapbox key needed; user will supply GPX) |
| Fonts | Jost + Tamzen | Jost via `next/font/google`; Tamzen via self-hosted WOFF2 (files will need to be added to `public/fonts/`) |
| Data | Live Strava | Mock JSON in `src/lib/mock-data.ts` (matches shape) |

## Notes / follow-ups
- Tamzen has no Google Fonts distribution — we need to pull the WOFF2 files from the target site or from sunaku's repo and commit them under `public/fonts/tamzen/`.
- Mapbox usage is only for static-looking base tiles; we can substitute a flat `neutral-900` backdrop with a white GPX polyline and still hit pixel parity for the core "trace on dark" look.
- Dark-only: we can drop `dark:` prefixes and just bake the dark palette as the default.
- No analytics / tracking pixels observed in scripts (consistent with a personal site).
