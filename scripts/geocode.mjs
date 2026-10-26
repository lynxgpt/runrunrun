#!/usr/bin/env node
// Label every run in data/gpx with where it was run.
//
// Each run is sampled once per minute of moving time (plus its start point).
// Every sample is reverse-geocoded — from data/geo-cache.json when that ~100 m
// cell is already known, otherwise from Nominatim. The run's label is the
// country / state / county / city holding the most samples (ties go to the
// start point); its split is the minutes spent in each city, which the site
// uses for region totals.
//
// If Nominatim is unreachable, uncached samples use the offline fallback
// (scripts/geo/offline.mjs) and the run is marked "fallback". Fallback
// answers are never cached, so the next run of this script asks Nominatim
// again. Writes data/geo.json; process-gpx.mjs folds it into the summaries.
//
// Usage: node scripts/geocode.mjs [--offline]
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTrkpts, movingMinuteSamples } from "./process-gpx.mjs";
import { reverse, NominatimUnavailable } from "./geo/nominatim.mjs";
import { offlineAddress } from "./geo/offline.mjs";
import { cellKey, loadCache, saveCache } from "./geo/cache.mjs";
import { normalize, summarize } from "./geo/place.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GPX_DIR = join(ROOT, "data", "gpx");
const CACHE_PATH = join(ROOT, "data", "geo-cache.json");
const GEO_PATH = join(ROOT, "data", "geo.json");

async function main() {
  let online = !process.argv.includes("--offline");
  const cache = loadCache(CACHE_PATH);
  const previous = existsSync(GEO_PATH) ? JSON.parse(readFileSync(GEO_PATH, "utf8")) : {};
  const files = readdirSync(GPX_DIR).filter((f) => f.toLowerCase().endsWith(".gpx")).sort();
  const out = {};
  let fetched = 0;

  for (const f of files) {
    const id = f.replace(/\.gpx$/i, "");
    const samples = movingMinuteSamples(parseTrkpts(readFileSync(join(GPX_DIR, f), "utf8")));
    let usedFallback = false;
    const places = [];
    for (const s of samples) {
      const key = cellKey(s.lat, s.lon);
      let addr = cache[key];
      if (addr === undefined && online) {
        const [lat, lon] = key.split(",").map(Number);
        try {
          addr = await reverse(lat, lon);
          cache[key] = addr;
          if (++fetched % 50 === 0) saveCache(CACHE_PATH, cache);
        } catch (e) {
          if (!(e instanceof NominatimUnavailable)) throw e;
          console.warn(`Nominatim unavailable (${e.message}); using the offline fallback.`);
          online = false;
        }
      }
      if (addr === undefined) {
        addr = offlineAddress(s.lat, s.lon);
        usedFallback = true;
      }
      places.push(normalize(addr));
    }
    const { label, split } = summarize(places);
    out[id] = { status: usedFallback ? "fallback" : "nominatim", samples: samples.length, label, split };
    const before = previous[id]?.label;
    if (JSON.stringify(before) !== JSON.stringify(label)) {
      const fmt = (l) => (l ? [l.city, l.county, l.stateCode ?? l.state, l.countryCode].filter(Boolean).join(", ") : "—");
      console.log(`${id}: ${before === undefined ? "new" : fmt(before)} → ${fmt(label)}${usedFallback ? " (fallback)" : ""}`);
    }
  }

  saveCache(CACHE_PATH, cache);
  writeFileSync(GEO_PATH, JSON.stringify(out, null, 1) + "\n");
  const fallback = Object.values(out).filter((r) => r.status === "fallback").length;
  console.log(`${files.length} runs labelled, ${fetched} Nominatim lookups, ${fallback} on fallback`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
