#!/usr/bin/env node
// Preprocess GPX files under public/gpx into:
//   1. src/lib/gpx-processed.ts  — SUMMARIES only (stats + metadata, no points)
//   2. public/tracks/<id>.json   — full per-track payload (points, bbox), lazy-loaded by the UI
//
// Splitting the heavy point data out of the TS bundle keeps the dev/build
// toolchain happy (V8 OOMs on the 28MB mega-file we used to ship) and lets
// the client fetch only the tracks it actually renders.
//
// Everything remains metric-only and moving-time aware:
//   - distance in km, elevation in m, pace in sec/km
//   - moving-time rule: adjacent trkpts count as "moving" iff
//     dt ≤ MAX_SAMPLE_GAP_SEC AND avg speed ≥ MIN_MOVING_MPS.
//
// Usage: node scripts/process-gpx.mjs

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GPX_DIR = join(ROOT, "public", "gpx");
const TRACKS_DIR = join(ROOT, "public", "tracks");
const OUT_TS = join(ROOT, "src", "lib", "gpx-processed.ts");

const TARGET_POINTS = 500;
const MAX_SAMPLE_GAP_SEC = 15;
const MIN_MOVING_MPS = 0.4;

function haversineKm(a, b) {
  const R = 6371.0088;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function parseTrkpts(xml) {
  const pts = [];
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const body = m[3];
    const ele = matchFloat(body, /<ele>([^<]+)<\/ele>/);
    const time = matchStr(body, /<time>([^<]+)<\/time>/);
    const hr = matchFloat(body, /<gpxtpx:hr>([^<]+)<\/gpxtpx:hr>/);
    pts.push({ lat, lon, ele, time, hr });
  }
  return pts;
}

function matchFloat(s, re) {
  const m = s.match(re);
  return m ? parseFloat(m[1]) : null;
}
function matchStr(s, re) {
  const m = s.match(re);
  return m ? m[1] : null;
}

function downsample(points, target) {
  if (points.length <= target) return points.slice();
  const step = points.length / target;
  const out = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

function aggregate(points, gpxName) {
  let totalKm = 0;
  let movingSec = 0;
  let gainM = 0;
  let sumLat = 0;
  let sumLon = 0;

  for (let i = 0; i < points.length; i++) {
    sumLat += points[i].lat;
    sumLon += points[i].lon;
  }

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segKm = haversineKm(a, b);
    totalKm += segKm;

    if (a.time && b.time) {
      const dt = (Date.parse(b.time) - Date.parse(a.time)) / 1000;
      if (dt > 0 && dt <= MAX_SAMPLE_GAP_SEC) {
        const mps = (segKm * 1000) / dt;
        if (mps >= MIN_MOVING_MPS) movingSec += dt;
      }
    }

    if (b.ele != null && a.ele != null) {
      const dEle = b.ele - a.ele;
      if (dEle > 0) gainM += dEle;
    }
  }

  const t0 = points[0].time ? Date.parse(points[0].time) : null;
  const t1 = points[points.length - 1].time ? Date.parse(points[points.length - 1].time) : null;
  const elapsedSec = t0 && t1 ? Math.round((t1 - t0) / 1000) : null;

  const hrs = points.map((p) => p.hr).filter((v) => typeof v === "number");
  const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;

  const movingSecRounded = Math.round(movingSec);
  const paceSecPerKm =
    movingSecRounded > 0 && totalKm > 0.1 ? Math.round(movingSecRounded / totalKm) : null;

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const bbox = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };

  return {
    name: gpxName,
    distanceKm: +totalKm.toFixed(3),
    movingSec: movingSecRounded,
    elapsedSec,
    paceSecPerKm,
    elevationM: Math.round(gainM),
    avgHr,
    startTime: points[0]?.time ?? null,
    endTime: points[points.length - 1]?.time ?? null,
    startLat: +points[0].lat.toFixed(6),
    startLon: +points[0].lon.toFixed(6),
    meanLat: +(sumLat / points.length).toFixed(6),
    meanLon: +(sumLon / points.length).toFixed(6),
    bbox,
  };
}

function processFile(path, id) {
  const xml = readFileSync(path, "utf8");
  const name = matchStr(xml, /<trk>\s*<name>([^<]+)<\/name>/) ?? id;
  const all = parseTrkpts(xml);
  if (!all.length) throw new Error(`No trkpt in ${path}`);
  const stats = aggregate(all, name);
  const sampled = downsample(all, TARGET_POINTS);
  const cumKm = [0];
  for (let i = 1; i < sampled.length; i++) {
    cumKm.push(cumKm[i - 1] + haversineKm(sampled[i - 1], sampled[i]));
  }
  const t0Ms = sampled[0].time ? Date.parse(sampled[0].time) : null;
  const points = sampled.map((p, i) => ({
    lat: +p.lat.toFixed(6),
    lon: +p.lon.toFixed(6),
    ele: p.ele != null ? +p.ele.toFixed(1) : null,
    hr: p.hr ?? null,
    km: +cumKm[i].toFixed(3),
    t: t0Ms != null && p.time ? Math.round((Date.parse(p.time) - t0Ms) / 1000) : null,
  }));
  return { id, name, stats, rawPointCount: all.length, points };
}

