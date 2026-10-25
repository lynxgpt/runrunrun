// Geo regression suite for locationFor().
//
// These coordinate expectations were ported from the retired `master`
// branch's vitest suite (tests/geo.test.ts, archived under the
// archive/master-2026-08-07 tag) and retargeted at main's own locationFor(),
// which main had no geo coverage for. Each case probes one real coordinate
// from the run archive; the names are the originals.
//
// The probe sets meanLat/meanLon and startLat/startLon to the same point and
// leaves stats.city unset, so locationFor() resolves purely from polygon
// geometry rather than short-circuiting on Strava's own city metadata.

import test from "node:test";
import assert from "node:assert/strict";

import * as statsModule from "./gpx-stats.ts";
import type { GpxSummary } from "./gpx-processed.ts";

const stats = ("default" in statsModule ? statsModule.default : statsModule) as typeof statsModule;
const { locationFor } = stats;

function at(lat: number, lon: number) {
  const probe = {
    id: "probe",
    stats: {
      name: "probe",
      distanceKm: 5,
      movingSec: 1800,
      elapsedSec: 1800,
      paceSecPerKm: 360,
      elevationM: 0,
      avgHr: null,
      startTime: "2026-01-01T12:00:00Z",
      endTime: "2026-01-01T12:30:00Z",
      startLat: lat,
      startLon: lon,
      meanLat: lat,
      meanLon: lon,
      bbox: {
        minLat: lat - 0.001,
        maxLat: lat + 0.001,
        minLon: lon - 0.001,
        maxLon: lon + 0.001,
      },
    },
  } as unknown as GpxSummary;
  return locationFor(probe);
}


// ------------------------------------------------------------------------
// Country detection

test("Country detection: New York City → US", () => {
  const r = at(40.758, -73.986);
  assert.equal(r.countryCode, "US");
});

test("Country detection: Los Angeles → US", () => {
  const r = at(34.05, -118.24);
  assert.equal(r.countryCode, "US");
});

test("Country detection: Vancouver, BC → CA (not US)", () => {
  const r = at(49.25, -123.1);
  assert.equal(r.countryCode, "CA");
  assert.notEqual(r.countryCode, "US");
});

test("Country detection: Toronto → CA", () => {
  const r = at(43.65, -79.38);
  assert.equal(r.countryCode, "CA");
});

test("Country detection: Seoul, South Korea → KR (not JP)", () => {
  const r = at(37.57, 126.98);
  assert.equal(r.countryCode, "KR");
  assert.notEqual(r.countryCode, "JP");
});

test("Country detection: Tokyo → JP", () => {
  const r = at(35.69, 139.69);
  assert.equal(r.countryCode, "JP");
});

test("Country detection: London → GB", () => {
  const r = at(51.5, -0.12);
  assert.equal(r.countryCode, "GB");
});

test("Country detection: Paris → FR", () => {
  const r = at(48.85, 2.35);
  assert.equal(r.countryCode, "FR");
});

test("Country detection: Berlin → DE", () => {
  const r = at(52.52, 13.4);
  assert.equal(r.countryCode, "DE");
});

test("Country detection: Sydney → AU", () => {
  const r = at(-33.87, 151.21);
  assert.equal(r.countryCode, "AU");
});

test("Country detection: Beijing → CN", () => {
  const r = at(39.91, 116.39);
  assert.equal(r.countryCode, "CN");
});

test("Country detection: Mumbai → IN", () => {
  const r = at(19.07, 72.88);
  assert.equal(r.countryCode, "IN");
});

test("Country detection: São Paulo → BR", () => {
  const r = at(-23.55, -46.63);
  assert.equal(r.countryCode, "BR");
});

test("Country detection: Mexico City → MX", () => {
  const r = at(19.43, -99.13);
  assert.equal(r.countryCode, "MX");
});

test("Country detection: Amsterdam → NL", () => {
  const r = at(52.37, 4.89);
  assert.equal(r.countryCode, "NL");
});

test("Country detection: Rome → IT", () => {
  const r = at(41.9, 12.5);
  assert.equal(r.countryCode, "IT");
});

test("Country detection: Madrid → ES", () => {
  const r = at(40.42, -3.7);
  assert.equal(r.countryCode, "ES");
});

test("Country detection: Zurich → CH", () => {
  const r = at(47.37, 8.54);
  assert.equal(r.countryCode, "CH");
});

test("Country detection: Stockholm → SE", () => {
  const r = at(59.33, 18.07);
  assert.equal(r.countryCode, "SE");
});

test("Country detection: Oslo → NO", () => {
  const r = at(59.91, 10.75);
  assert.equal(r.countryCode, "NO");
});

test("Country detection: Copenhagen (Frederiksberg inland) → DK", () => {
  const r = at(55.68, 12.53);
  assert.equal(r.countryCode, "DK");
});

