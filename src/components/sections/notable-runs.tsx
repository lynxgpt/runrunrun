"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudFog, CloudLightning } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/primitives/data-table";
import { notableRuns, streakStats } from "@/lib/mock-data";
import type { NotableRun, NotableRunCategory, WeatherCondition } from "@/types/activity";
import { formatDuration, formatKm, formatNumber, formatPace } from "@/lib/format";
import { GpxMap } from "@/components/charts/gpx-map";
import { GpxElevation } from "@/components/charts/gpx-elevation";
import { GpxPace } from "@/components/charts/gpx-pace";
import { GpxHeartRate } from "@/components/charts/gpx-heartrate";
import { CountryFlag } from "@/components/primitives/country-flag";
import { prefetchTrack, useGpxTrack } from "@/lib/use-gpx-track";
import { setGeoFilter, useGeoFilter } from "@/lib/geo-filter";

const TABS: { id: NotableRunCategory; label: string; caption: string }[] = [
  { id: "longest", label: "Longest Runs", caption: "runs ranked by distance" },
  { id: "personal-bests", label: "Personal Bests", caption: "fastest pace per race distance" },
  { id: "elevation", label: "Biggest Elevation Gain", caption: "most vert in a single run" },
];

const WEATHER_ICON: Record<WeatherCondition, React.ComponentType<{ className?: string; size?: number }>> = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  thunderstorm: CloudLightning,
};

// Pagination: render all rows in a scrollable list (cheap — just text),
// but only PREFETCH track payloads in pages of 10. First page preloads
// 20 so the map shows instantly when the user clicks any of the visible
// top-10. When they scroll past row 10, we preload the next 10, and so on.
const PAGE = 10;
const INITIAL_PRELOAD = 20;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const HALF_MARATHON_GPX_ID = "run-14165368226";

