interface RadarChartProps {
  data: number[]; // length = labels.length
  labels: string[];
  width?: number;
  height?: number;
  ticks?: number[];
}

export function RadarChart({ data, labels, width = 300, height = 220, ticks }: RadarChartProps) {
  const cx = width / 2;
  const cy = height / 2 + 3;
  const rMax = Math.min(width, height) / 2 - 36;
  const max = Math.max(...data, ...(ticks ?? []), 1);
  const rings = ticks ?? [max * 0.25, max * 0.5, max * 0.75, max];
  const palette = ["#9fb0b6", "#b8b09b", "#c9bd93", "#8b7b58", "#171a24"];

  const points = data.map((v, i) => {
    const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
    const r = (v / max) * rMax;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
      value: v,
    };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  const clipId = "daily-distance-shard";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id="dailyDistanceGradient" x1="18%" y1="6%" x2="84%" y2="92%">
          <stop offset="0%" stopColor={palette[0]} stopOpacity="0.9" />
          <stop offset="48%" stopColor={palette[2]} stopOpacity="0.86" />
          <stop offset="100%" stopColor={palette[3]} stopOpacity="0.74" />
        </linearGradient>
        <linearGradient id="dailyDistanceEdge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="54%" stopColor="#d0c69d" />
          <stop offset="100%" stopColor={palette[4]} />
        </linearGradient>
        <filter id="dailyDistanceGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.62 0 0 0 0  0 0.58 0 0 0.02  0 0 0.48 0 0.05  0 0 0 0.52 0"
            result="soft"
          />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>

      <rect x={cx - rMax - 17} y={cy - rMax - 17} width={(rMax + 17) * 2} height={(rMax + 17) * 2} fill="#050505" opacity="0.28" />

      {rings.map((t, i) => {
        const r = (t / max) * rMax;
        const polyPts = Array.from({ length: data.length }, (_, j) => {
          const a = (j / data.length) * Math.PI * 2 - Math.PI / 2;
          return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
        }).join(" ");
        return (
          <polygon
            key={i}
            points={polyPts}
            fill="none"
            stroke={i === rings.length - 1 ? "#4a4a43" : "#2d2d2a"}
            strokeWidth={i === rings.length - 1 ? 0.95 : 0.65}
            opacity={0.58 + i * 0.08}
          />
        );
      })}

      {labels.map((lb, i) => {
        const a = (i / labels.length) * Math.PI * 2 - Math.PI / 2;
        const endX = cx + Math.cos(a) * (rMax + 5);
        const endY = cy + Math.sin(a) * (rMax + 5);
        return (
          <line
            key={`axis-${lb}`}
            x1={cx}
            y1={cy}
            x2={endX}
            y2={endY}
            stroke="#34342f"
            strokeWidth={0.65}
            opacity="0.72"
          />
        );
      })}

      <g clipPath={`url(#${clipId})`} opacity="0.28">
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={cx - rMax - 20 + i * 16}
            y1={cy + rMax + 18}
            x2={cx - rMax + 28 + i * 16}
            y2={cy - rMax - 18}
            stroke="#f0e7c7"
            strokeWidth="0.7"
          />
        ))}
      </g>

      <g filter="url(#dailyDistanceGlow)">
        <path d={path} fill="url(#dailyDistanceGradient)" opacity="0.78" />
        <path d={path} fill="none" stroke="url(#dailyDistanceEdge)" strokeWidth="1.35" />
      </g>

      {points.map((p, i) => (
        <g key={`point-${labels[i]}`}>
          <line
            x1={cx + Math.cos(p.angle) * (rMax + 2)}
            y1={cy + Math.sin(p.angle) * (rMax + 2)}
            x2={cx + Math.cos(p.angle) * (rMax + 11)}
            y2={cy + Math.sin(p.angle) * (rMax + 11)}
            stroke={palette[i % palette.length]}
            strokeWidth="1.2"
            opacity="0.78"
          />
          <rect
            x={p.x - 2.6}
            y={p.y - 2.6}
            width="5.2"
            height="5.2"
            fill="#050505"
            stroke={palette[i % palette.length]}
            strokeWidth="1"
            transform={`rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
          />
        </g>
      ))}

      {rings.slice(1).map((t, i) => (
        <text
          key={`r${i}`}
          x={cx + 5}
          y={cy - (t / max) * rMax - 3}
          className="fill-neutral-500 font-tamzen-sm"
          fontSize={9}
        >
          {t.toFixed(0)}
        </text>
      ))}

      {labels.map((lb, i) => {
        const a = (i / labels.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * (rMax + 23);
        const y = cy + Math.sin(a) * (rMax + 23);
        return (
          <text
            key={lb}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-neutral-400 font-tamzen-sm"
            fontSize={9}
          >
            {lb}
          </text>
        );
      })}
    </svg>
  );
}
