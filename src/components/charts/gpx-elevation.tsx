import type { GpxTrack } from "@/lib/gpx-processed";

interface GpxElevationProps {
  track: GpxTrack;
  width?: number;
  height?: number;
}

export function GpxElevation({ track, width = 360, height = 80 }: GpxElevationProps) {
  const { points, stats } = track;
  const usable = points.filter((p) => p.ele != null) as (typeof points[number] & { ele: number })[];
  if (usable.length < 2) return null;
  const maxKm = stats.distanceKm || usable[usable.length - 1].km || 1;
  const elevations = usable.map((p) => p.ele);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(1, maxEle - minEle);

  const plotW = width;
  const plotH = height - 4;

  const line = usable
    .map((p, i) => {
      const x = (p.km / maxKm) * plotW;
      const y = plotH - ((p.ele - minEle) / eleRange) * (plotH * 0.85);
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
      <path d={line} stroke="var(--chart-line)" strokeWidth={1} fill="none" />
      <text
        x={2}
        y={plotH - ((maxEle - minEle) / eleRange) * (plotH * 0.85) - 3}
        className="fill-neutral-500 font-tamzen-sm"
        fontSize={8}
      >
        {Math.round(maxEle)}m
      </text>
    </svg>
  );
}
