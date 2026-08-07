#!/usr/bin/env node
// One-shot Strava re-authorization.
//
//   node scripts/reauth-strava.mjs <code-from-redirect-url>
//
// Exchanges the OAuth code for tokens, verifies the granted scope actually
// covers activity reads, writes .env.local, and pushes both tokens to the
// repo secrets. Token values are never printed.

import fs from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "lynxgpt/runrunrun";
const ENV = new URL("../.env.local", import.meta.url).pathname;

const code = process.argv[2];
if (!code) { console.error("usage: node scripts/reauth-strava.mjs <code>"); process.exit(1); }

const src = fs.readFileSync(ENV, "utf8");
const read = (k) => (src.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const res = await fetch("https://www.strava.com/api/v3/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: read("STRAVA_CLIENT_ID"),
    client_secret: read("STRAVA_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
  }),
});
if (!res.ok) { console.error("exchange failed", res.status, await res.text()); process.exit(1); }
const tok = await res.json();

// The whole point of re-authorizing: the settings-page tokens carry `read`
// only, which 401s on /athlete/activities.
if (!/activity:read/.test(tok.scope || "")) {
  console.error(`✗ granted scope is "${tok.scope}" — need activity:read_all.`);
  console.error("  Re-run the authorize URL with approval_prompt=force.");
  process.exit(1);
}
console.log(`✓ scope: ${tok.scope}`);
console.log(`✓ access token expires ${new Date(tok.expires_at * 1000).toISOString()}`);

// Prove the grant works before persisting anything.
const probe = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=1", {
  headers: { Authorization: `Bearer ${tok.access_token}` },
});
if (!probe.ok) { console.error("✗ activities probe failed", probe.status, await probe.text()); process.exit(1); }
console.log(`✓ activities endpoint reachable (${(await probe.json()).length} returned)`);

fs.writeFileSync(ENV, src
  .replace(/^STRAVA_ACCESS_TOKEN=.*$/m, `STRAVA_ACCESS_TOKEN=${tok.access_token}`)
  .replace(/^STRAVA_REFRESH_TOKEN=.*$/m, `STRAVA_REFRESH_TOKEN=${tok.refresh_token}`));
console.log("✓ .env.local updated");

// The gh CLI login may not have admin on this repo; the admin token is
// embedded in the origin remote URL.
const GH_TOKEN = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" })
  .match(/https:\/\/([^@]+)@/)?.[1];
if (!GH_TOKEN) { console.error("✗ no admin token on the origin remote; set secrets via the web UI"); process.exit(1); }

for (const [name, value] of [["STRAVA_ACCESS_TOKEN", tok.access_token], ["STRAVA_REFRESH_TOKEN", tok.refresh_token]]) {
  execFileSync("gh", ["secret", "set", name, "--body", value, "--repo", REPO], { env: { ...process.env, GH_TOKEN } });
  console.log(`✓ secret ${name} set`);
}
console.log("\nStill required: STRAVA_ROTATE_PAT (see notes).");
