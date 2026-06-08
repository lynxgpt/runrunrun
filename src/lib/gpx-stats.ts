// Derive analytics from whatever GPX tracks are in gpx-processed.ts.
// Add more .gpx files to public/gpx/, run `node scripts/process-gpx.mjs`,
// and the site picks them up automatically. Everything is metric, all
// durations use MOVING time (stops excluded).

import { gpxSummaries, type GpxSummary, type GpxLocation } from "./gpx-processed";
import rawMeta from "../../public/strava-meta.json";

interface StravaMeta {
  tempC?: number;
  photoPath?: string;
}
const stravaMeta = rawMeta as Record<string, StravaMeta>;
import type {
  AnnualMileage,
  GeoRow,
  HeatmapCell,
  HistogramBucket,
  NotableRun,
  NotableRunCategory,
  StreakStats,
  StreakYearHeatmap,
  WeatherCondition,
  ActivityLocation,
} from "@/types/activity";

// ---------------------------------------------------------------------------
// Track list, sorted by start time.

export const tracks: GpxSummary[] = Object.values(gpxSummaries)
  .filter((t) => t.stats.startTime)
  .sort(
    (a, b) =>
      new Date(a.stats.startTime!).getTime() - new Date(b.stats.startTime!).getTime(),
  );

function dateOf(t: GpxSummary): Date {
  return new Date(t.stats.startTime!);
}

