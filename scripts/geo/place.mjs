// Turn a cached address (Nominatim or offline) into a place, and a run's
// per-minute places into its label and its per-region split.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { feature } = require("topojson-client");
const isoCountries = require("i18n-iso-countries");
const worldAtlas = require("world-atlas/countries-10m.json");

// Country names: Natural Earth's, with the US shortened to match how the
// UK already reads ("United Kingdom").
const COUNTRY_NAME = new Map();
for (const f of feature(worldAtlas, worldAtlas.objects.countries).features) {
  const a2 = isoCountries.numericToAlpha2(String(f.id).padStart(3, "0"));
  if (a2) COUNTRY_NAME.set(a2, f.properties.name);
}
COUNTRY_NAME.set("US", "United States");

const NYC_BOROUGH_BY_COUNTY = {
  "New York County": "Manhattan",
  "Kings County": "Brooklyn",
  "Queens County": "Queens",
  "Bronx County": "Bronx",
  "Richmond County": "Staten Island",
};

// Nominatim's place fields often hold an administrative unit rather than the
// place itself. Strip the unit wording; drop units that are not a place.
function placeName(raw) {
  if (!raw) return null;
  if (/^Area [A-Z]\b/.test(raw) || / Township$/.test(raw)) return null; // BC electoral areas, US townships
  return raw
    .replace(/^(City|Town|Village) of /, "")
    .replace(/^Greater /, "")
    .replace(/ (kommun|Municipality)$/, "");
}

export function normalize(addr) {
  if (!addr?.country_code) return null;
  const countryCode = addr.country_code.toUpperCase();
  const iso = addr["ISO3166-2-lvl4"];
  const stateCode = iso?.startsWith(`${countryCode}-`) ? iso.slice(countryCode.length + 1) : null;
  const county =
    addr.county ?? (/ County$/.test(addr.city_district ?? "") ? addr.city_district : null);
  // A New York "Town of …" is a civil township; a village inside it is the place.
  const town = /^Town of /.test(addr.town ?? "") && addr.village ? addr.village : addr.town;
  let city =
    placeName(addr.city) ?? placeName(town) ?? placeName(addr.village) ??
    placeName(addr.hamlet) ?? placeName(addr.municipality) ?? null;
  // New York City reports as one city; the site labels its boroughs.
  const borough = countryCode === "US" && stateCode === "NY" ? NYC_BOROUGH_BY_COUNTY[county] : null;
  if (borough) city = borough;
  return {
    countryCode,
    country: COUNTRY_NAME.get(countryCode) ?? addr.country ?? countryCode,
    stateCode,
    state: addr.state ?? null,
    county,
    city,
  };
}

// Plurality vote; ties go to whichever value the run's start sample has.
function vote(values, startValue) {
  const counts = new Map();
  for (const v of values) if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null, bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN || (n === bestN && v === startValue)) { best = v; bestN = n; }
  }
  return best;
}

// places[0] is the start point; the rest are one per moving minute.
export function summarize(places) {
  const start = places[0] ?? null;
  const minutes = places.slice(1).filter(Boolean);
  const pool = minutes.length ? minutes : places.filter(Boolean);
  if (!pool.length) return { label: null, split: [] };

  const countryCode = vote(pool.map((p) => p.countryCode), start?.countryCode);
  const inCountry = pool.filter((p) => p.countryCode === countryCode);
  const stateKey = (p) => p.stateCode ?? p.state;
  const st = vote(inCountry.map(stateKey), start && stateKey(start));
  const inState = inCountry.filter((p) => stateKey(p) === st);
  const sample = inState[0] ?? inCountry[0];
  // County is voted among the winning city's samples, so the two agree.
  const city = vote(inState.map((p) => p.city), start?.city);
  const inCity = city ? inState.filter((p) => p.city === city) : inState;
  const label = {
    countryCode,
    country: sample.country,
    stateCode: inState[0]?.stateCode ?? null,
    state: inState[0]?.state ?? null,
    county: vote(inCity.map((p) => p.county), start?.county),
    city,
  };

  // Minutes per country / state / city, for region totals.
  const split = new Map();
  for (const p of minutes.length ? minutes : pool) {
    const key = [p.countryCode, p.stateCode ?? p.state ?? "", p.city ?? ""].join("|");
    const e = split.get(key) ?? {
      countryCode: p.countryCode,
      country: p.country,
      stateCode: p.stateCode,
      state: p.state,
      city: p.city,
      minutes: 0,
    };
    e.minutes += 1;
    split.set(key, e);
  }
  return {
    label,
    split: [...split.values()].sort((a, b) => b.minutes - a.minutes),
  };
}