// Cross-source dedup. See commentary below.
const DEDUP_WINDOW_SEC = 120;
const DEDUP_DIST_TOL = 0.5;

function isStravaId(id) {
  return /-\d{8,}$/.test(id);
}

function dedupe(tracks) {
  const byTime = tracks.map((t) => ({
    ts: t.stats.startTime ? Date.parse(t.stats.startTime) / 1000 : null,
    track: t,
  }));
  byTime.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));

  const clusters = [];
  for (const entry of byTime) {
    const last = clusters[clusters.length - 1];
    if (
      last &&
      entry.ts != null &&
      last[0].ts != null &&
      Math.abs(entry.ts - last[0].ts) <= DEDUP_WINDOW_SEC &&
      Math.abs(entry.track.stats.distanceKm - last[0].track.stats.distanceKm) <= DEDUP_DIST_TOL
    ) {
      last.push(entry);
    } else {
      clusters.push([entry]);
    }
  }

  const kept = [];
  const dropped = [];
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      kept.push(cluster[0].track);
      continue;
    }
    const ranked = cluster.slice().sort((a, b) => {
      const sa = isStravaId(a.track.id) ? 0 : 1;
      const sb = isStravaId(b.track.id) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const pa = a.track.rawPointCount ?? 0;
      const pb = b.track.rawPointCount ?? 0;
      if (pa !== pb) return pb - pa;
      return a.track.id < b.track.id ? -1 : 1;
    });
    kept.push(ranked[0].track);
    for (const r of ranked.slice(1))
      dropped.push({ kept: ranked[0].track.id, dropped: r.track.id });
  }
  return { kept, dropped };
}

function main() {
  const files = readdirSync(GPX_DIR).filter((f) => f.toLowerCase().endsWith(".gpx"));
  if (!files.length) {
    console.error("No .gpx files found in public/gpx/");
    process.exit(1);
  }

  // Rebuild tracks dir from scratch so stale entries don't linger.
  if (existsSync(TRACKS_DIR)) rmSync(TRACKS_DIR, { recursive: true, force: true });
  mkdirSync(TRACKS_DIR, { recursive: true });

  const allTracks = files.map((f) => {
    const id = f.replace(/\.gpx$/i, "");
    console.log(`Processing ${f}...`);
    return processFile(join(GPX_DIR, f), id);
  });
  const { kept: tracks, dropped } = dedupe(allTracks);
  if (dropped.length) {
    console.log(`\nDeduped ${dropped.length} duplicate track(s):`);
    for (const d of dropped) console.log(`  ${d.dropped} → matches ${d.kept} (skipped)`);
    console.log("");
  }

  // Write per-track JSON payloads (full-resolution sampled points + bbox).
  for (const t of tracks) {
    const payload = {
      id: t.id,
      name: t.name,
      stats: t.stats,
      points: t.points,
    };
    writeFileSync(join(TRACKS_DIR, `${t.id}.json`), JSON.stringify(payload));
  }

  // Write the summary TS module — lightweight enough to bundle.
  const summaries = Object.fromEntries(
    tracks.map((t) => [t.id, { id: t.id, name: t.name, stats: t.stats }]),
  );
  const header = `// AUTO-GENERATED by scripts/process-gpx.mjs — do not edit.
// Metric-only. Duration uses MOVING time (stops excluded).
//
// Full per-track point data lives at /tracks/<id>.json and is loaded
// lazily by the client (see use-gpx-track.ts). This module ships ONLY
// the summary stats so the TS bundle stays small.

export interface GpxPoint {
  t: number | null; // seconds from track start (null if no timestamps in GPX)
  lat: number;
  lon: number;
  ele: number | null;
  hr: number | null;
  km: number;
}

export interface GpxStats {
  name: string;
  distanceKm: number;
  movingSec: number;
  elapsedSec: number | null;
  paceSecPerKm: number | null;
  elevationM: number;
  avgHr: number | null;
  startTime: string | null;
  endTime: string | null;
  startLat?: number;
  startLon?: number;
  meanLat?: number;
  meanLon?: number;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

export interface GpxSummary {
  id: string;
  name: string;
  stats: GpxStats;
}

export interface GpxTrack extends GpxSummary {
  points: GpxPoint[];
}

export const gpxSummaries: Record<string, GpxSummary> = ${JSON.stringify(
    summaries,
    null,
    2,
  )};
`;

  writeFileSync(OUT_TS, header);
  console.log(
    `Wrote ${OUT_TS} (${tracks.length} summaries) and ${tracks.length} files in public/tracks/`,
  );
  for (const t of tracks) {
    const pace = t.stats.paceSecPerKm
      ? `${Math.floor(t.stats.paceSecPerKm / 60)}:${String(t.stats.paceSecPerKm % 60).padStart(2, "0")}/km`
      : "?";
    console.log(
      `  ${t.id}: ${t.stats.distanceKm.toFixed(2)} km, moving ${Math.round(t.stats.movingSec / 60)}min, +${t.stats.elevationM}m, ${pace}`,
    );
  }
}

main();
