// Offline fallback for when Nominatim is unreachable: country / US state /
// US county from polygon containment (world-atlas, us-atlas), city from the
// nearest GeoNames place. Coarser than OSM — runs labelled this way are
// marked "fallback" and re-asked of Nominatim on the next pull.
//
// Returns the same address shape the Nominatim client caches, so one
// normalizer (place.mjs) handles both sources.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { feature } = require("topojson-client");
const isoCountries = require("i18n-iso-countries");
const worldAtlas = require("world-atlas/countries-10m.json");
const usStates = require("us-atlas/states-10m.json");
const usCounties = require("us-atlas/counties-10m.json");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const US_STATE_BY_FIPS = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

function withBounds(features) {
  return features.map((f) => {
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const poly of polygons)
      for (const [lon, lat] of poly[0]) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      }
    return { f, polygons, minLat, maxLat, minLon, maxLon };
  });
}

const COUNTRIES = withBounds(feature(worldAtlas, worldAtlas.objects.countries).features);
const STATES = withBounds(feature(usStates, usStates.objects.states).features);
const COUNTIES = withBounds(feature(usCounties, usCounties.objects.counties).features);

function pointInRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function find(list, lat, lon) {
  for (const e of list) {
    if (lat < e.minLat || lat > e.maxLat || lon < e.minLon || lon > e.maxLon) continue;
    for (const poly of e.polygons) {
      if (!pointInRing(poly[0], lon, lat)) continue;
      if (poly.slice(1).some((hole) => pointInRing(hole, lon, lat))) continue;
      return e.f;
    }
  }
  return null;
}

// Coastline and river polygons are coarse; a point on a waterfront path can
// fall just outside. Retry at ~1.5 km offsets before giving up.
function findNear(list, lat, lon) {
  const direct = find(list, lat, lon);
  if (direct) return direct;
  const D = 0.015;
  for (const [a, b] of [[D, 0], [-D, 0], [0, D], [0, -D]]) {
    const hit = find(list, lat + a, lon + b);
    if (hit) return hit;
  }
  return null;
}

let places = null;
const GRID = 0.5; // degrees per bucket
function loadPlaces() {
  if (places) return places;
  const text = gunzipSync(readFileSync(join(ROOT, "data", "geonames-cities1000.tsv.gz"))).toString("utf8");
  places = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [name, lat, lon, cc, admin1] = line.split("\t");
    const p = { name, lat: +lat, lon: +lon, cc, admin1 };
    const key = `${Math.floor(p.lat / GRID)},${Math.floor(p.lon / GRID)}`;
    if (!places.has(key)) places.set(key, []);
    places.get(key).push(p);
  }
  return places;
}

function nearestPlace(lat, lon, maxKm = 15) {
  const grid = loadPlaces();
  const gy = Math.floor(lat / GRID), gx = Math.floor(lon / GRID);
  const kmPerDegLon = 111.32 * Math.cos((lat * Math.PI) / 180);
  let best = null, bestD2 = (maxKm * maxKm);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      for (const p of grid.get(`${gy + dy},${gx + dx}`) ?? []) {
        const d2 = ((p.lat - lat) * 111.32) ** 2 + ((p.lon - lon) * kmPerDegLon) ** 2;
        if (d2 < bestD2) { bestD2 = d2; best = p; }
      }
  return best;
}

export function offlineAddress(lat, lon) {
  const country = findNear(COUNTRIES, lat, lon);
  const place = nearestPlace(lat, lon);
  const alpha2 = country ? isoCountries.numericToAlpha2(String(country.id).padStart(3, "0")) : place?.cc;
  if (!alpha2) return {};
  const out = { country_code: alpha2.toLowerCase() };
  if (alpha2 === "US") {
    const state = findNear(STATES, lat, lon);
    const code = state ? US_STATE_BY_FIPS[String(state.id).padStart(2, "0")] : null;
    if (code) out["ISO3166-2-lvl4"] = `US-${code}`;
    if (state) out.state = state.properties.name;
    const county = findNear(COUNTIES, lat, lon);
    if (county) out.county = `${county.properties.name} County`;
  } else if (place?.cc === alpha2 && place.admin1) {
    out.state = place.admin1;
  }
  if (place && place.cc === alpha2) out.city = place.name;
  return out;
}
