/**
 * geo-lookup.mjs — Build-time location detection using real polygon data.
 *
 * Uses world-atlas (countries-50m.json) + topojson-client to test a
 * lat/lon coordinate against actual country polygons, eliminating the
 * bbox-based misclassification bugs (e.g. Vancouver → USA, Seoul → Japan).
 *
 * For US points, additionally looks up the state using us-atlas.
 * For NYC points, keeps the lightweight borough bbox detection.
 *
 * Node.js ESM only — never imported by the client bundle.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// ISO 3166-1 numeric → { alpha2, name }
// Complete mapping for all 249 UN-recognised territories.

const NUMERIC_TO_ALPHA2 = {
  "004": { alpha2: "AF", name: "Afghanistan" },
  "008": { alpha2: "AL", name: "Albania" },
  "012": { alpha2: "DZ", name: "Algeria" },
  "016": { alpha2: "AS", name: "American Samoa" },
  "020": { alpha2: "AD", name: "Andorra" },
  "024": { alpha2: "AO", name: "Angola" },
  "660": { alpha2: "AI", name: "Anguilla" },
  "010": { alpha2: "AQ", name: "Antarctica" },
  "028": { alpha2: "AG", name: "Antigua and Barbuda" },
  "032": { alpha2: "AR", name: "Argentina" },
  "051": { alpha2: "AM", name: "Armenia" },
  "533": { alpha2: "AW", name: "Aruba" },
  "036": { alpha2: "AU", name: "Australia" },
  "040": { alpha2: "AT", name: "Austria" },
  "031": { alpha2: "AZ", name: "Azerbaijan" },
  "044": { alpha2: "BS", name: "Bahamas" },
  "048": { alpha2: "BH", name: "Bahrain" },
  "050": { alpha2: "BD", name: "Bangladesh" },
  "052": { alpha2: "BB", name: "Barbados" },
  "112": { alpha2: "BY", name: "Belarus" },
  "056": { alpha2: "BE", name: "Belgium" },
  "084": { alpha2: "BZ", name: "Belize" },
  "204": { alpha2: "BJ", name: "Benin" },
  "060": { alpha2: "BM", name: "Bermuda" },
  "064": { alpha2: "BT", name: "Bhutan" },
  "068": { alpha2: "BO", name: "Bolivia" },
  "070": { alpha2: "BA", name: "Bosnia and Herzegovina" },
  "072": { alpha2: "BW", name: "Botswana" },
  "076": { alpha2: "BR", name: "Brazil" },
  "086": { alpha2: "IO", name: "British Indian Ocean Territory" },
  "096": { alpha2: "BN", name: "Brunei" },
  "100": { alpha2: "BG", name: "Bulgaria" },
  "854": { alpha2: "BF", name: "Burkina Faso" },
  "108": { alpha2: "BI", name: "Burundi" },
  "132": { alpha2: "CV", name: "Cabo Verde" },
  "116": { alpha2: "KH", name: "Cambodia" },
  "120": { alpha2: "CM", name: "Cameroon" },
  "124": { alpha2: "CA", name: "Canada" },
  "136": { alpha2: "KY", name: "Cayman Islands" },
  "140": { alpha2: "CF", name: "Central African Republic" },
  "148": { alpha2: "TD", name: "Chad" },
  "152": { alpha2: "CL", name: "Chile" },
  "156": { alpha2: "CN", name: "China" },
  "162": { alpha2: "CX", name: "Christmas Island" },
  "166": { alpha2: "CC", name: "Cocos Islands" },
  "170": { alpha2: "CO", name: "Colombia" },
  "174": { alpha2: "KM", name: "Comoros" },
  "178": { alpha2: "CG", name: "Congo" },
  "180": { alpha2: "CD", name: "Congo, DR" },
  "184": { alpha2: "CK", name: "Cook Islands" },
  "188": { alpha2: "CR", name: "Costa Rica" },
  "191": { alpha2: "HR", name: "Croatia" },
  "192": { alpha2: "CU", name: "Cuba" },
  "531": { alpha2: "CW", name: "Curaçao" },
  "196": { alpha2: "CY", name: "Cyprus" },
  "203": { alpha2: "CZ", name: "Czech Republic" },
  "208": { alpha2: "DK", name: "Denmark" },
  "262": { alpha2: "DJ", name: "Djibouti" },
  "212": { alpha2: "DM", name: "Dominica" },
  "214": { alpha2: "DO", name: "Dominican Republic" },
  "218": { alpha2: "EC", name: "Ecuador" },
  "818": { alpha2: "EG", name: "Egypt" },
  "222": { alpha2: "SV", name: "El Salvador" },
  "226": { alpha2: "GQ", name: "Equatorial Guinea" },
  "232": { alpha2: "ER", name: "Eritrea" },
  "233": { alpha2: "EE", name: "Estonia" },
  "748": { alpha2: "SZ", name: "Eswatini" },
  "231": { alpha2: "ET", name: "Ethiopia" },
  "238": { alpha2: "FK", name: "Falkland Islands" },
  "234": { alpha2: "FO", name: "Faroe Islands" },
  "242": { alpha2: "FJ", name: "Fiji" },
  "246": { alpha2: "FI", name: "Finland" },
  "250": { alpha2: "FR", name: "France" },
  "254": { alpha2: "GF", name: "French Guiana" },
  "258": { alpha2: "PF", name: "French Polynesia" },
  "266": { alpha2: "GA", name: "Gabon" },
  "270": { alpha2: "GM", name: "Gambia" },
  "268": { alpha2: "GE", name: "Georgia" },
  "276": { alpha2: "DE", name: "Germany" },
  "288": { alpha2: "GH", name: "Ghana" },
  "292": { alpha2: "GI", name: "Gibraltar" },
  "300": { alpha2: "GR", name: "Greece" },
  "304": { alpha2: "GL", name: "Greenland" },
  "308": { alpha2: "GD", name: "Grenada" },
  "312": { alpha2: "GP", name: "Guadeloupe" },
  "316": { alpha2: "GU", name: "Guam" },
  "320": { alpha2: "GT", name: "Guatemala" },
  "831": { alpha2: "GG", name: "Guernsey" },
  "324": { alpha2: "GN", name: "Guinea" },
  "624": { alpha2: "GW", name: "Guinea-Bissau" },
  "328": { alpha2: "GY", name: "Guyana" },
  "332": { alpha2: "HT", name: "Haiti" },
  "340": { alpha2: "HN", name: "Honduras" },
  "344": { alpha2: "HK", name: "Hong Kong" },
  "348": { alpha2: "HU", name: "Hungary" },
  "352": { alpha2: "IS", name: "Iceland" },
  "356": { alpha2: "IN", name: "India" },
  "360": { alpha2: "ID", name: "Indonesia" },
  "364": { alpha2: "IR", name: "Iran" },
  "368": { alpha2: "IQ", name: "Iraq" },
  "372": { alpha2: "IE", name: "Ireland" },
  "833": { alpha2: "IM", name: "Isle of Man" },
  "376": { alpha2: "IL", name: "Israel" },
  "380": { alpha2: "IT", name: "Italy" },
  "388": { alpha2: "JM", name: "Jamaica" },
  "392": { alpha2: "JP", name: "Japan" },
  "832": { alpha2: "JE", name: "Jersey" },
  "400": { alpha2: "JO", name: "Jordan" },
  "398": { alpha2: "KZ", name: "Kazakhstan" },
  "404": { alpha2: "KE", name: "Kenya" },
  "296": { alpha2: "KI", name: "Kiribati" },
  "408": { alpha2: "KP", name: "North Korea" },
  "410": { alpha2: "KR", name: "South Korea" },
  "414": { alpha2: "KW", name: "Kuwait" },
  "417": { alpha2: "KG", name: "Kyrgyzstan" },
  "418": { alpha2: "LA", name: "Laos" },
  "428": { alpha2: "LV", name: "Latvia" },
  "422": { alpha2: "LB", name: "Lebanon" },
  "426": { alpha2: "LS", name: "Lesotho" },
  "430": { alpha2: "LR", name: "Liberia" },
  "434": { alpha2: "LY", name: "Libya" },
  "438": { alpha2: "LI", name: "Liechtenstein" },
  "440": { alpha2: "LT", name: "Lithuania" },
  "442": { alpha2: "LU", name: "Luxembourg" },
  "446": { alpha2: "MO", name: "Macao" },
  "450": { alpha2: "MG", name: "Madagascar" },
  "454": { alpha2: "MW", name: "Malawi" },
  "458": { alpha2: "MY", name: "Malaysia" },
  "462": { alpha2: "MV", name: "Maldives" },
  "466": { alpha2: "ML", name: "Mali" },
  "470": { alpha2: "MT", name: "Malta" },
  "584": { alpha2: "MH", name: "Marshall Islands" },
  "474": { alpha2: "MQ", name: "Martinique" },
  "478": { alpha2: "MR", name: "Mauritania" },
  "480": { alpha2: "MU", name: "Mauritius" },
  "175": { alpha2: "YT", name: "Mayotte" },
  "484": { alpha2: "MX", name: "Mexico" },
  "583": { alpha2: "FM", name: "Micronesia" },
  "498": { alpha2: "MD", name: "Moldova" },
  "492": { alpha2: "MC", name: "Monaco" },
  "496": { alpha2: "MN", name: "Mongolia" },
  "499": { alpha2: "ME", name: "Montenegro" },
  "504": { alpha2: "MA", name: "Morocco" },
  "508": { alpha2: "MZ", name: "Mozambique" },
  "516": { alpha2: "NA", name: "Namibia" },
  "520": { alpha2: "NR", name: "Nauru" },
  "524": { alpha2: "NP", name: "Nepal" },
  "528": { alpha2: "NL", name: "Netherlands" },
  "540": { alpha2: "NC", name: "New Caledonia" },
  "554": { alpha2: "NZ", name: "New Zealand" },
  "558": { alpha2: "NI", name: "Nicaragua" },
  "562": { alpha2: "NE", name: "Niger" },
  "566": { alpha2: "NG", name: "Nigeria" },
  "570": { alpha2: "NU", name: "Niue" },
  "807": { alpha2: "MK", name: "North Macedonia" },
  "578": { alpha2: "NO", name: "Norway" },
  "512": { alpha2: "OM", name: "Oman" },
  "586": { alpha2: "PK", name: "Pakistan" },
  "585": { alpha2: "PW", name: "Palau" },
  "275": { alpha2: "PS", name: "Palestine" },
  "591": { alpha2: "PA", name: "Panama" },
  "598": { alpha2: "PG", name: "Papua New Guinea" },
  "600": { alpha2: "PY", name: "Paraguay" },
  "604": { alpha2: "PE", name: "Peru" },
  "608": { alpha2: "PH", name: "Philippines" },
  "612": { alpha2: "PN", name: "Pitcairn" },
  "616": { alpha2: "PL", name: "Poland" },
  "620": { alpha2: "PT", name: "Portugal" },
  "630": { alpha2: "PR", name: "Puerto Rico" },
  "634": { alpha2: "QA", name: "Qatar" },
  "638": { alpha2: "RE", name: "Réunion" },
  "642": { alpha2: "RO", name: "Romania" },
  "643": { alpha2: "RU", name: "Russia" },
  "646": { alpha2: "RW", name: "Rwanda" },
  "659": { alpha2: "KN", name: "Saint Kitts and Nevis" },
  "662": { alpha2: "LC", name: "Saint Lucia" },
  "670": { alpha2: "VC", name: "Saint Vincent and the Grenadines" },
  "882": { alpha2: "WS", name: "Samoa" },
  "674": { alpha2: "SM", name: "San Marino" },
  "678": { alpha2: "ST", name: "São Tomé and Príncipe" },
  "682": { alpha2: "SA", name: "Saudi Arabia" },
  "686": { alpha2: "SN", name: "Senegal" },
  "688": { alpha2: "RS", name: "Serbia" },
  "690": { alpha2: "SC", name: "Seychelles" },
  "694": { alpha2: "SL", name: "Sierra Leone" },
  "702": { alpha2: "SG", name: "Singapore" },
  "703": { alpha2: "SK", name: "Slovakia" },
  "705": { alpha2: "SI", name: "Slovenia" },
  "090": { alpha2: "SB", name: "Solomon Islands" },
  "706": { alpha2: "SO", name: "Somalia" },
  "710": { alpha2: "ZA", name: "South Africa" },
  "728": { alpha2: "SS", name: "South Sudan" },
  "724": { alpha2: "ES", name: "Spain" },
  "144": { alpha2: "LK", name: "Sri Lanka" },
  "729": { alpha2: "SD", name: "Sudan" },
  "740": { alpha2: "SR", name: "Suriname" },
  "752": { alpha2: "SE", name: "Sweden" },
  "756": { alpha2: "CH", name: "Switzerland" },
  "760": { alpha2: "SY", name: "Syria" },
  "158": { alpha2: "TW", name: "Taiwan" },
  "762": { alpha2: "TJ", name: "Tajikistan" },
  "834": { alpha2: "TZ", name: "Tanzania" },
  "764": { alpha2: "TH", name: "Thailand" },
  "626": { alpha2: "TL", name: "Timor-Leste" },
  "768": { alpha2: "TG", name: "Togo" },
  "776": { alpha2: "TO", name: "Tonga" },
  "780": { alpha2: "TT", name: "Trinidad and Tobago" },
  "788": { alpha2: "TN", name: "Tunisia" },
  "792": { alpha2: "TR", name: "Turkey" },
  "795": { alpha2: "TM", name: "Turkmenistan" },
  "798": { alpha2: "TV", name: "Tuvalu" },
  "800": { alpha2: "UG", name: "Uganda" },
  "804": { alpha2: "UA", name: "Ukraine" },
  "784": { alpha2: "AE", name: "United Arab Emirates" },
  "826": { alpha2: "GB", name: "United Kingdom" },
  "840": { alpha2: "US", name: "United States" },
  "858": { alpha2: "UY", name: "Uruguay" },
  "860": { alpha2: "UZ", name: "Uzbekistan" },
  "548": { alpha2: "VU", name: "Vanuatu" },
  "862": { alpha2: "VE", name: "Venezuela" },
  "704": { alpha2: "VN", name: "Vietnam" },
  "876": { alpha2: "WF", name: "Wallis and Futuna" },
  "887": { alpha2: "YE", name: "Yemen" },
  "894": { alpha2: "ZM", name: "Zambia" },
  "716": { alpha2: "ZW", name: "Zimbabwe" },
  // Kosovo (used by some datasets)
  "383": { alpha2: "XK", name: "Kosovo" },
};

// ---------------------------------------------------------------------------
// US FIPS numeric → state alpha2 code

const FIPS_TO_STATE = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY", "72": "PR", "78": "VI", "66": "GU", "69": "MP",
  "60": "AS",
};

// ---------------------------------------------------------------------------
// NYC borough detection (bbox + East River boundary for Manhattan).
// These small city-level bboxes are accurate enough for borough classification.

const NYC_BOROUGHS = [
  // Staten Island — most isolated, check first
  { city: "Staten Island", minLat: 40.48, maxLat: 40.66, minLon: -74.27, maxLon: -74.05 },
  // Bronx — north of Manhattan, bounded south by ~40.796
  { city: "Bronx",         minLat: 40.796, maxLat: 40.92, minLon: -73.93, maxLon: -73.76 },
  // Brooklyn — south/southwest; use the Newtown Creek latitude to separate from Queens
  // Brooklyn is roughly west of ~-73.83 and south of 40.71
  { city: "Brooklyn",      minLat: 40.55, maxLat: 40.71, minLon: -74.05, maxLon: -73.83 },
  // Queens — north-east quadrant; check after Brooklyn
  { city: "Queens",        minLat: 40.54, maxLat: 40.80, minLon: -73.96, maxLon: -73.70 },
];

// Piecewise approximation of Manhattan's east shoreline (East River edge).
// lat → easternmost longitude still on Manhattan land.
const MANHATTAN_EAST_SHORE = [
  [40.700, -74.010],
  [40.702, -73.998],
  [40.707, -73.994],
  [40.712, -73.989],
  [40.719, -73.979],
  [40.727, -73.977],
  [40.737, -73.974],
  [40.750, -73.971],
  [40.759, -73.967],
  [40.769, -73.960],
  [40.775, -73.954],
  [40.783, -73.948],
  [40.793, -73.943],
  [40.803, -73.938],
  [40.814, -73.934],
  [40.826, -73.930],
  [40.841, -73.926],
  [40.857, -73.920],
  [40.869, -73.916],
  [40.878, -73.910],
];

function manhattanEastLon(lat) {
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

/**
 * Detect NYC borough for a point that has already been classified as US/NY.
 * Returns the borough name, or null if not in a recognized borough.
 */
