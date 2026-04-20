// Derive analytics from whatever GPX tracks are in gpx-processed.ts.
// Add more .gpx files to public/gpx/, run `node scripts/process-gpx.mjs`,
// and the site picks them up automatically. Everything is metric, all
// durations use MOVING time (stops excluded).

import { gpxSummaries, type GpxSummary } from "./gpx-processed";
import rawMeta from "../../public/strava-meta.json";

interface StravaMeta {
  tempC?: number;
  photoPath?: string;
}
const stravaMeta = rawMeta as Record<string, StravaMeta>;
import type {
  AnnualMileage,
  GeoRow,
  HeatmapCell,
  HistogramBucket,
  NotableRun,
  NotableRunCategory,
  StreakStats,
  StreakYearHeatmap,
  WeatherCondition,
  ActivityLocation,
} from "@/types/activity";

// ---------------------------------------------------------------------------
// Track list, sorted by start time.

export const tracks: GpxSummary[] = Object.values(gpxSummaries)
  .filter((t) => t.stats.startTime)
  .sort(
    (a, b) =>
      new Date(a.stats.startTime!).getTime() - new Date(b.stats.startTime!).getTime(),
  );

function dateOf(t: GpxSummary): Date {
  return new Date(t.stats.startTime!);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function niceDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------------
// Coarse reverse-geocoding. Each track's bbox-center is tested against a
// list of known regions; unmatched falls back to "Unknown".

const US_STATE_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

interface Region {
  countryCode: string;
  country: string;
  region?: string;
  city?: string;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

const REGIONS: Region[] = [
  // NYC outer boroughs — listed before the Manhattan special-case logic
  // (handled in locationFor via polyline, not a bbox) so that runs with
  // centroids deep inside an outer borough are caught here first.
  // Manhattan is intentionally absent; see manhattanEastLon() below.
  { countryCode: "US", country: "United States", region: "NY", city: "Brooklyn",      bbox: { minLat: 40.55, maxLat: 40.74, minLon: -74.05, maxLon: -73.83 } },
  { countryCode: "US", country: "United States", region: "NY", city: "Queens",        bbox: { minLat: 40.54, maxLat: 40.80, minLon: -73.96, maxLon: -73.70 } },
  { countryCode: "US", country: "United States", region: "NY", city: "Bronx",         bbox: { minLat: 40.80, maxLat: 40.92, minLon: -73.93, maxLon: -73.76 } },
  { countryCode: "US", country: "United States", region: "NY", city: "Staten Island", bbox: { minLat: 40.48, maxLat: 40.65, minLon: -74.27, maxLon: -74.05 } },
  // NY-state fallback for upstate / Long Island runs outside the five boroughs.
  // US city-level (more-specific → less-specific within each state)
  { countryCode: "US", country: "United States", region: "CA", city: "San Diego",     bbox: { minLat: 32.60, maxLat: 33.15, minLon: -117.40, maxLon: -116.85 } },
  { countryCode: "US", country: "United States", region: "CA", city: "San Francisco", bbox: { minLat: 37.65, maxLat: 37.85, minLon: -122.55, maxLon: -122.35 } },
  { countryCode: "US", country: "United States", region: "CA", city: "Los Angeles",   bbox: { minLat: 33.70, maxLat: 34.35, minLon: -118.70, maxLon: -118.15 } },
  { countryCode: "US", country: "United States", region: "CO", city: "Denver",        bbox: { minLat: 39.60, maxLat: 39.90, minLon: -105.15, maxLon: -104.80 } },
  { countryCode: "US", country: "United States", region: "WA", city: "Seattle",       bbox: { minLat: 47.40, maxLat: 47.80, minLon: -122.50, maxLon: -122.20 } },
  { countryCode: "US", country: "United States", region: "MA", city: "Boston",        bbox: { minLat: 42.20, maxLat: 42.45, minLon: -71.20, maxLon: -70.95 } },
  // All 50 US state bboxes — catch any run not matched by a city above.
  // NJ before NY so Hoboken/Jersey City runs don't fall into the NY box.
  { countryCode: "US", country: "United States", region: "NJ", bbox: { minLat: 38.90, maxLat: 41.36, minLon: -75.60, maxLon: -73.89 } },
  { countryCode: "US", country: "United States", region: "NY", bbox: { minLat: 40.48, maxLat: 45.02, minLon: -79.76, maxLon: -71.86 } },
  { countryCode: "US", country: "United States", region: "CT", bbox: { minLat: 40.95, maxLat: 42.05, minLon: -73.73, maxLon: -71.79 } },
  { countryCode: "US", country: "United States", region: "RI", bbox: { minLat: 41.15, maxLat: 42.02, minLon: -71.90, maxLon: -71.10 } },
  { countryCode: "US", country: "United States", region: "MA", bbox: { minLat: 41.19, maxLat: 42.89, minLon: -73.53, maxLon: -69.93 } },
  { countryCode: "US", country: "United States", region: "VT", bbox: { minLat: 42.73, maxLat: 45.02, minLon: -73.44, maxLon: -71.50 } },
  { countryCode: "US", country: "United States", region: "NH", bbox: { minLat: 42.70, maxLat: 45.31, minLon: -72.56, maxLon: -70.70 } },
  { countryCode: "US", country: "United States", region: "ME", bbox: { minLat: 43.06, maxLat: 47.46, minLon: -71.08, maxLon: -67.00 } },
  { countryCode: "US", country: "United States", region: "PA", bbox: { minLat: 39.72, maxLat: 42.27, minLon: -80.52, maxLon: -74.69 } },
  { countryCode: "US", country: "United States", region: "DE", bbox: { minLat: 38.45, maxLat: 39.84, minLon: -75.79, maxLon: -74.98 } },
  { countryCode: "US", country: "United States", region: "MD", bbox: { minLat: 37.91, maxLat: 39.72, minLon: -79.49, maxLon: -74.99 } },
  { countryCode: "US", country: "United States", region: "VA", bbox: { minLat: 36.54, maxLat: 39.47, minLon: -83.68, maxLon: -75.17 } },
  { countryCode: "US", country: "United States", region: "WV", bbox: { minLat: 37.20, maxLat: 40.64, minLon: -82.65, maxLon: -77.72 } },
  { countryCode: "US", country: "United States", region: "NC", bbox: { minLat: 33.84, maxLat: 36.59, minLon: -84.32, maxLon: -75.46 } },
  { countryCode: "US", country: "United States", region: "SC", bbox: { minLat: 32.05, maxLat: 35.22, minLon: -83.35, maxLon: -78.55 } },
  { countryCode: "US", country: "United States", region: "GA", bbox: { minLat: 30.36, maxLat: 35.00, minLon: -85.61, maxLon: -80.84 } },
  { countryCode: "US", country: "United States", region: "FL", bbox: { minLat: 24.40, maxLat: 31.00, minLon: -87.63, maxLon: -79.97 } },
  { countryCode: "US", country: "United States", region: "OH", bbox: { minLat: 38.40, maxLat: 42.32, minLon: -84.83, maxLon: -80.52 } },
  { countryCode: "US", country: "United States", region: "IN", bbox: { minLat: 37.77, maxLat: 41.76, minLon: -88.10, maxLon: -84.79 } },
  { countryCode: "US", country: "United States", region: "MI", bbox: { minLat: 41.70, maxLat: 48.31, minLon: -90.42, maxLon: -82.41 } },
  { countryCode: "US", country: "United States", region: "IL", bbox: { minLat: 36.97, maxLat: 42.51, minLon: -91.51, maxLon: -87.02 } },
  { countryCode: "US", country: "United States", region: "WI", bbox: { minLat: 42.49, maxLat: 47.08, minLon: -92.89, maxLon: -86.25 } },
  { countryCode: "US", country: "United States", region: "MN", bbox: { minLat: 43.50, maxLat: 49.38, minLon: -97.24, maxLon: -89.49 } },
  { countryCode: "US", country: "United States", region: "IA", bbox: { minLat: 40.38, maxLat: 43.50, minLon: -96.64, maxLon: -90.14 } },
  { countryCode: "US", country: "United States", region: "MO", bbox: { minLat: 35.99, maxLat: 40.61, minLon: -95.77, maxLon: -89.10 } },
  { countryCode: "US", country: "United States", region: "KY", bbox: { minLat: 36.50, maxLat: 39.15, minLon: -89.57, maxLon: -81.96 } },
  { countryCode: "US", country: "United States", region: "TN", bbox: { minLat: 34.98, maxLat: 36.68, minLon: -90.31, maxLon: -81.65 } },
  { countryCode: "US", country: "United States", region: "AL", bbox: { minLat: 30.14, maxLat: 35.01, minLon: -88.47, maxLon: -84.89 } },
  { countryCode: "US", country: "United States", region: "MS", bbox: { minLat: 30.17, maxLat: 35.01, minLon: -91.65, maxLon: -88.10 } },
  { countryCode: "US", country: "United States", region: "AR", bbox: { minLat: 33.00, maxLat: 36.50, minLon: -94.62, maxLon: -89.64 } },
  { countryCode: "US", country: "United States", region: "LA", bbox: { minLat: 28.92, maxLat: 33.02, minLon: -94.04, maxLon: -88.82 } },
  { countryCode: "US", country: "United States", region: "TX", bbox: { minLat: 25.84, maxLat: 36.50, minLon: -106.65, maxLon: -93.51 } },
  { countryCode: "US", country: "United States", region: "OK", bbox: { minLat: 33.62, maxLat: 37.00, minLon: -103.00, maxLon: -94.43 } },
  { countryCode: "US", country: "United States", region: "KS", bbox: { minLat: 36.99, maxLat: 40.00, minLon: -102.05, maxLon: -94.59 } },
  { countryCode: "US", country: "United States", region: "NE", bbox: { minLat: 40.00, maxLat: 43.00, minLon: -104.05, maxLon: -95.31 } },
  { countryCode: "US", country: "United States", region: "SD", bbox: { minLat: 42.48, maxLat: 45.94, minLon: -104.06, maxLon: -96.44 } },
  { countryCode: "US", country: "United States", region: "ND", bbox: { minLat: 45.94, maxLat: 49.00, minLon: -104.05, maxLon: -96.56 } },
  { countryCode: "US", country: "United States", region: "MT", bbox: { minLat: 44.36, maxLat: 49.00, minLon: -116.05, maxLon: -104.04 } },
  { countryCode: "US", country: "United States", region: "WY", bbox: { minLat: 40.99, maxLat: 45.01, minLon: -111.05, maxLon: -104.05 } },
  { countryCode: "US", country: "United States", region: "CO", bbox: { minLat: 37.00, maxLat: 41.00, minLon: -109.06, maxLon: -102.04 } },
  { countryCode: "US", country: "United States", region: "NM", bbox: { minLat: 31.33, maxLat: 37.00, minLon: -109.05, maxLon: -103.00 } },
  { countryCode: "US", country: "United States", region: "AZ", bbox: { minLat: 31.33, maxLat: 37.00, minLon: -114.82, maxLon: -109.05 } },
  { countryCode: "US", country: "United States", region: "UT", bbox: { minLat: 37.00, maxLat: 42.00, minLon: -114.05, maxLon: -109.05 } },
  { countryCode: "US", country: "United States", region: "ID", bbox: { minLat: 41.99, maxLat: 49.00, minLon: -117.24, maxLon: -111.04 } },
  { countryCode: "US", country: "United States", region: "WA", bbox: { minLat: 45.54, maxLat: 49.00, minLon: -124.84, maxLon: -116.92 } },
  { countryCode: "US", country: "United States", region: "OR", bbox: { minLat: 41.99, maxLat: 46.24, minLon: -124.57, maxLon: -116.46 } },
  { countryCode: "US", country: "United States", region: "CA", bbox: { minLat: 32.53, maxLat: 42.01, minLon: -124.48, maxLon: -114.13 } },
  { countryCode: "US", country: "United States", region: "NV", bbox: { minLat: 35.00, maxLat: 42.00, minLon: -120.00, maxLon: -114.04 } },
  { countryCode: "US", country: "United States", region: "HI", bbox: { minLat: 18.91, maxLat: 22.24, minLon: -160.25, maxLon: -154.81 } },
  { countryCode: "US", country: "United States", region: "AK", bbox: { minLat: 54.50, maxLat: 71.55, minLon: -168.00, maxLon: -130.00 } },
  // Fallback country boxes
  // Mexico city-level (ordered more-specific → less-specific)
  { countryCode: "MX", country: "Mexico", region: "CDMX",     city: "Mexico City",  bbox: { minLat: 19.18, maxLat: 19.60, minLon: -99.35, maxLon: -98.95 } },
  { countryCode: "MX", country: "Mexico", region: "JAL",      city: "Guadalajara",  bbox: { minLat: 20.55, maxLat: 20.80, minLon: -103.55, maxLon: -103.20 } },
  { countryCode: "MX", country: "Mexico", region: "Q.R.",     city: "Cancún",       bbox: { minLat: 20.90, maxLat: 21.30, minLon: -87.15, maxLon: -86.70 } },
  { countryCode: "MX", country: "Mexico", region: "B.C.S.",   city: "Los Cabos",    bbox: { minLat: 22.80, maxLat: 23.20, minLon: -110.00, maxLon: -109.60 } },
  { countryCode: "MX", country: "Mexico", region: "OAX",      city: "Oaxaca",       bbox: { minLat: 17.00, maxLat: 17.20, minLon: -96.80, maxLon: -96.60 } },
  // Fallback country boxes
  { countryCode: "US", country: "United States", bbox: { minLat: 24.5, maxLat: 49.5, minLon: -125, maxLon: -66.5 } },
  { countryCode: "MX", country: "Mexico",        bbox: { minLat: 14.5, maxLat: 32.7, minLon: -118.5, maxLon: -86.7 } },
  { countryCode: "FR", country: "France",        bbox: { minLat: 42.3, maxLat: 51.1, minLon: -5.2, maxLon: 9.6 } },
  { countryCode: "GB", country: "United Kingdom", bbox: { minLat: 49.8, maxLat: 58.7, minLon: -8.2, maxLon: 1.8 } },
  { countryCode: "DE", country: "Germany",       bbox: { minLat: 47.2, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 } },
  { countryCode: "ES", country: "Spain",         bbox: { minLat: 35.9, maxLat: 43.8, minLon: -9.4, maxLon: 4.4 } },
  { countryCode: "IT", country: "Italy",         bbox: { minLat: 35.3, maxLat: 47.1, minLon: 6.6, maxLon: 18.6 } },
  { countryCode: "PT", country: "Portugal",      bbox: { minLat: 36.8, maxLat: 42.2, minLon: -9.6, maxLon: -6.1 } },
  { countryCode: "NL", country: "Netherlands",   bbox: { minLat: 50.7, maxLat: 53.7, minLon: 3.3, maxLon: 7.3 } },
  { countryCode: "CH", country: "Switzerland",   bbox: { minLat: 45.8, maxLat: 47.9, minLon: 5.9, maxLon: 10.6 } },
  { countryCode: "AT", country: "Austria",       bbox: { minLat: 46.3, maxLat: 49.1, minLon: 9.5, maxLon: 17.2 } },
  { countryCode: "IE", country: "Ireland",       bbox: { minLat: 51.3, maxLat: 55.5, minLon: -10.7, maxLon: -5.4 } },
  { countryCode: "NO", country: "Norway",        bbox: { minLat: 57.9, maxLat: 71.3, minLon: 4.4, maxLon: 31.1 } },
  { countryCode: "SE", country: "Sweden",        bbox: { minLat: 55.1, maxLat: 69.1, minLon: 10.9, maxLon: 24.2 } },
  { countryCode: "JP", country: "Japan",         bbox: { minLat: 24, maxLat: 46, minLon: 122, maxLon: 146 } },
  { countryCode: "KR", country: "South Korea",   bbox: { minLat: 33, maxLat: 38.7, minLon: 124.5, maxLon: 131.9 } },
  { countryCode: "TW", country: "Taiwan",        bbox: { minLat: 21.8, maxLat: 25.4, minLon: 120, maxLon: 122.1 } },
  { countryCode: "HK", country: "Hong Kong",     bbox: { minLat: 22.15, maxLat: 22.58, minLon: 113.83, maxLon: 114.42 } },
  { countryCode: "SG", country: "Singapore",     bbox: { minLat: 1.13, maxLat: 1.48, minLon: 103.6, maxLon: 104.1 } },
  { countryCode: "TH", country: "Thailand",      bbox: { minLat: 5.6, maxLat: 20.5, minLon: 97.3, maxLon: 105.7 } },
  { countryCode: "VN", country: "Vietnam",       bbox: { minLat: 8.4, maxLat: 23.4, minLon: 102.1, maxLon: 109.5 } },
  { countryCode: "ID", country: "Indonesia",     bbox: { minLat: -11, maxLat: 6, minLon: 95, maxLon: 141 } },
  { countryCode: "PH", country: "Philippines",   bbox: { minLat: 4.6, maxLat: 21.1, minLon: 116.9, maxLon: 126.6 } },
  { countryCode: "CN", country: "China",         bbox: { minLat: 18, maxLat: 53.6, minLon: 73.5, maxLon: 135.1 } },
  { countryCode: "IN", country: "India",         bbox: { minLat: 6.7, maxLat: 35.5, minLon: 68.1, maxLon: 97.4 } },
  { countryCode: "CA", country: "Canada",        bbox: { minLat: 41.5, maxLat: 84, minLon: -141, maxLon: -52 } },
  { countryCode: "AU", country: "Australia",     bbox: { minLat: -44, maxLat: -10, minLon: 113, maxLon: 154 } },
  { countryCode: "NZ", country: "New Zealand",   bbox: { minLat: -47.3, maxLat: -34.4, minLon: 166.4, maxLon: 178.6 } },
  { countryCode: "BR", country: "Brazil",        bbox: { minLat: -33.8, maxLat: 5.3, minLon: -73.9, maxLon: -34.7 } },
  { countryCode: "AR", country: "Argentina",     bbox: { minLat: -55, maxLat: -21.8, minLon: -73.5, maxLon: -53.6 } },
  { countryCode: "CL", country: "Chile",         bbox: { minLat: -55.9, maxLat: -17.5, minLon: -75.7, maxLon: -66.4 } },
  { countryCode: "PE", country: "Peru",          bbox: { minLat: -18.4, maxLat: -0.04, minLon: -81.3, maxLon: -68.7 } },
  { countryCode: "ZA", country: "South Africa",  bbox: { minLat: -35, maxLat: -22.1, minLon: 16.5, maxLon: 32.9 } },
];

// Piecewise approximation of Manhattan's EAST shoreline (East River edge).
// Each entry is [latitude, easternmost_land_longitude] going south→north.
// A centroid west of this line is on Manhattan land; east of it is in the
// East River (and should be assigned to Queens or Brooklyn, not Manhattan).
// Source: traced against OpenStreetMap coastline data.
const MANHATTAN_EAST_SHORE: [number, number][] = [
  [40.700, -74.010], // South tip / Battery Park
  [40.702, -73.998], // Staten Island Ferry terminal
  [40.707, -73.994], // Whitehall / Stone St
  [40.712, -73.989], // Brooklyn Bridge Manhattan anchorage
  [40.719, -73.979], // Manhattan Bridge approach
  [40.727, -73.977], // Williamsburg Bridge approach
  [40.737, -73.974], // Lower East Side / Delancey
  [40.750, -73.971], // East Village / 14th St
  [40.759, -73.967], // Stuyvesant Cove / 23rd St
  [40.769, -73.960], // Queens-Midtown Tunnel portal / 34th St
  [40.775, -73.954], // UN Plaza / 42nd St
  [40.783, -73.948], // Sutton Place / 53rd St
  [40.793, -73.943], // Lenox Hill / 72nd St
  [40.803, -73.938], // Carl Schurz Park / 86th St
  [40.814, -73.934], // East Harlem / 96th St
  [40.826, -73.930], // East Harlem / 110th St
  [40.841, -73.926], // RFK Bridge approach / 125th St
  [40.857, -73.920], // 145th St
  [40.869, -73.916], // 175th St
  [40.878, -73.910], // Inwood / north tip
];

// Returns the easternmost longitude that is still Manhattan land at a given
// latitude. Points east of this value are in the East River.
function manhattanEastLon(lat: number): number {
  const s = MANHATTAN_EAST_SHORE;
  if (lat <= s[0][0]) return s[0][1];
  if (lat >= s[s.length - 1][0]) return s[s.length - 1][1];
  for (let i = 0; i < s.length - 1; i++) {
    const [lat0, lon0] = s[i];
    const [lat1, lon1] = s[i + 1];
    if (lat >= lat0 && lat <= lat1) {
      const t = (lat - lat0) / (lat1 - lat0);
      return lon0 + t * (lon1 - lon0);
    }
  }
  return s[0][1];
}

function locationFor(t: GpxSummary): ActivityLocation {
  // Classify by track centroid (bbox midpoint). This is the correct signal
  // for "which borough does this run belong to" — a run that spends most of
  // its distance in Queens will have its centroid in Queens even if it briefly
  // crosses a bridge into Manhattan.
  const { minLat, maxLat, minLon, maxLon } = t.stats.bbox;
  const lat = (minLat + maxLat) / 2;
  const lon = (minLon + maxLon) / 2;

  // --- Manhattan / East River special case ---
  // Manhattan is not in REGIONS because a simple bbox would swallow the East
  // River and misclassify LIC / Greenpoint / DUMBO runs. Instead we check the
  // actual land boundary with a piecewise shoreline polyline.
  const MAN_LAT_MIN = 40.700, MAN_LAT_MAX = 40.880;
  const MAN_LON_MIN = -74.025; // Hudson River / NJ boundary (generous)
  if (lat >= MAN_LAT_MIN && lat <= MAN_LAT_MAX && lon >= MAN_LON_MIN) {
    const eastEdge = manhattanEastLon(lat);
    if (lon <= eastEdge) {
      // On Manhattan island land
      return { country: "United States", countryCode: "US", region: "NY", city: "Manhattan", lat, lon };
    }
    // East of the shore → East River water. Assign to the borough whose
    // waterfront faces this point. The Queens/Brooklyn border meets the East
    // River at Newtown Creek (~40.726 N). North = Queens, south = Brooklyn.
    const city = lat > 40.726 ? "Queens" : "Brooklyn";
    return { country: "United States", countryCode: "US", region: "NY", city, lat, lon };
  }

  for (const r of REGIONS) {
    if (
      lat >= r.bbox.minLat && lat <= r.bbox.maxLat &&
      lon >= r.bbox.minLon && lon <= r.bbox.maxLon
    ) {
      return {
        country: r.country,
        countryCode: r.countryCode,
        region: r.region,
        city: r.city,
        lat,
        lon,
      };
    }
  }
  return { country: "Unknown", countryCode: "??", lat, lon };
}

// ---------------------------------------------------------------------------
// Streak stats

function diffYMD(start: Date, end: Date): { years: number; months: number; days: number } {
  let y = end.getUTCFullYear() - start.getUTCFullYear();
  let m = end.getUTCMonth() - start.getUTCMonth();
  let d = end.getUTCDate() - start.getUTCDate();
  if (d < 0) {
    m -= 1;
    const prev = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    d += prev.getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { years: y, months: m, days: d };
}

const first = tracks[0] ? dateOf(tracks[0]) : new Date();
const last = tracks[tracks.length - 1] ? dateOf(tracks[tracks.length - 1]) : new Date();
const uniqueDates = new Set(tracks.map((t) => isoDate(dateOf(t))));

const totalKm = tracks.reduce((s, t) => s + t.stats.distanceKm, 0);
const totalMovingSec = tracks.reduce((s, t) => s + t.stats.movingSec, 0);
const totalElevationM = tracks.reduce((s, t) => s + t.stats.elevationM, 0);

export const streakStats: StreakStats = {
  startDate: isoDate(first),
  endDate: isoDate(last),
  totalDays: uniqueDates.size,
  totalKm: Math.round(totalKm),
  totalHours: Math.round(totalMovingSec / 3600),
  totalElevationM,
  ...diffYMD(first, last),
};

// ---------------------------------------------------------------------------
// Notable Runs

function toNotableRun(t: GpxSummary, rank: number, weather: WeatherCondition): NotableRun {
  const d = dateOf(t);
  const meta = stravaMeta[t.id] ?? {};
  return {
    rank,
    date: niceDate(d),
    distanceKm: +t.stats.distanceKm.toFixed(2),
    movingSec: t.stats.movingSec,
    paceSecPerKm: t.stats.paceSecPerKm ?? 0,
    elevationM: t.stats.elevationM,
    ...(meta.tempC != null ? { tempC: meta.tempC } : {}),
    weather,
    title: t.name,
    location: locationFor(t),
    gpxId: t.id,
    gpxPath: `/gpx/${t.id}.gpx`,
    ...(meta.photoPath != null ? { photoPath: meta.photoPath } : {}),
  };
}

function rankBy<T>(arr: T[], by: (x: T) => number): T[] {
  return arr.slice().sort((a, b) => by(b) - by(a));
}

// Full ranked lists — the UI shows the top ~10 in a fixed-height
// viewport and lets the user scroll to see the rest.
const byDistance = rankBy(tracks, (t) => t.stats.distanceKm).map((t, i) =>
  toNotableRun(t, i + 1, "clear"),
);

const byElevation = rankBy(tracks, (t) => t.stats.elevationM).map((t, i) =>
  toNotableRun(t, i + 1, "clear"),
);

// Personal bests: for each distance bucket, pick the fastest run that
// reached at least that distance.
const PB_BUCKETS: { label: string; minKm: number; tag: string }[] = [
  { label: "5K",          minKm: 5,    tag: "5K PB" },
  { label: "10K",         minKm: 10,   tag: "10K PB" },
  { label: "Half Marathon", minKm: 21.0975, tag: "Half PB" },
  { label: "Marathon",    minKm: 42.195, tag: "Marathon PB" },
];

// GPS drift detection: a run is considered drifted/corrupt when the raw
// bbox diagonal is implausibly large relative to the recorded distance.
// A 10 km loop that drifts to a 50 km bbox diagonal is almost certainly
// a GPS glitch. Threshold: bbox diagonal must be ≤ 3× the run distance.
// Also require at least 60s moving time per km (pace ≤ 17 min/km) to
// exclude "ghost" tracks where the device recorded zero motion.
function hasBadGps(t: GpxSummary): boolean {
  const { bbox, distanceKm, paceSecPerKm } = t.stats;
  if (!distanceKm) return true;
  // Diagonal of the bbox in degrees × 111 km/deg ≈ km (rough, equirectangular)
  const dLat = bbox.maxLat - bbox.minLat;
  const dLon = bbox.maxLon - bbox.minLon;
  const bboxDiagKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
  if (bboxDiagKm > distanceKm * 3) return true;
  // Impossibly fast pace (< 2 min/km = 120 sec/km) → likely GPS jump
  if (paceSecPerKm != null && paceSecPerKm < 120) return true;
  return false;
}

const personalBests: NotableRun[] = PB_BUCKETS.flatMap((b, i) => {
  const eligible = tracks.filter(
    (t) =>
      t.stats.distanceKm >= b.minKm &&
      t.stats.paceSecPerKm != null &&
      !hasBadGps(t),
  );
  if (!eligible.length) return [];
  const fastest = eligible.reduce((a, c) =>
    (c.stats.paceSecPerKm ?? Infinity) < (a.stats.paceSecPerKm ?? Infinity) ? c : a,
  );
  return [{ ...toNotableRun(fastest, i + 1, "clear"), title: `${b.tag} · ${fastest.name}` }];
});

export const notableRuns: Record<NotableRunCategory, NotableRun[]> = {
  longest: byDistance,
  "personal-bests": personalBests,
  elevation: byElevation,
  races: [],
  "bus-run-bus": [],
  "weekly-half": [],
};

// ---------------------------------------------------------------------------
// Statistics charts

function streakYearOf(d: Date, streakStart: Date): number {
  let years = d.getUTCFullYear() - streakStart.getUTCFullYear();
  const dCopy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const anniv = new Date(Date.UTC(d.getUTCFullYear(), streakStart.getUTCMonth(), streakStart.getUTCDate()));
  if (dCopy < anniv) years -= 1;
  return years + 1;
}

// Annual km by streak year
const annualMap = new Map<number, number>();
for (const t of tracks) {
  const y = streakYearOf(dateOf(t), first);
  annualMap.set(y, (annualMap.get(y) ?? 0) + t.stats.distanceKm);
}
const annualYearNumbers = [...annualMap.keys()].sort((a, b) => a - b);
export const annualMileage: AnnualMileage[] = annualYearNumbers.length
  ? annualYearNumbers.map((y) => ({ year: y, km: Math.round(annualMap.get(y) ?? 0) }))
  : [{ year: 1, km: 0 }];

// Hour-of-day percentages (24 bins). Use LOCAL time so the distribution
// reflects when the user actually runs ("morning", "evening"), not UTC.
const hourCounts = new Array<number>(24).fill(0);
for (const t of tracks) hourCounts[dateOf(t).getHours()] += 1;
const hourTotal = hourCounts.reduce((a, b) => a + b, 0) || 1;
export const workoutByTime: number[] = hourCounts.map((c) => +((c / hourTotal) * 100).toFixed(1));

// Avg km per run by day of week (Monday-first)
const weekdaySum = new Array<number>(7).fill(0);
const weekdayN = new Array<number>(7).fill(0);
for (const t of tracks) {
  const dow = (dateOf(t).getUTCDay() + 6) % 7;
  weekdaySum[dow] += t.stats.distanceKm;
  weekdayN[dow] += 1;
}
export const avgByWeekday: number[] = weekdaySum.map((s, i) =>
  weekdayN[i] ? +(s / weekdayN[i]).toFixed(1) : 0,
);

// Distance histogram, metric buckets
const DIST_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "1km",     min: 0,   max: 2 },
  { label: "2-3km",   min: 2,   max: 4 },
  { label: "4-5km",   min: 4,   max: 6 },
  { label: "6-8km",   min: 6,   max: 9 },
  { label: "9-11km",  min: 9,   max: 12 },
  { label: "12-15km", min: 12,  max: 16 },
  { label: "16-20km", min: 16,  max: 21 },
  { label: "HM",      min: 21,  max: 30 },
  { label: "30-42km", min: 30,  max: 42.2 },
  { label: "M+",      min: 42.2, max: Infinity },
];
export const runDistances: HistogramBucket[] = DIST_BUCKETS.map((b) => ({
  label: b.label,
  count: tracks.filter((t) => t.stats.distanceKm >= b.min && t.stats.distanceKm < b.max).length,
}));

export const treadmillVsOutdoor = { treadmill: 0, outdoor: tracks.length };

// Pace distribution — 60 bins across 3:00 → 8:00/km (running-friendly range)
const paceVals = tracks.map((t) => t.stats.paceSecPerKm).filter((v): v is number => v != null);
const PACE_MIN = 3 * 60;
const PACE_MAX = 8 * 60;
const PACE_BINS = 60;
const paceBins = new Array<number>(PACE_BINS).fill(0);
for (const p of paceVals) {
  const t = (p - PACE_MIN) / (PACE_MAX - PACE_MIN);
  const idx = Math.min(PACE_BINS - 1, Math.max(0, Math.floor(t * PACE_BINS)));
  for (let i = 0; i < PACE_BINS; i++) {
    const x = (i - idx) / 4;
    paceBins[i] += Math.exp(-x * x);
  }
}
const meanSec = paceVals.length
  ? Math.round(paceVals.reduce((a, b) => a + b, 0) / paceVals.length)
  : 0;
const medianSec = paceVals.length
  ? paceVals.slice().sort((a, b) => a - b)[Math.floor(paceVals.length / 2)]
  : 0;
export const paceDistribution = {
  meanSec,
  medianSec,
  bins: paceBins.map((v) => +(v * 100).toFixed(0)),
  axisLabels: ["3:00/km", "4:00/km", "5:00/km", "6:00/km", "7:00/km", "8:00/km"],
};

const HR_ZONES: { label: string; bpm: string; max: number }[] = [
  { label: "Easy",      bpm: "<139bpm",    max: 139 },
  { label: "Tempo",     bpm: "140-159bpm", max: 159 },
  { label: "Threshold", bpm: "160-166bpm", max: 166 },
  { label: "VO2 Max",   bpm: ">167bpm",    max: 999 },
];
export const heartRateZones = HR_ZONES.map((z, i) => {
  const prevMax = i === 0 ? 0 : HR_ZONES[i - 1].max;
  const count = tracks.filter((t) => {
    const hr = t.stats.avgHr ?? 0;
    return hr > prevMax && hr <= z.max;
  }).length;
  return { label: z.label, bpm: z.bpm, count };
});

// Temperature/weather placeholders. Real values need an external API.
export const temperatureBuckets: HistogramBucket[] = [
  { label: "Freezing",   count: 0 },
  { label: "Very Cold",  count: 0 },
  { label: "Cold",       count: 0 },
  { label: "Cool",       count: 0 },
  { label: "Mild",       count: tracks.length },
  { label: "Warm",       count: 0 },
  { label: "Hot",        count: 0 },
  { label: "Very Hot",   count: 0 },
];
export const temperatureRanges: string[] = [
  "< -10°C", "-10 to -1°C", "0 to 4°C", "5 to 9°C",
  "10 to 19°C", "20 to 24°C", "25 to 29°C", "≥ 30°C",
];
export const weatherConditions: { label: string; icon: string; count: number }[] = [
  { label: "Clear",  icon: "sun",             count: tracks.length },
  { label: "Clouds", icon: "cloud",           count: 0 },
  { label: "Rain",   icon: "cloud-rain",      count: 0 },
  { label: "Snow",   icon: "snowflake",       count: 0 },
  { label: "Fog",    icon: "cloud-fog",       count: 0 },
  { label: "Storm",  icon: "cloud-lightning", count: 0 },
];

export const equipment: { model: string; km: number }[] = [];

// ---------------------------------------------------------------------------
// Geography

export const countriesVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string>; code: string }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    const entry = map.get(loc.country) ?? { km: 0, days: new Set(), code: loc.countryCode };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.country, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, code: v.code, days: v.days.size, km: +v.km.toFixed(1) }))
    .sort((a, b) => b.km - a.km);
})();

