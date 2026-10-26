// Nominatim answers cached per ~100 m cell (coordinates rounded to 3
// decimals), committed so a run along a familiar route costs no requests
// and a re-label never re-asks for what is already known.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function cellKey(lat, lon) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function loadCache(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

export function saveCache(path, cache) {
  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  writeFileSync(path, JSON.stringify(sorted, null, 0).replace(/,"(?=-?\d)/g, ',\n"') + "\n");
}