test("Country detection: Helsinki → FI", () => {
  const r = at(60.17, 24.94);
  assert.equal(r.countryCode, "FI");
});

test("Country detection: Warsaw → PL", () => {
  const r = at(52.23, 21.01);
  assert.equal(r.countryCode, "PL");
});

test("Country detection: Prague → CZ", () => {
  const r = at(50.07, 14.43);
  assert.equal(r.countryCode, "CZ");
});

test("Country detection: Vienna → AT", () => {
  const r = at(48.21, 16.37);
  assert.equal(r.countryCode, "AT");
});

test("Country detection: Buenos Aires → AR", () => {
  const r = at(-34.6, -58.4);
  assert.equal(r.countryCode, "AR");
});

test("Country detection: Santiago → CL", () => {
  const r = at(-33.45, -70.67);
  assert.equal(r.countryCode, "CL");
});

test("Country detection: Bogotá → CO", () => {
  const r = at(4.71, -74.07);
  assert.equal(r.countryCode, "CO");
});

test("Country detection: Lima → PE", () => {
  const r = at(-12.05, -77.04);
  assert.equal(r.countryCode, "PE");
});

test("Country detection: Cairo → EG", () => {
  const r = at(30.05, 31.24);
  assert.equal(r.countryCode, "EG");
});

test("Country detection: Nairobi → KE", () => {
  const r = at(-1.29, 36.82);
  assert.equal(r.countryCode, "KE");
});

test("Country detection: Johannesburg → ZA", () => {
  const r = at(-26.2, 28.04);
  assert.equal(r.countryCode, "ZA");
});

test("Country detection: Lagos (inland) → NG", () => {
  const r = at(6.6, 3.35);
  assert.equal(r.countryCode, "NG");
});

test("Country detection: Casablanca → MA", () => {
  const r = at(33.59, -7.62);
  assert.equal(r.countryCode, "MA");
});

test("Country detection: Dubai → AE", () => {
  const r = at(25.2, 55.27);
  assert.equal(r.countryCode, "AE");
});

test("Country detection: Singapore → SG", () => {
  const r = at(1.35, 103.82);
  assert.equal(r.countryCode, "SG");
});

test("Country detection: Bangkok → TH", () => {
  const r = at(13.75, 100.52);
  assert.equal(r.countryCode, "TH");
});

test("Country detection: Taipei → TW", () => {
  const r = at(25.05, 121.53);
  assert.equal(r.countryCode, "TW");
});

test("Country detection: Istanbul → TR", () => {
  const r = at(41.01, 28.95);
  assert.equal(r.countryCode, "TR");
});


// ------------------------------------------------------------------------
// US state detection

test("US state detection: NYC → NY", () => {
  const r = at(40.758, -73.986);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
});

test("US state detection: Los Angeles → CA", () => {
  const r = at(34.05, -118.24);
  assert.equal(r.region, "CA");
});

test("US state detection: Seattle → WA", () => {
  const r = at(47.61, -122.33);
  assert.equal(r.region, "WA");
});

test("US state detection: Chicago → IL", () => {
  const r = at(41.88, -87.63);
  assert.equal(r.region, "IL");
});

test("US state detection: Miami → FL", () => {
  const r = at(25.8, -80.25);
  assert.equal(r.region, "FL");
});

test("US state detection: Denver → CO", () => {
  const r = at(39.74, -104.98);
  assert.equal(r.region, "CO");
});

test("US state detection: Boston → MA", () => {
  const r = at(42.36, -71.06);
  assert.equal(r.region, "MA");
});

test("US state detection: Atlanta → GA", () => {
  const r = at(33.75, -84.39);
  assert.equal(r.region, "GA");
});

test("US state detection: Dallas → TX", () => {
  const r = at(32.78, -96.8);
  assert.equal(r.region, "TX");
});

test("US state detection: Phoenix → AZ", () => {
  const r = at(33.45, -112.07);
  assert.equal(r.region, "AZ");
});

test("US state detection: Portland OR → OR", () => {
  const r = at(45.52, -122.68);
  assert.equal(r.region, "OR");
});

test("US state detection: Las Vegas → NV", () => {
  const r = at(36.17, -115.14);
  assert.equal(r.region, "NV");
});

test("US state detection: Minneapolis → MN", () => {
  const r = at(44.98, -93.27);
  assert.equal(r.region, "MN");
});

test("US state detection: Detroit → MI", () => {
  const r = at(42.33, -83.05);
  assert.equal(r.region, "MI");
});

test("US state detection: Philadelphia → PA", () => {
  const r = at(39.95, -75.16);
  assert.equal(r.region, "PA");
});

test("US state detection: Baltimore → MD", () => {
  const r = at(39.29, -76.61);
  assert.equal(r.region, "MD");
});

