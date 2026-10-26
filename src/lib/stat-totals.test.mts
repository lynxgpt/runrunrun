// Cross-checks between the aggregates the page shows: every breakdown must
// add back up to the same set of runs.
import test from "node:test";
import assert from "node:assert/strict";

import * as statsModule from "./gpx-stats.ts";

const stats = ("default" in statsModule ? statsModule.default : statsModule) as typeof statsModule;
const { tracks, streakStats, countriesVisited, usStatesVisited, nycBoroughsVisited, monthlyMileage, runDistances, notableRuns } = stats;

const totalKm = tracks.reduce((s, t) => s + t.stats.distanceKm, 0);
const sumKm = (rows: { km: number }[]) => rows.reduce((s, r) => s + r.km, 0);

test("country rows cover every run", () => {
  assert.ok(Math.abs(sumKm(countriesVisited) - totalKm) < 0.05 * countriesVisited.length + 0.01);
});

test("US state rows add up to the US row", () => {
  const us = countriesVisited.find((c) => c.code === "US");
  assert.ok(us);
  assert.ok(Math.abs(sumKm(usStatesVisited) - us.km) < 0.05 * usStatesVisited.length + 0.05);
});

test("NYC borough rows fit inside New York", () => {
  const ny = usStatesVisited.find((s) => s.code === "NY");
  assert.ok(ny);
  assert.ok(sumKm(nycBoroughsVisited) <= ny.km + 0.05 * nycBoroughsVisited.length);
  for (const b of nycBoroughsVisited) assert.ok(b.days <= ny.days, b.name);
});

test("monthly mileage adds up to the total", () => {
  // Each month is rounded to whole km.
  assert.ok(Math.abs(sumKm(monthlyMileage) - totalKm) <= monthlyMileage.length * 0.5);
  assert.ok(Math.abs(streakStats.totalKm - totalKm) <= 0.5);
});

test("distance histogram counts every run once", () => {
  assert.equal(runDistances.reduce((s, b) => s + b.count, 0), tracks.length);
});

test("longest and elevation lists rank every run", () => {
  assert.equal(notableRuns.longest.length, tracks.length);
  assert.equal(notableRuns.elevation.length, tracks.length);
});
