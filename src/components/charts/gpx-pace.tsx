import type { GpxTrack } from "@/lib/gpx-processed";

interface GpxPaceProps {
  track: GpxTrack;
  width?: number;
  height?: number;
  showXAxis?: boolean;
}

// Compute a rolling-window smoothed pace (sec/km) over each point.
// Uses a window of ±W neighbouring points to smooth GPS noise.
function smoothedPaces(track: GpxTrack): { km: number; pace: number }[] {
  const { points } = track;
  const W = 8; // smoothing half-window
  const out: { km: number; pace: number }[] = [];

  for (let i = 1; i < points.length; i++) {
    const lo = Math.max(0, i - W);
    const hi = Math.min(points.length - 1, i + W);
    const a = points[lo];
    const b = points[hi];
    const dKm = b.km - a.km;
    const dT = b.t != null && a.t != null ? b.t - a.t : null;
    if (!dKm || !dT || dT <= 0) continue;
    const paceSec = dT / dKm;
    // Discard unreasonable values (< 2 min/km or > 20 min/km)
    if (paceSec < 120 || paceSec > 1200) continue;
    out.push({ km: points[i].km, pace: paceSec });
  }
  return out;
}

export function GpxPace({ track, width = 360, height = 80, showXAxis = false }: GpxPaceProps) {
  const paces = smoothedPaces(track);
  if (paces.length < 2) return null;

  const maxKm = track.stats.distanceKm || paces[paces.length - 1].km || 1;
  const allPaces = paces.map((p) => p.pace);
  const minP = Math.min(...allPaces);
  const maxP = Math.max(...allPaces);
  const paceRange = Math.max(30, maxP - minP); // at least 30s range

  const pad = showXAxis ? 14 : 4;
  const plotW = width;
  const plotH = height - pad;

  // Note: y-axis is inverted — faster (lower sec/km) is higher on the chart
  const toY = (p: number) => plotH - ((maxP - p) / paceRange) * (plotH * 0.85);

  const line = paces
    .map((p, i) => {
      const x = (p.km / maxKm) * plotW;
      const y = toY(p.pace);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${line} L${plotW},${plotH} L0,${plotH} Z`;

  const fmtPace = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <path d={area} fill="#1a1a1a" />
      <path d={line} stroke="#7dd3fc" strokeWidth={1} fill="none" />
      {/* fastest pace label (top of chart) */}
      <text x={2} y={toY(minP) - 3} className="fill-neutral-500 font-tamzen-sm" fontSize={8}>
        {fmtPace(minP)}
      </text>
      {showXAxis && (
        <>
          <text x={0} y={plotH + 12} className="fill-neutral-500 font-tamzen-sm" fontSize={9}>0km</text>
          <text x={plotW / 2} y={plotH + 12} textAnchor="middle" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
            {Math.round(maxKm / 2)}km
          </text>
          <text x={plotW} y={plotH + 12} textAnchor="end" className="fill-neutral-500 font-tamzen-sm" fontSize={9}>
            {maxKm.toFixed(1)}km
          </text>
        </>
      )}
    </svg>
  );
}
