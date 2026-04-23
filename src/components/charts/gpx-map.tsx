import type { GpxTrack } from "@/lib/gpx-processed";

interface GpxMapProps {
  track: GpxTrack;
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showStartEnd?: boolean;
}

// Web Mercator projection so the GPX trace aligns with real map tiles.
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
  const pad = 12;
  const zoom = tileZoomForBounds(minLat, maxLat, minLon, maxLon, width, height, pad);
  const minX = lonToTileX(minLon, zoom);
  const maxX = lonToTileX(maxLon, zoom);
  const minY = latToTileY(maxLat, zoom);
  const maxY = latToTileY(minLat, zoom);
  const worldW = Math.max(maxX - minX, 0.0001);
  const worldH = Math.max(maxY - minY, 0.0001);
  const scale = Math.min((width - pad * 2) / worldW, (height - pad * 2) / worldH);
  const offsetX = (width - worldW * scale) / 2;
  const offsetY = (height - worldH * scale) / 2;

  const project = (lat: number, lon: number) => {
    const x = offsetX + (lonToTileX(lon, zoom) - minX) * scale;
    const y = offsetY + (latToTileY(lat, zoom) - minY) * scale;
    return [x, y] as const;
  };

  const d =
    points
      .map((p, i) => {
        const [x, y] = project(p.lat, p.lon);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") ?? "";
  const routeSegments = repeatedRouteSegments(points.map((p) => project(p.lat, p.lon)));

  const [sx, sy] = project(points[0].lat, points[0].lon);
  const [ex, ey] = project(points[points.length - 1].lat, points[points.length - 1].lon);
  const tiles = mapTilesForBounds(zoom, minX, maxX, minY, maxY, offsetX, offsetY, scale);
  const maskId = `mapFade-${safeId(track.id)}`;
  const leftFadeId = `${maskId}-left`;
  const rightFadeId = `${maskId}-right`;
  const topFadeId = `${maskId}-top`;
  const bottomFadeId = `${maskId}-bottom`;
  const fade = Math.min(width, height) * 0.05;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label={`GPX trace for ${stats.name}`}
    >
      <defs>
        <linearGradient id={leftFadeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient id={rightFadeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <linearGradient id={topFadeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <linearGradient id={bottomFadeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id={maskId}>
          <rect width={width} height={height} fill="white" />
          <rect x="0" y="0" width={fade} height={height} fill={`url(#${leftFadeId})`} />
          <rect x={width - fade} y="0" width={fade} height={height} fill={`url(#${rightFadeId})`} />
          <rect x="0" y="0" width={width} height={fade} fill={`url(#${topFadeId})`} />
          <rect x="0" y={height - fade} width={width} height={fade} fill={`url(#${bottomFadeId})`} />
        </mask>
      </defs>
      <rect width={width} height={height} fill="#0d0d0d" />
      <g
        opacity="0.3"
        mask={`url(#${maskId})`}
        style={{ filter: "saturate(1.35) contrast(1.08) brightness(0.68)" }}
      >
        {tiles.map((tile) => (
          <image
            key={`${tile.z}/${tile.x}/${tile.y}`}
            href={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tile.z}/${tile.y}/${tile.x}`}
            x={tile.screenX}
            y={tile.screenY}
            width={tile.size}
            height={tile.size}
            preserveAspectRatio="none"
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
        stroke="#0d0d0d"
        strokeWidth={strokeWidth + 1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
      />
      {routeSegments.map((segment, i) => (
        <path
          key={i}
          d={`M${segment.x1.toFixed(1)},${segment.y1.toFixed(1)} L${segment.x2.toFixed(1)},${segment.y2.toFixed(1)}`}
          stroke={repeatColor(segment.repeatCount, color)}
          strokeWidth={strokeWidth + Math.min(segment.repeatCount - 1, 2) * 0.28}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
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

function repeatedRouteSegments(projectedPoints: readonly (readonly [number, number])[]) {
  const segments = projectedPoints.slice(1).map(([x2, y2], index) => {
    const [x1, y1] = projectedPoints[index];
    return {
      x1,
      y1,
      x2,
      y2,
      mx: (x1 + x2) / 2,
      my: (y1 + y2) / 2,
      angle: Math.atan2(y2 - y1, x2 - x1),
    };
  });

  return segments.map((segment, index) => {
    const nearby = segments.reduce((count, other, otherIndex) => {
      if (Math.abs(otherIndex - index) <= 4) return count;
      const distance = Math.hypot(segment.mx - other.mx, segment.my - other.my);
      if (distance > 3.2) return count;
      const angleDelta = Math.abs(Math.atan2(
        Math.sin(segment.angle - other.angle),
        Math.cos(segment.angle - other.angle),
      ));
      const aligned = Math.min(angleDelta, Math.PI - angleDelta) < 0.75;
      return aligned ? count + 1 : count;
    }, 0);
    return { ...segment, repeatCount: Math.min(3, nearby + 1) };
  });
}

function repeatColor(repeatCount: number, baseColor: string) {
  if (repeatCount >= 3) return "#d0c69d";
  if (repeatCount === 2) return "#c2bfae";
  return baseColor;
}

function tileZoomForBounds(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  width: number,
  height: number,
  pad: number,
) {
  for (let z = 18; z >= 3; z--) {
    const worldW = Math.max(lonToTileX(maxLon, z) - lonToTileX(minLon, z), 0.0001);
    const worldH = Math.max(latToTileY(minLat, z) - latToTileY(maxLat, z), 0.0001);
    if (worldW * 256 <= width - pad * 2 && worldH * 256 <= height - pad * 2) return z;
  }
  return 3;
}

function mapTilesForBounds(
  z: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const tileCount = 2 ** z;
  const startX = Math.max(0, Math.floor(minX) - 1);
  const endX = Math.min(tileCount - 1, Math.ceil(maxX) + 1);
  const startY = Math.max(0, Math.floor(minY) - 1);
  const endY = Math.min(tileCount - 1, Math.ceil(maxY) + 1);
  const tiles: {
    z: number;
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    size: number;
  }[] = [];

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      tiles.push({
        z,
        x,
        y,
        screenX: offsetX + (x - minX) * scale,
        screenY: offsetY + (y - minY) * scale,
        size: scale,
      });
    }
  }
  return tiles;
}

function lonToTileX(lon: number, z: number) {
  return ((lon + 180) / 360) * 2 ** z;
}

function latToTileY(lat: number, z: number) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) /
    2
  ) * 2 ** z;
}
