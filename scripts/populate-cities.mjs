#!/usr/bin/env node
// One-time script: classify city for every existing track and write into
// strava-meta.json. After this, process-gpx.mjs picks up the city field
// and writes it into gpx-processed.ts so the site shows it immediately.
//
// Run once: node scripts/populate-cities.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const META_PATH = join(ROOT, "public", "strava-meta.json");
const PROCESSED_PATH = join(ROOT, "src", "lib", "gpx-processed.ts");

// ── City bboxes (same values that were in CITY_REGIONS) ──────────────────────
const CITY_BBOXES = [
  { city: "Brooklyn",      minLat: 40.55, maxLat: 40.74, minLon: -74.05, maxLon: -73.83 },
  { city: "Queens",        minLat: 40.54, maxLat: 40.80, minLon: -73.96, maxLon: -73.70 },
  { city: "Bronx",         minLat: 40.80, maxLat: 40.92, minLon: -73.93, maxLon: -73.76 },
  { city: "Staten Island", minLat: 40.48, maxLat: 40.65, minLon: -74.27, maxLon: -74.05 },
  { city: "San Diego",     minLat: 32.60, maxLat: 33.15, minLon: -117.40, maxLon: -116.85 },
  { city: "San Francisco", minLat: 37.65, maxLat: 37.85, minLon: -122.55, maxLon: -122.35 },
  { city: "Los Angeles",   minLat: 33.70, maxLat: 34.35, minLon: -118.70, maxLon: -118.15 },
  { city: "Denver",        minLat: 39.60, maxLat: 39.90, minLon: -105.15, maxLon: -104.80 },
  { city: "Seattle",       minLat: 47.40, maxLat: 47.80, minLon: -122.50, maxLon: -122.20 },
  { city: "Boston",        minLat: 42.20, maxLat: 42.45, minLon: -71.20, maxLon: -70.95 },
  { city: "Mexico City",   minLat: 19.18, maxLat: 19.60, minLon: -99.35, maxLon: -98.95 },
  { city: "Guadalajara",   minLat: 20.55, maxLat: 20.80, minLon: -103.55, maxLon: -103.20 },
  { city: "Cancún",        minLat: 20.90, maxLat: 21.30, minLon: -87.15, maxLon: -86.70 },
  { city: "Los Cabos",     minLat: 22.80, maxLat: 23.20, minLon: -110.00, maxLon: -109.60 },
  { city: "Oaxaca",        minLat: 17.00, maxLat: 17.20, minLon: -96.80, maxLon: -96.60 },
  { city: "Vancouver",     minLat: 49.00, maxLat: 49.40, minLon: -123.30, maxLon: -122.60 },
  { city: "Toronto",       minLat: 43.55, maxLat: 43.90, minLon: -79.65, maxLon: -79.10 },
  { city: "Montreal",      minLat: 45.40, maxLat: 45.70, minLon: -73.95, maxLon: -73.45 },
];

// ── Manhattan geometry (mirrors gpx-stats.ts) ─────────────────────────────────
const MANHATTAN_EAST_SHORE = [
  [40.700, -74.010], [40.702, -73.998], [40.707, -73.994], [40.712, -73.989],
  [40.719, -73.979], [40.727, -73.977], [40.737, -73.974], [40.750, -73.971],
  [40.759, -73.967], [40.769, -73.960], [40.775, -73.954], [40.783, -73.948],
  [40.793, -73.943], [40.803, -73.938], [40.814, -73.934], [40.826, -73.930],
  [40.841, -73.926], [40.857, -73.920], [40.869, -73.916], [40.878, -73.910],
];
const MANHATTAN_WEST_BOUNDARY = [
  [40.700, -74.021], [40.727, -74.022], [40.750, -74.022], [40.765, -74.021],
  [40.780, -74.017], [40.800, -73.997], [40.830, -73.965], [40.860, -73.942],
  [40.878, -73.929],
];

function interpolatePiecewise(table, lat) {
  if (lat <= table[0][0]) return table[0][1];
  if (lat >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [lat0, lon0] = table[i];
    const [lat1, lon1] = table[i + 1];
    if (lat >= lat0 && lat <= lat1) {
      const t = (lat - lat0) / (lat1 - lat0);
      return lon0 + t * (lon1 - lon0);
    }
  }
  return table[0][1];
}

function classifyManhattanZone(lat, lon) {
  const MAN_LAT_MIN = 40.700, MAN_LAT_MAX = 40.880;
  if (lat < MAN_LAT_MIN || lat > MAN_LAT_MAX) return null;
  if (lon < interpolatePiecewise(MANHATTAN_WEST_BOUNDARY, lat)) return null;
  const eastLon = interpolatePiecewise(MANHATTAN_EAST_SHORE, lat);
  if (lon <= eastLon) return "Manhattan";
  return lat > 40.726 ? "Queens" : "Brooklyn";
}

function classifyCity(lat, lon) {
  if (lat == null || lon == null) return null;

  // Manhattan zone first (Manhattan / inner Brooklyn / Queens)
  const mZone = classifyManhattanZone(lat, lon);
  if (mZone) return mZone;

  // Bbox table for all other cities (including outer boroughs)
  for (const r of CITY_BBOXES) {
    if (lat >= r.minLat && lat <= r.maxLat && lon >= r.minLon && lon <= r.maxLon) {
      return r.city;
    }
  }

  return null;
}

// ── Parse gpx-processed.ts for track summaries ───────────────────────────────
// Extract the JSON blob from the TS source (it's a plain JS object literal).
const src = readFileSync(PROCESSED_PATH, "utf8");
const match = src.match(/export const gpxSummaries[^=]*=\s*(\{[\s\S]*\});?\s*$/);
if (!match) { console.error("Could not parse gpx-processed.ts"); process.exit(1); }
// Evaluate safely via Function (no external deps needed)
const summaries = Function('"use strict"; return (' + match[1] + ')')();

// ── Load existing strava-meta.json ────────────────────────────────────────────
const meta = existsSync(META_PATH)
  ? JSON.parse(readFileSync(META_PATH, "utf8"))
  : {};

// ── Classify each track ───────────────────────────────────────────────────────
let updated = 0;
for (const [id, summary] of Object.entries(summaries)) {
  if (meta[id]?.city != null) continue; // already set, skip

  const { meanLat, meanLon, startLat, startLon, bbox } = summary.stats;
  const lat = meanLat ?? (bbox.minLat + bbox.maxLat) / 2;
  const lon = meanLon ?? (bbox.minLon + bbox.maxLon) / 2;

  let city = classifyCity(lat, lon);
  // If mean is in water (no city found), try start point
  if (!city && startLat != null && startLon != null) {
    city = classifyCity(startLat, startLon);
  }

  if (city) {
    if (!meta[id]) meta[id] = {};
    meta[id].city = city;
    updated++;
    console.log(`  ${id} → ${city}`);
  }
}

writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
console.log(`\nDone. Updated ${updated} tracks in strava-meta.json`);