function isoDate(d: Date): string {
  // Use Eastern Time so a run starting at 11pm UTC (7pm ET) is classified
  // on the correct calendar day, not the next UTC day.
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function niceDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Location lookup — reads from pre-computed location stored in gpx-processed.ts.
// Location detection happens at build time in scripts/process-gpx.mjs using
// real polygon data (world-atlas + topojson-client). This keeps geo libraries
// out of the client bundle entirely.

const US_STATE_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function locationFor(t: GpxSummary): ActivityLocation {
  const loc: GpxLocation = t.location ?? { countryCode: "??", country: "Unknown" };
  const { minLat, maxLat, minLon, maxLon } = t.stats.bbox;
  return {
    country: loc.country,
    countryCode: loc.countryCode,
    region: loc.region,
    city: loc.city,
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
  };
}

// ---------------------------------------------------------------------------
// Streak stats

function diffYMD(start: Date, end: Date): { years: number; months: number; days: number } {
  let y = end.getUTCFullYear() - start.getUTCFullYear();
  let m = end.getUTCMonth() - start.getUTCMonth();
  let d = end.getUTCDate() - start.getUTCDate();
  if (d < 0) {
    m -= 1;
    const prev = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    d += prev.getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { years: y, months: m, days: d };
}

const first = tracks[0] ? dateOf(tracks[0]) : new Date();
const last = tracks[tracks.length - 1] ? dateOf(tracks[tracks.length - 1]) : new Date();
const uniqueDates = new Set(tracks.map((t) => isoDate(dateOf(t))));

const totalKm = tracks.reduce((s, t) => s + t.stats.distanceKm, 0);
const totalMovingSec = tracks.reduce((s, t) => s + t.stats.movingSec, 0);
const totalElevationM = tracks.reduce((s, t) => s + t.stats.elevationM, 0);

export const streakStats: StreakStats = {
  startDate: isoDate(first),
  endDate: isoDate(last),
  totalDays: uniqueDates.size,
  totalKm: Math.round(totalKm),
  totalHours: Math.round(totalMovingSec / 3600),
  totalElevationM,
  ...diffYMD(first, last),
};

// ---------------------------------------------------------------------------
// Notable Runs

function toNotableRun(t: GpxSummary, rank: number, weather: WeatherCondition): NotableRun {
  const d = dateOf(t);
  const meta = stravaMeta[t.id] ?? {};
  return {
    rank,
    date: niceDate(d),
    distanceKm: +t.stats.distanceKm.toFixed(2),
    movingSec: t.stats.movingSec,
    paceSecPerKm: t.stats.paceSecPerKm ?? 0,
    elevationM: t.stats.elevationM,
    ...(meta.tempC != null ? { tempC: meta.tempC } : {}),
    weather,
    title: t.name,
    location: locationFor(t),
    gpxId: t.id,
    gpxPath: `/gpx/${t.id}.gpx`,
    ...(meta.photoPath != null ? { photoPath: meta.photoPath } : {}),
  };
}

function rankBy<T>(arr: T[], by: (x: T) => number): T[] {
  return arr.slice().sort((a, b) => by(b) - by(a));
}

// Full ranked lists — the UI shows the top ~10 in a fixed-height
// viewport and lets the user scroll to see the rest.
const byDistance = rankBy(tracks, (t) => t.stats.distanceKm).map((t, i) =>
  toNotableRun(t, i + 1, "clear"),
);

const byElevation = rankBy(tracks, (t) => t.stats.elevationM).map((t, i) =>
  toNotableRun(t, i + 1, "clear"),
);

// Personal bests: for each distance bucket, pick the fastest run that
// reached at least that distance.
const PB_BUCKETS: { label: string; minKm: number; tag: string }[] = [
  { label: "5K",          minKm: 5,    tag: "5K PB" },
  { label: "10K",         minKm: 10,   tag: "10K PB" },
  { label: "Half Marathon", minKm: 21.0975, tag: "Half PB" },
  { label: "Marathon",    minKm: 42.195, tag: "Marathon PB" },
];

// GPS drift detection: a run is considered drifted/corrupt when the raw
// bbox diagonal is implausibly large relative to the recorded distance.
// A 10 km loop that drifts to a 50 km bbox diagonal is almost certainly
// a GPS glitch. Threshold: bbox diagonal must be ≤ 3× the run distance.
// Also require at least 60s moving time per km (pace ≤ 17 min/km) to
// exclude "ghost" tracks where the device recorded zero motion.
function hasBadGps(t: GpxSummary): boolean {
  const { bbox, distanceKm, paceSecPerKm } = t.stats;
  if (!distanceKm) return true;
  // Diagonal of the bbox in degrees × 111 km/deg ≈ km (rough, equirectangular)
  const dLat = bbox.maxLat - bbox.minLat;
  const dLon = bbox.maxLon - bbox.minLon;
  const bboxDiagKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
  if (bboxDiagKm > distanceKm * 3) return true;
  // Impossibly fast pace (< 2 min/km = 120 sec/km) → likely GPS jump
  if (paceSecPerKm != null && paceSecPerKm < 120) return true;
  return false;
}

const personalBests: NotableRun[] = PB_BUCKETS.flatMap((b, i) => {
  const eligible = tracks.filter(
    (t) =>
      t.stats.distanceKm >= b.minKm &&
      t.stats.paceSecPerKm != null &&
      !hasBadGps(t),
  );
  if (!eligible.length) return [];
  const fastest = eligible.reduce((a, c) =>
    (c.stats.paceSecPerKm ?? Infinity) < (a.stats.paceSecPerKm ?? Infinity) ? c : a,
  );
  return [{ ...toNotableRun(fastest, i + 1, "clear"), title: `${b.tag} · ${fastest.name}` }];
});

export const notableRuns: Record<NotableRunCategory, NotableRun[]> = {
  longest: byDistance,
  "personal-bests": personalBests,
  elevation: byElevation,
  races: [],
  "bus-run-bus": [],
  "weekly-half": [],
};

// ---------------------------------------------------------------------------
// Statistics charts

function streakYearOf(d: Date, streakStart: Date): number {
  let years = d.getUTCFullYear() - streakStart.getUTCFullYear();
  const dCopy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const anniv = new Date(Date.UTC(d.getUTCFullYear(), streakStart.getUTCMonth(), streakStart.getUTCDate()));
  if (dCopy < anniv) years -= 1;
  return years + 1;
}

// Annual km by streak year
const annualMap = new Map<number, number>();
for (const t of tracks) {
  const y = streakYearOf(dateOf(t), first);
  annualMap.set(y, (annualMap.get(y) ?? 0) + t.stats.distanceKm);
}
const annualYearNumbers = [...annualMap.keys()].sort((a, b) => a - b);
export const annualMileage: AnnualMileage[] = annualYearNumbers.length
  ? annualYearNumbers.map((y) => ({ year: y, km: Math.round(annualMap.get(y) ?? 0) }))
  : [{ year: 1, km: 0 }];

// Hour-of-day percentages (24 bins). Use LOCAL time so the distribution
// reflects when the user actually runs ("morning", "evening"), not UTC.
const hourCounts = new Array<number>(24).fill(0);
for (const t of tracks) hourCounts[dateOf(t).getHours()] += 1;
const hourTotal = hourCounts.reduce((a, b) => a + b, 0) || 1;
export const workoutByTime: number[] = hourCounts.map((c) => +((c / hourTotal) * 100).toFixed(1));

// Avg km per run by day of week (Monday-first)
const weekdaySum = new Array<number>(7).fill(0);
const weekdayN = new Array<number>(7).fill(0);
for (const t of tracks) {
  const dow = (dateOf(t).getUTCDay() + 6) % 7;
  weekdaySum[dow] += t.stats.distanceKm;
  weekdayN[dow] += 1;
}
export const avgByWeekday: number[] = weekdaySum.map((s, i) =>
  weekdayN[i] ? +(s / weekdayN[i]).toFixed(1) : 0,
);

// Distance histogram, metric buckets
const DIST_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "1km",     min: 0,   max: 2 },
  { label: "2-3km",   min: 2,   max: 4 },
  { label: "4-5km",   min: 4,   max: 6 },
  { label: "6-8km",   min: 6,   max: 9 },
  { label: "9-11km",  min: 9,   max: 12 },
  { label: "12-15km", min: 12,  max: 16 },
  { label: "16-20km", min: 16,  max: 21 },
  { label: "HM",      min: 21,  max: 30 },
  { label: "30-42km", min: 30,  max: 42.2 },
  { label: "M+",      min: 42.2, max: Infinity },
];
export const runDistances: HistogramBucket[] = DIST_BUCKETS.map((b) => ({
  label: b.label,
  count: tracks.filter((t) => t.stats.distanceKm >= b.min && t.stats.distanceKm < b.max).length,
}));

