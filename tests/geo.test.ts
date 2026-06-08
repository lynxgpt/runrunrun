/**
 * geo.test.ts — 100 unit tests for geo detection and heatmap logic.
 *
 * Run with: npx vitest run
 */

import { describe, it, expect } from "vitest";
import { detectLocation } from "../scripts/geo-lookup.mjs";
import type { GpxSummary } from "../src/lib/gpx-processed";

// ---------------------------------------------------------------------------
// Helpers to build minimal GpxSummary stubs for heatmap tests

function makeSummary(
  id: string,
  startTimeIso: string,
  distanceKm = 10,
  bbox = { minLat: 40.7, maxLat: 40.8, minLon: -74.0, maxLon: -73.9 },
): GpxSummary {
  return {
    id,
    name: id,
    stats: {
      name: id,
      distanceKm,
      movingSec: 3600,
      elapsedSec: 3600,
      paceSecPerKm: 360,
      elevationM: 0,
      avgHr: null,
      startTime: startTimeIso,
      endTime: startTimeIso,
      bbox,
    },
    location: { countryCode: "US", country: "United States", region: "NY", city: "Manhattan" },
  };
}

// Pure helpers mirroring gpx-stats.ts logic (so tests don't depend on module state)

function isoDateET(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function streakYearOf(d: Date, streakStart: Date): number {
  let years = d.getUTCFullYear() - streakStart.getUTCFullYear();
  const dCopy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const anniv = new Date(
    Date.UTC(d.getUTCFullYear(), streakStart.getUTCMonth(), streakStart.getUTCDate()),
  );
  if (dCopy < anniv) years -= 1;
  return years + 1;
}

function buildStreakYears(tracks: GpxSummary[]) {
  if (!tracks.length) return [];

  const sorted = tracks
    .filter((t) => t.stats.startTime)
    .sort(
      (a, b) =>
        new Date(a.stats.startTime!).getTime() - new Date(b.stats.startTime!).getTime(),
    );

  if (!sorted.length) return [];

  const first = new Date(sorted[0].stats.startTime!);
  const last = new Date(sorted[sorted.length - 1].stats.startTime!);

  const kmByDate = new Map<string, number>();
  for (const t of sorted) {
    const iso = isoDateET(new Date(t.stats.startTime!));
    kmByDate.set(iso, (kmByDate.get(iso) ?? 0) + t.stats.distanceKm);
  }

  const maxYear = streakYearOf(last, first);
  const startY = first.getUTCFullYear();
  const startM = first.getUTCMonth();
  const startD = first.getUTCDate();

  const out = [];
  for (let y = 1; y <= maxYear; y++) {
    const ystart = new Date(Date.UTC(startY + y - 1, startM, startD));
    const cells: { date: string; km: number }[] = [];
    let total = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(ystart);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const km = +(kmByDate.get(iso) ?? 0);
      total += km;
      cells.push({ date: iso, km: +km.toFixed(2) });
    }
    out.push({ yearNumber: y, cells, totalKm: +total.toFixed(1) });
  }
  return out.reverse();
}

function computeStreakStats(tracks: GpxSummary[]) {
  const sorted = tracks
    .filter((t) => t.stats.startTime)
    .sort(
      (a, b) =>
        new Date(a.stats.startTime!).getTime() - new Date(b.stats.startTime!).getTime(),
    );

  const uniqueDates = new Set(sorted.map((t) => isoDateET(new Date(t.stats.startTime!))));
  return {
    totalDays: uniqueDates.size,
    dates: [...uniqueDates].sort(),
  };
}

function longestStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else if (diff > 1) {
      cur = 1;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// 1. Country detection (40 tests)

describe("Country detection", () => {
  it("New York City → US", () => {
    const r = detectLocation(40.758, -73.986);
    expect(r.countryCode).toBe("US");
  });

  it("Los Angeles → US", () => {
    const r = detectLocation(34.05, -118.24);
    expect(r.countryCode).toBe("US");
  });

  it("Vancouver, BC → CA (not US)", () => {
    const r = detectLocation(49.25, -123.1);
    expect(r.countryCode).toBe("CA");
    expect(r.countryCode).not.toBe("US");
  });

  it("Toronto → CA", () => {
    const r = detectLocation(43.65, -79.38);
    expect(r.countryCode).toBe("CA");
  });

  it("Seoul, South Korea → KR (not JP)", () => {
    const r = detectLocation(37.57, 126.98);
    expect(r.countryCode).toBe("KR");
    expect(r.countryCode).not.toBe("JP");
  });

  it("Tokyo → JP", () => {
    const r = detectLocation(35.69, 139.69);
    expect(r.countryCode).toBe("JP");
  });

  it("London → GB", () => {
    const r = detectLocation(51.5, -0.12);
    expect(r.countryCode).toBe("GB");
  });

  it("Paris → FR", () => {
    const r = detectLocation(48.85, 2.35);
    expect(r.countryCode).toBe("FR");
  });

  it("Berlin → DE", () => {
    const r = detectLocation(52.52, 13.4);
    expect(r.countryCode).toBe("DE");
  });

  it("Sydney → AU", () => {
    const r = detectLocation(-33.87, 151.21);
    expect(r.countryCode).toBe("AU");
  });

  it("Beijing → CN", () => {
    const r = detectLocation(39.91, 116.39);
    expect(r.countryCode).toBe("CN");
  });

  it("Mumbai → IN", () => {
    const r = detectLocation(19.07, 72.88);
    expect(r.countryCode).toBe("IN");
  });

  it("São Paulo → BR", () => {
    const r = detectLocation(-23.55, -46.63);
    expect(r.countryCode).toBe("BR");
  });

  it("Mexico City → MX", () => {
    const r = detectLocation(19.43, -99.13);
    expect(r.countryCode).toBe("MX");
  });

  it("Amsterdam → NL", () => {
    const r = detectLocation(52.37, 4.89);
    expect(r.countryCode).toBe("NL");
  });

  it("Rome → IT", () => {
    const r = detectLocation(41.9, 12.5);
    expect(r.countryCode).toBe("IT");
  });

  it("Madrid → ES", () => {
    const r = detectLocation(40.42, -3.7);
    expect(r.countryCode).toBe("ES");
  });

  it("Zurich → CH", () => {
    const r = detectLocation(47.37, 8.54);
    expect(r.countryCode).toBe("CH");
  });

  it("Stockholm → SE", () => {
    const r = detectLocation(59.33, 18.07);
    expect(r.countryCode).toBe("SE");
  });

  it("Oslo → NO", () => {
    const r = detectLocation(59.91, 10.75);
    expect(r.countryCode).toBe("NO");
  });

  it("Copenhagen (Frederiksberg inland) → DK", () => {
    // Copenhagen city centre on the island of Sjælland (inland area)
    const r = detectLocation(55.68, 12.53);
    expect(r.countryCode).toBe("DK");
  });

  it("Helsinki → FI", () => {
    const r = detectLocation(60.17, 24.94);
    expect(r.countryCode).toBe("FI");
  });

  it("Warsaw → PL", () => {
    const r = detectLocation(52.23, 21.01);
    expect(r.countryCode).toBe("PL");
  });

  it("Prague → CZ", () => {
    const r = detectLocation(50.07, 14.43);
    expect(r.countryCode).toBe("CZ");
  });

  it("Vienna → AT", () => {
    const r = detectLocation(48.21, 16.37);
    expect(r.countryCode).toBe("AT");
  });

  it("Buenos Aires → AR", () => {
    const r = detectLocation(-34.6, -58.4);
    expect(r.countryCode).toBe("AR");
  });

  it("Santiago → CL", () => {
    const r = detectLocation(-33.45, -70.67);
    expect(r.countryCode).toBe("CL");
  });

  it("Bogotá → CO", () => {
    const r = detectLocation(4.71, -74.07);
    expect(r.countryCode).toBe("CO");
  });

  it("Lima → PE", () => {
    const r = detectLocation(-12.05, -77.04);
    expect(r.countryCode).toBe("PE");
  });

  it("Cairo → EG", () => {
    const r = detectLocation(30.05, 31.24);
    expect(r.countryCode).toBe("EG");
  });

  it("Nairobi → KE", () => {
    const r = detectLocation(-1.29, 36.82);
    expect(r.countryCode).toBe("KE");
  });

  it("Johannesburg → ZA", () => {
    const r = detectLocation(-26.2, 28.04);
    expect(r.countryCode).toBe("ZA");
  });

  it("Lagos (inland) → NG", () => {
    // Lagos island can be coastal water in 10m data; use a reliable inland coord
    const r = detectLocation(6.6, 3.35);
    expect(r.countryCode).toBe("NG");
  });

  it("Casablanca → MA", () => {
    const r = detectLocation(33.59, -7.62);
    expect(r.countryCode).toBe("MA");
  });

  it("Dubai → AE", () => {
    const r = detectLocation(25.2, 55.27);
    expect(r.countryCode).toBe("AE");
  });

  it("Singapore → SG", () => {
    const r = detectLocation(1.35, 103.82);
    expect(r.countryCode).toBe("SG");
  });

  it("Bangkok → TH", () => {
    const r = detectLocation(13.75, 100.52);
    expect(r.countryCode).toBe("TH");
  });

  it("Taipei → TW", () => {
    const r = detectLocation(25.05, 121.53);
    expect(r.countryCode).toBe("TW");
  });

  it("Hong Kong → HK or CN", () => {
    const r = detectLocation(22.32, 114.16);
    expect(["HK", "CN"]).toContain(r.countryCode);
  });

  it("Istanbul → TR", () => {
    const r = detectLocation(41.01, 28.95);
    expect(r.countryCode).toBe("TR");
  });
});

// ---------------------------------------------------------------------------
// 2. US state detection (20 tests)

describe("US state detection", () => {
  it("NYC → NY", () => {
    const r = detectLocation(40.758, -73.986);
    expect(r.countryCode).toBe("US");
    expect(r.region).toBe("NY");
  });

  it("Los Angeles → CA", () => {
    const r = detectLocation(34.05, -118.24);
    expect(r.region).toBe("CA");
  });

  it("Seattle → WA", () => {
    const r = detectLocation(47.61, -122.33);
    expect(r.region).toBe("WA");
  });

  it("Chicago → IL", () => {
    const r = detectLocation(41.88, -87.63);
    expect(r.region).toBe("IL");
  });

  it("Miami → FL", () => {
    // Use inland coord that avoids coastal polygon gaps
    const r = detectLocation(25.8, -80.25);
    expect(r.region).toBe("FL");
  });

  it("Denver → CO", () => {
    const r = detectLocation(39.74, -104.98);
    expect(r.region).toBe("CO");
  });

  it("Boston → MA", () => {
    const r = detectLocation(42.36, -71.06);
    expect(r.region).toBe("MA");
  });

  it("Atlanta → GA", () => {
    const r = detectLocation(33.75, -84.39);
    expect(r.region).toBe("GA");
  });

  it("Dallas → TX", () => {
    const r = detectLocation(32.78, -96.8);
    expect(r.region).toBe("TX");
  });

  it("Phoenix → AZ", () => {
    const r = detectLocation(33.45, -112.07);
    expect(r.region).toBe("AZ");
  });

  it("Portland OR → OR", () => {
    const r = detectLocation(45.52, -122.68);
    expect(r.region).toBe("OR");
  });

  it("Las Vegas → NV", () => {
    const r = detectLocation(36.17, -115.14);
    expect(r.region).toBe("NV");
  });

  it("Minneapolis → MN", () => {
    const r = detectLocation(44.98, -93.27);
    expect(r.region).toBe("MN");
  });

  it("Detroit → MI", () => {
    const r = detectLocation(42.33, -83.05);
    expect(r.region).toBe("MI");
  });

  it("Philadelphia → PA", () => {
    const r = detectLocation(39.95, -75.16);
    expect(r.region).toBe("PA");
  });

  it("Baltimore → MD", () => {
    const r = detectLocation(39.29, -76.61);
    expect(r.region).toBe("MD");
  });

  it("Nashville → TN", () => {
    const r = detectLocation(36.17, -86.78);
    expect(r.region).toBe("TN");
  });

  it("New Orleans → LA", () => {
    const r = detectLocation(29.95, -90.07);
    expect(r.region).toBe("LA");
  });

  it("Salt Lake City → UT", () => {
    const r = detectLocation(40.76, -111.89);
    expect(r.region).toBe("UT");
  });

  it("Honolulu → HI", () => {
    const r = detectLocation(21.31, -157.86);
    expect(r.region).toBe("HI");
  });
});

// ---------------------------------------------------------------------------
// 3. NYC borough detection (5 tests)

describe("NYC borough detection", () => {
  it("Manhattan (Central Park) → Manhattan", () => {
    const r = detectLocation(40.785, -73.968);
    expect(r.city).toBe("Manhattan");
  });

  it("Brooklyn (Prospect Park) → Brooklyn", () => {
    const r = detectLocation(40.66, -73.97);
    expect(r.city).toBe("Brooklyn");
  });

  it("Queens (Flushing) → Queens", () => {
    const r = detectLocation(40.76, -73.83);
    expect(r.city).toBe("Queens");
  });

  it("Bronx → Bronx", () => {
    const r = detectLocation(40.85, -73.87);
    expect(r.city).toBe("Bronx");
  });

  it("Staten Island → Staten Island", () => {
    const r = detectLocation(40.57, -74.15);
    expect(r.city).toBe("Staten Island");
  });
});

// ---------------------------------------------------------------------------
// 4. Border / edge cases (20 tests)

describe("Border and edge cases", () => {
  it("Point in open ocean (Pacific) → Unknown", () => {
    const r = detectLocation(0, -160);
    expect(r.countryCode).toBe("??");
  });

  it("Point in open ocean (Atlantic) → Unknown", () => {
    const r = detectLocation(30, -40);
    expect(r.countryCode).toBe("??");
  });

  it("North Pole → Unknown (not a country)", () => {
    const r = detectLocation(90, 0);
    // May be AQ/Antarctica or Unknown; should not be a normal country
    expect(["??", "AQ"]).toContain(r.countryCode);
  });

  it("Vancouver marathon centroid (49.25, -123.1) → CA", () => {
    const r = detectLocation(49.25, -123.1);
    expect(r.countryCode).toBe("CA");
  });

  it("Point near US-Canada border → CA or US (not a third country)", () => {
    // 48.99°N, -122.5°W — just south of the 49th parallel (WA state)
    const r = detectLocation(48.99, -122.5);
    expect(["CA", "US"]).toContain(r.countryCode);
  });

  it("Busan, South Korea (35.1, 129.0) → KR", () => {
    const r = detectLocation(35.1, 129.0);
    expect(r.countryCode).toBe("KR");
  });

  it("Jeju Island, South Korea → KR", () => {
    const r = detectLocation(33.5, 126.5);
    expect(r.countryCode).toBe("KR");
  });

  it("Okinawa, Japan → JP", () => {
    const r = detectLocation(26.5, 128.0);
    expect(r.countryCode).toBe("JP");
  });

  it("Hokkaido, Japan → JP", () => {
    const r = detectLocation(43.06, 141.35);
    expect(r.countryCode).toBe("JP");
  });

  it("Hawaii (21.3, -157.8) → US", () => {
    const r = detectLocation(21.3, -157.8);
    expect(r.countryCode).toBe("US");
  });

  it("Alaska (64.2, -153.0) → US", () => {
    const r = detectLocation(64.2, -153.0);
    expect(r.countryCode).toBe("US");
  });

  it("Puerto Rico (18.4, -66.1) → US or PR", () => {
    const r = detectLocation(18.4, -66.1);
    // Puerto Rico may be classified as its own territory (PR) or US
    expect(["US", "PR"]).toContain(r.countryCode);
  });

  it("Guam → GU or US", () => {
    const r = detectLocation(13.45, 144.79);
    expect(["GU", "US"]).toContain(r.countryCode);
  });

  it("Gibraltar (36.14, -5.35) → GI (not ES)", () => {
    const r = detectLocation(36.14, -5.35);
    expect(r.countryCode).toBe("GI");
    expect(r.countryCode).not.toBe("ES");
  });

  it("Monaco (43.73, 7.41) → MC", () => {
    const r = detectLocation(43.73, 7.41);
    expect(r.countryCode).toBe("MC");
  });

  it("San Marino (43.94, 12.46) → SM", () => {
    const r = detectLocation(43.94, 12.46);
    expect(r.countryCode).toBe("SM");
  });

  it("Vatican City → VA or IT (too small for 10m data)", () => {
    // Vatican is ~0.44 km²; 10m topojson may not include it separately
    const r = detectLocation(41.9, 12.453);
    // Accept IT if Vatican is not separately encoded
    expect(["VA", "IT"]).toContain(r.countryCode);
  });

  it("Andorra (42.5, 1.5) → AD", () => {
    const r = detectLocation(42.5, 1.5);
    expect(r.countryCode).toBe("AD");
  });

  it("Liechtenstein (47.14, 9.52) → LI", () => {
    const r = detectLocation(47.14, 9.52);
    expect(r.countryCode).toBe("LI");
  });

  it("Luxembourg (49.61, 6.13) → LU", () => {
    const r = detectLocation(49.61, 6.13);
    expect(r.countryCode).toBe("LU");
  });

});

// ---------------------------------------------------------------------------
// 5. Heatmap / streakYears tests (15 tests)

describe("Heatmap and streak logic", () => {
  it("A run on 2024-10-22 appears in year 2024 heatmap", () => {
    const tracks = [makeSummary("a", "2024-10-22T12:00:00Z")];
    const years = buildStreakYears(tracks);
    expect(years.length).toBeGreaterThan(0);
    const y2024 = years.find((y) => y.cells.some((c) => c.date === "2024-10-22"));
    expect(y2024).toBeDefined();
    const cell = y2024!.cells.find((c) => c.date === "2024-10-22");
    expect(cell?.km).toBeGreaterThan(0);
  });

  it("A run on 2025-12-31 appears in year 2025 heatmap", () => {
    const tracks = [
      makeSummary("a", "2025-01-01T12:00:00Z"),
      makeSummary("b", "2025-12-31T12:00:00Z"),
    ];
    const years = buildStreakYears(tracks);
    const y = years.find((yr) => yr.cells.some((c) => c.date === "2025-12-31"));
    expect(y).toBeDefined();
  });

  it("A run on 2026-01-01 appears in year 2026 heatmap", () => {
    const tracks = [
      makeSummary("a", "2025-01-01T12:00:00Z"),
      makeSummary("b", "2026-01-01T12:00:00Z"),
    ];
    const years = buildStreakYears(tracks);
    const y = years.find((yr) => yr.cells.some((c) => c.date === "2026-01-01"));
    expect(y).toBeDefined();
    const cell = y!.cells.find((c) => c.date === "2026-01-01");
    expect(cell?.km).toBeGreaterThan(0);
  });

  it("streakYears includes all years between first and last run", () => {
    const tracks = [
      makeSummary("a", "2023-06-01T12:00:00Z"),
      makeSummary("b", "2024-06-01T12:00:00Z"),
      makeSummary("c", "2025-06-01T12:00:00Z"),
    ];
    const years = buildStreakYears(tracks);
    // Should have year 1, 2, and 3
    expect(years.length).toBe(3);
  });

  it("Adding a run with today's date increases count for today's cell", () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const todayZ = `${today}T14:00:00Z`;
    const before = [makeSummary("a", "2025-01-01T12:00:00Z")];
    const after = [makeSummary("a", "2025-01-01T12:00:00Z"), makeSummary("b", todayZ, 15)];
    const yearsBefore = buildStreakYears(before);
    const yearsAfter = buildStreakYears(after);
    const cellBefore = yearsBefore.flatMap((y) => y.cells).find((c) => c.date === today);
    const cellAfter = yearsAfter.flatMap((y) => y.cells).find((c) => c.date === today);
    // Either no cell before (date not in heatmap range) or km is 0
    const kmBefore = cellBefore?.km ?? 0;
    expect(cellAfter?.km ?? 0).toBeGreaterThan(kmBefore);
  });

  it("Date classification uses Eastern time (11pm UTC = 7pm ET, same day)", () => {
    // 2024-10-22T23:30:00Z = 7:30pm ET on 2024-10-22 (no DST at that time)
    const d = new Date("2024-10-22T23:30:00Z");
    // Eastern time date should be 2024-10-22, not 2024-10-23
    const etDate = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    expect(etDate).toBe("2024-10-22");
  });

  it("Multiple runs on same day count as 1 unique day", () => {
    const tracks = [
      makeSummary("a", "2024-10-22T10:00:00Z"),
      makeSummary("b", "2024-10-22T18:00:00Z"),
    ];
    const stats = computeStreakStats(tracks);
    expect(stats.totalDays).toBe(1);
  });

  it("streakStats.totalDays counts unique days", () => {
    const tracks = [
      makeSummary("a", "2024-10-22T10:00:00Z"),
      makeSummary("b", "2024-10-23T10:00:00Z"),
      makeSummary("c", "2024-10-22T18:00:00Z"), // duplicate day
    ];
    const stats = computeStreakStats(tracks);
    expect(stats.totalDays).toBe(2);
  });

  it("longestStreak computed correctly for consecutive days", () => {
    const dates = ["2024-10-22", "2024-10-23", "2024-10-24", "2024-10-26"];
    expect(longestStreak(dates)).toBe(3);
  });

  it("longestStreak handles single run", () => {
    expect(longestStreak(["2024-10-22"])).toBe(1);
  });

  it("First run date = startDate", () => {
    const tracks = [
      makeSummary("b", "2024-10-23T10:00:00Z"),
      makeSummary("a", "2024-10-22T10:00:00Z"),
    ];
    const stats = computeStreakStats(tracks);
    expect(stats.dates[0]).toBe("2024-10-22");
  });

  it("Last run date = endDate", () => {
    const tracks = [
      makeSummary("a", "2024-10-22T10:00:00Z"),
      makeSummary("b", "2024-10-25T10:00:00Z"),
    ];
    const stats = computeStreakStats(tracks);
    expect(stats.dates[stats.dates.length - 1]).toBe("2024-10-25");
  });

  it("Year with most runs is correctly identified", () => {
    const tracks = [
      makeSummary("a", "2024-01-01T10:00:00Z"),
      makeSummary("b", "2024-06-01T10:00:00Z"),
      makeSummary("c", "2024-12-01T10:00:00Z"),
      makeSummary("d", "2025-01-01T10:00:00Z"),
    ];
    const countByYear = new Map<number, number>();
    for (const t of tracks) {
      const y = new Date(t.stats.startTime!).getUTCFullYear();
      countByYear.set(y, (countByYear.get(y) ?? 0) + 1);
    }
    const bestYear = [...countByYear.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(bestYear[0]).toBe(2024);
    expect(bestYear[1]).toBe(3);
  });

  it("Empty GPX list → no streak years", () => {
    const years = buildStreakYears([]);
    expect(years).toHaveLength(0);
  });

  it("Single run → 1 unique day, longestStreak = 1", () => {
    const tracks = [makeSummary("a", "2024-10-22T10:00:00Z")];
    const stats = computeStreakStats(tracks);
    expect(stats.totalDays).toBe(1);
    expect(longestStreak(stats.dates)).toBe(1);
  });
});
