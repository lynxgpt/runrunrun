// Derive analytics from whatever GPX tracks are in gpx-processed.ts.
// Add more .gpx files to data/gpx/, run `node scripts/process-gpx.mjs`,
// and the site picks them up automatically. Everything is metric, all
// durations use MOVING time (stops excluded).

import { gpxSummaries, type GpxSummary } from "./gpx-processed";
import rawMeta from "../../public/strava-meta.json";
import {
  buildPaceDistributionFromSamples,
} from "./pace-distribution";
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
  MonthlyMileage,
  NotableRun,
  NotableRunCategory,
  StreakStats,
  StreakYearHeatmap,
  WeatherCondition,
  ActivityLocation,
} from "@/types/activity";

// ---------------------------------------------------------------------------
// Track list, sorted by start time.

const TRACK_CUTOFF = new Date("2025-01-01T00:00:00.000Z");

export const tracks: GpxSummary[] = Object.values(gpxSummaries)
  .filter((t) => t.stats.startTime)
  .filter((t) => new Date(t.stats.startTime!).getTime() >= TRACK_CUTOFF.getTime())
  .filter((t) => !t.stats.activityType || t.stats.activityType === "running" || t.stats.activityType === "trailrun")
  .sort(
    (a, b) =>
      new Date(a.stats.startTime!).getTime() - new Date(b.stats.startTime!).getTime(),
  );

function dateOf(t: GpxSummary): Date {
  return new Date(t.stats.startTime!);
}

function hourInNewYork(t: GpxSummary): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(dateOf(t)),
  );
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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
// Location. Each run's label and per-region split come from data/geo.json
// (scripts/geocode.mjs: one Nominatim lookup per minute of moving time,
// majority vote), folded into the summaries by process-gpx.mjs.

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

export function locationFor(t: GpxSummary): ActivityLocation {
  const label = t.stats.geo?.label;
  if (!label) return { country: "Unknown", countryCode: "??" };
  return {
    country: label.country,
    countryCode: label.countryCode,
    ...(label.stateCode || label.state ? { region: label.stateCode ?? label.state ?? undefined } : {}),
    ...(label.city ? { city: label.city } : {}),
    ...(label.county ? { county: label.county } : {}),
  };
}

interface RegionShare {
  countryCode: string;
  country: string;
  region: string | null;
  city: string | null;
  share: number;
}

// Shares of a run's moving minutes by country / state / city. A run with no
// geo data counts wholly toward its label (or Unknown).
function regionShares(t: GpxSummary): RegionShare[] {
  const split = t.stats.geo?.split ?? [];
  const total = split.reduce((n, e) => n + e.minutes, 0);
  if (!total) {
    const loc = locationFor(t);
    return [
      {
        countryCode: loc.countryCode,
        country: loc.country,
        region: loc.region ?? null,
        city: loc.city ?? null,
        share: 1,
      },
    ];
  }
  return split.map((e) => ({
    countryCode: e.countryCode,
    country: e.country,
    region: e.stateCode ?? e.state,
    city: e.city,
    share: e.minutes / total,
  }));
}

export interface RegionsTouched {
  countries: string[];
  states: string[];
  cities: string[];
}

function regionsTouched(t: GpxSummary): RegionsTouched {
  const loc = locationFor(t);
  const shares = regionShares(t);
  const sum = (key: (r: RegionShare) => string | null) => {
    const m = new Map<string, number>();
    for (const r of shares) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + r.share);
    }
    return m;
  };
  const touched = (m: Map<string, number>, own: string | undefined) => {
    const out = [...m].filter(([, v]) => v > 0).map(([k]) => k);
    if (own && !out.includes(own)) out.push(own);
    return out;
  };
  return {
    countries: touched(sum((r) => r.countryCode), loc.countryCode),
    states: touched(sum((r) => (r.countryCode === "US" ? r.region : null)), loc.countryCode === "US" ? loc.region : undefined),
    cities: touched(sum((r) => r.city), loc.city),
  };
}