test("US state detection: Nashville → TN", () => {
  const r = at(36.17, -86.78);
  assert.equal(r.region, "TN");
});

test("US state detection: New Orleans → LA", () => {
  const r = at(29.95, -90.07);
  assert.equal(r.region, "LA");
});

test("US state detection: Salt Lake City → UT", () => {
  const r = at(40.76, -111.89);
  assert.equal(r.region, "UT");
});

test("US state detection: Honolulu → HI", () => {
  const r = at(21.31, -157.86);
  assert.equal(r.region, "HI");
});


// ------------------------------------------------------------------------
// NYC borough detection

test("NYC borough detection: Manhattan (Central Park) → Manhattan", () => {
  const r = at(40.785, -73.968);
  assert.equal(r.city, "Manhattan");
});

test("NYC borough detection: Brooklyn (Prospect Park) → Brooklyn", () => {
  const r = at(40.66, -73.97);
  assert.equal(r.city, "Brooklyn");
});

test("NYC borough detection: Queens (Flushing) → Queens", () => {
  const r = at(40.76, -73.83);
  assert.equal(r.city, "Queens");
});

test("NYC borough detection: Bronx → Bronx", () => {
  const r = at(40.85, -73.87);
  assert.equal(r.city, "Bronx");
});

test("NYC borough detection: Staten Island → Staten Island", () => {
  const r = at(40.57, -74.15);
  assert.equal(r.city, "Staten Island");
});


// ------------------------------------------------------------------------
// Border and edge cases

test("Border and edge cases: Point in open ocean (Pacific) → Unknown", () => {
  const r = at(0, -160);
  assert.equal(r.countryCode, "??");
});

test("Border and edge cases: Point in open ocean (Atlantic) → Unknown", () => {
  const r = at(30, -40);
  assert.equal(r.countryCode, "??");
});

test("Border and edge cases: Vancouver marathon centroid (49.25, -123.1) → CA", () => {
  const r = at(49.25, -123.1);
  assert.equal(r.countryCode, "CA");
});

test("Border and edge cases: Busan, South Korea (35.1, 129.0) → KR", () => {
  const r = at(35.1, 129);
  assert.equal(r.countryCode, "KR");
});

test("Border and edge cases: Jeju Island, South Korea → KR", () => {
  const r = at(33.5, 126.5);
  assert.equal(r.countryCode, "KR");
});

test("Border and edge cases: Okinawa, Japan → JP", () => {
  const r = at(26.5, 128);
  assert.equal(r.countryCode, "JP");
});

test("Border and edge cases: Hokkaido, Japan → JP", () => {
  const r = at(43.06, 141.35);
  assert.equal(r.countryCode, "JP");
});

test("Border and edge cases: Hawaii (21.3, -157.8) → US", () => {
  const r = at(21.3, -157.8);
  assert.equal(r.countryCode, "US");
});

test("Border and edge cases: Alaska (64.2, -153.0) → US", () => {
  const r = at(64.2, -153);
  assert.equal(r.countryCode, "US");
});

test("Border and edge cases: Gibraltar (36.14, -5.35) → GI (not ES)", () => {
  const r = at(36.14, -5.35);
  assert.equal(r.countryCode, "GI");
  assert.notEqual(r.countryCode, "ES");
});

test("Border and edge cases: Monaco (43.73, 7.41) → MC", () => {
  const r = at(43.73, 7.41);
  assert.equal(r.countryCode, "MC");
});

test("Border and edge cases: San Marino (43.94, 12.46) → SM", () => {
  const r = at(43.94, 12.46);
  assert.equal(r.countryCode, "SM");
});

test("Border and edge cases: Andorra (42.5, 1.5) → AD", () => {
  const r = at(42.5, 1.5);
  assert.equal(r.countryCode, "AD");
});

test("Border and edge cases: Liechtenstein (47.14, 9.52) → LI", () => {
  const r = at(47.14, 9.52);
  assert.equal(r.countryCode, "LI");
});

test("Border and edge cases: Luxembourg (49.61, 6.13) → LU", () => {
  const r = at(49.61, 6.13);
  assert.equal(r.countryCode, "LU");
});


// ------------------------------------------------------------------------
// Formerly-Unknown runs — correct city identification

test("Formerly-Unknown runs — correct city identification: afternoon-run-14737228449 — Long Island City → Queens NY", () => {
  const r = at(40.761005, -73.950877);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: run-13451942159 — Weehawken/NJ area → NJ", () => {
  const r = at(40.782417, -74.004874);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NJ");
});

test("Formerly-Unknown runs — correct city identification: 3-13576826295 — Hudson/NJ area mean → NJ", () => {
  const r = at(40.811117, -73.976921);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NJ");
});

