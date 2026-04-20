"use client";

// Lazy client-side loader for per-track GPX payloads. The TS bundle only
// ships summaries (see gpx-processed.ts); full point data lives in
// /public/tracks/<id>.json and is fetched on demand, then cached forever.
//
// Subscribers get notified via useSyncExternalStore — no setState-in-effect,
// which keeps Next.js 16's React Compiler lint happy.

import { useSyncExternalStore } from "react";
import type { GpxTrack } from "./gpx-processed";

type CacheEntry =
  | { status: "loading"; promise: Promise<void> }
  | { status: "ready"; track: GpxTrack }
  | { status: "error"; error: Error };

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function prefetchTrack(id: string): void {
  if (typeof window === "undefined") return;
  if (cache.has(id)) return;
  // NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow; empty locally.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const promise = fetch(`${basePath}/tracks/${id}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`track ${id}: HTTP ${res.status}`);
      return res.json();
    })
    .then((track: GpxTrack) => {
      cache.set(id, { status: "ready", track });
      notify();
    })
    .catch((error: Error) => {
      cache.set(id, { status: "error", error });
      notify();
    });
  cache.set(id, { status: "loading", promise });
  notify();
}

function getSnapshot(id: string): GpxTrack | undefined {
  const entry = cache.get(id);
  return entry && entry.status === "ready" ? entry.track : undefined;
}

export function useGpxTrack(id: string | undefined): GpxTrack | undefined {
  const track = useSyncExternalStore(
    subscribe,
    () => (id ? getSnapshot(id) : undefined),
    () => undefined,
  );
  // Kick off the fetch lazily from the render path — safe because
  // prefetchTrack is idempotent and only runs client-side.
  if (id && typeof window !== "undefined" && !cache.has(id)) {
    prefetchTrack(id);
  }
  return track;
}
