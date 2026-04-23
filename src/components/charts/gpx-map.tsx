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
  const sketch = satelliteSketch(width, height, `${track.id}:${minLat}:${minLon}`);
  const textureId = `satelliteTexture-${safeId(track.id)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label={`GPX trace for ${stats.name}`}
    >
      <defs>
        <filter id={textureId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.035"
            numOctaves="4"
            seed={sketch.seed}
          />
          <feColorMatrix
            type="matrix"
            values="0.18 0 0 0 0.02  0 0.2 0 0 0.025  0 0 0.15 0 0.025  0 0 0 0.42 0"
          />
        </filter>
      </defs>
      <rect width={width} height={height} fill="#0d0d0d" />
      <g opacity="0.3">
        <rect width={width} height={height} fill="#24251f" filter={`url(#${textureId})`} />
        {sketch.fields.map((field, i) => (
          <path
            key={`field-${i}`}
            d={field.d}
            fill={field.fill}
            opacity={field.opacity}
          />
        ))}
        {sketch.water.map((water, i) => (
          <path
            key={`water-${i}`}
            d={water}
            fill="#101823"
            stroke="#34414a"
            strokeWidth="0.6"
            opacity="0.58"
          />
        ))}
        {sketch.roads.map((road, i) => (
          <path
            key={`road-${i}`}
            d={road.d}
            stroke={road.major ? "#c6bfa4" : "#8e8a79"}
            strokeWidth={road.major ? 1.25 : 0.55}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={road.major ? 0.56 : 0.34}
          />
        ))}
      </g>
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

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function satelliteSketch(width: number, height: number, seedKey: string) {
  const rand = seededRandom(hashString(seedKey));
  const fields = Array.from({ length: 7 }, () => {
    const cx = rand() * width;
    const cy = rand() * height;
    const rx = 45 + rand() * 85;
    const ry = 28 + rand() * 65;
    const points = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const wobble = 0.72 + rand() * 0.5;
      return [
        cx + Math.cos(a) * rx * wobble,
        cy + Math.sin(a) * ry * wobble,
      ] as const;
    });
    return {
      d: closedSketchPath(points),
      fill: rand() > 0.5 ? "#293027" : "#2b281f",
      opacity: 0.26 + rand() * 0.2,
    };
  });

  const water = Array.from({ length: 2 }, () => {
    const fromLeft = rand() > 0.5;
    const y = rand() * height;
    const drift = 42 + rand() * 80;
    const x0 = fromLeft ? -20 : width + 20;
    const x1 = fromLeft ? width + 20 : -20;
    return `M${x0.toFixed(1)},${y.toFixed(1)} C${(width * 0.3).toFixed(1)},${(y - drift).toFixed(1)} ${(width * 0.65).toFixed(1)},${(y + drift).toFixed(1)} ${x1.toFixed(1)},${(y + (rand() - 0.5) * 70).toFixed(1)} L${x1.toFixed(1)},${height + 20} L${x0.toFixed(1)},${height + 20} Z`;
  });

  const roads = Array.from({ length: 15 }, (_, i) => {
    const horizontal = rand() > 0.45;
    const major = i < 4;
    const offset = horizontal ? rand() * height : rand() * width;
    const bend = (rand() - 0.5) * 90;
    const d = horizontal
      ? `M-12,${offset.toFixed(1)} C${(width * 0.25).toFixed(1)},${(offset + bend).toFixed(1)} ${(width * 0.72).toFixed(1)},${(offset - bend * 0.7).toFixed(1)} ${width + 12},${(offset + (rand() - 0.5) * 40).toFixed(1)}`
      : `M${offset.toFixed(1)},-12 C${(offset + bend).toFixed(1)},${(height * 0.25).toFixed(1)} ${(offset - bend * 0.7).toFixed(1)},${(height * 0.72).toFixed(1)} ${(offset + (rand() - 0.5) * 40).toFixed(1)},${height + 12}`;
    return { d, major };
  });

  return { fields, roads, water, seed: (hashString(seedKey) % 997) + 1 };
}

function closedSketchPath(points: readonly (readonly [number, number])[]) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ") + " Z";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}
