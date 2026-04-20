const MAX_SAMPLE_GAP_SEC = 15;
const MIN_MOVING_MPS = 0.4;

export const PACE_MIN_SEC = 3 * 60;
export const PACE_MAX_SEC = 8 * 60;
export const PACE_BIN_COUNT = 60;
export const PACE_AXIS_LABELS = [
  "3:00/km",
  "4:00/km",
  "5:00/km",
  "6:00/km",
  "7:00/km",
  "8:00/km",
];

export interface GpxTrackPointInput {
  lat: number;
  lon: number;
  time: string | null;
}

export interface MovingTimelinePoint {
  movingSec: number;
  distanceKm: number;
}

export interface PaceDistributionResult {
  meanSec: number;
  medianSec: number;
  meanBin: number | null;
  medianBin: number | null;
  bins: number[];
  axisLabels: string[];
}

function haversineKm(
  a: Pick<GpxTrackPointInput, "lat" | "lon">,
  b: Pick<GpxTrackPointInput, "lat" | "lon">,
): number {
  const earthRadiusKm = 6371.0088;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function isMovingSegment(
  dtSec: number,
  segKm: number,
): boolean {
  if (dtSec <= 0 || dtSec > MAX_SAMPLE_GAP_SEC) return false;
  const metersPerSec = (segKm * 1000) / dtSec;
  return metersPerSec >= MIN_MOVING_MPS;
}

function interpolateDistanceAt(
  timeline: MovingTimelinePoint[],
  movingSec: number,
): number {
  if (!timeline.length) return 0;
  if (movingSec <= 0) return 0;
  const last = timeline[timeline.length - 1];
  if (movingSec >= last.movingSec) return last.distanceKm;

  for (let i = 1; i < timeline.length; i += 1) {
    const start = timeline[i - 1];
    const end = timeline[i];
    if (movingSec > end.movingSec) continue;
    const spanSec = end.movingSec - start.movingSec;
    if (spanSec <= 0) return end.distanceKm;
    const ratio = (movingSec - start.movingSec) / spanSec;
    return start.distanceKm + (end.distanceKm - start.distanceKm) * ratio;
  }

  return last.distanceKm;
}

function percentileMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
  return Math.round(median);
}

export function paceBinIndexFor(secPerKm: number): number {
  const clamped = Math.min(PACE_MAX_SEC, Math.max(PACE_MIN_SEC, secPerKm));
  const ratio = (clamped - PACE_MIN_SEC) / (PACE_MAX_SEC - PACE_MIN_SEC);
  return Math.min(
    PACE_BIN_COUNT - 1,
    Math.max(0, Math.floor(ratio * PACE_BIN_COUNT)),
  );
}

export function buildMovingTimeline(
  points: GpxTrackPointInput[],
): MovingTimelinePoint[] {
  if (points.length < 2) return [];

  const timeline: MovingTimelinePoint[] = [{ movingSec: 0, distanceKm: 0 }];
  let movingSec = 0;
  let distanceKm = 0;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev.time || !curr.time) continue;
    const dtSec = (Date.parse(curr.time) - Date.parse(prev.time)) / 1000;
    const segKm = haversineKm(prev, curr);
    if (!isMovingSegment(dtSec, segKm)) continue;
    movingSec += dtSec;
    distanceKm += segKm;
    timeline.push({
      movingSec,
      distanceKm,
    });
  }

  return timeline.length > 1 ? timeline : [];
}

export function minutePacesFromMovingTimeline(
  timeline: MovingTimelinePoint[],
): number[] {
  if (timeline.length < 2) return [];
  const totalMovingSec = timeline[timeline.length - 1].movingSec;
  const fullMinutes = Math.floor(totalMovingSec / 60);
  const paces: number[] = [];

  for (let minute = 0; minute < fullMinutes; minute += 1) {
    const startSec = minute * 60;
    const endSec = startSec + 60;
    const kmCovered =
      interpolateDistanceAt(timeline, endSec) -
      interpolateDistanceAt(timeline, startSec);
    if (kmCovered <= 0) continue;
    paces.push(60 / kmCovered);
  }

  return paces;
}

export function minutePacesFromTrackPoints(
  points: GpxTrackPointInput[],
): number[] {
  return minutePacesFromMovingTimeline(buildMovingTimeline(points));
}

export function buildPaceDistributionFromSamples(
  samplesSecPerKm: number[],
): PaceDistributionResult {
  const bins = new Array<number>(PACE_BIN_COUNT).fill(0);
  for (const sample of samplesSecPerKm) {
    bins[paceBinIndexFor(sample)] += 1;
  }

  const meanSec = samplesSecPerKm.length
    ? Math.round(
        samplesSecPerKm.reduce((sum, sample) => sum + sample, 0) /
          samplesSecPerKm.length,
      )
    : 0;
  const medianSec = percentileMedian(samplesSecPerKm);

  return {
    meanSec,
    medianSec,
    meanBin: samplesSecPerKm.length ? paceBinIndexFor(meanSec) : null,
    medianBin: samplesSecPerKm.length ? paceBinIndexFor(medianSec) : null,
    bins,
    axisLabels: PACE_AXIS_LABELS,
  };
}