export function NotableRuns() {
  const visibleTabs = TABS.filter((t) => (notableRuns[t.id] ?? []).length > 0);
  const [category, setCategory] = useState<NotableRunCategory>(
    visibleTabs[0]?.id ?? "longest",
  );
  const filter = useGeoFilter();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filterKey =
    filter.kind === "none" ? "none" : `${filter.kind}:${filter.code}`;

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % visibleTabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + visibleTabs.length) % visibleTabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = visibleTabs.length - 1;
    setCategory(visibleTabs[next].id);
    tabRefs.current[next]?.focus();
  };

  if (!visibleTabs.length) {
    return (
      <section className="mb-16" aria-labelledby="notable-runs-heading">
        <h2
          id="notable-runs-heading"
          className="text-center font-sans text-xl font-medium uppercase tracking-wide text-neutral-100"
        >
          NOTABLE RUNS
        </h2>
        <p className="text-center text-sm font-mono-tamzen text-neutral-500 mt-4">
          No GPX files loaded. Drop .gpx files into public/gpx/ and run
          <code className="mx-1">node scripts/process-gpx.mjs</code>.
        </p>
      </section>
    );
  }

  const tab = visibleTabs.find((t) => t.id === category) ?? visibleTabs[0];
  const allRows = notableRuns[category] ?? [];
  const rows = applyFilter(allRows, filter);

  return (
    <section className="mb-16" aria-labelledby="notable-runs-heading">
      <h2
        id="notable-runs-heading"
        className="text-center font-sans text-xl font-medium uppercase tracking-wide text-neutral-100"
      >
        NOTABLE RUNS
      </h2>
      <div
        role="tablist"
        aria-label="Notable run categories"
        className="flex flex-wrap gap-2 mt-4 mb-4 justify-center"
      >
        {visibleTabs.map((t, i) => {
          const active = category === t.id;
          return (
            <button
              type="button"
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`tabpanel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setCategory(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                "px-3 py-1 text-sm font-mono-tamzen transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
                active
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p
        className="pointer-events-none text-center text-xs italic text-neutral-500 font-mono-tamzen mb-2 invisible"
        aria-hidden="true"
      >
        {tab.caption ?? "\u00A0"}
      </p>
      {filter.kind !== "none" ? (
        <p className="text-center text-xs font-mono-tamzen text-neutral-400 mb-4">
          filtered to {filter.kind}:{" "}
          <span className="text-neutral-100">{filter.name}</span>
          {" · "}
          <button
            className="underline cursor-pointer"
            onClick={() => setGeoFilter({ kind: "none" })}
          >
            clear
          </button>
        </p>
      ) : (
        <div className="mb-4" />
      )}
      {rows.length === 0 ? (
        <p className="text-center text-sm font-mono-tamzen text-neutral-500">
          No runs match filter &ldquo;{filter.kind !== "none" ? filter.name : ""}&rdquo;.
        </p>
      ) : (
        // Key forces remount on category/filter change, resetting pagination
        // + selection state inside the panel (avoids setState-in-effect).
        <Panel key={`${category}:${filterKey}`} rows={rows} category={category} />
      )}
    </section>
  );
}

function applyFilter(
  rows: NotableRun[],
  filter: ReturnType<typeof useGeoFilter>,
): NotableRun[] {
  if (filter.kind === "none") return rows;
  const matched = rows.filter((r) => {
    if (filter.kind === "country") return r.location.countryCode === filter.code;
    if (filter.kind === "state") return r.location.region === filter.code;
    if (filter.kind === "city") return r.location.city === filter.code;
    if (filter.kind === "month") return r.dateMonth === filter.code;
    return true;
  });
  return matched.map((r, i) => ({ ...r, rank: i + 1 }));
}

interface PanelProps {
  rows: NotableRun[];
  category: NotableRunCategory;
}

function Panel({ rows, category }: PanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [preloadCount, setPreloadCount] = useState(INITIAL_PRELOAD);
  const selected = rows[selectedIdx] ?? rows[0];

  // Preload the first N track payloads so clicking a row shows the map
  // without a fetch round-trip.
  useEffect(() => {
    for (const r of rows.slice(0, preloadCount)) {
      if (r.gpxId) prefetchTrack(r.gpxId);
    }
  }, [rows, preloadCount]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (nearBottom && preloadCount < rows.length) {
      setPreloadCount((n) => Math.min(rows.length, n + PAGE));
    }
  };

  return (
    <div
      id={`tabpanel-${category}`}
      role="tabpanel"
      aria-labelledby={`tab-${category}`}
      className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
    >
      <div className="lg:col-span-1 relative">
        {/* Gradient fade hint that list continues below */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-neutral-950 to-transparent z-10 md:hidden" />
      <div
        onScroll={onScroll}
        className="max-h-[40vh] md:max-h-[400px] overflow-y-auto overscroll-y-contain pr-1 scroll-thin"
      >
        <DataTable
          rows={rows}
          highlightedIndex={selectedIdx}
          onRowClick={(_, i) => setSelectedIdx(i)}
          columns={[
            {
              key: "rank",
              header: category === "personal-bests" ? "PB" : "RANK",
              cell: (r: NotableRun) =>
                category === "personal-bests" ? (r.displayRank ?? "") : `#${r.rank}`,
            },
            {
              key: "date",
              header: "DATE",
              cell: (r: NotableRun) => {
                const isHalfMarathon = category === "longest" && r.gpxId === HALF_MARATHON_GPX_ID;
                return (
                  <span className={cn(isHalfMarathon && "text-[#c9bd93]")}>
                    {r.date}
                    {isHalfMarathon ? (
                      <span className="ml-2 text-[10px] tracking-wide text-[#d0c69d]">HM</span>
                    ) : null}
                  </span>
                );
              },
            },
            {
              key: "distance",
              header: "DISTANCE",
              align: "right",
              cell: (r: NotableRun) => {
                const isHalfMarathon = category === "longest" && r.gpxId === HALF_MARATHON_GPX_ID;
                return (
                  <span className={cn(isHalfMarathon && "text-[#c9bd93]")}>
                    {formatKm(r.distanceKm, 2)}
                  </span>
                );
              },
            },
          ]}
        />
        {preloadCount < rows.length ? (
          <div className="text-center text-[10px] font-mono-tamzen text-neutral-600 py-2">
            scroll for more ({preloadCount}/{rows.length} loaded)
          </div>
        ) : null}
      </div>
      </div>
      <MapPanel run={selected} />
      <ChartsPanel run={selected} />
      <DetailsPanel run={selected} />
    </div>
  );
}

