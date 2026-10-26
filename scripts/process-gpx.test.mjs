import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, dedupe } from "./process-gpx.mjs";

function track(id, startTime, distanceKm, rawPointCount = 100) {
  return { id, rawPointCount, stats: { startTime, distanceKm } };
}

test("dedupe keeps the Strava-ID copy of the same run", () => {
  const { kept, dropped } = dedupe([
    track("long-brooklyn", "2026-03-22T12:00:30Z", 34.4, 5000),
    track("long-17822488749", "2026-03-22T12:00:00Z", 34.43, 100),
  ]);
  assert.deepEqual(kept.map((t) => t.id), ["long-17822488749"]);
  assert.deepEqual(dropped, [{ kept: "long-17822488749", dropped: "long-brooklyn" }]);
});

test("dedupe keeps runs that differ in start time or distance", () => {
  const { kept } = dedupe([
    track("a-10000001", "2026-01-01T10:00:00Z", 5),
    track("b-10000002", "2026-01-01T10:03:00Z", 5), // 3 min later: separate run
    track("c-10000003", "2026-01-01T10:03:30Z", 8), // within 2 min of b, but 3 km longer
  ]);
  assert.equal(kept.length, 3);
});

test("dedupe prefers the denser trace when neither copy is a Strava ID", () => {
  const { kept } = dedupe([
    track("watch-export", "2026-01-01T10:00:00Z", 5, 900),
    track("phone-export", "2026-01-01T10:00:20Z", 5.2, 3000),
  ]);
  assert.deepEqual(kept.map((t) => t.id), ["phone-export"]);
});

function pt(lat, lon, sec) {
  return { lat, lon, ele: null, hr: null, time: new Date(Date.UTC(2026, 0, 1, 10, 0, sec)).toISOString() };
}

test("moving time excludes standing still and recording gaps", () => {
  // ~11 m north per 5 s = 2.2 m/s running; then 30 s standing; then a 60 s gap.
  const pts = [];
  let sec = 0;
  let lat = 40.7;
  for (let i = 0; i < 10; i++) pts.push(pt((lat += 0.0001), -73.97, (sec += 5)));
  for (let i = 0; i < 6; i++) pts.push(pt(lat, -73.97, (sec += 5))); // stopped
  pts.push(pt((lat += 0.0001), -73.97, (sec += 60))); // gap > 15 s
  for (let i = 0; i < 4; i++) pts.push(pt((lat += 0.0001), -73.97, (sec += 5)));
  const s = aggregate(pts, "probe");
  assert.equal(s.movingSec, 9 * 5 + 4 * 5); // only the running segments
  assert.equal(s.elapsedSec, sec - 5);
  assert.ok(Math.abs(s.distanceKm - 14 * 0.01112) < 0.002, `distance ${s.distanceKm}`);
});