test("Formerly-Unknown runs — correct city identification: 3-13576826295 — start point Manhattan → NY/Manhattan", () => {
  const r = at(40.760208, -74.003321);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
});

test("Formerly-Unknown runs — correct city identification: run-13682569537 — Miami Beach → FL", () => {
  const r = at(25.789587, -80.148888);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "FL");
});

test("Formerly-Unknown runs — correct city identification: run-14193815591 — Charleston SC → SC", () => {
  const r = at(32.781658, -79.943769);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "SC");
});

test("Formerly-Unknown runs — correct city identification: run-14257505627 — Hudson Yards/Manhattan → NY/Manhattan", () => {
  const r = at(40.741731, -74.015503);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Manhattan");
});

test("Formerly-Unknown runs — correct city identification: evening-run-15371476873 — Financial District → NY/Manhattan", () => {
  const r = at(40.702093, -73.998585);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Manhattan");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-15438693660 — Chelsea area → NY/Manhattan", () => {
  const r = at(40.742673, -74.009966);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Manhattan");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-15610329019 — Astoria/Queens → NY/Queens", () => {
  const r = at(40.790139, -73.924629);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: mp-16143290429 — Hoboken/NJ → NJ", () => {
  const r = at(40.774815, -74.010428);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NJ");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16537169088 — Washington Heights area → NY", () => {
  const r = at(40.859548, -73.940194);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16575046256 — LIC → NY/Queens", () => {
  const r = at(40.754113, -73.958714);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: night-run-16615515418 — LIC → NY/Queens", () => {
  const r = at(40.742544, -73.959361);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: night-run-16634907980 — LIC → NY/Queens", () => {
  const r = at(40.74441, -73.959153);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: i-16651061254 — LIC → NY/Queens", () => {
  const r = at(40.753285, -73.950849);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16708000039 — LIC → NY/Queens", () => {
  const r = at(40.754894, -73.957652);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: evening-run-16726039930 — LIC → NY/Queens", () => {
  const r = at(40.755084, -73.959293);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16762158023 — LIC → NY/Queens", () => {
  const r = at(40.742312, -73.959622);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: long-16805717036 — Red Hook/Brooklyn → NY/Brooklyn", () => {
  const r = at(40.707114, -73.990748);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Brooklyn");
});

test("Formerly-Unknown runs — correct city identification: night-run-16825538567 — LIC → NY/Queens", () => {
  const r = at(40.744836, -73.95668);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16962283458 — LIC → NY/Queens", () => {
  const r = at(40.754038, -73.957408);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-16983523095 — LIC → NY/Queens", () => {
  const r = at(40.742322, -73.959692);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17038531172 — LIC → NY/Queens", () => {
  const r = at(40.744677, -73.957628);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17084758502 — LIC → NY/Queens", () => {
  const r = at(40.744045, -73.958152);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17143602718 — Astoria/Queens → NY/Queens", () => {
  const r = at(40.776544, -73.927297);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17197139902 — LIC → NY/Queens", () => {
  const r = at(40.741452, -73.959807);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17220802254 — LIC → NY/Queens", () => {
  const r = at(40.741942, -73.959521);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17275266944 — LIC → NY/Queens", () => {
  const r = at(40.74153, -73.959297);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17322270905 — LIC → NY/Queens", () => {
  const r = at(40.743667, -73.959132);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17344738804 — LIC/Hunters Point → NY/Queens", () => {
  const r = at(40.753991, -73.949948);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17356679662 — LIC → NY/Queens", () => {
  const r = at(40.74357, -73.959141);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: morning-run-17373716844 — LIC → NY/Queens", () => {
  const r = at(40.7419, -73.959805);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: t-17453848055 — LIC → NY/Queens", () => {
  const r = at(40.742759, -73.958958);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: evening-run-17534733796 — LIC → NY/Queens", () => {
  const r = at(40.744264, -73.95906);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: t-17534211801 — LIC → NY/Queens", () => {
  const r = at(40.741286, -73.958934);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: night-run-17872646670 — LIC → NY/Queens", () => {
  const r = at(40.741676, -73.960028);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: long-17894509408 — LIC/Queens → NY/Queens", () => {
  const r = at(40.760727, -73.948738);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-17966408470 — LIC → NY/Queens", () => {
  const r = at(40.744211, -73.956289);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-18204634143 — LIC → NY/Queens", () => {
  const r = at(40.741804, -73.959978);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: evening-run-18219590640 — LIC → NY/Queens", () => {
  const r = at(40.745664, -73.958726);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});

test("Formerly-Unknown runs — correct city identification: afternoon-run-18270486740 — LIC → NY/Queens", () => {
  const r = at(40.743242, -73.958966);
  assert.equal(r.countryCode, "US");
  assert.equal(r.region, "NY");
  assert.equal(r.city, "Queens");
});
