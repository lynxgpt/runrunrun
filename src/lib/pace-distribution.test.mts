import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMovingTimeline,
  buildPaceDistributionFromSamples,
  minutePacesFromMovingTimeline,
  minutePacesFromTrackPoints,
  paceBinIndexFor,
} from "./pace-distribution.ts";

function kmToLon(km: number) {
  return km / 111.3208;
}

function point(lat: number, lon: number, second: number) {
  return {
    lat,
    lon,
    time: new Date(Date.UTC(2025, 0, 1, 0, 0, second)).toISOString(),
  };
}

test("minutePacesFromMovingTimeline interpolates exact 60-second windows", () => {
  const timeline = [
    { movingSec: 0, distanceKm: 0 },
    { movingSec: 20, distanceKm: 0.1 },
    { movingSec: 75, distanceKm: 0.4 },
    { movingSec: 130, distanceKm: 0.7 },
  ];

  const paces = minutePacesFromMovingTimeline(timeline);

  assert.equal(paces.length, 2);
  assert.ok(Math.abs(paces[0] - 188.57142857142856) < 1e-9);
  assert.ok(Math.abs(paces[1] - 183.33333333333334) < 1e-9);
});

test("minutePacesFromTrackPoints compresses pause gaps instead of treating them as slow minutes", () => {
  const paceKmPerMinute = 0.2;
  const stepKm = paceKmPerMinute / 6;
  const pts = [
    point(0, kmToLon(0), 0),
    point(0, kmToLon(stepKm * 1), 10),
    point(0, kmToLon(stepKm * 2), 20),
    point(0, kmToLon(stepKm * 3), 30),
    point(0, kmToLon(stepKm * 3), 90),
    point(0, kmToLon(stepKm * 4), 100),
    point(0, kmToLon(stepKm * 5), 110),
    point(0, kmToLon(stepKm * 6), 120),
  ];

  const paces = minutePacesFromTrackPoints(pts);

  assert.equal(paces.length, 1);
  assert.ok(Math.abs(paces[0] - 300) < 1);
});

test("buildMovingTimeline drops long gaps from moving-time accumulation", () => {
  const pts = [
    point(0, kmToLon(0), 0),
    point(0, kmToLon(0.05), 10),
    point(0, kmToLon(0.1), 20),
    point(0, kmToLon(0.1), 80),
    point(0, kmToLon(0.15), 90),
  ];

  const timeline = buildMovingTimeline(pts);

  assert.equal(timeline.length, 4);
  assert.equal(timeline.at(-1)?.movingSec, 30);
});

test("buildPaceDistributionFromSamples uses true sample counts and even-sized median", () => {
  const samples = [180, 240, 300, 480];

  const distribution = buildPaceDistributionFromSamples(samples);

  assert.equal(distribution.meanSec, 300);
  assert.equal(distribution.medianSec, 270);
  assert.equal(distribution.meanBin, paceBinIndexFor(300));
  assert.equal(distribution.medianBin, paceBinIndexFor(270));
  assert.equal(distribution.bins.reduce((sum, count) => sum + count, 0), 4);
  assert.equal(distribution.bins[paceBinIndexFor(180)], 1);
  assert.equal(distribution.bins[paceBinIndexFor(240)], 1);
  assert.equal(distribution.bins[paceBinIndexFor(300)], 1);
  assert.equal(distribution.bins[paceBinIndexFor(480)], 1);
});
