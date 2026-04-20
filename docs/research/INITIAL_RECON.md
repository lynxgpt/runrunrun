# Initial Reconnaissance — nodaysoff.run

Source: WebFetch of https://nodaysoff.run (no browser MCP yet).

## Page type
Single long-scroll page documenting a continuous running streak by Adrien Friggeri (Jul 11 2015 → Feb 23 2026, 3,881 days).

## Section order (landing page)
1. Header — "NO DAYS OFF" title + streak statistics
2. Foreword — personal narrative
3. Notable Runs — longest runs table
4. Statistics — annual mileage, workout timing, distances, equipment, pace, heart rate, temperature, weather
5. Geography — countries and US states visited with mileage data
6. Daily Log — streak year breakdowns (Year 1–11)
7. Footer — copyright + data sources

## Fonts
- Jost (Owen Earl)
- Tamzen (sunaku, based on Tamsyn by Scott Fial) — monospace

## Framework
Unknown from static HTML. Needs browser inspection.

## Open questions (need Chrome MCP)
- User said "multiple first-level tabs" — WebFetch didn't surface a tab bar. Possibly:
  (a) in-section tab controls (e.g., Statistics sub-tabs), or
  (b) tabs only rendered via JS.
  Resolve in Phase 1 once Chrome is available.
- Exact computed design tokens (colors, spacing, typography scale).
- Interaction model per section (scroll-driven vs click).

## User-provided scope (2026-04-16)
- Clone landing page + every first-level tab.
- Aggregate activity data by BOTH timeline and country/city.
- GPX files + photos will be supplied later; scaffold placeholders.
- Pure emulation, mock data acceptable; no real backend.