export const treadmillVsOutdoor = { treadmill: 0, outdoor: tracks.length };

// Pace distribution — 60 bins across 3:00 → 8:00/km (running-friendly range)
const paceVals = tracks.map((t) => t.stats.paceSecPerKm).filter((v): v is number => v != null);
const PACE_MIN = 3 * 60;
const PACE_MAX = 8 * 60;
const PACE_BINS = 60;
const paceBins = new Array<number>(PACE_BINS).fill(0);
for (const p of paceVals) {
  const t = (p - PACE_MIN) / (PACE_MAX - PACE_MIN);
  const idx = Math.min(PACE_BINS - 1, Math.max(0, Math.floor(t * PACE_BINS)));
  for (let i = 0; i < PACE_BINS; i++) {
    const x = (i - idx) / 4;
    paceBins[i] += Math.exp(-x * x);
  }
}
const meanSec = paceVals.length
  ? Math.round(paceVals.reduce((a, b) => a + b, 0) / paceVals.length)
  : 0;
const medianSec = paceVals.length
  ? paceVals.slice().sort((a, b) => a - b)[Math.floor(paceVals.length / 2)]
  : 0;
export const paceDistribution = {
  meanSec,
  medianSec,
  bins: paceBins.map((v) => +(v * 100).toFixed(0)),
  axisLabels: ["3:00/km", "4:00/km", "5:00/km", "6:00/km", "7:00/km", "8:00/km"],
};

const HR_ZONES: { label: string; bpm: string; max: number }[] = [
  { label: "Easy",      bpm: "<139bpm",    max: 139 },
  { label: "Tempo",     bpm: "140-159bpm", max: 159 },
  { label: "Threshold", bpm: "160-166bpm", max: 166 },
  { label: "VO2 Max",   bpm: ">167bpm",    max: 999 },
];
export const heartRateZones = HR_ZONES.map((z, i) => {
  const prevMax = i === 0 ? 0 : HR_ZONES[i - 1].max;
  const count = tracks.filter((t) => {
    const hr = t.stats.avgHr ?? 0;
    return hr > prevMax && hr <= z.max;
  }).length;
  return { label: z.label, bpm: z.bpm, count };
});

