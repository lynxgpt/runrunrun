import assert from "node:assert/strict";
import test from "node:test";
import {
  fastestElapsedWindowSec,
  personalBestElapsedPaces,
} from "./pb-window.mjs";

test("short PB can come from inside a single fast interval rep", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 80, km: 0.8 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 0.4), 40);
  assert.equal(personalBestElapsedPaces(timeline, { "400m": 0.4 })["400m"], 100);
});

test("longer PB windows include recovery elapsed time between reps", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 80, km: 0.8 },
    { t: 180, km: 0.8 },
    { t: 260, km: 1.6 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 0.8), 80);
  assert.equal(fastestElapsedWindowSec(timeline, 1.0), 200);
});

test("drifted windows are skipped without disqualifying the whole activity", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 10, km: 0.1, segmentKph: 36 },
    { t: 20, km: 0.2, segmentKph: 36 },
    { t: 30, km: 0.3, segmentKph: 36 },
    { t: 40, km: 0.4, segmentKph: 36 },
    { t: 100, km: 0.8, segmentKph: 24 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 0.4), 60);
});

test("isolated tiny spikes do not disqualify a long PB window", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 100, km: 0.5, segmentKph: 18 },
    { t: 103, km: 0.522, segmentKph: 26.4 },
    { t: 4200, km: 21.0975, segmentKph: 18 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 21.0975), 4200);
});

test("fastest window can start after warmup and interpolate the end point", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 300, km: 1 },
    { t: 420, km: 2 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 0.5), 60);
});

test("returns null when a track is shorter than the requested PB distance", () => {
  const timeline = [
    { t: 0, km: 0 },
    { t: 80, km: 0.8 },
  ];

  assert.equal(fastestElapsedWindowSec(timeline, 1), null);
});
