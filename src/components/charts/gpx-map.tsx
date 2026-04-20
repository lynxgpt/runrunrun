import type { GpxTrack } from "@/lib/gpx-processed";

interface GpxMapProps {
  track: GpxTrack;
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showStartEnd?: boolean;
}

// Simple equirectangular projection — fine for the ~10-mile extents of a run.
// Scales to fit the viewBox while preserving aspect ratio (keeps the trace
// geographically correct, so Brooklyn doesn't look stretched).
export function GpxMap({
  track,
  width = 400,
  height = 400,
  strokeWidth = 1.8,
  color = "#ededed",
  showStartEnd = true,
}: GpxMapProps) {
  const { points, stats } = track;
  const { minLat, maxLat, minLon, maxLon } = stats.bbox;
  const latMid = (minLat + maxLat) / 2;
  const latRange = maxLat - minLat;
  const lonRange = (maxLon - minLon) * Math.cos((latMid * Math.PI) / 180);
  const pad = 12;
  const scale = Math.min((width - pad * 2) / lonRange, (height - pad * 2) / latRange);
  const offsetX = (width - lonRange * scale) / 2;
  const offsetY = (height - latRange * scale) / 2;

  const project = (lat: number, lon: number) => {
    const x = offsetX + (lon - minLon) * Math.cos((latMid * Math.PI) / 180) * scale;
    const y = offsetY + (maxLat - lat) * scale; // invert Y
    return [x, y] as const;
  };

  const d =
    points
      .map((p, i) => {
        const [x, y] = project(p.lat, p.lon);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") ?? "";

  const [sx, sy] = project(points[0].lat, points[0].lon);
  const [ex, ey] = project(points[points.length - 1].lat, points[points.length - 1].lon);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label={`GPX trace for ${stats.name}`}
    >
      <rect width={width} height={height} fill="#0d0d0d" />
      {/* subtle grid */}
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={i}>
          <line
            x1={0}
            x2={width}
            y1={(height / 12) * i}
            y2={(height / 12) * i}
            stroke="#151515"
            strokeWidth={0.5}
          />
          <line
            x1={(width / 12) * i}
            x2={(width / 12) * i}
            y1={0}
            y2={height}
            stroke="#151515"
            strokeWidth={0.5}
          />
        </g>
      ))}
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showStartEnd ? (
        <>
          <circle cx={sx} cy={sy} r={3} fill={color} />
          <circle cx={ex} cy={ey} r={3} fill="#0d0d0d" stroke={color} strokeWidth={1.2} />
        </>
      ) : null}
    </svg>
  );
}
