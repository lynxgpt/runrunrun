"use client";

// Tiny pub/sub store for the active geography filter. Clicking a country or
// state row sets the filter; the notable-runs list narrows accordingly.
// Click the same row again to clear.

import { useSyncExternalStore } from "react";

export type GeoFilter =
  | { kind: "none" }
  | { kind: "country"; code: string; name: string }
  | { kind: "state"; code: string; name: string }
  | { kind: "city"; code: string; name: string }
  | { kind: "month"; code: string; name: string };

const GEO_FILTER_NONE: GeoFilter = { kind: "none" };
let current: GeoFilter = GEO_FILTER_NONE;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setGeoFilter(next: GeoFilter) {
  current = next;
  notify();
}

export function toggleCountry(code: string, name: string) {
  if (current.kind === "country" && current.code === code) {
    setGeoFilter({ kind: "none" });
  } else {
    setGeoFilter({ kind: "country", code, name });
  }
}

export function toggleState(code: string, name: string) {
  if (current.kind === "state" && current.code === code) {
    setGeoFilter({ kind: "none" });
  } else {
    setGeoFilter({ kind: "state", code, name });
  }
}

export function toggleCity(code: string, name: string) {
  if (current.kind === "city" && current.code === code) {
    setGeoFilter({ kind: "none" });
  } else {
    setGeoFilter({ kind: "city", code, name });
  }
}

export function toggleMonth(code: string, name: string) {
  if (current.kind === "month" && current.code === code) {
    setGeoFilter({ kind: "none" });
  } else {
    setGeoFilter({ kind: "month", code, name });
  }
}

export function useGeoFilter(): GeoFilter {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => GEO_FILTER_NONE,
  );
}
