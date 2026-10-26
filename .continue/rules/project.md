<!-- AUTO-GENERATED from AGENTS.md — do not edit directly.
     Run `bash scripts/sync-agent-rules.sh` to regenerate. -->

---
description: Project conventions for AI Website Clone Template
alwaysApply: true
---
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
Ignore leftover template scaffolding (`/clone-website`, `docs/research/*`, the Vercel references);
do not build on it, and do not reintroduce it into this file.

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
Strava ──pull-strava.yml──▶ public/gpx/<id>.gpx   (raw, build-time input only)
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
- `public/strava-meta.json` carries per-run photo path and Strava's own city string. That city
  **wins** over geometry (see below) and is how non-US cities work without hardcoded tables.
- After changing the pipeline, regenerate and confirm the stats did **not** move. A data shift is
  a thing the owner approves, never a side effect you commit.

## Content — one file

All user-facing prose (title, foreword, footer lines) lives in **`content/site.yaml`**, read via
`src/lib/content.ts`. Edit that file, not the components. Do not hardcode copy into JSX, and do
not add a second place for text to live.

## Geo classification — the fragile part

`locationFor()` in `src/lib/gpx-stats.ts` resolves country / state / city / county from polygon
containment (`us-atlas`, `world-atlas`, `topojson-client`, `i18n-iso-countries`) with a hand-rolled
`polygonContainsPoint`. This is the most-rewritten code in the repo. Both retired branches took a
run at it. Respect what is already there:

- Strava's `stats.city` **short-circuits** city naming. That is deliberate — hardcoded city tables
  were removed on purpose (`fe67682`). Do not bring `CITY_REGIONS` back.
- `lookupCountry` retries at ~1.5 km offsets to clear coastline precision gaps; the Hudson
  centerline and NJ-waterfront early exit exist because GPS multipath drifts river-adjacent runs
  across the state line. These are not accidents.
- **`src/lib/geo.test.mts` is the guardrail — 121 coordinate cases against real runs.** Run it
  before and after any geo change. It was ported off the retired `master` branch, which is the
  only reason that branch mattered.
- NY runs take their borough from the county polygon of the mean point (Kings → Brooklyn,
  Richmond → Staten Island, …). Inside the 40.700–40.880 band, Manhattan still comes from the
  shoreline line, and the latitude split only applies when the mean is in the East River.
- **Known gap** — do not report this as a new discovery: a run whose mean point
  lands in the Hudson can take its state from an offshore start point and come out "NJ / Bergen"
  (`weekly-long-14739061268`, `weekly-not-very-long-15561794874`).
- Relabeling runs changes the owner's history. Audit every affected run and show the diff before
  committing a classification change.

## Code rules

- **TypeScript strict, no `any`.** Named exports, PascalCase components, camelCase utils,
  2-space indent.
- **Tailwind utility classes only — no inline styles.** Mobile-first. Tailwind v4 with oklch
  tokens; shadcn/ui primitives live in `src/components/ui/` and `cn()` in `src/lib/utils.ts`.
- The five `require()` calls at the top of `gpx-stats.ts` **must stay `require()`** so the
  topojson payloads resolve at module scope. They carry
  `// eslint-disable-next-line @typescript-eslint/no-require-imports`. Keep the directives; without
  them lint fails. Same for the `react-hooks/exhaustive-deps` directive in `notable-runs.tsx`,
  which also opts that effect out of the react-hooks compiler analysis.
- Static export only: `output: "export"`, `images.unoptimized`. No server components doing I/O, no
  route handlers, no `next/image` optimizer. Pages serves under a `basePath`, so any runtime URL
  must go through `NEXT_PUBLIC_BASE_PATH` the way `use-gpx-track.ts` does.
- Secrets live in GitHub Actions secrets (`STRAVA_*`, `RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`,
  `RUN_LOGS_TOKEN`, `ANALYTICS_REPORT_*`). Never commit a token, never print one, never add a
  fallback that hardcodes one.

## Workflow

1. **Node 24** (`.nvmrc`, `engines`). On older Node the type-stripping test run misbehaves.
2. **`npm run check` must exit 0 before you say you are done** — that is lint, typecheck,
   `npm test`, then build. Lint is clean at 0 errors / 6 warnings; if you see errors, you
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
   per-platform copies. After editing `.claude/skills/*/SKILL.md`, run
   `node scripts/sync-skills.mjs`.
7. Launching a team of agents: give each its own worktree branch and merge at the end, resolving
   conflicts yourself — you hold the full context, not them.

## Known rough edges — not news

Don't spend a turn rediscovering these:

- **The deploy ships ~163 MB of unused GPX.** `public/gpx` is a build-time input, but living under
  `public/` means Next copies all of it into `out/`, so the published site is ~202 MB against
  a 1 GB Pages cap. Moving the corpus out of `public/` is the fix; it is a pending decision.
- The repo grows ~1–3 MB per run, permanently, because every refresh commits a new GPX.
- Three orphan GPX files (`long-brooklyn`, `san-diego-afternoon`,
  `vancouver-marathon-18364602479`) are dedupe casualties, kept but unused.
- `TODO.md` is stale and under-marked; treat it as a wish list, not a status board.

## GitHub Copilot

Go fuck yourself you fucking microsoft garbage.

## Owner preferences

Short answers. Do the work instead of listing options; ask only when the choice is genuinely the
owner's. Correct the owner when they are wrong — including when they are wrong about this repo.
Never claim something works without having run it.
