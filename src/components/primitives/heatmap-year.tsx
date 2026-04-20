import type { StreakYearHeatmap } from "@/types/activity";
import { formatNumber } from "@/lib/format";

const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Streak years don't align with calendar years — generate the 12-month
// label row dynamically from the year's start date so the axis matches
// whatever month the streak began.
function monthLabelsFrom(startIso: string): string[] {
  const start = new Date(startIso + "T00:00:00Z");
  const base = start.getUTCMonth();
  return Array.from({ length: 12 }, (_, i) => MONTH_NAMES[(base + i) % 12]);
}

// Map km -> greyscale fill. Empty -> neutral-900.
function cellFill(km: number, max: number) {
  if (!km) return "#171717"; // neutral-900
  const t = Math.min(1, km / max);
  // Range 28..94 (matches captured neutral-800..neutral-600 spread)
  const v = Math.round(28 + t * 66);
  return `rgb(${v},${v},${v})`;
}

export function HeatmapYear({ data }: { data: StreakYearHeatmap }) {
  const cellSize = 13;
  const gap = 2;
  const labelW = 20;
  const weeks = 53;
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
        {cells.map((c, i) => (
          <rect
            key={i}
            x={labelW + c.week * (cellSize + gap)}
            y={c.dow * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            fill={cellFill(c.km, max)}
          >
            <title>{`${c.date} — ${c.km.toFixed(2)} km`}</title>
          </rect>
        ))}
        {monthLabelsFrom(data.cells[0]?.date ?? "2024-01-01").map((m, i) => {
          const x = labelW + (i * (weeks - 1) / 11) * (cellSize + gap) + cellSize;
          return (
            <text
              key={m + i}
              x={x}
              y={rows * (cellSize + gap) + 12}
              className="fill-neutral-500 font-tamzen-sm"
              fontSize={9}
            >
              {m}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
