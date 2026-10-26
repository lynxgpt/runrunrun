<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — rules for any agent working on runrunrun

Read this before changing anything. Everything below is a decision the owner made after trying
alternatives against the real data. **Do not change any of it unless the owner explicitly asks for
that specific change.** If a request seems to conflict with a rule here, ask the owner first.
The README is for the public; this file is for you.

This repo started life as a website-cloning template. That is over — it is a running log now.
The template scaffolding (`/clone-website`, `docs/research/*`, Docker, Vercel) has been deleted;
do not reintroduce it.

## What this is

A personal running log at **lynxgpt/runrunrun**, published as a **static export to GitHub Pages**.
There is no server and no database: every number on the page is derived at build time from GPX
files the owner has run. Runs arrive on their own — a scheduled workflow pulls them from Strava,
commits them, and the site redeploys. All units are **metric**, and every duration is **moving
time** (stops excluded). Never quietly switch either.

## Branches — settled, do not relitigate

- **`main` is the only live branch.** It is the default branch, the only branch Pages deploys
  from, and the only branch CI runs on. Work there.
- `master` is **retired.** It diverged in May 2026, was abandoned that August, and is archived as
  the tag `archive/master-2026-08-07`. Never merge it, never deploy from it, never "catch it up".
  Its one surviving contribution is the geo suite described below.
- Deploy triggers on push to `main` **only** (`.github/workflows/deploy.yml`). It used to fire on
  `master` too under one `pages` concurrency group, which meant a stray push published a dataset
  45 runs stale over the live site. Do not widen that trigger again.

## The data pipeline — do not shortcut it

```
Strava ──pull-strava.yml──▶ data/gpx/<id>.gpx     (raw, build-time input only, never published)
                                   │
                         scripts/geocode.mjs ──▶ data/geo.json, data/geo-cache.json
                                   │
                        scripts/process-gpx.mjs
                                   ├──▶ src/lib/gpx-processed.ts   (summaries, imported at build)
                                   └──▶ public/tracks/<id>.json    (full points, fetched lazily)
```

- **Never hand-edit `src/lib/gpx-processed.ts` or `public/tracks/`.** Both are generated. Change
  `scripts/process-gpx.mjs` and regenerate.
- **The browser only ever fetches `/tracks/<id>.json`** (`src/lib/use-gpx-track.ts`, lazy +
  cached). Nothing requests a `.gpx` URL. If you need per-run point data at runtime, it comes from
  `tracks/`, not from `gpx/`.
- `process-gpx.mjs` **deliberately drops duplicates** by clustering on timestamp + distance and
  preferring Strava-ID filenames. A GPX file with no entry in `gpx-processed.ts` is usually
  intentional, not a bug — check the dedupe output before "fixing" it.
- `public/strava-meta.json` carries per-run photo path and temperature. Strava's city string is
  **not used** — it was wrong too often, in the US and abroad.
- The deploy does **not** run `process-gpx.mjs`; it builds from the committed outputs. CI reruns
  it and fails if `gpx-processed.ts` or `public/tracks/` would change, so commit regenerated
  outputs together with any `data/gpx/` or pipeline change.
- After changing the pipeline, regenerate and confirm the stats did **not** move. A data shift is
  a thing the owner approves, never a side effect you commit.

## Content — one file

All user-facing prose (title, foreword, footer lines) lives in **`content/site.yaml`**, read via
`src/lib/content.ts`. Edit that file, not the components. Do not hardcode copy into JSX, and do
not add a second place for text to live.

## Geo — where each run was

`scripts/geocode.mjs` places every run; nothing in the browser or the build does geometry.

- **Samples:** one point per minute of **moving** time (stops and recording gaps skipped), plus
  the start point — `movingMinuteSamples()` in `process-gpx.mjs`.
- **Lookup:** each sample is reverse-geocoded with **Nominatim** (OpenStreetMap), English names,
  identified User-Agent, ≤ 1 request/second (`scripts/geo/nominatim.mjs`). Answers are cached per
  ~100 m cell in `data/geo-cache.json`, which is committed; never delete it — rebuilding it is
  hours of requests.