function displayLocationForNotable(loc: ActivityLocation): {
  primary: string;
  secondary: string;
} {
  const primary = loc.city ?? loc.county ?? loc.country;
  const secondary =
    loc.countryCode === "US" && loc.region
      ? `${loc.region} · ${loc.country.toUpperCase()}`
      : loc.country.toUpperCase();
  return { primary, secondary };
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
const today = new Date();
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
  ...diffYMD(first, today),
};

// ---------------------------------------------------------------------------
// Notable Runs

function toNotableRun(t: GpxSummary, rank: number, weather: WeatherCondition): NotableRun {
  const d = dateOf(t);
  const meta = stravaMeta[t.id] ?? {};
  const location = locationFor(t);
  const displayLocation = displayLocationForNotable(location);
  return {
    rank,
    date: niceDate(d),
    dateIso: isoDate(d),
    dateMonth: monthKey(d),
    distanceKm: +t.stats.distanceKm.toFixed(2),
    movingSec: t.stats.movingSec,
    paceSecPerKm: t.stats.paceSecPerKm ?? 0,
    elevationM: t.stats.elevationM,
    ...(meta.tempC != null ? { tempC: meta.tempC } : {}),
    weather,
    title: t.name,
    location,
    touched: regionsTouched(t),
    displayLocationPrimary: displayLocation.primary,
    displayLocationSecondary: displayLocation.secondary,
    gpxId: t.id,
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
  { label: "400m",        minKm: 0.4,  tag: "400m PB" },
  { label: "1K",          minKm: 1.0,  tag: "1K PB" },
  { label: "5K",          minKm: 5,    tag: "5K PB" },
  { label: "10K",         minKm: 10,   tag: "10K PB" },
  { label: "Half Marathon", minKm: 21.0975, tag: "HM PB" },
  { label: "Marathon",    minKm: 42.195, tag: "FM PB" },
];

const personalBests: NotableRun[] = PB_BUCKETS.flatMap((b, i) => {
  const eligible = tracks.filter(
    (t) =>
      t.stats.distanceKm >= b.minKm &&
      t.stats.pbElapsedPaceSecPerKm?.[b.label] != null,
  );
  if (!eligible.length) return [];
  const fastest = eligible.reduce((a, c) =>
    (c.stats.pbElapsedPaceSecPerKm?.[b.label] ?? Infinity) <
    (a.stats.pbElapsedPaceSecPerKm?.[b.label] ?? Infinity)
      ? c
      : a,
  );
  return [
    {
      ...toNotableRun(fastest, i + 1, "clear"),
      displayRank: b.label,
      title: `${b.tag} · ${fastest.name}`,
      paceSecPerKm: Math.round(fastest.stats.pbElapsedPaceSecPerKm?.[b.label] ?? 0),
    },
  ];
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

// Annual km by calendar year
const annualMap = new Map<number, number>();
for (const t of tracks) {
  const y = dateOf(t).getUTCFullYear();
  annualMap.set(y, (annualMap.get(y) ?? 0) + t.stats.distanceKm);
}
const annualYearNumbers = [...annualMap.keys()].sort((a, b) => a - b);
export const annualMileage: AnnualMileage[] = annualYearNumbers.length
  ? annualYearNumbers.map((y) => ({ year: y, km: Math.round(annualMap.get(y) ?? 0) }))
  : [{ year: 1, km: 0 }];

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildRunDistanceFlow(distances: number[]) {
  const usable = distances.filter((km) => Number.isFinite(km) && km > 0);
  if (!usable.length) return [];

  const maxDistance = Math.max(...usable);
  const xMax = Math.max(10, Math.ceil(maxDistance / 5) * 5);
  const step = 0.5;
  const bandwidth = Math.max(1.15, xMax / 34);

  return Array.from({ length: Math.floor(xMax / step) + 1 }, (_, i) => {
    const km = +(i * step).toFixed(1);
    const density = usable.reduce((sum, distance) => {
      const z = (km - distance) / bandwidth;
      return sum + Math.exp(-0.5 * z * z);
    }, 0);
    const headEnd = 5;
    const headTaper = km >= headEnd ? 1 : Math.pow(Math.max(0, km / headEnd), 3.2);
    const tailStart = xMax * 0.78;
    const tailT = Math.max(0, Math.min(1, (km - tailStart) / (xMax - tailStart || 1)));
    const tailTaper = km <= tailStart ? 1 : 1 - Math.pow(tailT, 1.45) * 0.92;
    const frequency = density * headTaper * Math.max(0.08, tailTaper);
    return { km, frequency: +frequency.toFixed(3) };
  });
}

function monthLabel(d: Date): string {
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return d.getUTCMonth() === 0 ? `${month} ${String(d.getUTCFullYear()).slice(2)}` : month;
}

const monthlyMap = new Map<string, number>();
for (const t of tracks) {
  const d = dateOf(t);
  monthlyMap.set(monthKey(d), (monthlyMap.get(monthKey(d)) ?? 0) + t.stats.distanceKm);
}

const monthlyStart = new Date(Date.UTC(2025, 0, 1));
const monthlyEnd = tracks.length
  ? new Date(Date.UTC(dateOf(tracks[tracks.length - 1]).getUTCFullYear(), dateOf(tracks[tracks.length - 1]).getUTCMonth(), 1))
  : monthlyStart;

export const monthlyMileage: MonthlyMileage[] = [];
for (const d = new Date(monthlyStart); d <= monthlyEnd; d.setUTCMonth(d.getUTCMonth() + 1)) {
  const key = monthKey(d);
  monthlyMileage.push({
    month: key,
    label: monthLabel(d),
    km: Math.round(monthlyMap.get(key) ?? 0),
    monthIndex: d.getUTCMonth(),
    ...(key === "2025-04" ? { marker: "half-star" as const } : {}),
    ...(key === "2026-05" ? { marker: "star" as const } : {}),
  });
}

// Hour-of-day percentages (24 bins). Pin to New York time so localhost and
// GitHub Pages produce the same "when I run" shape regardless of build host.
const hourCounts = new Array<number>(24).fill(0);
for (const t of tracks) hourCounts[hourInNewYork(t)] += 1;
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
  { label: "<5",    min: 0,  max: 5 },
  { label: "5-7",   min: 5,  max: 7 },
  { label: "7-10",  min: 7,  max: 10 },
  { label: "10-13", min: 10, max: 13 },
  { label: "13-16", min: 13, max: 16 },
  { label: "16-22", min: 16, max: 22 },
  { label: "22-32", min: 22, max: 32 },
  { label: "32+",   min: 32, max: Infinity },
];
export const runDistances: HistogramBucket[] = DIST_BUCKETS.map((b) => ({
  label: b.label,
  count: tracks.filter((t) => t.stats.distanceKm >= b.min && t.stats.distanceKm < b.max).length,
}));

export const runDistanceFlow = buildRunDistanceFlow(tracks.map((t) => t.stats.distanceKm));

export const treadmillVsOutdoor = { treadmill: 0, outdoor: tracks.length };

const PACE_FILTER_LOW_SPEED_SEC = 15;
const PACE_FILTER_SKIPPED_BEFORE_SEC = 30;

const minutePaceSamples = tracks.flatMap((t) => t.stats.paceSamples ?? []);
export const paceDistribution = buildPaceDistributionFromSamples(minutePaceSamples);
const filteredMinutePaceSamples = tracks.flatMap((t) =>
  (t.stats.paceSampleDetails ?? [])
    .filter(
      (sample) =>
        sample.lowSpeedSec < PACE_FILTER_LOW_SPEED_SEC &&
        sample.skippedBeforeSec < PACE_FILTER_SKIPPED_BEFORE_SEC,
    )
    .map((sample) => sample.paceSecPerKm),
);
export const filteredPaceDistribution =
  buildPaceDistributionFromSamples(filteredMinutePaceSamples);

const HR_ZONE_META = [
  { label: "Easy",      bpm: "<139bpm"    },
  { label: "Tempo",     bpm: "140-159bpm" },
  { label: "Threshold", bpm: "160-166bpm" },
  { label: "VO2 Max",   bpm: ">167bpm"   },
];
const hrZoneTotals = [0, 0, 0, 0];
for (const t of tracks) {
  const z = t.stats.hrZoneSec;
  if (!z) continue;
  for (let i = 0; i < 4; i++) hrZoneTotals[i] += z[i] ?? 0;
}
const hrZoneTotal = hrZoneTotals.reduce((a, b) => a + b, 0);
export const heartRateZones = HR_ZONE_META.map((z, i) => ({
  label: z.label,
  bpm: z.bpm,
  pct: hrZoneTotal > 0 ? +((hrZoneTotals[i] / hrZoneTotal) * 100).toFixed(1) : 0,
}));

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

// Region totals split each run's km by the share of moving minutes spent in
// each region; a run counts as a day in every region it touched.
function regionRows(
  keyOf: (r: RegionShare) => string | null,
  touchedOf: (t: RegionsTouched) => string[],
  nameOf: (key: string, r: RegionShare) => string,
): (GeoRow & { code: string })[] {
  const map = new Map<string, { name: string; km: number; days: Set<string> }>();
  for (const t of tracks) {
    const day = isoDate(dateOf(t));
    const touched = new Set(touchedOf(regionsTouched(t)));
    for (const r of regionShares(t)) {
      const key = keyOf(r);
      if (!key) continue;
      const entry = map.get(key) ?? { name: nameOf(key, r), km: 0, days: new Set<string>() };
      entry.km += t.stats.distanceKm * r.share;
      if (touched.has(key)) entry.days.add(day);
      map.set(key, entry);
    }
  }
  return [...map.entries()]
    .map(([code, v]) => ({ name: v.name, code, days: v.days.size, km: +v.km.toFixed(1) }))
    .sort((a, b) => b.km - a.km);
}

export const countriesVisited: GeoRow[] = regionRows(
  (r) => r.countryCode,
  (t) => t.countries,
  (_, r) => r.country,
);

export const usStatesVisited: GeoRow[] = regionRows(
  (r) => (r.countryCode === "US" ? r.region : null),
  (t) => t.states,
  (code) => US_STATE_NAME[code] ?? code,
)
  // Sort by km desc, but always pin NJ last.
  .sort((a, b) => {
    if (a.code === "NJ") return 1;
    if (b.code === "NJ") return -1;
    return b.km - a.km;
  });

// NYC boroughs — the third drill-down level under New York.
const NYC_BOROUGHS = new Set(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);
export const nycBoroughsVisited: GeoRow[] = regionRows(
  (r) => (r.countryCode === "US" && r.region === "NY" && r.city && NYC_BOROUGHS.has(r.city) ? r.city : null),
  (t) => t.cities,
  (name) => name,
);

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

  // Build-time "today" — cells for in-progress years are capped here so
  // the heatmap doesn't show a sea of empty future squares.
  const todayUtc = new Date(Math.floor(Date.now() / 86_400_000) * 86_400_000);

  for (let y = 1; y <= maxYear; y++) {
    const ystart = new Date(Date.UTC(startY + y - 1, startM, startD));
    const yend = new Date(ystart);
    yend.setUTCFullYear(yend.getUTCFullYear() + 1);
    const inProgress = last < yend;
    const cellCount = inProgress
      ? Math.min(365, Math.max(1, Math.round((todayUtc.getTime() - ystart.getTime()) / 86_400_000) + 1))
      : 365;
    const cells: HeatmapCell[] = [];
    let total = 0;
    for (let i = 0; i < cellCount; i++) {
      const d = new Date(ystart);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = isoDate(d);
      const km = +(kmByDate.get(iso) ?? 0);
      total += km;
      cells.push({ date: iso, km: +km.toFixed(2) });
    }
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
