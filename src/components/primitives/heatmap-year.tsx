"use client";

import type { StreakYearHeatmap } from "@/types/activity";
import { formatNumber } from "@/lib/format";
import { toggleDay, useGeoFilter } from "@/lib/geo-filter";

const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Compute the x position (in SVG units) where each calendar month label should
// appear.  The old approach spaced them evenly across 53 columns which
// accumulated ~1 month of drift by mid-year because real months aren't equal.
// Instead we find the actual column that contains the 1st of each month.
const LABEL_W = 20;
const CELL_SIZE = 13;
const CELL_GAP = 2;
const WEEKS = 53;

function monthAxisPositions(startIso: string): Array<{ label: string; x: number }> {
  const start = new Date(startIso + "T00:00:00Z");
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();

  const out: Array<{ label: string; x: number }> = [];
  for (let i = 0; i < 12; i++) {
    const month = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);

    // Day index within this streak year (0-based).
    // For the first label use day 0 (the actual start date) so it anchors
    // correctly even when the streak began mid-month.
    let dayIndex: number;
    if (i === 0) {
      dayIndex = 0;
    } else {
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      dayIndex = Math.round((firstOfMonth.getTime() - start.getTime()) / 86_400_000);
    }
    if (dayIndex >= 365) break;

    // Replicate the cell-placement formula from the render loop.
    const d = new Date(Date.UTC(year, month, i === 0 ? start.getUTCDate() : 1));
    const dow = (d.getUTCDay() + 6) % 7; // 0=Mon … 6=Sun
    const week = Math.floor((dayIndex + (7 - dow)) / 7) % WEEKS;
    const x = LABEL_W + week * (CELL_SIZE + CELL_GAP) + Math.floor(CELL_SIZE / 2);

    out.push({ label: MONTH_NAMES[month], x });
  }
  return out;
}

// Map km -> greyscale fill. Empty -> neutral-900.
function cellFill(km: number, max: number) {
  if (!km) return "var(--heatmap-empty)";
  const t = Math.min(1, km / max);
  return `color-mix(in srgb, var(--heatmap-cell-max) ${Math.round(t * 100)}%, var(--heatmap-cell-min))`;
}

export function HeatmapYear({ data }: { data: StreakYearHeatmap }) {
  const filter = useGeoFilter();
  const cellSize = CELL_SIZE;
  const gap = CELL_GAP;
  const labelW = LABEL_W;
  const weeks = WEEKS;
  const rows = 7;
  const width = labelW + weeks * (cellSize + gap);
  const height = rows * (cellSize + gap) + 20;

  // Max km for intensity scaling — cap at 95th pct to avoid any outlier washing colors
  const sortedKm = data.cells.map((c) => c.km).slice().sort((a, b) => a - b);
  const max = sortedKm[Math.floor(sortedKm.length * 0.95)] || 1;

  // Place cells into a grid: Monday-first weeks
  const cells = data.cells.map((c, i) => {
    const d = new Date(c.date + "T00:00:00Z");
    const dow = (d.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
    const week = Math.floor((i + (7 - dow)) / 7) % weeks;
    return { ...c, dow, week };
  });

  const jumpToNotableRuns = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("notable-runs-heading")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const onPickDay = (date: string) => {
    toggleDay(date, formatDayLabel(date));
    jumpToNotableRuns();
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-baseline justify-between gap-4 mb-2 font-mono-tamzen text-sm">
        <div>
          <span className="text-neutral-100 font-bold">Streak Year {data.yearNumber}</span>
          <span className="ml-2 text-neutral-500">({data.label})</span>
        </div>
        <div className="text-neutral-400">
          {formatNumber(data.totalKm)} km
          {data.inProgress ? <span className="text-neutral-500"> (so far)</span> : null}
          <span className="ml-2 text-neutral-500">(avg {data.avgPerDay.toFixed(1)}/day)</span>
        </div>
      </div>
      <svg width={width} height={height} role="img" aria-label={`Streak Year ${data.yearNumber} heatmap`}>
        {DOW_LABELS.map((lb, i) => (
          <text
            key={i}
            x={0}
            y={i * (cellSize + gap) + cellSize - 2}
            className="fill-neutral-500 font-tamzen-sm"
            fontSize={9}
          >
            {lb}
          </text>
        ))}
        {cells.map((c, i) => {
          const active = filter.kind === "day" && filter.code === c.date;
          const clickable = c.km > 0;
          return (
            <g
              key={i}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `Filter to ${formatDayLabel(c.date)}, ${c.km.toFixed(2)} kilometers` : undefined}
              aria-pressed={clickable ? active : undefined}
              className={clickable ? "cursor-pointer outline-none" : undefined}
              onClick={clickable ? () => onPickDay(c.date) : undefined}
              onKeyDown={
                clickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onPickDay(c.date);
                      }
                    }
                  : undefined
              }
            >
              <rect
                x={labelW + c.week * (cellSize + gap)}
                y={c.dow * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                fill={cellFill(c.km, max)}
                stroke={active ? "#d0c69d" : "transparent"}
                strokeWidth={active ? 1.2 : 0}
              >
                <title>{`${c.date} — ${c.km.toFixed(2)} km`}</title>
              </rect>
            </g>
          );
        })}
        {monthAxisPositions(data.cells[0]?.date ?? "2024-01-01").map(({ label, x }, i) => (
          <text
            key={label + i}
            x={x}
            y={rows * (cellSize + gap) + 12}
            className="fill-neutral-500 font-tamzen-sm"
            fontSize={9}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function formatDayLabel(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