// Temperature/weather placeholders. Real values need an external API.
export const temperatureBuckets: HistogramBucket[] = [
  { label: "Freezing",   count: 0 },
  { label: "Very Cold",  count: 0 },
  { label: "Cold",       count: 0 },
  { label: "Cool",       count: 0 },
  { label: "Mild",       count: tracks.length },
  { label: "Warm",       count: 0 },
  { label: "Hot",        count: 0 },
  { label: "Very Hot",   count: 0 },
];
export const temperatureRanges: string[] = [
  "< -10°C", "-10 to -1°C", "0 to 4°C", "5 to 9°C",
  "10 to 19°C", "20 to 24°C", "25 to 29°C", "≥ 30°C",
];
export const weatherConditions: { label: string; icon: string; count: number }[] = [
  { label: "Clear",  icon: "sun",             count: tracks.length },
  { label: "Clouds", icon: "cloud",           count: 0 },
  { label: "Rain",   icon: "cloud-rain",      count: 0 },
  { label: "Snow",   icon: "snowflake",       count: 0 },
  { label: "Fog",    icon: "cloud-fog",       count: 0 },
  { label: "Storm",  icon: "cloud-lightning", count: 0 },
];

export const equipment: { model: string; km: number }[] = [];

// ---------------------------------------------------------------------------
// Geography

export const countriesVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string>; code: string }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    const entry = map.get(loc.country) ?? { km: 0, days: new Set(), code: loc.countryCode };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.country, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, code: v.code, days: v.days.size, km: +v.km.toFixed(1) }))
    .sort((a, b) => b.km - a.km);
})();

export const usStatesVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string> }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    if (loc.countryCode !== "US" || !loc.region) continue;
    const entry = map.get(loc.region) ?? { km: 0, days: new Set() };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.region, entry);
  }
  return [...map.entries()]
    .map(([code, v]) => ({
      name: US_STATE_NAME[code] ?? code,
      code,
      days: v.days.size,
      km: +v.km.toFixed(1),
    }))
    // Sort by km desc, but always pin NJ last.
    .sort((a, b) => {
      if (a.code === "NJ") return 1;
      if (b.code === "NJ") return -1;
      return b.km - a.km;
    });
})();

// NYC boroughs — aggregated by city when a run lands in NY state. Lets us
// show a third drill-down table (country → state → borough) whenever the
// user has NYC activity.
export const nycBoroughsVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string> }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    if (loc.countryCode !== "US" || loc.region !== "NY" || !loc.city) continue;
    const entry = map.get(loc.city) ?? { km: 0, days: new Set() };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.city, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      code: name, // use the borough name as the filter code
      days: v.days.size,
      km: +v.km.toFixed(1),
    }))
    .sort((a, b) => b.km - a.km);
})();

// ---------------------------------------------------------------------------
// Daily-log heatmaps — one entry per streak year.

export const streakYears: StreakYearHeatmap[] = (() => {
  if (!tracks.length) return [];
  const out: StreakYearHeatmap[] = [];
  const startY = first.getUTCFullYear();
  const startM = first.getUTCMonth();
  const startD = first.getUTCDate();
  const maxYear = streakYearOf(last, first);

  const kmByDate = new Map<string, number>();
  for (const t of tracks) {
    const iso = isoDate(dateOf(t));
    kmByDate.set(iso, (kmByDate.get(iso) ?? 0) + t.stats.distanceKm);
  }

  for (let y = 1; y <= maxYear; y++) {
    const ystart = new Date(Date.UTC(startY + y - 1, startM, startD));
    const cells: HeatmapCell[] = [];
    let total = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(ystart);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = isoDate(d);
      const km = +(kmByDate.get(iso) ?? 0);
      total += km;
      cells.push({ date: iso, km: +km.toFixed(2) });
    }
    const yend = new Date(ystart);
    yend.setUTCFullYear(yend.getUTCFullYear() + 1);
    const inProgress = last < yend;
    const elapsed = inProgress
      ? Math.max(1, Math.round((last.getTime() - ystart.getTime()) / 86_400_000))
      : 365;
    out.push({
      yearNumber: y,
      label: `${ystart.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })} - ${yend.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`,
      totalKm: +total.toFixed(1),
      avgPerDay: +(total / elapsed).toFixed(2),
      inProgress,
      cells,
    });
  }
  return out.reverse();
})();
