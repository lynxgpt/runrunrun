import test from "node:test";
import assert from "node:assert/strict";

import * as statsModule from "./gpx-stats.ts";
import type { GpxSummary } from "./gpx-processed.ts";

const stats = ("default" in statsModule ? statsModule.default : statsModule) as typeof statsModule;
const { streakStats } = stats;
const tracks = stats.tracks as GpxSummary[];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffYMD(start: Date, end: Date) {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    days += prev.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

test("hero stats are derived from current tracks and today's date", () => {
  const first = tracks[0] ? new Date(tracks[0].stats.startTime!) : new Date();
  const uniqueDates = new Set(tracks.map((track) => isoDate(new Date(track.stats.startTime!))));
  const totalKm = tracks.reduce((sum, track) => sum + track.stats.distanceKm, 0);
  const totalMovingSec = tracks.reduce((sum, track) => sum + track.stats.movingSec, 0);
  const totalElevationM = tracks.reduce((sum, track) => sum + track.stats.elevationM, 0);
  const age = diffYMD(first, new Date());

  assert.equal(streakStats.totalDays, uniqueDates.size);
  assert.equal(streakStats.totalKm, Math.round(totalKm));
  assert.equal(streakStats.totalHours, Math.round(totalMovingSec / 3600));
  assert.equal(streakStats.totalElevationM, totalElevationM);
  assert.deepEqual(
    { years: streakStats.years, months: streakStats.months, days: streakStats.days },
    age,
  );
});
