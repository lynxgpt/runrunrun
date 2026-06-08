# runrunrun

A static running log built with Next.js and published on GitHub Pages.

The site reads GPX files from `public/gpx/`, preprocesses them into lightweight summaries plus per-run JSON payloads, and renders a personal run archive with maps, charts, geography, and daily log views.

## What This Repo Contains

- A Next.js 16 app with static export enabled
- GPX source files in `public/gpx/`
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
node scripts/process-gpx.mjs
```

## Updating The Content

### Add or replace runs

1. Drop `.gpx` files into `public/gpx/`
2. Run `node scripts/process-gpx.mjs` locally if you want to preview the processed output
3. Commit and push

On GitHub, the deploy workflow also reprocesses all GPX files before building the static site.

### Edit the visible text

Change `content/site.yaml` to update:

- the header title
- the foreword text
- the footer links

## Deployment

This repo is configured for GitHub Pages using a GitHub Actions workflow in `.github/workflows/deploy.yml`.

When changes are pushed to `main`, GitHub Actions:

1. installs dependencies
2. processes all GPX files
3. builds the static export
4. deploys the `out/` directory to GitHub Pages

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4

## License

MIT