export const usStatesVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string> }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    if (loc.countryCode !== "US" || !loc.region) continue;
    const entry = map.get(loc.region) ?? { km: 0, days: new Set() };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.region, entry);
  }
  return [...map.entries()]
    .map(([code, v]) => ({
      name: US_STATE_NAME[code] ?? code,
      code,
      days: v.days.size,
      km: +v.km.toFixed(1),
    }))
    // Sort by km desc, but always pin NJ last.
    .sort((a, b) => {
      if (a.code === "NJ") return 1;
      if (b.code === "NJ") return -1;
      return b.km - a.km;
    });
})();

// NYC boroughs — aggregated by city when a run lands in NY state. Lets us
// show a third drill-down table (country → state → borough) whenever the
// user has NYC activity.
export const nycBoroughsVisited: GeoRow[] = (() => {
  const map = new Map<string, { km: number; days: Set<string> }>();
  for (const t of tracks) {
    const loc = locationFor(t);
    if (loc.countryCode !== "US" || loc.region !== "NY" || !loc.city) continue;
    const entry = map.get(loc.city) ?? { km: 0, days: new Set() };
    entry.km += t.stats.distanceKm;
    entry.days.add(isoDate(dateOf(t)));
    map.set(loc.city, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      code: name, // use the borough name as the filter code
      days: v.days.size,
      km: +v.km.toFixed(1),
    }))
    .sort((a, b) => b.km - a.km);
})();

