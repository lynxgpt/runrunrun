// Reverse geocoding via OpenStreetMap Nominatim, within its usage policy:
// identified User-Agent, at most one request per second, results cached.
// https://operations.osmfoundation.org/policies/nominatim/

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "runrunrun/1.0 (https://github.com/lynxgpt/runrunrun; 277584562+lynxgpt@users.noreply.github.com)";
const MIN_INTERVAL_MS = 1100;

// Address fields kept in the cache; everything else in the response is dropped.
const KEEP = [
  "country_code", "country", "ISO3166-2-lvl4", "state", "county", "city_district",
  "city", "town", "village", "hamlet", "municipality", "suburb", "borough",
];

// Start times are reserved one slot apart, so concurrent callers still stay
// at or under one request per second.
let nextSlot = 0;
function reserveSlot() {
  const slot = Math.max(Date.now(), nextSlot);
  nextSlot = slot + MIN_INTERVAL_MS;
  return slot - Date.now();
}

export class NominatimUnavailable extends Error {}

export async function reverse(lat, lon, { retries = 2 } = {}) {
  const url = `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=en`;
  for (let attempt = 0; ; attempt++) {
    const wait = reserveSlot();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    let res;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      if (attempt < retries) continue;
      throw new NominatimUnavailable(`network: ${e.message}`);
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 5_000 * (attempt + 1)));
        continue;
      }
      throw new NominatimUnavailable(`HTTP ${res.status}`);
    }
    if (!res.ok) throw new NominatimUnavailable(`HTTP ${res.status}`);
    const body = await res.json();
    // Open water far from any feature: Nominatim answers with an error body.
    if (body.error) return {};
    const out = {};
    for (const k of KEEP) if (body.address?.[k] != null) out[k] = body.address[k];
    return out;
  }
}