function detectNycBorough(lat, lon) {
  // Manhattan check via east shore polyline.
  // Cap at 40.796 (southern Bronx border) so Bronx centroids don't fall into
  // the "east of Manhattan shore → Queens" fallback path.
  const MAN_LAT_MIN = 40.700, MAN_LAT_MAX = 40.796, MAN_LON_MIN = -74.025;
  if (lat >= MAN_LAT_MIN && lat <= MAN_LAT_MAX && lon >= MAN_LON_MIN) {
    const eastEdge = manhattanEastLon(lat);
    if (lon <= eastEdge) return "Manhattan";
    // East of Manhattan shore → East River; assign to nearest borough
    return lat > 40.726 ? "Queens" : "Brooklyn";
  }

  for (const b of NYC_BOROUGHS) {
    if (lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon) {
      return b.city;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Load geodata (lazy, cached)

let _countryFeatures = null;
let _stateFeatures = null;

function loadCountryFeatures() {
  if (_countryFeatures) return _countryFeatures;
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, "node_modules/world-atlas/countries-10m.json"), "utf8"),
  );
  _countryFeatures = feature(raw, raw.objects.countries).features;
  return _countryFeatures;
}

function loadStateFeatures() {
  if (_stateFeatures) return _stateFeatures;
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, "node_modules/us-atlas/states-10m.json"), "utf8"),
  );
  _stateFeatures = feature(raw, raw.objects.states).features;
  return _stateFeatures;
}

