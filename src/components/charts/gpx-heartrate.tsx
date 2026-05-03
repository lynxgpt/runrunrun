import type { GpxTrack } from "@/lib/gpx-processed";

interface GpxHeartRateProps {
  track: GpxTrack;
  width?: number;
  height?: number;
  showXAxis?: boolean;
}

export function GpxHeartRate({ track, width = 360, height = 80, showXAxis = true }: GpxHeartRateProps) {
  const { points, stats } = track;
  const usable = points.filter((p) => p.hr != null) as (typeof points[number] & { hr: number })[];
  if (usable.length < 2) return null;

  const maxKm = stats.distanceKm || usable[usable.length - 1].km || 1;
  const hrs = usable.map((p) => p.hr);
  const minHr = Math.min(...hrs);
  const maxHr = Math.max(...hrs);
  const hrRange = Math.max(10, maxHr - minHr);

  const pad = showXAxis ? 14 : 4;
  const plotW = width;
  const plotH = height - pad;

  const line = usable
    .map((p, i) => {
      const x = (p.km / maxKm) * plotW;
      const y = plotH - ((p.hr - minHr) / hrRange) * (plotH * 0.85);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${line} L${plotW},${plotH} L0,${plotH} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <path d={area} fill="var(--chart-area)" />
      <path d={line} stroke="#f87171" strokeWidth={1} fill="none" />
      {/* max HR label */}
      <text
        x={2}
        y={plotH - ((maxHr - minHr) / hrRange) * (plotH * 0.85) - 3}
        className="fill-neutral-500 font-tamzen-sm"
        fontSize={8}
      >
        {maxHr}bpm
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
