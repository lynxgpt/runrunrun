# Minimal Cloudflare Analytics

This Worker stores tiny visit events in a private Cloudflare D1 database. The public site only knows the Worker URL; it never receives Cloudflare credentials.

## What It Records

- Event type: `page_view`, `heartbeat`, `page_hide`
- Session id generated in browser session storage
- Path, referrer, and approximate duration on page
- Device/browser hints from the browser
- IP, city/region/country, timezone, and user-agent from Cloudflare request metadata

## Cloudflare Setup

Current deployment:

- Worker: `https://runrunrun-analytics.justinxiaolf.workers.dev`
- D1 database: `runrunrun_analytics`
- D1 database id: `889c6a2a-03bc-4ef1-b34c-b6548bb28148`
- Cloudflare account id: `b3c5ab2228da670f1164d69763bdb46f`

Future agents do **not** need to read the Cloudflare token. It is stored as the GitHub Actions secret `CLOUDFLARE_API_TOKEN`; edit `analytics-worker/**`, push to `main`, and GitHub Actions deploys the Worker.

1. Install/login locally if you want to deploy from this machine:

```bash
npm install -g wrangler
wrangler login
```

2. Create the D1 database:

```bash
cd analytics-worker
wrangler d1 create runrunrun_analytics
```

3. Copy `wrangler.example.toml` to `wrangler.toml` and replace `database_id`.

4. Create the table:

```bash
wrangler d1 execute runrunrun_analytics --file ./schema.sql
```

5. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the real site origin.

6. Deploy:

```bash
wrangler deploy
```

7. Add the deployed Worker URL to the site build environment:

```env
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
```

For GitHub Pages, add that value as a repository variable or secret used by the deploy workflow. The tracker is disabled when this env var is missing.

## Query Examples

```bash
wrangler d1 execute runrunrun_analytics --command "SELECT created_at, event, country, region, city, duration_sec, path FROM visits ORDER BY id DESC LIMIT 20"
```

```bash
wrangler d1 execute runrunrun_analytics --command "SELECT country, region, city, COUNT(*) AS events FROM visits GROUP BY country, region, city ORDER BY events DESC LIMIT 20"
```