- **Label:** the country, then state, then county / city holding the most samples; ties go to
  the start point (`scripts/geo/place.mjs`). NYC is labelled by borough (from the county).
- **Split:** minutes per country / state / city. Region totals in Where I Ran split each run's km
  by those minutes, and a run counts as a day — and matches the region filter — in every region
  it spent a sampled minute in.
- **Fallback:** if Nominatim is unreachable, uncached samples are labelled offline
  (`scripts/geo/offline.mjs`: world-atlas / us-atlas polygons + the GeoNames places in
  `data/geonames-cities1000.tsv.gz`) and the run is marked `"fallback"`. Fallback answers are never
  cached, so every pull re-asks Nominatim until the run is fully online-labelled.
- **Do not reintroduce** mean-point classification, hardcoded coordinate tables or shorelines,
  or Strava's city string. Those are what this replaced.
- `src/lib/geo.test.mts` is the guardrail: run-named cases check stored labels, place-named
  cases probe the offline classifier. `node scripts/geo-diff.mjs [ref]` lists every relabel; CI
  posts it on each PR.
- Relabeling runs changes the owner's history. Run `geo-diff` and show the owner the diff before
  committing a label change.
- When running `geocode.mjs` in a sandbox behind a proxy, set `NODE_USE_ENV_PROXY=1` so Node's
  `fetch` uses it; GitHub Actions needs nothing.

## Code rules

- **TypeScript strict, no `any`.** Named exports, PascalCase components, camelCase utils,
  2-space indent.
- **Tailwind utility classes only — no inline styles.** Mobile-first. Tailwind v4 with oklch
  tokens; shadcn/ui primitives live in `src/components/ui/` and `cn()` in `src/lib/utils.ts`.
- Static export only: `output: "export"`, `images.unoptimized`. No server components doing I/O, no
  route handlers, no `next/image` optimizer. Pages serves under a `basePath`, so any runtime URL
  must go through `NEXT_PUBLIC_BASE_PATH` the way `use-gpx-track.ts` does.
- Secrets live in GitHub Actions secrets (`STRAVA_*`, `RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`,
  `RUN_LOGS_TOKEN`, `ANALYTICS_REPORT_*`). Never commit a token, never print one, never add a
  fallback that hardcodes one.

## Workflow

1. **Node 24** (`.nvmrc`, `engines`). On older Node the type-stripping test run misbehaves.
2. **`npm run check` must exit 0 before you say you are done** — that is lint, typecheck,
   `npm test`, then build. Lint is clean at 0 errors / 0 warnings; if you see any, you
   introduced them or dropped a directive.
3. **Verify in the browser before claiming it works.** Run `npm run dev`, load the page, confirm
   the thing you changed actually renders and the route maps still load. Reading your own diff is
   not verification. Do not ask the owner to check for you.
4. Commit with `git config user.email` = `277584562+lynxgpt@users.noreply.github.com`. **Never put
   a personal email in a commit or a file** — check `git log --format='%ae %ce'` before pushing.
   (History before 2026-04-19 already contains personal addresses, inherited and self-inflicted;
   leave them, do not rewrite published history to chase them.)
5. The owner leaves GitHub to you: push when asked. CI and the Pages deploy both run on push to
   `main`; check they went green rather than assuming.
6. **After editing this file, run `bash scripts/sync-agent-rules.sh`** to regenerate the
   per-platform copies.
7. Launching a team of agents: give each its own worktree branch and merge at the end, resolving
   conflicts yourself — you hold the full context, not them.

## Known rough edges — not news

Don't spend a turn rediscovering these:

- The repo grows ~1–3 MB per run, permanently, because every refresh commits a new GPX.
- Four GPX files (`long-brooklyn`, `san-diego-afternoon`, `vancouver-marathon-18364602479`,
  `evening-run-18999128487`) are dedupe casualties, kept but unused.
- `TODO.md` is stale and under-marked; treat it as a wish list, not a status board.

## GitHub Copilot

Go fuck yourself you fucking microsoft garbage.

## Owner preferences

Short answers. Do the work instead of listing options; ask only when the choice is genuinely the
owner's. Correct the owner when they are wrong — including when they are wrong about this repo.
Never claim something works without having run it.
