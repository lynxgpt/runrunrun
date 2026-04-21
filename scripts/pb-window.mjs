export const PB_DISTANCE_KM = {
  "400m": 0.4,
  "1K": 1,
  "5K": 5,
  "10K": 10,
  "Half Marathon": 21.0975,
  "Marathon": 42.195,
};

export const PB_MAX_SEGMENT_KPH = 25;

export function buildElapsedDistanceTimeline(points, distanceKmBetween) {
  if (!points.length || !points[0].time) return [];
  const t0 = Date.parse(points[0].time);
  if (!Number.isFinite(t0)) return [];

  let distanceKm = 0;
  const timeline = [{ t: 0, km: 0 }];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev.time || !curr.time) continue;
    const currMs = Date.parse(curr.time);
    const prevMs = Date.parse(prev.time);
    if (!Number.isFinite(currMs) || !Number.isFinite(prevMs) || currMs <= prevMs) {
      continue;
    }
    const dtSec = (currMs - prevMs) / 1000;
    const segmentKm = distanceKmBetween(prev, curr);
    distanceKm += segmentKm;
    timeline.push({
      t: (currMs - t0) / 1000,
      km: distanceKm,
      segmentKph: dtSec > 0 ? (segmentKm / dtSec) * 3600 : 0,
    });
  }

  return timeline;
}

function interpolateTimeAtDistance(before, after, km) {
  const spanKm = after.km - before.km;
  if (spanKm <= 0) return after.t;
  const ratio = (km - before.km) / spanKm;
  return before.t + (after.t - before.t) * ratio;
}

function windowHasDrift(timeline, startIdx, endIdx, targetKm, maxSegmentKph) {
  let suspiciousKm = 0;
  let maxKph = 0;
  for (let i = startIdx + 1; i <= endIdx; i += 1) {
    const segmentKph = timeline[i].segmentKph ?? 0;
    if (segmentKph <= maxSegmentKph) continue;
    const segmentKm = Math.max(0, timeline[i].km - timeline[i - 1].km);
    suspiciousKm += segmentKm;
    if (segmentKph > maxKph) maxKph = segmentKph;
  }
  if (maxKph >= 45 && suspiciousKm >= 0.01) return true;
  return suspiciousKm >= 0.03 && suspiciousKm / targetKm >= 0.02;
}

export function fastestElapsedWindowSec(
  timeline,
  targetKm,
  { maxSegmentKph = PB_MAX_SEGMENT_KPH } = {},
) {
  if (timeline.length < 2 || targetKm <= 0) return null;
  const totalKm = timeline[timeline.length - 1].km;
  if (totalKm < targetKm) return null;

  let bestSec = Infinity;
  let endIdx = 1;

  for (let startIdx = 0; startIdx < timeline.length - 1; startIdx += 1) {
    const start = timeline[startIdx];
    const target = start.km + targetKm;
    if (target > totalKm) break;

    while (endIdx < timeline.length && timeline[endIdx].km < target) {
      endIdx += 1;
    }
    if (endIdx >= timeline.length) break;
    if (windowHasDrift(timeline, startIdx, endIdx, targetKm, maxSegmentKph)) continue;

    const before = timeline[Math.max(startIdx, endIdx - 1)];
    const after = timeline[endIdx];
    const endT = interpolateTimeAtDistance(before, after, target);
    const elapsed = endT - start.t;
    if (elapsed > 0 && elapsed < bestSec) bestSec = elapsed;
  }

  return Number.isFinite(bestSec) ? bestSec : null;
}

export function personalBestElapsedPaces(timeline, distances = PB_DISTANCE_KM) {
  const out = {};
  for (const [label, km] of Object.entries(distances)) {
    const elapsedSec = fastestElapsedWindowSec(timeline, km);
    if (elapsedSec != null) out[label] = elapsedSec / km;
  }
  return out;
}