// ---------------------------------------------------------------------------
// Main export

/**
 * Detect the country (and optionally state/borough) for a lat/lon coordinate.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {{ countryCode: string, country: string, region?: string, city?: string }}
 */
export function detectLocation(lat, lon) {
  const pt = point([lon, lat]);

  // 1. Find the country
  const countries = loadCountryFeatures();
  let matched = null;
  for (const f of countries) {
    if (booleanPointInPolygon(pt, f)) {
      matched = f;
      break;
    }
  }

  if (!matched) {
    return { countryCode: "??", country: "Unknown" };
  }

  const numericId = String(matched.id).padStart(3, "0");
  const info = NUMERIC_TO_ALPHA2[numericId];
  if (!info) {
    // Fallback: use the name from the feature
    return { countryCode: "??", country: matched.properties?.name ?? "Unknown" };
  }

  const result = { countryCode: info.alpha2, country: info.name };

  // 2. For US points, find the state
  if (info.alpha2 === "US") {
    const states = loadStateFeatures();
    for (const sf of states) {
      if (booleanPointInPolygon(pt, sf)) {
        const fips = String(sf.id).padStart(2, "0");
        const stateCode = FIPS_TO_STATE[fips];
        if (stateCode) {
          result.region = stateCode;
          // 3. For NY state, additionally try to detect the NYC borough
          if (stateCode === "NY") {
            const borough = detectNycBorough(lat, lon);
            if (borough) result.city = borough;
          }
        }
        break;
      }
    }
  }

  return result;
}