// ---------------------------------------------------------------------------
// Daily-log heatmaps — one entry per streak year.

export const streakYears: StreakYearHeatmap[] = (() => {
  if (!tracks.length) return [];
  const out: StreakYearHeatmap[] = [];
  const startY = first.getUTCFullYear();
  const startM = first.getUTCMonth();
  const startD = first.getUTCDate();
  const maxYear = streakYearOf(last, first);

  const kmByDate = new Map<string, number>();
  for (const t of tracks) {
    const iso = isoDate(dateOf(t));
    kmByDate.set(iso, (kmByDate.get(iso) ?? 0) + t.stats.distanceKm);
  }

  for (let y = 1; y <= maxYear; y++) {
    const ystart = new Date(Date.UTC(startY + y - 1, startM, startD));
    const cells: HeatmapCell[] = [];
    let total = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(ystart);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = isoDate(d);
      const km = +(kmByDate.get(iso) ?? 0);
      total += km;
      cells.push({ date: iso, km: +km.toFixed(2) });
    }
    const yend = new Date(ystart);
    yend.setUTCFullYear(yend.getUTCFullYear() + 1);
    const inProgress = last < yend;
    const elapsed = inProgress
      ? Math.max(1, Math.round((last.getTime() - ystart.getTime()) / 86_400_000))
      : 365;
    out.push({
      yearNumber: y,
      label: `${ystart.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })} - ${yend.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`,
      totalKm: +total.toFixed(1),
      avgPerDay: +(total / elapsed).toFixed(2),
      inProgress,
      cells,
    });
  }
  return out.reverse();
})();
