# runrunrun

A static running log built with Next.js and published on GitHub Pages.

The site reads GPX files from `data/gpx/`, preprocesses them into lightweight summaries plus per-run JSON payloads, and renders a personal run archive with maps, charts, geography, and daily log views.

## What This Repo Contains

- A Next.js 16 app with static export enabled
- GPX source files in `data/gpx/` (build input only; not published)
- Where each run was, in `data/geo.json` (plus the lookup cache `data/geo-cache.json`)
- Generated track payloads in `public/tracks/`
- Editable site copy in `content/site.yaml`
- A GitHub Actions workflow that builds and deploys the site to GitHub Pages

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run check
node scripts/geocode.mjs
node scripts/process-gpx.mjs
node scripts/geo-diff.mjs
```

## Updating The Content

### Add or replace runs

1. Drop `.gpx` files into `data/gpx/`
2. Run `node scripts/geocode.mjs`, then `node scripts/process-gpx.mjs`
3. Commit the GPX files together with the regenerated `data/geo*.json`, `src/lib/gpx-processed.ts` and `public/tracks/`, and push

The daily Strava pull does all of this on its own. CI fails if the committed outputs are stale.

### Where each run was

`scripts/geocode.mjs` places each run with OpenStreetMap's Nominatim service (cached per ~100 m in
`data/geo-cache.json`). A run whose route touches New York City is looked up once per minute of
moving time and labelled with the place holding most of its minutes, and region totals split its
distance by minutes spent in each place. Every other run is looked up once, at its start point. If Nominatim is unreachable, an offline fallback (world/US boundaries plus GeoNames
places) labels the run until the next pull retries it.

### Edit the visible text

Change `content/site.yaml` to update:

- the header title
- the foreword text
- the footer links
- the note under the geography table

## Deployment

This repo is configured for GitHub Pages using a GitHub Actions workflow in `.github/workflows/deploy.yml`.

When changes are pushed to `main`, GitHub Actions:

1. installs dependencies
2. builds the static export from the committed processed data
3. deploys the `out/` directory to GitHub Pages

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4

## Data credits

- Place names © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), via Nominatim
- Offline place names: [GeoNames](https://www.geonames.org/), CC BY 4.0

## License

MIT