function MapPanel({ run }: { run: NotableRun }) {
  const track = useGpxTrack(run.gpxId);
  return (
    <div className="flex flex-col font-mono-tamzen text-xs text-neutral-400">
      <div className="flex justify-between mb-2">
        <span>DAY {daysSinceStart(run.date)}</span>
        <span>{run.date.toUpperCase()}</span>
      </div>
      <div className="relative aspect-square w-full bg-neutral-950 border border-neutral-900 overflow-hidden">
        {track ? (
          <GpxMap track={track} width={200} height={200} />
        ) : (
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
            <rect width="200" height="200" fill="#0d0d0d" />
            <text
              x="100"
              y="100"
              textAnchor="middle"
              className="fill-neutral-600 font-tamzen-sm"
              fontSize="10"
            >
              loading…
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}

// Three vertically-stacked charts (elevation / pace / HR) that collectively
// match the map height (aspect-square). Each chart gets exactly 1/3.
// All share the same x-axis scale (km from start) — x-axis labels appear
// only on the bottom (HR) chart so they don't repeat.
function ChartsPanel({ run }: { run: NotableRun }) {
  const track = useGpxTrack(run.gpxId);

  const LABELS: Record<string, string> = {
    elevation: "ELEVATION",
    pace:      "PACE",
    hr:        "HEART RATE",
  };

  const chartRow = (label: string, chart: React.ReactNode | null, isLast = false) => (
    <div className={`flex-1 min-h-0 flex flex-col${isLast ? "" : " border-b border-neutral-800"}`}>
      <div className="text-[8px] font-mono-tamzen text-neutral-600 px-1 pt-0.5 shrink-0">{label}</div>
      <div className="flex-1 min-h-0">
        {chart ?? (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-700 font-mono-tamzen">
            no data
          </div>
        )}
      </div>
    </div>
  );

  return (
    // aspect-square makes total height = column width = same as map square
    <div className="aspect-square flex flex-col bg-neutral-950 border border-neutral-900">
      {!track ? (
        <div className="flex-1 flex items-center justify-center text-[10px] font-mono-tamzen text-neutral-600">
          loading…
        </div>
      ) : (
        <>
          {chartRow(LABELS.elevation, <GpxElevation track={track} />)}
          {chartRow(LABELS.pace, <GpxPace track={track} />)}
          {chartRow(LABELS.hr,   <GpxHeartRate track={track} showXAxis />, true)}
        </>
      )}
    </div>
  );
}

// ISO 3166 alpha-2 → regional indicator emoji (AQ has no flag → snowflake).
function DetailsPanel({ run }: { run: NotableRun }) {
  const Icon = WEATHER_ICON[run.weather];
  return (
    <div className="flex flex-col items-start gap-4 font-mono-tamzen text-sm">
      <h3 className="font-sans text-lg font-bold text-neutral-100">
        {run.title ?? `${formatKm(run.distanceKm, 2)}`}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Stat label="KM" value={formatNumber(run.distanceKm, 2)} />
        <Stat label="MOVING" value={formatDuration(run.movingSec)} />
        <Stat label="PER KM" value={formatPace(run.paceSecPerKm)} />
        <Stat label="M CLIMBED" value={formatNumber(run.elevationM)} />
      </div>
      {run.weather ? (
        <div className="flex items-center gap-3">
          <Icon className="text-neutral-300" size={20} />
          <div>
            <div className="text-xs uppercase text-neutral-500">{run.weather}</div>
            {run.tempC != null ? (
              <div className="text-sm text-neutral-300">{Math.round(run.tempC)}°C</div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div>
        <div className="font-sans text-lg font-bold text-neutral-100 flex items-center gap-2">
          <CountryFlag code={run.location.countryCode} className="text-base leading-none shrink-0" />
          <span>{run.displayLocationPrimary ?? run.location.city ?? run.location.county ?? run.location.country}</span>
        </div>
        <div className="text-xs uppercase text-neutral-500">
          {run.displayLocationSecondary ?? `${run.location.region ? `${run.location.region} · ` : ""}${run.location.country.toUpperCase()}`}
        </div>
      </div>
      {run.photoPath ? (
        <a
          href={`${basePath}${run.photoPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans font-bold text-neutral-100 underline hover:text-neutral-300 text-sm"
        >
          PHOTO
        </a>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-sans font-bold text-neutral-100">{value}</div>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
    </div>
  );
}

function daysSinceStart(date: string): number {
  const start = new Date(streakStats.startDate + "T00:00:00Z").getTime();
  const t = new Date(date).getTime();
  return Math.floor((t - start) / 86_400_000);
}
